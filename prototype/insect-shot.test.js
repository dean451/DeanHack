import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';
import {updateInsectSettle, SETTLE, SETTLING} from './insect-settle.js';
import {updateInsectAlarm, LIFT} from './insect-alarm.js';
import {updateCockatriceCrow} from './cockatrice-crowing.js';
import {rolesOf} from './body-roles.js';

// The same loops tools/creature-shot.html runs for ?settle= and ?alarm=, so the renders the routines look at
// are the game's own update, not a pose written by hand.
const make=name=>{const a=createCreature({name,symbol:97,color:3});a.g.updateMatrixWorld(true);return a;};

test('?settle=: the shot tool\'s settling loop lowers an ant, a beetle and a bee',()=>{
 for(const name of ['giant ant','giant beetle','killer bee']){
  const a=make(name),built=a.body.position.y;
  for(let i=0;i<Math.round((SETTLE+SETTLING+1)*30);i++)updateInsectSettle(a,1/30,false,null);
  assert(a.body.position.y<built-.005,`${name}: sits lower`);
 }
});

test('?alarm=: the shot tool\'s alarm loop holds the ant\'s sting over its withers',()=>{
 const a=make('giant ant'),near={x:1,z:0};
 for(let i=0;i<Math.round((LIFT+.5)*30);i++)updateInsectAlarm(a,1/30,i/30,false,near);
 a.g.updateMatrixWorld(true);const P=rolesOf(a);
 assert(P.tailtip().y>P.withers().y);
});

test('?crowing=: the shot tool\'s crow loop throws a cockatrice\'s beak up over its withers',()=>{
 const a=make('cockatrice'),far={x:9,z:0};
 updateCockatriceCrow(a,0,0,false,far);a.fowlCrow.wait=0;
 for(let i=0;i<Math.round(.8*30);i++)updateCockatriceCrow(a,1/30,i/30,false,far);
 a.g.updateMatrixWorld(true);const P=rolesOf(a);
 assert(P.mouth().y>P.withers().y);
});
