import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Floor ice: a clear, faintly rippled sheet frozen over the floor, with white fracture
// planes running down into it from branching surface cracks (and sometimes a star-shaped
// impact), strings of trapped air bubbles and a frozen-in pebble or leaf seen through
// the ice, feathery frost patches and a little drifted snow on top.
// The sheet's colour is baked into vertex colours: dark clear "black ice" patches, the
// usual pale blue, and milky white where air is trapped. The sheet stays flat at the tile
// edge so neighbouring ice tiles meet without a step.
// The sheet sits on an opaque block of frozen depth (dark blue-green, with pale veils and
// sunken fracture shadows) that replaces the floor slab, so the ice never reads as a
// thin film over flagstones (`userData.hidesFloor`).
// Static parts are merged into one mesh per material (`userData.part` is depth, ice or frost).
export function createIceFloor(seed=0){
 const g=new THREE.Group();g.name='Floor ice';
 const materials=[],geometries=[];
 const depth=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.3,metalness:.05,emissive:0x0a2334,emissiveIntensity:.5});
 const ice=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.04,metalness:.05,clearcoat:1,clearcoatRoughness:.05,specularIntensity:1,transparent:true,opacity:.66,emissive:0x163a52,emissiveIntensity:.25});
 const frost=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85});
 materials.push(depth,ice,frost);
 const parts={depth,ice,frost};
 const bins=new Map(Object.values(parts).map(m=>[m,[]]));
 const rand=(i)=>{const s=Math.sin(seed*12.9898+i*78.233)*43758.5453;return s-Math.floor(s);};
 const off=rand(99)*50;
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s=new THREE.Vector3();
 const place=(geo,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>geo.applyMatrix4(m4.compose(v.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s.set(sx,sy,sz)));
 const put=(geo,m,paint)=>{geo.userData.paint=paint;bins.get(m).push(geo);return geo;};
 const clamp=(x,lim=.45)=>THREE.MathUtils.clamp(x,-lim,lim);

 // Sheet: a slab whose top ripples very slightly (frozen wavelets) and flattens at the edge.
 const TOP=.018;
 const edgeFade=(x,z)=>Math.min(1,Math.max(0,(.49-Math.max(Math.abs(x),Math.abs(z)))/.08));
 const top=(x,z)=>TOP+(noise3(x*9+off,z*9,1)-.5)*.002*edgeFade(x,z);
 {
  const sheet=new THREE.PlaneGeometry(.98,.98,28,28);sheet.rotateX(-Math.PI/2);
  const p=sheet.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,top(p.getX(i),p.getZ(i)));
  sheet.computeVertexNormals();
  put(sheet,ice,(x,y,z)=>iceColour(x,z,off));
  // The frozen depth underneath, filling the floor slab's place (its top is y -.03,
  // its bottom -.17) and reaching just under the sheet.
  const block=new THREE.BoxGeometry(.98,.17,.98,12,1,12);block.translate(0,-.17/2,0);
  put(block,depth,(x,y,z,n)=>depthColour(x,y,z,n,off));
  for(let i=0;i<4;i++){const ry=i*Math.PI/2;
   put(place(new THREE.PlaneGeometry(.98,TOP),Math.sin(ry)*.49,TOP/2,Math.cos(ry)*.49,0,ry,0),ice,(x,y,z)=>iceColour(x,z,off).map(c=>c*.8));}
 }

 // Cracks: branching polylines on the surface, each segment a thin white fracture plane
 // that reaches down into the sheet so it reads as depth through the clear ice.
 const crackPaint=(x,y,z)=>{const k=.85+noise3(x*200+off,y*300,z*200)*.3,d=Math.min(1,(TOP-y)/TOP);return [.78*k-.2*d,.88*k-.12*d,.96*k-.06*d];};
 const crack=(x,z,a,steps,width,depth)=>{
  for(let j=0;j<steps;j++){
   const len=.05+rand(x*97+z*61+j*13)*.09;a+=(rand(x*53+z*29+j*7)-.5)*1.1;
   const nx=clamp(x+Math.cos(a)*len,.46),nz=clamp(z+Math.sin(a)*len,.46),l=Math.hypot(nx-x,nz-z);
   if(l<.005)break;
   const d=depth*(1-j/(steps+1));
   put(place(new THREE.BoxGeometry(l,d,width),(x+nx)/2,TOP+.0012-d/2,(z+nz)/2,0,-Math.atan2(nz-z,nx-x),0),frost,crackPaint);
   x=nx;z=nz;
  }
  return [x,z,a];
 };
 const crackCount=3+Math.floor(rand(1)*2);
 for(let i=0;i<crackCount;i++){
  const x=(rand(i+2)-.5)*.6,z=(rand(i+6)-.5)*.6,a=rand(i+10)*Math.PI*2;
  const [bx,bz,ba]=crack(x,z,a,3+Math.floor(rand(i+14)*3),.0035,.014);
  // A finer branch off the end and one heading the other way from the start.
  crack(bx,bz,ba+(rand(i+18)>.5?1:-1)*(.6+rand(i+22)*.5),2,.0022,.008);
  crack(x,z,a+Math.PI+(rand(i+26)-.5)*.8,2,.0028,.011);
  // Its shadow on the depth below, offset a little as if seen through the ice.
  put(place(new THREE.PlaneGeometry(.012,.012),x,.0006,z,-Math.PI/2,0,a),depth,()=>[.03,.09,.14]);
 }
 if(rand(30)>.55){
  // An impact star: short cracks radiating from one point, with a milky crushed spot.
  const cx=(rand(31)-.5)*.5,cz=(rand(32)-.5)*.5,arms=5+Math.floor(rand(33)*3);
  for(let i=0;i<arms;i++)crack(cx,cz,i*Math.PI*2/arms+rand(34+i)*.5,2,.0024,.012);
  put(place(new THREE.CircleGeometry(.018,10),cx,TOP+.0018,cz,-Math.PI/2),frost,()=>[.86,.92,.96]);
 }

 // Trapped air: strings of small flattened bubbles rising at a slant through the sheet.
 const bubblePaint=(x,y,z,n)=>{const k=n.y>.3?1:.75;return [.82*k,.9*k,.95*k];};
 for(let i=0;i<3;i++){
  let x=(rand(i+40)-.5)*.7,z=(rand(i+44)-.5)*.7;const a=rand(i+48)*Math.PI*2;
  const count=4+Math.floor(rand(i+52)*4);
  for(let j=0;j<count;j++){
   const r=.003+rand(i*11+j+56)*.006,y=.004+(j/count)*.009;
   put(place(new THREE.SphereGeometry(r,8,5),clamp(x),y,clamp(z),0,0,0,1,.45,1),frost,bubblePaint);
   x+=Math.cos(a)*(.012+rand(i*11+j+60)*.012);z+=Math.sin(a)*(.012+rand(i*11+j+64)*.012);
  }
 }
 // Something frozen in: a pebble or a dead leaf, sitting low in the sheet.
 {
  const x=(rand(70)-.5)*.6,z=(rand(71)-.5)*.6;
  if(rand(72)>.5){
   const pebble=new THREE.IcosahedronGeometry(.018+rand(73)*.01,1);
   const pos=pebble.attributes.position;
   for(let i=0;i<pos.count;i++){const k=.85+noise3(pos.getX(i)*80+off,pos.getY(i)*80,pos.getZ(i)*80)*.3;pos.setXYZ(i,pos.getX(i)*k,pos.getY(i)*k*.35,pos.getZ(i)*k);}
   pebble.computeVertexNormals();
   put(place(pebble,x,.009,z,0,rand(74)*Math.PI,0),frost,(px,py,pz)=>{const k=.8+noise3(px*150+off,py*150,pz*150)*.4;return [.12*k,.11*k,.1*k];});
  }else{
   const leaf=new THREE.PlaneGeometry(.028,.06,1,4);
   const pos=leaf.attributes.position;for(let i=0;i<pos.count;i++){const t=pos.getY(i)/.03;pos.setX(i,pos.getX(i)*(1-t*t*.8));pos.setZ(i,Math.abs(pos.getX(i))*.25);}
   leaf.computeVertexNormals();
   put(place(leaf,x,.007,z,-Math.PI/2,0,rand(75)*Math.PI*2),frost,(px,py,pz)=>{const k=.75+noise3(px*200+off,pz*200,3)*.5;return [.2*k,.08*k,.025*k];});
  }
 }

 // Frost: flat patches with ragged, feathered edges, and fern-like frost strokes.
 const frostPaint=(x,y,z)=>{const k=.9+noise3(x*160+off,z*160,5)*.12;return [.9*k,.95*k,1*Math.min(1,k)];};
 for(let i=0;i<4;i++){
  const cx=(rand(i+80)-.5)*.72,cz=(rand(i+84)-.5)*.72,r=.035+rand(i+88)*.05;
  const patch=new THREE.CircleGeometry(1,20);
  const pos=patch.attributes.position;
  for(let k=0;k<pos.count;k++){
   const px=pos.getX(k),py=pos.getY(k),ang=Math.atan2(py,px),d=Math.hypot(px,py);
   const rim=r*(.75+.25*noise3(Math.cos(ang)*3+off+i*7,Math.sin(ang)*3,6)+.12*Math.sin(ang*7+i));
   // Local +y becomes world -z once the patch is laid flat.
   pos.setXY(k,clamp(cx+Math.cos(ang)*d*rim,.47)-cx,cz-clamp(cz+Math.sin(ang)*d*rim,.47));
  }
  put(place(patch,cx,TOP+.0015+i*.0002,cz,-Math.PI/2),frost,frostPaint);
  // Two or three feathery fronds growing out of each patch.
  for(let f=0;f<2+Math.floor(rand(i+92)*2);f++){
   let x=cx,z=cz,a=rand(i*5+f+96)*Math.PI*2;
   for(let j=0;j<4;j++){
    const len=.02+rand(i*17+f*5+j+100)*.02,nx=clamp(x+Math.cos(a)*len,.47),nz=clamp(z+Math.sin(a)*len,.47);
    put(place(new THREE.PlaneGeometry(Math.hypot(nx-x,nz-z)+.001,.0035*(1-j*.2)),(x+nx)/2,TOP+.0023,(z+nz)/2,-Math.PI/2,0,-Math.atan2(nz-z,nx-x)),frost,frostPaint);
    for(const side of [-1,1]){
     const ba=a+side*.9,bl=len*.45,mx=(x+nx)/2,mz=(z+nz)/2;
     put(place(new THREE.PlaneGeometry(bl,.0018),clamp(mx+Math.cos(ba)*bl/2,.47),TOP+.0024,clamp(mz+Math.sin(ba)*bl/2,.47),-Math.PI/2,0,-ba),frost,frostPaint);
    }
    x=nx;z=nz;a+=(rand(i*17+f*5+j+120)-.5)*.7;
   }
  }
 }
 // A small drift of powder snow in some tiles, and a few loose crystals.
 if(rand(140)>.45){
  const a=rand(141)*Math.PI*2,d=.22+rand(142)*.1,x=Math.cos(a)*d,z=Math.sin(a)*d,r=.07+rand(143)*.05;
  const drift=new THREE.SphereGeometry(1,16,6,0,Math.PI*2,0,Math.PI/2);
  const pos=drift.attributes.position;
  for(let k=0;k<pos.count;k++){const k2=.85+noise3(pos.getX(k)*4+off,pos.getZ(k)*4,7)*.3;pos.setXYZ(k,pos.getX(k)*k2,pos.getY(k),pos.getZ(k)*k2);}
  drift.computeVertexNormals();
  const sx=r*(1.3+rand(144)*.5),sz=r*.8,reach=Math.max(sx,sz)*1.15,k=Math.min(1,(.46-reach)/d);
  put(place(drift,x*k,TOP-.002,z*k,0,a+Math.PI/2,0,sx,.018+rand(145)*.012,sz),frost,(px,py,pz,n)=>{const kk=.92+noise3(px*90+off,py*90,pz*90)*.1;const sh=n.y<.6?.85:1;return [.92*kk*sh,.95*kk*sh,.98*sh];});
 }
 for(let i=0;i<6;i++)put(place(new THREE.OctahedronGeometry(.003+rand(i+150)*.003),(rand(i+156)-.5)*.86,TOP+.002,(rand(i+162)-.5)*.86,rand(i+168),rand(i+174),0),frost,()=>[.95,.98,1]);

 // Bake: strip to position and normal, paint vertex colours, merge one mesh per material.
 const n=new THREE.Vector3();
 for(const [material,list] of bins){
  const flats=list.map(geo=>{
   const paint=geo.userData.paint;
   const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
   for(const key of Object.keys(flat.attributes))if(!['position','normal'].includes(key))flat.deleteAttribute(key);
   const p=flat.attributes.position,nor=flat.attributes.normal,col=new Float32Array(p.count*3);
   for(let i=0;i<p.count;i++){
    n.fromBufferAttribute(nor,i);
    const c=paint(p.getX(i),p.getY(i),p.getZ(i),n);
    col[i*3]=Math.min(1,Math.max(0,c[0]));col[i*3+1]=Math.min(1,Math.max(0,c[1]));col[i*3+2]=Math.min(1,Math.max(0,c[2]));
   }
   flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   return flat;
  });
  const geo=mergeGeometries(flats);flats.forEach(f=>f.dispose());geometries.push(geo);
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=false;mesh.receiveShadow=true;
  mesh.userData.part=Object.keys(parts).find(key=>parts[key]===material);
  g.add(mesh);
 }
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}

