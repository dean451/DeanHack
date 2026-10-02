import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The worm tooth and the crysknife ground from one.
//  - worm tooth: a long wormfang torn out of a long worm's jaw, hooked like a sickle. Glossy
//    ivory going to a translucent milky point, a saw of small teeth up its inner curve, and a
//    root stained brown and old blood where it tore out, still ragged with a fringe of gum.
//    Its forked root is the grip, wound with a few turns of sinew.
//  - crysknife: the same tooth ground down to a long, curved, double-edged blade with a raised
//    spine, milk-white with a cold blue-grey shimmer along the edges. A hooked notch of the
//    tooth's saw is left near the hilt. A short guard cut from the root, a grip wound in dark
//    worm-hide, and a pommel of root bone with a pale crystal bead.
// Held-weapon space (equipment.js): the hand at the origin, the point up +y, the curve hooking
// toward +x, so laid on the floor (live.js lays weapons down with x -PI/2) it lies flat with
// the hook in the floor's plane. The tooth is one material, the grip another: 2 draws. The
// tooth stays metalness >= .75 (glossy enamel), so weapon-magic sheathes it; a faint milky
// emissive keeps it pale in the dark, and weapon-magic restores it when its glow is done.
export const WORM_TOOTH_NAME=/\b(?:worm ?tooth|crysknife)\b/;

const hash=i=>{const v=Math.sin(i*127.1+31.7)*43758.5453;return v-Math.floor(v);};
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};

// A tube swept up a curve in the xy plane. spine(u) -> [x,y]; section(u,a) -> [across, thick]
// offsets (across lies along the curve's normal in xy, thick along z). Smooth normals.
function sweep(spine,section,segs,ring){
 const pos=[],idx=[];
 for(let i=0;i<=segs;i++){const u=i/segs,[x,y]=spine(u),e=1e-3,[x1,y1]=spine(Math.min(1,u+e)),[x0,y0]=spine(Math.max(0,u-e));
  const tx=x1-x0,ty=y1-y0,l=Math.hypot(tx,ty)||1,nx=ty/l,ny=-tx/l;// +normal points toward +x for an upright spine
  for(let k=0;k<ring;k++){const a=k/ring*Math.PI*2,[s,t]=section(u,a);pos.push(x+nx*s,y+ny*s,t);}}
 for(let i=0;i<segs;i++)for(let k=0;k<ring;k++){const a=i*ring+k,b=i*ring+(k+1)%ring,c=a+ring,d=b+ring;idx.push(a,c,b,b,c,d);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);
 geo.computeVertexNormals();return geo;
}

