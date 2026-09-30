import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {pieces,rgb,mix,at} from './homunculus.js';
import {segment,chain} from './ant.js';

// Wild dogs (d) used to be four stretched spheres, a cylinder snout, cone ears, square posts and
// a string of beads for a tail. They now have a proper canine build, head to the front (+z):
// - Torso: one sphere pulled into a dog's shape: a deep chest, a tucked waist, a level back and
//   a narrow loin. The wolf and warg carry a ruff of shaggy tufts round the neck; the warg and
//   the hell hounds raise hackles along the spine.
// - Head: a domed skull with a brow stop, full cheeks, a long tapering muzzle over a lower jaw,
//   a dark lip line, a black nose leather, fangs showing at the front, tall pointed ears with
//   pale insides, eyes with round pupils.
// - Legs: shoulder, elbow and a straight forearm down to a pastern and a padded paw in front;
//   the hind legs have a muscled thigh, a forward stifle, a raised hock and a long foot. Four
//   toes with dark claws on every paw.
// - Tail: a bushy brush that droops from the rump (the fox's is long and thick, the hell
//   hounds' is carried higher), tipped in its own colour.
// Coats are painted per vertex from the body position:
// - jackal: tawny with a black saddle flecked silver, cream throat and belly, black tail tip.
//   werejackal: the same, darker and more grizzled, with amber eyes.
// - coyote: grizzled grey-tan, darker along the back, a cream belly and a black tail tip.
// - fox: fox red with a white chin, chest and belly, black stockings and black-backed ears,
//   a white tail tip.
// - wolf: grizzled grey with a dark saddle, pale cheeks and brows, pale legs, amber eyes.
// - warg: a huge, heavy dark wolf with a big ruff, raised hackles and glowing red eyes.
// - hell hounds: charred black-red hide split by glowing ember cracks, an ember belly, flame
//   tongues (below) and ember eyes.
// - any other 'd' gets the jackal's build in the glyph colour.
// One vertex-coloured fur material and one eye material per look. The body, head, eyes, each
// leg and the tail are one mesh each: 8 draws (plus 13 flames on a hell hound). Geometry is
// built once per look and shared; the left legs reuse the right ones mirrored.
// Pet dogs (little dog, dog, large dog) share the build with a friendlier face: no fangs, a
// pink tongue lolling from the mouth, a collar and a brass tag round the neck, and a tail
// carried up over the back for wagging. All three are white on the map (HI_DOMESTIC), so the
// breed shape and coat carry the size:
// - little dog: a white terrier with tan patches, a tan eye patch and floppy tan ears.
// - dog: a golden retriever-ish dog with folded ears, a darker back and cream socks.
// - large dog: a shepherd with a black saddle, a black muzzle and tall pointed ears.
// Handles: body, legs (4: left hind, left fore, right hind, right fore), head (the neck pivot),
// tail, quirk 'canine' ('dog' for pets, which live.js wags faster).

