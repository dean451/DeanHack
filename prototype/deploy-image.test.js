import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';

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

test('testers.sh turns an email list into logins and keeps the list out of git', () => {
  const sh = readFileSync(new URL('../deploy/users/testers.sh', import.meta.url), 'utf8');
  assert.match(sh, /caddy hash-password --plaintext "\$email"/, 'the email is the password');
  assert.match(sh, /tr 'A-Z' 'a-z'/, 'lower-cased so what friends type matches');
  assert.match(sh, /\^\[A-Za-z0-9_\.@-\]\{1,64\}\$/, 'only names Caddy and the engine accept');
  assert.match(sh, /testers\.caddy/);
  const ignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');
  assert.match(ignore, /^\/deploy\/users\/\*\.caddy$/m);
  assert.match(ignore, /^\/deploy\/users\/testers\.txt$/m);
  assert.ok((statSync(new URL('../deploy/users/testers.sh', import.meta.url)).mode & 0o111) !== 0, 'executable');
});
