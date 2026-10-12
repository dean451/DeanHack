import test from 'node:test';
import assert from 'node:assert/strict';
import {DIM_COLOR,DIM_OPACITY,dimKeep,dimSpread} from './remembered.js';

test('remembered tiles are dim: most of the tile hue is covered',()=>{
 assert.ok(DIM_OPACITY>=.7&&DIM_OPACITY<=.85);
 assert.ok(dimKeep()<.3);
});
test('the fog is near neutral so it desaturates, and stays dark',()=>{
 assert.ok(dimSpread(DIM_COLOR)<=.08,'fog colour is almost grey');
 assert.ok(((DIM_COLOR>>16)&255)<48);
});
