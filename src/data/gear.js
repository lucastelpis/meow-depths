/**
 * gear.js — Meow Depths Equipment, Materials, Sets & Consumables
 *
 * Contains every craftable item the player can equip, the raw materials
 * needed to forge them, set-bonus definitions, and purchasable consumables.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Raw Materials — dropped by enemies, used to craft gear
// ─────────────────────────────────────────────────────────────────────────────

export const MATERIALS = {
  // Zone 1 — Soggy Sewers (Black Crystals)
  black_shard:         { name: 'Black Crystal Shard' },
  black_crystal_small: { name: 'Small Black Crystal' },
  black_crystal_big:   { name: 'Big Black Crystal' },
  black_crystal_core:  { name: 'Black Crystal Core' },

  // Zone 2 — Twisted Garden (Green Crystals)
  green_shard:         { name: 'Green Crystal Shard' },
  green_crystal_small: { name: 'Small Green Crystal' },
  green_crystal_big:   { name: 'Big Green Crystal' },
  green_crystal_core:  { name: 'Green Crystal Core' },

  // Zone 3 — Sunken Docks (Yellow Crystals)
  yellow_shard:         { name: 'Yellow Crystal Shard' },
  yellow_crystal_small: { name: 'Small Yellow Crystal' },
  yellow_crystal_big:   { name: 'Big Yellow Crystal' },
  yellow_crystal_core:  { name: 'Yellow Crystal Core' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Set Bonuses — activated when both pieces are equipped simultaneously
// ─────────────────────────────────────────────────────────────────────────────

export const SET_BONUSES = {
  sewer_set: {
    name: 'Sewer Set',
    pieces: ['sewer_shiv', 'gnarlcrown'],
    armorZone: 1,
    bonus: 'Bleed damage +50%',
    effect: { type: 'bleed_boost_percent', value: 0.5 },
  },
  garden_set: {
    name: 'Garden Set',
    pieces: ['thorn_dagger', 'rootmother_eye'],
    armorZone: 2,
    bonus: 'Skill cooldowns reduced by 1 turn',
    effect: { type: 'cooldown_reduction', value: 1 },
  },
  docks_set: {
    name: 'Docks Set',
    pieces: ['ghost_cutlass', 'morays_compass'],
    armorZone: 3,
    bonus: 'After dodging, next attack automatically stuns',
    effect: { type: 'dodge_stun' },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Zone 1 Gear — The Soggy Sewers
// ─────────────────────────────────────────────────────────────────────────────

const toy_sword = {
  id: 'toy_sword',
  name: 'Toy Sword',
  type: 'weapon',
  zone: 1,
  materials: [],
  stats: { attack: 1 },
  setId: null,
  specialEffect: null,
};

const cardboard_armor = {
  id: 'cardboard_armor',
  name: 'Cardboard Armor',
  type: 'chest',
  zone: 1,
  materials: [],
  stats: { defence: 1 },
  setId: null,
  specialEffect: null,
};

const sewer_shiv = {
  id: 'sewer_shiv',
  name: 'Sewer Shiv',
  type: 'weapon',
  zone: 1,
  goldCost: 80,
  materials: [
    { itemId: 'black_shard', qty: 18 },
    { itemId: 'black_crystal_small', qty: 8 },
  ],
  stats: { attack: 12, bleedChance: 0.15 },
  setId: 'sewer_set',
  specialEffect: null,
};

const rat_hide_vest = {
  id: 'rat_hide_vest',
  name: 'Rat Hide Vest',
  type: 'chest',
  zone: 1,
  goldCost: 60,
  materials: [
    { itemId: 'black_shard', qty: 20 },
    { itemId: 'black_crystal_small', qty: 5 },
  ],
  stats: { maxHp: 18, dodge: 0.05 },
  setId: 'sewer_set',
  specialEffect: null,
};

const slimecrawler_shell = {
  id: 'slimecrawler_shell',
  name: 'Slimecrawler Shell',
  type: 'chest',
  zone: 1,
  goldCost: 75,
  materials: [
    { itemId: 'black_shard', qty: 12 },
    { itemId: 'black_crystal_small', qty: 10 },
  ],
  stats: { maxHp: 22, poisonImmune: true },
  setId: 'sewer_set',
  specialEffect: null,
};

const plague_cloak = {
  id: 'plague_cloak',
  name: 'Plague Cloak',
  type: 'chest',
  zone: 1,
  goldCost: 65,
  materials: [
    { itemId: 'black_shard', qty: 14 },
    { itemId: 'black_crystal_small', qty: 7 },
  ],
  stats: { maxHp: 14, defence: 4 },
  setId: 'sewer_set',
  specialEffect: null,
};

const gnarlcrown = {
  id: 'gnarlcrown',
  name: 'Gnarlcrown',
  type: 'trinket',
  zone: 1,
  goldCost: 120,
  materials: [
    { itemId: 'black_crystal_small', qty: 8 },
    { itemId: 'black_crystal_big', qty: 5 },
    { itemId: 'black_crystal_core', qty: 2 },
  ],
  stats: { critChance: 0.10 },
  setId: 'sewer_set',
  specialEffect: null,
};

const cockroach_carapace = {
  id: 'cockroach_carapace',
  name: 'Cockroach Carapace',
  type: 'trinket',
  zone: 1,
  goldCost: 100,
  materials: [
    { itemId: 'black_crystal_small', qty: 10 },
    { itemId: 'black_crystal_big', qty: 4 },
  ],
  stats: { defence: 4, dodge: 0.05 },
  setId: 'sewer_set',
  specialEffect: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Zone 2 Gear — The Twisted Garden
// ─────────────────────────────────────────────────────────────────────────────

const thorn_dagger = {
  id: 'thorn_dagger',
  name: 'Thorn Dagger',
  type: 'weapon',
  zone: 2,
  goldCost: 140,
  materials: [
    { itemId: 'green_shard', qty: 18 },
    { itemId: 'green_crystal_small', qty: 8 },
  ],
  stats: { attack: 20, poisonChance: 0.20 },
  setId: 'garden_set',
  specialEffect: null,
};

const beetle_shell_vest = {
  id: 'beetle_shell_vest',
  name: 'Beetle Shell Vest',
  type: 'chest',
  zone: 2,
  goldCost: 130,
  materials: [
    { itemId: 'green_shard', qty: 20 },
    { itemId: 'green_crystal_small', qty: 10 },
  ],
  stats: { maxHp: 30, defence: 8 },
  setId: 'garden_set',
  specialEffect: null,
};

const spore_cloak = {
  id: 'spore_cloak',
  name: 'Spore Cloak',
  type: 'chest',
  zone: 2,
  goldCost: 115,
  materials: [
    { itemId: 'green_shard', qty: 12 },
    { itemId: 'green_crystal_small', qty: 10 },
  ],
  stats: { maxHp: 24, dodge: 0.10 },
  setId: 'garden_set',
  specialEffect: null,
};

const vine_wrap = {
  id: 'vine_wrap',
  name: 'Vine Wrap',
  type: 'chest',
  zone: 2,
  goldCost: 120,
  materials: [
    { itemId: 'green_shard', qty: 15 },
    { itemId: 'green_crystal_small', qty: 8 },
  ],
  stats: { maxHp: 20, defence: 6, critChance: 0.05 },
  setId: 'garden_set',
  specialEffect: null,
};

const rootmother_eye = {
  id: 'rootmother_eye',
  name: 'Rootmother Eye',
  type: 'trinket',
  zone: 2,
  goldCost: 200,
  materials: [
    { itemId: 'green_crystal_small', qty: 8 },
    { itemId: 'green_crystal_big', qty: 5 },
    { itemId: 'green_crystal_core', qty: 2 },
  ],
  stats: { skillDamage: 0.15 },
  setId: 'garden_set',
  specialEffect: null,
};

const glowspore_vial = {
  id: 'glowspore_vial',
  name: 'Glowspore Vial',
  type: 'trinket',
  zone: 2,
  goldCost: 170,
  materials: [
    { itemId: 'green_crystal_small', qty: 10 },
    { itemId: 'green_crystal_big', qty: 4 },
  ],
  stats: { critChance: 0.08, dodge: 0.05 },
  setId: 'garden_set',
  specialEffect: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Zone 3 Gear — The Sunken Docks
// ─────────────────────────────────────────────────────────────────────────────

const ghost_cutlass = {
  id: 'ghost_cutlass',
  name: 'Ghost Cutlass',
  type: 'weapon',
  zone: 3,
  goldCost: 220,
  materials: [
    { itemId: 'yellow_shard', qty: 18 },
    { itemId: 'yellow_crystal_small', qty: 8 },
  ],
  stats: { attack: 28, stunChance: 0.12 },
  setId: 'docks_set',
  specialEffect: null,
};

const barnacle_plate = {
  id: 'barnacle_plate',
  name: 'Barnacle Plate',
  type: 'chest',
  zone: 3,
  goldCost: 210,
  materials: [
    { itemId: 'yellow_shard', qty: 20 },
    { itemId: 'yellow_crystal_small', qty: 10 },
  ],
  stats: { maxHp: 40, defence: 10 },
  setId: 'docks_set',
  specialEffect: null,
};

const ghost_silk_coat = {
  id: 'ghost_silk_coat',
  name: 'Ghost Silk Coat',
  type: 'chest',
  zone: 3,
  goldCost: 190,
  materials: [
    { itemId: 'yellow_shard', qty: 12 },
    { itemId: 'yellow_crystal_small', qty: 10 },
  ],
  stats: { maxHp: 30, dodge: 0.15 },
  setId: 'docks_set',
  specialEffect: null,
};

const saltcaptain_coat = {
  id: 'saltcaptain_coat',
  name: 'Saltcaptain Coat',
  type: 'chest',
  zone: 3,
  goldCost: 200,
  materials: [
    { itemId: 'yellow_shard', qty: 15 },
    { itemId: 'yellow_crystal_small', qty: 8 },
  ],
  stats: { maxHp: 34, defence: 8, dodge: 0.08 },
  setId: 'docks_set',
  specialEffect: null,
};

const morays_compass = {
  id: 'morays_compass',
  name: "Moray's Compass",
  type: 'trinket',
  zone: 3,
  goldCost: 300,
  materials: [
    { itemId: 'yellow_crystal_small', qty: 8 },
    { itemId: 'yellow_crystal_big', qty: 5 },
    { itemId: 'yellow_crystal_core', qty: 2 },
  ],
  stats: { critChance: 0.20, dodge: 0.10 },
  setId: 'docks_set',
  specialEffect: null,
};

const toxin_vial = {
  id: 'toxin_vial',
  name: 'Toxin Vial',
  type: 'trinket',
  zone: 3,
  goldCost: 260,
  materials: [
    { itemId: 'yellow_crystal_small', qty: 10 },
    { itemId: 'yellow_crystal_big', qty: 4 },
  ],
  stats: { bleedExtraDamage: 2 },
  setId: 'docks_set',
  specialEffect: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Consumables — purchasable from camp shop, single-use in combat
// ─────────────────────────────────────────────────────────────────────────────

export const CONSUMABLES = [
  {
    id: 'potion',
    name: 'Potion',
    cost: 50,
    minLevel: 1,
    effect: { type: 'heal', amount: 50 },
    description: 'Restore 50 HP',
  },
  {
    id: 'super_potion',
    name: 'Super Potion',
    cost: 100,
    minLevel: 10,
    effect: { type: 'heal', amount: 100 },
    description: 'Restore 100 HP',
  },
  {
    id: 'mega_potion',
    name: 'Mega Potion',
    cost: 250,
    minLevel: 20,
    effect: { type: 'heal', amount: 150 },
    description: 'Restore 150 HP',
  },
  {
    id: 'ultra_potion',
    name: 'Ultra Potion',
    cost: 400,
    minLevel: 30,
    effect: { type: 'heal', amount: 200 },
    description: 'Restore 200 HP',
  },
  {
    id: 'antidote',
    name: 'Antidote',
    cost: 25,
    effect: { type: 'remove_bleed' },
    description: 'Remove all Bleed stacks',
  },
  {
    id: 'smoke_vial',
    name: 'Smoke Vial',
    cost: 40,
    effect: { type: 'debuff_attack', reduction: 0.3, duration: 2 },
    description: 'Reduce all enemy Attack by 30% for 2 turns',
  },
  {
    id: 'mystery_chest',
    name: 'Mystery Chest',
    cost: 50,
    effect: { type: 'lootbox' },
    description: 'Open to receive random crystals, with a small chance for a Crystal Core!',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Aggregated gear map — keyed by item id for O(1) lookup
// ─────────────────────────────────────────────────────────────────────────────

export const GEAR = {
  // Starter gear
  toy_sword,
  cardboard_armor,
  // Zone 1
  sewer_shiv,
  rat_hide_vest,
  slimecrawler_shell,
  plague_cloak,
  gnarlcrown,
  cockroach_carapace,
  // Zone 2
  thorn_dagger,
  beetle_shell_vest,
  spore_cloak,
  vine_wrap,
  rootmother_eye,
  glowspore_vial,
  // Zone 3
  ghost_cutlass,
  barnacle_plate,
  ghost_silk_coat,
  saltcaptain_coat,
  morays_compass,
  toxin_vial,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper — returns an array of gear available in a specific zone
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {number} zone — 1, 2, or 3
 * @returns {Array} gear items craftable in that zone
 */
export function getGearByZone(zone) {
  return Object.values(GEAR).filter((item) => item.zone === zone);
}

// ─────────────────────────────────────────────────────────────────────────────
// Equipment slots — the 8 gear slots on the hero
// ─────────────────────────────────────────────────────────────────────────────

export const EQUIP_SLOTS = [
  'weapon', 'head', 'chest', 'legs', 'gloves', 'boots', 'trinket1', 'trinket2',
];

// Which gear `type`s are valid for each slot. head/legs/gloves/boots have no
// gear defined yet — they remain empty until that gear is added.
export const SLOT_TYPES = {
  weapon:   ['weapon'],
  head:     ['head'],
  chest:    ['chest'],
  legs:     ['legs'],
  gloves:   ['gloves'],
  boots:    ['boots'],
  trinket1: ['trinket'],
  trinket2: ['trinket'],
};

/**
 * @param {string} slot — one of EQUIP_SLOTS
 * @returns {Array} gear items whose `type` is valid for the given slot
 */
export function getGearForSlot(slot) {
  const validTypes = SLOT_TYPES[slot] || [];
  return Object.values(GEAR).filter((item) => validTypes.includes(item.type));
}

export default GEAR;
