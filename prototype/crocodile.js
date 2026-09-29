import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Crocodiles used to be the lizard scaled up: a smooth egg of a body, a box of a
// head and a tail of tubes. They now lie low with their bellies nearly on the
// floor, facing +z. The body is broad and flat, with rows of keeled scutes down
// the back and a cluster of bigger ones on the nape. The head is a long, flat,
// tapering snout with nostrils on a knob at the tip, eyes raised on the crown
// and ivory teeth along the jaw line; the big fourth tooth of the lower jaw
// shows outside the upper one. The legs sprawl out to the sides on webbed,
// clawed feet. The tail is deep and flattened side to side, with a double crest
// that merges into one, and it sweeps off to one side. Juveniles are brighter
// with bold dark crossbands.
// Each moving part (body, head, jaw, tail, each leg) is one merged,
// vertex-coloured mesh with a shared material, plus one small mesh for the eyes:
// 9 draws. The geometry is built once per look and shared.
// Handles: body, head, jaw, tail, legs. It keeps the 'lizard' quirk.

const LOOKS={
 crocodile:{scale:.9,back:'#394325',flank:'#58623a',belly:'#cfc592',band:'#252c16',bands:.35},
 'baby crocodile':{scale:.5,back:'#4b5a2f',flank:'#6f7b43',belly:'#e2d9a8',band:'#1c2210',bands:.8},
};
const clamp01=v=>THREE.MathUtils.clamp(v,0,1);

function palette(look){
 return {back:rgb(look.back),flank:rgb(look.flank),belly:rgb(look.belly),band:rgb(look.band),bands:look.bands,
  scute:mix(rgb(look.back),[0,0,0],.3),tooth:rgb('#ece4c8'),gum:rgb('#8a5046'),claw:rgb('#1a1612'),nostril:rgb('#121210'),pupil:rgb('#050505')};
}

// Hide: cream belly below, olive flanks, dark back on top, with crossbands along
// z. t is how far up the part a point is (0 underneath, 1 on top).
function hide(C,t,z,bandScale=1){
 const base=t<.35?mix(C.belly,C.flank,(t-.2)/.15):mix(C.flank,C.back,(t-.45)/.35);
 const band=clamp01(Math.sin(z*38*bandScale)*1.6-.4)*C.bands*clamp01((t-.3)/.2);
 return mix(base,C.band,band);
}

// A keeled scute: a four-sided pyramid squashed flat, its ridge along z.
function scute(P,C,x,y,z,w,h,len,tilt=0){
 P.add(new THREE.ConeGeometry(1,1,4),at(x,y+h/2,z,[0,Math.PI/4,tilt],[w/1.414,h,len/1.414]),(px,py)=>mix(C.scute,C.back,clamp01((py-y)/h*1.2)));
}

// A cylinder (or cone, r1=0) from a to b.
function rod(P,a,b,r0,r1,colour,segments=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 const geo=r1>0?new THREE.CylinderGeometry(r1,r0,len,segments):new THREE.ConeGeometry(r0,len,segments);
 P.add(geo,new THREE.Matrix4().compose(A.clone().addScaledVector(d,.5),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()),new THREE.Vector3(1,1,1)),colour);
}

