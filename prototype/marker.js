import * as THREE from 'three';
import {pieces,rgb,mix,at} from './homunculus.js';

// The magic marker, as a dungeon would have it: not a felt-tip pen but a scribe's stylus for
// writing scrolls of power. A shaft of blackened, ink-stained bone with runes cut in a spiral down
// it; a small glass vial of ink set into the shaft and caged in black iron; a split black-iron nib
// with a bead of ink at its tip; and a thorned iron cap on the butt. The ink glows a deep arcane
// crimson in the runes, the vial and the nib: the magic is the ink. A dry marker (0 charges) has
// its ink dried to a dead brown that gives no light. It lies on its side on the floor.
//
// Two meshes: the stylus (bone, iron, glass) on one vertex-coloured material, and the ink on its
// own emissive material, tagged magicShell so the tool tint (tool-twist.js) leaves its light alone.

const hash=(a,b)=>{const s=Math.sin(a*127.1+b*311.7)*43758.5453;return s-Math.floor(s);};
const C={bone:rgb('#5e5446'),boneDark:rgb('#2e2822'),stain:rgb('#1a1214'),iron:rgb('#2a2a2e'),ironHi:rgb('#55565c'),glass:rgb('#3a3036')};
export const INK=0xd01a40,DRY=0x3a2418;

// Parses the charge count from a doname like "magic marker (0:12)"; null when unknown.
export function markerCharges(name=''){
 const m=/\(\s*[+-]?\d+\s*:\s*(-?\d+)\s*\)/.exec(name);
 return m?Number(m[1]):null;
}

// Built along +y (nib up), then laid on the floor along x.
const LEN=.34,R=.014;
function buildStylus(){
 const P=pieces(),Ink=pieces();
 // the bone shaft: tapering, stained darker toward the nib where the ink runs, with knuckle ridges
 const shaft=new THREE.LatheGeometry([[0,.02],[R*1.05,.022],[R*1.1,.06],[R,.1],[R*1.06,.14],[R*.95,.2],[R*1.02,.23],[R*.85,.27],[R*.7,.29],[0,.292]].map(([r,y])=>new THREE.Vector2(r,y)),14);
 P.add(shaft,null,(x,y,z)=>{const a=Math.atan2(z,x),n=hash(Math.floor(a*5),Math.floor(y*60));return mix(mix(C.bone,C.boneDark,n*.5),C.stain,Math.max(0,(y-.16)/.13)*.8);});
 // runes cut in a spiral down the shaft, the ink glowing in the cuts
 for(let i=0;i<14;i++){const t=i/13,y=.05+t*.18,a=t*Math.PI*5;
  const g=new THREE.BoxGeometry(.006,.012,.003);g.rotateZ(i%2?.5:-.4);
  Ink.add(g,new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a)*R*1.06,y,Math.sin(a)*R*1.06),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-a+Math.PI/2),new THREE.Vector3(1,1,1)),[1,1,1]);}
 // the ink vial set into the shaft near the grip, caged in black iron bands
 P.add(new THREE.SphereGeometry(.021,12,10),at(0,.12,0,[0,0,0],[1,1.5,1]),C.glass);
 Ink.add(new THREE.SphereGeometry(.016,10,8),at(0,.115,0,[0,0,0],[1,1.4,1]),[1,1,1]);
 for(const y of [.095,.145])P.add(new THREE.TorusGeometry(.021,.003,5,14),at(0,y,0,[Math.PI/2,0,0]),C.iron);
 for(let k=0;k<4;k++){const a=k*Math.PI/2;P.add(new THREE.BoxGeometry(.003,.052,.003),at(Math.cos(a)*.021,.12,Math.sin(a)*.021),C.ironHi);}
 // the split black-iron nib, and a bead of ink at its point
 P.add(new THREE.ConeGeometry(.011,.06,6),at(0,.32,0,[0,0,0],[1,1,.55]),C.iron);
 P.add(new THREE.BoxGeometry(.0015,.035,.008),at(0,.33,0),C.stain);  // the slit
 Ink.add(new THREE.SphereGeometry(.0055,8,6),at(0,.35,0),[1,1,1]);
 // the thorned iron cap on the butt
 P.add(new THREE.CylinderGeometry(.017,.015,.03,10),at(0,.008,0),C.iron);
 P.add(new THREE.ConeGeometry(.006,.03,5),at(0,-.018,0,[Math.PI,0,0]),C.ironHi);
 for(let k=0;k<3;k++){const a=k*2.1;P.add(new THREE.ConeGeometry(.004,.018,4),at(Math.cos(a)*.017,.012,Math.sin(a)*.017,[0,0,0]).multiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(-Math.sin(a),0,Math.cos(a)),Math.PI/2.2)),C.ironHi);}
 return {stylus:P.merge(),ink:Ink.merge()};
}

export function createMagicMarker({dry=false}={}){
 const g=new THREE.Group();g.name='Magic marker';
 const {stylus,ink}=buildStylus();
 // lay it on its side along x, nib toward +x, resting on the floor
 const lay=new THREE.Matrix4().makeRotationZ(-Math.PI/2);
 for(const geo of [stylus,ink])geo.applyMatrix4(lay).translate(-LEN/2,0,0);
 stylus.computeBoundingBox();const lift=-stylus.boundingBox.min.y;
 for(const geo of [stylus,ink])geo.translate(0,lift,0);
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.15});
 const inkMaterial=new THREE.MeshStandardMaterial({color:dry?DRY:INK,emissive:dry?0x000000:INK,emissiveIntensity:dry?0:2.6,roughness:.3});
 const body=new THREE.Mesh(stylus,material);body.castShadow=body.receiveShadow=true;body.userData.part='marker';
 const lit=new THREE.Mesh(ink,inkMaterial);lit.castShadow=false;lit.userData.part='ink';lit.userData.magicShell=true;
 for(const m of [body,lit]){m.rotation.y=.35;g.add(m);}
 g.userData.dispose=()=>{stylus.dispose();ink.dispose();material.dispose();inkMaterial.dispose();};
 return g;
}
