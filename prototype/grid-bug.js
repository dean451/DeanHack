import * as THREE from 'three';

export function createGridBug(){
 const g=new THREE.Group(),body=new THREE.Group();g.name='Electrical grid bug';g.add(body);
 const shell=new THREE.MeshStandardMaterial({color:0x243b40,metalness:.48,roughness:.38});
 const plate=new THREE.MeshStandardMaterial({color:0x405d61,metalness:.4,roughness:.48});
 const dark=new THREE.MeshStandardMaterial({color:0x131e26,roughness:.64});
 const cyan=new THREE.MeshStandardMaterial({color:0x74dadf,emissive:0x19a5c4,emissiveIntensity:1.1,roughness:.32});
 const arcMaterial=new THREE.LineBasicMaterial({color:0x9ceeff,transparent:true,opacity:.8});
 const geos=new Set();
 const mesh=(geo,mat,parent,x=0,y=0,z=0)=>{geos.add(geo);const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const ellipsoid=(parent,r,mat,pos,scale)=>{const m=mesh(new THREE.SphereGeometry(r,16,10),mat,parent,...pos);m.scale.set(...scale);return m;};
 const rod=(parent,a,b,r,mat)=>{const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);const m=mesh(new THREE.CylinderGeometry(r*.65,r,d.length(),7),mat,parent,...p.add(q).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;};
 // Flattened overlapping abdominal plates with narrow luminous sutures.
 for(let i=0;i<3;i++){
  const z=-.23+i*.12,w=.17+i*.018;
  ellipsoid(body,1,i%2?plate:shell,[0,.25,z],[w,.115,.115]);
  const seam=mesh(new THREE.TorusGeometry(w,.009,5,24,Math.PI),cyan,body,0,.25,z+.025);seam.scale.y=.6;
 }
 ellipsoid(body,1,shell,[0,.26,.14],[.17,.13,.16]);
 const head=new THREE.Group();head.position.set(0,.27,.29);body.add(head);
 ellipsoid(head,1,dark,[0,0,0],[.13,.10,.11]);
 for(const side of [-1,1]){
  ellipsoid(head,1,plate,[side*.086,.028,.076],[.05,.046,.035]);
  ellipsoid(head,1,cyan,[side*.086,.032,.101],[.027,.027,.016]);
  rod(head,[side*.055,-.04,.08],[side*.075,-.055,.155],.018,plate);
  rod(head,[side*.075,-.055,.155],[side*.025,-.045,.17],.012,dark);
  rod(head,[side*.065,.064,.025],[side*.13,.19,.12],.012,dark);
  rod(head,[side*.13,.19,.12],[side*.18,.235,.22],.008,plate);
  ellipsoid(head,.019,cyan,[side*.18,.235,.22],[.7,1,.7]);
 }
 const legs=[];
 for(const side of [-1,1])for(let i=0;i<3;i++){
  const z=-.19+i*.19,leg=new THREE.Group();leg.position.set(side*.12,.25,z);body.add(leg);
  const sweep=(i-1)*.095;
  rod(leg,[0,0,0],[side*.16,.075,sweep],.03,shell);
  ellipsoid(leg,.038,plate,[side*.16,.075,sweep],[1,1,1]);
  rod(leg,[side*.16,.075,sweep],[side*.27,-.17,sweep*1.5],.022,dark);
  rod(leg,[side*.27,-.17,sweep*1.5],[side*.30,-.23,sweep*1.5+.045],.012,plate);
  legs.push(leg);
 }
 const arcGeo=new THREE.BufferGeometry().setFromPoints([[-.18,.235,.22],[-.1,.265,.23],[-.05,.21,.23],[.04,.27,.22],[.1,.225,.22],[.18,.235,.22]].map(p=>new THREE.Vector3(...p)));geos.add(arcGeo);
 const arc=new THREE.Line(arcGeo,arcMaterial);head.add(arc);arc.visible=false;
 g.userData.updateGridBug=t=>{arc.visible=(t%3.7)>.0&&(t%3.7)<.13;cyan.emissiveIntensity=1+Math.sin(t*3)*.15;};
 g.userData.dispose=()=>{geos.forEach(o=>o.dispose());[shell,plate,dark,cyan,arcMaterial].forEach(o=>o.dispose());};
 return {g,body,legs,quirk:'gridbug'};
}
