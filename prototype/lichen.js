import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The lichen used to be nine squashed spheres and five plain cylinder cups (14 draws). It is
// now a leafy (foliose) rosette spreading across the floor:
//   - three tiers of overlapping strap lobes that widen to crinkled, upturned tips, the
//     inner tiers heaped up in the middle, grey-green on top with a pale frosted margin and
//     dark speckles, sooty brown-black underneath where the edges lift
//   - a cushion in the middle sprouting pixie cups (stalked goblets with toothed rims) and
//     a few branched "soldier" stalks with scarlet caps
//   - orange-brown fruiting discs with pale rims set into the lobes, and glistening sticky
//     beads (a lichen's touch sticks to you)
//   - a few young rosettes budding off onto the floor round it
// Two merged meshes: the vertex-coloured thallus and one glossy accent mesh (discs, scarlet
// caps and beads). The geometry is built once and shared by every lichen.
// Handles: body (the whole lichen), quirk 'fungus', like the old crust.

const C={top:rgb('#6f7a45'),deep:rgb('#444d2b'),pale:rgb('#a9a584'),speck:rgb('#1f2416'),under:rgb('#241d15'),underPale:rgb('#554a38'),
 cup:rgb('#8e9672'),cupIn:rgb('#4f5a3d'),disc:rgb('#8a4a22'),discRim:rgb('#a89a70'),scarlet:rgb('#8e1812'),bead:rgb('#a9b672')};

const noise=(x,y,z,s)=>(Math.sin(x*4.1+s)*Math.sin(z*3.7-s*1.3)+Math.sin(y*5.3+x*2.2+s*2.1)*.6+Math.sin((x-z)*7.9+s*.7)*Math.sin(y*6.1)*.35)/1.95;
const rand=seed=>{let s=seed>>>0||1;return ()=>((s=(s*1664525+1013904223)>>>0)/4294967296);};

// An indexed (nu+1)×(nv+1) grid surface from fn(u,v) -> [x,y,z], u and v in 0..1.
function grid(nu,nv,fn,flip){
 const pos=[],idx=[];
 for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++)pos.push(...fn(i/nu,j/nv));
 for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){
  const a=i*(nv+1)+j,b=a+nv+1;
  flip?idx.push(a,a+1,b,b,a+1,b+1):idx.push(a,b,a+1,b,b+1,a+1);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);
 geo.computeVertexNormals();return geo;
}

// One strap lobe from (cx,cz) heading along angle a: s runs out along it, w across it.
// The top and bottom surfaces meet at the margin, so the lobe is closed. Returns a sampler
// for the upper surface too, so discs and beads can sit on it.
function lobe({cx=0,cz=0,a,r0,L,W,h0,T=.006,seed}){
 const dx=Math.cos(a),dz=Math.sin(a);
 const shape=(s,w)=>{
  // spatula outline: narrow at the root, widest near the tip, rounded off at the end
  const tip=s>.72?Math.sqrt(Math.max(0,1-((s-.72)/.28)**2)):1;
  const half=W*(.38+.62*Math.min(1,s/.7))*tip;
  const v=w*2-1,along=r0+L*s+.012*Math.sin(v*Math.PI*2.5+seed)*s**4;
  const across=half*v;
  // falls from h0 at the root to the floor, the edges and the tip curling up and ruffled
  const y=.007+h0*(1-s)**1.4+.014*v*v*s+.02*Math.max(0,s-.8)**1.5*3+.005*Math.sin(v*5+seed+s*7)*s;
  const th=T*Math.sqrt(Math.max(0,1-v*v))*tip*(1-.5*s);
  return {x:cx+dx*along-dz*across,z:cz+dz*along+dx*across,y,th,v,edge:Math.max(Math.abs(v),1-tip)};
 };
 return {
  top:(s,w)=>{const p=shape(s,w);return [p.x,p.y+p.th,p.z];},
  bottom:(s,w)=>{const p=shape(s,w);return [p.x,p.y-p.th,p.z];},
  info:shape,a,
 };
}

