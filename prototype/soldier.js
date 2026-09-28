import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Soldiers, sergeants, lieutenants, captains and the vault and prison guards used to be the generic
// guard humanoid (a steel block with a plumed can and a spear). They now wear a quilted gambeson
// in their company's livery (drab for soldiers, red for sergeants, green for lieutenants, blue for
// captains and guards) under a ridged steel cuirass with a two-lame fauld and tassets, steel
// pauldrons, couters and vambraces, livery hose with knee cops and boots.
// - soldier, guard, prison guard: an open sallet with a flared tail, a leaf-bladed spear and a
//   painted heater shield with a steel rim, boss and a pale.
// - sergeant: the same with a red horsehair crest, a gold chevron on the shield and gold chevrons
//   on both sleeves, and an arming sword in place of the spear.
// - lieutenant: a combed morion with an upswept brim and a green plume, a gold gorget and sash,
//   and an arming sword.
// - captain: a gilt-edged cuirass, gold-rimmed pauldrons, full greaves, a blue cape, a gorget and
//   an armet with its visor raised under a blue plume; a gilded longsword.
// Each moving part is one merged, vertex-coloured mesh with a shared material: 8 draws with a
// shield, 7 without. Geometry is built once per kind.
// Handles: legs, arms, arm (the weapon arm), weaponSocket, shieldArm (the other arm), head, body.

const SKIN=rgb('#d8ac88'),SKIN_SHADE=rgb('#b08060'),EYE=rgb('#1a1410'),LIPS=rgb('#a26052');
const HAIR=rgb('#3e2a1c'),STUBBLE=rgb('#9a7a60');
const IRON=rgb('#555b62'),STEEL=rgb('#a7aeb6'),STEEL_HI=rgb('#dfe4e8'),STEEL_DARK=rgb('#383c42');
const GOLD=rgb('#d8aa3a'),GOLD_DARK=rgb('#8a6420'),BRASS=rgb('#c0923a');
const LEATHER=rgb('#5a3a22'),LEATHER_DARK=rgb('#33200f'),SOLE=rgb('#241a12');
const WOOD=rgb('#8a6440'),WOOD_DARK=rgb('#5a3e24'),PALE=rgb('#e8e0cc');

const KINDS={
 soldier:{livery:rgb('#6a6c5c'),helm:'sallet',weapon:'spear',shield:true},
 guard:{livery:rgb('#2c4488'),helm:'sallet',weapon:'spear',shield:true},
 'prison guard':{livery:rgb('#5a5048'),helm:'sallet',weapon:'spear',shield:true},
 sergeant:{livery:rgb('#8e2a22'),helm:'sallet',crest:true,weapon:'sword',shield:true,chevrons:true},
 lieutenant:{livery:rgb('#2e6a36'),helm:'morion',weapon:'sword',sash:true},
 captain:{livery:rgb('#253f82'),helm:'armet',weapon:'longsword',cape:true,gilt:true},
};

// a lathe whose profile is subdivided so vertex-painted patterns have rows to land on
function lathe(profile,segments=24,phiStart=0,phiLength=Math.PI*2,sub=1){
 const pts=[];
 for(let i=0;i<profile.length;i++){
  if(i===0){pts.push(profile[0]);continue;}
  const [r0,h0]=profile[i-1],[r1,h1]=profile[i];
  for(let j=1;j<=sub;j++)pts.push([r0+(r1-r0)*j/sub,h0+(h1-h0)*j/sub]);
 }
 return new THREE.LatheGeometry(pts.map(([r,h])=>new THREE.Vector2(r,h)),segments,phiStart,phiLength);
}
const ramp=(a,b,lo,hi)=>y=>mix(a,b,(y-lo)/(hi-lo));
// diamond quilting: dark stitch lines on the livery, shading toward the hem
const quilt=(base,lo,hi)=>(x,y,z)=>{
 const dark=mix(base,[0,0,0],.45),a=Math.atan2(x,z)*5.5,u=a+y*38,v=a-y*38;
 const f=Math.min(Math.abs(u-Math.round(u)),Math.abs(v-Math.round(v)));
 return mix(ramp(dark,base,lo,hi)(y),dark,f<.09?.6:0);
};
// polished plate: a bright centre ridge falling off to darker flanks
const plate=(gilt,lo,hi)=>(x,y,z)=>{
 if(gilt&&(y>hi-.018||y<lo+.014))return GOLD;
 if(z>0&&Math.abs(x)<.01)return STEEL_HI;
 return mix(STEEL,IRON,Math.min(1,Math.abs(x)/.2+Math.max(0,-z)*2));
};

