import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The monk (the player-monster role) used to be the generic '@' humanoid: a tinted box with a
// ball for a head. They now stand as a shaven-headed martial artist: a calm face with a shaded
// scalp, a saffron wrap tunic with crossed lapels falling to mid-thigh, and a maroon sash slung
// from the left shoulder to the right hip. A black cloth belt is knotted at the front with its two
// ends hanging. A loop of wooden prayer beads hangs round the neck, with a larger guru bead and a
// red tassel. Loose saffron trousers are bound from knee to ankle with pale wraps above straw
// sandals. Short wide sleeves stop at the elbow over bare forearms, with wrapped wrists and bare
// fists: the monk fights unarmed, so the hand socket is empty and a strike is the arm alone.
// Each moving part (body, head, each leg and arm) is one merged, vertex-coloured mesh with one
// shared material: 6 draws. Geometry is built once and shared.
// Handles: legs, arms, arm (the right, striking arm), weaponSocket (empty), head, body. The
// pivots match wizard.js and knight.js (shoulders ±.215 at .82, hand .37 down the arm, legs ±.08
// at .47, head at .955).

const ROBE=rgb('#e0901e'),ROBE_DARK=rgb('#a45a0e'),ROBE_HI=rgb('#f2b04a');
const SASH=rgb('#7a1e22'),SASH_DARK=rgb('#4a1014'),BELT=rgb('#22201e'),BELT_HI=rgb('#3a3632');
const SKIN=rgb('#d8a880'),SKIN_SHADE=rgb('#ab7c5c'),SCALP=rgb('#b8906e'),LIP=rgb('#a86a58');
const EYE=rgb('#2a1c14'),EYE_WHITE=rgb('#f0eae0'),BROW=rgb('#3a2a1e');
const BEAD=rgb('#6a3e20'),BEAD_HI=rgb('#9a6034'),TASSEL=rgb('#b8262a');
const WRAP=rgb('#e8dcc0'),WRAP_DARK=rgb('#b4a684'),STRAW=rgb('#c8a860'),STRAW_DARK=rgb('#8a6e38');

const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
const lathe=(profile,segments=24)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
// a ring lying flat in the xz plane, so `at` can scale it oval and then tilt it
const ring=(r,tube,radial=6,tubular=36)=>new THREE.TorusGeometry(r,tube,radial,tubular).rotateX(Math.PI/2);

function buildBody(){
 const P=pieces();
 // the tunic: from mid-thigh up over the chest, snug at the waist, with crossed lapels in front
 // (the right panel over the left, meeting at the belt) and a darker inner layer at the neck
 const tunic=[[.2,.36],[.196,.4],[.182,.5],[.168,.58],[.176,.68],[.19,.78],[.18,.86],[.13,.9],[.06,.915]];
 P.add(lathe(tunic,40),at(0,0,0,[0,0,0],[1,1,.8]),(x,y,z)=>{
  if(y<.375)return ROBE_DARK;
  const fold=Math.sin(Math.atan2(x,z)*9)*.5+.5;
  if(z>0&&y>.6){
   // the lapel edge runs from the left of the neck down to the right of the belt
   const edge=-.05+(y-.6)*-.4;
   if(Math.abs(x-edge+.02)<.012)return ROBE_HI;
   if(x<edge-.02&&y>.78)return ROBE_DARK;
  }
  return mix(ramp(ROBE_DARK,ROBE,.36,.62)(y),y<.58?ROBE_DARK:ROBE_HI,y<.58?fold*.45:.15);
 });
 P.add(new THREE.CircleGeometry(.2,28),at(0,.361,0,[Math.PI/2,0,0],[1,.8,1]),ROBE_DARK);
 // the maroon sash, slung over the left shoulder and across to the right hip
 P.add(ring(.225,.028,4,40),at(0,.7,0,[0,0,.62],[1,1.35,.74]),(x,y,z)=>Math.sin(Math.atan2(x,z)*18)>.6?SASH_DARK:SASH);
 // the black belt, knotted at the front with two hanging ends
 P.add(ring(.17,.02,5,36),at(0,.575,0,[0,0,0],[1,.8,.8]),(x,y)=>y>.585?BELT_HI:BELT);
 P.add(new THREE.SphereGeometry(.026,10,8),at(.02,.575,.14,[0,0,0],[1.2,.9,.7]),BELT_HI);
 for(const [x,r,l] of [[.01,.08,.17],[.04,-.14,.14]])P.add(new THREE.BoxGeometry(.03,l,.008),at(x+r*l*.5,.575-l*.5-.01,.142,[.06,0,r]),(px,py)=>Math.abs(py-.5)<.005?BELT_HI:BELT);
 // prayer beads round the neck, hanging lower in front, with a larger guru bead and a red tassel
 const N=26;
 for(let i=0;i<N;i++){
  const a=i/N*Math.PI*2,front=Math.max(0,Math.cos(a));
  P.add(new THREE.SphereGeometry(.012,6,4),at(Math.sin(a)*.12,.86-front*front*.13,Math.cos(a)*.1+.02*front),i%2?BEAD:BEAD_HI);
 }
 P.add(new THREE.SphereGeometry(.02,8,6),at(0,.715,.143),BEAD_HI);
 P.add(new THREE.ConeGeometry(.014,.06,6),at(0,.672,.146),TASSEL);
 // the neck
 P.add(new THREE.CylinderGeometry(.046,.052,.07,14),at(0,.93,0),SKIN_SHADE);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // a round, shaven head: the scalp is a shade darker where the hair is shaved; head centre at y .1
 P.add(new THREE.SphereGeometry(.095,20,16),at(0,.105,0,[0,0,0],[.9,1.02,.96]),(x,y,z)=>{
  if(y>.14&&z<.07)return mix(SKIN,SCALP,Math.min(1,(y-.14)*25));
  return z<-.03?SKIN_SHADE:SKIN;
 });
 // ears, a short straight nose, calm half-lidded eyes under dark brows, and a small closed mouth
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.022,8,6),at(s*.086,.1,-.004,[0,0,0],[.45,1.1,.75]),SKIN_SHADE);
  P.add(new THREE.SphereGeometry(.012,8,6),at(s*.032,.108,.08,[0,0,0],[1.3,.6,.5]),EYE_WHITE);
  P.add(new THREE.SphereGeometry(.0065,8,6),at(s*.032,.106,.085),EYE);
  P.add(new THREE.SphereGeometry(.013,8,6),at(s*.032,.115,.081,[0,0,0],[1.4,.5,.6]),SKIN);
  P.add(new THREE.BoxGeometry(.032,.006,.008),at(s*.033,.128,.083,[0,0,-s*.12]),BROW);
 }
 P.add(new THREE.ConeGeometry(.012,.04,6),at(0,.088,.094,[Math.PI/2-.35,0,0]),SKIN_SHADE);
 P.add(new THREE.SphereGeometry(.011,8,6),at(0,.074,.1),SKIN);
 P.add(new THREE.BoxGeometry(.028,.006,.006),at(0,.05,.088),LIP);
 P.add(new THREE.SphereGeometry(.05,12,8),at(0,.035,.035,[0,0,0],[1,.7,.9]),SKIN);
 return P.merge();
}

