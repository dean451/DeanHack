import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Shopkeepers used to be two different primitive builds: a plain humanoid with a leather patch in
// the gallery and, in Live, about forty separately coloured spheres and boxes. They are now one
// portly merchant: a teal waistcoat stretched over a round paunch, a cream shirt with the sleeves
// rolled and held by red garters, a maroon cravat and a gold watch chain. Over it hangs a stained
// canvas apron with a bib, neck and waist straps tied in a bow at the back, and a front pocket with
// a pencil. A drawstring coin purse hangs at one hip and the shop's ring of keys at the other.
// Brown trousers, stout shoes. His face is sallow and jowly, with a bruised, broken-veined nose and dull cheeks, a bald pate
// ringed by a grey fringe, bushy brows, a curled grey moustache and little gold spectacles. He holds
// a brass hand balance in his right hand and a ledger in his left.
// Each moving part (body, head, each leg and arm, and the balance) is one merged, vertex-coloured
// mesh: 7 draws, with one cloth material and one metal material for the balance. The geometry is
// built once and shared, so nothing here is disposed per actor.
// Handles: legs, arms, arm (the balance arm), weaponSocket, head, body, like the nurse and priests.

const SKIN=rgb('#a8906f'),SKIN_SHADE=rgb('#7a6450'),SKIN_LIGHT=rgb('#bba685'),ROSY=rgb('#7e4c48'),EYE=rgb('#1c1612');
const GREY=rgb('#c9c3b8'),GREY_DARK=rgb('#8a8378');
const VEST=rgb('#2f5e52'),VEST_DARK=mix(VEST,[0,0,0],.45),SHIRT=rgb('#efe6d2'),SHIRT_SHADE=rgb('#c8bca4');
const TROUSER=rgb('#4d3b2d'),TROUSER_DARK=rgb('#2e231a'),SHOE=rgb('#2a211b'),SOLE=rgb('#17120e');
const CANVAS=rgb('#cdb283'),CANVAS_DARK=rgb('#9a8058'),STAIN=rgb('#8e7a5c'),STRAP=rgb('#6b4a2e');
const CRAVAT=rgb('#7c2432'),GARTER=rgb('#a42c2c'),GOLD=rgb('#d6ac4c'),GOLD_DARK=rgb('#8c6a22');
const IRON=rgb('#6a6f73'),IRON_DARK=rgb('#34383b'),LEATHER=rgb('#6e4a2c'),LEATHER_DARK=rgb('#3e2918');
const LEDGER=rgb('#6c2a22'),PAGE=rgb('#efe5c8'),PENCIL=rgb('#e0b43a'),BRASS=rgb('#cfa048'),BRASS_DARK=rgb('#7a5a1e');

const lathe=(profile,segments=24,phiStart=0,phiLength=Math.PI*2)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
const noise=(x,y,z)=>{const v=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return v-Math.floor(v);};
// a stick of `geo` (built along +y, length 1) from a to b
const Y=new THREE.Vector3(0,1,0);
function between(a,b,thick=1){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 return new THREE.Matrix4().compose(A.add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(Y,d.normalize()),new THREE.Vector3(thick,len,thick));
}
// The paunch: push the front of the torso and apron forward round the belly.
const SQUASH=.85;
const belly=y=>.065*Math.exp(-(((y-.6)/.12)**2));
function paunch(geo){
 geo.applyMatrix4(at(0,0,0,[0,0,0],[1,1,SQUASH]));
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const z=p.getZ(i);if(z>0)p.setZ(i,z+belly(p.getY(i))*Math.min(1,z/.17));}
 return geo;
}
const TORSO=[[.15,.4],[.19,.46],[.215,.55],[.222,.62],[.206,.7],[.19,.78],[.198,.84],[.168,.9],[.07,.95],[0,.955]];
const APRON=[[.212,.27],[.217,.34],[.222,.42],[.23,.5],[.237,.58],[.235,.64],[.224,.7]];
// how far forward the front of a paunched lathe is at (x, y), so trims can sit on it
function front(profile,x,y){
 let r=profile[0][0];
 for(let i=1;i<profile.length;i++){const [r0,y0]=profile[i-1],[r1,y1]=profile[i];if(y>=y0&&y<=y1){r=r0+(r1-r0)*(y-y0)/(y1-y0);break;}if(y>y1)r=r1;}
 const z=Math.sqrt(Math.max(0,r*r-x*x))*SQUASH;
 return z+belly(y)*Math.min(1,z/.17);
}

