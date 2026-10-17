// The splash: the first screen, and the one the game returns to. A name and one button that either
// resumes that character's saved game or begins a new one (choosing a class), then straight into
// Live. Save & quit, death, an idle stop or a crash all come back here with a line saying what
// happened. The splash is opaque and the 3D scene does not draw behind it (main.js): the demo
// room is a development view, seen only with `?demo`, which skips the splash.
// The engine keys a save by character name (-u name), so typing a saved name resumes that game.

import {pickDragon} from './dragon-art.js';
import {createAsciiWaves} from './ascii-waves.js';
import {createAsciiSpiral, DESCENT} from './ascii-spiral.js';
import {epitaph} from './death-beat.js';
import {ROLES,ROLE_NAMES,RACES,DEFAULT_CHOICE,alignsFor,optionsFor,resolveChoice} from './roles.js';

export const DEFAULT_NAME='Adventurer';

// The name as the engine will see it (same rules as cleanPlayerName in engine/server.js).
export function cleanName(raw){
  if(typeof raw!=='string')return DEFAULT_NAME;
  const name=raw.replace(/[^A-Za-z0-9 _']/g,'').replace(/\s+/g,' ').trim().slice(0,24).trim();
  return /^[A-Za-z0-9]/.test(name)?name:DEFAULT_NAME;
}

// A save file name cannot hold spaces, so "Mary Jane" is saved as "Mary_Jane".
const fileKey=name=>cleanName(name).replace(/ /g,'_');

// What the main button will do for this name: resume a save or begin a new character.
export function startPlan(rawName,saves=[]){
  const name=cleanName(rawName),key=fileKey(name),resume=saves.find(s=>s.name===key)||null;
  return {name,resume,label:resume?`Continue as ${name}`:`Begin as ${name}`,note:resume?`Saved ${ago(resume.savedAt)}.`:'A new character. Your game is saved when you leave.'};
}

export function ago(ms,now=Date.now()){
  const s=Math.max(0,Math.round((now-ms)/1000));
  if(s<60)return 'just now';
  const m=Math.round(s/60);if(m<60)return `${m} min ago`;
  const h=Math.round(m/60);if(h<24)return `${h} h ago`;
  const d=Math.round(h/24);if(d<14)return `${d} day${d===1?'':'s'} ago`;
  return new Date(ms).toLocaleDateString('en',{month:'short',day:'numeric'});
}

export function wantsStartScreen(search=''){return !new URLSearchParams(search).has('demo');}

// The list carries `guest` (a shared login whose saves live with this browser; engine/server.js) as a property.
export async function fetchSaves(fetchImpl=fetch){
  try{const r=await fetchImpl('/engine/saves');if(!r.ok)return [];const data=await r.json();const saves=Array.isArray(data.saves)?data.saves:[];if(data.guest)saves.guest=true;return saves;}catch{return [];}
}
export const GUEST_NOTE='Guest login: your characters stay with this browser. Ask for a login of your own to carry one between machines.';

// The class chosen last time (always a valid character), kept in the browser.
const CHOICE_KEY='deanhack.class';
export function readChoice(storage){
  try{return resolveChoice(JSON.parse((storage??localStorage).getItem(CHOICE_KEY)||'null'));}catch{return {...DEFAULT_CHOICE};}
}
export function saveChoice(choice,storage){try{(storage??localStorage).setItem(CHOICE_KEY,JSON.stringify(resolveChoice(choice)));}catch{}}

const label=word=>word[0].toUpperCase()+word.slice(1);
// What the class screen shows for a choice: the role's blurb and only the options that are valid.
export function classView(rawChoice){
  const choice=resolveChoice(rawChoice),role=ROLES[choice.role],opts=optionsFor(choice.role,choice.race);
  return {
    choice,blurb:role.blurb,difficulty:role.difficulty,
    races:opts.races.map(id=>({id,label:RACES[id].label,on:id===choice.race})),
    genders:opts.genders.map(id=>({id,label:label(id),on:id===choice.gender})),
    aligns:opts.aligns.map(id=>({id,label:label(id),on:id===choice.align})),
  };
}
// The choice after the player picks one part; the rest is corrected so it stays a valid character.
export function pick(choice,part,value){return resolveChoice({...choice,[part]:value});}

// What the splash says when a game ends, from the server's reason and the hero's death, if any.
export function endedNote(reason,death){
  if(death)return `You died: ${death}.`;
  if(reason==='idle')return 'Your game was saved after 20 minutes idle.';
  if(reason==='shutdown')return 'Your game was saved while the server restarted.';
  if(reason==='crash')return 'The game stopped unexpectedly. Continue picks up from your last save.';
  return 'Saved.';
}

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// The tombstone on the splash after a death: the name, the cause in the game's own words, and where.
export function deathCard(tomb){
  if(!tomb||!tomb.killer)return '';
  const where=tomb.depth?` on level ${tomb.depth}${tomb.dungeon?` of ${tomb.dungeon}`:''}`:'';
  return `<div class="tomb"><small>REST IN PEACE</small><b>${esc(tomb.name||'')}</b><span>${esc(tomb.killer+where)}</span><i>${esc(epitaph(tomb))}</i><em>The dungeon keeps what it takes. Begin again, or choose a new character.</em></div>`;
}

export async function forgetSave(name,fetchImpl=fetch){
  const {token}=await (await fetchImpl('/engine/token')).json();
  const r=await fetchImpl('/engine/forget',{method:'POST',headers:{'Content-Type':'application/json','X-Engine-Token':token},body:JSON.stringify({name})});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Could not delete the character');return data;
}

// The leaderboard: every game finished on this server, best first (engine/server.js reads the
// engine's xlogfile). A server without one, or one that errors, just has no finished games.
export async function fetchScores(fetchImpl=fetch){
  try{const r=await fetchImpl('/engine/scores');if(!r.ok)return [];const data=await r.json();return Array.isArray(data.scores)?data.scores:[];}catch{return [];}
}
export const NO_SCORES='No games finished on this server yet.';
const fmt=n=>Number.isFinite(n)?n.toLocaleString('en'):'';
// The xlogfile abbreviates the class and race ("Val", "Hum"): the full name where one matches.
const RACE_NAMES=Object.values(RACES).map(r=>r.label);
const fullName=(code,names)=>code?names.find(n=>n.toLowerCase().startsWith(String(code).toLowerCase()))||String(code):'';
// The table under the Leaderboard button: rank, points, name, the cause in the game's own words,
// then depth and turns. Pure: JSON in, HTML out, nothing unescaped.
export function scoreTable(scores){
  if(!Array.isArray(scores)||!scores.length)return `<p class="start-empty">${NO_SCORES}</p>`;
  const rows=scores.map((s,i)=>{const kind=[fullName(s.race,RACE_NAMES),fullName(s.role,ROLE_NAMES)].filter(Boolean).join(' ');
    return `<tr><td class="rank">${i+1}</td><td class="num">${fmt(s.points)}</td><td class="who"><b>${esc(s.name||'')}</b>${kind?`<i>${esc(kind)}</i>`:''}</td><td class="how">${esc(s.death||'')}</td><td class="num">${fmt(s.deathlev)}</td><td class="num">${fmt(s.turns)}</td></tr>`;}).join('');
  return `<table class="start-scores"><thead><tr><th class="rank">#</th><th class="num">Points</th><th class="who">Name</th><th class="how">Cause of death</th><th class="num">Depth</th><th class="num">Turns</th></tr></thead><tbody>${rows}</tbody></table>`;
}
// Wires the button to the table: the scores are fetched the first time it is pressed, shown, and
// hidden again on the next press. stale() (the splash reopening) makes the next look fetch again,
// so a game that just ended is on the board.
export function installScoreboard({button,table,getScores=fetchScores,render=scoreTable}){
  let fresh=false,loading=null;
  const load=()=>loading??=getScores().then(scores=>{table.innerHTML=render(scores);fresh=true;}).finally(()=>{loading=null;});
  const show=on=>{table.hidden=!on;button.setAttribute('aria-expanded',String(on));};
  button.addEventListener('click',async()=>{
    if(!table.hidden){show(false);return;}
    if(!fresh){button.disabled=true;try{await load();}finally{button.disabled=false;}}
    show(true);
  });
  return {stale(){fresh=false;if(!table.hidden)void load();},get shown(){return !table.hidden;}};
}

// Builds the splash once and wires it to the Live button and name field. Returns {open, close}:
// the live game calls open({note}) when a session ends, so the player always lands back here.
export function installStartScreen({doc=document,button,nameInput,search=location.search,getSaves=fetchSaves,forget=forgetSave,getScores=fetchScores,confirmFn=(m)=>confirm(m),storage}={}){
  const cover=doc.getElementById?.('start-cover');
  if(!wantsStartScreen(search)){cover?.remove();return null;}
  const el=doc.createElement('div');el.id='start-screen';
  el.innerHTML=`<div class="start-stage"><pre class="start-dragon" aria-hidden="true"></pre><div class="start-card"><small>THE DUNGEONS OF DOOM</small><h1>An <a class="start-link" href="https://github.com/UnNetHack/UnNetHack" target="_blank" rel="noopener">UnNetHack</a> Fork</h1><p id="start-status" role="status" hidden></p>
<form class="step-name" autocomplete="off"><label for="start-name">Your name</label><input id="start-name" type="text" maxlength="24" spellcheck="false" placeholder="${DEFAULT_NAME}" aria-describedby="start-note"><button type="submit" id="start-go"></button><p id="start-note" aria-live="polite"></p>
<div class="start-row"><button type="button" class="start-new">New character</button><button type="button" class="start-forget" hidden>Start over (delete this save)</button></div>
<div class="start-saves" hidden><span>Your characters</span><div class="start-list"></div></div></form>
<div class="step-class" hidden><label>Choose your class</label><div class="class-grid" role="radiogroup" aria-label="Class"></div>
<div class="class-detail"><p class="class-blurb"></p><div class="class-opts"></div></div>
<button type="button" id="class-go"></button><button type="button" class="start-back">Back</button></div></div><p class="start-mark"><a class="start-link" href="https://github.com/dean451/deanhack" target="_blank" rel="noopener" aria-label="DeanHack on GitHub">DEAN<b>HACK</b></a></p></div><div class="start-board"><button type="button" class="start-scores-toggle" aria-expanded="false" aria-controls="start-scores">Leaderboard</button><div id="start-scores" class="start-scores-box" hidden></div></div>`;
  // The wavy ASCII field behind everything (ascii-waves.js); it runs only while the splash shows.
  const waves=createAsciiWaves({doc});el.prepend(waves.el);
  // The descent (ascii-spiral.js): Descend fades the card out under a spiral that zooms for DESCENT.ms, then
  // rests dim behind the engine's opening text until live.js reports the first frame landed.
  const spiral=createAsciiSpiral({doc});let descending=false,landing=null;
  const win=doc.defaultView;
  const clearDescent=()=>{descending=false;if(landing){win?.clearTimeout?.(landing);landing=null;}el.classList.remove('start-descending');doc.body.classList.remove('start-descending');spiral.stop();spiral.el.remove();spiral.el.classList.remove('zoom','rest','gone');};
  const descend=()=>{
    if(spiral.still||!win?.setTimeout)return Promise.resolve();
    descending=true;el.classList.add('start-descending');doc.body.classList.add('start-descending');waves.stop();
    doc.body.append(spiral.el);spiral.speed=1;spiral.start();
    (win.requestAnimationFrame??(f=>f()))(()=>spiral.el.classList.add('zoom'));
    return new Promise(res=>win.setTimeout(res,DESCENT.ms)).then(()=>{spiral.speed=DESCENT.rest;spiral.el.classList.replace('zoom','rest');});
  };
  // The dungeon is on screen: the spiral fades away and the opening text's fade-in rules lift.
  const landed=()=>{if(!descending||landing)return;spiral.el.classList.add('gone');doc.body.classList.remove('start-descending');landing=win.setTimeout(()=>{landing=null;clearDescent();},1000);};
  doc.body.append(el);
  const $=s=>el.querySelector(s);
  // The cover (start-cover.js) already shows a head: take that very element so nothing swaps.
  const coverDragon=cover?.querySelector?.('.start-dragon');const adopted=!!coverDragon?.textContent;
  if(adopted)$('.start-dragon').replaceWith(coverDragon);
  cover?.remove();
  const dragon=$('.start-dragon');
  // each head is sized to its own art (style.css), so a short one grows to match the card
  // The dragon is centred in the window, not against the card, so the class list growing the card
  // never moves it: its top margin is set from its own height and the window's, on show and resize.
  const placeDragon=()=>{const win=doc.defaultView;if(!win||!dragon.getBoundingClientRect)return;const h=dragon.getBoundingClientRect().height,pad=parseFloat(win.getComputedStyle?.(dragon.parentElement)?.paddingTop)||0;dragon.style.marginTop=`${Math.max(0,(win.innerHeight-h)/2-pad)}px`;};
  doc.defaultView?.addEventListener?.('resize',placeDragon);
  const showDragon=()=>{const art=pickDragon().art,lines=art.split('\n');dragon.textContent=art;dragon.style.setProperty('--lines',lines.length);dragon.style.setProperty('--cols',Math.max(...lines.map(l=>l.length)));placeDragon();};
  if(adopted)placeDragon();else showDragon();
  const input=$('#start-name'),go=$('#start-go'),note=$('#start-note'),status=$('#start-status'),list=$('.start-list'),box=$('.start-saves'),stepName=$('.step-name'),stepClass=$('.step-class'),forgetBtn=$('.start-forget');
  let saves=[],choice=readChoice(storage),pendingName=DEFAULT_NAME;
  const remembered=()=>{try{return(storage??localStorage).getItem('deanhack.playerName')||'';}catch{return '';}};
  const refresh=()=>{const plan=startPlan(input.value,saves);go.textContent=plan.label;note.textContent=plan.resume?`${plan.resume.role?plan.resume.role+', ':''}saved ${ago(plan.resume.savedAt)}.`:plan.note;go.classList.toggle('resume',!!plan.resume);forgetBtn.hidden=!plan.resume;for(const chip of list.children)chip.classList.toggle('current',chip.dataset.name===fileKey(input.value));};
  const close=()=>{el.hidden=true;doc.body.classList.remove('start-open');waves.stop();};
  const loadSaves=()=>getSaves().then(found=>{
    saves=found;
    list.replaceChildren(...saves.slice(0,8).map(s=>{const b=doc.createElement('button');b.type='button';b.dataset.name=s.name;b.innerHTML=`<b></b><i></i>`;b.firstChild.textContent=s.name.replace(/_/g,' ');b.lastChild.textContent=(s.role?s.role+' · ':'')+ago(s.savedAt);
      b.addEventListener('click',()=>{input.value=s.name.replace(/_/g,' ');refresh();go.focus();});return b;}));
    box.hidden=!saves.length&&!saves.guest;
    // a guest login says where its saves live, whether or not there are any yet
    let guestNote=el.querySelector('.start-guest');if(saves.guest&&!guestNote){guestNote=doc.createElement('small');guestNote.className='start-guest';guestNote.textContent=GUEST_NOTE;box.append(guestNote);}else if(!saves.guest&&guestNote)guestNote.remove();
    // the most recent character is the likeliest one, so offer it first when nothing was typed before
    if(!input.value&&saves[0])input.value=saves[0].name.replace(/_/g,' ');
    refresh();
  });
  const open=({note:line='',death=null,focus=true}={})=>{
    clearDescent();
    el.hidden=false;doc.body.classList.add('start-open');showDragon();waves.start();
    const card=deathCard(death);
    if(card){status.innerHTML=card;status.classList.add('dead');status.hidden=false;}else{status.textContent=line;status.classList.remove('dead');status.hidden=!line;}
    stepClass.hidden=true;stepName.hidden=false;board.stale();
    input.value=nameInput?.value||remembered();refresh();
    if(focus){input.focus();input.select();}
    return loadSaves();
  };
  const launch=name=>{
    // the existing name field remembers the name and shows it in the character panel
    if(nameInput){nameInput.value=name;nameInput.dispatchEvent(new Event('input'));}
    descend().then(()=>{close();button.click();});
  };
  const renderClass=()=>{
    const view=classView(choice);
    const grid=$('.class-grid');
    grid.replaceChildren(...ROLE_NAMES.map(role=>{const b=doc.createElement('button');b.type='button';b.setAttribute('role','radio');b.setAttribute('aria-checked',String(role===choice.role));b.dataset.role=role;b.dataset.level=ROLES[role].difficulty;b.className=role===choice.role?'on':'';
      b.innerHTML='<b></b><i></i>';b.firstChild.textContent=role;b.lastChild.textContent=ROLES[role].difficulty;
      b.addEventListener('click',()=>{choice=pick(choice,'role',role);renderClass();});return b;}));
    $('.class-blurb').textContent=view.blurb;
    const opts=$('.class-opts');opts.replaceChildren();
    for(const [part,title,items] of [['race','Race',view.races],['gender','Gender',view.genders],['align','Alignment',view.aligns]]){
      const row=doc.createElement('div');row.className='opt';const t=doc.createElement('span');t.textContent=title;row.append(t);
      const seg=doc.createElement('div');seg.className='seg';
      for(const item of items){const b=doc.createElement('button');b.type='button';b.textContent=item.label;b.className=item.on?'on':'';b.disabled=items.length===1;b.setAttribute('aria-pressed',String(item.on));b.addEventListener('click',()=>{choice=pick(choice,part,item.id);renderClass();});seg.append(b);}
      row.append(seg);opts.append(row);
    }
    $('#class-go').textContent=`Descend as ${pendingName} the ${choice.role}`;
  };
  stepName.addEventListener('submit',e=>{
    e.preventDefault();
    const plan=startPlan(input.value,saves);pendingName=plan.name;
    // a saved character already has its class: resume it. A new one chooses first.
    if(plan.resume){launch(plan.name);return;}
    stepName.hidden=true;stepClass.hidden=false;renderClass();$('.class-grid .on')?.focus();
  });
  $('#class-go').addEventListener('click',()=>{saveChoice(choice,storage);launch(pendingName);});
  $('.start-back').addEventListener('click',()=>{stepClass.hidden=true;stepName.hidden=false;input.focus();});
  $('.start-new').addEventListener('click',()=>{input.value='';refresh();input.focus();});
  forgetBtn.addEventListener('click',async()=>{
    const plan=startPlan(input.value,saves);if(!plan.resume)return;
    if(!confirmFn(`Delete ${plan.name}'s saved game? This cannot be undone.`))return;
    forgetBtn.disabled=true;
    try{await forget(plan.name);status.textContent=`${plan.name}'s saved game was deleted.`;status.hidden=false;}
    catch(e){status.textContent=e.message;status.hidden=false;}
    forgetBtn.disabled=false;await loadSaves();
  });
  input.addEventListener('input',refresh);
  const board=installScoreboard({button:$('.start-scores-toggle'),table:$('#start-scores'),getScores});
  open();
  return {el,open,close,landed};
}
