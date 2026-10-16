// The ambient-occlusion pass: three's GTAOPass (ground-truth AO: a horizon sampler with a
// depth- and normal-aware denoiser) with one change. GTAOPass builds its depth and normal
// buffer from every mesh and sprite, see-through ones included, so a torch's halo sprite
// became a hard black card in front of the wall. Here sprites, see-through and
// non-depth-writing meshes sit the pass out along with the points and lines GTAOPass already
// skips: they never occlude.
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';

// Tuned for a dungeon whose tile is one unit: radius in world units; the denoiser keeps the
// floors smooth instead of speckled.
export const AO_PARAMS = {radius: .35, distanceExponent: 1, thickness: 1, distanceFallOff: 1, scale: 1.4, samples: 16, screenSpaceRadius: false};
export const DENOISE_PARAMS = {lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 16};

// True for an object that should not write into the occlusion pass's depth and normals.
export const sitsOut = o => !!(o.visible && (o.isPoints || o.isLine || o.isLine2 || o.isSprite || (o.isMesh && o.material && !Array.isArray(o.material) && (o.material.transparent || o.material.depthWrite === false))));

export class DungeonAOPass extends GTAOPass {
  constructor(scene, camera, width, height) {
    super(scene, camera, width, height, undefined, AO_PARAMS, DENOISE_PARAMS);
    this.blendIntensity = 1;
  }
  _overrideVisibility() {
    const cache = this._visibilityCache;
    this.scene.traverse(o => { if (sitsOut(o)) { o.visible = false; cache.push(o); } });
  }
}
