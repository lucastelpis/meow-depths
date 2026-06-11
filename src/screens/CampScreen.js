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
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Circle, Path } from 'react-native-svg';

// ── Project imports ──────────────────────────────────────────────────────────
import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { getXpForLevel, calculateEffectiveStats } from '../logic/progressionEngine';
import AnimatedSprite from '../components/AnimatedSprite';
import ScreenLoader from '../components/ScreenLoader';
import Button from '../components/ui/Button';
import ResourceBar from '../components/ui/ResourceBar';
import { HERO_SPRITE } from '../constants/sprites';
import { SKILLS } from '../data/skills';
import ItemSprite from '../components/ItemSprite';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const BANNER_HEIGHT = BANNER_WIDTH * (1024 / 4128);

// Display size for Mochi's home screen avatar sprite (set higher to zoom in and crop padding)
const HERO_AVATAR_DISPLAY_SIZE = 90;

// ─── SVG Wood Texture Background Component ───────────────────────────────────
function WoodSpriteBackground({ width, height, borderRadius = 8, borderColor = '#4A3917' }) {
  return (
    <View style={{ ...StyleSheet.absoluteFillObject, borderRadius, overflow: 'hidden' }}>
      <Svg width={width} height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Solid wood brown background */}
        <Rect width="100" height="100" fill="#825324" />
        
        {/* Dark wood grain lines */}
        <Path d="M0,20 Q30,22 50,18 T100,20" stroke="#5C3A16" strokeWidth="2.5" fill="none" opacity="0.5" />
        <Path d="M0,50 Q45,46 70,54 T100,50" stroke="#5C3A16" strokeWidth="2.5" fill="none" opacity="0.5" />
        <Path d="M0,80 Q25,84 60,78 T100,80" stroke="#5C3A16" strokeWidth="2.5" fill="none" opacity="0.5" />
        
        {/* Light wood highlights */}
        <Path d="M0,35 Q20,32 55,38 T100,35" stroke="#A87543" strokeWidth="2" fill="none" opacity="0.3" />
        <Path d="M0,65 Q35,68 65,62 T100,65" stroke="#A87543" strokeWidth="2" fill="none" opacity="0.3" />
        
        {/* Outer border */}
        <Rect x="1" y="1" width="98" height="98" stroke={borderColor} strokeWidth="3" fill="none" rx={5} />
      </Svg>
    </View>
  );
}

