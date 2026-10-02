import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The katana ("samurai sword" unidentified): a long, gently curved blade of blued-black steel with a
// ridged shinogi-zukuri section, a peaked spine and a narrow groove (bo-hi) running up the flat
// above the ridge. A pale, wavy temper line (hamon) rides the edge and follows it round the point,
// where a bright yokote line marks off the kissaki. A copper habaki collar and gilt washers seat it
// in a four-lobed iron tsuba pierced with two crescent moons. The long two-handed hilt is wrapped in
// oxblood silk crossing in diamonds over black ray skin, with a gilt menuki under the wrap on each
// side, a bone mekugi peg, and blackened iron fuchi and kashira caps.
// Held-weapon space (equipment.js): the hand at the origin, the point up +y, the edge toward +z and
// the curve (sori) bending the point back toward -z, everything close to the y axis, so laid on
// the floor (live.js lays weapons down with x -PI/2) it rests flat on the spine side.
// The steel and fittings are one material and the silk the other: 2 draws. The steel stays
// metalness >= .75, so weapon-magic sheathes it.
export const KATANA_NAME=/\bkatana\b|(?<!long )\bsamurai sword\b/;
export const KATANA_TIP=.86;
const TSUBA_Y=.066,BLADE_Y=.078,GRIP_LO=-.19,GRIP_HI=.052,SORI=.03,KISSAKI=.9;
const STEEL=0x23272e,SHINOGI=0x15171b,HAMON=0xc4ced4,EDGE=0xe8eef2,IRON=0x2a2725,COPPER=0x9a5a32,GILT=0xb28a3c,
 SILK=0x4a0d12,SILK_HI=0x7a1c22,SAME=0x141213,BONE=0xd8ccb0;

const hash=i=>{const v=Math.sin(i*127.1+31.7)*43758.5453;return v-Math.floor(v);};
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
// The blade's centre line bends back toward -z as it rises (sori), most toward the point.
const bend=u=>-SORI*u*u;

// Rings of `n` vertices up a list of stations, joined into quads; open at both ends.
function lattice(stations,n){
 const pos=[],idx=[];
 for(const ring of stations)for(const p of ring)pos.push(...p);
 for(let i=0;i<stations.length-1;i++)for(let k=0;k<n;k++){const a=i*n+k,b=i*n+(k+1)%n,c=a+n,d=b+n;idx.push(a,c,b,b,c,d);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);return geo;
}

