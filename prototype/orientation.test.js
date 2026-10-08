import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DIRECTIONS, FORWARD, stepOfYaw, wallYaw, yawToward} from './orientation.js';

const close = (a, b) => assert(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);

test('compass directions give the documented yaws', () => {
  close(yawToward(0, 1), 0);
  close(yawToward(1, 0), Math.PI / 2);
  close(yawToward(-1, 0), -Math.PI / 2);
  close(Math.abs(yawToward(0, -1)), Math.PI);
  close(yawToward(1, 1), Math.PI / 4);
});

test('forward at yaw 0 is +z, and stepOfYaw inverts yawToward for every move key', () => {
  assert.deepEqual(FORWARD, {x: 0, z: 1});
  for (const [dx, dz] of Object.values(DIRECTIONS)) {
    const s = stepOfYaw(yawToward(dx, dz)), n = Math.hypot(dx, dz);
    close(s.x, dx / n); close(s.z, dz / n);
  }
});

test('a zero step keeps the fallback facing', () => {
  assert.equal(yawToward(0, 0, 1.25), 1.25);
});

test('wall models run along the heavier wall axis', () => {
  assert.equal(wallYaw(2, 0), 0);
  assert.equal(wallYaw(0, 2), Math.PI / 2);
  assert.equal(wallYaw(1, 1), null);
  assert.equal(wallYaw(0, 0), null);
});

test('the convention is documented', () => {
  const doc = readFileSync(new URL('./ORIENTATION.md', import.meta.url), 'utf8');
  for (const word of ['atan2(dx, dz)', 'wallYaw', 'yawToward', 'HELD_TURN']) assert(doc.includes(word), word);
});
