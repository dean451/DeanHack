// The reference cat's numbers, shared by the animation (feline-gait.js) and the measuring
// (cat-measure.js). Each comes from cat-motion/README.md, whose research notes cite the papers.
// The reference cat: an adult of ~4 kg, head-and-body 0.48 m, hip joint 0.23 m off the floor.
// Our cats are scaled to it by hip height, not body length: gait scales with leg length (dynamic
// similarity), and the game's cats have shorter legs for their bodies than a real one.
// Ranges are [low, high]; `src` names the section of the README they come from.
export const REFERENCE = {
  bodyLength: .48, hipHeight: .23,
  walk: {
    speedMs: [.6, .7], strideM: [.44, .49], strideHz: [1.2, 1.4], swingS: [.2, .3], duty: [.55, .7], diagonality: [.2, .3],
    headTravelCm: [1, 2], headPitchDeg: [2, 4], headBobsPerStride: 2, plantedCm: [-.3, .5], lowestCm: [-.3, 0], src: '§2, §3, §5',
  },
  // interior angles (degrees) of the hind leg at paw contact, paw off and peak swing flexion (§3)
  hind: {
    contact: {hip: 92, knee: 115, ankle: 115}, off: {hip: 135, knee: 120, ankle: 139, at: .62},
    flex: {hip: [91, 8, .9], knee: [98, 9, .8], ankle: [102, 9, .8]}, // [mean, sd, phase]
    // research/hindlimb.md §1c: CONSTRUCTED between the anchors, not measured
    curve: [[0, 92, 115, 115], [.1, 100, 108, 108], [.2, 110, 107, 108], [.3, 118, 110, 115], [.4, 125, 114, 125], [.5, 131, 118, 133], [.62, 135, 119.5, 139], [.7, 115, 105, 115], [.8, 100, 98, 102], [.9, 91, 108, 110], [1, 92, 115, 115]],
  },
  gaits: {walk: [0, 1], trot: [1.2, 2], gallop: [2.1, 6]}, // m/s (§1)
};
