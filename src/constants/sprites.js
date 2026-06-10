/**
 * sprites.js — Sprite animation definitions for Meow Depths
 *
 * Each entity has an `idle` and an `attack` animation key (and `guard` for the hero).
 * Each key is: { source, frameSize, frames }
 *
 * Frame sizes (all units are 192 × 192 px per frame):
 *   Warrior idle  8f  Warrior attack1  4f  Warrior guard  6f
 *   Archer  idle  6f  Archer  shoot    8f
 *   Monk    idle  6f  Monk    heal    11f
 *   Pawn    idle  8f  Pawn    knife    4f
 *
 * Color coding:
 *   Blue   = Hero (Mochi)
 *   Black  = Zone 1 enemies (Soggy Sewers)
 *   Red    = Zone 2 enemies (Twisted Garden)
 *   Purple = Zone 3 enemies (Sunken Docks)
 *   Yellow = Bosses (any zone)
 *
 * NOTE: Metro bundler requires fully-static require() strings — no template literals.
 */

export const ITEM_SPRITESHEETS = {
  'equipment-leather': require('../../assets/sprites/items/equipment-leather.png'),
  'weapons-1': require('../../assets/sprites/items/weapons-1.png'),
  'storages-1': require('../../assets/sprites/items/storages-1.png'),
};

export const HERO_SPRITE = {
  platformOffsetFactor: 0.24,
  idle: {
    source: require('../../assets/sprites/units/hero/hero_idle.png'),
    frameSize: 128,
    frames: 4,
  },
  attack: {
    source: require('../../assets/sprites/units/hero/hero_attack.png'),
    frameSize: 128,
    frames: 8,
  },
  guard: {
    source: require('../../assets/sprites/units/hero/hero_idle.png'),
    frameSize: 128,
    frames: 4,
  },
  // Active skill animations
  fire_slash: {
    source: require('../../assets/sprites/units/hero/hero_flame_attack.png'),
    frameSize: 128,
    frames: 8,
  },
  fire_burst: {
    source: require('../../assets/sprites/units/hero/hero_flame_attack.png'),
    frameSize: 128,
    frames: 8,
  },
  flame_guard: {
    source: require('../../assets/sprites/units/hero/hero_flame_attack.png'),
    frameSize: 128,
    frames: 8,
  },
  tidal_strike: {
    source: require('../../assets/sprites/units/hero/hero_water_attack.png'),
    frameSize: 128,
    frames: 8,
  },
  tidal_wave: {
    source: require('../../assets/sprites/units/hero/hero_water_attack.png'),
    frameSize: 128,
    frames: 8,
  },
  healing_current: {
    source: require('../../assets/sprites/units/hero/hero_water_attack.png'),
    frameSize: 128,
    frames: 8,
  },
  boulder_slash: {
    source: require('../../assets/sprites/units/hero/hero_earth_attack.png'),
    frameSize: 128,
    frames: 8,
  },
  fortitude: {
    source: require('../../assets/sprites/units/hero/hero_earth_attack.png'),
    frameSize: 128,
    frames: 8,
  },
  fortify: {
    source: require('../../assets/sprites/units/hero/hero_earth_attack.png'),
    frameSize: 128,
    frames: 8,
  },
  stone_thorns: {
    source: require('../../assets/sprites/units/hero/hero_earth_attack.png'),
    frameSize: 128,
    frames: 8,
  },
  dual_slash: {
    source: require('../../assets/sprites/units/hero/hero_wind_attack.png'),
    frameSize: 128,
    frames: 8,
  },
  swiftness: {
    source: require('../../assets/sprites/units/hero/hero_wind_attack.png'),
    frameSize: 128,
    frames: 8,
  },
  whirlwind: {
    source: require('../../assets/sprites/units/hero/hero_wind_attack.png'),
    frameSize: 128,
    frames: 8,
  },
  critical_wind: {
    source: require('../../assets/sprites/units/hero/hero_wind_attack.png'),
    frameSize: 128,
    frames: 8,
  },
};

export const HERO_FIREPLACE_SPRITE = {
  source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Original/sitting_fireplace.png'),
  frameSize: 104,
  frames: 8,
};

// ─── Enemy sprite definitions ─────────────────────────────────────────────────

