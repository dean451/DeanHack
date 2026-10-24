import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildValkyrie, PALETTE, TORSO, BELL, HELM, torsoWarp, torsoSurface} from './hero-valkyrie.js';
import {surfaceGap} from './fit-check.js';

// A stand-in for knight()'s rig with its real measures (main.js): the groups the suit hangs on, and
// dense copies of the body it must sit on (neck, thigh, shin, upper arm, elbow, forearm).
const G = () => new THREE.Group(), M = () => new THREE.MeshStandardMaterial();
const solid = (geo, parent, [x, y, z] = [0, 0, 0], [sx, sy, sz] = [1, 1, 1]) => { const m = new THREE.Mesh(geo, M()); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m; };
function rig() {
  const g = G(), body = G(); g.add(body);
  const head = G(); head.position.set(0, 1.23, .02); body.add(head);
  const arm = G(); arm.position.set(.3, .92, 0); body.add(arm);
  const elbow = G(); elbow.position.y = -.25; elbow.rotation.x = -.65; arm.add(elbow);
  const shieldArm = G(); shieldArm.position.set(-.3, .91, 0); body.add(shieldArm);
  const shieldElbow = G(); shieldElbow.position.y = -.25; shieldElbow.rotation.x = -.9; shieldArm.add(shieldElbow);
  const legs = [-.122, .122].map(x => { const l = G(); l.position.set(x, .49, 0); body.add(l); return l; });
  const mats = Object.fromEntries(['armor', 'armorLight', 'leather', 'accent', 'boots', 'hairDark', 'hairMid', 'hairLight'].map(k => [k, M()]));
  const v = buildValkyrie({body, head, arm, elbow, shieldArm, shieldElbow, legs}, mats, {keep: true});
  // the body under the suit, densely meshed so a nearest-vertex gap means something
  const torso = [];for (let y = TORSO[0][1]; y <= 1.0001; y += .005) { let r = TORSO[0][0]; for (let i = 1; i < TORSO.length; i++) if (y <= TORSO[i][1] + 1e-9) { const [r0, y0] = TORSO[i - 1], [r1, y1] = TORSO[i]; r = r0 + (r1 - r0) * (y - y0) / (y1 - y0); break; } torso.push(new THREE.Vector2(r, y)); }
  const tg = new THREE.LatheGeometry(torso, 64); const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const [x, y, z] = torsoWarp(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, x, y, z); }
  const stand = {
    torso: solid(tg, body),
    neck: solid(new THREE.CylinderGeometry(.11, .13, .14, 32, 28), body, [0, 1.04, .02]),
    bell: solid(new THREE.LatheGeometry(BELL.map(([r, y]) => new THREE.Vector2(r, y)).reverse().flatMap((v, i, a) => i ? Array.from({length: 8}, (_, k) => a[i - 1].clone().lerp(v, (k + 1) / 8)) : [v]), 64), body, [0, 0, 0], [1, 1, .82]),
    thighs: legs.map(l => solid(new THREE.SphereGeometry(.074, 48, 48), l, [0, -.14, 0], [.91, 2, 1])),
    shins: legs.map(l => solid(new THREE.CylinderGeometry(.056, .062, .22, 40, 30), l, [0, -.30, 0])),
    upperArms: [solid(new THREE.CylinderGeometry(.056, .044, .25, 40, 30), arm, [0, -.12, 0]), solid(new THREE.CylinderGeometry(.056, .044, .25, 40, 30), shieldArm, [0, -.13, 0])],
    elbows: [solid(new THREE.SphereGeometry(.062, 32, 24), elbow), solid(new THREE.SphereGeometry(.062, 32, 24), shieldElbow)],
    forearms: [solid(new THREE.CylinderGeometry(.048, .036, .22, 40, 30), elbow, [0, -.12, 0]), solid(new THREE.CylinderGeometry(.048, .036, .22, 40, 30), shieldElbow, [0, -.1, 0])],
  };
  g.updateMatrixWorld(true);
  return {g, body, head, legs, v, stand};
}
// The kept pieces under a tag, as meshes on their rig part (each anchor separately when asked).
const pieces = (r, tag, anchor) => { const g = G(); for (const p of r.v.pieces[tag] || []) if (!anchor || p.anchor === anchor) { const m = new THREE.Mesh(p.geometry, M()); p.anchor.add(m); g.add(m.clone()); m.removeFromParent(); } return g; };
const onPart = (r, tag, anchor) => { const g = G(); anchor.add(g); for (const p of r.v.pieces[tag] || []) if (p.anchor === anchor) g.add(new THREE.Mesh(p.geometry, M())); g.updateMatrixWorld(true); return g; };
const box = o => { o.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o); };
const verts = o => { const out = []; o.updateMatrixWorld(true); o.traverse(m => { const pos = m.isMesh && m.geometry.attributes.position; if (pos) for (let i = 0; i < pos.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld)); }); return out; };

