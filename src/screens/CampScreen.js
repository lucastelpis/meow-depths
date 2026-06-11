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
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Circle, Path, G } from 'react-native-svg';

// ── Project imports ──────────────────────────────────────────────────────────
import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { calculateEffectiveStats } from '../logic/progressionEngine';
import ScreenLoader from '../components/ScreenLoader';
import Button from '../components/ui/Button';
import { SKILLS } from '../data/skills';
import ItemSprite from '../components/ItemSprite';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 40;

// ─── SVG Wood Texture Background Component ───────────────────────────────────
function WoodSpriteBackground({ borderRadius = 8 }) {
  return (
    <View style={{ ...StyleSheet.absoluteFillObject, borderRadius, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Solid wood brown background */}
        <Rect width="100" height="100" fill="#825324" />
        
        {/* Dark wood grain lines */}
        <Path d="M0,20 Q30,22 50,18 T100,20" stroke="#5C3A16" strokeWidth="2.5" fill="none" opacity="0.5" />
        <Path d="M0,50 Q45,46 70,54 T100,50" stroke="#5C3A16" strokeWidth="2.5" fill="none" opacity="0.5" />
        <Path d="M0,80 Q25,84 60,78 T100,80" stroke="#5C3A16" strokeWidth="2.5" fill="none" opacity="0.5" />
        
        {/* Light wood highlights */}
        <Path d="M0,35 Q20,32 55,38 T100,35" stroke="#A87543" strokeWidth="2" fill="none" opacity="0.3" />
        <Path d="M0,65 Q35,68 65,62 T100,65" stroke="#A87543" strokeWidth="2" fill="none" opacity="0.3" />
      </Svg>
    </View>
  );
}

// ─── SVG Rugged Border Background Component ──────────────────────────────────
function RuggedBorderBackground({ width, height }) {
  if (!width || !height) return null;
  
  const notch = 6; // corner notch size
  const shadowHeight = 5; // bottom shadow bevel height
  const strokePadding = 3; // padding to prevent stroke clipping
  
  // Coordinates for the notched rectangle shape (straight sides)
  const path = `M ${notch} 0 
                L ${width - notch} 0 
                L ${width - notch} ${notch} 
                L ${width} ${notch} 
                L ${width} ${height - notch} 
                L ${width - notch} ${height - notch} 
                L ${width - notch} ${height} 
                L ${notch} ${height} 
                L ${notch} ${height - notch} 
                L 0 ${height - notch} 
                L 0 ${notch} 
                L ${notch} ${notch} Z`;

  // Inner line inset coordinates (shifted inwards by 3 pixels)
  const inset = 3;
  const innerPath = `M ${notch + inset} ${inset} 
                     L ${width - notch - inset} ${inset} 
                     L ${width - notch - inset} ${notch + inset} 
                     L ${width - inset} ${notch + inset} 
                     L ${width - inset} ${height - notch - inset} 
                     L ${width - notch - inset} ${height - notch - inset} 
                     L ${width - notch - inset} ${height - inset} 
                     L ${notch + inset} ${height - inset} 
                     L ${notch + inset} ${height - notch - inset} 
                     L ${inset} ${height - notch - inset} 
                     L ${inset} ${notch + inset} 
                     L ${notch + inset} ${notch + inset} Z`;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Svg 
        width={width + strokePadding * 2} 
        height={height + shadowHeight + strokePadding * 2} 
        style={{ 
          position: 'absolute', 
          top: -strokePadding, 
          left: -strokePadding 
        }}
      >
        <G transform={`translate(${strokePadding}, ${strokePadding})`}>
          {/* 1. 3D Under-Shadow */}
          <Path d={path} fill="#4E1D0C" transform={`translate(0, ${shadowHeight})`} />

          {/* 2. Main Button Face with Dark Outline */}
          <Path 
            d={path} 
            fill="#A84C27" 
            stroke="#4E1D0C" 
            strokeWidth={3} 
            strokeLinejoin="miter" 
          />
          {/* 3. Inner line border highlight */}
          <Path 
            d={innerPath} 
            fill="none" 
            stroke="#D67545" 
            strokeWidth={1.5} 
            opacity={0.75} 
          />
        </G>
      </Svg>
    </View>
  );
}

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

// ─── Animated Hub Background Component ───────────────────────────────────────
function AnimatedHubBackground({ width, height }) {
  const [frame, setFrame] = React.useState(0);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setFrame(prev => (prev + 1) % 4);
    }, 250); // 4 FPS (250ms per frame)
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ width, height, overflow: 'hidden', position: 'absolute' }}>
      <Image
        source={require('../../assets/sprites/background-hub.png')}
        style={{
          width: width * 4,
          height: height,
          position: 'absolute',
          left: -(frame * width),
          top: 0,
        }}
        resizeMode="stretch"
      />
    </View>
  );
}