function buildBody(k){
 const P=pieces(),{livery,gilt}=k;
 // gambeson: a quilted skirt below the cuirass and a high collar above it
 P.add(lathe([[.15,.36],[.168,.4],[.164,.5],[.156,.62]],32,0,Math.PI*2,6),at(0,0,0,[0,0,0],[1,1,.8]),quilt(livery,.36,.62));
 P.add(new THREE.CircleGeometry(.15,24),at(0,.361,0,[Math.PI/2,0,0],[1,.8,1]),mix(livery,[0,0,0],.5));
 P.add(lathe([[.07,.955],[.086,.925],[.1,.9]],24),at(0,0,0,[0,0,0],[1,1,.85]),quilt(livery,.88,.96));
 // the cuirass: a ridged breastplate and backplate as one shell, its rolled neck edge
 P.add(lathe([[.16,.6],[.174,.66],[.184,.74],[.18,.82],[.162,.865],[.11,.9]],36,0,Math.PI*2,3),at(0,0,0,[0,0,0],[1,1,.8]),plate(gilt,.6,.9));
 P.add(new THREE.TorusGeometry(.11,.007,5,28),at(0,.9,0,[Math.PI/2,0,0],[1,.8,1]),gilt?GOLD:STEEL_HI);
 // fauld: two overlapping lames flaring over the hips, rivets at the sides
 for(const [i,y] of [[0,.6],[1,.565]]){
  P.add(lathe([[.165+i*.006,y],[.172+i*.008,y-.042]],32),at(0,0,0,[0,0,0],[1,1,.82]),(x,yy)=>yy<y-.036?(gilt?GOLD:STEEL_DARK):mix(STEEL,IRON,Math.abs(x)/.2));
  for(const s of [-1,1])P.add(new THREE.SphereGeometry(.006,5,4),at(s*.168,y-.02,0),BRASS);
 }
 // tassets hanging over the thighs
 for(const s of [-1,1]){
  P.add(new THREE.BoxGeometry(.1,.1,.01,1,4,1),at(s*.075,.47,.138,[-.12,0,s*.06]),(x,y)=>ramp(IRON,STEEL,.42,.52)(y));
  P.add(new THREE.BoxGeometry(.1,.008,.013),at(s*.075,.44,.144,[-.12,0,s*.06]),gilt?GOLD:STEEL_DARK);
 }
 // a leather sword belt over the fauld with a brass buckle
 P.add(new THREE.TorusGeometry(.17,.01,5,32),at(0,.53,0,[Math.PI/2,0,0],[1,.84,1]),LEATHER);
 P.add(new THREE.BoxGeometry(.036,.03,.012),at(0,.53,.146),BRASS);
 P.add(new THREE.CylinderGeometry(.042,.048,.06,10),at(0,.94,0),SKIN_SHADE);
 if(k.sash||k.cape){
  // gilt gorget over the collar
  P.add(new THREE.CylinderGeometry(.06,.075,.03,6,1,false,-Math.PI*.42,Math.PI*.84),at(0,.905,.03,[-.35,0,0]),GOLD);
 }
 if(k.sash){
  // gold sash from the right shoulder to the left hip, knotted with fringed tails
  const SASH=rgb('#d8b24a'),SASH_DARK=rgb('#8a6a24');
  P.add(new THREE.BoxGeometry(.05,.44,.012,1,12,1),at(0,.7,.148,[-.03,0,-.7]),(x,y)=>ramp(SASH_DARK,SASH,.48,.92)(y));
  P.add(new THREE.BoxGeometry(.05,.44,.012,1,12,1),at(0,.7,-.148,[.03,0,.7]),SASH_DARK);
  P.add(new THREE.SphereGeometry(.028,10,8),at(-.15,.55,.07,[0,0,0],[1,1,.6]),SASH);
  for(const s of [-1,1]){
   P.add(new THREE.BoxGeometry(.026,.11,.008),at(-.16+s*.012,.48,.08,[0,.9,s*.15]),SASH_DARK);
   for(let i=0;i<4;i++)P.add(new THREE.CylinderGeometry(.002,.002,.03,3),at(-.16+s*.012+(i-1.5)*.006,.412,.08),GOLD);
  }
 }
 if(k.cape){
  // a blue cape hung from the shoulders behind, lined darker, open at the front
  const dark=mix(livery,[0,0,0],.4);
  P.add(lathe([[.205,.89],[.22,.8],[.255,.6],[.28,.36]],20,Math.PI-1.2,2.4,3),at(0,0,-.025,[0,0,0],[1,1,.78]),(x,y,z)=>mix(ramp(dark,livery,.36,.89)(y),dark,Math.sin(Math.atan2(x,-z)*9)>.6?.35:0));
  P.add(new THREE.TorusGeometry(.2,.01,5,18,2.4),at(0,.892,-.025,[Math.PI/2,0,Math.PI/2+1.2],[1,.78,1]),GOLD);
 }
 return P.merge();
}

