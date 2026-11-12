import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {centaurBarrel,createCreature} from './creatures.js';

// Review 2026-11-12: the centaur's horse half was a glossy chest ball and rump ball. These pin the faceted, ribbed, worn
// barrel: one flat-shaded, vertex-coloured mesh (the hull, topline, ribs, hip points, a girth gall and a scar baked together).
const COAT='#a8804a',Y=.56;
const build=()=>{const body=new THREE.Group();return centaurBarrel(body,COAT,Y,1);};
const hex=(c,i)=>new THREE.Color(c.getX(i),c.getY(i),c.getZ(i)).getHexString();
const tone=k=>new THREE.Color(COAT).multiplyScalar(k).getHexString();

test('the barrel is one flat-shaded mesh, no smooth ball',()=>{
 const b=build();
 assert(b.material.flatShading,'faceted');
 assert(b.geometry.attributes.color,'its tones are baked per vertex');
 // the old barrel was five 16x12 spheres (over a thousand vertices); the faceted one is far coarser
 assert(b.geometry.attributes.position.count<900,`${b.geometry.attributes.position.count} vertices`);
});

test('the topline rises at the withers, sinks through the back and lifts again at the croup',()=>{
 const p=build().geometry.attributes.position;
 const topAt=(z0,z1)=>{let t=-Infinity;for(let i=0;i<p.count;i++){const z=p.getZ(i);if(z>=z0&&z<=z1)t=Math.max(t,p.getY(i));}return t;};
 const withers=topAt(.15,.25),back=topAt(-.08,.04),croup=topAt(-.3,-.2);
 assert(withers>back+.02,`withers ${withers} over back ${back}`);
 assert(croup>back,`croup ${croup} over back ${back}`);
});

test('the barrel shows at least three tones, with ribs on both flanks and the flanks not mirror images',()=>{
 const g=build().geometry,c=g.attributes.color,p=g.attributes.position,tones=new Set();
 for(let i=0;i<c.count;i++)tones.add(hex(c,i));
 assert(tones.size>=3,`${tones.size} tones`);
 const rib=tone(.72);let near=0,far=0;
 for(let i=0;i<c.count;i++)if(hex(c,i)===rib){if(p.getX(i)>.05)near++;else if(p.getX(i)<-.05)far++;}
 assert(near>0&&far>0,'ribs on both flanks');assert(near!==far,'more ribs on one flank than the other');
 let l=0,r=0;for(let i=0;i<p.count;i++){const x=p.getX(i);if(x>0)r+=x;else l-=x;}
 assert(Math.abs(l-r)>1e-3,'asymmetric flanks');
});

test('every centaur stands on the faceted barrel',()=>{
 for(const name of ['plains centaur','forest centaur','mountain centaur']){
  const a=createCreature({name,symbol:67,color:3});
  const barrel=a.body.getObjectByName('barrel');assert(barrel&&barrel.parent===a.body,`${name}: the barrel`);
  assert(barrel.material.flatShading&&barrel.geometry.attributes.color,`${name}: faceted and baked`);
 }
});
