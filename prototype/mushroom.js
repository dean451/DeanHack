import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The shrieker and the violet fungus used to share the old primitive mushroom: a plain
// cylinder stalk, a smooth half-sphere cap and seven dots (10–14 draws). Each now has its
// own fungus, built as two merged, vertex-coloured meshes:
//   shrieker:      a squat, bulbous stalk that flares into a ruffled trumpet with ridged
//                  false gills down its outside, a throat that deepens to a faint violet
//                  glow (it screams), a couple of button pups and root threads at its foot
//   violet fungus: a broad violet dome flecked with pale warts, a skirt ring on the stalk,
//                  a full fan of gills under the cap, and four glossy grasping tendrils
//                  studded with pink suckers, curling up where they touch the floor
// Both stand in a pale mycelium crust. The geometry is built once per kind and shared.
// Handles: body (the whole fungus), quirk 'fungus', like the old mushroom.

const KINDS={
 shrieker:{stem:'#d8cdb5',stemDark:'#8a7a60',main:'#8f5aa8',dark:'#3a1f4a',light:'#c9a2d8',crust:'#5a4a52',
  accent:{color:0xe0c0ff,emissive:0x9a50ff,emissiveIntensity:.9,roughness:.5},accentPart:'throat'},
 'violet fungus':{stem:'#cdb8c8',stemDark:'#6a4a6a',main:'#b05ac0',dark:'#4a1c56',light:'#e0b0ec',crust:'#4e3a52',
  accent:{roughness:.22,metalness:.05},accentPart:'tendrils'},
};

const noise=(x,y,z,s)=>(Math.sin(x*4.1+s)*Math.sin(z*3.7-s*1.3)+Math.sin(y*5.3+x*2.2+s*2.1)*.6+Math.sin((x-z)*7.9+s*.7)*Math.sin(y*6.1)*.35)/1.95;
const rand=seed=>{let s=seed>>>0||1;return ()=>((s=(s*1664525+1013904223)>>>0)/4294967296);};

// A lathe around y from [r,y] profile points. shape(r,y,a,j) returns the moved [r,y] for
// profile point j at angle a, so ruffles, ridges and lumps can be pushed in per vertex.
function lathe(profile,segs,shape){
 const geo=new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(Math.max(r,1e-4),y)),segs),p=geo.attributes.position,n=profile.length;
 for(let i=0;i<p.count;i++){
  const j=i%n,a=Math.floor(i/n)/segs*Math.PI*2,[r,y]=shape?shape(profile[j][0],profile[j][1],a,j):profile[j];
  p.setXYZ(i,Math.sin(a)*r,y,Math.cos(a)*r);
 }
 geo.computeVertexNormals();
 return geo;
}
// De-index a lathe so each vertex can be coloured knowing which profile point it came from
// (pieces.add keeps the order of a geometry that is already non-indexed).
function painted(geo,fn){
 const idx=geo.index.array,flat=geo.toNonIndexed(),p=flat.attributes.position,cols=[];geo.dispose();
 for(let k=0;k<p.count;k++)cols.push(fn(idx[k],p.getX(k),p.getY(k),p.getZ(k)));
 let k=0;return [flat,null,()=>cols[k++]];
}
// linear interpolation along a profile, for y at radius r
const along=(profile,r)=>{for(let i=1;i<profile.length;i++){const [r0,y0]=profile[i-1],[r1,y1]=profile[i];if((r-r0)*(r-r1)<=0)return y0+(y1-y0)*(r1===r0?0:(r-r0)/(r1-r0));}return profile.at(-1)[1];};

// A tube whose radius runs from r0 to r1 along the curve.
function taperTube(points,r0,r1,segs=24,radial=7){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),geo=new THREE.TubeGeometry(curve,segs,1,radial,false),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const t=Math.floor(i/(radial+1))/segs,c=curve.getPointAt(t),r=r0+(r1-r0)*t;
  p.setXYZ(i,c.x+(p.getX(i)-c.x)*r,c.y+(p.getY(i)-c.y)*r,c.z+(p.getZ(i)-c.z)*r);
 }
 geo.computeVertexNormals();
 return {geo,curve};
}

// pale mycelium crust with a ragged edge, and root threads creeping out across the floor
function crust(P,K,r,radius){
 const dark=rgb(K.crust),pale=rgb('#ddd4c8');
 const geo=new THREE.CylinderGeometry(1,1,.01,40,1,false),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x);const R=radius*(1+.15*Math.sin(5*a+.6)+.08*Math.sin(11*a));p.setXYZ(i,x*R,p.getY(i)+.005,z*R);}
 geo.computeVertexNormals();
 P.add(geo,null,(x,y,z)=>mix(dark,pale,noise(x*11,0,z*11,2)>.35?.45:.12));
 for(let i=0;i<9;i++){
  const a=i*.7+r()*.5,d0=radius*.5,d1=radius*(1.05+r()*.3),bend=(r()-.5)*.5;
  const pts=[0,.5,1].map(t=>{const d=d0+(d1-d0)*t,b=a+bend*t;return [Math.cos(b)*d,.012-.006*t,Math.sin(b)*d];});
  P.add(taperTube(pts,.006,.0015,8,4).geo,null,mix(pale,dark,.25));
 }
}

