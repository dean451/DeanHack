import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const M={
 skin:new THREE.MeshStandardMaterial({color:0xb78f72,roughness:.9}),greenSkin:new THREE.MeshStandardMaterial({color:0x63764b,roughness:.92}),graySkin:new THREE.MeshStandardMaterial({color:0x8b8374,roughness:.9}),fur:new THREE.MeshStandardMaterial({color:0xb98a5b,roughness:.94}),whiteFur:new THREE.MeshStandardMaterial({color:0xd6d2c1,roughness:.9}),
 cloth:new THREE.MeshStandardMaterial({color:0x315b59,roughness:.94}),redCloth:new THREE.MeshStandardMaterial({color:0x743b3c,roughness:.9}),brownCloth:new THREE.MeshStandardMaterial({color:0x68452f,roughness:.92}),blueCloth:new THREE.MeshStandardMaterial({color:0x3d5278,roughness:.9}),
 steel:new THREE.MeshStandardMaterial({color:0x91a8aa,metalness:.76,roughness:.3}),darkSteel:new THREE.MeshStandardMaterial({color:0x39484b,metalness:.7,roughness:.38}),gold:new THREE.MeshStandardMaterial({color:0xb9954d,metalness:.78,roughness:.3}),leather:new THREE.MeshStandardMaterial({color:0x493228,roughness:.9}),beard:new THREE.MeshStandardMaterial({color:0x9a5b35,roughness:.96}),
 deadEye:new THREE.MeshStandardMaterial({color:0xcfe8c0,emissive:0x6fa860,emissiveIntensity:1.2,roughness:.3}),eye:new THREE.MeshStandardMaterial({color:0xffb66b,emissive:0xd95b1e,emissiveIntensity:2.5,roughness:.24}),electric:new THREE.MeshStandardMaterial({color:0x5d91b1,emissive:0x1e91ca,emissiveIntensity:1.8,roughness:.34}),fire:new THREE.MeshStandardMaterial({color:0xff8750,emissive:0xf04a18,emissiveIntensity:4,roughness:.3}),wing:new THREE.MeshStandardMaterial({color:0x4c3032,roughness:.86,side:THREE.DoubleSide}),
};
function part(parent,geometry,material,x=0,y=0,z=0){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function rounded(parent,w,h,d,material,x=0,y=0,z=0,r=.04){return part(parent,new RoundedBoxGeometry(w,h,d,3,r),material,x,y,z);}
function sphere(parent,r,material,x=0,y=0,z=0,sx=1,sy=1,sz=1){const mesh=part(parent,new THREE.SphereGeometry(r,16,12),material,x,y,z);mesh.scale.set(sx,sy,sz);return mesh;}
function cylinder(parent,r1,r2,h,material,x=0,y=0,z=0,segments=12){return part(parent,new THREE.CylinderGeometry(r1,r2,h,segments),material,x,y,z);}
function cone(parent,r,h,material,x=0,y=0,z=0,segments=6){return part(parent,new THREE.ConeGeometry(r,h,segments),material,x,y,z);}
function actor(g,body,legs=[],tail=null,wings=[],quirk='idle'){return {g,body,legs,tail,wings,quirk};}
function eyes(head,material=M.eye,y=0,z=.18,spread=.075){for(const x of [-spread,spread])sphere(head,.026,material,x,y,z);}
function humanoid(kind,o={}){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);const legs=[],wings=[];
 const short=['gnome','kobold','hobbit','imp'].includes(kind),stocky=kind==='orc'||kind==='dwarf'||kind==='bugbear',guard=kind==='guard',shopkeeper=kind==='shopkeeper',undead=kind==='zombie'||kind==='mummy';
 const skin=o.skin||(kind==='orc'?M.greenSkin:kind==='dwarf'?M.graySkin:M.skin);
 const torso=o.cloth||(kind==='orc'||shopkeeper?M.brownCloth:guard?M.steel:M.cloth);
 const headY=short?.87:1.0,shoulderY=short?.7:.8,torsoW=stocky?.46:.42;
 for(const x of [-.13,.13]){const leg=new THREE.Group();leg.position.set(x,.4,0);body.add(leg);rounded(leg,.16,short?.27:stocky?.34:.42,.16,kind==='mummy'?torso:M.darkSteel,0,-.12,0,.035);rounded(leg,.21,.13,.28,kind==='imp'||kind==='kobold'?skin:M.leather,0,-.36,.06,.03);legs.push(leg);}
 rounded(body,torsoW,short?.3:stocky?.4:.48,.3,torso,0,.62,0,.06);sphere(body,short?.18:.22,skin,0,headY,.02,1,1.05,1);
 // arms give every humanoid a readable silhouette; the undead reach forward
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*(torsoW/2+.07),shoulderY,0);body.add(arm);rounded(arm,.11,short?.3:.38,.12,undead?skin:torso,0,short?-.13:-.17,0,.03);sphere(arm,.065,skin,0,short?-.3:-.38,0);if(undead){arm.rotation.x=-1.35;arm.rotation.z=side*.08;}else arm.rotation.z=side*.12;}
 if(undead)body.rotation.x=.14;
 if(kind==='gnome'){const cap=cone(body,.25,.36,o.cap||M.redCloth,0,1.2,.01,8);cap.rotation.z=-.16;sphere(body,.19,M.beard,0,.86,.18,.8,.9,.65);sphere(body,.05,skin,0,.98,.19,1,1,.8);}
 if(kind==='kobold'){const snout=cone(body,.1,.2,skin,0,.83,.24,6);snout.rotation.x=Math.PI/2;sphere(body,.025,M.leather,0,.83,.34);for(const side of [-1,1]){const ear=cone(body,.07,.26,skin,side*.2,.95,-.01,4);ear.rotation.z=-side*1.15;}const spear=rounded(body,.035,.9,.035,M.leather,.34,.62,.2,.01);spear.rotation.x=.15;cone(body,.05,.14,M.darkSteel,.34,1.08,.27,4);}
 if(kind==='hobbit'){sphere(body,.2,M.beard,0,.95,-.02,1,.7,1);for(const side of [-1,1])rounded(body,.14,.06,.26,skin,side*.13,.03,.08,.03);}
 if(kind==='imp'){for(const side of [-1,1]){const horn=cone(body,.04,.16,M.leather,side*.1,1.04,.02,5);horn.rotation.z=-side*.35;const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(side*.34,.2);shape.lineTo(side*.3,-.02);shape.lineTo(side*.18,.04);shape.lineTo(0,-.12);const wing=part(body,new THREE.ShapeGeometry(shape),M.wing,side*.12,.72,-.17);wings.push(wing);}const tail=cone(body,.03,.42,skin,0,.42,-.3,5);tail.rotation.x=-2.1;}
 if(kind==='mummy')for(let i=0;i<6;i++){const wrap=rounded(body,torsoW+.03,.03,.33,M.leather,0,.44+i*.075,0,.012);wrap.rotation.z=(i%2?1:-1)*.12;}
 if(kind==='orc'){for(const x of [-.09,.09]){const tusk=cone(body,.045,.15,M.whiteFur,x,.91,.19,5);tusk.rotation.x=x<0?.35:-.35;}for(const x of [-.31,.31])sphere(body,.16,M.darkSteel,x,.84,0,1,.75,1);}
 // dwarf lords wear a gold-banded helm; dwarf kings trade it for a crown and a cape
 if(kind==='dwarf'&&o.rank==='king'){cylinder(body,.2,.21,.09,M.gold,0,1.16,0,12);for(let i=0;i<6;i++){const a=i/6*Math.PI*2;cone(body,.035,.11,M.gold,Math.sin(a)*.19,1.25,Math.cos(a)*.19,4);}sphere(body,.03,M.fire,0,1.16,.205);const cape=rounded(body,.46,.62,.04,M.redCloth,0,.6,-.19,.02);cape.rotation.x=.08;rounded(body,.5,.06,.1,M.whiteFur,0,.86,-.15,.03);}
 else if(kind==='dwarf'){cylinder(body,.22,.25,.15,M.darkSteel,0,1.17,0,10);if(o.rank==='lord'){cylinder(body,.255,.255,.04,M.gold,0,1.12,0,12);const crest=rounded(body,.04,.1,.3,M.gold,0,1.27,0,.015);crest.rotation.x=.1;}}
 if(kind==='dwarf'){const beard=sphere(body,.2,o.beard||M.beard,0,1.0,.18,.95,1.1,.6);beard.scale.y=1.25;}
 if(kind==='bugbear'){sphere(body,.13,skin,0,.97,.2,.9,.75,.8);sphere(body,.035,M.leather,0,.99,.3);for(const side of [-1,1]){sphere(body,.07,skin,side*.17,1.17,0,1,1,.5);cone(body,.025,.07,M.whiteFur,side*.05,.91,.27,4).rotation.x=Math.PI;}for(const x of [-.25,.25])sphere(body,.14,M.leather,x,.84,0,1,.7,1);}
 if(guard){cylinder(body,.23,.23,.13,M.darkSteel,0,1.19,0,10);const plume=cone(body,.06,.25,M.redCloth,0,1.38,-.01,6);plume.rotation.z=-.12;rounded(body,.48,.07,.32,M.gold,0,.78,0,.02);}
 if(shopkeeper){rounded(body,.19,.26,.07,M.leather,.28,.67,.16,.025);const hat=cylinder(body,.25,.2,.13,M.brownCloth,0,1.2,0,12);hat.rotation.x=.04;}
 eyes(body,kind==='orc'||kind==='imp'||kind==='bugbear'?M.fire:undead?M.deadEye:M.eye,short?.91:1.04,.205,.075);
 if(guard){const spear=rounded(body,.045,.7,.045,M.steel,.36,.7,.24,.01);spear.rotation.z=-.12;cone(body,.07,.14,M.steel,.36,1.1,.24,5).rotation.x=Math.PI;}
 if(kind==='bugbear'){const haft=rounded(body,.045,.5,.045,M.leather,.32,.62,.2,.01);haft.rotation.x=.25;const ball=sphere(body,.08,M.darkSteel,.32,.86,.27);for(const [x,y,z,rx,rz] of [[1,0,0,0,-1],[-1,0,0,0,1],[0,1,0,0,0],[0,0,1,1,0],[0,0,-1,-1,0]]){const spike=cone(ball,.025,.08,M.steel,x*.1,y*.1,z*.1,4);spike.rotation.set(rx*Math.PI/2,0,rz*Math.PI/2);}}
 if(kind==='dwarf'&&o.rank==='king'){const scepter=rounded(body,.04,.62,.04,M.gold,.36,.68,.18,.01);scepter.rotation.z=-.1;sphere(body,.06,M.gold,.39,1.0,.18);}
 else if(kind==='dwarf'){const pick=rounded(body,.045,.55,.045,M.steel,-.38,.67,.18,.01);pick.rotation.z=.55;const head=rounded(body,.26,.05,.05,M.steel,-.38,.94,.18,.01);head.rotation.z=-.2;}
 return actor(g,body,legs,null,wings,kind);
}
function dog(){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);const legs=[];sphere(body,.25,M.fur,0,.31,0,.9,.75,1.4);const head=sphere(body,.19,M.fur,0,.47,.25,.95,1,1);sphere(body,.1,M.leather,0,.43,.4,.8,.65,.7);for(const x of [-.1,.1]){const ear=cone(head,.075,.16,M.fur,x,.16,.01,5);ear.rotation.z=x>0?-.45:.45;eyes(head,M.eye,.02,.16,.06);}for(const x of [-.13,.13])for(const z of [-.18,.18]){const leg=new THREE.Group();leg.position.set(x,.2,z);body.add(leg);rounded(leg,.08,.22,.09,M.fur,0,-.1,0,.025);legs.push(leg);}
 const tail=new THREE.Group();tail.position.set(0,.37,-.27);body.add(tail);const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,.18,-.1),new THREE.Vector3(.1,.32,-.12)]);part(tail,new THREE.TubeGeometry(curve,12,.035,8,false),M.fur);return actor(g,body,legs,tail,[],'dog');
}
function gridBug(){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);const legs=[];sphere(body,.17,M.electric,0,.25,0,.8,.6,1.25);sphere(body,.11,M.darkSteel,0,.27,.16,.9,.72,1);eyes(body,M.electric,.01,.15,.055);
 for(const [x,z] of [[-.16,-.12],[-.19,0],[-.16,.12],[.16,-.12],[.19,0],[.16,.12]]){const leg=new THREE.Group();leg.position.set(x,.25,z);body.add(leg);const limb=rounded(leg,.035,.22,.035,M.darkSteel,0,-.02,x<0?-.08:.08,.01);limb.rotation.z=x<0?-.55:.55;legs.push(leg);}
 for(const x of [-.06,.06]){const antenna=rounded(body,.018,.16,.018,M.electric,x,.39,.19,.005);antenna.rotation.x=x<0?-.28:.28;}
 return actor(g,body,legs,null,[],'gridbug');
}
function unicorn(){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);const legs=[];const mane=new THREE.MeshStandardMaterial({color:0xe2e2ee,roughness:.75});
 sphere(body,.3,M.whiteFur,0,.43,0,.8,.72,1.25);const neck=cylinder(body,.12,.19,.42,M.whiteFur,0,.75,.12,10);neck.rotation.x=-.12;
 const head=new THREE.Group();head.position.set(0,1.0,.24);body.add(head);
 sphere(head,.17,M.whiteFur,0,0,0,.85,.85,1.05);const muzzle=cylinder(head,.055,.095,.22,M.whiteFur,0,-.05,.16,10);muzzle.rotation.x=Math.PI/2;sphere(head,.032,M.leather,0,-.06,.27);
 const horn=cone(head,.05,.32,M.gold,0,.2,.07,5);horn.rotation.z=-.08;for(const x of [-.1,.1]){const ear=cone(head,.055,.15,M.whiteFur,x,.17,0,5);ear.rotation.z=x>0?-.25:.25;}
 eyes(head,M.eye,-.01,.13,.075);
 for(let i=0;i<5;i++){const t=i/4,tuft=cone(body,.03,.12-t*.05,mane,0,.98-t*.18,.16-t*.22,4);tuft.rotation.x=-.3-t*.5;tuft.rotation.z=(i%2?1:-1)*.15;}
 for(const x of [-.13,.13])for(const z of [-.17,.17]){const leg=new THREE.Group();leg.position.set(x,.27,z);body.add(leg);rounded(leg,.09,.34,.1,M.whiteFur,0,-.15,0,.025);rounded(leg,.1,.08,.11,M.gold,0,-.32,0,.02);legs.push(leg);}
 const tail=new THREE.Group();tail.position.set(0,.48,-.3);body.add(tail);
 const tailCurve=new THREE.CatmullRomCurve3([[0,0,0],[0,-.04,-.14],[0,-.16,-.24],[0,-.32,-.3],[0,-.46,-.32]].map(p=>new THREE.Vector3(...p)));
 for(let i=0;i<12;i++){const t=i/11,p=tailCurve.getPoint(t),r=.025+Math.sin(Math.min(1,t*1.1)*Math.PI*.9)*.055;const seg=sphere(tail,Math.max(.012,r),mane,p.x,p.y,p.z);const tan=tailCurve.getTangent(t);seg.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),tan);seg.scale.set(1,1.5,1);}
 return actor(g,body,legs,tail,[],'unicorn');
}
// Golems: an inanimate material animated into a blocky humanoid. Seams mark where
// slabs of the material join; a lit core in the chest and eyes sell "constructed", not "born".
const GOLEM_MATERIALS={
 straw:{color:'#c2a24a',roughness:.98},paper:{color:'#e8ddc0',roughness:.85},wax:{color:'#e0b56a',roughness:.4},
 rope:{color:'#8a6a3a',roughness:.95},gold:{color:'#d9b23a',metalness:.85,roughness:.25},leather:{color:'#5a3c26',roughness:.85},
 wood:{color:'#7a5530',roughness:.88},flesh:{color:'#9a8070',roughness:.8},clay:{color:'#8a5a3e',roughness:.92},
 stone:{color:'#767468',roughness:.92},glass:{color:'#bfe3e0',roughness:.12,metalness:.05,transparent:!0,opacity:.55},
 iron:{color:'#3c4448',metalness:.75,roughness:.35},ice:{color:'#bfe6f2',roughness:.15,transparent:!0,opacity:.72},
 'crystal ice':{color:'#d8f3ff',roughness:.08,transparent:!0,opacity:.68,emissive:'#8fd9ff',emissiveIntensity:.15},
};
function golem(params=GOLEM_MATERIALS.stone){
 const g=new THREE.Group(),torso=new THREE.Group();g.add(torso);const legs=[];
 const body=mat(params.color,params),seam=mat(shade(params.color,.55),{roughness:.95});
 rounded(torso,.5,.58,.34,body,0,.66,0,.05);
 for(let i=0;i<2;i++)rounded(torso,.52,.03,.36,seam,0,.5+i*.32,0,.01);
 rounded(torso,.34,.3,.32,body,0,1.06,0,.04);rounded(torso,.36,.03,.34,seam,0,.92,0,.01);
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.34,.88,0);torso.add(arm);rounded(arm,.15,.5,.16,body,0,-.24,0,.03);rounded(arm,.17,.05,.18,seam,0,-.46,0,.01);}
 for(const x of [-.16,.16]){const leg=new THREE.Group();leg.position.set(x,.4,0);torso.add(leg);rounded(leg,.19,.46,.2,body,0,-.2,0,.04);rounded(leg,.21,.06,.22,seam,0,-.4,.02,.01);legs.push(leg);}
 const core=sphere(torso,.07,M.fire,0,.7,.18);g.userData.core=core;eyes(torso,M.fire,1.06,.16,.07);
 return Object.assign(actor(g,torso,legs,null,[],'golem'),{core});
}
// Giant turtle: a low domed shell over a snapping head and splayed stubby legs.
function turtle(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(o.scale||1);
 const shell=mat(o.shell,{roughness:.7}),shellDark=mat(shade(o.shell,.55)),skin=mat(o.skin||shade(o.shell,1.5));
 const dome=part(body,new THREE.SphereGeometry(.26,16,10,0,Math.PI*2,0,Math.PI/2),shell,0,.22,-.02);dome.scale.set(1.15,.72,1.3);
 for(let i=0;i<7;i++){const a=i*.9;sphere(body,.045,i%2?shellDark:shell,Math.cos(a)*.14,.34,Math.sin(a)*.12-.02,1,.55,1);}
 const head=new THREE.Group();head.position.set(0,.18,.28);body.add(head);sphere(head,.09,skin,0,0,0,.9,.75,1.15);for(const side of [-1,1])sphere(head,.018,darkEye,side*.045,.03,.07);
 for(const side of [-1,1])for(const z of [-.17,.17]){const leg=new THREE.Group();leg.position.set(side*.19,.1,z);body.add(leg);const upper=rounded(leg,.11,.08,.14,skin,side*.05,-.02,0,.02);upper.rotation.z=side*-.3;legs.push(leg);}
 const tail=cone(body,.035,.14,skin,0,.09,-.28,6);tail.rotation.x=Math.PI/2+.3;
 return actor(g,body,legs,null,[],'turtle');
}
function dragon(){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);const legs=[];const scale=1.12;g.scale.setScalar(scale);sphere(body,.34,M.greenSkin,0,.5,0,1.2,.8,1.45);const head=sphere(body,.24,M.greenSkin,0,.84,.28,1.05,.9,1);sphere(body,.13,M.fire,0,.8,.47,.9,.65,.65);for(const x of [-.12,.12]){const horn=cone(head,.07,.25,M.darkSteel,x,.2,.03,5);horn.rotation.z=x>0?.35:-.35;}eyes(head,M.fire,.02,.21,.08);for(const x of [-.22,.22])for(const z of [-.17,.17]){const leg=new THREE.Group();leg.position.set(x,.3,z);body.add(leg);rounded(leg,.13,.3,.14,M.greenSkin,0,-.12,0,.035);cone(leg,.1,.1,M.darkSteel,0,-.28,.02,5).rotation.x=Math.PI;legs.push(leg);}
 const wings=[];for(const x of [-1,1]){const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(x*.55,.15);shape.lineTo(x*.42,.62);shape.lineTo(x*.15,.4);shape.lineTo(0,.12);const wing=part(body,new THREE.ShapeGeometry(shape),M.wing,x*.3,.72,-.02);wing.rotation.y=x>0?.18:-.18;wings.push(wing);}
 const tail=new THREE.Group();tail.position.set(0,.48,-.38);body.add(tail);const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,.08,-.22),new THREE.Vector3(.18,.16,-.46)]);part(tail,new THREE.TubeGeometry(curve,12,.07,8,false),M.greenSkin);const core=sphere(body,.1,M.fire,0,.55,.31);g.userData.core=core;return Object.assign(actor(g,body,legs,tail,wings,'dragon'),{core});
}
function rat(giant=false){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(giant?1.25:.85);
 sphere(body,.22,M.graySkin,0,.24,-.04,1,.85,1.45);
 sphere(body,.16,M.leather,0,.28,.2,.85,.8,1.2);
 sphere(body,.09,M.graySkin,0,.24,.35,.85,.7,1.25);
 sphere(body,.035,M.skin,0,.25,.445,1,.7,.65);
 for(const side of [-1,1]){
  sphere(body,.095,M.graySkin,side*.115,.405,.17,1,1,.38);
  sphere(body,.065,M.skin,side*.115,.41,.201,1,1,.18);
  sphere(body,.023,M.leather,side*.101,.31,.3);
  sphere(body,.009,M.whiteFur,side*.106,.319,.316);
  rounded(body,.024,.05,.022,M.whiteFur,side*.018,.192,.416,.006);
  for(const offset of [-1,0,1]){
   const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.06,.24,.37),new THREE.Vector3(side*.17,.25+offset*.02,.38),new THREE.Vector3(side*.26,.25+offset*.03,.36+offset*.04)]);
   part(body,new THREE.TubeGeometry(curve,5,.003,3,false),M.whiteFur);
  }
  for(const z of [-.19,.17]){const leg=new THREE.Group();leg.position.set(side*.15,.13,z);body.add(leg);sphere(leg,.065,M.graySkin,0,-.02,0,.7,1,.9);rounded(leg,.075,.035,.12,M.skin,0,-.09,.04,.012);legs.push(leg);}
 }
 const tail=new THREE.Group();tail.position.set(0,.22,-.31);body.add(tail);
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(.08,-.12,-.16),new THREE.Vector3(.25,-.17,-.28),new THREE.Vector3(.33,-.16,-.46)]);
 for(let i=0;i<14;i++){const start=curve.getPoint(i/14),end=curve.getPoint((i+1)/14),direction=end.clone().sub(start),radius=.027*(1-i/15);const segment=part(tail,new THREE.CylinderGeometry(radius*.86,radius,direction.length(),8),i%2?M.skin:M.beard);segment.position.copy(start.add(end).multiplyScalar(.5));segment.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());}
 return actor(g,body,legs,tail,[],'rat');
}
// ---- Class-based bestiary: every common monster letter gets its own silhouette ----

