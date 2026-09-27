import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeVertices,mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

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

// Food kinds with their own model; rations (including cram) keep the bundle below.
const FOOD_KIND=/\b(apple|orange|pear|melon|banana|carrot|egg|tin|lembas|fortune cookie|meatball|meat stick|chunk|meat ring|garlic|royal jelly|cream pie|candy bar|pancake|kelp frond|slime mold)(?:e?s)?\b/;

// Tool kinds with their own model. Each word is the shared appearance, so a tin and a
// magic whistle, or a tooled and a frost horn, look alike on the floor.
const TOOL_KIND=/\b(whistle|mirror|crystal ball|horn|bugle|flute|harp|drum|bell|stethoscope|tin opener|leash|saddle|chest|large box|ice box|tinning kit|expensive camera|lenses|credit card|beartrap|land mine|hook)\b/;

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
   const tint=new THREE.Color(GEM_COLORS[item.color]??0xd8e4ea);
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
  const rod=add(new THREE.CylinderGeometry(.025,.035,.6,12),leather,0,.045,0);rod.rotation.z=Math.PI/2;
  for(const x of [-.27,.2,.27]){const band=add(new THREE.CylinderGeometry(.04,.04,.025,12),gold,x,.045,0);band.rotation.z=Math.PI/2;}
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
 }else if(/mail|mithril|coat/.test(name)&&cls===3){
  add(new RoundedBoxGeometry(.38,.09,.48,3,.025),metal,0,.05);
  for(const x of [-.235,.235])add(new RoundedBoxGeometry(.16,.075,.18,3,.02),metal,x,.045,-.14);
  // Links sit against the garment, rather than hovering over a spherical shell.
  for(let row=0;row<7;row++)for(let col=0;col<6;col++){const ring=add(new THREE.TorusGeometry(.025,.006,5,10),metal,(col-2.5)*.055,.097,-.17+row*.055);ring.rotation.x=-Math.PI/2;}
  add(new THREE.TorusGeometry(.059,.013,6,18),leather,0,.096,-.195).rotation.x=-Math.PI/2;
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
   const tin=mat(0xa8b2b4,.7);
   lie(.022,.022,.15,tin,0,.022,0);box(.05,.03,.034,tin,.09,.022);
   box(.022,.012,.036,dark,.035,.042);ball(.012,dark,.118,.022,0,[.4,1,1]);
   flat(new THREE.TorusGeometry(.018,.004,6,14),tin,-.09,.006,0);
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
   const orb=new THREE.MeshStandardMaterial({color:0xbfd8ff,roughness:.05,metalness:.1,transparent:true,opacity:.55,emissive:0x3a5a9a,emissiveIntensity:.35});
   const mist=new THREE.MeshBasicMaterial({color:0xcfe6ff,transparent:true,opacity:.5,depthWrite:false});materials.push(orb,mist);
   add(new THREE.CylinderGeometry(.08,.1,.035,20),wood,0,.0175);
   for(let i=0;i<3;i++){const a=i*Math.PI*2/3,claw=add(new THREE.ConeGeometry(.018,.07,6),brass,Math.cos(a)*.075,.06,Math.sin(a)*.075);claw.rotation.set(Math.sin(a)*.5,0,-Math.cos(a)*.5);}
   ball(.105,orb,0,.14,0);ball(.04,mist,.01,.15,-.01,[1.3,.6,1]).rotation.z=.6;
  }else if(kind==='horn'){
   // A curved animal horn with a brass rim at the mouth and a mouthpiece at the tip.
   const bone=mat(0xd6c49a),tip=mat(0x4a3a2a);
   const curve=new THREE.QuadraticBezierCurve3(v(-.2,.03,.06),v(0,.02,-.12),v(.19,.07,.02));
   taper(curve,.012,.058,bone);
   const mouth=add(new THREE.TorusGeometry(.058,.009,8,24),brass,.19,.07,.02);
   mouth.quaternion.setFromUnitVectors(v(0,0,1),curve.getTangent(1).normalize());
   const hole=add(new THREE.CircleGeometry(.052,20),dark,.191,.07,.02);hole.quaternion.copy(mouth.quaternion);
   ball(.016,tip,-.205,.03,.063);
   for(const t of [.3,.55]){const p=curve.getPoint(t),band=add(new THREE.TorusGeometry(.012+.046*t+.003,.004,6,18),brass,p.x,p.y,p.z);band.quaternion.setFromUnitVectors(v(0,0,1),curve.getTangent(t).normalize());}
  }else if(kind==='bugle'){
   // One flat brass loop ending in a flared bell.
   flat(new THREE.TorusGeometry(.08,.011,8,32,Math.PI*1.6),brass,-.03,.012,0);
   const bell=add(new THREE.CylinderGeometry(.06,.014,.14,20,1,true),brass,.11,.066,-.02);bell.rotation.z=-Math.PI/2;bell.material.side=THREE.DoubleSide;
   flat(new THREE.TorusGeometry(.06,.006,6,24),brass,.18,.066,-.02).rotation.set(0,Math.PI/2,0);
   lie(.009,.016,.05,brass,.03,.012,.08);
  }else if(kind==='flute'){
   lie(.017,.017,.42,wood,0,.017,0,.3);
   for(let i=0;i<6;i++){const s=-.1+i*.04;add(new THREE.CylinderGeometry(.006,.006,.004,8),dark,s*Math.cos(.3),.034,-s*Math.sin(.3));}
   for(const s of [-.2,.2,.13])add(new THREE.CylinderGeometry(.019,.019,.016,12),brass,s*Math.cos(.3),.017,-s*Math.sin(.3)).rotation.set(0,.3,Math.PI/2);
   add(new THREE.CylinderGeometry(.006,.006,.004,8),dark,-.16*Math.cos(.3),.034,.16*Math.sin(.3)).scale.x=1.8;
  }else if(kind==='harp'){
   // A small upright frame harp: slanted soundbox, curved neck, pillar and strings.
   const lean=.3,along=v(Math.sin(lean),Math.cos(lean),0),face=v(Math.cos(lean),-Math.sin(lean),0);
   add(new THREE.BoxGeometry(.06,.36,.05),wood,-.08,.18,0).rotation.z=-lean;
   add(new THREE.CylinderGeometry(.016,.02,.38,10),wood,.14,.21,0);
   const neck=new THREE.QuadraticBezierCurve3(v(-.027,.36,0),v(.06,.3,0),v(.14,.4,0));
   add(new THREE.TubeGeometry(neck,16,.018,8,false),wood);
   add(new THREE.BoxGeometry(.3,.03,.08),dark,0,.015,0);
   const string=mat(0xe8dcb0);
   for(let i=0;i<5;i++){
    // Lower feet on the soundbox run to the far end of the neck, so strings lengthen toward the pillar.
    const foot=v(-.08,.18,0).addScaledVector(along,-.12+i*.05).addScaledVector(face,.03),top=neck.getPoint(.85-i*.15),d=top.clone().sub(foot);
    const s=add(new THREE.CylinderGeometry(.002,.002,d.length(),4),string,(foot.x+top.x)/2,(foot.y+top.y)/2,0);s.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());
   }
   ball(.02,brass,.14,.41,0);
  }else if(kind==='drum'){
   const shell=mat(0x8a3a28),skin=mat(0xe2d3b0),cord=mat(0xd8c8a0);
   add(new THREE.CylinderGeometry(.13,.13,.15,28),shell,0,.075);
   add(new THREE.CylinderGeometry(.125,.125,.004,28),skin,0,.152);
   for(const y of [.008,.148])flat(new THREE.TorusGeometry(.132,.009,6,28),skin,0,y,0);
   // Zigzag tension cords between the rims.
   for(let i=0;i<10;i++){const a0=i*Math.PI/5,a1=a0+Math.PI/10,f=v(Math.cos(a0)*.135,.02,Math.sin(a0)*.135),t=v(Math.cos(a1)*.135,.135,Math.sin(a1)*.135),d=t.clone().sub(f);
    const c=add(new THREE.CylinderGeometry(.003,.003,d.length(),4),cord,(f.x+t.x)/2,(f.y+t.y)/2,(f.z+t.z)/2);c.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());}
   lie(.007,.009,.22,wood,.12,.009,.16,.5);ball(.014,skin,.025,.009,.212);
  }else if(kind==='bell'){
   // A hand bell mouth-down: a lathed bronze shell, a turned wooden handle, and the clapper peeking out.
   const bronze=mat(0xb8893a,.7);
   const shape=[[.001,.16],[.035,.16],[.05,.14],[.058,.1],[.07,.05],[.092,.012],[.1,0],[.094,0]].map(([x,y])=>new THREE.Vector2(x,y));
   const shell=add(new THREE.LatheGeometry(shape,28),bronze);shell.material.side=THREE.DoubleSide;
   add(new THREE.CylinderGeometry(.016,.022,.1,10),wood,0,.21);ball(.026,wood,0,.265,0);
   flat(new THREE.TorusGeometry(.096,.006,6,28),bronze,0,.006,0);
   ball(.022,dark,.02,.02,.02);
  }else if(kind==='stethoscope'){
   // Tubing coiled on the floor between the chest piece and the earpieces.
   const tube=mat(0x2e2e30),steel=metal;
   add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v(.14,.012,.1),v(.02,.012,.14),v(-.1,.012,.06),v(-.06,.012,-.06),v(.04,.012,-.04),v(0,.012,.03)]),48,.009,6,false),tube);
   add(new THREE.CylinderGeometry(.035,.035,.018,20),steel,.155,.009,.105);add(new THREE.CylinderGeometry(.03,.03,.004,20),dark,.155,.02,.105);
   for(const s of [-1,1]){add(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(v(0,.012,.03),v(s*.05,.012,.02),v(s*.08,.012,-.1)),12,.005,6,false),steel);ball(.012,dark,s*.08,.012,-.11);}
  }else if(kind==='tin opener'){
   const steel=metal;
   box(.14,.012,.028,wood,-.03,.006);
   box(.06,.006,.02,steel,.06,.006);
   const hook=add(new THREE.TorusGeometry(.018,.005,6,12,Math.PI*1.3),steel,.1,.018,0);hook.rotation.y=Math.PI/2;
  }else if(kind==='leash'){
   // A coiled lead with a brass snap hook and a hand loop.
   const rope=mat(0x7a4a2a);
   for(let i=0;i<3;i++)flat(new THREE.TorusGeometry(.09-i*.012,.009,6,28),rope,i*.01,.009+i*.012,i*.006);
   flat(new THREE.TorusGeometry(.03,.008,6,16),rope,-.14,.008,.02);
   add(new THREE.CylinderGeometry(.009,.009,.05,8),rope,-.105,.008,.012).rotation.set(0,.3,Math.PI/2);
   flat(new THREE.TorusGeometry(.014,.004,6,14),brass,.11,.006,-.04);box(.03,.012,.012,brass,.09,.006,-.03);
  }else if(kind==='saddle'){
   const tack=mat(0x5a3522),pad=mat(0x3a5a7a);
   box(.34,.012,.42,pad,0,.006);
   ball(.18,tack,0,.07,0,[.8,.38,1.1]);
   ball(.045,tack,0,.12,-.15,[1,1.1,.7]);
   add(new THREE.TorusGeometry(.05,.015,8,20,Math.PI),tack,0,.1,.15).rotation.y=Math.PI/2;
   for(const s of [-1,1]){box(.012,.06,.03,tack,s*.16,.04,.0);const iron=add(new THREE.TorusGeometry(.028,.006,6,14),metal,s*.2,.03,0);iron.rotation.set(0,Math.PI/2,s*.4);}
  }else if(kind==='tinning kit'){
   // A tin-plate case with a carrying handle and a side crank, and two fresh tins beside it.
   const plate=mat(0xaab4b6,.75),label=mat(0x9a2c22);
   add(new RoundedBoxGeometry(.24,.13,.16,2,.012),plate,-.04,.065);
   box(.245,.006,.165,dark,-.04,.1);
   add(new THREE.TorusGeometry(.04,.007,6,16,Math.PI),plate,-.04,.13,0);
   for(const x of [-.08,0])box(.014,.012,.012,plate,x,.134);
   box(.02,.03,.012,brass,-.04,.095,.085);
   lie(.006,.006,.05,metal,.105,.08,0,Math.PI/2);
   box(.012,.06,.012,metal,.105,.08,.025);lie(.009,.009,.03,wood,.12,.05,.025);
   for(const [x,z] of [[.16,-.05],[.19,.06]]){
    add(new THREE.CylinderGeometry(.032,.032,.055,16),plate,x,.0275,z);
    add(new THREE.CylinderGeometry(.0325,.0325,.03,16,1,true),label,x,.0275,z).material.side=THREE.DoubleSide;
    flat(new THREE.TorusGeometry(.03,.003,5,16),plate,x,.055,z);
   }
  }else if(kind==='expensive camera'){
   // A boxy leather-clad camera with a brass lens barrel and a flash reflector on top.
   const body=mat(0x2a2624),trim=mat(0xb8bcbe,.8),lens=new THREE.MeshStandardMaterial({color:0x223a4a,metalness:.3,roughness:.05,emissive:0x0e2a3a,emissiveIntensity:.4});materials.push(lens);
   add(new RoundedBoxGeometry(.24,.14,.1,2,.014),body,0,.07);
   box(.245,.025,.105,trim,0,.128);
   const barrel=add(new THREE.CylinderGeometry(.045,.05,.07,20),brass,0,.065,.085);barrel.rotation.x=Math.PI/2;
   add(new THREE.TorusGeometry(.045,.006,6,20),dark,0,.065,.12);add(new THREE.CircleGeometry(.038,20),lens,0,.065,.121);
   box(.035,.025,.012,trim,.08,.1,.052);box(.02,.015,.004,lens,.08,.1,.059);
   add(new THREE.CylinderGeometry(.009,.009,.012,10),mat(0xb03020,.3),.085,.146,0);
   add(new THREE.CylinderGeometry(.006,.006,.05,8),trim,-.07,.165,0);
   const dish=add(new THREE.CylinderGeometry(.055,.012,.035,20,1,true),trim,-.07,.2,.01);dish.rotation.x=-.5;dish.material.side=THREE.DoubleSide;
   const bulb=new THREE.MeshBasicMaterial({color:0xfff4d8});materials.push(bulb);ball(.013,bulb,-.07,.195,.008);
   for(const x of [-.125,.125])box(.01,.02,.02,trim,x,.1);
   add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v(-.13,.1,0),v(-.17,.02,.06),v(-.05,.005,.16),v(.1,.005,.16),v(.17,.02,.06),v(.13,.1,0)]),32,.006,5,false),body);
  }else if(kind==='lenses'){
   // Folded spectacles: two glass rounds in thin wire rims, a bridge, and temples tucked behind.
   const glass=new THREE.MeshStandardMaterial({color:0xcfe4ee,metalness:.2,roughness:.04,transparent:true,opacity:.55});materials.push(glass);
   for(const s of [-1,1]){
    flat(new THREE.TorusGeometry(.05,.006,6,28),metal,s*.062,.05,0).rotation.x=Math.PI/2-.35;
    const lens=add(new THREE.CylinderGeometry(.047,.047,.004,28),glass,s*.062,.05,0);lens.rotation.x=-.35;
    const arm=add(new THREE.CylinderGeometry(.004,.004,.17,6),metal,s*.075,.012,-.085);arm.rotation.set(Math.PI/2,0,s*.1);
    ball(.007,metal,s*.112,.03,-.012);
   }
   const bridge=add(new THREE.TorusGeometry(.016,.004,6,12,Math.PI),metal,0,.062,.006);bridge.rotation.x=-.35;
  }else if(kind==='credit card'){
   // A thin plastic card with a magnetic stripe on its back and a gold chip on its face.
   const plastic=mat(0x2f5aa8);
   add(new RoundedBoxGeometry(.2,.006,.13,2,.003),plastic,0,.003).rotation.y=.3;
   const c=Math.cos(.3),s=Math.sin(.3);
   const part=(w,d,m,x,z)=>{box(w,.0015,d,m,x*c+z*s,.0065,z*c-x*s).rotation.y=.3;};
   part(.036,.028,brass,-.055,-.01);part(.15,.012,mat(0xd8dde0),.01,.035);part(.13,.008,mat(0xa9c0e6),0,-.042);
  }else if(kind==='beartrap'){
   // A sprung-open trap: a round base, two toothed half-jaws lying flat, a pan and a chained stake.
   const iron=mat(0x55504a,.7);
   flat(new THREE.TorusGeometry(.12,.012,8,32),iron,0,.012,0);
   add(new THREE.CylinderGeometry(.04,.045,.016,16),iron,0,.008);
   for(const s of [-1,1]){
    const jaw=flat(new THREE.TorusGeometry(.15,.01,6,24,Math.PI),metal,0,.012,0);jaw.rotation.z=s>0?0:Math.PI;
    for(let i=1;i<9;i++){const a=i/9*Math.PI;add(new THREE.ConeGeometry(.012,.04,4),metal,Math.cos(a)*.15,.03,s*Math.sin(a)*.15);}
   }
   for(const s of [-1,1]){lie(.012,.012,.05,iron,s*.17,.012,0);add(new THREE.TorusGeometry(.028,.008,6,16),iron,s*.2,.03,0).rotation.y=Math.PI/2;}
   for(let i=0;i<4;i++){const link=add(new THREE.TorusGeometry(.014,.004,5,10),iron,.16+i*.02,.006,.13+i*.022);link.rotation.set(Math.PI/2,0,i%2?Math.PI/2:0);}
   add(new THREE.ConeGeometry(.012,.07,6),iron,.24,.012,.24).rotation.x=Math.PI/2;
  }else if(kind==='land mine'){
   // A squat olive-drab disc with a ribbed rim, a pressure plate and a small arming plug.
   const drab=mat(0x4d5634),plate=mat(0x2c2f24,.4);
   add(new THREE.CylinderGeometry(.13,.14,.05,28),drab,0,.025);
   for(let i=0;i<16;i++){const a=i/16*Math.PI*2;box(.012,.04,.012,drab,Math.cos(a)*.138,.022,Math.sin(a)*.138).rotation.y=-a;}
   add(new THREE.CylinderGeometry(.075,.08,.018,24),plate,0,.059);
   flat(new THREE.TorusGeometry(.08,.006,6,24),metal,0,.052,0);
   add(new THREE.CylinderGeometry(.014,.014,.02,10),brass,.1,.06,.02);
   box(.05,.004,.018,mat(0xc9b04a),-.04,.069,-.02);
  }else if(kind==='hook'){
   // A grappling hook lying on its side: an iron shank with three curved flukes and a coil of rope.
   const iron=mat(0x5a5754,.75),rope=mat(0xa88b5c);
   lie(.012,.012,.28,iron,0,.035,0);
   flat(new THREE.TorusGeometry(.022,.006,6,14),iron,-.155,.035,0).rotation.x=0;
   for(let i=0;i<3;i++){
    const a=i/3*Math.PI*2+.4,fluke=add(new THREE.TorusGeometry(.06,.009,6,16,Math.PI*.8),iron,.14,.035+Math.sin(a)*.03,Math.cos(a)*.03);
    fluke.rotation.set(a,0,Math.PI*.6);
    const tip=add(new THREE.ConeGeometry(.014,.035,5),iron,.14+Math.cos(Math.PI*1.4)*.06,.035+Math.sin(a)*.09,Math.cos(a)*.09);tip.rotation.x=a-Math.PI/2;
   }
   for(let i=0;i<3;i++)flat(new THREE.TorusGeometry(.065-i*.004,.009,6,24),rope,-.2,.009+i*.017,.02);
   lie(.008,.008,.03,rope,-.17,.03,.01,.3);
  }else{
   // Chests, large boxes and ice boxes.
   const chest=kind==='chest',ice=kind==='ice box';
   const side=ice?mat(0xd8dfe2):mat(chest?0x6e4528:0x8a6a44),band=ice?metal:mat(0x3a3632,.6),W=.46,D=.32,H=ice?.3:.2;
   add(new RoundedBoxGeometry(W,H,D,2,.012),side,0,H/2);
   if(chest){
    const lid=add(new THREE.CylinderGeometry(D/2,D/2,W,20,1,false,0,Math.PI),side,0,H,0);lid.rotation.z=Math.PI/2;lid.scale.x=.45;
    for(const x of [-.17,.17]){box(.03,H,D+.012,band,x,H/2);const strap=add(new THREE.CylinderGeometry(D/2+.006,D/2+.006,.03,20,1,true,0,Math.PI),band,x,H,0);strap.rotation.z=Math.PI/2;strap.scale.x=.45;}
    box(.06,.07,.012,mat(0xc9a24a,.7),0,H-.01,D/2+.006);box(.014,.02,.006,dark,0,H-.02,D/2+.014);
   }else if(ice){
    box(W+.01,.03,D+.01,side,0,H+.015);box(.12,.018,.02,band,0,H-.03,D/2+.012);
    for(const x of [-.23,.23])box(.012,.02,.1,band,x,H*.6,0);
    const frost=new THREE.MeshBasicMaterial({color:0xeaf6ff,transparent:true,opacity:.35,depthWrite:false});materials.push(frost);
    box(W-.04,.004,D-.04,frost,0,H+.032);
   }else{
    // A plank crate: slats across the lid and sides, with corner battens.
    box(W+.01,.02,D+.01,side,0,H+.01);
    for(const z of [-.08,0,.08])box(W+.012,.004,.004,dark,0,H+.021,z);
    for(const x of [-1,1])for(const z of [-1,1])box(.03,H+.02,.03,band,x*(W/2-.01),(H+.02)/2,z*(D/2-.01));
   }
  }
  g.updateMatrixWorld(true);const low=new THREE.Box3().setFromObject(g).min.y;g.children.forEach(p=>p.position.y-=low);
 }else{materials.forEach(m=>m.dispose());return null;}
 g.userData.dispose=()=>{g.traverse(o=>o.geometry?.dispose());materials.forEach(m=>m.dispose());};return g;
}
