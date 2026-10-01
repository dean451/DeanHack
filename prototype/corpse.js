import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';
import {segment,chain} from './ant.js';

// Corpses used to be one generic pile of bones and a skull, whatever had died. They now lie as
// the body the monster had, picked by its name (the bridge sends the monster's name for a corpse):
// - beast: a four-legged animal flopped on its side, legs stiff and out, head on its cheek with
//   the eye shut and the tongue lolling, tail trailing. Dogs, cats, horses, rats, bears, lizards,
//   dragons (under UnNetHack's names too: leviathan, wyvern, lindworm...) and the like. Dragons add horns swept back from the head, a ridge of spines
//   down the back and tail, a spade tail tip, a banded belly and a wing folded over the flank.
// - humanoid: face down, one arm flung up past the head, the other along the side, one knee bent.
//   Anything that walks on two legs, and the fallback for names not listed.
// - serpent: a limp S along the floor, rolled half over near the tail to show the pale belly.
//   Snakes, eels, nagas; worms are thicker, ringed and headless.
// - bug: on its back with the legs curled up in the air (six, or eight for spiders and scorpions).
// - blob: a slumped, lumpy splat with a few flung droplets. Jellies, puddings, oozes, molds.
// - bird: on its back with the wings spread flat (feathered, or a membrane for bats) and the feet
//   curled up.
// - rubber: cockatrices and chickatrices leave a rubber chicken (the user's request): glossy
//   yellow, plucked and goose-bumped, on its back with stiff legs up, a long limp neck flopped
//   to one side, the beak gaping in a last squawk, a floppy red comb and wattle, and X'd-out eyes.
//   Always the same yellow, whatever the glyph colour, and no pool: it's rubber.
// The coat or clothing takes the glyph colour. Most lie in a pool (blood, or ichor for bugs; none
// for undead, blobs or golems). Size comes from the name (tiny, small, medium, large).
// Two draws: the body (one merged, vertex-coloured mesh) and the pool (a glossier one). The
// geometry is built once per look and shared; each corpse has its own two materials, which
// userData.dispose frees. The head points to +z; the caller turns the corpse as it likes.

// NetHack's 16 terminal colours, as creatures.js tones them.
const NH_COLORS=['#34343c','#a83b2e','#4f8a3a','#8a6440','#3d5fb0','#8a3f8f','#3f9a9a','#8f8f88',null,'#d9782e','#7fbf4f','#d6ac3a','#5f8fe0','#b85cbf','#6fd0d0','#e2ded2'];

