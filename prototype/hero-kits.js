// Class outfits for the hero. knight() in main.js builds one rig and exposes its parts: the Valkyrie's
// own suit of blackened plate (hero-valkyrie.js, shown only for her) and a plainer plate, cape and hair
// that the other kits restyle. A kit restyles that rig for a class: palette, which armour shows, the hair, and what is
// added (a robe or tunic with sleeves, a hat or hood, a beard). The live game calls dressHero() with
// the role and gender the engine reports (frame.player), so the model follows the character.
//
// Adding a class look: edit its entry in KITS (palette, outfit, hat, hair). Use the shared builders;
// a new builder is for a shape no other class has. Look at it with tools/kit-shots.mjs.
import * as THREE from 'three';

const cloth=(color,o={})=>new THREE.MeshStandardMaterial({color,roughness:.92,metalness:0,side:THREE.DoubleSide,...o});
const trimMat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.45});
const ring=(r,tube,material,parent,x,y,z,sx=1,sz=1,tilt=Math.PI/2)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(r,tube,8,28),material);m.position.set(x,y,z);m.rotation.x=tilt;m.scale.set(sx,sz,1);parent.add(m);return m;};

// Everything the Valkyrie kit is: the colours knight() was built with, read from the rig the first time.
// Cloth hangs in folds: ripple the radius around the garment, more towards the hem, so it is not a smooth cone.
function fold(geo,count=7,amp=.03,hemY=.07){
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(x,z),k=1+amp*Math.sin(a*count+y*2.2)*Math.max(0,1.15-y)*(.5+.5*Math.cos(a*3));
    p.setXYZ(i,x*k,y,z*k);
  }
  geo.computeVertexNormals();return geo;
}
const BASE_KEYS=['armor','armorLight','leather','accent','boots','capeCloth','hairDark','hairMid','hairLight'];

export const KITS={
  // Her own suit (hero-valkyrie.js): the winged closed helm, crimson hair, riveted plate over mail.
  Valkyrie:{show:{valkyrie:true,face:false,chest:false,pauldrons:false,tassets:false,mantles:false,cape:false,legGear:false},hair:'helmed',own:true},
  Knight:{
    palette:{armor:'#6f7f86',armorLight:'#c4d0d2',leather:'#3d2c24',accent:'#b8b3a2',boots:'#1b2224',capeCloth:'#7b2a28',hair:['#3a2a20','#5a4030','#7a5a42']},
    outfit:{kind:'tabard',color:'#8a2a28',trim:'#c9b27a',emblem:'#e6e2d6'},hair:{male:'short',female:'tied'},
  },
  Samurai:{
    palette:{armor:'#7a2a22',armorLight:'#b8473a',leather:'#1f1a18',accent:'#c9a24a',boots:'#17191a',capeCloth:'#22201f',hair:['#141414','#232020','#34302e']},
    show:{cape:false,mantles:false},hat:'kabuto',hair:{male:'topknot',female:'topknot'},
  },
  Barbarian:{
    palette:{armor:'#5a4a3c',armorLight:'#8a7664',leather:'#4a3626',accent:'#9a8a6a',boots:'#2a2018',capeCloth:'#4b3a2c',hair:['#5a4426','#7a5e36','#a07e4c']},
    show:{chest:false,pauldrons:false,tassets:false},outfit:{kind:'tunic',color:'#5b4636',trim:'#a89478',length:.36,sleeves:false,fur:true},hat:'horned',hair:{male:'wild',female:'wild'},
  },
  Caveman:{
    // Just a loincloth: bare skin (the arm cylinders take the skin colour, a skin torso stands in
    // for the hidden plate), a ragged fur wrap at the hips, a hide strap across the chest and a
    // bone on a thong at the neck. Wild hair.
    palette:{armor:'#c48f6e',armorLight:'#d4a081',leather:'#4b3a26',accent:'#a89870',boots:'#3a2c1e',capeCloth:'#6a5438',hair:['#2c2018','#43301f','#5c4430']},
    show:{chest:false,pauldrons:false,tassets:false,cape:false,mantles:false},
    outfit:{kind:'loincloth',color:'#6a5034',trim:'#4a3622',skin:'#c48f6e'},matte:true,
    props:['boneThong'],hair:{male:'wild',female:'wild'},
  },
  Convict:{
    // Bald, in prison stripes: the Valkyrie rig under a striped tunic (grey bands round the body
    // and the sleeves), one iron shackle on the wrist with a snapped chain.
    palette:{armor:'#6b6a63',armorLight:'#8a897f',leather:'#3c3a35',accent:'#7a786e',boots:'#26241f',capeCloth:'#55534c',hair:['#222','#2e2e2e','#444']},
    show:{chest:false,pauldrons:false,tassets:false,cape:false,mantles:false},
    outfit:{kind:'tunic',color:'#8e8c84',trim:'#3c3a35',length:.42,sleeves:true,sleeveWide:.075,stripes:'#2e2d2a'},
    props:['shackle'],hair:{male:'bald',female:'bald'},
  },
  Archeologist:{
    // A field worker, not a khaki blob: a worn open leather jacket with scuffed elbows over a dusty
    // khaki shirt, dust on the hem and the knees, a fedora with a sweat-dark band and a bent brim.
    // The bullwhip coiled on the belt, the canvas field bag and the touchstone pouch name the class.
    palette:{armor:'#8a7a52',armorLight:'#b0a074',leather:'#4a3626',accent:'#8a6a3a',boots:'#3a2c1e',capeCloth:'#6f6240',hair:['#3a2a1c','#52402c','#6a5238']},
    show:{chest:false,pauldrons:false,tassets:false,cape:false,mantles:false},
    outfit:{kind:'tunic',color:'#9c8a5e',trim:'#5a4a30',length:.4,sleeves:true,sleeveWide:.078,jacket:{color:'#4a3626',collar:'#352417',scuff:'#7a6244'},dust:'#c2b088'},
    props:['whipCoil','fieldBag','touchstonePouch'],hat:'fedora',hair:{male:'short',female:'tied'},
  },
  Tourist:{
    // The one loud thing in the dungeon: a burnt-red shirt with a bone-and-ochre flower print, worn
    // untucked on one side and sweated through at the collar, under an aged straw hat with a frayed
    // brim. The expensive camera on its strap, the fat money pouch, the darts and the map tube say
    // "tourist" from across the room; none of it is pastel.
    palette:{armor:'#8f3a22',armorLight:'#b8603a',leather:'#5a3e26',accent:'#c9a24a',boots:'#4a3a2a',capeCloth:'#8f3a22',hair:['#4a3626','#6a4e34','#8a6a48']},
    show:{chest:false,pauldrons:false,tassets:false,cape:false,mantles:false},
    outfit:{kind:'tunic',color:'#8f3a22',trim:'#3a1a12',length:.46,sleeves:true,sleeveWide:.09,flowers:{petal:'#e6dcc0',heart:'#d9a441',leaf:'#2f4a3a'},sweat:'#5e2516',flap:true},
    props:['camera','moneyPouch','dartSheath','mapTube'],hat:'straw',hair:{male:'short',female:'short'},
  },
  Rogue:{
    // Black tunic and pants under the hood; a dagger sheath strapped to the right thigh and a
    // lockpick roll at the belt say "rogue".
    palette:{armor:'#1e1e22',armorLight:'#3a3a42',leather:'#26221e',accent:'#6a5a3a',boots:'#121212',capeCloth:'#1e1e22',hair:['#1a1a1a','#2a2a2a','#3c3c3c']},
    show:{chest:false,pauldrons:false,tassets:false,mantles:false},
    outfit:{kind:'tunic',color:'#232326',trim:'#3a332a',length:.4,sleeves:true,sleeveWide:.07},
    props:['thighSheath','lockpickRoll'],hat:'hood',hair:{male:'short',female:'short'},
  },
  Ranger:{
    // Green tunic and pants under the hood; a quiver of arrows on the back and a leather bracer on
    // the bow arm say "ranger".
    palette:{armor:'#2f4a2c',armorLight:'#4d6a46',leather:'#4a3626',accent:'#8a7a4a',boots:'#2a2216',capeCloth:'#3a5236',hair:['#3a2c1c','#52402a','#6a5436']},
    show:{chest:false,pauldrons:false,tassets:false,mantles:false},
    outfit:{kind:'tunic',color:'#3f5a3a',trim:'#5a4a30',length:.42,sleeves:true,sleeveWide:.07},
    props:['quiver','bracer'],hat:'hood',hair:{male:'short',female:'tied'},
  },
  Healer:{
    // Bone linen gone grey in the dungeon, not mint (the scene light is teal, so the cloth is warm to
    // read as cloth): a dirty hem, a stained apron front, blood at the rolled cuffs, an oxblood sash.
    // The stethoscope round the neck, the satchel on the hip and the scalpel at the belt say "healer"
    // before the head mirror does.
    palette:{armor:'#b8a276',armorLight:'#d0bc92',leather:'#4a3a2c',accent:'#8a6a3a',boots:'#3a2e22',capeCloth:'#ad9c7a',hair:['#4a3a2c','#68523c','#866c4c']},
    show:{chest:false,pauldrons:false,tassets:false,cape:false,mantles:false},
    outfit:{kind:'robe',color:'#c4ad7e',trim:'#5a1e1a',length:1,sleeves:true,sleeveWide:.078,sash:'#5a1e1a',hem:'#4a4034',apron:{color:'#8c8066',stains:'#4a1512'},cuffStains:'#4a1512'},
    props:['stethoscope','satchel','scalpelSheath','bandageRoll'],hat:'mirror',hair:{male:'short',female:'tied'},
  },
  Monk:{
    // Brown robes, easy: a plain dark-brown robe with a lighter hood-cloth collar, a knotted rope
    // belt with its ends hanging, wrapped forearms, bald.
    palette:{armor:'#5a4330',armorLight:'#7a5e44',leather:'#3a2c20',accent:'#8a6a3a',boots:'#2c2218',capeCloth:'#5a4330',hair:['#222','#333','#444']},
    show:{chest:false,pauldrons:false,tassets:false,cape:false,mantles:false},
    outfit:{kind:'robe',color:'#5e4634',trim:'#3a2a1e',length:.7,sleeves:true,sleeveWide:.1,collar:'#7a6248'},
    props:['ropeBelt','wrappedForearms'],hair:{male:'bald',female:'bald'},
  },
  Priest:{
    // White robes: bone linen with a grey-dragged hem, a dark stole down the front, a holy symbol on
    // a cord at the chest and a loop of prayer beads at the belt.
    palette:{armor:'#cfc8b4',armorLight:'#e4ded0',leather:'#3a2c20',accent:'#c8a45a',boots:'#17171a',capeCloth:'#cfc8b4',hair:['#3a3a3c','#585860','#80808a']},
    show:{chest:false,pauldrons:false,tassets:false,cape:false,mantles:false},
    outfit:{kind:'robe',color:'#d8d2c0',trim:'#8a7f66',length:1,sleeves:true,sleeveWide:.1,sash:'#5a4a30',collar:'#ece8dc',hem:'#8a8474',stole:'#3a2a40'},
    props:['holySymbol','prayerBeads'],hair:{male:'short',female:'tied'},
  },
  Wizard:{
    // The hat stays; the costume stars go. A deep-blue robe with a few embroidered marks round the
    // hem, a spellbook on a strap at the hip, and the long hair and beard.
    palette:{armor:'#262f58',armorLight:'#4a5a90',leather:'#3a2c20',accent:'#d8c27a',boots:'#201a14',capeCloth:'#262f58',hair:['#8a8a84','#b4b3aa','#d8d6cc']},
    show:{chest:false,pauldrons:false,tassets:false,cape:false,mantles:false},
    outfit:{kind:'robe',color:'#262f58',trim:'#9fb4c8',length:1,sleeves:true,sleeveWide:.13,sash:'#8a2f2a',marks:'#d8c27a'},
    props:['spellbook'],hat:'wizard',hair:{male:'long',female:'long'},beard:{male:'#c9c7bd'},
  },
};
export const KIT_ROLES=Object.keys(KITS);
// What each class starts the game holding, for the kit sheet (tools/kit-shots.mjs); the live game
// holds whatever the frame says.
export const KIT_WEAPONS={Valkyrie:'long sword',Knight:'long sword',Samurai:'katana',Barbarian:'two-handed sword',Caveman:'club',Convict:'rubber hose',Archeologist:'pick-axe',Tourist:'dart',Rogue:'short sword',Ranger:'dagger',Healer:'scalpel',Monk:null,Priest:'mace',Wizard:'quarterstaff'};

