import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Blobs, jellies, puddings, oozes and slimes used to share one model: a translucent ball over a
// darker ball, with five beads round the foot (or six tubes for a jelly). Each now has its own
// shape of the same sinister stuff: a lumpy, sagging mass of translucent slime, deeper in colour
// where it is thick, slicked out over the floor in a ragged sheet, with blisters on its skin and
// pseudopods creeping out that end in grasping, pointed fingers. Through it you see what it has
// eaten and not finished: a skull with empty sockets, gnawed bones, a corroded sword. Per kind:
//  - acid blob: small and bright, glowing, with bones dissolving inside and an acid-etched ring
//    on the floor;
//  - quivering blob: pale and lilac, tall and rippled, a skull floating in it;
//  - jellies: wide, glossy domes with a rim skirt and a cluster of dark nuclei; the blue jelly is
//    crusted with frost spikes, the spotted jelly blotched, the ochre jelly drips acid and holds
//    bones;
//  - gray ooze: a flat, wide puddle swelling into bubbles;
//  - puddings: big, slumped and heavy with thick pseudopods; the brown pudding holds a skull and
//    the black pudding, oily and glistening, a rusted sword and a skull;
//  - slimes: tall, drooping mounds that drip long strands to the floor.
// Two merged, vertex-coloured meshes: the translucent slime and the opaque things in and under
// it. Geometry is built once per kind and shared. Handles: body. Quirk 'blob'.

const C=hex=>new THREE.Color(hex);
const hash=(a,b=0,c=0)=>{const s=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453;return s-Math.floor(s);};
const noise=(x,y,z)=>(Math.sin(x*9.1+y*3.7)*Math.cos(z*8.3-x*2.9)+Math.sin(y*13.7+z*5.3)*Math.cos(x*11.3+y*1.9)*.6+Math.sin(z*23.1+x*17.3-y*7.9)*.3)/1.9;

export const OOZES={
 'acid blob':{scale:.62,shape:'blob',color:'#8ae03a',deep:'#2e7a14',glow:.55,remains:['bones'],etch:true},
 'quivering blob':{scale:.82,shape:'blob',color:'#ddd6f0',deep:'#7a6aa8',glow:.15,remains:['skull'],wobble:.16,tall:1.25},
 'blue jelly':{scale:.88,shape:'jelly',color:'#5a9af0',deep:'#14307a',glow:.3,frost:true,nuclei:true},
 'spotted jelly':{scale:.88,shape:'jelly',color:'#8ab04a',deep:'#3a5a1a',glow:.15,spots:true,nuclei:true},
 'ochre jelly':{scale:.92,shape:'jelly',color:'#d8902a',deep:'#7a3208',glow:.25,remains:['bones'],drips:3},
 'gray ooze':{scale:.95,shape:'puddle',color:'#9a9a94',deep:'#3a3a36',glow:0,remains:['bones']},
 'brown pudding':{scale:1.02,shape:'pudding',color:'#8a5a30',deep:'#2e1808',glow:0,remains:['skull','bones']},
 'black pudding':{scale:1.22,shape:'pudding',color:'#24222a',deep:'#060508',glow:0,sheen:true,remains:['sword','skull']},
 'green slime':{scale:.9,shape:'slime',color:'#6ae02a',deep:'#1e6a10',glow:.45,drips:5,remains:['skull']},
 'blue slime':{scale:.85,shape:'slime',color:'#3a8aff',deep:'#0e2a7a',glow:.45,drips:4},
};
export const isOoze=name=>!!OOZES[name];

// Size of the mass per shape: base radius, height, and how many pseudopods reach out.
const SHAPES={
 blob:{R:.24,H:.3,pods:3,sag:.25},
 jelly:{R:.3,H:.17,pods:0,sag:.2},
 pudding:{R:.3,H:.3,pods:4,sag:.3},
 puddle:{R:.36,H:.075,pods:5,sag:.5},
 slime:{R:.22,H:.33,pods:2,sag:.25},
};