const LOOKS={
 jackal:{scale:1,coat:'#b98b55',saddle:'#2e2a26',belly:'#e4d2ab',tip:'#2a2522',eye:'#7a5220',ears:.18,snout:.2,legH:.31,pattern:'saddle',grizzle:.18},
 werejackal:{scale:1,coat:'#8a6a4a',saddle:'#221c18',belly:'#b9a58a',tip:'#1f1a18',eye:'#e0a030',glow:.8,ears:.18,snout:.2,legH:.31,pattern:'saddle',grizzle:.32},
 coyote:{scale:1.08,coat:'#94806a',saddle:'#5a4c3e',belly:'#dccfb8',tip:'#2c2825',eye:'#c8a040',ears:.16,snout:.2,pattern:'grizzle',grizzle:.3},
 fox:{scale:.85,coat:'#c9652b',saddle:'#b0531f',belly:'#f4ece0',tip:'#f5f0e8',socks:'#1e1a18',earBack:'#1e1a18',eye:'#d09a30',ears:.17,snout:.18,legH:.22,bushy:.062,tail:'brush',tailLen:1.1,pattern:'fox',grizzle:.06},
 wolf:{scale:1.2,coat:'#8a8a86',saddle:'#42423f',belly:'#dcdad2',tip:'#262626',eye:'#d8a838',glow:.3,ears:.14,snout:.2,legH:.34,bushy:.05,heavy:1.08,ruff:1,mask:true,pattern:'grizzle',grizzle:.3},
 warg:{scale:1.4,coat:'#5a524a',saddle:'#241f1c',belly:'#8a8176',tip:'#1a1716',eye:'#ff4a20',glow:1.6,ears:.13,snout:.21,legH:.36,bushy:.055,heavy:1.2,ruff:1.35,hackles:true,fangs:1.5,pattern:'grizzle',grizzle:.28},
 'little dog':{pet:true,scale:.72,coat:'#ece4d4',saddle:'#ddd2bf',belly:'#faf5ea',tip:'#faf5ea',mark:'#a8683a',eye:'#2a1a10',ears:.12,earStyle:'floppy',snout:.13,legH:.22,bushy:.018,tail:'up',tailLen:.8,pattern:'patches',eyePatch:true,collar:'#c0392b',grizzle:.03},
 dog:{pet:true,scale:.95,coat:'#c8914f',saddle:'#9a6a36',belly:'#f0dcb8',tip:'#d9ae72',socks:'#e8cfa4',eye:'#3a2414',ears:.12,earStyle:'folded',snout:.16,legH:.28,bushy:.026,tail:'up',pattern:'plain',collar:'#2e6ab0',grizzle:.04},
 'large dog':{pet:true,scale:1.18,coat:'#b27a3e',saddle:'#2a2320',belly:'#d9b27a',tip:'#2a2320',socks:'#c89660',muzzle:'#2a2320',eye:'#3a2414',ears:.16,snout:.19,legH:.32,bushy:.034,tail:'up',tailLen:1.1,pattern:'saddle',fleck:false,collar:'#6a3a1e',grizzle:.05},
 'hell hound pup':{scale:.85,coat:'#2a120e',saddle:'#120605',belly:'#e0602a',tip:'#ff7a2a',ember:'#ff5a14',eye:'#ffc050',ears:.13,snout:.17,legH:.26,hackles:true,fangs:1.2,tail:'raised',pattern:'char',fire:true},
 'hell hound':{scale:1.3,coat:'#2a120e',saddle:'#120605',belly:'#e0602a',tip:'#ff7a2a',ember:'#ff5a14',eye:'#ffc050',ears:.14,snout:.2,legH:.34,heavy:1.1,hackles:true,fangs:1.4,tail:'raised',pattern:'char',fire:true},
};

const hash=n=>{const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);};
const clamp01=v=>v<0?0:v>1?1:v;
const smooth=v=>{v=clamp01(v);return v*v*(3-2*v);};
const WHITE=[1,1,1],BLACK=[0,0,0];
// big soft-edged blotches (the little dog's tan patches), from a few crossed sine waves
const patch=(x,y,z)=>smooth((Math.sin(x*17+1.3)*Math.sin(z*13+.4)+Math.sin(y*19+z*6)*.45-.55)/.12);

// Hellfire: tongues of flame tagged part 'flame', so flame-flicker.js flickers them and lends
// them its point lights. One lathe tongue, white-hot at the root and deep red at the tip, shared
// by every flame; each is placed, scaled and leaned on its own.
const HELLFIRE=(()=>{
 const geo=new THREE.LatheGeometry([[0,0],[.03,.012],[.042,.04],[.036,.08],[.022,.12],[.008,.16],[0,.19]].map(([r,y])=>new THREE.Vector2(r,y)),12);
 const p=geo.attributes.position,c=new THREE.Color(),cols=[],hot=new THREE.Color(0xfff2b0),mid=new THREE.Color(0xff8a1a),tip=new THREE.Color(0xc81e08);
 for(let i=0;i<p.count;i++){const t=p.getY(i)/.19;c.copy(hot).lerp(mid,Math.min(1,t*2.2));if(t>.45)c.lerp(tip,(t-.45)/.55);cols.push(c.r,c.g,c.b);}
 geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
 return {geo,material:new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false})};
})();
function hellfire(parent,x,y,z,s,lean=0,tilt=0){const f=new THREE.Mesh(HELLFIRE.geo,HELLFIRE.material);f.position.set(x,y,z);f.scale.setScalar(s);f.rotation.set(lean,0,tilt);f.castShadow=f.receiveShadow=false;f.userData.part='flame';parent.add(f);return f;}