const SHOW_DEFAULT={chest:true,belt:true,pauldrons:true,tassets:true,mantles:true,cape:true,legGear:true,face:true,valkyrie:false};
// The rig's own finish is the Valkyrie's (soft-polished blackened steel, plated gloves); every other
// class keeps the brighter polish and leather gloves the rig had before her suit (\`own\` in a kit keeps hers).
const LEATHER_GLOVE={color:'#7a5238',emissive:'#2a160c',metalness:0,roughness:.85};
const CLASSIC_FINISH={armor:{metalness:.82,roughness:.26},armorLight:{metalness:.76,roughness:.22}};

// ---- builders: each adds meshes to a parent and returns nothing; dressHero tracks what to remove.

function robe(add,parts,o){
  const m=cloth(o.color),t=trimMat(o.trim),len=o.length??1;
  // ...rising to real shoulders at y .93: the arms hang at x ±.3, and the sleeves join the yoke.
  const full=[[.265,.07],[.245,.2],[.2,.4],[.16,.56],[.14,.66],[.152,.8],[.25,.88],[.305,.93],[.27,.99],[.17,1.03],[.118,1.07]];
  const hemY=.07+(1-len)*.62;                                  // shorter garments start higher
  const prof=full.filter(([,y])=>y>hemY+.01);prof.unshift([hemY<.07?.265:.2+len*.065,hemY]);
  const body=new THREE.Mesh(fold(new THREE.LatheGeometry(prof.map(([r,y])=>new THREE.Vector2(r,y)),42,0,Math.PI*2),7,.035),m);body.scale.z=.8;add(parts.body,body);
  ring(prof[0][0],.014,t,parts.body,0,hemY+.012,0,1,.8);                // hem
  if(o.hem){ // the lowest hand of the robe has dragged through the dungeon: a darker band, ragged at the top
    const dirt=cloth(o.hem,{polygonOffset:true,polygonOffsetFactor:-1});
    const band=new THREE.Mesh(fold(new THREE.LatheGeometry([new THREE.Vector2(prof[0][0]+.004,hemY),new THREE.Vector2(prof[0][0]-.004,hemY+.09),new THREE.Vector2(prof[1][0]+.002,hemY+.15)],42,0,Math.PI*2),9,.03),dirt);band.scale.z=.8;add(parts.body,band);
  }
  if(o.apron){ // a bib apron tied at the sash, narrower at the chest, spattered and streaked where the work lands
    const a=cloth(o.apron.color,{polygonOffset:true,polygonOffsetFactor:-2});
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(.23,.5,2,8),a);panel.position.set(.01,.42,.2);panel.rotation.x=-.08;panel.rotation.z=.03;add(parts.body,panel);
    const pos=panel.geometry.attributes.position;for(let i=0;i<pos.count;i++){const y=pos.getY(i),k=1-Math.max(0,y+.05)*.9;pos.setX(i,pos.getX(i)*k);pos.setZ(i,pos.getZ(i)+Math.sin(y*14+pos.getX(i)*9)*.008);}pos.needsUpdate=true;panel.geometry.computeVertexNormals();
    const st=cloth(o.apron.stains||'#4a1512',{polygonOffset:true,polygonOffsetFactor:-3});
    for(const [x,y,r,sx,sy,rot] of [[-.04,.5,.026,1.6,.8,.5],[.05,.33,.036,1.3,1,-.3],[-.06,.3,.018,.9,1.3,.2],[.02,.21,.014,1,1,0]]){const d=new THREE.Mesh(new THREE.CircleGeometry(r,9),st);d.position.set(x,y,.214);d.scale.set(sx,sy,1);d.rotation.z=rot;add(parts.body,d);}
    const drip=new THREE.Mesh(new THREE.PlaneGeometry(.012,.09),st);drip.position.set(.04,.27,.214);drip.rotation.z=.06;add(parts.body,drip);
  }
  if(o.stole){ // a stole over the shoulders, two strips down the front, a brass cross on each end
    const st=cloth(o.stole,{polygonOffset:true,polygonOffsetFactor:-2});for(const side of [-1,1]){const strip=new THREE.Mesh(new THREE.BoxGeometry(.055,.62,.01),st);strip.position.set(side*.075,.68,.21);strip.rotation.x=.14;strip.rotation.z=side*.03;add(parts.body,strip);const top=new THREE.Mesh(new THREE.BoxGeometry(.055,.16,.01),st);top.position.set(side*.1,.99,.2);top.rotation.x=-.5;add(parts.body,top);const cross=new THREE.Mesh(new THREE.BoxGeometry(.03,.03,.012),trimMat('#c8a45a'));cross.position.set(side*.075,.5,.218);add(parts.body,cross);}}
  if(o.marks){ // a band of embroidered marks round the hem: short strokes and rings in thread
    const th=trimMat(o.marks);for(let i=0;i<10;i++){const a=i/10*Math.PI*2+.15,r=prof[0][0]+.004,x=Math.sin(a)*r,z=Math.cos(a)*r*.8,m2=new THREE.Mesh(i%3?new THREE.BoxGeometry(.006,.05,.004):new THREE.TorusGeometry(.016,.004,4,10),th);m2.position.set(x,hemY+.19,z);m2.lookAt(x*3,hemY+.19,z*3);m2.rotation.z+=(i%2?.5:-.3);add(parts.body,m2);}
  }
  sleeves(add,parts,o,m,t);
}

