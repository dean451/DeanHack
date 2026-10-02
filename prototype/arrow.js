import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Arrows and crossbow bolts. Each kind is keyed by the word it shares with its unidentified
// look, so a "runed arrow" is an elven arrow before and after it is known.
//  - arrow: a dark ash shaft, a crossed iron broadhead with raked barbs, three charcoal
//    flights with one dull blood-red cock feather, and sinew lashings.
//  - runed (elven): a slender pale grey shaft banded with faint green-blue runes, a long
//    narrow crossed leaf head honed bright, and long low white-grey flights.
//  - crude (orcish): a crooked, knotty shaft, a single jagged head of rusted iron with
//    uneven barbs, and torn black flights lashed on with lumpy sinew.
//  - silver: a near-black shaft, a crossed silver bodkin, white flights barred in black.
//  - bamboo (ya): long jointed bamboo, a willow-leaf head, hawk-barred flights and red
//    silk bindings.
//  - crossbow bolt: short and thick, a square iron quarrel head on a collar, and two stiff
//    wooden vanes.
// Held-weapon space (equipment.js): the hand at the origin, the point up +y. A stack ("12
// arrows") is a loose sheaf of three fanned in x, so laid on the floor (live.js lays weapons
// down with x -PI/2) they lie side by side. Wood, feather, sinew and silk are vertex colours
// on one material and the iron another: 2 draws. The iron stays metalness >= .75, so
// weapon-magic sheathes it.
export const ARROW_NAME=/\b(?:arrows?|ya|crossbow bolts?)\b/;

const KINDS={
 arrow:{butt:-.2,tip:.44,r:.0048,head:'broad',headLen:.075,headW:.021,crossed:true,iron:0x55534e,honed:0xbcc4c6,
  wood:0x3a2a1e,grain:0x24180f,feather:0x1b1b1d,featherTip:0x56575b,cock:0x5a1414,lash:0x8a7556,vanes:3,vaneLen:.1,vaneH:.021,nock:0x2a241e},
 elven:{butt:-.2,tip:.46,r:.0042,head:'leaf',headLen:.085,headW:.015,crossed:true,iron:0x9aa6ab,honed:0xe4eef0,
  wood:0xa8a690,grain:0x8a8a76,rune:0x4fa39a,feather:0xd8dad6,featherTip:0x8e9496,lash:0x6d7a72,vanes:3,vaneLen:.13,vaneH:.014,nock:0xd8d4c4},
 orcish:{butt:-.19,tip:.41,r:.0055,head:'jagged',headLen:.07,headW:.026,crossed:false,iron:0x47372b,honed:0x8a8478,rust:0x6b3a1e,
  wood:0x2a1d14,grain:0x4a3524,feather:0x111010,featherTip:0x2a2624,lash:0x6e5a3e,vanes:3,vaneLen:.085,vaneH:.023,ragged:true,crook:.009,nock:0x1e1a16},
 silver:{butt:-.2,tip:.44,r:.0046,head:'bodkin',headLen:.07,headW:.012,crossed:true,iron:0xc9cfd3,honed:0xf2f6f8,
  wood:0x231a14,grain:0x140f0b,feather:0xe8e6e0,featherTip:0xe8e6e0,bar:0x18181a,lash:0x3a3a3c,vanes:3,vaneLen:.1,vaneH:.02,nock:0x101012},
 ya:{butt:-.24,tip:.52,r:.0047,head:'willow',headLen:.095,headW:.017,crossed:false,iron:0x5e5f5c,honed:0xd8dee0,
  wood:0xb59b5a,grain:0x8a7036,node:0x5e4a22,feather:0x1c1a18,featherTip:0x1c1a18,bar:0xd8d2c4,lash:0x8a1a1a,vanes:3,vaneLen:.12,vaneH:.02,nock:0x1a1210},
 bolt:{butt:-.12,tip:.2,r:.0075,head:'quarrel',headLen:.055,headW:.014,crossed:false,iron:0x4c4a46,honed:0xa9b0b2,
  wood:0x2e2218,grain:0x1c140d,feather:0x5a4330,featherTip:0x3a2a1c,lash:0x7a6648,vanes:2,vaneLen:.06,vaneH:.016,stiff:true,nock:0x2e2218},
};

export function arrowKind(name=''){
 const n=name.toLowerCase();
 if(/crossbow bolt/.test(n))return 'bolt';
 if(/\bya\b|bamboo/.test(n))return 'ya';
 if(/elven|runed/.test(n))return 'elven';
 if(/orcish|crude/.test(n))return 'orcish';
 if(/silver/.test(n))return 'silver';
 return 'arrow';
}

const hash=i=>{const v=Math.sin(i*127.1+31.7)*43758.5453;return v-Math.floor(v);};
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};

