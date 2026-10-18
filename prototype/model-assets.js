import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
import {rigFox} from './fox-skin.js';
import {FELINE_GLIDE} from './slide.js';

// Rigged GLB creatures (e.g. from Tripo) dropped into prototype/models/ replace the
// procedural model once they load. A file is found by the monster's name with spaces as
// dashes ("dwarf.glb", "dwarf-lord.glb"); SHARED lets kin borrow a model. The procedural
// model stays underneath as the fallback and sets the height the asset is scaled to.
export const SHARED={'dwarf lord':'dwarf','dwarf king':'dwarf','gnome lord':'gnome','gnome king':'gnome'};
// Per-file fixes for exports that don't face +z (glTF's forward) or sit oddly. `rig` builds our own
// skeleton and animator inside a model that ships as a bare body (the fox: its rig and clips carried a
// credit, so they were stripped and it is rigged here instead; see fox-skin.js).
export const ASSET_TWEAKS={'fox.glb':{rig:rigFox}};

export function assetFileFor(name,urls={}){
 const n=(name||'').trim().toLowerCase(),file=s=>s.replace(/\s+/g,'-')+'.glb';
 if(!n)return null;
 if(urls[file(n)])return file(n);
 const kin=SHARED[n];return kin&&urls[file(kin)]?file(kin):null;
}

// Clip names vary by exporter, so each role is found by keyword. Reactions are matched
// before attacks so "hit_react" isn't taken for a swing.
const ROLES=[['die',/death|die|dead|dying/i],['hurt',/hurt|damage|react|flinch/i],['attack',/attack|slash|swing|punch|strike|chop|hit|combat/i],
 ['walk',/walk|run|move|locomot|jog/i],['idle',/idle|stand|breath|rest/i]];
export function clipRoles(clips){
 const roles={};
 for(const clip of clips){const hit=ROLES.find(([role,re])=>!roles[role]&&re.test(clip.name));if(hit)roles[hit[0]]=clip;}
 // A lone unnamed clip still gives the model something to do.
 if(!roles.idle)roles.idle=clips.find(c=>!Object.values(roles).includes(c))||roles.walk||null;
 return roles;
}

const cache=new Map();
export function loadAsset(url,loader=new GLTFLoader()){
 // Failures are cached as null so a broken file is tried once, not every frame.
 if(!cache.has(url))cache.set(url,loader.loadAsync(url).catch(err=>{console.warn(`Model asset ${url} failed to load; keeping the procedural model.`,err);return null;}));
 return cache.get(url);
}

// Swap a loaded glTF into an actor: hide the procedural parts (keeping the name label and
// disposition ring), scale the asset to the procedural height, stand it on the floor and
// give the actor an `asset` driver with idle/walk crossfades and one-shot actions.
export function swapInAsset(actor,gltf,tweak={}){
 const g=actor.g,inverse=new THREE.Matrix4(),box=new THREE.Box3(),part=new THREE.Box3(),hidden=[];
 g.updateMatrixWorld(true);inverse.copy(g.matrixWorld).invert();
 for(const child of g.children){
  if(child.isSprite||child.userData.ring)continue;
  hidden.push(child);
  child.traverse(mesh=>{if(!mesh.isMesh||mesh.userData.outline)return;if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
   part.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);box.union(part);});
 }
 const height=tweak.height??(box.isEmpty()?1.1:box.max.y-Math.max(0,box.min.y));
 const model=cloneSkinned(gltf.scene),holder=new THREE.Group();
 holder.add(model);model.rotation.y=tweak.yaw||0;
 const rigged=tweak.rig?tweak.rig(model,actor):null;
 if(tweak.rig&&!rigged)return null;
 holder.updateMatrixWorld(true);
 const own=new THREE.Box3().setFromObject(holder,true),size=own.getSize(new THREE.Vector3());
 if(!(size.y>0)||!own.min.toArray().every(Number.isFinite))return null;
 const s=height/size.y;model.scale.multiplyScalar(s);
 holder.updateMatrixWorld(true);own.setFromObject(holder,true);
 const cx=box.isEmpty()?0:(box.min.x+box.max.x)/2,cz=box.isEmpty()?0:(box.min.z+box.max.z)/2;
 model.position.x+=cx-(own.min.x+own.max.x)/2;model.position.z+=cz-(own.min.z+own.max.z)/2;model.position.y-=own.min.y;
 model.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;
  // A glTF without normals (the fox) is shaded flat from screen derivatives, but the ambient
  // occlusion pass draws its own normal buffer from the attribute and read zeros: the whole model
  // went black. Face normals (a non-indexed mesh gives one per face) look the same and fix it.
  if(!o.geometry.attributes.normal)o.geometry.computeVertexNormals();
  // Skinned bounds follow the bind pose, so an animated limb could be culled mid-swing.
  if(o.isSkinnedMesh)o.frustumCulled=false;}});
 hidden.forEach(c=>c.visible=false);
 g.add(holder);
 if(rigged){
  // our own rig: the cat's animator runs the gaits, the sit and the pounce (on the actor's attack action)
  actor.glide=FELINE_GLIDE; // bounds tile to tile at a pace its gaits can stride to (slide.js)
  actor.asset={model:holder,mixer:rigged.animator.mixer,actions:rigged.animator.actions,animator:rigged.animator,rig:rigged.rig,
   play(){return false;},
   update(dt,walking){rigged.animator.update(dt,walking);},
   restore(){rigged.animator.mixer.stopAllAction();g.remove(holder);hidden.forEach(c=>c.visible=true);delete actor.asset;delete actor.glide;}};
  return actor.asset;
 }
 const mixer=new THREE.AnimationMixer(model),roles=clipRoles(gltf.animations||[]),actions={};
 for(const [role,clip] of Object.entries(roles))if(clip)actions[role]=mixer.clipAction(clip);
 for(const role of ['attack','hurt','die'])if(actions[role]){actions[role].setLoop(THREE.LoopOnce,1);actions[role].clampWhenFinished=true;}
 let current=null,oneShot=null;
 const fadeTo=(action,time=.22)=>{if(!action||action===current)return;action.reset().setEffectiveWeight(1).fadeIn(time).play();current?.fadeOut(time);current=action;};
 mixer.addEventListener('finished',e=>{if(e.action===oneShot&&oneShot!==actions.die)oneShot=null;});
 fadeTo(actions.idle,0);
 actor.asset={model:holder,mixer,actions,
  // Plays attack, hurt or die once, then falls back to idle or walk. Returns false when the model has no such clip.
  play(role){const a=actions[role];if(!a)return false;oneShot=a;fadeTo(a,.1);return true;},
  update(dt,walking){if(!oneShot)fadeTo(walking&&actions.walk?actions.walk:actions.idle);mixer.update(dt);},
  restore(){mixer.stopAllAction();g.remove(holder);hidden.forEach(c=>c.visible=true);delete actor.asset;}};
 return actor.asset;
}

// Starts loading the asset for this creature, if there is one; the swap happens when it arrives.
export function attachModelAsset(actor,name,urls,loader){
 const file=assetFileFor(name,urls);
 if(!file)return null;
 return loadAsset(urls[file],loader).then(gltf=>gltf&&!actor.asset?swapInAsset(actor,gltf,ASSET_TWEAKS[file]):null);
}