// UnNetHack renames most of the adult dragons (the 'D' class), so match those names too.
const DRAGONS=/dragon|wyrm|tatzelworm|amphitere|draken|lindworm|sarkany|sirrush|leviathan|wyvern|guivre|tiamat|ixoth/;
const PLANS=[
 ['blob',/jelly|pudding|ooze|slime|blob|mou?ld\b|lichen|shrieker|fungus|gelatinous cube|lurker above|trapper|jellyfish|mimic|piercer|\bfern\b|fern sprout/],
 ['bug',/\bants?\b|chillbug|scorpius|\bbees?\b|beetle|spider|centipede|scorpion|\bticks?\b|grid bug|\bxan\b|\bfly\b|locust|cockroach|wasp|hornet|\blice\b|\blouse\b/],
 ['rubber',/cockatrice|chickatrice/],
 ['bird',/\bbats?\b|raven|pyrolisk|\bbird|cockatrice|chickatrice|phoenix|vulture|\bcrow\b|eagle|\bhawk\b|\bowl\b/],
 ['serpent',/kraken|watcher in the water|snake|cobra|python|pit viper|\basp\b|water moccasin|serpent|\beel\b|\bworm\b|naga|piranha|shark|couatl/],
 ['beast',DRAGONS],
 ['beast',/\bdog\b|housecat|cerberus|rock mole|centaur|jackal|coyote|\bfox\b|wolf|warg|hound|\bcat\b|kitten|lynx|panther|jaguar|tiger|\blion|leopard|pony|horse|unicorn|\brat\b|rabbit|rodent|mouse|woodchuck|badger|\bbear\b|\bape\b|monkey|yeti|sasquatch|carnotaur|titanothere|baluchitherium|mastodon|mumak|leocrotta|wumpus|lizard|\bnewt\b|gecko|iguana|crocodile|alligator|salamander|chameleon|dragon|wyrm|dingo|rothe|displacer|rust monster|disenchanter|basilisk|turtle|tortoise|squirrel|lemming|hellcat|jabberwock|owlbear|dog\b/],
];
const TINY=/\bnewt\b|chickatrice|gecko|sewer rat|\brat\b|\bbats?\b|\bbees?\b|kitten|mouse|lichen|grid bug|lemming|\bticks?\b|\bfly\b|\blouse\b|little dog|homunculus|\bimp\b|manes|lemure/;
const SMALL=/jackal|coyote|\bfox\b|centipede|cave spider|kobold|gnome|hobbit|\bdwarf\b|housecat|small|baby|\bgiant rat\b|piranha|raven|chickatrice|cockatrice|\blizard\b|iguana|leprechaun|nymph|quasit|tengu|garter/;
const LARGE=/\bgiant\b(?! (?:ant|beetle|spider|bat|rat|eel|turtle|centipede|mimic|louse|tick))|titan|dragon|tatzelworm|amphitere|draken|lindworm|sarkany|sirrush|leviathan|wyvern|guivre|tiamat|ixoth|cerberus|mastodon|mumak|titanothere|baluchitherium|purple worm|ettin|minotaur|juiblex|jabberwock|kraken|owlbear|warhorse|\bhorse\b|\bbear\b|troll|ogre|yeti|sasquatch|leviathan|wyrm|crocodile|python|carnotaur|\bgiant eel\b|shark|naga\b|gelatinous cube|black pudding/;
const SCALE={tiny:.5,small:.72,medium:1,large:1.3};
// A body lying flat is longer than one standing, so people are drawn a little smaller.
const PLAN_SCALE={humanoid:.85};
const NO_POOL=/zombie|mummy|skeleton|ghoul|\blich\b|vampire|wraith|ghost|golem|shade|spectre|barrow wight/;

export function corpsePlan(name=''){
 const n=String(name).toLowerCase();
 for(const [plan,re] of PLANS)if(re.test(n))return plan;
 return 'humanoid';
}
export function corpseSize(name=''){
 const n=String(name).toLowerCase();
 if(/\bbaby\b/.test(n))return 'small';
 return LARGE.test(n)?'large':TINY.test(n)?'tiny':SMALL.test(n)?'small':'medium';
}

const hash=(a,b=0)=>{const v=Math.sin(a*12.9898+b*78.233)*43758.5453;return v-Math.floor(v);};
const shade=(c,k)=>c.map(v=>v*k);
const cache=new Map();

// A cone from base along dir (both [x,y,z]), len long.
function spike(P,base,dir,r,len,colour){
 const d=new THREE.Vector3(...dir).normalize(),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d);
 P.add(new THREE.ConeGeometry(r,len,6),new THREE.Matrix4().compose(new THREE.Vector3(...base).addScaledVector(d,len/2),q,new THREE.Vector3(1,1,1)),colour);
}

// The beast's trunk, haunch and shoulder as ellipsoids [cx,cy,cz,rx,ry,rz], for draping the wing.
const TRUNK=[[0,.095,0,.1275,.093,.2325],[-.012,.1,-.14,.095,.08,.105],[-.005,.1,.13,.0855,.072,.09]];
function drapeY(x,z){
 let y=.008;
 for(const [cx,cy,cz,rx,ry,rz] of TRUNK){
  const q=Math.hypot((x-cx)/rx,(z-cz)/rz);
  y=Math.max(y,q<1?cy+ry*Math.sqrt(1-q*q):cy-(q-1)*.65);
 }
 return y+.012;
}

