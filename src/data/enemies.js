/**
 * enemies.js — Meow Depths Enemy Bestiary
 *
 * Every creature the player can encounter across the three dungeon zones.
 * Bosses carry `isBoss: true` and define `phaseChanges` for mid-fight events.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Zone 1 — The Soggy Sewers (Black Crystals)
// ─────────────────────────────────────────────────────────────────────────────

const sewer_rat = {
  id: 'sewer_rat',
  name: 'Sewer Rat',
  hp: 20,
  attack: 6,
  zone: 1,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'black_shard', chance: 0.6 },
  ],
  moves: [
    { name: 'Gnaw', damage: 6 },
  ],
  phaseChanges: [],
};

const slimeling = {
  id: 'slimeling',
  name: 'Slimeling',
  hp: 28,
  attack: 4,
  zone: 1,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'black_shard', chance: 0.5 },
    { itemId: 'black_crystal_small', chance: 0.2 },
  ],
  moves: [
    { name: 'Ooze Splash', damage: 4, effect: 'bleed', effectChance: 0.3 },
  ],
  phaseChanges: [],
};

const cockroach_knight = {
  id: 'cockroach_knight',
  name: 'Cockroach Knight',
  hp: 35,
  attack: 8,
  zone: 1,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'black_crystal_small', chance: 0.5 },
  ],
  moves: [
    { name: 'Shell Bash', damage: 8 },
  ],
  phaseChanges: [],
};

const plague_frog = {
  id: 'plague_frog',
  name: 'Plague Frog',
  hp: 25,
  attack: 5,
  zone: 1,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'black_shard', chance: 0.4 },
    { itemId: 'black_crystal_small', chance: 0.3 },
  ],
  moves: [
    { name: 'Toxic Spit', damage: 5, effect: 'bleed', effectChance: 0.4 },
  ],
  phaseChanges: [],
};

/** Boss — King Rat summons reinforcements at 50% HP */
const king_rat = {
  id: 'king_rat',
  name: 'King Rat',
  hp: 120,
  attack: 12,
  zone: 1,
  isBoss: true,
  isElite: false,
  drops: [
    { itemId: 'black_crystal_core', chance: 1.0 },
    { itemId: 'black_crystal_big', chance: 0.5 },
    { itemId: 'black_crystal_small', chance: 0.5 },
  ],
  moves: [
    { name: 'Gnaw', damage: 12 },
  ],
  phaseChanges: [
    {
      hpPercent: 0.5,
      action: 'summon',
      summonId: 'sewer_rat',
      summonCount: 2,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Zone 2 — The Twisted Garden (Green Crystals)
// ─────────────────────────────────────────────────────────────────────────────

const thorn_sprite = {
  id: 'thorn_sprite',
  name: 'Thorn Sprite',
  hp: 45,
  attack: 14,
  zone: 2,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'green_shard', chance: 0.6 },
  ],
  moves: [
    { name: 'Thorn Jab', damage: 14 },
  ],
  phaseChanges: [],
};

const giant_beetle = {
  id: 'giant_beetle',
  name: 'Giant Beetle',
  hp: 65,
  attack: 12,
  zone: 2,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'green_crystal_small', chance: 0.5 },
  ],
  moves: [
    { name: 'Crush', damage: 12 },
  ],
  phaseChanges: [],
};

const mushroom_puffer = {
  id: 'mushroom_puffer',
  name: 'Mushroom Puffer',
  hp: 40,
  attack: 10,
  zone: 2,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'green_shard', chance: 0.5 },
    { itemId: 'green_crystal_small', chance: 0.2 },
  ],
  moves: [
    { name: 'Spore Cloud', damage: 10, effect: 'random_debuff', effectChance: 0.5 },
  ],
  phaseChanges: [],
};

const vine_lurker = {
  id: 'vine_lurker',
  name: 'Vine Lurker',
  hp: 55,
  attack: 16,
  zone: 2,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'green_shard', chance: 0.4 },
    { itemId: 'green_crystal_small', chance: 0.3 },
  ],
  moves: [
    { name: 'Constrict', damage: 16, effect: 'dodge_reduce', effectChance: 1.0 },
  ],
  phaseChanges: [],
};

