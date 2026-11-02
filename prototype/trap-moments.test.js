import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trapKind} from './trap.js';
import {isFireTrapMessage} from './fire-trap-jet.js';
import {isSqueakMessage} from './squeaky-board.js';
import {isBearTrapMessage} from './bear-trap-snap.js';
import {isSleepingGasMessage} from './sleeping-gas.js';
import {isFallingRockMessage} from './falling-rock.js';
import {shotKind} from './dart-trap.js';
import {isLandMineMessage} from './land-mine.js';
import {isRustTrapMessage} from './rust-trap.js';
import {isPitFallMessage, isPitSpikeMessage} from './pit-fall.js';
import {isPolyTrapMessage} from './poly-trap.js';
import {isMagicTrapMessage} from './magic-trap.js';
import {isAntiMagicMessage} from './anti-magic.js';
import {isWebMessage} from './web-snare.js';
import {isStatueTrapMessage} from './statue-trap.js';
import {isRollingTrapMessage} from './rolling-trap.js';
import {isIceTrapMessage} from './ice-trap.js';
import {isTeleportMessage} from './teleport-blink.js';
import {isPortalMessage} from './magic-portal.js';
import {trapdoorMessage} from './dig-drop.js';
import {liveSource} from './live-source.js';

// Every trap kind `trapKind` can return, the NetHack message that springs it, the module
// matcher keyed on that message, and the creator `live.js` wires in.
const MOMENTS = {
  fire: ['A tower of flame bursts from the floor!', isFireTrapMessage, 'createFireTrapJet'],
  squeaky: ['A board beneath you squeaks loudly.', isSqueakMessage, 'createSqueakyBoard'],
  jaws: ['A bear trap closes on your foot!', isBearTrapMessage, 'createBearTrapSnap'],
  gas: ['A cloud of gas puts you to sleep!', isSleepingGasMessage, 'createSleepingGas'],
  rubble: ['A trap door in the ceiling opens and a rock falls on your head!', isFallingRockMessage, 'createFallingRock'],
  arrow: ['An arrow shoots out at you!', shotKind, 'createDartTrap'],
  dart: ['A little dart shoots out at you!', shotKind, 'createDartTrap'],
  mine: ['KAABLAMM!!!', isLandMineMessage, 'createLandMine'],
  rust: ['A gush of water hits you!', isRustTrapMessage, 'createRustTrap'],
  pit: ['You fall into a pit!', isPitFallMessage, 'createPitFall'],
  barepit: ['You land on a set of sharp iron spikes!', isPitSpikeMessage, 'createPitFall'],
  polymorph: ['You feel a change coming over you.', isPolyTrapMessage, 'createPolyTrap'],
  magic: ['You hear a deafening roar!', isMagicTrapMessage, 'createMagicTrap'],
  antimagic: ['You feel your magical energy drain away.', isAntiMagicMessage, 'createAntiMagic'],
  web: ['You stumble into a spider web!', isWebMessage, 'createWebSnare'],
  statue: ['The statue comes to life!', isStatueTrapMessage, 'createStatueTrap'],
  rolling: ['Click!  You trigger a rolling boulder trap!', isRollingTrapMessage, 'createRollingTrap'],
  ice: ['A freezing cloud shoots up from the floor!', isIceTrapMessage, 'createIceTrap'],
  teleport: ['You are momentarily blinded by a flash of light.', isTeleportMessage, 'createTeleportBlink'],
  portal: ['You activated a magic portal!', isPortalMessage, 'createMagicPortal'],
  hatch: ['A trap door opens up under you!', trapdoorMessage, 'createDigDrop'],
  hole: ['There\'s a gaping hole under you!', trapdoorMessage, 'createDigDrop'],
};
// Kinds that still have no trigger moment. This list must shrink to nothing but the two
// magic-trap fates; the test fails when an entry gains a moment, so it cannot go stale.
const GAPS = ['vibrating', 'plate'];

function allKinds() {
  const kinds = new Set();
  for (const name of ['vibrating square', 'arrow trap', 'dart trap', 'squeaky board', 'sleeping gas trap',
    'rolling boulder trap', 'anti-magic field', 'statue trap', 'hole', 'pit']) kinds.add(trapKind(94, 0, name));
  for (let color = 0; color < 16; color++) kinds.add(trapKind(94, color));
  kinds.add(trapKind(34, 0));
  return [...kinds].filter(Boolean);
}

test('every trap kind has a trigger moment keyed on its NetHack message, or is a listed gap', () => {
  const kinds = allKinds();
  for (const kind of kinds) assert.ok(MOMENTS[kind] || GAPS.includes(kind), `trap kind ${kind} has no moment and is not listed`);
  for (const kind of Object.keys(MOMENTS)) assert.ok(kinds.includes(kind) || ['hatch', 'hole', 'barepit'].includes(kind) || kind === 'rubble', `stale entry ${kind}`);
  for (const gap of GAPS) assert.ok(kinds.includes(gap) && !MOMENTS[gap], `${gap} is no longer a gap: remove it from GAPS`);
});

test('each moment fires on its message and is wired into live.js', () => {
  const live = liveSource();
  for (const [kind, [message, matches, creator]] of Object.entries(MOMENTS)) {
    assert.ok(matches(message), `${kind}: matcher rejects "${message}"`);
    assert.ok(!matches('You see here a dagger.'), `${kind}: matcher is too loose`);
    assert.ok(new RegExp(`import \\{[^}]*\\b${creator}\\b`).test(live), `${kind}: live.js does not import ${creator}`);
    assert.ok(live.includes(`=${creator}(`), `${kind}: live.js never creates ${creator}`);
  }
});
