import * as THREE from 'three';

// Water and lava surfaces for the `water` and `lava` terrain. Each tile gets a dark
// sunken bed and a finely divided surface. The shader lifts the surface with waves
// computed from world position, so neighbouring tiles meet without a seam and a pool
// or lava lake reads as one body. Water is clear enough to show pebbles on the bed and
// sends out an occasional ripple ring. Lava shows dark crust plates split by glowing,
// slowly drifting molten veins, with a basalt raft bobbing on it and a bubble that swells and bursts.
// The surface geometry and materials are shared by all tiles and are never disposed;
// each tile disposes only the parts it owns.

const WAVES={
 water:{amp:[.011,.008,.004],freq:[[3.1,0],[1.2,3.7],[7.3,7.3]],speed:[1.6,-1.3,2.4]},
 lava:{amp:[.006,.004,.002],freq:[[2.3,.6],[-.8,2.9],[5.1,4.4]],speed:[.45,-.35,.8]},
};
export const LIQUID_SURFACE_Y=-.06;
const shared={};

// Height of the surface at world (x,z) and time t; the shader uses the same sum.
export function liquidHeight(kind,x,z,t){
 const w=WAVES[kind];let h=0;
 for(let i=0;i<3;i++)h+=w.amp[i]*Math.sin(x*w.freq[i][0]+z*w.freq[i][1]+t*w.speed[i]);
 return h;
}

function waveGlsl(kind){
 const w=WAVES[kind],f=n=>n.toFixed(4);
 const terms=w.amp.map((a,i)=>({a:f(a),fx:f(w.freq[i][0]),fz:f(w.freq[i][1]),s:f(w.speed[i])}));
 return `
 uniform float liquidTime;varying vec3 vLiquidWorld;
 float liquidWave(vec2 p){return ${terms.map(({a,fx,fz,s})=>`${a}*sin(p.x*${fx}+p.y*${fz}+liquidTime*${s})`).join('+')};}
 vec2 liquidSlope(vec2 p){vec2 d=vec2(0.);float c;${terms.map(({a,fx,fz,s})=>`c=${a}*cos(p.x*${fx}+p.y*${fz}+liquidTime*${s});d+=c*vec2(${fx},${fz});`).join('')}return d;}`;
}

const NOISE_GLSL=`
 float lqHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float lqNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(lqHash(i),lqHash(i+vec2(1,0)),f.x),mix(lqHash(i+vec2(0,1)),lqHash(i+vec2(1,1)),f.x),f.y);}
 float lqFbm(vec2 p){return .5*lqNoise(p)+.27*lqNoise(p*2.07)+.15*lqNoise(p*4.13)+.08*lqNoise(p*8.3);}`;

