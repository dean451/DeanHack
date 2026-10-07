import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The material golems (wax, rope, gold, leather, wood, flesh, clay, stone, glass, iron, ice and
// crystal ice) used to share one build: rounded boxes stacked into a friendly block man, with a
// ball glowing on its chest. They are now hulking, hunched constructs: top-heavy, the small head
// sunk low between massive shoulders, long arms dragging clawed fists near the knees, on short
// braced legs. Every piece is a jagged, faceted chunk (a jittered icosahedron, flat shaded), so
// the silhouette is broken and angular. Eyes burn through a slit under a heavy brow, and the
// animating fire leaks from a core in the chest through branching cracks.
// Each material adds its own surface and details:
// - stone: craggy grey with moss low down, rock shards on the shoulders and spine;
// - clay: gouged red-brown clay, and the glowing sigil that animates it on the brow;
// - iron: riveted dark plates streaked with rust, shoulder spikes and a furnace grille;
// - glass, ice, crystal ice: see-through shards, a crest of spikes, a cold inner light;
// - gold: tarnished in the crevices, a jagged crown of spikes;
// - wood: split bark, thorns, twig claws, a sickly green light;
// - leather and flesh: stitched patchwork with sutures; flesh adds bone spurs and bruises;
// - wax: melting drips down every chunk, and wicks burning on the shoulders and head;
// - rope: twisted, banded fibre.
// Draws: the body, head, each arm and leg (one vertex-coloured mesh each, on one material per
// golem kind), plus two glowing meshes (the core with its cracks, and the eyes): 8. Geometry and
// materials are built once per kind. `core` is the chest glow, which live.js pulses.
// Handles: legs, arms, arm, head, body, core (quirk 'golem', for trudge.js).

const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const vhash=(x,y,z,seed)=>hash(Math.round(x*997)*.013+Math.round(y*991)*.071+Math.round(z*983)*.029+seed*1.7);
// smooth blotch noise in [0,1]
const blot=(x,y,z,f=1)=>Math.sin(x*31*f+Math.sin(z*23*f)*2)*Math.sin(y*27*f+z*13*f)*.5+.5;

const LOOKS={
 stone:{base:'#6e6c62',dark:'#34332e',light:'#9a978a',glow:'#ff6420',jag:.2,scale:1.22,spikes:'stone',paint:'stone'},
 clay:{base:'#8a4e34',dark:'#4a2618',light:'#b2745a',glow:'#ff3420',jag:.12,scale:1.17,sigil:true,paint:'clay'},
 iron:{base:'#3a3f44',dark:'#16191c',light:'#6a737a',glow:'#ff5a14',jag:.1,scale:1.28,spikes:'iron',rivets:true,grille:true,paint:'iron'},
 glass:{base:'#a8d8d6',dark:'#4a7a7c',light:'#e8ffff',glow:'#8ff4ff',jag:.24,scale:1.24,spikes:'shard',paint:'clear'},
 ice:{base:'#a6d4e6',dark:'#4a86a0',light:'#eaf8ff',glow:'#6fd0ff',jag:.22,scale:1.28,spikes:'shard',paint:'clear'},
 'crystal ice':{base:'#c4ecff',dark:'#5a9ec0',light:'#ffffff',glow:'#a8f0ff',jag:.26,scale:1.32,spikes:'shard',paint:'clear'},
 // the Punisher, a stationary colossus of black iron-stone: not a golem, but the same hulking build
 punisher:{base:'#26282c',dark:'#0c0d0f',light:'#4a4e56',glow:'#d01830',jag:.2,scale:1.55,spikes:'iron',rivets:true,paint:'iron'},
 gold:{base:'#c89a2a',dark:'#5a3e10',light:'#f4d466',glow:'#9aff3a',jag:.12,scale:1.02,spikes:'crown',paint:'metal'},
 wood:{base:'#5e4028',dark:'#2a1a0e',light:'#8a6440',glow:'#8aff3a',jag:.16,scale:1.04,thorns:true,paint:'bark'},
 leather:{base:'#5a3a24',dark:'#2a1a10',light:'#7e5638',glow:'#ff3a2a',jag:.1,scale:1,stitches:true,paint:'hide'},
 flesh:{base:'#a07868',dark:'#5a3434',light:'#c49a88',glow:'#ff2a1a',jag:.12,scale:1.15,stitches:true,spurs:true,paint:'flesh'},
 wax:{base:'#d8b870',dark:'#8a6a30',light:'#f4e2a8',glow:'#ffb040',jag:.08,scale:.96,drips:true,wicks:true,paint:'wax'},
 rope:{base:'#8a6a3a',dark:'#4a3418',light:'#b8965a',glow:'#ffa040',jag:.1,scale:.98,paint:'rope'},
};
export const GOLEM_KINDS=Object.keys(LOOKS);

// the surface colour of each material, from a world-ish position inside a part
function painter(look){
 const B=rgb(look.base),D=rgb(look.dark),L=rgb(look.light),MOSS=rgb('#4a5a24'),RUST=rgb('#8a3a14'),BRUISE=rgb('#6a3a5a'),PALE=rgb('#c8b0a0');
 return {
  stone:(x,y,z)=>{const b=blot(x,y,z,1.4);let c=mix(D,L,b);return y<.35&&blot(x,y,z,3)>.7?mix(c,MOSS,.6):c;},
  clay:(x,y,z)=>{const g=Math.abs(Math.sin(x*40+y*12))>.94?.8:0;return mix(mix(B,L,blot(x,y,z)*.5),D,g);},
  iron:(x,y,z)=>{const streak=hash(Math.round(x*40)+Math.round(z*40)*7)>.72&&blot(x,y,z,2)>.4;return mix(mix(D,L,blot(x,y,z)*.6),RUST,streak?.7:0);},
  clear:(x,y,z)=>mix(B,L,blot(x,y,z,1.6)),
  metal:(x,y,z)=>mix(L,D,blot(x,y,z,1.2)<.3?.7:blot(x,y,z)*.3),
  bark:(x,y,z)=>mix(B,D,Math.abs(Math.sin(x*70+Math.sin(y*9)*3+z*50))>.8?.8:blot(x,y,z)*.3),
  hide:(x,y,z)=>mix(B,Math.floor(y*9+blot(x,z,y)*2)%2?L:D,.3),
  flesh:(x,y,z)=>{const patch=Math.floor(x*6+3)+Math.floor(y*5)*3+Math.floor(z*6+3)*7;return mix(mix(PALE,B,hash(patch)),BRUISE,blot(x,y,z,2)>.8?.5:0);},
  wax:(x,y,z)=>mix(B,L,blot(x,y,z,.8)*.7),
  rope:(x,y,z)=>mix(B,D,Math.sin(y*160+Math.atan2(x,z)*6)>.3?.55:0),
 }[look.paint];
}

// a jagged chunk: a subdivided icosahedron scaled to size, its corners jittered (by position, so
// shared corners move together and the faces stay closed), flat shaded
function chunk(P,[w,h,d],matrix,paint,seed,jag){
 const geo=new THREE.IcosahedronGeometry(1,1),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+(vhash(x,y,z,seed)-.5)*2*jag;
  // squarer than a ball: push toward the box a little
  const sq=v=>Math.sign(v)*Math.pow(Math.abs(v),.7);
  p.setXYZ(i,sq(x)*k*w/2,sq(y)*k*h/2,sq(z)*k*d/2);
 }
 geo.computeVertexNormals();
 P.add(geo,matrix,paint);
}
// a pointed shard from base along dir
function shard(P,base,dir,r,len,colour,sides=4){
 const d=new THREE.Vector3(...dir).normalize();
 P.add(new THREE.ConeGeometry(r,len,sides),new THREE.Matrix4().compose(new THREE.Vector3(...base).addScaledVector(d,len/2),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d),new THREE.Vector3(1,1,1)),colour);
}
// short sutures across a seam line at height y, round a part of radius r
function stitches(P,y,r,n,colour,z0=0){
 for(let i=0;i<n;i++){const a=(i/n-.5)*2.2;P.add(new THREE.BoxGeometry(.008,.05,.008),at(Math.sin(a)*r,y,z0+Math.cos(a)*r,[0,a,.5]),colour);}
}
// wax running down: long drips under a part's lower edge
function drips(P,xs,y,z,colour,seed){
 xs.forEach((x,i)=>{const l=.05+hash(seed+i)*.09;P.add(new THREE.CylinderGeometry(.014,.006,l,5),at(x,y-l/2,z),colour);P.add(new THREE.SphereGeometry(.012,5,4),at(x,y-l,z),colour);});
}

