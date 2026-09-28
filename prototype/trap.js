import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The bridge reports traps as generic `feature` cells, so the trap family comes
// from the map symbol and its colour (drawing.c defsyms). Several traps share a
// colour, so each model stands for its family, not one exact trap.
export function trapKind(symbol,color){
 if(symbol===34)return 'web';            // '"'
 if(symbol!==94)return null;             // '^'
 return {0:'pit',1:'mine',3:'hatch',4:'rust',6:'jaws',7:'rubble',9:'fire',
  5:'teleport',13:'portal',12:'magic',10:'polymorph',15:'ice'}[color]||'plate';
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
  // Bear trap (also stands in for arrow and dart traps), set and open: two
  // hinged jaw bands lying flat in a ring with serrated teeth standing up, the
  // trigger pan in the middle, a leaf spring on each side with its collar over
  // the jaw ends, and a chain to a stake. It is all one vertex-coloured mesh,
  // pitted with rust, instead of ~30 separate meshes.
  const parts=[],grey=new THREE.Color(0x8d9ba0),dull=new THREE.Color(0x5d6568),rusty=new THREE.Color(0x7a4a2c),rustDark=new THREE.Color(0x4a2c1a);
  const put=(geo,{x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1,base=grey,rust=.25}={})=>{
   const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(rx,ry,rz,'YXZ');o.scale.set(sx,sy,sz);o.updateMatrix();
   const n=geo.index?geo.toNonIndexed():geo;if(n!==geo)geo.dispose();
   n.applyMatrix4(o.matrix);n.deleteAttribute('uv');
   const pos=n.attributes.position,col=new Float32Array(pos.count*3),c=new THREE.Color();
   for(let i=0;i<pos.count;i++){
    const px=pos.getX(i),py=pos.getY(i),pz=pos.getZ(i);
    const h=Math.sin(px*91.7+pz*47.3+seed)*Math.cos(pz*83.1-px*29.9+py*120)*.5+.5;
    c.copy(base).lerp(h>.5?rusty:rustDark,Math.min(1,rust*(.4+h*1.6)));
    col.set([c.r,c.g,c.b],i*3);
   }
   n.setAttribute('color',new THREE.BufferAttribute(col,3));parts.push(n);
  };
  const ext=(shape,depth)=>new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:10});
  const R=.2,W=.028;
  // Base: a flat bar along x under everything, a cross bar under the pan.
  put(new THREE.BoxGeometry(.56,.012,.045),{y:.006,base:dull,rust:.5});
  put(new THREE.BoxGeometry(.04,.012,.26),{y:.006,base:dull,rust:.5});
  // Pan and the dog that holds one jaw down.
  put(new THREE.CylinderGeometry(.075,.078,.01,20),{y:.017,base:dull,rust:.7});
  put(new THREE.CylinderGeometry(.05,.05,.004,16),{y:.023,base:rusty,rust:.3});
  put(new THREE.BoxGeometry(.13,.007,.018),{x:.02,y:.026,z:.07,ry:-.5,rust:.35});
  // Jaws: flat half-rings hinged on the x axis, teeth along the inner edge.
  for(const side of [-1,1]){
   const band=new THREE.Shape();
   band.absarc(0,0,R+W/2,0,Math.PI,false);band.absarc(0,0,R-W/2,Math.PI,0,true);
   put(ext(band,.01),{y:.012,rx:-Math.PI/2,ry:side<0?Math.PI:0,rust:.3});
   for(let i=1;i<10;i++){
    const a=i/10*Math.PI*(side<0?-1:1),s=.95+rand(i*3+side)*.15;
    const tooth=new THREE.Shape();tooth.moveTo(-.014,0);tooth.lineTo(.014,0);tooth.lineTo(.003,.042*s);tooth.lineTo(-.003,.042*s);tooth.closePath();
    const t=ext(tooth,.006);t.translate(0,0,-.003);
    put(t,{x:Math.cos(a)*(R-W*.3),y:.02,z:Math.sin(a)*(R-W*.3),ry:Math.PI/2-a,rx:-.3,rust:.2});
   }
  }
  // Hinge posts where the jaw ends meet.
  for(const x of [-R,R]){
   put(new THREE.CylinderGeometry(.02,.024,.05,10),{x,y:.025,base:dull,rust:.45});
   put(new THREE.CylinderGeometry(.008,.008,.07,6),{x,y:.035,rx:Math.PI/2});
  }
  // Leaf springs: a flat bottom leaf and a rising top leaf joined by a loop,
  // with a collar ring standing over the jaw ends.
  for(const side of [-1,1]){
   put(new THREE.BoxGeometry(.2,.008,.036),{x:side*.32,y:.016,rust:.3});
   put(new THREE.BoxGeometry(.21,.008,.036),{x:side*.315,y:.04,rz:side*.12,rust:.3});
   const loop=new THREE.TorusGeometry(.018,.005,6,12,Math.PI);
   put(loop,{x:side*.42,y:.028,rz:side<0?Math.PI/2:-Math.PI/2,sx:1,sy:1,sz:6,rust:.4});
   put(new THREE.TorusGeometry(.034,.007,6,16),{x:side*.235,y:.036,ry:Math.PI/2,sy:.8,rust:.35});
  }
  // Chain from the base bar to a stake near the tile edge.
  const from=new THREE.Vector3(.1,.008,.13),to=new THREE.Vector3(.2,.01,.4);
  for(let i=0;i<7;i++){const t=(i+.5)/7,p=from.clone().lerp(to,t);
   put(new THREE.TorusGeometry(.019,.005,5,10),{x:p.x+Math.sin(i*1.7)*.012,y:i%2?.02:.007,z:p.z,ry:Math.atan2(to.x-from.x,to.z-from.z)+Math.PI/2,rx:i%2?0:Math.PI/2,sx:1.3,rust:.55});}
  put(new THREE.CylinderGeometry(.02,.008,.1,8),{x:.21,y:.05,z:.42,rz:.15,base:dull,rust:.6});
  put(new THREE.TorusGeometry(.022,.006,6,12),{x:.2,y:.1,z:.42,rx:Math.PI/2,rust:.4});
  put(new THREE.CylinderGeometry(.03,.03,.012,10),{x:.215,y:.094,z:.42,base:dull,rust:.5});
  const trap=add(mergeGeometries(parts),mat({color:0xffffff,vertexColors:true,metalness:.65,roughness:.48}));
  trap.name='bear-trap';for(const p of parts)p.dispose();
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
  // Rust trap: a corroded standpipe rises from the floor, bends over and drips into a
  // blue-green puddle pooled over a drain grate, leaving orange rust stains and flakes.
  const up=new THREE.Vector3(0,1,0);
  const aim=(o,dir,from=up)=>{o.quaternion.setFromUnitVectors(from,dir.clone().normalize());return o;};
  // A wobbly closed outline around (cx,cz) with an optional hole, laid flat on the floor.
  const blob=(cx,cz,r,salt,hole=0,n=24)=>{
   const pts=(rr,k)=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2,w=rr*(1+.16*Math.sin(a*3+salt)+.1*(rand(salt+i+k)-.5));return new THREE.Vector2(cx+Math.cos(a)*w,-(cz+Math.sin(a)*w));});
   const s=new THREE.Shape(pts(r,0));
   if(hole)s.holes.push(new THREE.Path(pts(hole,50).reverse()));
   return new THREE.ShapeGeometry(s);
  };
  const iron=mat({color:0x3f342d,metalness:.55,roughness:.7});
  const stain=mat({color:0x8a4a1e,roughness:1,transparent:true,opacity:.55,depthWrite:false});
  const water=mat({color:0x2e6f78,metalness:.25,roughness:.08,transparent:true,opacity:.82});
  const paint=mat({color:0x7a2c22,metalness:.3,roughness:.65});
  // Floor stains: a rust tide-line ringing the puddle and a streak from the pipe's foot.
  flat(blob(.04,.04,.34,200,.24),stain,.003).castShadow=false;
  const streak=flat(new THREE.CircleGeometry(.12,16),stain,.0032);streak.castShadow=false;streak.position.set(-.2,.0032,-.2);streak.scale.set(1.6,.5,1);streak.rotation.z=-Math.PI/4;
  // The drain under the water: a dark sump in an iron frame, crossed by rusted slats.
  flat(new THREE.PlaneGeometry(.24,.24),dark,.002).castShadow=false;
  const bar=(w,h,d,m,x,y,z)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z);
  for(const s of [-1,1]){bar(.28,.016,.024,iron,0,.008,s*.128);bar(.024,.016,.28,iron,s*.128,.008,0);}
  for(let i=-2;i<=2;i++)bar(.024,.012,.24,rustMat,i*.047,.009,0);
  bar(.24,.01,.018,rustMat,0,.012,0);
  flat(blob(.04,.04,.25,300),water,.006).castShadow=false;
  // The standpipe: a bolted floor flange, a riser with a coupling collar and a valve,
  // then a bend over the puddle ending in a flared nozzle.
  const foot=new THREE.Vector3(-.3,0,-.3);
  add(new THREE.CylinderGeometry(.07,.075,.016,16),iron,foot.x,.008,foot.z);
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2+.3;add(new THREE.CylinderGeometry(.009,.009,.012,6),iron,foot.x+Math.cos(a)*.055,.02,foot.z+Math.sin(a)*.055);}
  const path=new THREE.CatmullRomCurve3([[-.3,.01,-.3],[-.3,.16,-.3],[-.3,.27,-.3],[-.27,.34,-.27],[-.2,.36,-.2],[-.12,.33,-.12],[-.08,.29,-.08]].map(p=>new THREE.Vector3(...p)));
  add(new THREE.TubeGeometry(path,40,.032,10,false),rustMat);
  for(const t of [.3,.62]){const p=path.getPointAt(t),c=add(new THREE.CylinderGeometry(.041,.041,.03,12),iron,p.x,p.y,p.z);aim(c,path.getTangentAt(t));}
  const tip=path.getPointAt(1),dir=path.getTangentAt(1);
  const nozzle=add(new THREE.CylinderGeometry(.045,.034,.05,12),iron,tip.x+dir.x*.02,tip.y+dir.y*.02,tip.z+dir.z*.02);aim(nozzle,dir);
  // Hand wheel on a short stem off the riser.
  const side=new THREE.Vector3(1,0,-1).normalize(),hub=new THREE.Vector3(-.3,.17,-.3).addScaledVector(side,.06);
  aim(add(new THREE.CylinderGeometry(.01,.01,.06,6),iron,-.3+side.x*.03,.17,-.3+side.z*.03),side);
  aim(add(new THREE.TorusGeometry(.042,.007,6,20),paint,hub.x,hub.y,hub.z),side,new THREE.Vector3(0,0,1));
  for(const v of [up,new THREE.Vector3().crossVectors(up,side)])aim(add(new THREE.CylinderGeometry(.005,.005,.084,5),paint,hub.x,hub.y,hub.z),v);
  // Drips falling from the nozzle, a splash ring where they land, and a bead on the lip.
  const drip=mat({color:0x5ab3c0,roughness:.05,transparent:true,opacity:.9});
  add(new THREE.SphereGeometry(.012,8,6),drip,tip.x+dir.x*.04,tip.y+dir.y*.04-.012,tip.z+dir.z*.04).scale.y=1.4;
  for(const [y,s] of [[.2,.011],[.1,.009]])add(new THREE.SphereGeometry(s,8,6),drip,tip.x+dir.x*.03,y,tip.z+dir.z*.03).scale.y=1.8;
  const splash=flat(new THREE.RingGeometry(.03,.042,20),drip,.008);splash.position.set(tip.x+dir.x*.03,.008,tip.z+dir.z*.03);splash.castShadow=false;
  // Flakes of rust shed around the pipe's foot and the grate.
  for(let i=0;i<9;i++){const a=rand(i+160)*Math.PI*2,near=i<5?foot:new THREE.Vector3(.04,0,.04),rr=i<5?.09+rand(i+170)*.06:.2+rand(i+180)*.1;
   add(new THREE.DodecahedronGeometry(.008+rand(i+190)*.008,0),rustMat,near.x+Math.cos(a)*rr,.005,near.z+Math.sin(a)*rr).scale.y=.4;}
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
 }else if(kind==='portal'){
  // Magic portal: a standing-stone arch around a swirling violet rift, over a
  // scorched rune circle. Only the portal uses bright magenta, so it gets its own model.
  const rune=mat({color:0xff66ff,emissive:0xd22cff,emissiveIntensity:1.4,roughness:.5,transparent:true,opacity:.9});
  flat(new THREE.CircleGeometry(.44,32),mat({color:0x241a24,roughness:1}),.003);
  for(const r of [.42,.35]){const ring=flat(new THREE.RingGeometry(r-.012,r,40),rune,.006);ring.material.side=THREE.DoubleSide;}
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const glyph=add(new THREE.BoxGeometry(.035,.004,.012),rune,Math.cos(a)*.385,.007,Math.sin(a)*.385);glyph.rotation.y=-a+(i%2?.6:0);glyph.castShadow=false;}
  // Arch: two leaning rough-hewn stones and a capstone.
  const arch=mat({color:0x5d5a63,roughness:.92}),moss=mat({color:0x3f4a33,roughness:1});
  for(const side of [-1,1]){
   const post=block(.11,.9,.15,arch,side*.37,.45,0,.03);post.rotation.z=side*.035;
   block(.14,.08,.18,arch,side*.37,.04,0,.02);
   add(new THREE.SphereGeometry(.035,8,6),moss,side*.33,.12+rand(side+3)*.2,.07).scale.set(1,.5,.4);
  }
  block(.9,.1,.17,arch,0,.95,0,.03);
  for(const x of [-.2,0,.2])add(new THREE.BoxGeometry(.04,.004,.01),rune,x,.95,.087).castShadow=false;
  // Rift: a dark core ringed by overlapping emissive arcs that read as a spiral.
  const rift=new THREE.Group();rift.position.y=.48;rift.scale.y=1.3;g.add(rift);
  const core=add(new THREE.CircleGeometry(.29,32),mat({color:0x12031c,emissive:0x2a0640,roughness:1,side:THREE.DoubleSide}),0,0,0,rift);core.castShadow=false;
  const swirl=[0xff7aff,0xc04dff,0x8a3cff,0xe6a3ff];
  for(let i=0;i<7;i++){
   const r=.28-i*.036,c=swirl[i%4];
   const arc=add(new THREE.TorusGeometry(r,.009+.004*(i%2),5,32,Math.PI*(1.1+rand(i+300)*.5)),mat({color:c,emissive:c,emissiveIntensity:1.2+i*.12,roughness:.4,transparent:true,opacity:.85,depthWrite:false}),0,0,.004+i*.002,rift);
   arc.rotation.z=i*1.7+rand(i+310);arc.castShadow=false;
  }
  add(new THREE.SphereGeometry(.03,10,8),mat({color:0xffffff,emissive:0xffd6ff,emissiveIntensity:2}),0,0,.02,rift).castShadow=false;
  // Motes drifting out of the rift on both faces.
  const mote=mat({color:0xffc6ff,emissive:0xff8aff,emissiveIntensity:1.8});
  for(let i=0;i<8;i++){const a=rand(i+320)*Math.PI*2,r=.1+rand(i+330)*.22;
   add(new THREE.OctahedronGeometry(.012,0),mote,Math.cos(a)*r*.9,.48+Math.sin(a)*r*1.2,(i%2?1:-1)*(.04+rand(i+340)*.1)).castShadow=false;}
 }else if(kind==='web'){
  // Spider web strung upright between two gnarled posts. Silk is real (thin)
  // geometry rather than 1px lines, so it still reads from the play camera.
  const silk=mat({color:0xeeeee4,emissive:0x2a2a26,roughness:.45,transparent:true,opacity:.82});
  const post=mat({color:0x4a4038,roughness:1});
  const cy=.5,rx=.4,ry=.42,spokes=12;
  const at=(a,r,z=0)=>new THREE.Vector3(Math.cos(a)*r*rx,cy+Math.sin(a)*r*ry,z);
  const strand=(a,b,r=.0035)=>{const d=new THREE.Vector3().subVectors(b,a),len=d.length();
   const o=add(new THREE.CylinderGeometry(r,r,len,3,1,true),silk,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);
   o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());o.castShadow=false;return o;};
  // Posts, leaning slightly outward, with knots where the anchor lines tie on.
  for(const side of [-1,1]){
   const p=add(new THREE.CylinderGeometry(.022,.032,1,7),post,side*.44,.5,0);p.rotation.z=-side*.03;
   for(const y of [.2,.52,.84])add(new THREE.SphereGeometry(.03,7,5),post,side*.44+side*.012*(y-.5),y,0).scale.set(1,.6,1);
  }
  // Spokes run from the hub to the outer frame; anchor lines tie the frame to the posts and floor.
  const angle=(i)=>i/spokes*Math.PI*2+(rand(i+400)-.5)*.12;
  const rim=[];
  for(let i=0;i<spokes;i++){const a=angle(i),r=.92+rand(i+420)*.08;rim.push(at(a,r));strand(at(a,.05),at(a,r));}
  for(let i=0;i<spokes;i++)strand(rim[i],rim[(i+1)%spokes],.004);
  for(const [i,x,y] of [[0,.425,.52],[1,.425,.84],[spokes/2,-.425,.5],[spokes/2-1,-.425,.84],[spokes/2+1,-.425,.2],[spokes-1,.425,.2],[spokes*3/4,.06,.002]])
   strand(rim[i],new THREE.Vector3(x,y,0),.004);
  // Capture spiral: one continuous tube that sags a little between spokes.
  const pts=[],turns=7,per=spokes*2;
  for(let k=0;k<=turns*per;k++){
   const t=k/(turns*per),a=k/per*Math.PI*2,r=.14+t*.76,mid=k%2?.965:1;
   pts.push(at(a,r*mid,.002*Math.sin(k)));
  }
  const spiral=add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),turns*per*2,.0028,3,false),silk);spiral.castShadow=false;
  // Hub pad and dew beads that catch the light.
  const hub=add(new THREE.CircleGeometry(.06,12),mat({color:0xf4f4ea,roughness:.6,transparent:true,opacity:.55,side:THREE.DoubleSide}),0,cy,0);hub.scale.y=ry/rx;hub.castShadow=false;
  const dew=mat({color:0xdff2ff,emissive:0x5a7080,roughness:.05,metalness:.1,transparent:true,opacity:.9});
  for(let i=0;i<14;i++){const j=Math.floor(rand(i+440)*pts.length*.9)+4,p=pts[Math.min(j,pts.length-1)];
   add(new THREE.SphereGeometry(.007+rand(i+460)*.005,6,4),dew,p.x,p.y-.006,p.z).castShadow=false;}
  // A silk-wrapped victim dangling low on one side.
  const wrap=rim[Math.round(spokes*.62)];
  strand(wrap,new THREE.Vector3(wrap.x,.2,0),.003);
  const cocoon=add(new THREE.SphereGeometry(.04,10,8),mat({color:0xd8d6c8,roughness:.8}),wrap.x,.15,0);cocoon.scale.set(.8,1.5,.8);
  for(let i=0;i<3;i++){const band=add(new THREE.TorusGeometry(.033,.004,4,12),silk,wrap.x,.12+i*.03,0);band.rotation.x=Math.PI/2+(i-1)*.3;}
  // The spider waits just off the hub: cephalothorax, abdomen with a red mark, eight bent legs.
  const spider=new THREE.Group();spider.position.set(.09,cy+.12,.018);spider.rotation.z=-.5;g.add(spider);
  const chitin=mat({color:0x1a1614,roughness:.55,metalness:.15});
  add(new THREE.SphereGeometry(.026,10,8),chitin,0,.024,0,spider).scale.set(.9,1,.7);
  add(new THREE.SphereGeometry(.042,12,10),chitin,0,-.03,0,spider).scale.set(.9,1.15,.8);
  add(new THREE.SphereGeometry(.012,8,6),mat({color:0xb0201a,emissive:0x400806,roughness:.5}),0,-.03,.03,spider).scale.set(.7,1.3,.4);
  for(const side of [-1,1])for(let i=0;i<4;i++){
   const a=(i-1.5)*.5,hip=new THREE.Vector3(side*.02,.022-i*.008,0);
   const knee=new THREE.Vector3(side*.07,.03+Math.sin(-a)*.05+.03,.02);
   const foot=new THREE.Vector3(side*.1,Math.sin(-a)*.1+.02,-.01);
   for(const [p,q] of [[hip,knee],[knee,foot]]){const d=new THREE.Vector3().subVectors(q,p),len=d.length();
    const leg=add(new THREE.CylinderGeometry(.004,.003,len,4),chitin,(p.x+q.x)/2,(p.y+q.y)/2,(p.z+q.z)/2,spider);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());}
  }
 }else{
  // Unknown trap: a raised pressure plate with a shadow gap.
  block(.5,.012,.5,dark,0,.006,0);
  block(.44,.03,.44,stone,0,.022,0,.008);
 }
 // The parts are static, so direct children that share a material (and shadow
 // setting) are merged into one mesh each: one draw call per material instead
 // of one per strand, rock or rune line. Subgroups (the portal's rift, the
 // web's spider) stay separate so they can still be moved as a whole.
 const bins=new Map();
 for(const o of [...g.children]){
  if(!o.isMesh)continue;
  const key=`${o.material.uuid}:${o.castShadow}`;
  if(!bins.has(key))bins.set(key,[]);
  bins.get(key).push(o);
 }
 for(const meshes of bins.values()){
  if(meshes.length<2)continue;
  const indexed=meshes.every(o=>o.geometry.index);
  const geos=meshes.map(o=>{o.updateMatrix();const n=indexed||!o.geometry.index?o.geometry.clone():o.geometry.toNonIndexed();
   n.applyMatrix4(o.matrix);for(const k of Object.keys(n.attributes))if(k!=='position'&&k!=='normal'&&k!=='color')n.deleteAttribute(k);return n;});
  const merged=mergeGeometries(geos);for(const n of geos)n.dispose();
  if(!merged)continue;
  const m=new THREE.Mesh(merged,meshes[0].material);m.castShadow=meshes[0].castShadow;m.receiveShadow=true;
  for(const o of meshes){g.remove(o);o.geometry.dispose();geometries.splice(geometries.indexOf(o.geometry),1);}
  geometries.push(merged);g.add(m);
 }
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}
