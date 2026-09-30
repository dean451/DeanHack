import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {ACTION_TIME, actionsForCombat, createActionQueue, enqueueAction, updateActions,
  clearActionPose, holdBackMs, actionState, remainingTime, findActor, queueCombat, queueDeath} from './actions.js';

// Records every transform the action layer can touch.
const snap = a => JSON.stringify([a.g.position.toArray(), a.g.rotation.toArray().slice(0, 3), a.g.scale.toArray(),
  a.body?.position.y, a.head?.rotation.x, a.arm?.rotation.x, a.wrist?.rotation.x, a.weaponSocket?.rotation.z,
  a.legs?.[0]?.rotation.x, a.tail?.rotation.x].map(v => Array.isArray(v) ? v.map(n => +n.toFixed(6)) : v == null ? null : +v.toFixed(6)));

function hero() {
  const g = new THREE.Group(), part = () => { const o = new THREE.Object3D(); g.add(o); return o; };
  return {g, body: part(), head: part(), arm: part(), wrist: part(), weaponSocket: part(), legs: [part(), part()], tail: part()};
}

// Steps a frame the way live.js will: take off last frame's offsets, (frame loop), re-pose.
function run(actor, q, seconds, dt = 1 / 60, each) {
  const states = [];
  for (let t = 0; t < seconds; t += dt) {
    clearActionPose(actor, q);
    states.push(updateActions(actor, q, dt));
    each?.(actor);
  }
  return states;
}

test('combat events split into attacker and defender actions', () => {
  const hit = actionsForCombat({attack: 'bite', result: 'hit', dir: [1, 0], attacker: {seen: true, x: 1, z: 1}, defender: {you: true, x: 2, z: 1}});
  assert.equal(hit.attacker.kind, 'attack');
  assert.equal(hit.attacker.attack, 'bite');
  assert.deepEqual(hit.defender, {kind: 'hit', dir: [1, 0], attack: 'bite', blow: null, style: 'bite', sprayed: false});
  const miss = actionsForCombat({attack: 'claw', result: 'miss', dir: [1, 1], attacker: {you: true}, defender: {seen: true, x: 3, z: 3}});
  assert.equal(miss.defender, null);
  assert.ok(Math.abs(Math.hypot(...miss.attacker.dir) - 1) < 1e-9);
  const unseen = actionsForCombat({attack: 'weapon', result: 'hit', dir: null, attacker: {seen: false}, defender: {you: true}});
  assert.equal(unseen.attacker, null);
  assert.equal(unseen.defender.kind, 'hit');
  assert.deepEqual(actionsForCombat(null), {attacker: null, defender: null});
});

test('every attack type and a hit play, stay finite and bounded, and return to rest', () => {
  for (const make of [hero, () => createCreature({name: 'jackal'}), () => createCreature({name: 'dwarf'})]) {
    for (const attack of ['claw', 'bite', 'weapon', 'kick', 'butt', 'sting', 'touch', 'engulf', 'other']) {
      const a = make(), q = createActionQueue();
      a.g.position.set(4, 0, 7); a.g.rotation.y = .3;
      const rest = snap(a);
      assert.ok(enqueueAction(q, {kind: 'attack', attack, result: 'hit', dir: [0, -1]}));
      assert.ok(enqueueAction(q, {kind: 'hit', dir: [1, 0]}));
      let peak = 0;
      const states = run(a, q, ACTION_TIME.attack + ACTION_TIME.hit + .2, 1 / 60, x => {
        for (const n of JSON.parse(snap(x)).flat()) assert.ok(n === null || Number.isFinite(n), attack);
        peak = Math.max(peak, Math.hypot(x.g.position.x - 4, x.g.position.z - 7));
      });
      assert.ok(states.includes('attack') && states.includes('hit'), attack);
      assert.equal(states.at(-1), 'idle');
      assert.ok(peak > .02 && peak < .45, `${attack} lunge ${peak}`);
      // Back at rest, except that the attacker now faces where it struck (−z).
      const end = JSON.parse(snap(a)), start = JSON.parse(rest);
      assert.ok(Math.abs(Math.cos(end[1][1]) - Math.cos(Math.PI)) < 1e-6, `${attack} faces target`);
      end[1][1] = start[1][1];
      assert.deepEqual(end, start, attack);
    }
  }
});

