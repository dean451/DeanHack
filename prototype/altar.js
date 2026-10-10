import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createFire} from './fire.js';

// An altar for the `altar` terrain: a low, brutal sacrificial slab on a two-step dais,
// its short corner posts and sunken rune panels weathered and filthy. Dried blood crusts
// the top, runs down the front and pools on the floor; a skull sits on the slab and bones
// and ribs lie scattered about it. On top: a brass brazier of glowing coals, four stubby
// candles, a chalice and a few coins. Stone weathering is baked into vertex colours.
// Static parts are merged into one mesh per material; only the candle flames are
// separate (they animate through `updateFire`). It faces +z and stays in its tile.
// Height of the slab's top face, so live.js can rest items lying on the altar on it.
export const ALTAR_TOP=.345;

export function createAltar(){
 const g=new THREE.Group();g.name='Altar of the Last Ember';
 const materials=[],geometries=[];
 const mat=(o)=>{const m=new THREE.MeshStandardMaterial(o);materials.push(m);return m;};
 const stone=mat({vertexColors:true,roughness:.93});
 const brass=mat({color:0xb79455,metalness:.78,roughness:.4});
 const blood=mat({color:0x4a0a0a,roughness:.3,metalness:.1});
 const bone=mat({color:0xb5a98c,roughness:.88});
 const wax=mat({color:0xdac49a,roughness:.72});
 const ember=mat({color:0xffc27a,emissive:0xff7a22,emissiveIntensity:2.6,roughness:.8});
 const bins=new Map([[stone,[]],[brass,[]],[blood,[]],[bone,[]],[wax,[]],[ember,[]]]);
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s=new THREE.Vector3();
 // Queue a geometry into its material's bin, placed by position, rotation and scale.
 // `tint` darkens or lightens the baked stone colour of that one part.
 const put=(geo,m,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx,tint=1)=>{
  geo.applyMatrix4(m4.compose(v.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s.set(sx,sy,sz)));
  geo.userData.tint=tint;bins.get(m).push(geo);return geo;
 };
 // A stone block with its surface roughened by a position-keyed noise, so shared
 // corners move together and no cracks open between faces.
 const block=(w,h,d,x,y,z,{r=.012,tint=1,rough=.0035}={})=>{
  const geo=new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/2,h/2,d/2));
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const px=p.getX(i)+x,py=p.getY(i)+y,pz=p.getZ(i)+z;
   p.setXYZ(i,p.getX(i)+(noise3(px*31,py*31,pz*31)-.5)*rough*2,p.getY(i)+(noise3(py*29+7,pz*29,px*29)-.5)*rough*2,p.getZ(i)+(noise3(pz*33+3,px*33,py*33)-.5)*rough*2);
  }
  geo.computeVertexNormals();
  return put(geo,stone,x,y,z,0,0,0,1,1,1,tint);
 };
 const lathe=(profile,seg=18)=>new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),seg);

 // Dais: two broad steps.
 block(.92,.06,.86,0,.03,0,{r:.016,tint:.92});
 block(.82,.06,.74,0,.09,0,{r:.014,tint:.97});
 // Body: a block with corner pilasters (base, shaft, capital) and a moulded lip.
 block(.66,.14,.54,0,.19,0,{r:.01});
 for(const x of [-.31,.31])for(const z of [-.25,.25])block(.1,.16,.1,x,.19,z,{r:.012,tint:.9});
 block(.76,.025,.62,0,.2725,0,{r:.01,tint:1.04});
 // Sunken rune panels on the sides: a dark recess with a pale carved ember sign.
 for(const sx of [-1,1]){
  block(.012,.09,.28,sx*.328,.19,0,{r:.004,tint:.55,rough:.001});
  block(.008,.06,.018,sx*.335,.19,0,{r:.003,tint:1.35,rough:0});
  block(.008,.012,.1,sx*.335,.16,0,{r:.003,tint:1.35,rough:0});
 }
 // Leaning strokes of the ember sign (tilted, so placed by hand).
 for(const sx of [-1,1])for(const a of [-1,1]){
  const geo=new RoundedBoxGeometry(.008,.04,.014,1,.003);
  put(geo,stone,sx*.335,.215,a*.035,a*.55,0,0,1,1,1,1.35);
 }
 // Mensa: the overhanging top slab.
 block(.84,.06,.68,0,.315,0,{r:.016,tint:1.02});
 const top=ALTAR_TOP;

 // Blood: a dried crust and a fresh pool on the slab, runs down the front and a
 // spreading stain on the floor. Bones: a skull on the slab, long bones and ribs
 // scattered about the dais.
 {
  const pool=(x,y,z,r,sz=1)=>put(new THREE.CylinderGeometry(r,r*1.1,.004,12),blood,x,y,z,0,x*7+z*5,0,1,1,sz);
  pool(-.05,top+.002,.12,.17,.7);pool(.16,top+.002,-.02,.09);pool(-.2,top+.002,-.1,.07,1.3);
  for(const [x,len] of [[-.2,.13],[-.08,.2],[.04,.09],[.17,.16],[.28,.1]]){
   put(new THREE.BoxGeometry(.026,len,.006),blood,x,top-len/2,.343);
   put(new THREE.SphereGeometry(.015,6,4),blood,x,top-len,.347,0,0,0,1,.8,.5);
  }
  pool(-.3,.005,.36,.09,.8);pool(.34,.005,.32,.08);pool(.02,.003,.38,.1,.4);
  // Skull on the slab, jaw agape.
  const sx=.27,sz=.03;
  put(new THREE.SphereGeometry(.032,8,6),bone,sx,top+.03,sz,0,-.5,0,1,.9,1.05);
  put(new THREE.BoxGeometry(.034,.016,.03),bone,sx+.01,top+.01,sz+.02,0,-.5,0);
  for(const o of [-.012,.012])put(new THREE.SphereGeometry(.007,5,4),stone,sx+.02-o*.4,top+.036,sz+.026+o*.9,0,0,0,1,1,.6,.1);
  // A long bone: shaft with a knob at each end.
  const longBone=(x,y,z,ry,len)=>{
   put(new THREE.CylinderGeometry(.007,.007,len,5),bone,x,y,z,0,ry,Math.PI/2);
   for(const k of [-1,1])for(const j of [-.006,.006])put(new THREE.SphereGeometry(.011,5,4),bone,x+Math.cos(ry)*k*len/2,y,z-Math.sin(ry)*k*len/2+j);
  };
  longBone(-.3,top+.008,.2,.4,.2);
  for(const [x,z,ry,len] of [[-.36,.1,.9,.16],[.36,-.12,2.2,.14],[-.1,.4,0,.2],[.3,.38,0,.14],[-.36,-.3,1.5,.14],[.12,-.38,0,.14]])longBone(x,.014,z,ry,len);
  // Ribs: half-hoops standing from the floor.
  for(const [x,z,ry] of [[.4,.25,.3],[.35,.3,.45],[-.4,.36,2],[-.1,-.4,1]])put(new THREE.TorusGeometry(.03,.005,4,8,Math.PI),bone,x,.006,z,0,ry,0);
  // Skulls on the floor.
  for(const [x,z,ry] of [[.38,.38,.8],[-.4,-.1,2.5]]){
   put(new THREE.SphereGeometry(.03,8,6),bone,x,.036,z,0,ry,0,1,.9,1.05);
   put(new THREE.BoxGeometry(.03,.014,.026),bone,x+Math.cos(ry)*.012,.012,z-Math.sin(ry)*.012,0,ry,0);
  }
 }

 // Brazier: a footed brass dish on three claw feet, heaped with coals, some glowing.
 {
  const bz=.02;
  // Where the coal heap sits, for altar-embers.js.
  g.userData.brazier={x:0,y:top+.085,z:bz,r:.07};
  for(let k=0;k<3;k++){const a=k/3*Math.PI*2+.4;put(new THREE.SphereGeometry(.012,8,6),brass,Math.cos(a)*.06,top+.01,bz+Math.sin(a)*.06,0,0,0,1,.8,1);}
  put(lathe([[0,.012],[.03,.012],[.024,.02],[.02,.034],[.05,.04],[.1,.07],[.108,.078],[.104,.082],[.094,.074],[.05,.05],[0,.05]],24),brass,0,top,bz);
  let k=0;
  for(let ring=0;ring<3;ring++){const n=[1,6,10][ring],r=[0,.035,.068][ring];
   for(let i=0;i<n;i++,k++){const a=i/n*Math.PI*2+ring,h=[.09,.083,.076][ring];
    const glow=(k*7)%3!==0;
    put(new THREE.DodecahedronGeometry(.018+((k*13)%5)*.002,0),glow?ember:stone,Math.cos(a)*r,top+h,bz+Math.sin(a)*r,k,k*2,k*.5,1,.75,1,.18);}
  }
 }

 // Candles in brass sticks at the back corners, each with running wax and a flame.
 const flames=[];
 for(const [x,z,h] of [[-.3,-.16,.12],[-.21,-.24,.08],[.29,-.17,.14],[.2,-.25,.09]]){
  put(lathe([[0,0],[.045,0],[.046,.008],[.03,.014],[.012,.022],[.016,.032],[.011,.04],[.012,.05],[.036,.054],[.038,.06],[.028,.061],[0,.061]],16),brass,x,top,z);
  const base=top+.06;
  put(lathe([[0,0],[.026,0],[.027,h*.5],[.025,h],[.02,h+.004],[.008,h+.002],[0,h+.006]],14),wax,x,base,z);
  // A pool of wax on the drip pan and runs down the side.
  put(new THREE.SphereGeometry(.034,14,6,0,Math.PI*2,0,Math.PI/2),wax,x,base-.002,z,0,0,0,1,.18,1);
  for(let i=0;i<3;i++){const a=i*2.1+x*9,len=h*(.3+i*.14);
   put(new THREE.CapsuleGeometry(.006,len,3,6),wax,x+Math.cos(a)*.026,base+h-len/2-.01,z+Math.sin(a)*.026);}
  put(new THREE.CylinderGeometry(.0015,.0015,.012,4),stone,x,base+h+.008,z,0,0,0,1,1,1,.12);
  const flame=createFire(h*13);flame.position.set(x,base+h+.004,z);flame.scale.setScalar(.2);g.add(flame);flames.push(flame);
 }

 // Offerings: a chalice at the front right and a few coins at the front left.
 put(lathe([[0,0],[.03,0],[.031,.004],[.012,.01],[.007,.02],[.012,.03],[.007,.04],[.01,.05],[.03,.064],[.036,.088],[.033,.089],[.028,.068],[.0,.058]],18),brass,.27,top,.19);
 for(const [x,z,r] of [[-.25,.2,.3],[-.28,.24,1.2],[-.22,.25,2.2]])put(new THREE.CylinderGeometry(.017,.017,.004,14),brass,x,top+.002+(x===-.28?.004:0),z,x===-.28?.25:0,r,0);

 // Bake: stone gets its weathering colours, then every bin becomes one mesh.
 const n=new THREE.Vector3();
 for(const [material,list] of bins){
  if(!list.length)continue;
  const parts=list.map(geo=>{
   const tint=geo.userData.tint??1;
   const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
   for(const key of Object.keys(flat.attributes))if(!['position','normal','color'].includes(key))flat.deleteAttribute(key);
   if(material===stone){
    const p=flat.attributes.position,nor=flat.attributes.normal,col=new Float32Array(p.count*3);
    for(let i=0;i<p.count;i++){n.fromBufferAttribute(nor,i);const [r,gg,b]=stoneColour(p.getX(i),p.getY(i),p.getZ(i),n,tint);col[i*3]=r;col[i*3+1]=gg;col[i*3+2]=b;}
    flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   }else flat.deleteAttribute('color');
   return flat;
  });
  const geo=mergeGeometries(parts);parts.forEach(p=>p.dispose());geometries.push(geo);
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=material!==ember;mesh.receiveShadow=true;
  mesh.userData.part=material===stone?'stone':material===brass?'brass':material===blood?'blood':material===bone?'bone':material===wax?'wax':'coals';
  g.add(mesh);
 }
 g.userData.flames=flames;
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}

