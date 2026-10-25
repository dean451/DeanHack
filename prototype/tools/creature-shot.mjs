// Usage: OUT=/dir/ node tools/creature-shot.mjs "chromatic dragon" prefix [letter color]
// BEND=tail2.y:.6,lfore1.x:.8 turns named joints (actor.joints) before the shot; POSE=sleep lays a dragon down asleep, POSE=crow throws a cockerel into its crow, POSE=mantle holds its mantle, POSE=fold / flapup / flapdown its baked wings; IDLE=20 lets it stand idle 20 s in the game's own update;  SETTLE=12 runs an insect's own settling that many seconds, ALARM=1 then holds the hero near that many seconds; WALK=2 walks it 2 s.
// Needs the dev server on 5174 and PLAYWRIGHT_MODULE (in the cloud: /opt/node-tools/node_modules/playwright-core/index.js).
const pw=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');const chromium=pw.chromium||pw.default.chromium;
const [name,prefix='creature',letter,color]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await (await b.newContext({viewport:{width:900,height:700}})).newPage();
p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
for(const view of ['three','side','head','game']){
 await p.goto(`http://127.0.0.1:5174/tools/creature-shot.html?name=${encodeURIComponent(name)}&view=${view}${letter?`&letter=${letter}`:''}${color?`&color=${color}`:''}${process.env.BEND?`&bend=${encodeURIComponent(process.env.BEND)}`:''}${process.env.POSE?`&pose=${process.env.POSE}`:''}${process.env.IDLE?`&idle=${process.env.IDLE}`:''}${process.env.SETTLE?`&settle=${process.env.SETTLE}`:""}${process.env.ALARM?`&alarm=${process.env.ALARM}`:""}${process.env.WALK?`&walk=${process.env.WALK}`:''}`);
 await p.waitForFunction(()=>window.__done,null,{timeout:30000});await p.waitForTimeout(300);
 await p.screenshot({path:`${process.env.OUT||'/tmp/'}${prefix}-${view}.png`});
}
await b.close();
