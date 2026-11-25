// main.js — Copper Ladle's game loop and the wiring between its modules:
// orders arrive (orders.js), hands work the stations (stations.js), input
// routes clicks and keys to them (input.js), the renderer paints the result
// (kitchen-render.js) and the synth punctuates it (audio.js).

import { createOrderBook, tickOrderBook, findTicketForDish, serveTicket, DAY_LENGTH_SECONDS } from './orders.js';
import {
  createKitchen, tickStations, takeFromBin, useBoard, chopBoard, useGrill,
  usePlate, usePass, trashHand, VIEW_WIDTH, VIEW_HEIGHT,
} from './stations.js';
import { drawScene } from './kitchen-render.js';
import { bindInput, nearestStationTo, stationCenterX } from './input.js';
import { sfx } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_WIDTH;
canvas.height = VIEW_HEIGHT;
const statusEl = document.getElementById('status');

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGame(seed = 20261125) {
  return {
    phase: 'title', // title | play | paused | over
    frozen: false,
    dayLength: DAY_LENGTH_SECONDS,
    elapsed: 0,
    timeLeft: DAY_LENGTH_SECONDS,
    score: 0,
    combo: 0,
    bestCombo: 0,
    hearts: 3,
    kitchen: createKitchen(),
    book: createOrderBook(),
    chef: { x: 640, facing: 1, hand: null, targetX: null, vx: 0 },
    popups: [],
    passMatches: false,
    rng: mulberry32(seed),
  };
}

let state = createGame();

function popup(x, y, text, color = '#2b1c10', size = 20) {
  state.popups.push({ x, y, text, color, t: 0, life: 1.15, size });
}

function announce(message) {
  if (statusEl) statusEl.textContent = message;
}

function startDay() {
  const seed = (Math.random() * 1e9) | 0;
  state = createGame(seed);
  state.phase = 'play';
  announce('The kitchen is open. First tickets are coming in.');
}

function endDay() {
  state.phase = 'over';
  announce(`Service over. Final score ${state.score}, ${state.book.served} dishes served.`);
}

// --- Station actions ---------------------------------------------------------

function actOnBoard(station) {
  const k = state.kitchen;
  const cx = stationCenterX({ kind: 'board', rect: null });
  if (!state.chef.hand && k.board.item && k.board.progress < 1) {
    const result = chopBoard(k);
    if (result === 'chop') { sfx.chop(); popup(cx, 268, 'CHOP!', '#8a5f30', 17); }
    if (result === 'done') { sfx.chopDone(); popup(cx, 268, 'CHOPPED!', '#2c6e35', 18); }
    return;
  }
  const { hand, outcome } = useBoard(k, state.chef.hand);
  state.chef.hand = hand;
  if (outcome === 'placed') { sfx.place(); popup(cx, 268, 'ON THE BOARD', '#8a5f30', 16); }
  else if (outcome === 'ok') sfx.pickup();
  else if (outcome === 'busy') { sfx.error(); popup(cx, 268, 'BOARD BUSY', '#d8402e', 16); }
}

function actOnGrill(station) {
  const cx = stationCenterX({ kind: 'grill', index: station.index, rect: null });
  const before = state.chef.hand;
  const { hand, outcome } = useGrill(state.kitchen, state.chef.hand, station.index);
  state.chef.hand = hand;
  if (outcome === 'placed') { sfx.place(); sfx.sizzle(); popup(cx, 268, 'ON THE GRILL', '#8a5f30', 16); }
  else if (outcome === 'ok') { sfx.pickup(); if (hand === 'burnt') popup(cx, 268, 'BURNT!', '#d8402e', 17); }
  else if (outcome === 'cooking') { sfx.error(); popup(cx, 268, 'STILL COOKING…', '#e09a17', 16); }
  else if (outcome === 'busy') { sfx.error(); popup(cx, 268, 'SLOT BUSY', '#d8402e', 16); }
  else if (before && outcome === 'empty') { sfx.error(); popup(cx, 268, 'NOTHING TO GRILL', '#d8402e', 15); }
}

function actOnPlate(station) {
  const cx = stationCenterX({ kind: 'plate', index: station.index, rect: null });
  const { hand, outcome } = usePlate(state.kitchen, state.chef.hand, station.index);
  state.chef.hand = hand;
  if (outcome === 'ok') { sfx.plate(); popup(cx, 268, 'PLATED', '#4e2c5e', 15); }
  else if (outcome === 'lifted') { sfx.pickup(); popup(cx, 268, 'DISH UP!', '#4e2c5e', 16); }
  else if (outcome === 'wrong') { sfx.error(); popup(cx, 268, "CAN'T PLATE THAT", '#d8402e', 15); }
  else if (outcome === 'busy') { sfx.error(); popup(cx, 268, 'HANDS FULL', '#d8402e', 16); }
}

