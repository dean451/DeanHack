import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {pieces,rgb,mix,at} from './homunculus.js';
import {segment,chain} from './ant.js';

// Cats (f) used to be one stretched sphere with a few boxes laid across the back for stripes, a
// ball head with cones for ears and four square posts. They now have a proper cat build, head
// to the front (+z):
// - Torso: one sphere pulled into a cat's barrel: deep chest, tucked flank, rounded haunch.
// - Head: a round skull, full cheeks, whisker pads, a chin and a nose leather, triangular ears
//   (round on the big cats) with pale insides, slit pupils (round on the big cats), whiskers.
// - Legs: shoulder, elbow and forearm down to a padded paw with four toes, each tipped with a dark hooked claw, in front; the hind
//   legs have a muscled thigh, a knee, a raised hock and a long foot.
// - The kitten, housecat and large cat wear a leather collar with a brass tag and are lean, lived-in cats: matted tufts along the spine, proud hip
//   bones, healed scratches across the right flank, ribs showing through the flank fur and upright ears. Their coats are
//   clean enough for a pet that is fed: no mange, no face scar, full whiskers and bright open eyes.
// - Tail: a tapering jointed tail, carried up in a J on the small cats, hanging low with a
//   curled tip on the big ones; the lynx has a stub.
// Coats are painted per vertex from the body position:
// - kitten: silver tabby with blue eyes and a big head. housecat: ginger tabby with white
//   socks. large cat: brown tabby.
// - jaguar: gold with broken rosettes, a dot in most of them.
// - lynx: tawny with faint spots, black ear tufts, a barred cheek ruff and a black-tipped stub.
// - panther: glossy black with ghost rosettes that show only up close, green eyes.
// - tiger: orange with black stripes that thin down the flanks, a white belly, white brows and
//   muzzle, white spots on the backs of the ears, a ringed tail.
// - displacer beast: blue-black with a faint shimmer and two shoulder tentacles ending in
//   spiked pads.
// - any other 'f' gets the housecat's build in the glyph colour.
// One vertex-coloured fur material and one glowing eye material per look. The body, head, eyes,
// each leg and the tail are one mesh each: 8 draws. Geometry is built once per look and shared;
// the left legs reuse the right ones mirrored.
// Handles: body, legs (4, left pair first, hind then fore), head (the neck pivot), tail,
// quirk 'feline'.

const LOOKS={
 kitten:{scruffy:true,scale:.7,coat:'#9a9690',stripe:'#4a4640',belly:'#b8b4a8',nose:'#6a3a38',eye:'#6aa8e0',pattern:'tabby',headSize:1.12,legH:.16,tail:'up',tailLen:.8},
 housecat:{scruffy:true,scale:1,legH:.19,coat:'#cf9050',stripe:'#8a4e22',belly:'#c8b898',nose:'#6a3838',eye:'#d6b640',pattern:'tabby',socks:true},
 'large cat':{scruffy:true,scale:1.15,legH:.2,coat:'#8a7050',stripe:'#2e241a',belly:'#dccab0',nose:'#5a3630',eye:'#c8b030',pattern:'tabby'},
 jaguar:{scale:1.4,coat:'#c99a48',stripe:'#24180e',belly:'#c4b497',nose:'#5e3630',eye:'#e0b040',pattern:'rosette',ears:'round',round:true,heavy:1.15,headSize:.95,tail:'low',tailLen:.9},
 lynx:{scale:1.1,coat:'#a88f70',stripe:'#5a4630',belly:'#b8ac98',nose:'#5a3a30',eye:'#c8b040',pattern:'spots',tufts:true,ruff:true,legH:.26,tail:'bob'},
 panther:{scale:1.45,coat:'#232226',stripe:'#121114',belly:'#2e2c32',nose:'#141214',eye:'#9ad04a',pattern:'ghost',ears:'round',round:true,heavy:1.1,headSize:.95,tail:'low',gloss:.45,whisker:'#8a8a8a'},
 tiger:{scale:1.6,coat:'#d9782a',stripe:'#1a120c',belly:'#cbbfa8',nose:'#5e3630',eye:'#e0a030',pattern:'tiger',ears:'round',round:true,heavy:1.2,headSize:.95,tail:'low',tailLen:1.05,brows:true,earSpots:true},
 'displacer beast':{scale:1.5,coat:'#2e2a48',stripe:'#4a4880',belly:'#3a3656',nose:'#1a1828',eye:'#50f0d0',pattern:'shimmer',heavy:1.1,tail:'low',tentacles:'#6a68b0',whisker:'#9a98c8'},
};

