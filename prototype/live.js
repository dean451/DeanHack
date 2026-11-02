import {DIM_COLOR,DIM_OPACITY} from './remembered.js';
import {LIVE_KEYS_HTML} from './live-keys.js';
import * as THREE from 'three';
import {groundTile} from './ground-notice.js';
import {installStartScreen,readChoice} from './start-screen.js';
import {ALTAR_TOP} from './altar.js';
import {createFloorKit} from './floor.js';
import {createDeathBeat} from './death-beat.js';
import {addOutlines} from './readability.js';
import {createCavern} from './cavern.js';
import {createBranchAir} from './branch-air.js';
import {createBranchMood} from './branch-mood.js';
import {createMinimap} from './minimap.js';
import {createMessageLog,allRows} from './message-log.js';
import {createHistoryPanel} from './message-history.js';
import {aimKeys,createAimCursor,directionLanes,isDirectionPrompt,laneHits,laneRange} from './aim-cursor.js';
import {squareAt,farlookText,createFarlook} from './farlook.js';
import {clickMove} from './click-move.js';
import {createTravelMark,createTravelState} from './travel-mark.js';
import {createPickupNotes} from './pickup-events.js';
import {createBrainSuck} from './brain-suck.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createExplosions} from './explosions.js';
import {createFlood} from './flood.js';
import {createSplash} from './splash.js';
import {createFlights} from './flights.js';
import {createGrab} from './grab.js';
import {createHold} from './hold.js';
import {createPolymorph} from './polymorph.js';
import {createHeroForm} from './hero-form.js';
import {createBarsMelt} from './bars-melt.js';
import {createDoorBreak} from './door-break.js';
import {createThroneVanish} from './throne-vanish.js';
import {createFountainLady} from './fountain-lady.js';
import {createFountainSnakes} from './fountain-snakes.js';
import {createFountainGush} from './fountain-gush.js';
import {createAltarSacrifice} from './altar-sacrifice.js';
import {createAltarClover} from './altar-clover.js';
import {createAltarGlow} from './altar-glow.js';
import {createLightningStrikes} from './mjollnir-storm.js';
import {createAltarFlashes} from './altar-offering.js';
import {createAltarGift} from './altar-gift.js';
import {createBlessFlash,createGlowLog} from './bless-flash.js';
import {createFountainNymph} from './fountain-nymph.js';
import {createFountainDemon} from './fountain-demon.js';
import {createFountainWish} from './fountain-wish.js';
import {createWandWishFlare} from './wand-wish-flare.js';
import {createDjinniWish} from './djinni-wish.js';
import {createFireTrapJet} from './fire-trap-jet.js';
import {createDarkness} from './darkness.js'; // the dark around the hero's light, and the light's own halo (no lights: two meshes)
import {createDarkEyes} from './dark-eyes.js'; // monsters perceived on unseen squares show as eyes in the dark
import {createWarmTarget,compileFor} from './shader-target.js';
import {createDimLayer} from './dim-layer.js';
import {positionSignature} from './shadow-motion.js';
import {createGeometryGC} from './geometry-gc.js';
import {createViewCull} from './view-cull.js';
import {createEffectLights} from './effect-lights.js'; // one fixed pool of lights for the one-shot effects, so the light count (and every shader) stays put
import {createGoldGlint} from './gold-glint.js';
import {createPotionSip} from './potion-sip.js';
import {createSinkDrain} from './sink-drain.js';
import {createStoneCure} from './stone-cure.js';
import {createTowelWipe} from './towel-wipe.js';
import {createCalmClear} from './calm-clear.js';
import {createUnicornSpiral} from './unicorn-spiral.js';
import {createStairStep} from './stair-step.js';
import {createFirstKill} from './first-kill.js';
import {createSearchReveal} from './search-reveal.js';
import {createSqueakyBoard} from './squeaky-board.js';
import {createRollingTrap} from './rolling-trap.js';
import {createOrientationOverlay} from './orientation-overlay.js';
import {createFallingRock} from './falling-rock.js';
import {createDartTrap} from './dart-trap.js';
import {createLandMine} from './land-mine.js';
import {createRustTrap} from './rust-trap.js';
import {createIceTrap} from './ice-trap.js';
import {createPitFall} from './pit-fall.js';
import {createPolyTrap} from './poly-trap.js';
import {createMagicTrap} from './magic-trap.js';
import {createBoulderFill} from './boulder-fill.js';
import {createSpellFizzle} from './spell-fizzle.js';
import {createThroneSit} from './throne-sit.js';
import {createThroneCurse} from './throne-curse.js';
import {createThroneInsight} from './throne-insight.js';
import {createThroneWrench} from './throne-wrench.js';
import {createThroneGift} from './throne-gift.js';
import {createSpellStudy} from './spell-study.js';
import {createSpellCrumble} from './spell-crumble.js';
import {createAntiMagic} from './anti-magic.js';
import {createWebSnare} from './web-snare.js';
import {createStatueTrap} from './statue-trap.js';
import {createBearTrapSnap} from './bear-trap-snap.js';
import {createSleepingGas} from './sleeping-gas.js';
import {createTeleportBlink} from './teleport-blink.js';
import {createMagicPortal} from './magic-portal.js';
import {createDigChips} from './dig-chips.js';
import {createDigCracks} from './dig-cracks.js';
import {createDigSwing} from './dig-swing.js';
import {createDigDrop} from './dig-drop.js';
import {createStairTumble} from './stair-tumble.js';
import {createLevelUp} from './level-up.js';
import {createPrayerLight} from './prayer-light.js';
import {createPrayerKneel} from './prayer-kneel.js';
import {createAnimatedRegistry} from './tile-animations.js';
import {createBreath} from './breath.js';
import {createEngulf,dropEngulfCamera} from './engulf.js';
import {createSwingFx} from './swing-fx.js';
import {createHitFx} from './hit-fx.js';
import {createHitFeel} from './hit-feel.js';
import {createRays,solidAt} from './rays.js';
import {createZapFlash} from './zap-flash.js';
import {createRayMarks} from './ray-marks.js';
import {createDeathBurst,deathLook,restoreFade} from './deaths.js';
import {createPetrify} from './petrify.js';
import {createMarks} from './marks.js';
import {createEnvStory} from './env-story.js';
import {createRiseWatch} from './rise.js';
import {heroLook} from './glance.js';
 // monsters and pets are baked as they are staged (one draw per body part)