// a cone from `base` pointing along `dir`: tufts, hackles, claws, fangs
function spike(P,base,dir,r,h,colour,radial=4){
 const d=new THREE.Vector3(...dir).normalize(),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d);
 const pos=new THREE.Vector3(...base).addScaledVector(d,h/2);
 P.add(new THREE.ConeGeometry(r,h,radial),new THREE.Matrix4().compose(pos,q,new THREE.Vector3(1,1,1)),colour);
}

// Fur texture, shared by every part: agouti grizzle (light and dark flecks, vertex by vertex)
// and, on a hell hound, glowing ember cracks through the charred hide.
function fur(L,C,c,x,y,z){
 if(L.grizzle){const n=hash(x*913.1+y*577.3+z*311.7);c=n>.5?mix(c,WHITE,(n-.5)*2*L.grizzle):mix(c,BLACK,(.5-n)*2*L.grizzle*.8);}
 if(L.pattern==='char'){
  const a=Math.abs(Math.sin(z*52+Math.sin(y*34+x*26)*1.8)),b=Math.abs(Math.sin(x*48-y*40+Math.sin(z*30)*1.5));
  if(a<.1&&Math.sin(x*37+y*23+z*11)>-.3)c=mix(c,C.ember,1-a/.1);
  else if(b<.07)c=mix(c,C.ember,.7*(1-b/.07));
 }
 return c;
}

// Coat colour on the torso and neck: a saddle or a darker back, pale belly, throat and chest.
function torsoAt(L,C){
 return (x,y,z)=>{
  const top=smooth((y-L.Y-.02)/.07);
  let c=C.coat;
  if(L.pattern==='saddle'){const s=top*smooth((z+.28)/.06)*smooth((.14-z)/.06);c=mix(c,C.saddle,.92*s);if(L.fleck!==false&&s>.4&&hash(x*701+y*433+z*997)>.72)c=mix(c,WHITE,.45);}
  else if(L.pattern==='patches')c=mix(c,C.mark,patch(x,y,z));
  else c=mix(c,C.saddle,top*(L.pattern==='fox'?.4:.6));
  c=fur(L,C,c,x,y,z);
  const belly=smooth((L.Y-.035-y)/.05),throat=smooth((z-.17)/.07)*smooth((L.Y+.1-y)/.08);
  return mix(c,C.belly,Math.max(belly,throat)*(L.pattern==='char'?.85:1));
 };
}

function torso(L){
 const bw=L.heavy||1,geo=new THREE.SphereGeometry(1,40,26);geo.rotateX(Math.PI/2);
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),u=p.getZ(i);
  // narrow at the loin, broad through the ribs; a level back over a deep chest and tucked waist
  const w=.1*bw*(1+.1*u)*(1-.12*Math.exp(-(((u+.3)/.3)**2)));
  const ht=.095+.012*u,hb=.11+.055*Math.max(0,u)-.05*Math.exp(-(((u+.28)/.26)**2));
  p.setXYZ(i,x*w,L.Y+(y>0?y*ht:y*hb),u*.3);
 }
 geo.deleteAttribute('uv');const merged=mergeVertices(geo);geo.dispose();merged.computeVertexNormals();
 return merged;
}

