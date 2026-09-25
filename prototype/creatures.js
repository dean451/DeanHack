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

// Smooth-body helpers: a lathed profile, and a tapered limb between two joint points
// (so arms and legs read as one body rather than a jointed mannequin).
function lathe(parent,profile,material,x=0,y=0,z=0,phiStart=0,phiLength=Math.PI*2){return part(parent,new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),24,phiStart,phiLength),material,x,y,z);}
function segment(parent,a,b,r1,r2,material){const A=new THREE.Vector3(...a),d=new THREE.Vector3(...b).sub(A),m=part(parent,new THREE.CylinderGeometry(r2,r1,d.length(),12),material,A.x+d.x/2,A.y+d.y/2,A.z+d.z/2);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
// Tear a lathed hem: vertices below `below` are pulled down unevenly around the circle.
function tatter(geo,below,depth,freq){
 const p=geo.attributes.position,v=new THREE.Vector3();let low=Infinity;
 for(let i=0;i<p.count;i++)low=Math.min(low,p.getY(i));
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);if(v.y>=below)continue;const phi=Math.atan2(v.x,v.z),k=(below-v.y)/(below-low||1);v.y-=Math.abs(Math.sin(phi*freq)+.6*Math.sin(phi*freq*2.3+1))*depth*k;p.setY(i,v.y);}
 geo.computeVertexNormals();return geo;
}
function tatteredLathe(parent,profile,material,phiStart,phiLength,below,depth,freq){return part(parent,tatter(new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),28,phiStart,phiLength),below,depth,freq),material);}
function nymphHair(parent,material,layer=0){
 // one flowing sheet from the crown: open at the front for the face, wider than deep so
 // it drapes over the shoulders, rippling more as it falls, with a ragged hem
 const grow=1+layer*.14,open=.95+layer*.35;
 const geo=new THREE.LatheGeometry([[.02,.115],[.07,.1],[.095,.05],[.102,0],[.108,-.06],[.14,-.14],[.165,-.22],[.17,-.32],[.165,-.44],[.15,-.56],[.13,-.64]].map(([r,h])=>new THREE.Vector2(r*grow,h*(1-layer*.15))),30,open,Math.PI*2-open*2);
 const p=geo.attributes.position,v=new THREE.Vector3();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const phi=Math.atan2(v.x,v.z),fall=Math.min(1,Math.max(0,-v.y*2)),wave=1+(.08+layer*.05)*fall*Math.sin(phi*7+v.y*10+layer*2);v.x*=wave;v.z*=wave;if(v.y<-.46)v.y+=Math.sin(phi*11+layer)*.04*Math.min(1,-(v.y+.46)/.1);p.setXYZ(i,v.x,v.y,v.z);}
 geo.computeVertexNormals();
 const sheet=part(parent,geo,material);sheet.scale.set(1.14,1,.95);return sheet;
}
// A hand continuing its forearm: a flat palm, four fingers and a thumb.
function hand(parent,wrist,dir,side,skin){
 const h=new THREE.Group();h.position.set(...wrist);h.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),new THREE.Vector3(...dir).normalize());parent.add(h);
 rounded(h,.016,.05,.042,skin,0,-.026,0,.008);
 for(let f=0;f<4;f++)segment(h,[0,-.048,-.014+f*.0093],[side*-.004,-.083+Math.abs(f-1.5)*.004,-.012+f*.0085],.0055,.0042,skin);
 segment(h,[0,-.012,.02],[side*-.008,-.04,.034],.0065,.005,skin);
 return h;
}
// Nymphs: fae seductresses who charm you and walk off with your things. She wears a
// ragged, open-fronted vest with a deep plunge and bare sides, a low studded belt with
// tattered panels front and back and bare hips, and a long torn coat slipping off her
// shoulders. Weight on one hip, a hand hooked in her belt, a warm smile and long glowing
// hair; the other hand dangles the amulet she just stole. The hair is actor.tail, so it
// sways, and the 'nymph' quirk rolls her hips.
function nymph(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);const legs=[];
 const skin=mat(o.skin,{roughness:.42}),cloth=mat(o.cloth,{roughness:.8,side:THREE.DoubleSide}),trim=mat(o.trim||'#c9a24a',{roughness:.35,metalness:.55}),leather=mat(o.belt||'#2c3446',{roughness:.6});
 const hair=mat(o.hair,{roughness:.45,side:THREE.DoubleSide,emissive:o.glow||'#ff9a3a',emissiveIntensity:.18});
 const eye=o.eye||'#7a4a22',white=mat('#f3eee8',{roughness:.3}),iris=mat(eye,{emissive:eye,emissiveIntensity:.2,roughness:.2}),lash=mat(shade(o.hair,.4)),brow=mat(shade(o.hair,.65)),lips=mat(o.lips||'#c86a6a',{roughness:.3}),teeth=mat('#f6f2ea',{roughness:.3});
 const ember=mat('#ffc46a',{emissive:'#ffb040',emissiveIntensity:2.4});
 // long bare legs in contrapposto: weight on her left, right knee bent onto its toes
 for(const side of [-1,1]){
  const bent=side<0,leg=new THREE.Group();leg.position.set(side*.06,.62,0);body.add(leg);legs.push(leg);
  const thigh=new THREE.Group();thigh.rotation.set(bent?-.3:0,0,bent?.09:.05);leg.add(thigh);
  segment(thigh,[0,.02,0],[0,-.3,0],.066,.04,skin);sphere(thigh,.04,skin,0,-.3,0);
  const knee=new THREE.Group();knee.position.y=-.3;knee.rotation.x=bent?.7:0;thigh.add(knee);
  segment(knee,[0,0,0],[0,-.27,0],.039,.021,skin);sphere(knee,.037,skin,0,-.085,-.009,.95,2,1);
  const foot=new THREE.Group();foot.position.y=-.27;foot.rotation.x=bent?.45:0;knee.add(foot);
  sphere(foot,.021,skin);sphere(foot,.021,skin,0,-.024,-.012,.95,.75,1.1);sphere(foot,.024,skin,0,-.03,.03,.85,.5,1.55);
  for(let t=0;t<5;t++)sphere(foot,t===0?.0085:.0065-t*.0004,skin,(t-2)*.0085*-side,-.036,.068-Math.abs(t-1)*.004,1,.8,1.2);
 }
 // curvy torso, shoulders and bust
 lathe(body,[[0,.56],[.09,.58],[.122,.63],[.128,.68],[.115,.74],[.09,.81],[.083,.85],[.09,.9],[.1,.95],[.103,1],[.1,1.04],[.098,1.07],[.07,1.115],[.034,1.14],[0,1.15]],skin).scale.z=.78;
 for(const side of [-1,1]){sphere(body,.044,skin,side*.1,1.07,0,1.25,.85,.9);sphere(body,.054,skin,side*.046,.983,.05,1,.92,.86);}
 // the vest: a panel over each breast plunging to the navel, a lapel over each shoulder
 // with a patterned cap, and bare sides between the panels and the back
 for(const side of [-1,1]){
  const panel=part(body,new THREE.SphereGeometry(.062,14,10,0,Math.PI*2,0,Math.PI*.55),cloth,side*.047,.983,.05);panel.scale.set(1.02,1.04,.9);panel.rotation.set(Math.PI/2,0,-side*.12);
  const lapel=rounded(body,.042,.14,.01,cloth,side*.062,1.07,.06,.004);lapel.rotation.set(-.55,0,-side*.35);
  segment(body,[side*.03,.93,.085],[side*.012,.8,.07],.014,.006,cloth);
  rounded(body,.05,.2,.012,cloth,side*.075,1.0,-.075,.005).rotation.set(.12,0,-side*.1);
  const cap=part(body,new THREE.SphereGeometry(.058,12,8,0,Math.PI*2,0,Math.PI/2),cloth,side*.112,1.085,0);cap.scale.set(1.1,.7,1.15);cap.rotation.z=-side*.35;
  const rim=part(body,new THREE.TorusGeometry(.058,.005,5,20),trim,side*.112,1.085,0);rim.scale.set(1.1,1.15,1);rim.rotation.set(Math.PI/2,-side*.35,0);
 }
 // a low studded belt riding on the hips, tilted down toward the bent leg
 const belt=part(body,new THREE.TorusGeometry(.128,.011,6,32),leather,0,.685,0);belt.rotation.set(Math.PI/2,-.09,0);belt.scale.set(1,.82,1);
 for(let i=0;i<9;i++){const a=-1.1+i*.275;sphere(body,.007,trim,Math.sin(a)*.139,.685+Math.sin(a)*.011,Math.cos(a)*.139*.82);}
 // a narrow brief under the belt, then tattered panels front and back; the hips stay bare
 lathe(body,[[.123,.675],[.12,.64],[.1,.6],[.06,.57],[0,.555]],cloth,0,0,0,-.62,1.24).scale.z=.8;
 lathe(body,[[.123,.675],[.12,.64],[.1,.6],[.06,.57],[0,.555]],cloth,0,0,0,Math.PI-.7,1.4).scale.z=.8;
 tatteredLathe(body,[[.132,.69],[.14,.6],[.148,.5],[.155,.4],[.16,.33]],cloth,-.42,.84,.47,.07,9).scale.z=.84;
 tatteredLathe(body,[[.132,.69],[.14,.6],[.15,.5],[.158,.4],[.165,.3]],cloth,Math.PI-.5,1,.47,.08,8).scale.z=.84;
 // a long torn coat slipping off her shoulders, open at the front
 const coat=tatteredLathe(body,[[.13,1.09],[.15,1.02],[.155,.9],[.165,.72],[.19,.52],[.215,.34],[.23,.2]],cloth,1.2,Math.PI*2-2.4,.5,.12,7);coat.scale.z=.9;
 // neck and face: a warm, open smile, brown eyes, long pointed ears
 segment(body,[0,1.13,0],[0,1.235,.005],.037,.03,skin);
 const head=new THREE.Group();head.position.set(0,1.28,.005);head.rotation.set(.02,.1,.09);body.add(head);
 sphere(head,.08,skin,0,.025,-.004,.9,1.02,.98);sphere(head,.058,skin,0,-.03,.026,.82,.92,.88);
 const nose=cone(head,.01,.026,skin,0,-.008,.082,6);nose.rotation.x=Math.PI/2-.3;
 sphere(head,.012,teeth,0,-.048,.073,1.45,.4,.5);
 const smile=part(head,new THREE.TorusGeometry(.018,.004,5,12,Math.PI*.9),lips,0,-.044,.074);smile.rotation.z=Math.PI+Math.PI*.05;smile.scale.set(1,.55,.8);
 sphere(head,.011,lips,0,-.04,.075,1.5,.35,.6);
 for(const side of [-1,1]){
  sphere(head,.013,white,side*.03,.008,.068,1.5,.8,.5);sphere(head,.0078,iris,side*.03,.007,.074,1,1,.5);
  rounded(head,.032,.005,.008,lash,side*.03,.017,.073,.002).rotation.z=side*.14;
  rounded(head,.03,.004,.008,brow,side*.031,.043,.071,.002).rotation.z=side*.1;
  sphere(head,.012,mat(shade(o.skin,.93)),side*.045,-.022,.058,1.3,.8,.5);
  cone(head,.013,.1,skin,side*.08,.02,-.015,5).rotation.set(-.3,0,-side*1.1);
 }
 // long, full hair with a warm rim glow: a cap, bangs and two flowing layers that sway
 sphere(head,.087,hair,0,.042,-.024);sphere(head,.055,hair,.02,.076,.045,1.3,.42,.7).rotation.z=.3;
 const locks=new THREE.Group();locks.position.set(0,.02,-.02);head.add(locks);nymphHair(locks,hair,0);nymphHair(locks,hair,1);
 // arms: her left hooks the belt, her right hangs loose and dangles the stolen amulet
 const armBand=(p,r)=>{const band=part(body,new THREE.TorusGeometry(r,.005,5,16),trim,...p);band.rotation.x=Math.PI/2;return band;};
 {const S=[.118,1.07,0],E=[.24,.88,-.03],W=[.13,.735,.09];segment(body,S,E,.031,.025,skin);sphere(body,.025,skin,...E);segment(body,E,W,.024,.017,skin);armBand([.19,.975,-.02],.032);segment(body,[.16,.77,.06],[.13,.735,.09],.021,.019,leather);hand(body,W,[-.07,-.05,.05],1,skin);}
 {const S=[-.118,1.07,0],E=[-.17,.845,-.04],W=[-.2,.63,0];segment(body,S,E,.031,.025,skin);sphere(body,.025,skin,...E);segment(body,E,W,.024,.017,skin);armBand([-.15,.96,-.02],.032);segment(body,[-.19,.68,-.01],[-.2,.63,0],.021,.019,leather);hand(body,W,[-.01,-1,.02],-1,skin);
  const tip=[-.204,.545,.006];tube(body,[tip,[tip[0]+.004,tip[1]-.05,tip[2]],[tip[0],tip[1]-.1,tip[2]]],.003,M.gold,6);
  const amulet=cylinder(body,.028,.028,.008,M.gold,tip[0],tip[1]-.13,tip[2],16);amulet.rotation.x=Math.PI/2;sphere(body,.012,mat('#d9344a',{emissive:'#d9344a',emissiveIntensity:1.4}),tip[0],tip[1]-.13,tip[2]+.006);}
 // embers drifting around her
 for(const [x,y,z] of [[.32,1.05,.1],[-.3,.78,.16],[.16,1.48,-.08],[-.22,1.25,.12]])sphere(body,.011,ember,x,y,z);
 return actor(g,body,legs,locks,[],'nymph');
}
const NYMPHS={
 'wood nymph':{skin:'#eab991',cloth:'#3a2e1e',trim:'#b8923a',belt:'#3a2a1a',hair:'#b5502a',glow:'#ff8a3a',eye:'#4f7a36',lips:'#c46868'},
 'water nymph':{skin:'#f0cdb4',cloth:'#2a2620',trim:'#c9a24a',belt:'#2c3446',hair:'#f0d27a',glow:'#ffa040',eye:'#7a4a22',lips:'#cc6c6c'},
 'mountain nymph':{skin:'#f3d4bb',cloth:'#2a2030',trim:'#b8b0d8',belt:'#302838',hair:'#241a16',glow:'#b07aff',eye:'#5a3a7a',lips:'#b05c6a'},
};

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

