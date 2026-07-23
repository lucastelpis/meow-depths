/**
 * zones.js — Meow Expeditions Dungeon Zones
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
    name: 'The Soggy Ruins',
    description:
      'Damp tunnels crawling with rats and worse. The stench alone could kill you.',
    minLevel: 1,
    maxLevel: 15,
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
    minLevel: 16,
    maxLevel: 30,
    floorCount: 10,
    backgroundColor: '#0A1A0A',
    enemies: ['mutated_plant', 'ironclad_beetle', 'spore_shroom', 'savage_worm', 'caustic_slug'],
    bossId: 'granite_crawler',
    unlockCondition: 'zone1Cleared', // Requires Zone 1 boss defeated
  },

  zone3: {
    id: 'zone3',
    name: 'The Sunken Docks',
    description:
      'Salt-crusted wharves haunted by drowned things. The tide never goes out.',
    minLevel: 31,
    maxLevel: 45,
    floorCount: 10,
    backgroundColor: '#0A0F1A',
    enemies: ['mineral_pincher', 'neon_jelly', 'toxic_puff', 'monster_octopus'],
    bossId: 'sea_abomination',
    unlockCondition: 'zone2Cleared', // Requires Zone 2 boss defeated
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Grid Size — same scale for all zones, grows with floor number
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the grid dimensions for a given floor number.
 *
 * @param {number} floorNumber – 1-indexed floor (1–10)
 * @param {string} zoneId - unique zone key (e.g. 'zone1')
 * @returns {{ gridWidth: number, gridHeight: number }}
 */
export function getGridSizeForFloor(floorNumber, zoneId) {
  if (floorNumber <= 3) return { gridWidth: 3, gridHeight: 3 };
  if (floorNumber <= 6) return { gridWidth: 3, gridHeight: 4 };
  if (floorNumber <= 9) return { gridWidth: 4, gridHeight: 4 };
  if (floorNumber === 10 && (zoneId === 'zone1' || zoneId === 1 || zoneId === '1')) {
    return { gridWidth: 4, gridHeight: 4 };
  }
  return { gridWidth: 4, gridHeight: 5 }; // floor 10 (boss floor)
}



// ─────────────────────────────────────────────────────────────────────────────
// Floor Material Pools — which materials can drop on each floor range
//
// Lookup: find the first entry where floorNumber <= maxFloor.
// If none matches (floor 10, boss), returns null → all drops pass through.
// ─────────────────────────────────────────────────────────────────────────────

export const FLOOR_MATERIAL_POOLS = {
  zone1: [],
  zone2: [],
  zone3: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Floor Completion Rewards — Pre-disclosed Gold & EXP per floor
// ─────────────────────────────────────────────────────────────────────────────
export const ZONE_COMPLETION_REWARDS = {
  zone1: {
    1: { gold: 100, xp: 50 },
    2: { gold: 200, xp: 100 },
    3: { gold: 300, xp: 150 },
    4: { gold: 400, xp: 200 },
    5: { gold: 500, xp: 250 },
    6: { gold: 600, xp: 300 },
    7: { gold: 700, xp: 350 },
    8: { gold: 800, xp: 400 },
    9: { gold: 900, xp: 450 },
    10: { gold: 1000, xp: 500 },
  },
  zone2: {
    1: { gold: 1000, xp: 500 },
    2: { gold: 1500, xp: 750 },
    3: { gold: 2000, xp: 1000 },
    4: { gold: 2500, xp: 1250 },
    5: { gold: 3000, xp: 1500 },
    6: { gold: 3500, xp: 1750 },
    7: { gold: 4000, xp: 2000 },
    8: { gold: 4500, xp: 2250 },
    9: { gold: 5000, xp: 2500 },
    10: { gold: 5500, xp: 2750 },
  },
  zone3: {
    1: { gold: 6000, xp: 3000 },
    2: { gold: 6100, xp: 3050 },
    3: { gold: 6200, xp: 3100 },
    4: { gold: 6300, xp: 3150 },
    5: { gold: 6400, xp: 3200 },
    6: { gold: 6500, xp: 3250 },
    7: { gold: 6600, xp: 3300 },
    8: { gold: 6700, xp: 3350 },
    9: { gold: 6800, xp: 3400 },
    10: { gold: 6900, xp: 3450 },
  },
};

/**
 * Returns the pre-disclosed gold and exp completion rewards for a given floor.
 *
 * @param {string} zoneId - unique zone key (e.g. 'zone1')
 * @param {number} floorNumber - 1-indexed floor (1–10)
 * @returns {{ gold: number, xp: number }}
 */
export function getFloorCompletionReward(zoneId, floorNumber) {
  const zoneRewards = ZONE_COMPLETION_REWARDS[zoneId] || ZONE_COMPLETION_REWARDS.zone1;
  return zoneRewards[floorNumber] || { gold: 0, xp: 0 };
}

