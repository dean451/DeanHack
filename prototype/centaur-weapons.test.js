import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature} from './creatures.js';

const make=name=>createCreature({name,symbol:67,color:3});
// widest reach of a weapon's vertices from its own long (y) axis
function reach(o){
 let r=0;
 o.traverse(m=>{if(!m.geometry)return;const a=m.geometry.attributes.position.array;
  for(let i=0;i<a.length;i+=3)r=Math.max(r,Math.hypot(a[i],a[i+2]));});
 return r;
}

test('the mountain centaur club has rusted nails driven out through its head',()=>{
 const club=make('mountain centaur').weaponSocket.children[0];
 assert(club,'a club hangs from the fist');
 assert(reach(club)>.1,`nail points stand proud of the club head (${reach(club).toFixed(3)})`);
});

test('the plains centaur spear has barbs flaring below the blade',()=>{
 const spear=make('plains centaur').weaponSocket;
 assert(reach(spear)>.045,`barbs flare out past the blade (${reach(spear).toFixed(3)})`);
});
