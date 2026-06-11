/**
 * =============================================================================
 * combatEngine.js — The Core Combat System for Meow Depths
 * =============================================================================
 *
 * This is the MOST IMPORTANT file in the game.  Every fight — every scratch,
 * every dodge, every boss slam — flows through the functions exported here.
 *
 * HOW COMBAT WORKS (high-level):
 * 1. The player picks an action: Attack, use a Skill, use a Consumable, or Guard.
 * 2. `executeAttack` or `executeSkill` is called for the hero's turn.
 * 3. Each surviving enemy then takes a turn via `executeEnemyTurn`.
 * 4. After everyone has acted, `processStatusEffects` ticks down bleeds, stuns,
 *    guards, and death marks on both sides.
 * 5. Repeat until all enemies are dead or the hero falls.
 *
 * TERMINOLOGY:
 *   attacker     – the entity dealing damage (hero or enemy)
 *   target       – the entity receiving damage
 *   attackerState / targetState – in-combat state objects that track
 *                  current HP, active status effects, cooldowns, etc.
 *   isCrit       – whether the hit was a critical strike (150 % damage)
 *   isDodged     – whether the target dodged the attack entirely
 *   bleed        – damage-over-time effect (ticks each turn)
 *   stun         – skips the target's next turn(s)
 *   guard        – damage-reduction shield (percentage based)
 *   deathMark    – target takes 50 % extra damage from ALL sources
 *   stealth      – hero's next attack is a guaranteed crit with bonus damage
 *   counter      – hero automatically retaliates when hit
 *
 * =============================================================================
 */

// ---------------------------------------------------------------------------
// Imports — we pull enemy data and zone info from our data layer.
// ---------------------------------------------------------------------------
import { ZONES } from '../data/zones';
import { ENEMIES, STAR_MULTIPLIERS } from '../data/enemies';
import { applyHealingEfficiency } from './progressionEngine';

// ---------------------------------------------------------------------------
// CONSTANTS — tweak these to balance the game
// ---------------------------------------------------------------------------

/** Crits multiply the final damage by this value. */
const CRIT_MULTIPLIER = 1.5;

/** When attacking from stealth, add this % as bonus damage on top of the crit. */
const STEALTH_BONUS_DAMAGE = 0.5;

/** Gear-based bleed: damage per tick and number of ticks. */
const GEAR_BLEED_DAMAGE   = 3;
const GEAR_BLEED_DURATION  = 3;

/** Gear-based stun: chance to proc (0.0 – 1.0) and duration in turns. */
const GEAR_STUN_CHANCE   = 0.15;
const GEAR_STUN_DURATION = 1;

// ============================================================================
// 1) calculateDamage — the heart of every damage number you see on screen
// ============================================================================
/**
 * Calculate the final damage dealt by an attacker to a target.
 *
 * Steps:
 *   1. Start with the attacker's base attack stat.
 *   2. Roll for a crit — if successful, multiply by CRIT_MULTIPLIER (150 %).
 *   3. Apply target's defence (diminishing returns percentage, minimum damage is 1).
 *   4. If the target is guarding, reduce damage by the guard's reduction %.
 *   5. If the target has a death mark, INCREASE damage by 50 %.
 *
 * @param {Object} attacker     – Entity doing the damage ({ attack, critChance })
 * @param {Object} target       – Entity receiving damage ({ defence })
 * @param {Object} [options={}] – Extra flags:
 *        options.forceCrit      – skip the random roll; always crit
 *        options.multiplier     – skill damage multiplier (e.g. 1.6 for 160 %)
 *        options.guardAmount    – how much guard reduction is active (0.0 – 1.0)
 *        options.hasDeathMark   – boolean, is the target death-marked?
 *        options.stealthBonus   – extra % damage from stealth
 *
 * @returns {{ damage: number, isCrit: boolean, isDodged: boolean }}
 */
export function calculateDamage(attacker, target, options = {}) {
  // -- Step 1: Base damage starts from the attacker's attack stat -----------
  let baseDamage = attacker.attack;

  // Apply atk_reduce debuff on attacker
  const atkReduce = attacker.effects?.find(e => e.type === 'atk_reduce');
  if (atkReduce && atkReduce.value) {
    baseDamage = baseDamage * (1 - atkReduce.value);
  }

  // If a skill multiplier was provided (e.g. 1.6× for Power Slash), apply it
  if (options.multiplier) {
    baseDamage = Math.floor(baseDamage * options.multiplier);
  } else {
    baseDamage = Math.floor(baseDamage);
  }

  // -- Step 2: Critical hit check ------------------------------------------
  // A crit happens if we roll below the attacker's critChance, or if we
  // explicitly force a crit (e.g. attacking from stealth).
  const critRoll = Math.random();                       // 0.0 – 1.0
  let critChance = attacker.critChance || 0.05;       // default 5 %

  // Apply crit_reduce debuff on attacker
  const critReduce = attacker.effects?.find(e => e.type === 'crit_reduce');
  if (critReduce && critReduce.value) {
    critChance = Math.max(0, critChance - critReduce.value);
  }

  // Per-hit bonus crit (Dual Slash, Whirlwind)
  if (options.critBonus) {
    critChance = Math.min(1, critChance + options.critBonus);
  }

  const isCrit = options.forceCrit || critRoll < critChance;

  if (isCrit) {
    // Critical Wind passive overrides CRIT_MULTIPLIER; options.critMultiplier takes highest priority
    const critMult = options.critMultiplier || attacker.passives?.critMultiplier || CRIT_MULTIPLIER;
    baseDamage = Math.floor(baseDamage * critMult);
  }

  // -- Step 2b: Stealth bonus -----------------------------------------------
  // If the attacker was in stealth, they get extra damage on top of the crit.
  if (options.stealthBonus) {
    baseDamage = Math.floor(baseDamage * (1 + options.stealthBonus));
  }

  // -- Step 3: Apply target's defence (diminishing returns percentage) ------
  // Defence reduces damage on a diminishing returns curve, minimum damage is 1.
  let defVal = target.defence || target.def || 0;
  const defBuff = target.effects?.find(e => e.type === 'def_buff');
  if (defBuff && defBuff.value) {
    defVal += defBuff.value;
  }
  const effectiveDef = Math.max(0, defVal - 1); // DEF 1 = 0% reduction baseline
  const reduction = effectiveDef / (effectiveDef + 15);
  let finalDamage = Math.max(1, Math.floor(baseDamage * (1 - reduction)));

  // -- Step 4: Guard reduction ----------------------------------------------
  // If the target is currently guarding, reduce damage by the guard %.
  // Example: guardAmount = 0.5 means 50 % damage reduction.
  if (options.guardAmount && options.guardAmount > 0) {
    finalDamage = Math.max(1, Math.floor(finalDamage * (1 - options.guardAmount)));
  }

  // -- Step 5: Death mark bonus ---------------------------------------------
  // A death-marked target takes 50 % MORE damage from everything.
  if (options.hasDeathMark) {
    finalDamage = Math.floor(finalDamage * 1.5);
  }

  // Round down to a whole number (no fractional HP in this game!)
  finalDamage = Math.floor(finalDamage);

  return {
    damage: finalDamage,
    isCrit,
    isDodged: false, // Dodge is checked separately via checkDodge()
  };
}

