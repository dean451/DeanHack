import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A royal throne for the `throne` terrain: a two-step dais of dressed stone blocks
// with a tasselled carpet runner draped over the steps; a gilded seat on turned
// legs and lion-paw feet with a button-tufted cushion; armrests ending in scrolled
// volutes set with rubies; a tall back of turned columns and urn finials framing a
// quilted velvet panel, a crown motif and an ogee crest with a sapphire.
// Wear is baked into vertex colours: mottled stone with grime at the foot, gilt
// tarnished in the hollows and rubbed bright where hands rest, crushed velvet worn
// paler on the seat, and a faded carpet with a gold-thread border and lozenges.
// Static parts are merged into one mesh per material: stone, gold, velvet, carpet,
// jewel and ruby. It faces +z like the altar and everything stays inside its tile.
export function createThrone(){
 const g=new THREE.Group();g.name='Throne';
 const materials=[],geometries=[];
 const mat=(o)=>{const m=new THREE.MeshStandardMaterial(o);materials.push(m);return m;};
 const stone=mat({vertexColors:true,roughness:.93});
 const gold=mat({vertexColors:true,metalness:.82,roughness:.34});
 const velvet=mat({vertexColors:true,roughness:1});
 const carpet=mat({vertexColors:true,roughness:1});
 const jewel=mat({color:0x5fd1ff,emissive:0x1d7fd0,emissiveIntensity:1.6,roughness:.2});
 const ruby=mat({color:0xff4058,emissive:0x901020,emissiveIntensity:1.2,roughness:.2});
 const parts={stone,gold,velvet,carpet,jewel,ruby};
 const bins=new Map(Object.values(parts).map(m=>[m,[]]));
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s=new THREE.Vector3();
 const place=(geo,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>geo.applyMatrix4(m4.compose(v.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s.set(sx,sy,sz)));
 // Queue a placed geometry into a material's bin; `paint(x,y,z,normal)` overrides
 // the material's default colouring and `tint` scales it.
 const put=(geo,m,{paint=null,tint=1}={})=>{geo.userData.paint=paint;geo.userData.tint=tint;bins.get(m).push(geo);return geo;};
 const roughen=(geo,amt=.003)=>{
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   p.setXYZ(i,x+(noise3(x*31,y*31,z*31)-.5)*amt*2,y+(noise3(y*29+7,z*29,x*29)-.5)*amt*2,z+(noise3(z*33+3,x*33,y*33)-.5)*amt*2);
  }
  geo.computeVertexNormals();return geo;
 };
 const box=(w,h,d,r,seg=2)=>new RoundedBoxGeometry(w,h,d,seg,Math.min(r,w/2-1e-4,h/2-1e-4,d/2-1e-4));
 const lathe=(pts,seg=14)=>new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),seg);
 const goldBox=(w,h,d,x,y,z,r=.008)=>put(place(box(w,h,d,r),x,y,z),gold);
 const ball=(r,m,x,y,z,sx=1,sy=sx,sz=sx,w=10,h=8)=>put(place(new THREE.SphereGeometry(r,w,h),x,y,z,0,0,0,sx,sy,sz),m);

 // Dais: three dressed blocks on the lower step and two on the upper, with fine
 // joints between them.
 for(let i=0;i<3;i++)put(roughen(place(box(.302,.07,.9,.012),(i-1)*.306,.035,0)),stone,{tint:[1.36,1.44,1.32][i]});
 for(let i=0;i<2;i++)put(roughen(place(box(.368,.07,.66,.012),(i-.5)*.372,.105,-.07)),stone,{tint:[1,.94][i]});

 // Carpet runner: a strip following the step profile, from a fringe on the floor,
 // over both nosings and under the seat.
 {
  const prof=[[.478,.004],[.466,.004],[.458,.012],[.455,.03],[.455,.06],[.452,.071],[.44,.075],[.28,.075],[.268,.08],[.265,.1],[.265,.132],[.26,.143],[.25,.145],[.02,.145]];
  const nx=12,w=.3,pos=[],idx=[];
  for(const [z,y] of prof)for(let j=0;j<=nx;j++){const x=-w/2+w*j/nx;pos.push(x,y+(noise3(x*40,z*40,3)-.5)*.002,z);}
  for(let i=0;i<prof.length-1;i++)for(let j=0;j<nx;j++){const a=i*(nx+1)+j,b=a+nx+1;idx.push(a,a+1,b,a+1,b+1,b);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
  put(geo,carpet);
  for(let j=0;j<11;j++)put(place(new THREE.CylinderGeometry(.004,.006,.022,5),-.13+j*.026,.003,.486,Math.PI/2),carpet,{paint:()=>[.62,.44,.18]});
 }

 // Seat: lion-paw feet on turned legs under a gilt box with a velvet apron.
 for(const x of [-.2,.2])for(const z of [-.2,.14]){
  ball(.032,gold,x,.155,z+.008,1,.55,1.15);
  for(const dx of [-.018,0,.018])ball(.013,gold,x+dx,.151,z+.036,1,.8,1.2,8,6);
  put(place(lathe([[0,0],[.03,0],[.032,.012],[.022,.02],[.018,.045],[.026,.06],[.02,.075],[.03,.088],[.034,.1],[0,.1]]),x,.15,z),gold);
 }
 goldBox(.5,.1,.42,0,.3,-.03,.015);
 goldBox(.52,.016,.44,0,.352,-.03,.006);
 put(place(box(.36,.06,.012,.004),0,.29,.184),velvet);
 put(place(lathe([[0,.012],[.012,.01],[.022,.004],[.026,0],[0,0]],16),0,.29,.19,Math.PI/2),gold);
 ball(.008,ruby,0,.29,.203);
 // Cushion: a rounded pad, puffed up between six dimpled buttons.
 {
  const cw=.44,cd=.36,btn=[];for(const bx of [-.12,0,.12])for(const bz of [-.08,.07])btn.push([bx,bz]);
  const geo=box(cw,.05,cd,.022,4),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(y<=0)continue;
   const u=x/(cw/2),w=z/(cd/2),puff=Math.max(0,(1-u*u)*(1-w*w));
   let dimple=0;for(const [bx,bz] of btn){const d2=((x-bx)**2+(z-bz)**2)/.0009;dimple=Math.max(dimple,Math.exp(-d2));}
   p.setY(i,y+(.018*puff-.014*dimple)*(y/.025));
  }
  geo.computeVertexNormals();place(geo,0,.385,-.01);put(geo,velvet,{paint:seatVelvet});
  for(const [bx,bz] of btn)ball(.007,gold,bx,.412+.018*(1-(bx/.22)**2)*(1-(bz/.18)**2)-.012,bz-.01,1,.6,1,8,5);
 }

 // Armrests: turned posts, a rail and a scrolled volute with a ruby in its eye.
 for(const x of [-.24,.24]){
  const sgn=Math.sign(x);
  put(place(lathe([[0,0],[.026,0],[.028,.014],[.018,.03],[.016,.07],[.024,.09],[.016,.11],[.019,.15],[.028,.172],[.024,.18],[0,.18]]),x,.35,.13),gold);
  goldBox(.06,.035,.42,x,.54,-.04,.012);
  const curve=new THREE.Curve();curve.getPoint=(t,out=new THREE.Vector3())=>{const a=Math.PI/2-t*Math.PI*2*1.35,r=.03*(1-t*.72);return out.set(x,.527+r*Math.sin(a),.165+r*Math.cos(a));};
  put(new THREE.TubeGeometry(curve,40,.012,7,false),gold);
  ball(.011,gold,x,.527,.165,1.6,1,1);
  ball(.012,ruby,x+sgn*.018,.527,.165,.6,1,1);
 }

 // Back: a gilt board between turned columns, a quilted velvet panel in a bead
 // frame, a crown motif above it and an ogee crest crowned with a sapphire.
 const bz=-.22;
 goldBox(.46,.72,.05,0,.68,bz,.012);
 for(const x of [-.225,.225]){
  put(place(lathe([[0,0],[.036,0],[.038,.02],[.03,.035],[.026,.05],[.029,.3],[.026,.6],[.03,.63],[.024,.645],[.036,.67],[.04,.69],[0,.69]]),x,.35,bz),gold);
  put(place(lathe([[0,0],[.022,0],[.034,.03],[.03,.06],[.012,.075],[.016,.085],[0,.09]]),x,1.04,bz),gold);
  ball(.016,gold,x,1.142,bz);
 }
 {
  const pw=.36,ph=.52,py=.66,pz=bz+.027,geo=new THREE.PlaneGeometry(pw,ph,28,40),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,quilt(x,y)*.011*edgeFade(x,y,pw,ph));}
  geo.computeVertexNormals();place(geo,0,py,pz);
  put(geo,velvet,{paint:(x,y,z)=>quiltVelvet(x,y-py,z-pz)});
  for(let i=-6;i<=6;i++)for(let j=-6;j<=6;j++){
   const x=(i+j)/2*.09,y=(i-j)/2*.065;
   if(Math.abs(x)<pw/2-.03&&Math.abs(y)<ph/2-.03)ball(.0055,gold,x,py+y,pz+.002,1,1,.6,6,4);
  }
  for(const sy of [-1,1])goldBox(pw+.02,.014,.014,0,py+sy*(ph/2+.003),pz+.002,.006);
  for(const sx of [-1,1])goldBox(.014,ph+.02,.014,sx*(pw/2+.003),py,pz+.002,.006);
 }
 {
  const crown=new THREE.Shape();crown.moveTo(-.07,0);crown.lineTo(.07,0);crown.lineTo(.07,.016);
  for(const [x,y] of [[.07,.05],[.035,.022],[0,.056],[-.035,.022],[-.07,.05],[-.07,0]])crown.lineTo(x,y);
  put(place(new THREE.ExtrudeGeometry(crown,{depth:.006,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:1,curveSegments:4}),0,.965,bz+.025),gold);
  for(const x of [-.07,0,.07])ball(.007,ruby,x,1.02,bz+.033,1,1,.7,6,4);
 }
 {
  const crest=new THREE.Shape();crest.moveTo(-.23,0);crest.lineTo(.23,0);
  crest.bezierCurveTo(.2,.07,.07,.06,.05,.13);crest.quadraticCurveTo(.035,.19,0,.215);
  crest.quadraticCurveTo(-.035,.19,-.05,.13);crest.bezierCurveTo(-.07,.06,-.2,.07,-.23,0);
  put(place(new THREE.ExtrudeGeometry(crest,{depth:.03,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:2,curveSegments:10}),0,1.036,bz-.015),gold);
  put(place(lathe([[0,.02],[.02,.016],[.03,.006],[.032,0],[0,0]],18),0,1.13,bz+.02,Math.PI/2),gold);
  put(place(new THREE.OctahedronGeometry(.036,0),0,1.13,bz+.05,0,0,0,1,1.3,.55),jewel);
  ball(.012,gold,0,1.26,bz+.008);
 }

 // Bake: every bin gets its colours, then becomes one mesh.
 const n=new THREE.Vector3(),paints={stone:stoneColour,gold:goldColour,velvet:(x,y,z)=>seatVelvet(x,y,z),carpet:carpetColour};
 for(const [material,list] of bins){
  if(!list.length)continue;
  const part=Object.keys(parts).find(key=>parts[key]===material);
  const flats=list.map(geo=>{
   const {paint,tint}=geo.userData;
   const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
   for(const key of Object.keys(flat.attributes))if(!['position','normal'].includes(key))flat.deleteAttribute(key);
   if(material.vertexColors){
    const p=flat.attributes.position,nor=flat.attributes.normal,col=new Float32Array(p.count*3),f=paint||paints[part];
    for(let i=0;i<p.count;i++){n.fromBufferAttribute(nor,i);const c=f(p.getX(i),p.getY(i),p.getZ(i),n);col[i*3]=c[0]*tint;col[i*3+1]=c[1]*tint;col[i*3+2]=c[2]*tint;}
    flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   }
   return flat;
  });
  const geo=mergeGeometries(flats);flats.forEach(f=>f.dispose());geometries.push(geo);
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=material!==jewel&&material!==ruby;mesh.receiveShadow=true;
  mesh.userData.part=part;g.add(mesh);
 }
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}

