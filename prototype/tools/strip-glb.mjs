// Strips a GLB down to its meshes, materials and textures: no skins, no joints, no animations.
// Used to keep only the CC0 body of a model whose rig and clips carry a credit (the fox).
// Usage: node tools/strip-glb.mjs in.glb out.glb
import {readFileSync, writeFileSync} from 'node:fs';
const [inPath, outPath] = process.argv.slice(2);
const buf = readFileSync(inPath);
let json, bin, o = 12;
while (o < buf.length) {
  const len = buf.readUInt32LE(o), type = buf.readUInt32LE(o + 4), data = buf.subarray(o + 8, o + 8 + len);
  if (type === 0x4E4F534A) json = JSON.parse(data.toString()); else if (type === 0x004E4942) bin = data;
  o += 8 + len;
}
const keepAttr = new Set(['POSITION', 'NORMAL', 'TEXCOORD_0']);
const views = [], accessors = [], viewMap = new Map(), accMap = new Map(), chunks = [];
let offset = 0;
const copyView = i => {
  if (viewMap.has(i)) return viewMap.get(i);
  const v = json.bufferViews[i], bytes = bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
  const pad = (4 - (offset % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); offset += pad; }
  chunks.push(Buffer.from(bytes));
  const nv = {buffer: 0, byteOffset: offset, byteLength: v.byteLength}; if (v.byteStride) nv.byteStride = v.byteStride; if (v.target) nv.target = v.target;
  offset += v.byteLength; views.push(nv); viewMap.set(i, views.length - 1); return views.length - 1;
};
const copyAcc = i => {
  if (accMap.has(i)) return accMap.get(i);
  const a = {...json.accessors[i]}; a.bufferView = copyView(a.bufferView); delete a.sparse;
  accessors.push(a); accMap.set(i, accessors.length - 1); return accessors.length - 1;
};
const meshes = json.meshes.map(m => ({name: m.name, primitives: m.primitives.map(p => {
  const attributes = {}; for (const [k, v] of Object.entries(p.attributes)) if (keepAttr.has(k)) attributes[k] = copyAcc(v);
  const np = {attributes, mode: p.mode ?? 4}; if (p.indices !== undefined) np.indices = copyAcc(p.indices); if (p.material !== undefined) np.material = p.material; return np;
})}));
const images = (json.images || []).map(im => im.bufferView !== undefined ? {mimeType: im.mimeType, bufferView: copyView(im.bufferView)} : {uri: im.uri});
// one node per mesh, at the transform its old node had (rigged meshes are placed by the skin, so identity)
const nodes = json.nodes.filter(n => n.mesh !== undefined).map(n => { const nn = {name: n.name, mesh: n.mesh}; if (!n.skin) for (const k of ['translation', 'rotation', 'scale', 'matrix']) if (n[k]) nn[k] = n[k]; return nn; });
const out = {asset: {version: '2.0', generator: 'DeanHack strip-glb'}, scene: 0, scenes: [{nodes: nodes.map((_, i) => i)}], nodes, meshes,
  materials: json.materials, textures: json.textures, images, samplers: json.samplers, accessors, bufferViews: views, buffers: [{byteLength: offset}]};
for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
const binOut = Buffer.concat([...chunks, Buffer.alloc((4 - offset % 4) % 4)]);
let jsonBuf = Buffer.from(JSON.stringify(out)); jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc((4 - jsonBuf.length % 4) % 4, 0x20)]);
const header = Buffer.alloc(12); header.writeUInt32LE(0x46546C67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + binOut.length, 8);
const jh = Buffer.alloc(8); jh.writeUInt32LE(jsonBuf.length, 0); jh.writeUInt32LE(0x4E4F534A, 4);
const bh = Buffer.alloc(8); bh.writeUInt32LE(binOut.length, 0); bh.writeUInt32LE(0x004E4942, 4);
writeFileSync(outPath, Buffer.concat([header, jh, jsonBuf, bh, binOut]));
console.log(`${outPath}: ${meshes.length} mesh, ${accessors.length} accessors, ${images.length} image, ${12 + 16 + jsonBuf.length + binOut.length} bytes; dropped ${json.skins?.length || 0} skin, ${json.animations?.length || 0} animations, ${json.nodes.length - nodes.length} nodes`);
