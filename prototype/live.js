import {DIM_COLOR,DIM_OPACITY,GHOST_MAX,shouldGhost,ghostGone,ghostize} from './remembered.js';
import {wallYaw,yawToward} from './orientation.js';
import {LIVE_KEYS_HTML} from './live-keys.js';
import {createShopkeeper,createWatchman,createLightItem,createShopItem} from './shop-visuals.js';
import {createGridBug} from './grid-bug.js';
import * as THREE from 'three';
import {createGroundModel} from './ground-models.js';
import {bareMore,groundNotice,groundTile} from './ground-notice.js';
import {menuKeys,autoCategory,menuCommand,menuGroups,EXT_FALLBACK,matchCommands,resolveCommand,completePrefix} from './engine-menus.js';
import {installStartScreen,readChoice,endedNote} from './start-screen.js';
import {createLinkWatch} from './link-watch.js';
import {dressHero} from './hero-kits.js';
import {meleeDirection,confirmsPlayerMelee} from './combat-visuals.js';
import {createHeldWeapon} from './equipment.js';
import {createCentaurStatue,createOracle,createLiveFountain} from './oracle-visuals.js';
import {createAltar,ALTAR_TOP} from './altar.js';
import {createThrone} from './throne.js';
import {createSink} from './sink.js';
import {createGrave} from './grave.js';
import {createTrap,trapKind} from './trap.js';
import {createTerrainFeature,featureKind,AXIS_FEATURES,bridgeYaw,groundOf,coveredFeature} from './terrain-feature.js';
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
import {createDeathBeat} from './death-beat.js';
import {stageCreature,addOutlines} from './readability.js';
import {createCavern} from './cavern.js';
import {createBranchAir,rockTint,rockRoughness,rockVein,floorFinish,wallFinish} from './branch-air.js';
import {attachModelAsset} from './model-assets.js';
import {MODEL_URLS} from './asset-urls.js';
import {potionLook} from './item-looks.js';
import {captureView,restoreView} from './camera-view.js';
import {createMinimap} from './minimap.js';
import {createMessageLog,addMessage,panelView,allRows,markTurn,sinceMark} from './message-log.js';
import {createHistoryPanel} from './message-history.js';
import {syncDetectedMark} from './detected-mark.js';
import {aimKeys,createAimCursor,directionLanes,isDirectionPrompt,laneHits,laneRange} from './aim-cursor.js';
import {itemBuc,bucMark,itemEnchant,enchantMark,itemHint} from './item-buc.js';
import {itemClassMark,menuColumns} from './item-class.js';
import {squareAt,farlookText,createFarlook} from './farlook.js';
import {clickMove} from './click-move.js';
import {createTravelMark,createTravelState} from './travel-mark.js';
import {levelTitle,lowHealth,parseAttributes} from './hud.js';
import {syncWandAura,syncHeldWandAura,updateHeldWandAura} from './wand-auras.js';
import {updatePickupLift,hasMagicLook} from './pickup-lift.js';
import {createPickupNotes,squareOfKey} from './pickup-events.js';
import {syncArtifactGleam,syncHeldGleam,updateHeldGleam} from './artifact-gleam.js';
import {syncHeldMagic,syncFloorMagic} from './weapon-magic.js';
import {syncScrollAura} from './scroll-auras.js';
import {syncRingAura} from './ring-auras.js';
import {syncAmuletAura} from './amulet-auras.js';
import {syncToolAura} from './tool-auras.js';
import {syncArmorAura} from './armor-auras.js';
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
import {createHeroForm} from './hero-form.js';
import {createBarsMelt} from './bars-melt.js';
import {createDoorBreak} from './door-break.js';
import {animatePortal,createSheolVortex} from './portal-fx.js';
import {createVibratingSquare} from './vibrating-square.js';
import {syncWard} from './elbereth-ward.js';
import {createThroneVanish,isThronePuff} from './throne-vanish.js';
import {createFountainLady,isLadyMessage} from './fountain-lady.js';
import {createFountainSnakes} from './fountain-snakes.js';
import {createFountainGush} from './fountain-gush.js';
import {createAltarSacrifice} from './altar-sacrifice.js';
import {createAltarClover} from './altar-clover.js';
import {createAltarGlow,glowAlignment} from './altar-glow.js';
import {updateHeldExcalibur} from './excalibur.js';
import {updateHeldMjollnir,createLightningStrikes,strikeVictim} from './mjollnir-storm.js';
import {layOnSlab,createAltarFlashes} from './altar-offering.js';
import {createAltarGift} from './altar-gift.js';
import {createBlessFlash,createGlowLog} from './bless-flash.js';
import {createFountainNymph} from './fountain-nymph.js';
import {createFountainDemon} from './fountain-demon.js';
import {createFountainWish} from './fountain-wish.js';
import {createWandWishFlare} from './wand-wish-flare.js';
import {createDjinniWish} from './djinni-wish.js';
import {createFireTrapJet} from './fire-trap-jet.js';
import {createEffectLights} from './effect-lights.js'; // one fixed pool of lights for the one-shot effects, so the light count (and every shader) stays put
import {createGoldGlint} from './gold-glint.js';
import {createPotionSip} from './potion-sip.js';
import {createSinkDrain} from './sink-drain.js';
import {createStoneCure} from './stone-cure.js';
import {createTowelWipe} from './towel-wipe.js';
import {createCalmClear} from './calm-clear.js';
import {createUnicornSpiral} from './unicorn-spiral.js';
import {createStairStep, stepDirection} from './stair-step.js';
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
let airborne=false;
import {createLevelUp} from './level-up.js';
import {createPrayerLight} from './prayer-light.js';
import {createPrayerKneel} from './prayer-kneel.js';
import {promptHeading,deathRecap} from './prompt-view.js';
import {createAnimatedRegistry} from './tile-animations.js';
import {createBreath} from './breath.js';
import {createEngulf,engulfCamera,dropEngulfCamera,poseEngulfed} from './engulf.js';
import {createSwingFx} from './swing-fx.js';
import {createHitFx} from './hit-fx.js';
import {createHitFeel} from './hit-feel.js';
import {createRays,reflectorAt,solidAt} from './rays.js';
import {createZapFlash,ZAP_WINDUP_MS} from './zap-flash.js';
import {createRayMarks} from './ray-marks.js';
import {createDeathBurst,deathLook,applyFade,restoreFade,hideDeathRing} from './deaths.js';
import {createPetrify,restoreStone} from './petrify.js';
import {combatAction,deathAction} from './combat-events.js';
import {createMarks} from './marks.js';
import {createEnvStory} from './env-story.js';
import {reviveAction,riseActionFor,createRiseWatch} from './rise.js';
import {updateGait,flapStyle,wingFlap,flightBob} from './gait.js';
import {updateWereShudder} from './were-shudder.js';
import {updateFidget} from './fidget.js';
import {heroLook} from './glance.js';
import {bakeDraws} from './creatures.js'; // monsters and pets are baked as they are staged (one draw per body part)
import {createActorBatch} from './batched-actors.js'; // and their baked parts draw from one batch
import {createTileInstancer} from './tile-instances.js'; // floor slabs, wall blocks and pebbles draw as instances
import {createSkinnedFeline, growFelineHull} from './feline-skin.js';
import {findThreat,petEats} from './feline-mind.js'; // the pet cat is one skinned mesh (a trial of skinning)
import {isFeline} from './feline.js';
import {updateDragonMenace} from './dragon-menace.js';
import {updateCockatriceHiss} from './cockatrice-hiss.js';
import {updateInsectSettle} from './insect-settle.js';
import {updateCockatriceSettle} from './cockatrice-settle.js';
import {updateCockatriceCrow} from './cockatrice-crowing.js';
import {updateCockatriceBob} from './cockatrice-bob.js';
import {updateInsectAlarm} from './insect-alarm.js';
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
import {perchHeight} from './perch.js';
import {updateTrudge} from './trudge.js';
import {updateStrawFlop} from './straw-flop.js';
import {updateHemSway} from './hem-sway.js';
import {updateSerpentStaff} from './serpent-staff.js';
import {updateFlap} from './puggaree-flap.js';
import {findPrey,updateStalk,clearStalk} from './stalk.js';
import {createActionQueue,enqueueAction,clearActionPose,updateActions,holdBackMs,findActor,queueCombat,queueDeath,queueThrows,ACTION_TIME,STRIKE_U} from './actions.js';
import {conditionGlyph} from './condition-glyph.js';
import {heroConditions,conditionTags,conditionTagsHtml} from './hud-conditions.js';
import {applyStatusScreen} from './status-screen.js';
import {createStatusProgress,worstProgress} from './status-progress.js';
const statusProgress=createStatusProgress();