// ============================================================================
// 2) checkDodge — did the target side-step the attack?
// ============================================================================
/**
 * Roll against the target's dodge chance to see if the attack misses entirely.
 *
 * @param {Object} target – Entity being attacked. Must have a `dodge` property
 *                          ranging from 0.0 (never dodges) to 1.0 (always dodges).
 *
 * @returns {boolean} true if the attack was dodged (missed).
 */
export function checkDodge(target) {
  const dodgeChance = target.dodge || 0;
  return Math.random() < dodgeChance;
}

// ============================================================================
// 3) checkHeroDodge — convenience wrapper for the hero entity
// ============================================================================
/**
 * Identical to `checkDodge`, but takes the hero's combat state object
 * (which stores effective stats including gear/passive dodge bonuses).
 *
 * @param {Object} heroState – Hero's in-combat state ({ dodge })
 * @returns {boolean}
 */
export function checkHeroDodge(heroState) {
  let dodgeChance = heroState.dodge || 0;
  const dodgeReduce = heroState.effects?.find(e => e.type === 'dodge_reduce');
  if (dodgeReduce && dodgeReduce.value) {
    dodgeChance = Math.max(0, dodgeChance - dodgeReduce.value);
  }
  return Math.random() < dodgeChance;
}

// ============================================================================
// 4) executeAttack — the hero swings their weapon (basic attack)
// ============================================================================
/**
 * Execute a basic melee attack from the attacker to the target.
 *
 * This function orchestrates several sub-checks:
 *   • Stealth: If the attacker is stealthed, the attack is a guaranteed crit
 *     with bonus damage. Stealth is then consumed.
 *   • Dodge: The target gets a chance to dodge.
 *   • Damage: Calculated via `calculateDamage`.
 *   • Bleed-on-hit: Some gear / passives give a chance to apply a bleed.
 *   • Stun-on-hit: Some gear gives a chance to stun the target.
 *
 * @param {Object} attacker      – The attacking entity's stats.
 * @param {Object} target        – The defending entity's stats.
 * @param {Object} attackerState – The attacker's in-combat state (tracks stealth,
 *                                 active effects, gear specials, etc.).
 *
 * @returns {{
 *   damage: number,
 *   isCrit: boolean,
 *   isDodged: boolean,
 *   bleedApplied: boolean,
 *   stunApplied: boolean,
 *   log: string
 * }}
 */
export function executeAttack(attacker, target, attackerState) {
  // --- Build a human-readable log string for the combat feed ---------------
  const attackerName = attacker.name || 'Hero';
  const targetName   = target.name   || 'Enemy';

  // --- Dodge check ---------------------------------------------------------
  const isDodged = checkDodge(target);
  if (isDodged) {
    return {
      damage: 0,
      isCrit: false,
      isDodged: true,
      bleedApplied: false,
      stunApplied: false,
      log: `${targetName} dodged ${attackerName}'s attack!`,
    };
  }

  // --- Stealth check -------------------------------------------------------
  // If the attacker is stealthed, force a crit and add stealth bonus damage.
  const isStealth = attackerState.effects?.some(e => e.type === 'stealth');
  const damageOptions = {};

  if (isStealth) {
    damageOptions.forceCrit = true;
    damageOptions.stealthBonus = STEALTH_BONUS_DAMAGE;
  }

  // Check for guard and death mark on the target (stored in target.effects)
  const targetGuard = target.effects?.find(e => e.type === 'guard');
  if (targetGuard) {
    damageOptions.guardAmount = targetGuard.reduction || 0;
  }

  const targetDeathMark = target.effects?.find(e => e.type === 'deathMark');
  if (targetDeathMark) {
    damageOptions.hasDeathMark = true;
  }

  // --- Calculate damage ----------------------------------------------------
  const result = calculateDamage(attacker, target, damageOptions);

  // --- Remove stealth after attacking (it's a one-use buff) ----------------
  if (isStealth && attackerState.effects) {
    attackerState.effects = attackerState.effects.filter(e => e.type !== 'stealth');
  }

  // --- Bleed-on-hit from passives or gear ----------------------------------
  let bleedApplied = false;

  // Check passive bleed (e.g. "Venomous Claws" skill)
  if (attackerState.passives?.bleedOnHitChance) {
    if (Math.random() < attackerState.passives.bleedOnHitChance) {
      bleedApplied = true;
    }
  }

  // Check gear-based bleed (weapon with "bleed_on_hit" special)
  if (!bleedApplied && attackerState.gearSpecials?.includes('bleed_on_hit')) {
    // Gear bleed has a flat 25 % chance
    if (Math.random() < 0.25) {
      bleedApplied = true;
    }
  }

  // --- Stun-on-hit from gear -----------------------------------------------
  let stunApplied = false;
  if (attackerState.gearSpecials?.includes('stun_on_hit')) {
    if (Math.random() < GEAR_STUN_CHANCE) {
      stunApplied = true;
    }
  }

  // --- Build combat log ----------------------------------------------------
  let log = `${attackerName} attacks ${targetName} for ${result.damage} damage`;
  if (result.isCrit) log += ' (CRIT!)';
  if (isStealth)     log += ' from stealth';
  if (bleedApplied)  log += ' — applied Bleed!';
  if (stunApplied)   log += ' — applied Stun!';
  log += '.';

  return {
    damage: result.damage,
    isCrit: result.isCrit,
    isDodged: false,
    bleedApplied,
    stunApplied,
    log,
  };
}

