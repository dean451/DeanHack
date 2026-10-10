import test from 'node:test';
import assert from 'node:assert/strict';
import {itemClassMark} from './item-class.js';

test('every object class heading gets its own shape',()=>{
 const heads=['Weapons','Armor','Rings','Amulets','Tools','Comestibles','Potions','Scrolls','Spellbooks','Wands','Coins','Gems/Rocks','Iron balls','Venoms'];
 const marks=heads.map(itemClassMark);
 assert.ok(marks.every(Boolean));
 assert.equal(new Set(marks).size,marks.length);
});

test('unknown or empty headings give no mark',()=>{
 assert.equal(itemClassMark(''),'');
 assert.equal(itemClassMark(undefined),'');
 assert.equal(itemClassMark('All types'),'');
});
