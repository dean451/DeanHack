import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The slime mold used to be three squashed green balls. It is now a glistening lobed blob of
// translucent lime jelly, paler and wetter on top, sagging into a thin slick that spreads over the
// floor with a few creeping pseudopods. Through the jelly you see its denser heart: a mottled olive
// core, dark seed specks and a few trapped pale bubbles. It keeps its faint green glow.
// Two merged, vertex-coloured meshes: the translucent jelly (blob, slick and pseudopods) and the
// opaque core (heart, seeds, bubbles). The pieces are built fresh per item, like the iron ball, so
// the ground model's disposal can free them.

const JELLY_TOP=new THREE.Color(0xd2f58a),JELLY=new THREE.Color(0x8fd03a),JELLY_DEEP=new THREE.Color(0x3f8a22);
const CORE=new THREE.Color(0x4a7a1c),CORE_PALE=new THREE.Color(0xb0c030),SEED=new THREE.Color(0x24300e),BUBBLE=new THREE.Color(0xeaffd0);

const noise=(x,y,z)=>(Math.sin(x*9.1+y*3.7)*Math.cos(z*8.3-x*2.9)+Math.sin(y*13.7+z*5.3)*Math.cos(x*11.3+y*1.9)*.6+Math.sin(z*23.1+x*17.3-y*7.9)*.3)/1.9;

function clean(geo){
 const n=geo.index?geo.toNonIndexed():geo;if(n!==geo)geo.dispose();
 for(const k of Object.keys(n.attributes))if(!['position','normal','color'].includes(k))n.deleteAttribute(k);
 return n;
}
function paint(geo,fn){
 const p=geo.attributes.position,col=new Float32Array(p.count*3),c=new THREE.Color();
 for(let i=0;i<p.count;i++){fn(p.getX(i),p.getY(i),p.getZ(i),c);col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;}
 geo.setAttribute('color',new THREE.BufferAttribute(col,3));return geo;
}

// lobes bulging out round the sides, as unit directions with a strength
const LOBES=[[1,.25,.2,.28],[-.7,.3,.8,.24],[-.5,.2,-.9,.3],[.4,.9,-.1,.18],[.2,.1,-1,.14]].map(([x,y,z,s])=>({d:new THREE.Vector3(x,y,z).normalize(),s}));

// A lumpy blob of unit size: radius swollen by the lobes and a slow wobble of noise, the underside
// flattened where it sags onto the floor.
function blob(detail,scale,wobble=.08,sag=.3){
 const geo=new THREE.SphereGeometry(1,detail,Math.round(detail*.65)),p=geo.attributes.position,v=new THREE.Vector3();
 for(let i=0;i<p.count;i++){
  v.fromBufferAttribute(p,i);
  let r=1+wobble*noise(v.x,v.y,v.z);
  for(const {d,s} of LOBES){const k=v.dot(d);if(k>0)r+=s*Math.pow(k,4);}
  v.multiplyScalar(r);if(v.y<0)v.y*=sag;
  p.setXYZ(i,v.x*scale.x,v.y*scale.y,v.z*scale.z);
 }
 geo.computeVertexNormals();return geo;
}