function build(kind){
 const look=LOOKS[kind],paint=painter(look),J=look.jag,D=rgb(look.dark),L=rgb(look.light),GLOW=rgb(look.glow);
 const BONE=rgb('#d8ccb0'),CLAW=kind==='wood'?rgb('#2a1a0e'):mix(D,[0,0,0],.4),STITCH=rgb('#1a1210'),WICK=rgb('#1a1612');
 const clear=look.paint==='clear';
 // body: a forward-hunched chest and massive shoulders over a narrow pelvis
 const body=pieces(),glow=pieces();
 chunk(body,[.6,.5,.42],at(0,.86,-.02,[.28,0,0]),paint,1,J);
 chunk(body,[.4,.3,.34],at(0,.62,0,[.1,0,0]),paint,2,J);
 chunk(body,[.38,.2,.28],at(0,.5,0),paint,3,J);
 for(const s of [-1,1])chunk(body,[.32,.3,.34],at(s*.3,1.0,.0,[0,0,s*.3]),paint,4+s,J);
 // a neck hump behind the sunken head
 chunk(body,[.3,.18,.24],at(0,1.06,-.06,[.4,0,0]),paint,7,J);
 // the core, set in the chest, and cracks branching from it
 glow.add(new THREE.IcosahedronGeometry(.06,0),at(0,.86,.2),GLOW);
 for(let i=0;i<6;i++){
  const a=i/6*Math.PI*2+.3;let x=0,y=.86;
  for(let k=0;k<3;k++){
   const b=a+(hash(i*7+k)-.5)*1.2,l=.05+hash(i*3+k)*.04,nx=x+Math.cos(b)*l,ny=y+Math.sin(b)*l;
   glow.add(new THREE.BoxGeometry(Math.hypot(nx-x,ny-y)+.006,.009-k*.002,.01),at((x+nx)/2,(y+ny)/2,.205-Math.hypot(nx,ny-.86)*.35,[0,0,Math.atan2(ny-y,nx-x)]),GLOW);
   x=nx;y=ny;
  }
 }
 if(look.grille)for(let i=0;i<4;i++)glow.add(new THREE.BoxGeometry(.012,.12,.012),at(-.045+i*.03,.7,.19),GLOW);
 if(look.rivets)for(const [x,y] of [[-.2,.98],[.2,.98],[-.24,.8],[.24,.8],[-.14,.64],[.14,.64]])body.add(new THREE.SphereGeometry(.014,6,4),at(x,y,.2-Math.abs(x)*.3),L);
 // spines: shards up the shoulders and down the back
 const spikeCol=look.spikes==='iron'?mix(D,L,.3):look.spikes==='crown'?L:clear?L:mix(paint(0,1,0),D,.2);
 if(look.spikes){
  for(const s of [-1,1])for(let k=0;k<3;k++)shard(body,[s*(.26+k*.07),1.12-k*.03,-.02+k*.02],[s*(.4+k*.2),1,-.3],.035-k*.006,.16-k*.03,spikeCol,look.spikes==='iron'?6:4);
  for(let k=0;k<4;k++)shard(body,[0,1.02-k*.13,-.22+k*.01],[0,.5,-1],.03,.12-k*.015,spikeCol);
 }
 if(look.thorns)for(let k=0;k<14;k++){const a=hash(k)*Math.PI*2,y=.55+hash(k+20)*.55;shard(body,[Math.sin(a)*.24,y,Math.cos(a)*.2-.02],[Math.sin(a),.3,Math.cos(a)],.012,.06,D,4);}
 if(look.stitches){stitches(body,.72,.2,7,STITCH,.02);stitches(body,.95,.26,9,STITCH,-.02);}
 if(look.spurs)for(const s of [-1,1])shard(body,[s*.3,1.1,-.08],[s*.3,1,-.5],.02,.1,BONE,5);
 if(look.drips){drips(body,[-.2,-.08,.1,.22],.64,.16,L,1);drips(body,[-.3,.32],.86,.12,L,2);}
 if(look.wicks)for(const s of [-1,1]){body.add(new THREE.CylinderGeometry(.006,.006,.05,5),at(s*.32,1.16,0),WICK);glow.add(new THREE.ConeGeometry(.02,.07,6),at(s*.32,1.22,0),GLOW);}

 // head: small, low and thrust forward, a heavy brow over an eye slit
 const head=pieces(),eyes=pieces();
 chunk(head,[.22,.2,.24],at(0,.0,.0),paint,11,J);
 chunk(head,[.26,.07,.12],at(0,.06,.08,[-.25,0,0]),paint,12,J*.6);
 chunk(head,[.2,.08,.14],at(0,-.08,.06,[.2,0,0]),paint,13,J);
 for(const s of [-1,1])eyes.add(new THREE.BoxGeometry(.05,.016,.02),at(s*.045,.02,.12,[0,0,s*.25]),GLOW);
 if(look.sigil)for(const [x,y,w,h] of [[-.03,.0,.008,.04],[0,.02,.008,.05],[.03,.0,.008,.04],[0,-.01,.07,.006]])eyes.add(new THREE.BoxGeometry(w,h,.008),at(x,y+.09,.105),GLOW);
 if(look.spikes==='crown'||look.spikes==='shard')for(let k=0;k<5;k++){const a=(k-2)*.35;shard(head,[Math.sin(a)*.08,.08,Math.cos(a)*.04-.02],[Math.sin(a)*.6,1,-.25],.018,.1-Math.abs(k-2)*.02,spikeCol);}
 if(look.spikes==='stone')shard(head,[0,.08,-.04],[0,1,-.6],.03,.08,spikeCol);
 if(look.wicks){head.add(new THREE.CylinderGeometry(.006,.006,.04,5),at(0,.12,0),WICK);eyes.add(new THREE.ConeGeometry(.018,.06,6),at(0,.17,0),GLOW);}
 if(look.stitches)stitches(head,.0,.11,6,STITCH,.0);

 // arms: long, a thick forearm, a fist of three hooked claws that hangs near the knee
 const arm=pieces();
 chunk(arm,[.18,.34,.19],at(0,-.17,0),paint,21,J);
 chunk(arm,[.22,.32,.22],at(0,-.46,.03,[.12,0,0]),paint,22,J);
 chunk(arm,[.2,.14,.2],at(0,-.66,.06),paint,23,J);
 for(let k=-1;k<=1;k++)shard(arm,[k*.06,-.7,.1],[k*.25,-1,.5],.018,.11,CLAW,4);
 if(look.spikes==='iron'||look.spurs)shard(arm,[0,-.3,-.09],[0,-.4,-1],.02,.09,look.spurs?BONE:spikeCol,5);
 if(look.thorns)for(let k=0;k<4;k++)shard(arm,[.09*(k%2?1:-1),-.2-k*.12,.02],[k%2?1:-1,.2,.2],.01,.05,D,4);
 if(look.stitches)stitches(arm,-.32,.1,5,STITCH);
 if(look.drips)drips(arm,[-.05,.06],-.6,.1,L,3);
 if(look.spikes==='shard')shard(arm,[0,-.36,-.08],[0,.2,-1],.025,.12,spikeCol);

 // legs: short, thick and braced, on broad splayed feet
 const leg=pieces();
 chunk(leg,[.22,.26,.24],at(0,-.12,0),paint,31,J);
 chunk(leg,[.19,.24,.2],at(0,-.32,.02),paint,32,J);
 chunk(leg,[.24,.09,.32],at(0,-.43,.06),paint,33,J*.6);
 for(let k=-1;k<=1;k++)shard(leg,[k*.07,-.45,.2],[k*.2,-.2,1],.016,.06,CLAW,4);
 if(look.stitches)stitches(leg,-.22,.11,5,STITCH);

 const material=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:look.paint==='metal'?.3:look.paint==='iron'?.45:clear?.08:look.paint==='wax'?.45:.85,metalness:look.paint==='metal'?.85:look.paint==='iron'?.7:clear?.05:0,
  transparent:clear,opacity:clear?(kind==='glass'?.55:.72):1,depthWrite:!clear,side:clear?THREE.DoubleSide:THREE.FrontSide});
 const fire=new THREE.MeshStandardMaterial({color:look.glow,emissive:look.glow,emissiveIntensity:4.5,roughness:.3,toneMapped:true});
 // stand the jagged soles exactly on the floor (the leg pivot is .46 up)
 const legGeo=leg.merge();legGeo.computeBoundingBox();legGeo.translate(0,-.46-legGeo.boundingBox.min.y,0);
 return {look,material,fire,body:body.merge(),glow:glow.merge(),head:head.merge(),eyes:eyes.merge(),arm:arm.merge(),leg:legGeo};
}

const cache=new Map();
function mesh(parent,geo,material,name,shadow=true){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=shadow;m.userData.part=name;parent.add(m);return m;}

export function createGolem(kind){
 if(!LOOKS[kind])kind='stone';
 if(!cache.has(kind))cache.set(kind,build(kind));
 const S=cache.get(kind),clear=S.look.paint==='clear';
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(S.look.scale);
 mesh(body,S.body,S.material,'body',!clear);
 const core=mesh(body,S.glow,S.fire,'core',false);
 const head=new THREE.Group();head.position.set(0,1.02,.2);head.rotation.x=.12;body.add(head);
 mesh(head,S.head,S.material,'head',!clear);mesh(head,S.eyes,S.fire,'eyes',false);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.15,.46,0);leg.rotation.z=s*.06;body.add(leg);mesh(leg,S.leg,S.material,'leg',!clear);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.42,1.0,.02);arm.rotation.set(-.08,0,s*.1);body.add(arm);mesh(arm,S.arm,S.material,'arm',!clear);arms.push(arm);
 }
 return {g,body,legs,tail:null,wings:[],quirk:'golem',kind:`${kind} golem`,core,arms,arm:arms[1],head};
}
