import {createShopkeeper,createWatchman,createLightItem,createShopItem} from './shop-visuals.js';
import {createGridBug} from './grid-bug.js';
import * as THREE from 'three';
import {createGroundModel} from './ground-models.js';
import {bareMore,groundNotice,groundTile} from './ground-notice.js';
import {menuKeys,autoCategory,menuCommand,menuGroups,EXT_FALLBACK,matchCommands,resolveCommand,completePrefix} from './engine-menus.js';
import {meleeDirection,confirmsPlayerMelee} from './combat-visuals.js';
import {createHeldWeapon} from './equipment.js';
import {createCentaurStatue,createOracle,createLiveFountain} from './oracle-visuals.js';
import {createAltar} from './altar.js';
import {createThrone} from './throne.js';
import {createSink} from './sink.js';
import {createGrave} from './grave.js';
import {createTrap,trapKind} from './trap.js';
import {createTerrainFeature,featureKind,AXIS_FEATURES,bridgeYaw,groundOf} from './terrain-feature.js';
import {createTree} from './tree.js';
import {createDeadTree,deadTreeShown} from './dead-tree.js';
import {createBoulder,BOULDER_SEED} from './boulder.js';
import {createStairs} from './stairs.js';
import {createLadder,ladderShown} from './ladder.js';
import {createBars} from './bars.js';
import {createDoor,createBrokenDoor} from './door.js';
import {tileKind,setDoorOpen,orientDoor,updateDoorSwings,clearDoorSwings} from './door-swing.js';
import {createFire} from './fire.js';
import {createTorchSconce} from './torch.js';
import {createLiquid} from './liquid.js';
import {createFloorKit,cellHash} from './floor.js';
import {createCorpse} from './corpse.js';
import {stageCreature,addOutlines} from './readability.js';
import {createCavern} from './cavern.js';
import {attachModelAsset} from './model-assets.js';
import {MODEL_URLS} from './asset-urls.js';
import {potionLook,groundItemCaption} from './item-looks.js';
import {levelTitle,lowHealth,parseAttributes} from './hud.js';
import {syncWandAura,syncHeldWandAura,updateHeldWandAura} from './wand-auras.js';
import {updateStepOver,STEP_RADIUS} from './step-over.js';
import {updatePickupLift,hasMagicLook,PICKUP_RADIUS} from './pickup-lift.js';
import {syncArtifactGleam,syncHeldGleam,updateHeldGleam} from './artifact-gleam.js';
import {syncHeldMagic,syncFloorMagic} from './weapon-magic.js';
import {syncScrollAura} from './scroll-auras.js';
import {syncRingAura} from './ring-auras.js';
import {syncAmuletAura} from './amulet-auras.js';
import {syncWeaponAura} from './weapon-auras.js';
import {syncPotionFx} from './potion-fx.js';
import {syncPotionAura} from './potion-auras.js';
import {createBrainSuck,poseBrainSuck} from './brain-suck.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {fxTimeline,fxHoldMs,delayTimeline} from './fx.js';
import {createExplosions} from './explosions.js';
import {createFlood} from './flood.js';
import {createSplash} from './splash.js';
import {createFlights} from './flights.js';
import {createGrab} from './grab.js';
import {createHold,poseHeld} from './hold.js';
import {createPolymorph,poseActor} from './polymorph.js';
import {createBarsMelt} from './bars-melt.js';
import {createDoorBreak} from './door-break.js';
import {animatePortal,createSheolVortex} from './portal-fx.js';
import {createVibratingSquare} from './vibrating-square.js';
import {syncWard} from './elbereth-ward.js';
import {createThroneVanish,isThronePuff} from './throne-vanish.js';
import {createDigChips} from './dig-chips.js';
import {createDigCracks} from './dig-cracks.js';
import {createDigSwing} from './dig-swing.js';
import {createDigDrop} from './dig-drop.js';
import {createLevelUp} from './level-up.js';
import {createPrayerLight} from './prayer-light.js';
import {createPrayerKneel} from './prayer-kneel.js';
import {createBreath} from './breath.js';
import {createEngulf,engulfCamera,dropEngulfCamera,poseEngulfed} from './engulf.js';
import {createSwingFx} from './swing-fx.js';
import {createHitFx} from './hit-fx.js';
import {createRays,reflectorAt,solidAt} from './rays.js';
import {createZapFlash,ZAP_WINDUP_MS} from './zap-flash.js';
import {createRayMarks} from './ray-marks.js';
import {createDeathBurst,deathLook,applyFade,restoreFade,hideDeathRing} from './deaths.js';
import {createPetrify,restoreStone} from './petrify.js';
import {combatAction,deathAction} from './combat-events.js';
import {reviveAction,riseActionFor,createRiseWatch} from './rise.js';
import {updateGait,flapStyle,wingFlap,flightBob} from './gait.js';
import {updateWereShudder} from './were-shudder.js';
import {updateFidget} from './fidget.js';
import {heroLook} from './glance.js';
import {updateDragonMenace} from './dragon-menace.js';
import {updateCockatriceHiss} from './cockatrice-hiss.js';
import {updateGhosting} from './ghosting.js';
import {updateSkulk} from './skulk.js';
import {updateTaunt} from './taunt.js';
import {updateInvoke} from './invoke.js';
import {updateHeft} from './heft.js';
import {updateRally} from './rally.js';
import {updatePonder} from './ponder.js';
import {updateKamae} from './kamae.js';
import {updateDualStance,unposeDualStance} from './dual-stance.js';
import {updateHoseFlop} from './hose-flop.js';
import {updateSlingWhirl} from './sling-whirl.js';
import {updateSalute} from './salute.js';
import {updateMonkBow} from './monk-bow.js';
import {updateCubeDrift} from './cube-drift.js';
import {updateWhipEmbers} from './whip-embers.js';
import {updateRogueProwl} from './rogue-prowl.js';
import {updateBarbarianBrood} from './barbarian-brood.js';
import {updateHealerPeer} from './healer-peer.js';
import {updateTouristGawk} from './tourist-gawk.js';
import {updateMuggerCosh} from './mugger-cosh.js';
import {updateConvictHunted} from './convict-hunted.js';
import {updateRangerDraw} from './ranger-draw.js';
import {updateCharonOar} from './charon-oar.js';
import {updatePrisonerRock} from './prisoner-rock.js';
import {tailSway} from './tail-sway.js';
import {updateTwitch} from './twitch.js';
import {updateBask} from './bask.js';
import {updateWhiffle} from './whiffle.js';
import {updateTuck} from './tuck.js';
import {updatePlod} from './plod.js';
import {updateSkitter} from './skitter.js';
import {updateTripod} from './tripod.js';
import {slideTo,beginHop,endHop} from './slide.js';
import {perchHeight} from './perch.js';
import {updateTrudge} from './trudge.js';
import {updateStrawFlop} from './straw-flop.js';
import {updateHemSway} from './hem-sway.js';
import {updateSerpentStaff} from './serpent-staff.js';
import {updateFlap} from './puggaree-flap.js';
import {findPrey,updateStalk,clearStalk} from './stalk.js';
import {createActionQueue,enqueueAction,clearActionPose,updateActions,holdBackMs,findActor,queueCombat,queueDeath,queueThrows} from './actions.js';

