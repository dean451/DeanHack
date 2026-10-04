// The pickup lift (magic item moments, part 2). When the hero picks up a magic item from the floor
// it does not vanish: it lifts a hand's breadth toward the hero and shrinks into the pack over
// about a third of a second. No flash; claiming it is quiet. Mundane items still just go.
export const PICKUP_DURATION = .35;
export const PICKUP_RISE = .45;
// How close (world units) the hero must be for a vanished item to count as picked up.
export const PICKUP_RADIUS = 1.2;
const AURA_KEYS = ['wandAura', 'scrollAura', 'potionFx', 'ringAura', 'amuletAura', 'weaponAura', 'artifactGleam'];

export const hasMagicLook = item => AURA_KEYS.some(key => item.userData[key]);

// Lift height and scale at `age` seconds: a hitch of anticipation (a tiny dip), then a quick rise
// that shrinks away. Scale is exactly 0 at the end so the item is gone before it is released.
export function pickupLiftAt(age) {
  const u = Math.min(1, Math.max(0, age / PICKUP_DURATION));
  const dip = u < .2 ? -.04 * Math.sin(Math.PI * u / .2) : 0;
  const rise = u < .2 ? 0 : 1 - (1 - (u - .2) / .8) ** 2;
  return {y: dip + PICKUP_RISE * rise, scale: u < .2 ? 1 : 1 - ((u - .2) / .8) ** 1.5};
}

// Advances a lifting item toward `hero` ({x, z}); returns true once finished (release it).
export function updatePickupLift(item, hero, dt) {
  const data = item.userData;
  data.liftAge = (data.liftAge ?? 0) + dt;
  data.liftBase ??= {x: item.position.x, z: item.position.z};
  const {y, scale} = pickupLiftAt(data.liftAge), pull = Math.min(1, data.liftAge / PICKUP_DURATION) ** 2 * .5;
  item.position.set(data.liftBase.x + (hero.x - data.liftBase.x) * pull, y, data.liftBase.z + (hero.z - data.liftBase.z) * pull);
  item.scale.setScalar(Math.max(scale, 1e-4));
  return data.liftAge >= PICKUP_DURATION;
}
