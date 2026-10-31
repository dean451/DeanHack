import {buildFace,faceMaterials} from './hero-face.js';
import {buildHelm} from './hero-helm.js';
import {createGauntletHand} from './hero-hand.js';
import {buildValkyrie,PALETTE as VALKYRIE} from './hero-valkyrie.js';
import {createFountain} from './fountain.js';
import {installLive} from './live.js';
import {createHeroPortrait,mountPortraitView,PORTRAIT_INTERVAL_MS} from './hero-portrait.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { DungeonAOPass } from './ao-pass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import {createHuePass} from './hue-pass.js'
import {createAoMotion} from './ao-motion.js'
import {createShadowMotion} from './shadow-motion.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createCreature} from './creatures.js';
import {createHeldWeapon,turnHeld} from './equipment.js';
import {createRenderStats} from './render-stats.js';
import {TIERS,isTier,pickTier,nextTier,pixelRatioFor,applyTier,createFramePacer,createAdaptiveQuality,frameCost,readSaved,saveTier,torchLightsFor,furShellsFor,monsterLodFor} from './quality.js'
import {LOD} from './creature-lod.js'
import {FUR} from './feline-coat.js';
import {createFlameFlicker} from './flame-flicker.js';
import {createSinkDrip} from './sink-drip.js';
import {createCanopySway} from './canopy-sway.js';
import {createThroneGleam} from './throne-gleam.js';
import {createGraveMist} from './grave-mist.js';
import {createGraveHands} from './grave-hand.js';
import {createAltarEmbers} from './altar-embers.js';
import {createBogBubbles} from './bog-bubbles.js';
import {createGasRoil} from './poison-cloud-roil.js';
import {createGasEdge} from './gas-edge.js';

/* every renderer.render(scene) walked the whole graph's world matrices again (the main pass, then the occlusion pass's own scene render), so the frame updates them once, just before the composer draws */const scene=new THREE.Scene();scene.matrixWorldAutoUpdate=false;scene.background=new THREE.Color('#142333');scene.fog=new THREE.FogExp2('#1b3040',.032);
// A weak machine (four cores or fewer) draws at 1x: four times fewer pixels on a Retina screen.
// No MSAA: the composer's targets never had it (the scene is drawn into a plain target), so the flag only cost a resolve of the final quad.
// No alpha channel either: the scene has an opaque background, so the page never showed through, and an opaque canvas skips the browser's blend with the page.
const renderer=new THREE.WebGLRenderer({antialias:false,alpha:false});/* checking each shader's compile log makes the driver finish every compile on the spot, stalling the frame; only ?debug asks for it */renderer.debug.checkShaderErrors=new URLSearchParams(location.search).has('debug');const quality={tier:pickTier({search:location.search,saved:readSaved(),cores:navigator.hardwareConcurrency})};const adaptive=createAdaptiveQuality({manual:isTier(readSaved())});renderer.setPixelRatio(pixelRatioFor(quality.tier,devicePixelRatio));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;/* the loop says when (quality.js): once a frame at most, not once per scene render */renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;document.querySelector('#scene').appendChild(renderer.domElement);
const renderStats=createRenderStats(renderer,scene,{visible:new URLSearchParams(location.search).has('stats')});addEventListener('keydown',e=>{if(e.key==='F9'){e.preventDefault();renderStats.toggle();}});
const flameFlicker=createFlameFlicker(scene,{focus:()=>controls.target});
const sinkDrip=createSinkDrip(scene);
const canopySway=createCanopySway(scene);
const throneGleam=createThroneGleam(scene);
const graveMist=createGraveMist(scene);
const graveHands=createGraveHands(scene);const heroWorld=new THREE.Vector3();
const altarEmbers=createAltarEmbers(scene);
const bogBubbles=createBogBubbles(scene);
const gasRoil=createGasRoil(scene);const gasEdge=createGasEdge();
const camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.1,100);camera.position.set(11,13,16);
const controls=new OrbitControls(camera,renderer.domElement);const aoMotion=createAoMotion();const shadowMotion=createShadowMotion();controls.addEventListener('start',()=>aoMotion.start());controls.addEventListener('end',()=>aoMotion.end(performance.now()));controls.target.set(0,.1,0);controls.enableDamping=true;controls.minDistance=5;controls.maxDistance=27;controls.minPolarAngle=.3;controls.maxPolarAngle=1.22;controls.enablePan=false;
const composer=new EffectComposer(renderer);const huePass=createHuePass();composer.addPass(new RenderPass(scene,camera));/* ground-truth ambient occlusion (ao-pass.js), in place of the older SSAOPass whose kernel speckled flat floors */const ambientOcclusion=new DungeonAOPass(scene,camera,innerWidth,innerHeight);composer.addPass(ambientOcclusion);const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.25,.48,1.25);composer.addPass(bloom);/* hallucination's colour slide (hue-pass.js), off unless hallucinating */composer.addPass(huePass);composer.addPass(new OutputPass());
scene.add(new THREE.HemisphereLight(0x92bfc4,0x333025,1.5));const moon=new THREE.DirectionalLight(0x9fb9ca,2.3);moon.position.set(-4,10,3);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.5,far:30});moon.shadow.bias=-.0003;moon.shadow.normalBias=.03;scene.add(moon);
// Quality tiers (quality.js): pixel ratio, SSAO, shadows and the idle frame rate. F8 cycles and saves; ?quality= overrides.
const qualityToast=document.createElement('div');qualityToast.className='quality-toast';qualityToast.hidden=true;document.body.append(qualityToast);let toastTimer=null;
function setQuality(tier,{say=false,auto=false}={}){quality.tier=tier;const got=applyTier(tier,{renderer,composer,ambientOcclusion,bloom,light:moon,scene,soft:THREE.PCFSoftShadowMap,plain:THREE.PCFShadowMap,devicePixelRatio,width:innerWidth,height:innerHeight,keepShadowType:auto});
 if(say){qualityToast.textContent=auto?`Quality · ${TIERS[tier].label.split(':')[0]} (the game was running slow; the Quality button chooses)`:`Quality · ${got.label}`;qualityToast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{qualityToast.hidden=true;},2600);}return got;}
