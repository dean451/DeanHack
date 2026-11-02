import {DIM_COLOR,DIM_OPACITY} from './remembered.js';
import {yawToward} from './orientation.js';
import {LIVE_KEYS_HTML} from './live-keys.js';
import * as THREE from 'three';
import {groundTile} from './ground-notice.js';
import {installStartScreen,readChoice} from './start-screen.js';
import {ALTAR_TOP} from './altar.js';
import {updateDoorSwings} from './door-swing.js';
import {createFloorKit} from './floor.js';
import {createCorpse} from './corpse.js';
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
import {parseAttributes} from './hud.js';
import {updateHeldWandAura} from './wand-auras.js';
import {updatePickupLift} from './pickup-lift.js';
import {createPickupNotes} from './pickup-events.js';
import {updateHeldGleam} from './artifact-gleam.js';
import {createBrainSuck,poseBrainSuck} from './brain-suck.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createExplosions} from './explosions.js';
import {updateSlither} from './slither.js';
import {createFlood} from './flood.js';
import {createSplash} from './splash.js';
import {createFlights} from './flights.js';
import {createGrab} from './grab.js';
import {createHold,poseHeld} from './hold.js';
import {createPolymorph,poseActor} from './polymorph.js';
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
import {updateHeldExcalibur} from './excalibur.js';
import {updateHeldMjollnir,createLightningStrikes} from './mjollnir-storm.js';
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
import {createViewCull,restsUnseen} from './view-cull.js';
import {createEffectLights,shareFlash} from './effect-lights.js'; // one fixed pool of lights for the one-shot effects, so the light count (and every shader) stays put
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
import {createOrientationOverlay,liveEntries} from './orientation-overlay.js';
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
import {createTeleportBlink,poseHeroBlink} from './teleport-blink.js';
import {createMagicPortal} from './magic-portal.js';
import {createDigChips} from './dig-chips.js';
import {createDigCracks} from './dig-cracks.js';
import {createDigSwing} from './dig-swing.js';
import {createDigDrop,airborneStatus} from './dig-drop.js';
import {createStairTumble} from './stair-tumble.js';
import {createLevelUp} from './level-up.js';
import {createPrayerLight} from './prayer-light.js';
import {createPrayerKneel} from './prayer-kneel.js';
import {createAnimatedRegistry} from './tile-animations.js';
import {createBreath} from './breath.js';
import {createEngulf,engulfCamera,dropEngulfCamera,poseEngulfed} from './engulf.js';
import {createSwingFx} from './swing-fx.js';
import {createHitFx} from './hit-fx.js';
import {createHitFeel} from './hit-feel.js';
import {createRays,solidAt} from './rays.js';
import {createZapFlash} from './zap-flash.js';
import {createRayMarks} from './ray-marks.js';
import {createDeathBurst,deathLook,applyFade,restoreFade,hideDeathRing} from './deaths.js';
import {createPetrify} from './petrify.js';
import {combatAction,deathAction} from './combat-events.js';
import {createMarks} from './marks.js';
import {createEnvStory} from './env-story.js';
import {createRiseWatch} from './rise.js';
import {updateGait,wingFlap,flightBob} from './gait.js';
import {updateWereShudder} from './were-shudder.js';
import {updateFidget} from './fidget.js';
import {heroLook} from './glance.js';
 // monsters and pets are baked as they are staged (one draw per body part)
