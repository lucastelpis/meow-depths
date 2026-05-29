/**
 * skills.js — Meow Depths Skill Trees
 *
 * Three class paths, each with 4 tiers.  Tiers 3-4 branch into "a" / "b"
 * sub-paths that are mutually exclusive within a single playthrough.
 *
 * Shape reference:
 *   id          – unique key (matches the SKILLS map key)
 *   name        – display name
 *   path        – 'ironPaw' | 'stonefur' | 'shadowClaw'
 *   tier        – 1-4 (determines unlock order & skill-point cost)
 *   type        – 'active' (has cooldown) | 'passive' (always on)
 *   description – player-facing tooltip
 *   cooldown    – turns between uses (active skills only, 0 for passives)
 *   effect      – machine-readable effect descriptor
 *   branch      – 'a' | 'b' for tier 3-4 choices, null for tiers 1-2
 *   requires    – skill id that must be learned first, or null
 */

// ─────────────────────────────────────────────────────────────────────────────
// Iron Paw — Offensive / self-sustain melee path
// ─────────────────────────────────────────────────────────────────────────────

const iron_slash = {
  id: 'iron_slash',
  name: 'Iron Slash',
  path: 'ironPaw',
  tier: 1,
  type: 'active',
  description: '120% attack damage to one enemy',
  cooldown: 2,
  effect: { type: 'damage', multiplier: 1.2, target: 'single' },
  branch: null,
  requires: null,
};

const steady_paws = {
  id: 'steady_paws',
  name: 'Steady Paws',
  path: 'ironPaw',
  tier: 2,
  type: 'passive',
  description: '+10% crit chance',
  cooldown: 0,
  effect: { type: 'stat_boost', stat: 'critChance', value: 0.10 },
  branch: null,
  requires: 'iron_slash',
};

/* ── Tier 3 branch ─────────────────────── */

const rally = {
  id: 'rally',
  name: 'Rally',
  path: 'ironPaw',
  tier: 3,
  type: 'active',
  description: 'Heal 15% of max HP',
  cooldown: 4,
  effect: { type: 'heal', percentMaxHp: 0.15 },
  branch: 'a',
  requires: 'steady_paws',
};

const power_strike = {
  id: 'power_strike',
  name: 'Power Strike',
  path: 'ironPaw',
  tier: 3,
  type: 'active',
  description: '160% damage to one enemy',
  cooldown: 3,
  effect: { type: 'damage', multiplier: 1.6, target: 'single' },
  branch: 'b',
  requires: 'steady_paws',
};

/* ── Tier 4 branch ─────────────────────── */

const veteran = {
  id: 'veteran',
  name: 'Veteran',
  path: 'ironPaw',
  tier: 4,
  type: 'passive',
  description: '+20 max HP, +3 defence',
  cooldown: 0,
  effect: {
    type: 'multi_stat_boost',
    boosts: [
      { stat: 'maxHp', value: 20 },
      { stat: 'defence', value: 3 },
    ],
  },
  branch: 'a',
  requires: 'rally',
};

const sharp_mind = {
  id: 'sharp_mind',
  name: 'Sharp Mind',
  path: 'ironPaw',
  tier: 4,
  type: 'passive',
  description: 'Reduce all cooldowns by 1 turn',
  cooldown: 0,
  effect: { type: 'cooldown_reduction', value: 1 },
  branch: 'b',
  requires: 'power_strike',
};

// ─────────────────────────────────────────────────────────────────────────────
// Stonefur — Defensive / counter-attack path
// ─────────────────────────────────────────────────────────────────────────────

const guard_stance = {
  id: 'guard_stance',
  name: 'Guard Stance',
  path: 'stonefur',
  tier: 1,
  type: 'active',
  description: 'Reduce incoming damage by 50% for 1 turn',
  cooldown: 3,
  effect: { type: 'guard', damageReduction: 0.5, duration: 1 },
  branch: null,
  requires: null,
};

const iron_hide = {
  id: 'iron_hide',
  name: 'Iron Hide',
  path: 'stonefur',
  tier: 2,
  type: 'passive',
  description: '+30 max HP, +5 defence',
  cooldown: 0,
  effect: {
    type: 'multi_stat_boost',
    boosts: [
      { stat: 'maxHp', value: 30 },
      { stat: 'defence', value: 5 },
    ],
  },
  branch: null,
  requires: 'guard_stance',
};

/* ── Tier 3 branch ─────────────────────── */

const retaliate = {
  id: 'retaliate',
  name: 'Retaliate',
  path: 'stonefur',
  tier: 3,
  type: 'active',
  description: 'Counter next attack for 150% of damage received',
  cooldown: 4,
  effect: { type: 'counter', multiplier: 1.5, duration: 1 },
  branch: 'a',
  requires: 'iron_hide',
};