// Wraiths: a floating, translucent shroud that trails off into wisps, a hood with only a void and two burning eyes inside,
// and long sleeves reaching forward with bony claws. Barrow wights are solid, with a rusty circlet and a sword;
// Nazgul are black-robed with a silver crown floating over the empty hood.
function wraith(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);
 const robe=new THREE.MeshStandardMaterial({color:o.robe,roughness:.9,transparent:!o.solid,opacity:o.solid?1:.82,emissive:o.robe,emissiveIntensity:o.solid?0:.12}),
  trim=mat(shade(o.robe,.55),{roughness:.9}),void_=mat('#060508',{roughness:1}),glow=mat(o.glow,{emissive:o.glow,emissiveIntensity:3,roughness:.3}),claw=mat(o.bone||'#bdb6a4',{roughness:.7});
 // tapering shroud, widest at the shoulders; wisps trail down from its hem
 cylinder(body,.2,.07,.62,robe,0,.62,0,12);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2,t=cone(body,.045,.16+(i%3)*.05,robe,Math.sin(a)*.1,.26-(i%3)*.02,Math.cos(a)*.1,4);t.rotation.x=Math.PI;t.rotation.z=Math.sin(a)*.35;}
 rounded(body,.4,.16,.26,robe,0,.9,0,.06);
 // hood: an outer cowl, a darker rim and a void where the face should be
 sphere(body,.2,robe,0,1.1,-.02,1,1.12,1);cylinder(body,.14,.15,.05,trim,0,1.07,.12).rotation.x=Math.PI/2;
 sphere(body,.13,void_,0,1.07,.07,1,1.1,.9);
 for(const x of [-.05,.05])sphere(body,.024,glow,x,1.09,.17,1.2,.7,.6);
 // sleeves reach forward, ending in thin clawed fingers
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.2,.92,.02);body.add(arm);cylinder(arm,.05,.09,.34,robe,0,-.15,0,8);for(const f of [-.03,0,.03])cone(arm,.011,.11,claw,f,-.37,.02,4).rotation.x=Math.PI;arm.rotation.x=-1.05;arm.rotation.z=side*.12;}
 if(o.circlet){cylinder(body,.17,.18,.04,mat('#7a5a34',{roughness:.6,metalness:.5}),0,1.2,-.01,12);sphere(body,.022,glow,0,1.2,.17);}
 if(o.crown){const silver=mat('#c8ccd4',{roughness:.25,metalness:.9});cylinder(body,.16,.17,.05,silver,0,1.26,-.01,12);for(let i=0;i<7;i++){const a=(i/7-.5)*Math.PI*1.4;cone(body,.018,.1,silver,Math.sin(a)*.16,1.32,-.01+Math.cos(a)*.16,4);}}
 if(o.sword){const blade=rounded(body,.04,.5,.012,o.crown?mat('#9aa0ac',{roughness:.3,metalness:.85}):mat('#8a7a64',{roughness:.6,metalness:.5}),.3,.74,.2,.008);blade.rotation.x=.9;rounded(body,.13,.025,.035,trim,.3,.62,.08,.008).rotation.x=.9;}
 return actor(g,body,[],null,[],'hover');
}
const WRAITHS={wraith:{robe:'#5a5e6a',glow:'#9ad8ff'},'barrow wight':{robe:'#4a4a3a',glow:'#e0c040',bone:'#a89878',solid:true,circlet:true,sword:true},nazgul:{robe:'#141218',glow:'#ff3a2a',crown:true,sword:true,scale:1.1}};

// Vampires: a tall, pale aristocrat in a high-collared cape with a red lining, slicked hair with a widow's peak,
// fangs and red eyes. Lords wear a gold medallion, mages a violet cape and a glowing hand orb,
// and Vlad a jewelled red cap, a moustache and a long impaling spear.
function vampire(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[];
 const skin=mat(o.skin||'#d8d0cc',{roughness:.6}),suit=mat(o.suit||'#1c1a22',{roughness:.8}),cape=mat(o.cape||'#141218',{roughness:.85,side:THREE.DoubleSide}),lining=mat(o.lining||'#8a1420',{roughness:.7,side:THREE.DoubleSide}),hair=mat(o.hair||'#141214',{roughness:.5}),boot=mat('#101012',{roughness:.5}),fang=mat('#f4f0e6',{roughness:.3}),glow=mat(o.eye||'#ff2a2a',{emissive:o.eye||'#ff2a2a',emissiveIntensity:2.4,roughness:.3});
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.1,.44,0);body.add(leg);rounded(leg,.12,.42,.13,suit,0,-.18,0,.035);rounded(leg,.13,.1,.24,boot,0,-.39,.04,.03);legs.push(leg);}
 rounded(body,.34,.44,.22,suit,0,.68,0,.05);rounded(body,.08,.3,.02,mat('#e8e4dc',{roughness:.6}),0,.74,.11,.01);
 // cape: a back panel flaring toward the hem, red-lined, with a tall two-piece collar framing the head
 const back=rounded(body,.46,.86,.03,cape,0,.52,-.14,.015);back.rotation.x=-.08;rounded(body,.43,.82,.012,lining,0,.53,-.12,.006).rotation.x=-.08;
 for(const side of [-1,1]){const flap=rounded(body,.05,.74,.2,cape,side*.24,.52,-.03,.015);flap.rotation.z=side*.1;
  const collar=rounded(body,.16,o.collar||.24,.015,lining,side*.12,1.02,-.06,.006);collar.rotation.set(-.25,side*.55,side*-.25);
  const outer=rounded(body,.17,(o.collar||.24)+.02,.012,cape,side*.125,1.02,-.075,.006);outer.rotation.copy(collar.rotation);}
 // head: gaunt face, pointed ears, widow's peak, fangs and red eyes
 const head=new THREE.Group();head.position.set(0,1.06,.02);body.add(head);
 sphere(head,.13,skin,0,0,0,.9,1.08,1);rounded(head,.08,.05,.06,skin,0,-.1,.06,.02);
 const cap=sphere(head,.135,hair,0,.04,-.015,.93,.95,1.02);cap.scale.y=.85;cone(head,.035,.07,hair,0,.075,.105,4).rotation.x=Math.PI+.35;
 for(const side of [-1,1]){const ear=cone(head,.025,.09,skin,side*.115,.01,-.01,4);ear.rotation.z=-side*1.1;cone(head,.008,.035,fang,side*.022,-.09,.108,4).rotation.x=Math.PI;}
 eyes(head,glow,.01,.11,.045);
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.22,.86,0);body.add(arm);rounded(arm,.1,.4,.11,suit,0,-.18,0,.03);sphere(arm,.05,skin,0,-.4,.01,.9,1.2,.9);for(const f of [-.02,0,.02])cone(arm,.008,.05,skin,f,-.46,.02,4).rotation.x=Math.PI;arm.rotation.z=side*.1;arm.rotation.x=side>0?-.35:-.1;}
 if(o.medallion){cylinder(body,.045,.045,.012,M.gold,0,.8,.12,12).rotation.x=Math.PI/2;sphere(body,.018,glow,0,.8,.13);}
 if(o.orb){const orb=sphere(body,.06,mat(o.orb,{emissive:o.orb,emissiveIntensity:3,roughness:.2,transparent:true,opacity:.9}),.26,.5,.2);g.userData.core=orb;}
 if(o.vlad){const red=mat('#9a1a24',{roughness:.7});cylinder(head,.125,.135,.1,red,0,.11,-.01,12);sphere(head,.02,mat('#e8e0c8',{roughness:.3}),0,.12,.125);for(const side of [-1,1]){const m=rounded(head,.07,.018,.02,hair,side*.035,-.065,.12,.008);m.rotation.z=side*-.35;}
  const spear=rounded(body,.03,1.4,.03,mat('#4a3420',{roughness:.9}),-.3,.71,.12,.01);spear.rotation.z=.04;cone(body,.035,.18,M.steel,-.33,1.49,.12,4);}
 return actor(g,body,legs,null,[],'idle');
}
// Xorns: a faceted stone barrel on three stubby legs, with three arms and three eyes spaced around its sides
// and a wide, fanged mouth on top.
function xorn(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[];
 const stone=mat(o.stone||'#8a7f6a',{roughness:.95,flatShading:true}),dark=mat(shade(o.stone||'#8a7f6a',.6),{roughness:1,flatShading:true}),claw=mat('#3a3630',{roughness:.6}),tooth=mat('#e4dcc4',{roughness:.4}),maw=mat('#1a100e',{roughness:1}),glow=mat(o.eye||'#f0c040',{emissive:o.eye||'#f0c040',emissiveIntensity:2.2,roughness:.3});
 const third=Math.PI*2/3;
 for(let i=0;i<3;i++){const a=i*third+Math.PI/3,leg=new THREE.Group();leg.position.set(Math.sin(a)*.15,.22,Math.cos(a)*.15);body.add(leg);rounded(leg,.11,.18,.11,stone,Math.sin(a)*.02,-.08,Math.cos(a)*.02,.04);sphere(leg,.075,dark,Math.sin(a)*.04,-.17,Math.cos(a)*.04,1.1,.6,1.1);legs.push(leg);}
 // barrel: faceted body with rough strata bands and scattered rock nodules
 cylinder(body,.2,.25,.5,stone,0,.45,0,9);
 for(const [y,r] of [[.3,.255],[.5,.235],[.66,.215]])cylinder(body,r,r+.01,.035,dark,0,y,0,9);
 for(let i=0;i<7;i++){const a=i*2.4+.5,y=.3+(i%4)*.1,r=.245-(y-.2)*.1,n=part(body,new THREE.DodecahedronGeometry(.035,0),dark,Math.sin(a)*r,y,Math.cos(a)*r);n.rotation.set(i,i*.7,0);}
 // mouth on top: dark maw, lip ring, teeth leaning inward
 cylinder(body,.15,.15,.02,maw,0,.705,0,12);part(body,new THREE.TorusGeometry(.155,.025,6,12),dark,0,.71,0).rotation.x=Math.PI/2;
 for(let i=0;i<10;i++){const b=i/10*Math.PI*2,t=cone(body,.016,.06,tooth,Math.sin(b)*.135,.74,Math.cos(b)*.135,4);t.rotation.set(-Math.cos(b)*.5,0,Math.sin(b)*.5);}
 // three eyes (one facing forward) and three arms between them, each ending in three claws
 for(let i=0;i<3;i++){const a=i*third,x=Math.sin(a),z=Math.cos(a);sphere(body,.045,maw,x*.215,.58,z*.215);sphere(body,.03,glow,x*.24,.58,z*.24);
  const arm=new THREE.Group();arm.position.set(Math.sin(a+Math.PI/3)*.2,.52,Math.cos(a+Math.PI/3)*.2);arm.rotation.set(-.35,a+Math.PI/3,0,'YXZ');body.add(arm);
  rounded(arm,.075,.075,.14,stone,0,0,.06,.03);const fore=rounded(arm,.065,.065,.12,stone,0,.04,.16,.025);fore.rotation.x=-.5;
  for(const f of [-.025,0,.025])cone(arm,.012,.06,claw,f,.08,.24,4).rotation.x=Math.PI/2-.4;}
 return actor(g,body,legs,null,[],'idle');
}
const XORNS={xorn:{}};