const cache=new Map();
function mat(color,options={}){const key=color+JSON.stringify(options);if(!cache.has(key))cache.set(key,new THREE.MeshStandardMaterial({color,roughness:.88,...options}));return cache.get(key);}
// NetHack's 16 terminal colours, pulled toward natural pigments so tints don't look neon.
const NH_COLORS=['#34343c','#a83b2e','#4f8a3a','#8a6440','#3d5fb0','#8a3f8f','#3f9a9a','#8f8f88',null,'#d9782e','#7fbf4f','#d6ac3a','#5f8fe0','#b85cbf','#6fd0d0','#e2ded2'];
function nhColor(cell){return Number.isInteger(cell.color)?NH_COLORS[cell.color]??null:null;}
function shade(hex,k){return '#'+new THREE.Color(hex).multiplyScalar(k).getHexString();}
const nose=mat('#1b1716',{roughness:.5}),darkEye=mat('#0e0c0b',{roughness:.2,metalness:.2});

function tube(parent,points,radius,material,segments=16){return part(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,radius,8,false),material);}

// Jackals, coyotes, foxes, wolves: lean body, tall ears, long muzzle, bushy tail.
function canine(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(o.scale||1);
 const coat=mat(o.coat),back=mat(o.back||shade(o.coat,.55)),belly=mat(o.belly||shade(o.coat,1.45)),legH=o.legH||.3,y=legH+.1;
 sphere(body,.2,coat,0,y,-.03,.72,.7,1.5);sphere(body,.17,coat,0,y+.03,.16,.82,.9,.9);sphere(body,.12,belly,0,y-.07,.14,.75,.6,1.1);sphere(body,.15,back,0,y+.1,-.08,.72,.38,1.3);
 const neck=cylinder(body,.07,.1,.22,coat,0,y+.15,.26,8);neck.rotation.x=.8;
 const head=new THREE.Group();head.position.set(0,y+.26,.34);body.add(head);
 sphere(head,.1,coat,0,0,0,.95,.85,1.05);
 const snoutL=o.snout||.2,snout=cylinder(head,.03,.065,snoutL,coat,0,-.035,.06+snoutL/2,10);snout.rotation.x=Math.PI/2;
 sphere(head,.05,belly,0,-.07,.1,.9,.5,1.5);sphere(head,.03,nose,0,-.03,.06+snoutL,1,.85,1);
 for(const side of [-1,1]){const ear=cone(head,.045,o.ears||.15,coat,side*.055,.11,-.02,4);ear.rotation.z=-side*.28;const inner=cone(head,.025,(o.ears||.15)*.7,belly,side*.055,.1,.0,4);inner.rotation.z=-side*.28;sphere(head,.018,darkEye,side*.05,.025,.08);}
 if(o.horns)for(const side of [-1,1]){const horn=cone(head,.03,.14,mat('#d8cfb8'),side*.08,.1,.02,5);horn.rotation.z=-side*.7;}
 for(const x of [-.085,.085])for(const z of [-.2,.17]){const leg=new THREE.Group();leg.position.set(x,y-.03,z);body.add(leg);rounded(leg,.06,legH,.065,coat,0,-legH/2,0,.02);sphere(leg,.035,o.socks?mat(o.socks):back,0,-legH+.02,.02,1,.7,1.3);legs.push(leg);}
 const tail=new THREE.Group();tail.position.set(0,y+.05,-.28);body.add(tail);
 // bushy tail: a lathe profile swept along a drooping curve, dark (or white) tip
 const tailCurve=new THREE.CatmullRomCurve3([[0,0,0],[0,-.02,-.1],[0,-.1,-.18],[0,-.22,-.23],[0,-.32,-.24]].map(p=>new THREE.Vector3(...p)));
 const bush=o.bushy??.04,samples=12;
 for(let i=0;i<samples;i++){const t=i/(samples-1),p=tailCurve.getPoint(t),r=.03+Math.sin(Math.min(1,t*1.15)*Math.PI*.95)*bush+(t>.8?-.02*(t-.8)/.2:0);
  const seg=sphere(tail,Math.max(.015,r),t>.78&&o.tip?mat(o.tip):coat,p.x,p.y,p.z);const tan=tailCurve.getTangent(t);seg.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),tan);seg.scale.set(1,1.6,1);}
 return actor(g,body,legs,tail,[],o.quirk||'canine');
}
const CANINES={
 jackal:{coat:'#b98b55',back:'#3a3430',belly:'#e4d2ab',tip:'#2a2522',ears:.19,snout:.22,legH:.31},
 werejackal:{coat:'#8a6a4a',back:'#2a2420',belly:'#b9a58a',tip:'#1f1a18',ears:.19,snout:.22,legH:.31},
 coyote:{coat:'#94806a',back:'#5e5246',belly:'#dccfb8',tip:'#2c2825',ears:.17,snout:.21,scale:1.08},
 fox:{coat:'#c9652b',back:'#b0531f',belly:'#f1e7d8',tip:'#f5f0e8',socks:'#1e1a18',ears:.15,snout:.18,legH:.22,scale:.85,bushy:.06},
 wolf:{coat:'#8a8a86',back:'#4f4f4d',belly:'#d5d3cc',tip:'#2b2b2b',ears:.14,snout:.2,legH:.34,scale:1.2,bushy:.05},
 warg:{coat:'#5a524a',back:'#2c2825',belly:'#8a8176',tip:'#1f1c1a',ears:.13,snout:.2,legH:.36,scale:1.4,bushy:.05},
 'hell hound':{coat:'#7a2a20',back:'#2a100c',belly:'#c2562c',tip:'#ff7a2a',ears:.14,snout:.2,legH:.34,scale:1.3},
 rothe:{coat:'#6a4e36',back:'#3e2c1e',belly:'#8d7258',ears:.06,snout:.12,legH:.24,scale:1.1,horns:true,bushy:.01},
};

