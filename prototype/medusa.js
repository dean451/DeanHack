import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Medusa used to be the generic '@' humanoid: a tinted box with a ball for a head. She now rises
// from a great serpent body instead of legs: the scaled coil winds once round on the floor and
// sweeps out behind her into a long tapering tail. From the waist up she is gaunt, her grey-green
// skin drawn tight over the ribs, the scales creeping up over her hips under a bronze girdle. A
// ragged shawl of dark sea-green hangs from her shoulders. Her face is narrow and hollow-cheeked,
// with a heavy brow over burning yellow slit eyes and a mouth of needle fangs, and from her scalp
// writhes a nest of snakes, each with its own glinting eyes. Her hands end in long black talons
// over bronze bracers, and the right holds a hooked bronze harpe.
// The body, head, tail, each arm and the harpe are one merged, vertex-coloured mesh each, with one
// shared material; every glowing eye (hers and the snakes') is one more merged mesh on the head,
// with an unlit material: 7 draws. Geometry is built once and shared.
// Handles: arms, arm (the right, harpe arm), weaponSocket (the harpe), head, body, tail (the swept
// tail beyond the coil). No legs. The arm and head pivots match healer.js (shoulders ±.215 at .82,
// hand .37 down the arm, head at .955).

const SCALE=rgb('#3a5232'),SCALE_HI=rgb('#6a7e3e'),SCALE_DARK=rgb('#18241a'),BELLY=rgb('#a8a070'),BELLY_DARK=rgb('#6a6444');
const SKIN=rgb('#8a9a7e'),SKIN_DARK=rgb('#4e5e4a'),SKIN_HI=rgb('#b0b89a'),LIP=rgb('#2a1a1e'),MOUTH=rgb('#140808');
const BRONZE=rgb('#8a6a2e'),BRONZE_HI=rgb('#d0a858'),BRONZE_DARK=rgb('#3a2a12'),VERDIGRIS=rgb('#4a8a72');
const SHAWL=rgb('#1e3430'),SHAWL_HI=rgb('#3a5a4e'),SHAWL_DARK=rgb('#0a1412');
const TALON=rgb('#141010'),FANG=rgb('#ece4c8'),LEATHER=rgb('#3a2418'),LEATHER_HI=rgb('#5e3e28');
const GLOW=rgb('#e8ff4a'),GLOW_HOT=rgb('#fff8c0'),SNAKE_GLOW=rgb('#ff8a2a');

const lathe=(profile,segments=24)=>new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),segments);
const hash=(a,b=0)=>{const h=Math.sin(a*12.9898+b*78.233)*43758.5453;return h-Math.floor(h);};
// a sawtooth tear along the lowest row of a lathe (see barbarian.js)
function tear(geo,hem,depth,teeth,seed=0){
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  if(p.getY(i)>hem+1e-4)continue;
  const a=Math.atan2(p.getX(i),p.getZ(i))*teeth/Math.PI+seed;
  const f=a-Math.floor(a),h=hash(Math.floor(a),seed);
  p.setY(i,p.getY(i)-depth*(.45+.55*h)*(1-Math.abs(f-.5)*2));
 }
 geo.computeVertexNormals();
 return geo;
}
// a tube along a curve, tapering from `radius` at the start to `tip` of it at the end
function taper(points,radius,tip=.08,tubular=20,radial=8){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const geo=new THREE.TubeGeometry(curve,tubular,radius,radial,false);
 const p=geo.attributes.position,c=new THREE.Vector3(),v=new THREE.Vector3();
 for(let i=0;i<p.count;i++){
  const t=Math.floor(i/(radial+1))/tubular;
  curve.getPointAt(t,c);v.fromBufferAttribute(p,i).sub(c).multiplyScalar(1-t*(1-tip)).add(c);
  p.setXYZ(i,v.x,v.y,v.z);
 }
 geo.computeVertexNormals();
 return {geo,curve};
}
// serpent hide: a mottled diamond pattern of dark and olive scales, its underside a pale belly
const hide=(belly=-1)=>(x,y,z)=>{
 if(y<belly)return mix(BELLY_DARK,BELLY,(y-belly+.03)*30);
 const d=Math.abs(Math.sin(x*48+z*31)+Math.sin(z*52-x*27+y*40));
 const fleck=hash(Math.floor(x*60),Math.floor(z*60+y*40));
 return d<.35?SCALE_DARK:fleck>.82?SCALE_HI:mix(SCALE,SCALE_DARK,fleck*.5);
};

