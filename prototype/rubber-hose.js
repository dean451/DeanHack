import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The rubber hose: a length of old, perished black hose turned into a cosh. It rises from a grip
// of grimy cloth tape, bends over in a heavy curve, flattening into a kink at the bend, and hangs
// down to a brass coupling (crimped ferrule, hex nut and threaded spout) green with verdigris,
// clamped on with a steel band. A few turns of rusty barbed wire are twisted round the striking
// end. The rubber is crazed with pale cracks, a faded oxblood stripe runs along it and old blood
// has dried dark near the end; below the hand the hose is hacked off, showing its dark bore with
// strands of the reinforcing cord sticking out.
// Held-weapon space (equipment.js): the hand at the origin, the hose rising up +y and curving
// over toward +x, all of it in the xy plane, so laid on the floor (live.js lays weapons down with
// x -PI/2) it lies flat. Rubber and tape are one material, the metal another: 2 draws. The metal
// stays metalness >= .75, so weapon-magic sheathes it.
export const RUBBER_HOSE_NAME=/\brubber hose\b/;
const R=.0165,TAPE_LO=.02,TAPE_HI=.27,WIRE_LO=.7,WIRE_HI=.86;
const RUBBER=0x1b1816,CRAZE=0x6a6056,STRIPE=0x5a1c16,BLOOD=0x2e0c08,TAPE=0x6c6450,TAPE_DARK=0x2c2620;
const BRASS=0xa8843e,VERDIGRIS=0x3f7a62,STEEL=0x8c9298,RUST=0x6a3418;

const hash=i=>{const v=Math.sin(i*127.1+31.7)*43758.5453;return v-Math.floor(v);};
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
const Z=new THREE.Vector3(0,0,1),UP=new THREE.Vector3(0,1,0);

// The hose's centreline: hacked off below the hand, up through the grip, over and down.
const CURVE=new THREE.CatmullRomCurve3([[0,-.13],[0,-.04],[0,.08],[.006,.22],[.03,.34],[.075,.43],[.13,.465],[.18,.45],[.208,.39],[.214,.31]]
 .map(([x,y])=>new THREE.Vector3(x,y,0)));
// The point at u, the tangent, and the in-plane side direction (tangent x z).
function frame(u){const p=CURVE.getPointAt(u),t=CURVE.getTangentAt(u),side=t.clone().cross(Z).normalize();return {p,t,side};}
// The kink: the hose flattens across the bend just past its top.
const kink=u=>Math.exp(-(((u-.6)/.045)**2));
// Thicker where the tape is wound on.
const tapeBulge=u=>.0028*smooth(TAPE_LO-.01,TAPE_LO+.005,u)*(1-smooth(TAPE_HI-.005,TAPE_HI+.01,u));

