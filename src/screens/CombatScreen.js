/**
 * =============================================================================
 * CombatScreen.js — The Core Dungeon Combat Experience
 * =============================================================================
 *
 * THIS IS THE MOST IMPORTANT SCREEN IN THE GAME.
 *
 * All combat state is managed LOCALLY — the global game state is only read
 * once (on mount) and written to when combat ends (victory or defeat).
 *
 * FLOW:
 *   Mount → init hero + enemies → player picks action → enemies retaliate →
 *   status effects tick → repeat → victory / defeat → dispatch results
 *
 * KEY DESIGN DECISIONS:
 *   • Enemy intent is chosen at the START of each player turn so the player
 *     can make informed tactical decisions (Slay-the-Spire style).
 *   • HP bars use React Native Animated for smooth width transitions.
 *   • The combat log shows the last 3 messages — enough context without
 *     overwhelming the small screen.
 *   • Action buttons are at least 56 px tall for comfortable thumb tapping.
 *
 * =============================================================================
 */

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { ZONES }        from '../data/zones';
import { ENEMIES }      from '../data/enemies';
import { SKILLS }       from '../data/skills';
import { CONSUMABLES }  from '../data/gear';
import AnimatedSprite   from '../components/AnimatedSprite';
import { HERO_SPRITE, getEnemySprite } from '../constants/sprites';
import {
  generateEncounter,
  executeAttack,
  executeEnemyTurn,
  processStatusEffects,
  useConsumable,
  executeSkill,
} from '../logic/combatEngine';
import { calculateEncounterLoot } from '../logic/lootEngine';
import { calculateEffectiveStats, checkLevelUp } from '../logic/progressionEngine';
import { useGame }  from '../state/gameState';
import theme        from '../constants/theme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a Promise that resolves after `ms` milliseconds.
 *  Awaiting this inside an async function lets React render between phases. */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Map enemy ids (or keywords) to display emojis */
const ENEMY_EMOJI_MAP = {
  rat:       '🐀',
  slime:     '🟢',
  cockroach: '🪳',
  frog:      '🐸',
  boss:      '👑',
  thorn:     '🌿',
  beetle:    '🐛',
  mushroom:  '🍄',
  vine:      '🌿',
  crab:      '🦀',
  eel:       '🐍',
  sailor:    '👻',
  puffer:    '🐡',
  king:      '👑',
  root:      '🍄',
  captain:   '👑',
};

/** Atmospheric narrator lines, picked randomly on mount */
const NARRATOR_LINES = [
  'Shadows coil around you. Something moves ahead…',
  'The air tastes of rust and old things.',
  'Dripping echoes mark your descent deeper.',
  'A low growl reverberates through the dark.',
  'Your whiskers twitch — danger is close.',
  'The flicker of distant eyes. They see you.',
  'Every step sinks a little. The ground is wrong.',
];

// ============================================================================
// Helper: resolve an emoji for a given enemy
// ============================================================================
function getEnemyEmoji(enemy) {
  if (enemy.isBoss) return '👑';
  // Search for a keyword match in the enemy id
  const id = (enemy.id || '').toLowerCase();
  for (const [keyword, emoji] of Object.entries(ENEMY_EMOJI_MAP)) {
    if (id.includes(keyword)) return emoji;
  }
  return '👾'; // fallback
}

