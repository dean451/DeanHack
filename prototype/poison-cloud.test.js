import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createTerrainFeature,featureKind} from './terrain-feature.js';
import {trapKind} from './trap.js';

test('poison gas (bright green #) is a ragged green veil over the floor, in two draws, and frees its resources',()=>{
 assert.equal(featureKind(35,10),'poison-cloud');
 assert.equal(featureKind(35,7),'cloud');
 for(const seed of [0,1,7,42,999,31337]){
  const model=createTerrainFeature('poison-cloud',seed);
  assert(!model.userData.hidesFloor,'gas is a veil; the floor under it must show');
  const meshes=[],geometries=new Set(),materials=new Set();
  model.traverse(o=>{if(o.geometry){meshes.push(o);geometries.add(o.geometry);materials.add(o.material);
   for(const key of ['position','normal','color'])for(const v of o.geometry.attributes[key].array)assert(Number.isFinite(v),`bad ${key}`);
   for(const m of [o.material])assert(m.transparent&&!m.depthWrite);
   const c=o.geometry.attributes.color.array;
   for(let i=0;i<c.length;i+=3)assert(c[i+1]>=c[i]&&c[i+1]>c[i+2],'gas should read green');}});
  assert.deepEqual(meshes.map(m=>m.userData.part).sort(),['core','wisps']);
  const b=new THREE.Box3().setFromObject(model);
  assert(b.min.x>-.6&&b.max.x<.6&&b.min.z>-.6&&b.max.z<.6&&b.min.y>-.2&&b.max.y<1,`gas strays far from its tile: ${b.min.toArray()}..${b.max.toArray()}`);
  let freed=0;
  for(const item of [...geometries,...materials])item.addEventListener('dispose',()=>freed++);
  model.userData.dispose();
  assert.equal(freed,geometries.size+materials.size,'poison cloud leaks resources');
 }
});

// Terrain audit: every non-trap map symbol in drawing.c defsyms that the bridge sends as a plain
// `feature` (see terrain() in bridge.c) has a model, or is a transient overlay (beams, shields,
// swallow and explosion frames, the getpos marker) that is never a settled map tile.
test('every settled terrain feature in drawing.c has a model, not a bare symbol label',()=>{
 const src=readFileSync(new URL('../src/drawing.c',import.meta.url),'utf8');
 const body=src.slice(src.indexOf('struct symdef defsyms[MAXPCHARS] = {'));
 const rows=[...body.slice(0,body.indexOf('\n};')).matchAll(/\{\s*('(?:\\\\|\\'|[^'])'),\s*"([^"]*)",\s*C\(([A-Z_]+)\)\s*\},\s*\/\*\s*([^*]*?)\s*\*\//g)];
 assert(rows.length>=90,'defsyms should list the map symbols');
 const COLOR={NO_COLOR:8,CLR_BLACK:0,CLR_RED:1,CLR_GREEN:2,CLR_BROWN:3,CLR_BLUE:4,CLR_MAGENTA:5,CLR_CYAN:6,CLR_GRAY:7,CLR_ORANGE:9,CLR_BRIGHT_GREEN:10,CLR_BRIGHT_CYAN:14,CLR_WHITE:15,HI_METAL:6};
 const OWN_MODEL=/^(stone|wall|vwall|hwall|[tb][lr]corn|crwall|t[udlr]wall|ndoor|[vh]odoor|[vh]cdoor|bars|tree|dead tree|room|dark room|dark corr|lit corr|upstair|dnstair|upladder|dnladder|altar|grave|throne|sink|fountain|pool|lava|under water|vbeam|hbeam|lslant|rslant|dig beam|camera flash beam|boomerang.*|4 magic shield symbols|target position|swallow.*|explosion.*)$/;
 const gaps=[];
 for(const [,sym,,color,note] of rows){
  const name=note.trim();
  if(name==='trap'||name==='web'||name==='"trap"'||OWN_MODEL.test(name))continue;
  const ch=sym.slice(1,-1).replace(/^\\\\$/,'\\').charCodeAt(0);
  if(!featureKind(ch,COLOR[color]))gaps.push(`${name} (${sym}, ${color})`);
 }
 assert.deepEqual(gaps,[],'these features would show as a bare symbol label; give them a model');
});
