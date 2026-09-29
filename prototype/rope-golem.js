import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {rgb,mix,at} from './homunculus.js';

// The rope golem used to be the stone golem's slab body tinted brown. It now stands as a figure
// of hemp rope: the torso is one thick rope coiled round and round from the hips to the neck,
// with a sash of rope across the chest and a big knot at the belly trailing a frayed end. A rope
// yoke runs through the shoulders. The limbs are thick three-strand laid rope, twisted strand by
// strand, whipped with dark cord at the knees, ankles, elbows and wrists. The hands come unlaid:
// the three strands splay apart into grasping fingers with frayed tips. Each foot is a flat coil of
// rope on the ground. The head is a monkey's-fist knot, a ball of wrapped turns with a loose end
// flopping from the crown, and ember eyes glowing out between the turns (the golem's `core`, so
// the glow still pulses). It chokes its victims, so a hangman's noose dangles from its left hand.
// Each moving part (body, head, each leg and arm) is one merged, vertex-coloured, indexed mesh on
// one shared material, plus one mesh for the eyes: 7 draws. The geometry is built once and shared.
// Handles: body, head, legs, arms, arm, core, like the straw golem.

const C={
 hemp:rgb('#a8844a'),light:rgb('#d0b073'),groove:rgb('#4e3618'),
 cord:rgb('#3e2c18'),cordLight:rgb('#6a5030'),fibre:rgb('#dcc28c'),core:rgb('#2a1c0e'),
};
const Y=new THREE.Vector3(0,1,0);
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};

// Collects indexed pieces with per-vertex colour. `colour` is an RGB triple, a function of the
// piece's own (x,y,z) before the matrix places it, or a ready Float32Array.
function collector(){
 const list=[];
 return {
  add(geo,matrix,colour){
   if(!geo.index)throw new Error('rope-golem pieces must be indexed');
   for(const key of Object.keys(geo.attributes))if(key!=='position'&&key!=='normal')geo.deleteAttribute(key);
   const p=geo.attributes.position;let col=colour;
   if(!(colour instanceof Float32Array)){
    col=new Float32Array(p.count*3);
    for(let i=0;i<p.count;i++){const c=typeof colour==='function'?colour(p.getX(i),p.getY(i),p.getZ(i)):colour;for(let k=0;k<3;k++)col[i*3+k]=THREE.MathUtils.clamp(c[k],0,1);}
   }
   geo.setAttribute('color',new THREE.BufferAttribute(col,3));
   if(matrix)geo.applyMatrix4(matrix);
   list.push(geo);
  },
  merge(){const geo=mergeGeometries(list);list.forEach(g=>g.dispose());return geo;},
 };
}

// Three-strand laid rope along a curve: a tube whose surface swells into three strands that
// twist along its length, pale on the crowns and dark in the grooves, with a fleck of fibre.
function rope(P,curve,r,{seg,radial=9,matrix=null,seed=1,shade=1,lay=1.9}={}){
 const L=curve.getLength();seg=seg||Math.max(6,Math.ceil(L/(r*.9)));
 const geo=new THREE.TubeGeometry(curve,seg,r,radial,false),p=geo.attributes.position,col=new Float32Array(p.count*3);
 const centre=new THREE.Vector3(),v=new THREE.Vector3();
 for(let i=0;i<p.count;i++){
  const s=Math.floor(i/(radial+1)),j=i%(radial+1),u=s/seg,ang=j/radial*Math.PI*2+u*L/(r*lay);
  const ridge=Math.cos(3*ang);
  curve.getPointAt(u,centre);v.fromBufferAttribute(p,i).sub(centre).multiplyScalar(.93+.1*ridge).add(centre);p.setXYZ(i,v.x,v.y,v.z);
  const c=mix(mix(C.groove,C.hemp,Math.pow((ridge+1)/2,.6)),C.light,Math.max(0,ridge)*.45+.15*hash(s*3.7+j*1.3+seed));
  for(let k=0;k<3;k++)col[i*3+k]=THREE.MathUtils.clamp(c[k]*shade,0,1);
 }
 geo.computeVertexNormals();
 P.add(geo,matrix,col);
}
const line=(...pts)=>new THREE.CatmullRomCurve3(pts.map(a=>new THREE.Vector3(...a)));