import {createActorBatch} from './batched-actors.js'; // and their baked parts draw from one batch
import {createTileInstancer} from './tile-instances.js'; // floor slabs, wall blocks and pebbles draw as instances
import {growFelineHull,adoptFelineHull} from './feline-skin.js';
import {unpackHull} from './hull-transfer.js';
 // the pet cat is one skinned mesh (a trial of skinning)

import {createActionQueue,findActor,ACTION_TIME,STRIKE_U} from './actions.js';
import {heroConditions} from './hud-conditions.js';
import {createStatusProgress} from './status-progress.js';
import {createHeroBatch} from './hero-batch.js';
import {holdUncompiled,releaseHeld,MAX_WAIT_MS} from './compile-gate.js';
import {guardStaleInput} from './stale-input.js';
import {createFadePrewarm} from './fade-prewarm.js';
import {createRecorder} from './replay-recorder.js';
import {pickupIcon as pickupIcon_} from './live-ground-icon.js';
import {label,dressFeature as dressFeature_} from './live-tile-dress.js';
import {setPrompt as setPrompt_,setCharacterName as setCharacterName_,renderSurroundings as renderSurroundings_,hideLinkBanner as hideLinkBanner_,showLinkBanner as showLinkBanner_} from './live-hud.js';
import {updateTorchLights as updateTorchLights_} from './live-torch-lights.js';
import {prompt as prompt_} from './live-prompt.js';
import {message as message_,drawMessagePanels as drawMessagePanels_} from './live-messages.js';
import {apply as apply_} from './live-apply.js';
import {connect as connect_,reply as reply_,post as post_,applySoon as applySoon_} from './live-engine-link.js';
import {combatEvent as combatEvent_,queueStrike as queueStrike_,fireStrikes as fireStrikes_,monsterSquare as monsterSquare_} from './live-combat.js';
import {renderStatus as renderStatus_,renderAttributes as renderAttributes_,announceLevel as announceLevel_} from './live-status.js';
import {layHeroBones as layHeroBones_,crossfadeHeroBones as crossfadeHeroBones_,clearHeroBones as clearHeroBones_} from './live-hero-death.js';
import {updateFrame as updateFrame_} from './live-frame.js';
import {createTileBacklog} from './tile-backlog.js';
import {createInputPace} from './input-pace.js';
import {createSpecialMood} from './special-mood.js';
import {createBagExplosion} from './bag-explosion.js';
import {createHeroAffliction} from './hero-affliction.js';
import {createArmourDust} from './armour-dust.js';
import {createDeathRecap} from './death-recap.js';