function actOnPass() {
  const k = state.kitchen;
  const cx = stationCenterX({ kind: 'pass', rect: null });
  if (!state.chef.hand && k.passDish) {
    const ticket = findTicketForDish(state.book, k.passDish);
    if (!ticket) {
      sfx.error();
      popup(cx, 268, 'NO TICKET WANTS THIS', '#d8402e', 16);
      return;
    }
    const { total } = serveTicket(state.book, ticket);
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    const bonus = (state.combo - 1) * 3;
    state.score += total + bonus;
    k.passDish = null;
    sfx.bell();
    sfx.coin();
    popup(cx, 250, `+${total + bonus} SERVED!`, '#2c6e35', 24);
    announce(`Served ticket ${ticket.id} for ${total + bonus} points.`);
    return;
  }
  const { hand, outcome } = usePass(k, state.chef.hand);
  state.chef.hand = hand;
  if (outcome === 'ready') { sfx.place(); popup(cx, 268, 'AT THE PASS', '#2c6e35', 16); }
  else if (outcome === 'lifted') sfx.pickup();
  else if (outcome === 'busy') { sfx.error(); popup(cx, 268, 'PASS OCCUPIED', '#d8402e', 16); }
}

function actOnStation(station) {
  if (!station) return;
  state.chef.targetX = stationCenterX(station);
  if (stationCenterX(station) !== state.chef.x) {
    state.chef.facing = stationCenterX(station) > state.chef.x ? 1 : -1;
  }
  switch (station.kind) {
    case 'bin': {
      const { hand, outcome } = takeFromBin(state.kitchen, state.chef.hand, station.index);
      if (outcome === 'ok') { state.chef.hand = hand; sfx.pickup(); }
      else { sfx.error(); popup(state.chef.x, 520, 'HANDS FULL', '#d8402e', 16); }
      break;
    }
    case 'board': actOnBoard(station); break;
    case 'grill': actOnGrill(station); break;
    case 'plate': actOnPlate(station); break;
    case 'pass': actOnPass(); break;
    case 'trash': {
      const { hand, outcome } = trashHand(state.kitchen, state.chef.hand);
      state.chef.hand = hand;
      if (outcome === 'trashed') { sfx.trash(); popup(state.chef.x, 520, 'TRASHED', '#4a4f54', 16); }
      break;
    }
    default: break;
  }
}

// --- Update ------------------------------------------------------------------

function update(dt) {
  const chef = state.chef;
  // Chef movement: held keys win; otherwise glide to the clicked station.
  const axis = input.moveAxis();
  if (axis !== 0) {
    chef.targetX = null;
    chef.vx = axis * 620;
    chef.facing = axis > 0 ? 1 : -1;
  } else if (chef.targetX !== null) {
    const dx = chef.targetX - chef.x;
    chef.vx = Math.abs(dx) < 6 ? 0 : Math.sign(dx) * 620;
    if (Math.abs(dx) < 6) { chef.x = chef.targetX; chef.targetX = null; }
  } else {
    chef.vx = 0;
  }
  chef.x = Math.max(50, Math.min(VIEW_WIDTH - 50, chef.x + chef.vx * dt));

  for (const pop of state.popups) pop.t += dt;
  state.popups = state.popups.filter((p) => p.t < p.life);

  if (state.phase !== 'play' || state.frozen) return;

  state.elapsed += dt;
  state.timeLeft = Math.max(0, state.dayLength - state.elapsed);

  const orderEvents = tickOrderBook(state.book, dt, state.elapsed, state.rng);
  if (orderEvents.spawned) popup(300 + state.book.tickets.length * 60, 210, 'NEW TICKET!', '#b3542e', 17);
  for (const _ of orderEvents.expired) {
    state.hearts -= 1;
    state.combo = 0;
    sfx.expire();
    popup(VIEW_WIDTH / 2, 220, 'WALK-OUT! -1 ♥', '#d8402e', 24);
    announce('A customer walked out.');
  }

  const stationEvents = tickStations(state.kitchen, dt);
  if (stationEvents.justDone.length) sfx.grillDone();
  if (stationEvents.justBurnt.length) { sfx.burnt(); popup(480, 268, 'BURNT!', '#d8402e', 18); }

  if (state.timeLeft <= 0 || state.hearts <= 0) endDay();
}

// --- Boot --------------------------------------------------------------------

const input = bindInput(canvas, {
  onPoint(station) {
    sfx.unlock();
    if (state.phase === 'title' || state.phase === 'over') { startDay(); return; }
    if (state.phase === 'paused') return;
    actOnStation(station);
  },
  onKey(key, down) {
    if (!down) return;
    const k = key.toLowerCase();
    if (k === 'enter') {
      if (state.phase === 'title' || state.phase === 'over') startDay();
      return;
    }
    if (state.phase !== 'play') {
      if (k === 'p' && state.phase === 'paused') state.phase = 'play';
      return;
    }
    if (k === 'p') { state.phase = 'paused'; return; }
    if (k === 'e' || k === ' ') { actOnStation(nearestStationTo(state.chef.x)); return; }
    if (k === 'q') { actOnStation({ kind: 'trash', rect: null }); return; }
    const binIndex = ['1', '2', '3', '4', '5', '6', '7', '8'].indexOf(k);
    if (binIndex >= 0) actOnStation({ kind: 'bin', index: binIndex, rect: null });
  },
});

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) stageShot(state, shot);

let last = performance.now();
function frame(nowMs) {
  const dt = Math.min(0.05, (nowMs - last) / 1000);
  last = nowMs;
  update(dt);
  state.passMatches = state.kitchen.passDish
    ? Boolean(findTicketForDish(state.book, state.kitchen.passDish))
    : false;
  drawScene(ctx, state, nowMs / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