// whipping: tight turns of dark cord round a rope at height y
function whipping(P,matrix,r,y,turns=3){
 for(let i=0;i<turns;i++){
  const ring=new THREE.TorusGeometry(r,.0075,4,r>.05?16:12);ring.rotateX(Math.PI/2);ring.translate(0,y+(i-(turns-1)/2)*.014,0);
  P.add(ring,matrix,(x,yy,z)=>mix(C.cord,C.cordLight,.5+.5*Math.sin(Math.atan2(z,x)*7+i)));
 }
}

// a frayed end: loose fibres fanning from a point along a direction
function fray(P,matrix,from,dir,{n=9,len=.05,spread=.35,seed=1}={}){
 const d=dir.clone().normalize();
 for(let i=0;i<n;i++){
  const f=d.clone().add(new THREE.Vector3(hash(i+seed)-.5,hash(i*2.1+seed)-.5,hash(i*3.3+seed)-.5).multiplyScalar(spread*2)).normalize();
  const l=len*(.6+.5*hash(i*4.7+seed)),geo=new THREE.ConeGeometry(.0045,l,3,1,true);
  const m=new THREE.Matrix4().compose(from.clone().addScaledVector(f,l/2),new THREE.Quaternion().setFromUnitVectors(Y,f),new THREE.Vector3(1,1,1));
  P.add(geo,matrix?new THREE.Matrix4().multiplyMatrices(matrix,m):m,(x,y)=>mix(C.hemp,C.fibre,y>0?.8:.2));
 }
}

// the torso coil's radius by height: narrow hips, full chest, drawing in to the neck
const TORSO=[[.41,.12],[.5,.15],[.6,.165],[.7,.168],[.78,.145],[.84,.09]];
function torsoR(y){
 if(y<=TORSO[0][0])return TORSO[0][1];
 for(let i=1;i<TORSO.length;i++){const [y1,r1]=TORSO[i],[y0,r0]=TORSO[i-1];if(y<=y1)return r0+(r1-r0)*(y-y0)/(y1-y0);}
 return TORSO[TORSO.length-1][1];
}
const SX=1.15,SZ=.85,COIL_R=.026;

