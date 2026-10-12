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
