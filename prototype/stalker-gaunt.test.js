// Review finding 2026-11-11: the stalker read as a translucent bubble man. Its body, skull, shoulders and fists are
// now faceted and opaque, its eyes black pits; the air elemental (same builder) stays as it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const build = name => createCreature({name, symbol: 69, color: 7});
const meshes = o => { const m = []; o.traverse(x => { if (x.isMesh) m.push(x); }); return m; };

test('no smooth sphere and nothing see-through on the stalker\'s head, trunk or arms', () => {
  const s = build('stalker');
  const spots = [s.head, s.joints.lfore, s.joints.rfore, ...s.body.children.filter(c => c.isMesh)];
  for (const spot of spots) for (const m of meshes(spot)) {
    assert.notEqual(m.geometry.type, 'SphereGeometry', 'a smooth sphere on the stalker');
    assert(!m.material.transparent, 'a see-through piece on the stalker');
  }
});

test('the stalker\'s eyes are dark pits and its hide holds several tones', () => {
  const s = build('stalker');
  const lum = c => .2126 * c.r + .7152 * c.g + .0722 * c.b;
  const head = meshes(s.head);
  assert(head.every(m => !(m.material.emissiveIntensity > .5 && lum(m.material.emissive) > .3)), 'no glowing eyes, only pits');
  assert(head.some(m => lum(m.material.color) < .02), 'black sockets');
  const tones = new Set(meshes(s.g).map(m => m.material.color.getHexString()));
  assert(tones.size >= 5, 'dark recesses, a mid hide, pale ridges, bone, claw and fang');
});

test('the air elemental keeps its see-through gale', () => {
  const a = build('air elemental');
  assert(meshes(a.head).some(m => m.material.transparent));
});
