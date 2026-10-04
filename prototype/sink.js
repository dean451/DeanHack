import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A dungeon sink for the `sink` terrain: not a basin but a rusted iron grate set in a
// cracked stone collar in the floor, with a corroded pipe climbing out of the flagstones
// behind it, a seized valve wheel on the pipe and a spout that weeps over a dark, scummy
// puddle. Weathering is baked into vertex colours (flaking rust, soot, limescale), and
// static parts are merged into one mesh per material: iron, stone and water.
export function createSink(){
 const g=new THREE.Group();g.name='Sink';
 const materials=[],geometries=[];
 const mat=(o)=>{const m=new THREE.MeshStandardMaterial(o);materials.push(m);return m;};
 const iron=mat({vertexColors:true,metalness:.55,roughness:.8});
 const stone=mat({vertexColors:true,roughness:.95});
 const water=mat({color:0x2f4a3f,emissive:0x0a1a14,emissiveIntensity:.4,roughness:.06,metalness:.1,transparent:true,opacity:.82});
 const parts={iron,stone,water};
 const painters=new Map([[iron,rustColour],[stone,stoneColour]]);
 const bins=new Map(Object.values(parts).map(m=>[m,[]]));
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s=new THREE.Vector3();
 const place=(geo,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>geo.applyMatrix4(m4.compose(v.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s.set(sx,sy,sz)));
 const put=(geo,m,paint=null)=>{geo.userData.paint=paint;bins.get(m).push(geo);return geo;};
 const lathe=(pts,seg=16)=>new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),seg);
 const bar=(w,h,d,x,y,z,ry=0)=>put(place(new THREE.BoxGeometry(w,h,d),x,y,z,0,ry,0),iron);

 // The collar: a broken ring of stone sunk into the floor, jagged at the rim.
 const holeZ=-.06,R=.17;
 const collar=lathe([[R-.01,0],[.3,0],[.29,.03],[.24,.045],[R+.01,.035],[R-.01,.02]],9);
 const cp=collar.attributes.position;
 for(let i=0;i<cp.count;i++){const x=cp.getX(i),y=cp.getY(i),z=cp.getZ(i);if(y>.02)cp.setY(i,y+(noise3(x*23,y,z*23)-.5)*.03);}
 collar.computeVertexNormals();
 put(place(collar,0,0,holeZ),stone);
 // The throat is a black pit with a scum of water at the bottom.
 put(place(new THREE.CircleGeometry(R,20),0,.004,holeZ,-Math.PI/2),iron,()=>[.02,.02,.02]);
 put(place(new THREE.CircleGeometry(R-.02,20),0,.012,holeZ,-Math.PI/2),water);
 // The grate: a bent rim, bars missing or snapped, a cross-brace.
 put(place(new THREE.TorusGeometry(R,.014,6,20),0,.032,holeZ,Math.PI/2),iron);
 for(let i=-3;i<=3;i++){
  if(i===2)continue; // a snapped bar
  const x=i*.044,len=2*Math.sqrt(R*R-x*x);
  bar(.016,.016,i===-1?len*.55:len,x,.03,holeZ+(i===-1?len*.22:0));
 }
 bar(2*R,.014,.016,0,.026,holeZ+.03,.2);

 // The pipe: out of the floor behind the grate, up, and over to a drooping spout.
 const pz=-.3;
 put(place(lathe([[.0,0],[.085,0],[.085,.03],[.05,.045],[.0,.045]],10),0,0,pz),stone);
 put(place(new THREE.CylinderGeometry(.065,.065,.03,10),0,.05,pz),iron);
 const curve=new THREE.CatmullRomCurve3([[0,.05,pz],[0,.4,pz],[0,.56,pz+.02],[0,.6,pz+.08],[0,.57,pz+.15],[0,.5,-.12]].map(p=>new THREE.Vector3(...p)));
 put(new THREE.TubeGeometry(curve,28,.032,8,false),iron);
 put(place(new THREE.CylinderGeometry(.047,.047,.035,10),0,.32,pz),iron); // a failing joint
 const end=curve.getPoint(1),dir=curve.getTangent(1);
 const lip=new THREE.CylinderGeometry(.042,.038,.03,9);
 lip.applyMatrix4(m4.compose(end,q.setFromUnitVectors(new THREE.Vector3(0,1,0),dir),s.set(1,1,1)));
 put(lip,iron);
 // A seized valve wheel: a rim and four spokes, one snapped short.
 const wy=.2;
 put(place(new THREE.TorusGeometry(.075,.009,5,14),0,wy,pz,Math.PI/2),iron);
 for(let i=0;i<4;i++)bar(.15*(i===3?.5:1),.01,.012,0,wy,pz,i*Math.PI/4+.3);
 // A drip hanging from the spout.
 put(place(new THREE.SphereGeometry(.008,8,6),end.x+dir.x*.03,end.y+dir.y*.03-.02,end.z+dir.z*.03,0,0,0,1,1.4,1),water);

 // Bake: every vertex-coloured bin gets its colours, then each bin becomes one mesh.
 const n=new THREE.Vector3();
 for(const [material,list] of bins){
  if(!list.length)continue;
  const flats=list.map(geo=>{
   const {paint}=geo.userData;
   const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
   for(const key of Object.keys(flat.attributes))if(!['position','normal'].includes(key))flat.deleteAttribute(key);
   if(material.vertexColors){
    const p=flat.attributes.position,nor=flat.attributes.normal,col=new Float32Array(p.count*3),f=paint||painters.get(material);
    for(let i=0;i<p.count;i++){n.fromBufferAttribute(nor,i);const c=f(p.getX(i),p.getY(i),p.getZ(i),n);col[i*3]=c[0];col[i*3+1]=c[1];col[i*3+2]=c[2];}
    flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   }
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

// Pitted black iron under flaking orange rust, streaked with soot and weeping brown
// down from the spout.
function rustColour(x,y,z){
 const k=.8+noise3(x*50,y*50,z*50)*.3;
 const rust=Math.min(1,Math.max(0,noise3(x*17+3,y*9,z*17)*1.5-.3+(y<.1?.15:0)));
 return [(.2+.4*rust)*k,(.16+.2*rust)*k,(.14+.07*rust)*k];
}

// Soot-grey flagstone, cracked, with a crust of dirty limescale.
function stoneColour(x,y,z){
 let k=.5+noise3(x*16,y*16,z*16)*.3+(noise3(x*80+5,y*80,z*80)-.5)*.1;
 if(noise3(x*40,0,z*40)<.12)k*=.5;
 return [.46*k,.45*k,.42*k];
}

function hash3(x,y,z){const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s);}
function noise3(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
 const fx=x-ix,fy=y-iy,fz=z-iz,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy),uz=fz*fz*(3-2*fz);
 const l=(a,b,t)=>a+(b-a)*t;
 const c=(dx,dy,dz)=>hash3(ix+dx,iy+dy,iz+dz);
 return l(l(l(c(0,0,0),c(1,0,0),ux),l(c(0,1,0),c(1,1,0),ux),uy),l(l(c(0,0,1),c(1,0,1),ux),l(c(0,1,1),c(1,1,1),ux),uy),uz);
}