// Just a loincloth: a bare torso of skin (the rig has no body under the plate), a ragged fur wrap
// at the hips and a hide strap across the chest.
function loincloth(add,parts,o){
  const skin=cloth(o.skin||'#c48f6e',{roughness:.8}),fur=cloth(o.color,{roughness:1}),hide=cloth(o.trim,{roughness:.9});
  const torso=new THREE.Mesh(new THREE.LatheGeometry([[.15,.58],[.17,.66],[.165,.8],[.24,.88],[.3,.93],[.26,.99],[.165,1.03],[.118,1.07]].map(([r,y])=>new THREE.Vector2(r,y)),28),skin);torso.scale.z=.78;add(parts.body,torso);
  const wrap=new THREE.Mesh(fold(new THREE.LatheGeometry([[.2,.36],[.21,.46],[.2,.56],[.19,.64]].map(([r,y])=>new THREE.Vector2(r,y)),28),8,.04),fur);wrap.scale.z=.82;add(parts.body,wrap);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,c=new THREE.Mesh(new THREE.ConeGeometry(.03,.08+((i*5)%4)*.015,5),fur);c.position.set(Math.sin(a)*.2,.33,Math.cos(a)*.2*.82);c.rotation.x=Math.PI;add(parts.body,c);}
  ring(.2,.02,hide,parts.body,0,.62,0,1,.82);
  const strap=new THREE.Mesh(new THREE.BoxGeometry(.05,.66,.012),hide);strap.position.set(.03,.8,.2);strap.rotation.z=.6;strap.rotation.x=-.12;add(parts.body,strap);
  const strapBack=new THREE.Mesh(new THREE.BoxGeometry(.05,.62,.012),hide);strapBack.position.set(.03,.8,-.17);strapBack.rotation.z=-.6;strapBack.rotation.x=.12;add(parts.body,strapBack);
}

// A tunic: shorter than a robe, over visible legs, with a belt.
function tunic(add,parts,o){
  const m=cloth(o.color),t=trimMat(o.trim),hemY=.62-(o.length??.4)*.62+.04;
  const prof=[[.205,hemY],[.19,hemY+.1],[.155,.58],[.14,.66],[.152,.8],[.25,.88],[.305,.93],[.27,.99],[.17,1.03],[.118,1.07]].filter(([,y],i)=>i===0||y>hemY+.1);
  const body=new THREE.Mesh(fold(new THREE.LatheGeometry(prof.map(([r,y])=>new THREE.Vector2(r,y)),36),6,.02),m);body.scale.z=.8;add(parts.body,body);
  if(o.fur){ // a ragged fur hem and shoulder line
    const fur=cloth(o.trim,{roughness:1});
    for(let i=0;i<14;i++){const a=i/14*Math.PI*2,c=new THREE.Mesh(new THREE.ConeGeometry(.034,.1+((i*7)%5)*.012,5),fur);c.position.set(Math.sin(a)*.205,hemY-.04,Math.cos(a)*.205*.8);c.rotation.x=Math.PI;add(parts.body,c);}
    ring(.125,.04,fur,parts.body,0,1.05,0,1,.9);
  }else ring(prof[0][0],.012,t,parts.body,0,hemY+.01,0,1,.8);
  ring(.15,.02,trimMat('#2a1e16'),parts.body,0,.62,0,1,.82);                 // belt
  if(o.flowers){ // a flower print round the whole shirt: five bone petals round an ochre heart, dark leaves between
    const fl=typeof o.flowers==='object'?o.flowers:{petal:'#e8d27a',heart:'#d9a441',leaf:'#2f6a58'};
    const petal=cloth(fl.petal,{polygonOffset:true,polygonOffsetFactor:-1}),heart=cloth(fl.heart,{polygonOffset:true,polygonOffsetFactor:-2}),leaf=cloth(fl.leaf,{polygonOffset:true,polygonOffsetFactor:-1});
    const at=(a,y)=>{const r=y>.9?.26:y>.8?.17:.195;return [Math.sin(a)*r,y,Math.cos(a)*r*.8];};
    for(let i=0;i<16;i++){const a=i/16*Math.PI*2+.3+(i%2)*.2,y=hemY+.07+((i*53)%41)/100,[x,yy,z]=at(a,y),g=new THREE.Group();g.position.set(x,yy,z);g.lookAt(x*2,yy,z*2);g.rotation.z+=i;add(parts.body,g);
      const big=i%3===0,pr=big?.02:.015;
      for(let k=0;k<5;k++){const pp=new THREE.Mesh(new THREE.CircleGeometry(pr,6),petal);const b=k/5*Math.PI*2;pp.position.set(Math.cos(b)*pr*1.3,Math.sin(b)*pr*1.3,.004);pp.scale.set(1,.8,1);g.add(pp);}
      const h=new THREE.Mesh(new THREE.CircleGeometry(pr*.75,6),heart);h.position.z=.006;g.add(h);
      const lf=new THREE.Mesh(new THREE.CircleGeometry(.02,5),leaf);lf.position.set(pr*2.4,-pr*1.4,.003);lf.scale.set(1.7,.6,1);lf.rotation.z=.6;g.add(lf);}
  }
  if(o.sweat){ // sweated through at the collar and under the arms
    const sw=cloth(o.sweat,{polygonOffset:true,polygonOffsetFactor:-2});
    for(const [x,y,z,sx,sy] of [[0,.96,.172,1.5,1.3],[-.21,.85,.08,.8,1.5],[.21,.85,.08,.8,1.5]]){const d=new THREE.Mesh(new THREE.CircleGeometry(.03,12),sw);d.position.set(x,y,z);d.scale.set(sx,sy,1);d.lookAt(x*3,y,z*3+(x?0:.5));add(parts.body,d);}
  }
  if(o.jacket){ // an open leather jacket over the shirt: two front panels hanging apart, a back, a turned collar, scuffed elbows
    const j=cloth(o.jacket.color,{roughness:.8}),c=cloth(o.jacket.collar||o.jacket.color,{roughness:.85}),sc=cloth(o.jacket.scuff||'#7a6244',{roughness:1,polygonOffset:true,polygonOffsetFactor:-1});
    // the shirt's yoke reaches z .24 at the shoulders, so the panels and lapels sit outside it and lean in toward the hem
    for(const side of [-1,1]){const panel=new THREE.Mesh(new THREE.BoxGeometry(.11,.36,.016),j);panel.position.set(side*.13,.74,.225);panel.rotation.x=.22;panel.rotation.y=side*.3;panel.rotation.z=side*.04;add(parts.body,panel);
      const lapel=new THREE.Mesh(new THREE.BoxGeometry(.07,.13,.02),c);lapel.position.set(side*.085,.95,.27);lapel.rotation.x=.2;lapel.rotation.z=side*.55;lapel.rotation.y=side*.25;add(parts.body,lapel);}
    const back=new THREE.Mesh(new THREE.CylinderGeometry(.32,.21,.42,20,1,true,Math.PI*.58,Math.PI*.84),j);back.position.set(0,.8,0);back.scale.z=.8;add(parts.body,back);
    const collar=new THREE.Mesh(new THREE.TorusGeometry(.13,.022,6,18,Math.PI*1.3),c);collar.position.set(0,1.06,-.02);collar.rotation.x=Math.PI/2;collar.rotation.z=Math.PI*.35;add(parts.body,collar);
    for(const [arm,elbow] of [[parts.arm,parts.elbow],[parts.shieldArm,parts.shieldElbow]]){
      const upper=new THREE.Mesh(new THREE.CylinderGeometry(.078,.088,.26,14,1,true),j);upper.position.set(0,-.12,0);add(arm,upper);
      const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.086,.09,.1,14,1,true),j);cuff.position.set(0,-.03,0);add(elbow,cuff);
      const patch=new THREE.Mesh(new THREE.CircleGeometry(.03,8),sc);patch.position.set(0,-.01,-.09);patch.rotation.y=Math.PI;patch.scale.set(1,1.4,1);add(elbow,patch);
    }
  }
  if(o.dust){ // dust from the dig on the hem and the knees
    const d=cloth(o.dust,{polygonOffset:true,polygonOffsetFactor:-2});
    for(let i=0;i<7;i++){const a=i/7*Math.PI*1.4-.7,r=prof[0][0]+.004,m2=new THREE.Mesh(new THREE.CircleGeometry(.022+(i%2)*.01,7),d);m2.position.set(Math.sin(a)*r,hemY+.03+(i%3)*.015,Math.cos(a)*r*.8);m2.lookAt(Math.sin(a)*3,hemY,Math.cos(a)*3);m2.scale.set(1.4,.7,1);add(parts.body,m2);}
  }
  if(o.stripes){ // prison stripes: dark bands round the body, following the tunic's profile, and round the sleeves
    const st=cloth(o.stripes,{polygonOffset:true,polygonOffsetFactor:-1});
    const rAt=y=>{for(let i=1;i<prof.length;i++){const [r0,y0]=prof[i-1],[r1,y1]=prof[i];if(y<=y1)return r0+(r1-r0)*(y-y0)/(y1-y0);}return prof[prof.length-1][0];};
    for(let y=hemY+.06;y<1.0;y+=.085){const r=rAt(y)+.004,band=new THREE.Mesh(new THREE.CylinderGeometry(rAt(y+.02)+.004,r,.04,36,1,true),st);band.position.y=y;band.scale.z=.8;add(parts.body,band);}
    for(const [arm,elbow] of [[parts.arm,parts.elbow],[parts.shieldArm,parts.shieldElbow]]){
      for(const y of [-.07,-.17]){const b=new THREE.Mesh(new THREE.CylinderGeometry(.078+ (y+.07)*.04,.08+(y+.07)*.04,.03,16,1,true),st);b.position.y=y;add(arm,b);}
      for(const y of [-.05,-.15]){const b=new THREE.Mesh(new THREE.CylinderGeometry(.08-(y+.05)*.05,.082-(y+.05)*.05,.03,16,1,true),st);b.position.y=y;add(elbow,b);}
    }
  }
  if(o.flap){ // untucked on the left: a tail of shirt hangs below the belt
    const tail=new THREE.Mesh(new THREE.BoxGeometry(.11,.1,.012),m);tail.position.set(-.13,hemY-.04,.14);tail.rotation.z=.18;tail.rotation.y=.35;add(parts.body,tail);
  }
  sleeves(add,parts,o,m,t);
}

