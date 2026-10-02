import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The tsurugi ("long samurai sword" unidentified): an old straight, double-edged sword, longer than
// the katana and colder. The blade is blued-black steel of diamond section with a raised central
// ridge, flanked on each flat by a thin dark groove that dies out before the point. Both edges carry
// a pale, jagged sanbonsugi temper line (spikes rising in threes like cedars) and a bright cutting
// edge, and the edges close in to a long, sharp point. A gilt habaki seats it in a small oval iron
// tsuba whose rim is cut into eight spurs and pierced with four flame-shaped holes. The long grip
// is bound in a tight spiral of black lacquered cord between gilt-bronze ferrules, and it ends in a
// gilt ring pommel (kantō) with a dragon coiled inside, its jagged head biting the ring.
// Held-weapon space (equipment.js): the hand at the origin, the point up +y, the flats facing ±x,
// so laid on the floor (live.js lays weapons down with x -PI/2) it rests on one edge, like the
// katana on its spine.
// The steel and fittings are one material and the cord the other: 2 draws. The steel stays
// metalness >= .75, so weapon-magic sheathes it.
export const TSURUGI_NAME=/\btsurugi\b|\blong samurai sword\b/;
export const TSURUGI_TIP=1;
const TSUBA_Y=.066,BLADE_Y=.078,GRIP_LO=-.215,GRIP_HI=.052,POINT=.88,
 STEEL=0x1d2229,RIDGE=0x2e353d,GROOVE=0x0b0c0f,HAMON=0xbcc8d0,EDGE=0xeaf0f4,IRON=0x252220,GILT=0xa98236,
 CORD=0x100e10,CORD_HI=0x2c1a2a,CORE=0x1a1714;

const hash=i=>{const v=Math.sin(i*127.1+31.7)*43758.5453;return v-Math.floor(v);};
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
// The blade's half-width and thickness at u (0 at the habaki, 1 at the point): a slow taper, then
// the edges curve in to the point.
const halfWidth=u=>{const v=Math.max(0,(u-POINT)/(1-POINT));return (.021-.004*u)*Math.cos(v*Math.PI/2);};
const thickness=u=>{const v=Math.max(0,(u-POINT)/(1-POINT));return (.009-.003*u)*Math.cos(v*Math.PI/2)**.8;};
// The temper line, as a fraction of the way from the ridge (0) to the edge (1): spikes in threes.
const hamonLine=u=>{const k=u*14,group=k-Math.floor(k),j=Math.floor(k);
 const tooth=Math.max(0,1-Math.abs(((group*3)%1)*2-1))**2.2*(Math.floor(group*3)===1?1.25:.85);
 return .74-.13*tooth-.03*hash(j*3+Math.floor(group*3));};

// Rings of `n` vertices up a list of stations, joined into quads; open at both ends.
function lattice(stations,n){
 const pos=[],idx=[];
 for(const ring of stations)for(const p of ring)pos.push(...p);
 for(let i=0;i<stations.length-1;i++)for(let k=0;k<n;k++){const a=i*n+k,b=i*n+(k+1)%n,c=a+n,d=b+n;idx.push(a,c,b,b,c,d);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);return geo;
}

