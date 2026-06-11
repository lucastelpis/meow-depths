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
import { STAR_MULTIPLIERS } from '../data/enemies';

// ============================================================================
// 1) calculateDrops — roll for loot from one defeated enemy
// ============================================================================
/**
 * Given a defeated enemy, determine what materials they drop, how much gold
 * they're worth, and how much XP the hero gains.
 *
 * HOW IT WORKS:
 *   • Materials — rolled dynamically based on the enemy's star level, profile,
 *     and zone ID (bypassing floor material pools for common monsters).
 *   • Gold — randomised between min and max for the enemy's tier
 *     (common / elite / boss).
 *   • XP — flat value based on enemy tier.
 *
 * @param {Object} enemy – The defeated enemy (must have `id`, `stars`, `isBoss`).
 * @param {string} zoneId – The ID of the current zone.
 * @param {number} floorNumber – The current floor number.
 *
 * @returns {{
 *   materials: { itemId: string, quantity: number }[],
 *   gold: number,
 *   xp: number
 * }}
 */
export function calculateDrops(enemy, zoneId, floorNumber) {
  // -- Resolve crystal prefix based on zoneId or enemy.zone -----------------
  const zoneKey = zoneId || (enemy.zone ? `zone${enemy.zone}` : 'zone1');
  let prefix = 'black';
  if (zoneKey === 'zone2' || zoneKey === 2 || zoneKey === '2') {
    prefix = 'green';
  } else if (zoneKey === 'zone3' || zoneKey === 3 || zoneKey === '3') {
    prefix = 'yellow';
  }

  const materials = [];

  // -- Roll for material drops ------------------------------------------------
  if (enemy.isBoss) {
    // Bosses always drop 3 Big Crystals and 1 Core Crystal
    materials.push({ itemId: `${prefix}_crystal_big`, quantity: 3 });
    materials.push({ itemId: `${prefix}_crystal_core`, quantity: 1 });

    // Plus custom drops defined in the boss template (excluding standard crystals)
    const standardCrystals = new Set([
      `${prefix}_shard`,
      `${prefix}_crystal_small`,
      `${prefix}_crystal_big`,
      `${prefix}_crystal_core`
    ]);

    const drops = enemy.drops || [];
    for (const drop of drops) {
      if (standardCrystals.has(drop.itemId)) continue;

      const roll = Math.random();
      if (roll < drop.chance) {
        materials.push({ itemId: drop.itemId, quantity: drop.count || 1 });
      }
    }
  } else {
    // Common monster drops scale by Star Level, Zone, and Profile
    const starLevel = enemy.stars || 1;
    let qty = 0;

    if (['sewer_rat', 'thorn_sprite', 'barnacle_crab'].includes(enemy.id)) {
      // Rat Profile: quantity = level
      qty = starLevel;
    } else if (['cockroach_knight', 'giant_beetle'].includes(enemy.id)) {
      // Cockroach Profile: quantity = level + 1
      qty = starLevel + 1;
    } else {
      // Frog / Slime Profile: quantity = level + 50% chance of +1
      qty = starLevel + (Math.random() < 0.5 ? 1 : 0);
    }

    const crystalCounts = {};
    for (let i = 0; i < qty; i++) {
      let itemId;
      const roll = Math.random();
      if (starLevel === 1) {
        itemId = `${prefix}_shard`;
      } else if (starLevel === 2) {
        itemId = roll < 0.20 ? `${prefix}_crystal_small` : `${prefix}_shard`;
      } else if (starLevel === 3) {
        itemId = roll < 0.30 ? `${prefix}_crystal_big` : `${prefix}_crystal_small`;
      } else if (starLevel === 4) {
        itemId = `${prefix}_crystal_big`;
      } else {
        // level 5
        itemId = roll < 0.05 ? `${prefix}_crystal_core` : `${prefix}_crystal_big`;
      }
      crystalCounts[itemId] = (crystalCounts[itemId] || 0) + 1;
    }

    for (const [itemId, count] of Object.entries(crystalCounts)) {
      materials.push({ itemId, quantity: count });
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
// 4) generateTreasureDrops — roll treasure drops for chests/gambles
// ============================================================================
/**
 * Roll treasure chest drops based on floor level and zone.
 *
 * @param {string} zoneId – The ID of the current zone.
 * @param {number} floorNumber – The current floor number.
 * @param {boolean} isDouble – Whether quantities should be doubled.
 *
 * @returns {{
 *   gold: number,
 *   materials: { [itemId: string]: number },
 *   consumables: { [itemId: string]: number }
 * }}
 */
export function generateTreasureDrops(zoneId, floorNumber, isDouble = false) {
  let prefix = 'black';
  if (zoneId === 'zone2') prefix = 'green';
  else if (zoneId === 'zone3') prefix = 'yellow';

  const materials = {};
  const consumables = {};

  const mult = isDouble ? 2 : 1;

  // 1. Materials based on floor level
  let shardCount = 0;
  let smallCount = 0;
  let bigCount = 0;
  let coreCount = 0;

  if (floorNumber === 1) {
    shardCount = randomInRange(1, 5) * mult;
  } else if (floorNumber === 2) {
    shardCount = randomInRange(5, 10) * mult;
    smallCount = randomInRange(1, 2) * mult;
  } else if (floorNumber === 3) {
    shardCount = randomInRange(10, 15) * mult;
    smallCount = randomInRange(3, 5) * mult;
  } else if (floorNumber === 4) {
    smallCount = randomInRange(5, 10) * mult;
  } else if (floorNumber === 5) {
    smallCount = randomInRange(10, 15) * mult;
    bigCount = randomInRange(1, 2) * mult;
  } else if (floorNumber === 6) {
    smallCount = randomInRange(15, 20) * mult;
    bigCount = randomInRange(3, 5) * mult;
  } else if (floorNumber === 7) {
    bigCount = randomInRange(5, 8) * mult;
  } else if (floorNumber === 8) {
    bigCount = randomInRange(9, 12) * mult;
  } else if (floorNumber === 9) {
    bigCount = randomInRange(12, 15) * mult;
  } else { // floor 10
    bigCount = randomInRange(15, 20) * mult;
    coreCount = randomInRange(0, 1) * mult;
  }

  if (shardCount > 0) materials[`${prefix}_shard`] = shardCount;
  if (smallCount > 0) materials[`${prefix}_crystal_small`] = smallCount;
  if (bigCount > 0) materials[`${prefix}_crystal_big`] = bigCount;
  if (coreCount > 0) materials[`${prefix}_crystal_core`] = coreCount;

  // 2. Gold & potions based on floor level
  let gold = 0;
  let potionType = 'potion';
  let potionCount = 0;

  if (floorNumber === 1) {
    gold = randomInRange(50, 100);
    potionType = 'potion';
    potionCount = 1;
  } else if (floorNumber === 2) {
    gold = randomInRange(100, 150);
    potionType = 'potion';
    potionCount = randomInRange(1, 2);
  } else if (floorNumber === 3) {
    gold = randomInRange(150, 200);
    potionType = 'potion';
    potionCount = randomInRange(2, 3);
  } else if (floorNumber === 4) {
    gold = randomInRange(200, 250);
    potionType = 'potion';
    potionCount = randomInRange(3, 4);
  } else if (floorNumber === 5) {
    gold = randomInRange(250, 300);
    potionType = 'potion';
    potionCount = randomInRange(4, 5);
  } else if (floorNumber === 6) {
    gold = randomInRange(300, 400);
    potionType = 'super_potion';
    potionCount = randomInRange(1, 2);
  } else if (floorNumber === 7) {
    gold = randomInRange(400, 500);
    potionType = 'super_potion';
    potionCount = randomInRange(2, 3);
  } else if (floorNumber === 8) {
    gold = randomInRange(500, 600);
    potionType = 'super_potion';
    potionCount = randomInRange(3, 4);
  } else if (floorNumber === 9) {
    gold = randomInRange(600, 700);
    potionType = 'super_potion';
    potionCount = randomInRange(4, 5);
  } else { // floor 10
    gold = randomInRange(700, 800);
    potionType = 'ultra_potion';
    potionCount = randomInRange(1, 2);
  }

  gold *= mult;
  potionCount *= mult;

  if (potionCount > 0) {
    consumables[potionType] = potionCount;
  }

  return { gold, materials, consumables };
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
