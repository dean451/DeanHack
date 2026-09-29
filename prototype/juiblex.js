import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {pieces,rgb,mix,at} from './homunculus.js';

// Juiblex, the Faceless Lord, used to be the plain green blob that every jelly and pudding
// shares, only tinted darker. He now rises as a demon lord of slime: a tall, heaving column of
// ooze that leans toward its prey, sagging in rolls and running in drips, streaked black and
// lit with yellow-green where the slime is thin. A dozen red eyes of every size stare out of
// the mass from sunken, slime-lidded sockets, each with a slit pupil, and there is no face
// among them. Four pseudopods reach out of the upper mass: two rear up, one reaches forward
// and one hangs over the side dripping. He sits in a spreading pool of his own ooze, rippled
// and bubbling, with a half-dissolved skull and a few bones sinking in it.
// Three merged, vertex-coloured meshes: the column with its pseudopods and pupils ('body'),
// the eyes (emissive) and the pool, which stays on the floor while the body heaves. The
// geometry is built once and shared.
// Handles: body, like the old blob, with the 'blob' quirk. No legs, head, tail or wings.

const C={
 deep:rgb('#142a0e'),slime:rgb('#3f7a22'),bright:rgb('#9cc43a'),sheen:rgb('#d4e27a'),black:rgb('#0e140a'),
 pool:rgb('#1a3010'),poolLit:rgb('#4a7a24'),socket:rgb('#1a0806'),pupil:rgb('#050302'),
 bone:rgb('#c8c29a'),boneDark:rgb('#7a7a4a'),
};
const H=.66;
// a cheap smooth interference pattern, periodic in the angle because it takes cos/sin of it
const noise=(c,s,v)=>.5*Math.sin(3.1*c+5*v)*Math.sin(2.7*s-4*v+1)+.3*Math.sin(6*c-5*s+9*v)+.15*Math.sin(11*s+13*v+2*c);
// the column's radius up its height: a foot that spreads into the pool, a sagging belly and
// a rounded crown
const radius=v=>(.3-.17*v)*Math.sqrt(Math.max(0,1-v**6))+.07*Math.exp(-v*12)+.03*Math.sin(v*Math.PI*1.2);
// the upper mass leans forward (+z) and a little to one side
const centre=v=>[-.025*Math.sin(v*3),.07*v*v];
function surface(phi,v){
 const c=Math.cos(phi),s=Math.sin(phi),n=noise(c,s,v);
 const r=radius(v)*(1+.09*n+.035*Math.sin(v*27+c*2));
 const [x0,z0]=centre(v);
 return {p:new THREE.Vector3(x0+c*r,v*H+.012*n*v,z0+s*r),n,v};
}
// outward normal at a point on the column, from its neighbours
function normalAt(phi,v){
 const e=.01,a=surface(phi,v).p,du=surface(phi+e,v).p.sub(a),dv=surface(phi,Math.min(v+e,.999)).p.sub(a);
 return new THREE.Vector3().crossVectors(dv,du).normalize();
}
function slimeColour(n,v){
 let c=mix(C.deep,C.slime,v*1.4+n*.35);
 if(n>.45)c=mix(c,C.bright,(n-.45)*1.8);
 if(n>.75)c=mix(c,C.sheen,(n-.75)*2.5);
 if(n<-.5)c=mix(c,C.black,(-.5-n)*2);
 return c;
}
// a colour function over positions for the loose blobs, pseudopods and drips
const ooze=(x,y,z)=>slimeColour(noise(Math.cos(x*7),Math.sin(z*7),y/H),y/H);
// place a unit-sized piece at p, turned so its +z faces along dir
const facing=(p,dir,s=[1,1,1])=>new THREE.Matrix4().compose(p,new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),dir.clone().normalize()),new THREE.Vector3(...s));

function buildColumn(){
 const NV=40,NP=48,pos=[],idx=[];
 for(let i=0;i<=NV;i++){
  const v=i/NV;
  for(let j=0;j<=NP;j++){
   const {p}=surface(j/NP*Math.PI*2,v);
   pos.push(p.x,p.y,p.z);
  }
 }
 for(let i=0;i<NV;i++)for(let j=0;j<NP;j++){const a=i*(NP+1)+j,b=a+NP+1;idx.push(a,a+1,b,b,a+1,b+1);}
 let geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 geo.setIndex(idx);
 // weld the seam and the crown so the normals run smooth across them
 geo=mergeVertices(geo,1e-5);geo.computeVertexNormals();
 return geo;
}

