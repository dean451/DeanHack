import * as THREE from 'three';

// Self-contained procedural models; no shared demo visibility or animation state.
function kit(name) {
  const g=new THREE.Group();g.name=name;
  const geometries=new Set(),materials=new Set();
  const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.8,...extra});materials.add(m);return m;};
  const mesh=(geometry,material,x=0,y=0,z=0,parent=g)=>{geometries.add(geometry);const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
  const orb=(r,m,x,y,z,s=[1,1,1],parent=g)=>{const o=mesh(new THREE.SphereGeometry(r,16,12),m,x,y,z,parent);o.scale.set(...s);return o;};
  const rod=(a,b,r,m,parent=g)=>{const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),v=to.clone().sub(from);const o=mesh(new THREE.CylinderGeometry(r,r,v.length(),8),m,...from.add(to).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;};
  const curve=(points,r,m,parent=g)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,7,false),m,0,0,0,parent);
  g.userData.dispose=()=>{geometries.forEach(o=>o.dispose());materials.forEach(o=>o.dispose());};
  return {g,mat,mesh,orb,rod,curve};
}

export function createCentaurStatue(species='plains centaur') {
  const {g,mat,mesh,orb,rod,curve}=kit(`Stone statue of ${species}`);
  const stone=mat(0xa1aaa1),shadow=mat(0x727f79),carving=mat(0xc3c7b5);
  mesh(new THREE.CylinderGeometry(.43,.47,.1,12),shadow,0,.05,0);
  // Equine barrel, four distinct legs and hooves, then a human torso at the front.
  orb(.25,stone,0,.48,-.07,[.86,.85,1.48]);
  for(const x of [-.15,.15])for(const z of [-.30,.17]){
    const knee=[x,.26,z+(z<0?.045:-.025)];
    rod([x,.48,z],knee,.055,stone);rod(knee,[x,.14,z],.038,stone);
    const hoof=mesh(new THREE.BoxGeometry(.11,.09,.13),shadow,x,.145,z);hoof.name='hoof';
  }
  curve([[0,.58,-.38],[.035,.46,-.48],[.1,.22,-.43]],.045,shadow);
  orb(.19,stone,0,.82,.18,[1,1.45,.75]);
  rod([0,.91,.18],[0,1.06,.18],.07,stone);
  orb(.13,stone,0,1.13,.18,[.9,1.14,.92]);
  orb(.135,shadow,0,1.17,.145,[1,1,.8]);
  orb(.037,carving,0,1.13,.3,[.6,1,1]);
  for(const x of [-.044,.044])orb(.012,shadow,x,1.155,.292);
  // One arm holds a tall recurved bow, the other draws a clearly visible arrow.
  rod([-.14,.91,.2],[-.26,.87,.34],.047,stone);
  rod([-.26,.87,.34],[-.30,.97,.48],.04,stone);
  rod([.14,.91,.2],[.28,.94,.12],.048,stone);
  rod([.28,.94,.12],[.04,1.0,.29],.04,stone);
  curve([[-.30,.58,.48],[-.36,.7,.55],[-.38,.97,.59],[-.36,1.23,.55],[-.30,1.34,.48]],.024,carving);
  rod([-.30,.58,.48],[.04,1,.29],.007,shadow);
  rod([.04,1,.29],[-.30,1.34,.48],.007,shadow);
  rod([.08,1,.27],[-.4,1,.64],.012,carving);
  const tip=mesh(new THREE.ConeGeometry(.033,.09,4),shadow,-.42,1,.66);tip.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(-.8,0,.6));
  // Quiver and three feathered arrows on the human back.
  rod([.12,.71,.06],[.18,1.01,.01],.061,shadow);
  for(let i=0;i<3;i++){
    const x=.13+i*.04;rod([x,.85,.0],[x,1.18+i*.025,-.02],.009,carving);
    orb(.028,carving,x,1.14+i*.025,-.02,[.45,1.8,1]);
  }
  g.userData.restingWeapon=true;
  return g;
}

