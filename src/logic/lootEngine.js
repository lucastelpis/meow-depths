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

// Zone → crystal colour. Accepts both the string zoneId ('zone1') and the
// numeric `zone` field carried on enemies (1|2|3).
const ZONE_COLOR = {
  zone1: 'black', zone2: 'green', zone3: 'yellow',
  1: 'black', 2: 'green', 3: 'yellow',
};

function crystalColor(zoneId, enemy) {
  return ZONE_COLOR[zoneId] || ZONE_COLOR[enemy?.zone] || 'black';
}

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
  const materials = [];
  const floor = floorNumber || 1;
  const color = crystalColor(zoneId, enemy);

  // -- Calculate XP and gold based on star level --------------------------------
  // Bosses use fixed xp / gold defined on their template.
  // Regular monsters scale baseXp and baseGold by the star multiplier.
  let xp, gold;
  if (enemy.isBoss) {
    xp = enemy.xp || 200;
    const goldMin = enemy.goldMin || 100;
    const goldMax = enemy.goldMax || 200;
    gold = randomInRange(goldMin, goldMax);
  } else {
    const starLevel = enemy.stars || 1;
    const mult = STAR_MULTIPLIERS[starLevel] || 1.0;
    xp = Math.floor((enemy.baseXp || 1) * mult);
    gold = Math.floor((enemy.baseGold || 1) * mult);
  }

  // -- Crystal drops ------------------------------------------------------------
  // Crystals are the reinforcement (Forge) currency. Colour matches the zone;
  // tier is gated by floor so deeper floors yield rarer crystals.
  if (enemy.isBoss) {
    // The boss is the ONLY source of Crystal Cores — a guaranteed 1, plus a
    // couple of big crystals so the fight feels rewarding. The core gates the
    // +5 reinforcement capstone for that zone's gear.
    materials.push({ itemId: `${color}_crystal_core`, quantity: 1 });
    materials.push({ itemId: `${color}_crystal_big`, quantity: 2 });
  } else {
    // Common enemies faucet the lower tiers.
    // Shard: reliable, scales quantity up on tougher (3★+) foes.
    if (Math.random() < 0.60) {
      let qty = randomInRange(1, 2);
      if ((enemy.stars || 1) >= 3) qty += 1;
      materials.push({ itemId: `${color}_shard`, quantity: qty });
    }
    // Small crystal: chance ramps with floor depth, capped at 35%.
    if (Math.random() < Math.min(0.35, floor * 0.035)) {
      materials.push({ itemId: `${color}_crystal_small`, quantity: 1 });
    }
    // Big crystal: floors 6+ only, chance ramps from the 6th floor, capped 15%.
    if (floor >= 6 && Math.random() < Math.min(0.15, (floor - 5) * 0.03)) {
      materials.push({ itemId: `${color}_crystal_big`, quantity: 1 });
    }
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
  const materials = {};
  const consumables = {};

  const mult = isDouble ? 2 : 1;

  // Gold based on floor level
  let gold = 0;

  if (floorNumber === 1) {
    gold = randomInRange(50, 100);
  } else if (floorNumber === 2) {
    gold = randomInRange(100, 150);
  } else if (floorNumber === 3) {
    gold = randomInRange(150, 200);
  } else if (floorNumber === 4) {
    gold = randomInRange(200, 250);
  } else if (floorNumber === 5) {
    gold = randomInRange(250, 300);
  } else if (floorNumber === 6) {
    gold = randomInRange(300, 400);
  } else if (floorNumber === 7) {
    gold = randomInRange(400, 500);
  } else if (floorNumber === 8) {
    gold = randomInRange(500, 600);
  } else if (floorNumber === 9) {
    gold = randomInRange(600, 700);
  } else { // floor 10
    gold = randomInRange(700, 800);
  }

  gold *= mult;

  // Camp resources (wood/stone/cloth): treasure is a SECONDARY faucet behind the
  // daily quests. ~60% of chests yield 1–2 of a random resource (doubled on a
  // Double Treasure jackpot). Tuned alongside quest rewards so a full day of play
  // (~3–4 expeditions + dailies) tops out near one cheap Camp upgrade. See the
  // Loot Source Doctrine in gamedetails.md.
  const RESOURCE_TYPES = ['wood', 'stone', 'cloth'];
  if (Math.random() < 0.60) {
    const resource = RESOURCE_TYPES[Math.floor(Math.random() * RESOURCE_TYPES.length)];
    materials[resource] = randomInRange(1, 2) * mult;
  }

  // Stamina Potion — rare treasure drop. Chance scales +1% per floor and is
  // capped at 10% (so floors 1→10 range from 1%→10%). A chest never yields more
  // than a single stamina potion — it is deliberately excluded from the Double
  // Treasure multiplier so jackpots can't stack extra charges.
  const staminaChance = Math.min(0.10, floorNumber * 0.01);
  if (Math.random() < staminaChance) {
    consumables.stamina_potion = 1;
  }

  // Potion — medium treasure drop, available on every floor. Chance scales with
  // floor (+2.5% per floor over a 15% base) and is capped at 40%. Grants 1–3.
  const potionChance = Math.min(0.40, 0.15 + floorNumber * 0.025);
  if (Math.random() < potionChance) {
    consumables.potion = randomInRange(1, 3) * mult;
  }

  // Super Potion — small bonus drop on deeper floors (6–10) only. Grants 1–2.
  if (floorNumber >= 6 && Math.random() < 0.12) {
    consumables.super_potion = randomInRange(1, 2) * mult;
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