// One arrow as [geometry, 'body'|'iron'] pairs, already vertex-coloured, in held space.
function arrowParts(K,seed){
 const out=[],c=new THREE.Color();
 const put=(geo,m,tone)=>{geo.deleteAttribute('uv');if(geo.index)geo=geo.toNonIndexed();
  const p=geo.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));out.push([geo,m]);};
 const {butt,tip,r,headLen,headW}=K,top=tip-headLen*.78,fl0=butt+.012,fl1=fl0+K.vaneLen;

 // The head. Honed bright toward the point and edges; the crude head is rusted.
 const ironTone=(x,y,z,col)=>{col.set(K.iron).lerp(new THREE.Color(K.honed),smooth(tip-headLen*.55,tip,y)*.8+smooth(headW*.45,headW,Math.hypot(x,z))*.35);
  if(K.rust)col.lerp(new THREE.Color(K.rust),.55*hash(Math.floor(y*900)+Math.floor(x*900)*7));};
 const blade=(s,depth,turn)=>{const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:6});geo.translate(0,0,-depth/2);geo.rotateY(turn);put(geo,'iron',ironTone);};
 const y0=tip-headLen;
 if(K.head==='quarrel'){
  // A square, four-faced pyramid on a short collar.
  put(new THREE.LatheGeometry([[0,y0],[r*1.05,y0],[r*1.25,y0+.012],[headW,y0+.02],[0,tip]].map(([a,b])=>new THREE.Vector2(a,b)),4),'iron',ironTone);
 }else{
  // The socket: a short tapered sleeve over the shaft's end.
  put(new THREE.CylinderGeometry(r*.95,r*1.15,headLen*.32,7).translate(0,y0+headLen*.16,0),'iron',ironTone);
  const s=new THREE.Shape(),b=y0+headLen*.22;
  if(K.head==='broad'){
   // Straight edges to a point, with barbs raked back past the socket.
   s.moveTo(0,tip);s.lineTo(headW,b+headLen*.08);s.lineTo(headW*.9,b-headLen*.12);s.lineTo(r*1.1,b+headLen*.06);
   s.lineTo(-r*1.1,b+headLen*.06);s.lineTo(-headW*.9,b-headLen*.12);s.lineTo(-headW,b+headLen*.08);s.closePath();
  }else if(K.head==='leaf'||K.head==='willow'){
   // A long narrow leaf; the willow leaf is longer and slimmer still.
   const w=headW,mid=K.head==='leaf'?.45:.35;
   s.moveTo(0,tip);s.quadraticCurveTo(w*1.1,b+(tip-b)*mid,r*1.05,b);s.lineTo(-r*1.05,b);s.quadraticCurveTo(-w*1.1,b+(tip-b)*mid,0,tip);
  }else if(K.head==='bodkin'){
   // A thin needle that swells a little behind the point.
   s.moveTo(0,tip);s.lineTo(headW,tip-headLen*.4);s.lineTo(r*1.05,b);s.lineTo(-r*1.05,b);s.lineTo(-headW,tip-headLen*.4);s.closePath();
  }else{
   // Jagged: hammered out unevenly, chipped along both edges, one barb longer than the other.
   s.moveTo(.002,tip);
   s.lineTo(headW*.55,tip-headLen*.3);s.lineTo(headW*.42,tip-headLen*.38);s.lineTo(headW*.82,tip-headLen*.6);
   s.lineTo(headW*1.05,b-headLen*.2);s.lineTo(r*1.1,b+headLen*.08);
   s.lineTo(-r*1.1,b+headLen*.08);s.lineTo(-headW*.75,b-headLen*.08);s.lineTo(-headW*.6,tip-headLen*.52);
   s.lineTo(-headW*.38,tip-headLen*.46);s.lineTo(-headW*.44,tip-headLen*.26);s.closePath();
  }
  const depth=K.head==='bodkin'?.0034:.0018;
  blade(s,depth,0);if(K.crossed)blade(s,depth,Math.PI/2);
 }

 // The shaft, with its grain, and its kind's marks: runes, bamboo nodes, knots.
 const shaft=new THREE.CylinderGeometry(r*.92,r,top-butt,8,24);shaft.translate(0,(top+butt)/2,0);
 put(shaft,'body',(x,y,z,col)=>{const a=Math.atan2(z,x);
  col.set(K.wood).lerp(new THREE.Color(K.grain),Math.max(0,Math.sin(a*2+y*70+seed))*.5);
  if(K.rune){const u=(y-fl1)/(top-fl1);// three thin bands of runes below the head
   for(const v of [.55,.68,.81])if(Math.abs(u-v)<.018)col.lerp(new THREE.Color(K.rune),.75*(Math.sin(a*5+v*40)>-.2?1:.3));}
  if(K.node){const seg=.085,d=((y-butt)%seg+seg)%seg;col.lerp(new THREE.Color(K.node),1-smooth(0,.006,Math.min(d,seg-d)));}
  if(K.crook){const k=hash(Math.floor((y-butt)*28)+seed);if(k>.85)col.lerp(new THREE.Color(0x120c08),.6);}});
 if(K.node){// The bamboo's joints stand proud of the cane.
  for(let y=butt+.085;y<top-.01;y+=.085)put(new THREE.TorusGeometry(r*1.02,r*.22,4,10).rotateX(Math.PI/2).translate(0,y,0),'body',(x,yy,z,col)=>col.set(K.node));}
 // The nock at the butt.
 put(new THREE.CylinderGeometry(r*1.1,r*.85,.012,6).translate(0,butt-.004,0),'body',(x,y,z,col)=>col.set(K.nock));

 // Lashings below the head and over the flights' ends.
 const lash=(ya,n,i0)=>{for(let i=0;i<n;i++){const lump=K.ragged?1+.35*hash(i0+i):1;
  const t=new THREE.TorusGeometry(r+.0011*lump,.0011*lump,3,9);t.rotateX(Math.PI/2+.16);t.translate(0,ya+i*.0033,0);
  put(t,'body',(x,y,z,col)=>col.set(K.lash).multiplyScalar(.8+.3*hash(i0+i)));}};
 if(K.head!=='quarrel')lash(y0-.009,3,seed);
 lash(fl0-.008,2,seed+20);lash(fl1-.002,2,seed+40);

 // The flights: thin vanes in their own (radial, y) planes, swept back.
 for(let k=0;k<K.vanes;k++){
  const s=new THREE.Shape(),h=K.vaneH,L=K.vaneLen;
  s.moveTo(r*.6,fl1);
  if(K.stiff){s.lineTo(h*.8,fl1-L*.25);s.lineTo(h,fl0+L*.05);s.lineTo(r*.6,fl0);}
  else{
   s.quadraticCurveTo(h*.6,fl1-L*.06,h,fl1-L*.38);// the leading edge sweeps out
   s.lineTo(h*1.04,fl0+L*.1);
   if(K.ragged){// torn back toward the shaft in notches
    for(const [f,dy] of [[.8,.03],[.62,.008],[.46,.026],[.3,.004]])s.lineTo(h*f*(1+.15*(hash(seed+k*7+f*10)-.5)),fl0+L*dy);
   }else s.quadraticCurveTo(h*.7,fl0-L*.02,r*.6,fl0+L*.04);
  }
  s.closePath();
  const vane=new THREE.ExtrudeGeometry(s,{depth:K.stiff?.0014:.0007,bevelEnabled:false,curveSegments:5});
  vane.translate(0,0,-.00035);vane.rotateY(k*Math.PI*2/K.vanes+Math.PI/6);
  const cock=K.cock&&k===0;
  put(vane,'body',(x,y,z,col)=>{const rr=Math.hypot(x,z),u=(y-fl0)/L;
   col.set(cock?K.cock:K.feather).lerp(new THREE.Color(K.featherTip),smooth(h*.4,h,rr)*.7);
   if(K.bar&&Math.sin(u*Math.PI*7)>.45)col.lerp(new THREE.Color(K.bar),.85);
   col.lerp(new THREE.Color(K.lash),.5*(1-smooth(r,r+.002,rr)));});// the quill
 }

 // The crooked shaft bows the whole arrow a little, head and flights with it.
 if(K.crook)for(const [geo] of out){const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const u=(p.getY(i)-butt)/(tip-butt);p.setX(i,p.getX(i)+K.crook*(Math.sin(u*Math.PI)+.35*Math.sin(u*Math.PI*3+1)));}}
 for(const [geo] of out)geo.computeVertexNormals();
 return out;
}

