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
 *   floors          – total dungeon floors before reaching the boss
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
    floors: 5,
    gridWidth: 4,
    gridHeight: 4,
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
    floors: 7,
    gridWidth: 4,
    gridHeight: 5,
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
    floors: 10,
    gridWidth: 5,
    gridHeight: 5,
    backgroundColor: '#0A0F1A',
    enemies: ['barnacle_crab', 'sea_witch_eel', 'drowned_sailor', 'pufferfish_bomb'],
    bossId: 'captain_moray',
    unlockCondition: 'zone2Cleared', // Requires Zone 2 boss defeated
  },
};

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
