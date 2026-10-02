import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The dwarvish mattock ("broad pick" unidentified): a heavy two-handed digging pick forged under the
// mountain. A long haft of black-stained oak, swelling toward the head, iron-shod at the butt with a
// short square spike, and wrapped low in sooty leather bound with iron rings. Iron langets run down
// the haft from a blocky eye. Out of the eye one side throws a broad adze blade that droops and
// flares to a chipped, polished edge; the other a long square pick that hooks down to a bright,
// wicked point with a barb under it. A short spike crowns the eye. The blackened iron is pitted and
// scaled with rust in the hollows, and a band of angular dwarvish runes is inlaid in dull copper
// round the eye.
// Held-weapon space (equipment.js): the hand at the origin, the haft up +y, the adze toward +x and
// the pick toward -x, so the head stands in the x-y plane and everything stays within .065 of it in
// z: laid on the floor (live.js lays weapons down with x -PI/2) it rests flat.
// The iron is one material and the wood and leather the other: 2 draws. The iron stays
// metalness >= .75, so weapon-magic sheathes it.
export const MATTOCK_NAME=/\b(dwarvish mattock|broad pick)\b/;
export const MATTOCK_HEAD_Y=.72;
const BUTT_Y=-.31,EYE_LO=.655,EYE_HI=.785,R=.024;
const IRON=0x34373a,POLISH=0xc9cfd1,SCALE=0x1c1a19,RUST=0x5e3018,COPPER=0x8a5532,
 WOOD=0x3a2618,WOOD_DARK=0x1f130c,LEATHER=0x2b1a12,LEATHER_HI=0x4a3022;

const hash=i=>{const v=Math.sin(i*127.1+31.7)*43758.5453;return v-Math.floor(v);};
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};

// Rings joined into quads, each end closed by a fan to its centroid.
function lattice(stations){
 const n=stations[0].length,pos=[],idx=[];
 for(const ring of stations)for(const p of ring)pos.push(...p);
 for(let i=0;i<stations.length-1;i++)for(let k=0;k<n;k++){const a=i*n+k,b=i*n+(k+1)%n,c=a+n,d=b+n;idx.push(a,c,b,b,c,d);}
 for(const [s,flip] of [[0,true],[stations.length-1,false]]){
  const ring=stations[s],ctr=[0,1,2].map(j=>ring.reduce((t,p)=>t+p[j],0)/n),ci=pos.length/3;pos.push(...ctr);
  for(let k=0;k<n;k++){const a=s*n+k,b=s*n+(k+1)%n;flip?idx.push(ci,a,b):idx.push(ci,b,a);}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);return geo;
}
// A blade swept out from the eye along a drooping centre line in the x-y plane: at u, `center(u)`
// is the centre, and the section is `section(u)` as [across the line in x-y, z] pairs.
function sweep(N,center,section){
 const stations=[];
 for(let i=0;i<=N;i++){
  const u=i/N,c=center(u),e=.001,a=center(Math.max(0,u-e)),b=center(Math.min(1,u+e));
  const tx=b[0]-a[0],ty=b[1]-a[1],l=Math.hypot(tx,ty),nx=-ty/l,ny=tx/l;
  // The sections run from +across toward +z, which winds inward here; reversed, they face out.
  stations.push(section(u).reverse().map(([s,z])=>[c[0]+nx*s,c[1]+ny*s,z]));
 }
 return lattice(stations);
}
// An octagon with bevelled corners: half sizes h (across) and w (z), corners cut by k.
const bevelBox=(h,w,k=.3)=>[[h,w*(1-k)],[h*(1-k),w],[-h*(1-k),w],[-h,w*(1-k)],[-h,-w*(1-k)],[-h*(1-k),-w],[h*(1-k),-w],[h,-w*(1-k)]];