setQuality(quality.tier);
/* not every keyboard has F8: an on-screen Quality button cycles the tiers too (high, balanced, low, fast) */
const qualityButton=document.createElement('button');qualityButton.id='quality';qualityButton.type='button';
const showQuality=()=>{qualityButton.textContent=`Quality: ${TIERS[quality.tier].label.split(':')[0]}`;qualityButton.title=TIERS[quality.tier].label;};
const cycleQuality=()=>{adaptive.manual();const tier=nextTier(quality.tier);saveTier(tier);setQuality(tier,{say:true});showQuality();};
qualityButton.addEventListener('click',()=>{cycleQuality();qualityButton.blur();});document.querySelector('.buttons').append(qualityButton);showQuality();
addEventListener('keydown',e=>{if(e.key==='F8'){e.preventDefault();cycleQuality();}});
// The frame pacer: every frame while something is going on, the tier's idle rate after a quiet spell.
const pacer=createFramePacer();const touch=()=>pacer.touch(performance.now());
for(const ev of ['keydown','pointerdown','wheel'])addEventListener(ev,touch,{passive:true});controls.addEventListener('change',touch);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
function surfaceTexture(base, accent, repeat=1){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,256,256);let n=19;const noise=()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};for(let i=0;i<760;i++){const x=noise()*256,y=noise()*256,r=1+noise()*7;ctx.globalAlpha=.05+noise()*.15;ctx.fillStyle=accent;ctx.beginPath();ctx.ellipse(x,y,r,r*(.25+noise()*.8),noise()*Math.PI,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=.3;for(let i=0;i<30;i++){ctx.strokeStyle=accent;ctx.lineWidth=.3+noise();ctx.beginPath();let x=noise()*256,y=noise()*256;ctx.moveTo(x,y);for(let j=0;j<4;j++){x+=noise()*34-17;y+=noise()*34-17;ctx.lineTo(x,y);}ctx.stroke();}ctx.globalAlpha=1;const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(repeat,repeat);const bumpCanvas=document.createElement('canvas');bumpCanvas.width=bumpCanvas.height=256;const bumpCtx=bumpCanvas.getContext('2d');bumpCtx.fillStyle='#777';bumpCtx.fillRect(0,0,256,256);for(let i=0;i<360;i++){bumpCtx.globalAlpha=.12+noise()*.42;bumpCtx.fillStyle=noise()>.5?'#bbb':'#333';bumpCtx.beginPath();bumpCtx.ellipse(noise()*256,noise()*256,1+noise()*8,1+noise()*4,noise()*Math.PI,0,Math.PI*2);bumpCtx.fill();}const bump=new THREE.CanvasTexture(bumpCanvas);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(repeat,repeat);return {map,bump};}
const stoneSurface=surfaceTexture('#56625f','#20333a',.7),floorSurface=surfaceTexture('#68736c','#2c4140',1.15),metalSurface=surfaceTexture('#9db6bd','#42565a',1.3);
const stone=mat('#68746e',{map:stoneSurface.map,bumpMap:stoneSurface.bump,bumpScale:.12,roughness:.88}),darkStone=mat('#303b3b',{map:stoneSurface.map,bumpMap:stoneSurface.bump,bumpScale:.16,roughness:.92}),trim=mat('#85877a',{map:stoneSurface.map,bumpMap:stoneSurface.bump,bumpScale:.09,roughness:.7}),gold=mat('#b49355',{metalness:.75,roughness:.3}),steel=mat('#a6bec3',{map:metalSurface.map,bumpMap:metalSurface.bump,bumpScale:.07,metalness:.82,roughness:.25}),cloth=mat('#315b59',{map:floorSurface.map,bumpMap:floorSurface.bump,bumpScale:.06,roughness:.94});
function mesh(geo,material,parent=scene,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(w,h,d,m,p=scene,x=0,y=0,z=0){return mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);}
function roundedBox(w,h,d,m,p=scene,x=0,y=0,z=0,r=.04){return mesh(new RoundedBoxGeometry(w,h,d,3,r),m,p,x,y,z);}
function sphere(r,m,p,x=0,y=0,z=0,sx=1,sy=1,sz=1){const o=mesh(new THREE.SphereGeometry(r,16,12),m,p,x,y,z);o.scale.set(sx,sy,sz);return o;}
function cylinder(r1,r2,h,m,p=scene,x=0,y=0,z=0,n=24){return mesh(new THREE.CylinderGeometry(r1,r2,h,n),m,p,x,y,z);}
function torus(r,t,m,p=scene,x=0,y=0,z=0){const o=mesh(new THREE.TorusGeometry(r,t,8,48),m,p,x,y,z);o.rotation.x=Math.PI/2;return o;}
// The fountain the live game copies for each fountain it shows (oracle-visuals.js createLiveFountain); never added to the scene itself.
const well=createFountain({materials:{stone,trim,gold}});
function knight(){const g=new THREE.Group();const body=new THREE.Group();g.add(body);const armor=mat(VALKYRIE.armor,{map:metalSurface.map,bumpMap:metalSurface.bump,bumpScale:.1,metalness:.5,roughness:.4}),armorLight=mat(VALKYRIE.armorLight,{map:metalSurface.map,bumpMap:metalSurface.bump,bumpScale:.08,metalness:.5,roughness:.34}),boots=mat(VALKYRIE.boots,{roughness:.72}),leather=mat(VALKYRIE.leather,{roughness:.9}),visor=mat('#101c20',{metalness:.5,roughness:.32}),accent=mat(VALKYRIE.accent,{metalness:.78,roughness:.3});const legs=[],legGear=[];for(const x of [-.122,.122]){const pivot=new THREE.Group();pivot.position.set(x,.49,0);body.add(pivot);sphere(.074,armor,pivot,0,-.14,0,.91,2,1);cylinder(.056,.062,.22,leather,pivot,0,-.30,0,16);
 const gearStart=pivot.children.length;roundedBox(.185,.065,.22,boots,pivot,0,-.205,0,.02);
 sphere(.115,leather,pivot,0,-.405,.074,.86,.58,1.48);
 sphere(.112,boots,pivot,0,-.455,.071,.89,.16,1.5);
 for(let i=0;i<3;i++){const crease=roundedBox(.15-i*.012,.009,.012,boots,pivot,0,-.345-i*.027,.099+i*.016,.004);crease.rotation.z=(i-1)*.06;}
 for(const side of [-1,1]){roundedBox(.014,.12,.014,accent,pivot,side*.064,-.287,.102,.004);}
 roundedBox(.16,.026,.013,boots,pivot,0,-.248,.112,.006);
 roundedBox(.036,.036,.018,accent,pivot,.05,-.248,.123,.006);
 const scuff=roundedBox(.068,.008,.015,accent,pivot,-.026,-.411,.228,.004);scuff.rotation.z=.13;legGear.push(...pivot.children.slice(gearStart));legs.push(pivot);}
 const cuirass=new THREE.LatheGeometry([new THREE.Vector2(.088,.56),new THREE.Vector2(.11,.63),new THREE.Vector2(.168,.82),new THREE.Vector2(.158,.91),new THREE.Vector2(.105,.99)],24);
 const chest=mesh(cuirass,armor,body);chest.scale.z=.76;
 const belt=cylinder(.118,.108,.05,leather,body,0,.605,0,24);belt.scale.z=.78;
 roundedBox(.04,.04,.015,accent,body,0,.605,.108,.006);
 const skin=mat('#d6a88c',{roughness:.8}),eyeWhite=mat('#ded8ca',{roughness:.7}),iris=mat('#384a42',{roughness:.6});
 const neckSkin=new THREE.MeshStandardMaterial({color:'#d2a083',emissive:'#4a2818',emissiveIntensity:.4,roughness:.75});
 const neck=cylinder(.11,.13,.14,neckSkin,body,0,1.04,.02,12);
 const head=new THREE.Group();head.position.set(0,1.23,.02);body.add(head);
 buildFace(head,faceMaterials());const face=[neck,...head.children]; // hidden inside the Valkyrie's closed helm and gorget
 const helmet=new THREE.Group();head.add(helmet);helmet.visible=false;
 buildHelm(helmet,{iron:armor,steel:armorLight,trim:accent});
 const hair=new THREE.Group();head.add(hair);
 const hairDark=mat(VALKYRIE.hairDark,{roughness:1}),hairMid=mat(VALKYRIE.hairMid,{roughness:.94}),hairLight=mat(VALKYRIE.hairLight,{roughness:.9});
 // An uneven swept hairline, with fine raised strands following the same flow.
 const hairGeo=new THREE.SphereGeometry(.196,32,18,0,Math.PI*2,0,Math.PI*.54);
 const hp=hairGeo.attributes.position;
 for(let i=0;i<hp.count;i++){let x=hp.getX(i),y=hp.getY(i),z=hp.getZ(i);const front=Math.max(0,z/.196);y+=front*(.07+.05*Math.min(1,Math.abs(x)/.11)-.034*Math.exp(-((x/.055)**2)))+Math.sin(x*17)*front*.012;hp.setXYZ(i,x*.91,y*1.04+.01,z*.94-.018);}hairGeo.computeVertexNormals();mesh(hairGeo,hairDark,hair);
 const hairCap=hair.children.slice();
 for(let i=0;i<19;i++){
  const a=(i/18-.5)*2.35;
  const path=new THREE.CatmullRomCurve3([
   new THREE.Vector3(Math.sin(a)*.171,.07+Math.cos(a)*.035,Math.cos(a)*.165-.018),
   new THREE.Vector3(Math.sin(a)*.15,.168+Math.cos(a)*.035,.025),
   new THREE.Vector3(Math.sin(a)*.10,.145,-.14),
   new THREE.Vector3(Math.sin(a)*.033,.036,-.197)]);
  mesh(new THREE.TubeGeometry(path,18,i%3===0?.008:.0045,5,false),i%3===0?hairMid:hairLight,hair);
 }
 const hairStrands=hair.children.slice(hairCap.length),hairTailStart=hair.children.length;
 const tiedHair=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.035,-.193),new THREE.Vector3(.012,-.035,-.23),new THREE.Vector3(.022,-.14,-.24),new THREE.Vector3(.04,-.225,-.21)]);
 mesh(new THREE.TubeGeometry(tiedHair,16,.035,8,false),hairMid,hair);
 const hairTie=torus(.039,.007,leather,hair,0,.02,-.202);hairTie.rotation.x=.2;
 const hairTail=hair.children.slice(hairTailStart),hairBraidStart=hair.children.length;
 // Two braids from the temples fall forward over the shoulders, bound with a bronze-dark tie.
 for(const side of [-1,1]){const braid=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.15,.03,.02),new THREE.Vector3(side*.172,-.07,.05),new THREE.Vector3(side*.17,-.19,.075),new THREE.Vector3(side*.165,-.3,.07)]);mesh(new THREE.TubeGeometry(braid,16,.022,6,false),hairMid,hair);torus(.023,.006,accent,hair,side*.165,-.3,.07).rotation.x=.3;}
 const hairBraids=hair.children.slice(hairBraidStart);
 // Finer features: high cheekbones, a darker lower lip, long lower lashes and a narrow nose bridge between the brows.
 const plume=new THREE.Group();head.add(plume); // Stable legacy animation anchor, no spike.
 let helmetWorn=null;
 function setHelmet(item){helmetWorn=item||null;hair.visible=!item;helmet.name=item?.name||'Unequipped helmet';syncHelmWings();helmet.visible=!!item&&!valk.helm.visible;} // the Valkyrie's own winged helm stands in for any helmet she wears
 // her helm (and its wings) shows only while she wears a helmet; bare-headed she shows her face and long hair
 // (hero-kits.js calls this again after it shows or hides her suit)
 function syncHelmWings(){const suit=valk.objects.some(o=>o.visible&&!valk.headPieces.includes(o));if(!suit)return;
  const bare=!helmetWorn;helmet.visible=false;for(const o of valk.headPieces)o.visible=!bare;for(const o of valk.bareHair)o.visible=bare;
  face.forEach(o=>o.visible=bare);for(const o of [...hairCap,...hairStrands,...hairTail])o.visible=bare;}
 const pauldronStart=body.children.length;
 for(const side of [-1,1])for(let i=0;i<3;i++){
  const plate=roundedBox(.16-i*.013,.04,.2-i*.016,i?armor:armorLight,body,side*(.25+i*.035),.995-i*.059,0,.018);plate.rotation.z=-side*(.18+i*.16);
  for(const z of [-.09,.09])sphere(.011,accent,body,side*(.27+i*.035),.998-i*.059,z*.8);
 }
 const pauldrons=body.children.slice(pauldronStart),tassetStart=body.children.length;
 // Tassets: three overlapping plates hang from the belt over each hip, each longer and flared outward.
 for(const side of [-1,1])for(let i=0;i<3;i++){const t=roundedBox(.11-i*.008,.075,.016,i%2?armor:armorLight,body,side*(.105+i*.012),.56-i*.05,.1+i*.012,.008);t.rotation.z=side*(.12+i*.07);t.rotation.x=-.18;sphere(.008,accent,body,side*(.105+i*.012),.585-i*.05,.112+i*.012);}
 const tassets=body.children.slice(tassetStart);
 // Cloth starts at the collar and widens into folds below the shoulder blades.
 const cape=new THREE.Group();cape.position.set(0,1.045,-.13);body.add(cape);
 const capeGeo=new THREE.PlaneGeometry(1,1,16,18),cp=capeGeo.attributes.position;
 for(let i=0;i<cp.count;i++){const u=cp.getX(i),v=.5-cp.getY(i);cp.setXYZ(i,u*(.34+v*.4),-v*.86,-v*.13+Math.sin(u*30)*(.006+v*.024));}capeGeo.computeVertexNormals();
 const capeCloth=cloth.clone();capeCloth.side=THREE.DoubleSide;mesh(capeGeo,capeCloth,cape);
 const mantleStart=body.children.length;
 for(const side of [-1,1]){const mantle=roundedBox(.18,.06,.29,capeCloth,body,side*.15,1.02,0,.025);mantle.rotation.z=side*.1;sphere(.026,accent,body,side*.16,1.02,.15,1,1,.45);}
 const clasp=new THREE.CatmullRomCurve3([new THREE.Vector3(-.16,1.02,.15),new THREE.Vector3(0,.99,.19),new THREE.Vector3(.16,1.02,.15)]);mesh(new THREE.TubeGeometry(clasp,12,.008,5,false),accent,body);
 const mantles=body.children.slice(mantleStart);
 const arm=new THREE.Group();arm.position.set(.3,.92,0);body.add(arm);cylinder(.056,.044,.25,armor,arm,0,-.12,0,16);
 const elbow=new THREE.Group();elbow.position.set(0,-.25,0);elbow.rotation.x=-.65;arm.add(elbow);sphere(.062,leather,elbow);cylinder(.048,.036,.22,armorLight,elbow,0,-.12,0,16);
 const wrist=new THREE.Group();wrist.position.set(0,-.25,0);elbow.add(wrist);
 const weaponSocket=new THREE.Group();weaponSocket.rotation.x=Math.PI/4+.65;wrist.add(weaponSocket);
 const glove=new THREE.MeshStandardMaterial({color:VALKYRIE.glove,roughness:.5,metalness:.6,emissive:'#0c0d0f',emissiveIntensity:.6}),handMats={glove,plate:armorLight};
 function grippingHand(parent){parent.add(createGauntletHand(handMats));}
 grippingHand(weaponSocket);
 let heldWeapon=null,heldKey;
 function setWeapon(item){const key=JSON.stringify(item??null);if(key===heldKey)return;heldKey=key;if(heldWeapon){heldWeapon.userData.dispose?.();weaponSocket.remove(heldWeapon);}heldWeapon=turnHeld(createHeldWeapon(item));weaponSocket.add(heldWeapon);}
 setWeapon({name:'long sword'});
 const shieldArm=new THREE.Group();shieldArm.position.set(-.3,.91,0);body.add(shieldArm);cylinder(.056,.044,.25,armor,shieldArm,0,-.13,0,16);
 const shieldElbow=new THREE.Group();shieldElbow.position.y=-.25;shieldElbow.rotation.x=-.9;shieldArm.add(shieldElbow);cylinder(.048,.036,.22,armorLight,shieldElbow,0,-.1,0,16);
 const shieldHand=new THREE.Group();shieldHand.position.set(0,-.23,0);shieldHand.rotation.set(.35,-.2,-.12);shieldElbow.add(shieldHand);grippingHand(shieldHand);
 const shieldRoot=new THREE.Group();shieldRoot.position.set(0,0,.085);shieldHand.add(shieldRoot);
 const shield=cylinder(.29,.29,.065,leather,shieldRoot,0,0,0,32);shield.rotation.x=Math.PI/2;
 const shieldFace=cylinder(.268,.268,.016,cloth,shieldRoot,0,0,.04,32);shieldFace.rotation.x=Math.PI/2;
 const shieldRim=torus(.278,.019,accent,shieldRoot,0,0,.049);shieldRim.rotation.x=0;
 sphere(.082,armorLight,shieldRoot,0,0,.065,1,1,.58);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;sphere(.012,accent,shieldRoot,Math.cos(a)*.246,Math.sin(a)*.246,.056);}
 roundedBox(.035,.16,.035,leather,shieldRoot,0,0,-.055,.01);
 for(const y of [-.075,.075])roundedBox(.085,.022,.065,accent,shieldRoot,0,y,-.043,.008);
 // The shield shows only while one is worn; two-weaponing puts the other weapon in that hand instead.
 const offhandSocket=new THREE.Group();offhandSocket.rotation.x=Math.PI/4+.55;shieldHand.add(offhandSocket);
 let shieldWorn=true,offhandWeapon=null,offhandKey;
 // The shield hand grips the shield's bar when one is worn; empty, it hangs as a fist turned the same way as the weapon hand, knuckles forward, instead of holding an invisible shield.
 function showShield(){shieldRoot.visible=shieldWorn&&!offhandWeapon;if(shieldRoot.visible||offhandWeapon)shieldHand.rotation.set(.35,-.2,-.12);else shieldHand.rotation.set(Math.PI/4+.65,.2,.12);}
 function setShield(item){shieldWorn=!!item;shieldRoot.name=item?.name||'Unequipped shield';showShield();}
 function setOffhand(item){const key=JSON.stringify(item??null);if(key===offhandKey)return;offhandKey=key;if(offhandWeapon){offhandWeapon.userData.dispose?.();offhandSocket.remove(offhandWeapon);offhandWeapon=null;}if(item){offhandWeapon=turnHeld(createHeldWeapon(item));offhandSocket.add(offhandWeapon);}showShield();}
 // The Valkyrie's suit (hero-valkyrie.js), shown for her and hidden for every other class; the plate, cape and hair above are what the other kits restyle.
 const valk=buildValkyrie({body,head,arm,elbow,shieldArm,shieldElbow,legs},{armor,armorLight,leather,accent,boots,hairDark,hairMid,hairLight});
 for(const o of [...face,chest,belt,...pauldrons,...tassets,...mantles,cape,...legGear,...hair.children])o.visible=false;
 // What a class kit (hero-kits.js) restyles: the armour pieces, the cloth, the hair and the materials they share.
 syncHelmWings();
 const parts={syncHelmWings,face,chest,belt,pauldrons,tassets,mantles,cape,legGear,valkyrie:valk.objects,hair,hairParts:{cap:hairCap,strands:hairStrands,tail:hairTail,braids:hairBraids},helmet,legs,arm,elbow,shieldArm,shieldElbow,head,body,mats:{armor,armorLight,leather,accent,boots,capeCloth,hairDark,hairMid,hairLight,skin,glove}};
 return {g,body,legs,arm,elbow,wrist,weaponSocket,offhandSocket,get dual(){return !!offhandWeapon;},head,shieldArm,shieldElbow,cape,plume,parts,setWeapon,setOffhand,setShield,setHelmet};}