function buildBody(){
 const P=pieces(),vest=(x,y,lift=0)=>front(TORSO,x,y)+lift,apron=(x,y,lift=0)=>front(APRON,x,y)+lift;
 // torso: trousers at the hips, the waistcoat over a round middle, shirt at the collar; the lathe's
 // seam faces the back
 P.add(paunch(lathe(TORSO,36,Math.PI)),null,(x,y,z)=>{
  if(y<.47)return mix(TROUSER_DARK,TROUSER,(y-.4)/.07);
  if(y>.9)return SHIRT;
  // a darker cinch at the back
  const c=ramp(VEST_DARK,VEST,.47,.62)(y);
  if(z<-.12&&Math.abs(x)<.05&&y>.52&&y<.6)return mix(c,[0,0,0],.3);
  return c;
 });
 P.add(new THREE.CircleGeometry(.15,20),at(0,.401,0,[Math.PI/2,0,0],[1,SQUASH,1]),TROUSER_DARK);
 // the apron skirt hangs from the chest to the knee, following the paunch
 P.add(paunch(lathe(APRON,16,-1.15,2.3)),null,(x,y,z)=>{
  let c=ramp(CANVAS_DARK,CANVAS,.27,.4)(y);
  if(y<.285)c=mix(c,CANVAS_DARK,.6);
  const n=noise(Math.round(x*40),Math.round(y*40),1);
  if(n>.86)c=mix(c,STAIN,.6);
  return c;
 });
 // bib, leaning back up the chest, with stitched edges
 P.add(new THREE.BoxGeometry(.16,.17,.012,4,4,1),at(0,.78,.196,[-.245,0,0]),(x,y)=>Math.abs(x)>.068||y>.855||y<.705?CANVAS_DARK:CANVAS);
 // neck straps from the bib's corners round the back of the neck
 for(const s of [-1,1])P.add(new THREE.BoxGeometry(1,1,1),between([s*.066,.86,.172],[s*.088,.915,-.02],.014),STRAP);
 P.add(new THREE.TorusGeometry(.09,.007,4,16,Math.PI),at(0,.915,-.005,[-Math.PI/2,0,0],[1,.8,1]),STRAP);
 // waist ties round the back, tied in a bow with two tails
 P.add(new THREE.TorusGeometry(.232,.008,4,24,Math.PI*1.18),at(0,.6,0,[-Math.PI/2,0,-Math.PI*.09],[1,SQUASH,1]),STRAP);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.03,10,8),at(s*.03,.6,-.2,[0,0,s*.4],[1,.5,.35]),STRAP);
  P.add(new THREE.BoxGeometry(.022,.12,.006),at(s*.022,.535,-.198,[-.1,0,s*.15]),STRAP);
 }
 P.add(new THREE.SphereGeometry(.012,8,6),at(0,.6,-.205),mix(STRAP,[0,0,0],.3));
 // front pocket with a pencil standing in it
 P.add(new THREE.BoxGeometry(.14,.09,.01),at(0,.45,apron(0,.45,.006),[-.12,0,0]),(x,y)=>y>.49?CANVAS_DARK:mix(CANVAS,CANVAS_DARK,.25));
 P.add(new THREE.CylinderGeometry(.005,.005,.085,6),at(.035,.49,apron(.035,.49,.008),[-.12,0,-.18]),(x,y)=>y>.525?mix(PENCIL,[1,.6,.6],.3):PENCIL);
 // neck, shirt collar and a maroon cravat
 P.add(new THREE.CylinderGeometry(.052,.058,.07,12),at(0,.94,.005),SKIN_SHADE);
 P.add(lathe([[.064,.955],[.078,.92],[.084,.905]],20),at(0,0,.004),SHIRT_SHADE);
 P.add(new THREE.SphereGeometry(.022,10,8),at(0,.912,.075,[0,0,0],[1.2,.9,.7]),CRAVAT);
 P.add(new THREE.BoxGeometry(.03,.06,.008),at(0,.87,.089,[-.3,0,0]),CRAVAT);
 // waistcoat buttons, visible past the bib's edges
 for(const s of [-1,1])for(const y of [.72,.78,.84])P.add(new THREE.SphereGeometry(.008,6,5),at(s*.092,y,vest(.092,y,.002)),GOLD);
 // gold watch chain sagging from the bib's edge to a waistcoat pocket, with the fob hanging from it
 for(let i=0;i<=12;i++){const t=i/12,x=-.085-.085*t,y=.745-.05*Math.sin(Math.PI*t)-.01*t;P.add(new THREE.SphereGeometry(.0055,6,4),at(x,y,vest(x,y,.006)),i%2?GOLD_DARK:GOLD);}
 P.add(new THREE.BoxGeometry(.04,.006,.01),at(-.175,.73,vest(-.175,.73,.002),[0,-.75,0]),VEST_DARK);
 P.add(new THREE.CylinderGeometry(.009,.009,.018,8),at(-.13,.68,vest(-.13,.68,.012),[Math.PI/2-.4,0,0]),GOLD);
 // drawstring coin purse hung over the apron on the right, with coins peeking out
 const px=.15,py=.49,pz=apron(px,py,.03);
 P.add(new THREE.BoxGeometry(1,1,1),between([px-.01,.62,apron(px-.01,.62,.004)],[px,py+.055,pz-.01],.006),LEATHER_DARK);
 P.add(new THREE.SphereGeometry(.046,12,10),at(px,py,pz,[0,0,.1],[.85,1,.6]),(x,y)=>mix(LEATHER_DARK,LEATHER,(y-py+.04)/.07));
 P.add(new THREE.CylinderGeometry(.018,.03,.03,10),at(px,py+.052,pz),LEATHER);
 P.add(new THREE.TorusGeometry(.019,.004,4,12),at(px,py+.045,pz,[Math.PI/2,0,0]),LEATHER_DARK);
 for(const [dx,dz,r] of [[-.006,.004,.3],[.008,-.004,-.5]])P.add(new THREE.CylinderGeometry(.013,.013,.003,12),at(px+dx,py+.07,pz+dz,[r,0,.4]),GOLD);
 // the shop's keys on an iron ring hung over the apron on the left
 const kx=-.15,ky=.53,kz=apron(kx,ky,.012);
 P.add(new THREE.BoxGeometry(1,1,1),between([kx,.62,apron(kx,.62,.004)],[kx,ky+.024,kz],.007),STRAP);
 P.add(new THREE.TorusGeometry(.026,.004,5,16),at(kx,ky,kz),IRON);
 for(const [a,len] of [[-.35,.07],[0,.085],[.4,.065]]){
  const hang=new THREE.Matrix4().multiplyMatrices(at(kx,ky-.026,kz+.006),at(0,0,0,[0,0,a])),on=m=>new THREE.Matrix4().multiplyMatrices(hang,m);
  P.add(new THREE.TorusGeometry(.01,.003,4,10),on(at(0,-.01,0)),IRON);
  P.add(new THREE.CylinderGeometry(.0035,.0035,len,5),on(at(0,-.02-len/2,0)),IRON);
  P.add(new THREE.BoxGeometry(.012,.016,.004),on(at(.007,-.016-len,0)),IRON_DARK);
 }
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // a round, bald head: the pate catches the light
 P.add(new THREE.SphereGeometry(.112,20,14),at(0,.11,0,[0,0,0],[.95,1,.97]),(x,y)=>y>.15?mix(SKIN,SKIN_LIGHT,(y-.15)/.07):SKIN);
 // jowls and a double chin
 P.add(new THREE.SphereGeometry(.075,14,10),at(0,.05,.03,[0,0,0],[1.12,.8,1]),SKIN);
 P.add(new THREE.SphereGeometry(.06,12,8),at(0,.018,.048,[0,0,0],[1.1,.6,.9]),SKIN_SHADE);
 // bruised bulb of a nose, sunken dull cheeks, ears
 P.add(new THREE.SphereGeometry(.022,10,8),at(0,.086,.108,[0,0,0],[1,.9,1.1]),mix(SKIN,ROSY,.55));
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.026,10,8),at(s*.056,.07,.083,[0,0,0],[1,.8,.6]),mix(SKIN,ROSY,.4));
  P.add(new THREE.SphereGeometry(.026,8,8),at(s*.106,.1,-.005,[0,0,0],[.45,1,.8]),SKIN_SHADE);
  // small dark eyes under bushy grey brows
  P.add(new THREE.SphereGeometry(.011,8,6),at(s*.036,.11,.101,[0,0,0],[1.2,.9,.6]),EYE);
  P.add(new THREE.SphereGeometry(.019,8,6),at(s*.038,.133,.1,[0,0,s*-.2],[1.5,.55,.6]),GREY);
  // a broad moustache, curled up at the tips
  P.add(new THREE.SphereGeometry(.03,10,8),at(s*.031,.061,.108,[0,0,s*.28],[1.35,.5,.6]),GREY);
  P.add(new THREE.SphereGeometry(.012,8,6),at(s*.068,.068,.1),GREY_DARK);
  P.add(new THREE.SphereGeometry(.008,6,6),at(s*.075,.08,.098),GREY);
 }
 P.add(new THREE.BoxGeometry(.03,.006,.01),at(0,.042,.104),mix(ROSY,[0,0,0],.45));
 // a grey fringe round the back and sides of the head
 P.add(lathe([[.113,.06],[.12,.09],[.117,.12],[.106,.145]],20,.95,Math.PI*2-1.9),at(0,0,-.002,[0,0,0],[.96,1,.99]),(x,y,z)=>mix(GREY_DARK,GREY,.4+.6*noise(Math.round(x*90),Math.round(y*90),Math.round(z*90))));
 // little round gold spectacles
 for(const s of [-1,1]){
  P.add(new THREE.TorusGeometry(.02,.0025,4,16),at(s*.037,.108,.114),GOLD);
  P.add(new THREE.CylinderGeometry(1,1,1,4),between([s*.057,.108,.11],[s*.104,.112,.01],.0022),GOLD);
 }
 P.add(new THREE.CylinderGeometry(.0022,.0022,.034,4),at(0,.112,.117,[0,0,Math.PI/2]),GOLD);
 return P.merge();
}