// the coil: the waist plunges into a thick serpent body that winds once round on the floor
const COIL=[[0,.5,0],[0,.38,.03],[.07,.24,.09],[.18,.12,.08],[.25,.075,-.04],[.19,.068,-.18],[.04,.066,-.25],[-.14,.064,-.22],[-.24,.062,-.08],[-.21,.058,.08],[-.1,.054,.18]];
// the tail sweeps on round the outside of the coil and trails out behind her; built about its root
const TAIL_ROOT=[-.1,.054,.18];
const TAIL=[[-.1,.054,.18],[.04,.05,.24],[.22,.046,.2],[.33,.042,.04],[.32,.038,-.16],[.2,.032,-.32],[.04,.026,-.42],[-.12,.02,-.46]];

function buildBody(){
 const P=pieces();
 const coil=taper(COIL,.088,.64,48,12);
 P.add(coil.geo,null,hide(.03));
 // a row of dorsal ridge scales down the top of the floor coil
 for(let k=0;k<14;k++){
  const t=.32+k*.045,c=coil.curve.getPointAt(t),n=coil.curve.getTangentAt(t);
  P.add(new THREE.ConeGeometry(.014,.04,4),at(c.x,c.y+.062*(1-t*.36),c.z,[0,Math.atan2(n.x,n.z),-.3]),SCALE_DARK);
 }
 // the torso: narrow hips grown out of the serpent, a gaunt ribbed waist and bony shoulders
 const torso=lathe([[.086,.44],[.104,.5],[.112,.56],[.1,.63],[.11,.7],[.14,.77],[.16,.82],[.15,.865],[.1,.905],[.05,.93]],36);
 P.add(torso,at(0,0,0,[0,0,0],[1,1,.74]),(x,y,z)=>{
  if(y<.55)return mix(hide()(x,y,z),SKIN_DARK,(y-.5)*14);
  const rib=z>0&&y>.62&&y<.76&&Math.sin(y*130)>.55;
  const shade=mix(SKIN_DARK,SKIN,.4+(y-.55)*1.6+Math.max(0,z)*2);
  return rib?mix(shade,SKIN_DARK,.7):shade;
 });
 // collarbones standing out under the skin
 for(const s of [-1,1])P.add(new THREE.CylinderGeometry(.008,.008,.12,6),at(s*.06,.875,.075,[0,0,s*1.35]),SKIN_HI);
 // the bronze girdle over the seam of scale and skin, verdigris in its grooves, a snake-head clasp
 P.add(new THREE.CylinderGeometry(.115,.11,.05,36,1,true),at(0,.555,0,[0,0,0],[1,1,.76]),(x,y,z)=>Math.abs(y-.555)>.016?BRONZE_HI:Math.sin(Math.atan2(x,z)*40)>.6?VERDIGRIS:BRONZE);
 P.add(new THREE.SphereGeometry(.022,10,8),at(0,.555,.086,[0,0,0],[1.3,.9,.6]),BRONZE_HI);
 P.add(new THREE.ConeGeometry(.012,.05,5),at(0,.52,.088,[Math.PI,0,0]),BRONZE);
 // a breastband of bronze scales
 P.add(new THREE.CylinderGeometry(.152,.14,.07,36,1,true),at(0,.765,0,[0,0,0],[1,1,.76]),(x,y,z)=>Math.sin(Math.atan2(x,z)*30)*Math.sin(y*160)>0?BRONZE:BRONZE_DARK);
 // the ragged shawl: dark sea-green hung over the shoulders and down the back, its hem in tatters
 const shawl=tear(lathe([[.06,.95],[.13,.925],[.2,.87],[.215,.8],[.21,.71],[.2,.64]],40),.641,.09,9,.7);
 const shawlPos=shawl.attributes.position;
 // cut away the front so it only cloaks the shoulders and back
 for(let i=0;i<shawlPos.count;i++){const z=shawlPos.getZ(i),y=shawlPos.getY(i);if(z>.06&&y<.88)shawlPos.setZ(i,.06+(z-.06)*.15);}
 shawl.computeVertexNormals();
 P.add(shawl,at(0,0,-.01,[0,0,0],[1.05,1,.86]),(x,y,z)=>{
  const fold=Math.sin(Math.atan2(x,z)*12)*.5+.5;
  return mix(mix(SHAWL_DARK,SHAWL,(y-.64)*3.5),SHAWL_HI,fold*fold*.3);
 });
 // the long neck, cords standing out
 P.add(new THREE.CylinderGeometry(.04,.052,.08,14),at(0,.95,.004),(x,y,z)=>Math.abs(Math.abs(x)-.022)<.006&&z>0?SKIN_DARK:SKIN);
 return P.merge();
}

