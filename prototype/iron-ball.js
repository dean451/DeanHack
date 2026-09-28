import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The punishment ball and chain. A heavy iron ball is a pitted, hammer-marked cast sphere
// with rust bleeding down from its lower half, a forged boss and shackle ring on top, and a
// stub of chain hanging from the ring and trailing across the floor. A loose iron chain is
// a length of stadium links lying in a lazy S, each link turned a quarter from the last so
// they interlock, alternately lying flat and standing on edge. Colour is baked into vertex
// colours and each model is one merged mesh on one material, resting on y=0.
const IRON=new THREE.Color(0x45484b),WORN=new THREE.Color(0x6f7274),RUST=new THREE.Color(0x7c4322),SCALE=new THREE.Color(0x4a2c1c);

// Smooth deterministic noise from a position, so seams in a non-indexed mesh still match.
const noise=(x,y,z)=>(Math.sin(x*23.1+y*7.3)*Math.cos(z*19.7-x*5.1)+Math.sin(y*31.7+z*11.9)*Math.cos(x*27.3+y*3.7)*.6+Math.sin(z*53.1+x*41.3-y*17.9)*.3)/1.9;

function clean(geo){
 const n=geo.index?geo.toNonIndexed():geo;if(n!==geo)geo.dispose();
 for(const k of Object.keys(n.attributes))if(!['position','normal','color'].includes(k))n.deleteAttribute(k);
 return n;
}

// Colours every vertex of an already placed geometry with paint(x, y, z, colour).
function paint(geo,fn){
 const p=geo.attributes.position,col=[],c=new THREE.Color();
 for(let i=0;i<p.count;i++){fn(p.getX(i),p.getY(i),p.getZ(i),c);col.push(c.r,c.g,c.b);}
 geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));return geo;
}

// Iron that is darker in its hollows, rubbed bright on its high spots and rusty low down.
function ironAt(x,y,z,c,{rustBelow=.08,wear=0}={}){
 const n=noise(x,y,z);
 c.copy(IRON).multiplyScalar(.88+.18*n);
 if(wear>0)c.lerp(WORN,Math.max(0,Math.min(1,wear))*.55);
 const rust=Math.max(0,Math.min(1,(rustBelow-y)/rustBelow*.9+noise(x*1.7+3,y*1.3,z*1.7)*.55-.15));
 if(rust>0)c.lerp(noise(x*3,y*3,z*3)>.1?SCALE:RUST,rust*.8);
}

// One stadium link along local x, in the local xy plane.
const LINK={half:.022,r:.022,tube:.0075};
function linkTemplate(){
 const pts=[],{half,r}=LINK;
 for(let i=0;i<24;i++){
  const a=i/24*Math.PI*2,side=Math.cos(a)>=0?1:-1;
  pts.push(new THREE.Vector3(side*half+r*Math.cos(a),r*Math.sin(a),0));
 }
 return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true,'centripetal'),32,LINK.tube,5,true);
}

// Lays links along a curve, alternating flat and on edge, each lifted clear of the floor.
// Returns placed, painted, non-indexed link geometries.
function chainAlong(curve,count,{seed=0,rustBelow=.06}={}){
 const template=linkTemplate(),out=[],up=new THREE.Vector3(0,1,0);
 const len=curve.getLength(),step=(LINK.half*2+LINK.r*2-LINK.tube*2)*.92;
 for(let i=0;i<count;i++){
  const u=Math.min(1,(i*step)/len),p=curve.getPointAt(u),x=curve.getTangentAt(u).normalize();
  let z=up.clone().sub(x.clone().multiplyScalar(x.dot(up)));
  if(z.lengthSq()<1e-4)z.set(0,0,1).sub(x.clone().multiplyScalar(x.z));
  z.normalize();let y=new THREE.Vector3().crossVectors(z,x);
  // Every other link is turned a quarter about the chain so the two interlock.
  if(i%2){const t=y.clone();y=z.clone().negate();z=t;}
  // A little twist and sag so the chain doesn't look laid with a ruler.
  const twist=(noise(i*.37+seed,seed*.13,i*.21)*.25);
  const q=new THREE.Quaternion().setFromAxisAngle(x,twist);y.applyQuaternion(q);z.applyQuaternion(q);
  const m=new THREE.Matrix4().makeBasis(x,y,z);
  const reach=(LINK.half+LINK.r)*Math.abs(x.y)+LINK.r*Math.abs(y.y)+LINK.tube;
  m.setPosition(p.x,Math.max(p.y,reach+.001),p.z);
  const geo=clean(template.clone().applyMatrix4(m));
  const shade=.9+.2*noise(i*1.3,seed,i*.7);
  paint(geo,(px,py,pz,c)=>{ironAt(px,py,pz,c,{rustBelow,wear:.4+.4*noise(px*9,py*9,pz*9)});c.multiplyScalar(shade);});
  out.push(geo);
 }
 template.dispose();
 return out;
}