function buildBody(L,C){
 const P=pieces(),bw=L.heavy||1,paint=torsoAt(L,C);
 P.add(torso(L),null,paint);
 // shoulder blades and haunches
 for(const s of [-1,1]){
  P.add(new THREE.SphereGeometry(.05,12,8),at(s*.05*bw,L.Y+.05,.17,[0,0,0],[.75*bw,.75,1.2]),paint);
  P.add(new THREE.SphereGeometry(.065,14,10),at(s*.055*bw,L.Y+.01,-.2,[0,0,0],[.75*bw,1,1.1]),paint);
 }
 // the neck, rising forward to the head pivot
 const [nx,ny,nz]=L.neck;
 segment(P,[0,L.Y+.02,.2],[nx,ny-.02,nz-.01],.072*bw,.056*bw,paint,14);
 P.add(new THREE.SphereGeometry(.064*bw,16,10),at(0,L.Y+.09,.25),paint);
 // a pet's collar round the middle of the neck, with a brass tag hanging at the front
 if(L.collar){
  const a=Math.atan2(ny-.02-L.Y-.02,nz-.01-.2),cy=L.Y+.02+(ny-.04-L.Y)*.5,cz=.2+(nz-.21)*.5,r=.071*bw;
  P.add(new THREE.TorusGeometry(r,.013*bw,8,22),at(0,cy,cz,[-a,0,0]),rgb(L.collar));
  const tx=0,ty=cy-Math.cos(a)*r-.02,tz=cz+Math.sin(a)*r+.008;
  P.add(new THREE.CylinderGeometry(.019*bw,.019*bw,.005,12),at(tx,ty,tz,[Math.PI/2,0,0]),rgb('#d8b048'));
  segment(P,[0,ty+.018,tz-.002],[0,ty+.03,tz-.006],.004,.004,rgb('#a88a3a'),5);
 }
 // a ruff of tufts round the base of the neck, swept back
 if(L.ruff){
  const k=L.ruff;
  for(let i=0;i<14;i++){
   const a=(i/14)*Math.PI*2,cx=Math.sin(a),cy=Math.cos(a),r=.068*bw;
   if(cy<-.7)continue;// not under the throat
   const base=[cx*r,L.Y+.12+cy*r*.9,.25-.015*Math.abs(cx)];
   spike(P,base,[cx*.7,cy*.45,-1],.03*k,(.075+.02*hash(i))*k,paint,5);
  }
 }
 // hackles: a raised crest of coarse tufts along the spine
 if(L.hackles)for(let i=0;i<9;i++){
  const z=.2-i*.045,top=L.Y+.095+.012*(z/.3)-.004;
  spike(P,[(i%2?.008:-.008),top,z],[(i%2?.25:-.25),1,-.7],.016,.045+.015*hash(i+4),(x,y,zz)=>mix(C.saddle,L.fire?C.ember:C.coat,smooth((y-top-.02)/.02)),4);
 }
 return P.merge();
}