import {createActorBatch} from './batched-actors.js'; // and their baked parts draw from one batch
import {createTileInstancer} from './tile-instances.js'; // floor slabs, wall blocks and pebbles draw as instances
import {growFelineHull,adoptFelineHull} from './feline-skin.js';
import {unpackHull} from './hull-transfer.js';
import {findThreat} from './feline-mind.js'; // the pet cat is one skinned mesh (a trial of skinning)
import {updateDragonMenace} from './dragon-menace.js';
import {updateCockatriceHiss} from './cockatrice-hiss.js';
import {updateInsectSettle} from './insect-settle.js';
import {updateCockatriceSettle} from './cockatrice-settle.js';
import {updateCockatriceCrow} from './cockatrice-crowing.js';
import {updateCockatriceBob} from './cockatrice-bob.js';
import {updateInsectAlarm} from './insect-alarm.js';
import {updateDwarfGuard} from './humanoid-guard.js';
import {updateBugbearLurk} from './humanoid-lurk.js';
import {updateGhosting} from './ghosting.js';
import {updateSkulk} from './skulk.js';
import {updateTaunt} from './taunt.js';
import {updateInvoke} from './invoke.js';
import {updateHeft} from './heft.js';
import {updateDwarfStroke} from './dwarf-stroke.js';
import {updateGnomeTug} from './gnome-tug.js';
import {updateOrcSpit} from './orc-spit.js';
import {updateKoboldSniff} from './kobold-sniff.js';
import {updateTenguCock} from './tengu-cock.js';
import {updateHomunculusLurk} from './homunculus-lurk.js';
import {updateCanineSnuffle} from './canine-snuffle.js';
import {updateCanineBow} from './canine-bowing.js';
import {updateCanineSettle} from './canine-settle.js';
import {updateWildcatSettle} from './wildcat-settle.js';
import {updateImpSettle} from './imp-settle.js';
import {updateWildcatStalk} from './wildcat-stalking.js';
import {updateFelineWatch} from './feline-watch.js';
import {updateBeetleGnash} from './beetle-gnash.js';
import {updateBeetleFlex} from './beetle-flex.js';
import {updateTurtleGlare} from './turtle-glare.js';
import {updateQuasitWhisper} from './quasit-whisper.js';
import {updateScorpionClack} from './scorpion-clack.js';
import {updateLemureSlump} from './lemure-slump.js';
import {updateManesScrabble} from './manes-scrabble.js';
import {updateZombieReach} from './zombie-reach.js';
import {updateMummyCreak} from './mummy-creak.js';
import {updateGolemRatchet} from './golem-ratchet.js';
import {updateElfListen} from './elf-listen.js';
import {updateHobbitClutch} from './hobbit-clutch.js';
import {updateLocustRasp} from './locust-rasp.js';
import {updateCentipedeWrithe} from './centipede-writhe.js';
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
import {updateTrudge} from './trudge.js';
import {updateStrawFlop} from './straw-flop.js';
import {updateHemSway} from './hem-sway.js';
import {updateSerpentStaff} from './serpent-staff.js';
import {updateFlap} from './puggaree-flap.js';
import {findPrey,updateStalk,clearStalk} from './stalk.js';
import {createActionQueue,clearActionPose,updateActions,findActor,queueCombat,queueDeath,ACTION_TIME,STRIKE_U} from './actions.js';
import {conditionGlyph} from './condition-glyph.js';
import {heroConditions,conditionTags,conditionTagsHtml} from './hud-conditions.js';
import {applyStatusScreen} from './status-screen.js';
import {psiPressure,updatePsionicScreen,updateFlayerPsi} from './psionic.js';
import {createStatusProgress,worstProgress} from './status-progress.js';
import {createHeroBatch} from './hero-batch.js';
import {walkRoute} from './hero-route.js';
import {holdUncompiled,releaseHeld,MAX_WAIT_MS} from './compile-gate.js';
import {guardStaleInput} from './stale-input.js';
import {createFadePrewarm} from './fade-prewarm.js';
import {createRecorder} from './replay-recorder.js';
import {pickupIcon as pickupIcon_} from './live-ground-icon.js';
import {label,dressFeature as dressFeature_} from './live-tile-dress.js';
import {setPrompt as setPrompt_,setCharacterName as setCharacterName_,statusScreenEl,renderSurroundings as renderSurroundings_,hideLinkBanner as hideLinkBanner_,showLinkBanner as showLinkBanner_} from './live-hud.js';
import {updateTorchLights as updateTorchLights_} from './live-torch-lights.js';
import {prompt as prompt_} from './live-prompt.js';
import {message as message_,drawMessagePanels as drawMessagePanels_} from './live-messages.js';
import {apply as apply_} from './live-apply.js';
import {connect as connect_,reply as reply_,post as post_,applySoon as applySoon_} from './live-engine-link.js';

