import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Iron bars for the `bars` terrain: a forged grille standing on a dressed stone sill.
// Two square stiles with collars and ball finials frame seven round uprights that
// pass through three riveted flat rails and end in spear points above the top rail.
// The seed bends one upright outward (someone has tried to squeeze through), picks
// where the sill's joint falls and scatters the rust. Rust is baked into vertex
// colours: dark forged iron, orange scale gathering low down and around the rivets,
// rubbed bright at hand height, and rust stains running down the sill under each bar.
// The grille runs along x and is thin in z; the caller turns it to follow the wall.
// Static parts are merged into one mesh per material (`userData.part` is iron or stone).
export function createBars(seed=0){
 const g=new THREE.Group();g.name='Iron bars';
 const materials=[],geometries=[];
 const mat=(o)=>{const m=new THREE.MeshStandardMaterial(o);materials.push(m);return m;};
 const iron=mat({vertexColors:true,metalness:.62,roughness:.5});
 const stone=mat({vertexColors:true,roughness:.92});
 const parts={iron,stone};
 const bins=new Map(Object.values(parts).map(m=>[m,[]]));
 const rand=(i)=>{const s=Math.sin(seed*12.9898+i*78.233)*43758.5453;return s-Math.floor(s);};
 const off=rand(99)*50;
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s=new THREE.Vector3();
 const place=(geo,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>geo.applyMatrix4(m4.compose(v.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s.set(sx,sy,sz)));
 const put=(geo,m,tint=1)=>{geo.userData.tint=tint;bins.get(m).push(geo);return geo;};
 const roughen=(geo,amt)=>{
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   p.setXYZ(i,x+(noise3(x*31+off,y*31,z*31)-.5)*amt*2,y+(noise3(y*29+7,z*29,x*29+off)-.5)*amt*2,z+(noise3(z*33+3+off,x*33,y*33)-.5)*amt*2);
  }
  geo.computeVertexNormals();
  return geo;
 };
 const ironBox=(w,h,d,x,y,z,r=.006)=>put(place(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/2,h/2,d/2)),x,y,z),iron);

 // Sill: two dressed stones with a joint at a seeded place, set just proud of the floor.
 const SILL=.05,joint=(rand(1)-.5)*.5;
 for(const [a,b] of [[-.49,joint-.004],[joint+.004,.49]]){
  put(roughen(place(new RoundedBoxGeometry(b-a,SILL,.17,2,.012),(a+b)/2,SILL/2,0),.0025),stone,.94+rand(a*9+3)*.12);
 }

 // Stiles: square posts with a foot collar, a head collar and a ball finial.
 for(const x of [-.44,.44]){
  ironBox(.07,.9,.07,x,SILL+.45,0,.008);
  ironBox(.092,.035,.092,x,SILL+.018,0,.006);
  ironBox(.088,.03,.088,x,SILL+.885,0,.006);
  put(place(new THREE.SphereGeometry(.036,10,7),x,SILL+.93,0),iron);
 }

 // Rails: flat straps between the stiles, with a rivet head on each face where an upright passes.
 const RAILS=[.07,.45,.83].map(y=>SILL+y),UPRIGHTS=7,pitch=.115;
 for(const y of RAILS)ironBox(.84,.05,.042,0,y,0,.006);

 // Uprights: round bars through the rails, tipped with spear points. One is bent outward.
 const bent=Math.floor(rand(2)*UPRIGHTS),bow=(rand(3)<.5?-1:1)*(.035+rand(4)*.025);
 const barTop=SILL+.9;
 for(let i=0;i<UPRIGHTS;i++){
  const x=(i-(UPRIGHTS-1)/2)*pitch,lean=(rand(i+10)-.5)*.004;
  const geo=new THREE.CylinderGeometry(.017,.018,barTop-SILL+.01,8,14);
  geo.translate(0,(barTop+SILL)/2-.005,0);
  const p=geo.attributes.position;
  for(let k=0;k<p.count;k++){
   const y=p.getY(k);
   // The bend peaks between the lower and middle rails and fades to nothing at them.
   const t=(y-RAILS[0])/(RAILS[1]-RAILS[0]);
   const dz=i===bent&&t>0&&t<1?bow*Math.sin(Math.PI*t):0;
   p.setXYZ(k,p.getX(k)+x+lean*(y-SILL),y,p.getZ(k)+dz);
  }
  geo.computeVertexNormals();
  put(geo,iron);
  // Spear point: a collar and a four-sided blade.
  put(place(new THREE.CylinderGeometry(.024,.024,.014,10),x,barTop,0),iron);
  put(place(new THREE.ConeGeometry(.03,.075,4),x,barTop+.044,0,0,0,0,1,1,.55),iron);
  for(const y of RAILS)for(const z of [-.021,.021])put(place(new THREE.SphereGeometry(.013,6,3,0,Math.PI*2,0,Math.PI/2),x,y,z,z<0?-Math.PI/2:Math.PI/2,0,0,1,.55,1),iron);
 }

 // Bake: strip to position and normal, paint vertex colours, merge one mesh per material.
 const n=new THREE.Vector3();
 for(const [material,list] of bins){
  const paint=material===iron?(x,y,z,nn)=>ironColour(x,y,z,nn,off):(x,y,z,nn)=>sillColour(x,y,z,nn,off,pitch,UPRIGHTS);
  const flats=list.map(geo=>{
   const tint=geo.userData.tint;
   const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
   for(const key of Object.keys(flat.attributes))if(!['position','normal'].includes(key))flat.deleteAttribute(key);
   const p=flat.attributes.position,nor=flat.attributes.normal,col=new Float32Array(p.count*3);
   for(let i=0;i<p.count;i++){n.fromBufferAttribute(nor,i);const c=paint(p.getX(i),p.getY(i),p.getZ(i),n);col[i*3]=c[0]*tint;col[i*3+1]=c[1]*tint;col[i*3+2]=c[2]*tint;}
   flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   return flat;
  });
  const geo=mergeGeometries(flats);flats.forEach(f=>f.dispose());geometries.push(geo);
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.userData.part=Object.keys(parts).find(key=>parts[key]===material);
  g.add(mesh);
 }
 g.userData.bent=bent;
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}

