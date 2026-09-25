import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Non-trap `feature` cells (ice, bog, drawbridges, ice walls, clouds, open air). The bridge
// sends them as generic features, so the kind comes from the map symbol and its
// colour (drawing.c defsyms). Anything unknown returns null and keeps its label.
export function featureKind(symbol,color){
 if(symbol===46)return {6:'ice',3:'bridge-down'}[color]||null;   // '.'
 if(symbol===125&&color===2)return 'bog';                         // '}'
 if(symbol===35)return {3:'bridge-up',7:'cloud'}[color]||null;    // '#'
 if(symbol===56)return color===15?'crystal-wall':'ice-wall';      // '8'
 if(symbol===32&&color===6)return 'air';                          // ' '
 return null;
}

// Drawbridges are built with the moat running along x; live.js turns them by
// the neighbouring water.
export const AXIS_FEATURES=new Set(['bridge-down','bridge-up']);

export function createTerrainFeature(kind,seed=0){
 const g=new THREE.Group();g.name=`Feature (${kind})`;
 const geometries=[],materials=[];
 const mat=(o,Type=THREE.MeshStandardMaterial)=>{const m=new Type(o);materials.push(m);return m;};
 const add=(geo,m,x=0,y=0,z=0,parent=g)=>{geometries.push(geo);const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 const flat=(geo,m,y,x=0,z=0)=>{const o=add(geo,m,x,y,z);o.rotation.x=-Math.PI/2;o.castShadow=false;return o;};
 const block=(w,h,d,m,x,y,z,r=.01,parent=g)=>add(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/2,h/2,d/2)),m,x,y,z,parent);
 const rand=(i)=>{const s=Math.sin(seed*12.9898+i*78.233)*43758.5453;return s-Math.floor(s);};
 const iron=mat({color:0x3c3f42,metalness:.7,roughness:.45});

 if(kind==='ice'){
  // A glassy sheet over the floor with hairline cracks and frost specks.
  add(new THREE.BoxGeometry(.98,.018,.98),mat({color:0xbfe6f5,roughness:.06,metalness:.05,clearcoat:1,transparent:true,opacity:.78},THREE.MeshPhysicalMaterial),0,.009,0).castShadow=false;
  const crack=mat({color:0x5d8fa8,roughness:.4});
  for(let i=0;i<4;i++){
   let x=(rand(i)-.5)*.5,z=(rand(i+10)-.5)*.5,a=rand(i+20)*Math.PI*2;
   for(let j=0;j<3;j++){const len=.08+rand(i*7+j+30)*.12;a+=(rand(i*7+j+40)-.5)*1.2;
    const nx=THREE.MathUtils.clamp(x+Math.cos(a)*len,-.46,.46),nz=THREE.MathUtils.clamp(z+Math.sin(a)*len,-.46,.46);
    const seg=add(new THREE.BoxGeometry(Math.hypot(nx-x,nz-z),.003,.008),crack,(x+nx)/2,.0195,(z+nz)/2);seg.rotation.y=-Math.atan2(nz-z,nx-x);seg.castShadow=false;x=nx;z=nz;}
  }
  const frost=mat({color:0xf2fbff,roughness:.9});
  for(let i=0;i<10;i++)flat(new THREE.CircleGeometry(.012+rand(i+60)*.03,8),frost,.0192,(rand(i+70)-.5)*.86,(rand(i+80)-.5)*.86);
 }else if(kind==='bog'){
  // Muddy swamp: a lumpy mud bed with dark standing puddles, reeds and a bubble.
  const mud=mat({color:0x3b3a22,roughness:.95}),slick=mat({color:0x1d2418,roughness:.12,metalness:.1});
  const bed=add(new THREE.CylinderGeometry(.48,.49,.03,20),mud,0,.015,0);bed.scale.z=.97;bed.castShadow=false;
  for(let i=0;i<3;i++){const p=flat(new THREE.CircleGeometry(.1+rand(i)*.1,16),slick,.032,(rand(i+5)-.5)*.5,(rand(i+9)-.5)*.5);p.scale.y=.6+rand(i+13)*.4;}
  const reed=mat({color:0x566b2e,roughness:.8}),head=mat({color:0x4a2e1a,roughness:.9});
  for(let i=0;i<7;i++){const a=rand(i+20)*Math.PI*2,r=.25+rand(i+30)*.18,h=.3+rand(i+40)*.25,x=Math.cos(a)*r,z=Math.sin(a)*r;
   const stem=add(new THREE.CylinderGeometry(.006,.01,h,5),reed,x,h/2+.03,z);stem.rotation.set((rand(i+50)-.5)*.3,0,(rand(i+60)-.5)*.3);
   if(i%2===0)add(new THREE.CapsuleGeometry(.02,.07,3,6),head,0,h/2-.02,0,stem);}
  add(new THREE.SphereGeometry(.035,10,6,0,Math.PI*2,0,Math.PI/2),slick,(rand(90)-.5)*.3,.03,(rand(91)-.5)*.3);
 }else if(kind==='bridge-down'){
  // Lowered drawbridge: heavy planks running across the moat with iron bands and rivets.
  flat(new THREE.PlaneGeometry(.98,.98),mat({color:0x0c161c,roughness:.3}),.002);
  const woods=[0x6b4a2e,0x5e4127,0x74522f];
  for(let i=0;i<5;i++)block(.17,.06,1,mat({color:woods[i%3],roughness:.9}),(i-2)*.185,.04,0,.012);
  for(const z of [-.36,0,.36]){block(.94,.012,.06,iron,0,.076,z,.004);for(let i=0;i<5;i++)add(new THREE.SphereGeometry(.013,6,4),iron,(i-2)*.185,.083,z);}
  for(const x of [-.47,.47])for(const z of [-.44,.44])add(new THREE.TorusGeometry(.035,.01,5,10),iron,x,.08,z).rotation.y=Math.PI/2;
 }else if(kind==='bridge-up'){
  // Raised drawbridge: the bridge stands as a banded plank wall over dark moat water.
  flat(new THREE.PlaneGeometry(.98,.98),mat({color:0x0c161c,roughness:.3}),.002);
  const panel=new THREE.Group();panel.position.z=-.1;g.add(panel);
  for(let i=0;i<5;i++)block(.185,1.02,.1,mat({color:[0x6b4a2e,0x5e4127,0x74522f][i%3],roughness:.9}),(i-2)*.188,.51,0,.012,panel);
  for(const y of [.14,.52,.9])block(.96,.06,.02,iron,0,y,.06,.005,panel);
  for(const y of [.14,.52,.9])for(let i=0;i<5;i++)add(new THREE.SphereGeometry(.014,6,4),iron,(i-2)*.188,y,.075,panel);
  // Chains hang from the top corners toward the (unseen) gatehouse.
  for(const x of [-.4,.4])for(let i=0;i<5;i++){const link=add(new THREE.TorusGeometry(.028,.008,5,10),iron,x,1.0-i*.05,.1+i*.035,panel);link.rotation.y=i%2?Math.PI/2:0;link.rotation.x=.6;}
 }else if(kind==='ice-wall'||kind==='crystal-wall'){
  // A faceted block of ice filling the tile, with a frosted core showing through.
  const crystal=kind==='crystal-wall';
  const shell=mat({color:crystal?0xf4fbff:0x9fdcf0,roughness:crystal?.03:.12,metalness:.05,clearcoat:1,transparent:true,opacity:crystal?.55:.72},THREE.MeshPhysicalMaterial);
  const core=mat({color:crystal?0xffffff:0xd6f1fb,roughness:.8,transparent:true,opacity:.6});
  add(new THREE.CylinderGeometry(.18,.24,.62,6),core,0,.34,0).castShadow=false;
  const body=add(new THREE.IcosahedronGeometry(.5,1),shell,0,.44,0);body.scale.set(.94,.9,.94);
  for(let i=0;i<5;i++){const a=rand(i)*Math.PI*2,h=.18+rand(i+10)*.22,r=.36+rand(i+20)*.06;
   const shard=add(new THREE.ConeGeometry(.06,h,5),shell,Math.cos(a)*r,h/2,Math.sin(a)*r);shard.rotation.set((rand(i+30)-.5)*.5,0,(rand(i+40)-.5)*.5);}
 }else if(kind==='cloud'){
  // A drifting puff of grey vapour; it neither casts nor blocks shadows.
  const vapour=mat({color:0xb9bec4,roughness:1,transparent:true,opacity:.55,depthWrite:false});
  for(let i=0;i<9;i++){const r=.14+rand(i)*.12;
   const puff=add(new THREE.SphereGeometry(r,12,8),vapour,(rand(i+10)-.5)*.46,.45+rand(i+20)*.35,(rand(i+30)-.5)*.46);puff.castShadow=puff.receiveShadow=false;}
 }else if(kind==='air'){
  // Open air (the Plane of Air): no floor, just sky far below with drifting wisps
  // and pale wind streaks. The sky is unlit and one flat colour so neighbouring
  // air tiles join into a single sheet; live.js hides the stone slab.
  g.userData.hidesFloor=true;
  const sky=flat(new THREE.PlaneGeometry(1.001,1.001),mat({color:0x6f9fd0},THREE.MeshBasicMaterial),-.42);sky.receiveShadow=false;
  const haze=mat({color:0xdbe9f7,transparent:true,opacity:.5,depthWrite:false},THREE.MeshBasicMaterial);
  for(let i=0;i<3;i++){const p=flat(new THREE.CircleGeometry(.09+rand(i)*.1,14),haze,-.41+i*.002,(rand(i+3)-.5)*.6,(rand(i+6)-.5)*.6);p.scale.y=.45+rand(i+9)*.3;p.receiveShadow=false;}
  const wisp=mat({color:0xf4f8fc,roughness:1,transparent:true,opacity:.4,depthWrite:false});
  for(let i=0;i<4;i++){const r=.05+rand(i+20)*.06;
   const puff=add(new THREE.SphereGeometry(r,10,6),wisp,(rand(i+24)-.5)*.6,-.3+rand(i+28)*.12,(rand(i+32)-.5)*.6);puff.scale.set(1.8,.55,1.2);puff.castShadow=puff.receiveShadow=false;}
  const wind=mat({color:0xffffff,transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide},THREE.MeshBasicMaterial);
  const heading=rand(40)*Math.PI*2;
  for(let i=0;i<3;i++){const r=.16+rand(i+41)*.14,arc=.9+rand(i+44)*.9;
   const streak=add(new THREE.TorusGeometry(r,.004,3,24,arc),wind,(rand(i+47)-.5)*.3,.12+rand(i+50)*.35,(rand(i+53)-.5)*.3);
   streak.rotation.set(Math.PI/2+(rand(i+56)-.5)*.3,0,heading+i*.4);streak.castShadow=streak.receiveShadow=false;}
 }
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}
