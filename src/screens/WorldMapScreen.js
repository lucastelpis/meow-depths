/**
 * WorldMapScreen.js — Zone Selection + Pre-Run Loadout Picker (Redesigned Premium UI)
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Path,
  G,
  Circle,
  Line,
  Polygon,
} from 'react-native-svg';

import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { ZONES } from '../data/zones';
import ItemSprite from '../components/ItemSprite';
import { DUNGEON_BANNERS } from '../constants/sprites';

// Define specific gradient colors for each zone for rich visual aesthetics
const ZONE_GRADIENTS = {
  zone1: {
    start: '#0F1A0F', // Soggy Ruins - Swamp/Venom green tint
    end: '#060B06',
    border: 'rgba(76, 175, 80, 0.25)',
    accent: '#10B981',
  },
  zone2: {
    start: '#150F1A', // Twisted Garden - Mystical Forest/Purple tint
    end: '#09060B',
    border: 'rgba(168, 85, 247, 0.25)',
    accent: '#A855F7',
  },
  zone3: {
    start: '#0F151F', // Sunken Docks - Oceanic blue/cyan tint
    end: '#06090B',
    border: 'rgba(6, 182, 212, 0.25)',
    accent: '#06B6D4',
  },
};

// ── Completion Status Badge Renderers ────────────────────────────────────────
const renderStatusBadge = (unlocked, isCleared) => {
  if (!unlocked) {
    return (
      <View style={[styles.statusBadge, styles.statusBadgeLocked]}>
        <ItemSprite spritesheet="icons-map" frameIndex={49} displaySize={11} opacity={0.5} />
        <Text style={styles.statusBadgeTextLocked}>LOCKED</Text>
      </View>
    );
  }
  if (isCleared) {
    return (
      <View style={[styles.statusBadge, styles.statusBadgeCleared]}>
        <ItemSprite spritesheet="icons-1" frameIndex={4} displaySize={11} />
        <Text style={styles.statusBadgeTextCleared}>COMPLETED</Text>
      </View>
    );
  }
  return null;
};

export default function WorldMapScreen({ navigation }) {
  const { state } = useGame();
  const zoneList = Object.values(ZONES);
  const insets = useSafeAreaInsets();

  // ── Zone unlock helper ─────────────────────────────────────────────────────
  const isZoneUnlocked = (zone) => {
    if (!zone.unlockCondition) return true;
    return !!state.progress[zone.unlockCondition];
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Background with subtle top radial gradient glow (shared hub look) */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="worldTopGlow" cx="50%" cy="0%" rx="80%" ry="45%">
            <Stop offset="0%" stopColor="#10B981" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#133131" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="#133131" />
        <Rect width="100%" height="100%" fill="url(#worldTopGlow)" />
      </Svg>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backText}>← Hub</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <ItemSprite spritesheet="icons-1" frameIndex={0} displaySize={22} />
          <Text style={styles.title}>Expeditions</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {zoneList.map((zone) => {
          const unlocked        = isZoneUnlocked(zone);
          const isCleared       = !!state.progress[`${zone.id}Cleared`];
          const runsCount       = (state.progress.runsCompleted && state.progress.runsCompleted[zone.id]) || 0;
          const floorsCleared   = (state.progress.floorsCleared && state.progress.floorsCleared[zone.id]) || 0;
          const floorCount      = zone.floorCount || 10;
          const nextFloor       = Math.min(floorsCleared + 1, floorCount);
          const grad = ZONE_GRADIENTS[zone.id] || { start: '#171725', end: '#0B0B12', border: 'rgba(255,255,255,0.05)', accent: theme.COLORS.primary };

          return (
            <View
              key={zone.id}
              style={[
                styles.zoneCard,
                unlocked ? { borderColor: grad.accent } : { borderColor: 'rgba(255, 255, 255, 0.08)' },
                !unlocked && styles.zoneCardLocked,
                theme.SHADOWS.cardShadow
              ]}
            >
              {/* Dungeon Banner Image (Full Card Background) */}
              <Image
                source={DUNGEON_BANNERS[zone.id]}
                style={styles.bannerImage}
                resizeMode="cover"
              />

              {/* Dark gradient overlay for readability, keeping background artwork highly visible */}
              <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                <Defs>
                  <LinearGradient id={`overlayGrad_${zone.id}`} x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#000000" stopOpacity="0.6" />
                    <Stop offset="50%" stopColor="#000000" stopOpacity="0.4" />
                    <Stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill={`url(#overlayGrad_${zone.id})`} />
              </Svg>

              {!unlocked && (
                <View style={styles.lockOverlay}>
                  <ItemSprite spritesheet="icons-map" frameIndex={49} displaySize={48} opacity={0.3} />
                </View>
              )}

              <View style={styles.cardBody}>
                {/* Top Content (Header, Badges, Description) */}
                <View style={styles.topContent}>
                  {/* Zone Header (Title) */}
                  <View style={styles.zoneHeader}>
                    <Text style={[styles.zoneName, styles.textWithShadow]} numberOfLines={1} ellipsizeMode="tail">{zone.name}</Text>
                    <View style={[styles.levelBadge, unlocked && { borderColor: `${grad.accent}40`, backgroundColor: `${grad.accent}10` }]}>
                      <Text style={[styles.levelBadgeText, unlocked && { color: grad.accent }]}>
                        Lv.{zone.minLevel}-{zone.maxLevel}
                      </Text>
                    </View>
                  </View>

                  {/* Status & Stats Badges Row */}
                  <View style={styles.badgeRow}>
                    {renderStatusBadge(unlocked, isCleared)}
                    {unlocked && (
                      <View style={styles.runsBadge}>
                        <ItemSprite spritesheet="icons-1" frameIndex={10} displaySize={11} />
                        <Text style={styles.runsBadgeText}>Runs: {runsCount}</Text>
                      </View>
                    )}
                    {unlocked && (
                      <View style={[styles.runsBadge, { borderColor: `${grad.accent}40`, backgroundColor: `${grad.accent}12` }]}>
                        <ItemSprite spritesheet="icons-1" frameIndex={0} displaySize={11} />
                        <Text style={[styles.runsBadgeText, { color: grad.accent }]}>
                          Zone {isCleared ? floorCount : nextFloor}/{floorCount}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Description */}
                  <Text style={[styles.zoneDescription, styles.textWithShadow]} numberOfLines={2} ellipsizeMode="tail">
                    {zone.description}
                  </Text>
                </View>

                {/* Action button at the bottom */}
                <TouchableOpacity
                  style={[
                    styles.beginButton,
                    unlocked ? { borderColor: grad.accent, backgroundColor: 'rgba(0, 0, 0, 0.5)' } : styles.beginButtonDisabled
                  ]}
                  activeOpacity={0.8}
                  disabled={!unlocked}
                  onPress={() => navigation.navigate('DungeonFloor', { zoneId: zone.id })}
                >
                  {unlocked ? (
                    <>
                      <ItemSprite spritesheet="icons-map" frameIndex={136} displaySize={26} />
                      <Text style={[styles.beginButtonText, { color: grad.accent }]}>
                        {isCleared ? "View Zones" : "Enter Region"}
                      </Text>
                    </>
                  ) : (
                    <>
                      <ItemSprite spritesheet="icons-map" frameIndex={49} displaySize={20} opacity={0.5} />
                      <Text style={[styles.beginButtonText, styles.beginButtonTextDisabled]}>
                        Locked
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================
const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#133131' },
  scrollContainer: { flex: 1 },
  scroll:          { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  // Header (shared hub style)
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.04)' },
  backButton:   { width: 70, paddingVertical: 6, justifyContent: 'center' },
  backText:     { fontFamily: 'Jersey10-Regular', color: '#D4A754', fontSize: 16, letterSpacing: 0.5 },
  titleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  title:        { fontFamily: 'Jersey10-Regular', fontSize: 20, color: '#F8FAFC', letterSpacing: 0.8, textAlign: 'center' },
  headerSpacer: { width: 70 },

  // Zone cards
  zoneCard:         { width: '100%', aspectRatio: 600 / 296, borderRadius: 20, marginBottom: 24, position: 'relative', overflow: 'hidden', borderWidth: 3, borderColor: theme.COLORS.candleGold, backgroundColor: theme.COLORS.voidNavy },
  zoneCardLocked:   { opacity: 0.35 },
  lockOverlay:      { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.65)' },
  lockIcon:         { fontSize: 48, opacity: 0.4 },
  bannerImage:      { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  
  cardBody:         { ...StyleSheet.absoluteFillObject, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, flexDirection: 'column', justifyContent: 'space-between', zIndex: 2 },
  topContent:       { gap: 6 },
  
  zoneHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  zoneName:         { ...theme.FONTS.heading, color: '#F8FAFC', fontSize: 18 },
  textWithShadow:   { textShadowColor: 'rgba(0, 0, 0, 0.95)', textShadowOffset: { width: 0, height: 1.5 }, textShadowRadius: 3.5 },
  levelBadge:       { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  levelBadgeText:   { ...theme.FONTS.tiny, color: theme.COLORS.textDim, fontWeight: 'bold', fontSize: 11 },
  
  // Status & runs badge row
  badgeRow:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  statusBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusBadgeLocked:     { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' },
  statusBadgeCleared:    { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.22)' },
  
  statusBadgeTextLocked:     { ...theme.FONTS.tiny, color: theme.COLORS.textDim, fontWeight: 'bold', fontSize: 10 },
  statusBadgeTextCleared:    { ...theme.FONTS.tiny, color: theme.COLORS.success, fontWeight: 'bold', fontSize: 10 },
  
  runsBadge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, backgroundColor: 'rgba(251, 191, 36, 0.06)', borderColor: 'rgba(251, 191, 36, 0.18)', flexDirection: 'row', alignItems: 'center', gap: 4 },
  runsBadgeText:    { ...theme.FONTS.tiny, color: theme.COLORS.gold, fontWeight: 'bold', fontSize: 10 },
  
  zoneDescription:  { ...theme.FONTS.body, color: '#CFE0EE', marginVertical: 2, lineHeight: 15, fontSize: 11 },
 
  beginButton:      { borderRadius: 10, height: 46, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderWidth: 3, borderColor: theme.COLORS.candleGold, backgroundColor: theme.COLORS.candleGold, alignSelf: 'stretch' },
  beginButtonDisabled:     { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  beginButtonText:         { fontFamily: 'Silkscreen-Regular', color: '#1A1200', fontWeight: 'bold', fontSize: 12, textAlign: 'center', textTransform: 'uppercase', zIndex: 2 },
  beginButtonTextDisabled: { color: 'rgba(255,255,255,0.25)' },
});
