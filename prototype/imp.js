import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The imp used to be the generic short humanoid in red, with a flat triangle for each wing and a
// cone tail. It now stands as a small, wiry red devil: a lean, narrow-waisted torso with a ruddy
// chest and shoulder blades showing; a sharp face with a hooked nose, a sly grin with two fangs, a
// pointed goatee, long swept-back ears and glowing orange eyes under a scowling brow, and two horns
// sweeping up and back; goat legs with shaggy dark haunches, backward-bending hocks and split
// black hooves; thin arms with long-nailed hands; small leathery bat wings; and a long tail
// curling up behind with a spade tip.
// Each moving part (body, head, each leg, arm and wing, and the tail) is one merged,
// vertex-coloured mesh with a shared material, plus one small emissive mesh for the eyes: 10 draws.
// The geometry is built once and shared by every imp.
// Handles: legs, arms, arm, head, wings, tail, body, like the humanoid rig. The quirk stays 'imp'.

const C={
 skin:rgb('#b33a26'),skinDark:rgb('#5a1a12'),chest:rgb('#d0634a'),fur:rgb('#2a1712'),furLit:rgb('#4a2a1e'),
 hoof:rgb('#141010'),horn:rgb('#2a2220'),hornTip:rgb('#d8c8a8'),mouth:rgb('#1a0808'),tooth:rgb('#efe6d0'),
 nail:rgb('#1a1212'),socket:rgb('#2a0a08'),bone:rgb('#6a2418'),membrane:rgb('#5e1c16'),membraneLit:rgb('#a0402c'),
};
const skinShade=(lo,hi)=>(x,y)=>mix(C.skinDark,C.skin,(y-lo)/(hi-lo));
const UP=new THREE.Vector3(0,1,0);
// A tapered cylinder from point a to point b.
function seg(P,a,b,r0,r1,colour,sides=8){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),len=d.length();
 const m=new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(UP,d.normalize()),new THREE.Vector3(1,1,1));
 P.add(new THREE.CylinderGeometry(r1,r0,len,sides),m,colour);
}
// A tube along points that tapers toward its end.
function taperedTube(points,segments,radius,taper,sides=6){
 const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const tube=new THREE.TubeGeometry(path,segments,radius,sides,false),pos=tube.attributes.position,ring=sides+1;
 for(let i=0;i<pos.count;i++){const u=Math.floor(i/ring)/segments,c=path.getPoint(u),p=new THREE.Vector3().fromBufferAttribute(pos,i);p.sub(c).multiplyScalar(1-u*taper).add(c);pos.setXYZ(i,p.x,p.y,p.z);}
 tube.computeVertexNormals();
 return {tube,path};
}

function buildBody(){
 const P=pieces();
 // shaggy hips where the goat legs join, dark fur fading up into red skin at the waist
 P.add(new THREE.SphereGeometry(.085,14,10),at(0,.37,-.01,[0,0,0],[1.25,.85,1]),(x,y)=>mix(C.fur,C.furLit,(y-.32)/.1));
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2;P.add(new THREE.ConeGeometry(.018,.05,4),at(Math.sin(a)*.1,.33,Math.cos(a)*.08-.01,[Math.PI+Math.cos(a)*.3,0,-Math.sin(a)*.3]),C.fur);}
 // a narrow waist and a lean chest widening to the shoulders, ruddy down the front
 P.add(new THREE.CylinderGeometry(.06,.07,.1,12),at(0,.45,0),(x,y,z)=>z>.04?C.chest:skinShade(.4,.5)(x,y));
 P.add(new THREE.SphereGeometry(.09,14,12),at(0,.55,.01,[.1,0,0],[1.2,1.05,.8]),(x,y,z)=>z>.05?mix(C.skin,C.chest,(z-.05)/.03):skinShade(.46,.64)(x,y));
 // shoulder blades and a spine ridge showing through the back
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.035,8,6),at(s*.05,.58,-.055,[0,0,s*.3],[1,1.3,.5]),C.skin);
 for(let i=0;i<5;i++)P.add(new THREE.SphereGeometry(.009,6,4),at(0,.46+i*.035,-.06-Math.sin(i/4*Math.PI)*.008),C.skinDark);
 // round shoulders and a short neck
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.035,10,8),at(s*.105,.61,.0),C.skin);
 P.add(new THREE.CylinderGeometry(.03,.038,.07,8),at(0,.65,.015,[.2,0,0]),C.skin);
 return P.merge();
}