// The dragon's wing, folded and draped over the upper flank: the arm bone runs back along the top
// of the body, and the membrane hangs over the back (-x) to the floor in scallops between the fingers.
function foldedWing(P,C){
 const arm=s=>[-.015-.04*s,0,.16-.3*s],D=[-.97,0,-.24],reach=s=>.24*(.78+.22*Math.abs(Math.sin(s*Math.PI*3)))*(1-.35*s);
 const place=(s,t)=>{const [ax,,az]=arm(s),L=reach(s)*t,x=ax+D[0]*L,z=az+D[2]*L;return [x,drapeY(x,z),z];};
 const geo=new THREE.PlaneGeometry(1,1,18,10),p=geo.attributes.position;
 for(let i=0;i<p.count;i++)p.setXYZ(i,...place(p.getX(i)+.5,p.getY(i)+.5));
 geo.computeVertexNormals();
 P.add(geo,null,(x,y,z)=>mix(C.dark,C.coat,.35+.25*Math.sin(z*70+x*30)));
 // The arm bone and three fingers, a shade darker, raised a hair off the membrane.
 const bone=pts=>chain(P,pts.map(([x,y,z])=>[x,y+.006,z]),pts.map((_,i)=>.013-i*.0025),shade(C.coat,.55),6);
 bone([0,.25,.5,.75,1].map(s=>place(s,0)));
 for(const s of [0,.34,.67])bone([0,.35,.7,.95].map(t=>place(s+t*.12,t)));
 P.add(new THREE.ConeGeometry(.012,.05,6),at(...place(1,0).map((v,i)=>v+[0,.01,-.02][i]),[-Math.PI/2,0,0]),C.claw);
}

