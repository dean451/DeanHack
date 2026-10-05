import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Staircases for the `up` and `down` terrain. Up is a solid flight climbing toward +z
// between stepped side walls, under a round arch of voussoirs with a keystone and faint
// daylight in its opening. Down is a curbed stairwell whose steps darken as they sink
// into a black shaft with nothing to guard it.
// Risers are laid as jointed blocks, and treads have an overhanging nosing. The stone
// is roughened by position-keyed noise, and its weathering is baked into vertex colours:
// mottling, treads worn pale down the middle, grime at the back of each tread, moss at
// the foot and in the corners, and the stairwell's depth. The iron is rusty in patches.
// The seed (usually the map cell) varies the stone tint, joints, rubble and weathering.
// Static parts are merged into one mesh per material (`userData.part` is stone, iron
// and glow for up, stone and void for down). Everything stays inside its tile.
export function createStairs(direction='up',seed=0){
 const up=direction!=='down';
 const g=new THREE.Group();g.name=up?'Stairs up':'Stairs down';
 const materials=[],geometries=[];
 const rand=(i)=>{const s=Math.sin(seed*12.9898+i*78.233)*43758.5453;return s-Math.floor(s);};
 const off=rand(99)*50,tint=.9+rand(98)*.2;
 const stone=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9});
 const iron=new THREE.MeshStandardMaterial({vertexColors:true,metalness:.7,roughness:.45});
 const glow=new THREE.MeshBasicMaterial({color:0xffe3a8,vertexColors:true,transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide});
 const voidMat=new THREE.MeshBasicMaterial({color:0x020303});
 const parts=up?{stone,iron,glow}:{stone,void:voidMat};
 materials.push(...Object.values(parts));
 const bins=new Map(Object.values(parts).map(m=>[m,[]]));
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s=new THREE.Vector3();
 const place=(geo,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>geo.applyMatrix4(m4.compose(v.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s.set(sx,sy,sz)));
 const put=(geo,m,{paint=null,tint:t=1}={})=>{geo.userData.paint=paint;geo.userData.tint=t;bins.get(m).push(geo);return geo;};
 // Roughen by a position-keyed noise, so shared corners move together and no cracks open.
 const roughen=(geo,amt=.0025)=>{
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   p.setXYZ(i,x+(noise3(x*31+off,y*31,z*31)-.5)*amt*2,y+(noise3(y*29+7,z*29,x*29+off)-.5)*amt*2,z+(noise3(z*33+3+off,x*33,y*33)-.5)*amt*2);
  }
  if(geo.index)geo.computeVertexNormals();
  return geo;
 };
 const block=(w,h,d,x,y,z,{r=.012,rx=0,ry=0,rz=0,t=1,rough=.0025,paint=null}={})=>
  put(roughen(place(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/2,h/2,d/2)),x,y,z,rx,ry,rz),rough),stone,{tint:t,paint});
 // A row of dressed blocks along x or z with thin joints between them.
 const course=(axis,from,to,cuts,h,d,x,y,z,opts={})=>{
  const edges=[from,...cuts,to];
  for(let i=0;i<edges.length-1;i++){
   const a=edges[i]+(i?.003:0),b=edges[i+1]-(i<edges.length-2?.003:0),mid=(a+b)/2,len=b-a;
   const o={...opts,t:(opts.t||1)*(.94+rand(i*7+x*13+z*17+y*5)*.12)};
   if(axis==='x')block(len,h,d,mid,y,z,o);else block(d,h,len,x,y,mid,o);
  }
 };
 const rust=(x,y,z)=>{
  const k=.75+noise3(x*60+off,y*60,z*60)*.35,r=noise3(x*35,y*35+off,z*35);
  let c=[.2*k,.22*k,.23*k];
  if(r>.55){const f=Math.min(1,(r-.55)*4);c=c.map((a,j)=>a+([.36,.18,.09][j]*k-a)*f);}
  return c;
 };

 if(up){
  const steps=5,rise=.095,run=.15,z0=-.3;
  // Steps built from the floor so nothing floats: a riser of two jointed blocks, then
  // a tread whose nosing overhangs the step below.
  for(let i=0;i<steps;i++){
   const top=(i+1)*rise,z=z0+i*run,body=top-.022;
   const cut=(rand(i+1)-.5)*.3;
   course('x',-.31,.31,[cut],body,run+.004,0,body/2,z,{r:.01,t:i%2?1:.9});
   block(.62,.026,run+.016,0,top-.013,z-.006,{r:.01});
  }
  // Stepped side walls, each course capped with a slightly wider coping stone.
  for(const x of [-.37,.37]){
   for(let i=0;i<steps;i++){
    const top=(i+1)*rise+.07,z=z0+i*run;
    block(.1,top-.025,run-.002,x,(top-.025)/2,z,{r:.01,t:.85+rand(i+x*9+20)*.1});
    block(.13,.025,run+.008,x,top-.0125,z,{r:.008,t:1.05});
   }
  }
  // A round arch at the head of the flight frames the way out of the level: pillars
  // with plinths and capitals, nine voussoirs and a proud keystone.
  const archZ=.38,spring=.44,r0=.31,r1=.43,depth=.13;
  for(const x of [-.37,.37]){
   block(.15,.06,.15,x,.03,archZ,{r:.012,t:.9});
   block(.12,spring-.1,.12,x,.06+(spring-.1)/2,archZ,{r:.01,t:.88});
   block(.15,.04,.15,x,spring-.02,archZ,{r:.01,t:1.02});
  }
  const n=9,gap=.012;
  for(let i=0;i<n;i++){
   const key=i===(n-1)/2,a0=Math.PI*i/n+gap/2,a1=Math.PI*(i+1)/n-gap/2,out=key?r1+.035:r1,d=key?depth+.03:depth;
   const shape=new THREE.Shape();
   shape.moveTo(Math.cos(a0)*r0,Math.sin(a0)*r0);
   shape.lineTo(Math.cos(a0)*out,Math.sin(a0)*out);
   shape.absarc(0,0,out,a0,a1,false);
   shape.lineTo(Math.cos(a1)*r0,Math.sin(a1)*r0);
   shape.absarc(0,0,r0,a1,a0,true);
   const geo=new THREE.ExtrudeGeometry(shape,{depth:d-.008,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,curveSegments:4});
   geo.translate(0,0,-(d-.008)/2);
   put(roughen(place(geo,0,spring,archZ),.002),stone,{tint:key?1.12:.92+rand(i+40)*.12});
  }
  // Faint daylight spilling down from above, filling the arch and brightest at its crown.
  {
   // The top step stands a little above the springline, so only the arc above it glows.
   const top=steps*rise,a=Math.asin((top-spring)/r0),shape=new THREE.Shape();
   shape.moveTo(-Math.cos(a)*r0,top);shape.absarc(0,spring,r0,a,Math.PI-a,false);shape.lineTo(-Math.cos(a)*r0,top);
   const geo=new THREE.ShapeGeometry(shape,16);geo.translate(0,0,archZ);
   put(geo,glow,{paint:(x,y)=>{const f=.45+.55*Math.min(1,Math.max(0,(y-top)/(spring+r0-top)));return [f,f,f];}});
  }
  // An iron ring on a staple and backplate, bolted to the right pillar.
  put(place(new THREE.BoxGeometry(.05,.07,.008),.37,.3,archZ-.064),iron,{paint:rust});
  put(place(new THREE.TorusGeometry(.01,.004,6,10),.37,.325,archZ-.07,0,Math.PI/2,0),iron,{paint:rust});
  put(place(new THREE.TorusGeometry(.04,.008,8,18),.37,.285,archZ-.074,.18,0,0),iron,{paint:rust});
  for(const [dx,dy] of [[-.017,.027],[.017,.027],[-.017,-.027],[.017,-.027]])
   put(place(new THREE.SphereGeometry(.006,6,4),.37+dx,.3+dy,archZ-.068,0,0,0,1,1,.5),iron,{paint:rust});
  // Rubble and chips fallen at the foot of the flight.
  for(let i=0;i<6;i++){
   const x=-.3+rand(i+60)*.6,z=-.41-rand(i+70)*.06,size=.009+rand(i+80)*.012;
   put(roughen(place(new THREE.DodecahedronGeometry(size,0),x,size*.55,z,rand(i+90)*3,rand(i+91)*3,0,1,.65,1),.0015),stone,{tint:.85+rand(i+92)*.2});
  }
 }else{
  const hx=.28,hz=.34,curb=.11,wall=.1;
  // The shaft darkens toward the far (-z) end, as the old steps did one by one.
  const deep=(x,y,z,nn)=>{const c=stoneColour(x,y,z,nn,off),f=.25+.75*Math.min(1,Math.max(0,(z+hz)/(2*hz)))*Math.min(1,.55+Math.max(0,y)*6);return c.map(a=>a*f);};
  // A raised curb of dressed stones around the opening; the near end is low and worn.
  const sideLen=hz*2+wall*2;
  for(const x of [-(hx+wall/2),hx+wall/2]){
   const a=rand(x>0?1:2),cuts=[-sideLen/2+sideLen*(.3+a*.08),-sideLen/2+sideLen*(.64+a*.06)];
   course('z',-sideLen/2,sideLen/2,cuts,curb,wall,x,curb/2,0,{r:.012});
  }
  course('x',-hx,hx,[(rand(3)-.5)*.2],curb,wall,0,curb/2,-(hz+wall/2),{r:.012});
  course('x',-hx,hx,[(rand(4)-.5)*.2],curb*.55,wall,0,curb*.275,hz+wall/2,{r:.014,t:1.12,rough:.0035});
  // The black shaft at floor level, and its inner faces fading to black.
  put(place(new THREE.PlaneGeometry(hx*2,hz*2),0,.004,0,-Math.PI/2),voidMat);
  for(const x of [-hx,hx])put(place(new THREE.PlaneGeometry(hz*2,curb,6,2),x*.995,curb/2,0,0,x<0?Math.PI/2:-Math.PI/2,0),stone,{paint:(px,py,pz,nn)=>deep(px,py*.3-.02,pz,nn).map(c=>c*.45)});
  put(place(new THREE.PlaneGeometry(hx*2,curb,4,2),0,curb/2,-hz*.995),stone,{paint:(px,py,pz,nn)=>deep(px,py*.3-.02,pz,nn).map(c=>c*.45)});
  // Steps start at the open (low-curb) end and descend toward -z, each with a nosing.
  const steps=5,run=hz*2/steps;
  for(let i=0;i<steps;i++){
   const top=.05-i*.01,z=hz-run*(i+.5);
   block(hx*2-.01,top-.008,run-.004,0,(top-.008)/2,z+.002,{r:.006,paint:deep});
   block(hx*2-.012,.009,run+.008,0,top-.0045,z+.004,{r:.004,paint:deep});
  }
 }

 // Bake: vertex-coloured bins get their colours, then every bin becomes one mesh.
 const nrm=new THREE.Vector3();
 for(const [material,list] of bins){
  if(!list.length)continue;
  const flats=list.map(geo=>{
   const {paint,tint:t}=geo.userData;
   const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
   if(!flat.attributes.normal)flat.computeVertexNormals();
   for(const key of Object.keys(flat.attributes))if(!['position','normal'].includes(key))flat.deleteAttribute(key);
   if(material.vertexColors){
    const p=flat.attributes.position,nor=flat.attributes.normal,col=new Float32Array(p.count*3);
    const f=paint||((x,y,z,nn)=>stoneColour(x,y,z,nn,off));
    const k=t*(material===stone?tint:1);
    for(let i=0;i<p.count;i++){nrm.fromBufferAttribute(nor,i);const c=f(p.getX(i),p.getY(i),p.getZ(i),nrm);col[i*3]=c[0]*k;col[i*3+1]=c[1]*k;col[i*3+2]=c[2]*k;}
    flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   }
   return flat;
  });
  const geo=mergeGeometries(flats);flats.forEach(f=>f.dispose());geometries.push(geo);
  const mesh=new THREE.Mesh(geo,material);
  mesh.castShadow=material===stone||material===iron;mesh.receiveShadow=material===stone;
  mesh.userData.part=Object.keys(parts).find(key=>parts[key]===material);
  g.add(mesh);
 }
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}

