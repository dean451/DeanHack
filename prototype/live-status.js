// The hero's numbers in Live: the bottom status line read into the character panel (gold, power, experience,
// conditions and their countdowns, the status screen tint), the attributes row, and the level name that fades in
// on arrival. Moved out of live.js unchanged; it reads the game's state and helpers from L.
import {parseAttributes} from './hud.js';
import {airborneStatus} from './dig-drop.js';
import {heroConditions,conditionTags,conditionTagsHtml} from './hud-conditions.js';
import {applyStatusScreen} from './status-screen.js';
import {statusScreenEl} from './live-hud.js';
import {worstProgress} from './status-progress.js';
import {conditionGlyph} from './condition-glyph.js';
import {label} from './live-tile-dress.js';

export function renderStatus(text,L){const {renderAttributes,$,S,statusProgress,esc}=L;
   // The first status line carries the attributes (hud.js); it is drawn under the stats and
   // never replaces the gold/power/exp line, even while it is still being written.
   if(/^\s*\[/.test(text)){const attrs=parseAttributes(text);if(attrs)renderAttributes(attrs);return;}
   const el=$('#engine-status'),num=re=>text.match(re);el.title=text;if(/T:\d+/.test(text))S.airborne=airborneStatus(text);
   const gold=num(/\$:(\d+)/),power=num(/Pw:(\d+)\((\d+)\)/),exp=num(/Exp:(\d+)/);
   if(!gold&&!power&&!exp){el.textContent=text;return;}
   // The frame's own condition list (bridge) wins; the status line's words are the fallback.
   const conditions=heroConditions(S.frameConditions,text),others=conditions.filter(c=>!conditionTags([c]).length);
   applyStatusScreen(statusScreenEl(),conditions);
   {const turn=num(/T:(\d+)/);statusScreenEl().style.setProperty('--status-progress',worstProgress(statusProgress.update(conditions,turn?+turn[1]:0,S.frameCountdowns)).toFixed(2));}
   el.innerHTML=[gold&&`<span>GOLD <b>${gold[1]}</b></span>`,power&&`<span>POWER <b>${power[1]} / ${power[2]}</b></span>`,exp&&`<span>EXP <b>${exp[1]}</b></span>`,`<span id="hero-conditions">${conditionTagsHtml(conditions)}</span>`,...others.map(c=>`<span class="condition"><i aria-hidden="true">${conditionGlyph(c)}</i> ${esc(c)}</span>`)].filter(Boolean).join('');
 }
export function renderAttributes(L,{attributes,alignment}){const {S,attributesEl,esc}=L;
   S.heroStrength=attributes.find(a=>a.label==='STR')?.value;
   attributesEl.innerHTML=attributes.map(({label,value})=>`<span>${label} <b>${esc(value)}</b></span>`).join('')+(alignment?`<span class="alignment">${esc(alignment.toUpperCase())}</span>`:'');
 }
export function announceLevel(level,L){const {S,levelBanner,esc}=L;
   if(level.title===S.shownTitle)return;S.shownTitle=level.title;if(!level.named)return;
   levelBanner.innerHTML=`<small>${esc(level.place)}</small><strong>${esc(level.title)}</strong>`;
   levelBanner.classList.remove('show');void levelBanner.offsetWidth;levelBanner.classList.add('show');
 }
