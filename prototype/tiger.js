import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The tiger used to be the generic feline scaled up 1.6×: an orange egg with six black bars
// across its back. It is now a long, heavy-shouldered big cat at its own size: a deep chest and
// shoulder hump, a lean waist and powerful haunches, thick forelegs on broad paws and bent hind
// legs. The coat is painted vertex by vertex: burnt orange, deepening along the spine, with
// wavy black stripes that sweep down the flanks and fork, white on the belly, inner legs, muzzle,
// cheek ruffs and above the eyes, and stripes banding the legs. The head has a broad muzzle, cheek
// ruffs, a pink nose, white whiskers, amber eyes and round ears, black behind with a white spot.
// The tail is ringed black and ends in a black tip.
// Each moving part (body, head, each leg and the tail) is one merged, vertex-coloured mesh on one
// shared material, plus one small mesh for the glowing eyes: 8 draws. The geometry is built once.
// Handles: body, head, legs (in the old feline order: left hind, left fore, right hind, right
// fore), tail, quirk 'feline'. The model is built at its full size (g.scale 1).

const ORANGE=rgb('#d8741f'),ORANGE_DEEP=rgb('#a84a12'),ORANGE_PALE=rgb('#e8a45a');
const WHITE=rgb('#f2ebdc'),CREAM=rgb('#e6d2b0'),BLACK=rgb('#17110d');
const NOSE=rgb('#c07a78'),LIP=rgb('#2a1a16'),EAR_IN=rgb('#e8c8b0');
const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const smooth=(a,b,v)=>{const t=THREE.MathUtils.clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};

// A tapered limb or tail: capsules between successive points, radius eased from r0 to r1.
function chain(P,pts,r0,r1,colour,radial=9){
 const v=pts.map(p=>new THREE.Vector3(...p)),Y=new THREE.Vector3(0,1,0);
 for(let i=0;i<v.length-1;i++){
  const a=v[i],b=v[i+1],ra=r0+(r1-r0)*i/(v.length-1),rb=r0+(r1-r0)*(i+1)/(v.length-1),d=b.clone().sub(a),len=d.length();
  const q=new THREE.Quaternion().setFromUnitVectors(Y,d.normalize());
  P.add(new THREE.CylinderGeometry(rb,ra,len,radial,1,true),new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),q,new THREE.Vector3(1,1,1)),colour);
  P.add(new THREE.SphereGeometry(rb,radial,Math.max(6,radial*.6|0)),at(b.x,b.y,b.z),colour);
 }
 P.add(new THREE.SphereGeometry(r0,radial,Math.max(6,radial*.6|0)),at(v[0].x,v[0].y,v[0].z),colour);
}

// The flank and back coat. Stripes are bands across the body's length, bent into chevrons over
// the spine, wavering down the sides and forking; they thin out toward the belly, which is white.
function coat(x,y,z){
 const top=smooth(.34,.6,y),belly=1-smooth(.3,.4,y+Math.abs(x)*.25);
 let c=mix(ORANGE,ORANGE_DEEP,top*.55);c=mix(c,ORANGE_PALE,smooth(.42,.34,y)*.5);
 const phase=z*26+Math.abs(x)*9-Math.sin(y*14+z*3)*1.1,band=Math.sin(phase);
 const fork=Math.sin(phase*2+y*20)>.2;
 const width=.62+.2*(1-top)-.12*hash(Math.floor(phase/Math.PI));
 const stripe=band>width||(fork&&band>width-.25&&y<.46);
 // no stripes on the neck ruff's white or right down on the belly
 if(stripe&&y>.33-Math.abs(x)*.2)c=mix(c,BLACK,.92*smooth(.32,.4,y));
 return mix(c,WHITE,belly);
}

