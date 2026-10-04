import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The warrior (the Valkyrie quest guardians) used to be the generic '@' humanoid. It is now a
// battle-scarred shield-warrior of the north: a grim, weathered face with a split brow and a dark
// beard, under a dented iron helm with a heavy nasal and cheek guards, a rust-streaked mail byrnie
// to the knee with a dark wolf-pelt over one shoulder, a scarred leather belt, mail-sleeved arms
// with iron bracers, and wrapped legs in worn boots. It holds a broad spear upright and bears a
// battered round shield, the paint chipped to bare boards, with a notched iron rim and boss.
// Each moving part (body, head, each leg and arm, the spear, the shield) is one merged,
// vertex-coloured mesh with one shared material: 8 draws. Geometry is built once and shared.
// Handles match valkyrie.js: legs, arms, arm (the spear arm), weaponSocket, shieldArm, head, body.

const SKIN=rgb('#b08a70'),SKIN_DARK=rgb('#6e4e3c'),SCAR=rgb('#c8a090'),BEARD=rgb('#2a2018'),EYE=rgb('#d8d0b8');
const IRON=rgb('#464a4e'),IRON_DARK=rgb('#26292c'),STEEL=rgb('#8a9096'),RUST=rgb('#6a3a22');
const FUR=rgb('#3c3830'),FUR_LIGHT=rgb('#6a645a'),LEATHER=rgb('#4a3020'),LEATHER_DARK=rgb('#241810'),WRAP=rgb('#5a4c38');
const WOOD=rgb('#7a5a38'),WOOD_DARK=rgb('#3e2c1a'),PAINT=rgb('#7a2a24'),BONE=rgb('#c8c0a8');
const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const lathe=(profile,segments=28)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
// mail rings in alternating rows, rust-streaked toward the hem
const mail=(x,y,z)=>{
 const a=Math.atan2(x,z)*14,row=Math.round(y*110+(Math.round(a)%2?.5:0));
 return mix(mix(IRON,RUST,hash(Math.round(x*50)+Math.round(z*50)*3)*.5*(1-y)),row%2?STEEL:IRON_DARK,.3);
};

function buildBody(){
 const P=pieces();
 P.add(lathe([[.17,.34],[.178,.5],[.172,.62],[.185,.76],[.18,.85],[.12,.9]]),at(0,0,0,[0,0,0],[1,1,.8]),mail);
 for(let i=0;i<20;i++){const a=i/20*Math.PI*2;P.add(new THREE.ConeGeometry(.02,.05,4),at(Math.sin(a)*.172,.33,Math.cos(a)*.14,[Math.PI,a,0]),IRON_DARK);}
 P.add(new THREE.TorusGeometry(.178,.014,5,30),at(0,.54,0,[Math.PI/2,0,0],[1,.81,1]),LEATHER_DARK);
 P.add(new THREE.BoxGeometry(.04,.034,.012),at(0,.54,.146),IRON);
 // a dark wolf pelt over the left shoulder, shaggy tufts hanging down the chest and back
 P.add(new THREE.SphereGeometry(.09,10,8),at(-.17,.84,0,[0,0,.3],[1.2,.7,1.3]),(x,y)=>mix(FUR,FUR_LIGHT,hash(Math.round(x*200)+Math.round(y*200)*5)));
 for(let i=0;i<7;i++)P.add(new THREE.ConeGeometry(.02,.09+hash(i)*.05,4),at(-.19+hash(i*2)*.08,.8,(i%2?.1:-.1),[Math.PI,0,0]),FUR);
 P.add(new THREE.CylinderGeometry(.045,.052,.07,8),at(0,.93,0),SKIN_DARK);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.088,14,10),at(0,.1,.005,[0,0,0],[.95,1.05,1]),(x,y,z)=>mix(SKIN_DARK,SKIN,(z+.03)*8));
 P.add(new THREE.SphereGeometry(.07,10,8),at(0,.045,.03,[0,0,0],[1.1,.9,1]),BEARD);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.012,6,4),at(s*.036,.115,.08,[0,0,0],[1.4,.8,.6]),EYE);
  P.add(new THREE.BoxGeometry(.04,.008,.01),at(s*.036,.135,.082,[0,0,s*-.3]),BEARD);
  // cheek guards hanging from the helm
  P.add(new THREE.BoxGeometry(.012,.07,.06),at(s*.088,.08,.02),IRON);
 }
 // a split brow scar across the left eye
 P.add(new THREE.BoxGeometry(.008,.05,.006),at(-.04,.125,.088,[0,0,.4]),SCAR);
 // the dented helm: a rounded iron cap, a brow band, a long nasal, rust at the seams
 P.add(new THREE.SphereGeometry(.098,14,8,0,Math.PI*2,0,Math.PI*.5),at(0,.14,0,[0,0,0],[1,1.05,1.05]),(x,y)=>mix(IRON,RUST,hash(Math.round(x*70)+Math.round(y*70))*.5));
 P.add(new THREE.TorusGeometry(.097,.01,5,24),at(0,.14,0,[Math.PI/2,0,0]),IRON_DARK);
 P.add(new THREE.BoxGeometry(.016,.09,.012),at(0,.1,.098),STEEL);
 P.add(new THREE.ConeGeometry(.012,.04,4),at(0,.248,0),IRON_DARK);
 return P.merge();
}

