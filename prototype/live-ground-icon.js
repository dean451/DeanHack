// The model of an item lying on the floor in Live: a dedicated ground model where one exists (ground-models.js),
// lit lights and shop wares, statues of their creature in stone, the monster's own corpse knocked over, gold as a
// falling heap (coin-pile.js), weapons laid flat, and a plain token for the rest. Moved out of live.js unchanged;
// live.js passes the creature factory in.
import * as THREE from 'three';
import {createCentaurStatue} from './oracle-visuals.js';
import {createLightItem,createShopItem} from './shop-visuals.js';
import {createGroundModel} from './ground-models.js';
import {createCorpse} from './corpse.js';
import {cellHash} from './floor.js';
import {layOnSlab} from './altar-offering.js';
import {createBoulder,BOULDER_SEED} from './boulder.js';
import {createHeldWeapon} from './equipment.js';
import {createCoinPile} from './coin-pile.js';
import {potionLook} from './item-looks.js';

export const WEAPON_CLASS=2,ARMOR_CLASS=3,RING_CLASS=4,AMULET_CLASS=5,POTION_CLASS=8,SCROLL_CLASS=9,COIN_CLASS=12;
export function pickupIcon(cell,{creatureFactory}={}){
   const icon=new THREE.Group(), kind=cell.object?.kind||'item', cls=cell.object?.class||0, itemName=(cell.object?.name||cell.name||'').toLowerCase();
   // Older bridge processes expose statues as generic objects. Keep the visual path
   // usable while they are being replaced; the current bridge supplies creature directly.
   const statueCreature=cell.object?.creature||({6746:'gecko'}[cell.glyph]);
   if((kind==='statue'||itemName==='statue')&&/centaur/i.test(statueCreature||'')){const statue=createCentaurStatue(statueCreature);return statue;}
   const lightItem=createLightItem(cell.object?.lit?`${itemName} (lit)`:itemName);if(lightItem){return lightItem;}
   const shopItem=createShopItem(itemName);if(shopItem){return shopItem;}
   const warm=new THREE.MeshStandardMaterial({color:kind==='corpse'?0x72534a:cls===POTION_CLASS?0x5bd0c7:cls===WEAPON_CLASS?0xd9b15e:0xc9a86b,emissive:kind==='corpse'?0x241314:0x362718,roughness:.42,metalness:cls===WEAPON_CLASS?.65:.18});
   const edge=new THREE.MeshStandardMaterial({color:kind==='corpse'?0xb9a189:0xe8d8aa,roughness:.55,metalness:cls===WEAPON_CLASS?.7:.25});
   const add=(geometry,material=warm,x=0,y=.34,z=0)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;icon.add(m);return m;};
   const dedicated=kind==='corpse'||kind==='statue'?null:createGroundModel({color:cell.color,...cell.object,name:itemName});
   if(dedicated){icon.add(dedicated);icon.userData.restingWeapon=true;if(dedicated.userData.bagMaw)icon.userData.bagMaw=dedicated.userData.bagMaw;icon.userData.dispose=()=>dedicated.userData.dispose();
   }else if((kind==='statue'||itemName==='statue')&&statueCreature&&creatureFactory){
     const sculpture=creatureFactory({name:statueCreature,symbol:cell.object?.creatureSymbol,color:cell.object?.creatureColor}).g;
     const stoneMaterials=[new THREE.MeshStandardMaterial({color:0x898b86,roughness:.98}),new THREE.MeshStandardMaterial({color:0x777b78,roughness:1})];
     sculpture.traverse(o=>{if(o.isMesh){o.material=stoneMaterials[o.geometry?.uuid?.charCodeAt?.(0)%2||0];o.castShadow=o.receiveShadow=true;}});
     sculpture.scale.multiplyScalar(.75);sculpture.position.y=.06;icon.add(sculpture);
     const base=new THREE.Mesh(new THREE.CylinderGeometry(.38,.42,.07,12),stoneMaterials[0]);base.position.y=.035;icon.add(base);
     icon.userData.restingWeapon=true;icon.name=`Stone statue of ${statueCreature}`;
     icon.userData.dispose=()=>{const geometries=new Set();sculpture.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});geometries.forEach(geo=>geo.dispose());base.geometry.dispose();stoneMaterials.forEach(material=>material.dispose());};
   }else if(kind==='corpse'){
     // The monster's own model, knocked over where it fell (corpse.js); cell.name is the monster.
     const corpse=createCorpse(cell.object?.name||cell.name,cell.color,cellHash(cell.x|0,cell.z|0,11),{creatureFactory,symbol:cell.object?.creatureSymbol});icon.add(corpse);
     // On an altar it is laid out along the slab, an offering waiting, not a heap (altar-offering.js).
     if(cell.terrain==='altar')layOnSlab(corpse);
     icon.userData.restingWeapon=true;icon.userData.dispose=()=>corpse.userData.dispose();
     // The floating eye's corpse breathes a violet halo and sheds motes (eye-corpse.js), animated below.
     if(corpse.userData.fx)icon.userData.corpseFx=corpse.userData.fx;
   } else if(/boulder|large rock/.test(itemName)){
     const boulder=createBoulder(BOULDER_SEED);icon.add(boulder);icon.userData.dispose=()=>boulder.userData.dispose();
   } else if(cls===WEAPON_CLASS){
     const weapon=createHeldWeapon({name:itemName});
     const pose=new THREE.Group();pose.rotation.y=-.65;icon.add(pose);
     weapon.rotation.x=-Math.PI/2;weapon.scale.setScalar(.8);weapon.position.set(0,.052,.3);pose.add(weapon);
     icon.userData.restingWeapon=true;
   } else if(cls===COIN_CLASS){
     const coinMats=[new THREE.MeshStandardMaterial({color:0xd9a93c,metalness:.55,roughness:.17,emissive:0xb87a18,emissiveIntensity:.5}),new THREE.MeshStandardMaterial({color:0xeabb48,metalness:.55,roughness:.14,emissive:0xc98a1c,emissiveIntensity:.55}),new THREE.MeshStandardMaterial({color:0xc79a34,metalness:.5,roughness:.2,emissive:0xa86f14,emissiveIntensity:.45})],coinStampMats=[new THREE.MeshStandardMaterial({color:0xf2d578,metalness:.5,roughness:.2,emissive:0xd9a63a,emissiveIntensity:.5}),new THREE.MeshStandardMaterial({color:0xfae79a,metalness:.5,roughness:.16,emissive:0xe6b648,emissiveIntensity:.55})],shadow=new THREE.MeshBasicMaterial({color:0x140e08,transparent:true,opacity:.48,depthWrite:false});
     const ground=add(new THREE.CircleGeometry(.19,24),shadow,0,.002,0);ground.rotation.x=-Math.PI/2;
     const pieces=[[-.108,-.066,0,.2,0,.05],[-.042,-.09,0,-.4,0,0],[.036,-.084,0,.7,.04,-.03],[.102,-.036,0,-.1,0,0],[-.12,.006,0,.5,0,.08],[-.06,.006,1,-.6,.08,0],[.012,-.012,1,.4,0,0],[.09,.018,0,-.3,0,-.06],[-.096,.06,0,.8,0,0],[-.024,.066,1,.1,.05,.04],[.048,.06,1,-.5,0,0],[.12,.06,0,.3,0,.08],[-.024,-.024,2,.6,0,0],[-.078,-.018,1,-.2,.1,-.04],[.042,.006,2,.5,0,0],[.012,.072,2,-.8,.06,0],[.072,-.048,1,.15,0,-.08],[-.132,-.036,0,-.5,0,.04]];
     /* the coins of one material are one instanced draw (coin-pile.js): five draws for the pile instead of 36 */icon.userData.coinPile=createCoinPile(THREE,icon,{pieces,coinMats,stampMats:coinStampMats});
     icon.userData.dispose=()=>{icon.userData.coinPile.dispose();coinMats.forEach(material=>material.dispose());coinStampMats.forEach(material=>material.dispose());shadow.dispose();};
   } else if(cls===POTION_CLASS){
     const look=potionLook((cell.object?.appearance||itemName).toLowerCase(),cell.color,cell.object?.otyp);
     const glass=new THREE.MeshPhysicalMaterial({color:look.glass,roughness:.16,metalness:.02,transmission:look.transmission,transparent:true,opacity:look.opacity}),liquid=new THREE.MeshStandardMaterial({color:look.liquid,emissive:look.liquid,emissiveIntensity:look.emissiveIntensity,roughness:.3});
     const bottle=add(new THREE.SphereGeometry(.18,16,10),glass,0,.3,0);bottle.scale.y=1.18;const fill=add(new THREE.SphereGeometry(.145,14,9),liquid,0,.28,0);fill.scale.y=1.18;add(new THREE.CylinderGeometry(.065,.065,.14,10),glass,0,.57,0);add(new THREE.CylinderGeometry(.075,.085,.045,12),edge,0,.66,0);
     icon.userData.dispose=()=>{glass.dispose();liquid.dispose();};
   } else if(cls===ARMOR_CLASS){
     const helm=new THREE.MeshStandardMaterial({color:0x89979a,metalness:.78,roughness:.34}),visorMat=new THREE.MeshStandardMaterial({color:0x182126,metalness:.5,roughness:.3});const dome=add(new THREE.SphereGeometry(.27,16,10),helm,0,.32,0);dome.scale.set(.86,.7,.7);add(new THREE.BoxGeometry(.08,.42,.06),visorMat,0,.36,.19);add(new THREE.ConeGeometry(.06,.2,5),edge,0,.57,0);
     icon.userData.dispose=()=>{helm.dispose();visorMat.dispose();};
   } else if(cls===RING_CLASS){
     const jewelry=new THREE.MeshStandardMaterial({color:0xb49a5e,metalness:.8,roughness:.3}),ring=add(new THREE.TorusGeometry(.16,.045,8,20),jewelry,0,.3,0);ring.rotation.x=Math.PI/2;const highlight=add(new THREE.SphereGeometry(.045,8,6),jewelry,0,.3,.15);highlight.scale.set(1,.7,.6);
     icon.userData.dispose=()=>jewelry.dispose();
   } else if(cls===AMULET_CLASS){
     const jewelry=new THREE.MeshStandardMaterial({color:0xb49a5e,metalness:.78,roughness:.32}),chain=add(new THREE.TorusGeometry(.15,.018,6,18),jewelry,0,.47,0);chain.rotation.x=Math.PI/2;const pendant=add(new THREE.OctahedronGeometry(.1),jewelry,0,.27,.02);pendant.scale.y=1.25;
     icon.userData.dispose=()=>jewelry.dispose();
   } else if(cls===SCROLL_CLASS){
     const parchment=new THREE.MeshStandardMaterial({color:0xcbb889,roughness:.72}),ribbon=new THREE.MeshStandardMaterial({color:0x714243,roughness:.62});const roll=add(new THREE.CylinderGeometry(.13,.13,.42,12),parchment,0,.36,0);roll.rotation.z=Math.PI/2;for(const x of [-.21,.21]){const end=add(new THREE.CylinderGeometry(.15,.15,.035,12),parchment,x,.36,0);end.rotation.z=Math.PI/2;}add(new THREE.BoxGeometry(.045,.08,.11),ribbon,0,.36,.0);
     icon.userData.dispose=()=>{parchment.dispose();ribbon.dispose();};
   } else {
     add(new THREE.OctahedronGeometry(.2),warm,0,.38,0);
   }
   const extraDispose=icon.userData.dispose;icon.userData.dispose=()=>{warm.dispose();edge.dispose();extraDispose?.();};return icon;
 }