function buildHead(k){
 const P=pieces(),{livery}=k;
 // a lean face with a strong jaw, a blunt nose, heavy brows and a stubbled chin
 P.add(new THREE.SphereGeometry(.1,18,14),at(0,.1,0,[0,0,0],[.9,1.05,.95]),(x,y,z)=>y<.07&&z>.03?mix(SKIN,STUBBLE,.45):SKIN);
 P.add(new THREE.ConeGeometry(.015,.038,5),at(0,.088,.1,[Math.PI/2-.35,0,0]),SKIN_SHADE);
 P.add(new THREE.SphereGeometry(.013,8,6),at(0,.05,.085,[0,0,0],[1.5,.4,.6]),LIPS);
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.02,8,6),at(s*.092,.095,-.005,[0,0,0],[.5,1,.8]),SKIN_SHADE);
  P.add(new THREE.SphereGeometry(.012,8,6),at(s*.035,.108,.086,[0,0,0],[1.3,.8,.6]),EYE);
  P.add(new THREE.BoxGeometry(.04,.012,.012),at(s*.036,.127,.088,[0,0,s*.14]),HAIR);
 }
 if(k.gilt)for(const s of [-1,1])P.add(new THREE.SphereGeometry(.017,8,6),at(s*.022,.066,.089,[0,0,s*-.45],[1.6,.5,.6]),HAIR);
 if(k.helm==='sallet'){
  // open sallet: a rounded skull with a brow band, a long tail flaring over the nape, rivets
  P.add(new THREE.SphereGeometry(.114,20,10,0,Math.PI*2,0,Math.PI*.5),at(0,.13,0,[0,0,0],[1,1.02,1.08]),(x,y,z)=>z>0&&Math.abs(x)<.008?STEEL_HI:ramp(IRON,STEEL,.14,.24)(y));
  P.add(lathe([[.114,.135],[.126,.1],[.158,.045]],24,Math.PI-1.35,2.7,3),at(0,0,0,[0,0,0],[1,1,1.08]),(x,y)=>ramp(STEEL_DARK,STEEL,.045,.135)(y));
  P.add(new THREE.CylinderGeometry(.117,.117,.018,24,1,true,-Math.PI*.46,Math.PI*.92),at(0,.137,0,[0,0,0],[1,1,1.08]),STEEL_HI);
  for(let i=0;i<9;i++){const a=(i/8-.5)*Math.PI*1.6;P.add(new THREE.SphereGeometry(.005,5,4),at(Math.sin(a)*.118,.14,Math.cos(a)*.127),BRASS);}
  for(const s of [-1,1])P.add(new THREE.BoxGeometry(.008,.09,.012),at(s*.088,.08,.02,[0,0,s*-.12]),LEATHER_DARK);
  if(k.crest){
   // a stiff red horsehair crest along the crown, front to back
   for(let i=0;i<9;i++){const b=(i/8-.5)*2.1;P.add(new THREE.SphereGeometry(.024,8,6),at(0,.13+Math.cos(b)*.128,Math.sin(b)*.132,[b,0,0],[.45,1.3,1]),mix(livery,[1,.6,.5],.12*Math.cos(b*3)));}
  }
 }else if(k.helm==='morion'){
  // a tall combed skull, a brim swept up to points front and back, brass rivets and a green plume
  P.add(new THREE.SphereGeometry(.11,20,10,0,Math.PI*2,0,Math.PI*.5),at(0,.13,0,[0,0,0],[1,1.22,1.08]),(x,y)=>ramp(IRON,STEEL,.14,.26)(y));
  P.add(new THREE.TorusGeometry(.1,.024,4,22,Math.PI),at(0,.2,0,[0,Math.PI/2,0],[1,.62,.4]),(x,y)=>y>.25?STEEL_HI:STEEL);
  const brim=lathe([[.106,.136],[.16,.12],[.19,.126],[.186,.122],[.104,.13]],40);
  const p=brim.attributes.position;
  for(let i=0;i<p.count;i++){const z=p.getZ(i),x=p.getX(i);p.setY(i,p.getY(i)+Math.max(0,z*z*1.9-x*x*.4));}
  brim.computeVertexNormals();
  P.add(brim,at(0,0,0,[0,0,0],[1,1,1.12]),(x,y)=>y>.14?STEEL_HI:STEEL);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;P.add(new THREE.SphereGeometry(.005,5,4),at(Math.sin(a)*.112,.142,Math.cos(a)*.121),BRASS);}
  P.add(new THREE.CylinderGeometry(.01,.014,.04,8),at(.1,.19,-.02,[0,0,-.5]),BRASS);
  for(let i=0;i<5;i++)P.add(new THREE.SphereGeometry(.028-i*.003,10,8),at(.11+i*.006,.22+Math.sin(i*.6)*.02,-.04-i*.032,[.4,0,0],[.8,.55,1.6]),mix(livery,[.6,.9,.55],.3-i*.05));
  for(const s of [-1,1])P.add(new THREE.BoxGeometry(.008,.09,.012),at(s*.088,.08,.02,[0,0,s*-.12]),LEATHER_DARK);
 }else{
  // armet with the visor raised: a polished skull and back plate, a bevor over the jaw, the
  // pierced visor pivoted up on gold rivets, a gilt crown band and a blue plume
  P.add(new THREE.SphereGeometry(.116,22,12,0,Math.PI*2,0,Math.PI*.58),at(0,.12,0,[0,0,0],[1,1.05,1.06]),(x,y,z)=>z>0&&Math.abs(x)<.008?STEEL_HI:ramp(IRON,STEEL_HI,.12,.24)(y));
  P.add(new THREE.CylinderGeometry(.118,.108,.1,22,1,true,Math.PI*.55,Math.PI*.9),at(0,.07,0,[0,0,0],[1,1,1.06]),(x,y)=>ramp(IRON,STEEL,.02,.12)(y));
  P.add(new THREE.CylinderGeometry(.11,.098,.06,22,1,true,-Math.PI*.42,Math.PI*.84),at(0,.03,.004,[-.12,0,0]),(x,y)=>y>.05?GOLD:mix(STEEL,IRON,Math.abs(x)/.12));
  P.add(new THREE.SphereGeometry(.124,22,6,Math.PI*.12,Math.PI*.76,Math.PI*.1,Math.PI*.2),at(0,.13,0,[-.12,0,0],[1,1.05,1.08]),(x,y,z)=>Math.abs(y-.215)<.006&&Math.sin(x*140)>0?STEEL_DARK:STEEL);
  for(const s of [-1,1])P.add(new THREE.SphereGeometry(.011,8,6),at(s*.116,.14,0),GOLD);
  P.add(new THREE.CylinderGeometry(.12,.12,.012,24,1,true),at(0,.15,0,[0,0,0],[1,1,1.06]),GOLD);
  P.add(new THREE.CylinderGeometry(.012,.016,.04,8),at(0,.245,-.05,[-.5,0,0]),GOLD);
  for(let i=0;i<6;i++)P.add(new THREE.SphereGeometry(.032-i*.003,10,8),at(0,.265+Math.sin(i*.6)*.025,-.07-i*.034,[.4,0,0],[.8,.55,1.6]),mix(livery,[.7,.8,1],.3-i*.04));
 }
 return P.merge();
}

