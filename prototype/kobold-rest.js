// The resting kobold: a hunched crouch, solved by role on the joints `rigImp` gives it (the kobolds share the imps'
// skeleton and role map). It is the imps' squat (imp-rest.js) with the kobold's own numbers: a kobold already
// stands in a crouch (KOBOLD.crouchKnee, about 30 degrees of knee flexion, CREATURE-MEASURES.md, Kobolds), so
// at rest it sinks lower than a monkey, the pelvis at most 0.7 of its standing height, with the feet kept close
// under it and the hands on the knees. The 0.7 is set by eye: no source gave a resting angle.
import {restPose as squat, rests as squats} from './imp-rest.js';

export const REST = {seat: .7, lap: .1, feet: .3};

export const rests = a => !!(a && squats(a) && a.quirk === 'kobold');

// Solves the crouch (the built pose is left as it was found).
export const restPose = a => squat(a, REST);
