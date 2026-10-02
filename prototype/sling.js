import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The sling: two braided cords of dark sinew rising from the hand to a cracked, cupped pouch
// of old hide that wraps a jagged black flint. The retention cord ends in a finger loop, the
// release cord in a hard knot with a frayed tail, and the two are bound together at the hand
// by a few turns of sinew. Two knucklebone beads are threaded on the left cord under the pouch.
// Held-weapon space (equipment.js): the hand at the origin, the cords rising up +y to the
// pouch, all of it near the xy plane, so laid on the floor (live.js lays weapons down with
// x -PI/2) it lies flat. The hide is one material, the stone another: 2 draws. The flint
// stays metalness >= .75 (glassy and conchoidal), so weapon-magic sheathes it.
export const SLING_NAME=/\bsling\b/;

const hash=i=>{const v=Math.sin(i*127.1+31.7)*43758.5453;return v-Math.floor(v);};
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};

// A tube along a curve with radius r(u,a) at curve parameter u and ring angle a. Open ends.
function tube(points,r,segs,ring){
 const curve=new THREE.CatmullRomCurve3(points),frames=curve.computeFrenetFrames(segs,false),pos=[],idx=[],p=new THREE.Vector3();
 for(let i=0;i<=segs;i++){const u=i/segs;curve.getPointAt(u,p);const N=frames.normals[i],B=frames.binormals[i];
  for(let k=0;k<ring;k++){const a=k/ring*Math.PI*2,rr=r(u,a),c=Math.cos(a),s=Math.sin(a);
   pos.push(p.x+(N.x*c+B.x*s)*rr,p.y+(N.y*c+B.y*s)*rr,p.z+(N.z*c+B.z*s)*rr);}}
 for(let i=0;i<segs;i++)for(let k=0;k<ring;k++){const a=i*ring+k,b=i*ring+(k+1)%ring,c=a+ring,d=b+ring;idx.push(a,b,c,b,d,c);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);
 geo.computeVertexNormals();geo.userData.ring=ring;return geo;
}

