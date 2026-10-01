import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The shade, a soul of the Underworld that only silver can hurt, used to be the ghost's sheet tinted
// violet. It is now a gaunt, hunched half-thing of shadow: a starved torso of smoke leaning forward
// with its ribs, breastbone, collarbones and spine showing pale through it, a ragged mantle hanging
// off the shoulders and back in pointed tatters, and no legs: below the ribs it comes apart into
// twisting tendrils of murk that trail back and thin to nothing. The head hangs forward in a peaked,
// swept-back cowl with a jagged hem; inside is a narrow skull with high cheekbones, deep sockets
// with a violet pinpoint in each, and a jaw dropped open on a gaping mouth and broken teeth. Long,
// bony arms reach out of torn sleeves, the forearms bare, each hand ending in four hooked claws
// curled down.
// Draws: body shadow, ribs and spine, cowl, skull, eyes, one per arm: 7. Geometry and materials are
// built once and shared. Nothing casts a shadow.
// Handles: body, head (with the 'eyes' mesh), arms, arm, ghost ('shade', for ghost-drift.js, which
// takes each arm's cuff at y -.3: the wrist here). No legs, wings or tail. Quirk 'hover'.

const C={
 void:rgb('#07050b'),smoke:rgb('#1d1528'),smokeHi:rgb('#3c2c52'),violet:rgb('#5e4386'),
 bone:rgb('#bfb6cc'),boneDark:rgb('#6a6280'),claw:rgb('#2a2232'),
};
const ARM_PITCH=-1.0;// the arms reach forward and down
const HUNCH=.3;// how far the chest leans forward per unit of height above the waist
const clamp=THREE.MathUtils.clamp;
const hunch=y=>Math.max(0,y-.5)*HUNCH;
// a sharp, pointed wave (0..1) for jagged hems
const tri=a=>{const f=((a/Math.PI)%2+2)%2;return 1-Math.abs(f-1);};

function smooth(points,n){
 return new THREE.SplineCurve(points.map(([r,y])=>new THREE.Vector2(r,y))).getSpacedPoints(n);
}
// lean the torso forward from the waist up
function lean(geo){
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+hunch(p.getY(i)));
 return geo;
}
// a tube along a curve, tapering from r0 to r1
function tendril(P,points,r0,r1,colour,tubular=14,radial=6){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const geo=new THREE.TubeGeometry(curve,tubular,1,radial,false),p=geo.attributes.position,v=new THREE.Vector3(),c=new THREE.Vector3();
 for(let i=0;i<=tubular;i++){
  const t=i/tubular,r=r0+(r1-r0)*t;curve.getPointAt(t,c);
  for(let j=0;j<=radial;j++){const k=i*(radial+1)+j;v.fromBufferAttribute(p,k).sub(c).multiplyScalar(r).add(c);p.setXYZ(k,v.x,v.y,v.z);}
 }
 geo.computeVertexNormals();
 P.add(geo,null,colour);
}

function buildBody(){
 const P=pieces();
 // the starved torso, pinched at the waist, narrow-chested, leaning forward
 const torso=new THREE.LatheGeometry(smooth([[.001,.4],[.05,.43],[.068,.5],[.082,.56],[.1,.62],[.122,.7],[.136,.77],[.13,.82],[.096,.852],[.05,.87],[.001,.875]],24),30);
 torso.scale(1,1,.78);
 P.add(lean(torso),null,(x,y,z)=>mix(C.void,C.smoke,clamp((y-.42)/.3,0,1)));
 // the mantle: hangs off the shoulders and round the back, open at the chest, its hem torn into points
 const mantle=new THREE.LatheGeometry(smooth([[.105,.865],[.15,.82],[.172,.72],[.182,.6],[.19,.48]],18),40,Math.PI/2-.45,Math.PI+.9);
 {
  const p=mantle.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i)*.82,a=Math.atan2(x,z),low=clamp((.74-y)/.26,0,1);
   const drop=low*low*(.16*tri(a*7+.4)**2.5+.05*tri(a*17+1.3));
   p.setXYZ(i,x*(1+low*.06*Math.sin(9*a)),y-drop,z-low*.06);
  }
  lean(mantle);mantle.computeVertexNormals();
 }
 P.add(mantle,null,(x,y,z)=>mix(mix(C.smokeHi,C.smoke,clamp((.82-y)/.2,0,1)),C.void,clamp((.5-y)/.18,0,1)*.8+(.5-.5*Math.sin(9*Math.atan2(x,z)))*.15));
 // below the ribs it comes apart: tendrils of murk twisting down and trailing back to nothing
 for(let i=0;i<7;i++){
  const a=i/7*Math.PI*2+.3,tw=(i%2?1:-1)*.5,end=.1+(i%3)*.04;
  tendril(P,[[Math.sin(a)*.045,.46,Math.cos(a)*.035],[Math.sin(a+tw*.4)*.085,.36,Math.cos(a+tw*.4)*.065-.03],
   [Math.sin(a+tw)*.1,.25,Math.cos(a+tw)*.075-.08],[Math.sin(a+tw*1.8)*.07,end,Math.cos(a+tw*1.8)*.055-.16]],.042,.003,
   (x,y)=>mix(C.smoke,C.violet,clamp((.44-y)/.32,0,1)*.55));
 }
 return P.merge();
}

