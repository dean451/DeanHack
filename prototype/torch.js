import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A torch set in a forged iron sconce on top of a wall block. A riveted footplate is
// fixed to the wall top, a twisted square stem rises to a collar, and a basket of
// flared prongs held by a ring cradles the torch. The torch is a knotty, tapered
// handle with a head of pitch-soaked rag bands and pitch runs down the shaft, charred
// on top where the flame sits. The seed sets the twist, how the prongs are turned and
// splayed, the rag bands' tilt and where the pitch runs. Weathering is baked into
// vertex colours: grain and knots on the handle, glossy black pitch, a charred crown,
// rust on the plate and soot and faint heat colours on the basket. Coordinates are in
// the wall tile's frame (the wall top is at y=0.63); the flame goes at TORCH_FLAME_Y.
// Static parts merge into one mesh per material (`userData.part` is wood or iron).
export const WALL_TOP=.63,TORCH_FLAME_Y=.96;
export function createTorchSconce(seed=0){
 const g=new THREE.Group();g.name='Torch sconce';
 const materials=[],geometries=[];
 const mat=(o)=>{const m=new THREE.MeshStandardMaterial(o);materials.push(m);return m;};
 const wood=mat({vertexColors:true,roughness:.78});
 const iron=mat({vertexColors:true,metalness:.62,roughness:.5});
 const parts={wood,iron};
 const bins=new Map(Object.values(parts).map(m=>[m,[]]));
 const rand=(i)=>{const s=Math.sin(seed*12.9898+i*78.233)*43758.5453;return s-Math.floor(s);};
 const off=rand(99)*50;
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s=new THREE.Vector3();
 const place=(geo,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>geo.applyMatrix4(m4.compose(v.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s.set(sx,sy,sz)));
 const put=(geo,m,kind,tint=1)=>{geo.userData.kind=kind;geo.userData.tint=tint;bins.get(m).push(geo);return geo;};
 const roughen=(geo,amt,f=31)=>{
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   p.setXYZ(i,x+(noise3(x*f+off,y*f,z*f)-.5)*amt*2,y+(noise3(y*f+7,z*f,x*f+off)-.5)*amt*2,z+(noise3(z*f+3+off,x*f,y*f)-.5)*amt*2);
  }
  geo.computeVertexNormals();
  return geo;
 };
 const Y0=WALL_TOP;

 // Footplate: a square iron plate on the wall top, turned a little, with a rivet at
 // each corner.
 const spin=(rand(1)-.5)*.5;
 put(roughen(place(new RoundedBoxGeometry(.16,.014,.16,2,.005),0,Y0+.007,0,0,spin,0),.0015,40),iron,'plate');
 for(let i=0;i<4;i++){
  const a=spin+Math.PI/4+i*Math.PI/2,r=.078;
  put(place(new THREE.SphereGeometry(.011,8,4,0,Math.PI*2,0,Math.PI/2),Math.sin(a)*r,Y0+.014,Math.cos(a)*r,0,0,0,1,.7,1),iron,'plate');
 }

 // Stem: a square bar twisted along its length, flared into the plate, up to a collar.
 const STEM_TOP=Y0+.11,stemH=STEM_TOP-(Y0+.012),twist=(1.6+rand(2)*1.2)*(rand(3)<.5?-1:1);
 {
  const geo=new THREE.BoxGeometry(.024,stemH,.024,1,12,1);
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),u=y/stemH+.5,a=u*twist+spin,flare=1+Math.max(0,.25-u)*2.2;
   p.setXYZ(i,(x*Math.cos(a)-z*Math.sin(a))*flare,y,(x*Math.sin(a)+z*Math.cos(a))*flare);
  }
  geo.computeVertexNormals();
  put(place(geo,0,Y0+.012+stemH/2,0),iron,'stem');
 }
 put(place(new THREE.CylinderGeometry(.04,.034,.024,14),0,STEM_TOP,0),iron,'stem');
 put(place(new THREE.TorusGeometry(.037,.006,6,18),0,STEM_TOP+.013,0,Math.PI/2),iron,'stem');

 // Basket: five or six prongs splay from the collar, pass through a ring and curl
 // outward at the tips.
 const prongs=5+Math.floor(rand(4)*2),RING_Y=Y0+.265,RING_R=.074;
 for(let i=0;i<prongs;i++){
  const a=spin+i/prongs*Math.PI*2+(rand(10+i)-.5)*.2,splay=1+(rand(20+i)-.5)*.18,tipY=Y0+.3+rand(30+i)*.018;
  const pts=[[.034,STEM_TOP+.012],[.046,Y0+.19],[RING_R*splay,RING_Y],[.088*splay,tipY-.01],[.1*splay,tipY]]
   .map(([r,y])=>new THREE.Vector3(Math.sin(a)*r,y,Math.cos(a)*r));
  put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),10,.0055,5,false),iron,'basket');
  put(place(new THREE.SphereGeometry(.0075,6,4),pts[4].x,pts[4].y,pts[4].z),iron,'basket');
 }
 put(roughen(place(new THREE.TorusGeometry(RING_R,.0065,6,28),0,RING_Y,0,Math.PI/2),.001,50),iron,'basket');

 // Torch: a tapered, slightly leaning handle seated in the collar, knotty and roughened.
 const H0=STEM_TOP-.005,HEAD=Y0+.23,TOP=TORCH_FLAME_Y-.012,lean=(rand(5)-.5)*.06,leanDir=rand(6)*Math.PI*2;
 {
  const h=HEAD+.02-H0,geo=new THREE.CylinderGeometry(.03,.024,h,10,8);
  put(roughen(place(geo,0,H0+h/2,0),.0022,45),wood,'handle',.9+rand(7)*.2);
 }
 // Head: three or four rag bands wound unevenly around it, a pitch core and a charred
 // crown under the flame.
 const bands=3+Math.floor(rand(8)*2);
 for(let i=0;i<bands;i++){
  const y=HEAD+.012+i*(TOP-HEAD-.03)/(bands-1),r=.037+rand(40+i)*.008;
  const geo=new THREE.TorusGeometry(r,.014+rand(50+i)*.004,6,16);
  put(roughen(place(geo,0,y,0,Math.PI/2+(rand(60+i)-.5)*.35,0,(rand(70+i)-.5)*.35),.003,60),wood,'rag',.85+rand(80+i)*.3);
 }
 put(roughen(place(new THREE.CylinderGeometry(.036,.032,TOP-HEAD,12,4),0,(TOP+HEAD)/2,0),.003,55),wood,'rag');
 put(roughen(place(new THREE.SphereGeometry(.04,12,6,0,Math.PI*2,0,Math.PI/2),0,TOP-.004,0,0,0,0,1,.55,1),.004,50),wood,'crown');
 // Pitch runs: two or three drips down the handle from the lowest band.
 const runs=2+Math.floor(rand(9)*2);
 for(let i=0;i<runs;i++){
  const a=rand(90+i)*Math.PI*2,len=.03+rand(100+i)*.05,r=.028;
  put(place(new THREE.CapsuleGeometry(.0065,len,3,6),Math.sin(a)*r,HEAD-len/2+.004,Math.cos(a)*r),wood,'pitch');
 }

 // Bake: strip to position and normal, paint vertex colours, merge one mesh per material.
 const tilt=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.cos(leanDir)*lean,0,Math.sin(leanDir)*lean));
 const pivot=new THREE.Matrix4().makeTranslation(0,H0,0),back=new THREE.Matrix4().makeTranslation(0,-H0,0);
 const leanMatrix=pivot.multiply(tilt).multiply(back);
 const n=new THREE.Vector3();
 const ctx={off,Y0,H0,HEAD,TOP,RING_Y};
 const painters={wood:woodColour,iron:ironColour};
 for(const [material,list] of bins){
  const part=Object.keys(parts).find(key=>parts[key]===material),paint=painters[part];
  const flats=list.map(geo=>{
   const {tint,kind}=geo.userData;
   const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
   for(const key of Object.keys(flat.attributes))if(!['position','normal'].includes(key))flat.deleteAttribute(key);
   const p=flat.attributes.position,nor=flat.attributes.normal,col=new Float32Array(p.count*3);
   for(let i=0;i<p.count;i++){n.fromBufferAttribute(nor,i);const c=paint(p.getX(i),p.getY(i),p.getZ(i),n,kind,ctx);col[i*3]=c[0]*tint;col[i*3+1]=c[1]*tint;col[i*3+2]=c[2]*tint;}
   flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   if(part==='wood')flat.applyMatrix4(leanMatrix);
   return flat;
  });
  const geo=mergeGeometries(flats);flats.forEach(f=>f.dispose());geometries.push(geo);
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.userData.part=part;
  g.add(mesh);
 }
 // Where the flame sits once the torch leans.
 g.userData.flame=new THREE.Vector3(0,TORCH_FLAME_Y,0).applyMatrix4(leanMatrix);
 g.userData.prongs=prongs;
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}

