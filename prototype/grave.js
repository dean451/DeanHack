import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// A grave for the `grave` terrain: a low mound of dug earth framed by a stone kerb,
// a weathered, slightly leaning round-topped headstone with a carved cross, a few
// tufts of grass and a guttering candle stub. The headstone stands at -z so the
// mound faces +z like the altar, and everything stays inside its tile.
export function createGrave(seed=0){
 const g=new THREE.Group();g.name='Grave';
 const geometries=[],materials=[];
 const mat=(o)=>{const m=new THREE.MeshStandardMaterial(o);materials.push(m);return m;};
 const stone=mat({color:0x7d7b74,roughness:.92}),moss=mat({color:0x4d5a34,roughness:.95});
 const carve=mat({color:0x3a3935,roughness:.95}),earth=mat({color:0x4a3526,roughness:1});
 const grass=mat({color:0x5d7a36,roughness:.9,side:THREE.DoubleSide}),wax=mat({color:0xd9ceb0,roughness:.6});
 const flame=mat({color:0xffc26a,emissive:0xff9a2e,emissiveIntensity:1.6,roughness:.4});
 const add=(geo,m,x,y,z)=>{geometries.push(geo);const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
 const block=(w,h,d,m,x,y,z,r=.012)=>add(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/2,h/2,d/2)),m,x,y,z);
 const rand=(i)=>{const s=Math.sin(seed*12.9898+i*78.233)*43758.5453;return s-Math.floor(s);};

 // Stone kerb around the plot, with a few chipped corner posts.
 for(const x of [-.25,.25])block(.06,.07,.72,stone,x,.035,.06);
 for(const z of [-.3,.42])block(.56,.07,.06,stone,0,.035,z);
 for(const x of [-.25,.25])for(const z of [-.3,.42])block(.08,.09,.08,stone,x,.045,z,.02);

 // Earth mound: a flattened, lumpy half-ellipsoid of freshly turned soil.
 const moundGeo=new THREE.SphereGeometry(.2,20,10,0,Math.PI*2,0,Math.PI/2);
 const p=moundGeo.attributes.position;
 for(let i=0;i<p.count;i++){const y=p.getY(i);if(y>.01){const n=1+.08*Math.sin(p.getX(i)*41+seed)*Math.cos(p.getZ(i)*37);p.setY(i,y*n);}}
 moundGeo.computeVertexNormals();
 const mound=add(moundGeo,earth,0,.02,.07);mound.scale.set(1.08,.55,1.65);
 // A few clods and pebbles on top.
 for(let i=0;i<5;i++){const a=rand(i)*Math.PI*2,r=.05+rand(i+9)*.1;
  add(new THREE.DodecahedronGeometry(.018+rand(i+3)*.012,0),i%2?earth:stone,Math.cos(a)*r*.9,.1+rand(i+5)*.02,.07+Math.sin(a)*r*1.3).rotation.set(rand(i+1)*3,rand(i+2)*3,0);}

 // Headstone: plinth, then a round-topped slab (box + half cylinder) leaning back a
 // little, with a carved cross and inscription lines on its +z face and moss at the foot.
 block(.36,.06,.14,stone,0,.03,-.33,.015);
 const head=new THREE.Group();head.position.set(0,.06,-.33);head.rotation.set(-.07-rand(20)*.05,0,(rand(21)-.5)*.08);g.add(head);
 const part=(geo,m,x,y,z)=>{geometries.push(geo);const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;head.add(o);return o;};
 part(new RoundedBoxGeometry(.28,.34,.07,2,.01),stone,0,.17,0);
 const cap=part(new THREE.CylinderGeometry(.14,.14,.07,24,1,false,0,Math.PI),stone,0,.34,0);cap.rotation.set(Math.PI/2,0,Math.PI/2);
 part(new THREE.BoxGeometry(.03,.14,.008),carve,0,.35,.036);
 part(new THREE.BoxGeometry(.09,.03,.008),carve,0,.38,.036);
 for(const [y,w] of [[.22,.17],[.18,.13],[.14,.15]])part(new THREE.BoxGeometry(w,.012,.006),carve,0,y,.036);
 part(new THREE.SphereGeometry(.06,10,6,0,Math.PI*2,0,Math.PI/2),moss,-.09,0,.02).scale.set(1.3,.5,.9);
 part(new THREE.SphereGeometry(.04,8,5,0,Math.PI*2,0,Math.PI/2),moss,.11,.03,-.02).scale.set(1,.7,1);

 // Grass tufts: crossed thin blades at the corners of the mound.
 for(let t=0;t<4;t++){const x=(t%2?.17:-.17),z=(t<2?-.18:.33);
  for(let b=0;b<3;b++){const h=.06+rand(t*3+b+30)*.05;const blade=add(new THREE.PlaneGeometry(.018,h),grass,x+(b-1)*.012,h/2,z);blade.rotation.set((rand(t+b+40)-.5)*.5,b*1.05,(b-1)*.3);blade.castShadow=false;}}

 // A candle stub in front of the headstone, with a small flame.
 add(new THREE.CylinderGeometry(.018,.02,.1,10),wax,.13,.05,-.22);
 add(new THREE.SphereGeometry(.01,8,6),flame,.13,.115,-.22).scale.set(1,1.8,1);

 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}