const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const clamp01=v=>v<0?0:v>1?1:v;
const smooth=v=>{v=clamp01(v);return v*v*(3-2*v);};

// Nearest jittered cell centre around a point, in cell units: {d, id, ax, ay, az}.
function cell(x,y,z,size){
 const X=x/size,Y=y/size,Z=z/size,ix=Math.floor(X),iy=Math.floor(Y),iz=Math.floor(Z);
 let best={d:9,id:0,ax:0,ay:0,az:0};
 for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++){
  const cx=ix+i,cy=iy+j,cz=iz+k,id=cx*127.1+cy*311.7+cz*74.7;
  const px=cx+.15+.7*hash(id),py=cy+.15+.7*hash(id+1.7),pz=cz+.15+.7*hash(id+3.1);
  const ax=X-px,ay=Y-py,az=Z-pz,d=Math.hypot(ax,ay,az);
  if(d<best.d)best={d,id,ax,ay,az};
 }
 return best;
}

// The coat's markings at a point in body space (before scaling). `limb` turns stripes into
// bands around a leg.
function markings(L,C,x,y,z,base,limb=false){
 let c=base;
 switch(L.pattern){
  case 'tabby':{
   const t=limb?Math.sin(y*70+z*8):Math.sin(z*48+Math.sin(y*25+x*10)*1.1+Math.abs(x)*6);
   if(t>.45)c=mix(c,C.stripe,.75*smooth((t-.45)/.2));
   if(!limb&&Math.abs(x)<.018&&y>L.Y+.09)c=mix(c,C.stripe,.6);
   break;
  }
  case 'tiger':{
   const t=limb?Math.sin(y*80+x*20):Math.sin(z*62+Math.sin(y*18+z*9)*1.6+Math.abs(x)*9);
   const thin=limb?.6:.5+clamp01((L.Y+.1-y)*3)*.42;
   if(t>thin)c=mix(c,C.stripe,.92);
   break;
  }
  case 'rosette':case 'ghost':{
   const k=cell(x,y,z,limb?.04:.062),r=.8+.4*hash(k.id+.3),a=Math.atan2(k.ay,k.az+k.ax*.5);
   const dark=L.pattern==='ghost'?.55:.9,ring=k.d>.26*r&&k.d<.46*r&&Math.sin(a*3+hash(k.id)*6)<.72;
   if(limb){if(k.d<.3*r)c=mix(c,C.stripe,dark);}
   else if(ring)c=mix(c,C.stripe,dark);
   else if(k.d<=.26*r){c=mix(c,C.stripe,L.pattern==='ghost'?.12:.18);if(L.pattern==='rosette'&&k.d<.09&&hash(k.id+.5)>.4)c=mix(c,C.stripe,dark);}
   break;
  }
  case 'spots':{
   const k=cell(x,y,z,.045);
   if(k.d<.22)c=mix(c,C.stripe,.55);
   break;
  }
  case 'shimmer':{
   const t=Math.sin(x*40+y*30-z*55);
   if(t>.7)c=mix(c,C.stripe,.45*smooth((t-.7)/.3));
   break;
  }
 }
 return c;
}

const SCAR=rgb('#e8c8b8');

// How much a stray's flank darkens over a rib: ridges at a steady pitch behind the shoulder, gone on the back,
// the belly and off the ribcage.
export function ribShade(x,y,z,Y){
 if(Math.abs(x)<.07||z<-.06||z>.16)return 0;
 const r=Math.sin(z*105),band=smooth((y-(Y-.06))/.03)*smooth((Y+.07-y)/.03);
 return r>.55?.28*smooth((r-.55)/.25)*band:0;
}

