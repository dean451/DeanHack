import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The scalpel: an old surgeon's knife from a dungeon's back room. A small flat blade with a straight
// spine and a fat curved belly, ground thin to a hair edge that has chipped in two places; the edge
// is brown with dried blood and the flats spotted with rust. A steel bolster seats it on a slim
// handle of yellowed bone, cracked along its grain, darkened by old hands and fixed with three
// steel pins; a cross-hatched steel thumb rest sits just below the bolster.
// Held-weapon space (equipment.js): the hand at the origin, the point up +y, the blade flat in the
// x-y plane with its edge toward +x, everything close to the y axis, so laid on the floor (live.js
// lays weapons down with x -PI/2) it lies flat.
// The steel is one material and the bone the other: 2 draws. The steel stays metalness >= .75,
// so weapon-magic sheathes it.
export const SCALPEL_NAME=/\bscalpel\b/;
export const SCALPEL_TIP=.2;
const BLADE_Y=.058,BOLSTER_Y=.04,HANDLE_LO=-.15;
const STEEL=0x9aa3a8,EDGE=0xdfe6ea,RUST=0x5a2c16,BLOOD=0x3b100c,BONE=0xcbb68e,BONE_DARK=0x5e4a30;

const hash=i=>{const v=Math.sin(i*127.1+31.7)*43758.5453;return v-Math.floor(v);};
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};

// A closed tube of stations up the y axis: loop(i) gives the ring's [x,z] points at station i.
function loft(ys,loop){
 const pos=[],idx=[];let ring=0;
 ys.forEach((y,i)=>{const pts=loop(y,i);ring=pts.length;for(const [x,z] of pts)pos.push(x,y,z);});
 for(let i=0;i<ys.length-1;i++)for(let k=0;k<ring;k++){const a=i*ring+k,b=i*ring+(k+1)%ring,c=a+ring,d=b+ring;idx.push(a,c,b,b,c,d);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);return geo;
}

// The blade's outline at u (0 at the bolster, 1 at the point): the spine on -x, the edge on +x.
function outline(u){
 const spine=-.0065+.0105*smooth(.42,1,u)**1.4;
 let edge=.0045+.0125*Math.sin(Math.PI*Math.min(1,u))**.65*(1-.25*u);
 // Two chips knocked out of the belly.
 edge-=.0022*Math.exp(-(((u-.38)/.025)**2))+.0016*Math.exp(-(((u-.63)/.02)**2));
 return [spine,Math.max(spine+.0004,edge)];
}