function feline(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(o.scale||1);
 const coat=mat(o.coat),dark=mat(o.stripe||shade(o.coat,.5)),light=mat(shade(o.coat,1.4)),legH=o.legH||.22,y=legH+.1;
 sphere(body,.18,coat,0,y,0,.75,.72,1.55);sphere(body,.11,light,0,y-.07,.1,.7,.55,1.1);
 for(let i=0;i<(o.stripes??3);i++)rounded(body,.27,.02,.035,dark,0,y+.1,-.12+i*.1,.01);
 const head=new THREE.Group();head.position.set(0,y+.13,.29);body.add(head);
 sphere(head,.11,coat,0,0,0,1.05,.92,.95);sphere(head,.05,light,0,-.035,.085,1.2,.7,.8);sphere(head,.016,nose,0,-.01,.12);
 for(const side of [-1,1]){const ear=cone(head,.045,.1,coat,side*.065,.1,-.01,3);ear.rotation.z=-side*.2;sphere(head,.02,mat(o.eye||'#d6b640',{emissive:o.eye||'#6a5010',emissiveIntensity:.6}),side*.045,.02,.09,1,.8,.6);}
 for(const x of [-.08,.08])for(const z of [-.18,.16]){const leg=new THREE.Group();leg.position.set(x,y-.03,z);body.add(leg);rounded(leg,.055,legH,.06,coat,0,-legH/2,0,.02);legs.push(leg);}
 const tail=new THREE.Group();tail.position.set(0,y+.05,-.26);body.add(tail);tube(tail,[[0,0,0],[0,.1,-.12],[.04,.28,-.16],[.08,.4,-.1]],.028,coat);
 return actor(g,body,legs,tail,[],'feline');
}
const FELINES={kitten:{coat:'#c98f55',scale:.7},housecat:{coat:'#c98f55'},'large cat':{coat:'#c98f55',scale:1.15},jaguar:{coat:'#c79a45',stripe:'#3a2a18',scale:1.4,stripes:5},lynx:{coat:'#a88f70',scale:1.1,ears:.14},panther:{coat:'#26242a',stripe:'#1a181c',scale:1.45,eye:'#9ad04a'},tiger:{coat:'#d17a2a',stripe:'#1e1510',scale:1.6,stripes:6},'displacer beast':{coat:'#3a3450',scale:1.5}};

// Newts, geckos, iguanas, lizards, crocodiles: low splayed body and a long tapering tail.
function lizard(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(o.scale||1);
 const skin=mat(o.skin),belly=mat(o.belly||shade(o.skin,1.3)),spot=mat(o.spot||shade(o.skin,.45));
 sphere(body,.12,skin,0,.13,0,.95,.5,1.9);sphere(body,.08,belly,0,.09,.02,.9,.35,1.7);
 const head=new THREE.Group();head.position.set(0,.14,.27);body.add(head);
 rounded(head,.15,.07,.17,skin,0,0,.03,.03);for(const side of [-1,1])sphere(head,.028,darkEye,side*.065,.04,.02);
 for(let i=0;i<4;i++)sphere(body,.03,spot,((i*37)%3-1)*.04,.19,-.12+i*.08,1,.35,1.2);
 for(const side of [-1,1])for(const z of [-.12,.13]){const leg=new THREE.Group();leg.position.set(side*.1,.13,z);body.add(leg);const upper=rounded(leg,.13,.035,.04,skin,side*.07,-.03,0,.012);upper.rotation.z=side*-.5;rounded(leg,.05,.02,.07,skin,side*.13,-.1,.02,.008);legs.push(leg);}
 const tail=new THREE.Group();tail.position.set(0,.13,-.2);body.add(tail);
 let px=0,pz=0;for(let i=0;i<6;i++){const r=.055*(1-i/7),len=.09;const seg=cylinder(tail,r*.8,r,len,skin,px,-.012*i,pz-len/2,8);seg.rotation.x=Math.PI/2;px+=Math.sin(i*.6)*.012;pz-=len*.95;}
 return actor(g,body,legs,tail,[],'lizard');
}
const LIZARDS={newt:{skin:'#d69a38',belly:'#e9763a',spot:'#5a3a1a',scale:.8},gecko:{skin:'#6f9a45',scale:.8},iguana:{skin:'#7a6a42',scale:1},'baby crocodile':{skin:'#5f6a3a',scale:1},lizard:{skin:'#4f8a3a',scale:1},chameleon:{skin:'#6aa08a',scale:1},crocodile:{skin:'#4f5a32',scale:1.6},salamander:{skin:'#d9582a',belly:'#ffb040',scale:1.4}};

// Cockatrices: a rooster head (comb, wattle, beak) on the same low scaled body and
// tapering tail as lizard() — reads as "petrifying bird-lizard", not another lizard.
function cockatrice(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(o.scale||1);
 const skin=mat(o.skin),belly=mat(o.belly||shade(o.skin,1.3)),comb=mat(o.comb),foot=mat(o.beak);
 sphere(body,.12,skin,0,.15,0,.95,.55,1.75);sphere(body,.08,belly,0,.11,.02,.9,.4,1.6);
 const head=new THREE.Group();head.position.set(0,.2,.26);body.add(head);
 sphere(head,.09,skin,0,0,0,1,.95,1.05);
 const beak=cone(head,.045,.12,foot,0,-.02,.11,5);beak.rotation.x=Math.PI/2;
 for(let i=0;i<3;i++){const wave=cone(head,.02,.1-i*.018,comb,(i-1)*.035,.1,-.02+i*.012,4);wave.rotation.z=(i-1)*.3;}
 sphere(head,.022,comb,0,-.09,.09,1,1.3,.8);
 for(const side of [-1,1])sphere(head,.018,darkEye,side*.06,.02,.06);
 for(const side of [-1,1])for(const z of [-.12,.13]){const leg=new THREE.Group();leg.position.set(side*.1,.15,z);body.add(leg);const upper=rounded(leg,.13,.035,.04,skin,side*.07,-.03,0,.012);upper.rotation.z=side*-.5;rounded(leg,.05,.02,.08,foot,side*.13,-.11,.02,.008);legs.push(leg);}
 for(const side of [-1,1]){const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(side*.17,.06);shape.lineTo(side*.15,-.05);shape.lineTo(0,-.02);const wing=part(body,new THREE.ShapeGeometry(shape),skin,side*.1,.2,-.02);wing.rotation.y=side*.35;}
 const tail=new THREE.Group();tail.position.set(0,.15,-.2);body.add(tail);
 let px=0,pz=0;for(let i=0;i<6;i++){const r=.05*(1-i/7),len=.09;const seg=cylinder(tail,r*.8,r,len,skin,px,-.012*i,pz-len/2,8);seg.rotation.x=Math.PI/2;px+=Math.sin(i*.6)*.012;pz-=len*.95;}
 for(let i=0;i<3;i++){const plume=cone(tail,.025,.1,comb,0,-.06-i*.02,pz-.03-i*.05,4);plume.rotation.x=1.7;}
 return actor(g,body,legs,tail,[],'cockatrice');
}
const COCKATRICES={chickatrice:{skin:'#8a6a3a',comb:'#a8382a',beak:'#d99a3a',scale:.65},cockatrice:{skin:'#c9a83a',comb:'#c8262a',beak:'#e0b23a',scale:.9},pyrolisk:{skin:'#c96a2a',comb:'#e8401a',beak:'#ffae3a',scale:.9}};

// Lichens and molds: stationary crusts and mounds. Mushrooms for shriekers and violet fungi.
function fungus(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 const main=mat(o.color,{roughness:.95}),dark=mat(shade(o.color,.55)),bright=mat(shade(o.color,1.35),{emissive:shade(o.color,.35),emissiveIntensity:.35});
 if(o.form==='lichen'){
  for(let i=0;i<9;i++){const a=i*2.4,r=i?.08+((i*53)%10)/60:0;sphere(body,.09+((i*29)%5)/60,i%3?main:dark,Math.cos(a)*r,.05,Math.sin(a)*r,1,.35,1);}
  for(let i=0;i<5;i++){const a=i*1.3+.4;const cup=cylinder(body,.045,.015,.12,bright,Math.cos(a)*.15,.1,Math.sin(a)*.15,8);cup.rotation.z=Math.cos(a)*.3;}
 } else if(o.form==='mushroom'){
  cylinder(body,.07,.1,.42,mat('#d8cdb5'),0,.21,0,10);
  part(body,new THREE.SphereGeometry(.26,18,10,0,Math.PI*2,0,Math.PI/2),main,0,.4,0).scale.y=.7;
  for(let i=0;i<7;i++){const a=i*.9;sphere(body,.035,mat('#efe6d0'),Math.cos(a)*.15,.52,Math.sin(a)*.15,1,.5,1);}
  if(o.tendrils)for(let i=0;i<4;i++){const a=i*Math.PI/2+.4;tube(body,[[Math.cos(a)*.2,.36,Math.sin(a)*.2],[Math.cos(a)*.34,.2,Math.sin(a)*.34],[Math.cos(a)*.3,.02,Math.sin(a)*.3]],.018,dark,10);}
 } else {
  sphere(body,.24,main,0,.12,0,1,.62,1);
  for(let i=0;i<11;i++){const a=i*2.1,r=.1+(i%3)*.05;sphere(body,.05+(i%4)*.018,i%2?bright:dark,Math.cos(a)*r,.18+((i*7)%3)*.03,Math.sin(a)*r);}
  for(let i=0;i<6;i++){const a=i*1.05;sphere(body,.016,bright,Math.cos(a)*.16,.32+(i%2)*.05,Math.sin(a)*.16);}
 }
 return actor(g,body,[],null,[],'fungus');
}

// Blobs, jellies, puddings: translucent mass with a visible nucleus.
function blob(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 const skin=new THREE.MeshStandardMaterial({color:o.color,emissive:o.color,emissiveIntensity:.18,roughness:.15,transparent:true,opacity:.78});
 sphere(body,.28,skin,0,o.flat?.12:.2,0,1,o.flat?.45:.72,1);sphere(body,.09,mat(shade(o.color,.4)),0,o.flat?.12:.2,0,1,.8,1);
 if(o.flat)for(let i=0;i<6;i++){const a=i*Math.PI/3;tube(body,[[Math.cos(a)*.2,.08,Math.sin(a)*.2],[Math.cos(a)*.34,.03,Math.sin(a)*.34],[Math.cos(a)*.4,.01,Math.sin(a)*.4]],.022,skin,8);}
 else for(let i=0;i<5;i++){const a=i*1.3;sphere(body,.07,skin,Math.cos(a)*.24,.07,Math.sin(a)*.24,1,.6,1);}
 return actor(g,body,[],null,[],'blob');
}