export function buildSling(g){
 const hide=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.9,side:THREE.DoubleSide});
 const flint=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.75,roughness:.3});
 g.userData.extraMaterial=[hide,flint];
 const sets=new Map([[hide,[]],[flint,[]]]),c=new THREE.Color();
 const put=(geo,m,tone)=>{if(geo.attributes.uv)geo.deleteAttribute('uv');if(!geo.attributes.normal)geo.computeVertexNormals();if(geo.index)geo=geo.toNonIndexed();
  const p=geo.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c,i);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));sets.get(m).push(geo);};

 // The pouch: a patch of a sphere around the stone, arcing over its top and down both sides,
 // narrowing to a point at each end where a cord is knotted on. Its long edges are torn.
 const C=new THREE.Vector3(0,.4,0),Rp=.031,phi0=1.95;
 {const NU=36,NV=12,pos=[],idx=[];
  for(let i=0;i<=NU;i++){const s=i/NU*2-1,phi=s*phi0,taper=Math.cos(s*Math.PI/2)**.7;
   for(let j=0;j<=NV;j++){const t=j/NV*2-1,edge=Math.abs(t)>.95?1+.12*(hash(i*3+(t>0?1:0))-.5):1;
    const psi=t*.62*taper*edge,R=Rp*(1+.04*Math.sin(s*23+t*5)*Math.cos(t*2)+.025*hash(i*31+j));
    pos.push(C.x+R*Math.sin(phi)*Math.cos(psi),C.y+R*Math.cos(phi)*Math.cos(psi),C.z+R*Math.sin(psi));}}
  for(let i=0;i<NU;i++)for(let j=0;j<NV;j++){const a=i*(NV+1)+j,b=a+1,d=a+NV+1,e=d+1;idx.push(a,d,b,b,d,e);}
  const pouch=new THREE.BufferGeometry();pouch.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));pouch.setIndex(idx);pouch.computeVertexNormals();
  put(pouch,hide,(x,y,z,col)=>{const crack=smooth(.82,1,Math.abs(Math.sin(x*310+y*90)*Math.sin(z*260-x*70)));
   col.set(0x4a3426).lerp(new THREE.Color(0x6e5038),smooth(-.02,.03,z)*.5);// worn paler where the stone presses
   col.lerp(new THREE.Color(0x1c120d),crack*.7);// cracked dry hide
   col.lerp(new THREE.Color(0x3a1410),smooth(.3,1,Math.sin(x*140)*Math.sin(y*170+z*60))*.45);// old stains
   col.multiplyScalar(.9+.15*hash(Math.floor(x*500)+Math.floor(z*500)*7));});}
 const end=s=>new THREE.Vector3(C.x+s*Rp*Math.sin(phi0),C.y+Rp*Math.cos(phi0),0);

 // The stone: a jagged flint, knapped into facets, seated in the pouch.
 {const stone=new THREE.IcosahedronGeometry(.024,1),p=stone.attributes.position;
  for(let i=0;i<p.count;i++){const v=new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)),k=Math.round(v.x*900)*7+Math.round(v.y*900)*13+Math.round(v.z*900)*29;
   v.multiplyScalar(.85+.3*hash(k));v.y*=.82;v.z*=.8;p.setXYZ(i,v.x,v.y,v.z);}
  stone.translate(C.x,C.y-.003,C.z);stone.deleteAttribute('normal');
  put(stone,flint,(x,y,z,col,i)=>{const f=Math.floor(i/3);// flat colour per facet
   col.set(0x15161a).lerp(new THREE.Color(0x2c2a2e),hash(f));
   if(hash(f*5+2)>.82)col.lerp(new THREE.Color(0x9a9282),.6);// patches of chalky cortex
   if(hash(f*11+1)>.9)col.lerp(new THREE.Color(0x3c0f0c),.6);});}// a dried smear on one edge

 // The cords: braids of two sinew strands, bowing a little outward as they rise.
 const braid=(u,a,twist)=>.0042*(1+.22*Math.sin(2*a+u*twist));
 const cordTone=twist=>(geo)=>{const ring=geo.userData.ring,segs=geo.attributes.position.count/ring-1,tones=[];
  for(let i=0;i<=segs;i++)for(let k=0;k<ring;k++){const u=i/segs,a=k/ring*Math.PI*2,strand=Math.sin(a+u*twist/2)>0;
   tones.push(new THREE.Color(strand?0x3b2a20:0x261a14).multiplyScalar(.85+.3*smooth(.6,1,Math.sin(2*a+u*twist))));}
  return tones;};
 const cord=(pts,twist)=>{const geo=tube(pts,(u,a)=>braid(u,a,twist),48,8),tones=cordTone(twist)(geo),idx=geo.index.array;
  // Vertex tones are per ring vertex; carry them through the index before put() flattens it.
  const flat=geo.toNonIndexed(),cols=[];for(let i=0;i<idx.length;i++){const t=tones[idx[i]];cols.push(t.r,t.g,t.b);}
  flat.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));geo.dispose();sets.get(hide).push(flat);};
 for(const s of [-1,1]){const e=end(s);
  cord([new THREE.Vector3(s*.004,.01,0),new THREE.Vector3(s*.03,.14,.003*s),new THREE.Vector3(s*.04,.27,-.002*s),new THREE.Vector3(e.x*.98,e.y-.012,0),e],140);}
 // The knots tying each cord to a point of the pouch.
 for(const s of [-1,1]){const e=end(s),k=new THREE.SphereGeometry(.0075,8,6).scale(1,1.3,1);k.translate(e.x,e.y-.004,0);
  put(k,hide,(x,y,z,col)=>col.set(0x22160f).multiplyScalar(.9+.25*hash(Math.floor(y*900))));}

 // Two knucklebone beads threaded on the left cord under the pouch, yellowed and chipped.
 for(const [i,y] of [[0,.235],[1,.27]]){const x=-.004-.036*smooth(.01,.3,y)-.004*smooth(.14,.3,y);
  const bead=new THREE.CylinderGeometry(.0078,.0088,.013,8,1).scale(1,1,.85);
  bead.rotateZ(-.12);bead.translate(x,y,0);
  put(bead,hide,(px,py,pz,col)=>col.set(0xbfae88).lerp(new THREE.Color(0x6a5638),smooth(.3,1,hash(i*17+Math.floor((py-y)*700)))*.6));}

 // At the hand: a binding of sinew holding both cords, the finger loop and the release knot.
 for(let i=0;i<5;i++){const t=new THREE.TorusGeometry(.0085+.0006*i,.0022,4,10);t.rotateX(Math.PI/2+.25*(hash(i)-.5));t.translate(0,.002+i*.0055,0);
  put(t,hide,(x,y,z,col)=>col.set(0x7a6448).multiplyScalar(.7+.4*hash(i+4)));}
 {const loop=new THREE.TorusGeometry(.019,.0038,6,18);loop.scale(1,1.15,1);loop.translate(-.006,-.03,0);
  put(loop,hide,(x,y,z,col)=>col.set(0x33241b).multiplyScalar(.85+.3*Math.max(0,Math.sin(Math.atan2(y+.03,x+.006)*14))));}
 {const knot=new THREE.IcosahedronGeometry(.0095,1),p=knot.attributes.position;
  for(let i=0;i<p.count;i++){const f=.8+.4*hash(Math.round(p.getX(i)*3000)+Math.round(p.getY(i)*3000)*3);p.setXYZ(i,p.getX(i)*f,p.getY(i)*f,p.getZ(i)*f);}
  knot.translate(.009,-.008,0);knot.deleteAttribute('normal');
  put(knot,hide,(x,y,z,col)=>col.set(0x2a1c14));}
 // The release tail, fraying into three loose threads.
 put(tube([new THREE.Vector3(.011,-.014,0),new THREE.Vector3(.016,-.04,.002),new THREE.Vector3(.02,-.065,-.002)],u=>.0035*(1-.35*u),14,6),hide,
  (x,y,z,col)=>col.set(0x2e2017));
 for(let k=0;k<3;k++){const a=(k-1)*.5;
  put(tube([new THREE.Vector3(.02,-.064,0),new THREE.Vector3(.02+Math.sin(a)*.008,-.075,(k-1)*.002),new THREE.Vector3(.02+Math.sin(a)*.017+.002*hash(k),-.088-.006*hash(k+3),(k-1)*.003)],
   u=>.0013*(1-.7*u),8,4),hide,(x,y,z,col)=>col.set(0x5a4634));}

 for(const [m,list] of sets){const merged=mergeGeometries(list);list.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=m===flint?'stone':'sling';g.add(mesh);}
 g.userData.sling={kind:'sling'};
}
