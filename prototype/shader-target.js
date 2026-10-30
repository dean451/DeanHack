// Which shader variant a compile builds depends on where three thinks it is drawing: to the canvas it bakes in the
// output colour space (sRGB) and tone mapping (ACES); to a render target, linear colour and no tone mapping. The
// game draws the scene through the composer, into render targets, and only the output pass writes the canvas. So
// a warm-up compile must run with a render target bound, or it builds variants the frame never uses and the real
// ones compile on the spot at first draw, a hitch each.
export const createWarmTarget = THREE => new THREE.WebGLRenderTarget(1, 1);

// Runs `compile` (renderer.compileAsync, say) with `target` bound, then puts back what was bound before.
// compileAsync reads the bound target synchronously when it starts, so restoring right after is safe.
export function compileFor(renderer, target, compile) {
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  try { return compile(); } finally { renderer.setRenderTarget(prev); }
}
