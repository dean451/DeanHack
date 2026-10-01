import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The tourist (the player-monster role) used to be the generic '@' humanoid: a tinted box with a
// ball for a head. They now stand as a lost holidaymaker gone a little wrong down here: a pallid,
// hollow-cheeked face burnt raw across the nose and cheeks and peeling, a fixed thin grin, and
// mirrored black sunglasses that hide the eyes, under a straw sun hat whose wide brim has frayed
// into jagged, broken straws, with a faded red band. A loud short-sleeved shirt of blood-red
// hibiscus on dark teal hangs open at the collar over a sunburnt V of chest. A camera with a big
// glass lens hangs at the chest on a strap round the neck, and a bulging fanny pack is buckled at
// the waist. Baggy khaki shorts over knobbly pale shins, black socks pulled up, and sandals. The
// left hand clutches a crumpled, half-unfolded map; the right holds a dart (tourists throw darts)
// tilted forward, a steel point and red fletching.
// Each moving part (body, head, each leg and arm) and the dart is one merged, vertex-coloured mesh
// with one shared material: 7 draws. The left arm has its own geometry for the map.
// Handles: legs, arms, arm (the right, dart arm), weaponSocket (the dart), head, body. The pivots
// match archeologist.js (shoulders ±.215 at .82, hand .37 down the arm, legs ±.08 at .47, head at
// .955).

const TEAL=rgb('#123c40'),TEAL_DARK=rgb('#0a2426'),HIBISCUS=rgb('#a8141c'),HIBISCUS_HI=rgb('#d83a2a'),POLLEN=rgb('#e0b030'),LEAF=rgb('#2e6a2a');
const SKIN=rgb('#dcc0a8'),SKIN_SHADE=rgb('#a88a76'),BURN=rgb('#c8584a'),BURN_DARK=rgb('#8e3430'),PEEL=rgb('#f0e0d0');
const LIP=rgb('#6a2a28'),TOOTH=rgb('#d8ccaa'),GUM=rgb('#2a0c0a'),HAIR=rgb('#6a5a48');
const LENS=rgb('#060608'),LENS_HI=rgb('#7a8a9a'),FRAME=rgb('#141414');
const STRAW=rgb('#c8aa66'),STRAW_DARK=rgb('#8a6e3a'),STRAW_HI=rgb('#e0c88a'),BAND=rgb('#6e1a18');
const KHAKI=rgb('#a8986e'),KHAKI_DARK=rgb('#6e6246'),SOCK=rgb('#141216'),SANDAL=rgb('#4a3020'),SANDAL_DARK=rgb('#2a1a10');
const CAMERA=rgb('#1c1c1e'),CHROME=rgb('#a0a2a8'),GLASS=rgb('#1a2a3a'),GLASS_HI=rgb('#6a8aa8'),STRAP=rgb('#2a2622');
const PACK=rgb('#5a2a5e'),PACK_DARK=rgb('#321634'),BUCKLE=rgb('#202020'),WATCH=rgb('#d0b060');
const PAPER=rgb('#d8ccaa'),PAPER_DARK=rgb('#9a8a66'),INK=rgb('#5a3a2a'),ROUTE=rgb('#8a1a14');
const STEEL=rgb('#8a8c92'),STEEL_HI=rgb('#d0d2d8'),BRASS=rgb('#b08a3a'),FLETCH=rgb('#a01818'),FLETCH_DARK=rgb('#4a0a0a');

const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
const lathe=(profile,segments=24)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
// a ring lying flat in the xz plane, so `at` can scale it oval and then tilt it
const ring=(r,tube,radial=6,tubular=36)=>new THREE.TorusGeometry(r,tube,radial,tubular).rotateX(Math.PI/2);
const hash=(a,b=0)=>{const h=Math.sin(a*12.9898+b*78.233)*43758.5453;return h-Math.floor(h);};
// the loud shirt: blood-red hibiscus blooms with yellow hearts and dark leaves on deep teal
function shirt(x,y,z){
 const u=Math.atan2(x,z)*1.6,v=y*14;
 const bloom=Math.sin(u*3.1+v*.7)*Math.sin(v*1.9-u*1.3);
 if(bloom>.86)return POLLEN;
 if(bloom>.6)return mix(HIBISCUS,HIBISCUS_HI,(bloom-.6)*3);
 if(bloom<-.72)return LEAF;
 return mix(TEAL_DARK,TEAL,Math.sin(u*9+v*5)*.25+.6);
}
// sunburn: raw red over pallid skin, with flecks of peeling skin
const burnt=(x,y,z)=>hash(Math.floor(x*160),Math.floor(y*160)+Math.floor(z*160)*7)>.93?PEEL:mix(BURN,BURN_DARK,Math.sin(x*90+y*70)*.25+.25);