// The beast lies on its right side: back toward -x, belly and legs toward +x.
function beast(P,C,{dragon}={}){
 const fur=(x,y,z)=>mix(mix(C.dark,C.coat,.55+x*6),C.light,(x-.05)*9+hash(Math.round(z*40),Math.round(y*40))*.08);
 // Dragon bellies are banded plates; their backs are scaled, not furred.
 const coat=dragon?(x,y,z)=>{const c=fur(x,y,z);return x>.06?mix(c,shade(C.light,.8),Math.sin(z*110)**8*.7):mix(c,C.dark,Math.max(0,Math.sin(z*160)*Math.sin(y*160))*.35);}:fur;
 P.add(new THREE.SphereGeometry(.15,22,14),at(0,.095,0,[0,0,0],[.85,.62,1.55]),coat);
 P.add(new THREE.SphereGeometry(.1,16,10),at(-.012,.1,-.14,[0,0,0],[.95,.8,1.05]),coat);// haunch
 P.add(new THREE.SphereGeometry(.09,16,10),at(-.005,.1,.13,[0,0,0],[.95,.8,1]),coat);// shoulder
 segment(P,[0,.095,.19],[.03,.072,.3],.068,.052,coat,12);
 P.add(new THREE.SphereGeometry(.075,18,12),at(.035,.07,.34,[0,0,0],[.92,.8,1.08]),coat);
 segment(P,[.045,.058,.37],[.06,.048,.47],.044,.027,coat,12);// muzzle
 P.add(new THREE.SphereGeometry(.017,8,6),at(.062,.05,.476),C.nose);
 P.add(new THREE.SphereGeometry(.012,8,6),at(.06,.115,.37,[0,0,0],[1.4,.3,.6]),C.nose);// shut eye
 P.add(new THREE.SphereGeometry(.03,10,6),at(.09,.03,.45,[0,.3,0],[.55,.2,1]),C.tongue);
 if(dragon){
  // Horns swept back past the neck (the upper pair clear of it, the lower pair along the floor),
  // with a pale tip, and a brow ridge.
  for(const [bx,by,r,len] of [[-.03,.105,.017,.13],[-.015,.12,.012,.08],[0,.03,.016,.11]]){
   spike(P,[bx,by,.35],[-.35,by>.06?.25:-.05,-1],r,len,C.horn);
   spike(P,[bx-.3*len,by+(by>.06?.08:-.02)*len,.35-.9*len],[-.35,.25,-1],r*.45,.03,C.hornTip);
  }
  P.add(new THREE.SphereGeometry(.02,8,6),at(.05,.1,.39,[0,0,0],[1,.6,1.6]),shade(C.coat,.7));
 }else{
  // Ears: the upper one lies back along the neck, the lower one is pressed under the cheek.
  P.add(new THREE.ConeGeometry(.03,.07,8),at(-.02,.11,.3,[-1.9,0,.2],[1,1,.35]),shade(C.coat,.8));
  P.add(new THREE.ConeGeometry(.03,.06,8),at(.0,.02,.31,[-1.7,0,0],[1,1,.35]),shade(C.coat,.7));
 }
 // Legs: the upper pair stretched out stiff, the lower pair tucked under along the floor.
 const legs=[[[.08,.135,.13],[.25,.13,.22],[.33,.12,.21]],[[.08,.05,.12],[.22,.04,.17],[.3,.035,.14]],
  [[.08,.135,-.13],[.23,.13,-.21],[.33,.12,-.25]],[[.08,.05,-.14],[.2,.04,-.18],[.29,.035,-.2]]];
 for(const leg of legs){
  chain(P,leg,[.042,.03,.022],()=>coat,10);
  P.add(new THREE.SphereGeometry(.028,10,6),at(...leg[2],[0,0,0],[1.1,.8,1.2]),shade(C.coat,.55));
  if(dragon)for(const a of [-.5,0,.5])spike(P,[leg[2][0]+.015,leg[2][1],leg[2][2]+a*.02],[1,-.1,a*.6],.007,.035,C.claw);
 }
 const tail=[[-.02,.09,-.22],[-.06,.04,-.32],[-.03,.028,-.42],[.03,.024,-.48]];
 chain(P,tail,[.034,.028,.02,.011],()=>coat,10);
 if(!dragon)return;
 // Spines down the back from the neck to the tail tip, shrinking at both ends.
 const ridge=[];
 for(let z=.27;z>-.2;z-=.055){const q=Math.min(1,(z/.2325)**2);ridge.push([-.1275*Math.sqrt(1-q)*.92,.1,z]);}
 for(let j=0;j<tail.length-1;j++)for(const f of [.25,.75]){const [a,b]=[tail[j],tail[j+1]];ridge.push([a[0]+(b[0]-a[0])*f-.02,a[1]+(b[1]-a[1])*f+.012,a[2]+(b[2]-a[2])*f]);}
 ridge.forEach((p,i)=>{const k=Math.sin((i+1)/(ridge.length+1)*Math.PI);spike(P,p,[-1,.45,-.35],.012+.012*k,.03+.04*k,shade(C.coat,.5));});
 // The spade at the tail tip, flat on the floor.
 P.add(new THREE.ConeGeometry(.035,.06,4),at(.035,.014,-.5,[-Math.PI/2,0,Math.PI/4],[1,1,.3]),shade(C.coat,.55));
 foldedWing(P,C);
}

// Face down: the back of the head and the back of the clothes face up.
function humanoid(P,C){
 const cloth=(x,y,z)=>{let c=mix(shade(C.cloth,.7),C.cloth,(y-.02)/.08);if(Math.abs(z+.06)<.018)c=C.belt;return c;};
 P.add(new THREE.SphereGeometry(.12,22,14),at(0,.07,.06,[0,0,0],[1.3,.58,1.55]),cloth);
 P.add(new THREE.SphereGeometry(.1,18,12),at(0,.066,-.12,[0,0,0],[1.32,.62,1]),(x,y,z)=>z>-.08?cloth(x,y,z):mix(shade(C.legs,.7),C.legs,(y-.02)/.08));
 segment(P,[0,.07,.21],[.01,.07,.26],.04,.038,C.skin,10);
 P.add(new THREE.SphereGeometry(.072,18,14),at(.015,.074,.31,[0,0,.25],[1,.95,1.12]),(x,y,z)=>y>.08||z<.3?mix(C.hair,shade(C.hair,1.3),hash(Math.round(x*90),Math.round(z*90))*.5):C.skin);
 // Arms: one flung up past the head, one down along the side.
 const armL=[[-.14,.07,.16],[-.25,.05,.29],[-.2,.038,.42]],armR=[[.14,.07,.15],[.23,.05,.02],[.26,.038,-.1]];
 for(const arm of [armL,armR]){
  chain(P,arm,[.042,.036,.03],(j)=>j?shade(C.cloth,.85):C.cloth,10);
  P.add(new THREE.SphereGeometry(.03,10,8),at(...arm[2],[0,0,0],[1,.7,1.3]),C.skin);
 }
 // Legs: one straight, one bent out at the knee.
 const legL=[[-.07,.06,-.19],[-.11,.05,-.37],[-.13,.044,-.52]],legR=[[.07,.06,-.19],[.18,.05,-.33],[.16,.044,-.49]];
 for(const leg of [legL,legR]){
  chain(P,leg,[.052,.044,.036],C.legs,10);
  P.add(new THREE.SphereGeometry(.04,10,8),at(leg[2][0],.036,leg[2][2]-.03,[0,0,0],[.9,.8,1.6]),C.boots);
 }
}

