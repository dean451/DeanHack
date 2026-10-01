import * as THREE from 'three';
import {createOilLamp} from './oil-lamp.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
function kit(name){
 const g=new THREE.Group();g.name=name;const geometries=new Set(),materials=new Set();
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.7,...extra});materials.add(m);return m;};
 const mesh=(geo,m,x=0,y=0,z=0,p=g)=>{geometries.add(geo);const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;};
 const ball=(m,x,y,z,a,b,c,p=g)=>{const o=mesh(new THREE.SphereGeometry(1,20,14),m,x,y,z,p);o.scale.set(a,b,c);return o;};
 const box=(m,x,y,z,a,b,c,p=g)=>mesh(new RoundedBoxGeometry(a,b,c,3,.025),m,x,y,z,p);
 const cyl=(m,x,y,z,a,b,h,n=16)=>mesh(new THREE.CylinderGeometry(a,b,h,n),m,x,y,z);
 const ring=(m,x,y,z,r,t)=>mesh(new THREE.TorusGeometry(r,t,8,32),m,x,y,z);
 g.userData.dispose=()=>{geometries.forEach(o=>o.dispose());materials.forEach(o=>o.dispose());};
 return {g,mat,mesh,ball,box,cyl,ring};
}
// Shopkeepers and watchmen share their models with the creature builder (shopkeeper.js, watch.js),
// so Live and the gallery draw the same figure.
export {createShopkeeper} from './shopkeeper.js';
import {createWatch} from './watch.js';
export const createWatchman=()=>createWatch('watchman');

