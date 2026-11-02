// The hero's death in Live: the bones laid on her square once the fall has played out, the crossfade from body to
// bones, and clearing them for a life saved or a new level. Moved out of live.js unchanged; it reads from L.
import {createCorpse} from './corpse.js';
import {applyFade,restoreFade} from './deaths.js';

export function layHeroBones(L){const {S,group}=L;if(S.heroCorpse||!S.latest?.player)return;S.heroCorpse=createCorpse(S.latest.player.role||'human',15,(S.latest.player.x*7+S.latest.player.z)|0);S.heroCorpse.position.set(S.latest.player.x-S.origin.x,0,S.latest.player.z-S.origin.z);S.heroCorpse.traverse(o=>{if(o.isMesh&&o.material){o.material.transparent=true;o.material.opacity=0;}});group.add(S.heroCorpse);}
export function crossfadeHeroBones(f,L){const {S,hero}=L;if(!S.heroCorpse)return;applyFade(hero,1-f);S.heroCorpse.traverse(o=>{if(!o.isMesh||!o.material)return;o.material.opacity=f;if(f>=1)o.material.transparent=false;});if(f>=1)hero.g.visible=false;}
export function clearHeroBones(L){const {deathBeat,S,group,hero}=L;deathBeat.clear();if(S.heroCorpse){group.remove(S.heroCorpse);S.heroCorpse.userData.dispose?.();S.heroCorpse=null;}restoreFade(hero);hero.g.visible=true;}
