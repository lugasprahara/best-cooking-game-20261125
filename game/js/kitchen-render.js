// kitchen-render.js — every pixel of Copper Ladle is drawn here, in code.
// Chunky shapes, strong outlines and labels everywhere: the scene has to
// read at a glance when shrunk — kitchen, order board, ingredient bins,
// stations mid-work, the chef, the clock and a plated dish at the pass.

import { LAYOUT, binRect, VIEW_WIDTH, VIEW_HEIGHT, grillSlotState, GRILL_COOK_SECONDS, GRILL_BURN_SECONDS } from './stations.js';
import { BIN_ORDER, INGREDIENTS, recipeById, ingredientOfState } from './recipes.js';

const INK = '#2b1c10';
const PAPER = '#fdf6e3';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fillRoundRect(ctx, x, y, w, h, r, fill) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeRoundRect(ctx, x, y, w, h, r, stroke, width = 3) {
  roundRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
}

function text(ctx, str, x, y, { size = 16, color = INK, align = 'left', bold = false, font = 'Verdana' } = {}) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${font}, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function circle(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function patienceColor(frac) {
  if (frac > 0.5) return '#3f9e4d';
  if (frac > 0.25) return '#e09a17';
  return '#d8402e';
}

function steamPuffs(ctx, x, y, now, count = 3) {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const phase = (now * 0.7 + i / count) % 1;
    const px = x + Math.sin((phase * 5 + i * 2.1)) * 8;
    const py = y - phase * 34;
    ctx.globalAlpha = 0.35 * (1 - phase);
    circle(ctx, px, py, 5 + phase * 7, '#ffffff');
  }
  ctx.restore();
}

// --- Food icons -------------------------------------------------------------
// drawIngredientIcon paints one ingredient state centred at (x, y), sized r.
// Raw and prepared states look different at a glance: whole vs chopped,
// pale vs grilled, shell egg vs fried egg.

