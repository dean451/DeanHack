import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The shuriken: a six-pointed throwing star of blackened, hammer-scaled iron. Each point is
// raked like a claw: a straight leading edge and a hollow trailing edge with a barb filed
// into it, so the star looks as if it is already spinning. Its edges are honed bright, and the
// bright bevel fades into the black faces. The tips are stained rust-red. The pierced centre
// is ringed by a raised collar on both faces.
// Held-weapon space (equipment.js): the hand at the origin, the star standing in the xy
// plane just above it (held by its lower point), flat in z, so on the floor (live.js lays
// weapons down with x -PI/2) it lies flat. One vertex-coloured material: 1 draw, metalness
// >= .75 so weapon-magic sheathes it.
const POINTS=6,TIP=.082,ROOT=.03,HOLE=.011,DEPTH=.004,BEVEL_T=.0022,BEVEL_S=.0032;
export const SHURIKEN_CENTER=.09;
const FACE=0x1b1a19,SCALE=0x2c2a27,EDGE=0xc9d2d4,STAIN=0x5a1a10,COLLAR=0x3a3833;

export function buildShuriken(g){
 const iron=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.8,roughness:.42});
 g.userData.extraMaterial=iron;
 const hash=i=>{const v=Math.sin(i*127.1+31.7)*43758.5453;return v-Math.floor(v);};
 const polar=(a,r)=>new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r);
 const step=Math.PI*2/POINTS;
 const shape=new THREE.Shape();
 for(let k=0;k<POINTS;k++){
  const a=k*step+Math.PI/2,len=TIP*(1-.06*hash(k+5));// one point straight up; lengths uneven
  const root=polar(a-step*.5,ROOT),tip=polar(a+.2,len);
  const barb=polar(a+.06,len*.62),notch=polar(a+.24,len*.5);
  const next=polar(a+step*.5,ROOT),hollow=polar(a+step*.42,ROOT*1.5);
  if(k===0)shape.moveTo(root.x,root.y);
  shape.lineTo(tip.x,tip.y);// the straight leading edge
  shape.lineTo(barb.x,barb.y);shape.lineTo(notch.x,notch.y);// the barb filed into the back
  shape.quadraticCurveTo(hollow.x,hollow.y,next.x,next.y);// the hollow trailing edge
 }
 const hole=new THREE.Path();hole.absarc(0,0,HOLE,0,Math.PI*2,true);shape.holes.push(hole);
 const star=new THREE.ExtrudeGeometry(shape,{depth:DEPTH,bevelEnabled:true,bevelThickness:BEVEL_T,bevelSize:BEVEL_S,bevelOffset:-BEVEL_S*.5,bevelSegments:1,steps:1,curveSegments:6});
 star.translate(0,0,-DEPTH/2);
 const collar=new THREE.TorusGeometry(HOLE+.006,.0028,5,18);
 const parts=[star,collar.clone().translate(0,0,DEPTH/2+BEVEL_T*.6),collar.translate(0,0,-DEPTH/2-BEVEL_T*.6)];
 const zFace=DEPTH/2+BEVEL_T,c=new THREE.Color(),edge=new THREE.Color(EDGE),stain=new THREE.Color(STAIN),scale=new THREE.Color(SCALE);
 const geos=parts.map((geo,i)=>{geo.deleteAttribute('uv');if(geo.index)geo=geo.toNonIndexed();
  const p=geo.attributes.position,cols=[];
  for(let v=0;v<p.count;v++){const x=p.getX(v),y=p.getY(v),z=p.getZ(v),r=Math.hypot(x,y);
   if(i>0)c.set(COLLAR);
   else{
    // hammer scale: blotches of rough grey on the black
    c.set(FACE).lerp(scale,Math.max(0,Math.sin(x*310+Math.sin(y*170)*2)*Math.sin(y*290+x*90))*.9);
    // the honed edge: bright off the faces, fading in across the bevel
    c.lerp(edge,Math.min(1,Math.max(0,(zFace-Math.abs(z))/BEVEL_T))*.85);
    // stained toward the tips
    c.lerp(stain,Math.min(.75,Math.max(0,(r-TIP*.55)/(TIP*.45))*.75));
   }
   cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));return geo;});
 const merged=mergeGeometries(geos);geos.forEach(x=>x.dispose());parts.forEach(x=>x.dispose());
 merged.translate(0,SHURIKEN_CENTER,0);
 const mesh=new THREE.Mesh(merged,iron);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part='star';g.add(mesh);
}
