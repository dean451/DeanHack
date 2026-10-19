import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSkinnedFeline, updateSkinnedFeline} from './feline-skin.js';
import {MIND, findThreat} from './feline-mind.js';

// feline-mind.js: the pet cat's attention and mood.
const at = (x, z) => new THREE.Vector3(x, 0, z);
const rat = (x, z) => ({actor: {species: 'sewer rat', g: {position: at(x, z)}, target: at(x, z)}, dx: x, dz: z, d: Math.hypot(x, z)});
const orc = (x, z) => ({actor: {species: 'hill orc', g: {position: at(x, z), userData: {disposition: 'hostile'}}, target: at(x, z)}, dx: x, dz: z, d: Math.hypot(x, z)});
const stand = (a, frames, senses) => { a.senses = senses; let r; for (let i = 0; i < frames; i++) r = updateSkinnedFeline(a, 1 / 60, null, false); return r; };
const headYaw = a => { const f = new THREE.Vector3(0, 0, 1).applyQuaternion(a.rig.head.getWorldQuaternion(new THREE.Quaternion())); return Math.atan2(f.x, f.z); };
const tipOf = (a, L) => { a.g.updateMatrixWorld(true); const e = L.bones[L.bones.length - 1]; return L.leg.tip.clone().applyMatrix4(e.matrixWorld); };

test('a content cat watches the hero, turning its head (the neck taking a share), and turns round on its paws when the hero is behind it', () => {
  const a = createSkinnedFeline('kitten'); updateSkinnedFeline(a, 1 / 60, null, false);
  let r = stand(a, 90, {hero: at(2, 1)});
  assert.equal(r.mood.mood, 'content'); assert.equal(r.mood.look, 'hero');
  assert.ok(Math.abs(headYaw(a) - Math.atan2(2, 1)) < .15, `the head is on the hero: ${headYaw(a).toFixed(2)}`);
  assert.equal(a.g.rotation.y, 0, 'a turn of the head is enough');
  assert.ok(Math.abs(new THREE.Euler().setFromQuaternion(a.rig.neck.quaternion, 'YXZ').y) > .2, 'the neck turns too');
  // behind it: the cat turns round, stepping, and the paws stay planted
  const st = a.animator.stepper, h = st.hip(); let drift = 0, stepped = false;
  a.senses = {hero: at(0, -2.5)};
  for (let i = 0; i < 180; i++) { r = updateSkinnedFeline(a, 1 / 60, null, false); if (r.mood.turn) stepped ||= r.step.stepping; for (const L of Object.values(st.legs)) if (L.stance && L.plant && r.stepWeight > .99) drift = Math.max(drift, tipOf(a, L).distanceTo(L.plant) / h); }
  assert.ok(Math.abs(Math.abs(a.g.rotation.y) - Math.PI) < .1, `facing the hero: ${a.g.rotation.y.toFixed(2)}`);
  assert.ok(stepped, 'it stepped round'); assert.ok(drift < .02, `planted paws held: ${drift.toFixed(3)} h`);
});

