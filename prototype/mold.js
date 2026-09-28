import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The four molds used to share the generic fungus mound: a smooth sphere dotted with 17
// loose bumps, tinted by colour (18 draws). Each now sits as a lobed, wrinkled colony that
// spreads into a thin crust on the floor, furred with hyphae tufts, with what it does to
// you written on it:
//   yellow mold: stalked sporangia with powdery heads and a ring of spore dust (stings)
//   green mold:  slick acid beads on the lobes and an acid seep on the floor (acid)
//   brown mold:  rime needles bristling out of it and frost flakes around it (cold)
//   red mold:    glowing ember pores and smouldering tuft tips (fire)
// Any other "* mold" gets the bare colony in its glyph colour.
// Two merged meshes per mold: the vertex-coloured colony and one accent mesh with its own
// material (spores, acid, rime or embers). The geometry is built once per kind and shared.
// Handles: body (the whole colony), quirk 'fungus', like the old mound.

const KINDS={
 yellow:{dark:'#5e4a12',main:'#c9a52e',light:'#f2dc6a',crust:'#7a6a2e',accent:{color:0xf6e27a,emissive:0x8a6a08,emissiveIntensity:.35,roughness:1}},
 green:{dark:'#1e3a1a',main:'#4f8f3a',light:'#a4d460',crust:'#34502a',accent:{color:0x9cf05a,emissive:0x2f8a10,emissiveIntensity:.45,roughness:.06,metalness:.1,transparent:true,opacity:.82}},
 brown:{dark:'#342214',main:'#7a5636',light:'#b89a74',crust:'#4e3c2a',accent:{color:0xe4f2ff,emissive:0x4a86c0,emissiveIntensity:.3,roughness:.18,metalness:.05}},
 red:{dark:'#34100c',main:'#962a20',light:'#d8583a',crust:'#401a14',accent:{color:0xffa050,emissive:0xff420c,emissiveIntensity:1.5,roughness:.4}},
};

// cheap smooth-ish noise from a sum of sines, seeded
const noise=(x,y,z,s)=>(Math.sin(x*4.1+s)*Math.sin(z*3.7-s*1.3)+Math.sin(y*5.3+x*2.2+s*2.1)*.6+Math.sin((x-z)*7.9+s*.7)*Math.sin(y*6.1)*.35)/1.95;
// deterministic 0..1 sequence
const rand=seed=>{let s=seed>>>0||1;return ()=>((s=(s*1664525+1013904223)>>>0)/4294967296);};

// A lobe of the colony: the upper hemisphere of a unit sphere, pushed out into a lumpy,
// wrinkled cap of radius R and height H centred on (cx,cz).
function lobe(cx,cz,R,H,seed){
 const f=(x,y,z)=>{
  const a=Math.atan2(z,x),n=noise(x,y,z,seed),wr=Math.sin(x*14+seed)*Math.sin(z*13-seed)*.035*y;
  const r=R*(1+.13*Math.sin(3*a+seed)+.07*Math.sin(5*a+seed*2.3)+n*.09+wr);
  const h=H*(1+n*.18+.12*Math.sin(2*a+seed))*Math.pow(Math.max(y,0),.85);
  return new THREE.Vector3(cx+x*r,h,cz+z*r);
 };
 // surface point and outward normal for a direction (az, el) on the hemisphere
 const sample=(az,el)=>{
  const d=(a,e)=>f(Math.cos(e)*Math.cos(a),Math.sin(e),Math.cos(e)*Math.sin(a));
  const p=d(az,el),ea=.02,ta=d(az+ea,el).sub(d(az-ea,el)),te=d(az,Math.min(el+ea,1.55)).sub(d(az,Math.max(el-ea,0)));
  const n=te.cross(ta).normalize();if(n.y<0&&el>.3)n.negate();
  return {p,n};
 };
 return {f,sample,R,H,cx,cz};
}

function orient(p,n,s=[1,1,1]){return new THREE.Matrix4().compose(p,new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),n),new THREE.Vector3(...s));}

