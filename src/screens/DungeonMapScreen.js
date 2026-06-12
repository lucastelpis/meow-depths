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
  Alert,
} from 'react-native';
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
} from 'react-native-svg';

import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { useFocusEffect } from '@react-navigation/native';
import { ZONES } from '../data/zones';
import { ZONE_COMBAT_POOLS } from '../logic/dungeonGenerator';
import { MATERIALS, CONSUMABLES } from '../data/gear';
import { calculateEffectiveStats, getXpForLevel, applyHealingEfficiency } from '../logic/progressionEngine';
import { generateTreasureDrops } from '../logic/lootEngine';
import Button from '../components/ui/Button';
import ResourceBar from '../components/ui/ResourceBar';
import ItemSprite from '../components/ItemSprite';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// Zone-specific icons shown in the HUD header
const ZONE_ICONS = {
  zone1: '💧',
  zone2: '🌿',
  zone3: '⚓',
};

// Zone themes config — aligned to design system palette
const ZONE_THEMES = {
  zone1: {
    bg: '#0A120C',   // sewerBlack (Soggy Sewers)
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
    // Soggy Sewers — design system sewerBlack palette
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

  // Local modal states
  const [activeModal, setActiveModal] = useState(null); // 'rest' | 'treasure' | 'gamble' | 'death' | 'flee' | 'bag'
  const [modalData, setModalData] = useState(null);

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
    if (['potion', 'super_potion', 'mega_potion', 'ultra_potion'].includes(item.id)) {
      if (hero.hp >= effectiveStats.maxHp) {
        Alert.alert('Full Health', `${hero.name || 'Mochi'} is already at full health!`);
        return;
      }

      const consumableDef = CONSUMABLES.find(c => c.id === item.id);
      const baseHeal = consumableDef?.effect?.amount || 0;
      const finalHeal = applyHealingEfficiency(baseHeal, hero);
      const actualHealed = Math.min(finalHeal, effectiveStats.maxHp - hero.hp);

      dispatch({ type: 'USE_RUN_CONSUMABLE', payload: { consumableId: item.id } });
      Alert.alert('Item Used', `${hero.name || 'Mochi'} consumed ${item.name} and recovered ${actualHealed} HP!`);
    } else if (item.id === 'mystery_chest') {
      Alert.alert('Mystery Chest', 'You can open this chest from your inventory bag back at camp.');
    } else {
      Alert.alert('Combat Item', 'This item can only be used during battle encounters.');
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
      Alert.alert('Boss Sealed', 'Clear all other rooms on this floor before facing the boss!');
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
      const healAmount = Math.floor(effectiveStats.maxHp * 0.4);
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
        arrowStyle = { left: 5, top: '50%', transform: [{ translateY: -8 }] };
      } else if (dx === -1 && dy === 0) {
        arrowChar = '◀';
        arrowStyle = { right: 5, top: '50%', transform: [{ translateY: -8 }] };
      } else if (dx === 0 && dy === 1) {
        arrowChar = '▼';
        arrowStyle = { top: 5, left: '50%', transform: [{ translateX: -8 }] };
      } else if (dx === 0 && dy === -1) {
        arrowChar = '▲';
        arrowStyle = { bottom: 5, left: '50%', transform: [{ translateX: -8 }] };
      }

      if (arrowChar) {
        arrowIndicator = (
          <View style={[styles.arrowContainer, arrowStyle]}>
            <Text style={styles.arrowText}>{arrowChar}</Text>
          </View>
        );
      }
    }

    let emoji = '🔒';
    let label = 'Lock';
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
      emoji = '🏠';
      label = 'Start';
      cellStyle = styles.startCell;
      labelColor = '#5A9FE0'; // coldBlue — start is a special revealed tile
    } else if (!isFog) {
      if (tile.type === 'combat') {
        emoji = '⚔️';
        label = tile.cleared ? 'Cleared' : 'Combat';
        cellStyle = styles.combatCell;
        labelColor = tile.cleared ? CLEARED_COLOR : '#5A9FE0'; // coldBlue
      } else if (tile.type === 'rest') {
        emoji = '🔥';
        label = tile.cleared ? 'Cleared' : 'Rest';
        cellStyle = styles.restCell;
        labelColor = tile.cleared ? CLEARED_COLOR : '#3FB56E'; // healthGreen
      } else if (tile.type === 'treasure') {
        emoji = '💎';
        label = tile.cleared ? 'Cleared' : 'Treasure';
        cellStyle = styles.treasureCell;
        labelColor = tile.cleared ? CLEARED_COLOR : '#F5CF4A'; // treasureGold
      } else if (tile.type === 'gamble') {
        emoji = '❓';
        label = tile.cleared ? 'Cleared' : '???';
        cellStyle = styles.gambleCell;
        labelColor = tile.cleared ? CLEARED_COLOR : '#A98EE0'; // mysteryViolet
      } else if (tile.type === 'boss') {
        emoji = bossLocked ? '🔒' : '💀';
        label = tile.cleared ? 'Cleared' : bossLocked ? 'Sealed' : 'Boss';
        cellStyle = bossLocked ? styles.bossLockedCell : styles.bossCell;
        labelColor = tile.cleared ? CLEARED_COLOR : bossLocked ? 'rgba(255,255,255,0.3)' : '#DD7A86';
      }
    }

    const cellWidth = Math.floor((SCREEN_WIDTH - 48 - (gridWidth * 6)) / gridWidth);

    return (
      <TouchableOpacity
        key={`${x}_${y}`}
        style={[
          styles.cell,
          { width: cellWidth, height: cellWidth },
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

        {/* Directional movement arrow indicator */}
        {arrowIndicator}

        {isPlayerHere ? (
          <View style={styles.cellContent}>
            <Text style={styles.cellEmoji}>🐱</Text>
            <Text style={[styles.cellLabel, { color: '#D4A754' }]} numberOfLines={1}>
              You're Here
            </Text>
          </View>
        ) : (
          <View style={styles.cellContent}>
            <Text style={styles.cellEmoji}>{emoji}</Text>
            <Text style={[styles.cellLabel, { color: labelColor }]} numberOfLines={1}>
              {label}
            </Text>
            {/* Star badge for combat tiles (only when revealed and not cleared) */}
            {tile.type === 'combat' && !isFog && !tile.cleared && tile.battleRating && (
              <Text 
                style={[styles.starBadge, { color: STAR_COLORS[tile.battleRating] }]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
              >
                {STAR_LABELS[tile.battleRating]}
              </Text>
            )}
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

  const renderLootItems = (lootMats, lootConsumables = {}) => {
    const items = [];
    for (const [id, qty] of Object.entries(lootMats || {})) {
      if (qty > 0) items.push({ id, qty, isConsumable: false });
    }
    for (const [id, qty] of Object.entries(lootConsumables || {})) {
      if (qty > 0) items.push({ id, qty, isConsumable: true });
    }

    if (items.length === 0) return null;

    return items.map(({ id, qty, isConsumable }) => {
      const def = isConsumable ? CONSUMABLES[id] : MATERIALS[id];
      let emoji = '💎';
      if (id.includes('potion')) emoji = '🧪';
      else if (id.startsWith('black')) emoji = '🖤';
      else if (id.startsWith('green')) emoji = '💚';
      else if (id.startsWith('yellow')) emoji = '💛';
      return (
        <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 }}>
          {def?.spritesheet ? (
            <ItemSprite
              spritesheet={def.spritesheet}
              frameIndex={def.frameIndex}
              displaySize={18}
            />
          ) : (
            <Text style={{ fontSize: 13 }}>{emoji}</Text>
          )}
          <Text style={styles.lootItemText}>
            {def?.name || id} ×{qty}
          </Text>
        </View>
      );
    });
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: zTheme.bg }]}>
      {/* Dynamic Zone-Colored Ambient Glow */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="zoneGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={zTheme.accent} stopOpacity="0.06" />
            <Stop offset="100%" stopColor={zTheme.bg} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={zTheme.bg} />
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
            <View style={styles.zoneBadge}>
              <Text style={styles.zoneBadgeText}>{ZONE_ICONS[currentRun.zoneId] || '🏰'}</Text>
            </View>
            <View style={styles.zoneMetaBlock}>
              <Text style={styles.zoneTitle}>{zone.name}</Text>
              <Text style={[styles.floorLabel, { color: zTheme.accent }]}>
                Floor {currentRun.floorNumber || 1} of {zone.floorCount || 10}
              </Text>
            </View>
            <View style={[styles.roomsBadge, {
              borderColor: zTheme.accent + '33',
              backgroundColor: zTheme.accent + '12',
            }]}>
              <Text style={[styles.roomsBadgeText, { color: zTheme.accent }]}>
                🗺️ {currentRun.roomsCleared}/{currentRun.totalRooms}
              </Text>
            </View>
          </View>

          {/* Subtle Horizontal Divider */}
          <View style={styles.hudDivider} />

          {/* ── Loot Stats (Gold & XP) ── */}
          <View style={styles.lootStatsRow}>
            <View style={[styles.lootStatChip, styles.lootStatChipGold]}>
              <Text style={styles.lootStatEmoji}>💰</Text>
              <View>
                <Text style={styles.lootStatLabel}>Gold Collected</Text>
                <Text style={styles.lootStatValueGold}>{currentRun.lootCollected.gold}g</Text>
              </View>
            </View>
            
            <View style={[styles.lootStatChip, styles.lootStatChipXp]}>
              <Text style={styles.lootStatEmoji}>✨</Text>
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
                  <Text style={styles.buffBadgeText}>⚔️ ATK +{currentRun.runBuffs.attackBonus}</Text>
                </View>
              )}
              {currentRun.runBuffs.critBonus > 0 && (
                <View style={styles.buffBadge}>
                  <Text style={styles.buffBadgeText}>🎯 CRIT +{Math.round(currentRun.runBuffs.critBonus * 100)}%</Text>
                </View>
              )}
              {currentRun.runBuffs.dodgeBonus > 0 && (
                <View style={styles.buffBadge}>
                  <Text style={styles.buffBadgeText}>💨 DODGE +{Math.round(currentRun.runBuffs.dodgeBonus * 100)}%</Text>
                </View>
              )}
              {currentRun.runBuffs.defenceBonus > 0 && (
                <View style={styles.buffBadge}>
                  <Text style={styles.buffBadgeText}>🛡️ DEF +{currentRun.runBuffs.defenceBonus}</Text>
                </View>
              )}
              {currentRun.runBuffs.maxHpBonus > 0 && (
                <View style={styles.buffBadge}>
                  <Text style={styles.buffBadgeText}>♥ HP +{currentRun.runBuffs.maxHpBonus}</Text>
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
          icon="🎒"
          variant="secondary"
          onPress={() => setActiveModal('bag')}
          style={{ flex: 1 }}
        />
        <Button
          title="Flee Dungeon"
          icon="🏳️"
          variant="danger"
          onPress={() => setActiveModal('flee')}
          style={{ flex: 1 }}
        />
      </View>

      {/* ── Footer Info ────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tap adjacent tiles to explore. Cleared tiles can be re-entered to navigate.
        </Text>
      </View>

      {/* ════════════════════════════════════════════════════════════════
          1. REST ROOM CHOICE MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'rest'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id="restGlow" cx="50%" cy="0%" r="60%">
                  <Stop offset="0%" stopColor="#10B981" stopOpacity="0.08" />
                  <Stop offset="100%" stopColor="#111317" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="#111317" rx={16} />
              <Rect width="100%" height="100%" fill="url(#restGlow)" rx={16} />
              <Rect x="1" y="1" width="98%" height="98%" rx={15} fill="none" stroke="rgba(16, 185, 129, 0.15)" strokeWidth={1} />
            </Svg>

            <View style={styles.modalCardInner}>
              <Text style={styles.modalTitle}>🔥 Campfire Rest</Text>
              <Text style={styles.modalSubtitle}>
                You found a quiet corner. Take a moment to prepare for the depths ahead.
              </Text>

              <View style={styles.modalChoiceContainer}>
                <TouchableOpacity
                  style={[styles.modalChoiceCard, styles.choiceCardHeal]}
                  onPress={() => handleChooseRestOption('heal')}
                  activeOpacity={0.8}
                >
                  <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                    <Rect width="100%" height="100%" fill="rgba(63, 181, 110, 0.04)" rx={12} />
                    <Rect x="1" y="1" width="98%" height="98%" rx={11} fill="none" stroke="rgba(63, 181, 110, 0.28)" strokeWidth={1.2} />
                  </Svg>
                  <View style={styles.choiceCardInner}>
                    <Text style={styles.modalBtnEmoji}>❤️</Text>
                    <Text style={styles.modalBtnTitle}>Restore Health</Text>
                    <Text style={styles.modalBtnDesc}>
                      Recover 40% of Max HP (+{applyHealingEfficiency(Math.floor(effectiveStats.maxHp * 0.4), hero)} HP)
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalChoiceCard, styles.choiceCardBuff]}
                  onPress={() => handleChooseRestOption('buff')}
                  activeOpacity={0.8}
                >
                  <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                    <Rect width="100%" height="100%" fill="rgba(16, 185, 129, 0.03)" rx={12} />
                    <Rect x="1" y="1" width="98%" height="98%" rx={11} fill="none" stroke="rgba(16, 185, 129, 0.25)" strokeWidth={1.2} />
                  </Svg>
                  <View style={styles.choiceCardInner}>
                    <Text style={styles.modalBtnEmoji}>✨</Text>
                    <Text style={styles.modalBtnTitle}>Receive Buff</Text>
                    <Text style={styles.modalBtnDesc}>
                      Skip heal & obtain: {modalData?.buffLabel}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          2. TREASURE ROOM MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'treasure'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id="treasureGlow" cx="50%" cy="0%" r="60%">
                  <Stop offset="0%" stopColor="#FBBF24" stopOpacity="0.08" />
                  <Stop offset="100%" stopColor="#111317" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="#111317" rx={16} />
              <Rect width="100%" height="100%" fill="url(#treasureGlow)" rx={16} />
              <Rect x="1" y="1" width="98%" height="98%" rx={15} fill="none" stroke="rgba(251, 191, 36, 0.15)" strokeWidth={1} />
            </Svg>

            <View style={styles.modalCardInner}>
              <Text style={styles.modalTitle}>💎 Treasure Chest!</Text>
              <Text style={styles.modalSubtitle}>
                An unlocked chest lies open in the corner of this chamber.
              </Text>

              <View style={styles.lootRewardBox}>
                <Text style={styles.lootGoldText}>💰 +{modalData?.gold} Gold</Text>
                {renderLootItems(modalData?.materials, modalData?.consumables)}
              </View>

              <Button
                title="Claim Rewards"
                variant="primary"
                onPress={handleCloseTreasure}
                style={{ width: '100%', marginTop: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          3. GAMBLE (???) ROOM MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'gamble'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id="gambleGlow" cx="50%" cy="0%" r="60%">
                  <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.08" />
                  <Stop offset="100%" stopColor="#111317" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="#111317" rx={16} />
              <Rect width="100%" height="100%" fill="url(#gambleGlow)" rx={16} />
              <Rect x="1" y="1" width="98%" height="98%" rx={15} fill="none" stroke="rgba(139, 92, 246, 0.15)" strokeWidth={1} />
            </Svg>

            <View style={styles.modalCardInner}>
              <Text style={styles.modalTitle}>❓ Gamble Outcome</Text>
              
              {modalData?.outcome === 'trap' && (
                <View style={styles.outcomeContent}>
                  <Text style={styles.outcomeEmoji}>⚠️</Text>
                  <Text style={styles.outcomeTitle}>It's a Trap!</Text>
                  <Text style={styles.outcomeFlavor}>"{modalData.flavor}"</Text>
                  <Text style={styles.trapDamageText}>
                    {hero.name || 'Mochi'} lost {modalData.pct}% max HP (-{modalData.damage} HP)
                  </Text>
                  {modalData.survived ? (
                    <Text style={styles.outcomeSubText}>
                      You pull yourself out of the mechanism, bruised but still standing.
                    </Text>
                  ) : (
                    <Text style={[styles.outcomeSubText, { color: theme.COLORS.danger, fontWeight: 'bold' }]}>
                      The trap proved fatal...
                    </Text>
                  )}
                </View>
              )}

              {modalData?.outcome === 'treasure' && (
                <View style={styles.outcomeContent}>
                  <Text style={styles.outcomeEmoji}>🎁</Text>
                  <Text style={styles.outcomeTitle}>Jackpot!</Text>
                  <Text style={styles.outcomeFlavor}>"{modalData.flavor}"</Text>
                  <View style={styles.lootRewardBox}>
                    <Text style={styles.lootGoldText}>💰 +{modalData.gold} Gold (Double Treasure!)</Text>
                    {renderLootItems(modalData.materials, modalData.consumables)}
                  </View>
                </View>
              )}

              {modalData?.outcome === 'ambush' && (
                <View style={styles.outcomeContent}>
                  <Text style={styles.outcomeEmoji}>👺</Text>
                  <Text style={styles.outcomeTitle}>Ambush!</Text>
                  <Text style={styles.outcomeSubText}>
                    A shadow leaps from the dark. You are ambushed by monsters!
                  </Text>
                  <Text style={styles.ambushWarningText}>
                    Prepare for a challenging fight!
                  </Text>
                </View>
              )}

              <Button
                title={modalData?.outcome === 'ambush' ? 'Prepare for Battle' : 'Continue'}
                variant={modalData?.outcome === 'trap' && !modalData.survived ? 'danger' : 'primary'}
                onPress={handleCloseGamble}
                style={{ width: '100%', marginTop: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          4. RUN DEFEAT / DEATH OVERLAY
      ════════════════════════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'death'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Rect width="100%" height="100%" fill="#140A0A" rx={16} />
              <Rect x="1" y="1" width="98%" height="98%" rx={15} fill="none" stroke="rgba(255, 68, 68, 0.2)" strokeWidth={1} />
            </Svg>

            <View style={styles.modalCardInner}>
              <Text style={[styles.modalTitle, { color: theme.COLORS.danger }]}>💀 Defeated…</Text>
              <Text style={styles.modalSubtitle}>
                {hero.name || 'Mochi'} fell to the dangers of the dungeon and was forced to retreat.
              </Text>

              <View style={styles.deathLootLostBox}>
                <Text style={styles.lostLootTitle}>Loot Lost in the Depths:</Text>
                {currentRun.lootCollected.gold === 0 &&
                Object.keys(currentRun.lootCollected.materials).length === 0 &&
                Object.keys(currentRun.lootCollected.consumables || {}).length === 0 &&
                (currentRun.lootCollected.xp || 0) === 0 ? (
                  <Text style={styles.noLostLootText}>No materials, gold, XP, or consumables were collected this run.</Text>
                ) : (
                  <>
                    {currentRun.lootCollected.xp > 0 && (
                      <Text style={styles.lostLootXp}>✨ {currentRun.lootCollected.xp} XP</Text>
                    )}
                    {currentRun.lootCollected.gold > 0 && (
                      <Text style={styles.lostLootGold}>💰 {currentRun.lootCollected.gold} Gold</Text>
                    )}
                    {renderLootItems(currentRun.lootCollected.materials, currentRun.lootCollected.consumables)}
                  </>
                )}
              </View>

              <Text style={styles.deathRecoverMsg}>
                {hero.name || 'Mochi'} wakes up back at camp, fully recovered but empty-handed.
              </Text>

              <Button
                title="Return to Camp"
                variant="danger"
                onPress={handleCloseDeath}
                style={{ width: '100%', marginTop: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          5. FLEE DUNGEON CONFIRMATION MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'flee'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Rect width="100%" height="100%" fill="#111317" rx={16} />
              <Rect x="1" y="1" width="98%" height="98%" rx={15} fill="none" stroke="rgba(255, 68, 68, 0.2)" strokeWidth={1} />
            </Svg>

            <View style={styles.modalCardInner}>
              <Text style={[styles.modalTitle, { color: theme.COLORS.danger }]}>🏳️ Flee Dungeon?</Text>
              <Text style={styles.modalSubtitle}>
                Are you sure you want to escape? Fleeing preserves your life, but at a cost:
              </Text>

              <View style={styles.fleeCostBox}>
                <Text style={styles.fleeCostWarning}>
                  ⚠️ You will lose HALF of all gold, materials, and consumables collected during this run!
                </Text>
                
                <View style={styles.fleeLootPreview}>
                  <Text style={styles.fleeLootPreviewTitle}>Estimated Retained Loot:</Text>
                  {Math.floor(currentRun.lootCollected.gold / 2) === 0 &&
                  Object.keys(currentRun.lootCollected.materials).length === 0 &&
                  Object.keys(currentRun.lootCollected.consumables || {}).length === 0 ? (
                    <Text style={styles.noLostLootText}>No loot will be kept.</Text>
                  ) : (
                    <>
                      {Math.floor(currentRun.lootCollected.gold / 2) > 0 && (
                        <Text style={styles.retainedGold}>💰 {Math.floor(currentRun.lootCollected.gold / 2)} Gold</Text>
                      )}
                      {(() => {
                        const items = [];
                        for (const [id, qty] of Object.entries(currentRun.lootCollected.materials || {})) {
                          const keptQty = Math.floor(qty / 2);
                          if (keptQty > 0) items.push({ id, keptQty, isConsumable: false });
                        }
                        for (const [id, qty] of Object.entries(currentRun.lootCollected.consumables || {})) {
                          const keptQty = Math.floor(qty / 2);
                          if (keptQty > 0) items.push({ id, keptQty, isConsumable: true });
                        }
                        if (items.length === 0) return null;
                        return items.map(({ id, keptQty, isConsumable }) => {
                          const def = isConsumable ? CONSUMABLES[id] : MATERIALS[id];
                          let emoji = '💎';
                          if (id.includes('potion')) emoji = '🧪';
                          else if (id.startsWith('black')) emoji = '🖤';
                          else if (id.startsWith('green')) emoji = '💚';
                          else if (id.startsWith('yellow')) emoji = '💛';
                          return (
                            <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 }}>
                              {def?.spritesheet ? (
                                <ItemSprite
                                  spritesheet={def.spritesheet}
                                  frameIndex={def.frameIndex}
                                  displaySize={18}
                                />
                              ) : (
                                <Text style={{ fontSize: 13 }}>{emoji}</Text>
                              )}
                              <Text style={styles.retainedLootItemText}>
                                {def?.name || id} ×{keptQty}
                              </Text>
                            </View>
                          );
                        });
                      })()}
                    </>
                  )}
                </View>
              </View>

              <View style={styles.fleeBtnRow}>
                <Button
                  title="Flee & Escape"
                  variant="danger"
                  onPress={handleConfirmFlee}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Stay & Fight"
                  variant="secondary"
                  onPress={() => setActiveModal(null)}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          6. FLOOR COMPLETE MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'floorComplete'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id="floorCompleteGlow" cx="50%" cy="0%" r="60%">
                  <Stop offset="0%" stopColor="#FBBF24" stopOpacity="0.10" />
                  <Stop offset="100%" stopColor="#0E0F14" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="#0E0F14" rx={16} />
              <Rect width="100%" height="100%" fill="url(#floorCompleteGlow)" rx={16} />
              <Rect x="1" y="1" width="98%" height="98%" rx={15} fill="none" stroke="rgba(251,191,36,0.2)" strokeWidth={1} />
            </Svg>

            <View style={styles.modalCardInner}>
              <Text style={styles.floorCompleteTitle}>
                {currentRun.floorNumber === 10 ? '⚔️ Zone Cleared!' : `🎉 Floor ${currentRun.floorNumber} Cleared!`}
              </Text>
              <Text style={styles.modalSubtitle}>
                {currentRun.floorNumber === 10
                  ? `You have conquered the entire zone. The dungeon trembles before ${hero.name || 'Mochi'}!`
                  : 'Every room on this floor has been explored. Return to camp and prepare for the next descent.'}
              </Text>

              <View style={styles.lootRewardBox}>
                <Text style={styles.floorLootTitle}>Loot Collected This Run:</Text>
                {currentRun.lootCollected.gold > 0 && (
                  <Text style={styles.lootGoldText}>💰 +{currentRun.lootCollected.gold} Gold</Text>
                )}
                {(Object.keys(currentRun.lootCollected.materials).length > 0 || Object.keys(currentRun.lootCollected.consumables || {}).length > 0)
                  ? renderLootItems(currentRun.lootCollected.materials, currentRun.lootCollected.consumables)
                  : <Text style={styles.noLostLootText}>No loot collected.</Text>
                }
              </View>

              <Button
                title="Return to Camp"
                variant="primary"
                onPress={handleFloorComplete}
                style={{ width: '100%', marginTop: 12 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          7. RUN BAG / ITEMS MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'bag'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id="bagGlow" cx="50%" cy="0%" r="60%">
                  <Stop offset="0%" stopColor="#D4A754" stopOpacity="0.08" />
                  <Stop offset="100%" stopColor="#111317" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="#111317" rx={16} />
              <Rect width="100%" height="100%" fill="url(#bagGlow)" rx={16} />
              <Rect x="1" y="1" width="98%" height="98%" rx={15} fill="none" stroke="rgba(212, 167, 84, 0.15)" strokeWidth={1} />
            </Svg>

            <View style={styles.modalCardInner}>
              <Text style={styles.modalTitle}>🎒 Run Bag & Loot</Text>
              <Text style={styles.modalSubtitle}>
                Packed supplies and collected dungeon loot.
              </Text>

              <ScrollView style={styles.modalBagScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.bagSectionHeader}>🎒 Packed Supplies</Text>
                {runConsumablesList.length === 0 ? (
                  <Text style={styles.emptyBagText}>No items remaining in your run bag.</Text>
                ) : (
                  runConsumablesList.map((item) => {
                    const icon = CONSUMABLE_ICONS[item.id] || '🧪';
                    const isUsable = ['potion', 'super_potion', 'mega_potion', 'ultra_potion'].includes(item.id);

                    return (
                      <View key={item.id} style={styles.bagItemRow}>
                        <View style={styles.bagItemLeft}>
                          <View style={styles.bagItemIconWrapper}>
                            <Text style={styles.bagItemIcon}>{icon}</Text>
                          </View>
                          <View style={styles.bagItemInfo}>
                            <Text style={styles.bagItemName}>{item.name}</Text>
                            <Text style={styles.bagItemDesc}>{item.description}</Text>
                            <Text style={styles.bagItemQty}>Qty: {item.quantity}</Text>
                          </View>
                        </View>

                        <Button
                          title={isUsable ? 'Use' : 'Info'}
                          variant={isUsable ? 'primary' : 'disabled'}
                          onPress={() => handleUseItemOnMap(item)}
                          style={{ paddingHorizontal: 16, paddingVertical: 6, minHeight: 0 }}
                          textStyle={{ fontSize: 12 }}
                        />
                      </View>
                    );
                  })
                )}

                <View style={styles.bagDivider} />

                <Text style={styles.bagSectionHeader}>💎 Loot Collected</Text>
                {currentRun.lootCollected.gold === 0 && Object.keys(currentRun.lootCollected.materials).length === 0 ? (
                  <Text style={styles.emptyBagText}>No gold or materials collected yet.</Text>
                ) : (
                  <View style={styles.bagLootBox}>
                    {currentRun.lootCollected.gold > 0 && (
                      <View style={styles.bagLootRow}>
                        <Text style={styles.bagLootEmoji}>💰</Text>
                        <Text style={styles.bagLootText}>Gold: {currentRun.lootCollected.gold}g</Text>
                      </View>
                    )}
                    {Object.entries(currentRun.lootCollected.materials).map(([id, qty]) => {
                      const def = MATERIALS[id];
                      let emoji = '💎';
                      if (id.startsWith('black')) emoji = '🖤';
                      if (id.startsWith('green')) emoji = '💚';
                      if (id.startsWith('yellow')) emoji = '💛';
                      return (
                        <View key={id} style={styles.bagLootRow}>
                          {def?.spritesheet ? (
                            <View style={{ marginRight: 6 }}>
                              <ItemSprite
                                spritesheet={def.spritesheet}
                                frameIndex={def.frameIndex}
                                displaySize={18}
                              />
                            </View>
                          ) : (
                            <Text style={styles.bagLootEmoji}>{emoji}</Text>
                          )}
                          <Text style={styles.bagLootText}>
                            {def?.name || id.replace(/_/g, ' ').toUpperCase()}: {qty}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </ScrollView>

              <Button
                title="Close Bag"
                variant="secondary"
                onPress={() => setActiveModal(null)}
                style={{ width: '100%', marginTop: 10 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    width: 16,
    height: 16,
    borderRadius: 8,
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
    fontSize: 8,
    fontWeight: 'bold',
    color: '#D4A754',
    textAlign: 'center',
    lineHeight: 12,
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
    fontFamily: 'PixelifySans-Medium',
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
    fontFamily: 'PixelifySans-Medium',
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
    fontFamily: 'PixelifySans-Regular',
    color: '#707F94',
    fontSize: 15,
    textDecorationLine: 'line-through',
  },
  lostLootXp: {
    fontFamily: 'PixelifySans-Regular',
    color: '#707F94',
    fontSize: 15,
    textDecorationLine: 'line-through',
  },
  deathRecoverMsg: {
    fontFamily: 'PixelifySans-Regular',
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
    fontFamily: 'PixelifySans-Medium',
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
    fontFamily: 'PixelifySans-Medium',
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: 'normal',
  },
  emptyBagText: {
    fontFamily: 'PixelifySans-Regular',
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
    fontFamily: 'PixelifySans-Medium',
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
    fontFamily: 'PixelifySans-Medium',
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
    fontFamily: 'PixelifySans-Medium',
    fontSize: 13,
    fontWeight: 'normal',
    color: '#707F94',
  },
  fleeButtonText: {
    fontFamily: 'PixelifySans-Medium',
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
    fontFamily: 'PixelifySans-Medium',
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
    fontFamily: 'PixelifySans-Medium',
    color: '#FBBF24',
    fontWeight: 'normal',
    fontSize: 15,
  },
  retainedLootItemText: {
    fontFamily: 'PixelifySans-Regular',
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
    fontFamily: 'PixelifySans-Medium',
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
    fontFamily: 'PixelifySans-Medium',
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
  floorLootTitle: {
    ...theme.FONTS.label,
    fontSize: 9,
    color: 'rgba(207,224,238,0.5)',
    marginBottom: 6,
  },
});