test('a frame that moves the actor mid-action does not snap it', () => {
  const a = hero(), q = createActionQueue();
  enqueueAction(q, {kind: 'attack', attack: 'weapon', result: 'miss', dir: [1, 0]});
  // Sampled finely, a continuous pose moves a little each step; a snap shows up as a jump.
  let prev = null, maxStep = 0;
  run(a, q, .6, 1 / 240, x => {
    // The frame loop glides toward a new tile the whole time, as live.js does.
    x.g.position.x += .0025;
    if (prev) maxStep = Math.max(maxStep, x.g.position.distanceTo(prev));
    prev = x.g.position.clone();
  });
  assert.ok(maxStep < .03, `largest per-frame step ${maxStep}`);
});

test('deaths hold their pose, block later actions and hold back the map', () => {
  const a = createCreature({name: 'newt'}), q = createActionQueue();
  enqueueAction(q, {kind: 'hit', dir: [0, 1]});
  enqueueAction(q, {kind: 'die', dir: [0, 1]});
  assert.equal(enqueueAction(q, {kind: 'attack', attack: 'bite', dir: [1, 0]}), false);
  const hold = holdBackMs([q, createActionQueue()]);
  assert.ok(hold > 0 && hold <= 1000, `hold ${hold}`);
  assert.ok(Math.abs(remainingTime(q) * 1000 - hold) <= 1);
  run(a, q, 1.5);
  assert.equal(actionState(q), 'die');
  assert.ok(q.finished);
  assert.equal(holdBackMs([q]), 0);
  assert.ok(Math.abs(a.g.rotation.z) > 1.2, 'toppled');
  // it lies on the floor (ground.js), not sunk through it
  a.g.updateMatrixWorld(true);
  const low = new THREE.Box3().setFromObject(a.g, true).min.y;
  assert.ok(low < .01 && low > -.08, `lies at ${low}`);
});

test('a backlog plays faster so the actor keeps up', () => {
  const q = createActionQueue(), a = hero();
  for (let i = 0; i < 5; i++) enqueueAction(q, {kind: 'attack', attack: 'claw', result: 'hit', dir: [1, 0]});
  const alone = 5 * ACTION_TIME.attack;
  assert.ok(remainingTime(q) < alone);
  const states = run(a, q, alone);
  assert.equal(states.at(-1), 'idle');
  assert.equal(enqueueAction(q, {kind: 'dance'}), false);
});

test('events find the right live actor, even one keyed by last frame\'s cell', () => {
  const jackal = {...hero(), species: 'jackal', target: new THREE.Vector3(2, 0, 0)};
  const newt = {...hero(), species: 'newt', target: new THREE.Vector3(3, 0, 1)};
  const actors = new Map([['12,10:5', jackal], ['13,11:9', newt]]), origin = {x: 10, z: 10};
  assert.equal(findActor(actors, 12, 10, {origin}), jackal);
  assert.equal(findActor(actors, 2, 10, {origin}), null, 'no prefix clash between 2,10 and 12,10');
  // The jackal stepped to 13,10 and bit before the next frame: nearest jackal, not the newt.
  assert.equal(findActor(actors, 13, 10, {name: 'jackal', origin}), jackal);
  assert.equal(findActor(actors, 13, 10, {name: 'newt', origin}), newt);
  assert.equal(findActor(actors, 20, 20, {origin}), null);
  jackal.actions = createActionQueue(); enqueueAction(jackal.actions, {kind: 'die'});
  assert.equal(findActor(actors, 12, 10, {name: 'jackal', origin}), null, 'a dying actor takes no new events');
});