// A limp S along the floor; t runs from the tail (0) to the head (1).
function serpent(P,C,{worm,short}){
 const len=short?.55:1,thick=worm?1.5:1,N=short?8:14;
 const pts=Array.from({length:N},(_,i)=>{const t=i/(N-1);return [Math.sin(t*Math.PI*(short?1.2:2.2))*.17*len,0,(t-.5)*.9*len];});
 const r=i=>{const t=i/(N-1);return (.012+.03*Math.min(1,t*2.4)*Math.min(1,(1.08-t)*6))*thick;};
 pts.forEach((p,i)=>p[1]=r(i)*.85);
 // Near the tail the body has rolled half over: its pale belly faces up.
 const skin=j=>(x,y,z)=>{
  const t=j/(N-2),up=y>r(j)*.85,rolled=t>.15&&t<.4;
  let c=up!==rolled?C.coat:C.light;
  if(worm)c=mix(c,C.dark,Math.sin(z*90)**8*.6);
  else if(up&&!rolled&&Math.sin(z*55+x*20)>.6)c=mix(c,C.dark,.7);
  return c;
 };
 chain(P,pts,pts.map((_,i)=>r(i)),skin,12);
 if(worm)return;
 const [hx,,hz]=pts[N-1],[px,,pz]=pts[N-2],dir=new THREE.Vector3(hx-px,0,hz-pz).normalize();
 const head=[hx+dir.x*.03,.03,hz+dir.z*.03],yaw=Math.atan2(dir.x,dir.z);
 P.add(new THREE.SphereGeometry(.042,14,10),at(...head,[0,yaw,0],[.95,.62,1.35]),(x,y)=>y>.03?C.coat:C.light);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.008,6,4),at(head[0]+Math.cos(yaw)*s*.03,.048,head[2]-Math.sin(yaw)*s*.03+dir.z*.02,[0,0,0],[1,.5,1]),C.nose);
 P.add(new THREE.ConeGeometry(.006,.05,4),at(head[0]+dir.x*.07,.02,head[2]+dir.z*.07,[Math.PI/2,0,-yaw]),C.tongue);
}

// On its back: the underside faces up and the legs curl over it.
function bug(P,C,{eight}){
 const shell=(x,y)=>mix(shade(C.coat,.6),C.light,(y-.03)/.07);
 P.add(new THREE.SphereGeometry(.09,18,12),at(0,.058,-.09,[0,0,0],[1,.62,1.3]),shell);
 P.add(new THREE.SphereGeometry(.06,16,10),at(0,.055,.04,[0,0,0],[1,.7,1.05]),shell);
 P.add(new THREE.SphereGeometry(.045,14,10),at(0,.045,.12,[0,0,0],[1.05,.75,.95]),shade(C.coat,.8));
 const n=eight?4:3;
 for(let i=0;i<n;i++)for(const s of [-1,1]){
  const z=.08-i*(eight?.045:.055),reach=eight?1.35:1,k=hash(i,s)*.03;
  chain(P,[[s*.045,.06,z],[s*.12*reach,.1+k,z+(i-1)*.03],[s*.1*reach,.17+k,z+(i-1)*.04],[s*.04,.17,z]],[.011,.009,.007,.005],shade(C.coat,.5),6);
 }
 for(const s of [-1,1])chain(P,[[s*.02,.05,.16],[s*.06,.07,.22],[s*.1,.06,.26]],[.005,.004,.003],shade(C.coat,.5),5);
}

