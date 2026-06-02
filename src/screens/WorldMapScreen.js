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
  Dimensions,
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
  Circle,
  Line,
  Polygon,
} from 'react-native-svg';

import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { ZONES } from '../data/zones';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Define specific gradient colors for each zone for rich visual aesthetics
const ZONE_GRADIENTS = {
  zone1: {
    start: '#0F1A0F', // Soggy Sewers - Swamp/Venom green tint
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


// ── SVG Zone Illustration Renderers ──────────────────────────────────────────
const renderZoneSVG = (zoneId, unlocked, grad) => {
  const startColor = unlocked ? grad.start : '#15151C';
  const endColor = unlocked ? grad.end : '#0B0B0E';
  const illustrationOpacity = unlocked ? 0.16 : 0.04;

  if (zoneId === 'zone1') {
    return (
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="sewerBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={startColor} />
            <Stop offset="100%" stopColor={endColor} />
          </LinearGradient>
          <LinearGradient id="metalPipe" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#6B7280" />
            <Stop offset="100%" stopColor="#374151" />
          </LinearGradient>
          <LinearGradient id="slimeRiver" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#10B981" />
            <Stop offset="50%" stopColor="#059669" />
            <Stop offset="100%" stopColor="#047857" />
          </LinearGradient>
        </Defs>
        
        <Rect width="400" height="240" fill="url(#sewerBg)" />
        
        <G opacity={illustrationOpacity}>
          {/* Wall brick lines distributed across the whole card height */}
          <Line x1="0" y1="40" x2="400" y2="40" stroke="#16231A" strokeWidth="1" strokeDasharray="6,8" />
          <Line x1="0" y1="85" x2="400" y2="85" stroke="#16231A" strokeWidth="1" strokeDasharray="6,8" />
          <Line x1="0" y1="130" x2="400" y2="130" stroke="#16231A" strokeWidth="1" strokeDasharray="6,8" />
          <Line x1="0" y1="175" x2="400" y2="175" stroke="#16231A" strokeWidth="1" strokeDasharray="6,8" />
          <Line x1="0" y1="220" x2="400" y2="220" stroke="#16231A" strokeWidth="1" strokeDasharray="6,8" />
          
          {/* Vertical brick lines */}
          <Line x1="120" y1="0" x2="120" y2="40" stroke="#16231A" strokeWidth="1" />
          <Line x1="280" y1="40" x2="280" y2="85" stroke="#16231A" strokeWidth="1" />
          <Line x1="80" y1="85" x2="80" y2="130" stroke="#16231A" strokeWidth="1" />
          <Line x1="220" y1="130" x2="220" y2="175" stroke="#16231A" strokeWidth="1" />
          <Line x1="340" y1="175" x2="340" y2="220" stroke="#16231A" strokeWidth="1" />
          
          {/* Network of Sewer Pipes covering the background */}
          {/* Horizontal Top Pipe */}
          <Rect x="0" y="20" width="400" height="10" fill="url(#metalPipe)" />
          {/* Horizontal Bottom-ish Pipe */}
          <Rect x="0" y="190" width="400" height="10" fill="url(#metalPipe)" />
          
          {/* Vertical Linking Pipe 1 */}
          <Rect x="80" y="20" width="12" height="180" fill="url(#metalPipe)" />
          {/* Vertical Linking Pipe 2 */}
          <Rect x="300" y="20" width="12" height="200" fill="url(#metalPipe)" />
          
          {/* Pipe joints */}
          <Rect x="78" y="50" width="16" height="6" fill="#4B5563" rx="1" />
          <Rect x="78" y="150" width="16" height="6" fill="#4B5563" rx="1" />
          <Rect x="298" y="80" width="16" height="6" fill="#4B5563" rx="1" />
          
          {/* Sewer Valve / Wheel in center (covers mid-card beautifully) */}
          <Circle cx="200" cy="115" r="22" stroke="#4B5563" strokeWidth="3" fill="none" />
          <Circle cx="200" cy="115" r="5" fill="#374151" />
          <Line x1="178" y1="115" x2="222" y2="115" stroke="#4B5563" strokeWidth="2.5" />
          <Line x1="200" y1="93" x2="200" y2="137" stroke="#4B5563" strokeWidth="2.5" />
          <Line x1="184" y1="99" x2="216" y2="131" stroke="#4B5563" strokeWidth="1.5" />
          <Line x1="184" y1="131" x2="216" y2="99" stroke="#4B5563" strokeWidth="1.5" />
          
          {/* Slime Ooze drips from pipes */}
          <Path d="M 80 56 Q 85 70 82 90 L 88 90 Q 85 70 90 56 Z" fill="#059669" />
          <Path d="M 300 86 Q 306 110 302 140 L 308 140 Q 306 110 310 86 Z" fill="#059669" />
          <Path d="M 200 20 C 200 28 203 28 203 20 Z" fill="#10B981" />
          <Path d="M 203 40 C 202 40 201 44 203 46 C 205 44 204 40 203 40 Z" fill="#10B981" />

          {/* Glowing Toxic Gas Bubbles at various heights */}
          <Circle cx="50" cy="60" r="3.5" fill="#34D399" />
          <Circle cx="160" cy="110" r="4.5" fill="#6EE7B7" />
          <Circle cx="130" cy="160" r="3" fill="#10B981" />
          <Circle cx="240" cy="130" r="5" fill="#34D399" />
          <Circle cx="350" cy="100" r="4" fill="#10B981" />
          <Circle cx="220" cy="210" r="3.5" fill="#6EE7B7" />
          
          {/* Green toxic river at bottom */}
          <Path d="M 0 215 Q 100 224 200 209 T 400 220 L 400 240 L 0 240 Z" fill="url(#slimeRiver)" />
        </G>
      </Svg>
    );
  }
  
  if (zoneId === 'zone2') {
    return (
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="gardenBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={startColor} />
            <Stop offset="100%" stopColor={endColor} />
          </LinearGradient>
          <LinearGradient id="stoneColumn" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#2E3A4D" />
            <Stop offset="50%" stopColor="#1E293B" />
            <Stop offset="100%" stopColor="#0F172A" />
          </LinearGradient>
          <LinearGradient id="vinePurple" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#D8B4FE" />
            <Stop offset="100%" stopColor="#7C3AED" />
          </LinearGradient>
          <LinearGradient id="vinePink" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#F472B6" />
            <Stop offset="100%" stopColor="#DB2777" />
          </LinearGradient>
        </Defs>
        
        <Rect width="400" height="240" fill="url(#gardenBg)" />
        
        <G opacity={illustrationOpacity}>
          {/* Ruin Pillars spanning the full card height */}
          {/* Left Column */}
          <Path d="M 35 240 L 35 0 L 52 0 L 52 240 Z" fill="url(#stoneColumn)" />
          <Line x1="35" y1="40" x2="52" y2="40" stroke="#090E17" strokeWidth="1" />
          <Line x1="35" y1="90" x2="52" y2="90" stroke="#090E17" strokeWidth="1" />
          <Line x1="35" y1="140" x2="52" y2="140" stroke="#090E17" strokeWidth="1" />
          <Line x1="35" y1="190" x2="52" y2="190" stroke="#090E17" strokeWidth="1" />
          <Path d="M 44 40 L 40 52 L 46 60" stroke="#090E17" strokeWidth="1.2" fill="none" />
          
          {/* Right Column */}
          <Path d="M 345 240 L 345 0 L 360 0 L 360 240 Z" fill="url(#stoneColumn)" />
          <Line x1="345" y1="60" x2="360" y2="60" stroke="#090E17" strokeWidth="1" />
          <Line x1="345" y1="120" x2="360" y2="120" stroke="#090E17" strokeWidth="1" />
          <Line x1="345" y1="180" x2="360" y2="180" stroke="#090E17" strokeWidth="1" />
          
          {/* Ivy growing on the columns */}
          <Path d="M 32 220 Q 48 180 34 140 T 50 80 T 36 20" fill="none" stroke="#047857" strokeWidth="2.5" />
          <Circle cx="35" cy="200" r="3" fill="#10B981" />
          <Circle cx="44" cy="160" r="3" fill="#059669" />
          <Circle cx="36" cy="110" r="2.5" fill="#10B981" />
          <Circle cx="46" cy="70" r="3" fill="#34D399" />

          {/* Winding glowing fantasy vines spanning the entire element */}
          <Path d="M -15 60 Q 100 200 200 80 T 415 160" fill="none" stroke="url(#vinePurple)" strokeWidth="3" />
          <Path d="M -15 170 Q 120 30 240 210 T 415 90" fill="none" stroke="url(#vinePink)" strokeWidth="1.8" />

          {/* Spiky thorns */}
          <Path d="M 75 88 L 71 83 L 78 87 Z" fill="#D8B4FE" />
          <Path d="M 160 115 L 165 109 L 163 116 Z" fill="#F472B6" />
          <Path d="M 280 148 L 284 154 L 278 151 Z" fill="#D8B4FE" />
          
          {/* Ancient Obelisk/Rune Stone in lower middle-right (adds center coverage) */}
          <Path d="M 255 185 L 268 135 L 282 135 L 295 185 Z" fill="url(#stoneColumn)" stroke="#4A5568" strokeWidth="1" />
          <Path d="M 270 148 L 280 148 M 275 142 L 275 168 M 270 158 L 280 168" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          <Circle cx="275" cy="130" r="2.5" fill="#F472B6" />
          <Circle cx="265" cy="150" r="1.5" fill="#D8B4FE" />
          <Circle cx="288" cy="160" r="2" fill="#D8B4FE" />
          
          {/* Magical Glowing Spores scattered globally */}
          <Circle cx="90" cy="50" r="3" fill="#A855F7" />
          <Circle cx="180" cy="150" r="2" fill="#F472B6" />
          <Circle cx="210" cy="40" r="4.5" fill="#10B981" />
          <Circle cx="290" cy="110" r="3" fill="#C084FC" />
          <Circle cx="310" cy="190" r="2.5" fill="#FBBF24" />
          <Circle cx="130" cy="90" r="3.5" fill="#34D399" />
          <Circle cx="250" cy="160" r="2" fill="#EC4899" />

          {/* Mysterious foliage at bottom */}
          <Path d="M 0 220 Q 90 212 180 222 T 360 215 T 400 219 L 400 240 L 0 240 Z" fill="#07110A" />
        </G>
      </Svg>
    );
  }

  if (zoneId === 'zone3') {
    return (
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="docksBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={startColor} />
            <Stop offset="100%" stopColor={endColor} />
          </LinearGradient>
          <LinearGradient id="wave1" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#0891B2" />
            <Stop offset="100%" stopColor="#042F2E" />
          </LinearGradient>
          <LinearGradient id="wave2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#06B6D4" />
            <Stop offset="100%" stopColor="#083344" />
          </LinearGradient>
        </Defs>
        
        <Rect width="400" height="240" fill="url(#docksBg)" />
        
        <G opacity={illustrationOpacity}>
          {/* Eerie Sea Moon */}
          <Circle cx="310" cy="45" r="16" fill="#06B6D4" opacity="0.3" />
          <Path d="M 305 33 A 14 14 0 1 0 318 52 A 11 11 0 1 1 305 33 Z" fill="#E2E8F0" />
          
          {/* Ship Mast silhouette spanning the height */}
          <Line x1="75" y1="15" x2="75" y2="210" stroke="#1E293B" strokeWidth="2.5" />
          <Line x1="50" y1="45" x2="100" y2="45" stroke="#1E293B" strokeWidth="1.5" />
          <Line x1="54" y1="85" x2="96" y2="85" stroke="#1E293B" strokeWidth="1.2" />
          <Line x1="58" y1="135" x2="92" y2="135" stroke="#1E293B" strokeWidth="1" />
          <Path d="M 70 40 L 80 40 L 82 35 L 68 35 Z" fill="#1E293B" />
          
          {/* Rigging lines */}
          <Line x1="75" y1="15" x2="40" y2="210" stroke="#1E293B" strokeWidth="0.5" />
          <Line x1="75" y1="15" x2="110" y2="210" stroke="#1E293B" strokeWidth="0.5" />
          <Line x1="75" y1="85" x2="45" y2="210" stroke="#1E293B" strokeWidth="0.5" />

          {/* Wooden Docks Pylons (Posts) & Ropes (covers mid-bottom beautifully) */}
          <Rect x="40" y="115" width="14" height="95" fill="#1E293B" rx="1" />
          <Polygon points="37,115 47,109 57,115" fill="#334155" />
          <Line x1="40" y1="130" x2="54" y2="130" stroke="#0891B2" strokeWidth="1.5" />
          <Line x1="40" y1="134" x2="54" y2="134" stroke="#0891B2" strokeWidth="1.5" />
          
          <Rect x="325" y="130" width="12" height="80" fill="#1E293B" rx="1" />
          <Polygon points="322,130 331,125 340,130" fill="#334155" />
          <Line x1="325" y1="145" x2="337" y2="145" stroke="#0891B2" strokeWidth="1.5" />
          <Line x1="325" y1="149" x2="337" y2="149" stroke="#0891B2" strokeWidth="1.5" />
          
          <Path d="M 47 132 Q 185 180 331 147" fill="none" stroke="#1E293B" strokeWidth="2.5" />
          <Path d="M 47 132 Q 185 180 331 147" fill="none" stroke="#06B6D4" strokeWidth="1" strokeDasharray="3,3" />

          {/* Sunken Anchor positioned on the right */}
          <G transform="translate(260, 90) scale(0.85)">
            <Rect x="18" y="5" width="3" height="34" fill="#334155" />
            <Circle cx="19.5" cy="3.5" r="4" stroke="#334155" strokeWidth="2" fill="none" />
            <Rect x="6" y="10" width="26" height="2" fill="#334155" />
            <Path d="M 5 30 C 5 44 35 44 35 30 C 35 33 31 37 20 37 C 9 37 5 33 5 30 Z" fill="#334155" />
            <Polygon points="3,30 7,30 5,26" fill="#334155" />
            <Polygon points="33,30 37,30 35,26" fill="#334155" />
          </G>

          {/* Deep Sea Bubbles distributed vertically */}
          <Circle cx="130" cy="50" r="2.5" fill="#06B6D4" />
          <Circle cx="210" cy="120" r="1.5" fill="#0891B2" />
          <Circle cx="150" cy="180" r="3" fill="#38BDF8" />
          <Circle cx="230" cy="70" r="2" fill="#06B6D4" />
          <Circle cx="340" cy="160" r="3.5" fill="#38BDF8" />
          <Circle cx="110" cy="130" r="1.5" fill="#0891B2" />

          {/* Layered ocean waves at bottom */}
          <Path d="M 0 205 Q 70 195 140 208 T 280 202 T 400 210 L 400 240 L 0 240 Z" fill="url(#wave1)" />
          <Path d="M 0 213 Q 90 221 170 207 T 330 217 T 400 213 L 400 240 L 0 240 Z" fill="url(#wave2)" />
        </G>
      </Svg>
    );
  }
  return null;
};

// ── Completion Status Badge Renderers ────────────────────────────────────────
const renderStatusBadge = (unlocked, isCleared) => {
  if (!unlocked) {
    return (
      <View style={[styles.statusBadge, styles.statusBadgeLocked]}>
        <Text style={styles.statusBadgeTextLocked}>🔒 LOCKED</Text>
      </View>
    );
  }
  if (isCleared) {
    return (
      <View style={[styles.statusBadge, styles.statusBadgeCleared]}>
        <Text style={styles.statusBadgeTextCleared}>🏆 COMPLETED</Text>
      </View>
    );
  }
  return null;
};

export default function WorldMapScreen({ navigation }) {
  const { state } = useGame();
  const zoneList = Object.values(ZONES);

  // ── Zone unlock helper ─────────────────────────────────────────────────────
  const isZoneUnlocked = (zone) => {
    if (!zone.unlockCondition) return true;
    return !!state.progress[zone.unlockCondition];
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Hub</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🗺️ World Map</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Zone Cards ─────────────────────────────────────────────────── */}
        {zoneList.map((zone) => {
          const unlocked        = isZoneUnlocked(zone);
          const isCleared       = !!state.progress[`${zone.id}Cleared`];
          const runsCount       = (state.progress.runsCompleted && state.progress.runsCompleted[zone.id]) || 0;
          const floorsCleared   = (state.progress.floorsCleared && state.progress.floorsCleared[zone.id]) || 0;
          const floorCount      = zone.floorCount || 10;
          const nextFloor       = Math.min(floorsCleared + 1, floorCount);
          const grad = ZONE_GRADIENTS[zone.id] || { start: '#171725', end: '#0B0B12', border: 'rgba(255,255,255,0.05)', accent: theme.COLORS.primary };

          return (
            <View key={zone.id} style={[styles.zoneCard, !unlocked && styles.zoneCardLocked, theme.SHADOWS.cardShadow]}>
              {/* Inset Background & Decorative Border Container */}
              <View style={styles.cardBackdropContainer}>
                {/* SVG Background Illustration & Gradient Backdrop (Combined) */}
                {renderZoneSVG(zone.id, unlocked, grad)}

                {/* Decorative inner border (framed inside container, offset by 1px to prevent clipping) */}
                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                  <Rect x="1" y="1" width="99.5%" height="99.5%" rx={14} fill="none" stroke={unlocked ? grad.border : 'rgba(255,255,255,0.02)'} strokeWidth="1.5" />
                </Svg>
              </View>

              {!unlocked && (
                <View style={styles.lockOverlay}>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              )}

              <View style={styles.cardBody}>
                {/* Zone Header (Title & Level range) */}
                <View style={styles.zoneHeader}>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                  <View style={[styles.levelBadge, unlocked && { borderColor: `${grad.accent}40`, backgroundColor: `${grad.accent}10` }]}>
                    <Text style={[styles.levelBadgeText, unlocked && { color: grad.accent }]}>
                      Lv.{zone.minLevel}-{zone.maxLevel}
                    </Text>
                  </View>
                </View>

                {/* Status Badges Row */}
                <View style={styles.badgeRow}>
                  {renderStatusBadge(unlocked, isCleared)}
                  {unlocked && (
                    <View style={styles.runsBadge}>
                      <Text style={styles.runsBadgeText}>⚔️ Runs: {runsCount}</Text>
                    </View>
                  )}
                  {unlocked && (
                    <View style={[styles.runsBadge, { borderColor: `${grad.accent}40`, backgroundColor: `${grad.accent}12` }]}>
                      <Text style={[styles.runsBadgeText, { color: grad.accent }]}>
                        🗺️ Floor {isCleared ? floorCount : nextFloor}/{floorCount}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Description */}
                <Text style={styles.zoneDescription}>{zone.description}</Text>

                {/* Action button */}
                <TouchableOpacity
                  style={[styles.beginButton, !unlocked && styles.beginButtonDisabled, unlocked && { backgroundColor: grad.accent }]}
                  activeOpacity={0.8}
                  disabled={!unlocked}
                  onPress={() => navigation.navigate('DungeonFloor', { zoneId: zone.id })}
                >
                  <Text style={[styles.beginButtonText, !unlocked && styles.beginButtonTextDisabled]}>
                    {unlocked
                      ? isCleared
                        ? '🗺️  View Floors'
                        : `🗺️  Enter — Floor ${nextFloor}`
                      : '🔒  Locked'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

    </SafeAreaView>
  );
}

// =============================================================================
// Styles
// =============================================================================
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#07070A' },
  scroll:      { padding: theme.SPACING.md, paddingBottom: theme.SPACING.xl * 2 },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: '#07070A' },
  backButton:   { paddingVertical: theme.SPACING.xs, paddingRight: theme.SPACING.sm, minHeight: 40, justifyContent: 'center' },
  backText:     { ...theme.FONTS.body, color: theme.COLORS.primary, fontWeight: 'bold' },
  title:        { ...theme.FONTS.title, color: theme.COLORS.textBright, textAlign: 'center' },
  headerSpacer: { width: 44 },

  // Zone cards
  zoneCard:         { borderRadius: 20, marginBottom: 24, position: 'relative', overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.03)', minHeight: 180 },
  zoneCardLocked:   { opacity: 0.35 },
  lockOverlay:      { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.65)' },
  lockIcon:         { fontSize: 48, opacity: 0.4 },
  
  cardBackdropContainer: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: 15,
    overflow: 'hidden',
  },
  
  cardBody:         { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 18, zIndex: 2 },
  
  zoneHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  zoneName:         { ...theme.FONTS.heading, color: theme.COLORS.textBright, fontWeight: 'bold', fontSize: 21 },
  levelBadge:       { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  levelBadgeText:   { ...theme.FONTS.tiny, color: theme.COLORS.textDim, fontWeight: 'bold', fontSize: 12 },
  
  // Status & runs badge row
  badgeRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  statusBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusBadgeLocked:     { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' },
  statusBadgeCleared:    { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.22)' },
  
  statusBadgeTextLocked:     { ...theme.FONTS.tiny, color: theme.COLORS.textDim, fontWeight: 'bold', fontSize: 11 },
  statusBadgeTextCleared:    { ...theme.FONTS.tiny, color: theme.COLORS.success, fontWeight: 'bold', fontSize: 11 },
  
  runsBadge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, backgroundColor: 'rgba(251, 191, 36, 0.06)', borderColor: 'rgba(251, 191, 36, 0.18)' },
  runsBadgeText:    { ...theme.FONTS.tiny, color: theme.COLORS.gold, fontWeight: 'bold', fontSize: 11 },
  
  zoneDescription:  { ...theme.FONTS.body, color: '#94A3B8', marginBottom: 16, lineHeight: 21, fontSize: 14 },

  beginButton:      { borderRadius: 14, paddingVertical: 14, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  beginButtonDisabled:     { backgroundColor: theme.COLORS.buttonDisabled },
  beginButtonText:         { ...theme.FONTS.body, color: '#07070A', fontWeight: 'bold', letterSpacing: 0.5, fontSize: 16 },
  beginButtonTextDisabled: { color: theme.COLORS.textDim },

});
