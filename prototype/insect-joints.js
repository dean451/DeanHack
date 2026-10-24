import * as THREE from 'three';
// Named joints for the six-legged family (ants, bees, beetles, locusts), the same names the cat and the
// dragon use where the part is the same: `head` and `neck0` are the group the head turns about (jaws
// and feelers ride on it), legs are `lleg0`..`lleg2` and `rleg0`..`rleg2` from front to hind (left is -x,
// as on the cat), `ljaw` / `rjaw` for the ants' mandibles, `tail0` for an ant's gaster, `lwing` / `rwing` for a bee. Every builder
// builds its legs right side first, front to back, then the left. Each leg's segments are `<leg>_0` (coxa),
// `<leg>_1` (femur) and `<leg>_2` (tibia, with the tarsus), bones of the leg's one skinned mesh (rigLeg).
export function nameInsectJoints(actor){
 const {head,legs,wings,jaws,tail0}=actor,joints={head,neck0:head};
 head.name='head';
 legs.forEach((leg,i)=>{const name=(i<3?'r':'l')+'leg'+i%3;leg.name=name;joints[name]=leg;
  // and its coxa, femur and tibia: lleg0_0, lleg0_1, lleg0_2
  (leg.userData.segments||[]).forEach((b,k)=>{b.name=`${name}_${k}`;joints[b.name]=b;});});
 if(jaws)jaws.forEach(jaw=>{const name=(jaw.userData.side>0?'r':'l')+'jaw';jaw.name=name;joints[name]=jaw;});
 wings.forEach(w=>{const name=(w.userData.side<0?'l':'r')+'wing';w.name=name;joints[name]=w;});
 if(tail0){tail0.name='tail0';joints.tail0=tail0;}
 actor.joints=joints;
 return actor;
}

// Each leg's three segments as bones: `0` the coxa at the hip, `1` the femur from the coxa's end, `2` the
// tibia (with the tarsus and claw) from the knee. The leg stays one mesh (a SkinnedMesh), so the mesh caps
// don't change. `skinLeg` writes the skin weights into a leg's geometry from its chain of points (hip,
// coxa end, knee, then on to the foot): each vertex rides the segment it lies nearest, blending across a
// joint over a little of either side so a bent joint doesn't crack.
export const LEG_SEGMENTS=3;
export function skinLeg(geo,pts){
 const P=pts.map(p=>new THREE.Vector3(...p)),pos=geo.attributes.position,n=pos.count;
 const idx=new Uint16Array(n*4),wt=new Float32Array(n*4),v=new THREE.Vector3(),seg=new THREE.Line3(),c=new THREE.Vector3();
 const len=k=>P[k].distanceTo(P[k+1]);
 for(let i=0;i<n;i++){
  v.fromBufferAttribute(pos,i);
  let best=Infinity,bk=0,bt=0;
  for(let k=0;k<P.length-1;k++){seg.set(P[k],P[k+1]);const t=seg.closestPointToPointParameter(v,true);seg.at(t,c);const d=c.distanceToSquared(v);if(d<best-1e-12){best=d;bk=k;bt=t;}}
  // the bone this segment hangs on (everything past the knee rides the tibia), and a blend across the joint
  // at either end: a quarter of the shorter segment, at most 8 mm
  const bone=Math.min(bk,2);let a=bone,b=bone,w=1;
  if(bk<=2){
   const blend=k=>Math.min(.008,.25*Math.min(len(k-1),len(k)));
   if(bk>=1&&bt*len(bk)<blend(bk)){const s=.5+.5*bt*len(bk)/blend(bk);a=bone;b=bone-1;w=s;}
   else if(bk<=1&&(1-bt)*len(bk)<blend(bk+1)){const s=.5+.5*(1-bt)*len(bk)/blend(bk+1);a=bone;b=bone+1;w=s;}
  }
  idx[i*4]=a;idx[i*4+1]=b;wt[i*4]=w;wt[i*4+1]=1-w;
 }
 geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(idx,4));
 geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(wt,4));
 geo.userData.legBones=P.slice(0,3).map(p=>p.toArray());geo.userData.foot=P.at(-1).toArray();
 return geo;
}
// One leg on its hip group: a SkinnedMesh of the skinned geometry with its three bones under it (so a mirrored
// left leg mirrors its bones too). Returns the mesh; the bones are on leg.userData.segments.
export function rigLeg(leg,geo,material,{mirror=false,part='leg'}={}){
 const m=new THREE.SkinnedMesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=part;if(mirror)m.scale.x=-1;
 const [p0,p1,p2]=geo.userData.legBones,bones=[new THREE.Bone(),new THREE.Bone(),new THREE.Bone()];
 bones[0].position.set(...p0);bones[1].position.set(p1[0]-p0[0],p1[1]-p0[1],p1[2]-p0[2]);bones[2].position.set(p2[0]-p1[0],p2[1]-p1[1],p2[2]-p1[2]);
 m.add(bones[0]);bones[0].add(bones[1]);bones[1].add(bones[2]);
 leg.add(m);m.updateMatrixWorld(true);m.bind(new THREE.Skeleton(bones));
 leg.userData.segments=bones;
 // the claw's tip in the tibia's frame (body-roles.js puts the paw there, so it follows the bent leg)
 const f=geo.userData.foot;leg.userData.foot=[f[0]-p2[0],f[1]-p2[1],f[2]-p2[2]];
 return m;
}
