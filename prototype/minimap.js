// A small map of the whole level, redrawn from each frame. It shows what the hero knows (every
// remembered cell) and, in live sight, the monsters; the hero is the bright square. Stairs are
// drawn as triangles (up points up, down points down) so they read without colour, and traps,
// water and lava differ in shape or brightness as well as hue; a pet is a diamond, a hostile a dot.

export const COLS = 80;
export const ROWS = 21;
export const SCALE = 4;                    // pixels per map cell
export const WIDTH = COLS * SCALE;
export const HEIGHT = ROWS * SCALE;

// Each piece of furniture has its own mark, so none is told apart by colour alone.
export const FEATURE_MARKS = {fountain: 'ring', altar: 'plus', throne: 'crown', sink: 'tee', grave: 'cross'};

// What one cell looks like on the minimap: a fill colour and an optional mark shape.
export function cellStyle(cell, hero) {
  if (hero && cell.x === hero.x && cell.z === hero.z) return {fill: '#fff6d8', mark: 'hero'};
  if (cell.kind === 'pet') return {fill: '#79d8a5', mark: 'diamond'};
  if (cell.kind === 'monster' && cell.visible) return {fill: '#e0705c', mark: 'dot'};
  if (cell.trap) return {fill: '#b25bd6', mark: 'x'};
  switch (cell.terrain) {
    case 'wall': return {fill: '#6c7a86'};
    case 'door': return {fill: '#b8864e', mark: 'bar'};
    case 'up': return {fill: '#e6edf2', mark: 'up'};
    case 'down': return {fill: '#f0c35c', mark: 'down'};
    case 'water': return {fill: '#3f7fb5', mark: 'wave'};
    case 'lava': return {fill: '#d4572b', mark: 'spark'};
    case 'fountain': case 'altar': case 'throne': case 'sink': case 'grave':
      return {fill: '#9fd0d9', mark: FEATURE_MARKS[cell.terrain]};
    case 'tree': return {fill: '#4e7d4a', mark: 'tree'};
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
    case 'diamond': ctx.fillRect(px + 1, py, 2, 1); ctx.fillRect(px, py + 1, 4, 2); ctx.fillRect(px + 1, py + 3, 2, 1); break;
    case 'wave': ctx.fillRect(px, py + 1, 2, 1); ctx.fillRect(px + 2, py + 2, 2, 1); break;
    case 'spark': ctx.fillRect(px, py, 1, 1); ctx.fillRect(px + 2, py, 1, 1); ctx.fillRect(px + 1, py + 2, 1, 1); ctx.fillRect(px + 3, py + 2, 1, 1); break;
    case 'ring': ctx.fillRect(px + 1, py, 2, 1); ctx.fillRect(px + 1, py + 3, 2, 1); ctx.fillRect(px, py + 1, 1, 2); ctx.fillRect(px + 3, py + 1, 1, 2); break;
    case 'plus': ctx.fillRect(px + 1, py, 2, s); ctx.fillRect(px, py + 1, s, 2); break;
    case 'crown': ctx.fillRect(px, py, 1, 2); ctx.fillRect(px + 3, py, 1, 2); ctx.fillRect(px + 1, py + 1, 2, 1); ctx.fillRect(px, py + 2, s, 2); break;
    case 'tee': ctx.fillRect(px, py, s, 1); ctx.fillRect(px + 1, py + 1, 2, 3); break;
    case 'cross': ctx.fillRect(px + 1, py, 2, s); ctx.fillRect(px, py + 1, s, 1); break;
    case 'tree': ctx.fillRect(px + 1, py, 2, 2); ctx.fillRect(px + 1, py + 2, 1, 2); break;
    case 'dot': ctx.fillRect(px + 1, py + 1, 2, 2); break;
    case 'hero': ctx.fillStyle = '#fff6d8'; ctx.fillRect(px - 1, py - 1, s + 2, s + 2); ctx.fillStyle = '#10161b'; ctx.fillRect(px + 1, py + 1, 2, 2); break;
    default: break;
  }
}

export function drawMinimap(ctx, frame, cursor = null) {
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
  if (cursor && cursor.x >= 1 && cursor.x <= COLS && cursor.z >= 0 && cursor.z < ROWS) {
    // a bracket around the square being aimed at, bright against any terrain
    const px = (cursor.x - 1) * SCALE, py = cursor.z * SCALE;
    ctx.strokeStyle = '#fff0b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(px - 1.5, py - 1.5, SCALE + 3, SCALE + 3);
  }
  return drawn;
}

// Which map square a pixel of the minimap is, for aiming by clicking it (null outside the map).
export function cellAtPixel(px, py, width = WIDTH, height = HEIGHT) {
  const x = Math.floor((px / width) * COLS) + 1, z = Math.floor((py / height) * ROWS);
  return x >= 1 && x <= COLS && z >= 0 && z < ROWS ? {x, z} : null;
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
  let lastFrame = null, cursor = null;
  const redraw = () => (ctx ? drawMinimap(ctx, lastFrame, cursor) : 0);
  return {
    el,
    update(frame) { lastFrame = frame; return redraw(); },
    // Aiming: a bracket on the chosen square, and the map takes clicks while a spot is being picked.
    setCursor(c) { cursor = c; el.classList?.toggle('aiming', !!c); redraw(); },
    cellAt(clientX, clientY) {
      const r = el.getBoundingClientRect();
      return cellAtPixel(clientX - r.left, clientY - r.top, r.width, r.height);
    },
    setVisible(on) { el.hidden = !on; },
  };
}
