import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Arrows, crossbow bolts and darts used to fall through to the weapon proxy: a bare leather stick.
// Each kind now has its own head, shaft and fletching, built along +y with the grip at the origin
// like every held weapon, the head at the top:
//   arrow         steel barbed broadhead, ash shaft, whipped nock, grey goose fletching with a red
//                 cock feather
//   elven arrow   ("runed") a smooth silvery leaf head, pale birch shaft with runes, green and white
//                 fletching
//   orcish arrow  ("crude") a jagged black iron head, a knobbly dark shaft, ragged black fletching
//   silver arrow  a bright silver bodkin, dark shaft, white fletching
//   ya            ("bamboo") long, bamboo with nodes, a flat willow-leaf head, brown hawk fletching
//   crossbow bolt short and thick, a four-sided pyramid head, three stiff leather vanes
//   dart          a needle point, a knurled brass barrel, a short shaft and four bright flights
// A stack ("12 arrows") lies as a small fan of up to three. The pieces merge into two meshes, metal
// and the rest (shafts, feathers, DoubleSide for the vanes), with fresh materials per model so the
// caller's dispose frees them.

const C={
 steel:rgb('#b8c4ca'),steelDark:rgb('#6a767c'),silver:rgb('#eef2f4'),iron:rgb('#2e2a28'),rust:rgb('#6a3a22'),
 brass:rgb('#c89a48'),brassDark:rgb('#7a5a24'),elven:rgb('#d8e4ea'),
 ash:rgb('#b88a55'),ashDark:rgb('#8a643a'),birch:rgb('#e2d6b8'),dark:rgb('#4a3424'),bamboo:rgb('#c8b670'),node:rgb('#8a7a3a'),
 thread:rgb('#3a2a1a'),grey:rgb('#d8d4ca'),greyDark:rgb('#8a867c'),red:rgb('#b0302a'),green:rgb('#4f8a3a'),white:rgb('#f2efe6'),
 black:rgb('#1c1a1a'),hawk:rgb('#7a5a3a'),hawkBar:rgb('#3a2a1a'),leather:rgb('#5a3c26'),rune:rgb('#5aa8c0'),
 flightA:rgb('#d83a2a'),flightB:rgb('#f0d23a'),
};

const KINDS={
 arrow:{len:.76,r:.0085,shaft:C.ash,head:'broad',metal:C.steel,vanes:[C.red,C.grey,C.grey],vaneLen:.13},
 'elven arrow':{len:.8,r:.008,shaft:C.birch,head:'leaf',metal:C.elven,vanes:[C.green,C.white,C.white],vaneLen:.14,runes:true},
 'orcish arrow':{len:.7,r:.0095,shaft:C.dark,head:'crude',metal:C.iron,vanes:[C.black,C.black,C.black],vaneLen:.11,ragged:true,knobbly:true},
 'silver arrow':{len:.76,r:.0085,shaft:C.dark,head:'bodkin',metal:C.silver,vanes:[C.white,C.white,C.white],vaneLen:.13},
 ya:{len:.95,r:.009,shaft:C.bamboo,head:'willow',metal:C.steel,vanes:[C.hawk,C.hawk,C.hawk],vaneLen:.16,bamboo:true,barred:true},
 'crossbow bolt':{len:.44,r:.012,shaft:C.ash,head:'pyramid',metal:C.steelDark,vanes:[C.leather,C.leather,C.leather],vaneLen:.08,stiff:true},
};
const ALIASES={'runed arrow':'elven arrow','crude arrow':'orcish arrow','bamboo arrow':'ya'};

// Which missile an item name is, or null.
export function missileKind(name=''){
 const n=name.toLowerCase();
 for(const [alias,kind] of Object.entries(ALIASES))if(new RegExp(`\\b${alias}s?\\b`).test(n))return kind;
 for(const kind of ['elven arrow','orcish arrow','silver arrow','crossbow bolt'])if(new RegExp(`\\b${kind}s?\\b`).test(n))return kind;
 if(/\bya\b/.test(n))return 'ya';
 if(/\barrows?\b/.test(n))return 'arrow';
 if(/\bdarts?\b/.test(n))return 'dart';
 return null;
}

const Y=new THREE.Vector3(0,1,0);
const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
// a flat blade outline in the x-y plane, extruded thin and bevelled
function blade(shape,depth=.004,bevel=.0025){
 const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1,curveSegments:6});
 g.translate(0,0,-depth/2);return g;
}
function outline(points){const s=new THREE.Shape();s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();return s;}