export const ENEMY_SPRITES = {

  // ── Zone 1 — Soggy Sewers (Black units) ──────────────────────────────────

  sewer_rat: {
    idle: { source: require('../../assets/sprites/units/dungeon-1/rat_idle.png'), frameSize: 128, frames: 4 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/rat_attack.png'), frameSize: 128, frames: 8 },
  },
  slimeling: {
    idle: { source: require('../../assets/sprites/units/dungeon-1/slime_idle.png'), frameSize: 128, frames: 4 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/slime_attack.png'), frameSize: 128, frames: 8 },
  },
  cockroach_knight: {
    idle: { source: require('../../assets/sprites/units/dungeon-1/cockroach_idle.png'), frameSize: 128, frames: 4 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/cockroach_attack.png'), frameSize: 128, frames: 8 },
  },
  plague_frog: {
    idle: { source: require('../../assets/sprites/units/dungeon-1/frog_idle.png'), frameSize: 128, frames: 4 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/frog_attack.png'), frameSize: 128, frames: 8 },
  },
  king_rat: {
    idle: { source: require('../../assets/sprites/units/dungeon-1/rat_king_idle.png'), frameSize: 128, frames: 4 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/rat_king_attack.png'), frameSize: 128, frames: 8 },
  },

  // ── Zone 2 — Twisted Garden (Red units) ──────────────────────────────────

  thorn_sprite: {
    idle: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Archer/Archer_Idle.png'), frameSize: 192, frames: 6 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Archer/Archer_Shoot.png'), frameSize: 192, frames: 8 },
  },
  giant_beetle: {
    idle: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Warrior/Warrior_Idle.png'), frameSize: 192, frames: 8 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Warrior/Warrior_Attack1.png'), frameSize: 192, frames: 4 },
  },
  mushroom_puffer: {
    idle: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Monk/Idle.png'), frameSize: 192, frames: 6 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Monk/Heal.png'), frameSize: 192, frames: 11 },
  },
  vine_lurker: {
    idle: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Pawn/Pawn_Idle.png'), frameSize: 192, frames: 8 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Pawn/Pawn_Interact Knife.png'), frameSize: 192, frames: 4 },
  },
  rootmother: {
    idle: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Yellow Units/Monk/Idle.png'), frameSize: 192, frames: 6 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Yellow Units/Monk/Heal.png'), frameSize: 192, frames: 11 },
  },

  // ── Zone 3 — Sunken Docks (Purple units) ─────────────────────────────────

  barnacle_crab: {
    idle: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Warrior/Warrior_Idle.png'), frameSize: 192, frames: 8 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Warrior/Warrior_Attack1.png'), frameSize: 192, frames: 4 },
  },
  sea_witch_eel: {
    idle: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Archer/Archer_Idle.png'), frameSize: 192, frames: 6 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Archer/Archer_Shoot.png'), frameSize: 192, frames: 8 },
  },
  drowned_sailor: {
    idle: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Monk/Idle.png'), frameSize: 192, frames: 6 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Monk/Heal.png'), frameSize: 192, frames: 11 },
  },
  pufferfish_bomb: {
    idle: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Pawn/Pawn_Idle.png'), frameSize: 192, frames: 8 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Pawn/Pawn_Interact Knife.png'), frameSize: 192, frames: 4 },
  },
  captain_moray: {
    idle: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Yellow Units/Warrior/Warrior_Idle.png'), frameSize: 192, frames: 8 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Yellow Units/Warrior/Warrior_Attack1.png'), frameSize: 192, frames: 4 },
  },
};

// ─── Fallback for unknown / elite enemies ─────────────────────────────────────

export const FALLBACK_ENEMY_SPRITE = {
  idle: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Black Units/Warrior/Warrior_Idle.png'), frameSize: 192, frames: 8 },
  attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Black Units/Warrior/Warrior_Attack1.png'), frameSize: 192, frames: 4 },
};

// ─── Buildings (static images, no animation) ──────────────────────────────────

export const CAMP_CASTLE = require('../../assets/sprites/Tiny Swords (Free Pack)/Buildings/Yellow Buildings/Castle.png');
export const CAMP_MONASTERY = require('../../assets/sprites/Tiny Swords (Free Pack)/Buildings/Yellow Buildings/Monastery.png');

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Returns the full sprite definition { idle, attack } for a given enemy.
 * Elite enemies at runtime have "elite_" prepended — strip it to find the base sprite.
 *
 * @param {Object} enemy – in-combat enemy object ({ id, isBoss })
 * @returns {{ idle: Object, attack: Object, platformOffsetFactor: number }}
 */
