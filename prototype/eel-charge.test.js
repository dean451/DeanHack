import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {updateFidget} from './fidget.js';
import * as E from './eel-charge.js';

const dt = 1 / 60;
function eel(name) { const a = createCreature({name}); a.species = name; return a; }
const finite = o => o.geometry.attributes.position.array.every(Number.isFinite) && o.geometry.attributes.color.array.every(Number.isFinite);
const pose = a => {
  const head = a.body.children.find(c => !c.isMesh && c !== a.tail);
  return [a.body.rotation.y, a.body.rotation.z, a.body.position.x, a.tail.rotation.z, head.rotation.x, head.rotation.y];
};

test('only the eels glide', () => {
  for (const name of ['shark', 'piranha', 'cobra', 'jellyfish']) assert.equal(E.updateEelCharge(Object.assign(createCreature({name}), {species: name}), dt, 0, false), null, name);
  assert.ok(E.updateEelCharge(eel('giant eel'), dt, 0, false));
  const st = E.updateEelCharge(eel('electric eel'), dt, 0, false);
  assert.ok(st.head && st.glow && st.arcLines);
  assert.ok(!E.updateEelCharge(eel('giant eel'), dt, 0, false).glow, 'the giant eel has no electricity');
});

test('the spark spots still sit on the model\'s glow spheres', () => {
  const a = eel('electric eel'), found = [];
  for (const [obj, list] of [[a.body, E.FRONT_SPOTS], [a.tail, E.REAR_SPOTS]]) {
    const glow = obj.children.find(m => m.isMesh && m.material.emissiveIntensity === 2.4);
    assert.ok(glow, 'glow mesh');
    const p = glow.geometry.attributes.position, q = new THREE.Vector3();
    for (const s of list) {
      let best = Infinity;
      for (let i = 0; i < p.count; i++) best = Math.min(best, q.fromBufferAttribute(p, i).distanceTo(new THREE.Vector3(...s)));
      found.push(best);
    }
  }
  for (const d of found) assert.ok(d < .016, `spot ${d} from a glow sphere's skin`);
});

test('helpers stay in bounds', () => {
  for (let p = 0; p < 3; p += .01) for (const s of [0, .5, 1]) { const c = E.crest(p, s); assert.ok(c >= 0 && c <= 1, `${p} ${s}`); }
  // the crest reaches the head before the tail
  const first = s => { for (let p = 0; p < 1; p += .001) if (E.crest(p, s) > .99) return p; return 1; };
  assert.ok(first(0) < first(1));
  for (let u = 0; u <= 1.001; u += .01) { const b = E.bitePose(u); assert.ok(b.pitch >= -E.GAPE - 1e-9 && b.pitch <= E.LUNGE + 1e-9 && b.flare >= 0 && b.flare <= 1); }
  assert.deepEqual(E.bitePose(0), {pitch: 0, flare: 0});
  assert.ok(E.bitePose(.3).pitch < -.4 && E.bitePose(.5).pitch > .2 && E.bitePose(.4).flare > .9);
});

test('the electric eel weaves, pulses, crackles more near the hero, shocks on a bite, and rests after death', () => {
  for (const name of ['electric eel', 'giant eel']) {
    const a = eel(name), rest = pose(a);
    let t = 0, arcsFar = 0, arcsNear = 0, maxNear = 0, maxSway = 0, glowFar = 0, glowNear = 0, lastPose = pose(a);
    const run = (secs, look, act) => {
      for (let i = 0; i < secs * 60; i++) {
        t += dt;
        if (act) act(i);
        updateFidget(a, dt, t, !!a.actions?.current, look);
        const st = a.eelCharge, p = pose(a);
        assert.ok(p.every(Number.isFinite));
        p.forEach((v, k) => assert.ok(Math.abs(v - rest[k]) < 1.2, `${name} pose ${k} ${v}`));
        maxSway = Math.max(maxSway, Math.abs(p[0] - rest[0]));
        if (!a.actions?.current && t > dt * 1.5) p.forEach((v, k) => assert.ok(Math.abs(v - lastPose[k]) < .06, `${name} smooth ${k} ${v} ${lastPose[k]} ${t}`));
        lastPose = p;
        if (st.glow) {
          assert.ok(finite(st.glow) && finite(st.arcLines));
          const al = st.glow.geometry.attributes.color.array.filter((_, k) => k % 4 === 3);
          al.forEach(x => assert.ok(x >= 0 && x <= 1));
          if (look) { arcsNear += st.arcs.filter(r => r.age === dt || r.age < dt * 1.01).length; glowNear = Math.max(glowNear, ...al); }
          else { arcsFar += st.arcs.filter(r => r.age < dt * 1.01).length; glowFar = Math.max(glowFar, ...al); }
          for (const r of st.arcs) for (const q of r.pts || []) assert.ok(q.every(Number.isFinite) && Math.hypot(q[0], q[2]) < 1.3 && q[1] > -.2 && q[1] < 1);
        }
        maxNear = Math.max(maxNear, st.near);
      }
    };
    run(30, null);
    assert.ok(maxSway > E.BODY_SWAY * .8, `${name} weaves (${maxSway})`);
    a.g.position.set(0, 0, 0);
    run(30, {x: 1.5, z: 1.5});
    assert.ok(maxNear > .7, `${name} senses the hero`);
    if (name === 'electric eel') {
      assert.ok(arcsNear > arcsFar * 1.5 && arcsFar > 2, `crackles more near the hero (${arcsFar} far, ${arcsNear} near)`);
      assert.ok(glowNear > glowFar, `glows brighter near (${glowFar} → ${glowNear})`);
    }
    // a bite: the head gapes then lunges; the electric eel flares and throws arcs from its jaws
    const atk = {kind: 'attack'};
    let minPitch = 0, maxPitch = 0, flare = 0, jawArcs = 0;
    const head = a.eelCharge.head, hx0 = rest[4];
    for (let i = 0; i <= 40; i++) {
      a.actions = {current: atk, age: 1, u: i / 40, queue: [], dead: false};
      t += dt; updateFidget(a, dt, t, true, {x: 1.5, z: 1.5});
      minPitch = Math.min(minPitch, head.rotation.x - hx0); maxPitch = Math.max(maxPitch, head.rotation.x - hx0);
      flare = Math.max(flare, a.eelCharge.flare);
      jawArcs = Math.max(jawArcs, a.eelCharge.arcs.filter(r => r.to[2] > .6).length);
    }
    assert.ok(minPitch < -.35 && maxPitch > .2, `${name} gapes and lunges (${minPitch}, ${maxPitch})`);
    if (name === 'electric eel') assert.ok(flare > .9 && jawArcs >= 2, `shock bite (${flare}, ${jawArcs})`);
    // death: back to rest, no new arcs
    a.actions = {current: null, age: 0, u: 0, queue: [], dead: true};
    for (let i = 0; i < 60 * 6; i++) { t += dt; updateFidget(a, dt, t, false, {x: 1.5, z: 1.5}); }
    const end = pose(a);
    end.forEach((v, k) => assert.ok(Math.abs(v - rest[k]) < 1e-6, `${name} rest ${k}: ${v} vs ${rest[k]}`));
    if (a.eelCharge.arcs) assert.equal(a.eelCharge.arcs.length, 0);
  }
});
