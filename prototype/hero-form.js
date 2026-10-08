import * as THREE from 'three';

// While the hero is polymorphed the bridge sends player.form (the species name, "" in normal form).
// The Valkyrie's own parts are hidden, held weapon included, and that species' monster model stands
// in her place, scaled to keep her tile.
export const FORM_FOOTPRINT = 1.3;
export const FORM_HEIGHT = 2.6;

export function formScale(box) {
  const size = box.getSize(new THREE.Vector3());
  const wide = Math.max(size.x, size.z, 1e-6), tall = Math.max(size.y, 1e-6);
  return Math.min(FORM_FOOTPRINT / wide, FORM_HEIGHT / tall, 1.6);
}

export function createHeroForm(hero, creatureFactory, onShape) {
  let current = '', shape = null, hidden = [];
  const drop = () => {
    if (shape) hero.g.remove(shape);
    shape = null;
    for (const c of hidden) c.visible = true;
    hidden = [];
  };
  return {
    get current() { return current; },
    get shape() { return shape; },
    sync(form) {
      const name = typeof form === 'string' ? form.trim().toLowerCase() : '';
      if (name === current) return false;
      drop();
      current = name;
      if (!name) return true;
      let made = null;
      try { made = creatureFactory({ name }); } catch { made = null; }
      if (!made?.g) { current = ''; return true; }
      hidden = hero.g.children.filter(c => c.visible);
      for (const c of hidden) c.visible = false;
      const box = new THREE.Box3().setFromObject(made.g);
      if (!box.isEmpty()) made.g.scale.multiplyScalar(formScale(box));
      shape = made.g;
      hero.g.add(shape);
      onShape?.(shape);
      return true;
    },
  };
}
