import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The aklys (unidentified, a "thonged club"): a short, brutal throwing club on a leash. A
// blackened, knotty haft swells into a heavy head, bound by two iron bands and driven through
// with crooked, rust-bled iron spikes, a few of them bent into hooks. The grip is wound in old
// leather, and an iron eye at the butt carries a braided rawhide thong that hangs in a slack
// loop and ends in a knot with a frayed tail, the cord that drags it back to its thrower.
// Held-weapon space (equipment.js): the hand at the origin, the head up +y. The thong hangs
// in the xy plane, so laid on the floor (live.js lays weapons down with x -PI/2) it lies flat.
// Wood, leather and rawhide are vertex colours on one material, and the iron is the other:
// 2 draws. The iron stays metalness >= .75, so weapon-magic sheathes it.
export const AKLYS_TOP=.425;
const BUTT=-.115,HEAD_Y=.32,HEAD_R=.058;
const WOOD=0x2a1a12,KNOT=0x140c09,GRAIN=0x4a3020,LEATHER=0x3b2318,LEATHER_DARK=0x1d110c,HIDE=0x7d6146,HIDE_DARK=0x3e2d1f,BLOOD=0x3a0d0c;
const IRON=0x46433f,EDGE=0x9aa1a3,RUST=0x5e2c15;

