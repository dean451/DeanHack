import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCreature} from './creatures.js';
import {createValkyrie} from './valkyrie.js';
import {createHeroForm, FORM_FOOTPRINT, FORM_HEIGHT} from './hero-form.js';

const fit = g => { const s = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()); return s; };

test('a polymorphed hero shows the species model in place of the Valkyrie, and gets her back', () => {
  for (const name of ['red dragon', 'chromatic dragon', 'newt']) {
    const hero = createValkyrie();
    const parts = [...hero.g.children];
    const form = createHeroForm(hero, createCreature);
    assert.equal(form.sync(''), false, 'normal form changes nothing');
    assert.equal(form.sync(name), true);
    assert.ok(form.shape && hero.g.children.includes(form.shape), `${name} model stands in`);
    assert.ok(parts.every(p => !p.visible), 'the Valkyrie and her weapon are hidden');
    const size = fit(form.shape);
    assert.ok(Math.max(size.x, size.z) <= FORM_FOOTPRINT + 1e-6, `${name} keeps her tile`);
    assert.ok(size.y <= FORM_HEIGHT + 1e-6);
    assert.equal(form.sync(name), false, 'same form is not rebuilt');
    assert.equal(form.sync(undefined), true);
    assert.equal(form.shape, null);
    assert.ok(parts.every(p => p.visible), 'the Valkyrie returns');
    assert.equal(hero.g.children.length, parts.length);
  }
});

test('a form that cannot be built leaves the Valkyrie alone', () => {
  const hero = createValkyrie();
  const form = createHeroForm(hero, () => { throw new Error('no model'); });
  form.sync('mystery');
  assert.equal(form.current, '');
  assert.ok(hero.g.children.every(c => c.visible));
});
