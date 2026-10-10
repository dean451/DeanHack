import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {potionLook} from './item-looks.js';

// A potion standing on the floor: a lathe-turned glass bottle part-filled with its liquid and
// stoppered with a cork bound by twine. The shape comes from the shuffled look (the appearance
// word, or the glyph colour that is shuffled with it), so every appearance keeps one bottle and
// identifying the potion never changes it. A stack shows up to three bottles side by side.
// Three draws however many bottles: glass, liquid (with any bubbles) and the cork and twine,
// each one merged mesh. Colour is baked into vertex colours where a part has more than one.

// Outer profiles as [radius, height], bottom to lip. The last two points roll the lip outward.
// `neck` is the inside radius the cork fills, `top` the height of the mouth, `fill` how far up the
// liquid reaches and `belly` the widest radius (for spacing a stack).
const SHAPES={
 // A round-bottomed flask with a long neck.
 flask:{profile:[[0,0],[.035,.002],[.07,.018],[.094,.05],[.1,.085],[.092,.122],[.066,.152],[.036,.172],[.027,.19],
  [.026,.25],[.031,.258],[.033,.265]],neck:.022,top:.265,fill:.12,belly:.1},
 // A tall, straight-sided vial with a small shoulder.
 vial:{profile:[[0,0],[.042,.001],[.052,.008],[.054,.02],[.054,.2],[.048,.22],[.028,.236],[.024,.25],[.024,.278],
  [.029,.284],[.031,.29]],neck:.019,top:.29,fill:.16,belly:.054},
 // A squared-off medicine bottle with high shoulders.
 bottle:{profile:[[0,0],[.058,.001],[.07,.01],[.074,.03],[.074,.15],[.068,.172],[.046,.19],[.03,.198],[.028,.232],
  [.033,.238],[.035,.245]],neck:.023,top:.245,fill:.13,belly:.074},
 // A squat, wide-mouthed jar.
 jar:{profile:[[0,0],[.07,.001],[.09,.012],[.1,.04],[.098,.1],[.088,.13],[.07,.142],[.066,.158],[.07,.163],
  [.072,.17]],neck:.061,top:.17,fill:.1,belly:.1},
};
const SHAPE_ORDER=['flask','vial','bottle','jar'];
// UnNetHack's appearance words that suggest bubbles rising through the liquid.
const FIZZY=/bubbly|effervescent|fizzy|sparkling|steamy|soapy/;

const hash=s=>[...String(s)].reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,17);
export function potionShape(look='',color){
 const key=look||`colour ${color??'none'}`;
 return SHAPE_ORDER[hash(key)%SHAPE_ORDER.length];
}

function clean(geo){
 const n=geo.index?geo.toNonIndexed():geo;if(n!==geo)geo.dispose();
 for(const k of Object.keys(n.attributes))if(!['position','normal','color'].includes(k))n.deleteAttribute(k);
 return n;
}
function paint(geo,fn){
 const p=geo.attributes.position,col=[],c=new THREE.Color();
 for(let i=0;i<p.count;i++){fn(p.getX(i),p.getY(i),p.getZ(i),c);col.push(c.r,c.g,c.b);}
 geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));return geo;
}
const lathe=(points,segments=28)=>new THREE.LatheGeometry(points.map(([r,y])=>new THREE.Vector2(r,y)),segments);
// The profile's radius at height y (the first crossing from the bottom).
export function radiusAt(profile,y){
 for(let i=1;i<profile.length;i++){const [r0,y0]=profile[i-1],[r1,y1]=profile[i];
  if(y>=y0&&y<=y1)return y1===y0?Math.max(r0,r1):r0+(r1-r0)*(y-y0)/(y1-y0);}
 return profile.at(-1)[0];
}

// The liquid: the inside of the glass (the wall's thickness in from the outer profile) up to the
// fill line, closed by a flat surface that rises a little at the glass as a meniscus.
function liquidGeometry(shape,wall){
 const inner=[];
 for(const [r,y] of shape.profile){if(y>shape.fill)break;inner.push([Math.max(0,r-wall),y+wall*.8]);}
 const rim=Math.max(.004,radiusAt(shape.profile,shape.fill)-wall);
 inner.push([rim,shape.fill+.004],[rim*.8,shape.fill],[0,shape.fill]);
 return lathe(inner);
}

