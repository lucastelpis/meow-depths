/**
 * skills.js — Element-based skill system
 *
 * Four elements: fire, water, earth, wind.
 * Each element has:
 *   - Tier 1 Active  (core attack / utility)
 *   - Tier 1 Passive (always-on enhancement when equipped)
 *   - Tier 2 Active A (unlocked from T1 Active at ★5 + level 10)
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
    1: { damageMultiplier: 1.20, burnDamage: 2, burnDuration: 1 },
    2: { damageMultiplier: 1.40, burnDamage: 2, burnDuration: 2 },
    3: { damageMultiplier: 1.60, burnDamage: 3, burnDuration: 2 },
    4: { damageMultiplier: 1.80, burnDamage: 3, burnDuration: 3 },
    5: { damageMultiplier: 2.00, burnDamage: 4, burnDuration: 3 },
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
    1: { damageMultiplier: 1.50, burnDamage: 4, burnDuration: 3, spreadPercent: 0.30, spreadBurnChance: 0.30 },
    2: { damageMultiplier: 1.60, burnDamage: 4, burnDuration: 3, spreadPercent: 0.40, spreadBurnChance: 0.30 },
    3: { damageMultiplier: 1.70, burnDamage: 5, burnDuration: 3, spreadPercent: 0.40, spreadBurnChance: 0.40 },
    4: { damageMultiplier: 1.85, burnDamage: 5, burnDuration: 3, spreadPercent: 0.50, spreadBurnChance: 0.40 },
    5: { damageMultiplier: 2.00, burnDamage: 6, burnDuration: 3, spreadPercent: 0.50, spreadBurnChance: 0.50 },
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
  description: 'For 1 turn, you light up a flame wall that causes enemies to burn when they hit.',
  stars: {
    1: { counterBurnDamage: 3, counterBurnDuration: 1, guardDuration: 1 },
    2: { counterBurnDamage: 3, counterBurnDuration: 2, guardDuration: 1 },
    3: { counterBurnDamage: 4, counterBurnDuration: 2, guardDuration: 1 },
    4: { counterBurnDamage: 4, counterBurnDuration: 3, guardDuration: 1 },
    5: { counterBurnDamage: 5, counterBurnDuration: 3, guardDuration: 1 },
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
  cooldown: 3,
  unlockedBy: null,
  icon: '💧',
  description: 'Deals damage and reduces enemy ATK for a duration. Reliable and methodical.',
  stars: {
    1: { damageMultiplier: 1.20, atkReduce: 0.10, duration: 2 },
    2: { damageMultiplier: 1.35, atkReduce: 0.10, duration: 3 },
    3: { damageMultiplier: 1.50, atkReduce: 0.15, duration: 3 },
    4: { damageMultiplier: 1.65, atkReduce: 0.15, duration: 3 },
    5: { damageMultiplier: 1.80, atkReduce: 0.20, duration: 3 },
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
    1: { damageMultiplier: 1.10, atkReduce: 0.10, duration: 3, spreadPercent: 0.20, spreadAtkReduceChance: 0.30 },
    2: { damageMultiplier: 1.20, atkReduce: 0.15, duration: 3, spreadPercent: 0.30, spreadAtkReduceChance: 0.30 },
    3: { damageMultiplier: 1.30, atkReduce: 0.20, duration: 3, spreadPercent: 0.40, spreadAtkReduceChance: 0.40 },
    4: { damageMultiplier: 1.40, atkReduce: 0.25, duration: 3, spreadPercent: 0.50, spreadAtkReduceChance: 0.40 },
    5: { damageMultiplier: 1.50, atkReduce: 0.30, duration: 3, spreadPercent: 0.60, spreadAtkReduceChance: 0.50 },
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
    1: { healPerTurn: 0.05, duration: 3 },
    2: { healPerTurn: 0.08, duration: 3 },
    3: { healPerTurn: 0.12, duration: 3 },
    4: { healPerTurn: 0.16, duration: 3 },
    5: { healPerTurn: 0.20, duration: 3 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// EARTH
// ─────────────────────────────────────────────────────────────────────────────

const boulder_slash = {
  id: 'boulder_slash',
  name: 'Boulder Slash',
  element: 'earth',
  tier: 1,
  type: 'active',
  targetType: 'single',
  cooldown: 3,
  unlockedBy: null,
  icon: '🪨',
  description: 'Smashes the enemy with stony force. Has a chance to stun for 1 turn.',
  stars: {
    1: { damageMultiplier: 1.15, stunChance: 0.20 },
    2: { damageMultiplier: 1.30, stunChance: 0.40 },
    3: { damageMultiplier: 1.45, stunChance: 0.60 },
    4: { damageMultiplier: 1.60, stunChance: 0.80 },
    5: { damageMultiplier: 1.75, stunChance: 1.00 },
  },
};

const fortitude = {
  id: 'fortitude',
  name: 'Fortitude',
  element: 'earth',
  tier: 1,
  type: 'passive',
  targetType: 'passive',
  cooldown: 0,
  unlockedBy: null,
  icon: '🛡️',
  description: 'Passive — incoming status effects (bleed, stun, atk_reduce, etc.) have a chance to be completely resisted.',
  stars: {
    1: { statusResistChance: 0.15 },
    2: { statusResistChance: 0.30 },
    3: { statusResistChance: 0.45 },
    4: { statusResistChance: 0.60 },
    5: { statusResistChance: 0.75 },
  },
};

const fortify = {
  id: 'fortify',
  name: 'Fortify',
  element: 'earth',
  tier: 2,
  type: 'active',
  targetType: 'self',
  cooldown: 5, // base cooldown (★1-2); overridden per star in combat
  unlockedBy: 'boulder_slash',
  icon: '⛰️',
  description: 'No damage — self only. Instantly boosts DEF for 1 turn. Can reduce incoming damage to 0.',
  stars: {
    1: { defBoostPercent: 0.50, cooldown: 5 },
    2: { defBoostPercent: 0.75, cooldown: 5 },
    3: { defBoostPercent: 1.00, cooldown: 4 },
    4: { defBoostPercent: 1.25, cooldown: 4 },
    5: { defBoostPercent: 1.50, cooldown: 3 },
  },
};

const stone_thorns = {
  id: 'stone_thorns',
  name: 'Stone Thorns',
  element: 'earth',
  tier: 2,
  type: 'passive',
  targetType: 'passive',
  cooldown: 0,
  unlockedBy: 'fortitude',
  icon: '🌵',
  description: 'Passive — reflects a portion of raw incoming damage (before DEF reduction) back to attackers. Minimum 1.',
  stars: {
    1: { reflectPercent: 0.07 },
    2: { reflectPercent: 0.14 },
    3: { reflectPercent: 0.21 },
    4: { reflectPercent: 0.28 },
    5: { reflectPercent: 0.35 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// WIND
// ─────────────────────────────────────────────────────────────────────────────

const dual_slash = {
  id: 'dual_slash',
  name: 'Dual Slash',
  element: 'wind',
  tier: 1,
  type: 'active',
  targetType: 'single',
  cooldown: 3,
  unlockedBy: null,
  icon: '💨',
  description: 'Two rapid strikes on the same target. Each hit rolls crit independently with +10% bonus crit per hit.',
  stars: {
    1: { damageMultiplier: 0.55, bonusCritChance: 0.10 },
    2: { damageMultiplier: 0.60, bonusCritChance: 0.10 },
    3: { damageMultiplier: 0.65, bonusCritChance: 0.10 },
    4: { damageMultiplier: 0.70, bonusCritChance: 0.10 },
    5: { damageMultiplier: 0.75, bonusCritChance: 0.10 },
  },
};

const swiftness = {
  id: 'swiftness',
  name: 'Swiftness',
  element: 'wind',
  tier: 1,
  type: 'passive',
  targetType: 'passive',
  cooldown: 0,
  unlockedBy: null,
  icon: '🍃',
  description: 'Passive — permanently increases Mochi\'s dodge chance while equipped.',
  stars: {
    1: { dodgeBonus: 0.02 },
    2: { dodgeBonus: 0.04 },
    3: { dodgeBonus: 0.06 },
    4: { dodgeBonus: 0.08 },
    5: { dodgeBonus: 0.10 },
  },
};

const whirlwind = {
  id: 'whirlwind',
  name: 'Whirlwind',
  element: 'wind',
  tier: 2,
  type: 'active',
  targetType: 'single_with_spread',
  cooldown: 4, // base; ★5 reduces to 3 (stored in star data)
  unlockLevel: 15,
  unlockedBy: 'dual_slash',
  icon: '🌪️',
  description: '3 rapid strikes on the primary target, each spreading 40% to adjacent enemies. Every hit rolls crit independently with +15% bonus crit.',
  stars: {
    1: { damageMultiplier: 0.45, spreadPercent: 0.40, bonusCritChance: 0.15, cooldown: 4 },
    2: { damageMultiplier: 0.50, spreadPercent: 0.40, bonusCritChance: 0.15, cooldown: 4 },
    3: { damageMultiplier: 0.55, spreadPercent: 0.40, bonusCritChance: 0.15, cooldown: 4 },
    4: { damageMultiplier: 0.60, spreadPercent: 0.40, bonusCritChance: 0.15, cooldown: 4 },
    5: { damageMultiplier: 0.65, spreadPercent: 0.40, bonusCritChance: 0.15, cooldown: 3 },
  },
};

const critical_wind = {
  id: 'critical_wind',
  name: 'Critical Wind',
  element: 'wind',
  tier: 2,
  type: 'passive',
  targetType: 'passive',
  cooldown: 0,
  unlockLevel: 15,
  unlockedBy: 'dual_slash',
  icon: '⚡',
  description: 'Passive — replaces the base crit multiplier (150%) with a higher value. Not additive — it fully overrides it.',
  stars: {
    1: { critMultiplier: 1.60 },
    2: { critMultiplier: 1.70 },
    3: { critMultiplier: 1.80 },
    4: { critMultiplier: 1.90 },
    5: { critMultiplier: 2.00 },
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
  boulder_slash,
  fortitude,
  fortify,
  stone_thorns,
  // Wind
  dual_slash,
  swiftness,
  whirlwind,
  critical_wind,
};

// Per-element ordered list: [T1 active, T1 passive, T2 active, T2 passive]
export const ELEMENT_SKILLS = {
  fire: ['fire_slash', 'smoldering', 'fire_burst', 'flame_guard'],
  water: ['tidal_strike', 'hydration', 'tidal_wave', 'healing_current'],
  earth: ['boulder_slash', 'fortitude', 'fortify', 'stone_thorns'],
  wind: ['dual_slash', 'swiftness', 'whirlwind', 'critical_wind'],
};

// Tier 1 active skill per element (the parent that unlocks T2 skills)
export const ELEMENT_T1_ACTIVE = {
  fire: 'fire_slash',
  water: 'tidal_strike',
  earth: 'boulder_slash',
  wind: 'dual_slash',
};

/**
 * Crystal costs to unlock (★1) or star-up (★2-5) a skill, plus the hero
 * level required to do so. Costs are keyed by skill tier, then target star.
 *
 * Currently only Black Crystal materials (Zone 1) are used for both
 * Tier 1 (★1-5, level 1-5) and Tier 2 (★1-5, level 11-15) skills.
 */
