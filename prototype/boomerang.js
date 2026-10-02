import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The boomerang: a hooked killing stick of blackened hardwood. The grip arm is wound in dark
// leather between sinew bindings; past the elbow the long arm sweeps out and curls down into
// a hook shod with an iron beak. Filed bone teeth are set along the arm's outer (leading)
// edge, raked back toward the elbow, and a line of chevrons is burnt down both faces.
// Held-weapon space (equipment.js): the hand at the origin, the grip along +y and the long
// arm reaching out along +x, flat in the xy plane, so on the floor (live.js lays weapons down
// with x -PI/2) it lies flat. Wood, leather, sinew and bone are vertex colours on one
// material, and the iron is the other: 2 draws. The iron stays metalness >= .75, so
// weapon-magic sheathes it.
const WOOD=0x352016,GRAIN=0x583824,BURN=0x0e0806,LEATHER=0x1e130e,STRAP=0x3a2419,SINEW=0x9a8566,BONE=0xd6caa8,BONE_TIP=0xeee4c6;

// The centreline (x, y) and its half-width, from the grip's butt to the hook.
const LINE=[[0,-.115],[.002,-.02],[.006,.08],[.02,.16],[.06,.205],[.12,.205],[.2,.177],[.275,.13],[.33,.075],[.362,.015],[.356,-.03]];
const halfWidth=s=>s<.3?.018+.006*s/.3:s<.45?.024+.008*Math.sin((s-.3)/.15*Math.PI/2):.032-.019*((s-.45)/.55)**1.2;
const HALF_DEPTH=.007,BEVEL=.006;
const GRIP_END=.3;// leather from the butt to here (s)

