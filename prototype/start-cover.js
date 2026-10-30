// The splash cover. The start screen is built by live.js, which only runs once the whole app
// bundle has loaded, so for a moment the bare page showed
// before the splash drew over it. This tiny module loads first, ahead of main.js, and fills the
// static #start-cover in index.html (painted dark by style.css before any script runs) with the
// splash dragon. installStartScreen then adopts that <pre> into the real splash, so the same head
// stays put with no swap, and removes the cover.
// The cover is opaque, as is the splash: the scene is never seen behind either.
import {pickDragon} from './dragon-art.js';
import {waveFrame,gridFor} from './ascii-waves.js';

export function fillCover(cover,{rand=Math.random,win=null}={}){
  if(!cover)return null;
  const pre=cover.querySelector('.start-dragon');if(!pre)return null;
  const d=pickDragon(rand),lines=d.art.split('\n');
  pre.textContent=d.art;pre.dataset.dragon=d.name;
  pre.style.setProperty('--lines',lines.length);pre.style.setProperty('--cols',Math.max(...lines.map(l=>l.length)));
  if(win&&pre.getBoundingClientRect){const h=pre.getBoundingClientRect().height,pad=parseFloat(win.getComputedStyle?.(pre.parentElement)?.paddingTop)||0;pre.style.marginTop=`${Math.max(0,(win.innerHeight-h)/2-pad)}px`;}
  // One still frame of the wave field, so it is already there when the start screen takes over.
  if(win&&cover.prepend&&cover.ownerDocument){const waves=cover.ownerDocument.createElement('pre');waves.className='start-waves';waves.setAttribute('aria-hidden','true');const {cols,rows}=gridFor(win.innerWidth,win.innerHeight);waves.textContent=waveFrame(cols,rows,0);cover.prepend(waves);}
  return d;
}

if(typeof document!=='undefined')fillCover(document.getElementById('start-cover'),{win:window});
