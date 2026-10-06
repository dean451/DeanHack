import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The eight mummies used to be the boxy undead humanoid with six flat strips across its chest.
// They now shamble wrapped head to foot in grave linen: every limb, the torso, the neck and the
// skull are bound in overlapping bands, each laid at its own slant, pale where it is fresh and
// yellowed or stained with resin and grave dirt lower down, with the shrunken dark body showing
// in the gaps between. The bands over the chest have rotted through at the front, baring a few
// dark ribs. The face is bound too, apart from one slit where two dim eyes glow, split by a
// strap down the nose. The arms reach forward as the undead's did, the hands bound into stiff
// fingers with bare, blackened tips, and loose ends of linen hang from the waist, the back of the
// neck, one forearm, the side of the head and one ankle, where the end drags on the floor.
// Each moving part (body, head, each leg and arm) is one merged, vertex-coloured mesh on a shared
// material, plus one small emissive mesh for the eyes: 7 draws (9 for the two-headed ettin). The
// geometry is built once and shared by every mummy; each species only picks a scale, a build and
// a faint tint of its glyph colour on the linen.
// Handles: legs, arms, arm, head, body, like the humanoid rig. The quirk stays 'mummy'.

export const MUMMIES={
 'kobold mummy':{scale:.7,wide:1,tint:'#b04030'},
 'gnome mummy':{scale:.66,wide:1.04,tint:'#b04030'},
 'orc mummy':{scale:.95,wide:1.08,tint:'#8a8a80'},
 'dwarf mummy':{scale:.78,wide:1.18,tint:'#b04030'},
 'elf mummy':{scale:1.04,wide:.9,tint:'#3a9a3a'},
 'human mummy':{scale:1,wide:1,tint:'#8a8a80'},
 'ettin mummy':{scale:1.55,wide:1.12,tint:'#3a5ab0',heads:2},
 'giant mummy':{scale:1.85,wide:1.05,tint:'#3aa0a8'},
};

const C={
 fresh:rgb('#ddd0ae'),linen:rgb('#c9bb98'),yellow:rgb('#b8a474'),grime:rgb('#6e5e40'),resin:rgb('#5a4028'),
 under:rgb('#3a2e22'),rib:rgb('#8a7a5c'),nail:rgb('#241a12'),
};
// deterministic scatter, so every build is the same
function rng(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
const R=rng(7);
const pick=()=>{const r=R();return r<.3?C.fresh:r<.75?C.linen:C.yellow;};
// a band's colour: its own base, streaked, grimier toward `low`, blotched here and there with resin
function linen(base,low,high){
 const blotch=R()<.25;
 return (x,y,z)=>{
  const n=Math.sin(x*61+z*47+y*13)*Math.sin(y*83-x*29);
  let c=mix(base,C.grime,(high-y)/(high-low)*.55+n*.08);
  if(blotch&&n>.55)c=mix(c,C.resin,(n-.55)*1.6);
  return c;
 };
}

const X90=new THREE.Matrix4().makeRotationX(Math.PI/2);
// One band of linen round a limb or the trunk: a flattened torus about the y axis, elliptical
// (sx across, sz front to back), tilted rx about x and rz about z. An arc under 2π leaves a gap
// facing the front.
function band(P,x,y,z,r,{sx=1,sz=1,rx=0,rz=0,tube=.013,arc=Math.PI*2,colour}){
 const geo=new THREE.TorusGeometry(r,tube,4,arc<Math.PI*2?12:16,arc);
 const spin=arc<Math.PI*2?-Math.PI/2-arc/2:R()*Math.PI*2;
 const m=new THREE.Matrix4().makeTranslation(x,y,z)
  .multiply(new THREE.Matrix4().makeRotationZ(rz)).multiply(new THREE.Matrix4().makeRotationX(rx))
  .multiply(X90).multiply(new THREE.Matrix4().makeScale(sx,sz,.75)).multiply(new THREE.Matrix4().makeRotationZ(spin));
 P.add(geo,m,colour);
}
// Bind a straight, tapering limb running down from y0 to y1 (y1 < y0) at (x, z).
function bindLimb(P,x,z,y0,y1,r0,r1,step=.028,sz=1){
 const low=Math.min(y0,y1),high=Math.max(y0,y1);
 for(let i=0,y=y0-step*.4;y>y1+step*.2;i++,y-=step){
  const t=(y0-y)/(y0-y1);
  band(P,x,y,z,r0+(r1-r0)*t+.004,{sz,rx:(i%2?1:-1)*(.16+R()*.1),rz:(R()-.5)*.2,tube:.011+R()*.004,colour:linen(pick(),low,high)});
 }
}
// A loose end of linen: a ribbon of thin slabs through the points, with its flat face turned
// toward `face`.
function strip(P,points,width,face=[0,0,1]){
 const base=pick(),up=new THREE.Vector3(0,1,0),f=new THREE.Vector3(...face);
 for(let i=0;i<points.length-1;i++){
  const a=new THREE.Vector3(...points[i]),b=new THREE.Vector3(...points[i+1]),d=b.clone().sub(a),len=d.length();
  const q=new THREE.Quaternion().setFromUnitVectors(up,d.normalize());
  // twist about the strip so its face turns toward `face`
  const n=new THREE.Vector3(0,0,1).applyQuaternion(q),want=f.clone().sub(d.clone().multiplyScalar(f.dot(d)));
  if(want.lengthSq()>1e-6){want.normalize();const ang=Math.atan2(n.clone().cross(want).dot(d),n.dot(want));q.premultiply(new THREE.Quaternion().setFromAxisAngle(d,ang));}
  const w=width*(1-i/(points.length-1)*.35),m=new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),q,new THREE.Vector3(w,len+.006,.007));
  P.add(new THREE.BoxGeometry(1,1,1),m,mix(base,C.grime,.25+i/points.length*.5));
 }
}

