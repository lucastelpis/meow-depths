/**
 * =============================================================================
 * lootEngine.js — Loot, Drops & Reward Calculations
 * =============================================================================
 *
 * After every fight, the player earns materials, gold, and XP.  This file
 * handles ALL of that reward logic:
 *
 *   calculateDrops()       – Roll for loot from a single defeated enemy.
 *   mergeLoot()            – Combine multiple loot bags into one summary.
 *   calculateEncounterLoot() – One-call convenience: process an entire
 *                              encounter's worth of enemies.
 *
 * WHY SEPARATE FROM combatEngine?
 *   Combat is about dealing damage and applying effects.  Loot is about what
 *   you GET after combat.  Keeping them separate means you can balance
 *   rewards without touching combat math, and vice versa.
 *
 * =============================================================================
 */

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import { FLOOR_MATERIAL_POOLS } from '../data/zones';
import { STAR_MULTIPLIERS } from '../data/enemies';

// ============================================================================
// 1) calculateDrops — roll for loot from one defeated enemy
// ============================================================================
/**
 * Given a defeated enemy, determine what materials they drop, how much gold
 * they're worth, and how much XP the hero gains.
 *
 * HOW IT WORKS:
 *   • Materials — each entry in `enemy.drops` has a `chance` (0.0–1.0).
 *     We roll Math.random() for each; if the roll is below the chance,
 *     the hero gets 1 unit of that material.
 *   • Gold — randomised between min and max for the enemy's tier
 *     (common / elite / boss).
 *   • XP — flat value based on enemy tier.
 *
 * @param {Object} enemy – The defeated enemy (must have `type` and `drops`).
 *
 * @returns {{
 *   materials: { itemId: string, quantity: number }[],
 *   gold: number,
 *   xp: number
 * }}
 */
export function calculateDrops(enemy, zoneId, floorNumber) {
  // -- Resolve allowed material pool for this floor --------------------------
  const pool = zoneId && floorNumber != null
    ? (FLOOR_MATERIAL_POOLS[zoneId] || []).find(entry => floorNumber <= entry.maxFloor)
    : null;
  const allowedSet = pool ? new Set(pool.allowed) : null;

  // -- Roll for material drops ------------------------------------------------
  const materials = [];

  const drops = enemy.drops || [];

  for (const drop of drops) {
    // Skip materials not in this floor's pool (allowedSet null = boss floor, allow all)
    if (allowedSet && !allowedSet.has(drop.itemId)) continue;

    const roll = Math.random();
    if (roll < drop.chance) {
      materials.push({ itemId: drop.itemId, quantity: drop.count || 1 });
    }
  }

  // -- Calculate XP and gold based on star level --------------------------------
  // Bosses use fixed xp / gold defined on their template.
  // Regular monsters scale baseXp and baseGold by the star multiplier.
  let xp, gold;
  if (enemy.isBoss) {
    xp = enemy.xp || 200;
    const goldMin = enemy.goldMin || 80;
    const goldMax = enemy.goldMax || 120;
    gold = randomInRange(goldMin, goldMax);
  } else {
    const starLevel = enemy.stars || 1;
    const mult = STAR_MULTIPLIERS[starLevel] || 1.0;
    xp = Math.floor((enemy.baseXp || 20) * mult);
    gold = Math.floor((enemy.baseGold || 7) * mult);
  }

  return { materials, gold, xp };
}

// ============================================================================
// 2) mergeLoot — combine multiple loot bags into one clean summary
// ============================================================================
/**
 * Takes an array of individual loot results (from `calculateDrops`) and
 * merges them into one combined object.
 *
 * Materials are de-duplicated: if two enemies both drop "crab_shell",
 * the quantities are summed (e.g. 1 + 1 = 2 shells total).
 *
 * @param {{ materials: Object[], gold: number, xp: number }[]} lootArray
 *
 * @returns {{
 *   materials: { [itemId: string]: number },  – e.g. { crab_shell: 2, coral_shard: 1 }
 *   gold: number,
 *   xp: number
 * }}
 */
export function mergeLoot(lootArray) {
  // Start with zeroes for gold and XP, and an empty material bag
  const merged = {
    materials: {},  // will be a map of itemId → total quantity
    gold: 0,
    xp: 0,
  };

  for (const loot of lootArray) {
    // Sum up gold and XP
    merged.gold += loot.gold || 0;
    merged.xp += loot.xp || 0;

    // Merge materials: add quantities for matching itemIds
    for (const mat of (loot.materials || [])) {
      if (merged.materials[mat.itemId]) {
        // Already have this material — add to the running total
        merged.materials[mat.itemId] += mat.quantity;
      } else {
        // First time seeing this material — create the entry
        merged.materials[mat.itemId] = mat.quantity;
      }
    }
  }

  return merged;
}

// ============================================================================
// 3) calculateEncounterLoot — process a full encounter in one call
// ============================================================================
/**
 * Convenience function: given an array of defeated enemies, roll drops for
 * each one and return a single merged loot summary.
 *
 * This is what the combat screen calls after ALL enemies are dead.
 *
 * @param {Object[]} enemies – Array of defeated enemy objects.
 *
 * @returns {{
 *   materials: { [itemId: string]: number },
 *   gold: number,
 *   xp: number
 * }}
 *
 * @example
 *   const loot = calculateEncounterLoot([coralCrab1, coralCrab2]);
 *   // loot = { materials: { crab_shell: 2 }, gold: 22, xp: 40 }
 */
export function calculateEncounterLoot(enemies, zoneId, floorNumber) {
  // Step 1: Roll drops for every enemy individually
  const individualLoot = enemies.map(enemy => calculateDrops(enemy, zoneId, floorNumber));

  // Step 2: Merge all individual results into one bag
  return mergeLoot(individualLoot);
}

// ============================================================================
// Helper functions (private)
// ============================================================================

/**
 * Generate a random integer between `min` and `max` (inclusive).
 *
 * @param {number} min – Lowest possible value.
 * @param {number} max – Highest possible value.
 * @returns {number}
 */
function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