function buildBody(){
 const P=collector();
 // a dark packed core behind the coils, so no gap shows through
 P.add(new THREE.LatheGeometry(TORSO.map(([y,r])=>new THREE.Vector2(r-.018,y)),20),at(0,0,0,[0,0,0],[SX,1,SZ]),C.core);
 // the coil: one rope wound from the hips up to the neck, each turn resting on the one below
 const pts=[],y0=.41,y1=.85,pitch=COIL_R*1.85,perTurn=26,turns=(y1-y0)/pitch;
 for(let i=0;i<=turns*perTurn;i++){const t=i/perTurn,y=y0+t*pitch,a=t*Math.PI*2,r=torsoR(y);pts.push(new THREE.Vector3(Math.sin(a)*r*SX,y,Math.cos(a)*r*SZ));}
 rope(P,new THREE.CatmullRomCurve3(pts),COIL_R,{seg:pts.length*2,radial:8,seed:3});
 // the coil's start at the hip: the end tucked under and whipped
 whipping(P,at(0,.41,torsoR(.41)*SZ,[Math.PI/2,0,0]),COIL_R+.004,0,2);
 // a sash of rope from the right shoulder across the chest to the left hip, lying on the coils
 const sash=[];
 for(let i=0;i<=8;i++){const t=i/8,y=.8-t*.33,x=-.15+t*.31,r=torsoR(y),z=SZ*r*Math.sqrt(Math.max(0,1-(x/(SX*r))**2))+.036;sash.push([x,y,z]);}
 rope(P,line(...sash),.022,{seed:5,shade:.92});
 // the belly knot: two loops locked through each other, with a frayed end hanging from it
 const knot=at(.04,.56,torsoR(.56)*SZ+.045);
 for(const [rx,ry] of [[0,.6],[0,-.6]]){const loop=new THREE.TorusGeometry(.034,.017,6,18);P.add(loop,new THREE.Matrix4().multiplyMatrices(knot,at(0,0,0,[rx,ry,0])),(x,y,z)=>mix(C.hemp,C.light,.5+.5*Math.sin(Math.atan2(y,x)*6)));}
 const end=line([.04,.54,torsoR(.56)*SZ+.06],[.07,.47,torsoR(.47)*SZ+.06],[.06,.39,.19],[.075,.32,.2]);
 rope(P,end,.016,{seed:7});
 whipping(P,at(.075,.32,.2),.019,.012,2);
 fray(P,null,new THREE.Vector3(.075,.31,.2),new THREE.Vector3(.1,-1,.1),{n:10,len:.06,seed:9});
 // the shoulder yoke: a straight rope through the top of the coil, whipped where it leaves it
 rope(P,line([-.3,.79,0],[0,.8,0],[.3,.79,0]),.034,{seed:11});
 for(const s of [-1,1])whipping(P,at(s*.19,.795,0,[0,0,Math.PI/2]),.038,0,3);
 // the neck: two tighter turns under the head
 const neck=[];for(let i=0;i<=40;i++){const t=i/20,a=t*Math.PI*2;neck.push(new THREE.Vector3(Math.sin(a)*.055,.84+t*.028,Math.cos(a)*.05));}
 rope(P,new THREE.CatmullRomCurve3(neck),.018,{seed:13});
 return P.merge();
}

// A monkey's-fist knot: three sets of parallel turns wrapped round a ball, each set at right angles
// to the others, with the working end flopping out of the crown.
function buildHead(){
 const P=collector(),c=new THREE.Vector3(0,.11,0);
 P.add(new THREE.SphereGeometry(.09,14,10),at(c.x,c.y,c.z),C.core);
 const sets=[[0,Math.PI/2,0],[Math.PI/2,0,0],[0,0,0]];
 sets.forEach((rot,k)=>{
  for(let i=-1;i<=1;i++){
   const off=i*.036,R=Math.sqrt(.108**2-off**2)+k*.004;
   const ring=new THREE.TorusGeometry(R,.019,7,30);ring.translate(0,0,off);
   const col=new Float32Array(ring.attributes.position.count*3),q=ring.attributes.position;
   for(let n=0;n<q.count;n++){const a=Math.atan2(q.getY(n),q.getX(n)),w=Math.cos(a*14+k*2+i*3);const cc=mix(mix(C.groove,C.hemp,.55+.45*w),C.light,.25*Math.max(0,w));for(let m=0;m<3;m++)col[n*3+m]=cc[m];}
   P.add(ring,at(c.x,c.y,c.z,rot),col);
  }
 });
 // the loose working end out of the crown, flopping over to one side, frayed at its tip
 const tail=line([0,.2,-.02],[.03,.27,-.03],[.09,.28,-.03],[.13,.23,-.02]);
 rope(P,tail,.017,{seed:21});
 whipping(P,at(.13,.225,-.02,[0,0,-.6]),.02,0,2);
 fray(P,null,new THREE.Vector3(.14,.21,-.02),new THREE.Vector3(.5,-1,0),{n:8,len:.05,seed:23});
 return P.merge();
}

function buildEyes(){
 const list=[];
 for(const s of [-1,1]){const g=new THREE.SphereGeometry(.022,10,8);g.scale(1,.75,.6);g.translate(s*.042,.125,.124);list.push(g);}
 const geo=mergeGeometries(list);list.forEach(g=>g.dispose());return geo;
}