// Slumped and spread: a lumpy puddle of itself with flung droplets.
function blob(P,C){
 const geo=new THREE.SphereGeometry(.26,32,12,0,Math.PI*2,0,Math.PI/2),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),k=1+.18*Math.sin(a*3+1)+.1*Math.sin(a*7);
  p.setXYZ(i,x*k,y*.34*(1+.35*Math.sin(x*30)*Math.cos(z*26)),z*k);
 }
 geo.computeVertexNormals();
 P.add(geo,at(0,0,0),(x,y,z)=>mix(mix(shade(C.coat,.55),C.coat,y/.05),C.light,Math.max(0,(y-.06)/.03)));
 for(let i=0;i<5;i++){const a=i*1.3+.4,d=.3+hash(i)*.08;P.add(new THREE.SphereGeometry(.028+hash(i,1)*.02,10,6,0,Math.PI*2,0,Math.PI/2),at(Math.cos(a)*d,0,Math.sin(a)*d,[0,0,0],[1,.4,1]),C.coat);}
}

// On its back with the wings spread flat.
function bird(P,C,{bat}){
 const body=(x,y)=>mix(C.coat,C.light,(y-.05)/.05);
 P.add(new THREE.SphereGeometry(.07,16,12),at(0,.055,0,[0,0,0],[1,.75,1.35]),body);
 P.add(new THREE.SphereGeometry(.045,14,10),at(0,.045,.11),shade(C.coat,.9));
 if(bat)for(const s of [-1,1])P.add(new THREE.ConeGeometry(.018,.05,6),at(s*.028,.05,.15,[1.3,0,s*.3]),shade(C.coat,.8));
 else P.add(new THREE.ConeGeometry(.018,.06,8),at(0,.035,.17,[Math.PI/2,0,0]),C.beak);
 for(const s of [-1,1]){
  const w=new THREE.Shape();
  if(bat){w.moveTo(0,.05);w.lineTo(.12,.1);w.lineTo(.3,.08);w.lineTo(.26,0);w.lineTo(.2,.03);w.lineTo(.16,-.04);w.lineTo(.1,-.01);w.lineTo(0,-.05);}
  else{w.moveTo(0,.05);w.quadraticCurveTo(.18,.1,.34,.02);w.lineTo(.3,-.02);w.lineTo(.32,-.05);w.lineTo(.24,-.06);w.lineTo(.25,-.1);w.lineTo(.14,-.09);w.quadraticCurveTo(.05,-.08,0,-.04);}
  const geo=new THREE.ExtrudeGeometry(w,{depth:.008,bevelEnabled:false});geo.rotateX(-Math.PI/2);
  // The left wing is the right one turned over (a rotation, so the faces keep their winding).
  P.add(geo,at(s*.05,s<0?.026:.018,0,[0,0,s<0?Math.PI:0]),(x,y,z)=>{const d=Math.abs(x);return bat?mix(C.dark,C.coat,Math.sin(d*60)**2*.5):mix(C.coat,C.dark,Math.max(0,(d-.2)/.12)+(Math.sin(z*80)>.8?.2:0));});
 }
 // Feet curled up in the air, and the tail.
 for(const s of [-1,1])chain(P,[[s*.025,.08,-.04],[s*.03,.13,-.05],[s*.015,.14,-.02]],[.008,.006,.004],bat?C.dark:C.beak,5);
 if(!bat)P.add(new THREE.ConeGeometry(.05,.1,6),at(0,.025,-.13,[-Math.PI/2,0,0],[1,1,.25]),shade(C.coat,.8));
}

