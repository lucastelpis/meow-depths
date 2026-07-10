/**
 * DungeonFloorScreen.js — Redesigned Dungeon Floor Selection Screen (Winding Grid Layout)
 *
 * Divided into 3 parts:
 *   1st part: Header (consistent design: back button, name of the dungeon)
 *   2nd part: Map (winding snake path, background image per dungeon with overlay, retro 3D buttons)
 *   3rd part: Details (integrated details card showing stats, rewards, seen/unseen monsters, and pack modal trigger/start row)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Pressable,
  Animated,
} from 'react-native';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Rect, Line, Path } from 'react-native-svg';

import { useGame } from '../state/gameState';
import { ZONES, getFloorCompletionReward } from '../data/zones';
import { CONSUMABLES, MATERIALS } from '../data/gear';
import { calculateEffectiveStats } from '../logic/progressionEngine';
import ItemSprite from '../components/ItemSprite';
import { isQuestUnlocked } from '../data/quests';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PAGE_WIDTH = SCREEN_WIDTH - 32;

// ─── Zone Config ──────────────────────────────────────────────────────────────
const ZONE_CONFIG = {
  zone1: {
    accent: '#3FB56E',
    accentDim: 'rgba(63,181,110,0.12)',
    accentGlow: 'rgba(63,181,110,0.18)',
    border: 'rgba(63,181,110,0.25)',
    bg: '#0A120C',
    bannerDesc: 'Damp tunnels. Rats, slime, and worse lurk in every shadow.',
  },
  zone2: {
    accent: '#A855F7',
    accentDim: 'rgba(168,85,247,0.12)',
    accentGlow: 'rgba(168,85,247,0.18)',
    border: 'rgba(168,85,247,0.25)',
    bg: '#0C0A12',
    bannerDesc: 'Overgrown ruins where roots move and fungi glow with malice.',
  },
  zone3: {
    accent: '#06B6D4',
    accentDim: 'rgba(6,182,212,0.12)',
    accentGlow: 'rgba(6,182,212,0.18)',
    border: 'rgba(6,182,212,0.25)',
    bg: '#0A0F1A',
    bannerDesc: 'Salt-crusted wharves haunted by drowned things.',
  },
};

// Background banners mapping
const ZONE_BACKGROUNDS = {
  zone1: require('../../assets/sprites/banners/soggy-ruins-zones.png'),
  zone2: require('../../assets/sprites/banners/wicked-garden-zones.png'),
  zone3: require('../../assets/sprites/banners/sunken-docks-zones.png'),
};

const GRID_SIZES = {
  1: '3×3', 2: '3×3', 3: '3×3',
  4: '3×4', 5: '3×4', 6: '3×4',
  7: '4×4', 8: '4×4', 9: '4×4',
  10: '4×5',
};

const DIFF_DATA = {
  1: { rating: 0.5, color: '#5A9FE0' },
  2: { rating: 1.0, color: '#5A9FE0' },
  3: { rating: 1.5, color: '#5A9FE0' },
  4: { rating: 2.0, color: '#F08A4A' },
  5: { rating: 2.5, color: '#F08A4A' },
  6: { rating: 3.0, color: '#F08A4A' },
  7: { rating: 3.5, color: '#D8483F' },
  8: { rating: 4.0, color: '#D8483F' },
  9: { rating: 4.5, color: '#D8483F' },
  10: { rating: 5.0, color: '#DD7A86', skull: true },
};

function getFloorStatus(floor, cleared) {
  if (floor <= cleared) return 'cleared';
  if (floor === cleared + 1) return 'available';
  return 'locked';
}

function renderDifficultyStars(diffData, size = 10) {
  const fontSize = size + 3;

  if (diffData.skull) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <ItemSprite key={`skull-${i}`} spritesheet="icons-map" frameIndex={34} displaySize={size + 4} />
        ))}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, diffData.rating - i));
        return (
          <View key={`star-${i}`} style={{ marginHorizontal: 0.5 }}>
            <Text style={{ fontSize, color: diffData.color, opacity: 0.25 }}>☆</Text>
            {fill > 0 && (
              <View style={[StyleSheet.absoluteFill, { width: `${fill * 100}%`, overflow: 'hidden' }]}>
                <Text style={{ fontSize, color: diffData.color }}>★</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}


export default function DungeonFloorScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { zoneId } = route.params || {};
  const { state, dispatch } = useGame();
  const insets = useSafeAreaInsets();

  const zone = ZONES[zoneId];
  const zc = ZONE_CONFIG[zoneId] || ZONE_CONFIG.zone1;

  const floorsCleared = state.progress.floorsCleared?.[zoneId] || 0;
  const isZoneCleared = !!state.progress[`${zoneId}Cleared`];
  const effectiveCleared = isZoneCleared ? 10 : floorsCleared;

  // Initialize selectedFloor to the highest unlocked/frontier floor
  const defaultFloor = Math.min(effectiveCleared + 1, 10);
  const [selectedFloor, setSelectedFloor] = useState(defaultFloor);

  const activeCampaignQuests = state.progress.questsState?.campaign || [];

  const activeQuestForFloor = useMemo(() => {
    return activeCampaignQuests.find(q => {
      const matchesFloor = q.floorNumber == selectedFloor || (q.type === 'defeat_boss' && selectedFloor == 10);
      return q.zoneId == zoneId &&
        matchesFloor &&
        !q.claimed &&
        isQuestUnlocked(q, activeCampaignQuests, state.progress);
    });
  }, [activeCampaignQuests, zoneId, selectedFloor, state.progress]);

  const hasActiveQuest = !!activeQuestForFloor;

  const [questModalVisible, setQuestModalVisible] = useState(false);

  const [loadout, setLoadout] = useState({});
  const detailsScrollRef = React.useRef(null);

  // Pulsing animation for selected button border
  const pulseAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: false,
        })
      ])
    ).start();
  }, []);

  const effectiveStats = useMemo(() => calculateEffectiveStats(state.hero), [state.hero]);
  const maxSlots = effectiveStats.bagSlots || 0;

  const totalPacked = useMemo(
    () => Object.values(loadout).reduce((s, v) => s + v, 0),
    [loadout],
  );

  const addItem = (id) => {
    if (totalPacked >= maxSlots) return;
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
    setLoadout({});
    setSelectedFloor(floor);
    detailsScrollRef.current?.scrollTo({ x: 0, animated: false });
  };

  const [noConsumablesModalVisible, setNoConsumablesModalVisible] = useState(false);

  const executeStartRun = () => {
    const carried = [];
    for (const [id, count] of Object.entries(loadout)) {
      for (let i = 0; i < count; i++) carried.push(id);
    }
    dispatch({ type: 'START_RUN', payload: { zoneId, floorNumber: selectedFloor, consumables: carried } });
    navigation.navigate('DungeonMap');
  };

  const handleEnter = () => {
    const status = getFloorStatus(selectedFloor, effectiveCleared);
    if (status === 'locked') return;

    if (totalPacked === 0) {
      setNoConsumablesModalVisible(true);
      return;
    }

    executeStartRun();
  };

  // Get coordinates for 3-column snake path (Expanded vertical height)
  const mapPadding = 20;
  const mapWidth = SCREEN_WIDTH - mapPadding * 2;
  const headerHeight = insets.top + 56;
  const detailsHeight = 245 + 10 + Math.max(insets.bottom, 16);
  const mapHeight = SCREEN_HEIGHT - headerHeight - detailsHeight;

  const getButtonPosition = (floor) => {
    const colWidth = mapWidth / 3;
    const rowHeight = mapHeight / 4.1;
    const yOffset = 18;

    switch (floor) {
      case 1: return { x: colWidth * 0.5, y: rowHeight * 0.5 + yOffset };
      case 2: return { x: colWidth * 1.5, y: rowHeight * 0.5 + yOffset };
      case 3: return { x: colWidth * 2.5, y: rowHeight * 0.5 + yOffset };
      case 4: return { x: colWidth * 2.5, y: rowHeight * 1.5 + yOffset };
      case 5: return { x: colWidth * 1.5, y: rowHeight * 1.5 + yOffset };
      case 6: return { x: colWidth * 0.5, y: rowHeight * 1.5 + yOffset };
      case 7: return { x: colWidth * 0.5, y: rowHeight * 2.5 + yOffset };
      case 8: return { x: colWidth * 1.5, y: rowHeight * 2.5 + yOffset };
      case 9: return { x: colWidth * 2.5, y: rowHeight * 2.5 + yOffset };
      case 10: return { x: colWidth * 1.5, y: rowHeight * 3.4 + yOffset }; // Centered Boss
      default: return { x: 0, y: 0 };
    }
  };

  const lines = [
    [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]
  ];

  if (!zone) return null;

  const bgImage = ZONE_BACKGROUNDS[zoneId] || ZONE_BACKGROUNDS.zone1;
  const selectedStatus = getFloorStatus(selectedFloor, effectiveCleared);
  const selectedDiff = DIFF_DATA[selectedFloor];
  const selectedReward = getFloorCompletionReward(zoneId, selectedFloor);

  return (
    <View style={[styles.container, { backgroundColor: '#133131' }]}>
      {/* Full-screen ambient gradient */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="screenGlow" cx="50%" cy="0%" rx="80%" ry="35%">
            <Stop offset="0%" stopColor={zc.accent} stopOpacity="0.14" />
            <Stop offset="100%" stopColor="#133131" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="#133131" />
        <Rect width="100%" height="100%" fill="url(#screenGlow)" />
      </Svg>

      {/* ── 1st Part: Header ── */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerBackButtonWrapper}>
          {/* 1. Bevel Shadow Base */}
          <View style={styles.headerBackButtonBevelShadow} />

          {/* 2. Main Outer Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
            style={styles.headerBackButtonOuter}
          >
            {/* 3. Inner Highlight & Fill */}
            <View style={styles.headerBackButtonInner}>
              <ItemSprite
                spritesheet="icons-map"
                frameIndex={43}
                displaySize={26}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.headerTitleOuterBorder}>
          <View style={styles.headerTitleInnerBorder}>
            <Text style={styles.headerTitleText}>{zone.name}</Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Body Area (Shared Background Artwork) ── */}
      <View style={styles.bodyContainer}>
        {/* Background Artwork */}
        <ExpoImage
          source={bgImage}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
        {/* Dark overlay for transparency & readability */}
        <View style={[styles.mapOverlay, StyleSheet.absoluteFillObject]} />

        {/* ── 2nd Part: Map ── */}
        <View style={[styles.mapContainer, { height: mapHeight }]}>

          {/* Dashed lines connector path */}
          <Svg style={StyleSheet.absoluteFill} width={SCREEN_WIDTH} height={mapHeight}>
            {lines.map(([from, to], idx) => {
              const p1 = getButtonPosition(from);
              const p2 = getButtonPosition(to);
              return (
                <Line
                  key={idx}
                  x1={p1.x + mapPadding}
                  y1={p1.y}
                  x2={p2.x + mapPadding}
                  y2={p2.y}
                  stroke="rgba(255, 255, 255, 0.35)"
                  strokeWidth={3}
                  strokeDasharray="6,6"
                />
              );
            })}
          </Svg>

          {/* 10 Zone Buttons */}
          {Array.from({ length: 10 }).map((_, idx) => {
            const floor = idx + 1;
            const coords = getButtonPosition(floor);
            const status = getFloorStatus(floor, effectiveCleared);
            const isSelected = selectedFloor === floor;

            const isCleared = status === 'cleared';
            const isAvail = status === 'available';

            let bgColor = '#4E4256'; // Locked purple-grey fill
            let innerBorderColor = '#776A81'; // Locked inset outline
            let innerShadowColor = '#2E2536'; // Locked inset bottom shadow
            let outerBorderColor = '#6C5E77'; // Locked main frame
            let bevelColor = '#2C2534'; // Locked 3D shadow base

            if (isCleared) {
              bgColor = '#488134ff'; // Darker forest green fill
              innerBorderColor = '#8EB648'; // Light-green inset outline
              innerShadowColor = '#364E2C'; // Dark-green inset bottom shadow
              outerBorderColor = '#9A7E56'; // Golden-bronze frame
              bevelColor = '#4F3C1E'; // Dark-brown 3D shadow base
            } else if (isAvail) {
              bgColor = '#4E4256'; // Greyish-purple fill (matches active stairs sprite bg)
              innerBorderColor = '#E5C25F'; // Gold inset outline highlight
              innerShadowColor = '#2E2536'; // Dark inset bottom shadow
              outerBorderColor = '#E5C25F'; // Bright gold frame outline
              bevelColor = '#6E5528'; // Gold 3D shadow base
            }

            // Interpolate border color if selected to create the pulsating outline
            let animatedBorderColor = outerBorderColor;
            if (isSelected) {
              let pulseTarget = '#FFFFFF';
              if (isCleared) {
                pulseTarget = '#FFE59B'; // Pulses to bright warm gold
              } else if (isAvail) {
                pulseTarget = '#FFFFFF'; // Pulses to glowing white
              } else {
                pulseTarget = '#AE9ABF'; // Pulses to light lavender
              }
              animatedBorderColor = pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [outerBorderColor, pulseTarget],
              });
            }



            return (
              <View
                key={floor}
                style={[
                  styles.buttonWrapper,
                  {
                    left: coords.x + mapPadding - 28,
                    top: coords.y - 28,
                  }
                ]}
              >
                {/* 1. Bevel Shadow Base */}
                <View style={[
                  styles.buttonBevelShadow,
                  {
                    backgroundColor: bevelColor,
                    transform: isSelected ? [{ scale: 1.15 }] : [{ scale: 1.0 }],
                  }
                ]} />

                {/* 2. Main Outer Button */}
                <AnimatedTouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => openFloor(floor)}
                  disabled={status === 'locked'}
                  style={[
                    styles.mapButtonOuter,
                    {
                      backgroundColor: bevelColor, // gap fill
                      borderColor: animatedBorderColor,
                      transform: isSelected ? [{ scale: 1.15 }] : [{ scale: 1.0 }],
                    }
                  ]}
                >
                  {/* 3. Inner Highlight & Fill */}
                  <View style={[
                    styles.mapButtonInner,
                    {
                      backgroundColor: bgColor,
                      borderTopColor: innerBorderColor,
                      borderLeftColor: innerBorderColor,
                      borderRightColor: innerBorderColor,
                      borderBottomColor: innerShadowColor,
                      borderBottomWidth: 4,
                    }
                  ]}>
                    {isCleared ? (
                      <ItemSprite spritesheet="icons-map" frameIndex={28} displaySize={38} />
                    ) : isAvail ? (
                      <ItemSprite spritesheet="icons-map" frameIndex={4} displaySize={38} />
                    ) : (
                      <ItemSprite spritesheet="icons-map" frameIndex={49} displaySize={38} opacity={0.65} />
                    )}
                  </View>
                </AnimatedTouchableOpacity>

                {/* Label Text */}
                <Text style={[
                  styles.buttonLabel,
                  { color: isSelected ? '#F5CF4A' : '#CFE0EE' },
                ]}>
                  {`Zone ${floor}`}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── 3rd Part: Details Panel (Paging horizontal scroll: Details ⇄ Pack Supplies) ── */}
        <View style={[styles.detailsContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {hasActiveQuest && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setQuestModalVisible(true)}
              style={styles.questBadgeContainer}
            >
              <View style={styles.questBadgeOuter}>
                <View style={styles.questBadgeInner}>
                  <ItemSprite spritesheet="icons-map" frameIndex={73} displaySize={18} />
                </View>
              </View>
              <View style={styles.questBadgeAlert}>
                <Text style={styles.questBadgeAlertText}>!</Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.detailsCard}>
            <ScrollView
              ref={detailsScrollRef}
              horizontal
              pagingEnabled
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              style={styles.detailsScroll}
              contentContainerStyle={{ width: PAGE_WIDTH * 2 }}
            >
              {/* Page 1: Floor Details */}
              <View style={{ width: PAGE_WIDTH, padding: 12 }}>
                {/* Row 1: Simple Header info line (NAME - STARS - GRID SIZE) */}
                <View style={styles.detailHeaderLine}>
                  <Text style={styles.detailTitleCompact}>
                    {`Zone ${selectedFloor}`}
                  </Text>

                  {selectedDiff && (
                    <View style={styles.detailHeaderStars}>
                      {renderDifficultyStars(selectedDiff, 14)}
                    </View>
                  )}

                  <View style={styles.gridBadgeCompact}>
                    <Text style={styles.gridBadgeTextCompact}>
                      {(selectedFloor === 10 && zoneId === 'zone1') ? '4×4' : GRID_SIZES[selectedFloor]}
                    </Text>
                  </View>
                </View>

                {/* Row 2a: Rewards List */}
                <Text style={styles.subHeaderCompact}>REWARDS</Text>
                <View style={styles.innerSectionBox}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rewardsRowCompact}>
                    {/* Gold Reward Box */}
                    <View style={styles.rewardCard}>
                      <View style={styles.rewardItemBox}>
                        <ItemSprite
                          spritesheet="icons-1"
                          frameIndex={11}
                          displaySize={36}
                        />
                      </View>
                      <Text style={styles.rewardName} numberOfLines={1}>
                        {selectedReward.gold} G
                      </Text>
                    </View>

                    {/* XP Reward Box */}
                    <View style={styles.rewardCard}>
                      <View style={styles.rewardItemBox}>
                        <ItemSprite
                          spritesheet="icons-map"
                          frameIndex={146}
                          displaySize={36}
                        />
                      </View>
                      <Text style={styles.rewardName} numberOfLines={1}>
                        {selectedReward.xp} XP
                      </Text>
                    </View>
                  </ScrollView>
                </View>

                {/* Row 3: Action Button (Start Expedition slides to Page 2) */}
                <View style={styles.actionRow}>
                  {(() => {
                    const isStartDisabled = selectedStatus === 'locked';
                    const btnBgColor = isStartDisabled ? '#4E4256' : '#1B4030';
                    const btnInnerBorder = isStartDisabled ? '#776A81' : '#4F856C';
                    const btnInnerShadow = isStartDisabled ? '#2E2536' : '#0D2118';
                    const btnOuterBorder = isStartDisabled ? '#6C5E77' : '#84735B';
                    const btnBevel = isStartDisabled ? '#2C2534' : '#0D2118';

                    return (
                      <View style={styles.wideButtonWrapper}>
                        {/* 1. Bevel Shadow Base */}
                        <View style={[styles.wideButtonBevelShadow, { backgroundColor: btnBevel }]} />

                        {/* 2. Main Outer Button */}
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            if (!isStartDisabled) {
                              setLoadout({}); // Clear previous selection
                              detailsScrollRef.current?.scrollTo({ x: PAGE_WIDTH, animated: true });
                            }
                          }}
                          disabled={isStartDisabled}
                          style={[
                            styles.wideButtonOuter,
                            {
                              backgroundColor: btnBevel, // gap fill
                              borderColor: btnOuterBorder,
                            }
                          ]}
                        >
                          {/* 3. Inner Highlight & Fill */}
                          <View style={[
                            styles.wideButtonInner,
                            {
                              backgroundColor: btnBgColor,
                              borderTopColor: btnInnerBorder,
                              borderLeftColor: btnInnerBorder,
                              borderRightColor: btnInnerBorder,
                              borderBottomColor: btnInnerShadow,
                            }
                          ]}>
                            <Text style={styles.wideButtonText}>
                              {isStartDisabled ? 'LOCKED' : 'PACK FOR EXPEDITION'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  })()}
                </View>
              </View>

              {/* Page 2: Pack Supplies */}
              <View style={{ width: PAGE_WIDTH, padding: 12 }}>
                {/* Row 1: Header row with Back Button */}
                <View style={styles.detailHeaderLine}>
                  <View style={styles.backBtnHeaderWrapper}>
                    <View style={styles.backBtnHeaderShadow} />
                    <TouchableOpacity
                      style={styles.backBtnHeaderOuter}
                      onPress={() => detailsScrollRef.current?.scrollTo({ x: 0, animated: true })}
                      activeOpacity={0.8}
                    >
                      <View style={styles.backBtnHeaderInner}>
                        <Text style={styles.backBtnText}>← BACK</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.detailTitleCompact}>PACK SUPPLIES</Text>

                  {/* Slot Pips Indicator */}
                  <View style={styles.slotIndicatorModal}>
                    {Array.from({ length: maxSlots }).map((_, i) => (
                      <View key={i} style={[styles.slotPip, i < totalPacked && styles.slotPipFilled]} />
                    ))}
                    <Text style={styles.slotText}>{totalPacked}/{maxSlots}</Text>
                  </View>
                </View>

                {/* Supplies Items List */}
                <ScrollView style={styles.inlineScroll} showsVerticalScrollIndicator={true}>
                  {maxSlots === 0 ? (
                    <Text style={styles.emptySuppliesText}>No bag slots. Equip a belt/bag in Profile loadout!</Text>
                  ) : state.hero.inventory.consumables.filter(c => c.quantity > 0).length === 0 ? (
                    <Text style={styles.emptySuppliesText}>No supplies owned. Purchase potions at the Shop!</Text>
                  ) : (
                    state.hero.inventory.consumables
                      .filter(e => e.quantity > 0)
                      .map(entry => {
                        const def = CONSUMABLES.find(c => c.id === entry.id);
                        const packed = loadout[entry.id] || 0;
                        const canAdd = totalPacked < maxSlots && packed < entry.quantity;

                        return (
                          <View key={entry.id} style={styles.supplyRow}>
                            <View style={styles.supplyIconContainer}>
                              {def?.spritesheet ? (
                                <ItemSprite
                                  spritesheet={def.spritesheet}
                                  frameIndex={def.frameIndex}
                                  displaySize={20}
                                />
                              ) : (
                                <Text style={{ fontSize: 16 }}>🧪</Text>
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.supplyName}>{def?.name || entry.id}</Text>
                              <Text style={styles.supplyOwned}>Owned: {entry.quantity}</Text>
                            </View>
                            <View style={styles.supplyControls}>
                              {packed === 0 ? (
                                <View style={styles.cntBtnDisabled}>
                                  <Text style={styles.cntBtnTextDisabled}>−</Text>
                                </View>
                              ) : (
                                <View style={styles.cntBtnWrapper}>
                                  <View style={styles.cntBtnShadowMinus} />
                                  <TouchableOpacity
                                    style={styles.cntBtnOuter}
                                    onPress={() => removeItem(entry.id)}
                                    activeOpacity={0.8}
                                  >
                                    <View style={styles.cntBtnInnerMinus}>
                                      <Text style={styles.cntBtnText}>−</Text>
                                    </View>
                                  </TouchableOpacity>
                                </View>
                              )}

                              <Text style={styles.cntText}>{packed}</Text>

                              {!canAdd ? (
                                <View style={styles.cntBtnDisabled}>
                                  <Text style={styles.cntBtnTextDisabled}>+</Text>
                                </View>
                              ) : (
                                <View style={styles.cntBtnWrapper}>
                                  <View style={styles.cntBtnShadowPlus} />
                                  <TouchableOpacity
                                    style={styles.cntBtnOuter}
                                    onPress={() => addItem(entry.id)}
                                    activeOpacity={0.8}
                                  >
                                    <View style={styles.cntBtnInnerPlus}>
                                      <Text style={styles.cntBtnText}>+</Text>
                                    </View>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })
                  )}
                </ScrollView>

                {/* Confirm & Start Button */}
                <View style={styles.actionRow}>
                  <View style={styles.wideButtonWrapper}>
                    {/* 1. Bevel Shadow Base */}
                    <View style={[styles.wideButtonBevelShadow, { backgroundColor: '#0D2118' }]} />

                    {/* 2. Main Outer Button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleEnter}
                      style={[
                        styles.wideButtonOuter,
                        {
                          backgroundColor: '#0D2118', // gap fill
                          borderColor: '#84735B',
                        }
                      ]}
                    >
                      {/* 3. Inner Highlight & Fill */}
                      <View style={[
                        styles.wideButtonInner,
                        {
                          backgroundColor: '#1B4030',
                          borderTopColor: '#4F856C',
                          borderLeftColor: '#4F856C',
                          borderRightColor: '#4F856C',
                          borderBottomColor: '#0D2118',
                        }
                      ]}>
                        <Text style={styles.wideButtonText}>START EXPEDITION</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>

        {/* ── Active Quest Details Modal ── */}
        <Modal
          visible={questModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setQuestModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setQuestModalVisible(false)}
          >
            <View style={styles.modalContentWrapper}>
              <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                {activeQuestForFloor && (
                  <>
                    {/* Modal Header */}
                    <View style={styles.modalHeader}>
                      <ItemSprite spritesheet="icons-map" frameIndex={73} displaySize={24} />
                      <Text style={styles.modalTitle} numberOfLines={1} adjustsFontSizeToFit>{activeQuestForFloor.title}</Text>
                      <TouchableOpacity
                        onPress={() => setQuestModalVisible(false)}
                        style={styles.modalCloseButton}
                      >
                        <Text style={styles.modalCloseButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.modalDivider} />

                    {/* Quest Description */}
                    <Text style={styles.modalQuestDesc}>{activeQuestForFloor.desc}</Text>

                    {/* Quest Progress */}
                    <View style={styles.modalProgressSection}>
                      <Text style={styles.modalSectionLabel}>PROGRESS</Text>
                      <View style={styles.modalProgressContainer}>
                        <View style={styles.modalProgressBarBg}>
                          <View
                            style={[
                              styles.modalProgressBarFill,
                              {
                                width: `${Math.min(
                                  100,
                                  ((activeQuestForFloor.progress || 0) /
                                    (activeQuestForFloor.target || 1)) *
                                  100
                                )}%`,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.modalProgressText}>
                          {activeQuestForFloor.progress || 0} / {activeQuestForFloor.target || 1}
                        </Text>
                      </View>
                    </View>

                    {/* Quest Rewards */}
                    <View style={styles.modalRewardsSection}>
                      <Text style={styles.modalSectionLabel}>REWARDS</Text>
                      <View style={styles.modalRewardsRow}>
                        {/* Gold Reward */}
                        {activeQuestForFloor.rewards?.gold > 0 && (
                          <View style={styles.modalRewardCard}>
                            <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={24} />
                            <Text style={styles.modalRewardText}>{activeQuestForFloor.rewards.gold} G</Text>
                          </View>
                        )}

                        {/* XP Reward */}
                        {activeQuestForFloor.rewards?.xp > 0 && (
                          <View style={styles.modalRewardCard}>
                            <ItemSprite spritesheet="icons-map" frameIndex={146} displaySize={24} />
                            <Text style={styles.modalRewardText}>{activeQuestForFloor.rewards.xp} XP</Text>
                          </View>
                        )}

                        {/* Consumables Rewards */}
                        {activeQuestForFloor.rewards?.consumables &&
                          Object.entries(activeQuestForFloor.rewards.consumables).map(([itemId, qty]) => {
                            const isMega = itemId.includes('mega');
                            const isSuper = itemId.includes('super');
                            const frame = isMega ? 4 : (isSuper ? 3 : 2); // Potion frames
                            return (
                              <View key={itemId} style={styles.modalRewardCard}>
                                <ItemSprite spritesheet="icons-1" frameIndex={frame} displaySize={24} />
                                <Text style={styles.modalRewardText}>{qty}x {itemId.replace('_', ' ').toUpperCase()}</Text>
                              </View>
                            );
                          })}
                      </View>
                    </View>

                    {/* OK Button */}
                    <View style={styles.modalFooter}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setQuestModalVisible(false)}
                        style={styles.modalOkButtonOuter}
                      >
                        <View style={styles.modalOkButtonInner}>
                          <Text style={styles.modalOkButtonText}>UNDERSTOOD</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* ── No Consumables Warning Modal ── */}
        <Modal
          visible={noConsumablesModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setNoConsumablesModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setNoConsumablesModalVisible(false)}
          >
            <View style={styles.modalContentWrapper}>
              <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <ItemSprite spritesheet="icons-map" frameIndex={49} displaySize={24} />
                  <Text style={styles.modalTitle}>No Supplies packed!</Text>
                </View>

                <View style={styles.modalDivider} />

                {/* Warning Text */}
                <Text style={styles.modalQuestDesc}>
                  You are starting the expedition without packing any consumables.
                  {"\n\n"}
                  Are you sure you want to proceed unprepared?
                </Text>

                {/* Action Buttons Row */}
                <View style={styles.warningModalBtnRow}>
                  {/* Cancel / Go Back */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setNoConsumablesModalVisible(false)}
                    style={[styles.warningBtnOuter, { borderColor: '#84735B' }]}
                  >
                    <View style={[styles.warningBtnInner, { backgroundColor: '#4F3C1E' }]}>
                      <Text style={styles.warningBtnText}>GO BACK</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Confirm / Start anyway */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setNoConsumablesModalVisible(false);
                      executeStartRun();
                    }}
                    style={[styles.warningBtnOuter, { borderColor: '#A61C1C' }]}
                  >
                    <View style={[styles.warningBtnInner, { backgroundColor: '#590D0E', borderColor: '#A61C1C' }]}>
                      <Text style={[styles.warningBtnText, { color: '#FFF3DA' }]}>PROCEED</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bodyContainer: {
    flex: 1,
    position: 'relative',
  },

  /* ── 1st Part: Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#84735B',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  headerBackButtonWrapper: {
    width: 44,
    height: 44,
    position: 'relative',
  },
  headerBackButtonBevelShadow: {
    position: 'absolute',
    left: 0,
    top: 3,
    width: 44,
    height: 44,
    borderRadius: 8,
    zIndex: 1,
    backgroundColor: '#4F3C1E',
  },
  headerBackButtonOuter: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: '#84735B',
    backgroundColor: '#4F3C1E',
    zIndex: 2,
  },
  headerBackButtonInner: {
    flex: 1,
    margin: 2,
    borderRadius: 5,
    borderWidth: 2.5,
    borderTopColor: '#D8483F',
    borderLeftColor: '#D8483F',
    borderRightColor: '#D8483F',
    borderBottomColor: '#590D0E',
    borderBottomWidth: 4,
    backgroundColor: '#A61C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleOuterBorder: {
    borderWidth: 2.5,
    borderColor: '#4A3917',
    borderRadius: 8,
    backgroundColor: 'transparent',
    padding: 2,
  },
  headerTitleInnerBorder: {
    borderWidth: 2,
    borderColor: '#D4A754',
    borderRadius: 5,
    backgroundColor: '#1E1E20',
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  headerTitleText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 28,
    color: '#FFF3DA',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  headerSpacer: {
    width: 44,
  },

  /* ── 2nd Part: Map (Expanded height) ── */
  mapContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  mapBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  buttonWrapper: {
    position: 'absolute',
    alignItems: 'center',
    width: 56,
    zIndex: 10,
  },
  buttonBevelShadow: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 56,
    height: 56,
    borderRadius: 8,
    zIndex: 1,
  },
  mapButtonOuter: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 2.5,
    zIndex: 2,
  },
  mapButtonInner: {
    flex: 1,
    margin: 2,
    borderRadius: 5,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bossArchwayContainer: {
    position: 'absolute',
    left: -12,
    top: -12,
    width: 80,
    height: 80,
    zIndex: 3,
  },
  buttonLabel: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 20,
    color: '#CFE0EE',
    marginTop: 12,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },

  /* ── 3rd Part: Details Panel (Decreased height) ── */
  detailsContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    position: 'relative',
  },
  detailsCard: {
    height: 245,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#84735B',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    overflow: 'hidden',
  },
  detailsScroll: {
    flex: 1,
  },
  detailsScrollContent: {
    padding: 12,
  },
  detailHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  detailTitleCompact: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 26,
    color: '#FFE39B',
  },
  detailHeaderStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  gridBadgeCompact: {
    borderWidth: 1,
    borderColor: '#84735B',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#231F2B',
  },
  gridBadgeTextCompact: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 14,
    color: '#FFE39B',
  },

  innerSectionBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderColor: '#4D4455',
    borderWidth: 1.5,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  rewardsRowCompact: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  rewardCard: {
    alignItems: 'center',
    width: 64,
  },
  rewardItemBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#5C5065',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  rewardName: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 15,
    color: '#EAD9BA',
    marginTop: 4,
    textAlign: 'center',
    width: '100%',
  },

  subHeaderCompact: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 16,
    color: '#FFE39B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  wideButtonWrapper: {
    flex: 1,
    height: 48,
    position: 'relative',
  },
  wideButtonBevelShadow: {
    position: 'absolute',
    left: 0,
    top: 4,
    right: 0,
    height: 44,
    borderRadius: 8,
    zIndex: 1,
  },
  wideButtonOuter: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 2.5,
    zIndex: 2,
  },
  wideButtonInner: {
    flex: 1,
    margin: 2,
    borderRadius: 5,
    borderWidth: 2.5,
    borderBottomWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wideButtonText: {
    fontFamily: 'Jersey10-Regular',
    color: '#FFF',
    fontSize: 24,
    letterSpacing: 0.3,
  },

  /* ── Pack Supplies Card styles ── */
  backBtnHeaderWrapper: {
    width: 60,
    height: 26,
    position: 'relative',
  },
  backBtnHeaderShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 2,
    height: 26,
    borderRadius: 6,
    zIndex: 1,
    backgroundColor: '#590D0E',
  },
  backBtnHeaderOuter: {
    width: 60,
    height: 26,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#84735B',
    backgroundColor: '#590D0E',
    zIndex: 2,
  },
  backBtnHeaderInner: {
    flex: 1,
    margin: 1,
    borderRadius: 4,
    borderWidth: 1.5,
    borderBottomWidth: 2.5,
    borderColor: '#D8483F',
    backgroundColor: '#A61C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8.5,
    color: '#EAD9BA',
    marginTop: -1,
  },
  loadoutIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  loadoutSubTitle: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8.5,
    color: '#FFE39B',
  },
  slotIndicatorModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slotPip: {
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  slotPipFilled: {
    backgroundColor: '#FFE39B',
  },
  slotText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    color: '#EAD9BA',
    marginLeft: 4,
  },
  inlineScroll: {
    maxHeight: 134,
    marginBottom: 8,
  },
  emptySuppliesText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 12,
    color: '#EAD9BA',
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  supplyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1.5,
    borderColor: '#4D4455',
    borderRadius: 8,
    padding: 8,
    gap: 8,
    marginBottom: 6,
  },
  supplyIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplyName: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 13,
    color: '#EAD9BA',
  },
  supplyOwned: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    color: '#FFE39B',
  },
  supplyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cntBtnWrapper: {
    width: 28,
    height: 28,
    position: 'relative',
  },
  cntBtnOuter: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#84735B',
    zIndex: 2,
  },
  cntBtnInnerMinus: {
    flex: 1,
    margin: 1,
    borderRadius: 4,
    borderWidth: 1.5,
    borderBottomWidth: 2.5,
    borderColor: '#D8483F',
    backgroundColor: '#A61C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cntBtnShadowMinus: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 2,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#590D0E',
    zIndex: 1,
  },
  cntBtnInnerPlus: {
    flex: 1,
    margin: 1,
    borderRadius: 4,
    borderWidth: 1.5,
    borderBottomWidth: 2.5,
    borderColor: '#4F856C',
    backgroundColor: '#1B4030',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cntBtnShadowPlus: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 2,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#0D2118',
    zIndex: 1,
  },
  cntBtnDisabled: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cntBtnTextDisabled: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.2)',
    marginTop: -2,
  },
  cntBtnText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: '#FFF3DA',
    marginTop: -2,
  },
  cntText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 14,
    color: '#EAD9BA',
    minWidth: 14,
    textAlign: 'center',
  },
  questBadgeContainer: {
    position: 'absolute',
    top: -2,
    right: 26,
    zIndex: 50,
  },
  questBadgeOuter: {
    borderWidth: 2,
    borderColor: '#84735B',
    borderRadius: 8,
    backgroundColor: '#4F3C1E',
    padding: 2,
  },
  questBadgeInner: {
    borderWidth: 1.5,
    borderColor: '#4F856C',
    borderRadius: 5,
    backgroundColor: '#1B4030',
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questBadgeAlert: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#A61C1C',
    borderWidth: 1,
    borderColor: '#FFF3DA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questBadgeAlertText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#FFF3DA',
    lineHeight: 10,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContentWrapper: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 2,
    borderColor: '#84735B',
    borderRadius: 16,
    backgroundColor: '#4F3C1E',
    padding: 3,
  },
  modalContent: {
    borderWidth: 1.5,
    borderColor: '#4F856C',
    borderRadius: 12,
    backgroundColor: '#1B4030',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    flex: 1,
    fontFamily: 'Jersey10-Regular',
    fontSize: 26,
    color: '#FFE39B',
    marginLeft: 8,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseButtonText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 24,
    color: '#EAD9BA',
  },
  modalDivider: {
    height: 2,
    backgroundColor: 'rgba(234, 217, 186, 0.15)',
    marginBottom: 12,
  },
  modalQuestDesc: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
    color: '#EAD9BA',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalSectionLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    color: '#84735B',
    marginBottom: 6,
  },
  modalProgressSection: {
    marginBottom: 16,
  },
  modalProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalProgressBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#84735B',
    overflow: 'hidden',
  },
  modalProgressBarFill: {
    height: '100%',
    backgroundColor: '#3FB56E',
    borderRadius: 4,
  },
  modalProgressText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    color: '#EAD9BA',
  },
  modalRewardsSection: {
    marginBottom: 20,
  },
  modalRewardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalRewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(234, 217, 186, 0.1)',
    gap: 6,
  },
  modalRewardText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: '#FFE39B',
  },
  modalFooter: {
    alignItems: 'center',
  },
  modalOkButtonOuter: {
    width: '100%',
    height: 38,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#84735B',
    backgroundColor: '#4F3C1E',
    padding: 2,
  },
  modalOkButtonInner: {
    flex: 1,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#4F856C',
    backgroundColor: '#1B4030',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOkButtonText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
    color: '#FFF3DA',
  },
  warningModalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  warningBtnOuter: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1.5,
    padding: 2,
    backgroundColor: '#000',
  },
  warningBtnInner: {
    flex: 1,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningBtnText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: '#EAD9BA',
  },
});
