import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Bats used to be a fur ball with two flat scalloped wings and red dots for eyes, and the giant
// bat was the same thing at 1.25x. They are now gaunt, snarling things in flight, facing +z: a
// shaggy body with spiky fur along the spine and a ragged ruff, hind legs hanging back with hooked
// claws, and a head that is mostly ears and teeth (tall pointed ears with ridged insides, a
// wrinkled leaf nose, a scowling brow over glowing eyes, and a gaping mouth of long fangs).
// Each wing is a real hand: arm bones out to a clawed thumb, four long fingers, and a leathery
// membrane stretched between them that billows, thins and reddens between the bones, is cut into
// sharp scallops along the trailing edge and torn through in places.
// Sizes follow the game: the bat is tiny, the vampire bat bigger, and the giant bat about twice
// the bat's span (1.4 tiles from tip to tip).
// Each part (body, head, eyes, each wing's bones and membrane) is one merged, vertex-coloured
// mesh: 7 draws. The geometry is built once per species and shared.
// Handles: body, head, wings (userData.side ±1). It keeps the 'bat' quirk, so the existing flap
// (wing.rotation.z) and hover drive it.

const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const hash=(x,y,z)=>{const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s);};
const noise=(x,y,z)=>(Math.sin(x*9.1+y*3.7)*Math.cos(z*8.3-x*2.9)+Math.sin(y*13.7+z*5.3)*Math.cos(x*11.3+y*1.9)*.6)/1.6;

export const BATS={
 bat:{scale:.5,fur:'#5a4636',dark:'#2a1e18',membrane:'#33241c',thin:'#7a4430',eye:'#ff5a2a',fang:'#e8dcc0'},
 'vampire bat':{scale:.85,fur:'#1e1b20',dark:'#0c0a0e',membrane:'#151216',thin:'#5a1220',eye:'#ff1e2e',fang:'#f0e6d0',blood:true,ears:1.1},
 'giant bat':{scale:1.25,fur:'#6a2e26',dark:'#2a1210',membrane:'#2e1612',thin:'#902a1c',eye:'#ff3a14',fang:'#e8d8b0',ears:1.15},
};
export const isBat=name=>!!BATS[name];

function palette(o){
 const C={fur:rgb(o.fur),dark:rgb(o.dark||new THREE.Color(o.fur).multiplyScalar(.45).getStyle()),membrane:rgb(o.membrane||new THREE.Color(o.fur).multiplyScalar(.55).getStyle()),
  thin:rgb(o.thin||new THREE.Color(o.fur).multiplyScalar(1.3).getStyle()),fang:rgb(o.fang||'#e8dcc0'),mouth:rgb('#2a070a'),gum:rgb('#5a1a1e'),claw:rgb('#0a0807'),blood:rgb('#5a0408'),skin:rgb('#3a2622')};
 C.bone=mix(C.dark,C.skin,.5);C.skin=mix(C.skin,C.dark,.4);
 return C;
}

// A rod (cylinder, or a cone when r1 is 0) between two points.
function rod(P,a,b,r0,r1,colour,sides=6){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 const geo=r1>0?new THREE.CylinderGeometry(r1,r0,len,sides):new THREE.ConeGeometry(r0,len,sides);
 P.add(geo,new THREE.Matrix4().compose(A.clone().addScaledVector(d,.5),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()),new THREE.Vector3(1,1,1)),colour);
}
// A hooked claw: two cones bending down from `a` along `dir`.
function claw(P,a,dir,len,r,C){
 const d=new THREE.Vector3(...dir).normalize(),mid=new THREE.Vector3(...a).addScaledVector(d,len*.55),tip=mid.clone().addScaledVector(d,len*.45).add(new THREE.Vector3(0,-len*.45,0));
 rod(P,a,mid.toArray(),r,r*.7,C.claw,5);rod(P,mid.toArray(),tip.toArray(),r*.7,0,C.claw,5);
}
// Fur: a shaggy ellipsoid whose surface is pushed in and out by noise, darker underneath.
function furry(P,r,pos,scale,C,salt,shag=.12){
 const geo=new THREE.SphereGeometry(r,18,12),p=geo.attributes.position,v=new THREE.Vector3();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);v.multiplyScalar(1+shag*(hash(Math.round(v.x*400),Math.round(v.y*400),Math.round(v.z*400)+salt)-.5));p.setXYZ(i,v.x,v.y,v.z);}
 geo.computeVertexNormals();
 P.add(geo,at(...pos,[0,0,0],scale),(x,y,z)=>mix(mix(C.dark,C.fur,clamp01(.5+(y-pos[1])*14)),C.dark,.35*hash(x*90,y*90,z*90)));
}

