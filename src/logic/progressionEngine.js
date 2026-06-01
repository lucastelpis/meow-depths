/**
 * =============================================================================
 * progressionEngine.js — Leveling, Stats & Skill Progression
 * =============================================================================
 *
 * Everything about the hero getting STRONGER lives here:
 *
 *   getXpForLevel()          – How much total XP is needed to reach level N.
 *   checkLevelUp()           – Has the hero earned enough XP to level up?
 *   calculateEffectiveStats() – What are the hero's REAL stats after adding
 *                               gear, passives, and set bonuses?
 *   canUnlockSkill()         – Is the hero allowed to learn a new skill?
 *   getActiveSetBonuses()    – Which gear set bonuses are currently active?
 *
 * WHY SEPARATE FROM gameState?
 *   gameState holds the raw data (level, XP, gear ids).
 *   progressionEngine holds the RULES for how that data changes.
 *   This separation keeps gameState clean (it's just storage + dispatch),
 *   and makes it easy to unit-test progression formulas in isolation.
 *
 * =============================================================================
 */

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import SKILLS from '../data/skills';
import { GEAR, SET_BONUSES } from '../data/gear';

// ============================================================================
// 1) getXpForLevel — XP curve / thresholds
// ============================================================================
/**
 * Calculate the TOTAL XP needed to reach a given level.
 *
 * The curve:
 *   Level 1 → 0 XP       (everyone starts here)
 *   Level 2 → 100 XP
 *   Level 3 → 250 XP
 *   Level 4 → 450 XP     (250 + 200)
 *   Level 5 → 650 XP     (450 + 200)
 *   Level N → 250 + (N - 3) * 200   for N ≥ 4
 *
 * This gives a gentle early curve that becomes linear at higher levels.
 *
 * @param {number} level – The target level (must be ≥ 1).
 * @returns {number} Total XP required to be that level.
 */
export function getXpForLevel(level) {
  if (level <= 1) return 0;      // Level 1 is free
  if (level === 2) return 100;   // First level-up
  if (level === 3) return 250;   // Second level-up

  // From level 4 onward: 250 + (level - 3) * 200
  // This means each level after 3 costs an additional 200 XP.
  return 250 + (level - 3) * 200;
}

// ============================================================================
// 2) checkLevelUp — detect and apply pending level-ups
// ============================================================================
/**
 * Check whether the hero has earned enough XP to level up.
 *
 * Because the hero might earn a LOT of XP at once (e.g. defeating a boss),
 * this function handles MULTIPLE level-ups in a single call.
 *
 * Each level-up grants:
 *   +8  Max HP
 *   +2  Attack
 *   +1  Defence
 *   +1  Skill Point
 *
 * @param {Object} hero – The hero object from game state.
 *   Must have: { level, xp, maxHp, attack, defence, skillPoints }
 *
 * @returns {{
 *   levelsGained: number,
 *   newLevel: number,
 *   newMaxHp: number,
 *   newAttack: number,
 *   newDefence: number,
 *   newSkillPoints: number,
 *   messages: string[]    – e.g. ["Level up! You are now level 3!"]
 * }}
 */
export function checkLevelUp(hero) {
  // We'll track how many levels were gained and build log messages
  let levelsGained  = 0;
  let currentLevel  = hero.level;
  let currentMaxHp  = hero.maxHp;
  let currentAttack = hero.attack;
  let currentDef    = hero.defence;
  let currentSP     = hero.skillPoints;
  const messages    = [];

  // Keep leveling up as long as XP exceeds the next level's threshold
  while (hero.xp >= getXpForLevel(currentLevel + 1)) {
    currentLevel  += 1;
    currentMaxHp  += 8;   // +8 HP per level
    currentAttack += 2;   // +2 Attack per level
    currentDef    += 1;   // +1 Defence per level
    currentSP     += 1;   // +1 Skill Point per level
    levelsGained  += 1;

    messages.push(`🎉 Level up! Mochi is now level ${currentLevel}!`);
  }

  return {
    levelsGained,
    newLevel:       currentLevel,
    newMaxHp:       currentMaxHp,
    newAttack:      currentAttack,
    newDefence:     currentDef,
    newSkillPoints: currentSP,
    messages,
  };
}