test('two steel wings rise from the helm, one each side, swept back and standing well above it', () => {
  const r = rig(), helm = onPart(r, 'helmShell', r.head), wings = onPart(r, 'wing', r.head);
  const top = box(helm).max.y, helmVerts = verts(helm);
  for (const side of [-1, 1]) {
    const mine = verts(wings).filter(p => Math.sign(p.x) === side);
    assert.ok(mine.length > 100, 'a wing on each side');
    const peak = mine.reduce((a, b) => b.y > a.y ? b : a);
    assert.ok(peak.y > top + .25, `the wing tip stands ${(peak.y - top).toFixed(2)} above the helm (photo: well above it)`);
    assert.ok(peak.z < r.head.position.z - .1, 'and sweeps back behind the head');
    assert.ok(Math.abs(peak.x) > .2, 'splayed out from the head, so it reads from the front and from above');
    const root = Math.min(...mine.filter((p, i) => i % 7 === 0).map(p => Math.min(...helmVerts.map(q => p.distanceTo(q)))));
    assert.ok(root < .02, `the wing grows out of the helm, not beside it: ${root.toFixed(3)}`);
  }
});

test('the hair is deep crimson, grows from under the helm and lies on her shoulders and back', () => {
  for (const k of ['hairDark', 'hairMid', 'hairLight']) {
    const hsl = new THREE.Color(PALETTE[k]).getHSL({}, THREE.SRGBColorSpace);
    assert.ok(hsl.h < .03 || hsl.h > .97, `${k} is red`); assert.ok(hsl.s > .6, `${k} is saturated, the one colour on her`); assert.ok(hsl.l < .45, `${k} is deep, not pink`);
  }
  for (const k of ['armor', 'armorLight', 'boots', 'glove']) assert.ok(new THREE.Color(PALETTE[k]).getHSL({}, THREE.SRGBColorSpace).s < .12, `${k} is grey steel, not coloured`);
  const r = rig(), helmBottom = HELM[0];
  assert.ok(r.v.hairPaths.length >= 10, 'a full head of locks');
  for (const {points, r0} of r.v.hairPaths) {
    const root = points[0].clone().sub(r.head.position);
    assert.ok(root.y > helmBottom[1] && Math.hypot(root.x, root.z) < helmBottom[0], 'each lock starts inside the helm');
    for (const p of points.filter(q => q.y < .99)) {
      const s = torsoSurface(Math.atan2(p.x, p.z), p.y), out = Math.hypot(p.x, p.z) - Math.hypot(s.x, s.z);
      assert.ok(out > 0 && out < r0 + .035, `a lock lies on the breastplate, not in it or off it: ${out.toFixed(3)} at y ${p.y.toFixed(2)}`);
    }
  }
  assert.ok(r.v.hairPaths.some(({points}) => points.at(-1).z > .1 && points.at(-1).x < 0), 'one lock falls in front, over the shoulder away from the sword arm');
  assert.ok(r.v.hairPaths.filter(({points}) => points.at(-1).z < -.05).length >= 6, 'and the rest spills down her back');
});

test('the plated skirt\'s centre panel tapers to a point at the front', () => {
  const r = rig(), panel = verts(onPart(r, 'chevron', r.body));
  const low = panel.reduce((a, b) => b.y < a.y ? b : a);
  assert.ok(Math.abs(low.x) < .005, 'the lowest point is on the centre line');
  assert.ok(panel.filter(p => Math.abs(p.x) > .05).every(p => p.y > low.y + .08), 'the sides stop well above it: a point, not a hem');
  assert.ok(low.z > .1 && low.y > .3 && low.y < .4, 'at the front, ending at mid-thigh');
});

