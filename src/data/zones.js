/**
 * zones.js — Meow Depths Dungeon Zones
 *
 * Defines the three explorable dungeon areas, their enemy rosters,
 * encounter probability tables, and reward values.
 *
 * Shape reference (ZONES):
 *   id              – unique key (zone1, zone2, zone3)
 *   name            – display name
 *   description     – flavour text shown on the map screen
 *   minLevel        – recommended minimum player level
 *   maxLevel        – recommended maximum player level
 *   floorCount      – total floors before zone is cleared (always 10)
 *   backgroundColor – hex colour used for the dungeon backdrop
 *   enemies         – array of common enemy ids that spawn here
 *   bossId          – the zone boss enemy id
 *   unlockCondition – null (always open) or a string key the game checks
 */

// ─────────────────────────────────────────────────────────────────────────────
// Zone Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const ZONES = {
  zone1: {
    id: 'zone1',
    name: 'The Soggy Sewers',
    description:
      'Damp tunnels crawling with rats and worse. The stench alone could kill you.',
    minLevel: 1,
    maxLevel: 5,
    floorCount: 10,
    backgroundColor: '#0F0F1A',
    enemies: ['sewer_rat', 'slimeling', 'cockroach_knight', 'plague_frog'],
    bossId: 'king_rat',
    unlockCondition: null, // Available from the start
  },

  zone2: {
    id: 'zone2',
    name: 'The Twisted Garden',
    description:
      'An overgrown ruin where roots move on their own and fungi glow with malice.',
    minLevel: 6,
    maxLevel: 12,
    floorCount: 10,
    backgroundColor: '#0A1A0A',
    enemies: ['thorn_sprite', 'giant_beetle', 'mushroom_puffer', 'vine_lurker'],
    bossId: 'rootmother',
    unlockCondition: 'zone1Cleared', // Requires Zone 1 boss defeated
  },

  zone3: {
    id: 'zone3',
    name: 'The Sunken Docks',
    description:
      'Salt-crusted wharves haunted by drowned things. The tide never goes out.',
    minLevel: 13,
    maxLevel: 20,
    floorCount: 10,
    backgroundColor: '#0A0F1A',
    enemies: ['barnacle_crab', 'sea_witch_eel', 'drowned_sailor', 'pufferfish_bomb'],
    bossId: 'captain_moray',
    unlockCondition: 'zone2Cleared', // Requires Zone 2 boss defeated
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Grid Size — same scale for all zones, grows with floor depth
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the grid dimensions for a given floor number.
 * All zones share the same scaling table.
 *
 * @param {number} floorNumber – 1-indexed floor (1–10)
 * @returns {{ gridWidth: number, gridHeight: number }}
 */
export function getGridSizeForFloor(floorNumber) {
  if (floorNumber <= 3) return { gridWidth: 3, gridHeight: 3 };
  if (floorNumber <= 6) return { gridWidth: 3, gridHeight: 4 };
  if (floorNumber <= 9) return { gridWidth: 4, gridHeight: 4 };
  return { gridWidth: 4, gridHeight: 5 }; // floor 10 (boss floor)
}

// ─────────────────────────────────────────────────────────────────────────────
// Encounter Composition Probabilities
// Rolled once per floor to decide what the player fights.
// ─────────────────────────────────────────────────────────────────────────────

export const ENCOUNTER_CHANCES = {
  /** 60 % — two common enemies */
  twoEnemies: 0.60,
  /** 25 % — one elite-tier enemy */
  oneElite: 0.25,
  /** 15 % — three common enemies (tough but rewarding) */
  threeEnemies: 0.15,
};

// ─────────────────────────────────────────────────────────────────────────────
// Gold Drops — random range per enemy tier
// ─────────────────────────────────────────────────────────────────────────────

export const GOLD_DROPS = {
  common: { min: 5, max: 10 },
  elite:  { min: 15, max: 25 },
  boss:   { min: 80, max: 120 },
};

// ─────────────────────────────────────────────────────────────────────────────
// XP Values — flat XP reward per enemy tier
// ─────────────────────────────────────────────────────────────────────────────

export const XP_VALUES = {
  common: 20,
  elite: 50,
  boss: 200,
};

// ─────────────────────────────────────────────────────────────────────────────
// Floor Material Pools — which materials can drop on each floor range
//
// Lookup: find the first entry where floorNumber <= maxFloor.
// If none matches (floor 10, boss), returns null → all drops pass through.
// ─────────────────────────────────────────────────────────────────────────────

export const FLOOR_MATERIAL_POOLS = {
  zone1: [
    { maxFloor: 3, allowed: ['black_shard'] },
    { maxFloor: 6, allowed: ['black_shard', 'black_crystal_small'] },
    { maxFloor: 9, allowed: ['black_crystal_small', 'black_crystal_big'] },
    // floor 10 (boss) → no entry → null → unfiltered
  ],
  zone2: [
    { maxFloor: 3, allowed: ['green_shard'] },
    { maxFloor: 6, allowed: ['green_shard', 'green_crystal_small'] },
    { maxFloor: 9, allowed: ['green_crystal_small', 'green_crystal_big'] },
  ],
  zone3: [
    { maxFloor: 3, allowed: ['yellow_shard'] },
    { maxFloor: 6, allowed: ['yellow_shard', 'yellow_crystal_small'] },
    { maxFloor: 9, allowed: ['yellow_crystal_small', 'yellow_crystal_big'] },
  ],
};