const glow=mat('#97ffed',{emissive:'#46e9ce',emissiveIntensity:3,roughness:.2});
function cat(){const g=new THREE.Group(),body=new THREE.Group();g.add(body);const fur=mat('#bd9361',{roughness:.94}),furLight=mat('#d3ad79',{roughness:.9}),paws=mat('#e1ca9e',{roughness:.88}),collar=mat('#ad7744',{metalness:.42,roughness:.44});sphere(.24,fur,body,0,.27,0,.75,.8,1.5);const head=sphere(.19,furLight,body,0,.46,.28);for(const x of [-.11,.11]){const e=mesh(new THREE.ConeGeometry(.085,.18,4),furLight,head,x,.16,0);e.rotation.z=x>0?-.2:.2;sphere(.025,glow,head,x*.65,.02,.16);}
 sphere(.035,mat('#d28c78',{roughness:.55}),head,0,-.015,.2);const collarRing=torus(.145,.018,collar,body,0,.34,.01);collarRing.scale.set(.9,1,1);const charm=sphere(.028,glow,body,0,.3,.16);const legs=[];for(const x of [-.12,.12])for(const z of [-.2,.2]){const leg=new THREE.Group();leg.position.set(x,.18,z);body.add(leg);roundedBox(.085,.2,.09,paws,leg,0,-.07,0,.025);legs.push(leg);}
 const tail=new THREE.Group();tail.position.set(0,.32,-.29);body.add(tail);const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,.2,-.14),new THREE.Vector3(0,.48,-.17),new THREE.Vector3(.11,.56,-.14)]);mesh(new THREE.TubeGeometry(curve,16,.038,10,false),fur,tail);const whiskers=[];for(const side of [-1,1]){const whisker=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.05,-.02,.19),new THREE.Vector3(side*.18,-.03,.26),new THREE.Vector3(side*.28,-.01,.23)]);whiskers.push(mesh(new THREE.TubeGeometry(whisker,8,.008,5,false),furLight,head));}
 return {g,body,legs,tail,collarRing,charm};}