// Handle: pale ash with long grain and a knot or two, darker and greasy near the head.
// Rags: near-black pitch with a brown fibre showing through. Crown: charred black with
// grey ash flecks. Pitch runs: glossy black.
function woodColour(x,y,z,n,kind,c){
 const {off,HEAD,TOP}=c;
 if(kind==='handle'){
  const a=Math.atan2(x,z);
  const grain=noise3(Math.cos(a)*6+off,y*4,Math.sin(a)*6)*.6+noise3(Math.cos(a)*18,y*12+off,Math.sin(a)*18)*.4;
  let k=.72+grain*.45;
  const knot=noise3(Math.cos(a)*3+off,y*14,Math.sin(a)*3);if(knot>.78)k*=1-(knot-.78)*3;
  let r=.34*k,g=.23*k,b=.13*k;
  const greasy=Math.min(1,Math.max(0,1-(HEAD-y)/.06));if(greasy>0){const t=greasy*.7;r*=1-t;g*=1-t*1.05;b*=1-t*1.1;}
  return [r,g,b];
 }
 if(kind==='rag'){
  const fibre=noise3(x*90+off,y*90,z*90);
  const k=.8+fibre*.4,brown=Math.max(0,fibre-.6)*1.2;
  let r=(.05+brown*.12)*k,g=(.04+brown*.07)*k,b=(.03+brown*.03)*k;
  const scorch=Math.max(0,(y-(TOP-.03))/.03);if(scorch>0){r*=1-scorch*.6;g*=1-scorch*.65;b*=1-scorch*.65;}
  return [r,g,b];
 }
 if(kind==='crown'){
  const fleck=noise3(x*120+off,y*120,z*120);
  if(fleck>.72)return [.2,.19,.18];
  if(fleck<.12&&n.y>.5)return [.22,.07,.02];
  return [.025,.022,.02];
 }
 return [.022,.018,.014];
}

