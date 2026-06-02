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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { ZONES }        from '../data/zones';
import { ENEMIES }      from '../data/enemies';
import { SKILLS }       from '../data/skills';
import { CONSUMABLES }  from '../data/gear';
import AnimatedSprite   from '../components/AnimatedSprite';
import Button           from '../components/ui/Button';
import ResourceBar      from '../components/ui/ResourceBar';
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
// Helper: resolve targets for a skill based on its targetScope
// ============================================================================
function getTargetsForSkill(skillDef, selectedIdx, allEnemies) {
  const scope = skillDef.effect?.targetScope || 'single';
  const primary = allEnemies[selectedIdx];
  if (!primary) return [];

  switch (scope) {
    case 'all':
      return allEnemies;

    case 'adjacent': {
      const targets = [primary];
      if (selectedIdx > 0) targets.push(allEnemies[selectedIdx - 1]);
      if (selectedIdx < allEnemies.length - 1) targets.push(allEnemies[selectedIdx + 1]);
      return targets;
    }

    case 'chain': {
      const targets = [primary];
      const others = allEnemies.filter((_, i) => i !== selectedIdx);
      // Shuffle others and pick up to bounceCount
      const bounced = others.sort(() => 0.5 - Math.random()).slice(0, skillDef.effect.bounceCount || 0);
      return [...targets, ...bounced];
    }

    case 'random': {
      if (skillDef.effect.allowDuplicateTargets) {
        const targets = [];
        const count = skillDef.effect.bounceCount || 1;
        for (let i = 0; i < count; i++) {
          targets.push(allEnemies[Math.floor(Math.random() * allEnemies.length)]);
        }
        return targets;
      } else {
        return [...allEnemies].sort(() => 0.5 - Math.random()).slice(0, skillDef.effect.bounceCount || 1);
      }
    }

    case 'single':
    default:
      return [primary];
  }
}

// ============================================================================
// Helper: consolidate status effects for rendering (Option 1)
// ============================================================================
const STATUS_EMOJIS = {
  bleed: '🩸',
  guard: '🛡️',
  stun: '😵‍💫',
  deathMark: '💀',
  stealth: '🌫️',
  counter: '⚔️',
  debuff_attack: '📉',
};

const STATUS_COLORS = {
  bleed: theme.COLORS.bleed || '#D8483F',
  guard: theme.COLORS.guard || '#5A9FE0',
  stun: theme.COLORS.stun || '#F5CF4A',
  deathMark: '#7A2F8F',
  stealth: theme.COLORS.stealth || '#A98EE0',
  counter: '#F08A4A',
  debuff_attack: '#D8483F',
};

function consolidateEffectsArray(effectsList) {
  const groups = {};
  (effectsList || []).forEach((eff) => {
    if (!eff) return;
    if (!groups[eff.type]) {
      groups[eff.type] = { ...eff, stacks: eff.stacks || 1 };
    } else {
      const existing = groups[eff.type];
      existing.duration = Math.max(existing.duration, eff.duration);
      if (eff.damage !== undefined) {
        existing.damage = (existing.damage || 0) + eff.damage;
      }
      existing.stacks = (existing.stacks || 1) + (eff.stacks || 1);
    }
  });
  return Object.values(groups);
}

function addStatusEffects(effectsList, newEffects) {
  let list = consolidateEffectsArray(effectsList);
  if (!newEffects) return list;
  const effectsToAdd = Array.isArray(newEffects) ? newEffects : [newEffects];

  effectsToAdd.forEach((newEffect) => {
    if (!newEffect) return;
    const existingIndex = list.findIndex(e => e.type === newEffect.type);
    if (existingIndex > -1) {
      const existing = { ...list[existingIndex] };
      existing.duration = newEffect.duration;
      if (newEffect.damage !== undefined) {
        existing.damage = (existing.damage || 0) + newEffect.damage;
      }
      existing.stacks = (existing.stacks || 1) + (newEffect.stacks || 1);
      list[existingIndex] = existing;
    } else {
      list.push({
        ...newEffect,
        stacks: newEffect.stacks || 1,
      });
    }
  });
  return list;
}

