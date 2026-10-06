import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {pieces,rgb,mix} from './homunculus.js';

// The beholder used to fall back on the floating eye. It now has its own look: a floating
// orb of cracked, umber hide with one great amber eye glaring from under a heavy lid, a wide
// grin hacked across its lower face full of crooked needle teeth whose corners hook up past
// the eye, and ten ringed eyestalks writhing up from its crown, each ending in a small
// bloodshot eye of sickly green. A crest of hooked spines runs down its back.
// 4 draws and 3 materials, built once and shared: the hide with its maw, teeth, stalks and
// spines (1 vertex-coloured mesh); the stalk eyes and the great eyeball (2 meshes sharing
// one glossy vertex-coloured material); the great iris (1 emissive mesh).
// Handles: body, head (the great eyeball and iris, pivoting at the eyeball's centre, so a head
// pitch rolls the eye inside its lids). Quirk 'hover'.
// a tyrant of the deep dark, it floats a third larger than a plain orb
const SCALE=1.3;
const LIFT=.62,R=.25,EYE_UP=.45,EYE_R=.085,EYE_D=.2;

const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
// A direction `up` radians above and `side` radians right of the +z axis.
const dir=(up,side)=>new THREE.Vector3(Math.cos(up)*Math.sin(side),Math.sin(up),Math.cos(up)*Math.cos(side));
const hash=(a,b)=>{const v=Math.sin(a*12.9898+b*78.233)*43758.5453;return v-Math.floor(v);};
// A tube whose radius at fraction f along the points is radius(f).
function tube(points,radius,tubular=16,radial=6){
 const curve=new THREE.CatmullRomCurve3(points),geo=new THREE.TubeGeometry(curve,tubular,1,radial,false);
 const pos=geo.attributes.position,c=new THREE.Vector3(),v=new THREE.Vector3();
 for(let i=0;i<=tubular;i++){curve.getPointAt(i/tubular,c);const r=radius(i/tubular);
  for(let j=0;j<=radial;j++){const k=i*(radial+1)+j;v.fromBufferAttribute(pos,k).sub(c).multiplyScalar(r).add(c);pos.setXYZ(k,v.x,v.y,v.z);}}
 geo.computeVertexNormals();return geo;
}

const C={
 hide:rgb('#5a3a24'),dark:rgb('#26160d'),plate:rgb('#7c5838'),belly:rgb('#8a6a4c'),crack:rgb('#1a0e08'),
 lip:rgb('#6e2a26'),gum:rgb('#7a2228'),throat:rgb('#0c0405'),tooth:rgb('#ddd0a4'),root:rgb('#5e4a30'),
 stalkTip:rgb('#94704e'),spine:rgb('#1e140e'),spineTip:rgb('#b8a07a'),
 sclera:rgb('#e2d4ae'),yolk:rgb('#b89868'),vein:rgb('#a0182a'),pupil:rgb('#050304'),
 iris:rgb('#e8a018'),irisDark:rgb('#4e2606'),irisHot:rgb('#fff0a0'),
 small:rgb('#e6c8b8'),smallIris:rgb('#a8d02c'),smallDark:rgb('#2a3a08'),
};

// The grin: in angles from +z, `u` runs corner to corner across `side`, the top edge curls up
// at the corners and the jaw drops deepest at the middle.
const MOUTH_SIDE=.95;
const mouthTop=u=>-.1+.3*u*u;
const mouthBottom=u=>mouthTop(u)-.44*Math.pow(Math.max(0,1-u*u),.6);
// How far inside the grin a direction is (negative outside), in radians.
function inMouth(up,side){
 const u=side/MOUTH_SIDE;if(Math.abs(u)>=1)return -1;
 return Math.min(mouthTop(u)-up,up-mouthBottom(u),(1-Math.abs(u))*.3);
}
const eyeDir=dir(EYE_UP,0);

