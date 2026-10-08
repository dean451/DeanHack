import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {ARTIFACTS, artifactFromName} from './artifact-gleam.js';

// Floor artifacts take their power in the material: the base item's shape stays, its metal is
// pulled toward the artifact's own glint colour and smoulders faintly in it (Stormbringer
// bleeds red, Frost Brand frosts, Fire Brand embers). Like artifact-gleam.js the look keys on
// the name as the hero sees it (`label`), never the true type. Excalibur burns brightest.
const MIX = .3, POWER = .2;
const POWER_BY_KIND = {
  excalibur: .32, stormbringer: .3, 'fire brand': .3, 'frost brand': .26,
  // The great non-weapon artifacts burn hardest: they are the strongest magic on the floor.
  'heart of ahriman': .38, 'orb of fate': .32, 'palantir of westernesse': .32, 'eye of the aethiopica': .32,
  'magic mirror of merlin': .28, 'eyes of the overworld': .28, mjollnir: .28, 'vorpal blade': .28,
};

// Shape twists: a few artifacts add one merged mesh in their glint colour, so the silhouette says
// what they are. The mirror lies flat (glass centred at x -.075, oval 1.18 wide), the card flat.
// The material is shared per colour and lives for the session, so no model has to free it.
const SHAPE_MATERIALS = new Map();
const shapeMaterial = hex => {
  if (!SHAPE_MATERIALS.has(hex)) SHAPE_MATERIALS.set(hex, new THREE.MeshStandardMaterial({color: hex, emissive: hex, emissiveIntensity: .5, metalness: .6, roughness: .35}));
  return SHAPE_MATERIALS.get(hex);
};
// Shapes take the model's group so ones that sit on a base item of varying size can measure it.
const SHAPES = {
  // A crown of seven sharp thorns round the frame, leaning outward like a broken halo.
  'magic mirror of merlin'() {
    const parts = [];
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, thorn = new THREE.ConeGeometry(.008, .05 + (i % 3) * .012, 4);
      thorn.rotateZ(-Math.cos(a) * .35); thorn.rotateX(Math.sin(a) * .35);
      thorn.translate(-.075 + Math.cos(a) * .118 * 1.18, .05, Math.sin(a) * .118);
      parts.push(thorn);
    }
    return parts;
  },
  // The ball is a freed prisoner's: a lit seam splits it round its belly and a broken shackle ring
  // hangs open above it. The ball rests on y=0, radius .16, centred a hair under .16.
  'iron ball of liberation'() {
    const R = .16, seam = new THREE.TorusGeometry(R * 1.012, .005, 6, 40), shackle = new THREE.TorusGeometry(.046, .004, 6, 18, Math.PI * 1.7);
    seam.rotateX(Math.PI / 2); seam.rotateZ(.3); seam.translate(0, R * .97, 0);
    shackle.rotateX(Math.PI / 2 - .35); shackle.translate(0, R * 1.97 + .075, 0);
    return [seam, shackle];
  },
  // The Eye of the Aethiopica is an eye that never shuts: a lit almond lid round the pendant with a
  // vertical slit pupil, lying just above the pendant (centred on the origin, lid 1.9 times as wide).
  'eye of the aethiopica'() {
    const lid = new THREE.TorusGeometry(.05, .004, 5, 28), slit = new THREE.BoxGeometry(.008, .004, .06);
    lid.rotateX(Math.PI / 2); lid.scale(1.9, 1, .55); lid.translate(0, .038, 0);
    slit.translate(0, .04, 0);
    return [lid, slit];
  },
  // The Heart of Ahriman beats: a thin lit ring on the floor round the stone, and five black-hot
  // shards standing round it, leaning in like the ribs of a cage. The stone spans about .34 wide.
  'heart of ahriman'() {
    const parts = [], ring = new THREE.TorusGeometry(.2, .004, 5, 36);
    ring.rotateX(Math.PI / 2); ring.translate(0, .006, 0);
    parts.push(ring);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + .3, shard = new THREE.ConeGeometry(.012, .09 + (i % 2) * .03, 4);
      shard.translate(0, .05 + (i % 2) * .015, 0);
      shard.rotateZ(Math.cos(a) * .3); shard.rotateX(-Math.sin(a) * .3);
      shard.translate(Math.cos(a) * .21, 0, Math.sin(a) * .21);
      parts.push(shard);
    }
    return parts;
  },
  // The Orb of Fate is bound by its own destiny: two thin lit rings cross round the glass at a slant,
  // like an armillary sphere. The orb is centred at y .14 with radius .105.
  'orb of fate'() {
    const a = new THREE.TorusGeometry(.122, .004, 5, 40), b = new THREE.TorusGeometry(.122, .004, 5, 40);
    a.rotateX(.55); a.translate(0, .14, 0);
    b.rotateY(Math.PI / 2); b.rotateX(-.55); b.translate(0, .14, 0);
    return [a, b];
  },
  // The palantir is a seeing-stone that stares back: a lit slit pupil stands on the front of the
  // glass, narrow as a cat's, with a tilted lit ring round its middle. Same orb, centred at y .14.
  'palantir of westernesse'() {
    const slit = new THREE.BoxGeometry(.008, .07, .006), ring = new THREE.TorusGeometry(.11, .003, 5, 40);
    slit.translate(0, .14, .105);
    ring.rotateX(Math.PI / 2 + .3); ring.translate(0, .14, 0);
    return [slit, ring];
  },
  // The sunstone throws eight thin cruel rays flat across the floor, like a black sun's corona.
  sunstone() {
    return Array.from({length: 8}, (_, i) => {
      const a = i / 8 * Math.PI * 2, ray = new THREE.ConeGeometry(.007, .09 + (i % 2) * .04, 4);
      ray.rotateZ(-Math.PI / 2); ray.translate(.1 + (i % 2) * .02, .008, 0); ray.rotateY(-a);
      return ray;
    });
  },
  // The moonstone lies in a thin lit crescent, an open arc round the gem like a waning moon.
  moonstone() {
    const arc = new THREE.TorusGeometry(.085, .005, 5, 24, Math.PI * 1.15);
    arc.rotateX(Math.PI / 2); arc.rotateY(.6); arc.translate(0, .008, 0);
    return [arc];
  },
  // The earthstone is walled by four squat jagged slabs, a cairn leaning in round the gem.
  earthstone() {
    return Array.from({length: 4}, (_, i) => {
      const a = i / 4 * Math.PI * 2 + .4, slab = new THREE.BoxGeometry(.03, .05 + (i % 2) * .02, .012);
      slab.translate(0, .03 + (i % 2) * .01, 0); slab.rotateX(-.25); slab.rotateY(-a + Math.PI / 2);
      slab.translate(Math.cos(a) * .09, 0, Math.sin(a) * .09);
      return slab;
    });
  },
  // The Eyes of the Overworld see too much: a lit ring hugs each lens and a slit pupil, narrow as a
  // cat's in the dark, lies across it. The lenses sit .058 either side of centre, .043 across.
  'eyes of the overworld'() {
    const parts = [];
    for (const s of [-1, 1]) {
      const ring = new THREE.TorusGeometry(.049, .003, 5, 28), slit = new THREE.BoxGeometry(.006, .004, .05);
      ring.rotateX(Math.PI / 2); ring.translate(s * .058, .012, 0);
      slit.translate(s * .058, .014, 0);
      parts.push(ring, slit);
    }
    return parts;
  },
  // A thin hard edge of light round the card, like a razor ground into its rim.
  'platinum yendorian express card'() {
    const w = .114, d = .09, t = .004;
    return [[0, -d, w, t], [0, d, w, t], [-w, 0, t, d], [w, 0, t, d]].map(([x, z, hx, hz]) => new THREE.BoxGeometry(hx * 2, .006, hz * 2).translate(x, .008, z));
  },
  // The Master Key of Thievery is the key to every lock: a lit halo ring floats round its bow and a
  // thin lit line runs down the shaft to the bit. The black iron key lies flat, bow at x -.1.
  'master key of thievery'() {
    const halo = new THREE.TorusGeometry(.068, .003, 5, 28), line = new THREE.BoxGeometry(.2, .004, .004);
    halo.rotateX(Math.PI / 2); halo.translate(-.1, .02, 0);
    line.translate(.03, .026, 0);
    return [halo, line];
  },
  // The mitre's brim is ringed in lit gilt and a black-hot cleft runs up its front, like a split
  // judgement. Every mitre base is about .26 wide and .125 tall, so it is fixed to that.
  'mitre of holiness'() {
    const band = new THREE.TorusGeometry(.128, .005, 5, 32), cleft = new THREE.BoxGeometry(.008, .08, .006);
    band.rotateX(Math.PI / 2); band.translate(0, .03, 0);
    cleft.translate(0, .08, .1);
    return [band, cleft];
  },
  // The staff of Aesculapius is wound by its serpent: a lit snake coils three turns down the shaft
  // from the head, ending in a flat wedge of head. The staff lies along x from -.23 to .23, y .011.
  'staff of aesculapius'() {
    const pts = Array.from({length: 49}, (_, i) => {
      const t = i / 48, a = t * Math.PI * 6;
      return new THREE.Vector3(.2 - t * .4, .011 + Math.sin(a) * .022, Math.cos(a) * .022);
    });
    const body = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 72, .0045, 5), head = new THREE.ConeGeometry(.009, .03, 4);
    head.rotateZ(Math.PI / 2); head.scale(1, .5, 1.2); head.translate(.21, .035, .01);
    return [body, head];
  },
  // The Sceptre of Might is crowned in lit spikes: five thin cruel points fan up and out round the
  // orb on its head, like a tyrant's crown. The head ball sits at x .25, y .028, radius .028.
  'sceptre of might'() {
    return [-1.2, -.6, 0, .6, 1.2].map((a, i) => {
      const spike = new THREE.ConeGeometry(.008, .05 + (i % 2 ? 0 : .015), 4), r = .045;
      spike.rotateX(-a); spike.translate(.25, .028 + Math.cos(a) * r, Math.sin(a) * r);
      return spike;
    });
  },
  // Mjollnir carries the storm: a lit bolt forks across the top of the hammer head in three jagged
  // strokes, and a thin lit ring binds the haft below it. The head is .09 wide at x .17, top y .07.
  mjollnir() {
    const stroke = (x, z, w, d, r) => new THREE.BoxGeometry(w, .004, d).rotateY(r).translate(x, .073, z);
    const ring = new THREE.TorusGeometry(.016, .003, 5, 14);
    ring.rotateY(Math.PI / 2); ring.translate(.1, .012, 0);
    return [stroke(.185, -.022, .035, .005, .5), stroke(.165, 0, .04, .005, -.6), stroke(.18, .024, .03, .005, .4), ring];
  },
  // Stormbringer bleeds: a jagged lit crack runs down the blade in five slanted strokes, like a
  // wound that never closes. The blade lies along x from .04 to .46, .05 wide, top at y .012.
  stormbringer() {
    return [0, 1, 2, 3, 4].map(i => new THREE.BoxGeometry(.075, .003, .005).rotateY(i % 2 ? .6 : -.6).translate(.1 + i * .075, .0135, i % 2 ? .006 : -.006));
  },
  // Frost Brand is rimed: six thin lit shards of ice stand out of the edge along its length, leaning
  // outward, longer toward the point. The blade spans x .04 to .46 and z -.025 to .025.
  'frost brand'() {
    return Array.from({length: 6}, (_, i) => {
      const side = i % 2 ? -1 : 1, shard = new THREE.ConeGeometry(.006, .03 + i * .004, 4);
      shard.rotateX(side * Math.PI / 2); shard.translate(.1 + i * .06, .013, side * (.03 + i * .002));
      return shard;
    });
  },
  // Fire Brand burns: five lit tongues of flame stand up off the blade, taller toward the middle and
  // leaning back from the point. The blade spans x .04 to .46, top at y .012.
  'fire brand'() {
    return [0, 1, 2, 3, 4].map(i => {
      const tongue = new THREE.ConeGeometry(.01, .045 + (i % 3) * .015, 4);
      tongue.rotateZ(.25); tongue.translate(.1 + i * .075, .012 + .026 + (i % 3) * .008, i % 2 ? .008 : -.008);
      return tongue;
    });
  },
  // The Sunsword is a dawn laid on the steel: a lit disc on the blade with six flat rays spread round
  // it, laid down so the whole thing stays low. Disc centred at x .25.
  sunsword() {
    const parts = [new THREE.CylinderGeometry(.022, .022, .004, 10).translate(.25, .0145, 0)];
    for (let i = 0; i < 6; i++) {
      const ray = new THREE.ConeGeometry(.007, .05, 4);
      ray.rotateZ(-Math.PI / 2); ray.translate(.05, 0, 0); ray.rotateY(-(i / 6 * Math.PI * 2 + .3)); ray.translate(.25, .0145, 0);
      parts.push(ray);
    }
    return parts;
  },
  // The Vorpal Blade is all edge: a thin lit line runs down both edges of the blade and four lit nicks
  // bite across it, the cuts of a blade that goes snicker-snack. Blade z -.025 to .025.
  'vorpal blade'() {
    const parts = [];
    for (const side of [-1, 1]) parts.push(new THREE.BoxGeometry(.38, .003, .004).translate(.25, .0135, side * .026));
    for (let i = 0; i < 4; i++) parts.push(new THREE.BoxGeometry(.006, .003, .03).rotateY(i % 2 ? .5 : -.5).translate(.14 + i * .07, .0135, 0));
    return parts;
  },
  // Excalibur is the king's blade: a lit fuller runs down the middle of the steel and five lit rune
  // ticks cross it, spaced out like an inscription. Blade x .04 to .46, top at y .012.
  excalibur() {
    const parts = [new THREE.BoxGeometry(.34, .003, .006).translate(.25, .0135, 0)];
    for (let i = 0; i < 5; i++) parts.push(new THREE.BoxGeometry(.004, .003, .022).translate(.12 + i * .068, .0135, 0));
    return parts;
  },
  // Grayswandir is moonlit silver: five small lit diamonds are set down the flat of the blade, each a
  // little larger than the last toward the point, like studs of cold light.
  grayswandir() {
    return [0, 1, 2, 3, 4].map(i => new THREE.SphereGeometry(.008 + i * .0015, 4, 2).scale(1.4, .4, 1).translate(.12 + i * .07, .0135, 0));
  },
  // Orcrist is an orc-cleaver: three lit hooked barbs stand out of the back edge, bent toward the
  // point as if to catch and tear. Blade x .04 to .46, z -.025 to .025.
  orcrist() {
    return [0, 1, 2].map(i => {
      const hook = new THREE.ConeGeometry(.007, .04, 4);
      hook.rotateX(Math.PI / 2); hook.rotateY(.7); hook.translate(.17 + i * .09, .012, -.04);
      return hook;
    });
  },
  // Sting is a small cold blade: a thin lit line runs down the dagger and a lit spark sits on its
  // point. The dagger's blade ends at x .25.
  sting() {
    return [new THREE.BoxGeometry(.12, .003, .004).translate(.17, .0135, 0), new THREE.SphereGeometry(.008, 4, 2).translate(.235, .0135, 0)];
  },
  // Dragonbane is scaled with its quarry: a row of five lit overlapping scale-plates is laid down
  // the blade, each a flat diamond, getting smaller toward the point.
  dragonbane() {
    return [0, 1, 2, 3, 4].map(i => new THREE.CylinderGeometry(.016 - i * .002, .016 - i * .002, .003, 4).translate(.1 + i * .075, .0135, 0));
  },
  // Demonbane is a ward: a lit circle is sealed on the blade with a lit bar through it, the mark that
  // holds a devil back. Disc ring centred at x .25.
  demonbane() {
    const ring = new THREE.TorusGeometry(.024, .003, 5, 18), bar = new THREE.BoxGeometry(.07, .003, .004);
    ring.rotateX(Math.PI / 2); ring.translate(.25, .0135, 0);
    bar.translate(.25, .0135, 0);
    return [ring, bar];
  },
  // Werebane is a hunter's blade of the full moon: a lit crescent on the steel and three lit claw
  // gashes slashed across the blade behind it.
  werebane() {
    const moon = new THREE.TorusGeometry(.02, .004, 5, 14, Math.PI * 1.3);
    moon.rotateX(Math.PI / 2); moon.translate(.34, .0135, 0);
    const parts = [moon];
    for (let i = 0; i < 3; i++) parts.push(new THREE.BoxGeometry(.05, .003, .004).rotateY(.5).translate(.12 + i * .03, .0135, (i - 1) * .012));
    return parts;
  },
  // Cleaver is a butcher's blade: a lit heavy chop line runs along the edge and three lit notches
  // are bitten into the back, like a blade that has been used on bone.
  cleaver() {
    const parts = [new THREE.BoxGeometry(.3, .003, .005).translate(.27, .0135, .02)];
    for (let i = 0; i < 3; i++) parts.push(new THREE.BoxGeometry(.012, .003, .012).rotateY(.6).translate(.18 + i * .09, .0135, -.022));
    return parts;
  },
  // Giantslayer is a blade for felling the huge: a lit tall arrow-mark points toward the tip with two
  // lit bars across it, a tally of kills.
  giantslayer() {
    const shaft = new THREE.BoxGeometry(.2, .003, .005).translate(.24, .0135, 0);
    const head = new THREE.ConeGeometry(.012, .035, 4).rotateZ(-Math.PI / 2).scale(1, .3, 1).translate(.358, .0135, 0);
    return [shaft, head, new THREE.BoxGeometry(.004, .003, .026).translate(.17, .0135, 0), new THREE.BoxGeometry(.004, .003, .026).translate(.2, .0135, 0)];
  },
  // Trollsbane is a mark against regrowth: four lit parallel cuts are scored across the blade, and
  // a lit burn-ring sits near the hilt, the way a troll is cauterised so it cannot rise.
  trollsbane() {
    const ring = new THREE.TorusGeometry(.016, .003, 5, 14).rotateX(Math.PI / 2).translate(.1, .0135, 0);
    const parts = [ring];
    for (let i = 0; i < 4; i++) parts.push(new THREE.BoxGeometry(.004, .003, .04).rotateY(.5).translate(.2 + i * .065, .0135, 0));
    return parts;
  },
  // Magicbane is thick with stolen sorcery: a lit spiral of three loops coils around the blade and
  // five lit motes drift off its flat in a scatter.
  magicbane() {
    const parts = [];
    for (let i = 0; i < 3; i++) parts.push(new THREE.TorusGeometry(.016, .0025, 4, 12).rotateX(Math.PI / 2).translate(.15 + i * .09, .0135, 0));
    for (let i = 0; i < 5; i++) parts.push(new THREE.SphereGeometry(.005, 4, 2).translate(.1 + i * .075, .0135, i % 2 ? .035 : -.035));
    return parts;
  },
  // Ogresmasher is a crusher: a lit cracked-skull ring is struck on the blade, with three lit fracture
  // lines splitting out of it, the way a club breaks bone.
  ogresmasher() {
    const ring = new THREE.TorusGeometry(.02, .004, 5, 14).rotateX(Math.PI / 2).translate(.3, .0135, 0);
    const parts = [ring];
    for (let i = 0; i < 3; i++) parts.push(new THREE.BoxGeometry(.05, .003, .004).rotateY(i * 1.05 - 1.05 + .3).translate(.3, .0135, 0));
    return parts;
  },
  // Thiefbane is a snare for light fingers: a lit hook-and-eye pair sits on the blade, a barb curling
  // back over a small ring, the way a thief's wrist is caught.
  thiefbane() {
    const ring = new THREE.TorusGeometry(.012, .0025, 4, 12).rotateX(Math.PI / 2).translate(.18, .0135, 0);
    const barb = new THREE.ConeGeometry(.007, .05, 4).rotateZ(-Math.PI / 2).translate(.3, .0135, .012);
    return [ring, barb];
  },
  // Grimtooth is a vicious little fang: a row of four lit teeth is set along the edge of the dagger,
  // each leaning toward the point. The dagger's blade ends at x .25.
  grimtooth() {
    return [0, 1, 2, 3].map(i => new THREE.ConeGeometry(.006, .03 - i * .003, 4).rotateX(Math.PI / 2).rotateY(.5).translate(.1 + i * .035, .0135, .016));
  },
  // Snickersnee is a slicer: a single long lit hairline runs the length of the blade and two short lit
  // nicks cut across the edge near the point, a keen edge that has seen use.
  snickersnee() {
    const parts = [new THREE.BoxGeometry(.34, .003, .003).translate(.26, .0135, .012)];
    for (let i = 0; i < 2; i++) parts.push(new THREE.BoxGeometry(.004, .003, .02).translate(.36 + i * .05, .0135, .02));
    return parts;
  },
  // Itlachiayaque is a shield that watches: a lit ring on its face and six spikes of obsidian light
  // laid flat round the rim. Shield bases differ in size, so both are measured from the model.
  itlachiayaque(group) {
    const box = new THREE.Box3().setFromObject(group), R = (box.max.x - box.min.x) / 2, y = box.max.y + .004;
    const ring = new THREE.TorusGeometry(R * .62, .005, 5, 32), parts = [ring];
    ring.rotateX(Math.PI / 2); ring.translate(0, y, 0);
    for (let i = 0; i < 6; i++) {
      const spike = new THREE.ConeGeometry(.012, R * .35, 4);
      spike.rotateZ(-Math.PI / 2); spike.translate(R * .95, y, 0); spike.rotateY(-(i / 6 * Math.PI * 2 + .2));
      parts.push(spike);
    }
    return parts;
  },
};