// Grey-green dungeon stone: mottled, darker underneath and in the grime at the back of
// each tread, worn pale and smooth down the middle of the treads, with moss creeping in
// at floor level and into the corners where feet don't reach.
export function stoneColour(x,y,z,n,off){
 let k=.82+noise3(x*14+off,y*14,z*14)*.3+(noise3(x*90,y*90+off,z*90)-.5)*.12;
 if(n.y<-.5)k*=.6;
 let r=.44*k,g=.48*k,b=.46*k;
 if(n.y>.6){
  // Tread wear: a pale polished lane down the centre, fading out toward the walls.
  const lane=Math.max(0,1-Math.abs(x+(noise3(z*20+off,1,2)-.5)*.05)/.2);
  const t=lane*lane*.6;r+=(.6-r)*t;g+=(.6-g)*t;b+=(.56-b)*t;
 }else if(Math.abs(n.y)<.5){
  // Vertical faces: grime settles low and in streaks.
  const streak=noise3(x*50+off,y*4,z*50);if(streak>.6){const f=1-(streak-.6)*1.1;r*=f;g*=f;b*=f;}
 }
 const moss=Math.max(Math.max(0,1-y/.06),Math.max(0,(Math.abs(x)-.24)/.1)*(n.y>.3?.9:.4))*noise3(x*28,y*28+off,z*28);
 if(moss>.4){const t=Math.min(1,(moss-.4)*3.5);r+=(.17-r)*t;g+=(.24-g)*t;b+=(.11-b)*t;}
 return [r,g,b];
}

function hash3(x,y,z){const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s);}
export function noise3(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
 const fx=x-ix,fy=y-iy,fz=z-iz,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy),uz=fz*fz*(3-2*fz);
 const l=(a,b,t)=>a+(b-a)*t;
 const c=(dx,dy,dz)=>hash3(ix+dx,iy+dy,iz+dz);
 return l(l(l(c(0,0,0),c(1,0,0),ux),l(c(0,1,0),c(1,1,0),ux),uy),l(l(c(0,0,1),c(1,0,1),ux),l(c(0,1,1),c(1,1,1),ux),uy),uz);
}
