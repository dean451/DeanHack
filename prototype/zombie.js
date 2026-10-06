import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The eight zombies used to be the boxy undead humanoid in a tint of their skin. They now shamble
// as the rotting dead: mottled, bruised flesh in each species' own grey-green or grey-brown, a
// shirt hanging in ragged panels with a torn-open front that bares the ribs over a dark cavity,
// trousers ripped off at one knee, bare feet. The head hangs forward with sunken sockets and one
// eye drooping lower than the other, the jaw drops open on a row of teeth, the hair is patchy,
// and a bald patch has rotted through to the skull. One arm reaches straight out; the other,
// its sleeve gone, hangs lower with the forearm stripped to the two bones. Each species adds its
// own touch: kobold snout and ears, a gnome's faded cap, orc tusks, a dwarf's straggly beard, elf
// ears, and two heads for the ettin.
// Each moving part (body, head, each leg and arm) is one merged, vertex-coloured mesh on one
// shared material, plus one small emissive mesh for the eyes: 7 draws (9 for the ettin). The
// geometry is built once per species and cached.
// Handles: legs, arms, arm, head, body, like the humanoid rig. The quirk stays 'zombie'.

export const ZOMBIES={
 'kobold zombie':{skin:'#7a6a48',scale:.7,wide:1,feature:'kobold'},
 'gnome zombie':{skin:'#7d6b55',scale:.66,wide:1.04,feature:'gnome'},
 'orc zombie':{skin:'#5f6f4d',scale:.95,wide:1.1,feature:'orc'},
 'dwarf zombie':{skin:'#7a5a4a',scale:.78,wide:1.18,feature:'dwarf'},
 'elf zombie':{skin:'#8a9a7a',scale:1.04,wide:.9,feature:'elf'},
 'human zombie':{skin:'#a3a792',scale:1,wide:1},
 'ettin zombie':{skin:'#6a6f80',scale:1.55,wide:1.12,heads:2},
 'giant zombie':{skin:'#7a7a6a',scale:1.85,wide:1.05,feature:'giant'},
};