function rubberChicken(P,C){
 const yellow=C.rubber,tan=shade(C.rubber,.82),body=(x,y)=>mix(tan,yellow,(y-.02)/.09);
 // a plucked teardrop body, fat at the back, on its back
 P.add(new THREE.SphereGeometry(.075,18,14),at(0,.06,-.03,[0,0,0],[1,.78,1.3]),body);
 P.add(new THREE.SphereGeometry(.05,14,10),at(0,.055,.05,[0,0,0],[1,.8,1.1]),body);
 // goosebumps over the upturned belly and sides
 for(let i=0;i<36;i++){const a=hash(i,3)*Math.PI*2,p=Math.acos(1-1.4*hash(i,7)),d=[Math.cos(a)*Math.sin(p),Math.cos(p),Math.sin(a)*Math.sin(p)];
  P.add(new THREE.SphereGeometry(.006,4,3),at(d[0]*.076,.06+d[1]*.059,-.03+d[2]*.099),shade(yellow,.93));}
 // plucked stub wings flopped out to the sides, and a stubby tail nub
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.04,10,8),at(s*.078,.045,-.01,[0,s*.4,s*.5],[.3,.55,1]),body);
 P.add(new THREE.ConeGeometry(.03,.06,8),at(0,.05,-.15,[-Math.PI/2-.3,0,0],[1,1,.6]),tan);
 // stiff legs straight up in the air, three toes splayed at the top and a spur behind
 for(const s of [-1,1]){const hip=[s*.032,.095,-.05],knee=[s*.04,.16,-.06],ankle=[s*.046,.215,-.05];
  chain(P,[hip,knee,ankle],[.013,.008,.007],C.leg,7);
  for(const t of [-1,0,1])chain(P,[ankle,[ankle[0]+t*.022,ankle[1]+.02,ankle[2]+.035-Math.abs(t)*.012]],[.0055,.0035],C.leg,5);
  chain(P,[ankle,[ankle[0],ankle[1]+.008,ankle[2]-.02]],[.005,.003],C.leg,5);}
 // the long limp neck drapes off the front and flops sideways along the floor
 const neck=[[0,.065,.09],[.012,.05,.14],[.04,.025,.19],[.075,.018,.23],[.1,.022,.27]];
 chain(P,neck,[.024,.02,.017,.016,.018],yellow,9);
 // the head lies on its cheek, beak to +z; its up is +x, the floor-facing cheek is -y
 const H=[.11,.028,.3];
 P.add(new THREE.SphereGeometry(.03,14,10),at(...H,[0,0,0],[1,.85,1.15]),yellow);
 // beak gaping in a last squawk: upper and lower bills splayed apart
 P.add(new THREE.ConeGeometry(.014,.05,8),at(H[0]+.008,H[1],H[2]+.045,[Math.PI/2,0,-.35]),C.beak);
 P.add(new THREE.ConeGeometry(.011,.04,8),at(H[0]-.012,H[1]-.002,H[2]+.04,[Math.PI/2,0,.4]),shade(C.beak,.85));
 P.add(new THREE.SphereGeometry(.012,8,6),at(H[0]-.002,H[1],H[2]+.026,[0,0,0],[1,.6,.8]),C.mouth);
 // the comb flops along the crown in floppy red lobes; the wattle dangles under the beak
 for(let i=0;i<4;i++)P.add(new THREE.SphereGeometry(.012-i*.0015,8,6),at(H[0]+.03,H[1]+.006,H[2]-.016+i*.014,[0,0,0],[.8,.45,1]),C.comb);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.009,8,6),at(H[0]-.032,H[1]+s*.006,H[2]+.024,[0,0,0],[1.5,.6,.8]),C.comb);
 // X'd-out eyes on the upturned cheek
 for(const r of [.75,-.75])P.add(new THREE.BoxGeometry(.004,.003,.022),at(H[0]+.006,H[1]+.026,H[2]+.006,[0,r,0]),C.ink);
}

function pool(plan,size,seed){
 const s=new THREE.Shape(),n=28,R={blob:.3,bug:.14,bird:.16,rubber:.16,serpent:.2,beast:.26,humanoid:.26}[plan];
 for(let i=0;i<n;i++){const a=i/n*Math.PI*2,r=R*(.72+.28*hash(i,seed)+.12*Math.sin(a*3+seed));s[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r*(plan==='humanoid'?1.25:1));}
 s.closePath();
 const geo=new THREE.ShapeGeometry(s);geo.rotateX(-Math.PI/2);geo.translate(plan==='beast'?.06:0,.003/(SCALE[size]*(PLAN_SCALE[plan]??1)),plan==='humanoid'?.2:plan==='beast'?.12:0);
 geo.deleteAttribute('uv');return geo;
}

