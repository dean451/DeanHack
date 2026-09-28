import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A cloud tile (the Plane of Air, and anywhere else a level sets CLOUD): a solid bank of
// billowing cumulus that stands in for the floor, with loose vapour drifting above it.
// The bank is a 3x3 bed of lumpy, flattened puffs whose tops sit near floor height so
// things can stand on it. Its sides are cut flat at the tile edge so neighbouring cloud
// tiles join into one sheet, and it hangs down towards the air tile's sky at y -0.42.
// Light is baked into vertex colours: sunlit white tops, blue-grey undersides and
// shaded creases where puffs meet. One merged mesh per material (`userData.part` is
// bank or vapour).
export function createCloud(seed=0){
 const g=new THREE.Group();g.name='Cloud';
 const materials=[],geometries=[];
 const mat=(o)=>{const m=new THREE.MeshStandardMaterial(o);materials.push(m);return m;};
 const bank=mat({vertexColors:true,roughness:1});
 const vapour=mat({vertexColors:true,roughness:1,transparent:true,opacity:.42,depthWrite:false});
 const parts={bank,vapour};
 const bins=new Map(Object.values(parts).map(m=>[m,[]]));
 const rand=(i)=>{const s=Math.sin(seed*12.9898+i*78.233)*43758.5453;return s-Math.floor(s);};
 const off=rand(99)*50;
 const EDGE=.495;

 // A lumpy puff: a sphere pushed out along its normals by billowing noise, then squashed.
 const centres=[];
 const puff=(m,x,y,z,r,sx,sy,sz,rough,detail=[16,11])=>{
  const geo=new THREE.SphereGeometry(1,detail[0],detail[1]);
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const nx=p.getX(i),ny=p.getY(i),nz=p.getZ(i);
   const wx=x+nx*r*sx,wy=y+ny*r*sy,wz=z+nz*r*sz;
   // Billows: big soft lobes plus smaller cauliflower bumps, flatter underneath.
   const lobe=noise3(wx*7+off,wy*7,wz*7)*.7+noise3(wx*19,wy*19+off,wz*19)*.3;
   const k=1+(lobe-.45)*rough*(ny<0?.4:1);
   p.setXYZ(i,
    THREE.MathUtils.clamp(x+nx*r*sx*k,-EDGE,EDGE),
    y+ny*r*sy*k,
    THREE.MathUtils.clamp(z+nz*r*sz*k,-EDGE,EDGE));
  }
  geo.computeVertexNormals();
  geo.userData.owner=m===bank?centres.push({x,y,z,r:r*Math.max(sx,sz),sy:r*sy})-1:-1;
  bins.get(m).push(geo);
 };

 // The bank: nine big puffs on a jittered grid, each with its own height.
 for(let i=0;i<9;i++){
  const gx=(i%3-1)*.3,gz=(Math.floor(i/3)-1)*.3;
  const r=.25+rand(i)*.07,top=.01+rand(i+10)*.05,sy=.55+rand(i+20)*.15;
  const x=gx+(rand(i+30)-.5)*.08,z=gz+(rand(i+40)-.5)*.08;
  puff(bank,x,top-r*sy,z,r,1,sy,1,.45);
 }
 // A couple of smaller puffs bulging out of the top of the bank.
 for(let i=0;i<3;i++){
  const r=.1+rand(i+50)*.06,x=(rand(i+53)-.5)*.6,z=(rand(i+56)-.5)*.6;
  puff(bank,x,.01,z,r,1.1,.55,1,.5,[12,8]);
 }
 // Vapour: a few loose, stretched wisps drifting at head height and above.
 const heading=rand(60)*Math.PI;
 for(let i=0;i<5;i++){
  const r=.09+rand(i+61)*.08,x=(rand(i+66)-.5)*.5,z=(rand(i+71)-.5)*.5,y=.18+rand(i+76)*.45;
  const along=1.3+rand(i+81)*.6;
  puff(vapour,x,y,z,r,Math.abs(Math.cos(heading))*along+.6,.6,Math.abs(Math.sin(heading))*along+.6,.6,[12,8]);
 }

 // Crease shading: how deep a point sits inside the bank's other puffs (never its own).
 const buried=(x,y,z,owner)=>{
  let d=0;
  for(const [i,c] of centres.entries()){if(i===owner)continue;
   const k=1-Math.hypot((x-c.x)/c.r,(y-c.y)/c.sy,(z-c.z)/c.r);
   if(k>-.12)d=Math.max(d,Math.min(1,(k+.12)/.3));
  }
  return d;
 };
 const cloudColour=(x,y,z,n,owner)=>{
  // Sunlit tops towards white, undersides towards blue-grey, lower is dimmer.
  const lit=THREE.MathUtils.clamp(.5+n.y*.55+n.x*.1,0,1);
  const height=THREE.MathUtils.clamp((y+.36)/.42,0,1);
  const grain=.94+noise3(x*40+off,y*40,z*40)*.1;
  let k=(.55+lit*.35+height*.12)*grain;
  if(owner>=0)k*=1-buried(x,y,z,owner)*.18;
  const warm=lit*height*.04;
  const c=[.8*k+warm,.85*k+warm*.6,.93*k];
  return c.map(v=>THREE.MathUtils.clamp(v,0,1));
 };

 // Bake: strip to position and normal, paint vertex colours, merge one mesh per material.
 const n=new THREE.Vector3();
 for(const [material,list] of bins){
  const flats=list.map(geo=>{
   const owner=geo.userData.owner;
   const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
   for(const key of Object.keys(flat.attributes))if(!['position','normal'].includes(key))flat.deleteAttribute(key);
   const p=flat.attributes.position,nor=flat.attributes.normal,col=new Float32Array(p.count*3);
   for(let i=0;i<p.count;i++){
    n.fromBufferAttribute(nor,i);
    const c=cloudColour(p.getX(i),p.getY(i),p.getZ(i),n,owner);
    col[i*3]=c[0];col[i*3+1]=c[1];col[i*3+2]=c[2];
   }
   flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   return flat;
  });
  const geo=mergeGeometries(flats);flats.forEach(f=>f.dispose());geometries.push(geo);
  const mesh=new THREE.Mesh(geo,material);
  mesh.castShadow=false;mesh.receiveShadow=material===bank;
  mesh.userData.part=Object.keys(parts).find(key=>parts[key]===material);
  if(material===vapour)mesh.renderOrder=1;
  g.add(mesh);
 }
 g.userData.hidesFloor=true;
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}

function hash3(x,y,z){const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s);}
function noise3(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
 const fx=x-ix,fy=y-iy,fz=z-iz,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy),uz=fz*fz*(3-2*fz);
 const l=(a,b,t)=>a+(b-a)*t;
 const c=(dx,dy,dz)=>hash3(ix+dx,iy+dy,iz+dz);
 return l(l(l(c(0,0,0),c(1,0,0),ux),l(c(0,1,0),c(1,1,0),ux),uy),l(l(c(0,0,1),c(1,0,1),ux),l(c(0,1,1),c(1,1,1),ux),uy),uz);
}
