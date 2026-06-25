/**
 * DungeonMapScreen.js — Grid-based explorable dungeon map (Redesigned Premium UI)
 *
 * The main screen during a dungeon run. Players navigate orthogonally,
 * trigger encounters, collect loot, rest, or gamble.
 *
 * Redesigned with dynamic, zone-specific background and neon glowing themes.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Path,
  G,
  Line,
  Circle,
  Polygon,
  Ellipse,
} from 'react-native-svg';

import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { useFocusEffect } from '@react-navigation/native';
import { ZONES, getFloorCompletionReward } from '../data/zones';
import { ZONE_COMBAT_POOLS } from '../logic/dungeonGenerator';
import { MATERIALS, CONSUMABLES, GEAR } from '../data/gear';
import { getNote, NOTE_SPRITE } from '../data/notes';
import { calculateEffectiveStats, getXpForLevel, applyHealingEfficiency } from '../logic/progressionEngine';
import { generateTreasureDrops } from '../logic/lootEngine';
import Button from '../components/ui/Button';
import ResourceBar from '../components/ui/ResourceBar';
import ItemSprite from '../components/ItemSprite';
import ScreenLoader from '../components/ScreenLoader';
import { DUNGEON_RUN_ASSETS } from '../constants/sprites';

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



const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONSUMABLE_ICONS = {
  potion: '🧪',
  super_potion: '🧪',
  mega_potion: '🧪',
  ultra_potion: '🧪',
  antidote: '🌿',
  smoke_vial: '💨',
  mystery_chest: '🎁',
};

// Curated lists of texts
const TRAP_FLAVORS = [
  "Poison darts shoot from the walls!",
  "The floor gives way — you fall hard.",
  "A hidden blade swings from the ceiling.",
  "You trigger a pressure plate. Gas fills the room.",
  "The chest was a mimic. You escape, barely.",
];

const TREASURE_FLAVORS = [
  "A hidden cache — untouched for years.",
  "Someone stashed their best findings here.",
  "A forgotten storeroom. Jackpot.",
];

const BUFF_POOL = [
  { id: 'attackBonus', label: '+10% attack for this run', getValue: (hero) => Math.round(hero.attack * 0.10) },
  { id: 'critBonus', label: '+8% crit chance for this run', getValue: () => 0.08 },
  { id: 'dodgeBonus', label: '+5% dodge for this run', getValue: () => 0.05 },
  { id: 'defenceBonus', label: '+6 defence for this run', getValue: () => 6 },
  { id: 'maxHpBonus', label: '+15% max HP for this run', getValue: (hero) => Math.round(hero.maxHp * 0.15) },
];

const ZONE_MATERIAL_POOLS = {
  zone1: ['black_shard', 'black_crystal_small', 'black_crystal_big', 'black_crystal_core'],
  zone2: ['green_shard', 'green_crystal_small', 'green_crystal_big', 'green_crystal_core'],
  zone3: ['yellow_shard', 'yellow_crystal_small', 'yellow_crystal_big', 'yellow_crystal_core'],
};

// Zone-specific crystal sprites shown in the HUD header
const ZONE_SPRITES = {
  zone1: { spritesheet: 'crystals-1', frameIndex: 1 }, // Black Crystal (Sewer theme)
  zone2: { spritesheet: 'crystals-1', frameIndex: 5 }, // Green Crystal (Garden theme)
  zone3: { spritesheet: 'crystals-1', frameIndex: 9 }, // Yellow Crystal (Docks theme)
};

// Zone themes config — aligned to design system palette
const ZONE_THEMES = {
  zone1: {
    bg: '#0A120C',   // sewerBlack (Soggy Ruins)
    accent: '#3FB56E',  // healthGreen
    accentGlow: 'rgba(63, 181, 110, 0.08)',
    border: 'rgba(63, 181, 110, 0.22)',
  },
  zone2: {
    bg: '#0C1A08',   // deep green (Twisted Garden)
    accent: '#A98EE0',  // mysteryViolet
    accentGlow: 'rgba(169, 142, 224, 0.08)',
    border: 'rgba(169, 142, 224, 0.22)',
  },
  zone3: {
    bg: '#08101F',   // deep navy (Sunken Docks)
    accent: '#5A9FE0',  // coldBlue
    accentGlow: 'rgba(90, 159, 224, 0.08)',
    border: 'rgba(90, 159, 224, 0.22)',
  },
};

// ── SVG Dungeon Grid Cell Background Renderers ──────────────────────────────
const renderCellSVG = (zoneId, tile, isPlayerHere, isFog) => {
  // Define colors based on zone and fog status
  let bgStart = '#07070A';
  let bgEnd = '#030305';
  let elementColor = 'rgba(255, 255, 255, 0.05)';
  let accentColor = '#D4A754';
  
  if (zoneId === 'zone1') {
    // Soggy Ruins — design system sewerBlack palette
    bgStart = isFog ? '#060B06' : '#0B170B';
    bgEnd = isFog ? '#020402' : '#040904';
    elementColor = isFog ? 'rgba(63, 181, 110, 0.04)' : 'rgba(63, 181, 110, 0.12)';
    accentColor = '#3FB56E'; // healthGreen
  } else if (zoneId === 'zone2') {
    // Twisted Garden — design system mysteryViolet palette
    bgStart = isFog ? '#0B060F' : '#170B21';
    bgEnd = isFog ? '#040206' : '#09040D';
    elementColor = isFog ? 'rgba(169, 142, 224, 0.04)' : 'rgba(169, 142, 224, 0.12)';
    accentColor = '#A98EE0'; // mysteryViolet
  } else if (zoneId === 'zone3') {
    // Sunken Docks — design system coldBlue palette
    bgStart = isFog ? '#060B12' : '#0B1726';
    bgEnd = isFog ? '#020406' : '#04090F';
    elementColor = isFog ? 'rgba(90, 159, 224, 0.04)' : 'rgba(90, 159, 224, 0.12)';
    accentColor = '#5A9FE0'; // coldBlue
  }

  // Linear gradient ID must be unique per cell type/fog combo to prevent rendering issues
  const gradId = `cellGrad_${zoneId}_${tile.x}_${tile.y}_${isFog ? 'fog' : 'rev'}`;

  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 80 80">
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={bgStart} />
          <Stop offset="100%" stopColor={bgEnd} />
        </LinearGradient>
      </Defs>
      <Rect width="80" height="80" fill={`url(#${gradId})`} />
      
      {/* Zone-Specific Background Artwork */}
      {zoneId === 'zone1' && (
        <G stroke={elementColor} strokeWidth="1" fill="none">
          {/* Sewer Grate/Brick Pattern */}
          <Line x1="0" y1="20" x2="80" y2="20" strokeDasharray="3,3" />
          <Line x1="0" y1="40" x2="80" y2="40" strokeDasharray="3,3" />
          <Line x1="0" y1="60" x2="80" y2="60" strokeDasharray="3,3" />
          <Line x1="20" y1="0" x2="20" y2="80" strokeDasharray="3,3" />
          <Line x1="40" y1="0" x2="40" y2="80" strokeDasharray="3,3" />
          <Line x1="60" y1="0" x2="60" y2="80" strokeDasharray="3,3" />
          
          {/* Subtle pipe outline in one of the corners for revealed tiles */}
          {!isFog && (
            <G stroke={accentColor} strokeWidth="1.2" opacity="0.3">
              <Path d="M 0 10 Q 10 10 10 0" />
              <Path d="M 0 14 Q 14 14 14 0" />
              <Circle cx="40" cy="40" r="3" fill="none" stroke={accentColor} opacity="0.2" />
            </G>
          )}
        </G>
      )}

      {zoneId === 'zone2' && (
        <G fill="none">
          {/* Winding organic forest roots/spores */}
          <Path d="M -10 40 Q 20 20 40 50 T 90 40" stroke={elementColor} strokeWidth="1.5" />
          <Path d="M 40 -10 Q 50 30 30 50 T 40 90" stroke={elementColor} strokeWidth="1" />
          
          {!isFog && (
            <G opacity="0.35">
              {/* Spores or tiny flower outline */}
              <Circle cx="60" cy="20" r="2.5" fill={accentColor} />
              <Circle cx="20" cy="60" r="1.5" fill={accentColor} />
              {/* Tiny thorn leaf */}
              <Path d="M 35 45 Q 40 38 45 45 Q 40 52 35 45 Z" fill={accentColor} />
            </G>
          )}
        </G>
      )}

      {zoneId === 'zone3' && (
        <G stroke={elementColor} strokeWidth="1" fill="none">
          {/* Docks: Wood Planks */}
          <Line x1="0" y1="16" x2="80" y2="16" />
          <Line x1="0" y1="32" x2="80" y2="32" />
          <Line x1="0" y1="48" x2="80" y2="48" />
          <Line x1="0" y1="64" x2="80" y2="64" />
          
          {/* Vertical wood grain lines */}
          <Line x1="30" y1="0" x2="30" y2="16" strokeDasharray="2,2" />
          <Line x1="55" y1="16" x2="55" y2="32" strokeDasharray="2,2" />
          <Line x1="20" y1="32" x2="20" y2="48" strokeDasharray="2,2" />
          <Line x1="65" y1="48" x2="65" y2="64" strokeDasharray="2,2" />
          
          {!isFog && (
            <G stroke={accentColor} strokeWidth="1" opacity="0.3">
              {/* Subtle water ripple waves */}
              <Path d="M 10 24 Q 20 20 30 24" />
              <Path d="M 50 56 Q 60 52 70 56" />
            </G>
          )}
        </G>
      )}
    </Svg>
  );
};