// Weathered blue-grey stone: mottled and gritty, with dark mineral seams, worn pale
// tops, grime at the foot and shade on faces that look down under an overhang.
function stoneColour(x,y,z,n,tint){
 let k=.82+noise3(x*14,y*14,z*14)*.3+(noise3(x*90,y*90,z*90)-.5)*.12;
 const seam=Math.abs(noise3(x*5+y*2.5,y*3,z*5)-.5);if(seam<.025)k*=.55+seam*14;
 if(n.y>.7)k*=1.14;
 if(n.y<-.5)k*=.62;
 k*=.72+.28*Math.min(1,y/.16);
 k*=tint;
 const warm=noise3(x*6+11,y*6,z*6)*.04;
 return [.215*k+warm,.228*k+warm*.6,.26*k];
}

function hash3(x,y,z){const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s);}
function noise3(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
 const fx=x-ix,fy=y-iy,fz=z-iz,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy),uz=fz*fz*(3-2*fz);
 const l=(a,b,t)=>a+(b-a)*t;
 const c=(dx,dy,dz)=>hash3(ix+dx,iy+dy,iz+dz);
 return l(l(l(c(0,0,0),c(1,0,0),ux),l(c(0,1,0),c(1,1,0),ux),uy),l(l(c(0,0,1),c(1,0,1),ux),l(c(0,1,1),c(1,1,1),ux),uy),uz);
}
