// Usage: OUT=/dir/ node tools/item-shot.mjs prefix '<json array of items>'   (dev server on 5174, PLAYWRIGHT_MODULE set)
const pw=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');const chromium=pw.chromium||pw.default.chromium;
const [prefix,json]=process.argv.slice(2),items=JSON.parse(json);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const W=Math.min(1600,Math.max(500,items.length*190)),p=await (await b.newContext({viewport:{width:W,height:420}})).newPage();
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto(`http://127.0.0.1:5174/tools/item-shot.html?items=${encodeURIComponent(json)}`);
await p.waitForFunction(()=>window.__done,null,{timeout:30000});await p.waitForTimeout(300);
await p.screenshot({path:`${process.env.OUT||'/tmp/'}${prefix}.png`});await b.close();