// The hide: one sphere, displaced. Lumpy plates split by dark cracks, a pit for the great eye
// rimmed by a heavy, overhanging lid, and the grin sunk deep into the face.
function hide(P){
 const geo=new THREE.SphereGeometry(1,96,64);geo.deleteAttribute('uv');geo.deleteAttribute('normal');
 const pos=geo.attributes.position,v=new THREE.Vector3();
 const radius=(d)=>{
  const up=Math.asin(THREE.MathUtils.clamp(d.y,-1,1)),side=Math.atan2(d.x,d.z);
  // plates: a coarse cell pattern; cracks where two cells meet
  const cell=Math.sin(d.x*11+Math.sin(d.y*7)*1.4)*Math.sin(d.y*13+d.z*4)*Math.sin(d.z*12-d.x*3);
  let r=R*(1+.03*cell+.012*Math.sin(d.x*31+d.y*17)*Math.sin(d.z*29));
  r-=.006*smooth(.12,0,Math.abs(cell));
  r*=1-.06*smooth(0,-1,d.y);// a little flatter underneath
  // the eye's pit and its lid: heaviest above, where it hangs over the iris
  const a=d.angleTo(eyeDir),over=smooth(-.1,.5,d.y-eyeDir.y);
  r-=.06*smooth(.46,.3,a);
  r+=(.02+.03*over)*Math.exp(-(((a-.47)/(.06+.03*over))**2));
  // the grin
  const m=inMouth(up,side);
  r-=.1*smooth(0,.08,m);
  r+=.014*Math.exp(-(((m+.02)/.025)**2));// rolled lips
  return r;
 };
 for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).normalize();pos.setXYZ(i,...v.clone().multiplyScalar(radius(v)).toArray());}
 const welded=mergeVertices(geo);geo.dispose();welded.computeVertexNormals();
 P.add(welded,null,(x,y,z)=>{
  const d=new THREE.Vector3(x,y,z),r=d.length();d.normalize();
  const up=Math.asin(THREE.MathUtils.clamp(d.y,-1,1)),side=Math.atan2(d.x,d.z);
  const cell=Math.sin(d.x*11+Math.sin(d.y*7)*1.4)*Math.sin(d.y*13+d.z*4)*Math.sin(d.z*12-d.x*3);
  let c=mix(C.hide,C.plate,smooth(.1,.6,Math.abs(cell))*.7);
  c=mix(c,C.crack,smooth(.1,0,Math.abs(cell))*.8);
  c=mix(c,C.belly,smooth(-.2,-.8,d.y)*.6);
  c=mix(c,C.dark,.25*hash(Math.round(up*20),Math.round(side*20)));
  // shadowed eye pit and lid
  const a=d.angleTo(eyeDir);c=mix(c,C.dark,smooth(.5,.36,a)*.8);
  const m=inMouth(up,side);
  if(m>-.03){c=mix(c,C.lip,smooth(-.03,0,m));c=mix(c,C.gum,smooth(0,.03,m));c=mix(c,C.throat,smooth(.02,.08,m));}
  return c;
 });
}

// Crooked needle teeth along both lips, longest at the middle, pointing across the gape.
function teeth(P){
 const up=new THREE.Vector3(0,1,0);
 for(const [edge,n,toward] of [[mouthTop,15,-1],[mouthBottom,13,1]]){
  for(let i=0;i<n;i++){
   const u=-.9+1.8*(i+.5)/n,side=u*MOUTH_SIDE,e=edge(u)+toward*.012;
   const base=dir(e,side).multiplyScalar(R*.975),across=dir(e+toward*.2,side).multiplyScalar(R*.9).sub(base).normalize();
   const out=base.clone().normalize(),lean=across.clone().addScaledVector(out,.35+.2*hash(i,toward)).normalize();
   lean.x+=(hash(i*3,toward)-.5)*.5;lean.normalize();
   const len=(.026+.03*(1-u*u))*(.75+.5*hash(i,toward*7)),w=.0065+.003*(1-u*u),geo=new THREE.ConeGeometry(w,len,5);
   geo.translate(0,len/2,0);
   const q=new THREE.Quaternion().setFromUnitVectors(up,lean);
   const m=new THREE.Matrix4().compose(base,q,new THREE.Vector3(1,1,1));
   P.add(geo,m,(x,y,z)=>{const t=new THREE.Vector3(x,y,z).sub(base).dot(lean)/len;return mix(C.root,C.tooth,smooth(0,.3,t));});
  }
 }
}