export function createShopItem(name){
 const n=name.toLowerCase();
 if(/pick-axe|pickaxe/.test(n))return createPick(name,false);
 // A dwarvish mattock shows as "broad pick" until identified; both names draw the same model.
 if(/dwarvish mattock|broad pick/.test(n))return createPick(name,true);
 // UnNetHack's crystal pick: a pick-axe whose head is cut from glass.
 if(/crystal pick/.test(n))return createPick(name,false,true);
 if(/lock pick/.test(n))return createLockPick(name);
 if(/skeleton key/.test(n))return createSkeletonKey(name);
 if(/can of grease/.test(n))return createGreaseCan(name);
 return null;
}
// An opened can of grease: a beaded tin with a rolled rim, a torn paper label and a soldered seam,
// brimming with amber grease that has slumped over the rim and run down the side. Its prised-off lid
// lies lip-up beside it, smeared inside. Two merged, vertex-coloured meshes: the tin and lid in one
// metal material, the label and grease in one soft, glossy one.
function createGreaseCan(name){
 const {g,mat,mesh}=kit(name);g.userData.restingWeapon=true;
 const metal=[],soft=[],c=new THREE.Color();
 const tin=new THREE.Color(0x98a2a4),grime=new THREE.Color(0x3b3a33),shine=new THREE.Color(0xdde3e4),amber=new THREE.Color(0xb98a2e),dark=new THREE.Color(0x5e3f12),gloss=new THREE.Color(0xf0cf78);
 const paper=new THREE.Color(0x8e3326),cream=new THREE.Color(0xe2d3a8),ink=new THREE.Color(0x221a14);
 const noise=(a,b)=>{const v=Math.sin(a*12.9898+b*78.233)*43758.5453;return v-Math.floor(v);};
 const put=(list,geo,tone)=>{geo.deleteAttribute('uv');const p=geo.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));list.push(geo);return geo;};
 const lathe=(profile,segments=40)=>new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),segments);
 const R=.084,cx=.05,run=Math.PI*-.35,ux=Math.cos(run),uz=Math.sin(run);
 // The can: a recessed base, a rolled foot, two stiffening beads and a rolled rim with the wall turned in.
 const can=lathe([[0,.005],[.074,.005],[.08,.001],[.087,.003],[.089,.01],[.085,.018],[R,.022],[R,.056],[.0865,.06],[R,.064],
  [R,.13],[.0865,.134],[R,.138],[R,.176],[.088,.181],[.0905,.187],[.088,.192],[.083,.19],[.079,.185],[.079,.165],[0,.165]],48);
 can.translate(cx,0,0);
 put(metal,can,(x,y,z,col)=>{
  const a=Math.atan2(z,x-cx),r=Math.hypot(x-cx,z);
  col.copy(tin).lerp(grime,.12+.4*Math.max(0,1-y/.05)+.18*noise(Math.round(a*9),Math.round(y*60)));
  if(y>.18&&r>.083)col.lerp(shine,.45);// the rim catches the light
  if(Math.abs(a-Math.PI*.8)<.05)col.lerp(grime,.55);// soldered side seam
  // Grease smeared round the top and where the run has come down.
  if(y>.15||Math.abs(a-run)<.28&&y>.06)col.lerp(amber,.35*noise(a*7,y*30)+.15);
 });
 // Paper label round the waist, torn away over the seam: red with a cream band and inked rules.
 const gap=.7,label=new THREE.CylinderGeometry(R+.0012,R+.0012,.064,48,4,true,Math.PI/2-Math.PI*.8+gap/2,Math.PI*2-gap);
 label.translate(cx,.097,0);
 put(soft,label,(x,y,z,col)=>{
  col.copy(paper);const band=Math.abs(y-.097);
  if(band<.012)col.copy(cream);else if(band<.015)col.copy(ink);
  if(y<.07||y>.124)col.lerp(ink,.35);
  col.lerp(cream,.12*noise(x*90,y*90));
 });
 // Grease: a domed, brimming surface that slumps over the rim on one side and runs down the wall.
 const dome=new THREE.SphereGeometry(1,32,10,0,Math.PI*2,0,Math.PI/2);dome.scale(.082,.022,.082);dome.translate(cx,.178,0);
 const glossTone=(x,y,z,col)=>{col.copy(amber).lerp(dark,.35*noise(x*70,z*70));if(y>.19)col.lerp(gloss,Math.min(1,(y-.19)/.01)*.6);};
 put(soft,dome,glossTone);
 const lobe=new THREE.SphereGeometry(1,16,10);lobe.scale(.028,.016,.032);lobe.translate(cx+ux*.084,.186,uz*.084);put(soft,lobe,glossTone);
 const runCurve=new THREE.CatmullRomCurve3([[.088,.19],[.093,.17],[.091,.13],[.0905,.1],[.0905,.075]].map(([r,y])=>new THREE.Vector3(cx+ux*r,y,uz*r)));
 const drip=new THREE.TubeGeometry(runCurve,20,.0065,8);put(soft,drip,glossTone);
 const bead=new THREE.SphereGeometry(1,14,10);bead.scale(.0095,.013,.0095);bead.translate(cx+ux*.0905,.07,uz*.0905);put(soft,bead,glossTone);
 // A dollop that has fallen on the floor beside the can.
 const puddle=new THREE.SphereGeometry(1,20,6,0,Math.PI*2,0,Math.PI/2);puddle.scale(.034,.007,.026);puddle.translate(cx+ux*.13,0,uz*.13);put(soft,puddle,glossTone);
 // The prised-off lid, lip up, with grease smeared on its underside.
 const lx=-.14,lz=.07;
 const lid=lathe([[0,.002],[.078,.002],[.084,0],[.089,.004],[.09,.012],[.087,.014],[.084,.008],[.079,.006],[0,.006]]);
 lid.translate(lx,0,lz);
 put(metal,lid,(x,y,z,col)=>{const r=Math.hypot(x-lx,z-lz);col.copy(tin).lerp(grime,.2*noise(x*50,z*50));
  if(y>.01)col.lerp(shine,.4);if(r<.08&&y>.005)col.lerp(amber,.3);});
 const smear=new THREE.SphereGeometry(1,20,6,0,Math.PI*2,0,Math.PI/2);smear.scale(.055,.004,.045);smear.translate(lx+.01,.006,lz-.005);put(soft,smear,glossTone);
 const merged=(list,m,part)=>{const geo=mergeGeometries(list);list.forEach(q=>q.dispose());const o=mesh(geo,m);o.userData.part=part;return o;};
 merged(metal,mat(0xffffff,{vertexColors:true,metalness:.6,roughness:.35}),'tin');
 merged(soft,mat(0xffffff,{vertexColors:true,roughness:.3}),'grease');
 return g;
}
// An old brass skeleton key dropped flat on the floor: a trefoil bow of three linked rings round a
// boss, a turned collar, a hollow barrel shaft and a stepped, warded bit. One merged mesh; vertex
// colours give tarnish in the recesses, fingers' polish on the bow and a dark bore in the barrel.
function createSkeletonKey(name){
 const {g,mat,mesh}=kit(name);g.userData.restingWeapon=true;
 const parts=[],c=new THREE.Color(),brass=new THREE.Color(0xb08d45),polish=new THREE.Color(0xe8cf86),tarnish=new THREE.Color(0x5b4a2a),bore=new THREE.Color(0x15110b);
 const noise=(a,b)=>{const v=Math.sin(a*12.9898+b*78.233)*43758.5453;return v-Math.floor(v);};
 // tone(x,y,z) picks each vertex's colour from its place on the key.
 const put=(geo,tone)=>{const p=geo.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));parts.push(geo);return geo;};
 const worn=(x,y,z,col)=>{col.copy(brass).lerp(tarnish,noise(x*40,z*40)*.35);if(y>.017)col.lerp(polish,.45);};
 const T=.012,Y=T;// flat parts are T thick, centred at y=Y
 // Bow: three rings on a trefoil round (bx,0), opening away from the shaft, with a boss where they meet.
 const bx=-.2;
 for(const a of [Math.PI,Math.PI*.4,-Math.PI*.4]){
  const r=new THREE.TorusGeometry(.03,.0085,8,24);r.rotateX(Math.PI/2);r.translate(bx+Math.cos(a)*.033,Y,Math.sin(a)*.033);
  put(r,(x,y,z,col)=>{worn(x,y,z,col);col.lerp(polish,.2);});
 }
 const boss=new THREE.CylinderGeometry(.017,.017,T*1.3,14);boss.translate(bx,Y,0);put(boss,(x,y,z,col)=>{worn(x,y,z,col);if(y>Y)col.lerp(polish,.3);});
 const neck=new THREE.BoxGeometry(.05,T,.02);neck.translate(bx+.04,Y,0);put(neck,worn);
 // Collar: a turned bead between two rings where the bow meets the shaft.
 const lathe=(x0,len,profile)=>{const geo=new THREE.LatheGeometry(profile.map(([rr,t])=>new THREE.Vector2(rr,t*len)),12);geo.rotateZ(-Math.PI/2);geo.translate(x0,Y,0);return geo;};
 put(lathe(-.145,.055,[[0,0],[.013,0],[.016,.08],[.013,.2],[.012,.28],[.019,.5],[.012,.72],[.013,.8],[.016,.92],[.013,1],[0,1]]),(x,y,z,col)=>{
  worn(x,y,z,col);if(Math.hypot(y-Y,z)<.0135)col.lerp(tarnish,.5);});
 // Shaft: a slim bar that swells into a hollow barrel at the tip, the bore showing dark.
 const shaftEnd=.2;
 put(lathe(-.09,shaftEnd+.09,[[0,0],[.009,0],[.008,.3],[.0085,.62],[.011,.66],[.011,.97],[.0105,1],[0,1]]),(x,y,z,col)=>{
  worn(x,y,z,col);if(x>shaftEnd-.002&&Math.hypot(y-Y,z)<.0065)col.copy(bore);});
 const hole=new THREE.CylinderGeometry(.0055,.0055,.002,10);hole.rotateZ(Math.PI/2);hole.translate(shaftEnd+.0005,Y,0);put(hole,(x,y,z,col)=>col.copy(bore));
 // Bit: a flag off one side of the barrel, stepped and slotted by its wards.
 const bit=(x0,x1,z1,tone=worn)=>{const b=new THREE.BoxGeometry(x1-x0,T*.8,z1-.006);b.translate((x0+x1)/2,Y,.006+(z1-.006)/2);put(b,tone);};
 bit(.13,.145,.068);bit(.15,.165,.052);bit(.17,.2,.068);
 bit(.13,.2,.024,(x,y,z,col)=>{worn(x,y,z,col);col.lerp(tarnish,.25);});
 // Bright filed edges along the bit's outer end, where it has turned in the lock.
 for(const [x0,x1,z] of [[.13,.145,.068],[.15,.165,.052],[.17,.2,.068]]){const e=new THREE.BoxGeometry(x1-x0,T*.82,.004);e.translate((x0+x1)/2,Y,z-.002);put(e,(x,y,z,col)=>col.copy(polish));}
 const geo=mergeGeometries(parts);parts.forEach(p=>p.dispose());
 geo.computeBoundingBox();const box=geo.boundingBox,cx=(box.min.x+box.max.x)/2,cz=(box.min.z+box.max.z)/2;
 geo.translate(-cx,-box.min.y,-cz);
 const key=mesh(geo,mat(0xffffff,{vertexColors:true,metalness:.72,roughness:.36}));key.rotation.y=.5;key.userData.part='skeleton key';
 return g;
}
// A thief's lock pick dropped flat on the floor: a hook pick and a wavy rake with flat, cord-wrapped
// handles, and an L-bent tension wrench, all threaded on a small iron ring. One merged mesh; vertex
// colours give blued-steel handles, dark cord bands and bright, filed working tips.
function createLockPick(name){
 const {g,mat,mesh}=kit(name);g.userData.restingWeapon=true;
 const parts=[],steel=new THREE.Color(0x8d989c),blued=new THREE.Color(0x3b4a5a),bright=new THREE.Color(0xd9e1e3),cord=new THREE.Color(0x3a2618),iron=new THREE.Color(0x4f5457);
 const V=(x,z,y=.004)=>new THREE.Vector3(x,y,z),smooth=(a,b,t)=>{const u=Math.min(1,Math.max(0,(t-a)/(b-a)));return u*u*(3-2*u);};
 // Each tool: a flat handle for the first `grip` of its length, then a thin shank to a bright tip.
 const tool=(points,grip,handleW,shankW,thick)=>{
  const w=t=>handleW+(shankW-handleW)*smooth(grip-.04,grip+.03,t),h=t=>thick*(1-.25*smooth(grip,1,t));
  parts.push(sweepGeometry(points,w,h,(t,cx,cy,col)=>{
   if(t<grip){col.copy(blued).lerp(steel,.15+.1*cy);
    // Cord wrapped in bands round the handle.
    if(t>.05&&t<grip-.05&&Math.sin(t/grip*Math.PI*9)>.2)col.copy(cord).lerp(steel,.08*(1+cy));}
   else col.copy(steel).lerp(bright,smooth(.75,1,t)*.8+.1*(1+cy));
  },40,8));
 };
 // Hook pick: straight shank ending in a short upturned hook.
 tool([V(-.19,.012),V(-.06,.012),V(.1,.012),V(.132,.014),V(.145,.022),V(.148,.032)],.34,.011,.0032,.0035);
 // Rake: a shank that ripples into three humps near the tip.
 tool([V(-.18,-.004,.0045),V(-.05,-.006,.0045),V(.06,-.01,.0045),V(.08,-.016,.0045),V(.095,-.008,.0045),V(.11,-.017,.0045),V(.125,-.009,.0045),V(.14,-.016,.0045)],.37,.01,.0034,.0035);
 // Tension wrench: a flat bar bent through a right angle at the tip.
 tool([V(-.17,-.03,.0036),V(-.02,-.034,.0036),V(.035,-.038,.0036),V(.048,-.041,.0036),V(.052,-.052,.0036),V(.053,-.066,.0036)],.45,.0075,.0045,.0028);
 // The ring the set hangs on, through the handle ends.
 const ringGeo=new THREE.TorusGeometry(.03,.0036,8,28);ringGeo.rotateX(Math.PI/2);ringGeo.translate(-.19,.0045,0);
 const cols=[],p=ringGeo.attributes.position,c=new THREE.Color();
 for(let i=0;i<p.count;i++){c.copy(iron).lerp(bright,p.getY(i)>.006?.35:0);cols.push(c.r,c.g,c.b);}
 ringGeo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));ringGeo.deleteAttribute('uv');parts.push(ringGeo);
 const geo=mergeGeometries(parts);parts.forEach(q=>q.dispose());
 geo.computeBoundingBox();const box=geo.boundingBox;
 geo.translate(-(box.min.x+box.max.x)/2,-box.min.y,-(box.min.z+box.max.z)/2);
 const set=mesh(geo,mat(0xffffff,{vertexColors:true,metalness:.7,roughness:.38}));set.rotation.y=-.35;set.userData.part='lock pick';
 return g;
}
// Sweeps a tapering cross-section along a curve in the x-z plane. y is the thickness axis, so the
// tool lies flat. halfWidth(t) is in the curve's plane, halfHeight(t) along y; both ends are capped.
function sweepGeometry(points,halfWidth,halfHeight,shade,rows=28,sides=10){
 const curve=new THREE.CatmullRomCurve3(points),up=new THREE.Vector3(0,1,0),side=new THREE.Vector3();
 const pos=[],col=[],idx=[],c=new THREE.Color();
 for(let i=0;i<=rows;i++){
  const t=i/rows,p=curve.getPointAt(t),w=halfWidth(t),h=halfHeight(t);
  side.crossVectors(curve.getTangentAt(t),up).normalize();
  for(let j=0;j<sides;j++){
   // A squared-off octagon: flat faces with bevelled corners, like forged bar.
   const a=j/sides*Math.PI*2,cx=Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**.55,cy=Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**.55;
   pos.push(p.x+side.x*cx*w,p.y+cy*h,p.z+side.z*cx*w);
   shade(t,cx,cy,c);col.push(c.r,c.g,c.b);
  }
 }
 for(let i=0;i<rows;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,d=a+sides,e=b+sides;idx.push(a,d,b,b,d,e);}
 for(const [row,t,flip] of [[0,0,true],[rows,1,false]]){
  const p=curve.getPointAt(t),centre=pos.length/3;pos.push(p.x,p.y,p.z);shade(t,0,0,c);col.push(c.r,c.g,c.b);
  for(let j=0;j<sides;j++){const a=row*sides+j,b=row*sides+(j+1)%sides;flip?idx.push(centre,a,b):idx.push(centre,b,a);}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.setIndex(idx);geo.computeVertexNormals();
 return geo;
}
// A pick-axe (or, broad, a dwarvish mattock) dropped flat on the floor: a lathed hickory haft with a
// swelled butt and a spiralled leather grip, iron langets riveted up to a forged head, the haft end
// showing through the eye with its wedge, and vertex-coloured wear (polished points, scale, scratches).
// A crystal pick keeps the haft but cuts the head from faceted, pale blue glass set in silvered fittings.
// The parts are laid out as placeholders, then baked by finish into two merged, vertex-coloured meshes,
// forged metal and wood-and-leather; a crystal pick's glass head is a third.
function createPick(name,broad,crystal=false){
 const {g,mat,mesh}=kit(name);g.userData.restingWeapon=true;
 const tool=new THREE.Group();g.add(tool);
 const noise=(a,b)=>Math.sin(a*12.9898+b*78.233)*43758.5453%1;
 // Each part is a placeholder carrying its geometry and tone: a colour, or a function painting each vertex.
 const part=(geo,tone,x=0,y=0,z=0)=>{const o=new THREE.Object3D();o.position.set(x,y,z);o.userData={geo,tone};tool.add(o);return o;};
 const iron=new THREE.Color(crystal?0xb4bcc2:broad?0x4b4f52:0x5a6265),bright=new THREE.Color(0xc8d0d2);
 const leather=new THREE.Color(0x4a2c1e),hide=new THREE.Color(0x2a180f),endGrain=new THREE.Color(0xa47a51),heart=new THREE.Color(0x6e4c2e);
 const length=broad?.86:.76,r=broad?.034:.03,headY=broad?.07:.034;
 // Head: one curved bar from tip to tip through the eye at the origin; the points curve back toward the haft.
 const span=broad?.25:.29,bend=broad?.05:.085;
 const headPoints=[];for(let i=0;i<=8;i++){const z=-span+i/8*span*2;headPoints.push(new THREE.Vector3(-bend*(z/span)**2,headY,z));}
 const swell=t=>Math.max(0,1-Math.abs(2*t-1))**.75;
 const halfWidth=broad?t=>t<.5?.004+.03*swell(t):.005+.03*(1-t)**.8*1.4:t=>.003+.028*swell(t);
 const halfHeight=broad?t=>t<.5?.003+.033*swell(t):Math.min(headY,.034+(t-.5)*.08):t=>.003+.031*swell(t);
 const steelTone=new THREE.Color(broad?0x5c6164:0x6a7376),polish=new THREE.Color(0xd9e1e3),scale=new THREE.Color(0x2e2c2a);
 const facetDark=new THREE.Color(0x6fa6c8),facetLight=new THREE.Color(0xeef8ff),core=new THREE.Color(0x9fd0ec);
 const head=part(sweepGeometry(headPoints,halfWidth,halfHeight,crystal?(t,cx,cy,c)=>{
  // Cut facets alternate light and shade; the points clear to near white, the thick middle stays blue.
  const edge=Math.abs(2*t-1),f=noise(Math.floor(t*9)+cx*3,Math.round(cy*2));
  c.copy(core).lerp(Math.abs(f)>.5?facetLight:facetDark,Math.abs(Math.abs(f)-.5)*1.2).lerp(facetLight,Math.max(0,edge-.6)*1.5);
 }:(t,cx,cy,c)=>{
  // Worked points are polished bright; the middle keeps dark forge scale and a little rust.
  const edge=broad&&t>.5?(t-.5)*2:Math.abs(2*t-1);
  c.copy(steelTone).lerp(polish,Math.max(0,edge-.45)*1.8);
  const n=noise(t*31+cx,cy*7);if(edge<.5&&n>.55)c.lerp(scale,.5);
  if(n<.06)c.lerp(new THREE.Color(0x6b3d24),.55);
 }),null);
 // Eye boss round the haft, with a raised band either side.
 const boss=halfHeight(.5)*2;
 part(new RoundedBoxGeometry(.085,boss+.014,.09,3,.012),iron,0,headY,0);
 for(const z of [-.05,.05])part(new RoundedBoxGeometry(.07,boss+.022,.012,2,.004),iron,0,headY,z);
 // Haft: lathed along +y, then laid along -x. Swelled butt, slim neck, thickening into the eye.
 const profile=[[0,0],[r*.7,0],[r*1.22,.012],[r*1.3,.04],[r*1.02,.08],[r*.94,.2],[r*.98,length*.6],[r*1.08,length-.02],[r*1.1,length+.05],[r*.9,length+.058],[0,length+.058]].map(([a,b])=>new THREE.Vector2(a,b));
 const haftGeo=new THREE.LatheGeometry(profile,16);haftGeo.rotateZ(-Math.PI/2);haftGeo.translate(-length,headY,0);
 part(haftGeo,(x,y,z,c)=>{
  const a=Math.atan2(z,y-headY),along=(x+length)/length;
  // Grain runs along the haft; hands have darkened the butt, and the eye end is grimy.
  c.set(0x7c5534).lerp(new THREE.Color(0x5a3a22),.5+.5*Math.sin(a*3+x*23+Math.sin(x*61)*1.5));
  if(along<.28)c.multiplyScalar(.72+along);if(along>.9)c.multiplyScalar(.8);
 });
 // End grain through the eye, ringed dark toward the heart, split by an iron wedge.
 const cap=part(new THREE.CylinderGeometry(r*.92,r*.92,.006,14,1,false),(x,y,z,c)=>{const d=Math.hypot(x,z)/r;c.copy(endGrain).lerp(heart,d<.5?.6:.15);},.061,headY,0);cap.rotation.z=Math.PI/2;
 part(new THREE.BoxGeometry(.008,r*1.5,.009),iron,.065,headY,0);
 // Langets riveted along the top and bottom of the haft below the head.
 for(const y of [1,-1]){
  part(new THREE.BoxGeometry(.15,.006,.024),iron,-.105,headY+y*r*1.02,0);
  for(const x of [-.06,-.14]){const rivet=part(new THREE.SphereGeometry(.009,8,6),bright,x,headY+y*(r*1.02+.003),0);rivet.scale.y=.6;}
 }
 // Spiralled leather grip near the butt, bound at both ends; the strap is worn dark in patches by the hand.
 const gripStart=-length+.1,gripEnd=-length+.33,turns=8,helix=[];
 for(let i=0;i<=turns*12;i++){const t=i/(turns*12),a=t*turns*Math.PI*2;helix.push(new THREE.Vector3(gripStart+(gripEnd-gripStart)*t,headY+Math.cos(a)*(r*.97+.005),Math.sin(a)*(r*.97+.005)));}
 part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix),turns*24,.0075,6),(x,y,z,c)=>c.copy(leather).lerp(hide,Math.max(0,noise(Math.round(x*90),3)-.4)*1.2));
 for(const x of [gripStart,gripEnd]){const band=part(new THREE.TorusGeometry(r*.97+.006,.006,6,20),hide,x,headY,0);band.rotation.y=Math.PI/2;}
 // Scratches across the top face of the head.
 if(!crystal)for(let i=0;i<5;i++){const z=(i-2)*.042+(broad?.03:0),s=part(new THREE.BoxGeometry(.028,.0015,.0022),bright,-.002-bend*(z/span)**2,headY+halfHeight(.5+z/span/2)+.0004,z);s.rotation.y=.5+noise(i,3)*.6;}
 // Paint each placeholder, bake it into the pick's own space, then merge by finish.
 const finishes={metal:[],wood:[],glass:[]},c=new THREE.Color();
 for(const o of [...tool.children]){
  // Painters work in the part's own space (the haft and grip are built in pick space already).
  const {geo,tone}=o.userData;geo.deleteAttribute('uv');
  if(tone){const p=geo.attributes.position,cols=new Float32Array(p.count*3);
   for(let i=0;i<p.count;i++){if(tone.isColor)c.copy(tone);else tone(p.getX(i),p.getY(i),p.getZ(i),c);c.toArray(cols,i*3);}
   geo.setAttribute('color',new THREE.BufferAttribute(cols,3));}
  // Rounded boxes come unindexed, so every part is unindexed to merge, then welded again.
  o.updateMatrix();geo.applyMatrix4(o.matrix);const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
  const finish=o===head?(crystal?'glass':'metal'):tone===iron||tone===bright?'metal':'wood';
  finishes[finish].push(flat);tool.remove(o);
 }
 const bake=(list,material,label)=>{if(!list.length)return;const merged=mergeGeometries(list),geo=mergeVertices(merged);list.forEach(q=>q.dispose());merged.dispose();mesh(geo,material,0,0,0,tool).userData.part=label;};
 bake(finishes.metal,mat(0xffffff,{vertexColors:true,metalness:crystal?.85:.72,roughness:crystal?.3:.44}),'metal');
 bake(finishes.wood,mat(0xffffff,{vertexColors:true,roughness:.85}),'wood');
 bake(finishes.glass,mat(0xffffff,{vertexColors:true,flatShading:true,metalness:.05,roughness:.08,transparent:true,opacity:.86,emissive:0x2a5a78,emissiveIntensity:.45}),'glass');
 // Lay the butt down on the floor, then drop the lowest point to y=0 and centre it on the tile.
 tool.rotation.z=Math.asin(Math.max(0,headY-r*1.3)/length);
 tool.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(tool,true),centre=bounds.getCenter(new THREE.Vector3());
 const holder=new THREE.Group();holder.rotation.y=-.6;g.add(holder);holder.add(tool);
 tool.position.set(-centre.x,-bounds.min.y,-centre.z);
 return g;
}
export function lightItemKind(name=''){
 const n=name.toLowerCase();
 if(/\blanterns?\b/.test(n))return 'lantern';
 if(/\blamps?\b/.test(n))return 'lamp';
 if(/\bcandles?\b/.test(n))return 'candle';
 return null;
}
export function createLightItem(name){
 const kind=lightItemKind(name);if(!kind)return null;
 if(kind==='lantern')return createBrassLantern(name);
 if(kind==='candle')return createCandle(name);
 return createOilLamp(name);
}
// A brass hurricane lantern standing on the floor: a stepped fount with a wick-raising knob, a
// bulging glass globe caged by four bowed guard wires and two hoops, a vented, domed cap with a
// hanging ring, and a wire bail tipped over to one side. The brass is one merged, vertex-coloured
// mesh (tarnish low down and in the vents, polish on the rims); the globe is a second draw, and a
// lit lantern ("(lit)" in the name) adds a flame and a warm glow in the glass as a third.
function createBrassLantern(name){
 const {g,mat,mesh}=kit(name);g.userData.restingWeapon=true;
 const lit=/\blit\b/i.test(name);
 const parts=[],c=new THREE.Color(),brass=new THREE.Color(0xb3924a),polish=new THREE.Color(0xf0d58c),tarnish=new THREE.Color(0x4f4127),
  soot=new THREE.Color(0x191511),wick=new THREE.Color(0x2a2520),char=new THREE.Color(0x0d0b09);
 const noise=(a,b)=>{const v=Math.sin(a*12.9898+b*78.233)*43758.5453;return v-Math.floor(v);};
 const put=(geo,tone)=>{geo.deleteAttribute('uv');const p=geo.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));parts.push(geo);return geo;};
 // Tarnish gathers low down and in blotches; y is height above the floor.
 const worn=(x,y,z,col)=>{col.copy(brass).lerp(tarnish,.18+noise(x*31+y*7,z*29)*.3+Math.max(0,.06-y)*4);};
 const lathe=(profile,n=28)=>new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),n);
 // The fount: a flared foot, a rounded oil tank and a shoulder rising to the burner seat.
 put(lathe([[0,0],[.142,0],[.152,.006],[.152,.02],[.143,.028],[.156,.052],[.158,.07],[.148,.092],[.12,.106],[.09,.112],[.086,.122],[.062,.126],[0,.126]]),
  (x,y,z,col)=>{worn(x,y,z,col);const r=Math.hypot(x,z);if(r>.15&&y>.004&&y<.022||r>.155&&y>.05&&y<.075)col.lerp(polish,.55);});
 // Burner collar, the wick and its charred tip inside the globe.
 put(lathe([[0,.126],[.058,.126],[.06,.13],[.056,.15],[.04,.158],[.018,.16],[0,.16]],20),(x,y,z,col)=>{worn(x,y,z,col);col.lerp(tarnish,.3);if(y>.152)col.lerp(soot,.5);});
 const w=new THREE.BoxGeometry(.03,.026,.006);w.translate(0,.17,0);put(w,(x,y,z,col)=>col.copy(wick).lerp(char,y>.176?.9:.1));
 // Wick-raising knob: a stem out through the fount's shoulder to a milled thumbwheel.
 const stem=new THREE.CylinderGeometry(.006,.006,.08,8);stem.rotateZ(Math.PI/2);stem.translate(.1,.12,0);put(stem,worn);
 const wheel=new THREE.CylinderGeometry(.024,.024,.01,16);wheel.rotateZ(Math.PI/2);wheel.translate(.145,.12,0);
 put(wheel,(x,y,z,col)=>{worn(x,y,z,col);if(Math.hypot(y-.12,z)>.02)col.lerp(Math.floor(Math.atan2(z,y-.12)/Math.PI*8)%2?polish:tarnish,.5);});
 // The globe's outline, shared by the glass and the guard wires bowed round it.
 const globe=y=>.072+.05*Math.sin(Math.PI*Math.min(1,Math.max(0,(y-.13)/.24)));
 // Four guard wires from the fount's shoulder to the cap, each standing just off the glass.
 for(let i=0;i<4;i++){
  const a=Math.PI/4+i*Math.PI/2,pts=[];
  for(let k=0;k<=12;k++){const y=.108+k/12*.27,r=globe(y)+.013;pts.push(new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r));}
  put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.0055,6),(x,y,z,col)=>{worn(x,y,z,col);if(Math.hypot(x,z)>globe(y)+.016)col.lerp(polish,.4);});
 }
 // Two hoops binding the guards: one round the globe's belly, one near its foot.
 for(const y of [.25,.165]){const hoop=new THREE.TorusGeometry(globe(y)+.013,.005,6,36);hoop.rotateX(Math.PI/2);hoop.translate(0,y,0);put(hoop,(x,yy,z,col)=>{worn(x,yy,z,col);if(yy>y)col.lerp(polish,.45);});}
 // The cap: a seating ring over the globe, a vented drum dark between its louvres, a dome and a finial.
 put(lathe([[.064,.37],[.1,.372],[.104,.382],[.096,.39],[.084,.392],[.084,.425],[.09,.43],[.086,.436],[.06,.458],[.034,.47],[.026,.478],[.03,.486],[.016,.492],[0,.494]]),
  (x,y,z,col)=>{worn(x,y,z,col);
   if(y>.395&&y<.423){const a=Math.atan2(z,x);if(Math.sin(a*12)>.2)col.copy(soot).lerp(tarnish,.2);}
   if(y>.376&&y<.386||y>.427&&y<.434||y>.48)col.lerp(polish,.5);
   if(y<.372)col.lerp(soot,.7);});
 // The hanging ring on the finial.
 const loop=new THREE.TorusGeometry(.018,.0045,6,16);loop.translate(0,.51,0);put(loop,(x,y,z,col)=>{worn(x,y,z,col);col.lerp(polish,.3);});
 // The wire bail pivots in two ears on the seating ring and has tipped over towards +z.
 const pivot=.385,tip=.9;
 for(const s of [-1,1]){const ear=new THREE.BoxGeometry(.028,.02,.008);ear.translate(s*.113,pivot,0);put(ear,worn);}
 const bail=new THREE.TorusGeometry(.12,.0055,6,32,Math.PI);bail.rotateX(tip);bail.translate(0,pivot,0);
 put(bail,(x,y,z,col)=>{worn(x,y,z,col);if(y>pivot+.08)col.lerp(polish,.5);});
 const grip=new THREE.CylinderGeometry(.011,.011,.07,10);grip.rotateZ(Math.PI/2);grip.translate(0,.12*Math.cos(tip),.12*Math.sin(tip));grip.translate(0,pivot,0);
 put(grip,(x,y,z,col)=>col.set(0x2f231a).lerp(tarnish,.2));
 const geo=mergeGeometries(parts);parts.forEach(q=>q.dispose());
 const body=mesh(geo,mat(0xffffff,{vertexColors:true,metalness:.78,roughness:.34}));body.userData.part='brass';
 // The globe: thin glass open top and bottom, sooted just under the cap.
 const glassGeo=lathe(Array.from({length:17},(_,i)=>{const y=.13+i/16*.24;return [globe(y),y];}),32);
 const gp=glassGeo.attributes.position,gc=[];
 for(let i=0;i<gp.count;i++){const y=gp.getY(i);c.set(lit?0xffe2b0:0xd8ece8).lerp(soot,Math.max(0,(y-.33)/.04)*.75);gc.push(c.r,c.g,c.b);}
 glassGeo.setAttribute('color',new THREE.Float32BufferAttribute(gc,3));
 const glass=mesh(glassGeo,mat(0xffffff,{vertexColors:true,transparent:true,opacity:lit?.34:.24,roughness:.08,metalness:.1,depthWrite:false,side:THREE.DoubleSide,
  emissive:lit?0xff9a3c:0x000000,emissiveIntensity:lit?.35:0}));
 glass.castShadow=false;glass.userData.part='globe';
 if(lit){
  // A still, teardrop flame on the wick with a white-hot heart.
  addFlame(g,mesh,.176);
 }
 g.rotation.y=.4;
 return g;
}
// A still, teardrop flame standing on a wick at height `base`, white-hot at the heart and orange at
// the edges. It's unlit (MeshBasicMaterial) and tagged part 'flame' so an animation can flicker it.
function addFlame(g,mesh,base,s=1){
 const c=new THREE.Color(),edge=new THREE.Color(0xff8a2a);
 const geo=new THREE.LatheGeometry([[0,0],[.014,.006],[.02,.02],[.017,.039],[.009,.059],[0,.076]].map(([r,y])=>new THREE.Vector2(r*s,base+y*s)),16),p=geo.attributes.position,cols=[];
 for(let i=0;i<p.count;i++){c.set(0xfff4d0).lerp(edge,Math.min(1,(p.getY(i)-base)/(.07*s)+Math.hypot(p.getX(i),p.getZ(i))*18/s));cols.push(c.r,c.g,c.b);}
 geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
 const flame=mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}));flame.castShadow=flame.receiveShadow=false;flame.userData.part='flame';
 const dispose=g.userData.dispose;g.userData.dispose=()=>{dispose();flame.material.dispose();};
 return flame;
}
// A candle in a brass chamberstick: a dished saucer with a rolled rim, a socket with a drip-pan
// flange, and a finger loop with a thumb rest. The candle has a melted, uneven crater round a curled
// wick, runs of wax down its side (ending in beads, one pooled in the flange) and a spill in the dish.
// Tallow is yellower, grimier and drips more than wax. A stack ("3 wax candles") adds spare candles
// lying beside the stick. Brass and wax are one merged, vertex-coloured mesh each; a lit candle
// ("(lit)" in the name) adds a flame as a third draw and warms the wax round the crater.
function createCandle(name){
 const {g,mat,mesh}=kit(name);g.userData.restingWeapon=true;
 const lit=/\blit\b/i.test(name),tallow=/tallow/i.test(name),count=Math.max(/candles\b/i.test(name)?2:1,Number(/^\s*(\d+)/.exec(name)?.[1]??1));
 const c=new THREE.Color(),brass=new THREE.Color(0xb3924a),polish=new THREE.Color(0xf0d58c),tarnish=new THREE.Color(0x4f4127),soot=new THREE.Color(0x191511);
 const waxTone=new THREE.Color(tallow?0xcfb27a:0xefe5c8),waxShade=new THREE.Color(tallow?0x8c7442:0xcfc09a),glow=new THREE.Color(0xffc987),
  wick=new THREE.Color(0x2a2520),ember=new THREE.Color(0xff6a1c);
 const noise=(a,b)=>{const v=Math.sin(a*12.9898+b*78.233)*43758.5453;return v-Math.floor(v);};
 const colour=(geo,tone)=>{geo.deleteAttribute('uv');const p=geo.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));return geo;};
 const lathe=(profile,n=28)=>new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),n);
 const metal=[],wax=[];
 const worn=(x,y,z,col)=>{col.copy(brass).lerp(tarnish,.15+noise(x*31+y*7,z*29)*.3+Math.max(0,.02-y)*8);};
 // The saucer: a flat foot, a shallow dish and a rolled rim, polished where a hand rubs it.
 metal.push(colour(lathe([[0,0],[.128,0],[.142,.004],[.152,.016],[.16,.03],[.157,.037],[.149,.034],[.138,.021],[.12,.015],[.06,.013],[0,.013]]),
  (x,y,z,col)=>{worn(x,y,z,col);if(Math.hypot(x,z)>.148&&y>.026)col.lerp(polish,.55);}));
 // The socket rises from the dish to a flared drip pan; the candle stands in it.
 metal.push(colour(lathe([[.038,.013],[.05,.013],[.052,.02],[.044,.03],[.041,.068],[.046,.076],[.066,.082],[.07,.088],[.064,.092],[.046,.089],[.043,.089]],24),
  (x,y,z,col)=>{worn(x,y,z,col);if(y>.08&&Math.hypot(x,z)>.06)col.lerp(polish,.5);if(y>.087&&Math.hypot(x,z)<.05)col.lerp(soot,.3);}));
 // Finger loop standing on the rim at +x, capped by a flat thumb rest.
 const loop=new THREE.TorusGeometry(.036,.0085,8,24);loop.translate(.19,.05,0);
 metal.push(colour(loop,(x,y,z,col)=>{worn(x,y,z,col);if(y>.06)col.lerp(polish,.45);}));
 const rest=new THREE.CylinderGeometry(.026,.022,.007,16);rest.scale(1,1,.8);rest.translate(.19,.093,0);
 metal.push(colour(rest,(x,y,z,col)=>{worn(x,y,z,col);if(y>.094)col.lerp(polish,.6);}));
 const metalGeo=mergeGeometries(metal);metal.forEach(q=>q.dispose());
 const stick=mesh(metalGeo,mat(0xffffff,{vertexColors:true,metalness:.78,roughness:.32}));stick.userData.part='brass';
 // The candle's wax: shaded darker low down (and grimy for tallow), warmed round the crater when lit.
 const r=.041,foot=.03,top=.36,dirty=tallow?.35:.12;
 const waxAt=(x,y,z,col)=>{col.copy(waxTone).lerp(waxShade,Math.max(0,(.2-y)/.2)*dirty+noise(x*53,y*41+z*17)*.08);
  if(lit)col.lerp(glow,Math.max(0,1-Math.abs(y-top)/.035)*.55);};
 // Column with a lipped, uneven rim round a sunken crater.
 const column=lathe([[0,foot],[r,foot],[r*.99,top-.08],[r,top-.004],[r*.93,top+.006],[r*.74,top+.004],[r*.5,top-.008],[.01,top-.012],[0,top-.012]],32);
 const cp=column.attributes.position;
 for(let i=0;i<cp.count;i++){const y=cp.getY(i);if(y>top-.02){const a=Math.atan2(cp.getZ(i),cp.getX(i));cp.setY(i,y+(Math.sin(a*3+1)*.006+Math.sin(a*5)*.003)*Math.min(1,(y-top+.02)/.02));}}
 column.computeVertexNormals();wax.push(colour(column,waxAt));
 // Runs of wax down the side, each ending in a bead; the longest reaches the drip pan and pools.
 const runs=tallow?[[.5,.13],[1.7,.24],[2.6,.07],[3.9,.27],[5.1,.11]]:[[.6,.1],[2.3,.27],[4.2,.06]];
 for(const [a,len] of runs){
  const pts=[];for(let k=0;k<=8;k++){const t=k/8,y=top+.002-t*len,bulge=.004+.003*Math.sin(t*Math.PI);
   pts.push(new THREE.Vector3(Math.cos(a+t*.12)*(r+bulge),Math.max(y,.094),Math.sin(a+t*.12)*(r+bulge)));}
  wax.push(colour(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),16,.0065,6),waxAt));
  const end=pts[8],bead=new THREE.SphereGeometry(1,10,8);
  if(end.y<=.094){bead.scale(.026,.006,.022);bead.translate(Math.cos(a+.12)*.052,.092,Math.sin(a+.12)*.052);}
  else{bead.scale(.009,.013,.009);bead.translate(end.x*1.04,end.y-.004,end.z*1.04);}
  wax.push(colour(bead,waxAt));
 }
 // A spill of wax gone hard in the dish.
 const spill=new THREE.SphereGeometry(1,14,8);spill.scale(.04,.004,.028);spill.rotateY(.5);spill.translate(-.09,.015,.045);wax.push(colour(spill,waxAt));
 // The wick: a short curled thread out of the crater, charred at the tip (glowing when lit).
 const wickTop=top+.028,curl=[new THREE.Vector3(0,top-.014,0),new THREE.Vector3(0,top+.008,0),new THREE.Vector3(.003,top+.02,.001),new THREE.Vector3(.008,wickTop,.003)];
 wax.push(colour(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curl),8,.0028,5),(x,y,z,col)=>col.copy(wick).lerp(lit?ember:soot,Math.min(1,Math.max(0,(y-top-.012)/.016)))));
 // Spare candles from the stack lie on the floor beside the stick, wick ends rounded off.
 for(let i=1;i<Math.min(count,3);i++){
  const side=i===1?-1:1,len=.26,spare=lathe([[0,0],[.034,0],[.036,.004],[.036,len-.012],[.03,len-.002],[.012,len],[.003,len],[.003,len+.014],[0,len+.014]],20);
  // Coloured along its length before it's laid down: wax, then the white, unburnt wick.
  colour(spare,(x,y,z,col)=>{if(y>len+.001)col.set(0xd9d2c0);else col.copy(waxTone).lerp(waxShade,noise(x*53,y*41+z*7)*.1+Math.max(0,-x)*dirty*2);});
  spare.rotateZ(-Math.PI/2);spare.rotateY(side*.12);spare.translate(-len/2+.02,.036,side*.215);wax.push(spare);
 }
 const waxGeo=mergeGeometries(wax);wax.forEach(q=>q.dispose());
 const candle=mesh(waxGeo,mat(0xffffff,{vertexColors:true,roughness:.52,
  emissive:lit?0xff9a4a:0x000000,emissiveIntensity:lit?.12:0}));candle.userData.part='wax';
 if(lit)addFlame(g,mesh,wickTop-.004,.85);
 g.rotation.y=.4;
 return g;
}
