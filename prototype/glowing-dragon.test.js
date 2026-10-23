import test from 'node:test';
import assert from 'node:assert/strict';

test('the glowing dragon glows from inside its scales, identified or not; a brown dragon does not', async () => {
  const {createCreature} = await import('./creatures.js');
  const glowOf = model => { let hide = 0, belly = 0, lava = false; model.traverse(o => { const m = o.material; if (!m || !o.isMesh) return;
    if (m.emissiveMap && m.emissiveIntensity >= 1) hide++; if (m.emissive && m.emissive.getHex() === 0xffb048) belly++; }); return {hide, belly, element: model.userData?.element ?? model.element}; };
  for (const color of [3, 13]) {
    const a = createCreature({name: 'glowing dragon', symbol: 68, color});
    const g = glowOf(a.g || a);
    assert(g.hide > 0, `color ${color}: the hide is lit through its scale map`);
    assert(g.belly > 0, `color ${color}: the belly burns`);
    assert.equal((a.element ?? a.g?.userData?.element), 'lava', `color ${color}: lava veins and spikes`);
  }
  const plain = createCreature({name: 'red dragon', symbol: 68, color: 3});
  assert.equal(glowOf(plain.g || plain).hide, 0, 'an unidentified (brown) dragon gives nothing away');
});
