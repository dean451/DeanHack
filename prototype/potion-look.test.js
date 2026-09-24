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

test('the bridge label wins when present',()=>{
 assert.equal(groundItemCaption({name:'healing',color:1,object:{name:'healing',class:8,label:'ruby potion',appearance:'ruby'}}),'ruby potion');
 assert.equal(groundItemCaption({name:'healing',color:1,object:{name:'healing',class:8,label:'potion of healing'}}),'potion of healing');
});

test('every UnNetHack potion appearance has its own look',()=>{
 const appearances=['ruby','pink','orange','yellow','emerald','dark green','sky blue','indigo','magenta','amber','puce','brown','white','ochre','silver','black','golden','viscous','swirly','effervescent','milky','fizzy','dark','bubbly','murky','muddy','sparkling','luminescent','icy','squishy','greasy','slimy','soapy','smoky','steamy','gooey','cloudy','clear','blood-red'];
 const fallback=potionLook('').liquid;
 for(const word of appearances)assert.notEqual(potionLook(word).liquid,fallback,word);
 assert.notEqual(potionLook('dark').liquid,potionLook('dark green').liquid);
 assert.notEqual(potionLook('blood-red').liquid,potionLook('red').liquid);
});
