import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Gas spores and the flaming and freezing spheres share the floating eye's letter,
// so they used to fall back on it with a recoloured iris. Each now has its own look:
// - gas spore: a lumpy grey puffball with pale warts, a torn pore on top, root
//   threads hanging below and a few spores drifting round it (1 draw);
// - flaming sphere: a white-hot core wrapped in tongues of flame that curl upward
//   and fade, with embers above (2 draws: the core, and the unlit flames);
// - freezing sphere: a pale glowing core caged in radiating ice crystals, with a
//   ring of frost motes (2 draws: the core, and the ice).
// Every static part is one merged, vertex-coloured mesh. The geometry and materials
// are built once per kind and shared, like the dragon segments in creatures.js.
// The glowing core is returned as `core`, which live.js pulses.
const LIFT=.58;

function rng(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}

// Collects non-indexed, vertex-coloured pieces for merging. `colour` gets the local
// position after `matrix` and returns [r,g,b] or [r,g,b,a].
function pieces(alpha=false){
 const list=[],n=alpha?4:3;
 return {
  add(geo,matrix,colour){
   const flat=geo.index?geo.toNonIndexed():geo.clone();geo.dispose();
   for(const key of Object.keys(flat.attributes))if(key!=='position'&&key!=='normal')flat.deleteAttribute(key);
   if(matrix)flat.applyMatrix4(matrix);
   const p=flat.attributes.position,col=new Float32Array(p.count*n);
   for(let i=0;i<p.count;i++){const c=colour(p.getX(i),p.getY(i),p.getZ(i),i);for(let k=0;k<n;k++)col[i*n+k]=THREE.MathUtils.clamp(c[k]??1,0,1);}
   flat.setAttribute('color',new THREE.BufferAttribute(col,n));
   list.push(flat);
  },
  merge(){const geo=mergeGeometries(list);list.forEach(g=>g.dispose());return geo;},
 };
}
const place=(pos,dir,scale=[1,1,1],spin=0)=>{
 const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());
 if(spin)q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),spin));
 return new THREE.Matrix4().compose(pos,q,new THREE.Vector3(...scale));
};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const rgb=(hex)=>{const c=new THREE.Color(hex);return [c.r,c.g,c.b];};
// Pushes every vertex of an indexed sphere out by `bump(dir)` and smooths the normals.
function lumpy(radius,detail,bump){
 const geo=new THREE.IcosahedronGeometry(radius,detail),p=geo.attributes.position,v=new THREE.Vector3();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const d=v.clone().normalize();v.copy(d).multiplyScalar(radius*(1+bump(d)));p.setXYZ(i,v.x,v.y,v.z);}
 const merged=mergeVerticesSafe(geo);merged.computeVertexNormals();return merged;
}
// IcosahedronGeometry is non-indexed; weld it so displaced faces stay joined and smooth.
function mergeVerticesSafe(geo){
 const p=geo.attributes.position,map=new Map(),pos=[],index=[];
 for(let i=0;i<p.count;i++){
  const key=`${Math.round(p.getX(i)*1e5)},${Math.round(p.getY(i)*1e5)},${Math.round(p.getZ(i)*1e5)}`;
  let k=map.get(key);if(k===undefined){k=pos.length/3;map.set(key,k);pos.push(p.getX(i),p.getY(i),p.getZ(i));}
  index.push(k);
 }
 geo.dispose();
 const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));out.setIndex(index);return out;
}
const wave=(d,a,b,c)=>Math.sin(d.x*a+1.3)*Math.sin(d.y*b+.4)*Math.sin(d.z*c+2.1);

