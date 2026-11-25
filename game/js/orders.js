// orders.js — the order board: customer tickets that arrive, wait, and leave.
// A ticket names a recipe, carries a patience budget that drains in real
// time, and pays a tip that shrinks as the patience does. Pressure grows
// over the day: tickets arrive faster, wait less, and unlock richer dishes.

import { RECIPES, dishMatchesRecipe } from './recipes.js';

export const DAY_LENGTH_SECONDS = 150;
export const MAX_TICKETS = 4;

export function createOrderBook() {
  return { tickets: [], nextTicketId: 1, spawnIn: 1.2, served: 0, missed: 0 };
}

export function spawnInterval(elapsed) {
  // 13s between the first tickets, tightening to 7s in the last minute.
  return Math.max(7, 13 - elapsed * 0.045);
}

export function patienceFor(elapsed) {
  // Early tickets wait 80s; late-day tickets only 52s.
  return Math.max(52, 80 - elapsed * 0.19);
}

export function unlockedRecipes(elapsed) {
  return RECIPES.filter((r) => elapsed >= r.unlockAt);
}

export function maybeSpawnTicket(book, elapsed, rng) {
  book.spawnIn -= 0; // spawn timing is advanced by tickOrderBook
  if (book.tickets.length >= MAX_TICKETS) return null;
  const pool = unlockedRecipes(elapsed);
  const recipe = pool[Math.floor(rng() * pool.length)];
  const patience = patienceFor(elapsed);
  const ticket = {
    id: book.nextTicketId++,
    recipeId: recipe.id,
    patience,
    patienceLeft: patience,
    arrivedAt: elapsed,
  };
  book.tickets.push(ticket);
  return ticket;
}

export function tickOrderBook(book, dt, elapsed, rng) {
  const events = { spawned: null, expired: [] };
  book.spawnIn -= dt;
  if (book.spawnIn <= 0) {
    events.spawned = maybeSpawnTicket(book, elapsed, rng);
    book.spawnIn = spawnInterval(elapsed) * (0.85 + rng() * 0.3);
  }
  for (const ticket of book.tickets) ticket.patienceLeft -= dt;
  const before = book.tickets.length;
  book.tickets = book.tickets.filter((t) => t.patienceLeft > 0);
  if (book.tickets.length < before) {
    const gone = before - book.tickets.length;
    book.missed += gone;
    for (let i = 0; i < gone; i++) events.expired.push(true);
  }
  return events;
}

export function findTicketForDish(book, items) {
  // The happiest match wins: serve the ticket with the least patience left
  // among those the dish satisfies, so no plate is wasted on a calm ticket.
  let best = null;
  for (const ticket of book.tickets) {
    const recipe = RECIPES.find((r) => r.id === ticket.recipeId);
    if (dishMatchesRecipe(items, recipe) && (!best || ticket.patienceLeft < best.patienceLeft)) {
      best = ticket;
    }
  }
  return best;
}

export function serveTicket(book, ticket) {
  book.tickets = book.tickets.filter((t) => t !== ticket);
  book.served += 1;
  const recipe = RECIPES.find((r) => r.id === ticket.recipeId);
  const tip = Math.round(10 * (ticket.patienceLeft / ticket.patience));
  return { base: recipe.price, tip, total: recipe.price + tip };
}