// Gelatinous cube: unlike the other oozes, this one keeps crisp right angles — a
// near-transparent block with half-digested debris suspended inside.
function cube(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 const skin=new THREE.MeshStandardMaterial({color:o.color,emissive:o.color,emissiveIntensity:.14,roughness:.06,transparent:true,opacity:.4,side:THREE.DoubleSide});
 rounded(body,.5,.5,.5,skin,0,.25,0,.045);
 const debris=['#8a6a3a','#b8402e','#d9b23a','#7a7a78','#3f5fa0'];
 for(let i=0;i<7;i++){const a=(i*97%360)*Math.PI/180,r=.09+((i*53)%10)/70;sphere(body,.03+((i*29)%4)/130,mat(debris[i%debris.length],{roughness:.6}),Math.cos(a)*r,.1+((i*7)%5)*.06,Math.sin(a)*r);}
 return actor(g,body,[],null,[],'cube');
}

// Floating eyes: a big eyeball hovering at head height. Easily the most recognisable shape.
function floatingEye(o){
 const g=new THREE.Group(),body=new THREE.Group(),lift=new THREE.Group();g.add(body);body.add(lift);lift.position.y=.58;
 sphere(lift,.24,mat('#ebe6da',{roughness:.3}));
 sphere(lift,.115,mat(o.iris||'#2f6ad0',{roughness:.2,emissive:o.iris||'#2f6ad0',emissiveIntensity:.25}),0,0,.2,1,1,.38);
 sphere(lift,.05,mat('#050505',{roughness:.1}),0,0,.24,1,1,.35);
 for(let i=0;i<6;i++){const a=i*1.05;tube(lift,[[Math.cos(a)*.12,-.18,Math.sin(a)*.12],[Math.cos(a)*.16,-.32,Math.sin(a)*.16],[Math.cos(a)*.12,-.44,Math.sin(a)*.12]],.012,mat('#b98a7a'),8);}
 for(let i=0;i<5;i++){const a=i*1.3-2.6;const vein=rounded(lift,.006,.12,.006,mat('#b8453a'),Math.sin(a)*.2,Math.cos(a)*.08,.1,.002);vein.rotation.z=a;}
 return actor(g,body,[],null,[],'hover');
}

// Shocking spheres: a metallic orb crackling with jagged spikes of electricity,
// deliberately unlike the floating eye's soft iris-and-tendrils look.
function shockingSphere(){
 const g=new THREE.Group(),body=new THREE.Group(),lift=new THREE.Group();g.add(body);body.add(lift);lift.position.y=.58;
 const shell=new THREE.MeshStandardMaterial({color:'#3f4d54',metalness:.6,roughness:.3,emissive:'#2a5a68',emissiveIntensity:.6}),arc=new THREE.MeshStandardMaterial({color:'#bdf3ff',emissive:'#4fd2ff',emissiveIntensity:2.2,roughness:.25});
 const core=sphere(lift,.19,shell);
 for(let i=0;i<8;i++){
  const a=i*1.6,el=Math.sin(i*2.3)*.7,dir=new THREE.Vector3(Math.cos(a)*Math.cos(el),Math.sin(el),Math.sin(a)*Math.cos(el));
  const spike=cone(lift,.032,.22+((i*17)%3)*.03,arc,dir.x*.24,dir.y*.24,dir.z*.24,4);spike.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
 }
 sphere(lift,.22,new THREE.MeshStandardMaterial({color:'#4fd2ff',emissive:'#4fd2ff',emissiveIntensity:.5,transparent:true,opacity:.14,depthWrite:false}));
 g.userData.core=core;return Object.assign(actor(g,body,[],null,[],'hover'),{core});
}

// Yellow/black lights: a glowing mote. Explodes when it touches you, so it should glow.
function wisp(o){
 const g=new THREE.Group(),body=new THREE.Group(),lift=new THREE.Group();g.add(body);body.add(lift);lift.position.y=.55;
 const core=sphere(lift,.12,new THREE.MeshStandardMaterial({color:o.color,emissive:o.color,emissiveIntensity:5,roughness:.2}));
 sphere(lift,.24,new THREE.MeshStandardMaterial({color:o.color,emissive:o.color,emissiveIntensity:1.2,transparent:true,opacity:.28,depthWrite:false}));
 for(let i=0;i<6;i++){const a=i*1.05;sphere(lift,.03,core.material,Math.cos(a)*.3,Math.sin(a*2)*.08,Math.sin(a)*.3);}
 g.userData.core=core;return Object.assign(actor(g,body,[],null,[],'hover'),{core});
}

// Ants, bees: three body segments and six legs; bees add striped abdomen and wings.
function insect(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[],wings=[];g.add(body);g.scale.setScalar(o.scale||1);
 const shell=mat(o.color,{roughness:.45,metalness:.1}),dark=mat('#15130f',{roughness:.4}),y=o.fly?.5:.2;
 sphere(body,.075,o.bee?dark:shell,0,y+.02,.2);sphere(body,.085,o.bee?mat('#5a4020'):shell,0,y,.06,1,.9,1.1);
 const abdomen=sphere(body,.13,shell,0,y+.03,-.15,.9,.85,1.35);abdomen.rotation.x=o.bee?.3:-.25;
 if(o.bee){for(let i=0;i<3;i++)rounded(body,.23-i*.03,.2-i*.03,.035,dark,0,y+.03-i*.03,-.1-i*.07,.08);cone(body,.02,.1,dark,0,y-.04,-.33,5).rotation.x=-2.2;
  for(const side of [-1,1]){const shape=new THREE.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(side*.2,.18,side*.32,.04);shape.quadraticCurveTo(side*.18,-.04,0,0);const wing=part(body,new THREE.ShapeGeometry(shape),mat('#dfeaf0',{transparent:true,opacity:.45,side:THREE.DoubleSide,depthWrite:false}),side*.03,y+.1,.03);wing.rotation.x=-Math.PI/2+.25;wings.push(wing);}}
 for(let i=0;i<2;i++){const side=i?1:-1;tube(body,[[side*.03,y+.07,.26],[side*.09,y+.18,.3],[side*.14,y+.2,.38]],.009,dark,8);}
 for(const side of [-1,1])for(const z of [-.02,.06,.14]){const leg=new THREE.Group();leg.position.set(side*.06,y-.02,z);body.add(leg);tube(leg,[[0,0,0],[side*.12,.07,(z-.06)*.6],o.fly?[side*.16,-.12,(z-.06)*1.2-.04]:[side*.22,-y+.03,(z-.06)*1.6]],.011,dark,8);legs.push(leg);}
 return actor(g,body,legs,null,wings,o.fly?'bee':'insect');
}
const INSECTS={'giant ant':{color:'#6a3f22'},'killer bee':{color:'#d8a92a',bee:true,fly:true,scale:.75},'soldier ant':{color:'#34457a',scale:1.15},'fire ant':{color:'#b03a22'},'giant beetle':{color:'#222028',scale:1.5},'queen bee':{color:'#b98a2a',bee:true,fly:true,scale:1.1}};

function spider(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(o.scale||1);
 const shell=mat(o.color,{roughness:.6}),dark=mat(shade(o.color,.45)),y=.24;
 sphere(body,.1,shell,0,y,.08,1,.8,1.05);sphere(body,.16,shell,0,y+.05,-.14,1,.85,1.2);
 rounded(body,.12,.02,.16,dark,0,y+.19,-.14,.01);
 for(const side of [-1,1])for(const [dx,dy] of [[.03,.02],[.06,.0]])sphere(body,.018,mat('#c81e1e',{emissive:'#ff2a1a',emissiveIntensity:1.5}),side*dx,y+.04+dy,.17);
 for(const side of [-1,1])for(let i=0;i<4;i++){const z=.14-i*.06,spread=(i-1.5)*.35;const leg=new THREE.Group();leg.position.set(side*.07,y,z);body.add(leg);tube(leg,[[0,0,0],[side*.16,.16,Math.sin(spread)*.12],[side*.3,-y+.01,Math.sin(spread)*.3]],.014,dark,10);legs.push(leg);}
 return actor(g,body,legs,null,[],'spider');
}
function centipede(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);
 const shell=mat(o.color,{roughness:.5}),dark=mat(shade(o.color,.4));
 for(let i=0;i<8;i++){const z=.3-i*.085,x=Math.sin(i*.7)*.05;sphere(body,.055-(i>5?(i-5)*.008:0),i%2?shell:mat(shade(o.color,.8)),x,.09,z,1.1,.7,1);for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(x+side*.04,.09,z);body.add(leg);tube(leg,[[0,0,0],[side*.08,.03,0],[side*.13,-.08,.02]],.008,dark,6);legs.push(leg);}}
 for(const side of [-1,1])tube(body,[[side*.02,.12,.34],[side*.08,.2,.44],[side*.14,.2,.5]],.007,dark,6);
 return actor(g,body,legs,null,[],'insect');
}

// Bats: big scalloped wings and ears. Wings flap in live.js via the 'bat' quirk.
function bat(o){
 const g=new THREE.Group(),body=new THREE.Group(),lift=new THREE.Group(),wings=[];g.add(body);body.add(lift);lift.position.y=.62;g.scale.setScalar(o.scale||1);
 const fur=mat(o.color),membrane=mat(shade(o.color,.6),{side:THREE.DoubleSide,roughness:.8});
 sphere(lift,.085,fur,0,0,0,1,1.15,.9);sphere(lift,.065,fur,0,.08,.05);
 for(const side of [-1,1]){const ear=cone(lift,.03,.1,fur,side*.035,.16,.04,4);ear.rotation.z=-side*.3;sphere(lift,.012,mat('#ff5a3a',{emissive:'#ff3a1a',emissiveIntensity:2}),side*.025,.09,.105);
  const shape=new THREE.Shape();shape.moveTo(0,.05);shape.lineTo(side*.2,.14);shape.lineTo(side*.42,.08);shape.quadraticCurveTo(side*.36,-.02,side*.3,-.08);shape.quadraticCurveTo(side*.22,-.02,side*.16,-.1);shape.quadraticCurveTo(side*.08,-.04,0,-.06);
  const pivot=new THREE.Group();pivot.position.set(side*.05,.02,0);lift.add(pivot);part(pivot,new THREE.ShapeGeometry(shape),membrane);pivot.userData.side=side;wings.push(pivot);}
 return actor(g,body,[],null,wings,'bat');
}

function snake(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);
 const skin=mat(o.color,{roughness:.55}),belly=mat(o.belly||shade(o.color,1.5)),coil=[];
 for(let i=0;i<=28;i++){const t=i/28,a=t*Math.PI*3.6,r=.24-t*.13;coil.push([Math.cos(a)*r,.05+t*.1,Math.sin(a)*r]);}
 coil.push([0,.3,.06],[0,.42,.14]);
 tube(body,coil,.045,skin,64);
 const head=new THREE.Group();head.position.set(0,.44,.18);body.add(head);
 sphere(head,.065,skin,0,0,0,1,.6,1.35);sphere(head,.04,belly,0,-.02,.03,1,.4,1.3);
 if(o.hood)sphere(head,.13,skin,0,-.08,-.06,1.2,1,.25);
 for(const side of [-1,1])sphere(head,.016,mat('#e0b020',{emissive:'#6a4a00',emissiveIntensity:.8}),side*.04,.02,.05);
 const tongue=rounded(head,.012,.004,.12,mat('#c0282a'),0,-.01,.12,.002);tongue.rotation.x=.2;
 return actor(g,body,[],null,[],'snake');
}
const SNAKES={'garter snake':{color:'#3f7a34',belly:'#d6c84a',scale:.75},snake:{color:'#7a5a34'},'water moccasin':{color:'#5a3228'},'pit viper':{color:'#3a5a8a'},python:{color:'#7a5a7a',scale:1.4},cobra:{color:'#3a4a7a',hood:true}};