function sentinel(){const g=new THREE.Group();const core=mat('#ff9a58',{emissive:'#ff4d1f',emissiveIntensity:5,roughness:.3}),guard=mat('#3d4b4b',{map:stoneSurface.map,bumpMap:stoneSurface.bump,bumpScale:.14,roughness:.8}),guardLight=mat('#77827a',{map:stoneSurface.map,bumpMap:stoneSurface.bump,bumpScale:.1,roughness:.65}),visor=mat('#161f22',{metalness:.5,roughness:.3});cylinder(.38,.45,.18,darkStone,g,0,.09,0,8);roundedBox(.53,.7,.43,guard,g,0,.52,0,.08);roundedBox(.3,.3,.46,darkStone,g,0,.78,.03,.04);for(const x of [-.43,.43]){roundedBox(.3,.2,.38,guardLight,g,x,.72,0,.06);roundedBox(.18,.42,.25,guard,g,x,.45,0,.05);}
 sphere(.27,guardLight,g,0,1.03,0,1,.9,1);roundedBox(.32,.09,.05,visor,g,0,1.04,.25,.02);for(const x of [-.14,.14]){const horn=mesh(new THREE.ConeGeometry(.07,.25,5),guardLight,g,x,1.3,0);horn.rotation.z=x>0?.35:-.35;}
 const coreMesh=sphere(.1,core,g,0,.59,.25);roundedBox(.07,.37,.05,core,g,0,.59,.3,.015);return Object.assign(g,{userData:{core:coreMesh}});}
