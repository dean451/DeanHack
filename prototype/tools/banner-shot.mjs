// Usage: OUT=/dir/ node tools/banner-shot.mjs   (writes banner.png; copy it to public/og.png)
// Needs the dev server on 5174 and PLAYWRIGHT_MODULE (in the cloud: /opt/node-tools/node_modules/playwright-core/index.js).
const pw=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');const chromium=pw.chromium||pw.default.chromium;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await (await b.newContext({viewport:{width:1200,height:630},deviceScaleFactor:+(process.env.SCALE||1)})).newPage();
p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
await p.goto('http://127.0.0.1:5174/tools/banner.html?ratio='+(process.env.SCALE||1));
await p.waitForFunction(()=>window.__done,null,{timeout:30000});await p.waitForTimeout(400);
await p.screenshot({path:`${process.env.OUT||'/tmp/'}banner.png`});
// Supersample: at SCALE=2 the render is shrunk back to 1200x630 for clean edges (no image library needed).
if((+process.env.SCALE||1)>1){
 const {readFileSync}=await import('node:fs');const src='data:image/png;base64,'+readFileSync(`${process.env.OUT||'/tmp/'}banner.png`).toString('base64');
 const q=await (await b.newContext({viewport:{width:1200,height:630}})).newPage();
 await q.setContent(`<body style="margin:0"><img id=i src="${src}" width=1200 height=630 style="display:block">`);
 await q.waitForFunction(()=>document.getElementById('i').complete);
 await q.screenshot({path:`${process.env.OUT||'/tmp/'}banner.png`});
}
await b.close();
