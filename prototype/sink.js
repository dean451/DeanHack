import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A kitchen sink for the `sink` terrain: a stone washstand on a plinth with a panelled
// wooden cabinet, a limestone counter with an oval cut-out holding a lathe-turned
// porcelain basin (a little water over a drain), a splashback, and a brass swan-neck
// tap between two cross-handled valves with red and blue enamel caps. A plug on a
// chain, a worn bar of soap and a striped rag hung over the front edge sit on the
// counter.
// Weathering is baked into vertex colours: the stone is mottled, darkened by water
// round the basin and crusted with limescale at the tap; the wood has grain and a damp
// foot; the porcelain is crazed, with a tide ring and a rust stain below the spout;
// the brass has verdigris in its low corners.
// Static parts are merged into one mesh per material: stone, wood, porcelain, brass
// and water. It faces +z like the altar and stays inside its tile.
export function createSink(){
 const g=new THREE.Group();g.name='Sink';
 const materials=[],geometries=[];
 const mat=(o)=>{const m=new THREE.MeshStandardMaterial(o);materials.push(m);return m;};
 const stone=mat({vertexColors:true,roughness:.86});
 const wood=mat({vertexColors:true,roughness:.84});
 const porcelain=mat({vertexColors:true,roughness:.28});
 const brass=mat({vertexColors:true,metalness:.85,roughness:.32});
 const water=mat({color:0x3f8fb8,emissive:0x0d3550,emissiveIntensity:.5,roughness:.05,metalness:.1,transparent:true,opacity:.78});
 const parts={stone,wood,porcelain,brass,water};
 const painters=new Map([[stone,stoneColour],[wood,woodColour],[porcelain,porcelainColour],[brass,brassColour]]);
 const bins=new Map(Object.values(parts).map(m=>[m,[]]));
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s=new THREE.Vector3();
 const place=(geo,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>geo.applyMatrix4(m4.compose(v.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s.set(sx,sy,sz)));
 // Queue a placed geometry into a material's bin. `paint(x,y,z,normal)` overrides
 // the material's colour at bake time; `tint` scales it.
 const put=(geo,m,{paint=null,tint=1}={})=>{geo.userData.paint=paint;geo.userData.tint=tint;bins.get(m).push(geo);return geo;};
 // Roughen by position-keyed noise, so shared corners move together and no cracks open.
 const roughen=(geo,amt=.002)=>{
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   p.setXYZ(i,x+(noise3(x*31,y*31,z*31)-.5)*amt*2,y+(noise3(y*29+7,z*29,x*29)-.5)*amt*2,z+(noise3(z*33+3,x*33,y*33)-.5)*amt*2);
  }
  if(geo.index)geo.computeVertexNormals();
  return geo;
 };
 const box=(w,h,d,m,x,y,z,{r=.012,rx=0,ry=0,rz=0,tint=1,paint=null,rough=0}={})=>{
  const geo=place(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/2,h/2,d/2)),x,y,z,rx,ry,rz);
  return put(rough?roughen(geo,rough):geo,m,{tint,paint});
 };
 const lathe=(pts,seg=16)=>new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),seg);

 // Washstand: a stone plinth, then the wooden cabinet carcass.
 box(.74,.05,.55,stone,0,.025,-.04,{r:.012,rough:.003,tint:.9});
 box(.68,.39,.52,wood,0,.245,-.04,{r:.014});
 // Two panelled doors (stiles, rails and a sunken panel), hinges at the outer edges
 // and ring pulls on backplates at the inner edges, with a dark gap between them.
 for(const side of [-1,1]){
  const cx=side*.165,z=.224;
  for(const x of [cx-.13,cx+.13])box(.036,.33,.016,wood,x,.245,z,{r:.005,tint:1.04});
  for(const y of [.1,.39])box(.224,.036,.016,wood,cx,y,z,{r:.005,tint:1.04});
  box(.236,.27,.008,wood,cx,.245,z-.003,{r:.003,tint:.86});
  box(.19,.23,.01,wood,cx,.245,z+.001,{r:.012,tint:.95});
  for(const y of [.13,.36])put(place(new THREE.CylinderGeometry(.006,.006,.04,8),cx+side*.146,y,z+.004),brass,{tint:.9});
  const px=cx-side*.1;
  box(.03,.05,.004,brass,px,.285,z+.01,{r:.002,tint:.85});
  put(place(new THREE.SphereGeometry(.006,8,6),px,.3,z+.014),brass);
  put(place(new THREE.TorusGeometry(.017,.0035,6,16),px,.281,z+.02,.25,0,0),brass,{tint:1.12});
 }
 box(.012,.34,.006,wood,0,.245,.227,{r:.002,tint:.25});

 // Counter: a limestone slab with an oval cut-out for the basin, and a splashback.
 const holeZ=-.02;
 {
  const shape=new THREE.Shape();
  shape.moveTo(-.4,-.26);shape.lineTo(.4,-.26);shape.lineTo(.4,.34);shape.lineTo(-.4,.34);shape.lineTo(-.4,-.26);
  const hole=new THREE.Path();hole.absellipse(0,-holeZ,.24,.185,0,Math.PI*2,true);shape.holes.push(hole);
  const slab=new THREE.ExtrudeGeometry(shape,{depth:.048,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:2,curveSegments:40});
  slab.rotateX(-Math.PI/2);slab.translate(0,.446,0);
  put(roughen(slab,.0015),stone);
 }
 box(.8,.13,.04,stone,0,.565,-.32,{r:.01,rough:.002});
 box(.82,.02,.056,stone,0,.635,-.318,{r:.008,rough:.0015,tint:1.05});

 // Basin: one closed lathe loop, up the outside, over a rolled flange that rests on
 // the counter and down the inside to the drain, stretched into an oval.
 const bx=1.3;
 put(place(lathe([[.03,.388],[.09,.392],[.14,.41],[.168,.44],[.178,.475],[.18,.498],[.2,.5],[.206,.506],[.204,.513],[.195,.517],[.182,.517],
  [.172,.512],[.165,.49],[.155,.46],[.135,.43],[.1,.408],[.06,.398],[.03,.396]],44),0,0,holeZ,0,0,0,bx,1,1),porcelain);
 // Drain: a dark throat, then a brass grate of a ring and a cross.
 put(place(new THREE.CylinderGeometry(.03,.03,.012,16,1,true),0,.39,holeZ),brass,{paint:()=>[.08,.08,.08]});
 put(place(new THREE.CircleGeometry(.03,16),0,.386,holeZ,-Math.PI/2),brass,{paint:()=>[.05,.05,.05]});
 put(place(new THREE.TorusGeometry(.028,.004,6,20),0,.397,holeZ,Math.PI/2),brass,{tint:.8});
 for(const r of [0,Math.PI/2])box(.056,.004,.006,brass,0,.397,holeZ,{r:.002,ry:r,tint:.8});
 // Water: a shallow pool meeting the inner wall (radius .145 at this height).
 put(place(new THREE.CircleGeometry(.145,32),0,.445,holeZ,-Math.PI/2,0,0,bx,1,1),water);

 // Tap: a flanged base, a banded pillar, a swan neck and a flared spout.
 const tapZ=-.262;
 put(place(lathe([[0,0],[.036,0],[.037,.006],[.03,.012],[.022,.016],[.02,.03],[.024,.034],[.024,.04],[.019,.044],[.018,.13],[.023,.135],[.023,.142],[.017,.146],[0,.146]],18),0,.5,tapZ),brass);
 const neck=new THREE.CatmullRomCurve3([[0,.64,tapZ],[0,.7,tapZ+.005],[0,.745,tapZ+.04],[0,.76,tapZ+.1],[0,.745,tapZ+.16],[0,.715,tapZ+.19]].map(p=>new THREE.Vector3(...p)));
 put(new THREE.TubeGeometry(neck,24,.013,10,false),brass);
 const end=neck.getPoint(1),dir=neck.getTangent(1);
 const spout=lathe([[.013,0],[.013,.012],[.016,.02],[.012,.024],[0,.024]],12);
 spout.applyMatrix4(m4.compose(end,q.setFromUnitVectors(new THREE.Vector3(0,1,0),dir),s.set(1,1,1)));
 put(spout,brass);
 // A drip hanging from the spout.
 put(place(new THREE.SphereGeometry(.008,8,6),end.x+dir.x*.03,end.y+dir.y*.03,end.z+dir.z*.03,0,0,0,1,1.5,1),water);
 for(const x of [-.13,.13]){
  put(place(lathe([[0,0],[.03,0],[.03,.005],[.02,.01],[.016,.02],[.019,.048],[.022,.052],[.012,.058],[0,.058]],14),x,.5,tapZ+.01),brass);
  for(const r of [0,Math.PI/2])put(place(new THREE.CapsuleGeometry(.005,.07,3,8),x,.556,tapZ+.01,0,r+Math.PI/4,Math.PI/2),brass,{tint:1.12});
  for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;put(place(new THREE.SphereGeometry(.008,8,6),x+Math.cos(a)*.04,.556,tapZ+.01+Math.sin(a)*.04),brass,{tint:1.12});}
  const cap=x<0?[.62,.08,.07]:[.1,.22,.62];
  put(place(new THREE.SphereGeometry(.013,12,8,0,Math.PI*2,0,Math.PI/2),x,.562,tapZ+.01,0,0,0,1,.7,1),porcelain,{paint:()=>cap});
 }

 // A rubber plug on a chain of brass links, lying on the counter to the right.
 {
  const px=.3,pz=-.17;
  put(place(lathe([[0,0],[.024,0],[.027,.004],[.024,.012],[.02,.014],[0,.014]],16),px,.5,pz),porcelain,{paint:()=>[.07,.06,.055]});
  put(place(new THREE.TorusGeometry(.007,.002,5,10),px,.518,pz),brass);
  const path=new THREE.QuadraticBezierCurve3(new THREE.Vector3(px,.502,pz),new THREE.Vector3(.2,.502,-.29),new THREE.Vector3(.05,.51,tapZ+.005));
  const n=13;
  for(let i=0;i<n;i++){
   const t=(i+.5)/n,p=path.getPoint(t),d=path.getTangent(t);
   const link=new THREE.TorusGeometry(.0065,.0017,5,10);link.scale(1.5,1,1);
   if(i%2)link.rotateX(Math.PI/2);
   link.applyMatrix4(m4.compose(p,q.setFromUnitVectors(new THREE.Vector3(1,0,0),d),s.set(1,1,1)));
   put(link,brass,{tint:.95});
  }
 }
 // A worn bar of soap at the back left.
 box(.075,.024,.048,porcelain,-.3,.512,-.25,{r:.011,ry:.35,rough:.002,paint:(x,y)=>{const k=.9+noise3(x*80,y*80,3)*.15;return [.7*k,.8*k,.56*k];}});

 // A striped rag hung over the front edge: flat on the counter, then down the face.
 {
  const w=.13,top=.07,drop=.13,geo=new THREE.PlaneGeometry(w,top+drop+.012,10,24),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const u=p.getX(i),t=p.getY(i)+(top+drop+.012)/2;
   const ripple=Math.sin(u*70+t*18)*.003;
   let y,z;
   if(t<top){y=.5025+ripple*.3;z=.262-top+t;}
   else if(t<top+.012){const a=(t-top)/.012*Math.PI/2;y=.4945+Math.cos(a)*.008;z=.262+Math.sin(a)*.008;}
   else{y=.4945-(t-top-.012);z=.271+Math.abs(ripple)+(t-top-.012)*.05;}
   p.setXYZ(i,u+.26+(t>top?Math.sin(t*20)*.004:0),y,z);
  }
  geo.computeVertexNormals();
  const back=geo.clone();back.index.array.reverse();back.computeVertexNormals();
  const cloth=(x,y,z)=>{const stripe=Math.abs(((x-.26)*60)%6)<1.1,k=.85+noise3(x*120,y*120,z*120)*.2;return stripe?[.18*k,.26*k,.46*k]:[.74*k,.7*k,.6*k];};
  put(geo,wood,{paint:cloth});put(back,wood,{paint:cloth,tint:.8});
 }

 // Bake: every vertex-coloured bin gets its colours, then each bin becomes one mesh.
 const n=new THREE.Vector3();
 for(const [material,list] of bins){
  if(!list.length)continue;
  const flats=list.map(geo=>{
   const {paint,tint}=geo.userData;
   const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
   for(const key of Object.keys(flat.attributes))if(!['position','normal'].includes(key))flat.deleteAttribute(key);
   if(material.vertexColors){
    const p=flat.attributes.position,nor=flat.attributes.normal,col=new Float32Array(p.count*3),f=paint||painters.get(material);
    for(let i=0;i<p.count;i++){n.fromBufferAttribute(nor,i);const c=f(p.getX(i),p.getY(i),p.getZ(i),n);col[i*3]=c[0]*tint;col[i*3+1]=c[1]*tint;col[i*3+2]=c[2]*tint;}
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

// Pale limestone: mottled, darker underneath, wet and dark round the basin, with a
// white limescale crust round the tap and along the foot of the splashback.
function stoneColour(x,y,z,n){
 let k=.82+noise3(x*16,y*16,z*16)*.26+(noise3(x*80+5,y*80,z*80)-.5)*.1;
 if(n.y<-.5)k*=.62;
 if(y<.05)k*=.8+y*4;
 const d=Math.hypot(x/.24,(z+.02)/.185);
 if(y>.44&&d<1.5)k*=.72+.28*Math.min(1,Math.max(0,(d-1)/.5))+(noise3(x*40,z*40,2)-.5)*.08*(d<1.3?1:0);
 let r=.6*k,g=.575*k,b=.52*k;
 const scale=Math.max(0,1-Math.hypot(x,(z+.262)*1.4)/.09)+(y>.5&&y<.53&&z<-.29?.5:0);
 const lime=scale*noise3(x*70,y*70,z*70+4);
 if(lime>.18){const t=Math.min(1,(lime-.18)*3);r+=(.86-r)*t;g+=(.85-g)*t;b+=(.8-b)*t;}
 return [r,g,b];
}

// Oak: vertical grain on the fronts (across whichever axis the face spans), darker
// and damp near the floor.
function woodColour(x,y,z,n){
 const u=Math.abs(n.x)>.5?z:x;
 const grain=Math.sin((u+noise3(u*5,y*3,1)*.06)*260)*.5+.5;
 let k=.78+grain*.18+(noise3(u*40,y*6,7)-.5)*.2;
 k*=.72+.28*Math.min(1,Math.max(0,(y-.05)/.12));
 if(n.y<-.5)k*=.6;
 return [.4*k,.25*k,.14*k];
}

// Glazed porcelain: off-white with fine crazing, a brown tide ring at the waterline
// and a rust stain under the spout running down to the drain.
function porcelainColour(x,y,z,n){
 let r=.9,g=.885,b=.84;
 const craze=Math.abs(noise3(x*70,y*70,z*70)-.5);
 if(craze<.025){const t=(1-craze/.025)*.12;r-=t;g-=t;b-=t*.9;}
 const ring=Math.max(0,1-Math.abs(y-.448)/.008)*(n.y>-.2?1:0);
 if(ring){r-=ring*.2;g-=ring*.24;b-=ring*.3;}
 const cx=Math.abs(x),cz=z+.02;
 const rust=y>.39&&y<.52?Math.max(0,1-cx/.028)*Math.max(0,Math.min(1,(-cz-.02)/.12))*(noise3(x*50,y*50,z*50)*.6+.6)+Math.max(0,1-Math.hypot(x,cz)/.06)*.7:0;
 if(rust>0){const t=Math.min(1,rust);r+=(.55-r)*t;g+=(.3-g)*t;b+=(.14-b)*t;}
 return [r,g,b];
}

// Brass: warm gold, patchy, with blue-green verdigris gathering low down and in the
// undersides.
function brassColour(x,y,z,n){
 const k=.85+noise3(x*60,y*60,z*60)*.25;
 let r=.86*k,g=.66*k,b=.32*k;
 const low=(n.y<-.2?.6:0)+Math.max(0,1-(y-.5)/.03)*.6;
 const verd=noise3(x*90+2,y*90,z*90)*low;
 if(verd>.25){const t=Math.min(1,(verd-.25)*3);r+=(.28-r)*t;g+=(.52-g)*t;b+=(.44-b)*t;}
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
