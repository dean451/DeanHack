import test from 'node:test';
import assert from 'node:assert/strict';
import {smokeFailures} from './smoke-checks.js';

const good={splash:{dragon:true,waves:true},demo:{canvas:true,frames:30,moved:true},errors:[]};

test('a healthy report has no failures', () => assert.deepEqual(smokeFailures(good), []));
test('an unmounted canvas fails', () => {
 assert.deepEqual(smokeFailures({...good,demo:{...good.demo,canvas:false}}), ['demo: no canvas is mounted']);
});
test('a renderer that drew nothing fails', () => {
 assert.match(smokeFailures({...good,demo:{...good.demo,frames:0}})[0], /drew 0 frames/);
});
test('a hero that stayed put fails', () => {
 assert.match(smokeFailures({...good,demo:{...good.demo,moved:false}})[0], /did not move/);
});
test('a missing dragon or wave field fails', () => {
 assert.equal(smokeFailures({...good,splash:{dragon:false,waves:false}}).length, 2);
});
test('page errors and missing reports fail', () => {
 assert.deepEqual(smokeFailures({...good,errors:['boom']}), ['page error: boom']);
 assert.equal(smokeFailures().length, 2);
});
