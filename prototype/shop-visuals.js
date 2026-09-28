import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
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
export function createShopkeeper(){
 const {g,mat,ball,box,ring}=kit('Aproned shopkeeper');
 const body=new THREE.Group();g.add(body);const legs=[];
 const skin=mat(0xc68c65),shirt=mat(0x536f68),apron=mat(0xd8c6a1),hair=mat(0x443027),boot=mat(0x352e2a),eye=mat(0x20252a),gold=mat(0xb59b5e,{metalness:.6});
 for(const x of [-.17,.17]){const leg=new THREE.Group();leg.position.set(x,.27,0);g.add(leg);box(boot,0,-.04,0,.18,.28,.2,leg);box(boot,0,-.19,.055,.23,.12,.3,leg);legs.push(leg);}
 ball(shirt,0,.65,0,.37,.4,.25,body);
 // The apron follows the belly instead of disappearing inside it.
 ball(apron,0,.65,.13,.30,.33,.19,body);
 box(apron,0,.38,.22,.50,.27,.065,body);
 box(apron,0,.94,.19,.26,.20,.045,body);
 box(hair,0,.57,.322,.23,.13,.024,body);
 box(apron,0,.59,.338,.19,.075,.018,body);
 for(const x of [-.14,.14]){const strap=box(apron,x,.99,.13,.047,.24,.045,body);strap.rotation.x=-.28;}
 ball(skin,0,1.2,.025,.23,.25,.20,body);
 ball(skin,0,1.10,.14,.18,.10,.13,body);
 for(const x of [-.23,.23])ball(skin,x,1.2,.025,.05,.074,.045,body);
 // Receding hair, round nose, dark eyes and a broad curled mustache.
 ball(hair,0,1.34,-.07,.23,.12,.17,body);
 ball(skin,0,1.35,.025,.19,.13,.16,body);
 ball(skin,0,1.19,.23,.064,.058,.06,body);
 for(const side of [-1,1]){
  ball(eye,side*.082,1.265,.203,.024,.025,.016,body);
  const brow=box(hair,side*.082,1.31,.185,.09,.024,.025,body);brow.rotation.z=side*.08;
  const moustache=ball(hair,side*.069,1.135,.239,.085,.039,.035,body);moustache.rotation.z=side*.18;
  ball(hair,side*.139,1.151,.233,.036,.023,.025,body);
  const arm=box(shirt,side*.365,.79,0,.15,.35,.18,body);arm.rotation.z=side*.16;
  box(apron,side*.39,.62,.01,.16,.075,.18,body);
  ball(skin,side*.40,.55,.03,.082,.095,.079,body);
 }
 const buckle=ring(gold,0,.81,.314,.045,.008);buckle.scale.set(1,.7,1);
 return {g,body,legs,quirk:'shopkeeper'};
}

export function createWatchman(){
 const {g,mat,mesh,ball,box,ring}=kit('Armored watchman');
 const steel=mat(0x33454d,{metalness:.65,roughness:.32}),dark=mat(0x17252d,{metalness:.35}),leather=mat(0x493529),skin=mat(0xb87956),gold=mat(0xc3a04b,{metalness:.7}),red=mat(0x8e3d3b);
 const body=new THREE.Group();g.add(body);const legs=[];
 for(const x of [-.14,.14]){const l=new THREE.Group();l.position.set(x,.3,0);g.add(l);box(leather,0,-.08,0,.17,.34,.18,l);box(dark,0,.12,.02,.19,.2,.22,l);legs.push(l);}
 box(steel,0,.68,0,.52,.54,.3,body);box(dark,0,.67,.17,.35,.38,.04,body);box(gold,0,.67,.205,.31,.035,.025,body);
 for(const x of [-.32,.32]){const a=box(steel,x,.75,0,.16,.43,.2,body);a.rotation.z=x*.2;box(dark,x,.52,.02,.17,.15,.21,body);}
 ball(skin,0,1.17,.02,.2,.23,.18,body);
 // Helm, visor, cheek guards, and a red plume make the military role readable.
 ball(steel,0,1.3,-.02,.22,.16,.19,body);box(dark,0,1.18,.18,.34,.075,.055,body);box(steel,0,1.23,.21,.34,.045,.035,body);
 const plume=mesh(new THREE.ConeGeometry(.055,.24,5),red,0,1.53,-.02);plume.rotation.z=-.12;
 for(const x of [-.105,.105]){box(steel,x,1.15,.08,.07,.18,.1,body);ball(gold,x,1.19,.225,.018,.018,.012,body);}
 // Sword and shield are intentionally oversized enough to survive the camera.
 const blade=mesh(new THREE.BoxGeometry(.045,.72,.035),steel,.36,.79,.16);blade.rotation.z=-.12;mesh(new THREE.ConeGeometry(.06,.13,4),steel,.405,1.16,.16).rotation.z=-.12;box(leather,.36,.42,.16,.13,.16,.1,body);
 ball(dark,-.36,.72,.19,.19,.25,.07,body);ring(gold,-.36,.72,.26,.14,.018).rotation.x=Math.PI/2;ball(gold,-.36,.72,.28,.035,.035,.025,body);
 return {g,body,legs,quirk:'watchman'};
}