function clean(geo){
 const n=geo.index?geo.toNonIndexed():geo;if(n!==geo)geo.dispose();
 for(const k of Object.keys(n.attributes))if(!['position','normal'].includes(k))n.deleteAttribute(k);
 return n;
}
function paint(geo,fn){
 geo=clean(geo);const p=geo.attributes.position,col=new Float32Array(p.count*3),c=new THREE.Color();
 for(let i=0;i<p.count;i++){fn(p.getX(i),p.getY(i),p.getZ(i),c);col[i*3]=Math.min(1,Math.max(0,c.r));col[i*3+1]=Math.min(1,Math.max(0,c.g));col[i*3+2]=Math.min(1,Math.max(0,c.b));}
 geo.setAttribute('color',new THREE.BufferAttribute(col,3));return geo;
}
const place=(geo,x,y,z,rx=0,ry=0,rz=0)=>{geo.rotateX(rx);geo.rotateY(ry);geo.rotateZ(rz);geo.translate(x,y,z);return geo;};
// A rod from a to b.
function rod(a,b,r0,r1,sides=6){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),geo=r1>0?new THREE.CylinderGeometry(r1,r0,d.length(),sides):new THREE.ConeGeometry(r0,d.length(),sides);
 geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize()));
 const m=A.clone().addScaledVector(d,.5);geo.translate(m.x,m.y,m.z);return geo;
}

// The mass: a sphere swollen by lobes and noise, flattened below where it sags onto the floor.
function mass(R,H,o,salt){
 const geo=new THREE.SphereGeometry(1,40,26),p=geo.attributes.position,v=new THREE.Vector3();
 const lobes=Array.from({length:6},(_,i)=>({d:new THREE.Vector3(hash(salt,i,1)-.5,hash(salt,i,2)*.7,hash(salt,i,3)-.5).normalize(),s:.12+hash(salt,i,4)*.2}));
 const wobble=o.wobble||.09;
 for(let i=0;i<p.count;i++){
  v.fromBufferAttribute(p,i);
  let r=1+wobble*noise(v.x*1.3+salt,v.y*1.3,v.z*1.3);
  for(const {d,s} of lobes){const k=v.dot(d);if(k>0)r+=s*Math.pow(k,5);}
  if(o.shape==='slime'&&v.y>-.2)r+=.08*Math.sin(Math.atan2(v.z,v.x)*5+v.y*4)*(v.y+.2);// drooping folds
  v.multiplyScalar(r);
  if(v.y<0)v.y*=SHAPES[o.shape].sag;
  p.setXYZ(i,v.x*R,(v.y+SHAPES[o.shape].sag)*H,v.z*R);
 }
 geo.computeVertexNormals();return geo;
}

// A ragged sheet of slime spreading over the floor round the foot of the mass.
function slick(R,salt){
 const geo=new THREE.CircleGeometry(1,48),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),a=Math.atan2(y,x),r=Math.hypot(x,y),edge=1+.2*Math.sin(a*5+salt)+.12*Math.sin(a*11+salt*2)+.08*(hash(salt,Math.round(a*20))-.5);p.setXYZ(i,x*edge*R,y*edge*R,-.004*(1-r*r));}
 geo.rotateX(-Math.PI/2);geo.translate(0,.004,0);return geo;
}

// A pseudopod creeping out along the floor from the mass, flattening as it goes and splitting
// into pointed, grasping fingers at the end.
function pseudopod(list,a,from,len,w,o){
 const dir=new THREE.Vector3(Math.cos(a),0,Math.sin(a)),side=new THREE.Vector3(-dir.z,0,dir.x);
 const n=6;
 for(let i=0;i<n;i++){const t=i/(n-1),r=w*(1-t*.55),c=dir.clone().multiplyScalar(from+len*t);
  const s=new THREE.SphereGeometry(1,10,6);s.scale(r*1.4,r*(.7-t*.35),r);s.rotateY(-a);s.translate(c.x+side.x*Math.sin(t*3)*w*.4,r*(.45-t*.25),c.z+side.z*Math.sin(t*3)*w*.4);list.push(s);}
 const tip=dir.clone().multiplyScalar(from+len);
 for(const k of [-1,0,1]){
  const fa=a+k*.45,fd=new THREE.Vector3(Math.cos(fa),0,Math.sin(fa)),base=tip.clone().addScaledVector(side,k*w*.25);
  list.push(rod([base.x,w*.18,base.z],[base.x+fd.x*w*1.5,.006,base.z+fd.z*w*1.5],w*.28,0,6));
 }
}

