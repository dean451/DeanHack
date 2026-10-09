import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Lemures share the minor demons' letter, so they used to be the imp humanoid tinted brown, wings
// and all. They now slump as the shapeless larval devils they are: a mound of mottled, melting
// flesh that sits in its own ooze, sagging in rolls and running in drips down its sides, dotted
// with boils. A lumpy head sinks into the top of the mass with a face sliding off it: one eye
// socket lower than the other, dull yellow eyes, a slack drooping mouth with a few stumpy teeth
// and flesh dribbling from the chin. Two thin arms reach out of the mass on either side and end
// in stubby three-fingered hands (lemures hit with a claw). There are no legs; two lobes of flesh
// at the front of the mound take their place and slosh as it crawls.
// Each moving part (body, head, each lobe and arm) is one merged, vertex-coloured mesh with a
// shared material, plus one small emissive mesh for the eyes: 7 draws. Geometry is built once
// and shared by every lemure.
// Handles: legs, arms, arm, head, body, like the humanoid rig. No wings or tail.

const C={
 flesh:rgb('#8a6a55'),dark:rgb('#4a3428'),pale:rgb('#b89478'),wet:rgb('#3a2820'),boil:rgb('#a86a58'),
 sore:rgb('#5a1210'),socket:rgb('#140c08'),mouth:rgb('#1c0c08'),tooth:rgb('#c8b890'),nail:rgb('#2a1c14'),
};
// mottled flesh: darker toward the ground, blotched by a cheap interference pattern
const mottle=(lo,hi)=>(x,y,z)=>{
 const n=Math.sin(x*37+y*23)*Math.sin(z*41-y*19)+.5*Math.sin(x*71-z*53+y*11);
 const base=mix(C.dark,C.flesh,(y-lo)/(hi-lo)+n*.18);
 return n>.8?mix(base,C.pale,(n-.8)*1.5):base;
};

function buildBody(){
 const P=pieces();
 // the ooze it sits in, wet and dark
 P.add(new THREE.SphereGeometry(.2,20,8),at(0,.022,.02,[0,0,0],[1.15,.11,1.15]),C.wet);
 // the main mass, and a smaller upper mass slumped forward on top of it
 P.add(new THREE.SphereGeometry(.17,20,14),at(0,.19,0,[0,0,0],[1.1,.95,1.05]),mottle(.02,.36));
 P.add(new THREE.SphereGeometry(.13,18,12),at(0,.36,.03,[.2,0,0],[1.05,1.05,.95]),mottle(.24,.5));
 // rolls of flesh sagging round the mass
 for(const [y,r,tilt] of [[.1,.18,.08],[.23,.165,-.1],[.34,.13,.15]])
  P.add(new THREE.TorusGeometry(r,.028,6,24),at(0,y,.01,[Math.PI/2+tilt,0,0],[1.06,1,.9]),mottle(y-.06,y+.1));
 // drips of flesh running down the sides and front
 const drips=[[-.15,.2,.08],[.16,.24,.05],[-.08,.18,.16],[.1,.14,.15],[-.17,.16,-.07],[.14,.18,-.1],[0,.28,-.15]];
 for(const [x,y,z] of drips){
  P.add(new THREE.SphereGeometry(.03,8,8),at(x,y,z,[0,0,0],[.7,2.2,.7]),mottle(y-.08,y+.06));
  P.add(new THREE.SphereGeometry(.018,6,6),at(x*1.04,y-.075,z*1.04),C.dark);
 }
 // boils scattered over the upper surface
 const boils=[[.4,.8,.3],[-.6,.6,.4],[1.9,.5,.2],[-2.2,.7,.2],[2.8,.3,.5],[3.4,.9,.3],[-1.2,1.1,.25],[1,1.2,.2]];
 for(const [a,e,s] of boils){
  const r=.17,x=Math.sin(a)*Math.cos(e)*r*1.1,y=.19+Math.sin(e)*r*.95,z=Math.cos(a)*Math.cos(e)*r*1.05;
  P.add(new THREE.IcosahedronGeometry(.014+s*.03,1),at(x,y,z),C.boil);
 }
 // raw weeping sores where the skin has split, with a splinter of yellowed bone through one
 for(const [a,e] of [[.9,.35],[-1.7,.2],[2.3,.45]]){
  const r=.17,x=Math.sin(a)*Math.cos(e)*r*1.12,y=.19+Math.sin(e)*r*.95,z=Math.cos(a)*Math.cos(e)*r*1.07;
  P.add(new THREE.SphereGeometry(.026,8,6),at(x,y,z,[0,0,0],[1.2,.45,1.2]),C.sore);
 }
 P.add(new THREE.ConeGeometry(.009,.07,5),at(.1,.3,.12,[.6,0,-.5]),C.tooth);
 // shoulder stubs where the arms push out of the mass
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.045,10,8),at(s*.14,.38,.05,[0,0,0],[1,.8,1]),mottle(.32,.44));
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // a lumpy skull, sagging to one side
 P.add(new THREE.SphereGeometry(.085,14,12),at(0,.03,0,[0,0,.12],[1.05,.95,1]),mottle(-.05,.12));
 P.add(new THREE.SphereGeometry(.05,10,8),at(-.045,.07,-.02),mottle(0,.12));
 // the face slides down the front: brow, then sockets, the left one lower than the right
 P.add(new THREE.SphereGeometry(.04,10,6),at(.005,.06,.07,[0,0,-.18],[1.9,.5,.7]),C.dark);
 for(const [x,y] of [[-.032,.025],[.034,.045]])P.add(new THREE.SphereGeometry(.024,8,6),at(x,y,.07),C.socket);
 // a snubbed nose and a slack mouth dragged down at one corner
 P.add(new THREE.SphereGeometry(.018,8,6),at(0,.01,.09,[0,0,0],[1,.8,.9]),C.flesh);
 P.add(new THREE.SphereGeometry(.036,10,6),at(-.004,-.032,.068,[0,0,-.3],[1.2,.55,.6]),C.mouth);
 P.add(new THREE.TorusGeometry(.036,.009,5,14,Math.PI),at(-.004,-.032,.075,[0,0,Math.PI-.3],[1.2,.8,1]),C.flesh);
 for(const x of [-.022,.004,.024])P.add(new THREE.ConeGeometry(.006,.016,4),at(x,-.018+x*.3,.078,[Math.PI,0,0]),C.tooth);
 // flesh dribbling from the chin
 for(const [x,l] of [[-.02,.05],[.015,.035]])P.add(new THREE.SphereGeometry(.013,6,6),at(x,-.07-l*.4,.06,[0,0,0],[.8,l/.013*.5,.8]),C.flesh);
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const [x,y] of [[-.032,.025],[.034,.045]])P.add(new THREE.SphereGeometry(.012,8,6),at(x,y,.084),[1,1,1]);
 return P.merge();
}

