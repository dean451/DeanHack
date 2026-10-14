// The splash cover. The start screen is built by live.js, which only runs once the whole app
// bundle has loaded and the demo room has been set up, so for a moment the room showed through
// before the splash drew over it. This tiny module loads first, ahead of main.js, and fills the
// static #start-cover in index.html (painted dark by style.css before any script runs) with the
// splash dragon. installStartScreen then adopts that <pre> into the real splash, so the same head
// stays put with no swap, and removes the cover. With ?demo there is no splash, so the cover goes.
import {pickDragon} from './dragon-art.js';

export function fillCover(cover,{search='',rand=Math.random,win=null}={}){
  if(!cover)return null;
  if(new URLSearchParams(search).has('demo')){cover.remove();return null;}
  const pre=cover.querySelector('.start-dragon');if(!pre)return null;
  const d=pickDragon(rand),lines=d.art.split('\n');
  pre.textContent=d.art;pre.dataset.dragon=d.name;
  pre.style.setProperty('--lines',lines.length);pre.style.setProperty('--cols',Math.max(...lines.map(l=>l.length)));
  if(win&&pre.getBoundingClientRect){const h=pre.getBoundingClientRect().height,pad=parseFloat(win.getComputedStyle?.(pre.parentElement)?.paddingTop)||0;pre.style.marginTop=`${Math.max(0,(win.innerHeight-h)/2-pad)}px`;}
  return d;
}

if(typeof document!=='undefined')fillCover(document.getElementById('start-cover'),{search:location.search,win:window});