// loose trousers bound from knee to ankle with pale wraps, over straw sandals
function buildLeg(){
 const P=pieces();
 P.add(lathe([[.058,0],[.066,-.1],[.068,-.2],[.058,-.25],[.046,-.27]],14),at(0,0,0),(x,y)=>ramp(ROBE_DARK,ROBE,-.27,-.05)(y));
 P.add(new THREE.CylinderGeometry(.046,.04,.16,12,8),at(0,-.34,0),(x,y,z)=>{
  // the wrap winds round the shin in a spiral
  const band=((y+.5)*60+Math.atan2(x,z)/(Math.PI*2)+1)%1;return band<.2?WRAP_DARK:WRAP;
 });
 P.add(new THREE.CylinderGeometry(.036,.034,.04,10),at(0,-.43,.004),SKIN_SHADE);
 P.add(new THREE.SphereGeometry(.04,12,8),at(0,-.447,.048,[0,0,0],[.9,.45,1.5]),SKIN);
 P.add(new THREE.BoxGeometry(.084,.012,.15),at(0,-.464,.04),(x,y)=>y>-.461?STRAW:STRAW_DARK);
 for(const s of [-1,1])P.add(new THREE.BoxGeometry(.008,.006,.07),at(s*.018,-.448,.07,[0,s*.4,0]),STRAW_DARK);
 return P.merge();
}

// a short, wide sleeve stopping at the elbow over a bare forearm, a wrapped wrist and a bare fist
function buildArm(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.062,16,8,0,Math.PI*2,0,Math.PI*.5),at(0,-.01,0,[0,0,0],[1.05,.8,1]),ROBE);
 P.add(lathe([[.058,0],[.06,-.08],[.07,-.15],[.076,-.17]],20),at(0,0,0),(x,y)=>y<-.155?ROBE_HI:ramp(ROBE_DARK,ROBE,-.17,-.02)(y));
 P.add(lathe([[.074,-.17],[.04,-.155]],20),at(0,0,0),ROBE_DARK);
 P.add(new THREE.CylinderGeometry(.032,.036,.14,10),at(0,-.22,0),SKIN);
 P.add(new THREE.CylinderGeometry(.031,.03,.06,10,4),at(0,-.31,0),(x,y)=>Math.sin(y*300)>.3?WRAP_DARK:WRAP);
 // the fist: a clenched ball with a ridge of knuckles to the front and the thumb across
 P.add(new THREE.SphereGeometry(.034,12,8),at(0,-.36,.006,[0,0,0],[.9,1.05,1]),SKIN);
 for(let k=0;k<4;k++)P.add(new THREE.SphereGeometry(.011,6,4),at(-.018+k*.012,-.37,.034),SKIN_SHADE);
 P.add(new THREE.CapsuleGeometry(.009,.022,2,6),at(0,-.385,.03,[0,0,Math.PI/2]),SKIN);
 return P.merge();
}

let S=null,material=null;
function geometry(){
 if(S)return S;
 material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,metalness:.02,side:THREE.DoubleSide});
 S={body:buildBody(),head:buildHead(),leg:buildLeg(),arm:buildArm()};
 return S;
}
function mesh(parent,geo,name){const o=new THREE.Mesh(geo,material);o.castShadow=o.receiveShadow=true;o.userData.part=name;parent.add(o);return o;}

export function createMonk(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,.955,0);body.add(head);
 mesh(head,S.head,'head');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.08,.47,0);body.add(leg);mesh(leg,S.leg,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.215,.82,0);arm.rotation.z=s*.06;body.add(arm);mesh(arm,S.arm,'arm');arms.push(arm);
 }
 // an empty socket at the right fist, so a strike is the arm alone
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.012);arms[1].add(weaponSocket);
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'monk',arms,arm:arms[1],weaponSocket,head,hat:null,beard:null,pick:null};
}