// livery hose, a steel knee cop, a boot; the captain wears full greaves and sabatons
function buildLeg(k){
 const P=pieces(),hose=mix(k.livery,[0,0,0],.3);
 P.add(new THREE.CylinderGeometry(.052,.044,.24,12),at(0,-.12,0),hose);
 P.add(new THREE.SphereGeometry(.05,12,8),at(0,-.22,.02,[0,0,0],[1,1,.8]),(x,y,z)=>z>.05?STEEL_HI:STEEL);
 if(k.gilt){
  P.add(new THREE.CylinderGeometry(.047,.042,.2,14),at(0,-.34,.005),(x,y,z)=>z>0&&Math.abs(x)<.006?STEEL_HI:mix(STEEL,IRON,Math.abs(x)/.05));
  P.add(new THREE.CylinderGeometry(.049,.049,.01,14),at(0,-.245,.005),GOLD);
  P.add(new THREE.SphereGeometry(.046,12,8),at(0,-.43,.055,[0,0,0],[.95,.6,1.7]),(x,y,z)=>Math.sin(z*150)>.4?STEEL_DARK:STEEL);
 }else{
  P.add(new THREE.CylinderGeometry(.046,.042,.2,12),at(0,-.34,.005),(x,y)=>ramp(LEATHER_DARK,LEATHER,-.44,-.24)(y));
  P.add(new THREE.SphereGeometry(.046,10,8),at(0,-.43,.055,[0,0,0],[.95,.6,1.7]),LEATHER);
 }
 P.add(new THREE.BoxGeometry(.085,.018,.17),at(0,-.458,.045),SOLE);
 return P.merge();
}