// Long worms and purple worms: a ringed body that surfaces from the floor in an arch,
// with the forward half as a swaying 'tail' group (live.js already sways actor.tail)
// so the head weaves without any renderer changes. The mouth is a round lamprey maw.
function worm(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);
 const skin=mat(o.color,{roughness:.62}),ring=mat(shade(o.color,.62),{roughness:.7}),belly=mat(shade(o.color,1.35),{roughness:.7});
 const r=o.baby?.07:.1,mound=mat('#3a3128',{roughness:1});
 // loose soil where the rear of the worm dives under the floor
 for(const [x,z,s] of [[-.08,-.34,1],[.07,-.38,.8],[0,-.3,.7]])sphere(body,.08*s,mound,x,.01,z,1.4,.35,1.2);
 // rear arch: segments rising out of the ground toward the neck
 const rear=[[0,-.02,-.34],[0,.12,-.28],[0,.2,-.16],[0,.2,-.04]];
 for(const [i,[x,y,z]] of rear.entries()){const k=1-i*.04;sphere(body,r*k,skin,x,y,z,1,.95,.9);const band=part(body,new THREE.TorusGeometry(r*k*.97,r*.13,6,16),ring,x,y,z);band.rotation.x=Math.PI/2-(i<2?.9:.3);}
 // forward half pivots at the neck; this is the group that sways
 const neck=new THREE.Group();neck.position.set(0,.2,.02);body.add(neck);
 const fore=[[0,.01,.07],[0,.05,.15],[0,.11,.21]];
 for(const [i,[x,y,z]] of fore.entries()){const k=.98-i*.03;sphere(neck,r*k,skin,x,y,z,1,.95,.9);sphere(neck,r*k*.7,belly,x,y-r*.35,z+.01,1,.5,.9);const band=part(neck,new THREE.TorusGeometry(r*k*.97,r*.13,6,16),ring,x,y,z);band.rotation.x=Math.PI/2+.5+i*.2;}
 // head: blunt cap turned forward with a dark round maw ringed by teeth
 const head=new THREE.Group();head.position.set(0,.19,.27);head.rotation.x=-.55;neck.add(head);
 sphere(head,r*1.05,skin,0,0,0,1,1,.8);
 cylinder(head,r*.62,r*.62,.02,mat('#1a0c0c',{roughness:1}),0,0,r*.72,16).rotation.x=Math.PI/2;
 part(head,new THREE.TorusGeometry(r*.66,r*.12,6,18),mat(o.lip||'#8a3a3a',{roughness:.5}),0,0,r*.74);
 const toothMat=mat('#e8e0c8',{roughness:.35});const teeth=o.baby?6:10;
 for(let i=0;i<teeth;i++){const a=i/teeth*Math.PI*2;cone(head,r*.08,r*.3,toothMat,Math.cos(a)*r*.52,Math.sin(a)*r*.52,r*.76,4).rotation.z=a+Math.PI/2;}
 return actor(g,body,[],neck,[],'worm');
}
// Long worm tail segments arrive as their own monster cells ("long worm tail", glyph ~).
// Each one is a ringed hump arching in and out of the floor, so a trail of them reads as
// one body weaving through the ground behind the head.
function wormTail(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 const skin=mat(o.color,{roughness:.62}),ring=mat(shade(o.color,.62),{roughness:.7}),mound=mat('#3a3128',{roughness:1}),r=.09;
 const arch=[];for(let i=0;i<=8;i++){const a=i/8*Math.PI;arch.push([0,Math.sin(a)*.2-.03,-Math.cos(a)*.3]);}
 tube(body,arch,r,skin,24);
 for(let i=1;i<8;i+=1.5){const a=i/8*Math.PI;const band=part(body,new THREE.TorusGeometry(r*1.02,r*.13,6,16),ring,0,Math.sin(a)*.2-.03,-Math.cos(a)*.3);band.rotation.x=a-Math.PI/2;}
 for(const z of [-.3,.3])for(const [dx,dz,s] of [[-.07,-.04,1],[.07,.03,.8],[0,.06,.6]])sphere(body,.07*s,mound,dx,.01,z+dz,1.4,.35,1.2);
 return actor(g,body,[],null,[],'worm');
}
// piercers (p): a ridged stalactite that has dropped point-up onto the floor, with a lurking face and a lipless mouth slit near its base and loose rubble around it
function piercer(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);const s=o.scale||1;
 const hide=o.glass?new THREE.MeshStandardMaterial({color:o.color,transparent:true,opacity:.55,roughness:.08,metalness:.1}):mat(o.color,o.metal?{roughness:.35,metalness:.7}:{roughness:.95});
 const pts=[];for(let i=0;i<=10;i++){const t=i/10;pts.push(new THREE.Vector2((.25*(1-t)**1.25+.012)*(1+(i%2)*.06)*s,t*.82*s));}
 const spire=part(body,new THREE.LatheGeometry(pts,9),hide);spire.rotation.z=.05;
 for(const [y,r] of [[.2,.2],[.4,.14],[.58,.08]])part(body,new THREE.TorusGeometry(r*s,.016*s,5,12),mat(shade(o.color,.7),o.metal?{metalness:.6,roughness:.4}:{}),0,y*s,0).rotation.x=Math.PI/2;
 part(body,new THREE.TorusGeometry(.1*s,.018*s,6,12,Math.PI),mat('#1a1210'),0,.13*s,.21*s).rotation.z=Math.PI;
 eyes(body,M.eye,.27*s,.17*s,.06*s);
 const rubble=mat(shade(o.color,.55));for(let i=0;i<6;i++){const a=i*1.1+.4,r=(.28+(i%3)*.04)*s;sphere(g,(.035+(i%2)*.015)*s,rubble,Math.cos(a)*r,.02,Math.sin(a)*r,1.2,.6,1);}
 return actor(g,body,[],null,[],'idle');
}
const PIERCERS={piercer:{color:'#8a8478'},'iron piercer':{color:'#5f7c86',metal:true,scale:1.15},'glass piercer':{color:'#d8eef4',glass:true,scale:1.25}};
// apelike creatures (Y): a hunched, barrel-chested body on short bowed legs, with long arms knuckling the floor in front,
// a heavy brow over a pale muzzle; monkeys get a curled tail, owlbears a hooked beak and ear tufts, yeti and sasquatch shaggy shoulders
function ape(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[];
 const fur=mat(o.fur,{roughness:.97}),dark=mat(shade(o.fur,.6),{roughness:.97}),face=mat(o.face||shade(o.fur,1.35),{roughness:.8});
 const torso=sphere(body,.24,fur,0,.55,-.02,1.05,1.05,.9);torso.rotation.x=.35;sphere(body,.15,face,0,.56,.13,1.05,1.1,.45);
 for(const side of [-1,1])sphere(body,.13,o.shaggy?mat(shade(o.fur,1.12),{roughness:1}):fur,side*.17,.7,.04,1,.8,1);
 const head=new THREE.Group();head.position.set(0,.82,.17);body.add(head);
 sphere(head,.14,fur,0,0,0,1,.95,.95);rounded(head,.22,.05,.07,dark,0,.05,.1,.02);
 if(o.beak){const beak=cone(head,.06,.14,mat('#3a3028',{roughness:.4}),0,-.03,.16,6);beak.rotation.x=Math.PI/2+.5;for(const side of [-1,1]){const tuft=cone(head,.035,.12,dark,side*.09,.14,0,4);tuft.rotation.z=-side*.3;}sphere(head,.1,face,0,0,.07,1.3,1,.6);}
 else{sphere(head,.08,face,0,-.05,.11,1.1,.85,.8);sphere(head,.014,nose,-.022,-.03,.18);sphere(head,.014,nose,.022,-.03,.18);if(o.fangs)for(const side of [-1,1])cone(head,.012,.045,M.whiteFur,side*.03,-.11,.16,4).rotation.x=Math.PI;for(const side of [-1,1])sphere(head,.04,face,side*.14,.01,-.01,.5,1,.8);}
 eyes(head,o.glare?M.eye:darkEye,.015,.12,.05);
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.25,.68,.06);body.add(arm);rounded(arm,.1,.3,.11,fur,0,-.14,0,.04);rounded(arm,.09,.3,.1,fur,0,-.4,.05,.035).rotation.x=-.2;sphere(arm,.065,o.beak?dark:face,0,-.57,.08,1,.8,1.1);if(o.beak)for(let k=-1;k<=1;k++)cone(arm,.012,.05,M.whiteFur,k*.03,-.6,.15,4).rotation.x=Math.PI/2;arm.rotation.x=-.18;arm.rotation.z=side*.06;}
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.13,.32,-.1);body.add(leg);const thigh=rounded(leg,.12,.24,.13,fur,0,-.1,0,.045);thigh.rotation.z=side*.12;rounded(leg,.12,.06,.18,o.beak?dark:face,side*.02,-.26,.04,.025);legs.push(leg);}
 let tail=null;if(o.tail){tail=new THREE.Group();tail.position.set(0,.4,-.2);body.add(tail);tube(tail,[[0,0,0],[0,-.08,-.14],[0,.02,-.28],[0,.2,-.3],[0,.26,-.2],[0,.18,-.16]],.022,fur,20);}
 return actor(g,body,legs,tail,[],'idle');
}
const APES={monkey:{fur:'#8a6440',face:'#d6b08a',tail:true,scale:.7},ape:{fur:'#5a4030',face:'#a88a70'},owlbear:{fur:'#7a5a38',face:'#c8a878',beak:true,scale:1.2},yeti:{fur:'#e4e2da',face:'#8aa0b0',shaggy:true,glare:true,scale:1.3},'carnivorous ape':{fur:'#2e2622',face:'#7a5a50',fangs:true,glare:true,scale:1.1},sasquatch:{fur:'#4a3424',face:'#8a6a58',shaggy:true,scale:1.35}};
// mimics (m): a banded wooden treasure chest whose lid has cracked open on a row of fangs and a lolling tongue,
// with a single eye peering out of the lid and stubby pseudopods where its feet should be
function mimic(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);
 const wood=mat(o.color,{roughness:.9}),band=mat('#4a4a4e',{roughness:.45,metalness:.65}),flesh=mat('#8a2a38',{roughness:.6}),gum=mat('#5a1622',{roughness:.7}),tooth=mat('#ece4cc',{roughness:.4});
 rounded(body,.5,.26,.36,wood,0,.2,0,.03);part(body,new THREE.BoxGeometry(.44,.02,.3),gum,0,.33,0);
 for(const x of [-.17,.17])rounded(body,.05,.27,.37,band,x,.2,0,.012);
 const lid=new THREE.Group();lid.position.set(0,.33,-.18);lid.rotation.x=-.42;body.add(lid);
 const top=part(lid,new THREE.CylinderGeometry(.18,.18,.5,12,1,false,0,Math.PI),wood,0,0,.18);top.rotation.z=Math.PI/2;top.scale.set(.55,1,1);
 for(const x of [-.17,.17]){const hoop=part(lid,new THREE.CylinderGeometry(.185,.185,.05,12,1,true,0,Math.PI),band,x,0,.18);hoop.rotation.z=Math.PI/2;hoop.scale.set(.57,1,1);}
 for(let i=0;i<7;i++){const x=-.2+i*.066;cone(lid,.022,.07,tooth,x,-.03,.34,4).rotation.x=Math.PI;cone(body,.02,.06,tooth,x+.033*(i<6?1:-1),.36,.16,4);}
 const lock=rounded(body,.07,.08,.03,mat('#c9a23a',{roughness:.3,metalness:.8}),0,.26,.19,.01);lock.castShadow=false;
 sphere(lid,.06,mat('#e8e0c8',{roughness:.3}),0,.08,.3,1,1,.6);sphere(lid,.03,o.glare?M.eye:mat('#1a1410'),0,.08,.33,1,1,.5);
 const tail=new THREE.Group();tail.position.set(0,.33,.12);body.add(tail);tube(tail,[[0,0,0],[0,.01,.08],[.02,-.03,.15],[.03,-.12,.19],[.02,-.2,.2]],.035,flesh,14);
 for(const [x,z] of [[-.19,.12],[.19,.12],[-.19,-.12],[.19,-.12]])sphere(body,.05,mat(shade(o.color,.7),{roughness:.8}),x,.05,z,1.2,.8,1.2);
 return actor(g,body,[],tail,[],'idle');
}
const MIMICS={'small mimic':{color:'#8a5a32',scale:.8},'large mimic':{color:'#7a4a2a',glare:true},'giant mimic':{color:'#6a3a22',glare:true,scale:1.25}};
// centaurs (C): a horse's barrel on four hooved legs with a human torso rising from the withers, arms at the sides and a flowing tail;
// plains centaurs carry a spear, forest centaurs a longbow and quiver, mountain centaurs a fur mantle and a club
function centaur(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[];
 const coat=mat(o.coat,{roughness:.85}),dark=mat(shade(o.coat,.55),{roughness:.9}),skin=mat(o.skin||'#d2a47c',{roughness:.75}),hair=mat(o.hair,{roughness:.9}),hoof=mat('#2a2420',{roughness:.6}),wood=mat('#6a4a2a',{roughness:.8});
 sphere(body,.24,coat,0,.44,-.06,.8,.72,1.25);
 for(const x of [-.12,.12])for(const z of [-.24,.14]){const leg=new THREE.Group();leg.position.set(x,.3,z);body.add(leg);rounded(leg,.08,.26,.09,coat,0,-.12,0,.025);rounded(leg,.085,.06,.1,hoof,0,-.27,.01,.02);legs.push(leg);}
 sphere(body,.13,skin,0,.66,.18,1,1.1,.8);
 rounded(body,.26,.3,.17,o.tunic?mat(o.tunic,{roughness:.8}):skin,0,.8,.2,.06);
 if(o.mantle)sphere(body,.17,mat(o.mantle,{roughness:1}),0,.93,.19,1.25,.55,.95);
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.16,.92,.2);body.add(arm);rounded(arm,.075,.3,.08,skin,0,-.14,0,.03);sphere(arm,.045,skin,0,-.3,.01);arm.rotation.z=side*.14;arm.rotation.x=-.2;}
 const head=new THREE.Group();head.position.set(0,1.07,.22);body.add(head);sphere(head,.12,skin,0,0,0,.9,1.05,.95);
 const locks=sphere(head,.13,hair,0,.04,-.04,.95,.9,.95);locks.rotation.x=.2;cone(head,.07,.22,hair,0,-.1,-.08,6).rotation.x=Math.PI+.25;
 if(o.beard)sphere(head,.08,hair,0,-.1,.08,.9,1.1,.6);
 eyes(head,M.eye,.01,.105,.045);
 if(o.weapon==='spear'){const shaft=rounded(body,.03,1.0,.03,wood,.24,.78,.28,.01);shaft.rotation.x=.12;cone(body,.045,.13,M.steel,.24,1.3,.34,4);}
 if(o.weapon==='bow'){const bow=part(body,new THREE.TorusGeometry(.22,.014,5,16,Math.PI*.8),wood,-.22,.82,.16);bow.rotation.z=Math.PI/2+Math.PI*.1;bow.rotation.y=Math.PI/2;cylinder(body,.045,.045,.3,mat('#5a3a22',{roughness:.8}),.1,.9,.06,8).rotation.z=-.4;for(const dx of [-.02,.02])cone(body,.02,.05,mat('#d8d0b8'),.16+dx,1.06,.06,3);}
 if(o.weapon==='club'){const club=cylinder(body,.06,.025,.4,wood,.24,.74,.26,7);club.rotation.x=.25;}
 const tail=new THREE.Group();tail.position.set(0,.5,-.3);body.add(tail);tube(tail,[[0,0,0],[0,-.05,-.08],[0,-.16,-.12],[0,-.28,-.1]],.035,hair,12);
 return actor(g,body,legs,tail,[],'unicorn');
}
const CENTAURS={'plains centaur':{coat:'#a8804a',hair:'#4a3020',tunic:'#6a8aa0',weapon:'spear'},'forest centaur':{coat:'#5a3c24',hair:'#2a1a10',tunic:'#3f6a34',weapon:'bow',scale:1.05},'mountain centaur':{coat:'#7a7670',hair:'#3a3632',mantle:'#8a7058',beard:true,weapon:'club',scale:1.08}};
// giants (H): a towering, broad-shouldered brute in a hide kilt and belt, with thick legs in wrapped boots and heavy fists;
// hill giants swing clubs, stone giants shoulder a boulder, fire giants have a smouldering beard and a sword, frost giants
// an icy mantle and an axe, storm giants a lightning-tipped spear, titans gilded armour; ettins have two heads, minotaurs a bull's
function giant(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[],arms=[];
 const skin=mat(o.skin,{roughness:.85}),cloth=mat(o.cloth||'#6a5a40',{roughness:.95}),hair=o.hair==='fire'?mat('#ff7a2a',{emissive:'#e0400e',emissiveIntensity:2.2,roughness:.5}):mat(o.hair||'#3a2a1c',{roughness:.95}),wood=mat('#5a3e24',{roughness:.85}),boot=mat(o.boot||'#3a2a20',{roughness:.9});
 const armor=o.armor?mat(o.armor,{roughness:.35,metalness:.7}):null;
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.11,.48,0);body.add(leg);rounded(leg,.14,.3,.15,o.bull?mat(shade(o.skin,.8),{roughness:.97}):skin,0,-.13,0,.05);rounded(leg,.17,.14,.22,boot,0,-.41,.03,.04);if(o.bull)cone(leg,.07,.06,mat('#1e1a18',{roughness:.5}),0,-.44,.03,6);legs.push(leg);}
 cylinder(body,.2,.25,.22,cloth,0,.5,0,9);rounded(body,.42,.06,.28,M.leather,0,.62,0,.02);rounded(body,.07,.06,.03,M.gold,0,.62,.145,.01).castShadow=false;
 rounded(body,.44,.4,.28,armor||(o.tunic?mat(o.tunic,{roughness:.9}):skin),0,.83,0,.1);sphere(body,.12,skin,0,.9,.1,1.5,.9,.5);
 for(const side of [-1,1])sphere(body,.1,armor||skin,side*.2,1.0,0,1,.8,1);
 if(o.mantle)sphere(body,.2,mat(o.mantle,{roughness:1}),0,1.02,-.02,1.35,.45,1);
 if(o.ice)for(const side of [-1,1])for(const k of [0,1]){const shard=cone(body,.035,.16,mat('#cfeaf6',{roughness:.15,transparent:true,opacity:.85}),side*(.18+k*.06),1.1-k*.03,-.04,4);shard.rotation.z=-side*(.35+k*.3);}
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.26,.98,.01);body.add(arm);rounded(arm,.12,.28,.13,skin,0,-.14,0,.045);rounded(arm,.11,.26,.12,armor||skin,0,-.39,.02,.04);sphere(arm,.07,skin,0,-.56,.03);arm.rotation.z=side*.05;arm.rotation.x=side>0&&o.weapon?-.35:-.08;arms.push(arm);}
 const heads=o.twoHeads?[-.11,.11]:[0];
 for(const hx of heads){const head=new THREE.Group();head.position.set(hx,1.16,.03);head.rotation.z=-hx*1.2;body.add(head);
  if(o.bull){sphere(head,.12,skin,0,0,0,1,.95,1.05);sphere(head,.08,mat(shade(o.skin,1.3),{roughness:.8}),0,-.04,.11,1.05,.8,1);for(const side of [-1,1]){sphere(head,.012,nose,side*.03,-.03,.18);const horn=tube(head,[[side*.08,.06,0],[side*.17,.08,0],[side*.22,.15,.03]],.022,mat('#e0d4b4',{roughness:.5}),8);horn.castShadow=false;}}
  else{sphere(head,.12,skin,0,0,0,.95,1.05,.95);rounded(head,.2,.04,.06,mat(shade(o.skin,.8),{roughness:.9}),0,.04,.09,.015);sphere(head,.028,skin,0,-.01,.12,1,1.2,1);
   const scalp=sphere(head,.125,hair,0,.035,-.03,1,.85,1);scalp.rotation.x=.25;if(o.beard)sphere(head,.09,hair,0,-.09,.07,1,1.2,.65);}
  if(o.circlet)part(head,new THREE.TorusGeometry(.12,.012,5,16),M.gold,0,.07,0).rotation.x=Math.PI/2;
  eyes(head,o.glare||M.eye,.01,.11,.045);}
 let core=null;
 if(o.weapon==='club'){const club=cylinder(body,.075,.03,.46,wood,.28,.46,.2,7);club.rotation.x=.55;for(let i=0;i<3;i++)cone(body,.02,.05,M.darkSteel,.28+(i-1)*.05,.6,.3,4).rotation.x=.55;}
 if(o.weapon==='boulder'){part(body,new THREE.DodecahedronGeometry(.14,0),mat('#6f6a62',{roughness:1}),-.24,1.24,-.22).rotation.set(.4,.3,.2);arms[0].rotation.set(2.5,0,.1);}
 if(o.weapon==='sword'){const blade=rounded(body,.05,.5,.015,mat('#d8a070',{emissive:'#c0501a',emissiveIntensity:.9,roughness:.3,metalness:.7}),.3,.56,.28,.01);blade.rotation.x=.55;rounded(body,.14,.03,.04,M.gold,.3,.37,.18,.01);}
 if(o.weapon==='axe'||o.weapon==='axe2'){const shaft=cylinder(body,.02,.02,.6,wood,.29,.5,.16,6);shaft.rotation.x=.3;const bit=part(body,new THREE.CylinderGeometry(.1,.1,.018,10,1,false,0,Math.PI),o.weapon==='axe'?mat('#b8dcea',{roughness:.2,metalness:.4}):M.steel,.29,.74,.23);bit.rotation.set(.3,0,Math.PI/2);}
 if(o.weapon==='spear'){const shaft=cylinder(body,.018,.018,.95,wood,.29,.6,.18,6);shaft.rotation.x=.2;core=cone(body,.04,.12,new THREE.MeshStandardMaterial({color:'#bfe6ff',emissive:'#3aa0ff',emissiveIntensity:4.5,roughness:.2}),.29,1.1,.28,4);core.rotation.x=.2;g.userData.core=core;}
 if(o.hair==='fire'&&!core){core=sphere(body,.05,new THREE.MeshStandardMaterial({color:'#ffb060',emissive:'#f05010',emissiveIntensity:4.5,roughness:.3}),0,1.08,.13);g.userData.core=core;}
 return Object.assign(actor(g,body,legs,null,[],'orc'),core?{core}:{});
}
const GIANTS={giant:{skin:'#b08a6a',cloth:'#6a5a40',weapon:'club',scale:1.1},'stone giant':{skin:'#8a867c',cloth:'#5a5650',hair:'#4a4642',weapon:'boulder',scale:1.05},'hill giant':{skin:'#a88060',cloth:'#5a6a3a',hair:'#5a3a22',beard:true,weapon:'club',scale:1.12},'fire giant':{skin:'#6a4234',cloth:'#3a2a24',hair:'fire',beard:true,armor:'#3a3436',boot:'#2a2424',weapon:'sword',glare:M.fire,scale:1.18},'frost giant':{skin:'#a8c0d0',cloth:'#4a5a6a',hair:'#eef2f4',beard:true,mantle:'#e2e2dc',ice:true,weapon:'axe',scale:1.18},ettin:{skin:'#8a7a6a',cloth:'#4a3a2a',hair:'#2a2420',twoHeads:true,weapon:'club',scale:1.18},'storm giant':{skin:'#9aa4b4',cloth:'#2e4a78',tunic:'#3d5f9a',hair:'#1e2230',beard:true,weapon:'spear',glare:M.electric,scale:1.2},titan:{skin:'#d8b890',cloth:'#e8e0cc',hair:'#c9a23a',armor:'#c9a23a',circlet:true,glare:M.eye,weapon:'spear',scale:1.22},minotaur:{skin:'#5a3a24',cloth:'#3a2a1c',bull:true,weapon:'axe2',scale:1.15}};
// vortices (v): a tapering funnel of tilted, offset swirl rings over a scuffed ground patch, with debris caught in the spiral; fog clouds are a low puffy bank instead
function vortex(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);const s=o.scale||1;
 const glow=!!o.glow,swirl=new THREE.MeshStandardMaterial({color:o.color,emissive:glow?o.color:'#000000',emissiveIntensity:glow?1.4:0,transparent:true,opacity:o.opacity||.55,roughness:.6,depthWrite:false,side:THREE.DoubleSide});
 const ground=part(g,new THREE.CircleGeometry(.3*s,20),mat(shade(o.color,.45),{transparent:true,opacity:.4,depthWrite:false}),0,.012,0);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
 if(o.cloud){for(let i=0;i<9;i++){const a=i*2.4,r=i?.2*s:0;sphere(body,(.17-(i%3)*.025)*s,swirl,Math.cos(a)*r,(.3+(i%2)*.1)*s,Math.sin(a)*r,1.1,.75,1.1);}}
 else for(let i=0;i<7;i++){const t=i/6,ring=part(body,new THREE.TorusGeometry((.07+t*.22)*s,(.028+t*.02)*s,6,20),swirl,Math.sin(i*1.3)*.04*s,(.08+t*.72)*s,Math.cos(i*1.3)*.04*s);ring.rotation.x=Math.PI/2+Math.sin(i*1.9)*.22;ring.rotation.y=i*.7;ring.castShadow=false;}
 const debris=o.debris?mat(o.debris,glow?{emissive:o.debris,emissiveIntensity:3}:{}):null;
 if(debris)for(let i=0;i<8;i++){const t=i/7,a=i*2.2,r=(.1+t*.24)*s;const bit=o.shard?cone(body,.025*s,.08*s,debris,Math.cos(a)*r,(.12+t*.66)*s,Math.sin(a)*r,4):sphere(body,.022*s,debris,Math.cos(a)*r,(.12+t*.66)*s,Math.sin(a)*r);bit.rotation.set(a,a*.5,0);}
 let core=null;if(glow){core=sphere(body,.07*s,new THREE.MeshStandardMaterial({color:o.debris||o.color,emissive:o.debris||o.color,emissiveIntensity:4.5,roughness:.2}),0,.32*s,0,.8,1.6,.8);g.userData.core=core;}
 return Object.assign(actor(g,body,[],null,[],'hover'),core?{core}:{});
}
const VORTICES={'fog cloud':{color:'#b4b8bc',cloud:true,opacity:.6},'dust vortex':{color:'#9a7a52',debris:'#6a5038'},'ice vortex':{color:'#bfe6f4',debris:'#e8f8ff',shard:true},'energy vortex':{color:'#4f8cff',debris:'#d8f0ff',glow:true,scale:1.1},'steam vortex':{color:'#d4dce4',opacity:.42,scale:1.1},'fire vortex':{color:'#ff7a28',debris:'#ffd24a',glow:true,scale:1.1}};
const WORMS={'baby long worm':{color:'#8a6440',baby:true,scale:.8},'long worm':{color:'#8a6440',scale:1.25},'baby purple worm':{color:'#8a3a9a',lip:'#c05a8a',baby:true,scale:.9},'purple worm':{color:'#8a3a9a',lip:'#c05a8a',scale:1.7}};

