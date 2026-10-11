import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// The engine's configure picks /usr/bin/bzip2 to compress saves (engine/build.py logs it). The
// production image must ship it: without the compressor, saving leaves a broken .bz2 next to the
// real save and the next start deletes the real one, so every "resume" became a new game.
test('the runtime image installs the save compressor the engine was built with',()=>{
  const docker=readFileSync(new URL('../Dockerfile',import.meta.url),'utf8');
  const stages=docker.split(/^FROM /m);
  const runtime=stages[stages.length-1];
  const apt=runtime.match(/apt-get install[^\n]*(?:\\\n[^\n]*)*/);
  assert.ok(apt,'the runtime stage installs packages');
  assert.match(apt[0],/\bbzip2\b/,'bzip2 is installed in the runtime stage, not only the build stage');
});
