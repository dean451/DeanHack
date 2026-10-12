import test from 'node:test';
import assert from 'node:assert/strict';
import {createLinkWatch} from './link-watch.js';

// fake timers: fire() runs whatever is pending
function timers(){const q=new Map();let id=0;return {setTimer:(fn,ms)=>{q.set(++id,{fn,ms});return id;},clearTimer:i=>q.delete(i),fire(){for(const [i,{fn}] of [...q]){q.delete(i);fn();}},get pending(){return q.size;}};}

test('a short blip never shows a banner; a long one does, and it clears when events return',()=>{
  const t=timers(),calls=[];
  const w=createLinkWatch({graceMs:15000,onLost:()=>calls.push('lost'),onBack:()=>calls.push('back'),...t});
  w.lost();w.ok();assert.deepEqual(calls,[]);assert.equal(t.pending,0,'the grace timer is cancelled by the next event');
  w.lost();w.lost();assert.equal(t.pending,1,'one timer however many errors');t.fire();
  assert.deepEqual(calls,['lost']);assert.equal(w.isLost,true);
  w.ok();assert.deepEqual(calls,['lost','back']);assert.equal(w.isLost,false);
});

test('a new session token means the server restarted: one Continue banner, no Reconnect after it',()=>{
  const t=timers(),calls=[];
  const w=createLinkWatch({graceMs:100,onLost:()=>calls.push('lost'),onRestart:()=>calls.push('restart'),...t});
  assert.equal(w.token('abc'),false,'the first token is just remembered');
  assert.equal(w.token('abc'),false);
  w.lost();assert.equal(t.pending,1);
  assert.equal(w.token('xyz'),true);
  assert.deepEqual(calls,['restart']);assert.equal(t.pending,0,'the grace timer is dropped');
  w.token('qrs');w.lost();t.fire();assert.deepEqual(calls,['restart'],'restart is reported once and nothing else follows');
  assert.equal(w.restarted,true);
});
