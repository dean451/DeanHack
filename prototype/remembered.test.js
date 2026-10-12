import test from 'node:test';
import assert from 'node:assert/strict';
import {DIM_COLOR,DIM_OPACITY,dimKeep,dimSpread} from './remembered.js';

test('remembered tiles are dim: most of the tile hue is covered',()=>{
 assert.ok(DIM_OPACITY>=.7&&DIM_OPACITY<=.85);
 assert.ok(dimKeep()<.3);
});
test('the fog is near neutral so it desaturates, and stays dark',()=>{
 assert.ok(dimSpread(DIM_COLOR)<=.08,'fog colour is almost grey');
 assert.ok(((DIM_COLOR>>16)&255)<48);
});

import * as THREE from 'three';
import {GHOST_OPACITY,GHOST_MAX,shouldGhost,ghostGone,ghostize} from './remembered.js';
test('only a living monster on remembered, unseen ground becomes a ghost',()=>{
 assert.ok(shouldGhost({visible:false,remembered:true,terrain:'floor'}));
 assert.ok(!shouldGhost({visible:true,remembered:true,terrain:'floor'}));
 assert.ok(!shouldGhost({visible:false,remembered:false,terrain:'floor'}));
 assert.ok(!shouldGhost({visible:false,remembered:true,terrain:'floor'},true),'the dead leave none');
 assert.ok(!shouldGhost(undefined));
 assert.ok(GHOST_MAX>0);
});
test('a ghost goes once its tile is seen again',()=>{
 assert.ok(ghostGone({visible:true}));
 assert.ok(ghostGone(undefined));
 assert.ok(!ghostGone({visible:false,remembered:true}));
});
test('ghostize fades a clone and leaves the original material alone',()=>{
 const m=new THREE.MeshStandardMaterial({color:0xaa2200,emissive:0x331100});
 const root=new THREE.Group();const mesh=new THREE.Mesh(new THREE.BoxGeometry(),m);mesh.castShadow=true;root.add(mesh);
 const made=ghostize(root,THREE);
 assert.equal(made.length,1);
 assert.notEqual(mesh.material,m);
 assert.equal(mesh.material.opacity,GHOST_OPACITY);assert.ok(mesh.material.transparent);assert.equal(mesh.material.depthWrite,false);
 assert.equal(m.opacity,1);assert.equal(m.transparent,false);
 const c=mesh.material.color,sat=Math.max(c.r,c.g,c.b)-Math.min(c.r,c.g,c.b);
 assert.ok(sat<Math.max(m.color.r,m.color.g,m.color.b)-Math.min(m.color.r,m.color.g,m.color.b),'desaturated');
 assert.equal(mesh.castShadow,false);
});