// Only window-port observations enter this view. No prediction of game rules.
export function installLive({scene,camera,controls,playerFactory,catFactory,monsterFactory,creatureFactory,wellTemplate,demoObjects,onDemo,onMode}) {
 const group=new THREE.Group();scene.add(group);group.visible=false;
 const tiles=new Map(),actors=new Map(),wells=new Map(),groundItems=new Map(),liftingItems=new Set();let active=false,pending=null,latest=null,token='',menu=null,commands=null,lines=[],origin=null,lastLevel='',source,pollNow=null;
 const $=s=>document.querySelector(s);
 const WEAPON_CLASS=2,ARMOR_CLASS=3,RING_CLASS=4,AMULET_CLASS=5,POTION_CLASS=8,SCROLL_CLASS=9,COIN_CLASS=12;
 const button=document.createElement('button');button.textContent='Live UnNetHack';button.id='live-mode';$('.buttons').prepend(button);
 const panel=document.createElement('section');panel.id='engine-panel';panel.hidden=true;panel.innerHTML='<small>UNNETHACK · LIVE ENGINE</small><p id="engine-line" aria-live="polite"></p><div id="engine-messages" role="log"></div><div id="engine-status"></div><div id="engine-seen"></div><div id="engine-prompt"></div>';document.body.append(panel);
 // Engine commands live in the footer next to the demo's buttons, so both modes share one control row.
 const actions=document.createElement('div');actions.className='engine-actions';actions.hidden=true;actions.innerHTML='<button data-key="105">Inventory</button><button data-key="44">Pick up</button><button data-key="111">Open door</button><button data-key="113">Quaff</button><button data-key="83">Save & exit</button>';$('.buttons').prepend(actions);
 const esc=text=>String(text).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 function setPrompt(text){$('#engine-prompt').innerHTML=text?`<span class="dot"></span>${esc(text)}`:'';}
 const attributesEl=document.createElement('div');attributesEl.className='attributes';$('.stats').after(attributesEl);
 function renderAttributes({attributes,alignment}){
   attributesEl.innerHTML=attributes.map(({label,value})=>`<span>${label} <b>${esc(value)}</b></span>`).join('')+(alignment?`<span class="alignment">${esc(alignment.toUpperCase())}</span>`:'');
 }
 // On arrival at a named level or branch, its name fades in over the scene for a few seconds.
 const levelBanner=document.createElement('div');levelBanner.id='level-banner';levelBanner.setAttribute('aria-live','polite');document.body.append(levelBanner);
 let shownTitle=null;
 function announceLevel(level){
   if(level.title===shownTitle)return;shownTitle=level.title;if(!level.named)return;
   levelBanner.innerHTML=`<small>${esc(level.place)}</small><strong>${esc(level.title)}</strong>`;
   levelBanner.classList.remove('show');void levelBanner.offsetWidth;levelBanner.classList.add('show');
 }
 // Parse the bottom status line into the same label/value pairs the character panel uses.
 function renderStatus(text){
   // The first status line carries the attributes (hud.js); it is drawn under the stats and
   // never replaces the gold/power/exp line, even while it is still being written.
   if(/^\s*\[/.test(text)){const attrs=parseAttributes(text);if(attrs)renderAttributes(attrs);return;}
   const el=$('#engine-status'),num=re=>text.match(re);el.title=text;
   const gold=num(/\$:(\d+)/),power=num(/Pw:(\d+)\((\d+)\)/),exp=num(/Exp:(\d+)/);
   if(!gold&&!power&&!exp){el.textContent=text;return;}
   const conditions=(text.split(/T:\d+/)[1]||'').trim().split(/\s+/).filter(Boolean);
   el.innerHTML=[gold&&`<span>GOLD <b>${gold[1]}</b></span>`,power&&`<span>POWER <b>${power[1]} / ${power[2]}</b></span>`,exp&&`<span>EXP <b>${exp[1]}</b></span>`,...conditions.map(c=>`<span class="condition">${esc(c)}</span>`)].filter(Boolean).join('');
 }
 // Mirror the demo legend: what is in view, as dot bullets; pets go to the companion slot.
 function renderSurroundings(frame){
   const seenItems=[],pets=[],names=new Set();
   for(const cell of frame.cells){
     if(!cell.visible||(cell.x===frame.player.x&&cell.z===frame.player.z&&cell.kind!=='object'))continue;
     if(cell.kind==='pet')pets.push(cell.name);
     else if(cell.kind==='monster'&&!names.has(cell.name)){names.add(cell.name);seenItems.push({name:cell.name,tone:cell.peaceful?'gold':'orange'});}
     else if(['fountain','altar','throne','sink','grave','up','down'].includes(cell.terrain)&&!names.has(cell.terrain)){names.add(cell.terrain);seenItems.push({name:{fountain:'Fountain',altar:'Altar',throne:'Throne',sink:'Sink',grave:'Grave',up:'Stairs up',down:'Stairs down'}[cell.terrain],tone:'cyan'});}
   }
   $('#engine-seen').innerHTML=seenItems.length?seenItems.slice(0,5).map(({name,tone})=>`<div><i class="${tone}"></i> ${esc(name)}</div>`).join(''):'<div class="quiet">Nothing stirs in view</div>';
   // With no pet in view the companion slot is left out rather than saying so.
   $('.companion').hidden=!pets.length;
   $('.companion').innerHTML=pets.length?`<span class="dot"></span> ${esc(pets[0])}${pets.length>1?` +${pets.length-1}`:''}<small>YOUR COMPANION · UNNETHACK</small>`:'';
 }
 const dialog=document.createElement('dialog');dialog.id='engine-dialog';document.body.append(dialog);
 const groundPanel=document.createElement('aside');groundPanel.id='ground-notice';groundPanel.hidden=true;groundPanel.setAttribute('aria-live','polite');groundPanel.setAttribute('aria-label','Items on this tile');document.body.append(groundPanel);let groundPanelTile=null;
 const lantern=new THREE.PointLight(0xffd49c,22,11,2);group.add(lantern);
 const wall=new THREE.MeshStandardMaterial({color:'#52605f',roughness:.88}),floorGeo=new RoundedBoxGeometry(.97,.14,.97,3,.035),wallGeo=new RoundedBoxGeometry(.97,.7,.97,3,.045);
 // Torches are real light sources: a fixed pool of point lights follows the torches
 // nearest the hero. The pool size never changes, so materials never recompile.
 const TORCH_LIGHTS=8,TORCH_INTENSITY=15,LIVE_AMBIENT=.68,RAY_FLASH_INTENSITY=60,BLAST_LIGHT_INTENSITY=45,BREATH_LIGHT_INTENSITY=30;
 const torchLights=Array.from({length:TORCH_LIGHTS},()=>{const l=new THREE.PointLight(0xff9a48,0,6,2);l.userData={tile:null,level:0};group.add(l);return l;});
 const ambientLights=scene.children.filter(o=>o.isHemisphereLight||o.isDirectionalLight).map(light=>({light,base:light.intensity}));
 const torchHaloMaterial=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,190,110,.55)');g.addColorStop(.35,'rgba(255,130,50,.18)');g.addColorStop(1,'rgba(255,100,30,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});})();
 // Integer hash so torches scatter along a wall instead of lining a whole row.
 function hasTorch(x,z){return cellHash(x,z)%9===0;}
 const floorKit=createFloorKit();
 const cavern=createCavern({group,scene,camera,controls});
 function updateTorchLights(t,dt){
   const rank=tile=>tile.position.distanceToSquared(hero.g.position)+(tile.userData.fog.visible?16:0);
   const wanted=new Set([...tiles.values()].filter(tile=>tile.userData.torch).sort((a,b)=>rank(a)-rank(b)).slice(0,TORCH_LIGHTS));
   const held=new Set(torchLights.map(l=>l.userData.tile));
   for(const tile of wanted){if(held.has(tile))continue;const free=torchLights.find(l=>!l.userData.tile);if(!free)break;free.userData.tile=tile;free.userData.level=0;free.position.copy(tile.position).setY(1.15);}
   const ease=1-Math.exp(-dt*5);
   for(const l of torchLights){const {tile}=l.userData;if(!tile){l.intensity=0;continue;}
     if(!tile.parent){l.userData.tile=null;l.intensity=0;continue;}
     const target=wanted.has(tile)?(tile.userData.fog.visible?.55:1):0;l.userData.level+=(target-l.userData.level)*ease;
     if(!target&&l.userData.level<.02){l.userData.tile=null;l.intensity=0;continue;}
     const p=tile.userData.torch.phase,flicker=1+Math.sin(t*11+p)*.09+Math.sin(t*19.3+p*1.7)*.05+Math.sin(t*3.1+p)*.04;
     l.intensity=TORCH_INTENSITY*l.userData.level*flicker;
   }
 }
 function box(geo,mat,parent,x,y,z){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 function label(text,color='#f0d9b0'){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='rgba(10,20,20,.68)';ctx.beginPath();ctx.roundRect(54,16,404,64,12);ctx.fill();ctx.font='30px system-ui';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,256,61);const texture=new THREE.CanvasTexture(c),material=new THREE.SpriteMaterial({map:texture,depthTest:false});const s=new THREE.Sprite(material);s.scale.set(1.3,.25,1);s.position.y=1.7;s.userData.dispose=()=>{texture.dispose();material.dispose();};return s;}
 function release(object){object.traverse(o=>o.userData.dispose?.());group.remove(object);}
 function clear(){for(const o of tiles.values())release(o);for(const a of actors.values()){restoreFade(a);release(a.g);}for(const o of groundItems.values())release(o);for(const o of liftingItems)release(o);liftingItems.clear();for(const w of wells.values())release(w);tiles.clear();actors.clear();groundItems.clear();wells.clear();}
 function pickupIcon(cell){
   const icon=new THREE.Group(), kind=cell.object?.kind||'item', cls=cell.object?.class||0, itemName=(cell.object?.name||cell.name||'').toLowerCase();
   // Older bridge processes expose statues as generic objects. Keep the visual path
   // usable while they are being replaced; the current bridge supplies creature directly.
   const statueCreature=cell.object?.creature||({6746:'gecko'}[cell.glyph]);
   if((kind==='statue'||itemName==='statue')&&/centaur/i.test(statueCreature||'')){const statue=createCentaurStatue(statueCreature);const caption=label(statueCreature,'#d7c8a7');caption.position.y=1.55;statue.add(caption);return statue;}
   const lightItem=createLightItem(cell.object?.lit?`${itemName} (lit)`:itemName);if(lightItem){const caption=label(groundItemCaption(cell),'#d7c8a7');caption.position.y=.9;lightItem.add(caption);return lightItem;}
   const shopItem=createShopItem(itemName);if(shopItem){const caption=label(groundItemCaption(cell),'#d7c8a7');caption.position.y=.82;shopItem.add(caption);return shopItem;}
   const warm=new THREE.MeshStandardMaterial({color:kind==='corpse'?0x72534a:cls===POTION_CLASS?0x5bd0c7:cls===WEAPON_CLASS?0xd9b15e:0xc9a86b,emissive:kind==='corpse'?0x241314:0x362718,roughness:.42,metalness:cls===WEAPON_CLASS?.65:.18});
   const edge=new THREE.MeshStandardMaterial({color:kind==='corpse'?0xb9a189:0xe8d8aa,roughness:.55,metalness:cls===WEAPON_CLASS?.7:.25});
   const add=(geometry,material=warm,x=0,y=.34,z=0)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;icon.add(m);return m;};
   const dedicated=kind==='corpse'||kind==='statue'?null:createGroundModel({color:cell.color,...cell.object,name:itemName});
   if(dedicated){icon.add(dedicated);icon.userData.restingWeapon=true;icon.userData.dispose=()=>dedicated.userData.dispose();
   }else if((kind==='statue'||itemName==='statue')&&statueCreature&&creatureFactory){
     const sculpture=creatureFactory({name:statueCreature,symbol:cell.object?.creatureSymbol,color:cell.object?.creatureColor}).g;
     const stoneMaterials=[new THREE.MeshStandardMaterial({color:0x898b86,roughness:.98}),new THREE.MeshStandardMaterial({color:0x777b78,roughness:1})];
     sculpture.traverse(o=>{if(o.isMesh){o.material=stoneMaterials[o.geometry?.uuid?.charCodeAt?.(0)%2||0];o.castShadow=o.receiveShadow=true;}});
     sculpture.scale.multiplyScalar(.75);sculpture.position.y=.06;icon.add(sculpture);
     const base=new THREE.Mesh(new THREE.CylinderGeometry(.38,.42,.07,12),stoneMaterials[0]);base.position.y=.035;icon.add(base);
     icon.userData.restingWeapon=true;icon.name=`Stone statue of ${statueCreature}`;
     icon.userData.dispose=()=>{const geometries=new Set();sculpture.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});geometries.forEach(geo=>geo.dispose());base.geometry.dispose();stoneMaterials.forEach(material=>material.dispose());};
   }else if(kind==='corpse'){
     // The monster's own model, knocked over where it fell (corpse.js); cell.name is the monster.
     const corpse=createCorpse(cell.object?.name||cell.name,cell.color,cellHash(cell.x|0,cell.z|0,11),{creatureFactory,symbol:cell.object?.creatureSymbol});icon.add(corpse);
     icon.userData.restingWeapon=true;icon.userData.dispose=()=>corpse.userData.dispose();
   } else if(/boulder|large rock/.test(itemName)){
     const boulder=createBoulder(BOULDER_SEED);icon.add(boulder);icon.userData.dispose=()=>boulder.userData.dispose();
   } else if(cls===WEAPON_CLASS){
     const weapon=createHeldWeapon({name:itemName});
     const pose=new THREE.Group();pose.rotation.y=-.65;icon.add(pose);
     weapon.rotation.x=-Math.PI/2;weapon.scale.setScalar(.8);weapon.position.set(0,.052,.3);pose.add(weapon);
     icon.userData.restingWeapon=true;
   } else if(cls===COIN_CLASS){
     const coinMats=[new THREE.MeshStandardMaterial({color:0xd9a93c,metalness:.95,roughness:.17,emissive:0x4a3008,emissiveIntensity:.16}),new THREE.MeshStandardMaterial({color:0xeabb48,metalness:.95,roughness:.14,emissive:0x523509,emissiveIntensity:.18}),new THREE.MeshStandardMaterial({color:0xc79a34,metalness:.93,roughness:.2,emissive:0x3d2706,emissiveIntensity:.14})],coinStampMats=[new THREE.MeshStandardMaterial({color:0xf2d578,metalness:.92,roughness:.2}),new THREE.MeshStandardMaterial({color:0xfae79a,metalness:.92,roughness:.16})],shadow=new THREE.MeshBasicMaterial({color:0x140e08,transparent:true,opacity:.48,depthWrite:false});
     const ground=add(new THREE.CircleGeometry(.19,24),shadow,0,.002,0);ground.rotation.x=-Math.PI/2;
     const pieces=[[-.108,-.066,0,.2,0,.05],[-.042,-.09,0,-.4,0,0],[.036,-.084,0,.7,.04,-.03],[.102,-.036,0,-.1,0,0],[-.12,.006,0,.5,0,.08],[-.06,.006,1,-.6,.08,0],[.012,-.012,1,.4,0,0],[.09,.018,0,-.3,0,-.06],[-.096,.06,0,.8,0,0],[-.024,.066,1,.1,.05,.04],[.048,.06,1,-.5,0,0],[.12,.06,0,.3,0,.08],[-.024,-.024,2,.6,0,0],[-.078,-.018,1,-.2,.1,-.04],[.042,.006,2,.5,0,0],[.012,.072,2,-.8,.06,0],[.072,-.048,1,.15,0,-.08],[-.132,-.036,0,-.5,0,.04]];
     const coinPile=[];
     for(const [i,[x,z,layer,rotation,tiltX,tiltZ]] of pieces.entries()){const y=.016+layer*.017,fallStart=y+.42+layer*.06,coin=coinMats[i%coinMats.length],coinStamp=coinStampMats[i%coinStampMats.length];const disk=add(new THREE.CylinderGeometry(.046,.046,.02,16),coin,x,fallStart,z);disk.rotation.set(tiltX,rotation,tiltZ);const stamp=add(new THREE.CylinderGeometry(.016,.016,.003,10),coinStamp,x,fallStart+.0115,z);stamp.rotation.set(tiltX,rotation,tiltZ);coinPile.push({disk,stamp,target:y,velocity:0,delay:layer*.09+(x+.3)*.018,settled:false});}
     icon.userData.coinPile=coinPile;
     icon.userData.dispose=()=>{coinMats.forEach(material=>material.dispose());coinStampMats.forEach(material=>material.dispose());shadow.dispose();};
   } else if(cls===POTION_CLASS){
     const look=potionLook((cell.object?.appearance||itemName).toLowerCase(),cell.color);
     const glass=new THREE.MeshPhysicalMaterial({color:look.glass,roughness:.16,metalness:.02,transmission:look.transmission,transparent:true,opacity:look.opacity}),liquid=new THREE.MeshStandardMaterial({color:look.liquid,emissive:look.liquid,emissiveIntensity:look.emissiveIntensity,roughness:.3});
     const bottle=add(new THREE.SphereGeometry(.18,16,10),glass,0,.3,0);bottle.scale.y=1.18;const fill=add(new THREE.SphereGeometry(.145,14,9),liquid,0,.28,0);fill.scale.y=1.18;add(new THREE.CylinderGeometry(.065,.065,.14,10),glass,0,.57,0);add(new THREE.CylinderGeometry(.075,.085,.045,12),edge,0,.66,0);
     icon.userData.dispose=()=>{glass.dispose();liquid.dispose();};
   } else if(cls===ARMOR_CLASS){
     const helm=new THREE.MeshStandardMaterial({color:0x89979a,metalness:.78,roughness:.34}),visorMat=new THREE.MeshStandardMaterial({color:0x182126,metalness:.5,roughness:.3});const dome=add(new THREE.SphereGeometry(.27,16,10),helm,0,.32,0);dome.scale.set(.86,.7,.7);add(new THREE.BoxGeometry(.08,.42,.06),visorMat,0,.36,.19);add(new THREE.ConeGeometry(.06,.2,5),edge,0,.57,0);
     icon.userData.dispose=()=>{helm.dispose();visorMat.dispose();};
   } else if(cls===RING_CLASS){
     const jewelry=new THREE.MeshStandardMaterial({color:0xb49a5e,metalness:.8,roughness:.3}),ring=add(new THREE.TorusGeometry(.16,.045,8,20),jewelry,0,.3,0);ring.rotation.x=Math.PI/2;const highlight=add(new THREE.SphereGeometry(.045,8,6),jewelry,0,.3,.15);highlight.scale.set(1,.7,.6);
     icon.userData.dispose=()=>jewelry.dispose();
   } else if(cls===AMULET_CLASS){
     const jewelry=new THREE.MeshStandardMaterial({color:0xb49a5e,metalness:.78,roughness:.32}),chain=add(new THREE.TorusGeometry(.15,.018,6,18),jewelry,0,.47,0);chain.rotation.x=Math.PI/2;const pendant=add(new THREE.OctahedronGeometry(.1),jewelry,0,.27,.02);pendant.scale.y=1.25;
     icon.userData.dispose=()=>jewelry.dispose();
   } else if(cls===SCROLL_CLASS){
     const parchment=new THREE.MeshStandardMaterial({color:0xcbb889,roughness:.72}),ribbon=new THREE.MeshStandardMaterial({color:0x714243,roughness:.62});const roll=add(new THREE.CylinderGeometry(.13,.13,.42,12),parchment,0,.36,0);roll.rotation.z=Math.PI/2;for(const x of [-.21,.21]){const end=add(new THREE.CylinderGeometry(.15,.15,.035,12),parchment,x,.36,0);end.rotation.z=Math.PI/2;}add(new THREE.BoxGeometry(.045,.08,.11),ribbon,0,.36,.0);
     icon.userData.dispose=()=>{parchment.dispose();ribbon.dispose();};
   } else {
     add(new THREE.OctahedronGeometry(.2),warm,0,.38,0);
   }
   const caption=label(kind==='corpse'?`corpse of ${cell.name||'creature'}`:groundItemCaption(cell),'#d7c8a7');caption.scale.set(1.2,.22,1);caption.position.y=1.05;icon.add(caption);const extraDispose=icon.userData.dispose;icon.userData.dispose=()=>{warm.dispose();edge.dispose();extraDispose?.();};return icon;
 }
 // Traps and the other known features (ice, bog, drawbridges, ice walls, clouds, air) get a
 // model once their own symbol is showing (a monster or item on top hides it);
 // anything else keeps the symbol label.
 function dressFeature(tile,cell){
  const trap=trapKind(cell.symbol,cell.color,cell.trap),other=trap?null:featureKind(cell.symbol,cell.color);
  const kind=trap||other,portal=trap==='portal'&&cell.portal||null,key=portal?`portal:${portal}`:kind||(tile.userData.featureKey?null:'label');
  if(!key||key===tile.userData.featureKey)return;
  if(tile.userData.feature){tile.userData.feature.traverse(o=>o.userData.dispose?.());tile.remove(tile.userData.feature);}
  // Portals and the vibrating square animate themselves (portal-fx.js, vibrating-square.js).
  const seed=cell.x*53+cell.z*29;
  const model=portal==='sheol'?createSheolVortex(seed):trap==='vibrating'?createVibratingSquare(seed):trap?createTrap(trap,seed):other?createTerrainFeature(other,cell.x*41+cell.z*23):label(String.fromCharCode(cell.symbol));
  if(trap==='portal')animatePortal(model,portal||'other',seed);
  if(!kind)model.position.y=.35;
  tile.userData.slab.visible=!model.userData.hidesFloor;
  tile.add(model);tile.userData.feature=model;tile.userData.featureKey=key;tile.userData.axisFeature=AXIS_FEATURES.has(key)?model:null;
 }
 // Stairs and ladders share the up/down terrain; the glyph's colour tells them apart while
 // nothing covers it (ladder.js), so a square first seen occupied shows stairs until then.
 function dressStairs(tile,cell){
  const ladder=ladderShown(cell)??tile.userData.ladder??false,key=`${cell.terrain}:${ladder}`;
  if(key===tile.userData.stairsKey)return;
  for(const o of tile.userData.stairs||[]){o.traverse(c=>c.userData.dispose?.());tile.remove(o);}
  const seed=cell.x*131+cell.z,model=(ladder?createLadder:createStairs)(cell.terrain,seed);
  const caption=label(`${cell.terrain==='up'?'↑':'↓'} ${ladder?'ladder':'stone stairs'}`);
  tile.add(model,caption);tile.userData.stairs=[model,caption];tile.userData.stairsKey=key;tile.userData.ladder=ladder;
 }
 // Dead trees share the tree terrain; the glyph's colour tells them apart while nothing
 // covers it (dead-tree.js), and a tree withered by a death ray swaps in place.
 function dressTree(tile,cell){
  const dead=deadTreeShown(cell)??tile.userData.deadTree??false;
  if(tile.userData.tree&&dead===tile.userData.deadTree)return;
  if(tile.userData.tree){tile.userData.tree.userData.dispose?.();tile.remove(tile.userData.tree);}
  const model=(dead?createDeadTree:createTree)(cell.x*97+cell.z);
  tile.add(model);tile.userData.tree=model;tile.userData.deadTree=dead;
 }
 function setDim(tile,dim){tile.userData.fog.visible=dim;tile.userData.fog.material.opacity=dim?.72:0;tile.userData.fog.material.needsUpdate=true;}
 let coughHunch=0,coughApplied=0;const hero=playerFactory();hero.setWeapon?.(null);hero.actions=createActionQueue();group.add(hero.g);
 const swingFx=createSwingFx(THREE,group);const hitFx=createHitFx(THREE,group);const rays=createRays(THREE,group);const zapFlash=createZapFlash(THREE,group);const rayMarks=createRayMarks(THREE,group);const rayFlashLight=new THREE.PointLight(0xdce6ff,0,18,1.2);group.add(rayFlashLight);const explosions=createExplosions(THREE,group);const blastLight=new THREE.PointLight(0xffa050,0,9,1.4);group.add(blastLight);const flood=createFlood(THREE,group);let flooding=false;const splash=createSplash(THREE,group);const flights=createFlights(THREE,group);const grab=createGrab(THREE,group,{onSplash:s=>splash.add(s)});const brainSuck=createBrainSuck(THREE,group);const hold=createHold(THREE,group);const poly=createPolymorph(THREE,group);const barsMelt=createBarsMelt(THREE,group);const doorBreak=createDoorBreak(THREE,group);const breath=createBreath(THREE,group);const engulf=createEngulf(THREE,group);let swingTarget=null;
 const deathFx=createDeathBurst(THREE);group.add(deathFx.points);const petrify=createPetrify({onBurst:(b,at,a)=>deathFx.burst(b.style,at,{dir:b.dir,...deathLook(a)})});const throneVanish=createThroneVanish(THREE,group);const digChips=createDigChips(THREE,group);const digCracks=createDigCracks(THREE,group);const digSwing=createDigSwing();const digDrop=createDigDrop();const levelUp=createLevelUp(THREE,group);const prayerLight=createPrayerLight(THREE,group);const prayerKneel=createPrayerKneel();
 function apply(frame){const prevFrame=latest;latest=frame;if(!active)return;
   const where=levelTitle(frame);$('.location small').textContent=where.place;$('.location h1').textContent=where.title;announceLevel(where);
   if(groundPanelTile!==groundTile(frame)){groundPanel.hidden=true;groundPanelTile=null;}
   if(Array.isArray(frame.ground))showGround(frame.ground);
   hero.setWeapon?.(frame.player.weapon??null);syncHeldWandAura(hero,frame.player.weapon??null);syncHeldGleam(hero,frame.player.weapon??null);syncHeldMagic(hero,frame.player.weapon??null);
   hero.setHelmet?.(frame.player.helmet??null);if('shield' in frame.player)hero.setShield?.(frame.player.shield);if('offhand' in frame.player)hero.setOffhand?.(frame.player.offhand);addOutlines(hero.g);
   const level=`${frame.branch}:${frame.depth}`;const newLevel=level!==lastLevel;if(newLevel){clear();throneVanish.clear();digChips.clear();digCracks.clear();digSwing.clear(hero);digDrop.arrive();levelUp.clear();prayerLight.clear();prayerKneel.clear(hero);clearDoorSwings();rays.clear();zapFlash.clear(hero);rayMarks.clear();explosions.clear();flood.clear();flooding=false;splash.clear();flights.clear();grab.clear();brainSuck.clear();hold.clear();poseHeld(hero,null);poly.clear();barsMelt.clear();doorBreak.clear();breath.clear();engulf.clear();dropEngulfCamera(camera,controls);poseEngulfed(hero,null);poseActor(hero,null);origin={x:frame.player.x,z:frame.player.z};lastLevel=level;clearActionPose(hero,hero.actions);hero.actions=createActionQueue();hero.g.position.set(0,0,0);hero.hop=hero.hopAt=null;camera.position.set(9,10.7,13.1);controls.target.set(0,0,0);}
   if(!newLevel&&flood.add(prevFrame,frame))flooding=true;splash.flushMessages(frame);grab.frame(frame);hold.frame(frame);poly.frame(frame);barsMelt.frame(frame);doorBreak.frame(frame);engulf.frame(frame);
   const seen=new Set(),seenActors=new Set(),seenWells=new Set();
   for(const cell of frame.cells){const id=`${cell.x},${cell.z}`,x=cell.x-origin.x,z=cell.z-origin.z;
     if(cell.terrain!=='unknown'){
       seen.add(id);let tile=tiles.get(id);if(tile&&(tile.userData.type!==tileKind(cell)||tile.userData.ground!==groundOf(cell))){release(tile);tiles.delete(id);tile=null;}
       if(!tile){tile=new THREE.Group();tile.position.set(x,0,z);tile.userData.type=tileKind(cell);tile.userData.ground=groundOf(cell);const slab=box(floorGeo,floorKit.material(cell.x,cell.z),tile,0,-.1,0);tile.userData.slab=slab;floorKit.dress(slab,tile,cell.x,cell.z,groundOf(cell));const fog=box(new THREE.PlaneGeometry(.98,.98),new THREE.MeshBasicMaterial({color:0x101a35,transparent:true,opacity:0,depthWrite:false}),tile,0,.012,0);fog.rotation.x=-Math.PI/2;tile.userData.fog=fog;
         if(cell.terrain==='altar')tile.add(createAltar());
         if(cell.terrain==='throne')tile.add(createThrone());
         if(cell.terrain==='sink')tile.add(createSink());
         if(cell.terrain==='grave')tile.add(createGrave(cell.x*31+cell.z*17));
         if(cell.terrain==='bars'){const grate=createBars(cell.x*53+cell.z*29);tile.add(grate);tile.userData.grate=grate;}
         if(cell.terrain==='wall'){
          box(wallGeo,wall,tile,0,.28,0);
          if(hasTorch(cell.x,cell.z)){const sconce=createTorchSconce(cell.x*43+cell.z*71);tile.add(sconce);const fire=createFire(cell.x+cell.z);fire.position.copy(sconce.userData.flame);tile.add(fire);const halo=new THREE.Sprite(torchHaloMaterial);halo.position.copy(sconce.userData.flame).setY(1.12);halo.scale.setScalar(.9);tile.add(halo);tile.userData.torch={phase:(cell.x*3.7+cell.z*5.3)%(Math.PI*2)};}
         }
         if(['door','broken-door'].includes(tileKind(cell))){const doorGroup=(tileKind(cell)==='door'?createDoor:createBrokenDoor)(cell.x*61+cell.z*37);tile.add(doorGroup);tile.userData.door=doorGroup;}
         if(['water','lava'].includes(groundOf(cell))){slab.visible=false;const liquid=createLiquid(groundOf(cell),cellHash(cell.x,cell.z,6));tile.add(liquid);tile.userData.liquid=liquid;}
         group.add(tile);tiles.set(id,tile);
       }if(cell.terrain==='feature')dressFeature(tile,cell);if(cell.terrain==='up'||cell.terrain==='down')dressStairs(tile,cell);if(cell.terrain==='tree')dressTree(tile,cell);syncWard(tile,cell);tile.visible=true;tile.scale.y=1;setDim(tile,!cell.visible&&cell.remembered);
       if(tile.userData.axisFeature){
        // Face the drawbridge across its moat, the hinge toward the gatehouse (terrain-feature.js).
        const yaw=bridgeYaw(tile.userData.featureKey,(dx,dz)=>frame.cells.find(c=>c.x===cell.x+dx&&c.z===cell.z+dz)?.terrain);
        if(yaw!==null)tile.userData.axisFeature.rotation.y=yaw;
       }
       if(tile.userData.grate){
        const connected=(dx,dz)=>frame.cells.some(c=>c.x===cell.x+dx&&c.z===cell.z+dz&&['wall','bars','door'].includes(c.terrain));
        const horizontal=Number(connected(-1,0))+Number(connected(1,0)),vertical=Number(connected(0,-1))+Number(connected(0,1));
        if(horizontal!==vertical)tile.userData.grate.rotation.y=vertical>horizontal?Math.PI/2:0;
       }
       if(tile.userData.door){
        const connected=(dx,dz)=>frame.cells.some(c=>c.x===cell.x+dx&&c.z===cell.z+dz&&['wall','bars','door'].includes(c.terrain));
        const horizontal=Number(connected(-1,0))+Number(connected(1,0)),vertical=Number(connected(0,-1))+Number(connected(0,1));
        if(horizontal!==vertical)orientDoor(tile.userData.door,vertical>horizontal?Math.PI/2:0);
        setDoorOpen(tile.userData.door,cell.door==='open',{dx:frame.player.x-cell.x,dz:frame.player.z-cell.z});
       }
     }
     if(cell.terrain==='fountain'){seenWells.add(id);if(!wells.has(id)){const w=createLiveFountain(wellTemplate);w.position.set(x,0,z);group.add(w);wells.set(id,w);}wells.get(id).visible=cell.visible||cell.remembered;}
     if(cell.x===frame.player.x&&cell.z===frame.player.z)continue;
       if(cell.kind==='object'){
       const key=`${id}:${cell.glyph}:${cell.object?.creature||''}${cell.object?.lit?':lit':''}`,seenObject=cell.visible||cell.remembered;seenActors.add(key);
       if(seenObject&&!groundItems.has(key)){const item=petrify.adopt(actors,cell,x,z)||pickupIcon(cell);item.position.set(x,0,z);group.add(item);groundItems.set(key,item);}
       const item=groundItems.get(key);if(item){item.visible=cell.visible;syncWandAura(item,cell.object,key);syncArtifactGleam(item,cell.object,key);syncFloorMagic(item,cell.object,key);syncScrollAura(item,cell.object,key);syncRingAura(item,cell.object,key);syncAmuletAura(item,cell.object,key);syncWeaponAura(item,cell.object,key);syncPotionFx(item,cell.object,key);syncPotionAura(item,cell.object,key);if(!item.userData.coinPile&&!item.userData.restingWeapon)item.position.y=Math.sin(performance.now()/600+x+z)*.025;}
     }
       if(cell.kind==='monster'||cell.kind==='pet'){
       const key=`${id}:${cell.glyph}`;seenActors.add(key);let a=actors.get(key);const fresh=!a;
       if(!a){for(const [previous,candidate] of actors){if(!seenActors.has(previous)&&!candidate.actions?.dead&&candidate.glyph===cell.glyph&&Math.hypot(candidate.g.position.x-x,candidate.g.position.z-z)<2.1){a=candidate;actors.delete(previous);actors.set(key,a);break;}}}
       if(!a){const disposition=cell.kind==='pet'?'pet':cell.peaceful?'peaceful':'hostile';if(cell.kind==='pet'&&/cat|kitten/.test(cell.name)){a=catFactory();stageCreature(a.g,{disposition});a.g.add(label(cell.name,'#b8ead3'));}else{const made=/^shopkeeper$/i.test(cell.name||'')?createShopkeeper():/^watchman$/i.test(cell.name||'')?createWatchman():/^grid bug$/i.test(cell.name||'')?createGridBug():/^oracle$/i.test(cell.name||'')?createOracle():creatureFactory?creatureFactory(cell):monsterFactory();a=made.g?made:{g:made};stageCreature(a.g,{disposition});a.g.add(label(cell.name||'creature',cell.kind==='pet'?'#b8ead3':cell.peaceful?'#e8dfb0':'#e9c8ad'));attachModelAsset(a,cell.name,MODEL_URLS);}a.flap=flapStyle(cell.name);a.g.position.set(x,0,z);group.add(a.g);actors.set(key,a);}
       if(a.actions?.finished){clearActionPose(a,a.actions);restoreFade(a);restoreStone(a);a.actions=createActionQueue();}
       a.glyph=cell.glyph;a.species=(cell.name||'').toLowerCase();a.target=new THREE.Vector3(x,perchHeight(cell.terrain),z);a.cell=`${cell.x},${cell.z}`;
       // A monster that just rose from its corpse gets up off the floor instead of popping in (rise.js).
       if(fresh){const risen=rises.claim(cell.x,cell.z,cell.name||null,performance.now());if(risen){a.actions??=createActionQueue();enqueueAction(a.actions,riseActionFor(risen));}}
       // Invisible-and-sensed monsters (telepathy, warning) still send a cell, but the model,
       // its label and its disposition ring — all children of a.g — should stay hidden.
       a.g.visible=!cell.invisible;
     }
   }
   for(const [id,t] of tiles)if(!seen.has(id)){release(t);tiles.delete(id);}
   cavern.rebuild(tiles,origin,newLevel);
   for(const [id,a] of actors)if(!seenActors.has(id)){restoreFade(a);release(a.g);actors.delete(id);}
   for(const [id,item] of groundItems)if(!seenActors.has(id)){if(hasMagicLook(item)&&item.visible&&Math.hypot(item.position.x-hero.g.position.x,item.position.z-hero.g.position.z)<PICKUP_RADIUS)liftingItems.add(item);else release(item);groundItems.delete(id);}
   for(const [id,w] of wells)if(!seenWells.has(id)){release(w);wells.delete(id);}
   hero.target=new THREE.Vector3(frame.player.x-origin.x,perchHeight(frame.cells.find(c=>c.x===frame.player.x&&c.z===frame.player.z)?.terrain),frame.player.z-origin.z);renderSurroundings(frame);
   $('#hp').textContent=`${frame.player.hp} / ${frame.player.maxhp}`;$('.character').classList.toggle('low-hp',lowHealth(frame.player.hp,frame.player.maxhp));$('#healthbar').style.width=`${100*frame.player.hp/Math.max(1,frame.player.maxhp)}%`;$('#turn').textContent=frame.turn;$('.stats').innerHTML=`<span>AC <b>${frame.player.ac}</b></span><span>LVL <b>${frame.player.level}</b></span><span>TURN <b id="turn">${frame.turn}</b></span>`;
 }
 const rises=createRiseWatch();
 let meleeIntent=null,queuedCommand=null,combatStream=false,heldFrame=null,heldTimer=null,fxHoldUntil=0;
 // A bridge that sends combat events drives the action layer; text matching is the fallback for older engines.
 const findSide=s=>findActor(actors,s.x,s.z,{name:s.name,origin});
 // Whoever stands where a thrown object starts (throw-motion.js): the hero or a seen monster.
 const findThrower=(x,z)=>latest?.player&&x===latest.player.x&&z===latest.player.z?hero:findActor(actors,x,z,{exact:true});
 function combatEvent(v){const c=v.type==='combat'?combatAction(v):deathAction(v);if(!c)return;const log=globalThis.deanhackCombat??=[];log.push(c);if(log.length>16)log.shift();if(v.type!=='combat'){grab.death(c);queueDeath(c,findSide);return;}grab.combat(c);brainSuck.combat(c);combatStream=true;if(c.heroAttacks){meleeIntent=null;swingTarget=c.defender?.name??null;}queueCombat(c,{hero,find:findSide});}
 // Map frames wait for queued deaths to play, so the corpse appears after the fall; a newer frame replaces a held one.
 function applySoon(frame){heldFrame=frame;if(heldTimer)return;const wait=active?Math.max(holdBackMs([hero.actions,...[...actors.values()].map(a=>a.actions)]),Math.ceil(fxHoldUntil-performance.now())):0;const go=()=>{heldTimer=null;const f=heldFrame;heldFrame=null;if(f)apply(f);};if(wait>0)heldTimer=setTimeout(go,wait);else go();}
 function message(text){splash.queueMessage(text);if(latest?.player){digChips.message(text,latest.player.x-origin.x,latest.player.z-origin.z,hero.g.rotation.y);digCracks.message(text,latest.player.x-origin.x,latest.player.z-origin.z,hero.g.rotation.y);digSwing.message(text);prayerKneel.message(text);digDrop.message(text);levelUp.message(text,latest.player.x-origin.x,latest.player.z-origin.z);prayerLight.message(text,latest.player.x-origin.x,latest.player.z-origin.z);}if(isThronePuff(text)&&latest?.player)throneVanish.add(latest.player.x-origin.x,latest.player.z-origin.z,latest.player.x*7+latest.player.z);grab.message(text,latest);brainSuck.message(text,latest);poly.message(text);barsMelt.message(text);breath.message(text);if(!combatStream&&meleeIntent&&confirmsPlayerMelee(text)){enqueueAction(hero.actions,{kind:'attack',attack:'weapon',result:'hit',dir:meleeIntent});meleeIntent=null;}const line=$('#engine-line'),log=$('#engine-messages');if(line.textContent){const p=document.createElement('div');p.textContent=line.textContent;log.prepend(p);while(log.children.length>3)log.lastChild.remove();}line.textContent=text;$('#message').textContent=text;}
 async function post(path,body={}){if(!token)token=(await fetch('/engine/token').then(r=>r.json())).token;const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Engine-Token':token},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error);return data;}
 async function reply(value){if(!pending)return;const req=pending;meleeIntent=req.kind==='command'?meleeDirection(value):null;pending=null;lines=[];menu=null;dialog.close();setPrompt('Engine is resolving your action…');try{await post('/engine/input',{id:req.id,value});pollNow?.();}catch(e){meleeIntent=null;message(e.message);setPrompt('Input was not accepted. Reconnect Live mode to refresh the prompt.');}}
 function showGround(items){
  groundPanel.replaceChildren();groundPanelTile=groundTile(latest);groundPanel.hidden=!items.length;
  const heading=document.createElement('strong');heading.textContent='On the ground';groundPanel.append(heading);
  const list=document.createElement('ul');for(const name of items){const item=document.createElement('li');item.textContent=name;list.append(item);}groundPanel.append(list);
  const hint=document.createElement('small');hint.textContent='Press , to pick up';groundPanel.append(hint);
 }
 function prompt(){if(!active||!pending)return;setPrompt(pending.prompt);if(pending.kind==='command'||pending.kind==='position')return;
   const groundItems=groundNotice(pending,lines);
   if(groundItems&&latest){
    showGround(groundItems);
    void reply(13);return;
   }
   if(bareMore(pending,lines)){void reply(13);return;}
   dialog.replaceChildren();const kicker=document.createElement('small');kicker.textContent='UNNETHACK ASKS';const title=document.createElement('h2');title.textContent=pending.prompt||'UnNetHack';dialog.append(kicker,title);
   if(pending.kind==='menu'&&menu){
    // "Take out / pick up what type of objects?" is answered with All types, so the full list opens at once.
    const skip=autoCategory(menu,pending.prompt);if(skip!==null){void reply(String(skip));return;}
    const items=menuKeys(menu.items),form=document.createElement('form'),pickAny=menu.how===2;
    for(const item of items){const row=document.createElement('label');row.className='engine-menu-row';
     if(item.selectable&&menu.how!==0){const input=document.createElement('input');input.type=menu.how===1?'radio':'checkbox';input.name='selection';input.value=item.id;input.dataset.accelerator=item.key;row.append(input);const accel=document.createElement('kbd');accel.textContent=item.key?`[${item.key}]`:'';row.append(accel);}
     else if(!item.selectable&&item.text.trim())row.classList.add('engine-menu-heading');
     row.append(document.createTextNode(item.text));form.append(row);}
    const boxes=()=>[...form.querySelectorAll('input')];
    // One button per class in the list (Potions !, Scrolls ?...), the same toggle as typing its symbol.
    const toggleGroup=ids=>{const set=new Set(ids.map(String)),group=boxes().filter(i=>set.has(i.value)),on=!group.every(i=>i.checked);for(const i of group)i.checked=on;};
    if(pickAny){const classes=menuGroups(items);if(classes.length){const bar=document.createElement('div');bar.className='engine-menu-groups';
     for(const c of classes){const b=document.createElement('button');b.type='button';b.textContent=c.label+' ';const k=document.createElement('kbd');k.textContent=c.key;b.append(k);b.title=`Select or clear every item in ${c.label} (${c.key})`;b.onclick=()=>toggleGroup(c.ids);bar.append(b);}
     form.prepend(bar);}}
    if(menu.how!==0){const hint=document.createElement('p');hint.className='engine-menu-hint';hint.textContent=pickAny?'Letters toggle items · a class symbol (! ? / …) toggles that class · , selects all · - clears · @ inverts · Enter takes them':'Press a letter to choose';form.append(hint);}
    const submit=document.createElement('button');submit.textContent='Continue (Enter)';submit.type='submit';form.append(submit);
    form.onsubmit=e=>{e.preventDefault();reply(boxes().filter(i=>i.checked).map(i=>i.value).join(','));};
    form.addEventListener('keydown',e=>{const key=e.key;if(e.metaKey||e.ctrlKey||e.altKey)return;if(key==='Escape'){e.preventDefault();reply('!');return;}if(key==='Enter'){e.preventDefault();form.requestSubmit();return;}
     const input=boxes().find(i=>i.dataset.accelerator===key);if(input){e.preventDefault();if(menu.how===1)reply(input.value);else input.checked=!input.checked;return;}
     const cmd=pickAny&&key.length===1?menuCommand(key,items):null;if(!cmd)return;e.preventDefault();
     if(cmd.select)for(const i of boxes())i.checked=cmd.select==='all'?true:cmd.select==='none'?false:!i.checked;
     else toggleGroup(cmd.toggle);});
    dialog.append(form);}
   else if(pending.kind==='line'&&pending.prompt==='Extended command'){
    // # commands complete as you type: arrows pick, Tab completes, Enter runs the highlighted one.
    const list=commands?.length?commands:EXT_FALLBACK,form=Object.assign(document.createElement('form'),{className:'engine-ext-form'}),input=document.createElement('input'),ul=document.createElement('ul');
    input.maxLength=60;input.autofocus=true;input.autocomplete='off';input.spellcheck=false;input.placeholder='loot, force, enhance, pray…';ul.className='engine-ext-list';
    let shown=[],sel=0;
    const render=()=>{shown=matchCommands(list,input.value);sel=Math.min(sel,Math.max(0,shown.length-1));ul.replaceChildren(...shown.map((c,i)=>{const li=document.createElement('li'),b=document.createElement('b'),span=document.createElement('span');b.textContent='#'+c.name;span.textContent=c.desc;li.append(b,span);li.classList.toggle('active',i===sel);li.onmousedown=e=>{e.preventDefault();reply(c.name);};return li;}));};
    input.oninput=()=>{sel=0;render();};
    input.onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(shown.length)sel=(sel+(e.key==='ArrowDown'?1:-1)+shown.length)%shown.length;render();}
     else if(e.key==='Tab'){e.preventDefault();const done=completePrefix(list,input.value);input.value=done!==input.value?done:shown[sel]?.name??input.value;sel=0;render();}};
    form.onsubmit=e=>{e.preventDefault();reply(resolveCommand(list,input.value,shown[sel]));};
    form.append(input,ul);render();dialog.append(form);}
   else if(pending.kind==='line'){const form=document.createElement('form'),input=document.createElement('input'),submit=document.createElement('button');input.maxLength=200;input.autofocus=true;submit.textContent='Enter';form.append(input,submit);form.onsubmit=e=>{e.preventDefault();reply(input.value);};dialog.append(form);}
   else{if(lines.length){const pre=document.createElement('pre');pre.textContent=lines.join('\n');dialog.append(pre);}const p=document.createElement('p');p.textContent=pending.kind==='more'?'Press Enter to continue.':'Press a response key. For a direction use arrows or h/j/k/l.';dialog.append(p);const ok=document.createElement('button');ok.textContent='Enter';ok.onclick=()=>reply(13);dialog.append(ok);}
   const cancel=document.createElement('button');cancel.textContent='Cancel / Escape';cancel.onclick=()=>reply(pending.kind==='menu'?'!':pending.kind==='line'?'\u001b':27);dialog.append(cancel);dialog.showModal();
 }
 dialog.addEventListener('cancel',e=>{e.preventDefault();if(pending)reply(pending.kind==='menu'?'!':pending.kind==='line'?'\u001b':27);});
 // Prefer push (SSE); some hosting paths (a tunnel or proxy that buffers streaming
 // responses) never deliver a single byte over it, so fall back to polling /engine/poll
 // if nothing arrives within a few seconds.
 function connect(){
   meleeIntent=null;source?.close?.();
   let usingPolling=false,pollTimer=null,stopped=false,since=0;
   const handle=v=>{if(v.type==='frame')applySoon(v);else if(v.type==='request'){meleeIntent=null;pending=v;prompt();if(v.kind==='command'&&queuedCommand!==null){const command=queuedCommand;queuedCommand=null;void reply(command);}}else if(v.type==='message'){if(active)message(v.text);}else if(v.type==='status')renderStatus(v.text);else if(v.type==='menu')menu=v;else if(v.type==='commands')commands=v.items;else if(v.type==='text')lines=v.lines;else if(v.type==='combat'||v.type==='death'){if(active)combatEvent(v);}else if(v.type==='revive'){if(active)rises.add(reviveAction(v),performance.now());}else if(v.type==='fx'){const fx=globalThis.deanhackFx??=[];const tl=fxTimeline(v);fx.push(tl);if(active){const heroZap=zapFlash.play(tl,latest?.player,hero,latest,{windup:ZAP_WINDUP_MS});const shown=heroZap?delayTimeline(tl,ZAP_WINDUP_MS):delayTimeline(tl,queueThrows(tl,findThrower));rays.play(shown,{reflectorAt:(x,z)=>reflectorAt(latest,x,z),solidAt:(x,z)=>solidAt(latest,x,z)});rayMarks.add(shown);explosions.add(shown);flights.play(shown);splash.fromFx(shown,latest);breath.fromFx(shown,latest,{always:heroZap==='breath'});fxHoldUntil=Math.max(fxHoldUntil,performance.now()+fxHoldMs(shown));}if(fx.length>8)fx.shift();}else if(v.type==='ended'){pending=null;queuedCommand=null;if(active){dialog.close();message(v.text);setPrompt('Session ended. Use Demo room, then Live UnNetHack to resume.');}}};
   async function pollLoop(){
     if(stopped)return;
     try{const r=await fetch(`/engine/poll?since=${since}`);const {events,seq}=await r.json();since=seq;for(const event of events)handle(event);}
     catch{if(active)setPrompt('Connection interrupted; reconnecting…');}
     if(!stopped)pollTimer=setTimeout(pollLoop,150);
   }
   const es=new EventSource('/engine/events');
   const fallback=setTimeout(()=>{if(usingPolling)return;usingPolling=true;es.close();pollNow=()=>{clearTimeout(pollTimer);pollLoop();};pollLoop();},2500);
   es.onmessage=e=>{if(usingPolling)return;clearTimeout(fallback);handle(JSON.parse(e.data));};
   es.onerror=()=>{if(usingPolling)return;if(active)setPrompt('Connection interrupted; reconnecting…');};
   source={close:()=>{stopped=true;pollNow=null;clearTimeout(fallback);clearTimeout(pollTimer);es.close();}};
 }
 const saved={banner:$('.location small').textContent,heading:$('.location h1').textContent,footer:$('footer>small').textContent,keys:$('.keys').innerHTML,companion:$('.companion').innerHTML};
 function setMode(value){active=value;if(!active)$('.location small').textContent=saved.banner;cavern.setActive(active);for(const {light,base} of ambientLights)light.intensity=active?base*LIVE_AMBIENT:base;document.body.classList.toggle('live-engine',active);group.visible=active;for(const o of demoObjects)o.visible=!active;panel.hidden=!active;actions.hidden=!active;$('#reset').hidden=active;$('.legend').hidden=active;$('.character h2').hidden=active;button.textContent=active?'Demo room':'Live UnNetHack';if(!active){$('.companion').innerHTML=saved.companion;$('.companion').hidden=false;$('.character').classList.remove('low-hp');levelBanner.classList.remove('show');shownTitle=null;}$('footer>small').textContent=active?'Real UnNetHack rules · isolated character and saves · drag to orbit, scroll to zoom':saved.footer;$('.keys').innerHTML=active?'<span><kbd>h j k l / arrows</kbd> Move</span><span><kbd>y u b n</kbd> Diagonals</span><span><kbd>s</kbd> Search</span><span><kbd>SPACE</kbd> Wait</span><span><kbd>i</kbd> Inventory</span><span><kbd>&lt; &gt;</kbd> Stairs</span>':saved.keys;if(active){if(latest)apply(latest);prompt();}else{dialog.close();onDemo();$('.location h1').textContent=saved.heading;dropEngulfCamera(camera,controls);controls.target.set(0,.1,0);camera.position.set(11,13,16);}onMode?.(active);}
 button.onclick=async()=>{if(active){setMode(false);return;}setMode(true);setPrompt('Starting isolated UnNetHack…');try{await post('/engine/start');connect();}catch(e){message(`Could not start engine: ${e.message}. Run npm run engine:build first.`);}};
 actions.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>{if(pending?.kind==='command')reply(Number(b.dataset.key));});
 addEventListener('keydown',e=>{if(!active||e.metaKey||e.altKey)return;if(e.target instanceof HTMLInputElement)return;
   if(e.ctrlKey){if(e.key.toLowerCase()==='d'&&pending?.kind==='command'){e.preventDefault();e.stopImmediatePropagation();void reply(4);}return;}
   if(pending?.kind==='menu')return;let code;const directions={ArrowUp:107,ArrowDown:106,ArrowLeft:104,ArrowRight:108};
   if(pending?.kind==='command'){code=directions[e.key]??(e.key===' '?46:e.key.length===1?e.key.charCodeAt(0):undefined);}
   // getpos cursor prompt (travel, stair travel, farlook): raw keys and Escape, Enter picks the spot
   else if(pending?.kind==='position'){code=directions[e.key]??(e.key==='Escape'?27:e.key==='Enter'?46:e.key.length===1?e.key.charCodeAt(0):undefined);}else code=directions[e.key]??(e.key==='Enter'?13:e.key==='Escape'?27:e.key.length===1?e.key.charCodeAt(0):undefined);
   if(code){e.preventDefault();e.stopImmediatePropagation();if(pending)reply(code);else if(pending===null)queuedCommand=code;}
 },true);
 return {get active(){return active;},setCough(h){coughHunch=h;},heroAt(out){if(!active||!hero.target||!heroLook(latest?.player,true))return null;return hero.g.getWorldPosition(out);},update(t,dt){if(!active||!hero.target)return;poseEngulfed(hero,null);poseHeld(hero,null);clearActionPose(hero,hero.actions);unposeDualStance(hero);zapFlash.unpose(hero);const delta=hero.target.clone().sub(hero.g.position),moving=delta.length()>.025;if(moving)hero.g.rotation.y=Math.atan2(delta.x,delta.z);beginHop(hero);hero.g.position.lerp(hero.target,1-Math.exp(-dt*14));endHop(hero,dt);hero.body.position.y=Math.sin(t*(moving?18:2))*(moving?.035:.013);if(coughHunch||coughApplied)hero.body.rotation.x=coughHunch;coughApplied=coughHunch;hero.legs.forEach((l,i)=>l.rotation.x=moving?Math.sin(t*18+i*Math.PI)*.5:0);hero.cape.rotation.x=-.17+Math.sin(t*3)*.06;if(hero.plume)hero.plume.rotation.z=-.16+Math.sin(t*2.4)*.035;updateGhosting(hero,dt,t,!!latest?.player?.invisible);
   const offset=hero.g.position.clone().sub(controls.target);offset.y=0;offset.multiplyScalar(1-Math.exp(-dt*3));controls.target.add(offset);camera.position.add(offset);lantern.position.copy(hero.g.position).add(new THREE.Vector3(0,3,0));
   for(const tile of tiles.values())if(tile.visible)tile.traverse(o=>{o.userData.updateFire?.(t);o.userData.animate?.(t);});updateDoorSwings(dt);
   updateDualStance(hero,dt,t);updateActions(hero,hero.actions,dt);digSwing.update(hero,dt,!!hero.actions?.current||!!hero.actions?.queue.length||!!hero.actions?.dead);prayerKneel.update(hero,dt,!!hero.actions?.current||!!hero.actions?.queue.length||!!hero.actions?.dead);zapFlash.update(dt,hero);swingFx.update(hero,dt,swingTarget);updateHoseFlop(hero,dt);updateSlingWhirl(hero);
   updateTorchLights(t,dt);cavern.update(t,dt,hero.g.position);
   for(const a of actors.values()){clearActionPose(a,a.actions);clearStalk(a);a.g.userData.updateOracle?.(t);a.g.userData.updateGridBug?.(t);let walking=false;if(a.target){const d=a.target.clone().sub(a.g.position);walking=d.length()>.025;if(walking)a.g.rotation.y=Math.atan2(d.x,d.z);slideTo(a,dt);if(a.legs)a.legs.forEach((l,i)=>l.rotation.x=walking?Math.sin(t*22+i*2)*.4:0);}a.asset?.update(dt,walking);if(a.tail)a.tail.rotation.z=tailSway(a,t);if(a.charm)a.charm.position.y=.3+Math.sin(t*4)*.025;if(a.body){const idle=a.quirk==='orc'?.025:a.quirk==='dragon'?.035:a.quirk==='unicorn'?.022:.015;a.body.position.y=Math.sin(t*(walking?22:2.5))*idle;}if(a.wings?.length)a.wings.forEach((wing,i)=>{if(a.quirk==='bat'||a.flap){wing.rotation.z=(wing.userData.side||(i?1:-1))*wingFlap(a.flap,t);}else if(a.quirk==='bee'){wing.rotation.y=(i?1:-1)*Math.sin(t*60)*.35;}else wing.rotation.y=(i?1:-1)*(-.18+Math.sin(t*5)*.12);});if((a.quirk==='hover'||a.quirk==='bat'||a.quirk==='bee')&&a.body)a.body.position.y=flightBob(a.flap,t,a.g.position.x);if(a.quirk==='dragon')a.g.rotation.z=Math.sin(t*1.7)*.025;if(a.quirk==='nymph'&&a.body)a.body.rotation.z=Math.sin(t*1.3+a.g.position.x)*.035;if(a.quirk==='gridbug')a.g.rotation.z=Math.sin(t*9)*.035;if(a.quirk==='guard')a.g.rotation.z=Math.sin(t*1.3)*.012;const busy=walking||!!a.actions?.current||!!a.actions?.queue.length;updateGait(a,dt,walking);updatePlod(a,dt,walking);updateSkitter(a,dt,walking);updateTripod(a,dt,walking);updateTrudge(a,dt,walking);updateStrawFlop(a,dt,t,walking);updateHemSway(a,dt,t);updateSerpentStaff(a,dt,t,heroLook(latest?.player,hero.g.position));updateFlap(a,dt,t);updateFidget(a,dt,t,busy,heroLook(latest?.player,hero.g.position));updateWereShudder(a,dt,t,busy,heroLook(latest?.player,hero.g.position));updateStalk(a,dt,t,findPrey(a,actors.values()),busy);const core=a.core||a.g.userData.core;if(core&&!a.spherePulse&&!a.lightFlare)core.material.emissiveIntensity=4.5+Math.sin(t*5)*1.4;if(a.actions){updateActions(a,a.actions,dt);const q=a.actions;if(q.dead)hideDeathRing(a);if(q.dead&&q.fade!=null)applyFade(a,q.fade);if(q.deathBurst){deathFx.burst(q.deathBurst.style,a.g.position,{dir:q.deathBurst.dir,...deathLook(a)});q.deathBurst=null;}if(q.riseBurst){for(const look of ['rise','riseMotes'])deathFx.burst(look,a.g.position,deathLook(a));q.riseBurst=null;}}updateBask(a,dt,t,busy);updateDragonMenace(a,dt,t,busy,walking,heroLook(latest?.player,hero.g.position));updateCockatriceHiss(a,dt,t,busy,walking,heroLook(latest?.player,hero.g.position));updateSkulk(a,dt,t,busy);updateTaunt(a,dt,t,busy);updateInvoke(a,dt,t,busy);updateHeft(a,dt,t,busy);updateRally(a,dt,t,busy);updatePonder(a,dt,t,busy);updateKamae(a,dt,t);updateSalute(a,dt,t,busy);updateMonkBow(a,dt,t,busy);updateRogueProwl(a,dt,t,busy);updateBarbarianBrood(a,dt,t,busy);updateHealerPeer(a,dt,t,busy);updateTouristGawk(a,dt,t,busy);updateMuggerCosh(a,dt,t,busy);updateConvictHunted(a,dt,t,busy);updateRangerDraw(a,dt,t,busy);updateCharonOar(a,dt,t,busy);updatePrisonerRock(a,dt,t,busy,heroLook(latest?.player,hero.g.position));updateCubeDrift(a,dt,t,walking);updateWhipEmbers(a,dt,t);updateTwitch(a,dt,t,busy);updateWhiffle(a,dt,t,walking,!!a.actions?.current||!!a.actions?.queue.length);updateTuck(a,dt,walking);}hitFx.update([hero,...actors.values()],dt);deathFx.update(dt);petrify.update(dt);throneVanish.update(dt);digChips.update(dt);digCracks.update(dt);levelUp.update(dt);prayerLight.update(dt);rays.update(dt,origin);const {flash:rayFlash}=rayMarks.update(dt,origin);rayFlashLight.intensity=rayFlash*RAY_FLASH_INTENSITY;rayFlashLight.position.set(hero.g.position.x,3.2,hero.g.position.z);const blast=explosions.update(dt,origin);blastLight.intensity=blast.light*BLAST_LIGHT_INTENSITY;if(blast.light>0){blastLight.color.setHex(blast.color);blastLight.position.set(blast.x-origin.x,1.2,blast.z-origin.z);}
   for(const item of groundItems.values())if(item.visible){updateStepOver(item,Math.hypot(item.position.x-hero.g.position.x,item.position.z-hero.g.position.z)<STEP_RADIUS,dt);item.userData.wandAura?.userData.update(t);item.userData.artifactGleam?.userData.update(t);item.userData.scrollAura?.userData.update(t);item.userData.ringAura?.userData.update(t);item.userData.amuletAura?.userData.update(t);item.userData.weaponAura?.userData.update(t);item.userData.potionFx?.userData.update(t);item.userData.potionAura?.userData.update(t);}
   for(const item of liftingItems)if(updatePickupLift(item,hero.g.position,dt)){release(item);liftingItems.delete(item);}
   updateHeldWandAura(hero,t);updateHeldGleam(hero,t);
   for(const item of groundItems.values()){if(!item.userData.coinPile)continue;item.userData.coinAge=(item.userData.coinAge||0)+dt;for(const coin of item.userData.coinPile){if(coin.settled||item.userData.coinAge<coin.delay)continue;coin.velocity-=9.8*dt;coin.disk.position.y+=coin.velocity*dt;coin.stamp.position.y+=coin.velocity*dt;if(coin.disk.position.y<=coin.target){coin.disk.position.y=coin.target;coin.stamp.position.y=coin.target+.0115;coin.velocity*=-.16;if(Math.abs(coin.velocity)<.35)coin.settled=true;}}}
   if(flooding)flooding=flood.update(dt,origin).count>0;splash.update(dt,origin);flights.update(dt,origin);const grabbed=grab.update(dt,origin);poseBrainSuck(hero,brainSuck.update(dt,origin).shake);const holding=hold.update(dt,origin,{skip:grabbed.held});poseHeld(hero,holding.squeeze);hero.g.position.y=(hero.hopAt?.y??0)+grabbed.sink+digDrop.update(dt)+(hero.actions.applied?.dy??0);
   const {poses:polyPoses}=poly.update(dt,origin);poseActor(hero,latest?.player&&polyPoses.get(`${latest.player.x},${latest.player.z}`));for(const a of actors.values())poseActor(a,polyPoses.get(a.cell));barsMelt.update(dt,origin);doorBreak.update(dt,origin);const br=breath.update(dt,origin);if(br.glow*BREATH_LIGHT_INTENSITY>blastLight.intensity){blastLight.intensity=br.glow*BREATH_LIGHT_INTENSITY;blastLight.color.setHex(br.color);blastLight.position.set(br.x-origin.x,1.2,br.z-origin.z);}const eng=engulf.update(dt,origin);engulfCamera(camera,controls,eng);poseEngulfed(hero,eng.hero);
   for(const tile of tiles.values()){const liquid=tile.userData.liquid;if(!liquid)continue;liquid.visible=!(flooding&&flood.pending(tile.position.x+origin.x,tile.position.z+origin.z));if(tile.visible&&liquid.visible)liquid.userData.updateLiquid(t);}
   for(const w of wells.values())w.userData.updateFountain?.(t);
 }};
}