// ============================================================================
// 3) calculateEffectiveStats — the hero's TRUE power
// ============================================================================
/**
 * Combine the hero's BASE stats with bonuses from:
 *   1. Equipped gear          (weapon, armor, trinket)
 *   2. Unlocked passive skills (Critical Eye, Iron Fur, Quick Paws, etc.)
 *   3. Active set bonuses      (equipping all pieces of a set)
 *
 * The UI should call this whenever gear or skills change and display
 * the returned object instead of raw hero.attack, hero.defence, etc.
 *
 * @param {Object} hero   – The hero object from game state.
 *   Must have: { attack, defence, maxHp, critChance, dodge, gear, unlockedSkills }
 * @param {Object} [skillDefinitions=SKILLS] – Skill data (defaults to imported SKILLS).
 *
 * @returns {{
 *   maxHp: number,
 *   attack: number,
 *   defence: number,
 *   critChance: number,
 *   dodge: number,
 *   gearSpecials: string[],    – e.g. ['bleed_on_hit']
 *   passives: Object           – aggregated passive bonuses
 * }}
 */
export function calculateEffectiveStats(hero, skillDefinitions = SKILLS, runBuffs = null) {
  // --- Start from the hero's base stats ------------------------------------
  let maxHp     = hero.maxHp      || 50;
  let attack    = hero.attack     || 10;
  let defence   = hero.defence    || 2;
  let critChance = hero.critChance || 0.05;
  let dodge     = hero.dodge      || 0.05;
  const gearSpecials = [];
  const passives = {};

  // --- 1. Gear bonuses -----------------------------------------------------
  // hero.gear looks like: { weapon: 'coral_blade', armor: null, trinket: null }
  const gearSlots = ['weapon', 'armor', 'trinket'];

  for (const slot of gearSlots) {
    const gearId = hero.gear?.[slot];
    if (!gearId) continue; // nothing equipped in this slot

    const gearDef = GEAR[gearId];
    if (!gearDef) continue; // safety check — gear id not found in data

    // Add each stat from the gear piece
    if (gearDef.stats.attack)     attack     += gearDef.stats.attack;
    if (gearDef.stats.defence)    defence    += gearDef.stats.defence;
    if (gearDef.stats.maxHp)      maxHp      += gearDef.stats.maxHp;
    if (gearDef.stats.critChance) critChance += gearDef.stats.critChance;
    if (gearDef.stats.dodge)      dodge      += gearDef.stats.dodge;

    // Track special gear effects (e.g. "bleed_on_hit")
    if (gearDef.special) {
      gearSpecials.push(gearDef.special);
    }

    // Gear bleed chance (e.g. Sewer Shiv's bleedChance: 0.15) feeds into
    // the same bleedOnHitChance passive slot so combatEngine picks it up.
    if (gearDef.stats.bleedChance) {
      passives.bleedOnHitChance = (passives.bleedOnHitChance || 0) + gearDef.stats.bleedChance;
      if (!passives.bleedDamage)   passives.bleedDamage   = 3;
      if (!passives.bleedDuration) passives.bleedDuration = 3;
    }

    // Gear stun chance (e.g. Ghost Cutlass's stunChance: 0.12)
    if (gearDef.stats.stunChance) {
      gearSpecials.push('stun_on_hit');
    }
  }

  // --- 2. Passive skill bonuses --------------------------------------------
  // hero.unlockedSkills is an array of skill IDs the hero has learned.
  const unlockedSkills = hero.unlockedSkills || [];

  for (const skillId of unlockedSkills) {
    const skillDef = skillDefinitions[skillId];
    if (!skillDef || skillDef.type !== 'passive') continue;

    const eff = skillDef.effect || {};

    // Handle single stat boosts (e.g. steady_paws: +10% crit)
    if (eff.type === 'stat_boost') {
      if (eff.stat === 'critChance') critChance += eff.value;
      if (eff.stat === 'dodge')      dodge      += eff.value;
      if (eff.stat === 'attack')     attack     += eff.value;
      if (eff.stat === 'defence')    defence    += eff.value;
      if (eff.stat === 'maxHp')      maxHp      += eff.value;
    }

    // Handle multi-stat boosts (e.g. iron_hide: +30 HP, +5 defence)
    if (eff.type === 'multi_stat_boost' && eff.boosts) {
      for (const boost of eff.boosts) {
        if (boost.stat === 'maxHp')      maxHp      += boost.value;
        if (boost.stat === 'attack')     attack     += boost.value;
        if (boost.stat === 'defence')    defence    += boost.value;
        if (boost.stat === 'critChance') critChance += boost.value;
        if (boost.stat === 'dodge')      dodge      += boost.value;
      }
    }

    // Handle bleed-on-hit passives (e.g. serrated_claws)
    if (eff.type === 'bleed_on_hit') {
      passives.bleedOnHitChance = (passives.bleedOnHitChance || 0) + eff.chance;
      passives.bleedDamage      = eff.damage   || 3;
      passives.bleedDuration    = eff.duration  || 3;
    }

    // Handle flat damage reduction (thick_fur)
    if (eff.type === 'flat_damage_reduction') {
      passives.flatDamageReduction = (passives.flatDamageReduction || 0) + eff.value;
    }

    // Handle cooldown reduction (sharp_mind)
    if (eff.type === 'cooldown_reduction') {
      passives.cooldownReduction = (passives.cooldownReduction || 0) + eff.value;
    }

    // Handle bleed boost (toxic_claws)
    if (eff.type === 'bleed_boost') {
      passives.bleedExtraDamage = (passives.bleedExtraDamage || 0) + eff.extraDamage;
    }

    // Handle dodge-crit (phantom_step)
    if (eff.type === 'dodge_crit') {
      passives.dodgeCrit = true;
    }
  }

  // --- 3. Set bonuses ------------------------------------------------------
  const activeSets = getActiveSetBonuses(hero.gear);

  for (const setBonus of activeSets) {
    const bonus = setBonus.bonus || {};
    if (bonus.attack)     attack     += bonus.attack;
    if (bonus.defence)    defence    += bonus.defence;
    if (bonus.maxHp)      maxHp      += bonus.maxHp;
    if (bonus.critChance) critChance += bonus.critChance;
    if (bonus.dodge)      dodge      += bonus.dodge;
  }

  // --- 4. Run-only buffs (applied on top) ----------------------------------
  // Tracked in currentRun.runBuffs and cleared when run ends
  if (runBuffs) {
    if (runBuffs.attackBonus)  attack     += runBuffs.attackBonus;
    if (runBuffs.defenceBonus) defence    += runBuffs.defenceBonus;
    if (runBuffs.maxHpBonus)   maxHp      += runBuffs.maxHpBonus;
    if (runBuffs.critBonus)    critChance += runBuffs.critBonus;
    if (runBuffs.dodgeBonus)   dodge      += runBuffs.dodgeBonus;
  }

  return {
    maxHp,
    attack,
    defence,
    critChance,
    dodge,
    gearSpecials,
    passives,
  };
}