// pieces() colours by position, so recover the angle and height each vertex was built from
function addColumn(P){
 P.add(buildColumn(),null,(x,y,z)=>{
  const v=THREE.MathUtils.clamp(y/H,0,1),[x0,z0]=centre(v),phi=Math.atan2(z-z0,x-x0);
  return slimeColour(noise(Math.cos(phi),Math.sin(phi),v),v);
 });
}

// A pseudopod: a chain of shrinking blobs along a bent path out of the column.
function pseudopod(P,phi,v,path,r0){
 const root=surface(phi,v).p,out=normalAt(phi,v);
 const pts=[root.clone().addScaledVector(out,-.03)];
 let p=pts[0].clone();
 for(const [o,u,f] of path){p=p.clone().addScaledVector(out,o).add(new THREE.Vector3(0,u,0)).addScaledVector(new THREE.Vector3(0,0,1),f);pts.push(p);}
 const curve=new THREE.CatmullRomCurve3(pts),N=10;
 for(let k=0;k<=N;k++){
  const t=k/N,q=curve.getPoint(t),d=curve.getTangent(t),r=r0*(1-.72*t);
  P.add(new THREE.SphereGeometry(r,9,6),facing(q,d,[1,1,1.7]),ooze);
 }
 // a drip gathering at the tip
 const tip=curve.getPoint(1);
 P.add(new THREE.SphereGeometry(r0*.32,8,6),at(tip.x,tip.y-r0*.4,tip.z,[0,0,0],[.8,1.8,.8]),C.slime);
}

function buildBody(){
 const P=pieces();
 addColumn(P);
 // pseudopods: two rearing up on either side, one reaching forward, one hanging off the back
 pseudopod(P,2.5,.72,[[.07,.08,0],[.05,.1,.01],[0,.07,.03],[-.02,.03,.04]],.05);
 pseudopod(P,-.6,.68,[[.07,.07,0],[.05,.09,.01],[.02,.07,.03]],.046);
 pseudopod(P,1.45,.58,[[.05,.03,0],[.04,0,.02],[.02,-.05,.01]],.052);
 pseudopod(P,-2.4,.62,[[.08,.01,0],[.06,-.07,0],[.03,-.12,.01]],.044);
 // drips running down the sides, each ending in a bead
 const drips=[[.3,.55],[1.1,.48],[1.9,.52],[2.6,.44],[3.3,.6],[4.1,.5],[4.9,.46],[5.6,.56],[1.55,.36],[.6,.3]];
 for(const [phi,v] of drips){
  const {p}=surface(phi,v),out=normalAt(phi,v);
  const q=p.clone().addScaledVector(out,.008);
  P.add(new THREE.SphereGeometry(.022,8,8),at(q.x,q.y-.03,q.z,[0,0,0],[.7,2.6,.7]),ooze);
  P.add(new THREE.SphereGeometry(.014,6,6),at(q.x+out.x*.006,q.y-.085,q.z+out.z*.006),C.slime);
 }
 // bubbles swelling on the surface
 for(const [phi,v,r] of [[.2,.8,.02],[2,.3,.024],[3.6,.7,.018],[5,.25,.022],[1.2,.88,.016],[4.4,.82,.02]]){
  const {p}=surface(phi,v);P.add(new THREE.SphereGeometry(r,10,8),at(p.x,p.y,p.z),C.sheen);
 }
 // eye sockets, slime lids and slit pupils; the eyes themselves are their own emissive mesh
 for(const [phi,v,r] of EYES){
  const {p}=surface(phi,v),out=normalAt(phi,v);
  P.add(new THREE.SphereGeometry(r*1.3,10,6),facing(p.clone().addScaledVector(out,-r*.2),out,[1,1,.55]),C.socket);
  P.add(new THREE.TorusGeometry(r*1.18,r*.3,5,14),facing(p.clone().addScaledVector(out,r*.2),out,[1,.85,1]),ooze);
  P.add(new THREE.SphereGeometry(r*.26,6,4),facing(p.clone().addScaledVector(out,r*1.17),out,[.9,3,.6]),C.pupil);
 }
 return P.merge();
}
// [angle, height, size]: angle π/2 faces +z, so most of them look forward
const EYES=[[1.55,.72,.034],[1.2,.62,.026],[1.95,.6,.028],[1.4,.46,.022],[1.8,.4,.02],[1.6,.84,.018],
 [.9,.78,.02],[2.3,.78,.022],[.6,.5,.018],[2.6,.5,.02],[.95,.3,.016],[2.2,.28,.016],[4.7,.64,.024],[3.6,.5,.018]];
