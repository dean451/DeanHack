import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The bone devil's own head and tail, on top of the shared demon rig in creatures.js. It was the stock demon
// with a plain skull and the spade tail. It is now a thing of dry bone and chitin:
// - the head: a long insect skull, a flat bone wedge of a face running forward to two slit nostrils, small dull
//   faceted eyes on the sides of it, a ridge of bony plates down the crown, two long hooked mandibles that
//   cross in front of the mouth, and a pair of antenna spurs swept back (one snapped short);
// - the tail: a scorpion's. Armoured bone segments rise behind the back and curl over it, each with a spur,
//   ending in a bulb and a hooked stinger beaded with venom.
// Opaque parts share materials so creatures.js's mergeStatic bakes them. Material names carry the tests.

const bare = geo => { geo.deleteAttribute('uv'); return geo.index ? geo.toNonIndexed() : geo; };
const V = a => new THREE.Vector3(...a);
const UP = new THREE.Vector3(0, 1, 0);
const aim = (geo, dir) => geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize()));
const mats = () => {
  const bone = new THREE.MeshStandardMaterial({color: '#cbbf9a', roughness: .65, flatShading: true}); bone.name = 'bone-devil-bone';
  const sting = new THREE.MeshStandardMaterial({color: '#2a2418', roughness: .4}); sting.name = 'bone-devil-sting';
  const void_ = new THREE.MeshStandardMaterial({color: '#0c0806', roughness: 1}); void_.name = 'bone-devil-void';
  const eye = new THREE.MeshStandardMaterial({color: '#2a2a0c', roughness: .6, emissive: '#5c6a12', emissiveIntensity: .55, flatShading: true}); eye.name = 'bone-devil-eye';
  return {bone, sting, void_, eye};
};

export function boneDevilHead(head) {
  const m = mats();
  head.scale.setScalar(1.4);
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; head.add(mesh); return mesh; };
  // the skull: a small braincase and a long flat wedge of face
  const cran = add(new THREE.IcosahedronGeometry(.085, 1), m.bone, 0, .005, -.03); cran.scale.set(.85, .8, 1.15);
  const face = add(new THREE.CylinderGeometry(.03, .062, .27, 6), m.bone, 0, -.012, .15); face.rotation.x = Math.PI / 2 + .1; face.scale.set(1, 1, .55);
  // the snout is ridged and stepped: a keel down the bridge, a plate on each cheek, a hard lower jaw wedge
  const keel = add(new THREE.BoxGeometry(.014, .02, .22), m.bone, 0, .03, .16); keel.rotation.x = .1;
  for (const s of [-1, 1]) {
    const cheek = add(new THREE.BoxGeometry(.012, .03, .15), m.bone, s * .036, -.006, .13); cheek.rotation.set(.1, s * .12, s * .5);
    const rib = add(new THREE.BoxGeometry(.01, .01, .09), m.bone, s * .026, .022, .225); rib.rotation.set(.1, -s * .2, s * .3);
  }
  const jaw = add(new THREE.BoxGeometry(.075, .016, .2), m.bone, 0, -.05, .15); jaw.rotation.x = .08;
  const chin = add(new THREE.ConeGeometry(.034, .07, 4), m.bone, 0, -.05, .27); chin.rotation.set(Math.PI / 2 + .1, 0, Math.PI / 4);
  add(new THREE.BoxGeometry(.05, .014, .06), m.void_, 0, -.04, .27);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(.01, .012, .03), m.void_, s * .012, .005, .27).rotation.x = .1;
  // compound eyes: small, dull and sick, set deep into the brow under a hard ridge
  for (const s of [-1, 1]) {
    const pit = add(new THREE.SphereGeometry(.03, 6, 4), m.void_, s * .062, .012, .06); pit.scale.set(.5, .8, 1.2);
    const eye = add(new THREE.IcosahedronGeometry(.018, 0), m.eye, s * .07, .012, .062); eye.scale.set(.6, 1, 1.3); eye.castShadow = false;
    const brow = add(new THREE.BoxGeometry(.022, .012, .07), m.bone, s * .062, .04, .06); brow.rotation.set(0, 0, -s * .5);
  }
  // a ridge of bony plates down the crown, shrinking toward the back
  for (let i = 0; i < 5; i++) {
    const p = add(new THREE.BoxGeometry(.012, .035 - i * .004, .05), m.bone, 0, .08 - i * .012, .1 - i * .052); p.rotation.x = -.35;
  }
  // two hooked mandibles that cross in front of the mouth
  const pts = s => new THREE.CatmullRomCurve3([V([s * .034, -.05, .1]), V([s * .045, -.052, .2]), V([s * .06, -.07, .3]), V([s * .03, -.075, .37]), V([-s * .02, -.06, .4])]);
  for (const s of [-1, 1]) {
    const mand = add(new THREE.TubeGeometry(pts(s), 12, .011, 4), m.bone); mand.geometry.deleteAttribute('uv');
    add(new THREE.ConeGeometry(.013, .05, 4), m.bone, -s * .024, -.058, .418).rotation.set(Math.PI / 2 - .2, 0, s * .5);
  }
  // antenna spurs swept back from the brow; the left is snapped to a stump
  for (const s of [-1, 1]) {
    const len = s < 0 ? .06 : .21;
    const sp = add(new THREE.CylinderGeometry(.004, .011, len, 4), m.bone, s * .05, .075 + len * .25, -.02 - len * .35); sp.rotation.set(-1.0, 0, -s * .35);
  }
  // a split down the left of the crown
  add(new THREE.BoxGeometry(.006, .004, .1), m.void_, -.03, .068, .02).rotation.set(0, .1, -.4);
  return head;
}