function buildBottle(shape,look,{bubbles}){
 const glass=[],liquid=[],stopper=[];
 const wall=.0045,deep=new THREE.Color(look.liquid).multiplyScalar(.55),surface=new THREE.Color(look.liquid).lerp(new THREE.Color(0xffffff),.25);
 const liquidTone=new THREE.Color(look.liquid);
 // Glass, open at the lip; its colour lives on the material.
 glass.push(clean(lathe(shape.profile,32)));
 // A thicker punt of glass at the base catches the light.
 const base=clean(lathe([[0,.002],[radiusAt(shape.profile,.004)*.7,.003],[radiusAt(shape.profile,.008)*.8,.009],[0,.014]],24));
 glass.push(base);
 // The liquid darkens toward the bottom and brightens at the surface.
 const fill=clean(liquidGeometry(shape,wall));
 paint(fill,(x,y,z,c)=>{const t=Math.min(1,y/shape.fill);c.copy(deep).lerp(liquidTone,t);if(y>=shape.fill-.0005)c.copy(surface);});
 liquid.push(fill);
 if(bubbles){
  // Bubbles clinging to the glass and rising through the liquid, brightest near the top.
  for(let i=0;i<9;i++){
   const y=.02+(shape.fill-.03)*((i*.618)%1),a=i*2.4,r=(radiusAt(shape.profile,y)-wall*2.4)*(i%3===0?.4:.85);
   const b=clean(new THREE.IcosahedronGeometry(.0045+(i%3)*.002,1));b.translate(Math.cos(a)*r,y,Math.sin(a)*r);
   paint(b,(x,y2,z,c)=>c.copy(surface).lerp(new THREE.Color(0xffffff),.5));liquid.push(b);
  }
 }
 // The cork: tapered, pushed into the mouth with its top standing proud, speckled and scored.
 const cork=new THREE.Color(0xb88d58),corkDark=new THREE.Color(0x7a5530),twine=new THREE.Color(0xcdb88a),twineDark=new THREE.Color(0x8c7650);
 const n=shape.neck,h=Math.min(.05,shape.top*.2),plug=clean(new THREE.CylinderGeometry(n*1.12,n*.92,h,18,2));
 plug.translate(0,shape.top+h*.5-h*.45,0);
 paint(plug,(x,y,z,c)=>{const s=Math.sin(x*420+z*310)*Math.cos(z*390-y*270);c.copy(cork).lerp(corkDark,.25+.3*Math.max(0,s));
  if(y>shape.top+h*.5)c.lerp(new THREE.Color(0xd8b07a),.25);});
 stopper.push(plug);
 // Twine wound twice round the neck, below the lip, and tied off in a short tail.
 const tieY=shape.top-(shape.profile.at(-1)[1]-shape.profile.at(-3)[1])-.008,neckR=radiusAt(shape.profile,tieY)+.002;
 for(const dy of [0,.0065]){const t=clean(new THREE.TorusGeometry(neckR,.0027,5,28));t.rotateX(Math.PI/2);t.translate(0,tieY-dy,0);stopper.push(t);}
 const tail=new THREE.CatmullRomCurve3([[neckR,tieY-.003,0],[neckR+.012,tieY-.012,.004],[neckR+.016,tieY-.03,-.002]].map(p=>new THREE.Vector3(...p)));
 stopper.push(clean(new THREE.TubeGeometry(tail,8,.0023,5,false)));
 stopper.forEach((geo,i)=>{if(i)paint(geo,(x,y,z,c)=>c.copy(twine).lerp(twineDark,.5+.5*Math.sin(Math.atan2(z,x)*28+y*900)));});
 return {glass,liquid,stopper};
}

// Places for up to three bottles: the first in front, the others behind it, clear of its belly.
const STACK=[[0,0,0],[-1.05,-.85,.9],[1.1,-.95,-.6]];

