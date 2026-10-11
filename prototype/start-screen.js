// The first screen: a title, a name, and one button that either resumes that character's saved game
// or begins a new one, then goes straight into Live. `?demo` skips it and shows the demo room.
// The engine keys a save by character name (-u name), so typing a saved name resumes that game.

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

// Builds the overlay and wires it to the existing Live button and name field.
export function installStartScreen({doc=document,button,nameInput,search=location.search,getSaves=fetchSaves,storage}={}){
  if(!wantsStartScreen(search))return null;
  const el=doc.createElement('div');el.id='start-screen';
  el.innerHTML=`<div class="start-card"><small>THE DUNGEONS OF DOOM</small><h1>DEAN<b>HACK</b></h1><p class="start-tag">A little light. A long way down.</p>
<form autocomplete="off"><label for="start-name">Your name</label><input id="start-name" type="text" maxlength="24" spellcheck="false" placeholder="${DEFAULT_NAME}" aria-describedby="start-note"><button type="submit" id="start-go"></button><p id="start-note" aria-live="polite"></p></form>
<div class="start-saves" hidden><span>Saved characters</span><div class="start-list"></div></div>
<button type="button" class="start-demo">Look around the demo room</button></div>`;
  doc.body.append(el);doc.body.classList.add('start-open');
  const input=el.querySelector('#start-name'),go=el.querySelector('#start-go'),note=el.querySelector('#start-note'),list=el.querySelector('.start-list'),box=el.querySelector('.start-saves');
  let saves=[];
  const remembered=()=>{try{return(storage??localStorage).getItem('deanhack.playerName')||'';}catch{return '';}};
  input.value=nameInput?.value||remembered();
  const refresh=()=>{const plan=startPlan(input.value,saves);go.textContent=plan.label;note.textContent=plan.note;go.classList.toggle('resume',!!plan.resume);for(const chip of list.children)chip.classList.toggle('current',chip.dataset.name===fileKey(input.value));};
  const close=()=>{el.remove();doc.body.classList.remove('start-open');};
  el.querySelector('form').addEventListener('submit',e=>{
    e.preventDefault();
    const {name}=startPlan(input.value,saves);
    // the existing name field remembers it and shows it in the character panel
    if(nameInput){nameInput.value=name;nameInput.dispatchEvent(new Event('input'));}
    close();button.click();
  });
  input.addEventListener('input',refresh);
  el.querySelector('.start-demo').addEventListener('click',close);
  refresh();input.focus();input.select();
  getSaves().then(found=>{
    saves=found;
    list.replaceChildren(...saves.slice(0,6).map(s=>{const b=doc.createElement('button');b.type='button';b.dataset.name=s.name;b.innerHTML=`<b></b><i></i>`;b.firstChild.textContent=s.name.replace(/_/g,' ');b.lastChild.textContent=ago(s.savedAt);
      b.addEventListener('click',()=>{input.value=s.name.replace(/_/g,' ');refresh();go.focus();});return b;}));
    box.hidden=!saves.length;
    // the most recent character is the likeliest one, so offer it first when nothing was typed before
    if(!input.value&&saves[0])input.value=saves[0].name.replace(/_/g,' ');
    refresh();
  });
  return {el,close};
}