export default function CampScreen({ navigation }) {
  const { state, dispatch } = useGame();
  const { hero } = state;

  // ── State for Stat Allocation Modal ───────────────────────────────────────
  const [showStatModal, setShowStatModal] = React.useState(false);
  const [tempStrAlloc, setTempStrAlloc] = React.useState(0);
  const [tempAgiAlloc, setTempAgiAlloc] = React.useState(0);
  const [tempVitAlloc, setTempVitAlloc] = React.useState(0);

  const remainingPoints = (hero.statPoints || 0) - (tempStrAlloc + tempAgiAlloc + tempVitAlloc);
  const previewStr = (hero.strength || 10) + tempStrAlloc;
  const previewAgi = (hero.agility || 10) + tempAgiAlloc;
  const previewVit = (hero.vitality || 10) + tempVitAlloc;

  const effectiveStats = calculateEffectiveStats(hero);
  const effectiveMaxHp = effectiveStats.maxHp;

  const previewMaxHp = effectiveMaxHp + tempVitAlloc * 5;
  const previewAttack = effectiveStats.attack + tempStrAlloc * 1;
  const previewDefence = effectiveStats.defence;
  const previewCritChance = effectiveStats.critChance + tempAgiAlloc * 0.005;
  const previewDodge = effectiveStats.dodge + tempAgiAlloc * 0.005;

  const showControls = (hero.statPoints || 0) > 0;

  const adjustStat = (statType, amount) => {
    if (statType === 'str') {
      if (amount > 0 && remainingPoints > 0) {
        setTempStrAlloc(prev => prev + 1);
      } else if (amount < 0 && tempStrAlloc > 0) {
        setTempStrAlloc(prev => prev - 1);
      }
    } else if (statType === 'agi') {
      if (amount > 0 && remainingPoints > 0) {
        setTempAgiAlloc(prev => prev + 1);
      } else if (amount < 0 && tempAgiAlloc > 0) {
        setTempAgiAlloc(prev => prev - 1);
      }
    } else if (statType === 'vit') {
      if (amount > 0 && remainingPoints > 0) {
        setTempVitAlloc(prev => prev + 1);
      } else if (amount < 0 && tempVitAlloc > 0) {
        setTempVitAlloc(prev => prev - 1);
      }
    }
  };

  const handleConfirmAllocation = () => {
    if (tempStrAlloc + tempAgiAlloc + tempVitAlloc === 0) {
      setShowStatModal(false);
      return;
    }
    dispatch({
      type: 'ALLOCATE_STAT_POINTS',
      payload: {
        strInc: tempStrAlloc,
        agiInc: tempAgiAlloc,
        vitInc: tempVitAlloc,
      },
    });
    setShowStatModal(false);
  };

  const handleOpenStatModal = () => {
    setTempStrAlloc(0);
    setTempAgiAlloc(0);
    setTempVitAlloc(0);
    setShowStatModal(true);
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const xpForCurrent   = getXpForLevel(hero.level);
  const xpForNext      = getXpForLevel(hero.level + 1);
  const xpIntoLevel    = hero.xp - xpForCurrent;
  const xpNeeded       = xpForNext - xpForCurrent;

  // Calculate Mochi's primary path for cozy visual title
  const primaryPath = React.useMemo(() => {
    let ironPawCount = 0;
    let stonefurCount = 0;
    let shadowClawCount = 0;

    Object.keys(hero.unlockedSkills || {}).forEach(skillId => {
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

  // ── Animation for Daily Reward Button Pulse ───────────────────────────────
  const pulseAnim = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    let anim;
    if (!hasClaimedToday()) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      );
      anim.start();
    } else {
      pulseAnim.setValue(0.3);
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [state.progress.lastDailyClaim, hasClaimedToday]);

  const borderPulseColor = pulseAnim.interpolate({
    inputRange: [0.3, 1],
    outputRange: ['rgba(212, 167, 84, 0.2)', 'rgba(212, 167, 84, 0.95)'],
  });
  
  const bgPulseColor = pulseAnim.interpolate({
    inputRange: [0.3, 1],
    outputRange: ['rgba(36, 26, 12, 0.85)', 'rgba(60, 44, 20, 0.95)'],
  });

  const glowShadowRadius = pulseAnim.interpolate({
    inputRange: [0.3, 1],
    outputRange: [2, 12],
  });

  const handleDailyRewardPress = () => {
    if (hasClaimedToday()) {
      Alert.alert(
        "🎁 Already Claimed",
        "You already claimed your daily reward today. Come back tomorrow for more potions and gold! 🐱",
        [{ text: "Okay" }]
      );
      return;
    }

    const isFirstClaim = !state.progress.lastDailyClaim;

    // Scale rewards based on level
    const lvl = hero.level || 1;
    const goldReward = isFirstClaim ? 50 : 100 + lvl * 50;

    // Potions: health potions scaled, mega potions starting at lvl 3
    const healthPotionQty = isFirstClaim ? 3 : 1 + Math.floor(lvl / 5);
    const megaPotionQty = isFirstClaim ? 0 : (lvl >= 3 ? 1 : 0);

    const consumablesReward = {};
    if (healthPotionQty > 0) consumablesReward['potion'] = healthPotionQty;
    if (megaPotionQty > 0) consumablesReward['super_potion'] = megaPotionQty;

    // Dispatch state update
    dispatch({
      type: 'CLAIM_DAILY_REWARD',
      payload: {
        gold: goldReward,
        consumables: consumablesReward,
      }
    });

    // Success alert
    Alert.alert(
      "🎁 Daily Reward Claimed!",
      `Level ${lvl} Rewards Granted:\n\n` +
      `💰 +${goldReward} Gold\n` +
      (healthPotionQty > 0 ? `🧪 +${healthPotionQty} Health Potion${healthPotionQty > 1 ? 's' : ''}\n` : '') +
      (megaPotionQty > 0 ? `🧪 +${megaPotionQty} Mega Potion${megaPotionQty > 1 ? 's' : ''}\n` : '') +
      `\nCome back tomorrow for more!`,
      [{ text: "Meow-tastic!" }]
    );
  };

  return (
    <ScreenLoader assets={[
      require('../../assets/top_banner.png'),
      HERO_SPRITE.idle.source,
      require('../../assets/sprites/items/icons-1.png'),
    ]}>
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            TOP BANNER
            ═══════════════════════════════════════════════════════════════════ */}
        <Image
          source={require('../../assets/top_banner.png')}
          style={[styles.hubBanner, theme.SHADOWS.cardShadow]}
          resizeMode="cover"
        />

        {/* ═══════════════════════════════════════════════════════════════════
            HERO CARD — Premium Split Layout (Cozy & Compact)
            ═══════════════════════════════════════════════════════════════════ */}
        <View style={[styles.heroBanner, theme.SHADOWS.cardShadow]}>
          {/* Warm gradient background — camp is a safe, cozy zone */}
          <View style={StyleSheet.absoluteFill}>
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#2A1E0A" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#1A1200" stopOpacity="1" />
                </LinearGradient>
                <RadialGradient id="avatarGlow" cx="22%" cy="50%" rx="35%" ry="60%">
                  <Stop offset="0%" stopColor="#E8A73A" stopOpacity="0.12" />
                  <Stop offset="100%" stopColor="#E8A73A" stopOpacity="0" />
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

          {/* Floating Currencies Display Chip Row */}
          <View style={styles.currencyRow}>
            <View style={styles.goldChip}>
              <Text style={styles.goldChipText}>💰 {hero.gold}</Text>
            </View>
          </View>

          {/* Left Column: Avatar & Level Badge */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <AnimatedSprite
                {...HERO_SPRITE.idle}
                fps={8}
                loop={true}
                displaySize={HERO_AVATAR_DISPLAY_SIZE}
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
              <ResourceBar
                variant="heroHp"
                label="HP"
                current={hero.hp}
                max={effectiveMaxHp}
              />

              {/* XP Bar */}
              <ResourceBar
                variant="xp"
                label="XP"
                current={xpIntoLevel}
                max={xpNeeded}
              />
            </View>

            {/* Stat Points / Inspect Stats Action Button */}
            <TouchableOpacity
              style={[
                styles.statPointsBtn,
                (hero.statPoints || 0) > 0 ? styles.statPointsBtnGlow : styles.statPointsBtnNormal
              ]}
              onPress={handleOpenStatModal}
              activeOpacity={0.8}
            >
              {(hero.statPoints || 0) > 0 ? (
                <View style={styles.glowDotContainer}>
                  <View style={styles.glowDot} />
                  <Text style={styles.statPointsBtnTextGlow}>
                    ✨ {hero.statPoints} Stat Point{(hero.statPoints || 0) > 1 ? 's' : ''} Available ›
                  </Text>
                </View>
              ) : (
                <Text style={styles.statPointsBtnTextNormal}>
                  📊 Inspect Base Stats ›
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>



        {/* Daily Reward Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleDailyRewardPress}
        >
          <Animated.View
            style={[
              styles.dailyRewardBtn,
              hasClaimedToday()
                ? styles.dailyRewardBtnClaimed
                : {
                    backgroundColor: bgPulseColor,
                    borderColor: borderPulseColor,
                    shadowColor: '#D4A754',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: pulseAnim,
                    shadowRadius: glowShadowRadius,
                    elevation: 4,
                  },
            ]}
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
                <Text style={[styles.dailyRewardSub, hasClaimedToday() && styles.dailyRewardSubClaimed]}>
                  {hasClaimedToday()
                    ? "You've already collected today's goods."
                    : "Click to collect your daily bonus!"}
                </Text>
              </View>
              {!hasClaimedToday() && <Text style={styles.dailyRewardArrow}>›</Text>}
            </View>
          </Animated.View>
        </TouchableOpacity>

        {/* ═══════════════════════════════════════════════════════════════════
            NAVIGATION GRID — Glassmorphic Grid Layout
            ═══════════════════════════════════════════════════════════════════ */}
        {/* ═══════════════════════════════════════════════════════════════════
            NAVIGATION GRID — Asymmetric Cozy Layout
            ═══════════════════════════════════════════════════════════════════ */}
        <View style={styles.navGrid}>
          {/* Enter Dungeons (WorldMap) — Full Width */}
          <TouchableOpacity
            style={styles.dungeonCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('WorldMap')}
          >
            <View style={styles.dungeonSpriteContainer}>
              <WoodSpriteBackground width={56} height={56} borderRadius={10} borderColor={theme.COLORS.candleGold} />
              <ItemSprite spritesheet="icons-1" frameIndex={30} displaySize={44} />
            </View>
            <View style={styles.dungeonTextContainer}>
              <Text style={styles.dungeonLabel}>ENTER DUNGEONS</Text>
              <Text style={styles.dungeonSub}>Conquer Zones</Text>
            </View>
          </TouchableOpacity>

          {/* Shopping, Skills, Loadout — Row of 3 */}
          <View style={styles.subButtonsRow}>
            {/* Shopping */}
            <TouchableOpacity
              style={styles.subCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Shop')}
            >
              <View style={styles.subSpriteContainer}>
                <WoodSpriteBackground width={44} height={44} borderRadius={8} borderColor="#4A3917" />
                <ItemSprite spritesheet="icons-1" frameIndex={29} displaySize={36} />
              </View>
              <Text style={styles.subCardLabel}>SHOPPING</Text>
              <Text style={styles.subCardSub}>Buy Stuff</Text>
            </TouchableOpacity>

            {/* Skills */}
            <TouchableOpacity
              style={styles.subCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('SkillTree')}
            >
              <View style={styles.subSpriteContainer}>
                <WoodSpriteBackground width={44} height={44} borderRadius={8} borderColor="#4A3917" />
                <ItemSprite spritesheet="icons-1" frameIndex={26} displaySize={36} />
              </View>
              <Text style={styles.subCardLabel}>SKILLS</Text>
              <Text style={styles.subCardSub}>Unlock Talents</Text>
            </TouchableOpacity>

            {/* Loadout */}
            <TouchableOpacity
              style={styles.subCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Loadout')}
            >
              <View style={styles.subSpriteContainer}>
                <WoodSpriteBackground width={44} height={44} borderRadius={8} borderColor="#4A3917" />
                <ItemSprite spritesheet="icons-1" frameIndex={18} displaySize={36} />
              </View>
              <Text style={styles.subCardLabel}>LOADOUT</Text>
              <Text style={styles.subCardSub}>Manage Gear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════
            DEV TOOLS — Reset button
            ═══════════════════════════════════════════════════════════════════ */}
        <Button
          title="Reset Save Data"
          icon="⚠️"
          variant="danger"
          style={{ marginTop: 12 }}
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
        />
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════════════
          STAT ALLOCATION MODAL
          ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showStatModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowStatModal(false)}
        >
          <Pressable style={styles.modalCard}>
            {/* Modal Ambient Glow */}
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id="modalCardGlow" cx="50%" cy="0%" rx="80%" ry="50%">
                  <Stop offset="0%" stopColor="#D4A754" stopOpacity="0.08" />
                  <Stop offset="100%" stopColor="#14161C" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="#14161C" rx={20} />
              <Rect width="100%" height="100%" fill="url(#modalCardGlow)" rx={20} />
              <Rect x="1" y="1" width="98%" height="98%" rx={19} fill="none" stroke="rgba(212, 167, 84, 0.15)" strokeWidth={1} />
            </Svg>

            <View style={styles.modalInner}>
              {/* Close Button */}
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowStatModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>📊 {hero.name || 'Mochi'}'s Base Stats</Text>
              
              {hero.statPoints > 0 ? (
                <Text style={styles.modalPointsText}>
                  Allocate your stat points to increase {hero.name || 'Mochi'}'s combat performance.
                </Text>
              ) : (
                <Text style={styles.modalPointsText}>
                  {hero.name || 'Mochi'} has allocated all stat points. Level up to earn more points!
                </Text>
              )}

              {/* Stat Points Available Badge */}
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsBadgeText}>
                  Stat Points Available: <Text style={styles.pointsBadgeNumber}>{remainingPoints}</Text>
                </Text>
              </View>

              {/* CORE ATTRIBUTES GRID */}
              <View style={styles.attributeGrid}>
                {/* Strength Card */}
                <View style={[styles.attributeCard, { borderColor: 'rgba(212, 167, 84, 0.25)' }]}>
                  <Text style={[styles.attributeLabel, { color: '#F9D99A' }]}>💪 STR</Text>
                  <Text style={styles.attributeValue}>
                    {hero.strength || 10}
                    {tempStrAlloc > 0 && <Text style={styles.attributeValueHighlight}> ➔ {previewStr}</Text>}
                  </Text>
                  
                  {showControls && (
                    <View style={styles.attributeControls}>
                      <TouchableOpacity
                        style={[styles.attrControlBtn, tempStrAlloc === 0 && styles.attrControlBtnDisabled]}
                        disabled={tempStrAlloc === 0}
                        onPress={() => adjustStat('str', -1)}
                      >
                        <Text style={styles.attrControlBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.attrAllocatedText}>{tempStrAlloc}</Text>
                      <TouchableOpacity
                        style={[styles.attrControlBtn, remainingPoints === 0 && styles.attrControlBtnDisabled]}
                        disabled={remainingPoints === 0}
                        onPress={() => adjustStat('str', 1)}
                      >
                        <Text style={styles.attrControlBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <Text style={styles.attributeSubLabel}>+1 ATK/pt</Text>
                </View>

                {/* Agility Card */}
                <View style={[styles.attributeCard, { borderColor: 'rgba(6, 182, 212, 0.25)' }]}>
                  <Text style={[styles.attributeLabel, { color: '#06B6D4' }]}>🏃 AGI</Text>
                  <Text style={styles.attributeValue}>
                    {hero.agility || 10}
                    {tempAgiAlloc > 0 && <Text style={styles.attributeValueHighlight}> ➔ {previewAgi}</Text>}
                  </Text>
                  
                  {showControls && (
                    <View style={styles.attributeControls}>
                      <TouchableOpacity
                        style={[styles.attrControlBtn, tempAgiAlloc === 0 && styles.attrControlBtnDisabled]}
                        disabled={tempAgiAlloc === 0}
                        onPress={() => adjustStat('agi', -1)}
                      >
                        <Text style={styles.attrControlBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.attrAllocatedText}>{tempAgiAlloc}</Text>
                      <TouchableOpacity
                        style={[styles.attrControlBtn, remainingPoints === 0 && styles.attrControlBtnDisabled]}
                        disabled={remainingPoints === 0}
                        onPress={() => adjustStat('agi', 1)}
                      >
                        <Text style={styles.attrControlBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <Text style={styles.attributeSubLabel}>+0.5% CRT/DDG</Text>
                </View>

                {/* Vitality Card */}
                <View style={[styles.attributeCard, { borderColor: 'rgba(92, 196, 137, 0.25)' }]}>
                  <Text style={[styles.attributeLabel, { color: '#5CC489' }]}>💚 VIT</Text>
                  <Text style={styles.attributeValue}>
                    {hero.vitality || 10}
                    {tempVitAlloc > 0 && <Text style={styles.attributeValueHighlight}> ➔ {previewVit}</Text>}
                  </Text>
                  
                  {showControls && (
                    <View style={styles.attributeControls}>
                      <TouchableOpacity
                        style={[styles.attrControlBtn, tempVitAlloc === 0 && styles.attrControlBtnDisabled]}
                        disabled={tempVitAlloc === 0}
                        onPress={() => adjustStat('vit', -1)}
                      >
                        <Text style={styles.attrControlBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.attrAllocatedText}>{tempVitAlloc}</Text>
                      <TouchableOpacity
                        style={[styles.attrControlBtn, remainingPoints === 0 && styles.attrControlBtnDisabled]}
                        disabled={remainingPoints === 0}
                        onPress={() => adjustStat('vit', 1)}
                      >
                        <Text style={styles.attrControlBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <Text style={styles.attributeSubLabel}>+5 HP</Text>
                </View>
              </View>

              {/* SECONDARY STAT BREAKDOWN TABLE */}
              <View style={styles.breakdownTable}>
                {/* Table Headers */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.headerLabel, styles.headerColStat]}>Stat Breakdown</Text>
                  <Text style={[styles.headerLabel, styles.headerColCurrent]}>Current</Text>
                  <Text style={[styles.headerLabel, styles.headerColNew]}>New</Text>
                </View>

                {/* Attack Row */}
                <View style={styles.tableRow}>
                  <View style={styles.colStat}>
                    <Text style={styles.statEmoji}>⚔️</Text>
                    <Text style={styles.statLabel}>Attack</Text>
                  </View>
                  <Text style={styles.colCurrent}>{effectiveStats.attack}</Text>
                  <Text style={[
                    styles.colNew, 
                    tempStrAlloc > 0 ? styles.colNewHighlighted : styles.colNewMuted
                  ]}>
                    {tempStrAlloc > 0 ? previewAttack : '—'}
                  </Text>
                </View>

                {/* Defense Row */}
                <View style={styles.tableRow}>
                  <View style={styles.colStat}>
                    <Text style={styles.statEmoji}>🛡️</Text>
                    <Text style={styles.statLabel}>Defense</Text>
                  </View>
                  <Text style={styles.colCurrent}>{effectiveStats.defence}</Text>
                  <Text style={[styles.colNew, styles.colNewMuted]}>—</Text>
                </View>

                {/* HP Row */}
                <View style={styles.tableRow}>
                  <View style={styles.colStat}>
                    <Text style={styles.statEmoji}>❤️</Text>
                    <Text style={styles.statLabel}>Max HP</Text>
                  </View>
                  <Text style={styles.colCurrent}>{effectiveMaxHp}</Text>
                  <Text style={[
                    styles.colNew, 
                    tempVitAlloc > 0 ? styles.colNewHighlighted : styles.colNewMuted
                  ]}>
                    {tempVitAlloc > 0 ? previewMaxHp : '—'}
                  </Text>
                </View>

                {/* Crit Row */}
                <View style={styles.tableRow}>
                  <View style={styles.colStat}>
                    <Text style={styles.statEmoji}>💥</Text>
                    <Text style={styles.statLabel}>Crit Chance</Text>
                  </View>
                  <Text style={styles.colCurrent}>{Math.round(effectiveStats.critChance * 1000) / 10}%</Text>
                  <Text style={[
                    styles.colNew, 
                    tempAgiAlloc > 0 ? styles.colNewHighlighted : styles.colNewMuted
                  ]}>
                    {tempAgiAlloc > 0 ? `${Math.round(previewCritChance * 1000) / 10}%` : '—'}
                  </Text>
                </View>

                {/* Dodge Row */}
                <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.colStat}>
                    <Text style={styles.statEmoji}>💨</Text>
                    <Text style={styles.statLabel}>Dodge Chance</Text>
                  </View>
                  <Text style={styles.colCurrent}>{Math.round(effectiveStats.dodge * 1000) / 10}%</Text>
                  <Text style={[
                    styles.colNew, 
                    tempAgiAlloc > 0 ? styles.colNewHighlighted : styles.colNewMuted
                  ]}>
                    {tempAgiAlloc > 0 ? `${Math.round(previewDodge * 1000) / 10}%` : '—'}
                  </Text>
                </View>
              </View>

              {/* ACTION BUTTONS */}
              {hero.statPoints > 0 ? (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[
                      styles.confirmBtn,
                      (tempStrAlloc + tempAgiAlloc + tempVitAlloc === 0) && styles.confirmBtnDisabled
                    ]}
                    disabled={tempStrAlloc + tempAgiAlloc + tempVitAlloc === 0}
                    onPress={handleConfirmAllocation}
                    activeOpacity={0.8}
                  >
                    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                      <Defs>
                        <LinearGradient id="confirmBtnGrad" x1="0" y1="0" x2="1" y2="0">
                          <Stop offset="0%" stopColor="#F9D99A" />
                          <Stop offset="100%" stopColor="#D4A754" />
                        </LinearGradient>
                      </Defs>
                      <Rect width="100%" height="100%" fill={(tempStrAlloc + tempAgiAlloc + tempVitAlloc === 0) ? "#333" : "url(#confirmBtnGrad)"} rx={10} />
                    </Svg>
                    <Text style={[
                      styles.confirmBtnText,
                      (tempStrAlloc + tempAgiAlloc + tempVitAlloc === 0) && { color: '#666' }
                    ]}>
                      Confirm Allocation
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.closeModalBtn}
                    onPress={() => setShowStatModal(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.closeModalBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
    </ScreenLoader>
  );
}

// =============================================================================
// Styles
// =============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.COLORS.hearthBlack,
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

  /* ═══ Top Banner ═════════════════════════════════════════════════════════ */
  hubBanner: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(232, 167, 58, 0.3)',
    overflow: 'hidden',
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
    borderColor: 'rgba(232, 167, 58, 0.3)',
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
    fontFamily: 'Silkscreen-Regular',
    fontWeight: 'normal',
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
    fontFamily: 'Silkscreen-Regular',
    color: '#1A1200',
    fontWeight: 'normal',
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
    ...theme.FONTS.display,
    fontSize: 18,
    color: theme.COLORS.ghostWhite,
  },
  heroPathText: {
    ...theme.FONTS.label,
    color: theme.COLORS.torchOrange,
    marginTop: 2,
  },
  gaugesStack: {
    gap: theme.SPACING.tight,
  },
  gaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gaugeLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    fontWeight: 'normal',
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
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    fontWeight: 'normal',
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
    fontFamily: 'PixelifySans-Medium',
    fontWeight: 'normal',
    fontSize: 18,
    color: '#07070A',
    letterSpacing: 0.3,
  },
  ctaSub: {
    fontFamily: 'PixelifySans-Medium',
    fontWeight: 'normal',
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
    width: '100%',
    marginBottom: 24,
  },
  dungeonCard: {
    width: '100%',
    backgroundColor: theme.COLORS.primary,
    borderColor: theme.COLORS.candleGold,
    borderWidth: 2,
    borderRadius: theme.BORDER_RADIUS.card,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  dungeonSpriteContainer: {
    padding: 6,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  dungeonTextContainer: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  dungeonLabel: {
    fontFamily: 'PixelifySans-Medium',
    fontWeight: 'normal',
    fontSize: 20,
    color: '#FFF3DA',
    textTransform: 'uppercase',
  },
  dungeonSub: {
    fontFamily: 'Silkscreen-Regular',
    fontWeight: 'normal',
    fontSize: 10,
    color: '#FFEED0',
    marginTop: 2,
  },
  subButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  subCard: {
    flex: 1,
    backgroundColor: '#F3E2BD',
    borderColor: '#4A3917',
    borderWidth: 2,
    borderRadius: theme.BORDER_RADIUS.card,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subSpriteContainer: {
    padding: 4,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  subCardLabel: {
    fontFamily: 'PixelifySans-Medium',
    fontWeight: 'normal',
    fontSize: 13,
    color: '#2A1A0C',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  subCardSub: {
    fontFamily: 'Silkscreen-Regular',
    fontWeight: 'normal',
    fontSize: 9,
    color: '#57431A',
    textAlign: 'center',
    marginTop: 2,
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

  /* ═══ Daily Reward Button ══════════════════════════════════════════════════ */
  dailyRewardBtn: {
    marginBottom: 20,
    borderRadius: theme.BORDER_RADIUS.button,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  dailyRewardBtnActive: {
    backgroundColor: '#241A0C', // Secondary button
    borderColor: '#4A3917',
  },
  dailyRewardBtnClaimed: {
    backgroundColor: '#1A1A1A', // Disabled button
    borderColor: '#2A2A2A',
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
    ...theme.FONTS.heading,
  },
  dailyRewardTitleActive: {
    color: '#F0E0BD', // Secondary text
  },
  dailyRewardTitleClaimed: {
    color: '#8A8A8A', // Better contrast disabled text
  },
  dailyRewardSub: {
    ...theme.FONTS.body,
    fontSize: 11,
    color: '#F0E0BD',
    opacity: 0.8,
    marginTop: 2,
  },
  dailyRewardSubClaimed: {
    color: '#8A8A8A',
  },
  dailyRewardArrow: {
    fontSize: 24,
    color: theme.COLORS.warmGlow,
  },

  /* ═══ Stat Point Buttons & Badge ══════════════════════════════════════════ */
  statPointsBtn: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  statPointsBtnGlow: {
    backgroundColor: 'rgba(212, 167, 84, 0.12)',
    borderColor: 'rgba(212, 167, 84, 0.4)',
  },
  statPointsBtnNormal: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  glowDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  glowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8A73A',
  },
  statPointsBtnTextGlow: {
    fontFamily: 'Silkscreen-Regular',
    color: '#D4A754',
    fontWeight: 'normal',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  statPointsBtnTextNormal: {
    fontFamily: 'Silkscreen-Regular',
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: 'normal',
    fontSize: 10,
    letterSpacing: 0.2,
  },

  /* ═══ Modal Styles ════════════════════════════════════════════════════════ */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#14161C',
  },
  modalInner: {
    padding: 24,
    position: 'relative',
    zIndex: 5,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalCloseText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 18,
    fontWeight: 'normal',
    color: '#F8FAFC',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  modalPointsText: {
    fontFamily: 'PixelifySans-Regular',
    fontSize: 12,
    color: '#707F94',
    lineHeight: 16,
    marginBottom: 16,
  },
  pointsBadge: {
    backgroundColor: 'rgba(212, 167, 84, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  pointsBadgeText: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: 'normal',
  },
  pointsBadgeNumber: {
    color: '#D4A754',
    fontWeight: 'bold',
  },
  attributeGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  attributeCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 105,
  },
  attributeLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    fontWeight: 'normal',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  attributeValue: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 16,
    fontWeight: 'normal',
    color: '#F8FAFC',
    marginVertical: 4,
  },
  attributeValueHighlight: {
    color: '#D4A754',
    fontWeight: 'bold',
  },
  attributeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 4,
  },
  attrControlBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(212, 167, 84, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attrControlBtnDisabled: {
    opacity: 0.2,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  attrControlBtnText: {
    fontFamily: 'PixelifySans-Medium',
    color: '#D4A754',
    fontSize: 14,
    fontWeight: 'normal',
    marginTop: -2,
  },
  attrAllocatedText: {
    fontFamily: 'PixelifySans-Medium',
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'normal',
    minWidth: 14,
    textAlign: 'center',
  },
  attributeSubLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  breakdownTable: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  colStat: {
    flex: 2.2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  colCurrent: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'PixelifySans-Regular',
    fontSize: 13,
    color: '#94A3B8',
  },
  colNew: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'PixelifySans-Medium',
    fontSize: 13,
    fontWeight: 'normal',
  },
  colNewHighlighted: {
    color: '#D4A754',
  },
  colNewMuted: {
    color: '#94A3B8',
  },
  headerLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    color: '#64748B',
    fontWeight: 'normal',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerColStat: {
    flex: 2.2,
  },
  headerColCurrent: {
    flex: 1,
    textAlign: 'right',
  },
  headerColNew: {
    flex: 1,
    textAlign: 'right',
  },
  statEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  statLabel: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: 'normal',
  },
  modalActions: {
    marginTop: 8,
  },
  confirmBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  confirmBtnDisabled: {
    backgroundColor: '#222',
  },
  confirmBtnText: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 15,
    fontWeight: 'normal',
    color: '#1A1200',
    zIndex: 2,
  },
  closeModalBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  closeModalBtnText: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 14,
    fontWeight: 'normal',
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
