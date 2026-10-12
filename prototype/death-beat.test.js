import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDeathBeat, deathBeatMs, epitaph, EPITAPHS, DEATH_PAUSE_MS} from './death-beat.js';
import {DEATH_TIME} from './deaths.js';
import {createActionQueue, enqueueAction, updateActions, clearActionPose} from './actions.js';
import {createCreature} from './creatures.js';

test('the beat is the fall, then a pause on the body', () => {
  assert.equal(deathBeatMs('topple'), DEATH_TIME.topple * 1000 + DEATH_PAUSE_MS);
  assert.equal(deathBeatMs('nonsense'), deathBeatMs('topple'), 'unknown styles topple');
  const b = createDeathBeat();
  assert.equal(b.remainingMs(0), 0, 'nothing to wait for before a death');
  assert.equal(b.begin(1000), true);
  assert.equal(b.begin(1500), false, 'one death per game');
  assert.equal(b.remainingMs(1000), deathBeatMs('topple'));
  assert.equal(b.remainingMs(1000 + deathBeatMs('topple') + 5), 0);
  assert.equal(b.active, true);
  b.clear();
  assert.equal(b.active, false);
  assert.equal(b.remainingMs(5000), 0);
});

test('the bones are laid once, when the fall has finished', () => {
  const b = createDeathBeat();
  assert.equal(b.corpseDue(true), false, 'no death, no corpse');
  b.begin(0);
  assert.equal(b.corpseDue(false), false, 'still falling');
  assert.equal(b.corpseDue(true), true);
  assert.equal(b.corpseDue(true), false, 'only once');
});

test('the hero\'s own action queue plays the fall and holds the last pose', () => {
  const hero = createCreature({name: 'human'}), q = createActionQueue();
  assert.equal(enqueueAction(q, {kind: 'die', dir: null, style: 'topple'}), true);
  assert.equal(q.dead, true);
  for (let i = 0; i < 40; i++) { clearActionPose(hero, q); updateActions(hero, q, .05); }
  assert.equal(q.finished, true);
  assert.equal(enqueueAction(q, {kind: 'attack', attack: 'weapon', result: 'hit', dir: [1, 0]}), false, 'the dead take no more actions');
});

test('an epitaph is fixed for a name and cause, and some causes earn their own line', () => {
  const a = epitaph({name: 'Mira', killer: 'killed by a jackal'});
  assert.ok(EPITAPHS.includes(a));
  assert.equal(epitaph({name: 'Mira', killer: 'killed by a jackal'}), a);
  assert.equal(epitaph({name: 'Mira', killer: 'died of starvation'}), 'Ate well. Slept badly. Died quickly.');
  assert.equal(epitaph({name: 'Mira', killer: 'killed by Asidonhopo, the shopkeeper'}), 'Still owes the shopkeeper.');
  assert.equal(epitaph({name: 'Mira', killer: 'fell into a pit'}), 'The stairs went down. So did the hero.');
  assert.equal(epitaph(null), '');
  for (const e of EPITAPHS) assert.doesNotMatch(e, /\b(he|she|his|her)\b/i, 'no gendered line');
});

test('the live game falls on the tombstone, lays bones, and waits before the splash', () => {
  const live = readFileSync(new URL('./live.js', import.meta.url), 'utf8');
  assert.match(live, /v\.type==='tombstone'\)\{lastDeath=v;.*enqueueAction\(hero\.actions,\{kind:'die'/, 'the tombstone drops the hero');
  assert.match(live, /deathBeat\.corpseDue\(hero\.actions\.finished\)/, 'bones once the fall is done');
  assert.match(live, /deathBeat\.remainingMs\(performance\.now\(\)\)/, 'the splash waits on the beat');
  assert.match(live, /deathBeat\.clear\(\)/, 'a new game forgets the old death');
});
