/**
 * =============================================================================
 * CampScreen.js — Home Base Hub (Redesigned Premium UI)
 * =============================================================================
 *
 * The home base hub serves as the premium gateway dashboard. It highlights Mochi's
 * progress, equipment stats summary, gold, and links to all primary menus.
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
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Circle } from 'react-native-svg';

// ── Project imports ──────────────────────────────────────────────────────────
import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { getXpForLevel } from '../logic/progressionEngine';
import AnimatedSprite from '../components/AnimatedSprite';
import { HERO_SPRITE, CAMP_CASTLE } from '../constants/sprites';
import { SKILLS } from '../data/skills';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Nav button metadata ────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: 'WorldMap',  icon: '🗺️', label: 'World Map',  sub: 'Conquer Zones',  color: '#D4A754' },
  { key: 'Shop',      icon: '🛒', label: 'Shop & Forge', sub: 'Buy & Craft',    color: '#10B981' },
  { key: 'SkillTree', icon: '🌟', label: 'Skill Tree', sub: 'Unlock Talents',  color: '#06B6D4' },
  { key: 'Inventory', icon: '🎒', label: 'Bag & Gear',  sub: 'Manage Loadout',  color: '#EC4899' },
];

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

  // Calculate Mochi's primary path for cozy visual title
  const primaryPath = React.useMemo(() => {
    let ironPawCount = 0;
    let stonefurCount = 0;
    let shadowClawCount = 0;

    (hero.unlockedSkills || []).forEach(skillId => {
      const skill = SKILLS[skillId];
      if (skill) {
        if (skill.path === 'ironPaw') ironPawCount++;
        else if (skill.path === 'stonefur') stonefurCount++;
        else if (skill.path === 'shadowClaw') shadowClawCount++;
      }
    });

    const max = Math.max(ironPawCount, stonefurCount, shadowClawCount);
    if (max === 0) return 'Novice Adventurer 🐱';
    if (max === ironPawCount) return 'Iron Paw Path 🐾';
    if (max === stonefurCount) return 'Stonefur Path 🪨';
    return 'Shadow Claw Path 🌙';
  }, [hero.unlockedSkills]);

  // ── Daily Reward Claiming Logic ───────────────────────────────────────────
  const hasClaimedToday = React.useCallback(() => {
    if (!state.progress.lastDailyClaim) return false;
    const lastClaimDate = new Date(state.progress.lastDailyClaim);
    const nowDate = new Date();
    return (
      lastClaimDate.getDate() === nowDate.getDate() &&
      lastClaimDate.getMonth() === nowDate.getMonth() &&
      lastClaimDate.getFullYear() === nowDate.getFullYear()
    );
  }, [state.progress.lastDailyClaim]);

  const handleDailyRewardPress = () => {
    if (hasClaimedToday()) {
      Alert.alert(
        "🎁 Already Claimed",
        "You already claimed your daily reward today. Come back tomorrow for more potions and gems! 🐱",
        [{ text: "Okay" }]
      );
      return;
    }

    // Scale rewards based on level
    const lvl = hero.level || 1;
    const goldReward = 100 + lvl * 50;
    const gemsReward = 10 + lvl * 5;
    
    // Potions: health potions scaled, mega potions starting at lvl 3
    const healthPotionQty = 1 + Math.floor(lvl / 5);
    const megaPotionQty = lvl >= 3 ? 1 : 0;
    
    const consumablesReward = {};
    if (healthPotionQty > 0) consumablesReward['health_potion'] = healthPotionQty;
    if (megaPotionQty > 0) consumablesReward['mega_potion'] = megaPotionQty;

    // Dispatch state update
    dispatch({
      type: 'CLAIM_DAILY_REWARD',
      payload: {
        gold: goldReward,
        gems: gemsReward,
        consumables: consumablesReward,
      }
    });

    // Success alert
    Alert.alert(
      "🎁 Daily Reward Claimed!",
      `Level ${lvl} Rewards Granted:\n\n` +
      `💰 +${goldReward} Gold\n` +
      `💎 +${gemsReward} Gems\n` +
      (healthPotionQty > 0 ? `🧪 +${healthPotionQty} Health Potion${healthPotionQty > 1 ? 's' : ''}\n` : '') +
      (megaPotionQty > 0 ? `🧪 +${megaPotionQty} Mega Potion${megaPotionQty > 1 ? 's' : ''}\n` : '') +
      `\nCome back tomorrow for more!`,
      [{ text: "Meow-tastic!" }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            HERO CARD — Premium Split Layout (Cozy & Compact)
            ═══════════════════════════════════════════════════════════════════ */}
        <View style={[styles.heroBanner, theme.SHADOWS.cardShadow]}>
          {/* SVG Gradient Background Wrapper (ensures absolute positioning alignment) */}
          <View style={StyleSheet.absoluteFill}>
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#171725" stopOpacity="0.95" />
                  <Stop offset="100%" stopColor="#0B0B12" stopOpacity="1" />
                </LinearGradient>
                <RadialGradient id="avatarGlow" cx="22%" cy="50%" rx="35%" ry="60%">
                  <Stop offset="0%" stopColor="#D4A754" stopOpacity="0.15" />
                  <Stop offset="100%" stopColor="#D4A754" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#cardGrad)" rx={20} />
              <Rect width="100%" height="100%" fill="url(#avatarGlow)" rx={20} />
            </Svg>
          </View>

          {/* Decorative SVG Corner Borders */}
          <View style={styles.cardBorderOverlay}>
            <Svg width="100%" height="100%">
              <Rect x="6" y="6" width="96%" height="91%" rx={14} fill="none" stroke="rgba(212, 167, 84, 0.08)" strokeWidth="1" />
            </Svg>
          </View>

          {/* Ambient Castle Logo (pushed to background watermark) */}
          <Image
            source={CAMP_CASTLE}
            style={styles.campBg}
            resizeMode="contain"
          />

          {/* Floating Currencies Display Chip Row */}
          <View style={styles.currencyRow}>
            <View style={styles.goldChip}>
              <Text style={styles.goldChipText}>💰 {hero.gold}</Text>
            </View>
            <View style={[styles.goldChip, styles.gemsChip]}>
              <Text style={styles.gemsChipText}>💎 {hero.gems || 0}</Text>
            </View>
          </View>

          {/* Left Column: Avatar & Level Badge */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <AnimatedSprite
                {...HERO_SPRITE.idle}
                fps={8}
                loop={true}
                displaySize={64}
              />
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{hero.level}</Text>
            </View>
          </View>

          {/* Right Column: Identity & Stacked Pill Gauges */}
          <View style={styles.heroDetails}>
            <View style={styles.identityRow}>
              <Text style={styles.heroName}>{hero.name}</Text>
              <Text style={styles.heroPathText}>{primaryPath}</Text>
            </View>

            <View style={styles.gaugesStack}>
              {/* HP Bar */}
              <View style={styles.gaugeRow}>
                <Text style={styles.gaugeLabel}>HP</Text>
                <View style={styles.gaugeTrack}>
                  <View
                    style={[
                      styles.gaugeFill,
                      styles.hpFillGrad,
                      { width: `${Math.min(hpProgress * 100, 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.gaugeValue}>{hero.hp}/{hero.maxHp}</Text>
              </View>

              {/* XP Bar */}
              <View style={styles.gaugeRow}>
                <Text style={styles.gaugeLabel}>XP</Text>
                <View style={styles.gaugeTrack}>
                  <View
                    style={[
                      styles.gaugeFill,
                      styles.xpFillGrad,
                      { width: `${Math.min(xpProgress * 100, 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.gaugeValue}>{xpIntoLevel}/{xpNeeded}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════
            ENTER DUNGEON — Premium Gilded Action Banner
            ═══════════════════════════════════════════════════════════════════ */}
        <TouchableOpacity
          style={[styles.dungeonCTA, theme.SHADOWS.glowPrimary]}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('WorldMap')}
        >
          {/* Metallic Gold SVG Gradient */}
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <LinearGradient id="ctaGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="#F9D99A" />
                <Stop offset="50%" stopColor="#D4A754" />
                <Stop offset="100%" stopColor="#A37E33" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#ctaGrad)" rx={16} />
          </Svg>

          <View style={styles.ctaInner}>
            <View style={styles.ctaIconContainer}>
              <Text style={styles.ctaIcon}>⚔️</Text>
            </View>
            <View style={styles.ctaTextBlock}>
              <Text style={styles.ctaTitle}>Enter the Depths</Text>
              <Text style={styles.ctaSub}>Choose a zone and begin your run</Text>
            </View>
            <Text style={styles.ctaArrow}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Daily Reward Button */}
        <TouchableOpacity
          style={[
            styles.dailyRewardBtn,
            hasClaimedToday() ? styles.dailyRewardBtnClaimed : styles.dailyRewardBtnActive,
            !hasClaimedToday() && theme.SHADOWS.glowPrimary,
          ]}
          activeOpacity={0.8}
          onPress={handleDailyRewardPress}
        >
          <View style={styles.dailyRewardInner}>
            <Text style={styles.dailyRewardEmoji}>🎁</Text>
            <View style={styles.dailyRewardTexts}>
              <Text style={[
                styles.dailyRewardTitle,
                hasClaimedToday() ? styles.dailyRewardTitleClaimed : styles.dailyRewardTitleActive
              ]}>
                {hasClaimedToday() ? "Daily Reward Claimed" : "Claim Daily Reward"}
              </Text>
              <Text style={styles.dailyRewardSub}>
                {hasClaimedToday()
                  ? "You already claimed your daily reward, come back tomorrow for more!"
                  : `Potions and gems scaling with Level ${hero.level}`}
              </Text>
            </View>
            {!hasClaimedToday() && <Text style={styles.dailyRewardArrow}>›</Text>}
          </View>
        </TouchableOpacity>

        {/* ═══════════════════════════════════════════════════════════════════
            NAVIGATION GRID — Glassmorphic Grid Layout
            ═══════════════════════════════════════════════════════════════════ */}
        <View style={styles.navGrid}>
          {NAV_ITEMS.map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.navCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(item.key)}
            >
              <View style={styles.navHeaderRow}>
                <View style={[styles.navIconContainer, { backgroundColor: `${item.color}15` }]}>
                  <Text style={[styles.navIcon, { color: item.color }]}>{item.icon}</Text>
                </View>
                <Text style={styles.navCardArrow}>→</Text>
              </View>
              <Text style={styles.navLabel}>{item.label}</Text>
              <Text style={styles.navSub}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ═══════════════════════════════════════════════════════════════════
            DEV TOOLS — Reset button
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
  container: {
    flex: 1,
    backgroundColor: '#07070A',
  },
  scroll: {
    paddingBottom: 40,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  cardBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },

  /* ═══ Hero Card ══════════════════════════════════════════════════════════ */
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.12)',
  },
  campBg: {
    position: 'absolute',
    bottom: 4,
    right: 8,
    width: 80,
    height: 70,
    opacity: 0.04,
  },
  goldChip: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 3,
  },
  goldChipText: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 11,
    color: '#FBBF24',
  },
  avatarContainer: {
    position: 'relative',
    width: 74,
    height: 74,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1.5,
    borderColor: '#D4A754',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D4A754',
    borderWidth: 1.5,
    borderColor: '#171725',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  levelBadgeText: {
    fontFamily: 'System',
    color: '#1A1200',
    fontWeight: '900',
    fontSize: 9,
    textAlign: 'center',
  },
  heroDetails: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  identityRow: {
    marginBottom: 8,
  },
  heroName: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 18,
    color: '#F8FAFC',
    letterSpacing: 0.3,
  },
  heroPathText: {
    fontFamily: 'System',
    fontSize: 10,
    color: '#D4A754',
    fontWeight: 'bold',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gaugesStack: {
    gap: 6,
  },
  gaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gaugeLabel: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: '900',
    color: '#707F94',
    width: 18,
  },
  gaugeTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 4,
  },
  hpFillGrad: {
    backgroundColor: '#EF4444',
  },
  xpFillGrad: {
    backgroundColor: '#3B82F6',
  },
  gaugeValue: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#F8FAFC',
    width: 44,
    textAlign: 'right',
  },

  /* ═══ Dungeon CTA ══════════════════════════════════════════════════════════ */
  dungeonCTA: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  ctaIconContainer: {
    backgroundColor: 'rgba(26, 18, 0, 0.12)',
    borderRadius: 12,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  ctaIcon: {
    fontSize: 22,
  },
  ctaTextBlock: {
    flex: 1,
  },
  ctaTitle: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 18,
    color: '#07070A',
    letterSpacing: 0.3,
  },
  ctaSub: {
    fontFamily: 'System',
    fontWeight: '600',
    fontSize: 12,
    color: 'rgba(7, 7, 10, 0.65)',
    marginTop: 1,
  },
  ctaArrow: {
    fontSize: 28,
    fontWeight: '400',
    color: 'rgba(7, 7, 10, 0.5)',
  },

  /* ═══ Navigation Grid ══════════════════════════════════════════════════════ */
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  navCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    position: 'relative',
  },
  navHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 20,
  },
  navCardArrow: {
    color: 'rgba(255,255,255,0.15)',
    fontSize: 16,
    fontWeight: 'bold',
  },
  navLabel: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 15,
    color: '#F8FAFC',
    marginBottom: 4,
  },
  navSub: {
    fontFamily: 'System',
    fontWeight: '400',
    fontSize: 11,
    color: '#707F94',
  },

  /* ═══ Reset Button ═════════════════════════════════════════════════════════ */
  resetBtn: {
    marginTop: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.02)',
  },
  resetBtnText: {
    fontFamily: 'System',
    fontWeight: '600',
    fontSize: 12,
    color: 'rgba(239, 68, 68, 0.5)',
  },

  /* ═══ Floating CurrenciesDisplay Chip Row ══════════════════════════════════ */
  currencyRow: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
    zIndex: 3,
  },
  gemsChip: {
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  gemsChipText: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 11,
    color: '#06B6D4',
  },

  /* ═══ Daily Reward Button ══════════════════════════════════════════════════ */
  dailyRewardBtn: {
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1.2,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  dailyRewardBtnActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.06)',
    borderColor: 'rgba(168, 85, 247, 0.25)',
  },
  dailyRewardBtnClaimed: {
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  dailyRewardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dailyRewardEmoji: {
    fontSize: 22,
    marginRight: 14,
  },
  dailyRewardTexts: {
    flex: 1,
  },
  dailyRewardTitle: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dailyRewardTitleActive: {
    color: '#A855F7',
  },
  dailyRewardTitleClaimed: {
    color: '#707F94',
  },
  dailyRewardSub: {
    fontFamily: 'System',
    fontWeight: '500',
    fontSize: 10,
    color: '#707F94',
    marginTop: 1,
  },
  dailyRewardArrow: {
    fontSize: 24,
    color: '#A855F7',
  },
});