export function buildWormTooth(g,name=''){
 const crys=/crysknife/.test(name.toLowerCase());
 const tooth=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.75,roughness:crys?.24:.38,
  emissive:crys?0x161a1e:0x14110c});
 const wrap=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.88});
 g.userData.extraMaterial=[tooth,wrap];
 const sets=new Map([[tooth,[]],[wrap,[]]]),c=new THREE.Color();
 const put=(geo,m,tone)=>{if(geo.attributes.uv)geo.deleteAttribute('uv');if(!geo.attributes.normal)geo.computeVertexNormals();if(geo.index)geo=geo.toNonIndexed();
  const p=geo.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));sets.get(m).push(geo);};

 if(crys){
  // The blade: from the guard up a long curve, hooking toward +x near the point.
  const y0=.07,L=.36,hook=.07;
  const spine=u=>[hook*u*u*u+.012*Math.sin(u*Math.PI),y0+L*u];
  // Leaf-widened near the base, tapering to the point; a diamond section (raised spine).
  const half=u=>.03*(1-u)**.75*(1+.25*Math.sin(Math.min(1,u*2.2)*Math.PI))+.0004;
  const thick=u=>.0075*(1-u)**.6+.0003;
  // The saw notch: a few hooked teeth on the inner (-x) edge just above the guard.
  const saw=(u,a)=>{if(u<.05||u>.24||Math.cos(a)>-.85)return 0;const f=((u-.05)/.19*4)%1;return -.007*(1-f)*smooth(.9,1,-Math.cos(a));};
  const blade=sweep(spine,(u,a)=>{const ca=Math.cos(a),sa=Math.sin(a);
   return [half(u)*Math.sign(ca)*Math.abs(ca)**.8+saw(u,a),thick(u)*Math.sign(sa)*(1-Math.abs(ca))**1.1];},40,16);
  put(blade,tooth,(x,y,z,col)=>{const u=(y-y0)/L,[sx]=spine(Math.max(0,Math.min(1,u))),edge=smooth(.45,1,Math.abs(x-sx)/(half(Math.max(0,Math.min(.999,u)))+1e-4));
   col.set(0xe9e4d6).lerp(new THREE.Color(0xf6f7f2),smooth(.3,1,u)*.7);
   col.lerp(new THREE.Color(0x9fb4c2),edge*.55);// the cold shimmer at the edges
   if(Math.abs(z)<.0012&&edge<.3)col.lerp(new THREE.Color(0xfbfbf8),.4);// the spine ridge catches the light
   col.lerp(new THREE.Color(0xc8bc9c),.35*(1-smooth(0,.12,u)));// the root's yellow near the guard
   col.multiplyScalar(.94+.08*hash(Math.floor(y*400)));});
  // The guard: a short, swept bar of root bone, its ends chipped to points.
  const guard=sweep(u=>[-.045+.09*u,.058+.012*Math.abs(u-.5)*2],(u,a)=>{const r=.009*(.45+.55*Math.sin(u*Math.PI));return [Math.cos(a)*r,Math.sin(a)*r*1.5];},12,8);
  put(guard,tooth,(x,y,z,col)=>col.set(0xb8a47c).lerp(new THREE.Color(0x5e4a30),smooth(.02,.045,Math.abs(x))*.6));
  // The grip, wound in dark worm-hide, ridged.
  const grip=new THREE.LatheGeometry([[0,-.075],[.016,-.075],[.017,-.04],[.015,0],[.016,.035],[.018,.05],[0,.05]].map(([r,y])=>new THREE.Vector2(r,y)),12);
  put(grip,wrap,(x,y,z,col)=>{const a=Math.atan2(z,x);col.set(0x2a2320).lerp(new THREE.Color(0x4a3b30),Math.max(0,Math.sin(y*260+a*2))*.6);});
  for(let i=0;i<9;i++){const t=new THREE.TorusGeometry(.0165,.0024,4,12);t.rotateX(Math.PI/2+.22);t.translate(0,-.064+i*.0125,0);
   put(t,wrap,(x,y,z,col)=>col.set(0x1d1714).multiplyScalar(.9+.4*hash(i)));}
  // The pommel: a knuckle of root bone holding a pale crystal bead.
  put(new THREE.SphereGeometry(.021,10,8).scale(1,.8,1).translate(0,-.086,0),tooth,(x,y,z,col)=>col.set(0xc2b08a).lerp(new THREE.Color(0x6b5638),smooth(-.08,-.105,y)*.5));
  put(new THREE.OctahedronGeometry(.009,0).scale(.8,1.3,.8).translate(0,-.108,0),tooth,(x,y,z,col)=>col.set(0xdfeef2));
 }else{
  // The fang: from its torn gum line up a sickle hook toward +x.
  const y0=.035,L=.38,hook=.11;
  const spine=u=>[hook*u*u*(1.1-u*.3),y0+L*u*(1-.12*u*u)];
  const R=u=>.026*(1-u)**.85*(1+.12*(1-u))+.0004;
  // Saw teeth on the inner (-x) curve, small and hooked toward the root.
  const saw=(u,a)=>{if(u<.1||u>.82)return 0;const f=((u-.1)/.72*9)%1;return -.0065*(1-f)**1.5*smooth(.8,1,-Math.cos(a))*(1-u*.6);};
  const fang=sweep(spine,(u,a)=>{const ca=Math.cos(a),sa=Math.sin(a);return [R(u)*ca+saw(u,a),R(u)*.78*sa];},44,14);
  put(fang,tooth,(x,y,z,col)=>{const u=Math.max(0,(y-y0)/L);
   col.set(0xcfc3a0).lerp(new THREE.Color(0xeee8d8),smooth(.15,.65,u));
   col.lerp(new THREE.Color(0xc4d0d6),smooth(.72,1,u)*.6);// the milky, glassy point
   col.lerp(new THREE.Color(0x8a6a44),(1-smooth(0,.14,u))*.6);// stained toward the root
   col.multiplyScalar(.93+.1*hash(Math.floor(y*300)+Math.floor(Math.atan2(z,x)*3)));});
  // The gum fringe: a ragged collar of torn flesh where the fang left the jaw.
  const gum=new THREE.CylinderGeometry(.031,.029,.02,14,2,true);
  {const p=gum.attributes.position;for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),top=p.getY(i)>0;
   p.setY(i,p.getY(i)+(top?.006*Math.sin(a*7)+.008*hash(Math.round(a*20)):0));p.setX(i,p.getX(i)*(1+.15*hash(Math.round(a*9))));}}
  gum.translate(0,y0-.004,0);gum.deleteAttribute('normal');
  put(gum,wrap,(x,y,z,col)=>col.set(0x4a1414).lerp(new THREE.Color(0x7a3226),smooth(y0-.01,y0+.01,y)*.6));
  // The root: the grip, swelling below the gum, then forking into two prongs.
  const root=new THREE.LatheGeometry([[0,-.07],[.019,-.068],[.022,-.04],[.02,-.005],[.026,y0],[0,y0+.002]].map(([r,y])=>new THREE.Vector2(r,y)),12);
  root.scale(1,1,.82);
  const rootTone=(x,y,z,col)=>{col.set(0x6e5536).lerp(new THREE.Color(0x3a2618),hash(Math.floor(y*90)*3+Math.floor(Math.atan2(z,x)*2))*.5);
   col.lerp(new THREE.Color(0x4a1610),smooth(.4,1,Math.sin(y*61+x*90)*Math.sin(z*70))*.6);};// old blood
  put(root,tooth,rootTone);
  for(const s of [-1,1]){const prong=new THREE.ConeGeometry(.012,.055,7);prong.rotateX(Math.PI);prong.rotateZ(s*.42);prong.translate(s*.013,-.09,0);put(prong,tooth,rootTone);}
  // A few slack turns of sinew bind the grip.
  for(let i=0;i<5;i++){const t=new THREE.TorusGeometry(.0215,.0022,4,12);t.rotateX(Math.PI/2+.28*(hash(i)-.5));t.scale(1,1,.84);t.translate(0,-.05+i*.011,0);
   put(t,wrap,(x,y,z,col)=>col.set(0x8a7454).multiplyScalar(.75+.4*hash(i+9)));}
 }

 for(const [m,list] of sets){const merged=mergeGeometries(list);list.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=m===tooth?'blade':'grip';g.add(mesh);}
 g.userData.wormTooth={kind:crys?'crysknife':'worm tooth'};
}