function sleeves(add,parts,o,m,t){
  if(!o.sleeves)return;
  const wide=Math.min(o.sleeveWide??.1,.115);
  for(const [arm,elbow] of [[parts.arm,parts.elbow],[parts.shieldArm,parts.shieldElbow]]){
    const cap=new THREE.Mesh(new THREE.SphereGeometry(.072,14,10),m);cap.position.set(0,.005,0);add(arm,cap);          // closed over the shoulder
    const upper=new THREE.Mesh(new THREE.CylinderGeometry(.07,.082,.27,16,1,true),m);upper.position.set(0,-.125,0);add(arm,upper);
    const lower=new THREE.Mesh(new THREE.CylinderGeometry(.08,wide,.25,16,1,true),m);lower.position.set(0,-.12,0);add(elbow,lower);
    ring(wide,.011,t,elbow,0,-.245,0,1,1);
    if(o.cuffStains){ // blood soaked up the cuff, more on the working hand
      const st=cloth(o.cuffStains,{polygonOffset:true,polygonOffsetFactor:-1}),n=arm===parts.arm?4:2;
      for(let i=0;i<n;i++){const a=i/n*Math.PI*2+.4,d=new THREE.Mesh(new THREE.CircleGeometry(.014+(i%2)*.008,6),st);d.position.set(Math.sin(a)*(wide+.002),-.225+(i%3)*.012,Math.cos(a)*(wide+.002));d.lookAt(d.position.clone().multiplyScalar(2));add(elbow,d);}
    }
  }
}

// A tabard over plate: a long panel front and back from the shoulders to the knees, with a cross.
function tabard(add,parts,o){
  const m=cloth(o.color),t=trimMat(o.trim);
  for(const [z,flip] of [[.152,1],[-.138,-1]]){
    const panel=new THREE.Mesh(new THREE.BoxGeometry(.3,.62,.012),m);panel.position.set(0,.69,z);panel.rotation.x=flip*-.04;add(parts.body,panel);
    const hem=new THREE.Mesh(new THREE.BoxGeometry(.3,.02,.016),t);hem.position.set(0,.38,z+flip*.002);add(parts.body,hem);
  }
  const v=new THREE.Mesh(new THREE.BoxGeometry(.036,.4,.016),trimMat(o.emblem||'#e6e2d6'));v.position.set(0,.76,.157);add(parts.body,v);
  const h=new THREE.Mesh(new THREE.BoxGeometry(.2,.036,.016),trimMat(o.emblem||'#e6e2d6'));h.position.set(0,.84,.157);add(parts.body,h);
  ring(.158,.02,trimMat('#2a1e16'),parts.body,0,.62,0,1,.86);
}

