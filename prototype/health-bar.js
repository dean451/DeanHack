import * as THREE from 'three';

// A thin health bar over a monster, shown only once it is wounded. The bridge sends `health`
// (1 to 99, percent left) for a wounded monster the hero can see and nothing for one at full
// health, so a bar appearing is itself the news. How much is left is the bar's length, never its
// colour, so it reads the same to everyone; the fill is a dull red that stays out of the way.
export const BAR_WIDTH = 0.7;
export const BAR_HEIGHT = 0.024;

export function healthFraction(health) {
  return typeof health === 'number' && health > 0 && health < 100 ? health / 100 : null;
}

export function createHealthBar() {
  const g = new THREE.Group();
  g.name = 'health-bar';
  g.visible = false;
  const back = new THREE.Sprite(new THREE.SpriteMaterial({color: 0x0d0d10, transparent: true, opacity: 0.72, depthTest: false}));
  const fill = new THREE.Sprite(new THREE.SpriteMaterial({color: 0xa83a32, transparent: true, opacity: 0.95, depthTest: false}));
  for (const s of [back, fill]) {
    s.center.set(0, 0.5);
    s.position.x = -BAR_WIDTH / 2;
    s.renderOrder = 20;
  }
  back.scale.set(BAR_WIDTH + 0.03, BAR_HEIGHT + 0.012, 1);
  back.position.x -= 0.015;
  fill.scale.set(BAR_WIDTH, BAR_HEIGHT, 1);
  fill.position.z = 0.001;
  g.add(back, fill);
  g.userData.fill = fill;
  g.userData.dispose = () => { back.material.dispose(); fill.material.dispose(); };
  return g;
}

// Show the bar at `fraction` of its length, or hide it (null = undamaged).
export function setHealth(bar, fraction) {
  if (fraction == null) { bar.visible = false; return; }
  bar.visible = true;
  bar.userData.fill.scale.x = Math.max(0.02, BAR_WIDTH * fraction);
}

// Put the bar just over the top of an actor's model. The bar hangs off the actor's group, so
// the height is taken in the group's own units (the group may be scaled).
export function placeAbove(bar, actorGroup, margin = 0.18) {
  // measure the model alone, not the bar hanging off it
  const parent = bar.parent;
  if (parent) parent.remove(bar);
  const box = new THREE.Box3().setFromObject(actorGroup);
  if (parent) parent.add(bar);
  if (box.isEmpty()) { bar.position.y = 1.6; return; }
  const s = actorGroup.scale.y || 1;
  bar.position.y = (box.max.y - actorGroup.position.y) / s + margin / s;
}
