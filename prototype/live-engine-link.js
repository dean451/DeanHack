// Live's line to the engine: the event stream (with polling as the fallback and the link watch for drops and
// restarts), the handler every engine message goes through, replies sent back, and frames held while an action
// plays out. Moved out of live.js unchanged; it reads the game's state and helpers from L (installLive's shared names).
import {createLinkWatch} from './link-watch.js';
import {aimKeys} from './aim-cursor.js';
import {markTurn} from './message-log.js';
import {reviveAction} from './rise.js';
import {fxTimeline,delayTimeline,fxHoldMs} from './fx.js';
import {ZAP_WINDUP_MS} from './zap-flash.js';
import {queueThrows,enqueueAction,holdBackMs} from './actions.js';
import {reflectorAt,solidAt} from './rays.js';
import {endedNote} from './start-screen.js';
import {meleeDirection} from './combat-visuals.js';

export function connect(L,{replay=false}={}){const {deathRecap,inputPace,S,hideLinkBanner,showLinkBanner,recorder,onActivity,applySoon,travelState,travelMark,messageLog,prompt,reply,message,renderStatus,combatEvent,pickupNotes,wandWishFlare,djinniWish,teleportBlink,rises,zapFlash,hero,findThrower,rays,rayMarks,explosions,flights,splash,breath,deathBeat,dialog,setMode,setPrompt}=L;
   S.meleeIntent=null;S.source?.close?.();S.link?.stop();hideLinkBanner();
   let usingPolling=false,pollTimer=null,stopped=false,since=0,opened=false;
   S.link=createLinkWatch({onLost:()=>showLinkBanner('Connection lost.','Reconnect'),onBack:hideLinkBanner,onRestart:()=>{showLinkBanner('The server restarted. Your game was saved.','Continue');S.source?.close?.();}});
   // the session token is already known by now (fetched for /engine/start): a different one later means a restart
   if(S.token)S.link.token(S.token);
   const handle=v=>{recorder.record('in',v);onActivity?.();if(v.type==='frame')applySoon(v);else if(v.type==='request'){S.meleeIntent=null;S.pending=v;/* the end-of-game questions and windows are answered and kept for the recap under the tombstone (death-recap.js) */{const auto=deathRecap.answer(v,S.menu,S.lines);if(auto!==null){S.menu=null;S.lines=[];void reply(auto);return;}}if(v.kind==='command')S.startScreen?.landed?.(); // the opening text is read and the game waits on the player: the descent's spiral can go
    if(v.kind==='position'&&S.travelTo&&v.cursor){S.aimQueue=aimKeys(v.cursor,S.travelTo);S.travelTo=null;}else if(v.kind!=='position')S.travelTo=null;{const t=travelState.request(v.kind,S.latest?.player);if(t&&S.origin)travelMark.show(t.x-S.origin.x,t.z-S.origin.z);else travelMark.hide();}if(v.kind==='command')S.turnMark=markTurn(messageLog);prompt();if(v.kind==='position'&&S.aimQueue.length){void reply(S.aimQueue.shift());}else if(v.kind!=='position')S.aimQueue=[];/* a typed-ahead command answers the next command prompt; any other question empties the buffer (input-pace.js) */if(v.kind==='command'&&inputPace.size)void reply(inputPace.shift());else if(v.kind!=='command')inputPace.clear();}else if(v.type==='message'){if(S.active)message(v.text);}else if(v.type==='status')renderStatus(v.text);else if(v.type==='menu')S.menu=v;else if(v.type==='commands')S.commands=v.items;else if(v.type==='text')S.lines=v.lines;else if(v.type==='combat'||v.type==='death'){if(S.active)combatEvent(v);}else if(v.type==='pickup'){if(S.active)pickupNotes.note(v.x,v.z,performance.now());}else if(v.type==='wish'){if(S.active&&S.latest?.player){wandWishFlare.wish(v,S.latest.player.x-S.origin.x,S.latest.player.z-S.origin.z);djinniWish.wish(v,S.latest.player.x-S.origin.x,S.latest.player.z-S.origin.z);}}else if(v.type==='teleport'){S.heroTeleportAt=performance.now();if(S.active&&v.from&&v.to)teleportBlink.hop({x:v.from.x-S.origin.x,z:v.from.z-S.origin.z},{x:v.to.x-S.origin.x,z:v.to.z-S.origin.z},!!v.trap);}else if(v.type==='revive'){if(S.active)rises.add(reviveAction(v),performance.now());}else if(v.type==='fx'){const fx=globalThis.deanhackFx??=[];const tl=fxTimeline(v);fx.push(tl);if(S.active){const heroZap=zapFlash.play(tl,S.latest?.player,hero,S.latest,{windup:ZAP_WINDUP_MS});const shown=heroZap?delayTimeline(tl,ZAP_WINDUP_MS):delayTimeline(tl,queueThrows(tl,findThrower));rays.play(shown,{reflectorAt:(x,z)=>reflectorAt(S.latest,x,z),solidAt:(x,z)=>solidAt(S.latest,x,z)});rayMarks.add(shown);explosions.add(shown);flights.play(shown);splash.fromFx(shown,S.latest);breath.fromFx(shown,S.latest,{always:heroZap==='breath'});S.fxHoldUntil=Math.max(S.fxHoldUntil,performance.now()+fxHoldMs(shown));}if(fx.length>8)fx.shift();}else if(v.type==='tombstone'){S.lastDeath=v;if(S.active&&deathBeat.begin(performance.now()))enqueueAction(hero.actions,{kind:'die',dir:hero.actions.lastBlow??null,style:'topple'});}else if(v.type==='ended'){S.pending=null;travelState.clear();travelMark.hide();inputPace.clear();if(S.active){dialog.close();message(v.text);const death=S.lastDeath;S.lastDeath=null;const note=endedNote(v.reason,death?.killer);S.link?.stop();hideLinkBanner();const wait=death?deathBeat.remainingMs(performance.now()):0;const show=()=>{setMode(false);void S.startScreen.open({note,death,recap:deathRecap.take()});};if(wait>0)setTimeout(show,wait);else show();}}};
   /* a replay (replay-player.js) feeds the handler itself: no stream, no polling */if(replay){S.currentHandle=handle;return;}
   async function pollLoop(){
     if(stopped)return;
     try{const r=await fetch(`/engine/poll?since=${since}`);const {events,seq}=await r.json();if(seq<since){S.link.restart();return;}since=seq;S.link.ok();for(const event of events)handle(event);}
     catch{S.link.lost();if(S.active)setPrompt('Connection interrupted; reconnecting…');}
     if(!stopped)pollTimer=setTimeout(pollLoop,150);
   }
   const es=new EventSource('/engine/events');
   const fallback=setTimeout(()=>{if(usingPolling)return;usingPolling=true;es.close();S.pollNow=()=>{clearTimeout(pollTimer);pollLoop();};pollLoop();},2500);
   es.onmessage=e=>{if(usingPolling)return;clearTimeout(fallback);S.link.ok();handle(JSON.parse(e.data));};
   es.onerror=()=>{if(usingPolling)return;S.link.lost();if(S.active)setPrompt('Connection interrupted; reconnecting…');};
   // a reopened stream after a drop: the token tells a resumed server from a restarted one
   es.onopen=async()=>{if(!opened){opened=true;return;}try{const {token:t}=await (await fetch('/engine/token')).json();if(!S.link.token(t))S.link.ok();}catch{}};
   S.currentHandle=handle;
   S.source={close:()=>{stopped=true;S.pollNow=null;clearTimeout(fallback);clearTimeout(pollTimer);es.close();S.link?.stop();}};
 }
