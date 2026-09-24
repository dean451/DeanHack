import test from 'node:test';
import assert from 'node:assert/strict';
import {potionLook,groundItemCaption} from './item-looks.js';

test('potions are coloured by glyph colour when the name is a true type',()=>{
 assert.equal(potionLook('healing',1).liquid,potionLook('ruby').liquid);
 assert.notEqual(potionLook('healing',1).liquid,potionLook('healing',12).liquid);
 assert.equal(potionLook('water',8).liquid,potionLook('').liquid);
 assert.equal(potionLook('milky',4).liquid,potionLook('milky').liquid);
});

test('captions hide the true type of randomized-appearance items',()=>{
 const cap=(name,cls,color)=>groundItemCaption({name,color,object:{name,class:cls}});
 assert.equal(cap('gain level',8,1),'red potion');
 assert.equal(cap('ring of conflict',4),'ring');
 assert.equal(cap('amulet of life saving',5),'amulet');
 assert.equal(cap('genocide',9),'scroll');
 assert.equal(cap('wand of wishing',11),'wand');
 assert.equal(cap('magic lamp',6),'lamp');
 assert.equal(cap('bag of holding',6),'bag');
 assert.equal(cap('speed boots',3),'boots');
 assert.equal(cap('cloak of magic resistance',3),'cloak');
 assert.equal(cap('luckstone',13,7),'gray stone');
 assert.equal(cap('diamond',13,15),'white gem');
 assert.equal(cap('long sword',2),'long sword');
 assert.equal(cap('pick-axe',6),'pick-axe');
});
