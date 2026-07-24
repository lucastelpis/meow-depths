/**
 * reinforcement.js — Gear Reinforcement (the Forge)
 *
 * Every gear piece can be reinforced up to +5, each level granting +1 DEF while
 * equipped. Reinforcement is stored per gear id (all copies of a type share the
 * level — they're identical anyway), keyed in `hero.reinforcements`.
 *
 * Costs are paid in the crystal ladder that matches the gear's ZONE COLOUR:
 *   zone 1 → black, zone 2 → green, zone 3 → yellow
 *
 * The curve escalates by crystal tier, and the final level (+5) demands a
 * Crystal Core — obtainable only from that zone's boss. So a piece can only be
 * fully maxed by beating the boss of the zone it belongs to.
 *
 * Pure data + pure helpers — no React, no side effects.
 */

export const MAX_REINFORCE_LEVEL = 5;
export const DEF_PER_LEVEL = 1;
export const ATK_PER_LEVEL = 1;

/**
 * What stat a reinforcement level grants, based on the gear's slot:
 * weapons sharpen (+ATK), everything else hardens (+DEF).
 * Returns { stat: 'attack'|'defence', perLevel: number, label: 'ATK'|'DEF' }.
 */
export function getReinforceBonus(gearDef) {
  if (gearDef?.type === 'weapon') {
    return { stat: 'attack', perLevel: ATK_PER_LEVEL, label: 'ATK' };
  }
  return { stat: 'defence', perLevel: DEF_PER_LEVEL, label: 'DEF' };
}

// Gear `zone` (1|2|3) → crystal colour prefix.
const ZONE_COLORS = { 1: 'black', 2: 'green', 3: 'yellow' };

// Cost to go FROM the keyed level TO the next one, expressed in generic crystal
// tiers. Mapped to the gear's zone colour by getReinforceCost().
const COST_CURVE = {
  0: { shard: 4 },            // → +1
  1: { shard: 8 },            // → +2
  2: { small: 6 },            // → +3
  3: { small: 12 },           // → +4
  4: { big: 4, core: 1 },     // → +5 (capstone — the core comes from the zone boss)
};

// Generic tier → concrete MATERIALS itemId, given a colour.
const TIER_ITEM = {
  shard: (c) => `${c}_shard`,
  small: (c) => `${c}_crystal_small`,
  big: (c) => `${c}_crystal_big`,
  core: (c) => `${c}_crystal_core`,
};

/**
 * Current reinforcement level for a gear id (0 if never reinforced).
 */
export function getReinforceLevel(hero, gearId) {
  const lvl = hero?.reinforcements?.[gearId];
  return typeof lvl === 'number' && lvl > 0 ? lvl : 0;
}

export function isMaxReinforced(level) {
  return level >= MAX_REINFORCE_LEVEL;
}

/**
 * Material cost map ({ itemId: qty }) to reinforce `gearDef` from its current
 * level to the next one, mapped to the gear's zone colour. Returns null if the
 * piece is already maxed or the gear def is invalid.
 */
export function getReinforceCost(gearDef, currentLevel) {
  if (!gearDef || currentLevel >= MAX_REINFORCE_LEVEL) return null;
  const tiers = COST_CURVE[currentLevel];
  if (!tiers) return null;

  const color = ZONE_COLORS[gearDef.zone] || 'black';
  const cost = {};
  for (const [tier, qty] of Object.entries(tiers)) {
    const itemId = TIER_ITEM[tier](color);
    cost[itemId] = qty;
  }
  return cost;
}
