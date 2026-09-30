import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A closed dungeon door: a ledged and braced plank leaf hung in a dressed stone frame.
// The front (+z) carries two strap hinges with rivets and forked ends, a ring pull on
// a round backplate, a lock plate and rows of nail heads. The back (-z) shows three
// ledges and two diagonal braces. The seed sets each plank's width, tint, warp and how
// ragged its foot is, where the jamb joints fall and how the grime and rust spread.
// Weathering is baked into vertex colours: vertical grain and knots, damp and rot low
// down, a dark polished patch round the ring, rust weeping under the ironwork, and
// soot on the lintel. The door runs along x and is thin in z; the caller turns it to
// follow the wall. Static parts merge into one mesh per material (`userData.part` is
// wood, iron or stone). The frame (stone, plus the iron pintles it carries) sits on the
// group itself; the leaf (wood and iron) hangs in its own child group, `userData.leaf`,
// whose origin is the hinge axis through the knuckles, so turning `leaf.rotation.y`
// swings the door open about its pintles. The knuckles are on the front, so the leaf
// opens towards +z (negative angles) and clears the jamb out to `DOOR_LEAF.open`; past
// about -π/2 it would run into the jamb's front face.
export const DOOR_LEAF={width:.8,height:.95,bottom:.03,open:-1.5};
export function createDoor(seed=0){
 const g=new THREE.Group();g.name='Door';
 const materials=[],geometries=[];
 const mat=(o)=>{const m=new THREE.MeshStandardMaterial(o);materials.push(m);return m;};
 const wood=mat({vertexColors:true,roughness:.86});
 const iron=mat({vertexColors:true,metalness:.6,roughness:.52});
 const stone=mat({vertexColors:true,roughness:.93});
 const parts={wood,iron,stone};
 const bins=new Map(Object.values(parts).map(m=>[m,[]]));
 const rand=(i)=>{const s=Math.sin(seed*12.9898+i*78.233)*43758.5453;return s-Math.floor(s);};
 const off=rand(99)*50;
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s=new THREE.Vector3();
 const place=(geo,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>geo.applyMatrix4(m4.compose(v.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s.set(sx,sy,sz)));
 const put=(geo,m,tint=1,paint)=>{geo.userData.tint=tint;geo.userData.paint=paint;bins.get(m).push(geo);return geo;};
 const roughen=(geo,amt)=>{
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   p.setXYZ(i,x+(noise3(x*31+off,y*31,z*31)-.5)*amt*2,y+(noise3(y*29+7,z*29,x*29+off)-.5)*amt*2,z+(noise3(z*33+3+off,x*33,y*33)-.5)*amt*2);
  }
  geo.computeVertexNormals();
  return geo;
 };
 const rbox=(w,h,d,r,segs=2)=>new RoundedBoxGeometry(w,h,d,segs,Math.min(r,w/2-1e-4,h/2-1e-4,d/2-1e-4));

 // Frame: each jamb is three or four stacked blocks with seeded joints, under a lintel
 // that overhangs them, on a worn threshold slab.
 const {width:W,height:H,bottom:B}=DOOR_LEAF,JAMB=.084,JX=W/2+JAMB/2+.003,TOP=B+H+.006,DEPTH=.22;
 for(const side of [-1,1]){
  const count=3+Math.floor(rand(side+3)*2);let y=0;
  for(let i=0;i<count;i++){
   const h=i===count-1?TOP-y:(TOP/count)*(.8+rand(side*7+i)*.4);
   const w=JAMB+(i%2?-.006:.008);
   put(roughen(place(rbox(w,h-.006,DEPTH+(i%2?0:.014),.012),side*JX,y+h/2,0),.003),stone,.9+rand(side*13+i)*.16);
   y+=h;
  }
 }
 const LINTEL=.11;
 put(roughen(place(rbox(.98,LINTEL,DEPTH+.03,.014),0,TOP+LINTEL/2,0),.0035),stone,.96);
 put(roughen(place(rbox(W+.02,.024,DEPTH-.02,.008),0,.012,0),.002),stone,.88);

 // Leaf: five to six vertical planks of seeded widths, each warped a little out of
 // plane and ragged along the foot where it has rotted and been kicked.
 const T=.07,plankCount=5+Math.floor(rand(5)*2);
 const widths=Array.from({length:plankCount},(_,i)=>.85+rand(20+i)*.3),sum=widths.reduce((a,b)=>a+b,0);
 let px=-W/2;
 const seams=[];
 for(let i=0;i<plankCount;i++){
  const w=widths[i]/sum*W,gap=.005;
  const geo=rbox(w-gap,H,T,.01,2);
  geo.translate(px+w/2,B+H/2,0);
  const p=geo.attributes.position,cup=(rand(30+i)-.5)*.014,rot=.3+rand(40+i)*.7;
  for(let k=0;k<p.count;k++){
   let x=p.getX(k),y=p.getY(k),z=p.getZ(k);
   const u=(x-(px+w/2))/(w/2);
   z+=cup*(1-u*u)*Math.sign(z||1)*.5+cup*Math.sin((y-B)/H*Math.PI)*.4;
   if(y<B+.03){const bite=noise3(x*40+off,i*3,z*20)*rot*.035;y=Math.max(B-.004,y+bite*(1-(y-B)/.03));}
   p.setXYZ(k,x,y,z);
  }
  geo.computeVertexNormals();
  put(geo,wood,.88+rand(50+i)*.22);
  if(i)seams.push(px);
  px+=w;
 }

 // Back: three ledges and two braces rising towards the latch side, pegged at the ends.
 const LEDGES=[B+.16,B+H/2,B+H-.16],BZ=-T/2-.017;
 for(const y of LEDGES)put(roughen(place(rbox(W-.06,.1,.032,.008),0,y,BZ),.0015),wood,.95+rand(y*9)*.1);
 for(let i=0;i<2;i++){
  const y0=LEDGES[i]+.045,y1=LEDGES[i+1]-.045,x0=-W/2+.09,x1=W/2-.09;
  const len=Math.hypot(x1-x0,y1-y0),ang=Math.atan2(y1-y0,x1-x0);
  put(roughen(place(rbox(len,.085,.028,.007),(x0+x1)/2,(y0+y1)/2,BZ+.002,0,0,ang),.0015),wood,.92+rand(60+i)*.1);
 }
 for(const y of LEDGES)for(const x of [-W/2+.07,W/2-.07])put(place(new THREE.CylinderGeometry(.009,.009,.01,6),x,y,BZ-.017,Math.PI/2),wood,.7);

 // Front ironwork: strap hinges running from the hinge side, with forked ends and rivets.
 const FZ=T/2+.006,HINGES=[B+.17,B+H-.17],strapEnd=W*.18,HX=-W/2+.014,HZ=FZ+.004;
 for(const y of HINGES){
  const len=strapEnd+W/2;
  put(place(rbox(len,.046,.012,.004),-W/2+len/2,y,FZ),iron);
  for(const d of [-1,1])put(place(rbox(.07,.022,.011,.004),strapEnd+.026,y+d*.017,FZ,0,0,d*.45),iron);
  put(place(new THREE.SphereGeometry(.018,8,5),strapEnd+.004,y,FZ+.003,0,0,0,1,1,.5),iron);
  const rivets=6;
  for(let r=0;r<rivets;r++){
   const x=-W/2+.05+r*(len-.09)/(rivets-1);
   put(place(new THREE.SphereGeometry(.0105,6,3,0,Math.PI*2,0,Math.PI/2),x,y,FZ+.006,Math.PI/2,0,0,1,.6,1),iron);
  }
  // Knuckle rolled round the pintle at the hinge edge.
  put(place(new THREE.CylinderGeometry(.016,.016,.075,10),HX,y,HZ),iron);
  // Pintle: a square spike leaded into the jamb, with the pin rising through the knuckle
  // and poking out above it. It belongs to the frame, so it stays put as the leaf swings.
  put(place(rbox(.052,.024,.022,.004),-W/2-.004,y-.049,HZ-.004),stone,1,ironColour);
  put(place(new THREE.CylinderGeometry(.0075,.0075,.11,6),HX,y-.004,HZ),stone,1,ironColour);
  put(place(new THREE.SphereGeometry(.009,6,3,0,Math.PI*2,0,Math.PI/2),HX,y+.051,HZ),stone,1,ironColour);
  put(roughen(place(new THREE.CylinderGeometry(.02,.022,.006,8),-W/2-.004,y-.049,HZ-.004,0,0,Math.PI/2),.001),stone,.55);
 }

 // Ring pull on a round backplate, hanging slightly askew, with a lock plate above it.
 const RX=W/2-.13,RY=B+H*.5;
 put(place(new THREE.CylinderGeometry(.042,.045,.008,16),RX,RY+.02,FZ,Math.PI/2),iron);
 put(place(new THREE.CylinderGeometry(.01,.012,.022,8),RX,RY+.02,FZ+.012,Math.PI/2),iron);
 put(place(new THREE.TorusGeometry(.045,.0085,6,16),RX,RY-.025,FZ+.024,-.35+rand(7)*.2,0,(rand(8)-.5)*.3),iron);
 put(place(rbox(.06,.1,.01,.004),RX,RY+.13,FZ),iron);
 put(place(rbox(.012,.03,.006,.002),RX,RY+.128,FZ+.007),iron,.2);
 put(place(new THREE.CylinderGeometry(.009,.009,.006,8),RX,RY+.15,FZ+.007,Math.PI/2),iron,.2);

 // Nail heads: rows of pyramid clavos across each plank where the ledges sit behind.
 for(const y of LEDGES){
  if(HINGES.some(h=>Math.abs(h-y)<.06))continue;
  let x=-W/2;
  for(let i=0;i<plankCount;i++){
   const w=widths[i]/sum*W;
   for(const f of [.3,.7]){
    if(Math.abs(x+w*f-RX)<.07&&Math.abs(y-RY)<.12)continue;
    put(place(new THREE.ConeGeometry(.012,.009,4),x+w*f,y+(rand(i*5+y*20)-.5)*.01,FZ-.002,Math.PI/2,0,Math.PI/4),iron);
   }
   x+=w;
  }
 }

 // Bake: strip to position and normal, paint vertex colours, merge one mesh per material.
 const n=new THREE.Vector3();
 const ctx={off,seams,W,B,H,T,HINGES,RX,RY,JX,TOP};
 const painters={wood:woodColour,iron:ironColour,stone:stoneColour};
 const leaf=new THREE.Group();leaf.name='DoorLeaf';leaf.position.set(HX,0,HZ);g.add(leaf);
 for(const [material,list] of bins){
  const part=Object.keys(parts).find(key=>parts[key]===material);
  const flats=list.map(geo=>{
   const tint=geo.userData.tint,paint=geo.userData.paint||painters[part];
   const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
   for(const key of Object.keys(flat.attributes))if(!['position','normal'].includes(key))flat.deleteAttribute(key);
   const p=flat.attributes.position,nor=flat.attributes.normal,col=new Float32Array(p.count*3);
   for(let i=0;i<p.count;i++){n.fromBufferAttribute(nor,i);const c=paint(p.getX(i),p.getY(i),p.getZ(i),n,ctx);col[i*3]=c[0]*tint;col[i*3+1]=c[1]*tint;col[i*3+2]=c[2]*tint;}
   flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   return flat;
  });
  const geo=mergeGeometries(flats);flats.forEach(f=>f.dispose());geometries.push(geo);
  // Colours are baked in door space above; the leaf's parts then move into hinge space.
  const onLeaf=part!=='stone';if(onLeaf)geo.translate(-HX,0,-HZ);
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.userData.part=part;
  (onLeaf?leaf:g).add(mesh);
 }
 g.userData.leaf=leaf;
 g.userData.hinge={x:HX,z:HZ,pins:HINGES.slice()};
 g.userData.planks=plankCount;
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}

