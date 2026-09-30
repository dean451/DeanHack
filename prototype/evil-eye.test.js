import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {hasSleeves} from './sleeves.js';

const E=101;// 'e'
function parts(actor){const meshes=[];actor.g.traverse(o=>{if(o.isMesh)meshes.push(o);});return meshes;}

test('the evil eye is a lidded, bloodshot, slit-pupilled eye in 3 shared draws instead of the magenta floating eye',()=>{
 const eye=parts(createCreature({name:'floating eye',symbol:E,color:4}));
 const actor=createCreature({name:'evil eye',symbol:E,color:13}),meshes=parts(actor);
 assert.equal(actor.quirk,'hover');assert(actor.body);assert(!hasSleeves(actor));
 assert.deepEqual(meshes.map(m=>m.userData.part).sort(),['eyeball','flesh','iris']);
 assert(meshes.length<eye.length,'fewer draws than the floating eye');
 for(const m of meshes)for(const key of ['position','normal','color']){
  const arr=m.geometry.attributes[key].array;for(const v of arr)assert(Number.isFinite(v),`${m.userData.part} ${key}`);
  if(key==='color')for(const v of arr)assert(v>=0&&v<=1);}
 // the eyeball and iris turn together inside the socket, about the eyeball's centre
 const byPart=Object.fromEntries(meshes.map(m=>[m.userData.part,m]));
 assert.equal(byPart.eyeball.parent,actor.head);assert.equal(byPart.iris.parent,actor.head);assert.notEqual(byPart.flesh.parent,actor.head);
 assert.equal(actor.head.position.length(),0);
 assert(byPart.iris.material.emissiveIntensity>0);
 actor.g.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(actor.g);
 assert(b.min.y>.1&&b.max.y<1,`height ${b.min.y}..${b.max.y}`);
 assert(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)<.3,'too wide');
 // from the front: the pupil at the centre, iris above and below it, lids beyond
 const rc=new THREE.Raycaster(),y0=actor.head.getWorldPosition(new THREE.Vector3()).y;
 const hit=(x,y)=>{rc.set(new THREE.Vector3(x,y0+y,2),new THREE.Vector3(0,0,-1));return rc.intersectObject(actor.g,true)[0]?.object.userData.part;};
 assert.equal(hit(0,0),'eyeball');assert.equal(hit(0,.05),'iris');assert.equal(hit(0,-.05),'iris');
 assert.equal(hit(0,.12),'flesh');assert.equal(hit(0,-.1),'flesh');assert.equal(hit(.17,0),'flesh');
 // the socket's back faces outward
 const p=byPart.flesh.geometry.attributes.position,n=byPart.flesh.geometry.attributes.normal;
 for(let i=0;i<p.count;i++){const r=Math.hypot(p.getX(i),p.getY(i),p.getZ(i));
  if(r>.18&&r<.215&&p.getZ(i)<0&&p.getY(i)>-.1)assert(p.getX(i)*n.getX(i)+p.getY(i)*n.getY(i)+p.getZ(i)*n.getZ(i)>0,'socket normal faces in');}
 // shared between instances
 assert.equal(parts(createCreature({name:'evil eye'}))[0].geometry,meshes[0].geometry);
});