// The depth block: dark blue-green on top with paler drowned veils where the water froze
// in layers, and the sides fading darker toward the bottom.
function depthColour(x,y,z,n,off){
 const veil=noise3(x*6+off,z*6,21),fine=noise3(x*30,z*30+off,22);
 if(n.y>.5){
  const k=Math.min(1,Math.max(0,(veil-.55)*3));
  return [.05+.2*k+.03*fine,.18+.28*k+.04*fine,.28+.3*k+.05*fine];
 }
 const t=Math.min(1,Math.max(0,-y/.17));
 return [.12-.08*t,.3-.18*t,.42-.2*t];
}

// The sheet: pale blue, with dark clear patches of black ice and milky white where air
// is trapped, plus faint streaks where it froze in layers.
function iceColour(x,z,off){
 const big=noise3(x*5+off,z*5,11),fine=noise3(x*40,z*40+off,12);
 let r=.42,g=.7,b=.94;
 const clear=Math.min(1,Math.max(0,(.4-big)*4));
 r+=(.08-r)*clear;g+=(.3-g)*clear;b+=(.52-b)*clear;
 const milk=Math.min(1,Math.max(0,(big-.62)*4))*(.6+.4*fine);
 r+=(.84-r)*milk;g+=(.91-g)*milk;b+=(.95-b)*milk;
 const streak=Math.sin((x*.8+z*.6)*60+noise3(x*8,z*8+off,13)*6)*.03;
 return [r+streak,g+streak,b+streak*.5];
}

function hash3(x,y,z){const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s);}
function noise3(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
 const fx=x-ix,fy=y-iy,fz=z-iz,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy),uz=fz*fz*(3-2*fz);
 const l=(a,b,t)=>a+(b-a)*t;
 const c=(dx,dy,dz)=>hash3(ix+dx,iy+dy,iz+dz);
 return l(l(l(c(0,0,0),c(1,0,0),ux),l(c(0,1,0),c(1,1,0),ux),uy),l(l(c(0,0,1),c(1,0,1),ux),l(c(0,1,1),c(1,1,1),ux),uy),uz);
}
