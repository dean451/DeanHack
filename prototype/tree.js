import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A gnarled dungeon tree for the `tree` terrain. The trunk is one swept limb with a
// flared foot, a dog-leg and furrowed bark, and roots and branches grow out of it the
// same way: roots dip into the floor, and branches reach up into a lumpy canopy of
// noise-displaced clumps. There is a knothole with a raised lip, bracket fungi on the
// trunk, a few toadstools among the roots, and fallen leaves and twigs on the floor.
// Weathering is baked into vertex colours: furrows darker than the ridges, moss on the
// north side and near the ground, pale lichen spots, damp soil where the roots go under,
// and a canopy that is dark underneath and inside, lighter at the crown, with the odd
// yellowing patch. The seed (usually the map cell) varies the lean, the branches,
// the clumps and the leaf tint, so a grove doesn't look stamped.
// Static parts are merged into one mesh per material (`userData.part` is bark, leaves or
// litter; `userData.canopy` is the leaves mesh). Everything stays inside its tile, so
// neighbouring walls and actors never clip into it.
export function createTree(seed=0){
 const g=new THREE.Group();g.name='Tree';
 let s=(Math.floor(seed)*2654435761)>>>0||1;const random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
 const off=random()*50,hue=.26+random()*.07;
 const bark=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95});
 const leaves=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,flatShading:true});
 const litter=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,side:THREE.DoubleSide});
 const parts={bark,leaves,litter},materials=Object.values(parts),geometries=[];
 const bins=new Map(materials.map(m=>[m,[]]));
 const put=(geo,m,paint=null)=>{geo.userData.paint=paint;bins.get(m).push(geo);return geo;};
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),sc=new THREE.Vector3();
 const place=(geo,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>geo.applyMatrix4(m4.compose(v.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz,'YXZ')),sc.set(sx,sy,sz)));
 const turn=random()*Math.PI*2,cosT=Math.cos(turn),sinT=Math.sin(turn);
 // Points are laid out in the tree's own frame, then turned by the seed.
 const P=(x,y,z)=>new THREE.Vector3(x*cosT+z*sinT,y,-x*sinT+z*cosT);

 // A swept limb: rings along a curve, tapering from r0 to r1, with an optional flared
 // foot and lengthwise bark ridges. Rings share their seam, so there is no split edge.
 const limb=(pts,r0,r1,{radial=9,segs=12,flare=0,ridges=7,twist=0,bump=.07}={})=>{
  const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');
  const frames=curve.computeFrenetFrames(segs,false),pos=[],idx=[],p=new THREE.Vector3();
  const phase=random()*6;
  for(let i=0;i<=segs;i++){
   const t=i/segs;curve.getPointAt(t,p);
   const r=(r0+(r1-r0)*t)*(1+flare*Math.pow(1-t,4)),N=frames.normals[i],B=frames.binormals[i];
   for(let j=0;j<radial;j++){
    const a=j/radial*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);
    const ridge=1+bump*Math.sin(a*ridges+t*twist+phase)+bump*.6*(noise3(p.x*40+off,p.y*9+j,p.z*40)-.5);
    const rr=r*ridge;
    pos.push(p.x+(N.x*ca+B.x*sa)*rr,p.y+(N.y*ca+B.y*sa)*rr,p.z+(N.z*ca+B.z*sa)*rr);
   }
  }
  for(let i=0;i<segs;i++)for(let j=0;j<radial;j++){
   const a=i*radial+j,b=i*radial+(j+1)%radial,c=a+radial,d=b+radial;
   idx.push(a,c,b,b,c,d);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
  return {geo,curve};
 };

 // Trunk: a flared foot, a dog-leg halfway up, and a lean chosen by the seed.
 const lean=(random()-.5)*.22,crownX=Math.sin(lean)*.08;
 const trunkPts=[P(0,-.03,0),P(lean*.2,.16,.005),P(lean*.45+.025,.4,-.01),P(Math.sin(lean)*.1-.01,.64,.01),P(crownX,.9,0)];
 const trunk=limb(trunkPts,.1,.042,{radial:14,segs:18,flare:.75,ridges:9,twist:2.5,bump:.08});
 put(trunk.geo,bark);
 const onTrunk=(t,a,out=1)=>{
  // A point on the trunk surface at height fraction t, facing angle a (tree frame).
  const p=trunk.curve.getPointAt(t),r=(.1+(.042-.1)*t)*(1+.75*Math.pow(1-t,4))*out;
  return p.add(P(Math.cos(a)*r,0,Math.sin(a)*r));
 };

 // Roots flare out from the foot and dip under the floor.
 const roots=5+Math.floor(random()*2);
 for(let i=0;i<roots;i++){
  const a=i/roots*Math.PI*2+random()*.5,len=.24+random()*.1,c=Math.cos(a),sn=Math.sin(a),kink=(random()-.5)*.06;
  put(limb([P(c*.03,.1,sn*.03),P(c*.11,.05,sn*.11),P(c*len*.7-sn*kink,.022,sn*len*.7+c*kink),P(c*len,-.012,sn*len)],.048,.008,{radial:7,segs:9,ridges:4,bump:.1}).geo,bark);
 }

 // Canopy clumps: a big central mass, a ring around it, a crown on top and a few that
 // hang lower. Branches reach into the ring clumps from the upper trunk.
 const ringN=5+Math.floor(random()*2),clumps=[[0,1.0,0,.26]];
 for(let i=0;i<ringN;i++){
  const a=i/ringN*Math.PI*2+random()*.6,d=.17+random()*.03;
  clumps.push([Math.cos(a)*d,.9+random()*.08,Math.sin(a)*d,.15+random()*.035,a]);
 }
 clumps.push([.02,1.17,.03,.18],[-.07,1.24,-.04,.12]);
 for(let i=0;i<2;i++){const a=random()*Math.PI*2;clumps.push([Math.cos(a)*.22,.8,Math.sin(a)*.22,.1+random()*.02,a]);}
 for(const [x,y,z,r,a] of clumps){
  const geo=new THREE.IcosahedronGeometry(r,2);
  place(geo,crownX+x,y,z,random()*3,random()*3,0,1,.8,1);
  const cx=crownX+x,cz=z,p=geo.attributes.position;
  // Lumpy outline: push each vertex along its offset from the clump centre, keyed by
  // position so the faces of this non-indexed mesh stay closed.
  for(let i=0;i<p.count;i++){
   const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),k=1+(noise3(px*9+off,py*9,pz*9)-.5)*.42+(noise3(px*23,py*23+off,pz*23)-.5)*.12;
   p.setXYZ(i,cx+(px-cx)*k,y+(py-y)*k,cz+(pz-cz)*k);
  }
  // Clumps are laid out in the tree frame; turn their offset but keep their shape.
  const w=P(cx,y,cz);geo.translate(w.x-cx,0,w.z-cz);
  put(geo,leaves);
  if(a!==undefined&&y>.85){
   // A branch from the upper trunk out into this clump, and a twig off its side.
   const t0=.62+random()*.2,from=trunk.curve.getPointAt(t0);
   const tip=P(cx*.8,y-.02,cz*.8),mid=from.clone().lerp(tip,.5).add(new THREE.Vector3(0,-.03+random()*.02,0));
   put(limb([from,mid,tip],.026,.007,{radial:6,segs:8,ridges:3,bump:.08}).geo,bark);
   const tw=mid.clone().lerp(tip,.3),twTip=tw.clone().add(P(Math.cos(a+1.1)*.07,.06,Math.sin(a+1.1)*.07));
   put(limb([tw,tw.clone().lerp(twTip,.5).add(new THREE.Vector3(0,.01,0)),twTip],.011,.004,{radial:5,segs:5,ridges:2}).geo,bark);
  }
 }
 // Two bare stubs lower down, where old branches broke off.
 for(const side of [-1,1]){
  const t=.48+random()*.1,a=side>0?.3:Math.PI+.3,from=onTrunk(t,a,.6);
  const tip=from.clone().add(P(Math.cos(a)*.11,.07+random()*.03,Math.sin(a)*.11));
  put(limb([from,from.clone().lerp(tip,.5),tip],.022,.011,{radial:6,segs:4,ridges:3}).geo,bark);
  put(place(new THREE.CircleGeometry(.011,6),tip.x,tip.y,tip.z,-Math.PI/2+.5,0,0),bark,()=>stumpRing);
 }

 // A knothole with a raised lip and a dark hollow, facing a seeded direction.
 {
  const a=random()*Math.PI*2,p=onTrunk(.3,a,.93),dir=P(Math.cos(a),0,Math.sin(a)),ry=Math.atan2(dir.x,dir.z);
  put(place(new THREE.TorusGeometry(.028,.011,6,12),p.x,p.y,p.z,0,ry,0,1,1.4,1),bark);
  put(place(new THREE.CircleGeometry(.03,10),p.x-dir.x*.004,p.y,p.z-dir.z*.004,0,ry,0,1,1.4,1),bark,()=>hollow);
 }
 // Bracket fungi stacked on the shady side.
 {
  const a=Math.PI*.5+random()*.8,n=2+Math.floor(random()*2);
  for(let i=0;i<n;i++){
   const r=.034-i*.007,p=onTrunk(.2+i*.07,a+(random()-.5)*.5,.9),dir=new THREE.Vector3(p.x,0,p.z).sub(trunk.curve.getPointAt(.2+i*.07).setY(0)).normalize();
   const geo=new THREE.SphereGeometry(r,12,4,0,Math.PI,0,Math.PI/2);
   place(geo,p.x,p.y,p.z,0,Math.atan2(dir.x,dir.z),0,1,.32,1);
   put(geo,bark,fungus);
  }
 }

 // Litter: fallen leaves in greens, yellows and browns, a couple of twigs, and a few
 // toadstools tucked in by the roots.
 const leafShape=new THREE.Shape();leafShape.moveTo(0,-.032);leafShape.quadraticCurveTo(.02,-.004,0,.032);leafShape.quadraticCurveTo(-.02,-.004,0,-.032);
 const leafTints=[new THREE.Color().setHSL(hue,.45,.24),new THREE.Color().setHSL(hue-.12,.5,.32),new THREE.Color().setHSL(.08,.45,.2),new THREE.Color().setHSL(.12,.55,.34)];
 for(let i=0;i<12;i++){
  const a=random()*Math.PI*2,r=.18+random()*.24,c=leafTints[Math.floor(random()*leafTints.length)];
  const geo=new THREE.ShapeGeometry(leafShape,3);
  // A slight curl up at the tips so leaves don't lie dead flat.
  const p=geo.attributes.position;for(let j=0;j<p.count;j++)p.setZ(j,p.getY(j)*p.getY(j)*3);
  place(geo,Math.cos(a)*r,.004+i*.0004,Math.sin(a)*r,-Math.PI/2,random()*Math.PI*2,0,.8+random()*.4);
  const k=.8+random()*.35;
  put(geo,litter,(x,y,z)=>{const m=noise3(x*200+off,z*200,i)*.25+.85;return [c.r*k*m,c.g*k*m,c.b*k*m];});
 }
 for(let i=0;i<2;i++){
  const a=random()*Math.PI*2,r=.25+random()*.12,c=Math.cos(a),sn=Math.sin(a),len=.09+random()*.05,b=a+1.4+random();
  const x=c*r,z=sn*r,dx=Math.cos(b)*len,dz=Math.sin(b)*len;
  put(limb([new THREE.Vector3(x-dx,.006,z-dz),new THREE.Vector3(x,.009,z),new THREE.Vector3(x+dx,.006,z+dz)],.006,.003,{radial:5,segs:4,ridges:2}).geo,bark);
 }
 {
  const a=random()*Math.PI*2,n=3;
  for(let i=0;i<n;i++){
   const b=a+(i-1)*.35,r=.14+i*.02+random()*.02,x=Math.cos(b)*r,z=Math.sin(b)*r,h=.028+random()*.025,cap=.014+random()*.008;
   put(place(new THREE.CylinderGeometry(.0045,.006,h,6,1,true),x,h/2,z),litter,()=>stem);
   put(place(new THREE.SphereGeometry(cap,10,5,0,Math.PI*2,0,Math.PI/2),x,h-.002,z,0,0,0,1,.65,1),litter,(px,py,pz,n)=>n.y<.1?gill:py>h+cap*.4?capTop:capSide);
  }
 }

 // Bake: every piece gets its colours, then each bin becomes one mesh.
 const nrm=new THREE.Vector3();
 for(const [material,list] of bins){
  if(!list.length)continue;
  const flats=list.map(geo=>{
   const paint=geo.userData.paint;
   const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
   if(!flat.attributes.normal)flat.computeVertexNormals();
   for(const key of Object.keys(flat.attributes))if(!['position','normal'].includes(key))flat.deleteAttribute(key);
   const p=flat.attributes.position,nor=flat.attributes.normal,col=new Float32Array(p.count*3);
   const f=paint||(material===bark?(x,y,z,n)=>barkColour(x,y,z,n,off):material===leaves?(x,y,z,n)=>leafColour(x,y,z,n,off,hue):()=>[.3,.3,.3]);
   for(let i=0;i<p.count;i++){nrm.fromBufferAttribute(nor,i);const c=f(p.getX(i),p.getY(i),p.getZ(i),nrm);col[i*3]=c[0];col[i*3+1]=c[1];col[i*3+2]=c[2];}
   flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   return flat;
  });
  const geo=mergeGeometries(flats);flats.forEach(f=>f.dispose());geometries.push(geo);
  const mesh=new THREE.Mesh(geo,material);
  mesh.castShadow=material!==litter;mesh.receiveShadow=true;
  mesh.userData.part=Object.keys(parts).find(key=>parts[key]===material);
  if(material===leaves)g.userData.canopy=mesh;
  g.add(mesh);
 }
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}