/** Boss — Rootmother entangles the player at 60% HP, forcing a skipped turn */
const rootmother = {
  id: 'rootmother',
  name: 'Rootmother',
  hp: 280,
  attack: 20,
  zone: 2,
  isBoss: true,
  isElite: false,
  drops: [
    { itemId: 'green_crystal_core', chance: 1.0 },
    { itemId: 'green_crystal_big', chance: 0.5 },
    { itemId: 'green_crystal_small', chance: 0.5 },
  ],
  moves: [
    { name: 'Root Slam', damage: 20 },
  ],
  phaseChanges: [
    {
      hpPercent: 0.6,
      action: 'entangle',
      description: 'Player skips next turn',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Zone 3 — The Sunken Docks (Yellow Crystals)
// ─────────────────────────────────────────────────────────────────────────────

const barnacle_crab = {
  id: 'barnacle_crab',
  name: 'Barnacle Crab',
  hp: 80,
  attack: 18,
  zone: 3,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'yellow_shard', chance: 0.6 },
  ],
  moves: [
    { name: 'Claw Snap', damage: 18 },
  ],
  phaseChanges: [],
};

const sea_witch_eel = {
  id: 'sea_witch_eel',
  name: 'Sea Witch Eel',
  hp: 65,
  attack: 22,
  zone: 3,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'yellow_crystal_small', chance: 0.5 },
  ],
  moves: [
    { name: 'Hex', damage: 22, effect: 'crit_reduce', effectChance: 1.0 },
  ],
  phaseChanges: [],
};

const drowned_sailor = {
  id: 'drowned_sailor',
  name: 'Drowned Sailor',
  hp: 70,
  attack: 20,
  zone: 3,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'yellow_shard', chance: 0.4 },
    { itemId: 'yellow_crystal_small', chance: 0.3 },
  ],
  moves: [
    { name: 'Haunt', damage: 20, effect: 'stun', effectChance: 0.3 },
  ],
  phaseChanges: [],
};

/** The Pufferfish Bomb self-destructs on its only move — high risk, high reward */
const pufferfish_bomb = {
  id: 'pufferfish_bomb',
  name: 'Pufferfish Bomb',
  hp: 50,
  attack: 28,
  zone: 3,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'yellow_shard', chance: 0.5 },
    { itemId: 'yellow_crystal_small', chance: 0.2 },
  ],
  moves: [
    { name: 'Explode', damage: 28, effect: 'self_destruct', effectChance: 1.0 },
  ],
  phaseChanges: [],
};

/**
 * Boss — Captain Moray deploys an anchor.
 * While the anchor is alive (80 HP), the captain reforms at 50 HP when killed.
 */
const captain_moray = {
  id: 'captain_moray',
  name: 'Captain Moray',
  hp: 400,
  attack: 25,
  zone: 3,
  isBoss: true,
  isElite: false,
  drops: [
    { itemId: 'yellow_crystal_core', chance: 1.0 },
    { itemId: 'yellow_crystal_big', chance: 0.5 },
    { itemId: 'yellow_crystal_small', chance: 0.5 },
  ],
  moves: [
    { name: 'Cutlass Sweep', damage: 25 },
  ],
  phaseChanges: [
    {
      action: 'anchor',
      anchorHp: 80,
      description: 'While anchor alive, reforms at 50 HP when killed',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Aggregated map — keyed by enemy id for O(1) lookup
// ─────────────────────────────────────────────────────────────────────────────

export const ENEMIES = {
  // Zone 1
  sewer_rat,
  slimeling,
  cockroach_knight,
  plague_frog,
  king_rat,
  // Zone 2
  thorn_sprite,
  giant_beetle,
  mushroom_puffer,
  vine_lurker,
  rootmother,
  // Zone 3
  barnacle_crab,
  sea_witch_eel,
  drowned_sailor,
  pufferfish_bomb,
  captain_moray,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper — returns an array of enemy definitions that belong to a given zone
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {number} zoneId — 1, 2, or 3
 * @returns {Array} enemies belonging to that zone
 */
export function getEnemiesByZone(zoneId) {
  return Object.values(ENEMIES).filter((enemy) => enemy.zone === zoneId);
}

export default ENEMIES;