function buildLeg(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.052,.044,.4,8),at(0,-.2,0),(x,y)=>mix(WRAP,LEATHER_DARK,-(y+.2)*3));
 P.add(new THREE.BoxGeometry(.09,.05,.17),at(0,-.445,.035),LEATHER_DARK);
 for(let i=0;i<5;i++)P.add(new THREE.TorusGeometry(.05,.005,4,10),at(0,-.12-i*.045,0,[Math.PI/2,0,0]),LEATHER);
 return P.merge();
}

function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.065,10,8,0,Math.PI*2,0,Math.PI*.5),at(0,-.01,0,[0,0,0],[1.05,.8,1]),mail);
 P.add(new THREE.CylinderGeometry(.054,.05,.16,10,6),at(0,-.08,0),(x,y,z)=>mail(x*1.3,y+.4,z*1.3));
 P.add(new THREE.CylinderGeometry(.042,.038,.13,8),at(0,-.25,0),IRON);
 P.add(new THREE.TorusGeometry(.043,.006,4,12),at(0,-.185,0,[Math.PI/2,0,0]),IRON_DARK);
 P.add(new THREE.SphereGeometry(.032,8,6),at(0,-.37,.005,[0,0,0],[.85,1.15,.95]),SKIN_DARK);
 return P.merge();
}

// a broad leaf-bladed spear held upright, built along +y from the grip
function buildSpear(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.013,.015,1.3,6),at(0,.3,0),(x,y)=>mix(WOOD_DARK,WOOD,hash(Math.round(y*40))));
 P.add(new THREE.SphereGeometry(.035,8,6,0,Math.PI*2,0,Math.PI),at(0,.95,0,[0,0,0],[1,1.8,.22]),(x,y)=>mix(STEEL,IRON_DARK,(.95-y)*5));
 P.add(new THREE.ConeGeometry(.03,.2,4),at(0,1.07,0,[0,0,0],[1,1,.22]),STEEL);
 P.add(new THREE.CylinderGeometry(.02,.016,.07,6),at(0,.89,0),IRON_DARK);
 for(let i=0;i<4;i++)P.add(new THREE.ConeGeometry(.008,.03,4),at(.025*(i%2?1:-1),.88-i*.008,0,[0,0,(i%2?-1:1)*1.9]),BONE);
 return P.merge();
}

// a battered round shield: bare boards where the red paint has flaked, a notched iron rim; +z is the face
function buildShield(){
 const P=pieces(),R=.16;
 P.add(new THREE.CylinderGeometry(R,R,.014,28),at(0,0,0,[Math.PI/2,0,0]),WOOD_DARK);
 P.add(new THREE.CircleGeometry(R-.004,28),at(0,0,.0075),(x,y)=>hash(Math.round(x*60)*3+Math.round(y*60)*7)>.55?WOOD:PAINT);
 P.add(new THREE.TorusGeometry(R,.009,5,36,Math.PI*1.8),at(0,0,.002,[0,0,.5]),IRON);
 P.add(new THREE.SphereGeometry(.045,14,8,0,Math.PI*2,0,Math.PI*.5),at(0,0,.006,[Math.PI/2,0,0],[1,.7,1]),IRON);
 for(let i=0;i<3;i++)P.add(new THREE.BoxGeometry(.01,.12,.004),at(Math.sin(i*2.1+.5)*.06,Math.cos(i*2.1+.5)*.06,.0085,[0,0,-i*2.1-.5]),IRON_DARK);
 P.add(new THREE.BoxGeometry(.02,.12,.01),at(0,0,-.011),LEATHER);
 return P.merge();
}

let S=null,material=null;
function geometry(){
 if(S)return S;
 material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7,metalness:.2,side:THREE.DoubleSide});
 S={body:buildBody(),head:buildHead(),leg:buildLeg(),arm:buildArm(),spear:buildSpear(),shield:buildShield()};
 return S;
}
function mesh(parent,geo,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createWarrior(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,.955,0);body.add(head);
 mesh(head,S.head,'head');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.08,.47,0);body.add(leg);mesh(leg,S.leg,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.215,.82,0);if(s>0)arm.rotation.z=.08;body.add(arm);mesh(arm,S.arm,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.012);weaponSocket.rotation.z=-.08;arms[1].add(weaponSocket);
 mesh(weaponSocket,S.spear,'spear');
 const shield=new THREE.Group();shield.position.set(-.062,-.26,.02);shield.rotation.y=-Math.PI/2;arms[0].add(shield);
 mesh(shield,S.shield,'shield');
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'warrior',arms,arm:arms[1],weaponSocket,shieldArm:arms[0],shield,head,hat:null,beard:null,pick:null};
}
