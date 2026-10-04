import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {fireTrapAnimator} from './fire-trap-fx.js';
import {sigilAnimator} from './sigil-fx.js';

// The bridge reports traps as generic `feature` cells, so the trap family comes
// from the map symbol and its colour (drawing.c defsyms). Several traps share a
// colour, so each model stands for its family, not one exact trap.
// A newer bridge also sends the trap's name, which tells the vibrating square (magenta, like a
// teleport trap) apart, arrow and dart traps from the bear trap (all cyan), and the squeaky
// board from the trap door (both brown), the sleeping gas trap from the magic trap (both
// bright blue), the rolling boulder trap and the statue trap from the falling rock trap (all
// grey), the anti-magic field from the magic trap (both bright blue), and a dug hole from the
// trap door (both brown), and a plain pit from a spiked pit (both black).
export function trapKind(symbol,color,name){
 if(name==='vibrating square')return 'vibrating';
 if(name==='arrow trap')return 'arrow';
 if(name==='dart trap')return 'dart';
 if(name==='squeaky board')return 'squeaky';
 if(name==='sleeping gas trap')return 'gas';
 if(name==='rolling boulder trap')return 'rolling';
 if(name==='anti-magic field')return 'antimagic';
 if(name==='statue trap')return 'statue';
 if(name==='hole')return 'hole';
 if(name==='pit')return 'barepit';
 if(symbol===34)return 'web';            // '"'
 if(symbol!==94)return null;             // '^'
 return {0:'pit',1:'mine',3:'hatch',4:'rust',6:'jaws',7:'rubble',9:'fire',
  5:'teleport',13:'portal',12:'magic',10:'polymorph',15:'ice'}[color]||'plate';
}

const RUNES={teleport:[0xb070ff,0x7a2cff],magic:[0x6fb4ff,0x2c6cff],polymorph:[0x7dff8a,0x22c94a],ice:[0xd8f4ff,0x7fc8ff]};

