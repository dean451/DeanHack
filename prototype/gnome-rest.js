// The resting gnome (family G, stage 4): the humanoid slump (humanoid-rest.js) solved on the gnome's own joints,
// which rigHumanoid gives it as it gives the goblins: the pelvis down on the floor, the stubby legs out ahead, the
// back stooped, the big head hung low over the beard, the hands on the thighs. CREATURE-MEASURES.md (Gnomes) found no
// sit or sleep for a short-legged person, so the slump's shares stand as set by eye. A gnome's boot sole is thin and
// its toe tips down as the leg folds: the slump's every-fourth-vertex floor check stepped over the nine vertices that
// went 2 cm under. Checked at every vertex, the solver stalls with the pelvis 7 cm up (the shins' skin pins it), so the
// gnome's hide is checked at every third vertex, which catches the sole and meets every goal; gnome-rest.test.js then
// checks every vertex of every mesh against the standing boots.
import {restPose as humanoidRest, rests as humanoidRests} from './humanoid-rest.js';

export const isGnomeBody = a => a?.quirk === 'gnome';
export const rests = a => isGnomeBody(a) && humanoidRests(a);
export const restPose = a => humanoidRest(a, {every: 3});