function shrieker(K,P,A,r){
 const stem=rgb(K.stem),stemDark=rgb(K.stemDark),main=rgb(K.main),dark=rgb(K.dark),light=rgb(K.light);
 // bulbous stalk flaring straight into the trumpet: outer wall up to a rolled rim, then the
 // inner wall back down into the throat. Points 0–9 are outside, 10 the lip, 11– inside.
 const prof=[[.1,0],[.13,.03],[.125,.08],[.095,.14],[.08,.2],[.085,.26],[.11,.33],[.16,.41],[.22,.48],[.265,.525],[.27,.54],[.25,.535],[.2,.5],[.14,.45],[.09,.41],[.05,.385],[0,.375]];
 const RIM=10;
 const trumpet=(rr,y,a,j)=>{
  // the rim ruffles in and out and up and down, more so the further out it is
  const t=Math.max(0,(rr-.08)/.19),ruffle=.07*Math.sin(7*a+.4)+.035*Math.sin(13*a+1.3)+.02*Math.sin(3*a);
  let R=rr*(1+ruffle*t*t),Y=y+.035*t*t*Math.sin(7*a+2)+.01*noise(rr*6,y*6,a,1);
  // ridged false gills running down the outside of the trumpet
  if(j>=5&&j<RIM)R+=.007*Math.pow(Math.max(0,Math.cos(26*a+.3*Math.sin(3*a))),3)*(j<RIM-1?1:.4);
  if(j<3)R*=1+.04*noise(a*3,y*9,0,5);
  return [R,Y];
 };
 const geo=lathe(prof,64,trumpet);
 P.add(...painted(geo,(i,x,y,z)=>{
  const j=i%prof.length,n=noise(x*9,y*9,z*9,3);let c;
  if(j<5)c=mix(mix(stemDark,stem,y/.2+.2),stem,n*.5+.3);
  else if(j<RIM)c=mix(mix(stem,main,(j-4)/4),dark,Math.max(0,Math.cos(26*Math.atan2(x,z)))**3*.35);
  else if(j===RIM)c=mix(light,main,.3+n*.3);
  else c=mix(mix(main,dark,(j-RIM)/5),[.55,.3,.75],j>=prof.length-2?.5:0);
  if(j<RIM&&n>.4)c=mix(c,light,.3);
  return c;
 }));
 // the glow deep in the throat
 A.add(new THREE.SphereGeometry(1,20,8,0,Math.PI*2,0,Math.PI/2),at(0,.372,0,[0,0,0],[.07,.018,.07]),[1,1,1]);
 // pale speckles on the outside of the trumpet
 for(let i=0;i<26;i++){const a=r()*Math.PI*2,j=6+Math.floor(r()*3),[R0,y]=trumpet(prof[j][0],prof[j][1],a,j),R=R0+.003;P.add(new THREE.IcosahedronGeometry(.007+r()*.006,0),at(Math.sin(a)*R,y,Math.cos(a)*R,[0,0,0],[1,.6,1]),mix(light,[1,1,1],r()*.5));}
 // two button pups at the foot, each a little stalk and cap
 for(const [x,z,s] of [[.19,.1,.55],[-.14,.17,.4]]){
  P.add(lathe([[.03,0],[.034,.02],[.026,.06],[.024,.09]],12),at(x,0,z,[0,0,0],[s*1.6,s*1.6,s*1.6]),stem);
  P.add(new THREE.SphereGeometry(.07,14,7,0,Math.PI*2,0,Math.PI/2),at(x,.14*s,z,[0,0,0],[s*1.6,s*1.3,s*1.6]),mix(main,light,.25));
 }
 crust(P,K,r,.3);
}