const BODY={y:.1,w:.15,h:.072,len:.25};
function buildBody(C){
 const P=pieces();
 const {y,w,h,len}=BODY;
 const shade=(lo,hi)=>(x,py,z)=>hide(C,(py-lo)/(hi-lo),z);
 // broad flat trunk, swelling at the shoulders and hips
 P.add(new THREE.SphereGeometry(1,24,12),at(0,y,0,[0,0,0],[w,h,len]),shade(y-h,y+h));
 for(const z of [.12,-.13])P.add(new THREE.SphereGeometry(1,14,8),at(0,y-.005,z,[0,0,0],[w*1.02,h*.9,.1]),shade(y-h,y+h));
 // neck, and the root of the tail tucked into the hips
 P.add(new THREE.SphereGeometry(1,16,10),at(0,y+.003,.23,[0,0,0],[.095,.058,.09]),shade(y-.058,y+.06));
 P.add(new THREE.SphereGeometry(1,16,10),at(0,y,-.23,[0,0,0],[.09,.065,.08]),shade(y-.065,y+.065));
 // four rows of keeled scutes down the back, the middle rows biggest
 for(let k=0;k<9;k++){
  const z=-.2+k*.047;
  for(const x of [-.075,-.028,.028,.075]){
   const inner=Math.abs(x)<.05,top=y+h*Math.sqrt(clamp01(1-(x/w)**2-(z/len)**2))-.006;
   scute(P,C,x,top,z,inner?.036:.028,inner?.02:.014,.038);
  }
 }
 // the nuchal shield: six big scutes in a block on the nape
 for(const [x,z] of [[-.022,.25],[.022,.25],[-.05,.225],[.05,.225],[-.022,.2],[.022,.2]])scute(P,C,x,y+.052,z,.034,.022,.03);
 // a row of small bumps along each flank
 for(const s of [-1,1])for(let k=0;k<7;k++){const z=-.17+k*.055;P.add(new THREE.SphereGeometry(.009,6,4),at(s*w*.93*Math.sqrt(1-(z/len)**2),y+.02,z),C.scute);}
 return P.merge();
}

// Head space: the hinge behind the eyes at the origin, snout along +z.
const SNOUT={base:.068,tip:.036,len:.23,z:.04,flat:.38};
const snoutR=z=>SNOUT.base+(SNOUT.tip-SNOUT.base)*clamp01((z-SNOUT.z)/SNOUT.len);
function buildHead(C){
 const P=pieces();
 const shade=(lo,hi)=>(x,y,z)=>hide(C,(y-lo)/(hi-lo),z,1.4);
 // flat cranium with a raised table between the eyes
 P.add(new THREE.SphereGeometry(1,18,12),at(0,.012,.02,[0,0,0],[.078,.042,.075]),shade(-.03,.054));
 P.add(new THREE.BoxGeometry(.07,.012,.06),at(0,.045,.012),mix(C.back,C.scute,.4));
 // the long snout, a tapered cylinder squashed flat, and the nose knob at its tip
 const midZ=SNOUT.z+SNOUT.len/2;
 P.add(new THREE.CylinderGeometry(SNOUT.tip,SNOUT.base,SNOUT.len,18,4),at(0,.0,midZ,[Math.PI/2,0,0],[1,1,SNOUT.flat]),shade(-.026,.026));
 P.add(new THREE.SphereGeometry(1,14,10),at(0,.004,SNOUT.z+SNOUT.len,[0,0,0],[.044,.022,.032]),shade(-.02,.026));
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.009,8,6),at(s*.011,.022,SNOUT.z+SNOUT.len+.004),mix(C.back,C.scute,.5));
  P.add(new THREE.SphereGeometry(.0045,6,4),at(s*.011,.029,SNOUT.z+SNOUT.len+.006),C.nostril);
 }
 // rows of little sensory pits and ridges along the top of the snout
 for(let k=0;k<5;k++)for(const s of [-1,1]){const z=.08+k*.04;P.add(new THREE.SphereGeometry(.006,5,3),at(s*snoutR(z)*.45,.022-k*.001,z,[0,0,0],[1,.5,1.6]),mix(C.back,C.scute,.6));}
 // raised orbits with a bony brow, and two knobs on the back of the skull
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(1,12,8),at(s*.036,.042,.032,[0,0,0],[.024,.02,.028]),shade(.02,.064));
  P.add(new THREE.SphereGeometry(1,8,6),at(s*.036,.058,.036,[0,0,0],[.02,.006,.02]),C.scute);
  P.add(new THREE.ConeGeometry(.012,.02,5),at(s*.03,.05,-.03,[-.4,0,s*-.2]),C.scute);
 }
 // gum line and upper teeth: ivory cones hanging along each side, uneven in length,
 // with a notch where the lower fourth tooth sits outside
 for(const s of [-1,1]){
  rod(P,[s*snoutR(.03)*.93,-.022,.03],[s*snoutR(.26)*.93,-.02,.26],.005,.004,C.gum,6);
  for(let k=0;k<13;k++){
   const z=.035+k*.018;if(Math.abs(z-.215)<.01)continue;
   const len=.012+.008*((k*7)%3)/2+(k===2||k===9?.008:0),x=s*snoutR(z)*.92;
   P.add(new THREE.ConeGeometry(.0045,len,5),at(x,-.024-len/2,z,[Math.PI,0,s*-.15]),C.tooth);
  }
 }
 // slit pupils on the front of each eye
 for(const s of [-1,1]){const n=new THREE.Vector3(s*.55,.35,.76).normalize().multiplyScalar(.0128);P.add(new THREE.SphereGeometry(1,8,6),at(s*.04+n.x,.05+n.y,.042+n.z,[0,s*.6,0],[.0018,.009,.0018]),C.pupil);}
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.013,10,6),at(s*.04,.05,.042),[1,1,1]);
 return P.merge();
}