// Coat colour on the torso and neck: darker along the back, pale underneath and on the chest.
function torsoAt(L,C){
 return (x,y,z)=>{
  const top=smooth((y-L.Y)/.12);
  let c=mix(C.coat,C.back,top*.5);
  c=markings(L,C,x,y,z,c);
  if(L.scruffy&&x>.05)for(let k=0;k<2;k++){const d=Math.abs((y-L.Y-.03-k*.025)-(z+.02)*.5);if(d<.006&&z>-.15&&z<.1)c=mix(c,C.belly,.8*(1-d/.006));}
  if(L.scruffy)c=mix(c,C.stripe,.1*smooth((hash(Math.floor(x*90)*7.3+Math.floor(y*90)*3.1+Math.floor(z*90))-.55)/.2));
  if(L.scruffy)c=mix(c,C.stripe,ribShade(x,y,z,L.Y));
  const belly=smooth((L.Y-.03-y)/.06),chest=smooth((z-.16)/.08)*smooth((L.Y+.06-y)/.08);
  return mix(c,C.belly,Math.max(belly,chest)*(L.pattern==='ghost'||L.pattern==='shimmer'?.6:1));
 };
}

function torso(L){
 const bw=L.heavy||1,geo=new THREE.SphereGeometry(1,40,26);geo.rotateX(Math.PI/2);
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),u=p.getZ(i);
  const w=.12*bw*(1+.06*u)*(1-.1*Math.exp(-(((u+.1)/.35)**2)));
  const ht=.112+.01*u,hb=.12+.03*Math.max(0,u)-.03*Math.exp(-(((u+.3)/.3)**2));
  p.setXYZ(i,x*w,L.Y+(y>0?y*ht:y*hb),u*.29-.01);
 }
 geo.deleteAttribute('uv');const merged=mergeVertices(geo);geo.dispose();merged.computeVertexNormals();
 return merged;
}

function buildBody(L,C){
 const P=pieces(),bw=L.heavy||1,paint=torsoAt(L,C);
 P.add(torso(L),null,paint);
 // shoulder blades and haunches under the skin
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.05,12,8),at(s*.05*bw,L.Y+.075,.14,[0,0,0],[.8*bw,.6,1.2]),paint);
  P.add(new THREE.SphereGeometry(.07,14,10),at(s*.06*bw,L.Y+.01,-.17,[0,0,0],[.75*bw,1,1.05]),paint);
 }
 // neck up to the head pivot
 const [nx,ny,nz]=L.neck;
 segment(P,[0,L.Y+.03,.19],[nx,ny-.02,nz-.01],.075*bw,.06*bw,paint,14);
 P.add(new THREE.SphereGeometry(.066*bw,16,10),at(0,L.Y+.09,.235),paint);
 // pets: a few short tufts along the spine, the hip bones just showing
 if(L.scruffy){
  for(let k=0;k<5;k++){
   // short, broad and laid flat along the coat, so they read as fur and not as a row of spikes
   const z=-.18+k*.07,lean=.7+.05*(k%3),h=.014+.006*hash(k+L.Y*10);
   P.add(new THREE.ConeGeometry(.016,h,4),at((hash(k+3)-.5)*.014,L.Y+.108+.01*(z+.01),z,[-lean,0,(hash(k)-.5)*.3]),(x,y)=>mix(C.back,C.stripe,smooth((y-L.Y-.1)/.04)));
  }
  for(const s of [-1,1])P.add(new THREE.ConeGeometry(.016,.03,4),at(s*.058*bw,L.Y+.085,-.15,[-.2,0,-s*.5],[1,1,.8]),paint);
  // the dark hollow where the flank tucks in
  for(const s of [-1,1])P.add(new THREE.SphereGeometry(.03,8,6),at(s*.1*bw,L.Y-.01,-.04,[0,0,0],[.5,1,1.5]),(x,y)=>mix(C.coat,C.stripe,.3));
 }
 if(L.tentacles){
  const pad=rgb(L.tentacles),spike=rgb('#d8d4f0');
  for(const s of [-1,1]){
   const pts=[[s*.05,L.Y+.1,.12],[s*.1,L.Y+.25,.05],[s*.14,L.Y+.38,-.04],[s*.16,L.Y+.46,.05],[s*.15,L.Y+.48,.14]];
   const curve=new THREE.CatmullRomCurve3(pts.map(v=>new THREE.Vector3(...v))),n=9;
   const samples=Array.from({length:n+1},(_,k)=>curve.getPoint(k/n).toArray());
   chain(P,samples,samples.map((_,k)=>.026-.013*k/n),j=>mix(C.coat,pad,j/n*.6),6);
   const tip=samples[n];
   P.add(new THREE.SphereGeometry(.035,10,8),at(tip[0],tip[1],tip[2]+.02,[0,0,0],[1.2,.7,1.5]),(x,y)=>mix(pad,C.coat,clamp01((tip[1]-y)/.03)));
   for(let k=0;k<5;k++){
    const a=k/5*Math.PI*2,dx=Math.cos(a)*.035,dz=Math.sin(a)*.045;
    segment(P,[tip[0]+dx*.8,tip[1],tip[2]+.02+dz*.8],[tip[0]+dx*1.5,tip[1]+.012,tip[2]+.02+dz*1.5],.007,.001,spike,4);
   }
  }
 }
 return P.merge();
}