// Snake i of the nest: its centre line (head frame), root and the way it springs from the skull.
// medusa-hair.js reads these to find each snake's vertices.
export const SNAKES=15;
export function snakePath(i){
 const a=(i/SNAKES)*Math.PI*2+hash(i,1)*.4,up=.35+hash(i,2)*.85;// azimuth and elevation of the root
 const dir=new THREE.Vector3(Math.sin(a)*Math.cos(up),Math.sin(up),Math.cos(a)*Math.cos(up)*.85-.25).normalize();
 if(dir.z>.55)dir.z=.2;// keep the face clear
 dir.normalize();
 const root=new THREE.Vector3(0,.1,0).addScaledVector(dir,.075);
 const len=.1+hash(i,3)*.07,curl=(hash(i,4)-.5)*2,side=new THREE.Vector3(-dir.z,0,dir.x).normalize();
 const pts=[];
 for(let k=0;k<=5;k++){
  const t=k/5,p=root.clone().addScaledVector(dir,len*t);
  p.addScaledVector(side,Math.sin(t*Math.PI*1.6+i)*.03*curl);
  p.y+=Math.sin(t*Math.PI)*.04-t*t*.06*(dir.y<.6?1:-.2);
  pts.push([p.x,p.y,p.z]);
 }
 return {pts,root,dir,len};
}

