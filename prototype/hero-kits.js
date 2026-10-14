// Class outfits for the hero. knight() in main.js builds one rig (the Valkyrie in steel) and exposes
// its parts; a kit restyles that rig for a class: palette, which armour shows, the hair, and what is
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
  Valkyrie:{},
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
    palette:{armor:'#6a5438',armorLight:'#907a54',leather:'#4b3a26',accent:'#a89870',boots:'#3a2c1e',capeCloth:'#6a5438',hair:['#2c2018','#43301f','#5c4430']},
    show:{chest:false,pauldrons:false,tassets:false,cape:false,mantles:false},outfit:{kind:'tunic',color:'#8a6a46',trim:'#6a5030',length:.4,sleeves:false,fur:true},hair:{male:'wild',female:'wild'},
  },
  Convict:{
    palette:{armor:'#6b6a63',armorLight:'#8a897f',leather:'#3c3a35',accent:'#7a786e',boots:'#26241f',capeCloth:'#55534c',hair:['#222','#2e2e2e','#444']},
    show:{chest:false,pauldrons:false,tassets:false,cape:false,mantles:false},outfit:{kind:'tunic',color:'#6b6a63',trim:'#3c3a35',length:.42,sleeves:true,sleeveWide:.07},hair:{male:'bald',female:'bald'},
  },
  Archeologist:{
    palette:{armor:'#8a7a52',armorLight:'#b0a074',leather:'#4a3626',accent:'#b49a52',boots:'#3a2c1e',capeCloth:'#6f6240',hair:['#3a2a1c','#52402c','#6a5238']},
    show:{chest:false,pauldrons:false,tassets:false,cape:false,mantles:false},outfit:{kind:'tunic',color:'#a58f62',trim:'#6a5a38',length:.4,sleeves:true,sleeveWide:.075},hat:'fedora',hair:{male:'short',female:'tied'},
  },
  Tourist:{
    palette:{armor:'#b8472f',armorLight:'#e0b060',leather:'#6a4a2a',accent:'#e8d8a0',boots:'#5a4a30',capeCloth:'#b8472f',hair:['#4a3626','#6a4e34','#8a6a48']},
    show:{chest:false,pauldrons:false,tassets:false,cape:false,mantles:false},outfit:{kind:'tunic',color:'#b8472f',trim:'#e8d27a',length:.46,sleeves:true,sleeveWide:.085,flowers:true},hat:'straw',hair:{male:'short',female:'short'},
  },
  Rogue:{
    palette:{armor:'#2c2c30',armorLight:'#4a4a52',leather:'#26221e',accent:'#7a6a4a',boots:'#161616',capeCloth:'#26262a',hair:['#1a1a1a','#2a2a2a','#3c3c3c']},
    show:{chest:false,pauldrons:false,tassets:false,mantles:false},outfit:{kind:'tunic',color:'#2c2c30',trim:'#554a3a',length:.4,sleeves:true,sleeveWide:.065},hat:'hood',hair:{male:'short',female:'short'},
  },
  Ranger:{
    palette:{armor:'#3f5238',armorLight:'#667a58',leather:'#4a3626',accent:'#9a8a5a',boots:'#2a2216',capeCloth:'#41563a',hair:['#3a2c1c','#52402a','#6a5436']},
    show:{chest:false,pauldrons:false,tassets:false,mantles:false},outfit:{kind:'tunic',color:'#4f6444',trim:'#6a5a3a',length:.42,sleeves:true,sleeveWide:.068},hat:'hood',hair:{male:'short',female:'tied'},
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
    palette:{armor:'#b79b62',armorLight:'#d4be86',leather:'#3a2c20',accent:'#8a2a22',boots:'#2c2218',capeCloth:'#b79b62',hair:['#222','#333','#444']},
    show:{chest:false,pauldrons:false,tassets:false,cape:false,mantles:false},outfit:{kind:'robe',color:'#b79b62',trim:'#5a4630',length:.62,sleeves:true,sleeveWide:.09,sash:'#2a2420'},hair:{male:'bald',female:'tied'},
  },
  Priest:{
    palette:{armor:'#2a2a30',armorLight:'#6a6a74',leather:'#3a2c20',accent:'#c8a45a',boots:'#17171a',capeCloth:'#2a2a30',hair:['#3a3a3c','#585860','#80808a']},
    show:{chest:false,pauldrons:false,tassets:false,cape:false,mantles:false},outfit:{kind:'robe',color:'#2a2a30',trim:'#c8a45a',length:1,sleeves:true,sleeveWide:.1,sash:'#c8a45a',collar:'#e6e2d6'},hair:{male:'short',female:'tied'},
  },
  Wizard:{
    palette:{armor:'#2b3560',armorLight:'#5a6aa0',leather:'#3a2c20',accent:'#d8c27a',boots:'#201a14',capeCloth:'#2b3560',hair:['#8a8a84','#b4b3aa','#d8d6cc']},
    show:{chest:false,pauldrons:false,tassets:false,cape:false,mantles:false},outfit:{kind:'robe',color:'#2b3560',trim:'#9fb4c8',length:1,sleeves:true,sleeveWide:.13,sash:'#8a2f2a',stars:'#d8c27a'},hat:'wizard',hair:{male:'long',female:'long'},beard:{male:'#c9c7bd'},
  },
};
export const KIT_ROLES=Object.keys(KITS);
// What each class starts the game holding, for the kit sheet (tools/kit-shots.mjs); the live game
// holds whatever the frame says.
export const KIT_WEAPONS={Valkyrie:'long sword',Knight:'long sword',Samurai:'katana',Barbarian:'two-handed sword',Caveman:'club',Convict:'rubber hose',Archeologist:'pick-axe',Tourist:'dart',Rogue:'short sword',Ranger:'dagger',Healer:'scalpel',Monk:null,Priest:'mace',Wizard:'quarterstaff'};