// Oak planks: warm brown with long vertical grain and the odd knot, darker in the seams,
// soaked dark and greenish at the foot, bleached a little at the top, a dark hand-polished
// patch round the ring and orange-brown rust weeping down from each strap.
function woodColour(x,y,z,n,c){
 const {off,seams,B,H,HINGES,RX,RY}=c;
 const grain=noise3(x*70+off,y*3.5,z*40)*.6+noise3(x*190,y*9+off,z*90)*.4;
 let k=.72+grain*.42;
 const knot=noise3(x*9+off,y*9,3);if(knot>.82)k*=1-(knot-.82)*3.2;
 let r=.2*k,g=.12*k,b=.06*k;
 let seam=1;for(const s of seams)seam=Math.min(seam,Math.abs(x-s)/.012);
 if(seam<1&&Math.abs(n.z)<.9){r*=.55;g*=.55;b*=.55;}else if(seam<1){const t=.72+.28*seam;r*=t;g*=t;b*=t;}
 const low=Math.max(0,1-(y-B)/.2);
 if(low>0){const t=low*(.55+.45*noise3(x*30+off,y*30,z*30));r+=(.05-r)*t*.75;g+=(.052-g)*t*.75;b+=(.03-b)*t*.75;}
 const high=Math.max(0,(y-(B+H*.75))/(H*.25));if(high>0){r+=(.26-r)*high*.25;g+=(.22-g)*high*.25;b+=(.17-b)*high*.25;}
 if(n.z>.5){
  const d=Math.hypot(x-RX,(y-RY)*1.2);
  if(d<.11){const t=(1-d/.11)*.6;r*=1-t*.5;g*=1-t*.55;b*=1-t*.6;}
  for(const h of HINGES){
   const below=h-y;
   if(below>0&&below<.16&&x<c.W*.2){
    const streak=noise3(x*55+off,0,h*9)>.45?1:0;
    const t=streak*(1-below/.16)*.7;r+=(.2-r)*t;g+=(.085-g)*t;b+=(.03-b)*t;
   }
  }
 }
 if(n.y<-.5){r*=.6;g*=.6;b*=.6;}
 return [r,g,b];
}