const HATS={
  wizard(add,parts,o){ // a wide brim and a tall cone that bends back at the tip
    const m=cloth(o.hatColor||o.color),t=trimMat(o.trim),g=new THREE.Group();g.position.set(0,.13,-.01);g.rotation.x=-.1;add(parts.head,g);
    const brim=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.02,30),m);brim.scale.z=.95;g.add(brim);
    const band=ring(.178,.014,trimMat('#8a2f2a'),g,0,.03,0,1,1);band.scale.set(1,1,1);
    let base=g,y=.01;const seg=[[.178,.125,.2,.0],[.125,.075,.18,.28],[.075,.03,.16,.42],[.03,0.002,.1,.5]];
    for(const [r0,r1,h,tilt] of seg){const pivot=new THREE.Group();pivot.position.set(0,y,0);pivot.rotation.x=-tilt*.5;base.add(pivot);const c=new THREE.Mesh(new THREE.CylinderGeometry(r1,r0,h,18),m);c.position.y=h/2;pivot.add(c);base=pivot;y=h-.005;}
    const patch=new THREE.Mesh(new THREE.CircleGeometry(.03,6),cloth('#1c2444',{polygonOffset:true,polygonOffsetFactor:-1}));patch.position.set(.05,.12,.17);patch.lookAt(.2,.12,.6);patch.scale.set(1.3,.8,1);g.add(patch); // a darker patch sewn on where the felt wore through
  },
  hood(add,parts,o){ // a cowl with the front left open for the face, and a drape on the shoulders
    const m=cloth(o.color),cap=new THREE.Mesh(new THREE.SphereGeometry(.235,22,14,Math.PI/2+.62,Math.PI*2-1.24,0,Math.PI*.66),m);cap.position.set(0,.02,-.012);cap.scale.set(1,1.04,1.08);add(parts.head,cap);
    const drape=new THREE.Mesh(new THREE.ConeGeometry(.3,.26,16,1,true),m);drape.position.set(0,-.2,-.03);drape.scale.z=.85;add(parts.head,drape);
  },
  straw(add,parts){ // aged straw, the brim frayed and bent, a dark band with its ends hanging at the side
    const m=cloth('#a8925a',{roughness:1}),worn=cloth('#7d6a3e',{roughness:1}),g=new THREE.Group();g.position.set(0,.14,0);g.rotation.z=-.08;g.rotation.x=.06;add(parts.head,g);
    const brim=new THREE.Mesh(new THREE.CylinderGeometry(.36,.35,.016,32),m);const pos=brim.geometry.attributes.position;
    for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),r=Math.hypot(x,z);if(r>.3){const a=Math.atan2(z,x);pos.setY(i,pos.getY(i)+Math.sin(a*5+1)*.012-Math.max(0,Math.cos(a-.4))*.03);const k=1-Math.max(0,Math.sin(a*9))*.04;pos.setX(i,x*k);pos.setZ(i,z*k);}}
    pos.needsUpdate=true;brim.geometry.computeVertexNormals();g.add(brim);
    const crown=new THREE.Mesh(new THREE.CylinderGeometry(.15,.17,.11,22),m);crown.position.y=.06;g.add(crown);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(.13,.15,.02,22),worn);top.position.y=.115;g.add(top);
    ring(.168,.016,trimMat('#3a2a1e'),g,0,.03,0,1,1);
    for(const [x,len] of [[.17,.07],[.19,.05]]){const end=new THREE.Mesh(new THREE.BoxGeometry(.018,len,.006),cloth('#3a2a1e'));end.position.set(x,.03-len/2,.05);end.rotation.z=.4;g.add(end);}
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2+.7;const fray=new THREE.Mesh(new THREE.CircleGeometry(.014,5),worn);fray.position.set(Math.cos(a)*.33,.0,Math.sin(a)*.33);fray.rotation.x=-Math.PI/2;fray.scale.set(1.8,.7,1);fray.rotation.z=a;g.add(fray);}
  },
  fedora(add,parts){ // a felt fedora the colour of dried mud, the brim bent down in front and nicked at one side, the band dark with sweat
    const m=cloth('#5a3e28',{roughness:.95}),dark=cloth('#3a2818',{roughness:1}),g=new THREE.Group();g.position.set(0,.12,0);g.rotation.z=.06;g.rotation.x=.08;add(parts.head,g);
    const brim=new THREE.Mesh(new THREE.CylinderGeometry(.28,.27,.014,30),m);brim.scale.z=1.05;const pos=brim.geometry.attributes.position;
    for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),r=Math.hypot(x,z);if(r>.2){const a=Math.atan2(z,x);pos.setY(i,pos.getY(i)-Math.max(0,Math.sin(a))*.045*(r-.2)/.08+Math.max(0,-Math.sin(a))*.02*(r-.2)/.08);if(Math.abs(a-2.4)<.25){pos.setX(i,x*.9);pos.setZ(i,z*.9);}}}
    pos.needsUpdate=true;brim.geometry.computeVertexNormals();g.add(brim);
    const crown=new THREE.Mesh(new THREE.CylinderGeometry(.14,.18,.15,22),m);crown.position.y=.075;g.add(crown);
    const dent=new THREE.Mesh(new THREE.BoxGeometry(.12,.03,.1),m);dent.position.set(0,.15,0);g.add(dent);
    const pinch=new THREE.Mesh(new THREE.BoxGeometry(.05,.08,.06),dark);pinch.position.set(0,.13,.12);g.add(pinch);
    ring(.178,.016,dark,g,0,.03,0,1,1);
    const sweat=new THREE.Mesh(new THREE.CylinderGeometry(.181,.182,.03,22,1,true),cloth('#2a1c10',{polygonOffset:true,polygonOffsetFactor:-1}));sweat.position.y=.055;g.add(sweat);},
  kabuto(add,parts){ // a lacquered dome tilted back off the brow, a flared neck guard, and a crescent crest
    const m=new THREE.MeshStandardMaterial({color:'#2a2220',roughness:.45,metalness:.6,side:THREE.DoubleSide}),r=new THREE.MeshStandardMaterial({color:'#9a2a22',roughness:.5,metalness:.4,side:THREE.DoubleSide}),g=new THREE.Group();g.position.set(0,.07,-.02);g.rotation.x=-.25;add(parts.head,g);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(.205,24,14,0,Math.PI*2,0,Math.PI*.42),m));
    for(let i=0;i<4;i++){const s=new THREE.Mesh(new THREE.CylinderGeometry(.18+i*.05,.2+i*.06,.045,26,1,true,Math.PI*.78,Math.PI*1.44),i%2?m:r);s.position.set(0,-.06-i*.045,-.01);g.add(s);}
    const crest=new THREE.Mesh(new THREE.TorusGeometry(.085,.011,6,18,Math.PI),trimMat('#c9a24a'));crest.position.set(0,.17,.1);crest.rotation.x=-.3;g.add(crest);},
  horned(add,parts){ // an iron cap with two horns, each three tapering segments curving up and out
    const iron=new THREE.MeshStandardMaterial({color:'#4a4640',roughness:.55,metalness:.7}),bone=cloth('#d9d0b8',{roughness:.8}),g=new THREE.Group();g.position.set(0,.06,-.01);add(parts.head,g);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(.2,22,12,0,Math.PI*2,0,Math.PI*.4),iron));ring(.19,.016,iron,g,0,0,0,1,1.02);
    for(const side of [-1,1]){
      let x=side*.175,y=.05;
      [[.45,.03,.022],[1.0,.024,.015],[1.4,.016,.006]].forEach(([angle,r0,r1],i)=>{
        const len=.085,phi=Math.PI/2-angle,dx=side*Math.sin(phi)*0+side*Math.cos(angle),dy=Math.sin(angle);
        const seg=new THREE.Mesh(new THREE.CylinderGeometry(r1,r0,len,8),bone);seg.rotation.z=-side*phi;seg.position.set(x+dx*len/2,y+dy*len/2,0);g.add(seg);
        x+=dx*len;y+=dy*len;
      });
    }
  },
  mirror(add,parts){ // a doctor's head mirror: a brass band and a polished disc over the brow, tipped up
    const band=new THREE.Mesh(new THREE.TorusGeometry(.2,.013,6,28),trimMat('#8a6a3a'));band.position.set(0,.1,0);band.rotation.x=Math.PI/2-.15;add(parts.head,band);
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(.058,.058,.012,20),new THREE.MeshStandardMaterial({color:'#eef3f4',metalness:.9,roughness:.1,emissive:'#9fb8bd',emissiveIntensity:.35}));disc.position.set(0,.16,.2);disc.rotation.x=Math.PI/2-.4;add(parts.head,disc);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.058,.007,6,20),trimMat('#8a6a3a'));rim.position.set(0,.16,.2);rim.rotation.x=-.4;add(parts.head,rim);},
};