test('live wiring: a fight plays on both sides, the death topples away from the blow and the map waits', () => {
  const you = hero(); you.actions = createActionQueue();
  const jackal = createCreature({name: 'jackal'});
  jackal.g.position.set(1, 0, 0); jackal.target = jackal.g.position.clone(); jackal.species = 'jackal';
  const actors = new Map([['11,10:3', jackal]]), origin = {x: 10, z: 10};
  const find = s => findActor(actors, s.x, s.z, {name: s.name, origin});
  const ev = (attacker, defender, result) => ({attack: 'weapon', result, blow: 'slash', attacker, defender,
    dir: [Math.sign(defender.x - attacker.x), Math.sign(defender.z - attacker.z)]});
  const h = {you: true, x: 10, z: 10}, j = {seen: true, x: 11, z: 10, name: 'jackal'};
  assert.equal(queueCombat(ev(j, h, 'miss'), {hero: you, find}), 1);
  assert.equal(queueCombat(ev(h, j, 'hit'), {hero: you, find}), 2);
  assert.ok(queueDeath({x: 11, z: 10, name: 'jackal'}, find));
  assert.deepEqual(jackal.actions.queue.map(a => a.kind), ['attack', 'hit', 'die']);
  assert.deepEqual(jackal.actions.queue[2].dir, [1, 0], 'dies away from the hero');
  const wait = holdBackMs([you.actions, jackal.actions]);
  assert.ok(wait > 700 && wait <= 1000, `hold ${wait}`); // three queued play at 2×
  // The live loop: clear, frame-loop rest pose, update. Sample until everything settles.
  let maxX = 0;
  for (let t = 0; t < 3; t += 1 / 60) {
    for (const a of [you, jackal]) {
      clearActionPose(a, a.actions);
      a.g.position.lerp(a.target ?? new THREE.Vector3(), .2);
      updateActions(a, a.actions, 1 / 60);
      for (const v of [...a.g.position.toArray(), ...a.g.rotation.toArray().slice(0, 3)]) assert.ok(Number.isFinite(v));
    }
    maxX = Math.max(maxX, jackal.g.position.x);
  }
  assert.ok(maxX > 1.1 && maxX < 1.35, `knocked back ${maxX}`);
  assert.equal(actionState(you.actions), 'idle');
  assert.ok(Math.abs(you.g.position.x) < 1e-6 && Math.abs(you.g.position.z) < 1e-6, 'hero back at rest');
  assert.ok(Math.abs(you.g.rotation.y - Math.PI / 2) < 1e-6, 'hero left facing the jackal');
  assert.ok(jackal.actions.finished && Math.abs(jackal.g.rotation.z) > 1.2);
  assert.equal(holdBackMs([you.actions, jackal.actions]), 0);
});

// The hero's arm chain as main.js builds it: with an elbow, weapon attacks play swing.js.
function knight() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const arm = new THREE.Group(); arm.position.set(.34, .92, 0); body.add(arm);
  const elbow = new THREE.Group(); elbow.position.set(0, -.25, 0); elbow.rotation.x = -.65; arm.add(elbow);
  const wrist = new THREE.Group(); wrist.position.set(0, -.25, 0); elbow.add(wrist);
  const weaponSocket = new THREE.Group(); weaponSocket.rotation.x = Math.PI / 4 + .65; wrist.add(weaponSocket);
  const shieldArm = new THREE.Group(); shieldArm.position.set(-.34, .91, 0); body.add(shieldArm);
  const legs = [new THREE.Group(), new THREE.Group()]; legs.forEach(l => g.add(l));
  return {g, body, arm, elbow, wrist, weaponSocket, shieldArm, legs};
}
const rigSnap = r => JSON.stringify([r.g.position.toArray(), r.g.rotation.toArray().slice(0, 3),
  ...['body', 'arm', 'elbow', 'wrist', 'weaponSocket', 'shieldArm'].flatMap(k => [r[k].rotation.toArray().slice(0, 3), r[k].position.toArray()])]
  .flat().map(n => +n.toFixed(6)));