// Head, in head space: the origin is the neck pivot.
function buildHead(L,C){
 const P=pieces(),inner=rgb(L.pattern==='ghost'||L.pattern==='shimmer'?'#4a3a40':'#5a2a28');
 const paint=(x,y,z)=>{
  let c=mix(C.coat,C.back,smooth((y-.04)/.06)*.4);
  const ax=Math.abs(x);
  if(L.pattern==='tabby'||L.pattern==='tiger'){
   if(y>.035&&z>.06&&ax<.05&&Math.sin(ax*120+1)>.35)c=mix(c,C.stripe,.8);
   if(ax>.055&&y<.035&&y>-.035&&Math.sin((y+ax*.6)*120)>.55)c=mix(c,C.stripe,.8);
  }else if(L.pattern!=='shimmer'){
   const k=cell(x,y,z,.028);if(k.d<.24)c=mix(c,C.stripe,L.pattern==='ghost'?.5:.65);
  }
  const muzzle=smooth((-.022-y)/.02)+smooth((z-.115)/.02)*smooth((.0-y)/.02);
  c=mix(c,C.belly,clamp01(muzzle)*(L.pattern==='ghost'||L.pattern==='shimmer'?.5:1));
  // the wild cats carry an old gouge down the left cheek, a rival's work
  if(!L.scruffy&&x<-.03&&x>-.1){const d=Math.abs((z-.09)+(y+.01)*.8-(-x-.06)*1.4);if(d<.005&&y<.03&&y>-.05&&z>.04)c=mix(c,SCAR,.7*(1-d/.005));}
  if(L.brows)for(const s of [-1,1])if(Math.hypot(x-s*.04,y-.055,z-.12)<.02)c=mix(c,C.belly,.9);
  return c;
 };
 P.add(new THREE.SphereGeometry(.09,22,16),at(0,.02,.05,[0,0,0],[1.1,.95,1]),paint);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.05,12,10),at(s*.045,-.02,.08,[0,0,0],[1,.85,1]),paint);
 P.add(new THREE.SphereGeometry(.03,10,8),at(0,0,.115,[0,0,0],[.8,.7,1.2]),paint);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.03,10,8),at(s*.022,-.03,.125,[0,0,0],[1,.8,.9]),paint);
 P.add(new THREE.SphereGeometry(.018,12,8),at(0,-.052,.1,[0,0,0],[1,.7,1.1]),paint);
 // pets: a low brow ridge over each eye and a flat bridge, so the skull has bone under it instead of a smooth ball
 if(L.scruffy)for(const s of [-1,1])P.add(new THREE.SphereGeometry(.03,10,8),at(s*.04,.043,.112,[-.3,0,s*.25],[1.15,.26,.6]),paint);
 P.add(new THREE.SphereGeometry(.014,10,6),at(0,-.006,.146,[0,0,0],[1.3,.8,.7]),C.nose);
 // pupils in front of the glowing eyes: slits, or round on the big cats
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(L.scruffy?.015:.018,10,8),at(s*.041,.026,.139,[0,0,0],L.round?[.5,.5,.22]:[.22,.85,.22]),rgb('#080606'));
 // ears
 for(const s of [-1,1]){
  if(L.ears==='round'){
   const ex=s*.066,ey=.085,ez=.01;
   P.add(new THREE.SphereGeometry(.035,12,10),at(ex,ey,ez,[0,0,-s*.25],[1,1.05,.4]),(x,y,z)=>L.earSpots&&z<ez-.004?(Math.hypot(x-ex,y-ey)<.014?C.belly:C.stripe):C.coat);
   P.add(new THREE.SphereGeometry(.024,10,8),at(ex,ey-.004,ez+.008,[0,0,-s*.25],[1,1,.3]),mix(C.belly,inner,.4));
   // the big cats' left ear is bitten: a dark wedge missing from the rim
   if(s<0)P.add(new THREE.ConeGeometry(.012,.03,4),at(ex-.012,ey+.03,ez+.012,[0,0,.5],[1,1,.5]),C.stripe);
  }else{
   const torn=false,e=(L.tufts?1.25:L.scruffy?1.3:1)*(torn?.8:1),rot=[-.15,0,-s*.3];
   P.add(new THREE.ConeGeometry(.038*e,.075*e,4),at(s*.055,.095+.01*(e-1),.03,rot,[1,1,.45]),(x,y)=>mix(C.coat,C.back,smooth((y-.1)/.04)));
   P.add(new THREE.ConeGeometry(.026*e,.055*e,4),at(s*.055,.09+.01*(e-1),.042,rot,[1,1,.3]),inner);
   if(torn)P.add(new THREE.ConeGeometry(.01,.03,3),at(s*.072,.098,.03,[-.15,0,-s*.7],[1,1,.45]),C.coat);
   if(L.tufts)segment(P,[s*.068,.14,.03],[s*.078,.2,.025],.008,.001,C.stripe,4);
  }
 }
 // scruffy pets: ragged tufts of cheek fur flaring out under the ears
 if(L.scruffy)for(const s of [-1,1])for(let k=0;k<3;k++)P.add(new THREE.ConeGeometry(.007,.036,4),at(s*(.08+.004*k),-.03-.012*k,.05+.012*k,[Math.PI/2-.2*k,0,s*(1.1+.2*k)],[1,1,.4]),(x,y,z)=>mix(C.coat,C.stripe,smooth((.04-Math.abs(x))/.04)*.4));
 // pets: a plain leather collar, the one mark of an owner, with a small brass tag hanging at the throat
 if(L.scruffy){
  P.add(new THREE.TorusGeometry(.078,.011,6,18),at(0,-.005,-.03),rgb('#5a3a22'));
  P.add(new THREE.CylinderGeometry(.013,.013,.004,10),at(0,-.092,-.02,[Math.PI/2,0,0]),rgb('#b8963c'));
 }
 // the wild cats bare a pair of yellowed fangs hanging past the lip
 if(!L.scruffy&&!L.tentacles)for(const s of [-1,1])P.add(new THREE.ConeGeometry(.0075,.034,4),at(s*.02,-.062,.128,[Math.PI,0,0]),rgb('#a89c78'));
 // whiskers
 const whisker=rgb(L.whisker||'#f0ece0');
 for(const s of [-1,1])for(let k=0;k<4;k++){
  const len=1;
  segment(P,[s*.03,-.036+k*.006,.13],[s*(.03+.11*len),-.036+k*.006+(-.014+.014*k)*len,.13+(-.03+.008*k)*len],.0022,.0006,whisker,3);
 }
 // the lynx's ruff: barred tufts hanging from the cheeks
 if(L.ruff)for(const s of [-1,1])for(let k=0;k<4;k++){
  const a=.2+k*.28;
  P.add(new THREE.ConeGeometry(.026,.09,5),at(s*(.07+.012*k),-.05-.01*k,.07-.025*k,[Math.PI-.3,0,s*a]),(x,y)=>Math.sin(y*160)>.3?C.stripe:C.belly);
 }
 return P.merge();
}