// Props a class carries that name it from across the room. Each adds under the rig's body or head.
const PROPS={
  stethoscope(add,parts){ // a dark rubber loop round the neck, both tubes down the front to a brass chest-piece
    const rubber=cloth('#2a2420',{roughness:.7}),brass=trimMat('#b08a3c'),g=new THREE.Group();g.position.set(0,1.0,0);add(parts.body,g);
    const loop=new THREE.Mesh(new THREE.TorusGeometry(.132,.012,6,26,Math.PI*1.5),rubber);loop.rotation.x=Math.PI/2+.3;loop.rotation.z=Math.PI/2-.78;loop.position.set(0,.03,-.01);g.add(loop);
    for(const x of [-.045,.035]){const tube=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,.2,6),rubber);tube.position.set(x,-.085,.15);tube.rotation.z=-x*1.2;tube.rotation.x=.18;g.add(tube);}
    const y=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,.07,6),rubber);y.position.set(-.004,-.215,.185);y.rotation.x=.14;g.add(y);
    const piece=new THREE.Mesh(new THREE.CylinderGeometry(.032,.036,.018,14),brass);piece.position.set(-.004,-.26,.2);piece.rotation.x=Math.PI/2-.2;g.add(piece);
    const bell=new THREE.Mesh(new THREE.CylinderGeometry(.018,.032,.012,14),brass);bell.position.set(-.004,-.26,.188);bell.rotation.x=Math.PI/2-.2;g.add(bell);
  },
  satchel(add,parts){ // a worn leather bag on the left hip, its strap across the chest from the right shoulder
    const hide=cloth('#4a3626',{roughness:.85}),dark=cloth('#2e2016',{roughness:.9}),brass=trimMat('#8a6a3a');
    const strap=new THREE.Mesh(new THREE.BoxGeometry(.032,.62,.012),hide);strap.position.set(-.03,.78,.19);strap.rotation.z=-.56;strap.rotation.x=-.1;add(parts.body,strap);
    const strapBack=new THREE.Mesh(new THREE.BoxGeometry(.032,.6,.012),hide);strapBack.position.set(-.03,.78,-.17);strapBack.rotation.z=.56;strapBack.rotation.x=.1;add(parts.body,strapBack);
    const bag=new THREE.Group();bag.position.set(-.235,.5,.02);bag.rotation.z=.12;bag.rotation.y=.2;add(parts.body,bag);
    const body=new THREE.Mesh(new THREE.BoxGeometry(.075,.17,.19),hide);body.position.y=-.02;bag.add(body);
    const flap=new THREE.Mesh(new THREE.BoxGeometry(.085,.1,.2),dark);flap.position.set(-.006,.045,0);flap.rotation.z=-.06;bag.add(flap);
    const buckle=new THREE.Mesh(new THREE.BoxGeometry(.012,.03,.03),brass);buckle.position.set(-.05,.0,.02);bag.add(buckle);
    const scuff=new THREE.Mesh(new THREE.CircleGeometry(.024,6),cloth('#6a5238',{polygonOffset:true,polygonOffsetFactor:-1}));scuff.position.set(-.039,-.07,-.04);scuff.rotation.y=-Math.PI/2;scuff.scale.y=.6;bag.add(scuff);
  },
  scalpelSheath(add,parts){ // a slim leather sheath on the right of the belt, the steel handle showing
    const hide=cloth('#2e2016',{roughness:.9}),steel=new THREE.MeshStandardMaterial({color:'#c8d0d4',metalness:.85,roughness:.25});
    const sheath=new THREE.Mesh(new THREE.BoxGeometry(.028,.13,.04),hide);sheath.position.set(.2,.52,.1);sheath.rotation.z=-.2;sheath.rotation.y=.4;add(parts.body,sheath);
    const handle=new THREE.Mesh(new THREE.CylinderGeometry(.006,.008,.07,8),steel);handle.position.set(.215,.615,.115);handle.rotation.z=-.2;add(parts.body,handle);
  },
  camera(add,parts){ // an expensive camera on a leather strap round the neck, hanging to one side of the chest
    const strap=cloth('#3a2a1e',{roughness:.8}),black=cloth('#1c1a18',{roughness:.5}),brass=trimMat('#c9a24a'),glass=new THREE.MeshStandardMaterial({color:'#5a7a8a',metalness:.6,roughness:.15,emissive:'#2a4a5a',emissiveIntensity:.3});
    const loop=new THREE.Mesh(new THREE.TorusGeometry(.14,.009,6,24,Math.PI*1.4),strap);loop.rotation.x=Math.PI/2+.4;loop.rotation.z=Math.PI/2-.9;loop.position.set(0,1.03,-.005);add(parts.body,loop);
    for(const [x,z,rz] of [[-.06,.17,.25],[.07,.17,-.35]]){const t=new THREE.Mesh(new THREE.CylinderGeometry(.007,.007,.2,6),strap);t.position.set(x+.02,.92,z);t.rotation.z=rz;t.rotation.x=.2;add(parts.body,t);}
    const cam=new THREE.Group();cam.position.set(.07,.8,.2);cam.rotation.z=-.15;cam.rotation.x=.2;add(parts.body,cam);
    const body=new THREE.Mesh(new THREE.BoxGeometry(.13,.08,.05),black);cam.add(body);
    const plate=new THREE.Mesh(new THREE.BoxGeometry(.132,.026,.052),brass);plate.position.y=.03;cam.add(plate);
    const lens=new THREE.Mesh(new THREE.CylinderGeometry(.028,.03,.04,16),black);lens.rotation.x=Math.PI/2;lens.position.set(.01,-.004,.04);cam.add(lens);
    const lensRing=new THREE.Mesh(new THREE.TorusGeometry(.028,.005,6,16),brass);lensRing.position.set(.01,-.004,.058);cam.add(lensRing);
    const eye=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.006,16),glass);eye.rotation.x=Math.PI/2;eye.position.set(.01,-.004,.06);cam.add(eye);
    const knob=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.012,10),brass);knob.position.set(-.045,.05,0);cam.add(knob);
    const flash=new THREE.Mesh(new THREE.CylinderGeometry(.018,.012,.014,10),brass);flash.position.set(.045,.05,0);cam.add(flash);
  },
  moneyPouch(add,parts){ // a fat coin purse on the right of the belt, cinched with a cord, a coin showing at the mouth
    const hide=cloth('#5a3e26',{roughness:.9}),cord=cloth('#2a1e14',{roughness:.9}),gold=trimMat('#d9b14a'),g=new THREE.Group();g.position.set(.2,.55,.07);g.rotation.z=-.15;add(parts.body,g);
    const bag=new THREE.Mesh(new THREE.SphereGeometry(.052,12,10),hide);bag.scale.set(1,1.25,.85);bag.position.y=-.03;g.add(bag);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(.022,.034,.03,10),hide);neck.position.y=.045;g.add(neck);
    const tie=new THREE.Mesh(new THREE.TorusGeometry(.024,.006,5,12),cord);tie.position.y=.04;tie.rotation.x=Math.PI/2;g.add(tie);
    const coin=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.004,12),gold);coin.position.set(.004,.064,.004);coin.rotation.x=Math.PI/2-.4;g.add(coin);
    const hang=new THREE.Mesh(new THREE.BoxGeometry(.01,.05,.01),cord);hang.position.set(.0,.08,-.02);g.add(hang);
  },
  dartSheath(add,parts){ // a flat leather sheath on the left hip with a row of darts, flights showing
    const hide=cloth('#3a2a1e',{roughness:.9}),steel=new THREE.MeshStandardMaterial({color:'#b8c0c4',metalness:.8,roughness:.3}),flight=cloth('#c9a24a',{side:THREE.DoubleSide}),g=new THREE.Group();g.position.set(-.21,.5,-.02);g.rotation.y=-.5;g.rotation.z=.1;add(parts.body,g);
    const sheath=new THREE.Mesh(new THREE.BoxGeometry(.09,.1,.028),hide);g.add(sheath);
    for(let i=0;i<4;i++){const x=-.03+i*.02;const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.003,.004,.09,5),steel);shaft.position.set(x,.08,0);g.add(shaft);
      const f=new THREE.Mesh(new THREE.PlaneGeometry(.018,.026),flight);f.position.set(x,.115,0);f.rotation.y=i%2?.5:-.3;g.add(f);}
  },
  mapTube(add,parts){ // a leather map tube slung across the back on its own strap, a scroll end poking out
    const hide=cloth('#4a3626',{roughness:.85}),paper=cloth('#d6cdb8',{roughness:1}),g=new THREE.Group();g.position.set(.1,.72,-.2);g.rotation.z=.9;g.rotation.x=.1;add(parts.body,g);
    const tube=new THREE.Mesh(new THREE.CylinderGeometry(.028,.028,.42,12),hide);g.add(tube);
    for(const y of [-.17,.17]){const cap=new THREE.Mesh(new THREE.TorusGeometry(.03,.006,5,12),trimMat('#c9a24a'));cap.position.y=y;cap.rotation.x=Math.PI/2;g.add(cap);}
    const scroll=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.06,10),paper);scroll.position.y=.24;g.add(scroll);
    const strap=new THREE.Mesh(new THREE.BoxGeometry(.028,.5,.01),hide);strap.position.set(-.06,.85,-.16);strap.rotation.z=.5;strap.rotation.x=.15;add(parts.body,strap);
  },
  whipCoil(add,parts){ // a bullwhip coiled three times and hung from the right of the belt, the handle up, the fall hanging
    const hide=cloth('#3a2616',{roughness:.85}),dark=cloth('#241709',{roughness:.9}),g=new THREE.Group();g.position.set(.215,.5,.0);g.rotation.y=Math.PI/2;g.rotation.z=.15;add(parts.body,g);
    for(let i=0;i<3;i++){const c=new THREE.Mesh(new THREE.TorusGeometry(.055-i*.004,.009,6,18),i%2?hide:dark);c.position.set(0,-i*.012,i*.008);c.rotation.z=i*.4;g.add(c);}
    const handle=new THREE.Mesh(new THREE.CylinderGeometry(.011,.013,.1,8),dark);handle.position.set(.02,.07,0);handle.rotation.z=-.35;g.add(handle);
    const knot=new THREE.Mesh(new THREE.SphereGeometry(.014,8,6),hide);knot.position.set(.04,.11,0);g.add(knot);
    const fall=new THREE.Mesh(new THREE.CylinderGeometry(.004,.006,.14,6),hide);fall.position.set(-.03,-.1,.01);fall.rotation.z=.2;g.add(fall);
  },
  fieldBag(add,parts){ // a square canvas field bag on the left hip on a wide strap, a brass buckle, a trowel handle out of the flap
    const canvas=cloth('#8a7a52',{roughness:1}),worn=cloth('#6a5c3c',{roughness:1}),strap=cloth('#4a3626',{roughness:.85}),brass=trimMat('#8a6a3a'),wood=cloth('#5a3e28',{roughness:.9});
    const band=new THREE.Mesh(new THREE.BoxGeometry(.04,.64,.012),strap);band.position.set(-.02,.78,.19);band.rotation.z=-.58;band.rotation.x=-.1;add(parts.body,band);
    const bandBack=new THREE.Mesh(new THREE.BoxGeometry(.04,.62,.012),strap);bandBack.position.set(-.02,.78,-.17);bandBack.rotation.z=.58;bandBack.rotation.x=.1;add(parts.body,bandBack);
    const bag=new THREE.Group();bag.position.set(-.24,.48,.02);bag.rotation.z=.1;bag.rotation.y=.15;add(parts.body,bag);
    const body=new THREE.Mesh(new THREE.BoxGeometry(.09,.2,.2),canvas);bag.add(body);
    const flap=new THREE.Mesh(new THREE.BoxGeometry(.1,.09,.21),worn);flap.position.set(-.006,.07,0);bag.add(flap);
    const buckle=new THREE.Mesh(new THREE.BoxGeometry(.012,.034,.03),brass);buckle.position.set(-.056,.0,.0);bag.add(buckle);
    const trowel=new THREE.Mesh(new THREE.CylinderGeometry(.009,.011,.1,8),wood);trowel.position.set(0,.15,-.06);trowel.rotation.z=.2;bag.add(trowel);
    const stain=new THREE.Mesh(new THREE.CircleGeometry(.03,7),cloth('#5a4a2c',{polygonOffset:true,polygonOffsetFactor:-1}));stain.position.set(-.046,-.06,.05);stain.rotation.y=-Math.PI/2;stain.scale.set(1.3,.8,1);bag.add(stain);
  },
  touchstonePouch(add,parts){ // a small drawstring pouch at the back of the belt, the grey stone's edge at its mouth
    const hide=cloth('#4a3626',{roughness:.9}),cord=cloth('#241709'),stone=cloth('#5a5a58',{roughness:.6}),g=new THREE.Group();g.position.set(.12,.56,-.15);g.rotation.z=-.1;add(parts.body,g);
    const bag=new THREE.Mesh(new THREE.SphereGeometry(.036,10,8),hide);bag.scale.set(1,1.2,.8);g.add(bag);
    const tie=new THREE.Mesh(new THREE.TorusGeometry(.018,.005,5,10),cord);tie.position.y=.038;tie.rotation.x=Math.PI/2;g.add(tie);
    const s2=new THREE.Mesh(new THREE.BoxGeometry(.02,.012,.02),stone);s2.position.y=.05;s2.rotation.y=.4;g.add(s2);
  },
  shackle(add,parts){ // an iron shackle on the right wrist, three links of chain still hanging from it
    const iron=new THREE.MeshStandardMaterial({color:'#4a4640',roughness:.6,metalness:.7}),rust=cloth('#5a3a22',{roughness:1,polygonOffset:true,polygonOffsetFactor:-1});
    const cuff=new THREE.Mesh(new THREE.TorusGeometry(.055,.014,8,20),iron);cuff.position.set(0,-.23,0);cuff.rotation.x=Math.PI/2;add(parts.elbow,cuff);
    const spot=new THREE.Mesh(new THREE.CircleGeometry(.014,6),rust);spot.position.set(.05,-.225,.03);spot.rotation.y=Math.PI/2;add(parts.elbow,spot);
    for(let i=0;i<3;i++){const link=new THREE.Mesh(new THREE.TorusGeometry(.016,.005,6,12),iron);link.position.set(.06+i*.004,-.26-i*.03,0);link.rotation.y=i%2?Math.PI/2:0;link.rotation.z=.3;add(parts.elbow,link);}
  },
  ropeBelt(add,parts){ // a twisted rope round the waist, knotted at the front, both ends hanging
    const rope=cloth('#b8a06a',{roughness:1});
    const belt=new THREE.Mesh(new THREE.TorusGeometry(.152,.016,7,30),rope);belt.position.set(0,.6,0);belt.rotation.x=Math.PI/2;belt.scale.set(1,.82,1);add(parts.body,belt);
    const knot=new THREE.Mesh(new THREE.SphereGeometry(.03,8,6),rope);knot.position.set(.02,.6,.13);add(parts.body,knot);
    for(const [x,len,rz] of [[.0,.2,.1],[.045,.15,-.15]]){const end=new THREE.Mesh(new THREE.CylinderGeometry(.012,.014,len,7),rope);end.position.set(x,.6-len/2,.135);end.rotation.z=rz;end.rotation.x=.1;add(parts.body,end);
      const tip=new THREE.Mesh(new THREE.ConeGeometry(.016,.03,6),rope);tip.position.set(x-rz*len*.5,.6-len-.01,.14);tip.rotation.x=Math.PI;add(parts.body,tip);}
  },
  wrappedForearms(add,parts){ // linen wraps spiralling up both forearms
    const linen=cloth('#c9bda0',{roughness:1});
    for(const elbow of [parts.elbow,parts.shieldElbow])for(let i=0;i<4;i++){const w=new THREE.Mesh(new THREE.TorusGeometry(.082-i*.004,.011,6,16),linen);w.position.set(0,-.08-i*.042,0);w.rotation.x=Math.PI/2+.12*(i%2?1:-1);add(elbow,w);}
  },
  holySymbol(add,parts){ // a brass ankh on a dark cord at the chest
    const cord=cloth('#241709'),brass=trimMat('#c8a45a');
    const loop=new THREE.Mesh(new THREE.TorusGeometry(.12,.006,5,24,Math.PI*1.4),cord);loop.rotation.x=Math.PI/2+.5;loop.rotation.z=Math.PI/2-.7;loop.position.set(0,1.03,-.005);add(parts.body,loop);
    const g=new THREE.Group();g.position.set(0,.84,.215);add(parts.body,g);
    const stem=new THREE.Mesh(new THREE.BoxGeometry(.012,.07,.008),brass);stem.position.y=-.02;g.add(stem);
    const bar=new THREE.Mesh(new THREE.BoxGeometry(.05,.011,.008),brass);bar.position.y=.012;g.add(bar);
    const ring2=new THREE.Mesh(new THREE.TorusGeometry(.014,.005,5,12),brass);ring2.position.y=.034;g.add(ring2);
  },
  prayerBeads(add,parts){ // a loop of dark wooden beads hung from the left of the sash
    const wood=cloth('#3a2618',{roughness:.6}),g=new THREE.Group();g.position.set(-.13,.58,.11);g.rotation.y=.4;add(parts.body,g);
    for(let i=0;i<9;i++){const a=i/9*Math.PI*2,b=new THREE.Mesh(new THREE.SphereGeometry(.011,6,5),wood);b.position.set(Math.sin(a)*.04,-.06+Math.cos(a)*.06,0);g.add(b);}
    const tassel=new THREE.Mesh(new THREE.ConeGeometry(.012,.04,6),cloth('#8a2a22'));tassel.position.set(0,-.14,0);tassel.rotation.x=Math.PI;g.add(tassel);
  },
  thighSheath(add,parts){ // a dagger sheath strapped to the right thigh, the wrapped hilt showing
    const hide=cloth('#2e2016',{roughness:.9}),strap=cloth('#3a2a1e'),steel=new THREE.MeshStandardMaterial({color:'#9aa2a6',metalness:.8,roughness:.3});
    const g=new THREE.Group();g.position.set(.13,.36,.13);g.rotation.z=-.1;g.rotation.y=.3;add(parts.body,g);
    const sheath=new THREE.Mesh(new THREE.BoxGeometry(.03,.16,.045),hide);g.add(sheath);
    for(const y of [.05,-.05]){const b=new THREE.Mesh(new THREE.TorusGeometry(.07,.006,5,14),strap);b.position.set(-.06,y,-.02);b.rotation.x=Math.PI/2;b.scale.set(1,.8,1);g.add(b);}
    const hilt=new THREE.Mesh(new THREE.CylinderGeometry(.008,.01,.07,8),hide);hilt.position.y=.11;g.add(hilt);
    const guard=new THREE.Mesh(new THREE.BoxGeometry(.04,.008,.012),steel);guard.position.y=.08;g.add(guard);
    const pommel=new THREE.Mesh(new THREE.SphereGeometry(.011,8,6),steel);pommel.position.y=.15;g.add(pommel);
  },
  lockpickRoll(add,parts){ // a leather roll of picks tied at the back of the belt on the left, two picks showing
    const hide=cloth('#3a2a1e',{roughness:.9}),cord=cloth('#241709'),steel=new THREE.MeshStandardMaterial({color:'#b8c0c4',metalness:.8,roughness:.3});
    const g=new THREE.Group();g.position.set(-.14,.58,-.13);g.rotation.y=-.6;add(parts.body,g);
    const roll=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,.09,10),hide);roll.rotation.z=Math.PI/2;g.add(roll);
    const tie=new THREE.Mesh(new THREE.TorusGeometry(.024,.004,5,10),cord);tie.rotation.y=Math.PI/2;g.add(tie);
    for(const [z,rz] of [[.012,.1],[-.01,-.15]]){const pick=new THREE.Mesh(new THREE.CylinderGeometry(.002,.002,.06,4),steel);pick.position.set(.05,.015,z);pick.rotation.z=Math.PI/2+rz;g.add(pick);}
  },
  quiver(add,parts){ // a leather quiver slung across the back on a strap, a fan of fletched arrows standing out of it
    const hide=cloth('#4a3626',{roughness:.85}),strap=cloth('#3a2a1e'),shaft=cloth('#8a6a3a',{roughness:.9}),fletch=cloth('#c9c0a4',{side:THREE.DoubleSide});
    const g=new THREE.Group();g.position.set(.12,.78,-.2);g.rotation.z=.5;g.rotation.x=.12;add(parts.body,g);
    const tube=new THREE.Mesh(new THREE.CylinderGeometry(.045,.038,.4,12),hide);g.add(tube);
    const lip=new THREE.Mesh(new THREE.TorusGeometry(.046,.007,5,14),strap);lip.position.y=.2;lip.rotation.x=Math.PI/2;g.add(lip);
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2,x=Math.cos(a)*.022,z=Math.sin(a)*.022,sh=new THREE.Mesh(new THREE.CylinderGeometry(.004,.004,.2,5),shaft);sh.position.set(x,.3,z);sh.rotation.z=x*1.5;sh.rotation.x=-z*1.5;g.add(sh);
      const f=new THREE.Mesh(new THREE.PlaneGeometry(.022,.045),fletch);f.position.set(x*1.6,.4,z*1.6);f.rotation.y=a;g.add(f);}
    const band=new THREE.Mesh(new THREE.BoxGeometry(.034,.62,.012),strap);band.position.set(-.03,.78,.19);band.rotation.z=.56;band.rotation.x=-.1;add(parts.body,band);
  },
  bracer(add,parts){ // a laced leather bracer on the bow (shield) forearm
    const hide=cloth('#3a2a1e',{roughness:.85}),lace=cloth('#8a7a4a');
    const b=new THREE.Mesh(new THREE.CylinderGeometry(.088,.096,.16,14,1,true),hide);b.position.set(0,-.13,0);add(parts.shieldElbow,b);
    for(let i=0;i<3;i++){const l=new THREE.Mesh(new THREE.TorusGeometry(.09,.004,4,12),lace);l.position.set(0,-.08-i*.045,0);l.rotation.x=Math.PI/2;add(parts.shieldElbow,l);}
  },
  boneThong(add,parts){ // a bone on a hide thong at the neck
    const thong=cloth('#3a2a1e'),bone=cloth('#d9d0b8',{roughness:.8});
    const loop=new THREE.Mesh(new THREE.TorusGeometry(.125,.006,5,24,Math.PI*1.4),thong);loop.rotation.x=Math.PI/2+.5;loop.rotation.z=Math.PI/2-.7;loop.position.set(0,1.03,-.005);add(parts.body,loop);
    const b=new THREE.Mesh(new THREE.CylinderGeometry(.009,.011,.07,6),bone);b.position.set(0,.86,.21);b.rotation.z=.25;add(parts.body,b);
    for(const y of [.895,.825]){const k=new THREE.Mesh(new THREE.SphereGeometry(.013,6,5),bone);k.position.set((y-.86)*-.55,y,.21);add(parts.body,k);}
  },
  spellbook(add,parts){ // a thick leather-bound book on a strap at the right hip, the page edges showing
    const hide=cloth('#3a2618',{roughness:.85}),pages=cloth('#d6cdb8',{roughness:1}),brass=trimMat('#c8a45a'),strap=cloth('#241709');
    const band=new THREE.Mesh(new THREE.BoxGeometry(.03,.64,.012),strap);band.position.set(-.02,.78,.19);band.rotation.z=-.58;band.rotation.x=-.1;add(parts.body,band);
    const bandBack=new THREE.Mesh(new THREE.BoxGeometry(.03,.6,.012),strap);bandBack.position.set(-.02,.78,-.17);bandBack.rotation.z=.58;bandBack.rotation.x=.1;add(parts.body,bandBack);
    const g=new THREE.Group();g.position.set(.235,.5,.03);g.rotation.z=-.1;g.rotation.y=-.2;add(parts.body,g);
    const cover=new THREE.Mesh(new THREE.BoxGeometry(.06,.19,.15),hide);g.add(cover);
    const block=new THREE.Mesh(new THREE.BoxGeometry(.046,.17,.14),pages);block.position.x=.004;g.add(block);
    const clasp=new THREE.Mesh(new THREE.BoxGeometry(.012,.04,.02),brass);clasp.position.set(.03,0,.07);g.add(clasp);
    for(const y of [.07,-.07]){const corner=new THREE.Mesh(new THREE.BoxGeometry(.064,.022,.022),brass);corner.position.set(0,y,.07);g.add(corner);}
  },
  bandageRoll(add,parts){ // a roll of linen tucked under the sash on the right, one end hanging loose
    const linen=cloth('#d6cdb8',{roughness:1}),g=new THREE.Group();g.position.set(.12,.6,.15);g.rotation.z=.3;add(parts.body,g);
    const roll=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.07,12),linen);roll.rotation.x=Math.PI/2;g.add(roll);
    const tail=new THREE.Mesh(new THREE.BoxGeometry(.04,.1,.006),linen);tail.position.set(.01,-.07,.03);tail.rotation.z=.25;g.add(tail);
  },
};