// Nymphs: a slender, glamorous humanoid built for a clear silhouette — a flared dress
// and flowing hair read at a glance, unlike the blocky torso of the generic humanoid.
function nymph(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);const legs=[];
 const skin=mat(o.skin),dress=mat(o.dress,{roughness:.5}),hair=mat(o.hair,{roughness:.85});
 for(const x of [-.08,.08]){const leg=new THREE.Group();leg.position.set(x,.38,0);body.add(leg);rounded(leg,.08,.36,.08,skin,0,-.18,0,.03);legs.push(leg);}
 cone(body,.3,.5,dress,0,.46,0,12);
 rounded(body,.3,.34,.22,dress,0,.86,0,.07);
 for(const side of [-1,1]){sphere(body,.09,skin,side*.19,.98,0,.55,.7,.55);const arm=new THREE.Group();arm.position.set(side*.19,.98,0);body.add(arm);rounded(arm,.06,.3,.06,skin,0,-.16,0,.025);arm.rotation.z=side*.1;}
 sphere(body,.15,skin,0,1.12,.015,.85,.95,.8);
 const mane=sphere(body,.17,hair,0,1.14,-.06,.9,1,.9);mane.rotation.x=.08;
 for(let i=0;i<3;i++){const strand=cone(body,.03-i*.006,.3+i*.08,hair,(i-1)*.06,.96-i*.02,-.14-i*.02,4);strand.rotation.x=2.7+i*.05;}
 eyes(body,M.eye,1.12,.135,.05);
 return actor(g,body,legs,null,[],'nymph');
}
const NYMPHS={'wood nymph':{skin:'#e0b98a',dress:'#3a6a34',hair:'#4a2a18'},'water nymph':{skin:'#dcc7b0',dress:'#2f5a8a',hair:'#8a6a3a'},'mountain nymph':{skin:'#e6cdae',dress:'#7a5a8a',hair:'#2a2018'}};