export default function DungeonMapScreen({ navigation }) {
  const { state, dispatch } = useGame();
  const { currentRun, hero } = state;

  // Compute responsive cell size to prevent vertical extrapolation/overflow
  const cellWidth = useMemo(() => {
    const cols = currentRun?.gridWidth || 3;
    const rows = currentRun?.gridHeight || 3;
    // 1. Width constraint (subtracting 48 to ensure horizontal margins match design system)
    const widthConstraint = Math.floor((SCREEN_WIDTH - 48 - ((cols - 1) * 8)) / cols);
    // 2. Height constraint (subtracting 440 to keep grid within screen bounds)
    const maxGridHeight = SCREEN_HEIGHT - 440;
    const heightConstraint = Math.floor((maxGridHeight - ((rows - 1) * 8)) / rows);
    return Math.max(50, Math.min(widthConstraint, heightConstraint));
  }, [currentRun?.gridWidth, currentRun?.gridHeight]);

  // Local modal states
  const [activeModal, setActiveModal] = useState(null); // 'rest' | 'treasure' | 'gamble' | 'death' | 'flee' | 'bag'
  const [modalData, setModalData] = useState(null);
  // Themed replacement for native Alert popups: { title, message, spritesheet?, frameIndex?, highlight? }
  const [notice, setNotice] = useState(null);

  // Animation for adjacent pulsing border
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  // Calculate effective stats including current run buffs
  const effectiveStats = calculateEffectiveStats(hero, undefined, currentRun.runBuffs);

  // Derive XP values for level progress bar
  const xpForCurrent = getXpForLevel(hero.level);
  const xpForNext = getXpForLevel(hero.level + 1);
  const xpIntoLevel = hero.xp - xpForCurrent;
  const xpNeeded = xpForNext - xpForCurrent;

  // Group run consumables for rendering in the bag
  const runConsumablesList = useMemo(() => {
    const consumableIds = currentRun.consumables || [];
    const consumableMap = {};
    for (const id of consumableIds) {
      consumableMap[id] = (consumableMap[id] || 0) + 1;
    }
    return Object.entries(consumableMap).map(([id, quantity]) => {
      const def = CONSUMABLES.find(c => c.id === id);
      let description = def?.description || '';
      if (def?.effect?.type === 'heal') {
        const baseHeal = def.effect.amount || 0;
        const finalHeal = applyHealingEfficiency(baseHeal, hero);
        description = `Restore ${finalHeal} HP (enhanced from ${baseHeal})`;
      }
      return {
        id,
        quantity,
        name: def?.name || id,
        description,
      };
    });
  }, [currentRun.consumables]);

  const handleUseItemOnMap = (item) => {
    const consumableDef = CONSUMABLES.find(c => c.id === item.id);
    if (['potion', 'super_potion', 'mega_potion', 'ultra_potion'].includes(item.id)) {
      if (hero.hp >= effectiveStats.maxHp) {
        setNotice({
          title: 'FULL HEALTH',
          spritesheet: consumableDef?.spritesheet,
          frameIndex: consumableDef?.frameIndex,
          message: `${hero.name || 'Mochi'} is already at full health.`,
        });
        return;
      }

      const baseHeal = consumableDef?.effect?.amount || 0;
      const finalHeal = applyHealingEfficiency(baseHeal, hero);
      const actualHealed = Math.min(finalHeal, effectiveStats.maxHp - hero.hp);

      dispatch({ type: 'USE_RUN_CONSUMABLE', payload: { consumableId: item.id } });
      setNotice({
        title: 'ITEM USED',
        spritesheet: consumableDef?.spritesheet,
        frameIndex: consumableDef?.frameIndex,
        message: `${hero.name || 'Mochi'} drank a ${item.name}.`,
        highlight: `+${actualHealed} HP`,
      });
    } else if (item.id === 'mystery_chest') {
      setNotice({
        title: 'MYSTERY CHEST',
        spritesheet: consumableDef?.spritesheet,
        frameIndex: consumableDef?.frameIndex,
        message: 'You can open this chest from your inventory bag back at camp.',
      });
    } else {
      setNotice({
        title: 'COMBAT ITEM',
        spritesheet: consumableDef?.spritesheet,
        frameIndex: consumableDef?.frameIndex,
        message: 'This item can only be used during battle encounters.',
      });
    }
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Show floor-complete modal whenever the screen is focused and all tiles are cleared
  useFocusEffect(
    useCallback(() => {
      if (currentRun.active && currentRun.roomsCleared >= currentRun.totalRooms) {
        setActiveModal('floorComplete');
      }
    }, [currentRun.active, currentRun.roomsCleared, currentRun.totalRooms])
  );

  const handleFloorComplete = () => {
    setActiveModal(null);
    dispatch({ type: 'END_RUN', payload: { outcome: 'win' } });
    navigation.navigate('Camp');
  };

  // Safety check
  if (!currentRun.active || !currentRun.zoneId) {
    return null;
  }

  const zone = ZONES[currentRun.zoneId];
  const { gridWidth, gridHeight, tiles, playerPos } = currentRun;

  // Grab active zone theme tokens
  const zTheme = ZONE_THEMES[currentRun.zoneId] || {
    bg: '#07070A',
    accent: theme.COLORS.primary,
    accentGlow: 'rgba(212, 167, 84, 0.08)',
    border: 'rgba(255, 255, 255, 0.05)',
  };

  const isAdjacent = (x, y) => {
    const dist = Math.abs(x - playerPos.x) + Math.abs(y - playerPos.y);
    return dist === 1;
  };

  const getTileIndex = (x, y) => y * gridWidth + x;

  // Boss on floor 10 is locked until every other tile is cleared
  const isBossLocked = (tile) =>
    tile.type === 'boss' && currentRun.roomsCleared < currentRun.totalRooms - 1;

  const handleTileTap = (tile) => {
    if (!isAdjacent(tile.x, tile.y)) return;

    if (isBossLocked(tile)) {
      setNotice({
        title: 'BOSS SEALED',
        message: 'Clear all other rooms in this zone before facing the boss!',
      });
      return;
    }

    dispatch({ type: 'MOVE_PLAYER', payload: { x: tile.x, y: tile.y } });

    if (!tile.cleared && tile.type !== 'start') {
      resolveRoom(tile);
    }
  };

  const resolveRoom = (tile) => {
    const { type, battleRating = 1, enemyCount } = tile;
    if (type === 'combat') {
      navigation.navigate('Combat', { roomType: 'combat', battleRating, enemyCount });
    } else if (type === 'boss') {
      navigation.navigate('Combat', { roomType: 'boss' });
    } else if (type === 'rest') {
      const randBuff = BUFF_POOL[Math.floor(Math.random() * BUFF_POOL.length)];
      const value = randBuff.getValue(hero);
      
      setModalData({
        buffId: randBuff.id,
        buffLabel: randBuff.label,
        buffValue: value,
      });
      setActiveModal('rest');
    } else if (type === 'treasure') {
      const loot = generateTreasureDrops(currentRun.zoneId, currentRun.floorNumber, false);

      dispatch({
        type: 'ADD_RUN_LOOT',
        payload: { gold: loot.gold, materials: loot.materials, consumables: loot.consumables }
      });

      setModalData({
        gold: loot.gold,
        materials: loot.materials,
        consumables: loot.consumables,
      });
      setActiveModal('treasure');
    } else if (type === 'gamble') {
      const roll = Math.random();
      if (roll < 0.33) {
        const pct = Math.floor(Math.random() * 41) + 20; 
        const dmg = Math.floor(effectiveStats.maxHp * (pct / 100));
        const newHp = Math.max(0, hero.hp - dmg);
        
        dispatch({ type: 'TAKE_DAMAGE', payload: { amount: dmg } });

        const flavor = TRAP_FLAVORS[Math.floor(Math.random() * TRAP_FLAVORS.length)];

        setModalData({
          outcome: 'trap',
          flavor,
          pct,
          damage: dmg,
          survived: newHp > 0,
        });
        setActiveModal('gamble');
      } else if (roll < 0.66) {
        const loot = generateTreasureDrops(currentRun.zoneId, currentRun.floorNumber, true);

        dispatch({
          type: 'ADD_RUN_LOOT',
          payload: { gold: loot.gold, materials: loot.materials, consumables: loot.consumables }
        });

        const flavor = TREASURE_FLAVORS[Math.floor(Math.random() * TREASURE_FLAVORS.length)];

        setModalData({
          outcome: 'treasure',
          flavor,
          gold: loot.gold,
          materials: loot.materials,
          consumables: loot.consumables,
        });
        setActiveModal('gamble');
      } else {
        const zoneId = currentRun.zoneId || 'zone1';
        const floorNum = currentRun.floorNumber || 1;
        const floorPools = ZONE_COMBAT_POOLS[zoneId]?.[floorNum] || { ratings: [1], enemyCounts: [1] };
        const maxRating = Math.max(...floorPools.ratings);
        const maxEnemyCount = Math.max(...floorPools.enemyCounts);

        setModalData({
          outcome: 'ambush',
          battleRating: maxRating,
          enemyCount: maxEnemyCount,
        });
        setActiveModal('gamble');
      }
    }
  };

  const handleCloseGamble = () => {
    const outcome = modalData?.outcome;
    const survived = modalData?.survived;

    setModalData(null);
    setActiveModal(null);

    if (outcome === 'trap') {
      if (!survived) {
        setActiveModal('death');
      } else {
        dispatch({ type: 'CLEAR_CURRENT_TILE' });
      }
    } else if (outcome === 'treasure') {
      dispatch({ type: 'CLEAR_CURRENT_TILE' });
    } else if (outcome === 'ambush') {
      navigation.navigate('Combat', {
        roomType: 'ambush',
        battleRating: modalData.battleRating,
        enemyCount: modalData.enemyCount,
      });
    }
  };

  const handleChooseRestOption = (option) => {
    if (option === 'heal') {
      const healAmount = effectiveStats.maxHp;
      dispatch({ type: 'HEAL', payload: { amount: healAmount } });
    } else {
      dispatch({
        type: 'APPLY_RUN_BUFF',
        payload: { type: modalData.buffId, value: modalData.buffValue },
      });
    }

    dispatch({ type: 'CLEAR_CURRENT_TILE' });
    setModalData(null);
    setActiveModal(null);
  };

  const handleCloseTreasure = () => {
    dispatch({ type: 'CLEAR_CURRENT_TILE' });
    setModalData(null);
    setActiveModal(null);
  };

  const handleCloseDeath = () => {
    setActiveModal(null);
    dispatch({ type: 'END_RUN', payload: { outcome: 'lose' } });
    navigation.navigate('Camp');
  };

  const handleConfirmFlee = () => {
    setActiveModal(null);
    dispatch({ type: 'END_RUN', payload: { outcome: 'flee' } });
    navigation.navigate('Camp');
  };

  const renderCell = (x, y) => {
    const isPlayerHere = playerPos.x === x && playerPos.y === y;
    const tileIndex = getTileIndex(x, y);
    const tile = tiles[tileIndex];

    if (!tile) return null;

    const adjacent = isAdjacent(x, y);
    const isFog = !tile.revealed;
    const bossLocked = isBossLocked(tile);

    let arrowIndicator = null;
    if (adjacent) {
      const dx = x - playerPos.x;
      const dy = y - playerPos.y;
      let arrowChar = '';
      let arrowStyle = {};

      if (dx === 1 && dy === 0) {
        arrowChar = '▶';
        arrowStyle = { left: -14, top: '50%', transform: [{ translateY: -10 }] };
      } else if (dx === -1 && dy === 0) {
        arrowChar = '◀';
        arrowStyle = { right: -14, top: '50%', transform: [{ translateY: -10 }] };
      } else if (dx === 0 && dy === 1) {
        arrowChar = '▼';
        arrowStyle = { top: -14, left: '50%', transform: [{ translateX: -10 }] };
      } else if (dx === 0 && dy === -1) {
        arrowChar = '▲';
        arrowStyle = { bottom: -14, left: '50%', transform: [{ translateX: -10 }] };
      }

      if (arrowChar) {
        arrowIndicator = (
          <View pointerEvents="none" style={[styles.arrowContainer, arrowStyle]}>
            <Text style={styles.arrowText}>{arrowChar}</Text>
          </View>
        );
      }
    }

    let label = 'Locked';
    let cellStyle = styles.fogCell;
    let labelColor = 'rgba(255, 255, 255, 0.25)';

    const CLEARED_COLOR = '#5CC489'; // buffMint

    // Star badge config for combat tiles
    const STAR_COLORS = { 
      1: '#4ade80', // Green (Very Easy)
      2: '#5A9FE0', // Blue (Easy)
      3: '#F5CF4A', // Yellow (Normal)
      4: '#f97316', // Orange (Hard)
      5: '#ef4444'  // Red (Nightmare)
    };
    const STAR_LABELS = { 
      1: '★☆☆☆☆', 
      2: '★★☆☆☆', 
      3: '★★★☆☆', 
      4: '★★★★☆', 
      5: '★★★★★' 
    };

    if (tile.type === 'start') {
      label = 'Start';
      cellStyle = styles.startCell;
      labelColor = '#5A9FE0'; // coldBlue — start is a special revealed tile
    } else if (!isFog) {
      if (tile.type === 'combat') {
        label = tile.cleared ? 'Cleared' : 'Combat';
        cellStyle = styles.combatCell;
        labelColor = tile.cleared ? CLEARED_COLOR : '#5A9FE0'; // coldBlue
      } else if (tile.type === 'rest') {
        label = tile.cleared ? 'Cleared' : 'Rest';
        cellStyle = styles.restCell;
        labelColor = tile.cleared ? CLEARED_COLOR : '#3FB56E'; // healthGreen
      } else if (tile.type === 'treasure') {
        label = tile.cleared ? 'Cleared' : 'Treasure';
        cellStyle = styles.treasureCell;
        labelColor = tile.cleared ? CLEARED_COLOR : '#F5CF4A'; // treasureGold
      } else if (tile.type === 'gamble') {
        label = tile.cleared ? 'Cleared' : '???';
        cellStyle = styles.gambleCell;
        labelColor = tile.cleared ? CLEARED_COLOR : '#A98EE0'; // mysteryViolet
      } else if (tile.type === 'boss') {
        label = tile.cleared ? 'Cleared' : bossLocked ? 'Sealed' : 'Boss';
        cellStyle = bossLocked ? styles.bossLockedCell : styles.bossCell;
        labelColor = tile.cleared ? CLEARED_COLOR : bossLocked ? 'rgba(255,255,255,0.3)' : '#DD7A86';
      }
    }

    const renderCellSprite = () => {
      if (isPlayerHere) {
        return (
          <View style={styles.playerAvatarWrapper}>
            <ExpoImage
              source={require('../../assets/sprites/units/hero/hero_head.png')}
              style={{ width: 28, height: 28 }}
              contentFit="contain"
            />
          </View>
        );
      }

      let sheet = 'icons-1';
      let frame = 0;

      if (isFog) {
        sheet = 'icons-map';
        frame = 49; // Lock
      } else {
        if (tile.type === 'start') {
          sheet = 'icons-map';
          frame = 4;
        } else if (tile.type === 'combat') {
          sheet = 'icons-1';
          frame = 10;
        } else if (tile.type === 'rest') {
          sheet = 'icons-map';
          frame = 31; // Fireplace
        } else if (tile.type === 'treasure') {
          sheet = 'icons-1';
          frame = 12;
        } else if (tile.type === 'gamble') {
          sheet = 'icons-map';
          frame = 19; // Surprise/Jail door
        } else if (tile.type === 'boss') {
          sheet = 'icons-1';
          frame = 33;
        }
      }

      return (
        <ItemSprite
          spritesheet={sheet}
          frameIndex={frame}
          displaySize={28}
          opacity={isFog ? 0.35 : tile.cleared ? 0.45 : 1}
        />
      );
    };


    return (
      <View
        key={`${x}_${y}`}
        style={[
          styles.cellShadowContainer,
          { 
            width: cellWidth, 
            height: cellWidth, 
            position: 'relative',
            zIndex: adjacent ? 10 : 1,
            elevation: adjacent ? 6 : 5
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.cell,
            { width: '100%', height: '100%' },
            cellStyle,
            isPlayerHere && styles.currentCell,
            tile.cleared && !isPlayerHere && styles.clearedCell,
          ]}
          disabled={!adjacent}
          onPress={() => handleTileTap(tile)}
          activeOpacity={0.7}
        >
          {/* Render zone-specific background SVG */}
          {renderCellSVG(currentRun.zoneId, tile, isPlayerHere, isFog)}
  
          <View style={styles.cellContent}>
            {renderCellSprite()}
            <Text style={[styles.cellLabel, { color: isPlayerHere ? '#D4A754' : labelColor }]} numberOfLines={1}>
              {isPlayerHere ? "You're Here" : label}
            </Text>
            {/* Star badge for combat tiles (only when revealed and not cleared) */}
            {tile.type === 'combat' && !isFog && !tile.cleared && tile.battleRating && !isPlayerHere && (
              <Text 
                style={[styles.starBadge, { color: STAR_COLORS[tile.battleRating] }]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
              >
                {STAR_LABELS[tile.battleRating]}
              </Text>
            )}
          </View>
  
          {/* Sealed Overlay for Locked Boss */}
          {bossLocked && !isPlayerHere && (
            <View style={styles.sealedOverlay}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <ItemSprite spritesheet="icons-map" frameIndex={49} displaySize={10} />
                <Text style={styles.sealedText}>SEALED</Text>
              </View>
            </View>
          )}
  
          {/* Pulsing glow border if adjacent (tappable) */}
          {adjacent && (
            <Animated.View
              style={[
                styles.pulseBorder,
                {
                  borderColor: tile.cleared ? 'rgba(255, 255, 255, 0.4)' : zTheme.accent,
                  opacity: pulseAnim,
                },
              ]}
            />
          )}
        </TouchableOpacity>
        {/* Directional movement arrow indicator (outside cell to prevent overflow clipping) */}
        {arrowIndicator}
      </View>
    );
  };

  const renderGrid = () => {
    const rows = [];
    for (let y = 0; y < gridHeight; y++) {
      const cells = [];
      for (let x = 0; x < gridWidth; x++) {
        cells.push(renderCell(x, y));
      }
      rows.push(
        <View key={y} style={styles.gridRow}>
          {cells}
        </View>
      );
    }
    return <View style={styles.gridContainer}>{rows}</View>;
  };

  const renderLootItems = (lootMats, lootConsumables = {}, gold = 0, xp = 0, recessed = false) => {
    const items = [];
    for (const [id, qty] of Object.entries(lootMats || {})) {
      if (qty > 0) items.push({ id, qty, isConsumable: false });
    }
    for (const [id, qty] of Object.entries(lootConsumables || {})) {
      if (qty > 0) items.push({ id, qty, isConsumable: true });
    }

    if (items.length === 0 && gold <= 0 && xp <= 0) return null;

    const chipStyle = recessed ? styles.bagItemChipRecessed : styles.bagItemChip;

    return (
      <View style={styles.bagChipsContainer}>
        {xp > 0 && (
          <View style={chipStyle}>
            <ItemSprite spritesheet="icons-map" frameIndex={146} displaySize={32} />
            <Text style={styles.bagChipQty}>{xp} XP</Text>
          </View>
        )}
        {gold > 0 && (
          <View style={chipStyle}>
            <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={32} />
            <Text style={styles.bagChipQty}>{gold}</Text>
          </View>
        )}
        {items.map(({ id, qty, isConsumable }) => {
          const def = isConsumable ? CONSUMABLES.find(c => c.id === id) : MATERIALS[id];
          return (
            <View key={id} style={chipStyle}>
              {def?.spritesheet && (
                <ItemSprite
                  spritesheet={def.spritesheet}
                  frameIndex={def.frameIndex}
                  displaySize={32}
                />
              )}
              <Text style={styles.bagChipQty}>{qty}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const zoneId = state.currentRun?.zoneId || 'zone1';
  const runAssets = [
    require('../../assets/sprites/units/hero/hero_head.png'),
    ...(DUNGEON_RUN_ASSETS[zoneId] || []),
  ];

  return (
    <ScreenLoader assets={runAssets}>
      <SafeAreaView style={[styles.root, { backgroundColor: '#133131' }]}>
      {/* Dynamic Zone-Colored Ambient Glow */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="zoneGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={zTheme.accent} stopOpacity="0.06" />
            <Stop offset="100%" stopColor="#133131" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="#133131" />
        <Rect width="100%" height="100%" fill="url(#zoneGlow)" />
      </Svg>

      {/* ── HUD card ─────────────────────────────────────────────── */}
      <View style={styles.hud}>
        {/* Zone-tinted gradient background */}
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id="hudBg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={zTheme.accent} stopOpacity="0.14" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0.42" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="rgba(0,0,0,0.52)" rx={14} />
          <Rect width="100%" height="100%" fill="url(#hudBg)" rx={14} />
          {/* inner border */}
          <Rect x="1" y="1" width="99%" height="98%" rx={13} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        </Svg>

        <View style={styles.hudInner}>
          {/* ── Zone Brand and Progress ── */}
          <View style={styles.hudHeaderRow}>
            <View style={styles.zoneMetaBlock}>
              <Text style={styles.zoneTitle}>{zone.name}</Text>
              <Text style={[styles.floorLabel, { color: zTheme.accent }]}>
                Zone {currentRun.floorNumber || 1} of {zone.floorCount || 10}
              </Text>
            </View>
            <View style={[styles.roomsBadge, {
              borderColor: zTheme.accent + '33',
              backgroundColor: zTheme.accent + '12',
            }]}>
              <ItemSprite spritesheet="icons-map" frameIndex={52} displaySize={13} />
              <Text style={[styles.roomsBadgeText, { color: zTheme.accent }]}>
                {currentRun.roomsCleared}/{currentRun.totalRooms}
              </Text>
            </View>
          </View>

          {/* Subtle Horizontal Divider */}
          <View style={styles.hudDivider} />

          {/* ── Loot Stats (Gold & XP) ── */}
          <View style={styles.lootStatsRow}>
            <View style={[styles.lootStatChip, styles.lootStatChipGold]}>
              <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={18} />
              <View>
                <Text style={styles.lootStatLabel}>Gold Collected</Text>
                <Text style={styles.lootStatValueGold}>{currentRun.lootCollected.gold} G</Text>
              </View>
            </View>
            
            <View style={[styles.lootStatChip, styles.lootStatChipXp]}>
              <ItemSprite spritesheet="icons-map" frameIndex={146} displaySize={18} />
              <View>
                <Text style={styles.lootStatLabel}>XP Acquired</Text>
                <Text style={styles.lootStatValueXp}>{currentRun.lootCollected.xp || 0} XP</Text>
              </View>
            </View>
          </View>

          {/* ── Hero Status Row (Level, HP, XP) ── */}
          <View style={styles.heroStatusRow}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelLabel}>LV</Text>
              <Text style={styles.levelValue}>{hero.level}</Text>
            </View>
            <View style={styles.gaugesContainer}>
              <ResourceBar
                variant="heroHp"
                label="HP"
                current={hero.hp}
                max={effectiveStats.maxHp}
              />
              <ResourceBar
                variant="xp"
                label="XP"
                current={xpIntoLevel}
                max={xpNeeded}
              />
            </View>
          </View>

          {/* ── Run buffs (horizontal scroll) ── */}
          {Object.values(currentRun.runBuffs).some((val) => val > 0) && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.buffsRow}
            >
              <Text style={styles.buffsTitle}>Buffs</Text>
              {currentRun.runBuffs.attackBonus > 0 && (
                <View style={styles.buffBadge}>
                  <ItemSprite spritesheet="icons-map" frameIndex={92} displaySize={12} />
                  <Text style={styles.buffBadgeText}>ATK +{currentRun.runBuffs.attackBonus}</Text>
                </View>
              )}
              {currentRun.runBuffs.critBonus > 0 && (
                <View style={styles.buffBadge}>
                  <ItemSprite spritesheet="icons-map" frameIndex={47} displaySize={12} />
                  <Text style={styles.buffBadgeText}>CRIT +{Math.round(currentRun.runBuffs.critBonus * 100)}%</Text>
                </View>
              )}
              {currentRun.runBuffs.dodgeBonus > 0 && (
                <View style={styles.buffBadge}>
                  <ItemSprite spritesheet="icons-map" frameIndex={94} displaySize={12} />
                  <Text style={styles.buffBadgeText}>DODGE +{Math.round(currentRun.runBuffs.dodgeBonus * 100)}%</Text>
                </View>
              )}
              {currentRun.runBuffs.defenceBonus > 0 && (
                <View style={styles.buffBadge}>
                  <ItemSprite spritesheet="icons-map" frameIndex={62} displaySize={12} />
                  <Text style={styles.buffBadgeText}>DEF +{currentRun.runBuffs.defenceBonus}</Text>
                </View>
              )}
              {currentRun.runBuffs.maxHpBonus > 0 && (
                <View style={styles.buffBadge}>
                  <ItemSprite spritesheet="icons-map" frameIndex={135} displaySize={12} />
                  <Text style={styles.buffBadgeText}>HP +{currentRun.runBuffs.maxHpBonus}</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* Zone accent bottom line */}
        <View style={[styles.hudAccentLine, { backgroundColor: zTheme.accent }]} />
      </View>

      {/* ── Grid Center ────────────────────────────────────────────── */}
      <View style={styles.gridSection}>
        {renderGrid()}
      </View>

      {/* ── Action Buttons Row ────────────────────────────────────────── */}
      <View style={styles.actionButtonsRow}>
        <Button
          title="Run Bag"
          icon={<ItemSprite spritesheet="icons-map" frameIndex={99} displaySize={24} />}
          variant="secondary"
          onPress={() => setActiveModal('bag')}
          style={{ flex: 1 }}
        />
        <Button
          title="Flee Region"
          icon={<ItemSprite spritesheet="icons-map" frameIndex={127} displaySize={24} />}
          variant="danger"
          onPress={() => setActiveModal('flee')}
          style={{ flex: 1 }}
        />
      </View>

      {/* ── Footer Info ────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tap adjacent sites to explore. Cleared sites can be re-entered to navigate.
        </Text>
      </View>

      {/* ════════════════════════════════════════════════════════════════
          1. REST ROOM CHOICE MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'rest'} transparent animationType="fade">
        <View style={styles.cozyOverlay}>
          <View style={[styles.cozyFrame, theme.SHADOWS.cardShadow]}>
            <View style={styles.cozyParchment}>
              <View style={styles.cozyBevel} pointerEvents="none" />
              


              <Text style={styles.cozySubtitle}>
                You found a quiet corner. Take a moment to prepare for the depths ahead.
              </Text>

              <View style={styles.modalChoiceContainer}>
                <TouchableOpacity
                  style={styles.cozyChoiceCard}
                  onPress={() => handleChooseRestOption('heal')}
                  activeOpacity={0.8}
                >
                  <ItemSprite spritesheet="icons-map" frameIndex={3} displaySize={32} />
                  <Text style={styles.cozyChoiceCardText}>Restore Health</Text>
                  <Text style={styles.cozyChoiceCardDesc}>
                    Recover your full health (+{effectiveStats.maxHp} HP)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cozyChoiceCard}
                  onPress={() => handleChooseRestOption('buff')}
                  activeOpacity={0.8}
                >
                  <ItemSprite spritesheet="icons-1" frameIndex={4} displaySize={32} />
                  <Text style={styles.cozyChoiceCardText}>Receive Buff</Text>
                  <Text style={styles.cozyChoiceCardDesc}>
                    Skip heal & obtain: {modalData?.buffLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.cozyTopWrap} pointerEvents="none">
              <View style={styles.cozyTopOuter}>
                <View style={styles.cozyTopInner}>
                  <Text style={styles.cozyTopText}>CAMPFIRE REST</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          2. TREASURE ROOM MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'treasure'} transparent animationType="fade">
        <View style={styles.cozyOverlay}>
          <View style={[styles.cozyFrame, theme.SHADOWS.cardShadow]}>
            <View style={styles.cozyParchment}>
              <View style={styles.cozyBevel} pointerEvents="none" />

              <Text style={styles.cozySubtitle}>
                An unlocked chest lies open in the corner of this chamber.
              </Text>


              {renderLootItems(modalData?.materials, modalData?.consumables, modalData?.gold)}


              <TouchableOpacity activeOpacity={0.85} onPress={handleCloseTreasure} style={styles.cozyButton}>
                <View style={styles.cozyButtonInner}>
                  <Text style={styles.cozyButtonText}>Claim Rewards</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.cozyTopWrap} pointerEvents="none">
              <View style={styles.cozyTopOuter}>
                <View style={styles.cozyTopInner}>
                  <Text style={styles.cozyTopText}>TREASURE CHEST</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          3. GAMBLE (???) ROOM MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'gamble'} transparent animationType="fade">
        <View style={styles.cozyOverlay}>
          <View style={[styles.cozyFrame, theme.SHADOWS.cardShadow]}>
            <View style={styles.cozyParchment}>
              <View style={styles.cozyBevel} pointerEvents="none" />
              
              {modalData?.outcome === 'trap' && (
                <View style={styles.outcomeContent}>
                  <Text style={[styles.outcomeTitle, { color: '#9E1B1B' }]}>IT'S A TRAP!</Text>
                  <Text style={[styles.outcomeFlavor, { color: '#4A2E14' }]}>"{modalData.flavor}"</Text>
                  <Text style={styles.trapDamageText}>
                    {hero.name || 'Mochi'} lost {modalData.pct}% max HP (-{modalData.damage} HP)
                  </Text>
                  <Text style={[styles.outcomeSubText, { color: '#3E2723' }]}>
                    {modalData.survived
                      ? "You pull yourself out of the mechanism, bruised but still standing."
                      : "The trap proved fatal..."}
                  </Text>
                </View>
              )}

              {modalData?.outcome === 'treasure' && (
                <View style={styles.outcomeContent}>
                  <Text style={[styles.outcomeTitle, { color: '#B45309' }]}>Jackpot!</Text>
                  <Text style={[styles.outcomeFlavor, { color: '#4A2E14' }]}>"{modalData.flavor}"</Text>
                  <Text style={{ color: '#5C3F22', fontFamily: 'Silkscreen-Regular', fontSize: 9, textAlign: 'center', marginBottom: 8 }}>
                    Double Treasure Jackpot!
                  </Text>
                  {renderLootItems(modalData.materials, modalData.consumables, modalData.gold)}

                </View>
              )}

              {modalData?.outcome === 'ambush' && (
                <View style={styles.outcomeContent}>
                  <Text style={[styles.outcomeTitle, { color: '#831843' }]}>Ambush!</Text>
                  <Text style={[styles.outcomeSubText, { color: '#3E2723', marginBottom: 6 }]}>
                    A shadow leaps from the dark. You are ambushed by monsters!
                  </Text>
                  <Text style={[styles.ambushWarningText, { color: '#9E1B1B', fontFamily: 'Silkscreen-Regular', fontSize: 10 }]}>
                    Prepare for a challenging fight!
                  </Text>
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleCloseGamble}
                style={
                  modalData?.outcome === 'trap' && !modalData.survived
                    ? styles.cozyButtonDanger
                    : styles.cozyButton
                }
              >
                <View
                  style={
                    modalData?.outcome === 'trap' && !modalData.survived
                      ? styles.cozyButtonDangerInner
                      : styles.cozyButtonInner
                  }
                >
                  <Text style={styles.cozyButtonText}>
                    {modalData?.outcome === 'ambush' ? 'Prepare for Battle' : 'Continue'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>


          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          4. RUN DEFEAT / DEATH OVERLAY
      ════════════════════════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'death'} transparent animationType="fade">
        <View style={styles.cozyOverlay}>
          <View style={[styles.cozyFrame, theme.SHADOWS.cardShadow]}>
            <View style={styles.cozyParchment}>
              <View style={styles.cozyBevel} pointerEvents="none" />

              <Text style={styles.cozySubtitle}>
                {hero.name || 'Mochi'} fell to the dangers of the region and was forced to retreat.
              </Text>

              <View style={styles.cozyWellDanger}>
                <Text style={styles.lostLootTitle}>Loot Lost in the Depths:</Text>
                {currentRun.lootCollected.gold === 0 &&
                Object.keys(currentRun.lootCollected.materials).length === 0 &&
                Object.keys(currentRun.lootCollected.consumables || {}).length === 0 &&
                (currentRun.lootCollected.xp || 0) === 0 ? (
                  <Text style={styles.noLostLootText}>No materials, gold, XP, or consumables were collected this run.</Text>
                ) : (
                  renderLootItems(
                    currentRun.lootCollected.materials,
                    currentRun.lootCollected.consumables,
                    currentRun.lootCollected.gold,
                    currentRun.lootCollected.xp,
                    true
                  )
                )}
              </View>

              <Text style={[styles.deathRecoverMsg, { color: '#6A4A2A' }]}>
                {hero.name || 'Mochi'} wakes up back at camp, fully recovered but empty-handed.
              </Text>

              <TouchableOpacity activeOpacity={0.85} onPress={handleCloseDeath} style={styles.cozyButtonDanger}>
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
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          5. FLEE DUNGEON CONFIRMATION MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'flee'} transparent animationType="fade">
        <View style={styles.cozyOverlay}>
          <View style={[styles.cozyFrame, theme.SHADOWS.cardShadow]}>
            <View style={styles.cozyParchment}>
              <View style={styles.cozyBevel} pointerEvents="none" />

              <Text style={styles.cozySubtitle}>
                Are you sure you want to escape? Fleeing ends the run early, but you keep everything you've gathered:
              </Text>

              <Text style={[styles.fleeLootPreviewTitle, { color: '#6A4A2A', fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }]}>Loot You'll Keep:</Text>
              {currentRun.lootCollected.gold === 0 &&
              Object.keys(currentRun.lootCollected.materials).length === 0 &&
              Object.keys(currentRun.lootCollected.consumables || {}).length === 0 ? (
                <Text style={[styles.noLostLootText, { textAlign: 'center', marginBottom: 12 }]}>No loot collected yet.</Text>
              ) : (
                <View style={[styles.bagChipsContainer, { marginBottom: 12 }]}>
                  {currentRun.lootCollected.gold > 0 && (
                    <View style={styles.bagItemChip}>
                      <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={32} />
                      <Text style={styles.bagChipQty}>{currentRun.lootCollected.gold} G</Text>
                    </View>
                  )}
                  {(() => {
                    const items = [];
                    for (const [id, qty] of Object.entries(currentRun.lootCollected.materials || {})) {
                      if (qty > 0) items.push({ id, keptQty: qty, isConsumable: false });
                    }
                    for (const [id, qty] of Object.entries(currentRun.lootCollected.consumables || {})) {
                      if (qty > 0) items.push({ id, keptQty: qty, isConsumable: true });
                    }
                    if (items.length === 0) return null;
                    return items.map(({ id, keptQty, isConsumable }) => {
                      const def = isConsumable ? CONSUMABLES.find(c => c.id === id) : MATERIALS[id];
                      return (
                         <View key={id} style={styles.bagItemChip}>
                          {def?.spritesheet && (
                            <ItemSprite
                              spritesheet={def.spritesheet}
                              frameIndex={def.frameIndex}
                              displaySize={32}
                            />
                          )}
                          <Text style={styles.bagChipQty}>{keptQty}</Text>
                        </View>
                      );
                    });
                  })()}
                </View>
              )}

              <View style={styles.fleeBtnRow}>
                <TouchableOpacity activeOpacity={0.85} onPress={handleConfirmFlee} style={[styles.cozyButtonDanger, { flex: 1 }]}>
                  <View style={styles.cozyButtonDangerInner}>
                    <Text style={styles.cozyButtonText}>FLEE</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.85} onPress={() => setActiveModal(null)} style={[styles.cozyButtonSecondary, { flex: 1 }]}>
                  <View style={styles.cozyButtonSecondaryInner}>
                    <Text style={styles.cozyButtonText}>STAY</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.cozyTopWrap} pointerEvents="none">
              <View style={styles.cozyTopOuter}>
                <View style={styles.cozyTopInner}>
                  <Text style={styles.cozyTopText}>FLEE REGION</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          5b. NOTICE MODAL (themed replacement for native Alerts)
      ════════════════════════════════════════════════════════════════ */}
      <Modal visible={!!notice} transparent animationType="fade" onRequestClose={() => setNotice(null)}>
        <View style={styles.cozyOverlay}>
          <View style={[styles.cozyFrame, theme.SHADOWS.cardShadow]}>
            <View style={styles.cozyParchment}>
              <View style={styles.cozyBevel} pointerEvents="none" />

              {notice?.spritesheet != null && notice?.frameIndex != null && (
                <View style={styles.noticeIconWrap}>
                  <ItemSprite spritesheet={notice.spritesheet} frameIndex={notice.frameIndex} displaySize={44} />
                </View>
              )}

              {!!notice?.highlight && (
                <Text style={styles.noticeHighlight}>{notice.highlight}</Text>
              )}

              <Text style={styles.cozySubtitle}>{notice?.message}</Text>

              <TouchableOpacity activeOpacity={0.85} onPress={() => setNotice(null)} style={styles.cozyButtonSecondary}>
                <View style={styles.cozyButtonSecondaryInner}>
                  <Text style={styles.cozyButtonText}>OK</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.cozyTopWrap} pointerEvents="none">
              <View style={styles.cozyTopOuter}>
                <View style={styles.cozyTopInner}>
                  <Text style={styles.cozyTopText}>{notice?.title}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          6. FLOOR COMPLETE MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'floorComplete'} transparent animationType="fade">
        <View style={styles.cozyOverlay}>
          <View style={[styles.cozyFrame, theme.SHADOWS.cardShadow]}>
            <View style={styles.cozyParchment}>
              <View style={styles.cozyBevel} pointerEvents="none" />

              <Text style={styles.cozySubtitle}>
                {currentRun.floorNumber === 10
                  ? `You have conquered the entire region. It trembles before ${hero.name || 'Mochi'}!`
                  : 'Every room in this zone has been explored. Return to camp and prepare for the next descent.'}
              </Text>

              {(() => {
                const clearReward = getFloorCompletionReward(currentRun.zoneId, currentRun.floorNumber);
                return (
                  <View style={styles.clearRewardContainer}>
                    <Text style={styles.clearRewardHeader}>Floor Clear Bonus:</Text>
                    <View style={styles.clearRewardChips}>
                      <View style={styles.clearRewardChip}>
                        <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={32} />
                        <Text style={styles.clearRewardQty}>{clearReward.gold} G</Text>
                      </View>
                      <View style={styles.clearRewardChip}>
                        <ItemSprite spritesheet="icons-map" frameIndex={146} displaySize={32} />
                        <Text style={styles.clearRewardQty}>{clearReward.xp} XP</Text>
                      </View>
                    </View>
                  </View>
                );
              })()}

              <Text style={[styles.floorLootTitle, { color: '#8A6E44', fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }]}>Loot Collected This Run:</Text>
              {(Object.keys(currentRun.lootCollected.materials).length > 0 || Object.keys(currentRun.lootCollected.consumables || {}).length > 0 || currentRun.lootCollected.gold > 0)
                ? renderLootItems(currentRun.lootCollected.materials, currentRun.lootCollected.consumables, currentRun.lootCollected.gold, 0, false)
                : <Text style={[styles.noLostLootText, { textAlign: 'center', marginBottom: 12 }]}>No loot collected.</Text>
              }

              {/* Field Note — awarded on first-time clear of this floor */}
              {(() => {
                const isFirstClear =
                  (currentRun.floorNumber || 1) >
                  (state.progress.floorsCleared?.[currentRun.zoneId] || 0);
                const note = isFirstClear
                  ? getNote(currentRun.zoneId, currentRun.floorNumber || 1)
                  : null;
                if (!note) return null;
                return (
                  <View style={styles.noteFound}>
                    <ItemSprite
                      spritesheet={NOTE_SPRITE.spritesheet}
                      frameIndex={NOTE_SPRITE.frameIndex}
                      displaySize={28}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.noteFoundLabel}>Field Note Discovered</Text>
                      <Text style={styles.noteFoundTitle}>{note.title}</Text>
                    </View>
                  </View>
                );
              })()}

              <TouchableOpacity activeOpacity={0.85} onPress={handleFloorComplete} style={[styles.cozyButton, { marginTop: 12 }]}>
                <View style={styles.cozyButtonInner}>
                  <Text style={styles.cozyButtonText}>Return to Camp</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.cozyTopWrap} pointerEvents="none">
              <View style={styles.cozyTopOuter}>
                <View style={styles.cozyTopInner}>
                  <Text style={styles.cozyTopText}>
                    {currentRun.floorNumber === 10 ? 'REGION CLEARED' : `ZONE ${currentRun.floorNumber} CLEARED`}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          7. RUN BAG / ITEMS MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'bag'} transparent animationType="fade">
        <View style={styles.cozyOverlay}>
          <View style={[styles.cozyFrame, theme.SHADOWS.cardShadow]}>
            <View style={styles.cozyParchment}>
              <View style={styles.cozyBevel} pointerEvents="none" />

              <ScrollView style={styles.modalBagScroll} showsVerticalScrollIndicator={false}>
                {/* Section 1: Packed Supplies */}
                {(() => {
                  const equippedStorageId = hero.gear?.storage;
                  const equippedStorage = equippedStorageId ? GEAR[equippedStorageId] : null;

                  return (
                    <View style={{ marginBottom: 12 }}>
                      <View style={styles.bagSectionHeaderContainer}>
                        {equippedStorage ? (
                          <ItemSprite
                            spritesheet={equippedStorage.spritesheet}
                            frameIndex={equippedStorage.frameIndex}
                            displaySize={22}
                          />
                        ) : null}
                        <Text style={[styles.bagSectionHeader, { color: '#8A6E44', marginLeft: equippedStorage ? 6 : 0 }]}>
                          Packed Supplies
                        </Text>
                      </View>

                      {!equippedStorage ? (
                        <Text style={styles.emptyBagText}>There is no bag equipped to pack supplies.</Text>
                      ) : runConsumablesList.length === 0 ? (
                        <Text style={styles.emptyBagText}>No items remaining in your run bag.</Text>
                      ) : (
                        <View style={styles.bagChipsContainer}>
                          {runConsumablesList.map((item) => {
                            const consumableDef = CONSUMABLES.find(c => c.id === item.id);
                            const isUsable = ['potion', 'super_potion', 'mega_potion', 'ultra_potion'].includes(item.id);

                            return (
                              <View key={item.id} style={styles.bagItemChip}>
                                <ItemSprite
                                  spritesheet={consumableDef?.spritesheet || 'consumables-1'}
                                  frameIndex={consumableDef?.frameIndex || 0}
                                  displaySize={32}
                                />
                                <Text style={styles.bagChipQty}>x{item.quantity}</Text>
                                <Text style={styles.bagChipLabel}>{item.name}</Text>

                                {isUsable ? (
                                  <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() => handleUseItemOnMap(item)}
                                    style={styles.bagChipUseBtn}
                                  >
                                    <Text style={styles.bagChipUseBtnText}>Use</Text>
                                  </TouchableOpacity>
                                ) : (
                                  <View style={styles.bagChipInfoBtn}>
                                    <Text style={styles.bagChipInfoBtnText}>Info</Text>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })()}

                <View style={[styles.bagDivider, { backgroundColor: '#C9A86A', opacity: 0.5 }]} />

                {/* Section 2: Loot Collected */}
                <View style={{ marginBottom: 12 }}>
                  <View style={styles.bagSectionHeaderContainer}>
                    <ItemSprite spritesheet="icons-map" frameIndex={11} displaySize={22} />
                    <Text style={[styles.bagSectionHeader, { color: '#8A6E44', marginLeft: 6 }]}>
                      Loot Collected
                    </Text>
                  </View>

                  {currentRun.lootCollected.gold === 0 && Object.keys(currentRun.lootCollected.materials).length === 0 ? (
                    <Text style={styles.emptyBagText}>No gold or materials collected yet.</Text>
                  ) : (
                    <View style={styles.bagChipsContainer}>
                      {currentRun.lootCollected.gold > 0 && (
                        <View style={styles.bagItemChip}>
                          <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={32} />
                          <Text style={styles.bagChipQty}>{currentRun.lootCollected.gold} G</Text>
                        </View>
                      )}
                      {Object.entries(currentRun.lootCollected.materials).map(([id, qty]) => {
                        if (qty <= 0) return null;
                        const def = MATERIALS[id];
                        return (
                          <View key={id} style={styles.bagItemChip}>
                            {def?.spritesheet && (
                              <ItemSprite
                                  spritesheet={def.spritesheet}
                                  frameIndex={def.frameIndex}
                                  displaySize={32}
                                />
                            )}
                            <Text style={styles.bagChipQty}>{qty}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </ScrollView>

              <TouchableOpacity activeOpacity={0.85} onPress={() => setActiveModal(null)} style={styles.cozyButtonSecondary}>
                <View style={styles.cozyButtonSecondaryInner}>
                  <Text style={styles.cozyButtonText}>Close Bag</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.cozyTopWrap} pointerEvents="none">
              <View style={styles.cozyTopOuter}>
                <View style={styles.cozyTopInner}>
                  <Text style={styles.cozyTopText}>RUN BAG & LOOT</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </ScreenLoader>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },

  // ── HUD card ──────────────────────────────────────────────────
  hud: {
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: theme.BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  hudInner: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    zIndex: 2,
    gap: 10,
  },

  // Zone identity row
  hudHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zoneBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  zoneBadgeText: {
    fontSize: 18,
  },
  zoneMetaBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  zoneTitle: {
    ...theme.FONTS.heading,
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.COLORS.ghostWhite,
  },
  floorLabel: {
    ...theme.FONTS.label,
    fontSize: 9,
    marginTop: 1,
    fontWeight: '500',
    opacity: 0.8,
  },
  roomsBadge: {
    borderRadius: theme.BORDER_RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roomsBadgeText: {
    ...theme.FONTS.label,
    fontSize: 10,
    fontWeight: 'bold',
  },

  hudDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 2,
  },

  // Loot Stats Row
  lootStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  lootStatChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  lootStatChipGold: {
    backgroundColor: 'rgba(232, 167, 58, 0.06)',
    borderColor: 'rgba(232, 167, 58, 0.18)',
  },
  lootStatChipXp: {
    backgroundColor: 'rgba(169, 142, 224, 0.06)',
    borderColor: 'rgba(169, 142, 224, 0.18)',
  },
  lootStatEmoji: {
    fontSize: 14,
  },
  lootStatLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 7.5,
    fontWeight: 'normal',
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  lootStatValueGold: {
    ...theme.FONTS.label,
    fontSize: 12,
    color: theme.COLORS.candleGold,
    fontWeight: 'bold',
    marginTop: 1,
  },
  lootStatValueXp: {
    ...theme.FONTS.label,
    fontSize: 12,
    color: '#A98EE0',
    fontWeight: 'bold',
    marginTop: 1,
  },

  // Hero Status
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  levelBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(232, 167, 58, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(232, 167, 58, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.COLORS.candleGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  levelLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    fontWeight: 'normal',
    color: 'rgba(232, 167, 58, 0.65)',
    letterSpacing: 0.5,
    lineHeight: 10,
  },
  levelValue: {
    ...theme.FONTS.heading,
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.COLORS.candleGold,
    lineHeight: 18,
  },
  gaugesContainer: {
    flex: 1,
    gap: 5,
  },

  // Run buffs
  buffsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 2,
  },
  buffsTitle: {
    ...theme.FONTS.label,
    fontSize: 9,
    color: 'rgba(207,224,238,0.45)',
  },
  buffBadge: {
    backgroundColor: 'rgba(92,196,137,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(92,196,137,0.3)',
    borderRadius: theme.BORDER_RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  buffBadgeText: {
    ...theme.FONTS.label,
    color: '#5CC489',
    fontSize: 9,
  },

  // Zone accent bottom line
  hudAccentLine: {
    height: 2,
    opacity: 0.45,
  },

  // Grid Styles
  gridSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.SPACING.md,
  },
  gridContainer: {
    gap: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cellShadowContainer: {
    position: 'relative',
    borderRadius: 14,
    backgroundColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 3.5,
    elevation: 5,
  },
  cell: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cellContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  pulseBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: 14,
  },
  arrowContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: '#1E2330',
    borderWidth: 1.0,
    borderColor: '#D4A754',
    // Shadow / Glow
    shadowColor: '#D4A754',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1.2,
    elevation: 3,
  },
  arrowText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#D4A754',
    textAlign: 'center',
    lineHeight: 14,
  },
  cellEmoji: {
    fontSize: 22,
  },
  checkmarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  checkmark: {
    color: '#10B981',
    fontSize: 22,
    fontWeight: 'bold',
  },

  // Room tile colors — exact values from the design system
  fogCell: {
    backgroundColor: '#15191F',
    borderColor: '#252A32',
  },
  startCell: {
    backgroundColor: '#10243A',
    borderColor: '#1D3A5E',
  },
  combatCell: {
    backgroundColor: '#10243A',
    borderColor: '#1D3A5E',
  },
  restCell: {
    backgroundColor: '#10301F',
    borderColor: '#1D4A32',
  },
  treasureCell: {
    backgroundColor: '#2A2410',
    borderColor: '#57431A',
  },
  gambleCell: {
    backgroundColor: '#241A2E',
    borderColor: '#3D2A5E',
  },
  bossCell: {
    backgroundColor: '#3A1A22',
    borderColor: '#6A2535',
  },
  currentCell: {
    borderColor: '#F5CF4A', // treasureGold — matches design system "current tile" spec
    borderWidth: 2,
    backgroundColor: 'rgba(245, 207, 74, 0.06)',
  },
  clearedCell: {
    opacity: 0.55,
  },
  cellLabel: {
    ...theme.FONTS.label,
    fontSize: 8,
    marginTop: 1,
    textAlign: 'center',
  },

  // Footer
  footer: {
    padding: theme.SPACING.md,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  footerText: {
    ...theme.FONTS.body,
    fontSize: 11,
    color: '#707F94',
    textAlign: 'center',
  },

  // Modals Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    elevation: 8,
  },
  modalCardInner: {
    padding: 22,
    zIndex: 2,
    alignItems: 'center',
  },
  modalTitle: {
    ...theme.FONTS.display,
    fontSize: 20,
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    ...theme.FONTS.body,
    color: '#707F94',
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 18,
  },

  // Rest Choice side-by-side card styles
  modalChoiceContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  modalChoiceCard: {
    flex: 1,
    minHeight: 130,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  choiceCardInner: {
    padding: 12,
    alignItems: 'center',
    zIndex: 2,
  },
  modalBtnEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  modalBtnTitle: {
    ...theme.FONTS.heading,
    color: '#F8FAFC',
    fontSize: 13,
  },
  modalBtnDesc: {
    ...theme.FONTS.body,
    fontSize: 10,
    color: '#707F94',
    marginTop: 4,
    textAlign: 'center',
  },

  // Treasure & Gamble outcomes
  lootRewardBox: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  lootGoldText: {
    ...theme.FONTS.heading,
    color: '#F5CF7A', // warmGlow
    fontSize: 18,
  },
  lootItemText: {
    ...theme.FONTS.body,
    color: '#F3E2BD', // parchment
    fontSize: 13,
  },
  confirmBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
    overflow: 'hidden',
    height: 42,
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 13,
    color: '#1A1200',
    fontWeight: 'normal',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    zIndex: 2,
  },

  // Gamble outcomes details
  outcomeContent: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  outcomeEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  outcomeTitle: {
    ...theme.FONTS.display,
    fontSize: 18,
    color: '#F8FAFC',
    marginBottom: 4,
  },
  outcomeFlavor: {
    ...theme.FONTS.body,
    color: '#D4A754',
    fontStyle: 'italic',
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 8,
  },
  trapDamageText: {
    ...theme.FONTS.heading,
    color: '#EF4444',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  outcomeSubText: {
    ...theme.FONTS.body,
    fontSize: 12,
    color: '#707F94',
    textAlign: 'center',
  },
  ambushWarningText: {
    ...theme.FONTS.heading,
    fontSize: 11,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 8,
  },

  // Death overlay lost loot
  deathLootLostBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  lostLootTitle: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 12,
    color: '#EF4444',
    fontWeight: 'normal',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noLostLootText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#707F94',
    fontStyle: 'italic',
  },
  lostLootGold: {
    fontFamily: 'Jersey10-Regular',
    color: '#707F94',
    fontSize: 15,
    textDecorationLine: 'line-through',
  },
  lostLootXp: {
    fontFamily: 'Jersey10-Regular',
    color: '#707F94',
    fontSize: 15,
    textDecorationLine: 'line-through',
  },
  deathRecoverMsg: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 12,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },

  // Action Buttons Row
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  actionMapBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.2,
  },
  bagButton: {
    backgroundColor: 'rgba(212, 167, 84, 0.08)',
    borderColor: 'rgba(212, 167, 84, 0.25)',
  },
  fleeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  actionMapBtnText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 13,
    fontWeight: 'normal',
    color: '#F8FAFC',
  },

  // Modal Bag Styles
  modalBagScroll: {
    maxHeight: 340,
    width: '100%',
    marginVertical: 12,
  },
  bagSectionHeader: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    fontWeight: 'normal',
    color: '#D4A754',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 6,
  },
  bagDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 12,
  },
  bagLootBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    gap: 8,
  },
  bagLootRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bagLootEmoji: {
    fontSize: 15,
  },
  bagLootText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: 'normal',
  },
  emptyBagText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 13,
    color: '#707F94',
    textAlign: 'center',
    marginVertical: 24,
    fontStyle: 'italic',
  },
  bagItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    width: '100%',
  },
  bagItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  bagItemIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  bagItemIcon: {
    fontSize: 20,
  },
  bagItemInfo: {
    flex: 1,
  },
  bagItemName: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 13,
    fontWeight: 'normal',
    color: '#F8FAFC',
  },
  bagItemDesc: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#707F94',
    marginTop: 2,
  },
  bagItemQty: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#D4A754',
    fontWeight: 'normal',
    marginTop: 2,
  },
  bagItemUseBtn: {
    backgroundColor: 'rgba(212, 167, 84, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.25)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  bagItemUseBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  bagItemUseBtnText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 12,
    fontWeight: 'normal',
    color: '#D4A754',
  },
  bagItemUseBtnTextDisabled: {
    color: '#707F94',
  },
  closeBagBtn: {
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  closeBagBtnText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 13,
    fontWeight: 'normal',
    color: '#707F94',
  },
  bagSectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 6,
  },
  bagChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 12,
    width: '100%',
  },
  bagItemChip: {
    alignItems: 'center',
    backgroundColor: '#F4E6C0',
    borderColor: '#C9A86A',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 8,
    minWidth: 76,
    maxWidth: 130,
    flexGrow: 0,
  },
  bagItemChipRecessed: {
    alignItems: 'center',
    backgroundColor: '#E5D3A2',
    borderColor: '#BCA16A',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 8,
    minWidth: 76,
    maxWidth: 130,
    flexGrow: 0,
  },
  bagChipQty: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    color: '#3A2210',
    marginTop: 4,
    textAlign: 'center',
  },
  bagChipLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 7,
    color: '#9A7A4A',
    textTransform: 'uppercase',
    marginTop: 2,
    textAlign: 'center',
  },
  bagChipUseBtn: {
    marginTop: 6,
    backgroundColor: '#7A4A24',
    borderColor: '#3A2210',
    borderWidth: 1.2,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  bagChipUseBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    color: '#FFF',
  },
  bagChipInfoBtn: {
    marginTop: 6,
    backgroundColor: '#8A6E44',
    borderColor: '#5C442A',
    borderWidth: 1.2,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: 'stretch',
    alignItems: 'center',
    opacity: 0.6,
  },
  bagChipInfoBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    color: '#FFF',
  },
  fleeButtonText: {
    fontFamily: 'Jersey10-Regular',
    color: '#EF4444',
    fontWeight: 'normal',
    fontSize: 14,
  },
  fleeCostBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    marginBottom: 16,
    gap: 8,
  },
  fleeCostWarning: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 12,
    color: '#EF4444',
    fontWeight: 'normal',
    textAlign: 'center',
    lineHeight: 16,
  },
  fleeLootPreview: {
    marginTop: 8,
    alignItems: 'center',
    gap: 4,
  },
  fleeLootPreviewTitle: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    color: '#707F94',
    fontWeight: 'normal',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  retainedGold: {
    fontFamily: 'Jersey10-Regular',
    color: '#FBBF24',
    fontWeight: 'normal',
    fontSize: 15,
  },
  retainedLootItemText: {
    fontFamily: 'Jersey10-Regular',
    color: '#E2E8F0',
    fontSize: 13,
  },
  fleeBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalActionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
  },
  fleeConfirmBtn: {
    backgroundColor: '#EF4444',
  },
  fleeConfirmBtnText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 13,
    color: '#FFF',
    fontWeight: 'normal',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fleeCancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  fleeCancelBtnText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: 'normal',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Floor number label in HUD
  floorLabel: {
    ...theme.FONTS.label,
    fontSize: 9,
    marginTop: 2,
    opacity: 0.75,
  },

  // Star badge on combat tiles
  starBadge: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    fontWeight: 'normal',
    marginTop: 1,
    letterSpacing: 1,
  },

  // Boss tile — locked state (all other tiles must be cleared first)
  bossLockedCell: {
    backgroundColor: 'rgba(30,10,10,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.12)',
    opacity: 0.5,
  },

  // Floor-complete modal
  floorCompleteTitle: {
    ...theme.FONTS.display,
    fontSize: 22,
    color: '#F5CF4A',
    textAlign: 'center',
    marginBottom: 6,
  },
  clearRewardContainer: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearRewardHeader: {
    ...theme.FONTS.label,
    fontSize: 9,
    color: '#8A6E44',
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  clearRewardChips: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  clearRewardChip: {
    alignItems: 'center',
    backgroundColor: '#F4E6C0',
    borderColor: '#C9A86A',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 12,
    minWidth: 76,
  },
  clearRewardQty: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#3A2210',
    marginTop: 4,
  },
  clearRewardLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 7,
    color: '#9A7A4A',
    textTransform: 'uppercase',
    marginTop: 1,
  },

  floorLootTitle: {
    ...theme.FONTS.label,
    fontSize: 9,
    color: 'rgba(207,224,238,0.5)',
    marginBottom: 6,
  },

  // ── Field Note discovered callout (floor-clear modal) ────────
  noteFound: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C9A86A',
    backgroundColor: 'rgba(201,168,106,0.18)',
  },
  noteFoundLabel: {
    ...theme.FONTS.label,
    fontSize: 8,
    color: '#8A6E44',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  noteFoundTitle: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 13,
    color: '#5A4528',
  },

  // ── Sealed Boss and Player Glow ──────────────────────────────
  sealedOverlay: {
    position: 'absolute',
    top: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 15,
  },
  sealedText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 7,
    color: '#FFF',
    fontWeight: 'bold',
  },
  playerAvatarWrapper: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },

  // ── Cozy Parchment Design System ──────────────────────────────
  cozyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 14, 6, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
  cozyClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E3CF9C',
    borderColor: '#9A6B34',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  cozyCloseText: {
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 15,
    color: '#6E4524',
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
  cozySubtitle: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#4A2E14',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 17,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  noticeIconWrap: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F4E6C0',
    borderColor: '#C9A86A',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  noticeHighlight: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 20,
    color: '#2E7D32',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 8,
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
  cozyGoldText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: '#A85A00',
    fontWeight: 'bold',
  },
  cozyChoiceCard: {
    flex: 1,
    minHeight: 120,
    backgroundColor: '#F4E6C0',
    borderColor: '#C9A86A',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cozyChoiceCardText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 12,
    color: '#4A2E14',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 6,
  },
  cozyChoiceCardDesc: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    color: '#8A6E44',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 11,
  },
  cozyButton: {
    alignSelf: 'stretch',
    backgroundColor: '#7A4A24',
    borderColor: '#3A2210',
    borderWidth: 2,
    borderRadius: 12,
    padding: 3,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    marginTop: 8,
  },
  cozyButtonInner: {
    backgroundColor: '#9A632F',
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1.5,
    borderTopColor: '#C58E4E',
    borderBottomWidth: 2,
    borderBottomColor: '#5A3318',
  },
  cozyButtonText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 12,
    color: '#FFF3DA',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: '#4A2A10',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  cozyButtonSecondary: {
    alignSelf: 'stretch',
    backgroundColor: '#4E2C14',
    borderColor: '#241208',
    borderWidth: 2,
    borderRadius: 12,
    padding: 3,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    marginTop: 8,
  },
  cozyButtonSecondaryInner: {
    backgroundColor: '#633D1E',
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1.5,
    borderTopColor: '#8E5E35',
    borderBottomWidth: 2,
    borderBottomColor: '#361F0E',
  },
  cozyButtonDanger: {
    alignSelf: 'stretch',
    backgroundColor: '#7A1C16',
    borderColor: '#3A0A06',
    borderWidth: 2,
    borderRadius: 12,
    padding: 3,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    marginTop: 8,
  },
  cozyButtonDangerInner: {
    backgroundColor: '#9A2B23',
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1.5,
    borderTopColor: '#C5544C',
    borderBottomWidth: 2,
    borderBottomColor: '#5A1713',
  },
});