// Nagas: a thick serpent coil on the floor whose front rises into an upright neck with a human face,
// scaled belly plates and slit-pupil eyes. The raised half is the swaying 'tail' group so it weaves.
// Red nagas have a flame crest, black nagas a spine ridge, golden nagas a jewelled circlet,
// guardian nagas a cobra hood. Hatchlings are small and plain.
function naga(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);
 const scales=mat(o.color,{roughness:.5,metalness:.1}),belly=mat(o.belly||shade(o.color,1.45),{roughness:.6}),face=mat(o.face||shade(o.color,1.25),{roughness:.65}),
  glow=mat(o.eye||'#f0d040',{emissive:o.eye||'#f0d040',emissiveIntensity:2,roughness:.3}),pupil=mat('#0c0a08',{roughness:.4}),r=o.baby?.05:.075;
 // lower body: a flat spiral coil ending under the raised neck
 const coil=[];for(let i=0;i<=30;i++){const t=i/30,a=Math.PI*.5+t*Math.PI*3.2,rad=.3-t*.18;coil.push([Math.cos(a)*rad,r+t*.04,-Math.sin(a)*rad*.9-.02]);}
 coil.push([0,r+.08,.1]);tube(body,coil,r,scales,72);
 // tail tip trailing off the outside of the coil
 cone(body,r*.9,.16,scales,-.06,r,.29,8).rotation.z=Math.PI/2;
 // raised half: pivots above the coil centre
 const neck=new THREE.Group();neck.position.set(0,r+.08,.1);body.add(neck);
 const rise=[[0,0,0],[0,.14,.03],[0,.3,.02],[0,.44,-.01]];tube(neck,rise,r*.95,scales,20);
 for(let i=0;i<5;i++){const y=.04+i*.085;rounded(neck,r*1.3,.05,.03,belly,0,y,.02+r*.85-(i>3?.02:0),.012);}
 const head=new THREE.Group();head.position.set(0,.5,.01);neck.add(head);
 // head: a humanlike face set into a scaled skull, with a pointed chin and slit-pupil eyes
 sphere(head,r*1.35,scales,0,.01,-.015,1,1.05,1);sphere(head,r*1.15,face,0,-.005,.03,.95,1.05,.85);cone(head,r*.5,r*.7,face,0,-r*1.2,.045,6).rotation.x=Math.PI+.25;
 rounded(head,r*.25,r*.45,r*.35,face,0,0,r*1.05,.008);rounded(head,r*.6,r*.1,r*.1,mat('#5a2a2a',{roughness:.6}),0,-r*.55,r*.95,.01);
 for(const side of [-1,1]){sphere(head,r*.24,glow,side*r*.42,r*.3,r*.95,1.2,.8,.5);rounded(head,r*.06,r*.3,r*.05,pupil,side*r*.42,r*.3,r*1.05,.004);}
 if(o.crest==='flame'){const fire=mat('#ff7a2a',{emissive:'#ff4a10',emissiveIntensity:1.6,roughness:.4});for(let i=0;i<5;i++){const a=(i-2)*.32;const c=cone(head,r*.22,r*(1.3-Math.abs(i-2)*.25),fire,Math.sin(a)*r*.9,r*1.25,-.02-Math.cos(a)*r*.25,4);c.rotation.z=-a*.8;c.rotation.x=-.35;}}
 if(o.crest==='spines'){const spine=mat(shade(o.color,.55),{roughness:.4});for(let i=0;i<4;i++)cone(neck,r*.2,r*.7,spine,0,.1+i*.11,-r*.9,4).rotation.x=-1.2;for(let i=0;i<3;i++)cone(head,r*.2,r*.7,spine,0,r*1.25-i*r*.35,-r*.8-i*r*.3,4).rotation.x=-.6-i*.35;}
 if(o.crest==='circlet'){cylinder(head,r*1.3,r*1.36,r*.3,M.gold,0,r*.75,-.01,14);sphere(head,r*.22,mat('#3aa0ff',{emissive:'#1a60c0',emissiveIntensity:1.2,roughness:.2}),0,r*.8,r*1.3);for(const side of [-1,1])cone(head,r*.15,r*.5,M.gold,side*r*.7,r*1.12,r*.95,4);}
 if(o.crest==='hood'){const hood=sphere(neck,r*3.2,scales,0,.43,-.035,1,1.25,.18);hood.rotation.x=.12;sphere(neck,r*2.6,belly,0,.42,-.022,1,1.2,.12).rotation.x=.12;for(const side of [-1,1])sphere(neck,r*.45,mat(shade(o.color,.45)),side*r*1.7,.47,-.04,1,1.4,.3);}
 return actor(g,body,[],neck,[],'snake');
}
const NAGAS={'red naga':{color:'#b0321e',belly:'#e0a040',eye:'#ffcc40',crest:'flame'},'black naga':{color:'#26242a',belly:'#4a4852',face:'#5a5660',eye:'#8aff4a',crest:'spines'},'golden naga':{color:'#c8a032',belly:'#f0dc8a',eye:'#ff5a3a',crest:'circlet',scale:1.05},'guardian naga':{color:'#3a8a3a',belly:'#c0d880',eye:'#ffe040',crest:'hood',scale:1.1},
 'red naga hatchling':{color:'#b0321e',belly:'#e0a040',baby:true,scale:.8},'black naga hatchling':{color:'#26242a',belly:'#4a4852',face:'#5a5660',eye:'#8aff4a',baby:true,scale:.8},'golden naga hatchling':{color:'#c8a032',belly:'#f0dc8a',baby:true,scale:.8},'guardian naga hatchling':{color:'#3a8a3a',belly:'#c0d880',baby:true,scale:.8}};