test('nothing floats: every piece sits on the body it covers', () => {
  const r = rig(), s = r.stand, gap = (tag, body, anchor = r.body) => surfaceGap(onPart(r, tag, anchor), body, {step: 2});
  const both = (...objs) => { const g = G(); for (const o of objs) { const c = o.clone(); c.matrixAutoUpdate = false; c.matrix.copy(o.matrixWorld); g.add(c); } g.updateMatrixWorld(true); return g; };
  const checks = [
    ['belt', gap('belt', s.torso), .02], ['plackart', gap('plackart', s.torso), .02], ['gorget', gap('gorget', both(s.torso, s.neck)), .032], // its lowest ring tucks under the shoulder plate, so its sides are buried, not loose
    ['mail skirt on the hips', gap('mailSkirt', s.bell), .01], ['tassets', gap('tasset', s.bell), .03], ['chevron panel', gap('chevron', s.bell), .035],
  ];
  for (const [i, arm] of [r.body.children.find(o => o.position.x === .3), r.body.children.find(o => o.position.x === -.3)].entries()) {
    const elbow = arm.children.find(o => o.isGroup && !o.isMesh && o.position.y === -.25);
    checks.push([`mail sleeve ${i}`, gap('mailSleeve', s.upperArms[i], arm), .015], [`vambrace ${i}`, gap('vambrace', s.forearms[i], elbow), .025], [`elbow mail ${i}`, gap('elbowMail', s.elbows[i], elbow), .01],
      // a pauldron stands off the arm (that is how it lets the arm move), but no further than a finger
      [`pauldron lames ${i}`, gap('pauldronLame', s.upperArms[i], arm), .05]);
  }
  for (const [i, leg] of r.legs.entries()) checks.push([`cuisse ${i}`, gap('cuisse', s.thighs[i], leg), .02], [`greave ${i}`, gap('greave', s.shins[i], leg), .022], [`knee cop ${i}`, gap('kneeCop', both(s.thighs[i], s.shins[i]), leg), .07], [`knee mail ${i}`, gap('kneeMail', both(s.thighs[i], s.shins[i]), leg), .02]);
  for (const [name, d, limit] of checks) assert.ok(d < limit, `${name}: ${d.toFixed(3)} off the body (limit ${limit})`);
  // and none of it is inside what it covers: the belt and plackart are outside the breastplate everywhere
  for (const tag of ['belt', 'plackart']) for (const p of verts(onPart(r, tag, r.body))) { const t = torsoSurface(Math.atan2(p.x, p.z), p.y); assert.ok(Math.hypot(p.x, p.z) > Math.hypot(t.x, t.z) - .002, `${tag} does not cut into the plate`); }
});

test('the helm is head-sized, closed, and its bevor narrows to a beak', () => {
  const r = rig(), shell = verts(onPart(r, 'helmShell', r.head)).map(p => p.sub(r.head.position));
  const h = Math.max(...shell.map(p => p.y)) - Math.min(...shell.map(p => p.y)), w = Math.max(...shell.map(p => p.x)) * 2;
  assert.ok(h < .34 && w < .31, `about a seventh of her height and no wider than her neck guard allows: ${h.toFixed(2)} x ${w.toFixed(2)}`);
  const width = y => Math.max(...shell.filter(p => Math.abs(p.y - y) < .012 && p.z > .05).map(p => Math.abs(p.x)));
  assert.ok(width(-.12) < width(.03) * .8, 'narrower at the chin than at the eyes');
  const prow = Math.max(...shell.filter(p => p.y < -.06).map(p => p.z)), cheek = Math.max(...shell.filter(p => p.y < -.06 && Math.abs(p.x) > .06).map(p => p.z));
  assert.ok(prow > cheek + .04, 'the front comes to a ridge, a beak, not a flat face plate');
});

test('the suit costs a few dozen draws, rivets and all', () => {
  const r = rig();
  assert.ok(r.v.objects.length <= 52, `${r.v.objects.length} meshes`);
  const n = r.v.objects.reduce((a, o) => a + o.geometry.attributes.position.count, 0);
  assert.ok(n < 56000, `${n} vertices`);
  assert.ok(r.v.objects.every(o => o.userData.valkyrie), 'every mesh is tagged as hers, so the kit can hide it');
});
