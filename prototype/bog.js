import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A bog: a lumpy bed of peat mud sunk around two or three pools of black standing water,
// with clumps of reeds and cattails, flag leaves, a lily pad, duckweed and a few gas bubbles.
// The mud rises into hummocks between the pools and flattens to floor height at the tile
// edge so neighbouring bog tiles and plain floor meet without a step.
// Weathering is baked into vertex colours: dark wet mud sloping into the pools, paler dried
// crust with cracks on the hummocks, green algae scum, rotting leaves; stems that go from
// dark and wet at the waterline to straw at the tips; murky water with scum at the rims.
// Static parts are merged into one mesh per material (`userData.part` is mud, water or plants).
export function createBog(seed=0){
 const g=new THREE.Group();g.name='Bog';
 const materials=[],geometries=[];
 const mat=(o)=>{const m=new THREE.MeshStandardMaterial(o);materials.push(m);return m;};
 const mud=mat({vertexColors:true,roughness:.93});
 const water=mat({vertexColors:true,roughness:.07,metalness:.15});
 const plants=mat({vertexColors:true,roughness:.78,side:THREE.DoubleSide});
 const parts={mud,water,plants};
 const bins=new Map(Object.values(parts).map(m=>[m,[]]));
 const rand=(i)=>{const s=Math.sin(seed*12.9898+i*78.233)*43758.5453;return s-Math.floor(s);};
 const off=rand(99)*50;
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s=new THREE.Vector3();
 const place=(geo,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>geo.applyMatrix4(m4.compose(v.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s.set(sx,sy,sz)));
 // Each piece carries its own colour function, called with the world position and normal.
 const put=(geo,m,paint)=>{geo.userData.paint=paint;bins.get(m).push(geo);return geo;};

 // Pools: spread round the tile so they don't overlap, each with a wobbly rim.
 const WATER=.016;
 const pools=[];
 const count=2+(rand(1)>.45?1:0);
 for(let i=0;i<count;i++){
  const a=rand(2)*Math.PI*2+i*Math.PI*2/count+(rand(i+3)-.5)*.6,d=.12+rand(i+6)*.14;
  const r=.09+rand(i+9)*.06,sx=.75+rand(i+12)*.5,reach=r*1.4*Math.max(sx,1/sx),k=Math.min(1,Math.max(0,.44-reach)/d);
  pools.push({x:Math.cos(a)*d*k,z:Math.sin(a)*d*k,r,sx,phase:rand(i+15)*9});
 }
 const poolEdge=(p,x,z)=>{
  // >0 inside the pool, 0 at the rim; the rim wobbles with angle.
  const dx=(x-p.x)/p.sx,dz=(z-p.z)*p.sx,ang=Math.atan2(dz,dx);
  const rim=p.r*(1+.18*Math.sin(ang*3+p.phase)+.1*Math.sin(ang*5-p.phase*2));
  return 1-Math.hypot(dx,dz)/rim;
 };
 const wetness=(x,z)=>{let w=-1;for(const p of pools)w=Math.max(w,poolEdge(p,x,z));return w;};

 // Mud bed: a displaced sheet that dips under each pool and fades flat at the edge.
 const edgeFade=(x,z)=>Math.min(1,Math.max(0,(.49-Math.max(Math.abs(x),Math.abs(z)))/.07));
 const mudHeight=(x,z)=>{
  const lump=noise3(x*6+off,z*6,1)*.65+noise3(x*17,z*17+off,2)*.35;
  let h=.012+lump*.03;
  const w=wetness(x,z);
  if(w>-.35)h-=Math.min(1,(w+.35)/.45)*.032;
  return Math.max(.003,.004+(h-.004)*edgeFade(x,z));
 };
 {
  const bed=new THREE.PlaneGeometry(.98,.98,36,36);bed.rotateX(-Math.PI/2);
  const p=bed.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,mudHeight(x,z));}
  bed.computeVertexNormals();
  put(bed,mud,(x,y,z,n)=>mudColour(x,y,z,n,wetness(x,z),off));
  // A skirt down to the floor so the bed's edge isn't see-through from a low camera.
  for(let i=0;i<4;i++){const ry=i*Math.PI/2;
   put(place(new THREE.PlaneGeometry(.98,.006),Math.sin(ry)*.49,.003,Math.cos(ry)*.49,0,ry,0),mud,()=>[.03,.026,.016]);}
 }

 // Water: one wobbly disc per pool with a dark centre and scum towards the rim.
 for(const p of pools){
  const disc=new THREE.CircleGeometry(1,40,0,Math.PI*2);disc.rotateX(-Math.PI/2);
  const pos=disc.attributes.position;
  for(let i=0;i<pos.count;i++){
   const lx=pos.getX(i),lz=pos.getZ(i),ang=Math.atan2(lz*p.sx,lx/p.sx),k=Math.hypot(lx,lz);
   const rim=p.r*1.08*(1+.18*Math.sin(ang*3+p.phase)+.1*Math.sin(ang*5-p.phase*2));
   pos.setXYZ(i,p.x+Math.cos(ang)*k*rim*p.sx,WATER,p.z+Math.sin(ang)*k*rim/p.sx);
  }
  disc.computeVertexNormals();
  put(disc,water,(x,y,z)=>waterColour(x,z,poolEdge(p,x,z),off));
 }
 // Gas bubbles rising through the largest pool.
 const big=pools.reduce((a,b)=>a.r>b.r?a:b);
 for(let i=0;i<3;i++){
  const r=.008+rand(i+20)*.014,a=rand(i+23)*Math.PI*2,d=rand(i+26)*big.r*.5;
  put(place(new THREE.SphereGeometry(r,10,5,0,Math.PI*2,0,Math.PI/2),big.x+Math.cos(a)*d,WATER,big.z+Math.sin(a)*d),water,()=>[.05,.058,.035]);
 }

 // Lily pad with a notch, floating in the first pool, and duckweed specks on the others.
 {
  const p=pools[0],a=rand(30)*Math.PI*2,r=.035+rand(31)*.015;
  const pad=new THREE.CircleGeometry(r,18,.35,Math.PI*2-.5);pad.rotateX(-Math.PI/2);
  const pos=pad.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,Math.hypot(pos.getX(i),pos.getZ(i))*.06);
  pad.computeVertexNormals();
  const cx=p.x+Math.cos(a)*p.r*.35,cz=p.z+Math.sin(a)*p.r*.35;
  put(place(pad,cx,WATER+.002,cz,0,rand(32)*Math.PI*2),plants,(x,y,z)=>{
   const d=Math.hypot(x-cx,z-cz)/r,vein=Math.abs(Math.sin(Math.atan2(z-cz,x-cx)*6))<.12;
   const k=(.8+noise3(x*120+off,z*120,3)*.35)*(vein?1.25:1)*(d>.85?.8:1);
   return [.045*k,.11*k,.03*k];
  });
 }
 for(let i=0;i<14;i++){
  const p=pools[1+i%(pools.length-1)],a=rand(i+40)*Math.PI*2,d=Math.sqrt(rand(i+55))*p.r*.8;
  put(place(new THREE.CircleGeometry(.004+rand(i+70)*.004,6),p.x+Math.cos(a)*d*p.sx,WATER+.001,p.z+Math.sin(a)*d/p.sx,-Math.PI/2),plants,()=>[.07,.15,.03]);
 }

 // Reeds and cattails grow in two clumps on the mud between the pools.
 const reedPaint=(base,top)=>(x,y,z)=>{
  const t=Math.min(1,Math.max(0,(y-base)/(top-base)));
  const k=.85+noise3(x*200,y*40+off,z*200)*.3;
  // Dark and wet near the mud, green up the stem, dry straw at the tip.
  let c=t<.12?[.04,.05,.02]:[.07,.13,.035];
  if(t>.7){const f=(t-.7)/.3;c=[c[0]+(.2-c[0])*f,c[1]+(.16-c[1])*f,c[2]+(.07-c[2])*f];}
  return [c[0]*k,c[1]*k,c[2]*k];
 };
 const bent=(geo,h,lean,dir)=>{
  const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){const t=(pos.getY(i)+h/2)/h,b=lean*t*t;pos.setXYZ(i,pos.getX(i)+Math.cos(dir)*b,pos.getY(i)+h/2,pos.getZ(i)+Math.sin(dir)*b);}
  geo.computeVertexNormals();return geo;
 };
 const clumps=[];
 for(let c=0;c<2;c++){
  // Try spots until one is on dry mud away from the pools and the tile edge.
  let best=null;
  for(let k=0;k<12;k++){
   const x=(rand(c*20+k+80)-.5)*.72,z=(rand(c*20+k+81)-.5)*.72;
   const score=-wetness(x,z)-(clumps.length?Math.max(0,.3-Math.hypot(x-clumps[0].x,z-clumps[0].z))*4:0);
   if(!best||score>best.score)best={x,z,score};
  }
  clumps.push(best);
 }
 let stalk=0;
 for(const [c,clump] of clumps.entries()){
  const reeds=5+Math.floor(rand(c+120)*3);
  for(let i=0;i<reeds;i++,stalk++){
   const a=rand(stalk+130)*Math.PI*2,d=rand(stalk+160)*.06;
   const cattail=c===0&&i%2===0||c===1&&i===0;
   const h=.26+rand(stalk+190)*.3,lean=.03+rand(stalk+220)*.07,dir=a+(rand(stalk+250)-.5);
   const leanX=Math.cos(dir)*lean,leanZ=Math.sin(dir)*lean;
   // Keep the whole stem, bend and all, inside the tile.
   const reach=lean*(cattail?1:1.8)+.02,fit=(c0,l)=>THREE.MathUtils.clamp(c0+l*reach,-.46,.46)-l*reach;
   const x=fit(clump.x+Math.cos(a)*d,Math.cos(dir)),z=fit(clump.z+Math.sin(a)*d,Math.sin(dir));
   const base=mudHeight(x,z)-.004;
   if(cattail){
    // Cattail: a round stem with a brown sausage head and a thin spike above it.
    put(place(bent(new THREE.CylinderGeometry(.0035,.006,h,5,6),h,lean,dir),x,base,z),plants,reedPaint(base,base+h));
    const hx=x+leanX*.8,hz=z+leanZ*.8,tilt=Math.atan2(lean*1.6,h);
    put(place(new THREE.CapsuleGeometry(.012,.055,3,8),hx,base+h*.88,hz,Math.sin(dir)*tilt,0,-Math.cos(dir)*tilt),plants,(px,py,pz)=>{
     const k=.8+noise3(px*300+off,py*300,pz*300)*.4;return [.12*k,.06*k,.025*k];
    });
    put(place(new THREE.CylinderGeometry(.0008,.0018,.05,4),x+leanX,base+h+.03,z+leanZ,Math.sin(dir)*tilt,0,-Math.cos(dir)*tilt),plants,()=>[.16,.13,.06]);
   }else{
    // Flag leaf: a flat blade that arches over and twists a little.
    const blade=new THREE.BoxGeometry(.016,h,.0015,1,8,1);
    const pos=blade.attributes.position;
    for(let k=0;k<pos.count;k++){const t=(pos.getY(k)+h/2)/h;pos.setX(k,pos.getX(k)*(1-t*.85));}
    blade.rotateY(Math.PI/2-dir+(rand(stalk+280)-.5)*.6);
    put(place(bent(blade,h,lean*1.8,dir),x,base,z),plants,reedPaint(base,base+h*.95));
   }
  }
  // A few rotting leaves and a broken, floating stem around each clump.
  for(let i=0;i<3;i++){
   const a=rand(c*9+i+300)*Math.PI*2,d=.06+rand(c*9+i+310)*.08;
   const x=THREE.MathUtils.clamp(clump.x+Math.cos(a)*d,-.45,.45),z=THREE.MathUtils.clamp(clump.z+Math.sin(a)*d,-.45,.45);
   const leaf=new THREE.PlaneGeometry(.018,.05,1,3);
   const pos=leaf.attributes.position;for(let k=0;k<pos.count;k++)pos.setZ(k,Math.abs(pos.getX(k))*.3+pos.getY(k)**2*1.2);
   leaf.computeVertexNormals();
   put(place(leaf,x,Math.max(mudHeight(x,z),WATER)+.003,z,-Math.PI/2,0,rand(c*9+i+320)*Math.PI*2),plants,()=>{
    const k=.7+rand(c*9+i+330)*.5;return [.12*k,.08*k,.03*k];
   });
  }
 }
 {
  const p=pools[pools.length-1],len=.1+rand(340)*.05,a=rand(341)*Math.PI;
  put(place(new THREE.CylinderGeometry(.004,.004,len,5),p.x,WATER+.002,p.z,Math.PI/2,0,a),plants,()=>[.18,.14,.06]);
 }

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
    col[i*3]=c[0];col[i*3+1]=c[1];col[i*3+2]=c[2];
   }
   flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   return flat;
  });
  const geo=mergeGeometries(flats);flats.forEach(f=>f.dispose());geometries.push(geo);
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=material===plants;mesh.receiveShadow=true;
  mesh.userData.part=Object.keys(parts).find(key=>parts[key]===material);
  g.add(mesh);
 }
 // Pool shapes and the water level, for the rising-gas effect (bog-bubbles.js).
 g.userData.pools=pools.map(({x,z,r,sx})=>({x,z,r,sx}));g.userData.water=WATER;
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}