// a quilted sleeve under a steel pauldron, a couter at the elbow, a vambrace and a gauntlet;
// sergeant's chevrons on the outer sleeve, gold-rimmed pauldrons for the captain
function buildArm(k,s){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.047,.038,.22,14,8),at(0,-.1,0),quilt(k.livery,-.21,.01));
 P.add(new THREE.SphereGeometry(.072,16,8,0,Math.PI*2,0,Math.PI*.5),at(0,-.005,0,[0,0,0],[1.08,.75,1]),(x,y)=>ramp(IRON,STEEL_HI,-.005,.05)(y));
 for(const [i,y] of [[0,-.03],[1,-.058]])P.add(new THREE.CylinderGeometry(.077-i*.004,.074-i*.004,.028,16,1,true),at(0,y,0,[0,0,0],[1.02,1,.94]),k.gilt&&i===1?GOLD:mix(STEEL,IRON,.3+i*.2));
 if(k.chevrons)for(let i=0;i<2;i++)for(const d of [-1,1])P.add(new THREE.BoxGeometry(.005,.011,.036),at(s*.045,-.12-i*.022,d*.013,[d*.62,0,0]),GOLD);
 P.add(new THREE.SphereGeometry(.04,10,8),at(0,-.215,-.008,[0,0,0],[1,.9,1]),(x,y,z)=>z<-.03?STEEL_HI:STEEL);
 P.add(new THREE.CylinderGeometry(.038,.032,.12,12),at(0,-.285,0),(x,y,z)=>z>0&&Math.abs(x)<.006?STEEL_HI:mix(STEEL,IRON,Math.abs(x)/.04));
 P.add(new THREE.CylinderGeometry(.037,.042,.03,12),at(0,-.34,0),k.gilt?GOLD:STEEL_DARK);
 P.add(new THREE.SphereGeometry(.033,8,8),at(0,-.37,.005,[0,0,0],[.85,1.15,1]),(x,y)=>Math.sin(y*220)>.3?STEEL:IRON);
 return P.merge();
}

