import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The stiletto: an assassin's needle. A long, blued-black blade of square section, hollow-ground
// on all four faces so only its four edges catch the light, tapering to a needle point gone
// rust-brown with old blood. A thin cross-guard whose quillons hook forward like claws toward
// the blade, each ending in a filed point; a grip tightly wound in black cord between two iron
// ferrules; a faceted iron pommel with a short spike below it.
// Held-weapon space (equipment.js): the hand at the origin, the point up +y, everything close to
// the y axis, so laid on the floor (live.js lays weapons down with x -PI/2) it lies flat.
// The iron is one material and the cord the other: 2 draws. The iron stays metalness >= .75,
// so weapon-magic sheathes it.
export const STILETTO_NAME=/\bstiletto\b/;
export const STILETTO_TIP=.5;
const GUARD_Y=.072,BLADE_Y=.084,GRIP_LO=-.084,GRIP_HI=.062;
const STEEL=0x23262c,EDGE=0xa9b3bb,BLOOD=0x3a120e,IRON=0x34322f,CORD=0x0d0b0b,CORD_HI=0x2b2522;

const hash=i=>{const v=Math.sin(i*127.1+31.7)*43758.5453;return v-Math.floor(v);};
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};

// A tube along a curve with radius r(u). Open ends; the tips taper to a point anyway.
function tube(points,r,segs,ring){
 const curve=new THREE.CatmullRomCurve3(points),frames=curve.computeFrenetFrames(segs,false),pos=[],idx=[],p=new THREE.Vector3();
 for(let i=0;i<=segs;i++){const u=i/segs;curve.getPointAt(u,p);const N=frames.normals[i],B=frames.binormals[i],rr=r(u);
  for(let k=0;k<ring;k++){const a=k/ring*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
   pos.push(p.x+(N.x*c+B.x*s)*rr,p.y+(N.y*c+B.y*s)*rr,p.z+(N.z*c+B.z*s)*rr);}}
 for(let i=0;i<segs;i++)for(let k=0;k<ring;k++){const a=i*ring+k,b=i*ring+(k+1)%ring,c=a+ring,d=b+ring;idx.push(a,b,c,b,d,c);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);
 return geo;
}

// A grid of rings up the y axis: ring(i) gives the radius at angle a for station y.
function rings(ys,ring,radius){
 const pos=[],idx=[];
 ys.forEach((y,i)=>{for(let k=0;k<ring;k++){const a=k/ring*Math.PI*2,r=radius(y,a,k,i);pos.push(Math.cos(a)*r,y,Math.sin(a)*r);}});
 for(let i=0;i<ys.length-1;i++)for(let k=0;k<ring;k++){const a=i*ring+k,b=i*ring+(k+1)%ring,c=a+ring,d=b+ring;idx.push(a,c,b,b,c,d);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);return geo;
}