export async function reply(value,L){const {S,recorder,dialog,setPrompt,post,message}=L;if(!S.pending||S.replaying)return;const req=S.pending;recorder.record('out',{id:req.id,kind:req.kind,value});if(req.kind==='command')S.lastCommand=value;S.meleeIntent=req.kind==='command'?meleeDirection(value):null;S.pending=null;S.lines=[];S.menu=null;dialog.close();setPrompt('Engine is resolving your action…');try{await post('/engine/input',{id:req.id,value});S.pollNow?.();}catch(e){S.meleeIntent=null;message(e.message);setPrompt('Input was not accepted. Reconnect Live mode to refresh the prompt.');}}
export async function post(path,body={},L){const {S}=L;if(!S.token){S.token=(await fetch('/engine/token').then(r=>r.json())).token;S.link?.token(S.token);}const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Engine-Token':S.token},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error);return data;}
export function applySoon(frame,L){const {inputPace,S,hero,actors,apply}=L;S.heldFrame=frame;if(S.heldTimer)return;const wait=S.active?Math.max(holdBackMs([hero.actions,...[...actors.values()].map(a=>a.actions)]),Math.ceil(S.fxHoldUntil-performance.now())):0;/* a player typing ahead does not wait for an animation to end (input-pace.js) */const cap=inputPace.holdCap(performance.now()),held=Math.min(wait,cap);const go=()=>{S.heldTimer=null;const f=S.heldFrame;S.heldFrame=null;if(f)apply(f);};if(held>0)S.heldTimer=setTimeout(go,held);else go();}
