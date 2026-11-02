// Combat in Live: each engine combat event becomes a swing, a hit or a miss on the right actor, paired with its
// message; strikes are queued so a blow lands at the moment of impact, and Mjollnir's lightning follows them.
// Moved out of live.js unchanged; it reads the game's state and helpers from L (installLive's shared names).
import {combatAction,deathAction} from './combat-events.js';
import {queueDeath,queueCombat} from './actions.js';

export function combatEvent(v,L){const {S,marks,grab,findSide,brainSuck,STRIKE_PAIR_MS,queueStrike,hero}=L;const c=v.type==='combat'?combatAction(v):deathAction(v);if(!c)return;const log=globalThis.deanhackCombat??=[];log.push(c);if(log.length>16)log.shift();if(S.origin){if(v.type!=='combat')marks.add({type:'death',x:c.x-S.origin.x,z:c.z-S.origin.z,pet:c.pet,name:c.name});else if(c.result==='hit'&&c.defender?.seen&&!c.defender.pet)marks.add({type:'combat',x:c.defender.x-S.origin.x,z:c.defender.z-S.origin.z,name:c.defender.name});}if(v.type!=='combat'){grab.death(c);queueDeath(c,findSide);return;}grab.combat(c);brainSuck.combat(c);S.combatStream=true;if(c.heroAttacks){S.meleeIntent=null;S.swingTarget=c.defender?.name??null;if(c.result==='hit'&&c.defender?.seen){const hit={x:c.defender.x,z:c.defender.z,t:performance.now()};if(S.pendingStrike&&hit.t-S.pendingStrike.t<STRIKE_PAIR_MS){queueStrike(hit);S.pendingStrike=null;}else S.lastHeroHit=hit;}}queueCombat(c,{hero,find:findSide});}
export function queueStrike(at,name,L){const {S,actors,hero,strikeQueue,IMPACT_MS}=L;
  let x=null,z=null;
  if(at){x=at.x-S.origin.x;z=at.z-S.origin.z;}
  else if(name){let best=null;for(const a of actors.values())if(a.species===name.toLowerCase()&&a.target){const d=a.target.distanceTo(hero.g.position);if(!best||d<best.d)best={d,a};}if(best){x=best.a.target.x;z=best.a.target.z;}}
  if(x===null)return;strikeQueue.push({x,z,when:(at?.t??performance.now())+IMPACT_MS});
 }
export function fireStrikes(L){const {strikeQueue,mjollnirStrikes,S}=L;const now=performance.now();for(let i=strikeQueue.length-1;i>=0;i--)if(strikeQueue[i].when<=now){const s=strikeQueue[i];strikeQueue.splice(i,1);mjollnirStrikes.strike(s.x,s.z);S.heldCrackle?.surge();}}
export function monsterSquare(name,L){const {S}=L;const p=S.latest?.player;if(!p||!S.latest?.cells)return null;let best=null,bd=Infinity;
  for(const c of S.latest.cells){if(!c.name||c.object||String(c.name).toLowerCase()!==name)continue;const d=Math.hypot(c.x-p.x,c.z-p.z);if(d<bd){bd=d;best=[c.x-S.origin.x,c.z-S.origin.z];}}return best;}