// A trouser leg and a stout laced shoe.
function buildLeg(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.058,.048,.39,12),at(0,-.2,0),(x,y)=>ramp(TROUSER_DARK,TROUSER,-.4,-.1)(y));
 P.add(new THREE.CylinderGeometry(.05,.05,.02,12),at(0,-.39,0),TROUSER_DARK);
 P.add(new THREE.SphereGeometry(.05,12,8),at(0,-.425,.04,[0,0,0],[.95,.6,1.65]),(x,y,z)=>z>.07&&y>-.41?mix(SHOE,[1,1,1],.12):SHOE);
 P.add(new THREE.BoxGeometry(.09,.014,.18),at(0,-.452,.038),SOLE);
 return P.merge();
}

// A shirt sleeve rolled to the elbow and held by a red garter, the forearm and a hand. The left
// hand also carries the shop ledger.
function buildArm(ledger){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.062,14,10),at(0,-.03,0,[0,0,0],[1,1.1,1]),SHIRT);
 P.add(new THREE.CylinderGeometry(.058,.052,.2,12),at(0,-.13,0),(x,y,z)=>mix(SHIRT_SHADE,SHIRT,.5+.5*Math.sin(y*90+Math.atan2(x,z)*2)));
 P.add(new THREE.TorusGeometry(.056,.008,5,16),at(0,-.1,0,[Math.PI/2,0,0]),GARTER);
 P.add(new THREE.TorusGeometry(.05,.014,6,16),at(0,-.228,0,[Math.PI/2,0,0]),SHIRT_SHADE);
 P.add(new THREE.CylinderGeometry(.042,.034,.17,10),at(0,-.31,0),(x,y)=>ramp(SKIN_SHADE,SKIN,-.4,-.24)(y));
 P.add(new THREE.SphereGeometry(.04,10,8),at(0,-.42,.005,[0,0,0],[.85,1.15,1]),SKIN);
 P.add(new THREE.SphereGeometry(.016,8,6),at(0,-.4,.038),SKIN_SHADE);
 if(ledger){
  // gripped by its spine at the hand, cover boards either side of the pages
  P.add(new THREE.BoxGeometry(.026,.14,.1),at(0,-.45,.012),PAGE);
  for(const s of [-1,1])P.add(new THREE.BoxGeometry(.004,.15,.11),at(s*.015,-.45,.012),LEDGER);
  P.add(new THREE.BoxGeometry(.034,.15,.01),at(0,-.45,.066),mix(LEDGER,[0,0,0],.25));
  for(const y of [-.405,-.495])P.add(new THREE.BoxGeometry(.036,.006,.012),at(0,y,.066),GOLD);
 }
 return P.merge();
}

