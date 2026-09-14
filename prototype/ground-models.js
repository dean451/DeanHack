import * as THREE from 'three';

// Ground-only geometry: every model sits on y=0, without inventory-state mutation.
export function createGroundModel(item={}){
 const name=(item.name||'').toLowerCase(),cls=item.class;
 const g=new THREE.Group(),materials=[];
 const mat=(color,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness:metalness?.38:.9});materials.push(m);return m;};
 const cloth=mat(0xbaa987),leather=mat(0x654331),metal=mat(0x9baeb5,.75),gold=mat(0xb38b46,.65);
 const add=(geo,m,x=0,y=0,z=0)=>{const p=new THREE.Mesh(geo,m);p.position.set(x,y,z);p.castShadow=p.receiveShadow=true;g.add(p);return p;};
 const box=(w,h,d,m,x,y,z=0)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const ball=(r,m,x,y,z,s=[1,1,1])=>{const p=add(new THREE.SphereGeometry(r,16,10),m,x,y,z);p.scale.set(...s);return p;};
 if(cls===11){
  const rod=add(new THREE.CylinderGeometry(.025,.035,.6,12),leather,0,.045,0);rod.rotation.z=Math.PI/2;
  for(const x of [-.27,.2,.27]){const band=add(new THREE.CylinderGeometry(.04,.04,.025,12),gold,x,.045,0);band.rotation.z=Math.PI/2;}
 }else if(/boots|shoes/.test(name)){
  for(const x of [-.13,.13]){ball(.13,leather,x,.10,.035,[.75,.7,1.45]);add(new THREE.CylinderGeometry(.07,.085,.22,12),leather,x,.19,-.075);add(new THREE.TorusGeometry(.074,.012,6,16),gold,x,.3,-.075).rotation.x=Math.PI/2;}
 }else if(/t-shirt|shirt|towel|cloak/.test(name)){
  box(.42,.045,.48,cloth,0,.025);if(!/towel/.test(name))for(const x of [-.25,.25])box(.15,.04,.18,cloth,x,.025,-.13);
  for(const x of [-.11,0,.11])box(.008,.003,.4,leather,x,.05);
 }else if(/mail|mithril|coat/.test(name)&&cls===3){
  ball(.24,metal,0,.115,0,[1,.45,1.2]);
  for(const x of [-.24,.24])ball(.1,metal,x,.09,-.13,[1,.7,1.2]);
  for(let row=0;row<5;row++)for(let col=0;col<5;col++){const ring=add(new THREE.TorusGeometry(.027,.007,5,10),gold,(col-2)*.07,.22,-.17+row*.075);ring.rotation.x=-Math.PI/2;}
 }else if(/bag|sack/.test(name)){
  ball(.22,leather,0,.19,0,[1,.85,.8]);add(new THREE.CylinderGeometry(.06,.13,.08,12),cloth,0,.36,0);add(new THREE.TorusGeometry(.085,.015,6,16),gold,0,.37,0).rotation.x=Math.PI/2;
 }else if(/ration/.test(name)){
  if(/tripe/.test(name)){const meat=mat(0xa26457);for(let i=0;i<4;i++)ball(.1,meat,(i-1.5)*.075,.065,Math.sin(i)*.035,[.7,.5,1.3]);}
  else {box(.42,.12,.28,cloth,0,.065);box(.025,.125,.29,leather,0,.067);box(.43,.125,.025,leather,0,.067);}
 }else if(/unicorn horn/.test(name)){
  const horn=add(new THREE.ConeGeometry(.085,.48,16),cloth,0,.085,0);horn.rotation.z=-Math.PI/2;
  for(let i=0;i<5;i++){const ring=add(new THREE.TorusGeometry(.075-i*.012,.007,5,12),gold,-.19+i*.07,.085,0);ring.rotation.y=Math.PI/2;}
 }else if(/candelabrum/.test(name)){
  add(new THREE.CylinderGeometry(.17,.19,.04,16),gold,0,.02);add(new THREE.CylinderGeometry(.025,.035,.3,12),gold,0,.18);
  for(let i=0;i<7;i++){const x=(i-3)*.075;box(.018,.04,.02,gold,x,.3);box(.47,.018,.035,gold,0,.3);add(new THREE.CylinderGeometry(.019,.019,.16,8),cloth,x,.4);box(.004,.015,.004,leather,x,.487);}
 }else if(/marker/.test(name)){
  const pen=add(new THREE.CylinderGeometry(.035,.035,.32,12),leather,0,.04);pen.rotation.z=Math.PI/2;const cap=add(new THREE.CylinderGeometry(.04,.04,.08,12),gold,.15,.04);cap.rotation.z=Math.PI/2;
 }else{materials.forEach(m=>m.dispose());return null;}
 g.userData.dispose=()=>{g.traverse(o=>o.geometry?.dispose());materials.forEach(m=>m.dispose());};return g;
}
