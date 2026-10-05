import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {digMessage, chipFlight, createDigChips, DIG_LOOKS, MAX_BURSTS, CHIPS} from './dig-chips.js';

test('dig messages give a kind, others do not', () => {
  assert.equal(digMessage('You hit the rock with all your might.'), 'blow');
  assert.equal(digMessage('You dig a pit in the floor.'), 'pit');
  assert.equal(digMessage('You dig a hole through the floor.'), 'hole');
  assert.equal(digMessage('You succeed in cutting away some rock.'), 'breach');
  assert.equal(digMessage('You make an opening in the wall.'), 'breach');
  for (const t of ['You hit the newt.', 'You dig a pit', null, 4]) assert.equal(digMessage(t), null, String(t));
});

test('chips stay in bounds, stay above the floor and are gone when the burst ends', () => {
  for (const kind of Object.keys(DIG_LOOKS)) {
    const look = DIG_LOOKS[kind];
    for (let i = 0; i < look.chips; i++) {
      for (let t = 0; t < look.life; t += .02) {
        const c = chipFlight(kind, 3, i, t);
        assert.ok(c.y >= .029 && c.y < 1.5, `${kind} ${i} y ${c.y}`);
        assert.ok(Math.hypot(c.x, c.z) < 1, `${kind} ${i} reach`);
        assert.ok(c.alpha >= 0 && c.alpha <= 1);
      }
      assert.equal(chipFlight(kind, 3, i, look.life), null);
    }
    assert.equal(chipFlight(kind, 3, look.chips, 0), null);
    assert.equal(chipFlight(kind, 3, 0, -1), null);
  }
});

test('bursts are capped, expire and clear back to nothing', () => {
  const parent = new THREE.Group(), dig = createDigChips(THREE, parent);
  assert.equal(dig.message('You hit the newt.', 1, 1), null);
  for (let i = 0; i < MAX_BURSTS + 3; i++) dig.message('You dig a hole through the floor.', i, 0);
  const s = dig.update(.016);
  assert.equal(s.bursts, MAX_BURSTS);
  assert.ok(s.chips > 0 && s.chips <= MAX_BURSTS * CHIPS);
  for (let i = 0; i < 40; i++) dig.update(.1);
  assert.equal(dig.update(.1).bursts, 0);
  assert.equal(dig.update(0).chips, 0);
  assert.equal(parent.children.filter(o => o.isMesh).length, 0, 'dust rings removed');
  dig.message('You dig a pit in the floor.', 0, 0);
  dig.clear();
  assert.equal(dig.update(0).bursts, 0);
  dig.dispose();
});