// The head, built with its socket at y=0, pointing up.
function head(M,type,metal,m){
 const edge=mix(metal,[1,1,1],.35),shade=(x,y,z)=>mix(metal,edge,Math.abs(z)<.0015?.8:0);
 if(type==='broad'){
  // a flat barbed broadhead with a raised midrib
  M.add(blade(outline([[0,.11],[.024,.035],[.03,-.004],[.012,.018],[0,.012],[-.012,.018],[-.03,-.004],[-.024,.035]])),m,shade);
  M.add(new THREE.CylinderGeometry(.0035,.006,.1,6),m.clone().multiply(at(0,.055,0)),metal);
 }else if(type==='leaf'){
  const s=new THREE.Shape();s.moveTo(0,.12);s.quadraticCurveTo(.028,.06,.016,.018);s.quadraticCurveTo(.006,.008,0,.006);s.quadraticCurveTo(-.006,.008,-.016,.018);s.quadraticCurveTo(-.028,.06,0,.12);
  M.add(blade(s,.003,.002),m,shade);
  M.add(new THREE.CylinderGeometry(.0025,.005,.1,6),m.clone().multiply(at(0,.055,0)),metal);
 }else if(type==='crude'){
  // a lumpy, jagged, hammered head with uneven barbs
  M.add(blade(outline([[.002,.1],[.014,.07],[.022,.05],[.03,.012],[.02,.024],[.012,.02],[.004,.012],[-.006,.014],[-.016,.03],[-.034,.004],[-.026,.042],[-.016,.064],[-.01,.082]]),.006,.003),m,(x,y,z)=>mix(C.iron,C.rust,hash(Math.floor(x*300)+Math.floor(y*200)*7)>.7?.7:0));
 }else if(type==='bodkin'){
  M.add(new THREE.ConeGeometry(.012,.09,4),m.clone().multiply(at(0,.06,0)),metal);
  M.add(new THREE.CylinderGeometry(.009,.011,.02,8),m.clone().multiply(at(0,.008,0)),metal);
 }else if(type==='willow'){
  const s=new THREE.Shape();s.moveTo(0,.15);s.quadraticCurveTo(.022,.09,.012,.03);s.lineTo(.006,.004);s.lineTo(-.006,.004);s.lineTo(-.012,.03);s.quadraticCurveTo(-.022,.09,0,.15);
  M.add(blade(s,.0025,.0015),m,shade);
 }else if(type==='pyramid'){
  M.add(new THREE.ConeGeometry(.019,.07,4),m.clone().multiply(at(0,.045,0,[0,Math.PI/4,0])),metal);
  M.add(new THREE.CylinderGeometry(.016,.016,.022,8),m.clone().multiply(at(0,.004,0)),metal);
 }
 // the socket collar where the head meets the shaft
 if(type!=='bodkin'&&type!=='pyramid')M.add(new THREE.CylinderGeometry(.0075,.0095,.022,8),m.clone().multiply(at(0,.002,0)),mix(metal,[0,0,0],.25));
}