export function createSlimeMold(){
 const g=new THREE.Group(),jelly=[],core=[];
 // the jelly: a lobed dome, paler and wetter on top, deepening where it sags onto the floor
 const H=.07,body=blob(40,new THREE.Vector3(.1,H,.09));body.translate(0,H*.3,0);
 jelly.push(paint(clean(body),(x,y,z,c)=>{const t=THREE.MathUtils.clamp(y/(H*1.2),0,1);c.copy(JELLY_DEEP).lerp(JELLY,Math.min(1,t*2.2)).lerp(JELLY_TOP,Math.max(0,t-.45)*1.4);c.multiplyScalar(.95+.1*noise(x*20,y*20,z*20));}));
 // the slick: a thin, ragged-edged sheet spreading out round the base
 const slick=new THREE.CircleGeometry(1,48,0,Math.PI*2),sp=slick.attributes.position;
 for(let i=0;i<sp.count;i++){const x=sp.getX(i),y=sp.getY(i),a=Math.atan2(y,x),r=Math.hypot(x,y),edge=1+.18*Math.sin(a*5+1)+.1*Math.sin(a*11+2);sp.setXY(i,x*edge,y*edge);sp.setZ(i,-.0035*(1-r*r));}
 slick.rotateX(-Math.PI/2);slick.scale(.155,1,.14);slick.translate(0,.003,0);
 jelly.push(paint(clean(slick),(x,y,z,c)=>{const r=Math.hypot(x/.155,z/.14);c.copy(JELLY).lerp(JELLY_DEEP,Math.min(1,r*.9));}));
 // pseudopods: slim flattened fingers of jelly creeping out over the floor
 for(const [a,len,w] of [[.5,.2,.03],[2.4,.16,.026],[4.3,.18,.028],[5.5,.12,.022]]){
  const pod=new THREE.SphereGeometry(1,14,8);pod.scale(len/2,.011,w);pod.rotateY(-a);
  pod.translate(Math.cos(a)*len*.55,.006,Math.sin(a)*len*.55);
  jelly.push(paint(clean(pod),(x,y,z,c)=>c.copy(JELLY).lerp(JELLY_DEEP,.35)));
  const tip=new THREE.SphereGeometry(w*.7,10,6);tip.scale(1,.55,1);tip.translate(Math.cos(a)*len*1.02,.008,Math.sin(a)*len*1.02);
  jelly.push(paint(clean(tip),(x,y,z,c)=>c.copy(JELLY)));
 }
 // the heart seen through the jelly: a mottled olive core
 const heart=blob(22,new THREE.Vector3(.052,.034,.046),.18,.6);heart.translate(.006,.03,-.004);
 core.push(paint(clean(heart),(x,y,z,c)=>{const n=noise(x*40,y*40,z*40);c.copy(CORE).lerp(CORE_PALE,THREE.MathUtils.clamp(n*1.4+.1,0,1)*.7);}));
 // dark seed specks scattered in and around the heart, and a few trapped bubbles higher up
 const seeds=[[.04,.035,.03],[-.035,.04,.03],[.05,.028,-.03],[-.045,.03,-.035],[.0,.06,.02],[.02,.05,-.045],[-.06,.024,.0],[.065,.03,.005]];
 for(const [x,y,z] of seeds){const s=new THREE.SphereGeometry(.0065,6,4);s.scale(1,.7,1.4);s.rotateY(Math.atan2(x,z));s.translate(x,y,z);core.push(paint(clean(s),(px,py,pz,c)=>c.copy(SEED)));}
 for(const [x,y,z,r] of [[.03,.075,.03,.007],[-.04,.065,-.02,.009],[.055,.055,-.035,.005],[-.02,.08,.04,.005],[.075,.035,.04,.006]]){const b=new THREE.SphereGeometry(r,8,6);b.translate(x,y,z);core.push(paint(clean(b),(px,py,pz,c)=>c.copy(BUBBLE)));}

 const coreMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,emissive:0x1e3a08,emissiveIntensity:.5});
 const jellyMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.08,metalness:0,transparent:true,opacity:.62,emissive:0x2a4a10,emissiveIntensity:.35,depthWrite:false,side:THREE.DoubleSide});
 const merge=list=>{const m=mergeGeometries(list);list.forEach(p=>p.dispose());return m;};
 const coreMesh=new THREE.Mesh(merge(core),coreMat);coreMesh.castShadow=true;coreMesh.name='slime-mold-core';
 const jellyMesh=new THREE.Mesh(merge(jelly),jellyMat);jellyMesh.castShadow=true;jellyMesh.receiveShadow=true;jellyMesh.renderOrder=1;jellyMesh.name='slime-mold-jelly';
 g.add(coreMesh,jellyMesh);
 return g;
}
