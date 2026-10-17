import * as THREE from 'three';
import {SKY_Y,SKY_COLOR} from './air.js';
import {PLATFORM_TOP} from './magic-platform.js';

// The Bifrost on the Valkyrie locate level. The engine draws that walkway as magic platform
// squares, and mapglyph.c colours each of its six rows (red, orange, yellow, bright green, blue,
// bright magenta), so a run of them is a rainbow. Each square here is a slab of solid light in its
// row's hue, hanging over the same open sky as an air tile: glassy, self-lit, a little see-through,
// with faint streaks of brighter light running along the bridge (x). No rim or chipped edge, so
// neighbouring squares join into one band. Two draws: the light (transparent) and the sky.
export const RAINBOW_COLORS={1:0xe0352b,9:0xf08a24,11:0xf2d33a,10:0x4fd25a,4:0x3a6de0,13:0xc24ad8};
export const rainbowKind=color=>Object.hasOwn(RAINBOW_COLORS,color)?`rainbow-${color}`:null;

export function createRainbowBridge(color,seed=0){
 const g=new THREE.Group();g.name='Rainbow bridge';
 const hue=new THREE.Color(RAINBOW_COLORS[color]??0xffffff),H=.07;
 const slab=new THREE.BoxGeometry(1,H,1,1,1,12);slab.translate(0,PLATFORM_TOP-H/2,0);
 // Streaks of brighter light along x, shifting a little from square to square so the band shimmers.
 const p=slab.attributes.position,col=new Float32Array(p.count*3),c=new THREE.Color(),white=new THREE.Color(0xffffff);
 const phase=(Math.sin(seed*12.9898)*43758.5453)%1;
 for(let i=0;i<p.count;i++){
  const z=p.getZ(i),y=p.getY(i),streak=Math.max(0,Math.sin(z*19+phase*6))**6;
  c.copy(hue).lerp(white,.04+.3*streak);if(y<PLATFORM_TOP-H+.001)c.multiplyScalar(.55);
  col.set([c.r,c.g,c.b],i*3);
 }
 slab.setAttribute('color',new THREE.BufferAttribute(col,3));
 const lightMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,emissive:hue,emissiveIntensity:.9,roughness:.15,metalness:0,transparent:true,opacity:.92,depthWrite:false});
 const light=new THREE.Mesh(slab,lightMat);light.userData.part='light';light.receiveShadow=true;light.renderOrder=1;
 const skyGeo=new THREE.PlaneGeometry(1.001,1.001).rotateX(-Math.PI/2).translate(0,SKY_Y,0);
 const skyMat=new THREE.MeshBasicMaterial({color:SKY_COLOR});
 const sky=new THREE.Mesh(skyGeo,skyMat);sky.userData.part='sky';
 g.add(sky,light);
 g.userData.hidesFloor=true;
 g.userData.dispose=()=>{slab.dispose();skyGeo.dispose();lightMat.dispose();skyMat.dispose();};
 return g;
}