export function buildKatana(g){
 const steel=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.8,roughness:.28});
 const silk=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.9});
 g.userData.extraMaterial=[steel,silk];
 const sets=new Map([[steel,[]],[silk,[]]]),c=new THREE.Color();
 const put=(geo,m,tone,flat=true)=>{if(geo.attributes.uv)geo.deleteAttribute('uv');
  if(flat){if(geo.index)geo=geo.toNonIndexed();geo.deleteAttribute('normal');geo.computeVertexNormals();}
  else{geo.computeVertexNormals();if(geo.index)geo=geo.toNonIndexed();}
  const p=geo.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c,i);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));sets.get(m).push(geo);};
 const flat=hex=>(x,y,z,col)=>col.set(hex).multiplyScalar(.85+.3*hash(Math.floor(x*900)*7+Math.floor(y*900)+Math.floor(z*900)*13));

 // The blade. Each station is a shinogi-zukuri section across z (edge at +z): the edge, four
 // points up each flat (ji) to the ridge (shinogi), the groove between ridge and spine, and the
 // peaked spine. In the kissaki the edge sweeps up to meet the spine at the point.
 {const N=96,stations=[],fr=[.12,.3,.48,.63];
  for(let i=0;i<=N;i++){
   const u=i/N,y=BLADE_Y+(KATANA_TIP-BLADE_Y)*u,zc=bend(u);
   const v=Math.max(0,(u-KISSAKI)/(1-KISSAKI));
   const w=.036-.01*u,t=(.0085-.003*u)*(1-.75*v**1.5)+.0003*(1-v);
   const spine=zc-w/2+w*.3*v*v,edge=i===N?spine:spine+w*Math.sqrt(Math.max(0,1-v*v));
   const z=f=>edge+(spine-edge)*f;// f: 0 at the edge, 1 at the spine
   const ridgeF=.7,ring=[[0,y,edge]];// fr stays below ridgeF so the flat never folds back past the ridge
   // up the +x flat to the ridge, a slight convex swell (niku) in the middle
   for(const f of fr)ring.push([t/2*(f/ridgeF)*(1+.18*Math.sin(f/ridgeF*Math.PI)),y,z(f)]);
   ring.push([t/2,y,z(ridgeF)],[t*.3,y,z(.83)],[t*.36,y,z(.95)],[0,y,z(1)+(i===N?0:-.0022*(1-v))],[-t*.36,y,z(.95)],[-t*.3,y,z(.83)],[-t/2,y,z(ridgeF)]);
   for(const f of [...fr].reverse())ring.push([-t/2*(f/ridgeF)*(1+.18*Math.sin(f/ridgeF*Math.PI)),y,z(f)]);
   // Wound edge -> -x flat -> spine -> +x flat, so with the stations rising up +y each face looks outward.
   stations.push([ring[0],...ring.slice(1).reverse()]);
  }
  const n=stations[0].length;
  put(lattice(stations,n),steel,(x,y,z,col)=>{
   const u=(y-BLADE_Y)/(KATANA_TIP-BLADE_Y),v=Math.max(0,(u-KISSAKI)/(1-KISSAKI)),zc=bend(u),w=.036-.01*u;
   const spine=zc-w/2+w*.3*v*v,edge=spine+w*Math.sqrt(Math.max(0,1-v*v));
   const f=edge===spine?1:(edge-z)/(edge-spine);
   // The hamon: a wavy notare line a third of the way up the flat, from the habaki to the point.
   const line=.3+.07*Math.sin(u*44)+.04*Math.sin(u*113+1.3)+.03*hash(Math.floor(u*60));
   col.set(STEEL).multiplyScalar(.9+.2*hash(Math.floor(u*300)));
   if(f>.68)col.set(SHINOGI);// the ridge flat and spine, darker
   if(f>.76&&f<.9)col.multiplyScalar(.45);// the groove
   col.lerp(new THREE.Color(HAMON),1-smooth(line-.05,line+.03,f));
   col.lerp(new THREE.Color(EDGE),1-smooth(0,.06,f));
   col.lerp(new THREE.Color(EDGE),.8*(1-smooth(0,.012,Math.abs(u-KISSAKI)))*(f<.72?1:0));// the yokote
   if(u<.035)col.lerp(new THREE.Color(0x5b6166),.4);// scoured near the habaki
  });}

 // The habaki: a copper wedge collar round the base of the blade.
 put(new THREE.CylinderGeometry(.0105,.012,.024,8).scale(1,1,2.15).translate(0,BLADE_Y+.003,bend(0)+.001),steel,(x,y,z,col)=>{
  col.set(COPPER).multiplyScalar(.8+.4*hash(Math.floor(y*900)+Math.floor(z*500)));if(y>BLADE_Y+.01)col.lerp(new THREE.Color(0xd99a66),.4);});
 // Gilt washers (seppa) either side of the tsuba.
 for(const y of [TSUBA_Y+.0065,TSUBA_Y-.0065])
  put(new THREE.CylinderGeometry(.015,.015,.003,12).scale(1,1,1.7).translate(0,y,0),steel,flat(GILT));

 // The tsuba: a four-lobed iron plate pierced with two crescent moons, edged with a raised rim.
 {const R=.042,shape=new THREE.Shape(),lobe=a=>R*(.86+.14*Math.abs(Math.cos(2*a))**.6);
  for(let i=0;i<=64;i++){const a=i/64*Math.PI*2,r=lobe(a);i?shape.lineTo(r*Math.cos(a),r*Math.sin(a)):shape.moveTo(r,0);}
  for(const s of [-1,1]){const hole=new THREE.Path(),cx=s*.024,pts=[];
   // A crescent: an outer arc, then a smaller offset arc back; it bellies outward, horns toward the blade.
   for(let i=0;i<=12;i++){const a=(-.62+1.24*i/12)*Math.PI;pts.push([cx+s*.0095*Math.cos(a),.0095*Math.sin(a)]);}
   for(let i=12;i>=0;i--){const a=(-.5+i/12)*Math.PI;pts.push([cx+s*(.0075*Math.cos(a)-.004),.0078*Math.sin(a)]);}
   if(s>0)pts.reverse();
   pts.forEach(([x,y],i)=>i?hole.lineTo(x,y):hole.moveTo(x,y));shape.holes.push(hole);}
  const plate=new THREE.ExtrudeGeometry(shape,{depth:.006,bevelEnabled:true,bevelThickness:.0012,bevelSize:.0012,bevelSegments:1,curveSegments:8});
  plate.translate(0,0,-.003).rotateX(-Math.PI/2).translate(0,TSUBA_Y,0);
  put(plate,steel,(x,y,z,col)=>{const r=Math.hypot(x,z);
   col.set(IRON).multiplyScalar(.75+.5*hash(Math.floor(x*700)*5+Math.floor(z*700)));
   if(r>.034)col.lerp(new THREE.Color(0x6a625a),.5);});}// the rim rubbed bright

 // The hilt: an oval core, ray skin under oxblood silk crossing in diamonds on the flat sides.
 {const N=60,ring=24,K=118,stations=[];
  const wrap=(a,y)=>{const p1=Math.cos(a+y*K),p2=Math.cos(-a+y*K);return Math.max(smooth(.25,.6,p1),smooth(.25,.6,p2));};
  for(let i=0;i<=N;i++){const y=GRIP_LO+.012+(GRIP_HI-GRIP_LO-.026)*i/N,u=i/N,pts=[];
   const r=.0125+.0018*Math.sin(u*Math.PI)-.001*u;// a slight waist toward the tsuba
   for(let k=0;k<ring;k++){const a=k/ring*Math.PI*2,rr=r+.0018*wrap(a,y);pts.push([Math.cos(a)*rr*.78,y,Math.sin(a)*rr]);}
   stations.push(pts);}
  put(lattice(stations,ring),silk,(x,y,z,col)=>{const a=Math.atan2(z,x/.78),cord=wrap(a,y);
   col.set(SAME).lerp(new THREE.Color(.16,.15,.14),hash(Math.floor(a*40)+Math.floor(y*900)*3)*.6);// ray-skin nodules
   col.lerp(new THREE.Color(SILK).lerp(new THREE.Color(SILK_HI),smooth(.75,1,cord)*.8),smooth(.15,.5,cord));},false);
  // The mekugi: a bone peg through the hilt just below the fuchi.
  put(new THREE.CylinderGeometry(.0028,.0028,.028,6).rotateZ(Math.PI/2).translate(0,.02,0),silk,flat(BONE));}
 // Gilt menuki under the wrap on each flat: a coiled, clawed little dragon reduced to a knot.
 for(const s of [-1,1]){const m=new THREE.TorusKnotGeometry(.0048,.0016,24,4,2,3).scale(.55,1,1).rotateY(Math.PI/2).translate(s*.0118,s>0?-.055:-.075,0);
  put(m,steel,(x,y,z,col)=>col.set(GILT).multiplyScalar(.8+.35*hash(Math.floor(y*2000))));}
 // The fuchi collar under the tsuba and the domed kashira cap on the pommel, blackened iron.
 put(new THREE.CylinderGeometry(.0148,.0142,.014,16).scale(.8,1,1).translate(0,GRIP_HI-.002,0),steel,flat(IRON));
 {const cap=new THREE.SphereGeometry(.0145,16,8,0,Math.PI*2,Math.PI/2,Math.PI/2).scale(.8,.9,1).translate(0,GRIP_LO+.012,0);
  put(cap,steel,flat(IRON));
  put(new THREE.CylinderGeometry(.0145,.0145,.006,16).scale(.8,1,1).translate(0,GRIP_LO+.015,0),steel,flat(IRON));
  // The kashira's cord loop (shitodome), a small gilt eye on each side.
  for(const s of [-1,1])put(new THREE.TorusGeometry(.0028,.001,4,8).rotateY(Math.PI/2).translate(s*.0118,GRIP_LO+.006,0),steel,flat(GILT));}

 for(const [m,list] of sets){const merged=mergeGeometries(list);list.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=m===steel?'blade':'grip';g.add(mesh);}
 g.userData.katana={kind:'katana'};
}
