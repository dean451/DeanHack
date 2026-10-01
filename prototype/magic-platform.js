import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {SKY_Y,SKY_COLOR} from './air.js';

// A magic platform (UnNetHack's MAGIC_PLATFORM, the walkway over the void on the
// Valkyrie locate level): a hewn slab of cold slate hanging in open air with nothing
// holding it up. Its rim is chipped and its corners knocked off; under it hangs a
// jagged keel of torn rock, as if it were wrenched out of a mountain, with a few loose
// shards drifting beside it. A broken ring of runes is burned into its top, glowing a
// cold violet, and a splinter of the same light is lodged in the keel's point.
// Below it is the same flat sky as an open air tile (air.js), so they join.
// Two draws: `stone` (lit, vertex coloured, faceted) and `glow` (unlit: the sky, the
// runes and the crystal). live.js hides the floor slab.
export const PLATFORM_TOP=-.03;    // the top of the floor slab it stands in for

const RUNES=[
 [[0,-1,0,1],[0,1,-.5,.5],[0,1,.5,.5]],                  // tiwaz
 [[0,-1,0,1],[0,.2,-.5,.9],[0,.2,.5,.9]],                // algiz
 [[0,-1,0,1],[0,.5,.5,0],[.5,0,0,-.5]],                  // thurisaz
 [[-.4,-1,-.4,1],[.4,-1,.4,1],[-.4,.3,.4,-.3]],          // hagalaz
 [[0,-1,0,1],[-.4,.4,.4,-.2]],                           // naudiz
 [[.3,1,-.3,.3],[-.3,.3,.3,-.3],[.3,-.3,-.3,-1]],        // sowilo
 [[0,-1,0,1],[0,1,.4,.7],[0,-1,-.4,-.7]],                // eihwaz
];

