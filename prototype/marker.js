import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A magic marker dropped on the floor with its cap pulled off beside it. The pen is a
// turned charcoal barrel with a red butt plug, a parchment label band ringed in gold and
// scratched with red runes, a ribbed grip, a silver ferrule and a chisel felt nib soaked
// in red ink (grey and dry when the marker has no charges left). The cap lies next to it,
// clip up, with a red crown and a gold ring. Colour is baked into vertex colours and the
// whole thing is one merged mesh on one material, resting on y=0.
const hash=(a,b)=>{const s=Math.sin(a*127.1+b*311.7)*43758.5453;return s-Math.floor(s);};
const INK=0xb3202a,DRY=0x8a8580;

// Parses the charge count from a doname like "magic marker (0:12)"; null when unknown.
export function markerCharges(name=''){
 const m=/\(\s*[+-]?\d+\s*:\s*(-?\d+)\s*\)/.exec(name);
 return m?Number(m[1]):null;
}

// Revolves a profile of [radius, y] points round the y axis and colours each vertex
// with paint(y, angle). Returns a non-indexed geometry with position, normal and colour.
function turned(profile,paint,segments=28){
 const geo=new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),segments);
 const p=geo.attributes.position,col=[],c=new THREE.Color();
 for(let i=0;i<p.count;i++){
  const a=Math.atan2(p.getZ(i),p.getX(i));
  paint(p.getY(i),a,c,Math.hypot(p.getX(i),p.getZ(i)));col.push(c.r,c.g,c.b);
 }
 geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
 return clean(geo);
}

function clean(geo){
 const n=geo.index?geo.toNonIndexed():geo;if(n!==geo)geo.dispose();
 for(const k of Object.keys(n.attributes))if(!['position','normal','color'].includes(k))n.deleteAttribute(k);
 n.computeVertexNormals();return n;
}

