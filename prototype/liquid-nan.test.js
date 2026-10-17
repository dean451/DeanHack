import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiquid} from './liquid.js';

// pow() of a negative base is NaN on the GPU, and the bloom pass turns NaN pixels into big black
// holes. Every pow() in the lava and water shaders must have a base that can't go below zero.
test('the lava and water shaders never take pow() of a base that can go negative', () => {
  for (const kind of ['lava', 'water']) {
    const g = createLiquid(kind, 3);
    let material = null;
    g.traverse(o => { if (o.material?.onBeforeCompile && o.material.name === `${kind} surface`) material = o.material; });
    assert(material, kind);
    const shader = {uniforms: {}, vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <emissivemap_fragment>'};
    material.onBeforeCompile(shader);
    const pows = shader.fragmentShader.match(/pow\([^,]*/g) || [];
    assert(pows.length > 0, `${kind} uses pow`);
    for (const p of pows) assert(/^pow\(max\(/.test(p), `${kind}: unguarded ${p}`);
  }
});

test('lava is the water\'s red-hot twin: caustic lines on a glowing body, no black crust or raft', async () => {
  const {createLiquid} = await import('./liquid.js');
  const src = (await import('node:fs')).readFileSync(new URL('./liquid.js', import.meta.url), 'utf8');
  const lava = src.slice(src.indexOf('const lava=`'), src.indexOf('`;', src.indexOf('const lava=`')));
  assert.match(lava, /lqLines=pow\(max\(0\.,1\.-abs\(lqCaustic\*2\.-1\.\)\)/, 'the same caustic lines as water');
  assert.doesNotMatch(lava, /diffuseColor\.rgb\*=/, 'no dark crust plates');
  // the dimmest the lava ever glows (a fleck) is still ember red, not black
  const fleck = /vec3\(\.12,\.014,\.002\)/.test(lava);
  assert(fleck, 'flecks are dim ember red');
  const g = createLiquid('lava', 3);
  let meshes = 0; g.traverse(o => { if (o.isMesh) meshes++; });
  assert.equal(meshes, 3, 'bed, surface and bubble: no basalt raft floats on top');
  g.userData.dispose();
});