// Head, in head space: the origin is the neck pivot.
function buildHead(L,C){
 const P=pieces(),sn=L.snout,tilt=.08;
 const tipY=-.012-Math.sin(tilt)*sn,tipZ=.08+Math.cos(tilt)*sn;
 const inner=rgb(L.fire?'#6a1a0a':'#c89088'),lip=rgb('#141010'),tooth=rgb('#eee6d0'),earBack=L.earBack?rgb(L.earBack):C.saddle;
 const paint=(x,y,z)=>{
  let c=mix(C.coat,C.saddle,smooth((y-.05)/.05)*(L.pattern==='fox'?.25:.45));
  c=fur(L,C,c,x,y,z);
  const ax=Math.abs(x);
  // pale under the jaw and on the lower cheeks; the fox's white runs up the side of the muzzle
  const under=smooth((-.03-y)/.02);
  const cheek=L.pattern==='fox'?smooth((-.004-y)/.02)*smooth((ax-.02)/.02):0;
  c=mix(c,C.belly,Math.max(under,cheek));
  if(L.mask){for(const s of [-1,1]){if(Math.hypot(x-s*.05,y+.0,z-.07)<.03)c=mix(c,C.belly,.65);if(Math.hypot(x-s*.03,y-.06,z-.1)<.014)c=mix(c,C.belly,.7);}}
  // a darker bridge down the muzzle, or the shepherd's black muzzle
  if(z>.1&&y>tipY+.01&&ax<.02)c=mix(c,C.saddle,.35);
  if(L.muzzle)c=mix(c,rgb(L.muzzle),smooth((z-.1)/.04)*.85);
  // the terrier's tan patch over one eye
  if(L.eyePatch&&Math.hypot(x-.045,y-.035,(z-.1)*.8)<.042)c=mix(c,C.mark,.9);
  return c;
 };
 // skull, brow stop and cheeks
 P.add(new THREE.SphereGeometry(.085,22,16),at(0,.03,.04,[0,0,0],[1,.9,1.1]),paint);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.03,10,8),at(s*.028,.05,.1,[0,0,0],[1,.6,1]),paint);
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.045,12,10),at(s*.042,-.004,.07,[0,0,0],[.9,.85,1.1]),paint);
 // muzzle, lower jaw, lip line, nose leather and the fangs
 const mz=(z0,z1,y0,r0,r1,t,flat,colour)=>{
  const len=z1-z0,c=[0,y0-Math.sin(t)*len/2,z0+Math.cos(t)*len/2];
  P.add(new THREE.CylinderGeometry(r1,r0,len,16,3),at(...c,[Math.PI/2+t,0,0],[1,1,flat]),colour);
  P.add(new THREE.SphereGeometry(r1,12,8),at(0,y0-Math.sin(t)*len,z0+Math.cos(t)*len,[0,0,0],[1,flat,1]),colour);
 };
 mz(.08,.08+sn,-.012,.046,.023,tilt,.78,paint);
 mz(.075,.07+sn*.86,-.042,.03,.014,tilt+.06,.7,(x,y,z)=>mix(paint(x,y,z),C.belly,.5));
 for(const s of [-1,1])segment(P,[s*.03,-.036,.1],[s*.016,tipY-.024,tipZ-.022],.004,.003,lip,4);
 P.add(new THREE.SphereGeometry(.02,12,8),at(0,tipY+.006,tipZ+.008,[0,0,0],[1.2,.85,.9]),rgb('#141212'));
 if(L.pet){
  // a pink tongue lolling out of the side of the mouth
  P.add(new THREE.SphereGeometry(1,12,8),at(.012,tipY-.058,tipZ-.05,[.35,0,.15],[.02,.036,.008]),rgb('#d9707e'));
 }else{
  const f=L.fangs||1;
  for(const s of [-1,1])spike(P,[s*.014,tipY-.022,tipZ-.03],[0,-1,.15],.0045*f,.018*f,tooth,5);
 }
 // eyes' pupils (the eyes are their own mesh)
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.009,8,6),at(s*.042,.031,.126,[0,0,0],[1,1,.5]),rgb('#060505'));
 // tall pointed ears
 for(const s of [-1,1]){
  const e=L.ears,earFur=L.mark?C.mark:mix(C.coat,C.saddle,.3);
  if(L.earStyle==='floppy'){
   // a soft flap hanging down beside the skull
   P.add(new THREE.SphereGeometry(.055,14,10),at(s*.083,.02,.02,[.1,0,s*.3],[.35,e*9,.8]),earFur);
   continue;
  }
  if(L.earStyle==='folded'){
   // a short base on top of the skull, the tip folded forward and down
   P.add(new THREE.SphereGeometry(.03,10,8),at(s*.062,.085,0,[0,0,0],[1,.7,.9]),earFur);
   P.add(new THREE.ConeGeometry(.042,e*.75,4),at(s*.07,.078,.036,[1.95,0,-s*.25],[1,1,.35]),earFur);
   continue;
  }
  const ex=s*.048,ey=.09+e*.42,ez=-.005,rot=[-.18,0,-s*.3];
  P.add(new THREE.ConeGeometry(.042,e,4),at(ex,ey,ez,rot,[1,1,.42]),(x,y,z)=>z<ez-.002?mix(earBack,C.coat,L.earBack?0:.4):mix(C.coat,C.saddle,smooth((y-ey-e*.25)/.04)*.5));
  P.add(new THREE.ConeGeometry(.028,e*.74,4),at(ex,ey-e*.08,ez+.008,rot,[1,1,.3]),mix(C.belly,inner,.45));
 }
 return P.merge();
}

function buildEyes(){
 const P=pieces();
 for(const s of [-1,1])P.add(new THREE.SphereGeometry(.016,10,8),at(s*.042,.03,.116,[0,0,0],[1,.8,.8]),[1,1,1]);
 return P.merge();
}

// a paw at (0,fy,z0): a padded pad, four toes and dark claws
function paw(P,fy,z0,k,colour){
 const claw=rgb('#141110');
 P.add(new THREE.SphereGeometry(.03*k,14,8),at(0,fy+.016,z0,[0,0,0],[1,.5,1.3]),colour);
 for(const [tx,tz] of [[-.02,.03],[-.007,.038],[.007,.038],[.02,.03]]){
  P.add(new THREE.SphereGeometry(.011*k,6,4),at(tx*k,fy+.011,z0+tz*k,[0,0,0],[1,.85,1.1]),colour);
  spike(P,[tx*k,fy+.008,z0+(tz+.008)*k],[0,-.35,1],.0038*k,.012*k,claw,4);
 }
}

