// Renders the whole bestiary to contact sheets: OUT=/dir/ node tools/creature-sheet.mjs [perPage] [cols]
// Needs the dev server on 5174 and PLAYWRIGHT_MODULE (in the cloud: /opt/node-tools/node_modules/playwright-core/index.js).
// Writes sheet-000.png, sheet-048.png, ... (the number is the first creature's index in tools/creature-names.json)
// and prints any creature whose model threw.
import {readFileSync} from 'node:fs';
const pw=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');const chromium=pw.chromium||pw.default.chromium;
const [perPageArg='48',colsArg='8']=process.argv.slice(2),perPage=+perPageArg,cols=+colsArg,cell=220;
const names=JSON.parse(readFileSync(new URL('./creature-names.json',import.meta.url),'utf8'));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const rows=Math.ceil(perPage/cols),p=await (await b.newContext({viewport:{width:cols*cell,height:rows*cell}})).newPage();
p.on('pageerror',e=>console.log('ERR',e.message));
for(let from=0;from<names.length;from+=perPage){
 await p.goto(`http://127.0.0.1:5174/tools/creature-sheet.html?from=${from}&count=${perPage}&cols=${cols}&cell=${cell}`);
 await p.waitForFunction(()=>window.__done,null,{timeout:240000});
 const failed=await p.evaluate(()=>window.__failed);for(const f of failed)console.log('FAILED',f);
 const file=`${process.env.OUT||'/tmp/'}sheet-${String(from).padStart(3,'0')}.png`;await p.screenshot({path:file});console.log(file);
}
await b.close();