// A lobe of flesh at the front of the mound, where legs would be.
function buildLobe(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.07,12,10),at(0,-.055,.03,[0,0,0],[1,.85,1.3]),mottle(-.12,.02));
 P.add(new THREE.SphereGeometry(.03,8,6),at(0,-.09,.11,[0,0,0],[1.2,.6,1]),C.dark);
 return P.merge();
}

// A thin arm reaching out of the mass, ending in a stubby three-fingered hand.
function buildArm(side){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.018,.026,.13,8),at(0,-.065,0),mottle(-.13,0));
 P.add(new THREE.SphereGeometry(.021,8,6),at(0,-.13,0),C.flesh);
 P.add(new THREE.CylinderGeometry(.014,.019,.12,8),at(0,-.19,.012,[-.2,0,0]),mottle(-.25,-.13));
 P.add(new THREE.SphereGeometry(.028,8,6),at(0,-.26,.03,[0,0,0],[1,.9,.8]),C.flesh);
 for(const a of [-.45,0,.45]){
  const x=side*Math.sin(a)*.022;
  P.add(new THREE.CylinderGeometry(.008,.01,.04,5),at(x,-.29,.04,[.3,0,-a*.5]),C.flesh);
  P.add(new THREE.ConeGeometry(.008,.018,5),at(x*1.1,-.315,.05,[.3,0,-a*.4]),C.nail);
 }
 return P.merge();
}

let shared=null;
function geometry(){
 if(shared)return shared;
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55});
 const eye=new THREE.MeshStandardMaterial({color:0xd8b040,emissive:0x8a5a10,emissiveIntensity:1.6,roughness:.3});
 shared={material,eye,body:buildBody(),head:buildHead(),eyes:buildEyes(),lobe:buildLobe(),arm:{'-1':buildArm(-1),'1':buildArm(1)}};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createLemure(){
 const S=geometry();
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(0,.49,.07);head.rotation.x=.15;body.add(head);
 mesh(head,S.head,S.material,'head');mesh(head,S.eyes,S.eye,'eyes');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.09,.11,.11);body.add(leg);mesh(leg,S.lobe,S.material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.16,.39,.06);arm.rotation.set(-.55,0,s*.35);body.add(arm);mesh(arm,S.arm[s],S.material,'arm');arms.push(arm);
 }
 return {g,body,legs,tail:null,wings:[],quirk:'lemure',arms,arm:arms[1],head,hat:null,beard:null,pick:null};
}