// A brass hand balance hung from the fist: a ring, a stem, a beam running front to back with a
// pointer, and two shallow pans on three chains each. A coin sits in the front pan.
function buildBalance(){
 const P=pieces(),beam=-.06,pan=-.165,end=.085;
 P.add(new THREE.TorusGeometry(.014,.003,5,12),at(0,-.004,0,[0,Math.PI/2,0]),BRASS);
 P.add(new THREE.CylinderGeometry(.003,.003,.04,6),at(0,-.038,0),BRASS_DARK);
 P.add(new THREE.CylinderGeometry(.004,.004,end*2,6),at(0,beam,0,[Math.PI/2,0,0]),BRASS);
 P.add(new THREE.ConeGeometry(.005,.03,5),at(0,beam+.02,0),BRASS_DARK);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.007,8,6),at(0,beam,s*end),BRASS);
  for(let k=0;k<3;k++){
   const a=k/3*Math.PI*2+.4;
   P.add(new THREE.CylinderGeometry(1,1,1,3),between([0,beam,s*end],[Math.cos(a)*.036,pan+.012,s*end+Math.sin(a)*.036],.0012),BRASS_DARK);
  }
  P.add(lathe([[0,pan],[.028,pan+.003],[.04,pan+.01],[.042,pan+.014]],16),at(0,0,s*end),(x,y)=>y<pan+.005?BRASS_DARK:BRASS);
 }
 P.add(new THREE.CylinderGeometry(.012,.012,.003,12),at(.004,pan+.006,end),GOLD);
 return P.merge();
}

let S=null,cloth=null,metal=null;
function geometry(){
 if(S)return S;
 cloth=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.74,metalness:.04,side:THREE.DoubleSide});
 metal=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.36,metalness:.65,side:THREE.DoubleSide});
 S={body:buildBody(),head:buildHead(),leg:buildLeg(),arm:buildArm(false),ledgerArm:buildArm(true),balance:buildBalance()};
 return S;
}
function mesh(parent,geo,name,material=cloth){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createShopkeeper(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.name='Aproned shopkeeper';g.add(body);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,.955,.01);body.add(head);
 mesh(head,S.head,'head');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.085,.46,0);body.add(leg);mesh(leg,S.leg,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.245,.84,0);arm.rotation.z=s*.2;body.add(arm);mesh(arm,s<0?S.ledgerArm:S.arm,s<0?'ledger arm':'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.42,.01);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.balance,'balance',metal);
 return {g,body,legs,tail:null,wings:[],quirk:'shopkeeper',arms,arm:arms[1],weaponSocket,head,hat:null,beard:null,pick:null};
}
