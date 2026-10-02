import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A grave for the `grave` terrain: a plot of turned earth heaped into a lumpy mound
// inside a stone kerb, with a leaning headstone on a plinth at -z, grass tufts along
// the kerb, a dead posy on the mound and a candle stub with running wax.
// The seed picks the headstone (a cracked round-topped slab with a winged death's head,
// a cracked pointed gothic slab with a cross, or a ringed cross), its lean, the tilt of one sunken kerb
// stone and where the clods fall. On about half the graves a skeletal hand has clawed
// up through a torn hollow in the mound (userData.risen); it is baked into the stone.
// The stone is lightly roughened and its weathering is baked into vertex colours
// (mottling, rain streaks down the face, lichen on the tops, moss at the foot); the
// soil is darker and damp at the edges, drier and crumbly on top.
// Static parts are merged into one mesh per material: stone, earth, grass, wax and
// flame. The mound faces +z like the altar and everything stays inside its tile.
export function createGrave(seed=0){
 const g=new THREE.Group();g.name='Grave';
 const materials=[],geometries=[];
 const mat=(o)=>{const m=new THREE.MeshStandardMaterial(o);materials.push(m);return m;};
 const stone=mat({vertexColors:true,roughness:.93});
 const earth=mat({vertexColors:true,roughness:1});
 const grass=mat({vertexColors:true,roughness:.88,side:THREE.DoubleSide});
 const wax=mat({color:0xd9ceb0,roughness:.62});
 const flame=mat({color:0xffc26a,emissive:0xff9a2e,emissiveIntensity:1.6,roughness:.4});
 const parts={stone,earth,grass,wax,flame};
 const bins=new Map(Object.values(parts).map(m=>[m,[]]));
 const rand=(i)=>{const s=Math.sin(seed*12.9898+i*78.233)*43758.5453;return s-Math.floor(s);};
 const off=rand(99)*50;
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s=new THREE.Vector3();
 const place=(geo,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>geo.applyMatrix4(m4.compose(v.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s.set(sx,sy,sz)));
 // Queue a placed geometry into a material's bin. `paint(x,y,z,normal)` gives its
 // vertex colour at bake time (for vertex-coloured materials); `tint` scales it.
 const put=(geo,m,{paint=null,tint=1}={})=>{geo.userData.paint=paint;geo.userData.tint=tint;bins.get(m).push(geo);return geo;};
 // Roughen a geometry by a position-keyed noise, so shared corners move together
 // and no cracks open between faces.
 const roughen=(geo,amt=.003)=>{
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   p.setXYZ(i,x+(noise3(x*31+off,y*31,z*31)-.5)*amt*2,y+(noise3(y*29+7,z*29,x*29+off)-.5)*amt*2,z+(noise3(z*33+3+off,x*33,y*33)-.5)*amt*2);
  }
  if(geo.index)geo.computeVertexNormals();
  return geo;
 };
 const block=(w,h,d,x,y,z,{r=.012,rx=0,ry=0,rz=0,tint=1,rough=.003}={})=>
  put(roughen(place(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/2,h/2,d/2)),x,y,z,rx,ry,rz),rough),stone,{tint});

 // Kerb: two long sides, a head and a foot, with corner posts. One stone has sunk
 // and tilted a little.
 const sunk=Math.floor(rand(1)*4);
 const kerb=[[-.25,.035,.06,.06,.07,.72],[.25,.035,.06,.06,.07,.72],[0,.035,-.3,.44,.07,.06],[0,.035,.42,.44,.07,.06]];
 kerb.forEach(([x,y,z,w,h,d],i)=>{
  const tilt=i===sunk?(rand(2)-.5)*.06:0;
  block(w,h,d,x,y-(i===sunk?.008:0),z,{r:.01,rx:i<2?tilt:0,rz:i<2?0:tilt,tint:.95+rand(i+3)*.1});
 });
 for(const x of [-.25,.25])for(const z of [-.3,.42])block(.08,.09,.08,x,.045,z,{r:.02,ry:(rand(x*7+z*5+9)-.5)*.3,tint:1.04});

 // About half the graves are not resting: a skeletal hand has clawed up through the
 // mound. Where it breaks out, the soil is torn open into a dark hollow.
 const risen=rand(100)<.5,hx=(rand(101)-.5)*.12,hz=.14+rand(102)*.1,HOLE=.05;
 const hollow=(x,z)=>{if(!risen)return 0;const d=Math.hypot(x-hx,(z-hz)*.85)/HOLE;return d<1?(1-d*d):0;};
 const soil=soilColour(off),torn=(x,y,z)=>{const c=soil(x,y,z),k=1-.7*hollow(x,z);return [c[0]*k,c[1]*k,c[2]*k];};

 // Earth: a height field filling the plot, heaped into a lumpy mound. Its edges
 // tuck under the kerb.
 {
  const nx=30,nz=44,x0=-.228,x1=.228,z0=-.278,z1=.398;
  const geo=new THREE.PlaneGeometry(x1-x0,z1-z0,nx,nz);geo.rotateX(-Math.PI/2);geo.translate((x0+x1)/2,0,(z0+z1)/2);
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),z=p.getZ(i),u=x/.2,w=(z-.07)/.31,r2=u*u+w*w;
   const heap=r2<1?.105*Math.pow(1-r2,.65):0;
   const lump=(noise3(x*38+off,z*38,1)-.5)*.02+(noise3(x*90,z*90+off,4)-.5)*.006;
   p.setY(i,.022+heap+lump*(.4+Math.min(1,heap*14))-.045*hollow(x,z));
  }
  geo.computeVertexNormals();
  put(geo,earth,{paint:torn});
 }
 const moundY=(x,z)=>{const u=x/.2,w=(z-.07)/.31,r2=u*u+w*w;return .022+(r2<1?.105*Math.pow(1-r2,.65):0);};
 // Clods of earth and a few pebbles on the mound.
 for(let i=0;i<9;i++){
  const a=rand(i+10)*Math.PI*2,r=.03+rand(i+20)*.13,x=Math.cos(a)*r*.9,z=.07+Math.sin(a)*r*1.4;
  const size=.012+rand(i+30)*.012,geo=new THREE.DodecahedronGeometry(size,0);
  place(geo,x,moundY(x,z)+size*.3,z,rand(i+40)*3,rand(i+50)*3,0,1,.7,1);
  if(i%3===2)put(roughen(geo,.002),stone,{tint:1.1});else put(geo,earth,{paint:soilColour(off),tint:.85});
 }

 // The hand: forearm bones rising out of the hollow, a bony palm, and long fingers hooked
 // into claws that rake toward the foot of the grave. Baked into the stone mesh with a
 // bone paint: yellowed, darker in the joints and caked with earth near the soil.
 if(risen){
  const up=new THREE.Vector3(0,1,0),dir=new THREE.Vector3(),mid=new THREE.Vector3();
  const frame=new THREE.Matrix4().compose(v.set(hx,moundY(hx,hz)-.045*hollow(hx,hz)-.02,hz),q.setFromEuler(e.set(0,(rand(103)-.5)*1.4,0)),s.set(1.4,1.4,1.4));
  const bone=(a,b,r)=>{
   dir.subVectors(b,a);const len=dir.length();mid.addVectors(a,b).multiplyScalar(.5);
   const geo=new THREE.CapsuleGeometry(r,Math.max(.001,len-r),3,6);
   geo.applyMatrix4(new THREE.Matrix4().compose(mid,new THREE.Quaternion().setFromUnitVectors(up,dir.normalize()),s.set(1,1,1)));
   put(geo.applyMatrix4(frame),stone,{paint:boneColour(off,moundY(hx,hz)-.02)});
  };
  const P=(x,y,z)=>new THREE.Vector3(x,y,z);
  // Radius and ulna, leaning out toward +z, and a knobbly wrist.
  const wrist=P(0,.085,.03);
  bone(P(-.008,-.01,-.01),P(-.007,.08,.027),.0055);bone(P(.008,-.01,-.012),P(.008,.08,.025),.0045);
  for(const x of [-.009,0,.009])put(place(new THREE.IcosahedronGeometry(.006,0),x,wrist.y+.004,wrist.z+.002).applyMatrix4(frame),stone,{paint:boneColour(off,0)});
  // Metacarpals fan from the wrist to the knuckles; each finger then curls in three joints.
  const spread=[-.021,-.007,.007,.02],lens=[.024,.027,.025,.02];
  spread.forEach((x,i)=>{
   const knuckle=P(x,.122+(i===1||i===2?.004:0),.05+.002*i);
   bone(P(x*.4,wrist.y+.004,wrist.z+.002),knuckle,.0034);
   let p=knuckle,pitch=.35+rand(110+i)*.25,yaw=x*4;
   for(let j=0;j<3;j++){
    const L=lens[i]*[1,.75,.62][j];
    pitch+=.55+rand(120+i*3+j)*.3;// each joint hooks further down: a claw
    const n=P(p.x+Math.sin(yaw)*Math.sin(pitch)*L,p.y+Math.cos(pitch)*L,p.z+Math.cos(yaw)*Math.sin(pitch)*L);
    bone(p,n,.0032-j*.0006);p=n;
   }
   // A long, sharp, broken nail on the tip.
   const tip=new THREE.ConeGeometry(.0022,.009,5);tip.rotateX(pitch);tip.rotateY(yaw);
   tip.translate(p.x+Math.sin(yaw)*Math.sin(pitch)*.004,p.y+Math.cos(pitch)*.004,p.z+Math.cos(yaw)*Math.sin(pitch)*.004);
   put(tip.applyMatrix4(frame),stone,{paint:boneColour(off,0),tint:.7});
  });
  // The thumb, splayed off the inner side of the palm.
  bone(P(-.01,wrist.y+.004,wrist.z),P(-.03,.11,.045),.0036);bone(P(-.03,.11,.045),P(-.04,.122,.062),.003);
  // Earth heaped round the break-out, and clods flung onto the mound.
  for(let i=0;i<7;i++){
   const a=i/7*Math.PI*2+rand(130+i),r=HOLE*(.95+rand(140+i)*.3),x=hx+Math.cos(a)*r,z=hz+Math.sin(a)*r/.85;
   if(Math.abs(x)>.21||z<-.26||z>.38)continue;
   const size=.011+rand(150+i)*.01,geo=new THREE.DodecahedronGeometry(size,0);
   put(place(geo,x,moundY(x,z)+size*.2,z,rand(160+i)*3,rand(170+i)*3,0,1.2,.6,1),earth,{paint:soil,tint:.8});
  }
 }

 // Headstone: a plinth, then the stone itself, leaning back a little. Slabs carry
 // a carved cross and three lines of epitaph on their +z face.
 block(.36,.06,.14,0,.03,-.33,{r:.015,tint:.92});
 const lean=new THREE.Matrix4().compose(v.set(0,.06,-.33),q.setFromEuler(e.set(-.06-rand(5)*.06,0,(rand(6)-.5)*.09)),s.set(1,1,1));
 const kind=['round','gothic','cross'][Math.floor(rand(7)*3)];
 const onHead=(geo,tint=1)=>put(roughen(geo.applyMatrix4(lean),.0025),stone,{tint});
 const inset=(w,h,x,y,z=.037,rz=0)=>onHead(place(new RoundedBoxGeometry(w,h,.006,1,.002),x,y,z,0,0,rz),.42);
 if(kind==='cross'){
  // A ringed cross on a stepped base.
  onHead(place(new RoundedBoxGeometry(.2,.06,.1,2,.012),0,.03,0),.97);
  onHead(place(new RoundedBoxGeometry(.075,.4,.06,2,.01),0,.26,0));
  onHead(place(new RoundedBoxGeometry(.25,.07,.06,2,.01),0,.34,0));
  onHead(place(new THREE.TorusGeometry(.078,.014,8,28),0,.34,0,0,0,0,1,1,1.9));
  for(const [x,y] of [[0,.3],[0,.38],[-.05,.34],[.05,.34]])onHead(place(new THREE.SphereGeometry(.009,8,6),x,y,.03,0,0,0,1,1,.6),.8);
  inset(.1,.012,0,.1,.031);
 }else{
  const W=.14,body=kind==='round'?.3:.28,pts=[];
  pts.push(new THREE.Vector2(-W,0),new THREE.Vector2(W,0),new THREE.Vector2(W,body));
  if(kind==='round'){for(let i=1;i<24;i++){const a=i/24*Math.PI;pts.push(new THREE.Vector2(Math.cos(a)*W,body+Math.sin(a)*W));}}
  else{
   // Two arcs of radius 1.5W, each centred on the far side, meeting in a point:
   // a pointed (gothic) arch. Traced from the right shoulder over to the left.
   const R=1.5*W,apex=Math.acos((R-W)/R);
   for(let i=1;i<=10;i++){const a=apex*i/10;pts.push(new THREE.Vector2(W-R+R*Math.cos(a),body+R*Math.sin(a)));}
   for(let i=9;i>=1;i--){const a=apex*i/10;pts.push(new THREE.Vector2(-W+R-R*Math.cos(a),body+R*Math.sin(a)));}
  }
  pts.push(new THREE.Vector2(-W,body));
  const slab=new THREE.ExtrudeGeometry(new THREE.Shape(pts),{depth:.056,bevelEnabled:true,bevelThickness:.007,bevelSize:.007,bevelSegments:2,curveSegments:24});
  slab.translate(0,.007,-.028);
  onHead(slab);
  // Carvings: dark recessed strokes just proud of the face. The gothic slab bears a cross;
  // the round one a winged death's head, its sockets cut deep, its wings swept down.
  const cy=kind==='round'?.34:.35;
  if(kind==='round'){
   const relief=(geo,tint=1)=>onHead(geo,tint);
   relief(place(new THREE.SphereGeometry(.03,14,10),0,cy+.012,.03,0,0,0,1,1.08,.42),1.02);
   relief(place(new RoundedBoxGeometry(.034,.022,.012,1,.004),0,cy-.022,.034),.98);
   for(const x of [-.012,.012])relief(place(new THREE.SphereGeometry(.0095,8,6),x,cy+.008,.04,0,0,x>0?-.3:.3,1,.8,.5),.25);
   relief(place(new THREE.ConeGeometry(.005,.01,3),0,cy-.006,.042,Math.PI,0,0,1,1,.5),.3);
   for(let t=0;t<4;t++)inset(.003,.012,-.011+t*.0073,cy-.022,.041);
   // Each wing: five feathers fanned out and down from behind the skull, longest on top.
   for(const side of [-1,1])for(let f=0;f<5;f++){
    const len=.075-f*.009,a=side*(1.25+f*.2),r0=.03;
    const x=side*r0+Math.sin(a)*len/2,y=cy+.01-f*.004+Math.cos(a)*len/2;
    relief(place(new RoundedBoxGeometry(.013,len,.007,1,.003),x,y,.031,0,0,-a),.94-f*.03);
    inset(.002,len*.7,x,y,.0352,-a);
   }
  }else{
   inset(.026,.13,0,cy);inset(.085,.026,0,cy+.025);
  }
  for(const [y,w] of [[.21,.17],[.17,.12],[.13,.15]])inset(w,.011,0,y);
  inset(.05,.008,0,.09);
  // A jagged crack runs down from the shoulder through the epitaph, splitting once.
  const zig=(x,y,steps,dx)=>{
   for(let i=0;i<steps;i++){
    const nx=x+dx+(rand(180+i+steps*7)-.5)*.04,ny=y-.035-rand(190+i+steps*5)*.025;
    const len=Math.hypot(nx-x,ny-y);
    inset(.0045-i*.0004,len+.003,(x+nx)/2,(y+ny)/2,.0375,Math.atan2(nx-x,y-ny));
    x=nx;y=ny;
   }
   return [x,y];
  };
  const side=rand(8)<.5?-1:1,[bx,by]=zig(side*(.1+rand(9)*.03),body+.03,3,-side*.012);
  zig(bx,by,3,-side*.006);zig(bx,by,2,side*.02);
 }

 // Grass: tufts of tapered blades hugging the kerb, the corners and the plinth.
 const green=new THREE.Color(),tip=new THREE.Color();
 const tuft=(x,z,n,hMax,k)=>{
  for(let b=0;b<n;b++){
   const h=hMax*(.55+rand(k*11+b)*.45),w=.007+rand(k*13+b)*.005,a=b/n*Math.PI*2+rand(k*17+b),lean=.25+rand(k*19+b)*.45;
   const geo=new THREE.BufferGeometry();
   geo.setAttribute('position',new THREE.Float32BufferAttribute([-w,0,0,w,0,0,w*.3,h*.55,0,-w*.3,h*.55,0,0,h,0],3));
   geo.setIndex([0,1,2,0,2,3,3,2,4]);
   place(geo,x+Math.cos(a)*.008,0,z+Math.sin(a)*.008,Math.sin(a)*lean,-a+Math.PI/2,Math.cos(a)*lean);
   geo.computeVertexNormals();
   const dry=rand(k*23+b);
   put(geo,grass,{paint:(px,py)=>{
    green.setRGB(.16+dry*.1,.19+dry*.04,.08);tip.setRGB(.47+dry*.16,.42+dry*.06,.2);
    green.lerp(tip,Math.min(1,py/h));return [green.r,green.g,green.b];
   }});
  }
 };
 let k=0;
 for(const [x,z] of [[-.29,-.32],[.29,.425],[-.29,.425],[.29,-.33]])tuft(x,z,7,.075,k++);
 for(let i=0;i<6;i++){const side=i%2?1:-1,z=-.2+rand(i+60)*.55;tuft(side*(.285+rand(i+61)*.02),z,5,.05,k++);}
 for(let i=0;i<3;i++)tuft(-.2+rand(i+70)*.4,.43+rand(i+71)*.01,5,.045,k++);
 tuft(-.19,-.36,6,.06,k++);tuft(.19,-.37,4,.05,k++);
 tuft(.17,-.22,4,.04,k++);tuft(-.18,.33,4,.035,k++);

 // A dead posy laid on the mound: three stems tied together, the heads withered dark.
 {
  const px=-.05+rand(80)*.06,pz=.15+rand(81)*.06,ang=rand(82)*Math.PI*2,y0=moundY(px,pz)+.004;
  const petal=[[.34,.05,.08],[.38,.28,.18],[.24,.11,.26]][Math.floor(rand(83)*3)];
  for(let i=0;i<3;i++){
   const spread=(i-1)*.22,len=.1+rand(84+i)*.03;
   const stem=new THREE.CylinderGeometry(.0025,.0025,len,5);stem.rotateZ(Math.PI/2);stem.translate(len/2,0,0);
   const head=new THREE.IcosahedronGeometry(.014,0);head.scale(1,.6,1);head.translate(len+.01,.004,0);
   for(const geo of [stem,head]){geo.rotateY(ang+spread);geo.translate(px,y0,pz);}
   const tie=new THREE.TorusGeometry(.006,.002,4,8);tie.rotateY(Math.PI/2);tie.translate(.025,0,0);tie.rotateY(ang);tie.translate(px,y0,pz);
   put(stem,grass,{paint:()=>[.2,.17,.09]});
   put(head,grass,{paint:(x,y,z)=>{const f=.8+noise3(x*200,y*200,z*200)*.3;return petal.map(c=>c*f);}});
   if(i===0)put(tie,grass,{paint:()=>[.5,.4,.26]});
  }
 }

 // A candle stub in front of the headstone: a lathe stub with a wax pool and runs,
 // a wick, and a teardrop flame.
 {
  const cx=.13,cz=-.22,lathe=(pts,seg=14)=>new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),seg);
  put(place(lathe([[0,0],[.034,0],[.036,.003],[.024,.006],[.021,.008],[.021,.09],[.018,.1],[.012,.104],[0,.103]]),cx,.06,cz),wax);
  for(let i=0;i<3;i++){const a=rand(90+i)*Math.PI*2,h=.03+rand(93+i)*.04;
   put(place(new THREE.CapsuleGeometry(.0045,h,3,6),cx+Math.cos(a)*.021,.06+.1-h/2-.005,cz+Math.sin(a)*.021),wax);}
  put(place(new THREE.CylinderGeometry(.0015,.0015,.014,5),cx,.06+.108,cz),stone,{tint:.15});
  put(place(lathe([[0,0],[.007,.006],[.009,.015],[.006,.026],[0,.038]],10),cx,.06+.11,cz),flame);
 }

 // Bake: vertex-coloured bins get their colours, then every bin becomes one mesh.
 const n=new THREE.Vector3();
 for(const [material,list] of bins){
  if(!list.length)continue;
  const flats=list.map(geo=>{
   const {paint,tint}=geo.userData;
   const flat=geo.index?geo.toNonIndexed():geo;if(flat!==geo)geo.dispose();
   for(const key of Object.keys(flat.attributes))if(!['position','normal'].includes(key))flat.deleteAttribute(key);
   if(material.vertexColors){
    const p=flat.attributes.position,nor=flat.attributes.normal,col=new Float32Array(p.count*3);
    const f=paint||((x,y,z,nn)=>stoneColour(x,y,z,nn,off));
    for(let i=0;i<p.count;i++){n.fromBufferAttribute(nor,i);const c=f(p.getX(i),p.getY(i),p.getZ(i),n);col[i*3]=c[0]*tint;col[i*3+1]=c[1]*tint;col[i*3+2]=c[2]*tint;}
    flat.setAttribute('color',new THREE.BufferAttribute(col,3));
   }
   return flat;
  });
  const geo=mergeGeometries(flats);flats.forEach(f=>f.dispose());geometries.push(geo);
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=material!==flame&&material!==grass;mesh.receiveShadow=material!==flame;
  mesh.userData.part=Object.keys(parts).find(key=>parts[key]===material);
  g.add(mesh);
 }
 g.userData.headstone=kind;g.userData.risen=risen;
 g.userData.dispose=()=>{for(const geo of geometries)geo.dispose();for(const m of materials)m.dispose();};
 return g;
}

