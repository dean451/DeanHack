// The fire elemental's clinker is crust grown into the flame, not black rocks set on it, and its heart fire shows
// through a crack, not as a white plate on the chest (review finding 2026-11-12).
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const fire = () => createCreature({name: 'fire elemental', symbol: 'E'.charCodeAt(0), color: 1});

test('the clinker plates are dark red char, never pure black, and lie flat in the surface', () => {
  const plates = [];
  fire().g.traverse(o => { if (o.userData.clinker) plates.push(o); });
  assert(plates.length >= 5, 'shoulders, chest and scalp are crusted');
  for (const p of plates) {
    const {color, emissive} = p.material;
    assert(color.r > color.g && color.r > color.b, 'reddish, not grey');
    assert(color.r > 0.005 && emissive.r > 0, 'not pure black: still faintly smouldering');
    const s = [p.scale.x, p.scale.y, p.scale.z];
    assert(Math.min(...s) / Math.max(...s) <= 0.35, 'a flat plate, not a lump');
  }
});

test('the heart fire is a narrow hot crack, not a white plate', () => {
  const {core} = fire();
  assert(core, 'the core is still there for the pulse');
  const {color} = core.material;
  assert(color.b < color.r * 0.5, 'hot orange-gold, not white');
  core.geometry.computeBoundingBox();
  const b = core.geometry.boundingBox;
  assert(b.max.z - b.min.z < 0.04, 'thin, set in the chest');
  assert(b.max.x - b.min.x < b.max.y - b.min.y, 'a tall crack, not a broad badge');
});