// ============================================================================
// 5) executeSkill — the hero uses a special ability
// ============================================================================
/**
 * Execute a skill from the hero's equipped skill list.
 *
 * Skills come in several types, and each is handled differently:
 *   • damage      – Deal multiplied damage to one target (or AoE).
 *   • heal        – Restore a percentage of the hero's max HP.
 *   • guard       – Enter a defensive stance that reduces incoming damage.
 *   • stealth     – Go invisible; next basic attack is a guaranteed crit.
 *   • counter     – Prepare to counter the next incoming attack automatically.
 *   • death_mark  – Mark a target so it takes 50 % extra damage for N turns.
 *   • damage_stun – Deal damage AND stun the target for N turns.
 *
 * @param {Object}   skill         – The skill definition from data/skills.js.
 * @param {Object}   attacker      – The hero's stats.
 * @param {Object[]} targets       – Array of targets (enemies). For single-
 *                                   target skills, targets[0] is used.
 * @param {Object}   attackerState – Hero's in-combat state.
 *
 * @returns {{ results: Object[], log: string }}
 *   results is an array of per-target outcome objects.
 */
export function executeSkill(skill, attacker, targets, attackerState) {
  const results = [];
  let log = '';

  // skill.type is 'active' or 'passive'; the behavioral type lives in skill.effect.type
  switch (skill.effect?.type) {
    // -----------------------------------------------------------------------
    // DAMAGE — straightforward damage skill, possibly AoE
    // -----------------------------------------------------------------------
    case 'damage': {
      let currentMultiplier = skill.effect.multiplier || 1.0;
      const falloff = skill.effect.damageFalloff || 1.0;
      const secondaryMult = skill.effect.secondaryMultiplier || 1.0;

      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        if (!target) continue;
        const isPrimary = (i === 0);

        let activeMultiplier = currentMultiplier;
        if (!isPrimary) {
          activeMultiplier = activeMultiplier * secondaryMult;
        }

        // Check dodge first
        const isDodged = checkDodge(target);
        if (isDodged) {
          results.push({ target: target.uid || target.id, damage: 0, isDodged: true });
          log += `${target.name} dodged ${skill.name}! `;
          continue;
        }

        // Calculate damage with the skill's multiplier
        const dmgResult = calculateDamage(attacker, target, {
          multiplier: activeMultiplier,
          hasDeathMark: target.effects?.some(e => e.type === 'deathMark') || false,
        });

        results.push({
          target: target.uid || target.id,
          damage: dmgResult.damage,
          isCrit: dmgResult.isCrit,
          isDodged: false,
        });

        log += `${skill.name} hits ${target.name} for ${dmgResult.damage}`;
        if (dmgResult.isCrit) log += ' (CRIT!)';
        log += '. ';

        currentMultiplier = currentMultiplier * falloff;
      }
      break;
    }

    // -----------------------------------------------------------------------
    // HEAL — restore HP based on a percentage of max HP
    // -----------------------------------------------------------------------
    case 'heal': {
      const healPercent = skill.effect.percentMaxHp || 0.3;
      const rawHeal = Math.floor(attacker.maxHp * healPercent);
      const healAmount = applyHealingEfficiency(rawHeal, attackerState);

      results.push({
        healAmount,
        type: 'heal',
      });

      log = `${attacker.name || 'Mochi'} uses ${skill.name} and heals ${healAmount} HP!`;
      break;
    }

    // -----------------------------------------------------------------------
    // GUARD — enter a defensive stance
    // -----------------------------------------------------------------------
    case 'guard': {
      // Add a guard effect to the attacker's combat state
      const guardEffect = {
        type: 'guard',
        reduction: skill.effect.reduction || 0.5,     // 50 % damage reduction
        duration: skill.effect.duration   || 2,        // lasts 2 turns
      };

      results.push({
        type: 'guard',
        effect: guardEffect,
      });

      log = `${attacker.name || 'Mochi'} raises Guard! (${Math.round(guardEffect.reduction * 100)}% reduction for ${guardEffect.duration} turns)`;
      break;
    }

    // -----------------------------------------------------------------------
    // STEALTH — become invisible for boosted next attack
    // -----------------------------------------------------------------------
    case 'stealth': {
      const stealthEffect = {
        type: 'stealth',
        bonusDamage: skill.effect.bonusDamage || STEALTH_BONUS_DAMAGE,
        duration: skill.effect.duration || 1,
      };

      results.push({
        type: 'stealth',
        effect: stealthEffect,
      });

      log = `${attacker.name || 'Mochi'} vanishes into the shadows!`;
      break;
    }

    // -----------------------------------------------------------------------
    // COUNTER — auto-retaliate when hit
    // -----------------------------------------------------------------------
    case 'counter': {
      const counterEffect = {
        type: 'counter',
        multiplier: skill.effect.multiplier || 1.3,
        duration: skill.effect.duration || 1,
      };

      results.push({
        type: 'counter',
        effect: counterEffect,
      });

      log = `${attacker.name || 'Mochi'} enters Counter Stance! (${Math.round(counterEffect.multiplier * 100)}% counter damage)`;
      break;
    }

    // -----------------------------------------------------------------------
    // DEATH MARK — target takes 50 % extra damage for N turns
    // -----------------------------------------------------------------------
    case 'death_mark': {
      const markDuration = skill.effect.duration || 3;
      const bonus = skill.effect.damageBonus || 0.5;
      const targetNames = targets.filter(Boolean).map(t => t.name).join(', ');

      for (const target of targets) {
        if (!target) continue;
        const deathMarkEffect = {
          type: 'deathMark',
          damageBonus: bonus,
          duration: markDuration,
        };

        results.push({
          target: target.uid || target.id,
          type: 'deathMark',
          effect: deathMarkEffect,
        });
      }

      log = `${attacker.name || 'Mochi'} marks ${targetNames || 'Enemy'} for death! (+${Math.round(bonus * 100)}% damage for ${markDuration} turns).`;
      break;
    }

    // -----------------------------------------------------------------------
    // DAMAGE + STUN — deal damage AND stun in one ability
    // -----------------------------------------------------------------------
    case 'damage_stun': {
      let currentMultiplier = skill.effect.multiplier || 1.0;
      const falloff = skill.effect.damageFalloff || 1.0;
      const secondaryMult = skill.effect.secondaryMultiplier || 1.0;

      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        if (!target) continue;
        const isPrimary = (i === 0);

        let activeMultiplier = currentMultiplier;
        if (!isPrimary) {
          activeMultiplier = activeMultiplier * secondaryMult;
        }

        // Dodge check
        const isDodged = checkDodge(target);
        if (isDodged) {
          results.push({ target: target.uid || target.id, damage: 0, isDodged: true, stunApplied: false });
          log += `${target.name} dodged ${skill.name}! `;
          continue;
        }

        // Calculate damage
        const dmgResult = calculateDamage(attacker, target, {
          multiplier: activeMultiplier,
          hasDeathMark: target.effects?.some(e => e.type === 'deathMark') || false,
        });

        // Stun is guaranteed if the attack lands
        const stunEffect = {
          type: 'stun',
          duration: skill.effect.stunDuration || 1,
        };

        results.push({
          target: target.uid || target.id,
          damage: dmgResult.damage,
          isCrit: dmgResult.isCrit,
          isDodged: false,
          stunApplied: true,
          stunEffect,
        });

        log += `${skill.name} hits ${target.name} for ${dmgResult.damage} and stuns them for ${stunEffect.duration} turn(s)! `;
        if (dmgResult.isCrit) log += '(CRIT!) ';

        currentMultiplier = currentMultiplier * falloff;
      }
      break;
    }

    // -----------------------------------------------------------------------
    // FALLBACK — unknown skill type
    // -----------------------------------------------------------------------
    default:
      log = `Unknown skill type: ${skill.type}`;
      break;
  }

  return { results, log };
}