function buildEyes(L){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.021,10,8),at(s*.041,.026,.128,[0,0,-s*(L.scruffy?.25:0)],L.scruffy?[.85,.55,.6]:[1,.8,.6]),[1,1,1]);
 return P.merge();
}

// A small dark hooked claw at a toe tip, curving forward and down.
const CLAW=rgb('#1a1512');
function claw(P,x,y,z,k){
 P.add(new THREE.ConeGeometry(.0055*k,.026*k,4),at(x,y,z+.012*k,[Math.PI/2+.5,0,0]),CLAW);
}

// One right-hand leg, hip or shoulder at the origin, the floor at y=-top.
function buildLeg(L,C,fore){
 const P=pieces(),k=L.heavy||1,[px,py,pz]=fore?L.shoulder:L.hip,fy=-py;
 const paint=(x,y,z)=>{
  let c=markings(L,C,px+x,py+y,pz+z,C.coat,true);
  if(x<-.008)c=mix(c,C.belly,.45);
  if(L.socks&&y<fy+.07)c=C.belly;
  return c;
 };
 let paw=L.socks?C.belly:mix(C.coat,C.belly,.25);
 // pets walk a little dirty: the paws carry a light dusting of grime, not a cake of it
 if(L.scruffy)paw=mix(paw,C.stripe,.2);
 const skin=(x,y,z)=>y<fy+.03?paw:paint(x,y,z);
 if(fore){
  segment(P,[0,.02,0],[0,-.11,-.02],.048*k,.033*k,skin,12);
  P.add(new THREE.SphereGeometry(.05*k,12,8),at(0,-.02,0,[0,0,0],[.7,1.2,1]),skin);
  P.add(new THREE.SphereGeometry(.034*k,10,8),at(0,-.11,-.02),skin);
  segment(P,[0,-.11,-.02],[0,fy+.035,.01],.03*k,.024*k,skin,10);
  P.add(new THREE.SphereGeometry(.025*k,10,6),at(0,fy+.035,.01),skin);
  P.add(new THREE.SphereGeometry(.036*k,14,8),at(0,fy+.016,.025,[0,0,0],[1,.46,1.2]),paw);
  for(const [tx,tz] of [[-.024,.048],[-.008,.056],[.008,.056],[.024,.048]]){
   P.add(new THREE.SphereGeometry(.013*k,6,4),at(tx*k,fy+.011,tz*k,[0,0,0],[1,.8,1]),paw);
   claw(P,tx*k,fy+.009,tz*k+.01,k);
  }
 }else{
  P.add(new THREE.SphereGeometry(.06*k,14,10),at(0,-.04,.005,[0,0,0],[.62,1.15,1]),skin);
  segment(P,[0,0,0],[0,-.12,.045],.05*k,.032*k,skin,12);
  P.add(new THREE.SphereGeometry(.032*k,10,8),at(0,-.12,.045),skin);
  segment(P,[0,-.12,.045],[0,fy+.1,-.04],.03*k,.022*k,skin,10);
  P.add(new THREE.SphereGeometry(.023*k,10,6),at(0,fy+.1,-.04),skin);
  segment(P,[0,fy+.1,-.04],[0,fy+.03,-.015],.022*k,.02*k,skin,10);
  P.add(new THREE.SphereGeometry(.033*k,14,8),at(0,fy+.014,.0,[0,0,0],[1,.46,1.25]),paw);
  for(const [tx,tz] of [[-.022,.022],[-.007,.03],[.007,.03],[.022,.022]]){
   P.add(new THREE.SphereGeometry(.012*k,6,4),at(tx*k,fy+.01,tz*k,[0,0,0],[1,.8,1]),paw);
   claw(P,tx*k,fy+.008,tz*k+.01,k);
  }
 }
 return P.merge();
}

