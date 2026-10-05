import * as THREE from 'three';
import {sparkState} from './altar-embers.js';

// Gas over lava catches the heat: a few orange sparks lift off the lit core now and then, one
// or two at a time, drifting up through the vapour and guttering out. Reuses the altar's spark
// flight (altar-embers.js sparkState); the flight is a function of t, so it is frame-rate
// independent. One instanced draw per cloud over lava, none elsewhere. poison-cloud-roil.js
// attaches the group when a cloud sits on lava and detaches it when the ground changes.
export const GAS_SPARKS = 4; // sparks per cloud over lava
export const GAS_SPARK_SIZE = 1.3; // multiple of the altar spark size (they fly through a bigger bank)
const HOT = new THREE.Color(0xffb040), COLD = new THREE.Color(0x8a1c04);

let sharedGeo = null;
const geo = () => sharedGeo ??= new THREE.SphereGeometry(1, 6, 4);
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();

export function attachGasSparks(cloud) {
  const mat = new THREE.MeshBasicMaterial({color: 0xffffff, toneMapped: false});
  const sparks = new THREE.InstancedMesh(geo(), mat, GAS_SPARKS);
  sparks.name = 'GasSparks';sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < GAS_SPARKS; i++) {
    sparks.setMatrixAt(i, m4.compose(v.set(0, 0, 0), q, sc.setScalar(1e-5)));sparks.setColorAt(i, HOT);
  }
  sparks.frustumCulled = false;sparks.castShadow = sparks.receiveShadow = false;
  sparks.position.y = .12;
  cloud.add(sparks);
  return sparks;
}

export function poseGasSparks(sparks, t, phase = 0) {
  for (let i = 0; i < GAS_SPARKS; i++) {
    const s = sparkState(t, i, phase);
    sparks.setMatrixAt(i, m4.compose(v.set(s.x * 1.4, s.y, s.z * 1.4), q, sc.setScalar(Math.max(s.size * GAS_SPARK_SIZE, 1e-5))));
    sparks.setColorAt(i, col.copy(COLD).lerp(HOT, s.heat));
  }
  sparks.instanceMatrix.needsUpdate = true;
  if (sparks.instanceColor) sparks.instanceColor.needsUpdate = true;
}

export function detachGasSparks(sparks) {
  sparks.material.dispose();sparks.dispose();sparks.removeFromParent();
}
