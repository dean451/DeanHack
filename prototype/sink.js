import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// A kitchen sink for the `sink` terrain: a stone washstand with a cabinet front, a
// rounded basin holding a little water over a drain, and a brass swan-neck tap with
// two cross-handled valves. It faces +z like the altar and stays inside its tile.
export function createSink(){
 const g=new THREE.Group();g.name='Sink';
 const geometries=[],materials=[];
 const mat=(o)=>{const m=new THREE.MeshStandardMaterial(o);materials.push(m);return m;};
 const stone=mat({color:0x8a8478,roughness:.82}),dark=mat({color:0x4a463f,roughness:.9});
 const wood=mat({color:0x5a3a22,roughness:.88}),porcelain=mat({color:0xe4e2d8,roughness:.32});
 const brass=mat({color:0xc9a04c,metalness:.85,roughness:.3}),iron=mat({color:0x2c2d31,metalness:.6,roughness:.5});
 const water=mat({color:0x3f8fb8,emissive:0x0d3550,emissiveIntensity:.5,roughness:.05,metalness:.1,transparent:true,opacity:.78});
 const add=(geo,m,x,y,z)=>{geometries.push(geo);const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
 const block=(w,h,d,m,x,y,z,r=.015)=>add(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/2,h/2,d/2)),m,x,y,z);

 // Washstand: plinth, wooden cabinet with two doors and ring pulls, and a stone
 // counter built as a frame so the basin shows through it.
 block(.72,.05,.56,dark,0,.025,-.04);
 block(.66,.38,.5,wood,0,.24,-.04,.02);
 for(const x of [-.16,.16]){
  block(.29,.3,.012,wood,x,.24,.215,.008);
  block(.23,.24,.008,dark,x,.24,.222,.004);
  add(new THREE.TorusGeometry(.016,.004,6,14),brass,x-Math.sign(x)*.1,.27,.232);
 }
 block(.76,.12,.06,stone,0,.49,.23);block(.76,.12,.14,stone,0,.49,-.27);
 for(const x of [-.315,.315])block(.13,.12,.4,stone,x,.49,0);

 // Basin: an open porcelain bowl under a rolled rim, a water pool and a drain.
 const bowl=add(new THREE.SphereGeometry(.2,24,12,0,Math.PI*2,Math.PI/2,Math.PI/2),mat({color:0xe4e2d8,roughness:.32,side:THREE.DoubleSide}),0,.555,0);
 bowl.scale.set(1.25,.6,1);
 const rim=add(new THREE.TorusGeometry(.2,.018,8,32),porcelain,0,.555,0);rim.rotation.x=Math.PI/2;rim.scale.set(1.25,1,1);
 const drain=add(new THREE.CircleGeometry(.028,14),iron,0,.437,0);drain.rotation.x=-Math.PI/2;
 const pool=add(new THREE.CircleGeometry(.2,28),water,0,.5,0);pool.rotation.x=-Math.PI/2;pool.scale.set(1.08,.86,1);pool.castShadow=false;

 // Tap: a brass pillar at the back with a swan neck over the basin and two valves.
 const tapZ=-.26;
 add(new THREE.CylinderGeometry(.03,.04,.03,14),brass,0,.565,tapZ);
 add(new THREE.CylinderGeometry(.018,.02,.2,12),brass,0,.67,tapZ);
 const neck=add(new THREE.TorusGeometry(.08,.014,8,20,Math.PI),brass,0,.77,tapZ+.08);neck.rotation.y=Math.PI/2;
 add(new THREE.CylinderGeometry(.018,.014,.04,12),brass,0,.75,tapZ+.16);
 // A drip hanging from the spout.
 add(new THREE.SphereGeometry(.009,8,6),water,0,.715,tapZ+.16).scale.set(1,1.5,1);
 for(const x of [-.13,.13]){
  add(new THREE.CylinderGeometry(.016,.022,.06,10),brass,x,.58,tapZ+.02);
  for(const r of [0,Math.PI/2]){const arm=block(.07,.012,.012,brass,x,.618,tapZ+.02,.005);arm.rotation.y=r+Math.PI/4;}
  add(new THREE.SphereGeometry(.013,8,6),x<0?mat({color:0xd04040,roughness:.4}):mat({color:0x4070d0,roughness:.4}),x,.63,tapZ+.02);
 }

 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}
