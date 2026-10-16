import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// Rust monsters and disenchanters used to share one low armadillo-bug built from spheres: stacked
// sphere plates, cone barbs, a little two-blade propeller. They now have their own models.
//
// The rust monster: a low, armoured insect under six overlapping plates of corroded, iron-brown
// chitin, flaking orange rust blooming along every seam and pitted with corrosion. Amber compound
// eyes, heavy hooked mandibles for gnawing metal, long feathery antennae that end in rust-orange
// paddles (the rust touch), four jointed legs on hooked feet, and a segmented tail ending in a
// twisted, corroded propeller vane.
//
// The disenchanter: bigger, under plates of dark iridescent indigo. Its seams leak violet light,
// the magic it has drained, and faint stolen runes glow on its back. Violet eyes, a slender feeding
// tube for a mouth, and feelers that end in glowing violet orbs.
//
// Each moving part is one merged vertex-coloured mesh on one material, plus glowing meshes for the
// eyes, the disenchanter's seams and runes, and its feeler orbs. Handles match the disintegrator's
// (disintegrator.js), so rust-feel.js drives them: body, legs, tail, feelers (pivoting at their roots
// on the head), feelHead, vane, rustFeel.

const KINDS={
 'rust monster':{scale:.88,shell:'#5e3218',shellHi:'#8a4a24',edge:'#c8642a',pit:'#1e0f06',hide:'#2e1a0e',belly:'#7a4a2a',
  eye:'#ffaa30',feeler:'#a0582a',tip:'#d8742e',glowSeams:false},
 disenchanter:{scale:1.3,shell:'#1a1e46',shellHi:'#3c3480',edge:'#7a68d8',pit:'#0a0a1e',hide:'#10122a',belly:'#2a2c5a',
  eye:'#c080ff',feeler:'#3a3a7a',tip:'#b070ff',glowSeams:true},
};
const Y=.3,VANE_Z=-.27;
const hash=(a,b=0)=>{const h=Math.sin(a*12.9898+b*78.233)*43758.5453;return h-Math.floor(h);};
const UP=new THREE.Vector3(0,1,0);
const along=(a,b,r0,r1,seg=8)=>{
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 const g=new THREE.CylinderGeometry(r1,r0,len,seg);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP,d.normalize()));
 return g.translate((A.x+B.x)/2,(A.y+B.y)/2,(A.z+B.z)/2);
};

function palette(k){const o=KINDS[k];return Object.fromEntries(Object.entries(o).filter(([,v])=>typeof v==='string').map(([key,v])=>[key,rgb(v)]));}

// The six carapace plates: z from shoulders to rump, half-widths, heights.
const PLATES=Array.from({length:6},(_,i)=>({z:.2-i*.085,w:.19-Math.abs(i-2)*.018,h:.07-Math.abs(i-2)*.006}));

