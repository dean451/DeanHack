import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Jabberwocks used to be a pot-bellied purple thing with buck teeth and antennae, closer to a
// cartoon than to one of the deadliest monsters in the dungeon. Now it is a bladed predator:
// "the jaws that bite, the claws that catch".
// - It stands hunched forward on digitigrade legs with a raised sickle claw on each foot. Its
//   deep keeled chest is plated down the front, and a row of blade fins runs from the back of
//   its neck to the tip of its tail.
// - Its long neck thrusts the head out low. The head is long, with a hinged jaw lined with
//   needle fangs and long canines, and slanted, burning eyes under a heavy brow. Swept-back
//   horns run from the skull, Tenniel's whiskers curl up off the brow and barbels hang from
//   the jaw.
// - Its forearms end in three scythe talons each, with a mantis blade along the forearm and a
//   hooked spur at the elbow. Horns curve up off the shoulders.
// - Its tail ends in a crescent blade. Its big ragged bat wings have hooked claws at the wrist
//   and at every finger.
// The vorpal jabberwock is near black, with steel blades whose cutting edges glow a cold cyan,
// like its eyes. The plain one is rust red, with bone blades and amber edges.
// Each moving part (body, head, jaw, each arm, leg and wing, and the tail) is merged into one
// mesh per material (hide, blade, glow; the wings also have a membrane): about 24 draws in
// place of ~150 meshes. The geometry and materials are built once per kind and shared.
// Handles: body, head, jaw (for jaw.js), arms/arm, legs, wings, tail. The quirk stays 'dragon'.

const KINDS={
 'vorpal jabberwock':{scale:1.25,hide:'#2b1a3a',dark:'#120a1a',belly:'#4a3a56',horn:'#1a1420',tooth:'#ece4cc',mouth:'#5a0a1e',
  steel:'#d4dbe6',steelBase:'#2a2436',glow:'#7ff6ff',wing:'#22132e'},
 jabberwock:{scale:1.12,hide:'#7a3418',dark:'#3a160a',belly:'#a07048',horn:'#2a1a10',tooth:'#ece4cc',mouth:'#4a0c10',
  steel:'#dccfb0',steelBase:'#4a3020',glow:'#ffb040',wing:'#3e1a10'},
};
export const JABBERWOCK_KINDS=Object.keys(KINDS);

const V=(...a)=>new THREE.Vector3(...a);
// A matrix whose +y runs along `dir` and +x toward `curl`, placed at `pos`.
function frame(pos,dir,curl){
 const y=V(...dir).normalize(),x=V(...curl);x.sub(y.clone().multiplyScalar(x.dot(y))).normalize();
 return new THREE.Matrix4().makeBasis(x,y,x.clone().cross(y)).setPosition(V(...pos));
}
// A tube through the points, tapering from radius r0 to r1.
function taper(points,r0,r1,seg=14,radial=8){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>V(...p))),geo=new THREE.TubeGeometry(curve,seg,1,radial,false),p=geo.attributes.position,v=V(),c=V();
 for(let i=0;i<=seg;i++){curve.getPointAt(i/seg,c);const r=r0+(r1-r0)*i/seg;for(let j=0;j<=radial;j++){const k=i*(radial+1)+j;v.fromBufferAttribute(p,k).sub(c).multiplyScalar(r).add(c);p.setXYZ(k,v.x,v.y,v.z);}}
 geo.computeVertexNormals();
 return geo;
}
// A curved blade in its own xy plane: it runs up +y for `len`, curling toward +x, and narrows
// from `width` to a point. The cutting edge is the inner, concave (+x) side.
function sickle(len,bend,width,thick=.008,n=12){
 const inner=[],outer=[];
 for(let i=0;i<=n;i++){
  const t=i/n,x=bend*len*t*t,y=len*t,dx=2*bend*len*t,l=Math.hypot(dx,len),nx=len/l,ny=-dx/l,w=width*.5*Math.pow(1-t,.8);
  inner.push([x+nx*w*.6,y+ny*w*.6]);outer.push([x-nx*w,y-ny*w]);
 }
 const s=new THREE.Shape();s.moveTo(...outer[0]);for(const p of outer.slice(1))s.lineTo(...p);for(const p of inner.slice(0,-1).reverse())s.lineTo(...p);s.closePath();
 const geo=new THREE.ExtrudeGeometry(s,{depth:thick,bevelEnabled:true,bevelThickness:thick*.4,bevelSize:thick*.3,bevelSegments:1,curveSegments:1});geo.translate(0,0,-thick/2);
 return {geo,edge:inner.map(([x,y])=>V(x,y,0)),len};
}

