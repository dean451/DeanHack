import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {lattice,sweep,bevelBox,hash,smooth} from './mattock.js';

// The pick-axe as a wielded tool: a miner's pick, lighter and plainer than the dwarvish mattock.
// A straight hickory haft, pale and greasy, swelling at the butt to stop the hand sliding off and
// wrapped there in a spiral of worn leather between two rawhide bindings. Iron langets riveted up
// the haft hold a forged head: a rounded eye with the haft's end showing through it, split by an
// iron wedge. Out of the eye one arm runs to a long square pick, the other to a narrow chisel, and
// both curve gently down toward the hand. The iron is dark forge scale in the middle and worn bright
// at the working ends, with a few scratches and a fleck of rust.
// UnNetHack's crystal pick keeps the haft and fittings but cuts the head from pale blue glass,
// faceted, clearing toward its points; its fittings are silvered.
// Held-weapon space (equipment.js): the hand at the origin, the haft up +y, the chisel toward +x
// and the pick toward -x, so the head stands in the x-y plane and stays within .05 of it in z:
// laid on the floor (live.js lays weapons down with x -PI/2) it rests flat.
// Iron and wood-and-leather are one draw each, so 2 draws; a crystal pick's glass head is a third.
// The iron stays metalness >= .75, so weapon-magic sheathes it.
export const PICK_AXE_NAME=/\b(pick-axe|pickaxe|crystal pick)\b/;
export const PICK_AXE_HEAD_Y=.6;
const BUTT_Y=-.2,R=.021,EYE_H=.07,
 IRON=0x50585b,SILVER=0xb8c0c4,POLISH=0xd2d9db,SCALE=0x24221f,RUST=0x6b3d24,
 HICKORY=0x8a6340,HICKORY_DARK=0x5e3f25,LEATHER=0x4a2c1e,HIDE=0x2a180f,END_GRAIN=0xa47a51,
 GLASS=0x8fc6e6,GLASS_LIGHT=0xeef8ff,GLASS_DARK=0x5e93b8;