function buildBody(){
 const P=pieces();
 // the torso: deep chest and shoulders, a lean waist, round haunches
 P.add(new THREE.SphereGeometry(1,20,14),at(0,.44,-.01,[0,0,0],[.17,.17,.4]),coat);
 P.add(new THREE.SphereGeometry(1,16,12),at(0,.44,.2,[0,0,0],[.185,.2,.2]),coat);
 P.add(new THREE.SphereGeometry(1,12,8),at(0,.52,.18,[0,0,0],[.15,.1,.15]),coat);
 P.add(new THREE.SphereGeometry(1,16,12),at(0,.46,-.24,[0,0,0],[.17,.17,.18]),coat);
 for(const s of [-1,1]){
  // shoulder blades and thighs bulging where the legs join
  P.add(new THREE.SphereGeometry(1,12,8),at(s*.1,.45,.23,[0,0,0],[.09,.14,.12]),coat);
  P.add(new THREE.SphereGeometry(1,12,8),at(s*.1,.43,-.25,[0,0,0],[.09,.15,.15]),coat);
 }
 // the belly hanging a little, white
 P.add(new THREE.SphereGeometry(1,14,8),at(0,.35,0,[0,0,0],[.13,.08,.3]),coat);
 // the thick neck up to the head
 chain(P,[[0,.48,.28],[0,.55,.38]],.13,.11,coat,12);
 return P.merge();
}

// Head-local colouring: white muzzle, chin, cheek ruffs and brows; black stripes on the forehead
// and down the cheeks.
function face(x,y,z){
 let c=mix(ORANGE,ORANGE_DEEP,smooth(0,.12,y)*.4);
 const muzzle=z>.06&&y<.0&&Math.abs(x)<.08,chin=y<-.05,brow=z>.07&&y>.03&&y<.06&&Math.abs(Math.abs(x)-.045)<.025;
 const cheek=Math.abs(x)>.08&&y<.01&&z>-.03;
 if(muzzle||chin||brow||cheek)c=mix(c,WHITE,.9);
 // forehead: thin vertical stripes over the crown
 if(y>.05&&z>-.02&&Math.abs(x)<.07&&Math.abs(Math.sin(x*70))>.8&&!brow)c=mix(c,BLACK,.85);
 // cheeks: two swept stripes each side
 if(Math.abs(x)>.07&&Math.sin(y*55-z*30)>.55&&y>-.07)c=mix(c,BLACK,.85);
 return c;
}

function buildHead(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.12,18,12),at(0,.02,0,[0,0,0],[1.05,.88,1]),face);
 // broad muzzle and chin
 P.add(new THREE.SphereGeometry(.065,12,8),at(0,-.03,.1,[0,0,0],[1.25,.75,.85]),face);
 P.add(new THREE.SphereGeometry(.045,12,8),at(0,-.07,.07,[0,0,0],[1.1,.6,1]),WHITE);
 for(const s of [-1,1]){
  // whisker pads and ruffs of cheek fur
  P.add(new THREE.SphereGeometry(.035,12,8),at(s*.032,-.04,.14,[0,0,0],[1,.8,.8]),WHITE);
  P.add(new THREE.ConeGeometry(.06,.1,8),at(s*.115,-.03,-.01,[0,0,s*1.7],[1,1,.55]),face);
  // round ears: black behind, a white spot, pale inside
  P.add(new THREE.SphereGeometry(.042,12,8,0,Math.PI*2,0,Math.PI/2),at(s*.075,.1,-.03,[-.25,0,s*-.35],[1,.9,.45]),(x,y,z)=>z<-.035?BLACK:EAR_IN);
  P.add(new THREE.CircleGeometry(.014,10),at(s*.079,.115,-.052,[Math.PI+.25,0,s*.35]),WHITE);
  // dark eye rims and lids (the eyes themselves glow, in their own mesh)
  P.add(new THREE.SphereGeometry(.024,12,8),at(s*.048,.025,.1,[0,0,s*.2],[1.25,.75,.5]),LIP);
  // whiskers
  for(let i=0;i<4;i++)P.add(new THREE.CylinderGeometry(.0014,.0014,.13,3),at(s*.1,-.045+i*.008,.13,[0,.3*s,s*(1.35+i*.08)]),WHITE);
 }
 // pink nose leather and the dark line of the mouth
 P.add(new THREE.SphereGeometry(.022,10,8),at(0,-.005,.155,[0,0,0],[1.2,.7,.7]),NOSE);
 P.add(new THREE.BoxGeometry(.004,.03,.006),at(0,-.035,.155),LIP);
 P.add(new THREE.TorusGeometry(.028,.003,4,10,Math.PI),at(0,-.05,.148,[0,0,Math.PI]),LIP);
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.017,10,8),at(s*.048,.027,.108,[0,0,0],[1.1,.8,.5]),[1,1,1]);
 return P.merge();
}