// Colours are given in sRGB and converted once, so they match the old flat materials.
const lin=(hex)=>{const c=new THREE.Color(hex);return [c.r,c.g,c.b];};
const BARK=lin(0x4a3526),FURROW=lin(0x241910),MOSS=lin(0x4d5f2c),LICHEN=lin(0x8f8d6c),SOIL=lin(0x1f1812);
const hollow=lin(0x0b0806),stumpRing=lin(0x9a7a55),stem=lin(0xd8cdb0),gill=lin(0x7a6650),capTop=lin(0x8a4a24),capSide=lin(0xb0703a);
const FUNGUS_TOP=lin(0xb88a52),FUNGUS_RIM=lin(0xe0cfa0);
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
function fungus(x,y,z,n){return n.y>.5?FUNGUS_TOP:mix(FUNGUS_TOP,FUNGUS_RIM,.7);}

// Bark: ridges lighter than the furrows between them, moss on the north (−z) side and
// near the floor, pale lichen spots, and damp soil where the roots go under.
function barkColour(x,y,z,n,off){
 const furrow=noise3(x*55+off,y*7,z*55),mott=.85+noise3(x*18,y*18+off,z*18)*.3;
 let c=mix(FURROW,BARK,Math.min(1,Math.max(0,(furrow-.25)*1.6))).map(a=>a*mott);
 const moss=(Math.max(0,-n.z)*.7+Math.max(0,n.y)*.5+Math.max(0,1-y/.25)*.5)*noise3(x*26+off,y*26,z*26);
 if(moss>.42)c=mix(c,MOSS,Math.min(1,(moss-.42)*3));
 if(noise3(x*70,y*70+off,z*70)>.8&&y>.2)c=mix(c,LICHEN,.6);
 if(y<.03)c=mix(c,SOIL,Math.min(1,(.03-y)/.04));
 return c;
}