function buildHead(){
 const P=pieces();
 // a sharp, narrow face over a rounded skull, tapering to a pointed chin
 P.add(new THREE.SphereGeometry(.07,14,12),at(0,.06,-.005,[0,0,0],[.95,1,1.05]),skinShade(0,.13));
 P.add(new THREE.ConeGeometry(.05,.09,10),at(0,.005,.03,[Math.PI+.35,0,0],[1.05,1,.8]),skinShade(-.05,.05));
 // a pointed goatee jutting from the chin
 P.add(new THREE.ConeGeometry(.018,.07,6),at(0,-.055,.055,[Math.PI+.35,0,0]),C.fur);
 // a scowling brow over sunken sockets, and a hooked nose
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.03,8,6),at(s*.026,.083,.052,[0,0,s*.4],[1.1,.4,.7]),C.skinDark);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.018,8,6),at(s*.027,.064,.056),C.socket);
 P.add(new THREE.ConeGeometry(.013,.04,6),at(0,.045,.08,[1.9,0,0]),C.skin);
 // a sly lopsided grin with two little fangs
 P.add(new THREE.TorusGeometry(.036,.006,5,12,Math.PI),at(.004,.012,.062,[Math.PI+.4,0,.08],[1,.45,1]),C.mouth);
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.005,.016,4),at(s*.02,.004,.07,[Math.PI,0,0]),C.tooth);
 // long pointed ears swept back
 for(const s of [-1,1])P.add(new THREE.ConeGeometry(.024,.12,4),at(s*.08,.07,-.03,[-1.25,0,s*-.5],[1,1,.35]),(x,y,z)=>mix(C.skin,C.skinDark,(-z-.03)/.08));
 // two horns sweeping up and back from the brow, dark at the root and bone at the tip
 for(const s of [-1,1]){
  const {tube}=taperedTube([[.03,.11,.03],[.045,.16,.01],[.055,.195,-.03],[.05,.21,-.08]].map(([x,y,z])=>[s*x,y,z]),10,.013,.8);
  P.add(tube,null,(x,y,z)=>mix(C.horn,C.hornTip,(y-.13)/.08));
 }
 return P.merge();
}
function buildEyes(){
 const P=pieces();
 // narrow slanted eyes glowing under the brow
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.012,8,6),at(s*.027,.064,.066,[0,0,s*-.4],[1.5,.7,.8]),[1,1,1]);
 return P.merge();
}

// A goat leg: a shaggy thigh forward to the knee, a thin shin back to a high hock, a short cannon
// down to a split black hoof.
function buildLeg(){
 const P=pieces(),hip=[0,0,0],knee=[0,-.13,.05],hock=[0,-.24,-.04],fetlock=[0,-.34,-.01];
 P.add(new THREE.SphereGeometry(.05,10,8),at(0,-.04,.02,[.3,0,0],[1,1.4,1.1]),(x,y)=>mix(C.fur,C.furLit,(y+.1)/.1));
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;P.add(new THREE.ConeGeometry(.013,.045,4),at(Math.sin(a)*.042,-.1,.035+Math.cos(a)*.035,[Math.PI+Math.cos(a)*.35,0,-Math.sin(a)*.35]),C.fur);}
 seg(P,hip,knee,.04,.028,C.fur);
 P.add(new THREE.SphereGeometry(.024,8,6),at(...knee),C.fur);
 seg(P,knee,hock,.022,.015,C.furLit);
 P.add(new THREE.SphereGeometry(.016,6,5),at(...hock),C.fur);
 seg(P,hock,fetlock,.014,.016,C.fur);
 // a tuft over each hoof, and the hoof split in two
 P.add(new THREE.SphereGeometry(.022,8,6),at(fetlock[0],fetlock[1]+.005,fetlock[2],[0,0,0],[1,.8,1]),C.furLit);
 for(const s of [-1,1])P.add(new THREE.CylinderGeometry(.011,.016,.035,6),at(s*.011,-.3625,.012,[.25,0,0],[1,1,1.3]),C.hoof);
 return P.merge();
}

// A thin arm with a bony elbow and a hand of four long black nails reaching forward.
function buildArm(side){
 const P=pieces(),elbow=[0,-.14,-.015],wrist=[0,-.25,.04];
 P.add(new THREE.SphereGeometry(.028,8,6),at(0,0,0),C.skin);
 seg(P,[0,0,0],elbow,.024,.017,skinShade(-.15,0));
 P.add(new THREE.SphereGeometry(.019,8,6),at(...elbow),C.skin);
 seg(P,elbow,wrist,.016,.013,skinShade(-.27,-.12));
 P.add(new THREE.SphereGeometry(.022,8,6),at(0,-.265,.05,[0,0,0],[.9,1,.75]),C.skin);
 for(const a of [-.5,-.17,.17,.5]){
  const x=side*Math.sin(a)*.026,knuckle=[x,-.28,.06],tip=[x*1.4,-.315,.085];
  seg(P,knuckle,tip,.0065,.005,C.skin,5);
  P.add(new THREE.ConeGeometry(.005,.026,5),at(tip[0],tip[1]-.008,tip[2]+.009,[2.5,0,0]),C.nail);
 }
 return P.merge();
}

