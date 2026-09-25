import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// The bridge reports traps as generic `feature` cells, so the trap family comes
// from the map symbol and its colour (drawing.c defsyms). Several traps share a
// colour, so each model stands for its family, not one exact trap.
export function trapKind(symbol,color){
 if(symbol===34)return 'web';            // '"'
 if(symbol!==94)return null;             // '^'
 return {0:'pit',1:'mine',3:'hatch',4:'rust',6:'jaws',7:'rubble',9:'fire',
  5:'teleport',13:'teleport',12:'magic',10:'polymorph',15:'ice'}[color]||'plate';
}

const RUNES={teleport:[0xb070ff,0x7a2cff],magic:[0x6fb4ff,0x2c6cff],polymorph:[0x7dff8a,0x22c94a],ice:[0xd8f4ff,0x7fc8ff]};

// Everything sits on the floor slab (y=0) and stays inside its tile.
export function createTrap(kind,seed=0){
 const g=new THREE.Group();g.name=`Trap (${kind})`;
 const geometries=[],materials=[];
 const mat=(o)=>{const m=new THREE.MeshStandardMaterial(o);materials.push(m);return m;};
 const add=(geo,m,x=0,y=0,z=0,parent=g)=>{geometries.push(geo);const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 const flat=(geo,m,y)=>{const o=add(geo,m,0,y,0);o.rotation.x=-Math.PI/2;o.castShadow=false;return o;};
 const block=(w,h,d,m,x,y,z,r=.01)=>add(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/2,h/2,d/2)),m,x,y,z);
 const rand=(i)=>{const s=Math.sin(seed*12.9898+i*78.233)*43758.5453;return s-Math.floor(s);};
 const stone=mat({color:0x6f716c,roughness:.95}),dark=mat({color:0x121313,roughness:1});
 const steel=mat({color:0x8d9ba0,metalness:.75,roughness:.38}),rustMat=mat({color:0x7a4a2c,metalness:.3,roughness:.8});
 const wood=mat({color:0x6b4a2e,roughness:.9}),earth=mat({color:0x4a3a2a,roughness:1});
 const rubble=(n,r0,spread,m=stone)=>{for(let i=0;i<n;i++){const a=rand(i)*Math.PI*2,r=r0+rand(i+20)*spread,s=.025+rand(i+40)*.035;add(new THREE.DodecahedronGeometry(s,0),m,Math.cos(a)*r,s*.6,Math.sin(a)*r).rotation.set(rand(i+60)*3,rand(i+80)*3,0);}};

 if(kind==='pit'){
  // A dark shaft: concentric shading rings fake depth below the floor.
  const shades=[0x3a3027,0x241d17,0x120f0c,0x040404];
  shades.forEach((c,i)=>flat(new THREE.CircleGeometry(.38-i*.075,28),mat({color:c,roughness:1}),.004+i*.002));
  const lip=add(new THREE.TorusGeometry(.38,.035,6,28),earth,0,.012,0);lip.rotation.x=Math.PI/2;lip.scale.z=.5;
  rubble(9,.38,.06,earth);rubble(5,.4,.05);
 }else if(kind==='hatch'){
  // Trap door / hole / squeaky board: a plank hatch set in a dark frame.
  block(.66,.02,.66,dark,0,.01,0);
  for(let i=0;i<4;i++)block(.14,.035,.58,i%2?wood:mat({color:0x5e4127,roughness:.92}),(i-1.5)*.148,.028,0,.008);
  for(const z of [-.2,.2])block(.6,.012,.05,steel,0,.05,z,.004);
  for(const z of [-.2,.2])add(new THREE.CylinderGeometry(.022,.022,.07,8),steel,-.3,.05,z).rotation.x=Math.PI/2;
  const ring=add(new THREE.TorusGeometry(.04,.009,6,16),steel,.2,.05,0);ring.rotation.x=Math.PI/2;
 }else if(kind==='jaws'){
  // Bear trap (also stands in for arrow and dart traps): sprung-open toothed jaws.
  const base=add(new THREE.CylinderGeometry(.09,.1,.025,16),steel,0,.0125,0);base.receiveShadow=true;
  flat(new THREE.CircleGeometry(.06,16),rustMat,.026);
  for(const side of [-1,1]){
   const jaw=add(new THREE.TorusGeometry(.26,.014,6,24,Math.PI),steel,0,.02,0);jaw.rotation.set(-Math.PI/2,0,side<0?0:Math.PI);
   for(let i=1;i<10;i++){const a=i/10*Math.PI,x=Math.cos(a)*.25,z=side*Math.sin(a)*.25;
    add(new THREE.ConeGeometry(.016,.06,5),steel,x*.93,.045,z*.93);}
  }
  for(const x of [-.26,.26]){const spring=add(new THREE.TorusGeometry(.035,.01,6,12),steel,x,.03,0);spring.rotation.y=Math.PI/2;}
  // Chain to a stake at the tile edge.
  for(let i=0;i<5;i++){const link=add(new THREE.TorusGeometry(.022,.006,5,10),steel,.3+i*.03,.01,.1+i*.04);link.rotation.set(Math.PI/2,0,i%2?Math.PI/2:0);}
  add(new THREE.CylinderGeometry(.018,.01,.08,8),steel,.44,.04,.3);
 }else if(kind==='mine'){
  // Land mine: a half-buried domed casing with red trigger prongs.
  const soil=add(new THREE.CylinderGeometry(.2,.23,.03,20),earth,0,.015,0);soil.castShadow=false;
  const dome=add(new THREE.SphereGeometry(.14,20,8,0,Math.PI*2,0,Math.PI/2),mat({color:0x4d5243,metalness:.6,roughness:.5}),0,.02,0);dome.scale.y=.45;
  const red=mat({color:0xb22a1c,emissive:0x5a0c06,roughness:.5});
  add(new THREE.CylinderGeometry(.03,.03,.02,12),red,0,.09,0);
  for(let i=0;i<3;i++){const a=i/3*Math.PI*2;const prong=add(new THREE.CylinderGeometry(.005,.005,.07,6),red,Math.cos(a)*.035,.12,Math.sin(a)*.035);prong.rotation.set(Math.sin(a)*.3,0,-Math.cos(a)*.3);}
  rubble(4,.2,.04,earth);
 }else if(kind==='rubble'){
  // Falling rock / rolling boulder / statue trap: cracked flagstone and loose rocks.
  block(.5,.025,.5,stone,0,.0125,0);
  const crack=mat({color:0x2a2a28,roughness:1});
  for(let i=0;i<3;i++){const c=block(.34,.004,.012,crack,0,.027,(i-1)*.1);c.rotation.y=(rand(i+100)-.5)*1.4;}
  rubble(10,.1,.28);
 }else if(kind==='rust'){
  // Rust trap: a pipe nozzle dripping into a blue-green puddle over a grate.
  const puddle=flat(new THREE.CircleGeometry(.24,24),mat({color:0x2e6f78,metalness:.2,roughness:.15,transparent:true,opacity:.85}),.006);puddle.scale.set(1.2,.9,1);
  for(let i=0;i<5;i++)block(.4,.012,.03,rustMat,0,.004,(i-2)*.08,.004);
  add(new THREE.CylinderGeometry(.04,.05,.14,10),rustMat,-.3,.07,-.3);
  const spout=add(new THREE.CylinderGeometry(.025,.025,.16,10),rustMat,-.24,.14,-.24);spout.rotation.set(.6,0,-.6);
  add(new THREE.SphereGeometry(.014,8,6),mat({color:0x5ab3c0,roughness:.1}),-.18,.06,-.18).scale.y=1.5;
 }else if(kind==='fire'){
  // Fire trap: a scorched iron vent with glowing embers underneath.
  flat(new THREE.CircleGeometry(.36,24),mat({color:0x1b1512,roughness:1}),.004);
  flat(new THREE.CircleGeometry(.16,20),mat({color:0xff6a1a,emissive:0xff4a0a,emissiveIntensity:1.4,roughness:.6}),.008);
  const iron=mat({color:0x2d2a28,metalness:.7,roughness:.5});
  const rim=add(new THREE.TorusGeometry(.17,.02,6,24),iron,0,.02,0);rim.rotation.x=Math.PI/2;
  for(let i=-2;i<=2;i++)block(.3,.014,.018,iron,0,.022,i*.06,.005);
  const ember=mat({color:0xffb04a,emissive:0xff8a20,emissiveIntensity:1.8});
  for(let i=0;i<6;i++){const a=rand(i+120)*Math.PI*2,r=.2+rand(i+140)*.12;add(new THREE.DodecahedronGeometry(.012,0),ember,Math.cos(a)*r,.012,Math.sin(a)*r);}
 }else if(RUNES[kind]){
  // Magical traps: a glowing inscribed circle with a star, in the trap's colour.
  const [color,glow]=RUNES[kind];
  const rune=mat({color,emissive:glow,emissiveIntensity:1.3,roughness:.5,transparent:true,opacity:.9});
  for(const r of [.36,.3]){const ring=flat(new THREE.RingGeometry(r-.012,r,40),rune,.006);ring.material.side=THREE.DoubleSide;}
  const points=kind==='polymorph'?7:kind==='ice'?6:5,step=kind==='ice'?1:2;
  for(let i=0;i<points;i++){
   const a=i/points*Math.PI*2,b=(i+step)/points*Math.PI*2;
   const ax=Math.cos(a)*.3,az=Math.sin(a)*.3,bx=Math.cos(b)*.3,bz=Math.sin(b)*.3;
   const len=Math.hypot(bx-ax,bz-az);
   const line=add(new THREE.BoxGeometry(len,.004,.012),rune,(ax+bx)/2,.007,(az+bz)/2);line.rotation.y=-Math.atan2(bz-az,bx-ax);line.castShadow=false;
   const glyph=add(new THREE.BoxGeometry(.03,.004,.012),rune,Math.cos(a)*.33,.007,Math.sin(a)*.33);glyph.rotation.y=-a;glyph.castShadow=false;
  }
  flat(new THREE.CircleGeometry(.05,16),rune,.008);
  if(kind==='ice'){
   const frost=mat({color:0xe6f7ff,roughness:.2,metalness:.1,transparent:true,opacity:.8});
   for(let i=0;i<7;i++){const a=rand(i+160)*Math.PI*2,r=.08+rand(i+180)*.18,h=.06+rand(i+200)*.08;
    const spike=add(new THREE.ConeGeometry(.02,h,5),frost,Math.cos(a)*r,h/2,Math.sin(a)*r);spike.rotation.set((rand(i+220)-.5)*.6,0,(rand(i+240)-.5)*.6);}
  }
 }else if(kind==='web'){
  // Spider web strung upright across the tile between two rough posts.
  const silk=new THREE.LineBasicMaterial({color:0xe8e8e0,transparent:true,opacity:.7});materials.push(silk);
  const cx=0,cy=.48,spokes=10,pts=[];
  const at=(i,r)=>{const a=i/spokes*Math.PI*2;return [cx+Math.cos(a)*r*.44,cy+Math.sin(a)*r*.46,0];};
  for(let i=0;i<spokes;i++)pts.push(cx,cy,0,...at(i,1));
  for(let ring=1;ring<=6;ring++){const r=ring/6.3;for(let i=0;i<spokes;i++){const sag=1-.06*((i+ring)%2);pts.push(...at(i,r*sag),...at(i+1,r));}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));geometries.push(geo);
  g.add(new THREE.LineSegments(geo,silk));
  for(const x of [-.46,.46])add(new THREE.CylinderGeometry(.02,.03,.96,6),mat({color:0x4a4038,roughness:1}),x,.48,0);
  add(new THREE.SphereGeometry(.03,8,6),dark,.12,.62,.01).scale.set(1,1,.6);
 }else{
  // Unknown trap: a raised pressure plate with a shadow gap.
  block(.5,.012,.5,dark,0,.006,0);
  block(.44,.03,.44,stone,0,.022,0,.008);
 }
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}