// a leaf-bladed spear planted beside the soldier: an ash shaft with a leather grip and an iron
// butt, a socket bound in livery with a tassel, and a diamond-section blade. Built along +y from
// the grip.
function buildSpear(k){
 const P=pieces();
 P.add(new THREE.CylinderGeometry(.013,.015,1.3,8,12),at(0,.21,0),(x,y)=>Math.abs(y)<.07?LEATHER_DARK:mix(WOOD_DARK,WOOD,.5+.5*Math.sin(y*31)));
 P.add(new THREE.CylinderGeometry(.017,.013,.05,8),at(0,-.44,0),IRON);
 P.add(new THREE.CylinderGeometry(.012,.017,.06,8),at(0,.88,0),IRON);
 P.add(new THREE.CylinderGeometry(.018,.018,.018,8),at(0,.85,0),k.livery);
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2;P.add(new THREE.CylinderGeometry(.003,.001,.06,3),at(Math.sin(a)*.014,.815,Math.cos(a)*.014),k.livery);}
 const lower=new THREE.CylinderGeometry(.028,.006,.04,4,2),upper=new THREE.CylinderGeometry(.001,.028,.075,4,4);
 P.add(lower,at(0,.93,0,[0,0,0],[1,1,.3]),STEEL);
 P.add(upper,at(0,.9875,0,[0,0,0],[1,1,.3]),(x,y,z)=>Math.abs(x)<.004?STEEL_HI:STEEL);
 return P.merge();
}

// an arming sword held upright; the captain's is longer with a gilt cross, blue grip and pommel
function buildSword(k){
 const P=pieces(),gilt=k.weapon==='longsword',len=gilt?.68:.58;
 const blade=new THREE.CylinderGeometry(.001,.019,len,4,8);
 P.add(blade,at(0,.07+len/2,0,[0,0,0],[1,1,.25]),(x,y)=>Math.abs(x)<.004&&y<len*.55?IRON:STEEL_HI);
 P.add(new THREE.BoxGeometry(gilt?.15:.12,.014,.02),at(0,.065,0),gilt?GOLD:STEEL);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.011,8,6),at(s*(gilt?.077:.062),.068,0),gilt?GOLD_DARK:IRON);
 P.add(new THREE.CylinderGeometry(.012,.013,gilt?.12:.09,8),at(0,gilt?0:.015,0),(x,y)=>Math.sin(y*260)>0?(gilt?k.livery:LEATHER_DARK):(gilt?GOLD:LEATHER));
 P.add(new THREE.SphereGeometry(.022,10,8),at(0,gilt?-.068:-.038,0,[0,0,0],[1,.8,.7]),gilt?GOLD:STEEL);
 return P.merge();
}