// Transforms a part and paints its vertices (paint gets the colour, position and
// normal), dropping uvs so parts can be merged into one vertex-coloured mesh.
function bake(geo,paint,{x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1}={}){
 const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.scale.set(sx,sy,sz);o.updateMatrix();
 const n=geo.index?geo.toNonIndexed():geo;if(n!==geo)geo.dispose();
 n.applyMatrix4(o.matrix);n.deleteAttribute('uv');
 const pos=n.attributes.position,nor=n.attributes.normal,col=new Float32Array(pos.count*3),c=new THREE.Color();
 for(let i=0;i<pos.count;i++){paint(c,pos.getX(i),pos.getY(i),pos.getZ(i),nor.getX(i),nor.getY(i),nor.getZ(i));col.set([c.r,c.g,c.b],i*3);}
 n.setAttribute('color',new THREE.BufferAttribute(col,3));return n;
}

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
  // Spiked pit (and a plain pit when the bridge sends no name): the floor has caved into a ragged maw. The broken flagstones round it
  // tip inward, roots hang over its lip, and earth strata darken into black where sharpened
  // stakes rise from the dark, one of them run through a skull. Claw scratches score the floor
  // where something tried to climb out. Two merged, vertex-coloured meshes: the flat mouth and
  // scratches (no shadow), and everything standing (stones, roots, stakes, bone).
  const noise=(x,z)=>{const s=Math.sin(x*127.1+z*311.7+seed*7.3)*43758.5453;return s-Math.floor(s);};
  const black=new THREE.Color(0x030303),loam=new THREE.Color(0x2e2419),clay=new THREE.Color(0x4d3a28),c=new THREE.Color();
  const N=36,K=7,reach=[];
  for(let i=0;i<N;i++)reach.push(.28+(i%2?.035:0)*rand(i+900)+rand(i+910)*.045);
  const R=(i)=>reach[((i%N)+N)%N];
  // Mouth: rings from the black heart out to the jagged lip. Bands of earth show near the lip
  // like layers of the shaft wall seen at a slant.
  const mp=[],mc=[];
  const mouthAt=(k,i)=>{const a=i/N*Math.PI*2,t=k/K,r=R(i)*t,x=Math.cos(a)*r,z=Math.sin(a)*r;
   c.copy(black);
   if(t>.55){const w=(t-.55)/.45;c.lerp(loam,w*w).lerp(clay,t>.85&&(k+i)%3===0?.5:0);}
   c.lerp(black,.25*noise(x*20,z*20));
   mp.push(x,.004,z);mc.push(c.r,c.g,c.b);};
  for(let k=0;k<K;k++)for(let i=0;i<N;i++){mouthAt(k,i);mouthAt(k+1,i+1);mouthAt(k+1,i);if(k){mouthAt(k,i);mouthAt(k,i+1);mouthAt(k+1,i+1);}}
  // Claw scratches: sets of three gouges running out from the lip across the floor.
  for(let s=0;s<3;s++){
   const a=rand(s+920)*Math.PI*2,base=R(Math.round(a/(Math.PI*2)*N))+.03,len=Math.min(.06+rand(s+930)*.04,.43-base);
   for(let j=-1;j<=1;j++){
    const off=j*.016,ca=Math.cos(a),sa=Math.sin(a),ox=-sa*off,oz=ca*off,w=.0035;
    const q=[[base,-w],[base,w],[base+len,-w*.3],[base+len,w*.3]].map(([r,o])=>[ca*r+ox-sa*o,sa*r+oz+ca*o]);
    for(const n of [0,1,2,1,3,2]){mp.push(q[n][0],.0045,q[n][1]);c.set(0x0d0b09);mc.push(c.r,c.g,c.b);}
   }
  }
  const mouthGeo=new THREE.BufferGeometry();
  mouthGeo.setAttribute('position',new THREE.Float32BufferAttribute(mp,3));
  mouthGeo.setAttribute('normal',new THREE.Float32BufferAttribute(mp.map((_,i)=>i%3===1?1:0),3));
  mouthGeo.setAttribute('color',new THREE.Float32BufferAttribute(mc,3));
  const mouth=add(mouthGeo,mat({color:0xffffff,vertexColors:true,roughness:1}));mouth.castShadow=false;mouth.name='pit-mouth';
  const parts=[];
  // Broken flagstones ringing the lip, each cracked off and tipped down toward the hole,
  // dark and damp on the edge that faces the drop.
  const slab=(col,x,y,z)=>{const r=Math.hypot(x,z),n=noise(x*60+y*20,z*60);
   col.set(0x6f716c).lerp(new THREE.Color(0x4f514c),.6*n).lerp(black,Math.min(1,Math.max(0,(.37-r)/.07))*.8);};
  for(let i=0;i<10;i++){
   const a=(i+rand(i+940)*.5)/10*Math.PI*2,r=Math.min(R(Math.round(i*N/10))+.035+rand(i+950)*.02,.37);
   const w=.07+rand(i+960)*.05,d=.05+rand(i+970)*.03;
   parts.push(bake(new THREE.BoxGeometry(w,.022,d),slab,{x:Math.cos(a)*r,y:.006,z:Math.sin(a)*r,ry:-a+Math.PI/2+(rand(i+980)-.5)*.5,rx:-.25-rand(i+990)*.25,rz:(rand(i+1000)-.5)*.2}));
  }
  // Loose earth and chips of stone at the edge.
  for(let i=0;i<12;i++){const a=rand(i+1010)*Math.PI*2,r=Math.min(R(i*3)+.01+rand(i+1020)*.08,.41),s=.01+rand(i+1030)*.018;
   const earthy=i%3!==0;
   parts.push(bake(new THREE.DodecahedronGeometry(s,0),(col,x,y,z)=>col.set(earthy?0x3f3223:0x5d5f5a).lerp(black,.3*noise(x*80,z*80)),{x:Math.cos(a)*r,y:s*.45,z:Math.sin(a)*r,rx:rand(i+1040)*3,ry:rand(i+1050)*3,sy:.6}));}
  // Roots dangling over the lip into the dark.
  for(let i=0;i<4;i++){
   const a=rand(i+1060)*Math.PI*2,r=R(Math.round(a/(Math.PI*2)*N)),ca=Math.cos(a),sa=Math.sin(a),tw=(rand(i+1070)-.5)*.3;
   const pts=[[r+.04,.006],[r-.01,.01],[r-.05,.006],[r-.09,.003]].map(([rr,y],j)=>new THREE.Vector3(Math.cos(a+tw*j*.3)*rr,y,Math.sin(a+tw*j*.3)*rr));
   parts.push(bake(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),8,.0045-i*.0005,4,false),(col,x,y,z)=>{const rr=Math.hypot(x,z);col.set(0x3a2a1a).lerp(black,Math.min(1,Math.max(0,(r-rr)/.08)));}));
  }
  // Stakes: sharpened poles rising from the black, splintered pale at the tips, a few
  // stained dark red where they have been used.
  const stakes=[];
  for(let i=0;i<6;i++){
   const a=i/6*Math.PI*2+rand(i+1080)*.7,r=.06+rand(i+1090)*.13,h=.08+rand(i+1100)*.05,rad=.009+rand(i+1110)*.004;
   const lean={rx:(rand(i+1120)-.5)*.5,rz:(rand(i+1130)-.5)*.5},bloody=rand(i+1140)>.55;
   const pole=new THREE.CylinderGeometry(rad*.8,rad,h*.72,6);pole.translate(0,h*.36,0);
   const tip=new THREE.ConeGeometry(rad*.8,h*.28,6);tip.translate(0,h*.86,0);
   const paint=(col,x,y,z)=>{const t=Math.min(1,Math.max(0,y/h)),n=noise(x*90+y*40,z*90);
    col.set(0x3f2c1a).lerp(new THREE.Color(0x5e4428),.5*n);
    if(t>.72)col.lerp(new THREE.Color(0xa08a68),Math.min(1,(t-.72)/.2));
    if(bloody&&t>.6)col.lerp(new THREE.Color(0x3a0806),.7);
    col.lerp(black,Math.min(1,Math.max(0,(.45-t)/.45)));};
   const at={x:Math.cos(a)*r,y:0,z:Math.sin(a)*r,...lean};
   parts.push(bake(pole,paint,at),bake(tip,paint,at));
   stakes.push({...at,h});
  }
  // The last one to fall in: a skull run down onto the tallest stake, facing up out of the pit.
  const top=stakes.reduce((p,q)=>q.h>p.h?q:p);
  const post=new THREE.Object3D();post.position.set(top.x,0,top.z);post.rotation.set(top.rx,0,top.rz);post.updateMatrix();
  const bone=(col,x,y,z)=>col.set(0xb8ae98).lerp(new THREE.Color(0x5a5244),.5*noise(x*70,z*70)+Math.max(0,(.06-y)*8));
  const skull=(geo,at,paint=bone)=>{const n=geo.index?geo.toNonIndexed():geo;if(n!==geo)geo.dispose();
   const o=new THREE.Object3D();o.position.set(at.x||0,top.h*.62+(at.y||0),at.z||0);o.rotation.set(-.5,rand(1150)*Math.PI*2,0);o.scale.set(at.sx||1,at.sy||1,at.sz||1);o.updateMatrix();
   n.applyMatrix4(o.matrix);n.applyMatrix4(post.matrix);return bake(n,paint);};
  parts.push(skull(new THREE.SphereGeometry(.03,12,9),{sx:.9,sy:.85,sz:1.1}));
  parts.push(skull(new THREE.BoxGeometry(.036,.024,.028),{y:-.013,z:.02}));
  for(const [x,y,rr] of [[-.009,-.004,.008],[.009,-.004,.008],[0,-.017,.004]])
   parts.push(skull(new THREE.SphereGeometry(rr,7,5),{x,y,z:.034,sz:.5},col=>col.copy(black)));
  add(mergeGeometries(parts),mat({color:0xffffff,vertexColors:true,roughness:.93})).name='pit-rim';
  parts.forEach(p=>p.dispose());
 }else if(kind==='barepit'){
  // Plain pit: no stakes, just a raw hole clawed out of the earth under the flagstones. The
  // flat mouth is painted in false perspective (as for the hole), so from the play camera the
  // far wall shows as crumbling bands of loam, clay and pale chalk threaded with roots, sliding
  // down to a dim earthen floor where an earlier victim lies: a skull, a scatter of long bones
  // and a broken arc of ribs. The spoil of the digging is heaped on the far side, flagstones
  // lie heaved up and tipped round the lip, clods have crumbled over the edge, and two heel
  // gouges in a smear of loose earth show where someone slid in. Two merged, vertex-coloured
  // meshes: the flat mouth and gouges (no shadow), and everything standing.
  const noise=(x,z)=>{const s=Math.sin(x*127.1+z*311.7+seed*7.3)*43758.5453;return s-Math.floor(s);};
  const black=new THREE.Color(0x030303),c=new THREE.Color();
  const N=48,K=12,reach=[];
  for(let i=0;i<N;i++)reach.push(.25+rand(i+1600)*.04+(i%4===0?.02*rand(i+1610):0));
  const R=(a)=>{const f=((a/(Math.PI*2))%1+1)%1*N,i=Math.floor(f),t=f-i;return reach[i%N]*(1-t)+reach[(i+1)%N]*t;};
  // The pit floor: the mouth shrunk and slid toward the camera. A pit is shallower than a
  // hole, so it slides less and shrinks less, and its floor is dark earth, not black.
  const view=new THREE.Vector2(.566,.824),shift=.06,shrink=.62;
  const floorC=new THREE.Vector2(view.x*shift,view.y*shift);
  const wallAt=(x,z)=>{
   const r=Math.hypot(x,z),a=Math.atan2(z,x),L=R(a);if(r<1e-6)return 1;
   const ux=x/r,uz=z/r,uc=ux*floorC.x+uz*floorC.y,rho=L*shrink;
   const inner=uc+Math.sqrt(Math.max(0,uc*uc-floorC.lengthSq()+rho*rho));
   return Math.min(1,Math.max(0,(L-r)/Math.max(.004,L-inner)));};
  const strata=[0x3c2e1f,0x5a4630,0x2c2117,0x7a7262,0x4a3826,0x2a2016].map(h=>new THREE.Color(h));
  const loam=new THREE.Color(0x3a2c1e),root=new THREE.Color(0x140e09);
  const mp=[],mc=[];
  const push=(x,y,z,col)=>{mp.push(x,y,z);mc.push(col.r,col.g,col.b);};
  const mouthAt=(k,i)=>{const a=i/N*Math.PI*2,r=R(a)*k/K,x=Math.cos(a)*r,z=Math.sin(a)*r,t=wallAt(x,z);
   if(t>=1){
    // The floor: dim loam, lumpy, darkest against the walls.
    const d=Math.hypot(x-floorC.x,z-floorC.y)/(R(a)*shrink);
    c.copy(loam).lerp(black,.35*noise(x*30,z*30)+.4*Math.max(0,d-.6));
   }else{
    // Wavy bands down the wall; thin dark root threads cross them, and it all dims with depth.
    const band=Math.min(strata.length-1,Math.floor((t+.05*Math.sin(a*7+seed))*strata.length));
    c.copy(strata[Math.max(0,band)]).lerp(black,.3*noise(x*40,z*40));
    if(Math.sin(a*23+seed*3)>.93&&t>.15)c.lerp(root,.8);
    c.lerp(black,.65*Math.min(1,t**1.2));
   }
   push(x,.004,z,c);};
  for(let k=0;k<K;k++)for(let i=0;i<N;i++){mouthAt(k,i);mouthAt(k+1,i+1);mouthAt(k+1,i);if(k){mouthAt(k,i);mouthAt(k,i+1);mouthAt(k+1,i+1);}}
  // Where someone slid in: a fan of loose earth on the near side, scored by two heel gouges
  // that run over the lip.
  const slideA=Math.atan2(view.y,view.x)+(rand(1620)-.5)*1.1,sa=Math.cos(slideA),sb=Math.sin(slideA),lip=R(slideA);
  const smear=new THREE.Color(0x3a2c1e),gouge=new THREE.Color(0x0f0b08);
  const quad=(pts,col,y)=>{for(const n of [0,1,2,0,2,3])push(pts[n][0],y,pts[n][1],col);};
  const at=(r,o)=>[sa*r-sb*o,sb*r+sa*o];
  for(let j=0;j<6;j++){const r0=lip-.01+j*.022,r1=r0+.022,w0=.05-j*.006,w1=.05-(j+1)*.006;
   quad([at(r0,-w0),at(r1,-w1),at(r1,w1),at(r0,w0)],c.copy(smear).lerp(black,.15*noise(j,seed)+.3*(1-j/6)),.0042);}
  for(const off of [-.018,.016]){for(let j=0;j<5;j++){const r0=lip-.015+j*.024,r1=r0+.024,w=.0045*(1-j/6);
   quad([at(r0,off-w),at(r1,off-w*.8),at(r1,off+w*.8),at(r0,off+w)],gouge,.0046);}}
  const mouthGeo=new THREE.BufferGeometry();
  mouthGeo.setAttribute('position',new THREE.Float32BufferAttribute(mp,3));
  mouthGeo.setAttribute('normal',new THREE.Float32BufferAttribute(mp.map((_,i)=>i%3===1?1:0),3));
  mouthGeo.setAttribute('color',new THREE.Float32BufferAttribute(mc,3));
  const mouth=add(mouthGeo,mat({color:0xffffff,vertexColors:true,roughness:1}));mouth.castShadow=false;mouth.name='barepit-mouth';
  const parts=[];
  // Spoil heap on the far side: a low lumpy mound of dug earth with stones turned up in it.
  const heapA=Math.atan2(-view.y,-view.x)+(rand(1630)-.5)*.9,hr=Math.min(R(heapA)+.07,.34),hx=Math.cos(heapA)*hr,hz=Math.sin(heapA)*hr;
  const heap=new THREE.SphereGeometry(.075,20,10,0,Math.PI*2,0,Math.PI/2);
  {const p=heap.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=noise(x*30+3,z*30+5);
   const s=1+.18*(n-.5)+.08*Math.sin(Math.atan2(z,x)*5+seed);p.setXYZ(i,x*s,y*(.75+.5*n)*s,z*s);}heap.computeVertexNormals();}
  parts.push(bake(heap,(col,x,y,z)=>{col.set(0x4a3826).lerp(new THREE.Color(0x2a2016),.6*noise(x*70,z*70)).lerp(new THREE.Color(0x6a5a44),Math.max(0,y-.05)*6);},
   {x:hx,y:-.008,z:hz,sx:.85,sy:.7,sz:1.45,ry:-heapA}));
  for(let i=0;i<5;i++){const a=heapA+(rand(i+1640)-.5)*1.2,r=hr+(rand(i+1650)-.5)*.08,s=.012+rand(i+1660)*.012;
   parts.push(bake(new THREE.DodecahedronGeometry(s,0),(col,x,y,z)=>col.set(0x5d5f5a).lerp(black,.35*noise(x*80,z*80)),
    {x:Math.cos(a)*r,y:.02+rand(i+1670)*.02,z:Math.sin(a)*r,rx:rand(i+1680)*3,ry:rand(i+1690)*3,sy:.7}));}
  // Flagstones heaved up and tipped toward the drop, dark on the edge that faces it.
  const slab=(col,x,y,z)=>{const r=Math.hypot(x,z);
   col.set(0x6f716c).lerp(new THREE.Color(0x4f514c),.6*noise(x*60+y*20,z*60)).lerp(black,Math.min(1,Math.max(0,(.32-r)/.06))*.75);};
  const near=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
  for(let i=0;i<9;i++){
   const a=(i+rand(i+1700)*.6)/9*Math.PI*2;if(near(a,heapA)<.5||near(a,slideA)<.4)continue;
   const r=Math.min(R(a)+.035+rand(i+1710)*.02,.38),w=.065+rand(i+1720)*.05,d=.045+rand(i+1730)*.03;
   parts.push(bake(new THREE.BoxGeometry(w,.02,d),slab,{x:Math.cos(a)*r,y:.008,z:Math.sin(a)*r,ry:-a+Math.PI/2+(rand(i+1740)-.5)*.6,rx:-.2-rand(i+1750)*.3,rz:(rand(i+1760)-.5)*.25}));
  }
  // Clods crumbled over the lip, the ones that fell in darkened by the shadow of the wall.
  for(let i=0;i<16;i++){const a=rand(i+1770)*Math.PI*2,inside=i%3===0,r=inside?R(a)-.02-rand(i+1780)*.03:Math.min(R(a)+.01+rand(i+1790)*.07,.42),s=.009+rand(i+1800)*.014;
   parts.push(bake(new THREE.DodecahedronGeometry(s,0),(col,x,y,z)=>col.set(i%4?0x45362a:0x5d5f5a).lerp(black,(inside?.6:0)+.25*noise(x*80,z*80)),
    {x:Math.cos(a)*r,y:inside?.002:s*.45,z:Math.sin(a)*r,rx:rand(i+1810)*3,ry:rand(i+1820)*3,sy:.6}));}
  // Roots hanging over the far lip.
  for(let i=0;i<3;i++){
   const a=heapA+(i-1)*.7+(rand(i+1830)-.5)*.3,r=R(a),tw=(rand(i+1840)-.5)*.4;
   const pts=[[r+.03,.006],[r-.005,.009],[r-.035,.006],[r-.065,.004]].map(([rr,y],j)=>new THREE.Vector3(Math.cos(a+tw*j*.25)*rr,y,Math.sin(a+tw*j*.25)*rr));
   parts.push(bake(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),8,.004-i*.0006,4,false),(col,x,y,z)=>{const rr=Math.hypot(x,z);col.set(0x3a2a1a).lerp(black,Math.min(.85,Math.max(0,(r-rr)/.07)));}));
  }
  // The last one in, lying on the floor: dimmed bone (the wall's shadow falls on it).
  const bone=(col,x,y,z)=>col.set(0xa89e88).lerp(new THREE.Color(0x4a4236),.5*noise(x*70,z*70)).lerp(black,.55);
  const fa=rand(1850)*Math.PI*2,fx=floorC.x+Math.cos(fa)*.03,fz=floorC.y+Math.sin(fa)*.03;
  parts.push(bake(new THREE.SphereGeometry(.024,10,7),bone,{x:fx,y:.008,z:fz,sx:.9,sy:.7,sz:1.1,ry:fa}));
  parts.push(bake(new THREE.SphereGeometry(.0055,6,4),col=>col.copy(black),{x:fx+Math.cos(fa+.4)*.02,y:.012,z:fz+Math.sin(fa+.4)*.02}));
  parts.push(bake(new THREE.SphereGeometry(.0055,6,4),col=>col.copy(black),{x:fx+Math.cos(fa-.4)*.02,y:.012,z:fz+Math.sin(fa-.4)*.02}));
  for(let i=0;i<4;i++){const a=fa+Math.PI+(rand(i+1860)-.5)*1.6,r=.035+rand(i+1870)*.04,len=.05+rand(i+1880)*.03;
   const shaft=new THREE.CylinderGeometry(.0035,.0035,len,5);
   parts.push(bake(shaft,bone,{x:fx+Math.cos(a)*r,y:.005,z:fz+Math.sin(a)*r,rz:Math.PI/2,ry:rand(i+1890)*Math.PI}));}
  for(let i=0;i<4;i++)parts.push(bake(new THREE.TorusGeometry(.022-i*.002,.0022,4,10,Math.PI*.8),bone,
   {x:fx+Math.cos(fa+Math.PI)*.04+Math.cos(fa+Math.PI/2)*(i-1.5)*.011,y:.004,z:fz+Math.sin(fa+Math.PI)*.04+Math.sin(fa+Math.PI/2)*(i-1.5)*.011,rx:-Math.PI/2+.3,rz:-fa}));
  add(mergeGeometries(parts),mat({color:0xffffff,vertexColors:true,roughness:.93})).name='barepit-rim';
  parts.forEach(p=>p.dispose());
 }else if(kind==='hatch'){
  // Trap door (and a hole or a squeaky board when the bridge sends no name): a heavy door of warped, rotting planks in an iron-bound
  // frame, left ajar. Its free edge has lifted off the frame on a black gap, and bony fingers
  // with long claws have curled out from under it over the beam, leaving a smear of blood.
  // Barbed strap hinges, studs and a rusted pull ring hold it together. Three merged,
  // vertex-coloured meshes: the flat void (no shadow), wood and bone, and iron.
  const noise=(x,z)=>{const s=Math.sin(x*127.1+z*311.7+seed*7.3)*43758.5453;return s-Math.floor(s);};
  const black=new THREE.Color(0x030303),c=new THREE.Color();
  const O=.25,TOP=.04,T=.025,LIFT=.1+rand(1200)*.04;
  // The door is built hinge-at-origin, spanning x 0..DOOR, then swung up about the hinge line.
  const DOOR=.49,hinge=new THREE.Matrix4().makeRotationZ(LIFT).premultiply(new THREE.Matrix4().makeTranslation(-O,TOP,0));
  const swing=(geo)=>{geo.applyMatrix4(hinge);return geo;};
  const voidGeo=bake(new THREE.PlaneGeometry(O*2,O*2),(col,x,y,z)=>col.copy(black).lerp(new THREE.Color(0x1a140e),.5*Math.max(Math.abs(x),Math.abs(z))/O*noise(x*30,z*30)),{y:.003,rx:-Math.PI/2});
  const gap=add(voidGeo,mat({color:0xffffff,vertexColors:true,roughness:1}));gap.castShadow=false;gap.name='hatch-void';
  const woody=[],irons=[];
  // Frame: four old beams round the opening, black with damp toward the drop, blood smeared
  // where the fingers grip the far beam.
  const beam=(col,x,y,z)=>{const n=noise(x*70+y*30,z*9);
   col.set(0x3d2b1b).lerp(new THREE.Color(0x58402a),.55*n).lerp(black,Math.min(1,Math.max(0,(O+.02-Math.max(Math.abs(x),Math.abs(z)))/.03))*.7);
   if(x>.25&&y>TOP-.004&&Math.abs(z+.01)<.1+.03*noise(x*40,z*40))col.lerp(new THREE.Color(0x3a0705),.75);};
  for(const s of [-1,1]){
   woody.push(bake(new THREE.BoxGeometry(.06,TOP,.62,1,1,6),beam,{x:s*(O+.03),y:TOP/2}));
   woody.push(bake(new THREE.BoxGeometry(.5,TOP*.95,.06),beam,{z:s*(O+.03),y:TOP*.475}));
  }
  // Planks: run toward the hinge, each warped and a little uneven, grain streaked along its
  // length, seams dark, rotting black at the free end.
  const W=DOOR/5;
  for(let i=0;i<5;i++){
   const len=.47+rand(i+1210)*.02,dz=(rand(i+1220)-.5)*.012,bow=(rand(i+1230)-.5)*.008;
   const plank=new THREE.BoxGeometry(len,T,W-.005,6,1,2);
   const p=plank.attributes.position;
   for(let k=0;k<p.count;k++){const u=p.getX(k)/len;p.setY(k,p.getY(k)+bow*(1-4*u*u));}
   plank.computeVertexNormals();
   const zc=-DOOR/2+W*(i+.5);
   woody.push(swing(bake(plank,(col,x,y,z)=>{const g=noise(Math.round(x*40)*.1,z*140+i);
    col.set(0x4a3420).lerp(new THREE.Color(0x6d5034),.6*g).lerp(new THREE.Color(0x2a1d12),.6*Math.min(1,Math.abs(z-zc)/(W/2))**4);
    col.lerp(black,Math.min(1,Math.max(0,(x-.36)/.13))*.75);},{x:len/2+.005,y:-T/2,z:zc+dz,rz:(rand(i+1240)-.5)*.02})));
  }
  // Bones: four gaunt fingers out of the dark, over the far beam, claws dug into its edge.
  const bone=(col,x,y)=>col.set(0xbab09a).lerp(new THREE.Color(0x5e5546),.45*noise(x*90,y*90)).lerp(black,Math.min(1,Math.max(0,(.255-x)/.035)));
  const seg=(p,q,r0,r1)=>{const d=new THREE.Vector3().subVectors(q,p),geo=new THREE.CylinderGeometry(r1,r0,d.length(),6);
   geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize()));
   geo.translate((p.x+q.x)/2,(p.y+q.y)/2,(p.z+q.z)/2);return bake(geo,bone);};
  for(let i=0;i<4;i++){
   const z=-.085+i*.047+(rand(i+1250)-.5)*.01,sp=(i-1.5)*.012,curl=rand(i+1260)*.006;
   const pts=[[.222,.008,z*.8],[.255,.051,z],[.289,.053+curl,z+sp],[.313,.036,z+sp*1.6],[.323,.012,z+sp*2]].map(v=>new THREE.Vector3(...v));
   const r=[.0075,.0068,.0058,.0048,.0012];
   for(let j=0;j<4;j++)woody.push(seg(pts[j],pts[j+1],r[j],r[j+1]));
   for(let j=1;j<4;j++){const k=new THREE.SphereGeometry(r[j]*1.3,7,5);k.translate(pts[j].x,pts[j].y,pts[j].z);woody.push(bake(k,bone));}
  }
  const boards=add(mergeGeometries(woody),mat({color:0xffffff,vertexColors:true,roughness:.92}));boards.name='hatch-wood';
  // Iron: barbed strap hinges across the planks with studs, the hinge knuckles and their
  // leaves on the frame, a pull ring on a staple near the free edge, and corner brackets.
  const ironPaint=(rust)=>(col,x,y,z)=>{const h=noise(x*50+y*80,z*50);col.set(0x3c3f40).lerp(new THREE.Color(0x6b4128),Math.min(1,rust*(.3+h*1.4))).lerp(black,.3*noise(x*120,z*120));};
  for(const zs of [-.16,.16]){
   const h=.016,L=.3+rand(1270+zs)*.04,s=new THREE.Shape();
   s.moveTo(-.01,-h);s.lineTo(L,-h);s.lineTo(L-.012,-h*2.3);s.lineTo(L+.032,-h*.6);s.lineTo(L+.07,0);s.lineTo(L+.032,h*.6);s.lineTo(L-.012,h*2.3);s.lineTo(L,h);s.lineTo(-.01,h);s.closePath();
   irons.push(swing(bake(new THREE.ExtrudeGeometry(s,{depth:.005,bevelEnabled:false}),ironPaint(.5),{z:zs,rx:-Math.PI/2})));
   for(let i=0;i<4;i++){const st=new THREE.CylinderGeometry(.0055,.0065,.004,8);irons.push(swing(bake(st,ironPaint(.7),{x:W*(i+.5),y:.006,z:zs})));}
   irons.push(bake(new THREE.CylinderGeometry(.012,.012,.07,10),ironPaint(.4),{x:-O,y:TOP,z:zs,rx:Math.PI/2}));
   irons.push(bake(new THREE.BoxGeometry(.06,.004,.05),ironPaint(.55),{x:-O-.03,y:TOP+.002,z:zs}));
  }
  const ring=new THREE.TorusGeometry(.03,.0055,6,18);
  irons.push(swing(bake(ring,ironPaint(.8),{x:.41,y:.008,z:.02,rx:-Math.PI/2+.25})));
  irons.push(swing(bake(new THREE.TorusGeometry(.012,.004,5,10,Math.PI),ironPaint(.6),{x:.385,y:0,z:.02,ry:Math.PI/2})));
  for(const sx of [-1,1])for(const sz of [-1,1]){
   const plate=new THREE.Shape();plate.moveTo(0,0);plate.lineTo(.07,0);plate.lineTo(.07,.022);plate.lineTo(.022,.022);plate.lineTo(.022,.07);plate.lineTo(0,.07);plate.closePath();
   const geo=new THREE.ExtrudeGeometry(plate,{depth:.004,bevelEnabled:false});geo.rotateX(Math.PI/2);
   // Turn the L from the +x/+z quadrant to point in from this corner.
   const ry=sx>0?(sz>0?Math.PI:-Math.PI/2):(sz>0?Math.PI/2:0);
   irons.push(bake(geo,ironPaint(.6),{x:sx*(O+.06),y:TOP+.004,z:sz*(O+.06),ry}));
  }
  const iron=add(mergeGeometries(irons),mat({color:0xffffff,vertexColors:true,metalness:.6,roughness:.55}));iron.name='hatch-iron';
  for(const p of [...woody,...irons])p.dispose();
 }else if(kind==='hole'){
  // Hole: a shaft dug clean through the floor. The flat mouth is painted in false perspective:
  // from the play camera (up at +x+z) the far inner wall shows as bands of earth and rock
  // sinking into black, while the near lip drops straight away. Cracks run out across the
  // floor, flagstones have snapped off at the edge and one has slid in, wedged nose-down in
  // the shaft. An iron spike is driven in at the lip with a rope knotted to it that runs over
  // the edge into the dark, and two dragged streaks of blood end at the drop. Two merged,
  // vertex-coloured meshes: the flat mouth, cracks and streaks (no shadow), and everything standing.
  const noise=(x,z)=>{const s=Math.sin(x*127.1+z*311.7+seed*7.3)*43758.5453;return s-Math.floor(s);};
  const black=new THREE.Color(0x030303),c=new THREE.Color();
  const N=48,K=12,reach=[];
  for(let i=0;i<N;i++)reach.push(.24+rand(i+1300)*.035+(i%5===0?.025*rand(i+1310):0));
  const R=(a)=>{const f=((a/(Math.PI*2))%1+1)%1*N,i=Math.floor(f),t=f-i;return reach[i%N]*(1-t)+reach[(i+1)%N]*t;};
  // The bottom of the visible wall: the mouth shrunk and slid toward the camera.
  const view=new THREE.Vector2(.566,.824),shift=.075,shrink=.7;
  const wallAt=(x,z)=>{
   const r=Math.hypot(x,z),a=Math.atan2(z,x),L=R(a);if(r<1e-6)return 1;
   const ux=x/r,uz=z/r,cx=view.x*shift,cz=view.y*shift,uc=ux*cx+uz*cz,rho=L*shrink;
   const inner=uc+Math.sqrt(Math.max(0,uc*uc-(cx*cx+cz*cz)+rho*rho));
   return Math.min(1,Math.max(0,(L-r)/Math.max(.004,L-inner)));};
  const strata=[0x4a3a28,0x2f251a,0x5a5550,0x3a2d1f,0x46413b,0x241b12].map(h=>new THREE.Color(h));
  const mp=[],mc=[];
  const push=(x,y,z,col)=>{mp.push(x,y,z);mc.push(col.r,col.g,col.b);};
  const mouthAt=(k,i)=>{const a=i/N*Math.PI*2,r=R(a)*k/K,x=Math.cos(a)*r,z=Math.sin(a)*r,t=wallAt(x,z);
   // Bands of earth and rock down the wall, a little wavy, swallowed by black with depth.
   const band=Math.min(strata.length-1,Math.floor((t+.04*Math.sin(a*5+seed))*strata.length));
   c.copy(strata[Math.max(0,band)]).lerp(black,.25*noise(x*40,z*40)).lerp(black,Math.min(1,t**1.3));
   push(x,.004,z,c);};
  for(let k=0;k<K;k++)for(let i=0;i<N;i++){mouthAt(k,i);mouthAt(k+1,i+1);mouthAt(k+1,i);if(k){mouthAt(k,i);mouthAt(k,i+1);mouthAt(k+1,i+1);}}
  // A flat strip between floor points: a crack (tapered) or a streak.
  const strip=(pts,w,taper,col,y=.0045)=>{
   const L=[],Rr=[];
   for(let i=0;i<pts.length;i++){
    const p=pts[i],q=pts[Math.min(pts.length-1,i+1)],o=pts[Math.max(0,i-1)];
    let dx=q[0]-o[0],dz=q[1]-o[1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
    const ww=w*(taper?Math.max(.1,1-i/(pts.length-1)):1);
    L.push([p[0]-dz*ww,p[1]+dx*ww]);Rr.push([p[0]+dz*ww,p[1]-dx*ww]);
   }
   for(let i=0;i<pts.length-1;i++)for(const [x,z] of [L[i],L[i+1],Rr[i],Rr[i],L[i+1],Rr[i+1]])push(x,y,z,col);};
  // Cracks running out from the lip, jagged, a few forking once.
  const crackCol=new THREE.Color(0x0c0b0a);
  for(let s=0;s<7;s++){
   const a0=(s+rand(s+1320)*.6)/7*Math.PI*2,len=.08+rand(s+1330)*.1;
   let a=a0,r=R(a0)-.005;const pts=[[Math.cos(a)*r,Math.sin(a)*r]];
   for(let j=1;j<=6;j++){r=Math.min(.46,r+len/6);a+=(rand(s*9+j+1340)-.5)*.22;pts.push([Math.cos(a)*r,Math.sin(a)*r]);}
   strip(pts,.0042,true,crackCol);
   if(rand(s+1350)>.5){const [fx,fz]=pts[2],fa=Math.atan2(fz,fx)+(rand(s+1360)>.5?.5:-.5),fr=Math.hypot(fx,fz);
    strip([[fx,fz],[Math.cos(fa)*(fr+.03),Math.sin(fa)*(fr+.03)],[Math.cos(fa+.1)*Math.min(.46,fr+.06),Math.sin(fa+.1)*Math.min(.46,fr+.06)]],.003,true,crackCol);}
  }
  // Two dragged streaks of old blood coming in from the tile edge and ending at the drop.
  const dragA=Math.PI*1.15+(rand(1370)-.5)*.5,blood=new THREE.Color(0x3d0806),dried=new THREE.Color(0x24100c);
  for(const off of [-.022,.022]){
   const ca=Math.cos(dragA),sa=Math.sin(dragA),pts=[];
   for(let j=0;j<=8;j++){const r=.45-j/8*(.45-R(dragA)+.01),w=(rand(j+1380+off*100)-.5)*.008;pts.push([ca*r-sa*(off+w),sa*r+ca*(off+w)]);}
   for(let j=0;j<8;j++)strip([pts[j],pts[j+1]],.006*(.6+.4*j/8),false,c.copy(dried).lerp(blood,j/8),.0042);
  }
  const mouthGeo=new THREE.BufferGeometry();
  mouthGeo.setAttribute('position',new THREE.Float32BufferAttribute(mp,3));
  mouthGeo.setAttribute('normal',new THREE.Float32BufferAttribute(mp.map((_,i)=>i%3===1?1:0),3));
  mouthGeo.setAttribute('color',new THREE.Float32BufferAttribute(mc,3));
  const mouth=add(mouthGeo,mat({color:0xffffff,vertexColors:true,roughness:1}));mouth.castShadow=false;mouth.name='hole-mouth';
  const parts=[];
  // Snapped flagstones at the edge, tipped toward the drop and dark on the side facing it.
  const slab=(col,x,y,z)=>{const r=Math.hypot(x,z);
   col.set(0x6f716c).lerp(new THREE.Color(0x4c4e4a),.6*noise(x*60+y*20,z*60)).lerp(black,Math.min(1,Math.max(0,(.3-r)/.06))*.8);};
  for(let i=0;i<8;i++){
   const a=(i+rand(i+1390)*.6)/8*Math.PI*2;if(Math.abs(Math.atan2(Math.sin(a-dragA),Math.cos(a-dragA)))<.35)continue;
   const r=Math.min(R(a)+.03+rand(i+1400)*.02,.37),w=.06+rand(i+1410)*.05,d=.045+rand(i+1420)*.03;
   parts.push(bake(new THREE.BoxGeometry(w,.02,d),slab,{x:Math.cos(a)*r,y:.008,z:Math.sin(a)*r,ry:-a+Math.PI/2+(rand(i+1430)-.5)*.6,rx:-.18-rand(i+1440)*.3,rz:(rand(i+1450)-.5)*.25}));
  }
  // The flagstone that slid in: wedged nose-down against the far wall, its top edge just
  // proud of the floor (the rest is hidden below the slab).
  const wedgeA=Math.atan2(-view.y,-view.x)+(rand(1460)-.5)*.8,wr=R(wedgeA)-.06;
  parts.push(bake(new THREE.BoxGeometry(.13,.022,.1),slab,{x:Math.cos(wedgeA)*wr,y:.004,z:Math.sin(wedgeA)*wr,ry:-wedgeA+Math.PI/2,rx:.62,rz:(rand(1470)-.5)*.3}));
  // Grit and chips of stone round the edge.
  for(let i=0;i<14;i++){const a=rand(i+1480)*Math.PI*2,r=Math.min(R(a)+.015+rand(i+1490)*.1,.43),s=.008+rand(i+1500)*.014;
   parts.push(bake(new THREE.DodecahedronGeometry(s,0),(col,x,y,z)=>col.set(i%3?0x5d5f5a:0x3f3223).lerp(black,.3*noise(x*80,z*80)),{x:Math.cos(a)*r,y:s*.4,z:Math.sin(a)*r,rx:rand(i+1510)*3,ry:rand(i+1520)*3,sy:.6}));}
  // The spike, hammered in at the lip on the near side, its head burred flat.
  const pinA=wedgeA+Math.PI*.62,pr=R(pinA)+.05,px=Math.cos(pinA)*pr,pz=Math.sin(pinA)*pr;
  const iron=(col,x,y,z)=>col.set(0x3c3f40).lerp(new THREE.Color(0x6b4128),.6*noise(x*90+y*60,z*90));
  parts.push(bake(new THREE.CylinderGeometry(.006,.009,.05,6),iron,{x:px,y:.022,z:pz,rx:(rand(1530)-.5)*.3,rz:.2}));
  parts.push(bake(new THREE.CylinderGeometry(.014,.012,.008,8),iron,{x:px-.005,y:.048,z:pz}));
  parts.push(bake(new THREE.TorusGeometry(.012,.003,5,12),iron,{x:px-.005,y:.04,z:pz,rx:Math.PI/2}));
  // The rope: knotted round the spike, slack across the floor, then over the lip and down.
  const ux=-Math.cos(pinA),uz=-Math.sin(pinA),lipR=R(pinA);
  const rope=(col,x,y,z)=>col.set(0x8a7450).lerp(new THREE.Color(0x4e3d26),.5*noise(x*140+y*90,z*140)).lerp(black,Math.min(1,Math.max(0,-y/.04)));
  const ropePts=[[0,.032],[.03,.008],[.06,.007],[pr-lipR,.008],[pr-lipR+.012,.002],[pr-lipR+.02,-.04]].map(([d,y],j)=>
   new THREE.Vector3(px+ux*d+(j===2?-uz*.015:0),y,pz+uz*d+(j===2?ux*.015:0)));
  parts.push(bake(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ropePts),20,.0045,5,false),rope));
  parts.push(bake(new THREE.TorusGeometry(.011,.005,5,10),rope,{x:px,y:.032,z:pz,rx:Math.PI/2+.3}));
  add(mergeGeometries(parts),mat({color:0xffffff,vertexColors:true,roughness:.93})).name='hole-rim';
  parts.forEach(p=>p.dispose());
 }else if(kind==='arrow'||kind==='dart'){
  // Arrow and dart traps: a snarling stone mask squats at the back of the tile, horned and
  // spiked, slit eyes glowing, with arrowheads (or venom-tipped darts) bristling between its
  // fangs. In front, a sunken pressure plate with a dried bloodstain; spent shafts stand in the
  // floor where they struck, leaning back toward the mouth, and a snapped one lies by the plate.
  // Three draws: stone, shafts and the eyes' glow.
  const dart=kind==='dart',stoneParts=[],shaftParts=[],glowParts=[];
  const noise=(x,y,z)=>{const s=Math.sin(x*157.3+y*311.9+z*97.1+seed*3.7)*43758.5453;return s-Math.floor(s);};
  const up=new THREE.Vector3(0,1,0),q=new THREE.Quaternion(),m=new THREE.Matrix4(),one=new THREE.Vector3(1,1,1);
  // Transforms a part, optionally chips it (offsets depend only on position, so shared corners
  // stay shut), then paints it and files it in a bin.
  const put=(bin,geo,matrix,paint,chip=0)=>{
   const n=geo.index?geo.toNonIndexed():geo;if(n!==geo)geo.dispose();
   n.applyMatrix4(matrix);n.deleteAttribute('uv');
   const pos=n.attributes.position;
   if(chip){for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    pos.setXYZ(i,x+(noise(x,y,z)-.5)*chip,y+(noise(z,x,y)-.5)*chip,z+(noise(y,z,x)-.5)*chip);}n.computeVertexNormals();}
   const col=new Float32Array(pos.count*3),c=new THREE.Color();
   for(let i=0;i<pos.count;i++){paint(c,pos.getX(i),pos.getY(i),pos.getZ(i));col.set([c.r,c.g,c.b],i*3);}
   n.setAttribute('color',new THREE.BufferAttribute(col,3));bin.push(n);
  };
  const at=(x,y,z,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1)=>m.clone().compose(new THREE.Vector3(x,y,z),q.clone().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(sx,sy,sz));
  const rock=new THREE.Color(0x5e5d57),moss=new THREE.Color(0x2c3020),soot=new THREE.Color(0x1b1a18),black=new THREE.Color(0x070606);
  const bone=new THREE.Color(0xb3a684),blood=new THREE.Color(0x3a0c08);
  const stone=(lift=0)=>(c,x,y,z)=>{const h=noise(x,y,z);c.copy(rock).offsetHSL(0,0,lift+(h-.5)*.08);
   if(y<.05)c.lerp(moss,(1-y/.05)*.55*noise(z,x,0));if(h>.86)c.lerp(soot,.6);};
  const flat=(col)=>(c)=>c.copy(col);
  // The plate: a gap of shadow, then a slab set a hair proud of the floor, chipped at the edges,
  // stained where something bled out on it.
  const px=.02,pz=.08;
  put(stoneParts,new THREE.BoxGeometry(.34,.004,.34),at(px,.002,pz),flat(black));
  put(stoneParts,new THREE.BoxGeometry(.3,.014,.3,4,1,4),at(px,.007,pz,0,.06),(c,x,y,z)=>{stone(.03)(c,x,y,z);
   const d=Math.hypot(x-px-.05,z-pz-.03)+(noise(x,0,z)-.5)*.05;if(y>.01&&d<.09)c.lerp(blood,Math.min(1,(.09-d)*22));},.008);
  // The mask block, chipped hard so it reads as old hewn stone.
  const zf=-.3;
  put(stoneParts,new THREE.BoxGeometry(.44,.27,.13,6,4,2),at(0,.135,zf-.065),stone(),.02);
  // Crown of jagged spikes and two swept-back horns.
  for(let i=0;i<7;i++){const x=-.18+i*.06,h=.05+noise(i,1,2)*.07+(i===3?.04:0);
   put(stoneParts,new THREE.ConeGeometry(.022,h,4),at(x,.27+h/2,zf-.06+(noise(i,3,1)-.5)*.04,(noise(i,0,5)-.5)*.4,i*.7,(x>0?-1:1)*.2*(1+noise(i,2,2))),stone(-.02));}
  for(const s of [-1,1]){let p=new THREE.Vector3(s*.2,.24,zf-.05),r=.035;
   for(let k=0;k<4;k++){const len=.06-k*.006,dir=new THREE.Vector3(s*(.7-k*.15),.6+k*.25,-.35-k*.1).normalize();
    const mid=p.clone().addScaledVector(dir,len/2);
    const seg=new THREE.CylinderGeometry(r*.72,r,len,6);
    put(stoneParts,seg,m.clone().compose(mid,q.clone().setFromUnitVectors(up,dir),one),(c,x,y,z)=>c.copy(bone).lerp(soot,.35+k*.12+(noise(x,y,z)-.5)*.2));
    p.addScaledVector(dir,len);r*=.72;}
   put(stoneParts,new THREE.ConeGeometry(r,.03,6),m.clone().compose(p.clone().add(new THREE.Vector3(0,.012,-.004)),q.clone().setFromUnitVectors(up,new THREE.Vector3(s*.2,1,-.6).normalize()),one),flat(soot));}
  // Scowling brow meeting low over the nose, sunk eye pits with slit pupils, a hooked nose.
  for(const s of [-1,1]){
   put(stoneParts,new THREE.BoxGeometry(.16,.035,.05),at(s*.085,.205,zf+.012,.1,0,s*.32),stone(.04),.006);
   put(stoneParts,new THREE.SphereGeometry(.036,10,6),at(s*.09,.168,zf+.006,0,0,s*.35,1,.62,.35),flat(black));
   put(glowParts,new THREE.BoxGeometry(.008,.034,.01),at(s*.09,.168,zf+.014,0,0,s*.2),flat(new THREE.Color(0xffffff)));
  }
  put(stoneParts,new THREE.ConeGeometry(.026,.07,4),at(0,.14,zf+.018,-.5,Math.PI/4,0,1,1,.7),stone(.02));
  // The mouth: a black maw with fangs above and below; the barbed heads wait between them.
  put(stoneParts,new THREE.BoxGeometry(.27,.075,.02),at(0,.075,zf+.004),flat(black));
  const fangs=dart?8:6;
  for(let i=0;i<fangs;i++){const x=-.12+(i+.5)*(.24/fangs),h=.03+noise(i,9,1)*.02;
   put(stoneParts,new THREE.ConeGeometry(.011,h,4),at(x,.112-h/2,zf+.012,0,0,Math.PI),(c,x0,y)=>c.copy(bone).lerp(soot,Math.max(0,(y-.09)*15)));
   put(stoneParts,new THREE.ConeGeometry(.01,h*.8,4),at(x+.012,.038+h*.4,zf+.012),(c,x0,y)=>c.copy(bone).lerp(soot,Math.max(0,(.05-y)*15)));}
  // A lower lip and a split chin give the jaw some weight.
  put(stoneParts,new THREE.BoxGeometry(.3,.03,.04),at(0,.024,zf+.014,.15),stone(.03),.006);
  // Shafts: built tip at the origin, running back along +y.
  const steel=new THREE.Color(0x7b8589),rust=new THREE.Color(0x5a3420),venom=new THREE.Color(0x5bd23a);
  const wood=new THREE.Color(dart?0x3a3d40:0x4a3424),fletch=new THREE.Color(dart?0x7a1610:0x141416),fletch2=new THREE.Color(dart?0xb3a684:0x262022);
  const len=dart?.15:.25;
  const shaft=(tip,back,full=true,size=len)=>{const mat4=m.clone().compose(tip,q.clone().setFromUnitVectors(up,back.clone().normalize()),one);
   const part=(geo,local,paint)=>put(shaftParts,geo,mat4.clone().multiply(local),paint);
   const head=new THREE.ConeGeometry(dart?.008:.013,dart?.03:.045,4);head.rotateX(Math.PI);head.translate(0,dart?.015:.0225,0);
   part(head,new THREE.Matrix4(),(c,x,y,z)=>{c.copy(steel).lerp(rust,noise(x,y,z)*.6);if(dart&&y-tip.y<.02&&Math.hypot(x-tip.x,z-tip.z)<.03)c.copy(venom);});
   if(dart)part(new THREE.SphereGeometry(.006,6,4),at(0,.002,0),flat(venom));
   const L=full?size:size*.55,hl=dart?.03:.045;
   part(new THREE.CylinderGeometry(.0042,.0042,L-hl,5),at(0,(L+hl)/2,0),(c,x,y,z)=>c.copy(wood).offsetHSL(0,0,(noise(x,y,z)-.5)*.05));
   if(!full){part(new THREE.ConeGeometry(.006,.02,3),at(0,L+.008,0,.4),flat(wood));return;}
   for(let k=0;k<3;k++)part(new THREE.BoxGeometry(.0016,dart?.035:.055,.02),at(0,L-(dart?.025:.035),0,0,k*Math.PI*2/3).multiply(at(0,0,.011,.12)),(c,x,y)=>c.copy(k?fletch:fletch2));
  };
  // Heads waiting in the maw, pointing out (short: the rest is hidden in the block).
  const out=new THREE.Vector3(0,0,-1);
  for(let i=0;i<(dart?5:3);i++){const x=(i-(dart?2:1))*(dart?.045:.065),y=.068+(i%2)*.012;
   shaft(new THREE.Vector3(x,y,zf+(dart?.03:.045)),out.clone().add(new THREE.Vector3(x*.5,0,0)),true,.13);}
  // Spent shafts stuck in the floor, leaning back toward the mouth they flew from.
  const mouth=new THREE.Vector3(0,.08,zf);
  const spots=dart?[[-.3,.12],[.28,.02],[-.12,.36],[.18,.32],[.36,.3],[-.32,.36]]:[[-.28,.1],[.3,.06],[-.1,.36],[.22,.34]];
  for(const [x,z] of spots){const tip=new THREE.Vector3(x+(noise(x,z,1)-.5)*.04,-.018,z+(noise(z,x,1)-.5)*.04);
   const h=Math.hypot(tip.x-mouth.x,tip.z-mouth.z),back=new THREE.Vector3(mouth.x-tip.x,h*.85,mouth.z-tip.z);
   shaft(tip,back);}
  // A snapped shaft lying by the plate.
  shaft(new THREE.Vector3(.27,.006,.3),new THREE.Vector3(-.4,.02,.9),false);
  const stoneMesh=add(mergeGeometries(stoneParts),mat({color:0xffffff,vertexColors:true,roughness:.93}));stoneMesh.name=`${kind}-stone`;
  const shaftMesh=add(mergeGeometries(shaftParts),mat({color:0xffffff,vertexColors:true,metalness:.35,roughness:.6}));shaftMesh.name=`${kind}-shafts`;
  const eyes=new THREE.MeshBasicMaterial({color:new THREE.Color(dart?0x8cff5a:0xff3a1e).multiplyScalar(1.3),vertexColors:true});materials.push(eyes);
  const glow=add(mergeGeometries(glowParts),eyes);glow.name=`${kind}-eyes`;glow.castShadow=false;
  for(const p of [...stoneParts,...shaftParts,...glowParts])p.dispose();
 }else if(kind==='squeaky'){
  // Squeaky board: a patch of rotten floorboards nailed down over a black void. The middle board
  // has sprung its nails at one end and warps up off the floor like a lip, split along its grain
  // and bristling with splinters, baring rows of needle teeth in the dark beneath it. The crack
  // beside it gapes wider than the rest, and two sickly eyes look up through it.
  // Three draws: the wood, the bone and iron, and the eyes' glow.
  const woodParts=[],boneParts=[],glowParts=[];
  const noise=(x,y,z)=>{const s=Math.sin(x*157.3+y*311.9+z*97.1+seed*3.7)*43758.5453;return s-Math.floor(s);};
  const up=new THREE.Vector3(0,1,0),q=new THREE.Quaternion(),m=new THREE.Matrix4(),one=new THREE.Vector3(1,1,1);
  // Transforms a part, optionally chips it (by position only, so shared corners stay shut) and
  // bends it, then paints it and files it in a bin.
  const put=(bin,geo,matrix,paint,{chip=0,bend=null}={})=>{
   const n=geo.index?geo.toNonIndexed():geo;if(n!==geo)geo.dispose();
   n.applyMatrix4(matrix);n.deleteAttribute('uv');
   const pos=n.attributes.position;
   for(let i=0;i<pos.count;i++){let x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    if(chip){const dx=(noise(x,y,z)-.5)*chip,dy=(noise(z,x,y)-.5)*chip*.4,dz=(noise(y,z,x)-.5)*chip;x+=dx;y+=dy;z+=dz;}
    if(bend)y+=bend(x,z);pos.setXYZ(i,x,y,z);}
   if(chip||bend)n.computeVertexNormals();
   const col=new Float32Array(pos.count*3),c=new THREE.Color();
   for(let i=0;i<pos.count;i++){paint(c,pos.getX(i),pos.getY(i),pos.getZ(i));col.set([c.r,c.g,c.b],i*3);}
   n.setAttribute('color',new THREE.BufferAttribute(col,3));bin.push(n);
  };
  const at=(x,y,z,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1)=>m.clone().compose(new THREE.Vector3(x,y,z),q.clone().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(sx,sy,sz));
  const along=(p,dir)=>m.clone().compose(p,q.clone().setFromUnitVectors(up,dir.clone().normalize()),one);
  const flat=(col)=>(c)=>c.copy(col);
  const timber=new THREE.Color(0x4a3626),grain=new THREE.Color(0x24180f),worn=new THREE.Color(0x6e5439),rot=new THREE.Color(0x1c2117);
  const black=new THREE.Color(0x050404),gouge=new THREE.Color(0x0e0907);
  // Old boards: dark grain running their length, worn pale down the middle where feet pass,
  // blackening with rot toward the ends.
  const board=(salt)=>(c,x,y,z)=>{
   const g=Math.sin(z*260+salt*5+Math.sin(x*14+salt)*1.6)*.5+.5;
   c.copy(timber).lerp(grain,g*g*.6).offsetHSL(0,0,(noise(x,y,z)-.5)*.05);
   if(y>.018)c.lerp(worn,Math.max(0,.3-Math.abs(x))*.9*(1-g*.5));
   c.lerp(rot,Math.min(1,Math.max(0,Math.abs(x)-.2)*7)*(.4+noise(z,x,salt)*.5));
  };
  // The void under the floor.
  put(woodParts,new THREE.BoxGeometry(.64,.003,.5),at(0,.0015,0),flat(black));
  // Five boards across the tile; the gap beside the middle one gapes.
  const widths=[.085,.085,.075,.085,.085],gaps=[.012,.012,.03,.012];
  const total=widths.reduce((a,b)=>a+b)+gaps.reduce((a,b)=>a+b);
  const lift=(x)=>{const d=Math.max(0,x+.1);return d*d*.45;};
  let z0=-total/2;const boards=[];
  for(let i=0;i<widths.length;i++){
   const w=widths[i],cz=z0+w/2,warped=i===2,L=.58+noise(i,4,1)*.06,cx=(noise(i,7,3)-.5)*.03;
   boards.push({cz,w,warped,L,cx});
   put(woodParts,new THREE.BoxGeometry(L,.02,w-.004,30,1,4),at(cx,.012,cz,0,(noise(i,2,9)-.5)*.03),board(i),
    {chip:.006,bend:warped?(x,z)=>lift(x)+(z-cz)*Math.max(0,x)*.25:null});
   z0+=w+(gaps[i]||0);
  }
  const mid=boards[2],gapZ=mid.cz+mid.w/2+gaps[2]/2;
  // The split down the warped board, and splinters standing up along it.
  for(let k=0;k<14;k++){const x=.02+k*.02,lz=mid.cz+Math.sin(k*1.7)*.004;
   put(woodParts,new THREE.BoxGeometry(.021,.002,.0045),at(x,.0225+lift(x)+.0005,lz,0,Math.sin(k*1.3)*.4),flat(gouge));}
  for(let k=0;k<6;k++){const x=.1+k*.035+noise(k,1,1)*.015,lz=mid.cz+(k%2?.006:-.006),y=.022+lift(x);
   put(woodParts,new THREE.ConeGeometry(.0045,.025+noise(k,5,5)*.025,3),along(new THREE.Vector3(x,y+.01,lz),new THREE.Vector3(.6,1,(k%2?1:-1)*.5)),(c,x2,y2)=>c.copy(worn).lerp(grain,Math.max(0,(y-y2)*30+.3)));}
  // Claw gouges dragged across the boards either side, from the crack outward.
  for(const [side,x0] of [[-1,.05],[1,-.12],[1,.16]]){const a=side*(.25+noise(x0,1,0)*.3);
   for(let j=-1;j<=1;j++){const len=.06+noise(x0,j,2)*.035,zs=(side<0?mid.cz-mid.w/2-.012:gapZ+gaps[2]/2)+side*len/2,xs=x0+j*.017;
    put(woodParts,new THREE.BoxGeometry(.004,.002,len),at(xs+Math.sin(a)*len*.5,.0228,zs,0,a),flat(gouge));}}
  // Bone and iron.
  const bone=new THREE.Color(0xb3a684),boneDark=new THREE.Color(0x5e5440),claw=new THREE.Color(0x141110);
  const iron=new THREE.Color(0x2b2826),rust=new THREE.Color(0x5a3420);
  const metal=(c,x,y,z)=>c.copy(iron).lerp(rust,noise(x,y,z)*.7);
  // Nail heads at the board ends; the warped board has torn free at its far end.
  for(const b of boards)for(const s of [-1,1]){if(b.warped&&s>0)continue;
   for(const o of [-.022,.022])put(boneParts,new THREE.CylinderGeometry(.0065,.0075,.004,6),at(b.cx+s*(b.L/2-.03),.0235,b.cz+o),metal);}
  // A sprung nail lying bent by the lifted end, and another still standing up out of it.
  put(boneParts,new THREE.CylinderGeometry(.0025,.0025,.045,4),at(.36,.026,mid.cz+.07,0,.5,Math.PI/2-.12),metal);
  put(boneParts,new THREE.CylinderGeometry(.007,.007,.003,6),at(.338,.028,mid.cz+.058,.1,.5,Math.PI/2-.12),metal);
  {const p=new THREE.Vector3(.2,.022+lift(.2),mid.cz+.02);put(boneParts,new THREE.CylinderGeometry(.0025,.002,.04,4),along(p.clone().add(new THREE.Vector3(.004,.018,0)),new THREE.Vector3(.25,1,.1)),metal);}
  // The mouth: under the lifted end the void is lined with needle teeth, rows hanging from the
  // board's underside and rising from the dark to meet them, yellowed and black at the root.
  const tooth=(root,tipY)=>(c,x,y)=>c.copy(bone).lerp(boneDark,.25+noise(x,y,root)*.25).lerp(claw,Math.max(0,1-Math.abs(y-root)/Math.max(.004,Math.abs(tipY-root)*.35)));
  for(let k=0;k<9;k++){const x=.06+k*.028,gape=lift(x),lz=mid.cz+(k%2?.016:-.016)+(noise(k,3,3)-.5)*.008;
   if(gape<.012)continue;
   const h=gape*(.55+noise(k,6,2)*.2),top=.002+gape,r=.0035+gape*.04;
   const down=new THREE.ConeGeometry(r,h,5);down.rotateX(Math.PI);
   put(boneParts,down,at(x,top-h/2,lz,0,0,(noise(k,1,8)-.5)*.3),tooth(top,top-h));
   const h2=gape*(.45+noise(k,2,6)*.2),lz2=mid.cz+(k%2?-.012:.012);
   put(boneParts,new THREE.ConeGeometry(r*.9,h2,5),at(x+.012,.003+h2/2,lz2,0,0,(noise(k,9,1)-.5)*.3),tooth(.003,.003+h2));}
  // Two eyes looking up through the wide crack.
  for(const x of [-.135,-.095])put(glowParts,new THREE.SphereGeometry(.011,10,6),at(x,.004,gapZ,0,.08,0,1,.3,.55),(c,x2,y,z)=>c.setScalar(Math.abs(x2-x)<.0025?.15:1));
  const woodMesh=add(mergeGeometries(woodParts),mat({color:0xffffff,vertexColors:true,roughness:.92}));woodMesh.name='squeaky-wood';
  const boneMesh=add(mergeGeometries(boneParts),mat({color:0xffffff,vertexColors:true,metalness:.2,roughness:.62}));boneMesh.name='squeaky-bone';
  const eyes=new THREE.MeshBasicMaterial({color:new THREE.Color(0xe8d040).multiplyScalar(1.3),vertexColors:true});materials.push(eyes);
  const glow=add(mergeGeometries(glowParts),eyes);glow.name='squeaky-eyes';glow.castShadow=false;
  for(const p of [...woodParts,...boneParts,...glowParts])p.dispose();
 }else if(kind==='gas'){
  // Sleeping gas trap: a round flagstone carved as a sleeper's face, set in the floor looking up
  // with its eyes shut under heavy, lashed lids. Its mouth hangs open in a yawn that is the vent:
  // rusted bars across it, worn fangs round the rim, a violet glow deep in the throat. The gas
  // pools low round the stone and curls up in two lazy wisps. The floor round it is cracked and
  // stained, wilted poppies droop by it, and the last one who lay down here is still curled up
  // beside it, one hand reaching for the bars.
  // Four draws: stone and bone, the iron, the gas, the throat's glow.
  const stoneParts=[],ironParts=[],gasParts=[],glowParts=[];
  const noise=(x,y,z)=>{const s=Math.sin(x*157.3+y*311.9+z*97.1+seed*3.7)*43758.5453;return s-Math.floor(s);};
  const up=new THREE.Vector3(0,1,0),q=new THREE.Quaternion(),m=new THREE.Matrix4(),one=new THREE.Vector3(1,1,1);
  const put=(bin,geo,matrix,paint,chip=0)=>{
   const n=geo.index?geo.toNonIndexed():geo;if(n!==geo)geo.dispose();
   n.applyMatrix4(matrix);n.deleteAttribute('uv');
   const pos=n.attributes.position;
   if(chip){for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    pos.setXYZ(i,x+(noise(x,y,z)-.5)*chip,y+(noise(z,x,y)-.5)*chip*.4,z+(noise(y,z,x)-.5)*chip);}n.computeVertexNormals();}
   const col=new Float32Array(pos.count*3),c=new THREE.Color();
   for(let i=0;i<pos.count;i++){paint(c,pos.getX(i),pos.getY(i),pos.getZ(i));col.set([c.r,c.g,c.b],i*3);}
   n.setAttribute('color',new THREE.BufferAttribute(col,3));bin.push(n);
  };
  const at=(x,y,z,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1)=>m.clone().compose(new THREE.Vector3(x,y,z),q.clone().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(sx,sy,sz));
  // A cylinder from a to b (bones, stems), radius r0 at a and r1 at b.
  const span=(bin,a,b,r0,r1,paint,radial=6)=>{const d=new THREE.Vector3().subVectors(b,a),len=d.length();
   put(bin,new THREE.CylinderGeometry(r1,r0,len,radial),m.clone().compose(a.clone().addScaledVector(d,.5),q.clone().setFromUnitVectors(up,d.normalize()),one),paint);};
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const rock=new THREE.Color(0x605d58),stain=new THREE.Color(0x2e2238),soot=new THREE.Color(0x1a1719),black=new THREE.Color(0x060506);
  const bone=new THREE.Color(0xb3a684),moss=new THREE.Color(0x2c3020),floorGrey=new THREE.Color(0x56544f);
  const flat=(col)=>(c)=>c.copy(col);
  const mz=.1,top=.03;   // the mouth's centre (z) and the face's surface
  // Stone darkens and goes violet toward the mouth, where the gas has soaked into it.
  const stone=(lift=0)=>(c,x,y,z)=>{const h=noise(x,y,z);c.copy(rock).offsetHSL(0,0,lift+(h-.5)*.09);
   const d=Math.hypot(x,(z-mz)*1.2);c.lerp(stain,Math.max(0,Math.min(.75,(.2-d)*5)));if(h>.88)c.lerp(soot,.55);};
  // The stain on the floor: a ragged blot fading to the floor's grey, cracks running out of it.
  const blot=new THREE.CircleGeometry(.45,40,0,Math.PI*2);
  {const p=blot.attributes.position;for(let i=1;i<p.count;i++){const a=Math.atan2(p.getY(i),p.getX(i)),r=.34+noise(Math.round(a*6),1,2)*.1+Math.sin(a*5+seed)*.02;
   p.setXY(i,Math.cos(a)*r,Math.sin(a)*r);}p.needsUpdate=true;}
  put(stoneParts,blot,at(0,.001,0,-Math.PI/2),(c,x,y,z)=>{const d=Math.hypot(x,z);c.copy(stain).lerp(floorGrey,Math.min(1,Math.max(0,(d-.24)*6)));c.offsetHSL(0,0,(noise(x,0,z)-.5)*.04);});
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2+noise(i,4,4)*.6,r0=.27,L=.07+noise(i,5,5)*.1;
   put(stoneParts,new THREE.BoxGeometry(L,.003,.006),at(Math.cos(a)*(r0+L/2),.0025,Math.sin(a)*(r0+L/2),0,-a+(noise(i,6,6)-.5)*.3),flat(black));}
  // The flagstone: a shadow gap, then the chipped round slab.
  put(stoneParts,new THREE.CylinderGeometry(.285,.285,.004,32),at(0,.002,0),flat(black));
  put(stoneParts,new THREE.CylinderGeometry(.265,.275,top,32,2),at(0,top/2,0),stone(),.012);
  // The face, head toward -z. A heavy brow, lids bulging shut, lashes spiking out of the crease.
  put(stoneParts,new THREE.BoxGeometry(.3,.02,.045,6,1,2),at(0,top+.006,-.105,0,0,0),stone(.03),.008);
  for(const s of [-1,1]){
   put(stoneParts,new THREE.SphereGeometry(.05,14,8,0,Math.PI*2,0,Math.PI/2),at(s*.08,top-.002,-.058,0,s*.15,0,1,.38,.62),stone(.05));
   put(stoneParts,new THREE.TorusGeometry(.047,.0045,4,14,Math.PI),at(s*.08,top+.002,-.058,Math.PI/2,0,0,1,.62,1),flat(black));
   for(let k=0;k<5;k++){const a=.35+k*(Math.PI-.7)/4,x=s*.08+Math.cos(a)*.047,z=-.058+Math.sin(a)*.047*.62;
    put(stoneParts,new THREE.ConeGeometry(.0035,.022,3),m.clone().compose(V(x,top+.004,z+.009),q.clone().setFromUnitVectors(up,V(Math.cos(a)*.6,.15,1).normalize()),one),flat(soot));}
   // Sunken cheeks under jutting cheekbones.
   put(stoneParts,new THREE.SphereGeometry(.045,10,6,0,Math.PI*2,0,Math.PI/2),at(s*.14,top-.004,-.01,0,0,0,1,.4,.8),stone(.04));
   put(stoneParts,new THREE.SphereGeometry(.032,8,6),at(s*.13,top+.001,.05,0,0,0,1,.12,1.3),flat(soot));
  }
  // A long hooked nose with flared, sooty nostrils.
  put(stoneParts,new THREE.ConeGeometry(.028,.085,4),at(0,top+.008,-.02,Math.PI/2,Math.PI/4,0,1,1,.55),stone(.03),.004);
  for(const s of [-1,1])put(stoneParts,new THREE.SphereGeometry(.011,8,4),at(s*.018,top+.006,.024,0,0,0,1,.4,.8),flat(black));
  // The mouth: thick lips round a gaping yawn, fangs worn round its rim.
  put(stoneParts,new THREE.TorusGeometry(.07,.016,6,24),at(0,top+.002,mz,Math.PI/2,0,0,1.25,.85,.45),stone(.02),.004);
  put(stoneParts,new THREE.CircleGeometry(.072,24),at(0,top+.004,mz,-Math.PI/2,0,0,1.22,.82,1),flat(black));
  for(let k=0;k<10;k++){const a=k/10*Math.PI*2+.3,x=Math.cos(a)*.078,z=mz+Math.sin(a)*.055,h=.018+noise(k,7,7)*.012;
   const dir=V(-Math.cos(a),-.35,-Math.sin(a)).normalize();
   put(stoneParts,new THREE.ConeGeometry(.0065,h,4),m.clone().compose(V(x,top+.006,z).addScaledVector(dir,h/2),q.clone().setFromUnitVectors(up,dir),one),
    (c,x2,y)=>c.copy(bone).lerp(soot,Math.max(0,Math.min(1,(top+.008-y)*40))));}
  // The throat's glow, down in the dark.
  put(glowParts,new THREE.CircleGeometry(.042,18),at(0,top+.0045,mz,-Math.PI/2,0,0,1.2,.8,1),(c,x,y,z)=>{const d=Math.hypot(x/1.2,(z-mz)/.8);c.setScalar(Math.max(.25,1-d*16));});
  // Rusted bars across the yawn, pinned into the lips.
  const iron=new THREE.Color(0x4a4744),rust=new THREE.Color(0x6e3a1e);
  const ironPaint=(c,x,y,z)=>c.copy(iron).lerp(rust,noise(x,y,z)*.8);
  for(let i=-2;i<=2;i++){const x=i*.03,hz=.055*Math.sqrt(1-(x/.09)**2)+.008;
   span(ironParts,V(x,top+.009,mz-hz),V(x,top+.009,mz+hz),.0055,.0055,ironPaint);
   for(const s of [-1,1])put(ironParts,new THREE.SphereGeometry(.008,6,4),at(x,top+.009,mz+s*hz),ironPaint);}
  span(ironParts,V(-.1,top+.011,mz),V(.1,top+.011,mz),.006,.006,ironPaint);
  // Gouges where something scraped at the bars.
  for(let i=0;i<4;i++)put(stoneParts,new THREE.BoxGeometry(.004,.003,.05),at(.1+i*.012,top+.001,mz+.03+i*.006,0,.5+i*.05),flat(black));
  // The sleeper: curled on the stain at the -x,+z corner, its skull pillowed on one arm and the
  // other hand reaching for the bars.
  const bonePaint=(c,x,y,z)=>c.copy(bone).lerp(moss,noise(x,y,z)*.3).offsetHSL(0,0,(noise(z,x,y)-.5)*.08);
  const sk=V(-.33,.035,.3);
  put(stoneParts,new THREE.SphereGeometry(.04,14,10),at(sk.x,sk.y,sk.z,0,.6,1.35,1,.92,1.12),bonePaint);
  put(stoneParts,new THREE.BoxGeometry(.045,.03,.035),at(sk.x+.004,.022,sk.z+.035,0,.6,1.35),bonePaint,.006);
  for(const s of [-1,1])put(stoneParts,new THREE.SphereGeometry(.012,8,6),at(sk.x+.012,.03+s*.014,sk.z+.03,0,0,0,.6,1,1),flat(black));
  // Spine curling round behind the stone, ribs arching off it.
  const spine=new THREE.CatmullRomCurve3([V(-.35,.016,.24),V(-.4,.016,.14),V(-.4,.016,.02),V(-.36,.016,-.08)]);
  for(let i=0;i<9;i++){const p=spine.getPoint(i/8);put(stoneParts,new THREE.SphereGeometry(.013-i*.0004,8,5),at(p.x,p.y,p.z,0,0,0,1,.8,1),bonePaint);}
  for(let i=0;i<4;i++){const p=spine.getPoint(.15+i*.13),r=.045-i*.004;
   put(stoneParts,new THREE.TorusGeometry(r,.0045,4,12,Math.PI*1.05),at(p.x+r*.6,.012,p.z,0,.3,.1,1,.7,1),bonePaint);}
  put(stoneParts,new THREE.TorusGeometry(.04,.009,5,14),at(-.36,.012,-.1,Math.PI/2,0,0,1,1.3,1),bonePaint);
  // The reaching arm: upper arm, forearm, finger bones splayed on the slab's edge.
  const sh=V(-.34,.014,.2),el=V(-.24,.012,.24),wr=V(-.17,.02,.17);
  span(stoneParts,sh,el,.009,.008,bonePaint);span(stoneParts,el,wr,.007,.006,bonePaint);
  for(let k=0;k<4;k++){const a=-.9+k*.32,f=V(wr.x+Math.cos(a)*.045,.032,wr.z-Math.sin(-a)*.045-.01);
   span(stoneParts,wr,f,.004,.003,bonePaint,4);}
  // Wilted poppies at the +x,-z corner, heads hanging, petals gone black at the edges.
  const stem=new THREE.Color(0x3d4a24),petal=new THREE.Color(0x8a1410);
  for(let i=0;i<3;i++){const bx=.33+(i-1)*.05,bz=-.33+noise(i,8,8)*.06,hgt=.12+noise(i,9,9)*.06,lean=(noise(i,2,9)-.5)*.5;
   const base=V(bx,0,bz),bend=V(bx+lean*.05,hgt,bz+.02),head=V(bx+lean*.07+.03,hgt-.04,bz+.05);
   span(stoneParts,base,bend,.0035,.003,flat(stem),4);span(stoneParts,bend,head,.003,.0025,flat(stem),4);
   for(let k=0;k<4;k++){const a=k/4*Math.PI*2+i;
    put(stoneParts,new THREE.SphereGeometry(.02,8,5,0,Math.PI*2,0,Math.PI/2),at(head.x+Math.cos(a)*.006,head.y-.006,head.z+Math.sin(a)*.006,Math.PI+Math.cos(a)*.5,0,Math.sin(a)*.5,1,.5,.7),
     (c,x,y)=>c.copy(petal).lerp(black,Math.max(0,Math.min(1,(head.y-.002-y)*60))*.8));}
   put(stoneParts,new THREE.SphereGeometry(.007,6,4),at(head.x,head.y-.004,head.z),flat(soot));}
  // A fallen petal on the stain.
  put(stoneParts,new THREE.CircleGeometry(.014,8),at(.22,.0025,-.27,-Math.PI/2,0,.4,1,.6,1),flat(petal.clone().lerp(black,.4)));
  // The gas: a low mantle pooled round the stone, and two wisps curling up out of the yawn,
  // thinning as they rise. Lighter and more lilac at the top.
  const gasLow=new THREE.Color(0x6a4a8c),gasHigh=new THREE.Color(0xc8b0e8);
  const gasPaint=(c,x,y)=>c.copy(gasLow).lerp(gasHigh,Math.min(1,y/.3));
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2+noise(i,1,1)*.5,r=.27+noise(i,2,2)*.1,s=.07+noise(i,3,3)*.04;
   put(gasParts,new THREE.SphereGeometry(s,12,6),at(Math.cos(a)*Math.min(r,.44-s),.017,Math.sin(a)*Math.min(r,.44-s),0,a,0,1,.22,.8),gasPaint);}
  put(gasParts,new THREE.SphereGeometry(.09,14,6),at(0,top+.01,mz,0,0,0,1.1,.2,.8),gasPaint);
  for(const s of [-1,1]){
   for(let i=0;i<11;i++){const t=i/10,a=s*(t*5.2)+(s>0?0:1.4),r=.02+t*.07;
    const x=Math.cos(a)*r+s*.02,z=mz+Math.sin(a)*r*.8-t*.06,y=top+.03+t*(s>0?.34:.26),R=.042*(1-t*.62);
    put(gasParts,new THREE.SphereGeometry(R,10,6),at(x,y,z,0,a,0,1,.75,1),gasPaint);}}
  const stoneMesh=add(mergeGeometries(stoneParts),mat({color:0xffffff,vertexColors:true,roughness:.93}));stoneMesh.name='gas-stone';
  const ironMesh=add(mergeGeometries(ironParts),mat({color:0xffffff,vertexColors:true,metalness:.55,roughness:.7}));ironMesh.name='gas-iron';
  const gas=add(mergeGeometries(gasParts),mat({color:0xffffff,vertexColors:true,emissive:0x3a1f5c,emissiveIntensity:.7,roughness:1,transparent:true,opacity:.3,depthWrite:false}));
  gas.name='gas-cloud';gas.castShadow=false;gas.receiveShadow=false;
  const throat=new THREE.MeshBasicMaterial({color:new THREE.Color(0xb060ff).multiplyScalar(1.2),vertexColors:true});materials.push(throat);
  const glow=add(mergeGeometries(glowParts),throat);glow.name='gas-glow';glow.castShadow=false;
  for(const p of [...stoneParts,...ironParts,...gasParts,...glowParts])p.dispose();
 }else if(kind==='jaws'){
  // Bear trap (also arrow and dart traps when the bridge sends no name), set and open: two
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
  // Land mine: an olive-drab pressure mine half-buried in a ring of freshly
  // dug soil, with chipped paint, rust at the soil line, a stencilled band, a
  // bolted lid, a carrying lug and a red pressure plate with trigger prongs.
  // Two vertex-coloured meshes (soil and casing) instead of loose primitives.
  const noise=(x,z)=>Math.sin(x*61.3+seed*1.7)*Math.cos(z*57.9-seed*2.3)*.5+Math.sin((x+z)*23.1+seed)*.5;
  const C=(hex)=>new THREE.Color(hex);
  const R=.122,SOIL=.02;
  // Soil: a ring of turned earth banked up against the casing and falling away
  // to the floor with a ragged outline. Damp and dark against the casing, dry
  // and pale on the crest, dusty grey where it meets the slab.
  const ring=new THREE.RingGeometry(R-.004,.25,48,9);ring.rotateX(-Math.PI/2);
  {const p=ring.attributes.position;
   for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z),a=Math.atan2(z,x),t=(r-(R-.004))/(.25-(R-.004));
    const wob=1+t*(.1*Math.sin(3*a+seed)+.06*Math.sin(5*a-seed*.7));
    const bank=SOIL*(1-t)+.014*Math.exp(-((t-.25)**2)/.02)*(1-t*.5);
    const y=Math.max(.001,bank*(1-t*t)+noise(x,z)*.004*(1-t)+.001);
    p.setXYZ(i,x*wob,y,z*wob);
   }
   ring.computeVertexNormals();}
  const damp=C(0x2e2318),dry=C(0x6b5641),dust=C(0x575149),crumb=C(0x857058);
  const soil=[bake(ring,(c,x,y,z)=>{
   const r=Math.hypot(x,z),t=Math.min(1,Math.max(0,(r-R)/.14)),h=noise(x*1.7,z*1.7)*.5+.5;
   c.copy(damp).lerp(dry,Math.min(1,y/.028)*.8+h*.2);
   if(t>.6)c.lerp(dust,(t-.6)/.4);
   if(noise(x*4.1,z*3.7)>.7)c.lerp(crumb,.5);
  })];
  // Clods and pebbles thrown out of the hole.
  for(let i=0;i<11;i++){
   const a=rand(i+500)*Math.PI*2,r=.17+rand(i+510)*.14,s=.008+rand(i+520)*.014,pebble=i%4===0;
   const tint=pebble?C(0x77756d):C(0x4a3a2a).lerp(dry,rand(i+530)*.5);
   soil.push(bake(new THREE.DodecahedronGeometry(s,0),(c,x,y)=>c.copy(tint).multiplyScalar(.75+Math.min(.35,y*12)),
    {x:Math.cos(a)*r,y:s*.45,z:Math.sin(a)*r,rx:rand(i+540)*3,ry:rand(i+550)*3,sy:pebble?.6:.75}));
  }
  // Casing: a squat lathed drum whose rounded lid rises to a flat top with a
  // lid seam. Olive paint, chipped to bare steel on the rim, rusting at the
  // soil line, with a yellow stencilled band on one side.
  const olive=C(0x4f5a2c),oliveDark=C(0x39411f),steelBare=C(0x80867f),rustC=C(0x6b3a1e),rustDark=C(0x3e2414),stencil=C(0xc9b24a);
  const casing=(c,x,y,z)=>{
   const r=Math.hypot(x,z),a=Math.atan2(z,x),n=noise(x*1.3,z*1.3)*.5+.5;
   c.copy(olive).lerp(oliveDark,n*.5);
   const u=(a-.3)/1.3;
   if(r>R-.004&&y>.0175&&y<.0285&&u>0&&u<1&&(u*5)%1<.6)c.copy(stencil).lerp(oliveDark,n*.3);
   if(y>.04&&r>.1&&noise(x*3.1+1,z*2.9)>.35)c.copy(steelBare).lerp(rustC,n*.35);
   if(r>.083&&r<.089&&y<.0475&&y>.04)c.multiplyScalar(.4);
   const low=Math.max(0,1-(y-SOIL)/.008);
   if(low>0)c.lerp(n>.5?rustC:rustDark,Math.min(1,low*(.5+n*.6)));
   if(noise(x*2.2-3,z*2.6+2)>.6)c.lerp(rustC,.55);
  };
  // Extra rings on the wall and lid carry the stencil band and the lid seam.
  const profile=[[R-.001,-.004],[R,.012],[R,.016],[R,.018],[R+.0005,.028],[R+.0005,.03],[R-.001,.038],[R-.008,.044],[R-.018,.047],
   [.092,.048],[.088,.046],[.084,.046],[.08,.048],[.06,.048],[.001,.048]].map(([r,y])=>new THREE.Vector2(r,y));
  const body=[bake(new THREE.LatheGeometry(profile,96),casing)];
  // Lid bolts.
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2+.2;
   body.push(bake(new THREE.CylinderGeometry(.0065,.0065,.006,6),(c,x,y,z)=>c.copy(steelBare).lerp(rustC,.3+(noise(x*5,z*5)*.5+.5)*.5).multiplyScalar(y>.052?1:.7),{x:Math.cos(a)*.1,y:.05,z:Math.sin(a)*.1}));}
  // Carrying lug: a wire loop standing off the wall.
  {const a=2.5;
   body.push(bake(new THREE.TorusGeometry(.013,.003,5,12,Math.PI),(c,x,y,z)=>c.copy(steelBare).lerp(rustDark,.45+noise(x*6,z*6)*.2),{x:Math.cos(a)*(R+.004),y:SOIL+.001,z:Math.sin(a)*(R+.004),ry:-(a+Math.PI/2)}));}
  // Pressure plate: a raised red disc with grip ridges, worn pale at the edge,
  // carrying the fuse and its three splayed trigger prongs with red tips.
  const red=C(0xa8281a),redDark=C(0x5e140c),redWorn=C(0xc98a6a);
  body.push(bake(new THREE.CylinderGeometry(.05,.052,.01,24),(c,x,y,z)=>{const r=Math.hypot(x,z);c.copy(red).lerp(redDark,noise(x*4,z*4)*.25+.25);if(r>.046&&y>.055)c.lerp(redWorn,.5);},{y:.053}));
  for(let i=0;i<6;i++){const a=i/6*Math.PI;
   body.push(bake(new THREE.BoxGeometry(.084,.003,.005),(c)=>c.copy(redDark),{y:.0595,ry:a}));}
  body.push(bake(new THREE.CylinderGeometry(.013,.016,.016,12),(c,x,y)=>c.copy(steelBare).multiplyScalar(y>.07?1:.75),{y:.066}));
  for(let i=0;i<3;i++){const a=i/3*Math.PI*2+seed*.3,lean=.28;
   const dx=Math.cos(a),dz=Math.sin(a),len=.042;
   const tipX=dx*(.006+Math.sin(lean)*len),tipZ=dz*(.006+Math.sin(lean)*len),tipY=.072+Math.cos(lean)*len;
   body.push(bake(new THREE.CylinderGeometry(.0028,.0034,len,5),(c,x,y)=>c.copy(steelBare).lerp(rustC,Math.max(0,.08-y)*6),
    {x:dx*.006+tipX/2-dx*.003,y:.072+Math.cos(lean)*len/2,z:dz*.006+tipZ/2-dz*.003,rx:dz*lean,rz:-dx*lean}));
   body.push(bake(new THREE.SphereGeometry(.0055,8,6),(c)=>c.copy(red),{x:tipX,y:tipY,z:tipZ}));
  }
  // The mine sits a little skew in its hole.
  const tilt=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler((rand(560)-.5)*.08,rand(570)*6.28,(rand(580)-.5)*.08));
  const soilGeo=mergeGeometries(soil),bodyGeo=mergeGeometries(body);bodyGeo.applyMatrix4(tilt);
  for(const p of [...soil,...body])p.dispose();
  const ground=add(soilGeo,mat({color:0xffffff,vertexColors:true,roughness:1}));ground.castShadow=false;ground.name='mine-soil';
  add(bodyGeo,mat({color:0xffffff,vertexColors:true,metalness:.45,roughness:.55})).name='land-mine';
 }else if(kind==='rubble'){
  // Falling rock trap (and a rolling boulder or statue trap from an older bridge): a jagged rock lying in the
  // scar where it struck. The flagstone is shattered into shards tipped up
  // round a rim of crushed grit, cracks run out across the floor and gravel
  // is thrown wide. Two vertex-coloured meshes: the flat scar (no shadow) and
  // the rock with its shards and gravel.
  const noise=(x,z)=>Math.sin(x*47.3+seed*1.3)*Math.cos(z*52.1-seed*2.1)*.5+Math.sin((x-z)*19.7+seed)*.5;
  const C=(hex)=>new THREE.Color(hex);
  const RIM=.17,EDGE=.34;
  const lip=(r)=>.016*Math.exp(-(((r-RIM)/.045)**2));
  // The scar: a ragged disc of pale crushed grit, lowest at the centre, piled
  // on a rim where the flags broke, fading to dust at the edge.
  const disc=new THREE.RingGeometry(.002,EDGE,64,12);disc.rotateX(-Math.PI/2);
  {const p=disc.attributes.position;
   for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z),a=Math.atan2(z,x),t=r/EDGE;
    const wob=1+t*t*(.12*Math.sin(4*a+seed)+.07*Math.sin(7*a-seed*.6));
    const y=.002+lip(r)*(1+.35*noise(x*2,z*2))+(1-t)*.0015*noise(x*5,z*5);
    p.setXYZ(i,x*wob,Math.max(.001,y*(1-t*t*t)+.001),z*wob);
   }
   disc.computeVertexNormals();}
  const grit=C(0x9a968c),gritDark=C(0x76726a),dust=C(0x5f5d58),crackC=C(0x1c1b19);
  const scar=[bake(disc,(c,x,y,z)=>{
   const r=Math.hypot(x,z),h=noise(x*3.3,z*3.1)*.5+.5;
   c.copy(grit).lerp(gritDark,h*.45);
   if(r>RIM)c.lerp(dust,Math.min(1,(r-RIM)/(EDGE-RIM)*1.2));
   if(r<RIM*.8)c.multiplyScalar(.82+.18*r/RIM);
  })];
  // Cracks: tapering dark strips running out from the rim, some forked.
  const strip=(pts,w0,w1)=>{
   const v=[];
   for(let i=0;i<pts.length-1;i++){
    const [x0,z0]=pts[i],[x1,z1]=pts[i+1],dx=x1-x0,dz=z1-z0,l=Math.hypot(dx,dz)||1,nx=-dz/l,nz=dx/l;
    const wa=(w0+(w1-w0)*i/(pts.length-1))/2,wb=(w0+(w1-w0)*(i+1)/(pts.length-1))/2;
    const y0=Math.max(.0022,lip(Math.hypot(x0,z0))+.0035),y1=Math.max(.0022,lip(Math.hypot(x1,z1))+.0035);
    const A=[x0+nx*wa,y0,z0+nz*wa],B=[x0-nx*wa,y0,z0-nz*wa],P=[x1+nx*wb,y1,z1+nz*wb],Q=[x1-nx*wb,y1,z1-nz*wb];
    v.push(...A,...P,...B,...B,...P,...Q);
   }
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.computeVertexNormals();
   return geo;
  };
  for(let k=0;k<7;k++){
   const a0=k/7*Math.PI*2+rand(k+200)*.6,len=.16+rand(k+210)*.1,pts=[];
   for(let j=0;j<=8;j++){const r=.13+len*j/8,a=a0+.12*Math.sin(j*1.9+k*2.3)*(j/8);pts.push([Math.cos(a)*r,Math.sin(a)*r]);}
   scar.push(bake(strip(pts,.009,.0015),(c)=>c.copy(crackC)));
   if(k%2===0){const [bx,bz]=pts[4],ba=a0+(rand(k+220)>.5?.5:-.5),fork=[[bx,bz]];
    for(let j=1;j<=4;j++){const r=Math.hypot(bx,bz)+.022*j;fork.push([Math.cos(ba+Math.atan2(bz,bx)-a0)*r,Math.sin(ba+Math.atan2(bz,bx)-a0)*r]);}
    scar.push(bake(strip(fork,.005,.001),(c)=>c.copy(crackC)));}
  }
  // Shattered flags: wedge-shaped shards round the impact, their inner edges
  // pushed down and outer edges tipped up. Worn grey tops, fresh pale breaks.
  const flag=C(0x6f716c),flagDark=C(0x4f514d),fresh=C(0xa6a298);
  const rocks=[];
  const n=9;
  for(let i=0;i<n;i++){
   const a0=i/n*Math.PI*2+rand(i+300)*.25,a1=a0+Math.PI*2/n*(.72+rand(i+310)*.18),r0=.06+rand(i+320)*.03,r1=.17+rand(i+330)*.05;
   const outline=[[r0,a0],[r0,a1],[r1*(.92+rand(i+340)*.1),a1],[r1*(1.02+rand(i+350)*.06),(a0+a1)/2],[r1*(.9+rand(i+360)*.1),a0]];
   const shape=new THREE.Shape(outline.map(([r,a])=>new THREE.Vector2(Math.cos(a)*r,-Math.sin(a)*r)));
   const geo=new THREE.ExtrudeGeometry(shape,{depth:.013,bevelEnabled:false});geo.rotateX(-Math.PI/2);
   const mid=(a0+a1)/2,cx=Math.cos(mid)*(r0+r1)/2,cz=Math.sin(mid)*(r0+r1)/2,axis=new THREE.Vector3(-Math.sin(mid),0,Math.cos(mid));
   const tip=.14+rand(i+370)*.12;
   geo.applyMatrix4(new THREE.Matrix4().makeTranslation(cx,.004,cz).multiply(new THREE.Matrix4().makeRotationAxis(axis,-tip)).multiply(new THREE.Matrix4().makeTranslation(-cx,0,-cz)));
   rocks.push(bake(geo,(c,x,y,z,nx,ny)=>{
    const h=noise(x*4.3+i,z*4.1)*.5+.5;
    c.copy(flag).lerp(flagDark,h*.5);
    if(Math.abs(ny)<.6)c.copy(fresh).lerp(gritDark,h*.3);
    else if(ny<0)c.multiplyScalar(.5);
   }));
  }
  // The rock: a lumpy, faceted boulder with one flat fresh fracture face and a
  // flattened base, sunk a little into the grit at the centre.
  const boulder=new THREE.IcosahedronGeometry(1,4);
  const cut=new THREE.Vector3(rand(400)-.5,.3+rand(410)*.5,rand(420)-.5).normalize();
  {const p=boulder.attributes.position,v=new THREE.Vector3();
   for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i);
    const d=1+.16*Math.sin(v.x*3.1+seed)*Math.sin(v.y*2.7-seed*.5)+.09*Math.sin(v.z*6.3+v.x*4.1)+.05*Math.sin((v.x+v.y+v.z)*11.3);
    v.multiplyScalar(d);
    const k=v.dot(cut);if(k>.72)v.addScaledVector(cut,.72-k);
    if(v.y<-.62)v.y=-.62;
    p.setXYZ(i,v.x*.14,v.y*.1,v.z*.12);
   }
   boulder.computeVertexNormals();}
  const weathered=C(0x6b6a64),lichen=C(0x55584a),crevice=C(0x2f2e2b),dusted=C(0x8d8a82);
  const cutWorld=cut.clone().multiply(new THREE.Vector3(1/.14,1/.1,1/.12)).normalize();
  rocks.push(bake(boulder,(c,x,y,z,nx,ny,nz)=>{
   const h=noise(x*6,z*6+y*5)*.5+.5,shell=Math.hypot(x/.14,y/.1,z/.12);
   c.copy(weathered).lerp(lichen,Math.max(0,h-.45)*1.4);
   c.lerp(crevice,Math.min(1,Math.max(0,1-shell)*1.6));
   if(nx*cutWorld.x+ny*cutWorld.y+nz*cutWorld.z>.97)c.copy(fresh).lerp(gritDark,h*.25);
   else if(ny>.7)c.lerp(dusted,.3);
   if(y<-.045)c.multiplyScalar(.7);
  },{x:(rand(430)-.5)*.04,y:.058,z:(rand(440)-.5)*.04,ry:rand(450)*6.28,rz:(rand(460)-.5)*.2}));
  // Gravel thrown out of the scar, with a few fist-sized chunks near the rim.
  for(let i=0;i<18;i++){
   const big=i<4,a=rand(i+500)*Math.PI*2,r=big?.19+rand(i+510)*.06:.13+rand(i+510)*.27,s=big?.024+rand(i+520)*.012:.007+rand(i+520)*.012;
   const tint=(i%3?flag:grit).clone().multiplyScalar(.8+rand(i+530)*.3);
   rocks.push(bake(new THREE.DodecahedronGeometry(s,0),(c,x,y,z,nx,ny)=>c.copy(tint).multiplyScalar(ny>.5?1.05:.72),
    {x:Math.cos(a)*r,y:s*.45+(big?lip(r)*.6:0),z:Math.sin(a)*r,rx:rand(i+540)*3,ry:rand(i+550)*3,sy:big?.8:.65}));
  }
  const scarGeo=mergeGeometries(scar),rockGeo=mergeGeometries(rocks);
  for(const p of [...scar,...rocks])p.dispose();
  const ground=add(scarGeo,mat({color:0xffffff,vertexColors:true,roughness:1}));ground.castShadow=false;ground.name='rubble-scar';
  add(rockGeo,mat({color:0xffffff,vertexColors:true,roughness:.93})).name='fallen-rock';
 }else if(kind==='rolling'){
  // Rolling boulder trap: no rock lies here. Its path does: a channel worn glassy-smooth right
  // across the tile, scored with long parallel scrapes and walled by chipped kerbstones the
  // boulder has knocked askew. A hexagonal trigger stone sits flush in the middle, ringed by a
  // black gap. Past it, something that stood on the trigger lies pressed flat into the track: a
  // crushed skull, splayed ribs and a snapped long bone, with a dark smear dragged on toward the
  // tile's edge the way the boulder went. Two draws: the flat track (no shadow) and the stone
  // and bone standing on it.
  const noise=(x,y,z)=>{const s=Math.sin(x*157.3+y*311.9+z*97.1+seed*3.7)*43758.5453;return s-Math.floor(s);};
  const C=(hex)=>new THREE.Color(hex);
  const L=.96,W=.2,SKULL=.17;
  const polished=C(0x5d5e5a),deep=C(0x2c2c2a),scrape=C(0x161615),sheen=C(0x8a8a84),gore=C(0x2a0b08),dried=C(0x401610);
  // The track: a slightly dished strip, darkest down its centre line, scored lengthwise.
  const strip=new THREE.PlaneGeometry(L,W,48,10);strip.rotateX(-Math.PI/2);
  {const p=strip.attributes.position;
   for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),t=Math.abs(z)/(W/2);p.setY(i,.001+.0035*t*t);}
   strip.computeVertexNormals();}
  const smear=(x,z)=>x<SKULL-.04?0:Math.max(0,1-Math.abs(z+.012*Math.sin(x*30))/(.05*(1-(x-SKULL)/(L/2-SKULL)*.6)))*Math.min(1,(x-SKULL+.04)/.06)*(1-.75*(x-SKULL)/(L/2-SKULL));
  const track=[bake(strip,(c,x,y,z)=>{
   const t=Math.abs(z)/(W/2),lines=Math.pow(Math.abs(Math.sin(z*190+Math.sin(x*6+seed)*.8)),14);
   c.copy(deep).lerp(polished,t*.7+(noise(x,0,z)-.5)*.08);
   c.lerp(sheen,Math.max(0,.45-Math.abs(t-.45))*.5);
   c.lerp(scrape,lines*.7*(1-t*.6));
   const s=smear(x,z);if(s>0)c.lerp(gore,Math.min(.9,s)).lerp(dried,noise(x*3,1,z*3)*.3*s);
  })];
  // The trigger: a hexagonal flag sunk flush in a black gap, a ring and six spokes cut in it.
  const plateX=-.07;
  track.push(bake(new THREE.CylinderGeometry(.088,.088,.004,6),(c)=>c.copy(scrape).multiplyScalar(.4),{x:plateX,y:.002}));
  track.push(bake(new THREE.CylinderGeometry(.078,.078,.008,6,1),(c,x,y,z,nx,ny)=>{
   const dx=x-plateX,r=Math.hypot(dx,z),a=Math.atan2(z,dx);
   c.copy(polished).lerp(sheen,.25+(noise(x,y,z)-.5)*.1);
   if(ny<.5)c.multiplyScalar(.6);
   else if(Math.abs(r-.042)<.004||(r>.012&&r<.06&&Math.abs(Math.sin(a*3))<.07)||r<.008)c.copy(scrape);
  },{x:plateX,y:.004,ry:Math.PI/6}));
  // Kerbstones down both sides: chipped blocks, the odd one knocked askew or cracked off.
  const parts=[];
  const chip=(geo,amt)=>{const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   p.setXYZ(i,x+(noise(x,y,z)-.5)*amt,y+(noise(z,x,y)-.5)*amt*.6,z+(noise(y,z,x)-.5)*amt);}geo.computeVertexNormals();return geo;};
  const kerb=C(0x6f716c),kerbDark=C(0x484a46),kerbFresh=C(0xa29e94);
  for(const side of [-1,1]){
   let x=-L/2+.005;
   for(let k=0;x<L/2-.04;k++){
    const len=Math.min(.1+noise(k,side,1)*.07,L/2-x-.005),h=.035+noise(k,side,2)*.02,skew=noise(k,side,3)>.8;
    const geo=chip(new THREE.BoxGeometry(len-.006,h,.05,4,2,2),.008);
    parts.push(bake(geo,(c,px,py,pz,nx,ny,nz)=>{
     c.copy(kerb).lerp(kerbDark,noise(px*4,py*4,pz*4)*.5+Math.max(0,.02-py)*12);
     if(nz*side<-.6)c.lerp(kerbFresh,.35+noise(px*9,0,0)*.3);
     if(nx*nx>.7)c.lerp(kerbFresh,.25);
    },{x:x+len/2,y:h/2-.004,z:side*(W/2+.027),ry:skew?(noise(k,side,4)-.5)*.35:(noise(k,side,5)-.5)*.05,rz:(noise(k,side,6)-.5)*.06}));
    x+=len;
   }
  }
  // Bone: the skull pressed flat, its sockets dark; ribs fanned out; a thigh bone snapped in two.
  const bone=C(0xb7aa88),boneDark=C(0x6a5f46),hollow=C(0x120d0a);
  const bonePaint=(c,x,y,z)=>c.copy(bone).lerp(boneDark,noise(x*8,y*8,z*8)*.45).lerp(gore,smear(x,z)*.35);
  const skull=new THREE.SphereGeometry(.052,16,10);
  {const p=skull.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   p.setXYZ(i,x*1.15,y*.3+(y<0?-y*.15:0)+(noise(x,y,z)-.5)*.006,z*(1+.25*Math.max(0,x/.052)));}skull.computeVertexNormals();}
  parts.push(bake(skull,(c,x,y,z)=>{
   bonePaint(c,x,y,z);
   const lx=x-SKULL,lz=z-.004;
   for(const e of [-1,1])if(Math.hypot(lx-.024,lz-e*.022)<.013&&y>.014)c.copy(hollow);
   if(Math.abs(lz-.02*Math.sin(lx*90))<.002&&lx<.01)c.copy(hollow);
  },{x:SKULL,y:.012,z:.004,ry:-.2}));
  // Jaw knocked loose beside it.
  parts.push(bake(new THREE.TorusGeometry(.03,.006,4,10,Math.PI*.9),bonePaint,{x:SKULL+.07,y:.006,z:-.05,rx:-Math.PI/2,rz:.6,sy:1.1}));
  for(let i=0;i<5;i++){
   const side=i%2?1:-1,x=SKULL+.07+i*.032,a=side*(.9+noise(i,1,9)*.5);
   parts.push(bake(new THREE.TorusGeometry(.05,.0045,4,12,Math.PI*.55),bonePaint,{x,y:.005,z:side*.012,rx:-Math.PI/2,rz:a,sy:.85}));
  }
  for(const [x,z,ry] of [[-.27,.03,.25],[-.36,-.02,-.4]]){
   parts.push(bake(new THREE.CylinderGeometry(.008,.006,.1,6),bonePaint,{x,y:.008,z,rz:Math.PI/2,ry}));
   parts.push(bake(new THREE.SphereGeometry(.014,8,6),bonePaint,{x:x-Math.cos(ry)*.05,y:.01,z:z+Math.sin(ry)*.05,sy:.75}));
  }
  // Grit and chips ground out of the kerbs, caught along the walls of the track.
  for(let i=0;i<16;i++){
   const side=i%2?1:-1,x=(noise(i,2,7)-.5)*L*.9,z=side*(W/2-.012-noise(i,3,7)*.03),s=.006+noise(i,4,7)*.01;
   parts.push(bake(new THREE.DodecahedronGeometry(s,0),(c,px,py,pz,nx,ny)=>c.copy(kerb).multiplyScalar(ny>.4?1:.65),{x,y:s*.4,z,rx:noise(i,5,7)*3,ry:noise(i,6,7)*3,sy:.6}));
  }
  const trackGeo=mergeGeometries(track),partGeo=mergeGeometries(parts);
  for(const p of [...track,...parts])p.dispose();
  const ground=add(trackGeo,mat({color:0xffffff,vertexColors:true,roughness:.55,metalness:.05}));ground.castShadow=false;ground.name='rolling-track';
  add(partGeo,mat({color:0xffffff,vertexColors:true,roughness:.88})).name='rolling-stone';
 }else if(kind==='statue'){
  // Statue trap, sprung: the statue is gone and only its pedestal is left. The stone shell it
  // stood in has burst open at the ankles, so two jagged collars of stone ring the clean,
  // unweathered soles where its feet were, and curved shards of its skin lie split open on the
  // cap and spilled on the floor. A crack runs across the cap and one corner has sheared off.
  // Clawed, three-toed prints in pale stone dust lead away from the plinth toward a corner of
  // the tile. Two vertex-coloured meshes: the flat dust and prints (no shadow), and the plinth
  // with its collars and shards.
  const noise=(x,y,z)=>{const s=Math.sin(x*127.1+y*311.7+z*74.7+seed*5.3)*43758.5453;return s-Math.floor(s);};
  const smooth=(x,z)=>Math.sin(x*41.3+seed)*Math.cos(z*37.9-seed*.7)*.5+Math.sin((x+z)*17.1-seed)*.5;
  const C=(hex)=>new THREE.Color(hex);
  const weathered=C(0x67685f),grime=C(0x3b3d35),moss=C(0x4c5640),fresh=C(0xb1ab9c),inner=C(0xc8c1ae),crackC=C(0x181816),dustC=C(0x8f8a7e);
  const TOP=.19,heading=Math.PI/4+Math.floor(rand(900)*4)*Math.PI/2;
  const fwd=[Math.cos(heading),Math.sin(heading)],side=[-fwd[1],fwd[0]];
  // The broken corner faces away from the trail.
  const cx=-Math.sign(Math.cos(heading)),cz=-Math.sign(Math.sin(heading));
  const chipBox=(w,h,d,sx,sy,sz,amt)=>{const geo=new THREE.BoxGeometry(w,h,d,sx,sy,sz),p=geo.attributes.position;
   for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const edge=(Math.abs(x)>w/2-.001)+(Math.abs(y)>h/2-.001)+(Math.abs(z)>d/2-.001);
    const k=edge>1?amt:amt*.35;
    p.setXYZ(i,x+(noise(x,y,z)-.5)*k,y+(noise(z,x,y)-.5)*k*.6,z+(noise(y,z,x)-.5)*k);}
   return geo;};
  const feet=[-1,1].map(s=>({x:side[0]*s*.055-fwd[0]*.01,z:side[1]*s*.055-fwd[1]*.01}));
  const inSole=(x,z)=>feet.some(f=>{const dx=x-f.x,dz=z-f.z,u=dx*fwd[0]+dz*fwd[1],v=dx*side[0]+dz*side[1];return (u/.068)**2+(v/.036)**2<1;});
  const crackLine=(x,z)=>{const u=x*side[0]+z*side[1],v=x*fwd[0]+z*fwd[1];return Math.abs(v-.04-.018*Math.sin(u*38+seed)-.008*Math.sin(u*91));};
  const stonePaint=(c,x,y,z,nx,ny)=>{
   const h=smooth(x*2.1,z*2.3+y*3)*.5+.5,low=Math.max(0,1-y/.09);
   c.copy(weathered).lerp(grime,low*.6+(noise(x*3,y*3,z*3)-.5)*.12);
   c.lerp(moss,Math.max(0,h-.55)*1.6*(.4+low));
   if(ny>.8&&y>TOP-.004){
    if(inSole(x,z))c.copy(fresh).lerp(inner,noise(x,0,z)*.4);
    else if(crackLine(x,z)<.004)c.copy(crackC);
    else c.lerp(dustC,.18);
   }
   if(ny<-.5)c.multiplyScalar(.45);
  };
  const parts=[];
  // Base slab, dado and cap: chipped blocks, the cap with one corner sheared away.
  parts.push(bake(chipBox(.5,.05,.5,10,2,10,.012),stonePaint,{y:.022}));
  parts.push(bake(chipBox(.36,.11,.36,8,4,8,.01),stonePaint,{y:.1}));
  const cap=chipBox(.42,.034,.42,28,2,28,.008);
  {const p=cap.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),k=x*cx+z*cz-.27;
   if(k>0){p.setX(i,x-cx*k/2);p.setZ(i,z-cz*k/2);p.setY(i,p.getY(i)-k*.25);}}}
  cap.computeVertexNormals();
  const capPaint=(c,x,y,z,nx,ny,nz)=>{stonePaint(c,x,y,z,nx,ny);if(x*cx+z*cz>.255&&ny<.95)c.copy(fresh).lerp(weathered,noise(x,y,z)*.35);};
  parts.push(bake(cap,capPaint,{y:TOP-.017}));
  // The crack, as a thin dark strip lying on the cap so it reads at play zoom.
  {const v=[],N=20;
   for(let i=0;i<N;i++){
    const at=(t)=>{const u=-.2+.4*t,off=.04+.018*Math.sin(u*38+seed)+.008*Math.sin(u*91);return [side[0]*u+fwd[0]*off,side[1]*u+fwd[1]*off];};
    const [x0,z0]=at(i/N),[x1,z1]=at((i+1)/N),w=.0045*(1-Math.abs(i/N-.5)*1.2)+.001;
    const A=[x0-fwd[0]*w,TOP+.0012,z0-fwd[1]*w],B=[x0+fwd[0]*w,TOP+.0012,z0+fwd[1]*w],P=[x1-fwd[0]*w,TOP+.0012,z1-fwd[1]*w],Q=[x1+fwd[0]*w,TOP+.0012,z1+fwd[1]*w];
    v.push(...A,...B,...P,...P,...B,...Q);
   }
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.computeVertexNormals();
   parts.push(bake(geo,(c)=>c.copy(crackC)));}
  // Collars: jagged stone teeth round each sole, splayed outward where the ankles broke free.
  for(const [fi,f] of feet.entries())for(let k=0;k<9;k++){
   const a=k/9*Math.PI*2+rand(fi*20+k+600)*.4,u=Math.cos(a)*.072,v=Math.sin(a)*.04;
   const x=f.x+fwd[0]*u+side[0]*v,z=f.z+fwd[1]*u+side[1]*v,h=.03+rand(fi*20+k+620)*.045,out=Math.atan2(z-f.z,x-f.x);
   const tooth=new THREE.ConeGeometry(.016+rand(fi*20+k+640)*.008,h,4,1);tooth.translate(0,h/2,0);
   const tilt=new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(-Math.sin(out),0,Math.cos(out)),-(.25+rand(fi*20+k+660)*.45));
   tooth.applyMatrix4(tilt);
   parts.push(bake(tooth,(c,px,py,pz,nx,ny,nz)=>{
    const t=(py-TOP)/h;c.copy(weathered).lerp(grime,.25);
    if((nx*(f.x-px)+nz*(f.z-pz))>0)c.copy(inner).lerp(fresh,t);   // the broken inner faces are pale
    c.lerp(fresh,Math.max(0,t-.6)*.8);
   },{x,y:TOP-.002,z,ry:rand(fi*20+k+680)*3}));
  }
  // Shards of its skin: curved stone shells, pale inside, grey outside.
  const shard=(r,phi,theta,o)=>{const geo=new THREE.SphereGeometry(r,8,5,0,phi,.3,theta);
   const b=bake(geo,(c,x,y,z,nx,ny,nz)=>{const lx=x-o.x,ly=y-o.y,lz=z-o.z;const outside=nx*lx+ny*ly+nz*lz>0;
    c.copy(outside?weathered:inner).lerp(outside?grime:fresh,noise(x*5,y*5,z*5)*.4);},o);
   b.computeBoundingBox();b.translate(0,o.y-b.boundingBox.min.y-.004,0);parts.push(b);};   // rest its lowest edge on the surface
  for(let i=0;i<7;i++){
   const onCap=i<3,a=rand(i+700)*Math.PI*2,r=onCap?.08+rand(i+710)*.08:.28+rand(i+710)*.1;
   let x=Math.cos(a)*r,z=Math.sin(a)*r;
   if(!onCap&&Math.abs(x)<.27&&Math.abs(z)<.27){const s=.27/Math.max(Math.abs(x),Math.abs(z));x*=s;z*=s;}
   if(onCap&&inSole(x,z)){x*=-.6;z*=-.6;}
   shard(.04+rand(i+720)*.03,1+rand(i+730)*.9,.6+rand(i+740)*.5,{x,y:onCap?TOP:0,z,rx:Math.PI*(.85+rand(i+750)*.3),ry:rand(i+760)*6.28,rz:(rand(i+770)-.5)*.6});
  }
  // Grit knocked off the plinth.
  for(let i=0;i<12;i++){
   const a=rand(i+800)*Math.PI*2,r=.27+rand(i+810)*.14,s=.006+rand(i+820)*.01;
   parts.push(bake(new THREE.DodecahedronGeometry(s,0),(c,px,py,pz,nx,ny)=>c.copy(weathered).multiplyScalar(ny>.4?1.1:.7),
    {x:Math.max(-.46,Math.min(.46,Math.cos(a)*r)),y:s*.4,z:Math.max(-.46,Math.min(.46,Math.sin(a)*r)),rx:rand(i+830)*3,ry:rand(i+840)*3,sy:.65}));
  }
  // Floor: a skirt of pale dust round the base, thinning outward, and the trail of clawed prints.
  const flat=[];
  const skirt=new THREE.PlaneGeometry(.78,.78,16,16);skirt.rotateX(-Math.PI/2);
  {const p=skirt.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,.0015);}
  flat.push(bake(skirt,(c,x,y,z)=>{const d=Math.max(Math.abs(x),Math.abs(z))-.25;c.copy(dustC).lerp(C(0x4a4844),Math.min(1,Math.max(0,d)/.14+(noise(x,0,z)-.5)*.3));}));
  const print=(px,pz,ang,mirror,fade)=>{
   const pieces=[];
   const sole=new THREE.Shape();for(let k=0;k<=14;k++){const t=k/14*Math.PI*2;const x=Math.cos(t)*.024,y=Math.sin(t)*.015;(k?sole.lineTo(x,y):sole.moveTo(x,y));}
   pieces.push(new THREE.ShapeGeometry(sole));
   for(const t of [-.5,0,.5]){const toe=new THREE.Shape(),bx=.02,a=t*mirror;
    const ex=bx+Math.cos(a)*.042,ey=Math.sin(a)*.042,nx=-Math.sin(a)*.006,ny=Math.cos(a)*.006;
    toe.moveTo(bx+nx,ny);toe.lineTo(ex,ey);toe.lineTo(bx-nx,-ny);pieces.push(new THREE.ShapeGeometry(toe));}
   for(const geo of pieces){geo.rotateX(-Math.PI/2);geo.rotateY(-ang);geo.translate(px,.003,pz);
    flat.push(bake(geo,(c,x,y,z)=>c.copy(fresh).lerp(dustC,fade+(noise(x*7,0,z*7)-.5)*.2)));}
  };
  for(let i=0;i<3;i++){
   const d=.36+i*.095,s=(i%2?1:-1)*.035;
   print(fwd[0]*d+side[0]*s,fwd[1]*d+side[1]*s,heading,i%2?1:-1,.15+i*.25);
  }
  const flatGeo=mergeGeometries(flat),partGeo=mergeGeometries(parts);
  for(const p of [...flat,...parts])p.dispose();
  const ground=add(flatGeo,mat({color:0xffffff,vertexColors:true,roughness:1}));ground.castShadow=false;ground.name='statue-dust';
  add(partGeo,mat({color:0xffffff,vertexColors:true,roughness:.92,side:THREE.DoubleSide})).name='statue-plinth';
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
  // Fire trap: a maw in the floor. A heat-warped iron collar ringed with outward-bent spikes
  // holds a sagging, half-broken grate over a glowing shaft of coals. Around it a jagged
  // scorch burst is split by molten cracks, and the charred skull and bones of the last one
  // caught lie at its edge. Four merged, vertex-coloured meshes: the scorch (no shadow), the
  // iron, the char, and the unlit glow, which stays bright in the dark like the embers do.
  const up=new THREE.Vector3(0,1,0);
  const noise=(x,z)=>{const s=Math.sin(x*127.1+z*311.7+seed*7.3)*43758.5453;return s-Math.floor(s);};
  const hot=new THREE.Color(0xffd27a),orange=new THREE.Color(0xff5a10),red=new THREE.Color(0x7a1004);
  const soot=new THREE.Color(0x0b0908),burnt=new THREE.Color(0x3a2a1f);
  // A flat quad strip or fan on the floor, built directly as triangles with an upward normal.
  const flatGeo=(tris,colors,size)=>{const g2=new THREE.BufferGeometry();
   g2.setAttribute('position',new THREE.Float32BufferAttribute(tris,3));
   g2.setAttribute('normal',new THREE.Float32BufferAttribute(tris.map((_,i)=>i%3===1?1:0),3));
   g2.setAttribute('color',new THREE.Float32BufferAttribute(colors,size));return g2;};
  // Scorch burst: rings out to a rim of long and short flame tongues, soot-black at the heart
  // and fading (vertex alpha) into the floor at the tips.
  const N=44,K=6,reach=[];
  for(let i=0;i<N;i++)reach.push(Math.min(.45,.25+(i%2?.04:.12)*rand(i+500)+(i%4===0?.08:0)));
  const sp=[],sc=[],c=new THREE.Color();
  const scorchAt=(k,i)=>{const a=i/N*Math.PI*2,r=reach[i%N]*k/K,x=Math.cos(a)*r,z=Math.sin(a)*r,t=k/K;
   c.copy(soot).lerp(burnt,Math.max(0,t-.45)/.55).lerp(soot,.3*noise(x*9,z*9));
   sp.push(x,.003,z);sc.push(c.r,c.g,c.b,Math.min(1,1.15-t*t*1.1)*(.8+.2*noise(z*13,x*13)));};
  for(let k=0;k<K;k++)for(let i=0;i<N;i++){scorchAt(k,i);scorchAt(k+1,i+1);scorchAt(k+1,i);scorchAt(k,i);scorchAt(k,i+1);scorchAt(k+1,i+1);}
  const scorchMesh=add(flatGeo(sp,sc,4),mat({color:0xffffff,vertexColors:true,roughness:1,transparent:true,depthWrite:false}));
  scorchMesh.castShadow=false;scorchMesh.name='scorch';
  // Glow: the coal bed seen through the grate, hot yellow at the centre to dull red at the wall.
  const glow=[];
  const bed=new THREE.CircleGeometry(.15,32,0,Math.PI*2);bed.rotateX(-Math.PI/2);
  glow.push(bake(bed,(col,x,y,z)=>{const r=Math.hypot(x,z)/.15;col.copy(hot).lerp(orange,Math.min(1,r*1.3)).lerp(red,Math.max(0,r-.55)/.45).lerp(red,.35*noise(x*40,z*40));},{y:.006}));
  // Molten cracks: jagged, forking lines out of the collar, tapering and cooling toward the tips.
  const crack=(a0,r0,len,w0,salt)=>{const tris=[],cols=[];let a=a0,r=r0,px=Math.cos(a)*r,pz=Math.sin(a)*r;
   const steps=6;
   for(let s=0;s<steps;s++){
    const t0=s/steps,t1=(s+1)/steps;a+=(rand(salt+s)-.5)*.5/Math.max(r,.2);r+=len/steps;
    const nx=Math.cos(a)*r,nz=Math.sin(a)*r,dx=nx-px,dz=nz-pz,l=Math.hypot(dx,dz)||1,ox=-dz/l,oz=dx/l;
    const w0s=w0*(1-t0),w1s=w0*(1-t1)+.0008;
    const q=[[px+ox*w0s,pz+oz*w0s,t0],[px-ox*w0s,pz-oz*w0s,t0],[nx+ox*w1s,nz+oz*w1s,t1],[nx-ox*w1s,nz-oz*w1s,t1]];
    for(const j of [0,2,1,1,2,3]){const [x,z,t]=q[j];c.copy(orange).lerp(red,t).lerp(hot,Math.max(0,.25-t)*2);tris.push(x,.005,z);cols.push(c.r,c.g,c.b);}
    px=nx;pz=nz;
   }
   glow.push(flatGeo(tris,cols,3));};
  for(let i=0;i<6;i++){
   const a=i/6*Math.PI*2+rand(i+520)*.6,len=.1+rand(i+530)*.12;
   crack(a,.19,Math.min(len,.4-.19),.011,600+i*10);
   if(rand(i+540)>.45)crack(a+(rand(i+550)>.5?.25:-.25),.25,Math.min(.08,.42-.25),.006,700+i*10);
  }
  // Coals heaped in the shaft: the bright ones glow, the rest are black clinker.
  const char=[];
  for(let i=0;i<14;i++){
   const a=rand(i+560)*Math.PI*2,r=rand(i+570)*.12,s=.012+rand(i+580)*.014,lit=i%3!==0;
   const geo=new THREE.DodecahedronGeometry(s,0),at={x:Math.cos(a)*r,y:.008+s*.4,z:Math.sin(a)*r,rx:rand(i+590)*3,ry:rand(i+600)*3,sy:.6};
   if(lit)glow.push(bake(geo,(col,x,y,z)=>{col.copy(y>at.y?hot:orange).lerp(red,.4*noise(x*60,z*60));},at));
   else char.push(bake(geo,(col,x,y,z)=>col.copy(soot).lerp(burnt,.4*noise(x*50,z*50)),at));
  }
  // Iron: a jagged octagonal collar, blued and rust-scaled by the heat toward its inner lip.
  const ironParts=[];
  const heat=(col,x,y,z)=>{const r=Math.hypot(x,z),n=noise(x*70+y*30,z*70);
   col.set(0x2a2624).lerp(new THREE.Color(0x151212),.5*n);
   if(r<.17)col.lerp(new THREE.Color(0x5a3a5e),Math.min(1,(.17-r)/.03)*.5);// heat-blued lip
   if(r<.155)col.lerp(new THREE.Color(0x8a3a14),.55);// glowing-hot rim
   if(n>.78)col.lerp(new THREE.Color(0x6e3a1e),.6);};// rust scale
  const collar=new THREE.Shape();
  for(let i=0;i<8;i++){const a=(i+.5)/8*Math.PI*2,r=.2+(rand(i+620)-.5)*.02;i?collar.lineTo(Math.cos(a)*r,Math.sin(a)*r):collar.moveTo(Math.cos(a)*r,Math.sin(a)*r);
   const m=(i+1)/8*Math.PI*2,rm=.185+(rand(i+630)-.5)*.02;collar.lineTo(Math.cos(m)*rm,Math.sin(m)*rm);}
  collar.closePath();
  collar.holes.push(new THREE.Path().absarc(0,0,.145,0,Math.PI*2,true));
  const collarGeo=new THREE.ExtrudeGeometry(collar,{depth:.03,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,curveSegments:24});
  collarGeo.rotateX(-Math.PI/2);
  ironParts.push(bake(collarGeo,heat,{y:.004}));
  // Spikes at the corners, bent outward and a little ragged, like teeth round a mouth.
  for(let i=0;i<8;i++){
   const a=(i+.5)/8*Math.PI*2,h=.05+rand(i+640)*.03,r=.19,dir=new THREE.Vector3(Math.cos(a)*.55,1,Math.sin(a)*.55).normalize();
   const cone=new THREE.ConeGeometry(.014,h,5);cone.translate(0,h/2,0);
   const q=new THREE.Quaternion().setFromUnitVectors(up,dir),e=new THREE.Euler().setFromQuaternion(q);
   ironParts.push(bake(cone,heat,{x:Math.cos(a)*r,y:.03,z:Math.sin(a)*r,rx:e.x,ry:e.y,rz:e.z}));
   ironParts.push(bake(new THREE.CylinderGeometry(.009,.009,.008,6),heat,{x:Math.cos(a+.39)*.175,y:.038,z:Math.sin(a+.39)*.175}));
  }
  // The grate: bars sagging into the heat, the middle one snapped and its halves bent down.
  for(let i=-2;i<=2;i++){
   const z=i*.052,half=Math.sqrt(.155*.155-z*z);
   const barPaint=(col,x,y,zz)=>{heat(col,x,y,zz);col.lerp(new THREE.Color(0x9a3a10),Math.max(0,1-Math.abs(x)/half)*.5);};
   if(i===0){
    for(const s of [-1,1]){const b=new THREE.BoxGeometry(half*.75,.014,.016);b.translate(s*half*.375,0,0);
     ironParts.push(bake(b,barPaint,{x:s*half,y:.034,z,rz:s*.55}));}
   }else{
    // Two segments per bar so it dips in the middle.
    for(const s of [-1,1]){const b=new THREE.BoxGeometry(half+.01,.014,.016);b.translate(s*(half+.01)/2,0,0);
     ironParts.push(bake(b,barPaint,{x:0,y:.026,z,rz:-s*.09*(1-Math.abs(i)*.3)}));}
   }
  }
  add(mergeGeometries(ironParts),mat({color:0xffffff,vertexColors:true,metalness:.6,roughness:.62})).name='vent';
  ironParts.forEach(p=>p.dispose());
  // The victim: a charred skull fallen on its side facing the vent, its jaw nearby, a long bone
  // and a few ribs. Blackened toward the heat, ash-pale on the far side.
  const sa=rand(660)*Math.PI*2,sr=.3,sx=Math.cos(sa)*sr,sz=Math.sin(sa)*sr,face=Math.atan2(-sx,-sz);
  const charPaint=(col,x,y,z)=>{const r=Math.hypot(x,z);col.copy(soot).lerp(new THREE.Color(0xb3a996),Math.min(1,Math.min(1,Math.max(0,(r-.2)/.12))*(.6+.4*noise(x*80,z*80))+y*2));};
  const skull=new THREE.Object3D();skull.position.set(sx,.038,sz);skull.rotation.set(0,face,.35);skull.updateMatrix();
  const piece=(geo,{x=0,y=0,z=0,rx=0,ry=0,rz=0,sx:a=1,sy:b=1,sz:cc=1},paint=charPaint)=>{
   const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.scale.set(a,b,cc);o.updateMatrix();
   const n=geo.index?geo.toNonIndexed():geo;if(n!==geo)geo.dispose();n.applyMatrix4(o.matrix);n.applyMatrix4(skull.matrix);
   return bake(n,paint);};
  char.push(piece(new THREE.SphereGeometry(.042,14,10),{z:-.012,sx:.9,sy:.85,sz:1.1}));// cranium
  char.push(piece(new THREE.BoxGeometry(.05,.034,.04),{y:-.018,z:.03}));// face
  // Sockets and the nasal hole, painted as black recesses on the face.
  for(const [x,y,r] of [[-.013,-.006,.011],[.013,-.006,.011],[0,-.024,.006]])
   char.push(piece(new THREE.SphereGeometry(r,8,6),{x,y,z:.047,sz:.5},col=>col.copy(soot).multiplyScalar(.4)));
  for(let i=0;i<5;i++)char.push(piece(new THREE.BoxGeometry(.006,.008,.006),{x:(i-2)*.008,y:-.037,z:.048},col=>col.set(0x8a8276)));// upper teeth
  const bones=(geo,at)=>char.push(bake(geo,charPaint,at));
  const ja=sa+.55,jx=Math.cos(ja)*.33,jz=Math.sin(ja)*.33;
  bones(new THREE.TorusGeometry(.028,.006,5,12,Math.PI),{x:jx,y:.006,z:jz,rx:-Math.PI/2,ry:0,rz:ja+1});// jaw
  const la=sa-.6,lx=Math.cos(la)*.34,lz=Math.sin(la)*.34,lr=la+Math.PI/2+.3;
  // A long bone lying roughly across the burst, with a knuckle at each end.
  const shaft=new THREE.CylinderGeometry(.008,.007,.15,7);shaft.rotateX(Math.PI/2);shaft.rotateY(-lr);
  bones(shaft,{x:lx,y:.01,z:lz});
  for(const s of [-1,1]){const k=new THREE.SphereGeometry(.013,8,6);k.scale(1,.8,1.2);k.translate(0,0,s*.075);k.rotateY(-lr);k.translate(lx,.012,lz);char.push(bake(k,charPaint));}
  for(let i=0;i<3;i++){const ra=sa+1.05+i*.12;
   bones(new THREE.TorusGeometry(.055-i*.006,.004,4,14,Math.PI*.75),{x:Math.cos(ra)*.36,y:.005,z:Math.sin(ra)*.36,rx:-Math.PI/2,rz:ra+.4+i*.15});}
  add(mergeGeometries(char),mat({color:0xffffff,vertexColors:true,roughness:.92})).name='charred-remains';
  char.forEach(p=>p.dispose());
  const glowMat=new THREE.MeshBasicMaterial({vertexColors:true});materials.push(glowMat);
  const glowMesh=add(mergeGeometries(glow),glowMat);
  glowMesh.castShadow=false;glowMesh.name='coal-glow';
  glow.forEach(p=>p.dispose());
  // The coals breathe and spit sparks (fire-trap-fx.js).
  g.userData.animate=fireTrapAnimator(g,seed);
 }else if(kind==='antimagic'){
  // Anti-magic field: a sigil turned inside out. Where the other magical traps burn, this one
  // has been drained dead: a glassy black pool of floor with a jagged, ash-bleached rim, grooves
  // spiralling down into its heart as if the colour was sucked away along them, a band of runes
  // each struck through, and the black shards of whatever focus once lay at the centre. A broken
  // hoop of cold iron is staked round it with bent, hand-forged nails. Nothing glows.
  // Three merged, vertex-coloured meshes: the stain and the etching (no shadow), and the iron
  // and glass.
  const noise=(x,z)=>{const s=Math.sin(x*127.1+z*311.7+seed*7.3)*43758.5453;return s-Math.floor(s);};
  // Flat triangles on the floor, wound to face up; a vertex is [x,z,[r,g,b(,a)]].
  const sheet=(size)=>{const p=[],c=[];return{
   tri(a,b,d,y){if((b[1]-a[1])*(d[0]-a[0])-(b[0]-a[0])*(d[1]-a[1])<0)[b,d]=[d,b];
    for(const v of [a,b,d]){p.push(v[0],y,v[1]);for(let k=0;k<size;k++)c.push(Math.max(0,Math.min(1,v[2][k])));}},
   geo(){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    geo.setAttribute('normal',new THREE.Float32BufferAttribute(p.map((_,i)=>i%3===1?1:0),3));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(c,size));return geo;}};};
  const rgb=(hex)=>{const c=new THREE.Color(hex);return [c.r,c.g,c.b];};
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  // The stain: glassy black at the heart, an ash-pale band where the colour was bled out, then a
  // jagged edge fading (vertex alpha) into the floor.
  const pool=rgb(0x040306),sheen=rgb(0x16121c),ash=rgb(0x77737c);
  const N=56,K=8,reach=[],stain=sheet(4);
  for(let i=0;i<N;i++)reach.push(Math.min(.47,.38+.04*rand(i+1300)+(i%2?.035*rand(i+1310):0)));
  const sv=(k,i)=>{const a=i/N*Math.PI*2,t=k/K,r=reach[i%N]*t,x=Math.cos(a)*r,z=Math.sin(a)*r;
   const band=Math.max(0,1-Math.abs(t-.86)/.1),n=noise(x*13,z*13);
   const col=mix(mix(pool,sheen,n*.6*(1-t)),ash,band*(.45+.25*n));
   return [x,z,[...col,(t<.8?.95:Math.max(0,.95*(1-(t-.8)/.2)))*(.8+.2*noise(z*9,x*9))]];};
  for(let k=0;k<K;k++)for(let i=0;i<N;i++){stain.tri(sv(k,i),sv(k+1,i+1),sv(k+1,i),.003);stain.tri(sv(k,i),sv(k,i+1),sv(k+1,i+1),.003);}
  const stainMesh=add(stain.geo(),mat({color:0xffffff,vertexColors:true,roughness:.22,metalness:.3,transparent:true,depthWrite:false}));
  stainMesh.castShadow=false;stainMesh.name='null-stain';
  // The etching: grooves cut into the glassy floor, pale ash along the cut and dark at its lips.
  const pale=rgb(0x9a96a2),lip=rgb(0x1b1720),etch=sheet(3);
  const groove=(pts,width,salt=0)=>{
   const n=pts.length,L=[],M=[],R=[];
   for(let i=0;i<n;i++){
    const p=pts[i],q=pts[Math.min(n-1,i+1)],o=pts[Math.max(0,i-1)];
    let dx=q[0]-o[0],dz=q[1]-o[1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
    const w=width(i/(n-1))*(.8+.4*rand(salt+i));
    L.push([p[0]-dz*w,p[1]+dx*w,lip]);M.push([p[0],p[1],pale]);R.push([p[0]+dz*w,p[1]-dx*w,lip]);
   }
   for(let i=0;i<n-1;i++)for(const [A,B] of [[L,M],[M,R]]){etch.tri(A[i],A[i+1],B[i],.005);etch.tri(B[i],A[i+1],B[i+1],.005);}};
  // Spiral arms winding in to the centre, thinning as they go, like water down a drain.
  const ARMS=7,R0=.33;
  for(let j=0;j<ARMS;j++){const a0=j/ARMS*Math.PI*2+rand(j+1320)*.3,pts=[];
   for(let k=0;k<=28;k++){const th=k/28*2.7,r=R0*Math.exp(-th*.95)+(rand(j*31+k+1330)-.5)*.006;pts.push([Math.cos(a0+th)*r,Math.sin(a0+th)*r]);}
   groove(pts,t=>.0065*(1-.8*t),1340+j*29);}
  // A broken inner ring, then a band of runes, each one struck through with a slash.
  for(let a=rand(1400)*Math.PI*2,end=a+Math.PI*2;a<end-.2;){
   const span=Math.min(end-a,.8+rand(1410+a*7)*1.2),pts=[],n=Math.ceil(span/.08);
   for(let i=0;i<=n;i++){const b=a+span*i/n,rr=.348+(rand(1420+i*3+a)-.5)*.008;pts.push([Math.cos(b)*rr,Math.sin(b)*rr]);}
   groove(pts,()=>.004,1430+a*11);a+=span+.08+rand(1440+a*5)*.1;}
  const GLYPHS=16;
  for(let i=0;i<GLYPHS;i++){
   const a=(i+.5)/GLYPHS*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);
   const at=(u,v)=>{const r=.385+v;return [ca*r-sa*u,sa*r+ca*u];};
   const P=(k)=>at(((k%3)-1)*.009,(Math.floor(k/3)-1)*.011);
   for(let s=0;s<2+(rand(i+1450)>.5?1:0);s++){
    const g0=Math.floor(rand(i*7+s+1460)*9);let g1=Math.floor(rand(i*7+s+1470)*9);if(g1===g0)g1=(g0+4)%9;
    const [x0,z0]=P(g0),[x1,z1]=P(g1);groove([[x0,z0],[(x0+x1)/2,(z0+z1)/2],[x1,z1]],()=>.003,1480+i*5+s);}
   const sl=rand(i+1490)>.5?1:-1,[x0,z0]=at(-.016*sl,-.017),[x1,z1]=at(.016*sl,.017);
   groove([[x0,z0],[(x0+x1)/2,(z0+z1)/2],[x1,z1]],t=>.0042*Math.max(.15,Math.sin(Math.PI*t)),1500+i);
  }
  const etchMesh=add(etch.geo(),mat({color:0xffffff,vertexColors:true,roughness:.85}));
  etchMesh.castShadow=false;etchMesh.name='null-etching';
  // Cold iron: square forged nails driven in round the rim, leaning, some bent over, with a flat
  // hoop run through them that has snapped at one point.
  const iron=new THREE.Color(0x2a2a2e),rust=new THREE.Color(0x5e3820),glass=new THREE.Color(0x060509),glint=new THREE.Color(0x3a3247);
  const paintIron=(col,x,y,z)=>col.copy(iron).lerp(rust,Math.min(1,.55*noise(x*60+y*90,z*60)+(y<.012?.35:0)));
  const solid=[],NAILS=9;
  for(let i=0;i<NAILS;i++){
   const a=i/NAILS*Math.PI*2+(rand(i+1510)-.5)*.25,r=.425+(rand(i+1520)-.5)*.015,h=.05+rand(i+1530)*.04;
   const bent=rand(i+1540)>.6,lo=bent?h*.55:h,hi=h-lo;
   const parts=[new THREE.CylinderGeometry(.0055,.0022,lo,4).translate(0,lo/2-.012,0)];
   const head=new THREE.BoxGeometry(.02,.006,.02).translate(0,hi+.002,0),top=[head];
   if(bent)top.push(new THREE.CylinderGeometry(.0055,.0055,hi,4).translate(0,hi/2,0));
   const bend=bent?(rand(i+1550)>.5?1:-1)*(.9+rand(i+1560)*.5):0;
   for(const p of top){p.rotateZ(bend);p.translate(0,lo-.012,0);parts.push(p);}
   const nail=mergeGeometries(parts.map(p=>{const n=p.toNonIndexed();p.dispose();return n;}));
   solid.push(bake(nail,paintIron,{x:Math.cos(a)*r,z:Math.sin(a)*r,ry:rand(i+1570)*3,rx:(rand(i+1580)-.5)*.5,rz:(rand(i+1590)-.5)*.5}));
  }
  solid.push(bake(new THREE.TorusGeometry(.425,.007,4,56,Math.PI*2-.5),paintIron,{y:.003,rx:-Math.PI/2,rz:rand(1600)*Math.PI*2,sz:.45}));
  // The focus, smashed: splinters of black glass heaped in the middle, a few flung along the grooves.
  const paintGlass=(col,x,y,z,nx,ny)=>col.copy(glass).lerp(glint,Math.max(0,ny)*.8);
  for(let i=0;i<11;i++){
   const near=i<7,a=rand(i+1610)*Math.PI*2,r=near?rand(i+1620)*.05:.09+rand(i+1630)*.14,s=near?.012+rand(i+1640)*.012:.005+rand(i+1650)*.004;
   solid.push(bake(new THREE.TetrahedronGeometry(s,0),paintGlass,{x:Math.cos(a)*r,y:s*.35,z:Math.sin(a)*r,sy:near?1.7:.6,rx:rand(i+1660)*.6,ry:rand(i+1670)*6,rz:rand(i+1680)*.6}));
  }
  const solidMesh=add(mergeGeometries(solid),mat({color:0xffffff,vertexColors:true,roughness:.38,metalness:.55}));
  solidMesh.name='null-iron';solid.forEach(p=>p.dispose());
 }else if(RUNES[kind]){
  // Magical traps (teleport, magic / nameless anti-magic or sleeping gas, polymorph, ice): a sigil
  // gouged into the floor and still burning in the trap's colour. Broken, scratched rings
  // hold a band of angular runes; a star of tapered slashes overshoots them, and a slit-pupilled
  // eye stares up from the middle. A burn stain fades out under it. Black candle stubs, guttered
  // and dripping, stand at the star's points with flames of the same cold colour (the ice trap
  // grows jagged frost shards there instead). Three merged, vertex-coloured meshes: the stain
  // (no shadow), the unlit glow, and the wax (or frost).
  const [color,glowHex]=RUNES[kind];
  const noise=(x,z)=>{const s=Math.sin(x*127.1+z*311.7+seed*7.3)*43758.5453;return s-Math.floor(s);};
  const edge=new THREE.Color(glowHex),hot=new THREE.Color(color).lerp(new THREE.Color(0xffffff),.45);
  const soot=new THREE.Color(0x0c0a0c),tint=new THREE.Color(glowHex).multiplyScalar(.18).lerp(soot,.4);
  // Flat triangles on the floor, wound to face up, with an upward normal.
  const flatGeo=(tris,cols,size)=>{
   for(let i=0;i<tris.length;i+=9){const ax=tris[i],az=tris[i+2],bx=tris[i+3],bz=tris[i+5],cx=tris[i+6],cz=tris[i+8];
    if((bz-az)*(cx-ax)-(bx-ax)*(cz-az)<0)for(let k=0;k<3;k++){const j=i+3+k,l=i+6+k;[tris[j],tris[l]]=[tris[l],tris[j]];
     const cj=(i/3+1)*size+k,cl=(i/3+2)*size+k;[cols[cj],cols[cl]]=[cols[cl],cols[cj]];if(size===4&&k===2){const aj=cj+1,al=cl+1;[cols[aj],cols[al]]=[cols[al],cols[aj]];}}}
   const geo=new THREE.BufferGeometry();
   geo.setAttribute('position',new THREE.Float32BufferAttribute(tris,3));
   geo.setAttribute('normal',new THREE.Float32BufferAttribute(tris.map((_,i)=>i%3===1?1:0),3));
   geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,size));return geo;};
  // Glowing strokes: a polyline cut into the floor, hot along its centre and the deep colour at
  // its edges. `taper` points both ends, like a slash; otherwise the width only wavers.
  const gp=[],gc=[],GY=.005;
  const vert=(x,z,c)=>{gp.push(x,GY,z);gc.push(Math.min(1,c.r),Math.min(1,c.g),Math.min(1,c.b));};
  const stroke=(pts,w0,taper,salt=0)=>{
   const n=pts.length,L=[],M=[],R=[];
   for(let i=0;i<n;i++){
    const p=pts[i],q=pts[Math.min(n-1,i+1)],o=pts[Math.max(0,i-1)];
    let dx=q[0]-o[0],dz=q[1]-o[1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
    const t=i/(n-1),w=w0*(taper?Math.max(.08,Math.pow(Math.sin(Math.PI*t),.7)):1)*(.75+.5*rand(salt+i));
    L.push([p[0]-dz*w,p[1]+dx*w]);M.push(p);R.push([p[0]+dz*w,p[1]-dx*w]);
   }
   for(let i=0;i<n-1;i++)for(const [A,B] of [[L,M],[M,R]]){
    const quad=[[A[i],A===M],[A[i+1],A===M],[B[i],B===M],[B[i],B===M],[A[i+1],A===M],[B[i+1],B===M]];
    for(const [[x,z],mid] of quad)vert(x,z,mid?hot:edge);
   }};
  // Rings: broken arcs with a scratched, wavering radius.
  const ring=(r,w,salt)=>{
   let a=rand(salt)*Math.PI*2;const end=a+Math.PI*2;
   while(a<end-.15){
    const span=Math.min(end-a,.9+rand(salt+a*7)*1.5),pts=[],n=Math.ceil(span/.08);
    for(let i=0;i<=n;i++){const b=a+span*i/n,rr=r+(rand(salt+i*3+a)-.5)*.007;pts.push([Math.cos(b)*rr,Math.sin(b)*rr]);}
    stroke(pts,w,false,salt+a*11);a+=span+.06+rand(salt+a*5)*.08;
   }};
  ring(.372,.0075,900);ring(.312,.0045,940);
  // Star: tapered slashes between the points, kinked a little and run past the inner ring.
  const points=kind==='polymorph'?7:kind==='ice'?6:5,step=2,R0=.318;
  const tip=(i)=>{const a=i/points*Math.PI*2+Math.PI/2;return [Math.cos(a)*R0,Math.sin(a)*R0];};
  for(let i=0;i<points;i++){
   const [ax,az]=tip(i),[bx,bz]=tip(i+step),pts=[],nx=-(bz-az),nz=bx-ax,l=Math.hypot(nx,nz);
   for(let k=0;k<=8;k++){const t=-.03+k/8*1.06,j=k%8?(rand(i*13+k+960)-.5)*.012:0;pts.push([ax+(bx-ax)*t+nx/l*j,az+(bz-az)*t+nz/l*j]);}
   stroke(pts,.0075,true,980+i*9);
  }
  // Runes in the band between the rings: two or three angular strokes on a 3x3 grid each.
  const glyphs=points*3;
  for(let i=0;i<glyphs;i++){
   const a=(i+.5)/glyphs*Math.PI*2+Math.PI/2,ca=Math.cos(a),sa=Math.sin(a);
   const at=(u,v)=>{const r=.342+v;return [ca*r-sa*u,sa*r+ca*u];};
   const strokes=2+(rand(i+1000)>.55?1:0);
   for(let s=0;s<strokes;s++){
    const g0=Math.floor(rand(i*7+s+1010)*9);let g1=Math.floor(rand(i*7+s+1030)*9);if(g1===g0)g1=(g0+4)%9;
    const P=(k)=>at(((k%3)-1)*.0085,(Math.floor(k/3)-1)*.011);
    const [x0,z0]=P(g0),[x1,z1]=P(g1);
    stroke([[x0,z0],[(x0+x1)/2,(z0+z1)/2],[x1,z1]],.0032,false,1050+i*5+s);
   }
  }
  // The eye: two curved lids, and an iris split by a dark slit pupil.
  const EW=.075,EH=.034,IR=.026,SW=.006;
  for(const s of [1,-1]){const pts=[];for(let k=0;k<=12;k++){const t=k/12,x=(t*2-1)*EW;pts.push([x,s*EH*(1-(x/EW)**2)]);}stroke(pts,.0055,true,1200+s);}
  for(const s of [1,-1])for(let k=0;k<10;k++){
   const z0=-IR+2*IR*k/10,z1=-IR+2*IR*(k+1)/10;
   const ox=(z)=>s*Math.sqrt(Math.max(0,IR*IR-z*z)),ix=(z)=>s*SW*(1-(z/IR)**2);
   for(const [x,z,c] of [[ix(z0),z0,hot],[ox(z0),z0,edge],[ix(z1),z1,hot],[ix(z1),z1,hot],[ox(z0),z0,edge],[ox(z1),z1,edge]])vert(x,z,c);
  }
  // Flames over the candles (or a cold spark in each frost cluster), built into the same glow.
  const stubs=[];
  for(let i=0;i<points;i++){const a=i/points*Math.PI*2+Math.PI/2+(rand(i+1100)-.5)*.12,r=.405+rand(i+1110)*.02;stubs.push({x:Math.cos(a)*r,z:Math.sin(a)*r,h:.035+rand(i+1120)*.05,s:.016+rand(i+1130)*.005});}
  const glowParts=[flatGeo(gp,gc,3)];
  if(kind!=='ice')for(const [i,c] of stubs.entries()){
   const fh=.028+rand(i+1140)*.012,lean=(rand(i+1150)-.5)*.3;
   glowParts.push(bake(new THREE.SphereGeometry(.0075,8,6),(col,x,y)=>{const t=(y-c.h-.006)/fh;col.copy(hot).lerp(edge,Math.max(0,Math.min(1,t*1.4)));},{x:c.x,y:c.h+.006+fh*.42,z:c.z,sy:fh/.015,rz:lean}));
  }
  const glowMat=new THREE.MeshBasicMaterial({vertexColors:true,color:new THREE.Color(1.35,1.35,1.35)});materials.push(glowMat);
  const glowMesh=add(mergeGeometries(glowParts),glowMat);glowMesh.castShadow=false;glowMesh.name='sigil-glow';
  glowParts.forEach(p=>p.dispose());
  // Burn stain: soot at the heart, a faint glow bleeding into it near the rings, fading out
  // (vertex alpha) to a ragged edge.
  const N=48,K=7,reach=[],sp=[],sc=[],c=new THREE.Color();
  for(let i=0;i<N;i++)reach.push(Math.min(.47,.4+.06*rand(i+1160)+(i%3===0?.02:0)));
  const at=(k,i)=>{const a=i/N*Math.PI*2,r=reach[i%N]*k/K,x=Math.cos(a)*r,z=Math.sin(a)*r,t=k/K;
   const near=Math.max(0,1-Math.min(Math.abs(r-.372),Math.abs(r-.312),Math.abs(r-.05))/.05);
   c.copy(soot).lerp(tint,near*.8).lerp(soot,.35*noise(x*11,z*11));
   sp.push(x,.003,z);sc.push(c.r,c.g,c.b,Math.min(.92,1.05-t*t)*(.75+.25*noise(z*13,x*13)));};
  for(let k=0;k<K;k++)for(let i=0;i<N;i++){at(k,i);at(k+1,i+1);at(k+1,i);at(k,i);at(k,i+1);at(k+1,i+1);}
  const stain=add(flatGeo(sp,sc,4),mat({color:0xffffff,vertexColors:true,roughness:1,transparent:true,depthWrite:false}));
  stain.castShadow=false;stain.name='sigil-stain';
  const solid=[];
  if(kind==='ice'){
   // Frost: a cluster of jagged shards at each point, leaning out, white at the tips.
   const ice=new THREE.Color(0x9fd6f0),rime=new THREE.Color(0xf2fbff);
   for(const [i,p] of stubs.entries())for(let j=0;j<3;j++){
    const h=.05+rand(i*5+j+1170)*.07,a=Math.atan2(p.z,p.x),off=(j-1)*.022;
    const x=p.x-Math.sin(a)*off,z=p.z+Math.cos(a)*off,tilt=.25+rand(i*5+j+1180)*.35;
    solid.push(bake(new THREE.ConeGeometry(.011+rand(i*5+j+1190)*.008,h,4),(col,vx,vy)=>col.copy(ice).lerp(rime,Math.min(1,vy/h*1.6)),
     {x,y:h*.42,z,rx:Math.sin(a)*tilt,rz:-Math.cos(a)*tilt,ry:rand(i*5+j+1200)*3}));
   }
  }else{
   // Candle stubs of black wax: guttered tops, drips down the side, a puddle at the foot, a wick.
   const wax=new THREE.Color(0x1d1a1c),waxHi=new THREE.Color(0x3a3436),wick=new THREE.Color(0x050404);
   const paintWax=(col,x,y,z)=>col.copy(wax).lerp(waxHi,.6*noise(x*80+y*40,z*80));
   for(const [i,p] of stubs.entries()){
    const top=new THREE.CylinderGeometry(p.s*.92,p.s,p.h,9,1);
    const pos=top.attributes.position;for(let v=0;v<pos.count;v++)if(pos.getY(v)>0){const ang=Math.atan2(pos.getZ(v),pos.getX(v));pos.setY(v,p.h/2-.006*(.5+.5*Math.sin(ang*3+i))*(1-Math.hypot(pos.getX(v),pos.getZ(v))/p.s*.2));}
    top.computeVertexNormals();
    solid.push(bake(top,paintWax,{x:p.x,y:p.h/2,z:p.z}));
    solid.push(bake(new THREE.CylinderGeometry(p.s*1.9,p.s*2.2,.006,10),paintWax,{x:p.x,y:.003,z:p.z,sx:1+rand(i+1210)*.3}));
    for(let j=0;j<2;j++){const a=rand(i*3+j+1220)*Math.PI*2,len=p.h*(.4+rand(i*3+j+1230)*.4);
     solid.push(bake(new THREE.CapsuleGeometry(.0035,len,2,5),paintWax,{x:p.x+Math.cos(a)*p.s*.98,y:p.h-.004-len/2,z:p.z+Math.sin(a)*p.s*.98}));}
    solid.push(bake(new THREE.CylinderGeometry(.0012,.0012,.012,4),(col)=>col.copy(wick),{x:p.x,y:p.h+.002,z:p.z}));
   }
  }
  const solidMat=kind==='ice'?mat({color:0xffffff,vertexColors:true,roughness:.15,metalness:.1,transparent:true,opacity:.82}):mat({color:0xffffff,vertexColors:true,roughness:.55});
  const solidMesh=add(mergeGeometries(solid),solidMat);solidMesh.name=kind==='ice'?'sigil-frost':'sigil-wax';
  solid.forEach(p=>p.dispose());
  // The sigil beats and its candle flames gutter (sigil-fx.js).
  g.userData.animate=sigilAnimator(g,seed);
 }else if(kind==='portal'){
  // Magic portal: a standing-stone arch around a swirling violet rift, over a
  // scorched rune circle. Only the portal uses bright magenta, so it gets its own model.
  const rune=mat({color:0xff66ff,emissive:0xd22cff,emissiveIntensity:1.4,roughness:.5,transparent:true,opacity:.9});
  flat(new THREE.CircleGeometry(.44,32),mat({color:0x241a24,roughness:1}),.003);
  for(const r of [.42,.35]){const ring=flat(new THREE.RingGeometry(r-.012,r,40),rune,.006);ring.material.side=THREE.DoubleSide;}
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const glyph=add(new THREE.BoxGeometry(.035,.004,.012),rune,Math.cos(a)*.385,.007,Math.sin(a)*.385);glyph.rotation.y=-a+(i%2?.6:0);glyph.castShadow=false;}
  // Arch: two jagged menhirs leaning in over the rift, their broken tops holding up a lintel
  // that has cracked through and sags in the middle, with a horned skull wedged in the crack.
  // Stone, moss, soot and bone are vertex-painted onto one flat-shaded material, so the whole
  // arch is one draw; the carved runes and the skull's eyes join the glowing rune mesh.
  const archMat=mat({color:0xffffff,vertexColors:true,roughness:.92,flatShading:true});
  const hue=(c,hex)=>c.setHex(hex);
  // A box whose corners are chipped and faces knocked uneven. The noise is keyed on the
  // undisplaced position, so the box's split edge vertices stay together and it stays closed.
  const rough=(w,h,d,sx,sy,sz,amp,salt,shape)=>{
   const geo=new THREE.BoxGeometry(w,h,d,sx,sy,sz),p=geo.attributes.position;
   for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=Math.round(x*131)*7+Math.round(y*127)*13+Math.round(z*137)*19;
    const n=[rand(salt+k)-.5,rand(salt+k+.31)-.5,rand(salt+k+.67)-.5];
    p.setXYZ(i,...(shape?shape(x,y,z,n):[x+n[0]*amp,y+n[1]*amp,z+n[2]*amp]));
   }
   geo.computeVertexNormals();return geo;
  };
  const H=.94,W=.13,D=.17,LEAN=.035,PX=.39,archParts=[];
  for(const side of [-1,1]){
   const salt=side*500+1000;
   // Tapering as it rises, the top snapped off in a slant that is high on the outer edge.
   const geo=rough(W,H,D,3,10,3,0,salt,(x,y,z,n)=>{
    const t=y/H+.5,taper=1-.32*t;let yy=y+H/2;
    if(t>.99)yy+=(x*side>0?.05:-.025)+n[1]*.06;else if(t>.01)yy+=n[1]*.012;
    return [x*taper+n[0]*.016,yy,z*taper+n[2]*.016];
   });
   archParts.push(bake(geo,(c,x,y,z,nx,ny)=>{
    const g0=rand(salt+Math.round(x*40)*3+Math.round(y*40)*5+Math.round(z*40)*7);
    hue(c,g0>.5?0x57545c:0x4a4850);
    // Soot licked up the inner face by the rift, moss creeping up from the foot and over the tops.
    if(nx*side<-.4)c.lerp(new THREE.Color(0x1d1620),Math.max(0,.75-Math.abs(y-.48)*1.4));
    if(y<.16+g0*.12||ny>.6&&g0>.45)c.lerp(new THREE.Color(0x34402a),.55+g0*.3);
   },{x:side*PX,rz:side*LEAN}));
   // A plinth stone sunk at the foot, and chips spalled off around it.
   archParts.push(bake(rough(.17,.07,.21,2,1,2,.018,salt+40),(c,x,y,z,nx,ny)=>hue(c,ny>.5?0x3c4630:0x423f46),{x:side*PX,y:.04}));
   for(let i=0;i<3;i++){const a=rand(salt+60+i)*Math.PI*2,r=.13+rand(salt+70+i)*.05,s=.016+rand(salt+80+i)*.014;
    archParts.push(bake(new THREE.DodecahedronGeometry(s,0),(c)=>hue(c,0x4d4a52),
     {x:side*PX+Math.cos(a)*r*.6,y:s*.75,z:Math.sin(a)*r,rx:rand(salt+90+i)*3,ry:rand(salt+95+i)*3,sy:.6}));}
   // Carved runes running down the inner face, burning the same violet as the floor circle.
   for(let i=0;i<4;i++){
    const y=.3+i*.14,inner=side*(PX-y*LEAN-W/2*(1-.32*y/H))-side*.006;
    for(let s=0;s<2;s++){const stroke=add(new THREE.BoxGeometry(.012,.045-s*.012,.007),rune,inner,y+(s?.008:0),(s?.012:-.004)*(i%2?1:-1));
     stroke.rotation.x=(s?-.7:.35)*(i%2?-1:1);stroke.castShadow=false;}
   }
   // Two halves of the lintel, each tipped down toward the crack between them.
   archParts.push(bake(rough(.48,.11,.19,6,2,2,0,salt+200,(x,y,z,n)=>{
    // The broken end is ragged; the outer end is squarer.
    const brk=x*-side>.2;return [x+n[0]*(brk?.03:.01),y+n[1]*(brk?.03:.012),z+n[2]*.014];}),
    (c,x,y,z,nx,ny)=>{const g0=rand(salt+300+Math.round(x*50)*3+Math.round(z*50)*7);hue(c,g0>.5?0x5a5760:0x4b4952);
     if(ny>.6&&g0>.35)c.lerp(new THREE.Color(0x34402a),.6);if(ny<-.6)c.lerp(new THREE.Color(0x1d1620),.5);},
    {x:side*.245,y:.965,rz:side*.06}));
  }
  // A horned skull jammed into the crack, staring out from the front face.
  const bone=(c,x,y,z,nx,ny,nz)=>{hue(c,0xcdbf9e);if(nz<-.2||ny<-.5)c.multiplyScalar(.6);};
  const SK={x:0,y:.915,z:.075};
  archParts.push(bake(new THREE.SphereGeometry(.05,12,9),bone,{x:SK.x,y:SK.y+.012,z:SK.z,sx:.95,sy:.85,sz:1}));
  archParts.push(bake(new THREE.BoxGeometry(.06,.028,.05,2,1,2),bone,{x:SK.x,y:SK.y-.035,z:SK.z+.022,rx:.25}));
  for(let i=0;i<5;i++)archParts.push(bake(new THREE.ConeGeometry(.005,.014,4),(c)=>hue(c,0xe0d6bd),{x:SK.x-.02+i*.01,y:SK.y-.052,z:SK.z+.045,rx:Math.PI}));
  for(const s of [-1,1]){
   // Each horn curls back and up from the temple, thinning to a point.
   const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(s*.035,.03,0),new THREE.Vector3(s*.075,.06,-.02),new THREE.Vector3(s*.1,.095,-.015),new THREE.Vector3(s*.095,.12,.025)]);
   for(let i=0;i<5;i++){
    const a=curve.getPoint(i/5),b=curve.getPoint((i+1)/5),d=b.clone().sub(a),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
    const e=new THREE.Euler().setFromQuaternion(q);
    archParts.push(bake(new THREE.CylinderGeometry(.013*(1-(i+1)/5)+.001,.013*(1-i/5)+.001,d.length()*1.05,7),(c,x,y)=>hue(c,y>SK.y+.1?0x2a2420:0x4a3f33),
     {x:SK.x+(a.x+b.x)/2,y:SK.y+(a.y+b.y)/2,z:SK.z+(a.z+b.z)/2,rx:e.x,ry:e.y,rz:e.z}));
   }
   // Hollow sockets with a coal of the rift's light deep inside.
   add(new THREE.SphereGeometry(.009,8,6),rune,SK.x+s*.017,SK.y+.012,SK.z+.044).castShadow=false;
  }
  const archMesh=add(mergeGeometries(archParts),archMat);archMesh.name='portal-arch';
  for(const geo of archParts)geo.dispose();
  // Rift: a dark core ringed by overlapping emissive arcs that read as a spiral.
  const rift=new THREE.Group();rift.name='rift';rift.position.y=.48;rift.scale.y=1.3;g.add(rift);
  const core=add(new THREE.CircleGeometry(.29,32),mat({color:0x12031c,emissive:0x2a0640,roughness:1,side:THREE.DoubleSide}),0,0,0,rift);core.castShadow=false;
  const swirl=[0xff7aff,0xc04dff,0x8a3cff,0xe6a3ff];
  for(let i=0;i<7;i++){
   const r=.28-i*.036,c=swirl[i%4];
   const arc=add(new THREE.TorusGeometry(r,.009+.004*(i%2),5,32,Math.PI*(1.1+rand(i+300)*.5)),mat({color:c,emissive:c,emissiveIntensity:1.2+i*.12,roughness:.4,transparent:true,opacity:.85,depthWrite:false}),0,0,.004+i*.002,rift);
   arc.rotation.z=i*1.7+rand(i+310);arc.castShadow=false;
  }
  add(new THREE.SphereGeometry(.03,10,8),mat({color:0xffffff,emissive:0xffd6ff,emissiveIntensity:2}),0,0,.02,rift).castShadow=false;
  // Motes drifting out of the rift on both faces. They stay separate meshes (keep), because
  // portal-fx.js moves each one on its own.
  const mote=mat({color:0xffc6ff,emissive:0xff8aff,emissiveIntensity:1.8});
  for(let i=0;i<8;i++){const a=rand(i+320)*Math.PI*2,r=.1+rand(i+330)*.22;
   const m=add(new THREE.OctahedronGeometry(.012,0),mote,Math.cos(a)*r*.9,.48+Math.sin(a)*r*1.2,(i%2?1:-1)*(.04+rand(i+340)*.1));m.castShadow=false;m.userData.keep=true;}
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
  // Unknown trap: a raised pressure plate with a shadow gap. Tagged so fallback-audit.test.js
  // can fail on any trap that reaches it.
  g.userData.fallback=true;
  block(.5,.012,.5,dark,0,.006,0);
  block(.44,.03,.44,stone,0,.022,0,.008);
 }
 // The parts are static, so direct children that share a material (and shadow
 // setting) are merged into one mesh each: one draw call per material instead
 // of one per strand, rock or rune line. Subgroups (the portal's rift, the
 // web's spider) and meshes marked keep stay separate so they can still be moved.
 const bins=new Map();
 for(const o of [...g.children]){
  if(!o.isMesh||o.userData.keep)continue;
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
