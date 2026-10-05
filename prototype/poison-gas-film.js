import * as THREE from 'three';

// Gas over water leaves a sickly film on the surface: a flat, ragged oily skin under the bank
// that slowly crawls, turns and breathes in and out, never quite the same shape twice. One flat
// mesh per cloud over water, with a shared geometry and its own material, none elsewhere.
// poison-cloud-roil.js attaches it over water and detaches it when the ground changes. Everything
// is a function of t (frame-rate independent).
export const GAS_FILM_REACH = .44; // widest radius of the film, tile units
export const GAS_FILM_OPACITY = .32; // peak opacity
const FILM_COLOR = 0x6f7d2a; // oily yellow-green

let sharedGeo = null;
// A ragged ten-point blob (the radius alternates short and long), flat on the water.
const geo = () => sharedGeo ??= (() => {
  const shape = new THREE.Shape(), n = 10;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, r = i % 2 ? .72 : 1;
    i ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(r, 0);
  }
  return new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
})();

export function filmState(t, phase = 0) {
  const breath = Math.sin(t * .9 + phase) * .6 + Math.sin(t * 2.1 + phase * 1.9) * .4;
  return {
    spin: t * .12 + Math.sin(t * .5 + phase) * .25,
    radius: GAS_FILM_REACH * (.88 + breath * .12),
    stretch: 1 + Math.sin(t * .7 + phase * 1.3) * .12,
    opacity: GAS_FILM_OPACITY * (.8 + breath * .2),
  };
}

export function attachGasFilm(cloud) {
  const mat = new THREE.MeshBasicMaterial({color: FILM_COLOR, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide});
  const film = new THREE.Mesh(geo(), mat);
  film.name = 'GasFilm';film.position.y = .02;film.scale.setScalar(1e-5);film.castShadow = film.receiveShadow = false;film.frustumCulled = false;
  cloud.add(film);
  return film;
}

export function poseGasFilm(film, t, phase = 0) {
  const s = filmState(t, phase);
  film.rotation.y = s.spin;film.scale.set(s.radius * s.stretch, 1, s.radius / s.stretch);film.material.opacity = s.opacity;
}

export function detachGasFilm(film) {
  film.material.dispose();
  film.removeFromParent();
}