export function createOracle() {
  const {g,mat,mesh,orb,rod,curve}=kit('Oracle');
  const robe=mat(0x35315e),mantle=mat(0x407a80),gold=mat(0xc9ad68,{metalness:.5,roughness:.4}),skin=mat(0xc39173),dark=mat(0x182333);
  const magic=mat(0x9bf8ef,{emissive:0x38bcce,emissiveIntensity:1.8,roughness:.25});
  const body=new THREE.Group();g.add(body);
  mesh(new THREE.CylinderGeometry(.14,.31,.78,12),robe,0,.48,0,body);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;rod([Math.sin(a)*.13,.84,Math.cos(a)*.13],[Math.sin(a)*.28,.1,Math.cos(a)*.28],.013,gold,body);}
  orb(.24,mantle,0,.91,0,[1.22,.53,.88],body);
  orb(.17,dark,0,1.15,0,[1.14,1.3,1.06],body);
  orb(.127,skin,0,1.145,.16,[.9,1.17,.66],body);
  for(const x of [-.046,.046])orb(.014,magic,x,1.16,.248,[1,.5,.5],body);
  curve([[-.17,1.12,.03],[-.17,1.31,0],[0,1.4,-.015],[.17,1.31,0],[.17,1.12,.03]],.035,mantle,body);
  for(const x of [-.14,0,.14]){rod([x,1.28,0],[x*1.55,1.48-Math.abs(x)*.5,-.04],.017,gold,body);orb(.03,magic,x*1.55,1.48-Math.abs(x)*.5,-.04,[.65,1.5,.65],body);}
  for(let i=0;i<7;i++)orb(.027,gold,(i-3)*.042,.92-Math.sin(i/6*Math.PI)*.12,.20,[1,1,1],body);
  rod([-.21,.93,0],[-.32,.67,.14],.085,mantle,body);rod([-.32,.67,.14],[-.34,.84,.25],.05,skin,body);
  rod([.21,.93,0],[.31,.77,.13],.08,mantle,body);orb(.053,skin,.35,.8,.15,[1,1,1],body);
  rod([.36,.08,.16],[.36,1.42,.16],.025,gold);
  mesh(new THREE.OctahedronGeometry(.1),magic,.36,1.48,.16);
  const halo=mesh(new THREE.TorusGeometry(.15,.014,8,40),gold,.36,1.48,.16);
  const motes=[];for(let i=0;i<9;i++)motes.push(orb(.013,magic,0,0,0));
  g.userData.updateOracle=t=>{halo.rotation.y=t*.45;for(let i=0;i<motes.length;i++){const a=t*.6+i*Math.PI*2/9;motes[i].position.set(Math.cos(a)*.37,.3+(i/9+t*.09)%1.15,Math.sin(a)*.3);}};
  g.userData.updateOracle(0);
  return {g,body,legs:[],quirk:'oracle'};
}

export function createLiveFountain() {
  const {g,mat,mesh,orb}=kit('Fountain');
  const stone=mat(0x7e9993),rim=mat(0xb0b9a0),water=mat(0x287f91,{metalness:.35,roughness:.2,emissive:0x145660,emissiveIntensity:.55});
  const glow=mat(0x85e7e5,{emissive:0x3aa9c1,emissiveIntensity:1.2});
  mesh(new THREE.CylinderGeometry(.42,.46,.12,16),stone,0,.07,0);
  const ring=mesh(new THREE.TorusGeometry(.36,.065,8,32),rim,0,.23,0);ring.rotation.x=Math.PI/2;
  mesh(new THREE.CylinderGeometry(.355,.355,.035,32),water,0,.19,0);
  mesh(new THREE.CylinderGeometry(.07,.12,.35,10),stone,0,.34,0);
  mesh(new THREE.CylinderGeometry(.19,.09,.09,16),rim,0,.53,0);
  mesh(new THREE.CylinderGeometry(.17,.17,.018,24),water,0,.58,0);
  const drops=[];for(let i=0;i<24;i++)drops.push(orb(.014,glow,0,0,0));
  g.userData.updateFountain=t=>{for(let i=0;i<drops.length;i++){const p=(t*.65+i/24)%1,a=i*2.39996,r=.09+p*.23;drops[i].position.set(Math.cos(a)*r,.59+Math.sin(p*Math.PI)*.21-p*.39,Math.sin(a)*r);}};
  g.userData.updateFountain(0);
  return g;
}