export function createMagicPlatform(seed=0){
 const g=new THREE.Group();g.name='Magic platform';
 const rand=i=>{const s=Math.sin(seed*12.9898+i*78.233)*43758.5453;return s-Math.floor(s);};
 const off=rand(99)*50,TOP=PLATFORM_TOP,H=.1;
 const stoneMat=new THREE.MeshStandardMaterial({color:'#9aa0aa',roughness:.9,metalness:0,vertexColors:true});
 const glowMat=new THREE.MeshBasicMaterial({vertexColors:true});
 const stone=[],glow=[];
 const n=new THREE.Vector3();
 // Faceted, vertex coloured pieces: `colour(x,y,z,normal)` gives a multiplier on the slate.
 const carve=(geo,colour)=>{
  const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
  for(const key of Object.keys(flat.attributes))if(key!=='position')flat.deleteAttribute(key);
  flat.computeVertexNormals();
  const p=flat.attributes.position,nor=flat.attributes.normal,col=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){n.fromBufferAttribute(nor,i);col.set(colour(p.getX(i),p.getY(i),p.getZ(i),n),i*3);}
  flat.setAttribute('color',new THREE.BufferAttribute(col,3));
  stone.push(flat);
 };
 const lit=(geo,rgb)=>{
  const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
  for(const key of Object.keys(flat.attributes))if(key!=='position')flat.deleteAttribute(key);
  const p=flat.attributes.position,col=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++)col.set(rgb(p.getX(i),p.getY(i),p.getZ(i)),i*3);
  flat.setAttribute('color',new THREE.BufferAttribute(col,3));
  glow.push(flat);
 };
 const slate=(x,y,z,nor)=>{
  let k=.82+(noise3(x*8+off,y*8,z*8)-.5)*.3+(noise3(x*55,y*55+off,z*55)-.5)*.12;
  if(nor.y<-.3)k*=.5;else if(nor.y<.5)k*=.68;
  let r=k*.92,gr=k*.95,b=k*1.04;
  // Rime: pale blue-white crusts on the upper faces.
  const rime=noise3(x*14+off+3,z*14,y*14);
  if(nor.y>.5&&rime>.68){const m=Math.min(1,(rime-.68)*6);r+=(1.05-r)*m*.6;gr+=(1.1-gr)*m*.6;b+=(1.2-b)*m*.6;}
  return [r,gr,b];
 };

 // Slab: a thick tile with its corners knocked off and its rim chipped. Each vertex
 // moves by a function of its position, so the box's split edges move together.
 const slab=new THREE.BoxGeometry(.92,H,.92,9,2,9);slab.translate(0,TOP-H/2,0);
 {
  const p=slab.attributes.position;
  for(let i=0;i<p.count;i++){
   let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   // Corners: pull anything past the octagon's cut back onto it, raggedly.
   const cut=.8+(noise3(x*7+off,z*7,9)-.5)*.08,d=Math.abs(x)+Math.abs(z);
   if(d>cut){const k=cut/d;x*=k;z*=k;}
   const rim=Math.max(Math.abs(x),Math.abs(z),d/1.6)/.46;   // 0 centre, ~1 at the edge
   // Chips: the edge bites inward in places, deeper toward the bottom.
   const bite=Math.max(0,noise3(x*11+off,y*20,z*11)-.5)*.09*Math.pow(rim,4)*(1.2-(y-TOP+H)/H*.6);
   x*=1-bite;z*=1-bite;
   // The top is dressed nearly flat, dipping only (the runes sit just above it).
   if(y>TOP-.001)y=TOP-Math.max(0,noise3(x*9+off,z*9,2)-.45)*.012-Math.pow(Math.max(0,rim-.82),2)*.35;
   else if(y<TOP-H+.001)y+=(noise3(x*13,z*13+off,4)-.5)*.03;
   p.setXYZ(i,x,y,z);
  }
  carve(slab,slate);
 }

 // Keel: an upside-down crag of torn rock under the slab, its point off centre.
 {
  const top=TOP-H+.015,depth=.17+rand(1)*.04,tipX=(rand(2)-.5)*.1,tipZ=(rand(3)-.5)*.1;
  const keel=new THREE.ConeGeometry(.36,depth,7,4,true);keel.rotateX(Math.PI);keel.translate(0,top-depth/2,0);
  const p=keel.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),t=(top-y)/depth;   // 0 under the slab, 1 at the point
   const a=Math.atan2(z,x),jag=1+(noise3(Math.cos(a)*3+off,Math.sin(a)*3,t*4)-.5)*.7+(Math.sin(a*7+off)*.12)*t;
   p.setXYZ(i,x*jag+tipX*t*t,y+(noise3(a*2,t*5,off)-.5)*.03*t,z*jag+tipZ*t*t);
  }
  carve(keel,(x,y,z,nor)=>{
   const c=slate(x,y,z,nor),t=THREE.MathUtils.clamp((top-y)/depth,0,1);
   // Darker toward the point, then washed violet by the crystal lodged in it.
   const k=1-t*.35,w=Math.pow(t,6)*.5;
   return [c[0]*k+w*.45,c[1]*k+w*.3,c[2]*k+w*.8];
  });
  // The splinter of light in the point.
  const shard=new THREE.OctahedronGeometry(.03,0);shard.scale(.7,1.9,.7);shard.rotateZ((rand(4)-.5)*.5);
  shard.translate(tipX,top-depth+.01,tipZ);
  lit(shard,(x,y)=>{const t=THREE.MathUtils.clamp((top-depth-y+.06)/.12,0,1);return [.55+t*.4,.42+t*.45,1];});
 }

 // Loose shards: broken pieces drifting under the rim.
 for(let i=0;i<3;i++){
  const a=rand(10+i)*Math.PI*2,r=.3+rand(13+i)*.1,s=.025+rand(16+i)*.025;
  const rock=new THREE.DodecahedronGeometry(s,0);
  rock.scale(1,.7+rand(19+i)*.6,1.3);rock.rotateY(rand(22+i)*3);rock.rotateX(rand(25+i)*2);
  rock.translate(Math.cos(a)*r,TOP-H-.07-rand(28+i)*.1,Math.sin(a)*r);
  carve(rock,slate);
 }

 // Runes: a broken ring and seven staves round its inside, burned into the top. Each
 // line is a dark scorched groove (stone) under a narrower glowing stroke (glow).
 const RING=.31,INNER=.205,LIFT=TOP+.003,turn=rand(30)*Math.PI*2;
 const quad=(x0,z0,x1,z1,w,y)=>{
  const dx=x1-x0,dz=z1-z0,l=Math.hypot(dx,dz)||1,nx=-dz/l*w/2,nz=dx/l*w/2;
  const ex=dx/l*w/2,ez=dz/l*w/2;   // run each stroke on a little past its ends so joints close
  const a=[x0-ex+nx,y,z0-ez+nz],b=[x1+ex+nx,y,z1+ez+nz],c=[x1+ex-nx,y,z1+ez-nz],d=[x0-ex-nx,y,z0-ez-nz];
  return [...a,...c,...b,...a,...d,...c];
 };
 const groove=[],line=[];
 const stroke=(x0,z0,x1,z1,w)=>{groove.push(...quad(x0,z0,x1,z1,w*2.1,LIFT-.0015));line.push(...quad(x0,z0,x1,z1,w,LIFT));};
 // The ring: five arcs with gaps between them.
 for(let arc=0;arc<5;arc++){
  const a0=turn+arc*Math.PI*2/5+.1,span=Math.PI*2/5-.2-rand(31+arc)*.15,seg=8;
  for(let s=0;s<seg;s++){const b0=a0+span*s/seg,b1=a0+span*(s+1)/seg;
   stroke(Math.cos(b0)*RING,Math.sin(b0)*RING,Math.cos(b1)*RING,Math.sin(b1)*RING,.011);}
 }
 // The staves stand radially, top outward, chosen and ordered by the seed.
 const start=Math.floor(rand(40)*RUNES.length);
 for(let i=0;i<7;i++){
  const rune=RUNES[(start+i*3)%RUNES.length],a=turn+i*Math.PI*2/7+Math.PI/7;
  const ux=Math.cos(a),uz=Math.sin(a),vx=-uz,vz=ux,size=.042,cx=ux*INNER,cz=uz*INNER;
  for(const [x0,y0,x1,y1] of rune)
   stroke(cx+vx*x0*size+ux*y0*size,cz+vz*x0*size+uz*y0*size,cx+vx*x1*size+ux*y1*size,cz+vz*x1*size+uz*y1*size,.008);
 }
 {
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(groove,3));
  carve(geo,(x,y,z)=>{const k=.18+noise3(x*40+off,z*40,7)*.1;return [k*.9,k*.85,k*1.1];});
 }
 {
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(line,3));
  lit(geo,(x,y,z)=>{const f=.75+noise3(x*30+off,z*30,11)*.35;return [.5*f,.38*f,1*f];});
 }

 // The sky under it, the same flat colour as an open air tile.
 {
  const sky=new THREE.PlaneGeometry(1.001,1.001).rotateX(-Math.PI/2).translate(0,SKY_Y,0);
  const c=new THREE.Color(SKY_COLOR);
  lit(sky,()=>[c.r,c.g,c.b]);
 }

 const stoneGeo=mergeGeometries(stone),glowGeo=mergeGeometries(glow);
 [...stone,...glow].forEach(p=>p.dispose());
 const rock=new THREE.Mesh(stoneGeo,stoneMat);rock.castShadow=rock.receiveShadow=true;rock.userData.part='stone';
 const light=new THREE.Mesh(glowGeo,glowMat);light.castShadow=light.receiveShadow=false;light.userData.part='glow';
 g.add(rock,light);
 g.userData.hidesFloor=true;
 g.userData.dispose=()=>{stoneGeo.dispose();glowGeo.dispose();stoneMat.dispose();glowMat.dispose();};
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