// Mind flayers: a robed, high-collared caster with a bulbous cranium and a fringe of face tentacles.
function mindFlayer(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[];
 const skin=mat(o.skin,{roughness:.55}),robe=mat(o.robe,{roughness:.85}),trim=mat(shade(o.robe,.55),{roughness:.8});
 for(const x of [-.1,.1]){const leg=new THREE.Group();leg.position.set(x,.36,0);body.add(leg);rounded(leg,.12,.3,.12,trim,0,-.14,0,.03);rounded(leg,.15,.08,.22,M.leather,0,-.32,.04,.03);legs.push(leg);}
 cylinder(body,.2,.3,.56,robe,0,.4,0,12);rounded(body,.38,.36,.26,robe,0,.8,0,.07);
 const collar=cylinder(body,.27,.19,.24,trim,0,1.03,-.07,10);collar.rotation.x=-.25;
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.24,.93,0);body.add(arm);rounded(arm,.1,.36,.11,robe,0,-.17,0,.03);for(const f of [-.02,.02])cone(arm,.014,.12,skin,f,-.39,.02,4).rotation.x=Math.PI;arm.rotation.z=side*.14;arm.rotation.x=-.2;}
 sphere(body,.17,skin,0,1.1,.02,.9,1,.9);sphere(body,.21,skin,0,1.25,-.05,1,.95,1.1);
 eyes(body,o.eye,1.13,.14,.075);
 const mouth=new THREE.Group();mouth.position.set(0,1.04,.14);body.add(mouth);
 for(let i=0;i<4;i++){const x=(i-1.5)*.04,sway=(i-1.5)*.03;tube(mouth,[[x,0,0],[x+sway,-.08,.04],[x-sway,-.17,.03],[x+sway*.5,-.24,.06]],.016,skin,10);}
 if(o.circlet){const band=part(body,new THREE.TorusGeometry(.185,.018,6,20),M.gold,0,1.27,-.04);band.rotation.x=Math.PI/2-.1;sphere(body,.03,o.eye,0,1.29,.15);}
 return actor(g,body,legs,mouth);
}
const MIND_FLAYERS={'mind flayer':{skin:'#a07aa8',robe:'#3a2a52',eye:M.deadEye},'master mind flayer':{skin:'#b088c0',robe:'#4a1f4a',eye:M.eye,circlet:true,scale:1.1}};

// Trolls: hunched, long-armed brutes whose knuckles nearly drag, with a drooping nose, tusks and a ragged mane.
function troll(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[];
 const skin=mat(o.skin,{roughness:.8}),dark=mat(shade(o.skin,.7),{roughness:.9}),wart=mat(shade(o.skin,.55),{roughness:.95}),hair=mat(o.hair||'#2a2a22',{roughness:1}),tusk=mat('#e2d8b8',{roughness:.5}),cloth=mat(o.cloth||'#5a4630',{roughness:.97});
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.12,.36,-.04);body.add(leg);const thigh=rounded(leg,.12,.24,.13,skin,side*.02,-.1,0,.05);thigh.rotation.z=side*.18;rounded(leg,.1,.16,.11,skin,side*.04,-.26,.02,.04);rounded(leg,.16,.06,.22,dark,side*.05,-.34,.06,.025);for(let k=-1;k<=1;k++)cone(leg,.014,.04,tusk,side*.05+k*.045,-.35,.18,4).rotation.x=Math.PI/2;legs.push(leg);}
 cylinder(body,.17,.22,.18,cloth,0,.4,-.02,8);
 const torso=sphere(body,.23,skin,0,.66,.02,1.1,1.15,.9);torso.rotation.x=.45;sphere(body,.15,dark,0,.56,.12,1.05,.95,.55);
 for(const [x,y,z] of [[-.12,.72,.17],[.09,.64,.2],[.16,.78,.1],[-.05,.82,.14]])sphere(body,.022,wart,x,y,z);
 for(let i=0;i<5;i++){const spike=cone(body,.04,.13,hair,(i%2?.04:-.04),.98-i*.08,-.06-i*.045,4);spike.rotation.x=-1.1-i*.12;}
 if(o.rock)for(const side of [-1,1]){const plate=part(body,new THREE.DodecahedronGeometry(.085,0),mat(shade(o.skin,.85),{roughness:1}),side*.19,.86,-.03);plate.rotation.set(.5,side*.4,.3);}
 if(o.ice)for(const side of [-1,1])for(const k of [0,1]){const shard=cone(body,.03,.15,mat('#d8f2fc',{roughness:.12,transparent:true,opacity:.85}),side*(.1+k*.07),.9-k*.06,-.1,4);shard.rotation.set(-.5,0,-side*(.4+k*.35));}
 if(o.armor)for(const side of [-1,1]){const pad=sphere(body,.1,mat(o.armor,{roughness:.4,metalness:.65}),side*.22,.88,.02,1.1,.65,1.1);pad.rotation.z=side*.3;}
 const head=new THREE.Group();head.position.set(0,.92,.21);body.add(head);
 sphere(head,.11,skin,0,0,0,1,.95,1.05);rounded(head,.19,.04,.06,dark,0,.04,.08,.015);
 const snout=cone(head,.035,.13,dark,0,-.03,.14,7);snout.rotation.x=Math.PI/2+.7;
 sphere(head,.08,skin,0,-.07,.05,1.15,.7,1);for(const side of [-1,1]){const t=cone(head,.013,.06,tusk,side*.045,-.07,.11,5);t.rotation.x=-.2;}
 for(const side of [-1,1]){const ear=cone(head,.03,.12,skin,side*.12,.02,-.02,4);ear.rotation.z=-side*1.25;ear.rotation.y=side*.3;}
 const mane=sphere(head,.1,hair,0,.06,-.05,1.05,.7,1.1);mane.rotation.x=.3;
 if(o.fin){const fin=part(head,new THREE.CylinderGeometry(.13,.13,.012,10,1,false,0,Math.PI),mat(shade(o.skin,1.25),{roughness:.5,transparent:true,opacity:.85}),0,.08,-.06);fin.rotation.set(0,Math.PI/2,Math.PI/2);}
 eyes(head,o.glare?M.eye:mat(o.eye||'#e8d040',{emissive:o.eye||'#a08a10',emissiveIntensity:.8,roughness:.3}),.015,.095,.042);
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.25,.84,.06);body.add(arm);rounded(arm,.11,.32,.12,skin,0,-.15,0,.045);rounded(arm,.1,.34,.11,skin,0,-.46,.03,.04).rotation.x=-.12;sphere(arm,.075,dark,0,-.66,.06,1.1,.8,1.2);for(let k=-1;k<=1;k++)cone(arm,.012,.05,tusk,k*.03,-.69,.14,4).rotation.x=Math.PI/2;arm.rotation.x=-.28;arm.rotation.z=side*.1;}
 if(o.club){const club=cylinder(body,.07,.028,.44,mat('#4a3420',{roughness:.9}),.3,.22,.24,7);club.rotation.x=.5;if(o.armor)for(let i=0;i<3;i++)cone(body,.02,.05,M.darkSteel,.3+(i-1)*.05,.37,.33,4).rotation.x=.5;}
 return actor(g,body,legs,null,[],'orc');
}
const TROLLS={troll:{skin:'#5f7a4a',hair:'#2a3020'},'ice troll':{skin:'#b8d0dc',hair:'#eef4f6',cloth:'#6a7a86',ice:true,eye:'#8ad8ff',scale:1.05},'rock troll':{skin:'#7a746a',hair:'#3a3630',rock:true,club:true,scale:1.1},'water troll':{skin:'#3f6f78',hair:'#2f5a3a',cloth:'#2a4a4a',fin:true,eye:'#9af0c0',scale:1.05},'olog-hai':{skin:'#34362f',hair:'#141412',cloth:'#2a2420',armor:'#3a3e40',club:true,glare:true,scale:1.15}};

// Ogres (O): a squat, pot-bellied brute with a heavy underbite, a greasy topknot, a hide loincloth and a nail-studded club;
// ogre lords add a bronze helm and pauldrons, ogre kings a spiked crown, a fur mantle and a bigger club.
function ogre(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[];
 const skin=mat(o.skin,{roughness:.82}),dark=mat(shade(o.skin,.72),{roughness:.9}),hide=mat(o.hide||'#6a4a2c',{roughness:.97}),hair=mat(o.hair||'#1e1812',{roughness:1}),tusk=mat('#e6dcbc',{roughness:.5}),wood=mat('#553a22',{roughness:.88});
 const metal=o.metal?mat(o.metal,{roughness:.35,metalness:.7}):null;
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.13,.34,0);body.add(leg);rounded(leg,.15,.22,.15,skin,0,-.1,0,.06);rounded(leg,.13,.12,.14,skin,0,-.25,.01,.05);rounded(leg,.17,.06,.22,dark,0,-.31,.05,.025);legs.push(leg);}
 cylinder(body,.22,.26,.2,hide,0,.38,0,9);rounded(body,.46,.05,.3,M.leather,0,.47,0,.02);
 sphere(body,.25,skin,0,.64,.03,1.15,1,1);sphere(body,.17,mat(shade(o.skin,1.12),{roughness:.8}),0,.6,.13,1.05,.95,.6);sphere(body,.016,dark,0,.6,.23);
 rounded(body,.48,.2,.3,skin,0,.86,-.01,.09);
 for(const side of [-1,1]){if(metal){const pad=sphere(body,.11,metal,side*.24,.92,0,1.1,.6,1.1);pad.rotation.z=side*.35;}else sphere(body,.1,skin,side*.23,.9,0,1,.85,1);}
 if(o.mantle){sphere(body,.24,mat(o.mantle,{roughness:1}),0,.93,-.04,1.25,.42,1.05);rounded(body,.44,.4,.04,mat(o.cape||'#6a1f24',{roughness:.9}),0,.66,-.2,.02);}
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.29,.9,.02);body.add(arm);rounded(arm,.13,.24,.13,skin,0,-.12,0,.05);rounded(arm,.12,.22,.12,skin,0,-.33,.02,.045);sphere(arm,.08,dark,0,-.47,.03,1.1,.9,1.1);arm.rotation.z=side*.12;arm.rotation.x=side>0?-.4:-.1;}
 const head=new THREE.Group();head.position.set(0,1.02,.07);body.add(head);
 sphere(head,.13,skin,0,0,0,1.1,.95,1);rounded(head,.22,.045,.07,dark,0,.045,.09,.02);sphere(head,.035,dark,0,-.005,.13,1.1,.9,1);
 sphere(head,.1,skin,0,-.08,.05,1.2,.65,1.05);for(const side of [-1,1]){const t=cone(head,.016,.07,tusk,side*.055,-.06,.13,5);t.rotation.x=-.15;sphere(head,.035,skin,side*.14,.0,-.01,.5,.9,.8);}
 if(o.crown){const band=cylinder(head,.125,.13,.06,M.gold,0,.1,-.01,10);band.castShadow=false;for(let i=0;i<5;i++){const a=i/5*Math.PI*2;cone(head,.022,.07,M.gold,Math.sin(a)*.12,.16,Math.cos(a)*.12-.01,4);}sphere(head,.02,mat('#c0202a',{roughness:.2,metalness:.3}),0,.1,.125);}
 else if(metal){sphere(head,.135,metal,0,.04,-.01,1.1,.7,1.05);rounded(head,.03,.1,.03,metal,0,.02,.13,.01);}
 else{sphere(head,.1,hair,0,.07,-.04,1.05,.55,1);const knot=sphere(head,.04,hair,0,.15,-.06,1,1.3,1);knot.rotation.x=-.3;}
 eyes(head,o.glare?M.eye:mat('#d8c048',{emissive:'#7a6010',emissiveIntensity:.7,roughness:.3}),.015,.115,.05);
 const clubL=o.bigClub?.55:.46,club=cylinder(body,o.bigClub?.085:.07,.03,clubL,wood,.33,.4,.2,7);club.rotation.x=.55;
 for(let i=0;i<(o.bigClub?5:3);i++){const a=i*2.1,nail=cone(body,.016,.05,metal||M.darkSteel,.33+Math.cos(a)*.07,.56+(i%2)*.04,.29+Math.sin(a)*.03,4);nail.rotation.set(.55+Math.sin(a),0,Math.cos(a));}
 return actor(g,body,legs,null,[],'orc');
}
const OGRES={ogre:{skin:'#9a7a52',hair:'#2a1e14',scale:1},'ogre lord':{skin:'#8a6a48',hide:'#4a3a2a',metal:'#a0703a',scale:1.05},'ogre king':{skin:'#7e5e40',hide:'#3a2a1e',metal:'#b9954d',crown:true,mantle:'#d8ccb4',cape:'#6a1f5a',bigClub:true,glare:true,scale:1.1}};

