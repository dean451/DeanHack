import {createFountain} from './fountain.js';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Self-contained procedural models; no shared demo visibility or animation state.
function kit(name) {
  const g=new THREE.Group();g.name=name;
  const geometries=new Set(),materials=new Set();
  const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.8,...extra});materials.add(m);return m;};
  const mesh=(geometry,material,x=0,y=0,z=0,parent=g)=>{geometries.add(geometry);const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
  const orb=(r,m,x,y,z,s=[1,1,1],parent=g)=>{const o=mesh(new THREE.SphereGeometry(r,16,12),m,x,y,z,parent);o.scale.set(...s);return o;};
  const rod=(a,b,r,m,parent=g)=>{const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),v=to.clone().sub(from);const o=mesh(new THREE.CylinderGeometry(r,r,v.length(),8),m,...from.add(to).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;};
  const curve=(points,r,m,parent=g)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,7,false),m,0,0,0,parent);
  g.userData.dispose=()=>{geometries.forEach(o=>o.dispose());materials.forEach(o=>o.dispose());};
  return {g,mat,mesh,orb,rod,curve};
}

// A carved stone centaur on a moulded octagonal plinth, posed by species: the
// forest centaur draws a longbow, the plains centaur rears back to hurl a javelin,
// the mountain centaur swings a knotted club overhead. One foreleg is lifted mid-
// stride. Weathering is baked into vertex colours (mottling, rain streaks under
// overhangs, lichen on the upper faces, grime and moss low down), and the figure
// and the plinth are each merged into one mesh, so the statue is 2 draws.
export function createCentaurStatue(species='plains centaur') {
  const g=new THREE.Group();g.name=`Stone statue of ${species}`;
  const kind=/forest/i.test(species)?'forest':/mountain/i.test(species)?'mountain':'plains';
  const stone=new THREE.MeshStandardMaterial({color:0xaab0a4,roughness:.9,vertexColors:true});
  const base=new THREE.MeshStandardMaterial({color:0x818a81,roughness:.93,vertexColors:true});
  const bins=new Map([[stone,[]],[base,[]]]);
  const up=new THREE.Vector3(0,1,0),V=a=>new THREE.Vector3(...a);
  const put=(geo,tint=1,bin=stone)=>{geo.userData.tint=tint;bins.get(bin).push(geo);return geo;};
  const ball=(r,p,s=[1,1,1],tint=1,seg=[14,10])=>put(new THREE.SphereGeometry(r,...seg).scale(...s).translate(...p),tint);
  // A tapered limb from a (radius ra) to b (radius rb).
  const limb=(a,b,ra,rb,tint=1,seg=8)=>{
    const from=V(a),dir=V(b).sub(from),len=dir.length();
    const geo=new THREE.CylinderGeometry(rb,ra,len,seg,1,true).translate(0,len/2,0);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up,dir.normalize()));
    return put(geo.translate(from.x,from.y,from.z),tint);
  };
  // A jointed chain: tapered segments with a ball at each inner joint.
  const chain=(pts,radii,tint=1)=>{for(let i=1;i<pts.length;i++){limb(pts[i-1],pts[i],radii[i-1],radii[i],tint);if(i<pts.length-1)ball(radii[i]*1.05,pts[i],[1,1,1],tint,[8,6]);}};
  const tube=(pts,r,tint=1,seg=20)=>put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>V(p))),seg,r,6,false),tint);
  const lathe=(profile,seg,p,s=[1,1,1],tint=1,bin=stone)=>put(new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),seg).scale(...s).translate(...p),tint,bin);

  // Plinth: a stepped octagon with a torus moulding, and a carved tablet on the front.
  const F=.17;
  lathe([[0,0],[.45,0],[.45,.035],[.425,.05],[.405,.055],[.405,.125],[.425,.135],[.44,.15],[.44,F],[0,F]],8,[0,0,0],[1,1,1],1,base);
  put(new THREE.BoxGeometry(.2,.055,.012).translate(0,.09,.405*Math.cos(Math.PI/8)+.004),.82,base);

  // Equine body: barrel, deep chest, rounded rump.
  ball(1,[0,.59,-.03],[.155,.155,.29],1,[18,12]);
  ball(1,[0,.61,.19],[.15,.165,.14]);
  for(const x of [-.075,.075])ball(1,[x,.62,-.22],[.1,.135,.13]);
  // Hind legs: stifle, hock angled back, cannon, fetlock; hooves flare at the plinth.
  for(const x of [-.095,.095]){
    chain([[x,.58,-.2],[x*1.08,.42,-.16],[x*1.05,.33,-.27],[x,.225,-.25],[x,F+.035,-.23]],[.07,.045,.03,.026,.028]);
    lathe([[.036,0],[.032,.035],[0,.036]],10,[x,F,-.23],[1,1,1.1],.8);
  }
  // Forelegs: the right one planted, the left lifted and folded at the knee.
  chain([[.09,.56,.2],[.1,.38,.23],[.1,.27,.225],[.1,.215,.24],[.1,F+.035,.25]],[.058,.04,.028,.026,.028]);
  lathe([[.036,0],[.032,.035],[0,.036]],10,[.1,F,.25],[1,1,1.1],.8);
  chain([[-.09,.56,.2],[-.1,.45,.32],[-.1,.35,.29],[-.1,.3,.315]],[.058,.04,.028,.027]);
  put(new THREE.CylinderGeometry(.028,.034,.04,10).rotateX(-.6).translate(-.1,.283,.33),.8);
  // A flowing tail: three carved strands.
  for(const [dx,dz,r] of [[0,0,.034],[-.025,.015,.024],[.025,.012,.024]])
    tube([[0,.7,-.33],[dx,.66,-.44],[dx*1.4,.5,-.47-dz],[dx*1.8,.33,-.43-dz]],r,.95,16);

  // Human torso from the horse's chest: a lathe with waist, ribs and shoulders.
  lathe([[.125,0],[.118,.08],[.103,.15],[.115,.23],[.14,.3],[.13,.34],[.07,.37],[0,.38]],14,[0,.68,.27],[1,1,.7]);
  for(const x of [-.052,.052])ball(.058,[x,.94,.325],[1,.7,.55]);
  ball(.03,[0,.8,.335],[1.6,.6,.5],.96);
  for(const x of [-.14,.14])ball(.058,[x,.99,.285]);
  limb([0,1.02,.29],[0,1.1,.305],.043,.036);
  // Head: skull, jaw, nose, brow, ears, eyes sunk into shadow, a mop of carved curls.
  const hy=1.16,hz=.32;
  ball(.072,[0,hy,hz],[.92,1.08,1]);
  ball(.05,[0,hy-.05,hz+.025],[1,.8,1],.97);
  ball(.015,[0,hy-.003,hz+.075],[.8,1.2,1.1]);
  ball(.05,[0,hy+.022,hz+.045],[1.25,.28,.5],.95);
  for(const s of [-1,1]){ball(.009,[s*.026,hy+.005,hz+.066],[1.3,.8,.6],.55);ball(.016,[s*.068,hy,hz-.005],[.5,1.1,.8]);}
  for(let i=0;i<9;i++){const a=i/8*Math.PI*1.3-Math.PI*.65;ball(.03,[Math.sin(a)*.058,hy+.05+Math.cos(a)*.02,hz-.02-Math.cos(a)*.035],[1,.9,1],.88,[8,6]);}
  ball(.064,[0,hy+.03,hz-.035],[1.05,1,1],.88);

  const R=.99,Z=.285; // shoulder height and depth
  if(kind==='forest'){
    // Left arm thrust forward with the bow; right hand drawn to the cheek.
    chain([[-.14,R,Z],[-.19,1.0,.42],[-.2,1.01,.53]],[.04,.032,.026]);
    ball(.028,[-.2,1.01,.545],[1,1.2,1]);
    chain([[.14,R,Z],[.2,1.05,.19],[.05,1.11,.34]],[.04,.032,.026]);
    ball(.026,[.05,1.11,.345]);
    const top=[-.2,1.34,.47],bot=[-.2,.68,.47];
    tube([bot,[-.2,.72,.52],[-.2,.86,.56],[-.2,1.01,.57],[-.2,1.16,.56],[-.2,1.3,.52],top],.016,1.04,24);
    for(const t of [top,bot])ball(.02,t,[1,1,1],.9,[8,6]);
    limb(bot,[.05,1.11,.345],.005,.005,.9,4);limb([.05,1.11,.345],top,.005,.005,.9,4);
    limb([.07,1.115,.33],[-.26,1.0,.63],.008,.008,1.04,5);
    put(new THREE.ConeGeometry(.02,.06,4).rotateX(Math.PI/2).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),V([-.33,-.115,.3]).normalize())).translate(-.27,.997,.64),.9);
    // Quiver slung on the back with fletched arrows.
    limb([.06,.74,.18],[.13,1.04,.14],.042,.048,.85);
    for(let i=0;i<3;i++){const x=.105+i*.025,z=.13+i*.012;limb([x,1.02,z],[x+.01,1.1,z-.01],.006,.006,1.04,4);ball(.02,[x+.012,1.1,z-.012],[.35,1.6,1],1.06,[6,4]);}
    tube([[-.12,1.0,.33],[-.02,.9,.36],[.1,.78,.3]],.011,.9,10);
  }else if(kind==='plains'){
    // Right arm cocked back above the shoulder with a javelin; left arm aims ahead.
    chain([[.14,R,Z],[.25,1.1,.23],[.2,1.24,.28]],[.04,.032,.026]);
    ball(.028,[.2,1.24,.29]);
    limb([.215,1.28,-.08],[.19,1.21,.52],.012,.011,1.02);
    put(new THREE.ConeGeometry(.026,.1,4).rotateX(Math.PI/2).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),V([-.025,-.07,.6]).normalize())).scale(1,.45,1).translate(.187,1.203,.57),1.05);
    chain([[-.14,R,Z],[-.2,1.02,.42],[-.19,1.07,.54]],[.04,.032,.026]);
    ball(.026,[-.19,1.07,.555],[.8,1.1,1.2]);
    // A cloak knotted at the shoulder, falling across the back.
    tube([[-.14,1.02,.3],[-.05,1.0,.2],[.05,.9,.16],[.12,.76,.18]],.03,.9,12);
  }else{
    // Club raised two-handed overhead: both arms up, the club tipped back.
    chain([[.14,R,Z],[.22,1.12,.32],[.09,1.27,.33]],[.042,.034,.028]);
    chain([[-.14,R,Z],[-.2,1.12,.33],[-.05,1.26,.33]],[.042,.034,.028]);
    for(const x of [.09,-.05])ball(.029,[x,1.265,.335]);
    limb([.16,1.27,.34],[-.2,1.4,.12],.018,.034,1);
    for(const [t,ang] of [[.45,0],[.7,2.1],[.88,4.2]]){const p=V([.16,1.27,.34]).lerp(V([-.2,1.4,.12]),t);ball(.022,[p.x,p.y+Math.cos(ang)*.02,p.z+Math.sin(ang)*.02],[1,1,1],.95,[8,6]);}
    ball(.04,[-.2,1.4,.12],[1.1,.9,1],.95);
    // Fur mantle over the shoulders, and a heavy beard.
    ball(1,[0,1.0,.275],[.19,.06,.1],.84);
    for(let i=0;i<7;i++){const a=(i/6-.5)*2.6;ball(.035,[Math.sin(a)*.17,.965,.275-Math.cos(a)*.06],[1,1.3,1],.84,[8,6]);}
    ball(.045,[0,hy-.085,hz+.045],[.95,1.4,.7],.86);
  }

  // Bake weathering and merge each material's parts into one mesh.
  const n=new THREE.Vector3();
  for(const [mat,list] of bins){
    const parts=list.map(geo=>{
      const tint=geo.userData.tint??1;
      const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
      for(const key of Object.keys(flat.attributes))if(!['position','normal','uv'].includes(key))flat.deleteAttribute(key);
      const p=flat.attributes.position,nor=flat.attributes.normal,col=new Float32Array(p.count*3);
      for(let i=0;i<p.count;i++){n.fromBufferAttribute(nor,i);col.set(statueColour(p.getX(i),p.getY(i),p.getZ(i),n,tint),i*3);}
      flat.setAttribute('color',new THREE.BufferAttribute(col,3));
      return flat;
    });
    const geo=mergeGeometries(parts);parts.forEach(p=>p.dispose());
    const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=mesh.receiveShadow=true;
    mesh.name=mesh.userData.part=mat===stone?'figure':'plinth';g.add(mesh);
  }
  g.userData.dispose=()=>{g.children.forEach(o=>o.geometry?.dispose());stone.dispose();base.dispose();};
  g.userData.restingWeapon=true;g.userData.species=kind;
  return g;
}