// A small leathery bat wing: two finger bones from the wrist, a scalloped membrane between them
// (extruded thin so both faces render with the one material) and a thumb claw.
function buildWing(side){
 const P=pieces();
 const wrist=new THREE.Vector2(side*.1,.12);
 P.add(new THREE.CylinderGeometry(.012,.016,.15,6),at(side*.05,.06,0,[0,0,-side*.9]),C.bone);
 const tips=[[.28,.26],[.3,.06],[.2,-.08]].map(([x,y])=>new THREE.Vector2(side*x,y));
 for(const tip of tips){
  const d=tip.clone().sub(wrist),len=d.length(),mid=wrist.clone().add(tip).multiplyScalar(.5);
  P.add(new THREE.CylinderGeometry(.005,.009,len,5),at(mid.x,mid.y,.003,[0,0,Math.atan2(d.y,d.x)-Math.PI/2]),C.bone);
 }
 P.add(new THREE.ConeGeometry(.01,.035,5),at(wrist.x,wrist.y+.025,.003),C.nail);
 const outline=[new THREE.Vector2(0,.14),wrist,tips[0]];
 const scallop=(a,b,n=4,depth=.03)=>{for(let k=1;k<=n;k++){const u=k/n,p=a.clone().lerp(b,u),dip=Math.sin(u*Math.PI)*depth;const nrm=new THREE.Vector2(b.y-a.y,a.x-b.x).normalize().multiplyScalar(side*dip);outline.push(p.add(nrm));}};
 scallop(tips[0],tips[1]);scallop(tips[1],tips[2]);scallop(tips[2],new THREE.Vector2(0,0),4,.035);
 const membrane=new THREE.ExtrudeGeometry(new THREE.Shape(outline),{depth:.005,bevelEnabled:false,curveSegments:1});
 P.add(membrane,null,(x,y)=>mix(C.membrane,C.membraneLit,Math.abs(x)/.3*.7+y*.4));
 return P.merge();
}

// A long thin tail sweeping down, back and curling up behind, ending in a spade.
function buildTail(){
 const P=pieces();
 const {tube,path}=taperedTube([[0,0,0],[0,-.1,-.07],[.02,-.17,-.16],[.04,-.14,-.25],[.05,-.05,-.3],[.05,.04,-.28]],28,.016,.55);
 P.add(tube,null,(x,y,z)=>mix(C.skin,C.skinDark,-z/.3));
 const end=path.getPoint(1),dir=path.getTangent(1),q=new THREE.Quaternion().setFromUnitVectors(UP,dir);
 // the spade: a flattened diamond cone with a round shoulder, aimed along the tail's end
 P.add(new THREE.ConeGeometry(.035,.07,4),new THREE.Matrix4().compose(end.clone().addScaledVector(dir,.04),q,new THREE.Vector3(1,1,.3)),C.skinDark);
 P.add(new THREE.SphereGeometry(.03,8,6),new THREE.Matrix4().compose(end.clone().addScaledVector(dir,.008),q,new THREE.Vector3(1,.5,.3)),C.skinDark);
 return P.merge();
}

let shared=null;
function geometry(){
 if(shared)return shared;
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6});
 const eye=new THREE.MeshStandardMaterial({color:0xffb040,emissive:0xff6010,emissiveIntensity:2.6,roughness:.25});
 shared={material,eye,body:buildBody(),head:buildHead(),eyes:buildEyes(),leg:buildLeg(),tail:buildTail(),arm:{'-1':buildArm(-1),'1':buildArm(1)},wing:{'-1':buildWing(-1),'1':buildWing(1)}};
 return shared;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function createImp(){
 const S=geometry();
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 mesh(body,S.body,S.material,'body');
 const head=new THREE.Group();head.position.set(0,.7,.03);body.add(head);
 mesh(head,S.head,S.material,'head');mesh(head,S.eyes,S.eye,'eyes');
 const legs=[],arms=[],wings=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.065,.38,0);leg.rotation.z=s*.04;body.add(leg);mesh(leg,S.leg,S.material,'leg');legs.push(leg);
  const arm=new THREE.Group();arm.position.set(s*.12,.61,0);arm.rotation.set(-.15,0,s*.14);body.add(arm);mesh(arm,S.arm[s],S.material,'arm');arms.push(arm);
  const wing=new THREE.Group();wing.position.set(s*.04,.58,-.08);wing.rotation.x=-.25;wing.userData.side=s;body.add(wing);mesh(wing,S.wing[s],S.material,'wing');wings.push(wing);
 }
 const tail=new THREE.Group();tail.position.set(0,.34,-.07);body.add(tail);mesh(tail,S.tail,S.material,'tail');
 return {g,body,legs,tail,wings,quirk:'imp',arms,arm:arms[1],head,hat:null,beard:null,pick:null};
}