// ============================================================================
// 6) executeEnemyTurn — an enemy picks a move and attacks the hero
// ============================================================================
/**
 * Run one enemy's turn.
 *
 * The enemy picks a random move from its `moves` array and attacks the hero.
 * Some moves carry status effects (bleed, stun) that trigger based on
 * effectChance. The special move "self_destruct" kills the enemy after it
 * attacks (looking at you, Pufferfish 🐡).
 *
 * @param {Object} enemy       – The enemy's data (from zones.js).
 * @param {Object} enemyState  – The enemy's in-combat state (HP, effects, etc.).
 * @param {Object} target      – The hero's stats (for dodge / defence).
 * @param {Object} targetState – The hero's in-combat state.
 *
 * @returns {{
 *   damage: number,
 *   rawDamage: number,
 *   effects: Object[],
 *   log: string,
 *   selfDestruct: boolean
 * }}
 */
export function executeEnemyTurn(enemy, enemyState, target, targetState) {
  // -- Failsafe: check if enemy is dead --------------------------------------
  if (enemyState.hp <= 0) {
    return {
      damage: 0,
      effects: [],
      log: `${enemy.name} is already defeated and cannot act!`,
      selfDestruct: false,
      isSkipped: true,
    };
  }

  // -- Is the enemy stunned? If so, they skip their turn. -------------------
  const isStunned = enemyState.effects?.some(e => e.type === 'stun');
  if (isStunned) {
    return {
      damage: 0,
      effects: [],
      log: `${enemy.name} is stunned and can't move!`,
      selfDestruct: false,
      isStunned: true,
    };
  }

  // -- Pick a random move from the enemy's move list ------------------------
  const moves = (enemy.moves || []).filter(Boolean);
  if (moves.length === 0) {
    return {
      damage: 0,
      effects: [],
      log: `${enemy.name} does nothing.`,
      selfDestruct: false,
      isSkipped: true,
    };
  }

  const move = moves[Math.floor(Math.random() * moves.length)];

  // Set cooldown if applicable
  if (move.cooldown && move.cooldown > 0) {
    if (!enemyState.cooldowns) {
      enemyState.cooldowns = {};
    }
    enemyState.cooldowns[move.name] = move.cooldown;
  }

  // -- Guard self (some bosses can guard themselves) -------------------------
  if (move.effect === 'guard_self') {
    const guardEffect = {
      type: 'guard',
      reduction: 0.5,
      duration: 3,
    };
    return {
      damage: 0,
      effects: [guardEffect],
      log: `${enemy.name} uses ${move.name} and raises its guard!`,
      selfDestruct: false,
      appliedToSelf: true,
    };
  }

  // -- Fortify self (Cockroach Knight buff) -----------------------------------
  if (move.effect === 'fortify_self') {
    const baseDef = enemyState.def || enemy.def || 0;
    const buffVal = Math.round(baseDef * 0.5);
    const defBuffEffect = {
      type: 'def_buff',
      value: buffVal,
      duration: 3,
    };
    return {
      damage: 0,
      effects: [defBuffEffect],
      log: `${enemy.name} uses ${move.name} and increases their DEF by +${buffVal}!`,
      selfDestruct: false,
      appliedToSelf: true,
    };
  }

  // -- Summon Rats (King Rat move) ------------------------------------------
  if (move.effect === 'summon_rats') {
    return {
      damage: 0,
      effects: [],
      log: `${enemy.name} uses ${move.name} and summons 2 Sewer Rats!`,
      selfDestruct: false,
      summon: {
        enemyId: 'sewer_rat',
        count: 2,
      }
    };
  }

  // -- Hero dodge check -----------------------------------------------------
  const isDodged = checkHeroDodge(targetState);
  if (isDodged) {
    return {
      damage: 0,
      effects: [],
      log: `${targetState.name || 'Mochi'} dodged ${enemy.name}'s ${move.name}!`,
      selfDestruct: false,
    };
  }

  // -- Calculate damage -----------------------------------------------------
  // move.damage is the flat damage value the move deals (e.g. 12 for Gnaw).
  // If undefined, calculate it dynamically using the enemy's attack stat and move.multiplier.
  let atkVal = move.damage;
  if (atkVal === undefined) {
    const baseAtk = enemyState.attack || enemy.attack || 5;
    const mult = move.multiplier !== undefined ? move.multiplier : 1.0;
    atkVal = Math.floor(baseAtk * mult);
  }

  const enemyAsAttacker = {
    attack: atkVal,
    critChance: enemy.crit || 0,
    effects: enemyState.effects,
  };

  // Check if hero has an active guard
  const heroGuard = targetState.effects?.find(e => e.type === 'guard');
  const damageOptions = { critMultiplier: 1.5 };
  if (heroGuard) {
    damageOptions.guardAmount = heroGuard.reduction || 0;
  }

  const dmgResult = calculateDamage(enemyAsAttacker, target, damageOptions);

  // -- Roll for status effects (bleed, stun) --------------------------------
  const appliedEffects = [];

  const effectDef = move.effect;
  const isSelfDestruct = effectDef === 'self_destruct' || effectDef?.type === 'self_destruct';

  if (effectDef && !isSelfDestruct) {
    const effectChance = typeof effectDef === 'object' ? effectDef.chance : (move.effectChance || 0);

    if (effectChance > 0 && Math.random() < effectChance) {
      if (effectDef.type === 'bleed' || effectDef === 'bleed') {
        appliedEffects.push({
          type: 'bleed',
          damage: effectDef.damage || Math.max(2, Math.floor(enemy.attack * 0.25)),
          duration: effectDef.duration || 3,
        });
      } else if (effectDef.type === 'stun' || effectDef === 'stun') {
        appliedEffects.push({
          type: 'stun',
          duration: effectDef.duration || 1,
        });
      } else if (effectDef.type === 'atk_reduce') {
        appliedEffects.push({
          type: 'atk_reduce',
          value: effectDef.value,
          duration: effectDef.duration,
        });
      } else if (effectDef.type === 'dodge_reduce') {
        appliedEffects.push({
          type: 'dodge_reduce',
          value: effectDef.value,
          duration: effectDef.duration,
        });
      } else if (effectDef.type === 'crit_reduce') {
        appliedEffects.push({
          type: 'crit_reduce',
          value: effectDef.value,
          duration: effectDef.duration,
        });
      }
    }
  }

  // -- Self-destruct (Pufferfish) -------------------------------------------
  const selfDestruct = isSelfDestruct;

  // -- Build log ------------------------------------------------------------
  let log = `${enemy.name} uses ${move.name} for ${dmgResult.damage} damage`;
  if (dmgResult.isCrit) log += ' (CRIT!)';
  if (appliedEffects.length > 0) {
    log += ` — applied ${appliedEffects.map(e => e.type).join(', ')}!`;
  }
  if (selfDestruct) log += ` ${enemy.name} self-destructs!`;
  log += '.';

  let healVal = 0;
  if (move.effect === 'vampiric_bite') {
    healVal = dmgResult.damage;
    if (healVal > 0) {
      log += ' King Rat leeches life!';
    }
  }

  return {
    damage: dmgResult.damage,
    rawDamage: atkVal, // pre-DEF value used by Stone Thorns reflection
    effects: appliedEffects,
    log,
    selfDestruct,
    heal: healVal,
  };
}