// ribs, breastbone, collarbones and spine, pale through the smoke
function buildBones(){
 const P=pieces();
 const bone=(x,y)=>mix(C.boneDark,C.bone,clamp((y-.56)/.24,0,1));
 for(const [y,r] of [[.765,.142],[.725,.134],[.685,.124],[.645,.113],[.605,.102]]){
  P.add(new THREE.TorusGeometry(r,.008,4,18,Math.PI),at(0,y,hunch(y)-.004,[Math.PI/2+.32,0,0],[1,.8,1]),bone);
 }
 P.add(new THREE.BoxGeometry(.016,.15,.01),at(0,.715,hunch(.715)+.104,[-.25,0,0]),bone);
 for(const s of [-1,1])P.add(new THREE.CylinderGeometry(.007,.006,.13,5),at(s*.06,.83,hunch(.83)+.07,[0,0,s*(Math.PI/2-.2)]),bone);
 for(let i=0;i<7;i++){const y=.5+i*.055;P.add(new THREE.SphereGeometry(.013,6,4),at(0,y,hunch(y)-.1+i*.004,[0,0,0],[1.1,.7,1]),bone);}
 return P.merge();
}

// a peaked, swept-back cowl, open at the face, its hem jagged
function buildCowl(){
 const P=pieces();
 const cowl=new THREE.SphereGeometry(.115,30,18,Math.PI/2+.85,Math.PI*2-1.7,0,Math.PI*.8),p=cowl.attributes.position;
 for(let i=0;i<p.count;i++){
  let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  if(y>.05){y+=(y-.05)*1.1;z-=(y-.05)*.55;}
  if(y<-.03){const a=Math.atan2(x,z),low=clamp((-.03-y)/.07,0,1);y-=low*(.07*tri(a*6+.8)**2+.025*tri(a*13));}
  p.setXYZ(i,x*1.05,y*1.08,z*1.12);
 }
 cowl.computeVertexNormals();
 P.add(cowl,at(0,.02,-.01),(x,y)=>mix(C.void,C.smokeHi,clamp((y+.06)/.28,0,1)));
 return P.merge();
}

// a narrow skull with high cheekbones and deep sockets, the jaw dropped open on broken teeth
function buildSkull(){
 const P=pieces();
 const bone=(x,y)=>mix(C.boneDark,C.bone,clamp((y+.07)/.15,0,1));
 P.add(new THREE.SphereGeometry(.078,18,14),at(0,.03,-.01,[0,0,0],[.86,1.05,1]),bone);
 P.add(new THREE.SphereGeometry(.058,14,10),at(0,-.018,.026,[0,0,0],[.9,1.1,.95]),bone);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.018,8,6),at(s*.042,-.006,.052,[0,0,0],[1.4,.8,1]),C.bone);
  P.add(new THREE.SphereGeometry(.024,10,8),at(s*.029,.012,.066,[0,0,s*.35],[1,1.3,.6]),C.void);
 }
 P.add(new THREE.ConeGeometry(.011,.024,3),at(0,-.016,.079,[Math.PI,0,0],[1,1,.5]),C.void);
 // the jaw, dropped open, and the gaping mouth between
 P.add(new THREE.SphereGeometry(.03,10,8),at(0,-.068,.058,[-.1,0,0],[.85,1.6,.5]),C.void);
 P.add(new THREE.SphereGeometry(.046,14,8,0,Math.PI*2,Math.PI/2,Math.PI/2),at(0,-.062,.022,[.42,0,0],[.82,1.1,1.15]),bone);
 for(let i=0;i<6;i++){
  const x=(i-2.5)*.0095;
  if(i!==1)P.add(new THREE.ConeGeometry(.0045,.016,4),at(x,-.047,.071-Math.abs(x)*.3,[Math.PI,0,0]),C.bone);
  if(i!==4)P.add(new THREE.ConeGeometry(.004,.013,4),at(x*.9,-.098,.064-Math.abs(x)*.3),C.boneDark);
 }
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.009,8,6),at(s*.029,.012,.072),[1,1,1]);
 return P.merge();
}