// ============================================================================
// Component
// ============================================================================
export default function CombatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { roomType } = route.params || { roomType: 'combat' };
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
  const scrollViewRef = useRef(null);

  // ── Convenience: add to combat log (keeps last 30, UI shows last 3) ─────
  const addLog = useCallback((msg) => {
    setCombatLog((prev) => [...prev.slice(-29), msg]);
  }, []);

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

    // 2. Compute the hero's effective stats (gear + passives + set bonuses + run buffs)
    const eff = calculateEffectiveStats(state.hero, undefined, state.currentRun.runBuffs);

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

    // 4. Generate the encounter based on the room type
    let taggedEnemies = [];
    const pool = zone.enemies.map(id => ENEMIES[id]).filter(Boolean);

    if (roomType === 'boss') {
      const bossData = ENEMIES[zone.bossId];
      if (bossData) {
        const boss = {
          ...bossData,
          uid: bossData.id + '_boss',
          type: 'boss',
          isBoss: true,
          maxHp: bossData.hp,
          effects: [],
          intent: randomPick(bossData.moves || []),
        };
        taggedEnemies = [boss];
      }
    } else if (roomType === 'elite') {
      const template = randomPick(pool);
      if (template) {
        const elite = {
          ...template,
          uid: template.id + '_elite',
          type: 'elite',
          name: `Elite ${template.name}`,
          hp: Math.floor(template.hp * 1.4),       // +40% HP
          maxHp: Math.floor(template.hp * 1.4),
          attack: Math.floor(template.attack * 1.3),  // +30% Attack
          effects: [],
          intent: randomPick(template.moves || []),
        };
        taggedEnemies = [elite];
      }
    } else {
      // Normal combat: 80% two common enemies, 20% three common enemies
      const roll = Math.random();
      const count = roll < 0.8 ? 2 : 3;
      for (let i = 0; i < count; i++) {
        const template = randomPick(pool);
        if (template) {
          taggedEnemies.push({
            ...template,
            uid: template.id + '_' + i,
            type: 'common',
            maxHp: template.hp,
            effects: [],
            intent: randomPick(template.moves || []),
          });
        }
      }
    }
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
      let newEffects = e.effects || [];
      if (result.bleedApplied) {
        newEffects = addStatusEffects(newEffects, {
          type: 'bleed',
          damage: heroState.passives?.bleedDamage || 3,
          duration: heroState.passives?.bleedDuration || 3,
        });
      }
      if (result.stunApplied) {
        newEffects = addStatusEffects(newEffects, { type: 'stun', duration: 1 });
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

    const targets = getTargetsForSkill(skillDef, selectedEnemyIndex, enemies);
    const skillResult = executeSkill(
      skillDef,
      heroState,
      targets,
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
          if ((e.uid || e.id) !== res.target) return e;
          const newHp = Math.max(0, e.hp - res.damage);
          let newEffects = e.effects || [];
          if (res.stunApplied && res.stunEffect) {
            newEffects = addStatusEffects(newEffects, res.stunEffect);
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
          effects: addStatusEffects(updatedHero.effects, res.effect),
        };
      }

      // Death mark — add effect to the enemy
      if (res.type === 'deathMark' && res.target !== undefined) {
        updatedEnemies = updatedEnemies.map((e) => {
          if ((e.uid || e.id) !== res.target) return e;
          return {
            ...e,
            effects: addStatusEffects(e.effects, res.effect),
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
        if (turnResult.appliedToSelf) {
          updatedEnemies = updatedEnemies.map((e, idx) => {
            if (idx !== i) return e;
            return {
              ...e,
              effects: addStatusEffects(e.effects, turnResult.effects),
            };
          });
        } else {
          updatedHero = {
            ...updatedHero,
            effects: addStatusEffects(updatedHero.effects, turnResult.effects),
          };
        }
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

    // Dispatch rewards to global state (Run bag instead of permanent inventory)
    if (loot.gold > 0 || Object.keys(loot.materials).length > 0) {
      dispatch({
        type: 'ADD_RUN_LOOT',
        payload: { gold: loot.gold, materials: loot.materials },
      });
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
    // Un-map runConsumables back into a flat array of IDs
    const flatConsumables = [];
    for (const c of runConsumables) {
      for (let i = 0; i < c.quantity; i++) {
        flatConsumables.push(c.id);
      }
    }

    // Update HP and consumables in the run state
    dispatch({
      type: 'UPDATE_RUN_AFTER_COMBAT',
      payload: { hp: heroState.hp, consumables: flatConsumables },
    });

    // Mark current room as cleared on the grid
    dispatch({ type: 'CLEAR_CURRENT_TILE' });

    if (roomType === 'boss') {
      // Boss defeated — zone cleared!
      dispatch({ type: 'CLEAR_ZONE', payload: { zoneId: state.currentRun.zoneId } });
      dispatch({ type: 'END_RUN', payload: { outcome: 'win' } });
      navigation.navigate('Camp');
    } else {
      // Regular / Elite combat complete — return to the dungeon map
      navigation.navigate('DungeonMap');
    }
  };

  const handleDefeatReturn = () => {
    // Sync any consumables used during this fight before ending the run,
    // so END_RUN returns the correct remaining items to permanent inventory.
    const flatConsumables = [];
    for (const c of runConsumables) {
      for (let i = 0; i < c.quantity; i++) {
        flatConsumables.push(c.id);
      }
    }
    dispatch({
      type: 'UPDATE_RUN_AFTER_COMBAT',
      payload: { hp: 0, consumables: flatConsumables },
    });
    dispatch({ type: 'END_RUN', payload: { outcome: 'lose' } });
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

  // Syntax highlighting parser for combat logs
  const renderLogText = (msg, index) => {
    let color = '#CBD5E1'; // Cool parchment default
    const lower = msg.toLowerCase();
    
    if (lower.includes('mochi attacks') || lower.includes('crit!') || lower.includes('critical')) {
      color = '#F5CF4A'; // treasureGold — hero actions
    } else if (lower.includes('takes') || lower.includes('damaged') || lower.includes('fells') || lower.includes('dies')) {
      color = '#D8483F'; // damageRed
    } else if (lower.includes('heals') || lower.includes('recovered') || lower.includes('gained')) {
      color = '#5CC489'; // buffMint — healing/success
    } else if (lower.includes('applied') || lower.includes('poison') || lower.includes('bleed') || lower.includes('stun') || lower.includes('guard')) {
      color = '#5A9FE0'; // coldBlue — status effects
    }

    return (
      <Text key={`log_${index}`} style={[styles.logText, { color }]}>
        ⚔️ {msg}
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Background SVG gradients */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="combatGlow" cx="50%" cy="30%" r="80%">
            <Stop offset="0%" stopColor="#D4A754" stopOpacity="0.04" />
            <Stop offset="100%" stopColor="#07070A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="#07070A" />
        <Rect width="100%" height="100%" fill="url(#combatGlow)" />
      </Svg>

      {/* ── Combat Header ──────────────────────────────────────────── */}
      <View style={styles.combatHeader}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Rect width="100%" height="100%" fill="rgba(255,255,255,0.02)" rx={14} />
          <Rect x="1" y="1" width="99%" height="98%" rx={13} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        </Svg>
        <View style={styles.combatHeaderRow}>
          <View style={styles.combatHeaderLeft}>
            <Text style={styles.encounterTypeLabel}>
              {roomType === 'boss' ? '☠️  BOSS BATTLE' : roomType === 'elite' ? '💀  ELITE ENCOUNTER' : '⚔️  COMBAT'}
            </Text>
            <Text style={styles.narratorFlavor} numberOfLines={1}>{narratorText}</Text>
          </View>
          <View style={styles.turnPill}>
            <Text style={styles.turnPillText}>Turn {turnCount + 1}</Text>
          </View>
        </View>
      </View>

      {/* ── Enemy Section ────────────────────────────────────────────── */}
      <View style={styles.enemySectionWrapper}>
        <ScrollView
          horizontal
          contentContainerStyle={styles.enemyRow}
          showsHorizontalScrollIndicator={false}
        >
          {enemies.map((enemy, idx) => {
            const isSelected = idx === selectedEnemyIndex;
            const spriteDef = getEnemySprite(enemy);
            const displaySize = enemy.isBoss ? 134 : 110;
            const platformBottom = Math.round(displaySize * (spriteDef.platformOffsetFactor || 0.25));
            return (
              <TouchableOpacity
                key={enemy.uid}
                style={[
                  styles.enemyCard,
                  isSelected && styles.enemyCardSelected,
                  enemy.isBoss && styles.enemyCardBoss,
                ]}
                onPress={() => setSelectedEnemyIndex(idx)}
                activeOpacity={0.8}
              >
                {/* Canvas Viewport (Top 70%) */}
                <View style={styles.spriteCanvas}>
                  <View style={styles.spriteWrapper}>
                    {/* Stage platform below enemy */}
                    <View style={[styles.stagePlatform, { bottom: platformBottom }]}>
                      <Svg width={100} height={16}>
                        <Defs>
                          <RadialGradient id={`stageGlow_${enemy.uid}`} cx="50%" cy="50%" r="50%">
                            <Stop offset="0%" stopColor={isSelected ? '#F5CF4A' : '#707F94'} stopOpacity="0.25" />
                            <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
                          </RadialGradient>
                        </Defs>
                        <Rect width="100%" height="100%" fill={`url(#stageGlow_${enemy.uid})`} rx={8} />
                      </Svg>
                    </View>

                    {/* Animated Enemy Sprite */}
                    {(() => {
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
                          displaySize={displaySize}
                          flipX
                          style={styles.enemySprite}
                        />
                      );
                    })()}
                  </View>
                </View>

                {/* Divider Line */}
                <View style={styles.hudDivider} />

                {/* HUD Tray (Bottom 30%) */}
                <View style={styles.hudTray}>
                  <Text style={styles.enemyName} numberOfLines={1}>
                    {enemy.name}
                  </Text>
                  <View style={{ width: '100%' }}>
                    <ResourceBar variant="enemyHp" current={enemy.hp} max={enemy.maxHp} />
                  </View>

                  {/* Status Row (Always rendered to reserve height, scrollable horizontally) */}
                  <View style={styles.effectsRowContainer}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.effectsRowScroll}
                    >
                      {consolidateEffectsArray(enemy.effects).map((eff, ei) => (
                        <View
                          key={`enemy_${enemy.uid}_${eff.type}_${ei}`}
                          style={[
                            styles.effectBadge,
                            { backgroundColor: STATUS_COLORS[eff.type] || '#666' },
                          ]}
                        >
                          <Text style={styles.effectText}>
                            {STATUS_EMOJIS[eff.type] || '❓'}{eff.duration > 0 ? eff.duration : ''}
                            {eff.stacks > 1 && (
                              <Text style={styles.effectStackText}> x{eff.stacks}</Text>
                            )}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          {dyingEnemies.map((enemy) => (
            <DyingEnemyCard key={`dying_${enemy.uid}`} enemy={enemy} />
          ))}
        </ScrollView>
      </View>

      {/* ══ Zone 2: Turn header + Hero card + Actions ════════════════ */}
      <View style={styles.heroActionSection}>

        {/* ── YOUR TURN / ENEMY TURN header — always visible at top ── */}
        <View style={styles.sectionDivider}>
          <View style={styles.dividerLine} />
          <Text style={[
            styles.dividerLabel,
            combatPhase === 'enemyTurn' && { color: theme.COLORS.damageRed },
          ]}>
            {combatPhase === 'playerTurn' ? 'YOUR TURN' : 'ENEMY TURN'}
          </Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── Hero card + action buttons (same row) ── */}
        <View style={styles.heroCardAndButtonsRow}>

          {/* Hero card — same structure as enemy cards */}
          <View style={styles.heroCard}>

            {/* Sprite backlight — radial gold halo behind Mochi */}
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id="heroBacklight" cx="50%" cy="40%" r="45%">
                  <Stop offset="0%" stopColor="#F5CF4A" stopOpacity="0.14" />
                  <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#heroBacklight)" />
            </Svg>

            {/* Canvas Viewport (Top 70%) */}
            <View style={styles.spriteCanvas}>
              <View style={styles.spriteWrapper}>
                {/* Stage platform glow — same as enemies, always gold */}
                <View style={[styles.heroStagePlatform, { bottom: Math.round(105 * 0.18) }]}>
                  <Svg width={100} height={16}>
                    <Defs>
                      <RadialGradient id="heroStageGlow" cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor="#F5CF4A" stopOpacity="0.28" />
                        <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
                      </RadialGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#heroStageGlow)" rx={8} />
                  </Svg>
                </View>

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
                      displaySize={105}
                      style={styles.heroCardSprite}
                    />
                  );
                })()}
              </View>
            </View>

            {/* Divider Line */}
            <View style={styles.hudDivider} />

            {/* HUD Tray (Bottom 30%) */}
            <View style={styles.hudTray}>
              <Text style={styles.enemyName}>Mochi</Text>
              <View style={{ width: '100%' }}>
                <ResourceBar variant="heroHp" current={heroState.hp} max={heroState.maxHp} />
              </View>

              {/* Status Row (Always rendered to reserve height, scrollable horizontally) */}
              <View style={styles.effectsRowContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.effectsRowScroll}
                >
                  {consolidateEffectsArray(heroState.effects).map((eff, ei) => (
                    <View
                      key={`hero_${eff.type}_${ei}`}
                      style={[
                        styles.effectBadge,
                        { backgroundColor: STATUS_COLORS[eff.type] || '#666' },
                      ]}
                    >
                      <Text style={styles.effectText}>
                        {STATUS_EMOJIS[eff.type] || '❓'}{eff.duration > 0 ? eff.duration : ''}
                        {eff.stacks > 1 && (
                          <Text style={styles.effectStackText}> x{eff.stacks}</Text>
                        )}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>

          {/* ── Action side ── */}
          <View style={styles.actionSide}>
            {combatPhase === 'playerTurn' && (
              <View style={styles.actionGrid}>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnAttack]}
                    onPress={handleAttack}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.actionBtnIcon}>⚔️</Text>
                    <Text style={[styles.actionBtnTitle, { color: '#5CC489' }]}>ATTACK</Text>
                    <Text style={styles.actionBtnSub}>Basic Strike</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, totalConsumables > 0 ? styles.actionBtnItem : styles.actionBtnEmpty]}
                    onPress={() => totalConsumables > 0 && setShowItemModal(true)}
                    activeOpacity={0.75}
                    disabled={totalConsumables === 0}
                  >
                    <Text style={styles.actionBtnIcon}>🧪</Text>
                    <Text style={[styles.actionBtnTitle, { color: totalConsumables > 0 ? '#F5CF4A' : '#5A5A5A' }]}>ITEMS</Text>
                    <Text style={styles.actionBtnSub}>{totalConsumables > 0 ? `${totalConsumables} in bag` : 'empty bag'}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.actionRow}>
                  {renderSkillButton(0)}
                  {renderSkillButton(1)}
                </View>
              </View>
            )}

            {combatPhase === 'enemyTurn' && (
              <View style={styles.enemyTurnBox}>
                <Text style={styles.enemyTurnPulse}>⚔️</Text>
                <Text style={styles.enemyTurnText}>Enemies are acting…</Text>
              </View>
            )}
          </View>

        </View>
      </View>

      {/* ══ Zone 3: Battle log — takes all remaining space ══════════════ */}
      <View style={styles.logSection}>
        <View style={styles.sectionDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>BATTLE LOG</Text>
          <View style={styles.dividerLine} />
        </View>
        <View style={styles.logContainer}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.logContainerInner}
            showsVerticalScrollIndicator={true}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {combatLog.map((msg, i) => renderLogText(msg, i))}
          </ScrollView>
        </View>
      </View>

      {/* ── Item selection modal ─────────────────────────────────────── */}
      <Modal
        visible={showItemModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowItemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id="itemModalGlow" cx="50%" cy="0%" r="55%">
                  <Stop offset="0%" stopColor="#3FB56E" stopOpacity="0.08" />
                  <Stop offset="100%" stopColor="#111317" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="#111317" rx={20} />
              <Rect width="100%" height="100%" fill="url(#itemModalGlow)" rx={20} />
              <Rect x="1" y="1" width="98%" height="98%" rx={19} fill="none" stroke="rgba(16, 185, 129, 0.15)" strokeWidth={1} />
            </Svg>

            <View style={styles.modalContentInner}>
              <Text style={styles.modalTitle}>🧪 Supplies Bag</Text>

              <ScrollView style={styles.modalItemScroll} showsVerticalScrollIndicator={false}>
                {runConsumables.length === 0 ? (
                  <Text style={styles.modalEmpty}>No potions or items available.</Text>
                ) : (
                  runConsumables.map((entry) => {
                    const def = CONSUMABLES.find((c) => c.id === entry.id);
                    return (
                      <TouchableOpacity
                        key={entry.id}
                        style={styles.modalItem}
                        onPress={() => handleUseItem(entry)}
                        activeOpacity={0.8}
                      >
                        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                          <Rect width="100%" height="100%" fill="rgba(255,255,255,0.01)" rx={10} />
                          <Rect x="1" y="1" width="98%" height="98%" rx={9} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                        </Svg>
                        <View style={styles.modalItemInner}>
                          <Text style={styles.modalItemName}>
                            {def?.name || entry.id} ×{entry.quantity}
                          </Text>
                          <Text style={styles.modalItemDesc}>
                            {def?.description || ''}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setShowItemModal(false)}
                style={{ width: '100%', marginTop: 16 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Victory / Loot Overlay ───────────────────────────────────── */}
      {combatPhase === 'loot' && lootResult && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id="victoryGlow" cx="50%" cy="0%" r="55%">
                  <Stop offset="0%" stopColor="#FBBF24" stopOpacity="0.08" />
                  <Stop offset="100%" stopColor="#0E0F14" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="#0E0F14" rx={20} />
              <Rect width="100%" height="100%" fill="url(#victoryGlow)" rx={20} />
              <Rect x="1" y="1" width="98%" height="98%" rx={19} fill="none" stroke="rgba(251, 191, 36, 0.18)" strokeWidth={1} />
            </Svg>

            <View style={styles.overlayInner}>
              <Text style={styles.victoryTitle}>🎉 Victory!</Text>

              {/* Loot breakdown */}
              <View style={styles.lootSection}>
                {lootResult.xp > 0 && (
                  <Text style={styles.lootLine}>✨ XP: +{lootResult.xp}</Text>
                )}
                {lootResult.gold > 0 && (
                  <Text style={styles.lootLine}>💰 Gold: +{lootResult.gold}</Text>
                )}
                {Object.entries(lootResult.materials).map(([itemId, qty]) => {
                  let matEmoji = '💎';
                  if (itemId.startsWith('black')) matEmoji = '🖤';
                  if (itemId.startsWith('green')) matEmoji = '💚';
                  if (itemId.startsWith('yellow')) matEmoji = '💛';
                  return (
                    <Text key={itemId} style={styles.lootLine}>
                      {matEmoji} {itemId.replace(/_/g, ' ').toUpperCase()}: ×{qty}
                    </Text>
                  );
                })}
              </View>

              {/* Level up messages */}
              {levelUpMessages.length > 0 && (
                <View style={styles.levelUpSection}>
                  {levelUpMessages.map((msg, i) => (
                    <Text key={`lu_${i}`} style={styles.levelUpText}>
                      🌟 {msg}
                    </Text>
                  ))}
                </View>
              )}

              <Button
                title={roomType === 'boss' ? '🏕️ Return to Camp' : '➡️ Return to Map'}
                variant="primary"
                onPress={handleContinue}
                style={{ width: '100%', marginTop: 16 }}
              />
            </View>
          </View>
        </View>
      )}

      {/* ── Defeat Overlay ───────────────────────────────────────────── */}
      {combatPhase === 'defeat' && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Rect width="100%" height="100%" fill="#140A0A" rx={20} />
              <Rect x="1" y="1" width="98%" height="98%" rx={19} fill="none" stroke="rgba(255, 68, 68, 0.2)" strokeWidth={1} />
            </Svg>

            <View style={styles.overlayInner}>
              <Text style={styles.defeatTitle}>💀 Defeated…</Text>
              <Text style={styles.defeatSubtext}>
                Mochi retreats to camp, battered but alive.
              </Text>

              <View style={styles.lostLootBox}>
                <Text style={styles.lostLootTitle}>Loot Lost in the Depths:</Text>
                {state.currentRun.lootCollected.gold === 0 && Object.keys(state.currentRun.lootCollected.materials).length === 0 ? (
                  <Text style={styles.noLostLootText}>No materials or gold were collected this run.</Text>
                ) : (
                  <>
                    {state.currentRun.lootCollected.gold > 0 && (
                      <Text style={styles.lostLootGold}>💰 {state.currentRun.lootCollected.gold} Gold</Text>
                    )}
                    {Object.entries(state.currentRun.lootCollected.materials).map(([id, qty]) => {
                      let matEmoji = '💎';
                      if (id.startsWith('black')) matEmoji = '🖤';
                      if (id.startsWith('green')) matEmoji = '💚';
                      if (id.startsWith('yellow')) matEmoji = '💛';
                      return (
                        <Text key={id} style={styles.lostLootItemText}>
                          {matEmoji} {id.replace(/_/g, ' ').toUpperCase()} ×{qty}
                        </Text>
                      );
                    })}
                  </>
                )}
              </View>

              <Button
                title="🏕️ Return to Camp"
                variant="danger"
                onPress={handleDefeatReturn}
                style={{ width: '100%', marginTop: 16 }}
              />
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );

  // ── Skill button renderer ──────────────────────────────────────────────
  function renderSkillButton(slotIndex) {
    const skillId = state.hero.equippedSkills[slotIndex];
    const skillDef = skillId ? SKILLS[skillId] : null;
    const cd = skillId ? cooldowns[skillId] || 0 : 0;
    const isOnCooldown = cd > 0;
    const hasSkill = !!skillDef;
    const isDisabled = !hasSkill || isOnCooldown;

    const btnStyle = hasSkill
      ? isOnCooldown ? styles.actionBtnSkillCooldown : styles.actionBtnSkill
      : styles.actionBtnEmpty;
    const titleColor = hasSkill ? (isOnCooldown ? '#9C7D44' : '#A98EE0') : '#5A5A5A';
    const subText = !hasSkill
      ? 'empty slot'
      : isOnCooldown
        ? `${cd} turn${cd !== 1 ? 's' : ''}`
        : 'Ready';

    return (
      <TouchableOpacity
        key={slotIndex}
        style={[styles.actionBtn, btnStyle, isDisabled && { opacity: isOnCooldown ? 0.65 : 0.38 }]}
        onPress={() => !isDisabled && handleSkill(slotIndex)}
        activeOpacity={0.75}
        disabled={isDisabled}
      >
        <Text style={styles.actionBtnIcon}>{hasSkill ? '✨' : '—'}</Text>
        <Text style={[styles.actionBtnTitle, { color: titleColor }]}>
          {hasSkill ? skillDef.name.toUpperCase() : `SKILL ${slotIndex + 1}`}
        </Text>
        <Text style={styles.actionBtnSub}>{subText}</Text>
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
      <View style={styles.spriteWrapper}>
        <AnimatedSprite
          source={animData.source}
          frameSize={animData.frameSize}
          totalFrames={animData.frames}
          fps={8}
          loop={false}
          displaySize={enemy.isBoss ? 134 : 110}
          flipX
        />
      </View>
      <View style={styles.hudDivider} />
      <View style={styles.hudTray}>
        <Text style={styles.enemyName} numberOfLines={1}>
          {enemy.name}
        </Text>
        <View style={styles.hpPlaceholder} />
        <View style={styles.effectsRowContainer} />
      </View>
    </Animated.View>
  );
}



// ============================================================================
// Styles — Twilight Obsidian & Gilded Amber Theme
// ============================================================================
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.COLORS.voidNavy,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'System',
    fontSize: 16,
    color: '#707F94',
    fontWeight: 'bold',
  },

  /* ── Combat Header ─────────────────────────────────────────── */
  combatHeader: {
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: theme.BORDER_RADIUS.card,
    overflow: 'hidden',
  },
  combatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    zIndex: 2,
  },
  combatHeaderLeft: {
    flex: 1,
  },
  encounterTypeLabel: {
    ...theme.FONTS.label,
    fontSize: 12,
    color: theme.COLORS.ghostWhite,
    letterSpacing: 1,
    marginBottom: 3,
  },
  narratorFlavor: {
    ...theme.FONTS.small,
    fontSize: 10,
    color: 'rgba(207,224,238,0.45)',
    fontStyle: 'italic',
  },
  turnPill: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: theme.BORDER_RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  turnPillText: {
    ...theme.FONTS.label,
    fontSize: 9,
    color: 'rgba(207,224,238,0.6)',
  },

  /* ── Section divider ──────────────────────────────── */
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dividerLabel: {
    ...theme.FONTS.label,
    fontSize: 9,
    letterSpacing: 1.5,
    color: 'rgba(207,224,238,0.35)',
  },

  /* ── Enemy Section ─────────────────────────────────── */
  enemySectionWrapper: {
    height: 240,
    justifyContent: 'center',
    marginTop: 6,
  },
  enemyRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: SCREEN_WIDTH,
  },
  enemyCard: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 16,
    padding: 8,
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 140,
    height: 210,
    position: 'relative',
  },
  enemyCardSelected: {
    borderColor: theme.COLORS.treasureGold,
    backgroundColor: 'rgba(245, 207, 74, 0.05)',
    shadowColor: theme.COLORS.treasureGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  enemyCardBoss: {
    width: 170,
    height: 230,
  },
  spriteWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  spriteCanvas: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  hudDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 4,
  },
  hudTray: {
    width: '100%',
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  effectsRowContainer: {
    width: '100%',
    height: 20,
    marginTop: 4,
  },
  effectsRowScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    gap: 3,
  },
  stagePlatform: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 1,
  },
  enemySprite: {
    zIndex: 5,
  },
  enemyInfoBlock: {
    width: '100%',
    alignItems: 'center',
    marginTop: 6,
  },
  enemyName: {
    ...theme.FONTS.body,
    color: theme.COLORS.textBright,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },

  /* ── Status effects ────────────────────────────────────────── */
  effectsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 4,
    gap: 3,
  },
  effectsRowHero: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 4,
    gap: 3,
  },
  effectBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  effectText: {
    ...theme.FONTS.small,
    fontSize: 9,
    color: '#FFF',
    fontWeight: 'bold',
  },
  effectStackText: {
    fontSize: 7,
    fontWeight: 'normal',
    color: 'rgba(255, 255, 255, 0.85)',
  },

  /* ── Intent badge ──────────────────────────────────────────── */
  intentBadge: {
    backgroundColor: 'rgba(255, 68, 68, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 68, 68, 0.25)',
  },
  intentText: {
    ...theme.FONTS.small,
    fontSize: 8,
    color: theme.COLORS.danger,
    fontWeight: '900',
  },



  /* ── Zone 2: Turn section (column) ──────────────────── */
  heroActionSection: {
    marginHorizontal: 14,
    marginTop: 6,
    marginBottom: 6,
    gap: 8,
  },
  heroCardAndButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
    height: 240,
  },
  heroCard: {
    width: 140,
    borderWidth: 2,
    borderColor: 'rgba(212,167,84,0.35)',
    borderRadius: 16,
    paddingTop: 36,
    paddingBottom: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(212,167,84,0.04)',
    position: 'relative',
    shadowColor: theme.COLORS.treasureGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  heroCardSprite: {
    zIndex: 5,
  },
  heroStagePlatform: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 1,
  },
  actionSide: {
    flex: 1,
  },

  /* ── Combat log ────────────────────────────────────────────── */
  logSection: {
    flex: 1,
    minHeight: 70,
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 10,
  },
  logContainer: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  logContainerInner: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    justifyContent: 'flex-start',
    gap: 2,
  },
  logText: {
    ...theme.FONTS.small,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },

  /* ── Action buttons (inside actionSide) ──────────────────────── */
  actionGrid: {
    flex: 1,
    gap: 6,
  },
  actionRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  actionBtnAttack: {
    backgroundColor: '#10241A',
    borderColor: '#1D4A32',
  },
  actionBtnSkill: {
    backgroundColor: '#1A1230',
    borderColor: '#382860',
  },
  actionBtnSkillCooldown: {
    backgroundColor: '#1A1408',
    borderColor: '#3A2C14',
  },
  actionBtnItem: {
    backgroundColor: '#2A2010',
    borderColor: '#57431A',
  },
  actionBtnEmpty: {
    backgroundColor: '#141414',
    borderColor: '#222222',
  },
  actionBtnIcon: {
    fontSize: 22,
    lineHeight: 26,
  },
  actionBtnTitle: {
    ...theme.FONTS.label,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '800',
  },
  actionBtnSub: {
    ...theme.FONTS.small,
    fontSize: 9,
    color: 'rgba(207,224,238,0.35)',
    letterSpacing: 0.3,
  },
  enemyTurnBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  enemyTurnPulse: {
    fontSize: 28,
    lineHeight: 34,
    opacity: 0.7,
  },
  enemyTurnText: {
    ...theme.FONTS.body,
    color: 'rgba(207,224,238,0.55)',
    fontStyle: 'italic',
  },
  enemyTurnHint: {
    ...theme.FONTS.small,
    fontSize: 10,
    color: 'rgba(207,224,238,0.25)',
  },

  /* ── Item modal ────────────────────────────────────────────── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
  },
  modalContentInner: {
    padding: 20,
    zIndex: 2,
  },
  modalTitle: {
    fontFamily: 'System',
    fontSize: 18,
    color: '#F8FAFC',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 14,
  },
  modalItemScroll: {
    maxHeight: 250,
  },
  modalEmpty: {
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
  modalItemInner: {
    zIndex: 2,
    padding: 2,
  },
  modalItemName: {
    ...theme.FONTS.body,
    color: theme.COLORS.parchment,
    fontWeight: 'bold',
  },
  modalItemDesc: {
    ...theme.FONTS.small,
    color: theme.COLORS.warmGlow,
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

  // ── Overlay inner content ─────────────────────────────────────────────────
  overlayInner: {
    padding: 24,
    zIndex: 2,
    alignItems: 'center',
    width: '100%',
  },
  lostLootBox: {
    backgroundColor: 'rgba(216, 72, 63, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(216, 72, 63, 0.2)',
    borderRadius: theme.BORDER_RADIUS.md,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.SPACING.md,
    gap: 6,
  },
  lostLootTitle: {
    ...theme.FONTS.label,
    fontSize: 10,
    color: theme.COLORS.damageRed,
  },
  noLostLootText: {
    ...theme.FONTS.small,
    color: 'rgba(207,224,238,0.4)',
    fontStyle: 'italic',
  },
  lostLootGold: {
    ...theme.FONTS.body,
    color: 'rgba(207,224,238,0.5)',
    textDecorationLine: 'line-through',
  },
  lostLootItemText: {
    ...theme.FONTS.body,
    color: 'rgba(207,224,238,0.5)',
    textDecorationLine: 'line-through',
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
