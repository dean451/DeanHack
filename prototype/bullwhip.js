import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The bullwhip: a braided oxblood handle with a knotted pommel, an iron butt cap and a
// lanyard loop. The lash rises off an iron ferrule, arcs over and falls into two loose coils
// beside the hand, then hangs down to a pale fall frayed into a popper. Five small iron
// thorns are braided into the lash's last stretch, hooked back toward the hand.
// Held-weapon space (equipment.js): the hand at the origin, the handle along +y. The lash and
// coils sag toward -z, so on the floor (live.js lays weapons down with x -PI/2) they lie low
// and the handle rests propped on them. Leather and iron each merge to one mesh: 2 draws.
// The iron stays metalness >= .75, so weapon-magic sheathes it.
const LEATHER=0x4a2219,LIGHT=0x6e3a26,WORN=0x8a5638,FALL=0x9a7a58,THREAD=0xb8a888;

export function buildBullwhip(g){
 const leather=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.78});
 const iron=new THREE.MeshStandardMaterial({color:0x4f4c47,metalness:.78,roughness:.5});
 g.userData.extraMaterial=[leather,iron];
 const sets=new Map([[leather,[]],[iron,[]]]),c=new THREE.Color();
 const up=new THREE.Vector3(0,1,0);
 // tone(x,y,z,col) sets a vertex colour; iron parts are left plain.
 const put=(geo,m,tone)=>{geo.deleteAttribute('uv');if(geo.index)geo=geo.toNonIndexed();
  if(tone){const p=geo.attributes.position,cols=[];
   for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c);cols.push(c.r,c.g,c.b);}
   geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));}
  sets.get(m).push(geo);return geo;};
 const along=(geo,from,to)=>{const d=to.clone().sub(from),len=d.length();
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up,d.normalize()));geo.translate(from.x,from.y,from.z);return len;};
 const lathe=pts=>new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),14);
 // Four strands plaited on the diagonal: alternate strands read light and dark.
 const plait=(a,s,k)=>(Math.sin(2*a+s*k)>0)!==(Math.sin(2*a-s*k)>0);

 // Handle: a knotted pommel, a slim braided grip swelling a little under the palm and a
 // knot collar where the lash leaves it.
 put(lathe([[0,-.15],[.016,-.15],[.023,-.142],[.025,-.13],[.022,-.118],[.017,-.11],[.018,-.08],[.019,-.03],[.018,.03],[.016,.1],
  [.0145,.15],[.018,.156],[.02,.164],[.018,.172],[.012,.176],[0,.176]]),leather,(x,y,z,col)=>{
  const a=Math.atan2(z,x),knot=y<-.108||y>.152;
  col.set(plait(a,y,knot?260:150)?LIGHT:LEATHER);
  if(!knot&&y>-.06&&y<.06&&x>0)col.lerp(new THREE.Color(WORN),.45);// polished where the palm grips
 });
 // Iron butt cap with three short, ragged prongs, and an iron ferrule round the knot.
 put(lathe([[0,-.168],[.012,-.168],[.019,-.16],[.021,-.152],[.017,-.148],[0,-.148]]),iron);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3+.3,cone=new THREE.ConeGeometry(.0045,.022,4);
  along(cone,new THREE.Vector3(),new THREE.Vector3(Math.cos(a)*.5,-1,Math.sin(a)*.5));
  cone.translate(Math.cos(a)*.012,-.172,Math.sin(a)*.012);put(cone,iron);}
 const ferrule=new THREE.TorusGeometry(.0175,.0035,5,16);ferrule.rotateX(Math.PI/2);ferrule.translate(0,.146,0);put(ferrule,iron);
 // The lanyard: a leather loop through the cap, hanging below the hand.
 const loop=new THREE.TorusGeometry(.032,.0032,5,24);loop.rotateY(.5);loop.translate(0,-.2,0);
 put(loop,leather,(x,y,z,col)=>col.set(plait(Math.atan2(z,x),y,400)?LIGHT:LEATHER));

 // The lash's path: up off the knot, over into two coils that settle back and down, then
 // hanging out of the coils to the fall.
 const pts=[[0,.176,0],[.004,.22,-.004],[.03,.29,-.012],[.08,.335,-.02]].map(p=>new THREE.Vector3(...p));
 const C=new THREE.Vector3(.155,.19,-.018),TURNS=2.56;
 for(let i=0;i<=48;i++){const t=i/48,a=Math.PI*.62-t*TURNS*Math.PI*2,r=.114-.048*t;
  pts.push(new THREE.Vector3(C.x+Math.cos(a)*r,C.y+Math.sin(a)*r*.92,C.z-.036*t));}
 pts.push(...[[.162,.06,-.053],[.172,-.01,-.05],[.182,-.08,-.046],[.19,-.14,-.042]].map(p=>new THREE.Vector3(...p)));
 const path=new THREE.CatmullRomCurve3(pts,false,'centripetal');
 const N=300,R=8,frames=path.computeFrenetFrames(N,false),length=path.getLength();
 const FALL_AT=.955;// the last few inches are the fall
 const radius=t=>t<FALL_AT?.0105-.0068*(t/FALL_AT)**.8:.0026;
 const position=[],color=[],index=[],at=new THREE.Vector3(),n=new THREE.Vector3();
 for(let i=0;i<=N;i++){
  const t=i/N;path.getPointAt(t,at);const r=radius(t),s=t*length;
  for(let j=0;j<=R;j++){const a=j/R*Math.PI*2;
   n.copy(frames.normals[i]).multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i],Math.sin(a));
   position.push(at.x+n.x*r,at.y+n.y*r,at.z+n.z*r);
   if(t>=FALL_AT)c.set(FALL).lerp(new THREE.Color(THREAD),.25*Math.sin(s*300+a)**2);
   else c.set(plait(a,s,180)?LIGHT:LEATHER).lerp(new THREE.Color(WORN),n.y>.6?.3:0);// scuffed on top
   color.push(c.r,c.g,c.b);}
 }
 for(let i=0;i<N;i++)for(let j=0;j<R;j++){const a=i*(R+1)+j,b=a+R+1;index.push(a,b,a+1,a+1,b,b+1);}
 const lash=new THREE.BufferGeometry();lash.setAttribute('position',new THREE.Float32BufferAttribute(position,3));
 lash.setAttribute('color',new THREE.Float32BufferAttribute(color,3));lash.setIndex(index);lash.computeVertexNormals();
 sets.get(leather).push(lash.toNonIndexed());lash.dispose();
 // A small knot where the lash narrows into the fall.
 const knot=new THREE.SphereGeometry(.0048,8,6);path.getPointAt(FALL_AT,at);knot.scale(1,1.4,1);
 along(knot,new THREE.Vector3(),path.getTangentAt(FALL_AT));knot.translate(at.x,at.y,at.z);put(knot,leather,(x,y,z,col)=>col.set(LIGHT));

 // The popper: frayed threads splaying from the end of the fall.
 const end=path.getPointAt(1),dir=path.getTangentAt(1);
 for(let i=0;i<7;i++){const a=i*2.4,spread=.35+.25*((i*37)%5)/5;
  const d=dir.clone().add(new THREE.Vector3(Math.cos(a),0,Math.sin(a)).multiplyScalar(spread)).normalize();
  const len=.022+.012*((i*53)%7)/7,thread=new THREE.CylinderGeometry(.0006,.0011,len,3);thread.translate(0,len/2,0);
  along(thread,end,end.clone().add(d));put(thread,leather,(x,y,z,col)=>col.set(THREAD));}

 // Iron thorns along the hanging lash before the fall, each raking back toward the hand.
 for(let i=0;i<5;i++){const t=.875+i*.016;path.getPointAt(t,at);const tan=path.getTangentAt(t),k=Math.round(t*N);
  const side=frames.normals[k].clone().multiplyScalar(Math.cos(i*2.1)).addScaledVector(frames.binormals[k],Math.sin(i*2.1));
  const r=radius(t),thorn=new THREE.ConeGeometry(.0034,.017,4);thorn.translate(0,.0085,0);
  along(thorn,new THREE.Vector3(),side.clone().multiplyScalar(.7).addScaledVector(tan,-.7));
  thorn.translate(at.x+side.x*r*.6,at.y+side.y*r*.6,at.z+side.z*r*.6);put(thorn,iron);
  // An iron wire binding holds each thorn: a ring square to the lash.
  const collar=new THREE.TorusGeometry(r+.0008,.0013,4,10);
  collar.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),tan));collar.translate(at.x,at.y,at.z);put(collar,iron);}

 for(const [m,geos] of sets){const geo=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(geo,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=m===iron?'fittings':'whip';g.add(mesh);}
}