function beard(add,parts,color){
  const m=cloth(color,{roughness:1}),g=new THREE.Group();g.position.set(0,-.16,.12);add(parts.head,g);
  for(const [r,h,y,z,sx] of [[.115,.2,-.06,0,1.15],[.09,.3,-.2,.01,1],[.055,.34,-.3,.02,.8]]){const c=new THREE.Mesh(new THREE.ConeGeometry(r,h,10),m);c.rotation.x=Math.PI;c.position.set(0,y,z);c.scale.set(sx,1,.55);g.add(c);}
}

function setVisible(list,v){for(const o of list||[])o.visible=v;}

// Dress the hero for a class. Cheap to call every frame: it does nothing unless the character changed.
export function dressHero(hero,{role='Valkyrie',gender='female'}={}){
  const parts=hero?.parts;if(!parts)return false;
  const key=`${role}:${gender}`;if(hero.kitKey===key)return false;hero.kitKey=key;
  parts.base??=Object.fromEntries(BASE_KEYS.map(k=>[k,parts.mats[k].color.clone()]));
  for(const {obj,parent} of hero.kitAdded??[]){parent.remove(obj);obj.traverse(o=>{o.geometry?.dispose();});}
  // Whatever a builder adds under these parts belongs to the kit: found by comparing the children
  // before and after, so a builder that adds a mesh any way at all is still cleaned up on the next change.
  const anchors=[parts.body,parts.head,parts.arm,parts.elbow,parts.shieldArm,parts.shieldElbow],before=anchors.map(a=>new Set(a.children));
  const add=(parent,obj)=>{parent.add(obj);return obj;};
  const kit=KITS[role]??KITS.Valkyrie,pal=kit.palette||{};
  // palette: the kit's colours over the Valkyrie's
  for(const k of BASE_KEYS)parts.mats[k].color.copy(parts.base[k]);
  for(const k of BASE_KEYS)if(pal[k]&&!k.startsWith('hair'))parts.mats[k].color.set(pal[k]);
  if(pal.hair)['hairDark','hairMid','hairLight'].forEach((k,i)=>parts.mats[k].color.set(pal.hair[i]));
  // bare skin: the arm materials are plate (metal map, metalness .82), and a skin colour on metal renders black
  parts.baseFinish??=Object.fromEntries(['armor','armorLight'].map(k=>[k,{metalness:parts.mats[k].metalness,roughness:parts.mats[k].roughness}]));
  for(const k of ['armor','armorLight']){const m=parts.mats[k],f=kit.own?parts.baseFinish[k]:CLASSIC_FINISH[k];m.metalness=kit.matte?0:f.metalness;m.roughness=kit.matte?.85:f.roughness;}
  // which armour shows
  const show={...SHOW_DEFAULT,...(kit.show||{})};
  parts.chest.visible=show.chest;parts.belt.visible=show.belt&&show.chest;setVisible(parts.pauldrons,show.pauldrons);setVisible(parts.tassets,show.tassets);setVisible(parts.mantles,show.mantles);parts.cape.visible=show.cape;setVisible(parts.legGear,show.legGear);setVisible(parts.face,show.face);setVisible(parts.valkyrie,show.valkyrie);parts.syncHelmWings?.();
  const gl=parts.mats.glove;if(gl){parts.baseGlove??={color:'#'+gl.color.getHexString(),emissive:'#'+gl.emissive.getHexString(),metalness:gl.metalness,roughness:gl.roughness};const f=kit.own?parts.baseGlove:LEATHER_GLOVE;gl.color.set(f.color);gl.emissive.set(f.emissive);gl.metalness=f.metalness;gl.roughness=f.roughness;}
  // hair
  const style=typeof kit.hair==='string'?kit.hair:(kit.hair?.[gender]??'helmed'),h=parts.hairParts;
  const styles={helmed:{cap:0,strands:0,tail:0,braids:0},long:{cap:1,strands:1,tail:1,braids:0},tied:{cap:1,strands:1,tail:1,braids:0},short:{cap:1,strands:0,tail:0,braids:0},topknot:{cap:1,strands:0,tail:1,braids:0},wild:{cap:1,strands:1,tail:0,braids:0},bald:{cap:0,strands:0,tail:0,braids:0}};
  const st=styles[style]||styles.helmed;for(const part of ['cap','strands','tail','braids'])setVisible(h[part],!!st[part]);
  // what a class wears over the rig
  if(kit.outfit){const o={...kit.outfit};if(o.kind==='robe')robe(add,parts,o);else if(o.kind==='tabard')tabard(add,parts,o);else if(o.kind==='loincloth')loincloth(add,parts,o);else tunic(add,parts,o);}
  if(kit.hat)HATS[kit.hat]?.(add,parts,{color:kit.outfit?.color||'#333',hatColor:pal.capeCloth,trim:kit.outfit?.trim||'#999'});
  if(kit.beard?.[gender])beard(add,parts,kit.beard[gender]);
  for(const prop of kit.props||[])PROPS[prop]?.(add,parts);
  hero.kitAdded=anchors.flatMap((parent,i)=>parent.children.filter(obj=>!before[i].has(obj)).map(obj=>({obj,parent})));
  return true;
}
