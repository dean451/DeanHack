import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBagExplosion, bagBlast, holePose, BAG} from './bag-explosion.js';
import {liveSource} from './live-source.js';

test('the engine\'s bag of holding blast starts it; other explosions do not', () => {
  assert.ok(bagBlast('As you put a wand of cancellation inside, you are blasted by a magical explosion!'));
  assert.ok(bagBlast('As you put a bag of holding inside, you are blasted by a magical explosion!'));
  assert.ok(!bagBlast('You are caught in a magical explosion!'), 'a magic trap is another thing');
  assert.ok(!bagBlast('The wand explodes!'));
});

test('the hole swells, collapses to a point and releases a shockwave, then is gone', () => {
  const swell = holePose(BAG.inhale * .8), point = holePose(BAG.inhale + BAG.collapse * .5), out = holePose(BAG.inhale + BAG.collapse + BAG.release * .5);
  assert.ok(swell.core > .3 && swell.motes < 1 && swell.wave === 0, 'swelling: a dark core, motes falling in');
  assert.ok(point.flash > .9 && point.core < swell.core, 'collapsing: the core shrinks to a white pinprick');
  assert.ok(out.wave > 1 && out.motes > 1 && out.core === 0, 'release: the wave races out and the motes are thrown wide');
  assert.equal(holePose(BAG.inhale + BAG.collapse + BAG.release + .01), null);
});

test('it plays on the hero\'s square and cleans up after itself', () => {
  const group = new THREE.Group(), blast = createBagExplosion(THREE, group);
  assert.equal(blast.message('You hear a door open.', 0, 0), null);
  const g = blast.message('As you put a bag of holding inside, you are blasted by a magical explosion!', 3, -2);
  assert.ok(g && g.position.x === 3 && g.position.z === -2 && group.children.includes(g));
  for (let i = 0; i < 60; i++) blast.update(.05);
  assert.equal(blast.active, 0);assert.equal(group.children.length, 0);
});

test('live.js starts it from the message, runs it each frame and clears it with the level', () => {
  const src = liveSource();
  assert.match(src, /bagExplosion\.message\(text,S\.latest\.player\.x-S\.origin\.x,S\.latest\.player\.z-S\.origin\.z\)/);
  assert.match(src, /bagExplosion\.update\(dt\)/);assert.match(src, /bagExplosion\.clear\(\)/);
});