// Peat mud: dark brown-olive, wetter and darker down the slopes into the pools, with a
// pale cracked crust on the dry hummocks and patches of green algae near the water.
function mudColour(x,y,z,n,wet,off){
 const k=.8+noise3(x*30+off,z*30,5)*.35+(noise3(x*140,z*140+off,6)-.5)*.15;
 let r=.06*k,g=.05*k,b=.028*k;
 const damp=Math.min(1,Math.max(0,(wet+.3)/.3));
 r+=(.022-r)*damp;g+=(.024-g)*damp;b+=(.014-b)*damp;
 const crust=Math.min(1,Math.max(0,(y-.028)/.012))*(1-damp);
 if(crust>0){
  // Mud cracks: thin dark lines where two noise cells meet.
  const crack=Math.abs(noise3(x*38+off,z*38,7)-.5)<.035;
  const t=crust*(.6+.4*noise3(x*60,z*60+off,8));
  r+=(.13-r)*t;g+=(.11-g)*t;b+=(.07-b)*t;
  if(crack){r*=.45;g*=.45;b*=.45;}
 }
 const algae=Math.min(1,Math.max(0,(noise3(x*14+off,z*14,9)-.45)*4))*Math.max(0,1-Math.abs(wet+.12)/.2);
 if(algae>0){r+=(.05-r)*algae*.8;g+=(.1-g)*algae*.8;b+=(.025-b)*algae*.8;}
 if(n.y<.5){r*=.8;g*=.8;b*=.8;}
 return [r,g,b];
}

// Standing water: near-black peaty brown in the middle, greener scum near the rim.
function waterColour(x,z,inside,off){
 const k=.85+noise3(x*50+off,z*50,11)*.3;
 let r=.018*k,g=.022*k,b=.014*k;
 const scum=Math.max(0,1-Math.max(0,inside)/.35)*(.4+.6*noise3(x*45,z*45+off,12));
 r+=(.05-r)*scum*.7;g+=(.075-g)*scum*.7;b+=(.025-b)*scum*.7;
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