const $=s=>document.querySelector(s);
if(new URLSearchParams(location.search).has('debug'))window.__dh={camera,controls,scene,renderer,heroFactory:knight};
/* the pet's fur layers follow the tier (quality.js FUR_SHELLS), set before any cat is built */FUR.shells=furShellsFor(quality.tier);/* lighter monster models below high (creature-lod.js) */LOD.enabled=monsterLodFor(quality.tier);const live=installLive({scene,camera,controls,renderer,torchLightCount:torchLightsFor(quality.tier),playerFactory:knight,catFactory:cat,monsterFactory:sentinel,creatureFactory:createCreature,wellTemplate:well,onActivity:touch});if(window.__dh)window.__dh.live=live;
// The hero's portrait beside the hitpoints (hero-portrait.js), redrawn a few times a second.
const heroPortrait=createHeroPortrait({THREE,renderer,view:mountPortraitView(document,$('.character'))});if(window.__dh)window.__dh.portrait=heroPortrait;
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);setQuality(quality.tier);});
// The splash is opaque (style.css), so while it is open nothing is drawn at all.
let lastTime=0,lastDrawAt=null;const frameCostNow=ms=>{const gap=lastDrawAt===null?null:ms-lastDrawAt,fps=pacer.rate(ms,quality.tier);lastDrawAt=ms;return gap===null?null:frameCost(gap,performance.now()-loopStart,fps);};let loopStart=0;
renderer.setAnimationLoop(ms=>{if(document.body.classList.contains('start-open'))return;if(!pacer.shouldDraw(ms,quality.tier))return;loopStart=performance.now();/* shadows follow only when a caster moved (shadow-motion.js) */renderer.shadowMap.needsUpdate=shadowMotion.due(ms,live.motionSignature,pacer.shadowDue(ms,quality.tier));const t=ms/1000,dt=Math.min(t-lastTime,.05);lastTime=t;
 const updateAt=performance.now();live.update(t,dt);const updateMs=performance.now()-updateAt;flameFlicker.update(t);sinkDrip.update(t);canopySway.update(t);throneGleam.update(t);graveMist.update(t);graveHands.update(t,live.heroAt(heroWorld));altarEmbers.update(t);bogBubbles.update(t);gasRoil.update(t);gasEdge.update(t,dt,live.heroAt(heroWorld),gasRoil.meshes);live.setCough(gasEdge.hunch);heroPortrait.update(performance.now(),live.portraitSubject,{interval:PORTRAIT_INTERVAL_MS[quality.tier]});controls.update();renderStats.begin();huePass.update(document.getElementById('status-screen')?.classList.contains('status-hallu'),t);{/* occlusion sits out while the player drags or zooms the camera (ao-motion.js) */const ao=aoMotion.frame(ms,TIERS[quality.tier]?.ssao!==false);ambientOcclusion.enabled=ao.enabled;ambientOcclusion.blendIntensity=ao.blend;}const renderAt=performance.now();scene.updateMatrixWorld();composer.render();const renderMs=performance.now()-renderAt;{const step=adaptive.frame(ms,frameCostNow(ms),quality.tier);if(step){setQuality(step,{say:true,auto:true});showQuality();}}renderStats.end(dt,{update:updateMs,render:renderMs});
});
// Read-only renderer numbers for smoke tests.
window.roomPrototype={rendererInfo:()=>renderStats.frame(),renderStats:()=>renderStats.summary()};
