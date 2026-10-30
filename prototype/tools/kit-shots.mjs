// Renders the hero in each class kit and lays them out as a contact sheet.
// Usage: npm run dev -- --port 5174 &  then  OUT=/dir/ node tools/kit-shots.mjs [Role ...] [--gender=male|female] [--view=full|game|head]
// Writes <OUT>kits-<view>.png (the sheet) and prints where it is; then look at it.
const pw=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');const chromium=pw.chromium||pw.default.chromium;
const {readFileSync}=await import('node:fs');
const out=process.env.OUT||'/tmp/';
const args=process.argv.slice(2),flag=n=>args.find(a=>a.startsWith(`--${n}=`))?.split('=')[1];
const gender=flag('gender')||'female',view=flag('view')||'full';
const VIEWS={full:{d:[1.5,1.3,3.0],t:[0,.82,0],fov:36},game:{d:[0,4.2,3.6],t:[0,.8,0],fov:36},head:{d:[.45,1.45,1.05],t:[0,1.2,0],fov:36},back:{d:[-1.5,1.4,-2.9],t:[0,.62,0],fov:36}};
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await (await b.newContext({viewport:{width:700,height:700}})).newPage();
p.on('pageerror',e=>console.log('ERR',e.message));
const {liftSplashAddHero}=await import('../smoke-checks.js');
await p.goto('http://127.0.0.1:5174/?debug');await p.waitForFunction(()=>window.__dh?.renderer);await p.evaluate(liftSplashAddHero);await p.waitForTimeout(1500);
await p.addStyleTag({content:'header,aside,footer,.log,.legend,.character,.companion{display:none!important}'});
const {KIT_ROLES}=await p.evaluate(async()=>{const m=await import('/hero-kits.js');return {KIT_ROLES:m.KIT_ROLES};});
const roles=args.filter(a=>!a.startsWith('--')).length?args.filter(a=>!a.startsWith('--')):KIT_ROLES;
const shots=[];
for(const role of roles){
  await p.evaluate(async({role,gender,v})=>{const m=await import('/hero-kits.js');const {camera,controls,hero:player}=window.__dh;m.dressHero(player,{role,gender});player.setShield?.(null);const w=m.KIT_WEAPONS?.[role];player.setWeapon?.(w?{name:w,class:2}:null);
    controls.minDistance=.1;controls.minPolarAngle=0;const q=player.g.position;
    camera.position.set(q.x+v.d[0],q.y+v.d[1],q.z+v.d[2]);controls.target.set(q.x+v.t[0],q.y+v.t[1],q.z+v.t[2]);camera.fov=v.fov;camera.updateProjectionMatrix();controls.update();},{role,gender,v:VIEWS[view]});
  await p.waitForTimeout(700);
  shots.push({role,png:'data:image/png;base64,'+(await p.screenshot()).toString('base64')});
}
const cols=Math.min(4,roles.length),w=Math.floor(1400/cols);
const q=await (await b.newContext({viewport:{width:cols*w,height:Math.ceil(roles.length/cols)*(w+26)}})).newPage();
await q.setContent(`<body style="margin:0;background:#06090b;display:grid;grid-template-columns:repeat(${cols},${w}px);font:600 15px sans-serif;color:#d8cfbb">${shots.map(s=>`<figure style="margin:0"><img src="${s.png}" width="${w}" height="${w}" style="display:block"><figcaption style="padding:4px 10px">${s.role} (${gender})</figcaption></figure>`).join('')}`);
await q.waitForFunction(()=>[...document.images].every(i=>i.complete));
await q.screenshot({path:`${out}kits-${view}.png`});
console.log(`${out}kits-${view}.png`);
await b.close();