function build(kind,colour){
 const K=KINDS[kind]||(()=>{const c=new THREE.Color(colour||'#8a8a60');const h='#'+c.getHexString(),sh=k=>'#'+c.clone().multiplyScalar(k).getHexString();return {dark:sh(.4),main:h,light:sh(1.4),crust:sh(.6)};})();
 const dark=rgb(K.dark),main=rgb(K.main),light=rgb(K.light),crust=rgb(K.crust);
 const P=pieces(),A=pieces(),r=rand({yellow:11,green:23,brown:37,red:51}[kind]||7);
 const lobes=[lobe(0,0,.25,.2,.4),lobe(.2,.1,.13,.11,2.1),lobe(-.16,.17,.11,.085,3.7),lobe(-.1,-.2,.12,.095,5.2),lobe(.15,-.15,.09,.07,6.6)];
 // colony lobes: dark at the foot, the kind's colour across the body, pale patches on top
 for(const L of lobes){
  const geo=new THREE.SphereGeometry(1,Math.max(16,Math.round(36*L.R/.25)),L.R>.2?12:8,0,Math.PI*2,0,Math.PI/2),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const v=L.f(p.getX(i),p.getY(i),p.getZ(i));p.setXYZ(i,v.x,v.y,v.z);}
  geo.computeVertexNormals();
  P.add(geo,null,(x,y,z)=>{
   const t=y/(L.H*1.2),n=noise(x*6,y*6,z*6,L.cx*9+1);
   let c=mix(dark,main,Math.pow(t,.6)*1.6);
   if(n>.25)c=mix(c,light,(n-.25)*2.2*t+.1);
   if(n<-.45)c=mix(c,dark,.5);
   return c;
  });
 }
 // the crust the colony has spread across the floor: a thin disc with a ragged edge
 {
  const geo=new THREE.CylinderGeometry(1,1,.012,48,1,false),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),rr=Math.hypot(x,z);
   const R=.34*(1+.14*Math.sin(4*a+.8)+.1*Math.sin(7*a+2)+.06*Math.sin(13*a));
   p.setXYZ(i,x*R,p.getY(i)+.006,z*R);if(rr<.01)p.setY(i,p.getY(i)+.002);
  }
  geo.computeVertexNormals();
  P.add(geo,null,(x,y,z)=>{const d=Math.hypot(x,z)/.34,n=noise(x*9,0,z*9,4);return mix(mix(dark,crust,d),light,n>.5?.35:0);});
 }
 // hyphae tufts furring the lobes
 const surface=[];
 for(const L of lobes){const k=Math.round(90*L.R/.25);for(let i=0;i<k;i++)surface.push({L,az:r()*Math.PI*2,el:.12+r()*1.3});}
 for(const {L,az,el} of surface){
  const {p,n}=L.sample(az,el),h=.018+r()*.022;
  const tip=kind==='red'&&r()<.3;
  (tip?A:P).add(new THREE.ConeGeometry(.006,h,3,1,true),orient(p.clone().addScaledVector(n,h*.4),n),tip?[1,1,1]:mix(main,light,.5+r()*.5));
 }
 const top=(n,elMin=.35)=>{const out=[];for(let i=0;i<n;i++){const L=lobes[i%lobes.length];out.push(L.sample(r()*Math.PI*2,elMin+r()*(1.5-elMin)));}return out;};
 const floorRing=(n,r0,r1)=>{const out=[];for(let i=0;i<n;i++){const a=r()*Math.PI*2,d=r0+r()*(r1-r0);out.push([Math.cos(a)*d,Math.sin(a)*d]);}return out;};
 if(kind==='yellow'){
  // sporangia: pale stalks carrying powdery heads, and loose spore dust on the floor
  for(const {p,n} of top(22,.3)){
   const h=.035+r()*.05,dir=n.clone().lerp(new THREE.Vector3(0,1,0),.5).normalize();
   P.add(new THREE.CylinderGeometry(.0035,.005,h,5,1),orient(p.clone().addScaledVector(dir,h/2),dir),mix(light,[1,1,.85],.5));
   A.add(new THREE.IcosahedronGeometry(.011+r()*.009,0),at(...p.clone().addScaledVector(dir,h).toArray()),mix([1,.9,.4],[.85,.65,.15],r()));
  }
  for(const [x,z] of floorRing(46,.26,.44))A.add(new THREE.IcosahedronGeometry(.006+r()*.006,0),at(x,.004,z,[0,r()*3,0],[1,.35,1]),mix([1,.92,.5],[.8,.66,.2],r()));
 } else if(kind==='green'){
  // acid beads glistening on the lobes, and a seep of acid pooling beside the colony
  for(const {p,n} of top(20,.25)){const s=.012+r()*.018;A.add(new THREE.SphereGeometry(1,8,5),orient(p.clone().addScaledVector(n,s*.35),n,[s,s*.7,s]),mix([.55,.95,.35],[.8,1,.5],r()));}
  const geo=new THREE.CircleGeometry(1,40),q=geo.attributes.position;
  for(let i=0;i<q.count;i++){const x=q.getX(i),y=q.getY(i),a=Math.atan2(y,x);const k=1+.18*Math.sin(3*a+1)+.1*Math.sin(6*a);q.setXY(i,x*k,y*k);}
  A.add(geo,at(.22,.014,.18,[-Math.PI/2,0,.5],[.14,.09,1]),[.45,.85,.25]);
  A.add(new THREE.CircleGeometry(1,24),at(-.3,.013,-.05,[-Math.PI/2,0,0],[.07,.05,1]),[.45,.85,.25]);
 } else if(kind==='brown'){
  // rime needles in clusters, and frost flakes scattered on the floor round it
  for(let i=0;i<14;i++){
   const L=lobes[i%lobes.length],az=r()*Math.PI*2,el=.25+r()*1.1;
   for(let j=0;j<4;j++){
    const {p,n}=L.sample(az+(r()-.5)*.3,Math.min(el+(r()-.5)*.25,1.5)),h=.03+r()*.045;
    const d=n.clone().add(new THREE.Vector3(r()-.5,r()*.4,r()-.5).multiplyScalar(.6)).normalize();
    A.add(new THREE.ConeGeometry(.007,h,4,1),orient(p.clone().addScaledVector(d,h*.45),d),mix([.8,.9,1],[1,1,1],r()));
   }
  }
  for(const [x,z] of floorRing(30,.28,.44))A.add(new THREE.CircleGeometry(.018+r()*.014,6),at(x,.004,z,[-Math.PI/2,0,r()*3]),mix([.75,.85,.95],[1,1,1],r()));
 } else if(kind==='red'){
  // ember pores half sunk into the lobes
  for(const {p,n} of top(30,.15)){const s=.01+r()*.014;A.add(new THREE.IcosahedronGeometry(1,0),orient(p.clone().addScaledVector(n,-s*.3),n,[s,s*.5,s]),mix([1,.55,.2],[1,.85,.45],r()));}
  // and scorch marks on the floor
  for(const [x,z] of floorRing(8,.3,.38))P.add(new THREE.CircleGeometry(.04+r()*.04,9),at(x,.013,z,[-Math.PI/2,0,0],[1,.6+r()*.4,1]),[.08,.04,.03]);
 }
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95});
 const accent=K.accent&&new THREE.MeshStandardMaterial({vertexColors:true,...K.accent,side:kind==='green'||kind==='brown'?THREE.DoubleSide:THREE.FrontSide});
 return {colony:P.merge(),accent:K.accent?A.merge():null,material,accentMaterial:accent};
}

const shared=new Map();
export function moldKind(name){const k=(name||'').toLowerCase().split(' ')[0];return KINDS[k]?k:null;}
export function createMold(name,colour){
 const kind=moldKind(name),key=kind||'other:'+(colour||'');
 if(!shared.has(key))shared.set(key,build(kind,colour));
 const S=shared.get(key);
 const g=new THREE.Group(),body=new THREE.Group();g.name=name||'mold';g.add(body);
 const add=(geo,m,part)=>{const mesh=new THREE.Mesh(geo,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=part;body.add(mesh);return mesh;};
 add(S.colony,S.material,'colony');
 if(S.accent)add(S.accent,S.accentMaterial,kind==='yellow'?'spores':kind==='green'?'acid':kind==='brown'?'rime':'embers');
 return {g,body,legs:[],tail:null,wings:[],quirk:'fungus',kind};
}
