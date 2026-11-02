// One engine frame applied to the scene in Live: a new level clears and re-lights, then every known square is built
// or updated (tiles, features, fog, doors, liquids), monsters and the pet are created, moved and posed, floor items
// come and go, and the hero is placed, dressed and routed. Moved out of live.js unchanged; it reads the game's state
// and helpers from L (installLive's shared names).
import {conditionTagsHtml} from './hud-conditions.js';
import {applyStatusScreen} from './status-screen.js';
import {statusScreenEl} from './live-hud.js';
import {worstProgress} from './status-progress.js';
import {levelTitle,lowHealth} from './hud.js';
import {remodelBudget} from './hallu-budget.js';
import {groundTile,withPrices} from './ground-notice.js';
import {syncHeldWandAura,syncWandAura} from './wand-auras.js';
import {syncHeldGleam,syncArtifactGleam} from './artifact-gleam.js';
import {syncHeldMagic,syncFloorMagic} from './weapon-magic.js';
import {dressHero} from './hero-kits.js';
import {mergeStatic,heldObjects} from './static-merge.js';
import {addOutlines,stageCreature} from './readability.js';
import {captureView,restoreView} from './camera-view.js';
import {clearDoorSwings,tileKind,orientDoor,setDoorOpen} from './door-swing.js';
import {poseHeld} from './hold.js';
import {dropEngulfCamera,poseEngulfed} from './engulf.js';
import {poseActor} from './polymorph.js';
import {stepDirection} from './stair-step.js';
import {clearActionPose,createActionQueue,enqueueAction} from './actions.js';
import {groundOf,bridgeYaw} from './terrain-feature.js';
import * as THREE from 'three';
import {box,hasTorch,dressStairs,dressTree} from './live-tile-dress.js';
import {createAltar,ALTAR_TOP} from './altar.js';
import {createThrone} from './throne.js';
import {createSink} from './sink.js';
import {createGrave} from './grave.js';
import {createBars} from './bars.js';
import {createTorchSconce} from './torch.js';
import {createFire} from './fire.js';
import {createDoor,createBrokenDoor} from './door.js';
import {createLiquid} from './liquid.js';
import {cellHash} from './floor.js';
import {syncWard} from './elbereth-ward.js';
import {wallYaw} from './orientation.js';
import {createLiveFountain,createOracle} from './oracle-visuals.js';
import {syncDetectedMark} from './detected-mark.js';
import {syncScrollAura} from './scroll-auras.js';
import {syncRingAura} from './ring-auras.js';
import {syncAmuletAura} from './amulet-auras.js';
import {syncToolAura} from './tool-auras.js';
import {syncArmorAura} from './armor-auras.js';
import {syncWeaponAura} from './weapon-auras.js';
import {syncPotionFx} from './potion-fx.js';
import {syncPotionAura} from './potion-auras.js';
import {isFeline} from './feline.js';
import {createSkinnedFeline} from './feline-skin.js';
import {bakeDraws} from './creatures.js';
import {createShopkeeper,createWatchman} from './shop-visuals.js';
import {createGridBug} from './grid-bug.js';
import {lightenModel} from './creature-lod.js';
import {attachModelAsset} from './model-assets.js';
import {MODEL_URLS} from './asset-urls.js';
import {flapStyle} from './gait.js';
import {restoreFade} from './deaths.js';
import {restoreStone} from './petrify.js';
import {perchHeight} from './perch.js';
import {riseActionFor} from './rise.js';
import {floorFinish,wallFinish,rockTint,rockRoughness,rockVein} from './branch-air.js';
import {ghostGone,shouldGhost,ghostize,GHOST_MAX} from './remembered.js';
import {itemsUnderMonsters} from './held-items.js';
import {hasMagicLook} from './pickup-lift.js';
import {squareOfKey} from './pickup-events.js';
import {planRoute} from './hero-route.js';

