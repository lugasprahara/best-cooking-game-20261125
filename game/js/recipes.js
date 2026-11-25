// recipes.js — the Copper Ladle pantry and menu.
// Every ingredient has a raw state and, for most, a prepared state it reaches
// at one station: the chopping board (chop) or the grill (grill). A dish is a
// list of prepared-state ids; a plate matches a ticket when it holds exactly
// the same states, in any order.

export const INGREDIENTS = {
  tomato:  { name: 'Tomato',  prep: 'chop',  raw: 'tomato-raw',  ready: 'tomato-chopped',  body: '#d8402e', leaf: '#3f9e4d' },
  lettuce: { name: 'Lettuce', prep: 'chop',  raw: 'lettuce-raw', ready: 'lettuce-chopped', body: '#69b84a', leaf: '#4c9440' },
  potato:  { name: 'Potato',  prep: 'chop',  raw: 'potato-raw',  ready: 'potato-chopped',  body: '#c9a35f', leaf: '#a37f3e' },
  patty:   { name: 'Beef patty', prep: 'grill', raw: 'patty-raw', ready: 'patty-grilled', body: '#8a5632', leaf: '#6f4225' },
  chicken: { name: 'Chicken', prep: 'grill', raw: 'chicken-raw', ready: 'chicken-grilled', body: '#e8b07e', leaf: '#c9853f' },
  egg:     { name: 'Egg',     prep: 'grill', raw: 'egg-raw',     ready: 'egg-fried',       body: '#f6ead2', leaf: '#f2b33d' },
  cheese:  { name: 'Cheese',  prep: 'none',  raw: 'cheese-slice', ready: 'cheese-slice',   body: '#f7b731', leaf: '#e09a17' },
  bun:     { name: 'Bun',     prep: 'none',  raw: 'bun',          ready: 'bun',            body: '#e5aa63', leaf: '#c9853f' },
};

export const BIN_ORDER = ['tomato', 'lettuce', 'potato', 'patty', 'chicken', 'egg', 'cheese', 'bun'];

// What a hand can hold is a state id: a raw ingredient, its prepared state,
// a ready-to-use ingredient (cheese, bun), or 'burnt' from the grill.
export const BURNT = 'burnt';

export function ingredientOfState(stateId) {
  for (const [id, ing] of Object.entries(INGREDIENTS)) {
    if (ing.raw === stateId || ing.ready === stateId) return { id, ...ing };
  }
  return null;
}

export function isChoppable(stateId) {
  const ing = ingredientOfState(stateId);
  return Boolean(ing && ing.prep === 'chop' && ing.raw === stateId);
}

export function isGrillable(stateId) {
  const ing = ingredientOfState(stateId);
  return Boolean(ing && ing.prep === 'grill' && ing.raw === stateId);
}

export function readyStateOf(stateId) {
  const ing = ingredientOfState(stateId);
  return ing ? ing.ready : stateId;
}

// The menu. needs lists prepared states; unlockAt is the day-second from
// which the dish can appear on tickets; price is the base score it pays.
export const RECIPES = [
  { id: 'garden-stack', name: 'Garden Stack', needs: ['bun', 'lettuce-chopped', 'tomato-chopped', 'cheese-slice'], price: 14, unlockAt: 0 },
  { id: 'ember-burger', name: 'Ember Burger', needs: ['bun', 'patty-grilled', 'cheese-slice', 'tomato-chopped'], price: 15, unlockAt: 0 },
  { id: 'sunrise-plate', name: 'Sunrise Plate', needs: ['egg-fried', 'potato-chopped', 'tomato-chopped'], price: 13, unlockAt: 20 },
  { id: 'clucky-melt', name: 'Clucky Melt', needs: ['bun', 'chicken-grilled', 'cheese-slice', 'lettuce-chopped'], price: 16, unlockAt: 45 },
  { id: 'ranch-hand-plate', name: 'Ranch Hand Plate', needs: ['chicken-grilled', 'potato-chopped', 'cheese-slice'], price: 16, unlockAt: 58 },
  { id: 'smokehouse-hash', name: 'Smokehouse Hash', needs: ['potato-chopped', 'patty-grilled', 'egg-fried'], price: 15, unlockAt: 70 },
  { id: 'double-trouble', name: 'Double Trouble', needs: ['bun', 'patty-grilled', 'patty-grilled', 'cheese-slice', 'lettuce-chopped'], price: 20, unlockAt: 95 },
];

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id) || null;
}

export function dishMatchesRecipe(items, recipe) {
  if (!recipe || items.length !== recipe.needs.length) return false;
  const held = [...items].sort();
  const needs = [...recipe.needs].sort();
  return held.every((item, i) => item === needs[i]);
}