export function buildTsurugi(g){
 const steel=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.82,roughness:.26});
 const cord=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.62});
 g.userData.extraMaterial=[steel,cord];
 const sets=new Map([[steel,[]],[cord,[]]]),c=new THREE.Color();
 const put=(geo,m,tone,flat=true)=>{if(geo.attributes.uv)geo.deleteAttribute('uv');
  if(flat){if(geo.index)geo=geo.toNonIndexed();geo.deleteAttribute('normal');geo.computeVertexNormals();}
  else{geo.computeVertexNormals();if(geo.index)geo=geo.toNonIndexed();}
  const p=geo.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c,i);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));sets.get(m).push(geo);};
 const flat=hex=>(x,y,z,col)=>col.set(hex).multiplyScalar(.85+.3*hash(Math.floor(x*900)*7+Math.floor(y*900)+Math.floor(z*900)*13));

 // The blade. Each station is a diamond section across z: the +z edge, down the -x flat to the
 // ridge and on to the -z edge, then back up the +x flat. f runs 0 at the ridge to 1 at an edge;
 // the flats swell a little (niku) between ridge and edge.
 {const N=110,stations=[],fs=[.8,.62,.46,.3,.18,.08];
  const side=(t,w,s,sx,f)=>[sx*t/2*(1-f)*(1+.16*Math.sin(Math.PI*f)),0,s*w*f];
  for(let i=0;i<=N;i++){
   const u=i/N,y=BLADE_Y+(TSURUGI_TIP-BLADE_Y)*u,w=halfWidth(u),t=thickness(u),ring=[[0,y,w]];
   for(const f of fs)ring.push(side(t,w,1,-1,f));
   ring.push([-t/2,y,0]);
   for(const f of [...fs].reverse())ring.push(side(t,w,-1,-1,f));
   ring.push([0,y,-w]);
   for(const f of fs)ring.push(side(t,w,-1,1,f));
   ring.push([t/2,y,0]);
   for(const f of [...fs].reverse())ring.push(side(t,w,1,1,f));
   for(const p of ring)p[1]=y;
   stations.push(ring);
  }
  put(lattice(stations,stations[0].length),steel,(x,y,z,col)=>{
   const u=(y-BLADE_Y)/(TSURUGI_TIP-BLADE_Y),w=halfWidth(u),f=w>1e-6?Math.min(1,Math.abs(z)/w):0;
   col.set(STEEL).multiplyScalar(.88+.24*hash(Math.floor(u*340)));
   col.lerp(new THREE.Color(RIDGE),1-smooth(.04,.1,f));// the ridge line catches a little light
   // the grooves either side of the ridge, fading out before the point
   if(f>.12&&f<.26&&u<.78)col.lerp(new THREE.Color(GROOVE),.85*(1-smooth(.68,.78,u)));
   const line=hamonLine(u);
   col.lerp(new THREE.Color(HAMON),smooth(line-.04,line+.02,f));
   col.lerp(new THREE.Color(EDGE),smooth(.9,1,f));
   if(u<.03)col.lerp(new THREE.Color(0x4a5056),.45);// scoured near the habaki
  });}

 // The habaki: a gilt wedge collar round the base of the blade.
 put(new THREE.CylinderGeometry(.0085,.0098,.022,8).scale(1,1,2.6).translate(0,BLADE_Y+.002,0),steel,(x,y,z,col)=>{
  col.set(GILT).multiplyScalar(.75+.4*hash(Math.floor(y*900)+Math.floor(z*500)));if(y>BLADE_Y+.008)col.lerp(new THREE.Color(0xd8b060),.35);});
 // Gilt washers (seppa) either side of the tsuba.
 for(const y of [TSUBA_Y+.0062,TSUBA_Y-.0062])
  put(new THREE.CylinderGeometry(.0125,.0125,.0028,12).scale(1,1,1.9).translate(0,y,0),steel,flat(GILT));

 // The tsuba: a small oval iron plate, long along the edges (z), its rim cut into eight spurs and
 // pierced with four flame-shaped holes on the diagonals, licking outward.
 {const shape=new THREE.Shape(),M=96;
  for(let i=0;i<=M;i++){const a=i/M*Math.PI*2,spur=Math.max(0,Math.cos(4*a))**6;
   const r=1+.16*spur,px=.027*r*Math.cos(a),py=.036*r*Math.sin(a);i?shape.lineTo(px,py):shape.moveTo(px,py);}
  for(let q=0;q<4;q++){const a=(q+.5)*Math.PI/2,dx=Math.cos(a),dy=Math.sin(a),nx=-dy,ny=dx,hole=new THREE.Path(),pts=[];
   // a teardrop from a round base near the seppa to a hooked flame tip near the rim
   for(let i=0;i<=16;i++){const s=i/16,b=s*Math.PI*2,r=.0042*(1-.75*Math.max(0,Math.cos(b)))*(.7+.3*Math.sin(b/2)),
    along=.0175+.0072*Math.cos(b)+.0022*(Math.cos(b)>0?Math.sin(b):0),across=r*Math.sin(b)+.0018*Math.max(0,Math.cos(b))**2;
    pts.push([dx*along*.82+nx*across,dy*along+ny*across]);}
   pts.forEach(([x,y],i)=>i?hole.lineTo(x,y):hole.moveTo(x,y));shape.holes.push(hole);}
  const plate=new THREE.ExtrudeGeometry(shape,{depth:.005,bevelEnabled:true,bevelThickness:.001,bevelSize:.001,bevelSegments:1,curveSegments:8});
  plate.translate(0,0,-.0025).rotateX(-Math.PI/2).translate(0,TSUBA_Y,0);
  put(plate,steel,(x,y,z,col)=>{const r=Math.hypot(x/.027,z/.036);
   col.set(IRON).multiplyScalar(.7+.55*hash(Math.floor(x*800)*5+Math.floor(z*800)));
   if(r>1.02)col.lerp(new THREE.Color(0x5a4f45),.45);});}// the spurs rubbed bright

 // The grip: an oval core bound in a tight single spiral of black lacquered cord.
 {const N=72,ring=20,K=150,lo=GRIP_LO+.026,hi=GRIP_HI-.012,stations=[];
  const wind=(a,y)=>smooth(.1,.75,Math.cos(a+y*K));
  for(let i=0;i<=N;i++){const y=lo+(hi-lo)*i/N,u=i/N,pts=[];
   const r=.0118+.0012*Math.sin(u*Math.PI);
   for(let k=0;k<ring;k++){const a=k/ring*Math.PI*2,rr=r+.0016*wind(a,y);pts.push([Math.cos(a)*rr*.8,y,Math.sin(a)*rr]);}
   stations.push(pts);}
  put(lattice(stations,ring),cord,(x,y,z,col)=>{const a=Math.atan2(z,x/.8),wd=wind(a,y);
   col.set(CORE).lerp(new THREE.Color(CORD).lerp(new THREE.Color(CORD_HI),smooth(.7,1,wd)),smooth(.05,.4,wd));},false);
  // A bone peg (mekugi) through the grip under the upper ferrule.
  put(new THREE.CylinderGeometry(.0026,.0026,.026,6).rotateZ(Math.PI/2).translate(0,.018,0),cord,flat(0xcfc3a6));}
 // Gilt-bronze ferrules at both ends of the grip, ribbed.
 for(const [y,h] of [[GRIP_HI-.004,.016],[GRIP_LO+.015,.022]]){
  put(new THREE.CylinderGeometry(.0142,.0142,h,16).scale(.8,1,1).translate(0,y,0),steel,flat(GILT));
  for(const d of [-1,1])put(new THREE.TorusGeometry(.0142,.0012,4,16).rotateX(Math.PI/2).scale(.8,1,1).translate(0,y+d*h*.42,0),steel,flat(0x8a6a2a));}

 // The ring pommel (kantō), standing in the blade's plane below the grip, with a dragon coiled
 // inside it: a tapering body spiralling in to a jagged, open-jawed head that bites the ring.
 {const R=.024,cy=GRIP_LO-R+.002;
  put(new THREE.TorusGeometry(R,.0048,8,28).rotateY(Math.PI/2).translate(0,cy,0),steel,(x,y,z,col)=>{
   col.set(GILT).multiplyScalar(.7+.45*hash(Math.floor(Math.atan2(y-cy,z)*9)));if(y-cy<-R*.6)col.multiplyScalar(.7);});
  const pts=[];
  for(let i=0;i<=24;i++){const s=i/24,a=-Math.PI/2+s*Math.PI*1.7,r=R*(.25+.55*s);pts.push(new THREE.Vector3(0,cy+r*Math.sin(a),r*Math.cos(a)));}
  const coil=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),40,.0028,6,false),tp=coil.attributes.position;
  // taper the coil from the head (outer end) to the tail (centre)
  const along=[];for(let i=0;i<=40;i++)along.push(new THREE.CatmullRomCurve3(pts).getPointAt(i/40));
  for(let i=0;i<tp.count;i++){const seg=Math.floor(i/7),s=seg/40,ctr=along[Math.min(40,seg)],k=.35+.65*s;
   tp.setXYZ(i,ctr.x+(tp.getX(i)-ctr.x)*k,ctr.y+(tp.getY(i)-ctr.y)*k,ctr.z+(tp.getZ(i)-ctr.z)*k);}
  put(coil,steel,(x,y,z,col)=>col.set(GILT).multiplyScalar(.75+.35*hash(Math.floor(y*3000)+Math.floor(z*2000))));
  // the head: two jaws as thin wedges biting the ring, and two swept-back horns
  const head=pts[24],dir=pts[24].clone().sub(pts[22]).normalize(),ang=Math.atan2(dir.y,dir.z);
  for(const [len,spread,size] of [[.008,.45,.0034],[.0075,-.35,.003],[.007,2.6,.0016],[.0065,-2.5,.0016]]){
   const cone=new THREE.ConeGeometry(size,len,4).translate(0,len/2,0).rotateX(Math.PI/2-(ang+spread*.6)).translate(head.x,head.y,head.z);
   put(cone,steel,flat(0xc49a46));}}

 for(const [m,list] of sets){const merged=mergeGeometries(list);list.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=m===steel?'blade':'grip';g.add(mesh);}
 g.userData.tsurugi={kind:'tsurugi'};
}
