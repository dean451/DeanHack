import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {chainAlong,LINK_STEP} from './iron-ball.js';

// Drawbridges over a moat that runs along x, so the planks run along z.
// Lowered: five warped oak planks sag a little between the banks, held by three riveted
// iron straps, with hinge knuckles on an axle at the near end, an iron-shod leading edge,
// and the two heavy lifting chains shackled to the far corners and lying slack along the
// deck edges back toward the gatehouse.
// Raised: the same planks stand as a wall with a Z-brace on the back, straps and rivets
// on the front, hinges at the foot and the lifting chains pulled taut from the top corners
// back over the top toward the gatehouse.
// Weathering is baked into vertex colours: grain streaks and knots along each plank, dark
// end grain, a pale worn lane down the middle of the deck, damp grime and green slime
// near the water, rust on the iron and rust stains bleeding into the wood under the straps.
// Static parts are merged into one mesh per material (`userData.part` is wood, iron or water).
export function createDrawbridge(raised=false,seed=0){
 const g=new THREE.Group();g.name=raised?'Raised drawbridge':'Lowered drawbridge';
 const materials=[],geometries=[];
 const mat=(o)=>{const m=new THREE.MeshStandardMaterial(o);materials.push(m);return m;};
 const wood=mat({vertexColors:true,roughness:.88});
 const iron=mat({vertexColors:true,metalness:.6,roughness:.5});
 const water=mat({color:0x0c161c,roughness:.3});
 const parts={wood,iron,water};
 const bins=new Map(Object.values(parts).map(m=>[m,[]]));
 const rand=(i)=>{const s=Math.sin(seed*12.9898+i*78.233)*43758.5453;return s-Math.floor(s);};
 const off=rand(99)*50;
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s=new THREE.Vector3();
 const place=(geo,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>geo.applyMatrix4(m4.compose(v.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s.set(sx,sy,sz)));
 // Wood keeps its plank's tint and grain phase so neighbouring planks don't match.
 const put=(geo,m,info={})=>{geo.userData.info=info;bins.get(m).push(geo);return geo;};
 const roughen=(geo,amt)=>{
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   p.setXYZ(i,x+(noise3(x*23+off,y*23,z*23)-.5)*amt*2,y+(noise3(y*21+7,z*21,x*21+off)-.5)*amt*2,z+(noise3(z*25+3+off,x*25,y*25)-.5)*amt*2);
  }
  geo.computeVertexNormals();
  return geo;
 };
 const TINTS=[[.15,.075,.03],[.125,.065,.027],[.17,.09,.036]];
 const rivet=(x,y,z,rx=0,rz=0)=>put(place(new THREE.SphereGeometry(.013,7,4,0,Math.PI*2,0,Math.PI/2),x,y,z,rx,0,rz,1,.6,1),iron);
 const knuckles=(y,z,rx,py=0,pz=0)=>{
  for(let i=0;i<3;i++)put(place(new THREE.CylinderGeometry(.022,.022,.16,10),(i-1)*.34,y,z,0,0,Math.PI/2),iron);
  for(let i=0;i<3;i++)put(place(new THREE.BoxGeometry(.1,.008,.09),(i-1)*.34,y+py,z+pz,rx),iron);
 };

 put(place(new THREE.PlaneGeometry(.98,.98),0,.002,0,-Math.PI/2),water);
 const BANDS=raised?[.14,.52,.9]:[-.36,0,.36];

 if(!raised){
  // Deck: the planks sag between the banks and each twists a little on its own.
  const sag=(z)=>.007*(1-Math.min(1,(z/.5)**2));
  const TOP=.07;
  for(let i=0;i<5;i++){
   const w=.166+rand(i)*.01,len=.96+rand(i+5)*.02,x=(i-2)*.185+(rand(i+10)-.5)*.006,twist=(rand(i+15)-.5)*.012;
   const geo=new THREE.BoxGeometry(w,.06,len,3,1,14);
   roughen(geo,.0015);
   const p=geo.attributes.position;
   for(let k=0;k<p.count;k++){const z=p.getZ(k)+(rand(i+20)-.5)*.016;p.setXYZ(k,p.getX(k)+x,p.getY(k)+TOP-.03-sag(z)+twist*p.getX(k)/w*z,z);}
   geo.computeVertexNormals();
   put(geo,wood,{tint:TINTS[(i+Math.floor(rand(30)*3))%3],phase:i*17.3,axis:'z'});
  }
  // Straps follow the sag, with a rivet over each plank.
  for(const z of BANDS){
   const y=TOP-sag(z)+.006;
   put(roughen(place(new THREE.BoxGeometry(.94,.012,.058,12,1,1),0,y,z),.0008),iron);
   for(let i=0;i<5;i++)rivet((i-2)*.185,y+.006,z);
  }
  // Hinge knuckles on an axle across the near bank, capped at both ends.
  knuckles(.07,-.47,0,.006,.04);
  put(place(new THREE.CylinderGeometry(.013,.013,.9,10),0,.07,-.47,0,0,Math.PI/2),iron);
  for(const x of [-.45,.45])put(place(new THREE.CylinderGeometry(.024,.024,.012,10),x,.07,-.47,0,0,Math.PI/2),iron);
  // The leading edge is shod in iron: a strap over the plank ends and a lip down their faces.
  put(roughen(place(new THREE.BoxGeometry(.94,.01,.05,12,1,1),0,TOP-sag(.455)+.005,.455),.0008),iron);
  put(roughen(place(new THREE.BoxGeometry(.94,.056,.008,12,1,1),0,TOP-.028,.494),.0006),iron);
  for(let i=0;i<5;i++)rivet((i-2)*.185,TOP-sag(.455)+.01,.455);
  // The lifting chains: shackled to rings on staples at the far corners, then lying slack
  // along the deck edges back to the hinge, where they rise off toward the gatehouse.
  const deck=(x,z)=>Math.abs(x)<.48&&Math.abs(z)<.49?TOP-sag(z)+(BANDS.some(b=>Math.abs(z-b)<.035)?.012:0):0;
  for(const side of [-1,1]){
   const x=side*.44;
   put(place(new THREE.BoxGeometry(.03,.012,.05),x,TOP-sag(.42)+.006,.42),iron);
   put(place(new THREE.TorusGeometry(.03,.009,6,14),x,TOP+.03,.42,0,Math.PI/2,0),iron);
   const curve=new THREE.CatmullRomCurve3([
    [x,0,.39],[x-side*.012,0,.3],[x+side*.004,0,.14],[x-side*.018,0,-.04],[x-side*.006,0,-.22],[x+side*.008,0,-.36],[x,.075,-.48]
   ].map(p=>new THREE.Vector3(...p)),false,'centripetal');
   for(const geo of chainAlong(curve,Math.floor(curve.getLength()/(LINK_STEP*1.15)),{seed:seed+side*3,size:1.15,ground:deck,detail:[16,4]}))put(geo,iron);
  }
 }else{
  // Wall: planks standing on the hinge line with the straps on the moat-side (+z) face.
  const Z=-.1;
  for(let i=0;i<5;i++){
   const w=.18+rand(i)*.006,h=1.0+rand(i+5)*.03,x=(i-2)*.188+(rand(i+10)-.5)*.004;
   const geo=roughen(place(new THREE.BoxGeometry(w,h,.1,3,14,1),x,h/2+.004,Z,(rand(i+15)-.5)*.01),.0015);
   put(geo,wood,{tint:TINTS[(i+Math.floor(rand(30)*3))%3],phase:i*17.3,axis:'y'});
  }
  // Z-brace on the back: two rails and a diagonal between them, pegged at the ends.
  for(const y of [.2,.84])put(roughen(place(new THREE.BoxGeometry(.9,.1,.035,8,1,1),0,y,Z-.068),.0012),wood,{tint:TINTS[1],phase:61,axis:'x'});
  const dx=.7,dy=.54,diag=Math.hypot(dx,dy);
  put(roughen(place(new THREE.BoxGeometry(diag,.09,.035,10,1,1),0,.52,Z-.068,0,0,Math.atan2(dy,dx)),.0012),wood,{tint:TINTS[2],phase:83,axis:'d'});
  for(const [x,y] of [[-.35,.2],[.35,.84],[-.35,.84],[.35,.2]])put(place(new THREE.CylinderGeometry(.012,.012,.01,8),x,y,Z-.09,Math.PI/2),wood,{tint:TINTS[0],phase:97,axis:'x'});
  for(const y of BANDS){
   put(roughen(place(new THREE.BoxGeometry(.96,.058,.014,12,1,1),0,y,Z+.057),.0008),iron);
   for(let i=0;i<5;i++)rivet((i-2)*.188,y,Z+.064,Math.PI/2);
  }
  knuckles(.03,Z+.072,Math.PI/2,.04,-.02);
  // The lifting chains, pulled taut from eye plates at the top corners over the top of the
  // bridge and back toward the unseen gatehouse.
  for(const x of [-.4,.4]){
   put(place(new THREE.BoxGeometry(.06,.08,.014),x,.955,Z+.057),iron);
   rivet(x-.018,.935,Z+.064,Math.PI/2);rivet(x+.018,.935,Z+.064,Math.PI/2);
   put(place(new THREE.TorusGeometry(.022,.008,6,14),x,.985,Z+.075,0,Math.PI/2,0),iron);
   const curve=new THREE.CatmullRomCurve3([
    [x,1.0,Z+.08],[x,1.045,Z+.02],[x,1.055,Z-.1],[x,1.056,-.3],[x,1.058,-.48]
   ].map(p=>new THREE.Vector3(...p)),false,'centripetal');
   for(const geo of chainAlong(curve,Math.floor(curve.getLength()/(LINK_STEP*1.15)),{seed:seed+x*9,size:1.15,detail:[16,4]}))put(geo,iron);
  }
 }

 // Bake: strip to position and normal, paint vertex colours, merge one mesh per material.
 const n=new THREE.Vector3();
 for(const [material,list] of bins){
  const flats=list.map(geo=>{
   const info=geo.userData.info;
   const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
   for(const key of Object.keys(flat.attributes))if(!['position','normal'].includes(key))flat.deleteAttribute(key);
   if(material===water)return flat;
   const p=flat.attributes.position,nor=flat.attributes.normal,col=new Float32Array(p.count*3);
   for(let i=0;i<p.count;i++){
    n.fromBufferAttribute(nor,i);
    const c=material===wood?woodColour(p.getX(i),p.getY(i),p.getZ(i),n,info,off,raised,BANDS):ironColour(p.getX(i),p.getY(i),p.getZ(i),n,off);
    col[i*3]=c[0];col[i*3+1]=c[1];col[i*3+2]=c[2];
   }
   flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   return flat;
  });
  const geo=mergeGeometries(flats);flats.forEach(f=>f.dispose());geometries.push(geo);
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=material!==water;mesh.receiveShadow=true;
  mesh.userData.part=Object.keys(parts).find(key=>parts[key]===material);
  g.add(mesh);
 }
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}