const C={
 bruise:rgb('#4a3440'),rot:rgb('#3a3226'),wound:rgb('#5a1814'),cavity:rgb('#1e0e0c'),bone:rgb('#d6cdb0'),
 shirt:rgb('#6e6652'),trousers:rgb('#3f3a34'),dirt:rgb('#2e271e'),hair:rgb('#231d18'),nail:rgb('#1c1612'),
 tooth:rgb('#c8bc90'),cap:rgb('#8a3a30'),beard:rgb('#6a6258'),tusk:rgb('#d8ccaa'),
};
function rng(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
const noise=(x,y,z)=>Math.sin(x*71+z*53+y*17)*Math.sin(y*97-x*31+z*11);
// mottled dead flesh: bruised in blotches, darker toward the extremities `low`
function flesh(skin,low=null,high=null){
 return (x,y,z)=>{
  const n=noise(x,y,z);
  let c=mix(skin,C.bruise,Math.max(0,n-.2)*.9);
  if(low!=null)c=mix(c,C.rot,(high-y)/(high-low)*.35);
  return mix(c,C.rot,Math.max(0,-n-.6)*1.2);
 };
}
// cloth, grimed toward the bottom and blotched with old stains
function cloth(base,low,high){
 return (x,y,z)=>{const n=noise(x*.7,y,z*.7);let c=mix(base,C.dirt,(high-y)/(high-low)*.5+n*.1);if(n>.7)c=mix(c,C.wound,(n-.7)*1.5);return c;};
}

// A ragged sleeve of cloth round a vertical axis at (x, z): n open panels from `top` down, each
// hanging to its own length about `len`, so the hem is jagged. Panels whose centre angle (0 =
// front, +x = π/2) lies in `skip` are torn away.
function ragged(P,R,{x=0,z=0,top,len,r0,r1,sz=1,n=12,jag=.3,skip=null,colour}){
 const step=Math.PI*2/n;
 for(let i=0;i<n;i++){
  const a=i*step;const centre=Math.atan2(Math.sin(a+step/2),Math.cos(a+step/2));
  if(skip&&centre>skip[0]&&centre<skip[1])continue;
  const h=len*(1-jag/2+R()*jag),r=t=>r0+(r1-r0)*t,rb=r(h/len);
  const geo=new THREE.CylinderGeometry(r0,rb,h,3,1,true,a,step*(.92+R()*.1));
  P.add(geo,at(x,top-h/2,z,[0,0,0],[1,1,sz]),colour);
 }
}
// A short arc of rib round the front of the trunk (sz flattens it front to back).
function rib(P,y,r,sz,arc){
 const geo=new THREE.TorusGeometry(r,.008,4,10,arc);
 const m=new THREE.Matrix4().makeTranslation(0,y,0).multiply(new THREE.Matrix4().makeScale(1,1,sz))
  .multiply(new THREE.Matrix4().makeRotationX(Math.PI/2)).multiply(new THREE.Matrix4().makeRotationZ(Math.PI/2-arc/2));
 P.add(geo,m,C.bone);
}

function buildBody(o,skin,R){
 const P=pieces(),skinC=flesh(skin),torso=(x,y,z)=>z>.06&&y>.6&&y<.8&&Math.abs(x)<.075+Math.sin(y*60)*.01?mix(C.wound,C.cavity,(z-.06)*12):skinC(x,y,z);
 // hips in the trousers, a rope belt
 P.add(new THREE.SphereGeometry(.17,16,10),at(0,.47,0,[0,0,0],[1.05,.62,.8]),cloth(C.trousers,.38,.56));
 P.add(new THREE.TorusGeometry(.162,.012,5,20),at(0,.52,0,[Math.PI/2,0,0],[1,.8,1]),rgb('#5a4a32'));
 // the sunken trunk, its chest torn open over the ribs, and a hunch between the shoulders
 P.add(new THREE.CylinderGeometry(.165,.135,.42,16),at(0,.68,0,[0,0,0],[1,1,.72]),torso);
 P.add(new THREE.SphereGeometry(.1,12,8),at(0,.8,-.07,[0,0,0],[1.4,.8,.7]),flesh(skin));
 for(const [i,y] of [.64,.675,.71,.745].entries())rib(P,y,.152+i*.005,.74,.62-i*.03);
 P.add(new THREE.CylinderGeometry(.009,.009,.16,5),at(0,.69,.118),C.bone);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.07,10,8),at(s*.19,.84,0),flesh(skin));
 // the neck, with a gash down one side
 P.add(new THREE.CylinderGeometry(.055,.068,.12,10),at(0,.92,.01,[.25,0,0]),(x,y,z)=>x>.03&&z>0&&Math.abs(y-.93+x*.6)<.012?C.wound:skinC(x,y,z));
 // the shirt in ragged panels, gaping open at the front; a cap of it still over the right shoulder
 const shirt=cloth(o.feature==='gnome'?rgb('#4a5a3a'):o.feature==='elf'?rgb('#4a5e44'):C.shirt,.44,.88);
 ragged(P,R,{top:.87,len:.38,r0:.182,r1:.156,sz:.76,n:14,jag:.35,skip:[-.55,.35],colour:shirt});
 P.add(new THREE.SphereGeometry(.078,10,8,0,Math.PI*2,0,Math.PI/2),at(.19,.845,0,[0,0,-.3],[1.05,.9,1.05]),shirt);
 for(const x of [-.14,.12])P.add(new THREE.BoxGeometry(.05,.012,.03),at(x,.87,.07,[0,0,x*2]),shirt);
 return P.merge();
}