// ============================================================================
// 7) processStatusEffects — tick down all active effects at end of turn
// ============================================================================
/**
 * Process every active status effect on an entity at the END of their turn.
 *
 * What each effect does:
 *   • bleed     – deals its `damage` value, then reduces `duration` by 1.
 *   • stun      – reduces `duration` by 1 (the skip-turn logic is in
 *                 executeEnemyTurn / the UI layer for the hero).
 *   • guard     – reduces `duration` by 1.
 *   • deathMark – reduces `duration` by 1.
 *
 * Effects whose duration reaches 0 are removed from the array and returned
 * in `expiredEffects` so the UI can show "Bleed wore off!" messages.
 *
 * @param {Object} entityState – In-combat state object. Must have an
 *                               `effects` array.
 *
 * @returns {{
 *   damage: number,        – total damage taken from bleed this tick
 *   expiredEffects: Object[],
 *   log: string
 * }}
 */
export function processStatusEffects(entityState) {
  // Decrement enemy move cooldowns if present
  if (entityState.cooldowns) {
    for (const moveName of Object.keys(entityState.cooldowns)) {
      if (entityState.cooldowns[moveName] > 0) {
        entityState.cooldowns[moveName] -= 1;
      }
    }
  }

  // If there are no active effects, bail out early
  if (!entityState.effects || entityState.effects.length === 0) {
    return { damage: 0, expiredEffects: [], log: '' };
  }

  let totalDamage = 0;
  const expiredEffects = [];
  const logParts = [];

  // Walk through each effect and apply / tick it
  for (const effect of entityState.effects) {
    const isBuff = ['def_buff', 'guard', 'counter', 'stealth'].includes(effect.type);
    if (effect.isNew) {
      effect.isNew = false;
      if (isBuff) {
        continue;
      }
    }
    switch (effect.type) {
      // -- Burn: deal damage then decrement duration ------------------------
      case 'burn':
        totalDamage += effect.damage;
        logParts.push(`Burn deals ${effect.damage} damage`);
        effect.duration -= 1;
        break;

      // -- Bleed: deal damage then decrement duration -----------------------
      case 'bleed':
        totalDamage += effect.damage;
        logParts.push(`Bleed deals ${effect.damage} damage`);
        effect.duration -= 1;
        break;

      // -- Stun: just decrement (the "skip turn" is handled elsewhere) ------
      case 'stun':
        effect.duration -= 1;
        if (effect.duration <= 0) {
          logParts.push('Stun wears off');
        }
        break;

      // -- Guard: decrement duration ----------------------------------------
      case 'guard':
        effect.duration -= 1;
        if (effect.duration <= 0) {
          logParts.push('Guard fades');
        }
        break;

      // -- Death Mark: decrement duration -----------------------------------
      case 'deathMark':
        effect.duration -= 1;
        if (effect.duration <= 0) {
          logParts.push('Death Mark fades');
        }
        break;

      // -- Stealth: decrement duration -------------------------------------
      case 'stealth':
        effect.duration -= 1;
        if (effect.duration <= 0) {
          logParts.push('Stealth fades');
        }
        break;

      // -- Counter: decrement duration -------------------------------------
      case 'counter':
        effect.duration -= 1;
        if (effect.duration <= 0) {
          logParts.push('Counter Stance fades');
        }
        break;

      case 'atk_reduce':
      case 'dodge_reduce':
      case 'crit_reduce':
      case 'debuff_attack':
        effect.duration -= 1;
        if (effect.duration <= 0) {
          const names = {
            atk_reduce: 'Attack debuff',
            dodge_reduce: 'Dodge debuff',
            crit_reduce: 'Crit debuff',
            debuff_attack: 'Attack debuff'
          };
          logParts.push(`${names[effect.type]} fades`);
        }
        break;

      case 'def_buff':
        effect.duration -= 1;
        if (effect.duration <= 0) {
          logParts.push('Defense buff fades');
        }
        break;

      default:
        // Unknown effect — just decrement so it eventually expires
        effect.duration -= 1;
        break;
    }
  }

  // Separate expired effects from still-active ones
  entityState.effects = entityState.effects.filter(effect => {
    if (effect.duration <= 0) {
      expiredEffects.push(effect);
      return false; // remove from active list
    }
    return true; // keep
  });

  return {
    damage: totalDamage,
    expiredEffects,
    log: logParts.join('. ') + (logParts.length > 0 ? '.' : ''),
  };
}

// ============================================================================
// 8) Burn system — Option C stacking, tick, and bonus calculation
// ============================================================================

/**
 * Merge a new burn onto an entity that may already have one.
 * Option C: sum damage, keep longest duration.
 *
 * @param {Object[]} effects   - entity's current effects array (mutated in place)
 * @param {number}   damage    - burn damage per tick (already includes all bonuses)
 * @param {number}   duration  - burn duration in turns
 */
export function applyBurn(effects, damage, duration) {
  const existing = effects.find(e => e.type === 'burn');
  if (existing) {
    existing.damage   = Math.max(existing.damage, damage);     // keep highest damage
    existing.duration = Math.max(existing.duration, duration); // keep longest duration
  } else {
    effects.push({ type: 'burn', damage, duration });
  }
}