// a long bony arm from a torn sleeve, the forearm bare, the hand four hooked claws curled down
function buildArm(){
 const P=pieces();
 const bone=(x,y)=>mix(C.bone,C.boneDark,clamp(-y/.45,0,1)*.6);
 P.add(new THREE.SphereGeometry(.03,10,8),at(0,0,0),C.boneDark);
 tendril(P,[[0,0,0],[0,-.09,.004],[0,-.17,0]],.02,.015,bone,6,6);
 P.add(new THREE.SphereGeometry(.019,8,6),at(0,-.17,0),C.bone);
 tendril(P,[[0,-.17,0],[0,-.24,.003],[0,-.31,0]],.015,.011,bone,6,6);
 P.add(new THREE.SphereGeometry(.02,8,6),at(0,-.33,-.003,[0,0,0],[1.2,1,.6]),C.boneDark);
 for(let i=0;i<4;i++){
  const fx=(i-1.5)*.013,sp=1+Math.abs(i-1.5)*.15,len=i===0||i===3?.85:1;
  tendril(P,[[fx,-.335,0],[fx*1.6*sp,-.38*len-.02,-.008],[fx*1.9*sp,-.42*len-.02,-.03],[fx*2*sp,-.43*len-.02,-.065]],.006,.001,
   (x,y,z)=>mix(C.bone,C.claw,clamp((-.36-y)/.05+(-z-.02)*20,0,1)),8,4);
 }
 // the sleeve: a short ragged shroud over the upper arm, its rags hanging down in world space
 const sleeve=new THREE.CylinderGeometry(.036,.05,.16,14,4,true),p=sleeve.attributes.position;
 sleeve.translate(0,-.07,0);
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(x,z),low=clamp((-.07-y)/.08,0,1);
  p.setY(i,y-low*.06*tri(a*4+.5)**2);
 }
 sleeve.computeVertexNormals();
 P.add(sleeve,null,(x,y)=>mix(C.smokeHi,C.void,clamp(-y/.18,0,1)));
 const hang=-(Math.PI+ARM_PITCH);
 for(const [y,z,len] of [[-.12,-.035,.14],[-.15,.03,.1],[-.22,-.015,.09]]){
  const geo=new THREE.ConeGeometry(.024,len,4,2,true);geo.translate(0,len/2,0);
  P.add(geo,at(0,y,z,[hang,0,0]),(x,yy)=>mix(C.smoke,C.void,.5));
 }
 return P.merge();
}

let shared=null;
function geometry(){
 if(shared)return shared;
 return shared={body:buildBody(),bones:buildBones(),cowl:buildCowl(),skull:buildSkull(),eyes:buildEyes(),arm:buildArm(),
  shadow:new THREE.MeshStandardMaterial({vertexColors:true,emissive:'#24143a',emissiveIntensity:.6,roughness:.95,transparent:true,opacity:.86,side:THREE.DoubleSide}),
  bone:new THREE.MeshStandardMaterial({vertexColors:true,emissive:'#3a2a5c',emissiveIntensity:.35,roughness:.7}),
  eye:new THREE.MeshStandardMaterial({color:'#c49aff',emissive:'#b07aff',emissiveIntensity:3,roughness:.3})};
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=false;m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createShade(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,S.shadow,'body');mesh(body,S.bones,S.bone,'bones');
 const head=new THREE.Group();head.position.set(0,.94,.13);head.rotation.x=.2;body.add(head);
 mesh(head,S.cowl,S.shadow,'cowl');mesh(head,S.skull,S.bone,'skull');mesh(head,S.eyes,S.eye,'eyes');
 const arms=[];
 for(const s of [-1,1]){
  const arm=new THREE.Group();arm.position.set(s*.15,.8,hunch(.8)-.01);arm.rotation.set(ARM_PITCH,0,s*.14);body.add(arm);
  mesh(arm,S.arm,S.shadow,'arm');arms.push(arm);
 }
 return {g,body,legs:[],tail:null,wings:[],quirk:'hover',arms,arm:arms[1],head,ghost:'shade'};
}