// head centre at y .1 in the head's frame; the eyes and snake eyes go to the glow mesh
function buildHead(){
 const P=pieces(),G=pieces();
 // a narrow skull, the cheeks hollowed and the jaw long
 const skull=new THREE.SphereGeometry(.082,18,14),sp=skull.attributes.position;
 for(let i=0;i<sp.count;i++){
  const x=sp.getX(i),y=sp.getY(i),z=sp.getZ(i);
  if(y<0)sp.setY(i,y*1.35);// long jaw
  if(z>.02&&y<.01&&y>-.07)sp.setX(i,x*(.82+Math.abs(y+.03)*2));// hollow cheeks
 }
 skull.computeVertexNormals();
 P.add(skull,at(0,.1,0,[0,0,0],[.86,1,.94]),(x,y,z)=>{
  if(z>.05&&Math.abs(x)>.03&&y<.09&&y>.05)return SKIN_DARK;// the hollow under the cheekbones
  return mix(SKIN_DARK,SKIN_HI,.25+(y-.02)*3+Math.max(0,z)*3);
 });
 // the heavy brow, the sunken sockets and the burning slit eyes
 P.add(new THREE.CylinderGeometry(.012,.012,.11,8),at(0,.135,.066,[0,0,Math.PI/2],[1,1,1]),SKIN_DARK);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.019,10,8),at(s*.031,.116,.058,[0,0,0],[1.2,.75,.5]),SCALE_DARK);
  G.add(new THREE.SphereGeometry(.014,10,8),at(s*.031,.116,.064,[0,0,s*.25],[1.25,.55,.45]),(x,y)=>y>.117?GLOW_HOT:GLOW);
  G.add(new THREE.BoxGeometry(.004,.016,.004),at(s*.031,.116,.07),MOUTH);
 }
 // a thin hooked nose and a lipless gash of a mouth over needle fangs
 P.add(new THREE.ConeGeometry(.011,.04,5),at(0,.096,.078,[1.9,0,0]),SKIN);
 P.add(new THREE.BoxGeometry(.05,.012,.012),at(0,.053,.068,[-.1,0,0]),MOUTH);
 P.add(new THREE.TorusGeometry(.026,.004,5,16,Math.PI),at(0,.058,.066,[0,0,Math.PI],[1,.45,1]),LIP);
 for(let k=0;k<6;k++){const x=-.02+k*.008;P.add(new THREE.ConeGeometry(.0024,.016+(k===1||k===4?.01:0),4),at(x,.05,.072,[Math.PI,0,0]),FANG);}
 // the snakes: a nest springing from the crown and back of the skull, each arching out and
 // curling, its head raised, tongue out and eyes glinting
 for(let i=0;i<SNAKES;i++){
  const {pts}=snakePath(i);
  const {geo,curve}=taper(pts,.013,.55,12,5);
  P.add(geo,null,(x,y,z)=>{const s=Math.sin(x*140+y*90+z*120);return s>.5?SCALE_HI:s<-.6?SCALE_DARK:SCALE;});
  // the head: a flat wedge pointing along the end of the body, lifted a little
  const end=curve.getPointAt(1),tan=curve.getTangentAt(1);tan.y+=.6;tan.normalize();
  const m=new THREE.Matrix4().lookAt(new THREE.Vector3(),tan,new THREE.Vector3(0,1,0));
  const head=new THREE.Matrix4().makeTranslation(end.x+tan.x*.012,end.y+tan.y*.012,end.z+tan.z*.012).multiply(m);
  const local=(x,y,z,sx=1,sy=1,sz=1)=>head.clone().multiply(at(x,y,z,[0,0,0],[sx,sy,sz]));
  P.add(new THREE.SphereGeometry(.013,7,5),local(0,0,-.004,1,.62,1.5),(x,y)=>y<end.y?BELLY:SCALE_DARK);
  for(const s of [-1,1])G.add(new THREE.SphereGeometry(.0035,4,3),local(s*.009,.004,-.01),SNAKE_GLOW);
  // lookAt points -z down the tangent, so the tongue flicks out along -z
  P.add(new THREE.BoxGeometry(.003,.0015,.026),local(0,-.003,-.03),rgb('#9a1a20'));
 }
 const geo=P.merge(),glow=G.merge();
 return {geo,glow};
}

// a bony arm in scaled bronze bracers, the hand ending in long black talons
function buildArm(){
 const P=pieces();
 P.add(lathe([[.05,.03],[.052,-.04],[.04,-.14],[.034,-.2],[.036,-.24],[.03,-.32]],16),at(0,0,0),(x,y,z)=>mix(SKIN_DARK,SKIN,.5+Math.max(0,z)*6));
 P.add(new THREE.SphereGeometry(.04,10,8),at(0,-.155,0),SKIN_DARK);// the knobbed elbow
 P.add(new THREE.CylinderGeometry(.04,.036,.09,14,1,true),at(0,-.27,0),(x,y,z)=>Math.sin(y*200)*Math.sin(Math.atan2(x,z)*8)>0?BRONZE:BRONZE_DARK);
 P.add(new THREE.TorusGeometry(.039,.005,5,16),at(0,-.228,0,[Math.PI/2,0,0]),BRONZE_HI);
 P.add(new THREE.SphereGeometry(.03,10,8),at(0,-.35,.006,[0,0,0],[.9,1.15,.8]),SKIN);
 for(let k=0;k<4;k++){
  const x=-.018+k*.012;
  P.add(new THREE.CylinderGeometry(.006,.005,.04,5),at(x,-.385,.022,[.5,0,0]),SKIN_DARK);
  P.add(new THREE.ConeGeometry(.005,.04,4),at(x,-.415,.046,[2.1,0,0]),TALON);
 }
 P.add(new THREE.ConeGeometry(.005,.032,4),at(-.03,-.36,.03,[1.6,0,.6]),TALON);// the thumb's talon
 return P.merge();
}