/**
 * Calculate total burn damage per tick including stance and Smoldering bonuses.
 * All bonus values are pre-computed in CombatScreen and passed in as burnBonus.
 *
 * @param {number} baseDamage  - skill's base burn damage
 * @param {number} burnBonus   - total bonus from stance + Smoldering passive
 */
export function calculateBurnDamage(baseDamage, burnBonus) {
  return baseDamage + (burnBonus || 0);
}

// ============================================================================
// 9) Element skill execution — Fire Slash, Fire Burst, Flame Guard
// ============================================================================

/**
 * Execute Fire Slash: damage + guaranteed burn on single target.
 *
 * @param {Object}   skillDef    - full skill definition from SKILLS
 * @param {number}   stars       - current star level
 * @param {Object}   heroState   - hero combat state
 * @param {Object}   target      - single enemy object (mutated in place)
 * @param {number}   burnBonus   - precomputed stance + Smoldering bonus
 */
export function executeFireSlash(skillDef, stars, heroState, target, burnBonus) {
  const starData = skillDef.stars[stars];
  const { damage, isCrit } = calculateDamage(
    heroState,
    target,
    { multiplier: starData.damageMultiplier },
  );

  const burnDmg = calculateBurnDamage(starData.burnDamage, burnBonus);
  applyBurn(target.effects || (target.effects = []), burnDmg, starData.burnDuration);

  const critText = isCrit ? ' (CRIT!)' : '';
  return {
    damage,
    targetUid: target.uid || target.id,
    log: `🔥 Fire Slash hits ${target.name} for ${damage}${critText} and applies burn (${burnDmg}/turn for ${starData.burnDuration} turns)!`,
  };
}

/**
 * Execute Fire Burst: damage + burn on primary + spread to adjacent enemies.
 *
 * @param {Object}   skillDef   - full skill definition
 * @param {number}   stars      - current star level
 * @param {Object}   heroState  - hero combat state
 * @param {Object[]} enemies    - full living enemies array
 * @param {number}   targetIdx  - index of primary target in enemies
 * @param {number}   burnBonus  - precomputed burn bonus
 */
export function executeFireBurst(skillDef, stars, heroState, enemies, targetIdx, burnBonus) {
  const starData = skillDef.stars[stars];
  const results = [];
  const logParts = [];

  // Primary target
  const primary = enemies[targetIdx];
  if (primary) {
    const { damage, isCrit } = calculateDamage(
      heroState,
      primary,
      { multiplier: starData.damageMultiplier },
    );
    const burnDmg = calculateBurnDamage(starData.burnDamage, burnBonus);
    applyBurn(primary.effects || (primary.effects = []), burnDmg, starData.burnDuration);
    results.push({ damage, targetUid: primary.uid || primary.id });
    logParts.push(`${primary.name} takes ${damage}${isCrit ? ' (CRIT!)' : ''} + burn`);
  }

  // Adjacent enemies (index ±1)
  for (const adjIdx of [targetIdx - 1, targetIdx + 1]) {
    if (adjIdx < 0 || adjIdx >= enemies.length) continue;
    const adj = enemies[adjIdx];
    if (!adj || adj.hp <= 0) continue;

    const rawDmg = Math.floor((heroState.attack || 10) * starData.damageMultiplier * starData.spreadPercent);
    const effectiveDef = Math.max(0, (adj.def || adj.defence || 0) - 1);
    const reduction = effectiveDef / (effectiveDef + 15);
    const spreadDmg = Math.max(1, Math.floor(rawDmg * (1 - reduction)));

    results.push({ damage: spreadDmg, targetUid: adj.uid || adj.id });
    logParts.push(`${adj.name} splashed for ${spreadDmg}`);

    if (Math.random() < starData.spreadBurnChance) {
      const burnDmg = calculateBurnDamage(starData.burnDamage, burnBonus);
      applyBurn(adj.effects || (adj.effects = []), burnDmg, starData.burnDuration);
      logParts[logParts.length - 1] += ' + burn';
    }
  }

  return {
    results,
    log: `💥 Fire Burst! ${logParts.join(', ')}!`,
  };
}

/**
 * Execute Flame Guard: applies counter-burn aura to the hero for N turns.
 * Returns the flame guard state to merge into heroState.
 */
export function executeFlameGuard(skillDef, stars, burnBonus) {
  const starData = skillDef.stars[stars];
  const burnDmg = calculateBurnDamage(starData.counterBurnDamage, burnBonus);
  return {
    flameGuardActive: true,
    flameGuardTurnsRemaining: starData.guardDuration,
    flameGuardBurnDamage: burnDmg,
    flameGuardBurnDuration: starData.counterBurnDuration,
    log: `🛡️ Flame Guard active for ${starData.guardDuration} turns! Attackers burn for ${burnDmg}/turn!`,
  };
}

/**
 * Merge an ATK reduce effect onto an entity.
 * Keeps the highest value and longest duration.
 */
export function applyAtkReduce(effects, value, duration) {
  const existing = effects.find(e => e.type === 'atk_reduce');
  if (existing) {
    existing.value = Math.max(existing.value, value);
    existing.duration = Math.max(existing.duration, duration);
  } else {
    effects.push({ type: 'atk_reduce', value, duration });
  }
}

/**
 * Execute Tidal Strike: deals damage and applies ATK reduce to a single target.
 */
export function executeTidalStrike(skillDef, stars, heroState, target) {
  const starData = skillDef.stars[stars];
  const { damage, isCrit } = calculateDamage(
    heroState,
    target,
    { multiplier: starData.damageMultiplier }
  );

  applyAtkReduce(target.effects || (target.effects = []), starData.atkReduce, starData.duration);

  const critText = isCrit ? ' (CRIT!)' : '';
  return {
    damage,
    targetUid: target.uid || target.id,
    log: `💧 Tidal Strike hits ${target.name} for ${damage}${critText} and reduces their ATK by ${Math.round(starData.atkReduce * 100)}% for ${starData.duration} turns!`,
  };
}

/**
 * Execute Tidal Wave: damage + ATK reduce on primary + spread to adjacent.
 */
