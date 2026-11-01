// The see-through shaders a death needs, compiled before the death. A dying creature fades out (deaths.js applyFade)
// and an invisible hero hazes (ghosting.js); both give each piece a transparent copy of its material, and three
// builds a different shader for a transparent material. So the first death of each kind of creature compiled a
// batch of new shaders on the spot, as it died: a skinned cat with fur and an ink outline froze a player's game
// for seconds, mid-fight. Here, when a creature first appears, a stand-in for each of its pieces is compiled in the
// background with that same transparent copy (renderer.compileAsync), and the copy is kept: while it lives, three
// keeps its shader, and the fade's own copy, identical in every setting a shader depends on, reuses it.
import * as THREE from 'three';

// The copy applyFade and ghosting make: keep these two in step with them.
export const fadeTwin = m => { const c = m.clone();c.transparent = true;return c; };

export function createFadePrewarm() {
  const twins = new WeakMap(); // a piece's material -> its kept see-through copy
  return {
    // Stand-ins for every piece under `roots` whose material has no copy yet, in a group to hand to compileAsync,
    // or null when there is nothing new. The stand-ins share the pieces' geometry (and skeleton); throw them away after.
    stage(roots) {
      const group = new THREE.Group();
      for (const root of roots) root?.traverse(o => {
        if (!o.isMesh || o.isInstancedMesh || o.isBatchedMesh || !o.material || Array.isArray(o.material) || o.userData.keepOpaque || twins.has(o.material)) return;
        const twin = fadeTwin(o.material);twins.set(o.material, twin);
        let s;
        if (o.isSkinnedMesh) { s = new THREE.SkinnedMesh(o.geometry, twin);s.bindMode = o.bindMode;s.bind(o.skeleton, o.bindMatrix); }
        else s = new THREE.Mesh(o.geometry, twin);
        s.castShadow = o.castShadow;s.receiveShadow = o.receiveShadow;
        group.add(s);
      });
      return group.children.length ? group : null;
    },
    has: m => twins.has(m),
  };
}