function buildBody(){
 const P=pieces();
 // the shirt: boxy and untucked, a soft paunch, hanging open at the collar over a sunburnt V
 const torso=[[.19,.43],[.196,.5],[.2,.58],[.19,.68],[.196,.78],[.186,.86],[.13,.9],[.06,.915]];
 P.add(lathe(torso,40),at(0,0,0,[0,0,0],[1,1,.84]),(x,y,z)=>{
  if(z>0&&y>.76&&Math.abs(x)<(y-.76)*.55)return burnt(x,y,z);
  if(z>0&&Math.abs(x)<.004&&y<.76)return TEAL_DARK;
  return shirt(x,y,z);
 });
 // buttons down the front
 for(let i=0;i<4;i++)P.add(new THREE.SphereGeometry(.007,6,4),at(.008,.48+i*.075,.162+(i===0?.004:0)),PEEL);
 // the collar flaps lying open
 for(const s of [-1,1])P.add(new THREE.BoxGeometry(.07,.004,.05),at(s*.06,.87,.09,[.9,s*.5,s*.5]),shirt);
 // baggy khaki shorts at the hips
 P.add(lathe([[.2,.35],[.204,.4],[.198,.46],[.19,.47]],32),at(0,0,0,[0,0,0],[1,1,.86]),(x,y,z)=>mix(KHAKI_DARK,KHAKI,(y-.35)*12));
 P.add(new THREE.CircleGeometry(.2,24),at(0,.351,0,[Math.PI/2,0,0],[1,.86,1]),KHAKI_DARK);
 // the fanny pack, bulging, on a strap round the waist with a black buckle at the side
 P.add(ring(.205,.008,4,36),at(0,.47,0,[0,0,0],[1,1,.88]),BUCKLE);
 P.add(new THREE.CapsuleGeometry(.04,.12,4,10),at(0,.46,.175,[0,0,Math.PI/2],[1,.95,.8]),(x,y,z)=>y>.49?PACK:PACK_DARK);
 P.add(new THREE.BoxGeometry(.13,.004,.004),at(0,.478,.207),CHROME);
 P.add(new THREE.BoxGeometry(.028,.026,.012),at(.19,.47,.05,[0,1.2,0]),BUCKLE);
 // the camera strap round the neck, and the camera hanging at the chest with a big glass eye
 P.add(ring(.11,.007,4,28),at(0,.81,.035,[1.1,0,0],[1,1,1.25]),STRAP);
 P.add(new THREE.BoxGeometry(.11,.065,.045),at(0,.7,.19,[.12,0,0]),(x,y)=>y>.725?CHROME:CAMERA);
 P.add(new THREE.CylinderGeometry(.03,.034,.05,18),at(0,.695,.225,[Math.PI/2+.12,0,0]),CAMERA);
 P.add(new THREE.CylinderGeometry(.026,.026,.004,18),at(0,.692,.251,[Math.PI/2+.12,0,0]),(x,y)=>y>.7?GLASS_HI:GLASS);
 P.add(new THREE.BoxGeometry(.022,.012,.008),at(.035,.735,.185),CHROME);
 // the neck, sunburnt
 P.add(new THREE.CylinderGeometry(.05,.058,.08,14),at(0,.92,0),burnt);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // a gaunt, pallid face, burnt across the nose and cheeks; head centre at y .1
 P.add(new THREE.SphereGeometry(.1,22,16),at(0,.1,0,[0,0,0],[.9,1,.95]),(x,y,z)=>{
  if(z<-.04&&y<.14)return HAIR;
  if(z>.04&&y>.06&&y<.12)return burnt(x,y,z);
  return y<.05?SKIN_SHADE:SKIN;
 });
 // hollow cheeks
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.02,8,6),at(s*.05,.06,.07,[0,0,0],[.8,1,.4]),SKIN_SHADE);
 // a long, peeling, sunburnt nose
 P.add(new THREE.ConeGeometry(.016,.045,8),at(0,.088,.1,[Math.PI/2-.3,0,0]),burnt);
 // mirrored sunglasses: two black lenses with a pale sheen across the top, a bar and arms
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.026,12,8),at(s*.034,.115,.083,[0,s*.3,0],[1.1,.75,.35]),(x,y)=>y>.122?LENS_HI:LENS);
  P.add(new THREE.BoxGeometry(.004,.006,.085),at(s*.085,.12,.04,[0,0,0]),FRAME);
  P.add(new THREE.SphereGeometry(.016,8,6),at(s*.09,.1,0,[0,0,0],[.4,1,.7]),burnt);
 }
 P.add(new THREE.BoxGeometry(.075,.006,.006),at(0,.127,.092),FRAME);
 // a fixed thin grin: too wide, a sliver of teeth
 P.add(new THREE.TorusGeometry(.04,.005,4,16,Math.PI*.8),at(0,.058,.079,[0,0,Math.PI*1.1]),LIP);
 P.add(new THREE.BoxGeometry(.055,.006,.006),at(0,.047,.087),GUM);
 for(let i=0;i<6;i++)P.add(new THREE.BoxGeometry(.007,.006,.004),at(-.022+i*.009,.049,.09),TOOTH);
 // the straw sun hat: a domed crown with a faded band, and a wide floppy brim frayed into
 // jagged, broken straws
 P.add(lathe([[.093,.16],[.094,.2],[.084,.235],[.05,.255],[0,.26]],26),at(0,0,0),(x,y,z)=>mix(STRAW_DARK,STRAW,Math.sin(Math.atan2(x,z)*30+y*120)*.5+.5));
 P.add(lathe([[.096,.163],[.097,.186]],26),at(0,0,0),BAND);
 const brim=new THREE.RingGeometry(.09,.205,44,3);
 {const p=brim.attributes.position;for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),r=Math.hypot(x,y),a=Math.atan2(y,x);
  // the outer edge breaks into uneven points; the brim droops toward its rim
  const jag=r>.2?(hash(Math.round(a*14),3)-.5)*.05:0;
  const k=(r+jag)/r;p.setX(i,x*k);p.setY(i,y*k);p.setZ(i,-(r-.09)*(r-.09)*3.4-Math.sin(a*2)*.006);
 }brim.computeVertexNormals();}
 P.add(brim,at(0,.165,0,[-Math.PI/2,0,0]),(x,y,z)=>{const r=Math.hypot(x,z);return r>.19?STRAW_DARK:mix(STRAW,STRAW_HI,Math.sin(r*220)*.5+.5);});
 // stray broken straws poking off the brim
 for(let i=0;i<9;i++){
  const a=i*.71+hash(i,1),r=.2+hash(i,2)*.012;
  P.add(new THREE.CylinderGeometry(.002,.0015,.04+hash(i,4)*.03,3),at(Math.cos(a)*r,.13,Math.sin(a)*r,[0,-a,Math.PI/2+(hash(i,6)-.5)*.6]),STRAW_HI);
 }
 return P.merge();
}

