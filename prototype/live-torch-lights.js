// Which torches get one of the pool's point lights: the ones nearest the hero (a torch in the fog counts for less),
// eased in and out so a light never pops, and flickering while lit. The pool itself (live.js) never changes size,
// so no material recompiles. Moved out of live.js unchanged; live.js passes the pool, the tiles and the hero in.


export function updateTorchLights(t,dt,{hero,torchTiles,lastLevel,tiles,TORCH_LIGHTS,torchLights,TORCH_INTENSITY}={}){
   const rank=tile=>tile.position.distanceToSquared(hero.g.position)+(tile.userData.fog.visible?16:0);
   if(torchTiles.key!==`${lastLevel}:${tiles.size}`){torchTiles.key=`${lastLevel}:${tiles.size}`;torchTiles.list=[...tiles.values()].filter(tile=>tile.userData.torch);}/* the torch list is rebuilt only when the tiles change, not every frame */const wanted=new Set(torchTiles.list.filter(tile=>tile.parent).sort((a,b)=>rank(a)-rank(b)).slice(0,TORCH_LIGHTS));
   const held=new Set(torchLights.map(l=>l.userData.tile));
   for(const tile of wanted){if(held.has(tile))continue;const free=torchLights.find(l=>!l.userData.tile);if(!free)break;free.userData.tile=tile;free.userData.level=0;free.position.copy(tile.position).setY(1.15);}
   const ease=1-Math.exp(-dt*5);
   for(const l of torchLights){const {tile}=l.userData;if(!tile){l.intensity=0;continue;}
     if(!tile.parent){l.userData.tile=null;l.intensity=0;continue;}
     const target=wanted.has(tile)?(tile.userData.fog.visible?.55:1):0;l.userData.level+=(target-l.userData.level)*ease;
     if(!target&&l.userData.level<.02){l.userData.tile=null;l.intensity=0;continue;}
     const p=tile.userData.torch.phase,flicker=1+Math.sin(t*11+p)*.09+Math.sin(t*19.3+p*1.7)*.05+Math.sin(t*3.1+p)*.04;
     l.intensity=TORCH_INTENSITY*l.userData.level*flicker;
   }
 }