export const SKILL_UPGRADE_COSTS = {
  1: {
    1: { requiredLevel: 1, materials: { black_shard: 10 } },
    2: { requiredLevel: 2, materials: { black_shard: 20 } },
    3: { requiredLevel: 3, materials: { black_shard: 30 } },
    4: { requiredLevel: 4, materials: { black_crystal_small: 15 } },
    5: { requiredLevel: 5, materials: { black_crystal_small: 30 } },
  },
  2: {
    1: { requiredLevel: 11, materials: { black_crystal_small: 50 } },
    2: { requiredLevel: 12, materials: { black_crystal_big: 15 } },
    3: { requiredLevel: 13, materials: { black_crystal_big: 30 } },
    4: { requiredLevel: 14, materials: { black_crystal_big: 45 } },
    5: { requiredLevel: 15, materials: { black_crystal_big: 60, black_crystal_core: 1 } },
  },
};

/**
 * Returns the { requiredLevel, materials } cost to bring a skill to the
 * given star level (1-5), or null if no such tier/star is defined.
 */
export function getSkillUpgradeCost(skill, targetStar) {
  return SKILL_UPGRADE_COSTS[skill.tier]?.[targetStar] || null;
}

/**
 * Returns whether the hero's material inventory satisfies a cost's
 * material requirements.
 */
