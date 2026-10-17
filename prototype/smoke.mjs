// Browser smoke test on the built app: no engine needed. Usage: npm run build, then
//   PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright-core/index.js node smoke.mjs
// It serves dist with `vite preview` on 5175, checks the splash (dragon, wave field), opens ?demo&debug, checks the canvas
// is mounted and drawing, presses a move key and checks the hero moved. SMOKE_BREAK=canvas removes the canvas first (must fail).
import {spawn} from 'node:child_process';
import {smokeFailures} from './smoke-checks.js';
const pw=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');const chromium=pw.chromium||pw.default.chromium;
const PORT=5175,base=`http://127.0.0.1:${PORT}/`;
const server=spawn('npx',['vite','preview','--host','127.0.0.1','--port',String(PORT),'--strictPort'],{stdio:'ignore'});
const stop=()=>server.kill();process.on('exit',stop);
for(let i=0;;i++){try{if((await fetch(base)).ok)break;}catch{}if(i>60){console.log('smoke: vite preview did not start (run npm run build first)');process.exit(1);}await new Promise(r=>setTimeout(r,500));}
const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const errors=[];
const page=await (await b.newContext({viewport:{width:1100,height:800}})).newPage();
page.on('pageerror',e=>errors.push(e.message));
await page.goto(base);await page.waitForTimeout(2500);
const splash=await page.evaluate(()=>({dragon:!!document.querySelector('.start-dragon')?.textContent.trim(),waves:!!document.querySelector('.start-waves')}));
await page.goto(`${base}?demo&debug`);await page.waitForFunction(()=>window.__dh?.renderer,null,{timeout:20000}).catch(()=>{});
await page.waitForTimeout(1500);
if(process.env.SMOKE_BREAK==='canvas')await page.evaluate(()=>document.querySelector('#scene canvas')?.remove());
const frame=()=>page.evaluate(()=>window.__dh?.renderer?.info.render.frame??0);
const f0=await frame();await page.waitForTimeout(1000);const frames=(await frame())-f0;
const canvas=await page.evaluate(()=>!!document.querySelector('#scene canvas'));
const at=()=>page.evaluate(()=>{const p=window.__dh?.player?.g.position;return p?[p.x,p.z]:null;});
const p0=await at();await page.keyboard.press('l');await page.waitForTimeout(1200);const p1=await at();
const moved=!!p0&&!!p1&&(p0[0]!==p1[0]||p0[1]!==p1[1]);
await b.close();stop();
const failures=smokeFailures({splash,demo:{canvas,frames,moved},errors});
console.log(JSON.stringify({splash,demo:{canvas,frames,moved}}));
if(failures.length){console.log('smoke FAILED:\n '+failures.join('\n '));process.exit(1);}
console.log('smoke ok');process.exit(0);