const TAILS={
 up:[[0,0,0],[0,.03,-.06],[0,.12,-.1],[.01,.22,-.1],[.02,.3,-.07]],
 j:[[0,0,0],[0,-.02,-.07],[0,-.02,-.15],[.015,.03,-.23],[.04,.12,-.28],[.065,.22,-.28],[.08,.29,-.23]],
 low:[[0,0,0],[0,-.07,-.06],[0,-.15,-.1],[0,-.2,-.15],[.02,-.21,-.21],[.05,-.17,-.25],[.07,-.11,-.25]],
 bob:[[0,0,0],[0,.015,-.045],[0,.035,-.085]],
};
function buildTail(L,C){
 const P=pieces(),key=L.tail||'j',s=L.tailLen||1,k=L.heavy||1;
 const curve=new THREE.CatmullRomCurve3(TAILS[key].map(([x,y,z])=>new THREE.Vector3(x*s,y*s,z*s)));
 const n=key==='bob'?4:12,pts=Array.from({length:n+1},(_,i)=>curve.getPoint(i/n).toArray());
 const r0=(key==='bob'?.034:.03)*k,r1=(key==='bob'?.028:.016)*k;
 const ringed=L.pattern==='tabby'||L.pattern==='tiger'||L.pattern==='rosette';
 const colour=j=>{
  if(j>=n-2&&L.pattern!=='shimmer')return L.pattern==='ghost'?C.stripe:mix(C.stripe,C.coat,.1);
  if(ringed&&j>n*.35&&j%3===0)return mix(C.coat,C.stripe,.85);
  if(L.pattern==='rosette'&&j<=n*.35&&j%2)return mix(C.coat,C.stripe,.5);
  return mix(C.coat,C.back,.3);
 };
 chain(P,pts,pts.map((_,i)=>r0+(r1-r0)*i/n),colour,8);
 P.add(new THREE.SphereGeometry(r1*1.05,8,6),at(...pts[n]),colour(n-1));
 // pets: the tail keeps just a couple of burrs of fur, a little wear
 if(L.scruffy)for(let i=4;i<n;i+=4)P.add(new THREE.ConeGeometry(.006*k,.02,4),at(pts[i][0]+.01,pts[i][1]+.008,pts[i][2],[0,0,-1.2]),mix(C.coat,C.stripe,.25));
 P.add(new THREE.SphereGeometry(r0*1.1,8,6),at(0,0,0),mix(C.coat,C.back,.3));
 return P.merge();
}

