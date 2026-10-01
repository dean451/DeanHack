import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// An open air tile (the Plane of Air): no floor, just sky far below. The sky is one
// unlit, flat colour so neighbouring air tiles join into a single sheet. Everything
// that drifts in it is one merged, unlit mesh with RGBA vertex colours, so each
// piece fades out at its own edges:
// - scraps of far-off cloud lying on the sky, soft all round;
// - a few lumpy wisps of vapour below floor height, lit on top and blue-grey beneath;
// - curved wind ribbons above the tile that taper and fade at both ends.
// Two draws a tile (`userData.part` is sky or drift). live.js hides the stone slab.
export const SKY_Y=-.42;
export const SKY_COLOR=0x6f9fd0;

export function createAir(seed=0){
 const g=new THREE.Group();g.name='Open air';
 const rand=(i)=>{const s=Math.sin(seed*12.9898+i*78.233)*43758.5453;return s-Math.floor(s);};
 const off=rand(99)*50;
 const EDGE=.495;
 const clampEdge=(v)=>THREE.MathUtils.clamp(v,-EDGE,EDGE);

 const skyMat=new THREE.MeshBasicMaterial({color:SKY_COLOR});
 const driftMat=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,side:THREE.DoubleSide});
 const pieces=[];
 // Each piece gives positions and an RGBA colour per vertex, as a non-indexed geometry.
 const paint=(geo,colour)=>{
  const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
  for(const key of Object.keys(flat.attributes))if(key!=='position')flat.deleteAttribute(key);
  const p=flat.attributes.position,col=new Float32Array(p.count*4);
  for(let i=0;i<p.count;i++){
   const c=colour(p.getX(i),p.getY(i),p.getZ(i),i);
   for(let k=0;k<4;k++)col[i*4+k]=THREE.MathUtils.clamp(c[k],0,1);
  }
  flat.setAttribute('color',new THREE.BufferAttribute(col,4));
  pieces.push(flat);
 };

 // Far cloud: flat, ragged scraps just above the sky, bright in the middle and
 // fading to nothing at a noisy rim.
 for(let i=0;i<4;i++){
  const cx=(rand(i+3)-.5)*.62,cz=(rand(i+6)-.5)*.62,r=.08+rand(i)*.1,sq=.45+rand(i+9)*.3,turn=rand(i+12)*Math.PI;
  const seg=20,rings=3,pos=[];
  const at=(ring,a)=>{
   const rim=1+(noise2(Math.cos(a)*2+off+i*7,Math.sin(a)*2)-.5)*.7;
   const t=ring/rings*rim,lx=Math.cos(a)*r*t,lz=Math.sin(a)*r*t*sq;
   return [clampEdge(cx+lx*Math.cos(turn)-lz*Math.sin(turn)),SKY_Y+.008+i*.002,clampEdge(cz+lx*Math.sin(turn)+lz*Math.cos(turn))];
  };
  for(let ring=0;ring<rings;ring++)for(let s=0;s<seg;s++){
   const a0=s/seg*Math.PI*2,a1=(s+1)/seg*Math.PI*2;
   const q=[at(ring,a0),at(ring,a1),at(ring+1,a1),at(ring+1,a0)];
   if(ring===0)pos.push(...q[0],...q[2],...q[3]);
   else pos.push(...q[0],...q[1],...q[2],...q[0],...q[2],...q[3]);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  paint(geo,(x,y,z)=>{
   const d=Math.min(1,Math.hypot(x-cx,z-cz)/(r*1.15));
   const grain=.92+noise2(x*30+off,z*30)*.12;
   const a=(1-d*d)*.55*grain;
   return [.86*grain,.92*grain,.98,a];
  });
 }

 // Wisps: lumpy, flattened puffs of vapour drifting below floor height, stretched
 // along one wind heading and shaded in the colour (unlit material).
 const heading=rand(40)*Math.PI*2;
 for(let i=0;i<4;i++){
  const r=.05+rand(i+20)*.06,x=(rand(i+24)-.5)*.6,y=-.3+rand(i+28)*.12,z=(rand(i+32)-.5)*.6;
  const along=1.6+rand(i+36)*.5;
  const geo=new THREE.SphereGeometry(1,12,8),p=geo.attributes.position;
  const ca=Math.cos(heading),sa=Math.sin(heading);
  for(let v=0;v<p.count;v++){
   const nx=p.getX(v),ny=p.getY(v),nz=p.getZ(v);
   const k=1+(noise3(nx*2.2+off+i*5,ny*2.2,nz*2.2)-.5)*.5*(ny<0?.4:1);
   const lx=nx*r*along*k,lz=nz*r*1.1*k;
   p.setXYZ(v,clampEdge(x+lx*ca-lz*sa),y+ny*r*.5*k,clampEdge(z+lx*sa+lz*ca));
  }
  paint(geo,(px,py,pz)=>{
   // How high up the puff this point sits stands in for its normal: tops are lit.
   const ny=THREE.MathUtils.clamp((py-y)/(r*.5),-1,1);
   const lit=.5+ny*.5,grain=.94+noise3(px*40+off,py*40,pz*40)*.08;
   const k=(.72+lit*.28)*grain;
   return [.84*k+lit*.06,.89*k+lit*.04,.97*k+lit*.02,.26+lit*.2];
  });
 }

 // Wind: three curved ribbons crossing the tile above head height. Each tapers to a
 // point and fades out at both ends, lying flat so it reads from the camera above.
 for(let i=0;i<3;i++){
  const r=.16+rand(i+41)*.14,arc=.9+rand(i+44)*.9,y=.12+rand(i+50)*.35;
  const cx=(rand(i+47)-.5)*.3,cz=(rand(i+53)-.5)*.3,start=heading+i*.4-arc/2;
  const tilt=(rand(i+56)-.5)*.3,width=.012+rand(i+59)*.008,seg=24,pos=[],us=[];
  const point=(t,side)=>{
   const a=start+t*arc,w=width*Math.sin(Math.PI*t)*side,rr=r+w;
   const px=cx+Math.cos(a)*rr,pz=cz+Math.sin(a)*rr;
   return [clampEdge(px),y+Math.sin(a-heading)*r*tilt,clampEdge(pz)];
  };
  for(let s=0;s<seg;s++){
   const t0=s/seg,t1=(s+1)/seg;
   const a=point(t0,-1),b=point(t1,-1),c=point(t1,1),d=point(t0,1);
   pos.push(...a,...b,...c,...a,...c,...d);us.push(t0,t1,t1,t0,t1,t0);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  paint(geo,(x,py,z,v)=>{
   const t=us[v],fade=Math.pow(Math.sin(Math.PI*t),1.5);
   return [1,1,1,.42*fade];
  });
 }

 const sky=new THREE.Mesh(new THREE.PlaneGeometry(1.001,1.001),skyMat);
 sky.rotation.x=-Math.PI/2;sky.position.y=SKY_Y;sky.userData.part='sky';
 const driftGeo=mergeGeometries(pieces);pieces.forEach(p=>p.dispose());
 const drift=new THREE.Mesh(driftGeo,driftMat);drift.userData.part='drift';drift.renderOrder=1;
 for(const m of [sky,drift]){m.castShadow=m.receiveShadow=false;g.add(m);}
 g.userData.hidesFloor=true;
 g.userData.dispose=()=>{sky.geometry.dispose();driftGeo.dispose();skyMat.dispose();driftMat.dispose();};
 return g;
}

function hash2(x,y){const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);}
function noise2(x,y){
 const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy);
 const l=(a,b,t)=>a+(b-a)*t;
 return l(l(hash2(ix,iy),hash2(ix+1,iy),ux),l(hash2(ix,iy+1),hash2(ix+1,iy+1),ux),uy);
}
function hash3(x,y,z){const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s);}
function noise3(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
 const fx=x-ix,fy=y-iy,fz=z-iz,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy),uz=fz*fz*(3-2*fz);
 const l=(a,b,t)=>a+(b-a)*t;
 const c=(dx,dy,dz)=>hash3(ix+dx,iy+dy,iz+dz);
 return l(l(l(c(0,0,0),c(1,0,0),ux),l(c(0,1,0),c(1,1,0),ux),uy),l(l(c(0,0,1),c(1,0,1),ux),l(c(0,1,1),c(1,1,1),ux),uy),uz);
}
