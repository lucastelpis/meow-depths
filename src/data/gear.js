/**
 * gear.js — Meow Depths Equipment, Materials, Sets & Consumables
 *
 * Contains every craftable item the player can equip, the raw materials
 * needed to forge them, set-bonus definitions, and purchasable consumables.
 *
 * Shape reference (GEAR):
 *   id            – unique key
 *   name          – display name
 *   type          – 'weapon' | 'armor' | 'trinket'
 *   zone          – dungeon zone where the recipe is available (1-3)
 *   materials     – array of { itemId, qty }
 *   stats         – stat modifiers granted while equipped
 *   setId         – links to SET_BONUSES for 2-piece bonus tracking
 *   specialEffect – flavour text / tooltip for unique gear effects (or null)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Raw Materials — dropped by enemies, used to craft gear
// ─────────────────────────────────────────────────────────────────────────────

export const MATERIALS = {
  // Zone 1 — Soggy Sewers
  rat_tail:         { name: 'Rat Tail' },
  slime_glob:       { name: 'Slime Glob' },
  carapace_chip:    { name: 'Carapace Chip' },
  frog_mucus:       { name: 'Frog Mucus' },
  gnarlcrown_shard: { name: 'Gnarlcrown Shard' },
  // Zone 2 — Twisted Garden
  thorn_shard:      { name: 'Thorn Shard' },
  beetle_shell:     { name: 'Beetle Shell' },
  glowspore:        { name: 'Glowspore' },
  strangling_vine:  { name: 'Strangling Vine' },
  rootmother_heart: { name: 'Rootmother Heart' },
  // Zone 3 — Sunken Docks
  barnacle_core:    { name: 'Barnacle Core' },
  ghost_silk:       { name: 'Ghost Silk' },
  spectral_coin:    { name: 'Spectral Coin' },
  toxin_sac:        { name: 'Toxin Sac' },
  morays_fang:      { name: "Moray's Fang" },
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

const sewer_shiv = {
  id: 'sewer_shiv',
  name: 'Sewer Shiv',
  type: 'weapon',
  zone: 1,
  materials: [
    { itemId: 'rat_tail', qty: 3 },
    { itemId: 'gnarlcrown_shard', qty: 1 },
  ],
  stats: { attack: 12, bleedChance: 0.15 },
  setId: 'sewer_set',
  specialEffect: null,
};

const rat_hide_vest = {
  id: 'rat_hide_vest',
  name: 'Rat Hide Vest',
  type: 'armor',
  zone: 1,
  materials: [
    { itemId: 'rat_tail', qty: 4 },
  ],
  stats: { maxHp: 18, dodge: 0.05 },
  setId: 'sewer_set',
  specialEffect: null,
};

const slimecrawler_shell = {
  id: 'slimecrawler_shell',
  name: 'Slimecrawler Shell',
  type: 'armor',
  zone: 1,
  materials: [
    { itemId: 'slime_glob', qty: 4 },
  ],
  stats: { maxHp: 22, poisonImmune: true },
  setId: 'sewer_set',
  specialEffect: null,
};

const plague_cloak = {
  id: 'plague_cloak',
  name: 'Plague Cloak',
  type: 'armor',
  zone: 1,
  materials: [
    { itemId: 'frog_mucus', qty: 3 },
    { itemId: 'carapace_chip', qty: 2 },
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
  materials: [
    { itemId: 'gnarlcrown_shard', qty: 1 },
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
  materials: [
    { itemId: 'carapace_chip', qty: 4 },
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
  materials: [
    { itemId: 'thorn_shard', qty: 3 },
    { itemId: 'rootmother_heart', qty: 1 },
  ],
  stats: { attack: 20, poisonChance: 0.20 },
  setId: 'garden_set',
  specialEffect: null,
};

const beetle_shell_vest = {
  id: 'beetle_shell_vest',
  name: 'Beetle Shell Vest',
  type: 'armor',
  zone: 2,
  materials: [
    { itemId: 'beetle_shell', qty: 4 },
  ],
  stats: { maxHp: 30, defence: 8 },
  setId: 'garden_set',
  specialEffect: null,
};

const spore_cloak = {
  id: 'spore_cloak',
  name: 'Spore Cloak',
  type: 'armor',
  zone: 2,
  materials: [
    { itemId: 'glowspore', qty: 4 },
  ],
  stats: { maxHp: 24, dodge: 0.10 },
  setId: 'garden_set',
  specialEffect: null,
};

const vine_wrap = {
  id: 'vine_wrap',
  name: 'Vine Wrap',
  type: 'armor',
  zone: 2,
  materials: [
    { itemId: 'strangling_vine', qty: 3 },
    { itemId: 'thorn_shard', qty: 2 },
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
  materials: [
    { itemId: 'rootmother_heart', qty: 1 },
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
  materials: [
    { itemId: 'glowspore', qty: 3 },
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
  materials: [
    { itemId: 'barnacle_core', qty: 3 },
    { itemId: 'morays_fang', qty: 1 },
  ],
  stats: { attack: 28, stunChance: 0.12 },
  setId: 'docks_set',
  specialEffect: null,
};

const barnacle_plate = {
  id: 'barnacle_plate',
  name: 'Barnacle Plate',
  type: 'armor',
  zone: 3,
  materials: [
    { itemId: 'barnacle_core', qty: 4 },
  ],
  stats: { maxHp: 40, defence: 10 },
  setId: 'docks_set',
  specialEffect: null,
};

const ghost_silk_coat = {
  id: 'ghost_silk_coat',
  name: 'Ghost Silk Coat',
  type: 'armor',
  zone: 3,
  materials: [
    { itemId: 'ghost_silk', qty: 4 },
  ],
  stats: { maxHp: 30, dodge: 0.15 },
  setId: 'docks_set',
  specialEffect: null,
};

const saltcaptain_coat = {
  id: 'saltcaptain_coat',
  name: 'Saltcaptain Coat',
  type: 'armor',
  zone: 3,
  materials: [
    { itemId: 'ghost_silk', qty: 2 },
    { itemId: 'spectral_coin', qty: 3 },
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
  materials: [
    { itemId: 'morays_fang', qty: 1 },
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
  materials: [
    { itemId: 'toxin_sac', qty: 3 },
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
    id: 'health_potion',
    name: 'Health Potion',
    cost: 30,
    effect: { type: 'heal', percentMaxHp: 0.3 },
    description: 'Restore 30% of max HP',
  },
  {
    id: 'mega_potion',
    name: 'Mega Potion',
    cost: 60,
    effect: { type: 'heal', percentMaxHp: 0.6 },
    description: 'Restore 60% of max HP',
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
];

// ─────────────────────────────────────────────────────────────────────────────
// Aggregated gear map — keyed by item id for O(1) lookup
// ─────────────────────────────────────────────────────────────────────────────

export const GEAR = {
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

export default GEAR;