export function drawIngredientIcon(ctx, stateId, x, y, r) {
  const ing = ingredientOfState(stateId);
  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(43,28,16,0.55)';
  if (stateId === 'burnt') {
    circle(ctx, x, y, r * 0.9, '#26221f');
    circle(ctx, x - r * 0.3, y - r * 0.25, r * 0.35, '#3a352f');
    ctx.restore();
    return;
  }
  if (!ing) { ctx.restore(); return; }
  const { body, leaf } = ing;
  switch (ing.id) {
    case 'tomato':
      if (stateId === ing.raw) {
        circle(ctx, x, y, r, body); ctx.stroke();
        ctx.fillStyle = leaf;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * r * 0.3, y - r * 0.72 + Math.sin(a) * r * 0.12, r * 0.3, r * 0.16, a, 0, Math.PI * 2);
          ctx.fill();
        }
        circle(ctx, x - r * 0.35, y - r * 0.35, r * 0.22, 'rgba(255,255,255,0.5)');
      } else {
        // Chopped tomato: chunky red wedges with pale seed pockets.
        for (const [dx, dy, rot] of [[-0.42, 0.18, -0.4], [0.38, 0.3, 0.5], [0, -0.34, 0.1]]) {
          ctx.save();
          ctx.translate(x + dx * r, y + dy * r);
          ctx.rotate(rot);
          fillRoundRect(ctx, -r * 0.42, -r * 0.3, r * 0.84, r * 0.6, r * 0.2, body);
          ctx.stroke();
          ctx.fillStyle = '#f0836b';
          circle(ctx, -r * 0.14, 0, r * 0.1, '#f0836b');
          circle(ctx, r * 0.16, r * 0.05, r * 0.08, '#f0836b');
          ctx.restore();
        }
      }
      break;
    case 'lettuce':
      if (stateId === ing.raw) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          circle(ctx, x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, r * 0.52, i % 2 ? body : leaf);
        }
        circle(ctx, x, y, r * 0.5, '#8fce6d');
      } else {
        // Chopped lettuce: a loose pile of shredded green ribbons.
        for (let i = 0; i < 4; i++) {
          const yy = y + (i - 1.5) * r * 0.34;
          ctx.beginPath();
          ctx.moveTo(x - r * 0.95, yy);
          for (let s = 0; s <= 4; s++) {
            ctx.quadraticCurveTo(
              x - r * 0.95 + (s + 0.5) * r * 0.475, yy + (s % 2 ? -r * 0.22 : r * 0.22),
              x - r * 0.95 + (s + 1) * r * 0.475, yy,
            );
          }
          ctx.strokeStyle = i % 2 ? leaf : body;
          ctx.lineWidth = r * 0.3;
          ctx.stroke();
        }
        ctx.lineWidth = 2.5;
      }
      break;
    case 'potato':
      if (stateId === ing.raw) {
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.05, r * 0.78, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = body; ctx.fill(); ctx.stroke();
        ctx.fillStyle = leaf;
        circle(ctx, x - r * 0.3, y - r * 0.1, r * 0.09, leaf);
        circle(ctx, x + r * 0.25, y + r * 0.2, r * 0.09, leaf);
        circle(ctx, x + r * 0.05, y - r * 0.3, r * 0.07, leaf);
      } else {
        ctx.fillStyle = body;
        for (const [dx, dy] of [[-0.45, -0.2], [0.1, -0.35], [0.45, 0.05], [-0.15, 0.3], [0.3, 0.42]]) {
          fillRoundRect(ctx, x + dx * r - r * 0.26, y + dy * r - r * 0.26, r * 0.52, r * 0.52, 3, body);
          ctx.strokeRect(x + dx * r - r * 0.26, y + dy * r - r * 0.26, r * 0.52, r * 0.52);
        }
      }
      break;
    case 'patty':
      fillRoundRect(ctx, x - r, y - r * 0.55, r * 2, r * 1.1, r * 0.5, stateId === ing.raw ? '#b06a5a' : body);
      ctx.stroke();
      if (stateId !== ing.raw) {
        ctx.strokeStyle = 'rgba(30,16,8,0.65)';
        ctx.lineWidth = 3;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(x + i * r * 0.5 - r * 0.3, y - r * 0.35);
          ctx.lineTo(x + i * r * 0.5 + r * 0.3, y + r * 0.35);
          ctx.stroke();
        }
      }
      break;
    case 'chicken':
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.05, r * 0.72, -0.25, 0, Math.PI * 2);
      ctx.fillStyle = stateId === ing.raw ? '#eec39b' : '#c9853f';
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x - r * 0.25, y - r * 0.22, r * 0.4, r * 0.2, -0.25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();
      if (stateId !== ing.raw) {
        ctx.strokeStyle = 'rgba(90,50,15,0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x - r * 0.55, y - r * 0.2); ctx.lineTo(x + r * 0.4, y + r * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - r * 0.2, y - r * 0.45); ctx.lineTo(x + r * 0.65, y + r * 0.05); ctx.stroke();
      }
      break;
    case 'egg':
      if (stateId === ing.raw) {
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.72, r * 0.95, 0, 0, Math.PI * 2);
        ctx.fillStyle = body; ctx.fill(); ctx.stroke();
        circle(ctx, x - r * 0.22, y - r * 0.3, r * 0.16, 'rgba(255,255,255,0.8)');
      } else {
        ctx.beginPath();
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const rr = r * (0.85 + ((i * 37) % 10) / 40);
          const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.8;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = '#fffdf4'; ctx.fill(); ctx.stroke();
        circle(ctx, x, y, r * 0.42, leaf); ctx.stroke();
        circle(ctx, x - r * 0.13, y - r * 0.13, r * 0.13, 'rgba(255,255,255,0.55)');
      }
      break;
    case 'cheese':
      ctx.beginPath();
      ctx.moveTo(x - r, y + r * 0.7);
      ctx.lineTo(x + r, y + r * 0.7);
      ctx.lineTo(x + r * 0.2, y - r * 0.75);
      ctx.closePath();
      ctx.fillStyle = body; ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(190,120,10,0.55)';
      circle(ctx, x + r * 0.15, y + r * 0.25, r * 0.16, 'rgba(190,120,10,0.55)');
      circle(ctx, x - r * 0.3, y + r * 0.42, r * 0.11, 'rgba(190,120,10,0.55)');
      break;
    case 'bun':
      ctx.beginPath();
      ctx.arc(x, y + r * 0.15, r * 0.95, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = body; ctx.fill(); ctx.stroke();
      fillRoundRect(ctx, x - r * 0.95, y + r * 0.32, r * 1.9, r * 0.4, r * 0.18, leaf);
      ctx.fillStyle = '#fdf6e3';
      for (const [dx, dy] of [[-0.4, -0.35], [0.05, -0.55], [0.45, -0.3]]) {
        ctx.beginPath();
        ctx.ellipse(x + dx * r, y + dy * r, r * 0.11, r * 0.06, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    default:
      circle(ctx, x, y, r, body);
  }
  ctx.restore();
}

export function drawPlateStack(ctx, items, x, y, scale = 1) {
  // The plate, then its ingredients stacked in a neat pile on top.
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.ellipse(0, 10, 52, 16, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#f4f1ea'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#b9b2a4'; ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 8, 36, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#e6e1d4'; ctx.fill();
  items.forEach((stateId, i) => {
    const lift = i * 9;
    const wobble = (i % 2 === 0 ? -1 : 1) * (i * 3);
    drawIngredientIcon(ctx, stateId, wobble, -2 - lift, 21 - Math.min(6, i));
  });
  ctx.restore();
}

// --- Scene sections -----------------------------------------------------------

function drawTopBar(ctx, state) {
  fillRoundRect(ctx, 0, 0, VIEW_WIDTH, 58, 0, '#3a2718');
  text(ctx, 'COPPER LADLE', 24, 29, { size: 24, bold: true, color: '#f7b731' });
  // Day clock: a round timer you can feel, plus its shrinking bar.
  const frac = Math.max(0, state.timeLeft / state.dayLength);
  circle(ctx, 420, 29, 20, '#fdf6e3');
  ctx.beginPath();
  ctx.moveTo(420, 29);
  ctx.arc(420, 29, 17, -Math.PI / 2, -Math.PI / 2 + (1 - frac) * Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = frac > 0.25 ? '#d8402e' : '#8f1d10';
  ctx.fill();
  const mm = Math.floor(state.timeLeft / 60);
  const ss = Math.floor(state.timeLeft % 60).toString().padStart(2, '0');
  text(ctx, `${mm}:${ss}`, 470, 29, { size: 26, bold: true, color: frac > 0.25 ? '#fdf6e3' : '#ff9a8a' });
  fillRoundRect(ctx, 540, 20, 220, 16, 8, '#5a4026');
  fillRoundRect(ctx, 540, 20, Math.max(0, 220 * frac), 16, 8, frac > 0.25 ? '#69b84a' : '#d8402e');
  text(ctx, `SCORE ${state.score}`, 830, 29, { size: 24, bold: true, color: '#fdf6e3' });
  text(ctx, state.combo > 1 ? `COMBO x${state.combo}` : 'COMBO —', 1010, 29, { size: 20, bold: true, color: state.combo > 1 ? '#f7b731' : '#a68a64' });
  for (let i = 0; i < 3; i++) {
    const x = 1170 + i * 36;
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.bezierCurveTo(x - 16, 24, x - 8, 10, x, 20);
    ctx.bezierCurveTo(x + 8, 10, x + 16, 24, x, 40);
    ctx.fillStyle = i < state.hearts ? '#d8402e' : '#5a4026';
    ctx.fill();
  }
}

function drawOrderBoard(ctx, state, now) {
  fillRoundRect(ctx, 16, 66, VIEW_WIDTH - 32, 128, 10, '#6f4a26');
  fillRoundRect(ctx, 24, 74, VIEW_WIDTH - 48, 112, 8, '#8a5f30');
  text(ctx, 'ORDER BOARD', 44, 92, { size: 15, bold: true, color: '#f7d774' });
  const tickets = state.book.tickets;
  if (tickets.length === 0) {
    text(ctx, 'waiting for customers…', VIEW_WIDTH / 2, 140, { size: 20, color: '#e8d9b0', align: 'center' });
  }
  tickets.forEach((ticket, i) => {
    const x = 250 + i * 252;
    const y = 84;
    const recipe = recipeById(ticket.recipeId);
    const frac = Math.max(0, ticket.patienceLeft / ticket.patience);
    const urgent = frac < 0.25 && Math.floor(now * 4) % 2 === 0;
    ctx.save();
    if (urgent) ctx.translate(0, Math.sin(now * 30) * 1.5);
    fillRoundRect(ctx, x, y, 236, 96, 6, PAPER);
    fillRoundRect(ctx, x, y, 236, 26, 6, urgent ? '#d8402e' : '#b3542e');
    circle(ctx, x + 118, y + 4, 6, '#d9d2c0');
    text(ctx, `#${ticket.id}  ${recipe.name}`, x + 118, y + 14, { size: 16, bold: true, color: '#fdf6e3', align: 'center' });
    const iconStep = recipe.needs.length > 4 ? 33 : 42;
    const iconR = recipe.needs.length > 4 ? 13 : 16;
    recipe.needs.forEach((stateId, j) => {
      drawIngredientIcon(ctx, stateId, x + 30 + j * iconStep, y + 52, iconR);
    });
    text(ctx, `${recipe.price + 10}`, x + 214, y + 52, { size: 17, bold: true, color: '#b3542e', align: 'right' });
    fillRoundRect(ctx, x + 10, y + 78, 216, 10, 5, '#ddd3ba');
    fillRoundRect(ctx, x + 10, y + 78, Math.max(0, 216 * frac), 10, 5, patienceColor(frac));
    ctx.restore();
  });
}

function drawWorkCounter(ctx, state, now) {
  // Steel worktop behind the stations.
  fillRoundRect(ctx, 24, 282, VIEW_WIDTH - 48, 186, 12, '#9aa3a8');
  fillRoundRect(ctx, 24, 282, VIEW_WIDTH - 48, 26, 12, '#c3cbcf');
  const k = state.kitchen;

  // Chopping board.
  const b = LAYOUT.board;
  fillRoundRect(ctx, b.x, b.y, b.w, b.h, 10, '#c99a5b');
  strokeRoundRect(ctx, b.x, b.y, b.w, b.h, 10, '#8a5f30', 4);
  fillRoundRect(ctx, b.x + 18, b.y + 30, b.w - 36, b.h - 62, 8, '#e0b878');
  text(ctx, b.label, b.x + b.w / 2, b.y + b.h - 16, { size: 14, bold: true, color: '#5a3a16', align: 'center' });
  if (k.board.item) {
    drawIngredientIcon(ctx, k.board.item, b.x + b.w / 2 - 18, b.y + 74, 34);
    // The knife rides the chop progress.
    const tilt = -0.5 + (k.board.progress * 3 % 1) * 0.55;
    ctx.save();
    ctx.translate(b.x + b.w / 2 + 52, b.y + 58);
    ctx.rotate(tilt);
    fillRoundRect(ctx, -6, -34, 12, 40, 5, '#39424a');
    ctx.beginPath();
    ctx.moveTo(-4, 4); ctx.lineTo(16, 26); ctx.lineTo(-10, 30); ctx.closePath();
    ctx.fillStyle = '#d7dde2'; ctx.fill();
    ctx.restore();
    fillRoundRect(ctx, b.x + 30, b.y + b.h - 34, b.w - 60, 9, 4, '#8a5f30');
    fillRoundRect(ctx, b.x + 30, b.y + b.h - 34, (b.w - 60) * k.board.progress, 9, 4, k.board.progress >= 1 ? '#3f9e4d' : '#f7b731');
    if (k.board.progress >= 1) text(ctx, 'CHOPPED!', b.x + b.w / 2, b.y + 20, { size: 15, bold: true, color: '#2c6e35', align: 'center' });
  }

  // Grill with two slots.
  const g = LAYOUT.grill;
  fillRoundRect(ctx, g.x, g.y, g.w, g.h, 10, '#39424a');
  strokeRoundRect(ctx, g.x, g.y, g.w, g.h, 10, '#20262b', 4);
  text(ctx, g.label, g.x + g.w / 2, g.y + g.h - 16, { size: 14, bold: true, color: '#f7d774', align: 'center' });
  k.grill.forEach((slot, i) => {
    const cx = g.x + (i + 0.5) * (g.w / 2);
    const cy = g.y + 66;
    circle(ctx, cx, cy, 46, '#20262b');
    circle(ctx, cx, cy, 40, '#4a3320');
    if (slot.item) {
      const st = grillSlotState(slot);
      if (st === 'cooking') {
        // Flame flicker under the pan.
        ctx.fillStyle = '#e86a17';
        for (let f = 0; f < 5; f++) {
          const fx = cx - 28 + f * 14;
          const fh = 12 + Math.sin(now * 17 + f * 1.7 + i * 3) * 5;
          ctx.beginPath();
          ctx.moveTo(fx - 6, cy + 38);
          ctx.lineTo(fx, cy + 38 - fh);
          ctx.lineTo(fx + 6, cy + 38);
          ctx.closePath();
          ctx.fill();
        }
      }
      drawIngredientIcon(ctx, slot.item, cx, cy - 4, 30);
      if (st === 'cooking') steamPuffs(ctx, cx, cy - 34, now + i);
      // Progress ring: fills to green at done, then drains to the burn line.
      ctx.beginPath();
      const total = st === 'burnt' ? 1 : slot.t / (st === 'cooking' ? GRILL_COOK_SECONDS : GRILL_BURN_SECONDS);
      ctx.arc(cx, cy, 52, -Math.PI / 2, -Math.PI / 2 + Math.min(1, total) * Math.PI * 2);
      ctx.strokeStyle = st === 'done' ? '#3f9e4d' : st === 'burnt' ? '#d8402e' : '#f7b731';
      ctx.lineWidth = 6;
      ctx.stroke();
      if (st === 'done') text(ctx, 'READY', cx, cy + 62, { size: 15, bold: true, color: '#69e07e', align: 'center' });
      if (st === 'burnt') text(ctx, 'BURNT!', cx, cy + 62, { size: 15, bold: true, color: '#ff9a8a', align: 'center' });
    }
  });

  // Plating: three plates waiting for builds.
  const p = LAYOUT.plates;
  fillRoundRect(ctx, p.x, p.y, p.w, p.h, 10, '#7a4b8f');
  strokeRoundRect(ctx, p.x, p.y, p.w, p.h, 10, '#4e2c5e', 4);
  text(ctx, p.label, p.x + p.w / 2, p.y + p.h - 16, { size: 14, bold: true, color: '#f3e5ff', align: 'center' });
  k.plates.forEach((plate, i) => {
    const cx = p.x + (i + 0.5) * (p.w / 3);
    drawPlateStack(ctx, plate.items, cx, p.y + 78, 0.92);
    text(ctx, `PLATE ${i + 1}`, cx, p.y + 26, { size: 13, bold: true, color: '#e6ccff', align: 'center' });
  });

  // The pass: serving hatch, bell, and the dish waiting to go out.
  const s = LAYOUT.pass;
  fillRoundRect(ctx, s.x, s.y, s.w, s.h, 10, '#2c6e35');
  strokeRoundRect(ctx, s.x, s.y, s.w, s.h, 10, '#1d4a24', 4);
  fillRoundRect(ctx, s.x + 14, s.y + 14, s.w - 28, 62, 8, '#173d1e');
  // A customer silhouette peers through the hatch.
  circle(ctx, s.x + s.w / 2, s.y + 52, 17, '#e8b07e');
  fillRoundRect(ctx, s.x + s.w / 2 - 20, s.y + 62, 40, 14, 6, '#b3542e');
  text(ctx, s.label, s.x + s.w / 2, s.y + s.h - 16, { size: 14, bold: true, color: '#d9ffd9', align: 'center' });
  // The bell.
  ctx.beginPath();
  ctx.arc(s.x + s.w - 42, s.y + 96, 13, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = '#f7b731'; ctx.fill();
  circle(ctx, s.x + s.w - 42, s.y + 99, 4, '#b3542e');
  if (k.passDish) {
    drawPlateStack(ctx, k.passDish, s.x + 62, s.y + 100, 0.95);
    const match = state.passMatches;
    fillRoundRect(ctx, s.x + 108, s.y + 84, 96, 26, 13, match ? '#3f9e4d' : '#8a5f30');
    text(ctx, match ? 'READY!' : 'NO TICKET', s.x + 156, s.y + 97, { size: 14, bold: true, color: '#ffffff', align: 'center' });
    steamPuffs(ctx, s.x + 62, s.y + 62, now);
  }
}

function drawChef(ctx, state, now) {
  const chef = state.chef;
  const x = chef.x;
  const y = 548;
  const bob = state.phase === 'play' && Math.abs(chef.vx || 0) > 10 ? Math.sin(now * 18) * 3 : 0;
  ctx.save();
  ctx.translate(x, y + bob);
  // Shadow.
  ctx.beginPath();
  ctx.ellipse(0, 44, 34, 9, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fill();
  // Legs and shoes.
  fillRoundRect(ctx, -17, 18, 13, 22, 4, '#39424a');
  fillRoundRect(ctx, 4, 18, 13, 22, 4, '#39424a');
  // Apron body.
  fillRoundRect(ctx, -24, -22, 48, 44, 10, '#fdf6e3');
  fillRoundRect(ctx, -24, -22, 48, 14, 8, '#b3542e');
  // Head and toque.
  circle(ctx, 0, -40, 17, '#e8b07e');
  fillRoundRect(ctx, -15, -58, 30, 10, 4, '#ffffff');
  circle(ctx, -11, -60, 9, '#ffffff');
  circle(ctx, 0, -64, 11, '#ffffff');
  circle(ctx, 11, -60, 9, '#ffffff');
  // Eyes look toward the facing direction.
  const look = chef.facing >= 0 ? 3 : -3;
  circle(ctx, look - 5, -40, 2.2, INK);
  circle(ctx, look + 5, -40, 2.2, INK);
  // Arm toward facing, holding the hand item up.
  const armX = chef.facing >= 0 ? 24 : -24;
  ctx.strokeStyle = '#e8b07e';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(armX * 0.5, -8);
  ctx.lineTo(armX + 10 * chef.facing, -26);
  ctx.stroke();
  ctx.restore();
  if (chef.hand) {
    const hx = x + 36 * chef.facing;
    if (typeof chef.hand === 'object') {
      drawPlateStack(ctx, chef.hand.dish, hx, y - 44 + bob, 0.8);
    } else {
      circle(ctx, hx, y - 40 + bob, 21, 'rgba(253,246,227,0.9)');
      drawIngredientIcon(ctx, chef.hand, hx, y - 40 + bob, 17);
    }
  }
}

function drawFrontCounter(ctx, state) {
  fillRoundRect(ctx, 24, 586, VIEW_WIDTH - 48, 128, 12, '#8a5f30');
  fillRoundRect(ctx, 24, 586, VIEW_WIDTH - 48, 20, 12, '#a9763e');
  BIN_ORDER.forEach((id, i) => {
    const r = binRect(i);
    const ing = INGREDIENTS[id];
    fillRoundRect(ctx, r.x + 6, r.y + 8, r.w - 12, r.h - 34, 8, '#5a4026');
    fillRoundRect(ctx, r.x + 10, r.y + 12, r.w - 20, r.h - 42, 6, '#77552c');
    // A little pile of the ingredient in its bin.
    drawIngredientIcon(ctx, ing.raw, r.x + r.w / 2 - 14, r.y + 42, 17);
    drawIngredientIcon(ctx, ing.raw, r.x + r.w / 2 + 16, r.y + 48, 14);
    text(ctx, ing.name.toUpperCase(), r.x + r.w / 2, r.y + r.h - 12, { size: 13, bold: true, color: '#f7d774', align: 'center' });
    text(ctx, `${i + 1}`, r.x + 16, r.y + 22, { size: 13, bold: true, color: '#e8d9b0' });
  });
  const t = LAYOUT.trash;
  fillRoundRect(ctx, t.x, t.y + 10, t.w, t.h - 10, 8, '#4a4f54');
  fillRoundRect(ctx, t.x - 4, t.y + 2, t.w + 8, 14, 6, '#39424a');
  text(ctx, 'TRASH', t.x + t.w / 2, t.y + t.h - 12, { size: 13, bold: true, color: '#d7dde2', align: 'center' });
}

function drawPopups(ctx, state) {
  for (const pop of state.popups) {
    const life = 1 - pop.t / pop.life;
    ctx.save();
    ctx.globalAlpha = Math.min(1, life * 1.6);
    text(ctx, pop.text, pop.x, pop.y - pop.t * 44, { size: pop.size || 20, bold: true, color: pop.color, align: 'center' });
    ctx.restore();
  }
}

function drawHelpStrip(ctx) {
  fillRoundRect(ctx, 0, 726, VIEW_WIDTH, 74, 0, '#241a12');
  text(ctx, 'Click a bin to grab • chop on the board (click / E) • grill till READY, not BURNT • build on a plate • lift it to the PASS and serve', VIEW_WIDTH / 2, 752, { size: 16, color: '#e8d9b0', align: 'center' });
  text(ctx, 'Move: A/D or ←/→    Work station: E    Grab bin: 1–8    Trash hand: Q    Pause: P', VIEW_WIDTH / 2, 778, { size: 14, color: '#a68a64', align: 'center' });
}

function drawOverlay(ctx, state) {
  ctx.fillStyle = 'rgba(20,12,6,0.72)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  if (state.phase === 'title') {
    text(ctx, 'COPPER LADLE', VIEW_WIDTH / 2, 268, { size: 74, bold: true, color: '#f7b731', align: 'center' });
    text(ctx, 'Rush Hour Kitchen', VIEW_WIDTH / 2, 322, { size: 30, color: '#fdf6e3', align: 'center' });
    text(ctx, 'Tickets are flying in. Chop it, grill it, plate it, serve it —', VIEW_WIDTH / 2, 386, { size: 20, color: '#e8d9b0', align: 'center' });
    text(ctx, 'before the patience bar runs dry. Three walk-outs and the day is done.', VIEW_WIDTH / 2, 414, { size: 20, color: '#e8d9b0', align: 'center' });
    fillRoundRect(ctx, VIEW_WIDTH / 2 - 150, 452, 300, 54, 27, '#b3542e');
    text(ctx, 'CLICK OR PRESS ENTER', VIEW_WIDTH / 2, 480, { size: 20, bold: true, color: '#ffffff', align: 'center' });
  } else if (state.phase === 'over') {
    text(ctx, 'SERVICE OVER', VIEW_WIDTH / 2, 258, { size: 56, bold: true, color: '#f7b731', align: 'center' });
    text(ctx, `Final score  ${state.score}`, VIEW_WIDTH / 2, 330, { size: 30, bold: true, color: '#fdf6e3', align: 'center' });
    text(ctx, `Dishes served ${state.book.served}   •   Walk-outs ${state.book.missed}   •   Best combo x${state.bestCombo}`, VIEW_WIDTH / 2, 372, { size: 20, color: '#e8d9b0', align: 'center' });
    text(ctx, state.hearts <= 0 ? 'The third walk-out closed the kitchen early.' : 'The last ticket is cleared. A clean service!', VIEW_WIDTH / 2, 408, { size: 18, color: '#a68a64', align: 'center' });
    fillRoundRect(ctx, VIEW_WIDTH / 2 - 150, 448, 300, 54, 27, '#b3542e');
    text(ctx, 'ENTER — NEW DAY', VIEW_WIDTH / 2, 476, { size: 20, bold: true, color: '#ffffff', align: 'center' });
  } else if (state.phase === 'paused') {
    text(ctx, 'PAUSED', VIEW_WIDTH / 2, 380, { size: 52, bold: true, color: '#fdf6e3', align: 'center' });
    text(ctx, 'Press P to get back to the rush', VIEW_WIDTH / 2, 424, { size: 19, color: '#e8d9b0', align: 'center' });
  }
}

export function drawScene(ctx, state, now) {
  // Wall and floor.
  fillRoundRect(ctx, 0, 0, VIEW_WIDTH, VIEW_HEIGHT, 0, '#e8d9b0');
  fillRoundRect(ctx, 0, 196, VIEW_WIDTH, 92, 0, '#d9c491');
  for (let x = 0; x < VIEW_WIDTH; x += 64) {
    ctx.strokeStyle = 'rgba(138,95,48,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 196, 64, 46);
    ctx.strokeRect(x + 32, 242, 64, 46);
  }
  fillRoundRect(ctx, 0, 470, VIEW_WIDTH, 256, 0, '#b98d54');
  for (let x = 0; x < VIEW_WIDTH; x += 92) {
    ctx.strokeStyle = 'rgba(90,58,22,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, 470); ctx.lineTo(x - 30, 726); ctx.stroke();
  }
  drawTopBar(ctx, state);
  drawOrderBoard(ctx, state, now);
  drawWorkCounter(ctx, state, now);
  drawChef(ctx, state, now);
  drawFrontCounter(ctx, state);
  drawHelpStrip(ctx);
  drawPopups(ctx, state);
  if (state.phase !== 'play') drawOverlay(ctx, state);
}