// Things it has eaten, opaque inside the translucent mass.
function skull(list,x,y,z,s,yaw,tilt){
 const bone=C('#d8ccb0'),stain=C('#6a5a3a'),dark=C('#0c0806');
 const parts=[];
 const cr=new THREE.SphereGeometry(1,16,12);cr.scale(s*.9,s*.85,s*1.05);parts.push([cr,bone]);
 const face=new THREE.SphereGeometry(1,12,8);face.scale(s*.62,s*.5,s*.55);face.translate(0,-s*.45,s*.55);parts.push([face,bone]);
 for(const k of [-1,1]){const e=new THREE.SphereGeometry(s*.22,8,6);e.translate(k*s*.3,-s*.2,s*.86);parts.push([e,dark]);}
 const nose=new THREE.ConeGeometry(s*.1,s*.2,3);nose.rotateX(Math.PI);nose.translate(0,-s*.5,s*.98);parts.push([nose,dark]);
 for(let k=0;k<6;k++){const t=new THREE.BoxGeometry(s*.08,s*.14,s*.06);t.translate((k-2.5)*s*.1,-s*.8,s*.84);parts.push([t,bone]);}
 for(const [g,col] of parts){g.rotateZ(tilt);g.rotateY(yaw);g.translate(x,y,z);list.push(paint(g,(px,py,pz,c)=>c.copy(col).lerp(stain,col===dark?0:.35*hash(px*90,py*90,pz*90))));}
}
function bone(list,a,b,r){
 const col=C('#cfc2a2'),stain=C('#7a6a48');
 list.push(paint(rod(a,b,r,r*.8,6),(x,y,z,c)=>c.copy(col).lerp(stain,.4*hash(x*80,y*80,z*80))));
 for(const p of [a,b])for(const k of [-1,1]){const kn=new THREE.SphereGeometry(r*1.5,8,6);kn.translate(p[0]+k*r*.9,p[1],p[2]);list.push(paint(kn,(x,y,z,c)=>c.copy(col)));}
}
function sword(list,x,y,z,yaw){
 const rust=C('#6a3a1e'),steel=C('#7a8088'),pit=C('#2a1a10'),parts=[];
 parts.push([new THREE.BoxGeometry(.03,.006,.3).translate(0,0,.1),'blade']);
 parts.push([new THREE.BoxGeometry(.11,.014,.018).translate(0,0,-.055),'iron']);
 parts.push([new THREE.CylinderGeometry(.008,.009,.07,6).rotateX(Math.PI/2).translate(0,0,-.1),'grip']);
 parts.push([new THREE.SphereGeometry(.013,8,6).translate(0,0,-.14),'iron']);
 for(const [g,kind] of parts){g.rotateZ(.5);g.rotateX(-.35);g.rotateY(yaw);g.translate(x,y,z);
  list.push(paint(g,(px,py,pz,c)=>{const n=hash(Math.round(px*300),Math.round(pz*300),Math.round(py*300));c.copy(kind==='blade'?steel:rust).lerp(rust,kind==='blade'?.3+n*.6:.2).lerp(pit,n>.85?.7:0);}));}
}