function buildBody(k){
 const C=palette(k),o=KINDS[k],P=pieces(),G=pieces();
 // underbody and belly
 P.add(new THREE.SphereGeometry(.2,18,12),at(0,Y,-.01,[0,0,0],[.82,.52,1.4]),C.hide);
 P.add(new THREE.SphereGeometry(.15,16,10),at(0,Y-.07,.02,[0,0,0],[.8,.4,1.25]),C.belly);
 for(const [i,p] of PLATES.entries()){
  // an arched plate: the top cap of a squashed sphere, tilted so each overlaps the one behind
  const cap=new THREE.SphereGeometry(p.w,22,8,0,Math.PI*2,0,Math.PI*.5);
  const paint=(x,y,z)=>{
   const r=Math.hypot(x,z-p.z)/p.w,n=hash(Math.round(x*70)+i*13,Math.round(z*70));
   if(k==='rust monster'){
    if(n>.86)return C.pit;                                         // corrosion pits
    const flake=r>.82?.75:hash(Math.round(x*30),Math.round(z*30)+i)*.35; // rust blooming at the rim
    return mix(mix(C.shell,C.shellHi,(y-Y)*6),C.edge,flake);
   }
   // iridescent indigo: the sheen shifts with the angle round the plate
   const a=Math.atan2(z-p.z,x);return mix(mix(C.shell,C.shellHi,.5+.5*Math.sin(a*3+i)),C.edge,r>.86?.6:0);
  };
  P.add(cap,at(0,Y+.04+p.h*.2,p.z,[-.28,0,0],[1,p.h/p.w*1.9,.42]),paint);
  // the plate's trailing rim: a raised ridge, rust-crusted, or a violet seam leaking light
  const rim=new THREE.TorusGeometry(p.w*.98,.008,5,26,Math.PI);
  const m=at(0,Y+.035+p.h*.2,p.z-.05,[-.28+Math.PI/2,0,0],[1,.9,1]);
  if(o.glowSeams)G.add(rim,m,[1,1,1]);else P.add(rim,m,(x,y,z)=>mix(C.edge,C.pit,hash(Math.round(x*90),i)*.4));
 }
 if(k==='rust monster'){
  // flakes of rust curling up off the plates' edges
  // the fourth plate is eaten clean through on one side: a dark hollow ringed by jagged, rust-lit teeth
  const hp=PLATES[3],hx=hp.w*.45,hy=Y+.04+hp.h*.2;
  P.add(new THREE.SphereGeometry(.03,10,6,0,Math.PI*2,0,Math.PI*.5),at(hx,hy+.012,hp.z,[0,0,0],[1,.35,1]),C.pit);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;P.add(new THREE.ConeGeometry(.007,.028,3),at(hx+Math.cos(a)*.032,hy+.022,hp.z+Math.sin(a)*.032,[Math.sin(a)*.7,0,-Math.cos(a)*.7]),C.edge);}
  for(let i=0;i<14;i++){const p=PLATES[i%6],a=(hash(i*3.1)-.5)*2.6;P.add(new THREE.BoxGeometry(.03,.004,.02),at(Math.sin(a)*p.w*.85,Y+.06+p.h*.3,p.z-.03+Math.cos(a)*.02,[hash(i)*.8,a,hash(i*2)*.6]),C.edge);}
 }else{
  // faint stolen runes glowing on the back plates
  for(let i=0;i<10;i++){const p=PLATES[1+i%4],x=(hash(i*5.7)-.5)*p.w*1.1;G.add(new THREE.BoxGeometry(.004,.003,.028),at(x,Y+.04+p.h*1.05,p.z+(hash(i*2.3)-.5)*.04,[0,(i%3-1)*.7,0]),[1,1,1]);}
 }
 return {body:P.merge(),glow:o.glowSeams?G.merge():null};
}

function buildHead(k){
 const C=palette(k),P=pieces(),G=pieces();
 P.add(new THREE.SphereGeometry(.1,16,12),at(0,0,0,[0,0,0],[1.05,.75,1.1]),(x,y,z)=>mix(C.shell,C.shellHi,y*5+.5));
 P.add(new THREE.SphereGeometry(.07,12,8),at(0,-.035,.06,[0,0,0],[.9,.5,1]),C.belly);
 // compound eyes: clusters of small glowing facets either side
 for(const s of [-1,1])for(let i=0;i<5;i++)G.add(new THREE.SphereGeometry(.012,8,6),at(s*(.06+(i%2)*.012),.03+Math.floor(i/2)*.012,.06+(i%3)*.008),[1,1,1]);
 if(k==='rust monster'){
  // heavy hooked mandibles, gnawing, with a chewed iron burr caught in them
  // the left one was snapped off short on something too hard: a blunt stump with a bright break
  for(const s of [-1,1]){
   if(s<0){P.add(along([s*.04,-.04,.08],[s*.048,-.05,.115],.018,.015),null,C.pit);P.add(new THREE.ConeGeometry(.012,.02,4),at(s*.048,-.052,.125,[Math.PI/2,0,0]),C.edge);continue;}
   P.add(along([s*.04,-.04,.08],[s*.055,-.06,.15],.018,.012),null,C.pit);P.add(new THREE.ConeGeometry(.012,.05,5),at(s*.035,-.065,.17,[Math.PI/2+.3,0,-s*.9]),C.pit);
  }
  P.add(new THREE.CylinderGeometry(.006,.008,.05,6),at(0,-.065,.15,[0,0,Math.PI/2.3]),rgb('#4a4a4e'));
 }else{
  // a slender feeding tube for a mouth, its tip glowing with what it last drank
  P.add(along([0,-.04,.08],[0,-.075,.19],.014,.007),null,C.pit);
  G.add(new THREE.SphereGeometry(.008,8,6),at(0,-.077,.195),[1,1,1]);
 }
 return {head:P.merge(),glow:G.merge()};
}

