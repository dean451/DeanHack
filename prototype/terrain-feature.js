import * as THREE from 'three';
import {createDrawbridge} from './drawbridge.js';
import {createBog} from './bog.js';
import {createIceWall} from './ice-wall.js';
import {createIceFloor} from './ice-floor.js';
import {createCloud} from './cloud.js';
import {createAir} from './air.js';
import {createMagicPlatform} from './magic-platform.js';
import {createPoisonCloud} from './poison-cloud.js';

// Non-trap `feature` cells (ice, bog, drawbridges, ice walls, clouds, open air, magic
// platforms, poison gas). The bridge
// sends them as generic features, so the kind comes from the map symbol and its
// colour (drawing.c defsyms). Anything unknown returns null and keeps its label.
export function featureKind(symbol,color){
 if(symbol===46)return {6:'ice',3:'bridge-down',7:'magic-platform'}[color]||null;   // '.'
 if(symbol===125&&color===2)return 'bog';                         // '}'
 if(symbol===35)return {3:'bridge-up',7:'cloud',10:'poison-cloud'}[color]||null;   // '#'
 if(symbol===56)return color===15?'crystal-wall':'ice-wall';      // '8'
 if(symbol===32&&color===6)return 'air';                          // ' '
 return null;
}

// A poison cloud takes the cell's own glyph, so the bridge adds `under` (floor, water or
// lava) to say what it floats over. The ground a cell is drawn on is that, not its terrain.
export function groundOf(cell){return cell.under||cell.terrain;}

// Drawbridges are built with the moat running along x, the gatehouse toward -z and the
// moat toward +z; live.js turns them with bridgeYaw.
export const AXIS_FEATURES=new Set(['bridge-down','bridge-up']);

// The yaw that faces a drawbridge model the right way, from `terrainAt(dx,dz)` (the live
// terrain of a neighbouring cell), or null when the neighbours don't settle it.
// A raised bridge is drawn on the gatehouse wall itself (DBWALL), with the moat on one side
// only, so its moat face (+z) turns toward that water; failing that, it lines up with the wall.
// A lowered bridge lies on the moat square: the water runs along it, and its hinge end (-z)
// turns toward the gatehouse, the side flanked by wall.
export function bridgeYaw(kind,terrainAt){
 const wet=(dx,dz)=>['water','lava'].includes(terrainAt(dx,dz));
 const wall=(dx,dz)=>['wall','door','bars'].includes(terrainAt(dx,dz))?1:0;
 const SIDES=[[1,0],[-1,0],[0,1],[0,-1]];
 if(kind==='bridge-up'){
  const water=SIDES.filter(([dx,dz])=>wet(dx,dz)&&!wet(-dx,-dz));
  if(water.length===1){const [dx,dz]=water[0];return Math.atan2(dx,dz);}
  const alongX=wall(-1,0)+wall(1,0),alongZ=wall(0,-1)+wall(0,1);
  return alongX===alongZ?null:alongX>alongZ?0:Math.PI/2;
 }
 if(kind==='bridge-down'){
  const alongX=Number(wet(-1,0))+Number(wet(1,0)),alongZ=Number(wet(0,-1))+Number(wet(0,1));
  if(alongX===alongZ)return null;
  // the two ends of the span, across the moat: the gatehouse end has wall either side of it
  const flank=alongX>alongZ?s=>wall(-1,s)+wall(1,s)+wall(0,s):s=>wall(s,-1)+wall(s,1)+wall(s,0);
  const s=flank(1)>flank(-1)?1:-1;
  return alongX>alongZ?Math.atan2(0,-s):Math.atan2(-s,0);
 }
 return null;
}

export function createTerrainFeature(kind,seed=0){
 const g=new THREE.Group();g.name=`Feature (${kind})`;

 if(kind==='ice'){
  // Floor ice is a merged, weathered model of its own (ice-floor.js); it replaces the floor.
  const sheet=createIceFloor(seed);g.add(sheet);
  g.userData.hidesFloor=true;
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
  // Clouds are a merged cumulus bank of their own (cloud.js); it replaces the floor.
  const cloud=createCloud(seed);g.add(cloud);
  g.userData.hidesFloor=true;
  g.userData.dispose=()=>cloud.userData.dispose();
  return g;
 }else if(kind==='magic-platform'){
  // A magic platform is a floating slab over open air (magic-platform.js); it replaces the floor.
  const platform=createMagicPlatform(seed);g.add(platform);
  g.userData.hidesFloor=true;
  g.userData.dispose=()=>platform.userData.dispose();
  return g;
 }else if(kind==='poison-cloud'){
  // Poison gas is a veil of ragged green vapour (poison-cloud.js) over the floor it hangs above.
  const gas=createPoisonCloud(seed);g.add(gas);
  g.userData.dispose=()=>gas.userData.dispose();
  return g;
 }else if(kind==='air'){
  // Open air is a merged sky and drift of its own (air.js); it replaces the floor.
  const air=createAir(seed);g.add(air);
  g.userData.hidesFloor=true;
  g.userData.dispose=()=>air.userData.dispose();
  return g;
 }
 g.userData.dispose=()=>{};
 return g;
}