const SHOW_DEFAULT={chest:true,belt:true,pauldrons:true,tassets:true,mantles:true,cape:true};

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
  sleeves(add,parts,o,m,t);
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
  if(o.flowers)for(let i=0;i<22;i++){const f=new THREE.Mesh(new THREE.CircleGeometry(.018+((i*3)%3)*.006,6),trimMat(i%2?'#e8d27a':'#2f6a58'));const y=.68+((i*37)%25)/50,a=(i/22)*Math.PI*1.3-.65;f.position.set(Math.sin(a)*.19,y,Math.cos(a)*.19*.8+.004);f.rotation.y=a;add(parts.body,f);}
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
    const star=new THREE.Mesh(new THREE.OctahedronGeometry(.02),t);star.position.set(0,.2,.155);star.scale.z=.4;g.add(star);
    const star2=new THREE.Mesh(new THREE.OctahedronGeometry(.013),t);star2.position.set(.06,.1,.17);star2.scale.z=.4;g.add(star2);
  },
  hood(add,parts,o){ // a cowl with the front left open for the face, and a drape on the shoulders
    const m=cloth(o.color),cap=new THREE.Mesh(new THREE.SphereGeometry(.235,22,14,Math.PI/2+.62,Math.PI*2-1.24,0,Math.PI*.66),m);cap.position.set(0,.02,-.012);cap.scale.set(1,1.04,1.08);add(parts.head,cap);
    const drape=new THREE.Mesh(new THREE.ConeGeometry(.3,.26,16,1,true),m);drape.position.set(0,-.2,-.03);drape.scale.z=.85;add(parts.head,drape);
  },
  straw(add,parts){ const m=cloth('#cdb470',{roughness:1}),g=new THREE.Group();g.position.set(0,.14,0);add(parts.head,g);
    const brim=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.018,32),m);g.add(brim);const crown=new THREE.Mesh(new THREE.CylinderGeometry(.15,.17,.11,22),m);crown.position.y=.06;g.add(crown);ring(.168,.012,trimMat('#a83a2a'),g,0,.03,0,1,1);},
  fedora(add,parts){ const m=cloth('#6a4a2e',{roughness:.95}),g=new THREE.Group();g.position.set(0,.12,0);g.rotation.z=.05;add(parts.head,g);
    const brim=new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,.014,30),m);brim.scale.z=1.05;g.add(brim);const crown=new THREE.Mesh(new THREE.CylinderGeometry(.14,.18,.15,22),m);crown.position.y=.075;g.add(crown);
    const dent=new THREE.Mesh(new THREE.BoxGeometry(.12,.03,.1),m);dent.position.set(0,.15,0);g.add(dent);ring(.178,.012,trimMat('#2a1e14'),g,0,.03,0,1,1);},
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
  // which armour shows
  const show={...SHOW_DEFAULT,...(kit.show||{})};
  parts.chest.visible=show.chest;parts.belt.visible=show.belt&&show.chest;setVisible(parts.pauldrons,show.pauldrons);setVisible(parts.tassets,show.tassets);setVisible(parts.mantles,show.mantles);parts.cape.visible=show.cape;
  // hair
  const style=typeof kit.hair==='string'?kit.hair:(kit.hair?.[gender]??'valkyrie'),h=parts.hairParts;
  const styles={valkyrie:{cap:1,strands:1,tail:1,braids:1},long:{cap:1,strands:1,tail:1,braids:0},tied:{cap:1,strands:1,tail:1,braids:0},short:{cap:1,strands:0,tail:0,braids:0},topknot:{cap:1,strands:0,tail:1,braids:0},wild:{cap:1,strands:1,tail:0,braids:0},bald:{cap:0,strands:0,tail:0,braids:0}};
  const st=styles[style]||styles.valkyrie;for(const part of ['cap','strands','tail','braids'])setVisible(h[part],!!st[part]);
  // what a class wears over the rig
  if(kit.outfit){const o={...kit.outfit};if(o.kind==='robe')robe(add,parts,o);else if(o.kind==='tabard')tabard(add,parts,o);else tunic(add,parts,o);}
  if(kit.hat)HATS[kit.hat]?.(add,parts,{color:kit.outfit?.color||'#333',hatColor:pal.capeCloth,trim:kit.outfit?.trim||'#999'});
  if(kit.beard?.[gender])beard(add,parts,kit.beard[gender]);
  for(const prop of kit.props||[])PROPS[prop]?.(add,parts);
  hero.kitAdded=anchors.flatMap((parent,i)=>parent.children.filter(obj=>!before[i].has(obj)).map(obj=>({obj,parent})));
  return true;
}
