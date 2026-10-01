import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Snakes used to be one smooth tube in a spring-like coil with a ball for a head. They are now
// coiled serpents reared back to strike, facing +z: a scaled body that thickens from a needle of
// a tail, spirals in on the floor and rises through the middle of the coil in an S, with a flat
// belly of pale scutes and each species' own markings (the garter snake's stripes, the pit
// viper's diamonds, the python's saddles, the moccasin's dark crossbands). The head is a flat,
// wedge-shaped viper skull with overhanging brow scales that make it scowl, slit-pupilled
// glowing eyes, heat pits, a gaping lower jaw, folding fangs and a forked tongue. The cobra
// rears higher and spreads its hood, with the spectacle mark on the back; the water moccasin
// gapes wide to show its white "cotton" mouth.
// Each part is one merged, vertex-coloured mesh: the body (with the hood), the head, the eyes and
// the jaw: 4 draws. Geometry is built once per species and shared.
// Handles: body, head, and jaw (a child of the head that hinges about x; rest angle = its gape),
// so jaw.js can drive bites. Quirk 'snake'.

const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const hash=(a,b,c=0)=>{const s=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453;return s-Math.floor(s);};
const frac=v=>v-Math.floor(v);

export const SNAKES={
 'garter snake':{scale:.72,r:.032,base:'#1e2a1a',belly:'#c8c060',mark:'#d8c440',pattern:'stripes',gape:.3,eye:'#d8b020'},
 snake:{scale:.9,r:.04,base:'#6a4a2a',belly:'#c8b080',mark:'#2e1e10',pattern:'saddles',gape:.35,eye:'#e0a020'},
 'water moccasin':{scale:1,r:.044,base:'#3a3020',belly:'#2a2418',mark:'#16120c',edge:'#6a5a3a',pattern:'bands',gape:.75,mouth:'#f0ece0',eye:'#e07018',viper:true},
 'pit viper':{scale:1,r:.042,base:'#3a5070',belly:'#a0b0b8',mark:'#141c2a',edge:'#b8c8d0',pattern:'diamonds',gape:.5,eye:'#f0c020',viper:true,pits:true},
 python:{scale:1.45,r:.05,base:'#4a3446',belly:'#c0b098',mark:'#1e121c',edge:'#c8b48a',pattern:'saddles',gape:.25,eye:'#c08a20',turns:1.9},
 cobra:{scale:1.05,r:.04,base:'#1e2638',belly:'#b8b090',mark:'#0c0e16',edge:'#d8d0a8',pattern:'bands',gape:.45,eye:'#e83a1a',hood:true,rear:.18},
};
export const isSnake=name=>!!SNAKES[name];

// Parallel-transported frames along a curve: no twisting, so the belly stays down on the coil
// and turns to face forward as the neck rears up.
function frames(curve,n){
 const out=[];let N=null;
 for(let i=0;i<=n;i++){
  const u=i/n,p=curve.getPointAt(u),T=curve.getTangentAt(u).normalize();
  if(!N)N=new THREE.Vector3(0,1,0).addScaledVector(T,-T.y).normalize();
  else{const prev=out[i-1].T,axis=new THREE.Vector3().crossVectors(prev,T),s=axis.length();
   if(s>1e-6)N.applyAxisAngle(axis.divideScalar(s),Math.asin(Math.min(1,s)));N.addScaledVector(T,-N.dot(T)).normalize();}
  out.push({u,p,T,N:N.clone(),B:new THREE.Vector3().crossVectors(T,N).normalize()});
 }
 return out;
}

// Markings: a colour for a point at u along the body (0 tail tip, 1 neck) and angle a round it
// (0 along the spine, ±π the middle of the belly).
function marking(o,C,u,a,len){
 const side=Math.abs(a),belly=Math.cos(a)<-.3,s=u*len;
 if(belly){const scute=frac(s*95)<.18;return mix(C.belly,C.markC,scute?.35:.05*hash(s*40,a));}
 let c=C.base;
 const speckle=(hash(Math.round(s*160),Math.round(a*8))-.5)*.18;
 if(o.pattern==='stripes'){
  if(side<.22||Math.abs(side-1.55)<.16)c=C.markC;
  else if(frac(s*14+(side>1?.5:0))<.35)c=mix(C.base,C.belly,.18);
 }else if(o.pattern==='saddles'){
  const w=frac(s*5.5+.25*Math.sin(s*9)),d=Math.abs(w-.5)*2+side*.32;
  if(d<.5)c=C.markC;else if(d<.62)c=C.edge;
  else if(side>1.3&&frac(s*5.5+.5)<.25)c=mix(C.base,C.markC,.6);
 }else if(o.pattern==='diamonds'){
  const w=frac(s*7),d=Math.abs(w-.5)*2+side*.62;
  if(d<.62)c=C.markC;else if(d<.8)c=C.edge;
 }else if(o.pattern==='bands'){
  const w=frac(s*4.2),d=Math.abs(w-.5)*2-side*.12;
  if(d<.42)c=C.markC;else if(d<.52)c=mix(C.edge,C.base,.4);
 }
 // a little darker along the spine, and scaly speckle all over
 c=mix(c,C.markC,clamp01(.25-side*.25));
 return c.map(v=>clamp01(v*(1+speckle)));
}

