// Potions get a random appearance each game (a color word, or a descriptive word like
// "milky"/"smoky"/"clear"), and the item name carries whichever one is current. Longer
// keys are checked first so "dark green" wins over a bare "green" substring match.
const POTION_LOOKS={
 ruby:['#e06a80','#c81e3a'],pink:['#e6a8c4','#c9668f'],red:['#d96060','#b31f1f'],
 orange:['#e0955a','#c65a1a'],yellow:['#e0d05a','#c4ac1e'],
 emerald:['#5ac48a','#1f8a4a'],'dark green':['#3a6b4a','#123d24'],green:['#6ac47a','#2a8a3a'],
 cyan:['#5bd0c7','#1f9d9d'],'sky blue':['#8fc0ea','#3f7fc2'],'brilliant blue':['#6a85ea','#2043c2'],blue:['#7a9dea','#2a5fc2'],
 magenta:['#d060c0','#a02090'],purple:['#9a60c0','#5a2090'],violet:['#a67fea','#6a3fc7'],
 puce:['#a67a72','#7a4a4a'],lavender:['#bcaeea','#8a7ac0'],
 white:['#f2f2ea','#dcdcd0'],silver:['#dadee0','#a6acb0'],golden:['#e0bf5a','#b8892a'],brown:['#8a6238','#5a3a1e'],
 black:['#2a2a2a','#0a0a0a'],dark:['#3a3440','#141018',{opacity:.8}],'blood-red':['#a01a1a','#5a0808',{opacity:.8}],
 amber:['#e8b04a','#b8741a'],indigo:['#6a5ad0','#34208a'],ochre:['#c89a4a','#8a5e1e'],
 viscous:['#a6a08a','#6e6850',{opacity:.8,transmission:.06}],
 muddy:['#7a6040','#4a3620',{opacity:.85,transmission:.04}],icy:['#d8f0ff','#9ccfe8',{opacity:.4,transmission:.5,emissiveIntensity:.5}],
 squishy:['#c06a9a','#8a3a6a'],greasy:['#b8a45a','#7e6a28',{opacity:.7}],slimy:['#7ab04a','#4a7a20',{opacity:.78}],
 soapy:['#e6eef2','#c6d6e0',{opacity:.5,transmission:.35}],steamy:['#d6dcdc','#aab4b4',{opacity:.45,transmission:.3}],
 milky:['#efeee6','#d8d6c6',{opacity:.88,transmission:.05}],clear:['#e8f5f0','#bcd8d2',{opacity:.3,transmission:.6}],
 smoky:['#8a8a86','#5a5a56',{opacity:.62,transmission:.12}],cloudy:['#c5c5c0','#a6a6a0',{opacity:.72,transmission:.08}],
 swirly:['#a06fe0','#7a3fc0'],bubbly:['#5bd0c7','#1f9d9d'],effervescent:['#c7e05b','#8aae2a'],
 fizzy:['#e0e06f','#b0b02a'],gooey:['#8a7a2a','#5a4a1a'],murky:['#4a4a3a','#2a2a1e'],
 sparkling:['#e8e8ff','#c0c0f0',{emissiveIntensity:.7}],glowing:['#eaff8a','#c7e05b',{emissiveIntensity:.9}],luminescent:['#eaff8a','#c7e05b',{emissiveIntensity:.9}],
};
const DEFAULT_POTION_LOOK=['#8fd0c8','#3aa8a6',{}];
// The bridge names objects by their true type ("healing"), not their appearance, so
// the word lookup above rarely matches. The glyph colour is shuffled together with the
// appearance, so it tells potions apart and stays the same after identification.
const POTION_GLYPH_LOOKS=['black','ruby','dark green','brown','blue','magenta','cyan','smoky',null,'orange','emerald','yellow','brilliant blue','pink','sky blue','milky'];
export function potionLook(name,color){
 const look=([glass,liquid,extra])=>({glass,liquid,opacity:.58,transmission:.2,emissiveIntensity:.35,...extra});
 for(const key of Object.keys(POTION_LOOKS).sort((a,b)=>b.length-a.length))if(name.includes(key))return look(POTION_LOOKS[key]);
 const byColor=POTION_GLYPH_LOOKS[color];if(byColor)return look(POTION_LOOKS[byColor]);
 return look(DEFAULT_POTION_LOOK);
}
// The bridge's object name is the true type, which would reveal unidentified items. Its
// label is the hero's view of the name; for older bridges without one, captions for
// classes with randomized appearances show only what the item looks like.
const GLYPH_COLOR_WORDS=['black','red','green','brown','blue','magenta','cyan','gray','','orange','bright green','yellow','bright blue','pink','bright cyan','white'];
const RANDOM_TOOLS=[[/\blamp\b/,'lamp'],[/\b(?:bag|sack)\b/,'bag'],[/\bhorn\b/,'horn'],[/\bflute\b/,'flute'],[/\bharp\b/,'harp'],[/\bdrum\b/,'drum']];
const RANDOM_ARMOR=[[/^cloak of (?:protection|invisibility|magic resistance|displacement)$/,'cloak'],[/^(?:speed|water walking|jumping|elven|kicking|fumble|levitation) boots$/,'boots'],[/^(?:gauntlets of|leather gloves)/,'gloves'],[/^(?:helmet|helm of)/,'helmet']];
export function groundItemCaption(cell){
 const object=cell.object||{},name=(object.name||cell.name||'item').toLowerCase(),cls=object.class;
 if(object.label)return object.label;
 const tint=GLYPH_COLOR_WORDS[cell.color]||'';
 const plain={4:'ring',5:'amulet',9:'scroll',10:'spellbook',11:'wand'}[cls];
 if(plain)return plain;
 if(cls===8)return tint?`${tint} potion`:'potion';
 if(cls===13)return name==='rock'?'rock':/stone$/.test(name)?'gray stone':tint?`${tint} gem`:'gem';
 for(const [pattern,word] of cls===6?RANDOM_TOOLS:cls===3?RANDOM_ARMOR:[])if(pattern.test(name))return word;
 return cell.name||name;
}
