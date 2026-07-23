/**
 * sprites.js — Sprite animation definitions for Meow Expeditions
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
 *   Black  = Zone 1 enemies (Soggy Ruins)
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
  'icons-1': require('../../assets/sprites/items/icons-1.png'),
  'crystals-1': require('../../assets/sprites/items/crystals-1.png'),
  'skill-icons-1': require('../../assets/sprites/items/skill-icons-1.png'),
  'consumables-1': require('../../assets/sprites/items/consumables-1.png'),
  'status-icons-1': require('../../assets/sprites/items/status-icons-1.png'),
  'reward-icons': require('../../assets/sprites/items/reward-icons.png'),
  'icons-map': require('../../assets/sprites/items/icons-map.png'),
  'portraits-1': require('../../assets/sprites/units/dungeon-1/portraits.png'),
};

const HERO_SHEET_SOURCE = require('../../assets/sprites/units/hero/hero_sheet.png');

export const HERO_SPRITE = {
  platformOffsetFactor: 0.24,
  idle: {
    source: HERO_SHEET_SOURCE,
    frameSize: 128,
    frames: 4,
    rowIndex: 0,
    totalRows: 6,
    fps: 8,
  },
  attack: {
    source: HERO_SHEET_SOURCE,
    frameSize: 128,
    frames: 4,
    rowIndex: 1,
    totalRows: 6,
    fps: 6,
  },
  guard: {
    source: HERO_SHEET_SOURCE,
    frameSize: 128,
    frames: 4,
    rowIndex: 0,
    totalRows: 6,
    fps: 8,
  },
  // Active skill animations
  fire_slash: {
    source: HERO_SHEET_SOURCE,
    frameSize: 128,
    frames: 4,
    rowIndex: 2,
    totalRows: 6,
    fps: 6,
  },
  fire_burst: {
    source: HERO_SHEET_SOURCE,
    frameSize: 128,
    frames: 4,
    rowIndex: 2,
    totalRows: 6,
    fps: 6,
  },
  flame_guard: {
    source: HERO_SHEET_SOURCE,
    frameSize: 128,
    frames: 4,
    rowIndex: 2,
    totalRows: 6,
    fps: 6,
  },
  tidal_strike: {
    source: HERO_SHEET_SOURCE,
    frameSize: 128,
    frames: 4,
    rowIndex: 3,
    totalRows: 6,
    fps: 6,
  },
  tidal_wave: {
    source: HERO_SHEET_SOURCE,
    frameSize: 128,
    frames: 4,
    rowIndex: 3,
    totalRows: 6,
    fps: 6,
  },
  healing_current: {
    source: HERO_SHEET_SOURCE,
    frameSize: 128,
    frames: 4,
    rowIndex: 3,
    totalRows: 6,
    fps: 6,
  },
  boulder_slash: {
    source: HERO_SHEET_SOURCE,
    frameSize: 128,
    frames: 4,
    rowIndex: 4,
    totalRows: 6,
    fps: 6,
  },
  living_stone: {
    source: HERO_SHEET_SOURCE,
    frameSize: 128,
    frames: 4,
    rowIndex: 4,
    totalRows: 6,
    fps: 6,
  },
  landslide: {
    source: HERO_SHEET_SOURCE,
    frameSize: 128,
    frames: 4,
    rowIndex: 4,
    totalRows: 6,
    fps: 6,
  },
  calcify: {
    source: HERO_SHEET_SOURCE,
    frameSize: 128,
    frames: 4,
    rowIndex: 4,
    totalRows: 6,
    fps: 6,
  },
  dual_slash: {
    source: HERO_SHEET_SOURCE,
    frameSize: 128,
    frames: 4,
    rowIndex: 5,
    totalRows: 6,
    fps: 8,
  },
  swiftness: {
    source: HERO_SHEET_SOURCE,
    frameSize: 128,
    frames: 4,
    rowIndex: 5,
    totalRows: 6,
    fps: 8,
  },
  whirlwind: {
    source: HERO_SHEET_SOURCE,
    frameSize: 128,
    frames: 4,
    rowIndex: 5,
    totalRows: 6,
    fps: 8,
  },
  critical_wind: {
    source: HERO_SHEET_SOURCE,
    frameSize: 128,
    frames: 4,
    rowIndex: 5,
    totalRows: 6,
    fps: 8,
  },
};

export const HERO_FIREPLACE_SPRITE = {
  source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Original/sitting_fireplace.png'),
  frameSize: 104,
  frames: 8,
};

// ─── Enemy sprite definitions ─────────────────────────────────────────────────

export const ENEMY_SPRITES = {

  // ── Zone 1 — Soggy Ruins (Black units) ──────────────────────────────────

  sewer_rat: {
    platformOffsetFactor: 0.0,
    faceLeft: true,
    idle: { source: require('../../assets/sprites/units/dungeon-1/rat.png'), frameSize: 128, frames: 8, startFrame: 0, endFrame: 3 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/rat.png'), frameSize: 128, frames: 8, startFrame: 4, endFrame: 7, fps: 6 },
  },
  slimeling: {
    platformOffsetFactor: 0.0,
    faceLeft: true,
    idle: { source: require('../../assets/sprites/units/dungeon-1/slime.png'), frameSize: 128, frames: 8, startFrame: 0, endFrame: 3 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/slime.png'), frameSize: 128, frames: 8, startFrame: 4, endFrame: 7, fps: 6 },
  },
  cockroach_knight: {
    platformOffsetFactor: 0.0,
    faceLeft: true,
    idle: { source: require('../../assets/sprites/units/dungeon-1/cockroach.png'), frameSize: 128, frames: 8, startFrame: 0, endFrame: 3 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/cockroach.png'), frameSize: 128, frames: 8, startFrame: 4, endFrame: 7, fps: 6 },
  },
  plague_frog: {
    platformOffsetFactor: 0.0,
    faceLeft: true,
    idle: { source: require('../../assets/sprites/units/dungeon-1/toad.png'), frameSize: 128, frames: 8, startFrame: 0, endFrame: 3 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/toad.png'), frameSize: 128, frames: 8, startFrame: 4, endFrame: 7, fps: 6 },
  },
  king_rat: {
    platformOffsetFactor: 0.0,
    faceLeft: true,
    idle: { source: require('../../assets/sprites/units/dungeon-1/ratking.png'), frameSize: 128, frames: 8, startFrame: 0, endFrame: 3 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/ratking.png'), frameSize: 128, frames: 8, startFrame: 4, endFrame: 7, fps: 6 },
  },

  // ── Zone 2 — Twisted Garden (Red units) ──────────────────────────────────

  mutated_plant: {
    platformOffsetFactor: 0.0,
    faceLeft: true,
    idle: { source: require('../../assets/sprites/units/dungeon-1/plant.png'), frameSize: 128, frames: 8, startFrame: 0, endFrame: 3 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/plant.png'), frameSize: 128, frames: 8, startFrame: 4, endFrame: 7, fps: 6 },
  },
  ironclad_beetle: {
    platformOffsetFactor: 0.0,
    faceLeft: true,
    idle: { source: require('../../assets/sprites/units/dungeon-1/beetle.png'), frameSize: 128, frames: 8, startFrame: 0, endFrame: 3 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/beetle.png'), frameSize: 128, frames: 8, startFrame: 4, endFrame: 7, fps: 6 },
  },
  spore_shroom: {
    platformOffsetFactor: 0.0,
    faceLeft: true,
    idle: { source: require('../../assets/sprites/units/dungeon-1/mushroom.png'), frameSize: 128, frames: 8, startFrame: 0, endFrame: 3 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/mushroom.png'), frameSize: 128, frames: 8, startFrame: 4, endFrame: 7, fps: 6 },
  },
  savage_worm: {
    platformOffsetFactor: 0.0,
    faceLeft: true,
    idle: { source: require('../../assets/sprites/units/dungeon-1/worm.png'), frameSize: 128, frames: 8, startFrame: 0, endFrame: 3 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/worm.png'), frameSize: 128, frames: 8, startFrame: 4, endFrame: 7, fps: 6 },
  },
  caustic_slug: {
    platformOffsetFactor: 0.0,
    faceLeft: true,
    idle: { source: require('../../assets/sprites/units/dungeon-1/slug.png'), frameSize: 128, frames: 8, startFrame: 0, endFrame: 3 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/slug.png'), frameSize: 128, frames: 8, startFrame: 4, endFrame: 7, fps: 6 },
  },
  granite_crawler: {
    platformOffsetFactor: 0.0,
    faceLeft: true,
    idle: { source: require('../../assets/sprites/units/dungeon-1/spider.png'), frameSize: 128, frames: 8, startFrame: 0, endFrame: 3 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/spider.png'), frameSize: 128, frames: 8, startFrame: 4, endFrame: 7, fps: 6 },
  },

  mineral_pincher: {
    platformOffsetFactor: 0.0,
    faceLeft: true,
    idle: { source: require('../../assets/sprites/units/dungeon-1/crab.png'), frameSize: 128, frames: 8, startFrame: 0, endFrame: 3 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/crab.png'), frameSize: 128, frames: 8, startFrame: 4, endFrame: 7, fps: 6 },
  },
  neon_jelly: {
    platformOffsetFactor: 0.0,
    faceLeft: true,
    idle: { source: require('../../assets/sprites/units/dungeon-1/jellyfish.png'), frameSize: 128, frames: 8, startFrame: 0, endFrame: 3 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/jellyfish.png'), frameSize: 128, frames: 8, startFrame: 4, endFrame: 7, fps: 6 },
  },
  toxic_puff: {
    platformOffsetFactor: 0.0,
    faceLeft: true,
    idle: { source: require('../../assets/sprites/units/dungeon-1/pufferfish.png'), frameSize: 128, frames: 8, startFrame: 0, endFrame: 3 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/pufferfish.png'), frameSize: 128, frames: 8, startFrame: 4, endFrame: 7, fps: 6 },
  },
  sea_abomination: {
    platformOffsetFactor: 0.0,
    faceLeft: true,
    idle: { source: require('../../assets/sprites/units/dungeon-1/seaabomination.png'), frameSize: 128, frames: 8, startFrame: 0, endFrame: 3 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/seaabomination.png'), frameSize: 128, frames: 8, startFrame: 4, endFrame: 7, fps: 6 },
  },
  monster_octopus: {
    platformOffsetFactor: 0.0,
    faceLeft: true,
    idle: { source: require('../../assets/sprites/units/dungeon-1/octupus.png'), frameSize: 128, frames: 8, startFrame: 0, endFrame: 3 },
    attack: { source: require('../../assets/sprites/units/dungeon-1/octupus.png'), frameSize: 128, frames: 8, startFrame: 4, endFrame: 7, fps: 6 },
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

// ─── Dungeon Banners ─────────────────────────────────────────────────────────

export const DUNGEON_BANNERS = {
  zone1: require('../../assets/sprites/banners/soggy_sewers.png'),
  zone2: require('../../assets/sprites/banners/twisted_gardens_banner_600x300.png'),
  zone3: require('../../assets/sprites/banners/sunken_docks_banner_600x300.png'),
};

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
  require('../../assets/sprites/items/icons-1.png'),
  require('../../assets/sprites/items/crystals-1.png'),
  require('../../assets/sprites/items/skill-icons-1.png'),
  require('../../assets/sprites/items/consumables-1.png'),
  require('../../assets/sprites/items/icons-map.png'),
  // Hero sprites
  require('../../assets/sprites/units/hero/hero_sheet.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Original/sitting_fireplace.png'),
  // Enemy sprites - Zone 1
  require('../../assets/sprites/units/dungeon-1/rat.png'),
  require('../../assets/sprites/units/dungeon-1/slime.png'),
  require('../../assets/sprites/units/dungeon-1/cockroach.png'),
  require('../../assets/sprites/units/dungeon-1/toad.png'),
  require('../../assets/sprites/units/dungeon-1/ratking.png'),
  // Enemy sprites - Zone 2
  require('../../assets/sprites/units/dungeon-1/plant.png'),
  require('../../assets/sprites/units/dungeon-1/beetle.png'),
  require('../../assets/sprites/units/dungeon-1/mushroom.png'),
  require('../../assets/sprites/units/dungeon-1/worm.png'),
  require('../../assets/sprites/units/dungeon-1/slug.png'),
  require('../../assets/sprites/units/dungeon-1/spider.png'),
  // Enemy sprites - Zone 3
  require('../../assets/sprites/units/dungeon-1/jellyfish.png'),
  require('../../assets/sprites/units/dungeon-1/crab.png'),
  require('../../assets/sprites/units/dungeon-1/pufferfish.png'),
  require('../../assets/sprites/units/dungeon-1/seaabomination.png'),
  require('../../assets/sprites/units/dungeon-1/octupus.png'),
  // Combatant portraits (turn-order strip)
  require('../../assets/sprites/units/dungeon-1/portraits.png'),
  // Fallbacks
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Black Units/Warrior/Warrior_Idle.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Black Units/Warrior/Warrior_Attack1.png'),
  // Buildings
  require('../../assets/sprites/Tiny Swords (Free Pack)/Buildings/Yellow Buildings/Castle.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Buildings/Yellow Buildings/Monastery.png'),
  // Dungeon Banners
  require('../../assets/sprites/banners/soggy_sewers.png'),
  require('../../assets/sprites/banners/twisted_gardens_banner_600x300.png'),
  require('../../assets/sprites/banners/sunken_docks_banner_600x300.png'),
];

export const ONBOARDING_ASSETS = [
  require('../../assets/sprites/banners/onboarding-banner.png'),
  require('../../assets/sprites/banners/3rd_onboarding_background.png'),
  require('../../assets/sprites/items/icons-1.png'),
];

export const HUB_ASSETS = [
  require('../../assets/sprites/items/equipment-leather.png'),
  require('../../assets/sprites/items/weapons-1.png'),
  require('../../assets/sprites/items/storages-1.png'),
  require('../../assets/sprites/items/icons-1.png'),
  require('../../assets/sprites/items/skill-icons-1.png'),
  require('../../assets/sprites/items/icons-map.png'),
  require('../../assets/sprites/units/hero/hero_head.png'),
  require('../../assets/sprites/units/hero/hero_idle1.png'),
  require('../../assets/sprites/units/hero/hero_sheet.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Original/sitting_fireplace.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/UI Elements/UI Elements/Icons/Icon_05.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Buildings/Yellow Buildings/Castle.png'),
  require('../../assets/sprites/Tiny Swords (Free Pack)/Buildings/Yellow Buildings/Monastery.png'),
  require('../../assets/sprites/banners/soggy_sewers.png'),
  require('../../assets/sprites/banners/twisted_gardens_banner_600x300.png'),
  require('../../assets/sprites/banners/sunken_docks_banner_600x300.png'),
  require('../../assets/sprites/background-hub.png'),
  require('../../assets/sprites/banners/battle_bg_1.png'),
];

export const DUNGEON_RUN_ASSETS = {
  zone1: [
    require('../../assets/sprites/items/icons-map.png'),
    require('../../assets/sprites/items/icons-1.png'),
    require('../../assets/sprites/items/crystals-1.png'),
    require('../../assets/sprites/items/status-icons-1.png'),
    require('../../assets/sprites/items/consumables-1.png'),
    require('../../assets/sprites/banners/soggy_sewers.png'),
    require('../../assets/sprites/banners/battle_bg_1.png'),
    require('../../assets/sprites/units/dungeon-1/portraits.png'),
    require('../../assets/sprites/units/dungeon-1/rat.png'),
    require('../../assets/sprites/units/dungeon-1/slime.png'),
    require('../../assets/sprites/units/dungeon-1/cockroach.png'),
    require('../../assets/sprites/units/dungeon-1/toad.png'),
    require('../../assets/sprites/units/dungeon-1/ratking.png'),
  ],
  zone2: [
    require('../../assets/sprites/items/icons-map.png'),
    require('../../assets/sprites/items/icons-1.png'),
    require('../../assets/sprites/items/crystals-1.png'),
    require('../../assets/sprites/items/status-icons-1.png'),
    require('../../assets/sprites/items/consumables-1.png'),
    require('../../assets/sprites/banners/twisted_gardens_banner_600x300.png'),
    require('../../assets/sprites/banners/battle_bg_1.png'),
    require('../../assets/sprites/units/dungeon-1/portraits.png'),
    require('../../assets/sprites/units/dungeon-1/plant.png'),
    require('../../assets/sprites/units/dungeon-1/beetle.png'),
    require('../../assets/sprites/units/dungeon-1/mushroom.png'),
    require('../../assets/sprites/units/dungeon-1/worm.png'),
    require('../../assets/sprites/units/dungeon-1/slug.png'),
    require('../../assets/sprites/units/dungeon-1/spider.png'),
  ],
  zone3: [
    require('../../assets/sprites/items/icons-map.png'),
    require('../../assets/sprites/items/icons-1.png'),
    require('../../assets/sprites/items/crystals-1.png'),
    require('../../assets/sprites/items/status-icons-1.png'),
    require('../../assets/sprites/items/consumables-1.png'),
    require('../../assets/sprites/banners/sunken_docks_banner_600x300.png'),
    require('../../assets/sprites/banners/battle_bg_1.png'),
    require('../../assets/sprites/units/dungeon-1/portraits.png'),
    require('../../assets/sprites/units/dungeon-1/jellyfish.png'),
    require('../../assets/sprites/units/dungeon-1/crab.png'),
    require('../../assets/sprites/units/dungeon-1/pufferfish.png'),
    require('../../assets/sprites/units/dungeon-1/seaabomination.png'),
    require('../../assets/sprites/units/dungeon-1/octupus.png'),
  ],
};
