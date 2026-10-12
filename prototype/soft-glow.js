// A soft-edged glow for instanced effect meshes (ray beams, breath puffs). Each fragment's
// strength falls off with how edge-on the surface is to the camera, so a cylinder reads as a
// rounded shaft of light that fades out at its sides and a sphere as a soft, billowing blob,
// instead of hard-edged boxes and faceted shells. Per-instance colour (setColorAt) tints it, and
// for an additive glow the colour's brightness is its strength, as with MeshBasicMaterial.
//
//   power   how quickly it fades toward the edges (1 a broad soft core, 3 a thin bright centre)
//   floor   how much stays at the very edge (0 vanishes there)
//   additive  light added on top (glows) or alpha-blended (the dark core of a death ray)

export function softGlowMaterial(THREE, {power = 2, floor = 0, opacity = 1, additive = true} = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {power: {value: power}, floor: {value: floor}, opacity: {value: opacity}},
    vertexShader: `
      varying vec3 vTint;
      varying float vFacing;
      void main() {
        mat4 world = modelMatrix;
        #ifdef USE_INSTANCING
          world = modelMatrix * instanceMatrix;
        #endif
        vec4 wp = world * vec4(position, 1.0);
        vec3 n = normalize(mat3(world) * normal);
        vFacing = abs(dot(n, normalize(cameraPosition - wp.xyz)));
        #ifdef USE_INSTANCING_COLOR
          vTint = instanceColor;
        #else
          vTint = vec3(1.0);
        #endif
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform float power, floor, opacity;
      varying vec3 vTint;
      varying float vFacing;
      void main() {
        float k = mix(floor, 1.0, pow(clamp(vFacing, 0.0, 1.0), power)) * opacity;
        gl_FragColor = ${additive ? 'vec4(vTint * k, 1.0)' : 'vec4(vTint, k)'};
      }`,
    transparent: true, depthWrite: false, toneMapped: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

// A round beam segment one unit long along x and one unit across (scaled per cell), open-ended so
// neighbouring segments don't stack bright caps at every tile boundary.
export function beamGeometry(THREE, radial = 16) {
  return new THREE.CylinderGeometry(.5, .5, 1, radial, 1, true).rotateZ(Math.PI / 2);
}
