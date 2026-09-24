import * as THREE from 'three';

// A gnarled dungeon tree for the `tree` terrain. The seed (usually the map cell) varies
// lean, canopy clumps and leaf tint so a grove does not look stamped; everything stays
// inside its tile so neighbouring walls and actors never clip into it.
export function createTree(seed=0){
 const g=new THREE.Group();g.name='Tree';
 let s=(Math.floor(seed)*2654435761)>>>0||1;const random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
 const geometries=[],materials=[];
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.92,...extra});materials.push(m);return m;};
 const bark=mat(0x4a3526),barkDark=mat(0x2f2119),moss=mat(0x4d5f2c,{roughness:1});
 const hue=.26+random()*.07;
 const leaves=[.2,.27,.34].map(l=>mat(new THREE.Color().setHSL(hue,.42,l),{flatShading:true}));
 const litter=mat(new THREE.Color().setHSL(hue-.12,.45,.3),{side:THREE.DoubleSide});
 const add=(geo,m,x,y,z,parent=g)=>{geometries.push(geo);const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};

 // Roots flare out from the base and dip into the floor.
 const roots=4+Math.floor(random()*2);
 for(let i=0;i<roots;i++){
  const a=i/roots*Math.PI*2+random()*.5,len=.22+random()*.1;
  const root=add(new THREE.CylinderGeometry(.018,.05,len,6),i%2?bark:barkDark,Math.cos(a)*len*.45,.03,Math.sin(a)*len*.45);
  root.rotation.y=-a;root.rotateZ(-(Math.PI/2-.3)); // thin end points outward and slightly up
 }
 // Trunk in two tapered segments with a slight dog-leg so it reads as grown, not turned.
 const lean=(random()-.5)*.22,turn=random()*Math.PI*2;
 const trunk=new THREE.Group();trunk.rotation.y=turn;g.add(trunk);
 const lower=add(new THREE.CylinderGeometry(.075,.11,.46,8),bark,0,.23,0,trunk);lower.rotation.z=lean*.5;
 const upper=add(new THREE.CylinderGeometry(.05,.075,.4,8),bark,Math.sin(lean)*.12,.63,0,trunk);upper.rotation.z=-lean;
 add(new THREE.SphereGeometry(.07,7,5),moss,-.07,.13,.06,trunk).scale.set(.6,1.4,.5);
 // Knot and two stub branches.
 add(new THREE.SphereGeometry(.03,6,4),barkDark,.07,.36,.035,trunk).scale.set(1,1.3,.6);
 for(const side of [-1,1]){
  const branch=add(new THREE.CylinderGeometry(.018,.035,.3,6),bark,side*.12,.72+random()*.06,0,trunk);
  branch.rotation.z=-side*(.9+random()*.3);
 }
 // Canopy: overlapping low-poly clumps, darker underneath, capped by a lighter crown.
 const crownX=Math.sin(lean)*.08;
 const clumps=[[0,1.02,0,.3,1],[-.17,.93,.07,.2,0],[.17,.95,-.05,.21,0],[.04,.92,.18,.19,0],[-.05,.94,-.18,.19,0],[.03,1.2,.02,.2,2]];
 for(const [x,y,z,r,shade] of clumps){
  const clump=add(new THREE.IcosahedronGeometry(r*(.9+random()*.2),1),leaves[shade],crownX+x,y,z,trunk);
  clump.scale.y=.78;clump.rotation.set(random()*3,random()*3,0);
 }
 // A few fallen leaves on the floor.
 const leafGeo=new THREE.CircleGeometry(.03,5);geometries.push(leafGeo);
 for(let i=0;i<7;i++){
  const a=random()*Math.PI*2,r=.2+random()*.22,leaf=new THREE.Mesh(leafGeo,litter);
  leaf.position.set(Math.cos(a)*r,.006+i*.0005,Math.sin(a)*r);leaf.rotation.set(-Math.PI/2,0,random()*Math.PI);leaf.scale.set(1,.6,1);leaf.receiveShadow=true;g.add(leaf);
 }
 g.userData.dispose=()=>{geometries.forEach(o=>o.dispose());materials.forEach(o=>o.dispose());};
 return g;
}