export function executeTidalWave(skillDef, stars, heroState, enemies, targetIdx) {
  const starData = skillDef.stars[stars];
  const results = [];
  const logParts = [];

  // Primary target
  const primary = enemies[targetIdx];
  if (primary) {
    const { damage, isCrit } = calculateDamage(
      heroState,
      primary,
      { multiplier: starData.damageMultiplier }
    );
    applyAtkReduce(primary.effects || (primary.effects = []), starData.atkReduce, starData.duration);
    results.push({ damage, targetUid: primary.uid || primary.id });
    logParts.push(`${primary.name} takes ${damage}${isCrit ? ' (CRIT!)' : ''} + ATK Reduce`);
  }

  // Adjacent enemies (index ±1)
  const rawMainDamage = primary ? Math.floor((heroState.attack || 10) * starData.damageMultiplier) : 0;
  for (const adjIdx of [targetIdx - 1, targetIdx + 1]) {
    if (adjIdx < 0 || adjIdx >= enemies.length) continue;
    const adj = enemies[adjIdx];
    if (!adj || adj.hp <= 0) continue;

    const rawDmg = Math.floor(rawMainDamage * starData.spreadPercent);
    const effectiveDef = Math.max(0, (adj.def || adj.defence || 0) - 1);
    const reduction = effectiveDef / (effectiveDef + 15);
    const spreadDmg = Math.max(1, Math.floor(rawDmg * (1 - reduction)));

    results.push({ damage: spreadDmg, targetUid: adj.uid || adj.id });
    logParts.push(`${adj.name} splashed for ${spreadDmg}`);

    if (Math.random() < starData.spreadAtkReduceChance) {
      applyAtkReduce(adj.effects || (adj.effects = []), starData.atkReduce, starData.duration);
      logParts[logParts.length - 1] += ' + ATK Reduce';
    }
  }

  return {
    results,
    log: `🌊 Tidal Wave! ${logParts.join(', ')}!`,
  };
}

/**
 * Execute Healing Current: applies HoT buff to Mochi for N turns.
 */
export function executeHealingCurrent(skillDef, stars, heroName = 'Mochi') {
  const starData = skillDef.stars[stars];
  return {
    playerHoT: {
      healPerTurn: starData.healPerTurn,
      duration: starData.duration,
      turnsRemaining: starData.duration,
    },
    log: `💧 Healing Current active! ${heroName} will restore HP each turn for ${starData.duration} turns.`,
  };
}

/**
 * Execute Boulder Slash: damage + chance to stun for 1 turn.
 *
 * @param {Object} skillDef   - full skill definition from SKILLS
 * @param {number} stars      - current star level
 * @param {Object} heroState  - hero combat state
 * @param {Object} target     - single enemy object
 */
export function executeBoulderSlash(skillDef, stars, heroState, target) {
  const starData = skillDef.stars[stars];
  const { damage, isCrit } = calculateDamage(
    heroState,
    target,
    { multiplier: starData.damageMultiplier },
  );

  const stunApplied = Math.random() < starData.stunChance;

  const critText = isCrit ? ' (CRIT!)' : '';
  let log = `🪨 Boulder Slash hits ${target.name} for ${damage}${critText}`;
  if (stunApplied) {
    log += ' and stuns them for 1 turn!';
  } else {
    log += '!';
  }

  return {
    damage,
    targetUid: target.uid || target.id,
    stunApplied,
    log,
  };
}

/**
 * Execute Fortify: instantly boosts hero DEF by a % for 1 turn.
 * Returns a def_buff effect to apply to heroState.effects.
 * The cooldown is star-dependent and returned so CombatScreen can set it.
 *
 * @param {Object} skillDef  - full skill definition from SKILLS
 * @param {number} stars     - current star level
 * @param {Object} heroState - hero combat state (needs .defence)
 */
export function executeFortify(skillDef, stars, heroState) {
  const starData = skillDef.stars[stars];
  const defBoost = Math.floor(heroState.defence * starData.defBoostPercent);
  return {
    defBuff: {
      type: 'def_buff',
      value: defBoost,
      duration: 1,
    },
    cooldown: starData.cooldown,
    log: `⛰️ Fortify! DEF boosted by +${defBoost} (${Math.round(starData.defBoostPercent * 100)}%) for 1 turn!`,
  };
}

/**
 * Execute Dual Slash: 2 rapid hits on the same target.
 * Each hit rolls crit independently with a per-hit bonus crit chance.
 *
 * @param {Object} skillDef  - full skill definition from SKILLS
 * @param {number} stars     - current star level
 * @param {Object} heroState - hero combat state
 * @param {Object} target    - single enemy object
 */
export function executeDualSlash(skillDef, stars, heroState, target) {
  const starData = skillDef.stars[stars];
  const hits = [];
  const logParts = [];

  for (let i = 0; i < 2; i++) {
    const { damage, isCrit } = calculateDamage(heroState, target, {
      multiplier: starData.damageMultiplier,
      critBonus: starData.bonusCritChance,
    });
    hits.push({ damage, isCrit });
    logParts.push(`${damage}${isCrit ? '(CRIT!)' : ''}`);
  }

  const totalDamage = hits.reduce((s, h) => s + h.damage, 0);
  return {
    hits,
    targetUid: target.uid || target.id,
    log: `💨 Dual Slash hits ${target.name} — ${logParts.join(' + ')} = ${totalDamage} total!`,
  };
}

/**
 * Execute Whirlwind: 3 rapid strikes on the primary target, each spreading
 * 40% to adjacent enemies. Every hit (primary + spread) rolls crit independently
 * with a per-hit bonus crit chance.
 *
 * @param {Object}   skillDef  - full skill definition from SKILLS
 * @param {number}   stars     - current star level
 * @param {Object}   heroState - hero combat state
 * @param {Object[]} enemies   - full living enemies array
 * @param {number}   targetIdx - index of primary target in enemies
 */
export function executeWhirlwind(skillDef, stars, heroState, enemies, targetIdx) {
  const starData = skillDef.stars[stars];
  const results = [];
  const primaryLogParts = [];

  const primary = enemies[targetIdx];
  if (!primary) return { results, log: '🌪️ No target!' };

  for (let hit = 0; hit < 3; hit++) {
    // Primary hit
    const { damage: pDmg, isCrit: pCrit } = calculateDamage(heroState, primary, {
      multiplier: starData.damageMultiplier,
      critBonus: starData.bonusCritChance,
    });
    results.push({ damage: pDmg, targetUid: primary.uid || primary.id });
    primaryLogParts.push(`${pDmg}${pCrit ? '(CRIT!)' : ''}`);

    // Spread to adjacent enemies at 40% of the hit's full damage
    for (const adjIdx of [targetIdx - 1, targetIdx + 1]) {
      if (adjIdx < 0 || adjIdx >= enemies.length) continue;
      const adj = enemies[adjIdx];
      if (!adj || adj.hp <= 0) continue;
      const { damage: aDmg } = calculateDamage(heroState, adj, {
        multiplier: starData.damageMultiplier * starData.spreadPercent,
        critBonus: starData.bonusCritChance,
      });
      results.push({ damage: aDmg, targetUid: adj.uid || adj.id });
    }
  }

  return {
    results,
    log: `🌪️ Whirlwind! ${primaryLogParts.join(' → ')}!`,
  };
}

