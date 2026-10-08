import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildFace, faceMaterials, faceSurface} from './hero-face.js';

test('the face has a brow ridge over deep eye sockets, cheekbones and a tapered chin', () => {
  const at = (x, y) => { // surface z at lateral x, height y, found by marching a ray forward
    let best = null;
    for (let dz = 0; dz <= 1; dz += .002) {
      const dx0 = x / .158, dy0 = y / .205;
      const rest = 1 - dx0 * dx0 - dy0 * dy0; if (rest < 0) return null;
      if (Math.abs(Math.sqrt(rest) - dz) < .004) { best = faceSurface(dx0, dy0, dz); break; }
    }
    return best;
  };
  const brow = at(.07, .058), socket = at(.067, .016), cheek = at(.108, -.034), chin = at(0, -.18);
  assert(brow && socket && cheek && chin);
  assert(brow.z > socket.z + .02, 'the brow juts out past the eye socket');
  assert(socket.shade < -.3, 'the socket is shadowed');
  assert(cheek.shade > .05, 'the cheekbone catches light');
  assert(Math.abs(faceSurface(.9, -.35, .2).x) < .158 * .9, 'the jaw is narrower than the cranium');
});

test('the face is built from a few cheap meshes inside the head bounds', () => {
  const head = new THREE.Group();
  buildFace(head, faceMaterials());
  let meshes = 0; head.traverse(o => { if (o.isMesh) meshes++; });
  assert(meshes <= 20, `${meshes} meshes`);
  const box = new THREE.Box3().setFromObject(head), size = box.getSize(new THREE.Vector3());
  assert(size.x > .28 && size.x < .4 && size.y > .35 && size.y < .46 && size.z > .3 && size.z < .42, JSON.stringify(size));
  const skull = head.getObjectByName('HeroSkull');
  assert(skull.geometry.attributes.color, 'features are painted in vertex colour');
  assert(skull.material.flatShading, 'faceted, not a smooth ball');
});
