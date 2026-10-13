import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const arm = (a, i) => { const out = []; a.g.traverse(m => { if (m.isMesh && m.userData.part === 'arm') out.push(m.geometry); }); return out[i].attributes.position.count; };

test('the weeping angel\'s right little finger is broken off to a pointless stub', () => {
  for (const name of ['weeping angel', 'weeping archangel']) {
    const a = createCreature({name, symbol: 65, color: 7});
    assert(arm(a, 1) < arm(a, 0), name + ': right hand has lost its fingertip');
  }
});