test('hero weapon attacks play the swing arc with hitstop and a single contact, then rest', () => {
  for (const blow of ['slash', 'pierce', 'blunt', null]) for (const result of ['hit', 'miss']) {
    const r = knight(), q = createActionQueue();
    r.g.position.set(2, 0, 3);
    const rest = rigSnap(r);
    assert.ok(enqueueAction(q, {kind: 'attack', attack: 'weapon', blow, result, dir: [0, 1]}));
    let contacts = 0, trail = 0, maxArm = 0, held = 0, lastU = -1, t = 0;
    while (t < 1) {
      const dt = 1 / 120; t += dt;
      clearActionPose(r, q);
      // The frame loop's walk cycle sets absolute values underneath the offsets.
      r.legs.forEach(l => l.rotation.x = 0);
      const state = updateActions(r, q, dt);
      for (const n of JSON.parse(rigSnap(r))) assert.ok(Number.isFinite(n));
      if (q.swing) {
        contacts += q.swing.contact; trail += q.swing.trail;
        if (q.swing.u === lastU) held++;
        lastU = q.swing.u;
        maxArm = Math.max(maxArm, Math.abs(r.arm.rotation.x));
      }
      if (state === 'idle') break;
    }
    assert.equal(contacts, result === 'hit' ? 1 : 0, `${blow} ${result} contacts`);
    assert.ok(trail > 3, `${blow} trail frames ${trail}`);
    assert.ok(maxArm > 1, `${blow} arm ${maxArm}`);
    // 70 ms at 120 Hz holds about eight frames on a hit; a miss never stalls.
    assert.ok(result === 'hit' ? held >= 6 : held === 0, `${blow} ${result} held ${held}`);
    assert.ok(Math.abs(t - (result === 'hit' ? .57 : .5)) < .02, `${blow} ${result} length ${t}`);
    assert.equal(q.swing, null);
    assert.equal(rigSnap(r), rest, `${blow} ${result} back at rest`);
  }
});

test('a monster weapon attack keeps the generic arm wave, and swings count in hold-back time', () => {
  const d = createCreature({name: 'dwarf'}), q = createActionQueue();
  enqueueAction(q, {kind: 'attack', attack: 'weapon', blow: 'slash', result: 'hit', dir: [1, 0]});
  clearActionPose(d, q); updateActions(d, q, .01);
  assert.equal(q.current.swing, undefined);
  assert.equal(q.swing, null);
  const h = knight(), hq = createActionQueue();
  enqueueAction(hq, {kind: 'attack', attack: 'weapon', result: 'hit', dir: [1, 0]});
  enqueueAction(hq, {kind: 'die', dir: [1, 0]});
  clearActionPose(h, hq); updateActions(h, hq, .01);
  assert.ok(hq.current.swing);
  assert.ok(Math.abs(remainingTime(hq) - (.57 - .01 + ACTION_TIME.die)) < 1e-9);
});

test('deaths play their class style: length, squash, spin, fade and one particle burst, all undone', async () => {
  const {DEATH_TIME, applyFade, restoreFade, deathLook} = await import('./deaths.js');
  for (const [name, style] of [['ochre jelly', 'splat'], ['kobold zombie', 'crumble'], ['dust vortex', 'dissipate'],
    ['yellow light', 'burst'], ['jackal', 'topple']]) {
    const c = createCreature({name});
    c.g.userData.height = .7; // stageCreature sets this in the browser
    c.species = name; c.g.position.set(1, 0, 0); c.target = c.g.position.clone();
    const before = snap(c);
    const actors = new Map([['11,10:1', c]]);
    assert.ok(queueDeath({x: 11, z: 10, name}, s => findActor(actors, s.x, s.z, {origin: {x: 10, z: 10}})));
    const q = c.actions;
    assert.equal(q.queue[0].style, style, name);
    assert.ok(Math.abs(remainingTime(q) - DEATH_TIME[style]) < 1e-9, `${name} length`);
    assert.ok(holdBackMs([q]) === Math.ceil(DEATH_TIME[style] * 1000));
    let bursts = 0, lastFade = 1, t = 0;
    for (; t < DEATH_TIME[style] + .5; t += 1 / 60) {
      clearActionPose(c, q);
      updateActions(c, q, 1 / 60);
      if (q.deathBurst) { bursts++; q.deathBurst = null; }
      for (const v of [...c.g.position.toArray(), ...c.g.rotation.toArray().slice(0, 3), ...c.g.scale.toArray()])
        assert.ok(Number.isFinite(v), `${name} finite`);
      assert.ok(c.g.scale.y > .05 && c.g.scale.x < 3, `${name} scale ${c.g.scale.toArray()}`);
      assert.ok(q.fade <= lastFade + 1e-9, `${name} fade only falls`);
      lastFade = q.fade;
      applyFade(c, q.fade);
    }
    assert.equal(bursts, 1, `${name} bursts once`);
    assert.ok(q.finished);
    assert.equal(lastFade, style === 'topple' ? 1 : 0, `${name} ends ${style === 'topple' ? 'solid' : 'gone'}`);
    const look = deathLook(c);
    assert.ok(look.height > .1 && look.height < 3, `${name} height ${look.height}`);
    assert.ok(look.color && look.color.every(Number.isFinite), `${name} colour`);
    // Life saving / re-seen: the pose comes off exactly and the shared materials come back.
    clearActionPose(c, q); restoreFade(c);
    assert.equal(snap(c), before, `${name} back at rest`);
    assert.ok(!c.fadeSaved);
  }
});