// One arrow or bolt along +y, nock at y0 and head socket at y0+len.
function arrow(M,W,k,m,seed){
 const y0=-.36*k.len/.76,top=y0+k.len;
 // the shaft: ridged if knobbly, bamboo with nodes, or a plain turned rod
 const shaft=new THREE.CylinderGeometry(k.r*.95,k.r,k.len,8,k.bamboo?24:k.knobbly?12:1,false);
 if(k.knobbly){const p=shaft.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),s=1+.18*Math.sin(y*90+seed)*hash(Math.round(y*60)+seed);p.setX(i,p.getX(i)*s);p.setZ(i,p.getZ(i)*s);}}
 W.add(shaft,m.clone().multiply(at(0,y0+k.len/2,0)),(x,y,z)=>{
  let c=mix(k.shaft,mix(k.shaft,[0,0,0],.25),.5+.5*Math.sin(Math.atan2(z,x)*3+y*40));
  if(k.runes&&y>top-.3&&y<top-.18&&Math.abs(Math.sin(y*260))>.7&&z>0)c=C.rune;
  return c;
 });
 if(k.bamboo)for(let i=1;i<4;i++)W.add(new THREE.TorusGeometry(k.r*1.05,k.r*.3,4,10),m.clone().multiply(at(0,y0+k.len*i/4,0,[Math.PI/2,0,0])),C.node);
 // the nock: a swelled end with a slot, and whipping in front of the fletching
 W.add(new THREE.CylinderGeometry(k.r*1.15,k.r*1.05,.02,8),m.clone().multiply(at(0,y0+.01,0)),mix(k.shaft,[0,0,0],.3));
 for(const s of [-1,1])W.add(new THREE.BoxGeometry(.004,.016,k.r*2.2),m.clone().multiply(at(s*k.r*.7,y0-.006,0)),mix(k.shaft,[0,0,0],.4));
 W.add(new THREE.CylinderGeometry(k.r*1.12,k.r*1.12,.012,8),m.clone().multiply(at(0,y0+.03+k.vaneLen+.012,0)),C.thread);
 // the vanes: three at 120°, the first (cock feather) its own colour
 k.vanes.forEach((colour,i)=>{
  const L=k.vaneLen,h=k.stiff?.02:.022,s=new THREE.Shape();
  s.moveTo(0,0);
  if(k.stiff){s.lineTo(h,.01);s.lineTo(h,L*.8);s.lineTo(0,L);}
  else{s.quadraticCurveTo(h*1.3,L*.15,h,L*.55);s.quadraticCurveTo(h*.7,L*.9,0,L);}
  const vane=new THREE.ShapeGeometry(s,6),p=vane.attributes.position;
  // ragged: nicks bitten out of the vane's edge
  if(k.ragged)for(let j=0;j<p.count;j++)if(p.getX(j)>h*.5)p.setX(j,p.getX(j)*(.6+.4*hash(j+i*13+seed)));
  const mm=m.clone().multiply(at(0,y0+.03,0,[0,i*Math.PI*2/3,0])).multiply(at(k.r*.8,0,0));
  W.add(vane,mm,(x,y,z)=>k.barred&&Math.sin(y*160)>.4?C.hawkBar:mix(colour,[1,1,1],.08*Math.sin(y*400)));
 });
 head(M,k.head,k.metal,m.clone().multiply(at(0,top,0)));
}

// A throwing dart, 0.3 long, gripped at the barrel.
function dart(M,W,m){
 M.add(new THREE.ConeGeometry(.005,.09,6),m.clone().multiply(at(0,.13,0)),C.steel);
 // the knurled brass barrel, swelling in the middle
 const barrel=new THREE.LatheGeometry([[0,-.04],[.009,-.04],[.013,-.02],[.014,.02],[.01,.07],[.005,.085]].map(([r,y])=>new THREE.Vector2(r,y)),12);
 M.add(barrel,m,(x,y,z)=>mix(C.brass,C.brassDark,Math.abs(Math.sin(Math.atan2(z,x)*6+y*140))>.75&&y<.05?.7:0));
 W.add(new THREE.CylinderGeometry(.005,.005,.09,6),m.clone().multiply(at(0,-.085,0)),C.black);
 // four flights in a cross, two red and two yellow
 for(let i=0;i<4;i++){
  const s=outline([[0,0],[.028,.012],[.03,.06],[0,.075]]);
  W.add(new THREE.ShapeGeometry(s),m.clone().multiply(at(0,-.17,0,[0,i*Math.PI/2,0])).multiply(at(.004,0,0)),i%2?C.flightB:C.flightA);
 }
}

export function createMissile(name){
 const kind=missileKind(name),g=new THREE.Group();g.name=name;
 if(!kind)return g;
 const count=Math.min(3,Math.max(1,parseInt(name,10)||1)),M=pieces(),W=pieces();
 for(let i=0;i<count;i++){
  // a stack lies as a small fan, each a little further along and turned
  const off=(i-(count-1)/2),m=new THREE.Matrix4().compose(new THREE.Vector3(off*.03,Math.abs(off)*-.02,0),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),off*.07),new THREE.Vector3(1,1,1));
  if(kind==='dart')dart(M,W,m);else arrow(M,W,KINDS[kind],m,i*7+1);
 }
 const metal=new THREE.MeshStandardMaterial({vertexColors:true,metalness:.75,roughness:.3});
 const wood=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,side:THREE.DoubleSide});
 for(const [list,mat,part] of [[M,metal,'head'],[W,wood,'shaft']]){const mesh=new THREE.Mesh(list.merge(),mat);mesh.castShadow=true;mesh.userData.part=part;g.add(mesh);}
 g.userData.kind=kind;
 g.userData.dispose=()=>{g.traverse(o=>o.geometry?.dispose());metal.dispose();wood.dispose();};
 return g;
}
