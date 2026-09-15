import * as THREE from 'three';
import {createGroundModel} from './ground-models.js';

const items=[['wand of fire',11],['speed boots',3],['T-shirt',3],['towel',6],['dwarvish mithril-coat',3],['bag of holding',6],['food ration',7],['tripe ration',7],['unicorn horn',6],['Candelabrum of Invocation',6],['magic marker',6],['sprig of wolfsbane',7]];
items.unshift(['can of grease',6],['oil lamp',6],['magic lamp',6]);
// Render each fixture once, releasing GPU resources between cards.
for(const [name,cls] of items){
 const figure=document.createElement('figure'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption');
 caption.textContent=name;figure.append(canvas,caption);document.querySelector('main').append(figure);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(300,220);renderer.setClearColor(0x233138);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,300/220,.01,10);
 camera.position.set(.95,1.05,1.25);camera.lookAt(0,.12,0);
 scene.add(new THREE.HemisphereLight(0xe4f4ff,0x65523a,2));const light=new THREE.DirectionalLight(0xffe1b6,3);light.position.set(-2,4,3);scene.add(light);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(.9,.9),new THREE.MeshStandardMaterial({color:0x54605b,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.002;scene.add(floor);
 const model=createGroundModel({name,class:cls});if(!model)throw new Error(`Missing model: ${name}`);scene.add(model);
 renderer.render(scene,camera);canvas.width=300;canvas.height=220;canvas.getContext('2d').drawImage(renderer.domElement,0,0);
 model.userData.dispose();floor.geometry.dispose();floor.material.dispose();renderer.dispose();renderer.forceContextLoss();
}
