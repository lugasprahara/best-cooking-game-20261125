// input.js — keyboard and mouse routing.
// Clicks and keys both resolve to the same station actions, hit-tested
// against the LAYOUT map in stations.js: a click lands on a bin, the board,
// a grill slot, a plate, the pass or the trash; keys move the chef along the
// counter and E works the station in front of him, 1-8 grab from the bins.

import { LAYOUT, binRect, VIEW_WIDTH, VIEW_HEIGHT } from './stations.js';
import { BIN_ORDER } from './recipes.js';

function inside(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function stationAtPoint(x, y) {
  for (let i = 0; i < BIN_ORDER.length; i++) {
    if (inside(x, y, binRect(i))) return { kind: 'bin', index: i, rect: binRect(i) };
  }
  if (inside(x, y, LAYOUT.board)) return { kind: 'board', rect: LAYOUT.board };
  if (inside(x, y, LAYOUT.grill)) {
    const slot = x < LAYOUT.grill.x + LAYOUT.grill.w / 2 ? 0 : 1;
    return { kind: 'grill', index: slot, rect: LAYOUT.grill };
  }
  if (inside(x, y, LAYOUT.plates)) {
    const index = Math.min(2, Math.floor((x - LAYOUT.plates.x) / (LAYOUT.plates.w / 3)));
    return { kind: 'plate', index, rect: LAYOUT.plates };
  }
  if (inside(x, y, LAYOUT.pass)) return { kind: 'pass', rect: LAYOUT.pass };
  if (inside(x, y, LAYOUT.trash)) return { kind: 'trash', rect: LAYOUT.trash };
  return null;
}

export function stationCenterX(station) {
  if (!station) return VIEW_WIDTH / 2;
  switch (station.kind) {
    case 'bin': {
      const r = binRect(station.index);
      return r.x + r.w / 2;
    }
    case 'grill': return LAYOUT.grill.x + (station.index + 0.5) * (LAYOUT.grill.w / 2);
    case 'plate': return LAYOUT.plates.x + (station.index + 0.5) * (LAYOUT.plates.w / 3);
    case 'board': return LAYOUT.board.x + LAYOUT.board.w / 2;
    case 'pass': return LAYOUT.pass.x + LAYOUT.pass.w / 2;
    case 'trash': return LAYOUT.trash.x + LAYOUT.trash.w / 2;
    default: return station.rect ? station.rect.x + station.rect.w / 2 : VIEW_WIDTH / 2;
  }
}

const ZONES = [
  { kind: 'board' }, { kind: 'grill', index: 0 }, { kind: 'grill', index: 1 },
  { kind: 'plate', index: 0 }, { kind: 'plate', index: 1 }, { kind: 'plate', index: 2 },
  { kind: 'pass' },
  ...BIN_ORDER.map((_, index) => ({ kind: 'bin', index })),
  { kind: 'trash' },
];

export function nearestStationTo(x) {
  let best = null;
  let bestDist = Infinity;
  for (const zone of ZONES) {
    const station = { ...zone, rect: zone.kind === 'bin' ? binRect(zone.index) : LAYOUT[zone.kind === 'grill' ? 'grill' : zone.kind === 'plate' ? 'plates' : zone.kind] };
    const cx = stationCenterX({ ...station, kind: zone.kind, index: zone.index });
    const d = Math.abs(cx - x);
    if (d < bestDist) { bestDist = d; best = { kind: zone.kind, index: zone.index, rect: station.rect }; }
  }
  return best;
}

export function bindInput(canvas, handlers) {
  const keys = new Set();

  function toGameCoords(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
    };
  }

  canvas.addEventListener('pointerdown', (event) => {
    const { x, y } = toGameCoords(event);
    handlers.onPoint(stationAtPoint(x, y), x, y);
  });

  window.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) event.preventDefault();
    keys.add(event.key.toLowerCase());
    handlers.onKey(event.key, true);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.key.toLowerCase());
    handlers.onKey(event.key, false);
  });

  return {
    moveAxis() {
      let axis = 0;
      if (keys.has('a') || keys.has('arrowleft')) axis -= 1;
      if (keys.has('d') || keys.has('arrowright')) axis += 1;
      return axis;
    },
  };
}
