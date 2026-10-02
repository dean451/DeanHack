import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The dart: a mean little throwing dart. A square-sectioned iron needle, honed bright at the
// point, with four barbs raked back from it, and a gummy black-green poison smeared over the barbs.
// An iron weight collar seats the head on a slim shaft of blackened wood, lashed with sinew at
// both ends. Three ragged crow-black flights at the tail have torn, notched trailing edges
// and a dull blood-red sheen toward their tips. A small horn nock caps the butt.
// Held-weapon space (equipment.js): the hand at the origin, the point up +y. The flights fan
// out in x and z, so laid on the floor (live.js lays weapons down with x -PI/2) they stand
// low over it. Wood, sinew, feather and horn are vertex colours on one material, and the iron
// is the other: 2 draws. The iron stays metalness >= .75, so weapon-magic sheathes it.
export const DART_TIP=.205;
const BUTT=-.072,SHAFT_TOP=.128,SHAFT_R=.0042;
const WOOD=0x24160f,GRAIN=0x3d281b,SINEW=0x8f7a5c,FEATHER=0x0c0b0d,SHEEN=0x4a0f12,QUILL=0x9c9282,HORN=0x2b2620;
const IRON=0x4c4a46,HONED=0xc3cbcd,POISON=0x16200f;

export function buildDart(g){
 const body=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.82});
 const iron=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.8,roughness:.38});
 g.userData.extraMaterial=[body,iron];
 const sets=new Map([[body,[]],[iron,[]]]),c=new THREE.Color();
 const put=(geo,m,tone)=>{geo.deleteAttribute('uv');if(geo.index)geo=geo.toNonIndexed();
  const p=geo.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));sets.get(m).push(geo);};
 const hash=i=>{const v=Math.sin(i*127.1+31.7)*43758.5453;return v-Math.floor(v);};
 const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};

 // The iron: honed bright toward the point, poison gummed over the barbs.
 const ironTone=(x,y,z,col)=>{col.set(IRON).lerp(new THREE.Color(HONED),smooth(.16,.2,y)*.85);
  col.lerp(new THREE.Color(POISON),smooth(.135,.148,y)*(1-smooth(.168,.18,y))*.85);};
 // The needle: a four-sided lathe, so its faces catch the light as flats.
 const needle=new THREE.LatheGeometry([[0,.112],[.0055,.114],[.0068,.124],[.0068,.136],[.0052,.14],[.0062,.152],[.0036,.172],[0,DART_TIP]].map(([r,y])=>new THREE.Vector2(r,y)),4);
 put(needle,iron,ironTone);
 // Four barbs raked back from the needle's edges, one pair a little lower than the other.
 for(let k=0;k<4;k++){
  const drop=(k%2)*.007,s=new THREE.Shape();
  s.moveTo(.003,.164-drop);s.lineTo(.0175,.141-drop);s.lineTo(.0105,.147-drop);s.lineTo(.004,.152-drop);s.closePath();
  const barb=new THREE.ExtrudeGeometry(s,{depth:.0016,bevelEnabled:false});
  barb.translate(0,0,-.0008);barb.rotateY(k*Math.PI/2);put(barb,iron,ironTone);
 }
 // The weight collar, ridged, where the head is seated on the shaft.
 for(const [y,r] of [[.106,.0062],[.118,.0074]]){const ring=new THREE.TorusGeometry(r,.0018,4,10);ring.rotateX(Math.PI/2);ring.translate(0,y,0);put(ring,iron,ironTone);}

 // The shaft: blackened wood with a faint twisting grain.
 const shaft=new THREE.CylinderGeometry(SHAFT_R*.9,SHAFT_R,SHAFT_TOP-BUTT,7,6);shaft.translate(0,(SHAFT_TOP+BUTT)/2,0);
 put(shaft,body,(x,y,z,col)=>{const a=Math.atan2(z,x);col.set(WOOD).lerp(new THREE.Color(GRAIN),Math.max(0,Math.sin(a*3+y*90))*.55);});
 // Sinew lashings below the head and over the flights' roots.
 const lash=(y0,n)=>{for(let i=0;i<n;i++){const t=new THREE.TorusGeometry(SHAFT_R+.0012,.0011,3,9);t.rotateX(Math.PI/2+.18);t.translate(0,y0+i*.0034,0);
  put(t,body,(x,y,z,col)=>col.set(SINEW).multiplyScalar(.8+.3*hash(i+y0*100)));}};
 lash(.09,4);lash(-.004,3);lash(-.066,2);
 // The horn nock at the butt, split for a string it never needs.
 const nock=new THREE.CylinderGeometry(SHAFT_R*1.15,SHAFT_R*.7,.012,6);nock.translate(0,BUTT-.004,0);
 put(nock,body,(x,y,z,col)=>col.set(HORN));

 // Three ragged flights. Each is a thin vane in its own (radial, y) plane: the quill along the
 // shaft, the outer edge swept back, and the trailing edge torn into notches.
 for(let k=0;k<3;k++){
  const s=new THREE.Shape(),y0=-.064,y1=-.006,out=.021;
  s.moveTo(SHAFT_R*.6,y1);
  s.quadraticCurveTo(out*.55,y1-.004,out,y0+.026);// the leading edge sweeps out and back
  s.lineTo(out*1.06,y0+.004);// the long tip, trailing behind
  // the torn trailing edge, notched back in toward the shaft
  const tears=[[.78,.014],[.66,.002],[.5,.013],[.36,-.002],[.2,.009]];
  for(const [f,dy] of tears)s.lineTo(out*f*(1+.08*(hash(k*7+f*10)-.5)),y0+dy+.004*hash(k*3+f*20));
  s.lineTo(SHAFT_R*.6,y0+.006);s.closePath();
  const vane=new THREE.ExtrudeGeometry(s,{depth:.0007,bevelEnabled:false,curveSegments:5});
  vane.translate(0,0,-.00035);vane.rotateY(k*Math.PI*2/3+Math.PI/6);
  put(vane,body,(x,y,z,col)=>{const r=Math.hypot(x,z);
   col.set(FEATHER).lerp(new THREE.Color(SHEEN),smooth(.008,.02,r)*.6);
   col.lerp(new THREE.Color(QUILL),1-smooth(SHAFT_R,SHAFT_R+.0018,r));});
 }

 for(const [m,list] of sets){const merged=mergeGeometries(list);list.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=m===iron?'head':'shaft';g.add(mesh);}
}