// Leaves: dark underneath and deep inside the canopy, lighter toward the crown and the
// outer surface, with the odd yellowing patch.
function leafColour(x,y,z,n,off,hue){
 const out=Math.min(1,Math.hypot(x,z)/.35),up=Math.min(1,Math.max(0,(y-.8)/.45));
 let l=.12+up*.13+out*.05+Math.max(0,n.y)*.06-Math.max(0,-n.y)*.05+(noise3(x*30+off,y*30,z*30)-.5)*.07;
 let h=hue,sat=.42;
 const yellow=noise3(x*11,y*11+off,z*11);
 if(yellow>.72){const t=Math.min(1,(yellow-.72)*4);h-=.1*t;sat+=.1*t;l+=.04*t;}
 const c=new THREE.Color().setHSL(h,sat,Math.max(.05,l));
 return [c.r,c.g,c.b];
}

function hash3(x,y,z){const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s);}
function noise3(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
 const fx=x-ix,fy=y-iy,fz=z-iz,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy),uz=fz*fz*(3-2*fz);
 const l=(a,b,t)=>a+(b-a)*t;
 const c=(dx,dy,dz)=>hash3(ix+dx,iy+dy,iz+dz);
 return l(l(l(c(0,0,0),c(1,0,0),ux),l(c(0,1,0),c(1,1,0),ux),uy),l(l(c(0,0,1),c(1,0,1),ux),l(c(0,1,1),c(1,1,1),ux),uy),uz);
}
