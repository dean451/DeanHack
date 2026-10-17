// What the browser smoke test (smoke.mjs) requires of a page report; pure, so a unit test can say what fails it.
export function smokeFailures({splash,demo,errors=[]}={}){
 const f=[];
 if(!splash)f.push('splash: no report');
 else{
  if(!splash.dragon)f.push('splash: the dragon is empty or missing');
  if(!splash.waves)f.push('splash: the wave field is missing');
 }
 if(!demo)f.push('demo: no report');
 else{
  if(!demo.canvas)f.push('demo: no canvas is mounted');
  if(!(demo.frames>=2))f.push(`demo: the renderer drew ${demo.frames||0} frames`);
  if(!demo.moved)f.push('demo: a move key did not move the hero');
 }
 for(const e of errors)f.push(`page error: ${e}`);
 return f;
}