// Umber hulks (U): a hunched, beetle-backed burrower with a domed carapace of overlapping chitin plates,
// thick legs, long arms ending in three huge digging claws, and a broad head with two big confusing
// compound eyes, two small eyes between them and a pair of curved mandibles. The head is the 'tail' group, so it tilts.
function umberHulk(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[];
 const shell=mat(o.color,{roughness:.45,metalness:.15}),dark=mat(shade(o.color,.55),{roughness:.7}),hide=mat(o.hide||shade(o.color,1.25),{roughness:.9}),claw=mat('#1c1612',{roughness:.35,metalness:.2}),
  compound=mat(o.eye,{emissive:o.eye,emissiveIntensity:.9,roughness:.15,metalness:.3,flatShading:true}),small=mat('#0e0a08',{roughness:.2}),mouth=mat('#2a0e0c',{roughness:1});
 // legs: thick thighs and shins with chitin knee caps and three-toed clawed feet
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.17,.415,-.02);body.add(leg);
  segment(leg,[0,0,0],[side*.04,-.2,.06],.1,.085,hide);segment(leg,[side*.04,-.2,.06],[side*.05,-.37,.01],.08,.07,hide);
  sphere(leg,.075,shell,side*.04,-.2,.1,1,.8,.8);rounded(leg,.18,.06,.2,dark,side*.05,-.38,.05,.025);
  for(let k=-1;k<=1;k++)cone(leg,.02,.07,claw,side*.05+k*.055,-.39,.17,4).rotation.x=Math.PI/2;legs.push(leg);}
 // torso: a lighter hide belly with ridged plates under a domed, segmented back carapace
 const torso=sphere(body,.27,hide,0,.7,.02,1.15,1.1,.9);torso.rotation.x=.35;
 for(let i=0;i<4;i++)rounded(body,.3-i*.03,.05,.04,dark,0,.5+i*.1,.2-i*.012,.018).rotation.x=.3;
 for(let i=0;i<4;i++){const plate=sphere(body,.3-i*.025,shell,0,.62+i*.12,-.07-i*.02,1.18,.42,.95);plate.rotation.x=-.55-i*.1;}
 for(let i=0;i<3;i++){const ridge=cone(body,.035,.11,dark,0,.78+i*.13,-.3+i*.02,5);ridge.rotation.x=-1.2;}
 // shoulders: heavy pauldron plates
 for(const side of [-1,1]){const pad=sphere(body,.14,shell,side*.29,.98,.02,1.1,.7,1.15);pad.rotation.z=side*.45;}
 // arms: long and heavy, hanging forward, each ending in three great hooked claws for tunnelling through rock
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.3,.95,.04);body.add(arm);
  segment(arm,[0,0,0],[side*.05,-.3,.05],.09,.08,hide);sphere(arm,.07,shell,side*.05,-.3,.05,1,.8,1);
  segment(arm,[side*.05,-.3,.05],[side*.04,-.58,.14],.085,.075,shell);rounded(arm,.15,.1,.14,dark,side*.04,-.62,.15,.035);
  for(let k=-1;k<=1;k++){const c=cone(arm,.026,.16,claw,side*.04+k*.05,-.72,.2,5);c.rotation.x=Math.PI-.5;c.rotation.z=k*.15;}
  arm.rotation.x=-.2;arm.rotation.z=side*.08;}
 // head: set low and forward between the shoulders
 const head=new THREE.Group();head.position.set(0,1.02,.2);body.add(head);
 sphere(head,.16,shell,0,.02,0,1.2,.85,1);rounded(head,.3,.05,.1,dark,0,.1,.06,.02).rotation.x=-.3;
 sphere(head,.1,hide,0,-.08,.1,1.2,.7,.9);cylinder(head,.07,.07,.02,mouth,0,-.1,.17,10).rotation.x=Math.PI/2;
 for(const side of [-1,1]){
  const eye=part(head,new THREE.IcosahedronGeometry(.055,1),compound,side*.1,.03,.12);eye.scale.set(1,1.15,.8);
  sphere(head,.018,small,side*.03,.05,.16);
  // mandibles: curved, tapering hooks that close toward the mouth
  tube(head,[[side*.07,-.08,.12],[side*.11,-.13,.2],[side*.07,-.18,.27],[side*.015,-.19,.28]],.018,claw,10);
  cone(head,.02,.05,claw,side*.015,-.19,.29,4).rotation.z=side*Math.PI/2;
  const antenna=cone(head,.012,.12,dark,side*.07,.12,.02,4);antenna.rotation.set(-.6,0,-side*.5);}
 return actor(g,body,legs,head,[],'orc');
}
const UMBER_HULKS={'umber hulk':{color:'#4a3322',hide:'#6a5038',eye:'#d8a040',scale:1.05}};

// Rust monsters and disenchanters: a low, armadillo-like bug with overlapping carapace plates, four stubby legs,
// two long feathery antennae (the rust-touch feelers) and a tail ending in a flat, two-bladed propeller vane.
// The tail is the 'tail' group, so its roll in live.js twists the vane. Disenchanters are blue with a violet glow.
function rustMonster(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(o.scale||1);
 const shell=mat(o.color,{roughness:.55,metalness:.35}),hide=mat(shade(o.color,.6),{roughness:.9}),belly=mat(o.belly||shade(o.color,1.35),{roughness:.8}),
  feeler=mat(o.feeler||shade(o.color,1.5),{roughness:.6}),glow=mat(o.eye||'#ffb040',{emissive:o.eye||'#ffb040',emissiveIntensity:1.8,roughness:.3}),y=.26;
 sphere(body,.2,hide,0,y,0,.85,.6,1.35);sphere(body,.14,belly,0,y-.07,.03,.85,.45,1.2);
 // carapace: five overlapping arched plates from shoulders to rump, rust-flecked edges
 for(let i=0;i<5;i++){const z=.18-i*.09,w=.22-Math.abs(i-1.5)*.02;const plate=sphere(body,w,shell,0,y+.05-Math.abs(i-1.5)*.012,z,1,.55,.4);plate.rotation.x=-.25;
  for(const side of [-1,1])sphere(body,.018,mat(o.fleck||'#b0582a',{roughness:1}),side*w*.7,y+.02,z+.02,1,.6,1);}
 // head: blunt, low, with a small mandible pair and glowing beady eyes
 const head=new THREE.Group();head.position.set(0,y-.02,.28);body.add(head);
 sphere(head,.1,shell,0,0,0,1,.8,1.05);sphere(head,.07,belly,0,-.04,.05,.9,.55,1);
 for(const side of [-1,1]){sphere(head,.022,glow,side*.055,.035,.075);const jaw=cone(head,.018,.06,hide,side*.03,-.05,.1,4);jaw.rotation.x=Math.PI/2+.4;jaw.rotation.z=side*.3;}
 // antennae: long arcs up and forward, each fringed with short bristles and a knob at the tip
 for(const side of [-1,1]){const pts=[[side*.035,.06,.05],[side*.09,.2,.1],[side*.16,.3,.18],[side*.21,.31,.27]];tube(head,pts,.011,feeler,14);
  const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
  for(let i=2;i<10;i++){const p=curve.getPoint(i/10),b=cone(head,.006,.05,feeler,p.x+side*.02,p.y,p.z,3);b.rotation.z=-side*1.2;}
  const tip=curve.getPoint(1);sphere(head,.022,glow,tip.x,tip.y,tip.z);}
 // legs: four short armoured stumps splayed outward
 for(const side of [-1,1])for(const z of [-.12,.13]){const leg=new THREE.Group();leg.position.set(side*.13,y-.08,z);body.add(leg);const upper=rounded(leg,.06,.16,.06,hide,side*.03,-.06,0,.02);upper.rotation.z=side*.3;sphere(leg,.035,shell,side*.05,-.15,.015,1.1,.6,1.3);legs.push(leg);}
 // tail: a tapering segmented stalk out the back ending in a crossed propeller vane
 const tail=new THREE.Group();tail.position.set(0,y,-.27);body.add(tail);
 for(let i=0;i<4;i++){const r=.045-i*.008,seg=cylinder(tail,r*.85,r,.06,i%2?shell:hide,0,0,-.03-i*.055,8);seg.rotation.x=Math.PI/2;}
 const vane=new THREE.Group();vane.position.set(0,0,-.25);tail.add(vane);sphere(vane,.03,shell);
 for(const a of [0,Math.PI]){const blade=rounded(vane,.16,.018,.06,shell,Math.cos(a)*.09,Math.sin(a)*.09,0,.008);blade.rotation.set(.35,0,a);}
 return actor(g,body,legs,tail,[],'lizard');
}
const RUST_MONSTERS={'rust monster':{color:'#8a5a34',belly:'#c08a5a',fleck:'#c0602a',feeler:'#d0a070'},disenchanter:{color:'#3d5fb0',belly:'#8aa0d8',fleck:'#6a3aa0',feeler:'#b0c0f0',eye:'#c080ff',scale:1.05}};

// Leprechaun: a small, portly trickster in a green frock coat and buckled top hat,
// leaning on a knobbly shillelagh with a swinging sack of stolen gold in his other hand.
function leprechaun(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[];
 const box=(p,w,h,d,m,x,y,z)=>part(p,new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const coat=mat(o.coat,{roughness:.85}),coatDark=mat(shade(o.coat,.6),{roughness:.9}),vest=mat(o.vest||'#d8c89a',{roughness:.85}),skin=mat('#e8b896',{roughness:.8}),rosy=mat('#d8806e',{roughness:.8}),
  beard=mat(o.beard||'#c8561e',{roughness:.95}),stocking=mat('#ece6d8',{roughness:.9}),black=mat('#161414',{roughness:.45}),hatMat=mat(shade(o.coat,.8),{roughness:.8}),
  wood=mat('#4a3020',{roughness:.95}),sack=mat('#8a6a40',{roughness:1}),coin=mat('#e0b83a',{metalness:.85,roughness:.25}),glint=mat('#8ae05a',{emissive:'#4ac02a',emissiveIntensity:1.4,roughness:.2});
 // legs: knee breeches, white stockings and buckled shoes with turned-up toes
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.07,.25,0);body.add(leg);
  sphere(leg,.06,coat,0,-.01,0,1,1.1,1);segment(leg,[0,-.04,0],[0,-.2,0],.036,.03,stocking);
  rounded(leg,.075,.05,.14,black,0,-.22,.025,.02);cone(leg,.022,.05,black,0,-.21,.105,6).rotation.x=Math.PI/2-.6;
  box(leg,.05,.03,.012,coin,0,-.2,.07);legs.push(leg);}
 // body: a round belly under a cream waistcoat, a broad belt with a big gold buckle and a green frock coat with tails
 sphere(body,.12,coat,0,.3,0,1.05,.6,.9);
 sphere(body,.14,coat,0,.43,-.01,1,1.08,.92);sphere(body,.11,vest,0,.43,.035,.9,1,.9);
 for(let i=0;i<3;i++)sphere(body,.012,coin,0,.38+i*.045,.135-i*.006);
 cylinder(body,.142,.142,.035,black,0,.35,0,20).scale.z=.92;box(body,.06,.045,.015,coin,0,.35,.13);box(body,.032,.022,.016,black,0,.35,.132);
 for(const side of [-1,1]){const lapel=box(body,.04,.13,.02,coatDark,side*.07,.47,.1);lapel.rotation.set(-.2,0,-side*.3);
  const tail=box(body,.08,.2,.025,coat,side*.05,.26,-.12);tail.rotation.set(.18,0,side*.12);}
 // arms: left hand grips a shillelagh planted on the floor; the right hand holds the sack
 for(const side of [-1,1]){const shoulder=[side*.14,.5,0],hand=[side*.2,.33,.06];
  segment(body,shoulder,hand,.042,.036,coat);sphere(body,.045,coat,...shoulder);
  cylinder(body,.04,.04,.03,stocking,hand[0]*.97,hand[1]+.035,hand[2]);sphere(body,.034,skin,...hand);}
 tube(body,[[-.23,.005,.1],[-.215,.2,.08],[-.2,.36,.06],[-.2,.46,.06]],.014,wood,12);sphere(body,.03,wood,-.2,.47,.06,1,.9,1);
 for(const [y,z] of [[.12,.095],[.25,.075]])sphere(body,.017,wood,-.225,y,z);
 // head: rosy cheeks, a bulbous nose, pointed ears, a green glint in the eye and a ginger chin-curtain beard
 const headY=.64;sphere(body,.11,skin,0,headY,.01,1,1.02,1);
 sphere(body,.032,rosy,0,headY-.01,.11,1,.9,1);for(const side of [-1,1]){sphere(body,.028,rosy,side*.058,headY-.025,.085,1,.8,.6);
  sphere(body,.022,vest,side*.04,headY+.02,.092,1,.8,.5);sphere(body,.012,glint,side*.04,headY+.02,.103);
  const brow=box(body,.05,.016,.02,beard,side*.042,headY+.052,.095);brow.rotation.z=-side*.25;
  const ear=cone(body,.025,.075,skin,side*.11,headY+.02,0,5);ear.rotation.z=-side*1.25;
  sphere(body,.045,beard,side*.085,headY-.04,.04,.8,1.2,.9);}
 lathe(body,[[.0,-.09],[.07,-.08],[.11,-.03],[.115,.0]],beard,0,headY-.055,.015,-Math.PI*.55,Math.PI*1.1).scale.set(1,1,.95);
 part(body,new THREE.TorusGeometry(.03,.006,6,12,Math.PI),black,0,headY-.045,.098).rotation.z=Math.PI;
 // pipe: a clay pipe clamped in the grin with a glowing ember
 segment(body,[.02,headY-.05,.1],[.08,headY-.08,.15],.006,.005,vest);cylinder(body,.014,.011,.03,vest,.085,headY-.065,.155,8);cylinder(body,.011,.011,.004,M.fire,.085,headY-.05,.155,8);
 // hat: a tall green hat, jauntily tilted, with a black band, gold buckle and shamrock
 const hat=new THREE.Group();hat.position.set(0,headY+.085,0);hat.rotation.set(-.06,0,-.14);body.add(hat);
 cylinder(hat,.155,.155,.014,hatMat,0,0,0,24);cylinder(hat,.095,.085,.19,hatMat,0,.1,0,20);cylinder(hat,.097,.097,.012,hatMat,0,.195,0,20);
 cylinder(hat,.089,.087,.04,black,0,.03,0,20);box(hat,.055,.045,.012,coin,0,.03,.088);box(hat,.03,.022,.014,black,0,.03,.09);
 for(let i=0;i<3;i++){const a=i/3*Math.PI*2+.5;sphere(hat,.014,glint,.06+Math.cos(a)*.012,.045+Math.sin(a)*.012,.07,1,1,.5);}
 // sack: hangs from the right hand and swings as the tail; gold coins spill from its mouth
 const loot=new THREE.Group();loot.position.set(.2,.32,.06);body.add(loot);
 sphere(loot,.07,sack,0,-.1,0,1,1.15,.95);cylinder(loot,.022,.03,.04,sack,0,-.02,0,8);part(loot,new THREE.TorusGeometry(.024,.006,6,12),wood,0,-.03,0).rotation.x=Math.PI/2;
 for(const [x,y,z,r] of [[.03,-.02,.03,.3],[-.02,-.01,.035,-.4],[.01,.005,.02,.1]]){const c=cylinder(loot,.018,.018,.005,coin,x,y,z,14);c.rotation.set(Math.PI/2-.4,0,r);}
 return actor(g,body,legs,loot,[],'idle');
}
const LEPRECHAUNS={leprechaun:{coat:'#2f8a3a'}};