export function buildScalpel(g){
 const steel=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.85,roughness:.28});
 const bone=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.7});
 g.userData.extraMaterial=[steel,bone];
 const sets=new Map([[steel,[]],[bone,[]]]),c=new THREE.Color();
 const put=(geo,m,tone,flat=true)=>{if(geo.attributes.uv)geo.deleteAttribute('uv');
  if(flat){if(geo.index)geo=geo.toNonIndexed();geo.deleteAttribute('normal');geo.computeVertexNormals();}
  else{geo.computeVertexNormals();if(geo.index)geo=geo.toNonIndexed();}
  const p=geo.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));sets.get(m).push(geo);};
 const steelTone=(x,y,z,col)=>col.set(STEEL).multiplyScalar(.8+.3*hash(Math.floor(x*900)*7+Math.floor(y*900)+Math.floor(z*900)*13));

 // The blade: each station a lens from spine to edge, the spine a narrow flat, the faces ground
 // down to a hair edge. Closed at the point by its last, near-zero station.
 {const N=36,M=7,ys=[];for(let i=0;i<=N;i++)ys.push(BLADE_Y+(SCALPEL_TIP-BLADE_Y)*i/N);
  const blade=loft(ys,y=>{const u=(y-BLADE_Y)/(SCALPEL_TIP-BLADE_Y),[s,e]=outline(u),t=.0015*(1-.75*u)+.0001,pts=[];
   // Across the front face from spine to edge, then back along the rear face.
   for(let k=0;k<=M;k++){const v=k/M;pts.push([s+(e-s)*v,t*(1-v**1.6)]);}
   for(let k=M-1;k>0;k--){const v=k/M;pts.push([s+(e-s)*v,-t*(1-v**1.6)]);}
   return pts;});
  put(blade,steel,(x,y,z,col)=>{const u=(y-BLADE_Y)/(SCALPEL_TIP-BLADE_Y),[s,e]=outline(u),v=(x-s)/Math.max(1e-5,e-s);
   col.set(STEEL).lerp(new THREE.Color(EDGE),smooth(.7,1,v)*.85);// the bright ground bevel
   // Dried blood along the edge and up over the belly, heaviest where it cut deepest.
   col.lerp(new THREE.Color(BLOOD),smooth(.55,.95,v)*smooth(.1,.4,u)*(1-smooth(.85,1,u)*.6)*(.55+.4*hash(Math.floor(y*500))));
   // Rust spots on the flats.
   const r=hash(Math.floor(x*2200)*31+Math.floor(y*1400));
   if(r>.82&&v<.75)col.lerp(new THREE.Color(RUST),.75);},true);}

 // The bolster: a short steel collar with a flat-faced neck clasping the blade's base.
 put(loft([BOLSTER_Y-.004,BOLSTER_Y,BLADE_Y+.004,BLADE_Y+.006],(y,i)=>{const pts=[],w=[.0085,.0085,.0072,.006][i],t=[.005,.005,.0032,.0022][i];
  for(let k=0;k<10;k++){const a=k/10*Math.PI*2;pts.push([Math.cos(a)*w,Math.sin(a)*t]);}return pts;}),steel,steelTone);
 // A cross-hatched steel thumb rest just below the bolster, on both flats.
 put(loft([BOLSTER_Y-.032,BOLSTER_Y-.004],()=>{const pts=[];for(let k=0;k<10;k++){const a=k/10*Math.PI*2;pts.push([Math.cos(a)*.0082,Math.sin(a)*.0052]);}return pts;}),
  steel,(x,y,z,col)=>{steelTone(x,y,z,col);const h=Math.abs(Math.sin((x+y)*900))*Math.abs(Math.sin((x-y)*900));col.multiplyScalar(.6+.5*h);});

 // The handle: yellowed bone, oval in section, swelling a little under the fingers and rounded at
 // the butt; cracks run along its grain and old hands have darkened the middle.
 {const N=40,ys=[];for(let i=0;i<=N;i++)ys.push(HANDLE_LO+(BOLSTER_Y-.036-HANDLE_LO)*i/N);
  const handle=loft(ys,y=>{const u=(y-HANDLE_LO)/(BOLSTER_Y-.036-HANDLE_LO);
   const s=(.82+.18*Math.sin(u*Math.PI*.9+.25))*Math.sqrt(Math.min(1,u*14+.04)),pts=[];// the butt rounds off
   for(let k=0;k<14;k++){const a=k/14*Math.PI*2;pts.push([Math.cos(a)*.0088*s,Math.sin(a)*.0056*s]);}return pts;});
  put(handle,bone,(x,y,z,col)=>{const u=(y-HANDLE_LO)/(BOLSTER_Y-.036-HANDLE_LO),a=Math.atan2(z/.0056,x/.0088);
   col.set(BONE).multiplyScalar(.88+.18*hash(Math.floor(a*9)*17+Math.floor(y*260)));
   col.lerp(new THREE.Color(BONE_DARK),.35*Math.sin(u*Math.PI)**2);// grime where it is held
   // Hairline cracks along the grain, each a narrow band of angle wandering a little.
   for(const [a0,y0,y1] of [[.6,-.13,-.05],[2.4,-.09,.0],[-1.9,-.145,-.1],[-.4,-.06,-.01]]){
    const d=Math.abs(a-a0-.25*Math.sin(y*90));
    if(y>y0&&y<y1&&d<.09)col.lerp(new THREE.Color(0x221810),.75*(1-d/.09));}},false);}
 // Three steel pins through the bone, their heads proud of both faces.
 for(const y of [-.115,-.07,-.025])for(const s of [-1,1])
  put(new THREE.CylinderGeometry(.0018,.0018,.0016,6).rotateX(Math.PI/2).translate(0,y,s*.0056*1.02),steel,(x,y,z,col)=>col.set(EDGE).multiplyScalar(.7));

 for(const [m,list] of sets){const merged=mergeGeometries(list);list.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=m===steel?'blade':'grip';g.add(mesh);}
 g.userData.scalpel={kind:'scalpel'};
}
