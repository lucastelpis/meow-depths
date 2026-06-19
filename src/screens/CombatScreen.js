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
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Ellipse, Circle, Path } from 'react-native-svg';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { ZONES } from '../data/zones';
import { ENEMIES, STAR_MULTIPLIERS } from '../data/enemies';
import { SKILLS, SKILL_SPRITE_FRAMES } from '../data/skills';
import { CONSUMABLES, MATERIALS, GEAR } from '../data/gear';
import AnimatedSprite from '../components/AnimatedSprite';
import ScreenLoader from '../components/ScreenLoader';
import Button from '../components/ui/Button';
import ResourceBar from '../components/ui/ResourceBar';
import ItemSprite from '../components/ItemSprite';
import { HERO_SPRITE, getEnemySprite } from '../constants/sprites';
import {
  executeAttack,
  executeEnemyTurn,
  processStatusEffects,
  useConsumable,
  executeSkill,
  selectEnemyMove,
  executeFireSlash,
  executeFireBurst,
  executeFlameGuard,
  applyBurn,
  executeTidalStrike,
  executeTidalWave,
  executeHealingCurrent,
  executeBoulderSlash,
  executeFortify,
  executeDualSlash,
  executeWhirlwind,
} from '../logic/combatEngine';
import { calculateEncounterLoot } from '../logic/lootEngine';
import { calculateEffectiveStats, checkLevelUp, getStanceBonus, applyHealingEfficiency } from '../logic/progressionEngine';
import { useGame } from '../state/gameState';
import theme from '../constants/theme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ─── SVG Soft Icon Glow Background Component ─────────────────────────────────
function IconGlowBackground({ size = 56 }) {
  const radius = size / 2;
  return (
    <View style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id={`iconGlowGrad-${size}`} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#FFF3DA" stopOpacity="0.65" />
            <Stop offset="50%" stopColor="#E8A73A" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#E8A73A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={radius} cy={radius} r={radius} fill={`url(#iconGlowGrad-${size})`} />
      </Svg>
    </View>
  );
}

// ─── Decorative 4-point sparkle ──────────────────────────────────────────────
function Sparkle({ size = 12, color = '#F4D079', style }) {
  const c = size / 2;
  const r = size / 2;
  const i = r * 0.28; // inner waist
  const d = `M${c},${c - r} L${c + i},${c - i} L${c + r},${c} L${c + i},${c + i} L${c},${c + r} L${c - i},${c + i} L${c - r},${c} L${c - i},${c - i} Z`;
  return (
    <View style={style} pointerEvents="none">
      <Svg width={size} height={size}>
        <Path d={d} fill={color} />
      </Svg>
    </View>
  );
}

// ─── Soft blurred ellipse shadow (ground shadow under elements) ───────────────
function SoftEllipseShadow({ width = 80, height = 18, color = '#2A1A0C', style }) {
  return (
    <View style={style} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="softShadowGrad" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <Stop offset="55%" stopColor={color} stopOpacity="0.6" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill="url(#softShadowGrad)" />
      </Svg>
    </View>
  );
}

/** Returns a Promise that resolves after `ms` milliseconds.
 *  Awaiting this inside an async function lets React render between phases. */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Sprite display sizes in combat (can be tweaked to scale characters up or down)
const ENEMY_DISPLAY_SIZE = 150;
const HERO_DISPLAY_SIZE = ENEMY_DISPLAY_SIZE; // hero matches enemy size for cohesion
const BOSS_DISPLAY_SIZE = 160;

// Width of an enemy node (info block + sprite) on the stage
const ENEMY_NODE_WIDTH = 120;

// ---------------------------------------------------------------------------
// Enemy stage layout — where each enemy stands given the total count.
// Coordinates are percentages of the enemy stage half; each node is centered
// on its point (see ENEMY_NODE_WIDTH + marginLeft offset in styles).
// ---------------------------------------------------------------------------
const ENEMY_LAYOUTS = {
  1: [{ left: '50%', top: '32%', zIndex: 2 }],
  2: [
    { left: '34%', top: '26%', zIndex: 2 },
    { left: '64%', top: '46%', zIndex: 3 },
  ],
  3: [
    { left: '28%', top: '30%', zIndex: 2 },
    { left: '60%', top: '18%', zIndex: 3 },
    { left: '74%', top: '42%', zIndex: 4 },
  ],
  4: [
    { left: '32%', top: '18%', zIndex: 2 },
    { left: '66%', top: '30%', zIndex: 3 },
    { left: '28%', top: '42%', zIndex: 4 },
    { left: '62%', top: '54%', zIndex: 5 },
  ],
};

/** Return the positioning slots for a given enemy count (clamped 1-4). */
function getEnemyLayout(count) {
  const clamped = Math.max(1, Math.min(4, count));
  return ENEMY_LAYOUTS[clamped] || ENEMY_LAYOUTS[4];
}


/** Map enemy ids (or keywords) to display emojis */
const ENEMY_EMOJI_MAP = {
  rat: '🐀',
  slime: '🟢',
  cockroach: '🪳',
  frog: '🐸',
  boss: '👑',
  thorn: '🌿',
  beetle: '🐛',
  mushroom: '🍄',
  vine: '🌿',
  crab: '🦀',
  eel: '🐍',
  sailor: '👻',
  puffer: '🐡',
  king: '👑',
  root: '🍄',
  captain: '👑',
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
  burn: '🔥',
  bleed: '🩸',
  guard: '🛡️',
  def_buff: '🛡️',
  stun: '😵‍💫',
  deathMark: '💀',
  stealth: '🌫️',
  counter: '⚔️',
  debuff_attack: '📉',
  atk_reduce: '⬇️',
  dodge_reduce: '📉',
  crit_reduce: '📉',
  hot: '💧',
};

// Sprite frames from status-icons-1.png (18-frame horizontal sheet).
// Effects without an entry here fall back to their emoji.
const STATUS_SPRITE_FRAMES = {
  burn: 0,
  stun: 2,
  bleed: 3,
  atk_reduce: 5,
  debuff_attack: 5,
  def_buff: 6,
  guard: 6,
  hot: 8,
  counter: 17,
  dodge_reduce: 19,
  stealth: 20,
  deathMark: 21,
  crit_reduce: 23,
};

