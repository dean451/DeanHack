import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {PSI, psiPressure, updatePsionicScreen, updateFlayerPsi, isFlayer} from './psionic.js';
import {liveSource} from './live-source.js';

const at = (x, z) => new THREE.Vector3(x, 0, z);
const flayer = (x, z, dead = false) => ({species: 'mind flayer', target: at(x, z), actions: dead ? {dead: true} : null});

test('the pressure comes from the nearest living mind flayer: full close by, none past range, never from the dead or anything else', () => {
  const hero = at(0, 0);
  assert.equal(psiPressure(hero, []), 0);
  assert.equal(psiPressure(hero, [flayer(1, 0)]), 1);
  assert.equal(psiPressure(hero, [flayer(PSI.range + .5, 0)]), 0);
  const mid = psiPressure(hero, [flayer(3.5, 0)]);
  assert.ok(mid > 0 && mid < 1, `${mid}`);
  assert.ok(psiPressure(hero, [flayer(5, 0), flayer(2, 0)]) > psiPressure(hero, [flayer(5, 0)]), 'the nearer one sets it');
  assert.equal(psiPressure(hero, [flayer(1, 0, true)]), 0, 'a dead flayer presses on nothing');
  assert.equal(psiPressure(hero, [{species: 'jackal', target: at(1, 0)}]), 0);
  assert.ok(isFlayer({species: 'master mind flayer'}));
});

test('the screen eases in and out and is off at rest', () => {
  const el = {style: {props: {}, setProperty(k, v) { this.props[k] = v; }}, classList: {on: new Set(), toggle(c, b) { b ? this.on.add(c) : this.on.delete(c); }}};
  const st = {};
  let v = updatePsionicScreen(el, st, 1, 1 / 60);
  assert.ok(v > 0 && v < .2, 'eases in');
  for (let i = 0; i < 300; i++) v = updatePsionicScreen(el, st, 1, 1 / 60);
  assert.ok(v > .99 && el.classList.on.has('psionic-on'));
  for (let i = 0; i < 600; i++) v = updatePsionicScreen(el, st, 0, 1 / 60);
  assert.equal(v, 0); assert.ok(!el.classList.on.has('psionic-on')); assert.equal(el.style.props['--psi'], '0.000');
});

test('every mind flayer pulses faint additive rings off its cranium that die away when it dies; other creatures get none', () => {
  for (const name of ['mind flayer', 'master mind flayer']) {
    const a = createCreature({name, symbol: 'h'.charCodeAt(0)}); a.species = name;
    let before = 0; a.g.traverse(o => { if (o.isMesh) before++; });
    const st = updateFlayerPsi(a, 1 / 60, 0);
    assert.equal(st.rings.length, PSI.rings);
    assert.ok(st.rings.every(m => m.material.blending === THREE.AdditiveBlending && !m.material.depthWrite), 'additive');
    let p = st.group.parent; while (p && p !== a.head) p = p.parent; assert.ok(p === a.head, 'they ride the head');
    let seen = 0;
    for (let t = 0; t < PSI.period * 2; t += 1 / 30) { updateFlayerPsi(a, 1 / 30, t); seen = Math.max(seen, ...st.rings.map(m => m.visible ? m.material.opacity : 0)); }
    assert.ok(seen > PSI.opacity * .5, `the rings show (${seen})`);
    a.actions = {dead: true};
    for (let t = 0; t < 4; t += 1 / 30) updateFlayerPsi(a, 1 / 30, 10 + t);
    assert.ok(st.rings.every(m => m.material.opacity < .02), 'faded on death');
  }
  const j = createCreature({name: 'jackal'}); j.species = 'jackal';
  assert.equal(updateFlayerPsi(j, 1 / 60, 0), null); assert.equal(j.flayerPsi, undefined);
});

test('live.js drives the ripples on every actor and the pressure once a frame', () => {
  const src = liveSource();
  assert.ok(src.includes("from './psionic.js'"));
  assert.ok(/updateFlayerPsi\(a,dt,t\)/.test(src));
  assert.ok(/updatePsionicScreen\(el,psiState,psiPressure\(hero\.g\.position,actors\.values\(\)\),dt\)/.test(src));
  assert.ok(readFileSync(new URL('./style.css', import.meta.url), 'utf8').includes('#psionic.psionic-on'));
});