export function createMagicMarker({dry=false}={}){
 const g=new THREE.Group();g.name='Magic marker';
 const barrel=new THREE.Color(0x2b2830),ink=new THREE.Color(dry?DRY:INK),inkDark=new THREE.Color(dry?0x6b6762:0x5e0d12);
 const label=new THREE.Color(0xe8dcb6),gold=new THREE.Color(0xc99a3a),silver=new THREE.Color(0xc4c8cc),felt=new THREE.Color(dry?0x9d9892:0xc52632);

 // The pen, butt at y=0, nib at y=.3. The grip is ribbed by a ripple in the radius.
 const R=.03,profile=[[0,0],[.018,.001],[.026,.004],[.03,.01],[.031,.018],[.028,.021],[R,.024]];
 for(let y=.03;y<=.18;y+=.01)profile.push([R,y]);
 profile.push([R+.002,.182],[R+.002,.188],[R,.19]);
 for(let i=0;i<=16;i++){const y=.192+i*.0025;profile.push([R-.0015+.0015*Math.cos(i*Math.PI),y]);}
 profile.push([R,.235],[.027,.243],[.02,.252],[.0125,.259],[.012,.262],[.011,.272],[.0085,.273],[.0078,.285],[.006,.293],[.0035,.297],[0,.2975]);
 const pen=turned(profile,(y,a,c,r)=>{
  const shade=.92+.08*hash(Math.floor(a*6),Math.floor(y*60));
  if(y<.021)c.copy(ink).lerp(inkDark,y<.004?.15:.35*(1-r/.031));
  else if(y<.058||y>.18&&y<.19)c.copy(gold).multiplyScalar(shade);
  else if(y<.062||y>.176&&y<.18)c.copy(barrel).lerp(gold,.4);
  else if(y<.176){
   // The label: parchment with rows of red rune strokes, darker at its worn edges.
   c.copy(label).multiplyScalar(.9+.1*hash(Math.floor(a*20),Math.floor(y*300)));
   const col=Math.floor((a+Math.PI)/(Math.PI*2)*18),row=Math.floor((y-.066)/.0135),v=(y-.066)/.0135-row;
   const stroke=hash(col,row);
   if(row>=0&&row<8&&v>.2&&v<.8&&stroke>.35){
    const u=((a+Math.PI)/(Math.PI*2)*18)%1;
    if(stroke>.7?Math.abs(u-.5)<.12:Math.abs(u-v)<.14||Math.abs(u-(1-v))<.1)c.copy(ink).multiplyScalar(.85);
   }
  }
  else if(y<.235)c.copy(barrel).multiplyScalar(r<R-.0008?.6:1.15);
  else if(y<.259)c.copy(barrel).lerp(inkDark,.25).multiplyScalar(.95+.1*(y-.235)/.024);
  else if(y<.273)c.copy(silver).multiplyScalar(y<.262||y>.271?.7:shade);
  else c.copy(felt).lerp(inkDark,Math.min(1,(y-.273)/.025)*.55);
 });
 // Flatten the felt into a chisel nib.
 {
  const p=pen.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i);if(y>.274){const k=Math.min(1,(y-.274)/.02);p.setZ(i,p.getZ(i)*(1-.6*k));}}
  pen.computeVertexNormals();
 }

 // The cap: an open cup with a domed red crown, a gold ring and a dark inside.
 const CR=.035,cap=turned([[0,.105],[.016,.104],[.028,.1],[.034,.093],[.035,.085],[.035,.03],[.036,.026],[.037,.02],[.036,.014],[CR,.004],[.033,0],[.03,0],[.029,.004],[.029,.09],[0,.093]],(y,a,c,r)=>{
  if(r<.0305)c.copy(barrel).multiplyScalar(.35);
  else if(y>.085)c.copy(ink).lerp(new THREE.Color(0xffffff),y>.1?.12:0);
  else if(y<.028&&y>.012)c.copy(gold).multiplyScalar(.9+.1*hash(Math.floor(a*8),1));
  else c.copy(ink).multiplyScalar(.82+.06*hash(Math.floor(a*5),Math.floor(y*40)));
 });
 // The clip: a gold strip down the cap with a rounded bead at its tip.
 const clip=new THREE.BoxGeometry(.006,.07,.011,1,8,1);
 {
  const p=clip.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i),t=(y+.035)/.07;p.setX(i,p.getX(i)+CR+.006+.004*Math.sin(t*Math.PI)*(1-t));p.setY(i,y+.055);}
 }
 const bead=new THREE.SphereGeometry(.006,10,8);bead.scale(1,1.3,1.1);bead.translate(CR+.011,.022,0);
 const paintFlat=(geo,col)=>{const n=geo.attributes.position.count,arr=[];for(let i=0;i<n;i++)arr.push(col.r,col.g,col.b);geo.setAttribute('color',new THREE.Float32BufferAttribute(arr,3));return clean(geo);};
 const clipParts=[paintFlat(clip,gold),paintFlat(bead,gold.clone().multiplyScalar(1.08))];

 // Lay the pen along x, nib toward +x, resting on its side.
 const m=new THREE.Matrix4();
 pen.applyMatrix4(m.makeRotationZ(-Math.PI/2));pen.translate(-.17,R,-.035);
 // Lay the cap beside it, open end toward the nib, clip up, turned a little askew.
 for(const part of [cap,...clipParts]){
  part.applyMatrix4(m.makeRotationZ(Math.PI/2));   // crown toward -x, open end toward +x, clip (+x) up
  part.applyMatrix4(m.makeRotationY(-.35));
  part.translate(.11,.037,.085);
 }
 const parts=[pen,cap,...clipParts];
 const geo=mergeGeometries(parts);parts.forEach(p=>p.dispose());
 geo.computeBoundingBox();geo.translate(0,-geo.boundingBox.min.y,0);
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.42,metalness:0});
 const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part='marker';
 mesh.rotation.y=.25;g.add(mesh);
 g.userData.dispose=()=>{geo.dispose();material.dispose();};
 return g;
}