// Only window-port observations enter this view. No prediction of game rules.
export function installLive({scene,camera,controls,renderer=null,playerFactory,catFactory,monsterFactory,creatureFactory,wellTemplate,onMode,onActivity,torchLightCount=8}) {
 /* the game's changing state (what was "let x" in this closure), one object so the parts split out of live.js can share it */const S={airborne:false};const statusProgress=createStatusProgress();/* the closure's names the split-out parts read, filled in at the end of installLive */const L={};
 const group=new THREE.Group();scene.add(group);group.visible=false;const marks=createMarks(THREE,group);const envStory=createEnvStory(THREE,group);const tileInstances=createTileInstancer(group);const viewCull=createViewCull();const geometryGC=createGeometryGC();const dimLayer=createDimLayer(THREE,group,{color:DIM_COLOR,opacity:DIM_OPACITY});const actorBatch=createActorBatch(group);
 const tiles=new Map(),actors=new Map(),wells=new Map(),groundItems=new Map(),heldUnder={map:new Map()},liftingItems=new Set(),pickupNotes=createPickupNotes();S.active=false;S.lastCommand=null;S.pending=null;S.latest=null;S.token='';S.menu=null;S.commands=null;S.lines=[];S.origin=null;S.lastLevel='';S.lastBranch=null;S.lastDepth=NaN;S.source=undefined;S.pollNow=null;
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
 function renderAttributes({attributes,alignment}){
   S.heroStrength=attributes.find(a=>a.label==='STR')?.value;
   attributesEl.innerHTML=attributes.map(({label,value})=>`<span>${label} <b>${esc(value)}</b></span>`).join('')+(alignment?`<span class="alignment">${esc(alignment.toUpperCase())}</span>`:'');
 }
 // On arrival at a named level or branch, its name fades in over the scene for a few seconds.
 // A banner for a lost link or a restarted server, with the one button that fixes it (a reload).
 const linkBanner=document.createElement('div');linkBanner.id='link-banner';linkBanner.hidden=true;linkBanner.innerHTML='<span></span><button type="button"></button>';document.body.append(linkBanner);
 function showLinkBanner(text,label){return showLinkBanner_(text,label,{active:S.active,linkBanner});}
 function hideLinkBanner(){return hideLinkBanner_({linkBanner});}
 S.link=null;S.currentHandle=null;
 const levelBanner=document.createElement('div');levelBanner.id='level-banner';levelBanner.setAttribute('aria-live','polite');document.body.append(levelBanner);
 S.shownTitle=null;
 function announceLevel(level){
   if(level.title===S.shownTitle)return;S.shownTitle=level.title;if(!level.named)return;
   levelBanner.innerHTML=`<small>${esc(level.place)}</small><strong>${esc(level.title)}</strong>`;
   levelBanner.classList.remove('show');void levelBanner.offsetWidth;levelBanner.classList.add('show');
 }
 // Parse the bottom status line into the same label/value pairs the character panel uses.
 function renderStatus(text){
   // The first status line carries the attributes (hud.js); it is drawn under the stats and
   // never replaces the gold/power/exp line, even while it is still being written.
   if(/^\s*\[/.test(text)){const attrs=parseAttributes(text);if(attrs)renderAttributes(attrs);return;}
   const el=$('#engine-status'),num=re=>text.match(re);el.title=text;if(/T:\d+/.test(text))S.airborne=airborneStatus(text);
   const gold=num(/\$:(\d+)/),power=num(/Pw:(\d+)\((\d+)\)/),exp=num(/Exp:(\d+)/);
   if(!gold&&!power&&!exp){el.textContent=text;return;}
   // The frame's own condition list (bridge) wins; the status line's words are the fallback.
   const conditions=heroConditions(S.frameConditions,text),others=conditions.filter(c=>!conditionTags([c]).length);
   applyStatusScreen(statusScreenEl(),conditions);
   {const turn=num(/T:(\d+)/);statusScreenEl().style.setProperty('--status-progress',worstProgress(statusProgress.update(conditions,turn?+turn[1]:0,S.frameCountdowns)).toFixed(2));}
   el.innerHTML=[gold&&`<span>GOLD <b>${gold[1]}</b></span>`,power&&`<span>POWER <b>${power[1]} / ${power[2]}</b></span>`,exp&&`<span>EXP <b>${exp[1]}</b></span>`,`<span id="hero-conditions">${conditionTagsHtml(conditions)}</span>`,...others.map(c=>`<span class="condition"><i aria-hidden="true">${conditionGlyph(c)}</i> ${esc(c)}</span>`)].filter(Boolean).join('');
 }
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
 const branchAir=createBranchAir({group}),branchMood=createBranchMood({group,cavernMotes:cavern.motes});
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
 const darkness=createDarkness(THREE,group),darkEyes=createDarkEyes(THREE);const effectLights=createEffectLights(THREE,group);const deathFx=createDeathBurst(THREE);group.add(deathFx.points);const petrify=createPetrify({onBurst:(b,at,a)=>deathFx.burst(b.style,at,{dir:b.dir,...deathLook(a)})});const throneVanish=createThroneVanish(THREE,group);const fountainLady=createFountainLady(THREE,group);const fountainSnakes=createFountainSnakes(THREE,group);const fountainGush=createFountainGush(THREE,group);const altarSacrifice=createAltarSacrifice(THREE,group);const altarClover=createAltarClover(THREE,group);const altarGlow=createAltarGlow(THREE,group);const mjollnirStrikes=createLightningStrikes(group);const altarFlashes=createAltarFlashes(group,{top:ALTAR_TOP});const altarGift=createAltarGift(THREE,group);const blessFlash=createBlessFlash(THREE,group);const glowLog=createGlowLog();const fountainNymph=createFountainNymph(THREE,group);const fountainDemon=createFountainDemon(THREE,group);const fountainWish=createFountainWish(THREE,group);const wandWishFlare=createWandWishFlare(THREE,group);const djinniWish=createDjinniWish(THREE,group);const fireTrapJet=createFireTrapJet(THREE,group,{lights:effectLights});const goldGlint=createGoldGlint(THREE,group);const firstKill=createFirstKill(THREE,group);const potionSip=createPotionSip(THREE,group);const sinkDrain=createSinkDrain(THREE,group);const stoneCure=createStoneCure(THREE,group);const towelWipe=createTowelWipe(THREE,group);const calmClear=createCalmClear(THREE,group);const unicornSpiral=createUnicornSpiral(THREE,group);const stairStep=createStairStep(THREE,group);const searchReveal=createSearchReveal(THREE,group);const squeakyBoard=createSqueakyBoard(THREE,group);const rollingTrap=createRollingTrap(THREE,group);const fallingRock=createFallingRock(THREE,group);const dartTrap=createDartTrap(THREE,group);const landMine=createLandMine(THREE,group);const rustTrap=createRustTrap(THREE,group);const iceTrap=createIceTrap(THREE,group);const pitFall=createPitFall(THREE,group);const polyTrap=createPolyTrap(THREE,group);const magicTrap=createMagicTrap(THREE,group);const boulderFill=createBoulderFill(THREE,group);const spellFizzle=createSpellFizzle(THREE,group);const throneSit=createThroneSit(THREE,group);const throneCurse=createThroneCurse(THREE,group);const throneInsight=createThroneInsight(THREE,group);const throneWrench=createThroneWrench(THREE,group);const throneGift=createThroneGift(THREE,group);const spellStudy=createSpellStudy(THREE,group);const spellCrumble=createSpellCrumble(THREE,group);const antiMagic=createAntiMagic(THREE,group);const webSnare=createWebSnare(THREE,group);const statueTrap=createStatueTrap(THREE,group);const bearTrapSnap=createBearTrapSnap(THREE,group);const sleepingGas=createSleepingGas(THREE,group);const teleportBlink=createTeleportBlink(THREE,group,{lights:effectLights});const magicPortal=createMagicPortal(THREE,group,{lights:effectLights});const digChips=createDigChips(THREE,group);const digCracks=createDigCracks(THREE,group);const digSwing=createDigSwing();const digDrop=createDigDrop();const stairTumble=createStairTumble();const levelUp=createLevelUp(THREE,group);const prayerLight=createPrayerLight(THREE,group);const prayerKneel=createPrayerKneel();
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
 function queueStrike(at,name){
  let x=null,z=null;
  if(at){x=at.x-S.origin.x;z=at.z-S.origin.z;}
  else if(name){let best=null;for(const a of actors.values())if(a.species===name.toLowerCase()&&a.target){const d=a.target.distanceTo(hero.g.position);if(!best||d<best.d)best={d,a};}if(best){x=best.a.target.x;z=best.a.target.z;}}
  if(x===null)return;strikeQueue.push({x,z,when:(at?.t??performance.now())+IMPACT_MS});
 }
 function fireStrikes(){const now=performance.now();for(let i=strikeQueue.length-1;i>=0;i--)if(strikeQueue[i].when<=now){const s=strikeQueue[i];strikeQueue.splice(i,1);mjollnirStrikes.strike(s.x,s.z);S.heldCrackle?.surge();}}
 S.meleeIntent=null;S.queuedCommand=null;S.combatStream=false;S.heldFrame=null;S.heldTimer=null;S.fxHoldUntil=0;
 // A bridge that sends combat events drives the action layer; text matching is the fallback for older engines.
 const findSide=s=>findActor(actors,s.x,s.z,{name:s.name,origin:S.origin});
 // Whoever stands where a thrown object starts (throw-motion.js): the hero or a seen monster.
 const findThrower=(x,z)=>S.latest?.player&&x===S.latest.player.x&&z===S.latest.player.z?hero:findActor(actors,x,z,{exact:true});
 function combatEvent(v){const c=v.type==='combat'?combatAction(v):deathAction(v);if(!c)return;const log=globalThis.deanhackCombat??=[];log.push(c);if(log.length>16)log.shift();if(S.origin){if(v.type!=='combat')marks.add({type:'death',x:c.x-S.origin.x,z:c.z-S.origin.z,pet:c.pet,name:c.name});else if(c.result==='hit'&&c.defender?.seen&&!c.defender.pet)marks.add({type:'combat',x:c.defender.x-S.origin.x,z:c.defender.z-S.origin.z,name:c.defender.name});}if(v.type!=='combat'){grab.death(c);queueDeath(c,findSide);return;}grab.combat(c);brainSuck.combat(c);S.combatStream=true;if(c.heroAttacks){S.meleeIntent=null;S.swingTarget=c.defender?.name??null;if(c.result==='hit'&&c.defender?.seen){const hit={x:c.defender.x,z:c.defender.z,t:performance.now()};if(S.pendingStrike&&hit.t-S.pendingStrike.t<STRIKE_PAIR_MS){queueStrike(hit);S.pendingStrike=null;}else S.lastHeroHit=hit;}}queueCombat(c,{hero,find:findSide});}
 // Map frames wait for queued deaths to play, so the corpse appears after the fall; a newer frame replaces a held one.
 function applySoon(frame){return applySoon_(frame,L);}
 const messageLog=createMessageLog();S.turnMark=0;
 // The square of the nearest monster of that species (the name a trap message gives, "jackal"), in
 // scene space, or null: so a monster's trap effect goes off under the monster, not the hero.
 function monsterSquare(name){const p=S.latest?.player;if(!p||!S.latest?.cells)return null;let best=null,bd=Infinity;
  for(const c of S.latest.cells){if(!c.name||c.object||String(c.name).toLowerCase()!==name)continue;const d=Math.hypot(c.x-p.x,c.z-p.z);if(d<bd){bd=d;best=[c.x-S.origin.x,c.z-S.origin.z];}}return best;}
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
 function layHeroBones(){if(S.heroCorpse||!S.latest?.player)return;S.heroCorpse=createCorpse(S.latest.player.role||'human',15,(S.latest.player.x*7+S.latest.player.z)|0);S.heroCorpse.position.set(S.latest.player.x-S.origin.x,0,S.latest.player.z-S.origin.z);S.heroCorpse.traverse(o=>{if(o.isMesh&&o.material){o.material.transparent=true;o.material.opacity=0;}});group.add(S.heroCorpse);}
 function crossfadeHeroBones(f){if(!S.heroCorpse)return;applyFade(hero,1-f);S.heroCorpse.traverse(o=>{if(!o.isMesh||!o.material)return;o.material.opacity=f;if(f>=1)o.material.transparent=false;});if(f>=1)hero.g.visible=false;}
 function clearHeroBones(){deathBeat.clear();if(S.heroCorpse){group.remove(S.heroCorpse);S.heroCorpse.userData.dispose?.();S.heroCorpse=null;}restoreFade(hero);hero.g.visible=true;}
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
   if(code){e.preventDefault();e.stopImmediatePropagation();if(S.pending)reply(code);else if(S.pending===null)S.queuedCommand=code;}
 },true);
 /* what the parts in live-prompt.js read (L) */Object.assign(L,{syncAim,S,setPrompt,showGround,reply,dialog,glowLog,messageLog});
 /* what the parts in live-messages.js read (L) */Object.assign(L,{splash,S,heldUnder,groundItems,release,actors,digChips,hero,digCracks,digSwing,prayerKneel,digDrop,stairTumble,levelUp,prayerLight,throneVanish,fountainLady,fountainSnakes,fountainGush,altarSacrifice,altarClover,altarFlashes,STRIKE_PAIR_MS,queueStrike,altarGift,blessFlash,glowLog,fountainNymph,fountainDemon,fountainWish,fireTrapJet,monsterSquare,goldGlint,firstKill,potionSip,sinkDrain,stoneCure,towelWipe,calmClear,unicornSpiral,searchReveal,squeakyBoard,rollingTrap,fallingRock,dartTrap,landMine,rustTrap,iceTrap,pitFall,polyTrap,magicTrap,boulderFill,spellFizzle,throneSit,throneCurse,throneInsight,throneWrench,throneGift,spellStudy,spellCrumble,antiMagic,webSnare,statueTrap,bearTrapSnap,sleepingGas,teleportBlink,magicPortal,grab,brainSuck,poly,barsMelt,breath,messageLog,drawMessagePanels,$,historyPanel});
 /* what the parts in live-apply.js read (L) */Object.assign(L,{S,dimLayer,hitFeel,statusProgress,minimap,$,announceLevel,groundPanel,showGround,hero,heroForm,poly,camera,controls,clear,darkness,darkEyes,throneVanish,fountainLady,fountainSnakes,fountainGush,altarSacrifice,altarClover,altarGlow,mjollnirStrikes,altarFlashes,strikeQueue,altarGift,blessFlash,glowLog,fountainNymph,fountainDemon,fountainWish,wandWishFlare,djinniWish,fireTrapJet,goldGlint,firstKill,potionSip,sinkDrain,stoneCure,towelWipe,calmClear,unicornSpiral,stairStep,searchReveal,squeakyBoard,rollingTrap,fallingRock,dartTrap,landMine,rustTrap,iceTrap,pitFall,polyTrap,magicTrap,boulderFill,spellFizzle,throneSit,throneCurse,throneInsight,throneWrench,throneGift,spellStudy,spellCrumble,antiMagic,webSnare,statueTrap,bearTrapSnap,sleepingGas,digChips,digCracks,digSwing,digDrop,stairTumble,levelUp,teleportBlink,magicPortal,prayerLight,prayerKneel,rays,zapFlash,rayMarks,explosions,flood,splash,flights,grab,brainSuck,hold,barsMelt,doorBreak,breath,engulf,clearHeroBones,tiles,release,floorGeo,floorKit,wallGeo,wall,torchHaloMaterial,group,animated,tileInstances,dressFeature,setDim,wells,wellTemplate,groundItems,petrify,actors,pickupIcon,creatureFactory,catFactory,monsterFactory,actorBatch,rises,envStory,cavern,branchAir,branchMood,ghosts,dropGhost,heldUnder,pickupNotes,liftingItems,renderSurroundings,warmUp});
 /* what the parts in live-engine-link.js read (L) */Object.assign(L,{S,hideLinkBanner,showLinkBanner,recorder,onActivity,applySoon,travelState,travelMark,messageLog,prompt,reply,message,renderStatus,combatEvent,pickupNotes,wandWishFlare,djinniWish,teleportBlink,rises,zapFlash,hero,findThrower,rays,rayMarks,explosions,flights,splash,breath,deathBeat,dialog,setMode,setPrompt,post,actors,apply});
 return {get active(){return S.active;},recorder,/* plays a saved record: Live with no engine behind it, fed by the returned handler */startReplay(){S.replaying=true;recorder.enabled=false;setMode(true);connect({replay:true});return S.currentHandle;},get heroBatch(){return {proxies:heroBatch.proxies.length,batched:heroBatch.batched.length,rebuilds:heroBatch.rebuilds};},get portraitSubject(){/* the HUD portrait's hero (hero-portrait.js): the model, its head, the polymorph stand-in and what the portrait shows */const p=S.latest?.player;if(!S.active||!p||!hero.target)return null;return {g:hero.g,head:hero.head??hero.parts?.head,shape:heroForm.shape,kit:`${hero.kitKey||''}|${heroForm.current}`,hp:p.hp,maxhp:p.maxhp,conditions:heroConditions(S.frameConditions,$('#engine-status')?.title||''),dead:p.hp<=0||deathBeat.active||!!hero.actions.dead};},setCough(h){S.coughHunch=h;},orient(on){return orientOverlay.set(on);},get orientCount(){return orientOverlay.count;},get darkness(){const s=darkness.state;return {dark:s.dark,radius:s.radius,carried:s.carried,veil:+s.veil.toFixed(2),halo:+s.halo.toFixed(2),veilShown:darkness.veil.visible,haloShown:darkness.halo.visible,eyes:darkEyes.count};},get deathState(){return {dead:!!hero.actions.dead,finished:!!hero.actions.finished,current:hero.actions.current?.kind??null,beat:deathBeat.active,bones:!!S.heroCorpse,fade:+deathBeat.crossfade(performance.now()).toFixed(2),visible:hero.g.visible};},get flightsInAir(){return flights.active.map(f=>({shape:f.shape,visible:f.outer.visible,x:+f.outer.position.x.toFixed(2),z:+f.outer.position.z.toFixed(2),yaw:+f.outer.rotation.y.toFixed(2)}));},_inject(v){S.currentHandle?.(v);},_link(){return S.link;},heroAt(out){if(!S.active||!hero.target||!heroLook(S.latest?.player,true))return null;return hero.g.getWorldPosition(out);},/* where every caster stands, for shadow-motion.js (null outside the live game) */get motionSignature(){if(!S.active||!hero.target)return null;return `${S.lastLevel}|${tiles.size}|${groundItems.size}|`+positionSignature([hero.g,...[...actors.values()].map(a=>a.g)]);},update(t,dt){geometryGC.flush(group);const feel=hitFeel.update(dt);hitFeel.apply(camera,feel.offset);dt*=feel.scale;aim.update(t);travelMark.update(t);if(!S.active||!hero.target)return;dimLayer.sync(tiles);poseEngulfed(hero,null);poseHeld(hero,null);clearActionPose(hero,hero.actions);unposeDualStance(hero);zapFlash.unpose(hero);const delta=STEP.copy(hero.target).sub(hero.g.position),moving=delta.length()>.025;if(moving)hero.g.rotation.y=hero.route?.length&&hero.routeYaw!==undefined?hero.routeYaw:Math.atan2(delta.x,delta.z);beginHop(hero);if(!walkRoute(hero,dt))hero.g.position.lerp(hero.target,1-Math.exp(-dt*14));endHop(hero,dt);{const blink=teleportBlink.heroPose();poseHeroBlink(hero,blink?.pose,blink?.from,blink?.to);}hero.body.position.y=Math.sin(t*(moving?18:2))*(moving?.035:.013);if(S.coughHunch||S.coughApplied)hero.body.rotation.x=S.coughHunch;S.coughApplied=S.coughHunch;hero.legs.forEach((l,i)=>l.rotation.x=moving?Math.sin(t*18+i*Math.PI)*.5:0);heroForm.animate(t,moving);hero.cape.rotation.x=-.17+Math.sin(t*3)*.06;if(hero.plume)hero.plume.rotation.z=-.16+Math.sin(t*2.4)*.035;updateGhosting(hero,dt,t,!!S.latest?.player?.invisible);
   const offset=STEP.copy(hero.g.position).sub(controls.target);offset.y=0;offset.multiplyScalar(1-Math.exp(-dt*3));controls.target.add(offset);camera.position.add(offset);lantern.position.copy(hero.g.position);lantern.position.y+=3;
   darkness.update(t,dt,{at:hero.g.position,camera,moving});darkEyes.update(actors.values(),dt,t,{veiled:darkness.state.veil>.5});
   animated.update(t);updateDoorSwings(dt);
   updateDualStance(hero,dt,t);updateActions(hero,hero.actions,dt);if(deathBeat.corpseDue(hero.actions.finished,performance.now()))layHeroBones();if(S.heroCorpse)crossfadeHeroBones(deathBeat.crossfade(performance.now()));digSwing.update(hero,dt,!!hero.actions?.current||!!hero.actions?.queue.length||!!hero.actions?.dead);prayerKneel.update(hero,dt,!!hero.actions?.current||!!hero.actions?.queue.length||!!hero.actions?.dead);zapFlash.update(dt,hero);swingFx.update(hero,dt,S.swingTarget);updateHoseFlop(hero,dt);updateSlingWhirl(hero);
   updateTorchLights(t,dt);cavern.update(t,dt,hero.g.position);branchAir.update(t,dt,hero.g.position);branchMood.update(t,dt,hero.g.position);
   viewCull.update(camera);for(const a of actors.values()){clearActionPose(a,a.actions);clearStalk(a);a.g.userData.updateOracle?.(t);a.g.userData.updateGridBug?.(t);a.g.userData.updateOwlbear?.(t,dt);a.g.userData.updateBaluchitherium?.(t,dt);let walking=false;if(a.target){const d=STEP.copy(a.target).sub(a.g.position);walking=(a.trail?a.pathLeft??d.length():d.length())>.025;if(walking)a.g.rotation.y=a.trail&&a.pathYaw!==undefined?a.pathYaw:yawToward(d.x,d.z,a.g.rotation.y);/* a trail follower (slide.js) faces its own heading along the way it was led */slideTo(a,dt);if(a.legs)a.legs.forEach((l,i)=>l.rotation.x=walking?Math.sin(t*22+i*2)*.4:0);}/* out of view, standing and idle: skip the idle animators this frame (view-cull.js) */if(restsUnseen(a,walking,viewCull))continue;if((a.animator||a.asset?.animator)?.mind)a.senses={hero:heroLook(S.latest?.player,hero.g.position),prey:findPrey(a,actors.values()),threat:findThreat(a,actors.values())};/* what the pet's mind attends to (feline-mind.js) */a.asset?.update(dt,walking);if(a.tail)a.tail.rotation.z=tailSway(a,t);if(a.charm)a.charm.position.y=.3+Math.sin(t*4)*.025;if(a.body){const idle=a.quirk==='orc'?.025:a.quirk==='dragon'?.035:a.quirk==='unicorn'?.022:.015;a.body.position.y=Math.sin(t*(walking?22:2.5))*idle;}if(a.wings?.length)a.wings.forEach((wing,i)=>{if(a.quirk==='bat'||a.flap){wing.rotation.z=(wing.userData.side||(i?1:-1))*wingFlap(a.flap,t);}else if(a.quirk==='bee'){wing.rotation.y=(i?1:-1)*Math.sin(t*60)*.35;}else wing.rotation.y=(i?1:-1)*(-.18+Math.sin(t*5)*.12);});if((a.quirk==='hover'||a.quirk==='bat'||a.quirk==='bee')&&a.body)a.body.position.y=flightBob(a.flap,t,a.g.position.x);if(a.quirk==='dragon')a.g.rotation.z=Math.sin(t*1.7)*.025;if(a.quirk==='nymph'&&a.body)a.body.rotation.z=Math.sin(t*1.3+a.g.position.x)*.035;if(a.quirk==='gridbug')a.g.rotation.z=Math.sin(t*9)*.035;if(a.quirk==='guard')a.g.rotation.z=Math.sin(t*1.3)*.012;const busy=walking||!!a.actions?.current||!!a.actions?.queue.length;updateGait(a,dt,walking);updateSlither(a,dt,t,walking);updatePlod(a,dt,walking);updateSkitter(a,dt,walking);updateTripod(a,dt,walking);updateTrudge(a,dt,walking);updateStrawFlop(a,dt,t,walking);updateHemSway(a,dt,t);updateSerpentStaff(a,dt,t,heroLook(S.latest?.player,hero.g.position));updateFlap(a,dt,t);updateFidget(a,dt,t,busy,heroLook(S.latest?.player,hero.g.position));updateWereShudder(a,dt,t,busy,heroLook(S.latest?.player,hero.g.position));updateStalk(a,dt,t,findPrey(a,actors.values()),busy);const core=a.core||a.g.userData.core;if(core&&!a.spherePulse&&!a.lightFlare)core.material.emissiveIntensity=4.5+Math.sin(t*5)*1.4;if(a.actions){updateActions(a,a.actions,dt);const q=a.actions;if(q.dead)hideDeathRing(a);if(q.dead&&q.fade!=null)applyFade(a,q.fade);if(q.deathBurst){deathFx.burst(q.deathBurst.style,a.g.position,{dir:q.deathBurst.dir,...deathLook(a)});q.deathBurst=null;}if(q.deathShed){deathFx.burst(q.deathShed.style,a.g.position,{dir:q.deathShed.dir,...deathLook(a)});q.deathShed=null;}if(q.riseBurst){for(const look of ['rise','riseMotes'])deathFx.burst(look,a.g.position,deathLook(a));q.riseBurst=null;}}updateBask(a,dt,t,busy);updateDragonMenace(a,dt,t,busy,walking,heroLook(S.latest?.player,hero.g.position));updateCockatriceHiss(a,dt,t,busy,walking,heroLook(S.latest?.player,hero.g.position));updateSkulk(a,dt,t,busy);updateTaunt(a,dt,t,busy);updateInvoke(a,dt,t,busy);updateHeft(a,dt,t,busy);updateDwarfStroke(a,dt,t,busy);updateGnomeTug(a,dt,t,busy);updateOrcSpit(a,dt,t,busy);updateKoboldSniff(a,dt,t,busy);updateTenguCock(a,dt,t,busy);updateHomunculusLurk(a,dt,t,busy);updateCanineSnuffle(a,dt,t,busy);updateCanineBow(a,dt,t,busy,heroLook(S.latest?.player,hero.g.position));updateFelineWatch(a,dt,t,busy);updateBeetleGnash(a,dt,t,busy);updateFlayerPsi(a,dt,t);updateBeetleFlex(a,dt,t,busy);updateTurtleGlare(a,dt,t,busy);updateScorpionClack(a,dt,t,busy);updateLemureSlump(a,dt,t,busy);updateManesScrabble(a,dt,t,busy);updateZombieReach(a,dt,t,busy);updateMummyCreak(a,dt,t,busy);updateGolemRatchet(a,dt,t,busy);updateElfListen(a,dt,t,busy);updateHobbitClutch(a,dt,t,busy);updateLocustRasp(a,dt,t,busy);updateCentipedeWrithe(a,dt,t,busy);updateQuasitWhisper(a,dt,t,busy);updateRally(a,dt,t,busy);updatePonder(a,dt,t,busy);updateKamae(a,dt,t);updateSalute(a,dt,t,busy);updateMonkBow(a,dt,t,busy);updateRogueProwl(a,dt,t,busy);updateBarbarianBrood(a,dt,t,busy);updateHealerPeer(a,dt,t,busy);updateTouristGawk(a,dt,t,busy);updateMuggerCosh(a,dt,t,busy);updateConvictHunted(a,dt,t,busy);updateRangerDraw(a,dt,t,busy);updateCharonOar(a,dt,t,busy);updatePrisonerRock(a,dt,t,busy,heroLook(S.latest?.player,hero.g.position));updateCubeDrift(a,dt,t,walking);updateWhipEmbers(a,dt,t);updateTwitch(a,dt,t,busy);updateWhiffle(a,dt,t,walking,!!a.actions?.current||!!a.actions?.queue.length);updateTuck(a,dt,walking);updateInsectSettle(a,dt,busy,heroLook(S.latest?.player,hero.g.position));updateCockatriceSettle(a,dt,busy,heroLook(S.latest?.player,hero.g.position));updateCanineSettle(a,dt,busy,heroLook(S.latest?.player,hero.g.position));updateWildcatSettle(a,dt,busy,heroLook(S.latest?.player,hero.g.position));updateWildcatStalk(a,dt,t,busy,heroLook(S.latest?.player,hero.g.position));updateCockatriceCrow(a,dt,t,busy,heroLook(S.latest?.player,hero.g.position));updateCockatriceBob(a,dt,walking);updateInsectAlarm(a,dt,t,busy,heroLook(S.latest?.player,hero.g.position));updateDwarfGuard(a,dt,t,busy,heroLook(S.latest?.player,hero.g.position));updateBugbearLurk(a,dt,t,busy,heroLook(S.latest?.player,hero.g.position));updateImpSettle(a,dt,busy,heroLook(S.latest?.player,hero.g.position));}{let el=document.getElementById('psionic');if(!el){el=document.createElement('div');el.id='psionic';document.body.appendChild(el);}updatePsionicScreen(el,psiState,psiPressure(hero.g.position,actors.values()),dt);}/* a mind flayer's pressure at the edges of the view (psionic.js) */actorBatch.update();hitFx.update([hero,...actors.values()],dt);deathFx.update(dt);petrify.update(dt);throneVanish.update(dt);fountainLady.update(dt);fountainSnakes.update(dt);fountainGush.update(dt);altarSacrifice.update(dt);altarClover.update(dt);altarGlow.update(dt);mjollnirStrikes.update(dt);altarFlashes.update(dt);fireStrikes();altarGift.update(dt);blessFlash.update(dt);fountainNymph.update(dt);fountainDemon.update(dt);fountainWish.update(dt);wandWishFlare.update(dt);djinniWish.update(dt);fireTrapJet.update(dt);goldGlint.update(dt);firstKill.update(dt);potionSip.update(dt);sinkDrain.update(dt);stoneCure.update(dt);towelWipe.update(dt);calmClear.update(dt);unicornSpiral.update(dt);stairStep.update(dt);searchReveal.update(dt);squeakyBoard.update(dt);rollingTrap.update(dt);fallingRock.update(dt);dartTrap.update(dt);landMine.update(dt);rustTrap.update(dt);iceTrap.update(dt);pitFall.update(dt);polyTrap.update(dt);magicTrap.update(dt);boulderFill.update(dt);spellFizzle.update(dt);throneSit.update(dt);throneCurse.update(dt);throneInsight.update(dt);throneWrench.update(dt);throneGift.update(dt);spellStudy.update(dt);spellCrumble.update(dt);antiMagic.update(dt);webSnare.update(dt);statueTrap.update(dt);bearTrapSnap.update(dt);sleepingGas.update(dt);teleportBlink.update(dt);magicPortal.update(dt);digChips.update(dt);digCracks.update(dt);levelUp.update(dt);prayerLight.update(dt);rays.update(dt,S.origin);const {flash:rayFlash}=rayMarks.update(dt,S.origin);const blast=explosions.update(dt,S.origin);/* one flash light serves the ray flash, a blast and a breath, whichever is brightest this frame (effect-lights.js shareFlash) */shareFlash(flashLight,[{intensity:rayFlash*RAY_FLASH_INTENSITY,color:0xdce6ff,x:hero.g.position.x,y:3.2,z:hero.g.position.z,distance:18,decay:1.2},{intensity:blast.light*BLAST_LIGHT_INTENSITY,color:blast.color,x:blast.x-S.origin.x,y:1.2,z:blast.z-S.origin.z,distance:9,decay:1.4}]);
   for(const item of groundItems.values())if(item.visible){item.userData.wandAura?.userData.update(t);item.userData.artifactGleam?.userData.update(t);item.userData.scrollAura?.userData.update(t);item.userData.ringAura?.userData.update(t);item.userData.amuletAura?.userData.update(t);item.userData.toolAura?.userData.update(t);item.userData.armorAura?.userData.update(t);item.userData.weaponAura?.userData.update(t);item.userData.potionFx?.userData.update(t);item.userData.potionAura?.userData.update(t);item.userData.bagMaw?.userData.update(t);item.userData.corpseFx?.userData.update(t);}
   for(const item of liftingItems)if(updatePickupLift(item,hero.g.position,dt)){release(item);liftingItems.delete(item);}
   updateHeldWandAura(hero,t);S.heldCrackle=updateHeldMjollnir(hero,dt,t);updateHeldExcalibur(hero,dt,t);updateHeldGleam(hero,t);
   for(const item of groundItems.values())item.userData.coinPile?.update(dt);
   marks.update(dt);if(S.flooding)S.flooding=flood.update(dt,S.origin).count>0;splash.update(dt,S.origin);flights.update(dt,S.origin);const grabbed=grab.update(dt,S.origin);poseBrainSuck(hero,brainSuck.update(dt,S.origin).shake);const holding=hold.update(dt,S.origin,{skip:grabbed.held});poseHeld(hero,holding.squeeze);hero.g.position.y=(hero.hopAt?.y??0)+grabbed.sink+digDrop.update(dt)+stairTumble.update(dt)+(hero.actions.applied?.dy??0);
   const {poses:polyPoses}=poly.update(dt,S.origin);poseActor(hero,S.latest?.player&&polyPoses.get(`${S.latest.player.x},${S.latest.player.z}`));for(const a of actors.values())poseActor(a,polyPoses.get(a.cell));barsMelt.update(dt,S.origin);doorBreak.update(dt,S.origin);const br=breath.update(dt,S.origin);if(br.glow*BREATH_LIGHT_INTENSITY>flashLight.intensity)shareFlash(flashLight,[{intensity:br.glow*BREATH_LIGHT_INTENSITY,color:br.color,x:br.x-S.origin.x,y:1.2,z:br.z-S.origin.z,distance:9,decay:1.4}]);const eng=engulf.update(dt,S.origin);engulfCamera(camera,controls,eng);poseEngulfed(hero,eng.hero);
   for(const tile of tiles.values()){const liquid=tile.userData.liquid;if(!liquid)continue;liquid.visible=!(S.flooding&&flood.pending(tile.position.x+S.origin.x,tile.position.z+S.origin.z));if(tile.visible&&liquid.visible)liquid.userData.updateLiquid(t);}
   for(const w of wells.values())w.userData.updateFountain?.(t);
   if(orientOverlay.enabled)orientOverlay.update(liveEntries({hero,actors:actors.values(),tiles:tiles.values(),flights:flights.active}));
   heroBatch.sync();
 }};
}