// A lathe around y from [r,y] profile points.
function lathe(profile,segs){return new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(Math.max(r,1e-4),y)),segs);}

function orient(p,n,s=[1,1,1]){return new THREE.Matrix4().compose(p,new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),n),new THREE.Vector3(...s));}

// Point and upward normal on a lobe's top surface.
function onLobe(L,s,w){
 const p=new THREE.Vector3(...L.top(s,w)),e=.02;
 const ts=new THREE.Vector3(...L.top(Math.min(1,s+e),w)).sub(new THREE.Vector3(...L.top(Math.max(0,s-e),w)));
 const tw=new THREE.Vector3(...L.top(s,Math.min(1,w+e))).sub(new THREE.Vector3(...L.top(s,Math.max(0,w-e))));
 const n=tw.cross(ts).normalize();if(n.y<0)n.negate();
 return {p,n};
}

function build(){
 const P=pieces(),A=pieces(),r=rand(4127),lobes=[];
 // tiers: outer, middle, inner — fewer, shorter and higher towards the middle
 const tiers=[{n:12,r0:.07,L:.25,W:.05,h0:.03},{n:9,r0:.035,L:.17,W:.045,h0:.055},{n:6,r0:.01,L:.1,W:.034,h0:.075}];
 tiers.forEach((t,k)=>{for(let i=0;i<t.n;i++){
  const a=(i+k*.5)/t.n*Math.PI*2+(r()-.5)*.25,j=.85+r()*.3;
  lobes.push(lobe({a,r0:t.r0,L:t.L*j,W:t.W*(.85+r()*.3),h0:t.h0*(.9+r()*.2),seed:r()*6}));
 }});
 // young rosettes budding off onto the floor
 for(const [bx,bz,sc] of [[.33,-.12,.45],[-.26,.25,.38],[-.07,-.35,.32]])
  for(let i=0;i<5;i++)lobes.push(lobe({cx:bx,cz:bz,a:i/5*Math.PI*2+r(),r0:.004,L:.2*sc,W:.05*sc,h0:.012*sc,T:.004,seed:r()*6}));
 for(const L of lobes){
  const s0=L.info(0,.5);
  P.add(grid(7,5,L.top),null,(x,y,z)=>{
   // frosted pale margin, deeper green where lobes shade each other low down, dark specks
   const n=noise(x*30,y*30,z*30,L.a),d=Math.hypot(x,z);
   let c=mix(C.deep,C.top,.45+y*9+n*.3);
   const q=Math.hypot(x-s0.x,z-s0.z);
   if(y<.012&&d>.3)c=mix(c,C.pale,.45);
   if(n>.55)c=mix(c,C.pale,(n-.55)*2.5);
   if(noise(x*90,0,z*90,L.a*3)>.72)c=mix(c,C.speck,.7);
   return mix(c,C.pale,Math.max(0,q-.18)*1.8);
  });
  P.add(grid(7,5,L.bottom,true),null,(x,y,z)=>mix(C.under,C.underPale,noise(x*40,0,z*40,2)*.5+.2));
 }
 // cushion in the middle
 {
  const geo=new THREE.SphereGeometry(1,20,8,0,Math.PI*2,0,Math.PI/2),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=noise(x*3,y*3,z*3,1.7);p.setXYZ(i,x*.075*(1+n*.12),.05+y*.045*(1+n*.2),z*.075*(1+n*.12));}
  geo.computeVertexNormals();
  P.add(geo,null,(x,y,z)=>mix(C.deep,C.top,(y-.05)*14+noise(x*40,y*40,z*40,5)*.3));
 }
 // pixie cups: stalked goblets with toothed rims, lined darker inside
 const cupProfile=[[.004,0],[.0055,.02],[.0065,.04],[.012,.052],[.019,.062],[.021,.066],[.017,.063],[.011,.056],[.004,.052],[0,.051]];
 for(let i=0;i<7;i++){
  const a=i/7*Math.PI*2+r()*.6,d=.02+r()*.045,h=.75+r()*.55;
  const geo=lathe(cupProfile,9),p=geo.attributes.position;
  for(let k=0;k<p.count;k++){const x=p.getX(k),z=p.getZ(k),y=p.getY(k),ang=Math.atan2(z,x);if(y>.058)p.setY(k,y+.004*Math.max(0,Math.sin(ang*6)));}
  geo.computeVertexNormals();
  const lean=[(r()-.5)*.5,0,(r()-.5)*.5];
  P.add(geo,at(Math.cos(a)*d,.085,Math.sin(a)*d,lean,[1,h,1]),(x,y,z)=>{const t=(y-.085)/(.066*h);return t>.78&&Math.hypot(x-Math.cos(a)*d,z-Math.sin(a)*d)<.016?C.cupIn:mix(C.deep,C.cup,t*1.4);});
 }
 // soldiers: forked stalks with scarlet caps
 for(let i=0;i<4;i++){
  const a=i/4*Math.PI*2+.7+r()*.4,d=.04+r()*.025,x=Math.cos(a)*d,z=Math.sin(a)*d,h=.035+r()*.02;
  P.add(new THREE.CylinderGeometry(.0035,.005,h,6),at(x,.085+h/2,z),C.cup);
  // the fork leans out left and right of the stalk, each branch tipped with a cap
  for(const side of [-1,1]){
   const by=.085+h+.006,bx=x+side*.004;
   P.add(new THREE.CylinderGeometry(.0025,.003,.014,5),at(bx,by,z,[0,0,-side*.5]),C.cup);
   A.add(new THREE.SphereGeometry(.0065,7,5),at(bx+side*.0034,by+.0091,z,[0,0,0],[1,.8,1]),C.scarlet);
  }
 }
 // fruiting discs on the lobes, with a pale rim
 const outer=lobes.slice(0,27);
 for(let i=0;i<14;i++){
  const L=outer[(i*5)%outer.length],{p,n}=onLobe(L,.45+r()*.35,.3+r()*.4),s=.011+r()*.008;
  P.add(new THREE.TorusGeometry(1,.3,4,10),orient(p.clone().addScaledVector(n,s*.25),n,[s,s,s]).multiply(at(0,0,0,[Math.PI/2,0,0])),C.discRim);
  A.add(new THREE.CylinderGeometry(.85,.9,.35,10),orient(p.clone().addScaledVector(n,s*.2),n,[s,s,s]),mix(C.disc,[.55,.25,.08],r()*.6));
 }
 // sticky beads glistening on the lobes and the cushion
 for(let i=0;i<24;i++){
  const L=outer[(i*7+3)%outer.length],{p,n}=onLobe(L,.2+r()*.7,.15+r()*.7),s=.004+r()*.004;
  A.add(new THREE.SphereGeometry(1,6,4),orient(p.clone().addScaledVector(n,s*.4),n,[s,s*.75,s]),mix(C.bead,[1,1,.9],r()));
 }
 return {
  thallus:P.merge(),fruit:A.merge(),
  material:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92}),
  accentMaterial:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.26,metalness:.02}),
 };
}

let shared=null;
export function createLichen(name='lichen'){
 shared??=build();
 const g=new THREE.Group(),body=new THREE.Group();g.name=name;g.add(body);
 const add=(geo,m,part)=>{const mesh=new THREE.Mesh(geo,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=part;body.add(mesh);return mesh;};
 add(shared.thallus,shared.material,'thallus');
 add(shared.fruit,shared.accentMaterial,'fruit');
 return {g,body,legs:[],tail:null,wings:[],quirk:'fungus',kind:'lichen'};
}
