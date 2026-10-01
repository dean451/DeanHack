import test from 'node:test';
import assert from 'node:assert/strict';
import {menuKeys,autoCategory,menuCommand,menuGroups,EXT_FALLBACK,matchCommands,resolveCommand,completePrefix} from './engine-menus.js';

const row=(id,text,accelerator='',selectable=true,group)=>({id,text,accelerator,selectable,...(group?{group}:{})});

test('unlettered items (a chest, a pile, #enhance) get a-z then A-Z, skipping letters already taken',()=>{
 const items=[row(0,'Weapons','',false),row(1,'a long sword'),row(2,'Auto-select','A'),row(3,'a dagger','b'),row(4,'2 arrows'),row(5,'a shield')];
 assert.deepEqual(menuKeys(items).map(i=>i.key),['','a','A','b','c','d']);
 const many=Array.from({length:60},(_,i)=>row(i,`item ${i}`));
 const keys=menuKeys(many).map(i=>i.key);
 assert.equal(keys[26],'A');assert.equal(keys[51],'Z');assert.equal(keys[52],'');
 assert.equal(new Set(keys.filter(Boolean)).size,52,'no letter is used twice');
});

test('looting and picking up skip the "what type of objects?" step with All types',()=>{
 const menu={how:2,items:[row(0,'Auto-select every item','A'),row(1,'','',false),row(2,'All types','a'),row(3,'Weapons','b')]};
 assert.equal(autoCategory(menu,'Take out what type of objects?'),2);
 assert.equal(autoCategory(menu,'Put in what type of objects?'),2);
 assert.equal(autoCategory(menu,'Pick up what type of objects?'),2);
 assert.equal(autoCategory(menu,'Drop what type of items?'),null,'D keeps its type filter');
 assert.equal(autoCategory({...menu,how:1},'Take out what type of objects?'),null);
 assert.equal(autoCategory({how:2,items:[row(0,'Weapons','a')]},'Take out what type of objects?'),null);
});

test('menu keys: , and . select all, - clears, @ inverts, a class symbol toggles its group',()=>{
 const items=menuKeys([row(0,'a long sword','',true,')'),row(1,'a dagger','',true,')'),row(2,'12 gold pieces','',true,'$')]);
 assert.deepEqual(menuCommand(',',items),{select:'all'});
 assert.deepEqual(menuCommand('.',items),{select:'all'});
 assert.deepEqual(menuCommand('-',items),{select:'none'});
 assert.deepEqual(menuCommand('@',items),{select:'invert'});
 assert.deepEqual(menuCommand(')',items),{toggle:[0,1]});
 assert.equal(menuCommand('%',items),null);
});

test('# commands autocomplete: prefixes first, #-only commands ahead, Tab completes, Enter resolves',()=>{
 const list=[...EXT_FALLBACK,{name:'look',desc:'look at what is here',auto:false},{name:'pickup',desc:'pick up things',auto:false}];
 assert.equal(matchCommands(list,'lo')[0].name,'loot');
 assert.deepEqual(matchCommands(list,'lo').map(c=>c.name),['loot','look']);
 assert.equal(matchCommands(list,'enh')[0].name,'enhance');
 assert.equal(matchCommands(list,'f')[0].name,'force');
 assert.equal(matchCommands(list,'lock')[0].name,'force','searches descriptions too');
 assert(matchCommands(list,'').every(c=>c.auto),'an empty prompt lists the #-only commands');
 assert.equal(resolveCommand(list,'lo',matchCommands(list,'lo')[0]),'loot');
 assert.equal(resolveCommand(list,'look',matchCommands(list,'look')[0]),'look');
 assert.equal(resolveCommand(list,'  ',undefined),'');
 assert.equal(completePrefix(list,'en'),'enhance');
 assert.equal(completePrefix(list,'t'),'t','tip, turn, twoweapon and terrain share only "t"');
 assert.equal(completePrefix(list,'tw'),'twoweapon');
});

test('class buttons: each class in a pick-any list, named by its heading, toggling its items',()=>{
 const items=menuKeys([row(0,'Scrolls (15 aum)','',false),row(1,'a scroll labeled FOO','',true,'?'),row(2,'2 scrolls labeled BAR','',true,'?'),
  row(3,'Potions','',false),row(4,'a bubbly potion','',true,'!'),row(5,'Wands','',false),row(6,'a oak wand','',true,'/')]);
 assert.deepEqual(menuGroups(items),[{key:'?',label:'Scrolls',ids:[1,2]},{key:'!',label:'Potions',ids:[4]},{key:'/',label:'Wands',ids:[6]}]);
 assert.deepEqual(menuGroups(items).find(g=>g.key==='!').ids,menuCommand('!',items).toggle,'same items as typing the symbol');
 assert.deepEqual(menuGroups(menuKeys([row(0,'Auto-select every item','A'),row(1,'All types','a')])),[],'no classes, no buttons');
});