// the harpe: a bronze blade that runs straight and then hooks back into a sickle, built upright
function buildHarpe(){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.012,.013,.12,8),at(0,0,0),(x,y)=>Math.sin(y*240)>0?LEATHER:LEATHER_HI);
 P.add(new THREE.SphereGeometry(.018,8,6),at(0,-.065,0),BRONZE_HI);
 P.add(new THREE.BoxGeometry(.06,.014,.026),at(0,.065,0),BRONZE);
 const blade=new THREE.Shape();
 blade.moveTo(-.014,.07);blade.lineTo(.014,.07);blade.lineTo(.016,.32);
 blade.quadraticCurveTo(.02,.44,-.06,.46);// the hook's back
 blade.quadraticCurveTo(-.11,.45,-.12,.4);// its point
 blade.quadraticCurveTo(-.07,.43,-.03,.4);// the sharpened inner curve
 blade.quadraticCurveTo(-.012,.37,-.012,.32);blade.lineTo(-.014,.07);
 const geo=new THREE.ExtrudeGeometry(blade,{depth:.006,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:1,curveSegments:10});
 geo.translate(0,0,-.003);
 P.add(geo,at(0,0,0,[0,Math.PI/2,0]),(x,y,z)=>{
  const edge=y>.36&&z<-.03?BRONZE_HI:mix(BRONZE_DARK,BRONZE,.4+(y-.07)*1.5);
  return hash(Math.floor(y*40),Math.floor(z*40))>.86?VERDIGRIS:edge;
 });
 const g=P.merge();
 g.applyMatrix4(at(0,0,.01,[.35,0,0]));
 return g;
}

function buildTail(){
 const P=pieces(),pts=TAIL.map(([x,y,z])=>[x-TAIL_ROOT[0],y-TAIL_ROOT[1],z-TAIL_ROOT[2]]);
 const {geo,curve}=taper(pts,.0565,.1,36,10);
 P.add(geo,null,hide(-.022));
 // a rattle-dark tip
 const tip=curve.getPointAt(.97);
 P.add(new THREE.ConeGeometry(.008,.04,5),at(tip.x-.01,tip.y,tip.z-.004,[0,0,Math.PI/2]),SCALE_DARK);
 return P.merge();
}

let S=null,material=null,glowMaterial=null;
function geometry(){
 if(S)return S;
 material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6,metalness:.12,side:THREE.DoubleSide});
 glowMaterial=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false});
 const head=buildHead();
 S={body:buildBody(),head:head.geo,glow:head.glow,arm:buildArm(),harpe:buildHarpe(),tail:buildTail()};
 return S;
}
function mesh(parent,geo,name,m=material){const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=m===material;o.userData.part=name;parent.add(o);return o;}

export function createMedusa(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,.955,0);body.add(head);
 mesh(head,S.head,'head');mesh(head,S.glow,'eyes',glowMaterial);
 const tail=new THREE.Group();tail.position.set(...TAIL_ROOT);body.add(tail);
 mesh(tail,S.tail,'tail');
 const arms=[];
 for(const s of [-1,1]){
  const arm=new THREE.Group();arm.position.set(s*.2,.84,0);arm.rotation.z=s*.12;body.add(arm);mesh(arm,S.arm,'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.012);arms[1].add(weaponSocket);
 mesh(weaponSocket,S.harpe,'harpe');
 return {g,body,legs:[],tail,wings:[],quirk:'human',kind:'medusa',arms,arm:arms[1],weaponSocket,head,hat:null,beard:null,pick:null};
}