export function getEnemySprite(enemy) {
  if (!enemy) return { ...FALLBACK_ENEMY_SPRITE, platformOffsetFactor: 0.25 };
  const baseId = (enemy.id || '').replace(/^elite_/, '').toLowerCase();
  const spriteDef = ENEMY_SPRITES[baseId] || FALLBACK_ENEMY_SPRITE;

  if (spriteDef.platformOffsetFactor !== undefined) {
    return {
      ...spriteDef,
    };
  }

  // Custom offset factors based on the asset class template from Tiny Swords
  let platformOffsetFactor = 0.25; // Default (Warrior class)

  if (baseId.includes('rat') || baseId.includes('thorn') || baseId.includes('eel')) {
    platformOffsetFactor = 0.28; // Archer class
  } else if (
    baseId.includes('slime') ||
    baseId.includes('puffer') ||
    baseId.includes('sailor') ||
    baseId.includes('root')
  ) {
    platformOffsetFactor = 0.26; // Monk class
  } else if (baseId.includes('frog') || baseId.includes('vine') || baseId.includes('bomb')) {
    platformOffsetFactor = 0.22; // Pawn class
  }

  return {
    ...spriteDef,
    platformOffsetFactor,
  };
}

export const ALL_SPRITESHEET_ASSETS = [
  // Item spritesheets
  require('../../assets/sprites/items/equipment-leather.png'),
  require('../../assets/sprites/items/weapons-1.png'),
  require('../../assets/sprites/items/storages-1.png'),
  // Hero sprites
  require('../../assets/sprites/units/hero/hero_idle.png'),
  require('../../assets/sprites/units/hero/hero_attack.png'),
  require('../../assets/sprites/units/hero/hero_flame_attack.png'),
  require('../../assets/sprites/units/hero/hero_water_attack.png'),
  require('../../assets/sprites/units/hero/hero_earth_attack.png'),
  require('../../assets/sprites/units/hero/hero_wind_attack.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Original/sitting_fireplace.png'),
  // Enemy sprites - Zone 1
  require('../../assets/sprites/units/dungeon-1/rat_idle.png'),
  require('../../assets/sprites/units/dungeon-1/rat_attack.png'),
  require('../../assets/sprites/units/dungeon-1/slime_idle.png'),
  require('../../assets/sprites/units/dungeon-1/slime_attack.png'),
  require('../../assets/sprites/units/dungeon-1/cockroach_idle.png'),
  require('../../assets/sprites/units/dungeon-1/cockroach_attack.png'),
  require('../../assets/sprites/units/dungeon-1/frog_idle.png'),
  require('../../assets/sprites/units/dungeon-1/frog_attack.png'),
  require('../../assets/sprites/units/dungeon-1/rat_king_idle.png'),
  require('../../assets/sprites/units/dungeon-1/rat_king_attack.png'),
  // Enemy sprites - Zone 2
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Archer/Archer_Idle.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Archer/Archer_Shoot.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Warrior/Warrior_Idle.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Warrior/Warrior_Attack1.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Monk/Idle.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Monk/Heal.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Pawn/Pawn_Idle.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Pawn/Pawn_Interact Knife.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Yellow Units/Monk/Idle.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Yellow Units/Monk/Heal.png'),
  // Enemy sprites - Zone 3
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Warrior/Warrior_Idle.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Warrior/Warrior_Attack1.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Archer/Archer_Idle.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Archer/Archer_Shoot.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Monk/Idle.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Monk/Heal.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Pawn/Pawn_Idle.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Pawn/Pawn_Interact Knife.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Yellow Units/Warrior/Warrior_Idle.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Yellow Units/Warrior/Warrior_Attack1.png'),
  // Fallbacks
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Black Units/Warrior/Warrior_Idle.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Black Units/Warrior/Warrior_Attack1.png'),
  // Buildings
  require('../../assets/sprites/Tiny Swords (Free Pack)/Buildings/Yellow Buildings/Castle.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Buildings/Yellow Buildings/Monastery.png'),
];
