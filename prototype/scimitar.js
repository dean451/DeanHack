import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The scimitar ("curved sword" unidentified): a deep-bellied sabre of blackened watered steel. It
// sweeps forward off the hilt and hooks back toward the point, flaring in its last third into a
// yelman: the spine steps out in a hard shoulder and runs to the point as a second, false edge. A
// narrow fuller, clotted with old dried blood, runs up the spine side of the lower blade; the edge is honed bright and bitten with
// a few old notches. A pointed iron langet clasps the blade above a short cross whose quillons
// droop toward the hand and end in hooked claws. The one-handed grip is black horn bound with
// twisted brass wire, and it ends in an iron raptor's-beak pommel hooked toward the edge, with a
// garnet eye on each side.
// Held-weapon space (equipment.js): the hand at the origin, the point up +y, the edge toward +z and
// everything close to the y axis, so laid on the floor (live.js lays weapons down with x -PI/2) it
// rests on the spine side: nothing reaches below z -.065.
// The steel and fittings are one material and the horn grip the other: 2 draws. The steel stays
// metalness >= .75, so weapon-magic sheathes it.
export const SCIMITAR_NAME=/\bscimitar\b|\bcurved sword\b/;
export const SCIMITAR_TIP=.84;
const BLADE_Y=.07,GUARD_Y=.056,GRIP_LO=-.115,GRIP_HI=.044,YELMAN=.68,POINT=.86;
const DARK=0x1b1d21,WATER=0x5d646b,EDGE=0xdfe6ea,IRON=0x26231f,GILT=0xa98236,HORN=0x17110e,HORN_HI=0x3a2a1f,
 BRASS=0xb48a40,GARNET=0x6e0a10,BLOOD=0x3a0906;

const hash=i=>{const v=Math.sin(i*127.1+31.7)*43758.5453;return v-Math.floor(v);};
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
// The blade's centre line: forward off the hilt, then hooking back past it toward the point.
const bend=u=>.16*u-.2*u*u;
// How far the edge and the spine sit from the centre line at u (0 at the guard, 1 at the point).
function profile(u){
 const v=Math.max(0,(u-POINT)/(1-POINT));
 const edge=(.0165+.006*smooth(.35,.8,u))*Math.sqrt(Math.max(0,1-v*v));
 // the yelman: the spine steps out in a shoulder, then tapers as a false edge to the point
 const spine=.0125+.0085*smooth(YELMAN,YELMAN+.035,u)-.021*smooth(YELMAN+.035,1,u)**1.15;
 return {edge:u>=1?0:edge,spine:u>=1?0:Math.max(0,spine),v};
}
// A few old notches bitten into the edge.
const NOTCHES=[[.22,.004],[.41,.0055],[.57,.0035],[.74,.005]];
const notch=u=>NOTCHES.reduce((d,[at,depth])=>d+depth*Math.max(0,1-Math.abs(u-at)/.012),0);

// Rings of `n` vertices up a list of stations, joined into quads; open at both ends.
function lattice(stations,n){
 const pos=[],idx=[];
 for(const ring of stations)for(const p of ring)pos.push(...p);
 for(let i=0;i<stations.length-1;i++)for(let k=0;k<n;k++){const a=i*n+k,b=i*n+(k+1)%n,c=a+n,d=b+n;idx.push(a,c,b,b,c,d);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);return geo;
}
// A tapering tube along a curve in the y-z plane: `at(u)` gives [y,z], `radius(u)` its radius.
function sweep(at,radius,steps,ring,squash=1){
 const stations=[];
 for(let i=0;i<=steps;i++){const u=i/steps,[y,z]=at(u),[y0,z0]=at(Math.max(0,u-.01)),[y1,z1]=at(Math.min(1,u+.01));
  const ty=y1-y0,tz=z1-z0,l=Math.hypot(ty,tz)||1,ny=-tz/l,nz=ty/l,r=radius(u),pts=[];
  for(let k=0;k<ring;k++){const a=k/ring*Math.PI*2,c=Math.cos(a)*r,s=Math.sin(a)*r;pts.push([-s*squash,y+c*ny,z+c*nz]);}
  stations.push(pts);}
 return lattice(stations,ring);
}

