// A gallery of monsters, traps and a door, each at yaw 0 with the orientation overlay drawn over it,
// so the convention (ORIENTATION.md: authored front is +z) can be checked by eye. Same isolated
// renderer pattern as item-review.js; render-smoke.test.js loads it and checks every card drew.
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createTrap} from './trap.js';
import {createDoor} from './door.js';
import {createOrientationOverlay} from './orientation-overlay.js';

const monsters=['jackal','newt','sewer rat','grid bug','kobold','goblin','gnome','hill orc','giant ant','floating eye','acid blob','lichen','gnome lord','dwarf','hobbit','giant beetle','soldier ant','bugbear','imp','homunculus','hell hound','ogre','troll','red dragon'];
const traps=['arrow','dart','rolling','jaws','squeaky','fire','pit','hole','rust','mine','teleport','web'];
const cards=[...monsters.map(name=>['monster',name]),...traps.map(kind=>['trap',kind]),['door','door']];
for(const [kind,name] of cards){
 const figure=document.createElement('figure'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption');
 caption.textContent=`${name} (${kind})`;figure.append(canvas,caption);document.querySelector('main').append(figure);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(300,240);renderer.setClearColor(0x233138);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,300/240,.01,20);
 // above and behind the front, so +z (the arrow) points toward the viewer's lower edge
 camera.position.set(1.2,2.2,2.6);camera.lookAt(0,.3,0);
 scene.add(new THREE.HemisphereLight(0xe4f4ff,0x65523a,2));const light=new THREE.DirectionalLight(0xffe1b6,3);light.position.set(-2,4,3);scene.add(light);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),new THREE.MeshStandardMaterial({color:0x54605b,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.002;scene.add(floor);
 let model,entries;
 if(kind==='monster'){const a=createCreature({name,symbol:name.charCodeAt(0)});model=a.g??a;scene.add(model);entries=[{object:model,kind:'monster',length:.7,lift:.05}];const socket=a.weaponSocket??model.userData?.weaponSocket;const held=socket?.children?.[0];if(held)entries.push({object:held,kind:'weapon',axis:'y',length:.35});}
 else if(kind==='trap'){model=createTrap(name,7);scene.add(model);entries=[{object:model,kind:'feature',length:.7,lift:.05}];}
 else{model=createDoor(11);scene.add(model);entries=[{object:model,kind:'door',length:.7,lift:.5}];}
 const overlay=createOrientationOverlay(scene);overlay.set(true);overlay.update(entries);
 renderer.render(scene,camera);canvas.width=300;canvas.height=240;canvas.getContext('2d').drawImage(renderer.domElement,0,0);
 overlay.dispose();model.userData?.dispose?.();floor.geometry.dispose();floor.material.dispose();renderer.dispose();renderer.forceContextLoss();
}
