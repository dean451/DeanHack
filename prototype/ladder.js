import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {stoneColour,noise3} from './stairs.js';

// Ladders (Vlad's Tower and the other ladder levels). The bridge reports them as `up` and
// `down` terrain like stairs; only the glyph's colour tells them apart (drawing.c draws
// ladders brown, stairs white), and only while nothing stands on the square.
export const LADDER_COLOR=3;
// true or false when the ladder or stair glyph is showing, null while something covers it.
export function ladderShown(cell){return cell.kind==='terrain'?cell.color===LADDER_COLOR:null;}

// Up is a crooked ladder of black, half-rotten timber leaning on a crossbeam between two
// rough-hewn stone posts. Its stiles end in iron claws hooked over the beam, its rungs are
// strapped and nailed, one rung is snapped (the broken half lies at the foot), a frayed rope
// hangs from the beam and a cold light leaks down from the opening above.
// Down is a ragged pit of broken, tilted flagstones; the hooked top of a ladder juts out of
// the black, a rope tied to a piton slides over the rim into it, and claw marks score the
// stone at the edge. Parts are baked into one mesh per material (`userData.part` is stone,
// wood, iron, and glow for up or void for down). The seed varies the stone, timber and
// breakage. Everything stays inside its tile.
export function createLadder(direction='up',seed=0){
 const up=direction!=='down';
 const g=new THREE.Group();g.name=up?'Ladder up':'Ladder down';
 const materials=[],geometries=[];
 const rand=i=>{const s=Math.sin(seed*12.9898+i*78.233)*43758.5453;return s-Math.floor(s);};
 const off=rand(99)*50,tint=.9+rand(98)*.2;
 const stone=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92,flatShading:true});
 const wood=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85});
 const iron=new THREE.MeshStandardMaterial({vertexColors:true,metalness:.7,roughness:.48});
 const glow=new THREE.MeshBasicMaterial({color:0xc4d6cf,vertexColors:true,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide});
 const voidMat=new THREE.MeshBasicMaterial({color:0x020303});
 const parts=up?{stone,wood,iron,glow}:{stone,wood,iron,void:voidMat};
 materials.push(...Object.values(parts));
 const bins=new Map(Object.values(parts).map(m=>[m,[]]));
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s=new THREE.Vector3();
 const place=(geo,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>geo.applyMatrix4(m4.compose(v.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s.set(sx,sy,sz)));
 const put=(geo,m,paint=null)=>{geo.userData.paint=paint;bins.get(m).push(geo);return geo;};
 // Roughen by a position-keyed noise, so shared corners move together and no cracks open.
 const roughen=(geo,amt=.003)=>{
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   p.setXYZ(i,x+(noise3(x*31+off,y*31,z*31)-.5)*amt*2,y+(noise3(y*29+7,z*29,x*29+off)-.5)*amt*2,z+(noise3(z*33+3+off,x*33,y*33)-.5)*amt*2);
  }
  geo.computeVertexNormals();
  return geo;
 };
 const rust=(x,y,z)=>{
  const k=.7+noise3(x*60+off,y*60,z*60)*.35,r=noise3(x*35,y*35+off,z*35);
  let c=[.17*k,.18*k,.19*k];
  if(r>.5){const f=Math.min(1,(r-.5)*3.5);c=c.map((a,j)=>a+([.34,.16,.08][j]*k-a)*f);}
  return c;
 };
 // Black, weathered timber: grain streaks run along `axis`, bleached grey where it's worn,
 // rotting green-black near the floor. `dark` shades it toward the pit.
 const timber=(axis,dark=null)=>(x,y,z)=>{
  const a=axis==='y'?[x*90,y*5,z*90]:[x*5,y*90,z*90];
  const grain=noise3(a[0]+off,a[1],a[2]),k=.8+grain*.4;
  let c=[.2*k,.14*k,.095*k];
  const bleach=noise3(a[0]*.4,a[1]*2+off,a[2]*.4);
  if(bleach>.55){const f=Math.min(1,(bleach-.55)*2.6)*.7;c=c.map((u,j)=>u+([.36,.33,.29][j]-u)*f);}
  if(grain<.3)c=c.map(u=>u*.55);// the dark cracks between grain lines
  if(up&&y<.12){const f=(1-y/.12)*.7;c=c.map((u,j)=>u+([.06,.08,.05][j]-u)*f);}
  if(dark)c=c.map(u=>u*dark(y));
  return c;
 };
 const rope=(x,y,z)=>{const k=.75+noise3(x*120+off,y*120,z*120)*.4;return [.36*k,.31*k,.22*k];};
 const stonePaint=(x,y,z,n)=>stoneColour(x,y,z,n,off);
 // A hewn length of timber along local y from 0 to len: warped, tapered and roughened.
 const beam=(w,d,len,{taper=.9,warp=.012,segs=8}={})=>{
  const geo=new THREE.BoxGeometry(w,len,d,1,segs,1);geo.translate(0,len/2,0);
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const t=p.getY(i)/len,k=1-(1-taper)*t;
   p.setX(i,p.getX(i)*k+(noise3(t*3+off,seed,1)-.5)*warp);
   p.setZ(i,p.getZ(i)*k+(noise3(t*3,off,2)-.5)*warp);
  }
  return roughen(geo,.0025);
 };
 // A tube along points, for hooks and rope.
 const tube=(pts,r,segs=16,radial=6)=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),segs,r,radial,false);
 // A slab of stone from a jittered polygon, extruded up from the floor.
 const flag=(pts,h,x,y,z,rx=0,rz=0)=>{
  const shape=new THREE.Shape(pts.map(([a,b])=>new THREE.Vector2(a,-b)));
  const geo=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelThickness:.005,bevelSize:.005,bevelSegments:1,curveSegments:2});
  geo.rotateX(-Math.PI/2);geo.translate(0,.005,0);
  return put(roughen(place(geo,x,y,z,rx,0,rz),.004),stone,stonePaint);
 };
 // Fragments: chipped stone or splinters at random spots.
 const chip=(i,x,z,size,m=stone,paint=stonePaint)=>put(roughen(place(new THREE.DodecahedronGeometry(size,0),x,size*.5,z,rand(i)*3,rand(i+1)*3,0,1,.6,1),.0015),m,paint);

 // The ladder: stiles at ±halfW in a frame whose y runs from the foot up the ladder.
 // `frame` places local geometry; rung heights and the broken rung come from the caller.
 const ladder=(frame,{len,halfW,rungs,broken=-1,paint})=>{
  for(const sx of [-1,1]){
   put(place(beam(.042,.05,len,{taper:.88}),sx*halfW).applyMatrix4(frame),wood,paint('y'));
  }
  rungs.forEach((h,i)=>{
   const tilt=(rand(i+20)-.5)*.06;
   if(i===broken){
    // Snapped: a jagged stub left on each stile.
    for(const sx of [-1,1]){
     const l=.06+rand(i+sx+30)*.06,stub=new THREE.ConeGeometry(.016,l,5,3);stub.translate(0,l/2,0);
     put(roughen(place(stub,sx*(halfW-.02),h,0,0,0,sx*Math.PI/2+tilt),.004).applyMatrix4(frame),wood,paint('x'));
    }
    return;
   }
   const rung=new THREE.CylinderGeometry(.013,.015,halfW*2+.01,8,4);
   put(roughen(place(rung,0,h,0,0,0,Math.PI/2+tilt),.0018).applyMatrix4(frame),wood,paint('x'));
   // An iron strap round each joint, with a nail head on the face.
   for(const sx of [-1,1]){
    put(place(new THREE.BoxGeometry(.05,.017,.058),sx*halfW,h,0).applyMatrix4(frame),iron,rust);
    put(place(new THREE.SphereGeometry(.0065,6,4),sx*halfW,h,.03,0,0,0,1,1,.5).applyMatrix4(frame),iron,rust);
   }
  });
 };
 // A curled iron claw from the top of a stile, hooked over whatever it grips.
 const claw=pts=>{
  put(tube(pts,.009,18,6),iron,rust);
  const [a,b]=pts.slice(-2).map(p=>new THREE.Vector3(...p)),dir=b.clone().sub(a).normalize();
  const tip=new THREE.ConeGeometry(.009,.03,6);tip.translate(0,.015,0);
  tip.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir));tip.translate(b.x,b.y,b.z);
  put(tip,iron,rust);
 };

 if(up){
  // Footing: a cracked flagstone the ladder stands on.
  const foot=[];for(let i=0;i<7;i++){const a=i/7*Math.PI*2+rand(i)*.5,r=.24+rand(i+7)*.07;foot.push([Math.cos(a)*r*1.2,Math.sin(a)*r*.8]);}
  flag(foot,.022,0,0,.02);
  // Two rough-hewn posts of stacked, skewed blocks, narrowing upward, and the crossbeam.
  const postZ=.37,beamY=.875;
  for(const sx of [-1,1]){
   let y=0;
   for(let i=0;i<3;i++){
    const h=[.34,.3,.25][i],w=.13-i*.012+rand(i+sx*5+40)*.02;
    put(roughen(place(new RoundedBoxGeometry(w,h-.008,w*.95,1,.012),sx*.4+(rand(i+sx+44)-.5)*.02,y+h/2,postZ,0,(rand(i+sx+48)-.5)*.3,(rand(i+sx+52)-.5)*.06),.007),stone,stonePaint);
    y+=h;
   }
  }
  const crossbeam=beam(.075,.085,.9,{taper:.95,warp:.01});
  put(place(crossbeam,-.45,beamY,postZ,0,0,-Math.PI/2),wood,timber('x'));
  for(const sx of [-1,1])put(place(new THREE.BoxGeometry(.03,.1,.1),sx*.36,beamY,postZ),iron,rust);
  // The ladder leans back onto the front of the beam.
  const footZ=.02,topZ=postZ-.06,topY=beamY-.03,lean=Math.atan2(topZ-footZ,topY),len=Math.hypot(topZ-footZ,topY);
  const frame=new THREE.Matrix4().compose(new THREE.Vector3(0,.022,footZ),new THREE.Quaternion().setFromEuler(new THREE.Euler(lean,0,0)),new THREE.Vector3(1,1,1));
  const rungs=[...Array(7)].map((_,i)=>.11+i*.118+(rand(i+60)-.5)*.02),broken=3+Math.floor(rand(61)*3);
  ladder(frame,{len,halfW:.15,rungs,broken,paint:axis=>timber(axis)});
  // Iron shoes at the feet, spiked into the flagstone.
  for(const sx of [-1,1]){
   put(place(new THREE.BoxGeometry(.056,.04,.064),sx*.15,.04,footZ,lean,0,0),iron,rust);
   for(const dz of [-.04,.04])put(place(new THREE.ConeGeometry(.007,.03,5),sx*.15+dz*.3,.028,footZ+dz,Math.PI,0,0),iron,rust);
  }
  // Claws curl from the stile tops over the beam and bite down behind it.
  const top=new THREE.Vector3(0,len,0).applyMatrix4(frame);
  for(const sx of [-1,1]){
   const x=sx*.15;
   claw([[x,top.y-.03,top.z-.01],[x,top.y+.04,top.z+.015],[x+sx*.01,beamY+.07,postZ],[x+sx*.015,beamY+.05,postZ+.06],[x+sx*.015,beamY-.01,postZ+.07]]);
  }
  // The broken half of the rung lies in the dust at the foot.
  {
   const l=.16+rand(62)*.06,piece=new THREE.CylinderGeometry(.013,.015,l,8,3);
   const tipA=new THREE.ConeGeometry(.014,.04,5);tipA.translate(0,l/2+.02,0);
   put(roughen(place(mergeGeometries([piece.toNonIndexed(),tipA.toNonIndexed()]),-.12+rand(63)*.24,.014,-.24,Math.PI/2,0,(rand(64)-.5)*1.8),.003),wood,timber('x'));
  }
  // A frayed rope hangs from the beam, its end unravelled into strands.
  {
   const rx=-.27+rand(65)*.06,endY=.42+rand(66)*.08;
   put(tube([[rx,beamY-.04,postZ-.02],[rx+.01,(beamY+endY)/2,postZ-.035],[rx-.005,endY,postZ-.03]],.008,14,6),wood,rope);
   for(let i=0;i<4;i++){
    const a=i/4*Math.PI*2+rand(i+67);
    put(tube([[rx-.005,endY+.005,postZ-.03],[rx-.005+Math.cos(a)*.012,endY-.03,postZ-.03+Math.sin(a)*.012],[rx-.005+Math.cos(a)*.022,endY-.06-rand(i+71)*.03,postZ-.03+Math.sin(a)*.022]],.003,6,4),wood,rope);
   }
  }
  // Cold light leaking down behind the ladder from the opening above, strongest at the top.
  {
   const geo=new THREE.PlaneGeometry(.66,.62,4,6);geo.translate(0,beamY-.31,postZ+.02);
   put(geo,glow,(x,y)=>{const f=Math.max(0,Math.min(1,(y-(beamY-.62))/.62))**1.5*(1-Math.abs(x)/.4);return [f,f,f];});
  }
  for(let i=0;i<6;i++)chip(i*3+80,-.34+rand(i+80)*.68,-.36-rand(i+86)*.08,.008+rand(i+90)*.012);
  for(let i=0;i<3;i++)chip(i*3+95,-.2+rand(i+95)*.4,-.14-rand(i+98)*.1,.006+rand(i+101)*.006,wood,timber('y'));
 }else{
  const hx=.25,hz=.27,cz=.01;
  // The pit: a black, ragged opening at floor level.
  const edge=[];const N=24;
  for(let i=0;i<N;i++){
   const a=i/N*Math.PI*2,c=Math.cos(a),sn=Math.sin(a),k=1/Math.max(Math.abs(c)/hx,Math.abs(sn)/hz),j=.92+rand(i+110)*.12;
   edge.push(new THREE.Vector2(c*k*j,-(sn*k*j)));
  }
  const hole=new THREE.ShapeGeometry(new THREE.Shape(edge));hole.rotateX(-Math.PI/2);
  put(place(hole,0,.004,cz),voidMat);
  // Broken flagstones round the rim, tilted as if the floor gave way into the pit.
  const ring=[];
  for(const [ax,a0,a1,fixed,sgn] of [['x',-hx-.06,hx+.06,cz-hz-.07,-1],['x',-hx-.06,hx+.06,cz+hz+.07,1],['z',cz-hz+.04,cz+hz-.04,-hx-.07,-1],['z',cz-hz+.04,cz+hz-.04,hx+.07,1]]){
   const n=ax==='x'?3:2,span=(a1-a0)/n;
   for(let i=0;i<n;i++){
    const mid=a0+span*(i+.5)+(rand(ring.length+120)-.5)*.02;
    const x=ax==='x'?mid:fixed,z=ax==='x'?fixed:mid,w=(ax==='x'?span:.13)*.5-.006,d=(ax==='x'?.13:span)*.5-.006;
    ring.push({x,z,w,d,ax,sgn});
   }
  }
  ring.forEach((st,i)=>{
   const pts=[[-st.w,-st.d],[st.w,-st.d],[st.w,st.d],[-st.w,st.d]].map(([a,b],j)=>[a+(rand(i*5+j+130)-.5)*.03,b+(rand(i*5+j+150)-.5)*.03]);
   // A chipped corner on some stones.
   if(rand(i+170)>.5)pts.splice(1+Math.floor(rand(i+171)*3),0,[(rand(i+172)-.5)*st.w,(rand(i+173)-.5)*st.d]);
   // Tilted down toward the pit, so the inner edge sags.
   const tip=.06+rand(i+180)*.06,rx=st.ax==='x'?st.sgn*tip:0,rz=st.ax==='z'?-st.sgn*tip:0;
   st.h=.03+rand(i+190)*.015;st.rx=rx;st.rz=rz;
   flag(pts,st.h,st.x,.008,st.z,rx,rz);
  });
  // The inner faces of the rim, going black as they drop away.
  const shade=(x,y,z,n)=>stoneColour(x,y,z,n,off).map(c=>c*Math.max(.05,.35+y*8));
  for(const sx of [-1,1])put(place(new THREE.PlaneGeometry(hz*2,.05,6,1),sx*hx*.98,.02,cz,0,-sx*Math.PI/2,0),stone,shade);
  for(const sz of [-1,1])put(place(new THREE.PlaneGeometry(hx*2,.05,6,1),0,.02,cz+sz*hz*.98,0,sz>0?Math.PI:0,0),stone,shade);
  // The ladder's top juts out of the black against the far side, leaning back over the rim.
  const footY=-.04,topY=.3,farZ=cz-hz+.03,lean=-.28,len=(topY-footY)/Math.cos(lean);
  const frame=new THREE.Matrix4().compose(new THREE.Vector3(0,footY,farZ+.09),new THREE.Quaternion().setFromEuler(new THREE.Euler(lean,0,0)),new THREE.Vector3(1,1,1));
  const sink=y=>Math.max(.04,Math.min(1,(y+.01)/.18));
  ladder(frame,{len,halfW:.13,rungs:[.07,.18,.29],paint:axis=>timber(axis,sink)});
  const top=new THREE.Vector3(0,len,0).applyMatrix4(frame);
  for(const sx of [-1,1]){
   const x=sx*.13;
   claw([[x,top.y-.03,top.z+.008],[x,top.y+.03,top.z-.012],[x+sx*.012,top.y+.035,top.z-.07],[x+sx*.016,top.y-.02,top.z-.1],[x+sx*.016,.075,top.z-.105]]);
  }
  // A piton on the near rim with a rope tied off and slithering over the edge into the pit.
  const pz=cz+hz+.07,px=.2;
  put(place(new THREE.ConeGeometry(.012,.07,6),px,.06,pz,Math.PI-.3,0,0),iron,rust);
  put(place(new THREE.TorusGeometry(.017,.004,6,12),px,.085,pz-.008,Math.PI/2-.4,0,0),iron,rust);
  put(tube([[px,.085,pz-.02],[px-.04,.07,pz-.07],[px-.07,.052,cz+hz+.005],[px-.09,.03,cz+hz-.04],[px-.1,-.02,cz+hz-.07]],.007,16,6),wood,(x,y,z)=>rope(x,y,z).map(c=>c*Math.max(.05,Math.min(1,(y+.01)/.06))));
  // Claw marks gouged into the stones at the near corners: something climbed out.
  for(const [sx,stoneIx] of [[-1,1],[1,6]]){
   const st=ring[stoneIx],ang=sx*.5+(rand(stoneIx+200)-.5)*.3;
   for(let k=0;k<3;k++){
    const along=(k-1)*.017,x=st.x+Math.cos(ang)*along,z=st.z+Math.sin(ang)*along;
    // Sunk into the tilted top face, so only a sliver shows as a dark groove.
    const top=.018+st.h+(st.ax==='x'?-(z-st.z)*st.rx:(x-st.x)*st.rz);
    put(place(new THREE.BoxGeometry(.004,.008,.08),x,top-.002,z,st.rx,ang,st.rz),stone,()=>[.05,.045,.04]);
   }
  }
  for(let i=0;i<5;i++)chip(i*3+220,-.38+rand(i+220)*.76,.4+rand(i+226)*.06,.008+rand(i+230)*.01);
 }

 // Bake: vertex-coloured bins get their colours, then every bin becomes one mesh.
 const nrm=new THREE.Vector3();
 for(const [material,list] of bins){
  if(!list.length)continue;
  const flats=list.map(geo=>{
   const paint=geo.userData.paint;
   const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
   if(!flat.attributes.normal)flat.computeVertexNormals();
   for(const key of Object.keys(flat.attributes))if(!['position','normal'].includes(key))flat.deleteAttribute(key);
   if(material.vertexColors){
    const p=flat.attributes.position,nor=flat.attributes.normal,col=new Float32Array(p.count*3);
    const k=material===stone?tint:1;
    for(let i=0;i<p.count;i++){nrm.fromBufferAttribute(nor,i);const c=paint?paint(p.getX(i),p.getY(i),p.getZ(i),nrm):[1,1,1];col[i*3]=c[0]*k;col[i*3+1]=c[1]*k;col[i*3+2]=c[2]*k;}
    flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   }
   return flat;
  });
  const geo=mergeGeometries(flats);flats.forEach(f=>f.dispose());geometries.push(geo);
  const mesh=new THREE.Mesh(geo,material);
  mesh.castShadow=material!==glow&&material!==voidMat;mesh.receiveShadow=material===stone||material===wood;
  mesh.userData.part=Object.keys(parts).find(key=>parts[key]===material);
  g.add(mesh);
 }
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}