// One right-hand leg, hip or shoulder at the origin, the floor at y=-top.
function buildLeg(L,C,fore){
 const P=pieces(),k=L.heavy||1,[px,py,pz]=fore?L.shoulder:L.hip,fy=-py,sockTop=fy+(L.legH||.3)*.5;
 const paint=(x,y,z)=>{
  let c=fur(L,C,mix(C.coat,C.saddle,smooth((y+.02)/.04)*.3),px+x,py+y,pz+z);
  if(x<-.006)c=mix(c,C.belly,.45);
  if(L.mask&&y<fy+.14)c=mix(c,C.belly,.35);
  if(L.socks&&y<sockTop)c=mix(c,rgb(L.socks),smooth((sockTop-y)/.03));
  return c;
 };
 const pad=L.socks?rgb(L.socks):L.pattern==='char'?C.saddle:mix(C.coat,C.belly,.3);
 if(fore){
  P.add(new THREE.SphereGeometry(.05*k,12,8),at(0,-.02,0,[0,0,0],[.65,1.2,1]),paint);
  segment(P,[0,.02,0],[0,-.12,-.03],.045*k,.03*k,paint,12);
  P.add(new THREE.SphereGeometry(.031*k,10,8),at(0,-.12,-.03),paint);
  segment(P,[0,-.12,-.03],[0,fy+.055,-.012],.027*k,.019*k,paint,10);
  P.add(new THREE.SphereGeometry(.02*k,10,6),at(0,fy+.055,-.012),paint);
  segment(P,[0,fy+.055,-.012],[0,fy+.02,.012],.019*k,.018*k,paint,10);
  paw(P,fy,.02,k,pad);
 }else{
  P.add(new THREE.SphereGeometry(.062*k,14,10),at(0,-.04,.005,[0,0,0],[.6,1.2,1.05]),paint);
  segment(P,[0,0,0],[0,-.13,.05],.05*k,.03*k,paint,12);
  P.add(new THREE.SphereGeometry(.03*k,10,8),at(0,-.13,.05),paint);
  segment(P,[0,-.13,.05],[0,fy+.11,-.055],.029*k,.019*k,paint,10);
  P.add(new THREE.SphereGeometry(.02*k,10,6),at(0,fy+.11,-.055),paint);
  segment(P,[0,fy+.11,-.055],[0,fy+.025,-.01],.018*k,.017*k,paint,10);
  paw(P,fy,.0,k,pad);
 }
 return P.merge();
}

const TAILS={
 droop:[[0,0,0],[0,-.02,-.08],[0,-.09,-.16],[0,-.19,-.21],[0,-.29,-.23]],
 brush:[[0,0,0],[0,-.03,-.09],[0,-.09,-.19],[0,-.15,-.28],[0,-.18,-.36]],
 up:[[0,0,0],[0,.07,-.05],[0,.15,-.08],[0,.22,-.06],[0,.26,-.01]],
 raised:[[0,0,0],[0,.03,-.08],[0,.0,-.17],[0,-.08,-.24],[0,-.18,-.27]],
};
function buildTail(L,C){
 const P=pieces(),s=L.tailLen||1,bush=L.bushy??.042,n=12;
 const curve=new THREE.CatmullRomCurve3(TAILS[L.tail||'droop'].map(([x,y,z])=>new THREE.Vector3(x*s,y*s,z*s)));
 const pts=Array.from({length:n+1},(_,i)=>curve.getPoint(i/n).toArray());
 const radii=pts.map((_,i)=>{const t=i/n;return .022+Math.sin(Math.min(1,t*1.12)*Math.PI*.92)*bush-(t>.85?(t-.85)/.15*.02:0);}).map(r=>Math.max(.01,r));
 const base=mix(C.coat,C.saddle,.4);
 const colour=j=>(x,y,z)=>{
  if(j>=n-3)return mix(fur(L,C,base,x,y,z),C.tip,j>=n-2?1:.6);
  let c=fur(L,C,base,x,y,z);
  if(y<pts[j][1]-radii[j]*.4)c=mix(c,C.belly,L.pattern==='fox'?.2:.35);
  return c;
 };
 chain(P,pts,radii,colour,10);
 P.add(new THREE.SphereGeometry(radii[n]*1.05,8,6),at(...pts[n]),C.tip);
 P.add(new THREE.SphereGeometry(radii[0]*1.1,8,6),at(0,0,0),base);
 // a few tufts sticking out of the brush
 for(let i=3;i<n;i+=2){
  const [x,y,z]=pts[i],t=curve.getTangent(i/n),side=i%4===1?1:-1;
  spike(P,[x+side*radii[i]*.6,y,z],[side*.7,-.3,t.z*.8],radii[i]*.35,radii[i]*.9,colour(i),4);
 }
 return {geo:P.merge(),pts};
}

