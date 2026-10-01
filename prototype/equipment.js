import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
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
 // An artifact ("Excalibur") takes the model of its base type, which the bridge sends as `base`.
 const name=(item.base||item.name||'').toLowerCase();
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
 }else if(/\bmorning star\b/.test(name)){
  buildMorningStar(g);
 }else if(/\bhalberd\b/.test(name)){
  buildHalberd(g);
 }else if(/\btrident\b/.test(name)){
  buildTrident(g);
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
 }else{
  // A restrained proxy for weapon families whose detailed models are still pending.
  part(new THREE.CylinderGeometry(.027,.035,.65,8),leather,0,.18);
  if(/axe/.test(name))part(new THREE.BoxGeometry(.3,.19,.045),steel,.08,.48);
  else if(/mace|hammer|club/.test(name))part(new THREE.BoxGeometry(.19,.18,.16),steel,0,.48);
  else if(/spear|pike|javelin/.test(name))part(new THREE.ConeGeometry(.065,.24,4),steel,0,.61);
 }
 g.userData.dispose=()=>{g.traverse(o=>o.geometry?.dispose());[].concat(g.userData.extraMaterial??[]).forEach(m=>m.dispose());steel.dispose();leather.dispose();brass.dispose();};return g;
}

// The morning star: a blackened, iron-banded haft under a hammered iron ball bristling with
// uneven forged spikes, one long spike crowning it and a spiked pommel below the grip.
// Iron straps (langets) run down from the head to hold it on. Every part shares one of
// four materials and is merged per material: 4 draws, where a part-per-mesh build was ~60.
// The ball and spikes stay metalness >= .75, so weapon-magic still sheathes them.
function buildMorningStar(g){
 const wood=new THREE.MeshStandardMaterial({color:0x3f2a1d,roughness:.92});
 const iron=new THREE.MeshStandardMaterial({color:0x58554f,metalness:.78,roughness:.52});
 const spikeSteel=new THREE.MeshStandardMaterial({color:0xb4bcbf,metalness:.82,roughness:.3});
 const wrap=new THREE.MeshStandardMaterial({color:0x2e1d17,roughness:.95});
 g.userData.extraMaterial=[wood,iron,spikeSteel,wrap];
 const sets=new Map([[wood,[]],[iron,[]],[spikeSteel,[]],[wrap,[]]]);
 const up=new THREE.Vector3(0,1,0);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 const hash=i=>{const v=Math.sin(i*127.1+31.7)*43758.5453;return v-Math.floor(v);};
 // Haft, swelling slightly toward the head, and the leather grip wound on a slant.
 put(new THREE.CylinderGeometry(.027,.023,.66,10),wood,0,.18);
 put(new THREE.CylinderGeometry(.033,.033,.21,10),wrap,0,-.015);
 for(let i=0;i<6;i++){const turn=new THREE.TorusGeometry(.034,.006,4,14);turn.rotateX(Math.PI/2);
  put(turn,wrap,0,-.1+i*.034,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.32));}
 // Pommel: an iron cap ending in a short downward spike.
 put(new THREE.CylinderGeometry(.036,.03,.04,10),iron,0,-.14);
 put(new THREE.ConeGeometry(.02,.07,5),spikeSteel,0,-.19,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));
 // Iron bands and four langets nailed down the haft below the head.
 for(const y of [.12,.36])put(new THREE.CylinderGeometry(.031,.031,.022,10),iron,0,y);
 for(let i=0;i<4;i++){const a=i*Math.PI/2+.4;put(new THREE.BoxGeometry(.012,.2,.006),iron,Math.cos(a)*.027,.44,Math.sin(a)*.027,new THREE.Quaternion().setFromAxisAngle(up,-a+Math.PI/2));
  for(const y of [.38,.48])put(new THREE.SphereGeometry(.006,5,4),iron,Math.cos(a)*.031,y,Math.sin(a)*.031);}
 put(new THREE.CylinderGeometry(.04,.032,.05,10),iron,0,.535);
 // The ball, hammered lumpy so it catches the light unevenly.
 const R=.088,cy=.63,ball=new THREE.IcosahedronGeometry(R,2),pos=ball.attributes.position,v=new THREE.Vector3();
 const dent=new Map();
 for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);const key=v.toArray().map(n=>n.toFixed(4)).join();
  if(!dent.has(key))dent.set(key,1-.07*hash(dent.size+3));v.multiplyScalar(dent.get(key));pos.setXYZ(i,v.x,v.y,v.z);}
 ball.computeVertexNormals();put(ball,iron,0,cy);
 // Spikes on the icosahedron's 12 points and 20 face centres, uneven in length and bent off
 // true; none under the collar. The top one is a long crowning spike.
 const dirs=[],ico=new THREE.IcosahedronGeometry(1,0).attributes.position,seen=new Set();
 for(let i=0;i<ico.count;i++){v.fromBufferAttribute(ico,i).normalize();const key=v.toArray().map(n=>n.toFixed(3)).join();if(!seen.has(key)){seen.add(key);dirs.push(v.clone());}}
 for(let i=0;i<ico.count;i+=3)dirs.push(new THREE.Vector3().fromBufferAttribute(ico,i).add(new THREE.Vector3().fromBufferAttribute(ico,i+1)).add(new THREE.Vector3().fromBufferAttribute(ico,i+2)).normalize());
 const tilt=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(.3,0,1).normalize(),.28);
 dirs.forEach((d,i)=>{
  d.applyQuaternion(tilt);
  if(d.y<-.72)return;
  const crown=d.y>.97,len=crown?.15:(.065+.05*hash(i+11))*(i<12?1:.82),r=crown?.019:.015+.004*hash(i+29);
  const bent=d.clone().add(new THREE.Vector3(hash(i+41)-.5,hash(i+53)-.5,hash(i+67)-.5).multiplyScalar(.22)).normalize();
  const at=d.clone().multiplyScalar(R*.9+len/2);
  put(new THREE.ConeGeometry(r,len,5),spikeSteel,at.x,cy+at.y,at.z,new THREE.Quaternion().setFromUnitVectors(up,bent));
  // A rough iron boss where each spike is forged into the ball.
  const foot=d.clone().multiplyScalar(R*.93);
  put(new THREE.CylinderGeometry(r*1.25,r*1.6,.016,5),iron,foot.x,cy+foot.y,foot.z,new THREE.Quaternion().setFromUnitVectors(up,d));
 });
 for(const [m,geos] of sets){const geo=mergeGeometries(geos.map(x=>{x.deleteAttribute('uv');return x;}));geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(geo,m);mesh.castShadow=true;mesh.userData.part=m===spikeSteel?'spikes':m===iron?'head':m===wood?'haft':'grip';g.add(mesh);}
}