// Ten eyestalks rising from the crown: each leaves the hide along its normal, bends outward and
// back on itself, ringed like a worm, thinning to a neck under its eye. Their tips are returned
// with the way each eye looks.
export const STALKS=[[.95,-.55,.26],[.95,.55,.27],[1.1,-1.35,.3],[1.1,1.35,.29],[1.0,-2.2,.25],[1.0,2.2,.26],[1.25,-2.9,.22],[1.25,2.9,.23],[1.38,-.25,.32],[1.38,.4,.3]];
// Stalk i's control points (in the lifted body's frame) and the way it leans out from the crown.
// beholder-writhe.js reads these to find each stalk's vertices.
export function stalkPath(i){
 const [up,side,len]=STALKS[i],n=dir(up,side),root=n.clone().multiplyScalar(R*.96);
 const outward=new THREE.Vector3(n.x,0,n.z).normalize(),curl=(i%2?1:-1)*(.4+.3*hash(i,1));
 const tangent=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),outward).normalize();
 const pts=[root];
 for(let k=1;k<=5;k++){const f=k/5;
  pts.push(root.clone().addScaledVector(n,len*f*.6).addScaledVector(new THREE.Vector3(0,1,0),len*f*.55)
   .addScaledVector(outward,len*.35*Math.sin(f*2.4))
   .addScaledVector(tangent,len*.22*curl*Math.sin(f*Math.PI*1.3)));}
 return {pts,root,len,outward};
}
function stalks(P){
 const tips=[];
 STALKS.forEach((_,i)=>{
  const {pts,root,len,outward}=stalkPath(i);
  const radius=f=>(.019-.01*f)*(1+.18*Math.max(0,Math.sin(f*Math.PI*9)))*(f>.9?1-.3*(f-.9)/.1:1)+.004*smooth(.08,0,f);
  P.add(tube(pts,radius,40,7),null,(x,y,z)=>{
   const h=new THREE.Vector3(x,y,z).sub(root).length()/len;
   return mix(mix(C.hide,C.stalkTip,smooth(.3,1,h)),C.crack,.35*smooth(.6,1,Math.sin(h*Math.PI*9)));
  });
  const tip=pts[pts.length-1],look=tip.clone().sub(pts[pts.length-2]).normalize().lerp(new THREE.Vector3(0,0,1),.45).add(outward.clone().multiplyScalar(.3)).normalize();
  tips.push({tip,look});
 });
 return tips;
}

// A crest of hooked, backward-raking spines down the back, below the rear stalks.
function spines(P){
 const up=new THREE.Vector3(0,1,0);
 for(let i=0;i<6;i++){
  const a=.75-i*.28,n=dir(a,Math.PI),base=n.clone().multiplyScalar(R*.97),len=.06-.006*i;
  const rake=n.clone().add(new THREE.Vector3(0,-.6,-.4)).normalize();
  const pts=[base,base.clone().addScaledVector(n,len*.55),base.clone().addScaledVector(n,len*.8).addScaledVector(rake,len*.4)];
  const geo=tube(pts,f=>.014*(1-f)+.0012,8,5),top=len;
  P.add(geo,null,(x,y,z)=>mix(C.spine,C.spineTip,smooth(top*.5,top*1.05,new THREE.Vector3(x,y,z).sub(base).length())));
 }
}

// The small eyes: a ball at each stalk tip with a green iris and a pinprick pupil facing `look`.
function smallEyes(P,tips){
 const z=new THREE.Vector3(0,0,1);
 for(const {tip,look} of tips){
  const r=.026,c=tip.clone().addScaledVector(look,r*.6),m=new THREE.Matrix4().compose(c,new THREE.Quaternion().setFromUnitVectors(z,look),new THREE.Vector3(1,1,1));
  P.add(new THREE.SphereGeometry(r,14,10),m,(x,y,zz)=>{
   const d=new THREE.Vector3(x,y,zz).sub(c).normalize(),f=d.dot(look);
   let col=mix(C.small,C.vein,.5*smooth(.2,-.8,f));
   if(f>.8)col=mix(C.smallIris,C.smallDark,smooth(.93,.86,f));
   return f>.97?C.pupil:col;
  });
 }
}

