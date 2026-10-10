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