function lookFor(name,colour){
 if(LOOKS[name])return LOOKS[name];
 const c=new THREE.Color(colour||LOOKS.housecat.coat);
 return {...LOOKS.housecat,socks:false,scruffy:false,coat:c.getStyle(),stripe:c.clone().multiplyScalar(.5).getStyle(),belly:c.clone().lerp(new THREE.Color('#ffffff'),.55).getStyle()};
}

const cache=new Map();
function build(key,look){
 if(cache.has(key))return cache.get(key);
 const legH=look.legH||.22,Y=legH+.1,bw=look.heavy||1;
 const L={...look,Y,neck:[0,Y+.13,.27],shoulder:[.07*bw,Y-.03,.15],hip:[.065*bw,Y,-.17]};
 const C={coat:rgb(L.coat),stripe:rgb(L.stripe),belly:rgb(L.belly),nose:rgb(L.nose)};
 C.back=mix(C.coat,C.stripe,.35);
 const S={L,
  fur:new THREE.MeshStandardMaterial({vertexColors:true,roughness:L.gloss??.82,metalness:0}),
  eye:new THREE.MeshStandardMaterial({color:L.eye,emissive:L.eye,emissiveIntensity:L.scruffy?.95:.6,roughness:.2}),
  body:buildBody(L,C),head:buildHead(L,C),eyes:buildEyes(L),fore:buildLeg(L,C,true),hind:buildLeg(L,C,false),tail:buildTail(L,C),
 };
 cache.set(key,S);return S;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function isFeline(name){return !!LOOKS[name];}

export function createFeline(name,colour){
 const look=lookFor(name,colour),S=build(LOOKS[name]?name:'f:'+look.coat,look),L=S.L;
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(L.scale);
 mesh(body,S.body,S.fur,'body');
 const head=new THREE.Group();head.position.set(...L.neck);head.scale.setScalar(L.headSize||1);body.add(head);
 mesh(head,S.head,S.fur,'head');mesh(head,S.eyes,S.eye,'eyes');
 const legs=[];
 for(const s of [-1,1])for(const fore of [false,true]){
  const [x,y,z]=fore?L.shoulder:L.hip,leg=new THREE.Group();
  leg.position.set(s*x,y,z);body.add(leg);
  const m=mesh(leg,fore?S.fore:S.hind,S.fur,fore?'foreleg':'hindleg');if(s<0)m.scale.x=-1;
  legs.push(leg);
 }
 const tail=new THREE.Group();tail.position.set(0,L.Y+.05,-.29);body.add(tail);
 mesh(tail,S.tail,S.fur,'tail');
 return {g,body,legs,tail,wings:[],quirk:'feline',head};
}