// ============================================================================
// 9) useConsumable — pop a potion or toss a smoke vial
// ============================================================================
/**
 * Apply a consumable item's effect.
 *
 * Supported consumable types:
 *   • "heal"          – restore % of max HP
 *   • "remove_bleed"  – strip all bleed effects
 *   • "debuff_attack" – reduce all enemies' attack for N turns
 *
 * @param {Object} consumable – Consumable definition from data/gear.js.
 * @param {Object} heroState  – Hero's in-combat state (hp, maxHp, effects).
 *
 * @returns {{ effect: Object, log: string }}
 */
export function useConsumable(consumable, heroState) {
  const effectDef = consumable.effect;

  switch (effectDef.type) {
    // -- Health Potion -------------------------------------------------------
    case 'heal': {
      const healAmount = effectDef.amount || 50;
      const boostedHeal = applyHealingEfficiency(healAmount, heroState);
      const actualHeal = Math.min(boostedHeal, (heroState.maxHp || 50) - (heroState.hp || 0));

      return {
        effect: { type: 'heal', amount: actualHeal },
        log: `Used ${consumable.name} — healed ${actualHeal} HP!`,
      };
    }

    // -- Antidote (removes all bleeds) ---------------------------------------
    case 'remove_bleed': {
      const bleeds = (heroState.effects || []).filter(e => e.type === 'bleed');
      const removedCount = bleeds.length;

      return {
        effect: { type: 'remove_bleed', removedCount },
        log: removedCount > 0
          ? `Used ${consumable.name} — removed ${removedCount} bleed(s)!`
          : `Used ${consumable.name} — but there was no bleed to remove.`,
      };
    }

    // -- Smoke Vial (AoE enemy attack debuff) --------------------------------
    case 'debuff_attack': {
      return {
        effect: {
          type: 'debuff_attack',
          reduction: effectDef.reduction || 0.3,
          duration:  effectDef.duration  || 3,
        },
        log: `Used ${consumable.name} — enemies' attack reduced by ${Math.round((effectDef.reduction || 0.3) * 100)}% for ${effectDef.duration || 3} turns!`,
      };
    }

    // -- Unknown consumable --------------------------------------------------
    default:
      return {
        effect: {},
        log: `Used ${consumable.name} — but nothing happened.`,
      };
  }
}

// ============================================================================
// Helper functions (private)
// ============================================================================

/**
 * Deep-clone an enemy object so we can safely mutate HP, effects, etc.
 * Uses JSON parse/stringify — simple and sufficient for plain data objects.
 */
/**
 * Select the best available move for an enemy based on star rating,
 * cooldowns, and damage prioritization.
 *
 * @param {Object} enemyState - Clone of the enemy template in combat.
 * @returns {Object} Selected move definition.
 */
export function selectEnemyMove(enemyState, allEnemies = []) {
  if (!enemyState) return null;

  // 1. Initialise cooldowns if not present
  if (!enemyState.cooldowns) {
    enemyState.cooldowns = {};
  }

  // ── Special Boss AI: King Rat ──────────────────────────────────────────────
  if (enemyState.id === 'king_rat') {
    const moves = enemyState.moves || [];
    const summonMove = moves.find(m => m.name === 'Summon Rats');
    const vampBiteMove = moves.find(m => m.name === 'Vampiric Bite');
    const savageBiteMove = moves.find(m => m.name === 'Savage Bite');
    const gnawMove = moves.find(m => m.name === 'Gnaw');

    // Rule 1: If alone on the field, roll 50% — if success, use Summon Rats
    const allies = allEnemies.filter(e => e.uid !== enemyState.uid && e.hp > 0);
    const isAlone = allies.length === 0;
    if (isAlone && summonMove) {
      if (Math.random() < 0.50) {
        return summonMove;
      }
    }

    // Rule 2: If below 50% HP and Vampiric Bite is off cooldown, use Vampiric Bite
    const hpPercent = enemyState.hp !== undefined ? (enemyState.hp / (enemyState.maxHp || 400)) : 1.0;
    const vampCooldown = enemyState.cooldowns['Vampiric Bite'] || 0;
    if (hpPercent < 0.50 && vampCooldown === 0 && vampBiteMove) {
      return vampBiteMove;
    }

    // Rule 3: If Savage Bite is off cooldown, use Savage Bite
    const savageCooldown = enemyState.cooldowns['Savage Bite'] || 0;
    if (savageCooldown === 0 && savageBiteMove) {
      return savageBiteMove;
    }

    // Rule 4: Otherwise use Gnaw
    if (gnawMove) {
      return gnawMove;
    }
  }

  // 2. Filter moves by star rating and active cooldowns
  const currentStars = enemyState.stars || 1;
  const availableMoves = (enemyState.moves || []).filter((move) => {
    const minStars = move.minStars || 1;
    const onCooldown = (enemyState.cooldowns?.[move.name] || 0) > 0;
    return currentStars >= minStars && !onCooldown;
  });

  // 3. Fallback: if all moves are on cooldown, fall back to star-filtered moves
  let pool = availableMoves;
  if (pool.length === 0) {
    pool = (enemyState.moves || []).filter((move) => {
      const minStars = move.minStars || 1;
      return currentStars >= minStars;
    });
  }

  if (pool.length === 0) {
    return (enemyState.moves && enemyState.moves[0]) || null;
  }

  // 4. Prioritize moves: use custom priority if defined, otherwise fall back to expected damage
  const getExpectedDamage = (move) => {
    if (move.damage !== undefined) return move.damage;
    if (move.multiplier !== undefined) {
      return (enemyState.attack || 5) * move.multiplier;
    }
    return enemyState.attack || 5;
  };

  const getMovePriority = (move) => {
    if (move.priority !== undefined) return move.priority;
    return getExpectedDamage(move);
  };

  // Sort descending by priority
  pool.sort((a, b) => getMovePriority(b) - getMovePriority(a));

  // Select randomly among the ones tied for highest priority
  const maxPriority = getMovePriority(pool[0]);
  const bestMoves = pool.filter(m => getMovePriority(m) === maxPriority);
  return randomPick(bestMoves);
}

function deepCloneEnemy(enemy) {
  return JSON.parse(JSON.stringify(enemy));
}

/**
 * Pick a random element from an array.
 */
function randomPick(array) {
  return array[Math.floor(Math.random() * array.length)];
}