const thick_fur = {
  id: 'thick_fur',
  name: 'Thick Fur',
  path: 'stonefur',
  tier: 3,
  type: 'passive',
  description: 'Reduce all incoming damage by 3 flat',
  cooldown: 0,
  effect: { type: 'flat_damage_reduction', value: 3 },
  branch: 'b',
  requires: 'iron_hide',
};

/* ── Tier 4 branch ─────────────────────── */

const unbreakable = {
  id: 'unbreakable',
  name: 'Unbreakable',
  path: 'stonefur',
  tier: 4,
  type: 'passive',
  description: 'When HP drops below 20%, gain +50% defence for 2 turns',
  cooldown: 0,
  effect: {
    type: 'threshold_buff',
    hpPercent: 0.2,
    stat: 'defence',
    multiplier: 0.5,
    duration: 2,
  },
  branch: 'a',
  requires: 'retaliate',
};

const titan_slam = {
  id: 'titan_slam',
  name: 'Titan Slam',
  path: 'stonefur',
  tier: 4,
  type: 'active',
  description: '200% damage, stuns enemy for 1 turn',
  cooldown: 5,
  effect: { type: 'damage_stun', multiplier: 2.0, stunDuration: 1, target: 'single' },
  branch: 'b',
  requires: 'thick_fur',
};

// ─────────────────────────────────────────────────────────────────────────────
// Shadow Claw — Stealth / bleed / crit-focused path
// ─────────────────────────────────────────────────────────────────────────────

const vanish = {
  id: 'vanish',
  name: 'Vanish',
  path: 'shadowClaw',
  tier: 1,
  type: 'active',
  description: 'Enter stealth, next attack guaranteed crit +50% damage',
  cooldown: 4,
  effect: { type: 'stealth', bonusDamage: 0.5, duration: 999 },
  branch: null,
  requires: null,
};

const serrated_claws = {
  id: 'serrated_claws',
  name: 'Serrated Claws',
  path: 'shadowClaw',
  tier: 2,
  type: 'passive',
  description: '25% chance to inflict Bleed (3 dmg/turn for 3 turns)',
  cooldown: 0,
  effect: { type: 'bleed_on_hit', chance: 0.25, damage: 3, duration: 3 },
  branch: null,
  requires: 'vanish',
};

/* ── Tier 3 branch ─────────────────────── */

const death_mark = {
  id: 'death_mark',
  name: 'Death Mark',
  path: 'shadowClaw',
  tier: 3,
  type: 'active',
  description: 'Target takes +50% damage for 3 turns',
  cooldown: 4,
  effect: { type: 'death_mark', damageIncrease: 0.5, duration: 3, target: 'single' },
  branch: 'a',
  requires: 'serrated_claws',
};

const sharp_eyes = {
  id: 'sharp_eyes',
  name: 'Sharp Eyes',
  path: 'shadowClaw',
  tier: 3,
  type: 'passive',
  description: '+25% crit chance',
  cooldown: 0,
  effect: { type: 'stat_boost', stat: 'critChance', value: 0.25 },
  branch: 'b',
  requires: 'serrated_claws',
};

/* ── Tier 4 branch ─────────────────────── */

const toxic_claws = {
  id: 'toxic_claws',
  name: 'Toxic Claws',
  path: 'shadowClaw',
  tier: 4,
  type: 'passive',
  description: 'Bleed deals 1 extra damage per stack',
  cooldown: 0,
  effect: { type: 'bleed_boost', extraDamage: 1 },
  branch: 'a',
  requires: 'death_mark',
};

const phantom_step = {
  id: 'phantom_step',
  name: 'Phantom Step',
  path: 'shadowClaw',
  tier: 4,
  type: 'passive',
  description: 'After dodging, next attack is guaranteed crit',
  cooldown: 0,
  effect: { type: 'dodge_crit', description: 'After dodging, next attack is guaranteed crit' },
  branch: 'b',
  requires: 'sharp_eyes',
};

// ─────────────────────────────────────────────────────────────────────────────
// Aggregated map — keyed by skill id for O(1) lookup
// ─────────────────────────────────────────────────────────────────────────────

export const SKILLS = {
  // Iron Paw
  iron_slash,
  steady_paws,
  rally,
  power_strike,
  veteran,
  sharp_mind,
  // Stonefur
  guard_stance,
  iron_hide,
  retaliate,
  thick_fur,
  unbreakable,
  titan_slam,
  // Shadow Claw
  vanish,
  serrated_claws,
  death_mark,
  sharp_eyes,
  toxic_claws,
  phantom_step,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper — returns an array of skill definitions for a given class path
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {'ironPaw'|'stonefur'|'shadowClaw'} pathName
 * @returns {Array} skills belonging to that path, sorted by tier
 */
export function getSkillsByPath(pathName) {
  return Object.values(SKILLS)
    .filter((skill) => skill.path === pathName)
    .sort((a, b) => a.tier - b.tier);
}

export default SKILLS;