// ============================================================================
// Helper: pick a random element from an array
// ============================================================================
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================================
// Component
// ============================================================================
export default function CombatScreen() {
  const navigation = useNavigation();
  const { state, dispatch } = useGame();

  // ── Local combat state ───────────────────────────────────────────────────
  const [combatPhase, setCombatPhase]             = useState('start');
  const [enemies, setEnemies]                     = useState([]);
  const [heroState, setHeroState]                 = useState(null);
  const [selectedEnemyIndex, setSelectedEnemyIndex] = useState(0);
  const [cooldowns, setCooldowns]                 = useState({});
  const [combatLog, setCombatLog]                 = useState([]);
  const [lootResult, setLootResult]               = useState(null);
  const [turnCount, setTurnCount]                 = useState(0);
  const [runConsumables, setRunConsumables]        = useState([]);
  const [narratorText, setNarratorText]           = useState('');
  const [showItemModal, setShowItemModal]          = useState(false);
  const [levelUpMessages, setLevelUpMessages]      = useState([]);

  // ── Animation state ───────────────────────────────────────────────────────
  // 'idle' | 'attack' | 'guard'  — controls which sprite sheet plays for the hero
  const [heroAnim, setHeroAnim]   = useState('idle');
  // { [enemy.uid]: 'idle' | 'attack' }  — per-enemy animation state
  const [enemyAnims, setEnemyAnims] = useState({});

  // ── Defeated/Dying animation state ──────────────────────────────────────────
  const [dyingEnemies, setDyingEnemies] = useState([]);

  // Track defeated enemies for loot calculation at the end
  const defeatedEnemiesRef = useRef([]);

  // Tick hero status effects at the end of their turn (or when skipped due to stun)
  const tickHeroStatusEffects = useCallback((currentHero) => {
    const updatedHero = { ...currentHero };
    let logged = false;

    const heroEffectResult = processStatusEffects(updatedHero);
    if (heroEffectResult.damage > 0) {
      updatedHero.hp = Math.max(0, updatedHero.hp - heroEffectResult.damage);
      logged = true;
    }
    if (heroEffectResult.log) {
      addLog(heroEffectResult.log);
      logged = true;
    }
    return { updatedHero, logged };
  }, [addLog]);

  // ── Initialisation (runs once on mount) ──────────────────────────────────
  useEffect(() => {
    // 1. Resolve the current zone
    const zone = ZONES[state.currentRun.zoneId];
    if (!zone) return;

    // 2. Compute the hero's effective stats (gear + passives + set bonuses)
    const eff = calculateEffectiveStats(state.hero);

    // 3. Build local hero combat state
    const initHero = {
      name: 'Mochi',
      hp: state.hero.hp,
      maxHp: eff.maxHp,
      attack: eff.attack,
      defence: eff.defence,
      critChance: eff.critChance,
      dodge: eff.dodge,
      effects: [],
      passives: eff.passives,
      gearSpecials: eff.gearSpecials,
    };
    setHeroState(initHero);

    // 4. Generate the encounter for this floor
    const encounter = generateEncounter(
      zone,
      state.currentRun.floor,
      zone.floors,
    );
    // Tag each enemy with a unique React key and pick first intent
    const taggedEnemies = encounter.map((e, i) => ({
      ...e,
      uid: e.id + '_' + i,
      effects: [],
      maxHp: e.maxHp || e.hp,
      intent: randomPick(e.moves || []),
    }));
    setEnemies(taggedEnemies);

    // 5. Initialise cooldowns for equipped skills
    const initCooldowns = {};
    (state.hero.equippedSkills || []).forEach((skillId) => {
      if (skillId) initCooldowns[skillId] = 0;
    });
    setCooldowns(initCooldowns);

    // 6. Consumables — currentRun.consumables is an array of ID strings
    //    (e.g. ['health_potion', 'health_potion', 'antidote']). Group them
    //    into { id, quantity } objects for the in-combat item UI.
    const consumableIds = state.currentRun.consumables || [];
    const consumableMap = {};
    for (const id of consumableIds) {
      consumableMap[id] = (consumableMap[id] || 0) + 1;
    }
    setRunConsumables(
      Object.entries(consumableMap).map(([id, quantity]) => ({ id, quantity })),
    );

    // 7. Atmospheric narrator text
    setNarratorText(randomPick(NARRATOR_LINES));

    // 8. Combat begins!
    defeatedEnemiesRef.current = [];
    setCombatPhase('playerTurn');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Convenience: add to combat log (keeps last 30, UI shows last 3) ─────
  const addLog = useCallback((msg) => {
    setCombatLog((prev) => [...prev.slice(-29), msg]);
  }, []);

  // ── Refresh enemy intents at the start of each player turn ──────────────
  const refreshIntents = useCallback((currentEnemies) => {
    return currentEnemies.map((e) => ({
      ...e,
      intent: randomPick(e.moves || []),
    }));
  }, []);

  // =========================================================================
  // ACTION: Basic Attack
  // =========================================================================
  const handleAttack = async () => {
    if (combatPhase !== 'playerTurn' || !heroState) return;

    // Lock player UI instantly
    setCombatPhase('enemyTurn');

    const target = enemies[selectedEnemyIndex];
    if (!target) return;

    // Play hero attack animation (auto-returns to idle via onComplete)
    setHeroAnim('attack');

    // Execute the attack
    const result = executeAttack(heroState, target, heroState);
    addLog(result.log);

    // Apply damage + effects to enemy
    let updatedEnemies = enemies.map((e, i) => {
      if (i !== selectedEnemyIndex) return e;
      const newHp = Math.max(0, e.hp - result.damage);
      const newEffects = [...(e.effects || [])];
      if (result.bleedApplied) {
        newEffects.push({
          type: 'bleed',
          damage: heroState.passives?.bleedDamage || 3,
          duration: heroState.passives?.bleedDuration || 3,
        });
      }
      if (result.stunApplied) {
        newEffects.push({ type: 'stun', duration: 1 });
      }
      return { ...e, hp: newHp, effects: newEffects };
    });

    // Remove dead enemies
    updatedEnemies = processDeadEnemies(updatedEnemies);
    setEnemies(updatedEnemies);

    // Calculate animation length
    const attackFrames = HERO_SPRITE.attack?.frames || 4;
    const animDuration = Math.round((attackFrames / 10) * 1000);

    // Wait for the attack animation to finish
    await delay(animDuration + 200);

    // Check for victory
    if (updatedEnemies.length === 0) {
      await delay(400); // extra beat to appreciate victory
      handleVictory();
      return;
    }

    // Fix selected index if it's out of bounds
    if (selectedEnemyIndex >= updatedEnemies.length) {
      setSelectedEnemyIndex(Math.max(0, updatedEnemies.length - 1));
    }

    // Tick hero's status effects at the end of their turn
    const { updatedHero, logged } = tickHeroStatusEffects(heroState);
    setHeroState(updatedHero);

    if (updatedHero.hp <= 0) {
      setCombatPhase('defeat');
      return;
    }

    // If status effects logged, pause a bit more
    if (logged) {
      await delay(400);
    }

    runEnemyTurn(updatedEnemies, updatedHero);
  };

  // =========================================================================
  // ACTION: Use Skill
  // =========================================================================
  const handleSkill = async (slotIndex) => {
    if (combatPhase !== 'playerTurn' || !heroState) return;

    const skillId = state.hero.equippedSkills[slotIndex];
    if (!skillId) {
      addLog('No skill equipped in that slot.');
      return;
    }

    // Cooldown check
    if ((cooldowns[skillId] || 0) > 0) {
      addLog(`${SKILLS[skillId]?.name || 'Skill'} is on cooldown (${cooldowns[skillId]} turns).`);
      return;
    }

    const skillDef = SKILLS[skillId];
    if (!skillDef) return;

    // Lock player UI instantly
    setCombatPhase('enemyTurn');

    // Guard/defensive skills play the guard animation; everything else attacks
    const isGuardSkill = skillDef.effect?.type === 'guard' || skillDef.effect?.type === 'counter';
    setHeroAnim(isGuardSkill ? 'guard' : 'attack');

    const target = enemies[selectedEnemyIndex];
    const skillResult = executeSkill(
      skillDef,
      heroState,
      [target],
      heroState,
    );
    addLog(skillResult.log);

    // Set cooldown
    const newCooldowns = { ...cooldowns, [skillId]: skillDef.cooldown };
    setCooldowns(newCooldowns);

    // Process results
    let updatedHero = { ...heroState };
    let updatedEnemies = [...enemies];

    for (const res of skillResult.results) {
      // Damage result — apply to the targeted enemy
      if (res.damage !== undefined && res.target !== undefined) {
        updatedEnemies = updatedEnemies.map((e) => {
          if (e.id !== res.target) return e;
          const newHp = Math.max(0, e.hp - res.damage);
          const newEffects = [...(e.effects || [])];
          if (res.stunApplied && res.stunEffect) {
            newEffects.push(res.stunEffect);
          }
          return { ...e, hp: newHp, effects: newEffects };
        });
      }

      // Heal result
      if (res.type === 'heal' && res.healAmount) {
        updatedHero = {
          ...updatedHero,
          hp: Math.min(updatedHero.maxHp, updatedHero.hp + res.healAmount),
        };
      }

      // Self-buff results (guard, stealth, counter)
      if (res.type === 'guard' || res.type === 'stealth' || res.type === 'counter') {
        updatedHero = {
          ...updatedHero,
          effects: [...(updatedHero.effects || []), res.effect],
        };
      }

      // Death mark — add effect to the enemy
      if (res.type === 'deathMark' && res.target !== undefined) {
        updatedEnemies = updatedEnemies.map((e) => {
          if (e.id !== res.target) return e;
          return {
            ...e,
            effects: [...(e.effects || []), res.effect],
          };
        });
      }
    }

    setHeroState(updatedHero);

    // Remove dead enemies
    updatedEnemies = processDeadEnemies(updatedEnemies);
    setEnemies(updatedEnemies);

    // Calculate animation length
    const animData = HERO_SPRITE[isGuardSkill ? 'guard' : 'attack'] || HERO_SPRITE.attack;
    const animDuration = Math.round((animData.frames / 10) * 1000);

    // Wait for the skill animation to finish
    await delay(animDuration + 200);

    // Check for victory
    if (updatedEnemies.length === 0) {
      await delay(400); // extra beat to appreciate victory
      handleVictory();
      return;
    }

    if (selectedEnemyIndex >= updatedEnemies.length) {
      setSelectedEnemyIndex(Math.max(0, updatedEnemies.length - 1));
    }

    // Tick hero's status effects at the end of their turn
    const { updatedHero: finalHero, logged } = tickHeroStatusEffects(updatedHero);
    setHeroState(finalHero);

    if (finalHero.hp <= 0) {
      setCombatPhase('defeat');
      return;
    }

    // If status effects logged, pause a bit more
    if (logged) {
      await delay(400);
    }

    // Pass finalHero so skill heals/buffs and status effect ticks aren't lost
    runEnemyTurn(updatedEnemies, finalHero);
  };

  // =========================================================================
  // ACTION: Use Item
  // =========================================================================
  const handleUseItem = async (consumableEntry) => {
    setShowItemModal(false);
    if (combatPhase !== 'playerTurn' || !heroState) return;

    const consumableDef = CONSUMABLES.find((c) => c.id === consumableEntry.id);
    if (!consumableDef) return;

    const { effect, log } = useConsumable(consumableDef, heroState);
    addLog(log);

    // Apply effects to hero or enemies depending on the consumable type
    let updatedHero = { ...heroState };
    let updatedEnemiesFromItem = [...enemies];

    if (effect.type === 'heal') {
      updatedHero.hp = Math.min(updatedHero.maxHp, updatedHero.hp + effect.amount);
    } else if (effect.type === 'remove_bleed') {
      updatedHero.effects = (updatedHero.effects || []).filter(
        (e) => e.type !== 'bleed',
      );
    } else if (effect.type === 'debuff_attack') {
      // Smoke Vial — reduce every enemy's attack by the reduction % for N turns
      // We store the original attack and reduce it for the duration by adding
      // a debuff effect that the processStatusEffects tick will handle.
      updatedEnemiesFromItem = enemies.map(e => ({
        ...e,
        attack: Math.floor(e.attack * (1 - (effect.reduction || 0.3))),
      }));
    }

    setHeroState(updatedHero);
    if (updatedEnemiesFromItem !== enemies) {
      setEnemies(updatedEnemiesFromItem);
    }

    // Decrement consumable count
    setRunConsumables((prev) =>
      prev
        .map((c) =>
          c.id === consumableEntry.id
            ? { ...c, quantity: c.quantity - 1 }
            : c,
        )
        .filter((c) => c.quantity > 0),
    );

    // Tick hero's status effects at the end of their turn
    const { updatedHero: finalHero, logged } = tickHeroStatusEffects(updatedHero);
    setHeroState(finalHero);

    if (finalHero.hp <= 0) {
      setCombatPhase('defeat');
      return;
    }

    setCombatPhase('enemyTurn');
    await delay(600 + (logged ? 400 : 0));
    // Pass finalHero so the heal/debuff and status effect ticks aren't lost
    runEnemyTurn(updatedEnemiesFromItem, finalHero);
  };

  // =========================================================================
  // ENEMY TURN — sequential async: attack → pause → effects → pause → next turn
  //
  // WHY ASYNC:
  //   Each `await delay(ms)` suspends the function and lets React flush pending
  //   state updates to the screen.  This gives the player time to see each
  //   combat event before the next one fires — Pokémon-style pacing.
  //
  // currentHeroState must be passed explicitly (not read from closure) because
  //   React batches setState and the fresh value isn't available synchronously.
  // =========================================================================
  const runEnemyTurn = async (currentEnemies, currentHeroState) => {
    // setCombatPhase was already called by the action handler — this is a no-op
    // but kept for safety in case runEnemyTurn is ever called directly.
    setCombatPhase('enemyTurn');

    let updatedHero    = { ...(currentHeroState ?? heroState) };
    let updatedEnemies = [...currentEnemies];

    // ── Phase 1: Each enemy executes their telegraphed move ─────────────────
    for (let i = 0; i < updatedEnemies.length; i++) {
      const enemy     = updatedEnemies[i];
      const enemyData = ENEMIES[enemy.id] || enemy;

      const turnResult = executeEnemyTurn(
        { ...enemyData, moves: [enemy.intent] },
        enemy,
        updatedHero,
        updatedHero,
      );

      // Trigger this enemy's attack animation if they are not stunned
      const enemyUid = enemy.uid;
      let animDuration = 500; // default delay if stunned or no animation plays

      if (!turnResult.isStunned) {
        setEnemyAnims(prev => ({ ...prev, [enemyUid]: 'attack' }));
        const spriteDef = getEnemySprite(enemy);
        const attackFrames = spriteDef.attack?.frames || 4;
        animDuration = Math.round((attackFrames / 10) * 1000);
      }

      addLog(turnResult.log);

      // Apply damage to hero
      updatedHero = {
        ...updatedHero,
        hp: Math.max(0, updatedHero.hp - turnResult.damage),
      };

      // Apply status effects from this attack (bleed, stun, etc.)
      if (turnResult.effects?.length > 0) {
        updatedHero = {
          ...updatedHero,
          effects: [...(updatedHero.effects || []), ...turnResult.effects],
        };
      }

      // Handle self-destruct (Pufferfish)
      if (turnResult.selfDestruct) {
        defeatedEnemiesRef.current.push(updatedEnemies[i]);
        updatedEnemies = updatedEnemies.filter((_, idx) => idx !== i);
        i--;
      }

      // Flush HP bar update to screen immediately after each enemy acts
      setHeroState({ ...updatedHero });

      // Pause for the exact duration of the attack animation (or stun message) to finish
      await delay(animDuration + 100);
    }

    // Pause briefly before processing status effects so there is a clean beat
    await delay(200);

    // ── Phase 2: End-of-turn status effects (bleed ticks, buff countdowns) ──
    let statusLogFired = false;

    // (Hero status effects are ticked at the end of the hero's own turn instead)

    updatedEnemies = updatedEnemies.map((e) => {
      const res = processStatusEffects(e);
      if (res.log) addLog(`${e.name}: ${res.log}`);
      if (res.damage > 0) {
        statusLogFired = true;
        return { ...e, hp: Math.max(0, e.hp - res.damage) };
      }
      return { ...e };
    });

    // Flush status-effect results to screen
    setEnemies([...updatedEnemies]);

    // Brief pause so the player can read bleed/buff messages
    if (statusLogFired) {
      await delay(400);
    }

    // ── Remove enemies that died from status effects ─────────────────────────
    updatedEnemies = processDeadEnemies(updatedEnemies);

    // ── Decrement skill cooldowns ────────────────────────────────────────────
    setCooldowns((prev) => {
      const updated = {};
      for (const [skillId, cd] of Object.entries(prev)) {
        updated[skillId] = Math.max(0, cd - 1);
      }
      return updated;
    });

    setTurnCount((prev) => prev + 1);

    // ── Check hero death ─────────────────────────────────────────────────────
    if (updatedHero.hp <= 0) {
      setHeroState({ ...updatedHero });
      setEnemies(updatedEnemies);
      setCombatPhase('defeat');
      return;
    }

    // ── Check victory (enemies wiped by bleed / self-destruct) ──────────────
    if (updatedEnemies.length === 0) {
      setHeroState({ ...updatedHero });
      handleVictory();
      return;
    }

    // ── Check boss phase triggers ────────────────────────────────────────────
    updatedEnemies = updatedEnemies.map((e) => {
      if (!e.isBoss || !e.phaseChanges) return e;
      const hpPercent = e.hp / e.maxHp;
      for (const phase of e.phaseChanges) {
        if (phase.hpPercent && hpPercent <= phase.hpPercent && !e[`_phase_${phase.hpPercent}`]) {
          addLog(`⚠️ ${e.name} enters a new phase!`);
          return { ...e, [`_phase_${phase.hpPercent}`]: true };
        }
      }
      return e;
    });

    // ── Refresh enemy intents for next player turn ───────────────────────────
    updatedEnemies = refreshIntents(updatedEnemies);

    setHeroState({ ...updatedHero });
    setEnemies(updatedEnemies);

    if (selectedEnemyIndex >= updatedEnemies.length) {
      setSelectedEnemyIndex(Math.max(0, updatedEnemies.length - 1));
    }

    // ── Check if the hero is stunned ────────────────────────────────────────
    const isHeroStunned = updatedHero.effects?.some(e => e.type === 'stun');
    if (isHeroStunned) {
      addLog('Mochi is stunned and can\'t move!');
      
      // Tick hero's status effects (which handles bleed and decrements stun)
      const { updatedHero: finalHero, logged } = tickHeroStatusEffects(updatedHero);
      setHeroState(finalHero);
      
      if (finalHero.hp <= 0) {
        setCombatPhase('defeat');
        return;
      }
      
      // Pause for a moment to let the player digest the stun log, then run enemy turn again
      setCombatPhase('enemyTurn');
      await delay(1500);
      runEnemyTurn(updatedEnemies, finalHero);
      return;
    }

    // ── Hand control back to the player ─────────────────────────────────────
    setCombatPhase('playerTurn');
  };

  // =========================================================================
  // Remove dead enemies & track them for loot
  // =========================================================================
  const processDeadEnemies = (enemyList) => {
    const alive = [];
    const dead = [];
    for (const e of enemyList) {
      if (e.hp <= 0) {
        defeatedEnemiesRef.current.push(e);
        addLog(`${e.name} has been defeated!`);
        dead.push(e);
      } else {
        alive.push(e);
      }
    }
    if (dead.length > 0) {
      setDyingEnemies(prev => [...prev, ...dead]);
      // Remove them from dying state after animation ends (800ms)
      setTimeout(() => {
        setDyingEnemies(prev => prev.filter(de => !dead.some(d => d.uid === de.uid)));
      }, 800);
    }
    return alive;
  };

  // =========================================================================
  // VICTORY — calculate loot, dispatch to global state
  // =========================================================================
  const handleVictory = () => {
    const loot = calculateEncounterLoot(defeatedEnemiesRef.current);
    setLootResult(loot);

    // Dispatch rewards to global state
    if (loot.gold > 0) {
      dispatch({ type: 'ADD_GOLD', payload: { amount: loot.gold } });
    }
    if (Object.keys(loot.materials).length > 0) {
      dispatch({ type: 'ADD_MATERIALS', payload: { materials: loot.materials } });
    }
    if (loot.xp > 0) {
      dispatch({ type: 'ADD_XP', payload: { amount: loot.xp } });
    }

    // Check for level up
    const heroAfterXp = {
      ...state.hero,
      xp: state.hero.xp + (loot.xp || 0),
    };
    const lvlResult = checkLevelUp(heroAfterXp);
    if (lvlResult.levelsGained > 0) {
      dispatch({
        type: 'LEVEL_UP',
        payload: {
          newLevel: lvlResult.newLevel,
          newMaxHp: lvlResult.newMaxHp,
          newAttack: lvlResult.newAttack,
          newDefence: lvlResult.newDefence,
          newSkillPoints: lvlResult.newSkillPoints,
        },
      });
      setLevelUpMessages(lvlResult.messages);
    }

    setCombatPhase('loot');
  };

  // =========================================================================
  // Continue / Return handlers
  // =========================================================================
  const handleContinue = () => {
    const zone = ZONES[state.currentRun.zoneId];
    const isFinalFloor = state.currentRun.floor >= zone.floors;

    if (isFinalFloor) {
      // Boss defeated — zone cleared!
      dispatch({ type: 'CLEAR_ZONE', payload: { zoneId: state.currentRun.zoneId } });
      dispatch({ type: 'END_RUN' });
      navigation.navigate('Camp');
    } else {
      // More floors to go
      dispatch({ type: 'ADVANCE_FLOOR' });
      // Reset combat for next floor — navigate will remount the screen
      navigation.replace('Combat');
    }
  };

  const handleDefeatReturn = () => {
    dispatch({ type: 'END_RUN' });
    navigation.navigate('Camp');
  };

  // =========================================================================
  // Render: loading guard
  // =========================================================================
  if (!heroState || combatPhase === 'start') {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Entering the depths…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // Render: main combat UI
  // =========================================================================
  const totalConsumables = runConsumables.reduce(
    (sum, c) => sum + c.quantity,
    0,
  );

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Narrator ─────────────────────────────────────────────────── */}
      <View style={styles.narratorBox}>
        <Text style={styles.narratorText}>{narratorText}</Text>
        <Text style={styles.floorBadge}>
          Floor {state.currentRun.floor} / {ZONES[state.currentRun.zoneId]?.floors}
        </Text>
      </View>

      {/* ── Enemy Section ────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        contentContainerStyle={styles.enemyRow}
        showsHorizontalScrollIndicator={false}
      >
        {enemies.map((enemy, idx) => (
          <TouchableOpacity
            key={enemy.uid}
            style={[
              styles.enemyCard,
              idx === selectedEnemyIndex && styles.enemyCardSelected,
              enemy.isBoss && styles.enemyCardBoss,
            ]}
            onPress={() => setSelectedEnemyIndex(idx)}
            activeOpacity={0.7}
          >
            {/* Enemy sprite — animated, mirrors horizontally to face the player */}
            {(() => {
              const spriteDef = getEnemySprite(enemy);
              const animKey   = enemyAnims[enemy.uid] || 'idle';
              const animData  = spriteDef[animKey] || spriteDef.idle;
              return (
                <AnimatedSprite
                  key={`${enemy.uid}_${animKey}`}
                  source={animData.source}
                  frameSize={animData.frameSize}
                  totalFrames={animData.frames}
                  fps={animKey === 'idle' ? 8 : 10}
                  loop={animKey === 'idle'}
                  onComplete={animKey !== 'idle'
                    ? () => setEnemyAnims(prev => ({ ...prev, [enemy.uid]: 'idle' }))
                    : undefined}
                  displaySize={enemy.isBoss ? 154 : 128}
                  flipX
                />
              );
            })()}

            {/* HP Bar */}
            <Text style={styles.enemyName} numberOfLines={1}>
              {enemy.name}
            </Text>
            <HpBar current={enemy.hp} max={enemy.maxHp} color={theme.COLORS.danger} />
          </TouchableOpacity>
        ))}
        {dyingEnemies.map((enemy) => (
          <DyingEnemyCard key={`dying_${enemy.uid}`} enemy={enemy} />
        ))}
      </ScrollView>

      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <View style={styles.heroSection}>
        {/* Hero sprite — animated; TODO: replace with Mochi's cat sprite sheet */}
        {(() => {
          const animData = HERO_SPRITE[heroAnim] || HERO_SPRITE.idle;
          return (
            <AnimatedSprite
              key={`hero_${heroAnim}`}
              source={animData.source}
              frameSize={animData.frameSize}
              totalFrames={animData.frames}
              fps={heroAnim === 'idle' ? 8 : 10}
              loop={heroAnim === 'idle'}
              onComplete={heroAnim !== 'idle' ? () => setHeroAnim('idle') : undefined}
              displaySize={128}
              style={styles.heroSprite}
            />
          );
        })()}
        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>Mochi</Text>
          <HpBar current={heroState.hp} max={heroState.maxHp} color={theme.COLORS.hp} />
          <View style={styles.effectsRow}>
            {(heroState.effects || []).map((eff, ei) => (
              <View
                key={`hero_${eff.type}_${ei}`}
                style={[
                  styles.effectBadge,
                  { backgroundColor: theme.COLORS[eff.type] || '#666' },
                ]}
              >
                <Text style={styles.effectText}>
                  {eff.type.charAt(0).toUpperCase()}
                  {eff.duration > 0 ? eff.duration : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── Combat Log ───────────────────────────────────────────────── */}
      <View style={styles.logContainer}>
        <ScrollView
          style={styles.logScroll}
          contentContainerStyle={styles.logContent}
          showsVerticalScrollIndicator={false}
        >
          {combatLog.slice(-3).map((msg, i) => (
            <Text key={`log_${i}`} style={styles.logText}>
              {msg}
            </Text>
          ))}
        </ScrollView>
      </View>

      {/* ── Action Bar ───────────────────────────────────────────────── */}
      {combatPhase === 'playerTurn' && (
        <View style={styles.actionBar}>
          {/* Attack */}
          <TouchableOpacity style={styles.actionBtn} onPress={handleAttack}>
            <Text style={styles.actionEmoji}>⚔️</Text>
            <Text style={styles.actionLabel}>Attack</Text>
          </TouchableOpacity>

          {/* Skill 1 */}
          {renderSkillButton(0)}

          {/* Skill 2 */}
          {renderSkillButton(1)}

          {/* Item */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              totalConsumables === 0 && styles.actionBtnDisabled,
            ]}
            onPress={() => totalConsumables > 0 && setShowItemModal(true)}
          >
            <Text style={styles.actionEmoji}>🧪</Text>
            <Text style={styles.actionLabel}>
              Item{totalConsumables > 0 ? ` (${totalConsumables})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* "Waiting" indicator during enemy turn */}
      {combatPhase === 'enemyTurn' && (
        <View style={styles.actionBar}>
          <Text style={styles.waitingText}>Enemy turn…</Text>
        </View>
      )}

      {/* ── Item selection modal ─────────────────────────────────────── */}
      <Modal
        visible={showItemModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowItemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🧪 Use Item</Text>

            {runConsumables.length === 0 ? (
              <Text style={styles.modalEmpty}>No items left.</Text>
            ) : (
              runConsumables.map((entry) => {
                const def = CONSUMABLES.find((c) => c.id === entry.id);
                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={styles.modalItem}
                    onPress={() => handleUseItem(entry)}
                  >
                    <Text style={styles.modalItemName}>
                      {def?.name || entry.id} ×{entry.quantity}
                    </Text>
                    <Text style={styles.modalItemDesc}>
                      {def?.description || ''}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowItemModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Victory / Loot Overlay ───────────────────────────────────── */}
      {combatPhase === 'loot' && lootResult && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.victoryTitle}>🎉 Victory!</Text>

            {/* Loot breakdown */}
            <View style={styles.lootSection}>
              {lootResult.xp > 0 && (
                <Text style={styles.lootLine}>✨ XP: +{lootResult.xp}</Text>
              )}
              {lootResult.gold > 0 && (
                <Text style={styles.lootLine}>💰 Gold: +{lootResult.gold}</Text>
              )}
              {Object.entries(lootResult.materials).map(([itemId, qty]) => (
                <Text key={itemId} style={styles.lootLine}>
                  📦 {itemId.replace(/_/g, ' ')}: ×{qty}
                </Text>
              ))}
            </View>

            {/* Level up messages */}
            {levelUpMessages.length > 0 && (
              <View style={styles.levelUpSection}>
                {levelUpMessages.map((msg, i) => (
                  <Text key={`lu_${i}`} style={styles.levelUpText}>
                    {msg}
                  </Text>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.overlayBtn}
              onPress={handleContinue}
            >
              <Text style={styles.overlayBtnText}>
                {state.currentRun.floor >= ZONES[state.currentRun.zoneId]?.floors
                  ? '🏕️ Return to Camp'
                  : '➡️ Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Defeat Overlay ───────────────────────────────────────────── */}
      {combatPhase === 'defeat' && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.defeatTitle}>💀 Defeated…</Text>
            <Text style={styles.defeatSubtext}>
              Mochi retreats to camp, battered but alive.
            </Text>

            <TouchableOpacity
              style={styles.overlayBtn}
              onPress={handleDefeatReturn}
            >
              <Text style={styles.overlayBtnText}>🏕️ Return to Camp</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );

  // ── Skill button renderer (used twice, avoids duplication) ──────────────
  function renderSkillButton(slotIndex) {
    const skillId = state.hero.equippedSkills[slotIndex];
    const skillDef = skillId ? SKILLS[skillId] : null;
    const cd = skillId ? cooldowns[skillId] || 0 : 0;
    const isOnCooldown = cd > 0;
    const hasSkill = !!skillDef;

    return (
      <TouchableOpacity
        key={`skill_${slotIndex}`}
        style={[
          styles.actionBtn,
          (!hasSkill || isOnCooldown) && styles.actionBtnDisabled,
        ]}
        onPress={() => hasSkill && !isOnCooldown && handleSkill(slotIndex)}
      >
        <Text style={styles.actionEmoji}>
          {hasSkill ? '✨' : '—'}
        </Text>
        <Text
          style={[
            styles.actionLabel,
            isOnCooldown && styles.actionLabelCooldown,
          ]}
          numberOfLines={1}
        >
          {hasSkill ? skillDef.name : `Skill ${slotIndex + 1}`}
        </Text>
        {isOnCooldown && (
          <View style={styles.cooldownBadge}>
            <Text style={styles.cooldownText}>{cd}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }
}

// ============================================================================
// DyingEnemyCard — collapses and fades out on defeat
// ============================================================================
function DyingEnemyCard({ enemy }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.5,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-30deg'],
  });

  const translate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 45],
  });

  const spriteDef = getEnemySprite(enemy);
  const animData  = spriteDef.idle;

  return (
    <Animated.View
      style={[
        styles.enemyCard,
        styles.enemyCardDying,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { rotate: spin },
            { translateY: translate },
          ],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.dyingOverlay}>
        <Text style={styles.dyingOverlayText}>💀</Text>
      </View>
      <AnimatedSprite
        source={animData.source}
        frameSize={animData.frameSize}
        totalFrames={animData.frames}
        fps={8}
        loop={false}
        displaySize={enemy.isBoss ? 154 : 128}
        flipX
      />
      <Text style={styles.enemyName} numberOfLines={1}>
        {enemy.name}
      </Text>
      <View style={styles.hpPlaceholder} />
    </Animated.View>
  );
}

// ============================================================================
// HpBar — animated health bar component
// ============================================================================
function HpBar({ current, max, color }) {
  const pct = max > 0 ? current / max : 0;
  const animWidth = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: max > 0 ? current / max : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [current, max, animWidth]);

  return (
    <View style={styles.hpBarOuter}>
      <Animated.View
        style={[
          styles.hpBarInner,
          {
            backgroundColor: color,
            width: animWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
      <Text style={styles.hpBarText}>
        {current}/{max}
      </Text>
    </View>
  );
}

// ============================================================================
// Styles — dark dungeon atmosphere
// ============================================================================
const styles = StyleSheet.create({
  // ── Root ───────────────────────────────────────────────────────────────────
  root: {
    flex: 1,
    backgroundColor: theme.COLORS.dungeonBackground,
  },

  // ── Loading ───────────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.FONTS.heading,
    color: theme.COLORS.textDim,
  },

  // ── Narrator ──────────────────────────────────────────────────────────────
  narratorBox: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: theme.SPACING.md,
    paddingVertical: theme.SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  narratorText: {
    ...theme.FONTS.small,
    color: theme.COLORS.textDim,
    fontStyle: 'italic',
    flex: 1,
  },
  floorBadge: {
    ...theme.FONTS.small,
    color: theme.COLORS.primary,
    fontWeight: 'bold',
    marginLeft: theme.SPACING.sm,
  },

  // ── Enemies ───────────────────────────────────────────────────────────────
  enemyRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.SPACING.sm,
    paddingVertical: theme.SPACING.sm,
    justifyContent: 'center',
    minWidth: '100%',
  },
  enemyCard: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: theme.BORDER_RADIUS.lg,
    padding: theme.SPACING.sm,
    marginHorizontal: theme.SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
    maxWidth: 180,
  },
  enemyCardSelected: {
    borderColor: theme.COLORS.accent,
    backgroundColor: 'rgba(255, 170, 0, 0.08)',
    shadowColor: theme.COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  enemyCardBoss: {
    minWidth: 160,
  },
  enemyName: {
    ...theme.FONTS.small,
    color: theme.COLORS.textBright,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: theme.SPACING.xs,
  },

  // ── Intent badge ──────────────────────────────────────────────────────────
  intentBadge: {
    backgroundColor: 'rgba(255,50,50,0.25)',
    borderRadius: theme.BORDER_RADIUS.sm,
    paddingHorizontal: theme.SPACING.xs,
    paddingVertical: 2,
    marginTop: theme.SPACING.xs,
  },
  intentText: {
    ...theme.FONTS.tiny,
    color: theme.COLORS.danger,
    fontWeight: 'bold',
  },

  // ── Status effects badges ─────────────────────────────────────────────────
  effectsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: theme.SPACING.xs,
  },
  effectBadge: {
    borderRadius: theme.BORDER_RADIUS.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginHorizontal: 2,
    marginVertical: 1,
  },
  effectText: {
    ...theme.FONTS.tiny,
    color: '#FFF',
    fontWeight: 'bold',
  },

  // ── HP bar ────────────────────────────────────────────────────────────────
  hpBarOuter: {
    width: '100%',
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: theme.BORDER_RADIUS.sm,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  hpBarInner: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: theme.BORDER_RADIUS.sm,
  },
  hpBarText: {
    ...theme.FONTS.tiny,
    color: '#FFF',
    textAlign: 'center',
    fontWeight: 'bold',
  },

  // ── Hero section ──────────────────────────────────────────────────────────
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: theme.SPACING.sm,
    marginHorizontal: theme.SPACING.sm,
    borderRadius: theme.BORDER_RADIUS.lg,
    marginTop: theme.SPACING.xs,
    flexShrink: 0,
  },
  heroSprite: {
    marginRight: theme.SPACING.sm,
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    ...theme.FONTS.body,
    color: theme.COLORS.textBright,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  heroSkills: {
    alignItems: 'flex-end',
    marginLeft: theme.SPACING.sm,
  },
  heroSkillLabel: {
    ...theme.FONTS.tiny,
    color: theme.COLORS.stealth,
    marginBottom: 2,
  },

  // ── Combat log ────────────────────────────────────────────────────────────
  logContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginHorizontal: theme.SPACING.sm,
    marginTop: theme.SPACING.xs,
    borderRadius: theme.BORDER_RADIUS.md,
    padding: theme.SPACING.sm,
  },
  logScroll: {
    flex: 1,
  },
  logContent: {
    justifyContent: 'flex-end',
  },
  logText: {
    ...theme.FONTS.small,
    color: theme.COLORS.text,
    marginBottom: 3,
  },

  // ── Action bar ────────────────────────────────────────────────────────────
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: theme.SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    marginTop: theme.SPACING.xs,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.COLORS.cardBg,
    borderWidth: 1,
    borderColor: theme.COLORS.primary,
    borderRadius: theme.BORDER_RADIUS.md,
    paddingVertical: theme.SPACING.sm,
    marginHorizontal: theme.SPACING.xs,
    minHeight: 56,
    position: 'relative',
  },
  actionBtnDisabled: {
    borderColor: theme.COLORS.buttonDisabled,
    opacity: 0.5,
  },
  actionEmoji: {
    fontSize: 20,
  },
  actionLabel: {
    ...theme.FONTS.tiny,
    color: theme.COLORS.textBright,
    marginTop: 2,
    textAlign: 'center',
  },
  actionLabelCooldown: {
    color: theme.COLORS.textDim,
  },
  cooldownBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.COLORS.cooldownOverlay,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cooldownText: {
    ...theme.FONTS.tiny,
    color: theme.COLORS.stun,
    fontWeight: 'bold',
  },
  waitingText: {
    ...theme.FONTS.body,
    color: theme.COLORS.textDim,
    textAlign: 'center',
    flex: 1,
    paddingVertical: theme.SPACING.md,
  },

  // ── Item modal ────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.COLORS.dungeonBackground,
    borderWidth: 1,
    borderColor: theme.COLORS.primary,
    borderRadius: theme.BORDER_RADIUS.xl,
    padding: theme.SPACING.lg,
    width: '80%',
  },
  modalTitle: {
    ...theme.FONTS.heading,
    color: theme.COLORS.textBright,
    textAlign: 'center',
    marginBottom: theme.SPACING.md,
  },
  modalEmpty: {
    ...theme.FONTS.body,
    color: theme.COLORS.textDim,
    textAlign: 'center',
    padding: theme.SPACING.lg,
  },
  modalItem: {
    backgroundColor: theme.COLORS.cardBg,
    borderWidth: 1,
    borderColor: theme.COLORS.cardBorder,
    borderRadius: theme.BORDER_RADIUS.md,
    padding: theme.SPACING.sm,
    marginBottom: theme.SPACING.sm,
  },
  modalItemName: {
    ...theme.FONTS.body,
    color: theme.COLORS.textBright,
    fontWeight: 'bold',
  },
  modalItemDesc: {
    ...theme.FONTS.small,
    color: theme.COLORS.textDim,
    marginTop: 2,
  },
  modalCancel: {
    alignItems: 'center',
    paddingVertical: theme.SPACING.sm,
    marginTop: theme.SPACING.sm,
  },
  modalCancelText: {
    ...theme.FONTS.body,
    color: theme.COLORS.danger,
  },

  // ── Overlays (victory + defeat) ───────────────────────────────────────────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  overlayCard: {
    backgroundColor: theme.COLORS.dungeonBackground,
    borderWidth: 2,
    borderColor: theme.COLORS.primary,
    borderRadius: theme.BORDER_RADIUS.xl,
    padding: theme.SPACING.xl,
    width: '85%',
    alignItems: 'center',
  },
  victoryTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.COLORS.stun, // gold colour
    marginBottom: theme.SPACING.md,
  },
  defeatTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.COLORS.danger,
    marginBottom: theme.SPACING.md,
  },
  defeatSubtext: {
    ...theme.FONTS.body,
    color: theme.COLORS.textDim,
    textAlign: 'center',
    marginBottom: theme.SPACING.lg,
  },

  // ── Loot section ──────────────────────────────────────────────────────────
  lootSection: {
    width: '100%',
    marginBottom: theme.SPACING.md,
  },
  lootLine: {
    ...theme.FONTS.body,
    color: theme.COLORS.text,
    marginBottom: theme.SPACING.xs,
  },

  // ── Level up ──────────────────────────────────────────────────────────────
  levelUpSection: {
    backgroundColor: 'rgba(212,167,84,0.15)',
    borderRadius: theme.BORDER_RADIUS.md,
    padding: theme.SPACING.sm,
    width: '100%',
    marginBottom: theme.SPACING.md,
  },
  levelUpText: {
    ...theme.FONTS.body,
    color: theme.COLORS.stun,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // ── Overlay button ────────────────────────────────────────────────────────
  overlayBtn: {
    backgroundColor: theme.COLORS.buttonPrimary,
    borderRadius: theme.BORDER_RADIUS.lg,
    paddingVertical: theme.SPACING.md,
    paddingHorizontal: theme.SPACING.xl,
    marginTop: theme.SPACING.sm,
  },
  overlayBtnText: {
    ...theme.FONTS.body,
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // ── Dying enemy visual effects ────────────────────────────────────────────
  enemyCardDying: {
    borderColor: 'rgba(255, 68, 68, 0.3)',
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
  },
  dyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  dyingOverlayText: {
    fontSize: 48,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  hpPlaceholder: {
    height: 14,
  },
});