// A moving part's pieces, one list per material.
function part(){
 const lists={hide:pieces(),blade:pieces(),glow:pieces(),membrane:pieces()},n={hide:0,blade:0,glow:0,membrane:0};
 return {
  add(kind,geo,matrix,colour){lists[kind].add(geo,matrix,colour);n[kind]++;},
  merge(){const out={};for(const k in lists)if(n[k])out[k]=lists[k].merge();return out;},
 };
}

function builder(k){
 const C={};for(const key of ['hide','dark','belly','horn','tooth','mouth','steel','steelBase'])C[key]=rgb(k[key]);
 // mottled hide, darker on the back and toward the ground
 const hide=(x,y,z)=>{const n=Math.sin(x*43+y*31)*Math.sin(z*37-y*17)+.4*Math.sin(x*97-z*71);return mix(C.dark,C.hide,.55+y*.25+n*.18);};
 // A blade: dark at the root, bright steel (or bone) out to the tip, with its edge traced in glow.
 function blade(P,pos,dir,curl,len,bend,width){
  const b=sickle(len,bend,width),m=frame(pos,dir,curl),base=V(...pos);
  P.add('blade',b.geo,m,(x,y,z)=>mix(C.steelBase,C.steel,Math.pow(V(x,y,z).distanceTo(base)/len,.5)*1.1));
  const edge=b.edge.slice(1,-1);
  if(edge.length>1)P.add('glow',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge),10,.0022,4,false),m,[1,1,1]);
 }
 return {C,hide,blade};
}