// A square's parts (floor slab, dimming stand-in, wall and torch, feature model, door, liquid): built when the square first
// shows, or later from the backlog when a reveal brings more than one frame's budget (tile-backlog.js).
export function fillTile(tile,cell,L){const {dimLayer,floorGeo,floorKit,wallGeo,wall,torchHaloMaterial,animated,tileInstances,setDim}=L;
const slab=box(floorGeo,floorKit.material(cell.x,cell.z),tile,0,-.1,0);/* the floor takes shadows but casts none: a slab's shadow could only fall under the floor, and every slab cast was the whole level drawn again into the shadow map */slab.castShadow=false;tile.userData.slab=slab;floorKit.dress(slab,tile,cell.x,cell.z,groundOf(cell));/* the dimming plane is one instance of the dim layer (dim-layer.js): the square keeps only a stand-in */const fog=dimLayer.stand(tile);/* setDim shows it; at opacity 0 it was a draw per tile for nothing */tile.userData.fog=fog;
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
 animated.add(tile);tileInstances.add(tile);}
// What a built square shows this frame: its feature, stairs or tree dressed, its dimming, and a drawbridge, grate or door
// turned to its walls (a door also opened or shut).
export function dressTile(tile,cell,frame,L){const {wall,dressFeature,setDim}=L;
if(cell.terrain==='feature')dressFeature(tile,cell);if(cell.terrain==='up'||cell.terrain==='down')dressStairs(tile,cell);if(cell.terrain==='tree')dressTree(tile,cell);syncWard(tile,cell);tile.visible=true;tile.scale.y=1;setDim(tile,!cell.visible&&cell.remembered);
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
export function apply(frame,L){const {specialMood,tileBacklog,S,dimLayer,hitFeel,statusProgress,minimap,$,announceLevel,groundPanel,showGround,hero,heroForm,poly,camera,controls,clear,darkness,darkEyes,throneVanish,fountainLady,fountainSnakes,fountainGush,altarSacrifice,altarClover,altarGlow,mjollnirStrikes,altarFlashes,strikeQueue,altarGift,blessFlash,glowLog,fountainNymph,fountainDemon,fountainWish,wandWishFlare,djinniWish,fireTrapJet,goldGlint,firstKill,potionSip,sinkDrain,stoneCure,towelWipe,calmClear,unicornSpiral,stairStep,searchReveal,squeakyBoard,rollingTrap,fallingRock,dartTrap,landMine,rustTrap,iceTrap,pitFall,polyTrap,magicTrap,boulderFill,spellFizzle,throneSit,throneCurse,throneInsight,throneWrench,throneGift,spellStudy,spellCrumble,antiMagic,webSnare,statueTrap,bearTrapSnap,sleepingGas,digChips,digCracks,digSwing,digDrop,stairTumble,levelUp,teleportBlink,magicPortal,prayerLight,prayerKneel,rays,zapFlash,rayMarks,explosions,flood,splash,flights,grab,brainSuck,hold,barsMelt,doorBreak,breath,engulf,clearHeroBones,tiles,release,floorGeo,floorKit,wallGeo,wall,torchHaloMaterial,group,animated,tileInstances,dressFeature,setDim,wells,wellTemplate,groundItems,petrify,actors,pickupIcon,creatureFactory,catFactory,monsterFactory,actorBatch,rises,envStory,cavern,branchAir,branchMood,ghosts,dropGhost,heldUnder,pickupNotes,liftingItems,renderSurroundings,warmUp}=L;const prevFrame=S.latest;S.latest=frame;dimLayer.touch();if(prevFrame?.player&&frame.player&&prevFrame.depth===frame.depth&&prevFrame.branch===frame.branch&&frame.player.hp<prevFrame.player.hp)hitFeel.hit(prevFrame.player.hp-frame.player.hp,{heroHurt:true});if(!S.active)return;
   if(frame.player?.countdowns&&typeof frame.player.countdowns==='object')S.frameCountdowns=frame.player.countdowns;
   if(Array.isArray(frame.player?.conditions)){S.frameConditions=frame.player.conditions;const tags=document.getElementById('hero-conditions');if(tags)tags.innerHTML=conditionTagsHtml(S.frameConditions);applyStatusScreen(statusScreenEl(),S.frameConditions);statusScreenEl().style.setProperty('--status-progress',worstProgress(statusProgress.update(S.frameConditions,frame.turn||0)).toFixed(2));}minimap.update(frame);
   const where=levelTitle(frame);$('.location small').textContent=where.place;$('.location h1').textContent=where.title;$('.location h1').hidden=!where.named;announceLevel(where);
   /* hallucinating, only a few monsters a frame are rebuilt for their new glyph (hallu-budget.js) */S.remodels=remodelBudget(frame.player?.conditions);
   if(S.groundPanelTile!==groundTile(frame)){groundPanel.hidden=true;S.groundPanelTile=null;}
   /* a shop's prices come only with the look_here list; keep them on the frame's own list (ground-notice.js withPrices) */if(Array.isArray(frame.ground)){const shown=withPrices(frame.ground,S.groundPriced);/* the prices belong to what is underfoot: once nothing here matches them they are dropped, whichever of the frame and the look-here line arrived first */if(S.groundPriced&&shown.every((n,i)=>n===frame.ground[i]))S.groundPriced=null;showGround(shown);}
   hero.setWeapon?.(frame.player.weapon??null);syncHeldWandAura(hero,frame.player.weapon??null);syncHeldGleam(hero,frame.player.weapon??null);syncHeldMagic(hero,frame.player.weapon??null);
   if(heroForm.sync(frame.player.form)&&prevFrame)poly.add({x:frame.player.x,z:frame.player.z,hero:true});dressHero(hero,frame.player);hero.setHelmet?.(frame.player.helmet??null);if('shield' in frame.player)hero.setShield?.(frame.player.shield);if('offhand' in frame.player)hero.setOffhand?.(frame.player.offhand);/* the hero's many small pieces, merged by parent and material where nothing holds them (static-merge.js) */mergeStatic(hero.g,{keep:heldObjects(hero.parts,(hero.kitAdded||[]).map(k=>k.obj),hero.head,hero.body,hero.arm,hero.legs,hero.cape,hero.plume)});addOutlines(hero.g);
   const level=`${frame.branch}:${frame.depth}`;const newLevel=level!==S.lastLevel;if(newLevel){const keptView=S.lastLevel?captureView(camera,controls):null;clear();darkness.clear();darkEyes.clear();throneVanish.clear();fountainLady.clear();fountainSnakes.clear();fountainGush.clear();altarSacrifice.clear();altarClover.clear();altarGlow.clear();mjollnirStrikes.clear();altarFlashes.clear();strikeQueue.length=0;altarGift.clear();blessFlash.clear();glowLog.clear();fountainNymph.clear();fountainDemon.clear();fountainWish.clear();wandWishFlare.clear();djinniWish.clear();fireTrapJet.clear();goldGlint.clear();firstKill.clear();potionSip.clear();sinkDrain.clear();stoneCure.clear();towelWipe.clear();calmClear.clear();unicornSpiral.clear();stairStep.clear();searchReveal.clear();squeakyBoard.clear();rollingTrap.clear();fallingRock.clear();dartTrap.clear();landMine.clear();rustTrap.clear();iceTrap.clear();pitFall.clear();polyTrap.clear();magicTrap.clear();boulderFill.clear();spellFizzle.clear();throneSit.clear();throneCurse.clear();throneInsight.clear();throneWrench.clear();throneGift.clear();spellStudy.clear();spellCrumble.clear();antiMagic.clear();webSnare.clear();statueTrap.clear();bearTrapSnap.clear();sleepingGas.clear();digChips.clear();digCracks.clear();digSwing.clear(hero);digDrop.arrive();const tumbled=stairTumble.arrive();levelUp.clear();teleportBlink.levelChanged(0,0);magicPortal.levelChanged(0,0);prayerLight.clear();L.armourDust.clear();L.bagExplosion.clear();prayerKneel.clear(hero);clearDoorSwings();rays.clear();zapFlash.clear(hero);rayMarks.clear();explosions.clear();flood.clear();S.flooding=false;splash.clear();flights.clear();grab.clear();brainSuck.clear();hold.clear();poseHeld(hero,null);poly.clear();barsMelt.clear();doorBreak.clear();breath.clear();engulf.clear();dropEngulfCamera(camera,controls);poseEngulfed(hero,null);poseActor(hero,null);S.origin={x:frame.player.x,z:frame.player.z};if(!tumbled&&S.lastLevel)stairStep.arrive(stepDirection(S.lastBranch,S.lastDepth,frame.branch,frame.depth),0,0);S.lastBranch=frame.branch;S.lastDepth=frame.depth;S.lastLevel=level;clearActionPose(hero,hero.actions);hero.actions=createActionQueue();clearHeroBones();hero.g.position.set(0,0,0);hero.hop=hero.hopAt=null;controls.target.set(0,0,0);restoreView(camera,controls,keptView,[9,10.7,13.1]);}fireTrapJet.settle(frame.player.x-S.origin.x,frame.player.z-S.origin.z);goldGlint.settle(frame.player.x-S.origin.x,frame.player.z-S.origin.z);squeakyBoard.settle(frame.player.x-S.origin.x,frame.player.z-S.origin.z);rollingTrap.settle(frame.player.x-S.origin.x,frame.player.z-S.origin.z);fallingRock.settle(frame.player.x-S.origin.x,frame.player.z-S.origin.z);dartTrap.settle(frame.player.x-S.origin.x,frame.player.z-S.origin.z);landMine.settle(frame.player.x-S.origin.x,frame.player.z-S.origin.z);rustTrap.settle(frame.player.x-S.origin.x,frame.player.z-S.origin.z);iceTrap.settle(frame.player.x-S.origin.x,frame.player.z-S.origin.z);pitFall.settle(frame.player.x-S.origin.x,frame.player.z-S.origin.z);polyTrap.settle(frame.player.x-S.origin.x,frame.player.z-S.origin.z);magicTrap.settle(frame.player.x-S.origin.x,frame.player.z-S.origin.z);boulderFill.settle(frame.player.x-S.origin.x,frame.player.z-S.origin.z);antiMagic.settle(frame.player.x-S.origin.x,frame.player.z-S.origin.z);webSnare.settle(frame.player.x-S.origin.x,frame.player.z-S.origin.z);statueTrap.settle(frame.player.x-S.origin.x,frame.player.z-S.origin.z);bearTrapSnap.settle(frame.player.x-S.origin.x,frame.player.z-S.origin.z);sleepingGas.settle(frame.player.x-S.origin.x,frame.player.z-S.origin.z);
   if(!newLevel&&flood.add(prevFrame,frame))S.flooding=true;splash.flushMessages(frame);grab.frame(frame);hold.frame(frame);poly.frame(frame);barsMelt.frame(frame);doorBreak.frame(frame);engulf.frame(frame);
   darkness.frame(frame);
   if(S.pendingAltarGlow){altarGlow.message(S.pendingAltarGlow,frame.player.x-S.origin.x,frame.player.z-S.origin.z);S.pendingAltarGlow=null;}
   tileBacklog.beginApply(frame.player.x-S.origin.x,frame.player.z-S.origin.z);
   const seen=new Set(),seenActors=new Set(),seenWells=new Set();
   for(const cell of frame.cells){const id=`${cell.x},${cell.z}`,x=cell.x-S.origin.x,z=cell.z-S.origin.z;
     if(cell.terrain!=='unknown'){
       seen.add(id);let tile=tiles.get(id);if(tile&&(tile.userData.type!==tileKind(cell)||tile.userData.ground!==groundOf(cell))){release(tile);tiles.delete(id);tile=null;}
       if(!tile){tile=new THREE.Group();tile.position.set(x,0,z);tile.userData.type=tileKind(cell);tile.userData.ground=groundOf(cell);group.add(tile);tiles.set(id,tile);S.staged=true;
         /* near the hero, or while this frame's building budget lasts, the square is built now; the rest are filled over the next frames (tile-backlog.js) */if(tileBacklog.buildNow(tile))fillTile(tile,cell,L);else tileBacklog.defer(tile);}
       if(!tile.userData.pending)dressTile(tile,cell,frame,L);
     }
     if(cell.terrain==='fountain'){seenWells.add(id);if(!wells.has(id)){const w=createLiveFountain(wellTemplate);w.position.set(x,0,z);group.add(w);wells.set(id,w);}wells.get(id).visible=cell.visible||cell.remembered;}
     if(cell.x===frame.player.x&&cell.z===frame.player.z)continue;
       if(cell.kind==='object'){
       const key=`${id}:${cell.glyph}:${cell.object?.creature||''}${cell.object?.lit?':lit':''}`,seenObject=cell.visible||cell.remembered||cell.sensed;seenActors.add(key);
       if(seenObject&&!groundItems.has(key)){const item=petrify.adopt(actors,cell,x,z)||pickupIcon(cell);item.position.set(x,0,z);group.add(item);groundItems.set(key,item);S.staged=true;}
       // An item lying on an altar rests on the slab, not inside it.
       const rest=cell.terrain==='altar'?ALTAR_TOP:0;
       const item=groundItems.get(key);if(item){if(item.userData.coinPile||item.userData.restingWeapon)item.position.y=rest;item.visible=cell.visible||!!cell.sensed;syncDetectedMark(item,!!cell.sensed&&!cell.visible);syncWandAura(item,cell.object,key);syncArtifactGleam(item,cell.object,key);syncFloorMagic(item,cell.object,key);syncScrollAura(item,cell.object,key);syncRingAura(item,cell.object,key);syncAmuletAura(item,cell.object,key);syncToolAura(item,cell.object,key);syncArmorAura(item,cell.object,key);syncWeaponAura(item,cell.object,key);syncPotionFx(item,cell.object,key);syncPotionAura(item,cell.object,key);if(!item.userData.coinPile&&!item.userData.restingWeapon)item.position.y=rest+Math.sin(performance.now()/600+x+z)*.025;}
     }
       if(cell.kind==='monster'||cell.kind==='pet'){
       const key=`${id}:${cell.glyph}`;seenActors.add(key);let a=actors.get(key);const fresh=!a;
       if(!a){for(const [previous,candidate] of actors){if(!seenActors.has(previous)&&!candidate.actions?.dead&&candidate.glyph===cell.glyph&&Math.hypot(candidate.g.position.x-x,candidate.g.position.z-z)<(candidate.glide?candidate.glide.catchup+1:2.1)){/* a walker that trails its cell (slide.js FELINE_GLIDE) may be several tiles behind it */a=candidate;actors.delete(previous);actors.set(key,a);break;}}}
       if(!a&&S.remodels<=0){for(const [previous,candidate] of actors){if(!seenActors.has(previous)&&!candidate.actions?.dead&&Math.hypot(candidate.g.position.x-x,candidate.g.position.z-z)<(candidate.glide?candidate.glide.catchup+1:2.1)){a=candidate;actors.delete(previous);actors.set(key,a);break;}}}
       if(!a)S.remodels--;
       if(!a){const disposition=cell.kind==='pet'?'pet':cell.peaceful?'peaceful':'hostile';if(cell.kind==='pet'&&/cat|kitten/.test(cell.name)){a=isFeline((cell.name||'').toLowerCase())?createSkinnedFeline((cell.name||'').toLowerCase()):creatureFactory?bakeDraws(creatureFactory(cell)):catFactory();a.petCat=true;stageCreature(a.g,{disposition});}else{const made=/^shopkeeper$/i.test(cell.name||'')?createShopkeeper():/^watchman$/i.test(cell.name||'')?createWatchman():/^grid bug$/i.test(cell.name||'')?createGridBug():/^oracle$/i.test(cell.name||'')?createOracle():creatureFactory?bakeDraws(creatureFactory(cell)):monsterFactory();a=made.g?made:{g:made};lightenModel(a.g,{species:cell.name});/* a lighter copy of its static parts below high, made once a kind (creature-lod.js) */stageCreature(a.g,{disposition});attachModelAsset(a,cell.name,MODEL_URLS)?.then(asset=>{if(asset)addOutlines(asset.model,{smooth:true});});/* a GLB creature gets the same ink as the rest */}a.flap=flapStyle(cell.name);a.g.position.set(x,0,z);group.add(a.g);actors.set(key,a);actorBatch.add(a);S.staged=true;}
       if(a.actions?.finished){clearActionPose(a,a.actions);restoreFade(a);restoreStone(a);a.actions=createActionQueue();}
       a.glyph=cell.glyph;a.species=(cell.name||'').toLowerCase();a.target=new THREE.Vector3(x,perchHeight(cell.terrain),z);a.cell=`${cell.x},${cell.z}`;
       // A monster that just rose from its corpse gets up off the floor instead of popping in (rise.js).
       if(fresh){const risen=rises.claim(cell.x,cell.z,cell.name||null,performance.now());if(risen){a.actions??=createActionQueue();enqueueAction(a.actions,riseActionFor(risen));}}
       // Invisible-and-sensed monsters (telepathy, warning) still send a cell, but the model,
       // its disposition ring — all children of a.g — should stay hidden.
       a.g.visible=!cell.invisible;darkEyes.mark(a,cell);
     }
   }
   for(const [id,t] of tiles)if(!seen.has(id)){release(t);tiles.delete(id);}tileInstances.refresh();envStory.frame(frame,S.origin); // set-dressing round traps, broken doors and fountains (env-story.js)
   cavern.rebuild(tiles,S.origin,newLevel);branchAir.setBranch(frame.dungeon,hero.g.position);branchMood.frame(frame.dungeon,tiles,S.origin);specialMood.frame(frame.special);/* Mines scars and lantern dust, Sokoban grid, Gehennom haze (branch-mood.js) */{const f=floorFinish(frame.dungeon);floorKit.setBranch(f.tint,f.roughness);}{const w=wallFinish(frame.dungeon);wall.color.set(w.color);wall.roughness=w.roughness;}cavern.setTint(rockTint(frame.dungeon),rockRoughness(frame.dungeon),h=>rockVein(frame.dungeon,h));
   {const byId=new Map();for(const c of frame.cells)byId.set(`${c.x},${c.z}`,c);
    for(const [id,gh] of ghosts)if(ghostGone(byId.get(id))||seenActors.has(gh.key)||[...seenActors].some(k=>k.startsWith(id+':'))){dropGhost(gh);ghosts.delete(id);}
    for(const [id,a] of actors)if(!seenActors.has(id)){
     const at=a.cell,cell=at&&byId.get(at);darkEyes.drop(a);
     if(at&&!ghosts.has(at)&&shouldGhost(cell,a.actions?.dead)){restoreFade(a);const mats=ghostize(a.g,THREE);a.g.position.copy(a.target||a.g.position);ghosts.set(at,{g:a.g,mats,key:id});while(ghosts.size>GHOST_MAX){const [oldId,old]=ghosts.entries().next().value;dropGhost(old);ghosts.delete(oldId);}}
     else{restoreFade(a);release(a.g);}
     actors.delete(id);}}
   /* an item a monster or pet stands on stays drawn until it is picked up or the square shows something else (held-items.js) */heldUnder.map=itemsUnderMonsters(frame.cells,groundItems.keys(),frame.player);for(const h of heldUnder.map.values())for(const k of h.keys){seenActors.add(k);const it=groundItems.get(k);if(it)it.visible=h.visible;}
   for(const [id,item] of groundItems)if(!seenActors.has(id)){if(hasMagicLook(item)&&item.visible&&pickupNotes.take(...squareOfKey(id).split(',').map(Number),performance.now()))liftingItems.add(item);else release(item);groundItems.delete(id);}
   for(const [id,w] of wells)if(!seenWells.has(id)){release(w);wells.delete(id);}
   /* a move of several squares in one frame (travel, autoexplore) is walked along a route over open squares, not slid through walls (hero-route.js); a teleport or a new level still jumps */{const to={x:frame.player.x,z:frame.player.z},from=S.heroCell;S.heroCell={x:to.x,z:to.z,level:S.lastLevel};if(!from||from.level!==S.lastLevel||performance.now()-S.heroTeleportAt<1500){hero.route=null;hero.routeSpeed=undefined;}else if(from.x!==to.x||from.z!==to.z){const path=planRoute(frame.cells,from,to),pts=(path?path.slice(1):hero.route?.length?[to]:[]).map(c=>({x:c.x-S.origin.x,z:c.z-S.origin.z}));hero.route=pts.length?[...(hero.route||[]),...pts]:null;hero.routeSpeed=undefined;}}
   hero.target=new THREE.Vector3(frame.player.x-S.origin.x,perchHeight(frame.cells.find(c=>c.x===frame.player.x&&c.z===frame.player.z)?.terrain),frame.player.z-S.origin.z);renderSurroundings(frame);
   $('#hp').textContent=`${frame.player.hp} / ${frame.player.maxhp}`;$('.character').classList.toggle('low-hp',lowHealth(frame.player.hp,frame.player.maxhp));$('#healthbar').style.width=`${100*frame.player.hp/Math.max(1,frame.player.maxhp)}%`;$('#turn').textContent=frame.turn;$('.stats').innerHTML=`<span>AC <b>${frame.player.ac}</b></span><span>LVL <b>${frame.player.level}</b></span><span>TURN <b id="turn">${frame.turn}</b></span>`;
   warmUp();
 }
