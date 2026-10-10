import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSink} from './sink.js';
import {createSinkDrip, dripPoints, dripState, DRIP_SWELL, DRIP_GRAVITY, DRIP_RING_RADIUS,DRIP_TREMBLE,DRIP_THROB} from './sink-drip.js';

test('the drip is read off the sink model: the tip under the spout, the pool below it',()=>{
 const sink=createSink(),water=sink.children.find(o=>o.userData.part==='water');
 const {tip,pool}=dripPoints(water.geometry);
 for(const v of [tip.x,tip.y,tip.z,pool])assert(Number.isFinite(v));
 assert(Math.abs(pool-.012)<.002,`pool at ${pool}`);
 assert(tip.y>.4&&tip.y<.55,`tip at ${tip.y}`);
 assert(Math.abs(tip.x)<.005,`tip x ${tip.x}`);
 // Over the puddle in the grate (a disc of radius .15 centred at z -.06), with room for the rings.
 assert(Math.hypot(tip.x,tip.z+.06)+DRIP_RING_RADIUS<.15,`tip over the pool edge at ${tip.x},${tip.z}`);
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
    assert(drop.position.y>.01&&drop.position.y<.55,`drop y ${drop.position.y}`);}
   for(const r of rings)if(r.visible){ringsSeen++;assert(r.material.opacity>0&&r.material.opacity<=.55);
    r.getWorldPosition(p);assert(Math.abs(p.y-.012)<.003);}
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

test('the drop shivers just before it lets go, and is steady otherwise',()=>{
 const height=.25,period=3;
 let early=0,late=0;
 for(let t=0;t<period;t+=1/240){
  const s=dripState(t,period,0,height);
  assert(Math.abs(s.sx)<=DRIP_TREMBLE+1e-12&&Math.abs(s.sz)<=DRIP_TREMBLE+1e-12);
  if(t<DRIP_SWELL*.6)early=Math.max(early,Math.abs(s.sx),Math.abs(s.sz));
  else if(t<DRIP_SWELL)late=Math.max(late,Math.abs(s.sx),Math.abs(s.sz));
  else assert.equal(s.sx+s.sz,0,'steady once falling');
 }
 assert.equal(early,0);
 assert(late>DRIP_TREMBLE*.5,`only shivered ${late}`);
});

test('the swelling drop throbs, only ever shrinking, and is whole again when it lets go',()=>{
 const period=3,sizes=[];
 for(let t=.05;t<DRIP_SWELL-.05;t+=1/120){
  const s=dripState(t,period,0,.25),k=t/DRIP_SWELL,base=.25+.75*k*k*(3-2*k);
  assert(s.size<=base+1e-9&&s.size>=base*(1-DRIP_THROB)-1e-9,`throb out of bounds at ${t}`);
  sizes.push(s.size/base);
 }
 assert(Math.min(...sizes)<.95,'it visibly throbs');
 assert(Math.abs(dripState(DRIP_SWELL-1e-4,period,0,.25).size-1)<.01,'no pop at release');
});
