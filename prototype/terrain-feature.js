import * as THREE from 'three';
import {createDrawbridge} from './drawbridge.js';
import {createBog} from './bog.js';
import {createIceWall} from './ice-wall.js';
import {createIceFloor} from './ice-floor.js';
import {createCloud} from './cloud.js';
import {createAir} from './air.js';

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
  // Clouds are a merged cumulus bank of their own (cloud.js); it replaces the floor.
  const cloud=createCloud(seed);g.add(cloud);
  g.userData.hidesFloor=true;
  g.userData.dispose=()=>cloud.userData.dispose();
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