test('prey in range: it hunts, eyes locked, sunk into a stalking crouch on planted paws, tail low; a hostile makes it wary and a little lower', () => {
  const a = createSkinnedFeline('kitten'), restY = a.rig.hips.userData.world[1]; updateSkinnedFeline(a, 1 / 60, null, false);
  const st = a.animator.stepper, hipLocal = st.hip() / a.g.scale.x;
  let r = stand(a, 150, {prey: rat(1.2, 1.2)});
  assert.equal(r.mood.mood, 'hunting'); assert.equal(r.mood.look, 'prey');
  assert.ok(Math.abs(headYaw(a) - Math.PI / 4) < .2, `eyes on the rat: ${headYaw(a).toFixed(2)}`);
  const sunk = (restY - a.rig.hips.position.y) / hipLocal;
  assert.ok(sunk > MIND.stalk * .8 && sunk < MIND.stalk * 1.3, `the stalk sinks the hips ${(sunk * 100).toFixed(0)}% of the hip height (Trank 1996: ~30%)`);
  for (const L of Object.values(st.legs)) assert.ok(Math.abs(tipOf(a, L).y) < .01 * hipLocal, `${L.key} paw on the floor`);
  r = stand(a, 150, {threat: orc(0, 2)});
  assert.equal(r.mood.mood, 'wary'); assert.equal(r.mood.look, 'threat');
  const wary = (restY - a.rig.hips.position.y) / hipLocal; assert.ok(wary > MIND.wary * .7 && wary < sunk, `wary sits lower than standing, higher than stalking: ${wary.toFixed(2)}`);
  // the threat outranks the prey
  r = stand(a, 30, {prey: rat(1, 0), threat: orc(0, 2)}); assert.equal(r.mood.mood, 'wary');
  // and with nothing about it stands up again
  r = stand(a, 180, {}); assert.equal(r.mood.mood, 'content');
  assert.ok(Math.abs(a.rig.hips.position.y - restY) < .01, 'standing tall again');
});

test('walking, it looks where it is going and glances at the hero every few seconds', () => {
  const a = createSkinnedFeline('housecat'); a.g.rotation.y = Math.PI / 2; updateSkinnedFeline(a, 1 / 60, null, false);
  const v = 2.8 * a.animator.stepper.hip(), looks = {ahead: 0, hero: 0}; let glances = 0, was = null;
  a.senses = {hero: at(0, 3)};
  for (let i = 0; i < 60 * 15; i++) { a.g.position.x += v / 60; a.senses.hero.x = a.g.position.x - 1; a.slideSpeed = v; const r = updateSkinnedFeline(a, 1 / 60, null, true); looks[r.mood.look]++; if (r.mood.look === 'hero' && was !== 'hero') glances++; was = r.mood.look; }
  assert.ok(looks.ahead > looks.hero * 3, `mostly ahead: ${JSON.stringify(looks)}`);
  assert.ok(glances >= 2 && glances <= 7, `${glances} glances in 15 s`);
});

test('the tail carries the mood: up and hooked when content, low when hunting', () => {
  const tailTip = a => { a.g.updateMatrixWorld(true); return a.rig.tail[4].getWorldPosition(new THREE.Vector3()).y - a.rig.tail[0].getWorldPosition(new THREE.Vector3()).y; };
  const a = createSkinnedFeline('housecat'); updateSkinnedFeline(a, 1 / 60, null, false);
  stand(a, 120, {}); const content = tailTip(a);
  stand(a, 180, {prey: rat(1, 1)}); const hunting = tailTip(a);
  assert.ok(hunting < content - .05, `the tail drops for the hunt: tip ${hunting.toFixed(3)} vs ${content.toFixed(3)} above its root`);
});

test('only a content cat sits; one that sees prey gets up, and its sitting legs belong to the sit clip', () => {
  const a = createSkinnedFeline('kitten'); updateSkinnedFeline(a, 1 / 60, null, false);
  let r = stand(a, 60 * 9, {}); assert.ok(r.sitting);
  assert.ok(a.rig.legs.lhind.bones[1].rotation.x > .5, 'the hind legs folded');
  r = stand(a, 120, {prey: rat(1, 0)}); assert.ok(!r.sitting); assert.equal(r.mood.mood, 'hunting');
  r = stand(a, 60, {}); assert.ok(!r.sitting, 'it does not drop straight back into a sit');
  r = stand(a, 60 * 9, {}); assert.ok(r.sitting);
  assert.ok(a.rig.legs.lhind.bones[1].rotation.x > .5, 'sitting again, the legs fold again (the held sit pose is not lost under the step)');
});