export function boneDevilTail(tail, {skin, glow}) {
  const m = mats();
  // the spine of the tail: out behind, up, and over toward the back
  const curve = new THREE.CatmullRomCurve3([[0, 0, 0], [0, -.06, -.14], [0, .02, -.27], [0, .17, -.33], [0, .32, -.28], [0, .43, -.15], [0, .43, -.03]].map(V));
  const seg = [], spur = [];
  const N = 7;
  for (let i = 0; i < N; i++) {
    const t0 = i / (N + 1), t1 = (i + 1) / (N + 1), a = curve.getPoint(t0), b = curve.getPoint(t1), d = b.clone().sub(a);
    const r = .07 - i * .0055;
    const g = new THREE.CylinderGeometry(r * .8, r, d.length() * 1.1, 6, 1); aim(g, d); const c = a.clone().add(b).multiplyScalar(.5); g.translate(c.x, c.y, c.z); seg.push(bare(g));
    // a spur on the outer face of each segment
    const out = new THREE.Vector3(0, 0, 0).addScaledVector(curve.getTangent(t1), 0); out.set(0, d.z, -d.y).normalize();
    const sp = new THREE.ConeGeometry(r * .6, r * 2.2, 4); aim(sp, out.clone().add(d.clone().normalize().multiplyScalar(-.5)));
    const sc = c.clone().addScaledVector(out, r * .9); sp.translate(sc.x, sc.y, sc.z); spur.push(bare(sp));
  }
  const bone = new THREE.Mesh(mergeGeometries([...seg, ...spur]), m.bone); bone.castShadow = true; tail.add(bone);
  // the bulb and the stinger, which hooks down and forward over the back
  const end = curve.getPoint(N / (N + 1)), tan = curve.getTangent(N / (N + 1));
  const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(.075, 1), m.sting); bulb.position.copy(end); bulb.scale.set(.9, 1, 1.25); bulb.castShadow = true; tail.add(bulb);
  const hook = new THREE.CatmullRomCurve3([end, end.clone().add(V([0, .02, .05])), end.clone().add(V([0, .0, .1])), end.clone().add(V([0, -.07, .13])), end.clone().add(V([0, -.15, .12]))]);
  const st = new THREE.Mesh(new THREE.TubeGeometry(hook, 8, .03, 5), m.sting); st.geometry.deleteAttribute('uv'); st.castShadow = true; tail.add(st);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.027, .08, 5), m.bone); tip.position.copy(hook.getPoint(1)).add(V([0, -.03, -.004])); tip.rotation.x = Math.PI; tip.castShadow = true; tail.add(tip);
  const drop = new THREE.Mesh(new THREE.SphereGeometry(.02, 6, 5), glow); drop.position.copy(hook.getPoint(1)).add(V([0, -.09, -.004])); drop.scale.set(.8, 1.4, .8); drop.castShadow = false; tail.add(drop);
  return tail;
}
