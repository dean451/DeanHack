// Dressing a map square in Live: the small box and floating-label helpers, which squares carry a wall torch, and
// the trees, stairs and terrain features set on a tile (fountains, altars, thrones, sinks, graves, traps...).
// Moved out of live.js unchanged; live.js passes the animated-part registry and the tile instancer in.
import * as THREE from 'three';
import {cellHash} from './floor.js';
import {deadTreeShown,createDeadTree} from './dead-tree.js';
import {createTree} from './tree.js';
import {ladderShown,createLadder} from './ladder.js';
import {createStairs} from './stairs.js';
import {trapKind,createTrap} from './trap.js';
import {featureKind,coveredFeature,createTerrainFeature,AXIS_FEATURES} from './terrain-feature.js';
import {createSheolVortex,animatePortal} from './portal-fx.js';
import {createVibratingSquare} from './vibrating-square.js';

export function box(geo,mat,parent,x,y,z){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
export function label(text,color='#f0d9b0'){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='rgba(10,20,20,.68)';ctx.beginPath();ctx.roundRect(54,16,404,64,12);ctx.fill();ctx.font='30px system-ui';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,256,61);const texture=new THREE.CanvasTexture(c),material=new THREE.SpriteMaterial({map:texture,depthTest:false});const s=new THREE.Sprite(material);s.scale.set(1.3,.25,1);s.position.y=1.7;s.userData.dispose=()=>{texture.dispose();material.dispose();};return s;}
export function hasTorch(x,z){return cellHash(x,z)%9===0;}
export function dressTree(tile,cell){
  const dead=deadTreeShown(cell)??tile.userData.deadTree??false;
  if(tile.userData.tree&&dead===tile.userData.deadTree)return;
  if(tile.userData.tree){tile.userData.tree.userData.dispose?.();tile.remove(tile.userData.tree);}
  const model=(dead?createDeadTree:createTree)(cell.x*97+cell.z);
  tile.add(model);tile.userData.tree=model;tile.userData.deadTree=dead;
 }
export function dressStairs(tile,cell){
  const ladder=ladderShown(cell)??tile.userData.ladder??false,key=`${cell.terrain}:${ladder}`;
  if(key===tile.userData.stairsKey)return;
  for(const o of tile.userData.stairs||[]){o.traverse(c=>c.userData.dispose?.());tile.remove(o);}
  const seed=cell.x*131+cell.z,model=(ladder?createLadder:createStairs)(cell.terrain,seed);
  tile.add(model);tile.userData.stairs=[model];tile.userData.stairsKey=key;tile.userData.ladder=ladder;
 }
export function dressFeature(tile,cell,{animated,tileInstances}={}){
  const trap=trapKind(cell.symbol,cell.color,cell.trap),other=trap?null:featureKind(cell.symbol,cell.color);
  const kind=trap||other,portal=trap==='portal'&&cell.portal||null,key=portal?`portal:${portal}`:kind||(tile.userData.featureKey||coveredFeature(cell)?null:'label');
  if(!key||key===tile.userData.featureKey)return;
  if(tile.userData.feature){tile.userData.feature.traverse(o=>o.userData.dispose?.());tile.remove(tile.userData.feature);}
  // Portals and the vibrating square animate themselves (portal-fx.js, vibrating-square.js).
  const seed=cell.x*53+cell.z*29;
  const model=portal==='sheol'?createSheolVortex(seed):trap==='vibrating'?createVibratingSquare(seed):trap?createTrap(trap,seed):other?createTerrainFeature(other,cell.x*41+cell.z*23):label(String.fromCharCode(cell.symbol));
  if(trap==='portal')animatePortal(model,portal||'other',seed);
  if(!kind)model.position.y=.35;
  tile.userData.slab.visible=!model.userData.hidesFloor;
  tile.add(model);tile.userData.feature=model;tile.userData.featureKey=key;tile.userData.axisFeature=AXIS_FEATURES.has(key)?model:null;
  animated.add(tile);tileInstances.add(tile);tileInstances.refresh(); // a trap or feature can carry an animate hook, and can be dressed after the tile was built
 }