export function buildScimitar(g){
 const steel=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.8,roughness:.3});
 const horn=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.15,roughness:.6});
 g.userData.extraMaterial=[steel,horn];
 const sets=new Map([[steel,[]],[horn,[]]]),c=new THREE.Color();
 const put=(geo,m,tone,flat=true)=>{if(geo.attributes.uv)geo.deleteAttribute('uv');
  if(flat){if(geo.index)geo=geo.toNonIndexed();geo.deleteAttribute('normal');geo.computeVertexNormals();}
  else{geo.computeVertexNormals();if(geo.index)geo=geo.toNonIndexed();}
  const p=geo.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c,i);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));sets.get(m).push(geo);};
 const flat=hex=>(x,y,z,col)=>col.set(hex).multiplyScalar(.85+.3*hash(Math.floor(x*900)*7+Math.floor(y*900)+Math.floor(z*900)*13));

 // The blade. Each station is a section across z (edge at +z): the edge, three points up each
 // flat to the thickest line, the fuller's lip, and the spine's two corners, which close to a
 // false edge on the yelman. f runs 0 at the edge to 1 at the spine.
 {const N=110,stations=[];
  for(let i=0;i<=N;i++){
   const u=i/N,y=BLADE_Y+(SCIMITAR_TIP-BLADE_Y)*u,zc=bend(u),{edge,spine}=profile(u);
   const ze=zc+Math.max(0,edge-notch(u)),zs=zc-spine,z=f=>ze+(zs-ze)*f;
   const t=(.0078-.0042*u)*(i===N?0:1),yel=smooth(YELMAN,YELMAN+.05,u),fuller=1-smooth(.5,.6,u);
   const sp=t/2*(.85-.8*yel),lip=t/2*(.95-.25*fuller);
   const half=s=>[[s*t*.2,y,z(.18)],[s*t*.38,y,z(.42)],[s*t/2,y,z(.66)],[s*lip,y,z(.84)],[s*sp,y,z(1)]];
   stations.push([[0,y,ze],...half(-1),...half(1).reverse()]);
  }
  put(lattice(stations,stations[0].length),steel,(x,y,z,col)=>{
   const u=(y-BLADE_Y)/(SCIMITAR_TIP-BLADE_Y),zc=bend(u),{edge,spine}=profile(u);
   const ze=zc+edge,zs=zc-spine,f=ze===zs?1:(ze-z)/(ze-zs);
   // Watered steel: dark, with pale wavering bands drifting up the flat.
   const band=Math.sin(u*150+9*Math.sin(u*21+f*5.5)+6*f+2.4*hash(Math.floor(u*40)));
   col.set(DARK).lerp(new THREE.Color(WATER),.55*smooth(.35,1,band)).multiplyScalar(.9+.2*hash(Math.floor(u*300)));
   if(f>.76&&f<.94&&u<.58){col.multiplyScalar(.45);// the fuller, its groove clotted with old blood
    col.lerp(new THREE.Color(BLOOD),.75*smooth(.35,.75,hash(Math.floor(u*55)+3)+.35*(1-u)));}
   col.lerp(new THREE.Color(EDGE),1-smooth(0,.09,f));// the honed edge
   const yel=smooth(YELMAN+.02,YELMAN+.06,u);
   col.lerp(new THREE.Color(EDGE),yel*smooth(.9,.99,f));// the false edge
   if(notch(u)>.001&&f<.12)col.lerp(new THREE.Color(0x4a3b33),.6);// rust in the notches
  });}

 // The langet: a pointed iron tongue clasping each flat of the blade above the guard.
 {const shape=new THREE.Shape(),z0=bend(0);
  shape.moveTo(z0-.012,0);shape.lineTo(z0+.014,0);shape.lineTo(z0+bend(.07)-bend(0)+.001,.05);shape.closePath();
  for(const s of [-1,1]){const geo=new THREE.ExtrudeGeometry(shape,{depth:.0016,bevelEnabled:false});
   geo.rotateY(-Math.PI/2).translate(s>0?.0058:-.0042,GUARD_Y+.004,0);put(geo,steel,flat(IRON));}}
 // The guard's centre block, gilt-banded, and the drooping quillons ending in hooked claws.
 put(new THREE.BoxGeometry(.016,.028,.032).translate(0,GUARD_Y+.003,.001),steel,(x,y,z,col)=>{
  col.set(IRON).multiplyScalar(.8+.4*hash(Math.floor(x*800)+Math.floor(z*800)*3));if(y<GUARD_Y-.005)col.set(GILT);});
 for(const s of [-1,1]){
  const at=u=>{const a=u*Math.PI*.75;return [GUARD_Y-.034*(1-Math.cos(a))-.004*u,s*(.012+.044*Math.sin(a)-.006*u*u)];};
  put(sweep(at,u=>.0058*(1-.62*u),14,8,1.15),steel,(x,y,z,col)=>{col.set(IRON).multiplyScalar(.8+.4*hash(Math.floor(y*900)*3+Math.floor(z*900)));
   if(Math.abs(z)<.016)col.lerp(new THREE.Color(GILT),.7);});
  // the claw, curling back in toward the grip
  const [cy,cz]=at(1);
  put(new THREE.ConeGeometry(.0026,.014,5).rotateX(s*.7*Math.PI).translate(0,cy-.004,cz-s*.004),steel,flat(0x3a352f));}

 // The grip: an oval black-horn core, swelling a little, bound top and bottom with twisted brass wire.
 {const N=48,ring=20,stations=[];
  const bound=y=>y>GRIP_HI-.03||y<GRIP_LO+.028;
  const wire=(a,y)=>bound(y)?smooth(.3,.8,Math.cos(a*2+y*520)):0;
  for(let i=0;i<=N;i++){const y=GRIP_LO+.008+(GRIP_HI-.006-GRIP_LO-.008)*i/N,u=i/N,pts=[];
   const r=.0118+.0022*Math.sin(u*Math.PI),zc=.004*Math.sin(u*Math.PI);
   for(let k=0;k<ring;k++){const a=k/ring*Math.PI*2,rr=r+(bound(y)?.0008+.0011*wire(a,y):0);pts.push([Math.cos(a)*rr*.74,y,zc+Math.sin(a)*rr]);}
   stations.push(pts);}
  put(lattice(stations,ring),horn,(x,y,z,col,i)=>{const a=Math.atan2(z,x/.74);
   if(bound(y)){col.set(BRASS).multiplyScalar(.55+.6*wire(a,y));return;}
   col.set(HORN).lerp(new THREE.Color(HORN_HI),.7*smooth(.55,1,hash(Math.floor(a*9)+7)*Math.abs(Math.sin(y*90+a*3))));},false);}
 // An iron ferrule under the guard.
 put(new THREE.CylinderGeometry(.0128,.0122,.01,16).scale(.76,1,1).translate(0,GRIP_HI-.002,0),steel,flat(IRON));

 // The pommel: a raptor's beak in blackened iron, hooked toward the edge, a gilt collar where it
 // meets the horn and a garnet eye set in each side.
 {const at=u=>[GRIP_LO+.012-.034*Math.sin(u*Math.PI*.55)+.006*u*u,.032*(1-Math.cos(u*Math.PI*.6))+.012*u*u];
  put(sweep(at,u=>.0125*(1-.8*u**1.3)+.0012*Math.sin(u*Math.PI),16,12,.82),steel,(x,y,z,col)=>{
   col.set(IRON).multiplyScalar(.75+.45*hash(Math.floor(y*900)*5+Math.floor(z*900)));
   if(y>GRIP_LO+.006)col.lerp(new THREE.Color(GILT),.85);});
  const [ey,ez]=at(.38);
  for(const s of [-1,1])put(new THREE.SphereGeometry(.0028,8,6).scale(.5,1,1.3).translate(s*.0088,ey+.002,ez+.002),steel,(x,y,z,col)=>{
   col.set(GARNET);if(y>ey+.003)col.lerp(new THREE.Color(0xe0303a),.6);});}

 for(const [m,list] of sets){const merged=mergeGeometries(list);list.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=m===steel?'blade':'grip';g.add(mesh);}
 g.userData.scimitar={kind:'scimitar'};
}