// Potions are the loudest small things on the floor: saturated, self-lit liquid, never a dull tint.
// Coloured liquids are pushed to full saturation and a mid lightness; milky, smoky, white, clear and
// black ones keep their character. Returns a copy of the look with a stronger glow.
export function punch(tint){
 const c=new THREE.Color(tint.liquid),hsl={};c.getHSL(hsl);
 if(hsl.s>.25&&hsl.l>.12){c.setHSL(hsl.h,Math.min(1,hsl.s*1.2+.12),THREE.MathUtils.clamp(hsl.l,.46,.58));}
 return {...tint,liquid:'#'+c.getHexString(),emissiveIntensity:Math.max(.55,tint.emissiveIntensity*1.8),colored:hsl.s>.25&&hsl.l>.12};
}
export const POTION_SCALE=1.4;
// a soft additive pool of the liquid's colour on the floor: the potion catches the eye from across a room.
// t is clamped: rim vertices round to a hair past the radius, and a negative base to the 2.2 is NaN,
// which the bloom pass smears into big black blocks over the view.
export function glowDisc(colour,radius){
 const geo=new THREE.RingGeometry(.001,radius,28,7);geo.rotateX(-Math.PI/2);
 const p=geo.attributes.position,col=new Float32Array(p.count*3),base=new THREE.Color(colour);
 for(let i=0;i<p.count;i++){const t=Math.min(1,Math.hypot(p.getX(i),p.getZ(i))/radius),k=Math.pow(1-t,2.2)*.75;col[i*3]=base.r*k;col[i*3+1]=base.g*k;col[i*3+2]=base.b*k;}
 geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.translate(0,.003,0);
 return geo;
}
export function createPotion({appearance='',color,count=1}={}){
 const look=(appearance||'').toLowerCase(),tint=punch(potionLook(look,color)),kind=potionShape(look,color),shape=SHAPES[kind];
 const g=new THREE.Group();g.name='potion';g.userData.shape=kind;
 const parts={glass:[],liquid:[],stopper:[]};
 const n=Math.max(1,Math.min(3,count|0||1));
 for(let i=0;i<n;i++){
  const [sx,sz,ry]=STACK[i],bottle=buildBottle(shape,tint,{bubbles:FIZZY.test(look)});
  const m=new THREE.Matrix4().makeRotationY(ry).setPosition(sx*shape.belly*2,0,sz*shape.belly*2);
  for(const key of Object.keys(parts))for(const geo of bottle[key]){geo.applyMatrix4(m);parts[key].push(geo);}
 }
 const merge=list=>{const geo=mergeGeometries(list,false);list.forEach(x=>x.dispose());geo.computeBoundingBox();geo.computeBoundingSphere();return geo;};
 const glassMat=new THREE.MeshPhysicalMaterial({color:new THREE.Color(tint.glass).lerp(new THREE.Color(0xffffff),.35),roughness:.06,metalness:0,
  transmission:tint.transmission,transparent:true,opacity:Math.min(.5,tint.opacity*.7),clearcoat:1,clearcoatRoughness:.04,ior:1.5,depthWrite:false});
 const liquidMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.22,emissive:tint.liquid,emissiveIntensity:tint.emissiveIntensity,
  transparent:tint.opacity<.6,opacity:tint.opacity<.6?Math.max(.55,tint.opacity+.2):1});
 const stopperMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92});
 const mesh=(geo,m,name,order)=>{const o=new THREE.Mesh(geo,m);o.name=name;o.renderOrder=order;o.castShadow=name!=='glass';o.receiveShadow=true;g.add(o);return o;};
 // The liquid draws before the glass round it, so it shows through.
 mesh(merge(parts.liquid),liquidMat,'liquid',0);
 mesh(merge(parts.stopper),stopperMat,'stopper',0);
 mesh(merge(parts.glass),glassMat,'glass',1);
 g.rotation.y=.4;g.scale.setScalar(POTION_SCALE);
 if(tint.colored){
  const discMat=new THREE.MeshBasicMaterial({vertexColors:true,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false});
  const disc=new THREE.Mesh(glowDisc(tint.liquid,shape.belly*(n>1?4.2:2.6)),discMat);disc.name='glow';disc.renderOrder=-1;g.add(disc);g.userData.glowMat=discMat;
 }
 // Where each bottle stands and how it's shaped, for potion-fx.js.
 g.userData.layout={look,shape:kind,profile:shape.profile,fill:shape.fill,top:shape.top,neck:shape.neck,
  bottles:STACK.slice(0,n).map(([sx,sz])=>({x:sx*shape.belly*2,z:sz*shape.belly*2}))};
 g.userData.materials=[glassMat,liquidMat,stopperMat,...(g.userData.glowMat?[g.userData.glowMat]:[])];
 g.userData.dispose=()=>{g.children.forEach(o=>o.geometry.dispose());g.userData.materials.forEach(m=>m.dispose());};
 return g;
}