function buildBody(B){
 const {C,hide,blade}=B,P=part();
 // hips, a hunched trunk leaning forward and a deep keeled chest
 P.add('hide',new THREE.SphereGeometry(.15,18,12),at(0,.52,-.06,[0,0,0],[1.1,.85,1]),hide);
 P.add('hide',new THREE.SphereGeometry(.2,20,14),at(0,.74,.04,[.5,0,0],[1,1.4,.85]),hide);
 P.add('hide',new THREE.SphereGeometry(.15,18,12),at(0,.86,.15,[0,0,0],[1.15,.9,.9]),hide);
 for(const s of [-1,1])P.add('hide',new THREE.SphereGeometry(.08,12,10),at(s*.17,.9,.12),hide);
 // armoured plates down the chest and belly
 for(let i=0;i<7;i++){const y=.5+i*.065;P.add('hide',new THREE.SphereGeometry(.1-i*.004,14,8),at(0,y,.1+(y-.5)*.62,[-.5,0,0],[1.15,.3,.55]),mix(C.belly,C.dark,i%2?.25:0));}
 // the neck: rising from the chest and thrusting forward
 P.add('hide',taper([[0,.9,.12],[0,1.04,.15],[0,1.14,.26],[0,1.16,.4]],.08,.05,16,10),null,hide);
 for(let i=0;i<4;i++)P.add('hide',new THREE.SphereGeometry(.045,10,6),at(0,.96+i*.05,.2+i*.05,[-.8,0,0],[1.05,.3,.7]),C.belly);
 // blade fins from the back of the neck down the spine
 const spine=[[0,1.17,.3],[0,1.12,.18],[0,1.04,.08],[0,.96,-.02],[0,.87,-.1],[0,.77,-.16],[0,.67,-.2],[0,.58,-.22]];
 spine.forEach((p,i)=>blade(P,[p[0],p[1]+.03,p[2]-.02],[0,.8,-.6+i*.02],[0,-.2,-1],.1+Math.sin(i/7*Math.PI)*.06,.4,.05));
 // horns hooking up off the shoulders
 for(const s of [-1,1]){blade(P,[s*.2,.95,.1],[s*.55,.8,-.2],[0,-.1,-1],.17,.5,.045);blade(P,[s*.22,.9,.04],[s*.8,.45,-.3],[0,.3,-1],.1,.45,.035);}
 return P.merge();
}
function buildHead(B){
 const {C,hide}=B,P=part();
 // a long skull and snout
 P.add('hide',new THREE.SphereGeometry(.085,18,12),at(0,.03,0,[0,0,0],[1.05,.85,1.3]),hide);
 P.add('hide',new THREE.SphereGeometry(.06,16,10),at(0,0,.13,[0,0,0],[.85,.62,1.9]),hide);
 for(const s of [-1,1]){
  P.add('hide',new THREE.SphereGeometry(.012,6,5),at(s*.024,.028,.228),C.dark);
  // a heavy brow slanting down over each eye, the eye deep in a dark socket
  P.add('hide',new THREE.SphereGeometry(.03,10,6),at(s*.046,.07,.075,[0,0,s*.45],[1.5,.45,1.1]),mix(C.dark,C.hide,.4));
  P.add('hide',new THREE.SphereGeometry(.022,10,6),at(s*.05,.045,.085),C.dark);
  // horns swept back off the skull, and Tenniel's whiskers curling up and forward
  P.add('hide',taper([[s*.05,.07,-.04],[s*.1,.13,-.12],[s*.125,.12,-.24],[s*.1,.07,-.33]],.024,.003,14,7),null,C.horn);
  P.add('hide',taper([[s*.035,.08,.05],[s*.06,.19,.09],[s*.1,.25,.18],[s*.14,.23,.25]],.006,.0015,12,5),null,C.dark);
  // spikes fringing the back of the skull
  for(const [y,z,a] of [[.05,-.08,.4],[0,-.07,.7],[-.04,-.04,1]])P.add('hide',new THREE.ConeGeometry(.012,.06,5),at(s*.07,y,z,[-1.3,0,-s*a]),C.horn);
 }
 // the dark palate and the upper teeth: needle fangs along the snout and two long canines
 P.add('hide',new THREE.SphereGeometry(.05,12,8),at(0,-.03,.12,[0,0,0],[.72,.3,1.9]),C.mouth);
 for(const s of [-1,1])for(let i=0;i<8;i++){
  const z=.04+i*.022,x=s*.036*(1-(z-.04)/.34),canine=i===6,h=canine?.058:.022+i*.002;
  P.add('hide',new THREE.ConeGeometry(canine?.011:.0065,h,5),at(x,-.035-h/2+.005,z,[Math.PI+(canine?.25:.1),0,0]),C.tooth);
 }
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.018,10,6),at(s*.05,.045,.096,[0,0,s*.35],[1.35,.5,.8]),[1,1,1]);
 return P.merge();
}
// The lower jaw, hinged at the back of the head: a long mandible with a tongue, fangs pointing
// up and barbels hanging off the chin.
function buildJaw(B){
 const {C,hide}=B,P=part();
 P.add('hide',new THREE.SphereGeometry(.055,16,10),at(0,-.02,.12,[0,0,0],[.85,.32,2]),hide);
 P.add('hide',new THREE.SphereGeometry(.03,10,6),at(0,-.004,.12,[0,0,0],[.8,.3,2.2]),C.mouth);
 for(const s of [-1,1]){
  for(let i=0;i<7;i++){const z=.05+i*.022,x=s*.032*(1-(z-.05)/.34),canine=i===5,h=canine?.048:.018+i*.002;
   P.add('hide',new THREE.ConeGeometry(canine?.01:.006,h,5),at(x,-.004+h/2,z,[canine?-.2:0,0,0]),C.tooth);}
  P.add('hide',taper([[s*.03,-.035,.2],[s*.05,-.1,.22],[s*.06,-.17,.2],[s*.05,-.23,.22]],.006,.0015,10,5),null,C.dark);
 }
 return P.merge();
}

// An arm reaching forward from the shoulder: upper arm, elbow and forearm, a mantis blade
// along the forearm, a hooked elbow spur and three scythe talons plus a thumb claw.
function buildArm(B,s){
 const {hide,blade}=B,P=part();
 P.add('hide',taper([[0,0,0],[s*.03,-.12,.02],[s*.02,-.22,0]],.048,.032,10,8),null,hide);
 P.add('hide',new THREE.SphereGeometry(.036,10,8),at(s*.02,-.22,0),hide);
 P.add('hide',taper([[s*.02,-.22,0],[s*.01,-.3,.08],[0,-.34,.17]],.033,.024,10,8),null,hide);
 P.add('hide',new THREE.SphereGeometry(.036,10,8),at(0,-.35,.2,[0,0,0],[1.1,.7,1.2]),hide);
 blade(P,[s*.02,-.2,-.02],[0,.35,-1],[0,1,0],.12,.5,.04);
 blade(P,[s*.035,-.26,.04],[0,-.25,1],[0,-1,-.2],.26,.25,.05);
 for(const x of [-.022,0,.022])blade(P,[x,-.36,.23],[x*2.5,-.55,.85],[0,-1,-.4],.14,.55,.03);
 blade(P,[-s*.035,-.34,.2],[-s*.5,-.4,.7],[0,-1,0],.08,.5,.025);
 return P.merge();
}