// Forged iron: near-black with a hammered mottle. The plate rusts where rain and pitch
// sit on the wall top; the basket is sooted and takes faint straw and blue temper
// colours near the flame.
function ironColour(x,y,z,n,kind,c){
 const {off,Y0,RING_Y}=c;
 const k=.85+noise3(x*40+off,y*40,z*40)*.3;
 let r=.034*k,g=.036*k,b=.04*k;
 const patch=noise3(x*26+off,y*26,z*26+5)*.75+noise3(x*80,y*80+off,z*80)*.25;
 const low=Math.max(0,1-(y-Y0)/.08);
 const rust=Math.min(1,Math.max(0,(patch+low*.25-.6)*3));
 if(rust>0){r+=(.2-r)*rust;g+=(.08-g)*rust;b+=(.028-b)*rust;}
 if(kind==='basket'){
  const heat=Math.max(0,Math.min(1,(y-(RING_Y-.05))/.08));
  const band=noise3(x*30+off,y*60,z*30);
  if(heat>0&&band>.55){const t=heat*(band-.55)*1.6;const blue=y>RING_Y+.015;r+=((blue?.05:.16)-r)*t;g+=((blue?.07:.12)-g)*t;b+=((blue?.14:.05)-b)*t;}
  const soot=heat*.5;r*=1-soot;g*=1-soot;b*=1-soot;
 }
 if(n.y<-.5){r*=.6;g*=.6;b*=.6;}
 return [r,g,b];
}

function hash3(x,y,z){const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s);}
function noise3(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
 const fx=x-ix,fy=y-iy,fz=z-iz,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy),uz=fz*fz*(3-2*fz);
 const l=(a,b,t)=>a+(b-a)*t;
 const c=(dx,dy,dz)=>hash3(ix+dx,iy+dy,iz+dz);
 return l(l(l(c(0,0,0),c(1,0,0),ux),l(c(0,1,0),c(1,1,0),ux),uy),l(l(c(0,0,1),c(1,0,1),ux),l(c(0,1,1),c(1,1,1),ux),uy),uz);
}
