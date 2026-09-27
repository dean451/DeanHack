import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {assetFileFor,clipRoles,attachModelAsset} from './model-assets.js';

// A stand-in for a Tripo export: a two-bone skinned box, 2 units tall, lying off-centre,
// with idle, walk and attack clips on the upper bone.
function fakeGltf(){
 const geo=new THREE.BoxGeometry(.8,2,.5,1,4,1);geo.translate(3,1,-2);
 const pos=geo.attributes.position,skinIndex=[],skinWeight=[];
 for(let i=0;i<pos.count;i++){const up=pos.getY(i)>1;skinIndex.push(up?1:0,0,0,0);skinWeight.push(1,0,0,0);}
 geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));
 geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));
 const root=new THREE.Bone(),spine=new THREE.Bone();root.name='root';spine.name='spine';spine.position.set(3,1,-2);root.add(spine);
 const mesh=new THREE.SkinnedMesh(geo,new THREE.MeshStandardMaterial());mesh.add(root);mesh.bind(new THREE.Skeleton([root,spine]));
 const scene=new THREE.Group();scene.add(mesh);
 const turn=(name,angle,len)=>new THREE.AnimationClip(name,len,[new THREE.QuaternionKeyframeTrack('spine.quaternion',[0,len/2,len],
  [0,0,0,1,...new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),angle).toArray(),0,0,0,1])]);
 return {scene,animations:[turn('Armature|Idle_Breathing',.05,2),turn('Walk_Cycle',.2,1),turn('Attack_Slash',1.2,.6)]};
}

test('asset files are found by monster name, and kin borrow them',()=>{
 const urls={'dwarf.glb':'/m/dwarf.glb','gnome-lord.glb':'/m/gl.glb'};
 assert.equal(assetFileFor('dwarf',urls),'dwarf.glb');
 assert.equal(assetFileFor('Dwarf King',urls),'dwarf.glb');
 assert.equal(assetFileFor('gnome lord',urls),'gnome-lord.glb');
 assert.equal(assetFileFor('gnome',urls),null);
 assert.equal(assetFileFor('',urls),null);
 const roles=clipRoles([{name:'Hit_Reaction'},{name:'Run'},{name:'Sword_Attack'},{name:'Idle'},{name:'Dying'}]);
 assert.deepEqual(Object.fromEntries(Object.entries(roles).map(([k,v])=>[k,v.name])),{hurt:'Hit_Reaction',walk:'Run',attack:'Sword_Attack',idle:'Idle',die:'Dying'});
 assert.equal(clipRoles([{name:'Take 001'}]).idle.name,'Take 001');
});

test('a rigged asset replaces the procedural dwarf at its height, stands on the floor and animates',async()=>{
 const actor=createCreature({name:'dwarf',symbol:104,color:1});
 // A stand-in for the disposition ring stageCreature adds (it needs a DOM).
 const ring=new THREE.Mesh(new THREE.RingGeometry(.3,.35),new THREE.MeshBasicMaterial());ring.userData.ring=true;ring.rotation.x=-Math.PI/2;actor.g.add(ring);
 const label=new THREE.Sprite();actor.g.add(label);
 actor.g.updateMatrixWorld(true);const before=new THREE.Box3().setFromObject(actor.g);
 const loader={loadAsync:async()=>fakeGltf()};
 const asset=await attachModelAsset(actor,'dwarf lord',{'dwarf.glb':'/fake/dwarf.glb'},loader);
 assert(asset&&actor.asset===asset);
 // Only the new model, the name label and the disposition ring stay visible.
 const visible=actor.g.children.filter(c=>c.visible);
 assert.equal(visible.length,3);assert(visible.includes(label)&&visible.includes(asset.model)&&visible.some(c=>c.userData.ring));
 const box=()=>{actor.g.updateMatrixWorld(true);return new THREE.Box3().setFromObject(asset.model,true);};
 let b=box();
 assert(Math.abs(b.min.y)<1e-6,`feet on the floor: ${b.min.y}`);
 assert(Math.abs((b.max.y-b.min.y)-(before.max.y-Math.max(0,before.min.y)))<.02,`height ${b.max.y-b.min.y} vs ${before.max.y}`);
 assert(Math.abs((b.min.x+b.max.x)/2)<.2&&Math.abs((b.min.z+b.max.z)/2)<.2,'centred on the tile');
 // Idle, then walking, then a one-shot attack that returns to the loop; poses stay finite.
 const spine=()=>{let s;asset.model.traverse(o=>{if(o.name==='spine')s=o;});return s;};
 const angles=[];
 for(let i=0;i<60;i++){asset.update(1/30,i>=20);angles.push(spine().quaternion.x);}
 assert(asset.play('attack'));
 let peak=0;for(let i=0;i<30;i++){asset.update(1/30,false);peak=Math.max(peak,Math.abs(spine().quaternion.x));}
 assert(peak>.3,`attack swings the spine: ${peak}`);
 for(let i=0;i<30;i++){asset.update(1/30,false);angles.push(spine().quaternion.x);}
 assert(Math.abs(angles.at(-1))<.1,'back to idle after the attack');
 assert(angles.every(Number.isFinite));
 assert.equal(asset.play('die'),false,'no death clip in this file');
 asset.restore();
 assert(!actor.asset&&actor.g.children.every(c=>c.visible));
});

test('a missing or broken asset leaves the procedural model alone',async()=>{
 const actor=createCreature({name:'dwarf',symbol:104,color:1});
 assert.equal(attachModelAsset(actor,'dwarf',{}),null);
 const warn=console.warn;console.warn=()=>{};
 try{assert.equal(await attachModelAsset(actor,'dwarf',{'dwarf.glb':'/broken.glb'},{loadAsync:async()=>{throw new Error('404');}}),null);}
 finally{console.warn=warn;}
 assert(!actor.asset&&actor.g.children.every(c=>c.visible));
});