// A digitigrade leg: a thick thigh, shin and long foot, three clawed toes, a raised sickle claw,
// a spike off the knee and a heel spur.
function buildLeg(B,s){
 const {hide,blade}=B,P=part(),x=s*.02;
 P.add('hide',taper([[0,0,0],[x,-.12,.08],[x,-.2,.12]],.085,.055,10,10),null,hide);
 P.add('hide',new THREE.SphereGeometry(.052,10,8),at(x,-.2,.12),hide);
 P.add('hide',taper([[x,-.2,.12],[x,-.32,.02],[x,-.4,-.04]],.05,.032,10,8),null,hide);
 P.add('hide',new THREE.SphereGeometry(.033,10,8),at(x,-.4,-.04),hide);
 P.add('hide',taper([[x,-.4,-.04],[x,-.47,.02]],.031,.025,6,8),null,hide);
 P.add('hide',new THREE.SphereGeometry(.036,10,6),at(x,-.475,.04,[0,0,0],[1.2,.5,1.2]),hide);
 for(const k of [-1,0,1]){
  P.add('hide',taper([[x,-.478,.04],[x+k*.045,-.487,.12]],.018,.012,5,6),null,hide);
  blade(P,[x+k*.047,-.485,.125],[k*.3,.1,1],[0,-1,0],.06,.6,.022);
 }
 blade(P,[x-s*.03,-.46,.07],[-s*.15,.75,.6],[0,-.2,1],.1,.55,.03);
 blade(P,[x,-.19,.16],[0,.35,1],[0,1,0],.08,.4,.03);
 blade(P,[x,-.41,-.07],[0,-.3,-1],[0,-1,0],.06,.4,.025);
 return P.merge();
}

// The tail sweeping back and curling up, finned all along and ending in a crescent blade.
function buildTail(B){
 const {hide,blade}=B,P=part();
 const pts=[[0,0,0],[0,-.12,-.16],[.04,-.23,-.34],[.1,-.26,-.52],[.15,-.2,-.68],[.16,-.08,-.78]];
 P.add('hide',taper(pts,.075,.018,24,10),null,hide);
 const curve=new THREE.CatmullRomCurve3(pts.map(p=>V(...p)));
 for(let i=0;i<7;i++){const t=.1+i*.12,p=curve.getPointAt(t),tan=curve.getTangentAt(t),r=.075+(.018-.075)*t;
  blade(P,[p.x,p.y+r*.8,p.z],[tan.x*.4,1,tan.z*.4],[-tan.x,-tan.y,-tan.z],.09-i*.006,.4,.04);}
 const end=curve.getPointAt(1),tan=curve.getTangentAt(1);
 blade(P,[end.x,end.y,end.z],[tan.x,tan.y,tan.z],[0,1,0],.26,.6,.09);
 blade(P,[end.x,end.y,end.z],[tan.x,tan.y,tan.z],[0,-1,0],.13,.6,.06);
 return P.merge();
}