function consolidateEffectsArray(effectsList) {
  const groups = {};
  (effectsList || []).forEach((eff) => {
    if (!eff) return;
    if (!groups[eff.type]) {
      groups[eff.type] = { ...eff, stacks: eff.stacks || 1 };
    } else {
      const existing = groups[eff.type];
      if (eff.type === 'atk_reduce' || eff.type === 'dodge_reduce' || eff.type === 'crit_reduce' || eff.type === 'def_buff') {
        existing.duration = eff.duration;
        existing.value = eff.value;
        existing.stacks = 1;
      } else {
        existing.duration = Math.max(existing.duration, eff.duration);
        if (eff.damage !== undefined) {
          existing.damage = (existing.damage || 0) + eff.damage;
        }
        existing.stacks = (existing.stacks || 1) + (eff.stacks || 1);
      }
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
      if (newEffect.type === 'atk_reduce' || newEffect.type === 'dodge_reduce' || newEffect.type === 'crit_reduce' || newEffect.type === 'def_buff') {
        if (newEffect.type === 'atk_reduce') {
          existing.duration = Math.max(existing.duration || 0, newEffect.duration || 0);
          existing.value = Math.max(existing.value || 0, newEffect.value || 0);
        } else {
          existing.duration = newEffect.duration;
          existing.value = newEffect.value;
        }
        existing.stacks = 1;
      } else {
        existing.duration = newEffect.duration;
        if (newEffect.damage !== undefined) {
          existing.damage = (existing.damage || 0) + newEffect.damage;
        }
        existing.stacks = (existing.stacks || 1) + (newEffect.stacks || 1);
      }
      existing.isNew = true; // Mark as new so it doesn't tick down on the turn it's applied
      list[existingIndex] = existing;
    } else {
      list.push({
        ...newEffect,
        stacks: newEffect.stacks || 1,
        isNew: true, // Mark as new
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
  const { roomType, battleRating = 1, enemyCount } = route.params || { roomType: 'combat', battleRating: 1 };
  const { state, dispatch } = useGame();

  // ── Assets to preload before combat is interactable ───────────────────────
  // Hero base sprites + every skill the player has equipped
  const assetsToPreload = React.useMemo(() => {
    const sources = [
      HERO_SPRITE.idle.source,
      HERO_SPRITE.attack.source,
      HERO_SPRITE.guard.source,
    ];
    (state.hero?.equippedSkills || []).forEach((skillId) => {
      const src = skillId && HERO_SPRITE[skillId]?.source;
      if (src) sources.push(src);
    });
    return sources;
  }, []);


  // ── Local combat state ───────────────────────────────────────────────────
  const [combatPhase, setCombatPhase] = useState('start');
  const [enemiesState, setEnemiesState] = useState({ alive: [], dying: [] });
  const enemies = enemiesState.alive;
  const dyingEnemies = enemiesState.dying;

  const setEnemies = useCallback((val) => {
    setEnemiesState(prev => ({
      ...prev,
      alive: typeof val === 'function' ? val(prev.alive) : val
    }));
  }, []);

  const setDyingEnemies = useCallback((val) => {
    setEnemiesState(prev => ({
      ...prev,
      dying: typeof val === 'function' ? val(prev.dying) : val
    }));
  }, []);

  const [heroState, setHeroState] = useState(null);
  const [selectedEnemyIndex, setSelectedEnemyIndex] = useState(0);
  // uid of the enemy currently taking its turn — drives the "acting" highlight
  const [activeEnemyUid, setActiveEnemyUid] = useState(null);
  const [cooldowns, setCooldowns] = useState({});
  const [combatLog, setCombatLog] = useState([]);
  const [lootResult, setLootResult] = useState(null);
  const [turnCount, setTurnCount] = useState(0);
  const [runConsumables, setRunConsumables] = useState([]);
  const [narratorText, setNarratorText] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showFleeConfirmModal, setShowFleeConfirmModal] = useState(false);
  const [infoSkillId, setInfoSkillId] = useState(null);
  const [levelUpMessages, setLevelUpMessages] = useState([]);

  // ── Animation state ───────────────────────────────────────────────────────
  // 'idle' | 'attack' | 'guard'  — controls which sprite sheet plays for the hero
  const [heroAnim, setHeroAnim] = useState('idle');
  // { [enemy.uid]: 'idle' | 'attack' }  — per-enemy animation state
  const [enemyAnims, setEnemyAnims] = useState({});
  const [heroAnimFps, setHeroAnimFps] = useState(10);
  const [enemyAnimFps, setEnemyAnimFps] = useState(10);

  // Translation values for lunge animation when attacking
  const heroTranslateX = useRef(new Animated.Value(0)).current;
  const enemyTranslatesRef = useRef({});

  const getEnemyTranslateX = useCallback((uid) => {
    if (!enemyTranslatesRef.current[uid]) {
      enemyTranslatesRef.current[uid] = new Animated.Value(0);
    }
    return enemyTranslatesRef.current[uid];
  }, []);

  // Damage red overlay opacity values
  const heroDamageOpacity = useRef(new Animated.Value(0)).current;
  const enemyDamageOpacitiesRef = useRef({});

  const getEnemyDamageOpacity = useCallback((uid) => {
    if (!enemyDamageOpacitiesRef.current[uid]) {
      enemyDamageOpacitiesRef.current[uid] = new Animated.Value(0);
    }
    return enemyDamageOpacitiesRef.current[uid];
  }, []);

  // Target Selection border/glow pulsing animation value
  const targetBlinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(targetBlinkAnim, {
          toValue: 0.1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(targetBlinkAnim, {
          toValue: 1.0,
          duration: 300,
          useNativeDriver: false,
        }),
      ])
    );

    if (combatPhase === 'playerTurn') {
      anim.start();
    } else {
      anim.stop();
      targetBlinkAnim.setValue(1);
    }

    return () => {
      anim.stop();
    };
  }, [combatPhase]);

  const targetBorderColor = targetBlinkAnim.interpolate({
    inputRange: [0.1, 1.0],
    outputRange: ['rgba(245, 207, 74, 0.2)', 'rgba(245, 207, 74, 1)'],
  });

  const targetBackgroundColor = targetBlinkAnim.interpolate({
    inputRange: [0.1, 1.0],
    outputRange: ['rgba(245, 207, 74, 0.02)', 'rgba(245, 207, 74, 0.12)'],
  });

  const triggerHeroAttackLunge = useCallback((duration) => {
    const totalTime = duration || 800;
    const forwardTime = Math.round(totalTime * 0.3);
    const backTime = Math.round(totalTime * 0.7);

    Animated.sequence([
      Animated.timing(heroTranslateX, {
        toValue: 24, // Slide 24px forward (right)
        duration: forwardTime,
        useNativeDriver: true,
      }),
      Animated.timing(heroTranslateX, {
        toValue: 0, // Return back
        duration: backTime,
        useNativeDriver: true,
      })
    ]).start();
  }, [heroTranslateX]);

  const triggerEnemyAttackLunge = useCallback((uid, duration) => {
    const anim = getEnemyTranslateX(uid);
    const totalTime = duration || 500;
    const forwardTime = Math.round(totalTime * 0.3);
    const backTime = Math.round(totalTime * 0.7);

    Animated.sequence([
      Animated.timing(anim, {
        toValue: -24, // Slide 24px forward (left, since enemies face left)
        duration: forwardTime,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 0, // Return back
        duration: backTime,
        useNativeDriver: true,
      })
    ]).start();
  }, [getEnemyTranslateX]);

  const triggerHeroRecoil = useCallback((duration) => {
    const totalTime = duration || 800;
    const recoilTime = Math.round(totalTime * 0.3); // 30% of time recoiling back
    const recoverTime = Math.round(totalTime * 0.7); // 70% of time recovering

    Animated.parallel([
      Animated.sequence([
        Animated.timing(heroTranslateX, {
          toValue: -12, // Recoil backward (left)
          duration: recoilTime,
          useNativeDriver: true,
        }),
        Animated.timing(heroTranslateX, {
          toValue: 0, // Return back
          duration: recoverTime,
          useNativeDriver: true,
        })
      ]),
      Animated.sequence([
        Animated.timing(heroDamageOpacity, {
          toValue: 0.75, // Flash red
          duration: recoilTime,
          useNativeDriver: true,
        }),
        Animated.timing(heroDamageOpacity, {
          toValue: 0, // Fade out
          duration: recoverTime,
          useNativeDriver: true,
        })
      ])
    ]).start();
  }, [heroTranslateX, heroDamageOpacity]);

  const triggerEnemyRecoil = useCallback((uid, duration) => {
    const anim = getEnemyTranslateX(uid);
    const opac = getEnemyDamageOpacity(uid);
    const totalTime = duration || 500;
    const recoilTime = Math.round(totalTime * 0.3); // 30% of time recoiling back
    const recoverTime = Math.round(totalTime * 0.7); // 70% of time recovering

    Animated.parallel([
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 12, // Recoil backward (right)
          duration: recoilTime,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0, // Return back
          duration: recoverTime,
          useNativeDriver: true,
        })
      ]),
      Animated.sequence([
        Animated.timing(opac, {
          toValue: 0.75, // Flash red
          duration: recoilTime,
          useNativeDriver: true,
        }),
        Animated.timing(opac, {
          toValue: 0, // Fade out
          duration: recoverTime,
          useNativeDriver: true,
        })
      ])
    ]).start();
  }, [getEnemyTranslateX, getEnemyDamageOpacity]);


  // Track defeated enemies for loot calculation at the end
  const defeatedEnemiesRef = useRef([]);
  const scrollViewRef = useRef(null);

  // ── Damage Popups State & Animators ───────────────────────────────────────
  const [popups, setPopups] = useState([]);
  const prevHeroHpRef = useRef(undefined);
  const prevEnemiesHpRef = useRef({});
  // UIDs that already had a popup fired directly this tick (skip HP-watcher for these)
  const pendingCritUids = useRef(new Set());

  const triggerDamagePopup = useCallback((targetUid, amount, isHeal = false, isMiss = false, isCrit = false) => {
    const id = `${targetUid}_${Date.now()}_${Math.random()}`;
    setPopups((prev) => [...prev, { id, targetUid, amount, isHeal, isMiss, isCrit }]);
  }, []);

  const removePopup = useCallback((id) => {
    setPopups((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Monitor Hero HP changes for damage and healing popups
  useEffect(() => {
    if (!heroState) return;

    if (prevHeroHpRef.current === undefined) {
      prevHeroHpRef.current = heroState.hp;
      return;
    }

    if (heroState.hp < prevHeroHpRef.current) {
      const damage = prevHeroHpRef.current - heroState.hp;
      if (damage > 0) {
        if (!pendingCritUids.current.has('hero')) {
          triggerDamagePopup('hero', damage, false);
        } else {
          pendingCritUids.current.delete('hero');
        }
      }
    } else if (heroState.hp > prevHeroHpRef.current) {
      const heal = heroState.hp - prevHeroHpRef.current;
      if (heal > 0) {
        triggerDamagePopup('hero', heal, true);
      }
    }
    prevHeroHpRef.current = heroState.hp;
  }, [heroState?.hp, triggerDamagePopup]);

  // Monitor Enemy HP changes for damage and healing popups (including death)
  useEffect(() => {
    if (!enemies) return;

    enemies.forEach((e) => {
      const prevHp = prevEnemiesHpRef.current[e.uid];
      if (prevHp === undefined) {
        prevEnemiesHpRef.current[e.uid] = e.hp;
      } else if (e.hp < prevHp) {
        const damage = prevHp - e.hp;
        if (damage > 0) {
          // Skip if a direct crit popup was already fired for this UID
          if (!pendingCritUids.current.has(e.uid)) {
            triggerDamagePopup(e.uid, damage, false);
          } else {
            pendingCritUids.current.delete(e.uid);
          }
        }
        prevEnemiesHpRef.current[e.uid] = e.hp;
      } else if (e.hp > prevHp) {
        const heal = e.hp - prevHp;
        if (heal > 0) {
          triggerDamagePopup(e.uid, heal, true);
        }
        prevEnemiesHpRef.current[e.uid] = e.hp;
      }
    });

    const currentUids = new Set(enemies.map((e) => e.uid));
    Object.keys(prevEnemiesHpRef.current).forEach((uid) => {
      if (!currentUids.has(uid)) {
        const prevHp = prevEnemiesHpRef.current[uid];
        if (prevHp > 0 && !pendingCritUids.current.has(uid)) {
          triggerDamagePopup(uid, prevHp, false);
        }
        pendingCritUids.current.delete(uid);
        delete prevEnemiesHpRef.current[uid];
      }
    });
  }, [enemies, triggerDamagePopup]);

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

    // Process Healing Current HoT tick
    if (updatedHero.playerHoT && updatedHero.playerHoT.turnsRemaining > 0) {
      const hot = updatedHero.playerHoT;
      const baseHeal = Math.floor(updatedHero.maxHp * hot.healPerTurn);
      const finalHeal = applyHealingEfficiency(baseHeal, updatedHero);
      updatedHero.hp = Math.min(updatedHero.maxHp, updatedHero.hp + finalHeal);

      const newTurns = hot.turnsRemaining - 1;
      if (newTurns > 0) {
        updatedHero.playerHoT = {
          ...hot,
          turnsRemaining: newTurns,
        };
      } else {
        updatedHero.playerHoT = null;
      }

      addLog(`💧 Healing Current tick: ${updatedHero.name || 'Mochi'} recovers ${finalHeal} HP!`);
      logged = true;
    }

    return { updatedHero, logged };
  }, [addLog]);

  // ── Initialisation (runs once on mount) ──────────────────────────────────
  useEffect(() => {
    // 1. Resolve the current zone
    const zone = ZONES[state.currentRun.zoneId];
    if (!zone) return;
    const floorNumber = state.currentRun.floorNumber || 1;

    // 2. Compute the hero's effective stats (gear + passives + set bonuses + run buffs)
    const eff = calculateEffectiveStats(state.hero, undefined, state.currentRun.runBuffs);

    // 3. Build local hero combat state
    const initHero = {
      name: state.hero.name || 'Mochi',
      hp: state.hero.hp,
      maxHp: eff.maxHp,
      attack: eff.attack,
      defence: eff.defence,
      critChance: eff.critChance,
      dodge: eff.dodge,
      effects: [],
      passives: eff.passives,
      gearSpecials: eff.gearSpecials,
      // Flame Guard state (Fire element T2B)
      flameGuardActive: false,
      flameGuardTurnsRemaining: 0,
      flameGuardBurnDamage: 0,
      flameGuardBurnDuration: 0,
    };
    setHeroState(initHero);

    // 4. Generate the encounter based on the room type
    let taggedEnemies = [];
    let pool = zone.enemies.map(id => ENEMIES[id]).filter(Boolean);
    // Respect per-enemy floor gating (e.g. Cockroach Knight has minFloor: 5).
    // Fall back to the unfiltered pool if gating would leave nothing to spawn.
    const floorGated = pool.filter(e => (e.minFloor || 1) <= floorNumber);
    if (floorGated.length > 0) pool = floorGated;
    if (floorNumber === 1) {
      const starGated = pool.filter(e => e.stars === 1);
      if (starGated.length > 0) pool = starGated;
    }

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
          cooldowns: {},
          spawnIndex: 0,
        };
        boss.intent = selectEnemyMove(boss);
        taggedEnemies = [boss];
      }
    } else {
      // Scale all spawned enemies by the room's battle rating (star level)
      // Handles both 'combat' and 'ambush' room types
      const makeScaledEnemy = (template, i) => {
        const mult = STAR_MULTIPLIERS[battleRating] || 1.0;

        const scaled = {
          ...template,
          uid: template.id + '_' + i,
          type: 'common',
          stars: battleRating,
          hp: Math.ceil(template.hp * mult),
          maxHp: Math.ceil(template.hp * mult),
          attack: Math.ceil(template.attack * mult),
          def: Math.max(1, Math.ceil((template.def || 0) * mult)),
          effects: [],
          cooldowns: {},
          spawnIndex: i,
        };
        return scaled;
      };

      let count = enemyCount;
      if (count === undefined) {
        // Fallback counts based on battle rating if not provided (e.g. testing or legacy path)
        if (battleRating === 1) count = 1;
        else if (battleRating === 2) count = 2;
        else if (battleRating === 3) count = 2;
        else if (battleRating === 4) count = 3;
        else count = 4;
      }

      for (let i = 0; i < count; i++) {
        const template = randomPick(pool);
        if (template) {
          taggedEnemies.push(makeScaledEnemy(template, i));
        }
      }
    }

    // Assign intents with awareness of other enemies on the field
    taggedEnemies = taggedEnemies.map(enemy => ({
      ...enemy,
      intent: selectEnemyMove(enemy, taggedEnemies),
    }));

    setEnemies(taggedEnemies);

    // Mark these creatures as encountered (unlocks their bestiary card in the
    // Journal). Marking on combat start means fleeing/losing still counts.
    const encounteredIds = taggedEnemies
      .map((e) => (e.id || '').replace(/^elite_/, ''))
      .filter(Boolean);
    if (encounteredIds.length > 0) {
      dispatch({ type: 'ENCOUNTER_CREATURES', payload: { enemyIds: encounteredIds } });
    }

    // 5. Initialise cooldowns for equipped skills
    const initCooldowns = {};
    (state.hero.equippedSkills || []).forEach((skillId) => {
      if (skillId) initCooldowns[skillId] = 0;
    });
    setCooldowns(initCooldowns);

    // 6. Consumables — currentRun.consumables is an array of ID strings
    //    (e.g. ['potion', 'potion', 'antidote']). Group them
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
      intent: selectEnemyMove(e, currentEnemies),
    }));
  }, []);

  // =========================================================================
  // ACTION: Basic Attack
  // =========================================================================
  const handleAttack = async () => {
    if (combatPhase !== 'playerTurn' || !heroState) return;

    const target = enemies[selectedEnemyIndex];
    if (!target || target.hp <= 0) return;

    // Lock player UI instantly
    setCombatPhase('enemyTurn');

    // Play hero attack animation (auto-returns to idle via onComplete)
    setHeroAnim('attack');

    // Calculate animation length
    const attackFrames = HERO_SPRITE.attack?.frames || 4;
    const animDuration = Math.round((attackFrames / 10) * 1000);

    triggerHeroAttackLunge(animDuration);

    // Execute the attack
    const result = executeAttack(heroState, target, heroState);
    if (result.damage > 0) {
      triggerEnemyRecoil(target.uid, animDuration);
      if (result.isCrit) {
        // Fire crit popup directly and mark UID so the HP-watcher skips it
        pendingCritUids.current.add(target.uid);
        triggerDamagePopup(target.uid, result.damage, false, false, true);
      }
    }
    if (result.isDodged) {
      triggerDamagePopup(target.uid, 0, false, true);
    }
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
    const attackDeadRes = processDeadEnemies(updatedEnemies);
    updatedEnemies = attackDeadRes.alive;
    updateEnemiesAndDyingEnemies(updatedEnemies, attackDeadRes.dead);

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
  // Burn bonus helper — stance + Smoldering passive combined
  // =========================================================================
  const getBurnBonus = () => {
    const stanceBonus = getStanceBonus(state.hero.element, state.hero.level);
    const stanceBurn = stanceBonus.burnTickBonus || 0;
    const smolderingEntry = (state.hero.unlockedSkills || {})['smoldering'];
    const smolderingBurn = smolderingEntry && state.hero.equippedSkills.includes('smoldering')
      ? (SKILLS['smoldering']?.stars?.[smolderingEntry.stars]?.burnTickBonus || 0)
      : 0;
    return stanceBurn + smolderingBurn;
  };

  // =========================================================================
  // ACTION: Use Skill
  // =========================================================================
  const handleSkill = async (slotIndex) => {
    if (combatPhase !== 'playerTurn' || !heroState) return;

    // Record pre-skill HP values for recoil detection
    const preSkillHps = {};
    enemies.forEach(e => {
      preSkillHps[e.uid] = e.hp;
    });

    let isMultiHit = false;

    const skillId = state.hero.equippedSkills[slotIndex];
    if (!skillId) {
      addLog('No skill equipped in that slot.');
      return;
    }

    // Passive skills have no button action
    const skillDef = SKILLS[skillId];
    if (!skillDef) return;
    if (skillDef.type === 'passive') {
      addLog(`${skillDef.name} is a passive skill — it's always active.`);
      return;
    }

    // Failsafe: if skill targets enemies, check if primary target is valid and alive
    const isTargeted = skillDef.targetType !== 'self' && skillDef.targetType !== 'passive';
    if (isTargeted) {
      const target = enemies[selectedEnemyIndex];
      if (!target || target.hp <= 0) return;
    }

    // Cooldown check
    if ((cooldowns[skillId] || 0) > 0) {
      addLog(`${skillDef.name} is on cooldown (${cooldowns[skillId]} turns).`);
      return;
    }

    // Lock player UI instantly
    setCombatPhase('enemyTurn');

    // Only set standard animation if this isn't a sequential multi-hit skill (handled inside loop)
    if (skillId !== 'dual_slash' && skillId !== 'whirlwind') {
      setHeroAnim(skillId);
    }

    // Set cooldown — fortify and whirlwind use per-star cooldowns defined in star data
    const stars = (state.hero.unlockedSkills[skillId]?.stars) || 1;
    const skillCooldown = (skillId === 'fortify' || skillId === 'whirlwind')
      ? (skillDef.stars[stars]?.cooldown ?? skillDef.cooldown)
      : skillDef.cooldown;
    const newCooldowns = { ...cooldowns, [skillId]: skillCooldown };
    setCooldowns(newCooldowns);

    let updatedHero = { ...heroState };
    let updatedEnemies = enemies.map(e => ({ ...e, effects: [...(e.effects || [])] }));
    const burnBonus = getBurnBonus();

    // ── Element skill routing ──────────────────────────────────────────────
    if (skillId === 'fire_slash') {
      const target = updatedEnemies[selectedEnemyIndex];
      if (!target) { setCombatPhase('playerTurn'); return; }
      const stars = (state.hero.unlockedSkills[skillId]?.stars) || 1;
      const result = executeFireSlash(skillDef, stars, updatedHero, target, burnBonus);
      updatedEnemies = updatedEnemies.map(e =>
        (e.uid || e.id) === result.targetUid
          ? { ...e, hp: Math.max(0, e.hp - result.damage), effects: [...(e.effects || [])] }
          : e
      );
      // burn was applied in-place on target's effects array; copy it back
      const burnUpdated = updatedEnemies.findIndex(e => (e.uid || e.id) === result.targetUid);
      if (burnUpdated >= 0) updatedEnemies[burnUpdated].effects = target.effects;
      addLog(result.log);

    } else if (skillId === 'fire_burst') {
      const stars = (state.hero.unlockedSkills[skillId]?.stars) || 1;
      const burst = executeFireBurst(skillDef, stars, updatedHero, updatedEnemies, selectedEnemyIndex, burnBonus);
      for (const res of burst.results) {
        updatedEnemies = updatedEnemies.map(e =>
          (e.uid || e.id) === res.targetUid
            ? { ...e, hp: Math.max(0, e.hp - res.damage) }
            : e
        );
      }
      addLog(burst.log);

    } else if (skillId === 'flame_guard') {
      const stars = (state.hero.unlockedSkills[skillId]?.stars) || 1;
      const guard = executeFlameGuard(skillDef, stars, burnBonus, updatedHero.name || 'Mochi');
      updatedHero = {
        ...updatedHero,
        flameGuardActive: guard.flameGuardActive,
        flameGuardTurnsRemaining: guard.flameGuardTurnsRemaining,
        flameGuardBurnDamage: guard.flameGuardBurnDamage,
        flameGuardBurnDuration: guard.flameGuardBurnDuration,
      };
      addLog(guard.log);

    } else if (skillId === 'tidal_strike') {
      const target = updatedEnemies[selectedEnemyIndex];
      if (!target) { setCombatPhase('playerTurn'); return; }
      const stars = (state.hero.unlockedSkills[skillId]?.stars) || 1;
      const result = executeTidalStrike(skillDef, stars, updatedHero, target);
      updatedEnemies = updatedEnemies.map(e =>
        (e.uid || e.id) === result.targetUid
          ? { ...e, hp: Math.max(0, e.hp - result.damage) }
          : e
      );
      const effectUpdated = updatedEnemies.findIndex(e => (e.uid || e.id) === result.targetUid);
      if (effectUpdated >= 0) {
        updatedEnemies[effectUpdated].effects = [...target.effects];
      }
      addLog(result.log);

    } else if (skillId === 'tidal_wave') {
      const stars = (state.hero.unlockedSkills[skillId]?.stars) || 1;
      const wave = executeTidalWave(skillDef, stars, updatedHero, updatedEnemies, selectedEnemyIndex);
      for (const res of wave.results) {
        updatedEnemies = updatedEnemies.map(e => {
          if ((e.uid || e.id) !== res.targetUid) return e;
          return {
            ...e,
            hp: Math.max(0, e.hp - res.damage),
            effects: [...(e.effects || [])]
          };
        });
      }
      addLog(wave.log);

    } else if (skillId === 'healing_current') {
      const hcStars = (state.hero.unlockedSkills[skillId]?.stars) || 1;
      const hc = executeHealingCurrent(skillDef, hcStars, updatedHero.name);
      updatedHero = {
        ...updatedHero,
        playerHoT: hc.playerHoT,
        effects: addStatusEffects(updatedHero.effects, { type: 'hot', duration: hc.playerHoT.duration }),
      };
      addLog(hc.log);

    } else if (skillId === 'boulder_slash') {
      const target = updatedEnemies[selectedEnemyIndex];
      if (!target) { setCombatPhase('playerTurn'); return; }
      const bsStars = (state.hero.unlockedSkills[skillId]?.stars) || 1;
      const result = executeBoulderSlash(skillDef, bsStars, updatedHero, target);
      updatedEnemies = updatedEnemies.map(e => {
        if ((e.uid || e.id) !== result.targetUid) return e;
        const newEffects = result.stunApplied
          ? addStatusEffects(e.effects, { type: 'stun', duration: 1 })
          : e.effects;
        return { ...e, hp: Math.max(0, e.hp - result.damage), effects: newEffects };
      });
      addLog(result.log);

    } else if (skillId === 'fortify') {
      const fyStars = (state.hero.unlockedSkills[skillId]?.stars) || 1;
      const result = executeFortify(skillDef, fyStars, updatedHero);
      updatedHero = {
        ...updatedHero,
        effects: addStatusEffects(updatedHero.effects, result.defBuff),
      };
      addLog(result.log);

    } else if (skillId === 'dual_slash' || skillId === 'whirlwind') {
      let result;
      if (skillId === 'dual_slash') {
        const target = updatedEnemies[selectedEnemyIndex];
        if (!target) { setCombatPhase('playerTurn'); return; }
        const dsStars = (state.hero.unlockedSkills[skillId]?.stars) || 1;
        result = executeDualSlash(skillDef, dsStars, updatedHero, target);
      } else {
        const wwStars = (state.hero.unlockedSkills[skillId]?.stars) || 1;
        result = executeWhirlwind(skillDef, wwStars, updatedHero, updatedEnemies, selectedEnemyIndex);
      }

      isMultiHit = true;
      addLog(result.log);

      if (result.hits && result.hits.length > 0) {
        const hitDuration = 350; // Snappy speed for each hit
        setHeroAnimFps(16); // play animation faster

        const hitFrames = HERO_SPRITE[skillId]?.frames || 8;
        const finalHitDuration = Math.round((hitFrames / 16) * 1000);

        for (let hitIdx = 0; hitIdx < result.hits.length; hitIdx++) {
          const hit = result.hits[hitIdx];

          // Determine the key: intermediate hits get suffix, last hit gets base skillId
          const isLastHit = hitIdx === result.hits.length - 1;
          const animKey = isLastHit ? skillId : `${skillId}_hit${hitIdx}`;
          const currentHitDuration = isLastHit ? finalHitDuration : hitDuration;

          setHeroAnim(animKey);
          triggerHeroAttackLunge(currentHitDuration);

          // Trigger recoils and popups for this hit's targets
          hit.targets.forEach(t => {
            if (t.isDodged) {
              triggerDamagePopup(t.uid, 0, false, true);
            } else if (t.damage > 0) {
              triggerEnemyRecoil(t.uid, currentHitDuration);
              if (t.isCrit) {
                pendingCritUids.current.add(t.uid);
                triggerDamagePopup(t.uid, t.damage, false, false, true);
              } else {
                pendingCritUids.current.add(t.uid);
                triggerDamagePopup(t.uid, t.damage, false, false, false);
              }
            } else {
              pendingCritUids.current.add(t.uid);
              triggerDamagePopup(t.uid, 0, false, false, false);
            }
          });

          // Apply damage to enemies in state
          updatedEnemies = updatedEnemies.map(e => {
            const targetDmg = hit.targets.find(t => t.uid === e.uid);
            if (targetDmg) {
              return { ...e, hp: Math.max(0, e.hp - targetDmg.damage) };
            }
            return e;
          });

          // Flush HP updates to the screen
          setEnemies(updatedEnemies);

          // Wait for this hit to finish before starting the next hit
          await delay(currentHitDuration);
        }

        // Reset animation back to idle and wait for render update
        setHeroAnim('idle');
        await delay(50);

        // Reset animation FPS to default
        setHeroAnimFps(10);

        // Wait a tiny bit extra to let the final hit's recovery finish
        await delay(150);
      }

    } else {
      // Fallback: legacy executeSkill path for any non-element skills
      const targets = getTargetsForSkill(skillDef, selectedEnemyIndex, enemies);
      const skillResult = executeSkill(skillDef, heroState, targets, heroState);
      addLog(skillResult.log);

      for (const res of skillResult.results) {
        if (res.isDodged && res.target !== undefined) {
          triggerDamagePopup(res.target, 0, false, true);
        }
        if (res.damage !== undefined && res.target !== undefined) {
          updatedEnemies = updatedEnemies.map((e) => {
            if ((e.uid || e.id) !== res.target) return e;
            const newHp = Math.max(0, e.hp - res.damage);
            let newEffects = e.effects || [];
            if (res.stunApplied && res.stunEffect) newEffects = addStatusEffects(newEffects, res.stunEffect);
            return { ...e, hp: newHp, effects: newEffects };
          });
        }
        if (res.type === 'heal' && res.healAmount) {
          const finalHeal = applyHealingEfficiency(res.healAmount, updatedHero);
          updatedHero = { ...updatedHero, hp: Math.min(updatedHero.maxHp, updatedHero.hp + finalHeal) };
        }
        if (res.type === 'guard' || res.type === 'stealth' || res.type === 'counter') {
          updatedHero = { ...updatedHero, effects: addStatusEffects(updatedHero.effects, res.effect) };
        }
        if (res.type === 'deathMark' && res.target !== undefined) {
          updatedEnemies = updatedEnemies.map((e) => {
            if ((e.uid || e.id) !== res.target) return e;
            return { ...e, effects: addStatusEffects(e.effects, res.effect) };
          });
        }
      }
    }

    setHeroState(updatedHero);

    // Remove dead enemies
    const skillDeadRes = processDeadEnemies(updatedEnemies);
    updatedEnemies = skillDeadRes.alive;
    updateEnemiesAndDyingEnemies(updatedEnemies, skillDeadRes.dead);

    if (!isMultiHit) {
      // Calculate animation length
      const animData = HERO_SPRITE[skillId] || HERO_SPRITE.attack;
      const animDuration = Math.round((animData.frames / 10) * 1000);

      // Trigger hero lunge if the skill is targeted
      if (isTargeted) {
        triggerHeroAttackLunge(animDuration);
      }

      // Trigger enemy damage recoil for any enemy whose HP decreased
      [...updatedEnemies, ...skillDeadRes.dead].forEach(e => {
        const preHp = preSkillHps[e.uid];
        if (preHp !== undefined && e.hp < preHp) {
          triggerEnemyRecoil(e.uid, animDuration);
        }
      });

      // Wait for the skill animation to finish
      await delay(animDuration + 200);
    }

    // Check for victory
    if (updatedEnemies.length === 0) {
      await delay(400); // extra beat to appreciate victory
      handleVictory();
      return;
    }

    if (selectedEnemyIndex >= updatedEnemies.length) {
      setSelectedEnemyIndex(Math.max(0, updatedEnemies.length - 1));
    }

    // Decrement Flame Guard turns
    let guardedHero = { ...updatedHero };
    if (guardedHero.flameGuardActive) {
      const remaining = (guardedHero.flameGuardTurnsRemaining || 1) - 1;
      if (remaining <= 0) {
        guardedHero = { ...guardedHero, flameGuardActive: false, flameGuardTurnsRemaining: 0 };
        addLog('🛡️ Flame Guard fades.');
      } else {
        guardedHero = { ...guardedHero, flameGuardTurnsRemaining: remaining };
      }
    }

    // Tick hero's status effects at the end of their turn
    const { updatedHero: finalHero, logged } = tickHeroStatusEffects(guardedHero);
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

    if (finalHero.hp <= 0) { setCombatPhase('defeat'); return; }

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

    // Add a 1 second cozy delay before enemies act
    await delay(1000);

    let updatedHero = { ...(currentHeroState ?? heroState) };
    let updatedEnemies = [...currentEnemies];
    let turnDead = [];

    // ── Phase 1: Each enemy executes their telegraphed move ─────────────────
    for (let i = 0; i < updatedEnemies.length; i++) {
      const enemy = updatedEnemies[i];
      const enemyUid = enemy.uid;

      // Failsafe: if the enemy is missing or already dead, skip them!
      if (!enemy || enemy.hp <= 0) continue;

      // Focus on the active enemy currently taking their turn/attacking
      setActiveEnemyUid(enemy.uid);
      await delay(350); // Beat before the enemy acts, for high-fidelity combat feel

      const enemyData = ENEMIES[enemy.id] || enemy;

      const turnResult = executeEnemyTurn(
        { ...enemyData, moves: [enemy.intent].filter(Boolean) },
        enemy,
        updatedHero,
        updatedHero,
      );

      if (turnResult.log) {
        addLog(turnResult.log);
      }

      // ── COOLDOWN FIX: executeEnemyTurn mutates enemy.cooldowns in-place.
      // Write the updated cooldowns back into the array so they persist.
      updatedEnemies[i] = { ...enemy, cooldowns: { ...(enemy.cooldowns || {}) } };

      let isEnemyMultiHit = turnResult.hits && turnResult.hits.length > 0;
      let animDuration = 500; // default delay if stunned, skipped, or no animation plays

      if (isEnemyMultiHit) {
        const hitDuration = 350;
        setEnemyAnimFps(16);
        const spriteDef = getEnemySprite(enemy);
        const hitFrames = spriteDef.attack?.frames || 6;
        const finalHitDuration = Math.round((hitFrames / 16) * 1000);

        for (let hitIdx = 0; hitIdx < turnResult.hits.length; hitIdx++) {
          const hit = turnResult.hits[hitIdx];
          const isLastHit = hitIdx === turnResult.hits.length - 1;
          const animKey = isLastHit ? 'attack' : `attack_hit${hitIdx}`;
          const currentHitDuration = isLastHit ? finalHitDuration : hitDuration;

          setEnemyAnims(prev => ({ ...prev, [enemyUid]: animKey }));
          triggerEnemyAttackLunge(enemyUid, currentHitDuration);

          hit.targets.forEach(t => {
            if (t.uid === 'hero') {
              if (t.isDodged) {
                triggerDamagePopup('hero', 0, false, true);
              } else if (t.damage > 0) {
                triggerHeroRecoil(currentHitDuration);
                if (t.isCrit) {
                  pendingCritUids.current.add('hero');
                  triggerDamagePopup('hero', t.damage, false, false, true);
                } else {
                  pendingCritUids.current.add('hero');
                  triggerDamagePopup('hero', t.damage, false, false, false);
                }
              } else {
                pendingCritUids.current.add('hero');
                triggerDamagePopup('hero', 0, false, false, false);
              }

              updatedHero = {
                ...updatedHero,
                hp: Math.max(0, updatedHero.hp - t.damage),
              };
            }
          });

          setHeroState({ ...updatedHero });
          await delay(currentHitDuration);
        }

        // Reset enemy animation back to idle and wait for render update
        setEnemyAnims(prev => ({ ...prev, [enemyUid]: 'idle' }));
        await delay(50);

        setEnemyAnimFps(10);
        await delay(150); // post-animation recovery
      } else {
        // Trigger this enemy's attack animation if they are not stunned or skipped
        if (!turnResult.isStunned && !turnResult.isSkipped) {
          setEnemyAnims(prev => ({ ...prev, [enemyUid]: 'attack' }));
          const spriteDef = getEnemySprite(enemy);
          const attackFrames = spriteDef.attack?.frames || 4;
          animDuration = Math.round((attackFrames / 10) * 1000);
          triggerEnemyAttackLunge(enemyUid, animDuration);
        }

        if (turnResult.damage > 0) {
          triggerHeroRecoil(animDuration);
        }
        if (turnResult.isDodged) {
          triggerDamagePopup('hero', 0, false, true);
        }

        // Apply damage to hero
        updatedHero = {
          ...updatedHero,
          hp: Math.max(0, updatedHero.hp - turnResult.damage),
        };
      }

      // Flame Guard counter-burn — attacker gets burned
      if (updatedHero.flameGuardActive && turnResult.damage > 0) {
        const attacker = updatedEnemies[i];
        if (attacker && attacker.hp > 0) {
          const guardEffects = [...(attacker.effects || [])];
          applyBurn(guardEffects, updatedHero.flameGuardBurnDamage, updatedHero.flameGuardBurnDuration);
          updatedEnemies = updatedEnemies.map((e, idx) =>
            idx === i ? { ...e, effects: guardEffects } : e
          );
          addLog(`🛡️ Flame Guard counter-burns ${attacker.name}!`);
        }
      }

      // Stone Thorns — reflect raw incoming damage (before DEF) back to the attacker
      const stoneThornsReflect = updatedHero.passives?.stoneThornsReflect || 0;
      if (stoneThornsReflect > 0 && turnResult.damage > 0) {
        const rawDmg = turnResult.rawDamage || turnResult.damage;
        const reflectDmg = Math.max(1, Math.floor(rawDmg * stoneThornsReflect));
        const thornsAttacker = updatedEnemies[i];
        if (thornsAttacker && thornsAttacker.hp > 0) {
          updatedEnemies = updatedEnemies.map((e, idx) =>
            idx === i ? { ...e, hp: Math.max(0, e.hp - reflectDmg) } : e
          );
          addLog(`🌵 Stone Thorns reflects ${reflectDmg} to ${thornsAttacker.name}!`);
        }
      }

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
          // VIT + Fortitude — chance to completely resist each incoming status effect
          const resistChance = updatedHero.passives?.statusResistChance || 0;
          const effectsToApply = resistChance > 0
            ? turnResult.effects.filter(effect => {
              if (Math.random() < resistChance) {
                addLog(`🛡️ ${updatedHero.name || 'Mochi'} resisted ${effect.type.replace(/_/g, ' ')}!`);
                return false;
              }
              return true;
            })
            : turnResult.effects;
          if (effectsToApply.length > 0) {
            updatedHero = {
              ...updatedHero,
              effects: addStatusEffects(updatedHero.effects, effectsToApply),
            };
          }
        }
      }

      // Apply healing (e.g. Vampiric Bite life-steal)
      if (turnResult.heal && turnResult.heal > 0) {
        updatedEnemies = updatedEnemies.map((e, idx) => {
          if (idx !== i) return e;
          return {
            ...e,
            hp: Math.min(e.maxHp, e.hp + turnResult.heal),
          };
        });
      }

      // Handle summons (e.g. Summon Rats)
      if (turnResult.summon) {
        const { enemyId, count } = turnResult.summon;
        const baseEnemy = ENEMIES[enemyId];
        if (baseEnemy) {
          const floorNumber = state.currentRun.floorNumber || 1;
          const ratStars = Math.max(1, Math.min(4, Math.floor((floorNumber - 1) / 3) + 1));
          const mult = STAR_MULTIPLIERS[ratStars] || 1.0;

          for (let k = 0; k < count; k++) {
            if (updatedEnemies.length >= 4) break;

            const maxSpawnIndex = Math.max(-1, ...updatedEnemies.map(e => e.spawnIndex ?? 0));
            const newRat = {
              ...baseEnemy,
              uid: `${enemyId}_summoned_${Date.now()}_${k}_${Math.floor(Math.random() * 1000)}`,
              type: 'common',
              stars: ratStars,
              hp: Math.ceil(baseEnemy.hp * mult),
              maxHp: Math.ceil(baseEnemy.hp * mult),
              attack: Math.ceil(baseEnemy.attack * mult),
              def: Math.max(1, Math.ceil((baseEnemy.def || 0) * mult)),
              effects: [],
              cooldowns: {},
              spawnIndex: maxSpawnIndex + 1 + k,
            };
            newRat.intent = selectEnemyMove(newRat, [...updatedEnemies, newRat]);
            updatedEnemies.push(newRat);
          }
        }
      }

      // Handle self-destruct (Pufferfish)
      if (turnResult.selfDestruct) {
        const selfDestructEnemy = updatedEnemies[i];
        if (selfDestructEnemy) {
          defeatedEnemiesRef.current.push(selfDestructEnemy);
          turnDead.push(selfDestructEnemy);
        }
        updatedEnemies = updatedEnemies.filter((_, idx) => idx !== i);
        i--;
      }

      // Flush HP bar update to screen immediately after each enemy acts
      setHeroState({ ...updatedHero });
      updateEnemiesAndDyingEnemies(updatedEnemies, turnDead);

      // Pause to let the action finish and create a cozy 1-second interval between unit actions
      await delay(animDuration + 1000);
    }

    // Clear the acting-enemy highlight now that every enemy has moved
    setActiveEnemyUid(null);

    // Pause briefly before processing status effects so there is a clean beat
    await delay(200);

    // ── Phase 2: End-of-turn status effects (bleed ticks, buff countdowns) ──
    let statusLogFired = false;

    // (Hero status effects are ticked at the end of the hero's own turn instead)

    updatedEnemies = updatedEnemies.map((e) => {
      const res = processStatusEffects(e);
      if (res.log) addLog(`${e.name}: ${res.log}`);
      // Return a new object that includes the mutated cooldowns from processStatusEffects
      const updated = { ...e, cooldowns: { ...(e.cooldowns || {}) } };
      if (res.damage > 0) {
        statusLogFired = true;
        return { ...updated, hp: Math.max(0, e.hp - res.damage) };
      }
      return updated;
    });

    // Flush status-effect results to screen
    setEnemies([...updatedEnemies]);

    // Brief pause so the player can read bleed/buff messages
    if (statusLogFired) {
      await delay(400);
    }

    // ── Remove enemies that died from status effects ─────────────────────────
    const statusDeadRes = processDeadEnemies(updatedEnemies);
    updatedEnemies = statusDeadRes.alive;
    turnDead = [...turnDead, ...statusDeadRes.dead];

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
      updateEnemiesAndDyingEnemies(updatedEnemies, turnDead);
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
    updateEnemiesAndDyingEnemies(updatedEnemies, turnDead);

    if (selectedEnemyIndex >= updatedEnemies.length) {
      setSelectedEnemyIndex(Math.max(0, updatedEnemies.length - 1));
    }

    // ── Check if the hero is stunned ────────────────────────────────────────
    const isHeroStunned = updatedHero.effects?.some(e => e.type === 'stun');
    if (isHeroStunned) {
      addLog(`${updatedHero.name || 'Mochi'} is stunned and can't move!`);

      // Tick hero's status effects (which handles bleed and decrements stun)
      const { updatedHero: finalHero } = tickHeroStatusEffects(updatedHero);
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

  const updateEnemiesAndDyingEnemies = useCallback((nextEnemies, newDead) => {
    if (newDead && newDead.length > 0) {
      setEnemiesState(prev => {
        const uniqueDead = newDead.filter(d => !prev.dying.some(p => p.uid === d.uid));
        return {
          alive: nextEnemies,
          dying: [...prev.dying, ...uniqueDead],
        };
      });
      // Remove them from dying state after animation ends (800ms)
      setTimeout(() => {
        setEnemiesState(prev => ({
          ...prev,
          dying: prev.dying.filter(de => !newDead.some(d => d.uid === de.uid)),
        }));
      }, 800);
    } else {
      setEnemies(nextEnemies);
    }
  }, [setEnemies]);

  const processDeadEnemies = (enemyList) => {
    const alive = [];
    const dead = [];
    for (const e of enemyList) {
      if (e.hp <= 0) {
        const alreadyDefeated = defeatedEnemiesRef.current.some(de => de.uid === e.uid);
        if (!alreadyDefeated) {
          defeatedEnemiesRef.current.push(e);
          addLog(`${e.name} has been defeated!`);
          dead.push(e);
        }
      } else {
        alive.push(e);
      }
    }
    return { alive, dead };
  };


  // =========================================================================
  // VICTORY — calculate loot, dispatch to global state
  // =========================================================================
  const handleVictory = () => {
    const loot = calculateEncounterLoot(
      defeatedEnemiesRef.current,
      state.currentRun.zoneId,
      state.currentRun.floorNumber,
    );
    setLootResult(loot);

    // Dispatch rewards to global state (Run bag instead of permanent inventory)
    if (loot.gold > 0 || Object.keys(loot.materials).length > 0 || loot.xp > 0) {
      dispatch({
        type: 'ADD_RUN_LOOT',
        payload: { gold: loot.gold, materials: loot.materials, xp: loot.xp },
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
          newStatPoints: lvlResult.newStatPoints,
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
      // Mark the zone as cleared, then return to the dungeon map.
      // DungeonMapScreen detects all tiles cleared and handles END_RUN + navigation to Camp.
      dispatch({ type: 'CLEAR_ZONE', payload: { zoneId: state.currentRun.zoneId } });
    }
    // Always return to the dungeon map — floor-complete detection lives there
    navigation.navigate('DungeonMap');
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

  const performFlee = () => {
    setShowFleeConfirmModal(false);
    
    // Sync any consumables used during this fight (deducting them)
    const flatConsumables = [];
    for (const c of runConsumables) {
      for (let i = 0; i < c.quantity; i++) {
        flatConsumables.push(c.id);
      }
    }
    
    dispatch({
      type: 'COMBAT_FLEE',
      payload: { hp: heroState.hp, consumables: flatConsumables },
    });
    
    navigation.navigate('DungeonMap');
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

  // Dungeon info for the battlefield info bar
  const zone = ZONES[state.currentRun.zoneId];
  const floorNumber = state.currentRun.floorNumber || 1;

  // Syntax highlighting parser for combat logs
  const renderLogText = (msg, index) => {
    let color = '#CBD5E1'; // Cool parchment default
    const lower = msg.toLowerCase();

    const heroNameLower = (heroState?.name || 'Mochi').toLowerCase();
    const activeSkillNames = Object.values(SKILLS)
      .filter(s => s.type === 'active')
      .map(s => s.name.toLowerCase());

    const isHeroSkill = activeSkillNames.some(name => {
      const shortName = name.replace(' strike', '');
      return lower.includes(name) || lower.includes(shortName);
    });

    const isHeroAction =
      lower.includes(`${heroNameLower} attacks`) ||
      lower.includes(`${heroNameLower} uses`) ||
      lower.includes(`${heroNameLower} raises`) ||
      lower.includes(`${heroNameLower} vanishes`) ||
      lower.includes('crit!') ||
      lower.includes('critical') ||
      isHeroSkill;

    if (isHeroAction) {
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
        • {msg}
      </Text>
    );
  };

  return (
    <ScreenLoader assets={assetsToPreload}>
      <SafeAreaView style={styles.root}>
        {/* Background SVG gradients */}
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <RadialGradient id="combatGlow" cx="50%" cy="0%" rx="80%" ry="40%">
              <Stop offset="0%" stopColor={theme.COLORS.candleGold} stopOpacity="0.10" />
              <Stop offset="100%" stopColor={theme.COLORS.hubBg} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={theme.COLORS.hubBg} />
          <Rect width="100%" height="100%" fill="url(#combatGlow)" />
        </Svg>

        {/* ── Info bar: encounter type · dungeon · floor + turn ── */}
        <View style={styles.infoBar}>
          <View style={styles.infoBarLeft}>
            <View style={styles.encounterTypeRow}>
              {roomType !== 'boss' && roomType !== 'ambush' && (
                <ItemSprite spritesheet="icons-1" frameIndex={10} displaySize={16} />
              )}
              <Text style={styles.encounterTypeLabel}>
                {roomType === 'boss' ? '☠️  BOSS BATTLE' : roomType === 'ambush' ? '👺  AMBUSH!' : 'COMBAT'}
              </Text>
            </View>
            <Text style={styles.infoBarSub} numberOfLines={1}>
              {zone?.name || 'Unknown Depths'} · Zone {floorNumber}
            </Text>
          </View>
          <View style={styles.turnPill}>
            <Text style={styles.turnPillText}>Turn {turnCount + 1}</Text>
          </View>
        </View>

        {/* ══ Battlefield arena ════════════════════════════════════════ */}
        <View style={styles.battlefield}>
          {/* Background image (same for all zones for now) */}
          <Image
            source={require('../../assets/sprites/banners/battle_bg_1.png')}
            style={styles.battlefieldBg}
            resizeMode="stretch"
          />

          {/* ── Stage: hero left, enemies right ── */}
          <View style={styles.stage}>
            <View style={styles.heroSide}>
              {renderHeroNode()}
            </View>

            <View style={styles.enemySide}>
              {(() => {
                const combined = [
                  ...enemies.map(e => ({ ...e, isDying: false })),
                  ...dyingEnemies.map(e => ({ ...e, isDying: true })),
                ];
                combined.sort((a, b) => (a.spawnIndex ?? 0) - (b.spawnIndex ?? 0));
                const layout = getEnemyLayout(combined.length);

                return combined.map((enemy, slot) => {
                  const slotStyle = layout[slot] || layout[layout.length - 1];
                  if (enemy.isDying) {
                    return (
                      <DyingEnemyCard
                        key={`dying_${enemy.uid}`}
                        enemy={enemy}
                        slotStyle={slotStyle}
                        popups={popups}
                        removePopup={removePopup}
                      />
                    );
                  }
                  return renderEnemyNode(enemy, slotStyle);
                });
              })()}
            </View>
          </View>
        </View>

        {/* ══ Lower 1/3 — Actions line (top) + Battle log (bottom) ═════ */}
        <View style={styles.lowerContainer}>

          {/* ── Actions line: attack · skills · items, side by side ── */}
          <View style={styles.actionsLine}>
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

            {combatPhase === 'playerTurn' && (
              <View style={styles.actionAreaContainer}>
                {/* Row 1: Attack and 2 Skills, expanding to fill horizontal space */}
                <View style={styles.actionRowSingle}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnAttack]}
                    onPress={handleAttack}
                    activeOpacity={0.75}
                  >
                    <View style={styles.actionBtnSprite}>
                      <ItemSprite spritesheet="icons-1" frameIndex={10} displaySize={28} />
                    </View>
                    <Text style={[styles.actionBtnTitle, { color: '#5CC489' }]}>ATTACK</Text>
                    <Text style={styles.actionBtnSub}>Basic</Text>
                  </TouchableOpacity>

                  {renderSkillButton(0)}
                  {renderSkillButton(1)}
                </View>

                {/* Row 2: Flee and Items buttons, side-by-side */}
                <View style={styles.actionRowSub}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtnSubRow,
                      state.currentRun.combatFleeUsed ? styles.actionBtnEmpty : styles.actionBtnFlee,
                      state.currentRun.combatFleeUsed && { opacity: 0.5 }
                    ]}
                    onPress={() => !state.currentRun.combatFleeUsed && setShowFleeConfirmModal(true)}
                    activeOpacity={0.75}
                    disabled={state.currentRun.combatFleeUsed}
                  >
                    <View style={styles.subBtnContent}>
                      <View style={[styles.subBtnSprite, state.currentRun.combatFleeUsed && { opacity: 0.4 }]}>
                        <ItemSprite spritesheet="icons-map" frameIndex={127} displaySize={18} />
                      </View>
                      <Text style={[styles.subBtnTitle, { color: state.currentRun.combatFleeUsed ? '#5A5A5A' : '#DD7A86' }]}>
                        {state.currentRun.combatFleeUsed ? 'FLED (USED)' : 'FLEE'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtnSubRow, totalConsumables > 0 ? styles.actionBtnItem : styles.actionBtnEmpty]}
                    onPress={() => totalConsumables > 0 && setShowItemModal(true)}
                    activeOpacity={0.75}
                    disabled={totalConsumables === 0}
                  >
                    <View style={styles.subBtnContent}>
                      <View style={[styles.subBtnSprite, totalConsumables === 0 && { opacity: 0.4 }]}>
                        <ItemSprite spritesheet="icons-1" frameIndex={26} displaySize={18} />
                      </View>
                      <Text style={[styles.subBtnTitle, { color: totalConsumables > 0 ? '#F5CF4A' : '#5A5A5A' }]}>
                        ITEMS ({totalConsumables})
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {combatPhase === 'enemyTurn' && (
              <View style={styles.enemyTurnBox}>
                <View style={{ opacity: 0.7 }}>
                  <ItemSprite spritesheet="icons-map" frameIndex={125} displaySize={28} />
                </View>
                <Text style={styles.enemyTurnText}>Enemies are acting…</Text>
              </View>
            )}
          </View>

          {/* ── Battle log (full width) ── */}
          <View style={styles.logLine}>
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
                  <LinearGradient id="itemModalGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={theme.COLORS.panelGreenTop} stopOpacity="1" />
                    <Stop offset="100%" stopColor={theme.COLORS.panelGreenBottom} stopOpacity="1" />
                  </LinearGradient>
                  <RadialGradient id="itemModalGlow" cx="50%" cy="0%" r="55%">
                    <Stop offset="0%" stopColor={theme.COLORS.candleGold} stopOpacity="0.08" />
                    <Stop offset="100%" stopColor={theme.COLORS.panelGreenTop} stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#itemModalGrad)" rx={20} />
                <Rect width="100%" height="100%" fill="url(#itemModalGlow)" rx={20} />
                <Rect x="1" y="1" width="98%" height="98%" rx={19} fill="none" stroke="rgba(212, 167, 84, 0.18)" strokeWidth={1} />
              </Svg>

              <View style={styles.modalContentInner}>
                {(() => {
                  const bagId = state.hero.gear?.storage;
                  const bagDef = bagId ? GEAR[bagId] : null;
                  return (
                    <View style={styles.modalTitleRow}>
                      <ItemSprite
                        spritesheet={bagDef?.spritesheet || 'storages-1'}
                        frameIndex={bagDef?.frameIndex ?? 0}
                        displaySize={24}
                      />
                      <Text style={styles.modalTitle}>Supplies Bag</Text>
                    </View>
                  );
                })()}

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
                          {/* Sprite box */}
                          <View style={styles.modalItemIconBox}>
                            {def?.spritesheet ? (
                              <ItemSprite
                                spritesheet={def.spritesheet}
                                frameIndex={def.frameIndex}
                                displaySize={44}
                              />
                            ) : null}
                          </View>

                          {/* Text section */}
                          <View style={styles.modalItemText}>
                            <Text style={styles.modalItemName}>
                              {def?.name || entry.id}
                            </Text>
                            <Text style={styles.modalItemDesc}>
                              {def?.description || ''}
                            </Text>
                          </View>

                          {/* Quantity on the right */}
                          <View style={styles.modalItemQuantityBox}>
                            <Text style={styles.modalItemQuantityText}>
                              <Text style={styles.modalItemQuantityLabel}>x</Text>
                              {entry.quantity}
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

        {/* ── Skill info popup ─────────────────────────────────────────── */}
        {renderSkillInfoModal()}

        {/* ── Flee confirmation popup ─────────────────────────────────── */}
        <Modal
          visible={showFleeConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFleeConfirmModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowFleeConfirmModal(false)}>
            <Pressable style={styles.modalContent}>
              <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                <Defs>
                  <LinearGradient id="fleeInfoGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={theme.COLORS.panelGreenTop} stopOpacity="1" />
                    <Stop offset="100%" stopColor={theme.COLORS.panelGreenBottom} stopOpacity="1" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#fleeInfoGrad)" rx={20} />
                <Rect x="1" y="1" width="98%" height="98%" rx={19} fill="none" stroke="rgba(212, 167, 84, 0.18)" strokeWidth={1} />
              </Svg>

              <View style={styles.modalContentInner}>
                <View style={styles.modalTitleRow}>
                  <ItemSprite spritesheet="icons-map" frameIndex={127} displaySize={28} />
                  <Text style={styles.modalTitle}>Flee Battle</Text>
                </View>

                <Text style={styles.fleeConfirmText}>
                  Are you sure you want to flee this battle?
                </Text>
                <Text style={styles.fleeConfirmSubText}>
                  Can only be used once per run.
                </Text>

                <View style={styles.fleeModalButtonsRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setShowFleeConfirmModal(false)}
                    style={[styles.fleeModalBtn, styles.fleeModalBtnCancel]}
                  >
                    <Text style={styles.fleeModalBtnText}>CANCEL</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={performFlee}
                    style={[styles.fleeModalBtn, styles.fleeModalBtnConfirm]}
                  >
                    <Text style={[styles.fleeModalBtnText, { color: '#DD7A86' }]}>FLEE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── Victory / Loot Overlay ───────────────────────────────────── */}
        {combatPhase === 'loot' && lootResult && (
          <View style={styles.cozyOverlay}>
            <View style={[styles.cozyFrame, theme.SHADOWS.cardShadow]}>
              <View style={styles.cozyParchment}>
                <View style={styles.cozyBevel} pointerEvents="none" />

                <Text style={styles.cozySubtitle}>
                  You survived the encounter and secured the spoils of battle!
                </Text>

                {/* Loot breakdown */}
                <View style={styles.lootChipsContainer}>
                  {lootResult.xp > 0 && (
                    <View style={styles.lootItemChip}>
                      <ItemSprite spritesheet="icons-map" frameIndex={146} displaySize={32} />
                      <Text style={styles.lootChipQty}>{lootResult.xp}</Text>
                      <Text style={styles.lootChipLabel}>XP</Text>
                    </View>
                  )}
                  {lootResult.gold > 0 && (
                    <View style={styles.lootItemChip}>
                      <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={32} />
                      <Text style={styles.lootChipQty}>{lootResult.gold}g</Text>
                      <Text style={styles.lootChipLabel}>Gold</Text>
                    </View>
                  )}
                  {Object.entries(lootResult.materials).map(([itemId, qty]) => {
                    const def = MATERIALS[itemId];
                    return (
                      <View key={itemId} style={styles.lootItemChip}>
                        {def ? (
                          <ItemSprite spritesheet={def.spritesheet} frameIndex={def.frameIndex} displaySize={32} />
                        ) : (
                          <ItemSprite spritesheet="icons-1" frameIndex={10} displaySize={32} />
                        )}
                        <Text style={styles.lootChipQty}>{qty}</Text>
                        <Text style={styles.lootChipLabel}>
                          {def?.name || itemId.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Level up messages */}
                {levelUpMessages.length > 0 && (
                  <View style={styles.levelUpSection}>
                    {levelUpMessages.map((msg, i) => (
                      <View key={`lu_${i}`} style={styles.levelUpRow}>
                        <Text style={styles.levelUpStar}>✦</Text>
                        <Text style={styles.levelUpText}>{msg}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity activeOpacity={0.85} onPress={handleContinue} style={styles.cozyButton}>
                  <View style={styles.cozyButtonInner}>
                    <Text style={styles.cozyButtonText}>
                      {roomType === 'boss' ? 'Return to Camp' : 'Return to Map'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.cozyTopWrap} pointerEvents="none">
                <View style={styles.cozyTopOuter}>
                  <View style={styles.cozyTopInner}>
                    <Text style={styles.cozyTopText}>VICTORY</Text>
                  </View>
                </View>
              </View>

            </View>
          </View>
        )}

        {/* ── Defeat Overlay ───────────────────────────────────────────── */}
        {combatPhase === 'defeat' && (
          <View style={styles.cozyOverlay}>
            <View style={[styles.cozyFrame, theme.SHADOWS.cardShadow]}>
              <View style={styles.cozyParchment}>
                <View style={styles.cozyBevel} pointerEvents="none" />

                <Text style={styles.cozySubtitle}>
                  {heroState.name || 'Mochi'} retreats to camp, battered but alive.
                </Text>

                <Text style={styles.lostLootTitle}>Loot Lost in the Depths:</Text>
                {state.currentRun.lootCollected.gold === 0 &&
                  Object.keys(state.currentRun.lootCollected.materials).length === 0 &&
                  (state.currentRun.lootCollected.xp || 0) === 0 ? (
                  <Text style={styles.noLostLootText}>No materials, gold, or XP were collected this run.</Text>
                ) : (
                  <View style={styles.lootChipsContainer}>
                    {state.currentRun.lootCollected.xp > 0 && (
                      <View style={styles.lootItemChip}>
                        <ItemSprite spritesheet="icons-map" frameIndex={146} displaySize={32} opacity={0.5} />
                        <Text style={[styles.lootChipQty, { textDecorationLine: 'line-through', opacity: 0.6 }]}>
                          {state.currentRun.lootCollected.xp}
                        </Text>
                        <Text style={styles.lootChipLabel}>XP</Text>
                      </View>
                    )}
                    {state.currentRun.lootCollected.gold > 0 && (
                      <View style={styles.lootItemChip}>
                        <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={32} opacity={0.5} />
                        <Text style={[styles.lootChipQty, { textDecorationLine: 'line-through', opacity: 0.6 }]}>
                          {state.currentRun.lootCollected.gold}g
                        </Text>
                        <Text style={styles.lootChipLabel}>Gold</Text>
                      </View>
                    )}
                    {Object.entries(state.currentRun.lootCollected.materials).map(([id, qty]) => {
                      const def = MATERIALS[id];
                      return (
                        <View key={id} style={styles.lootItemChip}>
                          {def ? (
                            <ItemSprite spritesheet={def.spritesheet} frameIndex={def.frameIndex} displaySize={32} opacity={0.5} />
                          ) : (
                            <ItemSprite spritesheet="icons-1" frameIndex={10} displaySize={32} opacity={0.5} />
                          )}
                          <Text style={[styles.lootChipQty, { textDecorationLine: 'line-through', opacity: 0.6 }]}>
                            {qty}
                          </Text>
                          <Text style={styles.lootChipLabel}>
                            {def?.name || id.replace(/_/g, ' ')}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                <TouchableOpacity activeOpacity={0.85} onPress={handleDefeatReturn} style={styles.cozyButtonDanger}>
                  <View style={styles.cozyButtonDangerInner}>
                    <Text style={styles.cozyButtonText}>Return to Camp</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.cozyTopWrap} pointerEvents="none">
                <View style={styles.cozyTopOuter}>
                  <View style={styles.cozyTopInner}>
                    <Text style={styles.cozyTopText}>DEFEATED</Text>
                  </View>
                </View>
              </View>

            </View>
          </View>
        )}
      </SafeAreaView>
    </ScreenLoader>
  );

  // ── Status-effect badge row (shared by hero + enemies) ──────────────────
  function renderEffectsRow(effects, keyPrefix) {
    const consolidated = consolidateEffectsArray(effects);
    if (consolidated.length === 0) return null; // collapse when empty — no reserved gap
    return (
      <View style={styles.effectsRowContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.effectsRowScroll}
        >
          {consolidated.map((eff, ei) => {
            const frame = STATUS_SPRITE_FRAMES[eff.type];
            return (
              <View key={`${keyPrefix}_${eff.type}_${ei}`} style={styles.effectBadge}>
                {frame != null ? (
                  <ItemSprite spritesheet="status-icons-1" frameIndex={frame} displaySize={18} />
                ) : (
                  <Text style={styles.effectText}>{STATUS_EMOJIS[eff.type] || '❓'}</Text>
                )}
                {eff.duration > 0 && (
                  <Text style={styles.effectDuration}>{eff.duration}</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // ── Hero node: name + HP + status on top, sprite below ──────────────────
  function renderHeroNode() {
    const tintColor = heroState?.playerHoT ? '#3B9EFF' : '#F5CF4A';
    return (
      <View style={[styles.charNode, { width: HERO_DISPLAY_SIZE, paddingHorizontal: 0, paddingVertical: 0 }]}>
        {/* Sprite & Layout Wrapper */}
        <View style={[styles.spriteWrapper, { width: HERO_DISPLAY_SIZE, height: HERO_DISPLAY_SIZE }]}>
          {/* Sprite backlight — radial halo behind Mochi */}
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <RadialGradient id="heroBacklight" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={tintColor} stopOpacity={heroState?.playerHoT ? 0.25 : 0.14} />
                <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#heroBacklight)" />
          </Svg>

          {/* Status effects row - locked to the top inside sprite container */}
          <View style={[styles.enemyEffectsTop, { position: 'absolute', top: 20, left: 0, right: 0 }]}>
            {renderEffectsRow(heroState.effects, 'hero')}
          </View>

          {/* Animated View wrapper for lunge/recoil translation */}
          <Animated.View style={{ transform: [{ translateX: heroTranslateX }], width: '100%', height: '100%', position: 'absolute', justifyContent: 'center', alignItems: 'center' }}>
            {/* Stage platform below hero — soft radial shadow */}
            {(() => {
              const shadowWidth = HERO_DISPLAY_SIZE * 0.38;
              const shadowHeight = 17;
              return (
                <View style={[
                  styles.heroStagePlatform,
                  {
                    bottom: Math.round(HERO_DISPLAY_SIZE * (HERO_SPRITE.platformOffsetFactor || 0.18)),
                    alignSelf: 'center',
                  }
                ]}>
                  <Svg width={shadowWidth} height={shadowHeight}>
                    <Defs>
                      <RadialGradient id="heroShadowGlow" cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor="#000000" stopOpacity="0.95" />
                        <Stop offset="60%" stopColor="#000000" stopOpacity="0.6" />
                        <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
                      </RadialGradient>
                    </Defs>
                    <Ellipse
                      cx={shadowWidth / 2}
                      cy={shadowHeight / 2}
                      rx={shadowWidth / 2}
                      ry={shadowHeight / 2}
                      fill="url(#heroShadowGlow)"
                    />
                  </Svg>
                </View>
              );
            })()}

            {(() => {
              const isIdle = heroAnim === 'idle';
              const isGuard = heroAnim === 'guard';
              const isAttack = heroAnim === 'attack' || heroAnim.startsWith('attack_hit');
              const isSkill = !isIdle && !isGuard && !isAttack;

              const baseAnim = heroAnim.split('_hit')[0];
              const skillDef = isSkill ? HERO_SPRITE[baseAnim] : null;

              return (
                <>
                  <AnimatedSprite
                    key="hero_sprite_idle"
                    source={HERO_SPRITE.idle.source}
                    frameSize={HERO_SPRITE.idle.frameSize}
                    totalFrames={HERO_SPRITE.idle.frames}
                    fps={8}
                    loop={true}
                    active={isIdle}
                    displaySize={HERO_DISPLAY_SIZE}
                    pointerEvents={isIdle ? 'auto' : 'none'}
                    style={[styles.heroCardSprite, { position: 'absolute', opacity: isIdle ? 1 : 0 }]}
                    tintColor="#ff3333"
                    tintOpacity={heroDamageOpacity}
                  />
                  <AnimatedSprite
                    key="hero_sprite_guard"
                    source={HERO_SPRITE.guard.source}
                    frameSize={HERO_SPRITE.guard.frameSize}
                    totalFrames={HERO_SPRITE.guard.frames}
                    fps={8}
                    loop={true}
                    active={isGuard}
                    displaySize={HERO_DISPLAY_SIZE}
                    pointerEvents={isGuard ? 'auto' : 'none'}
                    style={[styles.heroCardSprite, { position: 'absolute', opacity: isGuard ? 1 : 0 }]}
                    tintColor="#ff3333"
                    tintOpacity={heroDamageOpacity}
                  />
                  <AnimatedSprite
                    key={`hero_sprite_attack_${heroAnim}`}
                    source={HERO_SPRITE.attack.source}
                    frameSize={HERO_SPRITE.attack.frameSize}
                    totalFrames={HERO_SPRITE.attack.frames}
                    fps={heroAnimFps}
                    loop={false}
                    active={isAttack}
                    onComplete={isAttack && !heroAnim.includes('_hit') ? () => setHeroAnim('idle') : undefined}
                    displaySize={HERO_DISPLAY_SIZE}
                    pointerEvents={isAttack ? 'auto' : 'none'}
                    style={[styles.heroCardSprite, { position: 'absolute', opacity: isAttack ? 1 : 0 }]}
                    tintColor="#ff3333"
                    tintOpacity={heroDamageOpacity}
                  />
                  {/* Skill Animation — remounts fresh on each skill via key */}
                  {isSkill && skillDef && (
                    <AnimatedSprite
                      key={`hero_sprite_skill_${heroAnim}`}
                      source={skillDef.source}
                      frameSize={skillDef.frameSize}
                      totalFrames={skillDef.frames}
                      fps={heroAnimFps}
                      loop={false}
                      active={true}
                      onComplete={!heroAnim.includes('_hit') ? () => setHeroAnim('idle') : undefined}
                      displaySize={HERO_DISPLAY_SIZE}
                      pointerEvents="auto"
                      style={[styles.heroCardSprite, { position: 'absolute' }]}
                      tintColor="#ff3333"
                      tintOpacity={heroDamageOpacity}
                    />
                  )}
                </>
              );
            })()}
          </Animated.View>

          {/* Info block locked to bottom inside the sprite container */}
          <View style={[styles.enemyInfoBottom, { position: 'absolute', bottom: 15, left: 0, right: 0 }]}>
            <View style={[styles.charHpBar, { width: '55%' }]}>
              <ResourceBar variant="heroHp" current={heroState.hp} max={heroState.maxHp} />
            </View>
            <Text style={styles.charName} numberOfLines={1}>{heroState.name || 'Mochi'}</Text>
          </View>

          {popups
            .filter((p) => p.targetUid === 'hero')
            .map((p) => (
              <DamagePopup
                key={p.id}
                amount={p.amount}
                isHeal={p.isHeal}
                isMiss={p.isMiss}
                isCrit={p.isCrit}
                onComplete={() => removePopup(p.id)}
              />
            ))}
        </View>
      </View>
    );
  }

  // ── Enemy node: name + ★ + HP + status on top, sprite below ─────────────
  function renderEnemyNode(enemy, slotStyle) {
    const idx = enemies.findIndex(e => e.uid === enemy.uid);
    const isSelected = idx === selectedEnemyIndex && combatPhase === 'playerTurn';
    const isActing = enemy.uid === activeEnemyUid;
    const spriteDef = getEnemySprite(enemy);
    const displaySize = enemy.isBoss ? BOSS_DISPLAY_SIZE : ENEMY_DISPLAY_SIZE;
    const platformBottom = Math.round(displaySize * (spriteDef.platformOffsetFactor || 0.25));
    const animKey = enemyAnims[enemy.uid] || 'idle';
    const glowColor = isSelected ? '#F5CF4A' : isActing ? '#D8483F' : '#707F94';

    return (
      <TouchableOpacity
        key={enemy.uid}
        style={[
          styles.enemyNode,
          slotStyle,
          { width: displaySize, marginLeft: -displaySize / 2 }
        ]}
        onPress={() => setSelectedEnemyIndex(idx)}
        activeOpacity={0.8}
      >
        {/* Container 3: Outer wrapper */}
        <View style={[
          styles.enemySelectable,
          { width: displaySize, paddingHorizontal: 0, paddingVertical: 0 }
        ]}>
          {/* Sprite & Layout Wrapper */}
          <View style={[styles.spriteWrapper, { width: displaySize, height: displaySize }]}>
            {/* Subtle backlight halo behind enemy */}
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id={`enemyBacklight_${enemy.uid}`} cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={glowColor} stopOpacity={isSelected || isActing ? 0.12 : 0.04} />
                  <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={`url(#enemyBacklight_${enemy.uid})`} />
            </Svg>

            {/* Status effects row - locked to the top inside sprite container */}
            <View style={[styles.enemyEffectsTop, { position: 'absolute', top: 20, left: 0, right: 0 }]}>
              {renderEffectsRow(enemy.effects, `enemy_${enemy.uid}`)}
            </View>

            {/* Animated View wrapper for lunge/recoil translation */}
            <Animated.View style={{ transform: [{ translateX: getEnemyTranslateX(enemy.uid) }], width: '100%', height: '100%', position: 'absolute', justifyContent: 'center', alignItems: 'center' }}>
              {/* Stage platform below enemy — soft radial shadow */}
              {(() => {
                const shadowWidth = displaySize * 0.38;
                const shadowHeight = 17;
                return (
                  <View style={[
                    styles.stagePlatform,
                    {
                      bottom: platformBottom,
                      alignSelf: 'center',
                    }
                  ]}>
                    <Svg width={shadowWidth} height={shadowHeight}>
                      <Defs>
                        <RadialGradient id={`enemyShadowGlow_${enemy.uid}`} cx="50%" cy="50%" r="50%">
                          <Stop offset="0%" stopColor="#000000" stopOpacity="0.95" />
                          <Stop offset="60%" stopColor="#000000" stopOpacity="0.6" />
                          <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
                        </RadialGradient>
                      </Defs>
                      <Ellipse
                        cx={shadowWidth / 2}
                        cy={shadowHeight / 2}
                        rx={shadowWidth / 2}
                        ry={shadowHeight / 2}
                        fill={`url(#enemyShadowGlow_${enemy.uid})`}
                      />
                    </Svg>
                  </View>
                );
              })()}

              {/* Animated Enemy Sprite */}
              <AnimatedSprite
                key={`${enemy.uid}_idle`}
                source={spriteDef.idle.source}
                frameSize={spriteDef.idle.frameSize}
                totalFrames={spriteDef.idle.frames}
                fps={8}
                loop={true}
                active={animKey === 'idle'}
                displaySize={displaySize}
                flipX
                pointerEvents={animKey === 'idle' ? 'auto' : 'none'}
                style={[styles.enemySprite, { position: 'absolute', opacity: animKey === 'idle' ? 1 : 0 }]}
                tintColor="#ff3333"
                tintOpacity={getEnemyDamageOpacity(enemy.uid)}
              />
              <AnimatedSprite
                key={`${enemy.uid}_attack_${animKey}`}
                source={spriteDef.attack.source}
                frameSize={spriteDef.attack.frameSize}
                totalFrames={spriteDef.attack.frames}
                fps={enemy.uid === activeEnemyUid ? enemyAnimFps : 10}
                loop={false}
                active={animKey === 'attack' || animKey.startsWith('attack_hit')}
                onComplete={(animKey === 'attack' || animKey.startsWith('attack_hit')) && !animKey.includes('_hit')
                  ? () => setEnemyAnims(prev => ({ ...prev, [enemy.uid]: 'idle' }))
                  : undefined}
                displaySize={displaySize}
                flipX
                pointerEvents={(animKey === 'attack' || animKey.startsWith('attack_hit')) ? 'auto' : 'none'}
                style={[styles.enemySprite, { position: 'absolute', opacity: (animKey === 'attack' || animKey.startsWith('attack_hit')) ? 1 : 0 }]}
                tintColor="#ff3333"
                tintOpacity={getEnemyDamageOpacity(enemy.uid)}
              />
            </Animated.View>

            {/* Info block locked to bottom inside the sprite container */}
            <View style={[styles.enemyInfoBottom, { position: 'absolute', bottom: 1.5, left: 0, right: 0 }]}>
              <Animated.View style={[
                styles.charHpBar,
                {
                  width: '55%',
                  borderWidth: 1.5,
                  borderColor: isSelected
                    ? targetBorderColor
                    : isActing
                      ? '#D8483F'
                      : 'transparent',
                  backgroundColor: isSelected
                    ? targetBackgroundColor
                    : isActing
                      ? 'rgba(216, 72, 63, 0.06)'
                      : 'transparent',
                  borderRadius: 6,
                  padding: 1.5,
                }
              ]}>
                <ResourceBar variant="enemyHp" current={enemy.hp} max={enemy.maxHp} />
              </Animated.View>
              <Text style={styles.charName} numberOfLines={1}>
                {enemy.name}
              </Text>
              {/* Stars Row - positioned below the HP bar */}
              <View style={[styles.starsRow, { marginTop: 0, marginBottom: 0 }]}>
                {Array.from({ length: enemy.isBoss ? 5 : (enemy.stars || 1) }).map((_, i) => (
                  <Text key={i} style={[styles.starText, enemy.isBoss && styles.starTextBoss, { fontSize: 6, marginHorizontal: 0.5 }]}>★</Text>
                ))}
              </View>
            </View>

            {popups
              .filter((p) => p.targetUid === enemy.uid)
              .map((p) => (
                <DamagePopup
                  key={p.id}
                  amount={p.amount}
                  isHeal={p.isHeal}
                  isMiss={p.isMiss}
                  isCrit={p.isCrit}
                  onComplete={() => removePopup(p.id)}
                />
              ))}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Skill button renderer ──────────────────────────────────────────────
  function renderSkillButton(slotIndex) {
    const skillId = state.hero.equippedSkills[slotIndex];
    const skillDef = skillId ? SKILLS[skillId] : null;
    const isPassive = skillDef?.type === 'passive';
    const cd = (skillId && !isPassive) ? (cooldowns[skillId] || 0) : 0;
    const isOnCooldown = cd > 0;
    const hasSkill = !!skillDef;
    const isDisabled = !hasSkill || isOnCooldown || isPassive;

    const elColor = state.hero.element === 'fire' ? '#FF6B35'
      : state.hero.element === 'water' ? '#3B9EFF'
        : state.hero.element === 'earth' ? '#639922'
          : state.hero.element === 'wind' ? '#5CC4B8'
            : '#A98EE0';

    const btnStyle = !hasSkill ? styles.actionBtnEmpty
      : isPassive ? styles.actionBtnSkill
        : isOnCooldown ? styles.actionBtnSkillCooldown
          : styles.actionBtnSkill;

    const titleColor = !hasSkill ? '#5A5A5A'
      : isPassive ? `${elColor}99`
        : isOnCooldown ? '#9C7D44'
          : elColor;

    const skillFrame = skillId != null ? SKILL_SPRITE_FRAMES[skillId] : undefined;
    const icon = skillDef?.icon || (hasSkill ? '✨' : '—');

    const subText = !hasSkill
      ? 'empty slot'
      : isPassive
        ? 'Passive'
        : isOnCooldown
          ? `${cd} turn${cd !== 1 ? 's' : ''}`
          : 'Ready';

    // Show Flame Guard active indicator
    const isFlameGuardActive = skillId === 'flame_guard' && heroState?.flameGuardActive;

    // Show Healing Current active indicator
    const isHealingCurrentActive = skillId === 'healing_current' && heroState?.playerHoT;
    const isHealingCurrentReady = skillId === 'healing_current' && !isDisabled;

    // Show Fortify active indicator
    const isFortifyActive = skillId === 'fortify' && heroState?.effects?.some(e => e.type === 'def_buff');

    return (
      <TouchableOpacity
        key={slotIndex}
        style={[
          styles.actionBtn, btnStyle,
          isDisabled && !isPassive && { opacity: isOnCooldown ? 0.65 : 0.38 },
          isPassive && { opacity: 0.7 },
          isFlameGuardActive && { borderColor: elColor, borderWidth: 1.5 },
          isHealingCurrentReady && {
            borderColor: '#3B9EFF',
            borderWidth: 1.5,
            shadowColor: '#3B9EFF',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 6,
            elevation: 4,
          },
        ]}
        onPress={() => !isDisabled && handleSkill(slotIndex)}
        activeOpacity={0.75}
        disabled={isDisabled}
      >
        {hasSkill && (
          <TouchableOpacity
            style={styles.infoTag}
            onPress={() => setInfoSkillId(skillId)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.6}
          >
            <Text style={styles.infoTagText}>?</Text>
          </TouchableOpacity>
        )}
        {hasSkill ? (
          skillFrame != null ? (
            <View style={[styles.actionBtnSprite, isDisabled && !isPassive && { opacity: 0.85 }]}>
              <ItemSprite spritesheet="skill-icons-1" frameIndex={skillFrame} displaySize={28} />
            </View>
          ) : (
            <Text style={styles.actionBtnIcon}>{icon}</Text>
          )
        ) : (
          <View style={[styles.actionBtnSprite, { opacity: 0.22 }]}>
            <ItemSprite spritesheet="icons-map" frameIndex={76} displaySize={24} />
          </View>
        )}
        <Text
          style={[styles.actionBtnTitle, { color: titleColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumScaleFactor={0.7}
        >
          {hasSkill ? skillDef.name.toUpperCase() : `SKILL ${slotIndex + 1}`}
        </Text>
        <Text style={styles.actionBtnSub}>{subText}</Text>
        {isFlameGuardActive && (
          <Text style={[styles.actionBtnSub, { color: elColor }]}>
            🛡️ {heroState.flameGuardTurnsRemaining}t
          </Text>
        )}
        {isHealingCurrentActive && (
          <Text style={[styles.actionBtnSub, { color: '#3B9EFF' }]}>
            💧 {heroState.playerHoT.turnsRemaining}t
          </Text>
        )}
        {isFortifyActive && (
          <Text style={[styles.actionBtnSub, { color: elColor }]}>
            ⛰️ 1t
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  // ── Skill info popup (read-only, mirrors the Skills hub detail card) ────────
  function renderSkillInfoModal() {
    const infoSkill = infoSkillId ? SKILLS[infoSkillId] : null;
    const frame = infoSkillId != null ? SKILL_SPRITE_FRAMES[infoSkillId] : undefined;
    const stars = infoSkillId ? (state.hero.unlockedSkills?.[infoSkillId]?.stars || 0) : 0;
    const isActive = infoSkill?.type === 'active';

    const elColor = state.hero.element === 'fire' ? '#FF6B35'
      : state.hero.element === 'water' ? '#3B9EFF'
        : state.hero.element === 'earth' ? '#639922'
          : state.hero.element === 'wind' ? '#5CC4B8'
            : '#A98EE0';

    return (
      <Modal
        visible={infoSkillId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoSkillId(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setInfoSkillId(null)}>
          <Pressable style={styles.modalContent}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <LinearGradient id="skillInfoGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={theme.COLORS.panelGreenTop} stopOpacity="1" />
                  <Stop offset="100%" stopColor={theme.COLORS.panelGreenBottom} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#skillInfoGrad)" rx={20} />
              <Rect x="1" y="1" width="98%" height="98%" rx={19} fill="none" stroke="rgba(212, 167, 84, 0.18)" strokeWidth={1} />
            </Svg>

            {infoSkill && (
              <View style={styles.modalContentInner}>
                <View style={styles.infoTitleRow}>
                  {frame != null ? (
                    <ItemSprite spritesheet="skill-icons-1" frameIndex={frame} displaySize={44} />
                  ) : (
                    <Text style={{ fontSize: 32 }}>{infoSkill.icon || '✨'}</Text>
                  )}
                  <View style={styles.infoTitleRight}>
                    <Text style={styles.infoSkillName}>{infoSkill.name}</Text>
                    <View style={styles.infoBadges}>
                      <View style={[styles.infoTypeBadge, { borderColor: `${isActive ? '#F08A4A' : '#5CC489'}55` }]}>
                        <Text style={[styles.infoTypeBadgeText, { color: isActive ? '#F08A4A' : '#5CC489' }]}>
                          {isActive ? 'ACTIVE' : 'PASSIVE'}
                        </Text>
                      </View>
                      <Text style={styles.infoTierText}>TIER {infoSkill.tier}</Text>
                      {infoSkill.cooldown > 0 && (
                        <Text style={styles.infoCdText}>⏳ {infoSkill.cooldown}-TURN CD</Text>
                      )}
                    </View>
                    {stars > 0 && (
                      <View style={styles.infoStarsRow}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Text key={i} style={{ color: i < stars ? elColor : 'rgba(255,243,218,0.14)', fontSize: 13 }}>★</Text>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                <Text style={styles.infoDesc}>{infoSkill.description}</Text>

                <Button
                  title="Close"
                  variant="secondary"
                  onPress={() => setInfoSkillId(null)}
                  style={{ width: '100%', marginTop: 16 }}
                />
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    );
  }
}

// ============================================================================
// DyingEnemyCard — collapses and fades out on defeat
// ============================================================================
function DyingEnemyCard({ enemy, slotStyle, popups = [], removePopup }) {
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
  const animData = spriteDef.idle;

  const displaySize = enemy.isBoss ? BOSS_DISPLAY_SIZE : ENEMY_DISPLAY_SIZE;

  return (
    <Animated.View
      style={[
        styles.enemyNode,
        slotStyle,
        {
          width: displaySize,
          marginLeft: -displaySize / 2,
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
      <View style={[styles.enemySelectable, { width: displaySize, paddingHorizontal: 0, paddingVertical: 0 }]}>
        {/* Sprite, with skull overlay */}
        <View style={[styles.spriteWrapper, { width: displaySize, height: displaySize }]}>
          <View style={styles.dyingOverlay}>
            <ItemSprite spritesheet="icons-map" frameIndex={34} displaySize={48} />
          </View>
          <AnimatedSprite
            source={animData.source}
            frameSize={animData.frameSize}
            totalFrames={animData.frames}
            fps={8}
            loop={false}
            displaySize={displaySize}
            flipX
          />
          {popups
            .filter((p) => p.targetUid === enemy.uid)
            .map((p) => (
              <DamagePopup
                key={p.id}
                amount={p.amount}
                isHeal={p.isHeal}
                isMiss={p.isMiss}
                isCrit={p.isCrit}
                onComplete={() => removePopup?.(p.id)}
              />
            ))}
        </View>
      </View>
    </Animated.View>
  );
}

// ============================================================================
// DamagePopup — rises up and fades out over a sprite on hit
// ============================================================================
function DamagePopup({ amount, isHeal, isMiss, isCrit, onComplete }) {
  const animValue = useRef(new Animated.Value(0)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start(() => {
      onCompleteRef.current?.();
    });
  }, [animValue]);

  // Translate up and fade out
  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -35], // Pop up slower (shorter distance over longer time)
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 0.15, 0.8, 1],
    outputRange: [0, 1, 1, 0], // Quick fade in, hold, then fade out
  });

  const scale = animValue.interpolate({
    inputRange: [0, 0.15, 0.8, 1],
    outputRange: [0.6, 1.4, 1, 0.8], // Slight bounce scale
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: '55%', // Start higher on the sprite
        alignSelf: 'center',
        zIndex: 999,
        transform: [{ translateY }, { scale }],
        opacity,
      }}
    >
      <Text
        style={{
          color: isHeal ? '#34C759' : isMiss ? '#95A5A6' : isCrit ? '#FFD700' : '#FF3B30',
          fontSize: isCrit ? 13 : 9,
          fontWeight: '900',
          textAlign: 'center',
          textShadowColor: isCrit ? 'rgba(255, 120, 0, 0.9)' : 'black',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: isCrit ? 4 : 1.5,
          letterSpacing: isCrit ? 0.5 : 0,
        }}
      >
        {isMiss ? 'miss' : isCrit ? `${amount}!` : `${amount}`}
      </Text>
    </Animated.View>
  );
}



// ============================================================================
// Styles — Twilight Obsidian & Gilded Amber Theme
// ============================================================================
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.COLORS.hubBg,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: '#707F94',
    fontWeight: 'normal',
  },

  /* ── Battlefield (upper ~60%) ──────────────────────────────── */
  battlefield: {
    flex: 6,
    marginHorizontal: 14,
    marginTop: 4,
    borderRadius: theme.BORDER_RADIUS.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.COLORS.panelBorderGold,
    ...theme.SHADOWS.cardShadow,
  },
  battlefieldBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },

  /* ── Info bar (above the battlefield container) ─────────────── */
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 8,
    paddingVertical: 4,
    gap: 10,
    zIndex: 2,
  },
  infoBarLeft: {
    flex: 1,
  },
  encounterTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  encounterTypeLabel: {
    ...theme.FONTS.label,
    fontSize: 12,
    color: theme.COLORS.warmGlow,
    letterSpacing: 1,
  },
  infoBarSub: {
    ...theme.FONTS.small,
    fontSize: 10,
    color: 'rgba(243,226,189,0.55)',
  },

  /* ── Stage (bottom half of battlefield) ─────────────────────── */
  stage: {
    flex: 1,
    flexDirection: 'row',
    zIndex: 2,
  },
  heroSide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enemySide: {
    flex: 2,
    position: 'relative',
  },

  /* ── Character node (hero + enemy share this shape) ─────────── */
  charNode: {
    alignItems: 'center',
    width: ENEMY_NODE_WIDTH, // same footprint as enemy nodes for cohesion
    borderWidth: 1.5,        // transparent — matches enemySelectable inset
    borderColor: 'transparent',
    paddingHorizontal: 3,
    paddingVertical: 3,
  },
  enemyNode: {
    position: 'absolute',
    width: ENEMY_NODE_WIDTH,
    marginLeft: -ENEMY_NODE_WIDTH / 2,
    alignItems: 'center',
  },
  charInfoTop: {
    width: '100%',
    alignItems: 'center',
    gap: 1,
    marginBottom: -18, // pull the sprite up so name/stars/HP sit right on it
    zIndex: 6,
  },
  enemyEffectsTop: {
    width: '100%',
    alignItems: 'center',
    zIndex: 6,
  },
  enemyInfoBottom: {
    width: '100%',
    alignItems: 'center',
    gap: 1,
    marginTop: 4,
    zIndex: 6,
  },
  charName: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 10,
    lineHeight: 11,
    color: theme.COLORS.parchment,
    textAlign: 'center',
  },
  charHpBar: {
    width: '80%',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 3,
  },
  starText: {
    color: '#A0AEC0',
    fontSize: 6,
    lineHeight: 7,
  },
  starTextBoss: {
    color: '#F5CF4A',
    textShadowColor: 'rgba(245, 207, 74, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  enemySelectable: {
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 12,
    paddingHorizontal: 3,
    paddingVertical: 3,
  },
  enemySelectableSelected: {
    borderColor: theme.COLORS.treasureGold,
    backgroundColor: 'rgba(245, 207, 74, 0.06)',
  },
  enemySelectableActing: {
    borderColor: 'rgba(216, 72, 63, 0.6)',
    backgroundColor: 'rgba(216, 72, 63, 0.05)',
  },
  turnPill: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: theme.COLORS.panelBorderGoldStrong,
    borderRadius: theme.BORDER_RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  turnPillText: {
    ...theme.FONTS.label,
    fontSize: 9,
    color: theme.COLORS.candleGold,
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
    backgroundColor: 'rgba(212,167,84,0.12)',
  },
  dividerLabel: {
    ...theme.FONTS.label,
    fontSize: 9,
    letterSpacing: 1.5,
    color: theme.COLORS.candleGold,
  },

  /* ── Sprites & platforms ───────────────────────────── */
  spriteWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  effectsRowContainer: {
    width: '100%',
    height: 20,
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

  /* ── Status effects ────────────────────────────────────────── */
  effectBadge: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 0,
  },
  effectText: {
    ...theme.FONTS.small,
    fontSize: 13,
    color: '#FFF',
    fontWeight: 'bold',
  },
  effectDuration: {
    ...theme.FONTS.small,
    fontSize: 7,
    lineHeight: 8,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: -2,
    marginBottom: 1,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1.5,
  },

  heroCardSprite: {
    zIndex: 5,
  },
  heroStagePlatform: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 1,
  },

  /* ── Lower ~40%: actions line (top) + battle log (bottom) ────── */
  lowerContainer: {
    flex: 4,
    flexDirection: 'column',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 10,
  },
  actionsLine: {
    // sized to its content (divider + button row)
  },
  actionAreaContainer: {
    flexDirection: 'column',
    gap: 6,
  },
  actionRowSingle: {
    flexDirection: 'row',
    gap: 6,
    height: 74,
  },
  actionRowSub: {
    flexDirection: 'row',
    gap: 6,
    height: 38,
  },
  actionBtnSubRow: {
    flex: 1,
    borderRadius: theme.BORDER_RADIUS.card,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.SHADOWS.cardShadow,
  },
  actionBtnFlee: {
    backgroundColor: '#2D1B1E',
    borderColor: '#5C2D32',
  },
  subBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  subBtnSprite: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subBtnTitle: {
    ...theme.FONTS.label,
    fontSize: 10,
    letterSpacing: 0.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  logLine: {
    flex: 1,
  },
  logContainer: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: theme.COLORS.panelGreen,
    borderWidth: 1,
    borderColor: theme.COLORS.panelBorderGold,
    ...theme.SHADOWS.cardShadow,
  },
  logContainerInner: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    justifyContent: 'flex-start',
    gap: 2,
  },
  logText: {
    ...theme.FONTS.small,
    fontSize: 8,
    fontWeight: '600',
    lineHeight: 12,
  },

  /* ── Action buttons ──────────────────────────────────────────── */
  actionBtn: {
    flex: 1,
    borderRadius: theme.BORDER_RADIUS.card,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    gap: 2,
    ...theme.SHADOWS.cardShadow,
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
  actionBtnSprite: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTag: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.COLORS.panelBorderGoldStrong,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  infoTagText: {
    ...theme.FONTS.label,
    fontSize: 9,
    lineHeight: 11,
    color: theme.COLORS.candleGold,
    fontStyle: 'italic',
    fontWeight: 'bold',
    textTransform: 'none',
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
    color: 'rgba(243,226,189,0.4)',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  enemyTurnBox: {
    height: 118,
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
    color: 'rgba(243,226,189,0.55)',
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
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
    color: '#F8FAFC',
    fontWeight: 'normal',
    textAlign: 'center',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  fleeConfirmText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: '#EADCB9',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  fleeConfirmSubText: {
    ...theme.FONTS.small,
    fontSize: 11,
    color: '#DD7A86',
    textAlign: 'center',
    marginBottom: 20,
  },
  fleeModalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  fleeModalBtn: {
    flex: 1,
    height: 40,
    borderRadius: theme.BORDER_RADIUS.card,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fleeModalBtnCancel: {
    backgroundColor: '#1E1E1E',
    borderColor: '#3E3E3E',
  },
  fleeModalBtnConfirm: {
    backgroundColor: '#2D1B1E',
    borderColor: '#5C2D32',
  },
  fleeModalBtnText: {
    ...theme.FONTS.label,
    fontSize: 12,
    fontWeight: '800',
    color: '#EADCB9',
  },

  /* ── Skill info popup ───────────────────────────────────────── */
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoTitleRight: {
    flex: 1,
    gap: 4,
  },
  infoSkillName: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
    color: '#F8FAFC',
    fontWeight: 'normal',
  },
  infoBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoTypeBadge: {
    borderWidth: 1,
    borderRadius: theme.BORDER_RADIUS.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  infoTypeBadgeText: {
    ...theme.FONTS.label,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  infoTierText: {
    ...theme.FONTS.label,
    fontSize: 9,
    color: 'rgba(243,226,189,0.55)',
  },
  infoCdText: {
    ...theme.FONTS.label,
    fontSize: 9,
    color: 'rgba(243,226,189,0.55)',
  },
  infoStarsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  infoDesc: {
    ...theme.FONTS.body,
    fontSize: 13,
    lineHeight: 19,
    color: theme.COLORS.parchment,
  },
  modalItemScroll: {
    maxHeight: 250,
  },
  modalEmpty: {
    textAlign: 'center',
    padding: theme.SPACING.lg,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  modalItemIconBox: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalItemText: {
    flex: 1,
  },
  modalItemName: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: '#F8FAFC',
    marginBottom: 4,
  },
  modalItemQuantityBox: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 4,
  },
  modalItemQuantityText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 16,
    color: '#D4A754',
  },
  modalItemQuantityLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    color: '#D4A754',
  },
  modalItemDesc: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 14,
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
  lostLootTitle: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 12,
    color: '#9E2A2B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  noLostLootText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    color: '#7A6048',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
  },
  lostLootGold: {
    ...theme.FONTS.body,
    color: 'rgba(207,224,238,0.5)',
    textDecorationLine: 'line-through',
  },
  lostLootXpText: {
    ...theme.FONTS.body,
    color: 'rgba(207,224,238,0.5)',
    textDecorationLine: 'line-through',
  },
  lostLootItemText: {
    ...theme.FONTS.body,
    color: 'rgba(207,224,238,0.5)',
    textDecorationLine: 'line-through',
  },

  // ── Cozy Parchment Design System ──────────────────────────────
  cozyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24, 14, 6, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  cozyFrame: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#6E4524',
    borderColor: '#3A2210',
    borderWidth: 3,
    borderRadius: 12,
    padding: 10,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 8,
  },
  cozyParchment: {
    backgroundColor: '#ECD8A6',
    borderRadius: 14,
    borderColor: '#C9A86A',
    borderWidth: 2,
    paddingTop: 28,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
  },
  cozyBevel: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 250, 228, 0.4)',
    zIndex: 1,
  },
  cozySubtitle: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    color: '#4A2E14',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 15,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  cozyWell: {
    backgroundColor: '#F4E6C0',
    borderColor: '#C9A86A',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cozyWellDanger: {
    backgroundColor: '#E6D3A0',
    borderColor: '#D8483F',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cozyHeroIcon: {
    width: 120,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    position: 'relative',
    zIndex: 2,
  },
  cozyButton: {
    backgroundColor: '#7A4A24',
    borderColor: '#3A2210',
    borderWidth: 2,
    borderRadius: 8,
    padding: 2,
    width: '100%',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  cozyButtonInner: {
    borderWidth: 1.5,
    borderColor: '#D4A754',
    borderRadius: 6,
    backgroundColor: '#7A4A24',
    paddingVertical: 10,
    alignItems: 'center',
  },
  cozyButtonText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    color: '#FFF3DA',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    textAlign: 'center',
  },
  cozyButtonDanger: {
    backgroundColor: '#9E2A2B',
    borderColor: '#541012',
    borderWidth: 2,
    borderRadius: 8,
    padding: 2,
    width: '100%',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  cozyButtonDangerInner: {
    borderWidth: 1.5,
    borderColor: '#E65D5E',
    borderRadius: 6,
    backgroundColor: '#9E2A2B',
    paddingVertical: 10,
    alignItems: 'center',
  },
  cozyTopWrap: {
    position: 'absolute',
    top: -18,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  cozyTopOuter: {
    borderWidth: 3,
    borderColor: '#4A3917',
    borderRadius: 8,
    padding: 2,
    backgroundColor: '#1E1E20',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 6,
  },
  cozyTopInner: {
    borderWidth: 2,
    borderColor: '#D4A754',
    borderRadius: 5,
    backgroundColor: '#1E1E20',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  cozyTopText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 11,
    color: '#FFF3DA',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },

  lootChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 12,
    width: '100%',
  },
  lootItemChip: {
    alignItems: 'center',
    backgroundColor: '#F4E6C0',
    borderColor: '#C9A86A',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 8,
    minWidth: 96,
    maxWidth: 130,
    flexGrow: 0,
  },
  lootChipQty: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    color: '#3A2210',
    marginTop: 4,
    textAlign: 'center',
  },
  lootChipLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 7,
    color: '#9A7A4A',
    textTransform: 'uppercase',
    marginTop: 2,
    textAlign: 'center',
  },

  // ── Level up ──────────────────────────────────────────────────────────────
  levelUpSection: {
    backgroundColor: 'rgba(212,167,84,0.15)',
    borderRadius: theme.BORDER_RADIUS.md,
    padding: theme.SPACING.sm,
    width: '100%',
    marginBottom: theme.SPACING.md,
  },
  levelUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 4,
  },
  levelUpStar: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 10,
    color: '#D4A754',
  },
  levelUpText: {
    ...theme.FONTS.body,
    color: '#4A2E14',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  lostLootRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  // ── Dying enemy visual effects ────────────────────────────────────────────
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
});