export function buildBoomerang(g){
 const body=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.72});
 const iron=new THREE.MeshStandardMaterial({color:0x4a4741,metalness:.78,roughness:.48});
 g.userData.extraMaterial=[body,iron];
 const sets=new Map([[body,[]],[iron,[]]]),c=new THREE.Color(),c2=new THREE.Color();
 const up=new THREE.Vector3(0,1,0);
 const put=(geo,m,tone)=>{geo.deleteAttribute('uv');if(geo.index)geo=geo.toNonIndexed();
  if(tone){const p=geo.attributes.position,cols=[];
   for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c);cols.push(c.r,c.g,c.b);}
   geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));}
  sets.get(m).push(geo);return geo;};
 const along=(geo,dir)=>geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up,dir.clone().normalize()));

 const path=new THREE.CatmullRomCurve3(LINE.map(([x,y])=>new THREE.Vector3(x,y,0)),false,'centripetal');
 const length=path.getLength();
 const at=s=>path.getPointAt(s),tan=s=>path.getTangentAt(s);
 // The outer side of the bend is to the left of travel.
 const outer=s=>{const t=tan(s);return new THREE.Vector3(-t.y,t.x,0);};

 // The stick, lofted along the centreline: a flat, round-edged section (thinner toward the
 // inner, trailing edge, like a wing), rounding off at the butt and the hook's tip.
 const N=180,R=24,W=s=>halfWidth(s)+BEVEL*.9,H=HALF_DEPTH+BEVEL;
 const grain=new THREE.Color(GRAIN),burn=new THREE.Color(BURN),strap=new THREE.Color(STRAP);
 const tone=(s,d,z,col)=>{const u=s*length;
  if(s<GRIP_END){// leather wound on a slant, the turns showing as darker seams
   col.set(LEATHER);const turn=((u*60+d*22+z*30)%1+1)%1;if(turn<.22)col.lerp(strap,.7);return;}
  const w=Math.sin(u*85+d*260+Math.sin(u*11)*3)*.5+.5;col.set(WOOD).lerp(grain,w**3*.8);
  // burnt chevrons down the middle of both faces, pointing toward the hook
  const face=Math.abs(z)>H*.75,mid=Math.abs(d)<.014;
  if(face&&mid&&s>.36&&s<.88&&((u*26-Math.abs(d)*22)%1+1)%1<.2)col.copy(burn);
  // scorched toward the outer edge
  else if(d>0)col.lerp(burn,Math.min(.55,(d/W(s))**3*.55));
 };
 const pos=[],col=[],idx=[],sec=a=>[Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**.6,Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**.55];
 for(let i=0;i<=N;i++){const s=i/N,p=at(s),o=outer(s),e=Math.max(.12,Math.sqrt(Math.min(1,s/.03,(1-s)/.03)));
  for(let j=0;j<=R;j++){const a=j/R*Math.PI*2,[cx,cz]=sec(a),d=cx*W(s)*e,z=cz*H*e*(cx<0?1+.35*cx:1);
   pos.push(p.x+o.x*d,p.y+o.y*d,z);tone(s,d,z,c);col.push(c.r,c.g,c.b);}}
 for(let i=0;i<N;i++)for(let j=0;j<R;j++){const a=i*(R+1)+j,b=a+R+1;idx.push(a,a+1,b,a+1,b+1,b);}
 // fan caps closing each end
 for(const [i,flip] of [[0,true],[N,false]]){const p=at(i/N),centre=pos.length/3;pos.push(p.x,p.y,0);tone(i/N,0,0,c);col.push(c.r,c.g,c.b);
  for(let j=0;j<R;j++){const a=i*(R+1)+j;idx.push(...(flip?[centre,a+1,a]:[centre,a,a+1]));}}
 const stick=new THREE.BufferGeometry();stick.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 stick.setAttribute('color',new THREE.Float32BufferAttribute(col,3));stick.setIndex(idx);stick.computeVertexNormals();
 sets.get(body).push(stick.toNonIndexed());stick.dispose();

 // Sinew bindings: flat bands round the arm at the top of the grip and past the elbow.
 for(const s of [.27,.3,.4,.43]){const q={s,p:at(s),o:outer(s)},w=W(s)+.0015,h=H+.0015;
  const ring=[];for(let k=0;k<20;k++){const a=k/20*Math.PI*2;
   ring.push(new THREE.Vector3(q.p.x+q.o.x*Math.cos(a)*w,q.p.y+q.o.y*Math.cos(a)*w,Math.sin(a)*h));}
  put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ring,true),24,.0024,4,true),body,(x,y,z,col)=>col.set(SINEW).lerp(grain,((x*900+y*700)%1+1)%1*.25));}

 // Bone teeth along the outer edge of the long arm, filed to points and raked back.
 const bone=new THREE.Color(BONE_TIP);
 for(let i=0;i<9;i++){const s=.47+i*.043,q={p:at(s),o:outer(s)},t=tan(s);
  const len=.026+.01*((i*5)%3)/2-.006*i/8,tooth=new THREE.ConeGeometry(.0065,len,4);
  tooth.scale(1,1,.55);tooth.translate(0,len/2,0);
  along(tooth,q.o.clone().multiplyScalar(.72).addScaledVector(t,-.62));
  const e=W(s)-.004;tooth.translate(q.p.x+q.o.x*e,q.p.y+q.o.y*e,0);
  put(tooth,body,(x,y,z,col)=>{const r=Math.hypot(x-q.p.x,y-q.p.y)-e;col.set(BONE).lerp(bone,Math.min(1,Math.max(0,r/len)));});}

 // The iron beak shoeing the hook: a flattened claw running on past the tip and curling in.
 const tipS=1,tp=at(tipS),tt=tan(tipS),to=outer(tipS);
 const claw=[0,.012,.026,.04,.05].map((k,i)=>tp.clone().addScaledVector(tt,k-.012).addScaledVector(to,-(i*i)*.0022));
 const clawPath=new THREE.CatmullRomCurve3(claw),CS=14,CR=8,cp=[],ci=[];
 for(let i=0;i<=CS;i++){const u=i/CS,p=clawPath.getPointAt(u),r=.017*(1-u)**.9+.0008;
  for(let j=0;j<=CR;j++){const a=j/CR*Math.PI*2;// flattened across the stick's faces
   cp.push(p.x+to.x*Math.cos(a)*r,p.y+to.y*Math.cos(a)*r,Math.sin(a)*r*.62);}}
 for(let i=0;i<CS;i++)for(let j=0;j<CR;j++){const a=i*(CR+1)+j,b=a+CR+1;ci.push(a,a+1,b,a+1,b+1,b);}
 {const b=clawPath.getPointAt(0),centre=cp.length/3;cp.push(b.x,b.y,0);for(let j=0;j<CR;j++)ci.push(centre,j+1,j);}// its open root
 const beak=new THREE.BufferGeometry();beak.setAttribute('position',new THREE.Float32BufferAttribute(cp,3));beak.setIndex(ci);beak.computeVertexNormals();put(beak,iron);
 // Rivets through the elbow and the hook's root, a head on each face.
 for(const s of [.355,.385,.415,.84,.9]){const p=at(s),pin=new THREE.CylinderGeometry(.0042,.0048,H*2+.004,6);
  pin.rotateX(Math.PI/2);pin.translate(p.x,p.y,0);put(pin,iron);}
 // An iron ferrule round the grip's butt, below the leather.
 {const s=.035,p=at(s),r=W(s)+.0025,band=new THREE.CylinderGeometry(r,r,.011,12);
  band.scale(1,1,(H+.0025)/r);along(band,tan(s));band.translate(p.x,p.y,0);put(band,iron);}

 for(const [m,geos] of sets){const geo=mergeGeometries(geos);geos.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(geo,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=m===iron?'fittings':'stick';g.add(mesh);}
}
