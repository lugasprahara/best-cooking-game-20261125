// stations.js — the kitchen furniture and everything a hand can do in it.
// The layout constants here are the single map of the kitchen: the renderer
// draws from them and the input routing hit-tests against them, so what you
// see is exactly what you can click.

import { BIN_ORDER, INGREDIENTS, isChoppable, isGrillable, readyStateOf, BURNT } from './recipes.js';

export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 800;

export const LAYOUT = {
  board:  { x: 56,   y: 300, w: 250, h: 150, label: 'CHOPPING BOARD' },
  grill:  { x: 330,  y: 300, w: 300, h: 150, label: 'GRILL' },
  plates: { x: 654,  y: 300, w: 300, h: 150, label: 'PLATING' },
  pass:   { x: 978,  y: 300, w: 246, h: 150, label: 'PASS — SERVE' },
  trash:  { x: 1112, y: 596, w: 112, h: 108, label: 'BIN' },
};

export const GRILL_SLOTS = 2;
export const PLATE_COUNT = 3;
export const GRILL_COOK_SECONDS = 6;
export const GRILL_BURN_SECONDS = 11;
export const CHOP_PER_HIT = 0.34;

export function binRect(index) {
  return { x: 40 + index * 132, y: 596, w: 120, h: 108 };
}

export function createKitchen() {
  return {
    board: { item: null, progress: 0 },
    grill: Array.from({ length: GRILL_SLOTS }, () => ({ item: null, t: 0 })),
    plates: Array.from({ length: PLATE_COUNT }, () => ({ items: [] })),
    passDish: null, // a lifted plate waiting at the pass, ready to serve
  };
}

export function grillSlotState(slot) {
  if (!slot.item) return 'empty';
  if (slot.t < GRILL_COOK_SECONDS) return 'cooking';
  if (slot.t < GRILL_BURN_SECONDS) return 'done';
  return 'burnt';
}

export function tickStations(kitchen, dt) {
  const events = { justDone: [], justBurnt: [] };
  for (const slot of kitchen.grill) {
    if (!slot.item) continue;
    const before = grillSlotState(slot);
    slot.t += dt;
    const after = grillSlotState(slot);
    if (before === 'cooking' && after === 'done') events.justDone.push(slot);
    if (before === 'done' && after === 'burnt') {
      slot.item = BURNT;
      events.justBurnt.push(slot);
    }
  }
  return events;
}

// --- Hand actions. A hand holds null, a state id, or { dish: [stateIds] }.
// Each action returns a short outcome word the caller turns into sound and
// popups: 'ok', 'busy', 'wrong', 'full', 'empty'.

export function takeFromBin(kitchen, hand, binIndex) {
  if (hand) return 'busy';
  const id = BIN_ORDER[binIndex];
  return { hand: INGREDIENTS[id].raw, outcome: 'ok' };
}

export function useBoard(kitchen, hand) {
  const board = kitchen.board;
  if (hand && !board.item && isChoppable(hand)) {
    board.item = hand;
    board.progress = 0;
    return { hand: null, outcome: 'placed' };
  }
  if (!hand && board.item) {
    if (board.progress >= 1) {
      const done = readyStateOf(board.item);
      board.item = null;
      board.progress = 0;
      return { hand: done, outcome: 'ok' };
    }
    return { hand: null, outcome: 'empty' };
  }
  if (hand && board.item) return { hand, outcome: 'busy' };
  return { hand, outcome: 'empty' };
}

export function chopBoard(kitchen) {
  const board = kitchen.board;
  if (!board.item || board.progress >= 1) return 'empty';
  board.progress = Math.min(1, board.progress + CHOP_PER_HIT);
  return board.progress >= 1 ? 'done' : 'chop';
}

export function useGrill(kitchen, hand, slotIndex) {
  const slot = kitchen.grill[slotIndex];
  if (hand && !slot.item && isGrillable(hand)) {
    slot.item = hand;
    slot.t = 0;
    return { hand: null, outcome: 'placed' };
  }
  if (!hand && slot.item) {
    const state = grillSlotState(slot);
    if (state === 'done') {
      const done = readyStateOf(slot.item);
      slot.item = null;
      slot.t = 0;
      return { hand: done, outcome: 'ok' };
    }
    if (state === 'burnt') {
      slot.item = null;
      slot.t = 0;
      return { hand: BURNT, outcome: 'ok' };
    }
    return { hand: null, outcome: 'cooking' };
  }
  if (hand && slot.item) return { hand, outcome: 'busy' };
  return { hand, outcome: 'empty' };
}

export function usePlate(kitchen, hand, plateIndex) {
  const plate = kitchen.plates[plateIndex];
  if (hand && typeof hand === 'string') {
    if (hand === BURNT) return { hand, outcome: 'wrong' };
    plate.items.push(hand);
    return { hand: null, outcome: 'ok' };
  }
  if (!hand && plate.items.length > 0) {
    const dish = { dish: [...plate.items] };
    plate.items = [];
    return { hand: dish, outcome: 'lifted' };
  }
  if (hand && typeof hand === 'object') return { hand, outcome: 'busy' };
  return { hand, outcome: 'empty' };
}

export function usePass(kitchen, hand) {
  if (hand && typeof hand === 'object') {
    if (kitchen.passDish) return { hand, outcome: 'busy' };
    kitchen.passDish = hand.dish;
    return { hand: null, outcome: 'ready' };
  }
  if (!hand && kitchen.passDish) {
    const dish = { dish: kitchen.passDish };
    kitchen.passDish = null;
    return { hand: dish, outcome: 'lifted' };
  }
  return { hand, outcome: 'empty' };
}

export function trashHand(kitchen, hand) {
  if (!hand) return { hand: null, outcome: 'empty' };
  return { hand: null, outcome: 'trashed' };
}