// ============================================================================
// 4) canUnlockSkill — check prerequisites and points
// ============================================================================
/**
 * Determine whether a skill is available for the hero to learn.
 *
 * Checks:
 *   1. Does the hero have the prerequisite skill unlocked?
 *   2. Does the hero have enough skill points?
 *   3. Is the skill already unlocked? (can't buy it twice)
 *
 * @param {string}   skillId        – The skill to check.
 * @param {string[]} unlockedSkills – IDs of skills the hero already has.
 * @param {number}   skillPoints    – How many unspent skill points the hero has.
 * @param {Object}   [allSkills=SKILLS] – Full skill definitions.
 *
 * @returns {{ canUnlock: boolean, reason: string }}
 */
export function canUnlockSkill(skillId, unlockedSkills, skillPoints, allSkills = SKILLS) {
  const skill = allSkills[skillId];

  // --- Does the skill even exist? ------------------------------------------
  if (!skill) {
    return { canUnlock: false, reason: 'Skill not found.' };
  }

  // --- Already unlocked? ---------------------------------------------------
  if (unlockedSkills.includes(skillId)) {
    return { canUnlock: false, reason: 'Skill already unlocked.' };
  }

  // --- Prerequisite check --------------------------------------------------
  // If the skill requires another skill first, make sure that's unlocked.
  if (skill.requires && !unlockedSkills.includes(skill.requires)) {
    const prereqName = allSkills[skill.requires]?.name || skill.requires;
    return {
      canUnlock: false,
      reason: `Requires "${prereqName}" to be unlocked first.`,
    };
  }

  // --- Branch exclusivity check --------------------------------------------
  // For tier 3-4, selecting one branch locks out the other in the same tier/path
  if (skill.branch) {
    const otherBranch = skill.branch === 'a' ? 'b' : 'a';
    const conflicting = Object.values(allSkills).find(
      s => s.path === skill.path && s.tier === skill.tier && s.branch === otherBranch
    );
    if (conflicting && unlockedSkills.includes(conflicting.id)) {
      return {
        canUnlock: false,
        reason: `Already chose "${conflicting.name}" in this tier.`,
      };
    }
  }

  // --- Enough skill points? (each skill costs 1 point) ---------------------
  if (skillPoints < 1) {
    return {
      canUnlock: false,
      reason: `Not enough skill points (need 1, have ${skillPoints}).`,
    };
  }

  // --- All checks passed! --------------------------------------------------
  return { canUnlock: true, reason: 'Ready to unlock!' };
}