// Oak: grain streaks run along the plank, with the odd dark knot and darker end grain.
// The lowered deck is rubbed pale down the middle; wood near the water is damp, grimy
// and green; rust bleeds out of the wood around (lowered) or below (raised) each strap.
function woodColour(x,y,z,n,info,off,raised,bands){
 const [tr,tg,tb]=info.tint;
 const along=info.axis==='z'?z:info.axis==='y'?y:info.axis==='x'?x:x+y;
 const across=info.axis==='z'?x+y*.5:info.axis==='y'?x+z*.5:y+z;
 let k=.82+noise3(across*90+info.phase,along*2.5+off,info.phase)*.3+(noise3(across*260,along*9,info.phase+off)-.5)*.16;
 if(noise3(across*18+info.phase,along*14,off)>.8)k*=.55;
 const endGrain=info.axis==='z'?Math.abs(n.z):info.axis==='y'?Math.abs(n.y):0;
 if(endGrain>.6)k*=.62;
 if(n.y<-.5)k*=.6;
 let r=tr*k,g=tg*k,b=tb*k;
 if(!raised&&n.y>.6){
  // Foot traffic: a paler, greyer lane down the middle of the deck.
  const lane=Math.max(0,1-Math.abs(x+(noise3(z*3+off,0,0)-.5)*.08)/.22)*(.55+.45*noise3(x*30,z*12+off,1));
  r+=(.2-r)*lane*.45;g+=(.14-g)*lane*.45;b+=(.08-b)*lane*.45;
 }
 const low=raised?Math.max(0,1-y/.22):Math.max(0,1-(y-.01)/.05)*(n.y>.6?0:1);
 if(low>0){const t=low*(.6+.4*noise3(x*25+off,y*25,z*25));r+=(.035-r)*t*.7;g+=(.05-g)*t*.7;b+=(.025-b)*t*.7;}
 let stain=0;
 for(const band of bands){
  const d=raised?band-.03-y:Math.abs(z-band)-.03;
  const reach=raised?.09:.025;
  if(d>=0&&d<reach&&(raised?n.z>.3:n.y>.3))stain=Math.max(stain,(1-d/reach)*noise3(x*60+off,y*20,z*60));
 }
 if(stain>0){const t=Math.min(1,stain*1.4)*.7;r+=(.17-r)*t;g+=(.065-g)*t;b+=(.025-b)*t;}
 return [r,g,b];
}

