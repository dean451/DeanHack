import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The Candelabrum of Invocation standing on the floor: a stepped, domed gold foot with a
// beaded rim, a turned stem with knops, and three pairs of arms curving up in nested half
// circles so all seven cups meet at one height. Tarnish is baked into vertex colours:
// darker low down and in the turned grooves, bright on the rims. Up to seven candles stand
// in the cups, each burnt to its own height with wax runs down the side and a black wick,
// and a lit candelabrum gets a flame over each candle. The gold, the wax and the flames
// are one merged mesh each (1–3 draws), resting on y=0.
const TOP=.3,STEP=.075,TUBE=.011,TURN=.35;
const hash=(a,b)=>{const s=Math.sin(a*127.1+b*311.7)*43758.5453;return s-Math.floor(s);};

// Reads the candle count and lit state from the game's name, e.g.
// "Candelabrum of Invocation (7 candles, lit)" or "... (no candles attached)".
// Without a count (a bare name) it shows all seven, as before.
export function candelabrumState(name=''){
 const m=/\((no|\d+) candles?\b/.exec(name);
 const candles=m?(m[1]==='no'?0:Math.min(7,Number(m[1]))):7;
 return {candles,lit:candles>0&&/,\s*lit\)/.test(name)};
}

// Keeps just position/normal/colour, non-indexed, with one flat colour or a per-vertex one.
function paint(geo,colour){
 const n=geo.index?geo.toNonIndexed():geo;if(n!==geo)geo.dispose();
 for(const k of Object.keys(n.attributes))if(!['position','normal'].includes(k))n.deleteAttribute(k);
 if(!n.attributes.normal)n.computeVertexNormals();
 const p=n.attributes.position,col=new Float32Array(p.count*3),c=new THREE.Color();
 for(let i=0;i<p.count;i++){
  if(typeof colour==='function')colour(c,p.getX(i),p.getY(i),p.getZ(i));else c.copy(colour);
  col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;
 }
 n.setAttribute('color',new THREE.BufferAttribute(col,3));
 return n;
}
const lathe=(pts,seg)=>new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),seg);

