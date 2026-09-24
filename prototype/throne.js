import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// A royal throne for the `throne` terrain: a two-step dais, a gilded seat with a red
// cushion, lion-paw feet, scrolled armrests and a tall back crowned with a jewel.
// It faces +z like the altar, and everything stays inside its tile.
export function createThrone(){
 const g=new THREE.Group();g.name='Throne';
 const geometries=[],materials=[];
 const mat=(o)=>{const m=new THREE.MeshStandardMaterial(o);materials.push(m);return m;};
 const stone=mat({color:0x3d3a44,roughness:.94}),edge=mat({color:0x5f5a66,roughness:.86});
 const gold=mat({color:0xd0a24a,metalness:.82,roughness:.34});
 const velvet=mat({color:0x7a1626,roughness:1}),carpet=mat({color:0x5a1320,roughness:1});
 const jewel=mat({color:0x5fd1ff,emissive:0x1d7fd0,emissiveIntensity:1.6,roughness:.2});
 const ruby=mat({color:0xff4058,emissive:0x901020,emissiveIntensity:1.2,roughness:.2});
 const add=(geo,m,x,y,z)=>{geometries.push(geo);const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
 const block=(w,h,d,m,x,y,z,r=.015)=>add(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/2,h/2,d/2)),m,x,y,z);

 // Dais: two stone steps with a runner of carpet down the front.
 block(.92,.07,.9,edge,0,.035,0);block(.74,.07,.66,stone,0,.105,-.07);
 block(.3,.006,.36,carpet,0,.073,.28);block(.3,.07,.006,carpet,0,.105,.263);block(.3,.006,.66,carpet,0,.143,-.07);

 // Seat box on four lion-paw feet.
 for(const x of [-.2,.2])for(const z of [-.2,.14]){
  add(new THREE.SphereGeometry(.038,10,8),gold,x,.17,z+.02).scale.set(1,.7,1.25);
  add(new THREE.CylinderGeometry(.026,.034,.1,10),gold,x,.22,z);
 }
 block(.5,.1,.42,gold,0,.3,-.03);
 block(.44,.06,.36,velvet,0,.378,-.01,.028);
 // Front apron: a red panel with a gold boss.
 block(.36,.06,.01,velvet,0,.29,.183);
 add(new THREE.TorusGeometry(.024,.006,6,16),gold,0,.29,.19);

 // Scrolled armrests on turned posts.
 for(const x of [-.24,.24]){
  add(new THREE.CylinderGeometry(.022,.026,.18,10),gold,x,.44,.13);
  block(.06,.035,.42,gold,x,.54,-.04);
  const scroll=add(new THREE.TorusGeometry(.03,.012,6,14,Math.PI*1.5),gold,x,.54,.18);scroll.rotation.y=Math.PI/2;
  add(new THREE.SphereGeometry(.018,8,6),ruby,x+Math.sign(x)*.036,.54,.17);
 }

 // Tall back: gold frame, velvet inlay, pointed crest with a jewel and finials.
 const backZ=-.22;
 block(.5,.72,.07,gold,0,.68,backZ);
 block(.4,.6,.012,velvet,0,.66,backZ+.037);
 for(const x of [-.22,.22]){add(new THREE.CylinderGeometry(.03,.034,.8,10),gold,x,.72,backZ);add(new THREE.ConeGeometry(.034,.09,10),gold,x,1.16,backZ);add(new THREE.SphereGeometry(.022,8,6),gold,x,1.22,backZ);}
 const crest=add(new THREE.CylinderGeometry(0,.25,.2,4,1),gold,0,1.13,backZ);crest.rotation.y=Math.PI/4;crest.scale.set(1,1,.18);
 add(new THREE.OctahedronGeometry(.04),jewel,0,1.09,backZ+.045).scale.set(1,1.3,.6);
 // Crown motif on the velvet: three points over a band.
 block(.16,.022,.006,gold,0,.8,backZ+.046,.004);
 for(const x of [-.06,0,.06]){const p=add(new THREE.ConeGeometry(.016,.05,4),gold,x,.836,backZ+.046);p.scale.z=.3;}

 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}
