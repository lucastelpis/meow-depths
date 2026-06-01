/**
 * DungeonMapScreen.js — Grid-based explorable dungeon map (Redesigned Premium UI)
 *
 * The main screen during a dungeon run. Players navigate orthogonally,
 * trigger encounters, collect loot, rest, or gamble.
 *
 * Redesigned with dynamic, zone-specific background and neon glowing themes.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { ZONES } from '../data/zones';
import { MATERIALS, CONSUMABLES } from '../data/gear';
import { calculateEffectiveStats } from '../logic/progressionEngine';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CONSUMABLE_ICONS = {
  health_potion: '🧪',
  mega_potion: '💊',
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

// Zone themes config
const ZONE_THEMES = {
  zone1: {
    bg: '#050A05', // Soggy Sewers - Toxic Venom green theme
    accent: '#10B981',
    accentGlow: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(76, 175, 80, 0.2)',
  },
  zone2: {
    bg: '#0A050B', // Twisted Garden - Mystical Violet theme
    accent: '#A855F7',
    accentGlow: 'rgba(168, 85, 247, 0.08)',
    border: 'rgba(168, 85, 247, 0.2)',
  },
  zone3: {
    bg: '#05080C', // Sunken Docks - Deep Ocean Cyan theme
    accent: '#06B6D4',
    accentGlow: 'rgba(6, 182, 212, 0.08)',
    border: 'rgba(6, 182, 212, 0.2)',
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
    // Soggy Sewers: Green/toxic
    bgStart = isFog ? '#060B06' : '#0B170B';
    bgEnd = isFog ? '#020402' : '#040904';
    elementColor = isFog ? 'rgba(76, 175, 80, 0.04)' : 'rgba(76, 175, 80, 0.12)';
    accentColor = '#10B981';
  } else if (zoneId === 'zone2') {
    // Twisted Garden: Purple/mystic
    bgStart = isFog ? '#0B060F' : '#170B21';
    bgEnd = isFog ? '#040206' : '#09040D';
    elementColor = isFog ? 'rgba(168, 85, 247, 0.04)' : 'rgba(168, 85, 247, 0.12)';
    accentColor = '#A855F7';
  } else if (zoneId === 'zone3') {
    // Sunken Docks: Blue/cyan
    bgStart = isFog ? '#060B12' : '#0B1726';
    bgEnd = isFog ? '#020406' : '#04090F';
    elementColor = isFog ? 'rgba(6, 182, 212, 0.04)' : 'rgba(6, 182, 212, 0.12)';
    accentColor = '#06B6D4';
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

  // Group run consumables for rendering in the bag
  const runConsumablesList = useMemo(() => {
    const consumableIds = currentRun.consumables || [];
    const consumableMap = {};
    for (const id of consumableIds) {
      consumableMap[id] = (consumableMap[id] || 0) + 1;
    }
    return Object.entries(consumableMap).map(([id, quantity]) => {
      const def = CONSUMABLES.find(c => c.id === id);
      return {
        id,
        quantity,
        name: def?.name || id,
        description: def?.description || '',
      };
    });
  }, [currentRun.consumables]);

  const handleUseItemOnMap = (item) => {
    if (item.id === 'health_potion' || item.id === 'mega_potion') {
      if (hero.hp >= effectiveStats.maxHp) {
        Alert.alert('Full Health', 'Mochi is already at full health!');
        return;
      }

      dispatch({ type: 'USE_RUN_CONSUMABLE', payload: { consumableId: item.id } });
      Alert.alert('Item Used', `Mochi consumed ${item.name} and recovered health!`);
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

  const handleTileTap = (tile) => {
    if (!isAdjacent(tile.x, tile.y)) return;

    dispatch({ type: 'MOVE_PLAYER', payload: { x: tile.x, y: tile.y } });

    if (!tile.cleared && tile.type !== 'start') {
      resolveRoom(tile.type, tile.x, tile.y);
    }
  };

  const resolveRoom = (type, x, y) => {
    if (type === 'combat') {
      navigation.navigate('Combat', { roomType: 'combat' });
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
      const rolledGold = Math.floor(Math.random() * 31) + 20; 
      const matCount = Math.floor(Math.random() * 3) + 2; 
      const pool = ZONE_MATERIAL_POOLS[currentRun.zoneId] || [];
      const rolledMats = {};
      
      for (let i = 0; i < matCount; i++) {
        const matId = pool[Math.floor(Math.random() * pool.length)];
        rolledMats[matId] = (rolledMats[matId] || 0) + 1;
      }

      dispatch({ type: 'ADD_RUN_LOOT', payload: { gold: rolledGold, materials: rolledMats } });

      setModalData({
        gold: rolledGold,
        materials: rolledMats,
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
        const rolledGold = Math.floor(Math.random() * 51) + 50; 
        const matCount = Math.floor(Math.random() * 5) + 4; 
        const pool = ZONE_MATERIAL_POOLS[currentRun.zoneId] || [];
        const rolledMats = {};
        
        for (let i = 0; i < matCount; i++) {
          const matId = pool[Math.floor(Math.random() * pool.length)];
          rolledMats[matId] = (rolledMats[matId] || 0) + 1;
        }

        dispatch({ type: 'ADD_RUN_LOOT', payload: { gold: rolledGold, materials: rolledMats } });

        const flavor = TREASURE_FLAVORS[Math.floor(Math.random() * TREASURE_FLAVORS.length)];

        setModalData({
          outcome: 'treasure',
          flavor,
          gold: rolledGold,
          materials: rolledMats,
        });
        setActiveModal('gamble');
      } else {
        setModalData({
          outcome: 'elite',
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
    } else if (outcome === 'elite') {
      navigation.navigate('Combat', { roomType: 'elite' });
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

    let emoji = '🔒';
    let label = 'Lock';
    let cellStyle = styles.fogCell;
    let labelColor = 'rgba(255, 255, 255, 0.25)';

    if (tile.type === 'start') {
      emoji = '🏠';
      label = 'Start';
      cellStyle = styles.startCell;
      labelColor = '#3B82F6';
    } else if (!isFog) {
      if (tile.type === 'combat') {
        emoji = '⚔️';
        label = tile.cleared ? 'Cleared' : 'Combat';
        cellStyle = styles.combatCell;
        labelColor = tile.cleared ? '#10B981' : '#EF4444';
      } else if (tile.type === 'rest') {
        emoji = '🔥';
        label = tile.cleared ? 'Cleared' : 'Rest';
        cellStyle = styles.restCell;
        labelColor = '#10B981';
      } else if (tile.type === 'treasure') {
        emoji = '💎';
        label = tile.cleared ? 'Cleared' : 'Treasure';
        cellStyle = styles.treasureCell;
        labelColor = tile.cleared ? '#10B981' : '#FBBF24';
      } else if (tile.type === 'gamble') {
        emoji = '❓';
        label = tile.cleared ? 'Cleared' : '???';
        cellStyle = styles.gambleCell;
        labelColor = tile.cleared ? '#10B981' : '#8B5CF6';
      } else if (tile.type === 'boss') {
        emoji = '💀';
        label = tile.cleared ? 'Cleared' : 'Boss';
        cellStyle = styles.bossCell;
        labelColor = tile.cleared ? '#10B981' : '#EF4444';
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
          tile.cleared && styles.clearedCell,
        ]}
        disabled={!adjacent}
        onPress={() => handleTileTap(tile)}
        activeOpacity={0.7}
      >
        {/* Render zone-specific background SVG */}
        {renderCellSVG(currentRun.zoneId, tile, isPlayerHere, isFog)}

        {isPlayerHere ? (
          <View style={styles.cellContent}>
            <Text style={styles.cellEmoji}>🐱</Text>
            <Text style={[styles.cellLabel, { color: zTheme.accent }]} numberOfLines={1}>
              YOU ARE HERE
            </Text>
          </View>
        ) : (
          <View style={styles.cellContent}>
            <Text style={styles.cellEmoji}>{emoji}</Text>
            <Text style={[styles.cellLabel, { color: labelColor }]} numberOfLines={1}>
              {label}
            </Text>
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

  const renderLootItems = (lootMats) => {
    return Object.entries(lootMats || {}).map(([id, qty]) => {
      const def = MATERIALS[id];
      let emoji = '💎';
      if (id.startsWith('black')) emoji = '🖤';
      if (id.startsWith('green')) emoji = '💚';
      if (id.startsWith('yellow')) emoji = '💛';
      return (
        <Text key={id} style={styles.lootItemText}>
          {emoji} {def?.name || id} ×{qty}
        </Text>
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
            <Stop offset="100%" stopColor={zTheme.bg} stopOpacity="0" stopColor="transparent" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={zTheme.bg} />
        <Rect width="100%" height="100%" fill="url(#zoneGlow)" />
      </Svg>

      {/* ── HUD ────────────────────────────────────────────────────── */}
      <View style={styles.hud}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Rect width="100%" height="100%" fill="rgba(0,0,0,0.4)" />
        </Svg>
        <View style={styles.hudInner}>
          <View style={styles.hudRow}>
            <Text style={styles.zoneTitle}>🏰 {zone.name}</Text>
            <View style={styles.hudStats}>
              <Text style={styles.hudStatText}>💰 {currentRun.lootCollected.gold}g</Text>
              <Text style={styles.hudStatText}>
                🗺️ {currentRun.roomsCleared}/{currentRun.totalRooms}
              </Text>
            </View>
          </View>

          <View style={styles.hpContainer}>
            <View style={styles.hpLabelContainer}>
              <Text style={styles.hpLabel}>❤️ Mochi HP</Text>
              <Text style={styles.hpValue}>
                {hero.hp}/{effectiveStats.maxHp}
              </Text>
            </View>
            <View style={styles.hpBarTrack}>
              <View
                style={[
                  styles.hpBarFill,
                  { width: `${Math.min((hero.hp / effectiveStats.maxHp) * 100, 100)}%` },
                ]}
              />
            </View>
          </View>

          {/* Temporary run buffs list */}
          {Object.values(currentRun.runBuffs).some((val) => val > 0) && (
            <View style={styles.buffsRow}>
              <Text style={styles.buffsTitle}>Run Buffs: </Text>
              {currentRun.runBuffs.attackBonus > 0 && (
                <View style={styles.buffBadge}>
                  <Text style={styles.buffBadgeText}>ATK +{currentRun.runBuffs.attackBonus}</Text>
                </View>
              )}
              {currentRun.runBuffs.critBonus > 0 && (
                <View style={styles.buffBadge}>
                  <Text style={styles.buffBadgeText}>CRIT +{Math.round(currentRun.runBuffs.critBonus * 100)}%</Text>
                </View>
              )}
              {currentRun.runBuffs.dodgeBonus > 0 && (
                <View style={styles.buffBadge}>
                  <Text style={styles.buffBadgeText}>DODGE +{Math.round(currentRun.runBuffs.dodgeBonus * 100)}%</Text>
                </View>
              )}
              {currentRun.runBuffs.defenceBonus > 0 && (
                <View style={styles.buffBadge}>
                  <Text style={styles.buffBadgeText}>DEF +{currentRun.runBuffs.defenceBonus}</Text>
                </View>
              )}
              {currentRun.runBuffs.maxHpBonus > 0 && (
                <View style={styles.buffBadge}>
                  <Text style={styles.buffBadgeText}>HP +{currentRun.runBuffs.maxHpBonus}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      {/* ── Grid Center ────────────────────────────────────────────── */}
      <View style={styles.gridSection}>
        {renderGrid()}
      </View>

      {/* ── Action Buttons Row ────────────────────────────────────────── */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          style={[styles.actionMapBtn, styles.bagButton]}
          onPress={() => setActiveModal('bag')}
          activeOpacity={0.7}
        >
          <Text style={styles.actionMapBtnText}>🎒 Run Bag</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionMapBtn, styles.fleeButton]}
          onPress={() => setActiveModal('flee')}
          activeOpacity={0.7}
        >
          <Text style={styles.actionMapBtnText}>🏳️ Flee Dungeon</Text>
        </TouchableOpacity>
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
                  <Stop offset="100%" stopColor="#111317" stopOpacity="0" stopColor="transparent" />
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
                    <Rect width="100%" height="100%" fill="rgba(239, 68, 68, 0.03)" rx={12} />
                    <Rect x="1" y="1" width="98%" height="98%" rx={11} fill="none" stroke="rgba(239, 68, 68, 0.25)" strokeWidth={1.2} />
                  </Svg>
                  <View style={styles.choiceCardInner}>
                    <Text style={styles.modalBtnEmoji}>❤️</Text>
                    <Text style={styles.modalBtnTitle}>Restore Health</Text>
                    <Text style={styles.modalBtnDesc}>
                      Recover 40% of Max HP (+{Math.floor(effectiveStats.maxHp * 0.4)} HP)
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
                  <Stop offset="100%" stopColor="#111317" stopOpacity="0" stopColor="transparent" />
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
                {renderLootItems(modalData?.materials)}
              </View>

              <TouchableOpacity style={[styles.confirmBtn, theme.SHADOWS.glowSuccess]} onPress={handleCloseTreasure} activeOpacity={0.8}>
                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                  <Defs>
                    <LinearGradient id="claimBtnGrad" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0%" stopColor="#10B981" />
                      <Stop offset="100%" stopColor="#059669" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#claimBtnGrad)" rx={8} />
                </Svg>
                <Text style={styles.confirmBtnText}>Claim Rewards</Text>
              </TouchableOpacity>
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
                  <Stop offset="100%" stopColor="#111317" stopOpacity="0" stopColor="transparent" />
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
                    Mochi lost {modalData.pct}% max HP (-{modalData.damage} HP)
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
                    {renderLootItems(modalData.materials)}
                  </View>
                </View>
              )}

              {modalData?.outcome === 'elite' && (
                <View style={styles.outcomeContent}>
                  <Text style={styles.outcomeEmoji}>👺</Text>
                  <Text style={styles.outcomeTitle}>Elite Encounter!</Text>
                  <Text style={styles.outcomeSubText}>
                    A shadow leaps from the dark. An elite monster attacks!
                  </Text>
                  <Text style={styles.eliteWarningText}>
                    Enemies have +40% HP & +30% Attack. Wins guarantee rare material drops!
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.confirmBtn, modalData?.outcome === 'trap' && !modalData.survived && { backgroundColor: theme.COLORS.danger }]}
                onPress={handleCloseGamble}
                activeOpacity={0.8}
              >
                {!modalData?.survived && modalData?.outcome === 'trap' ? null : (
                  <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                    <Defs>
                      <LinearGradient id="gambleBtnGrad" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0%" stopColor="#FBBF24" />
                        <Stop offset="100%" stopColor="#D4A754" />
                      </LinearGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#gambleBtnGrad)" rx={8} />
                  </Svg>
                )}
                <Text style={styles.confirmBtnText}>
                  {modalData?.outcome === 'elite' ? 'Prepare for Battle' : 'Continue'}
                </Text>
              </TouchableOpacity>
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
                Mochi fell to the dangers of the dungeon and was forced to retreat.
              </Text>

              <View style={styles.deathLootLostBox}>
                <Text style={styles.lostLootTitle}>Loot Lost in the Depths:</Text>
                {currentRun.lootCollected.gold === 0 && Object.keys(currentRun.lootCollected.materials).length === 0 ? (
                  <Text style={styles.noLostLootText}>No materials or gold were collected this run.</Text>
                ) : (
                  <>
                    {currentRun.lootCollected.gold > 0 && (
                      <Text style={styles.lostLootGold}>💰 {currentRun.lootCollected.gold} Gold</Text>
                    )}
                    {renderLootItems(currentRun.lootCollected.materials)}
                  </>
                )}
              </View>

              <Text style={styles.deathRecoverMsg}>
                Mochi wakes up back at camp, fully recovered but empty-handed.
              </Text>

              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.COLORS.danger }]} onPress={handleCloseDeath} activeOpacity={0.8}>
                <Text style={[styles.confirmBtnText, { color: '#FFF' }]}>Return to Camp</Text>
              </TouchableOpacity>
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
                  ⚠️ You will lose HALF of all gold and materials collected during this run!
                </Text>
                
                <View style={styles.fleeLootPreview}>
                  <Text style={styles.fleeLootPreviewTitle}>Estimated Retained Loot:</Text>
                  {Math.floor(currentRun.lootCollected.gold / 2) === 0 && Object.keys(currentRun.lootCollected.materials).length === 0 ? (
                    <Text style={styles.noLostLootText}>No materials or gold will be kept.</Text>
                  ) : (
                    <>
                      {Math.floor(currentRun.lootCollected.gold / 2) > 0 && (
                        <Text style={styles.retainedGold}>💰 {Math.floor(currentRun.lootCollected.gold / 2)} Gold</Text>
                      )}
                      {Object.entries(currentRun.lootCollected.materials || {}).map(([id, qty]) => {
                        const keptQty = Math.floor(qty / 2);
                        if (keptQty <= 0) return null;
                        const def = MATERIALS[id];
                        let emoji = '💎';
                        if (id.startsWith('black')) emoji = '🖤';
                        if (id.startsWith('green')) emoji = '💚';
                        if (id.startsWith('yellow')) emoji = '💛';
                        return (
                          <Text key={id} style={styles.retainedLootItemText}>
                            {emoji} {def?.name || id} ×{keptQty}
                          </Text>
                        );
                      })}
                    </>
                  )}
                </View>
              </View>

              <View style={styles.fleeBtnRow}>
                <TouchableOpacity
                  style={[styles.modalActionBtn, styles.fleeConfirmBtn]}
                  onPress={handleConfirmFlee}
                  activeOpacity={0.8}
                >
                  <Text style={styles.fleeConfirmBtnText}>Flee & Escape</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalActionBtn, styles.fleeCancelBtn]}
                  onPress={() => setActiveModal(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.fleeCancelBtnText}>Stay & Fight</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          6. RUN BAG / ITEMS MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal visible={activeModal === 'bag'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id="bagGlow" cx="50%" cy="0%" r="60%">
                  <Stop offset="0%" stopColor="#D4A754" stopOpacity="0.08" />
                  <Stop offset="100%" stopColor="#111317" stopOpacity="0" stopColor="transparent" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="#111317" rx={16} />
              <Rect width="100%" height="100%" fill="url(#bagGlow)" rx={16} />
              <Rect x="1" y="1" width="98%" height="98%" rx={15} fill="none" stroke="rgba(212, 167, 84, 0.15)" strokeWidth={1} />
            </Svg>

            <View style={styles.modalCardInner}>
              <Text style={styles.modalTitle}>🎒 Run Bag Supplies</Text>
              <Text style={styles.modalSubtitle}>
                Items packed for this run. Tap to use.
              </Text>

              <ScrollView style={styles.modalBagScroll} showsVerticalScrollIndicator={false}>
                {runConsumablesList.length === 0 ? (
                  <Text style={styles.emptyBagText}>No items remaining in your run bag.</Text>
                ) : (
                  runConsumablesList.map((item) => {
                    const icon = CONSUMABLE_ICONS[item.id] || '🧪';
                    const isUsable = item.id === 'health_potion' || item.id === 'mega_potion';

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

                        <TouchableOpacity
                          style={[styles.bagItemUseBtn, !isUsable && styles.bagItemUseBtnDisabled]}
                          onPress={() => handleUseItemOnMap(item)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.bagItemUseBtnText, !isUsable && styles.bagItemUseBtnTextDisabled]}>
                            {isUsable ? 'Use' : 'Info'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              <TouchableOpacity style={styles.closeBagBtn} onPress={() => setActiveModal(null)} activeOpacity={0.8}>
                <Text style={styles.closeBagBtnText}>Close Bag</Text>
              </TouchableOpacity>
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

  // HUD Styles
  hud: {
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  hudInner: {
    padding: theme.SPACING.md,
    zIndex: 2,
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.SPACING.sm,
  },
  zoneTitle: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 20,
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  hudStats: {
    flexDirection: 'row',
    gap: 16,
  },
  hudStatText: {
    fontFamily: 'System',
    fontSize: 15,
    color: '#D4A754',
    fontWeight: 'bold',
  },
  hpContainer: {
    width: '100%',
  },
  hpLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hpLabel: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#707F94',
    fontWeight: '600',
  },
  hpValue: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  hpBarTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  hpBarFill: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 5,
  },

  // Run buffs HUD
  buffsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: theme.SPACING.sm,
    gap: 6,
  },
  buffsTitle: {
    fontFamily: 'System',
    fontSize: 10,
    color: '#707F94',
    fontWeight: 'bold',
  },
  buffBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  buffBadgeText: {
    fontFamily: 'System',
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 9,
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

  // Tile states colors
  fogCell: {
    backgroundColor: 'rgba(7, 7, 10, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  fogLabel: {
    fontFamily: 'System',
    fontSize: 8,
    color: 'rgba(255,255,255,0.15)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  startCell: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  startLabel: {
    fontFamily: 'System',
    fontSize: 8,
    color: '#3B82F6',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  combatCell: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  combatLabel: {
    fontFamily: 'System',
    fontSize: 8,
    color: '#EF4444',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  restCell: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  restLabel: {
    fontFamily: 'System',
    fontSize: 8,
    color: '#10B981',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  treasureCell: {
    backgroundColor: 'rgba(251, 191, 36, 0.06)',
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  treasureLabel: {
    fontFamily: 'System',
    fontSize: 8,
    color: '#FBBF24',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  gambleCell: {
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  gambleLabel: {
    fontFamily: 'System',
    fontSize: 8,
    color: '#8B5CF6',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  bossCell: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.45)',
  },
  bossLabel: {
    fontFamily: 'System',
    fontSize: 8,
    color: '#EF4444',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  currentCell: {
    borderColor: '#D4A754',
    borderWidth: 2,
    backgroundColor: 'rgba(212, 167, 84, 0.08)',
  },
  clearedCell: {
    opacity: 0.55,
  },
  cellLabel: {
    fontSize: 8,
    fontFamily: 'System',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
    fontFamily: 'System',
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
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 20,
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontFamily: 'System',
    color: '#707F94',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
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
    fontFamily: 'System',
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: 13,
  },
  modalBtnDesc: {
    fontFamily: 'System',
    fontSize: 10,
    color: '#707F94',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 13,
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
    fontFamily: 'System',
    color: '#FBBF24',
    fontSize: 18,
    fontWeight: 'bold',
  },
  lootItemText: {
    fontFamily: 'System',
    color: '#E2E8F0',
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
    fontFamily: 'System',
    fontSize: 13,
    color: '#1A1200',
    fontWeight: 'bold',
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
    fontFamily: 'System',
    fontSize: 18,
    color: '#F8FAFC',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  outcomeFlavor: {
    fontFamily: 'System',
    color: '#D4A754',
    fontStyle: 'italic',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 16,
    marginBottom: 8,
  },
  trapDamageText: {
    fontFamily: 'System',
    color: '#EF4444',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  outcomeSubText: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#707F94',
    textAlign: 'center',
    lineHeight: 17,
  },
  eliteWarningText: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#EF4444',
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: 8,
    lineHeight: 15,
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
    fontFamily: 'System',
    fontSize: 12,
    color: '#EF4444',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noLostLootText: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#707F94',
    fontStyle: 'italic',
  },
  lostLootGold: {
    fontFamily: 'System',
    color: '#707F94',
    fontSize: 15,
    textDecorationLine: 'line-through',
  },
  deathRecoverMsg: {
    fontFamily: 'System',
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
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },

  // Modal Bag Styles
  modalBagScroll: {
    maxHeight: 280,
    width: '100%',
    marginVertical: 12,
  },
  emptyBagText: {
    fontFamily: 'System',
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
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  bagItemDesc: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#707F94',
    marginTop: 2,
  },
  bagItemQty: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#D4A754',
    fontWeight: 'bold',
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
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: 'bold',
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
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: 'bold',
    color: '#707F94',
  },
  fleeButtonText: {
    fontFamily: 'System',
    color: '#EF4444',
    fontWeight: 'bold',
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
    fontFamily: 'System',
    fontSize: 12,
    color: '#EF4444',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 16,
  },
  fleeLootPreview: {
    marginTop: 8,
    alignItems: 'center',
    gap: 4,
  },
  fleeLootPreviewTitle: {
    fontFamily: 'System',
    fontSize: 10,
    color: '#707F94',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  retainedGold: {
    fontFamily: 'System',
    color: '#FBBF24',
    fontWeight: 'bold',
    fontSize: 15,
  },
  retainedLootItemText: {
    fontFamily: 'System',
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
    fontFamily: 'System',
    fontSize: 13,
    color: '#FFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fleeCancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  fleeCancelBtnText: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