// ---- gas spore ----
function gasSporeGeometry(){
 const r=rng(71),P=pieces();
 const skin=rgb('#9c998b'),shadow=rgb('#5f5c52'),pale=rgb('#d2cdb9'),spot=rgb('#6f6a5a'),root=rgb('#4e463a'),spore=rgb('#c8c890');
 // Puffball: slightly squat, lumpy, darker underneath, with darker blotches.
 const body=lumpy(.23,4,d=>.07*wave(d,5,6,4)+.035*wave(d,11,9,13));
 body.scale(1,.9,1);
 P.add(body,null,(x,y,z)=>{const d=new THREE.Vector3(x,y,z).normalize(),blot=wave(d,9,7,8)>.35?.55:0;return mix(mix(shadow,skin,THREE.MathUtils.smoothstep(d.y,-.8,.35)),spot,blot);});
 // Warts: little blunt cones over the upper two thirds.
 for(let i=0;i<22;i++){
  const y=.95-r()*1.35,a=r()*Math.PI*2,s=Math.sqrt(1-y*y),d=new THREE.Vector3(Math.cos(a)*s,y,Math.sin(a)*s),h=.025+r()*.025;
  if(d.y>.8)continue;
  P.add(new THREE.ConeGeometry(.018+r()*.01,h,6,1),place(d.clone().multiplyScalar(.215).multiply(new THREE.Vector3(1,.9,1)).addScaledVector(d,h*.4),d),(x,yy,z)=>{const t=THREE.MathUtils.clamp((new THREE.Vector3(x,yy/.9,z).length()-.21)/h,0,1);return mix(skin,pale,t);});
 }
 // The pore on top: a torn rim round a dark mouth.
 P.add(new THREE.TorusGeometry(.045,.016,6,14),place(new THREE.Vector3(0,.205,0),new THREE.Vector3(0,0,1)),(x,y,z)=>mix(pale,skin,Math.abs(Math.sin(Math.atan2(z,x)*5))*.6));
 P.add(new THREE.CircleGeometry(.036,12),new THREE.Matrix4().compose(new THREE.Vector3(0,.212,0),new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0)),new THREE.Vector3(1,1,1)),()=>rgb('#1c1a16'));
 // Root threads trailing underneath.
 for(let i=0;i<6;i++){
  const a=i*1.05+r()*.4,rr=.06+r()*.05,len=.14+r()*.12,sway=(r()-.5)*.08;
  const pts=[0,.35,.7,1].map(t=>new THREE.Vector3(Math.cos(a)*(rr+t*.03)+sway*t*t,-.18-t*len,Math.sin(a)*(rr+t*.03)+sway*t*t*.5));
  const curve=new THREE.CatmullRomCurve3(pts),tube=new THREE.TubeGeometry(curve,8,.009,5,false),tp=tube.attributes.position;
  // taper the thread toward its tip (TubeGeometry lays out 6 vertices per ring)
  for(let k=0;k<tp.count;k++){const seg=Math.floor(k/6)/8,c=curve.getPoint(seg),x=tp.getX(k),y=tp.getY(k),z=tp.getZ(k),f=1-seg*.7;tp.setXYZ(k,c.x+(x-c.x)*f,c.y+(y-c.y)*f,c.z+(z-c.z)*f);}
  tube.computeVertexNormals();
  P.add(tube,null,(x,y)=>mix(shadow,root,THREE.MathUtils.clamp((-.18-y)/.2,0,1)));
 }
 // A few spores hanging in the air round it.
 for(let i=0;i<9;i++){const a=r()*Math.PI*2,d=.3+r()*.1,y=(r()-.3)*.4;P.add(new THREE.IcosahedronGeometry(.009+r()*.006,0),new THREE.Matrix4().makeTranslation(Math.cos(a)*d,y,Math.sin(a)*d),()=>spore);}
 return P.merge();
}

// ---- flaming sphere ----
function flameGeometry(){
 const r=rng(13),P=pieces(true);
 const white=[1,.96,.78],yellow=[1,.78,.22],orange=[1,.45,.08],red=[.72,.12,.04];
 // A teardrop flame tongue, base at the origin, pointing up +y, with a curl.
 const tongue=(len,w,curl)=>{
  const prof=[];for(let i=0;i<=10;i++){const t=i/10;prof.push(new THREE.Vector2(w*Math.sin(Math.PI*Math.pow(t,.7))*(1-t*.35),t*len));}
  const geo=new THREE.LatheGeometry(prof,7),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i),t=y/len;p.setX(i,p.getX(i)+curl*t*t*len);}
  geo.computeVertexNormals();return geo;
 };
 const flameColour=(len)=>(x,y,z,i,base)=>{const t=THREE.MathUtils.clamp(base(x,y,z)/len,0,1);const c=t<.35?mix(white,yellow,t/.35):t<.7?mix(yellow,orange,(t-.35)/.35):mix(orange,red,(t-.7)/.3);return [...c,.92*(1-Math.pow(t,1.6))];};
 // Tongues rise from all round the core and bend upward as they go.
 for(let i=0;i<16;i++){
  const y=i<4?.55+r()*.4:(r()*2-1)*.85,a=i*2.4+r()*.5,s=Math.sqrt(1-y*y),d=new THREE.Vector3(Math.cos(a)*s,y,Math.sin(a)*s);
  const up=d.clone().lerp(new THREE.Vector3(0,1,0),.55+r()*.2).normalize(),len=.15+r()*.12+(y>0?.05:0),w=.05+r()*.03;
  const origin=d.clone().multiplyScalar(.1),m=place(origin,up,[1,1,1],r()*6);
  const inv=m.clone().invert(),v=new THREE.Vector3(),col=flameColour(len);
  P.add(tongue(len,w,(r()-.5)*.6),m,(x,y2,z,k)=>col(x,y2,z,k,(X,Y,Z)=>v.set(X,Y,Z).applyMatrix4(inv).y));
 }
 // A faint orange corona.
 P.add(new THREE.IcosahedronGeometry(.23,2),null,(x,y)=>[1,.55,.15,.16+.08*Math.max(0,-y/.23)]);
 // Embers lifting off the top.
 for(let i=0;i<10;i++){const a=r()*Math.PI*2,d=.08+r()*.18;P.add(new THREE.TetrahedronGeometry(.012+r()*.01,0),new THREE.Matrix4().makeTranslation(Math.cos(a)*d,.26+r()*.14,Math.sin(a)*d),()=>[1,.7+r()*.25,.2,.95]);}
 return P.merge();
}

