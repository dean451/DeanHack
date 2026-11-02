// The live game's source as one text: live.js and the parts split out of it. Source tests (chrome.test.js and
// many more) check how live.js wires things; reading this instead lets code move between the parts unchanged.
import {readFileSync} from 'node:fs';

export const LIVE_PARTS = ['live.js', 'live-ground-icon.js', 'live-tile-dress.js', 'live-hud.js', 'live-torch-lights.js', 'live-prompt.js', 'live-messages.js', 'live-apply.js', 'live-engine-link.js', 'live-combat.js', 'live-status.js', 'live-hero-death.js', 'live-frame.js'];
export const liveSource = () => LIVE_PARTS.map(f => readFileSync(new URL(`./${f}`, import.meta.url), 'utf8')).join('\n');
