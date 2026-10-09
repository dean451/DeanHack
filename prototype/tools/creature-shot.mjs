// Usage: OUT=/dir/ node tools/creature-shot.mjs "chromatic dragon" prefix [letter color]
// Needs the dev server on 5174 and PLAYWRIGHT_MODULE (in the cloud: /opt/node-tools/node_modules/playwright-core/index.js).
const pw=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');const chromium=pw.chromium||pw.default.chromium;
const [name,prefix='creature',letter,color]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await (await b.newContext({viewport:{width:900,height:700}})).newPage();
p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
for(const view of ['three','side','head','game']){
 await p.goto(`http://127.0.0.1:5174/tools/creature-shot.html?name=${encodeURIComponent(name)}&view=${view}${letter?`&letter=${letter}`:''}${color?`&color=${color}`:''}`);
 await p.waitForFunction(()=>window.__done,null,{timeout:30000});await p.waitForTimeout(300);
 await p.screenshot({path:`${process.env.OUT||'/tmp/'}${prefix}-${view}.png`});
}
await b.close();