// The great eyeball, centred on the head's origin and looking down +z: a yellowing sclera with
// red veins creeping in toward the iris.
function eyeball(P){
 P.add(new THREE.SphereGeometry(EYE_R,40,28),null,(x,y,z)=>{const f=z/EYE_R;return mix(mix(C.sclera,C.yolk,smooth(.9,.2,f)),C.vein,.4*smooth(.2,-.5,f));});
 const onEye=(up,side)=>dir(up,side).multiplyScalar(EYE_R+.0015);
 for(let i=0;i<10;i++){
  const a=i/10*Math.PI*2+.3,pts=[];
  for(let k=0;k<=5;k++){const f=k/5,rad=1.15-.55*f+Math.sin(f*7+i)*.04;pts.push(onEye(Math.sin(a)*rad,Math.cos(a)*rad+Math.sin(f*5+i)*.05));}
  P.add(tube(pts,f=>.0028-.0018*f,14,4),null,()=>C.vein);
 }
 // the pupil: a round disc just proud of the iris
 const pupil=new THREE.SphereGeometry(EYE_R+.004,24,4,0,Math.PI*2,0,.17);pupil.rotateX(Math.PI/2);
 P.add(pupil,null,()=>C.pupil);
}
// The great iris: a cap on the eyeball, molten amber, ringed dark at its edge with jagged streaks.
function iris(){
 const P=pieces(),cap=new THREE.SphereGeometry(EYE_R+.0025,48,10,0,Math.PI*2,0,.55);cap.rotateX(Math.PI/2);
 P.add(cap,null,(x,y,z)=>{
  const a=Math.acos(THREE.MathUtils.clamp(z/Math.hypot(x,y,z),-1,1))/.55,ang=Math.atan2(y,x);
  const streak=.5+.5*Math.sin(ang*23+Math.sin(ang*7)*2);
  let c=mix(C.iris,C.irisDark,.35*streak*smooth(.3,.8,a));c=mix(c,C.irisHot,smooth(.5,.3,a));return mix(c,C.irisDark,smooth(.8,.98,a));
 });
 return P.merge();
}

const weld=geo=>{const w=mergeVertices(geo);geo.dispose();return w;};
let shared=null;
function build(){
 const flesh=pieces();hide(flesh);teeth(flesh);const tips=stalks(flesh);spines(flesh);
 const small=pieces();smallEyes(small,tips);
 const ball=pieces();eyeball(ball);
 return {
  flesh:weld(flesh.merge()),small:weld(small.merge()),ball:weld(ball.merge()),iris:weld(iris()),
  fleshMat:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62,metalness:.04}),
  ballMat:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.14}),
  irisMat:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.18,emissive:'#d07a10',emissiveIntensity:.95}),
 };
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createBeholder(){
 shared||=build();
 const g=new THREE.Group(),body=new THREE.Group(),lift=new THREE.Group(),head=new THREE.Group(),gaze=new THREE.Group();
 g.add(body);body.add(lift);lift.add(head);head.add(gaze);lift.position.y=LIFT;g.scale.setScalar(SCALE);
 // the head sits unturned at the eyeball's centre; the eye inside it is tipped up to its rest gaze
 head.position.copy(eyeDir).multiplyScalar(EYE_D);gaze.rotation.x=-EYE_UP;
 mesh(lift,shared.flesh,shared.fleshMat,'hide');mesh(lift,shared.small,shared.ballMat,'stalk eyes');
 mesh(gaze,shared.ball,shared.ballMat,'eyeball');mesh(gaze,shared.iris,shared.irisMat,'iris');
 return {g,body,legs:[],tail:null,wings:[],quirk:'hover',head};
}