export function createShopItem(name){
 const n=name.toLowerCase();
 if(/pick-axe|pickaxe/.test(n))return createPick(name,false);
 // A dwarvish mattock shows as "broad pick" until identified; both names draw the same model.
 if(/dwarvish mattock|broad pick/.test(n))return createPick(name,true);
 // UnNetHack's crystal pick: a pick-axe whose head is cut from glass.
 if(/crystal pick/.test(n))return createPick(name,false,true);
 if(/lock pick/.test(n))return createTool(name,'lockpick');
 if(/skeleton key/.test(n))return createSkeletonKey(name);
 if(/can of grease/.test(n))return createTool(name,'grease');
 return null;
}
function createTool(name,kind){
 const {g,mat,mesh,ball,box,cyl,ring}=kit(name);g.userData.restingWeapon=true;
 const iron=mat(0x9aacaf,{metalness:.8,roughness:.28}),wood=mat(0x69462e),gold=mat(0xd0aa4f,{metalness:.72,roughness:.3}),tin=mat(0x6c7775,{metalness:.55,roughness:.36}),grease=mat(0xc9a44b,{roughness:.45});
 if(kind==='lockpick'){for(const x of [-.12,-.04,.04,.12]){cyl(iron,x,.28,0,.012,.012,.43,6).rotation.z=(x*2.2);mesh(new THREE.ConeGeometry(.025,.11,5),iron,x+.035,.51,0).rotation.z=Math.PI/2;}}
 else {cyl(tin,0,.13,0,.18,.18,.18);cyl(grease,0,.245,0,.13,.15,.08);ring(gold,0,.3,0,.13,.012).rotation.x=Math.PI/2;}
 const label=()=>{};return g;
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
function createPick(name,broad,crystal=false){
 const {g,mat,mesh}=kit(name);g.userData.restingWeapon=true;
 const tool=new THREE.Group();g.add(tool);
 const steel=crystal?mat(0xffffff,{vertexColors:true,flatShading:true,metalness:.05,roughness:.08,transparent:true,opacity:.86,emissive:0x2a5a78,emissiveIntensity:.45})
  :mat(0xffffff,{vertexColors:true,metalness:.72,roughness:.42}),wood=mat(0xffffff,{vertexColors:true,roughness:.82}),iron=mat(crystal?0xb4bcc2:broad?0x4b4f52:0x5a6265,{metalness:crystal?.85:.7,roughness:crystal?.3:.5}),leather=mat(0x4a2c1e,{roughness:.9}),endGrain=mat(0xa47a51,{roughness:.9}),bright=mat(0xc8d0d2,{metalness:.85,roughness:.25});
 const length=broad?.86:.76,r=broad?.034:.03,headY=broad?.07:.034;
 const noise=(a,b)=>Math.sin(a*12.9898+b*78.233)*43758.5453%1;
 // Head: one curved bar from tip to tip through the eye at the origin; the points curve back toward the haft.
 const span=broad?.25:.29,bend=broad?.05:.085;
 const headPoints=[];for(let i=0;i<=8;i++){const z=-span+i/8*span*2;headPoints.push(new THREE.Vector3(-bend*(z/span)**2,headY,z));}
 const swell=t=>Math.max(0,1-Math.abs(2*t-1))**.75;
 const halfWidth=broad?t=>t<.5?.004+.03*swell(t):.005+.03*(1-t)**.8*1.4:t=>.003+.028*swell(t);
 const halfHeight=broad?t=>t<.5?.003+.033*swell(t):Math.min(headY,.034+(t-.5)*.08):t=>.003+.031*swell(t);
 const steelTone=new THREE.Color(broad?0x5c6164:0x6a7376),polish=new THREE.Color(0xd9e1e3),scale=new THREE.Color(0x2e2c2a);
 const facetDark=new THREE.Color(0x6fa6c8),facetLight=new THREE.Color(0xeef8ff),core=new THREE.Color(0x9fd0ec);
 const head=mesh(sweepGeometry(headPoints,halfWidth,halfHeight,crystal?(t,cx,cy,c)=>{
  // Cut facets alternate light and shade; the points clear to near white, the thick middle stays blue.
  const edge=Math.abs(2*t-1),f=noise(Math.floor(t*9)+cx*3,Math.round(cy*2));
  c.copy(core).lerp(Math.abs(f)>.5?facetLight:facetDark,Math.abs(Math.abs(f)-.5)*1.2).lerp(facetLight,Math.max(0,edge-.6)*1.5);
 }:(t,cx,cy,c)=>{
  // Worked points are polished bright; the middle keeps dark forge scale and a little rust.
  const edge=broad&&t>.5?(t-.5)*2:Math.abs(2*t-1);
  c.copy(steelTone).lerp(polish,Math.max(0,edge-.45)*1.8);
  const n=noise(t*31+cx,cy*7);if(edge<.5&&n>.55)c.lerp(scale,.5);
  if(n<.06)c.lerp(new THREE.Color(0x6b3d24),.55);
 }),steel,0,0,0,tool);
 // Eye boss round the haft, with a raised band either side.
 const boss=halfHeight(.5)*2;
 mesh(new RoundedBoxGeometry(.085,boss+.014,.09,3,.012),iron,0,headY,0,tool);
 for(const z of [-.05,.05])mesh(new RoundedBoxGeometry(.07,boss+.022,.012,2,.004),iron,0,headY,z,tool);
 // Haft: lathed along +y, then laid along -x. Swelled butt, slim neck, thickening into the eye.
 const profile=[[0,0],[r*.7,0],[r*1.22,.012],[r*1.3,.04],[r*1.02,.08],[r*.94,.2],[r*.98,length*.6],[r*1.08,length-.02],[r*1.1,length+.05],[r*.9,length+.058],[0,length+.058]].map(([a,b])=>new THREE.Vector2(a,b));
 const haftGeo=new THREE.LatheGeometry(profile,16);haftGeo.rotateZ(-Math.PI/2);haftGeo.translate(-length,headY,0);
 {const p=haftGeo.attributes.position,cols=[],c=new THREE.Color();
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),a=Math.atan2(p.getZ(i),p.getY(i)-headY),along=(x+length)/length;
   // Grain runs along the haft; hands have darkened the butt, and the eye end is grimy.
   c.set(0x7c5534).lerp(new THREE.Color(0x5a3a22),.5+.5*Math.sin(a*3+x*23+Math.sin(x*61)*1.5));
   if(along<.28)c.multiplyScalar(.72+along);if(along>.9)c.multiplyScalar(.8);
   cols.push(c.r,c.g,c.b);}
  haftGeo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));}
 mesh(haftGeo,wood,0,0,0,tool);
 // End grain through the eye, split by an iron wedge.
 const cap=mesh(new THREE.CylinderGeometry(r*.92,r*.92,.006,14),endGrain,.061,headY,0,tool);cap.rotation.z=Math.PI/2;
 mesh(new THREE.BoxGeometry(.008,r*1.5,.009),iron,.065,headY,0,tool);
 // Langets riveted along the top and bottom of the haft below the head.
 for(const y of [1,-1]){
  mesh(new THREE.BoxGeometry(.15,.006,.024),iron,-.105,headY+y*r*1.02,0,tool);
  for(const x of [-.06,-.14]){const rivet=mesh(new THREE.SphereGeometry(.009,8,6),bright,x,headY+y*(r*1.02+.003),0,tool);rivet.scale.y=.6;}
 }
 // Spiralled leather grip near the butt, bound at both ends.
 const gripStart=-length+.1,gripEnd=-length+.33,turns=8,helix=[];
 for(let i=0;i<=turns*12;i++){const t=i/(turns*12),a=t*turns*Math.PI*2;helix.push(new THREE.Vector3(gripStart+(gripEnd-gripStart)*t,headY+Math.cos(a)*(r*.97+.005),Math.sin(a)*(r*.97+.005)));}
 mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix),turns*24,.0075,6),leather,0,0,0,tool);
 for(const x of [gripStart,gripEnd]){const band=mesh(new THREE.TorusGeometry(r*.97+.006,.006,6,20),leather,x,headY,0,tool);band.rotation.y=Math.PI/2;}
 // Scratches across the top face of the head.
 if(!crystal)for(let i=0;i<5;i++){const z=(i-2)*.042+(broad?.03:0),s=mesh(new THREE.BoxGeometry(.028,.0015,.0022),bright,-.002-bend*(z/span)**2,headY+halfHeight(.5+z/span/2)+.0004,z,tool);s.rotation.y=.5+noise(i,3)*.6;}
 // Lay the butt down on the floor, then drop the lowest point to y=0 and centre it on the tile.
 tool.rotation.z=Math.asin(Math.max(0,headY-r*1.3)/length);
 tool.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(tool,true),centre=bounds.getCenter(new THREE.Vector3());
 const holder=new THREE.Group();holder.rotation.y=-.6;g.add(holder);holder.add(tool);
 tool.position.set(-centre.x,-bounds.min.y,-centre.z);
 return g;
}
export function lightItemKind(name=''){
 const n=name.toLowerCase();
 if(/\blantern\b/.test(n))return 'lantern';
 if(/\blamp\b/.test(n))return 'lamp';
 if(/\bcandles?\b/.test(n))return 'candle';
 return null;
}
export function createLightItem(name){
 const kind=lightItemKind(name);if(!kind)return null;
 const {g,mat,mesh,ball,cyl,ring}=kit(name);g.userData.restingWeapon=true;
 const brass=mat(0xb79b53,{metalness:.75,roughness:.3}),dark=mat(0x34312c),wax=mat(/tallow/i.test(name)?0xbead82:0xeee0b4);
 if(kind==='candle'){
  cyl(brass,0,.035,0,.17,.20,.07);cyl(wax,0,.26,0,.073,.082,.40);
  const lip=ring(wax,0,.465,0,.058,.014);lip.rotation.x=Math.PI/2;
  cyl(dark,0,.487,0,.009,.009,.055,6);
  for(const [a,h] of [[.4,.09],[2,.14],[4,.065]])ball(wax,Math.cos(a)*.073,.43-h*.3,Math.sin(a)*.073,.017,h*.5,.019);
 }else if(kind==='lamp'){
  cyl(brass,0,.035,0,.18,.21,.07);
  ball(brass,0,.14,0,.22,.11,.16);cyl(brass,0,.25,0,.10,.14,.045);ball(brass,0,.285,0,.035,.03,.035);
  const spout=mesh(new THREE.ConeGeometry(.075,.32,12),brass,.25,.20,0);spout.rotation.z=-Math.PI/2-.25;
  cyl(dark,.395,.25,0,.013,.013,.042,6);
  const handle=ring(brass,-.23,.20,0,.115,.021);handle.scale.set(.85,1,1);
 }else{
  const glass=mat(0xc1dcd9,{transparent:true,opacity:.22,roughness:.18,metalness:.1,depthWrite:false});
  cyl(brass,0,.05,0,.18,.20,.10);cyl(brass,0,.49,0,.10,.18,.12);
  cyl(glass,0,.28,0,.125,.14,.36,20);
  for(const x of [-.14,.14])for(const z of [-.08,.08])cyl(brass,x,.285,z,.012,.012,.38,6);
  cyl(dark,0,.13,0,.065,.08,.07);cyl(wax,0,.215,0,.03,.04,.12);cyl(dark,0,.29,0,.008,.008,.035,6);
  const handle=ring(dark,0,.62,0,.13,.015);handle.scale.y=1.15;
 }
 return g;
}