function violetFungus(K,P,A,r){
 const stem=rgb(K.stem),stemDark=rgb(K.stemDark),main=rgb(K.main),dark=rgb(K.dark),light=rgb(K.light),wart=rgb('#b8ab8c');
 // stalk with a swollen foot
 P.add(lathe([[.1,0],[.115,.025],[.1,.06],[.075,.1],[.066,.18],[.062,.26],[.064,.3],[.07,.33]],24,(rr,y,a)=>[rr*(1+.05*noise(a*2,y*8,0,4)),y]),null,
  (x,y,z)=>mix(mix(stemDark,stem,y/.12+.1),mix(stem,dark,.25),Math.max(0,Math.cos(Math.atan2(x,z)*18))**4*.5));
 // skirt ring hanging from the stalk
 P.add(lathe([[.064,.265],[.09,.255],[.11,.235],[.118,.22],[.112,.215]],32,(rr,y,a)=>[rr,y+.008*Math.sin(5*a)*(rr-.064)/.05]),null,mix(stem,[1,1,1],.35));
 // domed cap: top surface out to a curled-under lip, then the flat underside back to the stalk
 const top=[[0,.47],[.06,.466],[.12,.452],[.18,.425],[.23,.385],[.265,.34],[.28,.305]],under=[[.27,.29],[.24,.3],[.17,.308],[.1,.315],[.066,.32]];
 const prof=[...top,...under],TOP=top.length;
 const dome=(rr,y,a,j)=>{const lump=noise(Math.sin(a)*rr*9,y*4,Math.cos(a)*rr*9,6);const k=j<TOP?1:.3;return [rr*(1+.05*Math.sin(5*a+1)*rr/.28+.02*lump),y+.015*lump*k*rr/.28];};
 const cap=lathe(prof,56,dome);
 P.add(...painted(cap,(i,x,y,z)=>{const j=i%prof.length,n=noise(x*8,y*8,z*8,7);
  return j<TOP?mix(mix(dark,main,.35+j/TOP),light,n>.3?(n-.3)*.9:0):mix(dark,stemDark,.3);}));
 // gills: a fan of thin plates under the cap, long and short alternating
 for(let i=0;i<44;i++){
  const a=i/44*Math.PI*2,r0=i%2?.14:.075,r1=.262,len=r1-r0,mid=(r0+r1)/2;
  P.add(new THREE.BoxGeometry(len,.024,.0035),at(Math.sin(a)*mid,.295,Math.cos(a)*mid,[0,a-Math.PI/2,0]),mix(mix(stemDark,light,.35),dark,i%3?0:.3));
 }
 // pale warts on the dome, flattened against it
 for(let i=0;i<24;i++){
  const r0=Math.sqrt(r())*.25,a=r()*Math.PI*2,y0=along(top,r0),slope=Math.atan2(along(top,r0+.01)-y0,.01),s=.012+r()*.014,[rr,y]=dome(r0,y0,a,0);
  P.add(new THREE.IcosahedronGeometry(1,1),at(Math.sin(a)*rr,y,Math.cos(a)*rr,[0,a,0]).multiply(at(0,0,0,[-slope,0,0],[s,s*.5,s])),mix(wart,light,r()*.4));
 }
 // four grasping tendrils: out from under the cap, down to the floor and curling back up
 const ten=rgb('#7a3a88'),tenLight=rgb('#b070c0'),sucker=rgb('#8a5c6a');
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2+.4+(r()-.5)*.3,c=Math.cos(a),s=Math.sin(a),swing=(r()-.5)*.5,pt=(d,y,w=0)=>[Math.cos(a+w)*d,y,Math.sin(a+w)*d];
  const {geo,curve}=taperTube([pt(.12,.3),pt(.24,.27,swing*.2),pt(.33,.15,swing*.5),pt(.37,.03,swing*.8),pt(.43,.025,swing),pt(.46,.06,swing*1.2),pt(.42,.08,swing*1.4)],.026,.006,32,8);
  A.add(geo,null,(x,y,z)=>mix(ten,tenLight,y/.35+.1*noise(x*20,y*20,z*20,i)));
  // suckers along the underside of the reach
  for(let k=0;k<6;k++){
   const t=.35+k*.09,p=curve.getPointAt(t),tan=curve.getTangentAt(t),side=new THREE.Vector3(-s,0,c),down=new THREE.Vector3().crossVectors(tan,side).normalize();
   if(down.y>0)down.negate();
   const rad=.026+(.006-.026)*t,q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),down.clone().negate());
   A.add(new THREE.TorusGeometry(1,.45,4,8),new THREE.Matrix4().compose(p.clone().addScaledVector(down,rad*.85),q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,0,0))),new THREE.Vector3(rad*.45,rad*.45,rad*.45)),sucker);
  }
 }
 crust(P,K,r,.3);
}

function build(kind){
 const K=KINDS[kind],P=pieces(),A=pieces(),r=rand(kind==='shrieker'?19:43);
 (kind==='shrieker'?shrieker:violetFungus)(K,P,A,r);
 return {
  main:P.merge(),accent:A.merge(),
  material:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85}),
  accentMaterial:new THREE.MeshStandardMaterial({vertexColors:true,...K.accent}),
 };
}

const shared=new Map();
export function mushroomKind(name){return KINDS[name]?name:null;}
export function createMushroom(name){
 const kind=mushroomKind(name);if(!kind)return null;
 if(!shared.has(kind))shared.set(kind,build(kind));
 const S=shared.get(kind),g=new THREE.Group(),body=new THREE.Group();g.name=name;g.add(body);
 const add=(geo,m,part)=>{const mesh=new THREE.Mesh(geo,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=part;body.add(mesh);return mesh;};
 add(S.main,S.material,'fungus');
 add(S.accent,S.accentMaterial,KINDS[kind].accentPart);
 return {g,body,legs:[],tail:null,wings:[],quirk:'fungus',kind};
}