// A leg hangs from the hip pivot: a thick laid rope, a little forward at the knee, whipped at
// knee and ankle, standing on a flat coil of rope 0.44 below.
function buildLeg(side){
 const P=collector();
 rope(P,line([0,.02,0],[0,-.19,.018],[0,-.39,.01]),.05,{seed:31+side});
 whipping(P,null,.053,-.19,3);whipping(P,null,.052,-.35,3);
 // the foot: a flat spiral of rope, drawn out toward the toe
 const pts=[],r=.016;
 for(let i=0;i<=70;i++){const t=i/70,a=-t*Math.PI*2*2.6*side,rad=.075-t*.06;pts.push(new THREE.Vector3(Math.sin(a)*rad,-.44+r,Math.cos(a)*rad*1.35+.035));}
 pts.push(new THREE.Vector3(0,-.4,.01));
 rope(P,new THREE.CatmullRomCurve3(pts),r,{radial:6,seed:33+side,shade:.95});
 return P.merge();
}

// An arm hangs from the shoulder pivot: laid rope whipped at elbow and wrist, then unlaid into
// three splayed strand fingers with frayed tips. The left hand trails a hangman's noose.
function buildArm(side){
 const P=collector();
 rope(P,line([0,.03,0],[0,-.18,-.01],[0,-.34,.01]),.038,{seed:41+side});
 whipping(P,null,.041,-.18,3);whipping(P,null,.04,-.33,3);
 for(let f=0;f<3;f++){
  const a=(f-1)*.55,sx=Math.sin(a)*side,cz=Math.cos(a);
  const c=line([0,-.345,.005],[sx*.03,-.39,.012+cz*.012],[sx*.05,-.44,.03+cz*.02],[sx*.05,-.48,.05+cz*.02]);
  rope(P,c,.014,{radial:6,seed:43+f+side,lay:1.3});
  fray(P,null,new THREE.Vector3(sx*.05,-.485,.052+cz*.02),new THREE.Vector3(0,-.4,1),{n:4,len:.03,spread:.3,seed:47+f+side});
 }
 if(side<0){
  // the noose: the rope hangs from the palm to a hangman's knot of wrapped turns, then the loop
  rope(P,line([0,-.37,0],[.012,-.43,.0],[.01,-.5,-.005]),.013,{radial:6,seed:51});
  for(let i=0;i<6;i++){const ring=new THREE.TorusGeometry(.021,.0075,5,12);ring.rotateX(Math.PI/2);ring.translate(.01,-.505-i*.013,-.005);P.add(ring,null,(x,y,z)=>mix(C.hemp,C.light,.5+.5*Math.sin(Math.atan2(z,x)*5+i)));}
  const loop=new THREE.TorusGeometry(.055,.012,6,24);
  P.add(loop,at(.01,-.64,-.005,[0,.5,0]),(x,y)=>mix(C.hemp,C.light,.5+.5*Math.sin(Math.atan2(y,x)*18)));
 }
 return P.merge();
}

let shared=null;
function geometry(){
 if(shared)return shared;
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide});
 const eye=new THREE.MeshStandardMaterial({color:0xffb040,emissive:0xff7a10,emissiveIntensity:4.5,roughness:.3});
 shared={material,eye,body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:{[-1]:buildLeg(-1),1:buildLeg(1)},arm:{[-1]:buildArm(-1),1:buildArm(1)}};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createRopeGolem(){
 const S=geometry();
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(0,.86,.01);body.add(head);
 mesh(head,S.head,S.material,'head');const core=mesh(head,S.eyes,S.eye,'eyes');core.castShadow=false;
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.085,.44,0);body.add(leg);mesh(leg,S.leg[s],S.material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.3,.79,0);arm.rotation.z=s*.12;body.add(arm);mesh(arm,S.arm[s],S.material,'arm');arms.push(arm);
 }
 g.userData.core=core;
 return {g,body,legs,tail:null,wings:[],quirk:'golem',core,arms,arm:arms[1],head};
}