function build(o){
 const S=SHAPES[o.shape],R=S.R,H=S.H*(o.tall||1),salt=o.color.length+R*31+H*17;
 const top=C(o.color).lerp(C('#ffffff'),.25),mid=C(o.color),deep=C(o.deep);
 const goo=[],solid=[];
 // the mass, deeper where it is thick, wet and pale on top
 goo.push(paint(mass(R,H,o,salt),(x,y,z,c)=>{const t=THREE.MathUtils.clamp(y/(H*1.1),0,1),edge=Math.min(1,Math.hypot(x,z)/R);
  c.copy(deep).lerp(mid,Math.min(1,t*1.8+edge*.3)).lerp(top,Math.max(0,t-.6)*1.6);c.multiplyScalar(.9+.2*noise(x*30,y*30,z*30));}));
 goo.push(paint(slick(R*1.25,salt),(x,y,z,c)=>{const r=Math.hypot(x,z)/(R*1.25);c.copy(mid).lerp(deep,Math.min(1,r*.9));}));
 // blisters swelling out of the skin
 for(let i=0;i<9;i++){const a=hash(salt,i,7)*Math.PI*2,h=.25+hash(salt,i,8)*.55,rr=R*(.9-h*.5),s=.018+hash(salt,i,9)*.025;
  const b=new THREE.SphereGeometry(s,10,6);b.scale(1,.7,1);b.translate(Math.cos(a)*rr,H*h+S.sag*H*.2,Math.sin(a)*rr);goo.push(paint(b,(x,y,z,c)=>c.copy(top)));}
 // pseudopods
 for(let i=0;i<S.pods;i++){const a=i/S.pods*Math.PI*2+hash(salt,i,10)*1.2,len=R*(.55+hash(salt,i,11)*.45);
  const list=[];pseudopod(list,a,R*.75,Math.min(len,.46-R*.75),R*.16,o);for(const g of list)goo.push(paint(g,(x,y,z,c)=>c.copy(mid).lerp(deep,.3)));}
 if(o.shape==='jelly'){
  // a rim skirt of thinner jelly round the dome
  const skirt=new THREE.TorusGeometry(R*.95,.025,8,40);skirt.rotateX(Math.PI/2);skirt.scale(1,.5,1);skirt.translate(0,.014,0);
  const p=skirt.attributes.position;for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),k=1+.06*Math.sin(a*9);p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);}
  goo.push(paint(skirt,(x,y,z,c)=>c.copy(mid).lerp(top,.2)));
 }
 // drips: strands hanging from the bulging sides to beads and little pools on the floor
 for(let i=0;i<(o.drips||0);i++){
  const a=hash(salt,i,12)*Math.PI*2,r=R*.98,y0=H*(.35+hash(salt,i,13)*.3),x=Math.cos(a)*r,z=Math.sin(a)*r,len=y0-.02;
  goo.push(paint(rod([x,y0,z],[x*1.03,y0-len*.8,z*1.03],.012,.004,6),(px,py,pz,c)=>c.copy(mid)));
  const drop=new THREE.SphereGeometry(.014,8,6);drop.scale(1,1.4,1);drop.translate(x*1.03,.035+hash(salt,i,14)*.05,z*1.03);goo.push(paint(drop,(px,py,pz,c)=>c.copy(top)));
  const pool=new THREE.CircleGeometry(.04,12);pool.rotateX(-Math.PI/2);pool.translate(x*1.08,.005,z*1.08);goo.push(paint(pool,(px,py,pz,c)=>c.copy(mid)));
 }
 // the eaten, held well inside the mass
 const inside=(u,v,w)=>[R*u*.5,H*(.3+v*.3)+S.sag*H*.1,R*w*.5];
 for(const [k,kind] of (o.remains||[]).entries()){
  const [x,y,z]=inside(k?-.6:.3,k?.1:.4,k?.3:-.2);
  if(kind==='skull')skull(solid,x,Math.max(y,.06),z,Math.min(.05,H*.2),k*2+.6,.5);
  else if(kind==='sword')sword(solid,x*.6,Math.max(y*.8,.05),z*.6,.9);
  else for(let j=0;j<3;j++){const a=j*2.1+salt,l=Math.min(.16,R*.7);bone(solid,[x+Math.cos(a)*l*.5,y*.7+j*.012,z+Math.sin(a)*l*.5],[x-Math.cos(a)*l*.5,y*.7+.02,z-Math.sin(a)*l*.5],.008);}
 }
 // dark nuclei clustered in a jelly, and pale bubbles trapped higher up in everything
 if(o.nuclei)for(let i=0;i<5;i++){const n=new THREE.SphereGeometry(.022+hash(salt,i,15)*.018,10,8);n.scale(1,.8,1);
  n.translate((hash(salt,i,16)-.5)*R*.6,H*(.35+hash(salt,i,17)*.25),(hash(salt,i,18)-.5)*R*.6);solid.push(paint(n,(x,y,z,c)=>c.copy(deep).multiplyScalar(.45).lerp(C('#000000'),.4*hash(x*70,y*70))));}
 for(let i=0;i<6;i++){const b=new THREE.SphereGeometry(.007+hash(salt,i,19)*.01,8,6);b.translate((hash(salt,i,20)-.5)*R*.9,H*(.5+hash(salt,i,21)*.35),(hash(salt,i,22)-.5)*R*.9);solid.push(paint(b,(x,y,z,c)=>c.copy(top).lerp(C('#ffffff'),.5)));}
 // the spotted jelly's blotches and the blue jelly's frost, on the skin
 if(o.spots)for(let i=0;i<10;i++){const a=hash(salt,i,23)*Math.PI*2,h=.3+hash(salt,i,24)*.5,rr=R*Math.sqrt(1-h*h)*.97,s=.03+hash(salt,i,25)*.03;
  const sp=new THREE.SphereGeometry(s,10,6);sp.scale(1,.25,1);sp.translate(Math.cos(a)*rr,H*(h+S.sag)*.98,Math.sin(a)*rr);solid.push(paint(sp,(x,y,z,c)=>c.set('#2a1a10').lerp(C('#6a3a10'),hash(x*90,z*90)*.5)));}
 if(o.frost)for(let i=0;i<14;i++){const a=hash(salt,i,26)*Math.PI*2,h=.2+hash(salt,i,27)*.75,rr=R*Math.sqrt(Math.max(0,1-h*h))*.9,len=.04+hash(salt,i,28)*.06;
  const x=Math.cos(a)*rr,y=H*(h+S.sag)*.92,z=Math.sin(a)*rr,out=[x*.6/R,.8,z*.6/R];
  solid.push(paint(rod([x,y,z],[x+out[0]*len,y+out[1]*len,z+out[2]*len],.01,0,4),(px,py,pz,c)=>c.set('#cfeaff').lerp(C('#ffffff'),Math.min(1,(py-y)/len))));}
 // the acid blob eats into the floor round itself
 if(o.etch){const ring=new THREE.RingGeometry(R*1.2,R*1.75,40,2),p=ring.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),a=Math.atan2(y,x),k=1+.12*Math.sin(a*7)+.08*(hash(Math.round(a*30))-.5);p.setXY(i,x*k,y*k);}
  ring.rotateX(-Math.PI/2);ring.translate(0,.002,0);solid.push(paint(ring,(x,y,z,c)=>c.set('#1a2210').lerp(C('#3a4a18'),hash(Math.round(x*200),Math.round(z*200))*.6)));}
 const merge=list=>{const m=mergeGeometries(list);list.forEach(g=>g.dispose());return m;};
 return {goo:merge(goo),solid:solid.length?merge(solid):null};
}

