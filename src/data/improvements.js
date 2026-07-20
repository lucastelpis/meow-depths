/**
 * improvements.js — Camp Improvements (facility upgrades)
 *
 * Single source of truth for the four upgradable camp facilities and every
 * number tied to them: level formulas, per-level upgrade costs, and the shop
 * unlock tiers. Pure data + pure helpers — no React, no side effects.
 *
 * All values here are intentionally easy to tune later without touching logic.
 *
 * Facilities:
 *   camp    — maximum stamina charges          (Lv1 = 3 … Lv5 = 7),   wood + cloth
 *   cooktop — stamina recharge rate (hours)    (Lv1 = 8h … Lv5 = 4h),  stone + wood
 *   storage — expedition consumable capacity   (Lv1 = 3 … Lv10 = 12),  cloth
 *   shop    — unlocked shop item tier          (Lv1 = Tier 1 … Lv4),   wood+stone+cloth+core
 */

// ─────────────────────────────────────────────────────────────────────────────
// Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const IMPROVEMENTS = {
  camp: {
    id: 'camp',
    name: 'Tent',
    blurb: 'Maximum stamina charges',
    icon: { sheet: 'icons-map', frame: 15 },
    maxLevel: 5,
    // Cost to go FROM the keyed level TO the next one.
    costs: {
      1: { wood: 6, cloth: 4 },
      2: { wood: 12, cloth: 8 },
      3: { wood: 20, cloth: 14 },
      4: { wood: 32, cloth: 22 },
    },
  },
  cooktop: {
    id: 'cooktop',
    name: 'Cooktop',
    blurb: 'Stamina recharge rate',
    icon: { sheet: 'icons-map', frame: 16 },
    maxLevel: 5,
    costs: {
      1: { stone: 6, wood: 4 },
      2: { stone: 12, wood: 9 },
      3: { stone: 20, wood: 15 },
      4: { stone: 32, wood: 24 },
    },
  },
  storage: {
    id: 'storage',
    name: 'Storage',
    blurb: 'Expedition item capacity',
    icon: { sheet: 'storages-1', frame: 0 },
    maxLevel: 10,
    costs: {
      1: { cloth: 4 },
      2: { cloth: 6 },
      3: { cloth: 9 },
      4: { cloth: 13 },
      5: { cloth: 18 },
      6: { cloth: 24 },
      7: { cloth: 32 },
      8: { cloth: 42 },
      9: { cloth: 55 },
    },
  },
  shop: {
    id: 'shop',
    name: 'Shop',
    blurb: 'Unlocks new shop stock',
    icon: { sheet: 'icons-map', frame: 90 },
    maxLevel: 4,
    // Each upgrade requires the crystal core from the matching dungeon.
    costs: {
      1: { wood: 15, stone: 15, cloth: 10, black_crystal_core: 2 },
      2: { wood: 25, stone: 25, cloth: 18, green_crystal_core: 3 },
      3: { wood: 40, stone: 40, cloth: 30, yellow_crystal_core: 4 },
    },
  },
};

// Fixed display order for the Improvements screen.
export const IMPROVEMENT_ORDER = ['camp', 'cooktop', 'storage', 'shop'];

// ─────────────────────────────────────────────────────────────────────────────
// Level formulas
// ─────────────────────────────────────────────────────────────────────────────

export function getImprovementLevel(hero, id) {
  const lvl = hero?.improvements?.[id];
  return typeof lvl === 'number' && lvl >= 1 ? lvl : 1;
}

export function getMaxStaminaForLevel(level) {
  return 2 + level; // L1 = 3 … L5 = 7
}

export function getRegenHoursForLevel(level) {
  return 9 - level; // L1 = 8h … L5 = 4h
}

export function getStorageCapacityForLevel(level) {
  return 2 + level; // L1 = 3 … L10 = 12
}

// ─────────────────────────────────────────────────────────────────────────────
// Costs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the material cost map to upgrade `id` from its CURRENT level to the
 * next one, or null if the facility is already at max level.
 */
export function getUpgradeCost(id, currentLevel) {
  const def = IMPROVEMENTS[id];
  if (!def || currentLevel >= def.maxLevel) return null;
  return def.costs[currentLevel] || null;
}

export function isMaxLevel(id, currentLevel) {
  const def = IMPROVEMENTS[id];
  return !def || currentLevel >= def.maxLevel;
}

/**
 * True when the hero owns enough of every material in `cost`.
 */
export function canAfford(cost, materials) {
  if (!cost) return false;
  const owned = materials || {};
  return Object.entries(cost).every(([itemId, qty]) => (owned[itemId] || 0) >= qty);
}

// ─────────────────────────────────────────────────────────────────────────────
// Display text — describes the EFFECT at a given level
// ─────────────────────────────────────────────────────────────────────────────

export function getStatText(id, level) {
  switch (id) {
    case 'camp':
      return `${getMaxStaminaForLevel(level)} charges`;
    case 'cooktop':
      return `1 / ${getRegenHoursForLevel(level)}h`;
    case 'storage':
      return `${getStorageCapacityForLevel(level)} slots`;
    case 'shop':
      return `Tier ${level}`;
    default:
      return '';
  }
}