function surfaceMaterial(kind){
 if(shared[kind])return shared[kind];
 const uniforms={liquidTime:{value:0}};
 const material=kind==='water'
  ?new THREE.MeshStandardMaterial({color:0x1d6878,roughness:.08,metalness:.25,transparent:true,opacity:.8,emissive:0x082a33,emissiveIntensity:1})
  :new THREE.MeshStandardMaterial({color:0x2a1812,roughness:.82,metalness:.05,emissive:0xffffff,emissiveIntensity:1});
 material.name=`${kind} surface`;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader
   .replace('#include <common>',`#include <common>\n${waveGlsl(kind)}`)
   .replace('#include <beginnormal_vertex>',`vec2 lqP=(modelMatrix*vec4(position,1.)).xz;vec2 lqD=liquidSlope(lqP);vec3 objectNormal=normalize(vec3(-lqD.x,1.,-lqD.y));\n#ifdef USE_TANGENT\nvec3 objectTangent=vec3(tangent.xyz);\n#endif`)
   .replace('#include <begin_vertex>',`vec3 transformed=vec3(position);transformed.y+=liquidWave(lqP);vLiquidWorld=(modelMatrix*vec4(transformed,1.)).xyz;`);
  const water=`
   float lqCaustic=lqFbm(vLiquidWorld.xz*4.+vec2(liquidTime*.3,-liquidTime*.22));
   float lqLines=pow(1.-abs(lqCaustic*2.-1.),6.);
   totalEmissiveRadiance+=vec3(.05,.2,.22)*lqLines+vec3(.0,.03,.04)*lqCaustic;`;
  const lava=`
   vec2 lqFlow=vLiquidWorld.xz*1.7+vec2(liquidTime*.05,liquidTime*.03);
   float lqN=lqFbm(lqFlow+lqFbm(lqFlow*1.3-liquidTime*.04)*1.2);
   float lqMolten=smoothstep(.44,.6,lqN);
   float lqVein=pow(1.-abs(lqFbm(vLiquidWorld.xz*5.-liquidTime*.12)*2.-1.),10.)*(1.-lqMolten);
   float lqPulse=.85+.15*sin(liquidTime*1.7+lqN*9.);
   diffuseColor.rgb*=1.-lqMolten*.7;
   totalEmissiveRadiance=(vec3(.9,.13,.01)*lqMolten+vec3(1.7,.62,.08)*pow(lqMolten,4.)+vec3(1.3,.32,.03)*lqVein)*lqPulse+vec3(.05,.008,0.);`;
  shader.fragmentShader=shader.fragmentShader
   .replace('#include <common>',`#include <common>\nuniform float liquidTime;varying vec3 vLiquidWorld;\n${NOISE_GLSL}`)
   .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>\n${kind==='water'?water:lava}`);
 };
 material.customProgramCacheKey=()=>`liquid-${kind}`;
 const geometry=new THREE.PlaneGeometry(1,1,16,16).rotateX(-Math.PI/2);
 const bedGeometry=new THREE.BoxGeometry(1,.1,1);
 const bed=new THREE.MeshStandardMaterial({color:kind==='water'?0x16211f:0x120c0a,roughness:1});
 return shared[kind]={material,uniforms,geometry,bedGeometry,bed};
}

function rng(seed){let s=(seed>>>0)||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}

export function createLiquid(kind='water',seed=0){
 const g=new THREE.Group();g.name=kind==='lava'?'Lava':'Water';
 const {material,uniforms,geometry,bedGeometry,bed}=surfaceMaterial(kind);
 const geometries=[],materials=[],r=rng(seed*2654435761+7);
 const own=(geo,mat,x,y,z)=>{geometries.push(geo);if(!materials.includes(mat))materials.push(mat);const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m;};

 const floor=new THREE.Mesh(bedGeometry,bed);floor.position.y=-.2;floor.receiveShadow=true;g.add(floor);
 const surface=new THREE.Mesh(geometry,material);surface.position.y=LIQUID_SURFACE_Y;surface.receiveShadow=true;g.add(surface);
 const floaters=[];let update;

 if(kind==='water'){
  // Pebbles on the bed, seen through the surface.
  const pebble=new THREE.MeshStandardMaterial({color:0x4d5a52,roughness:.9});
  for(let i=0,n=Math.floor(r()*3);i<n;i++){const s=.03+r()*.035,p=own(new THREE.DodecahedronGeometry(s,0),pebble,(r()-.5)*.7,-.15+s*.3,(r()-.5)*.7);p.scale.y=.5;p.rotation.set(r()*3,r()*3,r()*3);}
  // One ripple ring that spreads and fades on a per-tile rhythm.
  const ringMat=new THREE.MeshBasicMaterial({color:0xbfeff0,transparent:true,opacity:0,depthWrite:false});
  const ring=own(new THREE.TorusGeometry(.1,.005,4,32),ringMat,(r()-.5)*.4,LIQUID_SURFACE_Y+.012,(r()-.5)*.4);ring.rotation.x=Math.PI/2;
  const period=3.5+r()*3,offset=r()*period;
  update=t=>{const p=((t+offset)%period)/period;ring.scale.setScalar(.4+p*3.2);ringMat.opacity=Math.max(0,.45*(1-p)*Math.min(1,p*8));};
 }else{
  // A basalt crust raft that rides the waves, and a bubble that swells and bursts.
  const basalt=new THREE.MeshStandardMaterial({color:0x221a17,roughness:.95}),glow=new THREE.MeshStandardMaterial({color:0x5a1a05,emissive:0xff5a10,emissiveIntensity:1.6,roughness:.5});
  if(r()<.6){const s=.1+r()*.08,raft=own(new THREE.DodecahedronGeometry(s,1),basalt,(r()-.5)*.5,0,(r()-.5)*.5);raft.scale.set(1.2,.22,1);raft.rotation.y=r()*6;raft.castShadow=true;
   // The glowing seam where the crust meets the melt; it inherits the raft's squash.
   const rim=new THREE.Mesh(new THREE.TorusGeometry(s*1.02,.025,5,18),glow);geometries.push(rim.geometry);rim.rotation.x=Math.PI/2;raft.add(rim);
   floaters.push({mesh:raft,lift:.005,phase:r()*6});}
  const bubble=own(new THREE.SphereGeometry(.05,14,10,0,Math.PI*2,0,Math.PI/2),glow,(r()-.5)*.6,LIQUID_SURFACE_Y,(r()-.5)*.6);
  const period=2.5+r()*3,offset=r()*period;
  update=t=>{const p=((t+offset)%period)/period,grow=p<.85?p/.85:0;bubble.scale.set(.3+grow*.9,.2+grow*1.1,.3+grow*.9);bubble.visible=grow>0;};
 }

 g.userData.updateLiquid=t=>{
  uniforms.liquidTime.value=t;update(t);
  for(const f of floaters){const base=g.parent?.position||g.position,wx=base.x+f.mesh.position.x,wz=base.z+f.mesh.position.z;f.mesh.position.y=LIQUID_SURFACE_Y+f.lift+liquidHeight(kind,wx,wz,t);f.mesh.rotation.z=Math.sin(t*.7+f.phase)*.04;}
 };
 g.userData.dispose=()=>{geometries.forEach(o=>o.dispose());materials.forEach(o=>o.dispose());};
 g.userData.updateLiquid(0);
 return g;
}