// A multiplier over the stone colour: mottling, rain streaks darkening the faces
// under overhangs, crusts of yellow and grey-green lichen on the upper faces, grime
// and moss towards the foot of the plinth.
function statueColour(x,y,z,n,tint){
  let k=(.9+(noise3(x*10,y*10,z*10)-.5)*.28+(noise3(x*60,y*60,z*60)-.5)*.1)*tint;
  if(n.y<-.35)k*=.72;
  const streak=noise3(x*22,z*22,y*1.5);if(n.y<.4&&streak>.64)k*=1-(streak-.64)*1.1;
  k*=.72+.28*Math.min(1,y/.2);
  let r=k,g=k,b=k;
  const lichen=noise3(x*13+5,y*13,z*13+2)+(n.y>.35?.18:0)-(y<.2?.1:0);
  if(lichen>.74){const m=Math.min(1,(lichen-.74)*6);if(noise3(x*5,y*5,z*5+9)>.5){r*=1+.12*m;g*=1+.02*m;b*=1-.4*m;}else{r*=1-.18*m;g*=1-.04*m;b*=1-.2*m;}}
  if(y<.1&&noise3(x*9,z*9,3)>.55){const m=Math.min(1,(.1-y)*18);r*=1-.4*m;g*=1-.12*m;b*=1-.5*m;}
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

export function createOracle() {
  const {g,mat,mesh,orb,rod,curve}=kit('Oracle');
  const robe=mat(0x35315e),mantle=mat(0x407a80),gold=mat(0xc9ad68,{metalness:.5,roughness:.4}),skin=mat(0xc39173),dark=mat(0x182333);
  const magic=mat(0x9bf8ef,{emissive:0x38bcce,emissiveIntensity:1.8,roughness:.25});
  const body=new THREE.Group();g.add(body);
  mesh(new THREE.CylinderGeometry(.14,.31,.78,12),robe,0,.48,0,body);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;rod([Math.sin(a)*.13,.84,Math.cos(a)*.13],[Math.sin(a)*.28,.1,Math.cos(a)*.28],.013,gold,body);}
  orb(.24,mantle,0,.91,0,[1.22,.53,.88],body);
  orb(.17,dark,0,1.15,0,[1.14,1.3,1.06],body);
  orb(.127,skin,0,1.145,.16,[.9,1.17,.66],body);
  for(const x of [-.046,.046])orb(.014,magic,x,1.16,.248,[1,.5,.5],body);
  curve([[-.17,1.12,.03],[-.17,1.31,0],[0,1.4,-.015],[.17,1.31,0],[.17,1.12,.03]],.035,mantle,body);
  for(const x of [-.14,0,.14]){rod([x,1.28,0],[x*1.55,1.48-Math.abs(x)*.5,-.04],.017,gold,body);orb(.03,magic,x*1.55,1.48-Math.abs(x)*.5,-.04,[.65,1.5,.65],body);}
  for(let i=0;i<7;i++)orb(.027,gold,(i-3)*.042,.92-Math.sin(i/6*Math.PI)*.12,.20,[1,1,1],body);
  rod([-.21,.93,0],[-.32,.67,.14],.085,mantle,body);rod([-.32,.67,.14],[-.34,.84,.25],.05,skin,body);
  rod([.21,.93,0],[.31,.77,.13],.08,mantle,body);orb(.053,skin,.35,.8,.15,[1,1,1],body);
  rod([.36,.08,.16],[.36,1.42,.16],.025,gold);
  mesh(new THREE.OctahedronGeometry(.1),magic,.36,1.48,.16);
  const halo=mesh(new THREE.TorusGeometry(.15,.014,8,40),gold,.36,1.48,.16);
  const motes=[];for(let i=0;i<9;i++)motes.push(orb(.013,magic,0,0,0));
  g.userData.updateOracle=t=>{halo.rotation.y=t*.45;for(let i=0;i<motes.length;i++){const a=t*.6+i*Math.PI*2/9;motes[i].position.set(Math.cos(a)*.37,.3+(i/9+t*.09)%1.15,Math.sin(a)*.3);}};
  g.userData.updateOracle(0);
  return {g,body,legs:[],quirk:'oracle'};
}

export function createLiveFountain(template) {
  return createFountain({materials:template?.userData.fountainMaterials,scale:.46});
}
