/**
 * DungeonFloorScreen.js — Dungeon Floor Selection
 *
 * A scrollable list of all 10 floors for the selected zone.
 * Each floor is a full-width horizontal card with a left accent rail.
 *
 * Floor states:
 *   cleared   — completed before (green, replayable)
 *   available — the frontier floor (gold glow, call-to-action visible)
 *   locked    — not yet reachable (very dim)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Line,
  Circle,
  Path,
  G,
} from 'react-native-svg';

import { useGame } from '../state/gameState';
import { ZONES } from '../data/zones';
import { CONSUMABLES } from '../data/gear';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Zone config ──────────────────────────────────────────────────────────────
const ZONE_CONFIG = {
  zone1: {
    accent:     '#3FB56E',
    accentDim:  'rgba(63,181,110,0.12)',
    accentGlow: 'rgba(63,181,110,0.18)',
    border:     'rgba(63,181,110,0.25)',
    bg:         '#0A120C',
    bgGrad1:    '#0F1A0F',
    bgGrad2:    '#07090A',
    icon:       '💧',
    bannerDesc: 'Damp tunnels. Rats, slime, and worse lurk in every shadow.',
  },
  zone2: {
    accent:     '#A855F7',
    accentDim:  'rgba(168,85,247,0.12)',
    accentGlow: 'rgba(168,85,247,0.18)',
    border:     'rgba(168,85,247,0.25)',
    bg:         '#0C0A12',
    bgGrad1:    '#150F1A',
    bgGrad2:    '#09060B',
    icon:       '🌿',
    bannerDesc: 'Overgrown ruins where roots move and fungi glow with malice.',
  },
  zone3: {
    accent:     '#06B6D4',
    accentDim:  'rgba(6,182,212,0.12)',
    accentGlow: 'rgba(6,182,212,0.18)',
    border:     'rgba(6,182,212,0.25)',
    bg:         '#0A0F1A',
    bgGrad1:    '#0F151F',
    bgGrad2:    '#06090B',
    icon:       '⚓',
    bannerDesc: 'Salt-crusted wharves haunted by drowned things.',
  },
};

// ─── Floor metadata ───────────────────────────────────────────────────────────
const FLOOR_NAMES = [
  'The Entrance',
  'First Descent',
  'The Shadowed Halls',
  'Deeper Darkness',
  'The Midway',
  'The Deepening',
  'The Dark Threshold',
  'The Inner Sanctum',
  'The Final Approach',
  'The Boss Chamber',
];

const GRID_SIZES = {
  1: '3×3', 2: '3×3', 3: '3×3',
  4: '3×4', 5: '3×4', 6: '3×4',
  7: '4×4', 8: '4×4', 9: '4×4',
  10: '4×5',
};

const DIFF_DATA = {
  1: { stars: '★☆☆', label: 'Easy',   color: '#5A9FE0' },
  2: { stars: '★☆☆', label: 'Easy',   color: '#5A9FE0' },
  3: { stars: '★☆☆', label: 'Easy',   color: '#5A9FE0' },
  4: { stars: '★★☆', label: 'Medium', color: '#F08A4A' },
  5: { stars: '★★☆', label: 'Medium', color: '#F08A4A' },
  6: { stars: '★★☆', label: 'Medium', color: '#F08A4A' },
  7: { stars: '★★★', label: 'Hard',   color: '#D8483F' },
  8: { stars: '★★★', label: 'Hard',   color: '#D8483F' },
  9: { stars: '★★★', label: 'Hard',   color: '#D8483F' },
  10: { stars: '☠☠☠', label: 'Boss',  color: '#DD7A86' },
};

const FLOOR_FLAVORS = [
  'Warm up here. Materials drop freely.',
  'A little darker now. Stay alert.',
  'The first real test begins here.',
  'Elite enemies start appearing.',
  'The dungeon shows its true face.',
  'No safe shortcuts from here on.',
  'Every room is a threat.',
  'Only the strongest survive this deep.',
  'The dungeon is at its most brutal.',
  'The zone boss awaits. Clear every room.',
];

const MAX_SLOTS = 5;
const CONSUMABLE_ICONS = {
  potion:        '🧪',
  super_potion:  '🧪',
  mega_potion:   '🧪',
  ultra_potion:  '🧪',
  antidote:      '🌿',
  smoke_vial:    '💨',
  mystery_chest: '🎁',
};

function getFloorStatus(floor, cleared) {
  if (floor <= cleared) return 'cleared';
  if (floor === cleared + 1) return 'available';
  return 'locked';
}



// ─── Component ────────────────────────────────────────────────────────────────
export default function DungeonFloorScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { zoneId } = route.params || {};
  const { state, dispatch } = useGame();
  const insets = useSafeAreaInsets();

  const zone = ZONES[zoneId];
  const zc = ZONE_CONFIG[zoneId] || ZONE_CONFIG.zone1;

  const floorsCleared   = state.progress.floorsCleared?.[zoneId] || 0;
  const isZoneCleared   = !!state.progress[`${zoneId}Cleared`];
  const effectiveCleared = isZoneCleared ? 10 : floorsCleared;

  // Constants for the circular progress ring
  const radius = 24;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - effectiveCleared / 10);

  const [selectedFloor, setSelectedFloor] = useState(null);
  const [loadout, setLoadout]             = useState({});

  const totalPacked = useMemo(
    () => Object.values(loadout).reduce((s, v) => s + v, 0),
    [loadout],
  );

  const addItem = (id) => {
    if (totalPacked >= MAX_SLOTS) return;
    const owned = state.hero.inventory.consumables.find(c => c.id === id)?.quantity || 0;
    if ((loadout[id] || 0) >= owned) return;
    setLoadout(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeItem = (id) => {
    if (!loadout[id]) return;
    setLoadout(prev => {
      const next = { ...prev, [id]: prev[id] - 1 };
      if (next[id] <= 0) delete next[id];
      return next;
    });
  };

  const openFloor = (floor) => {
    if (getFloorStatus(floor, effectiveCleared) === 'locked') return;
    setLoadout({});
    setSelectedFloor(floor);
  };

  const handleEnter = () => {
    if (!selectedFloor) return;
    const carried = [];
    for (const [id, count] of Object.entries(loadout)) {
      for (let i = 0; i < count; i++) carried.push(id);
    }
    const floorNumber = selectedFloor;
    setSelectedFloor(null);
    dispatch({ type: 'START_RUN', payload: { zoneId, floorNumber, consumables: carried } });
    navigation.navigate('DungeonMap');
  };

  if (!zone) return null;

  const selectedStatus = selectedFloor ? getFloorStatus(selectedFloor, effectiveCleared) : null;
  const selectedDiff   = selectedFloor ? DIFF_DATA[selectedFloor] : null;

  // ── Render one floor row ────────────────────────────────────────────────────
  const renderFloorRow = (floor) => {
    const status   = getFloorStatus(floor, effectiveCleared);
    const diff     = DIFF_DATA[floor];
    const isLocked = status === 'locked';
    const isAvail  = status === 'available';
    const isCleared = status === 'cleared';
    const isBoss   = floor === 10;
    const isLast   = floor === 10;
    const isFirst  = floor === 1;

    // Rail dot + line colors
    const dotColor  = isCleared  ? '#3FB56E'
                    : isAvail    ? (isBoss ? '#DD7A86' : '#F5CF4A')
                    : 'rgba(255,255,255,0.12)';
    const lineColor = (floor - 1 < effectiveCleared + 1)
      ? zc.accent + '55'
      : 'rgba(255,255,255,0.06)';

    // Card colors
    const cardBorder = isCleared  ? 'rgba(63,181,110,0.2)'
                     : isAvail    ? (isBoss ? 'rgba(221,122,134,0.4)' : 'rgba(245,207,74,0.4)')
                     : 'rgba(255,255,255,0.04)';
    const cardBg    = isCleared  ? 'rgba(63,181,110,0.04)'
                    : isAvail    ? (isBoss ? 'rgba(221,122,134,0.06)' : 'rgba(245,207,74,0.05)')
                    : 'transparent';

    const rowOpacity = isLocked ? 0.3 : 1;

    return (
      <View key={floor} style={[styles.floorRow, { opacity: rowOpacity }]}>
        {/* ── Left Rail ── */}
        <View style={styles.rail}>
          {/* line above dot */}
          <View style={[styles.railLine, { backgroundColor: isFirst ? 'transparent' : lineColor }]} />
          {/* dot */}
          <View style={[
            styles.railDot,
            { borderColor: dotColor, backgroundColor: isCleared ? dotColor : 'transparent' },
            isAvail && !isBoss && styles.railDotAvail,
            isBoss && isAvail && styles.railDotBoss,
          ]}>
            {isCleared && <Text style={styles.railDotCheck}>✓</Text>}
            {isBoss && !isCleared && <Text style={styles.railDotBossIcon}>☠</Text>}
          </View>
          {/* line below dot */}
          <View style={[styles.railLine, { backgroundColor: isLast ? 'transparent' : lineColor }]} />
        </View>

        {/* ── Floor Card ── */}
        <TouchableOpacity
          style={[styles.floorCard, { borderColor: cardBorder, backgroundColor: cardBg }]}
          onPress={() => openFloor(floor)}
          activeOpacity={isLocked ? 1 : 0.78}
          disabled={isLocked}
        >
          {/* Card SVG Background */}
          {(isAvail || isBoss) && (
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id={`cardGlow_${floor}`} cx="0%" cy="50%" rx="60%" ry="80%">
                  <Stop offset="0%" stopColor={isBoss ? '#DD7A86' : '#F5CF4A'} stopOpacity={isBoss ? '0.07' : '0.06'} />
                  <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={`url(#cardGlow_${floor})`} rx={14} />
            </Svg>
          )}

          {/* Floor number pill */}
          <View style={[
            styles.floorNumPill,
            isCleared && styles.floorNumPillCleared,
            isAvail && !isBoss && styles.floorNumPillAvail,
            isBoss && styles.floorNumPillBoss,
          ]}>
            <Text style={[
              styles.floorNum,
              isCleared && { color: '#3FB56E' },
              isAvail && !isBoss && { color: '#F5CF4A' },
              isBoss && { color: '#DD7A86' },
            ]}>
              {floor < 10 ? `0${floor}` : floor}
            </Text>
          </View>

          {/* Content */}
          <View style={styles.floorCardContent}>
            <View style={styles.floorCardTop}>
              <Text style={[
                styles.floorName,
                isCleared && { color: 'rgba(207,224,238,0.6)' },
                isAvail && { color: '#F8FAFC' },
                isLocked && { color: 'rgba(207,224,238,0.45)' },
                isBoss && { color: '#DD7A86' },
              ]} numberOfLines={1}>
                {FLOOR_NAMES[floor - 1]}
              </Text>
              {/* Status badge */}
              {isCleared && (
                <View style={styles.badgeCleared}>
                  <Text style={styles.badgeClearedText}>✓ Done</Text>
                </View>
              )}
              {isAvail && !isBoss && (
                <View style={styles.badgeNext}>
                  <Text style={styles.badgeNextText}>▶ Next</Text>
                </View>
              )}
              {isAvail && isBoss && (
                <View style={styles.badgeBoss}>
                  <Text style={styles.badgeBossText}>☠ Boss</Text>
                </View>
              )}
              {isLocked && (
                <Text style={styles.lockIcon}>🔒</Text>
              )}
            </View>

            <View style={styles.floorCardBottom}>
              <Text style={[styles.floorFlavor, isBoss && { color: 'rgba(221,122,134,0.7)' }]} numberOfLines={1}>
                {FLOOR_FLAVORS[floor - 1]}
              </Text>
              <View style={styles.floorMeta}>
                <Text style={[styles.diffStars, { color: diff.color }]}>{diff.stars}</Text>
                <Text style={styles.gridSize}>{GRID_SIZES[floor]}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: zc.bg }]}>
      {/* Full-screen ambient gradient */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="screenBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={zc.bgGrad1} />
            <Stop offset="100%" stopColor={zc.bgGrad2} />
          </LinearGradient>
          <RadialGradient id="topGlow" cx="50%" cy="0%" rx="70%" ry="30%">
            <Stop offset="0%" stopColor={zc.accent} stopOpacity="0.08" />
            <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#screenBg)" />
        <Rect width="100%" height="100%" fill="url(#topGlow)" />
      </Svg>

      {/* ── Main Scroll View ────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: (insets.top || 12) + 8,
            paddingBottom: insets.bottom + 24,
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Inline Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.inlineBackBtn} activeOpacity={0.7}>
          <Text style={styles.inlineBackText}>← Back to Zones</Text>
        </TouchableOpacity>

        {/* ── Zone Banner ────────────────────────────────────────────── */}
        <View style={[styles.banner, { borderColor: zc.border, marginHorizontal: 0, marginTop: 4, marginBottom: 20 }]}>
          {/* SVG Background Patterns & Gradients */}
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <LinearGradient id="bannerGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor={zc.bgGrad1} />
                <Stop offset="50%" stopColor={zc.bgGrad2} />
                <Stop offset="100%" stopColor="#050607" />
              </LinearGradient>
              <RadialGradient id="bannerAccent" cx="85%" cy="50%" rx="55%" ry="75%">
                <Stop offset="0%" stopColor={zc.accent} stopOpacity="0.12" />
                <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#bannerGrad)" rx={18} />
            <Rect width="100%" height="100%" fill="url(#bannerAccent)" rx={18} />
            <Rect x="1" y="1" width="99%" height="98%" rx={17} fill="none" stroke={zc.border} strokeWidth="1.2" />
          </Svg>

          <View style={styles.bannerInner}>
            {/* Left Column: Title, Level Badge, and Description */}
            <View style={styles.bannerLeft}>
              <View style={styles.eyebrowRow}>
                <Text style={styles.bannerEyebrow}>DUNGEON ZONE</Text>
                <View style={[styles.levelTag, { borderColor: zc.border, backgroundColor: zc.accentDim }]}>
                  <Text style={[styles.levelTagText, { color: zc.accent }]}>
                    Lv. {zone.minLevel}–{zone.maxLevel}
                  </Text>
                </View>
              </View>
              <Text style={[styles.bannerTitle, { color: zc.accent }]}>{zone.name}</Text>
              <Text style={styles.bannerDesc}>{zc.bannerDesc}</Text>
            </View>

            {/* Right Column: Premium Circular Progress Ring */}
            <View style={styles.bannerRight}>
              <View style={styles.progressRingWrapper}>
                <Svg width="64" height="64" viewBox="0 0 60 60">
                  {/* Background Track Circle */}
                  <Circle
                    cx="30"
                    cy="30"
                    r={radius}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth={strokeWidth}
                    fill="none"
                  />
                  {/* Glow Circle behind the active stroke for premium depth */}
                  <Circle
                    cx="30"
                    cy="30"
                    r={radius}
                    stroke={zc.accent}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 30 30)"
                    opacity={0.3}
                  />
                  {/* Active Progress Circle */}
                  <Circle
                    cx="30"
                    cy="30"
                    r={radius}
                    stroke={zc.accent}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 30 30)"
                  />
                </Svg>
                {/* Centered text display inside the progress ring */}
                <View style={styles.progressRingTextContainer}>
                  <Text style={[styles.progressRingCount, { color: zc.accent }]}>
                    {effectiveCleared}
                  </Text>
                  <Text style={styles.progressRingDivider}>/</Text>
                  <Text style={styles.progressRingTotal}>10</Text>
                </View>
              </View>
              <Text style={styles.progressRingLabel}>CLEARED</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: zc.accent, marginBottom: 12 }]}>— SELECT FLOOR —</Text>
        {Array.from({ length: 10 }, (_, i) => renderFloorRow(i + 1))}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Floor Detail / Loadout Modal ──────────────────────────────── */}
      <Modal
        visible={selectedFloor !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedFloor(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedFloor(null)}
        >
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            {/* Sheet SVG background */}
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <LinearGradient id="sheetBg" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#191C24" />
                  <Stop offset="100%" stopColor="#101218" />
                </LinearGradient>
                <RadialGradient id="sheetGlow" cx="50%" cy="0%" rx="70%" ry="40%">
                  <Stop offset="0%" stopColor={selectedFloor === 10 ? '#DD7A86' : '#D4A754'} stopOpacity="0.08" />
                  <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#sheetBg)" rx={24} />
              <Rect width="100%" height="100%" fill="url(#sheetGlow)" rx={24} />
              <Rect x="1" y="1" width="99%" height="99%" rx={23} fill="none"
                stroke={selectedFloor === 10 ? 'rgba(221,122,134,0.2)' : 'rgba(212,167,84,0.15)'}
                strokeWidth="1" />
            </Svg>

            <ScrollView
              style={{ maxHeight: SCREEN_HEIGHT * 0.86 }}
              contentContainerStyle={[styles.modalInner, { paddingBottom: insets.bottom + 32 }]}
              showsVerticalScrollIndicator={false}
            >
              {/* Grabber */}
              <View style={styles.grabber} />

              {/* Floor label + close */}
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalEyebrow}>
                  {zone?.name?.toUpperCase()} · FLOOR {selectedFloor}
                </Text>
                <TouchableOpacity onPress={() => setSelectedFloor(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Floor hero row */}
              <View style={styles.modalHeroRow}>
                <View style={[
                  styles.modalFloorPill,
                  selectedFloor === 10 && { borderColor: 'rgba(221,122,134,0.35)', backgroundColor: 'rgba(221,122,134,0.08)' },
                  selectedStatus === 'available' && selectedFloor !== 10 && { borderColor: 'rgba(245,207,74,0.35)', backgroundColor: 'rgba(245,207,74,0.06)' },
                  selectedStatus === 'cleared' && { borderColor: 'rgba(63,181,110,0.35)', backgroundColor: 'rgba(63,181,110,0.06)' },
                ]}>
                  <Text style={[
                    styles.modalFloorNum,
                    selectedFloor === 10 && { color: '#DD7A86' },
                    selectedStatus === 'available' && selectedFloor !== 10 && { color: '#F5CF4A' },
                    selectedStatus === 'cleared' && { color: '#3FB56E' },
                  ]}>
                    {selectedFloor < 10 ? `0${selectedFloor}` : selectedFloor}
                  </Text>
                </View>

                <View style={styles.modalHeroText}>
                  <Text style={[
                    styles.modalFloorName,
                    selectedFloor === 10 && { color: '#DD7A86' },
                  ]}>
                    {FLOOR_NAMES[(selectedFloor || 1) - 1]}
                  </Text>
                  <View style={styles.modalBadgeRow}>
                    {selectedDiff && (
                      <Text style={[styles.modalStars, { color: selectedDiff.color }]}>
                        {selectedDiff.stars}
                      </Text>
                    )}
                    <View style={styles.gridSizeBadge}>
                      <Text style={styles.gridSizeBadgeText}>{GRID_SIZES[selectedFloor || 1]}</Text>
                    </View>
                    {selectedStatus === 'cleared' && (
                      <View style={styles.clearedBadge}>
                        <Text style={styles.clearedBadgeText}>✓ Cleared</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Flavor text */}
              <View style={[
                styles.flavorBox,
                selectedFloor === 10 && { borderColor: 'rgba(221,122,134,0.18)', backgroundColor: 'rgba(221,122,134,0.04)' },
              ]}>
                <Text style={styles.flavorText}>{FLOOR_FLAVORS[(selectedFloor || 1) - 1]}</Text>
              </View>

              {/* Separator */}
              <View style={styles.separator} />

              {/* Pack supplies */}
              <View style={styles.loadoutHeader}>
                <Text style={styles.loadoutTitle}>🎒 Pack Supplies</Text>
                <View style={styles.slotPips}>
                  {Array.from({ length: MAX_SLOTS }).map((_, i) => (
                    <View key={i} style={[styles.pip, i < totalPacked && styles.pipFilled]} />
                  ))}
                </View>
              </View>
              <Text style={styles.loadoutSub}>{totalPacked}/{MAX_SLOTS} items packed</Text>

              {/* Items */}
              <View style={styles.itemList}>
                {state.hero.inventory.consumables.filter(c => c.quantity > 0).length === 0 ? (
                  <Text style={styles.emptyText}>No items — visit the Town Hall!</Text>
                ) : (
                  state.hero.inventory.consumables
                    .filter(e => e.quantity > 0)
                    .map(entry => {
                      const def = CONSUMABLES.find(c => c.id === entry.id);
                      const packed = loadout[entry.id] || 0;
                      const canAdd = totalPacked < MAX_SLOTS && packed < entry.quantity;
                      const icon = CONSUMABLE_ICONS[entry.id] || '🧪';

                      return (
                        <View key={entry.id} style={styles.itemRow}>
                          <View style={styles.itemIconBox}>
                            <Text style={styles.itemIcon}>{icon}</Text>
                          </View>
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{def?.name || entry.id}</Text>
                            <Text style={styles.itemOwned}>Owned: {entry.quantity}</Text>
                          </View>
                          <View style={styles.itemControls}>
                            <TouchableOpacity
                              style={[styles.counterBtn, packed === 0 && styles.counterBtnDim]}
                              onPress={() => removeItem(entry.id)}
                              disabled={packed === 0}
                            >
                              <Text style={[styles.counterBtnText, packed === 0 && { color: 'rgba(255,255,255,0.2)' }]}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.packedCount}>{packed}</Text>
                            <TouchableOpacity
                              style={[styles.counterBtn, !canAdd && styles.counterBtnDim]}
                              onPress={() => addItem(entry.id)}
                              disabled={!canAdd}
                            >
                              <Text style={[styles.counterBtnText, !canAdd && { color: 'rgba(255,255,255,0.2)' }]}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                )}
              </View>

              {/* Enter button */}
              <TouchableOpacity style={styles.enterBtn} onPress={handleEnter} activeOpacity={0.82}>
                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                  <Defs>
                    <LinearGradient id="enterGrad" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0%" stopColor={selectedFloor === 10 ? '#C95C6A' : '#F9D99A'} />
                      <Stop offset="100%" stopColor={selectedFloor === 10 ? '#DD7A86' : '#D4A754'} />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#enterGrad)" rx={14} />
                </Svg>
                <Text style={[styles.enterBtnText, selectedFloor === 10 && { color: '#FFF' }]}>
                  ⚔️  Enter Floor {selectedFloor}{totalPacked > 0 ? `  ·  ${totalPacked} items` : ''}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const RAIL_WIDTH   = 48;
const RAIL_DOT_SIZE = 18;
const CARD_MARGIN  = 10;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ── Header / Back Button ───────────────────────────────── */
  inlineBackBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 16,
    marginBottom: 6,
  },
  inlineBackText: {
    color: '#D4A754',
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 15,
  },

  /* ── Zone Banner ─────────────────────────────────────────── */
  banner: {
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 10,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    zIndex: 2,
  },
  bannerLeft: {
    flex: 1,
    marginRight: 18,
    justifyContent: 'center',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bannerEyebrow: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(207,224,238,0.35)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  levelTag: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  levelTagText: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: 'bold',
  },
  bannerTitle: {
    fontFamily: 'Courier New',
    fontWeight: 'bold',
    fontSize: 22,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  bannerDesc: {
    fontFamily: 'System',
    fontSize: 12,
    color: 'rgba(207,224,238,0.55)',
    lineHeight: 17,
  },
  bannerRight: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
  },
  progressRingWrapper: {
    position: 'relative',
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressRingTextContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  progressRingCount: {
    fontFamily: 'System',
    fontWeight: '900',
    fontSize: 16,
  },
  progressRingDivider: {
    fontFamily: 'System',
    fontSize: 11,
    color: 'rgba(207,224,238,0.3)',
    marginHorizontal: 1,
  },
  progressRingTotal: {
    fontFamily: 'System',
    fontWeight: '700',
    fontSize: 11,
    color: 'rgba(207,224,238,0.45)',
  },
  progressRingLabel: {
    fontFamily: 'System',
    fontSize: 8,
    color: 'rgba(207,224,238,0.4)',
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },

  /* ── Section label ───────────────────────────────────────── */
  sectionLabel: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 6,
    marginTop: 6,
    opacity: 0.6,
  },

  /* ── Scroll ──────────────────────────────────────────────── */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
  },

  /* ── Floor row (rail + card) ─────────────────────────────── */
  floorRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 2,
  },

  /* Rail */
  rail: {
    width: RAIL_WIDTH,
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  railLine: {
    flex: 1,
    width: 2,
    minHeight: 16,
    borderRadius: 1,
  },
  railDot: {
    width: RAIL_DOT_SIZE,
    height: RAIL_DOT_SIZE,
    borderRadius: RAIL_DOT_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  railDotAvail: {
    shadowColor: '#F5CF4A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  railDotBoss: {
    shadowColor: '#DD7A86',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 6,
  },
  railDotCheck: {
    fontSize: 8,
    color: '#07070A',
    fontWeight: '900',
  },
  railDotBossIcon: {
    fontSize: 9,
    color: '#DD7A86',
  },

  /* Floor card */
  floorCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    marginVertical: CARD_MARGIN,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    minHeight: 68,
  },
  floorNumPill: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  floorNumPillCleared: {
    borderColor: 'rgba(63,181,110,0.3)',
    backgroundColor: 'rgba(63,181,110,0.06)',
  },
  floorNumPillAvail: {
    borderColor: 'rgba(245,207,74,0.4)',
    backgroundColor: 'rgba(245,207,74,0.07)',
  },
  floorNumPillBoss: {
    borderColor: 'rgba(221,122,134,0.4)',
    backgroundColor: 'rgba(221,122,134,0.08)',
  },
  floorNum: {
    fontFamily: 'Courier New',
    fontWeight: 'bold',
    fontSize: 15,
    color: 'rgba(207,224,238,0.45)',
  },
  floorCardContent: {
    flex: 1,
    gap: 4,
  },
  floorCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  floorName: {
    fontFamily: 'System',
    fontWeight: '700',
    fontSize: 14,
    color: '#CFE0EE',
    flex: 1,
  },
  floorCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floorFlavor: {
    fontFamily: 'System',
    fontSize: 10,
    color: 'rgba(207,224,238,0.38)',
    flex: 1,
    marginRight: 8,
  },
  floorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  diffStars: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  gridSize: {
    fontFamily: 'System',
    fontSize: 9,
    color: 'rgba(207,224,238,0.3)',
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },

  /* Status badges inside card */
  badgeCleared: {
    backgroundColor: 'rgba(63,181,110,0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(63,181,110,0.25)',
  },
  badgeClearedText: {
    fontFamily: 'System',
    fontSize: 8,
    fontWeight: '900',
    color: '#3FB56E',
    letterSpacing: 0.3,
  },
  badgeNext: {
    backgroundColor: 'rgba(245,207,74,0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(245,207,74,0.3)',
  },
  badgeNextText: {
    fontFamily: 'System',
    fontSize: 8,
    fontWeight: '900',
    color: '#F5CF4A',
    letterSpacing: 0.3,
  },
  badgeBoss: {
    backgroundColor: 'rgba(221,122,134,0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(221,122,134,0.3)',
  },
  badgeBossText: {
    fontFamily: 'System',
    fontSize: 8,
    fontWeight: '900',
    color: '#DD7A86',
    letterSpacing: 0.3,
  },
  lockIcon: {
    fontSize: 12,
    opacity: 0.4,
  },

  /* ── Modal (slide-up sheet) ──────────────────────────────── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    elevation: 12,
  },
  modalInner: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    zIndex: 2,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalEyebrow: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(207,224,238,0.4)',
    letterSpacing: 1.5,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 15,
    color: 'rgba(207,224,238,0.4)',
    fontWeight: 'bold',
  },
  modalHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  modalFloorPill: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalFloorNum: {
    fontFamily: 'Courier New',
    fontWeight: 'bold',
    fontSize: 22,
    color: 'rgba(207,224,238,0.5)',
  },
  modalHeroText: {
    flex: 1,
  },
  modalFloorName: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 20,
    color: '#F8FAFC',
    marginBottom: 6,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalStars: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  gridSizeBadge: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  gridSizeBadgeText: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: 'bold',
    color: 'rgba(207,224,238,0.45)',
  },
  clearedBadge: {
    backgroundColor: 'rgba(63,181,110,0.12)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(63,181,110,0.25)',
  },
  clearedBadgeText: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: '900',
    color: '#3FB56E',
  },
  flavorBox: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  flavorText: {
    fontFamily: 'System',
    fontSize: 12,
    color: 'rgba(207,224,238,0.6)',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  loadoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  loadoutTitle: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  slotPips: {
    flexDirection: 'row',
    gap: 5,
  },
  pip: {
    width: 20,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  pipFilled: {
    backgroundColor: '#D4A754',
    borderColor: '#F9D99A',
  },
  loadoutSub: {
    fontFamily: 'System',
    fontSize: 10,
    color: 'rgba(207,224,238,0.35)',
    marginBottom: 12,
  },
  itemList: {
    gap: 8,
    marginBottom: 18,
  },
  emptyText: {
    fontFamily: 'System',
    fontSize: 12,
    color: 'rgba(207,224,238,0.4)',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  itemIconBox: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  itemIcon: { fontSize: 19 },
  itemInfo: { flex: 1 },
  itemName: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
    color: '#F0E8D8',
  },
  itemOwned: {
    fontFamily: 'System',
    fontSize: 10,
    color: '#D4A754',
    marginTop: 2,
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(212,167,84,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,167,84,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnDim: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  counterBtnText: {
    fontFamily: 'System',
    fontSize: 18,
    color: '#D4A754',
    fontWeight: 'bold',
    lineHeight: 22,
  },
  packedCount: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F8FAFC',
    minWidth: 18,
    textAlign: 'center',
  },

  /* Enter button */
  enterBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  enterBtnText: {
    fontFamily: 'System',
    color: '#1A1200',
    fontWeight: 'bold',
    fontSize: 15,
    zIndex: 2,
    letterSpacing: 0.3,
  },
});