// Forged iron: near-black with a hammered mottle and rust patches, rust heavier on the
// lower hinge, rubbed paler on the ring where hands take hold.
function ironColour(x,y,z,n,c){
 const {off,B,RX,RY}=c;
 const k=.85+noise3(x*40+off,y*40,z*40)*.3;
 let r=.032*k,g=.035*k,b=.038*k;
 const patch=noise3(x*24+off,y*24,z*24+5)*.75+noise3(x*80,y*80+off,z*80)*.25;
 const low=Math.max(0,1-(y-B)/.4);
 const rust=Math.min(1,Math.max(0,(patch+low*.3-.6)*3));
 if(rust>0){r+=(.21-r)*rust;g+=(.085-g)*rust;b+=(.03-b)*rust;}
 const ring=Math.hypot(x-RX,y-(RY-.025));
 if(ring<.06&&ring>.03&&y<RY-.03){const t=.7;r+=(.1-r)*t;g+=(.1-g)*t;b+=(.1-b)*t;}
 if(n.y<-.5){r*=.6;g*=.6;b*=.6;}
 return [r,g,b];
}

// Dressed stone: mottled grey matching the walls, grimy at the foot, sooted under
// the lintel's front edge, and a worn, paler dip in the middle of the threshold.
function stoneColour(x,y,z,n,c){
 const {off,TOP}=c;
 let k=.8+noise3(x*16+off,y*16,z*16)*.28+(noise3(x*90,y*90+off,z*90)-.5)*.12;
 if(n.y>.6)k*=1.06;
 if(n.y<-.5)k*=.55;
 let r=.29*k,g=.33*k,b=.32*k;
 const grime=Math.max(0,1-y/.18);if(grime>0){const t=grime*.45;r*=1-t;g*=1-t*1.05;b*=1-t*1.1;}
 if(y>TOP-.05&&n.z>-.2){const soot=Math.min(1,(y-TOP+.05)/.1)*noise3(x*12+off,y*12,z*12)*.6;r*=1-soot;g*=1-soot;b*=1-soot;}
 if(y<.03&&n.y>.6){const t=Math.max(0,1-Math.abs(x)/.25)*.35;r+=(.4-r)*t;g+=(.42-g)*t;b+=(.4-b)*t;}
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