// Elementals: one torso-and-arms spirit built from its element. Air, fire and water
// rise from a swaying funnel (the actor tail) and hover; earth stands on boulder legs.
function elemental(o){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale||1);const legs=[],k=o.kind,c=o.color;
 const see=(color,opacity,glow=0)=>mat(color,{transparent:true,opacity,depthWrite:false,roughness:.25,emissive:color,emissiveIntensity:glow});
 const glow=(color,i=2.5)=>mat(color,{emissive:color,emissiveIntensity:i,roughness:.3});
 const skin=k==='earth'?mat(c,{roughness:1,flatShading:true}):k==='fire'?glow(c,1.6):k==='water'?see(c,.62,.25):see(c,.34,.35);
 const dark=k==='earth'?mat(shade(c,.6),{roughness:1,flatShading:true}):k==='fire'?glow(o.hot||'#ffe070',3):k==='water'?see(shade(c,1.35),.4,.4):see(shade(c,1.3),.22,.5);
 const eye=glow(o.eye||'#ffffff',k==='earth'?2:3);
 const lump=(p,r,m,x,y,z,sx=1,sy=1,sz=1)=>{const mesh=k==='earth'?part(p,new THREE.DodecahedronGeometry(r,0),m,x,y,z):sphere(p,r,m,x,y,z);mesh.scale.set(sx,sy,sz);if(k==='earth')mesh.rotation.set(x*7,y*5,z*3);if(k!=='earth')mesh.castShadow=false;return mesh;};
 // lower body: earth gets two stubby boulder legs; the others a tapering funnel that sways as the tail
 let tail=null;
 if(k==='earth'){for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.13,.36,0);body.add(leg);lump(leg,.1,skin,0,-.07,0,1,1.2,1);lump(leg,.11,dark,0,-.25,.03,1.1,.9,1.2);legs.push(leg);}}
 else{tail=new THREE.Group();tail.position.y=.5;body.add(tail);
  if(k==='air')for(let i=0;i<6;i++){const t=i/5,ring=part(tail,new THREE.TorusGeometry(.2-t*.15,.03-t*.015,6,20),i%2?skin:dark,Math.sin(i*1.7)*.03,-.04-t*.4,Math.cos(i*1.7)*.03);ring.rotation.set(Math.PI/2+Math.sin(i*2.1)*.25,i*.6,0);ring.castShadow=false;}
  if(k==='fire')for(let i=0;i<9;i++){const a=i*2.4,r=.04+(i%3)*.04,f=cone(tail,.07-(i%3)*.012,.3-(i%3)*.05,i%3?skin:dark,Math.cos(a)*r,-.2+(i%3)*.03,Math.sin(a)*r,6);f.rotation.set(Math.PI+Math.sin(a)*.3,0,Math.cos(a)*.3);f.castShadow=false;}
  if(k==='water'){lathe(tail,[[.03,-.47],[.08,-.4],[.1,-.28],[.15,-.12],[.19,0]],skin).castShadow=false;const curl=part(tail,new THREE.TorusGeometry(.13,.035,8,20,Math.PI*1.4),dark,0,-.2,0);curl.rotation.set(Math.PI/2,0,.6);curl.castShadow=false;}
  const pool=part(g,new THREE.CircleGeometry(.26,20),mat(k==='fire'?'#2a1a10':shade(c,.5),{transparent:true,opacity:k==='fire'?.6:.35,depthWrite:false,emissive:k==='fire'?c:'#000000',emissiveIntensity:k==='fire'?.8:0}),0,.012,0);pool.rotation.x=-Math.PI/2;pool.castShadow=false;}
 // torso, shoulders and head, lumped from the element
 const chestY=k==='earth'?.6:.68;
 lump(body,.2,skin,0,chestY,0,1.1,1,.8);lump(body,.15,dark,0,chestY-.14,0,.9,.8,.8);
 const headY=chestY+.3;lump(body,.12,skin,0,headY,.02,1,1.05,1);
 for(const side of [-1,1]){sphere(body,.024,eye,side*.045,headY+.01,.12,1,.7,.6).castShadow=false;lump(body,.1,k==='earth'?dark:skin,side*.2,chestY+.12,0,1,.85,.9);}
 // arms: tapered limbs to heavy fists (earth) or dissolving hands
 for(const side of [-1,1]){const sh=[side*.22,chestY+.1,0],el=[side*.3,chestY-.08,.06],fist=[side*.3,chestY-.26,.1];
  segment(body,sh,el,.07,.06,skin).castShadow=k==='earth';segment(body,el,fist,.06,.05,skin).castShadow=k==='earth';
  lump(body,k==='earth'?.09:.065,dark,...fist);
  if(k==='fire')for(let i=0;i<3;i++){const f=cone(body,.022,.12,dark,fist[0]+(i-1)*.025,fist[1]+.09,fist[2],5);f.rotation.z=(i-1)*.3;f.castShadow=false;}}
 // element flourishes
 let core=null;
 if(k==='earth'){for(let i=0;i<5;i++){const a=(i-2)*.45,sh=cone(body,.035,.16+(i%2)*.06,glow(o.crystal||'#7fd8c0',1.2),Math.sin(a)*.16,chestY+.12+Math.cos(a)*.05,-.13,5);sh.rotation.set(-.6,0,-a);}
  for(const [x,y,z] of [[-.12,chestY+.15,.14],[.1,chestY-.05,.15],[.06,headY+.1,.08]])lump(body,.035,mat('#4f6a34',{roughness:1,flatShading:true}),x,y,z,1.3,.5,1);}
 if(k==='fire'){core=sphere(body,.08,glow(o.hot||'#ffe070',4.5),0,chestY,.1,1,1.2,.6);core.castShadow=false;
  for(let i=0;i<7;i++){const a=(i-3)*.42,f=cone(body,.045-Math.abs(i-3)*.005,.28-Math.abs(i-3)*.04,i%2?skin:dark,Math.sin(a)*.09,headY+.12+Math.cos(a)*.04,-.02,6);f.rotation.z=-a*.7;f.castShadow=false;}
  for(let i=0;i<6;i++){const a=i*1.1;sphere(body,.016,dark,Math.cos(a)*.34,.35+i*.12,Math.sin(a)*.3).castShadow=false;}}
 if(k==='air'){for(let i=0;i<3;i++){const ring=part(body,new THREE.TorusGeometry(.3+i*.05,.008,4,28,Math.PI*1.3),dark,0,chestY-.1+i*.14,0);ring.rotation.set(Math.PI/2+(i-1)*.3,0,i*2);ring.castShadow=false;}
  for(let i=0;i<8;i++){const a=i*.8;const leaf=part(body,new THREE.PlaneGeometry(.04,.02),mat(i%2?'#8a7a4a':'#6a8a3a',{side:THREE.DoubleSide}),Math.cos(a)*.34,.3+i*.09,Math.sin(a)*.34);leaf.rotation.set(a,a*2,a*.5);}}
 if(k==='water'){const foam=mat('#eef8ff',{roughness:.4});for(let i=0;i<7;i++){const a=(i-3)*.4;sphere(body,.04-Math.abs(i-3)*.004,foam,Math.sin(a)*.1,headY+.1+Math.cos(a)*.03,-.05-Math.abs(i-3)*.015).castShadow=false;}
  for(let i=0;i<6;i++){const a=i*1.2;sphere(body,.018,dark,Math.cos(a)*.32,.3+i*.1,Math.sin(a)*.28,1,1.4,1).castShadow=false;}}
 if(core)g.userData.core=core;
 return Object.assign(actor(g,body,legs,tail,[],k==='earth'?'idle':'hover'),core?{core}:{});
}
const ELEMENTALS={'air elemental':{kind:'air',color:'#b8d8e8',eye:'#e8fbff'},'fire elemental':{kind:'fire',color:'#ff6a1e',hot:'#ffd84a',eye:'#fff6c0'},'earth elemental':{kind:'earth',color:'#7a6a54',eye:'#ffb040',crystal:'#7fd8c0',scale:1.1},'water elemental':{kind:'water',color:'#3a7ac8',eye:'#c8f0ff'},stalker:{kind:'air',color:'#c8c8d0',eye:'#e0e0ff'}};

