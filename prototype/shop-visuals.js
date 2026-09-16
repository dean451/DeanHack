import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
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
 if(/pick-axe|pickaxe/.test(n))return createTool(name,'pickaxe');
 if(/lock pick/.test(n))return createTool(name,'lockpick');
 if(/skeleton key/.test(n))return createTool(name,'key');
 if(/blindfold/.test(n))return createTool(name,'blindfold');
 if(/can of grease/.test(n))return createTool(name,'grease');
 return null;
}
function createTool(name,kind){
 const {g,mat,mesh,ball,box,cyl,ring}=kit(name);g.userData.restingWeapon=true;
 const iron=mat(0x9aacaf,{metalness:.8,roughness:.28}),wood=mat(0x69462e),gold=mat(0xd0aa4f,{metalness:.72,roughness:.3}),cloth=mat(0x252d35),tin=mat(0x6c7775,{metalness:.55,roughness:.36}),grease=mat(0xc9a44b,{roughness:.45});
 if(kind==='pickaxe'){cyl(wood,0,.3,0,.035,.045,.55,8).rotation.z=-.7;const head=mesh(new THREE.CylinderGeometry(.045,.055,.43,8),iron,.2,.51,0);head.rotation.z=Math.PI/2;mesh(new THREE.ConeGeometry(.06,.3,6),iron,.43,.51,0).rotation.z=Math.PI/2;}
 else if(kind==='lockpick'){for(const x of [-.12,-.04,.04,.12]){cyl(iron,x,.28,0,.012,.012,.43,6).rotation.z=(x*2.2);mesh(new THREE.ConeGeometry(.025,.11,5),iron,x+.035,.51,0).rotation.z=Math.PI/2;}}
 else if(kind==='key'){cyl(gold,0,.3,0,.018,.018,.5,8);ring(gold,0,.57,0,.08,.018).rotation.x=Math.PI/2;for(const x of [-.04,.04])box(gold,x,.06,0,.035,.14,.025);}
 else if(kind==='blindfold'){const band=mesh(new THREE.TorusGeometry(.16,.045,8,24,Math.PI*1.35),cloth,0,.32,0);band.rotation.x=Math.PI/2;for(const x of [-.2,.2])ball(cloth,x,.32,0,.08,.035,.04);}
 else {cyl(tin,0,.13,0,.18,.18,.18);cyl(grease,0,.245,0,.13,.15,.08);ring(gold,0,.3,0,.13,.012).rotation.x=Math.PI/2;}
 const label=()=>{};return g;
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
