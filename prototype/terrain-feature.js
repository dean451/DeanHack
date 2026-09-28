import * as THREE from 'three';
import {createDrawbridge} from './drawbridge.js';
import {createBog} from './bog.js';
import {createIceWall} from './ice-wall.js';
import {createIceFloor} from './ice-floor.js';

// Non-trap `feature` cells (ice, bog, drawbridges, ice walls, clouds, open air). The bridge
// sends them as generic features, so the kind comes from the map symbol and its
// colour (drawing.c defsyms). Anything unknown returns null and keeps its label.
export function featureKind(symbol,color){
 if(symbol===46)return {6:'ice',3:'bridge-down'}[color]||null;   // '.'
 if(symbol===125&&color===2)return 'bog';                         // '}'
 if(symbol===35)return {3:'bridge-up',7:'cloud'}[color]||null;    // '#'
 if(symbol===56)return color===15?'crystal-wall':'ice-wall';      // '8'
 if(symbol===32&&color===6)return 'air';                          // ' '
 return null;
}

// Drawbridges are built with the moat running along x; live.js turns them by
// the neighbouring water.
export const AXIS_FEATURES=new Set(['bridge-down','bridge-up']);

export function createTerrainFeature(kind,seed=0){
 const g=new THREE.Group();g.name=`Feature (${kind})`;
 const geometries=[],materials=[];
 const mat=(o,Type=THREE.MeshStandardMaterial)=>{const m=new Type(o);materials.push(m);return m;};
 const add=(geo,m,x=0,y=0,z=0,parent=g)=>{geometries.push(geo);const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 const flat=(geo,m,y,x=0,z=0)=>{const o=add(geo,m,x,y,z);o.rotation.x=-Math.PI/2;o.castShadow=false;return o;};
 const rand=(i)=>{const s=Math.sin(seed*12.9898+i*78.233)*43758.5453;return s-Math.floor(s);};

 if(kind==='ice'){
  // Floor ice is a merged, weathered model of its own (ice-floor.js).
  const sheet=createIceFloor(seed);g.add(sheet);
  g.userData.dispose=()=>sheet.userData.dispose();
  return g;
 }else if(kind==='bog'){
  // The bog is a merged, weathered model of its own (bog.js).
  const bog=createBog(seed);g.add(bog);
  g.userData.dispose=()=>bog.userData.dispose();
  return g;
 }else if(kind==='bridge-down'||kind==='bridge-up'){
  // Drawbridges are merged, weathered models of their own (drawbridge.js).
  const bridge=createDrawbridge(kind==='bridge-up',seed);g.add(bridge);
  g.userData.dispose=()=>bridge.userData.dispose();
  return g;
 }else if(kind==='ice-wall'||kind==='crystal-wall'){
  // Ice and crystal walls are merged, weathered models of their own (ice-wall.js).
  const wall=createIceWall(kind==='crystal-wall',seed);g.add(wall);
  g.userData.dispose=()=>wall.userData.dispose();
  return g;
 }else if(kind==='cloud'){
  // A drifting puff of grey vapour; it neither casts nor blocks shadows.
  const vapour=mat({color:0xb9bec4,roughness:1,transparent:true,opacity:.55,depthWrite:false});
  for(let i=0;i<9;i++){const r=.14+rand(i)*.12;
   const puff=add(new THREE.SphereGeometry(r,12,8),vapour,(rand(i+10)-.5)*.46,.45+rand(i+20)*.35,(rand(i+30)-.5)*.46);puff.castShadow=puff.receiveShadow=false;}
 }else if(kind==='air'){
  // Open air (the Plane of Air): no floor, just sky far below with drifting wisps
  // and pale wind streaks. The sky is unlit and one flat colour so neighbouring
  // air tiles join into a single sheet; live.js hides the stone slab.
  g.userData.hidesFloor=true;
  const sky=flat(new THREE.PlaneGeometry(1.001,1.001),mat({color:0x6f9fd0},THREE.MeshBasicMaterial),-.42);sky.receiveShadow=false;
  const haze=mat({color:0xdbe9f7,transparent:true,opacity:.5,depthWrite:false},THREE.MeshBasicMaterial);
  for(let i=0;i<3;i++){const p=flat(new THREE.CircleGeometry(.09+rand(i)*.1,14),haze,-.41+i*.002,(rand(i+3)-.5)*.6,(rand(i+6)-.5)*.6);p.scale.y=.45+rand(i+9)*.3;p.receiveShadow=false;}
  const wisp=mat({color:0xf4f8fc,roughness:1,transparent:true,opacity:.4,depthWrite:false});
  for(let i=0;i<4;i++){const r=.05+rand(i+20)*.06;
   const puff=add(new THREE.SphereGeometry(r,10,6),wisp,(rand(i+24)-.5)*.6,-.3+rand(i+28)*.12,(rand(i+32)-.5)*.6);puff.scale.set(1.8,.55,1.2);puff.castShadow=puff.receiveShadow=false;}
  const wind=mat({color:0xffffff,transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide},THREE.MeshBasicMaterial);
  const heading=rand(40)*Math.PI*2;
  for(let i=0;i<3;i++){const r=.16+rand(i+41)*.14,arc=.9+rand(i+44)*.9;
   const streak=add(new THREE.TorusGeometry(r,.004,3,24,arc),wind,(rand(i+47)-.5)*.3,.12+rand(i+50)*.35,(rand(i+53)-.5)*.3);
   streak.rotation.set(Math.PI/2+(rand(i+56)-.5)*.3,0,heading+i*.4);streak.castShadow=streak.receiveShadow=false;}
 }
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}
