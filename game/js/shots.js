// shots.js — staged scenes for the maker's screenshots (?shot=<name>).
// Each scene arranges a real, frozen game state with the game's own state
// factories — the same kitchen, tickets and dishes a player would build —
// so the render the camera sees is the game itself, never a composite.

function makeTicket(id, recipeId, patienceFrac, patience = 70) {
  return { id, recipeId, patience, patienceLeft: patience * patienceFrac, arrivedAt: 0 };
}

export const SHOT_NAMES = ['cover', 'chop', 'serve', 'rush'];

export function stageShot(state, name) {
  const k = state.kitchen;
  state.phase = 'play';
  state.frozen = true;
  if (name === 'cover') {
    state.elapsed = 43;
    state.timeLeft = state.dayLength - 43;
    state.score = 86;
    state.combo = 2;
    state.book.tickets = [
      makeTicket(7, 'ember-burger', 0.62),
      makeTicket(8, 'garden-stack', 0.85),
      makeTicket(9, 'sunrise-plate', 0.4),
    ];
    k.board.item = 'lettuce-raw';
    k.board.progress = 0.66;
    k.grill[0] = { item: 'chicken-raw', t: 3.4 };
    k.plates[0].items = ['bun', 'patty-grilled'];
    k.plates[1].items = ['bun'];
    k.passDish = ['bun', 'patty-grilled', 'cheese-slice', 'tomato-chopped'];
    state.chef.x = 470;
    state.chef.facing = 1;
    state.chef.hand = 'tomato-chopped';
  } else if (name === 'chop') {
    state.elapsed = 22;
    state.timeLeft = state.dayLength - 22;
    state.score = 24;
    state.book.tickets = [makeTicket(3, 'garden-stack', 0.78), makeTicket(4, 'ember-burger', 0.55)];
    k.board.item = 'tomato-raw';
    k.board.progress = 0.34;
    k.grill[0] = { item: 'patty-raw', t: 2.2 };
    k.plates[0].items = ['bun'];
    state.chef.x = 185;
    state.chef.facing = 1;
  } else if (name === 'serve') {
    state.elapsed = 66;
    state.timeLeft = state.dayLength - 66;
    state.score = 132;
    state.combo = 3;
    state.book.served = 5;
    state.book.tickets = [makeTicket(11, 'garden-stack', 0.7), makeTicket(12, 'clucky-melt', 0.5)];
    k.passDish = ['bun', 'lettuce-chopped', 'tomato-chopped', 'cheese-slice'];
    k.grill[1] = { item: 'egg-raw', t: 7.2 };
    k.plates[0].items = ['bun', 'chicken-grilled'];
    state.chef.x = 1010;
    state.chef.facing = 1;
    state.popups.push({ x: 1040, y: 268, text: '+24 SERVED!', color: '#2c6e35', t: 0.4, life: 99, size: 24 });
  } else if (name === 'rush') {
    state.elapsed = 112;
    state.timeLeft = state.dayLength - 112;
    state.score = 210;
    state.combo = 4;
    state.hearts = 2;
    state.book.served = 9;
    state.book.tickets = [
      makeTicket(14, 'double-trouble', 0.3),
      makeTicket(15, 'clucky-melt', 0.18, 60),
      makeTicket(16, 'ember-burger', 0.5),
      makeTicket(17, 'smokehouse-hash', 0.42),
    ];
    k.board.item = 'potato-raw';
    k.board.progress = 0.5;
    k.grill[0] = { item: 'patty-raw', t: 7.4 };
    k.grill[1] = { item: 'chicken-raw', t: 4.6 };
    k.plates[0].items = ['bun', 'chicken-grilled', 'cheese-slice'];
    k.plates[1].items = ['potato-chopped'];
    state.chef.x = 760;
    state.chef.facing = -1;
    state.chef.hand = 'cheese-slice';
  }
}
