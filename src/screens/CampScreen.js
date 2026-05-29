/**
 * =============================================================================
 * CampScreen.js — Home Base Hub (Simplified)
 * =============================================================================
 *
 * The home base hub is a minimalistic, clean dashboard for Mochi. It serves
 * as the gateway to the adventure and sub-screens.
 *
 * =============================================================================
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Project imports ──────────────────────────────────────────────────────────
import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { getXpForLevel } from '../logic/progressionEngine';
import AnimatedSprite from '../components/AnimatedSprite';
import { HERO_SPRITE, CAMP_CASTLE } from '../constants/sprites';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Nav button metadata ────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: 'WorldMap',  icon: '🗺️', label: 'World Map',  sub: 'Explore zones' },
  { key: 'Shop',      icon: '🛒', label: 'Shop',       sub: 'Buy & craft' },
  { key: 'SkillTree', icon: '🌟', label: 'Skills',     sub: 'Spend SP' },
  { key: 'Inventory', icon: '🎒', label: 'Inventory',  sub: 'Manage items' },
];

// =============================================================================
// Component
// =============================================================================

export default function CampScreen({ navigation }) {
  const { state, dispatch } = useGame();
  const { hero } = state;

  // ── Derived values ────────────────────────────────────────────────────────
  const xpForCurrent   = getXpForLevel(hero.level);
  const xpForNext      = getXpForLevel(hero.level + 1);
  const xpIntoLevel    = hero.xp - xpForCurrent;
  const xpNeeded       = xpForNext - xpForCurrent;
  const xpProgress     = xpNeeded > 0 ? xpIntoLevel / xpNeeded : 1;
  const hpProgress     = hero.maxHp > 0 ? hero.hp / hero.maxHp : 1;

  // ════════════════════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            HERO BANNER — Compact hero introduction card
            ═══════════════════════════════════════════════════════════════════ */}
        <View style={styles.heroBanner}>
          {/* Ambient camp building behind the hero */}
          <Image
            source={CAMP_CASTLE}
            style={styles.campBg}
            resizeMode="contain"
          />

          {/* Animated hero sprite */}
          <View style={styles.heroSpriteContainer}>
            <AnimatedSprite
              {...HERO_SPRITE.idle}
              fps={8}
              loop={true}
              displaySize={80}
            />
          </View>

          {/* Name + Level tag */}
          <View style={styles.heroIdentity}>
            <Text style={styles.heroName}>{hero.name}</Text>
            <View style={styles.levelPill}>
              <Text style={styles.levelPillText}>LV {hero.level}</Text>
            </View>
          </View>

          {/* Resource bars inside the banner */}
          <View style={styles.barsContainer}>
            {/* HP Bar */}
            <View style={styles.barRow}>
              <Text style={styles.barIcon}>❤️</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    styles.hpFill,
                    { width: `${Math.min(hpProgress * 100, 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>{hero.hp}/{hero.maxHp}</Text>
            </View>
            {/* XP Bar */}
            <View style={styles.barRow}>
              <Text style={styles.barIcon}>⭐</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    styles.xpFill,
                    { width: `${Math.min(xpProgress * 100, 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>{xpIntoLevel}/{xpNeeded}</Text>
            </View>
          </View>

          {/* Gold display */}
          <View style={styles.goldContainer}>
            <Text style={styles.goldIcon}>💰</Text>
            <Text style={styles.goldAmount}>{hero.gold}</Text>
            <Text style={styles.goldLabel}>Gold</Text>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════
            ENTER DUNGEON — Primary CTA
            ═══════════════════════════════════════════════════════════════════ */}
        <TouchableOpacity
          style={styles.dungeonCTA}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('WorldMap')}
        >
          <View style={styles.ctaInner}>
            <Text style={styles.ctaIcon}>⚔️</Text>
            <View style={styles.ctaTextBlock}>
              <Text style={styles.ctaTitle}>Enter the Depths</Text>
              <Text style={styles.ctaSub}>Choose a zone and begin your run</Text>
            </View>
            <Text style={styles.ctaArrow}>›</Text>
          </View>
        </TouchableOpacity>

        {/* ═══════════════════════════════════════════════════════════════════
            NAVIGATION GRID — 2×2 quick access
            ═══════════════════════════════════════════════════════════════════ */}
        <View style={styles.navGrid}>
          {NAV_ITEMS.map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.navCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(item.key)}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text style={styles.navLabel}>{item.label}</Text>
              <Text style={styles.navSub}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ═══════════════════════════════════════════════════════════════════
            DEV TOOLS — Reset button (bottom)
            ═══════════════════════════════════════════════════════════════════ */}
        <TouchableOpacity
          style={styles.resetBtn}
          activeOpacity={0.7}
          onPress={() => {
            Alert.alert(
              'Reset Game Data',
              'Are you sure you want to nuke your save and start completely fresh?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset Data',
                  style: 'destructive',
                  onPress: () => dispatch({ type: 'RESET_GAME' }),
                },
              ]
            );
          }}
        >
          <Text style={styles.resetBtnText}>⚠️ Reset Save Data</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  /* ═══ Layout ═══════════════════════════════════════════════════════════════ */
  container: {
    flex: 1,
    backgroundColor: '#0E0E14',
  },
  scroll: {
    paddingBottom: 40,
  },

  /* ═══ Hero Banner ══════════════════════════════════════════════════════════ */
  heroBanner: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(26, 18, 0, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 167, 84, 0.1)',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 20,
  },
  campBg: {
    position: 'absolute',
    top: -10,
    right: -20,
    width: 140,
    height: 120,
    opacity: 0.05,
  },
  heroSpriteContainer: {
    marginBottom: 10,
    shadowColor: '#D4A754',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  heroIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  heroName: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 24,
    color: '#FFF5E6',
    letterSpacing: 0.5,
  },
  levelPill: {
    backgroundColor: 'rgba(212, 167, 84, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  levelPillText: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 11,
    color: '#D4A754',
    letterSpacing: 1,
  },

  /* ═══ Resource Bars ════════════════════════════════════════════════════════ */
  barsContainer: {
    width: '100%',
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barIcon: {
    fontSize: 12,
    width: 18,
    textAlign: 'center',
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  hpFill: {
    backgroundColor: '#E84545',
    shadowColor: '#E84545',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  xpFill: {
    backgroundColor: '#5B8FCF',
    shadowColor: '#5B8FCF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  barValue: {
    fontFamily: 'System',
    fontWeight: '600',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    width: 54,
    textAlign: 'right',
  },

  /* ═══ Gold ═════════════════════════════════════════════════════════════════ */
  goldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.12)',
  },
  goldIcon: {
    fontSize: 14,
  },
  goldAmount: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 16,
    color: '#FFD700',
  },
  goldLabel: {
    fontFamily: 'System',
    fontWeight: '500',
    fontSize: 11,
    color: 'rgba(255, 215, 0, 0.6)',
    marginLeft: 2,
  },

  /* ═══ Dungeon CTA ══════════════════════════════════════════════════════════ */
  dungeonCTA: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#D4A754',
    shadowColor: '#D4A754',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  ctaIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  ctaTextBlock: {
    flex: 1,
  },
  ctaTitle: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 18,
    color: '#1A1200',
    letterSpacing: 0.3,
  },
  ctaSub: {
    fontFamily: 'System',
    fontWeight: '500',
    fontSize: 12,
    color: 'rgba(26, 18, 0, 0.6)',
    marginTop: 2,
  },
  ctaArrow: {
    fontSize: 28,
    fontWeight: '300',
    color: 'rgba(26, 18, 0, 0.4)',
  },

  /* ═══ Navigation Grid ══════════════════════════════════════════════════════ */
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  navCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  navLabel: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 15,
    color: '#FFF5E6',
    marginBottom: 4,
  },
  navSub: {
    fontFamily: 'System',
    fontWeight: '400',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.35)',
  },

  /* ═══ Reset Button ═════════════════════════════════════════════════════════ */
  resetBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.12)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.02)',
  },
  resetBtnText: {
    fontFamily: 'System',
    fontWeight: '600',
    fontSize: 12,
    color: 'rgba(255, 68, 68, 0.45)',
  },
});