// Only window-port observations enter this view. No prediction of game rules.
export function installLive({scene,camera,controls,renderer=null,playerFactory,catFactory,monsterFactory,creatureFactory,wellTemplate,demoObjects,onDemo,onMode,onActivity}) {
 const group=new THREE.Group();scene.add(group);group.visible=false;const marks=createMarks(THREE,group);const envStory=createEnvStory(THREE,group);const tileInstances=createTileInstancer(group);const actorBatch=createActorBatch(group);
 const tiles=new Map(),actors=new Map(),wells=new Map(),groundItems=new Map(),liftingItems=new Set(),pickupNotes=createPickupNotes();let active=false,lastCommand=null,pending=null,latest=null,token='',menu=null,commands=null,lines=[],origin=null,lastLevel='',lastBranch=null,lastDepth=NaN,source,pollNow=null;
 const $=s=>document.querySelector(s);
 const WEAPON_CLASS=2,ARMOR_CLASS=3,RING_CLASS=4,AMULET_CLASS=5,POTION_CLASS=8,SCROLL_CLASS=9,COIN_CLASS=12;
 const button=document.createElement('button');button.textContent='Live UnNetHack';button.id='live-mode';$('.buttons').prepend(button);
 // The character's name: typed before starting, kept in localStorage (sent with /engine/start), and shown in the character panel.
 const nameInput=document.createElement('input');nameInput.id='player-name';nameInput.type='text';nameInput.placeholder='Adventurer';nameInput.maxLength=24;nameInput.autocomplete='off';nameInput.spellcheck=false;nameInput.setAttribute('aria-label','Character name');
 try{nameInput.value=localStorage.getItem('deanhack.playerName')||'';}catch{}
 nameInput.addEventListener('input',()=>{try{localStorage.setItem('deanhack.playerName',nameInput.value);}catch{}setCharacterName(nameInput.value);});
 $('.buttons').prepend(nameInput);
 function setCharacterName(name){const el=$('.character>small');if(el)el.textContent=(String(name||'').trim()||'Adventurer');}
 setCharacterName(nameInput.value);
 const panel=document.createElement('section');panel.id='engine-panel';panel.hidden=true;panel.innerHTML='<p id="engine-line" aria-live="polite"></p><div id="engine-messages" role="log"></div><div id="engine-prompt"></div>';document.body.append(panel);
 // Gold, power, experience and conditions live in the character panel, not under the messages.
 const statusLine=document.createElement('div');statusLine.id='engine-status';$('.character').append(statusLine);
 const minimap=createMinimap(document);document.body.append(minimap.el);
 const historyPanel=createHistoryPanel(document,()=>allRows(messageLog));document.body.append(historyPanel.el);
 const farlook=createFarlook(document);document.body.append(farlook.el);{const ray=new THREE.Raycaster(),floor=new THREE.Plane(new THREE.Vector3(0,1,0),0),spot=new THREE.Vector3(),ndc=new THREE.Vector2(),dom=controls.domElement;dom.addEventListener('pointermove',e=>{if(!active||!latest||!origin||e.buttons){farlook.hide();return;}const r=dom.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ndc,camera);if(!ray.ray.intersectPlane(floor,spot)){farlook.hide();return;}const sq=squareAt(spot,origin);farlook.show(farlookText(latest.cells.find(c=>c.x===sq.x&&c.z===sq.z),latest.player?.stuck),e.clientX,e.clientY);});dom.addEventListener('pointerleave',()=>farlook.hide());}
 const aim=createAimCursor();group.add(aim.g);let aimQueue=[];
 const travelMark=createTravelMark(),travelState=createTravelState();group.add(travelMark.g);let travelTo=null;{const ray=new THREE.Raycaster(),floor=new THREE.Plane(new THREE.Vector3(0,1,0),0),spot=new THREE.Vector3(),ndc=new THREE.Vector2(),dom=controls.domElement;let down=null;dom.addEventListener('pointerdown',e=>{down=e.button===0?{x:e.clientX,y:e.clientY}:null;});dom.addEventListener('pointerup',e=>{const d=down;down=null;if(!d||e.button!==0||Math.hypot(e.clientX-d.x,e.clientY-d.y)>5)return;if(!active||!latest||!origin||pending?.kind!=='command')return;const r=dom.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ndc,camera);if(!ray.ray.intersectPlane(floor,spot))return;const sq=squareAt(spot,origin),move=clickMove(latest.player,sq,latest.cells.find(c=>c.x===sq.x&&c.z===sq.z));if(!move)return;travelTo=move.kind==='travel'?move.to:null;travelState.begin(travelTo);void reply(move.code);});}
 let heroStrength;
 function syncAim(){if(active&&origin&&pending?.kind==='position'&&pending.cursor){aim.show(pending.cursor.x-origin.x,pending.cursor.z-origin.z,latest?.player?{x:latest.player.x-origin.x,z:latest.player.z-origin.z}:null);minimap.setCursor(pending.cursor);}else if(active&&origin&&latest?.player&&pending&&pending.kind!=='command'&&pending.kind!=='menu'&&isDirectionPrompt(pending.prompt)){const p=latest.player;const lanes=directionLanes(p,(x,z)=>solidAt(latest,x,z),laneRange(lastCommand,heroStrength)),rel=c=>({x:c.x-origin.x,z:c.z-origin.z});aim.lanes(lanes.flat().map(rel),laneHits(lanes,(x,z)=>latest.cells?.find(c=>c.x===x&&c.z===z)?.kind==='monster').map(rel));minimap.setCursor(null);}else{aim.hide();minimap.setCursor(null);}}
 minimap.el.addEventListener('click',e=>{if(pending?.kind!=='position'||!pending.cursor)return;const spot=minimap.cellAt(e.clientX,e.clientY);if(!spot)return;aimQueue=aimKeys(pending.cursor,spot);void reply(aimQueue.shift());});
 // Engine commands live in the footer next to the demo's buttons, so both modes share one control row.
 const actions=document.createElement('div');actions.className='engine-actions';actions.hidden=true;actions.innerHTML='<button data-key="83">Save & quit</button>';$('.buttons').prepend(actions);
 const esc=text=>String(text).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 function setPrompt(text){$('#engine-prompt').innerHTML=text?`<span class="dot"></span>${esc(text)}`:'';}
 const attributesEl=document.createElement('div');attributesEl.className='attributes';$('.stats').after(attributesEl);
 function renderAttributes({attributes,alignment}){
   heroStrength=attributes.find(a=>a.label==='STR')?.value;
   attributesEl.innerHTML=attributes.map(({label,value})=>`<span>${label} <b>${esc(value)}</b></span>`).join('')+(alignment?`<span class="alignment">${esc(alignment.toUpperCase())}</span>`:'');
 }
 // On arrival at a named level or branch, its name fades in over the scene for a few seconds.
 // A banner for a lost link or a restarted server, with the one button that fixes it (a reload).
 const linkBanner=document.createElement('div');linkBanner.id='link-banner';linkBanner.hidden=true;linkBanner.innerHTML='<span></span><button type="button"></button>';document.body.append(linkBanner);
 function showLinkBanner(text,label){if(!active)return;linkBanner.firstChild.textContent=text;linkBanner.lastChild.textContent=label;linkBanner.lastChild.onclick=()=>location.reload();linkBanner.hidden=false;}
 function hideLinkBanner(){linkBanner.hidden=true;}
 let link=null,currentHandle=null;
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
   const el=$('#engine-status'),num=re=>text.match(re);el.title=text;if(/T:\d+/.test(text))airborne=airborneStatus(text);
   const gold=num(/\$:(\d+)/),power=num(/Pw:(\d+)\((\d+)\)/),exp=num(/Exp:(\d+)/);
   if(!gold&&!power&&!exp){el.textContent=text;return;}
   // The frame's own condition list (bridge) wins; the status line's words are the fallback.
   const conditions=heroConditions(frameConditions,text),others=conditions.filter(c=>!conditionTags([c]).length);
   applyStatusScreen(statusScreenEl(),conditions);
   {const turn=num(/T:(\d+)/);statusScreenEl().style.setProperty('--status-progress',worstProgress(statusProgress.update(conditions,turn?+turn[1]:0,frameCountdowns)).toFixed(2));}
   el.innerHTML=[gold&&`<span>GOLD <b>${gold[1]}</b></span>`,power&&`<span>POWER <b>${power[1]} / ${power[2]}</b></span>`,exp&&`<span>EXP <b>${exp[1]}</b></span>`,`<span id="hero-conditions">${conditionTagsHtml(conditions)}</span>`,...others.map(c=>`<span class="condition"><i aria-hidden="true">${conditionGlyph(c)}</i> ${esc(c)}</span>`)].filter(Boolean).join('');
 }
 function statusScreenEl(){let el=document.getElementById('status-screen');if(!el){el=document.createElement('div');el.id='status-screen';document.body.appendChild(el);}return el;}
 // The pet in view goes to the companion slot (the creatures-in-view list is gone: the game is shown by its visuals).
 function renderSurroundings(frame){
   const pets=[];
   for(const cell of frame.cells){
     if(cell.kind==='pet'&&cell.visible&&!(cell.x===frame.player.x&&cell.z===frame.player.z))pets.push(cell.name);
   }
   // With no pet in view the companion slot is left out rather than saying so.
   $('.companion').hidden=!pets.length;
   $('.companion').innerHTML=pets.length?`<span class="dot"></span> ${esc(pets[0])}${pets.length>1?` +${pets.length-1}`:''}`:'';
 }
 const dialog=document.createElement('dialog');dialog.id='engine-dialog';document.body.append(dialog);
 const groundPanel=document.createElement('aside');groundPanel.id='ground-notice';groundPanel.hidden=true;groundPanel.setAttribute('aria-live','polite');groundPanel.setAttribute('aria-label','Items on this tile');document.body.append(groundPanel);let groundPanelTile=null;
 const lantern=new THREE.PointLight(0xffd49c,22,11,2);group.add(lantern);
 // One scratch vector for the per-frame steps (hero, every actor, the camera): the loop used to allocate three per actor per frame.
 const STEP=new THREE.Vector3();
 const wall=new THREE.MeshStandardMaterial({color:'#52605f',roughness:.88}),floorGeo=new RoundedBoxGeometry(.97,.14,.97,3,.035),wallGeo=new RoundedBoxGeometry(.97,.7,.97,3,.045);
 // Torches are real light sources: a fixed pool of point lights follows the torches
 // nearest the hero. The pool size never changes, so materials never recompile.
 // ?torches=N (0..8) tries a smaller pool: every point light is evaluated per lit pixel, so this is the knob for a slow GPU.
 const TORCH_LIGHTS=Math.min(8,Math.max(0,parseInt(new URLSearchParams(location.search).get('torches')??'8',10)||0)),TORCH_INTENSITY=15,LIVE_AMBIENT=.68,RAY_FLASH_INTENSITY=60,BLAST_LIGHT_INTENSITY=45,BREATH_LIGHT_INTENSITY=30;
 const torchLights=Array.from({length:TORCH_LIGHTS},()=>{const l=new THREE.PointLight(0xff9a48,0,6,2);l.userData={tile:null,level:0};group.add(l);return l;});
 const ambientLights=scene.children.filter(o=>o.isHemisphereLight||o.isDirectionalLight).map(light=>({light,base:light.intensity}));
 const torchHaloMaterial=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,190,110,.55)');g.addColorStop(.35,'rgba(255,130,50,.18)');g.addColorStop(1,'rgba(255,100,30,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});})();
 // Integer hash so torches scatter along a wall instead of lining a whole row.
 function hasTorch(x,z){return cellHash(x,z)%9===0;}
 const floorKit=createFloorKit();
 const cavern=createCavern({group,scene,camera,controls});
 const branchAir=createBranchAir({group});
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
 // the tiles' animated parts (sconce flames, trap sigils), found once per tile instead of by a walk each frame
 const animated=createAnimatedRegistry();
 function release(object){animated.remove(object);object.traverse(o=>o.userData.dispose?.());group.remove(object);}
 const ghosts=new Map();function dropGhost(gh){gh.mats.forEach(m=>m.dispose());release(gh.g);}
 function clear(){for(const o of tiles.values())release(o);for(const a of actors.values()){restoreFade(a);release(a.g);}for(const o of groundItems.values())release(o);for(const o of liftingItems)release(o);liftingItems.clear();pickupNotes.clear();for(const w of wells.values())release(w);for(const gh of ghosts.values())dropGhost(gh);ghosts.clear();marks.clear();envStory.clear();tiles.clear();actors.clear();groundItems.clear();wells.clear();tileInstances.clear();actorBatch.clear();}
 function pickupIcon(cell){
   const icon=new THREE.Group(), kind=cell.object?.kind||'item', cls=cell.object?.class||0, itemName=(cell.object?.name||cell.name||'').toLowerCase();
   // Older bridge processes expose statues as generic objects. Keep the visual path
   // usable while they are being replaced; the current bridge supplies creature directly.
   const statueCreature=cell.object?.creature||({6746:'gecko'}[cell.glyph]);
   if((kind==='statue'||itemName==='statue')&&/centaur/i.test(statueCreature||'')){const statue=createCentaurStatue(statueCreature);return statue;}
   const lightItem=createLightItem(cell.object?.lit?`${itemName} (lit)`:itemName);if(lightItem){return lightItem;}
   const shopItem=createShopItem(itemName);if(shopItem){return shopItem;}
   const warm=new THREE.MeshStandardMaterial({color:kind==='corpse'?0x72534a:cls===POTION_CLASS?0x5bd0c7:cls===WEAPON_CLASS?0xd9b15e:0xc9a86b,emissive:kind==='corpse'?0x241314:0x362718,roughness:.42,metalness:cls===WEAPON_CLASS?.65:.18});
   const edge=new THREE.MeshStandardMaterial({color:kind==='corpse'?0xb9a189:0xe8d8aa,roughness:.55,metalness:cls===WEAPON_CLASS?.7:.25});
   const add=(geometry,material=warm,x=0,y=.34,z=0)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;icon.add(m);return m;};
   const dedicated=kind==='corpse'||kind==='statue'?null:createGroundModel({color:cell.color,...cell.object,name:itemName});
   if(dedicated){icon.add(dedicated);icon.userData.restingWeapon=true;if(dedicated.userData.bagMaw)icon.userData.bagMaw=dedicated.userData.bagMaw;icon.userData.dispose=()=>dedicated.userData.dispose();
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
     // On an altar it is laid out along the slab, an offering waiting, not a heap (altar-offering.js).
     if(cell.terrain==='altar')layOnSlab(corpse);
     icon.userData.restingWeapon=true;icon.userData.dispose=()=>corpse.userData.dispose();
     // The floating eye's corpse breathes a violet halo and sheds motes (eye-corpse.js), animated below.
     if(corpse.userData.fx)icon.userData.corpseFx=corpse.userData.fx;
   } else if(/boulder|large rock/.test(itemName)){
     const boulder=createBoulder(BOULDER_SEED);icon.add(boulder);icon.userData.dispose=()=>boulder.userData.dispose();
   } else if(cls===WEAPON_CLASS){
     const weapon=createHeldWeapon({name:itemName});
     const pose=new THREE.Group();pose.rotation.y=-.65;icon.add(pose);
     weapon.rotation.x=-Math.PI/2;weapon.scale.setScalar(.8);weapon.position.set(0,.052,.3);pose.add(weapon);
     icon.userData.restingWeapon=true;
   } else if(cls===COIN_CLASS){
     const coinMats=[new THREE.MeshStandardMaterial({color:0xd9a93c,metalness:.55,roughness:.17,emissive:0xb87a18,emissiveIntensity:.5}),new THREE.MeshStandardMaterial({color:0xeabb48,metalness:.55,roughness:.14,emissive:0xc98a1c,emissiveIntensity:.55}),new THREE.MeshStandardMaterial({color:0xc79a34,metalness:.5,roughness:.2,emissive:0xa86f14,emissiveIntensity:.45})],coinStampMats=[new THREE.MeshStandardMaterial({color:0xf2d578,metalness:.5,roughness:.2,emissive:0xd9a63a,emissiveIntensity:.5}),new THREE.MeshStandardMaterial({color:0xfae79a,metalness:.5,roughness:.16,emissive:0xe6b648,emissiveIntensity:.55})],shadow=new THREE.MeshBasicMaterial({color:0x140e08,transparent:true,opacity:.48,depthWrite:false});
     const ground=add(new THREE.CircleGeometry(.19,24),shadow,0,.002,0);ground.rotation.x=-Math.PI/2;
     const pieces=[[-.108,-.066,0,.2,0,.05],[-.042,-.09,0,-.4,0,0],[.036,-.084,0,.7,.04,-.03],[.102,-.036,0,-.1,0,0],[-.12,.006,0,.5,0,.08],[-.06,.006,1,-.6,.08,0],[.012,-.012,1,.4,0,0],[.09,.018,0,-.3,0,-.06],[-.096,.06,0,.8,0,0],[-.024,.066,1,.1,.05,.04],[.048,.06,1,-.5,0,0],[.12,.06,0,.3,0,.08],[-.024,-.024,2,.6,0,0],[-.078,-.018,1,-.2,.1,-.04],[.042,.006,2,.5,0,0],[.012,.072,2,-.8,.06,0],[.072,-.048,1,.15,0,-.08],[-.132,-.036,0,-.5,0,.04]];
     const coinPile=[];
     for(const [i,[x,z,layer,rotation,tiltX,tiltZ]] of pieces.entries()){const y=.016+layer*.017,fallStart=y+.42+layer*.06,coin=coinMats[i%coinMats.length],coinStamp=coinStampMats[i%coinStampMats.length];const disk=add(new THREE.CylinderGeometry(.046,.046,.02,16),coin,x,fallStart,z);disk.rotation.set(tiltX,rotation,tiltZ);const stamp=add(new THREE.CylinderGeometry(.016,.016,.003,10),coinStamp,x,fallStart+.0115,z);stamp.rotation.set(tiltX,rotation,tiltZ);coinPile.push({disk,stamp,target:y,velocity:0,delay:layer*.09+(x+.3)*.018,settled:false});}
     icon.userData.coinPile=coinPile;
     icon.userData.dispose=()=>{coinMats.forEach(material=>material.dispose());coinStampMats.forEach(material=>material.dispose());shadow.dispose();};
   } else if(cls===POTION_CLASS){
     const look=potionLook((cell.object?.appearance||itemName).toLowerCase(),cell.color,cell.object?.otyp);
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
   const extraDispose=icon.userData.dispose;icon.userData.dispose=()=>{warm.dispose();edge.dispose();extraDispose?.();};return icon;
 }
 // Traps and the other known features (ice, bog, drawbridges, ice walls, clouds, air) get a
 // model once their own symbol is showing (a monster or item on top hides it);
 // anything else keeps the symbol label.
 function dressFeature(tile,cell){
  const trap=trapKind(cell.symbol,cell.color,cell.trap),other=trap?null:featureKind(cell.symbol,cell.color);
  const kind=trap||other,portal=trap==='portal'&&cell.portal||null,key=portal?`portal:${portal}`:kind||(tile.userData.featureKey||coveredFeature(cell)?null:'label');
  if(!key||key===tile.userData.featureKey)return;
  if(tile.userData.feature){tile.userData.feature.traverse(o=>o.userData.dispose?.());tile.remove(tile.userData.feature);}
  // Portals and the vibrating square animate themselves (portal-fx.js, vibrating-square.js).
  const seed=cell.x*53+cell.z*29;
  const model=portal==='sheol'?createSheolVortex(seed):trap==='vibrating'?createVibratingSquare(seed):trap?createTrap(trap,seed):other?createTerrainFeature(other,cell.x*41+cell.z*23):label(String.fromCharCode(cell.symbol));
  if(trap==='portal')animatePortal(model,portal||'other',seed);
  if(!kind)model.position.y=.35;
  tile.userData.slab.visible=!model.userData.hidesFloor;
  tile.add(model);tile.userData.feature=model;tile.userData.featureKey=key;tile.userData.axisFeature=AXIS_FEATURES.has(key)?model:null;
  animated.add(tile);tileInstances.add(tile);tileInstances.refresh(); // a trap or feature can carry an animate hook, and can be dressed after the tile was built
 }
 // Stairs and ladders share the up/down terrain; the glyph's colour tells them apart while
 // nothing covers it (ladder.js), so a square first seen occupied shows stairs until then.
 function dressStairs(tile,cell){
  const ladder=ladderShown(cell)??tile.userData.ladder??false,key=`${cell.terrain}:${ladder}`;
  if(key===tile.userData.stairsKey)return;
  for(const o of tile.userData.stairs||[]){o.traverse(c=>c.userData.dispose?.());tile.remove(o);}
  const seed=cell.x*131+cell.z,model=(ladder?createLadder:createStairs)(cell.terrain,seed);
  tile.add(model);tile.userData.stairs=[model];tile.userData.stairsKey=key;tile.userData.ladder=ladder;
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
 function setDim(tile,dim){tile.userData.fog.visible=dim;tile.userData.fog.material.opacity=dim?DIM_OPACITY:0;tile.userData.fog.material.needsUpdate=true;}
 let coughHunch=0,coughApplied=0;const hero=playerFactory();hero.setWeapon?.(null);hero.actions=createActionQueue();group.add(hero.g);const heroForm=createHeroForm(hero,creatureFactory,shape=>addOutlines(shape));
 const swingFx=createSwingFx(THREE,group);const hitFx=createHitFx(THREE,group);const rays=createRays(THREE,group);const zapFlash=createZapFlash(THREE,group);const rayMarks=createRayMarks(THREE,group);const rayFlashLight=new THREE.PointLight(0xdce6ff,0,18,1.2);group.add(rayFlashLight);const explosions=createExplosions(THREE,group);const blastLight=new THREE.PointLight(0xffa050,0,9,1.4);group.add(blastLight);const flood=createFlood(THREE,group);let flooding=false;const splash=createSplash(THREE,group);const flights=createFlights(THREE,group);const orientOverlay=createOrientationOverlay(group);if(new URLSearchParams(location.search).has('orient'))orientOverlay.set(true);const grab=createGrab(THREE,group,{onSplash:s=>splash.add(s)});const brainSuck=createBrainSuck(THREE,group);const hold=createHold(THREE,group);const poly=createPolymorph(THREE,group);const barsMelt=createBarsMelt(THREE,group);const doorBreak=createDoorBreak(THREE,group);const breath=createBreath(THREE,group);const engulf=createEngulf(THREE,group);let swingTarget=null;const hitFeel=createHitFeel();
 const effectLights=createEffectLights(THREE,group);const deathFx=createDeathBurst(THREE);group.add(deathFx.points);const petrify=createPetrify({onBurst:(b,at,a)=>deathFx.burst(b.style,at,{dir:b.dir,...deathLook(a)})});const throneVanish=createThroneVanish(THREE,group);const fountainLady=createFountainLady(THREE,group);const fountainSnakes=createFountainSnakes(THREE,group);const fountainGush=createFountainGush(THREE,group);const altarSacrifice=createAltarSacrifice(THREE,group);const altarClover=createAltarClover(THREE,group);const altarGlow=createAltarGlow(THREE,group);const mjollnirStrikes=createLightningStrikes(group);const altarFlashes=createAltarFlashes(group,{top:ALTAR_TOP});const altarGift=createAltarGift(THREE,group);const blessFlash=createBlessFlash(THREE,group);const glowLog=createGlowLog();const fountainNymph=createFountainNymph(THREE,group);const fountainDemon=createFountainDemon(THREE,group);const fountainWish=createFountainWish(THREE,group);const wandWishFlare=createWandWishFlare(THREE,group);const djinniWish=createDjinniWish(THREE,group);const fireTrapJet=createFireTrapJet(THREE,group,{lights:effectLights});const goldGlint=createGoldGlint(THREE,group);const firstKill=createFirstKill(THREE,group);const potionSip=createPotionSip(THREE,group);const sinkDrain=createSinkDrain(THREE,group);const stoneCure=createStoneCure(THREE,group);const towelWipe=createTowelWipe(THREE,group);const calmClear=createCalmClear(THREE,group);const unicornSpiral=createUnicornSpiral(THREE,group);const stairStep=createStairStep(THREE,group);const searchReveal=createSearchReveal(THREE,group);const squeakyBoard=createSqueakyBoard(THREE,group);const rollingTrap=createRollingTrap(THREE,group);const fallingRock=createFallingRock(THREE,group);const dartTrap=createDartTrap(THREE,group);const landMine=createLandMine(THREE,group);const rustTrap=createRustTrap(THREE,group);const iceTrap=createIceTrap(THREE,group);const pitFall=createPitFall(THREE,group);const polyTrap=createPolyTrap(THREE,group);const magicTrap=createMagicTrap(THREE,group);const boulderFill=createBoulderFill(THREE,group);const spellFizzle=createSpellFizzle(THREE,group);const throneSit=createThroneSit(THREE,group);const throneCurse=createThroneCurse(THREE,group);const throneInsight=createThroneInsight(THREE,group);const throneWrench=createThroneWrench(THREE,group);const throneGift=createThroneGift(THREE,group);const spellStudy=createSpellStudy(THREE,group);const spellCrumble=createSpellCrumble(THREE,group);const antiMagic=createAntiMagic(THREE,group);const webSnare=createWebSnare(THREE,group);const statueTrap=createStatueTrap(THREE,group);const bearTrapSnap=createBearTrapSnap(THREE,group);const sleepingGas=createSleepingGas(THREE,group);const teleportBlink=createTeleportBlink(THREE,group,{lights:effectLights});const magicPortal=createMagicPortal(THREE,group,{lights:effectLights});const digChips=createDigChips(THREE,group);const digCracks=createDigCracks(THREE,group);const digSwing=createDigSwing();const digDrop=createDigDrop();const stairTumble=createStairTumble();const levelUp=createLevelUp(THREE,group);const prayerLight=createPrayerLight(THREE,group);const prayerKneel=createPrayerKneel();
 // Something new was staged this frame (a tile, an item, a monster): after the frame is applied, its
 // shaders compile ahead of the draw (compileAsync uses the parallel-compile extension where there
 // is one), instead of stalling the first frame that shows a new material.
 let staged=false;
 function warmUp(){if(!staged||!renderer?.compileAsync)return;staged=false;renderer.compileAsync(scene,camera).catch(()=>{});}
 function apply(frame){const prevFrame=latest;latest=frame;if(prevFrame?.player&&frame.player&&prevFrame.depth===frame.depth&&prevFrame.branch===frame.branch&&frame.player.hp<prevFrame.player.hp)hitFeel.hit(prevFrame.player.hp-frame.player.hp,{heroHurt:true});if(!active)return;
   if(frame.player?.countdowns&&typeof frame.player.countdowns==='object')frameCountdowns=frame.player.countdowns;
   if(Array.isArray(frame.player?.conditions)){frameConditions=frame.player.conditions;const tags=document.getElementById('hero-conditions');if(tags)tags.innerHTML=conditionTagsHtml(frameConditions);applyStatusScreen(statusScreenEl(),frameConditions);statusScreenEl().style.setProperty('--status-progress',worstProgress(statusProgress.update(frameConditions,frame.turn||0)).toFixed(2));}minimap.update(frame);
   const where=levelTitle(frame);$('.location small').textContent=where.place;$('.location h1').textContent=where.title;$('.location h1').hidden=!where.named;announceLevel(where);
   if(groundPanelTile!==groundTile(frame)){groundPanel.hidden=true;groundPanelTile=null;}
   if(Array.isArray(frame.ground))showGround(frame.ground);
   hero.setWeapon?.(frame.player.weapon??null);syncHeldWandAura(hero,frame.player.weapon??null);syncHeldGleam(hero,frame.player.weapon??null);syncHeldMagic(hero,frame.player.weapon??null);
   if(heroForm.sync(frame.player.form)&&prevFrame)poly.add({x:frame.player.x,z:frame.player.z,hero:true});dressHero(hero,frame.player);hero.setHelmet?.(frame.player.helmet??null);if('shield' in frame.player)hero.setShield?.(frame.player.shield);if('offhand' in frame.player)hero.setOffhand?.(frame.player.offhand);addOutlines(hero.g);
   const level=`${frame.branch}:${frame.depth}`;const newLevel=level!==lastLevel;if(newLevel){const keptView=lastLevel?captureView(camera,controls):null;clear();throneVanish.clear();fountainLady.clear();fountainSnakes.clear();fountainGush.clear();altarSacrifice.clear();altarClover.clear();altarGlow.clear();mjollnirStrikes.clear();altarFlashes.clear();strikeQueue.length=0;altarGift.clear();blessFlash.clear();glowLog.clear();fountainNymph.clear();fountainDemon.clear();fountainWish.clear();wandWishFlare.clear();djinniWish.clear();fireTrapJet.clear();goldGlint.clear();firstKill.clear();potionSip.clear();sinkDrain.clear();stoneCure.clear();towelWipe.clear();calmClear.clear();unicornSpiral.clear();stairStep.clear();searchReveal.clear();squeakyBoard.clear();rollingTrap.clear();fallingRock.clear();dartTrap.clear();landMine.clear();rustTrap.clear();iceTrap.clear();pitFall.clear();polyTrap.clear();magicTrap.clear();boulderFill.clear();spellFizzle.clear();throneSit.clear();throneCurse.clear();throneInsight.clear();throneWrench.clear();throneGift.clear();spellStudy.clear();spellCrumble.clear();antiMagic.clear();webSnare.clear();statueTrap.clear();bearTrapSnap.clear();sleepingGas.clear();digChips.clear();digCracks.clear();digSwing.clear(hero);digDrop.arrive();const tumbled=stairTumble.arrive();levelUp.clear();teleportBlink.levelChanged(0,0);magicPortal.levelChanged(0,0);prayerLight.clear();prayerKneel.clear(hero);clearDoorSwings();rays.clear();zapFlash.clear(hero);rayMarks.clear();explosions.clear();flood.clear();flooding=false;splash.clear();flights.clear();grab.clear();brainSuck.clear();hold.clear();poseHeld(hero,null);poly.clear();barsMelt.clear();doorBreak.clear();breath.clear();engulf.clear();dropEngulfCamera(camera,controls);poseEngulfed(hero,null);poseActor(hero,null);origin={x:frame.player.x,z:frame.player.z};if(!tumbled&&lastLevel)stairStep.arrive(stepDirection(lastBranch,lastDepth,frame.branch,frame.depth),0,0);lastBranch=frame.branch;lastDepth=frame.depth;lastLevel=level;clearActionPose(hero,hero.actions);hero.actions=createActionQueue();clearHeroBones();hero.g.position.set(0,0,0);hero.hop=hero.hopAt=null;controls.target.set(0,0,0);restoreView(camera,controls,keptView,[9,10.7,13.1]);}fireTrapJet.settle(frame.player.x-origin.x,frame.player.z-origin.z);goldGlint.settle(frame.player.x-origin.x,frame.player.z-origin.z);squeakyBoard.settle(frame.player.x-origin.x,frame.player.z-origin.z);rollingTrap.settle(frame.player.x-origin.x,frame.player.z-origin.z);fallingRock.settle(frame.player.x-origin.x,frame.player.z-origin.z);dartTrap.settle(frame.player.x-origin.x,frame.player.z-origin.z);landMine.settle(frame.player.x-origin.x,frame.player.z-origin.z);rustTrap.settle(frame.player.x-origin.x,frame.player.z-origin.z);iceTrap.settle(frame.player.x-origin.x,frame.player.z-origin.z);pitFall.settle(frame.player.x-origin.x,frame.player.z-origin.z);polyTrap.settle(frame.player.x-origin.x,frame.player.z-origin.z);magicTrap.settle(frame.player.x-origin.x,frame.player.z-origin.z);boulderFill.settle(frame.player.x-origin.x,frame.player.z-origin.z);antiMagic.settle(frame.player.x-origin.x,frame.player.z-origin.z);webSnare.settle(frame.player.x-origin.x,frame.player.z-origin.z);statueTrap.settle(frame.player.x-origin.x,frame.player.z-origin.z);bearTrapSnap.settle(frame.player.x-origin.x,frame.player.z-origin.z);sleepingGas.settle(frame.player.x-origin.x,frame.player.z-origin.z);
   if(!newLevel&&flood.add(prevFrame,frame))flooding=true;splash.flushMessages(frame);grab.frame(frame);hold.frame(frame);poly.frame(frame);barsMelt.frame(frame);doorBreak.frame(frame);engulf.frame(frame);
   if(pendingAltarGlow){altarGlow.message(pendingAltarGlow,frame.player.x-origin.x,frame.player.z-origin.z);pendingAltarGlow=null;}
   const seen=new Set(),seenActors=new Set(),seenWells=new Set();
   for(const cell of frame.cells){const id=`${cell.x},${cell.z}`,x=cell.x-origin.x,z=cell.z-origin.z;
     if(cell.terrain!=='unknown'){
       seen.add(id);let tile=tiles.get(id);if(tile&&(tile.userData.type!==tileKind(cell)||tile.userData.ground!==groundOf(cell))){release(tile);tiles.delete(id);tile=null;}
       if(!tile){tile=new THREE.Group();tile.position.set(x,0,z);tile.userData.type=tileKind(cell);tile.userData.ground=groundOf(cell);const slab=box(floorGeo,floorKit.material(cell.x,cell.z),tile,0,-.1,0);tile.userData.slab=slab;floorKit.dress(slab,tile,cell.x,cell.z,groundOf(cell));const fog=box(new THREE.PlaneGeometry(.98,.98),new THREE.MeshBasicMaterial({color:DIM_COLOR,transparent:true,opacity:0,depthWrite:false}),tile,0,.012,0);fog.rotation.x=-Math.PI/2;fog.visible=false;/* setDim shows it; at opacity 0 it was a draw per tile for nothing */tile.userData.fog=fog;
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
         group.add(tile);tiles.set(id,tile);animated.add(tile);tileInstances.add(tile);staged=true;
       }if(cell.terrain==='feature')dressFeature(tile,cell);if(cell.terrain==='up'||cell.terrain==='down')dressStairs(tile,cell);if(cell.terrain==='tree')dressTree(tile,cell);syncWard(tile,cell);tile.visible=true;tile.scale.y=1;setDim(tile,!cell.visible&&cell.remembered);
       if(tile.userData.axisFeature){
        // Face the drawbridge across its moat, the hinge toward the gatehouse (terrain-feature.js).
        const yaw=bridgeYaw(tile.userData.featureKey,(dx,dz)=>frame.cells.find(c=>c.x===cell.x+dx&&c.z===cell.z+dz)?.terrain);
        if(yaw!==null)tile.userData.axisFeature.rotation.y=yaw;
       }
       if(tile.userData.grate){
        const connected=(dx,dz)=>frame.cells.some(c=>c.x===cell.x+dx&&c.z===cell.z+dz&&['wall','bars','door'].includes(c.terrain));
        const horizontal=Number(connected(-1,0))+Number(connected(1,0)),vertical=Number(connected(0,-1))+Number(connected(0,1));
        {const yaw=wallYaw(horizontal,vertical);if(yaw!==null)tile.userData.grate.rotation.y=yaw;}
       }
       if(tile.userData.door){
        const connected=(dx,dz)=>frame.cells.some(c=>c.x===cell.x+dx&&c.z===cell.z+dz&&['wall','bars','door'].includes(c.terrain));
        const horizontal=Number(connected(-1,0))+Number(connected(1,0)),vertical=Number(connected(0,-1))+Number(connected(0,1));
        {const yaw=wallYaw(horizontal,vertical);if(yaw!==null)orientDoor(tile.userData.door,yaw);}
        setDoorOpen(tile.userData.door,cell.door==='open',{dx:frame.player.x-cell.x,dz:frame.player.z-cell.z});
       }
     }
     if(cell.terrain==='fountain'){seenWells.add(id);if(!wells.has(id)){const w=createLiveFountain(wellTemplate);w.position.set(x,0,z);group.add(w);wells.set(id,w);}wells.get(id).visible=cell.visible||cell.remembered;}
     if(cell.x===frame.player.x&&cell.z===frame.player.z)continue;
       if(cell.kind==='object'){
       const key=`${id}:${cell.glyph}:${cell.object?.creature||''}${cell.object?.lit?':lit':''}`,seenObject=cell.visible||cell.remembered||cell.sensed;seenActors.add(key);
       if(seenObject&&!groundItems.has(key)){const item=petrify.adopt(actors,cell,x,z)||pickupIcon(cell);item.position.set(x,0,z);group.add(item);groundItems.set(key,item);staged=true;}
       // An item lying on an altar rests on the slab, not inside it.
       const rest=cell.terrain==='altar'?ALTAR_TOP:0;
       const item=groundItems.get(key);if(item){if(item.userData.coinPile||item.userData.restingWeapon)item.position.y=rest;item.visible=cell.visible||!!cell.sensed;syncDetectedMark(item,!!cell.sensed&&!cell.visible);syncWandAura(item,cell.object,key);syncArtifactGleam(item,cell.object,key);syncFloorMagic(item,cell.object,key);syncScrollAura(item,cell.object,key);syncRingAura(item,cell.object,key);syncAmuletAura(item,cell.object,key);syncToolAura(item,cell.object,key);syncArmorAura(item,cell.object,key);syncWeaponAura(item,cell.object,key);syncPotionFx(item,cell.object,key);syncPotionAura(item,cell.object,key);if(!item.userData.coinPile&&!item.userData.restingWeapon)item.position.y=rest+Math.sin(performance.now()/600+x+z)*.025;}
     }
       if(cell.kind==='monster'||cell.kind==='pet'){
       const key=`${id}:${cell.glyph}`;seenActors.add(key);let a=actors.get(key);const fresh=!a;
       if(!a){for(const [previous,candidate] of actors){if(!seenActors.has(previous)&&!candidate.actions?.dead&&candidate.glyph===cell.glyph&&Math.hypot(candidate.g.position.x-x,candidate.g.position.z-z)<(candidate.glide?candidate.glide.catchup+1:2.1)){/* a walker that trails its cell (slide.js FELINE_GLIDE) may be several tiles behind it */a=candidate;actors.delete(previous);actors.set(key,a);break;}}}
       if(!a){const disposition=cell.kind==='pet'?'pet':cell.peaceful?'peaceful':'hostile';if(cell.kind==='pet'&&/cat|kitten/.test(cell.name)){a=isFeline((cell.name||'').toLowerCase())?createSkinnedFeline((cell.name||'').toLowerCase()):creatureFactory?bakeDraws(creatureFactory(cell)):catFactory();a.petCat=true;stageCreature(a.g,{disposition});}else{const made=/^shopkeeper$/i.test(cell.name||'')?createShopkeeper():/^watchman$/i.test(cell.name||'')?createWatchman():/^grid bug$/i.test(cell.name||'')?createGridBug():/^oracle$/i.test(cell.name||'')?createOracle():creatureFactory?bakeDraws(creatureFactory(cell)):monsterFactory();a=made.g?made:{g:made};stageCreature(a.g,{disposition});attachModelAsset(a,cell.name,MODEL_URLS)?.then(asset=>{if(asset)addOutlines(asset.model,{smooth:true});});/* a GLB creature gets the same ink as the rest */}a.flap=flapStyle(cell.name);a.g.position.set(x,0,z);group.add(a.g);actors.set(key,a);actorBatch.add(a);staged=true;}
       if(a.actions?.finished){clearActionPose(a,a.actions);restoreFade(a);restoreStone(a);a.actions=createActionQueue();}
       a.glyph=cell.glyph;a.species=(cell.name||'').toLowerCase();a.target=new THREE.Vector3(x,perchHeight(cell.terrain),z);a.cell=`${cell.x},${cell.z}`;
       // A monster that just rose from its corpse gets up off the floor instead of popping in (rise.js).
       if(fresh){const risen=rises.claim(cell.x,cell.z,cell.name||null,performance.now());if(risen){a.actions??=createActionQueue();enqueueAction(a.actions,riseActionFor(risen));}}
       // Invisible-and-sensed monsters (telepathy, warning) still send a cell, but the model,
       // its disposition ring — all children of a.g — should stay hidden.
       a.g.visible=!cell.invisible;
     }
   }
   for(const [id,t] of tiles)if(!seen.has(id)){release(t);tiles.delete(id);}tileInstances.refresh();envStory.frame(frame,origin); // set-dressing round traps, broken doors and fountains (env-story.js)
   cavern.rebuild(tiles,origin,newLevel);branchAir.setBranch(frame.dungeon,hero.g.position);{const f=floorFinish(frame.dungeon);floorKit.setBranch(f.tint,f.roughness);}{const w=wallFinish(frame.dungeon);wall.color.set(w.color);wall.roughness=w.roughness;}cavern.setTint(rockTint(frame.dungeon),rockRoughness(frame.dungeon),h=>rockVein(frame.dungeon,h));
   {const byId=new Map();for(const c of frame.cells)byId.set(`${c.x},${c.z}`,c);
    for(const [id,gh] of ghosts)if(ghostGone(byId.get(id))||seenActors.has(gh.key)||[...seenActors].some(k=>k.startsWith(id+':'))){dropGhost(gh);ghosts.delete(id);}
    for(const [id,a] of actors)if(!seenActors.has(id)){
     const at=a.cell,cell=at&&byId.get(at);
     if(at&&!ghosts.has(at)&&shouldGhost(cell,a.actions?.dead)){restoreFade(a);const mats=ghostize(a.g,THREE);a.g.position.copy(a.target||a.g.position);ghosts.set(at,{g:a.g,mats,key:id});while(ghosts.size>GHOST_MAX){const [oldId,old]=ghosts.entries().next().value;dropGhost(old);ghosts.delete(oldId);}}
     else{restoreFade(a);release(a.g);}
     actors.delete(id);}}
   for(const [id,item] of groundItems)if(!seenActors.has(id)){if(hasMagicLook(item)&&item.visible&&pickupNotes.take(...squareOfKey(id).split(',').map(Number),performance.now()))liftingItems.add(item);else release(item);groundItems.delete(id);}
   for(const [id,w] of wells)if(!seenWells.has(id)){release(w);wells.delete(id);}
   hero.target=new THREE.Vector3(frame.player.x-origin.x,perchHeight(frame.cells.find(c=>c.x===frame.player.x&&c.z===frame.player.z)?.terrain),frame.player.z-origin.z);renderSurroundings(frame);
   $('#hp').textContent=`${frame.player.hp} / ${frame.player.maxhp}`;$('.character').classList.toggle('low-hp',lowHealth(frame.player.hp,frame.player.maxhp));$('#healthbar').style.width=`${100*frame.player.hp/Math.max(1,frame.player.maxhp)}%`;$('#turn').textContent=frame.turn;$('.stats').innerHTML=`<span>AC <b>${frame.player.ac}</b></span><span>LVL <b>${frame.player.level}</b></span><span>TURN <b id="turn">${frame.turn}</b></span>`;
   warmUp();
 }
 const rises=createRiseWatch();
 // "There is an altar to … here." arrives just before the frame that puts the hero on the altar, so
 // the glow waits for that frame instead of landing on the square the hero stepped off.
 let pendingAltarGlow=null;
 // The hero's conditions from the latest frame (hud-conditions.js), or null before the first one.
 let frameConditions=null,frameCountdowns=null;
 // Mjollnir: "Lightning strikes the jackal!" brings a bolt down on the monster the hero just hit.
 // The message and the hero's combat event can come in either order, so whichever comes second
 // pairs them; the bolt lands at the swing's impact, not the moment the news arrives.
 let heldCrackle=null,lastHeroHit=null,pendingStrike=null;const strikeQueue=[];
 const STRIKE_PAIR_MS=1500,IMPACT_MS=ACTION_TIME.attack*STRIKE_U*1000;
 function queueStrike(at,name){
  let x=null,z=null;
  if(at){x=at.x-origin.x;z=at.z-origin.z;}
  else if(name){let best=null;for(const a of actors.values())if(a.species===name.toLowerCase()&&a.target){const d=a.target.distanceTo(hero.g.position);if(!best||d<best.d)best={d,a};}if(best){x=best.a.target.x;z=best.a.target.z;}}
  if(x===null)return;strikeQueue.push({x,z,when:(at?.t??performance.now())+IMPACT_MS});
 }
 function fireStrikes(){const now=performance.now();for(let i=strikeQueue.length-1;i>=0;i--)if(strikeQueue[i].when<=now){const s=strikeQueue[i];strikeQueue.splice(i,1);mjollnirStrikes.strike(s.x,s.z);heldCrackle?.surge();}}
 let meleeIntent=null,queuedCommand=null,combatStream=false,heldFrame=null,heldTimer=null,fxHoldUntil=0;
 // A bridge that sends combat events drives the action layer; text matching is the fallback for older engines.
 const findSide=s=>findActor(actors,s.x,s.z,{name:s.name,origin});
 // Whoever stands where a thrown object starts (throw-motion.js): the hero or a seen monster.
 const findThrower=(x,z)=>latest?.player&&x===latest.player.x&&z===latest.player.z?hero:findActor(actors,x,z,{exact:true});
 function combatEvent(v){const c=v.type==='combat'?combatAction(v):deathAction(v);if(!c)return;const log=globalThis.deanhackCombat??=[];log.push(c);if(log.length>16)log.shift();if(origin){if(v.type!=='combat')marks.add({type:'death',x:c.x-origin.x,z:c.z-origin.z,pet:c.pet,name:c.name});else if(c.result==='hit'&&c.defender?.seen&&!c.defender.pet)marks.add({type:'combat',x:c.defender.x-origin.x,z:c.defender.z-origin.z,name:c.defender.name});}if(v.type!=='combat'){grab.death(c);queueDeath(c,findSide);return;}grab.combat(c);brainSuck.combat(c);combatStream=true;if(c.heroAttacks){meleeIntent=null;swingTarget=c.defender?.name??null;if(c.result==='hit'&&c.defender?.seen){const hit={x:c.defender.x,z:c.defender.z,t:performance.now()};if(pendingStrike&&hit.t-pendingStrike.t<STRIKE_PAIR_MS){queueStrike(hit);pendingStrike=null;}else lastHeroHit=hit;}}queueCombat(c,{hero,find:findSide});}
 // Map frames wait for queued deaths to play, so the corpse appears after the fall; a newer frame replaces a held one.
 function applySoon(frame){heldFrame=frame;if(heldTimer)return;const wait=active?Math.max(holdBackMs([hero.actions,...[...actors.values()].map(a=>a.actions)]),Math.ceil(fxHoldUntil-performance.now())):0;const go=()=>{heldTimer=null;const f=heldFrame;heldFrame=null;if(f)apply(f);};if(wait>0)heldTimer=setTimeout(go,wait);else go();}
 const messageLog=createMessageLog();let turnMark=0;
 // The square of the nearest monster of that species (the name a trap message gives, "jackal"), in
 // scene space, or null: so a monster's trap effect goes off under the monster, not the hero.
 function monsterSquare(name){const p=latest?.player;if(!p||!latest?.cells)return null;let best=null,bd=Infinity;
  for(const c of latest.cells){if(!c.name||c.object||String(c.name).toLowerCase()!==name)continue;const d=Math.hypot(c.x-p.x,c.z-p.z);if(d<bd){bd=d;best=[c.x-origin.x,c.z-origin.z];}}return best;}
 function message(text){splash.queueMessage(text);/* a pet cat the game says is eating crouches over its food and chews (feline-skin.js eat) */if(petEats(text))for(const a of actors.values())if(a.petCat&&a.animator?.eat)a.animator.eat();if(latest?.player){digChips.message(text,latest.player.x-origin.x,latest.player.z-origin.z,hero.g.rotation.y);digCracks.message(text,latest.player.x-origin.x,latest.player.z-origin.z,hero.g.rotation.y);digSwing.message(text);prayerKneel.message(text);digDrop.message(text,airborne);stairTumble.message(text);levelUp.message(text,latest.player.x-origin.x,latest.player.z-origin.z);prayerLight.message(text,latest.player.x-origin.x,latest.player.z-origin.z);}if(isThronePuff(text)&&latest?.player)throneVanish.add(latest.player.x-origin.x,latest.player.z-origin.z,latest.player.x*7+latest.player.z);if(isLadyMessage(text)&&latest?.player)fountainLady.add(latest.player.x-origin.x,latest.player.z-origin.z);if(latest?.player){fountainLady.message(text,latest.player.x-origin.x,latest.player.z-origin.z);fountainSnakes.message(text,latest.player.x-origin.x,latest.player.z-origin.z);fountainGush.message(text,latest.player.x-origin.x,latest.player.z-origin.z);altarSacrifice.message(text,latest.player.x-origin.x,latest.player.z-origin.z);altarClover.message(text,latest.player.x-origin.x,latest.player.z-origin.z);if(glowAlignment(text))pendingAltarGlow=text;altarFlashes.message(text,latest.player.x-origin.x,latest.player.z-origin.z);{const victim=strikeVictim(text);if(victim){const now=performance.now();if(lastHeroHit&&now-lastHeroHit.t<STRIKE_PAIR_MS){queueStrike(lastHeroHit);lastHeroHit=null;}else pendingStrike={name:victim,t:now};}};altarGift.message(text,latest.player.x-origin.x,latest.player.z-origin.z);blessFlash.message(text,latest.player.x-origin.x,latest.player.z-origin.z);glowLog.note(text,performance.now());fountainNymph.message(text,latest.player.x-origin.x,latest.player.z-origin.z,hero.g.rotation.y);fountainDemon.message(text,latest.player.x-origin.x,latest.player.z-origin.z);fountainWish.message(text,latest.player.x-origin.x,latest.player.z-origin.z);fireTrapJet.message(text,latest.player.x-origin.x,latest.player.z-origin.z,monsterSquare);goldGlint.message(text,latest.player.x-origin.x,latest.player.z-origin.z);firstKill.message(text,latest.player.x-origin.x,latest.player.z-origin.z);potionSip.message(text,latest.player.x-origin.x,latest.player.z-origin.z);sinkDrain.message(text,latest.player.x-origin.x,latest.player.z-origin.z);stoneCure.message(text,latest.player.x-origin.x,latest.player.z-origin.z);towelWipe.message(text,latest.player.x-origin.x,latest.player.z-origin.z);calmClear.message(text,latest.player.x-origin.x,latest.player.z-origin.z);unicornSpiral.message(text,latest.player.x-origin.x,latest.player.z-origin.z);searchReveal.message(text,latest.player.x-origin.x,latest.player.z-origin.z);squeakyBoard.message(text,latest.player.x-origin.x,latest.player.z-origin.z);rollingTrap.message(text,latest.player.x-origin.x,latest.player.z-origin.z);fallingRock.message(text,latest.player.x-origin.x,latest.player.z-origin.z);dartTrap.message(text,latest.player.x-origin.x,latest.player.z-origin.z,hero.g.rotation.y);landMine.message(text,latest.player.x-origin.x,latest.player.z-origin.z);rustTrap.message(text,latest.player.x-origin.x,latest.player.z-origin.z,hero.g.rotation.y);iceTrap.message(text,latest.player.x-origin.x,latest.player.z-origin.z);pitFall.message(text,latest.player.x-origin.x,latest.player.z-origin.z);polyTrap.message(text,latest.player.x-origin.x,latest.player.z-origin.z);magicTrap.message(text,latest.player.x-origin.x,latest.player.z-origin.z);boulderFill.message(text,latest.player.x-origin.x,latest.player.z-origin.z,hero.g.rotation.y);spellFizzle.message(text,latest.player.x-origin.x,latest.player.z-origin.z);throneSit.message(text,latest.player.x-origin.x,latest.player.z-origin.z);throneCurse.message(text,latest.player.x-origin.x,latest.player.z-origin.z);throneInsight.message(text,latest.player.x-origin.x,latest.player.z-origin.z);throneWrench.message(text,latest.player.x-origin.x,latest.player.z-origin.z);throneGift.message(text,latest.player.x-origin.x,latest.player.z-origin.z);spellStudy.message(text,latest.player.x-origin.x,latest.player.z-origin.z);spellCrumble.message(text,latest.player.x-origin.x,latest.player.z-origin.z);antiMagic.message(text,latest.player.x-origin.x,latest.player.z-origin.z);webSnare.message(text,latest.player.x-origin.x,latest.player.z-origin.z);statueTrap.message(text,latest.player.x-origin.x,latest.player.z-origin.z);bearTrapSnap.message(text,latest.player.x-origin.x,latest.player.z-origin.z);sleepingGas.message(text,latest.player.x-origin.x,latest.player.z-origin.z);teleportBlink.message(text,latest.player.x-origin.x,latest.player.z-origin.z);magicPortal.message(text,latest.player.x-origin.x,latest.player.z-origin.z);}grab.message(text,latest);brainSuck.message(text,latest);poly.message(text);barsMelt.message(text);breath.message(text);if(!combatStream&&meleeIntent&&confirmsPlayerMelee(text)){enqueueAction(hero.actions,{kind:'attack',attack:'weapon',result:'hit',dir:meleeIntent});meleeIntent=null;}const line=$('#engine-line'),log=$('#engine-messages');addMessage(messageLog,text);const view=panelView(messageLog);log.replaceChildren(...view.earlier.map((t,i)=>{const p=document.createElement('div');p.textContent=t;p.className=`msg msg-${view.earlierTones[i]}`;return p;}));log.scrollTop=0;line.textContent=view.line;line.className=`msg msg-${view.lineTone}`;$('#message').textContent=text;historyPanel.refresh();}
 // The name the player typed for their character; the start screen saves it here. Without one the engine uses its default.
 function savedPlayerName(){try{return localStorage.getItem('deanhack.playerName')||undefined;}catch{return undefined;}}
 async function post(path,body={}){if(!token){token=(await fetch('/engine/token').then(r=>r.json())).token;link?.token(token);}const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Engine-Token':token},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error);return data;}
 async function reply(value){if(!pending)return;const req=pending;if(req.kind==='command')lastCommand=value;meleeIntent=req.kind==='command'?meleeDirection(value):null;pending=null;lines=[];menu=null;dialog.close();setPrompt('Engine is resolving your action…');try{await post('/engine/input',{id:req.id,value});pollNow?.();}catch(e){meleeIntent=null;message(e.message);setPrompt('Input was not accepted. Reconnect Live mode to refresh the prompt.');}}
 function showGround(items){
  groundPanel.replaceChildren();groundPanelTile=groundTile(latest);groundPanel.hidden=!items.length;
  const heading=document.createElement('strong');heading.textContent='On the ground';groundPanel.append(heading);
  const list=document.createElement('ul');for(const name of items){const item=document.createElement('li');item.textContent=name;list.append(item);}groundPanel.append(list);
  const hint=document.createElement('small');hint.textContent='Press , to pick up';groundPanel.append(hint);
 }
 function prompt(){syncAim();if(!active||!pending)return;setPrompt(pending.prompt);if(pending.kind==='command'||pending.kind==='position')return;
   const groundItems=groundNotice(pending,lines);
   if(groundItems&&latest){
    showGround(groundItems);
    void reply(13);return;
   }
   if(bareMore(pending,lines)){void reply(13);return;}
   dialog.replaceChildren();const heading=promptHeading(pending);const kicker=document.createElement('small');kicker.textContent=heading.kicker;const title=document.createElement('h2');title.textContent=heading.title;dialog.append(kicker,title);
   if(pending.kind==='menu'&&menu){
    // "Take out / pick up what type of objects?" is answered with All types, so the full list opens at once.
    const skip=autoCategory(menu,pending.prompt);if(skip!==null){void reply(String(skip));return;}
    const items=menuKeys(menu.items),form=document.createElement('form'),pickAny=menu.how===2;let classHead='';
    if(menu.how!==0&&menuColumns(items.filter(i=>i.selectable).length)===2){form.classList.add('engine-menu-grid');dialog.classList.add('wide');}else dialog.classList.remove('wide');
    for(const item of items){const row=document.createElement('label');row.className='engine-menu-row';
     if(item.selectable&&menu.how!==0){const input=document.createElement('input');input.type=menu.how===1?'radio':'checkbox';input.name='selection';input.value=item.id;input.dataset.accelerator=item.key;row.append(input);const accel=document.createElement('kbd');accel.textContent=item.key?`[${item.key}]`:'';row.append(accel);}
     else if(!item.selectable&&item.text.trim())row.classList.add('engine-menu-heading');
     if(!item.selectable&&item.text.trim())classHead=item.text;
     const cls=item.selectable?itemClassMark(classHead):'';if(cls){const cm=document.createElement('span');cm.className='class-mark';cm.textContent=cls;cm.setAttribute('aria-hidden','true');row.append(cm);}
     const buc=item.selectable?itemBuc(item.text):null;if(buc){row.classList.add('buc-'+buc);const mark=document.createElement('span');mark.className='buc-mark';mark.textContent=bucMark(buc)+' ';mark.setAttribute('aria-hidden','true');row.append(mark);}
     const ench=item.selectable?itemEnchant(item.text):null;if(ench){row.classList.add('ench-'+ench);const em=document.createElement('span');em.className='ench-mark';em.textContent=enchantMark(ench);em.setAttribute('aria-hidden','true');row.append(em);}
     const hint=item.selectable?itemHint(item.text):'';if(hint)row.title=hint;
     const glow=item.selectable?glowLog.kindFor(item.text,performance.now()):null;if(glow){row.classList.add('glow-'+glow);row.title=(hint?hint+' · ':'')+({blessed:'just blessed',cursed:'just cursed',lifted:'curse just lifted'})[glow];}
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
   else if(pending.kind==='line'){const story=sinceMark(messageLog,turnMark),shown=story.length?story:allRows(messageLog).slice(0,1).reverse();if(shown.length){const box=document.createElement('div');box.className='engine-recent-box';for(const row of shown){const p=document.createElement('p');p.className=`engine-recent msg msg-${row.tone}`;p.textContent=row.text;box.append(p);}dialog.append(box);}const form=document.createElement('form'),input=document.createElement('input'),submit=document.createElement('button');input.maxLength=200;input.autofocus=true;submit.textContent='Enter';form.append(input,submit);form.onsubmit=e=>{e.preventDefault();reply(input.value);};dialog.append(form);}
   else{if(lines.length){const pre=document.createElement('pre');pre.textContent=lines.join('\n');dialog.append(pre);}
    // The end-of-game questions carry the last messages, so what killed you is there to read.
    const recap=deathRecap(pending,allRows(messageLog));if(recap.length){const box=document.createElement('div');box.className='engine-recent-box';for(const row of recap){const p=document.createElement('p');p.className=`engine-recent msg msg-${row.tone}`;p.textContent=row.text;box.append(p);}dialog.append(box);}
    const p=document.createElement('p');p.textContent=pending.kind==='more'?'Press Enter to continue.':'Press a response key. For a direction use arrows or h/j/k/l.';dialog.append(p);const ok=document.createElement('button');ok.textContent='Enter';ok.onclick=()=>reply(13);dialog.append(ok);}
   const cancel=document.createElement('button');cancel.textContent='Cancel / Escape';cancel.onclick=()=>reply(pending.kind==='menu'?'!':pending.kind==='line'?'\u001b':27);dialog.append(cancel);dialog.showModal();
 }
 dialog.addEventListener('cancel',e=>{e.preventDefault();if(pending)reply(pending.kind==='menu'?'!':pending.kind==='line'?'\u001b':27);});
 // Prefer push (SSE); some hosting paths (a tunnel or proxy that buffers streaming
 // responses) never deliver a single byte over it, so fall back to polling /engine/poll
 // if nothing arrives within a few seconds.
 function connect(){
   meleeIntent=null;source?.close?.();link?.stop();hideLinkBanner();
   let usingPolling=false,pollTimer=null,stopped=false,since=0,opened=false;
   link=createLinkWatch({onLost:()=>showLinkBanner('Connection lost.','Reconnect'),onBack:hideLinkBanner,onRestart:()=>{showLinkBanner('The server restarted. Your game was saved.','Continue');source?.close?.();}});
   // the session token is already known by now (fetched for /engine/start): a different one later means a restart
   if(token)link.token(token);
   const handle=v=>{onActivity?.();if(v.type==='frame')applySoon(v);else if(v.type==='request'){meleeIntent=null;pending=v;if(v.kind==='command')startScreen?.landed?.(); // the opening text is read and the game waits on the player: the descent's spiral can go
    if(v.kind==='position'&&travelTo&&v.cursor){aimQueue=aimKeys(v.cursor,travelTo);travelTo=null;}else if(v.kind!=='position')travelTo=null;{const t=travelState.request(v.kind,latest?.player);if(t&&origin)travelMark.show(t.x-origin.x,t.z-origin.z);else travelMark.hide();}if(v.kind==='command')turnMark=markTurn(messageLog);prompt();if(v.kind==='position'&&aimQueue.length){void reply(aimQueue.shift());}else if(v.kind!=='position')aimQueue=[];if(v.kind==='command'&&queuedCommand!==null){const command=queuedCommand;queuedCommand=null;void reply(command);}}else if(v.type==='message'){if(active)message(v.text);}else if(v.type==='status')renderStatus(v.text);else if(v.type==='menu')menu=v;else if(v.type==='commands')commands=v.items;else if(v.type==='text')lines=v.lines;else if(v.type==='combat'||v.type==='death'){if(active)combatEvent(v);}else if(v.type==='pickup'){if(active)pickupNotes.note(v.x,v.z,performance.now());}else if(v.type==='wish'){if(active&&latest?.player){wandWishFlare.wish(v,latest.player.x-origin.x,latest.player.z-origin.z);djinniWish.wish(v,latest.player.x-origin.x,latest.player.z-origin.z);}}else if(v.type==='teleport'){if(active&&v.from&&v.to)teleportBlink.hop({x:v.from.x-origin.x,z:v.from.z-origin.z},{x:v.to.x-origin.x,z:v.to.z-origin.z},!!v.trap);}else if(v.type==='revive'){if(active)rises.add(reviveAction(v),performance.now());}else if(v.type==='fx'){const fx=globalThis.deanhackFx??=[];const tl=fxTimeline(v);fx.push(tl);if(active){const heroZap=zapFlash.play(tl,latest?.player,hero,latest,{windup:ZAP_WINDUP_MS});const shown=heroZap?delayTimeline(tl,ZAP_WINDUP_MS):delayTimeline(tl,queueThrows(tl,findThrower));rays.play(shown,{reflectorAt:(x,z)=>reflectorAt(latest,x,z),solidAt:(x,z)=>solidAt(latest,x,z)});rayMarks.add(shown);explosions.add(shown);flights.play(shown);splash.fromFx(shown,latest);breath.fromFx(shown,latest,{always:heroZap==='breath'});fxHoldUntil=Math.max(fxHoldUntil,performance.now()+fxHoldMs(shown));}if(fx.length>8)fx.shift();}else if(v.type==='tombstone'){lastDeath=v;if(active&&deathBeat.begin(performance.now()))enqueueAction(hero.actions,{kind:'die',dir:hero.actions.lastBlow??null,style:'topple'});}else if(v.type==='ended'){pending=null;travelState.clear();travelMark.hide();queuedCommand=null;if(active){dialog.close();message(v.text);if(startScreen){const death=lastDeath;lastDeath=null;const note=endedNote(v.reason,death?.killer);link?.stop();hideLinkBanner();const wait=death?deathBeat.remainingMs(performance.now()):0;const show=()=>{setMode(false);void startScreen.open({note,death});};if(wait>0)setTimeout(show,wait);else show();}else setPrompt('Session ended. Use Demo room, then Live UnNetHack to resume.');}}};
   async function pollLoop(){
     if(stopped)return;
     try{const r=await fetch(`/engine/poll?since=${since}`);const {events,seq}=await r.json();if(seq<since){link.restart();return;}since=seq;link.ok();for(const event of events)handle(event);}
     catch{link.lost();if(active)setPrompt('Connection interrupted; reconnecting…');}
     if(!stopped)pollTimer=setTimeout(pollLoop,150);
   }
   const es=new EventSource('/engine/events');
   const fallback=setTimeout(()=>{if(usingPolling)return;usingPolling=true;es.close();pollNow=()=>{clearTimeout(pollTimer);pollLoop();};pollLoop();},2500);
   es.onmessage=e=>{if(usingPolling)return;clearTimeout(fallback);link.ok();handle(JSON.parse(e.data));};
   es.onerror=()=>{if(usingPolling)return;link.lost();if(active)setPrompt('Connection interrupted; reconnecting…');};
   // a reopened stream after a drop: the token tells a resumed server from a restarted one
   es.onopen=async()=>{if(!opened){opened=true;return;}try{const {token:t}=await (await fetch('/engine/token')).json();if(!link.token(t))link.ok();}catch{}};
   currentHandle=handle;
   source={close:()=>{stopped=true;pollNow=null;clearTimeout(fallback);clearTimeout(pollTimer);es.close();link?.stop();}};
 }
 const saved={banner:$('.location small').textContent,heading:$('.location h1').textContent,keys:$('.keys').innerHTML,companion:$('.companion').innerHTML};
 // In the player's flow (the splash is installed) the footer has no Demo room toggle and no name box.
 let startScreen=null,lastDeath=null,heroCorpse=null;const deathBeat=createDeathBeat();
 // The hero's bones, laid on her cell once the fall has played out (death-beat.js).
 // The bones start invisible: crossfadeHeroBones dissolves the body into them (BONES_FADE_MS).
 function layHeroBones(){if(heroCorpse||!latest?.player)return;heroCorpse=createCorpse(latest.player.role||'human',15,(latest.player.x*7+latest.player.z)|0);heroCorpse.position.set(latest.player.x-origin.x,0,latest.player.z-origin.z);heroCorpse.traverse(o=>{if(o.isMesh&&o.material){o.material.transparent=true;o.material.opacity=0;}});group.add(heroCorpse);}
 function crossfadeHeroBones(f){if(!heroCorpse)return;applyFade(hero,1-f);heroCorpse.traverse(o=>{if(!o.isMesh||!o.material)return;o.material.opacity=f;if(f>=1)o.material.transparent=false;});if(f>=1)hero.g.visible=false;}
 function clearHeroBones(){deathBeat.clear();if(heroCorpse){group.remove(heroCorpse);heroCorpse.userData.dispose?.();heroCorpse=null;}restoreFade(hero);hero.g.visible=true;}
 function setMode(value){active=value;nameInput.hidden=value;minimap.setVisible(value);if(!value)syncAim();if(!active)$('.location small').textContent=saved.banner;cavern.setActive(active);for(const {light,base} of ambientLights)light.intensity=active?base*LIVE_AMBIENT:base;document.body.classList.toggle('live-engine',active);group.visible=active;for(const o of demoObjects)o.visible=!active;panel.hidden=!active;actions.hidden=!active;$('#reset').hidden=active;$('.legend').hidden=active;$('.character h2').hidden=active;button.textContent=active?'Demo room':'Live UnNetHack';if(!active){$('.companion').innerHTML=saved.companion;$('.companion').hidden=false;$('.character').classList.remove('low-hp');levelBanner.classList.remove('show');shownTitle=null;}$('.keys').innerHTML=active?LIVE_KEYS_HTML:saved.keys;if(active){if(latest)apply(latest);prompt();}else{dialog.close();onDemo();$('.location h1').textContent=saved.heading;$('.location h1').hidden=false;dropEngulfCamera(camera,controls);controls.target.set(0,.1,0);camera.position.set(11,13,16);}onMode?.(active);if(startScreen){nameInput.hidden=true;button.hidden=true;}}
 button.onclick=async()=>{if(active){setMode(false);return;}setMode(true);setPrompt('Starting isolated UnNetHack…');try{const started=await post('/engine/start',{name:savedPlayerName(),...readChoice()});if(started?.name)setCharacterName(started.name);connect();}catch(e){message(`Could not start engine: ${e.message}. Run npm run engine:build first.`);}};
 // The first thing a visitor sees: a name and one button that resumes or begins a game and goes straight to Live (?demo skips it).
 startScreen=installStartScreen({button,nameInput});if(startScreen){nameInput.hidden=true;button.hidden=true;}
 // the kitten's skin (feline-hull.js) is grown while the splash waits for a name, not on the first level
 // and, while the splash is still up, the pet's grown-up looks, one per idle slot, so growing up later
 // does not stall on its skin (each takes a few seconds; none start once play has begun)
 {const idle=globalThis.requestIdleCallback??(f=>setTimeout(f,800)),looks=['kitten','housecat','large cat'],next=()=>{const n=looks.shift();if(!n||(active&&n!=='kitten'))return;try{growFelineHull(n);}catch{}idle(next);};idle(next);}
 actions.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>{if(pending?.kind==='command')reply(Number(b.dataset.key));});
 addEventListener('keydown',e=>{if(!active||e.altKey||e.metaKey)return;if(e.ctrlKey&&e.key.toLowerCase()==='p'){e.preventDefault();e.stopImmediatePropagation();historyPanel.toggle();}else if(e.key==='Escape'&&historyPanel.isOpen()){e.preventDefault();e.stopImmediatePropagation();historyPanel.hide();}},true);
 addEventListener('keydown',e=>{if(!active||e.metaKey||e.altKey)return;if(e.target instanceof HTMLInputElement)return;
   if(e.ctrlKey){if(e.key.toLowerCase()==='d'&&pending?.kind==='command'){e.preventDefault();e.stopImmediatePropagation();void reply(4);}return;}
   if(pending?.kind==='menu')return;let code;const directions={ArrowUp:107,ArrowDown:106,ArrowLeft:104,ArrowRight:108};
   if(pending?.kind==='command'){code=directions[e.key]??(e.key===' '?46:e.key.length===1?e.key.charCodeAt(0):undefined);}
   // getpos cursor prompt (travel, stair travel, farlook): raw keys and Escape, Enter picks the spot
   else if(pending?.kind==='position'){code=directions[e.key]??(e.key==='Escape'?27:e.key==='Enter'?46:e.key.length===1?e.key.charCodeAt(0):undefined);}else code=directions[e.key]??(e.key==='Enter'?13:e.key==='Escape'?27:e.key.length===1?e.key.charCodeAt(0):undefined);
   if(code){e.preventDefault();e.stopImmediatePropagation();if(pending)reply(code);else if(pending===null)queuedCommand=code;}
 },true);
 return {get active(){return active;},setCough(h){coughHunch=h;},orient(on){return orientOverlay.set(on);},get orientCount(){return orientOverlay.count;},get deathState(){return {dead:!!hero.actions.dead,finished:!!hero.actions.finished,current:hero.actions.current?.kind??null,beat:deathBeat.active,bones:!!heroCorpse,fade:+deathBeat.crossfade(performance.now()).toFixed(2),visible:hero.g.visible};},get flightsInAir(){return flights.active.map(f=>({shape:f.shape,visible:f.outer.visible,x:+f.outer.position.x.toFixed(2),z:+f.outer.position.z.toFixed(2),yaw:+f.outer.rotation.y.toFixed(2)}));},_inject(v){currentHandle?.(v);},_link(){return link;},heroAt(out){if(!active||!hero.target||!heroLook(latest?.player,true))return null;return hero.g.getWorldPosition(out);},update(t,dt){const feel=hitFeel.update(dt);hitFeel.apply(camera,feel.offset);dt*=feel.scale;aim.update(t);travelMark.update(t);if(!active||!hero.target)return;poseEngulfed(hero,null);poseHeld(hero,null);clearActionPose(hero,hero.actions);unposeDualStance(hero);zapFlash.unpose(hero);const delta=STEP.copy(hero.target).sub(hero.g.position),moving=delta.length()>.025;if(moving)hero.g.rotation.y=Math.atan2(delta.x,delta.z);beginHop(hero);hero.g.position.lerp(hero.target,1-Math.exp(-dt*14));endHop(hero,dt);{const blink=teleportBlink.heroPose();poseHeroBlink(hero,blink?.pose,blink?.from,blink?.to);}hero.body.position.y=Math.sin(t*(moving?18:2))*(moving?.035:.013);if(coughHunch||coughApplied)hero.body.rotation.x=coughHunch;coughApplied=coughHunch;hero.legs.forEach((l,i)=>l.rotation.x=moving?Math.sin(t*18+i*Math.PI)*.5:0);heroForm.animate(t,moving);hero.cape.rotation.x=-.17+Math.sin(t*3)*.06;if(hero.plume)hero.plume.rotation.z=-.16+Math.sin(t*2.4)*.035;updateGhosting(hero,dt,t,!!latest?.player?.invisible);
   const offset=STEP.copy(hero.g.position).sub(controls.target);offset.y=0;offset.multiplyScalar(1-Math.exp(-dt*3));controls.target.add(offset);camera.position.add(offset);lantern.position.copy(hero.g.position);lantern.position.y+=3;
   animated.update(t);updateDoorSwings(dt);
   updateDualStance(hero,dt,t);updateActions(hero,hero.actions,dt);if(deathBeat.corpseDue(hero.actions.finished,performance.now()))layHeroBones();if(heroCorpse)crossfadeHeroBones(deathBeat.crossfade(performance.now()));digSwing.update(hero,dt,!!hero.actions?.current||!!hero.actions?.queue.length||!!hero.actions?.dead);prayerKneel.update(hero,dt,!!hero.actions?.current||!!hero.actions?.queue.length||!!hero.actions?.dead);zapFlash.update(dt,hero);swingFx.update(hero,dt,swingTarget);updateHoseFlop(hero,dt);updateSlingWhirl(hero);
   updateTorchLights(t,dt);cavern.update(t,dt,hero.g.position);branchAir.update(t,dt,hero.g.position);
   for(const a of actors.values()){clearActionPose(a,a.actions);clearStalk(a);a.g.userData.updateOracle?.(t);a.g.userData.updateGridBug?.(t);a.g.userData.updateOwlbear?.(t,dt);a.g.userData.updateBaluchitherium?.(t,dt);let walking=false;if(a.target){const d=STEP.copy(a.target).sub(a.g.position);walking=(a.trail?a.pathLeft??d.length():d.length())>.025;if(walking)a.g.rotation.y=a.trail&&a.pathYaw!==undefined?a.pathYaw:yawToward(d.x,d.z,a.g.rotation.y);/* a trail follower (slide.js) faces its own heading along the way it was led */slideTo(a,dt);if(a.legs)a.legs.forEach((l,i)=>l.rotation.x=walking?Math.sin(t*22+i*2)*.4:0);}if((a.animator||a.asset?.animator)?.mind)a.senses={hero:heroLook(latest?.player,hero.g.position),prey:findPrey(a,actors.values()),threat:findThreat(a,actors.values())};/* what the pet's mind attends to (feline-mind.js) */a.asset?.update(dt,walking);if(a.tail)a.tail.rotation.z=tailSway(a,t);if(a.charm)a.charm.position.y=.3+Math.sin(t*4)*.025;if(a.body){const idle=a.quirk==='orc'?.025:a.quirk==='dragon'?.035:a.quirk==='unicorn'?.022:.015;a.body.position.y=Math.sin(t*(walking?22:2.5))*idle;}if(a.wings?.length)a.wings.forEach((wing,i)=>{if(a.quirk==='bat'||a.flap){wing.rotation.z=(wing.userData.side||(i?1:-1))*wingFlap(a.flap,t);}else if(a.quirk==='bee'){wing.rotation.y=(i?1:-1)*Math.sin(t*60)*.35;}else wing.rotation.y=(i?1:-1)*(-.18+Math.sin(t*5)*.12);});if((a.quirk==='hover'||a.quirk==='bat'||a.quirk==='bee')&&a.body)a.body.position.y=flightBob(a.flap,t,a.g.position.x);if(a.quirk==='dragon')a.g.rotation.z=Math.sin(t*1.7)*.025;if(a.quirk==='nymph'&&a.body)a.body.rotation.z=Math.sin(t*1.3+a.g.position.x)*.035;if(a.quirk==='gridbug')a.g.rotation.z=Math.sin(t*9)*.035;if(a.quirk==='guard')a.g.rotation.z=Math.sin(t*1.3)*.012;const busy=walking||!!a.actions?.current||!!a.actions?.queue.length;updateGait(a,dt,walking);updatePlod(a,dt,walking);updateSkitter(a,dt,walking);updateTripod(a,dt,walking);updateTrudge(a,dt,walking);updateStrawFlop(a,dt,t,walking);updateHemSway(a,dt,t);updateSerpentStaff(a,dt,t,heroLook(latest?.player,hero.g.position));updateFlap(a,dt,t);updateFidget(a,dt,t,busy,heroLook(latest?.player,hero.g.position));updateWereShudder(a,dt,t,busy,heroLook(latest?.player,hero.g.position));updateStalk(a,dt,t,findPrey(a,actors.values()),busy);const core=a.core||a.g.userData.core;if(core&&!a.spherePulse&&!a.lightFlare)core.material.emissiveIntensity=4.5+Math.sin(t*5)*1.4;if(a.actions){updateActions(a,a.actions,dt);const q=a.actions;if(q.dead)hideDeathRing(a);if(q.dead&&q.fade!=null)applyFade(a,q.fade);if(q.deathBurst){deathFx.burst(q.deathBurst.style,a.g.position,{dir:q.deathBurst.dir,...deathLook(a)});q.deathBurst=null;}if(q.deathShed){deathFx.burst(q.deathShed.style,a.g.position,{dir:q.deathShed.dir,...deathLook(a)});q.deathShed=null;}if(q.riseBurst){for(const look of ['rise','riseMotes'])deathFx.burst(look,a.g.position,deathLook(a));q.riseBurst=null;}}updateBask(a,dt,t,busy);updateDragonMenace(a,dt,t,busy,walking,heroLook(latest?.player,hero.g.position));updateCockatriceHiss(a,dt,t,busy,walking,heroLook(latest?.player,hero.g.position));updateSkulk(a,dt,t,busy);updateTaunt(a,dt,t,busy);updateInvoke(a,dt,t,busy);updateHeft(a,dt,t,busy);updateDwarfStroke(a,dt,t,busy);updateGnomeTug(a,dt,t,busy);updateOrcSpit(a,dt,t,busy);updateKoboldSniff(a,dt,t,busy);updateTenguCock(a,dt,t,busy);updateHomunculusLurk(a,dt,t,busy);updateCanineSnuffle(a,dt,t,busy);updateCanineBow(a,dt,t,busy,heroLook(latest?.player,hero.g.position));updateFelineWatch(a,dt,t,busy);updateBeetleGnash(a,dt,t,busy);updateBeetleFlex(a,dt,t,busy);updateTurtleGlare(a,dt,t,busy);updateScorpionClack(a,dt,t,busy);updateLemureSlump(a,dt,t,busy);updateManesScrabble(a,dt,t,busy);updateZombieReach(a,dt,t,busy);updateMummyCreak(a,dt,t,busy);updateGolemRatchet(a,dt,t,busy);updateElfListen(a,dt,t,busy);updateHobbitClutch(a,dt,t,busy);updateLocustRasp(a,dt,t,busy);updateCentipedeWrithe(a,dt,t,busy);updateQuasitWhisper(a,dt,t,busy);updateRally(a,dt,t,busy);updatePonder(a,dt,t,busy);updateKamae(a,dt,t);updateSalute(a,dt,t,busy);updateMonkBow(a,dt,t,busy);updateRogueProwl(a,dt,t,busy);updateBarbarianBrood(a,dt,t,busy);updateHealerPeer(a,dt,t,busy);updateTouristGawk(a,dt,t,busy);updateMuggerCosh(a,dt,t,busy);updateConvictHunted(a,dt,t,busy);updateRangerDraw(a,dt,t,busy);updateCharonOar(a,dt,t,busy);updatePrisonerRock(a,dt,t,busy,heroLook(latest?.player,hero.g.position));updateCubeDrift(a,dt,t,walking);updateWhipEmbers(a,dt,t);updateTwitch(a,dt,t,busy);updateWhiffle(a,dt,t,walking,!!a.actions?.current||!!a.actions?.queue.length);updateTuck(a,dt,walking);updateInsectSettle(a,dt,busy,heroLook(latest?.player,hero.g.position));updateCockatriceSettle(a,dt,busy,heroLook(latest?.player,hero.g.position));updateCanineSettle(a,dt,busy,heroLook(latest?.player,hero.g.position));updateWildcatSettle(a,dt,busy,heroLook(latest?.player,hero.g.position));updateWildcatStalk(a,dt,t,busy,heroLook(latest?.player,hero.g.position));updateCockatriceCrow(a,dt,t,busy,heroLook(latest?.player,hero.g.position));updateCockatriceBob(a,dt,walking);updateInsectAlarm(a,dt,t,busy,heroLook(latest?.player,hero.g.position));}actorBatch.update();hitFx.update([hero,...actors.values()],dt);deathFx.update(dt);petrify.update(dt);throneVanish.update(dt);fountainLady.update(dt);fountainSnakes.update(dt);fountainGush.update(dt);altarSacrifice.update(dt);altarClover.update(dt);altarGlow.update(dt);mjollnirStrikes.update(dt);altarFlashes.update(dt);fireStrikes();altarGift.update(dt);blessFlash.update(dt);fountainNymph.update(dt);fountainDemon.update(dt);fountainWish.update(dt);wandWishFlare.update(dt);djinniWish.update(dt);fireTrapJet.update(dt);goldGlint.update(dt);firstKill.update(dt);potionSip.update(dt);sinkDrain.update(dt);stoneCure.update(dt);towelWipe.update(dt);calmClear.update(dt);unicornSpiral.update(dt);stairStep.update(dt);searchReveal.update(dt);squeakyBoard.update(dt);rollingTrap.update(dt);fallingRock.update(dt);dartTrap.update(dt);landMine.update(dt);rustTrap.update(dt);iceTrap.update(dt);pitFall.update(dt);polyTrap.update(dt);magicTrap.update(dt);boulderFill.update(dt);spellFizzle.update(dt);throneSit.update(dt);throneCurse.update(dt);throneInsight.update(dt);throneWrench.update(dt);throneGift.update(dt);spellStudy.update(dt);spellCrumble.update(dt);antiMagic.update(dt);webSnare.update(dt);statueTrap.update(dt);bearTrapSnap.update(dt);sleepingGas.update(dt);teleportBlink.update(dt);magicPortal.update(dt);digChips.update(dt);digCracks.update(dt);levelUp.update(dt);prayerLight.update(dt);rays.update(dt,origin);const {flash:rayFlash}=rayMarks.update(dt,origin);rayFlashLight.intensity=rayFlash*RAY_FLASH_INTENSITY;rayFlashLight.position.set(hero.g.position.x,3.2,hero.g.position.z);const blast=explosions.update(dt,origin);blastLight.intensity=blast.light*BLAST_LIGHT_INTENSITY;if(blast.light>0){blastLight.color.setHex(blast.color);blastLight.position.set(blast.x-origin.x,1.2,blast.z-origin.z);}
   for(const item of groundItems.values())if(item.visible){item.userData.wandAura?.userData.update(t);item.userData.artifactGleam?.userData.update(t);item.userData.scrollAura?.userData.update(t);item.userData.ringAura?.userData.update(t);item.userData.amuletAura?.userData.update(t);item.userData.toolAura?.userData.update(t);item.userData.armorAura?.userData.update(t);item.userData.weaponAura?.userData.update(t);item.userData.potionFx?.userData.update(t);item.userData.potionAura?.userData.update(t);item.userData.bagMaw?.userData.update(t);item.userData.corpseFx?.userData.update(t);}
   for(const item of liftingItems)if(updatePickupLift(item,hero.g.position,dt)){release(item);liftingItems.delete(item);}
   updateHeldWandAura(hero,t);heldCrackle=updateHeldMjollnir(hero,dt,t);updateHeldExcalibur(hero,dt,t);updateHeldGleam(hero,t);
   for(const item of groundItems.values()){if(!item.userData.coinPile)continue;item.userData.coinAge=(item.userData.coinAge||0)+dt;for(const coin of item.userData.coinPile){if(coin.settled||item.userData.coinAge<coin.delay)continue;coin.velocity-=9.8*dt;coin.disk.position.y+=coin.velocity*dt;coin.stamp.position.y+=coin.velocity*dt;if(coin.disk.position.y<=coin.target){coin.disk.position.y=coin.target;coin.stamp.position.y=coin.target+.0115;coin.velocity*=-.16;if(Math.abs(coin.velocity)<.35)coin.settled=true;}}}
   marks.update(dt);if(flooding)flooding=flood.update(dt,origin).count>0;splash.update(dt,origin);flights.update(dt,origin);const grabbed=grab.update(dt,origin);poseBrainSuck(hero,brainSuck.update(dt,origin).shake);const holding=hold.update(dt,origin,{skip:grabbed.held});poseHeld(hero,holding.squeeze);hero.g.position.y=(hero.hopAt?.y??0)+grabbed.sink+digDrop.update(dt)+stairTumble.update(dt)+(hero.actions.applied?.dy??0);
   const {poses:polyPoses}=poly.update(dt,origin);poseActor(hero,latest?.player&&polyPoses.get(`${latest.player.x},${latest.player.z}`));for(const a of actors.values())poseActor(a,polyPoses.get(a.cell));barsMelt.update(dt,origin);doorBreak.update(dt,origin);const br=breath.update(dt,origin);if(br.glow*BREATH_LIGHT_INTENSITY>blastLight.intensity){blastLight.intensity=br.glow*BREATH_LIGHT_INTENSITY;blastLight.color.setHex(br.color);blastLight.position.set(br.x-origin.x,1.2,br.z-origin.z);}const eng=engulf.update(dt,origin);engulfCamera(camera,controls,eng);poseEngulfed(hero,eng.hero);
   for(const tile of tiles.values()){const liquid=tile.userData.liquid;if(!liquid)continue;liquid.visible=!(flooding&&flood.pending(tile.position.x+origin.x,tile.position.z+origin.z));if(tile.visible&&liquid.visible)liquid.userData.updateLiquid(t);}
   for(const w of wells.values())w.userData.updateFountain?.(t);
   if(orientOverlay.enabled)orientOverlay.update(liveEntries({hero,actors:actors.values(),tiles:tiles.values(),flights:flights.active}));
 }};
}