function buildFeeler(k,s){
 const C=palette(k),P=pieces(),G=pieces();
 const pts=[[0,0,0],[s*.06,.15,.05],[s*.13,.25,.13],[s*.18,.27,.23]].map(p=>new THREE.Vector3(...p)),curve=new THREE.CatmullRomCurve3(pts);
 P.add(new THREE.TubeGeometry(curve,20,.009,6,false),null,C.feeler);
 // feathery bristles down its length
 for(let i=2;i<18;i++){const p=curve.getPoint(i/18),t=curve.getTangent(i/18);for(const side of [-1,1]){const d=new THREE.Vector3(side,0,0).cross(t).normalize().multiplyScalar(.5).add(new THREE.Vector3(side*.5,-.2,0)).normalize();P.add(new THREE.ConeGeometry(.004,.045,3),new THREE.Matrix4().compose(p.clone().addScaledVector(d,.02),new THREE.Quaternion().setFromUnitVectors(UP,d),new THREE.Vector3(1,1,1)),C.feeler);}}
 const tip=curve.getPoint(1);
 if(k==='rust monster')P.add(new THREE.SphereGeometry(.03,10,6),at(tip.x,tip.y,tip.z,[0,0,s*.4],[1,.3,1.4]),C.tip); // a flat rust-orange paddle
 else if(s<0){                                                                                                // the left orb burst: a dark cracked husk, a few shards, no light
  P.add(new THREE.SphereGeometry(.02,6,4,0,Math.PI*2,0,Math.PI*.55),at(tip.x,tip.y-.004,tip.z,[Math.PI,0,0],[1,.8,1]),C.pit);
  for(let i=0;i<3;i++)P.add(new THREE.ConeGeometry(.005,.026,3),at(tip.x+(i-1)*.012,tip.y+.01,tip.z+(i%2)*.008,[(i-1)*.5,0,(1-i)*.6]),C.tip);
 }
 else G.add(new THREE.SphereGeometry(.024,12,8),at(tip.x,tip.y,tip.z),[1,1,1]);                               // a glowing violet orb
 return {feeler:P.merge(),glow:k==='disenchanter'&&s>0?G.merge():null};
}

function buildLeg(k,s){
 const C=palette(k),P=pieces();
 // jointed: up and out to a knee, down to a hooked foot
 const hip=[0,0,0],knee=[s*.08,.03,0],foot=[s*.11,-.24,.02];
 P.add(new THREE.SphereGeometry(.03,10,8),at(...hip),C.hide);
 P.add(along(hip,knee,.028,.022),null,C.shell);
 P.add(new THREE.SphereGeometry(.022,8,6),at(...knee),C.shellHi);
 P.add(along(knee,foot,.02,.012),null,C.shell);
 P.add(new THREE.ConeGeometry(.012,.05,5),at(foot[0]+s*.01,foot[1]-.01,foot[2]+.03,[Math.PI/2+.6,0,0]),C.pit);
 return P.merge();
}

function buildTail(k){
 const C=palette(k),P=pieces();
 for(let i=0;i<4;i++){const r=.045-i*.008;P.add(new THREE.CylinderGeometry(r*.85,r,.06,10),at(0,0,-.03-i*.055,[Math.PI/2,0,0]),i%2?C.shell:C.shellHi);}
 return P.merge();
}

