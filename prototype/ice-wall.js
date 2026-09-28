import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Ice walls and crystal walls ('8' features).
// Ice wall: a faceted glacier block filling the tile, tapering a little towards lumpy,
// rounded shoulders, with columnar shards jutting from its foot, spikes on top and icicles
// hanging from the shoulders; a crust of snow sits on the top and drifts against the foot.
// Crystal wall: a cluster of six-sided quartz prisms with pointed tips radiating from a
// rough dark rock boss.
// Weathering is baked into vertex colours: deep blue low in the ice, paler higher up, faint
// strata, white fracture lines and rime on the upward faces; crystals milky at the root and
// clear towards the tips, with a violet tinge; rock dark with glinting druzy specks.
// Static parts are merged into one mesh per material (`userData.part` is ice and snow, or
// crystal and rock).
export function createIceWall(crystal=false,seed=0){
 const g=new THREE.Group();g.name=crystal?'Crystal wall':'Ice wall';
 const materials=[],geometries=[];
 const rand=(i)=>{const s=Math.sin(seed*12.9898+i*78.233)*43758.5453;return s-Math.floor(s);};
 const off=rand(99)*50;
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
 const place=(geo,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>geo.applyMatrix4(m4.compose(v.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s.set(sx,sy,sz)));
 // Stand a geometry built along +y at `at`, pointing along `dir`.
 const aim=(geo,at,dir,spin=0)=>{geo.rotateY(spin);return geo.applyMatrix4(m4.compose(at,q.setFromUnitVectors(up,dir),s.set(1,1,1)));};
 const bins=new Map();
 const put=(geo,part,paint,facet=true)=>{geo.userData.paint=paint;geo.userData.facet=facet;bins.get(part).push(geo);return geo;};
 // A six-sided prism with a pointed tip, root at the origin, along +y.
 const prism=(r,len,tip)=>{
  const body=new THREE.CylinderGeometry(r,r*1.05,len,6,1);body.translate(0,len/2,0);
  const point=new THREE.CylinderGeometry(0,r,tip,6,1);point.translate(0,len+tip/2,0);
  const geo=mergeGeometries([body.toNonIndexed(),point.toNonIndexed()]);body.dispose();point.dispose();
  return geo;
 };
 // Shorten a spike so its tip stays inside the tile.
 const fit=(at,dir,len)=>{
  let k=len;
  for(let i=0;i<20;i++){const x=at.x+dir.x*k,z=at.z+dir.z*k;if(Math.abs(x)<.47&&Math.abs(z)<.47)break;k*=.9;}
  return k;
 };

 if(!crystal){
  const iceMat=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.14,metalness:.02,clearcoat:1,clearcoatRoughness:.2,transparent:true,opacity:.86});
  const snowMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95});
  materials.push(iceMat,snowMat);bins.set('ice',[]);bins.set('snow',[]);
  const parts={ice:iceMat,snow:snowMat};

  // The block: a subdivided box pushed out by noise, tapering upwards, with the top sagging
  // towards the edges into rounded shoulders.
  const H=.78,HALF=.45;
  const blockPoint=(x,y,z)=>{
   const t=y/H,edge=Math.max(Math.abs(x),Math.abs(z))/HALF;
   const bulge=(noise3(x*5+off,y*5,z*5)-.5)*.1+(noise3(x*13,y*13+off,z*13)-.5)*.035;
   const taper=(1-.1*t)*(1+bulge);
   const top=(noise3(x*4+off,z*4,1)-.5)*.14-edge*edge*.1;
   return [THREE.MathUtils.clamp(x*taper,-.485,.485),Math.max(0,y+t*t*top),THREE.MathUtils.clamp(z*taper,-.485,.485)];
  };
  {
   const box=new THREE.BoxGeometry(HALF*2,H,HALF*2,7,6,7);box.translate(0,H/2,0);
   const p=box.attributes.position;
   for(let i=0;i<p.count;i++){const [x,y,z]=blockPoint(p.getX(i),p.getY(i),p.getZ(i));p.setXYZ(i,x,y,z);}
   put(box,'ice',iceColour);
  }
  // Columnar shards leaning out from the foot of the block.
  const shards=4+Math.floor(rand(1)*3);
  for(let i=0;i<shards;i++){
   const a=rand(2)*Math.PI*2+i*Math.PI*2/shards+(rand(i+3)-.5)*.5;
   const lean=.35+rand(i+10)*.5,dir=new THREE.Vector3(Math.cos(a)*Math.sin(lean),Math.cos(lean),Math.sin(a)*Math.sin(lean));
   // Root it high enough that the tilted base doesn't dip under the floor.
   const r=.035+rand(i+20)*.03,at=new THREE.Vector3(Math.cos(a)*.3,.004+r*1.05*Math.sin(lean),Math.sin(a)*.3),len=fit(at,dir,.14+rand(i+30)*.2+r*2)-r*2;
   if(len>.03)put(aim(prism(r,len,r*2),at,dir,rand(i+40)*Math.PI),'ice',iceColour);
  }
  // Spikes breaking through the top.
  for(let i=0;i<3;i++){
   const x=(rand(i+50)-.5)*.5,z=(rand(i+53)-.5)*.5,[bx,by,bz]=blockPoint(x,H,z);
   const dir=new THREE.Vector3((rand(i+56)-.5)*.5,1,(rand(i+59)-.5)*.5).normalize();
   const r=.03+rand(i+62)*.025,len=.05+rand(i+65)*.1;
   put(aim(prism(r,len,r*2.4),new THREE.Vector3(bx,by-.04,bz),dir,rand(i+68)*Math.PI),'ice',iceColour);
  }
  // Icicles hanging from the shoulders, one or two per side.
  for(let side=0;side<4;side++){
   const ry=side*Math.PI/2,n=1+(rand(side+70)>.5?1:0);
   for(let k=0;k<n;k++){
    const u=(rand(side*3+k+72)-.5)*.6,lx=Math.cos(ry)*u+Math.sin(ry)*.42,lz=-Math.sin(ry)*u+Math.cos(ry)*.42;
    const [x,y,z]=blockPoint(lx,H*.9,lz),len=.08+rand(side*3+k+80)*.12,r=.012+rand(side*3+k+84)*.01;
    const icicle=new THREE.ConeGeometry(r,len,5,3);icicle.rotateX(Math.PI);
    put(place(icicle,THREE.MathUtils.clamp(x*1.02,-.47,.47),y-len/2,THREE.MathUtils.clamp(z*1.02,-.47,.47)),'ice',iceColour);
   }
  }
  // Snow: a lumpy crust following the top, and drifts banked against the foot.
  {
   const cap=new THREE.PlaneGeometry(HALF*1.9,HALF*1.9,12,12);cap.rotateX(-Math.PI/2);
   const p=cap.attributes.position;
   for(let i=0;i<p.count;i++){
    const lx=p.getX(i),lz=p.getZ(i),[x,y,z]=blockPoint(lx,H,lz);
    const edge=Math.max(Math.abs(lx),Math.abs(lz))/(HALF*.95);
    p.setXYZ(i,x*.99,y+.012+noise3(lx*9+off,lz*9,3)*.03*(1-edge)-Math.max(0,edge-.8)*.1,z*.99);
   }
   cap.computeVertexNormals();
   put(cap,'snow',snowColour,false);
  }
  for(let i=0;i<3;i++){
   const a=rand(i+90)*Math.PI*2,x=Math.cos(a)*.44,z=Math.sin(a)*.44,w=.12+rand(i+93)*.08;
   const drift=new THREE.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2);
   put(place(drift,THREE.MathUtils.clamp(x,-.49+w,.49-w),0,THREE.MathUtils.clamp(z,-.49+w,.49-w),0,-a,0,w,.035+rand(i+96)*.03,w*.7),'snow',snowColour,false);
  }
  bake(g,bins,parts,geometries,{ice:true,snow:true});
 }else{
  const crystalMat=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.04,metalness:0,clearcoat:1,clearcoatRoughness:.05,transparent:true,opacity:.72});
  const rockMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,metalness:.05});
  materials.push(crystalMat,rockMat);bins.set('crystal',[]);bins.set('rock',[]);
  const parts={crystal:crystalMat,rock:rockMat};

  // Rock boss: a squat, lumpy dome the crystals grow out of.
  const bossR=.3,bossH=.18;
  {
   const boss=new THREE.IcosahedronGeometry(1,3);
   const p=boss.attributes.position;
   for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i);
    const k=.85+noise3(v.x*2.5+off,v.y*2.5,v.z*2.5)*.3;
    p.setXYZ(i,v.x*bossR*1.25*k,Math.max(0,v.y*bossH*k),v.z*bossR*k);
   }
   boss.computeVertexNormals();
   put(boss,'rock',rockColour,false);
  }
  // Crystals: a tall one near the middle, then a ring leaning outwards, then small ones at the edge.
  const specs=[{a:rand(0)*Math.PI*2,d:.02,lean:.06+rand(4)*.12,len:.52+rand(5)*.16,r:.065+rand(7)*.015}];
  const ring=6+Math.floor(rand(1)*3);
  for(let i=0;i<ring;i++)specs.push({a:rand(2)*Math.PI*2+i*Math.PI*2/ring+(rand(i+3)-.5)*.4,d:.08+rand(i+6)*.08,lean:.3+rand(i+9)*.45,len:.25+rand(i+12)*.3,r:.035+rand(i+15)*.03});
  for(let i=0;i<5;i++)specs.push({a:rand(i+20)*Math.PI*2,d:.24+rand(i+23)*.08,lean:.7+rand(i+26)*.5,len:.07+rand(i+29)*.1,r:.018+rand(i+32)*.014});
  for(const [i,c] of specs.entries()){
   const dirA=c.a+(rand(i+40)-.5)*.5;
   const at=new THREE.Vector3(Math.cos(c.a)*c.d*1.1,Math.max(bossH*.6*(1-c.d/.4),.004+c.r*1.05*Math.sin(c.lean)),Math.sin(c.a)*c.d);
   const dir=new THREE.Vector3(Math.cos(dirA)*Math.sin(c.lean),Math.cos(c.lean),Math.sin(dirA)*Math.sin(c.lean));
   const tip=c.r*2.2,len=Math.max(.02,Math.min(c.len,fit(at,dir,c.len+tip)-tip));
   const root=at.clone(),axis=dir.clone(),reach=len+tip;
   put(aim(prism(c.r,len,tip),at,dir,rand(i+45)*Math.PI),'crystal',(x,y,z,n)=>{
    const t=Math.min(1,Math.max(0,v.set(x,y,z).sub(root).dot(axis)/reach));
    return crystalColour(x,y,z,n,t,off+i);
   });
  }
  bake(g,bins,parts,geometries,{crystal:true,rock:true});
 }
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;

 // Glacier ice: deep blue low down and paler higher, faint strata, white fracture lines,
 // rime on the upward faces.
 function iceColour(x,y,z,n){
  const t=Math.min(1,y/.85),k=.9+noise3(x*8+off,y*8,z*8)*.2;
  let r=(.2+.35*t)*k,gr=(.46+.3*t)*k,b=(.66+.22*t)*k;
  const strata=Math.max(0,Math.sin(y*46+noise3(x*3,z*3+off,4)*7)-.82)/.18;
  r+=(.78-r)*strata*.35;gr+=(.9-gr)*strata*.35;b+=(.98-b)*strata*.35;
  if(Math.abs(noise3(x*16+off,y*16,z*16)-.5)<.018){r=.85;gr=.94;b=1;}
  const rime=Math.max(0,(n.y-.45)/.55);
  r+=(.9-r)*rime*.7;gr+=(.96-gr)*rime*.7;b+=(1-b)*rime*.7;
  return [Math.min(1,r),Math.min(1,gr),Math.min(1,b)];
 }
 function snowColour(x,y,z,n){
  const k=.93+noise3(x*30+off,y*30,z*30)*.07,shade=n.y<.3?.86:1;
  return [.9*k*shade,.94*k*shade,.99*k*shade];
 }
}

