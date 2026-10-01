import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Ghosts and shades have no class letter (their glyph is a space), so they used to fall right
// through to the armoured guardian box. They now drift as the sheeted dead: a translucent shroud
// that swells over the shoulders and falls in folds to a ragged, tongued hem trailing back as it
// floats, a round hooded head with hollow, sorrowful eye sockets and a gaping mouth, faint
// pinpoints of light deep in the sockets, and two drooping sleeves held out in front, their cuffs
// hanging in limp rags. A few wisps stream from the hem. The shade is the same figure, dim and
// smoky violet.
// Draws: body, head, face, eyes, one per sleeve: 6, sharing two materials per kind. Geometry is
// built once and shared. The shroud casts no shadow.
// Handles: body, head, arms, arm, ghost (the kind, for ghost-drift.js). No legs, wings or tail. Quirk 'hover', so it bobs like a wraith.

const C={
 sheet:rgb('#ffffff'),fold:rgb('#a8b0c4'),hem:rgb('#c4cad8'),
 socket:rgb('#0a0b12'),socketRim:rgb('#3a3e50'),mouth:rgb('#06070c'),
};
const ARM_PITCH=-1.2;// sleeves reach forward and a little down
const clamp=THREE.MathUtils.clamp;

// Folds and a ragged hem: below the waist the sheet ripples round its girth, drops in uneven
// tongues and trails back.
function drape(geo,top,bottom,{folds=7,tongues=.13,trail=.1}={}){
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  if(Math.hypot(x,z)<1e-6)continue;
  const a=Math.atan2(x,z),low=clamp((top-y)/(top-bottom),0,1);
  const k=1+low*(.09*Math.sin(folds*a+.6)+.04*Math.sin(13*a));
  const drop=low**3*(tongues*Math.max(0,Math.sin(5*a+1.1))**1.5+tongues*.35*Math.max(0,Math.sin(9*a-.4)));
  p.setXYZ(i,x*k,y-drop,z*k-trail*low*low);
 }
 geo.computeVertexNormals();
 return geo;
}
const foldShade=(top,bottom,folds=7)=>(x,y,z)=>{
 const a=Math.atan2(x,z),low=clamp((top-y)/(top-bottom),0,1);
 const crease=.5-.5*Math.sin(folds*a+.6);
 return mix(mix(C.sheet,C.hem,low*.8),C.fold,crease*low*.7+.08*(1-low));
};

function smooth(points,n){
 const curve=new THREE.SplineCurve(points.map(([r,y])=>new THREE.Vector2(r,y)));
 return curve.getSpacedPoints(n);
}

function buildBody(){
 const P=pieces();
 // the shroud, hem up to the shoulders, closed over the top where the head sits
 const profile=smooth([[.235,.19],[.23,.3],[.205,.42],[.18,.54],[.172,.64],[.19,.74],[.172,.81],[.11,.852],[.05,.868],[.001,.872]],22);
 P.add(drape(new THREE.LatheGeometry(profile,36),.64,.19),null,foldShade(.64,.19));
 // wisps streaming back and down from the hem
 for(const [x,y,len,yaw] of [[-.09,.2,.2,.25],[.07,.17,.24,-.2],[0,.22,.17,0]]){
  const geo=new THREE.ConeGeometry(.034,len,6,3,true);
  geo.translate(0,len/2,0);
  P.add(geo,at(x,y,-.15,[-1.95,0,yaw]),(px,py)=>mix(C.hem,C.fold,clamp((.2-py)/.2,0,1)));
 }
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // a hooded skull under the sheet, with a slack fold under the chin
 const hood=new THREE.SphereGeometry(.13,22,16);
 const p=hood.attributes.position;
 for(let i=0;i<p.count;i++){const y=p.getY(i);if(y>.09)p.setY(i,y+(y-.09)*.7);}// a soft peak where the sheet is drawn up
 hood.computeVertexNormals();
 P.add(hood,at(0,0,0,[0,0,0],[1,1.08,1]),(x,y)=>mix(C.fold,C.sheet,clamp((y+.12)/.2,0,1)));
 P.add(new THREE.TorusGeometry(.1,.022,6,18,Math.PI),at(0,-.1,.01,[Math.PI/2+.25,0,Math.PI]),C.hem);
 return P.merge();
}