function buildVane(k){
 const C=palette(k),P=pieces();
 P.add(new THREE.SphereGeometry(.028,10,8),at(0,0,0),C.shellHi);
 for(const a of [0,Math.PI]){
  // a twisted blade, ragged along its trailing edge
  const blade=new THREE.BoxGeometry(.17,.012,.06,10,1,2),bp=blade.attributes.position,v=new THREE.Vector3();
  for(let i=0;i<bp.count;i++){v.fromBufferAttribute(bp,i);const t=(v.x+.085)/.17,tw=(t-.5)*.9;const y=v.y*Math.cos(tw)-v.z*Math.sin(tw),z=v.y*Math.sin(tw)+v.z*Math.cos(tw);bp.setXYZ(i,v.x,y,z-(v.z<0&&hash(Math.round(v.x*80))>.6?.012:0));}
  blade.computeVertexNormals();
  P.add(blade,at(Math.cos(a)*.1,Math.sin(a)*.1,0,[0,0,a]),(x,y,z)=>mix(C.shell,k==='rust monster'?C.edge:C.shellHi,hash(Math.round(x*40),Math.round(y*40))*.6));
 }
 return P.merge();
}

const shared={};
function geometry(k){
 if(shared[k])return shared[k];
 const o=KINDS[k];
 shared[k]={body:buildBody(k),head:buildHead(k),feelers:[buildFeeler(k,-1),buildFeeler(k,1)],legs:[buildLeg(k,-1),buildLeg(k,1)],tail:buildTail(k),vane:buildVane(k),
  material:new THREE.MeshStandardMaterial({vertexColors:true,roughness:k==='rust monster'?.75:.32,metalness:k==='rust monster'?.35:.55,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:o.eye,emissive:o.eye,emissiveIntensity:2.2,roughness:.3}),
  seamGlow:new THREE.MeshStandardMaterial({color:o.tip,emissive:o.tip,emissiveIntensity:2.4,roughness:.3})};
 return shared[k];
}
function mesh(parent,geo,material,name){if(!geo)return null;const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export const RUST_KINDS=Object.keys(KINDS);
export function createRustMonster(kind='rust monster'){
 const k=KINDS[kind]?kind:'rust monster',S=geometry(k),g=new THREE.Group(),body=new THREE.Group();g.name=k;g.add(body);g.scale.setScalar(KINDS[k].scale);body.position.y=.028; // the hooked feet rest on the floor
 mesh(body,S.body.body,S.material,'body');
 const seams=mesh(body,S.body.glow,S.seamGlow,'seams');if(seams)seams.castShadow=false;
 const head=new THREE.Group();head.position.set(0,Y-.02,.27);body.add(head);
 mesh(head,S.head.head,S.material,'head');
 mesh(head,S.head.glow,S.glow,'eyes').castShadow=false;
 const feelers=[-1,1].map((s,i)=>{const f=new THREE.Group();f.position.set(s*.035,.06,.04);head.add(f);mesh(f,S.feelers[i].feeler,S.material,'feeler');const orb=mesh(f,S.feelers[i].glow,S.seamGlow,'orb');if(orb)orb.castShadow=false;return f;});
 const legs=[];
 for(const [i,s] of [-1,1].entries())for(const z of [-.13,.14]){const leg=new THREE.Group();leg.position.set(s*.14,Y-.06,z);body.add(leg);mesh(leg,S.legs[i],S.material,'leg');legs.push(leg);}
 const tail=new THREE.Group();tail.position.set(0,Y,-.29);body.add(tail);mesh(tail,S.tail,S.material,'tail');
 const vane=new THREE.Group();vane.position.set(0,0,VANE_Z);tail.add(vane);mesh(vane,S.vane,S.material,'vane');
 // its plates are pitted by its own corrosion (painted into the carapace), as creatures.test.js expects
 if(k==='rust monster')g.userData.rustEaten=true;
 return {g,body,legs,tail,wings:[],quirk:'lizard',kind:k,head,feelers,vane,feelHead:head,rustFeel:k};
}