// Wrought iron: dark blue-grey with a hammered mottle and patches of orange-brown rust.
function ironColour(x,y,z,n,off){
 const k=.85+noise3(x*40+off,y*40,z*40)*.3;
 let r=.04*k,g=.045*k,b=.05*k;
 const patch=noise3(x*20+off,y*20,z*20+5)*.75+noise3(x*70,y*70+off,z*70)*.25;
 const rust=Math.min(1,Math.max(0,(patch+Math.max(0,1-y/.2)*.25-.56)*3));
 if(rust>0){const deep=noise3(x*110+off,y*110,z*110)>.5;const [rr,rg,rb]=deep?[.16,.06,.022]:[.23,.095,.034];r+=(rr-r)*rust;g+=(rg-g)*rust;b+=(rb-b)*rust;}
 if(n.y<-.5){r*=.6;g*=.6;b*=.6;}
 return [r,g,b];
}

function hash3(x,y,z){const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s);}
function noise3(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
 const fx=x-ix,fy=y-iy,fz=z-iz,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy),uz=fz*fz*(3-2*fz);
 const l=(a,b,t)=>a+(b-a)*t;
 const c=(dx,dy,dz)=>hash3(ix+dx,iy+dy,iz+dz);
 return l(l(l(c(0,0,0),c(1,0,0),ux),l(c(0,1,0),c(1,1,0),ux),uy),l(l(c(0,0,1),c(1,0,1),ux),l(c(0,1,1),c(1,1,1),ux),uy),uz);
}