// A bat wing on four long fingers, with hooked claws at the wrist and fingertips and a ragged,
// torn membrane between the fingers.
function buildWing(B,s,k){
 const {C,hide,blade}=B,P=part();
 const W=[s*.16,.24],tips=[[s*.36,.56],[s*.62,.46],[s*.72,.16],[s*.56,-.12]];
 P.add('hide',taper([[0,0,0],[W[0]*.5,W[1]*.55,.01],[W[0],W[1],0]],.032,.02,8,8),null,hide);
 P.add('hide',new THREE.SphereGeometry(.026,10,8),at(W[0],W[1],0),hide);
 for(const [x,y] of tips){
  P.add('hide',taper([[W[0],W[1],0],[(W[0]+x)/2,(W[1]+y)/2+.02,.005],[x,y,0]],.016,.004,10,6),null,C.dark);
  blade(P,[x,y,0],[x-W[0],y-W[1],0],[-s*(y-W[1]),s*(x-W[0]),0],.05,.5,.018);
 }
 blade(P,[W[0],W[1]+.02,0],[s*.1,1,0],[-s,0,0],.09,.55,.028);
 // The membrane: from the root to the first fingertip, scalloped and torn between the fingers,
 // then back to the flank.
 const shape=new THREE.Shape();shape.moveTo(0,.02);shape.lineTo(...tips[0]);
 let seed=k*7+(s>0?3:11);const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 for(let i=0;i<tips.length-1;i++){
  const [ax,ay]=tips[i],[bx,by]=tips[i+1],mx=(ax+bx)/2,my=(ay+by)/2,cx=mx+(W[0]-mx)*.45,cy=my+(W[1]-my)*.45;
  for(let j=1;j<=8;j++){const t=j/9,u=1-t;let x=u*u*ax+2*u*t*cx+t*t*bx,y=u*u*ay+2*u*t*cy+t*t*by;
   const tear=r()<.35?.03+r()*.05:r()*.012;x+=(W[0]-x)*tear*2.4;y+=(W[1]-y)*tear*2.4;shape.lineTo(x,y);}
  shape.lineTo(bx,by);
 }
 shape.lineTo(s*.14,-.24);shape.lineTo(0,-.12);shape.closePath();
 const geo=new THREE.ShapeGeometry(shape,8);
 P.add('membrane',geo,null,(x,y)=>{const d=Math.hypot(x-W[0],y-W[1]);return mix([1,1,1],[.55,.55,.6],Math.min(1,d/.7));});
 return P.merge();
}

const cache=new Map();
function kindParts(name){
 if(cache.has(name))return cache.get(name);
 const k=KINDS[name],B=builder(k);
 const glowColour=new THREE.Color(k.glow);
 const M={
  hide:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7,metalness:.05}),
  blade:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.24,metalness:.65}),
  glow:new THREE.MeshStandardMaterial({color:glowColour,emissive:glowColour,emissiveIntensity:2.4,roughness:.3}),
  membrane:new THREE.MeshStandardMaterial({vertexColors:true,color:new THREE.Color(k.wing),roughness:.8,side:THREE.DoubleSide,transparent:true,opacity:.93}),
 };
 const G={body:buildBody(B),head:buildHead(B),eyes:buildEyes(),jaw:buildJaw(B),tail:buildTail(B),
  arm:{'-1':buildArm(B,-1),'1':buildArm(B,1)},leg:{'-1':buildLeg(B,-1),'1':buildLeg(B,1)},wing:{'-1':buildWing(B,-1,1),'1':buildWing(B,1,2)}};
 const out={k,M,G};cache.set(name,out);return out;
}
function meshes(parent,geos,M,name){
 for(const key of ['hide','blade','glow','membrane'])if(geos[key]){
  const m=new THREE.Mesh(geos[key],M[key]);m.castShadow=key!=='glow';m.receiveShadow=key!=='glow';m.userData.part=name;parent.add(m);
 }
}

export function createJabberwock(name){
 const {k,M,G}=kindParts(KINDS[name]?name:'jabberwock');
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(k.scale);g.name='jabberwock';
 meshes(body,G.body,M,'body');
 const head=new THREE.Group();head.position.set(0,1.16,.42);head.rotation.x=.12;body.add(head);
 meshes(head,G.head,M,'head');
 const eyes=new THREE.Mesh(G.eyes,M.glow);eyes.userData.part='eyes';head.add(eyes);
 const jaw=new THREE.Group();jaw.position.set(0,-.035,.02);jaw.userData.reach=.85;head.add(jaw);
 meshes(jaw,G.jaw,M,'jaw');
 const legs=[],arms=[],wings=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.14,.5,-.06);body.add(leg);meshes(leg,G.leg[s],M,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.2,.9,.14);arm.rotation.x=-.35;body.add(arm);meshes(arm,G.arm[s],M,'arm');arms.push(arm);
  const wing=new THREE.Group();wing.position.set(s*.13,1,-.12);wing.rotation.y=s*-.35;body.add(wing);meshes(wing,G.wing[s],M,'wing');wings.push(wing);
 }
 const tail=new THREE.Group();tail.position.set(0,.5,-.2);body.add(tail);meshes(tail,G.tail,M,'tail');
 return {g,body,legs,tail,wings,quirk:'dragon',head,jaw,arms,arm:arms[1]};
}