// Quilting: pillows between a diamond grid of buttons, flat on the grid lines.
function quilt(x,y){const u=x/.09+y/.065,w=x/.09-y/.065;return Math.pow(Math.abs(Math.sin(Math.PI*u)*Math.sin(Math.PI*w)),.6);}
function edgeFade(x,y,pw,ph){return Math.min(1,(pw/2-Math.abs(x))/.03,(ph/2-Math.abs(y))/.03);}

// Violet-grey stone, mottled, darker with grime at the foot and paler on treads.
function stoneColour(x,y,z,n){
 let k=.82+noise3(x*13,y*13,z*13)*.3+(noise3(x*80,y*80,z*80)-.5)*.12;
 if(n.y>.6)k*=1.08;if(n.y<-.5)k*=.6;
 k*=.72+.28*Math.min(1,y/.05);
 return [.24*k,.23*k,.27*k];
}

// Gilt: tarnished dark in patches and low down, brighter on upward faces and where
// hands rub the armrests.
function goldColour(x,y,z,n){
 let k=.86+noise3(x*18,y*18,z*18)*.22;
 if(n.y>.5)k*=1.07;if(n.y<-.5)k*=.72;
 k*=.8+.2*Math.min(1,Math.max(0,(y-.14)/.2));
 let r=.9*k,g=.67*k,b=.3*k;
 const tarnish=noise3(x*42+5,y*42,z*42);
 if(tarnish>.64){const t=Math.min(1,(tarnish-.64)*4)*.7;r+=(.3-r)*t;g+=(.24-g)*t;b+=(.1-b)*t;}
 if(Math.abs(Math.abs(x)-.24)<.04&&y>.55&&n.y>.5){r=Math.min(1,r*1.15);g=Math.min(1,g*1.15);b*=1.1;}
 return [r,g,b];
}

