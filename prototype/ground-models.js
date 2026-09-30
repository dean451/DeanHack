import * as THREE from 'three';
import {createWand} from './wand.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeVertices,mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createUnicornHorn} from './unicorn-horn.js';
import {createCandelabrum,candelabrumState} from './candelabrum.js';
import {createMagicMarker,markerCharges} from './marker.js';
import {createIronBall,createIronChain} from './iron-ball.js';
import {createVenom} from './venom.js';

// Spellbook cover tints by glyph colour (CLR_BLACK..CLR_WHITE), kept dark enough to read as leather.
const SPELLBOOK_COVERS=[0x2b2626,0x8a2320,0x2f5e34,0x6b4527,0x2a3f7a,0x7a2a6e,0x2a7278,0x6f6c66,undefined,
 0xa85a22,0x4f9a3e,0xb09a32,0x3a62c0,0xc0708a,0x4ab0b8,0xd8d2c0];

// Spellbook covers keyed by the shuffled appearance (objects.c), never the true spell.
// Anything not listed keeps the glyph-colour tint and a plain leather binding.
const BOOK_METALS={bronze:0x9a6a34,copper:0xb66a3e,silver:0xc9d0d4,gold:0xd6a83e};
const BOOK_PAPERS={parchment:0xd6bf8a,vellum:0xe8ddc2,papyrus:0xc5a96c,plain:0xdad4c4,paperback:0xd9cfb4,stapled:0xd8d0bc,'spiral-bound':0xcfc6b0};
const BOOK_TINTS={leather:0x6b4527,canvas:0xa89a78,cloth:0x7d7a6a,plaid:0x2f5e34,tartan:0x8a2320,velvet:0x6a1f5e,fuzzy:0x7a5a3a,
 dark:0x221e24,black:0x141214,charcoal:0x2f2d2c,crimson:0x8c1424,ochre:0xa4782a,chartreuse:0x7fa82a,dull:0x6d6a60,tan:0xa48458,
 'light brown':0x8f6a44,'dark brown':0x4a2e1c};
const hashLook=look=>{let h=2166136261;for(const c of look)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};

function buildSpellbook(item,{g,add,box,ball,mat,materials,metal}){
 const look=(item.appearance||'').toLowerCase();
 const has=re=>re.test(look);
 let seed=hashLook(look)||1;const rnd=()=>(seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32;
 const shine=(color,o={})=>{const m=new(o.sheen?THREE.MeshPhysicalMaterial:THREE.MeshStandardMaterial)({color,roughness:.85,...o});materials.push(m);return m;};
 const metalKind=Object.keys(BOOK_METALS).find(k=>look===k);
 const paper=look in BOOK_PAPERS,soft=has(/^(paperback|stapled|spiral-bound)$/),scroll=has(/^(parchment|vellum|papyrus)$/);
 const plush=has(/^(velvet|fuzzy)$/);
 let tint=BOOK_METALS[metalKind]??BOOK_PAPERS[look]??BOOK_TINTS[look]??SPELLBOOK_COVERS[item.color]??0x6b4527;
 if(has(/^(dusty|faded|decrepit)$/))tint=new THREE.Color(tint).lerp(new THREE.Color(has(/dusty/)?0x9c978a:0xcfc8b6),.45).getHex();
 const cover=metalKind?shine(tint,{metalness:.85,roughness:.3}):plush?shine(tint,{roughness:1,sheen:1,sheenRoughness:.4,sheenColor:new THREE.Color(tint).lerp(new THREE.Color(0xffffff),.5)}):
  has(/^shining$/)?shine(tint,{metalness:.3,roughness:.25,emissive:tint,emissiveIntensity:.35}):shine(tint,{roughness:paper?.95:.8});
 const trim=mat(metalKind?0x3a3530:0x3a2a1c),pages=mat(has(/decrepit|dusty|ragged|tattered/)?0xc9b98e:0xe2d6b4),edge=mat(0xa8987a);
 const ink=has(/^(dark|black|charcoal)$/)?0xc9d0d8:0xd9b25a;
 const sigil=scroll?shine(0x3a2418,{roughness:.9}):shine(ink,{metalness:.7,roughness:.35,emissive:ink===0xd9b25a?0x6a4a12:0x3a4452,emissiveIntensity:.5});
 // Proportions: thin and thick change the page block; big, wide and long the footprint.
 const T=soft?.006:.018,P=has(/^thin$/)?.034:has(/^(thick|big)$/)?.11:.07,H=P+2*T;
 const W=has(/^(wide|big)$/)?.42:.34,D=has(/^(long|big)$/)?.52:.44,top=H+.002;
 add(new RoundedBoxGeometry(W,T,D,2,Math.min(.006,T/2-.0005)),cover,0,T/2);
 box(W-.03,P,D-.03,pages,.012,T+P/2);
 const lid=add(new RoundedBoxGeometry(W,T,D,2,Math.min(.006,T/2-.0005)),cover,0,T+P+T/2);
 if(has(/^wrinkled$/)){lid.scale.y=1.25;lid.position.y+=T*.12;}
 // Spine: a rounded, banded spine on bound books, a paper fold or a wire coil on soft ones.
 if(has(/^spiral-bound$/)){
  for(let z=-D/2+.03;z<D/2-.02;z+=.03)add(new THREE.TorusGeometry(H/2+.004,.0028,5,14),metal,-W/2+.012,H/2+.0068,z);
 }else if(soft){
  box(.006,H,D,cover,-W/2+.003,H/2);
  if(has(/^stapled$/))for(const z of [-D/4,D/4])box(.004,.003,.035,metal,-W/2+.014,H+.0015,z);
 }else{
  const spine=add(new THREE.CylinderGeometry(H/2,H/2,D,16,1,false,Math.PI,Math.PI),cover,-W/2,H/2);spine.rotation.x=Math.PI/2;
  if(!scroll)for(const z of [-.15,-.05,.05,.15].map(z=>z*D/.44)){const band=add(new THREE.CylinderGeometry(H/2+.005,H/2+.005,.016,16,1,false,Math.PI,Math.PI),trim,-W/2,H/2,z);band.rotation.x=Math.PI/2;band.scale.z=H/(H+.01);}
 }
 // Faint page-edge lines on the fore-edge, head and tail.
 for(const y of [.3,.5,.7]){
  box(.002,.0025,D-.05,edge,W/2-.002,T+P*y);
  for(const s of [-1,1])box(W-.06,.0025,.002,edge,.012,T+P*y,s*(D/2-.014));
 }
 // Cover surfaces: patterns lie just above the lid.
 const patch=(w,d,m,x,z,a=0,y=top)=>{const p=box(w,.0025,d,m,x,y,z);p.rotation.y=a;return p;};
 const disc=(r,m,x,z,sx=1,sz=1)=>{const p=add(new THREE.CylinderGeometry(r,r,.0025,14),m,x,top,z);p.scale.set(sx,1,sz);return p;};
 const cx=.012,cw=W-.05,cd=D-.04;
 const inset=(x,z)=>[cx+(x-.5)*cw,(z-.5)*cd];
 if(has(/^(plaid|tartan)$/)){
  const a=mat(has(/tartan/)?0x1f2f5a:0x8a2a22),b=mat(has(/tartan/)?0x2f6a3a:0xd8c46a);
  for(let i=1;i<6;i++){const [x]=inset(i/6,0);patch(.02,cd,i%2?a:b,x,0);}
  for(let i=1;i<7;i++){const [,z]=inset(0,i/7);patch(cw,.02,i%2?a:b,cx,z,0,top+.001);}
 }else if(has(/^(rainbow|psychedelic|colorful)$/)){
  const hues=[0xd8323a,0xe8862a,0xe6cf3a,0x46b04e,0x3a6ad8,0x7a3ac4];
  if(has(/psychedelic/))hues.forEach((c,i)=>add(new THREE.TorusGeometry(.03+i*.022,.009,4,36),mat(c),cx,top,0).rotation.x=Math.PI/2);
  else if(has(/rainbow/))hues.forEach((c,i)=>patch(.03,cd,mat(c),cx-cw/2+.04+i*(cw-.08)/5,0));
  else for(let i=0;i<10;i++){const [x,z]=inset(.1+rnd()*.8,.1+rnd()*.8);patch(.03+rnd()*.04,.03+rnd()*.05,mat(hues[i%6]),x,z,rnd()*3);}
 }else if(has(/^(stained|mottled|spotted)$/)){
  const dark=mat(new THREE.Color(tint).multiplyScalar(.55).getHex()),light=mat(new THREE.Color(tint).lerp(new THREE.Color(0xe8dcc0),.35).getHex());
  if(has(/stained/)){
   // A spill and two drink rings.
   disc(.06,dark,...inset(.35,.62),1.3,.8);
   for(const [u,v,r] of [[.7,.3,.045],[.6,.4,.04]]){const [x,z]=inset(u,v);add(new THREE.TorusGeometry(r,.004,4,28),dark,x,top,z).rotation.x=Math.PI/2;}
  }else{
   const n=has(/spotted/)?22:12;
   for(let i=0;i<n;i++){const [x,z]=inset(.08+rnd()*.84,.08+rnd()*.84);disc(has(/spotted/)?.008+rnd()*.01:.02+rnd()*.035,i%3?dark:light,x,z,1+rnd()*.6,1);}
  }
 }else if(has(/^(canvas|cloth)$/)){
  const weave=mat(new THREE.Color(tint).multiplyScalar(.8).getHex());
  for(let i=1;i<14;i++){const [x]=inset(i/14,0);patch(.002,cd,weave,x,0);}
 }else if(has(/^stylish$/)){
  patch(.035,Math.hypot(cw,cd)*.9,shine(0xd6a83e,{metalness:.8,roughness:.3}),cx,0,Math.atan2(cw,cd));
 }else if(has(/^glittering$/)){
  const spark=shine(0xfff4d0,{metalness:1,roughness:.1,emissive:0xfff0c0,emissiveIntensity:.8});
  for(let i=0;i<26;i++){const [x,z]=inset(.05+rnd()*.9,.05+rnd()*.9);const s=add(new THREE.OctahedronGeometry(.006+rnd()*.004),spark,x,top+.002,z);s.rotation.set(rnd()*3,rnd()*3,0);}
 }else if(has(/^wrinkled$/)){
  const crease=mat(new THREE.Color(tint).multiplyScalar(.78).getHex());
  for(let i=0;i<7;i++){const [x,z]=inset(.1+rnd()*.8,.1+rnd()*.8);patch(.003,.06+rnd()*.12,crease,x,z,rnd()*3,top+T*.25);}
 }else if(has(/^dusty$/)){
  const dust=mat(0xb8b2a4);
  for(let i=0;i<30;i++){const [x,z]=inset(rnd(),rnd());disc(.004+rnd()*.012,dust,x,z,1+rnd(),1);}
 }
 if(metalKind){
  // Raised embossed border on metal covers.
  for(const s of [-1,1]){box(cw,.004,.012,cover,cx,top+.001,s*(cd/2-.012));box(.012,.004,cd,cover,cx+s*(cw/2-.012),top+.001);}
 }
 const worn=has(/^(ragged|tattered|decrepit|dog eared)$/);
 if(worn){
  // Folded-back corners showing the paper lining, and a loose page for the ragged ones.
  const fold=mat(0xe0d4b0);
  const corners=has(/dog eared/)?[[1,1],[1,-1]]:[[1,-1]];
  for(const [sx,sz] of corners){
   const tri=new THREE.Shape([new THREE.Vector2(0,0),new THREE.Vector2(-.05,0),new THREE.Vector2(0,.05)]);
   const geo=new THREE.ExtrudeGeometry(tri,{depth:.002,bevelEnabled:false});geo.rotateX(-Math.PI/2);
   const p=add(geo,fold,W/2-.002,top+.002,sz*(D/2-.002));p.scale.z=sz;
  }
  if(!has(/dog eared/)){
   const leaf=box(W*.8,.002,D*.7,pages,W*.2,T+P*.62,.04);leaf.rotation.y=-.18;leaf.rotation.z=-.03;
   const torn=mat(new THREE.Color(tint).multiplyScalar(.6).getHex());
   for(let i=0;i<6;i++)box(.004,.003,.02+rnd()*.03,torn,W/2-.03-rnd()*.08,top,-D/2+.06+i*.06).rotation.y=rnd()-.5;
  }
 }
 const clean=!has(/^(plaid|tartan|rainbow|psychedelic|colorful|stylish|glittering)$/);
 if(soft){
  // A printed title label instead of a gilt sigil.
  patch(cw*.62,.07,mat(0xf1ead8),cx,-cd*.22);
  for(let i=0;i<3;i++)patch(cw*(.5-i*.1),.006,mat(0x2a2622),cx,-cd*.22-.02+i*.02,0,top+.001);
 }else if(clean){
  // A glinting sigil: a ring around a flattened gem, with four short rays.
  add(new THREE.TorusGeometry(.075,.007,6,32),sigil,-.015,top).rotation.x=Math.PI/2;
  ball(.032,sigil,-.015,top,0,[1,.18,1]);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4,ray=box(.05,.004,.01,sigil,-.015+Math.cos(a)*.105,top,Math.sin(a)*.105);ray.rotation.y=-a;}
 }
 if(scroll){
  // Unbound leaves tied with a cord knotted on the fore-edge.
  const cord=mat(0x6a4a2a);
  box(W+.01,.005,.008,cord,-.005,top+.001);
  box(.008,H+.004,.008,cord,W/2+.004,(H+.004)/2);
  ball(.014,cord,W/2+.012,H*.6,0,[1,.8,1]);
  for(const s of [-1,1]){const tail=box(.005,.004,.07,cord,W/2+.03,.004,s*.03);tail.rotation.y=s*.5;}
 }else if(!soft){
  // Brass corner guards on the fore-edge corners, top and bottom.
  if(!has(/decrepit/))for(const y of [T/2+.003,T+P+T/2])for(const z of [-1,1])add(new RoundedBoxGeometry(.05,T+.006,.05,2,.004),metal,W/2-.022,y,z*(D/2-.022));
  // Clasp strap wrapping from the top cover over the fore-edge, with a buckle.
  box(.07,.005,.05,trim,W/2-.03,H+.002);
  box(.005,H,.05,trim,W/2+.003,H/2);
  add(new RoundedBoxGeometry(.03,.012,.064,2,.004),metal,W/2-.05,H+.006);
 }
 // Ribbon bookmark trailing from the tail onto the floor.
 const from=new THREE.Vector3(.07,T+P*.55,D/2-.01),to=new THREE.Vector3(.1,.006,D/2+.09),d=to.clone().sub(from);
 const ribbon=box(.02,.002,d.length(),mat(0x8c1f24),(from.x+to.x)/2,(from.y+to.y)/2,(from.z+to.z)/2);
 ribbon.rotation.set(Math.atan2(-d.y,Math.hypot(d.x,d.z)),Math.atan2(d.x,d.z),0,'YXZ');
 // A left-handed book binds on the right.
 if(has(/^left-handed$/))for(const p of g.children){p.position.x*=-1;p.rotation.y*=-1;p.rotation.z*=-1;p.scale.x*=-1;}
 g.rotation.y=.3+(rnd()-.5)*.3;
}

// Gem tints by glyph colour; the appearance is shared by the real stone and its glass.
const GEM_COLORS=[0x1d1a26,0xc4202f,0x2f9e55,0xb47a2a,0x2d58d4,0x8c40c4,0x2aa4ac,0x9a9c9e,undefined,
 0xe46c1c,0x55cf5a,0xecc62e,0x5a86f0,0xd46ad0,0x6ad8e0,0xe6eef2];

// The glyph colour each shared gem colour word shows as (objects.c).
const GEM_WORD_COLOR={white:15,red:1,orange:9,yellow:11,'yellowish brown':3,green:2,blue:4,violet:5,black:0};

// Gem cuts keyed by the shared colour word (objects.c): girdle outline, crown and pavilion
// rings as [scale, height, twist] (twist .5 staggers facets into kites and stars; 0 makes
// step-cut terraces), and the table's size. Black stones are domed, polished cabochons.
const ringOutline=n=>t=>[Math.cos(t),Math.sin(t)];
const GEM_CUTS={
 white:{r:.075,n:16,outline:ringOutline(),crown:.03,table:.56,crownRings:[[.8,.6,.5]],pavilion:.068,pavRings:[[.5,.55,.5]]},
 red:{r:.066,sx:1.3,n:16,outline:ringOutline(),crown:.028,table:.55,crownRings:[[.8,.6,.5]],pavilion:.06,pavRings:[[.5,.55,.5]]},
 orange:{r:.05,sx:1.9,n:18,outline:t=>{const s=Math.sin(t);return [Math.cos(t),s*Math.abs(s)**.8];},crown:.024,table:.5,crownRings:[[.78,.6,.5]],pavilion:.05,pavRings:[[.5,.55,.5]]},
 yellow:{r:.068,n:16,outline:t=>{const c=Math.cos(t),s=Math.sin(t),q=(Math.abs(c)**4+Math.abs(s)**4)**-.25;return [c*q,s*q];},crown:.028,table:.6,crownRings:[[.82,.55,.5]],pavilion:.062,pavRings:[[.55,.5,.5]]},
 'yellowish brown':{r:.06,n:18,outline:t=>{const c=Math.cos(t),s=Math.sin(t),k=1+.6*Math.max(0,c)**3;return [c*k*.95,s*(1-.25*Math.max(0,c))];},crown:.027,table:.52,crownRings:[[.8,.6,.5]],pavilion:.058,pavRings:[[.5,.55,.5]]},
 green:{r:.058,sx:1.4,n:8,outline:t=>{const c=Math.cos(t),s=Math.sin(t),m=Math.max(Math.abs(c),Math.abs(s),(Math.abs(c)+Math.abs(s))/1.3);return [c/m,s/m];},offset:Math.PI/8,crown:.026,table:.62,crownRings:[[.9,.4,0],[.76,.75,0]],pavilion:.05,pavRings:[[.72,.35,0],[.42,.72,0]],keel:.35},
 blue:{r:.07,n:16,outline:t=>{const c=Math.cos(t),s=Math.sin(t),q=(Math.abs(c)**3+Math.abs(s)**3)**(-1/3);return [c*q,s*q];},offset:Math.PI/16,crown:.029,table:.55,crownRings:[[.8,.6,.5]],pavilion:.064,pavRings:[[.5,.55,.5]]},
 violet:{r:.072,n:15,outline:t=>{const a=((t%(2*Math.PI/3))+2*Math.PI/3)%(2*Math.PI/3)-Math.PI/3,k=.5/Math.cos(a)*1.22,q=Math.min(1.05,k);return [Math.cos(t)*q,Math.sin(t)*q];},crown:.024,table:.5,crownRings:[[.78,.55,.5]],pavilion:.055,pavRings:[[.5,.55,.5]]},
 black:{r:.07,sx:1.25,n:28,outline:ringOutline(),cab:true,crown:.045,table:0,crownRings:[[.97,.25,0],[.9,.5,0],[.77,.72,0],[.56,.88,0],[.3,.97,0]],pavilion:.008,pavRings:[[.85,.8,0]]},
};

// A small four-pointed star, shared shape for gem glints.
const GLINT_GEOMETRY=()=>{const s=new THREE.Shape();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?.18:1;s[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}return new THREE.ShapeGeometry(s);};

// Builds a flat-shaded faceted stone from a cut: girdle band, crown rings up to a flat table,
// pavilion rings down to a culet. Each facet gets its own brightness so it flashes like a cut stone.
function facetedGem(cut,seed){
 const {r,n,outline,crown,table,crownRings,pavilion,pavRings}=cut,sx=cut.sx??1,off=cut.offset??0,girdle=cut.cab?.006:.005;
 let h=seed||1;const rnd=()=>(h=(Math.imul(h,1664525)+1013904223)>>>0)/2**32;
 const ring=(scale,y,twist)=>{const pts=[];for(let i=0;i<n;i++){const t=off+(i+twist)*2*Math.PI/n,[x,z]=outline(t);pts.push(new THREE.Vector3(x*r*sx*scale,y,z*r*scale));}return pts;};
 const pos=[],col=[];const centre=new THREE.Vector3(0,(crown-pavilion)/3,0);
 const tri=(a,b,c,shade)=>{
  const nrm=b.clone().sub(a).cross(c.clone().sub(a)),mid=a.clone().add(b).add(c).divideScalar(3);
  if(nrm.dot(mid.sub(centre))<0)[b,c]=[c,b];
  const flash=shade*(cut.cab?.92+rnd()*.12:.72+rnd()*.5);
  for(const v of [a,b,c]){pos.push(v.x,v.y,v.z);const depth=THREE.MathUtils.clamp((v.y+pavilion)/(crown+pavilion),0,1);const k=flash*(.7+.45*depth);col.push(k,k,k);}
 };
 const band=(A,B,shade)=>{const stagger=A.twist!==B.twist;for(let i=0;i<n;i++){const j=(i+1)%n;
  if(stagger){tri(A.p[i],A.p[j],B.p[i],shade);tri(B.p[i],A.p[j],B.p[j],shade);}
  else{tri(A.p[i],A.p[j],B.p[j],shade);tri(A.p[i],B.p[j],B.p[i],shade);}}};
 const fan=(R,tip,shade)=>{for(let i=0;i<n;i++)tri(R.p[i],R.p[(i+1)%n],tip,shade);};
 const top={p:ring(1,girdle/2,0),twist:0},bottom={p:ring(1,-girdle/2,0),twist:0};
 band(top,bottom,.8);
 let prev=top;
 for(const [s,f,tw] of crownRings){const next={p:ring(s,girdle/2+f*crown,tw),twist:tw};band(prev,next,1);prev=next;}
 if(cut.cab)fan(prev,new THREE.Vector3(0,girdle/2+crown,0),1.05);
 else{const t={p:ring(table,girdle/2+crown,prev.twist?0:.5),twist:prev.twist?0:.5};band(prev,t,1.05);fan(t,new THREE.Vector3(0,girdle/2+crown,0),1.15);}
 prev=bottom;
 for(const [s,f,tw] of pavRings){const next={p:ring(s,-girdle/2-f*pavilion,tw),twist:tw};band(prev,next,.85);prev=next;}
 // A culet point, or a short keel line on step cuts.
 if(cut.keel){const k=cut.keel*r*sx,y=-girdle/2-pavilion,a=new THREE.Vector3(-k,y,0),b=new THREE.Vector3(k,y,0);
  for(let i=0;i<n;i++){const p=prev.p[i],q=prev.p[(i+1)%n],tip=(p.x+q.x)>0?b:a;tri(p,q,tip,.8);if((p.x>0)!==(q.x>0))tri(p.x>0?p:q,a,b,.8);}}
 else fan(prev,new THREE.Vector3(0,-girdle/2-pavilion,0),.8);
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
 geo.computeVertexNormals();return geo;
}

// A cheap smooth 3D noise (sums of skewed sines), for mottling and bumps on stones.
const stoneNoise=(x,y,z,f)=>(Math.sin(x*f+Math.sin(z*f*1.7))+Math.sin(y*f*1.3+Math.sin(x*f*.9))+Math.sin(z*f*1.1+Math.sin(y*f*1.5)))/3;

// Builds one stone from an icosphere. Rubble is the intersection of random fracture planes
// (flat, broken faces with sharp edges); a pebble is a smooth, slightly lumpy ellipsoid.
// Vertex colours carry mottling, grime in the hollows and dust or lichen on top.
function shapedStone(seed,{size,scale=[1,1,1],cuts=0,bump=.04,base,alt,detail=6,vein,lichen}){
 let h=seed||1;const rnd=()=>(h=(Math.imul(h,1664525)+1013904223)>>>0)/2**32;
 const src=new THREE.IcosahedronGeometry(1,detail);src.deleteAttribute('normal');src.deleteAttribute('uv');
 const geo=mergeVertices(src);src.dispose();
 const planes=Array.from({length:cuts},()=>{const n=new THREE.Vector3(rnd()*2-1,rnd()*2-1,rnd()*2-1).normalize();return [n,.62+rnd()*.3];});
 const ph=[rnd()*9,rnd()*9,rnd()*9];
 const pos=geo.attributes.position,d=new THREE.Vector3();
 for(let i=0;i<pos.count;i++){
  d.fromBufferAttribute(pos,i).normalize();
  let r=1;
  for(const [n,o] of planes){const k=d.dot(n);if(k>1e-3)r=Math.min(r,o/k);}
  r*=1+bump*stoneNoise(d.x+ph[0],d.y+ph[1],d.z+ph[2],4.3)+bump*.4*stoneNoise(d.x-ph[1],d.y+ph[2],d.z-ph[0],11);
  pos.setXYZ(i,d.x*r*size*scale[0],d.y*r*size*scale[1],d.z*r*size*scale[2]);
 }
 geo.computeVertexNormals();
 const nrm=geo.attributes.normal,col=[],A=new THREE.Color(base),B=new THREE.Color(alt),c=new THREE.Color();
 const moss=new THREE.Color(0x6f7b45),pale=new THREE.Color(vein?.color??0xd8d4c8),dust=new THREE.Color(0xa49a88);
 const vn=vein&&new THREE.Vector3(...vein.dir).normalize();
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i)/size,y=pos.getY(i)/size,z=pos.getZ(i)/size,ny=nrm.getY(i);
  const m=stoneNoise(x+ph[2],y+ph[0],z+ph[1],3.1)*.5+.5,fleck=stoneNoise(x*3+ph[1],y*3,z*3-ph[0],9);
  c.copy(A).lerp(B,THREE.MathUtils.clamp(m*1.3-.15,0,1));
  if(fleck>.55)c.multiplyScalar(.78);else if(fleck<-.6)c.lerp(pale,.35);
  if(vn){const w=Math.abs(x*vn.x+y*vn.y+z*vn.z-vein.at);if(w<vein.width)c.lerp(pale,.85*(1-w/vein.width)**.5);}
  if(ny>.35)c.lerp(dust,.18*(ny-.35));
  if(lichen&&ny>.3&&stoneNoise(x-ph[0],y,z+ph[2],5.5)>.35)c.lerp(moss,.7);
  c.multiplyScalar(.55+.45*THREE.MathUtils.clamp((y+1)/1.4,0,1));
  col.push(c.r,c.g,c.b);
 }
 geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
 return geo;
}

// Food kinds with their own model; rations are handled on their own below.
const FOOD_KIND=/\b(apple|orange|pear|melon|banana|carrot|egg|tin|lembas|fortune cookie|meatball|meat stick|chunk|meat ring|garlic|royal jelly|cream pie|candy bar|pancake|kelp frond|slime mold|eucalyptus leaf|eucalyptus leaves)(?:e?s)?\b/;

// Tool kinds with their own model. Each word is the shared appearance, so a tin and a
// magic whistle, or a tooled and a frost horn, look alike on the floor.
const TOOL_KIND=/\b(whistle|mirror|crystal ball|horn|bugle|flute|harp|drum|bell|stethoscope|tin opener|leash|saddle|chest|large box|ice box|iron safe|tinning kit|expensive camera|lenses|credit card|beartrap|land mine|hook)\b/;

// Ground-only geometry: every model sits on y=0, without inventory-state mutation.
// Gloves are keyed only by their appearance (old, padded, riding, fencing), which the bridge
// always sends, so the true name never changes the look. Without one they fall back to old.
const GLOVE_LOOKS={
 old:{base:0x6e4a2e,light:0x9c7b58,dark:0x3f2918,finger:.0125,fy:.78,palm:[1,.33,1.1],cuff:[.046,.05,.045],points:true},
 padded:{base:0xb89c6c,light:0xd2ba8c,dark:0x7a6242,finger:.016,fy:.85,palm:[1.08,.42,1.12],cuff:[.05,.054,.04],quilt:true,roll:true},
 riding:{base:0x4a2e1c,light:0x7a5436,dark:0x24160c,finger:.0122,fy:.75,palm:[1,.32,1.08],cuff:[.047,.078,.1],points:true,strap:true},
 fencing:{base:0xd9cfb6,light:0xece4d0,dark:0x9c9078,finger:.0112,fy:.72,palm:[.96,.3,1.12],cuff:[.045,.056,.095],pad:true,snap:true},
};
function buildGloves(look,{g,materials}){
 const kind=/padded/.test(look)?'padded':/riding/.test(look)?'riding':/fencing/.test(look)?'fencing':'old';
 const L=GLOVE_LOOKS[kind];
 const base=new THREE.Color(L.base),light=new THREE.Color(L.light),dark=new THREE.Color(L.dark),inside=new THREE.Color(0x140d08);
 const leather=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:kind==='riding'?.55:kind==='fencing'?.85:.8});
 const brass=new THREE.MeshStandardMaterial({color:0xb38b46,metalness:.85,roughness:.32});
 materials.push(leather,brass);
 const noise=(x,z)=>stoneNoise(x*3,0,z*3,40);
 // Leather colour at a point: scuffs, stitched "points" on the back of the hand, quilting or a
 // padded back, all painted into one vertex-coloured mesh per glove.
 const paint=(x,y,z,ny,part)=>{
  const c=base.clone(),n=noise(x,z);
  c.lerp(n>0?light:dark,Math.abs(n)*(kind==='old'?.55:.25));
  const top=ny>.45;
  if(part==='finger'&&kind==='old'&&Math.sin(z*150)>.9)c.lerp(dark,.5);
  if(part==='palm'&&top){
   if(L.points&&z>-.055&&z<.005&&[-.02,0,.02].some(px=>Math.abs(x-px)<.0022))c.lerp(kind==='riding'?light:dark,.7);
   if(L.pad&&Math.abs(x)<.036&&z>-.05&&z<.03)c.lerp(dark,.35);
  }
  if(L.quilt&&top&&part!=='cuff'&&(Math.abs(Math.sin((x+z)*95))<.12||Math.abs(Math.sin((x-z)*95))<.12))c.lerp(dark,.6);
  if(kind==='old'&&part==='finger'&&z<-.1&&top)c.lerp(light,.45);
  return c;
 };
 const glove=(side,spread)=>{
  const parts=[],metal=[];
  const push=(geo,part,{interior=Infinity}={})=>{
   const pos=geo.attributes.position,nor=geo.attributes.normal,colors=[];
   for(let i=0;i<pos.count;i++){
    const c=nor.getZ(i)>.9&&pos.getZ(i)>interior?inside:paint(pos.getX(i),pos.getY(i),pos.getZ(i),nor.getY(i),part);
    colors.push(c.r,c.g,c.b);
   }
   geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
   geo.deleteAttribute('uv');parts.push(geo);
  };
  // Palm: a flattened ovoid, fingers toward -z and the wrist toward +z.
  const palm=new THREE.SphereGeometry(.05,20,12);palm.scale(...L.palm);palm.translate(0,.05*L.palm[1],-.005);push(palm,'palm');
  const up=new THREE.Vector3(0,1,0);
  const digit=(x,z,angle,length,r)=>{
   const geo=new THREE.CapsuleGeometry(r,length,4,10);
   const dir=new THREE.Vector3(Math.sin(angle),0,-Math.cos(angle));
   geo.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up,dir)));
   geo.scale(1,L.fy,1);
   const mid=new THREE.Vector3(x,r*L.fy,z).addScaledVector(dir,length/2+r*.4);
   geo.translate(mid.x,mid.y,mid.z);push(geo,'finger');
  };
  const r=L.finger,lengths=[.05,.062,.058,.044];
  lengths.forEach((len,i)=>{const t=i/3-.5;digit(side*t*.068,-.05,side*t*spread,len,r*(i===3?.9:1));});
  digit(side*.044,-.004,side*(.85+spread*.3),.036,r*1.08);
  // Cuff: a flattened cone, its open end shaded dark inside.
  const [rw,re,cl]=L.cuff;
  const cuff=new THREE.CylinderGeometry(re,rw,cl,28,1);
  cuff.rotateX(Math.PI/2);cuff.scale(1,.3,1);cuff.translate(0,re*.3,.04+cl/2);push(cuff,'cuff',{interior:.04+cl/2});
  const hem=new THREE.TorusGeometry(re,kind==='padded'?.006:.0035,6,32);hem.scale(1,.3,1);hem.translate(0,re*.3,.04+cl);push(hem,'hem');
  if(L.roll){const roll=new THREE.TorusGeometry(rw+.004,.011,8,28);roll.scale(1,.45,1);roll.translate(0,rw*.36,.05);push(roll,'hem');}
  if(L.strap){
   const strap=new THREE.TorusGeometry(rw+.006,.0045,4,28);strap.scale(1,.34,2.4);strap.translate(0,rw*.3,.052);push(strap,'hem');
   const buckle=new THREE.TorusGeometry(.011,.0026,6,4);buckle.rotateX(Math.PI/2);buckle.rotateY(Math.PI/4);buckle.translate(side*.024,rw*.62+.003,.052);metal.push(buckle);
   const prong=new THREE.BoxGeometry(.016,.002,.0025);prong.translate(side*.024,rw*.62+.005,.052);metal.push(prong);
  }
  if(L.snap){const snap=new THREE.CylinderGeometry(.0065,.0065,.004,12);snap.translate(side*.022,rw*.58+.002,.062);metal.push(snap);}
  const merged=mergeGeometries(parts);parts.forEach(p=>p.dispose());
  merged.computeBoundingBox();
  const lift=-merged.boundingBox.min.y;merged.translate(0,lift,0);
  const hardware=metal.length?mergeGeometries(metal.map(m=>{const n=m.index?m.toNonIndexed():m;n.deleteAttribute('uv');return n;})):null;
  metal.forEach(m=>m.dispose());hardware?.translate(0,lift,0);
  return {merged,hardware};
 };
 // A pair tossed down side by side, splayed apart, the left one's fingers spread wider.
 for(const [side,x,z,yaw,spread] of [[1,-.075,.02,.38,.22],[-1,.08,-.025,-.52,.12]]){
  const {merged,hardware}=glove(side,spread);
  const hand=new THREE.Group();hand.position.set(x,0,z);hand.rotation.y=yaw;hand.userData.part='glove';g.add(hand);
  const skin=new THREE.Mesh(merged,leather);skin.castShadow=skin.receiveShadow=true;hand.add(skin);
  if(hardware){const m=new THREE.Mesh(hardware,brass);m.castShadow=true;hand.add(m);}
 }
}

// Boots are keyed only by their appearance: the fixed walking shoes, hard shoes and jackboots,
// and the seven shuffled ones (objects.c). Without one they fall back to walking shoes.
// shaft: height above the ankle (a shoe keeps a low heel counter); heel: height of the heel and tread blocks.
const BOOT_LOOKS={
 walking:{base:0x7a5534,light:0xa07a52,dark:0x472f1c,sole:0x2e2620,shaft:.012,heel:.008,lace:0xc8b48a,laces:3},
 hard:{base:0x6c7278,light:0x9aa2a8,dark:0x3a3e42,sole:0x34383c,shaft:.05,heel:.01,iron:true},
 jack:{base:0x1c1a1a,light:0x4a4644,dark:0x0c0b0b,sole:0x121010,shaft:.2,heel:.016,flare:1.2,gloss:true},
 combat:{base:0x262422,light:0x4a4540,dark:0x121110,sole:0x151413,shaft:.1,heel:.014,lace:0x1a1a18,laces:7,tread:true},
 jungle:{base:0x3a2a1e,light:0x5c4632,dark:0x1f150e,sole:0x1c1a18,shaft:.11,heel:.014,lace:0x2a2a20,laces:7,canvas:0x5c6438,tread:true},
 hiking:{base:0x8a6440,light:0xb48c62,dark:0x4c3420,sole:0x3a2c22,shaft:.06,heel:.014,lace:0xa83228,laces:5,collar:true,tread:true},
 mud:{base:0x5a4a34,light:0x7c6a50,dark:0x2e2418,sole:0x2a2218,shaft:.13,heel:.012,mud:0x4a3822,flare:1.1},
 buckled:{base:0x5e3a24,light:0x86603e,dark:0x301c10,sole:0x221812,shaft:.12,heel:.014,buckles:3},
 riding:{base:0x6a3c1e,light:0x9a6a40,dark:0x3a1e0c,sole:0x1c120c,shaft:.22,heel:.02,gloss:true,spur:true},
 snow:{base:0x4a5c6c,light:0x6c8090,dark:0x283440,sole:0x222428,shaft:.09,heel:.016,fur:0xe4ddd0,flare:1.12,tread:true},
};
function buildBoots(look,{g,materials}){
 const kind=/walking/.test(look)?'walking':/hard/.test(look)?'hard':/jack/.test(look)?'jack':/combat/.test(look)?'combat':
  /jungle/.test(look)?'jungle':/hiking/.test(look)?'hiking':/mud/.test(look)?'mud':/buckled/.test(look)?'buckled':
  /riding/.test(look)?'riding':/snow/.test(look)?'snow':'walking';
 const L=BOOT_LOOKS[kind],C=hex=>new THREE.Color(hex);
 const base=C(L.base),light=C(L.light),dark=C(L.dark),sole=C(L.sole),inside=C(0x120c08);
 const skin=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,
  metalness:L.iron?.7:0,roughness:L.iron?.45:L.gloss?.38:kind==='snow'||kind==='hiking'?.9:.75});
 const brass=new THREE.MeshStandardMaterial({color:L.iron?0x8a9096:kind==='combat'||kind==='jungle'?0x5a5c5e:0xb38b46,metalness:.85,roughness:.32});
 materials.push(skin,brass);
 // The foot runs toe -z to heel +z. Half-width along the length t (0 heel, 1 toe).
 const len=.25,heelZ=.105,width=t=>t<.72?.034+.024*Math.sin(t/.72*Math.PI/2):.058*Math.sqrt(Math.max(0,1-((t-.72)/.28)**2)*.85+.15);
 const hh=L.heel,upH=kind==='walking'?.055:.064,upZ=-.018,shaftZ=.058,shaftR=.041;
 const soleTop=hh+.012,ankleY=soleTop+upH*.7,topY=ankleY+L.shaft;
 const footprint=(from,to)=>{
  const s=new THREE.Shape(),n=12,pts=[];
  for(let i=0;i<=n;i++){const t=from+(to-from)*i/n;pts.push([width(t),heelZ-t*len]);}
  pts.forEach(([x,z],i)=>s[i?'lineTo':'moveTo'](x,z));
  for(let i=n;i>=0;i--)s.lineTo(-pts[i][0],pts[i][1]);
  return s;
 };
 const slab=(from,to,h,y)=>{
  const geo=new THREE.ExtrudeGeometry(footprint(from,to),{depth:h,bevelEnabled:false});
  geo.rotateX(Math.PI/2);geo.translate(0,y+h,0);return geo;
 };
 const boot=(side)=>{
  const parts=[],metal=[];
  const paint=(x,y,z,ny,part)=>{
   if(part==='sole')return sole.clone().lerp(dark,L.tread&&Math.sin(z*260)>.6?.6:0);
   if(part==='lace')return C(L.lace);
   if(part==='fur')return C(L.fur).lerp(C(0xa89e90),Math.abs(stoneNoise(x*9,y*9,z*9,30))*.5);
   const n=stoneNoise(x*4,y*4,z*4,36);
   let c=base.clone().lerp(n>0?light:dark,Math.abs(n)*(L.gloss?.18:L.iron?.4:.35));
   if(L.canvas&&part==='shaft'&&y>ankleY-.01)c=C(L.canvas).lerp(dark,Math.max(0,-n)*.4);
   if(L.gloss&&ny>.55&&Math.abs(x)<.02)c.lerp(C(0xffffff),.18);
   if(L.iron&&part==='upper'&&Math.abs(z-(-.04))<.004)c.lerp(dark,.7);
   if(L.mud){const m=y-soleTop-.03-.02*stoneNoise(x*6,0,z*6,40);if(m<0)c.lerp(C(L.mud),Math.min(1,-m*45+.35));}
   if(kind==='walking'&&part==='upper'&&z<-.07&&Math.abs(Math.sin(x*420))<.12&&Math.abs(z+.085)<.004)c.lerp(dark,.6);
   return c;
  };
  const push=(geo,part,{interior=Infinity}={})=>{
   const g2=geo.index?geo.toNonIndexed():geo;g2.deleteAttribute('uv');
   const pos=g2.attributes.position,nor=g2.attributes.normal,colors=[];
   for(let i=0;i<pos.count;i++){
    const c=pos.getY(i)>interior&&nor.getY(i)>.9?inside:paint(pos.getX(i),pos.getY(i),pos.getZ(i),nor.getY(i),part);
    colors.push(c.r,c.g,c.b);
   }
   g2.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));parts.push(g2);
  };
  const addMetal=geo=>{const g2=geo.index?geo.toNonIndexed():geo;g2.deleteAttribute('uv');metal.push(g2);};
  const seg=(a,b,r,part)=>{
   const d=new THREE.Vector3().subVectors(b,a),geo=new THREE.CylinderGeometry(r,r,d.length(),5,1,true);
   geo.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize())));
   const m=a.clone().add(b).multiplyScalar(.5);geo.translate(m.x,m.y,m.z);push(geo,part);
  };
  // Heel block and forefoot tread under a full-length sole, leaving an arch between them.
  push(slab(0,.26,hh,0),'sole');push(slab(.5,1,hh,0),'sole');push(slab(0,1,.012,hh),'sole');
  // Vamp: a half ovoid over the whole foot, toe to heel.
  const vamp=new THREE.SphereGeometry(1,22,9,0,Math.PI*2,0,Math.PI/2);
  vamp.scale(.056,upH,.13);vamp.translate(0,soleTop,upZ);push(vamp,'upper');
  // Instep point on the vamp surface, for laces.
  const onVamp=(x,z,lift=.002)=>new THREE.Vector3(x,soleTop+upH*Math.sqrt(Math.max(0,1-(x/.056)**2-((z-upZ)/.13)**2))+lift,z);
  {
   const flare=L.flare||1;
   const shaft=new THREE.CylinderGeometry(shaftR*flare,shaftR,L.shaft+upH*.5,20,3,true);
   shaft.translate(0,ankleY-upH*.25+(L.shaft+upH*.5)/2,shaftZ);push(shaft,'shaft');
   const hem=new THREE.TorusGeometry(shaftR*flare,.0035,5,24);hem.rotateX(Math.PI/2);hem.translate(0,topY,shaftZ);push(hem,'shaft');
   const hole=new THREE.CircleGeometry(shaftR*flare-.002,24);hole.rotateX(-Math.PI/2);hole.translate(0,topY-Math.min(.012,L.shaft*.25),shaftZ);push(hole,'shaft',{interior:0});
   if(L.fur){
    const fur=new THREE.TorusGeometry(shaftR*flare+.004,.014,8,24);fur.rotateX(Math.PI/2);
    const p=fur.attributes.position;for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i));p.setY(i,p.getY(i)*(1+.35*Math.sin(a*11)));}
    fur.computeVertexNormals();fur.translate(0,topY-.004,shaftZ);push(fur,'fur');
   }
   if(L.buckles)for(let i=0;i<L.buckles;i++){
    const y=ankleY+.01+i*(L.shaft-.02)/Math.max(1,L.buckles-1)*.85;
    const strap=new THREE.TorusGeometry(shaftR+.003+i*.0015,.004,4,24);strap.rotateX(Math.PI/2);strap.scale(1,1.8,1);strap.translate(0,y,shaftZ);push(strap,'lace');
    const buckle=new THREE.TorusGeometry(.009,.0022,5,4);buckle.rotateZ(Math.PI/4);buckle.translate(side*(shaftR+.006)*.7,y,shaftZ-(shaftR+.006)*.7);addMetal(buckle);
   }
   if(L.laces){
    // Criss-cross laces up the instep and the front of the shaft, eyelets in metal.
    const eyes=[];
    for(let i=0;i<L.laces;i++){
     const t=i/(L.laces-1);
     if(L.shaft<.04){const z=-.06+i*.022;eyes.push([onVamp(-.016,z),onVamp(.016,z)]);}
     else if(t<.45){const z=-.055+t/.45*(.07);eyes.push([onVamp(-.016,z),onVamp(.016,z)]);}
     else{const y=ankleY+(t-.45)/.55*(L.shaft-.012),front=shaftZ-Math.sqrt(shaftR**2-.017**2)-.0015;eyes.push([new THREE.Vector3(-.017,y,front),new THREE.Vector3(.017,y,front)]);}
    }
    eyes.forEach(([a,b],i)=>{
     seg(a,b,.0022,'lace');
     if(i)seg(eyes[i-1][0],b,.0018,'lace'),seg(eyes[i-1][1],a,.0018,'lace');
     for(const p of [a,b]){const e=new THREE.TorusGeometry(.0035,.0012,3,6);e.translate(p.x,p.y,p.z);addMetal(e);}
    });
   }
   if(L.canvas)for(const sx of [-1,1])for(const dy of [0,.014]){
    // Drainage vents in the canvas on the instep side, as on real jungle boots.
    const v=new THREE.TorusGeometry(.004,.0014,3,8);v.rotateY(Math.PI/2);v.translate(sx*(shaftR+.001),ankleY+.004+dy,shaftZ-.006);addMetal(v);
   }
   if(L.collar){const collar=new THREE.TorusGeometry(shaftR+.002,.008,8,24);collar.rotateX(Math.PI/2);collar.translate(0,topY-.002,shaftZ);push(collar,'upper');}
   if(L.spur){
    const arm=new THREE.TorusGeometry(shaftR+.004,.0022,4,16,Math.PI);arm.rotateX(Math.PI/2);arm.translate(0,soleTop+.012,shaftZ);addMetal(arm);
    const neck=new THREE.CylinderGeometry(.002,.002,.024,5);neck.rotateX(Math.PI/2);neck.translate(0,soleTop+.012,shaftZ+shaftR+.014);addMetal(neck);
    const rowel=new THREE.CylinderGeometry(.009,.009,.002,8);rowel.rotateZ(Math.PI/2);rowel.translate(0,soleTop+.012,shaftZ+shaftR+.026);addMetal(rowel);
   }
   if(L.iron)for(let i=0;i<7;i++){const a=Math.PI*(.15+.7*i/6),r=new THREE.SphereGeometry(.003,5,4);r.translate(Math.cos(a)*(shaftR+.001),ankleY,shaftZ-Math.sin(a)*(shaftR+.001));addMetal(r);}
  }
  const merged=mergeGeometries(parts);parts.forEach(p=>p.dispose());
  merged.computeBoundingBox();const lift=-merged.boundingBox.min.y;merged.translate(0,lift,0);
  const hardware=metal.length?mergeGeometries(metal):null;metal.forEach(m=>m.dispose());hardware?.translate(0,lift,0);
  return {merged,hardware};
 };
 // A pair: one stands, toes angled out. A tall boot's partner has slumped onto its side.
 const tall=L.shaft>=.12;
 for(const [side,x,z,yaw,fallen] of [[1,-.075,.03,.3,false],[-1,.085,-.02,tall?-1.1:-.32,tall]]){
  const {merged,hardware}=boot(side);
  const foot=new THREE.Group();foot.userData.part='boot';
  const inner=new THREE.Group();foot.add(inner);
  const mesh=new THREE.Mesh(merged,skin);mesh.castShadow=mesh.receiveShadow=true;inner.add(mesh);
  if(hardware){const m=new THREE.Mesh(hardware,brass);m.castShadow=true;inner.add(m);}
  if(fallen){
   inner.rotation.z=side*Math.PI/2*.92;inner.updateMatrixWorld(true);
   const box=new THREE.Box3().setFromObject(inner);inner.position.y=-box.min.y;inner.position.x=-(box.min.x+box.max.x)/2;
  }
  foot.position.set(x,0,z);foot.rotation.y=yaw;g.add(foot);
 }
}

// Cloaks are keyed only by their appearance (objects.c): the shuffled faded pall, coarse mantelet, hooded cloak,
// slippery cloak, tattered cape, opera cloak, ornamental cope and piece of cloth. The robe, mummy wrapping and
// leather cloak have no appearance, so they show as themselves. Any other cloak without one is a plain cloak.
// span: half-angle of the dropped fan; R: its radius; folds/amp: radial fold count and height; hw: clasp
// [colour, metalness, roughness]; clasp: the fastening at the neck corners.
const CLOAK_LOOKS={
 'faded pall':{base:0x6f7d6c,light:0xa3ae9c,dark:0x3c473b,trim:0x8a9686,hw:[0xc9ced2,.9,.3],span:.85,R:.38,folds:7,amp:.017,rough:.92,fade:true,vine:true,clasp:'leaf'},
 'coarse mantelet':{base:0x7a6446,light:0x9a8462,dark:0x45372a,trim:0x5a4a34,hw:[0xd9ceb2,0,.7],span:.95,R:.27,folds:5,amp:.013,rough:.98,weave:true,clasp:'toggle'},
 'hooded cloak':{base:0x5a4430,light:0x7a6048,dark:0x2c2016,trim:0x3e2e20,hw:[0x5c6064,.8,.5],span:.8,R:.39,folds:6,amp:.02,rough:.9,hood:true,clasp:'ring'},
 'slippery cloak':{base:0x3c4a2a,light:0x7a8c52,dark:0x1c2414,trim:0x2a3420,hw:[0xb38b46,.85,.32],span:.8,R:.39,folds:5,amp:.016,rough:.2,sheen:true,clasp:'toggles'},
 'tattered cape':{base:0x7a2e24,light:0xa0503e,dark:0x3a140e,trim:0x5a2018,hw:[0x7c6a42,.7,.6],span:.85,R:.36,folds:6,amp:.016,rough:.95,tattered:true,clasp:'disc'},
 'opera cloak':{base:0x17151b,light:0x3a3542,dark:0x060508,trim:0x17151b,lining:0xa0182a,hw:[0xd4a84a,.9,.25],span:.82,R:.39,folds:8,amp:.015,rough:.5,collar:true,clasp:'chain'},
 'ornamental cope':{base:0x5a1c52,light:0x803878,dark:0x2c0c28,trim:0xc9a24a,hw:[0xd4a84a,.9,.25],span:1.02,R:.33,folds:6,amp:.013,rough:.7,orphrey:true,clasp:'morse'},
 'leather cloak':{base:0x6a4428,light:0x94683f,dark:0x38220f,trim:0x4a2e18,hw:[0x5c6064,.8,.45],span:.8,R:.38,folds:4,amp:.024,rough:.6,stitch:true,clasp:'buckle'},
 robe:{base:0x8c2a22,light:0xb04a3a,dark:0x4a120c,trim:0x5a1a12,rope:0xc8a868,span:.5,R:.42,folds:5,amp:.016,rough:.92},
 'piece of cloth':{base:0x8a8474,light:0xaaa494,dark:0x57524a,trim:0x6e6a5e,rough:.95},
 'mummy wrapping':{base:0xcfc2a0,light:0xe6dcc0,dark:0x7e6e4e,rough:.98},
 plain:{base:0x53625b,light:0x74857c,dark:0x2e3833,trim:0x778379,hw:[0x9baeb5,.75,.38],span:.82,R:.38,folds:6,amp:.017,rough:.9,clasp:'ring'},
};
function buildCloak(look,{g,materials}){
 const kind=Object.keys(CLOAK_LOOKS).find(k=>look.includes(k))??'plain';
 const L=CLOAK_LOOKS[kind],C=hex=>new THREE.Color(hex),V=(x,y,z)=>new THREE.Vector3(x,y,z);
 const base=C(L.base),light=C(L.light),dark=C(L.dark),trim=C(L.trim??L.dark);
 const clothMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:L.rough,side:THREE.DoubleSide});
 const metalMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:L.hw?.[1]??0,roughness:L.hw?.[2]??.5});
 materials.push(clothMat,metalMat);
 const cloth=[],metal=[];
 const smooth=(a,b,t)=>{const x=Math.min(1,Math.max(0,(t-a)/(b-a)));return x*x*(3-2*x);};
 const noise=(x,z)=>.7*stoneNoise(x,0,z,25)+.3*stoneNoise(z,0,x,70);
 // Every piece is baked non-indexed with a vertex colour, so the cloth and the hardware each merge into one mesh.
 const bake=(geo,paint,list=cloth)=>{
  const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
  flat.deleteAttribute('uv');
  if(paint){
   const pos=flat.attributes.position,col=[];
   for(let i=0;i<pos.count;i++){const c=typeof paint==='function'?paint(pos.getX(i),pos.getY(i),pos.getZ(i)):paint.clone().multiplyScalar(.92+.08*noise(pos.getX(i)*3,pos.getZ(i)*3));col.push(c.r,c.g,c.b);}
   flat.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  }
  list.push(flat);return flat;
 };
 // A grid mapped through at(u,v); paint(x,y,z,u,v) colours it and keep(u,v) can cut cells out (holes, a folded lapel).
 const sheet=(rows,cols,at,paint,keep)=>{
  const pos=[],col=[],idx=[];
  for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const u=j/cols,v=i/rows,p=at(u,v);pos.push(...p);col.push(...paint(...p,u,v).toArray());}
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
   if(keep&&!keep((j+.5)/cols,(i+.5)/rows))continue;
   const a=i*(cols+1)+j,b=a+cols+1;idx.push(a,b,a+1,a+1,b,b+1);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  geo.setIndex(idx);geo.computeVertexNormals();bake(geo);
 };
 const tube=(points,r,color,list=cloth)=>bake(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(6,Math.round(points.length*1.3)),r,5,false),color,list);
 const piece=(geo,color,x,y,z,list=metal,ry=0)=>{geo.rotateY(ry);geo.translate(x,y,z);return bake(geo,color,list);};
 const hw=L.hw?C(L.hw[0]):null;

 if(kind==='mummy wrapping'){
  // A loose coil of yellowed linen bandage with two stray strands, each a flat ribbon with frayed dark edges and old stains.
  const ribbon=(points,w,lift=0)=>{
   const curve=new THREE.CatmullRomCurve3(points),n=Math.round(curve.getLength()/.006),pos=[],col=[],idx=[];
   for(let i=0;i<=n;i++){
    const t=i/n,p=curve.getPointAt(t),d=curve.getTangentAt(t),side=V(d.z,0,-d.x).normalize();
    for(const s of [-1,1]){
     const q=p.clone().addScaledVector(side,s*w/2);q.y+=lift+.0025*Math.sin(t*n*.35+s)+.0015*s*Math.sin(t*n*.13);
     pos.push(q.x,q.y,q.z);
     const c=base.clone(),nz=noise(q.x*2,q.z*2);
     c.lerp(nz>0?light:dark,Math.abs(nz)*.35);
     if(Math.sin(t*n*1.7)>.8)c.lerp(dark,.12);
     if(Math.abs(Math.sin(t*n*.21+s*.3))<.08)c.lerp(dark,.45);
     const stain=noise(q.x*4+3,q.z*4-1);if(stain>.45)c.lerp(C(0x6a5234),Math.min(1,(stain-.45)*3));
     col.push(c.r,c.g,c.b);
    }
    if(i<n){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}
   }
   const geo=new THREE.BufferGeometry();
   geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
   geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
   geo.setIndex(idx);geo.computeVertexNormals();bake(geo);
  };
  const coil=[];
  for(let i=0;i<=80;i++){const t=i/80,a=t*2.6*Math.PI*2,r=.03+.17*t;coil.push(V(.04+r*Math.cos(a)*1.05,.003+.003*Math.sin(a*3),-.03+r*Math.sin(a)*.95));}
  ribbon(coil,.04);
  ribbon([V(-.26,.004,.2),V(-.14,.006,.25),V(-.03,.013,.17),V(.08,.014,.2),V(.2,.006,.26)],.036);
  ribbon([V(.27,.004,-.22),V(.2,.012,-.13),V(.25,.007,-.03)],.034,.002);
 }else if(kind==='piece of cloth'){
  // A plain rumpled square with one corner folded back over itself, showing its duller underside.
  const W=.22,D=.19,cut=.2;
  const at=(u,v)=>{
   let x=(u*2-1)*W,z=(v*2-1)*D,y=.004+.007*(.5+.5*Math.sin(x*28+z*17))+.003*Math.sin(z*41-x*23);
   const d=(x+z-cut)/Math.SQRT2;
   if(d>0){x-=d*Math.SQRT2;z-=d*Math.SQRT2;y+=.006*smooth(0,.012,d)+.05*d*d/(d+.02)+.004;}
   return [x,y,z];
  };
  sheet(36,40,at,(x,y,z,u,v)=>{
   const c=base.clone(),n=noise(x,z);c.lerp(n>0?light:dark,Math.abs(n)*.3);
   if(((u*2-1)*W+(v*2-1)*D-cut)>0)c.lerp(dark,.18);
   if(Math.sin(x*380)*Math.sin(z*380)>.5)c.lerp(dark,.08);
   return c;
  });
  const edge=f=>Array.from({length:25},(_,i)=>V(...at(...f(i/24))).setY(at(...f(i/24))[1]+.001));
  for(const f of [t=>[t,0],t=>[t,1],t=>[0,t],t=>[1,t]])tube(edge(f),.0028,trim);
 }else{
  // Everything else is a cape dropped from the shoulders: a fan from the neck (-z) toward the hem (+z), with
  // radial folds that grow toward the hem. Troughs are shaded and crests catch the light.
  const robe=kind==='robe',Z0=robe?-.2:-.16,R0=robe?.06:.07;
  const jag=th=>L.tattered?.13*Math.abs(Math.sin(th*11+1.3)*Math.sin(th*4.7))+.05*(.5+.5*Math.sin(th*37)):0;
  const fold=(u,v)=>.5-.5*Math.cos((u*2-1)*Math.PI*L.folds+v*1.3);
  const capeAt=(u,v)=>{
   const s=u*2-1,th=s*L.span+.035*Math.sin(s*L.span*L.folds*2)*v;
   const r=R0+v*(L.R*(1-jag(s*L.span))-R0);
   const y=.003+L.amp*fold(u,v)*Math.pow(v,.7)+.003*(noise(s*2,v*2)+1)*v;
   return [r*Math.sin(th),y,Z0+r*Math.cos(th)];
  };
  // The opera cloak's right front edge is turned back as a lapel, showing its red lining.
  const lapel=L.lining?v=>.12*smooth(.25,1,v):()=>0;
  const holes=(u,v)=>L.tattered&&v>.3&&v<.88&&Math.sin(u*37+2)*Math.sin(v*23)+.4*Math.sin(u*91-v*57)>.95;
  const paint=(x,y,z,u,v,under=false)=>{
   const c=base.clone(),n=noise(x,z),f=fold(u,v)*smooth(0,.5,v);
   c.lerp(n>0?light:dark,Math.abs(n)*.28);
   c.lerp(dark,(1-f)*.35*v);
   if(L.fade)c.lerp(light,f*.4*v+.15*smooth(.2,.6,noise(x*.5+4,z*.5)));
   if(L.sheen)c.lerp(light,Math.pow(f,5)*.7*v);
   if(L.weave&&Math.sin(x*420)*Math.sin(z*420)>.3)c.lerp(dark,.3);
   if(L.stitch&&Math.abs(v-.92)<.008&&Math.sin(u*260)>0)c.lerp(C(0xc8a878),.8);
   if(L.vine&&v>.84&&v<.92&&Math.sin(u*120+Math.sin(v*90)*2)>.4)c.lerp(light,.55);
   if(L.tattered){
    // A patched square, darker round the holes and scorched along the ragged hem.
    if(Math.abs(u-.3)<.07&&Math.abs(v-.55)<.1)c.lerp(C(0x5c4a36),Math.abs(u-.3)>.06||Math.abs(v-.55)>.09?.95:.8);
    if(Math.sin(u*37+2)*Math.sin(v*23)+.4*Math.sin(u*91-v*57)>.8&&v>.28&&v<.9)c.lerp(dark,.5);
    c.lerp(C(0x241008),smooth(.85,1,v)*.5);
   }
   if(L.orphrey){
    // Gold orphrey bands along the hem and fronts, and a shield-shaped panel at the back.
    const band=v>.86||u<.07||u>.93,shield=Math.abs(u-.5)<.11*(1-smooth(.3,.62,v)*.6)&&v>.12&&v<.62;
    if(band||shield){
     c.copy(band?trim:C(0x8a1c2a));
     if(band&&Math.abs(Math.sin(x*150)+Math.sin(z*150))<.35)c.lerp(C(0x8a1c2a),.6);
     if(shield&&(Math.abs(u-.5)>.095*(1-smooth(.3,.62,v)*.6)||v<.14||v>.6))c.copy(trim);
    }
   }
   if(robe&&v>.94)c.lerp(trim,.8);
   if(under)c.copy(C(L.lining)).lerp(C(0x3a0610),(1-f)*.35);
   return c;
  };
  sheet(32,44,capeAt,(x,y,z,u,v)=>paint(x,y,z,u,v),(u,v)=>!holes(u,v)&&u<1-lapel(v));
  if(L.lining){
   const flapAt=(a,v)=>{const p=capeAt(1-lapel(v)*(1+a),v);p[1]+=.002+.006*a+.01*lapel(v);return p;};
   sheet(24,6,(a,v)=>flapAt(a,.25+v*.75),(x,y,z,a,v)=>paint(x,y,z,1-a*.1,.25+v*.75,true));
  }
  // Rolled hems along the neck, the fronts and (unless it is ragged) the bottom edge.
  const row=(v,n=48,up=.0015)=>Array.from({length:n+1},(_,j)=>{const p=capeAt(j/n,v);return V(p[0],p[1]+up,p[2]);});
  const col=(u,v0=0,n=30)=>Array.from({length:n+1},(_,i)=>{const v=v0+(1-v0)*i/n,p=capeAt(u-(u>.5?lapel(v)*2:0),v);return V(p[0],p[1]+.0015,p[2]);});
  if(!L.tattered)tube(row(1),L.orphrey?.004:.0035,trim);
  tube(row(0,20),.006,trim);
  tube(col(0),.003,trim);tube(col(1),.003,L.lining?C(L.lining):trim);
  if(L.tattered){
   // Loose threads hanging off the ragged hem.
   for(let j=0;j<14;j++){const u=(j+.5)/14,p=capeAt(u,1),a=u*6.1;tube([V(p[0],p[1],p[2]),V(p[0]+.012*Math.sin(a),.003,p[2]+.02+.008*Math.cos(a*3))],.0012,dark);}
  }
  if(L.collar){
   // A standing collar, sagging back onto the shoulders.
   const collarAt=(u,h)=>{const s=u*2-1,th=s*L.span*.95,r=R0-.004-h*.024;return [r*Math.sin(th),.004+h*.03,Z0+r*Math.cos(th)];};
   sheet(4,24,collarAt,(x,y,z,u,h)=>base.clone().lerp(light,h*.3));
  }
  if(L.hood){
   // The hood lies flat behind the neck: a squashed dome with a crease and a rolled rim.
   const hood=new THREE.SphereGeometry(1,28,12,0,Math.PI*2,0,Math.PI/2);hood.scale(.1,.045,.1);hood.translate(0,.002,Z0+R0-.1);
   bake(hood,(x,y,z)=>{const c=base.clone().lerp(dark,.15),n=noise(x,z);c.lerp(n>0?light:dark,Math.abs(n)*.3);if(Math.abs(x)<.006)c.lerp(dark,.5);return c;});
   const rim=new THREE.TorusGeometry(.1,.005,5,40);rim.rotateX(Math.PI/2);rim.translate(0,.003,Z0+R0-.1);bake(rim,trim);
  }
  if(robe){
   // Sleeves spread out from the shoulders, a rope belt knotted at the waist with tasselled ends.
   for(const s of [-1,1]){
    const path=[V(s*.05,0,-.13),V(s*.14,0,-.09),V(s*.21,0,-.02),V(s*.24,0,.07)];
    const sleeve=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path),24,1,10,false);
    const pos=sleeve.attributes.position,curve=new THREE.CatmullRomCurve3(path);
    // Taper toward the shoulder and flatten the sleeve onto the floor.
    for(let i=0;i<pos.count;i++){
     const t=Math.floor(i/11)/24,c=curve.getPointAt(t),rad=.022+.018*t;
     const d=V(pos.getX(i),pos.getY(i),pos.getZ(i)).sub(c);pos.setXYZ(i,c.x+d.x*rad,.004+(d.y*rad+rad)*.4,c.z+d.z*rad);
    }
    sleeve.computeVertexNormals();
    bake(sleeve,(x,y,z)=>{const c=base.clone(),n=noise(x,z);c.lerp(n>0?light:dark,Math.abs(n)*.3);if(y<.008)c.lerp(dark,.3);return c;});
    const cuff=new THREE.TorusGeometry(.04,.005,5,20);cuff.scale(1,.4,1);cuff.rotateY(Math.atan2(s*.02,.09));cuff.translate(s*.24,.02,.07);bake(cuff,trim);
   }
   const rope=C(L.rope),belt=row(.36,24,.004);
   tube(belt,.005,rope);
   const knot=capeAt(.5,.36);
   const k=new THREE.SphereGeometry(.011,10,6);k.translate(knot[0],knot[1]+.008,knot[2]);bake(k,rope);
   for(const s of [-1,1]){
    const end=V(knot[0]+s*.03,.003,knot[2]+.14);
    tube([V(knot[0],knot[1]+.006,knot[2]),V(knot[0]+s*.02,.006,knot[2]+.07),end],.0035,rope);
    const tassel=new THREE.ConeGeometry(.012,.03,8);tassel.rotateX(Math.PI/2);tassel.scale(1,.5,1);tassel.translate(end.x,.006,end.z+.012);bake(tassel,rope);
   }
  }
  // Fastenings at the two neck corners.
  const [ax,ay,az]=capeAt(0,0),[bx,by,bz]=capeAt(1,0),top=Math.max(ay,by)+.006;
  const clasp={
   leaf(){for(const [x,z,s] of [[ax,az,-1],[bx,bz,1]])for(const a of [.5,-.4]){const leaf=new THREE.SphereGeometry(1,10,6);leaf.scale(.011,.004,.024);leaf.rotateY(s*a);leaf.translate(x+s*.01*Math.sin(a),top,z+.012*Math.cos(a));bake(leaf,hw,metal);}},
   toggle(){const t=new THREE.CylinderGeometry(.006,.006,.042,8);t.rotateZ(Math.PI/2);piece(t,hw,ax,top,az,metal,-.4);tube([V(bx,top-.002,bz),V(bx-.02,top,bz+.012),V(bx-.035,top-.002,bz)],.002,C(0x3a2c1c));},
   ring(){for(const [x,z] of [[ax,az],[bx,bz]]){const r=new THREE.TorusGeometry(.017,.004,6,20);r.rotateX(Math.PI/2);piece(r,hw,x,top-.002,z);}const pin=new THREE.CylinderGeometry(.002,.002,.05,6);pin.rotateZ(Math.PI/2);piece(pin,hw,ax,top,az,metal,.5);},
   toggles(){for(const v of [.06,.2,.34])for(const u of [0,1]){const [x,y,z]=capeAt(u,v),t=new THREE.CylinderGeometry(.005,.005,.026,8);t.rotateZ(Math.PI/2);piece(t,hw,x,y+.005,z,metal,u?-.3:.3);}},
   disc(){for(const [x,z] of [[ax,az],[bx,bz]]){const d=new THREE.CylinderGeometry(.018,.018,.005,16);piece(d,hw,x,top-.003,z);}},
   chain(){
    for(const [x,z] of [[ax,az],[bx,bz]]){const d=new THREE.CylinderGeometry(.013,.013,.005,12);piece(d,hw,x,top-.002,z);}
    const curve=new THREE.CatmullRomCurve3([V(ax,top,az),V((ax+bx)/2,.004,(az+bz)/2+.06),V(bx,top,bz)]);
    for(let i=1;i<12;i++){const p=curve.getPointAt(i/12),l=new THREE.TorusGeometry(.005,.0014,4,8);l.rotateY(i%2?Math.PI/2:0);if(i%2)l.rotateX(Math.PI/2);piece(l,hw,p.x,p.y+.002,p.z);}
   },
   morse(){
    const d=new THREE.CylinderGeometry(.03,.032,.008,24);piece(d,hw,ax,top-.001,az);
    const ring=new THREE.TorusGeometry(.024,.003,6,24);ring.rotateX(Math.PI/2);piece(ring,hw,ax,top+.004,az);
    const gem=new THREE.SphereGeometry(.009,12,6);gem.scale(1,.6,1);piece(gem,C(0x8a1422),ax,top+.005,az);
    const d2=new THREE.CylinderGeometry(.03,.032,.008,24);piece(d2,hw,bx,top-.001,bz);
   },
   buckle(){
    const b=new THREE.TorusGeometry(.017,.003,4,4);b.rotateZ(Math.PI/4);b.rotateX(Math.PI/2);b.scale(1,1,1.3);piece(b,hw,ax,top,az);
    const strap=new THREE.BoxGeometry(.05,.004,.018);piece(strap,trim,(ax+bx)/2-.01,top-.002,(az+bz)/2+.01,cloth,.2);
   },
  }[L.clasp];
  clasp?.();
 }
 const part=new THREE.Group();part.userData.part='cloak';g.add(part);
 const merge=list=>{if(!list.length)return null;const m=mergeGeometries(list);list.forEach(p=>p.dispose());return m;};
 const body=merge(cloth),hardware=merge(metal);
 body.computeBoundingBox();hardware?.computeBoundingBox();
 const low=Math.min(body.boundingBox.min.y,hardware?.boundingBox.min.y??Infinity);
 for(const [geo,m] of [[body,clothMat],[hardware,metalMat]]){
  if(!geo)continue;geo.translate(0,-low,0);
  const mesh=new THREE.Mesh(geo,m);mesh.castShadow=mesh.receiveShadow=true;part.add(mesh);
 }
}

// Body armour lies face-up, neck toward -z, keyed by (appearance || name): crude orcish mail shows as crude,
// and dragon scale mail shows only its hide colour, keyed by both its shuffled word and its true word.
// A glyph colour (CLR_*) is the fallback for any hide not listed.
const DRAGON_HIDES=[[/tatzelworm|\bmagic\b/,0x7c7f84],[/amphitere|reflecting/,0xc9d3db,true],[/shimmering/,0x5fb8c0],[/draken|\bfire\b/,0xa8261e],
 [/lindworm|\bice\b/,0xdde5ea],[/sarkany|\bsleep\b/,0xd46a1c],[/sirrush|disintegration/,0x25222a],[/leviathan|electric/,0x2c4ca8],
 [/wyvern|poison/,0x2f7a34],[/glowing|\bstone\b/,0xc89a32],[/guivre|\bacid\b/,0xc2b22c],[/chromatic/,null]];
// mat: [metalness, roughness]; dome: chest height; hem: z of the hem; sleeves and drape for hanging mail.
const ARMOR_LOOKS={
 leather:{base:0x7a5232,light:0xa4774c,dark:0x3e2716,mat:[0,.62],dome:.045,hem:.16},
 studded:{base:0x6c4a2e,light:0x97704a,dark:0x35220f,mat:[0,.66],dome:.045,hem:.16},
 jacket:{base:0x2b2826,light:0x5c5752,dark:0x0f0e0d,mat:[.05,.36],dome:.03,hem:.19,sleeves:true},
 ring:{base:0x5e3e26,light:0xb8bec2,dark:0x2a1a10,mat:[.3,.5],dome:.035,hem:.25,sleeves:true},
 chain:{base:0x7f878c,light:0xc4ccd0,dark:0x33393e,mat:[.75,.42],dome:.02,hem:.25,sleeves:true,drape:true},
 mithril:{base:0xb8c4cc,light:0xf0f6fa,dark:0x5e6a74,mat:[.9,.24],dome:.02,hem:.25,sleeves:true,drape:true},
 scale:{base:0x7d7b72,light:0xc2bfb2,dark:0x2e2c28,mat:[.72,.4],dome:.035,hem:.25,sleeves:true},
 dragon:{mat:[.35,.34],dome:.035,hem:.25,sleeves:true},scales:{mat:[.35,.34]},
 splint:{base:0x80868a,light:0xc6ccd0,dark:0x2f2a24,mat:[.7,.4],dome:.045,hem:.16},
 banded:{base:0x7c8388,light:0xc4cad0,dark:0x2c3034,mat:[.72,.38],dome:.05,hem:.16},
 plate:{base:0x9aa3aa,light:0xe2e8ec,dark:0x444a50,mat:[.85,.26],dome:.07,hem:.16},
 bronze:{base:0xa87538,light:0xe8b86c,dark:0x4c2e12,mat:[.85,.3],dome:.07,hem:.16},
 crystal:{base:0xc8e4f0,light:0xffffff,dark:0x6c90a8,mat:[.1,.08],dome:.07,hem:.16},
};
const armorKind=key=>/\bscales$/.test(key)?'scales':/scale mail/.test(key)&&key!=='scale mail'?'dragon':
 /crystal plate/.test(key)?'crystal':/bronze plate/.test(key)?'bronze':/plate mail/.test(key)?'plate':
 /splint/.test(key)?'splint':/banded/.test(key)?'banded':/mithril/.test(key)?'mithril':/ring mail/.test(key)?'ring':
 /scale mail/.test(key)?'scale':/studded/.test(key)?'studded':/jacket/.test(key)?'jacket':/leather/.test(key)?'leather':'chain';
function buildBodyArmor(key,color,{g,materials}){
 const kind=armorKind(key),crude=/crude|orcish/.test(key),elven=/elven/.test(key),C=hex=>new THREE.Color(hex),V=(x,y,z)=>new THREE.Vector3(x,y,z);
 let L=ARMOR_LOOKS[kind],chromatic=false;
 if(kind==='dragon'||kind==='scales'){
  const found=DRAGON_HIDES.find(([re])=>re.test(key));
  chromatic=found?.[1]===null;
  const hide=C(chromatic?0x8a3a9a:found?.[1]??GEM_COLORS[color]??0x6d6a70);
  L={...L,base:hide.getHex(),light:hide.clone().lerp(C(0xffffff),.4).getHex(),dark:hide.clone().multiplyScalar(.3).getHex()};
  if(found?.[2])L.mat=[.85,.22];
 }
 if(kind==='mithril'&&!elven)L={...L,base:0xb4b2aa,light:0xe8e4da,dark:0x5a564e};
 if(crude)L={...L,base:C(L.base).multiplyScalar(.72).getHex(),light:C(L.light).multiplyScalar(.75).getHex(),rust:true};
 const base=C(L.base),light=C(L.light),dark=C(L.dark),hide=C(0x4a3322),hideDark=C(0x24170c),rust=C(0x7a4526);
 const mainMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:L.mat[0],roughness:L.mat[1],side:THREE.DoubleSide,
  ...(kind==='crystal'?{transparent:true,opacity:.84,emissive:0x2c5670,emissiveIntensity:.35}:{})});
 const metalMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.75,roughness:.38});
 const strapMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.8});
 materials.push(mainMat,metalMat,strapMat);
 const main=[],metal=[],straps=[];
 const noise=(x,z)=>.7*stoneNoise(x,0,z,25)+.3*stoneNoise(z,0,x,70);
 const hash=(a,b)=>{const h=Math.sin(a*127.1+b*311.7)*43758.5453;return h-Math.floor(h);};
 const frac=t=>t-Math.floor(t);
 // Every piece stays indexed with position, normal and colour, so each list merges into one mesh.
 const paint=(geo,col,list)=>{
  geo.deleteAttribute('uv');
  const pos=geo.attributes.position,out=new Float32Array(pos.count*3);
  for(let i=0;i<pos.count;i++){const c=typeof col==='function'?col(pos.getX(i),pos.getY(i),pos.getZ(i)):col;out[i*3]=c.r;out[i*3+1]=c.g;out[i*3+2]=c.b;}
  geo.setAttribute('color',new THREE.BufferAttribute(out,3));list.push(geo);return geo;
 };
 const piece=(geo,col,list,x,y,z)=>{geo.translate(x,y,z);return paint(geo,col,list);};
 // A grid mapped through at(u,v) -> [x,y,z,colour].
 const sheet=(rows,cols,at,list=main)=>{
  const pos=[],col=[],idx=[];
  for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const [x,y,z,c]=at(j/cols,i/rows);pos.push(x,y,z);col.push(c.r,c.g,c.b);}
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*(cols+1)+j,b=a+cols+1;idx.push(a,b,a+1,a+1,b,b+1);}
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  geo.setIndex(idx);geo.computeVertexNormals();list.push(geo);return geo;
 };
 const roll=(pts,r,col,list)=>paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),Math.max(16,pts.length*3),r,6,false),col,list);
 const finish=()=>{
  const part=new THREE.Group();part.userData.part='armor';g.add(part);
  const built=[[main,mainMat],[metal,metalMat],[straps,strapMat]].filter(([list])=>list.length).map(([list,m])=>{
   const geo=mergeGeometries(list);list.forEach(p=>p.dispose());geo.computeBoundingBox();return [geo,m];});
  const low=Math.min(...built.map(([geo])=>geo.boundingBox.min.y));
  for(const [geo,m] of built){geo.translate(0,-low,0);const mesh=new THREE.Mesh(geo,m);mesh.castShadow=mesh.receiveShadow=true;part.add(mesh);}
 };
 // Overlapping scales pointing toward the hem: the row above lies on top, and t runs 0 at a scale's
 // hidden top to 1 at its free rounded edge.
 const scaleAt=(x,rz,sw,sh)=>{
  const i=Math.floor(rz/sh);
  for(const r of [i-1,i]){
   const off=(r&1)*sw/2,j=Math.round((x-off)/sw),dx=(x-off-j*sw)/(sw/2),top=r*sh,bottom=top+sh*(1.55-.5*dx*dx);
   if(rz>=top&&rz<bottom)return {t:(rz-top)/(bottom-top),dx,r,j};
  }
  return {t:0,dx:0,r:i,j:0};
 };

 if(kind==='scales'){
  // Loose dragon scales: a small scattered heap of big keeled plates, each stacked a little above the last.
  const spots=[[-.1,-.08,.3],[.06,-.12,-.5],[.13,.03,1.1],[-.02,.02,.1],[-.14,.1,-.9],[.05,.14,2.4],[-.05,-.17,2.9]];
  spots.forEach(([px,pz,ry],i)=>{
   const W=.045+.01*hash(i,1),Ln=.12+.025*hash(1,i),tone=chromatic?new THREE.Color().setHSL(i/spots.length,.6,.45):base.clone().lerp(hash(i,3)>.5?light:dark,.15);
   const geo=sheet(22,14,(u,w)=>{
    const a=2*u-1,x=a*W*Math.sin(Math.PI*(.12+.88*w))**.6,z=(w-.5)*Ln;
    const y=.013*(1-a*a)*Math.sin(Math.PI*Math.min(1,w*1.15))**.5+.0012*Math.cos(a*Math.PI*2.5)*w+.003*w;
    const c=tone.clone().lerp(dark,(1-w)*.55);
    if(Math.abs(a)<.14&&w>.2)c.lerp(light,.3);
    if(w>.82)c.lerp(light,(w-.82)/.18*.45);
    const n=noise(x*4+i,z*4);c.lerp(n>0?light:dark,Math.abs(n)*.15);
    return [x,y,z,c];
   });
   geo.rotateY(ry);geo.translate(px,.0035*i,pz);
  });
  return finish();
 }

 const Z0=-.2,ZH=L.hem,plated=kind==='plate'||kind==='bronze'||kind==='crystal',cuirass=!L.sleeves;
 const WP=L.hem>.2?[[0,.165],[.2,.148],[.34,.14],[.62,.134],[1,.172]]:[[0,.165],[.2,.15],[.34,.142],[.7,.132],[1,.142]];
 const hw=v=>{for(let k=1;k<WP.length;k++)if(v<=WP[k][0]){const [v0,w0]=WP[k-1],[v1,w1]=WP[k],t=(v-v0)/(v1-v0);return w0+(w1-w0)*t*t*(3-2*t);}return WP.at(-1)[1];};
 const neck=kind==='jacket'?.075:.06;
 const zTop=s=>Z0+neck*Math.max(0,1-(s/.42)**2)**.8+.012*s*s;
 const bodyXZ=(s,v)=>{const zt=zTop(s);return [s*hw(v),zt+(ZH-zt)*v];};
 const lift=(s,v,x,z)=>{
  const chest=.8+.2*Math.sin(Math.PI*Math.min(1,v/.55))-.25*v;
  let y=.004+L.dome*Math.max(0,1-s*s)**.55*chest;
  if(L.drape)y+=.003+.004*Math.sin(s*7+v*3+noise(x,z)*1.5)*(.4+.6*v);
  if(kind==='plate'||kind==='crystal')y+=.009*Math.max(0,1-Math.abs(x)/.024)*Math.max(0,1-v/.8);
  if(kind==='bronze'){
   y+=.012*Math.exp(-(((Math.abs(x)-.065)/.05)**2+((z+.08)/.045)**2));
   if(z>-.02&&z<.1)y+=.0035*Math.max(0,Math.cos(x/.035*Math.PI))*Math.max(0,Math.sin((z+.02)/.04*Math.PI))**2*Math.max(0,1-Math.abs(x)/.09);
  }
  return y;
 };
 const surf=(x,z,eW,v)=>{
  const n=noise(x*3,z*3),c=base.clone();let dy=0;
  switch(kind){
   case 'leather':case 'studded':case 'jacket':{
    c.lerp(n>0?light:dark,Math.abs(n)*.25);
    if(kind==='leather'){
     for(const sx of [-.068,.068]){const d=Math.abs(x-sx);if(d<.0022){c.lerp(dark,.55);dy-=.0012;}else if(d<.0055&&frac(z/.009)<.55)c.lerp(light,.45);}
     if(Math.abs(z-.03)<.002){c.lerp(dark,.5);dy-=.001;}
    }
    if(kind==='jacket'){
     // An open front and two lapels folded back from the collar.
     const d=Math.abs(x),lz=z-Z0;
     if(d<.0025){c.copy(dark);dy-=.002;}
     else if(lz<.14&&d<.012+(.14-lz)*.5){c.lerp(light,.16);dy+=.003*Math.min(1,(.14-lz)/.02);}
    }
    if(eW<.011){c.lerp(dark,.35);dy+=.0012*Math.sin(Math.PI*eW/.011);if(eW>.005&&eW<.0075&&frac((x+z)/.008)<.5)c.lerp(light,.7);}
    break;
   }
   case 'ring':{
    // Iron rings sewn flat on a leather coat, the leather in shadow inside each ring.
    c.copy(hide).lerp(n>0?C(0x7a5434):hideDark,Math.abs(n)*.3);
    const pz=.018,px=.02,rz=z-Z0,r=Math.round(rz/pz),off=(r&1)*px/2,j=Math.round((x-off)/px);
    const dx=x-off-j*px,dz=rz-r*pz,d=Math.hypot(dx,dz*1.1);
    if(Math.abs(d-.0066)<.0024){const k=1-Math.abs(d-.0066)/.0024;c.copy(light).lerp(dz<0?C(0xeef2f4):dark,.4*Math.abs(dz)/.0066);dy+=.0018*Math.sqrt(k);}
    else if(d<.0042)c.lerp(hideDark,.5);
    break;
   }
   case 'chain':case 'mithril':{
    // Staggered rows of links: bright rims, dark gaps between them.
    const pz=.0085,px=.0095,rz=z-Z0,r=Math.round(rz/pz),off=(r&1)*px/2,j=Math.round((x-off)/px);
    const dx=(x-off-j*px)/(px*.55),dz=(rz-r*pz)/(pz*.75),k=Math.exp(-(((Math.hypot(dx,dz)-.62)/.28)**2));
    c.copy(dark).lerp(base,.35+.65*k).lerp(light,Math.max(0,-dz)*k*.5).lerp(n>0?light:dark,Math.abs(n)*.2);
    dy+=.0009*k;
    if(kind==='mithril'&&eW<.012)c.copy(elven?C(0xd9c27a):C(0x8a8680)).lerp(dark,.3*(1-k));
    break;
   }
   case 'scale':case 'dragon':{
    const big=kind==='dragon',{t,dx,r,j}=scaleAt(x,z-Z0,big?.03:.022,big?.024:.018);
    if(chromatic)c.setHSL(frac(r*.11+j*.23),.6,.42);else c.lerp(hash(r,j)>.5?light:dark,hash(j,r)*.18);
    c.lerp(dark,Math.max(0,1-t/.22)*.8);
    if(t>.8)c.lerp(light,(t-.8)/.2*.5);
    if(big&&Math.abs(dx)<.1&&t>.3)c.lerp(light,.25);
    dy+=(.0034*t**.7-.0008*dx*dx)*(big?1.25:1);
    break;
   }
   case 'splint':{
    // Three tiers of upright iron splints riveted to a leather backing.
    const tier=Math.min(2,Math.floor(v*3)),tv=v*3-tier,col=Math.round(x/.021),ds=(x-col*.021)/.0085;
    if(tv<.07||Math.abs(ds)>=1)c.copy(hide).lerp(hideDark,.4+.3*Math.abs(n));
    else{c.lerp(ds<0?light:dark,Math.abs(ds)*.55).lerp(n>0?light:dark,Math.abs(n)*.15);dy+=.0038*Math.sqrt(1-ds*ds);}
    break;
   }
   case 'banded':{
    // Horizontal lames, each lapping over the one below it.
    const t=frac((z-Z0)/.028);
    c.lerp(n>0?light:dark,Math.abs(n)*.15).lerp(dark,Math.max(0,1-t/.18)*.75);
    if(t>.86)c.lerp(light,(t-.86)/.14*.6);
    dy+=.0042*t;
    break;
   }
   default:{
    // Plate: a polished highlight over the chest, an engraved border and three faulds at the hem.
    const sheen=Math.max(0,1-((x/.12)**2+((z+.06)/.16)**2));
    c.lerp(light,sheen*.55).lerp(n>0?light:dark,Math.abs(n)*.08);
    if(kind==='bronze'&&n>.45)c.lerp(C(0x3f7a62),(n-.45)*1.2);
    if(kind==='crystal'){const f=hash(Math.floor(x/.028+z/.05),Math.floor(z/.03-x/.045));c.lerp(f>.5?light:dark,Math.abs(f-.5)*.7);}
    if(v>.78){const t=frac((v-.78)/.22*3);c.lerp(dark,Math.max(0,1-t/.2)*.7);dy+=.004*t;}
    else if(kind!=='crystal'&&Math.abs(eW-.016)<.0016)c.lerp(kind==='bronze'?C(0x5a3a18):dark,.6);
   }
  }
  if(L.rust){const m=noise(x*2+5,z*2-3);if(m>.35)c.lerp(rust,Math.min(.6,(m-.35)*2.5));}
  return [dy,c];
 };
 const edgeOf=(s,v)=>{const span=ZH-zTop(s);return Math.min((1-Math.abs(s))*hw(v),v*span,(1-v)*span);};
 const at=(s,v)=>{const [x,z]=bodyXZ(s,v);const [dy,c]=surf(x,z,edgeOf(s,v),v);return [x,lift(s,v,x,z)+dy,z,c];};
 // (x,z) back to (s,v), for things that sit on the surface.
 const onBody=(x,z,up=0)=>{
  let s=x/.15,v=.5;
  for(let k=0;k<6;k++){const zt=zTop(s);v=Math.min(1,Math.max(0,(z-zt)/(ZH-zt)));s=Math.max(-1,Math.min(1,x/hw(v)));}
  return V(x,at(s,v)[1]+up,z);
 };
 sheet(150,110,(u,v)=>at(2*u-1,v));

 const trim=plated?base.clone().lerp(light,.3):cuirass?dark:hideDark;
 const trimList=plated||kind==='leather'||kind==='studded'||kind==='jacket'?main:kind==='mithril'&&elven?metal:straps;
 const trimCol=kind==='mithril'&&elven?C(0xd9c27a):trim;
 const rollR=plated?.0065:.004,line=(f,n=24)=>Array.from({length:n+1},(_,i)=>f(i/n));
 const edge=(s,v,up)=>{const [x,z]=bodyXZ(s,v);return V(x,lift(s,v,x,z)+up,z);};
 roll(line(t=>edge(2*t-1,0,rollR*.6)),kind==='jacket'?.009:rollR,trimCol,trimList);
 roll(line(t=>edge(2*t-1,1,rollR*.6)),rollR,trimCol,trimList);
 if(cuirass)for(const s of [-1,1])roll(line(t=>edge(s,t,rollR*.6),20),rollR,trimCol,trimList);

 if(L.sleeves)for(const side of [-1,1]){
  // A short sleeve laid out from the armhole, down and away from the body.
  const va=.3,len=kind==='jacket'?.15:.12,a=kind==='jacket'?.75:.55,dir=[side*Math.cos(a),Math.sin(a)],[cx,cz]=bodyXZ(side,va/2);
  const sleeveAt=(u,w)=>{
   const [rx,rz]=bodyXZ(side,u*va);let x=rx+dir[0]*len*w,z=rz+dir[1]*len*w;
   x+=(cx+dir[0]*len*w-x)*.3*w;z+=(cz+dir[1]*len*w-z)*.3*w;
   let y=.004+.016*Math.sin(Math.PI*u)**.7*(1-.35*w);
   if(L.drape)y+=.003*Math.sin(w*9+u*4+side)*w;
   return [x,y,z];
  };
  sheet(26,20,(u,w)=>{
   const [x,y,z]=sleeveAt(u,w),[dy,c]=surf(x,z,Math.min(Math.min(u,1-u)*.13*(1-.3*w),(1-w)*len),.5);
   if(w<.06)c.lerp(dark,(1-w/.06)*.35);
   return [x,y+dy,z,c];
  });
  roll(line(u=>{const [x,y,z]=sleeveAt(u,1);return V(x,y+rollR*.4,z);},12),rollR,trimCol,trimList);
 }

 if(plated)for(const side of [-1,1])for(let k=0;k<3;k++){
  // Pauldrons: a domed cap and two smaller lames lapping outward over the shoulder.
  const R=.07-k*.012,geo=new THREE.SphereGeometry(R,20,8,0,Math.PI*2,0,Math.PI/2);geo.scale(1,.42,.8);
  piece(geo,(x,y)=>base.clone().lerp(light,Math.min(1,y/.028)*.6).lerp(dark,.15+k*.12),main,side*(.19+k*.028),0,-.165+k*.02);
 }
 const rivet=(x,z,r=.0028)=>{const p=onBody(x,z);piece(new THREE.SphereGeometry(r,6,4,0,Math.PI*2,0,Math.PI/2),(x,y)=>C(0x6e7478).lerp(C(0xe0e4e6),Math.min(1,(y-p.y)/r)),metal,p.x,p.y-.0005,p.z);};
 if(kind==='studded'){
  for(let r=0;r<11;r++)for(let j=-5;j<=5;j++){
   const z=-.13+r*.028,x=j*.03+(r&1)*.015,v=(z-Z0)/(ZH-Z0);
   if(Math.abs(x)<hw(Math.min(1,Math.max(0,v)))-.02&&z<ZH-.02&&z>zTop(x/.15)+.02)rivet(x,z,.0055);
  }
 }
 if(kind==='splint')for(let tier=0;tier<3;tier++)for(let col=-7;col<=7;col++){
  const v=(tier+.15)/3,x=col*.021,[,z]=bodyXZ(x/hw(v),v);
  if(Math.abs(x)<hw(v)-.012&&z>zTop(x/hw(v))+.012)rivet(x,z);
 }
 if(kind==='banded')for(let k=0;k*.028+.015<ZH-Z0;k++){
  const z=Z0+k*.028+.02,v=(z-Z0)/(ZH-Z0);if(v<.08||v>.96)continue;
  for(const s of [-1,1])rivet(s*(hw(v)-.014),z);
 }
 if(plated)for(let i=-3;i<=3;i++){const s=i/4.2,[x,z]=bodyXZ(s,.035);rivet(x,z+.004,.0034);}
 if(kind==='jacket'){
  // A zip down the open front, and its pull at the collar.
  const tooth=C(0x9a9690);
  for(let z=zTop(0)+.012,i=0;z<ZH-.006;z+=.0055,i++){const p=onBody(0,z);piece(new THREE.BoxGeometry(.0055,.002,.0028),tooth,metal,(i&1?1:-1)*.0014,p.y+.0005,z);}
  const p=onBody(0,zTop(0)+.01);piece(new THREE.BoxGeometry(.008,.0025,.02),C(0xc8c4bc),metal,.004,p.y+.002,p.z+.008);
 }
 if(cuirass)for(const v of [.35,.66])for(const s of [-1,1]){
  // Side straps hanging loose past the edge, each with an open buckle.
  const [ex,ez]=bodyXZ(s,v),y=lift(s,v,ex,ez)+.002;
  piece(new THREE.BoxGeometry(.055,.003,.014),(x)=>C(0x5a3b22).lerp(hideDark,Math.abs(x-ex)/.06*.5),straps,ex+s*.018,y,ez);
  const buckle=new THREE.TorusGeometry(.0085,.0022,4,12);buckle.rotateX(Math.PI/2);buckle.scale(.8,1,1.2);
  piece(buckle,plated&&kind==='bronze'?C(0xb08a3c):C(0x9a9690),metal,ex+s*.048,y+.001,ez);
 }
 finish();
}

// Helmets and hats are keyed only by their appearance: the fixed leather hat, iron skull cap, hard hat and
// conical hat (the cornuthaum and dunce cap share it), and the four shuffled helmets (objects.c). The fedora,
// dented pot and tinfoil hat have no appearance, so they show as themselves. Anything else is a plain helmet.
// mat: [metalness, roughness] of the shell's vertex-coloured material.
const HELM_LOOKS={
 leather:{base:0x7a5230,light:0xa07852,dark:0x462c18,mat:[0,.72]},
 skull:{base:0x4a4744,light:0x6e6a66,dark:0x262422,mat:[.65,.55]},
 'hard hat':{base:0x7a7470,light:0xa29c96,dark:0x46423e,mat:[.6,.48]},
 fedora:{base:0x5c4b3c,light:0x77634f,dark:0x362b21,mat:[0,.92]},
 conical:{base:0x2d3160,light:0x464c88,dark:0x191b3a,mat:[0,.86]},
 tinfoil:{base:0xc4c9ce,light:0xeef1f4,dark:0x7e838a,mat:[.95,.26]},
 pot:{base:0x4e4a46,light:0x6c6660,dark:0x24211e,mat:[.5,.68]},
 plumed:{steel:true},etched:{steel:true},crested:{steel:true},visored:{steel:true},plain:{steel:true},
};
const STEEL={base:0xa4acb2,light:0xd2d8dc,dark:0x5a6268,mat:[.82,.3]};
function buildHelmet(look,{g,materials}){
 const kind=Object.keys(HELM_LOOKS).find(k=>look.includes(k))??'plain';
 const L=HELM_LOOKS[kind].steel?STEEL:HELM_LOOKS[kind],C=hex=>new THREE.Color(hex);
 const base=C(L.base),light=C(L.light),dark=C(L.dark),inside=C(0x141210),V=(r,y)=>new THREE.Vector2(r,y);
 const shellMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:L.mat[0],roughness:L.mat[1]});
 const trimMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.85});
 materials.push(shellMat,trimMat);
 const shell=[],trim=[];
 // Colour every vertex, weld the seam, bend it into shape, then relight it smooth.
 const finish=(geo,colorAt,warp)=>{
  geo.deleteAttribute('uv');geo.deleteAttribute('normal');
  const pos=geo.attributes.position,cols=new Float32Array(pos.count*3);
  for(let i=0;i<pos.count;i++){const c=colorAt(pos.getX(i),pos.getY(i),pos.getZ(i),i);cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;}
  geo.setAttribute('color',new THREE.BufferAttribute(cols,3));
  const welded=mergeVertices(geo);geo.dispose();
  if(warp){const p=welded.attributes.position,v=new THREE.Vector3();for(let i=0;i<p.count;i++){warp(v.fromBufferAttribute(p,i));p.setXYZ(i,v.x,v.y,v.z);}}
  welded.computeVertexNormals();
  const out=welded.toNonIndexed();welded.dispose();return out;
 };
 // A small hard-edged piece in one flat colour, keeping its own normals.
 const piece=(geo,hex,into=shell)=>{
  geo.deleteAttribute('uv');const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
  const c=C(hex),cols=new Float32Array(flat.attributes.position.count*3);
  for(let i=0;i<cols.length;i+=3){cols[i]=c.r;cols[i+1]=c.g;cols[i+2]=c.b;}
  flat.setAttribute('color',new THREE.BufferAttribute(cols,3));into.push(flat);
 };
 // A turned shell from an outside profile up to the crown and an inside profile back down;
 // points from `split` on are the inside and are shaded dark.
 const lathe=(points,split,paint,warp,segments=48)=>{
  const geo=new THREE.LatheGeometry(points,segments),n=points.length;
  shell.push(finish(geo,(x,y,z,i)=>i%n>=split?inside:paint(x,y,z),warp));
 };
 const dome=(R,H,{point=0,flare=0,th=.007,steps=16}={})=>{
  const out=[],inn=[];
  for(let i=0;i<=steps;i++){
   const t=i/steps,a=t*Math.PI/2,top=i===steps;
   out.push(V(top?0:R*Math.cos(a)*(1+flare*(1-t)**3),H*Math.sin(a)+point*H*t**6));
   inn.unshift(V(top?0:(R-th)*Math.cos(a),(H-th)*Math.sin(a)+point*(H-th)*t**6));
  }
  return [[...out,...inn],out.length];
 };
 const mottle=(x,y,z,amount,f=40)=>{const n=stoneNoise(x*3,y*3,z*3,f),c=base.clone();return c.lerp(n>0?light:dark,Math.abs(n)*amount);};
 const radial=(v,d)=>{const r=Math.hypot(v.x,v.z)||1;v.x+=v.x/r*d;v.z+=v.z/r*d;};
 const ring=(r,tube,y,hex,into,sides=8,seg=48)=>{const t=new THREE.TorusGeometry(r,tube,sides,seg);t.rotateX(Math.PI/2);t.translate(0,y,0);piece(t,hex,into);};
 const studs=(count,r,y,size,hex,start=0)=>{for(let i=0;i<count;i++){const a=start+i/count*Math.PI*2,s=new THREE.SphereGeometry(size,6,4);s.translate(Math.cos(a)*r,y,Math.sin(a)*r);piece(s,hex);}};
 let tilt=0,shift=0;
 if(kind==='leather'){
  // Elven leather hat: a soft, slightly peaked cap in panels, a tooled band and a rolled brim.
  const [p,s]=dome(.108,.095,{point:.28,flare:.04});
  lathe(p,s,(x,y,z)=>{
   const c=mottle(x,y,z,.45),az=Math.atan2(z,x);
   if(y>.012&&Math.abs(Math.sin(2*az))<.04)c.lerp(dark,.65);
   if(y>.02&&y<.034){c.lerp(dark,.35);if(Math.sin(az*36)>.6)c.lerp(light,.5);}
   return c;
  });
  ring(.112,.0085,.007,0x8e6844,shell,6);
  tilt=.05;
 }else if(kind==='skull'){
  // Orcish iron skull cap: crudely hammered, a raised strap cross over the crown, a riveted rim.
  const [p,s]=dome(.112,.082,{th:.008});
  const strap=(x,z)=>Math.abs(x)<.011||Math.abs(z)<.011;
  lathe(p,s,(x,y,z)=>{const c=mottle(x,y,z,.7,70);if(strap(x,z)&&y>.012)c.lerp(dark,.4);return c;},v=>{
   if(v.y<.004)return;
   radial(v,stoneNoise(v.x,v.y,v.z,60)*.004);v.y+=stoneNoise(v.z,v.x,v.y,60)*.003;
   if(strap(v.x,v.z)){radial(v,.003);v.y+=.004;}
  });
  ring(.113,.0085,.009,0x33302d,shell,6);
  studs(10,.121,.01,.0065,0x5a5652,.3);
  tilt=.08;
 }else if(kind==='hard hat'){
  // Dwarvish iron helm: a rounded iron dome with a raised comb, a riveted base and a broad brim.
  const [p,s]=dome(.098,.112,{th:.007});
  lathe(p,s,(x,y,z)=>{const c=mottle(x,y,z,.45);if(Math.abs(x)<.01&&y>.03)c.lerp(light,.35);return c;},v=>{if(Math.abs(v.x)<.01&&v.y>.03)v.y+=.006*(1-Math.abs(v.x)/.01);});
  lathe([V(.09,.014),V(.13,.006),V(.156,0),V(.16,.006),V(.134,.013),V(.094,.024)],99,(x,y,z)=>mottle(x,y,z,.4));
  studs(12,.1,.028,.0055,0x5c5752);
 }else if(kind==='fedora'){
  // A felt fedora: pinched crown with a centre dent, a dark ribbon and a brim that curls up at the sides.
  const p=[V(.084,0),V(.12,.002),V(.15,.004),V(.157,.009),V(.15,.013),V(.12,.012),V(.092,.016),V(.088,.06),V(.085,.098),V(.072,.111),
   V(.046,.113),V(.022,.101),V(0,.095),V(0,.089),V(.03,.095),V(.06,.105),V(.076,.094),V(.08,.05),V(.078,.004),V(.084,0)];
  lathe(p,13,(x,y,z)=>{const c=mottle(x,y,z,.3,25);if(y>.016&&y<.04&&Math.hypot(x,z)<.095)c.copy(C(0x1c1612));return c;},v=>{
   const r=Math.hypot(v.x,v.z);
   if(r>.093){const k=((r-.093)/.064)**2;v.y+=.028*k*(v.x/r)**2-.006*k*(v.z/r)**2;}
   if(v.y>.055&&v.z>0)v.x*=1-.22*((v.y-.055)/.06)*(v.z/.09);
  },56);
 }else if(kind==='conical'){
  // Conical hat: a tall felt cone on a brim, its tip slumped over. The cornuthaum and dunce cap share it.
  const p=[V(.092,0),V(.158,.002),V(.164,.008),V(.158,.012),V(.1,.014)];
  for(let i=0;i<=18;i++){const t=i/18;p.push(V(i===18?0:.098*(1-t)**1.15,.014+.3*t));}
  const s=p.length;
  for(let i=18;i>=0;i--){const t=i/18;p.push(V(i===18?0:.09*(1-t)**1.15,.008+.29*t));}
  lathe(p,s,(x,y,z)=>{const c=mottle(x,y,z,.35,25);if(y>.014&&y<.036)c.lerp(dark,.4);return c;},v=>{if(v.y>.14){const k=((v.y-.14)/.18)**2;v.x+=.1*k;v.y-=.05*k;}});
 }else if(kind==='tinfoil'){
  // Tinfoil hat: a crumpled, peaked foil dome, bright on the ridges and grey in the creases.
  const [p,s]=dome(.1,.1,{point:.5,th:.004,steps:22});
  lathe(p,s,(x,y,z)=>{const n=stoneNoise(x*4,y*4,z*4,45);return base.clone().lerp(n>0?light:dark,Math.min(1,Math.abs(n)*1.3));},v=>{
   if(v.y<.003)return;
   const n=stoneNoise(v.x*4,v.y*4,v.z*4,45)*.009+stoneNoise(v.z*9,v.x*9,v.y*9,40)*.004;radial(v,n);v.y+=n*.6;
  },64);
  tilt=.12;
 }else if(kind==='pot'){
  // Dented pot, worn upside down: a lipped iron pot with two dents, soot and rust, its handle on the floor.
  const p=[V(.118,0),V(.121,.006),V(.113,.012),V(.11,.1),V(.1,.112),V(0,.114),V(0,.106),V(.1,.104),V(.103,.012),V(.108,.004),V(.118,0)];
  const dents=[[.07,.09,.05],[-.1,.05,-.04]].map(a=>new THREE.Vector3(...a));
  lathe(p,6,(x,y,z)=>{const c=mottle(x,y,z,.5,30);const n=stoneNoise(x*7,y*7,z*7,30);if(n>.45)c.lerp(C(0x7a4a2a),.6);if(y>.105)c.lerp(dark,.35);return c;},v=>{
   for(const d of dents){const k=1-v.distanceTo(d)/.05;if(k>0){radial(v,-.016*k*k);if(v.y>.1)v.y-=.012*k*k;}}
  },40);
  const handle=new THREE.CylinderGeometry(.011,.013,.16,10);handle.rotateZ(Math.PI/2);handle.translate(.19,.012,0);piece(handle,0x3a3632);
  const loop=new THREE.TorusGeometry(.014,.004,6,12);loop.rotateX(Math.PI/2);loop.translate(.272,.012,0);piece(loop,0x3a3632);
  shift=-.055;
 }else{
  // Steel helmets: a flared dome with a raised brow band; the four shuffled ones add a plume,
  // etched gilding, a brass comb or a visor.
  const [p,s]=dome(.104,kind==='visored'?.14:.125,{flare:.06,th:.006});
  const brow=y=>y>.012&&y<.03,gold=C(0xc9a24e);
  lathe(p,s,(x,y,z)=>{
   const c=mottle(x,y,z,.25,20),az=Math.atan2(z,x);
   if(brow(y))c.lerp(dark,.25);
   if(kind==='etched'){
    if(y>.036&&y<.115&&Math.abs(Math.sin(az*7+3*Math.sin(y*55)))<.13)c.lerp(gold,.85);
    if(brow(y)&&Math.abs(Math.sin(az*40))<.25)c.lerp(gold,.8);
   }
   return c;
  },v=>{if(brow(v.y))radial(v,.003);});
  if(kind==='plumed'){
   const sock=new THREE.CylinderGeometry(.011,.014,.022,10);sock.translate(0,.13,0);piece(sock,0xb08a42);
   // A sweep of red feathers from the socket back over the crown.
   for(let i=0;i<10;i++){
    const t=i/9,f=new THREE.SphereGeometry(.026-.008*t,8,6);f.scale(.45,.55,1.7);
    f.rotateX(-.3-1.1*t);f.translate(0,.15+.03*Math.sin(Math.PI*t*.8)-.05*t*t,.02-.17*t);
    piece(f,i%2?0x8c1c1a:0xb42c26,trim);
   }
  }else if(kind==='crested'){
   // A brass comb over the crown, front to back, following the dome.
   const H=.125,R=.104,top=z=>H*Math.sqrt(Math.max(0,1-(z/R)**2)),shape=new THREE.Shape();
   shape.moveTo(-.092,top(-.092)-.008);
   for(let i=0;i<=20;i++){const z=-.095+.19*i/20;shape.lineTo(z,top(z)+.052*Math.sin(Math.PI*i/20)**.6);}
   for(let i=20;i>=0;i--){const z=-.092+.184*i/20;shape.lineTo(z,top(z)-.008);}
   const comb=new THREE.ExtrudeGeometry(shape,{depth:.01,bevelEnabled:false,curveSegments:2});comb.translate(0,0,-.005);comb.rotateY(Math.PI/2);
   piece(comb,0xb08a42);
  }else if(kind==='visored'){
   // A face plate over the front with an eye slit and breathing holes, pinned at the temples.
   const plate=new THREE.CylinderGeometry(.111,.109,.075,32,6,true,-.95,1.9);plate.translate(0,.055,0);
   shell.push(finish(plate,(x,y,z)=>{
    const c=mottle(x,y,z,.25,20),az=Math.atan2(x,z);
    if(Math.abs(y-.075)<.0045&&Math.abs(az)<.8)c.copy(inside);
    if(y>.03&&y<.052&&Math.abs(az)<.5&&Math.sin(az*38)>.55&&Math.sin(y*420)>.3)c.copy(inside);
    return c;
   }));
   for(const x of [-.114,.114]){const pin=new THREE.SphereGeometry(.008,8,6);pin.translate(x,.075,0);piece(pin,0x5a6268);}
  }
 }
 const tilted=new THREE.Matrix4().makeTranslation(shift,0,0).multiply(new THREE.Matrix4().makeRotationX(tilt));
 const meshes=[[shell,shellMat],[trim,trimMat]].filter(([parts])=>parts.length).map(([parts,material])=>{
  const geo=mergeGeometries(parts);parts.forEach(p=>p.dispose());geo.applyMatrix4(tilted);return [geo,material];
 });
 const box=new THREE.Box3();meshes.forEach(([geo])=>{geo.computeBoundingBox();box.union(geo.boundingBox);});
 const helm=new THREE.Group();helm.userData.part='helmet';helm.rotation.y=(hashLook(kind)%628)/100;g.add(helm);
 for(const [geo,material] of meshes){
  geo.translate(0,-box.min.y,0);
  const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;helm.add(m);
 }
}

// Figurines. The bridge names every one just "figurine" (no monster, no appearance), so
// all of them share one carving: a seated guardian beast in worn green soapstone on an
// octagonal plinth, facing +z. Every part is coloured per vertex and merged into one mesh.
function buildFigurine({g,materials}){
 const C=hex=>new THREE.Color(hex),v=(x,y,z)=>new THREE.Vector3(x,y,z);
 const STONE={base:C(0x8d9c84),light:C(0xc6cfb6),dark:C(0x465044)},PLINTH={base:C(0x6e6a5e),light:C(0x9c9684),dark:C(0x353229)},INK=C(0x1c1f1a);
 const stone=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.58});
 materials.push(stone);
 const parts=[],P=.03;
 // Colour a part from its own normals: noise mottling, dark undersides where parts meet
 // (a cheap stand-in for occlusion) and polish on the upward faces that get handled.
 const put=(geo,{look=STONE,warp,flat,groove,mottle=.55}={})=>{
  geo.deleteAttribute('uv');
  if(warp){
   const w=mergeVertices(geo.deleteAttribute('normal'));geo.dispose();geo=w;
   const p=geo.attributes.position,t=v(0,0,0);
   for(let i=0;i<p.count;i++){warp(t.fromBufferAttribute(p,i));p.setXYZ(i,t.x,t.y,t.z);}
   geo.computeVertexNormals();
  }
  const out=geo.index?geo.toNonIndexed():geo;if(out!==geo)geo.dispose();
  const p=out.attributes.position,n=out.attributes.normal,cols=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),ny=n.getY(i),c=look.base.clone();
   if(flat)c.copy(flat);
   else{
    const s=stoneNoise(x*2.3,y*2.3,z*2.3,55);c.lerp(s>0?look.light:look.dark,Math.abs(s)*mottle);
    if(ny<0)c.lerp(look.dark,-ny*.55);else if(ny>.6)c.lerp(look.light,(ny-.6)*.5);
    if(groove?.(x,y,z))c.lerp(INK,.6);
   }
   cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;
  }
  out.setAttribute('color',new THREE.BufferAttribute(cols,3));parts.push(out);
 };
 const sphere=(r,x,y,z,s=[1,1,1],o={},seg=[16,12])=>{const geo=new THREE.SphereGeometry(r,...seg);geo.scale(...s);geo.translate(x,y,z);put(geo,o);};
 // A tapered limb between two points.
 const limb=(a,b,r0,r1,o)=>{
  const d=b.clone().sub(a),geo=new THREE.CylinderGeometry(r1,r0,d.length(),10);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v(0,1,0),d.clone().normalize()));
  geo.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);put(geo,o);
 };
 // The plinth: an eight-sided block with a chamfered cap and a band of carved glyphs.
 const block=new THREE.CylinderGeometry(.078,.086,.022,8);block.rotateY(Math.PI/8);block.translate(0,.011,0);
 put(block,{look:PLINTH,groove:(x,y,z)=>y>.007&&y<.016&&Math.sin(Math.atan2(z,x)*40)>.55&&Math.sin(y*900)>-.2});
 const cap=new THREE.CylinderGeometry(.07,.078,.008,8);cap.rotateY(Math.PI/8);cap.translate(0,.026,0);put(cap,{look:PLINTH});
 // Haunches and hind paws tucked under.
 sphere(.04,0,P+.034,-.022,[1.05,.9,1.1]);
 for(const s of [-1,1]){
  sphere(.028,s*.031,P+.03,-.016,[.72,1,1.25]);
  sphere(.014,s*.036,P+.008,.018,[1,.6,1.5],{groove:(x,y,z)=>z>.03&&Math.abs(Math.sin((x-s*.036)*260))<.18});
 }
 // Chest, straight front legs and paws.
 sphere(.035,0,P+.082,.01,[.95,1.25,.9]);
 for(const s of [-1,1]){
  limb(v(s*.021,P+.006,.042),v(s*.02,P+.078,.02),.012,.011);
  sphere(.015,s*.021,P+.008,.05,[1,.62,1.35],{groove:(x,y,z)=>z>.058&&Math.abs(Math.sin((x-s*.021)*260))<.18});
 }
 // A curled mane around the neck: bumps pushed out along the surface.
 const maneCentre=v(0,P+.122,.016);
 sphere(.041,maneCentre.x,maneCentre.y,maneCentre.z,[1.12,1,.86],{warp:q=>{
  const d=q.clone().sub(maneCentre),r=d.length()||1;
  q.addScaledVector(d,(Math.max(0,stoneNoise(q.x*3,q.y*3,q.z*3,70))*.009)/r);
 },mottle:.7},[20,14]);
 // The head: brow, muzzle, nose, carved eyes, ears and a snarling mouth.
 sphere(.029,0,P+.138,.036,[1,.95,1]);
 sphere(.018,0,P+.126,.062,[1.2,.82,1]);
 sphere(.0065,0,P+.134,.079,[1.3,.8,1],{flat:STONE.dark});
 sphere(.009,0,P+.113,.07,[1.4,.45,.8],{flat:INK});
 for(const s of [-1,1]){
  sphere(.011,s*.012,P+.152,.052,[1.2,.5,.8]);
  sphere(.0052,s*.013,P+.145,.061,[1,1,.6],{flat:INK},[10,8]);
  const ear=new THREE.ConeGeometry(.009,.02,8);ear.rotateZ(-s*.45);ear.translate(s*.024,P+.163,.028);put(ear);
  // Tusks at the corners of the mouth.
  const tusk=new THREE.ConeGeometry(.0028,.011,6);tusk.rotateX(Math.PI);tusk.translate(s*.008,P+.107,.072);put(tusk,{flat:STONE.light});
 }
 // A tail curling up over the back, ending in a flame-like tuft.
 const tail=new THREE.CatmullRomCurve3([v(.01,P+.02,-.055),v(.03,P+.03,-.08),v(.035,P+.07,-.078),v(.018,P+.1,-.058),v(.004,P+.098,-.04)]);
 put(new THREE.TubeGeometry(tail,24,.0075,8,false));
 const tip=tail.getPoint(1);
 sphere(.014,tip.x,tip.y+.004,tip.z,[1,1.2,1],{warp:q=>{q.y+=Math.max(0,stoneNoise(q.x*4,q.z*4,q.y,90))*.006;},mottle:.7});
 const geo=mergeGeometries(parts);parts.forEach(p=>p.dispose());
 const mesh=new THREE.Mesh(geo,stone);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part='figurine';g.add(mesh);
 g.rotation.y=.45;
}

// Cram, K- and C-rations. Food names are never shuffled, so each gets its own look instead of
// the food-ration parcel: a twine-tied stack of cram biscuits on a linen wrap, a waxed K-ration
// carton with printed panels and a red tear strip, and C-ration tins with a P-38 opener. Every
// part is painted per vertex and merged into one matte and one metal mesh.
function buildRation(kind,{g,materials}){
 const C=hex=>new THREE.Color(hex),v=(x,y,z)=>new THREE.Vector3(x,y,z);
 const matte=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:kind==='k'?.62:.88});
 const tin=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.5,roughness:.48});
 materials.push(matte,tin);
 const lists={matte:[],tin:[]},c=new THREE.Color(),e=new THREE.Euler(),m=new THREE.Matrix4();
 // Paint a part in its own frame, then place it.
 const put=(geo,paint,{which='matte',rot=[0,0,0],at=[0,0,0]}={})=>{
  const out=geo.index?geo.toNonIndexed():geo;if(out!==geo)geo.dispose();
  out.deleteAttribute('uv');
  const p=out.attributes.position,n=out.attributes.normal,cols=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   paint(c,p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i));
   cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;
  }
  out.setAttribute('color',new THREE.BufferAttribute(cols,3));
  out.applyMatrix4(m.makeRotationFromEuler(e.set(...rot,'YXZ')).setPosition(...at));
  lists[which].push(out);
 };
 const flat=hex=>{const f=C(hex);return col=>col.copy(f);};
 // A closed cord around a box of half-size (hx,hz) from y0 to y1, in the x (or z) plane.
 const cord=(h,y0,y1,alongX,r=.0045)=>{
  const q=[[0,y1+r],[h-.012,y1+r*.6],[h+r,y1-.012],[h+r,y0+.006],[0,y0-r*.2],[-h-r,y0+.006],[-h-r,y1-.012],[-h+.012,y1+r*.6]]
   .map(([a,y])=>alongX?v(a,y,0):v(0,y,a));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(q,true),48,r,6,true);
 };
 if(kind==='cram'){
  // A square of linen, its corners turned up a little, under three hard-baked biscuits.
  const linen=C(0xcfc2a0),weave=C(0xa89b7a);
  const wrap=new THREE.PlaneGeometry(.28,.24,24,20);wrap.rotateX(-Math.PI/2);
  const wp=wrap.attributes.position;
  for(let i=0;i<wp.count;i++){const x=wp.getX(i),z=wp.getZ(i),k=Math.max(Math.abs(x)/.14,Math.abs(z)/.12);wp.setY(i,.0015+.018*Math.max(0,k-.72)**2/.08+.002*stoneNoise(x*9,0,z*9,3));}
  wrap.computeVertexNormals();
  put(wrap,(col,x,y,z)=>col.copy(linen).lerp(weave,.35*(Math.abs(Math.sin(x*420))*Math.abs(Math.sin(z*420)))+.25*Math.max(0,stoneNoise(x*4,0,z*4,7))),{rot:[0,.35,0]});
  const crust=C(0xc99a52),bake=C(0x8a5a26),pale=C(0xe2c58a),hole=C(0x5a3616);
  const W=.17,D=.12,T=.034;
  for(let i=0;i<3;i++){
   const biscuit=new RoundedBoxGeometry(W,T,D,3,.012);
   const bp=biscuit.attributes.position;
   // Hand-cut: a slight wobble so no two biscuits stack flush.
   for(let j=0;j<bp.count;j++){const x=bp.getX(j),z=bp.getZ(j);bp.setX(j,x*(1+.03*Math.sin(z*40+i)));bp.setY(j,bp.getY(j)+.003*stoneNoise(x*6,i,z*6,5));}
   biscuit.computeVertexNormals();
   put(biscuit,(col,x,y,z,nx,ny)=>{
    col.copy(crust).lerp(pale,.3*Math.max(0,stoneNoise(x*5+i,0,z*5,9)));
    // Browned edges, and docker holes in a grid on the top face.
    const edge=Math.max(Math.abs(x)/(W/2),Math.abs(z)/(D/2));
    col.lerp(bake,Math.min(1,Math.max(0,(edge-.8)*3)+(ny<.5?.35:0)));
    if(ny>.9){const gx=Math.abs(((x+W/2)/.03)%1-.5),gz=Math.abs(((z+D/2)/.03)%1-.5);if(gx<.16&&gz<.16&&edge<.8)col.lerp(hole,.8);}
   },{at:[(i-1)*.006,.004+T/2+i*(T+.002),(1-i)*.005],rot:[0,(i-1)*.07,0]});
  }
  const top=.004+3*(T+.002);
  // Twine tied both ways round the stack, knotted on top with two loose ends.
  const twine=C(0xb89a64),dark=C(0x7a6038);
  const paintTwine=(col,x,y,z)=>col.copy(twine).lerp(dark,.5*Math.abs(Math.sin((x+y+z)*600)));
  put(cord(W/2+.004,.009,top,true),paintTwine);
  put(cord(D/2+.004,.009,top,false),paintTwine);
  put(new THREE.SphereGeometry(.011,10,8),paintTwine,{at:[0,top+.004,0]});
  for(const s of [-1,1])put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v(0,top+.004,0),v(s*.03,top+.006,.02),v(s*.05,top+.002,.045)]),10,.0035,5,false),paintTwine);
  // Crumbs on the cloth.
  for(const [x,z] of [[.11,.05],[-.1,.08],[.08,-.09],[-.12,-.04],[.12,.09]])put(new THREE.IcosahedronGeometry(.006,0),flat(0xb8894a),{at:[x,.005,z],rot:[x*20,z*30,0]});
  g.rotation.y=-.3;
 }else if(kind==='k'){
  // A waxed cardboard carton: buff with an olive border, a central panel of block lettering on
  // the lid, olive bands round the sides and a red tear strip across one end.
  const W=.27,H=.075,D=.155;
  const buff=C(0xcdb27a),olive=C(0x4d5a2c),ink=C(0x2a2418),wax=C(0xe6d3a0),scuff=C(0x9a8456);
  const carton=new THREE.BoxGeometry(W,H,D,40,6,24);
  put(carton,(col,x,y,z,nx,ny,nz)=>{
   col.copy(buff).lerp(wax,.25*Math.max(0,stoneNoise(x*6,y*6,z*6,8)));
   const u=x/(W/2),w=z/(D/2),h=y/(H/2);
   if(ny>.9){
    if(Math.max(Math.abs(u),Math.abs(w))>.86)col.copy(olive);
    // Three lines of "text": blocky glyphs from a hash of the cell.
    for(const [row,len] of [[.42,.5],[.02,.72],[-.4,.36]]){
     if(Math.abs(w-row)<.13&&Math.abs(u)<len){const cell=Math.floor((u+1)*14);if((cell*7919+Math.round(row*10))%5!==0)col.copy(ink);}
    }
   }else if(ny<-.9)col.lerp(scuff,.5);
   else{
    if(Math.abs(h)<.28)col.copy(olive);
    // Side lettering in the olive band on the long faces.
    if(Math.abs(nz)>.9&&Math.abs(h)<.14&&Math.abs(u)<.55&&Math.floor((u+1)*16)%3!==0)col.copy(wax);
   }
   // Worn corners.
   if(Math.abs(u)>.96&&Math.abs(w)>.9||Math.abs(h)>.93&&(Math.abs(u)>.97||Math.abs(w)>.94))col.lerp(scuff,.6);
  },{at:[0,H/2,0]});
  // The tear strip and its pull tab, and the end flap's seam.
  put(new THREE.BoxGeometry(.012,.0025,D+.003),flat(0xa8261e),{at:[W/2-.035,H+.0012,0]});
  put(new THREE.BoxGeometry(.018,.002,.02),flat(0xc23a2e),{at:[W/2-.035,H+.002,D/2+.01],rot:[-.35,0,0]});
  put(new THREE.BoxGeometry(.002,H*.6,D*.92),flat(0x8a7648),{at:[-W/2-.0008,H/2,0]});
  g.rotation.y=.25;
 }else{
  // C-rations: a tall olive-drab tin standing, a flat one on its side, and a P-38 opener.
  const drab=C(0x4f5530),darkDrab=C(0x353920),steel=C(0xb6bcbc),rust=C(0x7a4a24),ink=C(0x151510);
  const can=(r,h,{stencil=true}={})=>{
   const geo=new THREE.CylinderGeometry(r,r,h,40,12,false);
   const p=geo.attributes.position;
   // Two rolled beads pressed into the wall.
   for(let i=0;i<p.count;i++){const y=p.getY(i),rr=Math.hypot(p.getX(i),p.getZ(i));if(rr>r*.99){const k=1-.045*(Math.exp(-(((y-h*.2)/(h*.05))**2))+Math.exp(-(((y+h*.2)/(h*.05))**2)));p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);}}
   geo.computeVertexNormals();
   return [geo,(col,x,y,z,nx,ny)=>{
    col.copy(drab).lerp(darkDrab,.4*Math.max(0,stoneNoise(x*9,y*9,z*9,6)));
    const a=Math.atan2(x,z);
    if(Math.abs(ny)>.9){
     // Lid rings, and bright steel where the paint has worn off the rim.
     const rr=Math.hypot(x,z)/r;
     if(Math.sin(rr*38)>.75)col.lerp(darkDrab,.6);
     if(rr>.9)col.lerp(steel,.55);
    }else{
     if(stencil&&Math.abs(y)<h*.12&&Math.abs(a)<.9&&Math.floor((a+.9)*9)%4!==3)col.copy(ink);
     if(stencil&&Math.abs(y-h*.12)<h*.05&&Math.abs(a)<.5&&Math.floor((a+.5)*12)%3!==0)col.copy(ink);
     if(Math.abs(Math.abs(y)-h/2)<h*.04)col.lerp(steel,.45);
     if(y<-h*.38&&stoneNoise(x*14,y*14,z*14,5)>.45)col.lerp(rust,.7);
    }
   }];
  };
  const rim=(r)=>new THREE.TorusGeometry(r,.0035,6,40);
  const R=.05,Hc=.1;
  const [tall,paintTall]=can(R,Hc);
  put(tall,paintTall,{which:'tin',at:[-.035,Hc/2,-.015]});
  for(const y of [.0035,Hc-.0035])put(rim(R+.0005),(col,x,y2,z)=>col.copy(steel).lerp(darkDrab,.4),{which:'tin',rot:[Math.PI/2,0,0],at:[-.035,y,-.015]});
  // The flat tin lies on its side against the tall one.
  const r2=.045,h2=.04,[flatCan,paintFlat]=can(r2,h2,{stencil:false});
  put(flatCan,paintFlat,{which:'tin',rot:[0,.5,Math.PI/2],at:[.085,r2+.0045,.035]});
  for(const s of [-1,1]){
   const off=v(s*h2/2,0,0).applyEuler(new THREE.Euler(0,.5,0,'YXZ'));
   put(rim(r2+.0005),col=>col.copy(steel).lerp(darkDrab,.4),{which:'tin',rot:[0,.5+Math.PI/2,0],at:[.085+off.x,r2+.0045,.035+off.z]});
  }
  // The P-38: a stamped blade with a hole, its cutting tooth folded out on a hinge.
  const opener=C(0x9aa0a0),worn=C(0x6c7070);
  const paintOp=(col,x,y,z)=>col.copy(opener).lerp(worn,.4*Math.abs(stoneNoise(x*30,0,z*30,4)));
  put(new THREE.BoxGeometry(.038,.0022,.012),paintOp,{which:'tin',rot:[0,-.7,0],at:[.03,.0011,.085]});
  put(new THREE.TorusGeometry(.0038,.0012,4,12),paintOp,{which:'tin',rot:[Math.PI/2,-.7,0],at:[.047,.0022,.1]});
  put(new THREE.BoxGeometry(.016,.002,.007),paintOp,{which:'tin',rot:[0,-.7+1.1,0],at:[.011,.0026,.073]});
  g.rotation.y=-.2;
 }
 for(const [which,material] of [['matte',matte],['tin',tin]]){
  const list=lists[which];if(!list.length)continue;
  const geo=mergeGeometries(list);list.forEach(p=>p.dispose());
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=`ration-${which}`;g.add(mesh);
 }
}

// Apples, oranges and pears, up to three to a stack. Each fruit is a shaped body painted per
// vertex: the apple a lobed red lathe with yellow streaks, a sunny cheek and pale lenticels,
// sunk at the stalk; the orange a slightly squashed ball with a pitted peel, a navel and a
// green star calyx; the pear a leaning lathe with a waisted neck, russet speckles and a blush.
// Stalks and leaves are painted too. Two meshes in all (skin, and stalk and leaf), however many
// fruit lie in the stack; the last of two or three lies tipped over.
// Melons are long watermelons with jagged dark stripes, a creamy ground spot underneath and a
// dry stem with a curled tendril; two at most lie side by side. Bananas are swept along a
// crescent with five ridges, a green neck, sugar spots and a black tip; two or three lie
// together as one hand fanned from a shared crown, all in the skin mesh.
// Carrots are ringed, slightly bent roots with pale lenticel dashes, a green shoulder and a hair
// of a tail; their stalks fan out from a cut crown and flop onto the floor, cut leaflets and all.
// Up to three lie side by side.
function buildFruit(kind,count,{g,materials}){
 const C=hex=>new THREE.Color(hex),v=(x,y,z)=>new THREE.Vector3(x,y,z);
 const skin=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:kind==='orange'?.74:kind==='apple'?.4:kind==='melon'?.45:.6});
 const plant=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.8,side:THREE.DoubleSide});
 materials.push(skin,plant);
 const lists={skin:[],plant:[]},c=new THREE.Color();
 const smooth=(a,b,t)=>{const x=Math.min(1,Math.max(0,(t-a)/(b-a)));return x*x*(3-2*x);};
 // Paint a part in the fruit's own frame; placing it comes later.
 const paint=(geo,fn)=>{
  const p=geo.attributes.position,n=geo.attributes.normal,cols=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){fn(c,p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i));cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;}
  geo.setAttribute('color',new THREE.BufferAttribute(cols,3));return geo;
 };
 // A lathe from a smoothed profile, then warped per vertex and welded so the seam and poles shade smoothly.
 const body=(profile,warp,rows=26,segs=40)=>{
  const pts=new THREE.SplineCurve(profile.map(([x,y])=>new THREE.Vector2(x,y))).getPoints(rows).map(q=>new THREE.Vector2(Math.max(0,q.x),q.y));
  pts[0].x=0;pts[pts.length-1].x=0;
  let geo=new THREE.LatheGeometry(pts,segs);geo.deleteAttribute('uv');geo.deleteAttribute('normal');
  geo=mergeVertices(geo,1e-5);
  const p=geo.attributes.position,t=new THREE.Vector3();
  for(let i=0;i<p.count;i++){warp(t.fromBufferAttribute(p,i));p.setXYZ(i,t.x,t.y,t.z);}
  geo.computeVertexNormals();return geo;
 };
 const stalk=(points,r)=>{
  const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),10,r,6,false);geo.deleteAttribute('uv');
  const top=points[points.length-1].y,bottom=points[0].y;
  return paint(geo,(col,x,y)=>col.copy(C(0x5a3d22)).lerp(C(0x2e1f12),smooth(bottom,top,y)*.7));
 };
 // A leaf along +x from its base: pointed, folded up along the midrib and drooping at the tip.
 const leaf=(L,W)=>{
  const geo=new THREE.PlaneGeometry(1,1,10,4);geo.deleteAttribute('uv');
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const u=p.getX(i)+.5,s=p.getY(i)*2,w=W*Math.sin(Math.PI*Math.min(1,u*1.08))**.8;
   p.setXYZ(i,u*L,Math.abs(s)*w*.35-.3*L*u*u,s*w);
  }
  geo.computeVertexNormals();
  return paint(geo,(col,x,y,z)=>{
   const edge=Math.abs(z)/(W+1e-6);
   col.copy(C(0x4a8a2c)).lerp(C(0x2f5f1e),smooth(.5,1,edge)*.6);
   if(Math.abs(z)<W*.07)col.lerp(C(0x9cc46a),.7);
   else if(Math.abs(Math.sin(x/L*18-Math.abs(z)/W*5))<.12)col.lerp(C(0x7aa850),.35);
  });
 };
 const fruit=(seed)=>{
  const parts={skin:[],plant:[]};
  const hash=k=>{const s=Math.sin(seed*127.1+k*311.7)*43758.5453;return s-Math.floor(s);};
  const side=hash(1)*Math.PI*2;
  if(kind==='apple'){
   const R=.086;
   const geo=body([[0,.016],[.024,.006],[.052,.005],[.074,.022],[.086,.052],[.087,.086],[.078,.115],[.06,.135],[.036,.144],[.018,.139],[.006,.128],[0,.123]],t=>{
    const a=Math.atan2(t.z,t.x),k=1+.035*Math.cos(5*a+seed)*smooth(.07,0,t.y)+.025*Math.sin(a+side);
    t.x*=k;t.z*=k;
   });
   parts.skin.push(paint(geo,(col,x,y,z)=>{
    const a=Math.atan2(z,x),r=Math.hypot(x,z);
    col.copy(C(0xa0161a));
    // Streaks running from the stalk, a green-gold cheek that faced away from the sun, lenticels.
    col.lerp(C(0xd1452c),.45*Math.max(0,Math.sin(a*21+Math.sin(y*70+seed)*1.6)));
    col.lerp(C(0xc9b63c),.85*smooth(-.1,-.85,Math.cos(a-side))*smooth(.13,.06,y));
    if(y>.11&&r<.045)col.lerp(C(0x8e9a38),.75*smooth(.045,.012,r));
    if(y<.02)col.lerp(C(0x5f4a26),.6);
    if(stoneNoise(x*90,y*90,z*90,4.1)>.72)col.lerp(C(0xf0d79a),.55);
   }));
   const top=.125;
   parts.plant.push(stalk([v(0,top-.004,0),v(.004,top+.02,.002),v(.012,top+.04,0)],.0042));
   if(hash(2)>.35){
    const l=leaf(.075,.024);
    l.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(.25,hash(3)*1.5+.5,.1,'YXZ')).setPosition(.006,top+.022,.001));
    parts.plant.push(l);
   }
  }else if(kind==='orange'){
   const R=.078;
   let geo=new THREE.SphereGeometry(R,44,30);geo.deleteAttribute('uv');geo.deleteAttribute('normal');
   geo=mergeVertices(geo,1e-5);
   const p=geo.attributes.position,d=new THREE.Vector3();
   for(let i=0;i<p.count;i++){
    d.fromBufferAttribute(p,i).normalize();
    // A pitted peel, a small sunk navel underneath and a dimple round the calyx.
    let r=R*(1+.012*stoneNoise(d.x*6,d.y*6,d.z*6,9)-.006*Math.abs(stoneNoise(d.x*14+seed,d.y*14,d.z*14,7)));
    r-=R*(.09*smooth(-.93,-1,d.y)+.05*smooth(.95,1,d.y));
    p.setXYZ(i,d.x*r,d.y*r*.93+R*.93,d.z*r);
   }
   geo.computeVertexNormals();
   parts.skin.push(paint(geo,(col,x,y,z)=>{
    col.copy(C(0xe8761a)).lerp(C(0xf29a2e),.35*(stoneNoise(x*20,y*20,z*20,3)*.5+.5));
    if(stoneNoise(x*120,y*120,z*120,5)>.55)col.lerp(C(0xb9520e),.5);
    if(y>R*1.7)col.lerp(C(0xb89a28),.4*smooth(R*1.7,R*1.86,y));
    if(y<R*.12)col.lerp(C(0xa84a10),.55);
   }));
   const top=R*1.86-R*.05*.93;
   const calyx=[new THREE.CylinderGeometry(.009,.011,.008,8)];
   calyx[0].translate(0,top+.003,0);
   for(let i=0;i<5;i++){
    const a=i/5*Math.PI*2+seed,petal=new THREE.SphereGeometry(.009,8,4);
    petal.scale(1.6,.3,.9);petal.translate(.011,0,0);petal.rotateY(a);petal.translate(0,top+.001,0);calyx.push(petal);
   }
   const merged=mergeGeometries(calyx.map(q=>{q.deleteAttribute('uv');return q;}));calyx.forEach(q=>q.dispose());
   parts.plant.push(paint(merged,(col,x,y)=>col.copy(C(0x5e6a2a)).lerp(C(0x3a3a1c),smooth(top+.004,top+.007,y))));
  }else if(kind==='melon'){
   // Built upright along y, then laid on its side along x and settled a little flat underneath.
   const L=.32;
   const geo=body([[0,0],[.05,.008],[.092,.034],[.117,.08],[.125,.14],[.123,.2],[.11,.25],[.08,.29],[.04,.314],[0,.32]],t=>{
    const a=Math.atan2(t.z,t.x);t.x*=1+.015*Math.sin(3*a+seed);t.z*=1+.015*Math.sin(3*a+seed);t.y-=L/2;
   },36,72);
   geo.rotateZ(Math.PI/2);
   const p=geo.attributes.position;
   for(let i=0;i<p.count;i++)if(p.getY(i)<0)p.setY(i,p.getY(i)*.86);
   geo.computeVertexNormals();
   parts.skin.push(paint(geo,(col,x,y,z)=>{
    const u=x/(L/2),a=Math.atan2(z,y);
    // Stripes run end to end, wandering and ragged-edged; they pinch together at the ends.
    const wobble=.35*Math.sin(u*5.5+seed+a*2)+.18*stoneNoise(x*30,y*30,z*30,5);
    const stripe=smooth(.05,.35,Math.cos(a*8+wobble*2.2));
    col.copy(C(0x86b555)).lerp(C(0xa6c874),.4*(stoneNoise(x*50,y*50,z*50,3)*.5+.5));
    col.lerp(C(0x1f4a1e),stripe*.92);
    if(stoneNoise(x*90,y*90,z*90,4)>.7)col.lerp(C(0x356a2c),.35);
    // The ground spot where it lay in the field, and the stem and blossom scars.
    col.lerp(C(0xd6c878),.85*smooth(-.07,-.105,y)*smooth(1,.55,Math.abs(u)));
    if(u<-.965)col.lerp(C(0x7a6a36),.7);
    if(u>.975)col.lerp(C(0x9a8a52),.6);
   }));
   const x0=-L/2+.004;
   parts.plant.push(stalk([v(x0+.004,.006,0),v(x0-.012,.014,.004),v(x0-.026,.024,.002),v(x0-.034,.03,-.006)],.0055));
   // A dried tendril curling off the stem.
   const curl=[];for(let i=0;i<=14;i++){const t=i/14,a=t*Math.PI*3.2;curl.push(v(x0-.022-.012*t-.009*Math.sin(a)*t,.02+.009*t,.004+.02*t+.009*Math.cos(a)*t));}
   parts.plant.push(stalk(curl,.0016));
  }else if(kind==='banana'){
   // Each banana is swept from the crown at the origin along a crescent bowed toward +z.
   const hand=Math.max(1,Math.min(3,count|0));
   const path=new THREE.CatmullRomCurve3([v(0,0,0),v(.045,0,.004),v(.11,0,.022),v(.175,0,.058),v(.225,.006,.108),v(.245,.012,.14)]);
   const rows=44,cols=30,Y=v(0,1,0);
   const radius=u=>(u<.12?.0095-.004*u:.009+.016*smooth(.12,.32,u))*(1-.78*smooth(.76,1,u));
   const one=(k,yaw,lift)=>{
    const pos=[],cols3=[],idx=[],P=v(0,0,0),T=v(0,0,0),N=v(0,0,0),q=v(0,0,0);
    const rot=new THREE.Matrix4().makeRotationY(yaw).setPosition(0,lift,0);
    const colour=(u,theta,w)=>{
     c.copy(C(0xe9c83a)).lerp(C(0xf3dc6a),.35*Math.max(0,Math.cos(5*theta)));
     c.lerp(C(0x93a83a),.8*smooth(.34,.12,u));
     if(u<.1)c.lerp(C(0x6e6a34),.6);
     if(u>.2&&u<.93&&stoneNoise(w.x*150+k*9,w.y*150,w.z*150,5)>.62)c.lerp(C(0x5a3818),.7);
     if(u>.93)c.lerp(C(0x2a2016),smooth(.93,.97,u));
     cols3.push(c.r,c.g,c.b);
    };
    for(let r=0;r<=rows;r++){
     const u=r/rows,rad=radius(u);
     path.getPointAt(u,P);path.getTangentAt(u,T);N.crossVectors(T,Y).normalize();
     for(let c2=0;c2<cols;c2++){
      const th=c2/cols*Math.PI*2,rr=rad*(1+.07*Math.cos(5*th));
      q.copy(P).addScaledVector(N,rr*Math.cos(th)).addScaledVector(Y,rr*Math.sin(th)*.9).applyMatrix4(rot);
      pos.push(q.x,q.y,q.z);colour(u,th,q);
     }
    }
    for(let r=0;r<rows;r++)for(let c2=0;c2<cols;c2++){const a=r*cols+c2,b=r*cols+(c2+1)%cols;idx.push(a,a+cols,b,b,a+cols,b+cols);}
    // Caps: the cut crown and the blunt black tip.
    const base=pos.length/3;
    path.getPointAt(0,P);q.copy(P).applyMatrix4(rot);pos.push(q.x,q.y,q.z);c.set(0x7a6a3a);cols3.push(c.r,c.g,c.b);
    path.getPointAt(1,P);path.getTangentAt(1,T);q.copy(P).addScaledVector(T,.004).applyMatrix4(rot);pos.push(q.x,q.y,q.z);c.set(0x2a2016);cols3.push(c.r,c.g,c.b);
    for(let c2=0;c2<cols;c2++){const n2=(c2+1)%cols;idx.push(base,c2,n2);idx.push(base+1,rows*cols+n2,rows*cols+c2);}
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(cols3,3));
    geo.setIndex(idx);geo.computeVertexNormals();return geo;
   };
   // A hand fans out from the crown; the middle banana rides a little higher.
   for(let k=0;k<hand;k++){const f=k-(hand-1)/2;parts.skin.push(one(k,f*-.36,hand===3&&f===0?.012:0));}
   if(hand>1){const crown=new THREE.SphereGeometry(.013,10,8);crown.deleteAttribute('uv');crown.scale(1.2,.9,1.4);
    parts.skin.push(paint(crown,(col2)=>col2.set(0x6a5e30)));}
  }else if(kind==='carrot'){
   // Built upright with the tip at the origin, then laid along x with the shoulder toward -x
   // and the axis at y=0; the tops are built lying down, so they can droop to the floor.
   const L=.24+.03*hash(5),bend=(hash(6)-.5)*.024,R0=.029;
   const geo=body([[0,0],[.003,.008],[.008,.035],[.014,.08],[.02,.13],[.025,.175],[.028,.205],[.029,.222],[.026,.232],[.018,.238],[.008,.241],[0,.242]].map(([r,y])=>[r,y*L/.242]),t=>{
    const a=Math.atan2(t.z,t.x),u=t.y/L;
    // Growth rings pinch the root at uneven heights; it bends a little and is not quite round.
    const ring=Math.max(0,Math.cos(t.y*150+.9*Math.sin(a*2+seed)+seed))**10;
    const k=(1-.07*ring*smooth(.05,.2,u)*smooth(1,.9,u))*(1+.04*Math.sin(2*a+seed));
    t.x*=k;t.z=t.z*k+bend*Math.sin(Math.PI*u);
   },40,32);
   const tail=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v(0,.004,0),v(.002,-.012,bend*.3),v(-.004,-.026,bend*.3+.004),v(-.002,-.038,bend*.3+.01)]),8,.0012,4,false);
   tail.deleteAttribute('uv');
   const root=[geo,tail].map(q=>paint(q,(col,x,y,z)=>{
    const u=y/L,a=Math.atan2(z,x);
    col.copy(C(0xe2701c)).lerp(C(0xf08a2a),.35*(stoneNoise(x*40,y*40,z*40,3)*.5+.5));
    // Ring grooves, pale lenticel dashes across them, a sun-greened shoulder and a dark tip.
    col.lerp(C(0xa4481a),.5*Math.max(0,Math.cos(y*150+.9*Math.sin(a*2+seed)+seed))**10);
    if(Math.abs(Math.sin(y*75+seed))>.94&&stoneNoise(x*60,y*6,z*60,5)>.25)col.lerp(C(0xf4c68a),.55);
    col.lerp(C(0x6e7a2c),.75*smooth(.93,.995,u));
    col.lerp(C(0x7a4a22),.6*smooth(.1,-.05,u));
    if(stoneNoise(x*25+seed,y*25,z*25,8)>.62)col.lerp(C(0x6b4a2c),.45);
   }));
   const lay=new THREE.Matrix4().makeRotationZ(Math.PI/2).setPosition(L/2,0,0);
   root.forEach(q=>q.applyMatrix4(lay));
   parts.skin.push(...root);
   // The crown: a cut ring of stalk bases, then the feathery tops fanned out and flopping to the floor.
   const x0=-L/2,floor=-R0+.001;
   const crown=new THREE.CylinderGeometry(.012,.017,.008,12);crown.deleteAttribute('uv');crown.rotateZ(Math.PI/2);crown.translate(x0-.003,0,0);
   parts.plant.push(paint(crown,(col)=>col.set(0x5e7a2a)));
   const green=(col,x)=>col.copy(C(0x6f9e3a)).lerp(C(0x4c7a28),smooth(x0,x0-.12,x));
   const Xa=v(1,0,0),dir=v(0,0,0),T=v(0,0,0),P=v(0,0,0),q=new THREE.Quaternion(),mm=new THREE.Matrix4(),sc=v(1,1,1);
   const stems=4+(hash(7)>.5?1:0);
   for(let s=0;s<stems;s++){
    const f=s/(stems-1)-.5,len=.075+.035*hash(10+s),spread=f*.9+(hash(20+s)-.5)*.2,rise=.012+.012*hash(30+s);
    const end=v(x0-len*Math.cos(spread),floor+.004,len*Math.sin(spread));
    const curve=new THREE.CatmullRomCurve3([v(x0-.004,.004*Math.sin(f*3),f*.012),v(x0-len*.35*Math.cos(spread),rise,len*.35*Math.sin(spread)),v(x0-len*.72*Math.cos(spread),rise*.6,len*.72*Math.sin(spread)),end]);
    const tube=new THREE.TubeGeometry(curve,12,.0024,5,false);tube.deleteAttribute('uv');
    parts.plant.push(paint(tube,green));
    // Finely cut leaflets in pairs along the outer half of each stalk, and one at the tip.
    for(const [t,side] of [[.45,1],[.45,-1],[.62,1],[.62,-1],[.78,1],[.78,-1],[1,0]]){
     curve.getPointAt(t,P);curve.getTangentAt(t,T);
     dir.copy(T).applyAxisAngle(v(0,1,0),side*.9).normalize();
     const l=leaf(side?.028:.034,side?.007:.008);
     sc.set(1,1,1);q.setFromUnitVectors(Xa,dir);
     l.applyMatrix4(mm.compose(P,q,sc));
     const p=l.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)<floor)p.setY(i,floor);
     parts.plant.push(l);
    }
   }
  }else{
   const lean=hash(4)>.5?1:-1;
   const geo=body([[0,.012],[.03,.004],[.058,.018],[.072,.046],[.068,.08],[.05,.11],[.037,.136],[.032,.16],[.025,.18],[.012,.192],[0,.19]],t=>{
    const a=Math.atan2(t.z,t.x),k=1+.03*Math.sin(2*a+seed);t.x*=k;t.z*=k;
    t.x+=lean*.014*smooth(.08,.19,t.y);
   });
   parts.skin.push(paint(geo,(col,x,y,z)=>{
    const a=Math.atan2(z,x);
    col.copy(C(0xb9b43c)).lerp(C(0xd6c850),.35*(stoneNoise(x*14,y*14,z*14,4)*.5+.5));
    col.lerp(C(0xb4502c),.6*smooth(.1,.95,Math.cos(a-side))*smooth(.02,.07,y)*smooth(.15,.09,y));
    if(stoneNoise(x*110,y*110,z*110,6)>.6)col.lerp(C(0x8a6630),.6);
    if(y>.165)col.lerp(C(0x8a6a36),.6*smooth(.165,.19,y));
    if(y<.018)col.lerp(C(0x4e3a20),.7);
   }));
   const x0=lean*.014;
   parts.plant.push(stalk([v(x0,.184,0),v(x0+lean*.004,.21,.003),v(x0+lean*.016,.232,-.002),v(x0+lean*.03,.24,-.004)],.0038));
  }
  return parts;
 };
 // A bunch of bananas is one hand; melons are big enough that two fill the tile.
 const n=kind==='banana'?1:Math.max(1,Math.min(kind==='melon'?2:3,count|0));
 const spots=kind==='carrot'?[[[0,0]],[[0,-.035],[.03,.035]],[[-.01,-.062],[.025,0],[-.005,.062]]][n-1]:kind==='melon'?[[[0,0]],[[-.03,-.135],[.04,.135]]][n-1]:[[[0,0]],[[-.055,-.02],[.07,.035]],[[-.07,-.045],[.075,-.03],[-.005,.085]]][n-1];
 const e=new THREE.Euler(),m=new THREE.Matrix4(),box=new THREE.Box3();
 spots.forEach(([x,z],i)=>{
  const parts=fruit(i*1.7+.4),tipped=n>1&&i===n-1;
  // The last of a stack has rolled over: a pear lies on its side, a round fruit just leans.
  const roll=kind==='banana'||kind==='carrot'?0:tipped?(kind==='pear'?1.35:kind==='melon'?.12:.55):.06*(i%2?1:-1);
  m.makeRotationFromEuler(e.set(0,kind==='melon'?.15+i*.3:kind==='carrot'?(i-1)*.14:i*2.1+.3,roll,'YXZ'));
  const all=[...parts.skin,...parts.plant];all.forEach(q=>q.applyMatrix4(m));
  box.makeEmpty();all.forEach(q=>{q.computeBoundingBox();box.union(q.boundingBox);});
  all.forEach(q=>q.translate(x,-box.min.y,z));
  lists.skin.push(...parts.skin);lists.plant.push(...parts.plant);
 });
 // Centre the stack on the tile; a pear lying on its side reaches well past its spot.
 box.makeEmpty();for(const q of [...lists.skin,...lists.plant]){q.computeBoundingBox();box.union(q.boundingBox);}
 const mx=(box.min.x+box.max.x)/2,mz=(box.min.z+box.max.z)/2;
 for(const q of [...lists.skin,...lists.plant])q.translate(-mx,0,-mz);
 for(const [which,material] of [['skin',skin],['plant',plant]]){
  const list=lists[which];if(!list.length){material.dispose();materials.splice(materials.indexOf(material),1);continue;}
  const geo=mergeGeometries(list);list.forEach(q=>q.dispose());
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=`fruit-${which}`;g.add(mesh);
 }
 g.rotation.y=.4;
}

// Tin and magic whistles share the look "whistle": a nickel-plated pea whistle lying on its
// side, so its round chamber and flat mouthpiece read from above like a "q". The window over
// the pea is cut in the mouthpiece's outer wall, a ring on a tab holds a braided red lanyard
// that loops out across the floor, and a stamped ring marks the chamber face. The plating is
// rubbed through to brass on the rolled rims. Coloured per vertex and merged into two meshes.
function buildWhistle({g,materials}){
 const C=hex=>new THREE.Color(hex),v=(x,y,z)=>new THREE.Vector3(x,y,z);
 const plate=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.8,roughness:.3});
 const matte=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.85});
 materials.push(plate,matte);
 const lists={plate:[],matte:[]},c=new THREE.Color(),e=new THREE.Euler(),m=new THREE.Matrix4();
 const put=(geo,paint,{which='plate',rot=[0,0,0],at=[0,0,0]}={})=>{
  const out=geo.index?geo.toNonIndexed():geo;if(out!==geo)geo.dispose();
  out.deleteAttribute('uv');
  const p=out.attributes.position,n=out.attributes.normal,cols=new Float32Array(p.count*3);
  out.applyMatrix4(m.makeRotationFromEuler(e.set(...rot,'YXZ')).setPosition(...at));
  // Painted in world space, after placing, so wear and stripes run across parts.
  for(let i=0;i<p.count;i++){
   paint(c,p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i));
   cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;
  }
  out.setAttribute('color',new THREE.BufferAttribute(cols,3));
  lists[which].push(out);
 };
 const nickel=C(0xc6ccd0),shadow=C(0x7d858a),brass=C(0xb48a42),black=C(0x0e0d0c),edge=C(0xeef2f4);
 // Plating: bright on top, darker on the flanks and underneath, worn to brass where noise peaks.
 const plated=(rub=0)=>(col,x,y,z,nx,ny)=>{
  col.copy(nickel).lerp(shadow,Math.max(0,-ny)*.6+(1-Math.abs(ny))*.18);
  const wear=stoneNoise(x*60,y*60,z*60,3)*.5+.5;
  col.lerp(brass,Math.max(0,wear-(1-rub))*2.2);
 };
 const R=.034,H=.03,cx=.02;
 // The chamber, lying on a flat face, with rolled rims at both faces.
 put(new THREE.CylinderGeometry(R,R,H,40,2),plated(.12),{at:[cx,H/2,0]});
 for(const y of [.003,H-.003])put(new THREE.TorusGeometry(R-.0005,.0032,6,40),plated(.45),{rot:[Math.PI/2,0,0],at:[cx,y,0]});
 // A stamped ring and a small boss on the upper face.
 put(new THREE.TorusGeometry(R*.62,.0011,4,32),(col,x,y,z)=>col.copy(shadow).lerp(nickel,.35),{rot:[Math.PI/2,0,0],at:[cx,H+.0002,0]});
 put(new THREE.CylinderGeometry(.006,.007,.0016,16),plated(.3),{at:[cx,H+.0008,0]});
 // The mouthpiece runs off tangent to the chamber's -z side and thins toward the lips.
 const L=.095,W=.017,mouth=new RoundedBoxGeometry(L,H*.92,W,2,.004),mp=mouth.attributes.position;
 for(let i=0;i<mp.count;i++){const t=.5-mp.getX(i)/L;mp.setY(i,mp.getY(i)*(1-.28*t));mp.setZ(i,mp.getZ(i)*(1-.2*t));}
 mouth.computeVertexNormals();
 put(mouth,plated(.2),{at:[cx-L/2,H/2,-R+W/2]});
 // The blowing slot at the tip, and the window: a dark cut with a bright bevelled lip.
 put(new THREE.BoxGeometry(.002,H*.34,.0055),col=>col.copy(black),{at:[cx-L-.0003,H/2,-R+W/2]});
 put(new THREE.BoxGeometry(.018,H*.56,.002),col=>col.copy(black),{at:[cx+.006,H/2,-R-.0004]});
 put(new THREE.BoxGeometry(.0025,H*.56,.0024),col=>col.copy(edge),{at:[cx-.0035,H/2,-R-.0005]});
 // The cork pea, glimpsed through the window.
 put(new THREE.SphereGeometry(.0058,12,8),(col,x,y,z)=>col.copy(C(0xb58a5a)).lerp(C(0x6e4c2c),.4+.3*stoneNoise(x*300,y*300,z*300,2)),{which:'matte',at:[cx+.008,H/2,-R-.0006]});
 // A tab on the far side of the chamber, and the split ring through it.
 put(new THREE.BoxGeometry(.012,.008,.008),plated(.3),{at:[cx+R+.003,.009,0]});
 const ringAt=[cx+R+.016,.0028,.002];
 put(new THREE.TorusGeometry(.012,.0024,6,24),plated(.5),{rot:[Math.PI/2,0,0],at:ringAt});
 // A braided lanyard looping out over the floor from the ring, with a knot where it closes.
 const red=C(0x9a2622),darkRed=C(0x4e1312),pale=C(0xd6c09a);
 const braid=(col,x,y,z,nx,ny,nz)=>{
  const twist=Math.sin((x+z)*520+Math.atan2(ny,nx+nz)*2);
  col.copy(red).lerp(darkRed,.5-.5*twist);
  if(Math.sin((x-z)*260)>.93)col.lerp(pale,.6);
 };
 const r=.0038,loop=[[.078,.07],[.12,.06],[.16,.11],[.15,.17],[.09,.2],[.01,.19],[-.05,.15],[-.03,.09],[.03,.06]];
 const lanyard=[v(ringAt[0]+.01,r,ringAt[2]+.004),v(.09,r,.03),...loop.map(([x,z],i)=>v(x,r+.0012*(i%2),z)),v(.075,r,.04),v(ringAt[0]+.011,r,ringAt[2]+.006)];
 put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lanyard),96,r,6,false),braid,{which:'matte'});
 put(new THREE.SphereGeometry(.0075,12,8),braid,{which:'matte',at:[.083,.0068,.052]});
 for(const [which,material] of [['plate',plate],['matte',matte]]){
  const list=lists[which];
  const geo=mergeGeometries(list);list.forEach(p=>p.dispose());
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=`whistle-${which}`;g.add(mesh);
 }
 // Centre the whistle and its loop on the tile and set it on the floor.
 const b=new THREE.Box3();g.children.forEach(p=>{p.geometry.computeBoundingBox();b.union(p.geometry.boundingBox);});
 const mid=b.getCenter(v(0,0,0));g.children.forEach(p=>p.geometry.translate(-mid.x,-b.min.y,-mid.z));
 g.rotation.y=.45;
}

// A stethoscope lying on the floor: a steel chest piece with a pale diaphragm in a black rim,
// blue tubing that loops over the floor to a Y, and a steel headset whose two ear tubes are
// held apart by a leaf spring and end in black ear tips. Painted per vertex and merged into
// two meshes (steel and rubber).
function buildStethoscope({g,materials}){
 const C=hex=>new THREE.Color(hex),v=(x,y,z)=>new THREE.Vector3(x,y,z);
 const steelMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.85,roughness:.28});
 const rubberMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.55});
 materials.push(steelMat,rubberMat);
 const lists={steel:[],rubber:[]},c=new THREE.Color(),e=new THREE.Euler(),m=new THREE.Matrix4();
 const put=(geo,paint,{which='steel',rot=[0,0,0],at=[0,0,0]}={})=>{
  const out=geo.index?geo.toNonIndexed():geo;if(out!==geo)geo.dispose();
  out.deleteAttribute('uv');
  const p=out.attributes.position,n=out.attributes.normal,cols=new Float32Array(p.count*3);
  out.applyMatrix4(m.makeRotationFromEuler(e.set(...rot,'YXZ')).setPosition(...at));
  for(let i=0;i<p.count;i++){
   paint(c,p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i));
   cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;
  }
  out.setAttribute('color',new THREE.BufferAttribute(cols,3));
  lists[which].push(out);
 };
 const bright=C(0xdfe4e8),dim=C(0x7a8288),black=C(0x151515),pale=C(0xd9dcd6);
 // Polished steel: bright facing up, dim on the flanks, with faint brushing streaks.
 const steel=(col,x,y,z,nx,ny)=>{
  col.copy(bright).lerp(dim,Math.max(0,-ny)*.7+(1-Math.abs(ny))*.25);
  col.multiplyScalar(.92+.08*Math.sin((x+z)*900));
 };
 const blue=C(0x1f4f86),deep=C(0x0f2744),shine=C(0x6f9ccc);
 // Rubber tubing: a lit ridge along the top, darker underneath.
 const tubing=(col,x,y,z,nx,ny)=>{col.copy(blue).lerp(deep,Math.max(0,-ny)*.8);if(ny>.85)col.lerp(shine,(ny-.85)*3);};
 const rubber=(col,x,y,z,nx,ny)=>col.copy(black).lerp(C(0x3a3a3a),Math.max(0,ny)*.5);
 // The chest piece, diaphragm up: a steel cup, a black rim ring and a pale diaphragm with a stamped ring.
 const cp=[.12,.1],R=.03,H=.012;
 put(new THREE.LatheGeometry([[0,0],[R*.8,0],[R,.003],[R,H*.8],[R*.9,H]].map(([a,b])=>new THREE.Vector2(a,b)),32),steel,{at:[cp[0],0,cp[1]]});
 put(new THREE.TorusGeometry(R*.93,.0035,8,36),rubber,{which:'rubber',rot:[Math.PI/2,0,0],at:[cp[0],H,cp[1]]});
 put(new THREE.CylinderGeometry(R*.9,R*.9,.0012,32),(col,x,y,z)=>{
  const d=Math.hypot(x-cp[0],z-cp[1]);col.copy(pale);if(Math.abs(d-R*.55)<.0016)col.lerp(dim,.5);
 },{which:'rubber',at:[cp[0],H+.0004,cp[1]]});
 // The stem runs off the side toward the tubing, with a collar where the tube slides on.
 const stemLen=.03;
 put(new THREE.CylinderGeometry(.0045,.0055,stemLen,12),steel,{rot:[0,0,Math.PI/2],at:[cp[0]-R-stemLen/2+.004,.0072,cp[1]]});
 put(new THREE.CylinderGeometry(.007,.007,.006,14),steel,{rot:[0,0,Math.PI/2],at:[cp[0]-R-stemLen+.006,.0072,cp[1]]});
 // Main tubing loops out over the floor and ends at the Y.
 const r=.0065,start=v(cp[0]-R-stemLen+.002,.0072,cp[1]),Y=v(-.005,r,-.015);
 const main=[start,v(.05,r,.11),v(-.01,r,.14),v(-.09,r,.11),v(-.13,r,.04),v(-.11,r,-.03),v(-.05,r,-.03),Y];
 put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(main),96,r,8,false),tubing,{which:'rubber'});
 put(new THREE.SphereGeometry(.0078,12,8),tubing,{which:'rubber',at:[Y.x,.0078,Y.z]});
 // Two branches, then the steel ear tubes with collars at the joins, curling in to the ear tips.
 const rb=.005,rs=.0034,ears=[];
 for(const [branch,metal] of [
  [[Y,v(.03,rb,-.02),v(.065,rb,-.035)],[v(.065,rs,-.035),v(.11,rs,-.06),v(.15,rs,-.1),v(.16,rs,-.14),v(.14,rs,-.16)]],
  [[Y,v(.005,rb,-.05),v(.02,rb,-.08)],[v(.02,rs,-.08),v(.045,rs,-.12),v(.075,rs,-.155),v(.11,rs,-.17),v(.125,rs,-.155)]]
 ]){
  put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(branch),24,rb,8,false),tubing,{which:'rubber'});
  const curve=new THREE.CatmullRomCurve3(metal);ears.push(curve);
  put(new THREE.TubeGeometry(curve,48,rs,8,false),steel);
  const j=metal[0],t=curve.getTangent(0),col=new THREE.CylinderGeometry(.0062,.0062,.008,12);
  col.applyMatrix4(m.makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(v(0,1,0),t)));
  put(col,steel,{at:[j.x,.0062,j.z]});
  // Soft black ear tip, pushed onto the end of the tube.
  const end=curve.getPoint(1),dir=curve.getTangent(1),tip=new THREE.SphereGeometry(.0075,12,8);
  tip.scale(1,1.3,1);tip.applyMatrix4(m.makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(v(0,1,0),dir)));
  put(tip,rubber,{which:'rubber',at:[end.x+dir.x*.004,.0075,end.z+dir.z*.004]});
 }
 // The leaf spring bridging the two ear tubes near their base.
 const a=ears[0].getPoint(.25),b=ears[1].getPoint(.3),d=b.clone().sub(a);
 const spring=new THREE.BoxGeometry(.0035,.006,d.length());
 spring.applyMatrix4(m.makeRotationY(Math.atan2(d.x,d.z)));
 put(spring,steel,{at:[(a.x+b.x)/2,.0045,(a.z+b.z)/2]});
 for(const [which,material] of [['steel',steelMat],['rubber',rubberMat]]){
  const list=lists[which];
  const geo=mergeGeometries(list);list.forEach(p=>p.dispose());
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=`stethoscope-${which}`;g.add(mesh);
 }
 const box=new THREE.Box3();g.children.forEach(p=>{p.geometry.computeBoundingBox();box.union(p.geometry.boundingBox);});
 const mid=box.getCenter(v(0,0,0));g.children.forEach(p=>p.geometry.translate(-mid.x,-box.min.y,-mid.z));
 g.rotation.y=-.3;
}

// The tin opener, dropped on its side: a turned beech handle with a brass ferrule and rivet,
// a flat forged shank ending in a hooked piercing beak with filed bright edges and a spur that
// levers on the can's rim, and a leather thong looped through an eye in the butt. The knife
// tilts so the ferrule end and the beak both touch the floor; the thong lies flat. Painted
// per vertex and merged into two meshes (wood and leather; steel and brass).
function buildTinOpener({g,materials}){
 const C=hex=>new THREE.Color(hex),v=(x,y,z)=>new THREE.Vector3(x,y,z);
 const woodMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.72});
 const steelMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.8,roughness:.36});
 materials.push(woodMat,steelMat);
 const lists={wood:[],steel:[]},c=new THREE.Color();
 const tilt=new THREE.Matrix4().makeRotationZ(-.127);
 // Paint in the knife's own frame, then tilt it (the thong is placed already tilted).
 const put=(geo,paint,which='steel',tilted=true)=>{
  const out=geo.index?geo.toNonIndexed():geo;if(out!==geo)geo.dispose();
  out.deleteAttribute('uv');
  const p=out.attributes.position,n=out.attributes.normal,cols=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   paint(c,p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i));
   cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;
  }
  out.setAttribute('color',new THREE.BufferAttribute(cols,3));
  if(tilted)out.applyMatrix4(tilt);
  lists[which].push(out);
 };
 const beech=C(0x9a6a3e),grain=C(0x5a3719),worn=C(0xc9a26e),grime=C(0x35220f);
 // Beech: grain lines running along the handle, polished pale where the palm rests, grimy ends.
 const wood=(col,x,y,z,nx,ny)=>{
  const k=Math.sin(Math.atan2(z,y)*5+x*55+Math.sin(x*140)*.8);
  col.copy(beech).lerp(grain,Math.max(0,k)*.45);
  col.lerp(worn,Math.max(0,ny)*Math.exp(-(((x+.065)/.025)**2))*.45);
  col.lerp(grime,Math.max(0,1-Math.min(x+.112,-.012-x)/.01)*.35);
 };
 const blued=C(0x3f474d),grey=C(0x6f7a80),bright=C(0xd6dce0),ground=C(0x9ba5ab),rust=C(0x7a4424),ink=C(0x1c2024);
 // Blued forged steel: filed bright on every bevel, ground paler at the beak, a stamped
 // maker's mark on the shank and a few rust freckles.
 const steel=(col,x,y,z,nx,ny)=>{
  col.copy(blued).lerp(grey,Math.max(0,ny)*.45);
  if(x>.06)col.lerp(ground,Math.min(1,(x-.06)/.015)*.55);
  if(Math.abs(ny)<.7)col.lerp(bright,.7);
  else if(x>.004&&x<.024&&Math.abs(z)<.003)col.lerp(ink,Math.sin(x*1900)>0?.6:.25);
  const r=Math.sin(x*431+z*977)*Math.sin(x*1213-z*611+y*300);
  if(r>.72&&Math.abs(ny)>.7)col.lerp(rust,(r-.72)*2.5);
 };
 const brassBase=C(0xb88a3e),brassHi=C(0xe6c77a),brassLo=C(0x5a4018);
 const brass=(col,x,y,z,nx,ny)=>col.copy(brassBase).lerp(brassHi,Math.max(0,ny)*.55).lerp(brassLo,Math.max(0,-ny)*.5);
 const hide=C(0x6a3e22),hideDark=C(0x2e1a0e),hideHi=C(0x9a6440);
 const leather=(col,x,y,z,nx,ny)=>col.copy(hide).lerp(hideDark,Math.max(0,-ny)*.6).lerp(hideHi,Math.max(0,ny-.6)*1.2);
 // The handle, turned along -x from the ferrule: a swelling belly, a bead near the butt and a domed end.
 const profile=[[0,0],[.0105,0],[.0118,.004],[.0135,.012],[.0152,.03],[.0156,.05],[.015,.066],[.0136,.08],[.0146,.086],[.0134,.092],[.0098,.098],[0,.1]];
 const handle=new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),28);
 handle.rotateZ(Math.PI/2);handle.translate(-.012,0,0);put(handle,wood,'wood');
 // The ferrule (slimmer than the belly, so it rides clear of the floor) with rolled edges, a rivet head and a washer where the shank leaves.
 const ferrule=new THREE.CylinderGeometry(.0138,.0138,.014,28);ferrule.rotateZ(Math.PI/2);ferrule.translate(-.019,0,0);put(ferrule,brass);
 for(const x of [-.0258,-.0122]){const bead=new THREE.TorusGeometry(.0138,.0012,6,28);bead.rotateY(Math.PI/2);bead.translate(x,0,0);put(bead,brass);}
 const head=new THREE.SphereGeometry(.0028,10,6,0,Math.PI*2,0,Math.PI/2);head.translate(-.019,.0136,0);put(head,brass);
 const washer=new THREE.CylinderGeometry(.0105,.0085,.004,20);washer.rotateZ(Math.PI/2);washer.translate(-.0102,0,0);put(washer,steel);
 // The shank and beak: one flat forging, its outline in (x, z), extruded through its thickness.
 const outline=[[-.02,.0066],[0,.0062],[.03,.0056],[.06,.0052],[.074,.0045],[.082,.0015],[.0875,-.0045],[.0905,-.0125],[.0905,-.021],
  [.0875,-.0295],[.082,-.037],[.0775,-.042],[.0772,-.036],[.0775,-.029],[.0765,-.022],[.073,-.0155],[.067,-.0105],[.06,-.0075],[.05,-.0058],
  [.036,-.0056],[.032,-.013],[.027,-.0148],[.028,-.0095],[.025,-.0058],[0,-.0062],[-.02,-.0066]];
 const T=.0032,blade=new THREE.ExtrudeGeometry(new THREE.Shape(outline.map(([x,z])=>new THREE.Vector2(x,z))),
  {depth:T,bevelEnabled:true,bevelThickness:.0005,bevelSize:.0005,bevelSegments:1,curveSegments:4});
 blade.rotateX(Math.PI/2);blade.translate(0,T/2,0);put(blade,steel);
 // A screw eye in the butt for the thong.
 const eye=new THREE.TorusGeometry(.0045,.0012,6,16);eye.translate(-.1165,0,0);put(eye,steel);
 const screw=new THREE.CylinderGeometry(.0011,.0011,.008,6);screw.rotateZ(Math.PI/2);screw.translate(-.109,0,0);put(screw,steel);
 // Where the tilted knife meets the floor, and where the eye ended up.
 const low=Math.min(...Object.values(lists).flat().map(geo=>{geo.computeBoundingBox();return geo.boundingBox.min.y;}));
 const P=v(-.1165,-.0045,0).applyMatrix4(tilt),f=low+.0022;
 const thong=new THREE.CatmullRomCurve3([P,v(P.x-.012,f+.004,P.z+.01),v(P.x-.034,f,P.z+.022),v(P.x-.052,f,P.z+.004),
  v(P.x-.04,f,P.z-.018),v(P.x-.016,f+.003,P.z-.012)],true);
 put(new THREE.TubeGeometry(thong,64,.0022,6,true),leather,'wood',false);
 const knot=new THREE.SphereGeometry(.0042,10,8);knot.scale(1.3,.8,1);knot.translate(P.x-.013,f+.0035,P.z-.001);put(knot,leather,'wood',false);
 for(const [which,material] of [['wood',woodMat],['steel',steelMat]]){
  const list=lists[which];
  const geo=mergeGeometries(list);list.forEach(p=>p.dispose());
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=`tin-opener-${which}`;g.add(mesh);
 }
 const box=new THREE.Box3();g.children.forEach(p=>{p.geometry.computeBoundingBox();box.union(p.geometry.boundingBox);});
 const mid=box.getCenter(v(0,0,0));g.children.forEach(p=>p.geometry.translate(-mid.x,-box.min.y,-mid.z));
 g.rotation.y=.45;
}

// The saddle: a stock saddle set down on a striped wool blanket. One shaped leather sheet
// makes the seat, the raised cantle and fork and the skirts that fall to the blanket; a
// laced horn sits on the fork. Stirrup leathers run off both skirts to irons lying on the
// floor, a mohair cinch curls forward to its buckle, and conchos pin the saddle strings.
// Everything is coloured per vertex (worn seat, quilting, tooled skirts, stitching, fleece
// underneath) and merged into one leather mesh and one metal mesh.
function buildSaddle({g,materials}){
 const C=hex=>new THREE.Color(hex),v=(x,y,z)=>new THREE.Vector3(x,y,z);
 const leatherMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.68});
 const metalMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.85,roughness:.32});
 materials.push(leatherMat,metalMat);
 const lists={leather:[],metal:[]},c=new THREE.Color();
 const put=(geo,paint,which='leather')=>{
  geo.deleteAttribute('uv');
  if(paint){
   const p=geo.attributes.position,n=geo.attributes.normal,cols=new Float32Array(p.count*3);
   for(let i=0;i<p.count;i++){
    paint(c,p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i));
    cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;
   }
   geo.setAttribute('color',new THREE.BufferAttribute(cols,3));
  }
  lists[which].push(geo);
 };
 const sm=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
 // The blanket: a thick wool pad, rumpled towards its edges, striped red, cream and black at both ends.
 const BX=.21,BZ=.185,BT=.012;
 const blanket=new THREE.BoxGeometry(2*BX,BT,2*BZ,20,1,16);
 {const p=blanket.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),edge=sm(.6,1,Math.max(Math.abs(x)/BX,Math.abs(z)/BZ));
   p.setY(i,p.getY(i)+BT/2+.003*edge*(Math.sin(x*37+z*11)*.5+.5));}
  blanket.computeVertexNormals();}
 const red=C(0x8c2a1c),cream=C(0xd8c8a4),black=C(0x221a16),indigo=C(0x2e3a5c);
 put(blanket,(col,x,y,z,nx,ny)=>{
  const t=Math.abs(x)/BX;
  col.copy(t>.9?red:t>.84?cream:t>.8?black:t>.72?indigo:t>.68?cream:red);
  // A stepped cream diamond in the field.
  if(t<.6&&Math.abs(x)/.12+Math.abs(z)/.14<1&&Math.abs(x)/.12+Math.abs(z)/.14>.7)col.copy(cream);
  col.multiplyScalar(.88+.12*Math.sin(x*190+Math.sin(z*90)*2));
  if(ny<-.5)col.multiplyScalar(.6);
 });
 // The leather sheet: a box mapped onto the saddle's surface, u along its length (+x is the
 // fork), s across it. Its top is the seat and skirts; its underside is fleece.
 const L=.165,thick=.011;
 const seatY=u=>.098+.012*u*u;
 const ridge=u=>.058*sm(-.45,-1,u)+.03*sm(.45,.95,u);
 const halfW=u=>.16-.05*Math.max(0,u)**2-.015*Math.max(0,-u)**3;
 const surf=(u,s)=>{const a=Math.abs(s);return v(u*L*(1-.14*s**4),seatY(u)+ridge(u)*(1-sm(.28,.6,a))-sm(.38,1,a)*(seatY(u)-.03),s*halfW(u));};
 const surfNormal=(u,s)=>{const du=surf(u+.01,s).sub(surf(u-.01,s)),ds=surf(u,s+.01).sub(surf(u,s-.01));const n=ds.cross(du).normalize();return n.y<0?n.negate():n;};
 const tan=C(0x8a5230),grain=C(0x6a3a1e),worn=C(0xb68050),tool=C(0x4a2812),stitch=C(0xdcc8a0),edgeC=C(0x3a1e0e),fleece=C(0xd6c7a4),fleeceLo=C(0xa08c66);
 const sheet=new THREE.BoxGeometry(1,1,1,28,1,22);
 {const p=sheet.attributes.position,n=sheet.attributes.normal,cols=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   const u=p.getX(i)*2,s=p.getZ(i)*2,top=p.getY(i)>0,a=Math.abs(s),P=surf(u,s);
   if(Math.abs(n.getY(i))<.5)c.copy(edgeC);
   else if(!top)c.copy(fleece).lerp(fleeceLo,Math.abs(Math.sin(u*47+s*29)*Math.sin(u*23-s*61))*.6);
   else{
    c.copy(tan).lerp(grain,Math.abs(Math.sin(u*23+s*31)*Math.sin(u*57-s*19))*.35);
    if(a<.36&&Math.abs(u)<.62){
     // A palm-polished seat, quilted in diamonds.
     c.lerp(worn,(1-a/.36)*(1-Math.abs(u)/.62)*.6);
     const q=x=>Math.abs(x-Math.round(x));
     if(Math.min(q(u*3.2+s*4.5),q(u*3.2-s*4.5))<.07)c.lerp(tool,.55);
    }
    if(Math.abs(a-.4)<.03&&Math.abs(u)<.8&&Math.sin(u*120)>0)c.lerp(stitch,.75);
    if(a>.46){
     // Tooled scrollwork on the skirts, and a stitched border near their edge.
     const k=Math.sin(u*38+Math.sin(s*20)*1.5)*Math.sin(s*26+Math.sin(u*30));
     if(k>.72)c.lerp(tool,.6);
     if((a>.9&&a<.95||Math.abs(u)>.92&&Math.abs(u)<.96)&&Math.sin((u+s)*140)>0)c.lerp(stitch,.7);
    }
    // Rubbed pale along the cantle and fork crests.
    if(a<.3&&Math.abs(u)>.85)c.lerp(worn,.45*(1-a/.3));
   }
   cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;
   p.setXYZ(i,P.x,P.y+(p.getY(i)-.5)*thick,P.z);
  }
  sheet.setAttribute('color',new THREE.BufferAttribute(cols,3));sheet.computeVertexNormals();}
 put(sheet);
 const leather=(base,lo=edgeC,hi=worn)=>(col,x,y,z,nx,ny)=>col.copy(base).lerp(lo,Math.max(0,-ny)*.6).lerp(hi,Math.max(0,ny-.6)*.9);
 // Rolled bindings along the cantle and fork edges.
 for(const u of [-1,1]){
  const pts=[];for(let i=0;i<=10;i++)pts.push(surf(u,-.55+i*.11).add(v(0,.001-thick*.3,0)));
  put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),16,.0055,6,false),leather(C(0x5a3018)));
 }
 // The horn on the fork: a rawhide-wrapped neck and a flat cap, leaning forward.
 const hornProfile=[[.001,0],[.016,0],[.013,.01],[.011,.026],[.013,.032],[.027,.036],[.028,.042],[.024,.046],[.001,.047]];
 const horn=new THREE.LatheGeometry(hornProfile.map(([r,h])=>new THREE.Vector2(r,h)),20);
 horn.rotateZ(-.25);{const P=surf(.84,0);horn.translate(P.x,P.y-.006,P.z);}
 put(horn,(col,x,y,z,nx,ny)=>{col.copy(C(0x6a3a1e));if(ny>.6)col.lerp(worn,.7);else if(Math.sin(y*900)>.3)col.lerp(C(0xc9b48a),.55);});
 // A ribbon of strap along a path; its width lies across the path, level where it can.
 const ribbon=(pts,w,h,steps=24)=>{
  const curve=new THREE.CatmullRomCurve3(pts),pos=[],idx=[];
  for(let i=0;i<=steps;i++){
   const t=curve.getTangent(i/steps),p=curve.getPoint(i/steps);
   const side=v(-t.z,0,t.x).normalize(),n=side.clone().cross(t).normalize();
   const k=[side.clone().multiplyScalar(w/2).addScaledVector(n,h/2),side.clone().multiplyScalar(-w/2).addScaledVector(n,h/2),
    side.clone().multiplyScalar(-w/2).addScaledVector(n,-h/2),side.clone().multiplyScalar(w/2).addScaledVector(n,-h/2)];
   for(let f=0;f<4;f++)for(const q of [k[f],k[(f+1)%4]])pos.push(p.x+q.x,p.y+q.y,p.z+q.z);
  }
  for(let i=0;i<steps;i++)for(let f=0;f<4;f++){const a=i*8+f*2,b=a+1,a2=a+8,b2=b+8;idx.push(a,a2,b,b,a2,b2);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(pos.length/3*2),2));
  return geo;
 };
 const iron=C(0x5c6268),ironHi=C(0xb4bcc2),silver=C(0xc4c8cc),silverLo=C(0x6a6e72);
 const ironPaint=(col,x,y,z,nx,ny)=>col.copy(iron).lerp(ironHi,Math.max(0,ny)*.6);
 for(const side of [-1,1]){
  // A stirrup leather over the skirt and down to an iron lying on the floor.
  const x0=-.012,zIron=side*.235;
  const along=[.72,.86].map(s=>surf(-.08,side*s).add(surfNormal(-.08,side*s).multiplyScalar(.003)));
  const edge=surf(-.08,side).add(v(0,.002,side*.004));
  put(ribbon([...along,edge,v(x0,.016,side*.19),v(x0,.0035,side*.2),v(x0,.0025,side*.209)],.024,.003),leather(C(0x7a4526)));
  const loop=[[-.03,.025],[-.032,0],[-.02,-.022],[0,-.028],[.02,-.022],[.032,0],[.03,.025],[0,.027]].map(([x,z])=>v(x0+x,.0035,zIron-side*z));
  put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loop,true),40,.0035,6,true),ironPaint,'metal');
  const tread=new THREE.BoxGeometry(.056,.003,.012);tread.translate(x0,.002,zIron+side*.02);put(tread,ironPaint,'metal');
  // Rigging dees and a pair of conchos with saddle strings on each skirt.
  const dee=new THREE.TorusGeometry(.013,.0025,6,16);
  {const P=surf(.38,side*.7),n=surfNormal(.38,side*.7);dee.rotateX(Math.PI/2);dee.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v(0,1,0),n));dee.translate(...P.addScaledVector(n,.003).toArray());}
  put(dee,ironPaint,'metal');
  for(const u of [-.72,.62]){
   const P=surf(u,side*.78),n=surfNormal(u,side*.78),q=new THREE.Quaternion().setFromUnitVectors(v(0,1,0),n);
   const disc=new THREE.CylinderGeometry(.011,.012,.003,14);disc.applyQuaternion(q);disc.translate(...P.clone().addScaledVector(n,.002).toArray());
   put(disc,(col,x,y,z,nx,ny)=>col.copy(silver).lerp(silverLo,Math.abs(Math.sin(Math.hypot(x-P.x,z-P.z)*1400))*.4),'metal');
   const end=surf(u,side);
   for(const dx of [-.006,.006])put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([P.clone().addScaledVector(n,.004),
    end.clone().add(v(dx,.004,side*.006)),v(end.x+dx*2.4,BT+.0045,end.z+side*.018)]),10,.0016,4,false),leather(C(0x9a6a40)));
  }
 }
 // The cinch: a woven mohair band from the near dee, curling forward along the blanket to its buckle.
 {const dee=surf(.38,-.7).add(surfNormal(.38,-.7).multiplyScalar(.006)),e=surf(.38,-1);
  const band=ribbon([dee,e.clone().add(v(0,.002,-.004)),v(.08,BT+.004,-.172),v(.14,BT+.004,-.15),v(.17,BT+.004,-.1),v(.17,BT+.004,-.06)],.028,.0035,32);
  put(band,(col,x,y,z)=>col.copy(C(0xcfc0a0)).lerp(C(0x7a6a4c),Math.abs(Math.sin((x+z)*420))*.4));
  const buckle=[[-.017,-.011],[.017,-.011],[.017,.011],[-.017,.011]].map(([a,b])=>v(.17+a,BT+.0045,-.048+b));
  put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(buckle,true,'catmullrom',.1),24,.0022,5,true),ironPaint,'metal');
  const tongue=new THREE.CylinderGeometry(.0014,.0014,.02,5);tongue.rotateX(Math.PI/2);tongue.translate(.17,BT+.005,-.052);put(tongue,ironPaint,'metal');}
 for(const [which,material] of [['leather',leatherMat],['metal',metalMat]]){
  const list=lists[which];
  const geo=mergeGeometries(list);list.forEach(p=>p.dispose());
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=`saddle-${which}`;g.add(mesh);
 }
 const box=new THREE.Box3();g.children.forEach(p=>{p.geometry.computeBoundingBox();box.union(p.geometry.boundingBox);});
 const mid=box.getCenter(v(0,0,0));g.children.forEach(p=>p.geometry.translate(-mid.x,-box.min.y,-mid.z));
 g.rotation.y=.2;
}

// The leash: a round-braided leather lead lying in a loose flat coil. Its outer end runs off to
// a hand loop closed by a stitched keeper; its inner end climbs over the coil to a riveted fold
// around a brass swivel snap (eye, barrel, hook and a sprung gate). The braid is modelled as
// two crossing strand spirals (raised ridges, dark grooves, rubbed-pale crowns) and everything
// is coloured per vertex and merged into one leather mesh and one brass mesh.
function buildLeash({g,materials}){
 const C=hex=>new THREE.Color(hex),v=(x,y,z)=>new THREE.Vector3(x,y,z);
 const leatherMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.7});
 const brassMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.85,roughness:.3});
 materials.push(leatherMat,brassMat);
 const lists={leather:[],brass:[]},c=new THREE.Color();
 const put=(geo,paint,which='leather')=>{
  const p=geo.attributes.position,n=geo.attributes.normal,cols=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   paint(c,p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i),i);
   cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;
  }
  geo.setAttribute('color',new THREE.BufferAttribute(cols,3));geo.deleteAttribute('uv');
  lists[which].push(geo);
 };
 const hide=C(0x7a4526),strandB=C(0x5e331a),groove=C(0x24130a),crown=C(0xb0784a),stitch=C(0xd8c49a);
 // A braided tube along a curve: two strand spirals cross, each raised to a ridge between grooves.
 const braid=(curve,segs,R,pitch=.016)=>{
  const radial=10,geo=new THREE.TubeGeometry(curve,segs,R,radial,false),len=curve.getLength();
  const p=geo.attributes.position,uv=geo.attributes.uv,tone=new Float32Array(p.count*2),q=v(0,0,0);
  for(let i=0;i<p.count;i++){
   const s=uv.getX(i)*len/pitch,a=uv.getY(i)*2;
   const k=Math.sin(2*Math.PI*(s+a)),m=Math.sin(2*Math.PI*(s-a)),top=Math.max(k,m);
   tone[i*2]=top;tone[i*2+1]=k>m?1:0;
   const centre=curve.getPointAt(Math.floor(i/(radial+1))/segs,q);
   p.setXYZ(i,...v(p.getX(i),p.getY(i),p.getZ(i)).sub(centre).multiplyScalar(.9+.14*top).add(centre).toArray());
  }
  geo.computeVertexNormals();
  put(geo,(col,x,y,z,nx,ny,nz,i)=>{
   const top=tone[i*2];col.copy(tone[i*2+1]?hide:strandB).lerp(groove,Math.min(.85,Math.max(0,.3-top)*1.1));
   col.lerp(crown,Math.max(0,top-.6)*Math.max(0,ny)*1.4);
   if(ny<-.3)col.multiplyScalar(.7);
  });
 };
 // A stitched leather keeper (a short sleeve) centred at P along dir.
 const keeper=(P,dir,R,L)=>{
  const geo=new THREE.CylinderGeometry(R,R*1.04,L,14,3);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v(0,1,0),dir));geo.translate(P.x,P.y,P.z);
  put(geo,(col,x,y,z,nx,ny)=>{
   const t=v(x,y,z).sub(P).dot(dir)/L;
   col.copy(C(0x4a2814)).lerp(crown,Math.max(0,ny)*.35);
   if(Math.abs(Math.abs(t)-.32)<.07&&Math.sin((x+z)*900+y*900)>0)col.lerp(stitch,.8);
  });
 };
 const R=.0065,y0=R+.0005;
 // The coil: 2.25 flat turns, each a little inside the last, so the turns never touch.
 const T=2.25,spiral=[];
 for(let i=0;i<=64;i++){const t=i/64,a=t*T*Math.PI*2,r=.105-.045*t;spiral.push(v(Math.cos(a)*r,y0,Math.sin(a)*r));}
 // The inner end climbs over the turns and runs outward to the snap.
 const d=v(-.7,0,1).normalize(),inner=spiral.at(-1),hump=s=>{const u=Math.min(1,Math.max(0,s/.012)),w=Math.min(1,Math.max(0,(.1-s)/.022));return Math.min(u*u*(3-2*u),w*w*(3-2*w));};
 const over=[];for(let s=.012;s<=.13;s+=.012)over.push(inner.clone().addScaledVector(d,s).setY(y0+2.4*R*hump(s)));
 // The outer end runs off to the hand loop.
 const J=v(.06,y0,-.18),out=[J,v(.085,y0,-.155),v(.104,y0,-.11),v(.108,y0,-.055)];
 const lead=new THREE.CatmullRomCurve3([...out,...spiral.slice(1),...over],false,'centripetal');
 braid(lead,420,R);
 const end=over.at(-1),toward=v(.06,0,-.18).sub(v(.085,0,-.155)).normalize();
 // Hand loop: a braided oval whose ends meet in the keeper at J.
 const side=v(-toward.z,0,toward.x),loop=[];
 for(let i=0;i<14;i++){const a=i/14*Math.PI*2,f=(1-Math.cos(a))/2;loop.push(J.clone().addScaledVector(toward,.058*f).addScaledVector(side,.032*Math.sin(a)*(0.6+.4*f)));}
 braid(new THREE.CatmullRomCurve3(loop,true,'centripetal'),96,R*.85);
 keeper(J.clone().addScaledVector(toward,.006).setY(R*1.35+.0005),toward,R*1.35,.022);
 // The fold at the snap end: the lead doubles back around the swivel eye, held by a keeper and two rivets.
 const F=end.clone().addScaledVector(d,.012).setY(R*1.35+.0005);keeper(F,d,R*1.35,.024);
 const rivet=new THREE.SphereGeometry(.0026,10,6,0,Math.PI*2,0,Math.PI/2),brass=C(0xb88a3e),brassHi=C(0xf0d488),brassLo=C(0x5a4018);
 const brassPaint=(col,x,y,z,nx,ny)=>col.copy(brass).lerp(brassHi,Math.max(0,ny)**2*.7).lerp(brassLo,Math.max(0,-ny)*.6);
 for(const s of [-.005,.005]){const r=rivet.clone();r.translate(F.x+d.x*s,F.y+R*1.35-.0004,F.z+d.z*s);put(r,brassPaint,'brass');}
 rivet.dispose();
 // The snap, built lying flat along +x from the fold, then turned onto d.
 const snap=[],ly=.0042,S=(geo)=>{snap.push(geo);return geo;};
 const eye=S(new THREE.TorusGeometry(.009,.0026,8,20));eye.rotateX(Math.PI/2);eye.translate(.024,ly,0);
 const barrel=S(new THREE.LatheGeometry([[0,0],[.0035,0],[.0052,.003],[.0058,.009],[.0052,.015],[.0035,.018],[0,.018]].map(([r,h])=>new THREE.Vector2(r,h)),14));
 barrel.rotateZ(-Math.PI/2);barrel.translate(.034,ly,0);
 const hook=[v(.052,ly,0),v(.075,ly,0),v(.09,ly,.004),v(.097,ly,.016),v(.09,ly,.028),v(.077,ly,.03),v(.068,ly,.022)];
 S(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hook,false,'centripetal'),36,.0038,8,false));
 const tip=S(new THREE.SphereGeometry(.0038,8,6));tip.translate(.068,ly,.022);
 const gateA=v(.058,ly,.002),gateB=v(.068,ly,.019),gd=gateB.clone().sub(gateA);
 const gate=S(new THREE.CylinderGeometry(.0018,.0018,gd.length(),6));gate.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v(0,1,0),gd.clone().normalize()));gate.translate(...gateA.clone().add(gateB).multiplyScalar(.5).toArray());
 const thumb=S(new THREE.BoxGeometry(.008,.0035,.005));thumb.translate(.057,ly,-.005);
 const turn=new THREE.Matrix4().makeRotationY(Math.atan2(-d.z,d.x)).setPosition(F.x,0,F.z);
 for(const geo of snap){geo.applyMatrix4(turn);put(geo,brassPaint,'brass');}
 for(const [which,material] of [['leather',leatherMat],['brass',brassMat]]){
  // Every part is an indexed three.js primitive, so they merge as they are.
  const list=lists[which],geo=mergeGeometries(list);list.forEach(p=>p.dispose());
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=`leash-${which}`;g.add(mesh);
 }
 const box=new THREE.Box3();g.children.forEach(p=>{p.geometry.computeBoundingBox();box.union(p.geometry.boundingBox);});
 const mid=box.getCenter(v(0,0,0));g.children.forEach(p=>p.geometry.translate(-mid.x,-box.min.y,-mid.z));
 g.rotation.y=1.2;
}

// The leather drum (a drum of earthquake looks the same): a lacquered field drum standing on
// end. A barrel-bulged shell with a gilt zigzag band and a brass vent, vellum heads lapped
// under turned counterhoops, a V-laced rope drawn tight by leather tugs, and a pair of sticks
// on the floor beside it. Coloured per vertex and merged into a wood mesh and a hide mesh.
function buildDrum({g,materials}){
 const C=hex=>new THREE.Color(hex),v=(x,y,z)=>new THREE.Vector3(x,y,z);
 const woodMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.5});
 const hideMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.86});
 materials.push(woodMat,hideMat);
 const lists={wood:[],hide:[]},c=new THREE.Color();
 // Paint gets the part's own coordinates and uv, so a part can be painted, then placed.
 const put=(geo,paint,which)=>{
  const p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv,cols=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   paint(c,p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i),uv?uv.getX(i):0,uv?uv.getY(i):0);
   cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;
  }
  geo.setAttribute('color',new THREE.BufferAttribute(cols,3));if(uv)geo.deleteAttribute('uv');
  lists[which].push(geo);return geo;
 };
 const R=.115,Y0=.004,Y1=.164,bulge=y=>1+.035*Math.sin(Math.PI*Math.min(1,Math.max(0,(y-Y0)/(Y1-Y0))));
 // Shell: red lacquer over faint vertical grain, a gilt zigzag between two gilt lines.
 const lacquer=C(0x8a2419),lacquerDark=C(0x4e120c),lacquerHi=C(0xc0503a),gilt=C(0xd8aa4a);
 const shell=new THREE.CylinderGeometry(R,R,Y1-Y0,96,64,true);shell.translate(0,(Y0+Y1)/2,0);
 {const p=shell.attributes.position;for(let i=0;i<p.count;i++){const s=bulge(p.getY(i));p.setX(i,p.getX(i)*s);p.setZ(i,p.getZ(i)*s);}shell.computeVertexNormals();}
 put(shell,(col,x,y,z,nx,ny,nz)=>{
  const a=Math.atan2(z,x),grain=Math.sin(a*140+Math.sin(y*90+a*3)*1.4)*.5+.5;
  col.copy(lacquer).lerp(lacquerDark,grain*.28);
  // A soft highlight down the rounded belly, darker toward both hoops.
  col.lerp(lacquerHi,Math.max(0,1-Math.abs(y-.09)/.05)*.18).lerp(lacquerDark,Math.max(0,1-Math.min(y-Y0,Y1-y)/.025)*.35);
  const f=((a/(Math.PI*2))*9%1+1)%1,zig=.085+.011*(Math.abs(f*2-1)*2-1);
  const line=Math.min(Math.abs(y-zig)/.0034,Math.abs(Math.abs(y-.085)-.021)/.0022);
  if(line<1)col.lerp(gilt,(1-line)*.95);
 },'wood');
 // Counterhoops: turned walnut rings with a pale inlay line round the middle of the face.
 const walnut=C(0x3a2414),walnutHi=C(0x7a5634),inlay=C(0xdcc48e);
 const hoop=h0=>{
  const prof=[[R+.004,h0+.003],[R+.009,h0],[R+.013,h0+.001],[R+.016,h0+.006],[R+.017,h0+.011],[R+.017,h0+.013],[R+.017,h0+.015],
   [R+.016,h0+.02],[R+.013,h0+.025],[R+.009,h0+.026],[R+.004,h0+.023],[R+.003,h0+.013],[R+.004,h0+.003]];
  put(new THREE.LatheGeometry(prof.map(([r,y])=>new THREE.Vector2(r,y)),72),(col,x,y,z,nx,ny)=>{
   col.copy(walnut).lerp(walnutHi,Math.max(0,ny)*.45+(Math.sin(Math.atan2(z,x)*60+y*400)*.5+.5)*.12);
   if(Math.abs(y-h0-.013)<.001&&Math.hypot(x,z)>R+.0165)col.lerp(inlay,.85);
  },'wood');
 };
 hoop(0);hoop(.15);
 // A brass vent in the shell, in the gap under one top lacing point.
 const brassC=C(0xc49a45),brassHi=C(0xf0d48a),ink=C(0x140a06),ventA=0,ventY=.045,ventR=R*bulge(ventY)+.0006;
 const place=(geo,a,r,y)=>{geo.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI/2-a).setPosition(Math.cos(a)*r,y,Math.sin(a)*r));return geo;};
 place(put(new THREE.TorusGeometry(.0068,.0022,6,18),(col,x,y,z,nx,ny,nz)=>col.copy(brassC).lerp(brassHi,Math.max(0,nz)*.5),'wood'),ventA,ventR,ventY);
 place(put(new THREE.CircleGeometry(.0052,14),col=>col.copy(ink),'wood'),ventA,ventR-.0005,ventY);
 // Heads: cream vellum with mottling, a worn playing spot and a shadow at the bearing edge.
 const vellum=C(0xe2cfa6),vellumDark=C(0xa38b64),edgeC=C(0x9a8460);
 const head=new THREE.RingGeometry(0,R+.003,72,10);head.rotateX(-Math.PI/2);head.translate(0,.168,0);
 put(head,(col,x,y,z)=>{
  const r=Math.hypot(x,z),m=stoneNoise(x,1,z,70)*.6+stoneNoise(z,2,x,23)*.4;
  col.copy(vellum).lerp(vellumDark,Math.max(0,m)*.22+Math.exp(-(((x-.018)**2+(z+.012)**2)/.0011))*.4);
  if(r>R-.012)col.lerp(edgeC,(r-R+.012)/.015*.6);
 },'hide');
 const collar=new THREE.CylinderGeometry(R+.002,R+.002,.022,72,1,true);collar.translate(0,.157,0);
 put(collar,col=>col.copy(vellum).lerp(edgeC,.35),'hide');
 // The lacing: rope Vs between holes in the two hoops, twisted in three strands.
 const N=10,RR=R+.0155,rope=C(0xcdb88c),ropeDark=C(0x7c6642),ropeR=.0032;
 const top=i=>{const a=i/N*Math.PI*2;return v(Math.cos(a)*RR,.163,Math.sin(a)*RR);};
 const bot=i=>{const a=(i+.5)/N*Math.PI*2;return v(Math.cos(a)*RR,.013,Math.sin(a)*RR);};
 const strand=(A,B)=>{
  const d=B.clone().sub(A),len=d.length(),geo=new THREE.CylinderGeometry(ropeR,ropeR,len,8,Math.max(2,Math.round(len/.004)),true);
  put(geo,(col,x,y,z,nx,ny,nz,u,w)=>{const s=Math.sin(Math.PI*2*(u*3+w*len/.009));col.copy(rope).lerp(ropeDark,Math.max(0,-s)*.65);},'hide');
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v(0,1,0),d.normalize()));geo.translate(...A.clone().add(B).multiplyScalar(.5).toArray());
 };
 const knot=P=>{const k=new THREE.SphereGeometry(ropeR*1.35,8,6);put(k,col=>col.copy(rope).lerp(ropeDark,.3),'hide');k.translate(P.x,P.y,P.z);};
 const tan=C(0x5a3219),tanHi=C(0x9a6a3e),stitch=C(0xd8c49a);
 for(let i=0;i<N;i++){
  const T0=top(i),B=bot(i),T1=top(i+1);strand(T0,B);strand(B,T1);knot(T0);knot(B);
  // A leather tug slid up the V, drawing its two ropes together.
  const y=.058,at=T=>B.clone().lerp(T,(y-B.y)/(T.y-B.y)),P0=at(T0),P1=at(T1),mid=P0.clone().add(P1).multiplyScalar(.5);
  // RoundedBoxGeometry comes unindexed; a plain running index lets it merge with the rest.
  const geo=new RoundedBoxGeometry(P0.distanceTo(P1)+.013,.022,.0105,1,.0035);geo.setIndex([...Array(geo.attributes.position.count).keys()]);
  put(geo,(col,x,y2,z,nx,ny,nz)=>{
   col.copy(tan).lerp(tanHi,Math.max(0,nz)*.3+Math.max(0,ny)*.3);
   if(nz>.5&&Math.abs(Math.abs(y2)-.0075)<.0012)col.lerp(stitch,.7);
  },'hide');
  const X=P1.clone().sub(P0).normalize(),Z=v(mid.x,0,mid.z).normalize(),Y=Z.clone().cross(X);
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(X,Y,Z).setPosition(mid));
 }
 // Two ash sticks on the floor, with a dark cord-wrapped grip and a turned bead at the tip.
 const ash=C(0xc9a574),ashDark=C(0x8a6a42),grip=C(0x4a2c18);
 const prof=[[0,0],[.0066,0],[.0072,.004],[.0072,.12],[.0058,.2],[.0042,.25],[.0036,.262],[.0055,.272],[.0062,.28],[.0052,.289],[0,.293]];
 for(const [x,z,turn] of [[-.14,.162,.12],[.15,.2,Math.PI+.05]]){
  const s=put(new THREE.LatheGeometry(prof.map(([r,y])=>new THREE.Vector2(r,y)),12),(col,x2,y)=>{
   col.copy(ash).lerp(ashDark,(Math.sin(y*260+Math.sin(x2*900))*.5+.5)*.22);
   if(y>.012&&y<.075)col.copy(grip).lerp(ashDark,(Math.sin(y*2200)*.5+.5)*.35);
  },'wood');
  s.rotateZ(-Math.PI/2);s.rotateY(turn);s.translate(x,.0072,z);
 }
 for(const [which,material] of [['wood',woodMat],['hide',hideMat]]){
  const list=lists[which],geo=mergeGeometries(list);list.forEach(p=>p.dispose());
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=`drum-${which}`;g.add(mesh);
 }
 const box=new THREE.Box3();g.children.forEach(p=>{p.geometry.computeBoundingBox();box.union(p.geometry.boundingBox);});
 const mid=box.getCenter(v(0,0,0));g.children.forEach(p=>p.geometry.translate(-mid.x,-box.min.y,-mid.z));
 g.rotation.y=.5;
}

// The flute (wooden and magic flutes look alike): a turned boxwood baroque flute in three
// joints lying on the floor. Ivory ferrules with scored lines ring the joints and cap the
// head; the embouchure and six finger holes are real sunken pits in the bore, and a brass
// key on the foot joint covers a seventh hole. One wood mesh and one brass mesh.
function buildFlute({g,materials}){
 const C=hex=>new THREE.Color(hex);
 const woodMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.42});
 const brassMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.75,roughness:.3});
 materials.push(woodMat,brassMat);
 const L=.43;
 // Outer profile (radius, height) from the open foot end to the capped head; the bore starts it.
 const bore=[[.0062,.012],[.0062,.0006]];
 const keys=[[.0104,0],[.0136,.001],[.014,.004],[.014,.009],[.0132,.012],[.0124,.014],[.0128,.024],[.0132,.03],
  [.0127,.036],[.0122,.05],[.0124,.07],[.0138,.073],[.0146,.077],[.0146,.087],[.0136,.091],[.0118,.094],[.0121,.19],[.0126,.27],
  [.0138,.276],[.0149,.281],[.0151,.288],[.0146,.294],[.0133,.298],[.013,.305],[.0128,.33],[.0128,.4],[.0134,.405],[.0143,.409],
  [.0145,.418],[.0138,.423],[.0105,.428],[.005,.4305],[0,L]];
 const radiusAt=y=>{for(let i=1;i<keys.length;i++){const [r0,y0]=keys[i-1],[r1,y1]=keys[i];if(y>=y0&&y<=y1&&y1>y0)return r0+(r1-r0)*(y-y0)/(y1-y0);}return 0;};
 // Finger holes on top (angle 0 is +z), the embouchure a little larger and oval, the key hole to one side.
 const holes=[...[.118,.143,.168,.205,.23,.255].map(y=>({y,a:0,w:.0033,h:.0033})),{y:.362,a:0,w:.0052,h:.0042},{y:.043,a:.55,w:.003,h:.003}];
 // Sample the profile densely only across the holes.
 const ys=new Set(keys.map(k=>k[1]));
 for(let y=.016;y<.4;y+=.004)ys.add(+y.toFixed(4));
 for(const h of holes)for(let y=h.y-h.h*1.6;y<=h.y+h.h*1.6;y+=.0007)ys.add(+y.toFixed(5));
 const outer=[...bore,...[...ys].sort((a,b)=>a-b).map(y=>[keys.find(k=>k[1]===y)?.[0]??radiusAt(y),y])].map(([r,y])=>new THREE.Vector2(r,y));
 // Start the seam at -z, underneath, away from every hole.
 const lathe=new THREE.LatheGeometry(outer,64,Math.PI);
 const p=lathe.attributes.position,info=new Float32Array(p.count);
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,z);if(r<.0065||y>.425)continue;
  const a=Math.atan2(x,z);
  for(const h of holes){
   const d=Math.hypot(((a-h.a+Math.PI*3)%(Math.PI*2)-Math.PI)*r/h.w,(y-h.y)/h.h);
   if(d<1.35){
    // A sunken pit with a softly rounded lip.
    const dip=d<.8?.0034:d<1?.0034*(1-(d-.8)/.2)**.5:.00025*(1-(d-1)/.35);
    const s=(r-dip)/r;p.setX(i,x*s);p.setZ(i,z*s);info[i]=Math.max(info[i],d<.85?2:1+(1.35-d)/.5);
   }
  }
 }
 lathe.computeVertexNormals();lathe.deleteAttribute('uv');
 // Paint: pale boxwood with fine grain and a darker flame, ivory ferrules with scored lines.
 const box=C(0xcf9f5c),boxDark=C(0x8e6230),flame=C(0x7a4e24),ivory=C(0xeadfc6),ivoryDark=C(0xb3a483),ink=C(0x120a05),lip=C(0x5a3a1c);
 const ferrules=[[0,.0125,[.004,.009]],[.072,.092,[.077,.082,.087]],[.275,.299,[.281,.294]],[.404,L,[.409,.418]]];
 const cols=new Float32Array(p.count*3),c=new THREE.Color();
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,z),a=Math.atan2(x,z);
  const f=ferrules.find(([y0,y1])=>y>=y0&&y<=y1);
  if(r<.0066)c.copy(ink);
  else if(f){
   c.copy(ivory).lerp(ivoryDark,(Math.sin(a*3+y*160)*.5+.5)*.2);
   for(const s of f[2])if(Math.abs(y-s)<.0006)c.lerp(ivoryDark,.75);
  }else{
   const grain=Math.sin(a*38+Math.sin(y*55+a*2)*2.2)*.5+.5,fl=Math.sin(y*70+Math.sin(a*2)*3)*.5+.5;
   c.copy(box).lerp(boxDark,grain*.18).lerp(flame,Math.max(0,fl-.72)*1.1);
  }
  if(info[i]>=2)c.copy(ink);else if(info[i]>1)c.lerp(lip,(info[i]-1)*.8);
  cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;
 }
 lathe.setAttribute('color',new THREE.BufferAttribute(cols,3));
 // The brass key: a round pad over the side hole, a thin lever pivoting in a turned saddle,
 // and a flat touch at the joint. Built lying on +z, then turned to the hole's angle.
 const brassC=C(0xc9a04a),brassHi=C(0xf2d88c),brassDark=C(0x6e5220),parts=[];
 const put=(geo,shade=1)=>{
  if(geo.index===null)geo.setIndex([...Array(geo.attributes.position.count).keys()]);
  geo.deleteAttribute('uv');const n=geo.attributes.normal,cs=new Float32Array(n.count*3);
  for(let i=0;i<n.count;i++){c.copy(brassC).lerp(brassHi,Math.max(0,n.getZ(i))*.45).lerp(brassDark,Math.max(0,-n.getZ(i))*.4).multiplyScalar(shade);cs[i*3]=c.r;cs[i*3+1]=c.g;cs[i*3+2]=c.b;}
  geo.setAttribute('color',new THREE.BufferAttribute(cs,3));parts.push(geo);return geo;
 };
 const at=y=>radiusAt(y);
 const pad=put(new THREE.CylinderGeometry(.0048,.0048,.0014,20));pad.rotateX(Math.PI/2);pad.translate(0,.043,at(.043)+.0009);
 put(new THREE.TorusGeometry(.0048,.0006,5,20)).translate(0,.043,at(.043)+.0012);
 const lever=put(new RoundedBoxGeometry(.0032,.03,.0013,1,.0005));lever.rotateX(-.08);lever.translate(0,.0585,at(.058)+.0034);
 put(new RoundedBoxGeometry(.0026,.006,.003,1,.0008)).translate(0,.045,at(.045)+.0023);
 const touch=put(new THREE.CylinderGeometry(.0042,.0042,.0012,16));touch.rotateX(Math.PI/2);touch.scale(1,1.35,1);touch.translate(0,.0715,at(.0715)+.0045);
 // The saddle: two turned blocks with an axle between them.
 for(const s of [-1,1])put(new THREE.CylinderGeometry(.0017,.0021,.004,10),.85).rotateX(Math.PI/2).translate(s*.0035,.058,at(.058)+.002);
 put(new THREE.CylinderGeometry(.0007,.0007,.0086,6),.9).rotateZ(Math.PI/2).translate(0,.058,at(.058)+.0033);
 const brass=mergeGeometries(parts);parts.forEach(q=>q.dispose());brass.rotateY(holes[holes.length-1].a);
 // Roll it a little about its own axis so the holes face up and slightly toward the viewer,
 // then lay it along x with the holes (+z) turned up.
 const lay=new THREE.Matrix4().makeBasis(new THREE.Vector3(0,0,1),new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0)).multiply(new THREE.Matrix4().makeRotationY(.25));
 for(const geo of [lathe,brass])geo.applyMatrix4(lay);
 for(const [geo,material,part] of [[lathe,woodMat,'flute-wood'],[brass,brassMat,'flute-brass']]){
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=part;g.add(mesh);
 }
 const b=new THREE.Box3();g.children.forEach(q=>{q.geometry.computeBoundingBox();b.union(q.geometry.boundingBox);});
 const mid=b.getCenter(new THREE.Vector3());g.children.forEach(q=>q.geometry.translate(-mid.x,-b.min.y,-mid.z));
 g.rotation.y=.3;
}

// The bugle: one brass tube folded into a flat oval loop. The mouthpiece and lead pipe run along
// the bottom, bend round at the front, come back through the middle, bend again at the back and
// flare into the bell along the top. The whole tube, mouthpiece cup, ferrules, bell garland and
// rolled rim are one swept profile (the bell's inside is swept back into the throat), with two
// stays between the runs. It rests tilted on its bell rim and loop like a real one on a floor,
// and a red braided cord knotted to the bell pipe trails on the floor to two tassels.
function buildBugle({g,materials}){
 const C=hex=>new THREE.Color(hex),V=(x,y,z)=>new THREE.Vector3(x,y,z);
 const brassMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.8,roughness:.28});
 const cordMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.85});
 materials.push(brassMat,cordMat);
 // The centre line, in the xz plane: straight runs joined by half-circle bends.
 const R=.025,segs=[
  {line:[-.21,-.05,.08,-.05]},{arc:[.08,-.025,-Math.PI/2,1]},{line:[.08,0,-.12,0]},{arc:[-.12,.025,-Math.PI/2,-1]},{line:[-.12,.05,.17,.05]}];
 for(const s of segs)s.len=s.line?Math.hypot(s.line[2]-s.line[0],s.line[3]-s.line[1]):Math.PI*R;
 const total=segs.reduce((a,s)=>a+s.len,0);
 const centre=s=>{
  for(const seg of segs){
   if(s<=seg.len||seg===segs[segs.length-1]){
    if(seg.line){const [x0,z0,x1,z1]=seg.line,t=s/seg.len,dx=(x1-x0)/seg.len,dz=(z1-z0)/seg.len;return {p:V(x0+(x1-x0)*t,0,z0+(z1-z0)*t),t:V(dx,0,dz)};}
    // Bends: from the start angle, turning counter-clockwise (+1, front) or clockwise (-1, back) seen from above.
    const [cx,cz,a0,dir]=seg.arc,ang=a0+dir*s/R;
    return {p:V(cx+Math.cos(ang)*R,0,cz+Math.sin(ang)*R),t:V(-Math.sin(ang)*dir,0,Math.cos(ang)*dir)};
   }
   s-=seg.len;
  }
 };
 // Outer radius along the tube: a slowly widening bore, ferrules at the joints, the bell flare and its garland.
 const ferrules=[.07,.29,.3685,.5685,.6475,.72];
 const bellAt=s=>.0078+.04*Math.exp((s-total)/.035);
 const outerR=s=>{
  let r=s<.07?0:s<total-.2?.0055+.0023*(s-.07)/(total-.27):bellAt(s);
  for(const f of ferrules)if(Math.abs(s-f)<.009)r+=.0011*(Math.abs(s-f)<.0075?1:(.009-Math.abs(s-f))/.0015);
  const gs=total-.075;if(s>gs-.012&&s<gs+.012)r+=.0009*(Math.abs(s-gs)>.01?(.012-Math.abs(s-gs))/.002:1);
  return r;
 };
 // Profile (arc length, radius, kind): the mouthpiece cup from its throat, rim and shank, the
 // receiver, the tube out to the bell, a rolled rim, then back down the inside of the bell.
 const prof=[[.012,0,'in'],[.0112,.0024,'in'],[.008,.0055,'in'],[.004,.0074,'in'],[.001,.0081,'in'],[.0002,.0088,'rim'],[.0008,.0099,'rim'],[.003,.0103,'rim'],[.0065,.0098,'mp'],[.012,.0076,'mp'],[.02,.0056,'mp'],[.04,.0043,'mp'],[.05,.0043,'mp'],
  [.0505,.0068,'fe'],[.0685,.0068,'fe'],[.069,.0055,'tube']];
 const ks=new Set();
 for(let s=.07;s<total-.0005;s+=s>total-.15?.0022:.005)ks.add(+s.toFixed(5));
 for(const f of [...ferrules,total-.075])for(let d=-.0125;d<=.0125;d+=.0015)ks.add(+(f+d).toFixed(5));
 for(const s of [...ks].sort((a,b)=>a-b))if(s>.069)prof.push([s,outerR(s),'tube']);
 const mouth=bellAt(total);
 for(let i=0;i<=8;i++){const a=i/8*Math.PI;prof.push([total+Math.sin(a)*.0024,mouth+.0024-Math.cos(a)*.0024,'lip']);}
 for(let s=total-.001;s>total-.16;s-=.0025)prof.push([s,Math.max(.0045,bellAt(s)-.0012),'bore']);
 // Sweep rings of N vertices round the centre line (up is +y); the index wraps, so there is no seam.
 const N=24,pos=[],col=[],idx=[],c=new THREE.Color();
 const BR=C(0xc99a3e),HI=C(0xf3d98a),DK=C(0x6b4c1a),TARN=C(0x5b5a36),INK=C(0x140d06),NICKEL=C(0xd9c784);
 prof.forEach(([s,r,kind],k)=>{
  const {p,t}=centre(Math.max(0,s)),side=V(0,1,0).cross(t).normalize();
  for(let j=0;j<N;j++){
   const a=j/N*Math.PI*2,u=Math.cos(a),w=Math.sin(a);
   const q=p.clone().addScaledVector(V(0,1,0),u*r).addScaledVector(side,w*r);pos.push(q.x,q.y,q.z);
   const n=stoneNoise(q.x*9,q.y*9,q.z*9,9);
   c.copy(BR).lerp(n>0?HI:DK,Math.abs(n)*.25);
   if(n>.45&&kind==='tube')c.lerp(TARN,(n-.45)*.8);
   if(kind==='fe'||kind==='rim'||kind==='lip'||(kind==='tube'&&(ferrules.some(f=>Math.abs(s-f)<.0075)||Math.abs(s-(total-.075))<.01)))c.lerp(NICKEL,.55);
   // The garland is engraved with a wavy band.
   if(kind==='tube'&&Math.abs(s-(total-.075))<.009&&Math.sin(a*12+Math.sin(s*900)*2)>.55)c.lerp(DK,.55);
   if(kind==='in')c.lerp(INK,.35+.5*(1-r/.0081));
   if(kind==='bore')c.lerp(INK,Math.min(.95,(total-s)/.06));
   col.push(c.r,c.g,c.b);
  }
  if(k>0)for(let j=0;j<N;j++){const a=(k-1)*N+j,b=(k-1)*N+(j+1)%N,d=k*N+j,e=k*N+(j+1)%N;idx.push(a,d,b,b,d,e);}
 });
 const tube=new THREE.BufferGeometry();
 tube.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));tube.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
 tube.setIndex(idx);tube.computeVertexNormals();
 // Stays between the runs: a rod with a saddle foot at each end, coloured like the ferrules.
 const parts=[tube];
 const paint=(geo,col)=>{geo.deleteAttribute('uv');const n=geo.attributes.normal,cs=new Float32Array(n.count*3);for(let i=0;i<n.count;i++){c.copy(col).lerp(HI,Math.max(0,n.getY(i))*.35);cs.set([c.r,c.g,c.b],i*3);}geo.setAttribute('color',new THREE.BufferAttribute(cs,3));if(!geo.index)geo.setIndex([...Array(n.count).keys()]);parts.push(geo);return geo;};
 const stay=C(0xd8bc6a);
 for(const [x,z0,z1] of [[-.02,-.05,0],[-.035,0,.05]]){
  paint(new THREE.CylinderGeometry(.0017,.0017,z1-z0,8).rotateX(Math.PI/2).translate(x,0,(z0+z1)/2),stay);
  for(const z of [z0,z1])paint(new THREE.CylinderGeometry(.0032,.0032,.0075,10).rotateZ(Math.PI/2).translate(x,0,z+(z===z0?1:-1)*.0055),stay);
 }
 const brass=mergeGeometries(parts);parts.forEach(q=>q.dispose());
 // Rest it: try tilts about both floor axes and keep the one whose middle sits lowest.
 const P=brass.attributes.position,pick=[];for(let i=0;i<P.count;i+=7)pick.push(V(P.getX(i),P.getY(i),P.getZ(i)));
 let best=null;const e=new THREE.Euler(),m=new THREE.Matrix4(),q=V(0,0,0);
 const tryTilt=(rx,rz)=>{
  m.makeRotationFromEuler(e.set(rx,0,rz));let lo=Infinity,sum=0;
  for(const p of pick){q.copy(p).applyMatrix4(m);lo=Math.min(lo,q.y);sum+=q.y;}
  const h=sum/pick.length-lo;if(!best||h<best.h)best={h,rx,rz};
 };
 // Coarse, then fine round the best.
 for(let rx=-.9;rx<=.9;rx+=.075)for(let rz=-.3;rz<=.3;rz+=.075)tryTilt(rx,rz);
 const {rx:cx,rz:cz}=best;for(let dx=-.07;dx<=.07;dx+=.01)for(let dz=-.07;dz<=.07;dz+=.01)tryTilt(cx+dx,cz+dz);
 const rest=new THREE.Matrix4().makeRotationFromEuler(e.set(best.rx,0,best.rz));
 brass.applyMatrix4(rest);brass.computeBoundingBox();const floor=brass.boundingBox.min.y;brass.translate(0,-floor,0);
 const world=(x,z)=>{const p=V(x,0,z).applyMatrix4(rest);p.y-=floor;return p;};
 // The cord: two wraps round the bell pipe, a slack loop onto the floor between them, and two
 // tails ending in tassels. Braided: a two-tone twill spirals round every strand.
 const cords=[],RED=C(0xa0202a),RED2=C(0x5a0e14),GOLD=C(0xd6ad48),GOLD2=C(0x7d5a1c);
 const braid=(geo,rad,twist,a0,b0)=>{
  const p=geo.attributes.position,cs=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){const u=Math.floor(i/(rad+1)),v=i%(rad+1);c.copy(a0).lerp(b0,(Math.sin(u*twist+v/rad*Math.PI*4)>0?.55:0)+.1*Math.sin(u*.7));cs.set([c.r,c.g,c.b],i*3);}
  geo.setAttribute('color',new THREE.BufferAttribute(cs,3));geo.deleteAttribute('uv');cords.push(geo);
 };
 const out=V(0,0,1).applyMatrix4(rest).setY(0).normalize(),along=V(1,0,0).applyMatrix4(rest).setY(0).normalize();
 const knots=[-.09,.03].map(x=>world(x,.05)),axis=V(1,0,0).transformDirection(rest);
 for(const k of knots)for(const d of [-.0028,.0028]){
  const wrap=new THREE.TorusGeometry(.0092,.0021,6,20);
  wrap.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,0,1),axis));
  wrap.translate(k.x+axis.x*d,k.y+axis.y*d,k.z+axis.z*d);braid(wrap,6,1.3,RED,RED2);
 }
 const onFloor=(p,o,a)=>p.clone().addScaledVector(out,o).addScaledVector(along,a).setY(.0035);
 const [k0,k1]=knots;
 const loop=new THREE.CatmullRomCurve3([k0,onFloor(k0,.04,-.005),onFloor(k0,.07,.05),onFloor(k1,.075,-.03),onFloor(k1,.045,.004),k1]);
 braid(new THREE.TubeGeometry(loop,80,.0033,8,false),8,1.6,RED,RED2);
 for(const [o,a] of [[.035,.085],[.06,.07]]){
  const end=onFloor(k1,o,a),tail=new THREE.CatmullRomCurve3([k1,onFloor(k1,o*.5,.02),end]);
  braid(new THREE.TubeGeometry(tail,24,.0028,8,false),8,1.6,RED,RED2);
  // The tassel lies on the floor: a gold cap and a fan of threads, pointing on along the tail.
  const dir=tail.getTangent(1).setY(0).normalize(),rot=new THREE.Quaternion().setFromUnitVectors(V(0,1,0),dir);
  const cap=new THREE.SphereGeometry(.0058,10,8);cap.scale(1,1.3,1);cap.applyQuaternion(rot);cap.translate(end.x+dir.x*.004,.0058,end.z+dir.z*.004);braid(cap,10,.9,GOLD,GOLD2);
  const fan=new THREE.CylinderGeometry(.0045,.0085,.03,14,4);fan.applyQuaternion(rot);fan.scale(1,.7,1);
  fan.translate(end.x+dir.x*.022,.006,end.z+dir.z*.022);braid(fan,14,.2,GOLD,GOLD2);
 }
 const cord=mergeGeometries(cords.map(q=>{if(!q.index)q.setIndex([...Array(q.attributes.position.count).keys()]);return q;}));cords.forEach(q=>q.dispose());
 // The spline can dip a hair below the floor where the cord lands; flatten it there instead.
 const cp=cord.attributes.position;for(let i=0;i<cp.count;i++)if(cp.getY(i)<.0002)cp.setY(i,.0002);
 for(const [geo,material,part] of [[brass,brassMat,'bugle-brass'],[cord,cordMat,'bugle-cord']]){
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=part;g.add(mesh);
 }
 const b=new THREE.Box3();g.children.forEach(p=>{p.geometry.computeBoundingBox();b.union(p.geometry.boundingBox);});
 const mid=b.getCenter(V(0,0,0));g.children.forEach(p=>p.geometry.translate(-mid.x,-b.min.y,-mid.z));
 g.rotation.y=-.35;
}

// The harp: a small Celtic lap harp standing on its carved foot, three-quarter on. Wooden
// and magic harps share the look. The wood is one merged, vertex-coloured mesh: a
// round-backed soundbox with a pale spruce soundboard and a dark string rib, a swan neck
// that rises to the pillar, and a bowed pillar with a carved interlace band. The strings,
// eyelets, tuning pins and brass cheek bands are the second mesh; the strings are gut, with
// every C red and every F blue, as on a real harp.
function buildHarp({g,materials}){
 const C=hex=>new THREE.Color(hex),V=(x,y,z=0)=>new THREE.Vector3(x,y,z),c=new THREE.Color();
 const woodMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.55});
 const trimMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.45,roughness:.35});
 materials.push(woodMat,trimMat);
 const WALNUT=C(0x7a4a26),DEEP=C(0x3e2412),HONEY=C(0xa8703a),SPRUCE=C(0xd6b47a),RIB=C(0x5a3418),INK=C(0x1e120a);
 const wood=[],trim=[];
 // Sweep rings round a curve in the harp's plane (xy; z is thickness). shape(t,a) gives the
 // in-plane and thickness offsets for angle a; tone(t,a,p) paints each vertex. The ends are capped.
 const sweep=(curve,rings,N,shape,tone,list=wood)=>{
  const pos=[],col=[],idx=[];
  for(let k=0;k<=rings;k++){
   const t=k/rings,p=curve.getPoint(t),d=curve.getTangent(t),n=V(-d.y,d.x);
   for(let j=0;j<N;j++){
    const a=j/N*Math.PI*2,[u,w]=shape(t,a),q=p.clone().addScaledVector(n,u);q.z+=w;
    pos.push(q.x,q.y,q.z);tone(t,a,q,c);col.push(c.r,c.g,c.b);
    if(k)idx.push((k-1)*N+j,k*N+j,(k-1)*N+(j+1)%N,(k-1)*N+(j+1)%N,k*N+j,k*N+(j+1)%N);
   }
  }
  for(const k of [0,rings]){
   const p=curve.getPoint(k/rings),centre=pos.length/3;pos.push(p.x,p.y,p.z);tone(k/rings,0,p,c);c.lerp(DEEP,.4);col.push(c.r,c.g,c.b);
   for(let j=0;j<N;j++){const a=k*N+j,b=k*N+(j+1)%N;k?idx.push(centre,a,b):idx.push(centre,b,a);}
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  geo.setIndex(idx);geo.computeVertexNormals();list.push(geo);return geo;
 };
 const grain=(q,s,base=WALNUT)=>{const n=stoneNoise(q.x*7,q.y*7,q.z*7,6);c.copy(base).lerp(n>0?HONEY:DEEP,Math.abs(n)*.35+.12*Math.sin(s));return c;};
 // The soundbox leans back from the foot to the shoulder. Its soundboard faces the strings
 // (toward the pillar) and is nearly flat; the back is a deep round.
 const box=new THREE.LineCurve3(V(-.01,.035),V(-.155,.395));
 const halfW=t=>.042-.022*t,depth=t=>.052-.03*t;
 sweep(box,24,28,(t,a)=>{const s=Math.sin(a);return [s>0?depth(t)*s:.08*depth(t)*s,halfW(t)*Math.cos(a)];},(t,a,q,c)=>{
  const s=Math.sin(a),z=halfW(t)*Math.cos(a);
  if(s<0){c.copy(SPRUCE).lerp(HONEY,.25*Math.abs(stoneNoise(q.x*30,q.y*4,0,5)));if(Math.abs(z)<.0075)c.copy(RIB);if(Math.abs(z)>halfW(t)*.93)c.lerp(DEEP,.5);}
  else grain(q,q.x*260+q.y*90);
  // A dark band where the box meets the foot and the shoulder.
  if(t<.05||t>.95)c.lerp(DEEP,.5);
 });
 // Three sound holes down the back, painted as dark ovals ringed with a pale edge.
 // (The back faces away from the pillar, so they show from behind.)
 const along=box.getTangent(0),back=V(-along.y,along.x);
 for(const t of [.3,.55,.78]){
  const p=box.getPoint(t).addScaledVector(back,depth(t)+.0005),r=.012-.005*t;
  const hole=new THREE.CircleGeometry(r,16);hole.scale(1,1.5,1);
  const q=new THREE.Quaternion().setFromUnitVectors(V(0,0,1),back);hole.applyQuaternion(q);hole.translate(p.x,p.y,p.z);
  const cs=[],hp=hole.attributes.position;for(let i=0;i<hp.count;i++){c.copy(INK);cs.push(c.r,c.g,c.b);}
  hole.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));hole.deleteAttribute('uv');wood.push(hole);
 }
 // The neck: from the shoulder it swells into a hump and sweeps up to the pillar's head.
 const neck=new THREE.CatmullRomCurve3([V(-.19,.4),V(-.12,.44),V(-.04,.425),V(.03,.45),V(.085,.475)]);
 const neckR=t=>.017+.008*Math.exp(-(((t-.1)/.12)**2))+.004*Math.exp(-(((t-.95)/.08)**2));
 sweep(neck,40,18,(t,a)=>[neckR(t)*Math.sin(a),.017*Math.cos(a)],(t,a,q)=>{grain(q,t*50);if(Math.abs(Math.cos(a))>.96)c.lerp(DEEP,.35);});
 // The pillar bows outward and carries a carved interlace band between two collars.
 const pillar=new THREE.CatmullRomCurve3([V(.05,.03),V(.1,.18),V(.105,.3),V(.085,.465)]);
 const pillarR=t=>.014+.005*Math.exp(-(((t-.5)/.14)**2))+.006*Math.exp(-(((t-.06)/.05)**2))+.004*Math.exp(-(((t-.95)/.05)**2));
 sweep(pillar,40,16,(t,a)=>[pillarR(t)*1.25*Math.sin(a),pillarR(t)*Math.cos(a)],(t,a,q)=>{
  grain(q,t*40);
  if(t>.36&&t<.64){const s=(t-.36)*90;if(Math.sin(a*3+s)*Math.sin(a*3-s)>.45)c.lerp(INK,.7);else c.lerp(HONEY,.25);}
  if(Math.abs(t-.34)<.012||Math.abs(t-.66)<.012)c.lerp(DEEP,.6);
 });
 // The foot: a low, rounded plinth under the soundbox and the pillar.
 const foot=new RoundedBoxGeometry(.2,.035,.1,2,.012).translate(.005,.0175,0);foot.deleteAttribute('uv');
 {const p=foot.attributes.position,cs=[];for(let i=0;i<p.count;i++){const q=V(p.getX(i),p.getY(i),p.getZ(i));grain(q,q.x*200,C(0x5e371b));if(q.y<.004)c.lerp(INK,.4);cs.push(c.r,c.g,c.b);}foot.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));}
 wood.push(foot);
 // Strings run straight up from the soundboard's rib to the underside of the neck.
 const GUT=C(0xeadcb4),RED=C(0xb0282c),BLUE=C(0x2c4a9a),BRASS=C(0xcaa048),BRASS_DK=C(0x7a5a1c),PIN=C(0xd9dcdc);
 const paint=(geo,col,hi=BRASS)=>{geo.deleteAttribute('uv');const n=geo.attributes.normal,cs=[];for(let i=0;i<n.count;i++){c.copy(col).lerp(hi,Math.max(0,n.getY(i)+n.getZ(i))*.25);cs.push(c.r,c.g,c.b);}geo.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));trim.push(geo);return geo;};
 const board=V(along.y,-along.x);
 const neckAt=x=>{let best=null;for(let i=0;i<=200;i++){const p=neck.getPoint(i/200);if(!best||Math.abs(p.x-x)<Math.abs(best.p.x-x))best={p,t:i/200};}return best;};
 const STRINGS=14;
 for(let i=0;i<STRINGS;i++){
  const t=.08+i*.84/(STRINGS-1),foot=box.getPoint(t).addScaledVector(board,.08*depth(t));
  const {p,t:nt}=neckAt(foot.x),top=V(foot.x,p.y-neckR(nt)*.9),len=top.y-foot.y;
  // Bass strings (near the pillar) are thicker. Every seventh string from the top is a C, three below it an F.
  const note=(STRINGS-1-i)%7,col=note===0?RED:note===3?BLUE:GUT;
  paint(new THREE.CylinderGeometry(.0016+.0011*(1-i/STRINGS),.0016+.0011*(1-i/STRINGS),len,5,1,true).translate(foot.x,foot.y+len/2,0),col,C(0xffffff));
  // A brass eyelet where the string leaves the soundboard and a tuning pin through the neck.
  paint(new THREE.SphereGeometry(.0034,8,6).translate(foot.x,foot.y,0),BRASS);
  paint(new THREE.CylinderGeometry(.0022,.0022,.05,6).rotateX(Math.PI/2).translate(top.x,p.y,.004),PIN,C(0xffffff));
  paint(new THREE.BoxGeometry(.0065,.0065,.004).translate(top.x,p.y,.031),PIN,C(0xffffff));
 }
 // Brass cheek bands along both sides of the neck, and a brass cap on the pillar's head.
 for(const s of [-1,1]){
  const band=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({length:12},(_,i)=>{const t=.08+i/11*.84,p=neck.getPoint(t);return V(p.x,p.y-neckR(t)*.15,s*.0175);})),40,.0045,6,false);
  band.scale(1,1,.45);band.translate(0,0,s*.0175*.55);paint(band,BRASS);
 }
 paint(new THREE.SphereGeometry(.014,12,8).scale(1,.7,1.1).translate(.085,.487,0),BRASS);
 paint(new THREE.TorusGeometry(.019,.003,6,18).rotateX(Math.PI/2).translate(.052,.052,0),BRASS_DK);
 const S=.88;
 for(const [list,material,part] of [[wood,woodMat,'harp-wood'],[trim,trimMat,'harp-strings']]){
  const geo=mergeGeometries(list.map(q=>{if(!q.index)q.setIndex([...Array(q.attributes.position.count).keys()]);if(!q.attributes.normal)q.computeVertexNormals();return q;}));
  list.forEach(q=>q.dispose());geo.scale(S,S,S);
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=part;g.add(mesh);
 }
 const b=new THREE.Box3();g.children.forEach(p=>{p.geometry.computeBoundingBox();b.union(p.geometry.boundingBox);});
 const mid=b.getCenter(V(0,0,0));g.children.forEach(p=>p.geometry.translate(-mid.x,-b.min.y,-mid.z));
 g.rotation.y=.4;
}

// The hand bell, tipped over on the floor: it rests on its lip and the knob of its handle, so
// the mouth faces the viewer with the clapper fallen against the low side. The shell is one
// lathe swept down the inside and back up the outside, with raised beads at the sound bow,
// waist and shoulder and an engraved band between them. The metal mesh holds the shell, the
// ferrule and the iron clapper; the wood mesh holds the turned handle. A silver bell (the Bell
// of Opening) is silver with a band of runes and an ebony handle; any other bell is bronze.
function buildBell(silver,{g,materials}){
 const C=hex=>new THREE.Color(hex),c=new THREE.Color();
 const metalMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.8,roughness:.3});
 const woodMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.5});
 materials.push(metalMat,woodMat);
 const BODY=C(silver?0xc4cace:0xb07f36),BRIGHT=C(silver?0xf0f4f6:0xe0b45c),DULL=C(silver?0x767e84:0x6a4a1e);
 const PATINA=C(silver?0x5c5a60:0x4e8a72),INK=C(silver?0x2a2c34:0x3a2410),IRON=C(0x3c3a38);
 const metal=[],wood=[];
 const bump=(y,at,w,h)=>h*Math.exp(-(((y-at)/w)**2));
 // Outer radius up the bell (mouth at y=0, crown at y=.13): a thick sound bow, a flare
 // into the waist, a straight waist, a rounded shoulder and a domed crown.
 const outer=y=>{
  const t=Math.min(1,y/.115);
  return .077-.034*Math.sin(Math.min(1,t*1.25)*Math.PI/2)+bump(y,.012,.004,.0028)+bump(y,.07,.0025,.0018)+bump(y,.1,.003,.0022);
 };
 const prof=[];
 // The inside, from the crown down to the lip (so its faces point in), then round the lip and up the outside.
 for(let y=.115;y>.004;y-=.005)prof.push([Math.max(.001,outer(y)-.006-.004*Math.max(0,(.03-y)/.03)),y]);
 const insideCount=prof.length;
 prof.push([.069,0],[.074,-.001],[.0785,.002]);
 for(let y=.004;y<=.113;y+=.0025)prof.push([outer(y),y]);
 for(let i=1;i<=8;i++){const a=i/8*Math.PI/2;prof.push([outer(.113)*Math.cos(a),.113+.018*Math.sin(a)]);}
 prof[prof.length-1][0]=.0005;
 const shell=new THREE.LatheGeometry(prof.map(([r,y])=>new THREE.Vector2(r,y)),48);
 {
  const p=shell.attributes.position,n=shell.attributes.normal,cs=[];
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),inside=i%prof.length<insideCount;
   const noise=stoneNoise(x*40,y*40,z*40,5);
   if(inside){c.copy(DULL).lerp(INK,.45+.2*noise);}
   else{
    c.copy(BODY).lerp(noise>0?BRIGHT:DULL,Math.abs(noise)*.4);
    // Worn bright on the sound bow and the beads, where hands and floors rub.
    c.lerp(BRIGHT,.6*Math.max(bump(y,.004,.006,1),bump(y,.012,.004,1),bump(y,.07,.0025,1),bump(y,.1,.003,1)));
    // The engraved band: a running scroll on bronze, a line of runes on silver.
    if(y>.076&&y<.094){
     const u=a*(silver?9:6),v=(y-.085)/.009;
     const line=silver?(Math.abs(Math.sin(u*2))>.93&&Math.abs(v)<.8)||Math.abs(v+Math.sin(u*4)*.6)<.12&&Math.cos(u)>0:Math.abs(v-.8*Math.sin(u))<.18||Math.abs(v+.8*Math.sin(u))<.18;
     if(line)c.lerp(INK,.75);
    }
    for(const at of [.075,.095])if(Math.abs(y-at)<.001)c.lerp(INK,.6);
    // Verdigris (or tarnish) settles in the crevices beside the beads.
    const crease=Math.max(bump(y,.018,.003,1),bump(y,.064,.003,1),bump(y,.106,.003,1));
    c.lerp(PATINA,crease*(.45+.25*noise));
   }
   cs.push(c.r,c.g,c.b);
  }
  shell.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));shell.deleteAttribute('uv');metal.push(shell);
 }
 const paint=(geo,list,tone)=>{
  geo.deleteAttribute('uv');const p=geo.attributes.position,cs=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i));cs.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));list.push(geo);return geo;
 };
 // The ferrule on the crown: a cup with a rolled rim, gripping the handle.
 const ferrule=new THREE.LatheGeometry([[.0005,.128],[.017,.128],[.019,.131],[.016,.134],[.0145,.146],[.017,.149],[.0165,.152],[.013,.153]].map(([r,y])=>new THREE.Vector2(r,y)),24);
 paint(ferrule,metal,(x,y,z)=>c.copy(BODY).lerp(y>.147||y<.132?BRIGHT:DULL,.4));
 // The turned handle: a neck, a swelling grip with two scored rings, a collar and a round knob.
 const WOOD=C(silver?0x2a1a14:0x7a4a26),WOOD_LT=C(silver?0x5a3a2a:0xb07a42),WOOD_DK=C(silver?0x120a08:0x3e2412);
 const hp=[[.0005,.15],[.012,.15],[.011,.162],[.0135,.175],[.0165,.2],[.016,.222],[.012,.232],[.015,.236],[.015,.241],[.011,.245],[.013,.25],[.019,.259],[.02,.268],[.016,.278],[.008,.283],[.0005,.284]];
 const handle=new THREE.LatheGeometry(hp.map(([r,y])=>new THREE.Vector2(r,y)),20);
 paint(handle,wood,(x,y,z)=>{
  const n=stoneNoise(x*60,y*8,z*60,5);c.copy(WOOD).lerp(n>0?WOOD_LT:WOOD_DK,Math.abs(n)*.5);
  if(Math.abs(y-.19)<.0012||Math.abs(y-.208)<.0012||Math.abs(y-.243)<.0015)c.lerp(WOOD_DK,.7);
  // Polished pale on the swell of the grip and the top of the knob.
  if(Math.abs(y-.2)<.012||y>.274)c.lerp(WOOD_LT,.3);
 });
 // Tip the bell over. Find the angle at which the lip and the knob both touch the floor.
 const lip=[-.0785,.002],knob=[-.02,.264],dx=knob[0]-lip[0],dy=knob[1]-lip[1];
 const phi=Math.atan2(dy,-dx); // sin φ·(lip.x−knob.x) = cos φ·(knob.y−lip.y), with sin φ>0 so the −x side is low
 // Down, seen in the bell's own frame: the clapper falls that way and rests on the inner wall.
 const down=new THREE.Vector2(-Math.sin(phi),-Math.cos(phi)).normalize();
 const pivot=new THREE.Vector3(0,.108,0),rest=new THREE.Vector3(down.x*.037,.032,0);
 const dir=rest.clone().sub(pivot),len=dir.length();
 const rod=new THREE.CylinderGeometry(.0032,.0042,len,8).translate(0,-len/2,0);
 rod.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,-1,0),dir.clone().normalize()));rod.translate(pivot.x,pivot.y,pivot.z);
 paint(rod,metal,()=>c.copy(IRON));
 paint(new THREE.SphereGeometry(.0135,14,10).scale(1,1.2,1).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize())).translate(rest.x,rest.y,rest.z),metal,(x,y)=>c.copy(IRON).lerp(C(0x7a7672),Math.max(0,(x-rest.x)/.0135)*.4));
 paint(new THREE.TorusGeometry(.006,.0022,6,12).translate(0,.11,0),metal,()=>c.copy(IRON).lerp(DULL,.3));
 for(const [list,material,part] of [[metal,metalMat,'bell-metal'],[wood,woodMat,'bell-handle']]){
  const geo=mergeGeometries(list.map(q=>{if(!q.index)q.setIndex([...Array(q.attributes.position.count).keys()]);return q;}));
  list.forEach(q=>q.dispose());geo.rotateZ(phi);
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=part;g.add(mesh);
 }
 const b=new THREE.Box3();g.children.forEach(p=>{p.geometry.computeBoundingBox();b.union(p.geometry.boundingBox);});
 const mid=b.getCenter(new THREE.Vector3());g.children.forEach(p=>p.geometry.translate(-mid.x,-b.min.y,-mid.z));
 g.rotation.y=-.5;
}

// The crystal ball: a clear glass orb held in three brass dragon talons on a turned ebony stand.
// The orb stays centred at y .14 with radius .105, because wand-auras.js swirls its mist there.
// The stand is one vertex-coloured mesh: a stepped foot with a bead and scored rings, and a shallow
// dish for the orb. The brass (a collar, a seat ring and the three talons, each with knuckles and
// a hooked claw curling over the glass) is a second. The glass is three meshes drawn back to front:
// a dark inner shell that gives the orb its depth, a faint static wisp of mist, and the outer
// surface, tinted warm low down where it picks up the brass and with a baked window glint.
function buildCrystalBall({g,materials}){
 const C=hex=>new THREE.Color(hex),c=new THREE.Color();
 const woodMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.35});
 const brassMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.85,roughness:.28});
 const depthMat=new THREE.MeshBasicMaterial({color:0x14224a,transparent:true,opacity:.4,side:THREE.BackSide,depthWrite:false});
 const mistMat=new THREE.MeshBasicMaterial({color:0xd4e4ff,transparent:true,opacity:.18,depthWrite:false});
 const glassMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.03,metalness:.1,transparent:true,opacity:.42,emissive:0x2a4a88,emissiveIntensity:.3,depthWrite:false});
 materials.push(woodMat,brassMat,depthMat,mistMat,glassMat);
 const CY=.14,R=.105;
 const paint=(geo,list,tone)=>{
  geo.deleteAttribute('uv');const p=geo.attributes.position,cs=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i));cs.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));list.push(geo);return geo;
 };
 const merged=(list,material,part)=>{
  const geo=mergeGeometries(list.map(q=>{q.deleteAttribute('uv');if(!q.index)q.setIndex([...Array(q.attributes.position.count).keys()]);return q;}));list.forEach(q=>q.dispose());
  const mesh=new THREE.Mesh(geo,material);mesh.userData.part=part;g.add(mesh);return mesh;
 };
 // The stand, profile from the centre of the underside out, up the foot and back in over the dish.
 const WOOD=C(0x2c1c16),WOOD_LT=C(0x6a4632),WOOD_DK=C(0x120a07);
 const prof=[[0,0],[.094,0],[.1,.004],[.1,.012],[.095,.016],[.089,.018],[.091,.022],[.086,.026],[.072,.03],[.066,.036],[.068,.04],[.063,.046],[.058,.047],[.045,.041],[.025,.034],[0,.031]];
 const wood=[],brass=[];
 paint(new THREE.LatheGeometry(prof.map(([r,y])=>new THREE.Vector2(r,y)),48),wood,(x,y,z)=>{
  const n=stoneNoise(x*70,y*9,z*70,5);c.copy(WOOD).lerp(n>0?WOOD_LT:WOOD_DK,Math.abs(n)*.45);
  // Scored rings on the foot, and polish on the rim and the bead.
  for(const at of [.008,.0335])if(Math.abs(y-at)<.0012)c.lerp(WOOD_DK,.75);
  const r=Math.hypot(x,z);if((r>.097&&y>.002&&y<.014)||Math.abs(y-.02)<.0025||Math.abs(y-.04)<.002)c.lerp(WOOD_LT,.35);
  if(r<.058&&y>.03)c.lerp(WOOD_DK,.5);
 });
 const BRASS=C(0xb8893a),BRIGHT=C(0xf0cf7a),GRIME=C(0x4a3414);
 const brassTone=(x,y,z,shine)=>{const n=stoneNoise(x*90,y*90,z*90,4);c.copy(BRASS).lerp(n>0?BRIGHT:GRIME,Math.abs(n)*.35+shine);};
 // A collar round the waist of the stand, and the seat ring the orb rests in.
 paint(new THREE.TorusGeometry(.07,.0035,8,48).rotateX(Math.PI/2).translate(0,.031,0),brass,(x,y,z)=>brassTone(x,y,z,y>.033?.3:0));
 paint(new THREE.TorusGeometry(.059,.0045,8,48).rotateX(Math.PI/2).translate(0,.05,0),brass,(x,y,z)=>brassTone(x,y,z,y>.052?.35:0));
 // Three talons climb from the collar up the glass, hugging it just outside its surface.
 const onOrb=(theta,phi,r)=>new THREE.Vector3(Math.sin(theta)*Math.cos(phi)*r,CY-Math.cos(theta)*r,Math.sin(theta)*Math.sin(phi)*r);
 const deg=Math.PI/180;
 for(let k=0;k<3;k++){
  const phi=k*Math.PI*2/3+.5,out=new THREE.Vector3(Math.cos(phi),0,Math.sin(phi));
  const pts=[out.clone().multiplyScalar(.074).setY(.031),out.clone().multiplyScalar(.079).setY(.045)];
  for(const th of [42,56,70,84,96])pts.push(onOrb(th*deg,phi,R+.0065-(th-42)*.00005));
  const curve=new THREE.CatmullRomCurve3(pts),SEG=40,RAD=8;
  const tube=new THREE.TubeGeometry(curve,SEG,1,RAD,false),p=tube.attributes.position,P=new THREE.Vector3(),q=new THREE.Vector3();
  // Taper from a thick wrist at the collar to a slim last joint.
  for(let i=0;i<p.count;i++){
   const s=Math.floor(i/(RAD+1))/SEG;curve.getPointAt(s,P);q.fromBufferAttribute(p,i).sub(P);
   q.multiplyScalar(.0068-.0032*s).add(P);p.setXYZ(i,q.x,q.y,q.z);
  }
  paint(tube,brass,(x,y,z)=>{
   // Bright on the outer ridge of each finger, grimy where it meets the glass.
   q.set(x,y-CY,z);const d=q.length();brassTone(x,y,z,Math.max(0,Math.min(.45,(d-R-.004)*80)));
  });
  // Knuckles, and a hooked claw at the tip curling in over the glass.
  for(const th of [58,80]){const at=onOrb(th*deg,phi,R+.0065-(th-42)*.00005);paint(new THREE.SphereGeometry(.0068-.0012*(th-58)/22,12,8).translate(at.x,at.y,at.z),brass,(x,y,z)=>brassTone(x,y,z,.2));}
  const tip=curve.getPointAt(1),tan=curve.getTangentAt(1),inward=new THREE.Vector3(0,CY,0).sub(tip).normalize();
  const dir=tan.clone().add(inward.multiplyScalar(.15)).normalize();
  const claw=new THREE.ConeGeometry(.0036,.019,8).translate(0,.0095,0);
  claw.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir));claw.translate(tip.x,tip.y,tip.z);
  paint(claw,brass,(x,y,z)=>c.copy(BRIGHT).lerp(GRIME,.25));
  // Scales across the back of the wrist, as three flattened plates.
  for(let i=0;i<3;i++){
   const at=curve.getPointAt(.1+i*.09),n=at.clone().sub(new THREE.Vector3(0,CY,0)).normalize();
   const plate=new THREE.SphereGeometry(.0072-i*.0008,10,6).scale(1,.45,1.3);
   plate.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),n));
   plate.translate(at.x+n.x*.0035,at.y+n.y*.0035,at.z+n.z*.0035);
   paint(plate,brass,(x,y,z)=>brassTone(x,y,z,.15));
  }
 }
 const stand=merged(wood,woodMat,'crystal-ball-stand'),fittings=merged(brass,brassMat,'crystal-ball-brass');
 stand.castShadow=stand.receiveShadow=fittings.castShadow=fittings.receiveShadow=true;
 // The glass, back to front. Same position for all three, so they draw in the order added.
 merged([new THREE.SphereGeometry(R-.004,32,20).translate(0,CY,0)],depthMat,'crystal-ball-depth');
 // A wisp of mist: flattened puffs on a loose spiral round the same tilted axis the aura spins.
 const mist=[];
 for(let i=0;i<7;i++){
  const a=i*.95,r=.018+i*.0065,y=(i%2?.006:-.006)-i*.001;
  const puff=new THREE.SphereGeometry(.018+i*.002,12,8).scale(1.6,.5,1).rotateY(-a).translate(Math.cos(a)*r,y,Math.sin(a)*r).rotateZ(-.31).translate(0,CY,0);
  puff.deleteAttribute('uv');mist.push(puff);
 }
 merged(mist,mistMat,'crystal-ball-mist');
 const WARM=C(0xe0c89a),COOL=C(0xb8d4ff),PALE=C(0xeef6ff),glint=new THREE.Vector3(-.45,.7,.55).normalize(),v=new THREE.Vector3();
 const glass=paint(new THREE.SphereGeometry(R,56,36).translate(0,CY,0),[],(x,y,z)=>{
  v.set(x,y-CY,z).divideScalar(R);
  c.copy(COOL).lerp(WARM,Math.max(0,-v.y-.35)*.9).lerp(PALE,Math.max(0,v.y)*.3);
  // A window's reflection high on one side: a bright square spot with a softer halo.
  const d=v.dot(glint);if(d>.9)c.lerp(C(0xffffff),Math.min(1,(d-.9)*12));
 });
 const outer=new THREE.Mesh(glass,glassMat);outer.userData.part='crystal-ball-glass';g.add(outer);
}

// The horn: a cow-horn hunting horn lying on its side, curled in a crescent that lifts off the
// floor in the middle. Tooled, frost and fire horns and the horn of plenty share the look. The
// horn is one swept, vertex-coloured mesh: black at the tip fading through streaked amber to a
// pale, ridged base, open at the mouth with a dark bore. The brass is a second mesh: a mouthpiece
// cup, a ferrule on the tip, a rolled and engraved rim on the mouth, and two bands with staples
// and rings. A leather baldric (the third mesh) runs from ring to ring in a slack loop on the
// floor, with stitched edges and a brass buckle.
function buildHorn({g,materials}){
 const C=hex=>new THREE.Color(hex),V=(x,y,z)=>new THREE.Vector3(x,y,z),c=new THREE.Color(),Y=V(0,1,0);
 const hornMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.42,metalness:.05});
 const brassMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.8,roughness:.3});
 const leatherMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.8});
 materials.push(hornMat,brassMat,leatherMat);
 // The centre line in plan, measured by arc length s from the tip (s=0) to the mouth (s=L).
 const plan=new THREE.CatmullRomCurve3([V(-.17,0,.075),V(-.105,0,-.02),V(0,0,-.065),V(.105,0,-.04),V(.17,0,.04)]),L=plan.getLength();
 const R=s=>{const t=Math.min(1,Math.max(0,s/L));return .0095+.044*t**1.7;};
 // The middle arches up off the floor, so it rests on the tip and the mouth.
 const raw=s=>{const t=Math.min(1,Math.max(0,s/L)),p=plan.getPointAt(t);p.y=R(s)+.014*Math.sin(Math.PI*t)**1.5;return p;};
 const tan=s=>{const a=Math.min(L-1e-4,Math.max(1e-4,s));return raw(a+1e-4).sub(raw(a-1e-4)).normalize();};
 // Past either end the line runs straight on, so the mouthpiece continues the tip's direction.
 const centre=s=>{const t=tan(s),p=s<0?raw(0).addScaledVector(t,s):s>L?raw(L).addScaledVector(t,s-L):raw(s);return {p,t};};
 // Sweep rings of N vertices round the centre line; the index wraps, so there is no seam.
 // Rows that run back towards the tip face inwards (the bore, the inside of a cup).
 const sweep=(prof,N,tone,line=centre,w=1,h=1)=>{
  const pos=[],col=[],idx=[];
  prof.forEach(([s,r,kind],k)=>{
   const {p,t}=line(s),side=Y.clone().cross(t);if(side.lengthSq()<1e-6)side.set(1,0,0);side.normalize();const up=t.clone().cross(side);
   for(let j=0;j<N;j++){
    const a=j/N*Math.PI*2,q=p.clone().addScaledVector(up,Math.cos(a)*r*h).addScaledVector(side,Math.sin(a)*r*w);
    pos.push(q.x,q.y,q.z);tone(kind,s,a,q,j);col.push(c.r,c.g,c.b);
   }
   if(k>0)for(let j=0;j<N;j++){const a=(k-1)*N+j,b=(k-1)*N+(j+1)%N,d=k*N+j,e=k*N+(j+1)%N;idx.push(a,d,b,b,d,e);}
  });
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  geo.setIndex(idx);geo.computeVertexNormals();return geo;
 };
 // Growth ridges ring the wide end, fading out towards the tip.
 const ridge=s=>{const t=s/L;return t>.45?.0007*Math.sin(s*520)*Math.min(1,(t-.45)/.2):0;};
 const bands=[.3,.64].map(t=>t*L),rim=L-.02;
 const hprof=[];
 for(let s=0;s<=L;s+=s>L*.4?.0022:.004)hprof.push([s,R(s)+ridge(s),'out']);
 for(let i=0;i<=5;i++){const a=i/5*Math.PI;hprof.push([L+Math.sin(a)*.002,R(L)-.002+Math.cos(a)*.002,'lip']);}
 for(let s=L-.001;s>L-.14;s-=.004)hprof.push([s,R(s)-.004,'bore']);
 const IVORY=C(0xe8d9b4),AMBER=C(0xb88a4c),STREAK=C(0x7a5430),BLACK=C(0x1c1612),INK=C(0x0c0806),POLISH=C(0xfff4dc);
 const horn=sweep(hprof,28,(kind,s,a,q)=>{
  const t=s/L,n=stoneNoise(q.x*30,q.y*30,q.z*30,4);
  // Pale at the base, amber through the middle, black at the tip, with long streaks between.
  c.copy(IVORY).lerp(AMBER,THREE.MathUtils.smoothstep(.85-t,0,.55)*.8);
  const streak=Math.sin(a*7+Math.sin(t*9)*1.5+n*1.2);if(streak>.55)c.lerp(STREAK,(streak-.55)*1.2*(1-t*.6));
  c.lerp(BLACK,THREE.MathUtils.smoothstep(.36-t+n*.06,0,.22));
  if(kind==='out'&&t>.45&&Math.sin(s*520)<-.6)c.lerp(STREAK,.35*Math.min(1,(t-.45)/.2));
  // Polished on top, where it is handled.
  if(kind!=='bore'&&Math.cos(a)>.75)c.lerp(POLISH,.22*(Math.cos(a)-.75)*4);
  if(kind==='bore')c.lerp(INK,Math.min(.95,.35+(L-s)/.05));
 });
 // The brass: mouthpiece cup and shank running back off the tip, a ferrule, two bands and the rim.
 const BRASS=C(0xc99a3e),BRIGHT=C(0xf3d98a),DULL=C(0x6b4c1a),TARN=C(0x55563a);
 const brassTone=(kind,s,a,q)=>{
  const n=stoneNoise(q.x*40,q.y*40,q.z*40,6);
  c.copy(BRASS).lerp(n>0?BRIGHT:DULL,Math.abs(n)*.3);if(n<-.5)c.lerp(TARN,.4);
  if(Math.cos(a)>.6)c.lerp(BRIGHT,.35);
  if(kind==='cup')c.lerp(INK,.75);
  if(kind==='eng'&&Math.abs(Math.sin(a*8+Math.sin(a*16)*.8))<.25)c.lerp(DULL,.8);
  if(kind==='groove')c.lerp(DULL,.7);
 };
 const mp=[[-.043,.002,'cup'],[-.044,.0055,'cup'],[-.046,.0082,'cup'],[-.0485,.0092,'rim'],[-.0495,.0098,'rim'],[-.048,.0101,'rim'],[-.045,.0096,'m'],[-.04,.0075,'m'],[-.033,.0058,'m'],[-.012,.0055,'m'],[-.011,.0068,'groove'],[-.008,.0068,'m'],[-.007,.0075,'m'],[.012,R(.012)+.0022,'m'],[.014,R(.014)+.0015,'m'],[.015,R(.015)-.001,'m']];
 const collar=(s0,s1,eng)=>{
  const p=[[s0,R(s0)-.001,'m'],[s0,R(s0)+.0018,'m'],[s0+.0015,R(s0)+.0028,'m']];
  for(let s=s0+.003;s<s1-.002;s+=.002)p.push([s,R(s)+.0028,eng&&s>s0+.004&&s<s1-.004?'eng':Math.abs(s-(s0+s1)/2)<.0012?'groove':'m']);
  p.push([s1-.0015,R(s1)+.0028,'m'],[s1,R(s1)+.0018,'m'],[s1,R(s1)-.001,'m']);return p;
 };
 const brass=[sweep(mp,24,brassTone)];
 for(const s of bands)brass.push(sweep(collar(s-.007,s+.007,false),28,brassTone));
 // The mouth rim wraps over the lip and a little way down the bore.
 const rp=collar(rim,L,true).slice(0,-2);
 for(let i=0;i<=6;i++){const a=i/6*Math.PI;rp.push([L+.0015+Math.sin(a)*.0038,R(L)-.001+Math.cos(a)*.0038,'m']);}
 rp.push([L-.008,R(L-.008)-.0052,'m'],[L-.009,R(L-.009)-.0038,'m']);
 brass.push(sweep(rp,32,brassTone));
 // Each band carries a staple on top and a ring standing in it, facing out of the crescent.
 const rings=bands.map(s=>{
  const {p,t}=centre(s),side=Y.clone().cross(t).normalize(),up=t.clone().cross(side),r=R(s)+.0028;
  const staple=new THREE.CylinderGeometry(.0028,.0028,.009,8).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y,side));
  staple.translate(...p.clone().addScaledVector(up,r+.0012).toArray());
  const ring=new THREE.TorusGeometry(.0085,.0017,6,16).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,0,1),side));
  const at=p.clone().addScaledVector(up,r+.0085);ring.translate(at.x,at.y,at.z);
  for(const geo of [staple,ring]){geo.deleteAttribute('uv');const P=geo.attributes.position,cs=[];for(let i=0;i<P.count;i++){brassTone('m',0,P.getY(i)>at.y?0:Math.PI,V(P.getX(i),P.getY(i),P.getZ(i)));cs.push(c.r,c.g,c.b);}geo.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));brass.push(geo);}
  return {at,side};
 });
 const hornGeo=horn,brassGeo=mergeGeometries(brass);brass.forEach(q=>q.dispose());
 const floor=Math.min(...[hornGeo,brassGeo].map(q=>{q.computeBoundingBox();return q.boundingBox.min.y;}));
 // The baldric: a flat strap from ring to ring that falls away on the outside of the crescent
 // and lies in a slack loop on the floor. The crescent bows towards -z, so that is outside.
 const T=.0022,W=.0065,fy=floor+T*.5+.0004;
 const [A,B]=rings.map(r=>r.at);
 const pts=[A,V(A.x-.004,fy+.012,A.z-.03),V(A.x-.02,fy,A.z-.065),V(A.x+.01,fy,-.17),V((A.x+B.x)/2+.02,fy,-.195),V(B.x-.02,fy,-.17),V(B.x+.025,fy,B.z-.07),V(B.x+.006,fy+.012,B.z-.032),B];
 const strapCurve=new THREE.CatmullRomCurve3(pts,false,'centripetal'),SL=strapCurve.getLength();
 const strapLine=s=>{const u=Math.min(1,Math.max(0,s/SL));return {p:strapCurve.getPointAt(u),t:strapCurve.getTangentAt(u)};};
 const sp=[];for(let s=0;s<=SL+1e-6;s+=SL/140)sp.push([s,1,'strap']);
 const LEATHER=C(0x6a3e22),LEATHER_LT=C(0x9a643a),LEATHER_DK=C(0x2e1a0e),THREAD=C(0xd8c49a);
 const strap=sweep(sp,10,(kind,s,a,q,j)=>{
  const n=stoneNoise(q.x*50,0,q.z*50,4);c.copy(LEATHER).lerp(n>0?LEATHER_LT:LEATHER_DK,Math.abs(n)*.35);
  // Stitching runs along both edges of the top face.
  if((j===1||j===9)&&Math.sin(s*900)>0)c.lerp(THREAD,.7);
  if(j>=2&&j<=3||j>=7&&j<=8)c.lerp(LEATHER_DK,.45);
 },strapLine,W,T*.5);
 // Keep the strap out of the floor where the spline dips.
 {const P=strap.attributes.position;for(let i=0;i<P.count;i++)if(P.getY(i)<floor+.0002)P.setY(i,floor+.0002);strap.computeVertexNormals();}
 // A brass buckle where the loop lies flat: a rounded frame and a tongue across the strap.
 const bs=SL*.36,{p:bp,t:bt}=strapLine(bs),yaw=Math.atan2(bt.x,bt.z);
 const buckle=new THREE.TorusGeometry(.0098,.0014,5,4,Math.PI*2).rotateZ(Math.PI/4).scale(1.1,.8,1).rotateX(Math.PI/2).rotateY(yaw);
 buckle.translate(bp.x,fy+T*.5+.0012,bp.z);
 const tongue=new THREE.BoxGeometry(.0016,.0012,.011).rotateY(yaw).translate(bp.x,fy+T*.5+.0016,bp.z);
 const extra=[buckle,tongue].map(geo=>{geo.deleteAttribute('uv');const P=geo.attributes.position,cs=[];for(let i=0;i<P.count;i++){brassTone('m',0,0,V(P.getX(i),P.getY(i),P.getZ(i)));cs.push(c.r,c.g,c.b);}geo.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));if(!geo.index)geo.setIndex([...Array(P.count).keys()]);return geo;});
 const brassAll=mergeGeometries([brassGeo,...extra]);brassGeo.dispose();extra.forEach(q=>q.dispose());
 for(const [geo,material,part] of [[hornGeo,hornMat,'horn-body'],[brassAll,brassMat,'horn-brass'],[strap,leatherMat,'horn-strap']]){
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=part;g.add(mesh);
 }
 const b=new THREE.Box3();g.children.forEach(p=>{p.geometry.computeBoundingBox();b.union(p.geometry.boundingBox);});
 const mid=b.getCenter(V(0,0,0));g.children.forEach(p=>p.geometry.translate(-mid.x,-b.min.y,-mid.z));
 g.rotation.y=.4;
}

// The credit card: a bank card lying face up with a slight bow. The plastic is one merged
// mesh (a rounded-corner slab whose face is painted per vertex with a blue sweep, a pale
// swoosh, fine guilloche waves and a gold rule; the back has the magnetic stripe and the
// signature panel; the edge shows the white core) plus a printed contactless mark. The foil
// mesh holds the gold chip with its eight contacts, a rainbow hologram and the embossed,
// silver-tipped number and expiry date in seven-segment figures.
function buildCreditCard({g,materials}){
 const C=hex=>new THREE.Color(hex),v=(x,y,z)=>new THREE.Vector3(x,y,z);
 const plasticMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.32});
 const foilMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.85,roughness:.26});
 materials.push(plasticMat,foilMat);
 const W=.2,D=.126,T=.0036,R=.009,lists={plastic:[],foil:[]},c=new THREE.Color();
 const put=(geo,paint,which)=>{
  const out=geo.index?geo.toNonIndexed():geo;if(out!==geo)geo.dispose();
  out.deleteAttribute('uv');
  const p=out.attributes.position,n=out.attributes.normal,cols=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   paint(c,p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i));
   cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;
  }
  out.setAttribute('color',new THREE.BufferAttribute(cols,3));
  lists[which].push(out);
 };
 // A flat grid over the card, its corner vertices pulled in onto the rounded corners.
 const face=(nx,nz,y,up)=>{
  const geo=new THREE.PlaneGeometry(W,D,nx,nz);geo.rotateX(up?-Math.PI/2:Math.PI/2);
  const p=geo.attributes.position,cx=W/2-R,cz=D/2-R;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),z=p.getZ(i),ax=Math.abs(x)-cx,az=Math.abs(z)-cz,d=Math.hypot(ax,az);
   if(ax>0&&az>0&&d>R){p.setX(i,Math.sign(x)*(cx+ax*R/d));p.setZ(i,Math.sign(z)*(cz+az*R/d));}
   p.setY(i,y);
  }
  return geo;
 };
 // The face (text reads along +x, the top edge is -z): a deep blue sweep, a pale swoosh
 // across the middle, fine interlaced waves, a gold rule near the top and a darker foot.
 const navy=C(0x14306e),blue=C(0x2e68b8),sky=C(0x8ab8e8),gold=C(0xc9a247),white=C(0xeef3f8);
 const front=(col,x,y,z)=>{
  col.copy(navy).lerp(blue,Math.min(1,Math.max(0,(x/W+.5)*.7+(z/D+.5)*.5)));
  const swoosh=z-(.018*Math.sin(x*16+.6)-.004);
  col.lerp(sky,Math.max(0,1-Math.abs(swoosh)/.011)*.45);
  const wave=Math.sin(z*420+Math.sin(x*60)*6)*Math.sin(z*380-Math.sin(x*48+1)*7);
  if(wave>.8)col.lerp(white,(wave-.8)*.35);
  if(Math.abs(z+.049)<.0016&&x>-.085&&x<.085)col.lerp(gold,.85);
  if(z>.05)col.lerp(navy,.35);
  // The bank's wordmark: a pale block at the top right.
  if(x>.045&&x<.088&&z>-.045&&z<-.034)col.lerp(white,.8);
 };
 // The back: a black magnetic stripe across the top and a hatched white signature panel.
 const back=(col,x,y,z)=>{
  col.copy(blue).lerp(navy,.4);
  if(z>-.05&&z<-.032)col.set(0x0c0c0e);
  else if(z>-.018&&z<-.004&&x>-.085&&x<.035)col.copy(white).lerp(sky,Math.sin((x+z)*900)>.3?.35:0);
 };
 put(face(72,46,T,true),front,'plastic');
 put(face(24,16,0,false),back,'plastic');
 // The edge: a rounded-rectangle slab just inside the faces, so only its sides show: a white
 // core between thin blue laminates.
 const shape=new THREE.Shape(),hw=W/2-.0002,hd=D/2-.0002,r=R-.0002;
 shape.moveTo(-hw+r,-hd);shape.lineTo(hw-r,-hd);shape.absarc(hw-r,-hd+r,r,-Math.PI/2,0);
 shape.lineTo(hw,hd-r);shape.absarc(hw-r,hd-r,r,0,Math.PI/2);shape.lineTo(-hw+r,hd);
 shape.absarc(-hw+r,hd-r,r,Math.PI/2,Math.PI);shape.lineTo(-hw,-hd+r);shape.absarc(-hw+r,-hd+r,r,Math.PI,Math.PI*1.5);
 const slab=new THREE.ExtrudeGeometry(shape,{depth:T-.0004,bevelEnabled:false,curveSegments:6});
 slab.rotateX(Math.PI/2);slab.translate(0,T-.0002,0);
 put(slab,(col,x,y)=>col.copy(Math.abs(y-T/2)<T*.3?white:blue),'plastic');
 // The contactless mark: four nested arcs opening towards +x beside the chip.
 for(let i=0;i<4;i++){
  const arc=new THREE.TorusGeometry(.0028+i*.0024,.00055,3,12,Math.PI*.55);
  arc.rotateZ(-Math.PI*.275);arc.rotateX(-Math.PI/2);arc.scale(1,.3,1);arc.translate(-.052,T+.0001,-.008);
  put(arc,col=>col.copy(white),'plastic');
 }
 // The chip: a gold plate with eight contacts cut by dark lines, a centre pad and a slight dome.
 const CX=-.066,CZ=-.008,CW=.025,CD=.019;
 const plate=new RoundedBoxGeometry(CW,.0006,CD,2,.0002);plate.translate(CX,T,CZ);
 const goldHi=C(0xf3d27a),goldLo=C(0x8e6a22),line=C(0x3a2c10);
 put(plate,(col,x,y,z,nx,ny)=>col.copy(gold).lerp(goldLo,1-Math.max(0,ny)),'foil');
 const pads=new THREE.PlaneGeometry(CW-.0006,CD-.0006,28,21);pads.rotateX(-Math.PI/2);pads.translate(CX,T+.00031,CZ);
 put(pads,(col,x,y,z)=>{
  const u=(x-CX)/CW,w=(z-CZ)/CD;
  col.copy(gold).lerp(goldHi,Math.max(0,.4-Math.hypot(u+.15,w+.2))*1.5);
  const inPad=Math.abs(u)<.16&&Math.abs(w)<.3;
  let cut=Math.abs(Math.abs(u)-.2)<.03&&Math.abs(w)<.45;
  if(Math.abs(u)>.2)for(const k of [-.25,0,.25])if(Math.abs(w-k)<.035)cut=true;
  if(Math.abs(Math.abs(u)-.16)<.03&&Math.abs(w)<.3||Math.abs(Math.abs(w)-.3)<.035&&Math.abs(u)<.16)cut=true;
  if(cut)col.copy(line);else if(inPad)col.lerp(goldHi,.25);
 },'foil');
 // The hologram: a small rainbow foil patch at the lower right with a bright bird-like crest.
 const holo=new THREE.PlaneGeometry(.028,.017,16,10);holo.rotateX(-Math.PI/2);holo.translate(.07,T+.0001,.04);
 put(holo,(col,x,y,z)=>{
  const u=(x-.07)/.028,w=(z-.04)/.017;
  col.setHSL(((u*1.3+w*.9+Math.sin(u*9)*.15)%1+1)%1,.55,.7);
  if(Math.abs(w+.12*Math.cos(u*6))<.09&&Math.abs(u)<.35)col.lerp(white,.6);
 },'foil');
 // Embossed figures: raised seven-segment strokes, silver tipping on top.
 const SEGS=['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'];
 const silver=C(0xd8dde4),shade=C(0x7a8290);
 const tip=(col,x,y,z,nx,ny)=>col.copy(silver).lerp(shade,1-Math.max(0,ny));
 const stroke=(w,d,x,z,rot=0)=>{const b=new THREE.BoxGeometry(w,.0007,d);b.rotateY(rot);b.translate(x,T+.00035,z);put(b,tip,'foil');};
 const digit=(ch,x,z,dw,dh)=>{
  const s=.0012,segs=ch==='/'?'':SEGS[+ch];
  if(ch==='/'){stroke(s,dh*1.05,x+dw/2,z,-.35);return;}
  const H={a:-dh/2,g:0,d:dh/2},V={f:[0,-dh/4],b:[dw,-dh/4],e:[0,dh/4],c:[dw,dh/4]};
  for(const k of segs){
   if(H[k]!==undefined)stroke(dw,s,x+dw/2,z+H[k]);
   else stroke(s,dh/2,x+V[k][0],z+V[k][1]);
  }
 };
 const number='5316208477194402';
 for(let i=0;i<16;i++)digit(number[i],-.078+i*.0086+Math.floor(i/4)*.0058,.018,.0056,.0105);
 [...'09/31'].forEach((ch,i)=>digit(ch,.002+i*.0062,.037,.0038,.0068));
 // The holder's name, embossed as a row of short blocks.
 for(let i=0;i<9;i++)if(i!==3)stroke(.0036,.0052,-.076+i*.0053,.05);
 // Merge, bow the card a little along its length and set it down.
 const bow=x=>.0026*(2*x/W)**2;
 for(const [which,material] of [['plastic',plasticMat],['foil',foilMat]]){
  const list=lists[which],geo=mergeGeometries(list);list.forEach(p=>p.dispose());
  const p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+bow(p.getX(i)));
  geo.computeBoundingBox();
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=`credit-card-${which}`;g.add(mesh);
 }
 g.rotation.y=.3;
}

// The iron safe (an UnNetHack container): a squat, riveted strongbox on four stub feet, its
// door on +z with barrel hinges, a brass combination dial, a three-spoke wheel handle, a
// keyhole escutcheon and a maker's plate. Every part is coloured per vertex (blackened iron
// with rubbed edges and rust low down, brass fittings, dark recesses) and merged into one mesh.
function buildSafe({g,materials}){
 const C=hex=>new THREE.Color(hex);
 const IRON={base:C(0x3e4448),light:C(0x7d878c),dark:C(0x1c2023)},BRASS={base:C(0xb89040),light:C(0xe8cc7a),dark:C(0x6a4c1c)};
 const RUST=C(0x6e3a1e),INK=C(0x0c0d0e);
 const metal=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.62,roughness:.48});
 materials.push(metal);
 const parts=[];
 const put=(geo,{look=IRON,flat,rust=true}={})=>{
  geo.deleteAttribute('uv');
  const out=geo.index?geo.toNonIndexed():geo;if(out!==geo)geo.dispose();
  const p=out.attributes.position,n=out.attributes.normal,cols=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),c=look.base.clone();
   if(flat)c.copy(flat);
   else{
    const s=stoneNoise(x*3,y*3,z*3,40);c.lerp(s>0?look.light:look.dark,Math.abs(s)*.35);
    // Rubbed bright where hands and boots catch the corners; grime and rust near the floor.
    const edge=Math.max(Math.abs(n.getX(i)),Math.abs(n.getY(i)),Math.abs(n.getZ(i)));
    if(edge<.9)c.lerp(look.light,(.9-edge)*.9);
    if(n.getY(i)<0)c.lerp(look.dark,-n.getY(i)*.5);
    if(rust){
     const r=stoneNoise(x*5+1.3,y*2,z*5,33)*.5+.5,low=Math.max(0,1-y/.16);
     if(r>.55)c.lerp(RUST,Math.min(1,(r-.55)*2.2)*(.25+low*.6));
    }
   }
   cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;
  }
  out.setAttribute('color',new THREE.BufferAttribute(cols,3));parts.push(out);
 };
 const W=.34,D=.3,H=.34,F=.022,front=D/2,top=F+H;
 // Stub feet, the body and a plinth band round its foot.
 for(const x of [-1,1])for(const z of [-1,1]){const foot=new THREE.CylinderGeometry(.02,.024,F,10);foot.translate(x*(W/2-.035),F/2,z*(D/2-.035));put(foot);}
 const body=new RoundedBoxGeometry(W,H,D,3,.018);body.translate(0,F+H/2,0);put(body);
 const plinth=new RoundedBoxGeometry(W+.012,.03,D+.012,2,.006);plinth.translate(0,F+.015,0);put(plinth);
 const lip=new RoundedBoxGeometry(W+.008,.016,D+.008,2,.005);lip.translate(0,top-.008,0);put(lip,{rust:false});
 // The door stands proud of the front, framed by a dark gap.
 const dW=.27,dH=.25,dY=F+.04+dH/2+.005,dZ=front+.011;
 const gap=new THREE.BoxGeometry(dW+.012,dH+.012,.004);gap.translate(0,dY,front+.001);put(gap,{flat:INK});
 const door=new RoundedBoxGeometry(dW,dH,.02,2,.006);door.translate(0,dY,dZ);put(door);
 const face=dZ+.01;
 // Rivets round the door and along the body's front edges.
 const rivet=(x,y,z,r=.0065)=>{const s=new THREE.SphereGeometry(r,8,5,0,Math.PI*2,0,Math.PI/2);s.rotateX(Math.PI/2);s.translate(x,y,z);put(s,{rust:false});};
 for(let i=0;i<6;i++){const t=(i+.5)/6;rivet(-dW/2+.016+t*(dW-.032)-.01*(t-.5),dY+dH/2-.014,face);rivet(-dW/2+.016+t*(dW-.032),dY-dH/2+.014,face);}
 for(let i=1;i<4;i++){const y=dY-dH/2+.014+i*(dH-.028)/4;rivet(dW/2-.014,y,face);}
 for(let i=0;i<7;i++){const y=F+.05+i*(H-.08)/6;for(const x of [-1,1])rivet(x*(W/2-.012),y,front+.001,.0055);}
 // Two barrel hinges on the left edge, each with a brass pin cap.
 for(const y of [dY-dH/2+.045,dY+dH/2-.045]){
  const barrel=new THREE.CylinderGeometry(.011,.011,.055,10);barrel.translate(-dW/2-.004,y,dZ+.004);put(barrel,{rust:false});
  const cap=new THREE.CylinderGeometry(.007,.009,.008,10);cap.translate(-dW/2-.004,y+.031,dZ+.004);put(cap,{look:BRASS,rust:false});
 }
 // The combination dial: a brass bezel, a black face with twelve ticks and a centre knob.
 const dialX=.045,dialY=dY+.055;
 const bezel=new THREE.TorusGeometry(.045,.006,6,28);bezel.translate(dialX,dialY,face+.004);put(bezel,{look:BRASS,rust:false});
 const dial=new THREE.CylinderGeometry(.042,.042,.01,28);dial.rotateX(Math.PI/2);dial.translate(dialX,dialY,face+.005);put(dial,{flat:C(0x16181a)});
 for(let i=0;i<12;i++){
  const a=i/12*Math.PI*2,tick=new THREE.BoxGeometry(.003,i%3?.008:.013,.002);tick.rotateZ(-a);
  tick.translate(dialX+Math.sin(a)*.032,dialY+Math.cos(a)*.032,face+.011);put(tick,{flat:BRASS.light});
 }
 const knob=new THREE.CylinderGeometry(.016,.019,.02,16);knob.rotateX(Math.PI/2);knob.translate(dialX,dialY,face+.02);put(knob,{look:BRASS,rust:false});
 const mark=new THREE.BoxGeometry(.004,.012,.004);mark.translate(dialX,dialY+.013,face+.031);put(mark,{flat:INK});
 // The wheel handle: a hub on a stem with three spokes ending in round grips.
 const wheelX=.045,wheelY=dY-.06;
 const hub=new THREE.CylinderGeometry(.015,.017,.03,12);hub.rotateX(Math.PI/2);hub.translate(wheelX,wheelY,face+.015);put(hub,{look:BRASS,rust:false});
 for(let i=0;i<3;i++){
  const a=i/3*Math.PI*2+.3,spoke=new THREE.CylinderGeometry(.005,.006,.05,8);
  spoke.translate(0,.025,0);spoke.rotateZ(-a);spoke.translate(wheelX,wheelY,face+.024);put(spoke,{look:BRASS,rust:false});
  const grip=new THREE.SphereGeometry(.011,10,8);grip.translate(wheelX+Math.sin(a)*.052,wheelY+Math.cos(a)*.052,face+.024);put(grip,{look:BRASS,rust:false});
 }
 // A keyhole escutcheon to the left of the dial, and a maker's plate across the top.
 const esc=new RoundedBoxGeometry(.032,.046,.004,1,.0015);esc.translate(-.07,dY,face+.002);put(esc,{look:BRASS,rust:false});
 const hole=new THREE.CylinderGeometry(.0055,.0055,.003,10);hole.rotateX(Math.PI/2);hole.translate(-.07,dY+.007,face+.0045);put(hole,{flat:INK});
 const slot=new THREE.BoxGeometry(.004,.014,.003);slot.translate(-.07,dY-.004,face+.0045);put(slot,{flat:INK});
 const plate=new RoundedBoxGeometry(.11,.022,.004,1,.0015);plate.translate(-.02,dY+dH/2-.034,face+.002);put(plate,{look:BRASS,rust:false});
 for(let i=0;i<5;i++){const line=new THREE.BoxGeometry(.012,.0025,.001);line.translate(-.05+i*.015,dY+dH/2-.034,face+.0045);put(line,{flat:BRASS.dark});}
 const geo=mergeGeometries(parts);parts.forEach(p=>p.dispose());
 const mesh=new THREE.Mesh(geo,metal);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part='iron safe';g.add(mesh);
 g.rotation.y=-.3;
}

// The chest: an iron-bound oak treasure chest with a barrel lid, standing on four block feet.
// The body is three planks a side over a dark core, so the seams read as real gaps; the lid is
// five staves round a half-drum with planked end caps. Two iron straps wrap the body and lid,
// iron rims run round the top and foot, angle brackets guard the corners, drop rings hang from
// the ends and a brass lock plate with a keyhole sits under the lid's hasp. Two merged,
// vertex-coloured meshes: the wood and the metal.
function buildChest({g,materials}){
 const C=hex=>new THREE.Color(hex);
 const OAK={base:C(0x74492a),light:C(0xa06c3e),dark:C(0x3e2413)},CORE=C(0x1e120a);
 const IRON={base:C(0x3a3836),light:C(0x77736c),dark:C(0x161514)},BRASS={base:C(0xb08a3c),light:C(0xecd08a),dark:C(0x5e4318)};
 const RUST=C(0x6a3a1c),INK=C(0x0a0908);
 const woodMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:0,roughness:.82});
 const metalMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.6,roughness:.5});
 materials.push(woodMat,metalMat);
 const wood=[],metal=[];
 // grain: 'x' or 'z' for the direction the fibres run; tone shifts each plank a little.
 const put=(geo,{look=OAK,flat,grain='x',tone=0,rust=false,into}={})=>{
  if(geo.attributes.uv)geo.deleteAttribute('uv');
  const out=geo.index?geo.toNonIndexed():geo;if(out!==geo)geo.dispose();
  const p=out.attributes.position,n=out.attributes.normal,cols=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),c=look.base.clone();
   if(flat)c.copy(flat);
   else if(look===OAK){
    // Long streaky grain across the fibres, a knot or two, and a per-plank tone.
    const a=grain==='x'?x:z,b=grain==='x'?y+z:y+x;
    const s=Math.sin(b*260+Math.sin(a*9+tone*7)*2.2)*.5+.5*stoneNoise(a*2,b*20,tone,6);
    c.lerp(s>0?look.light:look.dark,Math.min(1,Math.abs(s)*.4));
    c.lerp(tone>0?look.light:look.dark,Math.abs(tone)*.5);
    const k=stoneNoise(a*14+tone*3,b*40,tone,3);if(k>.82)c.lerp(look.dark,(k-.82)*4);
    if(n.getY(i)<-.5)c.lerp(look.dark,.5);
    // Grimed low down, where the chest has been dragged.
    c.lerp(look.dark,Math.max(0,1-y/.06)*.35);
   }else{
    const s=stoneNoise(x*3,y*3,z*3,40);c.lerp(s>0?look.light:look.dark,Math.abs(s)*.35);
    const edge=Math.max(Math.abs(n.getX(i)),Math.abs(n.getY(i)),Math.abs(n.getZ(i)));
    if(edge<.9)c.lerp(look.light,(.9-edge)*.8);
    if(n.getY(i)<0)c.lerp(look.dark,-n.getY(i)*.4);
    if(rust){const r=stoneNoise(x*5+1.3,y*2,z*5,33)*.5+.5;if(r>.55)c.lerp(RUST,Math.min(1,(r-.55)*2.2)*.5);}
   }
   cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;
  }
  out.setAttribute('color',new THREE.BufferAttribute(cols,3));(into??(look===OAK||flat===CORE?wood:metal)).push(out);
 };
 const W=.42,D=.28,H=.17,F=.02,base=F,top=F+H,T=.012;
 const R=D/2+.006,K=.55;// lid radius and its vertical squash
 // Four block feet and the dark core the planks sit on.
 for(const x of [-1,1])for(const z of [-1,1]){const foot=new THREE.BoxGeometry(.045,F,.045);foot.translate(x*(W/2-.03),F/2,z*(D/2-.03));put(foot,{grain:'z',tone:-.3});}
 const core=new THREE.BoxGeometry(W-2*T+.002,H,D-2*T+.002);core.translate(0,base+H/2,0);put(core,{flat:CORE});
 // Three planks on each long side and on each end, with hairline gaps between them.
 const ph=H/3;
 for(const s of [-1,1])for(let i=0;i<3;i++){
  const tone=((i*7+(s>0?3:0))%5-2)*.12;
  const long=new THREE.BoxGeometry(W,ph-.004,T,6,1,1);long.translate(0,base+ph*(i+.5),s*(D/2-T/2));put(long,{grain:'x',tone});
  const end=new THREE.BoxGeometry(T,ph-.004,D-2*T,1,1,4);end.translate(s*(W/2-T/2),base+ph*(i+.5),0);put(end,{grain:'z',tone:-tone});
 }
 // The lid: a dark half-drum core, five staves round it and a planked cap on each end.
 const lidGeo=(r,len,t0,tl,open,seg=6)=>{
  const c=new THREE.CylinderGeometry(r,r,len,seg,1,open,t0,tl);
  c.rotateZ(Math.PI/2);c.scale(1,K,1);c.translate(0,top,0);return c;
 };
 // CylinderGeometry thetas run round the axis; after rotateZ(+pi/2), theta 0..pi covers the top half.
 put(lidGeo(R-.008,W-.004,0,Math.PI,false,20),{flat:CORE});
 const staves=5;
 for(let i=0;i<staves;i++){
  const t0=i/staves*Math.PI+.012,tl=Math.PI/staves-.024;
  put(lidGeo(R,W,t0,tl,true,4),{grain:'x',tone:((i*3)%5-2)*.11});
 }
 for(const s of [-1,1]){
  const cap=new THREE.CircleGeometry(R-.002,20,0,Math.PI);cap.rotateY(s*Math.PI/2);cap.scale(1,K,1);cap.translate(s*(W/2-.001),top,0);
  put(cap,{grain:'z',tone:.1});
 }
 // Iron: a rim band round the top of the body and one round the foot.
 const band=(w,h,d,x,y,z,opts={})=>{const b=new THREE.BoxGeometry(w,h,d);b.translate(x,y,z);put(b,{look:IRON,rust:true,...opts});};
 for(const [y,h] of [[top-.009,.018],[base+.009,.018]]){
  for(const s of [-1,1]){band(W+.006,h,.004,0,y,s*(D/2+.002));band(.004,h,D+.006,s*(W/2+.002),y,0);}
 }
 // Two straps wrap the body and run up over the lid.
 const strapX=.13,sw=.028;
 for(const x of [-strapX,strapX]){
  for(const s of [-1,1])band(sw,H,.005,x,base+H/2,s*(D/2+.0035));
  put(lidGeo(R+.004,sw,0,Math.PI,true,24).translate(x,0,0),{look:IRON,rust:true});
  // Studs down each strap, front and back, and over the lid.
  for(const s of [-1,1])for(let i=0;i<3;i++){
   const st=new THREE.SphereGeometry(.0055,6,3,0,Math.PI*2,0,Math.PI/2);st.rotateX(s*Math.PI/2);st.translate(x,base+.03+i*.055,s*(D/2+.006));put(st,{look:IRON});
  }
  for(let i=1;i<6;i++){
   const a=i/6*Math.PI,st=new THREE.SphereGeometry(.0055,6,3,0,Math.PI*2,0,Math.PI/2);
   // Point the stud out along the squashed drum's normal.
   const nx=Math.cos(a)*K,ny=Math.sin(a),len=Math.hypot(nx,ny);
   st.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(0,ny/len,nx/len)));
   st.translate(x,top+Math.sin(a)*(R+.004)*K,Math.cos(a)*(R+.004));put(st,{look:IRON});
  }
 }
 // Angle brackets up the four vertical corners.
 for(const sx of [-1,1])for(const sz of [-1,1]){
  band(.035,H-.03,.005,sx*(W/2-.0175+.002),base+H/2,sz*(D/2+.0035));
  band(.005,H-.03,.035,sx*(W/2+.0035),base+H/2,sz*(D/2-.0175+.002));
 }
 // A drop ring in a staple on each end.
 for(const s of [-1,1]){
  band(.006,.03,.03,s*(W/2+.005),top-.045,0);
  const ring=new THREE.TorusGeometry(.028,.0045,6,20);ring.rotateY(Math.PI/2);ring.rotateZ(s*.35);ring.translate(s*(W/2+.012),top-.075,0);put(ring,{look:IRON,rust:true});
 }
 // The lock: a brass plate on the front with a keyhole, and the lid's hasp hanging over it.
 const front=D/2+.003;
 const plate=new RoundedBoxGeometry(.07,.06,.006,1,.002);plate.translate(0,top-.042,front+.002);put(plate,{look:BRASS});
 const hole=new THREE.CylinderGeometry(.006,.006,.003,10);hole.rotateX(Math.PI/2);hole.translate(0,top-.048,front+.0055);put(hole,{flat:INK,into:metal});
 const slot=new THREE.BoxGeometry(.004,.014,.003);slot.translate(0,top-.058,front+.0055);put(slot,{flat:INK,into:metal});
 const hasp=new RoundedBoxGeometry(.026,.05,.005,1,.0018);hasp.translate(0,top-.006,front+.006);put(hasp,{look:IRON});
 const pin=new THREE.CylinderGeometry(.004,.004,.034,8);pin.rotateZ(Math.PI/2);pin.translate(0,top+.018,front+.004);put(pin,{look:IRON});
 for(const x of [-.028,.028]){const rv=new THREE.SphereGeometry(.004,8,5);rv.translate(x,top-.02,front+.005);put(rv,{look:BRASS});}
 const mesh=(list,m,part)=>{const geo=mergeGeometries(list);list.forEach(p=>p.dispose());const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=true;o.userData.part=part;g.add(o);};
 mesh(wood,woodMat,'chest-wood');mesh(metal,metalMat,'chest-iron');
 g.rotation.y=-.25;
}

// The large box: a nailed pine packing crate on two skids. Three boards a side over a dark core,
// so the seams read as gaps; each long side is framed by rails and stiles with a diagonal brace,
// each end has two stiles and a knotted rope handle, and the lid is four boards held by two
// cleats. Iron angle guards cap the top and bottom corners and nail heads dot the frame. Two
// merged, vertex-coloured meshes: the wood (with the rope) and the iron.
function buildLargeBox({g,materials}){
 const C=hex=>new THREE.Color(hex);
 const PINE={base:C(0xa9814f),light:C(0xd2ae78),dark:C(0x5e4226)},CORE=C(0x22170d);
 const HEMP={base:C(0x9c8458),light:C(0xc8b184),dark:C(0x5a4a2e)};
 const IRON={base:C(0x3c3a37),light:C(0x7a766f),dark:C(0x171615)},RUST=C(0x6c3c1e);
 const woodMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:0,roughness:.88});
 const metalMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.55,roughness:.55});
 materials.push(woodMat,metalMat);
 const wood=[],metal=[];
 // grain: 'x', 'y' or 'z' for the direction the fibres run; tone shifts each board a little.
 const put=(geo,{look=PINE,flat,grain='x',tone=0}={})=>{
  if(geo.attributes.uv)geo.deleteAttribute('uv');
  const out=geo.index?geo.toNonIndexed():geo;if(out!==geo)geo.dispose();
  const p=out.attributes.position,n=out.attributes.normal,cols=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),c=look.base.clone();
   if(flat)c.copy(flat);
   else if(look===PINE){
    // Straight, fairly even grain across the fibres, a knot here and there, and a per-board tone.
    const a=grain==='x'?x:grain==='y'?y:z,b=grain==='x'?y+z:grain==='y'?x+z:y+x;
    const s=Math.sin(b*300+Math.sin(a*7+tone*9)*1.6)*.45+.55*stoneNoise(a*2,b*24,tone,6);
    c.lerp(s>0?look.light:look.dark,Math.min(1,Math.abs(s)*.3));
    c.lerp(tone>0?look.light:look.dark,Math.abs(tone)*.5);
    const k=stoneNoise(a*16+tone*5,b*44,tone,3);if(k>.8)c.lerp(look.dark,Math.min(1,(k-.8)*5));
    if(n.getY(i)<-.5)c.lerp(look.dark,.5);
    // Scuffed grey low down, where it has been dragged.
    c.lerp(look.dark,Math.max(0,1-y/.05)*.3);
   }else if(look===HEMP){
    // Three twisted strands: bands that spiral round the rope.
    const s=Math.sin((x+y+z)*420);c.lerp(s>0?look.light:look.dark,Math.abs(s)*.45);
   }else{
    const s=stoneNoise(x*3,y*3,z*3,40);c.lerp(s>0?look.light:look.dark,Math.abs(s)*.35);
    const edge=Math.max(Math.abs(n.getX(i)),Math.abs(n.getY(i)),Math.abs(n.getZ(i)));
    if(edge<.9)c.lerp(look.light,(.9-edge)*.8);
    const r=stoneNoise(x*5+1.3,y*2,z*5,33)*.5+.5;if(r>.55)c.lerp(RUST,Math.min(1,(r-.55)*2.2)*.55);
   }
   cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;
  }
  out.setAttribute('color',new THREE.BufferAttribute(cols,3));(look===IRON?metal:wood).push(out);
 };
 const W=.46,D=.32,H=.2,S=.016,base=S,top=S+H,T=.012,B=.012;// B: frame batten thickness
 // Two skids along the length, and the dark core the boards sit on.
 for(const z of [-1,1]){const skid=new THREE.BoxGeometry(W-.02,S,.04,4,1,1);skid.translate(0,S/2,z*(D/2-.05));put(skid,{grain:'x',tone:-.35});}
 const core=new THREE.BoxGeometry(W-2*T+.002,H,D-2*T+.002);core.translate(0,base+H/2,0);put(core,{flat:CORE});
 // Three boards on each long side and each end, with hairline gaps between them.
 const bh=H/3;
 for(const s of [-1,1])for(let i=0;i<3;i++){
  const tone=((i*5+(s>0?2:0))%5-2)*.1;
  const long=new THREE.BoxGeometry(W,bh-.005,T,6,1,1);long.translate(0,base+bh*(i+.5),s*(D/2-T/2));put(long,{grain:'x',tone});
  const end=new THREE.BoxGeometry(T,bh-.005,D-2*T,1,1,4);end.translate(s*(W/2-T/2),base+bh*(i+.5),0);put(end,{grain:'z',tone:-tone});
 }
 // The long sides: top and bottom rails, two stiles and a diagonal brace, all nailed on.
 const bw=.03,fz=D/2+B/2;
 const nail=(x,y,z,axis)=>{
  const h=new THREE.CylinderGeometry(.0042,.0042,.003,6);
  if(axis==='z')h.rotateX(Math.PI/2);else if(axis==='x')h.rotateZ(Math.PI/2);
  h.translate(x,y,z);put(h,{look:IRON});
 };
 for(const s of [-1,1]){
  const z=s*fz,face=s*(D/2+B+.0012);
  for(const y of [base+bw/2,top-bw/2]){const r=new THREE.BoxGeometry(W,bw,B,6,1,1);r.translate(0,y,z);put(r,{grain:'x',tone:.2});}
  for(const x of [-1,1]){const st=new THREE.BoxGeometry(bw,H-2*bw,B,1,3,1);st.translate(x*(W/2-bw/2),base+H/2,z);put(st,{grain:'y',tone:.15});}
  // The brace runs corner to corner inside the frame, a hair thinner so the rails lap over it.
  const iw=W-2*bw,ih=H-2*bw,ang=Math.atan2(ih,iw)*s,len=Math.hypot(iw,ih)-bw*.9;
  const br=new THREE.BoxGeometry(len,bw*.9,B*.8,6,1,1);br.rotateZ(ang);br.translate(0,base+H/2,s*(D/2+B*.4));put(br,{grain:'x',tone:.05});
  for(const x of [-1,1])for(const y of [base+bw/2,top-bw/2])for(const d of [-.009,.009])nail(x*(W/2-bw/2)+d,y,face,'z');
  for(const t of [-.25,.25])for(const y of [base+bw/2,top-bw/2])nail(t*W,y,face,'z');
  for(const t of [-.3,0,.3])nail(Math.cos(ang)*t*len,base+H/2+Math.sin(ang)*t*len,s*(D/2+B*.8+.0012),'z');
 }
 // The ends: two stiles each, and a rope handle knotted through two holes.
 const ex=W/2+B/2;
 for(const s of [-1,1]){
  for(const z of [-1,1]){const st=new THREE.BoxGeometry(B,H,bw,1,3,1);st.translate(s*ex,base+H/2,z*(D/2-bw/2+B));put(st,{grain:'y',tone:.12});}
  for(const z of [-1,1])for(const y of [base+.03,top-.03])nail(s*(W/2+B+.0012),y,z*(D/2-bw/2+B),'x');
  const hy=top-.055,hz=.055,out=W/2;
  for(const z of [-hz,hz]){
   const hole=new THREE.CylinderGeometry(.009,.009,.003,10);hole.rotateZ(Math.PI/2);hole.translate(s*(out+.0012),hy,z);put(hole,{flat:CORE});
   const knot=new THREE.SphereGeometry(.011,8,6);knot.scale(.8,1,1);knot.translate(s*(out+.006),hy,z);put(knot,{look:HEMP});
  }
  // The loop sags from both holes and hangs out from the end.
  const curve=new THREE.CatmullRomCurve3([
   new THREE.Vector3(s*(out+.006),hy,-hz),new THREE.Vector3(s*(out+.022),hy-.03,-hz*.75),
   new THREE.Vector3(s*(out+.03),hy-.046,0),new THREE.Vector3(s*(out+.022),hy-.03,hz*.75),new THREE.Vector3(s*(out+.006),hy,hz)]);
  put(new THREE.TubeGeometry(curve,20,.0065,6,false),{look:HEMP});
 }
 const lt=.014;
 // Iron angle guards over the eight corners: a bent plate on each of the three faces it meets.
 const g2=.04,gt=.003;
 for(const sx of [-1,1])for(const sz of [-1,1])for(const sy of [1,-1]){
  const ox=sx*(W/2+B),oz=sz*(D/2+B),yy=sy>0?top+lt-g2/2:base+g2/2;
  const a=new THREE.BoxGeometry(g2,g2,gt);a.translate(ox-sx*g2/2,yy,oz+sz*gt/2);put(a,{look:IRON});
  const b=new THREE.BoxGeometry(gt,g2,g2);b.translate(ox+sx*gt/2,yy,oz-sz*g2/2);put(b,{look:IRON});
  if(sy>0){const c=new THREE.BoxGeometry(g2,gt,g2);c.translate(ox-sx*g2/2,top+lt+gt/2,oz-sz*g2/2);put(c,{look:IRON});}
 }
 // The lid: four boards running lengthwise with gaps, flush with the frame, and two cleats across.
 const LW=W+2*B,LD=D+2*B,lb=LD/4;
 for(let i=0;i<4;i++){const bd=new THREE.BoxGeometry(LW,lt,lb-.005,6,1,1);bd.translate(0,top+lt/2,-LD/2+lb*(i+.5));put(bd,{grain:'x',tone:((i*3)%5-2)*.12});}
 for(const x of [-1,1]){
  const cx=x*(W/2-.05),cl=new THREE.BoxGeometry(.036,.007,LD-.02,1,1,4);cl.translate(cx,top+lt+.0035,0);put(cl,{grain:'z',tone:.25});
  for(let i=0;i<4;i++)for(const d of [-.009,.009])nail(cx+d,top+lt+.0075,-LD/2+lb*(i+.5),'y');
 }
 const mesh=(list,m,part)=>{const geo=mergeGeometries(list);list.forEach(p=>p.dispose());const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=true;o.userData.part=part;g.add(o);};
 mesh(wood,woodMat,'large-box-wood');mesh(metal,metalMat,'large-box-iron');
 g.rotation.y=.2;
}

// The ice box: a golden-oak, top-loading ice chest on bun feet. A lift lid with a raised field
// covers the ice well; below a moulded cornice the front has one panelled provision door, and
// each end a framed, raised panel. Nickel-plated fittings: two strap hinges and a lever latch on
// the door, a latch and two hinges on the lid, and a drain spigot at the back. Rime crusts the
// lid seam, short icicles hang from the lid's front lip, and meltwater pools under the spigot.
// Three merged, vertex-coloured meshes: the oak, the nickel and the (translucent) frost.
function buildIceBox({g,materials}){
 const C=hex=>new THREE.Color(hex),V=(x,y,z)=>new THREE.Vector3(x,y,z);
 const OAK={base:C(0xa8733c),light:C(0xd6a262),dark:C(0x5e3a1b)},CORE=C(0x1e140b);
 const NICKEL={base:C(0xa9aeb0),light:C(0xe9edef),dark:C(0x5a5d5f)},TARNISH=C(0x7a6a4c);
 const RIME={base:C(0xe6f2fa),light:C(0xffffff),dark:C(0xa9c7da)},WATER=C(0x6f93a8);
 const woodMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:0,roughness:.62});
 const metalMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.8,roughness:.3});
 const frostMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:0,roughness:.35,transparent:true,opacity:.78,depthWrite:false,emissive:0x8fb8d4,emissiveIntensity:.18});
 materials.push(woodMat,metalMat,frostMat);
 const wood=[],metal=[],frost=[];
 // grain: 'x', 'y' or 'z' for the direction the fibres run; tone shifts each board a little.
 const put=(geo,{look=OAK,flat,grain='x',tone=0}={})=>{
  if(geo.attributes.uv)geo.deleteAttribute('uv');
  const out=geo.index?geo.toNonIndexed():geo;if(out!==geo)geo.dispose();
  const p=out.attributes.position,n=out.attributes.normal,cols=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),c=look.base.clone();
   if(flat)c.copy(flat);
   else if(look===OAK){
    // Quarter-sawn oak: close straight grain, pale ray flecks across it, and a warm per-board tone.
    const a=grain==='x'?x:grain==='y'?y:z,b=grain==='x'?y+z:grain==='y'?x+z:y+x;
    const s=Math.sin(b*260+Math.sin(a*9+tone*7)*1.4)*.5+.5*stoneNoise(a*3,b*30,tone,5);
    c.lerp(s>0?look.light:look.dark,Math.min(1,Math.abs(s)*.28));
    const ray=stoneNoise(a*60+tone*3,b*9,tone,4);if(ray>.55)c.lerp(look.light,Math.min(1,(ray-.55)*2.5)*.5);
    c.lerp(tone>0?look.light:look.dark,Math.abs(tone)*.45);
    if(n.getY(i)<-.5)c.lerp(look.dark,.55);
    c.lerp(look.dark,Math.max(0,1-y/.06)*.35);
   }else if(look===NICKEL){
    const s=stoneNoise(x*4,y*4,z*4,30);c.lerp(s>0?look.light:look.dark,Math.abs(s)*.3);
    const edge=Math.max(Math.abs(n.getX(i)),Math.abs(n.getY(i)),Math.abs(n.getZ(i)));
    if(edge<.9)c.lerp(look.light,(.9-edge)*.9);
    // The plating has worn through to brass here and there.
    const w=stoneNoise(x*6+2.1,y*6,z*6,21)*.5+.5;if(w>.62)c.lerp(TARNISH,Math.min(1,(w-.62)*3)*.6);
   }else{
    const s=stoneNoise(x*8,y*8,z*8,50);c.lerp(s>0?look.light:look.dark,Math.abs(s)*.5);
    if(n.getY(i)>.6)c.lerp(look.light,.4);
   }
   cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;
  }
  out.setAttribute('color',new THREE.BufferAttribute(cols,3));(look===NICKEL?metal:look===RIME?frost:wood).push(out);
 };
 const at=(geo,x,y,z)=>{geo.translate(x,y,z);return geo;};
 const W=.4,D=.27,B=.012,F=.026,PL=.032,P=F+PL,H=.25,T0=P+H,LT=.026;
 const OX=W/2+B,OZ=D/2+B;// the outer faces of the carcass
 // Bun feet, the plinth and the dark core the frames are fixed to.
 for(const sx of [-1,1])for(const sz of [-1,1]){const f=new THREE.SphereGeometry(.024,8,5);f.scale(1,.58,1);put(at(f,sx*(OX-.022),.024*.58,sz*(OZ-.022)),{grain:'y',tone:-.2});}
 put(at(new RoundedBoxGeometry(2*OX+.018,PL,2*OZ+.018,1,.006),0,F+PL/2,0),{grain:'x',tone:-.15});
 put(at(new THREE.BoxGeometry(W,H,D),0,P+H/2,0),{flat:CORE});
 // The front frame: two stiles, a bottom rail and a deep top rail under the cornice.
 const sw=.038,br=.036,tr=.048,fz=D/2+B/2;
 for(const x of [-1,1])put(at(new THREE.BoxGeometry(sw,H,B,1,4,1),x*(W/2-sw/2),P+H/2,fz),{grain:'y',tone:.1*x});
 put(at(new THREE.BoxGeometry(W-2*sw,br,B,5,1,1),0,P+br/2,fz),{grain:'x',tone:-.1});
 put(at(new THREE.BoxGeometry(W-2*sw,tr,B,5,1,1),0,T0-tr/2,fz),{grain:'x',tone:.15});
 // The provision door: a slab sitting proud of the frame, a raised field on it, and a bead round the field.
 const dw=W-2*sw-.006,dh=H-br-tr-.006,dy=P+br+.003+dh/2,dz=D/2+B+.003;
 put(at(new THREE.BoxGeometry(dw,dh,.008,6,3,1),0,dy,dz),{grain:'y',tone:.05});
 put(at(new RoundedBoxGeometry(dw-.05,dh-.05,.008,1,.003),0,dy,dz+.005),{grain:'x',tone:.25});
 for(const s of [-1,1]){
  const hb=new THREE.CylinderGeometry(.0025,.0025,dw-.034,5);hb.rotateZ(Math.PI/2);put(at(hb,0,dy+s*(dh/2-.017),dz+.005),{grain:'x',tone:-.3});
  put(at(new THREE.CylinderGeometry(.0025,.0025,dh-.034,5),s*(dw/2-.017),dy,dz+.005),{grain:'y',tone:-.3});
 }
 // The back is a plain board; each end has a frame and a raised panel.
 put(at(new THREE.BoxGeometry(W,H,B,5,3,1),0,P+H/2,-fz),{grain:'x',tone:-.2});
 for(const s of [-1,1]){
  const x=s*(W/2+B/2);
  for(const z of [-1,1])put(at(new THREE.BoxGeometry(B,H,sw,1,4,1),x,P+H/2,z*(OZ-sw/2)),{grain:'y',tone:.08});
  put(at(new THREE.BoxGeometry(B,br,2*OZ-2*sw,1,1,4),x,P+br/2,0),{grain:'z',tone:-.12});
  put(at(new THREE.BoxGeometry(B,tr,2*OZ-2*sw,1,1,4),x,T0-tr/2,0),{grain:'z',tone:.12});
  put(at(new THREE.BoxGeometry(B*.6,H-br-tr,2*OZ-2*sw,1,3,5),x,P+br+(H-br-tr)/2,0),{grain:'z',tone:-.05});
  put(at(new RoundedBoxGeometry(.008,H-br-tr-.04,2*OZ-2*sw-.04,1,.003),s*(W/2+B*.6+.004),P+br+(H-br-tr)/2,0),{grain:'y',tone:.2});
 }
 // A moulded cornice round the top, and the lift lid over the ice well with a raised field.
 put(at(new RoundedBoxGeometry(2*OX+.012,.014,2*OZ+.012,1,.005),0,T0-.007,0),{grain:'x',tone:-.25});
 const LW=2*OX+.022,LD=2*OZ+.022,ly=T0+.002+LT/2,lz=0;
 put(at(new RoundedBoxGeometry(LW,LT,LD,1,.008),0,ly,lz),{grain:'x',tone:.1});
 put(at(new THREE.BoxGeometry(LW-.07,.006,LD-.07,7,1,4),0,ly+LT/2+.003,lz),{grain:'x',tone:.28});
 const lf=LD/2;// the lid's front face
 // Door hinges: two nickel strap hinges on the left, each a barrel with a leaf on door and stile.
 const hx=-dw/2;
 for(const y of [dy+dh/2-.03,dy-dh/2+.03]){
  put(at(new THREE.CylinderGeometry(.0055,.0055,.032,8),hx-.002,y,dz+.008),{look:NICKEL});
  for(const t of [-1,1])put(at(new THREE.SphereGeometry(.0055,8,4),hx-.002,y+t*.016,dz+.008),{look:NICKEL});
  put(at(new THREE.BoxGeometry(.04,.022,.003),hx+.02,y,dz+.0055),{look:NICKEL});
  put(at(new THREE.BoxGeometry(.018,.022,.003),hx-.017,y,D/2+B+.0015),{look:NICKEL});
 }
 // The door latch: a lever on a round rose that swings over a keeper on the right stile.
 const rx=dw/2-.022,ry=dy+.01;
 const rose=new THREE.CylinderGeometry(.011,.012,.004,14);rose.rotateX(Math.PI/2);put(at(rose,rx,ry,dz+.006),{look:NICKEL});
 put(at(new RoundedBoxGeometry(.016,.028,.007,1,.002),W/2-sw/2,ry,D/2+B+.0035),{look:NICKEL});
 const lever=new THREE.CatmullRomCurve3([V(rx,ry,dz+.008),V(rx+.012,ry+.004,dz+.02),V(rx+.028,ry+.003,dz+.022),V(W/2-sw/2+.006,ry,dz+.014)]);
 put(new THREE.TubeGeometry(lever,10,.0035,5,false),{look:NICKEL});
 put(at(new THREE.SphereGeometry(.006,8,5),rx+.03,ry+.003,dz+.022),{look:NICKEL});
 // The lid latch: a hasp plate on the lid's front, its hook dropping to a keeper on the top rail.
 put(at(new RoundedBoxGeometry(.05,.016,.004,1,.0015),0,ly,lf+.002),{look:NICKEL});
 put(at(new RoundedBoxGeometry(.034,.02,.006,1,.002),0,T0-.024,D/2+B+.003),{look:NICKEL});
 const hook=new THREE.CatmullRomCurve3([V(0,ly-.004,lf+.004),V(0,T0-.004,lf+.008),V(0,T0-.018,D/2+B+.012),V(0,T0-.028,D/2+B+.007)]);
 put(new THREE.TubeGeometry(hook,8,.004,5,false),{look:NICKEL});
 put(at(new THREE.SphereGeometry(.0065,8,5),0,ly+.001,lf+.006),{look:NICKEL});
 // Lid hinges on the back, and the drain spigot low on the back with a drip at its lip.
 for(const x of [-.12,.12]){
  const bar=new THREE.CylinderGeometry(.005,.005,.04,8);bar.rotateZ(Math.PI/2);put(at(bar,x,T0+.002,-OZ-.006),{look:NICKEL});
  put(at(new THREE.BoxGeometry(.036,.026,.003),x,T0-.016,-OZ-.0015),{look:NICKEL});
 }
 const sx=.12,sy=P+.03,spz=-OZ-.012;
 const pipe=new THREE.CylinderGeometry(.0055,.0055,.024,8);pipe.rotateX(Math.PI/2);put(at(pipe,sx,sy,-OZ-.012+.001),{look:NICKEL});
 put(at(new THREE.CylinderGeometry(.006,.0045,.016,8),sx,sy-.009,spz-.01),{look:NICKEL});
 const elbow=new THREE.SphereGeometry(.0062,8,6);put(at(elbow,sx,sy,spz-.01),{look:NICKEL});
 // Rime: flattened clumps crusting the seam under the lid, heaviest at the front corners.
 const hash=i=>{const s=Math.sin(i*127.1+11.3)*43758.5453;return s-Math.floor(s);};
 const ex=LW/2-.004,ez=LD/2-.004,perim=4*(ex+ez),N=36;
 for(let i=0;i<N;i++){
  let d=(i+hash(i)*.6)/N*perim,x,z;
  if(d<2*ex){x=-ex+d;z=ez;}else if((d-=2*ex)<2*ez){x=ex;z=ez-d;}else if((d-=2*ez)<2*ex){x=ex-d;z=-ez;}else{d-=2*ex;x=-ex;z=-ez+d;}
  const corner=Math.max(0,1-Math.min(Math.abs(Math.abs(x)-ex)+Math.abs(Math.abs(z)-ez),.12)/.12);
  const r=.006+hash(i+50)*.004+corner*.005,cl=new THREE.SphereGeometry(r,5,3);
  cl.scale(1.5,.55,1.5);put(at(cl,x,T0+.003-hash(i+9)*.003,z),{look:RIME});
 }
 // Icicles hanging from the lid's front lip, and a frosted crust on the lid latch.
 for(let i=0;i<7;i++){
  const x=-.16+i*.053+(hash(i+30)-.5)*.02;if(Math.abs(x)<.035)continue;
  const h=.014+hash(i+70)*.026,ic=new THREE.ConeGeometry(.0045+hash(i+3)*.002,h,5);ic.rotateX(Math.PI);
  put(at(ic,x,T0+.002-h/2,lf-.003),{look:RIME});
 }
 for(let i=0;i<3;i++){const cl=new THREE.SphereGeometry(.006,5,3);cl.scale(1.4,.6,1);put(at(cl,(i-1)*.014,ly+.008,lf+.002),{look:RIME});}
 // Meltwater: a drip at the spigot and a shallow puddle on the floor behind the box.
 const drip=new THREE.SphereGeometry(.004,6,4);drip.scale(1,1.4,1);put(at(drip,sx,sy-.021,spz-.01),{look:RIME,flat:WATER});
 const pool=new THREE.CircleGeometry(.04,18);pool.rotateX(-Math.PI/2);pool.scale(1.3,1,.75);put(at(pool,sx-.01,.0012,spz-.018),{look:RIME,flat:WATER});
 const mesh=(list,m,part,shadow=true)=>{const geo=mergeGeometries(list);list.forEach(p=>p.dispose());const o=new THREE.Mesh(geo,m);o.castShadow=shadow;o.receiveShadow=true;o.userData.part=part;g.add(o);};
 mesh(wood,woodMat,'ice-box-wood');mesh(metal,metalMat,'ice-box-nickel');mesh(frost,frostMat,'ice-box-frost',false);
 g.rotation.y=-.18;
}

// The tinning kit: a japanned-edge tinplate case with a hinged, panelled lid, soldered corner
// seams, a wire bail handle folded flat and a paper maker's label on the front. A seaming
// crank is bolted to one end: a bracket, a spindle, a chuck and a crank with a turned knob.
// A soldering iron lies in front (copper bit, iron shank, wooden handle), and two finished
// tins with rolled beads, embossed ends and paper labels sit beside the case, one standing,
// one on its side. Two merged, vertex-coloured meshes: the metal and the matte (paper, wood).
function buildTinningKit({g,materials}){
 const C=hex=>new THREE.Color(hex),V=(x,y,z)=>new THREE.Vector3(x,y,z),M=new THREE.Matrix4();
 const metalMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.78,roughness:.34});
 const matteMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:0,roughness:.8});
 materials.push(metalMat,matteMat);
 const metal=[],matte=[],c=new THREE.Color();
 // Paint each piece in its own frame, then place it with an optional matrix.
 const put=(geo,paint,list=metal,mtx)=>{
  if(geo.attributes.uv)geo.deleteAttribute('uv');
  const out=geo.index?geo.toNonIndexed():geo;if(out!==geo)geo.dispose();
  const p=out.attributes.position,n=out.attributes.normal,cols=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   paint(c,p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i));
   cols[i*3]=Math.min(1,Math.max(0,c.r));cols[i*3+1]=Math.min(1,Math.max(0,c.g));cols[i*3+2]=Math.min(1,Math.max(0,c.b));
  }
  out.setAttribute('color',new THREE.BufferAttribute(cols,3));
  if(mtx)out.applyMatrix4(mtx);list.push(out);
 };
 const at=(geo,x,y,z)=>{geo.translate(x,y,z);return geo;};
 // Tinplate: a crystalline spangle, bright on rolled edges and bevels, freckled with rust low down.
 const TIN=C(0xb4bdc1),TIN_HI=C(0xeef2f4),TIN_LO=C(0x6c7478),RUST=C(0x7a4424);
 const tin=(col,x,y,z,nx,ny,nz)=>{
  const s=stoneNoise(x*9,y*9,z*9,17),f=Math.sin(Math.floor(x*160)*12.9+Math.floor(z*160)*78.2+Math.floor(y*160)*37.7)*.5+.5;
  col.copy(TIN).lerp(s>0?TIN_HI:TIN_LO,Math.abs(s)*.35).lerp(f>.5?TIN_HI:TIN_LO,.12);
  const edge=Math.max(Math.abs(nx),Math.abs(ny),Math.abs(nz));if(edge<.92)col.lerp(TIN_HI,(.92-edge)*.8);
  if(ny<-.5)col.lerp(TIN_LO,.5);
  const r=stoneNoise(x*5+1.3,y*5,z*5-.7,41);if(r>.55)col.lerp(RUST,Math.min(1,(r-.55)*3)*.55);
 };
 const SOLDER=C(0x7d8185),SOLDER_HI=C(0xa9adb0);
 const solder=(col,x,y,z,nx,ny)=>col.copy(SOLDER).lerp(SOLDER_HI,(Math.sin(y*900+x*300)*.5+.5)*.5*Math.max(0,1-Math.abs(ny)));
 const IRON=C(0x3d3f42),IRON_HI=C(0x7b7f83);
 const iron=(col,x,y,z,nx,ny)=>{col.copy(IRON).lerp(IRON_HI,Math.max(0,ny)*.4);const e=Math.max(Math.abs(nx),Math.abs(ny));if(e<.9)col.lerp(IRON_HI,(.9-e)*.7);};
 const COPPER=C(0xb86a3a),COPPER_HI=C(0xf0a870),VERDIGRIS=C(0x4f7a66),SCALE=C(0x3a2418);
 const BEECH=C(0x9a6a3e),GRAIN=C(0x5a3719),WORN=C(0xc9a26e);
 const PAPER=C(0xe4d8b8),RED=C(0x9a2c22),GOLD=C(0xc79a3a),INK=C(0x2a2018);
 // A tin's label, painted round its open band: a red field, gold rules and a panel of print.
 const label=hh=>(col,x,y,z)=>{
  const a=Math.atan2(z,x),v=y/hh;
  col.copy(PAPER);
  if(Math.abs(v)<.55)col.copy(RED);
  if(Math.abs(Math.abs(v)-.62)<.06)col.copy(GOLD);
  if(Math.abs(Math.sin(a/2))<.45&&Math.abs(v)<.45){
   col.copy(PAPER);
   if(Math.sin(v*38)>.35&&Math.abs(Math.sin(a/2))<.36)col.lerp(INK,.75);
  }
  col.lerp(INK,.05*stoneNoise(x*30,y*30,z*30,5));
 };
 // A finished tin: a rolled bottom bead, a plain side, a rolled top bead and a sunk, ringed end.
 const TR=.03,TH=.058,LB=.034;
 const tinGeo=()=>new THREE.LatheGeometry([[0,.0025],[.026,.002],[.029,0],[.0315,.002],[.032,.0045],[.0302,.006],[.0302,TH-.006],[.032,TH-.0045],[.0315,TH-.002],
  [.029,TH],[.0265,TH-.001],[.026,TH-.004],[.022,TH-.0035],[.021,TH-.002],[.017,TH-.002],[.016,TH-.0035],[.008,TH-.0035],[.007,TH-.0025],[0,TH-.0025]].map(([r,h])=>new THREE.Vector2(r,h)),24);
 const tinAt=mtx=>{
  put(tinGeo(),tin,metal,mtx);
  put(at(new THREE.CylinderGeometry(TR+.0008,TR+.0008,LB,24,2,true),0,TH/2,0),(col,x,y,z)=>label(LB/2)(col,x,y-TH/2,z),matte,mtx);
 };
 // Standing, turned so its print faces out; and lying on its side, rolled a little.
 tinAt(M.clone().makeRotationY(-.6).setPosition(.17,0,-.075));
 const lying=new THREE.Matrix4().makeRotationZ(Math.PI/2).premultiply(new THREE.Matrix4().makeRotationY(.35));
 lying.premultiply(new THREE.Matrix4().makeTranslation(.195,.032,.06));
 tinAt(new THREE.Matrix4().multiplyMatrices(lying,new THREE.Matrix4().makeRotationY(1.1).premultiply(new THREE.Matrix4().makeTranslation(0,-TH/2,0))));
 // The case: tinplate walls with a rolled rim bead, a hinged lid with a raised panel.
 const W=.21,H=.095,D=.15,cx=-.06,LT=.016;
 put(at(new THREE.BoxGeometry(W,H,D,8,4,6),cx,H/2,0),tin);
 for(const s of [-1,1]){
  const bx=new THREE.CylinderGeometry(.0035,.0035,W,8);bx.rotateZ(Math.PI/2);put(at(bx,cx,H-.004,s*(D/2+.001)),tin);
  const bz=new THREE.CylinderGeometry(.0035,.0035,D,8);bz.rotateX(Math.PI/2);put(at(bz,cx+s*(W/2+.001),H-.004,0),tin);
  // A foot strip along the bottom of each long side.
  put(at(new THREE.BoxGeometry(W+.004,.006,.006),cx,.003,s*(D/2-.001)),tin);
 }
 // Soldered corner seams: a dull bead of solder down each vertical edge.
 for(const sx of [-1,1])for(const sz of [-1,1])put(at(new THREE.CylinderGeometry(.0028,.0034,H-.008,6),cx+sx*W/2,H/2-.002,sz*D/2),solder);
 const ly=H+.001+LT/2;
 put(at(new RoundedBoxGeometry(W+.012,LT,D+.012,1,.004),cx,ly,0),tin);
 put(at(new RoundedBoxGeometry(W-.05,.005,D-.05,1,.002),cx,ly+LT/2+.0015,0),tin);
 for(let i=0;i<2;i++)put(at(new RoundedBoxGeometry(W-.07-i*.022,.002,D-.07-i*.022,1,.0008),cx,ly+LT/2+.004+i*.001,0),tin);
 // The hinge along the back: a long barrel with knuckle joints.
 const hinge=new THREE.CylinderGeometry(.004,.004,W-.02,10);hinge.rotateZ(Math.PI/2);put(at(hinge,cx,H+.002,-D/2-.008),tin);
 for(let i=0;i<5;i++){const k=new THREE.CylinderGeometry(.0048,.0048,.004,10);k.rotateZ(Math.PI/2);put(at(k,cx-(W-.02)/2+i*(W-.02)/4,H+.002,-D/2-.008),solder);}
 // A hasp on the front: a strap down off the lid over a staple, with a tag through it.
 put(at(new RoundedBoxGeometry(.022,.03,.003,1,.001),cx,H-.004,D/2+.0075),tin);
 const staple=new THREE.TorusGeometry(.005,.0014,6,12,Math.PI);put(at(staple,cx,H-.02,D/2+.0095),iron);
 // A wire bail handle folded flat on the lid between two lugs.
 for(const s of [-1,1])put(at(new RoundedBoxGeometry(.012,.01,.016,1,.002),cx+s*(W/2-.022),ly+LT/2+.003,0),solder);
 const bail=new THREE.CatmullRomCurve3([V(cx-(W/2-.022),ly+LT/2+.005,0),V(cx-(W/2-.03),ly+LT/2+.006,.03),V(cx-.03,ly+LT/2+.0065,.046),
  V(cx+.03,ly+LT/2+.0065,.046),V(cx+(W/2-.03),ly+LT/2+.006,.03),V(cx+(W/2-.022),ly+LT/2+.005,0)]);
 put(new THREE.TubeGeometry(bail,24,.0022,5,false),iron);
 const grip=new THREE.CylinderGeometry(.005,.005,.05,10);grip.rotateZ(Math.PI/2);
 put(at(grip,cx,ly+LT/2+.0065,.046),(col,x)=>{col.copy(BEECH).lerp(GRAIN,(Math.sin(x*400)*.5+.5)*.35);},matte);
 // The maker's label pasted on the front wall.
 put(at(new THREE.BoxGeometry(.09,.042,.0012,6,4,1),cx-.04,H*.45,D/2+.0007),(col,x,y)=>{
  const u=(x-cx+.04)/.045,v=(y-H*.45)/.021;col.copy(PAPER);
  if(Math.max(Math.abs(u),Math.abs(v))>.84)col.copy(RED);
  else if(Math.abs(v)<.6&&Math.sin(v*14)>.2&&Math.abs(u)<.7)col.lerp(INK,.7);
  col.lerp(INK,Math.max(0,stoneNoise(x*40,y*40,1,3)-.5)*.3);
 },matte);
 // The seamer on the right end: a bracket, a spindle through it, a chuck and a crank with a knob.
 const ex=cx+W/2;
 put(at(new RoundedBoxGeometry(.006,.056,.05,1,.002),ex+.003,.052,0),iron);
 for(const [y,z] of [[.032,-.017],[.032,.017],[.072,-.017],[.072,.017]]){const b=new THREE.CylinderGeometry(.0028,.0028,.004,8);b.rotateZ(Math.PI/2);put(at(b,ex+.007,y,z),iron);}
 const sp=new THREE.CylinderGeometry(.0045,.0045,.05,10);sp.rotateZ(Math.PI/2);put(at(sp,ex+.03,.052,0),iron);
 const chuck=new THREE.CylinderGeometry(.018,.018,.008,20);chuck.rotateZ(Math.PI/2);put(at(chuck,ex+.018,.052,0),iron);
 const collar=new THREE.CylinderGeometry(.008,.008,.006,12);collar.rotateZ(Math.PI/2);put(at(collar,ex+.052,.052,0),iron);
 put(at(new RoundedBoxGeometry(.006,.012,.052,1,.002),ex+.056,.052,.02),iron);
 const pin=new THREE.CylinderGeometry(.0025,.0025,.012,8);pin.rotateZ(Math.PI/2);put(at(pin,ex+.062,.052,.042),iron);
 const knob=new THREE.LatheGeometry([[0,0],[.006,0],[.0075,.006],[.0065,.014],[.0078,.02],[.005,.026],[0,.027]].map(([r,h])=>new THREE.Vector2(r,h)),14);
 knob.rotateZ(-Math.PI/2);put(at(knob,ex+.066,.052,.042),(col,x,y,z,nx,ny)=>{col.copy(BEECH).lerp(GRAIN,(Math.sin(Math.atan2(z-.042,y-.052)*4+x*300)*.5+.5)*.35).lerp(WORN,Math.max(0,ny)*.35);},matte);
 // A soldering iron lying in front: a pointed copper bit on an iron shank into a wooden handle.
 const si=new THREE.Matrix4().makeRotationY(.12).setPosition(-.05,.0105,.125);
 const bit=new THREE.LatheGeometry([[0,0],[.004,.006],[.0085,.02],[.0095,.03],[.0095,.042],[.006,.044],[0,.044]].map(([r,h])=>new THREE.Vector2(r,h)),14);
 bit.rotateZ(-Math.PI/2);bit.translate(.1,0,0);
 put(bit,(col,x,y,z,nx,ny)=>{col.copy(COPPER).lerp(COPPER_HI,Math.max(0,ny)*.45).lerp(x>.125?COPPER_HI:SCALE,x>.125?.3:.25);if(stoneNoise(x*40,y*40,z*40,4)>.6)col.lerp(VERDIGRIS,.5);},metal,si);
 const shank=new THREE.CylinderGeometry(.0028,.0028,.07,8);shank.rotateZ(Math.PI/2);put(shank.translate(.065,0,0),iron,metal,si);
 const ferrule=new THREE.CylinderGeometry(.0072,.0072,.01,14);ferrule.rotateZ(Math.PI/2);put(ferrule.translate(.028,0,0),tin,metal,si);
 const handle=new THREE.LatheGeometry([[0,0],[.0075,0],[.009,.012],[.0098,.04],[.0092,.07],[.0102,.078],[.0085,.086],[0,.088]].map(([r,h])=>new THREE.Vector2(r,h)),16);
 handle.rotateZ(Math.PI/2);handle.translate(.023,0,0);
 put(handle,(col,x,y,z,nx,ny)=>{col.copy(BEECH).lerp(GRAIN,(Math.sin(Math.atan2(z,y)*5+x*55)*.5+.5)*.4).lerp(WORN,Math.max(0,ny)*.3).lerp(SCALE,Math.max(0,1-(.023-x)/.012)*.35);},matte,si);
 // A coil of solder wire beside the iron.
 const pts=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI*4.6,r=.018-i*.00012;pts.push(V(.035+Math.cos(a)*r,.0022+i*.00002,.162+Math.sin(a)*r));}
 pts.push(V(.07,.0022,.178));
 put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),64,.0016,4,false),solder);
 const mesh=(list,m,part)=>{const geo=mergeGeometries(list);list.forEach(p=>p.dispose());const o=new THREE.Mesh(geo,m);o.castShadow=o.receiveShadow=true;o.userData.part=part;g.add(o);};
 mesh(metal,metalMat,'tinning-kit-metal');mesh(matte,matteMat,'tinning-kit-matte');
 const box=new THREE.Box3();g.children.forEach(p=>{p.geometry.computeBoundingBox();box.union(p.geometry.boundingBox);});
 const mid=box.getCenter(V(0,0,0));g.children.forEach(p=>p.geometry.translate(-mid.x,-box.min.y,-mid.z));
 g.rotation.y=.3;
}

// The grappling hook (and its unidentified twin, the iron hook): a forged iron grapnel lying
// on two of its flukes and its eye, with the third fluke standing up. Three flukes curve back
// from a crown boss to spade-shaped points; the shank ends in a collar and a forged eye. A
// three-strand hemp rope is bent on to the eye with a round turn, runs down to the floor and
// lies in a flat coil beside the shank, its whipped tail crossing back over the turns. Two
// merged, vertex-coloured meshes: the iron and the rope.
function buildGrapplingHook({g,materials}){
 const C=hex=>new THREE.Color(hex),V=(x,y,z)=>new THREE.Vector3(x,y,z),c=new THREE.Color(),X=V(1,0,0),Y=V(0,1,0);
 const ironMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.68,roughness:.55});
 const ropeMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.95});
 materials.push(ironMat,ropeMat);
 // Sweep elliptical rings of N vertices along rows {p,t,w,h,s}. The ring's w axis follows `nrm`
 // (kept square to the line), so a flattened blade keeps facing one way.
 const sweep=(rows,N,nrm,tone)=>{
  const pos=[],col=[],idx=[];
  rows.forEach(({p,t,w,h,s},k)=>{
   const side=nrm.clone().addScaledVector(t,-nrm.dot(t)).normalize(),up=t.clone().cross(side);
   for(let j=0;j<N;j++){
    const a=j/N*Math.PI*2,q=p.clone().addScaledVector(side,Math.cos(a)*w).addScaledVector(up,Math.sin(a)*h);
    pos.push(q.x,q.y,q.z);tone(s,a,q,j);col.push(c.r,c.g,c.b);
   }
   if(k>0)for(let j=0;j<N;j++){const a=(k-1)*N+j,b=(k-1)*N+(j+1)%N,d=k*N+j,e=k*N+(j+1)%N;idx.push(a,b,d,b,e,d);}
  });
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  geo.setIndex(idx);return geo;
 };
 const paint=(geo,tone)=>{geo.deleteAttribute('uv');geo.deleteAttribute('normal');const P=geo.attributes.position,cs=[],q=V(0,0,0);
  for(let i=0;i<P.count;i++){q.fromBufferAttribute(P,i);tone(0,0,q,0);cs.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));return geo;};
 // Blackened forged iron with hammer marks, rust gathered in the crotches and round the eye,
 // and the points ground bright.
 const IRON=C(0x3a3937),IRON_LT=C(0x5f5c57),SCALE=C(0x1d1c1b),RUST=C(0x7a4020),RUST_LT=C(0xa0602c),STEEL=C(0xa7a6a0);
 const CROWN=.1,EYE_R=.02,EYE_T=.0055,EYE=V(-.1-EYE_R+.002,0,0);
 const ironTone=(bright,rusty)=>(s,a,q)=>{
  const n=stoneNoise(q.x*60,q.y*60,q.z*60,5),m=stoneNoise(q.x*140,q.y*140,q.z*140,3);
  c.copy(IRON).lerp(n>0?IRON_LT:SCALE,Math.abs(n)*.55);
  if(m>.55)c.lerp(SCALE,.5);
  const r=rusty(q)+stoneNoise(q.x*35+3,q.y*35,q.z*35,4)*.35;
  if(r>.35)c.lerp(n>.2?RUST_LT:RUST,Math.min(.85,(r-.35)*1.6));
  const b=bright(s,q);if(b>0)c.lerp(STEEL,Math.min(.8,b));
 };
 const nearCrown=q=>Math.max(0,1-Math.hypot(q.x-CROWN,q.y,q.z)/.05);
 const nearEye=q=>Math.max(0,1-q.distanceTo(EYE)/.04)*.9;
 const iron=[];
 // The shank, one lathe along x: a collar under the eye, a slightly swelling bar and the crown boss.
 const shankProfile=[[-.104,.0002],[-.103,.009],[-.101,.0135],[-.086,.0135],[-.083,.0105],[.06,.0115],[.074,.0135],[.084,.0172],[.096,.0185],[.108,.017],[.116,.013],[.121,.007],[.1225,.0002]];
 const shankRows=[];
 for(let i=1;i<shankProfile.length;i++){const [x0,r0]=shankProfile[i-1],[x1,r1]=shankProfile[i],n=Math.max(1,Math.ceil((x1-x0)/.006));
  for(let k=i===1?0:1;k<=n;k++){const u=k/n,x=x0+(x1-x0)*u,r=r0+(r1-r0)*u;shankRows.push({p:V(x,0,0),t:X,w:r,h:r*.92,s:x});}}
 iron.push(sweep(shankRows,20,V(0,0,1),ironTone(()=>0,q=>Math.max(nearCrown(q)*.8,nearEye(q)))));
 // The forged eye, standing in the same plane as the upright fluke.
 const eye=new THREE.TorusGeometry(EYE_R,EYE_T,10,28);eye.translate(EYE.x,EYE.y,EYE.z);
 iron.push(paint(eye,ironTone((s,q)=>q.y>EYE_R*.6?.25:0,nearEye)));
 // Three flukes, one standing up and two splayed down, each curving back to a spade point.
 const FLUKE=[[.006,.008],[.02,.035],[.014,.068],[-.01,.092],[-.043,.102],[-.07,.094]];
 const flukes=[];
 for(let i=0;i<3;i++){
  const th=Math.PI/2+i*Math.PI*2/3,d=V(0,Math.sin(th),Math.cos(th)),nrm=X.clone().cross(d).normalize();
  const curve=new THREE.CatmullRomCurve3(FLUKE.map(([ax,r])=>V(CROWN+ax,0,0).addScaledVector(d,r)),false,'centripetal');
  const rows=[];
  for(let k=0;k<=48;k++){
   const u=k/48,p=curve.getPointAt(u),t=curve.getTangentAt(u);
   // Round at the root, broadening into a flat palm that tapers to the point.
   const palm=THREE.MathUtils.smoothstep(u,.58,.8),tip=u>.86?Math.sqrt(Math.max(0,(1-u)/.14)):1;
   const r=.0088-.0026*Math.min(1,u/.6);
   rows.push({p,t,w:(r+palm*.0085)*tip+.0002,h:(r-palm*.0042)*tip+.0002,s:u});
  }
  const geo=sweep(rows,18,nrm,ironTone(u=>u>.8?(u-.8)*4:0,q=>nearCrown(q)));
  iron.push(geo);flukes.push(geo);
 }
 // Tilt the grapnel about z until the eye and the two lower flukes touch the floor together.
 const low=(geos,phi)=>{let m=Infinity;const q=V(0,0,0);for(const geo of geos){const P=geo.attributes.position;
  for(let i=0;i<P.count;i++){q.fromBufferAttribute(P,i);m=Math.min(m,q.x*Math.sin(phi)+q.y*Math.cos(phi));}}return m;};
 let lo=-.8,hi=.8;
 for(let k=0;k<40;k++){const mid=(lo+hi)/2;if(low([eye],mid)<low(flukes.slice(1),mid))hi=mid;else lo=mid;}
 const tilt=(lo+hi)/2;
 const ironGeo=mergeGeometries(iron);iron.forEach(q=>q.dispose());
 ironGeo.rotateZ(tilt);ironGeo.computeBoundingBox();const floor=ironGeo.boundingBox.min.y;ironGeo.translate(0,-floor,0);ironGeo.computeVertexNormals();
 const place=p=>p.clone().applyAxisAngle(V(0,0,1),tilt).setY(p.clone().applyAxisAngle(V(0,0,1),tilt).y-floor);
 // The rope. It leaves a round turn on the back of the eye, drops to the floor and lies in a flat
 // coil beside the shank; the inner end rises and its whipped tail crosses back over the turns.
 const RR=.0062,bar=place(EYE.clone().add(V(-EYE_R,0,0))),barAxis=Y.clone().applyAxisAngle(V(0,0,1),tilt);
 const HEMP=C(0xb3925c),HEMP_LT=C(0xd2b47c),HEMP_DK=C(0x5e4726),DIRT=C(0x6b5a40),TWINE=C(0xe2d6b8),TWINE_DK=C(0x9c8e70);
 let whip=Infinity;
 const ropeTone=(s,a,q,j)=>{
  // Three strands laid right-handed; the grooves between them run dark.
  const lay=Math.cos(3*a-s*260),n=stoneNoise(q.x*90,q.y*90,q.z*90,4);
  c.copy(HEMP).lerp(n>0?HEMP_LT:HEMP_DK,Math.abs(n)*.3);
  if(lay<-.35)c.lerp(HEMP_DK,(-.35-lay)*1.1);else if(lay>.6)c.lerp(HEMP_LT,(lay-.6)*1.2);
  if(q.y<RR*.6)c.lerp(DIRT,.35);
  if(s>whip){c.copy(Math.sin(s*1700)>-.2?TWINE:TWINE_DK);if(Math.cos(a)>.5)c.lerp(C(0xfaf3e0),.3);}
 };
 const ropeParts=[];
 for(const off of [-.0075,.0075]){
  const turn=new THREE.TorusGeometry(EYE_T+RR*.95,RR,8,24);
  turn.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,0,1),barAxis));
  turn.translate(...bar.clone().addScaledVector(barAxis,off).toArray());
  turn.deleteAttribute('uv');turn.deleteAttribute('normal');
  const P=turn.attributes.position,cs=[],q=V(0,0,0);
  for(let i=0;i<P.count;i++){q.fromBufferAttribute(P,i);const u=i%9/8*Math.PI*2,v=Math.floor(i/9)/24;ropeTone(v*.15,u,q,0);cs.push(c.r,c.g,c.b);}
  turn.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));ropeParts.push(turn);
 }
 const CC=V(-.165,0,.112),RO=.066,RI=.023,TURNS=3,psi0=-1.2,yR=RR*1.05+.0003;
 const coil=ps=>{const f=Math.min(1,Math.max(0,(ps-psi0)/(TURNS*Math.PI*2))),r=RO-(RO-RI)*f;return V(CC.x+r*Math.cos(ps),yR,CC.z+r*Math.sin(ps));};
 const start=bar.clone().add(V(-EYE_T-RR*1.6,0,0)).addScaledVector(barAxis,-.0075);
 const pts=[start,V(start.x-.012,start.y*.45,start.z+.006),V(start.x-.018,yR,start.z+.022)];
 const psiEnd=psi0+TURNS*Math.PI*2;
 for(let ps=psi0+.35;ps<=psiEnd;ps+=.22)pts.push(coil(ps));
 // Up over the turns and out, then down to the floor outside the coil.
 const out=psiEnd+.9,dir=V(Math.cos(out),0,Math.sin(out)),at=(r,y)=>CC.clone().addScaledVector(dir,r).setY(y);
 pts.push(at(RI+.004,RR*2.1),at(RI+.016,RR*3.15),at((RI+RO)/2,RR*3.2),at(RO-.004,RR*3.15),at(RO+.011,RR*1.9),at(RO+.022,yR),at(RO+.05,yR));
 const path=new THREE.CatmullRomCurve3(pts,false,'centripetal'),PL=path.getLength();
 whip=PL-.016;
 const ropeRows=[];
 for(let s=0;s<=PL+1e-6;s+=.0022){
  const u=Math.min(1,s/PL),p=path.getPointAt(u),t=path.getTangentAt(u);
  // Keep the coil clear of the floor, and round off the whipped end.
  if(p.y<yR)p.y=yR;
  const end=s>PL-.004?Math.sqrt(Math.max(0,(PL-s)/.004)):1,r=(s>whip&&s<PL-.004?RR*1.05:RR)*end+.0002;
  ropeRows.push({p,t,w:r,h:r,s});
 }
 ropeParts.push(sweep(ropeRows,10,Y,ropeTone));
 const ropeGeo=mergeGeometries(ropeParts);ropeParts.forEach(q=>q.dispose());ropeGeo.computeVertexNormals();
 for(const [geo,material,part] of [[ironGeo,ironMat,'hook-iron'],[ropeGeo,ropeMat,'hook-rope']]){
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=part;g.add(mesh);
 }
 const b=new THREE.Box3();g.children.forEach(p=>{p.geometry.computeBoundingBox();b.union(p.geometry.boundingBox);});
 const mid=b.getCenter(V(0,0,0));g.children.forEach(p=>p.geometry.translate(-mid.x,-b.min.y,-mid.z));
 g.rotation.y=.45;
}

// Beartrap: a trap that has been carried off, so it lies sprung shut. The two toothed jaws
// stand closed in an arch over the trigger pan with their teeth meshed, the leaf springs lie
// slack under their collars, and the chain trails off in a loose curl to a stake lying on its side.
// One vertex-coloured mesh: blackened iron pitted with rust, the teeth ground bright.
function buildBearTrap({g,materials}){
 const C=hex=>new THREE.Color(hex),V=(x,y,z)=>new THREE.Vector3(x,y,z),c=new THREE.Color();
 const IRON=C(0x4b4d4c),IRON_LT=C(0x6f7372),SCALE=C(0x262625),RUST=C(0x7a4020),RUST_DK=C(0x4a2a18),STEEL=C(0xa9adab);
 const parts=[];
 // bright(q) grinds the metal bare; rust is how much the part has rusted overall.
 const put=(geo,{x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1,rust=.3,bright=null}={})=>{
  const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(rx,ry,rz,'YXZ');o.scale.set(sx,sy,sz);o.updateMatrix();
  const n=geo.index?geo.toNonIndexed():geo;if(n!==geo)geo.dispose();
  n.applyMatrix4(o.matrix);n.deleteAttribute('uv');n.clearGroups();
  const P=n.attributes.position,col=new Float32Array(P.count*3),q=V(0,0,0);
  for(let i=0;i<P.count;i++){
   q.fromBufferAttribute(P,i);
   const h=stoneNoise(q.x*70,q.y*70,q.z*70,5),m=stoneNoise(q.x*31+2,q.y*31,q.z*31-1,4);
   c.copy(IRON).lerp(h>0?IRON_LT:SCALE,Math.abs(h)*.6);
   // Rust gathers low down, where the trap has lain on damp ground.
   const r=rust*(.5+m*.9)+Math.max(0,.02-q.y)*12*rust;
   if(r>.2)c.lerp(h>.1?RUST:RUST_DK,Math.min(.85,(r-.2)*1.7));
   const b=bright?bright(q):0;if(b>0)c.lerp(STEEL,Math.min(.85,b));
   col.set([c.r,c.g,c.b],i*3);
  }
  n.setAttribute('color',new THREE.BufferAttribute(col,3));parts.push(n);
 };
 const ext=(shape,depth,curveSegments=10)=>new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments});
 const R=.1,W=.021,T=.009,BASE=.012,HY=BASE+.004;
 // Base: a flat bar along x under the hinges, a cross bar and the trigger pan under the arch.
 put(new RoundedBoxGeometry(2*R+.07,BASE,.04,1,.003),{y:BASE/2,rust:.55});
 put(new RoundedBoxGeometry(.036,BASE,.17,1,.003),{y:BASE/2,rust:.55});
 put(new THREE.CylinderGeometry(.055,.058,.008,24),{y:BASE+.004,rust:.7});
 put(new THREE.CylinderGeometry(.036,.036,.003,20),{y:BASE+.0095,rust:.4});
 // The dog lies loose beside the pan now the trap is sprung.
 put(new RoundedBoxGeometry(.1,.006,.014,1,.002),{x:.015,y:BASE+.011,z:-.05,ry:.35,rust:.4});
 // Jaws: two half-rings standing upright about the hinge line, closed against each other,
 // with serrated teeth along their inner edges pointing into the arch and meshing.
 for(const side of [-1,1]){
  const band=new THREE.Shape();
  band.absarc(0,0,R+W/2,0,Math.PI,false);band.absarc(0,0,R-W/2,Math.PI,0,true);
  const z=side*(T/2+.0005);
  put(ext(band,T,18).translate(0,0,-T/2),{y:HY,z,rust:.3,bright:q=>Math.hypot(q.x,q.y-HY)<R-W/2+.003?.45:0});
  // A ridge rolled along the outer edge stiffens each jaw.
  put(new THREE.TorusGeometry(R+W/2-.002,.0035,4,24,Math.PI),{y:HY,z:z+side*T*.35,rust:.35});
  for(let i=0;i<9;i++){
   const a=(i+(side<0?.5:1))/10*Math.PI,rr=R-W/2+.001,len=.028*(.9+.2*((i*7+(side<0?3:0))%5)/4);
   const tooth=new THREE.Shape();tooth.moveTo(-.0095,0);tooth.lineTo(.0095,0);tooth.lineTo(.0022,len);tooth.lineTo(-.0022,len);tooth.closePath();
   put(ext(tooth,.005,1).translate(0,0,-.0025),{x:Math.cos(a)*rr,y:HY+Math.sin(a)*rr,z,rz:a+Math.PI/2,rust:.2,
    bright:q=>{const d=Math.hypot(q.x,q.y-HY);return d<rr-len*.45?.9:0;}});
  }
 }
 // Hinge posts where the jaw ends meet, each with its pin through both jaws.
 for(const x of [-R,R]){
  put(new THREE.CylinderGeometry(.017,.021,.03,10),{x,y:BASE+.013,rust:.5});
  put(new THREE.CylinderGeometry(.0065,.0065,.05,8),{x,y:HY,rx:Math.PI/2,rust:.3,bright:q=>Math.abs(q.z)>.02?.5:0});
 }
 // Leaf springs, slack now: a flat bottom leaf, the top leaf lifting away from it towards the
 // jaws, a loop joining them, and the collar dropped down round the jaw ends.
 const L=.115;
 for(const side of [-1,1]){
  const x0=side*(R+.028),x1=side*(R+.028+L),lift=.034;
  put(new RoundedBoxGeometry(L,.006,.03,1,.002),{x:(x0+x1)/2,y:.005,rust:.45});
  const top=Math.atan2(lift,L);
  put(new RoundedBoxGeometry(Math.hypot(L,lift),.006,.03,1,.002),{x:(x0+x1)/2,y:.017+lift/2,rz:-side*top,rust:.4});
  put(new THREE.TorusGeometry(.006,.003,6,12,Math.PI),{x:x1,y:.011,rz:side<0?Math.PI/2:-Math.PI/2,sz:4.5,rust:.5});
  put(new THREE.TorusGeometry(.028,.0055,6,18),{x:side*(R+.012),y:.044,rx:Math.PI/2,sy:.7,rz:0,rust:.4});
 }
 // Chain from the cross bar in a loose curl on the floor, ending at a stake lying on its side.
 const path=new THREE.CatmullRomCurve3([V(0,0,.085),V(.025,0,.135),V(.085,0,.16),V(.14,0,.125),V(.15,0,.06)],false,'centripetal');
 const LINK=.023,n=Math.floor(path.getLength()/LINK);
 for(let i=0;i<n;i++){
  const u=(i+.5)/n,p=path.getPointAt(u),t=path.getTangentAt(u),flat=i%2===0;
  put(new THREE.TorusGeometry(.0105,.0034,4,10),{x:p.x,y:flat?.0034:.0139,z:p.z,ry:-Math.atan2(t.z,t.x),rx:flat?Math.PI/2:0,sx:1.35,rust:.6});
 }
 const end=path.getPoint(1),dir=path.getTangent(1).setY(0).normalize(),head=Math.atan2(dir.z,dir.x);
 put(new THREE.TorusGeometry(.013,.0045,6,14),{x:end.x+dir.x*.012,y:.0045,z:end.z+dir.z*.012,ry:-head,rx:Math.PI/2,rust:.5});
 // The stake: a square iron spike lying along the chain's run, its head mushroomed by hammering.
 const S=.1,sx=end.x+dir.x*(.03+S/2),sz=end.z+dir.z*(.03+S/2);
 put(new THREE.CylinderGeometry(.0085,.002,S,4),{x:sx,y:.0085,z:sz,rz:-Math.PI/2,ry:-head,rust:.65,bright:q=>Math.hypot(q.x-sx,q.z-sz)>S/2-.015?.35:0});
 put(new THREE.CylinderGeometry(.016,.013,.012,10),{x:end.x+dir.x*.03,y:.016,z:end.z+dir.z*.03,rz:Math.PI/2,ry:-head,rust:.55});
 const geo=mergeGeometries(parts);parts.forEach(p=>p.dispose());
 geo.computeBoundingBox();const b=geo.boundingBox,mid=b.getCenter(V(0,0,0));geo.translate(-mid.x,-b.min.y,-mid.z);
 const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.62,roughness:.52}));
 mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part='beartrap';materials.push(mesh.material);g.add(mesh);
 g.rotation.y=-.35;
}

// Land mine: a pressure mine dug up and set down, so it lies whole on the floor, tipped onto
// one edge and propped on a clod of the earth it came out of. The olive casing is chipped to
// bare steel on the rim and caked with dried soil up to the old ground line; the red pressure
// plate carries the fuse and its trigger prongs, made safe with a pin, a pull ring and a tag.
// One vertex-coloured mesh on one material.
function buildLandMine({g,materials}){
 const C=hex=>new THREE.Color(hex),V=(x,y,z)=>new THREE.Vector3(x,y,z);
 const parts=[];
 const put=(geo,paint,{x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1}={})=>{
  const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.scale.set(sx,sy,sz);o.updateMatrix();
  const n=geo.index?geo.toNonIndexed():geo;if(n!==geo)geo.dispose();
  n.applyMatrix4(o.matrix);n.deleteAttribute('uv');n.clearGroups();
  const P=n.attributes.position,col=new Float32Array(P.count*3),c=new THREE.Color();
  for(let i=0;i<P.count;i++){paint(c,P.getX(i),P.getY(i),P.getZ(i));col.set([c.r,c.g,c.b],i*3);}
  n.setAttribute('color',new THREE.BufferAttribute(col,3));parts.push(n);
 };
 const noise=(x,y,z,f)=>stoneNoise(x*f,y*f,z*f,1);
 const OLIVE=C(0x4f5a2c),OLIVE_DK=C(0x39411f),STEEL=C(0x80867f),RUST=C(0x6b3a1e),RUST_DK=C(0x3e2414),STENCIL=C(0xc9b24a),
  EARTH=C(0x5a4632),EARTH_DRY=C(0x7b6650),RED=C(0xa8281a),RED_DK=C(0x5e140c),RED_WORN=C(0xc98a6a),BRASS=C(0xb08a3a),TAG=C(0xd9d2bc);
 const R=.122,LINE=.02;
 // Casing: a squat lathed drum with a flat base, a rounded lid rising to a flat top and a lid seam.
 // Below the old ground line it is rusty and caked with dried earth in a ragged tide mark.
 const casing=(c,x,y,z)=>{
  const r=Math.hypot(x,z),a=Math.atan2(z,x),n=noise(x,y,z,40)*.5+.5;
  c.copy(OLIVE).lerp(OLIVE_DK,n*.5);
  const u=(a-.3)/1.3;
  if(r>R-.004&&y>.0175&&y<.0285&&u>0&&u<1&&(u*5)%1<.6)c.copy(STENCIL).lerp(OLIVE_DK,n*.3);
  if(y>.04&&r>.1&&noise(x+1,y,z,95)>.35)c.copy(STEEL).lerp(RUST,n*.35);
  if(r>.083&&r<.089&&y<.0475&&y>.04)c.multiplyScalar(.4);
  const tide=LINE+noise(x,0,z,70)*.006;
  if(y<tide+.004)c.lerp(n>.5?RUST:RUST_DK,Math.min(1,(tide+.004-y)/.006));
  if(y<tide&&noise(x-2,y,z+3,120)>-.25)c.copy(EARTH).lerp(EARTH_DRY,Math.min(1,(tide-y)/.02)*.4+n*.4);
 };
 const profile=[[0,0],[.1,0],[.114,.002],[R-.001,.008],[R,.012],[R,.016],[R,.018],[R+.0005,.028],[R+.0005,.03],[R-.001,.038],[R-.008,.044],[R-.018,.047],
  [.092,.048],[.088,.046],[.084,.046],[.08,.048],[.06,.048],[0,.048]].map(([r,y])=>new THREE.Vector2(r,y));
 put(new THREE.LatheGeometry(profile,64),casing);
 // Crusts of dried earth still stuck to the lower wall.
 for(let i=0;i<7;i++){const a=i*2.39+.4,s=.007+(i%3)*.003;
  put(new THREE.DodecahedronGeometry(s,0),(c,x,y,z)=>c.copy(EARTH).lerp(EARTH_DRY,noise(x,y,z,90)*.3+.4),{x:Math.cos(a)*(R+.001),y:.004+(i%2)*.006,z:Math.sin(a)*(R+.001),ry:-a,sx:.45,sz:1.3});}
 // Lid bolts.
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2+.2;
  put(new THREE.CylinderGeometry(.0065,.0065,.006,6),(c,x,y,z)=>c.copy(STEEL).lerp(RUST,.3+(noise(x,y,z,120)*.5+.5)*.5).multiplyScalar(y>.052?1:.7),{x:Math.cos(a)*.1,y:.05,z:Math.sin(a)*.1});}
 // Carrying lug: a wire loop standing off the wall.
 {const a=2.5;
  put(new THREE.TorusGeometry(.013,.003,5,12,Math.PI),(c,x,y,z)=>c.copy(STEEL).lerp(RUST_DK,.45+noise(x,y,z,150)*.2),{x:Math.cos(a)*(R+.004),y:LINE+.001,z:Math.sin(a)*(R+.004),ry:-(a+Math.PI/2)});}
 // Pressure plate with grip ridges, worn pale at the edge.
 put(new THREE.CylinderGeometry(.05,.052,.01,24),(c,x,y,z)=>{c.copy(RED).lerp(RED_DK,noise(x,y,z,100)*.25+.25);if(Math.hypot(x,z)>.046&&y>.055)c.lerp(RED_WORN,.5);},{y:.053});
 for(let i=0;i<6;i++)put(new THREE.BoxGeometry(.084,.003,.005),c=>c.copy(RED_DK),{y:.0595,ry:i/6*Math.PI});
 // Fuse with three splayed trigger prongs, red-tipped.
 put(new THREE.CylinderGeometry(.013,.016,.016,12),(c,x,y)=>c.copy(STEEL).multiplyScalar(y>.07?1:.75),{y:.066});
 for(let i=0;i<3;i++){const a=i/3*Math.PI*2+.9,lean=.28,dx=Math.cos(a),dz=Math.sin(a),len=.042;
  const tipX=dx*(.006+Math.sin(lean)*len),tipZ=dz*(.006+Math.sin(lean)*len),tipY=.072+Math.cos(lean)*len;
  put(new THREE.CylinderGeometry(.0028,.0034,len,5),(c,x,y)=>c.copy(STEEL).lerp(RUST,Math.max(0,.08-y)*6),
   {x:dx*.006+tipX/2-dx*.003,y:.072+Math.cos(lean)*len/2,z:dz*.006+tipZ/2-dz*.003,rx:dz*lean,rz:-dx*lean});
  put(new THREE.SphereGeometry(.0055,8,6),c=>c.copy(RED),{x:tipX,y:tipY,z:tipZ});
 }
 // Made safe: a brass pin through the fuse, its pull ring hanging over the plate with a paper tag tied on.
 put(new THREE.CylinderGeometry(.0024,.0024,.05,6),c=>c.copy(BRASS),{x:.008,y:.067,rz:Math.PI/2});
 put(new THREE.TorusGeometry(.012,.0022,5,16),c=>c.copy(BRASS),{x:.045,y:.066,rz:.15,rx:.5});
 put(new THREE.BoxGeometry(.03,.0015,.018),(c,x,y,z)=>{c.copy(TAG);if(Math.abs(z)<.004)c.copy(RED);},{x:.068,y:.061,z:.012,ry:-.5,rz:-.12});
 // Tip it onto one edge, rest the low edge on the floor and prop the high edge on a clod of earth.
 const TILT=.2,tilt=new THREE.Matrix4().makeRotationX(TILT);
 const geo=mergeGeometries(parts);parts.forEach(p=>p.dispose());geo.applyMatrix4(tilt);
 geo.computeBoundingBox();const low=geo.boundingBox.min.y;geo.translate(0,-low,0);
 const edge=V(0,0,-R).applyMatrix4(tilt);edge.y-=low;
 const clods=[];const clod=(s,x,z,sy,seed)=>{const d=new THREE.DodecahedronGeometry(s,0);d.deleteAttribute('uv');
  const o=new THREE.Object3D();o.position.set(x,s*sy*.8,z);o.rotation.set(seed,seed*1.7,seed*.6);o.scale.set(1.1,sy,1);o.updateMatrix();d.applyMatrix4(o.matrix);
  const P=d.attributes.position,col=new Float32Array(P.count*3),c=new THREE.Color();
  for(let i=0;i<P.count;i++){c.copy(EARTH).lerp(EARTH_DRY,Math.min(1,P.getY(i)*14)*.6+noise(P.getX(i),P.getY(i),P.getZ(i),80)*.15);col.set([c.r,c.g,c.b],i*3);}
  d.setAttribute('color',new THREE.BufferAttribute(col,3));clods.push(d);};
 clod(edge.y*.62,edge.x+.004,edge.z-.004,1,.7);
 clod(.012,.15,-.07,.7,1.9);clod(.008,.135,-.1,.75,2.6);clod(.006,-.16,.05,.7,3.3);
 const all=mergeGeometries([geo,...clods]);geo.dispose();clods.forEach(d=>d.dispose());
 all.computeBoundingBox();const b=all.boundingBox,mid=b.getCenter(V(0,0,0));all.translate(-mid.x,-b.min.y,-mid.z);
 const mesh=new THREE.Mesh(all,new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.4,roughness:.62}));
 mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part='land-mine';materials.push(mesh.material);g.add(mesh);
 g.rotation.y=.6;
}

// Lenses: a pair of round gold wire spectacles, folded and laid face up on their temples.
// Built upright (lenses in the xy plane, the front towards +z), then tipped onto the floor.
function buildLenses({g,materials}){
 const C=hex=>new THREE.Color(hex),V=(x,y,z)=>new THREE.Vector3(x,y,z),c=new THREE.Color();
 const wireMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.85,roughness:.28});
 const glassMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.1,roughness:.04,
  transparent:true,opacity:.5,depthWrite:false,emissive:0x2a3a40,emissiveIntensity:.3});
 materials.push(wireMat,glassMat);
 const GOLD=C(0xc6a153),HI=C(0xf2dc9a),LO=C(0x6e5424),SHELL=C(0x5a3014),AMBER=C(0xa8662a),PAD=C(0xd9d6c8);
 const lists={wire:[],glass:[]};
 const put=(geo,paint,which='wire')=>{
  geo.deleteAttribute('uv');
  const p=geo.attributes.position,n=geo.attributes.normal,cols=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   paint(c,p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i));
   cols[i*3]=Math.min(1,Math.max(0,c.r));cols[i*3+1]=Math.min(1,Math.max(0,c.g));cols[i*3+2]=Math.min(1,Math.max(0,c.b));
  }
  geo.setAttribute('color',new THREE.BufferAttribute(cols,3));lists[which].push(geo);
 };
 // Drawn gold wire: brighter where it faces up and out, a little darker underneath.
 const gold=(col,x,y,z,nx,ny,nz)=>col.copy(GOLD).lerp(ny+nz*.5>0?HI:LO,Math.min(1,Math.abs(ny+nz*.5))*.45);
 const wire=(pts,r,paint=gold,seg=24)=>put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),seg,r,6,false),paint);
 const L=.058,R=.043,W=.0026;
 for(const s of [-1,1]){
  // The eye rims, with a tiny lug where the wire meets at the outer side.
  const rim=new THREE.TorusGeometry(R,W,6,56);rim.translate(s*L,0,0);put(rim,gold);
  const lug=new THREE.CylinderGeometry(.0034,.0034,.009,8);lug.translate(s*(L+R+.001),.004,0);put(lug,gold);
  // Ground lenses: biconvex, pale with a cool rim, and a painted window reflection.
  const prof=[];for(let i=0;i<=8;i++){const t=i/8;prof.push(new THREE.Vector2((R-.0012)*Math.sin(t*Math.PI/2),.0028*Math.cos(t*Math.PI/2)));}
  for(let i=7;i>=0;i--)prof.push(new THREE.Vector2(prof[i].x,-prof[i].y));
  const lens=new THREE.LatheGeometry(prof,40);lens.rotateX(Math.PI/2);lens.translate(s*L,0,0);
  put(lens,(col,x,y,z)=>{
   const u=(x-s*L)/R,w=y/R,r=Math.hypot(u,w);
   col.set(0xd4e6ea).lerp(C(0x7fa89c),Math.max(0,r-.75)*2.4);
   const band=u*.55-w*.85-.12;col.lerp(C(0xffffff),Math.exp(-((band/.12)**2))*.8*(z>0?1:.3));
   col.lerp(C(0xffffff),Math.exp(-(((band-.42)/.05)**2))*.5*(z>0?1:.2));
  },'glass');
  // Nose pads on short arms, and the end pieces running back to the hinge barrels.
  wire([V(s*.019,-.014,0),V(s*.017,-.017,-.005),V(s*.012,-.017,-.009)],.0012,gold,8);
  const pad=new THREE.SphereGeometry(.0058,10,8);pad.scale(.4,1,.75);pad.rotateY(s*.35);pad.translate(s*.011,-.018,-.011);
  put(pad,(col,x,y,z,nx,ny)=>col.copy(PAD).lerp(C(0xffffff),Math.max(0,ny)*.3));
  wire([V(s*(L+R-.001),.006,0),V(s*(L+R+.004),.007,-.003),V(s*(L+R+.006),.008,-.008)],W,gold,8);
  const barrel=new THREE.CylinderGeometry(.0034,.0034,.01,10);barrel.translate(s*(L+R+.006),.008,-.009);put(barrel,gold);
  const screw=new THREE.SphereGeometry(.0022,8,6);screw.translate(s*(L+R+.006),.0135,-.009);put(screw,(col,x,y,z,nx,ny)=>col.copy(HI).lerp(LO,ny>.8&&Math.abs(nx)<.25?.7:0));
 }
 // The bridge: a raised saddle arch, bowed a little forward.
 wire([V(-.0155,.011,0),V(-.012,.019,.002),V(0,.024,.004),V(.012,.019,.002),V(.0155,.011,0)],W*.95,gold,20);
 // Folded temples, each crossing behind the lenses to the far side and curling into an ear hook
 // in a tortoiseshell sleeve. The right one folds first and lies nearer the glass.
 const hx=L+R+.006;
 for(const [s,z,dy] of [[1,-.012,-.013],[-1,-.019,-.011]]){
  const end=-s*(hx-.028),y1=.008+dy;
  wire([V(s*hx,.008,-.009),V(s*(hx-.006),.008,z),V(0,.008+dy*.55,z),V(end,y1,z)],W*.9,gold,28);
  const sleeve=(col,x,y,z,nx,ny)=>{col.copy(SHELL).lerp(AMBER,Math.max(0,Math.sin(x*420+y*300)*Math.sin(y*260-x*180)));col.lerp(C(0xe0c090),Math.max(0,ny)*.2);};
  wire([V(end+s*.012,y1+.001,z),V(end,y1,z),V(end-s*.012,y1-.004,z),V(end-s*.019,y1-.016,z),V(end-s*.018,y1-.028,z),V(end-s*.013,y1-.035,z)],.0036,sleeve,24);
 }
 const merged={};
 for(const which of ['wire','glass']){const list=lists[which];merged[which]=mergeGeometries(list);list.forEach(q=>q.dispose());}
 // Tip it face up onto the folded temples, then settle it on the floor and centre it.
 const pose=new THREE.Matrix4().makeRotationX(-Math.PI/2+.05);
 const b=new THREE.Box3();
 for(const geo of Object.values(merged)){geo.applyMatrix4(pose);geo.computeBoundingBox();b.union(geo.boundingBox);}
 const mid=b.getCenter(V(0,0,0));
 for(const [which,material] of [['wire',wireMat],['glass',glassMat]]){
  const geo=merged[which];geo.translate(-mid.x,-b.min.y,-mid.z);
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=which==='wire';mesh.receiveShadow=true;mesh.userData.part=`lenses-${which}`;g.add(mesh);
 }
 g.rotation.y=.35;
}

// Expensive camera: a chrome-topped rangefinder in black pebbled leatherette, with a knurled
// lens barrel, a coated front element, a bulb flash gun in the accessory shoe and a leather
// neck strap trailing on the floor. Built with the lens towards +z.
function buildCamera({g,materials}){
 const C=hex=>new THREE.Color(hex),V=(x,y,z)=>new THREE.Vector3(x,y,z),c=new THREE.Color();
 const hideMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.82});
 const chromeMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.9,roughness:.24});
 const glassMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.25,roughness:.05,emissive:0x1a2438,emissiveIntensity:.35});
 materials.push(hideMat,chromeMat,glassMat);
 const lists={hide:[],chrome:[],glass:[]};
 const put=(geo,paint,which)=>{
  geo.deleteAttribute('uv');
  // Rounded boxes come unindexed; weld them so every list merges as indexed geometry.
  if(!geo.index){const welded=mergeVertices(geo);geo.dispose();geo=welded;}
  const p=geo.attributes.position,n=geo.attributes.normal,cols=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   paint(c,p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i));
   cols[i*3]=Math.min(1,Math.max(0,c.r));cols[i*3+1]=Math.min(1,Math.max(0,c.g));cols[i*3+2]=Math.min(1,Math.max(0,c.b));
  }
  geo.setAttribute('color',new THREE.BufferAttribute(cols,3));lists[which].push(geo);return geo;
 };
 // Lathe a profile of [radius, z] about an axis along z through (x,y).
 const lathe=(prof,seg,x,y)=>{const geo=new THREE.LatheGeometry(prof.map(([r,z])=>new THREE.Vector2(r,z)),seg);geo.rotateX(Math.PI/2);geo.translate(x,y,0);return geo;};
 const W=.23,D=.074,BY=.058,LY=.06;
 // Polished chrome with a sky-bright top, a dark horizon line and a dim floor reflection.
 const CHR=C(0xb9bec2),CHR_HI=C(0xf4f7f8),CHR_LO=C(0x4c5256),CHR_MID=C(0x8a9296);
 const chrome=(col,x,y,z,nx,ny,nz)=>{
  const up=ny*.8+nz*.35;
  col.copy(CHR);
  if(up>.25)col.lerp(CHR_HI,Math.min(1,(up-.25)*1.6));
  else if(up>-.05)col.lerp(CHR_LO,(.25-up)*1.4);
  else col.lerp(CHR_MID,Math.min(1,-up));
 };
 // Black enamel for the rings that carry engraved scales.
 const ENAMEL=C(0x151515),TICK=C(0xe8e4d8);
 // The body shell: pebbled black leatherette between a chrome top plate and base plate.
 const LEA=C(0x1f1c1a),LEA_HI=C(0x3a3531),LEA_LO=C(0x0d0c0b);
 const hide=(col,x,y,z,nx,ny,nz)=>{
  const n=stoneNoise(x*420,y*420,z*420,1)*.6+stoneNoise(x*900+2,y*900,z*900-1,1)*.4;
  col.copy(LEA).lerp(n>0?LEA_HI:LEA_LO,Math.min(1,Math.abs(n)*.9));
  col.lerp(LEA_HI,Math.max(0,ny)*.35);
 };
 const shell=new RoundedBoxGeometry(W,.094,D,3,.016);shell.translate(0,BY,0);put(shell,hide,'hide');
 const base=new RoundedBoxGeometry(W+.004,.012,D+.004,2,.005);base.translate(0,.006,0);put(base,chrome,'chrome');
 const top=new RoundedBoxGeometry(W+.002,.03,D+.002,3,.009);top.translate(0,.118,0);put(top,chrome,'chrome');
 // A raised rangefinder housing along the top plate's front edge.
 const hump=new RoundedBoxGeometry(.13,.012,.03,2,.005);hump.translate(-.02,.136,.012);put(hump,chrome,'chrome');
 // Rangefinder and viewfinder windows, and the frame-line illuminator between them.
 const win=(w,h,x,y,paint)=>{const geo=new RoundedBoxGeometry(w,h,.004,1,.0015);geo.translate(x,y,D/2+.0012);put(geo,paint,'glass');};
 const pane=(col,x,y)=>{col.set(0x2a3c52).lerp(C(0x9fc4dc),Math.max(0,(y-.117)/.014));};
 win(.032,.016,-.085,.121,pane);win(.022,.014,.058,.121,pane);
 win(.014,.012,-.018,.121,(col,x,y)=>{col.set(0xc9c6bd).lerp(C(0xf2efe6),Math.abs(Math.sin(x*900)));});
 // Top plate: the rewind crank knob, the accessory shoe, the speed dial, the shutter release and
 // the film advance lever.
 {const knob=new THREE.CylinderGeometry(.013,.014,.018,28);knob.translate(-.083,.142,-.01);put(knob,(col,x,y,z,nx,ny,nz)=>{chrome(col,x,y,z,nx,ny,nz);if(Math.abs(ny)<.5&&Math.sin(Math.atan2(z+.01,x+.083)*40)>.1)col.lerp(CHR_LO,.65);},'chrome');}
 const crank=new THREE.BoxGeometry(.004,.003,.016);crank.translate(-.083,.1525,-.002);put(crank,chrome,'chrome');
 const shoe=new RoundedBoxGeometry(.03,.006,.024,1,.0015);shoe.translate(.008,.136,-.006);put(shoe,chrome,'chrome');
 const dial=new THREE.CylinderGeometry(.015,.016,.008,32);dial.translate(.06,.137,-.004);
 put(dial,(col,x,y,z,nx,ny,nz)=>{
  if(ny>.9){const a=Math.atan2(z+.004,x-.06),r=Math.hypot(z+.004,x-.06);col.copy(ENAMEL);if(r>.009&&r<.014&&Math.sin(a*12)>.82)col.copy(TICK);if(r<.004)col.copy(CHR);}
  else{chrome(col,x,y,z,nx,ny,nz);if(Math.sin(Math.atan2(z+.004,x-.06)*48)>.1)col.lerp(CHR_LO,.6);}
 },'chrome');
 const release=new THREE.CylinderGeometry(.0045,.0055,.009,14);release.translate(.087,.1375,.012);put(release,chrome,'chrome');
 const lever=new THREE.CylinderGeometry(.0058,.0058,.0035,16);lever.translate(.094,.1345,-.016);put(lever,chrome,'chrome');
 const arm=new RoundedBoxGeometry(.04,.003,.008,1,.0012);arm.rotateY(.5);arm.translate(.102,.1375,-.024);put(arm,chrome,'chrome');
 const tipCap=new THREE.CylinderGeometry(.0042,.0042,.006,10);tipCap.translate(.118,.1395,-.034);put(tipCap,hide,'hide');
 // Strap lugs on the ends of the top plate, each with a split ring.
 for(const s of [-1,1]){
  const lug=new RoundedBoxGeometry(.008,.012,.012,1,.003);lug.translate(s*(W/2+.003),.108,0);put(lug,chrome,'chrome');
  const ring=new THREE.TorusGeometry(.0075,.0016,6,18);ring.rotateY(Math.PI/2);ring.translate(s*(W/2+.009),.1,0);put(ring,chrome,'chrome');
 }
 // The lens: a chrome mount, a knurled focusing ring, an enamelled aperture ring with its scale,
 // a stepped front barrel and the bezel round the glass.
 const Z0=D/2-.002;
 const barrel=[[.0001,Z0],[.034,Z0],[.034,Z0+.006],[.031,Z0+.007],[.031,Z0+.009],[.029,Z0+.01],[.029,Z0+.026],[.027,Z0+.027],[.026,Z0+.03],[.026,Z0+.045],[.024,Z0+.047],[.022,Z0+.047],[.022,Z0+.043],[.019,Z0+.042]];
 put(lathe(barrel,40,0,LY),(col,x,y,z,nx,ny,nz)=>{
  const a=Math.atan2(y-LY,x);
  if(z>Z0+.01&&z<Z0+.026){chrome(col,x,y,z,nx,ny,nz);if(Math.sin(a*60)>0)col.lerp(CHR_LO,.7);}
  else if(z>Z0+.03&&z<Z0+.042){col.copy(ENAMEL);if(Math.abs(z-(Z0+.036))<.0025&&Math.sin(a*16)>.9)col.copy(TICK);}
  else chrome(col,x,y,z,nx,ny,nz);
 },'chrome');
 {const tab=new RoundedBoxGeometry(.008,.006,.012,1,.002);tab.translate(0,LY-.033,Z0+.018);put(tab,chrome,'chrome');}
 // The front element: a shallow dome with a violet-amber coating and a window caught in it.
 const prof=[];for(let i=0;i<=10;i++){const t=i/10*Math.PI/2;prof.push([.0195*Math.sin(t)+.0001,Z0+.042+.006*Math.cos(t)]);}
 put(lathe(prof.reverse(),32,0,LY),(col,x,y,z)=>{
  const u=x/.0195,w=(y-LY)/.0195,r=Math.hypot(u,w);
  col.set(0x10131e).lerp(C(0x3b2a5a),Math.max(0,1-r)*.8).lerp(C(0x7a5a24),Math.max(0,r-.7)*1.6);
  col.lerp(C(0xf0f6ff),Math.exp(-(((u+.3)**2+(w-.35)**2)/.02))*.9);
  col.lerp(C(0xa8d0ff),Math.exp(-(((u-.35)**2+(w+.3)**2)/.008))*.5);
 },'glass');
 // The bulb flash: a fan-ribbed polished reflector on a bracket in the accessory shoe, a clear
 // blue-tinted bulb seated in it.
 const FY=.21,FZ=.012,FX=.008,tilt=-.18;
 const post=new THREE.CylinderGeometry(.004,.004,.05,10);post.translate(FX,.164,-.012);put(post,chrome,'chrome');
 const foot=new RoundedBoxGeometry(.024,.006,.02,1,.002);foot.translate(FX,.142,-.006);put(foot,chrome,'chrome');
 const dishProf=[];for(let i=0;i<=10;i++){const r=.0065+i/10*.046;dishProf.push([r,-.03+(r*r)/.07]);}
 for(let i=10;i>=0;i--){const [r,z]=dishProf[i];dishProf.push([r+(i===10?.0018:0),z-.0018]);}
 // Back sheet first, so the lathe's normals face out of the bowl on both sheets.
 const dish=lathe(dishProf.reverse(),48,0,0);
 dish.applyMatrix4(new THREE.Matrix4().makeRotationX(tilt));dish.translate(FX,FY,FZ);
 put(dish,(col,x,y,z,nx,ny,nz)=>{
  // Inside the bowl, bright towards the rim with dark fan ribs; the back is plain chrome.
  const a=Math.atan2(y-FY,x-FX),r=Math.hypot(x-FX,y-FY);
  chrome(col,x,y,z,nx,ny,nz);
  if(nz>.1){col.copy(CHR_HI).lerp(CHR_MID,.5-.4*Math.min(1,r/.05));if(Math.cos(a*16)>.85)col.lerp(CHR_LO,.55);}
 },'chrome');
 const socket=new THREE.CylinderGeometry(.007,.0075,.012,14);socket.rotateX(Math.PI/2);socket.applyMatrix4(new THREE.Matrix4().makeRotationX(tilt));socket.translate(FX,FY,FZ-.026);put(socket,chrome,'chrome');
 const bulb=new THREE.SphereGeometry(.013,18,12);bulb.scale(1,1,1.2);bulb.translate(0,0,-.006);bulb.applyMatrix4(new THREE.Matrix4().makeRotationX(tilt));bulb.translate(FX,FY,FZ);
 put(bulb,(col,x,y,z,nx,ny,nz)=>{col.set(0x6f9ccc).lerp(C(0xe9f4ff),Math.max(0,ny*.6+nz*.5));if(Math.sin((x-FX)*900)*Math.sin((y-FY)*900)>.6)col.lerp(C(0xd4d8dc),.5);},'glass');
 // The neck strap: flat leather with pale edge stitching, leaving each ring, falling to the floor
 // and trailing in a loose loop behind the camera.
 const TAN=C(0x6b3d20),TAN_HI=C(0x93603a),TAN_LO=C(0x3a200f),STITCH=C(0xd9c9a4);
 const strapPts=[V(-W/2-.009,.093,0),V(-W/2-.02,.07,-.006),V(-W/2-.03,.02,-.02),V(-W/2-.02,.004,-.07),V(-.06,.004,-.12),V(.05,.004,-.135),V(W/2+.02,.004,-.09),V(W/2+.034,.018,-.03),V(W/2+.022,.07,-.006),V(W/2+.009,.093,0)];
 const path=new THREE.CatmullRomCurve3(strapPts,false,'centripetal'),PL=path.getLength(),N=10,rows=Math.ceil(PL/.004);
 const pos=[],col=[],idx=[];
 for(let k=0;k<=rows;k++){
  const u=k/rows,p=path.getPointAt(u),t=path.getTangentAt(u),s=u*PL;
  const side=t.clone().cross(V(0,1,0));if(side.lengthSq()<1e-4)side.set(0,0,1);side.normalize();
  const up=side.clone().cross(t).normalize();
  const w=.0075,h=.0016;if(p.y<h+.0002)p.y=h+.0002;
  for(let j=0;j<N;j++){
   const a=j/N*Math.PI*2,q=p.clone().addScaledVector(side,Math.cos(a)*w).addScaledVector(up,Math.sin(a)*h);
   pos.push(q.x,q.y,q.z);
   const n=stoneNoise(q.x*300,q.y*300,q.z*300,1);
   c.copy(TAN).lerp(n>0?TAN_HI:TAN_LO,Math.abs(n)*.35);
   if(Math.sin(a)<0)c.lerp(TAN_LO,.4);
   if(Math.abs(Math.abs(Math.cos(a))-.72)<.2&&Math.sin(a)>0&&Math.sin(s*700)>0)c.copy(STITCH);
   col.push(c.r,c.g,c.b);
  }
  if(k>0)for(let j=0;j<N;j++){const a=(k-1)*N+j,b=(k-1)*N+(j+1)%N,d=k*N+j,e=k*N+(j+1)%N;idx.push(a,d,b,b,d,e);}
 }
 const strap=new THREE.BufferGeometry();
 strap.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));strap.setIndex(idx);strap.computeVertexNormals();
 strap.setAttribute('color',new THREE.Float32BufferAttribute(col,3));lists.hide.push(strap);
 const parts=[['hide',hideMat],['chrome',chromeMat],['glass',glassMat]];
 const merged={};
 const b=new THREE.Box3();
 for(const [which] of parts){const list=lists[which];merged[which]=mergeGeometries(list);list.forEach(q=>q.dispose());merged[which].computeBoundingBox();b.union(merged[which].boundingBox);}
 const mid=b.getCenter(V(0,0,0));
 for(const [which,material] of parts){
  const geo=merged[which];geo.translate(-mid.x,-b.min.y,-mid.z);
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.part=`camera-${which}`;g.add(mesh);
 }
 g.rotation.y=-.4;
}

// Eucalyptus leaves: long sickle-shaped blades that cup along a raised midrib, curl up
// at the tip and hang from a short reddish stalk. A stack shows a second leaf crossing
// the first. Returns merged blade and stalk geometry, so each draws once.
export function eucalyptusLeafGeometry(count=1){
 const blades=[],stalks=[];
 const leaves=[[0,0,0,1]];
 if(count>1)leaves.push([.03,-.02,.9,.9]);
 for(const [ox,oz,ry,sc] of leaves){
  const L=.28*sc,W=.034*sc,rows=18,cols=6;
  // Centreline: bows sideways like a sickle and lifts towards the tip.
  const spine=u=>new THREE.Vector3((u-.5)*L,.004+.02*u*u,.05*sc*(4*(u-.5)**2-1)+.012*sc);
  const width=u=>W*1.55*Math.pow(u,.45)*Math.pow(1-u,1.15);
  const positions=[],indices=[];
  for(let r=0;r<=rows;r++){
   const u=r/rows,c=spine(u),w=width(u);
   const t=spine(Math.min(1,u+.01)).sub(spine(Math.max(0,u-.01))).normalize();
   const side=new THREE.Vector3(-t.z,0,t.x).normalize();
   for(let k=0;k<=cols;k++){
    const v=k/cols*2-1;
    // Halves cup upward from a midrib that sits a touch higher than the blade beside it.
    const y=c.y+.012*sc*v*v*(w/W)+.0015*(1-Math.abs(v))**4;
    positions.push(c.x+side.x*v*w,y,c.z+side.z*v*w);
   }
  }
  for(let r=0;r<rows;r++)for(let k=0;k<cols;k++){
   const a=r*(cols+1)+k,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);
  }
  const blade=new THREE.BufferGeometry();
  blade.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));blade.setIndex(indices);
  const rib=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([.02,.3,.6,.93].map(u=>spine(u).add(new THREE.Vector3(0,.0022,0)))),16,.0022*sc,4,false);
  const b0=spine(0);
  const petiole=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([b0.clone().add(new THREE.Vector3(.002,.001,0)),new THREE.Vector3(b0.x-.02*sc,.0035,b0.z+.004),new THREE.Vector3(b0.x-.042*sc,.0035,b0.z+.013*sc)]),6,.0032*sc,5,false);
  const place=new THREE.Matrix4().makeRotationY(ry).setPosition(ox,0,oz);
  for(const geo of [blade,rib,petiole])geo.applyMatrix4(place);
  blade.computeVertexNormals();
  blades.push(blade);stalks.push(rib,petiole);
 }
 const blade=mergeGeometries(blades),stalk=mergeGeometries(stalks);
 blades.forEach(b=>b.dispose());stalks.forEach(s=>s.dispose());
 return {blade,stalk};
}

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
  buildSpellbook(item,{g,add,box,ball,mat,materials,metal});
 }else if(cls===9){
  // Scrolls. The name is the true identity, so the look comes only from the shuffled
  // label: a labelled roll with a ribbon and a wax seal tinted by that label, a bare
  // roll for unlabeled paper, and a sealed envelope for stamped mail.
  const look=(item.appearance||'').toLowerCase();
  const seal=mat([0x8c1f24,0x2f4f8a,0x2f6b3a,0x6a2f7a,0xa8741e,0x1f2a2a][[...look].reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,7)%6]);
  if(/stamped/.test(look)){
   const paper=mat(0xe6dcc4),fold=mat(0xb9ad92),stamp=mat(0x3b6fa8);
   add(new RoundedBoxGeometry(.3,.018,.2,2,.004),paper,0,.009);
   // The back flap: two creases meeting at the seal.
   for(const s of [-1,1]){const crease=box(.17,.003,.004,fold,s*.07,.0195,-.03);crease.rotation.y=s*.62;}
   ball(.026,seal,0,.02,.02,[1,.3,1]);
   box(.05,.004,.04,stamp,.11,.0195,-.065);box(.036,.005,.026,paper,.11,.02,-.065);
   g.rotation.y=-.25;
  }else{
   const blank=/unlabeled/.test(look),paper=mat(blank?0xefe8d6:0xd9c79a),edge=mat(blank?0xc9c0aa:0xa8925f);
   const R=.045,L=.32;
   // The roll lies along x, with rolled-up spirals showing at both ends.
   const roll=add(new THREE.CylinderGeometry(R,R,L,20),paper,0,R);roll.rotation.z=Math.PI/2;
   for(const s of [-1,1]){
    const cap=add(new THREE.CircleGeometry(R-.001,20),edge,s*(L/2+.0005),R);cap.rotation.y=s*Math.PI/2;
    for(const r of [.03,.017]){const turn=add(new THREE.TorusGeometry(r,.0025,4,20),paper,s*(L/2+.001),R);turn.rotation.y=Math.PI/2;}
   }
   // The unrolled tongue leaves the bottom of the roll and curls up at its tip.
   const rows=12,cols=8,positions=[],indices=[],W=L-.02,T=.17;
   for(let row=0;row<=rows;row++){
    const t=row/rows,y=.002+.02*Math.max(0,(t-.75)/.25)**2;
    for(let col=0;col<=cols;col++)positions.push((col/cols-.5)*W,y,t*T);
   }
   for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const a=row*(cols+1)+col,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);}
   const sheet=new THREE.BufferGeometry();
   sheet.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
   sheet.setIndex(indices);sheet.computeVertexNormals();paper.side=THREE.DoubleSide;
   add(sheet,paper);
   if(!blank){
    // Faint lines of script on the tongue; no readable lettering at game zoom.
    const ink=mat(0x3a2c22);
    for(let i=0;i<4;i++)box(W*(.72-(i%3)*.12),.0012,.007,ink,-W*(i%2?.04:.08),.0032,.04+i*.028);
    // A ribbon around the middle of the roll, fastened with a wax seal.
    const ribbon=add(new THREE.TorusGeometry(R+.002,.006,6,24),seal,.04,R);ribbon.rotation.y=Math.PI/2;
    ball(.022,seal,.04,R,R+.004,[1,1,.35]);
   }
   g.rotation.y=.35;
  }
  // The ribbon lifts the roll a little; settle whatever is lowest onto the floor.
  g.updateMatrixWorld(true);const low=new THREE.Box3().setFromObject(g).min.y;g.children.forEach(p=>p.position.y-=low);
 }else if(cls===4){
  // Rings. The name is the true identity, so the look comes only from the shuffled
  // appearance: metal and solid bands, set stones, and a few
  // special shapes. The band is built upright in its own group, then laid down.
  const look=(item.appearance||'').toLowerCase(),r=new THREE.Group();g.add(r);
  const METALS={iron:0x6e7478,steel:0xaab4ba,bronze:0x9a6a36,brass:0xc4a049,copper:0xb8683e,silver:0xd4d8dc,gold:0xd9ac3c,
   platinum:0xe2e4e6,mithril:0xc8dce6,shiny:0xcfe8ee,twisted:0x8a9296,wire:0x9aa2a6,ridged:0x7a8084,engagement:0xd9ac3c,wedding:0xd9ac3c};
  const SOLIDS={wooden:0x8a5a32,granite:0x8d8a86,clay:0xa8492e,coral:0xe0775a,ivory:0xe8dfc6,porcelain:0xf2f0ea,ceramic:0xc9b79a,
   plastic:0xe0dcd2,plain:0x9c9890,glass:0xbfe0e6,quartz:0xe6eef0};
  const STONES={opal:0xd8e4ea,obsidian:0x17131c,'black onyx':0x1b1b20,moonstone:0xc8d4e8,'tiger eye':0xa8702a,jade:0x3f9a60,agate:0xb04a3a,
   topaz:0x4ab8c0,sapphire:0x2d58d4,ruby:0xc4202f,diamond:0xf2f8fc,pearl:0xf0ece2,emerald:0x2fb35a,jacinth:0xd8621c,citrine:0xe8c02e,
   amber:0xd0861c,jet:0x101012,chrysoberyl:0xd6cf40};
  const FACETED=/diamond|ruby|sapphire|emerald|topaz|jacinth|citrine|chrysoberyl|engagement/;
  const shine=(color,metalness,roughness,emissive=0)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness,emissive:emissive?color:0,emissiveIntensity:emissive});materials.push(m);return m;};
  const part=(geo,m,x=0,y=0,z=0)=>{const p=new THREE.Mesh(geo,m);p.position.set(x,y,z);p.castShadow=p.receiveShadow=true;r.add(p);return p;};
  const R=.09,T=.017;
  const band=look in SOLIDS?shine(SOLIDS[look],0,/glass|quartz|porcelain/.test(look)?.12:.6):shine(METALS[look]??0xd9ac3c,.9,look==='shiny'?.12:.3,look==='shiny'?.12:0);
  const tube=(fn,radius,m)=>part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({length:240},(_,i)=>fn(i/240*Math.PI*2)),true),240,radius,6,true),m);
  if(look==='twisted'){
   // Two strands wound around each other.
   for(const s of [0,Math.PI])tube(a=>{const f=a*7+s;return new THREE.Vector3((R+.008*Math.cos(f))*Math.cos(a),(R+.008*Math.cos(f))*Math.sin(a),.008*Math.sin(f));},.009,band);
  }else if(look==='wire'){
   // A thin core wrapped in a tight coil of wire.
   part(new THREE.TorusGeometry(R,.007,6,48),band);
   tube(a=>{const f=a*22;return new THREE.Vector3((R+.009*Math.cos(f))*Math.cos(a),(R+.009*Math.cos(f))*Math.sin(a),.009*Math.sin(f));},.0035,band);
  }else{
   const main=part(new THREE.TorusGeometry(R,T,10,48),band);
   if(look==='wedding')main.scale.z=1.5;
   if(look==='ridged')for(let i=0;i<20;i++){
    const a=i/20*Math.PI*2,rib=part(new THREE.TorusGeometry(T+.001,.004,5,14),band,R*Math.cos(a),R*Math.sin(a));
    rib.lookAt(-Math.sin(a)+rib.position.x,Math.cos(a)+rib.position.y,0);
   }
  }
  const stone=STONES[look]??(/engagement|wedding/.test(look)?0xf2f8fc:undefined);
  const set=stone!==undefined;
  if(set){
   const top=R+T,clear=/diamond|engagement|wedding/.test(look);
   const gem=shine(stone,.1,FACETED.test(look)?.08:.25,clear?.05:.18);
   if(look==='wedding'){
    // A small stone set flush into the wide band.
    part(new THREE.SphereGeometry(.011,12,8),gem,0,top-.002).scale.y=.5;
   }else{
    const s=look==='engagement'?.024:.03;
    part(new THREE.CylinderGeometry(s*1.05,s*.9,.016,20),band,0,top+.004);
    if(FACETED.test(look)){
     // A brilliant cut: a flat table over a shallow crown, held by four prongs.
     const lift=look==='engagement'?.02:0;
     part(new THREE.CylinderGeometry(s*.55,s,.016,8),gem,0,top+.02+lift).rotation.y=Math.PI/8;
     part(new THREE.ConeGeometry(s,.02,8),gem,0,top+.002+lift).rotation.set(Math.PI,Math.PI/8,0);
     for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;part(new THREE.CylinderGeometry(.003,.004,.03+lift,6),band,Math.cos(a)*s*.95,top+.015+lift/2,Math.sin(a)*s*.95);}
    }else if(look==='pearl'){
     part(new THREE.SphereGeometry(s*.95,16,12),gem,0,top+.03);
    }else{
     // A domed cabochon in its bezel.
     part(new THREE.SphereGeometry(s*.95,20,10,0,Math.PI*2,0,Math.PI/2),gem,0,top+.012).scale.y=.65;
    }
   }
  }
  // Lay the ring down; a set stone keeps one side propped up a little.
  r.rotation.x=-Math.PI/2+(set&&look!=='wedding'?.3:0);
  g.rotation.y=.5;
  g.updateMatrixWorld(true);const low=new THREE.Box3().setFromObject(g).min.y;g.children.forEach(p=>p.position.y-=low);
 }else if(cls===5){
  // Amulets. The name is the true identity, so the look comes only from the shuffled
  // appearance: a pendant shaped like that word, on a chain coiled loosely beside it.
  // The real Amulet of Yendor and its plastic imitation share one look.
  const look=(item.appearance||'').toLowerCase(),yendor=/yendor/.test(look);
  const shine=(color,metalness,roughness,emissive=0)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness,emissive:emissive?color:0,emissiveIntensity:emissive});materials.push(m);return m;};
  const setting=shine(yendor?0xe0b44a:0xc49a45,.88,.3),chain=shine(0xa8894a,.85,.36);
  const gem=shine(yendor?0xb0183c:[0x2d58d4,0xc4202f,0x2f9e55,0x8c40c4,0x2aa4ac,0xe8c02e][[...look].reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,7)%6],.1,.15,yendor?.45:.15);
  const P=new THREE.Group();P.position.z=.09;g.add(P);
  const put=(geo,m,x=0,y=0,z=0)=>{const p=new THREE.Mesh(geo,m);p.position.set(x,y,z);p.castShadow=p.receiveShadow=true;P.add(p);return p;};
  // Flat pendants are extruded upward from a floor-plan outline.
  const plate=(shape,depth=.012)=>{const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:1,curveSegments:24});geo.rotateX(-Math.PI/2);return geo;};
  const polygon=(n,r,turn=0)=>{const s=new THREE.Shape();for(let i=0;i<n;i++){const a=turn+i/n*Math.PI*2;s[i?'lineTo':'moveTo'](r*Math.sin(a),r*Math.cos(a));}s.closePath();return s;};
  const ellipse=(rx,rz)=>{const s=new THREE.Shape();s.absellipse(0,0,rx,rz,0,Math.PI*2);return s;};
  const lathe=pts=>new THREE.LatheGeometry(pts.map(([x,y])=>new THREE.Vector2(x,y)),32);
  const cabochon=(r,y)=>put(new THREE.SphereGeometry(r,16,8,0,Math.PI*2,0,Math.PI/2),gem,0,y).scale.y=.6;
  const top=.018;
  const PLATES={circular:()=>ellipse(.055,.055),oval:()=>ellipse(.042,.06),elliptic:()=>ellipse(.066,.04),triangular:()=>polygon(3,.066,Math.PI),
   square:()=>polygon(4,.064,Math.PI/4),rectangular:()=>{const s=new THREE.Shape();s.moveTo(-.036,-.058);s.lineTo(.036,-.058);s.lineTo(.036,.058);s.lineTo(-.036,.058);s.closePath();return s;},
   hexagonal:()=>polygon(6,.06),octagonal:()=>polygon(8,.06,Math.PI/8)};
  if(yendor){
   // A domed gold medallion ringed with studs around a large glowing stone.
   put(lathe([[0,0],[.066,0],[.068,.008],[.055,.02],[.03,.026],[0,.027]]),setting);
   for(let i=0;i<10;i++){const a=i/10*Math.PI*2;put(new THREE.SphereGeometry(.007,8,6),setting,Math.cos(a)*.052,.018,Math.sin(a)*.052);}
   put(new THREE.SphereGeometry(.028,20,12),gem,0,.026).scale.y=.7;
  }else if(look==='spherical'){
   // An orb held in a banded cage.
   put(new THREE.SphereGeometry(.034,20,14),gem,0,.034);
   for(const r of [0,Math.PI/2])put(new THREE.TorusGeometry(.035,.004,6,32),setting,0,.034).rotation.y=r;
  }else if(look==='pyramidal'){
   put(new THREE.ConeGeometry(.058,.06,4),setting,0,.03).rotation.y=Math.PI/4;
  }else if(look==='spiked'){
   // A studded boss with spikes all around and one upright.
   put(new THREE.SphereGeometry(.026,16,10),setting,0,.026);
   for(let i=0;i<8;i++){const a=i/8*Math.PI*2,spike=put(new THREE.ConeGeometry(.009,.036,8),setting,Math.cos(a)*.04,.026,Math.sin(a)*.04);spike.rotation.set(0,-a,-Math.PI/2);}
   put(new THREE.ConeGeometry(.009,.03,8),setting,0,.062);
  }else if(look==='concave'){
   // A shallow dish with the stone sunk into its hollow.
   const dish=put(lathe([[0,.004],[.03,.007],[.05,.014],[.058,.017],[.062,.012],[.06,0],[0,0]]),setting);dish.material.side=THREE.DoubleSide;
   cabochon(.016,.004);
  }else if(look==='convex'){
   put(lathe([[0,0],[.06,0],[.062,.006],[.046,.018],[.022,.024],[0,.025]]),setting);
   cabochon(.013,.024);
  }else if(look==='lunate'){
   // A crescent: the outer rim, then back along a smaller offset circle.
   const s=new THREE.Shape();s.absarc(0,0,.062,.983,Math.PI*2-.983,false);s.absarc(.031,0,.052,-1.505,1.505,true);s.closePath();
   put(plate(s),setting).rotation.y=Math.PI/2;
  }else if(look==='warped'){
   // A disc bent like a saddle.
   const geo=plate(ellipse(.056,.056)),pos=geo.attributes.position;
   for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,pos.getY(i)+.14*(x*x-z*z)/.056);}
   geo.computeVertexNormals();put(geo,setting).rotation.y=.4;
  }else{
   put(plate((PLATES[look]??PLATES.circular)()),setting);
   cabochon(.016,top);
  }
  // A bail at the pendant's head, where the chain joins.
  put(new THREE.TorusGeometry(.011,.003,6,16),setting,0,.014,-.066).rotation.y=Math.PI/2;
  // The chain: alternating flat and upright links along a loose loop ending at the bail.
  const loop=new THREE.CatmullRomCurve3(Array.from({length:24},(_,i)=>{const a=i/24*Math.PI*2;
   return new THREE.Vector3(.12*Math.sin(a)*(1+.08*Math.sin(3*a)),0,-.07-.1*Math.cos(a));}),true);
  const N=34;
  for(let i=0;i<N;i++){
   const t=i/N,p=loop.getPointAt(t),d=loop.getTangentAt(t),upright=i%2===1;
   const link=add(new THREE.TorusGeometry(.0085,.0024,4,10),chain,p.x,upright?.011:.0024,p.z);
   link.scale.x=1.45;link.rotation.set(upright?0:Math.PI/2,Math.atan2(-d.z,d.x),0,'YXZ');
  }
  g.rotation.y=-.4;
  g.updateMatrixWorld(true);const low=new THREE.Box3().setFromObject(g).min.y;g.children.forEach(p=>p.position.y-=low);
 }else if(cls===13){
  // Gems, glass, gray stones and rocks. The name is the true identity, so the look comes
  // only from the shuffled appearance and the glyph colour: a ruby and red glass match.
  const look=(item.appearance||'').toLowerCase();
  const chip=(r,m,x,y,z,s,ry)=>{const p=add(new THREE.DodecahedronGeometry(r,0),m,x,y,z);p.scale.set(...s);p.rotation.set(.4,ry,.25);
   p.updateMatrixWorld();p.position.y-=new THREE.Box3().setFromObject(p).min.y;return p;};
  // Lays a stone on the floor at (x,z), turned by ry and tipped slightly, resting on its lowest point.
  const lay=(geo,m,x,z,ry,tilt=0)=>{const p=add(geo,m,x,0,z);p.rotation.set(tilt,ry,tilt*.6);
   p.updateMatrixWorld();p.position.y-=new THREE.Box3().setFromObject(p).min.y;return p;};
  const shadow=(r,x,z,sx,sz,o)=>{const m=new THREE.MeshBasicMaterial({color:0x0e1012,transparent:true,opacity:o,depthWrite:false});materials.push(m);
   const p=add(new THREE.CircleGeometry(r,24),m,x,.0015,z);p.rotation.x=-Math.PI/2;p.scale.set(sx,sz,1);p.castShadow=p.receiveShadow=false;return p;};
  if(!look){
   // Rocks: a small spill of broken rubble with fractured faces, grit and a patch of lichen.
   const rubble=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96,flatShading:true});materials.push(rubble);
   shadow(.15,0,0,1.12,1,.32);
   const pieces=[[.072,-.045,.02,[1.1,.66,.9],.3,.08,8,true],[.052,.075,-.045,[1,.72,.86],1.1,.14,7],
    [.043,.03,.095,[1.05,.62,.8],2,-.1,7],[.03,-.105,-.085,[1,.7,1],.7,.2,6],[.022,.115,.07,[1,.75,.9],2.6,.3,6]];
   pieces.forEach(([r,x,z,s,ry,tilt,cuts,lichen],i)=>
    lay(shapedStone(9173+i*131,{size:r,scale:s,cuts,bump:.05,base:0x6a655d,alt:i%2?0x857c6f:0x5a5b58,lichen}),rubble,x,z,ry,tilt));
   // Grit knocked off the rubble.
   for(let i=0;i<9;i++){const a=i*2.4+.5,d=.075+(i*37%11)/110;
    lay(shapedStone(31+i*17,{size:.006+(i%3)*.003,cuts:4,bump:0,base:0x6f6a62,alt:0x8d8476,detail:1}),rubble,Math.cos(a)*d,Math.sin(a)*d*.9,a,.4);}
  }else if(/gray/.test(look)){
   // Gray stones share one smooth, water-worn pebble with a quartz vein and speckles,
   // so luck, load, touch and flint stay hidden.
   const pebble=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.02});materials.push(pebble);
   shadow(.13,.004,.003,1.3,.95,.36);
   lay(shapedStone(4099,{size:.1,scale:[1.25,.44,.92],bump:.035,base:0x6f7274,alt:0x8a8b88,detail:12,
    vein:{dir:[.9,.15,.45],at:.08,width:.09,color:0xdcd8cc}}),pebble,0,0,.5);
  }else if(/metal/.test(look)){
   // Unrefined mithril: a lumpy silvery nugget.
   const ore=mat(0xc8d0d6,.85);
   chip(.07,ore,0,.045,0,[1.2,.65,.9],.4);chip(.04,ore,.07,.03,.03,[1,.7,1],1.3);chip(.035,ore,-.065,.028,-.03,[1,.7,1],2.2);
  }else{
   // A cut stone lying tipped on its pavilion. The cut comes from the shuffled colour word,
   // which real stones share with their glass, so the look never tells them apart.
   // Without a glyph colour (NO_COLOR) the shared colour word still says how the stone looks.
   const tint=new THREE.Color(GEM_COLORS[item.color]??GEM_COLORS[GEM_WORD_COLOR[look]]??0xd8e4ea);
   const cut=GEM_CUTS[look]??GEM_CUTS.white;
   const geo=facetedGem(cut,hashLook(look));
   const facet=new THREE.MeshPhysicalMaterial({color:tint,vertexColors:true,metalness:0,roughness:.05,flatShading:true,
    clearcoat:1,clearcoatRoughness:.03,specularIntensity:1,ior:1.9,transparent:true,opacity:cut.cab?.97:.8,
    emissive:tint,emissiveIntensity:cut.cab?.08:.16,iridescence:look==='white'?.7:0,iridescenceIOR:1.6});
   // A brighter heart inside the stone, seen through the facets as the light it gathers.
   const heart=new THREE.MeshStandardMaterial({color:tint.clone().lerp(new THREE.Color(0xffffff),.25),roughness:.3,
    emissive:tint,emissiveIntensity:cut.cab?.12:.55,transparent:true,opacity:.7,depthWrite:false});
   const glint=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false});
   materials.push(facet,heart,glint);
   const gem=new THREE.Group();gem.position.set(0,.06,0);gem.rotation.set(cut.cab?0:.62,.35,cut.cab?0:.12);g.add(gem);
   const part=(geo,m)=>{const p=new THREE.Mesh(geo,m);p.castShadow=p.receiveShadow=m!==glint;gem.add(p);return p;};
   part(geo,facet);
   if(!cut.cab){const core=part(geo.clone(),heart);core.scale.setScalar(.55);core.renderOrder=-1;}
   // Four-pointed star glints on the table edge and girdle, lying on the facets.
   const top=cut.crown;
   for(const [x,y,z,s] of cut.cab?[[-.3,.75,-.2,.9],[.35,.45,.3,.5]]:[[cut.table*.7,1,-cut.table*.35,1],[-.95,.08,.35,.7],[.2,.55,.7,.55]]){
    const star=part(GLINT_GEOMETRY(),glint);star.position.set(x*cut.r*(cut.sx??1),y*top,z*cut.r);
    star.rotation.set(-Math.PI/2+(1-y)*.9*Math.sign(z||1),0,.4+x);star.scale.setScalar(s*cut.r*.55);
   }
   // A soft coloured spill of light on the floor beside it.
   const pool=add(new THREE.CircleGeometry(.13,24),new THREE.MeshBasicMaterial({color:tint,transparent:true,opacity:cut.cab?.08:.2,depthWrite:false,blending:THREE.AdditiveBlending}),.04,.002,.035);
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
  // Wands look like their shuffled appearance: wood, metal, stone, glass or a shape (wand.js).
  const wand=createWand(item.appearance,{floor:true});g.add(wand);materials.push(...wand.userData.materials);
 }else if(/boots|shoes/.test(name)){
  buildBoots((item.appearance||'').toLowerCase(),{g,materials});
 }else if(cls===3&&/cloak|\brobe\b|mummy wrapping/.test(name)){
  // No appearance means a robe, mummy wrapping or leather cloak, which shows as itself.
  const own=name.match(/\brobe\b|mummy wrapping|leather cloak/)?.[0]??'';
  buildCloak((item.appearance||own).toLowerCase(),{g,materials});
 }else if(/t-shirt|shirt|towel/.test(name)){
  const towel=/towel/.test(name),fabric=cloth;
  // Sample the silhouette into strips so folds bend the whole cloth surface,
  // rather than adding dark rods on top of a rigid rectangular block.
  const rows=32,cols=24,positions=[],indices=[];
  const width=t=>towel?.21:
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
  const hem=mat(0xd3c4a4);
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
 }else if(cls===3&&/\bgloves\b|\bgauntlets\b/.test(name)){
  buildGloves((item.appearance||'').toLowerCase(),{g,materials});
 }else if(cls===3&&/\bhelm\b|helmet|\bhat\b|\bcap\b|fedora|cornuthaum|dented pot/.test(name)){
  // No appearance means an item without one (fedora, dented pot, tinfoil hat), which shows as itself.
  const own=name.match(/fedora|dented pot|tinfoil hat/)?.[0]??'';
  buildHelmet((item.appearance||own).toLowerCase(),{g,materials});
 }else if(cls===3&&/shield/.test(name)){
  // Shields lie face-up. Each kind is keyed by its appearance where it has one, so an
  // unidentified shield of reflection shows only as a polished silver shield.
  const look=(item.appearance||name).toLowerCase();
  const kind=/blue and green|elven/.test(look)?'elven':/white-handed|uruk/.test(look)?'uruk':/red-eyed|orcish/.test(look)?'orcish':
   /large round|dwarvish/.test(look)?'dwarvish':/polished silver|reflection/.test(look)?'silver':/large/.test(look)?'tower':'small';
  const shine=(color,metalness,roughness,emissive=0)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness,emissive:emissive?color:0,emissiveIntensity:emissive});materials.push(m);return m;};
  const iron=shine(0x6f777a,.8,.42),brass=shine(0xb08a42,.8,.34);
  const face=shine({small:0x7a5634,elven:0x2c5d9a,uruk:0x1c1a1a,orcish:0x5a3a2a,dwarvish:0x6a4a2c,silver:0xdfe7ec,tower:0x6e4d2e}[kind],kind==='silver'?1:0,kind==='silver'?.08:.82);
  const rimMat=kind==='elven'?shine(0x3f8a4a,.55,.4):kind==='silver'?shine(0xc9d3d8,1,.16):iron;
  // Outlines are point lists in floor-plan space (x right, y toward -z), scaled for the rim inset.
  const circle=r=>s=>Array.from({length:48},(_,i)=>{const a=i/48*Math.PI*2;return new THREE.Vector2(Math.cos(a)*r*s,Math.sin(a)*r*s);});
  const kite=s=>{const pts=[];for(let i=0;i<=20;i++){const a=i/20*Math.PI;pts.push(new THREE.Vector2(Math.cos(a)*.16*s,(.1+Math.sin(a)*.12)*s));}for(let i=1;i<20;i++){const t=i/20;pts.push(new THREE.Vector2(-.16*s*(1-t)**1.3,(.1-t*.37)*s));}pts.push(new THREE.Vector2(0,-.27*s));for(let i=19;i>0;i--){const t=i/20;pts.push(new THREE.Vector2(.16*s*(1-t)**1.3,(.1-t*.37)*s));}return pts;};
  const heater=s=>{const pts=[new THREE.Vector2(-.17*s,.2*s),new THREE.Vector2(.17*s,.2*s)];for(let i=1;i<=24;i++){const t=i/24;pts.push(new THREE.Vector2(.17*s*Math.cos(t*Math.PI/2)**.8,(.2-t*.45)*s));}for(let i=23;i>0;i--){const t=i/24;pts.push(new THREE.Vector2(-.17*s*Math.cos(t*Math.PI/2)**.8,(.2-t*.45)*s));}return pts;};
  const tower=s=>{const pts=[],w=.19*s,h=.27*s,r=.05*s;for(const [cx,cy,a0] of [[w-r,h-r,0],[-w+r,h-r,Math.PI/2],[-w+r,-h+r,Math.PI],[w-r,-h+r,Math.PI*1.5]])for(let i=0;i<=6;i++){const a=a0+i/6*Math.PI/2;pts.push(new THREE.Vector2(cx+Math.cos(a)*r,cy+Math.sin(a)*r));}return pts;};
  const outline={small:circle(.17),elven:kite,uruk:heater,orcish:circle(.18),dwarvish:circle(.25),silver:circle(.2),tower}[kind];
  const T=.024,bevel=.004;
  const slab=(shape,depth,m,y=0)=>{const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:24});geo.rotateX(-Math.PI/2);geo.translate(0,bevel+y,0);return add(geo,m);};
  const emblem=(pts,m,y=T+2*bevel)=>{const geo=new THREE.ExtrudeGeometry(new THREE.Shape(pts),{depth:.004,bevelEnabled:false});geo.rotateX(-Math.PI/2);geo.translate(0,y,0);return add(geo,m);};
  slab(new THREE.Shape(outline(1)),T,face);
  const rim=new THREE.Shape(outline(1));rim.holes.push(new THREE.Path(outline(kind==='dwarvish'?.9:.88).reverse()));
  slab(rim,T+.006,rimMat);
  const top=T+2*bevel,rimTop=top+.006;
  const boss=(r,m)=>{const p=add(new THREE.SphereGeometry(r,20,10,0,Math.PI*2,0,Math.PI/2),m,0,top);p.scale.y=.55;return p;};
  const rivets=(n,r,m,rad=.009)=>{for(let i=0;i<n;i++){const a=i/n*Math.PI*2;add(new THREE.SphereGeometry(rad,8,4,0,Math.PI*2,0,Math.PI/2),m,Math.cos(a)*r,rimTop,-Math.sin(a)*r);}};
  if(kind==='small'){
   // Planked wood under an iron rim, with a riveted boss.
   const seam=shine(0x3e2a18,0,.95);
   for(const x of [-.09,-.03,.03,.09])box(.005,.002,2*Math.sqrt(.15**2-x*x),seam,x,top+.001);
   boss(.05,iron);rivets(10,.16,iron,.007);
  }else if(kind==='elven'){
   // A blue kite shield with a green leaf and fine gold veins.
   const leaf=shine(0x4f9a4a,.1,.55);
   const L=[];for(let i=0;i<=16;i++){const t=i/16;L.push(new THREE.Vector2(Math.sin(t*Math.PI)*.055,.13-t*.3));}for(let i=15;i>0;i--){const t=i/16;L.push(new THREE.Vector2(-Math.sin(t*Math.PI)*.055,.13-t*.3));}
   emblem(L,leaf);
   box(.004,.003,.28,brass,0,top+.005,.02);
   for(const s of [-1,1])for(const z of [-.05,0,.05]){const v=box(.003,.003,.06,brass,s*.02,top+.005,z+.015);v.rotation.y=s*.7;}
  }else if(kind==='uruk'){
   // Black heater shield bearing the White Hand.
   const white=shine(0xe8e4da,0,.7);
   const palm=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2;palm.push(new THREE.Vector2(Math.cos(a)*.048,-.02+Math.sin(a)*.055));}
   emblem(palm,white);
   for(const [x,len,a] of [[-.036,.06,.12],[-.012,.072,.03],[.012,.074,-.03],[.036,.062,-.12]]){const f=box(.019,.004,len,white,x+Math.sin(a)*.03,top+.002,-(.03+len/2));f.rotation.y=a;}
   const thumb=box(.018,.004,.055,white,-.07,top+.002,-.01);thumb.rotation.y=-.9;
   for(const x of [-.14,0,.14])add(new THREE.SphereGeometry(.008,8,4,0,Math.PI*2,0,Math.PI/2),iron,x,rimTop,-.185);
  }else if(kind==='orcish'){
   // Crude hide-covered round shield with a staring red eye.
   const eyeWhite=shine(0xd8c27a,0,.6),iris=shine(0xc0181c,0,.4,.6),pupil=shine(0x0c0a0a,0,.5);
   const almond=[];for(let i=0;i<=16;i++){const t=i/16*Math.PI;almond.push(new THREE.Vector2(Math.cos(t)*-.1,Math.sin(t)*.045));}for(let i=15;i>0;i--){const t=i/16*Math.PI;almond.push(new THREE.Vector2(Math.cos(t)*.1,-Math.sin(t)*.045));}
   emblem(almond,eyeWhite);
   add(new THREE.CylinderGeometry(.036,.036,.004,20),iris,0,top+.006);
   const slit=add(new THREE.CylinderGeometry(.01,.01,.004,12),pupil,0,top+.009);slit.scale.z=2.8;
   // Jagged claw marks and uneven iron studs.
   const scratch=shine(0x2a1a12,0,1);for(const [x,z,a] of [[.1,.07,.5],[.115,.09,.5],[.13,.11,.5]]){const c=box(.004,.002,.07,scratch,x,top+.001,z);c.rotation.y=a;}
   rivets(7,.165,iron,.011);
  }else if(kind==='dwarvish'){
   // Large round shield with a cross of iron bands, rivets and a heavy boss.
   for(const a of [0,Math.PI/2]){const b=box(.46,.006,.038,iron,0,top+.003);b.rotation.y=a;}
   for(const a of [Math.PI/4,3*Math.PI/4,5*Math.PI/4,7*Math.PI/4])add(new THREE.SphereGeometry(.009,8,4,0,Math.PI*2,0,Math.PI/2),brass,Math.cos(a)*.13,top,-Math.sin(a)*.13);
   add(new THREE.TorusGeometry(.075,.009,6,32),brass,0,top+.004).rotation.x=Math.PI/2;
   boss(.065,iron);rivets(16,.237,brass,.008);
  }else if(kind==='silver'){
   // Mirror-bright round shield with an engraved ring and a small domed boss.
   const engraving=shine(0x8a969c,1,.3);
   for(const r of [.12,.15])add(new THREE.TorusGeometry(r,.003,4,48),engraving,0,top).rotation.x=Math.PI/2;
   boss(.04,rimMat);
  }else{
   // Large rectangular shield: planks with iron bands and a central boss.
   const seam=shine(0x3e2a18,0,.95);
   for(const x of [-.1,-.035,.035,.1])box(.005,.002,.5,seam,x,top+.001);
   for(const z of [-.17,.17]){box(.34,.006,.034,iron,0,top+.003,z);for(const x of [-.13,-.045,.045,.13])add(new THREE.SphereGeometry(.008,8,4,0,Math.PI*2,0,Math.PI/2),iron,x,top+.006,z);}
   boss(.055,iron);
  }
  g.rotation.y=-.35;
 }else if(cls===3&&/\bapron\b/.test(item.appearance||name)||/alchemy smock/.test(name)){
  // "apron" is the alchemy smock's own appearance: a linen apron dropped flat, bib away
  // from the viewer, with a neck strap, waist ties, a patch pocket and potion stains.
  const smooth=(a,b,t)=>{const x=Math.min(1,Math.max(0,(t-a)/(b-a)));return x*x*(3-2*x);};
  const L=.42,zAt=v=>L/2-v*L,WAIST=.58;
  // Half-width up the apron: a broad skirt, a curved underarm cut, then a narrow bib.
  const half=v=>v<WAIST?.195-.025*v/WAIST:v<.72?.086+.084*(1-(v-WAIST)/.14)**2:.086-.006*(v-.72)/.28;
  // Soft lengthwise folds that deepen toward the hem, a light crumple, and a raised waistband.
  const lift=(x,z)=>{
   const v=(L/2-z)/L,skirt=1-smooth(.1,WAIST,v);
   return .004+.013*skirt*(.5+.5*Math.cos(x*48+Math.sin(z*17)*.9))+.0025*Math.sin(x*61+z*37)*Math.sin(z*29-x*13)
    +.0022*Math.exp(-(((v-WAIST)/.018)**2))+.006*smooth(.16,.2,Math.abs(x))*skirt;
  };
  const linen=new THREE.Color(0xd8caa6),hemTone=new THREE.Color(0xa99972),c=new THREE.Color();
  // Stains: [x, z, radius, colour, strength]. A green splash, a violet drip, a scorch and old grime.
  const STAINS=[[-.08,.1,.035,0x6f8f3c,.75],[-.055,.135,.015,0x6f8f3c,.6],[.1,-.02,.028,0x7b4d8f,.65],[.115,.03,.012,0x7b4d8f,.5],
   [-.12,-.06,.026,0x3b2a1c,.8],[.05,.17,.05,0x8a7a55,.35]].map(([x,z,r,col,s])=>[x,z,r,new THREE.Color(col),s]);
  const shade=(x,z,v,u)=>{
   c.copy(linen).multiplyScalar(.93+.07*Math.sin(x*420)*Math.sin(z*390)+.04*Math.sin(x*48+Math.sin(z*17)*.9));
   c.lerp(hemTone,.55*smooth(.8,1,Math.abs(u))+.5*smooth(.97,1,v)+.4*Math.exp(-(((v-WAIST)/.02)**2)));
   for(const [sx,sz,r,col,s] of STAINS){
    const a=Math.atan2(z-sz,x-sx),rr=r*(1+.28*Math.sin(a*5+sx*40)),d=Math.hypot(x-sx,z-sz)/rr;
    // Dried stains are darker at the rim, where the liquid pooled as it dried.
    if(d<1.2)c.lerp(col,s*(1-smooth(.75,1.2,d))*(.8+.2*smooth(.5,.95,d)));
   }
   return c;
  };
  // The cloth: a grid mapped onto the outline, displaced by the folds, double-sided.
  const N=48,M=24,positions=[],colors=[],indices=[],edge=[];
  for(let i=0;i<=N;i++){
   const v=i/N,z=zAt(v),w=half(v);
   for(let j=0;j<=M;j++){
    const u=j/M*2-1,x=u*w;
    positions.push(x,lift(x,z),z);colors.push(...shade(x,z,v,u).toArray());
   }
  }
  for(let i=0;i<N;i++)for(let j=0;j<M;j++){const a=i*(M+1)+j,b=a+M+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const sheet=new THREE.BufferGeometry();
  sheet.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  sheet.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  sheet.setIndex(indices);sheet.computeVertexNormals();
  const linenMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.96,side:THREE.DoubleSide});materials.push(linenMat);
  add(sheet,linenMat);
  // A rolled hem round the whole outline, following the folds.
  const P=(x,z,up=.0015)=>new THREE.Vector3(x,lift(x,z)+up,z);
  for(let i=0;i<=N;i++)edge.push(P(-half(i/N),zAt(i/N)));
  for(let j=1;j<M;j++){const u=j/M*2-1;edge.push(P(u*half(1),zAt(1)));}
  for(let i=N;i>=0;i--)edge.push(P(half(i/N),zAt(i/N)));
  for(let j=M-1;j>0;j--){const u=j/M*2-1;edge.push(P(u*half(0),zAt(0)));}
  const hem=mat(0xb7a67f);
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge,true),260,.0028,5,true),hem);
  // Straps are flat tape ribbons lying on the floor, with a small twist and frayed tips.
  const tape=mat(0xc3b28a);tape.side=THREE.DoubleSide;
  const strap=(pts,wide=.013,fray=true)=>{
   const path=new THREE.CatmullRomCurve3(pts),S=Math.max(24,pts.length*10),pos=[],idx=[];
   for(let i=0;i<=S;i++){
    const t=i/S,p=path.getPoint(t),d=path.getTangent(t),tw=.35*Math.sin(t*9),nx=-d.z,nz=d.x;
    for(const s of [-1,1])pos.push(p.x+nx*s*wide*Math.cos(tw),p.y+s*wide*Math.sin(tw)*.5+wide*.5*Math.abs(Math.sin(tw)),p.z+nz*s*wide*Math.cos(tw));
    if(i<S)idx.push(i*2,i*2+2,i*2+1,i*2+1,i*2+2,i*2+3);
   }
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
   add(geo,tape);
   if(!fray)return;
   const p=path.getPoint(1),d=path.getTangent(1);
   for(let k=0;k<5;k++){
    const off=(k-2)*wide*.4,x=p.x-d.z*off,z=p.z+d.x*off,len=.01+.005*((k*7)%3);
    const f=add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(x,p.y,z),new THREE.Vector3(x+d.x*len+.002*(k-2),.002,z+d.z*len)]),4,.001,3,false),hem);
    f.castShadow=false;
   }
  };
  const V=(x,z,y=.0055)=>new THREE.Vector3(x,y,z);
  // Neck strap: a loop from the bib's top corners, lying flat past the bib, with a brass slider.
  const top=zAt(1),bw=half(1)-.012;
  strap([V(-bw,top+.004,lift(-bw,top)+.004),V(-bw-.012,top-.035),V(-.085,top-.075),V(-.03,top-.098),V(.03,top-.1),V(.08,top-.08),V(bw+.014,top-.04),V(bw,top+.004,lift(bw,top)+.004)],.011,false);
  const brass=mat(0xb28a45,.7),slider=add(new THREE.TorusGeometry(.012,.0028,6,4),brass,-bw-.01,.009,top-.04);
  slider.rotation.set(-Math.PI/2,0,Math.PI/4);slider.scale.set(1.6,.8,1);
  // Waist ties: sewn on at the waist, one trailing out in a lazy S, the other doubled back.
  const wz=zAt(WAIST),ww=half(WAIST)-.006;
  strap([V(-ww,wz,lift(-ww,wz)+.004),V(-ww-.04,wz+.004),V(-ww-.08,wz+.03),V(-ww-.095,wz+.085),V(-ww-.07,wz+.14),V(-ww-.085,wz+.19)]);
  strap([V(ww,wz,lift(ww,wz)+.004),V(ww+.05,wz-.006),V(ww+.1,wz+.012),V(ww+.12,wz+.05),V(ww+.08,wz+.075),V(ww+.03,wz+.1,.0095),V(ww+.02,wz+.14,.0095)]);
  // Box stitches where the ties and neck strap are sewn on.
  const thread=mat(0x8a7a58);
  for(const [x,z] of [[-ww,wz],[ww,wz],[-bw,top+.004],[bw,top+.004]]){const y=lift(x,z)+.007;box(.018,.0015,.0015,thread,x,y,z-.006);box(.018,.0015,.0015,thread,x,y,z+.006);}
  // A patch pocket on the skirt: its own small sheet over the folds, open along the top,
  // stitched on three sides, with a corked vial leaning out.
  const PX=.035,PW=.07,PZ0=zAt(.4),PZ1=zAt(.18),pk=[],pc=[],pi=[],PN=12;
  for(let i=0;i<=PN;i++)for(let j=0;j<=PN;j++){
   const x=PX-PW+2*PW*j/PN,z=PZ0+(PZ1-PZ0)*i/PN,open=1-i/PN;
   pk.push(x,lift(x,z)+.0035+.005*open*(1-((j/PN)*2-1)**2),z);pc.push(...shade(x,z,(L/2-z)/L,0).multiplyScalar(.92).toArray());
  }
  for(let i=0;i<PN;i++)for(let j=0;j<PN;j++){const a=i*(PN+1)+j,b=a+PN+1;pi.push(a,a+1,b,a+1,b+1,b);}
  const pocket=new THREE.BufferGeometry();
  pocket.setAttribute('position',new THREE.Float32BufferAttribute(pk,3));pocket.setAttribute('color',new THREE.Float32BufferAttribute(pc,3));
  pocket.setIndex(pi);pocket.computeVertexNormals();add(pocket,linenMat);
  // The pocket mouth is hemmed; stitches run down the sides and along the bottom.
  const mouth=[];for(let j=0;j<=PN;j++){const x=PX-PW+2*PW*j/PN;mouth.push(P(x,PZ0,.0035+.005*(1-((j/PN)*2-1)**2)+.0015));}
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mouth),24,.0026,5,false),hem);
  for(let k=0;k<9;k++){
   const z=PZ0+.008+(PZ1-PZ0-.012)*k/8;
   for(const x of [PX-PW+.004,PX+PW-.004]){box(.0015,.0015,.007,thread,x,lift(x,z)+.005,z);}
  }
  for(let k=0;k<11;k++){const x=PX-PW+.008+(2*PW-.016)*k/10;box(.007,.0015,.0015,thread,x,lift(x,PZ1-.004)+.005,PZ1-.004);}
  const glass=new THREE.MeshStandardMaterial({color:0x7fd0a0,roughness:.12,metalness:.1,transparent:true,opacity:.6,emissive:0x1f5a3a,emissiveIntensity:.35});materials.push(glass);
  const vial=add(new THREE.CylinderGeometry(.011,.011,.07,12),glass,PX+.02,lift(PX+.02,PZ0)+.021,PZ0+.004);
  vial.rotation.set(-1.25,0,-.25);
  const neck=new THREE.Vector3(0,.035,0).applyEuler(vial.rotation).add(vial.position);
  const cork=add(new THREE.CylinderGeometry(.0075,.0065,.014,10),mat(0x8a6038),neck.x,neck.y,neck.z);cork.rotation.copy(vial.rotation);
  g.rotation.y=.22;
 }else if(cls===3&&/\bmail\b|mithril|\barmor\b|leather jacket|\bscales\b/.test(name)){
  buildBodyArmor((item.appearance||name).toLowerCase(),item.color,{g,materials});
 }else if(/\bbag\b|sack/.test(name)){
  // Sacks, oilskin sacks and bags of holding and tricks all look like "bag" until identified, so they share one model.
  const smooth=(e0,e1,v)=>{const t=Math.min(1,Math.max(0,(v-e0)/(e1-e0)));return t*t*(3-2*t);};
  const wrap=d=>Math.atan2(Math.sin(d),Math.cos(d));
  // Profile: a flat base, a bulging belly, a neck cinched at y≈.305, then a gathered frill.
  const profile=new THREE.SplineCurve([[0,0],[.1,0],[.165,.012],[.2,.05],[.214,.11],[.205,.175],[.172,.235],[.115,.282],[.058,.303],[.05,.315],[.066,.332],[.09,.356],[.102,.376],[.097,.388]].map(([r,y])=>new THREE.Vector2(r,y))).getPoints(44).map(p=>p.setY(Math.max(0,p.y)));
  const rAt=y=>{let r=0;for(let i=1;i<profile.length;i++){const p=profile[i-1],q=profile[i];if((y-p.y)*(y-q.y)<=0&&q.y!==p.y)r=Math.max(r,p.x+(q.x-p.x)*(y-p.y)/(q.y-p.y));}return r;};
  // Contents press out as lumps; the neck gathers into pleats; the full belly slumps oval and the neck flops sideways.
  const LUMPS=[[1.1,.19,.028],[-.95,.13,.03],[2.75,.17,.024],[-2.5,.09,.022],[.4,.07,.014]];
  const lumps=(a,y)=>LUMPS.reduce((s,[a0,y0,c])=>s+c*Math.exp(-((wrap(a-a0)/.5)**2)-((y-y0)/.06)**2),0);
  const pleatAmp=y=>.011*smooth(.12,.3,y)*(1-smooth(.3,.315,y))+.007*smooth(.315,.36,y);
  const wave=a=>Math.sin(a*14+1.3*Math.sin(a*3));
  const oval=(a,y)=>1+.06*Math.cos(2*a)*(1-smooth(.2,.3,y));
  const lean=y=>.03*smooth(.2,.39,y);
  const surf=(a,y,off=0,w=1)=>{const r=rAt(y)*oval(a,y)+pleatAmp(y)*w+lumps(a,y)+off;return new THREE.Vector3(Math.sin(a)*r+lean(y),y,Math.cos(a)*r);};
  const body=new THREE.LatheGeometry(profile,48);
  const pos=body.attributes.position,colors=new Float32Array(pos.count*3),base=new THREE.Color(0x9a8158),grime=new THREE.Color(0x4e3f2c),c=new THREE.Color();
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),r=Math.hypot(x,z),a=Math.atan2(x,z),w=wave(a),amp=pleatAmp(y);
   if(r>1e-6){const nr=r*oval(a,y)+amp*w+lumps(a,y);pos.setXYZ(i,Math.sin(a)*nr+lean(y),y>.37?y+.006*w:y,Math.cos(a)*nr);}
   c.copy(base).multiplyScalar(1+.3*w*Math.min(1,amp/.011)+2.5*lumps(a,y)).lerp(grime,.55*(1-smooth(0,.06,y)));
   colors.set([c.r,c.g,c.b],i*3);
  }
  body.setAttribute('color',new THREE.BufferAttribute(colors,3));body.computeVertexNormals();
  const canvas=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.95,side:THREE.DoubleSide});materials.push(canvas);
  add(body,canvas);
  // Darkness inside the mouth, so the neck doesn't read as hollow to the floor.
  add(new THREE.CircleGeometry(.056,20),mat(0x1a120c),lean(.31),.31,0).rotation.x=-Math.PI/2;
  // Drawstring: a cord riding the pleat crests round the neck, tied in a bow at the front with two ends trailing to the floor.
  const cord=mat(0x4a3120),tube=(pts,closed=false,r=.0065)=>{
   const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,closed,closed?'catmullrom':'centripetal'),closed?64:40,r,6,closed);
   // Where a trailing end lies on the floor its underside flattens against it.
   const p=geo.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)<0)p.setY(i,0);
   return add(geo,cord);
  };
  tube(Array.from({length:32},(_,i)=>surf(i/32*Math.PI*2,.304+.003*Math.sin(i*1.7),.006)),true);
  const knot=surf(0,.3,.016);
  ball(.016,cord,knot.x,knot.y,knot.z,[1.2,.9,.9]);
  for(const s of [-1,1]){
   const loop=add(new THREE.TorusGeometry(.021,.0055,6,18),cord,knot.x+s*.024,knot.y+.006,knot.z+.004);loop.rotation.set(-.3,0,s*.5);loop.scale.set(1,.7,1);
   const pts=[knot.clone()];
   for(const [i,y] of [.27,.21,.15,.095].entries())pts.push(surf(s*(.1+i*.08),y,.013));
   const a=s*.42,far=rAt(.03)*oval(a,.03)+.035;
   pts.push(new THREE.Vector3(Math.sin(a)*(far-.012),.03,Math.cos(a)*(far-.012)),new THREE.Vector3(Math.sin(a)*(far+.015),.0068,Math.cos(a)*(far+.015)),new THREE.Vector3(Math.sin(a)*far+s*.05,.0065,Math.cos(a)*far+.07));
   tube(pts);
   // A whipped knot at each tip.
   const tip=pts.at(-1);ball(.0095,cord,tip.x,.0095,tip.z,[1,1,1.3]);
  }
  // A sewn-on leather patch with stitches round it, and a stitched side seam.
  const patchAt=(a,y,w,h,m)=>{const p=surf(a,y,.002,0);const q=box(w,h,.004,m,p.x,p.y,p.z);q.rotation.set(-.35*smooth(.12,.22,y)+.25*(1-smooth(.04,.12,y)),a,0,'YXZ');return q;};
  const patchMat=mat(0x6a452a),thread=mat(0xd8cba8);
  patchAt(2.15,.12,.075,.065,patchMat);
  for(const [dx,dy] of [[-.04,0],[.04,0],[0,-.037],[0,.037],[-.02,-.037],[.02,.037],[-.02,.037],[.02,-.037]]){
   const st=patchAt(2.15+dx/.21,.12+dy,dy?.01:.003,dy?.003:.01,thread);st.position.addScaledVector(new THREE.Vector3(Math.sin(2.15),0,Math.cos(2.15)),.002);
  }
  for(let y=.035;y<.28;y+=.024)patchAt(-1.75,y,.003,.012,thread);
 }else if(/ration/.test(name)){
  if(/tripe/.test(name)){const meat=mat(0xa26457);for(let i=0;i<4;i++)ball(.1,meat,(i-1.5)*.075,.065,Math.sin(i)*.035,[.7,.5,1.3]);}
  else if(/\b(cram|k-ration|c-ration)/.test(name))buildRation(/cram/.test(name)?'cram':/k-ration/.test(name)?'k':'c',{g,materials});
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
  if(kind==='apple'||kind==='orange'||kind==='pear'||kind==='melon'||kind==='banana'||kind==='carrot'){
   buildFruit(kind,Number(/^\s*(\d+)/.exec(name)?.[1]??1),{g,materials});
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
  }else if(kind.startsWith('eucalyptus')){
   // Leathery, waxy blue-green leaves (DoubleSide: the cupped blade is a single sheet).
   const {blade,stalk}=eucalyptusLeafGeometry((parseInt(name)||1)>1?2:1);
   const waxy=new THREE.MeshStandardMaterial({color:0x6f9483,roughness:.55,side:THREE.DoubleSide});materials.push(waxy);
   add(blade,waxy);add(stalk,mat(0x9a5a44));
   g.rotation.y=.35;
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
  // One merged mesh, lifted out of its own group so it sits among g's children like any other part.
  const [horn]=createUnicornHorn().children;g.add(horn);materials.push(horn.material);
 }else if(/candelabrum/.test(name)){
  // Merged gold, wax and (when lit) flame meshes, moved into g like the unicorn horn.
  for(const part of [...createCandelabrum(candelabrumState(item.name)).children]){g.add(part);materials.push(part.material);}
 }else if(/marker/.test(name)){
  // One merged mesh: the pen with its cap pulled off beside it; a dry nib at 0 charges.
  const [pen]=createMagicMarker({dry:markerCharges(item.name)===0}).children;g.add(pen);materials.push(pen.material);
 }else if(cls===15||/heavy iron ball/.test(name)){
  // One merged mesh: the pitted ball with its shackle and a stub of chain trailing off.
  const [ball]=createIronBall().children;g.add(ball);materials.push(ball.material);
 }else if(cls===16||/\biron chain\b/.test(name)){
  // One merged mesh: a loose length of interlocking links in a lazy S.
  const [chain]=createIronChain().children;g.add(chain);materials.push(chain.material);
 }else if(cls===17||/\bvenom\b|freezing ice|splash of ice/.test(name)){
  // One merged mesh: a glossy splash with a streak and spray; acid scorches and fizzes, ice freezes into shards.
  const [splash]=createVenom(name).children;g.add(splash);materials.push(splash.material);
 }else if(cls===6&&/blindfold/.test(name)){
  // A dark silk blindfold dropped with its knot still tied: a padded, pleated eye band
  // looping round to a knot, with two ties trailing out and fraying at the tips.
  const silk=mat(0x1d2027),hem=mat(0x3b404b),thread=mat(0x8d929c);
  silk.roughness=.5;silk.side=THREE.DoubleSide;
  const v=(x,y,z)=>new THREE.Vector3(x,y,z);
  const path=new THREE.CatmullRomCurve3([v(.25,0,.12),v(.17,0,.06),v(.1,0,0),v(.03,0,-.07),v(-.09,0,-.115),v(-.2,0,-.01),
   v(-.11,0,.1),v(.02,0,.075),v(.1,0,0),v(.18,0,-.045),v(.255,0,-.125)]);
  const N=120,M=8,positions=[],indices=[],left=[],right=[];
  const smooth=(a,b,t)=>{const x=Math.min(1,Math.max(0,(t-a)/(b-a)));return x*x*(3-2*x);};
  // The pad runs over the far side of the loop; the ties are narrow.
  const pad=t=>smooth(.26,.36,t)*(1-smooth(.64,.74,t));
  for(let i=0;i<=N;i++){
   const t=i/N,p=path.getPoint(t),d=path.getTangent(t),nx=-d.z,nz=d.x,k=pad(t),w=.012+.028*k;
   // The second pass lies over the first where the band crosses at the knot.
   const lift=.004+.009*Math.exp(-(((t-.8)/.06)**2))+.004*Math.exp(-(((t-.2)/.06)**2));
   for(let j=0;j<=M;j++){
    const u=j/M*2-1;
    // Padding bulges the middle, and two pleats run along the eye band.
    const y=lift+k*(.007*(1-u*u)+.0025*Math.cos(u*Math.PI*2))+.0012*Math.sin(t*70);
    positions.push(p.x+nx*u*w,y,p.z+nz*u*w);
   }
   left.push(v(p.x-nx*w,lift+.0015,p.z-nz*w));right.push(v(p.x+nx*w,lift+.0015,p.z+nz*w));
  }
  for(let i=0;i<N;i++)for(let j=0;j<M;j++){const a=i*(M+1)+j,b=a+M+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const band=new THREE.BufferGeometry();
  band.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  band.setIndex(indices);band.computeVertexNormals();add(band,silk);
  // Rolled hems down both edges give the thin band some body.
  for(const edge of [left,right])add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge),160,.0028,5,false),hem);
  // Seams where the ties are sewn to the pad, and a line of stitching round the pad.
  for(const t of [.3,.7]){
   const p=path.getPoint(t),d=path.getTangent(t),w=.012+.028*pad(t),a=Math.atan2(d.x,d.z);
   const seam=box(2*w,.003,.004,thread,p.x,.014,p.z);seam.rotation.y=a+Math.PI/2;
  }
  for(let i=0;i<22;i++){
   const t=.34+i/21*.32,p=path.getPoint(t),d=path.getTangent(t),w=.03,k=pad(t);
   for(const s of [-1,1]){
    const stitch=box(.002,.002,.007,thread,p.x-d.z*s*w,.004+.0105*k,p.z+d.x*s*w);stitch.rotation.y=Math.atan2(d.x,d.z);
   }
  }
  // The knot where the ties cross, with a small loop tucked through it.
  ball(.019,silk,.1,.017,0,[1.25,.7,1]);
  const loop=add(new THREE.TorusGeometry(.013,.0055,6,14),hem,.093,.02,.012);loop.rotation.set(Math.PI/2-.4,0,.5);
  // Frayed threads at both tie tips.
  for(const [t,s] of [[0,-1],[1,1]]){
   const p=path.getPoint(t),d=path.getTangent(t).multiplyScalar(s);
   for(let i=0;i<5;i++){
    const off=(i-2)*.0045,x=p.x-d.z*off,z=p.z+d.x*off,len=.012+.006*((i*7)%3);
    const f=add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v(x,.004,z),v(x+d.x*len*.6+.002*(i-2),.003,z+d.z*len*.6),v(x+d.x*len-.003*(i%2),.0015,z+d.z*len)]),6,.0011,3,false),hem);
    f.castShadow=false;
   }
  }
  g.rotation.y=.3;
 }else if(cls===6&&/\bfigurine\b/.test(name)){
  buildFigurine({g,materials});
 }else if(cls===6&&TOOL_KIND.test(name)){
  // Common tools, keyed by the word they share with their unidentified twin.
  const kind=name.match(TOOL_KIND)[1];
  const lie=(r0,r1,len,m,x,y,z,ry=0,seg=12)=>{const p=add(new THREE.CylinderGeometry(r0,r1,len,seg),m,x,y,z);p.rotation.set(0,ry,Math.PI/2);return p;};
  const flat=(geo,m,x,y,z)=>{const p=add(geo,m,x,y,z);p.rotation.x=Math.PI/2;return p;};
  // A tube that widens along a curve, built from short tapered segments.
  const taper=(curve,r0,r1,m,n=10)=>{for(let i=0;i<n;i++){
   const a=curve.getPoint(i/n),b=curve.getPoint((i+1)/n),d=b.clone().sub(a),r=t=>r0+(r1-r0)*t;
   const p=add(new THREE.CylinderGeometry(r((i+1)/n),r(i/n),d.length()*1.04,14),m,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);
   p.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
  }};
  const v=(x,y,z)=>new THREE.Vector3(x,y,z);
  const wood=mat(0x7a5232),dark=mat(0x221d18),brass=mat(0xc9a24a,.7);
  if(kind==='whistle'){
   buildWhistle({g,materials});
  }else if(kind==='mirror'){
   // A looking glass lying face up: an oval silvered glass in a moulded, beaded silver frame
   // with a crest, and a turned wooden handle between brass ferrules.
   const frame=new THREE.MeshStandardMaterial({color:0xc8ccd0,metalness:.85,roughness:.3});
   const tarnish=new THREE.MeshStandardMaterial({color:0x7c7870,metalness:.7,roughness:.55});
   // No environment map, so the reflection is painted: a cool sky wash with two bright streaks.
   const glass=new THREE.MeshStandardMaterial({vertexColors:true,metalness:.15,roughness:.06,emissive:0x6f8494,emissiveIntensity:.25});
   const ebony=mat(0x3a2418);materials.push(frame,tarnish,glass);
   const R=.09,oval=1.18,cx=-.075;
   const lathe=(pts,m,x,y,seg=40)=>{const p=add(new THREE.LatheGeometry(pts.map(([a,b])=>new THREE.Vector2(a,b)),seg),m,x,y);p.scale.x=oval;return p;};
   // Frame profile (radius, height): a flat back, a rounded outer lip, a cove and an inner bezel.
   lathe([[0,0],[R+.024,0],[R+.032,.006],[R+.034,.014],[R+.029,.022],[R+.02,.024],[R+.012,.019],[R+.006,.021],[R+.002,.026],[R,.024],[R,.02],[0,.02]],frame,cx,0,48);
   const face=new THREE.RingGeometry(0,R,48,8);face.rotateX(-Math.PI/2);
   const pos=face.attributes.position,colors=[],c=new THREE.Color(),sky=new THREE.Color(0x9fb4c4),deep=new THREE.Color(0x4f6272),hi=new THREE.Color(0xf4f8fb);
   for(let i=0;i<pos.count;i++){
    const x=pos.getX(i)/R,z=pos.getZ(i)/R,u=x*.6+z*.8;
    c.copy(deep).lerp(sky,Math.min(1,Math.max(0,.55-u*.45)));
    const streak=Math.max(Math.exp(-(((u+.18)/.13)**2)),.7*Math.exp(-(((u-.3)/.06)**2)));
    c.lerp(hi,streak*.85);colors.push(c.r,c.g,c.b);
   }
   face.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
   add(face,glass,cx,.0215).scale.x=oval;
   // A ring of beads on the lip and a small shell crest opposite the handle.
   for(let i=0;i<30;i++){const a=i/30*Math.PI*2;ball(.0045,frame,cx+Math.cos(a)*(R+.017)*oval,.0235,Math.sin(a)*(R+.017));}
   const crest=cx-(R+.03)*oval;
   ball(.02,frame,crest,.012,0,[.7,.55,1]);
   for(const s of [-1,1]){ball(.011,frame,crest+.004,.01,s*.022,[1,.6,1]);ball(.006,frame,crest-.012,.011,s*.012);}
   ball(.008,tarnish,crest-.016,.016,0);
   // Neck: a flared collar where the handle joins the frame.
   const joint=cx+(R+.026)*oval;
   lie(.02,.016,.034,frame,joint+.012,.02,0,0,20);box(.02,.02,.05,frame,joint-.002,.012);
   // Turned handle, profile along +x: ferrule, baluster, rings, grip, ferrule and a finial knob.
   const turned=[[0,0],[.019,0],[.019,.012],[.014,.016],[.013,.03],[.018,.038],[.018,.044],[.013,.05],[.015,.065],[.017,.1],[.015,.13],[.013,.14],[.018,.146],[.018,.156],[.012,.162],[.009,.17],[0,.172]];
   const handle=add(new THREE.LatheGeometry(turned.map(([a,b])=>new THREE.Vector2(a,b)),20),ebony,joint+.028,.02);handle.rotation.z=-Math.PI/2;
   for(const [x,r] of [[.004,.02],[.041,.019],[.147,.019]])lie(r,r,.009,brass,joint+.028+x,.02,0,0,20);
   ball(.013,brass,joint+.028+.176,.02,0);
   // Drop onto the floor and centre on the tile.
   g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(g),mid=(b.min.x+b.max.x)/2;g.children.forEach(p=>{p.position.y-=b.min.y;p.position.x-=mid;});
  }else if(kind==='crystal ball'){
   buildCrystalBall({g,materials});
  }else if(kind==='horn'){
   buildHorn({g,materials});
  }else if(kind==='bugle'){
   buildBugle({g,materials});
  }else if(kind==='flute'){
   buildFlute({g,materials});
  }else if(kind==='harp'){
   buildHarp({g,materials});
  }else if(kind==='drum'){
   buildDrum({g,materials});
  }else if(kind==='bell'){
   buildBell(/silver|opening/.test(name),{g,materials});
  }else if(kind==='stethoscope'){
   buildStethoscope({g,materials});
  }else if(kind==='tin opener'){
   buildTinOpener({g,materials});
  }else if(kind==='leash'){
   buildLeash({g,materials});
  }else if(kind==='saddle'){
   buildSaddle({g,materials});
  }else if(kind==='tinning kit'){
   buildTinningKit({g,materials});
  }else if(kind==='expensive camera'){
   buildCamera({g,materials});
  }else if(kind==='lenses'){
   buildLenses({g,materials});
  }else if(kind==='credit card'){
   buildCreditCard({g,materials});
  }else if(kind==='beartrap'){
   buildBearTrap({g,materials});
  }else if(kind==='land mine'){
   buildLandMine({g,materials});
  }else if(kind==='hook'){
   buildGrapplingHook({g,materials});
  }else if(kind==='iron safe'){
   buildSafe({g,materials});
  }else if(kind==='chest'){
   buildChest({g,materials});
  }else if(kind==='large box'){
   buildLargeBox({g,materials});
  }else{
   buildIceBox({g,materials});
  }
  g.updateMatrixWorld(true);const low=new THREE.Box3().setFromObject(g).min.y;g.children.forEach(p=>p.position.y-=low);
 }else{materials.forEach(m=>m.dispose());return null;}
 g.userData.dispose=()=>{g.traverse(o=>o.geometry?.dispose());materials.forEach(m=>m.dispose());};return g;
}