// Angels: a robed figure hovering on feathered wings, with a halo and a sword. The wings
// are pivots at the shoulder blades, so the default wing beat in live.js flexes them.
const FEATHER=new THREE.SphereGeometry(1,8,6);
function angel(o){
 const g=new THREE.Group(),body=new THREE.Group(),wings=[];g.add(body);g.scale.setScalar(o.scale||1);
 const robe=mat(o.robe,{roughness:.75}),fold=mat(shade(o.robe,.82),{roughness:.8}),trim=mat(o.trim||'#d8b04a',{metalness:.7,roughness:.3}),skin=mat(o.skin||'#f0d4b8',{roughness:.7}),
  hair=mat(o.hair||'#e0c070',{roughness:.6}),plume=mat(o.wing||'#f4f0e6',{roughness:.7,side:THREE.DoubleSide}),plumeTip=mat(shade(o.wing||'#f4f0e6',.8),{roughness:.75,side:THREE.DoubleSide}),
  light=mat(o.glow||'#ffe89a',{emissive:o.glow||'#ffe89a',emissiveIntensity:2.2,roughness:.3});
 const feather=(p,x,y,z,len,w,a,m)=>{const f=part(p,FEATHER,m,x+Math.sin(-a)*len/2,y+Math.cos(a)*len/2,z);f.scale.set(w,len/2,.008);f.rotation.z=a;f.castShadow=false;return f;};
 // robe: a long gown that flares to a rippling hem above the floor, with a gold hem band and folds
 const gown=part(body,tatter(new THREE.LatheGeometry([[.2,.1],[.2,.12],[.17,.22],[.14,.38],[.13,.5],[.14,.6],[.12,.7],[.08,.76]].map(([r,h])=>new THREE.Vector2(r,h)),28),.16,.035,5),robe);gown.scale.z=.85;
 cylinder(body,.203,.2,.02,trim,0,.12,0,28).scale.z=.85;
 for(let i=0;i<6;i++){const a=(i+.5)/6*Math.PI*2;segment(body,[Math.sin(a)*.19,.13,Math.cos(a)*.16],[Math.sin(a)*.13,.5,Math.cos(a)*.11],.014,.006,fold);}
 part(body,new THREE.TorusGeometry(.135,.014,6,24),trim,0,.5,0).rotation.x=Math.PI/2;
 // chest: a gold breastplate for archons, a crossed stole otherwise
 if(o.armor){lathe(body,[[.13,.5],[.145,.58],[.135,.68],[.09,.75]],trim,0,0,.01).scale.z=.85;for(let i=0;i<2;i++)cylinder(body,.01,.01,.2,light,(i?1:-1)*.04,.62,.12,6);}
 else for(const side of [-1,1]){const s=rounded(body,.035,.3,.012,trim,side*.05,.62,.115,.006);s.rotation.set(-.2,0,side*.35);}
 // arms in wide sleeves: the right raises a sword, the left hand is open in blessing
 for(const side of [-1,1]){const sh=[side*.13,.71,0],el=side>0?[.21,.6,.08]:[-.2,.56,.06],wr=side>0?[.2,.7,.17]:[-.25,.5,.16];
  sphere(body,.05,robe,...sh);segment(body,sh,el,.045,.05,robe);segment(body,el,wr,.05,.065,robe);
  const cuff=segment(body,el,wr,.066,.068,trim);cuff.scale.y=.12;cuff.position.set(...wr.map((v,i)=>v-(wr[i]-el[i])*.06));
  hand(body,wr,side>0?[0,.3,1]:[-.2,-.3,1],side,skin);}
 if(o.sword){const s=new THREE.Group();s.position.set(.2,.72,.2);s.rotation.set(.5,0,-.25);body.add(s);
  cylinder(s,.014,.014,.08,mat('#4a3020'),0,-.02,0,8);rounded(s,.14,.02,.03,trim,0,.03,0,.008);sphere(s,.018,trim,0,-.065,0);
  const blade=rounded(s,.035,.44,.008,o.flame?mat(o.flame,{emissive:o.flame,emissiveIntensity:2.6,roughness:.2}):M.steel,0,.26,0,.004);
  if(o.flame){blade.castShadow=false;for(let i=0;i<6;i++){const f=cone(s,.02,.09,light,(i%2?1:-1)*.02,.1+i*.065,0,5);f.rotation.z=(i%2?-1:1)*.35;f.castShadow=false;}}}
 // head: a calm face with softly glowing eyes and long golden locks
 const headY=.86;cylinder(body,.035,.04,.08,skin,0,.78,0,10);sphere(body,.085,skin,0,headY,.01,1,1.08,1);
 for(const side of [-1,1])sphere(body,.013,light,side*.032,headY+.01,.08,1,.7,.6).castShadow=false;
 sphere(body,.093,hair,0,headY+.025,-.01,1.02,1,1).scale.set(1.03,1,1);
 for(let i=0;i<7;i++){const a=(i-3)*.42;tube(body,[[Math.sin(a)*.085,headY+.02,Math.cos(a)*.06-.02],[Math.sin(a)*.1,headY-.06,Math.cos(a)*.05-.04],[Math.sin(a)*.09,headY-.14,Math.cos(a)*.04-.06]],.022,hair,6).scale.z=.9;}
 // halo: a glowing ring over the head; archons wear a crown of light rays on it
 const halo=part(body,new THREE.TorusGeometry(.1,.011,8,32),light,0,headY+.14,-.03);halo.rotation.x=Math.PI/2-.25;halo.castShadow=false;
 if(o.rays)for(let i=0;i<9;i++){const a=i/9*Math.PI*2,r=cone(halo,.012,.07,light,Math.cos(a)*.1,Math.sin(a)*.1,0,4);r.rotation.z=a-Math.PI/2;r.castShadow=false;}
 // wings: a pivot at each shoulder blade holding a leading-edge bone, long primaries fanning
 // down from it and a shorter covert row over their roots
 for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(side*.07,.7,-.1);body.add(pivot);
  const wing=new THREE.Group();wing.rotation.y=side*.45;pivot.add(wing);const span=o.span||.75;
  const edge=[];for(let i=0;i<=6;i++){const t=i/6;edge.push([side*(.02+.44*t)*span,(.02+.28*Math.sin(t*2.4))*span,-.01]);}
  tube(wing,edge,.018,plume,16);
  for(let i=0;i<11;i++){const t=i/10,x=side*(.03+.43*t)*span,y=(.02+.28*Math.sin(t*2.4))*span,len=(.2+.2*t+.06*Math.sin(t*3))*span;
   feather(wing,x,y,-.015,len,.04,Math.PI+side*(.1+1.2*t),i>7?plumeTip:plume);
   if(i<9)feather(wing,x,y+.01,-.004,len*.55,.045,Math.PI+side*(.15+1.1*t),plume);}
  pivot.userData.side=side;wings.push(pivot);}
 return actor(g,body,[],null,wings,'hover');
}
const ANGELS={angel:{robe:'#eeeae0',sword:true,flame:'#ff9a3a'},aleax:{robe:'#b8b0a0',trim:'#9aa4aa',hair:'#6a4a2a',wing:'#dcd6ca',glow:'#fff4d0',sword:true,span:.65},archon:{robe:'#f6f2ea',trim:'#e0b83a',armor:true,rays:true,sword:true,flame:'#bfe4ff',glow:'#fff2b0',scale:1.15,span:.85}};

const VAMPIRES={vampire:{},'vampire lord':{suit:'#2a1420',lining:'#b01828',collar:.3,medallion:true,scale:1.05},'vampire mage':{suit:'#221a30',cape:'#2a1440',lining:'#6a2a9a',eye:'#d06aff',orb:'#b070ff',scale:1.05},'vlad the impaler':{suit:'#3a1418',cape:'#1a0c10',lining:'#c8a040',vlad:true,scale:1.1}};

// Jabberwocks, after Tenniel: a hunched, upright beast on two big clawed legs, with a scaly belly, a long
// serpentine neck, a buck-toothed fish-like head with barbels and eyes of flame, spindly clawed forearms,
// ragged bat wings on finger bones and a long tail. The wings beat with the default wing sway and the tail swings.
function jabberwock(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[],wings=[];g.add(body);g.scale.setScalar(o.scale||1);
 const hide=mat(o.hide,{roughness:.8}),dark=mat(shade(o.hide,.6),{roughness:.85}),belly=mat(o.belly,{roughness:.7}),claw=mat('#1a1410',{roughness:.35,metalness:.2}),
  tooth=mat('#e8e0c4',{roughness:.4}),flame=mat(o.eye,{emissive:o.eye,emissiveIntensity:3,roughness:.3}),mouth=mat('#3a0e10',{roughness:1}),
  web=mat(o.wing||shade(o.hide,.7),{roughness:.85,side:THREE.DoubleSide,transparent:true,opacity:.92});
 // legs: thick thighs bent forward, thin shins and three long hooked toes plus a spur
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.14,.44,-.04);body.add(leg);
  segment(leg,[0,0,0],[side*.03,-.2,.1],.085,.06,hide);segment(leg,[side*.03,-.2,.1],[side*.03,-.4,-.02],.05,.035,dark);
  sphere(leg,.05,hide,side*.03,-.2,.1);
  for(let k=-1;k<=1;k++){segment(leg,[side*.03,-.41,-.01],[side*.03+k*.05,-.42,.1],.02,.012,dark);const c=cone(leg,.014,.06,claw,side*.03+k*.052,-.43,.13,4);c.rotation.x=Math.PI/2+.4;}
  cone(leg,.012,.05,claw,side*.03,-.41,-.06,4).rotation.x=-Math.PI/2;legs.push(leg);}
 // torso: a hunched, pot-bellied trunk with plated belly scales and a spined back
 const torso=sphere(body,.2,hide,0,.66,0,1,1.25,.95);torso.rotation.x=.3;
 for(let i=0;i<5;i++){const s=sphere(body,.13-i*.008,belly,0,.5+i*.075,.1+i*.012,1.2,.35,.7);s.rotation.x=-.3;}
 for(let i=0;i<5;i++){const sp=cone(body,.022,.08,dark,0,.6+i*.08,-.17+i*.03,4);sp.rotation.x=-1.1+i*.12;}
 // forearms: long and thin, held up and forward, each with four raking claws
 for(const side of [-1,1]){
  segment(body,[side*.15,.82,.06],[side*.21,.66,.16],.035,.028,hide);segment(body,[side*.21,.66,.16],[side*.19,.72,.3],.026,.02,hide);
  for(let k=0;k<4;k++){const c=cone(body,.01,.08,claw,side*(.16+k*.018),.72,.35,4);c.rotation.x=Math.PI/2+.5;c.rotation.z=side*(k-1.5)*.15;}}
 // neck: a long S-curve with a row of spines, rising up and bending forward to the head
 const neck=[[0,.82,.04],[0,1.02,-.02],[0,1.18,.06],[0,1.24,.2]];tube(body,neck,.055,hide,18);
 for(let i=0;i<4;i++){const p=neck[i];cone(body,.018,.07,dark,0,p[1]+.04,p[2]-.05,4).rotation.x=-.9+i*.3;}
 // head: long snout, flat cranium, rows of buck teeth, barbels, antennae and eyes of flame
 const head=new THREE.Group();head.position.set(0,1.25,.24);body.add(head);
 sphere(head,.1,hide,0,0,.02,1,.8,1.1);sphere(head,.065,hide,0,-.02,.12,1,.7,1.2);
 const jaw=sphere(head,.055,belly,0,-.07,.1,1,.45,1.3);jaw.rotation.x=.25;cylinder(head,.04,.04,.01,mouth,0,-.05,.17,10).rotation.x=Math.PI/2;
 for(const x of [-.018,.018])rounded(head,.03,.045,.012,tooth,x,-.06,.2,.004);
 for(let k=-2;k<=2;k++)if(k)cone(head,.008,.03,tooth,k*.02,-.075,.17-Math.abs(k)*.015,4).rotation.x=Math.PI;
 for(const side of [-1,1]){
  sphere(head,.028,flame,side*.055,.045,.08);sphere(head,.016,dark,side*.055,.07,.075,1.4,.4,1);
  tube(head,[[side*.03,-.05,.17],[side*.07,-.1,.2],[side*.1,-.17,.18],[side*.12,-.22,.2]],.006,dark,8);
  tube(head,[[side*.03,.07,.04],[side*.06,.16,.03],[side*.1,.22,.08],[side*.13,.24,.14]],.007,dark,8);
  const ear=cone(head,.035,.08,dark,side*.09,.02,-.04,4);ear.rotation.set(-.6,0,-side*1.2);}
 // wings: bat wings on three finger bones, the membrane a ragged, scalloped fan
 for(const side of [-1,1]){const wing=new THREE.Group();wing.position.set(side*.1,.88,-.1);body.add(wing);
  const tips=[[side*.26,.46],[side*.46,.3],[side*.52,.06],[side*.36,-.14]],shape=new THREE.Shape();shape.moveTo(0,0);
  tips.forEach(([x,y],i)=>{shape.lineTo(x,y);if(i<tips.length-1){const [nx,ny]=tips[i+1];shape.quadraticCurveTo((x+nx)*.38,(y+ny)*.38,nx,ny);}});shape.lineTo(side*.04,-.1);shape.lineTo(0,0);
  const m=part(wing,new THREE.ShapeGeometry(shape,6),web);m.castShadow=true;
  segment(wing,[0,0,0],[side*.12,.24,.005],.022,.016,hide);for(const [x,y] of tips.slice(0,3))segment(wing,[side*.12,.24,.005],[x,y,.005],.012,.005,dark);
  cone(wing,.012,.05,claw,side*.12,.27,.005,4);wing.rotation.y=side*-.35;wings.push(wing);}
 // tail: long and tapering, swept back and curling up, ending in a barbed tip
 const tail=new THREE.Group();tail.position.set(0,.55,-.16);body.add(tail);
 const tailPts=[[0,0,0],[0,-.12,-.16],[.06,-.2,-.34],[.14,-.18,-.48],[.12,-.08,-.58]];
 part(tail,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tailPts.map(p=>new THREE.Vector3(...p))),20,.045,8,false),hide);
 for(let i=1;i<4;i++){const p=tailPts[i];cone(tail,.015,.05,dark,p[0],p[1]+.045,p[2],4).rotation.x=-.5;}
 const barb=cone(tail,.03,.08,claw,.12,-.06,-.62,4);barb.rotation.x=-1.3;
 return actor(g,body,legs,tail,wings,'dragon');
}
const JABBERWOCKS={jabberwock:{hide:'#c85a2a',belly:'#d8b070',eye:'#ffb030',wing:'#6a2e24',scale:.95},'vorpal jabberwock':{hide:'#7a3fa0',belly:'#c8a0d8',eye:'#80f0ff',wing:'#3a1f50',scale:1.02}};

