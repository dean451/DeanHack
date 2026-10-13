import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const part=(a,name,i)=>{const out=[];a.g.traverse(m=>{if(m.isMesh&&m.userData.part===name)out.push(m.geometry);});return out[i];};

test('the skeleton has lost fingers from its left hand and snapped its left fibula', () => {
  const s = createCreature({name: 'skeleton', symbol: 90, color: 7});
  // the open left hand has had its outer finger torn off and the next snapped: fewer vertices than the sword hand
  assert(part(s, 'arm', 0).attributes.position.count < 1300, 'maimed left hand');
  // past the tibia, the left leg has no fibula reaching the ankle; the right still does
  const shaft = (geo, side) => { const p = geo.attributes.position; let n = 0; for (let i = 0; i < p.count; i++) { const x = p.getX(i) * side, y = p.getY(i); if (x > 0.0175 && y < -0.4 && y > -0.41) n++; } return n; };
  assert.equal(shaft(part(s, 'leg', 0), -1), 0, 'left fibula snapped');
  assert(shaft(part(s, 'leg', 1), 1) > 0, 'right fibula whole');
});
