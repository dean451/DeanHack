// Remembered versus seen: explored tiles out of sight sit under a fog plane. The plane is a
// cold ash grey, not a blue, so blending it over the floor drains its colour as well as
// its light; the more opaque it is, the less of the tile's own hue survives.
export const DIM_COLOR=0x15171c;
export const DIM_OPACITY=.74;
// Fraction of a tile's own colour that survives under the fog.
export const dimKeep=(opacity=DIM_OPACITY)=>1-opacity;
// The fog's channel spread: how far its brightest and darkest channels sit apart (0-1).
export const dimSpread=(color=DIM_COLOR)=>{
 const c=[(color>>16)&255,(color>>8)&255,color&255];
 return (Math.max(...c)-Math.min(...c))/255;
};

// A monster last seen on a tile the hero can no longer see lingers there as a faded ghost until the
// tile is seen again. Only a living, visible-then-lost monster on remembered ground becomes one.
export const GHOST_OPACITY=.3;
export const GHOST_MAX=24;
export const GHOST_TINT=0x8a8f98;
export const shouldGhost=(cell,dead=false)=>!!cell&&!dead&&!cell.visible&&!!cell.remembered&&cell.terrain!=='unknown';
// A ghost goes when its tile is in sight again (empty or not: a monster standing there is drawn live).
export const ghostGone=cell=>!cell||!!cell.visible;
// Fade a model to a ghost: every material is cloned (so the live originals are untouched), greyed,
// made translucent and stopped from writing depth. Returns the clones so the caller can dispose them.
export function ghostize(root,THREE){
 const made=[],tint=new THREE.Color(GHOST_TINT);
 root.traverse(o=>{
  if(!o.material)return;
  const one=m=>{const c=m.clone();if(c.color)c.color.lerp(tint,.65);c.transparent=true;c.opacity=GHOST_OPACITY;c.depthWrite=false;if(c.emissive)c.emissive.multiplyScalar(.2);made.push(c);return c;};
  o.material=Array.isArray(o.material)?o.material.map(one):one(o.material);
  o.castShadow=false;
 });
 return made;
}