// The body: a swept tube whose radius swells from the tail tip and narrows a little into the
// neck, with a flattened belly. Coloured per vertex from the markings.
function sweep(P,curve,o,C,{n=130,k=14,len}){
 const F=frames(curve,n),pos=[],col=[],idx=[];
 const radius=u=>o.r*(u<.3?.12+.88*Math.sin(u/.3*Math.PI/2):u>.86?1-(u-.86)/.14*.22:1);
 for(const {u,p,T,N,B} of F){
  const r=radius(u);
  for(let j=0;j<=k;j++){
   const a=j/k*Math.PI*2-Math.PI,ca=Math.cos(a),sa=Math.sin(a);
   const up=ca<0?ca*.62:ca,wide=1.12;
   pos.push(p.x+(N.x*up+B.x*sa*wide)*r,p.y+(N.y*up+B.y*sa*wide)*r,p.z+(N.z*up+B.z*sa*wide)*r);
   col.push(marking(o,C,u,a,len));
  }
 }
 for(let i=0;i<n;i++)for(let j=0;j<k;j++){const a=i*(k+1)+j,b=a+k+1;idx.push(a,b,a+1,a+1,b,b+1);}
 // cap the neck end (the head covers it) and the tail tip
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
 const order=idx.slice();let i=0;
 P.add(geo,null,()=>col[order[i++]]);
 return F;
}

function bodyCurve(o){
 const turns=o.turns||1.6,pts=[],end=-Math.PI/2,start=end-turns*Math.PI*2,R0=.27,R1=.13,r=o.r;
 for(let i=0;i<=40;i++){const t=i/40,a=start+(end-start)*t,R=R0-(R0-R1)*t;pts.push(new THREE.Vector3(Math.cos(a)*R,r*.8+t*r*.9,-Math.sin(a)*R*-1));}
 // rise through the coil in an S, the head carried forward over it
 const rear=o.rear||0,last=pts[pts.length-1];
 pts.push(new THREE.Vector3(last.x*.5,.1,last.z*.6+.02),new THREE.Vector3(0,.2+rear*.4,-.04),new THREE.Vector3(0,.3+rear*.8,-.01),new THREE.Vector3(0,.36+rear,.07),new THREE.Vector3(0,.37+rear,.13));
 return new THREE.CatmullRomCurve3(pts,false,'centripetal');
}

function buildBody(o,C){
 const P=pieces(),curve=bodyCurve(o),len=curve.getLength();
 const F=sweep(P,curve,o,C,{len});
 if(o.hood){
  // the hood: a broad, ribbed flap spread round the upper neck, pale and banded in front, with
  // the spectacle mark on the back
  const f=F[Math.round(F.length*.93)],geo=new THREE.SphereGeometry(1,24,12),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setY(i,y<0?y*1.25:y*.85);p.setX(i,x*(1-.25*Math.max(0,-y)));}
  geo.computeVertexNormals();
  const m=new THREE.Matrix4().makeBasis(f.B,f.T,f.N).setPosition(f.p.clone().addScaledVector(f.T,-.02).addScaledVector(f.N,-.004));
  m.multiply(new THREE.Matrix4().makeScale(.12,.1,.018));
  P.add(geo,m,(x,y,z)=>{
   const lx=(x-f.p.x)*f.B.x+(z-f.p.z)*f.B.z,ly=(y-f.p.y)*f.T.y+(z-f.p.z)*f.T.z*0,back=(x-f.p.x)*f.N.x+(y-f.p.y)*f.N.y+(z-f.p.z)*f.N.z>0;
   if(!back)return frac(ly*40)<.3?mix(C.belly,C.markC,.5):C.belly;
   const ring=Math.hypot(Math.abs(lx)-.035,ly-.0)/.022;// the spectacle: two eye rings joined by a bridge
   if(ring<.55)return C.markC;if(ring<1)return C.edge;
   if(Math.abs(ly+.022)<.005&&Math.abs(lx)<.035)return C.edge;
   return mix(C.base,C.markC,.3);
  });
 }
 return {geo:P.merge(),end:F[F.length-1]};
}