test('hits play the reaction for their blow: its length, a distinct pose, then rest', async () => {
  const {HIT_TIME} = await import('./hit-fx.js');
  const cases = [['claw', null, 'cut'], ['weapon', 'pierce', 'stab'], ['kick', null, 'crush'], ['bite', null, 'bite'],
    ['hug', null, 'hug'], ['touch', null, 'jolt'], ['weapon', null, 'knock'], [undefined, null, 'knock']];
  const peaks = new Set();
  for (const [attack, blow, style] of cases) {
    const c = {attack, blow, result: 'hit', dir: [1, 0], attacker: {seen: true, name: 'jackal'}, defender: {seen: true, name: 'jackal'}};
    const {defender} = actionsForCombat(c);
    assert.equal(defender.style, style, `${attack}/${blow}`);
    assert.equal(defender.sprayed, false);
    const a = createCreature({name: 'jackal'});
    const rest = snap(a), q = createActionQueue();
    enqueueAction(q, defender);
    assert.ok(Math.abs(remainingTime(q) - HIT_TIME[style]) < 1e-9);
    let peak = '', most = 0;
    const states = run(a, q, HIT_TIME[style] + .1, 1 / 60, x => {
      const s = snap(x);
      for (const v of [x.g.position.x, x.g.position.y, x.g.rotation.x, x.g.rotation.z, x.g.scale.y]) assert.ok(Number.isFinite(v));
      assert.ok(Math.abs(x.g.position.x) < .25 && Math.abs(x.g.position.y) < .1);
      const m = Math.abs(x.g.position.x) + Math.abs(x.g.rotation.x) + Math.abs(x.g.rotation.y) + Math.abs(x.g.rotation.z) + Math.abs(x.g.scale.y - 1);
      if (m > most) { most = m; peak = s; }
    });
    assert.ok(states.includes('hit') && states.at(-1) === 'idle');
    assert.ok(most > .01, `${style} moves`);
    if (style !== 'knock') peaks.add(peak);
    clearActionPose(a, q);
    assert.equal(snap(a), rest, `${style} back at rest`);
  }
  assert.equal(peaks.size, 6);
  // The hero's weapon hits already spray from the swing; its kicks and a pet's bites don't.
  const mine = attack => actionsForCombat({attack, blow: 'slash', result: 'hit', dir: [0, 1], attacker: {you: true}, defender: {seen: true}}).defender.sprayed;
  assert.equal(mine('weapon'), true);
  assert.equal(mine('kick'), false);
});