// shorts to the knee, knobbly pale shins, black socks pulled up, and a sandal
function buildLeg(){
 const P=pieces();
 P.add(lathe([[.082,-.17],[.084,-.1],[.078,0]],16),at(0,0,0),(x,y)=>mix(KHAKI_DARK,KHAKI,(y+.17)*5));
 P.add(new THREE.CylinderGeometry(.046,.04,.18,12),at(0,-.25,0),SKIN);
 P.add(new THREE.SphereGeometry(.03,8,6),at(0,-.2,.025),SKIN_SHADE);
 P.add(new THREE.CylinderGeometry(.043,.042,.11,12),at(0,-.385,0),(x,y)=>y>-.336?mix(SOCK,PEEL,.2):SOCK);
 // the sandal: a thick sole and two straps over the black sock
 P.add(new THREE.BoxGeometry(.085,.016,.15),at(0,-.462,.035),SANDAL_DARK);
 P.add(new THREE.SphereGeometry(.042,10,8),at(0,-.44,.04,[0,0,0],[1,.55,1.6]),SOCK);
 for(const z of [.01,.07])P.add(new THREE.BoxGeometry(.09,.012,.018),at(0,-.43+(z>.05?-.008:0),z),SANDAL);
 return P.merge();
}

// a short shirt sleeve over a thin, sunburnt arm; the left wrist wears a gold watch and the left
// hand clutches a crumpled map
function buildArm(left){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.064,14,8,0,Math.PI*2,0,Math.PI*.5),at(0,-.01,0,[0,0,0],[1.1,.85,1]),shirt);
 P.add(lathe([[.066,0],[.068,-.06],[.064,-.13]],16),at(0,0,0),shirt);
 P.add(lathe([[.045,-.12],[.042,-.2],[.036,-.27],[.034,-.33]],14),at(0,0,0),(x,y,z)=>z>0?burnt(x,y,z):SKIN);
 P.add(new THREE.SphereGeometry(.036,12,8),at(0,-.36,.006,[0,0,0],[.9,1.1,1]),burnt);
 for(let k=0;k<4;k++)P.add(new THREE.CapsuleGeometry(.008,.02,2,5),at(-.018+k*.012,-.392,.022),SKIN);
 if(left){
  P.add(ring(.037,.006,4,18),at(0,-.31,0),WATCH);
  P.add(new THREE.BoxGeometry(.02,.006,.02),at(0,-.31,.038,[Math.PI/2,0,0]),WATCH);
  // the map: a sheet half-unfolded in creases, crumpled at the corners, a red route inked on it
  const map=new THREE.PlaneGeometry(.17,.13,8,6);
  {const p=map.attributes.position;for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i);
   p.setZ(i,Math.abs(Math.sin(x*37))*.012+Math.sin(y*48)*.006+(hash(Math.round(x*50),Math.round(y*50))-.5)*.008);
  }map.computeVertexNormals();}
  P.add(map,at(.02,-.4,.06,[-.25,-1.2,.2]),(x,y,z)=>{
   const u=x*60+z*40,v=y*60;
   if(Math.abs(Math.sin(u*.7+v*.4)*.6-Math.cos(v*.5))<.05)return ROUTE;
   if(Math.abs(Math.sin(u*2.2))<.07||Math.abs(Math.sin(v*2.6))<.07)return INK;
   return mix(PAPER,PAPER_DARK,Math.abs(Math.sin(u*.5))*.5);
  });
 }
 return P.merge();
}