// Crystal: milky white at the root, clear and faintly violet along the body, bright tip.
function crystalColour(x,y,z,n,t,off){
 const k=.92+noise3(x*25+off,y*25,z*25)*.1;
 const milk=Math.max(0,1-t/.35);
 let r=.8+.14*milk,g=.76+.2*milk,b=.95+.05*milk;
 if(t>.85){const f=(t-.85)/.15;r+=(1-r)*f*.6;g+=(1-g)*f*.6;}
 return [Math.min(1,r*k),Math.min(1,g*k),Math.min(1,b*k)];
}

// Host rock: dark grey with a violet cast, darker in the hollows, glinting druzy specks.
function rockColour(x,y,z,n){
 const k=.75+noise3(x*18,y*18,z*18)*.4;
 let r=.15*k,g=.13*k,b=.17*k;
 if(n.y>.2&&hash3(x*997,y*997,z*997)>.9){r=.7;g=.66;b=.82;}
 if(n.y<.2){r*=.7;g*=.7;b*=.7;}
 return [r,g,b];
}

// Bake: strip to position and normal (faceted parts get flat normals), paint vertex
// colours, merge one mesh per part.
function bake(g,bins,parts,geometries,shadows){
 const n=new THREE.Vector3();
 for(const [part,list] of bins){
  const flats=list.map(geo=>{
   const {paint,facet}=geo.userData;
   const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
   for(const key of Object.keys(flat.attributes))if(!['position','normal'].includes(key))flat.deleteAttribute(key);
   if(facet)flat.computeVertexNormals();
   const p=flat.attributes.position,nor=flat.attributes.normal,col=new Float32Array(p.count*3);
   for(let i=0;i<p.count;i++){
    n.fromBufferAttribute(nor,i);
    const c=paint(p.getX(i),p.getY(i),p.getZ(i),n);
    col[i*3]=c[0];col[i*3+1]=c[1];col[i*3+2]=c[2];
   }
   flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   return flat;
  });
  const geo=mergeGeometries(flats);flats.forEach(f=>f.dispose());geometries.push(geo);
  const mesh=new THREE.Mesh(geo,parts[part]);mesh.castShadow=!!shadows[part];mesh.receiveShadow=true;
  mesh.userData.part=part;
  g.add(mesh);
 }
}

function hash3(x,y,z){const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s);}
function noise3(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
 const fx=x-ix,fy=y-iy,fz=z-iz,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy),uz=fz*fz*(3-2*fz);
 const l=(a,b,t)=>a+(b-a)*t;
 const c=(dx,dy,dz)=>hash3(ix+dx,iy+dy,iz+dz);
 return l(l(l(c(0,0,0),c(1,0,0),ux),l(c(0,1,0),c(1,1,0),ux),uy),l(l(c(0,0,1),c(1,0,1),ux),l(c(0,1,1),c(1,1,1),ux),uy),uz);
}
