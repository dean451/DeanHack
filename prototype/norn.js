import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The Norn (the Valkyrie quest leader) used to be the generic '@' humanoid. She is now a seeress of
// fate: a gaunt, ash-grey crone in a ragged, ground-length robe of soot-black wool with a frayed,
// trailing hem, a deep hood over a skull-thin face with sunken sockets and two cold pale eyes,
// long lank white hair spilling from the hood, and bony hands with long dark nails. She leans on a
// gnarled, rune-scored staff crowned with a tangle of knotted threads, the threads of fate, hung
// with bone beads. Each moving part (body, head, each leg and arm, the staff) is one merged,
// vertex-coloured mesh with one shared material: 7 draws. Geometry is built once and shared.
// Handles match valkyrie.js: legs, arms, arm (the staff arm), weaponSocket, head, body.

const ROBE=rgb('#2a2824'),ROBE_DARK=rgb('#141310'),ROBE_PALE=rgb('#4a463e'),SKIN=rgb('#9a978c'),SKIN_DARK=rgb('#5c5a54');
const HAIR=rgb('#cfcabd'),HAIR_DARK=rgb('#8a8678'),EYE=rgb('#bfe4f0'),NAIL=rgb('#1e1a16');
const WOOD=rgb('#4a3a2a'),WOOD_DARK=rgb('#251c14'),RUNE=rgb('#7ac0d0'),BONE=rgb('#d8d0b8'),THREAD=rgb('#8a2a24');
const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};

function lathe(profile,segments=24){return new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);}

function buildBody(){
 const P=pieces();
 // the robe: wide at the frayed hem, narrow at the stooped shoulders, mottled with soot
 P.add(lathe([[.25,.0],[.22,.15],[.17,.45],[.17,.7],[.19,.82],[.1,.9]],28),at(0,0,0,[0,0,0],[1,1,.85]),(x,y,z)=>mix(ROBE_DARK,mix(ROBE,ROBE_PALE,hash(Math.round(x*40)+Math.round(z*40)*7)),(y-.0)/.4));
 // a ragged hem of torn tails
 for(let i=0;i<14;i++){const a=i/14*Math.PI*2;P.add(new THREE.ConeGeometry(.04,.1+hash(i)*.08,4),at(Math.sin(a)*.245,.1,Math.cos(a)*.21,[Math.PI,a,0],[1,1,.4]),ROBE_DARK);}
 // a knotted cord at the waist and the shroud over the shoulders
 P.add(new THREE.TorusGeometry(.172,.01,5,28),at(0,.55,0,[Math.PI/2,0,0],[1,.85,1]),THREAD);
 P.add(lathe([[.2,.76],[.23,.8],[.19,.9],[.07,.95]],28),at(0,0,-.005,[0,0,0],[1,1,.85]),ROBE_PALE);
 P.add(new THREE.CylinderGeometry(.04,.05,.07,8),at(0,.93,0),SKIN_DARK);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // a thin skull face deep in the hood, hollow cheeks, a hooked nose, a lipless line of mouth
 P.add(new THREE.SphereGeometry(.085,14,10),at(0,.1,.01,[0,0,0],[.9,1.1,.95]),(x,y,z)=>mix(SKIN_DARK,SKIN,(z+.02)*8));
 P.add(new THREE.ConeGeometry(.016,.05,5),at(0,.09,.09,[Math.PI/2+.5,0,0]),SKIN);
 P.add(new THREE.BoxGeometry(.05,.006,.01),at(0,.04,.08),ROBE_DARK);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.03,8,6),at(s*.036,.125,.06,[0,0,0],[1,.8,.7]),ROBE_DARK);
  P.add(new THREE.SphereGeometry(.009,6,4),at(s*.036,.125,.078),EYE);
  P.add(new THREE.SphereGeometry(.022,8,6),at(s*.05,.05,.055,[0,0,0],[1,1,.6]),SKIN_DARK);
 }
 // the hood, peaked and slumped, its mouth shadowed
 P.add(new THREE.SphereGeometry(.13,16,10,0,Math.PI*2,0,Math.PI*.62),at(0,.1,-.02,[-.25,0,0],[1,1.15,1.1]),(x,y,z)=>mix(ROBE_DARK,ROBE,(z+.1)*3));
 P.add(new THREE.ConeGeometry(.06,.13,8),at(0,.27,-.07,[-.7,0,0]),ROBE);
 // long lank hair from under the hood, over the shoulders and down the back
 for(let i=0;i<9;i++){const x=(i/8-.5)*.2;P.add(new THREE.CylinderGeometry(.004,.008,.34+hash(i)*.14,4),at(x,-.07,.07-hash(i*3)*.1,[hash(i)*.15,0,x*1.5]),(xx,y)=>mix(HAIR_DARK,HAIR,(y+.3)*3));}
 return P.merge();
}

function buildLeg(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.045,.04,.4,8),at(0,-.2,0),ROBE_DARK);
 P.add(new THREE.BoxGeometry(.08,.04,.16),at(0,-.45,.04),ROBE_DARK);
 return P.merge();
}

// a long ragged sleeve over a bony arm ending in a grey hand with long dark nails
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.058,10,8),at(0,-.01,0),ROBE);
 P.add(new THREE.CylinderGeometry(.052,.07,.28,10,4),at(0,-.15,0),(x,y)=>mix(ROBE_PALE,ROBE_DARK,-(y+.04)*4));
 P.add(new THREE.CylinderGeometry(.018,.014,.1,6),at(0,-.3,0),SKIN);
 P.add(new THREE.SphereGeometry(.028,8,6),at(0,-.37,.005,[0,0,0],[.8,1.2,.9]),SKIN);
 for(let i=0;i<4;i++)P.add(new THREE.ConeGeometry(.005,.04,4),at((i-1.5)*.012,-.405,.012,[Math.PI,0,0]),NAIL);
 return P.merge();
}

// a gnarled, rune-scored staff, built along +y from the grip, crowned with knotted threads and bone beads
function buildStaff(){
 const P=pieces(),len=1.3;
 P.add(new THREE.CylinderGeometry(.014,.02,len,6,8),at(0,len/2-.45,0),(x,y)=>Math.sin(y*90)>.85?RUNE:mix(WOOD_DARK,WOOD,hash(Math.round(y*60))));
 for(const [y,s] of [[.15,1],[.4,-1],[.62,1]])P.add(new THREE.SphereGeometry(.026,6,5),at(s*.014,y,0,[0,0,0],[1,1.3,1]),WOOD_DARK);
 for(let i=0;i<3;i++)P.add(new THREE.TorusGeometry(.05+i*.012,.004,4,14),at(0,.74+i*.02,0,[1.1+i*.5,i*1.2,i*.7]),THREAD);
 for(let i=0;i<5;i++){const a=i*1.3;P.add(new THREE.SphereGeometry(.009,6,4),at(Math.sin(a)*.06,.7-i*.03,Math.cos(a)*.06),BONE);}
 return P.merge();
}

let S=null,material=null;
function geometry(){
 if(S)return S;
 material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.05,side:THREE.DoubleSide});
 S={body:buildBody(),head:buildHead(),leg:buildLeg(),arm:buildArm(),staff:buildStaff()};
 return S;
}
function mesh(parent,geo,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createNorn(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,.955,0);body.add(head);
 mesh(head,S.head,'head');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.08,.47,0);body.add(leg);mesh(leg,S.leg,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.215,.82,0);body.add(arm);mesh(arm,S.arm,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.012);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.staff,'staff');
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'norn',arms,arm:arms[1],weaponSocket,shieldArm:arms[0],shield:null,head,hat:null,beard:null,pick:null};
}
