import * as THREE from 'three';
import {createWand,wandAppearance} from './wand.js';

export function createHeldWeapon(item){
 const g=new THREE.Group();if(!item)return g;
 // A wielded wand is held by its grip like the floor wand's model; its look comes from the
 // hero-view name ("oak wand"), since an identified "wand of fire" names no appearance.
 if(item.class===11){const wand=createWand(wandAppearance(item.name));wand.name=item.name;return wand;}
 g.name=item.name;
 const steel=new THREE.MeshStandardMaterial({color:0xd0dce2,metalness:.8,roughness:.23});
 const leather=new THREE.MeshStandardMaterial({color:0x442c22,roughness:.92});
 const brass=new THREE.MeshStandardMaterial({color:0xbe9650,metalness:.7,roughness:.35});
 function part(geometry,material,x,y,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;}
 const name=(item.name||'').toLowerCase();
 const blade=/sword|dagger|knife|athame|saber|scimitar|katana|tsurugi|wakizashi/.test(name);
 if(blade){
  const short=/dagger|knife|athame/.test(name),length=short?.34:.75,width=short?.055:.075;
  part(new THREE.CylinderGeometry(.029,.035,.17,8),leather,0,0);
  part(new THREE.SphereGeometry(.044,8,6),brass,0,-.11);
  part(new THREE.BoxGeometry(short?.18:.27,.035,.065),brass,0,.105);
  // Diamond cross-section: bright bevels and a continuous pointed tip.
  const vertices=[-width,.13,0,0,.13,.024,width,.13,0,0,.13,-.024,-width*.65,length,0,0,length,.017,width*.65,length,0,0,length,-.017,0,length+.16,0];
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex([0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0,4,8,5,5,8,6,6,8,7,7,8,4,0,1,2,0,2,3]);geo.computeVertexNormals();part(geo,steel,0,0);
 }else if(/\bquarterstaff\b/.test(name)){
  const wood=new THREE.MeshStandardMaterial({color:0x735035,roughness:.9});
  g.userData.extraMaterial=wood;
  part(new THREE.CylinderGeometry(.024,.029,1.48,12),wood,0,.15);
  part(new THREE.CylinderGeometry(.033,.033,.23,12),leather,0,0);
  for(let i=0;i<7;i++)part(new THREE.CylinderGeometry(.035,.035,.008,12),leather,0,-.105+i*.035);
  for(const y of [-.57,.87]){
   part(new THREE.CylinderGeometry(.031,.031,.07,12),steel,0,y);
   part(new THREE.CylinderGeometry(.033,.033,.015,12),brass,0,y+(y<0?.045:-.045));
  }
 }else if(/\bcrossbow\b/.test(name)){
  const wood=new THREE.MeshStandardMaterial({color:0x805735,roughness:.86});
  g.userData.extraMaterial=wood;
  // Stock follows the weapon axis; the hand holds the bound rear section.
  part(new THREE.BoxGeometry(.085,.72,.095),wood,0,.2);
  part(new THREE.BoxGeometry(.11,.18,.11),leather,0,-.035);
  part(new THREE.BoxGeometry(.115,.035,.115),brass,0,-.145);
  for(const x of [-.027,.027])part(new THREE.BoxGeometry(.012,.48,.015),steel,x,.29,.055);
  part(new THREE.BoxGeometry(.12,.08,.12),brass,0,.44);
  for(const side of [-1,1]){
   const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,.45,0),new THREE.Vector3(side*.15,.44,0),
    new THREE.Vector3(side*.29,.38,0),new THREE.Vector3(side*.38,.3,0)
   ]);
   part(new THREE.TubeGeometry(curve,16,.018,6,false),steel,0,0);
   const cord=new THREE.LineCurve3(new THREE.Vector3(side*.38,.3,.025),new THREE.Vector3(0,.055,.06));
   part(new THREE.TubeGeometry(cord,1,.004,5,false),leather,0,0);
  }
  // A seated bolt and fletching make the firing direction readable.
  part(new THREE.CylinderGeometry(.008,.008,.43,6),wood,0,.31,.072);
  part(new THREE.ConeGeometry(.022,.07,4),steel,0,.56,.072);
  part(new THREE.BoxGeometry(.065,.065,.007),leather,0,.12,.072);
  const trigger=new THREE.TorusGeometry(.043,.007,5,12,Math.PI);
  trigger.rotateZ(Math.PI/2);part(trigger,brass,0,.015,-.065);
 }else if(/\bbow\b/.test(name)){
  const wood=new THREE.MeshStandardMaterial({color:0x805735,roughness:.82});
  g.userData.extraMaterial=wood;
  // The grip sits at the hand origin, with symmetrical curved limbs.
  for(const side of [-1,1]){
   const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,0,0),new THREE.Vector3(.025,side*.16,0),
    new THREE.Vector3(.11,side*.34,0),new THREE.Vector3(.13,side*.48,0),
    new THREE.Vector3(.095,side*.58,0)
   ]);
   part(new THREE.TubeGeometry(curve,20,.021,8,false),wood,0,0);
   part(new THREE.SphereGeometry(.026,8,6),brass,.095,side*.58);
  }
  part(new THREE.CylinderGeometry(.03,.03,.17,12),leather,0,0);
  for(let i=0;i<5;i++)part(new THREE.CylinderGeometry(.032,.032,.008,12),brass,0,-.066+i*.033);
  // A physical cord survives the same held and ground transforms as the limbs.
  part(new THREE.CylinderGeometry(.004,.004,1.16,6),leather,.095,0);
 }else if(/\b(spear|javelin|pike)\b/.test(name)){
  const shaftLength=/javelin/.test(name)?.88:/pike/.test(name)?1.55:1.2;
  const wood=new THREE.MeshStandardMaterial({color:0x805735,roughness:.86});
  g.userData.extraMaterial=wood;
  const shoulder=shaftLength-.3;
  part(new THREE.CylinderGeometry(.018,.025,shaftLength,12),wood,0,shaftLength/2-.3);
  part(new THREE.CylinderGeometry(.028,.028,.18,12),leather,0,0);
  for(const y of [-.09,.09])part(new THREE.CylinderGeometry(.03,.03,.015,12),brass,0,y);
  part(new THREE.CylinderGeometry(.025,.018,.09,12),steel,0,-.3);
  part(new THREE.CylinderGeometry(.027,.034,.12,12),steel,0,shoulder);
  // Raised central ridge and thin edges keep the socketed leaf blade readable.
  const geo=new THREE.BufferGeometry();
  const y=shoulder+.045;
  geo.setAttribute('position',new THREE.Float32BufferAttribute([
   0,y,0, -.067,y+.12,0, 0,y+.36,0, .067,y+.12,0,
   0,y+.12,.022, 0,y+.12,-.022
  ],3));
  geo.setIndex([0,4,1,1,4,2,2,4,3,3,4,0,0,1,5,1,2,5,2,3,5,3,0,5]);
  geo.computeVertexNormals();part(geo,steel,0,0);
 }else if(/\bflail\b/.test(name)){
  const wood=new THREE.MeshStandardMaterial({color:0x735035,roughness:.9});
  g.userData.extraMaterial=wood;
  part(new THREE.CylinderGeometry(.025,.032,.53,10),wood,0,.13);
  part(new THREE.CylinderGeometry(.037,.037,.19,10),leather,0,-.015);
  for(let i=0;i<5;i++)part(new THREE.CylinderGeometry(.039,.039,.009,10),brass,0,-.09+i*.036);
  part(new THREE.SphereGeometry(.044,10,8),brass,0,-.15);
  part(new THREE.CylinderGeometry(.036,.036,.045,10),steel,0,.385);
  // Alternating link planes make the chain readable without animation state.
  for(let i=0;i<6;i++){
   const link=part(new THREE.TorusGeometry(.032,.009,6,12),steel,i*.026,.42+i*.038);
   link.scale.y=1.28;link.rotation.z=-.6;link.rotation.y=i%2?Math.PI/2:0;
  }
  const center=new THREE.Vector3(.18,.68,0);
  part(new THREE.IcosahedronGeometry(.115,1),steel,center.x,center.y);
  // Short radial studs distinguish the striking head from a smooth mace.
  for(const direction of [new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0),new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)]){
   const pos=center.clone().addScaledVector(direction,.125);
   const stud=part(new THREE.ConeGeometry(.033,.095,4),steel,pos.x,pos.y,pos.z);
   stud.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
  }
 }else if(/\bmace\b/.test(name)){
  // Flanged head and bound grip distinguish a mace from a square hammer.
  part(new THREE.CylinderGeometry(.024,.03,.57,10),steel,0,.18);
  part(new THREE.CylinderGeometry(.036,.036,.19,10),leather,0,-.015);
  for(let i=0;i<5;i++)part(new THREE.CylinderGeometry(.038,.038,.009,10),brass,0,-.09+i*.036);
  part(new THREE.SphereGeometry(.047,10,8),brass,0,-.135);
  part(new THREE.CylinderGeometry(.055,.065,.22,12),steel,0,.47);
  const outline=new THREE.Shape();outline.moveTo(.045,.35);outline.lineTo(.115,.39);outline.lineTo(.14,.51);outline.lineTo(.09,.585);outline.lineTo(.045,.58);outline.closePath();
  for(let i=0;i<6;i++){
   const flange=new THREE.ExtrudeGeometry(outline,{depth:.018,bevelEnabled:true,bevelThickness:.003,bevelSize:.004,bevelSegments:1,steps:1});flange.translate(0,0,-.009);
   part(flange,steel,0,0).rotation.y=i*Math.PI/3;
  }
  for(const y of [.35,.59])part(new THREE.CylinderGeometry(.068,.068,.022,12),brass,0,y);
 }else if(/\b(war hammer|hammer)\b/.test(name)){
  part(new THREE.CylinderGeometry(.025,.032,.65,10),leather,0,.18);
  for(let i=0;i<5;i++)part(new THREE.CylinderGeometry(.034,.034,.012,10),brass,0,-.09+i*.035);
  part(new THREE.SphereGeometry(.043,10,8),brass,0,-.15);
  // Forged transverse head: broad striking face, central eye, tapered rear peen.
  const head=new THREE.CylinderGeometry(.072,.085,.22,4);head.rotateZ(Math.PI/2);part(head,steel,-.045,.48);
  const face=new THREE.CylinderGeometry(.089,.089,.035,4);face.rotateZ(Math.PI/2);part(face,steel,-.17,.48);
  const peen=new THREE.ConeGeometry(.068,.18,4);peen.rotateZ(-Math.PI/2);part(peen,steel,.145,.48);
  part(new THREE.BoxGeometry(.06,.17,.12),brass,0,.48);
  part(new THREE.CylinderGeometry(.041,.041,.045,10),brass,0,.37);
 }else if(/\baxe\b/.test(name)){
  part(new THREE.CylinderGeometry(.026,.036,.68,10),leather,0,.18);
  for(let i=0;i<5;i++)part(new THREE.CylinderGeometry(.037,.037,.01,10),brass,0,-.12+i*.033);
  part(new THREE.CylinderGeometry(.045,.045,.12,10),steel,0,.47);
  const outline=new THREE.Shape();outline.moveTo(.02,.53);outline.quadraticCurveTo(.14,.56,.24,.63);outline.quadraticCurveTo(.29,.45,.23,.29);outline.quadraticCurveTo(.13,.39,.02,.4);outline.closePath();
  const axeBlade=new THREE.ExtrudeGeometry(outline,{depth:.025,bevelEnabled:true,bevelSize:.008,bevelThickness:.005,bevelSegments:2,steps:1,curveSegments:10});axeBlade.translate(0,0,-.0125);part(axeBlade,steel,0,0);
  part(new THREE.BoxGeometry(.09,.085,.065),steel,-.055,.47);
  if(/battle-axe/.test(name)){const second=axeBlade.clone();second.rotateY(Math.PI);part(second,steel,0,0);}
 }else if(/\bclub\b/.test(name)){
  // A carved wooden striking head flows into the grip, without a metal cube.
  const profile=[new THREE.Vector2(0,-.15),new THREE.Vector2(.038,-.14),new THREE.Vector2(.029,-.09),new THREE.Vector2(.028,.09),new THREE.Vector2(.047,.22),new THREE.Vector2(.078,.4),new THREE.Vector2(.086,.49),new THREE.Vector2(.058,.55),new THREE.Vector2(0,.57)];
  part(new THREE.LatheGeometry(profile,12),leather,0,0);
  for(let i=0;i<5;i++)part(new THREE.CylinderGeometry(.033,.033,.014,10),brass,0,-.08+i*.031);
  const grain=new THREE.MeshStandardMaterial({color:0x281b15,roughness:1});
  for(let i=0;i<7;i++){
   const a=i*Math.PI*2/7;
   const points=[[.21,.046],[.33,.064],[.44,.082],[.51,.075]].map(([y,r],j)=>new THREE.Vector3(Math.cos(a+j*.025)*r,y,Math.sin(a+j*.025)*r));
   part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),8,.002,3,false),grain,0,0);
  }
  g.userData.extraMaterial=grain;
 }else if(/\b(fauchard|pole sickle)\b/.test(name)){
  // A fauchard: a long ash pole carrying a curved sickle blade whose edge runs down the inside of
  // the curve, with a back lug for hooking. The blade is socketed, held by riveted langets and
  // brass collars; the bright ground edge follows the inner curve. The blade lies in the x-y
  // plane, so on the floor it lies flat.
  const wood=new THREE.MeshStandardMaterial({color:0x8a6440,roughness:.84}),edge=new THREE.MeshStandardMaterial({color:0xf2f7fa,metalness:.9,roughness:.12});
  g.userData.extraMaterial=wood;g.userData.extraMaterials=[edge];
  part(new THREE.CylinderGeometry(.019,.024,1.3,12),wood,0,.3);
  part(new THREE.CylinderGeometry(.028,.028,.2,12),leather,0,0);
  for(let i=0;i<6;i++)part(new THREE.CylinderGeometry(.03,.03,.007,12),leather,0,-.085+i*.034);
  part(new THREE.CylinderGeometry(.026,.021,.07,12),steel,0,-.36);part(new THREE.SphereGeometry(.022,10,6),steel,0,-.395);
  // socket, collars and langets running down the pole, with rivets
  part(new THREE.CylinderGeometry(.024,.028,.13,12),steel,0,.93);
  for(const y of [.87,.99])part(new THREE.CylinderGeometry(.031,.031,.016,12),brass,0,y);
  for(const z of [-1,1]){part(new THREE.BoxGeometry(.014,.2,.006),steel,0,.76,z*.022);for(const y of [.7,.8])part(new THREE.SphereGeometry(.006,6,4),brass,0,y,z*.026);}
  // the blade: rises from the socket, arches forward and hooks down to the point
  const outline=new THREE.Shape();
  outline.moveTo(-.022,.98);outline.quadraticCurveTo(-.035,1.3,.11,1.37);outline.quadraticCurveTo(.25,1.4,.29,1.2);
  outline.quadraticCurveTo(.21,1.31,.11,1.29);outline.quadraticCurveTo(.035,1.25,.022,1.0);outline.closePath();
  const sickle=new THREE.ExtrudeGeometry(outline,{depth:.012,bevelEnabled:true,bevelThickness:.004,bevelSize:.006,bevelSegments:2,steps:1,curveSegments:14});
  sickle.translate(0,0,-.006);part(sickle,steel,0,0);
  // the back lug, a short spur for pulling riders down
  const lug=new THREE.Shape();lug.moveTo(-.02,1.03);lug.lineTo(-.1,1.1);lug.lineTo(-.085,1.115);lug.lineTo(-.02,1.1);lug.closePath();
  const spur=new THREE.ExtrudeGeometry(lug,{depth:.012,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:1});spur.translate(0,0,-.006);part(spur,steel,0,0);
  // the honed edge along the inside of the curve
  const inner=new THREE.CatmullRomCurve3([[.285,1.205],[.24,1.27],[.17,1.3],[.11,1.29],[.065,1.27],[.037,1.2],[.026,1.07]].map(([x,y])=>new THREE.Vector3(x,y,0)));
  part(new THREE.TubeGeometry(inner,40,.0045,4,false),edge,0,0);
 }else if(/\blance\b/.test(name)){
  // A jousting lance: a long painted shaft, spiral-striped, swelling to a heavy grip behind a
  // flared steel vamplate that guards the hand, then tapering to a small steel point. A forked
  // pennon flies just behind the tip. The pennon lies in the x-y plane.
  const wood=new THREE.MeshStandardMaterial({color:0xd9c9a4,roughness:.7}),paint=new THREE.MeshStandardMaterial({color:0x2c4a8a,roughness:.6});
  const cloth=new THREE.MeshStandardMaterial({color:0xb8262a,roughness:.85,side:THREE.DoubleSide});
  g.userData.extraMaterial=wood;g.userData.extraMaterials=[paint,cloth];
  const R=y=>y<.2?.042:y<.36?.042-(y-.2)*.05:Math.max(.012,.034-(y-.36)*.0175);
  // the shaft, turned from a profile: a swelled butt, the grip, then the long taper
  const profile=[[0,-.4],[.03,-.4],[.046,-.34],[.05,-.22],[.036,-.12],[.034,.12],[.042,.2],[.034,.36],[.024,.95],[.014,1.62],[0,1.64]];
  part(new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),14),wood,0,0);
  part(new THREE.CylinderGeometry(.037,.037,.22,12),leather,0,0);
  for(let i=0;i<6;i++)part(new THREE.CylinderGeometry(.039,.039,.007,12),leather,0,-.09+i*.036);
  part(new THREE.CylinderGeometry(.032,.03,.05,12),brass,0,-.4);
  // the painted spiral stripe running up the shaft
  const spiral=[];for(let i=0;i<=120;i++){const y=.4+i/120*1.12,a=i/120*Math.PI*2*6;spiral.push(new THREE.Vector3(Math.cos(a)*(R(y)+.003),y,Math.sin(a)*(R(y)+.003)));}
  part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral),240,.009,4,false),paint,0,0);
  // the vamplate: a steel cone flaring back over the hand, rolled at the rim and studded
  const vamp=new THREE.LatheGeometry([[.03,.33],[.05,.3],[.1,.2],[.135,.13],[.14,.12]].map(([r,y])=>new THREE.Vector2(r,y)),24);part(vamp,steel,0,0);
  const rim=part(new THREE.TorusGeometry(.14,.008,6,28),brass,0,.12);rim.rotation.x=Math.PI/2;
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;part(new THREE.SphereGeometry(.008,6,4),brass,Math.cos(a)*.115,.17,Math.sin(a)*.115);}
  // the point: a socket and a short four-sided bodkin
  part(new THREE.CylinderGeometry(.013,.017,.07,10),steel,0,1.6);
  part(new THREE.ConeGeometry(.02,.14,4),steel,0,1.705);
  part(new THREE.CylinderGeometry(.019,.019,.01,10),brass,0,1.565);
  // the pennon: a forked swallowtail pinned to the shaft, rippling
  const flag=new THREE.Shape();flag.moveTo(0,0);flag.lineTo(.3,.02);flag.lineTo(.2,-.055);flag.lineTo(.3,-.13);flag.lineTo(0,-.12);flag.closePath();
  const pennon=new THREE.ShapeGeometry(flag,1),fp=pennon.attributes.position;
  for(let i=0;i<fp.count;i++){const x=fp.getX(i);fp.setZ(i,Math.sin(x*18)*.018*x/.3);fp.setY(i,fp.getY(i)-x*.12);}
  pennon.computeVertexNormals();part(pennon,cloth,.016,1.5);
  for(const y of [1.5,1.385])part(new THREE.CylinderGeometry(.018,.018,.012,10),brass,0,y);
 }else{
  // A restrained proxy for weapon families whose detailed models are still pending.
  part(new THREE.CylinderGeometry(.027,.035,.65,8),leather,0,.18);
  if(/axe/.test(name))part(new THREE.BoxGeometry(.3,.19,.045),steel,.08,.48);
  else if(/mace|hammer|club/.test(name))part(new THREE.BoxGeometry(.19,.18,.16),steel,0,.48);
  else if(/spear|pike|javelin/.test(name))part(new THREE.ConeGeometry(.065,.24,4),steel,0,.61);
 }
 g.userData.dispose=()=>{g.traverse(o=>o.geometry?.dispose());g.userData.extraMaterial?.dispose();g.userData.extraMaterials?.forEach(m=>m.dispose());steel.dispose();leather.dispose();brass.dispose();};return g;
}
