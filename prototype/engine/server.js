import {spawn} from 'node:child_process';
import {readFileSync,realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,sep} from 'node:path';
import {randomBytes} from 'node:crypto';

export function encodeReply(request, body) {
  if(!request || body.id!==request.id) throw new Error('Stale input; wait for the next engine prompt.');
  if(request.kind==='line') {
    if(typeof body.value!=='string'||body.value.length>200||/[\r\n\0]/.test(body.value))throw new Error('Invalid line');
    return body.value+'\n';
  }
  if(request.kind==='menu') {
    if(typeof body.value!=='string'||!/^(!|\d+(,\d+)*|)$/.test(body.value)||body.value.length>200)throw new Error('Invalid selection');
    return body.value+'\n';
  }
  if(!Number.isInteger(body.value)||body.value<1||body.value>255)throw new Error('Invalid key');
  return body.value+'\n';
}
export const DEFAULT_PLAYER_NAME = 'Wanderer';
// The character's name, typed by the player. It goes to the engine as `-u` and in NETHACKOPTIONS
// (comma separated), and it names the save file, so keep it short and plain: letters, digits,
// spaces, underscores and apostrophes, starting with a letter or digit so it can never read as a
// command-line option. No hyphens: NetHack reads "name-role-race-gender-alignment" suffixes, so
// "Mary-Jane" would become the name "Mary" with a bad role. Anything else, or nothing, is the default.
export function cleanPlayerName(raw) {
  if (typeof raw !== 'string') return DEFAULT_PLAYER_NAME;
  const name = raw.replace(/[^A-Za-z0-9 _']/g, '').replace(/\s+/g, ' ').trim().slice(0, 24).trim();
  return /^[A-Za-z0-9]/.test(name) ? name : DEFAULT_PLAYER_NAME;
}
// The engine's command line and options for a character of this name.
export function engineLaunch(rawName, manifest) {
  const name = cleanPlayerName(rawName);
  return {
    name,
    args: ['-d', manifest.cwd, '-u', name, '-p', 'Valkyrie', '-r', 'human'],
    options: `windowtype:bridge,name:${name},role:Valkyrie,race:human,gender:female,align:lawful,pettype:cat,!news,autodig,autopickup,pickup_types:/!?="`,
  };
}
export default function enginePlugin(){
 const root=fileURLToPath(new URL('../.engine/',import.meta.url));
 const token=randomBytes(24).toString('hex');
 let playerName=DEFAULT_PLAYER_NAME,child=null,pending=null,frame=null,menu=null,text=null,ended=null,commands=null,buffer='',seq=0;const clients=new Set();const history=[];const log=[];
 // A monotonic, capped event log backs GET /engine/poll: some hosting paths (a proxy or
 // tunnel that buffers/holds back streaming responses) never deliver anything over the
 // SSE endpoint below, so the client can fall back to polling this instead.
 function send(event){if(event.type==='frame')frame=event;else if(event.type==='request')pending=event;else if(event.type==='menu')menu=event;else if(event.type==='commands')commands=event;else if(event.type==='text')text=event;else if(event.type==='ended')ended=event;else if(event.type==='message'||event.type==='status'){history.push(event);if(history.length>40)history.shift();}log.push({seq:++seq,event});if(log.length>500)log.shift();for(const res of clients)res.write(`data: ${JSON.stringify(event)}\n\n`);}
 function start(rawName){
   if(child)return;
   const manifest=JSON.parse(readFileSync(resolve(root,'manifest.json'),'utf8'));
   for(const p of [manifest.binary,manifest.cwd,manifest.home,manifest.prefix])if(!realpathSync(p).startsWith(realpathSync(root)+sep))throw new Error('Engine path is outside isolated runtime');
   pending=frame=menu=text=ended=commands=null;history.length=0;buffer='';
   const launch=engineLaunch(rawName,manifest);playerName=launch.name;child=spawn(manifest.binary,launch.args,{cwd:manifest.cwd,env:{PATH:process.env.PATH,HOME:manifest.home,USER:process.env.USER,LOGNAME:process.env.LOGNAME,TERM:'dumb',NETHACKOPTIONS:launch.options},stdio:['pipe','pipe','pipe']});
   child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{buffer+=chunk;if(buffer.length>2000000){send({type:'message',text:'Engine output exceeded protocol limit.'});child.stdin.end();buffer='';return;}let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);if(!line.trim())continue;try{const data=JSON.parse(line);if(['frame','request','menu','commands','text','message','status','ended','fx','combat','death','revive','pickup','teleport','wish'].includes(data.type))send(data);}catch{send({type:'message',text:line.slice(0,500)});}}});
   child.stderr.on('data',b=>send({type:'message',text:String(b).slice(0,1000)}));
   child.on('error',e=>send({type:'message',text:e.message}));
   child.on('close',code=>{child=null;pending=null;send({type:'ended',text:`Engine session closed (${code}). Start again to resume any saved character.`});});
 }
 return {name:'deanhack-engine',configureServer(server){
   server.httpServer?.on('close',()=>{child?.stdin.end();for(const c of clients)c.end();});
   server.middlewares.use(async(req,res,next)=>{
     const path=req.url?.split('?')[0];if(!path?.startsWith('/engine/'))return next();
     const host=req.headers.host;
     // Vite may be opened as either localhost or 127.0.0.1 (both the local machine),
     // or through a Cloudflare quick tunnel (random *.trycloudflare.com host, HTTPS,
     // no port) for sharing a running instance with someone off-machine. Reject
     // anything else; same-origin still required either way.
     const allowedHost=/^(?:127\.0\.0\.1|localhost):\d+$/.test(host||'')||/^[a-z0-9-]+\.trycloudflare\.com$/i.test(host||'');
     const originHost=req.headers.origin?req.headers.origin.replace(/^https?:\/\//,''):null;
     if(!host||!allowedHost||(originHost&&originHost!==host)){res.writeHead(403);res.end('Local or tunnel same-origin requests only');return;}
     const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
     if(req.method==='GET'&&path==='/engine/token')return json(200,{token});
     if(req.method==='GET'&&path==='/engine/events'){
       // Disable Nagle's algorithm: SSE is many small writes, and a proxy hop (e.g. a
       // Cloudflare tunnel) can otherwise coalesce/delay them long enough to look hung.
       req.socket?.setNoDelay(true);
       res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});clients.add(res);
       // A proxy hop (Cloudflare's edge, for a tunnel) can hold back the first chunk of a
       // streaming response until enough bytes accumulate. Padding past that threshold
       // forces an immediate flush instead of leaving the client waiting on nothing.
       res.write(': connected\n\n');
       for(const event of [...history,frame,commands,menu,text,ended,pending].filter(Boolean))res.write(`data: ${JSON.stringify(event)}\n\n`);
       const timer=setInterval(()=>res.write(': alive\n\n'),15000);req.on('close',()=>{clearInterval(timer);clients.delete(res);});return;
     }
     if(req.method==='GET'&&path==='/engine/poll'){
       const since=Number(new URL(req.url,'http://engine').searchParams.get('since'))||0;
       return json(200,{events:log.filter(e=>e.seq>since).map(e=>e.event),seq});
     }
     if(req.method!=='POST'||req.headers['x-engine-token']!==token)return json(403,{error:'Invalid local session token'});
     try{
       let body='';for await(const b of req){body+=b;if(body.length>4096)throw new Error('Request too large');}
       if(path==='/engine/start'){let name;try{name=body?JSON.parse(body).name:undefined;}catch{name=undefined;}start(name);return json(200,{ok:true,name:playerName});}
       if(path==='/engine/input'){
         if(!child)throw new Error('Start the engine first');
         const reply=encodeReply(pending,JSON.parse(body));pending=null;menu=null;text=null;child.stdin.write(reply);return json(200,{ok:true});
       }
       return json(404,{error:'Unknown action'});
     }catch(e){return json(400,{error:e.message});}
   });
 }};
}