// trappers (t): a broad, ragged mantle flattened against the floor like a dropped cloak, mottled to match the stone,
// with warty ridges, a fringed dark hem, and a wide toothed maw with stalked eyes along the front edge;
// the front lip and back hem are the leg pivots, so they lift and ripple as it creeps
function trapper(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(o.scale||1);
 const hide=mat(o.hide,{roughness:.95}),mottle=mat(shade(o.hide,.68),{roughness:.95}),hem=mat(shade(o.hide,.42),{roughness:1,side:THREE.DoubleSide}),
  wart=mat(shade(o.hide,1.18),{roughness:.9}),mouth=mat('#2a0c10',{roughness:1}),gum=mat('#6a2230',{roughness:.7}),tooth=mat('#d8ceb0',{roughness:.45}),
  eye=mat(o.eye,{emissive:o.eye,emissiveIntensity:1.6,roughness:.3}),stalk=mat(shade(o.hide,.8),{roughness:.9});
 // ragged outline: radius wobbles around the circle, and the mantle is a little longer than it is wide
 const ragged=(geo,amp)=>{const pos=geo.attributes.position,v=new THREE.Vector3();for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);const a=Math.atan2(v.x,v.z),k=1+amp*(Math.sin(a*5+.7)+.5*Math.sin(a*11+2.1)+.3*Math.sin(a*17));pos.setXYZ(i,v.x*k,v.y,v.z*k*1.06);}geo.computeVertexNormals();return geo;};
 const mantle=(parent,profile,amp,material,phiStart,phiLength,z=0)=>{const m=part(parent,ragged(new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),40,phiStart,phiLength),amp),material,0,0,z);return m;};
 // the domed middle and its fringed hem, which lies just under the rim and pokes out in tatters
 mantle(body,[[0,.13],[.12,.125],[.22,.1],[.3,.065],[.36,.03],[.38,.012]],.05,hide);
 mantle(body,[[.3,.018],[.36,.012],[.42,.004]],.07,hem);
 // mottled blotches and warty ridges across the back
 for(let i=0;i<9;i++){const a=i*2.39,r=.06+(i%4)*.065;sphere(body,.05+(i%3)*.012,mottle,Math.sin(a)*r,.105-r*.14,Math.cos(a)*r*1.1,1.2,.18,1);}
 for(let i=0;i<14;i++){const a=i*1.7+.3,r=.1+(i%5)*.045;sphere(body,.016+(i%2)*.006,wart,Math.sin(a)*r,.125-r*.2,Math.cos(a)*r*1.1,1,.7,1);}
 for(const side of [-1,1])tube(body,[[side*.05,.13,-.2],[side*.1,.125,-.05],[side*.1,.12,.1],[side*.06,.11,.22]],.012,wart,10);
 // front lip: a separate flap carrying the maw and eyes, so it can rear up
 const lip=new THREE.Group();lip.position.set(0,.02,.2);body.add(lip);
 mantle(lip,[[0,.08],[.1,.07],[.16,.045],[.2,.012]],.04,hide,-Math.PI/2,Math.PI,.02);
 mantle(lip,[[.16,.012],[.22,.004]],.07,hem,-Math.PI/2,Math.PI,.02);
 const maw=part(lip,new THREE.TorusGeometry(.13,.02,6,18,Math.PI),gum,0,.035,.1);maw.rotation.x=Math.PI/2;maw.scale.set(1,.55,1);
 const throat=part(lip,new THREE.CircleGeometry(.12,18,Math.PI,Math.PI),mouth,0,.036,.1);throat.rotation.x=-Math.PI/2;throat.scale.set(1,.5,1);
 for(let k=0;k<11;k++){const a=Math.PI*(k+.5)/11,t=cone(lip,.009,.03,tooth,Math.cos(a)*.12,.045,.1+Math.sin(a)*.06,4);t.rotation.x=Math.PI;}
 for(const [x,h] of [[-.1,.07],[-.035,.1],[.035,.1],[.1,.07]]){tube(lip,[[x*.8,.06,.02],[x*.95,.06+h*.6,.03],[x,.06+h,.05]],.007,stalk,6);sphere(lip,.018,eye,x,.06+h,.055);sphere(lip,.008,mouth,x,.06+h,.07);}
 legs.push(lip);
 // back hem: the trailing edge of the mantle, rippling behind
 const back=new THREE.Group();back.position.set(0,.01,-.26);body.add(back);
 mantle(back,[[0,.05],[.12,.04],[.18,.018],[.22,.004]],.08,hide,Math.PI/2,Math.PI,-.02);
 legs.push(back);
 return actor(g,body,legs,null,[],'idle');
}
const TRAPPERS={'lurker above':{hide:'#4a4452',eye:'#c8e040',scale:.9},trapper:{hide:'#6a6f5e',eye:'#ff8a3a',scale:1}};