// The halberd: a long blackened haft under a forged head. A broad axe blade with a hooked
// beard, two jagged notches and a crescent cut clean through it; a back fluke curving down
// like a talon; a four-sided spike crowning it. Iron langets nailed down the haft hold the
// head on, the grip is wound on a slant and the butt ends in an iron spike. Merged per
// material like the morning star: 4 draws. The blade, fluke and spike stay metalness >= .75,
// so weapon-magic sheathes them.
function buildHalberd(g){
 const wood=new THREE.MeshStandardMaterial({color:0x3a281c,roughness:.92});
 const iron=new THREE.MeshStandardMaterial({color:0x4f4c47,metalness:.78,roughness:.55});
 const blade=new THREE.MeshStandardMaterial({color:0xaeb6b9,metalness:.82,roughness:.3});
 const wrap=new THREE.MeshStandardMaterial({color:0x2e1d17,roughness:.95});
 g.userData.extraMaterial=[wood,iron,blade,wrap];
 const sets=new Map([[wood,[]],[iron,[]],[blade,[]],[wrap,[]]]);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);geo.deleteAttribute('uv');sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 const flat=(shape,depth,bevel)=>{const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1,curveSegments:8});geo.translate(0,0,-depth/2);return geo;};
 // Haft, a little thicker toward the head, and the grip wound on a slant.
 put(new THREE.CylinderGeometry(.025,.022,1.2,10),wood,0,.21);
 put(new THREE.CylinderGeometry(.031,.031,.22,10),wrap,0,-.01);
 for(let i=0;i<6;i++){const turn=new THREE.TorusGeometry(.032,.006,4,14);turn.rotateX(Math.PI/2);
  put(turn,wrap,0,-.1+i*.036,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.32));}
 // Butt: an iron shoe ending in a short spike.
 put(new THREE.CylinderGeometry(.026,.022,.06,10),iron,0,-.4);
 put(new THREE.ConeGeometry(.018,.09,4),blade,0,-.475,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));
 // Two long langets nailed down the haft below the socket, and a band at their foot.
 for(const s of [-1,1]){
  put(new THREE.BoxGeometry(.006,.26,.016),iron,0,.66,s*.025);
  for(const y of [.57,.65,.73])put(new THREE.SphereGeometry(.0055,5,4),iron,0,y,s*.029);
 }
 put(new THREE.CylinderGeometry(.03,.03,.02,10),iron,0,.53);
 // The socket the head is forged onto.
 put(new THREE.CylinderGeometry(.03,.034,.17,8),iron,0,.875);
 put(new THREE.CylinderGeometry(.037,.037,.018,8),iron,0,.79);
 // Axe blade on +x: the beard hooks down, the edge swells forward and the upper horn rises;
 // two notches bite into the edge and a crescent is cut clean through near the socket.
 const axe=new THREE.Shape();
 axe.moveTo(.02,.81);axe.lineTo(.07,.79);axe.quadraticCurveTo(.13,.76,.17,.68);
 axe.lineTo(.215,.71);
 axe.lineTo(.222,.76);axe.lineTo(.206,.775);axe.lineTo(.226,.79);
 axe.quadraticCurveTo(.234,.85,.226,.9);
 axe.lineTo(.21,.915);axe.lineTo(.23,.93);
 axe.quadraticCurveTo(.228,.98,.21,1.0);
 axe.quadraticCurveTo(.15,.95,.07,.945);axe.lineTo(.02,.94);axe.closePath();
 const cut=new THREE.Path();cut.moveTo(.085,.83);cut.quadraticCurveTo(.125,.87,.085,.91);cut.quadraticCurveTo(.11,.87,.085,.83);
 axe.holes.push(cut);
 put(flat(axe,.012,.004),blade);
 // The back fluke, a talon curving out and down.
 const fluke=new THREE.Shape();
 fluke.moveTo(-.02,.85);fluke.lineTo(-.02,.92);fluke.quadraticCurveTo(-.1,.9,-.15,.79);fluke.quadraticCurveTo(-.09,.85,-.02,.85);
 put(flat(fluke,.01,.004),blade);
 // The crowning spike: a long four-sided point on a short neck.
 put(new THREE.CylinderGeometry(.018,.03,.04,4),iron,0,.98,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/4));
 put(new THREE.ConeGeometry(.022,.17,4),blade,0,1.085,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/4));
 for(const [m,geos] of sets){const geo=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(geo,m);mesh.castShadow=true;mesh.userData.part=m===blade?'blade':m===iron?'head':m===wood?'haft':'grip';g.add(mesh);}
}

