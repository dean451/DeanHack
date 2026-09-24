import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Staircases for the `up` and `down` terrain. Up is a solid flight climbing toward +z
// under a small stone arch; down is a curbed stairwell whose steps darken as they sink
// into a black shaft. The seed (usually the map cell) varies stone tint and wear.
// Everything stays inside its tile.
export function createStairs(direction='up',seed=0){
 const up=direction!=='down';
 const g=new THREE.Group();g.name=up?'Stairs up':'Stairs down';
 let s=(Math.floor(seed)*2654435761)>>>0||1;const random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
 const geometries=[],materials=[];
 const tint=.9+random()*.2;
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color:new THREE.Color(color).multiplyScalar(tint),roughness:.9,...extra});materials.push(m);return m;};
 const add=(geo,m,x,y,z)=>{geometries.push(geo);const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
 const block=(w,h,d,m,x,y,z,r=.018)=>add(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/2,h/2,d/2)),m,x,y,z);
 const stone=mat(0x707a75),dark=mat(0x4c5553),worn=mat(0x8e948b,{roughness:.75}),iron=mat(0x293337,{metalness:.72,roughness:.4});

 if(up){
  // Five solid steps, each built from the floor so nothing floats.
  const steps=5,rise=.095,run=.15;
  for(let i=0;i<steps;i++){
   const top=(i+1)*rise,z=-.3+i*run;
   block(.62,top,run+.004,i%2?stone:dark,0,top/2,z);
   // Polished centre where feet have worn the tread.
   const tread=block(.34+random()*.06,.008,run*.62,worn,(random()-.5)*.03,top+.002,z-.01,.003);
   tread.receiveShadow=true;tread.castShadow=false;
  }
  // Stepped side walls with capstones.
  for(const x of [-.37,.37]){
   for(let i=0;i<steps;i++){const top=(i+1)*rise+.07,z=-.3+i*run;block(.1,top,run+.004,dark,x,top/2,z);}
   block(.13,.035,run*steps+.02,stone,x,steps*rise+.09,-.3+run*2);
  }
  // Arch at the head of the flight frames the way out of the level.
  const archZ=.38;
  for(const x of [-.37,.37])block(.12,.74,.12,dark,x,.37,archZ);
  block(.86,.1,.16,stone,0,.78,archZ);
  const key=block(.12,.12,.18,worn,0,.8,archZ);key.rotation.z=Math.PI/4;
  // Faint daylight spilling down from above.
  const glowMat=new THREE.MeshBasicMaterial({color:0xffe3a8,transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide});materials.push(glowMat);
  const glow=add(new THREE.PlaneGeometry(.62,.36),glowMat,0,.54,archZ+.005);glow.castShadow=glow.receiveShadow=false;
  // Iron ring bolted to the arch pillar.
  const ring=add(new THREE.TorusGeometry(.04,.009,6,14),iron,.37,.5,archZ-.065);ring.castShadow=false;
 }else{
  // A raised curb around the opening; the shaft itself is a black plate at floor level.
  const hx=.28,hz=.34,curb=.11,wall=.1;
  for(const x of [-(hx+wall/2),hx+wall/2])block(wall,curb,hz*2+wall*2,stone,x,curb/2,0);
  block(hx*2,curb,wall,stone,0,curb/2,-(hz+wall/2));
  block(hx*2,curb*.55,wall,worn,0,curb*.275,hz+wall/2);
  const voidMat=new THREE.MeshBasicMaterial({color:0x020303});materials.push(voidMat);
  const hole=add(new THREE.PlaneGeometry(hx*2,hz*2),voidMat,0,.004,0);hole.rotation.x=-Math.PI/2;hole.castShadow=false;
  // Inner shaft faces, fading to black toward the floor.
  const shaftMat=mat(0x1b1f1e,{roughness:1});
  for(const x of [-hx,hx]){const side=add(new THREE.PlaneGeometry(hz*2,curb),shaftMat,x*.995,curb/2,0);side.rotation.y=x<0?Math.PI/2:-Math.PI/2;side.castShadow=false;}
  // Steps start at the open (low-curb) end and descend toward -z, each darker than the last.
  const steps=5,run=hz*2/steps;
  for(let i=0;i<steps;i++){
   const top=.05-i*.01,z=hz-run*(i+.5),shade=1-i/steps;
   const m=mat(new THREE.Color(0x707a75).multiplyScalar(.25+.75*shade));
   block(hx*2-.01,top,run+.002,m,0,top/2,z,.01);
   if(i<2){const tread=block(.26,.006,run*.55,worn,0,top+.002,z,.002);tread.castShadow=false;}
  }
  // Two iron posts with a sagging chain guard the far edge.
  const postZ=-(hz+wall/2);
  for(const x of [-(hx+wall/2),hx+wall/2]){block(.045,.3,.045,iron,x,curb+.15,postZ,.01);add(new THREE.SphereGeometry(.035,10,8),iron,x,curb+.31,postZ);}
  const sag=new THREE.CatmullRomCurve3([new THREE.Vector3(-(hx+wall/2),curb+.27,postZ),new THREE.Vector3(0,curb+.17,postZ),new THREE.Vector3(hx+wall/2,curb+.27,postZ)]);
  const chain=add(new THREE.TubeGeometry(sag,24,.009,6,false),iron,0,0,0);chain.castShadow=false;
 }
 g.userData.dispose=()=>{geometries.forEach(o=>o.dispose());materials.forEach(o=>o.dispose());};
 return g;
}
