import * as THREE from 'three';

// A shader flame on a camera-facing card, with eight embers drifting up from it as one
// instanced draw. (An earlier version also built seven lathe-geometry tongues; they were
// animated every frame but never added to the group, so they only cost CPU.)
export function createFire(seed=0){
 const g=new THREE.Group();
 const emberMaterial=new THREE.MeshBasicMaterial({color:0xff9e20,toneMapped:false});
 // One InstancedMesh, not eight meshes: the tile instancer would otherwise sweep eight plain
 // meshes into its own instances and freeze their drift between engine frames.
 const EMBERS=8,sparkGeometry=new THREE.SphereGeometry(.009,4,3),embers=new THREE.InstancedMesh(sparkGeometry,emberMaterial,EMBERS);
 embers.name='embers';embers.frustumCulled=false;g.add(embers);const emberMatrix=new THREE.Matrix4(),emberPos=new THREE.Vector3(),emberScale=new THREE.Vector3(),noTurn=new THREE.Quaternion();
 const fireMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,uniforms:{time:{value:0},seed:{value:seed}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;vec4 c=modelViewMatrix*vec4(0.,0.,0.,1.);c.xy+=position.xy*vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));gl_Position=projectionMatrix*c;}`,
 fragmentShader:`
 precision highp float;varying vec2 vUv;uniform float time,seed;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 float fbm(vec2 p){return .55*noise(p)+.28*noise(p*2.03)+.12*noise(p*4.09)+.05*noise(p*8.13);}
 void main(){
 float y=vUv.y;vec2 flow=vec2(vUv.x*5.+seed,y*4.-time*2.2);
 float curl=fbm(flow+vec2(0.,fbm(flow)*2.));
 float x=(vUv.x-.5)*2.+(curl-.5)*(.18+y*.58)+sin(y*9.-time*2.+seed)*y*.09;
 float density=.57*pow(max(0.,1.-y),.8)-abs(x)+(fbm(flow*1.65)-.5)*.27*y;
 float envelope=smoothstep(-.025,.09,density)*smoothstep(0.,.075,y)*(1.-smoothstep(.87,1.,y));
 float veins=fbm(vec2(x*15.+curl*3.,y*7.-time*4.));float filament=pow(1.-abs(veins*2.-1.),9.);
 float heat=clamp(density*1.9+(1.-y)*.2+filament*.42,0.,1.);
 vec3 color=mix(vec3(.65,.025,.002),vec3(1.6,.25,.008),smoothstep(0.,.36,heat));
 color=mix(color,vec3(2.1,1.1,.12),smoothstep(.32,.7,heat));color=mix(color,vec3(2.3,1.95,1.1),smoothstep(.72,1.,heat));
 float alpha=envelope*(.48+veins*.38+filament*.14);if(alpha<.008)discard;gl_FragColor=vec4(color,alpha);
 }`});
 const plane=new THREE.PlaneGeometry(.42,.64);plane.translate(0,.29,0);const flame=new THREE.Mesh(plane,fireMaterial);flame.frustumCulled=false;g.add(flame);
 g.userData.updateFire=t=>{
  fireMaterial.uniforms.time.value=t;
  for(let i=0;i<EMBERS;i++){const age=(t*(.45+i*.018)+i/8+seed)%1;emberPos.set(Math.sin(age*8+i)*age*.17,.14+age*.65,Math.cos(age*7+i)*age*.12);emberScale.setScalar(Math.max(1e-4,Math.sin(age*Math.PI)*.8));
   embers.setMatrixAt(i,emberMatrix.compose(emberPos,noTurn,emberScale));}
  embers.instanceMatrix.needsUpdate=true;
 };
 g.userData.dispose=()=>{plane.dispose();fireMaterial.dispose();embers.dispose();sparkGeometry.dispose();emberMaterial.dispose();};
 return g;
}