export function createCandelabrum({candles=7,lit=false}={}){
 const g=new THREE.Group();g.name='Candelabrum';
 const bright=new THREE.Color(0xf4d27a),gold=new THREE.Color(0xc99a3c),tarnish=new THREE.Color(0x5e4620);
 // Low parts and turned grooves darken; the colour is picked per vertex from its height.
 const grooves=[.012,.05,.092,.19,.262];
 const gilt=(c,x,y,z)=>{
  c.copy(gold).lerp(bright,Math.min(1,y/TOP)*.55);
  const g0=grooves.reduce((a,gy)=>Math.max(a,Math.exp(-(((y-gy)/.004)**2))),0);
  c.lerp(tarnish,Math.max(g0*.7,(1-Math.min(1,y/.05))*.35,hash(Math.round(x*300),Math.round(z*300)+y*40)*.12));
 };
 const metal=[];

 // Foot and stem, turned as one profile: stepped foot, dome, knops and a collar at the top.
 metal.push(paint(lathe([[0,0],[.15,0],[.152,.008],[.146,.014],[.13,.016],[.128,.026],[.11,.03],
  [.085,.045],[.055,.055],[.032,.06],[.024,.07],[.036,.082],[.038,.092],[.03,.1],[.019,.11],[.017,.18],
  [.028,.188],[.031,.195],[.024,.203],[.016,.21],[.015,.255],[.022,.262],[.026,.272],[.02,TOP-.004],[0,TOP-.004]],40),gilt));
 // A beaded rim round the foot.
 for(let i=0;i<30;i++){const a=i/30*Math.PI*2,b=new THREE.SphereGeometry(.0085,6,4);b.translate(Math.cos(a)*.14,.021,Math.sin(a)*.14);metal.push(paint(b,gilt));}

 // Three pairs of arms: each a half circle below the cup line, so the tips meet at TOP.
 for(let k=1;k<=3;k++){
  const r=k*STEP,pts=[];
  for(let i=0;i<=24;i++){const a=i/24*Math.PI;pts.push(new THREE.Vector3(Math.cos(a)*r,TOP-Math.sin(a)*r*.82,0));}
  metal.push(paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),40,TUBE*(1.15-k*.08),8,false),gilt));
  // A small knop at each arm's lowest point, where it passes the stem.
  const kn=new THREE.SphereGeometry(TUBE*1.9,10,6);kn.scale(1,.7,1);kn.translate(0,TOP-r*.82,0);metal.push(paint(kn,gilt));
 }

 // A drip-cup and socket on each of the seven tips.
 const cup=[[0,-.012],[.008,-.012],[.012,-.004],[.03,.004],[.033,.008],[.022,.009],[.019,.01],[.019,.028],[.022,.03],[.02,.033],[.015,.033],[.015,.012],[0,.012]];
 const tips=[];
 for(let i=0;i<7;i++){
  const x=(i-3)*STEP;tips.push(x);
  const c=lathe(cup,20);c.translate(x,TOP,0);metal.push(paint(c,gilt));
 }

 // Candles stand in the middle cups first, then outwards in pairs.
 const order=[3,2,4,1,5,0,6].slice(0,Math.max(0,Math.min(7,candles|0)));
 const wax=[],flames=[],ivory=new THREE.Color(0xf1e8d2),shade=new THREE.Color(0xcfc2a0),wick=new THREE.Color(0x1d1813);
 for(const i of order){
  const x=tips[i],base=TOP+.012,h=.08+hash(i,7)*.07,r=.0145;
  // The shaft, with a melted rim and a shallow bowl on top.
  const body=lathe([[0,0],[r,0],[r,h-.006],[r*1.06,h-.002],[r*.95,h],[r*.6,h-.004],[0,h-.006]],16);
  body.translate(x,base,0);
  wax.push(paint(body,(c,px,py,pz)=>c.copy(ivory).lerp(shade,.35*(1-(py-base)/h)+.2*hash(Math.round(Math.atan2(pz,px-x)*3),i))));
  // Two or three runs of wax down the side, fattening where they stop.
  const runs=2+Math.floor(hash(i,3)*2);
  for(let j=0;j<runs;j++){
   const a=hash(i,j+11)*Math.PI*2,len=.025+hash(j,i+5)*(h*.6);
   const run=new THREE.CapsuleGeometry(.0045,len,3,6);run.translate(0,base+h-.004-len/2,0);
   run.translate(x+Math.cos(a)*(r+.001),0,Math.sin(a)*(r+.001));
   wax.push(paint(run,ivory));
   const blob=new THREE.SphereGeometry(.006,6,4);blob.scale(1,.8,1);blob.translate(x+Math.cos(a)*(r+.002),base+h-.006-len,Math.sin(a)*(r+.002));
   wax.push(paint(blob,ivory));
  }
  // A pooled spill in the cup around the foot of the candle.
  const pool=new THREE.CylinderGeometry(.021,.023,.004,14);pool.translate(x,base+.002,0);wax.push(paint(pool,shade));
  const w=new THREE.CylinderGeometry(.0018,.0022,.014,5);w.rotateZ((hash(i,2)-.5)*.5);w.translate(x,base+h-.001,0);wax.push(paint(w,wick));
  if(lit){
   // A teardrop: blue at the root, white-yellow core, orange at the tip.
   const f=lathe([[0,0],[.006,.004],[.0085,.012],[.007,.022],[.003,.033],[0,.04]],10);
   f.translate(x,base+h+.002,0);
   const y0=base+h+.002,blue=new THREE.Color(0x4b6cff),core=new THREE.Color(0xfff2b0),tip=new THREE.Color(0xff8a2a);
   flames.push(paint(f,(c,px,py)=>{const t=(py-y0)/.04;c.copy(t<.15?blue.clone().lerp(core,t/.15):core.clone().lerp(tip,(t-.15)/.85));}));
  }
 }

 const parts=[];
 const build=(list,material,part)=>{
  if(!list.length){material.dispose();return;}
  // Turned a little across the tile so the arms don't line up with the grid.
  const geo=mergeGeometries(list);list.forEach(p=>p.dispose());geo.rotateY(TURN);
  const mesh=new THREE.Mesh(geo,material);mesh.userData.part=part;
  mesh.castShadow=mesh.receiveShadow=part!=='flame';
  g.add(mesh);parts.push(mesh);
 };
 build(metal,new THREE.MeshStandardMaterial({vertexColors:true,metalness:.85,roughness:.34}),'gold');
 build(wax,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:0}),'wax');
 build(flames,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.9,depthWrite:false}),'flame');
 g.userData.dispose=()=>parts.forEach(m=>{m.geometry.dispose();m.material.dispose();});
 return g;
}
