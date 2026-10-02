import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The two-handed sword: a huge executioner's flamberge, taller than a man's chest. The blade is
// blackened steel of flattened diamond section, and its lower two thirds snake from side to side in
// tight flame-like waves that straighten out into a long, plain point; the honed edges catch the
// light bright against the dark flats, a narrow fuller runs up from the base, and the steel is
// pitted with old rust-brown stains above the hooks. Below the blade a leather-wrapped ricasso
// gives a second grip, guarded by two barbed parrying hooks that flare out and curl back down. The
// wide iron crossguard has a squared block at its heart, a side ring on each flat, and long
// quillons of square section that sag, then sweep up toward the blade into curled spikes. The long
// grip is bound in a spiral of black leather in two swells about a raised iron ring, and it ends in
// a faceted pear pommel with a short spike.
// Held-weapon space (equipment.js): the hand at the origin, the point up +y, the edges and the
// crossguard along ±x and the flats facing ±z, like the generic blade, so laid on the floor
// (live.js lays weapons down with x -PI/2) it rests flat on its broad side.
// The steel and iron are one material and the leather the other: 2 draws. The steel stays
// metalness >= .75, so weapon-magic sheathes it.
export const TWO_HANDED_SWORD_NAME=/\btwo-handed sword\b/;
export const TWO_HANDED_SWORD_TIP=1.12;
const GUARD_Y=.04,BLADE_Y=.19,GRIP_LO=-.31,GRIP_HI=.026,RING_Y=-.13,POINT=.86,
 STEEL=0x272b30,FULLER=0x0e0f12,EDGE=0xd6dde2,RUST=0x3b1c12,IRON=0x24211f,IRON_HI=0x55504a,
 LEATHER=0x150f0d,LEATHER_HI=0x34241c;

const hash=i=>{const v=Math.sin(i*127.1+31.7)*43758.5453;return v-Math.floor(v);};
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
// u runs 0 at the base of the blade to 1 at the point.
const pointing=u=>Math.cos(Math.max(0,(u-POINT)/(1-POINT))*Math.PI/2);
const halfWidth=u=>(.027-.007*u)*pointing(u);
const thickness=u=>(.0095-.0035*u)*pointing(u)**.8;
// The flame: the whole section snakes side to side (both edges in step), easing in at the base and
// dying out before the point, so the point stays on the axis.
const wave=u=>.0055*Math.sin(u*Math.PI*2*12)*smooth(0,.04,u)*(1-smooth(.6,.76,u));

// Rings of `n` vertices up a list of stations, joined into quads; open at both ends.
function lattice(stations,n){
 const pos=[],idx=[];
 for(const ring of stations)for(const p of ring)pos.push(...p);
 for(let i=0;i<stations.length-1;i++)for(let k=0;k<n;k++){const a=i*n+k,b=i*n+(k+1)%n,c=a+n,d=b+n;idx.push(a,c,b,b,c,d);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);return geo;
}

// A tube of `sides` faces along a curve through `pts`, tapering from r0 to a point.
function spike(pts,r0,sides=4,segs=16){
 const curve=new THREE.CatmullRomCurve3(pts),geo=new THREE.TubeGeometry(curve,segs,r0,sides,false),p=geo.attributes.position;
 const centres=[];for(let i=0;i<=segs;i++)centres.push(curve.getPointAt(i/segs));
 for(let i=0;i<p.count;i++){const ring=Math.floor(i/(sides+1)),c=centres[ring],k=(1-ring/segs)**.8;
  p.setXYZ(i,c.x+(p.getX(i)-c.x)*k,c.y+(p.getY(i)-c.y)*k,c.z+(p.getZ(i)-c.z)*k);}
 return geo;
}