export default function CampScreen({ navigation }) {
  const { state, dispatch } = useGame();
  const { hero } = state;

  const [dungeonCardLayout, setDungeonCardLayout] = React.useState({ width: 0, height: 0 });

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
    outputRange: ['rgba(232, 167, 58, 0.35)', 'rgba(232, 167, 58, 0.95)'],
  });
  
  const bgPulseColor = pulseAnim.interpolate({
    inputRange: [0.3, 1],
    outputRange: ['rgba(20, 44, 28, 0.85)', 'rgba(32, 74, 46, 0.95)'],
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
      require('../../assets/sprites/background-hub.png'),
      require('../../assets/sprites/items/icons-1.png'),
    ]}>
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            ANIMATED HUB BANNER
            ═══════════════════════════════════════════════════════════════════ */}
        <View style={[styles.bannerContainer, theme.SHADOWS.cardShadow]}>
          <AnimatedHubBackground width={BANNER_WIDTH - 6} height={BANNER_WIDTH - 6} />
          <View style={styles.bannerOverlayContent}>
            {/* Centered Plaque Title */}
            <View style={styles.bannerTitleOuterBorder}>
              <View style={styles.bannerTitleInnerBorder}>
                <Text style={styles.bannerTitleText}>Meow Dungeons</Text>
              </View>
            </View>

            {/* Tags Stack */}
            <View style={styles.bannerTagsRow}>
              {/* Tag 1: Gold */}
              <View style={styles.bannerTag}>
                <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={18} />
                <Text style={styles.bannerTagText}>{hero.gold}</Text>
              </View>

              {/* Tag 2: Level */}
              <View style={styles.bannerTag}>
                <ItemSprite spritesheet="icons-1" frameIndex={28} displaySize={18} />
                <Text style={styles.bannerTagText}>LV {hero.level}</Text>
              </View>

              {/* Tag 3: Stats (Clickable) */}
              <View style={styles.bannerTagClickableWrapper}>
                <TouchableOpacity
                  style={styles.bannerTagClickableInner}
                  onPress={handleOpenStatModal}
                  activeOpacity={0.7}
                >
                  <ItemSprite spritesheet="icons-1" frameIndex={28} displaySize={18} />
                  <Text style={styles.bannerTagText}>STATS</Text>
                </TouchableOpacity>

                {/* Exclamation badge when stats are available */}
                {(hero.statPoints || 0) > 0 && (
                  <View style={styles.bannerTagBadge}>
                    <Text style={styles.bannerTagBadgeText}>!</Text>
                  </View>
                )}
              </View>
            </View>
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
                    shadowColor: '#E8A73A',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: pulseAnim,
                    shadowRadius: glowShadowRadius,
                    elevation: 4,
                  },
            ]}
          >
            <View style={styles.dailyRewardSpriteContainer}>
              <ItemSprite spritesheet="icons-1" frameIndex={5} displaySize={56} />
            </View>
            <View style={styles.dailyRewardTextContainer}>
              <Text style={[
                styles.dailyRewardTitle,
                hasClaimedToday() ? styles.dailyRewardTitleClaimed : styles.dailyRewardTitleActive
              ]}>
                {hasClaimedToday() ? "DAILY REWARD CLAIMED" : "CLAIM DAILY REWARD"}
              </Text>
              <Text style={[
                styles.dailyRewardSub,
                hasClaimedToday() ? styles.dailyRewardSubClaimed : styles.dailyRewardSubActive
              ]}>
                {hasClaimedToday() ? "Come Back Tomorrow" : "Collect Gold & Potions"}
              </Text>
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
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setDungeonCardLayout({ width, height });
            }}
          >
            <RuggedBorderBackground width={dungeonCardLayout.width} height={dungeonCardLayout.height} />
            <View style={styles.dungeonSpriteContainer}>
              <IconGlowBackground size={64} />
              <ItemSprite spritesheet="icons-1" frameIndex={0} displaySize={56} />
            </View>
            <View style={styles.dungeonTextContainer}>
              <Text style={styles.dungeonLabel}>START ADVENTURE</Text>
              <Text style={styles.dungeonSub}>EXPLORE ZONES</Text>
            </View>
          </TouchableOpacity>

          {/* Sub Navigation Cards Row */}
          <View style={styles.subButtonsRow}>
            {/* Shopping */}
            <TouchableOpacity
              style={styles.subCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Shop')}
            >
              <WoodSpriteBackground borderRadius={theme.BORDER_RADIUS.card} />
              <View style={styles.subSpriteContainer}>
                <IconGlowBackground size={44} />
                <ItemSprite spritesheet="icons-1" frameIndex={1} displaySize={38} />
              </View>
              <Text style={styles.subCardLabel}>MARKET</Text>
            </TouchableOpacity>

            {/* Skills */}
            <TouchableOpacity
              style={styles.subCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('SkillTree')}
            >
              <WoodSpriteBackground borderRadius={theme.BORDER_RADIUS.card} />
              <View style={styles.subSpriteContainer}>
                <IconGlowBackground size={44} />
                <ItemSprite spritesheet="icons-1" frameIndex={4} displaySize={38} />
              </View>
              <Text style={styles.subCardLabel}>SKILLS</Text>
            </TouchableOpacity>

            {/* Loadout */}
            <TouchableOpacity
              style={styles.subCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Loadout')}
            >
              <WoodSpriteBackground borderRadius={theme.BORDER_RADIUS.card} />
              <View style={styles.subSpriteContainer}>
                <IconGlowBackground size={44} />
                <ItemSprite spritesheet="icons-1" frameIndex={12} displaySize={38} />
              </View>
              <Text style={styles.subCardLabel}>LOADOUT</Text>
            </TouchableOpacity>

            {/* Profile */}
            <TouchableOpacity
              style={styles.subCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Profile')}
            >
              <WoodSpriteBackground borderRadius={theme.BORDER_RADIUS.card} />
              <View style={styles.subSpriteContainer}>
                <IconGlowBackground size={44} />
                <ItemSprite spritesheet="icons-1" frameIndex={28} displaySize={38} />
              </View>
              <Text style={styles.subCardLabel}>PROFILE</Text>
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
    backgroundColor: '#133131',
  },
  scroll: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  cardBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
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
    marginBottom: theme.SPACING.section,
  },
  dungeonCard: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
    marginBottom: theme.SPACING.section + 5, // 16px visual gap + 5px shadow height offset
  },
  dungeonSpriteContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    height: 64,
    position: 'relative',
  },
  dungeonTextContainer: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  dungeonLabel: {
    fontFamily: 'PixelifySans-Medium',
    fontWeight: 'normal',
    fontSize: 24,
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
    gap: 8,
  },
  subCard: {
    flex: 1,
    backgroundColor: '#825324',
    borderColor: theme.COLORS.candleGold,
    borderWidth: 2,
    borderRadius: theme.BORDER_RADIUS.card,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  subSpriteContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    width: 44,
    height: 44,
    position: 'relative',
  },
  subCardLabel: {
    fontFamily: 'PixelifySans-Medium',
    fontWeight: 'normal',
    fontSize: 11,
    lineHeight: 12,
    color: '#FFF3DA',
    textAlign: 'center',
    textTransform: 'uppercase',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
    marginBottom: theme.SPACING.section,
    borderRadius: theme.BORDER_RADIUS.card,
    borderWidth: 3,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  dailyRewardBtnClaimed: {
    backgroundColor: '#1E1E20',
    borderColor: '#3A3A3C',
    opacity: 0.65,
  },
  dailyRewardSpriteContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  dailyRewardTextContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  dailyRewardTitle: {
    fontFamily: 'PixelifySans-Medium',
    fontWeight: 'normal',
    fontSize: 20,
    textTransform: 'uppercase',
  },
  dailyRewardTitleActive: {
    color: '#FFF3DA',
  },
  dailyRewardTitleClaimed: {
    color: '#6E6E73',
  },
  dailyRewardSub: {
    fontFamily: 'Silkscreen-Regular',
    fontWeight: 'normal',
    fontSize: 10,
    marginTop: 2,
  },
  dailyRewardSubActive: {
    color: '#FFEED0',
  },
  dailyRewardSubClaimed: {
    color: '#6E6E73',
  },

  /* ═══ Stat Point Buttons & Badge ══════════════════════════════════════════ */
  /* ═══ Animated Hub Banner ═════════════════════════════════════════════════ */
  bannerContainer: {
    width: BANNER_WIDTH,
    height: BANNER_WIDTH,
    borderRadius: theme.BORDER_RADIUS.card,
    borderWidth: 3,
    borderColor: '#4A3917',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: theme.SPACING.section,
  },
  bannerOverlayContent: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    justifyContent: 'space-between',
  },
  bannerTitleOuterBorder: {
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: '#4A3917',
    borderRadius: 8,
    backgroundColor: 'transparent',
    padding: 2,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  bannerTitleInnerBorder: {
    borderWidth: 2,
    borderColor: '#D4A754',
    borderRadius: 5,
    backgroundColor: '#1E1E20',
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  bannerTitleText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 18,
    color: '#FFF3DA',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  bannerTagsRow: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    gap: 8,
  },
  bannerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E2BD',
    borderColor: '#4A3917',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 6,
  },
  bannerTagText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    letterSpacing: 0,
    color: '#2A1A0C',
  },
  bannerTagClickableWrapper: {
    position: 'relative',
    backgroundColor: '#F3E2BD',
    borderColor: '#4A3917',
    borderWidth: 2,
    borderRadius: 8,
  },
  bannerTagClickableInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 6,
  },
  bannerTagBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D8483F', // damageRed (retro red)
    borderColor: '#4A3917',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  bannerTagBadgeText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#FFF3DA',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 8,
    marginTop: -1,
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