function buildHead(o,skin,R){
 const P=pieces(),hr=.112,skinC=flesh(skin);
 // sunken cheeks and sockets are darker; a bald patch has rotted through to the skull
 const face=(x,y,z)=>{
  let c=skinC(x,y,z);
  if(z>.05&&y<.02&&y>-.05&&Math.abs(x)>.04)c=mix(c,C.rot,.45);
  if(x<-.02&&y>.04&&z<.03&&z>-.07)c=mix(c,C.wound,.5);
  return c;
 };
 P.add(new THREE.SphereGeometry(hr,18,14),at(0,0,0,[0,0,0],[.9,1.05,1]),face);
 P.add(new THREE.SphereGeometry(.045,10,8),at(-.06,.065,-.02,[0,0,.5],[1,.35,1.2]),C.bone);
 // brow, deep sockets, a rotted nose
 P.add(new THREE.SphereGeometry(.08,12,8),at(0,.035,.06,[0,0,0],[1.1,.35,.6]),face);
 P.add(new THREE.SphereGeometry(.028,10,8),at(-.04,.008,.088),C.cavity);
 P.add(new THREE.SphereGeometry(.028,10,8),at(.042,-.004,.088),C.cavity);
 if(o.feature==='kobold'){
  P.add(new THREE.ConeGeometry(.05,.12,8),at(0,-.035,.14,[Math.PI/2,0,0],[1,1,.8]),face);
  P.add(new THREE.SphereGeometry(.014,6,5),at(0,-.035,.2),C.cavity);
 }else{
  P.add(new THREE.ConeGeometry(.02,.045,6),at(0,-.018,.108,[Math.PI/2+.3,0,0]),face);
  P.add(new THREE.SphereGeometry(.012,6,5),at(.006,-.03,.118),C.cavity);
 }
 // the jaw hangs open on a row of teeth, the mouth dark behind
 P.add(new THREE.SphereGeometry(.05,12,8),at(0,-.068,.07,[0,0,0],[1.1,.45,.5]),C.cavity);
 P.add(new THREE.SphereGeometry(.07,14,8,0,Math.PI*2,Math.PI/2,Math.PI/2),at(0,-.075,.02,[.45,0,.06],[1.05,.8,1.15]),face);
 for(let i=0;i<7;i++){
  const x=(i-3)*.013;if(i===2)continue;
  P.add(new THREE.BoxGeometry(.009,.016,.008),at(x,-.052,.1-Math.abs(x)*.4),C.tooth);
  if(i%2)P.add(new THREE.BoxGeometry(.009,.013,.008),at(x,-.098,.095-Math.abs(x)*.4,[.45,0,0]),C.tooth);
 }
 // patchy, lank hair on the other side of the crown
 for(let i=0;i<9;i++){
  const a=-.4+R()*2.2,b=.2+R()*.9,x=Math.sin(a)*Math.sin(b)*hr*.92,y=Math.cos(b)*hr*1.02,z=-Math.cos(a)*Math.sin(b)*hr;
  if(x<-.02&&y>.03)continue;
  P.add(new THREE.ConeGeometry(.018,.08+R()*.05,4),at(x*1.02,y-.02,z*1.02,[-.25-Math.max(0,-z)*3,0,-x*4]),C.hair);
 }
 const ear=o.feature==='elf'||o.feature==='kobold';
 for(const s of [-1,1]){
  if(ear)P.add(new THREE.ConeGeometry(.022,o.feature==='kobold'?.1:.08,5),at(s*.1,.03,-.01,[0,0,-s*(o.feature==='kobold'?1.2:.9)],[1,1,.45]),face);
  else P.add(new THREE.SphereGeometry(.024,8,6),at(s*.1,-.005,0,[0,0,0],[.45,1,.8]),face);
 }
 if(o.feature==='orc')for(const s of [-1,1])P.add(new THREE.ConeGeometry(.012,.05,5),at(s*.035,-.07,.09,[0,0,s*.25]),C.tusk);
 if(o.feature==='dwarf')for(let i=0;i<9;i++){const x=(i-4)*.017,l=.07+R()*.06;P.add(new THREE.ConeGeometry(.013,l,4),at(x,-.1-l/2+.02,.07-Math.abs(x)*.5,[Math.PI+.2,0,x*1.5]),mix(C.beard,C.dirt,R()*.5));}
 if(o.feature==='gnome'){
  P.add(new THREE.ConeGeometry(.11,.2,10,1,true),at(.01,.12,-.01,[-.2,0,-.35]),cloth(C.cap,.05,.25));
  P.add(new THREE.TorusGeometry(.096,.012,5,16),at(0,.055,-.005,[Math.PI/2-.12,0,-.1]),cloth(C.cap,0,.1));
 }
 if(o.feature==='giant')P.add(new THREE.SphereGeometry(.085,12,6),at(0,.048,.052,[0,0,0],[1.15,.3,.6]),face);
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 P.add(new THREE.SphereGeometry(.011,8,6),at(-.04,.008,.1),[1,1,1]);
 P.add(new THREE.SphereGeometry(.011,8,6),at(.043,-.009,.1),[1,1,1]);
 return P.merge();
}

// A leg from the hip: thigh, knee, shin and a bare foot with toes. The trousers are ripped off at
// the left knee, where the shin shows a strip of bone; the right leg keeps them to the ankle.
function buildLeg(o,skin,R,side){
 const P=pieces(),legSkin=flesh(skin,-.45,0);
 P.add(new THREE.CylinderGeometry(.068,.056,.22,10),at(0,-.11,0),legSkin);
 P.add(new THREE.SphereGeometry(.056,10,8),at(0,-.22,.005),legSkin);
 P.add(new THREE.CylinderGeometry(.053,.04,.19,10),at(0,-.315,0),legSkin);
 if(side<0)P.add(new THREE.CylinderGeometry(.009,.009,.1,5),at(.008,-.31,.048),C.bone);
 P.add(new THREE.SphereGeometry(.05,10,8),at(0,-.418,.035,[0,0,0],[1,.55,1.75]),legSkin);
 for(let i=0;i<4;i++)P.add(new THREE.SphereGeometry(.014,6,5),at(-.024+i*.016,-.428,.105-Math.abs(i-1.5)*.008),legSkin);
 ragged(P,R,{top:.02,len:side<0?.25:.4,r0:.08,r1:side<0?.068:.056,n:10,jag:side<0?.4:.18,colour:cloth(C.trousers,-.42,0)});
 return P.merge();
}