// Hollow sockets tilted down at the outer corners, and a long, gaping mouth.
function buildFace(){
 const P=pieces();
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.036,10,8),at(s*.047,.02,.112,[0,0,s*.3],[.85,1.3,.45]),C.socketRim);
  P.add(new THREE.SphereGeometry(.03,10,8),at(s*.047,.02,.117,[0,0,s*.3],[.8,1.25,.4]),C.socket);
 }
 P.add(new THREE.SphereGeometry(.03,10,8),at(0,-.058,.11,[-.2,0,0],[.85,1.5,.45]),C.mouth);
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.011,8,6),at(s*.047,.012,.128),[1,1,1]);
 return P.merge();
}

// A flared, empty sleeve from the shoulder, its cuff torn into two limp rags that hang straight down.
function buildArm(){
 const P=pieces();
 const sleeve=new THREE.CylinderGeometry(.056,.084,.3,14,6,true);
 sleeve.translate(0,-.15,0);
 const p=sleeve.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(x,z),low=clamp((-.15-y)/.15,0,1);
  p.setY(i,y-low*low*.05*Math.max(0,Math.sin(4*a+.7)));
  const k=1+low*.08*Math.sin(5*a);p.setX(i,x*k);p.setZ(i,z*k);
 }
 sleeve.computeVertexNormals();
 P.add(sleeve,null,(x,y,z)=>mix(C.sheet,C.fold,clamp(-y/.3,0,1)*.5+(.5-.5*Math.sin(5*Math.atan2(x,z)))*.25));
 // the shoulder rounded into the shroud
 P.add(new THREE.SphereGeometry(.06,12,8),at(0,-.005,0,[0,0,0],[1,.9,1]),C.sheet);
 // rags at the cuff, hanging in world space
 const hang=-(Math.PI+ARM_PITCH);
 for(const [x,z,len] of [[-.035,-.04,.13],[.03,-.05,.1],[0,.05,.08]]){
  const geo=new THREE.ConeGeometry(.03,len,5,2,true);
  geo.translate(0,len/2,0);
  P.add(geo,at(x,-.3,z,[hang,0,0]),C.hem);
 }
 return P.merge();
}

const LOOKS={
 ghost:{tint:'#e6eaf2',emissive:'#7888aa',glow:.35,opacity:.78,eye:'#d8f0ff',eyeGlow:2.2},
 shade:{tint:'#524c64',emissive:'#1e1630',glow:.5,opacity:.7,eye:'#b890ff',eyeGlow:2.6},
};

let shared=null;
function geometry(){
 if(shared)return shared;
 shared={body:buildBody(),head:buildHead(),face:buildFace(),eyes:buildEyes(),arm:buildArm(),materials:{}};
 return shared;
}
function materials(kind){
 const S=geometry();
 if(S.materials[kind])return S.materials[kind];
 const L=LOOKS[kind];
 return S.materials[kind]={
  sheet:new THREE.MeshStandardMaterial({vertexColors:true,color:L.tint,emissive:L.emissive,emissiveIntensity:L.glow,roughness:.92,transparent:true,opacity:L.opacity,side:THREE.DoubleSide}),
  face:new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),
  eye:new THREE.MeshStandardMaterial({color:L.eye,emissive:L.eye,emissiveIntensity:L.eyeGlow,roughness:.3}),
 };
}
function mesh(parent,geo,material,name,shadow=true){const m=new THREE.Mesh(geo,material);m.castShadow=shadow;m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export const GHOSTS=['ghost','shade'];
export function createGhost(name='ghost'){
 const kind=name==='shade'?'shade':'ghost',S=geometry(),Mt=materials(kind);
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,Mt.sheet,'body',false);
 const head=new THREE.Group();head.position.set(0,.96,.015);head.rotation.x=.12;body.add(head);
 mesh(head,S.head,Mt.sheet,'head',false);mesh(head,S.face,Mt.face,'face',false);mesh(head,S.eyes,Mt.eye,'eyes',false);
 const arms=[];
 for(const s of [-1,1]){
  const arm=new THREE.Group();arm.position.set(s*.16,.79,.03);arm.rotation.set(ARM_PITCH,0,s*.1);body.add(arm);
  mesh(arm,S.arm,Mt.sheet,'arm',false);arms.push(arm);
 }
 return {g,body,legs:[],tail:null,wings:[],quirk:'hover',arms,arm:arms[1],head,ghost:kind};
}