export function buildPickAxe(g,name=''){
 const crystal=/crystal pick/.test(name);
 const iron=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.78,roughness:crystal?.32:.46});
 const wood=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.85});
 const glass=crystal?new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,flatShading:true,metalness:.05,roughness:.08,
  transparent:true,opacity:.86,emissive:0x2a5a78,emissiveIntensity:.45}):null;
 g.userData.extraMaterial=[iron,wood,glass].filter(Boolean);
 const sets=new Map([[iron,[]],[wood,[]]]);if(glass)sets.set(glass,[]);
 const c=new THREE.Color();
 const put=(geo,m,tone,flat=true)=>{if(geo.attributes.uv)geo.deleteAttribute('uv');
  if(flat){if(geo.index)geo=geo.toNonIndexed();geo.deleteAttribute('normal');geo.computeVertexNormals();}
  else{geo.computeVertexNormals();if(geo.index)geo=geo.toNonIndexed();}
  const p=geo.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));sets.get(m).push(geo);};
 // Forged iron (or, on a crystal pick, silvered fittings): scaled in the middle, a fleck of rust.
 const ironTone=(x,y,z,col)=>{const h=hash(Math.floor(x*380)*7+Math.floor(y*380)*3+Math.floor(z*380)*13);
  col.set(crystal?SILVER:IRON).multiplyScalar(.82+.3*h);
  if(!crystal){if(h>.88)col.lerp(new THREE.Color(SCALE),.6);else if(h<.05)col.lerp(new THREE.Color(RUST),.55);}};
 // The head's tone: iron worn bright toward the points, or cut glass clearing toward them.
 const headTone=(x,y,z,col)=>{const edge=smooth(.07,.26,Math.abs(x));
  if(crystal){const f=hash(Math.floor(x*60)*5+Math.round(y*90)+(z>0?7:0));
   col.set(GLASS).lerp(new THREE.Color(f>.5?GLASS_LIGHT:GLASS_DARK),Math.abs(f-.5)*1.2).lerp(new THREE.Color(GLASS_LIGHT),edge*.7);return;}
  ironTone(x,y,z,col);col.lerp(new THREE.Color(POLISH),edge*.85);};
 const headMat=crystal?glass:iron;

 // The haft: hickory up y, round, swelling at the butt and again into the eye, and darkest where
 // the hand has gripped it.
 {const N=40,stations=[],lo=BUTT_Y,hi=PICK_AXE_HEAD_Y+EYE_H/2+.006;
  for(let i=0;i<=N;i++){const u=i/N,y=lo+(hi-lo)*u,
   r=R*(1+.32*(1-smooth(0,.07,u))+.12*smooth(.82,.97,u))*(u<.012?.75:1),ring=[];
   for(let k=0;k<12;k++){const a=k/12*Math.PI*2;ring.push([Math.cos(a)*r,y,Math.sin(a)*r]);}
   stations.push(ring);}
  put(lattice(stations),wood,(x,y,z,col)=>{const a=Math.atan2(z,x);
   if(y>hi-.002){col.set(END_GRAIN).lerp(new THREE.Color(HICKORY_DARK),Math.hypot(x,z)/R<.5?.6:.15);return;}
   col.set(HICKORY).lerp(new THREE.Color(HICKORY_DARK),.5+.5*Math.sin(a*3+y*36+Math.sin(y*83)*1.5));
   col.multiplyScalar(.88+.18*hash(Math.floor(a*5)*11+Math.floor(y*60)));
   if(y<.12)col.multiplyScalar(.75+.25*smooth(-.2,.12,y));},false);}

 // The grip: worn leather spiralled round the haft about the hand, bound at both ends in rawhide.
 {const lo=-.15,hi=.1,turns=9,pts=[];
  for(let i=0;i<=turns*14;i++){const t=i/(turns*14),a=t*turns*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*(R+.004),lo+(hi-lo)*t,Math.sin(a)*(R+.004)));}
  put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),turns*24,.0058,5),wood,(x,y,z,col)=>{
   col.set(LEATHER).lerp(new THREE.Color(HIDE),Math.max(0,hash(Math.floor(y*120))-.4)*1.3);},false);
  for(const y of [lo-.007,hi+.007])put(new THREE.TorusGeometry(R+.006,.0055,5,16).rotateX(Math.PI/2).translate(0,y,0),wood,(x,y,z,col)=>col.set(HIDE));}

 // Langets: iron straps down the front and back of the haft from the eye, two rivets each.
 const eyeLo=PICK_AXE_HEAD_Y-EYE_H/2,eyeHi=PICK_AXE_HEAD_Y+EYE_H/2;
 for(const s of [-1,1]){
  put(new THREE.BoxGeometry(.014,.15,.0045).translate(0,eyeLo-.072,s*(R*1.04+.0022)),iron,ironTone);
  for(const y of [eyeLo-.035,eyeLo-.115])put(new THREE.SphereGeometry(.0048,6,4).scale(1,1,.55).translate(0,y,s*(R*1.04+.0046)),iron,(x,y,z,col)=>col.set(POLISH).multiplyScalar(.6));
 }

 // The eye: a rounded eight-sided boss round the haft, the haft end showing through its top, with
 // the iron wedge driven into it across the grain.
 put(new THREE.CylinderGeometry(.036,.038,EYE_H,8,1).rotateY(Math.PI/8).translate(0,PICK_AXE_HEAD_Y,0),headMat,headTone);
 for(const y of [eyeLo+.004,eyeHi-.004])put(new THREE.CylinderGeometry(.04,.04,.008,8,1).rotateY(Math.PI/8).translate(0,y,0),iron,ironTone);
 put(new THREE.BoxGeometry(.034,.012,.0045).translate(0,eyeHi+.002,0),iron,(x,y,z,col)=>col.set(POLISH).multiplyScalar(.7));

 // The pick: a long square spike out of the -x side, curving down to a point.
 const pickC=u=>[-.03-.25*u,PICK_AXE_HEAD_Y-.075*u**1.8],pickW=u=>.017*(1-u)**.8+.0011;
 put(sweep(30,pickC,u=>{const h=.019*(1-u)**.85+.0011,w=pickW(u);return bevelBox(h,w,.45);}),headMat,headTone);
 // The chisel: out of the +x side, flattening as it goes to a narrow straight edge across z.
 const chiselC=u=>[.03+.23*u,PICK_AXE_HEAD_Y-.06*u**1.8],chiselW=u=>.017+.004*smooth(.5,1,u);
 put(sweep(26,chiselC,u=>{const h=.019*(1-u)**.9+.0016,w=chiselW(u);return bevelBox(h,w,.3*(1-u)+.05);}),headMat,headTone);
 // Scratches dragged across the iron, near the eye.
 if(!crystal)for(const x of [-.11,-.06,.06,.1]){const u=x<0?(-x-.03)/.25:(x-.03)/.23,
  [,y]=x<0?pickC(u):chiselC(u),w=x<0?pickW(u):chiselW(u),s=.5+hash(Math.round(x*100))*.6;
  for(const z of [-1,1])put(new THREE.BoxGeometry(.026,.0016,.0012).rotateZ(s*z*.4).translate(x,y,z*(w+.0003)),iron,(x,y,z,col)=>col.set(POLISH).multiplyScalar(.85));}

 for(const [m,list] of sets){if(!list.length)continue;const merged=mergeGeometries(list);list.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=mesh.receiveShadow=true;
  mesh.userData.part=m===wood?'haft':m===glass?'head':crystal?'fittings':'head';g.add(mesh);}
 g.userData.pickAxe={kind:crystal?'crystal pick':'pick-axe'};
}
