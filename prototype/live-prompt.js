// The engine's questions in Live: the command prompt, menus (with class toggles and two columns for long lists),
// text lines, --More--, yes/no and direction prompts, drawn in the dialog and wired to replies. Moved out of
// live.js unchanged; it reads the game's state and helpers from L (installLive's shared names).
import {groundNotice,bareMore} from './ground-notice.js';
import {promptHeading,deathRecap} from './prompt-view.js';
import {autoCategory,menuKeys,menuGroups,menuCommand,EXT_FALLBACK,matchCommands,completePrefix,resolveCommand} from './engine-menus.js';
import {menuColumns,itemClassMark} from './item-class.js';
import {itemBuc,bucMark,itemEnchant,enchantMark,itemHint} from './item-buc.js';
import {sinceMark,allRows} from './message-log.js';
import {box} from './live-tile-dress.js';

export function prompt(L){const {syncAim,S,setPrompt,showGround,reply,dialog,glowLog,messageLog}=L;syncAim();if(!S.active||!S.pending)return;setPrompt(S.pending.prompt);if(S.pending.kind==='command'||S.pending.kind==='position')return;
   const groundItems=groundNotice(S.pending,S.lines);
   if(groundItems&&S.latest){
    showGround(groundItems);S.groundPriced=groundItems;
    void reply(13);return;
   }
   if(bareMore(S.pending,S.lines)){void reply(13);return;}
   dialog.replaceChildren();const heading=promptHeading(S.pending);const kicker=document.createElement('small');kicker.textContent=heading.kicker;const title=document.createElement('h2');title.textContent=heading.title;dialog.append(kicker,title);
   if(S.pending.kind==='menu'&&S.menu){
    // "Take out / pick up what type of objects?" is answered with All types, so the full list opens at once.
    const skip=autoCategory(S.menu,S.pending.prompt);if(skip!==null){void reply(String(skip));return;}
    const items=menuKeys(S.menu.items),form=document.createElement('form'),pickAny=S.menu.how===2;let classHead='';
    if(S.menu.how!==0&&menuColumns(items.filter(i=>i.selectable).length)===2){form.classList.add('engine-menu-grid');dialog.classList.add('wide');}else dialog.classList.remove('wide');
    for(const item of items){const row=document.createElement('label');row.className='engine-menu-row';
     if(item.selectable&&S.menu.how!==0){const input=document.createElement('input');input.type=S.menu.how===1?'radio':'checkbox';input.name='selection';input.value=item.id;input.dataset.accelerator=item.key;row.append(input);const accel=document.createElement('kbd');accel.textContent=item.key?`[${item.key}]`:'';row.append(accel);}
     else if(!item.selectable&&item.text.trim())row.classList.add('engine-menu-heading');
     if(!item.selectable&&item.text.trim())classHead=item.text;
     const cls=item.selectable?itemClassMark(classHead):'';if(cls){const cm=document.createElement('span');cm.className='class-mark';cm.textContent=cls;cm.setAttribute('aria-hidden','true');row.append(cm);}
     const buc=item.selectable?itemBuc(item.text):null;if(buc){row.classList.add('buc-'+buc);const mark=document.createElement('span');mark.className='buc-mark';mark.textContent=bucMark(buc)+' ';mark.setAttribute('aria-hidden','true');row.append(mark);}
     const ench=item.selectable?itemEnchant(item.text):null;if(ench){row.classList.add('ench-'+ench);const em=document.createElement('span');em.className='ench-mark';em.textContent=enchantMark(ench);em.setAttribute('aria-hidden','true');row.append(em);}
     const hint=item.selectable?itemHint(item.text):'';if(hint)row.title=hint;
     const glow=item.selectable?glowLog.kindFor(item.text,performance.now()):null;if(glow){row.classList.add('glow-'+glow);row.title=(hint?hint+' · ':'')+({blessed:'just blessed',cursed:'just cursed',lifted:'curse just lifted'})[glow];}
     row.append(document.createTextNode(item.text));form.append(row);}
    const boxes=()=>[...form.querySelectorAll('input')];
    // One button per class in the list (Potions !, Scrolls ?...), the same toggle as typing its symbol.
    const toggleGroup=ids=>{const set=new Set(ids.map(String)),group=boxes().filter(i=>set.has(i.value)),on=!group.every(i=>i.checked);for(const i of group)i.checked=on;};
    if(pickAny){const classes=menuGroups(items);if(classes.length){const bar=document.createElement('div');bar.className='engine-menu-groups';
     for(const c of classes){const b=document.createElement('button');b.type='button';b.textContent=c.label+' ';const k=document.createElement('kbd');k.textContent=c.key;b.append(k);b.title=`Select or clear every item in ${c.label} (${c.key})`;b.onclick=()=>toggleGroup(c.ids);bar.append(b);}
     form.prepend(bar);}}
    if(S.menu.how!==0){const hint=document.createElement('p');hint.className='engine-menu-hint';hint.textContent=pickAny?'Letters toggle items · a class symbol (! ? / …) toggles that class · , selects all · - clears · @ inverts · Enter takes them':'Press a letter to choose';form.append(hint);}
    const submit=document.createElement('button');submit.textContent='Continue (Enter)';submit.type='submit';form.append(submit);
    form.onsubmit=e=>{e.preventDefault();reply(boxes().filter(i=>i.checked).map(i=>i.value).join(','));};
    form.addEventListener('keydown',e=>{const key=e.key;if(e.metaKey||e.ctrlKey||e.altKey)return;if(key==='Escape'){e.preventDefault();reply('!');return;}if(key==='Enter'){e.preventDefault();form.requestSubmit();return;}
     const input=boxes().find(i=>i.dataset.accelerator===key);if(input){e.preventDefault();if(S.menu.how===1)reply(input.value);else input.checked=!input.checked;return;}
     const cmd=pickAny&&key.length===1?menuCommand(key,items):null;if(!cmd)return;e.preventDefault();
     if(cmd.select)for(const i of boxes())i.checked=cmd.select==='all'?true:cmd.select==='none'?false:!i.checked;
     else toggleGroup(cmd.toggle);});
    dialog.append(form);}
   else if(S.pending.kind==='line'&&S.pending.prompt==='Extended command'){
    // # commands complete as you type: arrows pick, Tab completes, Enter runs the highlighted one.
    const list=S.commands?.length?S.commands:EXT_FALLBACK,form=Object.assign(document.createElement('form'),{className:'engine-ext-form'}),input=document.createElement('input'),ul=document.createElement('ul');
    input.maxLength=60;input.autofocus=true;input.autocomplete='off';input.spellcheck=false;input.placeholder='loot, force, enhance, pray…';ul.className='engine-ext-list';
    let shown=[],sel=0;
    const render=()=>{shown=matchCommands(list,input.value);sel=Math.min(sel,Math.max(0,shown.length-1));ul.replaceChildren(...shown.map((c,i)=>{const li=document.createElement('li'),b=document.createElement('b'),span=document.createElement('span');b.textContent='#'+c.name;span.textContent=c.desc;li.append(b,span);li.classList.toggle('active',i===sel);li.onmousedown=e=>{e.preventDefault();reply(c.name);};return li;}));};
    input.oninput=()=>{sel=0;render();};
    input.onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(shown.length)sel=(sel+(e.key==='ArrowDown'?1:-1)+shown.length)%shown.length;render();}
     else if(e.key==='Tab'){e.preventDefault();const done=completePrefix(list,input.value);input.value=done!==input.value?done:shown[sel]?.name??input.value;sel=0;render();}};
    form.onsubmit=e=>{e.preventDefault();reply(resolveCommand(list,input.value,shown[sel]));};
    form.append(input,ul);render();dialog.append(form);}
   else if(S.pending.kind==='line'){const story=sinceMark(messageLog,S.turnMark),shown=story.length?story:allRows(messageLog).slice(0,1).reverse();if(shown.length){const box=document.createElement('div');box.className='engine-recent-box';for(const row of shown){const p=document.createElement('p');p.className=`engine-recent msg msg-${row.tone}`;p.textContent=row.text;box.append(p);}dialog.append(box);}const form=document.createElement('form'),input=document.createElement('input'),submit=document.createElement('button');input.maxLength=200;input.autofocus=true;submit.textContent='Enter';form.append(input,submit);form.onsubmit=e=>{e.preventDefault();reply(input.value);};dialog.append(form);}
   else{if(S.lines.length){const pre=document.createElement('pre');pre.textContent=S.lines.join('\n');dialog.append(pre);}
    // The end-of-game questions carry the last messages, so what killed you is there to read.
    const recap=deathRecap(S.pending,allRows(messageLog));if(recap.length){const box=document.createElement('div');box.className='engine-recent-box';for(const row of recap){const p=document.createElement('p');p.className=`engine-recent msg msg-${row.tone}`;p.textContent=row.text;box.append(p);}dialog.append(box);}
    const p=document.createElement('p');p.textContent=S.pending.kind==='more'?'Press Enter to continue.':'Press a response key. For a direction use arrows or h/j/k/l.';dialog.append(p);const ok=document.createElement('button');ok.textContent='Enter';ok.onclick=()=>reply(13);dialog.append(ok);}
   const cancel=document.createElement('button');cancel.textContent='Cancel / Escape';cancel.onclick=()=>reply(S.pending.kind==='menu'?'!':S.pending.kind==='line'?'\u001b':27);dialog.append(cancel);dialog.showModal();
 }