const shared=new Map();
function geometry(key,o){
 if(shared.has(key))return shared.get(key);
 const G=build(o);
 G.gooMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:o.sheen?.04:.1,metalness:o.sheen?.35:0,transparent:true,opacity:o.sheen?.9:.68,
  emissive:o.color,emissiveIntensity:o.glow,depthWrite:false});
 G.solidMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7});
 shared.set(key,G);return G;
}

// `name` picks a kind; any other b, j or P is a blob (or jelly, or pudding) in the glyph's colour.
export function createOoze(name,color,letter){
 const kind=OOZES[name]?name:null;
 const o=kind?OOZES[name]:{scale:.85,shape:letter==='j'?'jelly':letter==='P'?'pudding':'blob',color:color||'#7a9a6a',deep:new THREE.Color(color||'#7a9a6a').multiplyScalar(.35).getStyle(),glow:.15,remains:['bones']};
 const G=geometry(kind||`${o.shape}:${o.color}`,o);
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale);g.name='ooze';
 if(G.solid){const m=new THREE.Mesh(G.solid,G.solidMat);m.castShadow=m.receiveShadow=true;m.name='ooze-remains';body.add(m);}
 const goo=new THREE.Mesh(G.goo,G.gooMat);goo.castShadow=true;goo.receiveShadow=true;goo.renderOrder=1;goo.name='ooze-slime';body.add(goo);
 return {g,body,legs:[],tail:null,wings:[],quirk:'blob'};
}