function buildBody(){
 const P=pieces();
 // the shrunken body under the wrappings, dark where it shows through
 P.add(new THREE.SphereGeometry(.17,16,10),at(0,.47,0,[0,0,0],[1.05,.6,.8]),C.under);
 P.add(new THREE.CylinderGeometry(.17,.14,.42,16),at(0,.68,0,[0,0,0],[1,1,.72]),C.under);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.07,10,8),at(s*.19,.84,0),C.under);
 P.add(new THREE.CylinderGeometry(.06,.07,.1,10),at(0,.92,0),C.under);
 // bands up the trunk; over the chest they have rotted through at the front
 for(let i=0,y=.45;y<.88;i++,y+=.031){
  const r=.14+(.17-.14)*Math.min(1,Math.max(0,(y-.47)/.42))+.004,torn=y>.61&&y<.75;
  band(P,0,y,0,r,{sz:.72,rx:(i%2?1:-1)*(.12+R()*.08),rz:(R()-.5)*.22,tube:.013+R()*.004,arc:torn?Math.PI*2-.7-R()*.5:Math.PI*2,colour:linen(pick(),.4,.9)});
 }
 // the ribs bared in the tear
 for(const y of [.64,.68,.72])band(P,0,y,.004,.155,{sz:.72,tube:.008,arc:.8,colour:C.rib});
 // wraps over the shoulders and round the neck
 for(const s of [-1,1])for(const a of [-.35,.35]){
  const geo=new THREE.TorusGeometry(.072,.012,4,14);
  P.add(geo,new THREE.Matrix4().makeTranslation(s*.19,.84,0).multiply(new THREE.Matrix4().makeRotationZ(s*.3)).multiply(new THREE.Matrix4().makeRotationY(Math.PI/2+a)),linen(pick(),.78,.92));
 }
 for(const y of [.9,.94])band(P,0,y,0,.066,{rx:(R()-.5)*.3,tube:.012,colour:linen(pick(),.85,.98)});
 // loose ends: one from the waist, hanging down the right thigh, one from the back of the neck
 strip(P,[[.11,.5,.12],[.14,.38,.15],[.15,.26,.17],[.17,.16,.16]],.05);
 strip(P,[[-.05,.9,-.08],[-.09,.78,-.14],[-.12,.62,-.15],[-.11,.46,-.17],[-.13,.36,-.14]],.045,[0,0,-1]);
 return P.merge();
}

function buildHead(){
 const P=pieces(),hr=.115;
 // the skull and jaw under the wrappings
 P.add(new THREE.SphereGeometry(hr,16,12),at(0,0,0,[0,0,0],[.92,1.05,1]),C.under);
 P.add(new THREE.SphereGeometry(.08,12,8),at(0,-.07,.03,[0,0,0],[1,.7,1.05]),C.under);
 // bands round the head, leaving a slit across the eyes
 for(const hy of [.095,.065,.035,-.035,-.062,-.09]){
  const r=Math.sqrt(Math.max(.002,hr*hr*1.1-hy*hy))+.004;
  band(P,0,hy,.004,r,{sx:.93,sz:1.02,rx:(R()-.5)*.1,rz:(R()-.5)*.14,tube:.012,colour:linen(pick(),-.12,.12)});
 }
 // one strap over the crown from ear to ear and one down the nose, between the eyes
 P.add(new THREE.TorusGeometry(hr+.006,.012,4,18),at(0,.005,-.01,[0,0,.08],[.95,1.07,.8]),linen(pick(),-.12,.12));
 P.add(new THREE.TorusGeometry(hr+.008,.011,4,18),at(0,.005,0,[0,Math.PI/2,0],[1.02,1.07,.8]),linen(pick(),-.12,.12));
 // a loose end hanging from the side of the head
 strip(P,[[.085,-.03,.04],[.105,-.1,.05],[.11,-.17,.07]],.035,[1,0,0]);
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const x of [-.042,.042])P.add(new THREE.SphereGeometry(.015,8,6),at(x,0,.1,[0,0,0],[1.2,.7,.8]),[1,1,1]);
 return P.merge();
}

