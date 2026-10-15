import test from 'node:test';
import assert from 'node:assert/strict';
import {promptHeading,deathRecap,DEATH_RECAP_LINES} from './prompt-view.js';

test('a prompt with words is asked as itself',()=>{
  assert.deepEqual(promptHeading({kind:'key',prompt:'Do you want your possessions identified? [ynq] (default: n)'}),
    {kicker:'UNNETHACK ASKS',title:'Do you want your possessions identified? [ynq] (default: n)'});
  assert.deepEqual(promptHeading({kind:'menu',prompt:'What do you want to wield?'}),{kicker:'UNNETHACK ASKS',title:'What do you want to wield?'});
});

test('an untitled menu is the pack, not a question',()=>{
  assert.deepEqual(promptHeading({kind:'menu',prompt:''}),{kicker:'YOUR PACK',title:'Your possessions'});
  assert.deepEqual(promptHeading({kind:'menu'}),{kicker:'YOUR PACK',title:'Your possessions'});
  assert.deepEqual(promptHeading({kind:'more',prompt:'  '}),{kicker:'UNNETHACK ASKS',title:'UnNetHack'});
  assert.deepEqual(promptHeading(null),{kicker:'UNNETHACK ASKS',title:'UnNetHack'});
});

const rows=n=>Array.from({length:n},(_,i)=>({text:`line ${i}`,tone:'plain'}));

test('the death questions show the last ten messages, oldest first',()=>{
  const ask={kind:'key',prompt:'Do you want your possessions identified? [ynq] (default: n)'};
  const shown=deathRecap(ask,rows(30));
  assert.equal(shown.length,DEATH_RECAP_LINES);
  assert.equal(shown[0].text,'line 9');
  assert.equal(shown.at(-1).text,'line 0');
  assert.equal(deathRecap({kind:'key',prompt:'Do you want to see what you had when you died? [ynq] (default: n)'},rows(3)).length,3);
});

test('other prompts show no recap',()=>{
  assert.deepEqual(deathRecap({kind:'key',prompt:'Really attack the shopkeeper? [yn] (default: n)'},rows(5)),[]);
  assert.deepEqual(deathRecap({kind:'menu',prompt:'Do you want your possessions identified?'},rows(5)),[]);
  assert.deepEqual(deathRecap({kind:'key',prompt:'Do you want your possessions identified?'},null),[]);
});