// Generic guardian, kept as the last resort but tinted by the monster's glyph colour.
// Liches: a gaunt, robed skeleton with a bare skull, burning eye sockets and a staff topped by a glowing orb.
// Demiliches are more tattered, master liches add a bone crown, arch-liches a taller spiked crown and a shoulder mantle.
function lich(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);
 const bone=mat(o.bone||'#d8d0b8',{roughness:.7}),robe=mat(o.robe,{roughness:.9}),trim=mat(shade(o.robe,.5),{roughness:.85}),glow=mat(o.glow,{emissive:o.glow,emissiveIntensity:2.6,roughness:.3}),socket=mat('#141012',{roughness:.6});
 cylinder(body,.17,.32,.7,robe,0,.35,0,12);
 // ragged hem: alternating dark tatters hang below the robe
 for(let i=0;i<(o.tattered?10:7);i++){const a=i/(o.tattered?10:7)*Math.PI*2,t=cone(body,.05,.14+(i%2)*.06,trim,Math.sin(a)*.31,.1,Math.cos(a)*.31,4);t.rotation.x=Math.PI;}
 rounded(body,.34,.32,.24,robe,0,.82,0,.06);
 const hood=sphere(body,.24,trim,0,1.1,-.06,1,1.05,1);hood.scale.z=1.05;
 // skull: cranium, cheekbones, dark sockets with a glow deep inside, a toothed jaw
 sphere(body,.16,bone,0,1.1,.04,.95,1,1);rounded(body,.16,.07,.1,bone,0,.99,.1,.03);
 for(const x of [-.06,.06]){sphere(body,.042,socket,x,1.11,.165,1,1,.5);sphere(body,.02,glow,x,1.11,.18);}
 cone(body,.02,.04,socket,0,1.05,.19,3).rotation.x=Math.PI;
 for(let i=0;i<5;i++)rounded(body,.018,.025,.015,bone,(i-2)*.024,.975,.155,.004);
 // skeletal arms: thin bone forearms and claw fingers poking out of wide sleeves
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.22,.93,0);body.add(arm);cylinder(arm,.06,.1,.3,robe,0,-.14,0,8);cylinder(arm,.018,.018,.16,bone,0,-.34,.02,6);for(const f of [-.025,0,.025])cone(arm,.01,.09,bone,f,-.45,.03,4).rotation.x=Math.PI;arm.rotation.z=side*.16;arm.rotation.x=side<0?-.55:-.2;}
 // staff held out on the right, orb glowing in the lich's colour
 const staff=rounded(body,.035,1.15,.035,M.leather,.34,.66,.16,.01);staff.rotation.z=-.06;
 for(const side of [-1,1]){const prong=cone(body,.018,.14,bone,.37+side*.035,1.27,.16,4);prong.rotation.z=-side*.35;}
 sphere(body,.055,glow,.37,1.3,.16);
 if(o.crown){const n=o.crown==='tall'?7:5,h=o.crown==='tall'?.14:.09;cylinder(body,.155,.165,.05,o.crown==='tall'?M.gold:bone,0,1.21,.02,12);for(let i=0;i<n;i++){const a=(i/n-.5)*Math.PI*1.3;cone(body,.02,h,o.crown==='tall'?M.gold:bone,Math.sin(a)*.155,1.26+h/2-.02,.02+Math.cos(a)*.155,4);}sphere(body,.026,glow,0,1.22,.18);}
 if(o.mantle){for(const side of [-1,1]){const spike=cone(body,.05,.22,bone,side*.24,1.02,-.04,5);spike.rotation.z=-side*.9;}rounded(body,.46,.08,.3,trim,0,.97,-.02,.03);}
 return actor(g,body,[],null,[],'idle');
}
const LICHES={lich:{robe:'#5a4430',glow:'#8ad060'},demilich:{robe:'#6a2a24',glow:'#ff5a3a',bone:'#c8bc98',tattered:true},'master lich':{robe:'#4a1f52',glow:'#c070ff',crown:'bone',scale:1.05},'arch-lich':{robe:'#2a1438',glow:'#6ad8ff',bone:'#e4e0d4',crown:'tall',mantle:true,scale:1.1}};

function guardian(o={}){const g=new THREE.Group(),body=new THREE.Group();g.add(body);const armor=o.color?mat(shade(o.color,.7),{roughness:.5,metalness:.4}):M.darkSteel;rounded(body,.42,.78,.38,armor,0,.5,0,.07);sphere(body,.23,M.graySkin,0,1.03,0,1,.9,1);for(const x of [-.4,.4])rounded(body,.25,.5,.3,o.color?mat(o.color,{roughness:.4,metalness:.3}):M.steel,x,.58,0,.05);const core=sphere(body,.09,M.fire,0,.62,.23);g.userData.core=core;eyes(body,M.fire,1.04,.22,.08);return Object.assign(actor(g,body),{core});}

const SKIN={kobold:'#8a5a3a','large kobold':'#9a3f2f','kobold lord':'#7a3f70','kobold shaman':'#5070a8',homunculus:'#5f8a3f',imp:'#a53a2a',manes:'#8a2f2a',lemure:'#6a5040',quasit:'#3f5fa0',tengu:'#3f9a9a'};
const ZOMBIE_SKIN={'kobold zombie':'#7a6a48','gnome zombie':'#7d6b55','orc zombie':'#5f6f4d','dwarf zombie':'#7a5a4a','elf zombie':'#8a9a7a','human zombie':'#a3a792','ettin zombie':'#6a6f80','giant zombie':'#7a7a6a'};

export function createCreature(cell={}){
 const name=(cell.name||'').toLowerCase(),letter=Number.isInteger(cell.symbol)?String.fromCharCode(cell.symbol):'',color=nhColor(cell);
 if(/^(sewer rat|giant rat|rabid rat|rat)$/.test(name))return rat(name==='giant rat');
 if(/grid ?bug/.test(name))return gridBug();
 if(CANINES[name])return canine(CANINES[name]);
 if(/^(little dog|dog|large dog)$/.test(name))return dog();
 if(FELINES[name])return feline(FELINES[name]);
 if(LIZARDS[name])return lizard(LIZARDS[name]);
 if(COCKATRICES[name])return cockatrice(COCKATRICES[name]);
 if(INSECTS[name])return insect(INSECTS[name]);
 if(SNAKES[name])return snake(SNAKES[name]);
 if(WORMS[name])return worm(WORMS[name]);
 if(name==='long worm tail')return wormTail({color:color||WORMS['long worm'].color});
 if(VORTICES[name])return vortex(VORTICES[name]);
 if(PIERCERS[name])return piercer(PIERCERS[name]);
 if(APES[name])return ape(APES[name]);
 if(MIMICS[name])return mimic(MIMICS[name]);
 if(CENTAURS[name])return centaur(CENTAURS[name]);
 if(GIANTS[name])return giant(GIANTS[name]);
 if(NYMPHS[name])return nymph(NYMPHS[name]);
 if(MIND_FLAYERS[name])return mindFlayer(MIND_FLAYERS[name]);
 if(TROLLS[name])return troll(TROLLS[name]);
 if(OGRES[name])return ogre(OGRES[name]);
 if(LICHES[name])return lich(LICHES[name]);
 if(name==='floating eye')return floatingEye({});
 if(name==='shocking sphere')return shockingSphere();
 if(/ light$/.test(name))return wisp({color:color||(name.startsWith('black')?'#4a2a8a':'#ffd23a')});
 if(name==='lichen')return fungus({form:'lichen',color:'#8fbf5a'});
 if(/mold$/.test(name))return fungus({form:'mound',color:color||{yellow:'#d6b43c',green:'#5fa044',brown:'#8a6440',red:'#b8402e'}[name.split(' ')[0]]||'#8a8a60'});
 if(name==='shrieker'||name==='violet fungus')return fungus({form:'mushroom',color:name==='shrieker'?'#8f5aa8':'#b05ac0',tendrils:name==='violet fungus'});
 if(name==='cave spider'||name==='giant spider')return spider({color:name==='cave spider'?'#7a7a74':'#4a2a5a',scale:name==='cave spider'?.65:1.5});
 if(name==='gelatinous cube')return cube({color:color||'#8ad0c0'});
 if(/(blob|jelly|pudding|ooze|slime)$/.test(name))return blob({color:color||{acid:'#6fae3a','blue':'#3d6fd0','spotted':'#7a8a3a','ochre':'#c08a3a','brown':'#7a5a3a','black':'#2a2a30','gray':'#7a7a78','green':'#4f9a3a','quivering':'#b0a8d0','gelatinous':'#8ad0c0'}[name.split(' ')[0]]||'#7a9a6a',flat:/jelly$/.test(name)});
 if(name==='centipede')return centipede({color:'#c9a03a'});
 if(/^(bat|giant bat|vampire bat)$/.test(name))return bat({color:name==='bat'?'#5a4636':name==='giant bat'?'#7a3a32':'#28242a',scale:name==='giant bat'?1.25:1});
 if(ZOMBIE_SKIN[name])return humanoid('zombie',{skin:mat(ZOMBIE_SKIN[name]),cloth:mat('#3f3a34')});
 if(/mummy$/.test(name))return humanoid('mummy',{skin:mat('#6a5f4a'),cloth:mat('#c9bb98')});
 if(/shopkeeper|merchant/.test(name))return humanoid('shopkeeper');
 if(/guard|soldier|watchman|watch captain/.test(name))return humanoid('guard');
 if(/unicorn/.test(name))return unicorn();
 if(/dragon/.test(name))return dragon();
 {const golemMatch=name.match(/^(.*) golem$/);if(golemMatch)return golem(GOLEM_MATERIALS[golemMatch[1]]||GOLEM_MATERIALS.stone);}
 if(name==='giant turtle')return turtle({shell:color||'#4a6a34'});
 if(SKIN[name])return humanoid(letter==='k'||/kobold/.test(name)?'kobold':'imp',{skin:mat(SKIN[name]),cloth:mat(shade(SKIN[name],.55))});
 if(name==='hobbit')return humanoid('hobbit',{cloth:mat('#4f7a3a')});
 if(/orc|uruk|snaga/.test(name))return humanoid('orc',color?{cloth:mat(shade(color,.75))}:{});
 if(name==='dwarf lord')return humanoid('dwarf',{rank:'lord',cloth:mat('#3d5a9a')});
 if(name==='dwarf king')return humanoid('dwarf',{rank:'king',cloth:mat('#6a3a8a'),beard:mat('#c9c3b4')});
 if(name==='bugbear')return humanoid('bugbear',{skin:mat('#8a5a32',{roughness:.95}),cloth:M.leather});
 if(/dwarf/.test(name))return humanoid('dwarf');
 if(/gnome/.test(name))return humanoid('gnome',color?{cap:mat(color)}:{});
 // unlisted species: fall back on the monster class letter, then the glyph colour
 const c=color||'#8a8a80';
 switch(letter){
  case 'd':return canine({coat:c,ears:.15,snout:.2});
  case 'f':return feline({coat:c});
  case ':':return lizard({skin:c});
  case 'c':return cockatrice({skin:c,comb:'#c8262a',beak:shade(c,1.3)});
  case 'a':return insect({color:c});
  case 's':return spider({color:c});
  case 'S':return snake({color:c});
  case 'w':return worm({color:c,baby:/baby/.test(name)});
  case 'v':return vortex({color:c});
  case 'p':return piercer({color:c});
  case 'Y':return ape({fur:c});
  case 'm':return mimic({color:c});
  case 'C':return centaur({coat:c,hair:shade(c,.4)});
  case 'O':return ogre({skin:shade(c,1.1),hide:shade(c,.5)});
  case 'L':return lich({robe:shade(c,.6),glow:c});
  case 'T':return troll({skin:c,hair:shade(c,.4)});
  case 'H':return giant({skin:shade(c,1.1),cloth:shade(c,.55),weapon:'club',scale:1.1});
  case 'B':return bat({color:c});
  case 'F':return fungus({form:'mound',color:c});
  case 'b':case 'j':case 'P':return blob({color:c,flat:letter==='j'});
  case 'e':return floatingEye({iris:c});
  case 'y':return wisp({color:c});
  case 'k':return humanoid('kobold',{skin:mat(c),cloth:mat(shade(c,.55))});
  case 'i':return humanoid('imp',{skin:mat(c),cloth:mat(shade(c,.55))});
  case 'Z':return humanoid('zombie',{skin:mat(c),cloth:mat('#3f3a34')});
  case 'M':return humanoid('mummy',{skin:mat('#6a5f4a'),cloth:mat('#c9bb98')});
  case 'G':return humanoid('gnome',{cap:mat(c)});
  case 'h':return humanoid('dwarf');
  case 'o':return humanoid('orc',{cloth:mat(shade(c,.75))});
  case 'q':return canine({...CANINES.rothe,coat:c});
  case 'u':return unicorn();
  case 'D':return dragon();
  case '@':return humanoid('human',{cloth:mat(shade(c,.8))});
  case 'r':return rat(false);
  case 'x':return gridBug();
  case 'n':return nymph({skin:c,dress:shade(c,.6),hair:'#2a2018'});
  case "'":return golem(GOLEM_MATERIALS.stone);
 }
 return guardian({color});
}