test('findThreat: the nearest living hostile within range that is not prey', () => {
  const cat = {species: 'kitten', g: {position: at(0, 0)}, target: at(0, 0)};
  const hostileRat = rat(1, 0).actor; hostileRat.g.userData = {disposition: 'hostile'};
  const actors = [orc(4, 0).actor, hostileRat, orc(0, 2).actor, {species: 'hill orc', g: {position: at(1, 1), userData: {disposition: 'peaceful'}}}];
  assert.equal(findThreat(cat, actors)?.actor, actors[2], 'not the hostile rat (prey), not the peaceful orc, not the far one');
  assert.equal(findThreat(cat, [orc(5, 0).actor]), null);
});

test('the ears: relaxed when content, pricked forward hunting, laid back and out when wary, flicking now and then, and turning toward a new target ahead of the head', () => {
  const a = createSkinnedFeline('kitten'), E = a.rig.ears; assert.ok(E?.l && E?.r, 'an ear bone each side');
  // how far an ear's tip leans forward (+) or back (-) of its base, and how far its opening faces out
  const lean = e => new THREE.Vector3().copy(e.frame.up).applyQuaternion(e.bone.quaternion).dot(e.frame.fwd);
  const facing = e => new THREE.Vector3().copy(e.frame.fwd).applyQuaternion(e.bone.quaternion).x * e.side;
  stand(a, 120, {hero: at(0, 3)}); const content = lean(E.r);
  stand(a, 120, {prey: rat(0, 1.5)}); const hunting = lean(E.r);
  stand(a, 120, {threat: orc(0, 2)}); const wary = lean(E.r), waryOut = facing(E.r);
  assert.ok(hunting > content + .03, `pricked forward hunting: ${hunting.toFixed(2)} vs ${content.toFixed(2)}`);
  assert.ok(wary < content - .4 && waryOut > .3, `laid back (${wary.toFixed(2)}) and turned out (${waryOut.toFixed(2)}) when wary`);
  // flicks: over half a minute each ear lays back quickly at least once
  const b = createSkinnedFeline('kitten'); let flicked = 0, base = null;
  for (let i = 0; i < 1800; i++) { stand(b, 1, {}); const l = lean(b.rig.ears.l); base ??= l; if (l < base - .2) flicked++; }
  assert.ok(flicked > 0, 'an ear flicks');
  // a hero appearing to one side: the ear on that side turns toward it before the head has got there
  const c = createSkinnedFeline('kitten'); stand(c, 60, {hero: at(0, 3)});
  const before = facing(c.rig.ears.r); stand(c, 4, {hero: at(3, .5)});
  assert.ok(facing(c.rig.ears.r) > before + .05 && Math.abs(headYaw(c)) < 1, 'the near ear leads the head');
});

test('a pet eats when the game says so: the messages that mean it, and not the hero or anyone else', async () => {
  const {petEats} = await import('./feline-mind.js');
  assert.equal(petEats('Your kitten eats a newt corpse.'), 'kitten');
  assert.equal(petEats('Tibbles devours a tripe ration.'), 'tibbles');
  assert.equal(petEats('The kitten starts eating a lichen corpse.'), 'kitten');
  assert.equal(petEats('You eat the food ration.'), null);
  assert.equal(petEats('The jackal bites!'), null);
  assert.equal(petEats('Your kitten eats a newt corpse.', ['housecat']), null, 'narrowed to the pets on the level');
  const a = createSkinnedFeline('kitten'); stand(a, 10, {}); a.animator.eat(); let r, low = Infinity, jaw = 0;
  for (let i = 0; i < 150; i++) { r = updateSkinnedFeline(a, 1 / 30, null, false); a.g.updateMatrixWorld(true); low = Math.min(low, a.rig.headLocal([0, -.03, .135]).applyMatrix4(a.rig.head.matrixWorld).y); jaw = Math.max(jaw, a.rig.jaw.rotation.x); }
  assert.equal(r.rest, 'eat'); assert.ok(low < .04, `the mouth down to the food on the floor (${low.toFixed(3)})`); assert.ok(jaw > .05, 'chewing');
});