function colours(plan,colour){
 const glyph=rgb(Number.isInteger(colour)&&NH_COLORS[colour]?NH_COLORS[colour]:'#8a6440');
 if(plan==='humanoid'){
  const cloth=mix(glyph,rgb('#5e4c38'),.35);
  return {cloth,legs:mix(shade(cloth,.6),rgb('#3a3028'),.5),belt:rgb('#2a1c12'),boots:rgb('#2c2118'),skin:rgb('#c8977a'),hair:rgb('#3a2616')};
 }
 if(plan==='rubber')return {rubber:rgb('#f2cc2a'),leg:rgb('#e8a020'),beak:rgb('#f08a1c'),comb:rgb('#d8261e'),mouth:rgb('#7a1414'),ink:rgb('#101010')};
 return {coat:glyph,dark:shade(glyph,.45),light:mix(glyph,rgb('#e8dcc4'),.55),nose:rgb('#141010'),tongue:rgb('#b85a66'),beak:rgb('#c89a3a'),
  horn:rgb('#d8cbb0'),hornTip:rgb('#3a3026'),claw:rgb('#1a1612')};
}

function build(name,colour){
 const n=String(name||'').toLowerCase(),plan=corpsePlan(n),size=corpseSize(n);
 const key=[plan,size,plan==='rubber'?'':colour,/worm/.test(n),/piranha|shark/.test(n),/spider|scorpion/.test(n),/\bbats?\b/.test(n),DRAGONS.test(n)].join('|');
 if(cache.has(key))return cache.get(key);
 const P=pieces(),C=colours(plan,colour);
 if(plan==='beast')beast(P,C,{dragon:DRAGONS.test(n)});
 else if(plan==='serpent')serpent(P,C,{worm:/worm/.test(n),short:/piranha|shark/.test(n)});
 else if(plan==='bug')bug(P,C,{eight:/spider|scorpion/.test(n)});
 else if(plan==='blob')blob(P,C);
 else if(plan==='rubber')rubberChicken(P,C);
 else if(plan==='bird')bird(P,C,{bat:/\bbats?\b/.test(n)});
 else humanoid(P,C);
 const body=P.merge();body.computeBoundingBox();
 const lift=body.boundingBox.min.y;body.translate(0,-lift,0);
 const S={plan,size,body,pool:pool(plan,size,key.length),ichor:plan==='bug'};
 cache.set(key,S);return S;
}

// The corpse of the named monster. colour is its glyph colour (CLR_*); seed turns it.
export function createCorpse(name,colour,seed=0){
 const n=String(name||'').toLowerCase(),S=build(n,colour);
 const g=new THREE.Group();g.name=`Corpse of ${n||'creature'}`;g.scale.setScalar(SCALE[S.size]*(PLAN_SCALE[S.plan]??1));g.rotation.y=(seed%360)*Math.PI/180;
 const rubber=S.plan==='rubber',flesh=new THREE.MeshStandardMaterial({vertexColors:true,roughness:rubber?.32:.86});
 const body=new THREE.Mesh(S.body,flesh);body.castShadow=body.receiveShadow=true;body.userData.part='corpse';g.add(body);
 const materials=[flesh];
 if(S.plan!=='blob'&&!rubber&&!NO_POOL.test(n)){
  const wet=new THREE.MeshStandardMaterial({color:S.ichor?0x3e4a14:0x4a0b0e,roughness:.22,metalness:.05,polygonOffset:true,polygonOffsetFactor:-1});
  const puddle=new THREE.Mesh(S.pool,wet);puddle.receiveShadow=true;puddle.userData.part='pool';g.add(puddle);materials.push(wet);
 }
 g.userData.plan=S.plan;
 g.userData.dispose=()=>materials.forEach(m=>m.dispose());
 return g;
}