// ============================================================================
// 5) getActiveSetBonuses — which gear sets are fully equipped?
// ============================================================================
/**
 * Check the hero's equipped gear and return an array of set bonuses that
 * are currently active (i.e. all pieces of the set are equipped).
 *
 * @param {Object} gear – The hero's gear object: { weapon, armor, trinket }
 *                        where each value is a gear id string or null.
 *
 * @returns {Object[]} Array of active set bonus objects from SET_BONUSES.
 *
 * @example
 *   getActiveSetBonuses({ weapon: 'coral_blade', armor: 'coral_mail', trinket: 'coral_charm' })
 *   // → [{ id: 'coral_set', name: 'Coral Set', bonus: { attack: 2, defence: 1 }, ... }]
 */
export function getActiveSetBonuses(gear) {
  if (!gear) return [];

  const activeBonuses = [];

  // Collect all equipped gear ids into a flat array for easy checking
  const equippedIds = [gear.weapon, gear.armor, gear.trinket].filter(Boolean);

  // Check each set bonus definition
  for (const setId of Object.keys(SET_BONUSES)) {
    const setDef = SET_BONUSES[setId];

    // Check that ALL named pieces (weapon + trinket) are equipped
    const hasAllPieces = setDef.pieces.every(pieceId =>
      equippedIds.includes(pieceId)
    );

    // Also require an armor from the matching zone
    const armorId = gear.armor;
    const armorDef = armorId ? GEAR[armorId] : null;
    const hasMatchingArmor = armorDef && armorDef.zone === setDef.armorZone;

    // Full set bonus requires all named pieces + a matching-zone armor
    if (hasAllPieces && hasMatchingArmor) {
      activeBonuses.push(setDef);
    }
  }

  return activeBonuses;
}