function buildEyes(){
 const P=pieces();
 for(const [phi,v,r] of EYES){
  const {p}=surface(phi,v),out=normalAt(phi,v);
  P.add(new THREE.SphereGeometry(r,12,8),facing(p.clone().addScaledVector(out,r*.35),out,[1,1,.85]),[1,1,1]);
 }
 return P.merge();
}

function buildPool(){
 const P=pieces();
 const poolColour=(x,y,z)=>{const n=noise(Math.cos(x*9),Math.sin(z*9),x*z*20);return n>.4?mix(C.pool,C.poolLit,(n-.4)*1.6):mix(C.pool,C.black,-n*.4);};
 // the spreading pool, lobed and flattened, half sunk into the floor
 const disc=new THREE.SphereGeometry(1,36,10);
 const p=disc.attributes.position;
 for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),r=.42+.035*Math.sin(a*5+1)+.02*Math.sin(a*9);p.setXYZ(i,p.getX(i)*r,p.getY(i)*.035,p.getZ(i)*r+.02);}
 disc.computeVertexNormals();
 P.add(disc,null,poolColour);
 // ripples spreading from the column, and bubbles on the surface
 for(const [r,y] of [[.34,.028],[.4,.018]])P.add(new THREE.TorusGeometry(r,.006,4,48),at(0,y,.02,[Math.PI/2,0,0]),C.poolLit);
 for(const [x,z,r] of [[.36,-.08,.018],[-.33,.16,.014],[.12,.37,.016],[-.2,-.3,.012],[.3,.24,.01]])
  P.add(new THREE.SphereGeometry(r,8,6,0,Math.PI*2,0,Math.PI/2),at(x,.028,z),C.sheen);
 // a half-dissolved skull sinking at the front edge, and a couple of bones
 const sk=[.24,.02,.3];
 P.add(new THREE.SphereGeometry(.05,14,10),at(sk[0],sk[1]+.02,sk[2],[-.5,.6,.2],[1,.9,1.15]),C.bone);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.014,8,6),at(sk[0]+s*.018+.018,sk[1]+.03,sk[2]+.042),C.socket);
 P.add(new THREE.ConeGeometry(.008,.014,3),at(sk[0]+.022,sk[1]+.014,sk[2]+.05,[Math.PI,0,0]),C.socket);
 P.add(new THREE.BoxGeometry(.05,.012,.02),at(sk[0]+.02,sk[1]+.002,sk[2]+.04,[0,.6,0]),C.boneDark);
 for(const [x,z,ry,rz,l] of [[-.3,.2,.4,.25,.16],[.05,-.36,1.4,-.2,.13]]){
  const m=at(x,.018,z,[0,ry,Math.PI/2+rz]);
  P.add(new THREE.CylinderGeometry(.011,.011,l,8),m,C.bone);
  for(const e of [-1,1])for(const k of [-1,1])P.add(new THREE.SphereGeometry(.014,8,6),m.clone().multiply(at(k*.009,e*l/2,0)),C.bone);
 }
 return P.merge();
}

let shared=null;
function geometry(){
 if(shared)return shared;
 const material=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.4,clearcoat:.9,clearcoatRoughness:.12});
 const eye=new THREE.MeshStandardMaterial({color:0xff3a1a,emissive:0xc01a08,emissiveIntensity:1.5,roughness:.2});
 shared={material,eye,body:buildBody(),eyes:buildEyes(),pool:buildPool()};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createJuiblex(){
 const S=geometry();
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(g,S.pool,S.material,'pool').castShadow=false;
 mesh(body,S.body,S.material,'body');mesh(body,S.eyes,S.eye,'eyes');
 return {g,body,legs:[],tail:null,wings:[],quirk:'blob'};
}