// Forged iron: near-black blue-grey with a faint hammered mottle, orange-brown rust
// gathering low down (where water sits) and in patches, and a rubbed, paler band at
// hand height on the faces.
function ironColour(x,y,z,n,off){
 const k=.85+noise3(x*40+off,y*40,z*40)*.3;
 let r=.03*k,g=.036*k,b=.041*k;
 const worn=Math.max(0,1-Math.abs(y-.62)/.16)*Math.abs(n.z)*noise3(x*20,y*8+off,z*20);
 if(worn>.25){const t=Math.min(1,(worn-.25)*2.2);r+=(.085-r)*t;g+=(.09-g)*t;b+=(.095-b)*t;}
 const low=Math.max(0,1-(y-.05)/.3);
 const patch=noise3(x*22+off,y*22,z*22+5)*.75+noise3(x*70,y*70+off,z*70)*.25;
 const rust=Math.min(1,Math.max(0,(patch+low*.35-.58)*3.2));
 if(rust>0){const deep=noise3(x*110+off,y*110,z*110)>.5;const [rr,rg,rb]=deep?[.17,.06,.022]:[.24,.1,.035];r+=(rr-r)*rust;g+=(rg-g)*rust;b+=(rb-b)*rust;}
 if(n.y<-.5){r*=.6;g*=.6;b*=.6;}
 return [r,g,b];
}

// Dressed sill stone: mottled grey, grimy at the foot, with orange-brown rust stains
// spreading from the foot of each upright and stile down the faces.
function sillColour(x,y,z,n,off,pitch,count){
 let k=.78+noise3(x*16+off,y*16,z*16)*.3+(noise3(x*90,y*90+off,z*90)-.5)*.12;
 if(n.y>.6)k*=1.08;
 if(n.y<-.5)k*=.55;
 k*=.8+.2*Math.min(1,y/.04);
 let r=.25*k,g=.245*k,b=.23*k;
 let near=Math.min(Math.abs(Math.abs(x)-.44)*.8,1);
 for(let i=0;i<count;i++)near=Math.min(near,Math.abs(x-(i-(count-1)/2)*pitch));
 const spread=.018+.03*Math.max(0,.05-y)/.05*(n.y>.6?0:1)+.012*noise3(x*60+off,z*60,y*60);
 const stain=Math.max(0,1-near/spread)*(n.y>.6?Math.max(0,1-Math.abs(z)/.06):1)*(.6+.4*noise3(x*80,y*80+off,z*80));
 if(stain>0){const t=Math.min(1,stain*1.2);r+=(.2-r)*t*.8;g+=(.1-g)*t*.8;b+=(.05-b)*t*.8;}
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