// Weathered grey stone: mottled, with rain streaks running down vertical faces,
// yellow-grey lichen crusting the tops and green moss creeping up from the ground.
function stoneColour(x,y,z,n,off){
 let k=.8+noise3(x*14+off,y*14,z*14)*.3+(noise3(x*90,y*90+off,z*90)-.5)*.12;
 if(Math.abs(n.y)<.5){const streak=noise3(x*55+off,y*3,z*55);if(streak>.62)k*=1-(streak-.62)*1.3*Math.min(1,y/.2);}
 if(n.y>.6)k*=1.1;
 if(n.y<-.5)k*=.6;
 let r=.29*k,g=.285*k,b=.265*k;
 const lichen=noise3(x*40+off,y*40,z*40+9);
 if(lichen>.7&&y>.05){const t=Math.min(1,(lichen-.7)*6)*(n.y>.3?1:.6);r+=(.52-r)*t;g+=(.5-g)*t;b+=(.3-b)*t;}
 const moss=Math.max(0,1-y/.1)*noise3(x*25,y*25+off,z*25);
 if(moss>.35){const t=Math.min(1,(moss-.35)*3);r+=(.16-r)*t;g+=(.22-g)*t;b+=(.1-b)*t;}
 return [r,g,b];
}

// Old bone: yellowed ivory, mottled, darker in the creases, and caked with earth up to a
// little above the soil line `ground`.
function boneColour(off,ground){
 return (x,y,z)=>{
  const k=.82+noise3(x*120+off,y*120,z*120)*.25;
  let r=.74*k,g=.67*k,b=.5*k;
  const dirt=Math.min(1,Math.max(0,1-(y-ground)/.06))*(.7+noise3(x*60,y*60+off,z*60)*.3);
  r+=(.24-r)*dirt;g+=(.16-g)*dirt;b+=(.1-b)*dirt;
  return [r,g,b];
 };
}

// Turned soil: damp and dark where it meets the kerb, drier and paler on the crown,
// with crumbs and dark flecks.
function soilColour(off){
 return (x,y,z)=>{
  let k=.75+noise3(x*30+off,z*30,y*30)*.35+(noise3(x*140,z*140+off,y*140)-.5)*.25;
  k*=.72+.38*Math.min(1,Math.max(0,(y-.02)/.09));
  return [.3*k,.2*k,.13*k];
 };
}

function hash3(x,y,z){const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s);}
function noise3(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
 const fx=x-ix,fy=y-iy,fz=z-iz,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy),uz=fz*fz*(3-2*fz);
 const l=(a,b,t)=>a+(b-a)*t;
 const c=(dx,dy,dz)=>hash3(ix+dx,iy+dy,iz+dz);
 return l(l(l(c(0,0,0),c(1,0,0),ux),l(c(0,1,0),c(1,1,0),ux),uy),l(l(c(0,0,1),c(1,0,1),ux),l(c(0,1,1),c(1,1,1),ux),uy),uz);
}