// Tints the item's own materials in `group` (disposal is unchanged). Returns the artifact key or null.
// `clone`: give each mesh its own copy of the material first, for models whose materials may be shared.
export function applyArtifactTwist(group, object, {clone = false} = {}) {
  const kind = object ? artifactFromName(object.label, object.class) : null;
  if (!kind || group.userData.artifact === kind) return kind && group.userData.artifact;
  const color = new THREE.Color(ARTIFACTS[kind].color), seen = new Set(), copies = new Map();
  group.traverse(o => {
    let m = o.material;
    if (!m?.color || !m.emissive || o.userData.magicShell) return;
    if (clone) {
      if (!copies.has(m)) copies.set(m, m.clone());
      m = o.material = copies.get(m);
    }
    if (seen.has(m)) return;
    seen.add(m);
    if (!m.vertexColors) m.color.lerp(color, MIX);
    m.emissive.copy(color);
    m.emissiveIntensity = Math.max(m.emissiveIntensity || 0, POWER_BY_KIND[kind] ?? POWER);
  });
  const shape = SHAPES[kind]?.(group);
  if (shape) {
    const mesh = new THREE.Mesh(mergeGeometries(shape), shapeMaterial(ARTIFACTS[kind].color));
    mesh.userData.magicShell = true; mesh.castShadow = true;
    group.add(mesh);
  }
  group.userData.artifact = kind;
  return kind;
}