// ---- freezing sphere ----
function iceGeometry(){
 const r=rng(29),P=pieces();
 const deep=rgb('#5f9ec8'),pale=rgb('#cfeeff'),white=rgb('#f6fcff');
 // A six-sided crystal with a pointed tip, base at the origin, along +y.
 const crystal=(len,w)=>{
  const shaft=new THREE.CylinderGeometry(w,w*.8,len*.72,6,1);shaft.translate(0,len*.36,0);
  const tip=new THREE.ConeGeometry(w,len*.28,6,1);tip.translate(0,len*.72+len*.14,0);
  const geo=mergeGeometries([shaft.toNonIndexed(),tip.toNonIndexed()]);shaft.dispose();tip.dispose();
  for(const key of Object.keys(geo.attributes))if(key!=='position')geo.deleteAttribute(key);geo.computeVertexNormals();return geo;
 };
 const dirs=[];
 for(let i=0;i<18;i++){const y=1-2*(i+.5)/18,a=i*2.39996,s=Math.sqrt(1-y*y);dirs.push(new THREE.Vector3(Math.cos(a)*s,y,Math.sin(a)*s));}
 dirs.forEach((d,i)=>{
  const len=(i%3===0?.24:.14)+r()*.08,w=.022+r()*.014,m=place(d.clone().multiplyScalar(.1),d,[1,1,1],r()*3),inv=m.clone().invert(),v=new THREE.Vector3();
  P.add(crystal(len,w),m,(x,y,z)=>{const t=THREE.MathUtils.clamp(v.set(x,y,z).applyMatrix4(inv).y/len,0,1);return t<.7?mix(deep,pale,t/.7):mix(pale,white,(t-.7)/.3);});
 });
 // Rime flakes: flat six-pointed stars stuck to the longest crystals' sides.
 for(let i=0;i<18;i+=3){
  const d=dirs[i],side=new THREE.Vector3(0,1,0).cross(d);if(side.lengthSq()<.01)side.set(1,0,0);side.normalize();
  const star=new THREE.CircleGeometry(.03,6);const m=new THREE.Matrix4().lookAt(new THREE.Vector3(),side,new THREE.Vector3(0,1,0));m.setPosition(d.clone().multiplyScalar(.2).addScaledVector(side,.022));
  P.add(star,m,()=>white);
 }
 // A ring of frost motes round the equator.
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2+r()*.3,d=.33+r()*.05;P.add(new THREE.OctahedronGeometry(.012+r()*.008,0),new THREE.Matrix4().makeTranslation(Math.cos(a)*d,(r()-.5)*.08,Math.sin(a)*d),()=>white);}
 return P.merge();
}

let cache=null;
function shared(){
 if(cache)return cache;
 cache={
  spore:gasSporeGeometry(),flame:flameGeometry(),ice:iceGeometry(),
  coreGeo:new THREE.IcosahedronGeometry(1,3),
  sporeMat:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95}),
  flameMat:new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,side:THREE.DoubleSide}),
  iceMat:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.18,metalness:.05,emissive:'#244c66',emissiveIntensity:.35,flatShading:true}),
  fireCore:new THREE.MeshStandardMaterial({color:'#ffd79a',emissive:'#ff7a1e',emissiveIntensity:4.5,roughness:.3}),
  frostCore:new THREE.MeshStandardMaterial({color:'#e8f8ff',emissive:'#6fd0ff',emissiveIntensity:4.5,roughness:.2}),
 };
 return cache;
}

function hover(){const g=new THREE.Group(),body=new THREE.Group(),lift=new THREE.Group();g.add(body);body.add(lift);lift.position.y=LIFT;return {g,body,lift};}
function mesh(parent,geo,material,part,shadow=true){const m=new THREE.Mesh(geo,material);m.castShadow=shadow;m.receiveShadow=shadow;m.userData.part=part;parent.add(m);return m;}

export const SPHERE_KINDS=['gas spore','flaming sphere','freezing sphere'];

// Returns {g,body,orb,sphere,core?} for one of SPHERE_KINDS, or null. `orb` is the hovering
// group that sphere-pulse.js throbs; `sphere` names the kind for it.
export function createSphereCreature(name){
 const S=shared(),{g,body,lift}=hover();
 if(name==='gas spore'){mesh(lift,S.spore,S.sporeMat,'spore');return {g,body,orb:lift,sphere:'gas'};}
 if(name==='flaming sphere'){
  const core=mesh(lift,S.coreGeo,S.fireCore,'core',false);core.scale.setScalar(.14);
  mesh(lift,S.flame,S.flameMat,'flames',false).renderOrder=1;
  g.userData.core=core;return {g,body,core,orb:lift,sphere:'fire'};
 }
 if(name==='freezing sphere'){
  const core=mesh(lift,S.coreGeo,S.frostCore,'core',false);core.scale.setScalar(.12);
  mesh(lift,S.ice,S.iceMat,'ice');
  g.userData.core=core;return {g,body,core,orb:lift,sphere:'frost'};
 }
 return null;
}
