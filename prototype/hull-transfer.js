// A grown hull ({geometry, details}) as plain arrays for postMessage, and back. The skin takes seconds to
// grow (feline-hull.js marches a fine grid), so the pets' looks grow in a worker (feline-hull-worker.js) and
// cross to the page as transferable arrays, without copying.
import * as THREE from 'three';

function packGeometry(g, transfer) {
  if (!g) return null;
  const attributes = {};
  for (const [name, a] of Object.entries(g.attributes)) { attributes[name] = {array: a.array, itemSize: a.itemSize, normalized: a.normalized}; transfer.push(a.array.buffer); }
  const index = g.index ? g.index.array : null;
  if (index) transfer.push(index.buffer);
  return {attributes, index, groups: g.groups, userData: g.userData};
}

function unpackGeometry(p) {
  if (!p) return null;
  const g = new THREE.BufferGeometry();
  for (const [name, a] of Object.entries(p.attributes)) g.setAttribute(name, new THREE.BufferAttribute(a.array, a.itemSize, a.normalized));
  if (p.index) g.setIndex(new THREE.BufferAttribute(p.index, 1));
  for (const gr of p.groups || []) g.addGroup(gr.start, gr.count, gr.materialIndex);
  Object.assign(g.userData, p.userData || {});
  return g;
}

export function packHull(hull) {
  const transfer = [];
  return {data: {geometry: packGeometry(hull.geometry, transfer), details: packGeometry(hull.details, transfer)}, transfer: [...new Set(transfer)]};
}

export function unpackHull(data) { return {geometry: unpackGeometry(data.geometry), details: unpackGeometry(data.details)}; }