// An arm from the shoulder (the group turns it forward about x, so local -y runs forward and
// local +z up): upper arm, elbow, forearm and a clawed hand. The right arm keeps a ragged sleeve;
// the left lost it, and its forearm is stripped to the two bones.
function buildArm(o,skin,R,side){
 const P=pieces(),armSkin=flesh(skin);
 P.add(new THREE.CylinderGeometry(.046,.04,.2,10),at(0,-.1,0),armSkin);
 P.add(new THREE.SphereGeometry(.041,10,8),at(0,-.2,0),armSkin);
 if(side>0){
  P.add(new THREE.CylinderGeometry(.039,.032,.17,10),at(0,-.285,0),armSkin);
  ragged(P,R,{top:.03,len:.19,r0:.06,r1:.055,n:9,jag:.4,colour:cloth(C.shirt,-.2,.05)});
 }else{
  // the flesh stripped off the forearm below the elbow, leaving the two bones and ragged edges
  P.add(new THREE.CylinderGeometry(.039,.03,.06,10),at(0,-.235,0),armSkin);
  P.add(new THREE.TorusGeometry(.033,.01,4,12),at(0,-.265,0,[Math.PI/2,0,0]),C.wound);
  for(const x of [-.012,.012])P.add(new THREE.CylinderGeometry(.008,.009,.12,6),at(x,-.32,0),C.bone);
  P.add(new THREE.CylinderGeometry(.03,.033,.03,10),at(0,-.375,0),armSkin);
 }
 // the hand: a flat palm and four clawed fingers curling down, a thumb on the inside
 P.add(new THREE.SphereGeometry(.038,10,8),at(0,-.405,0,[0,0,0],[1.05,1.1,.55]),armSkin);
 for(const [i,x] of [-.026,-.009,.009,.026].entries()){
  const len=.055+(i===1||i===2?.014:0)+R()*.01;
  P.add(new THREE.CylinderGeometry(.008,.01,len,6),at(x,-.44-len/2,-.012,[.35,0,0]),armSkin);
  P.add(new THREE.ConeGeometry(.008,.024,5),at(x,-.444-len,-.03,[Math.PI+.5,0,0]),C.nail);
 }
 P.add(new THREE.CylinderGeometry(.009,.011,.05,6),at(-side*.04,-.41,-.004,[.2,0,side*.6]),armSkin);
 return P.merge();
}

let shared=null;
function geometry(name){
 if(!shared){
  shared={species:new Map(),
   flesh:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,side:THREE.DoubleSide}),
   eye:new THREE.MeshStandardMaterial({color:0xd8e0a0,emissive:0x7a8a20,emissiveIntensity:1.6,roughness:.3})};
 }
 if(!shared.species.has(name)){
  const o=ZOMBIES[name],skin=rgb(o.skin),R=rng(name.length*131+name.charCodeAt(0));
  shared.species.set(name,{body:buildBody(o,skin,R),head:buildHead(o,skin,R),eyes:buildEyes(),
   leg:{'-1':buildLeg(o,skin,R,-1),'1':buildLeg(o,skin,R,1)},arm:{'-1':buildArm(o,skin,R,-1),'1':buildArm(o,skin,R,1)}});
 }
 return shared.species.get(name);
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createZombie(name){
 if(!ZOMBIES[name])name='human zombie';
 const o=ZOMBIES[name],S=geometry(name);
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.set(o.scale*o.wide,o.scale,o.scale*o.wide);
 mesh(body,S.body,shared.flesh,'body');
 // the undead stoop (no sideways list: trudge.js owns body.rotation.z for its lurch)
 body.rotation.x=.16;
 const heads=[];
 for(const x of o.heads===2?[-.12,.12]:[0]){
  const head=new THREE.Group();head.position.set(x,1.02,.03);
  // the head lolls forward and to the side
  head.rotation.set(.22,0,o.heads===2?-x*1.6:-.2);if(o.heads===2)head.scale.setScalar(.88);body.add(head);
  mesh(head,S.head,shared.flesh,'head');mesh(head,S.eyes,shared.eye,'eyes');heads.push(head);
 }
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.095,.455,0);body.add(leg);mesh(leg,S.leg[s],shared.flesh,'leg');legs.push(leg);
  // the right arm reaches straight out; the stripped left one hangs lower
  const arm=new THREE.Group();arm.position.set(s*.225,.83,0);arm.rotation.set(s>0?-1.38:-1.05,0,s*.1);body.add(arm);mesh(arm,S.arm[s],shared.flesh,'arm');arms.push(arm);
 }
 return {g,body,legs,tail:null,wings:[],quirk:'zombie',arms,arm:arms[1],head:heads[0],heads,hat:null,beard:null,pick:null};
}
