import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {noise3} from './stairs.js';

// Dead trees (S_deadtree, a tree withered by a death ray or set in a special level) share
// the `tree` terrain with live ones; the glyph tells them apart: a black '#' (drawing.c
// defsyms, CLR_BLACK) where a live tree is green. Only a showing tree glyph settles it, so
// anything covering the square (an item, a monster, the remembered 'I') returns null.
export const DEAD_TREE_COLOR=0;
export function deadTreeShown(cell){return cell.kind==='terrain'&&cell.symbol===35?cell.color===DEAD_TREE_COLOR:null;}

// A dead tree: a blasted, leafless trunk with a lean, split along one side by an old
// lightning scar charred black, and a gaping knothole maw ringed with splinters like teeth.
// Above it the trunk forks into crooked limbs that reach up and out and fork again, every
// tip hooked over like a claw; one limb is snapped off short with a splintered end and its
// broken half lies at the foot. A frayed end of old rope still hangs from a low limb.
// Roots arch out of the floor like knuckled fingers before they grip back under it. The
// ground holds a few curled grey leaves, twigs and a drift of ash. Weathering is baked into
// vertex colours: ashen bark with dark furrows, bleached grey on the upper, exposed faces,
// the scar burnt to charcoal, damp soil at the roots and the odd sickly lichen patch.
// The seed (usually the map cell) varies the lean, the limbs and the scar.
// Static parts are merged into one mesh per material (`userData.part` is bark or litter);
// there are no leaves, so canopy-sway.js leaves it still. Everything stays inside its tile.
export function createDeadTree(seed=0){
 const g=new THREE.Group();g.name='Dead tree';
 let s=(Math.floor(seed)*2654435761)>>>0||1;const random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
 const off=random()*50,scar=random()*Math.PI*2;
 const bark=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.97});
 const litter=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide});
 const parts={bark,litter},materials=Object.values(parts),geometries=[];
 const bins=new Map(materials.map(m=>[m,[]]));
 const put=(geo,m,paint=null)=>{geo.userData.paint=paint;bins.get(m).push(geo);return geo;};
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),sc=new THREE.Vector3();
 const place=(geo,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>geo.applyMatrix4(m4.compose(v.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz,'YXZ')),sc.set(sx,sy,sz)));
 const turn=random()*Math.PI*2,cosT=Math.cos(turn),sinT=Math.sin(turn);
 const P=(x,y,z)=>new THREE.Vector3(x*cosT+z*sinT,y,-x*sinT+z*cosT);
 // Keep a point inside the tile (radius .44 from the centre).
 const keep=(p,R=.44)=>{const h=Math.hypot(p.x,p.z);if(h>R)p.multiply(new THREE.Vector3(R/h,1,R/h));return p;};

 // A swept limb: rings along a curve, tapering from r0 to r1, with an optional flared
 // foot and lengthwise bark ridges (as in tree.js).
 const limb=(pts,r0,r1,{radial=8,segs=10,flare=0,ridges=6,twist=0,bump=.09}={})=>{
  const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');
  const frames=curve.computeFrenetFrames(segs,false),pos=[],idx=[],p=new THREE.Vector3();
  const phase=random()*6;
  for(let i=0;i<=segs;i++){
   const t=i/segs;curve.getPointAt(t,p);
   const r=(r0+(r1-r0)*t)*(1+flare*Math.pow(1-t,4)),N=frames.normals[i],B=frames.binormals[i];
   for(let j=0;j<radial;j++){
    const a=j/radial*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);
    const rr=r*(1+bump*Math.sin(a*ridges+t*twist+phase)+bump*.7*(noise3(p.x*40+off,p.y*9+j,p.z*40)-.5));
    pos.push(p.x+(N.x*ca+B.x*sa)*rr,p.y+(N.y*ca+B.y*sa)*rr,p.z+(N.z*ca+B.z*sa)*rr);
   }
  }
  // Close the tip with a point, so thin limbs don't end in an open ring.
  const tip=curve.getPointAt(1);pos.push(tip.x,tip.y,tip.z);const last=pos.length/3-1;
  for(let i=0;i<segs;i++)for(let j=0;j<radial;j++){
   const a=i*radial+j,b=i*radial+(j+1)%radial,c=a+radial,d=b+radial;
   idx.push(a,c,b,b,c,d);
  }
  for(let j=0;j<radial;j++)idx.push(segs*radial+j,last,segs*radial+(j+1)%radial);
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
  return {geo,curve};
 };
 const dirOf=(az,el)=>new THREE.Vector3(Math.cos(el)*Math.cos(az),Math.sin(el),Math.cos(el)*Math.sin(az));

 // Trunk: a flared foot, a hard lean and a twist, thinning to a fork.
 const lean=(random()-.5)*.3,leanAz=random()*Math.PI*2,lx=Math.cos(leanAz)*lean,lz=Math.sin(leanAz)*lean;
 const trunkPts=[P(0,-.03,0),P(lx*.15,.15,lz*.15),P(lx*.4+.03,.36,lz*.4-.02),P(lx*.7-.02,.55,lz*.7+.02),P(lx,.72,lz)];
 const trunk=limb(trunkPts,.095,.045,{radial:14,segs:18,flare:.85,ridges:8,twist:4,bump:.11});
 put(trunk.geo,bark);
 const trunkR=t=>(.095+(.045-.095)*t)*(1+.85*Math.pow(1-t,4));
 const onTrunk=(t,a,out=1)=>trunk.curve.getPointAt(t).add(new THREE.Vector3(Math.cos(a)*trunkR(t)*out,0,Math.sin(a)*trunkR(t)*out));
 // The fork: the trunk's top, and the scar's world-space angle for the bark painter.
 const fork=trunk.curve.getPointAt(1);

 // A crooked limb from `from` heading along azimuth/elevation, bending as it goes, its
 // tip hooked down and in like a claw; it forks again while depth lasts.
 const tips=[];let ropeAt=null;
 const branch=(from,az,el,len,r0,depth)=>{
  const pts=[from.clone()];let p=from.clone(),a=az,h=el;
  for(let k=1;k<=3;k++){
   a+=(random()-.5)*.5;h+=(random()-.5)*.35-(k===3?.15:0);
   p=keep(p.clone().add(dirOf(a,h).multiplyScalar(len/3.4)));pts.push(p);
  }
  // The claw: the last stretch curls downward and back toward the trunk.
  const hook=keep(p.clone().add(dirOf(a+(random()-.5)*.6,-.9-random()*.5).multiplyScalar(len*.16)).add(new THREE.Vector3(-p.x*.06,0,-p.z*.06)));
  pts.push(hook);
  const r1=Math.max(.0035,r0*.3);
  const b=limb(pts,r0,r1,{radial:depth>0?8:6,segs:depth>0?11:8,ridges:4,twist:2});
  put(b.geo,bark);tips.push(hook);
  if(depth===2&&!ropeAt&&el<.75)ropeAt=b.curve.getPointAt(.45);
  if(depth>0){
   const kids=depth===2?2:1+Math.floor(random()*2);
   for(let i=0;i<kids;i++){
    const t=.38+random()*.35+i*.08,at=b.curve.getPointAt(Math.min(.85,t));
    branch(at,a+(i%2?1:-1)*(.6+random()*.5),el+.15+random()*.3,len*(.5+random()*.12),r0*(.55-t*.2),depth-1);
   }
  }
 };
 const limbs=3,base=random()*Math.PI*2,snapped=Math.floor(random()*limbs);
 for(let i=0;i<limbs;i++){
  const az=base+i/limbs*Math.PI*2+(random()-.5)*.6;
  if(i===snapped){
   // Snapped short: a stub with splinters jutting from its broken end.
   const from=trunk.curve.getPointAt(.86),dir=dirOf(az,.55+random()*.25),tip=from.clone().add(dir.clone().multiplyScalar(.15));
   put(limb([from,from.clone().lerp(tip,.5).add(new THREE.Vector3(0,.01,0)),tip],.034,.024,{radial:8,segs:5,ridges:4}).geo,bark);
   for(let k=0;k<5;k++){
    const sp=new THREE.ConeGeometry(.006+random()*.004,.03+random()*.035,4);sp.translate(0,sp.parameters.height/2,0);
    const w=new THREE.Vector3((random()-.5)*.03,(random()-.5)*.03,(random()-.5)*.03);
    sp.applyMatrix4(m4.compose(tip.clone().add(w),q.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().add(w.multiplyScalar(14)).normalize()),sc.set(1,1,1)));
    put(sp,bark,splinter);
   }
   continue;
  }
  branch(fork.clone().add(new THREE.Vector3(0,-.02,0)),az,.55+random()*.45,.42+random()*.1,.04,2);
 }
 // A crooked leader carrying on straight up from the fork.
 branch(fork.clone(),base+1,1.25,.32,.032,1);

 // Roots: knuckled fingers that arch out of the floor and grip back under it.
 const roots=5+Math.floor(random()*2);
 for(let i=0;i<roots;i++){
  const a=i/roots*Math.PI*2+random()*.5,len=.26+random()*.11,c=Math.cos(a),sn=Math.sin(a),kink=(random()-.5)*.08,arch=.06+random()*.04;
  put(limb([P(c*.03,.12,sn*.03),P(c*.12,.06+arch*.4,sn*.12),P(c*len*.62-sn*kink,arch,sn*len*.62+c*kink),P(c*len*.86,.02,sn*len*.86),P(c*len,-.02,sn*len)],.05,.007,{radial:7,segs:12,ridges:4,bump:.12}).geo,bark);
 }

 // The maw: a tall knothole low on the trunk with a swollen lip, a black hollow and
 // splinters round the rim pointing inward like teeth.
 {
  const a=scar+Math.PI*.7,p=onTrunk(.27,a,.9),dir=new THREE.Vector3(Math.cos(a),0,Math.sin(a)),ry=Math.atan2(dir.x,dir.z);
  put(place(new THREE.TorusGeometry(.03,.012,6,14),p.x,p.y,p.z,0,ry,0,1,1.7,1),bark);
  put(place(new THREE.CircleGeometry(.032,12),p.x-dir.x*.006,p.y,p.z-dir.z*.006,0,ry,0,1,1.7,1),bark,()=>HOLLOW);
  for(let k=0;k<7;k++){
   const b=k/7*Math.PI*2+random()*.3,rx=Math.cos(b)*.03,ry2=Math.sin(b)*.05;
   const tooth=new THREE.ConeGeometry(.005,.018+random()*.01,4);tooth.translate(0,tooth.parameters.height/2,0);
   // Point it at the hole's centre, in the hole's own plane.
   tooth.rotateZ(Math.atan2(ry2,rx)+Math.PI/2);
   place(tooth,p.x+dir.x*.004+Math.cos(ry)*rx,p.y+ry2,p.z+dir.z*.004-Math.sin(ry)*rx,0,ry,0);
   put(tooth,bark,splinter);
  }
 }

 // A frayed end of old rope tied round a low limb, hanging still.
 if(ropeAt){
  const len=.17+random()*.06,top=ropeAt.clone();
  put(place(new THREE.TorusGeometry(.03,.008,5,10),top.x,top.y,top.z,Math.PI/2,0,0,1,1,1),litter,()=>ROPE);
  put(place(new THREE.CylinderGeometry(.0075,.0085,len,6),top.x,top.y-len/2-.02,top.z),litter,rope);
  for(let k=0;k<5;k++){
   const b=k/5*Math.PI*2,strand=new THREE.CylinderGeometry(.0018,.0006,.035+random()*.02,3);
   strand.translate(0,-strand.parameters.height/2,0);
   place(strand,top.x+Math.cos(b)*.004,top.y-len-.02,top.z+Math.sin(b)*.004,Math.cos(b)*.35,0,Math.sin(b)*.35);
   put(strand,litter,()=>ROPE);
  }
 }

 // Litter: the snapped limb's broken half at the foot, curled grey leaves, twigs and ash.
 {
  const a=random()*Math.PI*2,r=.28,c=Math.cos(a),sn=Math.sin(a),b=a+1.3,dx=Math.cos(b)*.13,dz=Math.sin(b)*.13;
  const x=c*r,z=sn*r;
  put(limb([new THREE.Vector3(x-dx,.022,z-dz),new THREE.Vector3(x,.028,z),new THREE.Vector3(x+dx,.012,z+dz)],.022,.008,{radial:7,segs:6,ridges:4}).geo,bark);
  put(limb([new THREE.Vector3(x+dx*.2,.026,z+dz*.2),new THREE.Vector3(x+dx*.2-sn*.05,.05,z+dz*.2+c*.05),new THREE.Vector3(x+dx*.2-sn*.08,.06,z+dz*.2+c*.08)],.008,.003,{radial:5,segs:4,ridges:2}).geo,bark);
 }
 const leafShape=new THREE.Shape();leafShape.moveTo(0,-.028);leafShape.quadraticCurveTo(.017,-.004,0,.028);leafShape.quadraticCurveTo(-.017,-.004,0,-.028);
 for(let i=0;i<8;i++){
  const a=random()*Math.PI*2,r=.16+random()*.26,geo=new THREE.ShapeGeometry(leafShape,3);
  // Dried and curled hard, edges up.
  const p=geo.attributes.position;for(let j=0;j<p.count;j++)p.setZ(j,p.getY(j)*p.getY(j)*7+Math.abs(p.getX(j))*.9);
  place(geo,Math.cos(a)*r,.004+i*.0004,Math.sin(a)*r,-Math.PI/2,random()*Math.PI*2,0,.7+random()*.4);
  const k=.75+random()*.4;
  put(geo,litter,(x,y,z)=>{const m=noise3(x*200+off,z*200,i)*.25+.85;return [DEADLEAF[0]*k*m,DEADLEAF[1]*k*m,DEADLEAF[2]*k*m];});
 }
 for(let i=0;i<3;i++){
  const a=random()*Math.PI*2,r=.22+random()*.15,c=Math.cos(a),sn=Math.sin(a),len=.06+random()*.05,b=a+1.4+random();
  const x=c*r,z=sn*r,dx=Math.cos(b)*len,dz=Math.sin(b)*len;
  put(limb([new THREE.Vector3(x-dx,.006,z-dz),new THREE.Vector3(x,.009,z),new THREE.Vector3(x+dx,.006,z+dz)],.005,.0025,{radial:5,segs:4,ridges:2}).geo,bark);
 }
 {
  // A low drift of ash on the scarred side, darkest near the trunk.
  const geo=new THREE.CircleGeometry(.2,20,0,Math.PI*2);
  const p=geo.attributes.position;for(let j=0;j<p.count;j++){const x=p.getX(j),y=p.getY(j);p.setXY(j,x*(1+noise3(x*9+off,y*9,1)*.5),y*(.7+noise3(x*9,y*9+off,2)*.4));}
  place(geo,Math.cos(scar)*.14,.003,Math.sin(scar)*.14,-Math.PI/2,-scar,0);
  put(geo,litter,(x,y,z)=>{const d=Math.hypot(x,z),k=.7+noise3(x*60+off,z*60,5)*.5;return mix(SOIL,ASH,Math.min(1,d/.25)).map(c=>c*k);});
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
   const f=paint||(material===bark?(x,y,z,n)=>barkColour(x,y,z,n,off,scar):()=>ASH);
   for(let i=0;i<p.count;i++){nrm.fromBufferAttribute(nor,i);const c=f(p.getX(i),p.getY(i),p.getZ(i),nrm);col[i*3]=c[0];col[i*3+1]=c[1];col[i*3+2]=c[2];}
   flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   return flat;
  });
  const geo=mergeGeometries(flats);flats.forEach(f=>f.dispose());geometries.push(geo);
  const mesh=new THREE.Mesh(geo,material);
  mesh.castShadow=material===bark;mesh.receiveShadow=true;
  mesh.userData.part=Object.keys(parts).find(key=>parts[key]===material);
  g.add(mesh);
 }
 g.userData.tips=tips.length;
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}