// Jaw space: hinged at the origin, which the head puts just under its own.
function buildJaw(C){
 const P=pieces();
 const shade=(x,y,z)=>mix(C.belly,C.flank,clamp01((y+.02)/.03*.6+Math.abs(x)*6-.2));
 const midZ=SNOUT.z+SNOUT.len/2;
 P.add(new THREE.CylinderGeometry(SNOUT.tip*.8,SNOUT.base*.84,SNOUT.len,16,3),at(0,-.004,midZ-.004,[Math.PI/2,0,0],[1,1,.28]),shade);
 P.add(new THREE.SphereGeometry(1,12,8),at(0,-.004,-.004,[0,0,0],[.07,.022,.06]),shade);
 P.add(new THREE.SphereGeometry(1,10,8),at(0,-.004,SNOUT.z+SNOUT.len-.008,[0,0,0],[.034,.016,.026]),shade);
 // lower teeth pointing up; the fourth one is long and sits outside the upper jaw
 for(const s of [-1,1])for(let k=0;k<11;k++){
  const z=.05+k*.019,big=k===9,x=s*(snoutR(z)*.86+(big?.012:0)),len=big?.034:.011+.006*(k%2);
  P.add(new THREE.ConeGeometry(big?.0065:.004,len,5),at(x,.008+len/2-(big?.004:0),z,[0,0,s*.12]),C.tooth);
 }
 return P.merge();
}

// Tail space: the root at the origin, sweeping back along −z and off to +x,
// sinking to the floor. Returns the centreline for the crest.
const TAIL={len:.54,sweep:.16,drop:.055,n:16};
function tailPoint(s){return new THREE.Vector3(TAIL.sweep*s*s,-TAIL.drop*s,-TAIL.len*s*(1-.12*s*s));}
function buildTail(C){
 const P=pieces();
 for(let k=0;k<TAIL.n;k++){
  const s=k/(TAIL.n-1),p=tailPoint(s),d=tailPoint(Math.min(1,s+.02)).sub(tailPoint(Math.max(0,s-.02)));
  const w=.082*(1-s*.86),h=.066*(1-s*.62),seg=TAIL.len/(TAIL.n-1)*.95;
  P.add(new THREE.SphereGeometry(1,12,7),at(p.x,p.y,p.z,[0,Math.atan2(d.x,d.z),0],[w,h,seg]),(x,y,z)=>hide(C,(y-(p.y-h))/(2*h),z,1.2));
 }
 // the crest: a double row of upright scutes that merge into a single row
 for(let k=0;k<22;k++){
  const s=.04+k*.043;if(s>.98)break;
  const p=tailPoint(s),d=tailPoint(Math.min(1,s+.02)).sub(tailPoint(Math.max(0,s-.02))),yaw=Math.atan2(d.x,d.z),h=.066*(1-s*.62);
  const size=.024*(1-s*.55),rows=s<.45?[-1,1]:[0];
  for(const r of rows){
   const off=r*.03*(1-s),x=p.x+Math.cos(yaw)*off,z=p.z-Math.sin(yaw)*off;
   P.add(new THREE.ConeGeometry(1,1,4),at(x,p.y+h*.82+size*.5,z,[0,yaw,0],[size*.22,size*1.1,size*.55]),(px,py)=>mix(C.scute,C.back,clamp01((py-p.y-h*.8)/size*.6)));
  }
 }
 return P.merge();
}