test('a flinch waits for its blow: the prey jerks when the pounce lands, the jackal at the blade', async () => {
  const {contactTime, MAX_WAIT, STRIKE_U} = await import('./actions.js');
  const {createHitFx} = await import('./hit-fx.js');
  const {catLength} = await import('./cats.js');
  const {CONTACT_U, SWING_TIME} = await import('./swing.js');
  // One fight: attacker and defender stepped together the way live.js does, recording the time
  // the defender first leaves rest and the time the impact spray goes off.
  function fight(attacker, defender, c, you = null) {
    const actors = [attacker, defender];
    const find = s => s.name === attacker.species ? attacker : defender;
    assert.equal(queueCombat(c, {hero: you, find}), 2);
    const rest = snap(defender), fx = createHitFx(THREE, new THREE.Group());
    let moved = null, sprayed = null, t = 0;
    const spray = fx.burst.burst;
    fx.burst.burst = (...args) => { sprayed ??= t; return spray(...args); };
    for (; t < 2.5; t += 1 / 120) {
      for (const a of actors) { clearActionPose(a, a.actions); updateActions(a, a.actions, 1 / 120); }
      fx.update(actors, 1 / 120);
      for (const v of [defender.g.position.x, defender.g.rotation.y, defender.g.scale.y]) assert.ok(Number.isFinite(v));
      if (moved === null && snap(defender) !== rest) moved = t;
    }
    for (const a of actors) clearActionPose(a, a.actions);
    assert.equal(snap(defender), rest, 'defender back at rest');
    return {moved, sprayed, hit: defender.actions};
  }
  const pet = (name, x) => { const a = createCreature({name}); a.species = name; a.g.position.set(x, 0, 0); return a; };
  const side = (m, x) => ({seen: true, name: m.species, x, z: 0});

  // A kitten pounces on a rat: the rat holds still through the crouch and leap.
  const kitten = pet('kitten', 0), rat = pet('sewer rat', 1);
  const pounce = {attack: 'bite', result: 'hit', dir: [1, 0], attacker: side(kitten, 0), defender: side(rat, 1)};
  const lands = catLength('pounce', .75) * .58;
  const p = fight(kitten, rat, pounce);
  assert.equal(kitten.actions.current, null);
  assert.ok(Math.abs(p.moved - lands) < .03, `rat flinches at ${p.moved}, pounce lands at ${lands}`);
  assert.ok(Math.abs(p.sprayed - lands) < .03, `spray at ${p.sprayed}`);

  // A jackal bites a jackal: a short wait for the strike, not a pounce's.
  const j1 = pet('jackal', 0), j2 = pet('jackal', 1);
  j2.species = 'jackal2';
  const bite = {attack: 'bite', result: 'hit', dir: [1, 0], attacker: side(j1, 0), defender: side(j2, 1)};
  assert.ok(Math.abs(fight(j1, j2, bite).moved - ACTION_TIME.attack * STRIKE_U) < .03);

  // The hero's slash: the jackal flinches when the blade makes contact.
  const you = knight(), jackal = pet('jackal', 1);
  you.species = 'hero';
  const slash = {attack: 'weapon', blow: 'slash', result: 'hit', dir: [1, 0], attacker: {you: true}, defender: side(jackal, 1)};
  const s = fight(you, jackal, slash, you);
  assert.ok(Math.abs(s.moved - CONTACT_U.slash * SWING_TIME) < .03, `jackal flinches at ${s.moved}`);
  assert.equal(contactTime(you, {kind: 'attack', attack: 'weapon', blow: 'slash'}), CONTACT_U.slash * SWING_TIME);
  assert.equal(contactTime(null, {kind: 'hit'}), 0);

  // A defender already busy longer than the wind-up doesn't wait on top of that; an attacker
  // with a backlog pushes the flinch back, but never past MAX_WAIT.
  const busy = pet('jackal', 1), k2 = pet('kitten', 0);
  busy.species = 'newt';
  busy.actions = createActionQueue();
  enqueueAction(busy.actions, {kind: 'attack', attack: 'bite', result: 'miss', dir: [-1, 0]});
  enqueueAction(busy.actions, {kind: 'attack', attack: 'bite', result: 'miss', dir: [-1, 0]});
  queueCombat({...pounce, attacker: side(k2, 0), defender: side(busy, 1)}, {hero: null, find: x => x.name === 'kitten' ? k2 : busy});
  assert.equal(busy.actions.queue.at(-1).wait, undefined, 'busy longer than the pounce takes to land');
  const late = pet('kitten', 0), prey = pet('sewer rat', 1);
  late.actions = createActionQueue();
  for (let i = 0; i < 4; i++) enqueueAction(late.actions, {kind: 'attack', attack: 'claw', result: 'miss', dir: [1, 0]});
  queueCombat({...pounce, attacker: side(late, 0), defender: side(prey, 1)}, {hero: null, find: x => x.name === 'kitten' ? late : prey});
  const w = prey.actions.queue[0].wait;
  assert.ok(w > .3 && w <= MAX_WAIT + 1e-9, `capped wait ${w}`);
  // Unseen attackers and misses add nothing.
  const lone = pet('sewer rat', 1);
  queueCombat({attack: 'bite', result: 'hit', dir: [1, 0], attacker: {seen: false}, defender: side(lone, 1)}, {hero: null, find: () => lone});
  assert.equal(lone.actions.queue[0].wait, undefined);
});
