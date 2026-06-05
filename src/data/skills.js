/**
 * skills.js — Element-based skill system
 *
 * Four elements: fire, water, earth, wind.
 * Each element has:
 *   - Tier 1 Active  (core attack / utility)
 *   - Tier 1 Passive (always-on enhancement when equipped)
 *   - Tier 2 Active A (unlocked from T1 Active at ★5 + level 15)
 *   - Tier 2 Active B (same unlock requirement as T2A)
 *
 * stars map: { 1: {...}, 2: {...}, 3: {...}, 4: {...}, 5: {...} }
 * unlockedBy: null for T1, parent skill id for T2
 */

// ─────────────────────────────────────────────────────────────────────────────
// FIRE
// ─────────────────────────────────────────────────────────────────────────────

const fire_slash = {
  id: 'fire_slash',
  name: 'Fire Slash',
  element: 'fire',
  tier: 1,
  type: 'active',
  targetType: 'single',
  cooldown: 3,
  unlockedBy: null,
  icon: '🔥',
  description: 'Deals fire damage and applies guaranteed burn.',
  stars: {
    1: { damageMultiplier: 1.20, burnDamage: 2, burnDuration: 3 },
    2: { damageMultiplier: 1.40, burnDamage: 2, burnDuration: 3 },
    3: { damageMultiplier: 1.60, burnDamage: 3, burnDuration: 3 },
    4: { damageMultiplier: 1.80, burnDamage: 3, burnDuration: 4 },
    5: { damageMultiplier: 2.00, burnDamage: 4, burnDuration: 4 },
  },
};

const smoldering = {
  id: 'smoldering',
  name: 'Smoldering',
  element: 'fire',
  tier: 1,
  type: 'passive',
  targetType: 'passive',
  cooldown: 0,
  unlockedBy: null,
  icon: '🌡️',
  description: 'All burn damage ticks for more.',
  stars: {
    1: { burnTickBonus: 1 },
    2: { burnTickBonus: 2 },
    3: { burnTickBonus: 3 },
    4: { burnTickBonus: 4 },
    5: { burnTickBonus: 5 },
  },
};

const fire_burst = {
  id: 'fire_burst',
  name: 'Fire Burst',
  element: 'fire',
  tier: 2,
  type: 'active',
  targetType: 'single_with_spread',
  cooldown: 4,
  unlockedBy: 'fire_slash',
  icon: '💥',
  description: 'Explosive AOE — full hit on target, 40% splash + 30% burn on adjacent.',
  stars: {
    1: { damageMultiplier: 1.50, burnDamage: 4, burnDuration: 4, spreadPercent: 0.40, spreadBurnChance: 0.30 },
    2: { damageMultiplier: 1.60, burnDamage: 4, burnDuration: 4, spreadPercent: 0.40, spreadBurnChance: 0.30 },
    3: { damageMultiplier: 1.70, burnDamage: 5, burnDuration: 4, spreadPercent: 0.40, spreadBurnChance: 0.30 },
    4: { damageMultiplier: 1.85, burnDamage: 5, burnDuration: 5, spreadPercent: 0.40, spreadBurnChance: 0.30 },
    5: { damageMultiplier: 2.00, burnDamage: 6, burnDuration: 5, spreadPercent: 0.40, spreadBurnChance: 0.30 },
  },
};