// A sprawled leg from the hip at the origin: upper limb out to the side, forearm
// down to a webbed foot with splayed toes and dark claws. Hind legs are heavier
// and have four toes; front legs have five.
function buildLeg(C,side,hind){
 const P=pieces(),k=hind?1.25:1;
 const limb=(x,y,z)=>hide(C,clamp01((y+.09)/.1),z,2);
 const knee=[side*.075*k,-.018,(hind?-.01:.015)*k],ankle=[side*.095*k,-.078,(hind?.0:.03)*k];
 P.add(new THREE.SphereGeometry(.034*k,10,6),at(side*.012,0,0,[0,0,0],[1.2,.85,1]),limb);
 rod(P,[side*.01,0,0],knee,.03*k,.022*k,limb,10);
 P.add(new THREE.SphereGeometry(.022*k,8,6),at(...knee),limb);
 rod(P,knee,ankle,.021*k,.016*k,limb,10);
 const foot=[ankle[0],ankle[1]-.012,ankle[2]+.014*k];
 P.add(new THREE.SphereGeometry(1,10,5),at(foot[0],foot[1],foot[2],[0,0,0],[.032*k,.01,.03*k]),mix(C.flank,C.belly,.2));
 const toes=hind?[-.5,-.15,.2,.55]:[-.75,-.4,-.05,.3,.65];
 for(const a of toes){
  const dir=[Math.sin(a)*side,0,Math.cos(a)],len=(hind?.05:.038)*(1-Math.abs(a)*.25);
  const tip=[foot[0]+dir[0]*len,foot[1]-.004,foot[2]+dir[2]*len];
  rod(P,foot,tip,.007*k,.005*k,C.flank,6);
  rod(P,tip,[tip[0]+dir[0]*.012,tip[1]-.003,tip[2]+dir[2]*.012],.0045*k,0,C.claw,5);
 }
 // the web between the toes, a thin fan under them
 const web=new THREE.CircleGeometry(hind?.05:.038,10,Math.PI/2-toes.at(-1),toes.at(-1)-toes[0]);
 P.add(web,at(foot[0],foot[1]-.002,foot[2],[-Math.PI/2,0,0],[side,1,1]),mix(C.flank,C.belly,.4));
 return P.merge();
}

const cache=new Map();
function geometry(name){
 if(cache.has(name))return cache.get(name);
 const look=LOOKS[name],C=palette(look);
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.72,metalness:.04,side:THREE.DoubleSide});
 const eye=new THREE.MeshStandardMaterial({color:0xc9a93a,emissive:0x4a3a08,emissiveIntensity:.6,roughness:.12});
 const S={look,material,eye,body:buildBody(C),head:buildHead(C),eyes:buildEyes(),jaw:buildJaw(C),tail:buildTail(C),
  leg:{front:{'-1':buildLeg(C,-1,false),'1':buildLeg(C,1,false)},hind:{'-1':buildLeg(C,-1,true),'1':buildLeg(C,1,true)}}};
 cache.set(name,S);
 return S;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export const CROCODILES=Object.keys(LOOKS);
export function createCrocodile(name='crocodile'){
 const S=geometry(LOOKS[name]?name:'crocodile');
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(S.look.scale);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(0,BODY.y+.004,.27);body.add(head);
 mesh(head,S.head,S.material,'head');mesh(head,S.eyes,S.eye,'eyes');
 const jaw=new THREE.Group();jaw.position.set(0,-.022,0);head.add(jaw);mesh(jaw,S.jaw,S.material,'jaw');
 const tail=new THREE.Group();tail.position.set(0,BODY.y,-.26);body.add(tail);mesh(tail,S.tail,S.material,'tail');
 const legs=[];
 for(const [z,hind] of [[.13,false],[-.13,true]])for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.11,BODY.y,z);body.add(leg);
  mesh(leg,S.leg[hind?'hind':'front'][s],S.material,'leg');legs.push(leg);
 }
 return {g,body,legs,tail,wings:[],quirk:'lizard',head,jaw};
}