function buildBody(C){
 const P=pieces();
 furry(P,.07,[0,0,0],[.85,.82,1.5],C,1);
 furry(P,.05,[0,.004,.07],[1.05,1,1],C,2);
 // spiky fur along the spine and a ragged ruff round the neck, all swept back
 for(let k=0;k<7;k++){const z=.07-k*.026;P.add(new THREE.ConeGeometry(.012,.05-k*.003,4),at((k%2?1:-1)*.008,.05-k*.002,z,[-1.95,0,(k%2?1:-1)*.2],[1,1,.6]),mix(C.fur,C.dark,.3));}
 for(let k=0;k<9;k++){const a=(k/8-.5)*2.6;P.add(new THREE.ConeGeometry(.012,.045,4),at(Math.sin(a)*.05,Math.cos(a)*.035-.005,.095,[-2.2+Math.abs(a)*.1,0,-a*.6],[1,1,.5]),mix(C.fur,C.dark,.15+.2*(k%2)));}
 // ribs showing through the thin fur of the belly
 for(let k=0;k<4;k++)P.add(new THREE.TorusGeometry(.05-k*.004,.004,4,12,Math.PI*.8),at(0,-.012,.05-k*.022,[Math.PI/2,0,Math.PI*1.1],[1.05,1,.8]),mix(C.dark,C.skin,.6));
 // hind legs hanging back, a ragged tail membrane between them, and hooked feet
 for(const s of [-1,1]){
  const hip=[s*.035,-.03,-.08],knee=[s*.07,-.06,-.14],ankle=[s*.06,-.085,-.2];
  rod(P,hip,knee,.011,.008,C.skin);rod(P,knee,ankle,.008,.006,C.skin);
  for(const k of [-1,0,1])claw(P,ankle,[s*.2+k*.3,-.2,-1],.04,.004,C);
 }
 const tail=new THREE.SphereGeometry(1,14,6),tp=tail.attributes.position;
 for(let i=0;i<tp.count;i++){const x=tp.getX(i),z=tp.getZ(i),edge=z<-.2?1-.25*Math.abs(Math.sin(x*9)):1;tp.setXYZ(i,x*edge,tp.getY(i),z*edge);}
 tail.computeVertexNormals();
 P.add(tail,at(0,-.06,-.17,[-.35,0,0],[.07,.006,.07]),C.membrane);
 return P.merge();
}

function buildHead(C,o){
 const P=pieces(),E=o.ears||1;
 // a short, flat-topped skull with heavy cheeks, and a pushed-in, wrinkled muzzle
 furry(P,.05,[0,.01,0],[1.05,.9,1],C,3,.08);
 P.add(new THREE.SphereGeometry(.032,12,8),at(0,-.006,.045,[0,0,0],[1.15,.8,.9]),(x,y,z)=>mix(C.skin,C.dark,.4*hash(x*200,y*200,z*200)+(Math.sin(y*700)>.6?.3:0)));
 // leaf nose: a pointed, upturned flap over two dark nostrils
 P.add(new THREE.ConeGeometry(.014,.04,4),at(0,.024,.07,[-.35,Math.PI/4,0],[1,1,.35]),C.skin);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0055,6,4),at(s*.008,.004,.074),C.mouth);
 // scowling brow ridges slanting down to the nose
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.009,.04,4),at(s*.018,.03,.052,[0,0,s*1.9],[1,1,.6]),C.dark);
 // the gaping mouth: dark throat, gums, upper and lower jaws and long fangs
 P.add(new THREE.SphereGeometry(.024,10,8),at(0,-.022,.052,[0,0,0],[1.05,.7,.7]),C.mouth);
 P.add(new THREE.SphereGeometry(.026,10,6),at(0,-.04,.04,[.35,0,0],[1,.38,1]),(x,y,z)=>y>-.038?C.gum:C.skin);
 const fang=o.blood?.03:.024;
 for(const s of [-1,1]){
  rod(P,[s*.014,-.012,.064],[s*.012,-.012-fang,.068],.0048,0,C.fang,5);
  rod(P,[s*.011,-.042,.06],[s*.01,-.026,.066],.0036,0,C.fang,5);
  for(const k of [1,2])rod(P,[s*(.014+k*.005),-.014,.06-k*.006],[s*(.014+k*.005),-.024,.062-k*.006],.0025,0,C.fang,4);
  if(o.blood)rod(P,[s*.012,-.04,.067],[s*.012,-.058,.066],.0022,.0012,C.blood,4);
 }
 // the ears: tall, pointed, cupped forward, with ridges inside and a spike of a tragus
 for(const s of [-1,1]){
  const base=[s*.03,.045,.0],rot=[-.15,s*-.35,s*-.32];
  P.add(new THREE.ConeGeometry(.032*E,.13*E,5,1,true),at(base[0]+s*.012,base[1]+.06*E,base[2],rot,[1,1,.35]),(x,y,z)=>mix(C.dark,C.fur,.3));
  P.add(new THREE.ConeGeometry(.026*E,.11*E,5),at(base[0]+s*.012,base[1]+.055*E,base[2]+.006,rot,[1,1,.22]),(x,y,z)=>mix(C.skin,C.thin,.35+.3*(Math.sin(y*260)>.3?1:0)));
  P.add(new THREE.ConeGeometry(.008,.035,4),at(base[0]+s*.004,base[1]+.018,.022,[-.2,0,s*-.2],[1,1,.5]),C.skin);
 }
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0085,10,8),at(s*.022,.016,.05,[0,0,s*.4],[1.2,.75,.8]),[1,1,1]);
 return P.merge();
}