// The head and jaw in their own frame: snout along +z, top +y, hinge at the back of the jaw.
function buildHead(o,C){
 const P=pieces(),W=o.viper?1.3:1;
 const skull=new THREE.SphereGeometry(.05,20,14),p=skull.attributes.position;
 for(let i=0;i<p.count;i++){
  let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const t=(z/.05+1)/2;// 0 back, 1 snout
  x*=(W*(1-t)+.55*t)*(1+.12*Math.max(0,-y/.05));
  y*=y>0?.52-.1*t:.38;
  z*=1.45;
  p.setXYZ(i,x,y,z);
 }
 skull.computeVertexNormals();
 P.add(skull,at(0,0,.03),(x,y,z)=>y<-.006?C.belly:mix(C.base,C.markC,clamp01(.3+.4*hash(Math.round(x*300),Math.round(z*300)))));
 // a dark mask running back from the eye, and big plate scales on the crown
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.02,8,6),at(s*.036*W,.0,0.005,[0,s*.35,0],[.5,.35,1.6]),C.markC);
 for(const [x,z] of [[0,.04],[-.012,.06],[.012,.06],[0,.012]])P.add(new THREE.SphereGeometry(.013,6,4),at(x,.024,z,[0,0,0],[1,.25,1.1]),mix(C.base,C.markC,.4));
 // brow scales jutting over the eyes and angled down to the snout: a fixed scowl
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.012,.04,4),at(s*.03*W,.024,.045,[Math.PI/2+.45,0,s*-.5],[1.2,1,.45]),C.markC);
 // slit pupils on the front of the glowing eyes
 for(const s of [-1,1])P.add(new THREE.BoxGeometry(.0025,.014,.002),at(s*(.033*W+.004),.012,.058,[0,s*.95,0]),[0,0,0]);
 // nostrils, and the heat pits of the pit vipers
 for(const s of [-1,1]){P.add(new THREE.SphereGeometry(.004,6,4),at(s*.012,.008,.1),[0,0,0]);if(o.pits)P.add(new THREE.SphereGeometry(.005,6,4),at(s*.024,.0,.08),[.02,.02,.02]);}
 // the roof of the mouth and the fangs, folded down and forward
 P.add(new THREE.SphereGeometry(.03,12,6),at(0,-.012,.05,[0,0,0],[W*.9,.25,1.6]),C.mouth);
 const fang=o.viper?.034:.022;
 for(const s of [-1,1]){
  const a=[s*.016,-.014,.088],b=[s*.017,-.014-fang,.098];
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);
  P.add(new THREE.ConeGeometry(.0042,d.length(),6),new THREE.Matrix4().compose(A.clone().addScaledVector(d,.5),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize().negate()),new THREE.Vector3(1,1,1)),C.fang);
 }
 return P.merge();
}
function buildJaw(o,C){
 const P=pieces(),W=o.viper?1.2:1;
 const jaw=new THREE.SphereGeometry(.045,16,8),p=jaw.attributes.position;
 for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const t=(z/.045+1)/2;x*=W*(1-t)+.5*t;y*=y>0?.15:.32;z*=1.5;p.setXYZ(i,x,y,z);}
 jaw.computeVertexNormals();
 P.add(jaw,at(0,0,.07),(x,y,z)=>y>.002?C.mouth:C.belly);
 // the tongue: forked, flicking out and down past the lip
 const fork=(a,b,r)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);
  P.add(new THREE.CylinderGeometry(r*.5,r,d.length(),5),new THREE.Matrix4().compose(A.clone().addScaledVector(d,.5),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()),new THREE.Vector3(1,1,1)),C.tongue);};
 fork([0,.006,.06],[0,.002,.14],.004);
 for(const s of [-1,1])fork([0,.002,.14],[s*.012,-.006,.175],.002);
 return P.merge();
}
function buildEyes(o){
 const P=pieces(),W=o.viper?1.3:1;
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.0105,10,8),at(s*.033*W,.012,.052),[1,1,1]);
 return P.merge();
}

const shared=new Map();
function geometry(key,o){
 if(shared.has(key))return shared.get(key);
 const C={base:rgb(o.base),belly:rgb(o.belly),markC:rgb(o.mark),edge:rgb(o.edge||o.belly),mouth:rgb(o.mouth||'#a85a5a'),fang:rgb('#f0ead8'),tongue:rgb('#3a0a10')};
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.42,metalness:.05});
 const eye=new THREE.MeshStandardMaterial({color:o.eye,emissive:o.eye,emissiveIntensity:1.6,roughness:.15});
 const body=buildBody(o,C);
 const G={material,eye,body:body.geo,end:body.end,head:buildHead(o,C),jaw:buildJaw(o,C),eyes:buildEyes(o)};
 shared.set(key,G);return G;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.name=name;parent.add(m);return m;}

// `name` picks a species; any other 'S' is a plain snake in the glyph's colour.
export function createSnake(name,color){
 const o=SNAKES[name]||{...SNAKES.snake,base:color||SNAKES.snake.base};
 const G=geometry(SNAKES[name]?name:`snake:${o.base}`,o);
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(o.scale);g.name='snake';
 mesh(body,G.body,G.material,'snake-body');
 // the head sits on the end of the neck, tipped to look down along it at its prey
 const head=new THREE.Group(),{p,T}=G.end;head.position.copy(p).addScaledVector(T,-.01);
 head.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),T.clone().setY(T.y*.6).normalize());head.rotateX(.18);
 body.add(head);
 mesh(head,G.head,G.material,'snake-head');mesh(head,G.eyes,G.eye,'snake-eyes');
 const jaw=new THREE.Group();jaw.position.set(0,-.016,-.012);jaw.rotation.x=o.gape;jaw.userData.reach=.7;head.add(jaw);
 mesh(jaw,G.jaw,G.material,'snake-jaw');
 return {g,body,legs:[],tail:null,wings:[],quirk:'snake',head,jaw};
}
