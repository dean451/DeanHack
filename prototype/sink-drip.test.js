import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSink} from './sink.js';
import {createSinkDrip, dripPoints, dripState, DRIP_SWELL, DRIP_GRAVITY, DRIP_RING_RADIUS} from './sink-drip.js';

test('the drip is read off the sink model: the tip under the spout, the pool below it',()=>{
 const sink=createSink(),water=sink.children.find(o=>o.userData.part==='water');
 const {tip,pool}=dripPoints(water.geometry);
 for(const v of [tip.x,tip.y,tip.z,pool])assert(Number.isFinite(v));
 assert(Math.abs(pool-.445)<.002,`pool at ${pool}`);
 assert(tip.y>.65&&tip.y<.72,`tip at ${tip.y}`);
 assert(Math.abs(tip.x)<.005,`tip x ${tip.x}`);
 // Over the basin (an oval centred at z -.02, radii .145*1.3 by .145), with room for the rings.
 assert(((tip.x/(.145*1.3))**2+((tip.z+.02)/.145)**2)<.5,`tip over the pool edge at ${tip.x},${tip.z}`);
 assert(Math.abs(tip.z+.02)+DRIP_RING_RADIUS<.145);
});

test('a drip cycle swells, falls, lands on the pool and fades back to nothing',()=>{
 const height=.25,period=3,fallTime=Math.sqrt(2*height/DRIP_GRAVITY);
 let maxFall=0,sawRing=false,prevFall=0;
 for(let t=0;t<period;t+=1/240){
  const s=dripState(t,period,0,height);
  for(const v of [s.fall,s.size,s.stretch,...s.rings.flatMap(r=>[r.r,r.a])])assert(Number.isFinite(v),`not finite at ${t}`);
  assert(s.fall>=0&&s.fall<=height+1e-9,`fall ${s.fall} at ${t}`);
  assert(s.size>=0&&s.size<=1&&s.stretch>=1&&s.stretch<=1.71);
  for(const r of s.rings){assert(r.a>=0&&r.a<=.55);assert(r.r>=0&&r.r<=.006+DRIP_RING_RADIUS+1e-9);if(r.a>0)sawRing=true;}
  if(s.drop){assert(s.fall>=prevFall-1e-9,'the drop never climbs');prevFall=s.fall;}else prevFall=0;
  if(t>DRIP_SWELL&&t<DRIP_SWELL+fallTime)assert(s.drop);
  maxFall=Math.max(maxFall,s.fall);
 }
 assert(maxFall>height*.9,`only fell ${maxFall}`);
 assert(sawRing);
 // Just before the next drop starts, nothing is showing but a new drop's first swell.
 const end=dripState(period-.001,period,0,height);
 assert(!end.drop&&end.rings.every(r=>r.a===0));
 // Periodic.
 const x=dripState(.7,period,0,height),y=dripState(.7+period*3,period,0,height);
 for(const k of ['fall','size','stretch'])assert(Math.abs(x[k]-y[k])<1e-9);
});

test('the drip rig attaches to sinks in the scene, animates, and comes off cleanly',()=>{
 const scene=new THREE.Scene();
 const a=createSink(),b=createSink();a.position.set(2,0,1);b.position.set(-3,0,4);b.rotation.y=Math.PI/2;
 scene.add(a,b);scene.add(new THREE.Group());
 const built=a.children.length;
 const drip=createSinkDrip(scene);
 drip.update(0);
 assert.equal(drip.count,2);
 assert.equal(a.children.length,built+1);
 let dropsSeen=0,ringsSeen=0;const p=new THREE.Vector3();
 for(let t=0;t<8;t+=1/60){
  drip.update(t);
  for(const s of [a,b]){
   const rig=s.children.find(o=>o.name==='sink-drip');
   const [drop,...rings]=rig.children;
   if(drop.visible){dropsSeen++;for(const v of [...drop.position.toArray(),...drop.scale.toArray()])assert(Number.isFinite(v));
    assert(drop.position.y>.44&&drop.position.y<.72,`drop y ${drop.position.y}`);}
   for(const r of rings)if(r.visible){ringsSeen++;assert(r.material.opacity>0&&r.material.opacity<=.55);
    r.getWorldPosition(p);assert(Math.abs(p.y-.446)<.003);}
  }
 }
 assert(dropsSeen>100&&ringsSeen>20,`drops ${dropsSeen}, rings ${ringsSeen}`);
 // A sink that leaves the scene loses its rig.
 scene.remove(b);drip.update(9);
 assert.equal(drip.count,1);
 assert(!b.children.some(o=>o.name==='sink-drip'));
 drip.restore();
 assert(a.children.find(o=>o.name==='sink-drip').children.every(o=>!o.visible));
 drip.dispose();
 assert.equal(a.children.length,built);
 assert.equal(drip.count,0);
});
