import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {fireTrapAnimator} from './fire-trap-fx.js';

// The bridge reports traps as generic `feature` cells, so the trap family comes
// from the map symbol and its colour (drawing.c defsyms). Several traps share a
// colour, so each model stands for its family, not one exact trap.
// A newer bridge also sends the trap's name, which tells the vibrating square (magenta, like a
// teleport trap) apart.
export function trapKind(symbol,color,name){
 if(name==='vibrating square')return 'vibrating';
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
  // Pit (and spiked pit): the floor has caved into a ragged maw. The broken flagstones round it
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
 }else if(kind==='hatch'){
  // Trap door / hole / squeaky board: a heavy door of warped, rotting planks in an iron-bound
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
  // Falling rock / rolling boulder / statue trap: a jagged rock lying in the
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
  const rift=new THREE.Group();rift.name='rift';rift.position.y=.48;rift.scale.y=1.3;g.add(rift);
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