// Only window-port observations enter this view. No prediction of game rules.
export function installLive({scene,camera,controls,renderer=null,playerFactory,catFactory,monsterFactory,creatureFactory,wellTemplate,onMode,onActivity,torchLightCount=8}) {
 /* the game's changing state (what was "let x" in this closure), one object so the parts split out of live.js can share it */const S={airborne:false};const statusProgress=createStatusProgress();/* the closure's names the split-out parts read, filled in at the end of installLive */const L={};
 const group=new THREE.Group();scene.add(group);group.visible=false;const marks=createMarks(THREE,group);const envStory=createEnvStory(THREE,group);const tileInstances=createTileInstancer(group);const viewCull=createViewCull();const geometryGC=createGeometryGC();const dimLayer=createDimLayer(THREE,group,{color:DIM_COLOR,opacity:DIM_OPACITY});const actorBatch=createActorBatch(group);
 /* squares a big reveal brings are built over several frames (tile-backlog.js) */const tileBacklog=createTileBacklog();/* typed-ahead commands and the hurry that keeps the scene up with them (input-pace.js) */const inputPace=createInputPace();/* the deadly countdowns on the hero's body (hero-affliction.js) */const heroAffliction=createHeroAffliction();/* destroyed armour crumbling off the hero (armour-dust.js) */const armourDust=createArmourDust(THREE,group);/* the end-of-game recap (death-recap.js) */const deathRecap=createDeathRecap();const tiles=new Map(),actors=new Map(),wells=new Map(),groundItems=new Map(),heldUnder={map:new Map()},liftingItems=new Set(),pickupNotes=createPickupNotes();S.active=false;S.lastCommand=null;S.pending=null;S.latest=null;S.token='';S.menu=null;S.commands=null;S.lines=[];S.origin=null;S.lastLevel='';S.lastBranch=null;S.lastDepth=NaN;S.source=undefined;S.pollNow=null;
 const $=s=>document.querySelector(s);
 
 const button=document.createElement('button');button.textContent='Live UnNetHack';button.id='live-mode';$('.buttons').prepend(button);
 // The character's name: typed before starting, kept in localStorage (sent with /engine/start), and shown in the character panel.
 const nameInput=document.createElement('input');nameInput.id='player-name';nameInput.type='text';nameInput.placeholder='Adventurer';nameInput.maxLength=24;nameInput.autocomplete='off';nameInput.spellcheck=false;nameInput.setAttribute('aria-label','Character name');
 try{nameInput.value=localStorage.getItem('deanhack.playerName')||'';}catch{}
 nameInput.addEventListener('input',()=>{try{localStorage.setItem('deanhack.playerName',nameInput.value);}catch{}setCharacterName(nameInput.value);});
 $('.buttons').prepend(nameInput);
 function setCharacterName(name){return setCharacterName_(name,{$});}
 setCharacterName(nameInput.value);
 const panel=document.createElement('section');panel.id='engine-panel';panel.hidden=true;panel.innerHTML='<p id="engine-line" aria-live="polite"></p><div id="engine-messages" role="log"></div><div id="engine-prompt"></div>';document.body.append(panel);
 // Gold, power, experience and conditions live in the character panel, not under the messages.
 const statusLine=document.createElement('div');statusLine.id='engine-status';$('.character').append(statusLine);
 const minimap=createMinimap(document);document.body.append(minimap.el);
 const historyPanel=createHistoryPanel(document,()=>allRows(messageLog));document.body.append(historyPanel.el);
 const farlook=createFarlook(document);document.body.append(farlook.el);{const ray=new THREE.Raycaster(),floor=new THREE.Plane(new THREE.Vector3(0,1,0),0),spot=new THREE.Vector3(),ndc=new THREE.Vector2(),dom=controls.domElement;dom.addEventListener('pointermove',e=>{if(!S.active||!S.latest||!S.origin||e.buttons){farlook.hide();return;}const r=dom.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ndc,camera);if(!ray.ray.intersectPlane(floor,spot)){farlook.hide();return;}const sq=squareAt(spot,S.origin);farlook.show(farlookText(S.latest.cells.find(c=>c.x===sq.x&&c.z===sq.z),S.latest.player?.stuck,S.latest.player&&{x:S.latest.player.x,z:S.latest.player.z,name:$('.character>small')?.textContent}),e.clientX,e.clientY);});dom.addEventListener('pointerleave',()=>farlook.hide());}
 const aim=createAimCursor();group.add(aim.g);S.aimQueue=[];
 const travelMark=createTravelMark(),travelState=createTravelState();group.add(travelMark.g);S.travelTo=null;{const ray=new THREE.Raycaster(),floor=new THREE.Plane(new THREE.Vector3(0,1,0),0),spot=new THREE.Vector3(),ndc=new THREE.Vector2(),dom=controls.domElement;let down=null;dom.addEventListener('pointerdown',e=>{down=e.button===0?{x:e.clientX,y:e.clientY}:null;});dom.addEventListener('pointerup',e=>{const d=down;down=null;if(!d||e.button!==0||Math.hypot(e.clientX-d.x,e.clientY-d.y)>5)return;if(!S.active||!S.latest||!S.origin||S.pending?.kind!=='command')return;const r=dom.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ndc,camera);if(!ray.ray.intersectPlane(floor,spot))return;const sq=squareAt(spot,S.origin),move=clickMove(S.latest.player,sq,S.latest.cells.find(c=>c.x===sq.x&&c.z===sq.z));if(!move)return;S.travelTo=move.kind==='travel'?move.to:null;travelState.begin(S.travelTo);void reply(move.code);});}
 S.heroStrength=undefined;
 function syncAim(){if(S.active&&S.origin&&S.pending?.kind==='position'&&S.pending.cursor){aim.show(S.pending.cursor.x-S.origin.x,S.pending.cursor.z-S.origin.z,S.latest?.player?{x:S.latest.player.x-S.origin.x,z:S.latest.player.z-S.origin.z}:null);minimap.setCursor(S.pending.cursor);}else if(S.active&&S.origin&&S.latest?.player&&S.pending&&S.pending.kind!=='command'&&S.pending.kind!=='menu'&&isDirectionPrompt(S.pending.prompt)){const p=S.latest.player;const lanes=directionLanes(p,(x,z)=>solidAt(S.latest,x,z),laneRange(S.lastCommand,S.heroStrength)),rel=c=>({x:c.x-S.origin.x,z:c.z-S.origin.z});aim.lanes(lanes.flat().map(rel),laneHits(lanes,(x,z)=>S.latest.cells?.find(c=>c.x===x&&c.z===z)?.kind==='monster').map(rel));minimap.setCursor(null);}else{aim.hide();minimap.setCursor(null);}}
 minimap.el.addEventListener('click',e=>{if(S.pending?.kind!=='position'||!S.pending.cursor)return;const spot=minimap.cellAt(e.clientX,e.clientY);if(!spot)return;S.aimQueue=aimKeys(S.pending.cursor,spot);void reply(S.aimQueue.shift());});
 // Engine commands live in the footer.
 const actions=document.createElement('div');actions.className='engine-actions';actions.hidden=true;actions.innerHTML='<button data-key="83">Save & quit</button>';$('.buttons').prepend(actions);
 const esc=text=>String(text).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 function setPrompt(text){return setPrompt_(text,{$,esc});}
 const attributesEl=document.createElement('div');attributesEl.className='attributes';$('.stats').after(attributesEl);
 function renderAttributes(...a){return renderAttributes_(L,...a);}
 // On arrival at a named level or branch, its name fades in over the scene for a few seconds.
 // A banner for a lost link or a restarted server, with the one button that fixes it (a reload).
 const linkBanner=document.createElement('div');linkBanner.id='link-banner';linkBanner.hidden=true;linkBanner.innerHTML='<span></span><button type="button"></button>';document.body.append(linkBanner);
 function showLinkBanner(text,label){return showLinkBanner_(text,label,{active:S.active,linkBanner});}
 function hideLinkBanner(){return hideLinkBanner_({linkBanner});}
 S.link=null;S.currentHandle=null;
 const levelBanner=document.createElement('div');levelBanner.id='level-banner';levelBanner.setAttribute('aria-live','polite');document.body.append(levelBanner);
 S.shownTitle=null;
 function announceLevel(level){return announceLevel_(level,L);}
 // Parse the bottom status line into the same label/value pairs the character panel uses.
 function renderStatus(text){return renderStatus_(text,L);}
 const psiState={v:0};
 
 // The pet in view goes to the companion slot (the creatures-in-view list is gone: the game is shown by its visuals).
 function renderSurroundings(frame){return renderSurroundings_(frame,{$,esc});}
 const dialog=document.createElement('dialog');dialog.id='engine-dialog';document.body.append(dialog);
 const groundPanel=document.createElement('aside');groundPanel.id='ground-notice';groundPanel.hidden=true;groundPanel.setAttribute('aria-live','polite');groundPanel.setAttribute('aria-label','Items on this tile');document.body.append(groundPanel);S.groundPanelTile=null;S.groundPriced=null;
 const lantern=new THREE.PointLight(0xffd49c,22,11,2);group.add(lantern);
 // One scratch vector for the per-frame steps (hero, every actor, the camera): the loop used to allocate three per actor per frame.
 const STEP=new THREE.Vector3();
 const wall=new THREE.MeshStandardMaterial({color:'#52605f',roughness:.88}),floorGeo=new RoundedBoxGeometry(.97,.14,.97,3,.035),wallGeo=new RoundedBoxGeometry(.97,.7,.97,3,.045);
 // Torches are real light sources: a fixed pool of point lights follows the torches
 // nearest the hero. The pool size never changes, so materials never recompile.
 // ?torches=N (0..8) tries a smaller pool: every point light is evaluated per lit pixel, so this is the knob for a slow GPU.
 /* every point light is shaded on every lit pixel each frame, lit or dark, so the torch pool is sized by quality tier (main.js torchLightsFor); ?torches=N still overrides */const TORCH_LIGHTS=Math.min(8,Math.max(0,parseInt(new URLSearchParams(location.search).get('torches')??String(torchLightCount),10)||0)),TORCH_INTENSITY=15,LIVE_AMBIENT=.68,RAY_FLASH_INTENSITY=60,BLAST_LIGHT_INTENSITY=45,BREATH_LIGHT_INTENSITY=30;
 const torchLights=Array.from({length:TORCH_LIGHTS},()=>{const l=new THREE.PointLight(0xff9a48,0,6,2);l.userData={tile:null,level:0};group.add(l);return l;});
 const ambientLights=scene.children.filter(o=>o.isHemisphereLight||o.isDirectionalLight).map(light=>({light,base:light.intensity}));
 const torchHaloMaterial=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,190,110,.55)');g.addColorStop(.35,'rgba(255,130,50,.18)');g.addColorStop(1,'rgba(255,100,30,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});})();
 // Integer hash so torches scatter along a wall instead of lining a whole row.
 
 const floorKit=createFloorKit();
 const cavern=createCavern({group,scene,camera,controls});
 const branchAir=createBranchAir({group}),branchMood=createBranchMood({group,cavernMotes:cavern.motes});/* the named levels' own air: fog, light and particles (special-mood.js) */const specialMood=createSpecialMood({group,cavern,ambient:ambientLights});
 const torchTiles={key:'',list:[]};
 function updateTorchLights(t,dt){return updateTorchLights_(t,dt,{hero,torchTiles,lastLevel:S.lastLevel,tiles,TORCH_LIGHTS,torchLights,TORCH_INTENSITY});}
 
 
 // the tiles' animated parts (sconce flames, trap sigils), found once per tile instead of by a walk each frame
 const animated=createAnimatedRegistry();
 function release(object){animated.remove(object);object.traverse(o=>o.userData.dispose?.());group.remove(object);geometryGC.queue(object);/* its GPU buffers are freed next frame unless still drawn (geometry-gc.js) */}
 const ghosts=new Map();function dropGhost(gh){gh.mats.forEach(m=>m.dispose());release(gh.g);}
 function clear(){for(const o of tiles.values())release(o);for(const a of actors.values()){restoreFade(a);release(a.g);}for(const o of groundItems.values())release(o);for(const o of liftingItems)release(o);liftingItems.clear();pickupNotes.clear();for(const w of wells.values())release(w);for(const gh of ghosts.values())dropGhost(gh);ghosts.clear();marks.clear();envStory.clear();tiles.clear();actors.clear();groundItems.clear();wells.clear();tileInstances.clear();actorBatch.clear();}
 function pickupIcon(cell){return pickupIcon_(cell,{creatureFactory});}
 // Traps and the other known features (ice, bog, drawbridges, ice walls, clouds, air) get a
 // model once their own symbol is showing (a monster or item on top hides it);
 // anything else keeps the symbol label.
 function dressFeature(tile,cell){return dressFeature_(tile,cell,{animated,tileInstances});}
 // Stairs and ladders share the up/down terrain; the glyph's colour tells them apart while
 // nothing covers it (ladder.js), so a square first seen occupied shows stairs until then.
 
 // Dead trees share the tree terrain; the glyph's colour tells them apart while nothing
 // covers it (dead-tree.js), and a tree withered by a death ray swaps in place.
 
 function setDim(tile,dim){if(tile.userData.fog.visible===dim)return;tile.userData.fog.visible=dim;dimLayer.touch();}
 S.coughHunch=0;S.coughApplied=0;const hero=playerFactory();hero.setWeapon?.(null);hero.actions=createActionQueue();group.add(hero.g);const heroForm=createHeroForm(hero,creatureFactory,shape=>addOutlines(shape));/* the hero's pieces draw through merged stand-ins per parent and material (hero-batch.js); held weapons, auras and a polymorph shape are left out */const heroBatch=createHeroBatch(hero.g,{exclude:o=>o===hero.weaponSocket||o===hero.offhandSocket||o===hero.g.userData.heldWand||o===heroForm.shape,outline:m=>addOutlines(m)});
 const swingFx=createSwingFx(THREE,group);const hitFx=createHitFx(THREE,group);const rays=createRays(THREE,group);const zapFlash=createZapFlash(THREE,group);const rayMarks=createRayMarks(THREE,group);const flashLight=new THREE.PointLight(0xffa050,0,9,1.4);group.add(flashLight);const explosions=createExplosions(THREE,group);const flood=createFlood(THREE,group);S.flooding=false;const splash=createSplash(THREE,group);const flights=createFlights(THREE,group);const orientOverlay=createOrientationOverlay(group);if(new URLSearchParams(location.search).has('orient'))orientOverlay.set(true);const grab=createGrab(THREE,group,{onSplash:s=>splash.add(s)});const brainSuck=createBrainSuck(THREE,group);const hold=createHold(THREE,group);const poly=createPolymorph(THREE,group);const barsMelt=createBarsMelt(THREE,group);const doorBreak=createDoorBreak(THREE,group);const breath=createBreath(THREE,group);const engulf=createEngulf(THREE,group);S.swingTarget=null;const hitFeel=createHitFeel();
 const darkness=createDarkness(THREE,group),darkEyes=createDarkEyes(THREE);const effectLights=createEffectLights(THREE,group);const deathFx=createDeathBurst(THREE);group.add(deathFx.points);const petrify=createPetrify({onBurst:(b,at,a)=>deathFx.burst(b.style,at,{dir:b.dir,...deathLook(a)})});const throneVanish=createThroneVanish(THREE,group);const fountainLady=createFountainLady(THREE,group);const fountainSnakes=createFountainSnakes(THREE,group);const fountainGush=createFountainGush(THREE,group);const altarSacrifice=createAltarSacrifice(THREE,group);const altarClover=createAltarClover(THREE,group);const altarGlow=createAltarGlow(THREE,group);const mjollnirStrikes=createLightningStrikes(group);const altarFlashes=createAltarFlashes(group,{top:ALTAR_TOP});const altarGift=createAltarGift(THREE,group);const blessFlash=createBlessFlash(THREE,group);const glowLog=createGlowLog();const fountainNymph=createFountainNymph(THREE,group);const fountainDemon=createFountainDemon(THREE,group);const fountainWish=createFountainWish(THREE,group);const wandWishFlare=createWandWishFlare(THREE,group);const djinniWish=createDjinniWish(THREE,group);const fireTrapJet=createFireTrapJet(THREE,group,{lights:effectLights});const goldGlint=createGoldGlint(THREE,group);const firstKill=createFirstKill(THREE,group);const potionSip=createPotionSip(THREE,group);const sinkDrain=createSinkDrain(THREE,group);const stoneCure=createStoneCure(THREE,group);const towelWipe=createTowelWipe(THREE,group);const calmClear=createCalmClear(THREE,group);const unicornSpiral=createUnicornSpiral(THREE,group);const stairStep=createStairStep(THREE,group);const searchReveal=createSearchReveal(THREE,group);const squeakyBoard=createSqueakyBoard(THREE,group);const rollingTrap=createRollingTrap(THREE,group);const fallingRock=createFallingRock(THREE,group);const dartTrap=createDartTrap(THREE,group);const landMine=createLandMine(THREE,group);const rustTrap=createRustTrap(THREE,group);const iceTrap=createIceTrap(THREE,group);const pitFall=createPitFall(THREE,group);const polyTrap=createPolyTrap(THREE,group);const magicTrap=createMagicTrap(THREE,group);const boulderFill=createBoulderFill(THREE,group);const spellFizzle=createSpellFizzle(THREE,group);const throneSit=createThroneSit(THREE,group);const throneCurse=createThroneCurse(THREE,group);const throneInsight=createThroneInsight(THREE,group);const throneWrench=createThroneWrench(THREE,group);const throneGift=createThroneGift(THREE,group);const spellStudy=createSpellStudy(THREE,group);const spellCrumble=createSpellCrumble(THREE,group);const antiMagic=createAntiMagic(THREE,group);const webSnare=createWebSnare(THREE,group);const statueTrap=createStatueTrap(THREE,group);const bearTrapSnap=createBearTrapSnap(THREE,group);const sleepingGas=createSleepingGas(THREE,group);const teleportBlink=createTeleportBlink(THREE,group,{lights:effectLights});const magicPortal=createMagicPortal(THREE,group,{lights:effectLights});const digChips=createDigChips(THREE,group);const digCracks=createDigCracks(THREE,group);const digSwing=createDigSwing();const digDrop=createDigDrop();const stairTumble=createStairTumble();const levelUp=createLevelUp(THREE,group);const prayerLight=createPrayerLight(THREE,group),/* a bag of holding destroyed: a black hole on the hero's square (bag-explosion.js) */bagExplosion=createBagExplosion(THREE,group);const prayerKneel=createPrayerKneel();
 // Something new was staged this frame (a tile, an item, a monster): after the frame is applied, its
 // shaders compile ahead of the draw (compileAsync uses the parallel-compile extension where there
 // is one), instead of stalling the first frame that shows a new material.
 S.staged=false;const compiledMaterials=new WeakSet();const fadePrewarm=createFadePrewarm();
 /* compiled against a render target, as the composer draws the scene (into its buffers: linear colour, tone
 mapping left to the output pass). Compiled for the canvas instead, every warmed shader was the canvas variant (sRGB,
 ACES), which the frame never uses, and the frame's own variant compiled on the spot at first draw (shader-target.js) */
 const warmTarget=renderer?createWarmTarget(THREE):null;
 function warmUp(){if(!S.staged||!renderer?.compileAsync)return;S.staged=false;/* what has not been drawn before waits off-camera for its shaders, so the screen never stalls on a compile (compile-gate.js) */const held=holdUncompiled(group,compiledMaterials,o=>o===hero.g),done=()=>releaseHeld(held,compiledMaterials);compileFor(renderer,warmTarget,()=>renderer.compileAsync(scene,camera)).then(done,done);setTimeout(done,MAX_WAIT_MS);/* the see-through copies a death's fade and invisibility will need compile now, not as the creature dies (fade-prewarm.js) */const fades=fadePrewarm.stage([hero.g,...[...actors.values()].map(a=>a.g)]);if(fades)compileFor(renderer,warmTarget,()=>renderer.compileAsync(fades,camera,scene)).catch(()=>{});}
 function apply(frame){return apply_(frame,L);}
 const rises=createRiseWatch();
 // "There is an altar to … here." arrives just before the frame that puts the hero on the altar, so
 // the glow waits for that frame instead of landing on the square the hero stepped off.
 S.pendingAltarGlow=null;
 // The hero's conditions from the latest frame (hud-conditions.js), or null before the first one.
 S.frameConditions=null;S.frameCountdowns=null;S.messagePanelsDue=false;S.lastMessageText='';S.remodels=Infinity;
 // Mjollnir: "Lightning strikes the jackal!" brings a bolt down on the monster the hero just hit.
 // The message and the hero's combat event can come in either order, so whichever comes second
 // pairs them; the bolt lands at the swing's impact, not the moment the news arrives.
 S.heldCrackle=null;S.lastHeroHit=null;S.pendingStrike=null;const strikeQueue=[];
 const STRIKE_PAIR_MS=1500,IMPACT_MS=ACTION_TIME.attack*STRIKE_U*1000;
 function queueStrike(at,name){return queueStrike_(at,name,L);}
 function fireStrikes(){return fireStrikes_(L);}
 S.meleeIntent=null;S.combatStream=false;S.heldFrame=null;S.heldTimer=null;S.fxHoldUntil=0;
 // A bridge that sends combat events drives the action layer; text matching is the fallback for older engines.
 const findSide=s=>findActor(actors,s.x,s.z,{name:s.name,origin:S.origin});
 // Whoever stands where a thrown object starts (throw-motion.js): the hero or a seen monster.
 const findThrower=(x,z)=>S.latest?.player&&x===S.latest.player.x&&z===S.latest.player.z?hero:findActor(actors,x,z,{exact:true});
 function combatEvent(v){return combatEvent_(v,L);}
 // Map frames wait for queued deaths to play, so the corpse appears after the fall; a newer frame replaces a held one.
 function applySoon(frame){return applySoon_(frame,L);}
 const messageLog=createMessageLog();S.turnMark=0;
 // The square of the nearest monster of that species (the name a trap message gives, "jackal"), in
 // scene space, or null: so a monster's trap effect goes off under the monster, not the hero.
 function monsterSquare(name){return monsterSquare_(name,L);}
 function message(text){return message_(text,L);}
 function drawMessagePanels(){return drawMessagePanels_(L);}
 // The name the player typed for their character; the start screen saves it here. Without one the engine uses its default.
 function savedPlayerName(){try{return localStorage.getItem('deanhack.playerName')||undefined;}catch{return undefined;}}
 async function post(path,body){return post_(path,body,L);}
 async function reply(value){return reply_(value,L);}
 function showGround(items){
  groundPanel.replaceChildren();S.groundPanelTile=groundTile(S.latest);groundPanel.hidden=!items.length;
  const heading=document.createElement('strong');heading.textContent='On the ground';groundPanel.append(heading);
  const list=document.createElement('ul');for(const name of items){const item=document.createElement('li');item.textContent=name;list.append(item);}groundPanel.append(list);
  const hint=document.createElement('small');hint.textContent='Press , to pick up';groundPanel.append(hint);
 }
 function prompt(){return prompt_(L);}
 dialog.addEventListener('cancel',e=>{e.preventDefault();if(S.pending)reply(S.pending.kind==='menu'?'!':S.pending.kind==='line'?'\u001b':27);});
 // Prefer push (SSE); some hosting paths (a tunnel or proxy that buffers streaming
 // responses) never deliver a single byte over it, so fall back to polling /engine/poll
 // if nothing arrives within a few seconds.
 function connect(...a){return connect_(L,...a);}
 // The splash is the only way in, so the footer's start button and name box stay hidden (the splash drives them).
 /* the last stretch of the game, for a replay of a bug (replay-recorder.js) */const recorder=createRecorder();S.replaying=false;
 S.startScreen=null;S.lastDeath=null;S.heroCorpse=null;S.heroCell=null;S.heroTeleportAt=-Infinity;const deathBeat=createDeathBeat();
 // The hero's bones, laid on her cell once the fall has played out (death-beat.js).
 // The bones start invisible: crossfadeHeroBones dissolves the body into them (BONES_FADE_MS).
 function layHeroBones(){return layHeroBones_(L);}
 function crossfadeHeroBones(f){return crossfadeHeroBones_(f,L);}
 function clearHeroBones(){return clearHeroBones_(L);}
 function setMode(value){S.active=value;minimap.setVisible(value);if(!value)syncAim();cavern.setActive(S.active);for(const {light,base} of ambientLights)light.intensity=S.active?base*LIVE_AMBIENT:base;document.body.classList.toggle('live-engine',S.active);group.visible=S.active;panel.hidden=!S.active;actions.hidden=!S.active;$('.character h2').hidden=S.active;if(!S.active){$('.character').classList.remove('low-hp');levelBanner.classList.remove('show');S.shownTitle=null;}$('.keys').innerHTML=S.active?LIVE_KEYS_HTML:'';if(S.active){if(S.latest)apply(S.latest);prompt();}else{dialog.close();dropEngulfCamera(camera,controls);}onMode?.(S.active);}
 button.onclick=async()=>{if(S.active)return;setMode(true);setPrompt('Starting isolated UnNetHack…');try{const started=await post('/engine/start',{name:savedPlayerName(),...readChoice()});if(started?.name)setCharacterName(started.name);connect();}catch(e){S.startScreen?.landed?.();/* the descent's spiral lifts so the message can be read */message(`Could not start engine: ${e.message}. Run npm run engine:build first.`);}};
 // The first thing a visitor sees: a name and one button that resumes or begins a game and goes straight to Live.
 S.startScreen=installStartScreen({button,nameInput});nameInput.hidden=true;button.hidden=true;
 // the pet's skins (feline-hull.js), kitten first, then its grown-up looks, are grown before they are needed, so
 // neither the first level nor growing up later stalls on one (each takes a few seconds)
 {const looks=['kitten','housecat','large cat'];let worker=null;try{worker=new Worker(new URL('./feline-hull-worker.js',import.meta.url),{type:'module'});}catch{}
  /* in a worker the seconds of growing never touch the page (feline-hull-worker.js); without one, idle slots as before */
  if(worker){worker.onmessage=({data})=>{if(data?.hull)adoptFelineHull(data.key,unpackHull(data.hull));if(!looks.length)worker.terminate();else worker.postMessage({name:looks.shift()});};worker.onerror=()=>{worker.terminate();worker=null;};worker.postMessage({name:looks.shift()});}
  else{const idle=globalThis.requestIdleCallback??(f=>setTimeout(f,800)),next=()=>{const n=looks.shift();if(!n||(S.active&&n!=='kitten'))return;try{growFelineHull(n);}catch{}idle(next);};idle(next);}}
 actions.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>{if(S.pending?.kind==='command')reply(Number(b.dataset.key));});
 /* a key press or click that waited out a freeze is dropped, not played (stale-input.js) */guardStaleInput(globalThis,()=>S.active);
 addEventListener('keydown',e=>{if(!S.active||e.altKey||e.metaKey)return;if(e.ctrlKey&&e.key.toLowerCase()==='p'){e.preventDefault();e.stopImmediatePropagation();historyPanel.toggle();}else if(e.key==='Escape'&&historyPanel.isOpen()){e.preventDefault();e.stopImmediatePropagation();historyPanel.hide();}},true);
 addEventListener('keydown',e=>{if(!S.active||e.metaKey||e.altKey)return;if(e.target instanceof HTMLInputElement)return;
   if(e.ctrlKey){if(e.key.toLowerCase()==='d'&&S.pending?.kind==='command'){e.preventDefault();e.stopImmediatePropagation();void reply(4);}return;}
   if(S.pending?.kind==='menu')return;let code;const directions={ArrowUp:107,ArrowDown:106,ArrowLeft:104,ArrowRight:108};
   if(S.pending?.kind==='command'){code=directions[e.key]??(e.key===' '?46:e.key.length===1?e.key.charCodeAt(0):undefined);}
   // getpos cursor prompt (travel, stair travel, farlook): raw keys and Escape, Enter picks the spot
   else if(S.pending?.kind==='position'){code=directions[e.key]??(e.key==='Escape'?27:e.key==='Enter'?46:e.key.length===1?e.key.charCodeAt(0):undefined);}else code=directions[e.key]??(e.key==='Enter'?13:e.key==='Escape'?27:e.key.length===1?e.key.charCodeAt(0):undefined);
   if(code){e.preventDefault();e.stopImmediatePropagation();inputPace.press(performance.now());if(S.pending)reply(code);else if(S.pending===null)inputPace.push(code);}
 },true);
 /* what the parts in live-prompt.js read (L) */Object.assign(L,{syncAim,S,setPrompt,showGround,reply,dialog,glowLog,messageLog});
 /* what the parts in live-messages.js read (L) */Object.assign(L,{splash,S,heldUnder,groundItems,release,actors,digChips,hero,digCracks,digSwing,prayerKneel,digDrop,stairTumble,levelUp,prayerLight,throneVanish,fountainLady,fountainSnakes,fountainGush,altarSacrifice,altarClover,altarFlashes,STRIKE_PAIR_MS,queueStrike,altarGift,blessFlash,glowLog,fountainNymph,fountainDemon,fountainWish,fireTrapJet,monsterSquare,goldGlint,firstKill,potionSip,sinkDrain,stoneCure,towelWipe,calmClear,unicornSpiral,searchReveal,squeakyBoard,rollingTrap,fallingRock,dartTrap,landMine,rustTrap,iceTrap,pitFall,polyTrap,magicTrap,boulderFill,spellFizzle,throneSit,throneCurse,throneInsight,throneWrench,throneGift,spellStudy,spellCrumble,antiMagic,webSnare,statueTrap,bearTrapSnap,sleepingGas,teleportBlink,magicPortal,grab,brainSuck,poly,barsMelt,breath,messageLog,drawMessagePanels,$,historyPanel});
 /* what the parts in live-apply.js read (L) */Object.assign(L,{S,dimLayer,hitFeel,statusProgress,minimap,$,announceLevel,groundPanel,showGround,hero,heroForm,poly,camera,controls,clear,darkness,darkEyes,throneVanish,fountainLady,fountainSnakes,fountainGush,altarSacrifice,altarClover,altarGlow,mjollnirStrikes,altarFlashes,strikeQueue,altarGift,blessFlash,glowLog,fountainNymph,fountainDemon,fountainWish,wandWishFlare,djinniWish,fireTrapJet,goldGlint,firstKill,potionSip,sinkDrain,stoneCure,towelWipe,calmClear,unicornSpiral,stairStep,searchReveal,squeakyBoard,rollingTrap,fallingRock,dartTrap,landMine,rustTrap,iceTrap,pitFall,polyTrap,magicTrap,boulderFill,spellFizzle,throneSit,throneCurse,throneInsight,throneWrench,throneGift,spellStudy,spellCrumble,antiMagic,webSnare,statueTrap,bearTrapSnap,sleepingGas,digChips,digCracks,digSwing,digDrop,stairTumble,levelUp,teleportBlink,magicPortal,prayerLight,prayerKneel,rays,zapFlash,rayMarks,explosions,flood,splash,flights,grab,brainSuck,hold,barsMelt,doorBreak,breath,engulf,clearHeroBones,tiles,release,floorGeo,floorKit,wallGeo,wall,torchHaloMaterial,group,animated,tileInstances,dressFeature,setDim,wells,wellTemplate,groundItems,petrify,actors,pickupIcon,creatureFactory,catFactory,monsterFactory,actorBatch,rises,envStory,cavern,branchAir,branchMood,ghosts,dropGhost,heldUnder,pickupNotes,liftingItems,renderSurroundings,warmUp});
 /* what the parts in live-engine-link.js read (L) */Object.assign(L,{S,hideLinkBanner,showLinkBanner,recorder,onActivity,applySoon,travelState,travelMark,messageLog,prompt,reply,message,renderStatus,combatEvent,pickupNotes,wandWishFlare,djinniWish,teleportBlink,rises,zapFlash,hero,findThrower,rays,rayMarks,explosions,flights,splash,breath,deathBeat,dialog,setMode,setPrompt,post,actors,apply});
 /* what the parts in live-combat.js read (L) */Object.assign(L,{S,marks,grab,findSide,brainSuck,STRIKE_PAIR_MS,queueStrike,hero,actors,strikeQueue,IMPACT_MS,mjollnirStrikes});
 /* what the parts in live-status.js read (L) */Object.assign(L,{renderAttributes,$,S,statusProgress,esc,attributesEl,levelBanner});
 /* what the parts in live-hero-death.js read (L) */Object.assign(L,{S,group,hero,deathBeat});
 /* the per-frame step, a declaration so it can be split out like the rest */function updateFrame(t,dt){return updateFrame_(t,dt,L);}
 /* what the parts in live-frame.js read (L) *//* the map's building backlog, for live-apply.js and live-frame.js */Object.assign(L,{tileBacklog,warmUp});Object.assign(L,{inputPace});Object.assign(L,{specialMood});Object.assign(L,{bagExplosion});Object.assign(L,{heroAffliction});Object.assign(L,{armourDust});Object.assign(L,{deathRecap});Object.assign(L,{geometryGC,group,hitFeel,camera,aim,travelMark,S,hero,dimLayer,tiles,zapFlash,STEP,teleportBlink,heroForm,controls,lantern,darkness,darkEyes,actors,animated,deathBeat,layHeroBones,crossfadeHeroBones,digSwing,prayerKneel,swingFx,updateTorchLights,cavern,branchAir,branchMood,viewCull,deathFx,psiState,actorBatch,hitFx,petrify,throneVanish,fountainLady,fountainSnakes,fountainGush,altarSacrifice,altarClover,altarGlow,mjollnirStrikes,altarFlashes,fireStrikes,altarGift,blessFlash,fountainNymph,fountainDemon,fountainWish,wandWishFlare,djinniWish,fireTrapJet,goldGlint,firstKill,potionSip,sinkDrain,stoneCure,towelWipe,calmClear,unicornSpiral,stairStep,searchReveal,squeakyBoard,rollingTrap,fallingRock,dartTrap,landMine,rustTrap,iceTrap,pitFall,polyTrap,magicTrap,boulderFill,spellFizzle,throneSit,throneCurse,throneInsight,throneWrench,throneGift,spellStudy,spellCrumble,antiMagic,webSnare,statueTrap,bearTrapSnap,sleepingGas,magicPortal,digChips,digCracks,levelUp,prayerLight,rays,rayMarks,explosions,flashLight,RAY_FLASH_INTENSITY,BLAST_LIGHT_INTENSITY,groundItems,liftingItems,release,marks,flood,splash,flights,grab,brainSuck,hold,digDrop,stairTumble,poly,barsMelt,doorBreak,breath,BREATH_LIGHT_INTENSITY,engulf,wells,orientOverlay,heroBatch});
 return {get active(){return S.active;},recorder,/* plays a saved record: Live with no engine behind it, fed by the returned handler */startReplay(){S.replaying=true;recorder.enabled=false;setMode(true);connect({replay:true});return S.currentHandle;},get heroBatch(){return {proxies:heroBatch.proxies.length,batched:heroBatch.batched.length,rebuilds:heroBatch.rebuilds};},get portraitSubject(){/* the HUD portrait's hero (hero-portrait.js): the model, its head, the polymorph stand-in and what the portrait shows */const p=S.latest?.player;if(!S.active||!p||!hero.target)return null;return {g:hero.g,head:hero.head??hero.parts?.head,shape:heroForm.shape,kit:`${hero.kitKey||''}|${heroForm.current}`,hp:p.hp,maxhp:p.maxhp,conditions:heroConditions(S.frameConditions,$('#engine-status')?.title||''),dead:p.hp<=0||deathBeat.active||!!hero.actions.dead};},setCough(h){S.coughHunch=h;},orient(on){return orientOverlay.set(on);},get orientCount(){return orientOverlay.count;},get darkness(){const s=darkness.state;return {dark:s.dark,radius:s.radius,carried:s.carried,veil:+s.veil.toFixed(2),halo:+s.halo.toFixed(2),veilShown:darkness.veil.visible,haloShown:darkness.halo.visible,eyes:darkEyes.count};},get deathState(){return {dead:!!hero.actions.dead,finished:!!hero.actions.finished,current:hero.actions.current?.kind??null,beat:deathBeat.active,bones:!!S.heroCorpse,fade:+deathBeat.crossfade(performance.now()).toFixed(2),visible:hero.g.visible};},get flightsInAir(){return flights.active.map(f=>({shape:f.shape,visible:f.outer.visible,x:+f.outer.position.x.toFixed(2),z:+f.outer.position.z.toFixed(2),yaw:+f.outer.rotation.y.toFixed(2)}));},_inject(v){S.currentHandle?.(v);},_link(){return S.link;},heroAt(out){if(!S.active||!hero.target||!heroLook(S.latest?.player,true))return null;return hero.g.getWorldPosition(out);},/* where every caster stands, for shadow-motion.js (null outside the live game) */get motionSignature(){if(!S.active||!hero.target)return null;return `${S.lastLevel}|${tiles.size}|${groundItems.size}|`+positionSignature([hero.g,...[...actors.values()].map(a=>a.g)]);},update(t,dt){return updateFrame(t,dt);}};
}