// Sea monsters (;): wet, glossy swimmers. Fish and eels hang their back half on the actor tail. That group is tipped
// over (rotation.x=-PI/2) so that live.js's tail swing (rotation.z) becomes a side-to-side sweep. Inside it, local +y points
// backwards and local +z points up. Jellyfish trail their tentacles from the swaying tail. Krakens spread their arms as leg pivots.
function finShape(parent,pts,material,x=0,y=0,z=0){const s=new THREE.Shape();s.moveTo(...pts[0]);for(const p of pts.slice(1))s.lineTo(...p);return part(parent,new THREE.ShapeGeometry(s),material,x,y,z);}
function seaMonster(o){
 const g=new THREE.Group(),body=new THREE.Group(),legs=[];g.add(body);g.scale.setScalar(o.scale||1);
 const skin=mat(o.color,{roughness:.35,metalness:.05}),belly=mat(o.belly||shade(o.color,1.6),{roughness:.4}),dark=mat(shade(o.color,.55),{roughness:.4}),
  fin=mat(o.fin||shade(o.color,.8),{roughness:.45,side:THREE.DoubleSide}),eye=mat(o.eye||'#e8d860',{emissive:o.eye||'#e8d860',emissiveIntensity:.9,roughness:.2}),
  pupil=mat('#0a0a0c',{roughness:.2}),tooth=mat('#ece6d2',{roughness:.35}),mouth=mat('#2a0c10',{roughness:1});
 const swingTail=(z,y)=>{const t=new THREE.Group();t.position.set(0,y,z);t.rotation.x=-Math.PI/2;body.add(t);return t;};
 if(o.form==='jelly'){
  const glass=mat(o.color,{roughness:.15,transparent:true,opacity:.62,emissive:o.color,emissiveIntensity:.35,side:THREE.DoubleSide}),
   rim=mat(shade(o.color,1.3),{emissive:o.color,emissiveIntensity:.8,roughness:.2});
  lathe(body,[[0,.72],[.1,.71],[.18,.67],[.23,.6],[.25,.53],[.24,.5]],glass);
  sphere(body,.1,rim,0,.6,0,1,.55,1);
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;sphere(body,.022,rim,Math.sin(a)*.24,.5,Math.cos(a)*.24,1,.6,1);}
  const tail=new THREE.Group();tail.position.y=.52;body.add(tail);
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2+.2,r=.2,pts=[];for(let k=0;k<=5;k++){const t=k/5;pts.push([Math.sin(a)*r*(1-t*.3)+Math.sin(t*6+i)*.03,-t*.46,Math.cos(a)*r*(1-t*.3)+Math.cos(t*6+i)*.03]);}tube(tail,pts,.006,glass,12);}
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2+.8,pts=[];for(let k=0;k<=6;k++){const t=k/6;pts.push([Math.sin(a)*.05+Math.sin(t*9+i)*.035,-t*.36,Math.cos(a)*.05+Math.cos(t*9+i)*.035]);}tube(tail,pts,.022-.004*(i%2),rim,18);}
  return actor(g,body,[],tail,[],'hover');
 }
 if(o.form==='kraken'){
  // a tall, backward-tilted squid mantle with a lateral fin, great round eyes, a ring of curling arms and two long clubbed tentacles
  const mantle=lathe(body,[[0,0],[.14,.03],[.2,.14],[.19,.3],[.14,.44],[.06,.54],[0,.57]],skin,0,.22,-.08);mantle.rotation.x=-.45;
  for(const side of [-1,1]){const f=finShape(body,[[0,0],[.16,.1],[.02,.2]],fin,side*.12,.62,-.28);f.rotation.y=side>0?0:Math.PI;f.rotation.x=-.45;}
  for(let i=0;i<7;i++){const a=i*2.3,r=.1+(i%3)*.04;sphere(body,.028,dark,Math.sin(a)*r*.9,.36+i*.035,.02-i*.035+Math.cos(a)*.05,1,.4,1);}
  for(const side of [-1,1]){sphere(body,.07,eye,side*.14,.3,.1);sphere(body,.036,pupil,side*.175,.3,.14,.6,1.2,.6);}
  sphere(body,.06,dark,0,.2,.14,1.2,.8,1);
  const n=o.arms||8;
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2,arm=new THREE.Group();arm.position.set(Math.sin(a)*.08,.18,Math.cos(a)*.08+.04);arm.rotation.y=a;body.add(arm);
   const pts=[];for(let k=0;k<=8;k++){const t=k/8,r=.02+t*.4,curl=t*t*2.2*(i%2?1:-1);pts.push([Math.sin(curl)*r*.4,.02-t*.17+Math.max(0,t-.75)*.5,r*Math.cos(curl*.4)]);}
   tube(arm,pts,.028,skin,20);for(let k=2;k<8;k+=2){const p=pts[k];sphere(arm,.012,belly,p[0],p[1]-.02,p[2],1,.5,1);}
   legs.push(arm);}
  for(const side of [-1,1]){const pts=[[side*.04,.2,.12],[side*.12,.3,.3],[side*.2,.42,.38],[side*.24,.5,.34]];tube(body,pts,.016,skin,16);sphere(body,.045,belly,side*.25,.52,.33,1,1.6,1);}
  return actor(g,body,legs,null,[],'idle');
 }
 if(o.form==='eel'){
  // a sinuous eel reared out of the water: the rear coils lie low (on the tail, so they sweep), the front rises in an S to a gaping head
  const front=[[0,.06,-.05],[0,.12,.02],[.04,.26,.06],[0,.38,.08],[-.02,.44,.14]];
  tube(body,front,.05,skin,24);
  const tail=swingTail(-.05,.06),rear=[[0,0,0],[.12,.06,-.01],[.2,.2,-.02],[.08,.34,-.03],[-.12,.36,-.04],[-.2,.24,-.045],[-.16,.12,-.05]];
  const taper=(pts,r0)=>{for(let i=0;i<pts.length-1;i++)segment(tail,pts[i],pts[i+1],r0*(1-i/pts.length*.8),r0*(1-(i+1)/pts.length*.8),skin);for(let i=1;i<pts.length-1;i++)sphere(tail,r0*(1-i/pts.length*.8),skin,...pts[i]);};
  taper(rear,.05);
  for(let i=1;i<rear.length;i++){const p=rear[i],f=cone(tail,.012,.06,fin,p[0],p[1],p[2]+.05,4);f.rotation.x=Math.PI/2;}
  for(let i=0;i<front.length-1;i++){const p=front[i];const f=cone(body,.01,.05,fin,p[0],p[1]+.04,p[2]-.03,4);f.rotation.x=-.4;}
  const head=new THREE.Group();head.position.set(-.02,.46,.17);head.rotation.x=.25;body.add(head);
  sphere(head,.06,skin,0,.01,.04,1,.8,1.7);sphere(head,.045,belly,0,-.03,.05,1,.45,1.6);
  const jaw=sphere(head,.04,skin,0,-.045,.07,1,.4,1.6);jaw.rotation.x=.3;
  part(head,new THREE.CircleGeometry(.035,12),mouth,0,-.02,.135).scale.set(1,.6,1);
  for(let k=0;k<6;k++){const x=(k-2.5)*.012;cone(head,.005,.018,tooth,x,-.005,.125,4).rotation.x=Math.PI;cone(head,.005,.016,tooth,x,-.04,.12,4);}
  for(const side of [-1,1]){sphere(head,.015,eye,side*.045,.03,.09);sphere(head,.007,pupil,side*.055,.035,.1);}
  if(o.spark){const glow=mat(o.spark,{emissive:o.spark,emissiveIntensity:2.4,roughness:.3});for(const p of rear.slice(1))sphere(tail,.014,glow,p[0]+.03,p[1],p[2]+.03);for(const p of front.slice(1,4))sphere(body,.014,glow,p[0]+.035,p[1],p[2]+.02);}
  return actor(g,body,[],tail,[],'snake');
 }
 // fish: a tapered torpedo (shark) or a deep, blunt body with an underbite (piranha), side eyes, dorsal and pectoral fins,
 // and the back third plus the caudal fin on the swinging tail
 const L=o.length||.42,H=o.depth||.13,y=o.swim||.32;
 sphere(body,H,skin,0,y,.02,.8,1,L/H*.62);
 const under=sphere(body,H*.92,belly,0,y-H*.28,.04,.74,.62,L/H*.58);
 const tail=swingTail(-L*.5,y);
 cone(tail,H*.62,L*.6,skin,0,L*.3,0,14).scale.set(.8,1,1);
 finShape(tail,[[0,L*.5],[H*1.5,L*.8],[H*.4,L*.66],[-H*1.2,L*.8]],fin).rotation.y=-Math.PI/2;
 const dorsal=finShape(body,[[-L*.12,0],[L*.02,H*(o.dorsal||1.4)],[L*.16,0]],fin,0,y+H*.85,-L*.08);dorsal.rotation.y=-Math.PI/2;
 for(const side of [-1,1]){const p=finShape(body,[[0,0],[H*1.2,-H*.4],[H*.5,.02]],fin,side*H*.7,y-H*.35,L*.12);p.rotation.set(-Math.PI/2+.2,0,side>0?-.25:Math.PI+.25);}
 for(const side of [-1,1]){sphere(body,H*.18,eye,side*H*.72,y+H*.25,L*.62);sphere(body,H*.09,pupil,side*H*.82,y+H*.27,L*.66);}
 if(o.gills)for(const side of [-1,1])for(let k=0;k<5;k++){const s=part(body,new THREE.BoxGeometry(.004,H*.7,.01),dark,side*H*.79,y,L*.36-k*.035);s.rotation.z=side*.1;}
 // mouth: a dark slit under the snout lined with teeth; a piranha's jaw juts forward
 const jawZ=L*(o.underbite?.8:.66),jawY=y-H*(o.underbite?.35:.5);
 const slit=part(body,new THREE.TorusGeometry(H*.42,H*.1,6,14,Math.PI),mouth,0,jawY,jawZ-H*.25);slit.rotation.x=Math.PI/2;slit.rotation.z=Math.PI;
 for(let k=0;k<9;k++){const a=Math.PI*(k+.5)/9,t=cone(body,H*.06,H*.2,tooth,Math.cos(a)*H*.42,jawY+H*.05,jawZ-H*.25+Math.sin(a)*H*.42,4);t.rotation.x=Math.PI;}
 if(o.underbite)for(let k=0;k<7;k++){const a=Math.PI*(k+.5)/7;cone(body,H*.06,H*.22,tooth,Math.cos(a)*H*.38,jawY+H*.02,jawZ-H*.12+Math.sin(a)*H*.3,4);}
 return actor(g,body,[],tail,[],'hover');
}
const SEA_MONSTERS={jellyfish:{form:'jelly',color:'#7fa8e8',scale:.9},piranha:{form:'fish',color:'#8a8a94',belly:'#c83a2a',fin:'#6a5a5a',length:.26,depth:.13,underbite:true,dorsal:1,scale:.8},
 shark:{form:'fish',color:'#6a7686',belly:'#e4e4de',length:.4,depth:.12,dorsal:1.9,gills:true,eye:'#1a1a1c'},'giant eel':{form:'eel',color:'#4a5a3a',belly:'#b0a86a',eye:'#e0d040'},
 'electric eel':{form:'eel',color:'#2a4a6a',belly:'#8ab0c0',eye:'#c0e8ff',spark:'#9ae8ff'},kraken:{form:'kraken',color:'#8a3a3a',belly:'#e0a8a0',eye:'#f0c040',scale:1.1},
 'watcher in the water':{form:'kraken',color:'#4a5a52',belly:'#9aa89a',eye:'#b8ff90',arms:12,scale:1.2}};

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
 if(WRAITHS[name])return wraith(WRAITHS[name]);
 if(VAMPIRES[name])return vampire(VAMPIRES[name]);
 if(XORNS[name])return xorn(XORNS[name]);
 if(NAGAS[name])return naga(NAGAS[name]);
 if(RUST_MONSTERS[name])return rustMonster(RUST_MONSTERS[name]);
 if(UMBER_HULKS[name])return umberHulk(UMBER_HULKS[name]);
 if(LEPRECHAUNS[name])return leprechaun(LEPRECHAUNS[name]);
 if(ELEMENTALS[name])return elemental(ELEMENTALS[name]);
 if(ANGELS[name])return angel(ANGELS[name]);
 if(JABBERWOCKS[name])return jabberwock(JABBERWOCKS[name]);
 if(TRAPPERS[name])return trapper(TRAPPERS[name]);
 if(SEA_MONSTERS[name])return seaMonster(SEA_MONSTERS[name]);
 if(name==='couatl')return snake({color:'#3f9a6a',belly:'#e0c040',scale:1.2});
 if(name==='ki-rin')return unicorn();
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
  case 'X':return xorn({stone:shade(c,.9),eye:c});
  case 'N':return naga({color:c,crest:/hatchling/.test(name)?null:'spines',baby:/hatchling/.test(name)});
  case 'V':return vampire({lining:c,eye:c});
  case 'W':return wraith({robe:shade(c,.6),glow:c});
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
  case 'R':return rustMonster({color:c});
  case 'U':return umberHulk({color:shade(c,.7),eye:'#d8a040'});
  case 'l':return leprechaun({coat:c});
  case 'E':return elemental({kind:/fire/.test(name)?'fire':/earth/.test(name)?'earth':/water/.test(name)?'water':'air',color:c,eye:'#ffffff'});
  case 'J':return jabberwock({hide:c,belly:shade(c,1.4),eye:'#ffb030'});
  case 'A':return angel({robe:shade(c,1.2),trim:'#d8b04a',sword:true});
  case ';':return seaMonster({form:'eel',color:c,eye:'#e0d040'});
  case 't':return trapper({hide:shade(c,.8),eye:'#e0c040'});
  case 'n':return nymph({skin:'#eec7a8',cloth:shade(c,.35),trim:c,hair:'#2a2018'});
  case "'":return golem(GOLEM_MATERIALS.stone);
 }
 return guardian({color});
}