export function buildRubberHose(g){
 const rubber=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.86});
 const metal=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:.8,roughness:.42});
 g.userData.extraMaterial=[rubber,metal];
 const sets=new Map([[rubber,[]],[metal,[]]]),c=new THREE.Color();
 const put=(geo,m,tone)=>{if(geo.attributes.uv)geo.deleteAttribute('uv');if(!geo.attributes.normal)geo.computeVertexNormals();if(geo.index)geo=geo.toNonIndexed();
  const p=geo.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){tone(p.getX(i),p.getY(i),p.getZ(i),c,i);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));sets.get(m).push(geo);};
 // Lay a geometry built along +y onto the hose at u, its base at the centreline.
 const seat=(geo,u,offset=0)=>{const {p,t}=frame(u);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP,t));
  geo.translate(p.x+t.x*offset,p.y+t.y*offset,p.z+t.z*offset);return geo;};

 // The hose: rings round the centreline, flattened in the kink and swollen under the tape, with
 // a few perished bulges. Colours are worked out per vertex from u and the ring angle a, where
 // a = PI/2 is the +z face the stripe runs along.
 {const NU=120,RING=16,pos=[],cols=[],idx=[];
  for(let i=0;i<=NU;i++){const u=i/NU,{p,side}=frame(u),k=kink(u),tb=tapeBulge(u);
   for(let j=0;j<RING;j++){const a=j/RING*Math.PI*2;
    const swell=1+.06*Math.exp(-(((u-.42)/.03)**2))+.04*Math.exp(-(((u-.8)/.025)**2))+.02*(hash(i*7+j)-.5);
    const tape=tb>0?tb*(1+.35*Math.max(0,Math.sin(u*220+a))):0;// the wraps overlap on a slant
    const rs=(R*swell+tape)*(1-.38*k),rz=(R*swell+tape)*(1+.22*k);
    pos.push(p.x+side.x*Math.cos(a)*rs,p.y+side.y*Math.cos(a)*rs,Math.sin(a)*rz);
    // Colour.
    const inTape=tb>.0015;
    if(inTape){c.set(TAPE).lerp(new THREE.Color(TAPE_DARK),.55*Math.max(0,Math.sin(u*220+a+1.2))+.25*hash(i*13+j*3));// grime in the overlaps
     c.lerp(new THREE.Color(TAPE_DARK),.4*Math.sin(Math.PI*(u-TAPE_LO)/(TAPE_HI-TAPE_LO))**2);}// blackened where held
    else{c.set(RUBBER).multiplyScalar(.85+.3*hash(i*31+j*5));
     const stripe=Math.exp(-(((Math.atan2(Math.sin(a-Math.PI/2),Math.cos(a-Math.PI/2)))/.22)**2));
     c.lerp(new THREE.Color(STRIPE),stripe*(.55+.3*hash(i)));// faded, flaking stripe
     // Crazing: a net of pale cracks, worst on the outside of the bend and in the kink.
     const net=Math.abs(Math.sin(u*310+a*3.1)*Math.sin(u*190-a*4.7));
     c.lerp(new THREE.Color(CRAZE),smooth(.86,.98,net)*(.45+.5*k+.3*smooth(.4,.7,u)));
     c.lerp(new THREE.Color(BLOOD),smooth(.68,.9,u)*smooth(.2,.8,Math.sin(u*90+a*2)*.5+.5+.3*hash(i*3+j))*.8);}// old blood near the end
    cols.push(c.r,c.g,c.b);}}
  for(let i=0;i<NU;i++)for(let j=0;j<RING;j++){const a=i*RING+j,b=i*RING+(j+1)%RING,d=a+RING,e=b+RING;idx.push(a,d,b,b,d,e);}
  const hose=new THREE.BufferGeometry();hose.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));hose.setIndex(idx);
  hose.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));hose.computeVertexNormals();
  sets.get(rubber).push(hose.toNonIndexed());hose.dispose();}

 // The hacked-off end below the hand: a rubber rim round a dark bore, frayed cord poking out.
 {const rim=new THREE.RingGeometry(R*.55,R*1.01,16,1).rotateX(Math.PI/2);// facing -y
  for(let i=0,p=rim.attributes.position;i<p.count;i++)p.setY(i,p.getY(i)+.002*(hash(i)-.5));// hacked, not sawn
  put(seat(rim,0),rubber,(x,y,z,col,i)=>col.set(RUBBER).lerp(new THREE.Color(CRAZE),.35*hash(i)));
  put(seat(new THREE.CylinderGeometry(R*.56,R*.56,.012,12,1,true),0,.006),rubber,(x,y,z,col)=>col.set(0x050404));
  put(seat(new THREE.CircleGeometry(R*.56,12).rotateX(Math.PI/2),0,.012),rubber,(x,y,z,col)=>col.set(0x050404));
  for(let s=0;s<5;s++){const a=s/5*Math.PI*2+.4,r=R*.78,len=.008+.012*hash(s*5);
   const strand=new THREE.CylinderGeometry(.0007,.0011,len,4).translate(0,-len/2,0)
    .rotateZ((hash(s*9)-.5)*.9).rotateX((hash(s*11)-.5)*.9).translate(Math.cos(a)*r,0,Math.sin(a)*r);
   put(seat(strand,0),rubber,(x,y,z,col)=>col.set(0xb8a882).multiplyScalar(.7));}}

 // The brass coupling at the far end: crimped ferrule, hex nut, threaded spout.
 {const endU=1,ferrule=new THREE.LatheGeometry([[.0005,-.026],[R*1.12,-.026],[R*1.18,-.022],[R*1.16,-.014],[R*1.22,-.01],[R*1.16,-.006],[R*1.2,0],[R*1.05,.002],[.0005,.002]]
   .map(([r,y])=>new THREE.Vector2(r,y)),18);
  const brassTone=(x,y,z,col,i)=>{col.set(BRASS).multiplyScalar(.75+.4*hash(Math.floor(x*800)+Math.floor(y*800)*7+Math.floor(z*800)*13));
   col.lerp(new THREE.Color(VERDIGRIS),smooth(.45,.9,hash(Math.floor(x*300)*5+Math.floor(y*300)*11+Math.floor(z*300)*3))*.8);};
  put(seat(ferrule,endU,.002),metal,brassTone);
  const nut=new THREE.CylinderGeometry(R*1.5,R*1.5,.02,6).translate(0,.01,0);
  nut.deleteAttribute('normal');
  put(seat(nut.toNonIndexed(),endU,.004),metal,brassTone);
  const thread=[];for(let k=0;k<=8;k++)thread.push([R*(k%2?.82:.9),k*.0025]);thread.push([R*.62,.021],[.0005,.021]);
  put(seat(new THREE.LatheGeometry([[.0005,0],...thread].map(([r,y])=>new THREE.Vector2(r,y)),14),endU,.024),metal,brassTone);
  put(seat(new THREE.CylinderGeometry(R*.5,R*.5,.004,10).translate(0,.044,0),endU,0),metal,(x,y,z,col)=>col.set(0x080605));}

 // A steel hose clamp just behind the ferrule, its screw housing on the outside of the bend.
 {const u=.935,{side}=frame(u);
  put(seat(new THREE.CylinderGeometry(R*1.12,R*1.12,.009,18,1,true),u),metal,(x,y,z,col,i)=>col.set(STEEL).lerp(new THREE.Color(RUST),.5*hash(i*3)));
  const box=seat(new THREE.BoxGeometry(.008,.011,.008),u);box.translate(side.x*R*1.25,side.y*R*1.25,0);
  put(box,metal,(x,y,z,col,i)=>col.set(STEEL).lerp(new THREE.Color(RUST),.35));}

 // Barbed wire: two strands twisted round the striking end, with a twist of barbs every so often.
 {const wireTone=(x,y,z,col,i)=>col.set(0x5a5450).lerp(new THREE.Color(RUST),.45+.5*hash(Math.floor(x*600)+Math.floor(y*600)*7+Math.floor(z*600)*3));
  for(const ph of [0,Math.PI]){const pts=[];
   for(let i=0;i<=60;i++){const u=WIRE_LO+(WIRE_HI-WIRE_LO)*i/60,{p,side}=frame(u),th=ph+u*95,r=R*(1-.3*kink(u))*1.12+.0015;
    pts.push(new THREE.Vector3(p.x+side.x*Math.cos(th)*r,p.y+side.y*Math.cos(th)*r,Math.sin(th)*r));}
   put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),90,.0011,4,false),metal,wireTone);}
  for(let b=0;b<7;b++){const u=WIRE_LO+.01+(WIRE_HI-WIRE_LO-.02)*b/6,{p,side}=frame(u),th=b*2.3+.5,r=R*1.12+.0015;
   const out=side.clone().multiplyScalar(Math.cos(th)).add(Z.clone().multiplyScalar(Math.sin(th))).normalize();
   const base=p.clone().addScaledVector(out,r);
   for(const tilt of [-.55,.55]){const dir=out.clone().addScaledVector(frame(u).t,tilt).normalize();
    const barb=new THREE.ConeGeometry(.0013,.011,4).translate(0,.0055,0).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP,dir)).translate(base.x,base.y,base.z);
    barb.deleteAttribute('normal');put(barb,metal,wireTone);}}}

 for(const [m,list] of sets){const merged=mergeGeometries(list.map(x=>{if(x.index)x=x.toNonIndexed();return x;}));list.forEach(x=>x.dispose());
  const mesh=new THREE.Mesh(merged,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.part=m===rubber?'hose':'fittings';g.add(mesh);}
 g.userData.rubberHose={kind:'rubber hose'};
}
