import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Spellbook cover tints by glyph colour (CLR_BLACK..CLR_WHITE), kept dark enough to read as leather.
const SPELLBOOK_COVERS=[0x2b2626,0x8a2320,0x2f5e34,0x6b4527,0x2a3f7a,0x7a2a6e,0x2a7278,0x6f6c66,undefined,
 0xa85a22,0x4f9a3e,0xb09a32,0x3a62c0,0xc0708a,0x4ab0b8,0xd8d2c0];

// Gem tints by glyph colour; the appearance is shared by the real stone and its glass.
const GEM_COLORS=[0x1d1a26,0xc4202f,0x2f9e55,0xb47a2a,0x2d58d4,0x8c40c4,0x2aa4ac,0x9a9c9e,undefined,
 0xe46c1c,0x55cf5a,0xecc62e,0x5a86f0,0xd46ad0,0x6ad8e0,0xe6eef2];

// Food kinds with their own model; rations (including cram) keep the bundle below.
const FOOD_KIND=/\b(apple|orange|pear|melon|banana|carrot|egg|tin|lembas|fortune cookie|meatball|meat stick|chunk|meat ring|garlic|royal jelly|cream pie|candy bar|pancake|kelp frond|slime mold)(?:e?s)?\b/;

// Ground-only geometry: every model sits on y=0, without inventory-state mutation.
export function createGroundModel(item={}){
 const name=(item.name||'').toLowerCase(),cls=item.class;
 const g=new THREE.Group(),materials=[];
 const mat=(color,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness:metalness?.38:.9});materials.push(m);return m;};
 const cloth=mat(0xbaa987),leather=mat(0x654331),metal=mat(0x9baeb5,.75),gold=mat(0xb38b46,.65);
 const add=(geo,m,x=0,y=0,z=0)=>{const p=new THREE.Mesh(geo,m);p.position.set(x,y,z);p.castShadow=p.receiveShadow=true;g.add(p);return p;};
 const box=(w,h,d,m,x,y,z=0)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const ball=(r,m,x,y,z,s=[1,1,1])=>{const p=add(new THREE.SphereGeometry(r,16,10),m,x,y,z);p.scale.set(...s);return p;};
 if(/wolfsbane/.test(name)){
  const stem=mat(0x4c6334),leaf=mat(0x65884a),flower=mat(0x7965a6);
  const stalk=add(new THREE.CylinderGeometry(.009,.014,.55,8),stem,0,.026,0);stalk.rotation.x=Math.PI/2;
  for(let i=0;i<5;i++){
   const side=i%2?1:-1,z=-.19+i*.082;
   const blade=ball(.09,leaf,side*.065,.036,z,[.85,.15,.42]);blade.rotation.y=side*.55;
  }
  for(let i=0;i<3;i++){
   const x=(i-1)*.05,z=-.23+i*.035;
   ball(.043,flower,x,.07,z,[.8,1,.75]);
   ball(.027,flower,x,.04,z+.022,[1,.45,1]);
  }
 }else if(cls===10){
  // A closed, clasped tome lying flat. The name is the true spell, so the look comes
  // only from the glyph colour (the shuffled cover appearance).
  const cover=mat(SPELLBOOK_COVERS[item.color]??0x6b4527),trim=mat(0x3a2a1c),pages=mat(0xe2d6b4),edge=mat(0xa8987a);
  const sigil=new THREE.MeshStandardMaterial({color:0xd9b25a,metalness:.7,roughness:.35,emissive:0x6a4a12,emissiveIntensity:.5});materials.push(sigil);
  const W=.34,D=.44,T=.018,P=.07,H=P+2*T;
  add(new RoundedBoxGeometry(W,T,D,2,.006),cover,0,T/2);
  box(W-.03,P,D-.03,pages,.012,T+P/2);
  add(new RoundedBoxGeometry(W,T,D,2,.006),cover,0,T+P+T/2);
  // Rounded spine with raised bands along the left edge.
  const spine=add(new THREE.CylinderGeometry(H/2,H/2,D,16,1,false,Math.PI,Math.PI),cover,-W/2,H/2);spine.rotation.x=Math.PI/2;
  for(const z of [-.15,-.05,.05,.15]){const band=add(new THREE.CylinderGeometry(H/2+.005,H/2+.005,.016,16,1,false,Math.PI,Math.PI),trim,-W/2,H/2,z);band.rotation.x=Math.PI/2;band.scale.z=H/(H+.01);}
  // Faint page-edge lines on the fore-edge, head and tail.
  for(const y of [.3,.5,.7]){
   box(.002,.0025,D-.05,edge,W/2-.002,T+P*y);
   for(const s of [-1,1])box(W-.06,.0025,.002,edge,.012,T+P*y,s*(D/2-.014));
  }
  // Brass corner guards on the fore-edge corners, top and bottom.
  for(const y of [T/2+.003,T+P+T/2])for(const z of [-1,1])add(new RoundedBoxGeometry(.05,T+.006,.05,2,.004),metal,W/2-.022,y,z*(D/2-.022));
  // A glinting sigil: a ring around a flattened gem, with four short rays.
  const top=H+.003;
  add(new THREE.TorusGeometry(.075,.007,6,32),sigil,-.015,top).rotation.x=Math.PI/2;
  ball(.032,sigil,-.015,top,0,[1,.18,1]);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4,ray=box(.05,.004,.01,sigil,-.015+Math.cos(a)*.105,top,Math.sin(a)*.105);ray.rotation.y=-a;}
  // Clasp strap wrapping from the top cover over the fore-edge, with a buckle.
  box(.07,.005,.05,trim,W/2-.03,H+.002);
  box(.005,H,.05,trim,W/2+.003,H/2);
  add(new RoundedBoxGeometry(.03,.012,.064,2,.004),metal,W/2-.05,H+.006);
  // Ribbon bookmark trailing from the tail onto the floor.
  const from=new THREE.Vector3(.07,T+P*.55,D/2-.01),to=new THREE.Vector3(.1,.006,D/2+.09),d=to.clone().sub(from);
  const ribbon=box(.02,.002,d.length(),mat(0x8c1f24),(from.x+to.x)/2,(from.y+to.y)/2,(from.z+to.z)/2);
  ribbon.rotation.set(Math.atan2(-d.y,Math.hypot(d.x,d.z)),Math.atan2(d.x,d.z),0,'YXZ');
  g.rotation.y=.3;
 }else if(cls===13){
  // Gems, glass, gray stones and rocks. The name is the true identity, so the look comes
  // only from the shuffled appearance and the glyph colour: a ruby and red glass match.
  const look=(item.appearance||'').toLowerCase();
  const chip=(r,m,x,y,z,s,ry)=>{const p=add(new THREE.DodecahedronGeometry(r,0),m,x,y,z);p.scale.set(...s);p.rotation.set(.4,ry,.25);
   p.updateMatrixWorld();p.position.y-=new THREE.Box3().setFromObject(p).min.y;return p;};
  if(!look){
   // Rocks: a small spill of angular rubble.
   const stone=mat(0x6c6862),light=mat(0x8a8378);
   chip(.075,stone,-.05,.045,.02,[1,.6,.85],.3);chip(.055,light,.07,.034,-.04,[1,.62,.9],1.1);
   chip(.045,stone,.03,.028,.09,[1,.62,.8],2);chip(.032,light,-.1,.02,-.08,[1,.62,1],.7);
  }else if(/gray/.test(look)){
   // Gray stones share one smooth river pebble with a pale vein, so luck and load stay hidden.
   const pebble=mat(0x77797a),vein=mat(0xb6b3aa);
   ball(.1,pebble,0,.042,0,[1.25,.42,.9]).rotation.y=.5;
   const band=add(new THREE.TorusGeometry(.09,.006,6,28),vein,0,.042,0);band.rotation.set(Math.PI/2,0,.5);band.scale.set(1.24,.9,1);
  }else if(/metal/.test(look)){
   // Unrefined mithril: a lumpy silvery nugget.
   const ore=mat(0xc8d0d6,.85);
   chip(.07,ore,0,.045,0,[1.2,.65,.9],.4);chip(.04,ore,.07,.03,.03,[1,.7,1],1.3);chip(.035,ore,-.065,.028,-.03,[1,.7,1],2.2);
  }else{
   // A cut gem lying tipped on its pavilion, with a glint on the table.
   const tint=new THREE.Color(GEM_COLORS[item.color]??0xd8e4ea);
   const facet=new THREE.MeshStandardMaterial({color:tint,metalness:.15,roughness:.08,flatShading:true,transparent:true,opacity:.86,emissive:tint,emissiveIntensity:.18});
   const glint=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.75,depthWrite:false});
   materials.push(facet,glint);
   const gem=new THREE.Group();gem.position.set(0,.052,0);gem.rotation.set(.74,.35,0);g.add(gem);
   const part=(geo,m,y)=>{const p=new THREE.Mesh(geo,m);p.position.y=y;p.castShadow=p.receiveShadow=true;gem.add(p);return p;};
   part(new THREE.CylinderGeometry(.052,.082,.036,8),facet,.018);
   part(new THREE.CylinderGeometry(.082,.082,.008,8),facet,-.004);
   part(new THREE.ConeGeometry(.082,.075,8),facet,-.0455).rotation.x=Math.PI;
   const sparkle=part(new THREE.OctahedronGeometry(.018,0),glint,.04);sparkle.scale.set(1,.2,1);
   // A soft coloured spill of light on the floor beside it.
   const pool=add(new THREE.CircleGeometry(.12,20),new THREE.MeshBasicMaterial({color:tint,transparent:true,opacity:.18,depthWrite:false}),.035,.002,.03);
   pool.rotation.x=-Math.PI/2;materials.push(pool.material);
   gem.updateMatrixWorld(true);gem.position.y-=new THREE.Box3().setFromObject(gem).min.y;
  }
 }else if(cls===6&&/\b(?:oil lamp|magic lamp|lamp)\b/.test(name)){
  // Oil and magic lamps deliberately share their unidentified appearance.
  const soot=mat(0x302b23);
  add(new THREE.CylinderGeometry(.13,.15,.035,24),gold,0,.0175);
  ball(.19,gold,0,.105,0,[1,.48,.78]);
  add(new THREE.CylinderGeometry(.084,.10,.025,24),gold,0,.194);
  ball(.027,gold,0,.222,0,[1,.65,1]);
  const spout=new THREE.CatmullRomCurve3([
   new THREE.Vector3(.12,.105,0),new THREE.Vector3(.22,.12,0),
   new THREE.Vector3(.30,.16,0),new THREE.Vector3(.36,.205,0)
  ]);
  add(new THREE.TubeGeometry(spout,20,.032,10,false),gold);
  const mouth=add(new THREE.TorusGeometry(.032,.008,8,16),gold,.36,.205);
  const direction=spout.getTangent(1).normalize();
  mouth.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction);
  const opening=add(new THREE.CircleGeometry(.024,16),soot,.36,.205);
  opening.quaternion.copy(mouth.quaternion);
  opening.position.addScaledVector(direction,.002);
  const handle=add(new THREE.TorusGeometry(.091,.018,8,24),gold,-.21,.14);
  handle.scale.y=.85;
 }else if(cls===6&&/\bcan of grease\b/.test(name)){
  const tin=mat(0x7b8588,.65),label=mat(0x8c7750),stamp=mat(0x443c2c);
  add(new THREE.CylinderGeometry(.145,.145,.19,32),tin,0,.105);
  // A paper band and concentric stamped lid distinguish this from a potion.
  add(new THREE.CylinderGeometry(.147,.147,.09,32,1,true),label,0,.105);
  add(new THREE.CylinderGeometry(.133,.133,.009,32),tin,0,.198);
  for(const y of [.016,.2])add(new THREE.TorusGeometry(.141,.009,8,32),metal,0,y).rotation.x=Math.PI/2;
  add(new THREE.TorusGeometry(.105,.003,6,32),stamp,0,.204).rotation.x=Math.PI/2;
  // Pressed oval maker's mark: no invented readable lettering at game zoom.
  const mark=add(new THREE.CircleGeometry(.038,20),stamp,0,.205);
  mark.rotation.x=-Math.PI/2;mark.scale.x=1.5;
 }else if(cls===11){
  const rod=add(new THREE.CylinderGeometry(.025,.035,.6,12),leather,0,.045,0);rod.rotation.z=Math.PI/2;
  for(const x of [-.27,.2,.27]){const band=add(new THREE.CylinderGeometry(.04,.04,.025,12),gold,x,.045,0);band.rotation.z=Math.PI/2;}
 }else if(/boots|shoes/.test(name)){
  for(const x of [-.13,.13]){ball(.13,leather,x,.10,.035,[.75,.7,1.45]);add(new THREE.CylinderGeometry(.07,.085,.22,12),leather,x,.19,-.075);add(new THREE.TorusGeometry(.074,.012,6,16),gold,x,.3,-.075).rotation.x=Math.PI/2;}
 }else if(/t-shirt|shirt|towel|cloak/.test(name)){
  const towel=/towel/.test(name),cloak=/cloak/.test(name);
  const fabric=cloak?mat(0x53625b):cloth;
  // Sample the silhouette into strips so folds bend the whole cloth surface,
  // rather than adding dark rods on top of a rigid rectangular block.
  const rows=32,cols=24,positions=[],indices=[];
  const width=t=>towel?.21:cloak?.10+.20*t:
   t<.12?.17+t*.75:t<.36?.26:t<.46?.26-(t-.36)*.9:.17;
  const height=(x,z)=>.019+.009*Math.sin(x*47+z*5)+.006*Math.cos(z*23-x*8);
  for(let row=0;row<=rows;row++){
   const t=row/rows,w=width(t);
   for(let col=0;col<=cols;col++){
    const u=col/cols,x=(u*2-1)*w;
    // The neckline recedes into the shoulders, leaving an actual open notch.
    const neckline=towel?0:.065*Math.exp(-Math.pow(x/.068,4))*(1-t)**8;
    const z=-.26+t*.52+neckline;
    positions.push(x,height(x,z),z);
   }
  }
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   const a=row*(cols+1)+col,b=a+cols+1;
   indices.push(a,b,a+1,a+1,b,b+1);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setIndex(indices);geo.computeVertexNormals();fabric.side=THREE.DoubleSide;
  add(geo,fabric);
  const hem=mat(cloak?0x778379:0xd3c4a4);
  const edge=(points)=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),48,.0035,5,false),hem);
  for(const row of [0,rows])edge(Array.from({length:cols+1},(_,col)=>new THREE.Vector3(...positions.slice((row*(cols+1)+col)*3,(row*(cols+1)+col)*3+3))));
  for(const col of [0,cols])edge(Array.from({length:rows+1},(_,row)=>new THREE.Vector3(...positions.slice((row*(cols+1)+col)*3,(row*(cols+1)+col)*3+3))));
  if(towel){
   // Short uneven fringe stays on the floor at both ends.
   for(const side of [-1,1])for(let i=0;i<13;i++){
    const x=(i-6)*.03,z=side*.26;
    edge([new THREE.Vector3(x,height(x,z),z),new THREE.Vector3(x+.004,.012,z+side*(.018+(i%3)*.004))]);
   }
  }
 }else if(/mail|mithril|coat/.test(name)&&cls===3){
  add(new RoundedBoxGeometry(.38,.09,.48,3,.025),metal,0,.05);
  for(const x of [-.235,.235])add(new RoundedBoxGeometry(.16,.075,.18,3,.02),metal,x,.045,-.14);
  // Links sit against the garment, rather than hovering over a spherical shell.
  for(let row=0;row<7;row++)for(let col=0;col<6;col++){const ring=add(new THREE.TorusGeometry(.025,.006,5,10),metal,(col-2.5)*.055,.097,-.17+row*.055);ring.rotation.x=-Math.PI/2;}
  add(new THREE.TorusGeometry(.059,.013,6,18),leather,0,.096,-.195).rotation.x=-Math.PI/2;
 }else if(/bag|sack/.test(name)){
  ball(.22,leather,0,.19,0,[1,.85,.8]);add(new THREE.CylinderGeometry(.06,.13,.08,12),cloth,0,.36,0);add(new THREE.TorusGeometry(.085,.015,6,16),gold,0,.37,0).rotation.x=Math.PI/2;
 }else if(/ration/.test(name)){
  if(/tripe/.test(name)){const meat=mat(0xa26457);for(let i=0;i<4;i++)ball(.1,meat,(i-1.5)*.075,.065,Math.sin(i)*.035,[.7,.5,1.3]);}
  else {
   add(new RoundedBoxGeometry(.42,.14,.28,4,.045),cloth,0,.075);
   const cord=(points)=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),true),32,.007,6,true),leather);
   cord([[0,.147,-.085],[0,.13,-.14],[0,.035,-.14],[0,.007,0],[0,.035,.14],[0,.13,.14],[0,.147,.085]]);
   cord([[-.15,.147,0],[-.21,.12,0],[-.21,.04,0],[0,.007,0],[.21,.04,0],[.21,.12,0],[.15,.147,0]]);
   for(const side of [-1,1]){const loop=add(new THREE.TorusGeometry(.025,.006,6,16),leather,side*.024,.153,0);loop.rotation.x=Math.PI/2;loop.scale.z=.6;}
   ball(.014,leather,0,.155,0);
  }
 }else if(cls===7&&FOOD_KIND.test(name)){
  // Everyday food: small, grounded, and shaped by kind. Food names are never shuffled.
  const kind=name.match(FOOD_KIND)[1];
  const lie=(r0,r1,len,m,x,y,z,ry=0,seg=12)=>{const p=add(new THREE.CylinderGeometry(r0,r1,len,seg),m,x,y,z);p.rotation.set(0,ry,Math.PI/2);return p;};
  const stalk=mat(0x4a3322),leaf=mat(0x4f8a3a);
  if(kind==='apple'||kind==='orange'||kind==='pear'){
   const skin=mat(kind==='apple'?0xb3261e:kind==='orange'?0xe07a18:0xb7b848);
   if(kind==='pear'){ball(.075,skin,0,.075,0,[1,.95,1]);ball(.05,skin,0,.15,0);}
   else ball(.085,skin,0,.08,0,[1,.9,1]);
   const top=kind==='pear'?.2:kind==='apple'?.155:.16;
   if(kind==='orange')ball(.014,leaf,0,top,0,[1,.4,1]);
   else{const s=add(new THREE.CylinderGeometry(.005,.007,.05,6),stalk,.004,top+.015,0);s.rotation.z=-.25;
    const l=ball(.03,leaf,.03,top+.02,0,[1,.12,.45]);l.rotation.z=.4;}
  }else if(kind==='melon'){
   const rind=mat(0x3f7a33),stripe=mat(0x2a5424);
   ball(.14,rind,0,.105,0,[1.25,.78,1]);
   // Thin meridian slivers in the melon's own squashed frame read as stripes.
   const shell=new THREE.Group();shell.position.y=.105;shell.scale.set(1.25,.78,1);g.add(shell);
   for(let i=0;i<6;i++){const band=new THREE.Mesh(new THREE.SphereGeometry(.1425,20,12),stripe);band.scale.set(.05,1,1);band.rotation.y=i*Math.PI/6;band.castShadow=true;shell.add(band);}
  }else if(kind==='banana'){
   const peel=mat(0xe3c63a),tip=mat(0x4a3322);
   const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.16,.06,0),new THREE.Vector3(0,.02,.09),new THREE.Vector3(.16,.06,0));
   add(new THREE.TubeGeometry(curve,20,.03,8,false),peel);
   ball(.018,tip,.162,.061,0);lie(.008,.016,.04,tip,-.18,.066,0);
  }else if(kind==='carrot'){
   const root=mat(0xe06a1c);
   lie(.035,.004,.3,root,.02,.036,0,0,10).rotation.z=-Math.PI/2;
   for(let i=0;i<3;i++){const f=ball(.06,leaf,-.17,.03+i*.008,(i-1)*.03,[1,.1,.3]);f.rotation.y=(i-1)*.45;}
  }else if(kind==='egg'){
   ball(.045,mat(0xeee6d4),0,.045,0,[.95,1,1.3]).rotation.x=Math.PI/2;
  }else if(kind==='tin'){
   const can=mat(0xa3adb0,.7);
   add(new THREE.CylinderGeometry(.075,.075,.1,24),can,0,.05);
   for(const y of [.006,.094])add(new THREE.TorusGeometry(.074,.006,6,24),can,0,y).rotation.x=Math.PI/2;
   for(const y of [.035,.065])add(new THREE.TorusGeometry(.076,.003,5,24),can,0,y).rotation.x=Math.PI/2;
  }else if(kind==='lembas'){
   const wafer=mat(0xe7dcb4),wrap=mat(0x5e8b43);
   add(new RoundedBoxGeometry(.2,.025,.14,2,.01),wafer,0,.0125);
   const l=ball(.13,wrap,-.03,.02,0,[1,.12,.62]);l.rotation.y=.25;
   box(.012,.004,.16,mat(0x8a6b3a),.03,.034);
  }else if(kind==='fortune cookie'){
   const c=add(new THREE.TorusGeometry(.045,.025,8,16,Math.PI*1.4),mat(0xd09a4c),0,.035,0);c.rotation.x=-Math.PI/2;c.scale.set(1,.8,1);
   box(.05,.001,.012,mat(0xf2eee2),.05,.03,.02).rotation.y=.4;
  }else if(kind==='meatball'){
   ball(.055,mat(0x6e3a26),0,.05,0,[1,.9,1]);
  }else if(kind==='meat stick'){
   lie(.02,.02,.26,mat(0x7a3420),0,.02,0,.4,10);
  }else if(kind==='chunk'||kind==='meat ring'){
   const raw=mat(0x9c3c30),fat=mat(0xe2c8b0);
   if(kind==='meat ring'){add(new THREE.TorusGeometry(.07,.03,8,20),raw,0,.03,0).rotation.x=Math.PI/2;}
   else{ball(.13,raw,.03,.08,0,[1.2,.6,1]);ball(.08,fat,.1,.09,.04,[1,.5,.8]);
    lie(.016,.016,.12,fat,-.15,.06,0);ball(.026,fat,-.21,.06,.012);ball(.026,fat,-.21,.06,-.012);}
  }else if(kind==='garlic'){
   const bulb=mat(0xe8e1cf);ball(.04,bulb,0,.035,0,[1,.85,1]);add(new THREE.ConeGeometry(.02,.05,8),bulb,0,.085,0);
  }else if(kind==='royal jelly'){
   const jelly=new THREE.MeshStandardMaterial({color:0xe6b02e,roughness:.15,transparent:true,opacity:.8,emissive:0x6a4a08,emissiveIntensity:.3});materials.push(jelly);
   ball(.07,jelly,0,.03,0,[1.2,.42,1]);ball(.035,jelly,.05,.04,.03,[1,.6,1]);
  }else if(kind==='cream pie'){
   const crust=mat(0xc58a48),cream=mat(0xf4eee4);
   add(new THREE.CylinderGeometry(.14,.11,.04,24),crust,0,.02);add(new THREE.TorusGeometry(.13,.014,6,24),crust,0,.04).rotation.x=Math.PI/2;
   ball(.12,cream,0,.04,0,[1,.35,1]);ball(.03,cream,0,.08,0);
  }else if(kind==='candy bar'){
   const wrapper=mat(0xa3222a),foil=mat(0xc8cdd0,.75);
   box(.22,.03,.08,wrapper,0,.015);box(.07,.032,.082,foil,0,.016);
   for(const s of [-1,1])add(new THREE.ConeGeometry(.03,.04,4),foil,s*.125,.015,0).rotation.z=-s*Math.PI/2;
  }else if(kind==='pancake'){
   const cake=mat(0xd49a52),butter=mat(0xf0da78);
   for(let i=0;i<3;i++)add(new THREE.CylinderGeometry(.12-i*.004,.12,.018,24),cake,i*.006,.009+i*.019);
   box(.04,.012,.04,butter,.01,.063);
  }else if(kind==='kelp frond'){
   const kelp=mat(0x3d6a3a);
   for(let i=0;i<3;i++){const f=ball(.16,kelp,(i-1)*.04,.006+i*.004,(i-1)*.03,[1,.04,.22]);f.rotation.y=(i-1)*.5;}
  }else{
   // Slime mold: a lumpy, faintly glowing blob.
   const slime=new THREE.MeshStandardMaterial({color:0x7ab83a,roughness:.3,emissive:0x2a4a10,emissiveIntensity:.35});materials.push(slime);
   ball(.08,slime,0,.035,0,[1.2,.5,1]);ball(.045,slime,.06,.03,.04,[1,.6,1]);ball(.04,slime,-.05,.025,-.05,[1,.6,1]);
  }
  // Drop the whole model onto the floor.
  g.updateMatrixWorld(true);const low=new THREE.Box3().setFromObject(g).min.y;g.children.forEach(p=>p.position.y-=low);
 }else if(/unicorn horn/.test(name)){
  const horn=add(new THREE.ConeGeometry(.085,.48,16),cloth,0,.085,0);horn.rotation.z=-Math.PI/2;
  for(let i=0;i<5;i++){const ring=add(new THREE.TorusGeometry(.075-i*.012,.007,5,12),gold,-.19+i*.07,.085,0);ring.rotation.y=Math.PI/2;}
 }else if(/candelabrum/.test(name)){
  add(new THREE.CylinderGeometry(.17,.19,.04,16),gold,0,.02);add(new THREE.CylinderGeometry(.025,.035,.3,12),gold,0,.18);
  for(let i=0;i<7;i++){const x=(i-3)*.075;box(.018,.04,.02,gold,x,.3);box(.47,.018,.035,gold,0,.3);add(new THREE.CylinderGeometry(.019,.019,.16,8),cloth,x,.4);box(.004,.015,.004,leather,x,.487);}
 }else if(/marker/.test(name)){
  const pen=add(new THREE.CylinderGeometry(.035,.035,.32,12),leather,0,.04);pen.rotation.z=Math.PI/2;const cap=add(new THREE.CylinderGeometry(.04,.04,.08,12),gold,.15,.04);cap.rotation.z=Math.PI/2;
 }else{materials.forEach(m=>m.dispose());return null;}
 g.userData.dispose=()=>{g.traverse(o=>o.geometry?.dispose());materials.forEach(m=>m.dispose());};return g;
}