// A leg hanging from the hip: thigh, knee, shin and a bound foot. The left one trails a loose
// end from the ankle along the floor behind.
function buildLeg(side){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.07,.058,.22,10),at(0,-.11,0),C.under);
 P.add(new THREE.SphereGeometry(.058,10,8),at(0,-.22,0),C.under);
 P.add(new THREE.CylinderGeometry(.056,.045,.18,10),at(0,-.31,0),C.under);
 P.add(new THREE.SphereGeometry(.05,10,8),at(0,-.405,.035,[0,0,0],[1,.62,1.8]),C.under);
 bindLimb(P,0,0,0,-.38,.07,.046);
 for(const [z,r] of [[-.01,.052],[.04,.05],[.09,.04]])P.add(new THREE.TorusGeometry(r,.011,4,14),at(0,-.405,z,[(R()-.5)*.3,0,0],[1.05,.66,1]),linen(pick(),-.44,-.36));
 if(side<0)strip(P,[[0,-.35,-.05],[.01,-.41,-.12],[.02,-.435,-.2],[.035,-.438,-.28]],.04,[0,1,0]);
 return P.merge();
}

// An arm reaching forward from the shoulder (the group turns it -1.35 rad about x, so local -y
// runs forward and local +z up): upper arm, elbow, forearm and a stiff bound hand with bare,
// blackened fingertips. The right forearm trails a loose end.
function buildArm(side){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.048,.042,.2,10),at(0,-.1,0),C.under);
 P.add(new THREE.SphereGeometry(.043,10,8),at(0,-.2,0),C.under);
 P.add(new THREE.CylinderGeometry(.041,.034,.17,10),at(0,-.285,0),C.under);
 bindLimb(P,0,0,-.01,-.36,.049,.035,.026);
 // the hand: a flat palm and four stiff fingers curling down, a thumb on the inside
 P.add(new THREE.SphereGeometry(.04,10,8),at(0,-.4,0,[0,0,0],[1.05,1.1,.55]),linen(pick(),-.45,-.35));
 for(const [i,x] of [-.027,-.009,.009,.027].entries()){
  const len=.06+(i===1||i===2?.012:0);
  P.add(new THREE.CylinderGeometry(.0095,.011,len,6),at(x,-.44-len/2,-.008,[.25,0,0]),linen(pick(),-.52,-.42));
  P.add(new THREE.ConeGeometry(.009,.022,5),at(x,-.448-len,-.02,[Math.PI+.3,0,0]),C.nail);
 }
 P.add(new THREE.CylinderGeometry(.01,.012,.05,6),at(-side*.042,-.41,-.004,[.2,0,side*.6]),linen(pick(),-.45,-.38));
 if(side>0)strip(P,[[0,-.29,-.03],[.005,-.31,-.11],[.01,-.33,-.19],[.02,-.35,-.26]],.035,[0,1,0]);
 return P.merge();
}

let shared=null;
function geometry(){
 if(shared)return shared;
 const eye=new THREE.MeshStandardMaterial({color:0xe8e0b0,emissive:0x8a7a30,emissiveIntensity:1.5,roughness:.3});
 shared={eye,materials:new Map(),body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:{'-1':buildLeg(-1),'1':buildLeg(1)},arm:{'-1':buildArm(-1),'1':buildArm(1)}};
 return shared;
}
// linen takes a faint cast of the species' glyph colour
function material(S,tint){
 if(!S.materials.has(tint)){const c=new THREE.Color('#ffffff').lerp(new THREE.Color(tint),.18);S.materials.set(tint,new THREE.MeshStandardMaterial({color:c,vertexColors:true,roughness:.93}));}
 return S.materials.get(tint);
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createMummy(name){
 const o=MUMMIES[name]||MUMMIES['human mummy'],S=geometry(),linenMat=material(S,o.tint);
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.set(o.scale*o.wide,o.scale,o.scale*o.wide);
 mesh(body,S.body,linenMat,'body');
 // the undead stoop
 body.rotation.x=.14;
 const heads=[];
 for(const x of o.heads===2?[-.12,.12]:[0]){
  const head=new THREE.Group();head.position.set(x,1.03,.02);head.rotation.z=-x*1.2;if(o.heads===2)head.scale.setScalar(.88);body.add(head);
  mesh(head,S.head,linenMat,'head');mesh(head,S.eyes,S.eye,'eyes');heads.push(head);
 }
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.095,.455,0);body.add(leg);mesh(leg,S.leg[s],linenMat,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.225,.83,0);arm.rotation.set(-1.35,0,s*.08);body.add(arm);mesh(arm,S.arm[s],linenMat,'arm');arms.push(arm);
 }
 return {g,body,legs,tail:null,wings:[],quirk:'mummy',arms,arm:arms[1],head:heads[0],heads,hat:null,beard:null,pick:null};
}