function finish(parts,name,part){
 const merged=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());
 merged.computeVertexNormals();merged.computeBoundingBox();merged.computeBoundingSphere();
 const material=new THREE.MeshStandardMaterial({vertexColors:true,metalness:.55,roughness:.62});
 const mesh=new THREE.Mesh(merged,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=part;
 const g=new THREE.Group();g.name=name;g.add(mesh);
 g.userData.dispose=()=>{merged.dispose();material.dispose();};
 return g;
}

export const BALL_RADIUS=.16;

export function createIronBall(){
 const R=BALL_RADIUS,parts=[];
 // The ball: pitted by casting and dented by hammer blows, resting a hair flattened.
 const ball=clean(new THREE.IcosahedronGeometry(R,5));
 {
  const p=ball.attributes.position,v=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
   v.fromBufferAttribute(p,i).normalize();
   const pit=Math.max(0,noise(v.x*2.6,v.y*2.6,v.z*2.6)-.55)*.03+Math.max(0,noise(v.x*6+1,v.y*6,v.z*6)-.6)*.012;
   v.multiplyScalar(R*(1-pit+.004*noise(v.x*9,v.y*9,v.z*9)));
   v.y=Math.max(v.y,-R*.97);
   p.setXYZ(i,v.x,v.y+R*.97,v.z);
  }
 }
 paint(ball,(x,y,z,c)=>{
  // Pits read dark, the crown is worn smooth from being dragged, and rust runs down.
  const h=Math.hypot(x,y-R*.97,z)/R;
  ironAt(x,y,z,c,{rustBelow:R*.9,wear:(y/(R*2)-.55)*1.6});
  c.multiplyScalar(.75+.25*Math.min(1,Math.max(0,(h-.975)/.025)));
  // A few rust streaks from the shackle down the sides.
  const a=Math.atan2(z,x),streak=Math.max(0,Math.cos(a*5+1.3)-.9)*10*Math.max(0,y/(R*2)-.2);
  if(streak>0)c.lerp(RUST,Math.min(.6,streak*.6));
 });
 parts.push(ball);
 // A forged boss on the crown with the shackle ring through it.
 const top=R*1.97;
 const boss=clean(new THREE.LatheGeometry([[0,0],[.034,0],[.036,.006],[.03,.014],[.022,.022],[.018,.03],[0,.032]].map(([r,y])=>new THREE.Vector2(r,y)),16));
 boss.translate(0,top-.012,0);
 paint(boss,(x,y,z,c)=>ironAt(x,y,z,c,{rustBelow:0,wear:.5}));
 parts.push(boss);
 const eye=clean(new THREE.TorusGeometry(.012,.006,6,14));
 eye.rotateY(Math.PI/2);eye.translate(0,top+.03,0);paint(eye,(x,y,z,c)=>ironAt(x,y,z,c,{rustBelow:0,wear:.3}));parts.push(eye);
 const ringY=top+.058,ring=clean(new THREE.TorusGeometry(.03,.008,8,22));
 ring.rotateX(.25);ring.translate(0,ringY,.004);
 paint(ring,(x,y,z,c)=>ironAt(x,y,z,c,{rustBelow:0,wear:.6+.3*noise(x*20,y*20,z*20)}));parts.push(ring);
 // A stub of chain from the ring, draped over the ball and trailing off across the floor.
 const drape=new THREE.CatmullRomCurve3([
  [.024,ringY+.012,.02],[.07,ringY-.01,.05],[.12,top-.05,.08],[.16,R*1.25,.1],[.21,R*.55,.12],[.25,.02,.12],[.32,.01,.07],[.38,.01,.1]
 ].map(p=>new THREE.Vector3(...p)),false,'centripetal');
 parts.push(...chainAlong(drape,11,{seed:3,rustBelow:.05}));
 const g=finish(parts,'Heavy iron ball','iron ball');
 g.children[0].rotation.y=-.6;
 return g;
}

export function createIronChain(){
 // A loose length of chain dropped in a lazy S, with one end doubled back.
 const curve=new THREE.CatmullRomCurve3([
  [-.34,0,-.12],[-.2,0,-.2],[-.04,0,-.14],[.04,0,.02],[.12,0,.14],[.28,0,.16],[.36,0,.05],[.28,0,-.05]
 ].map(p=>new THREE.Vector3(...p)),false,'centripetal');
 return finish(chainAlong(curve,Math.floor(curve.getLength()/((LINK.half*2+LINK.r*2-LINK.tube*2)*.92))+1,{seed:7}),'Iron chain','iron chain');
}