export function buildTwoHandedSword(g){
 const steel=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.8,roughness:.3});
 const leather=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.84});
 g.userData.extraMaterial=[steel,leather];
 const sets=new Map([[steel,[]],[leather,[]]]),c=new THREE.Color();
 const put=(geo,m,tone,flat=true)=>{if(geo.attributes.uv)geo.deleteAttribute('uv');
  if(flat){if(geo.index)geo=geo.toNonIndexed();geo.deleteAttribute('normal');geo.computeVertexNormals();}
  else{geo.computeVertexNormals();if(geo.index)geo=geo.toNonIndexed();}
  const p=geo.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c,i);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));sets.get(m).push(geo);};
 const iron=(x,y,z,col)=>{col.set(IRON).multiplyScalar(.75+.5*hash(Math.floor(x*700)*7+Math.floor(y*700)+Math.floor(z*700)*13));
  col.lerp(new THREE.Color(IRON_HI),.35*smooth(.6,1,hash(Math.floor(x*300)+Math.floor(y*300)*3)));};

 // The blade. Each station is a diamond section across x: the +x edge, over the +z flat to the
 // ridge and on to the -x edge, then back under the -z flat. f runs 0 at the ridge to 1 at an edge;
 // the flats swell a little between ridge and edge.
 {const N=160,stations=[],fs=[.8,.62,.46,.3,.18,.08];
  for(let i=0;i<=N;i++){
   const u=i/N,y=BLADE_Y+(TWO_HANDED_SWORD_TIP-BLADE_Y)*u,w=halfWidth(u),t=thickness(u),o=wave(u);
   const side=(f,sx,sz)=>[o+sx*w*f,y,sz*t/2*(1-f)*(1+.16*Math.sin(Math.PI*f))];
   const ring=[[o+w,y,0]];
   for(const f of fs)ring.push(side(f,1,1));
   ring.push([o,y,t/2]);
   for(const f of [...fs].reverse())ring.push(side(f,-1,1));
   ring.push([o-w,y,0]);
   for(const f of fs)ring.push(side(f,-1,-1));
   ring.push([o,y,-t/2]);
   for(const f of [...fs].reverse())ring.push(side(f,1,-1));
   stations.push(ring);
  }
  put(lattice(stations,stations[0].length),steel,(x,y,z,col)=>{
   const u=(y-BLADE_Y)/(TWO_HANDED_SWORD_TIP-BLADE_Y),w=halfWidth(u),f=w>1e-6?Math.min(1,Math.abs(x-wave(u))/w):0;
   col.set(STEEL).multiplyScalar(.85+.3*hash(Math.floor(u*420)));
   // the fuller up the middle of the lower blade
   if(f<.2)col.lerp(new THREE.Color(FULLER),.8*(1-smooth(.36,.46,u))*(1-smooth(.12,.2,f)));
   // old stains, thickest just above the hooks
   const stain=hash(Math.floor(u*60)*17+Math.floor(f*6)+(z>0?5:0));
   if(stain>.55)col.lerp(new THREE.Color(RUST),(stain-.55)*1.8*(1-smooth(.04,.3,u)));
   col.lerp(new THREE.Color(EDGE),smooth(.84,1,f));
  });}

 // The ricasso: an unsharpened oval stem below the blade, wrapped in a spiral of leather.
 {const N=28,ring=16,K=210,lo=GUARD_Y+.012,hi=BLADE_Y+.004,stations=[];
  for(let i=0;i<=N;i++){const y=lo+(hi-lo)*i/N,pts=[];
   for(let k=0;k<ring;k++){const a=k/ring*Math.PI*2,rr=1+.1*smooth(.2,.8,Math.cos(a+y*K));pts.push([Math.cos(a)*.019*rr,y,Math.sin(a)*.0098*rr]);}
   stations.push(pts);}
  put(lattice(stations,ring),leather,(x,y,z,col)=>{const wd=smooth(.2,.8,Math.cos(Math.atan2(z/.0098,x/.019)+y*K));
   col.set(LEATHER).lerp(new THREE.Color(LEATHER_HI),.7*smooth(.6,1,wd));},false);}

 // The parrying hooks: barbed spikes flaring out from the top of the ricasso and curling back down.
 for(const s of [-1,1]){
  put(spike([[.016,BLADE_Y-.004,0],[.04,BLADE_Y+.004,0],[.062,BLADE_Y-.008,0],[.07,BLADE_Y-.032,0],[.062,BLADE_Y-.05,0]].map(([x,y,z])=>new THREE.Vector3(s*x,y,z)),.0075),steel,iron);
  put(spike([[.044,BLADE_Y+.002,0],[.054,BLADE_Y+.016,0],[.058,BLADE_Y+.03,0]].map(([x,y,z])=>new THREE.Vector3(s*x,y,z)),.0045,4,6),steel,iron);
 }

 // The crossguard: a squared iron block, a side ring on each flat, and long quillons that sag then
 // sweep up toward the blade into curled spikes.
 put(new THREE.BoxGeometry(.052,.026,.034).translate(0,GUARD_Y,0),steel,iron);
 put(new THREE.BoxGeometry(.06,.006,.04).translate(0,GUARD_Y+.015,0),steel,iron);
 for(const s of [-1,1]){
  put(spike([[.02,GUARD_Y,0],[.07,GUARD_Y-.008,0],[.125,GUARD_Y-.002,0],[.168,GUARD_Y+.024,0],[.18,GUARD_Y+.06,0],[.17,GUARD_Y+.082,0]].map(([x,y,z])=>new THREE.Vector3(s*x,y,z)),.0095,4,24),steel,iron);
  // a short spur halfway along each quillon, pointing down toward the hand
  put(spike([[.09,GUARD_Y-.004,0],[.096,GUARD_Y-.02,0],[.094,GUARD_Y-.032,0]].map(([x,y,z])=>new THREE.Vector3(s*x,y,z)),.004,4,6),steel,iron);
  put(new THREE.TorusGeometry(.022,.0034,5,20).rotateX(Math.PI/2).translate(0,GUARD_Y,s*.035),steel,iron);
 }

 // The grip: an oval core in two swells about a raised iron ring, bound in a spiral of black
 // leather.
 {const N=80,ring=18,K=170,lo=GRIP_LO+.006,hi=GRIP_HI,stations=[];
  const wind=(a,y)=>smooth(.15,.75,Math.cos(a+y*K));
  for(let i=0;i<=N;i++){const y=lo+(hi-lo)*i/N,pts=[];
   const swell=y<RING_Y?Math.sin(Math.PI*(y-lo)/(RING_Y-lo)):Math.sin(Math.PI*(y-RING_Y)/(hi-RING_Y));
   const r=.0125+.0025*swell;
   for(let k=0;k<ring;k++){const a=k/ring*Math.PI*2,rr=r+.0014*wind(a,y);pts.push([Math.cos(a)*rr*1.12,y,Math.sin(a)*rr*.92]);}
   stations.push(pts);}
  put(lattice(stations,ring),leather,(x,y,z,col)=>{const wd=wind(Math.atan2(z/.92,x/1.12),y);
   col.set(0x0c0908).lerp(new THREE.Color(LEATHER).lerp(new THREE.Color(LEATHER_HI),smooth(.7,1,wd)),smooth(.05,.4,wd));},false);}
 for(const [y,r,h] of [[RING_Y,.0145,.012],[GRIP_HI-.002,.0155,.012],[GRIP_LO+.004,.0145,.01]])
  put(new THREE.CylinderGeometry(r,r,h,10).scale(1.12,1,.92).translate(0,y,0),steel,iron);

 // The pommel: a faceted pear with a short spike under it.
 put(new THREE.LatheGeometry([[0,-.061],[.004,-.06],[.013,-.056],[.024,-.044],[.027,-.03],[.022,-.014],[.012,0],[0,0]].map(([r,y])=>new THREE.Vector2(r,y)),8)
  .translate(0,GRIP_LO,0),steel,iron);
 put(new THREE.ConeGeometry(.006,.02,4).rotateX(Math.PI).translate(0,GRIP_LO-.07,0),steel,iron);

 for(const [m,list] of sets){const merged=mergeGeometries(list);list.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=m===steel?'blade':'grip';g.add(mesh);}
 g.userData.twoHandedSword={kind:'two-handed sword'};
}
