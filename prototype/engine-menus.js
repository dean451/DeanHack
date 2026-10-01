// Keyboard helpers for the engine's menus and the extended-command prompt.

// The engine leaves the letter off items that aren't in your inventory (a chest's contents, a
// pile on the floor, the #enhance skill list) and expects the window port to number them, as
// the tty port does: a-z, then A-Z, skipping letters other items already use.
const LETTERS='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export function menuKeys(items){
 const used=new Set(items.filter(i=>i.selectable&&i.accelerator).map(i=>i.accelerator));
 let next=0;
 return items.map(item=>{
  if(!item.selectable)return {...item,key:''};
  if(item.accelerator)return {...item,key:item.accelerator};
  while(next<LETTERS.length&&used.has(LETTERS[next]))next++;
  const key=next<LETTERS.length?LETTERS[next++]:'';
  if(key)used.add(key);
  return {...item,key};
 });
}

// Looting and picking up first ask which kinds of objects to list. Answer "All types" for the
// player so the whole list opens at once (, still selects everything in it).
const CATEGORY_PROMPT=/^(take out|put in|pick up) what type of objects\?/i;
export function autoCategory(menu,prompt){
 if(!menu||menu.how!==2||!CATEGORY_PROMPT.test(prompt||''))return null;
 const all=menu.items.find(i=>i.selectable&&/^all types$/i.test(i.text.trim()));
 return all?all.id:null;
}

// Menu-wide keys, as in NetHack: , or . select all, - clears, @ inverts. A group accelerator
// (an object class symbol such as ')' or '$') toggles every item in that group.
export function menuCommand(key,items){
 if(key===','||key==='.')return {select:'all'};
 if(key==='-')return {select:'none'};
 if(key==='@')return {select:'invert'};
 const ids=items.filter(i=>i.selectable&&i.group===key&&i.key!==key).map(i=>i.id);
 return ids.length?{toggle:ids}:null;
}

// The classes in a pick-any object list (putting things in a bag, picking up a pile), for the
// one-click class buttons: each group accelerator with the heading it sits under ("Potions",
// weight note dropped) and the items it toggles. Same toggle as typing the symbol (menuCommand).
export function menuGroups(items){
 const groups=new Map();let heading='';
 for(const item of items){
  if(!item.selectable){if(item.text.trim())heading=item.text.replace(/\s*\(\d+ aum\)\s*$/,'').trim();continue;}
  if(!item.group||item.group===item.key)continue;
  if(!groups.has(item.group))groups.set(item.group,{key:item.group,label:heading||item.group,ids:[]});
  groups.get(item.group).ids.push(item.id);
 }
 return [...groups.values()];
}

// Commands that are only reachable through #, used until the engine sends its own list.
export const EXT_FALLBACK=[
 ['adjust','adjust inventory letters'],['annotate','name current level'],['chat','talk to someone'],
 ['conduct','list voluntary challenges you have adhered to'],['dip','dip an object into something'],
 ['enhance','advance or check weapon and spell skills'],['force','force a lock'],
 ['invoke',"invoke an object's special powers"],['jump','jump to another location'],
 ['loot','loot a box on the floor'],['monster',"use monster's special ability"],
 ['name','name a monster or an object'],['offer','offer a sacrifice to the gods'],
 ['overview','show a summary of the explored dungeon'],['pray','pray to the gods for help'],
 ['ride','mount or dismount a saddled steed'],['rub','rub a lamp or a stone'],['sit','sit down'],
 ['terrain','view map without monsters or objects obstructing it'],['tip','empty a container'],
 ['turn','turn undead away'],['twoweapon','toggle two-weapon combat'],['untrap','untrap something'],
 ['wipe','wipe off your face'],
].map(([name,desc])=>({name,desc,auto:true}));

// Rank commands for what has been typed: exact, then name prefix (#-only commands first), then
// a match inside the name, then inside the description. An empty prompt lists the #-only ones.
export function matchCommands(list,text,limit=8){
 const q=(text||'').trim().toLowerCase();
 const rank=c=>{
  if(!q)return c.auto?0:-1;
  if(c.name===q)return 0;
  if(c.name.startsWith(q))return c.auto?1:2;
  if(c.name.includes(q))return 3;
  if(q.length>2&&c.desc.toLowerCase().includes(q))return 4;
  return -1;
 };
 return list.map(c=>({c,r:rank(c)})).filter(x=>x.r>=0)
  .sort((a,b)=>a.r-b.r||a.c.name.localeCompare(b.c.name)).slice(0,limit).map(x=>x.c);
}

// What to send for the typed text: an exact name, else the highlighted suggestion (nothing
// typed sends nothing, which cancels).
export function resolveCommand(list,text,picked){
 const q=(text||'').trim().toLowerCase();
 if(!q)return '';
 if(list.some(c=>c.name===q))return q;
 return picked?.name??q;
}

// Tab completion: the longest prefix shared by every command starting with the text.
export function completePrefix(list,text){
 const q=(text||'').trim().toLowerCase(),hits=list.filter(c=>c.name.startsWith(q)).map(c=>c.name);
 if(!hits.length)return text;
 let p=hits[0];for(const h of hits)while(!h.startsWith(p))p=p.slice(0,-1);
 return p.length>q.length?p:text;
}
