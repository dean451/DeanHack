// Renders close-ups of the hero (face, upper body, hands, game camera) from the dev server's ?debug hook.
// Usage: npm run dev -- --port 5174 &  then  OUT=/some/dir/ node tools/hero-shot.mjs <prefix>
// Then look at the PNGs: judge the face and hands at the game camera, not only up close.
const pw=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');const chromium=pw.chromium||pw.default.chromium; // in the cloud: PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright-core/index.js
const out=process.argv[2]||'hero';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await (await b.newContext({viewport:{width:900,height:900}})).newPage();
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://127.0.0.1:5174/?debug');await p.waitForTimeout(4000);
const views={
 face:{d:[.0,1.30,1.05],t:[0,1.2,0]},      // close-up of face
 upper:{d:[.9,1.5,2.0],t:[0,1.0,0]},       // upper body 3/4
 hands:{d:[-.9,1.0,1.4],t:[.0,.8,.15]},      // hands and shield arm
 game:{d:[0,4.2,3.6],t:[0,.8,0]},          // gameplay-ish camera, top-down
 full:{d:[1.6,1.5,3.0],t:[0,.7,0]},
};
views.sword={socket:'weaponSocket',d:[.3,.12,.42]};views.shieldh={socket:'shieldArm',d:[-.2,-.2,.5]};
if(process.env.HELM)await p.evaluate(()=>window.__dh.player.setHelmet({name:'helmet'}));
for(const [k,v] of Object.entries(views)){
 await p.evaluate(({v})=>{const {camera,controls,player}=window.__dh;const V=player.g.position.constructor;const q=(v.socket?player[v.socket]:player.g).getWorldPosition(new V());if(v.socket){controls.minDistance=.05;controls.target.copy(q);camera.position.set(q.x+v.d[0],q.y+v.d[1],q.z+v.d[2]);camera.updateProjectionMatrix();controls.update();return;}
  controls.minDistance=.1;controls.minPolarAngle=0;
  camera.position.set(q.x+v.d[0],q.y+v.d[1],q.z+v.d[2]);controls.target.set(q.x+v.t[0],q.y+v.t[1],q.z+v.t[2]);camera.fov=v.fov||36;camera.updateProjectionMatrix();controls.update();},{v});
 await p.waitForTimeout(900);
 await p.screenshot({path:`${process.env.OUT||'/tmp/'}${out}-${k}.png`});
}
await b.close();