export function buildMattock(g){
 const iron=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.78,roughness:.52});
 const wood=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.88});
 g.userData.extraMaterial=[iron,wood];
 const sets=new Map([[iron,[]],[wood,[]]]),c=new THREE.Color();
 const put=(geo,m,tone,flat=true)=>{if(geo.attributes.uv)geo.deleteAttribute('uv');
  if(flat){if(geo.index)geo=geo.toNonIndexed();geo.deleteAttribute('normal');geo.computeVertexNormals();}
  else{geo.computeVertexNormals();if(geo.index)geo=geo.toNonIndexed();}
  const p=geo.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));sets.get(m).push(geo);};
 // Blackened iron, pitted, scaled in patches and rusting here and there.
 const ironTone=(x,y,z,col)=>{const h=hash(Math.floor(x*420)*7+Math.floor(y*420)*3+Math.floor(z*420)*13);
  col.set(IRON).multiplyScalar(.78+.35*h);
  if(h>.86)col.lerp(new THREE.Color(SCALE),.7);else if(h<.07)col.lerp(new THREE.Color(RUST),.65);};

 // The haft: an oak pole up y, slightly octagonal, swelling into the eye and at the butt; the
 // stain is darkest where hands have held it.
 {const N=44,stations=[],lo=BUTT_Y+.02,hi=EYE_HI-.004;
  for(let i=0;i<=N;i++){const y=lo+(hi-lo)*i/N,u=i/N,r=R*(1+.12*smooth(.7,1,u)+.1*(1-smooth(0,.06,u))),ring=[];
   for(let k=0;k<12;k++){const a=k/12*Math.PI*2,f=1+.04*Math.cos(a*4);ring.push([Math.cos(a)*r*f,y,Math.sin(a)*r*f]);}
   stations.push(ring);}
  put(lattice(stations),wood,(x,y,z,col)=>{const a=Math.atan2(z,x);
   col.set(WOOD).lerp(new THREE.Color(WOOD_DARK),.5+.5*Math.sin(a*3+y*40+Math.sin(y*97)*1.6));
   col.multiplyScalar(.85+.2*hash(Math.floor(a*5)*11+Math.floor(y*70)));
   if(y>.02&&y<.45)col.lerp(new THREE.Color(WOOD_DARK),.35*Math.sin((y-.02)/.43*Math.PI));},false);}

 // The low grip: sooty leather spiralled round the haft from just below the hand to well above it,
 // bound at each end by an iron ring.
 {const lo=-.25,hi=.06,turns=12,pts=[];
  for(let i=0;i<=turns*14;i++){const t=i/(turns*14),a=t*turns*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*(R+.004),lo+(hi-lo)*t,Math.sin(a)*(R+.004)));}
  put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),turns*28,.0062,5),wood,(x,y,z,col)=>{
   col.set(LEATHER).lerp(new THREE.Color(LEATHER_HI),hash(Math.floor(y*160))*.6);if(Math.abs(y+.08)<.09)col.multiplyScalar(.7);},false);
  for(const y of [lo-.008,hi+.008])put(new THREE.TorusGeometry(R+.007,.0045,5,16).rotateX(Math.PI/2).translate(0,y,0),iron,ironTone);}

 // The iron shoe at the butt with a short square spike under it.
 put(new THREE.CylinderGeometry(R*1.12,R*1.2,.05,8,1).translate(0,BUTT_Y+.035,0),iron,ironTone);
 put(new THREE.ConeGeometry(R*1.05,.055,4,1).rotateY(Math.PI/4).rotateX(Math.PI).translate(0,BUTT_Y-.017,0),iron,(x,y,z,col)=>{ironTone(x,y,z,col);col.lerp(new THREE.Color(POLISH),smooth(BUTT_Y,BUTT_Y-.04,y)*.6);});

 // Langets: iron straps down the front and back of the haft from the eye, each with three rivets.
 for(const s of [-1,1]){
  put(new THREE.BoxGeometry(.016,.2,.005).translate(0,EYE_LO-.098,s*(R*1.1+.0025)),iron,ironTone);
  for(const y of [EYE_LO-.03,EYE_LO-.1,EYE_LO-.17])put(new THREE.SphereGeometry(.0052,6,4).scale(1,1,.55).translate(0,y,s*(R*1.1+.005)),iron,(x,y,z,col)=>col.set(POLISH).multiplyScalar(.55));
 }

 // The eye: a blocky iron socket round the haft, wider than deep, with a raised lip top and bottom.
 put(new THREE.BoxGeometry(.088,EYE_HI-EYE_LO,.066,2,3,2).translate(0,(EYE_LO+EYE_HI)/2,0),iron,ironTone);
 for(const y of [EYE_LO+.006,EYE_HI-.006])put(new THREE.BoxGeometry(.096,.012,.074).translate(0,y,0),iron,ironTone);
 // A short square spike crowning the eye.
 put(new THREE.ConeGeometry(.03,.075,4,1).rotateY(Math.PI/4).translate(0,EYE_HI+.0375,0),iron,(x,y,z,col)=>{ironTone(x,y,z,col);col.lerp(new THREE.Color(POLISH),smooth(EYE_HI+.03,EYE_HI+.075,y)*.7);});

 const copperTone=(x,y,z,col)=>col.set(COPPER).multiplyScalar(.8+.3*hash(Math.floor(x*900)+Math.floor(y*900)*5));
 // A band of angular runes inlaid in dull copper on both broad faces of the eye: each rune a
 // stave with one to three twigs, picked by hash.
 for(const s of [-1,1])for(let r=0;r<3;r++){
  const x0=-.028+r*.028,y0=(EYE_LO+EYE_HI)/2,z0=s*.0335,strokes=[[0,0,.042,0]];
  const n=1+Math.floor(hash(r*5+(s>0?17:3))*3);
  for(let k=0;k<n;k++){const h=hash(r*31+k*7+(s>0?1:9)),side=h<.5?-1:1,yy=(k-1)*.012;strokes.push([side*.006,yy+.004*side,.017,side*(h<.25||h>.75?.9:-.9)]);}
  for(const [dx,dy,len,ang] of strokes)
   put(new THREE.BoxGeometry(.0028,len,.0016).rotateZ(ang).translate(x0+dx,y0+dy,z0),iron,copperTone);
 }

 // The adze: a broad blade out of the +x side that droops as it goes and flares in z to a wide,
 // polished edge with two chips in it. It is thick at the eye and ground thin at the edge.
 const adzeC=u=>[.04+.25*u,MATTOCK_HEAD_Y-.1*u*u];
 put(sweep(28,adzeC,u=>{const h=.024*(1-u)**.8+.0018,w=.031+.03*smooth(.25,1,u);return bevelBox(h,w,.25);}),iron,(x,y,z,col)=>{
  ironTone(x,y,z,col);const u=Math.min(1,Math.max(0,(x-.04)/.25));col.lerp(new THREE.Color(POLISH),smooth(.78,1,u)*.85);});
 // The pick: a long square spike out of the -x side, hooking down to a bright point.
 const pickC=u=>[-.04-.24*u,MATTOCK_HEAD_Y-.13*u**2.2];
 put(sweep(32,pickC,u=>{const h=.02*(1-u)**.9+.0012,w=.018*(1-u)**.75+.0012;return [[h,0],[h*.4,w],[0,w*.9],[-h*.4,w],[-h,0],[-h*.4,-w],[0,-w*.9],[h*.4,-w]];}),iron,(x,y,z,col)=>{
  ironTone(x,y,z,col);const u=Math.min(1,Math.max(0,(-x-.04)/.24));col.lerp(new THREE.Color(POLISH),smooth(.65,1,u)*.9);});
 // A barb under the pick, a little way back from the point, raked toward the haft.
 {const [bx,by]=pickC(.55);put(new THREE.ConeGeometry(.011,.05,4,1).rotateY(Math.PI/4).rotateZ(-2.6).translate(bx+.01,by-.022,0),iron,(x,y,z,col)=>{ironTone(x,y,z,col);col.lerp(new THREE.Color(POLISH),.35);});}
 // Chips knocked out of the adze edge: dark nicks on its polished face.
 for(const z of [-.032,.019])put(new THREE.BoxGeometry(.012,.0042,.008).translate(adzeC(1)[0]-.005,adzeC(1)[1],z),iron,(x,y,z,col)=>col.set(SCALE));

 for(const [m,list] of sets){const merged=mergeGeometries(list);list.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=m===iron?'head':'haft';g.add(mesh);}
 g.userData.mattock={kind:'mattock'};
}