// a heater shield painted in livery with a proud steel rim, a boss and the company's charge (a
// pale, or the sergeant's gold chevron). Built in its own plane; +z is the face.
function heater(scale=1){
 const w=.12*scale,t=.12*scale,b=-.19*scale,sh=new THREE.Shape();
 sh.moveTo(-w,t);sh.lineTo(w,t);sh.lineTo(w,0);sh.quadraticCurveTo(w*.85,b*.62,0,b);sh.quadraticCurveTo(-w*.85,b*.62,-w,0);sh.lineTo(-w,t);
 return sh;
}
function buildShield(k){
 const P=pieces(),ext=d=>({depth:d,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:1,curveSegments:10});
 P.add(new THREE.ExtrudeGeometry(heater(),ext(.014)),at(0,0,0),(x,y,z)=>z>.01?k.livery:WOOD_DARK);
 const ring=heater(1);ring.holes.push(new THREE.Path(heater(.87).getPoints(24).map(p=>new THREE.Vector2(p.x,p.y+.006)).reverse()));
 P.add(new THREE.ExtrudeGeometry(ring,ext(.006)),at(0,0,.012),STEEL);
 if(k.chevrons){
  for(const d of [-1,1])P.add(new THREE.BoxGeometry(.15,.036,.004),at(d*.052,-.035,.018,[0,0,d*.62]),GOLD);
 }else{
  P.add(new THREE.BoxGeometry(.06,.26,.004),at(0,-.02,.018),PALE);
 }
 P.add(new THREE.SphereGeometry(.032,14,8,0,Math.PI*2,0,Math.PI*.5),at(0,-.01,.02,[Math.PI/2,0,0],[1,.6,1]),(x,y,z)=>z>.035?STEEL_HI:STEEL);
 for(const [x,y] of [[-.085,.085],[.085,.085],[0,-.14]])P.add(new THREE.SphereGeometry(.006,5,4),at(x,y,.02),BRASS);
 // strap on the back
 P.add(new THREE.BoxGeometry(.02,.14,.01),at(0,0,-.006),LEATHER);
 return P.merge();
}

const cache={};let material=null;
function geometry(name){
 if(!material)material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.22,side:THREE.DoubleSide});
 if(cache[name])return cache[name];
 const k=KINDS[name];
 return cache[name]={k,body:buildBody(k),head:buildHead(k),leg:buildLeg(k),arms:[buildArm(k,-1),buildArm(k,1)],weapon:k.weapon==='spear'?buildSpear(k):buildSword(k),shield:k.shield?buildShield(k):null};
}
function mesh(parent,geo,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export const SOLDIERS=Object.keys(KINDS);

export function createSoldier(name){
 const S=geometry(KINDS[name]?name:'soldier'),g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,'body');
 const head=new THREE.Group();head.position.set(0,.955,0);body.add(head);
 mesh(head,S.head,'head');
 const legs=[],arms=[];
 for(const [i,s] of [[0,-1],[1,1]]){
  const leg=new THREE.Group();leg.position.set(s*.08,.47,0);body.add(leg);mesh(leg,S.leg,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.205,.82,0);if(s>0)arm.rotation.z=.08;body.add(arm);mesh(arm,S.arms[i],'arm');arms.push(arm);
 }
 const weaponSocket=new THREE.Group();weaponSocket.position.set(0,-.37,.012);weaponSocket.rotation.z=-.08;arms[1].add(weaponSocket);
 mesh(weaponSocket,S.weapon,S.k.weapon);
 let shield=null;
 if(S.shield){
  // strapped to the outside of the left forearm, point down, face outward; that arm rests
  // straight so a shieldArm pose (rotation.z from 0) doesn't jolt it
  shield=new THREE.Group();shield.position.set(-.058,-.25,.03);shield.rotation.y=-Math.PI/2;arms[0].add(shield);
  mesh(shield,S.shield,'shield');
 }
 return {g,body,legs,tail:null,wings:[],quirk:'guard',kind:name,arms,arm:arms[1],weaponSocket,shieldArm:arms[0],shield,head,hat:null,beard:null,pick:null};
}
