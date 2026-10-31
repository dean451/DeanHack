// What the browser smoke test (smoke.mjs) requires of a page report; pure, so a unit test can say what fails it.
export function smokeFailures({splash,scene,errors=[]}={}){
 const f=[];
 if(!splash)f.push('splash: no report');
 else{
  if(!splash.dragon)f.push('splash: the dragon is empty or missing');
  if(!splash.waves)f.push('splash: the wave field is missing');
 }
 if(!scene)f.push('scene: no report');
 else{
  if(!scene.canvas)f.push('scene: no canvas is mounted');
  if(!(scene.frames>=2))f.push(`scene: the renderer drew ${scene.frames||0} frames`);
  if(!scene.hero)f.push('scene: the game hero did not build');
 }
 for(const e of errors)f.push(`page error: ${e}`);
 return f;
}

// Runs in the page (?debug): the splash stops all drawing, so lift it, then build the game's hero into the bare
// scene (there is no engine here; tools/kit-shots.mjs dresses it as window.__dh.hero). True when the hero has meshes.
export function liftSplashAddHero(){
 document.body.classList.remove('start-open');document.getElementById('start-screen')?.remove();document.getElementById('start-cover')?.remove();
 const {heroFactory,scene,camera,controls}=window.__dh,hero=heroFactory();scene.add(hero.g);window.__dh.hero=hero;
 camera.position.set(2.2,2,3.4);controls.target.set(0,.8,0);controls.update();
 let meshes=0;hero.g.traverse(o=>{if(o.isMesh)meshes++;});return meshes>20;
}