export function buildArrow(g,name=''){
 const kind=arrowKind(name),K=KINDS[kind];
 const body=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.82,side:THREE.DoubleSide});
 const iron=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:kind==='silver'?.92:.8,roughness:kind==='silver'?.22:kind==='orcish'?.62:.36});
 g.userData.extraMaterial=[body,iron];
 // A stack is a loose sheaf: three arrows fanned a little, one lying across the others.
 const n=name.toLowerCase(),count=Number(/^\s*(\d+)\s/.exec(n)?.[1]??(/\b(?:arrows|bolts)\b/.test(n)?2:1));
 // [x, y, turn]: side by side, ends staggered, the crossing arrow raised a little off the others.
 const layout=count>1?[[0,0,0],[.026,-.03,-.07],[-.024,.025,.08]]:[[0,0,0]];
 const sets={body:[],iron:[]};
 layout.forEach(([dx,dy,turn],i)=>{for(const [geo,m] of arrowParts(K,i*13+3)){
  geo.rotateZ(turn);geo.translate(dx,dy,i*.0045);sets[m].push(geo);}});
 for(const [key,m] of [['body',body],['iron',iron]]){const merged=mergeGeometries(sets[key]);sets[key].forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=key==='iron'?'head':'shaft';g.add(mesh);}
 g.userData.arrow={kind,count:layout.length};
}