export function hasMaterials(materials, cost) {
  return Object.entries(cost).every(([itemId, qty]) => (materials?.[itemId] || 0) >= qty);
}

/**
 * Returns whether the hero can unlock a skill (bring it to ★1).
 * T1: hero.level >= 1, T2: hero.level >= 11 AND parent T1 active is at ★5.
 * Both also require the crystal cost for ★1.
 */
export function canUnlockElementSkill(skillId, hero) {
  const skill = SKILLS[skillId];
  if (!skill) return { can: false, reason: 'Unknown skill.' };
  if (skill.element !== hero.element) return { can: false, reason: 'Wrong element.' };
  if (hero.unlockedSkills[skillId]) return { can: false, reason: 'Already unlocked.' };

  const cost = getSkillUpgradeCost(skill, 1);
  if (!cost) return { can: false, reason: 'No cost defined.' };

  if (skill.tier === 2) {
    const parentEntry = hero.unlockedSkills[skill.unlockedBy];
    if (!parentEntry || parentEntry.stars < 5) {
      const parentSkill = SKILLS[skill.unlockedBy];
      return { can: false, reason: `Requires ${parentSkill?.name || skill.unlockedBy} at ★5.`, cost };
    }
  }

  if (hero.level < cost.requiredLevel) {
    return { can: false, reason: `Requires level ${cost.requiredLevel}.`, cost };
  }

  if (!hasMaterials(hero.inventory?.materials, cost.materials)) {
    return { can: false, reason: 'Not enough crystals.', cost };
  }

  return { can: true, cost };
}

/**
 * Returns whether the hero can star up a skill to its next star level.
 */
export function canStarUpSkill(skillId, hero) {
  const skill = SKILLS[skillId];
  if (!skill) return { can: false, reason: 'Unknown skill.' };
  if (skill.element !== hero.element) return { can: false, reason: 'Wrong element.' };
  const entry = hero.unlockedSkills[skillId];
  if (!entry) return { can: false, reason: 'Skill not unlocked.' };
  if (entry.stars >= 5) return { can: false, reason: 'Already at max star.' };

  const targetStar = entry.stars + 1;
  const cost = getSkillUpgradeCost(skill, targetStar);
  if (!cost) return { can: false, reason: 'No cost defined.' };

  if (hero.level < cost.requiredLevel) {
    return { can: false, reason: `Requires level ${cost.requiredLevel}.`, cost };
  }

  if (!hasMaterials(hero.inventory?.materials, cost.materials)) {
    return { can: false, reason: 'Not enough crystals.', cost };
  }

  return { can: true, cost };
}

export default SKILLS;
