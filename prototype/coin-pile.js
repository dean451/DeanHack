// A dropped pile of gold: eighteen coins that fall and bounce into a heap. Each coin was two meshes (the
// disk and its stamp), 36 draws in every pass for one pile; here the coins of one material share one
// InstancedMesh, five draws in all, and the fall writes the instance matrices until every coin settles.
// The look is the same: the same three coin and two stamp materials, the same pieces, fall and bounce.
const STAMP_LIFT = .0115;

export function createCoinPile(THREE, parent, {pieces, coinMats, stampMats}) {
  const diskGeo = new THREE.CylinderGeometry(.046, .046, .02, 16), stampGeo = new THREE.CylinderGeometry(.016, .016, .003, 10);
  const coins = pieces.map(([x, z, layer, rotation, tiltX, tiltZ], i) => {
    const y = .016 + layer * .017;
    return {i, x, z, y: y + .42 + layer * .06, target: y, quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(tiltX, rotation, tiltZ)), velocity: 0, delay: layer * .09 + (x + .3) * .018, settled: false};
  });
  const sets = (geo, mats, lift) => mats.map((material, k) => {
    const mine = coins.filter(c => c.i % mats.length === k);
    const mesh = new THREE.InstancedMesh(geo, material, mine.length);
    mesh.castShadow = true;mesh.frustumCulled = false; // a hand-sized pile whose coins move: no bounds to keep current
    parent.add(mesh);
    return {mesh, mine, lift};
  });
  const groups = [...sets(diskGeo, coinMats, 0), ...sets(stampGeo, stampMats, STAMP_LIFT)];
  const m = new THREE.Matrix4(), at = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  function write() {
    for (const {mesh, mine, lift} of groups) {
      mine.forEach((c, n) => mesh.setMatrixAt(n, m.compose(at.set(c.x, c.y + lift, c.z), c.quaternion, one)));
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
  write();
  let age = 0, done = false;
  return {
    coins, meshes: groups.map(g => g.mesh),
    get settled() { return done; },
    // The fall: each coin waits its delay, drops under gravity and bounces until it comes to rest.
    update(dt) {
      if (done) return false;
      age += dt;let moved = false;done = true;
      for (const c of coins) {
        if (c.settled) continue;
        done = false;
        if (age < c.delay) continue;
        c.velocity -= 9.8 * dt;c.y += c.velocity * dt;moved = true;
        if (c.y <= c.target) { c.y = c.target;c.velocity *= -.16;if (Math.abs(c.velocity) < .35) c.settled = true; }
      }
      if (moved) write();
      return moved;
    },
    dispose() { diskGeo.dispose();stampGeo.dispose();for (const {mesh} of groups) mesh.dispose(); },
  };
}