// the dart: a heavy steel point, a knurled brass barrel, a thin shaft and red flights, held
// point forward and up
function buildDart(){
 const P=pieces(),tilt=at(0,.01,0,[Math.PI/2-.45,0,0]),on=m=>new THREE.Matrix4().multiplyMatrices(tilt,m);
 P.add(new THREE.ConeGeometry(.009,.09,8),on(at(0,.205,0)),(x,y,z)=>mix(STEEL,STEEL_HI,Math.sin(y*90)*.5+.5));
 P.add(new THREE.CylinderGeometry(.013,.011,.08,10),on(at(0,.12,0)),(x,y,z)=>Math.sin(Math.atan2(x,z)*10)>0?BRASS:mix(BRASS,STEEL,.5));
 P.add(new THREE.CylinderGeometry(.004,.004,.1,6),on(at(0,.03,0)),STEEL);
 for(let i=0;i<3;i++)P.add(new THREE.PlaneGeometry(.028,.055),on(at(Math.sin(i*2.094)*.014,-.01,Math.cos(i*2.094)*.014,[0,i*2.094+Math.PI/2,0])),(x,y)=>y<.02?FLETCH_DARK:FLETCH);
 return P.merge();
}

let S=null,material=null;
function geometry(){
 if(!S){
  material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.04,side:THREE.DoubleSide});
  S={body:buildBody(),head:buildHead(),leg:buildLeg(),arm:buildArm(false),armLeft:buildArm(true),dart:buildDart()};
 }
 return S;
}
function mesh(parent,geo,name){const o=new THREE.Mesh(geo,material);o.castShadow=o.receiveShadow=true;o.userData.part=name;parent.add(o);return o;}

export function createTourist(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,.955,0);body.add(head);
 mesh(head,S.head,'head');
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.08,.47,0);body.add(leg);mesh(leg,S.leg,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.215,.82,0);arm.rotation.z=s*.06;body.add(arm);mesh(arm,s<0?S.armLeft:S.arm,'arm');arms.push(arm);
 }
 // the map hand is held up a little to read it
 arms[0].rotation.x=-.35;
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.012);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.dart,'dart');
 return {g,body,legs,tail:null,wings:[],quirk:'human',kind:'tourist',arms,arm:arms[1],weaponSocket,head,hat:null,beard:null,pick:null};
}
