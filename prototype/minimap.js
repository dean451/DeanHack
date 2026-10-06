// A small map of the whole level, redrawn from each frame. It shows what the hero knows (every
// remembered cell) and, in live sight, the monsters; the hero is the bright square. Stairs are
// drawn as triangles (up points up, down points down) so they read without colour, and traps,
// water and lava differ in shape or brightness as well as hue.

export const COLS = 80;
export const ROWS = 21;
export const SCALE = 4;                    // pixels per map cell
export const WIDTH = COLS * SCALE;
export const HEIGHT = ROWS * SCALE;

// What one cell looks like on the minimap: a fill colour and an optional mark shape.
export function cellStyle(cell, hero) {
  if (hero && cell.x === hero.x && cell.z === hero.z) return {fill: '#fff6d8', mark: 'hero'};
  if (cell.kind === 'pet') return {fill: '#79d8a5', mark: 'dot'};
  if (cell.kind === 'monster' && cell.visible) return {fill: '#e0705c', mark: 'dot'};
  if (cell.trap) return {fill: '#b25bd6', mark: 'x'};
  switch (cell.terrain) {
    case 'wall': return {fill: '#6c7a86'};
    case 'door': return {fill: '#b8864e', mark: 'bar'};
    case 'up': return {fill: '#e6edf2', mark: 'up'};
    case 'down': return {fill: '#f0c35c', mark: 'down'};
    case 'water': return {fill: '#3f7fb5'};
    case 'lava': return {fill: '#d4572b'};
    case 'fountain': case 'altar': case 'throne': case 'sink': case 'grave':
      return {fill: '#9fd0d9', mark: 'dot'};
    case 'tree': return {fill: '#4e7d4a'};
    case 'bars': return {fill: '#7f8a93', mark: 'bar'};
    case 'floor': return {fill: cell.visible ? '#3c4a54' : '#27323a'};
    default: return cell.object ? {fill: '#c9a86b', mark: 'dot'} : null;   // unknown terrain draws nothing
  }
}

function drawMark(ctx, mark, px, py) {
  const s = SCALE;
  ctx.fillStyle = '#10161b';
  switch (mark) {
    case 'up': ctx.beginPath(); ctx.moveTo(px + s / 2, py); ctx.lineTo(px + s, py + s); ctx.lineTo(px, py + s); ctx.fill(); break;
    case 'down': ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + s, py); ctx.lineTo(px + s / 2, py + s); ctx.fill(); break;
    case 'x': ctx.fillRect(px + 1, py, 1, s); ctx.fillRect(px, py + 1, s, 1); break;
    case 'bar': ctx.fillRect(px, py + 1, s, 2); break;
    case 'dot': ctx.fillRect(px + 1, py + 1, 2, 2); break;
    case 'hero': ctx.fillStyle = '#fff6d8'; ctx.fillRect(px - 1, py - 1, s + 2, s + 2); ctx.fillStyle = '#10161b'; ctx.fillRect(px + 1, py + 1, 2, 2); break;
    default: break;
  }
}

export function drawMinimap(ctx, frame) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'rgba(8,14,18,.78)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const hero = frame?.player ? {x: frame.player.x, z: frame.player.z} : null;
  let drawn = 0;
  for (const cell of frame?.cells ?? []) {
    const style = cellStyle(cell, hero);
    if (!style) continue;
    const px = (cell.x - 1) * SCALE, py = cell.z * SCALE;
    if (px < 0 || py < 0 || px >= WIDTH || py >= HEIGHT) continue;
    ctx.fillStyle = style.fill;
    ctx.fillRect(px, py, SCALE, SCALE);
    if (style.mark) drawMark(ctx, style.mark, px, py);
    drawn++;
  }
  return drawn;
}

export function createMinimap(doc) {
  const el = doc.createElement('canvas');
  el.id = 'minimap';
  el.width = WIDTH;
  el.height = HEIGHT;
  el.hidden = true;
  el.setAttribute('aria-label', 'Map of the level');
  el.setAttribute('role', 'img');
  const ctx = el.getContext?.('2d');
  return {
    el,
    update(frame) { return ctx ? drawMinimap(ctx, frame) : 0; },
    setVisible(on) { el.hidden = !on; },
  };
}
