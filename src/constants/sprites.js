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

export const HERO_SPRITE = {
  idle: {
    source:    require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Original/cat_idle.png'),
    frameSize: 104,
    frames:    9,
  },
  attack: {
    source:    require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Original/cat_attack.png'),
    frameSize: 104,
    frames:    11,
  },
  guard: {
    source:    require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Original/cat_idle.png'),
    frameSize: 104,
    frames:    9,
  },
};

// ─── Enemy sprite definitions ─────────────────────────────────────────────────

export const ENEMY_SPRITES = {

  // ── Zone 1 — Soggy Sewers (Black units) ──────────────────────────────────

  sewer_rat: {
    idle:   { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Black Units/Archer/Archer_Idle.png'),  frameSize: 192, frames: 6 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Black Units/Archer/Archer_Shoot.png'), frameSize: 192, frames: 8 },
  },
  slimeling: {
    idle:   { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Black Units/Monk/Idle.png'), frameSize: 192, frames: 6 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Black Units/Monk/Heal.png'), frameSize: 192, frames: 11 },
  },
  cockroach_knight: {
    idle:   { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Black Units/Warrior/Warrior_Idle.png'),    frameSize: 192, frames: 8 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Black Units/Warrior/Warrior_Attack1.png'), frameSize: 192, frames: 4 },
  },
  plague_frog: {
    idle:   { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Black Units/Pawn/Pawn_Idle.png'),             frameSize: 192, frames: 8 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Black Units/Pawn/Pawn_Interact Knife.png'),   frameSize: 192, frames: 4 },
  },
  king_rat: {
    idle:   { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Yellow Units/Warrior/Warrior_Idle.png'),    frameSize: 192, frames: 8 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Yellow Units/Warrior/Warrior_Attack1.png'), frameSize: 192, frames: 4 },
  },

  // ── Zone 2 — Twisted Garden (Red units) ──────────────────────────────────

  thorn_sprite: {
    idle:   { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Archer/Archer_Idle.png'),  frameSize: 192, frames: 6 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Archer/Archer_Shoot.png'), frameSize: 192, frames: 8 },
  },
  giant_beetle: {
    idle:   { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Warrior/Warrior_Idle.png'),    frameSize: 192, frames: 8 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Warrior/Warrior_Attack1.png'), frameSize: 192, frames: 4 },
  },
  mushroom_puffer: {
    idle:   { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Monk/Idle.png'), frameSize: 192, frames: 6 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Monk/Heal.png'), frameSize: 192, frames: 11 },
  },
  vine_lurker: {
    idle:   { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Pawn/Pawn_Idle.png'),           frameSize: 192, frames: 8 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Red Units/Pawn/Pawn_Interact Knife.png'), frameSize: 192, frames: 4 },
  },
  rootmother: {
    idle:   { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Yellow Units/Monk/Idle.png'), frameSize: 192, frames: 6 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Yellow Units/Monk/Heal.png'), frameSize: 192, frames: 11 },
  },

  // ── Zone 3 — Sunken Docks (Purple units) ─────────────────────────────────

  barnacle_crab: {
    idle:   { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Warrior/Warrior_Idle.png'),    frameSize: 192, frames: 8 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Warrior/Warrior_Attack1.png'), frameSize: 192, frames: 4 },
  },
  sea_witch_eel: {
    idle:   { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Archer/Archer_Idle.png'),  frameSize: 192, frames: 6 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Archer/Archer_Shoot.png'), frameSize: 192, frames: 8 },
  },
  drowned_sailor: {
    idle:   { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Monk/Idle.png'), frameSize: 192, frames: 6 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Monk/Heal.png'), frameSize: 192, frames: 11 },
  },
  pufferfish_bomb: {
    idle:   { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Pawn/Pawn_Idle.png'),           frameSize: 192, frames: 8 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Purple Units/Pawn/Pawn_Interact Knife.png'), frameSize: 192, frames: 4 },
  },
  captain_moray: {
    idle:   { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Yellow Units/Warrior/Warrior_Idle.png'),    frameSize: 192, frames: 8 },
    attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Yellow Units/Warrior/Warrior_Attack1.png'), frameSize: 192, frames: 4 },
  },
};

// ─── Fallback for unknown / elite enemies ─────────────────────────────────────

export const FALLBACK_ENEMY_SPRITE = {
  idle:   { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Black Units/Warrior/Warrior_Idle.png'),    frameSize: 192, frames: 8 },
  attack: { source: require('../../assets/sprites/Tiny Swords (Free Pack)/Units/Black Units/Warrior/Warrior_Attack1.png'), frameSize: 192, frames: 4 },
};

// ─── Buildings (static images, no animation) ──────────────────────────────────

export const CAMP_CASTLE    = require('../../assets/sprites/Tiny Swords (Free Pack)/Buildings/Yellow Buildings/Castle.png');
export const CAMP_MONASTERY = require('../../assets/sprites/Tiny Swords (Free Pack)/Buildings/Yellow Buildings/Monastery.png');

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Returns the full sprite definition { idle, attack } for a given enemy.
 * Elite enemies at runtime have "elite_" prepended — strip it to find the base sprite.
 *
 * @param {Object} enemy – in-combat enemy object ({ id, isBoss })
 * @returns {{ idle: Object, attack: Object }}
 */
export function getEnemySprite(enemy) {
  if (!enemy) return FALLBACK_ENEMY_SPRITE;
  const baseId = (enemy.id || '').replace(/^elite_/, '');
  return ENEMY_SPRITES[baseId] || FALLBACK_ENEMY_SPRITE;
}