// Leg-local colouring: orange outside, white inside and on the paws, banded with stripes.
const leg=side=>(x,y,z)=>{
 let c=ORANGE;
 const inner=x*side<-.015;
 if(inner||y<-.36)c=mix(c,WHITE,.85);
 else if(Math.sin(y*40+z*8)>.62&&y>-.3)c=mix(c,BLACK,.9);
 return c;
};
function paw(P,z,side){
 P.add(new THREE.SphereGeometry(.055,12,8),at(0,-.4,z,[0,0,0],[1,.55,1.25]),leg(side));
 for(let i=0;i<4;i++){const x=(i-1.5)*.024;P.add(new THREE.SphereGeometry(.018,8,6),at(x,-.408,z+.06-Math.abs(i-1.5)*.008,[0,0,0],[1,.8,1.2]),WHITE);}
}
function buildFore(side){
 const P=pieces();
 chain(P,[[0,.02,0],[0,-.18,.01],[0,-.32,.02],[0,-.38,.03]],.07,.045,leg(side));
 paw(P,.035,side);
 return P.merge();
}
function buildHind(side){
 const P=pieces();
 // thigh forward and down to the knee, the long shank back to the hock, then down to the paw
 chain(P,[[0,.02,.0],[0,-.14,.06],[0,-.27,-.04],[0,-.37,-.01]],.08,.04,leg(side));
 paw(P,.01,side);
 return P.merge();
}

function buildTail(){
 const P=pieces(),pts=[[0,0,0],[0,-.1,-.08],[0,-.16,-.18],[.03,-.13,-.28],[.06,-.04,-.33],[.08,.06,-.34]];
 // ringed: distance down the tail picks black bands, and the last stretch is all black
 const ring=(x,y,z)=>{const d=Math.hypot(x,y+.02,z*1.02);return d>.36?BLACK:Math.sin(d*42)>.45?BLACK:mix(ORANGE,ORANGE_DEEP,.2);};
 chain(P,pts,.034,.026,ring,10);
 return P.merge();
}

let S=null,material=null,eyeMaterial=null;
function geometry(){
 if(S)return S;
 material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88});
 eyeMaterial=new THREE.MeshStandardMaterial({color:0xf0b830,emissive:0xa06a10,emissiveIntensity:.9,roughness:.25});
 S={body:buildBody(),head:buildHead(),eyes:buildEyes(),fore:{[-1]:buildFore(-1),1:buildFore(1)},hind:{[-1]:buildHind(-1),1:buildHind(1)},tail:buildTail()};
 return S;
}
function mesh(parent,geo,mat,name){const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createTiger(){
 const S=geometry(),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,material,'body');
 const head=new THREE.Group();head.position.set(0,.6,.44);body.add(head);
 mesh(head,S.head,material,'head');const eyes=mesh(head,S.eyes,eyeMaterial,'eyes');eyes.castShadow=false;
 const legs=[];
 for(const s of [-1,1])for(const fore of [false,true]){
  const l=new THREE.Group();l.position.set(s*.1,.42,fore?.23:-.25);body.add(l);
  mesh(l,fore?S.fore[s]:S.hind[s],material,fore?'foreleg':'hindleg');legs.push(l);
 }
 const tail=new THREE.Group();tail.position.set(0,.5,-.38);body.add(tail);mesh(tail,S.tail,material,'tail');
 return {g,body,legs,tail,wings:[],quirk:'feline',head};
}
