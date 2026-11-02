// The Live game's text around the scene: the prompt line, the character's name, the status screen element, the pet in the companion slot,
// and the lost-link banner. Moved out of live.js unchanged; live.js passes in what each one reads.
import {label} from './live-tile-dress.js';

export function setPrompt(text,{$,esc}={}){$('#engine-prompt').innerHTML=text?`<span class="dot"></span>${esc(text)}`:'';}
export function setCharacterName(name,{$}={}){const el=$('.character>small');if(el)el.textContent=(String(name||'').trim()||'Adventurer');}
export function statusScreenEl(){let el=document.getElementById('status-screen');if(!el){el=document.createElement('div');el.id='status-screen';document.body.appendChild(el);}return el;}
export function renderSurroundings(frame,{$,esc}={}){
   const pets=[];
   for(const cell of frame.cells){
     if(cell.kind==='pet'&&cell.visible&&!(cell.x===frame.player.x&&cell.z===frame.player.z))pets.push(cell.name);
   }
   // With no pet in view the companion slot is left out rather than saying so.
   $('.companion').hidden=!pets.length;
   $('.companion').innerHTML=pets.length?`<span class="dot"></span> ${esc(pets[0])}${pets.length>1?` +${pets.length-1}`:''}`:'';
 }
export function hideLinkBanner({linkBanner}={}){linkBanner.hidden=true;}
export function showLinkBanner(text,label,{active,linkBanner}={}){if(!active)return;linkBanner.firstChild.textContent=text;linkBanner.lastChild.textContent=label;linkBanner.lastChild.onclick=()=>location.reload();linkBanner.hidden=false;}