const flame_guard = {
  id: 'flame_guard',
  name: 'Flame Guard',
  element: 'fire',
  tier: 2,
  type: 'active',
  targetType: 'self',
  cooldown: 4,
  unlockedBy: 'fire_slash',
  icon: '🛡️',
  description: 'For several turns, every enemy hit burns you counter-burns them.',
  stars: {
    1: { counterBurnDamage: 2, counterBurnDuration: 3, guardDuration: 3 },
    2: { counterBurnDamage: 3, counterBurnDuration: 3, guardDuration: 3 },
    3: { counterBurnDamage: 4, counterBurnDuration: 3, guardDuration: 3 },
    4: { counterBurnDamage: 5, counterBurnDuration: 3, guardDuration: 3 },
    5: { counterBurnDamage: 6, counterBurnDuration: 3, guardDuration: 3 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// WATER — placeholder (mirrors Fire structure, same stats for now)
// ─────────────────────────────────────────────────────────────────────────────

const tidal_strike = {
  id: 'tidal_strike',
  name: 'Tidal Strike',
  element: 'water',
  tier: 1,
  type: 'active',
  targetType: 'single',
  cooldown: 4,
  unlockedBy: null,
  icon: '💧',
  description: 'Deals damage and reduces enemy ATK for a duration. Reliable and methodical.',
  stars: {
    1: { damageMultiplier: 1.20, atkReduce: 0.10, duration: 2, cooldown: 4 },
    2: { damageMultiplier: 1.35, atkReduce: 0.10, duration: 3, cooldown: 4 },
    3: { damageMultiplier: 1.50, atkReduce: 0.15, duration: 3, cooldown: 4 },
    4: { damageMultiplier: 1.65, atkReduce: 0.15, duration: 3, cooldown: 3 },
    5: { damageMultiplier: 1.80, atkReduce: 0.20, duration: 3, cooldown: 3 },
  },
};

const hydration = {
  id: 'hydration',
  name: 'Hydration',
  element: 'water',
  tier: 1,
  type: 'passive',
  targetType: 'passive',
  cooldown: 0,
  unlockedBy: null,
  icon: '🌊',
  description: 'Amplifies all healing sources while equipped. Always active.',
  stars: {
    1: { healingEfficiency: 0.10 },
    2: { healingEfficiency: 0.15 },
    3: { healingEfficiency: 0.20 },
    4: { healingEfficiency: 0.25 },
    5: { healingEfficiency: 0.30 },
  },
};

const tidal_wave = {
  id: 'tidal_wave',
  name: 'Tidal Wave',
  element: 'water',
  tier: 2,
  type: 'active',
  targetType: 'single_with_spread',
  cooldown: 4,
  unlockedBy: 'tidal_strike',
  icon: '🌊',
  description: 'Crashing wave hits target for damage and ATK reduce. Adjacent enemies take 40% splash with a 30% chance for ATK reduce.',
  stars: {
    1: { damageMultiplier: 1.00, atkReduce: 0.10, duration: 2, spreadPercent: 0.40, spreadAtkReduceChance: 0.30, cooldown: 4 },
    2: { damageMultiplier: 1.10, atkReduce: 0.10, duration: 3, spreadPercent: 0.40, spreadAtkReduceChance: 0.30, cooldown: 4 },
    3: { damageMultiplier: 1.20, atkReduce: 0.15, duration: 3, spreadPercent: 0.40, spreadAtkReduceChance: 0.30, cooldown: 4 },
    4: { damageMultiplier: 1.35, atkReduce: 0.15, duration: 3, spreadPercent: 0.40, spreadAtkReduceChance: 0.30, cooldown: 3 },
    5: { damageMultiplier: 1.50, atkReduce: 0.20, duration: 3, spreadPercent: 0.40, spreadAtkReduceChance: 0.30, cooldown: 3 },
  },
};

const healing_current = {
  id: 'healing_current',
  name: 'Healing Current',
  element: 'water',
  tier: 2,
  type: 'active',
  targetType: 'self',
  cooldown: 6,
  unlockedBy: 'tidal_strike',
  icon: '🫧',
  description: 'No damage — healing only. Applies a HoT effect restoring % of max HP each turn for 3 turns.',
  stars: {
    1: { healPerTurn: 0.03, duration: 3, cooldown: 6 },
    2: { healPerTurn: 0.05, duration: 3, cooldown: 6 },
    3: { healPerTurn: 0.06, duration: 3, cooldown: 6 },
    4: { healPerTurn: 0.08, duration: 3, cooldown: 6 },
    5: { healPerTurn: 0.10, duration: 3, cooldown: 6 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// EARTH — placeholder (mirrors Fire structure)
// ─────────────────────────────────────────────────────────────────────────────

const earth_slam = {
  id: 'earth_slam',
  name: 'Earth Slam',
  element: 'earth',
  tier: 1,
  type: 'active',
  targetType: 'single',
  cooldown: 3,
  unlockedBy: null,
  icon: '🪨',
  description: 'Smashes the enemy with the force of stone.',
  stars: {
    1: { damageMultiplier: 1.20, burnDamage: 2, burnDuration: 3 },
    2: { damageMultiplier: 1.40, burnDamage: 2, burnDuration: 3 },
    3: { damageMultiplier: 1.60, burnDamage: 3, burnDuration: 3 },
    4: { damageMultiplier: 1.80, burnDamage: 3, burnDuration: 4 },
    5: { damageMultiplier: 2.00, burnDamage: 4, burnDuration: 4 },
  },
};

const bedrock = {
  id: 'bedrock',
  name: 'Bedrock',
  element: 'earth',
  tier: 1,
  type: 'passive',
  targetType: 'passive',
  cooldown: 0,
  unlockedBy: null,
  icon: '⛰️',
  description: 'Unyielding stone skin reduces all incoming damage.',
  stars: {
    1: { burnTickBonus: 1 },
    2: { burnTickBonus: 2 },
    3: { burnTickBonus: 3 },
    4: { burnTickBonus: 4 },
    5: { burnTickBonus: 5 },
  },
};

const rockslide = {
  id: 'rockslide',
  name: 'Rockslide',
  element: 'earth',
  tier: 2,
  type: 'active',
  targetType: 'single_with_spread',
  cooldown: 4,
  unlockedBy: 'earth_slam',
  icon: '🏔️',
  description: 'Triggers an avalanche that buries nearby enemies.',
  stars: {
    1: { damageMultiplier: 1.50, burnDamage: 4, burnDuration: 4, spreadPercent: 0.40, spreadBurnChance: 0.30 },
    2: { damageMultiplier: 1.60, burnDamage: 4, burnDuration: 4, spreadPercent: 0.40, spreadBurnChance: 0.30 },
    3: { damageMultiplier: 1.70, burnDamage: 5, burnDuration: 4, spreadPercent: 0.40, spreadBurnChance: 0.30 },
    4: { damageMultiplier: 1.85, burnDamage: 5, burnDuration: 5, spreadPercent: 0.40, spreadBurnChance: 0.30 },
    5: { damageMultiplier: 2.00, burnDamage: 6, burnDuration: 5, spreadPercent: 0.40, spreadBurnChance: 0.30 },
  },
};

const stone_wall = {
  id: 'stone_wall',
  name: 'Stone Wall',
  element: 'earth',
  tier: 2,
  type: 'active',
  targetType: 'self',
  cooldown: 4,
  unlockedBy: 'earth_slam',
  icon: '🧱',
  description: 'Erects an earthen barrier that absorbs damage.',
  stars: {
    1: { counterBurnDamage: 2, counterBurnDuration: 3, guardDuration: 3 },
    2: { counterBurnDamage: 3, counterBurnDuration: 3, guardDuration: 3 },
    3: { counterBurnDamage: 4, counterBurnDuration: 3, guardDuration: 3 },
    4: { counterBurnDamage: 5, counterBurnDuration: 3, guardDuration: 3 },
    5: { counterBurnDamage: 6, counterBurnDuration: 3, guardDuration: 3 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// WIND — placeholder (mirrors Fire structure)
// ─────────────────────────────────────────────────────────────────────────────

const wind_slash = {
  id: 'wind_slash',
  name: 'Wind Slash',
  element: 'wind',
  tier: 1,
  type: 'active',
  targetType: 'single',
  cooldown: 3,
  unlockedBy: null,
  icon: '🌪️',
  description: 'A razor-sharp gust that slices with precision.',
  stars: {
    1: { damageMultiplier: 1.20, burnDamage: 2, burnDuration: 3 },
    2: { damageMultiplier: 1.40, burnDamage: 2, burnDuration: 3 },
    3: { damageMultiplier: 1.60, burnDamage: 3, burnDuration: 3 },
    4: { damageMultiplier: 1.80, burnDamage: 3, burnDuration: 4 },
    5: { damageMultiplier: 2.00, burnDamage: 4, burnDuration: 4 },
  },
};

const swift_step = {
  id: 'swift_step',
  name: 'Swift Step',
  element: 'wind',
  tier: 1,
  type: 'passive',
  targetType: 'passive',
  cooldown: 0,
  unlockedBy: null,
  icon: '💨',
  description: 'Heightened agility improves evasion at all times.',
  stars: {
    1: { burnTickBonus: 1 },
    2: { burnTickBonus: 2 },
    3: { burnTickBonus: 3 },
    4: { burnTickBonus: 4 },
    5: { burnTickBonus: 5 },
  },
};

const cyclone = {
  id: 'cyclone',
  name: 'Cyclone',
  element: 'wind',
  tier: 2,
  type: 'active',
  targetType: 'single_with_spread',
  cooldown: 4,
  unlockedBy: 'wind_slash',
  icon: '🌀',
  description: 'A spiraling vortex that tears through all enemies.',
  stars: {
    1: { damageMultiplier: 1.50, burnDamage: 4, burnDuration: 4, spreadPercent: 0.40, spreadBurnChance: 0.30 },
    2: { damageMultiplier: 1.60, burnDamage: 4, burnDuration: 4, spreadPercent: 0.40, spreadBurnChance: 0.30 },
    3: { damageMultiplier: 1.70, burnDamage: 5, burnDuration: 4, spreadPercent: 0.40, spreadBurnChance: 0.30 },
    4: { damageMultiplier: 1.85, burnDamage: 5, burnDuration: 5, spreadPercent: 0.40, spreadBurnChance: 0.30 },
    5: { damageMultiplier: 2.00, burnDamage: 6, burnDuration: 5, spreadPercent: 0.40, spreadBurnChance: 0.30 },
  },
};

const wind_veil = {
  id: 'wind_veil',
  name: 'Wind Veil',
  element: 'wind',
  tier: 2,
  type: 'active',
  targetType: 'self',
  cooldown: 4,
  unlockedBy: 'wind_slash',
  icon: '🌬️',
  description: 'Wraps Mochi in a gust that deflects incoming blows.',
  stars: {
    1: { counterBurnDamage: 2, counterBurnDuration: 3, guardDuration: 3 },
    2: { counterBurnDamage: 3, counterBurnDuration: 3, guardDuration: 3 },
    3: { counterBurnDamage: 4, counterBurnDuration: 3, guardDuration: 3 },
    4: { counterBurnDamage: 5, counterBurnDuration: 3, guardDuration: 3 },
    5: { counterBurnDamage: 6, counterBurnDuration: 3, guardDuration: 3 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Aggregated maps
// ─────────────────────────────────────────────────────────────────────────────

export const SKILLS = {
  // Fire
  fire_slash,
  smoldering,
  fire_burst,
  flame_guard,
  // Water
  tidal_strike,
  hydration,
  tidal_wave,
  healing_current,
  // Earth
  earth_slam,
  bedrock,
  rockslide,
  stone_wall,
  // Wind
  wind_slash,
  swift_step,
  cyclone,
  wind_veil,
};

// Per-element ordered list: [T1 active, T1 passive, T2A, T2B]
export const ELEMENT_SKILLS = {
  fire:  ['fire_slash', 'smoldering', 'fire_burst', 'flame_guard'],
  water: ['tidal_strike', 'hydration', 'tidal_wave', 'healing_current'],
  earth: ['earth_slam', 'bedrock', 'rockslide', 'stone_wall'],
  wind:  ['wind_slash', 'swift_step', 'cyclone', 'wind_veil'],
};

// Tier 1 active skill per element (the parent that unlocks T2 skills)
export const ELEMENT_T1_ACTIVE = {
  fire: 'fire_slash',
  water: 'tidal_strike',
  earth: 'earth_slam',
  wind: 'wind_slash',
};

/**
 * SP cost to unlock or star-up a skill.
 */
export function getSkillCost(skill) {
  return skill.tier === 1 ? 1 : 2;
}

/**
 * Returns whether the hero can unlock a skill.
 * T1: hero.level >= 2
 * T2: hero.level >= 15 AND parent T1 active is at stars 5
 */
export function canUnlockElementSkill(skillId, hero) {
  const skill = SKILLS[skillId];
  if (!skill) return { can: false, reason: 'Unknown skill.' };
  if (skill.element !== hero.element) return { can: false, reason: 'Wrong element.' };
  if (hero.unlockedSkills[skillId]) return { can: false, reason: 'Already unlocked.' };

  const cost = getSkillCost(skill);
  if ((hero.skillPoints || 0) < cost) {
    return { can: false, reason: `Need ${cost} SP (have ${hero.skillPoints || 0}).` };
  }

  if (skill.tier === 1) {
    if (hero.level < 2) return { can: false, reason: 'Requires level 2.' };
    return { can: true };
  }

  // Tier 2
  if (hero.level < 15) return { can: false, reason: 'Requires level 15.' };
  const parentEntry = hero.unlockedSkills[skill.unlockedBy];
  if (!parentEntry || parentEntry.stars < 5) {
    const parentSkill = SKILLS[skill.unlockedBy];
    return { can: false, reason: `Requires ${parentSkill?.name || skill.unlockedBy} at ★5.` };
  }
  return { can: true };
}

/**
 * Returns whether the hero can star up a skill.
 */
export function canStarUpSkill(skillId, hero) {
  const skill = SKILLS[skillId];
  if (!skill) return { can: false, reason: 'Unknown skill.' };
  if (skill.element !== hero.element) return { can: false, reason: 'Wrong element.' };
  const entry = hero.unlockedSkills[skillId];
  if (!entry) return { can: false, reason: 'Skill not unlocked.' };
  if (entry.stars >= 5) return { can: false, reason: 'Already at max star.' };

  const cost = getSkillCost(skill);
  if ((hero.skillPoints || 0) < cost) {
    return { can: false, reason: `Need ${cost} SP (have ${hero.skillPoints || 0}).` };
  }
  return { can: true };
}

export default SKILLS;