export function buildStiletto(g){
 const iron=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.82,roughness:.3});
 const cord=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.95});
 g.userData.extraMaterial=[iron,cord];
 const sets=new Map([[iron,[]],[cord,[]]]),c=new THREE.Color();
 const put=(geo,m,tone,flat=true)=>{if(geo.attributes.uv)geo.deleteAttribute('uv');
  if(flat){if(geo.index)geo=geo.toNonIndexed();geo.deleteAttribute('normal');geo.computeVertexNormals();}
  else{geo.computeVertexNormals();if(geo.index)geo=geo.toNonIndexed();}
  const p=geo.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c,i);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));sets.get(m).push(geo);};
 const ironTone=(x,y,z,col)=>col.set(IRON).multiplyScalar(.85+.3*hash(Math.floor(x*900)*7+Math.floor(y*900)+Math.floor(z*900)*13));

 // The blade: eight vertices a ring, four edges and four hollow-ground face centres, so each face
 // dips in and the edges stand out as bright lines. A square ricasso just above the guard.
 {const N=40,ys=[];for(let i=0;i<=N;i++)ys.push(BLADE_Y+(STILETTO_TIP-.002-BLADE_Y)*(1-(1-i/N)**1.25));
  const blade=rings(ys,8,(y,a,k)=>{const u=(y-BLADE_Y)/(STILETTO_TIP-BLADE_Y);
   const w=(.0105*(1-u)**.85+.0006)*(1+.25*(1-smooth(0,.07,u)));// a touch wider at the ricasso
   const hollow=u<.06?.92:.62+.1*u;// the ricasso is flat-faced, the rest fluted
   return k%2===0?w:w*hollow;});
  // Close the point.
  const p=blade.attributes.position,arr=Array.from(p.array),top=ys.length*8;arr.push(0,STILETTO_TIP,0);
  const idx=Array.from(blade.index.array);for(let k=0;k<8;k++)idx.push(top-8+k,top,top-8+(k+1)%8);
  const closed=new THREE.BufferGeometry();closed.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));closed.setIndex(idx);blade.dispose();
  put(closed,iron,(x,y,z,col)=>{const u=(y-BLADE_Y)/(STILETTO_TIP-BLADE_Y),r=Math.hypot(x,z),a=Math.atan2(z,x);
   const edge=Math.abs(Math.cos(2*a));// 1 on an edge, 0 mid-face
   col.set(STEEL).lerp(new THREE.Color(EDGE),smooth(.6,.98,edge)*(r>0?.85:1));
   col.lerp(new THREE.Color(BLOOD),smooth(.62,.9,u)*(.45+.4*hash(Math.floor(y*400)))*(1-.5*edge));// dried blood toward the point
   if(u<.06)col.lerp(new THREE.Color(0x6a6f72),.35);});}// the ricasso, scoured paler
 // A short iron collar seating the blade in the guard.
 put(new THREE.CylinderGeometry(.0095,.012,.014,8).translate(0,GUARD_Y+.007,0),iron,ironTone);

 // The guard: a narrow block with two quillons hooking forward like claws, filed to points.
 put(new THREE.BoxGeometry(.034,.012,.018).translate(0,GUARD_Y,0),iron,ironTone);
 for(const s of [-1,1]){
  const pts=[new THREE.Vector3(s*.014,GUARD_Y,0),new THREE.Vector3(s*.04,GUARD_Y+.002,0),new THREE.Vector3(s*.058,GUARD_Y+.014,.001*s),new THREE.Vector3(s*.061,GUARD_Y+.034,0),new THREE.Vector3(s*.053,GUARD_Y+.05,0)];
  put(tube(pts,u=>.0058*(1-u)**.8+.0004,20,6),iron,(x,y,z,col)=>{ironTone(x,y,z,col);col.lerp(new THREE.Color(EDGE),smooth(GUARD_Y+.035,GUARD_Y+.05,y)*.7);});
  // A small barb filed into each quillon's outer curve.
  put(new THREE.ConeGeometry(.0035,.012,4).rotateZ(s*-Math.PI/2).translate(s*.063,GUARD_Y+.01,0),iron,ironTone);}

 // The grip: a slim swelling core tightly wound with black cord in a raised helix.
 {const N=60,ys=[];for(let i=0;i<=N;i++)ys.push(GRIP_LO+(GRIP_HI-GRIP_LO)*i/N);
  const pitch=.0062;
  const grip=rings(ys,14,(y,a)=>{const u=(y-GRIP_LO)/(GRIP_HI-GRIP_LO);
   return .0125+.0025*Math.sin(u*Math.PI)+.0012*Math.abs(Math.sin(a/2-y/pitch*Math.PI));});
  put(grip,cord,(x,y,z,col)=>{const a=Math.atan2(z,x),ridge=Math.abs(Math.sin(a/2-y/pitch*Math.PI));
   col.set(CORD).lerp(new THREE.Color(CORD_HI),smooth(.6,1,ridge)*(.7+.3*hash(Math.floor(y*300))));},false);}
 // Iron ferrules at both ends of the grip.
 for(const [y,r] of [[GRIP_HI+.002,.0145],[GRIP_LO-.002,.0145]])
  put(new THREE.CylinderGeometry(r,r,.008,10).translate(0,y,0),iron,ironTone);

 // The pommel: a faceted iron knob, then a short spike below it.
 {const knob=new THREE.OctahedronGeometry(.016,1).scale(1,1.25,1).translate(0,GRIP_LO-.022,0);
  put(knob,iron,ironTone);
  put(new THREE.ConeGeometry(.006,.022,4).rotateX(Math.PI).translate(0,GRIP_LO-.047,0),iron,(x,y,z,col)=>{ironTone(x,y,z,col);col.lerp(new THREE.Color(EDGE),smooth(GRIP_LO-.045,GRIP_LO-.058,y)*.6);});}

 for(const [m,list] of sets){const merged=mergeGeometries(list);list.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=m===iron?'blade':'grip';g.add(mesh);}
 g.userData.stiletto={kind:'stiletto'};
}