// The wing for one side, in its pivot's frame (shoulder at the origin, spreading along side*x).
const WRIST=[.29,.04,.0],ELBOW=[.13,.022,.028],ANKLE=[.02,-.07,-.2];
const TIPS=[[.5,.03,-.03],[.53,-.015,-.15],[.42,-.035,-.26],[.26,-.05,-.3]];
const S=(p,s)=>[p[0]*s,p[1],p[2]];
function buildWingBones(side,C){
 const P=pieces();
 rod(P,[0,0,0],S(ELBOW,side),.014,.011,C.bone);rod(P,S(ELBOW,side),S(WRIST,side),.011,.008,C.bone);
 P.add(new THREE.SphereGeometry(.013,8,6),at(...S(ELBOW,side)),C.bone);P.add(new THREE.SphereGeometry(.011,8,6),at(...S(WRIST,side)),C.bone);
 // fingers: two jointed bones each, thinning to the tips
 for(const tip of TIPS){
  const w=new THREE.Vector3(...S(WRIST,side)),t=new THREE.Vector3(...S(tip,side)),j=w.clone().lerp(t,.45).add(new THREE.Vector3(0,.012,0));
  rod(P,w.toArray(),j.toArray(),.0065,.005,C.bone);rod(P,j.toArray(),t.toArray(),.005,.0018,C.bone);
  P.add(new THREE.SphereGeometry(.0065,6,4),at(...j.toArray()),C.bone);
 }
 // the thumb: a hooked claw jutting forward from the wrist, and spurs off the leading tip
 claw(P,S([WRIST[0]+.004,WRIST[1]+.008,WRIST[2]+.01],side),[side*.25,.5,1],.05,.0055,C);
 claw(P,S(TIPS[0],side),[side*1,.2,.3],.03,.0035,C);
 return P.merge();
}
// One membrane panel: a fan from `hub` out to a ragged edge curve, billowing between the bones,
// with a few cells torn out near the edge.
function panel(P,hub,edge,side,C,salt,{billow=.03,torn=2}={}){
 const NU=edge.length-1,NV=7,pos=[],col=[];
 const point=(u,v)=>{const e=edge[u],x=hub[0]+(e[0]-hub[0])*v,y=hub[1]+(e[1]-hub[1])*v,z=hub[2]+(e[2]-hub[2])*v;
  const k=Math.sin(Math.PI*u/NU)*Math.sin(Math.PI*v*.9);return [x,y-billow*k,z];};
 const shade=(u,v)=>{const between=Math.sin(Math.PI*u/NU);
  let c=mix(C.membrane,C.thin,between*Math.min(1,v*1.6)*.75);
  if(Math.abs(Math.sin(u*1.7+v*9+salt))>.96)c=mix(c,C.dark,.6);// veins
  return mix(c,C.dark,.25*hash(u+salt,v*7,salt));};
 const holes=new Set();for(let k=0;k<torn;k++)holes.add(`${1+Math.floor(hash(salt,k,1)*(NU-2))},${NV-2-Math.floor(hash(salt,k,2)*2)}`);
 for(let u=0;u<NU;u++)for(let v=0;v<NV;v++){
  if(holes.has(`${u},${v}`))continue;
  const q=[[u,v],[u+1,v],[u,v+1],[u+1,v+1]].map(([a,b])=>({p:point(a,b/NV),c:shade(a,b/NV)}));
  for(const i of side>0?[0,2,1,1,2,3]:[0,1,2,1,3,2]){pos.push(...q[i].p);col.push(...q[i].c);}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.computeVertexNormals();
 const cols=col;P.add(geo,null,(()=>{let i=0;return()=>{const c=[cols[i],cols[i+1],cols[i+2]];i+=3;return c;};})());
}
// A trailing edge from a to b that bows in toward `hub` and is cut into sharp scallops.
function scallop(a,b,hub,n,depth,salt){
 const out=[];
 for(let i=0;i<=n;i++){
  const t=i/n,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,z=a[2]+(b[2]-a[2])*t;
  const bow=Math.sin(Math.PI*t)*depth*(1+.5*Math.abs(Math.sin(t*Math.PI*3)))*(i%2?1.25:.8)+(hash(salt,i,3)-.5)*depth*.4;
  const k=i===0||i===n?0:bow;
  out.push([x+(hub[0]-x)*k,y+(hub[1]-y)*k,z+(hub[2]-z)*k]);
 }
 return out;
}
function buildMembrane(side,C){
 const P=pieces(),hub=S(WRIST,side),tips=TIPS.map(t=>S(t,side));
 for(let k=0;k<3;k++)panel(P,hub,scallop(tips[k],tips[k+1],hub,6,.22,k*11+side),side,C,k*7+side,{torn:k===1?3:2});
 // the inner panel runs from the last finger along the trailing edge to the ankle, then up the
 // flank to the shoulder
 const inner=[...scallop(tips[3],S(ANKLE,side),hub,6,.16,40+side),...[.33,.66].map(t=>S([ANKLE[0]*(1-t),ANKLE[1]*(1-t)+.0*t,ANKLE[2]*(1-t)],side)),[0,0,0]];
 panel(P,hub,inner,side,C,50+side,{billow:.02,torn:2});
 // a thin leading membrane from shoulder to wrist, ahead of the arm
 const lead=[S([.02,.005,.025],side),S([.13,.03,.05],side),S([.24,.045,.03],side),hub];
 panel(P,S(ELBOW,side),lead,side,C,60+side,{billow:.005,torn:0});
 return P.merge();
}

const shared=new Map();
function geometry(key,o){
 if(shared.has(key))return shared.get(key);
 const C=palette(o);
 const fur=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85});
 const skin=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7,side:THREE.DoubleSide});
 const eye=new THREE.MeshStandardMaterial({color:o.eye||'#ff4a1a',emissive:o.eye||'#ff4a1a',emissiveIntensity:2.4,roughness:.2});
 const G={fur,skin,eye,body:buildBody(C),head:buildHead(C,o),eyes:buildEyes(),bones:{},membrane:{}};
 for(const s of [-1,1]){G.bones[s]=buildWingBones(s,C);G.membrane[s]=buildMembrane(s,C);}
 shared.set(key,G);return G;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.name=name;parent.add(m);return m;}

