// The first screen: a title, a name, and one button that either resumes that character's saved game
// or begins a new one, then goes straight into Live. `?demo` skips it and shows the demo room.
// The engine keys a save by character name (-u name), so typing a saved name resumes that game.

import {ROLES,ROLE_NAMES,RACES,DEFAULT_CHOICE,alignsFor,optionsFor,resolveChoice} from './roles.js';

export const DEFAULT_NAME='Wanderer';

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

export async function fetchSaves(fetchImpl=fetch){
  try{const r=await fetchImpl('/engine/saves');if(!r.ok)return [];const data=await r.json();return Array.isArray(data.saves)?data.saves:[];}catch{return [];}
}

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

// Builds the overlay and wires it to the existing Live button and name field.
export function installStartScreen({doc=document,button,nameInput,search=location.search,getSaves=fetchSaves,storage}={}){
  if(!wantsStartScreen(search))return null;
  const el=doc.createElement('div');el.id='start-screen';
  el.innerHTML=`<div class="start-card"><small>THE DUNGEONS OF DOOM</small><h1>DEAN<b>HACK</b></h1><p class="start-tag">A little light. A long way down.</p>
<form class="step-name" autocomplete="off"><label for="start-name">Your name</label><input id="start-name" type="text" maxlength="24" spellcheck="false" placeholder="${DEFAULT_NAME}" aria-describedby="start-note"><button type="submit" id="start-go"></button><p id="start-note" aria-live="polite"></p>
<div class="start-saves" hidden><span>Saved characters</span><div class="start-list"></div></div>
<button type="button" class="start-demo">Look around the demo room</button></form>
<div class="step-class" hidden><label>Choose your class</label><div class="class-grid" role="radiogroup" aria-label="Class"></div>
<div class="class-detail"><p class="class-blurb"></p><div class="class-opts"></div></div>
<button type="button" id="class-go"></button><button type="button" class="start-back">Back</button></div></div>`;
  doc.body.append(el);doc.body.classList.add('start-open');
  const $=s=>el.querySelector(s);
  const input=$('#start-name'),go=$('#start-go'),note=$('#start-note'),list=$('.start-list'),box=$('.start-saves'),stepName=$('.step-name'),stepClass=$('.step-class');
  let saves=[],choice=readChoice(storage),pendingName=DEFAULT_NAME;
  const remembered=()=>{try{return(storage??localStorage).getItem('deanhack.playerName')||'';}catch{return '';}};
  input.value=nameInput?.value||remembered();
  const refresh=()=>{const plan=startPlan(input.value,saves);go.textContent=plan.label;note.textContent=plan.note;go.classList.toggle('resume',!!plan.resume);for(const chip of list.children)chip.classList.toggle('current',chip.dataset.name===fileKey(input.value));};
  const close=()=>{el.remove();doc.body.classList.remove('start-open');};
  const launch=name=>{
    // the existing name field remembers the name and shows it in the character panel
    if(nameInput){nameInput.value=name;nameInput.dispatchEvent(new Event('input'));}
    close();button.click();
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
  input.addEventListener('input',refresh);
  $('.start-demo').addEventListener('click',close);
  refresh();input.focus();input.select();
  getSaves().then(found=>{
    saves=found;
    list.replaceChildren(...saves.slice(0,6).map(s=>{const b=doc.createElement('button');b.type='button';b.dataset.name=s.name;b.innerHTML=`<b></b><i></i>`;b.firstChild.textContent=s.name.replace(/_/g,' ');b.lastChild.textContent=(s.role?s.role+' · ':'')+ago(s.savedAt);
      b.addEventListener('click',()=>{input.value=s.name.replace(/_/g,' ');refresh();go.focus();});return b;}));
    box.hidden=!saves.length;
    // the most recent character is the likeliest one, so offer it first when nothing was typed before
    if(!input.value&&saves[0])input.value=saves[0].name.replace(/_/g,' ');
    refresh();
  });
  return {el,close};
}
