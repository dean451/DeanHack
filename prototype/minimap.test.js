import test from 'node:test';
import assert from 'node:assert/strict';
import {cellStyle, drawMinimap, cellAtPixel, WIDTH, HEIGHT, SCALE} from './minimap.js';

const hero = {x: 10, z: 5};

test('the hero, monsters, pets and features each look different, and stairs differ by shape not just colour', () => {
  const marks = new Map();
  for (const [name, cell] of Object.entries({
    hero: {x: 10, z: 5, terrain: 'floor'},
    pet: {x: 1, z: 1, kind: 'pet', terrain: 'floor'},
    monster: {x: 2, z: 1, kind: 'monster', visible: true, terrain: 'floor'},
    trap: {x: 3, z: 1, trap: 'arrow trap', terrain: 'floor'},
    up: {x: 4, z: 1, terrain: 'up'}, down: {x: 5, z: 1, terrain: 'down'},
    door: {x: 6, z: 1, terrain: 'door'},
  })) marks.set(name, cellStyle(cell, hero).mark);
  assert.equal(marks.get('hero'), 'hero');
  assert.equal(marks.get('up'), 'up');
  assert.equal(marks.get('down'), 'down');
  assert.notEqual(marks.get('up'), marks.get('down'));
  assert.equal(marks.get('trap'), 'x');
  assert.equal(marks.get('door'), 'bar');
});

test('a remembered monster is not drawn (only ones in sight), unknown terrain draws nothing', () => {
  assert.equal(cellStyle({x: 1, z: 1, kind: 'monster', visible: false, terrain: 'floor'}, hero).mark, undefined);
  assert.equal(cellStyle({x: 1, z: 1, terrain: 'unknown'}, hero), null);
  assert.equal(cellStyle({x: 1, z: 1, terrain: 'unknown', object: {name: 'dagger'}}, hero).mark, 'dot');
});

test('lit floor is brighter than remembered floor and walls differ from both', () => {
  const lit = cellStyle({terrain: 'floor', visible: true}, hero).fill;
  const dark = cellStyle({terrain: 'floor', visible: false}, hero).fill;
  const wall = cellStyle({terrain: 'wall'}, hero).fill;
  assert.ok(new Set([lit, dark, wall]).size === 3);
});

test('drawMinimap draws each cell once inside the canvas and skips out-of-range cells', () => {
  const calls = [];
  const ctx = {clearRect() {}, fillRect: (...a) => calls.push(a), beginPath() {}, moveTo() {}, lineTo() {}, fill() {}, set fillStyle(v) {}};
  const frame = {player: {x: 10, z: 5}, cells: [
    {x: 1, z: 0, terrain: 'wall'}, {x: 80, z: 20, terrain: 'floor', visible: true},
    {x: 200, z: 3, terrain: 'wall'}, {x: 5, z: 99, terrain: 'wall'}, {x: 7, z: 7, terrain: 'unknown'}]};
  assert.equal(drawMinimap(ctx, frame), 2);
  assert.ok(calls.some(([x, y, w, h]) => x === 0 && y === 0 && w === SCALE && h === SCALE), 'cell (1,0) is the top-left square');
  assert.ok(calls.every(([x, y]) => x >= -1 && y >= -1 && x <= WIDTH && y <= HEIGHT));
  assert.equal(drawMinimap(ctx, null), 0, 'no frame, nothing drawn');
});

test('the square being aimed at gets a bracket, and only when it is on the map', () => {
  const strokes = [];
  const ctx = {clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, fill() {}, strokeRect: (...a) => strokes.push(a), set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {}};
  drawMinimap(ctx, {player: {x: 1, z: 1}, cells: []}, {x: 10, z: 5});
  assert.equal(strokes.length, 1);
  assert.deepEqual(strokes[0], [(10 - 1) * SCALE - 1.5, 5 * SCALE - 1.5, SCALE + 3, SCALE + 3]);
  drawMinimap(ctx, {player: {x: 1, z: 1}, cells: []}, {x: 200, z: 5});
  drawMinimap(ctx, {player: {x: 1, z: 1}, cells: []}, null);
  assert.equal(strokes.length, 1);
});

test('a click on the minimap names the map square under it, whatever size the canvas is shown at', () => {
  assert.deepEqual(cellAtPixel(0, 0), {x: 1, z: 0});
  assert.deepEqual(cellAtPixel(WIDTH - 1, HEIGHT - 1), {x: 80, z: 20});
  assert.deepEqual(cellAtPixel(SCALE * 9 + 1, SCALE * 5 + 1), {x: 10, z: 5});
  assert.deepEqual(cellAtPixel(240 / 2, 63 / 2, 240, 63), {x: 41, z: 10}, 'scaled canvas');
  assert.equal(cellAtPixel(-1, 5), null);
  assert.equal(cellAtPixel(WIDTH, 5), null);
});

test('pets and hostiles, water and lava differ in mark shape, not only colour', () => {
  const mark = (cell) => cellStyle(cell, hero).mark;
  assert.notEqual(mark({x: 1, z: 1, kind: 'pet', terrain: 'floor'}), mark({x: 2, z: 1, kind: 'monster', visible: true, terrain: 'floor'}));
  assert.ok(mark({x: 1, z: 1, terrain: 'water'}));
  assert.ok(mark({x: 1, z: 1, terrain: 'lava'}));
  assert.notEqual(mark({x: 1, z: 1, terrain: 'water'}), mark({x: 1, z: 1, terrain: 'lava'}));
});

test('each piece of furniture and the trees carry their own mark, so none relies on colour alone', () => {
  const marks = ['fountain', 'altar', 'throne', 'sink', 'grave', 'tree'].map(terrain => cellStyle({x: 1, z: 1, terrain}, hero).mark);
  assert.ok(marks.every(Boolean));
  assert.equal(new Set(marks).size, marks.length, 'six features, six different marks');
});

test('a hostile and a floor object no longer share a mark', () => {
  const hostile = cellStyle({x: 2, z: 1, kind: 'monster', visible: true, terrain: 'floor'}, hero);
  const object = cellStyle({x: 3, z: 1, terrain: 'unknown', object: {name: 'dagger'}}, hero);
  assert.equal(hostile.mark, 'slash');
  assert.notEqual(hostile.mark, object.mark);
});