// Colours are given in sRGB and converted once.
const lin=(hex)=>{const c=new THREE.Color(hex);return [c.r,c.g,c.b];};
const BARK=lin(0x4b4540),FURROW=lin(0x1b1816),BLEACHED=lin(0x8f887c),CHAR=lin(0x0d0b0a),EMBERLINE=lin(0x3a2418),LICHEN=lin(0x6f7451),SOIL=lin(0x1c1612);
const HOLLOW=lin(0x050404),SPLINTER=lin(0xa69a83),ROPE=lin(0x5e5038),ASH=lin(0x55524d),DEADLEAF=lin(0x4a3f33);
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
function splinter(x,y,z,n){return mix(SPLINTER,BARK,Math.max(0,-n.y)*.6);}
function rope(x,y,z){const k=.8+Math.sin(y*260+x*40)*.12+noise3(x*90,y*90,z*90)*.15;return ROPE.map(c=>c*k);}

// Bark: ashen ridges over dark furrows, bleached pale on the upper, exposed faces and the
// thin outer limbs, the lightning scar burnt to charcoal down one side of the trunk with
// a rusty seared edge, sickly lichen here and there and damp soil where the roots go under.
function barkColour(x,y,z,n,off,scar){
 const furrow=noise3(x*55+off,y*7,z*55),mott=.82+noise3(x*18,y*18+off,z*18)*.3;
 let c=mix(FURROW,BARK,Math.min(1,Math.max(0,(furrow-.25)*1.6))).map(a=>a*mott);
 const exposed=Math.max(0,n.y)*.6+Math.min(1,Math.max(0,(y-.55)/.6))*.5;
 c=mix(c,BLEACHED,Math.min(.75,exposed*(.55+noise3(x*30,y*30+off,z*30)*.6)));
 // The scar runs down the trunk on one side, wandering a little.
 const h=Math.hypot(x,z);
 if(h<.16&&y<.78){
  let d=Math.atan2(z,x)-scar-(noise3(y*6+off,0,0)-.5)*.8;d=Math.atan2(Math.sin(d),Math.cos(d));
  const w=.32+.18*Math.sin(y*9+off);
  if(Math.abs(d)<w)c=mix(c,CHAR,.92);
  else if(Math.abs(d)<w+.16)c=mix(c,EMBERLINE,.6);
 }
 if(noise3(x*70,y*70+off,z*70)>.82&&y>.15&&y<.7)c=mix(c,LICHEN,.5);
 if(y<.03)c=mix(c,SOIL,Math.min(1,(.03-y)/.04));
 return c;
}