export function buildAklys(g){
 const body=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.88});
 const iron=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.8,roughness:.5});
 g.userData.extraMaterial=[body,iron];
 const sets=new Map([[body,[]],[iron,[]]]),c=new THREE.Color(),up=new THREE.Vector3(0,1,0);
 const put=(geo,m,tone)=>{geo.deleteAttribute('uv');if(geo.index)geo=geo.toNonIndexed();
  const p=geo.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));sets.get(m).push(geo);};
 const hash=i=>{const v=Math.sin(i*127.1+31.7)*43758.5453;return v-Math.floor(v);};
 const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};

 // The haft: a lathe that swells from a thin grip into the heavy head, knobbed at the butt.
 // Its rings are pushed in and out by a lumpy noise, so the wood looks hacked, not turned.
 const profile=[[0,BUTT],[.026,BUTT+.004],[.029,BUTT+.018],[.021,BUTT+.034],[.02,.07],[.024,.15],[.036,.22],[.05,.27],
  [HEAD_R,HEAD_Y],[HEAD_R*.98,.37],[.046,.405],[.026,.42],[0,AKLYS_TOP]].map(([r,y])=>new THREE.Vector2(r,y));
 const haft=new THREE.LatheGeometry(profile,11),hp=haft.attributes.position,v=new THREE.Vector3();
 for(let i=0;i<hp.count;i++){v.fromBufferAttribute(hp,i);const a=Math.atan2(v.z,v.x),r=Math.hypot(v.x,v.z);
  if(r<1e-6)continue;
  const lump=1+.09*Math.sin(a*3+v.y*40)*smooth(.15,.28,v.y)+.05*Math.sin(a*5-v.y*70);
  hp.setXYZ(i,v.x*lump,v.y,v.z*lump);}
 haft.computeVertexNormals();
 put(haft,body,(x,y,z,col)=>{const a=Math.atan2(z,x);
  col.set(WOOD).lerp(new THREE.Color(GRAIN),Math.max(0,Math.sin(a*4+y*55+Math.sin(y*30)*2))*.5);
  // Dark knots in the wood, and old blood soaked into the striking end.
  const knot=Math.max(0,Math.sin(a*2+1.3)*Math.sin(y*38))**6;col.lerp(new THREE.Color(KNOT),knot*.8);
  col.lerp(new THREE.Color(BLOOD),smooth(.3,.4,y)*(.35+.3*Math.sin(a*3+y*60)**2));});

 // The grip, wound on a slant with old leather.
 for(let i=0;i<8;i++){const t=new THREE.TorusGeometry(.0235,.0042,4,12);t.rotateX(Math.PI/2+.22);t.translate(0,-.068+i*.0175,0);
  put(t,body,(x,y,z,col)=>col.set(LEATHER).lerp(new THREE.Color(LEATHER_DARK),.2+.5*hash(i+3)));}

 const ironTone=(x,y,z,col)=>{col.set(IRON).lerp(new THREE.Color(RUST),.25+.35*Math.max(0,Math.sin(x*190+y*140)*Math.sin(z*170)));};
 // Two iron bands binding the head, and one under it where the haft is weakest.
 for(const [y,r] of [[.262,.049],[.348,HEAD_R*1.04],[.392,.05]]){const band=new THREE.CylinderGeometry(r,r,.012,12,1,true);band.translate(0,y,0);put(band,iron,ironTone);
  const lip=new THREE.TorusGeometry(r,.0026,3,12);lip.rotateX(Math.PI/2);lip.translate(0,y+.006,0);put(lip,iron,ironTone);}

 // Crooked spikes driven through the head: three staggered rings, each spike bent a little off
 // true and of uneven length; every third one is bent over into a hook. Bright at the point,
 // bleeding rust into the wood at the root.
 let n=0;
 for(const [y,count,off] of [[.29,6,0],[.322,7,.45],[.37,6,.2]]){
  for(let k=0;k<count;k++,n++){
   const a=off+k*Math.PI*2/count+(hash(n+5)-.5)*.3,rad=.0075+.002*hash(n+29);
   // The spikes facing −z (down, once it is laid on the floor) are worn short.
   const len=(.034+.022*hash(n+17))*(1-.5*Math.max(0,-Math.sin(a))**2);
   const out=new THREE.Vector3(Math.cos(a),(hash(n+41)-.5)*.5,Math.sin(a)).normalize();
   const root=HEAD_R*.92*(1+.05*Math.sin(a*3+y*40));
   const tone=(x,yy,z,col)=>{const r=Math.hypot(x,z);col.set(IRON).lerp(new THREE.Color(RUST),(1-smooth(root+.004,root+.016,r))*.7);
    col.lerp(new THREE.Color(EDGE),smooth(root+len*.55,root+len*.95,r)*.75);};
   const spike=new THREE.ConeGeometry(rad,len,4);spike.translate(0,len/2,0);
   if(n%3===1){// a hook: the top half of the spike bent sideways and down
    const sp=spike.attributes.position;
    for(let i=0;i<sp.count;i++){const h=sp.getY(i)/len,bend=smooth(.4,1,h);sp.setX(i,sp.getX(i)+bend*bend*len*.55);sp.setY(i,sp.getY(i)-bend*bend*len*.25);}
    spike.computeVertexNormals();}
   spike.rotateY(-hash(n+53)*Math.PI);
   spike.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up,out));
   spike.translate(Math.cos(a)*root,y,Math.sin(a)*root);put(spike,iron,tone);
  }
 }
 // A cap of hammered iron on the crown, with one stubby spike.
 const cap=new THREE.SphereGeometry(.03,8,4,0,Math.PI*2,0,Math.PI/2);cap.scale(1,.5,1);cap.translate(0,.413,0);put(cap,iron,ironTone);
 const crown=new THREE.ConeGeometry(.009,.04,4);crown.rotateZ(.18);crown.translate(-.003,.445,0);
 put(crown,iron,(x,y,z,col)=>col.set(IRON).lerp(new THREE.Color(EDGE),smooth(.44,.462,y)*.75));

 // The iron eye at the butt that carries the thong.
 const eye=new THREE.TorusGeometry(.012,.0032,5,10);eye.translate(0,BUTT-.012,0);put(eye,iron,ironTone);

 // The thong: braided rawhide from the eye, hanging in a slack loop out to one side, then
 // ending in a hard knot and a frayed tail. Light and dark strands spiral along it.
 const curve=new THREE.CatmullRomCurve3([[0,BUTT-.022,0],[.012,-.17,.003],[.05,-.215,.008],[.105,-.205,.004],[.128,-.16,-.002],
  [.118,-.105,.003],[.09,-.075,.006],[.064,-.088,.002]].map(p=>new THREE.Vector3(...p)));
 const segs=60,tube=new THREE.TubeGeometry(curve,segs,.0042,5,false),tp=tube.attributes.position,col=[];
 // TubeGeometry lays its vertices out ring by ring, so the ring index gives the length along it.
 for(let i=0;i<tp.count;i++){const ring=Math.floor(i/6),slot=i%6,u=ring/segs;
  const strand=Math.sin(slot/5*Math.PI*2*2+u*95)>0;
  c.set(strand?HIDE:HIDE_DARK).multiplyScalar(.85+.25*hash(ring));
  c.lerp(new THREE.Color(BLOOD),.25*smooth(.3,.6,u)*(1-smooth(.6,.8,u)));
  col.push(c.r,c.g,c.b);}
 tube.deleteAttribute('uv');tube.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
 sets.get(body).push(tube.toNonIndexed());tube.dispose();
 // The knot, and three frayed ends splaying from it.
 const end=curve.getPoint(1),knot=new THREE.IcosahedronGeometry(.0085,0);knot.scale(1,.85,1.1);knot.translate(end.x,end.y,end.z);
 put(knot,body,(x,y,z,c2)=>c2.set(HIDE_DARK).lerp(new THREE.Color(HIDE),.3));
 for(let k=0;k<3;k++){const dir=new THREE.Vector3(-.5+(k-1)*.45,-.85,(k-1)*.25).normalize(),len=.022+.01*hash(k+71);
  const fray=new THREE.ConeGeometry(.0024,len,3);fray.translate(0,len/2,0);fray.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up,dir));
  fray.translate(end.x+dir.x*.006,end.y+dir.y*.006,end.z+dir.z*.006);put(fray,body,(x,y,z,c2)=>c2.set(HIDE).multiplyScalar(.9+.2*hash(k)));}

 for(const [m,list] of sets){const merged=mergeGeometries(list);list.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=m===iron?'head':'shaft';g.add(mesh);}
}