// Crushed red velvet; the seat is worn paler and pinker in the middle.
function seatVelvet(x,y,z){
 const k=.84+noise3(x*60,y*60,z*60)*.32;
 const wear=Math.max(0,1-(x*x/.02+(z+.02)**2/.015))*(y>.39?1:0)*.6;
 return [(.44+.12*wear)*k,(.06+.05*wear)*k,(.1+.05*wear)*k];
}
// The quilted back panel: pile catching light on the pillows, dark in the creases.
function quiltVelvet(x,y,z){
 const k=(.82+noise3(x*60,y*60,z*60)*.28)*(.55+.5*quilt(x,y));
 return [.44*k,.06*k,.1*k];
}

// Faded red runner: a gold-thread border stripe, a dark outer band and a row of
// lozenges down the middle, worn paler where feet tread.
function carpetColour(x,y,z){
 const ax=Math.abs(x),along=y-z;
 let k=.85+noise3(x*70,along*70,1)*.25;
 let r=.4,g=.08,b=.12;
 if(ax>.138){r=.22;g=.05;b=.09;}
 else if(ax>.116&&ax<.128){r=.66;g=.47;b=.2;}
 else{const f=along*8.5-Math.floor(along*8.5),loz=ax/.05+Math.abs(f-.5)*2;if(loz<.75){r=.14;g=.12;b=.3;if(loz<.3){r=.66;g=.47;b=.2;}}}
 if(ax<.12)k*=1+.18*Math.max(0,1-Math.abs(z-.33)/.14)+.1*Math.max(0,1-Math.abs(z-.17)/.1);
 return [r*k,g*k,b*k];
}

function hash3(x,y,z){const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s);}
function noise3(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
 const fx=x-ix,fy=y-iy,fz=z-iz,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy),uz=fz*fz*(3-2*fz);
 const l=(a,b,t)=>a+(b-a)*t;
 const c=(dx,dy,dz)=>hash3(ix+dx,iy+dy,iz+dz);
 return l(l(l(c(0,0,0),c(1,0,0),ux),l(c(0,1,0),c(1,1,0),ux),uy),l(l(c(0,0,1),c(1,0,1),ux),l(c(0,1,1),c(1,1,1),ux),uy),uz);
}