// The trident: a blackened haft under three barbed tines. The outer two splay out from a
// downswept iron crossbar and hook back in at the top like claws; the longer middle one runs
// straight. Each ends in a flat harpoon head whose barbs hook back down, and the middle tine
// carries two more barbs below its head. Two iron fangs hang under the crossbar either side
// of the socket. The grip is wound on a slant and the butt ends in a ringed iron ferrule.
// Merged per material like the halberd: 4 draws. Tines and heads stay metalness >= .75, so
// weapon-magic sheathes them.
function buildTrident(g){
 const wood=new THREE.MeshStandardMaterial({color:0x33251b,roughness:.92});
 const iron=new THREE.MeshStandardMaterial({color:0x48464a,metalness:.78,roughness:.55});
 const blade=new THREE.MeshStandardMaterial({color:0xa9b3b8,metalness:.82,roughness:.3});
 const wrap=new THREE.MeshStandardMaterial({color:0x2a1b16,roughness:.95});
 g.userData.extraMaterial=[wood,iron,blade,wrap];
 const sets=new Map([[wood,[]],[iron,[]],[blade,[]],[wrap,[]]]);
 const put=(geo,m,x=0,y=0,z=0,q)=>{if(q)geo.applyQuaternion(q);geo.translate(x,y,z);geo.deleteAttribute('uv');sets.get(m).push(geo.index?geo.toNonIndexed():geo);};
 const zTurn=a=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),a);
 // A tube along a curve whose radius tapers from r0 to r1, for tines that thin to their heads.
 const taper=(points,r0,r1,segments=14)=>{
  const curve=new THREE.CatmullRomCurve3(points.map(([x,y])=>new THREE.Vector3(x,y,0)));
  const geo=new THREE.TubeGeometry(curve,segments,1,6,false),pos=geo.attributes.position,v=new THREE.Vector3(),c=new THREE.Vector3();
  for(let i=0;i<=segments;i++){curve.getPointAt(i/segments,c);const r=r0+(r1-r0)*i/segments;
   for(let j=0;j<=6;j++){const k=i*7+j;v.fromBufferAttribute(pos,k).sub(c).multiplyScalar(r).add(c);pos.setXYZ(k,v.x,v.y,v.z);}}
  geo.computeVertexNormals();return {geo,curve};
 };
 // A flat harpoon head pointing up local +y from its neck at 0, its barbs hooking back down.
 const head=(len,w)=>{
  const s=new THREE.Shape();
  s.moveTo(0,len);s.lineTo(w*.95,len*.3);s.lineTo(w*1.15,-.04);s.lineTo(w*.42,.02);s.lineTo(w*.3,0);
  s.lineTo(-w*.3,0);s.lineTo(-w*.42,.02);s.lineTo(-w*1.15,-.04);s.lineTo(-w*.95,len*.3);s.closePath();
  const geo=new THREE.ExtrudeGeometry(s,{depth:.007,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:1,steps:1});geo.translate(0,0,-.0035);return geo;
 };
 // Haft, a little thicker toward the head, and the grip wound on a slant.
 put(new THREE.CylinderGeometry(.024,.021,1.12,10),wood,0,.2);
 put(new THREE.CylinderGeometry(.03,.03,.22,10),wrap,0,-.01);
 for(let i=0;i<6;i++){const turn=new THREE.TorusGeometry(.031,.006,4,14);turn.rotateX(Math.PI/2);
  put(turn,wrap,0,-.1+i*.036,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.4).normalize(),.32));}
 // Butt: a ringed iron ferrule ending in a blunt knob.
 put(new THREE.CylinderGeometry(.026,.022,.07,10),iron,0,-.38);
 put(new THREE.TorusGeometry(.026,.005,4,12).rotateX(Math.PI/2),iron,0,-.355);
 put(new THREE.SphereGeometry(.024,8,6),iron,0,-.415);
 // Socket and collar, with a band lower down.
 put(new THREE.CylinderGeometry(.028,.032,.15,8),iron,0,.83);
 put(new THREE.CylinderGeometry(.036,.036,.018,8),iron,0,.755);
 put(new THREE.CylinderGeometry(.029,.029,.018,10),iron,0,.6);
 // The crossbar sweeps down to the socket and up to the outer tines' roots.
 put(taper([[-.13,.95],[-.07,.9],[0,.885],[.07,.9],[.13,.95]],.017,.017,16).geo,iron);
 // Two iron fangs hang under it either side of the socket.
 for(const s of [-1,1])put(new THREE.ConeGeometry(.011,.06,4),iron,s*.055,.86,0,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI-s*.25));
 // Outer tines splay out, then hook back in at the top like claws.
 for(const s of [-1,1]){
  const {geo,curve}=taper([[s*.13,.95],[s*.175,1.03],[s*.18,1.12],[s*.15,1.2]],.015,.008);
  put(geo,blade);
  const tip=curve.getPointAt(1),dir=curve.getTangentAt(1);
  put(head(.1,.03),blade,tip.x,tip.y,0,zTurn(Math.atan2(-dir.x,dir.y)));
 }
 // The middle tine runs straight and longer, with two more barbs below its head.
 put(taper([[0,.89],[0,1.07],[0,1.25]],.017,.01).geo,blade);
 put(head(.12,.034),blade,0,1.25);
 for(const s of [-1,1]){
  const barb=new THREE.Shape();barb.moveTo(0,.02);barb.lineTo(s*.045,-.03);barb.lineTo(0,-.005);barb.closePath();
  const geo=new THREE.ExtrudeGeometry(barb,{depth:.006,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:1,steps:1});geo.translate(0,0,-.003);
  put(geo,blade,0,1.1+(s>0?0:.05));
 }
 for(const [m,geos] of sets){const geo=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(geo,m);mesh.castShadow=true;mesh.userData.part=m===blade?'tines':m===iron?'head':m===wood?'haft':'grip';g.add(mesh);}
}