// `name` picks a species; anything else (a 'B' the game hasn't named) is a bat in `color`.
export function createBat(name,color){
 const o=BATS[name]||{...BATS.bat,fur:color||BATS.bat.fur,dark:null,membrane:null,thin:null};
 const G=geometry(BATS[name]?name:`bat:${o.fur}`,o);
 const g=new THREE.Group(),body=new THREE.Group(),lift=new THREE.Group();g.add(body);body.add(lift);
 const k=o.scale;g.scale.setScalar(k);
 // every bat flies at about the same height, whatever its size
 lift.position.y=.66/k;lift.rotation.x=.12;
 mesh(lift,G.body,G.fur,'bat-body');
 const head=new THREE.Group();head.position.set(0,.022,.125);lift.add(head);
 mesh(head,G.head,G.fur,'bat-head');mesh(head,G.eyes,G.eye,'bat-eyes');
 const wings=[];
 for(const s of [-1,1]){
  const wing=new THREE.Group();wing.position.set(s*.045,.02,.03);wing.userData.side=s;lift.add(wing);
  mesh(wing,G.bones[s],G.fur,'bat-wing-bones');
  // the membrane is a single sheet, so it is lit from both sides and gets no ink outline
  const m=mesh(wing,G.membrane[s],G.skin,'bat-wing-membrane');m.userData.hasOutline=true;
  wings.push(wing);
 }
 return {g,body,legs:[],tail:null,wings,quirk:'bat',head};
}