function lookFor(name,colour){
 if(LOOKS[name])return LOOKS[name];
 const c=new THREE.Color(colour||LOOKS.jackal.coat);
 return {...LOOKS.jackal,coat:c.getStyle(),saddle:c.clone().multiplyScalar(.35).getStyle(),belly:c.clone().lerp(new THREE.Color('#ffffff'),.55).getStyle(),tip:c.clone().multiplyScalar(.25).getStyle()};
}

const cache=new Map();
function build(key,look){
 if(cache.has(key))return cache.get(key);
 const legH=look.legH||.3,Y=legH+.1,bw=look.heavy||1;
 const L={...look,legH,Y,neck:[0,Y+.2,.32],shoulder:[.068*bw,Y-.02,.17],hip:[.062*bw,Y+.01,-.2]};
 const C={coat:rgb(L.coat),saddle:rgb(L.saddle),belly:rgb(L.belly),tip:rgb(L.tip),ember:rgb(L.ember||'#ff5a14'),mark:L.mark?rgb(L.mark):null};
 const tail=buildTail(L,C);
 const S={L,tailPts:tail.pts,
  fur:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,metalness:0,...(L.fire?{emissive:'#4a0c02',emissiveIntensity:.5}:{})}),
  eye:new THREE.MeshStandardMaterial({color:L.eye,emissive:L.eye,emissiveIntensity:L.fire?3:L.glow||.15,roughness:.2}),
  body:buildBody(L,C),head:buildHead(L,C),eyes:buildEyes(),fore:buildLeg(L,C,true),hind:buildLeg(L,C,false),tail:tail.geo,
 };
 cache.set(key,S);return S;
}
function mesh(parent,geo,material,name){const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;m.userData.part=name;parent.add(m);return m;}

export function isCanine(name){return !!LOOKS[name];}

export function createCanine(name,colour){
 const look=lookFor(name,colour),S=build(LOOKS[name]?name:'d:'+look.coat,look),L=S.L;
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.scale.setScalar(L.scale);
 mesh(body,S.body,S.fur,'body');
 const head=new THREE.Group();head.position.set(...L.neck);body.add(head);
 mesh(head,S.head,S.fur,'head');mesh(head,S.eyes,S.eye,'eyes');
 const legs=[];
 for(const s of [-1,1])for(const fore of [false,true]){
  const [x,y,z]=fore?L.shoulder:L.hip,leg=new THREE.Group();
  leg.position.set(s*x,y,z);body.add(leg);
  const m=mesh(leg,fore?S.fore:S.hind,S.fur,fore?'foreleg':'hindleg');if(s<0)m.scale.x=-1;
  legs.push(leg);
 }
 const tail=new THREE.Group();tail.position.set(0,L.Y+.05,-.29);body.add(tail);
 mesh(tail,S.tail,S.fur,'tail');
 if(L.fire){
  // a mane of flame down the spine, flames behind the ears, a burning tail and flames licking
  // up round every paw
  [[.2,1],[.1,1.2],[0,1.15],[-.1,1],[-.2,.8]].forEach(([z,sc],i)=>hellfire(body,(i%2?.022:-.022),L.Y+.1+.012*(z/.3),z,sc,-.55,(i%2?-1:1)*.12));
  for(const x of [-.04,.04])hellfire(head,x,.1,-.045,.65,-.8,-x*4);
  const pts=S.tailPts,n=pts.length-1,mid=pts[Math.round(n*.55)];
  hellfire(tail,0,pts[n][1],pts[n][2],.85,.2);hellfire(tail,0,mid[1],mid[2],.6,-.3);
  for(const leg of legs)hellfire(leg,0,-leg.position.y+.005,.02,.45);
 }
 return {g,body,legs,tail,wings:[],quirk:L.pet?'dog':'canine',head};
}
