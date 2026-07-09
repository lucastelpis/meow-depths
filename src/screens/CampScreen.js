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
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, RadialGradient, Stop, Circle, Path, G } from 'react-native-svg';

// ── Project imports ──────────────────────────────────────────────────────────
import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { calculateEffectiveStats } from '../logic/progressionEngine';
import { SKILLS } from '../data/skills';
import ItemSprite from '../components/ItemSprite';
import { pickRandomThought } from '../data/mochiThoughts';
import { isQuestUnlocked } from '../data/quests';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 40;

const ELEMENT_SPRITES = {
  fire: 33,
  wind: 34,
  water: 35,
  earth: 36,
};


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

// ─── Mochi Speech Bubble (banner thought balloon) ────────────────────────────
// Cozy parchment bubble with a downward tail pointing toward Mochi in the art.
// Visual-only for now; phrase pool / unlock logic comes later.
function MochiSpeechBubble({ text }) {
  return (
    <View style={styles.mochiBubble} pointerEvents="none">
      <View style={styles.mochiBubbleBody}>
        <Text style={styles.mochiBubbleText}>{text}</Text>
      </View>
      {/* Tail: a bordered square rotated 45°, tucked under the body so only the
          downward point shows. Rendered after the body so its fill covers the
          body's bottom border across the join. */}
      <View style={styles.mochiBubbleTail} />
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
      <ExpoImage
        source={require('../../assets/sprites/background-hub.png')}
        style={{
          width: width * 4,
          height: height,
          position: 'absolute',
          left: -(frame * width),
          top: 0,
        }}
        contentFit="fill"
      />
    </View>
  );
}

export default function CampScreen({ navigation }) {
  const { state, dispatch } = useGame();
  const { hero } = state;

  const [dungeonCardLayout, setDungeonCardLayout] = React.useState({ width: 0, height: 0 });
  const [questBoardModalVisible, setQuestBoardModalVisible] = React.useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = React.useState(false);
  const [nowTs, setNowTs] = React.useState(Date.now());
  const [expandedQuestId, setExpandedQuestId] = React.useState(null);
  const [celebrationQuest, setCelebrationQuest] = React.useState(null);

  // Mochi's banner thought — re-rolled from the unlocked pool each time the hub
  // gains focus, so the hero "says" something new on every visit.
  const [mochiThought, setMochiThought] = React.useState(() =>
    pickRandomThought(state.progress.notesCollected)
  );

  useFocusEffect(
    React.useCallback(() => {
      setMochiThought(pickRandomThought(state.progress.notesCollected));
      // Dispatch daily quests generation on focus
      const dateStr = new Date().toDateString();
      dispatch({ type: 'GENERATE_DAILY_QUESTS', payload: { dateStr } });
    }, [state.progress.notesCollected, dispatch])
  );

  // Tick every second while the modal is open so the reset countdown stays live
  React.useEffect(() => {
    if (!questBoardModalVisible) return;
    setNowTs(Date.now());
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [questBoardModalVisible]);

  const effectiveStats = calculateEffectiveStats(hero);

  const notesCollected = state.progress.notesCollected || {};
  const readNotes = state.progress.readNotes || {};
  const hasUnreadNotes = Object.keys(notesCollected).some(
    (noteId) => notesCollected[noteId] && !readNotes[noteId]
  );

  const questsState = state.progress.questsState || { dailies: [], campaign: [] };
  const dailies = questsState.dailies || [];
  const campaign = questsState.campaign || [];

  const sortedDailies = React.useMemo(() => {
    return [...dailies].sort((a, b) => {
      const getScore = (q) => {
        if (q.completed && !q.claimed) return 1;
        if (!q.completed) return 2;
        return 3;
      };
      return getScore(a) - getScore(b);
    });
  }, [dailies]);

  React.useEffect(() => {
    if (questBoardModalVisible && sortedDailies.length > 0) {
      const claimable = sortedDailies.find(q => q.completed && !q.claimed);
      if (claimable) {
        setExpandedQuestId(claimable.id);
      } else {
        const active = sortedDailies.find(q => !q.completed);
        if (active) {
          setExpandedQuestId(active.id);
        } else {
          setExpandedQuestId(sortedDailies[0].id);
        }
      }
    }
  }, [questBoardModalVisible, sortedDailies]);

  const completedCount = React.useMemo(() => {
    return dailies.filter(q => q.completed).length;
  }, [dailies]);

  const allDailiesClaimed = React.useCallback(() => {
    if (dailies.length === 0) return false;
    return dailies.every(q => q.claimed);
  }, [dailies]);

  const hasClaimableQuestReward = React.useMemo(() => {
    const dailiesClaimable = dailies.some(q => q.completed && !q.claimed);
    const campaignClaimable = campaign.some(q => q.completed && !q.claimed && isQuestUnlocked(q, campaign, state.progress));
    return dailiesClaimable || campaignClaimable;
  }, [dailies, campaign, state.progress]);

  const hasClaimableDailyQuestReward = React.useMemo(() => {
    return dailies.some(q => q.completed && !q.claimed);
  }, [dailies]);

  // ── Animation for Daily Reward Button Pulse ───────────────────────────────
  const pulseAnim = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    let anim;
    if (!allDailiesClaimed()) {
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
  }, [allDailiesClaimed]);

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

  // Time until the daily reward resets (next local midnight), formatted HH:MM
  const resetCountdown = React.useMemo(() => {
    const next = new Date(nowTs);
    next.setHours(24, 0, 0, 0); // next midnight
    const diffMs = Math.max(0, next.getTime() - nowTs);
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }, [nowTs]);

  const getCrystalFrame = (itemId) => {
    let base = 0;
    if (itemId.includes('green')) base = 4;
    else if (itemId.includes('yellow')) base = 8;
    
    if (itemId.includes('shard')) return base + 0;
    if (itemId.includes('small')) return base + 1;
    if (itemId.includes('big')) return base + 2;
    if (itemId.includes('core')) return base + 3;
    return base;
  };

  const renderRewardChip = (type, key, qty) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'gold') {
      return (
        <View key={key} style={styles.rewardMiniChip}>
          <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={14} />
          <Text style={styles.rewardMiniText}>{qty}G</Text>
        </View>
      );
    } else if (type === 'consumables') {
      let frame = 0;
      if (lowerKey === 'super_potion') frame = 1;
      else if (lowerKey === 'mega_potion') frame = 2;
      else if (lowerKey === 'ultra_potion') frame = 3;
      return (
        <View key={key} style={styles.rewardMiniChip}>
          <ItemSprite spritesheet="consumables-1" frameIndex={frame} displaySize={14} />
          <Text style={styles.rewardMiniText}>x{qty}</Text>
        </View>
      );
    } else if (type === 'materials') {
      const frame = getCrystalFrame(lowerKey);
      return (
        <View key={key} style={styles.rewardMiniChip}>
          <ItemSprite spritesheet="crystals-1" frameIndex={frame} displaySize={14} />
          <Text style={styles.rewardMiniText}>x{qty}</Text>
        </View>
      );
    }
    return null;
  };

  const getItemName = (itemId) => {
    const normalized = itemId.toLowerCase();
    if (normalized === 'gold') return 'Gold';
    if (normalized === 'potion') return 'Health Potion';
    if (normalized === 'super_potion') return 'Super Potion';
    if (normalized === 'mega_potion') return 'Mega Potion';
    if (normalized === 'ultra_potion') return 'Ultra Potion';
    
    return normalized
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderCelebrationRewardChip = (type, key, qty) => {
    const lowerKey = key.toLowerCase();
    let sprite = null;
    const displayName = getItemName(key);
    
    if (lowerKey === 'gold') {
      sprite = <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={32} />;
    } else if (type === 'consumables') {
      let frame = 0;
      if (lowerKey === 'super_potion') frame = 1;
      else if (lowerKey === 'mega_potion') frame = 2;
      else if (lowerKey === 'ultra_potion') frame = 3;
      sprite = <ItemSprite spritesheet="consumables-1" frameIndex={frame} displaySize={32} />;
    } else if (type === 'materials') {
      const frame = getCrystalFrame(lowerKey);
      sprite = <ItemSprite spritesheet="crystals-1" frameIndex={frame} displaySize={32} />;
    }

    return (
      <View key={key} style={styles.drChip}>
        {sprite}
        <Text style={styles.drChipQty}>{lowerKey === 'gold' ? `${qty}G` : `x${qty}`}</Text>
        <Text style={styles.drChipLabel}>{displayName}</Text>
      </View>
    );
  };

  return (
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

            {/* Mochi's thought balloon — random phrase from the unlocked pool */}
            <MochiSpeechBubble text={mochiThought.text} />

            <View style={styles.bannerOverlayContent}>
              {/* Centered Plaque Title */}
              <View style={styles.bannerTitleOuterBorder}>
                <View style={styles.bannerTitleInnerBorder}>
                  <Text style={styles.bannerTitleText}>MEOW DEPTHS</Text>
                </View>
              </View>

              {/* Tags Stack */}
              <View style={styles.bannerTagsRow}>
                {/* Tag 1: Gold */}
                <View style={styles.bannerTag}>
                  <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={18} />
                  <Text style={styles.bannerTagText}>{hero.gold} G</Text>
                </View>

                {/* Tag 2: Level */}
                <View style={styles.bannerTag}>
                  <ItemSprite spritesheet="icons-1" frameIndex={ELEMENT_SPRITES[hero.element] || 33} displaySize={18} />
                  <Text style={styles.bannerTagText}>LV {hero.level}</Text>
                </View>

                {/* Tag 3: Stats (Clickable) — only shown when stat points are available */}
                {(hero.statPoints || 0) > 0 && (
                  <View style={styles.bannerTagClickableWrapper}>
                    <TouchableOpacity
                      style={styles.bannerTagClickableInner}
                      onPress={() => navigation.navigate('Profile', { initialTab: 'stats' })}
                      activeOpacity={0.7}
                    >
                      <ItemSprite spritesheet="icons-map" frameIndex={109} displaySize={18} />
                    </TouchableOpacity>

                    <View style={styles.bannerTagBadge}>
                      <Text style={styles.bannerTagBadgeText}>!</Text>
                    </View>
                  </View>
                )}

                {/* Tag 4: Skill Points (Clickable) — only shown when skill points are available */}
                {(hero.skillPoints || 0) > 0 && (
                  <View style={styles.bannerTagClickableWrapper}>
                    <TouchableOpacity
                      style={styles.bannerTagClickableInner}
                      onPress={() => navigation.navigate('SkillTree')}
                      activeOpacity={0.7}
                    >
                      <ItemSprite spritesheet="icons-map" frameIndex={14} displaySize={18} />
                    </TouchableOpacity>

                    <View style={styles.bannerTagBadge}>
                      <Text style={styles.bannerTagBadgeText}>!</Text>
                    </View>
                  </View>
                )}

                {/* Tag 4: Notes (Clickable) — only shown when there are unread notes */}
                {hasUnreadNotes && (
                  <View style={styles.bannerTagClickableWrapper}>
                    <TouchableOpacity
                      style={styles.bannerTagClickableInner}
                      onPress={() => navigation.navigate('Journal', { initialTab: 'notes' })}
                      activeOpacity={0.7}
                    >
                      <ItemSprite spritesheet="icons-map" frameIndex={58} displaySize={18} />
                    </TouchableOpacity>

                    <View style={styles.bannerTagBadge}>
                      <Text style={styles.bannerTagBadgeText}>!</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>



          {/* Daily Quests Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setQuestBoardModalVisible(true)}
            style={{ position: 'relative', overflow: 'visible' }}
          >
            <Animated.View
              style={[
                styles.dailyRewardBtn,
                allDailiesClaimed()
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
                <IconGlowBackground size={64} />
                <ItemSprite spritesheet="icons-map" frameIndex={26} displaySize={56} />
              </View>
              <View style={styles.dailyRewardTextContainer}>
                <Text style={[
                  styles.dailyRewardTitle,
                  allDailiesClaimed() ? styles.dailyRewardTitleClaimed : styles.dailyRewardTitleActive
                ]}>
                  DAILY QUESTS
                </Text>
                <Text style={[
                  styles.dailyRewardSub,
                  allDailiesClaimed() ? styles.dailyRewardSubClaimed : styles.dailyRewardSubActive
                ]}>
                  {`Quests: ${completedCount}/3 Complete`}
                </Text>
              </View>
            </Animated.View>
            {hasClaimableDailyQuestReward && (
              <View style={[styles.questBadge, { top: -2, right: -2 }]}>
                <Text style={styles.questBadgeText}>!</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ═══════════════════════════════════════════════════════════════════
            NAVIGATION GRID — Glassmorphic Grid Layout
            ═══════════════════════════════════════════════════════════════════ */}
          {/* ═══════════════════════════════════════════════════════════════════
            NAVIGATION GRID — Asymmetric Cozy Layout
            ═══════════════════════════════════════════════════════════════════ */}
          <View style={styles.navGrid}>
            {/* Enter Regions (WorldMap) — Full Width */}
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
                <Text style={styles.dungeonLabel}>START EXPEDITION</Text>
                <Text style={styles.dungeonSub}>EXPLORE REGIONS</Text>
              </View>
            </TouchableOpacity>

            {/* Sub Navigation Cards — Row 1 */}
            <View style={styles.subButtonsRow}>
              {/* Shopping */}
              <TouchableOpacity
                style={styles.subCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Shop')}
              >
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
                <View style={styles.subSpriteContainer}>
                  <IconGlowBackground size={44} />
                  <ItemSprite spritesheet="icons-map" frameIndex={14} displaySize={38} />
                </View>
                <Text style={styles.subCardLabel}>SKILLS</Text>
              </TouchableOpacity>

              {/* Quests */}
              <TouchableOpacity
                style={[styles.subCard, { overflow: 'visible' }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Quests')}
              >
                <View style={styles.subSpriteContainer}>
                  <IconGlowBackground size={44} />
                  <ItemSprite spritesheet="icons-map" frameIndex={73} displaySize={38} />
                </View>
                <Text style={styles.subCardLabel}>QUESTS</Text>
                {hasClaimableQuestReward && (
                  <View style={styles.questBadge}>
                    <Text style={styles.questBadgeText}>!</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Sub Navigation Cards — Row 2 */}
            <View style={[styles.subButtonsRow, { marginTop: 8 }]}>
              {/* Profile */}
              <TouchableOpacity
                style={styles.subCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Profile')}
              >
                <View style={styles.subSpriteContainer}>
                  <IconGlowBackground size={44} />
                  <ExpoImage
                    source={require('../../assets/sprites/units/hero/hero_head.png')}
                    style={{ width: 38, height: 38 }}
                    contentFit="contain"
                  />
                </View>
                <Text style={styles.subCardLabel}>PROFILE</Text>
              </TouchableOpacity>

              {/* Journal */}
              <TouchableOpacity
                style={styles.subCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Journal')}
              >
                <View style={styles.subSpriteContainer}>
                  <IconGlowBackground size={44} />
                  <ItemSprite spritesheet="icons-map" frameIndex={121} displaySize={38} />
                </View>
                <Text style={styles.subCardLabel}>JOURNAL</Text>
              </TouchableOpacity>

              {/* Settings */}
              <TouchableOpacity
                style={styles.subCard}
                activeOpacity={0.8}
                onPress={() => setSettingsModalVisible(true)}
              >
                <View style={styles.subSpriteContainer}>
                  <IconGlowBackground size={44} />
                  <ItemSprite spritesheet="icons-map" frameIndex={111} displaySize={38} />
                </View>
                <Text style={styles.subCardLabel}>SETTINGS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* ═══════════════════════════════════════════════════════════════════
          DAILY REWARD MODAL — themed to match the hub redesign
          ═══════════════════════════════════════════════════════════════════ */}
        {/* ═══════════════════════════════════════════════════════════════════
          QUEST BOARD MODAL — scrollable parchment layout containing active
          daily and campaign quests, progress, rewards, and claim buttons.
          ═══════════════════════════════════════════════════════════════════ */}
        <Modal
          visible={questBoardModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setQuestBoardModalVisible(false)}
          statusBarTranslucent
        >
          <View style={styles.qbOverlay}>
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={() => setQuestBoardModalVisible(false)}
            />
            <View style={[styles.qbFrame, theme.SHADOWS.cardShadow]}>
              <View style={styles.qbParchment}>
                <View style={styles.drBevel} pointerEvents="none" />

                {/* Close button — inside the panel */}
                <TouchableOpacity
                  style={styles.drClose}
                  onPress={() => setQuestBoardModalVisible(false)}
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.drCloseText}>✕</Text>
                </TouchableOpacity>

                {/* Scrollable quests list */}
                <ScrollView
                  style={styles.qbScrollView}
                  contentContainerStyle={styles.qbScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Daily Quests Header Divider (Progress + Countdown) */}
                  <View style={styles.qbSectionHeader}>
                    <Text style={styles.qbProgressSummaryText}>PROGRESS: {completedCount} / 3</Text>
                    <Text style={styles.qbCountdownText}>RESET IN: {resetCountdown}</Text>
                  </View>

                  {/* Daily Quests List */}
                  {sortedDailies.length === 0 ? (
                    <Text style={styles.qbEmptyText}>No daily quests active.</Text>
                  ) : (
                    sortedDailies.map((quest) => {
                      const isExpanded = expandedQuestId === quest.id;
                      return (
                        <View
                          key={quest.id}
                          style={[
                            styles.questAccordionCard,
                            isExpanded && styles.questAccordionCardExpanded,
                            quest.claimed && styles.questAccordionCardClaimed,
                          ]}
                        >
                          {/* Header Row */}
                          <TouchableOpacity
                            style={[
                              styles.questHeaderRow,
                              isExpanded && styles.questHeaderRowExpanded,
                              quest.completed && !quest.claimed && styles.questHeaderRowClaimable,
                            ]}
                            onPress={() => setExpandedQuestId(isExpanded ? null : quest.id)}
                            activeOpacity={0.85}
                          >
                            <View style={styles.questHeaderLeft}>
                              {quest.claimed ? (
                                <ItemSprite spritesheet="icons-map" frameIndex={95} displaySize={13} />
                              ) : quest.completed ? (
                                <ItemSprite spritesheet="icons-map" frameIndex={140} displaySize={13} />
                              ) : (
                                <View style={styles.statusBulletActive} />
                              )}
                              <Text
                                style={[
                                  styles.questHeaderTitle,
                                  quest.claimed && styles.questHeaderTitleClaimed,
                                ]}
                              >
                                {quest.title}
                              </Text>
                            </View>

                            <View style={styles.questHeaderRight}>
                              {quest.claimed ? (
                                <Text style={styles.questStatusTextClaimed}>CLAIMED</Text>
                              ) : quest.completed ? (
                                <TouchableOpacity
                                  style={styles.headerClaimBtn}
                                  activeOpacity={0.7}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    setCelebrationQuest(quest);
                                  }}
                                >
                                  <Text style={styles.headerClaimBtnText}>CLAIM</Text>
                                </TouchableOpacity>
                              ) : (
                                <Text style={styles.questHeaderProgressText}>
                                  {quest.progress}/{quest.target}
                                </Text>
                              )}
                              <Text style={styles.chevronIcon}>{isExpanded ? '▲' : '▼'}</Text>
                            </View>
                          </TouchableOpacity>

                          {/* Expanded Body */}
                          {isExpanded && (
                            <View style={styles.questBody}>
                              <Text style={styles.questDesc}>{quest.desc}</Text>

                              {!quest.claimed && (
                                <View style={styles.progressBarBg}>
                                  <View
                                    style={[
                                      styles.progressBarFill,
                                      { width: `${Math.min(100, (quest.progress / quest.target) * 100)}%` },
                                    ]}
                                  />
                                  <View style={styles.progressBarTextWrapper}>
                                    <Text style={styles.progressBarText}>
                                      PROGRESS: {quest.progress} / {quest.target}
                                    </Text>
                                  </View>
                                </View>
                              )}

                              <View style={styles.questRewardsRow}>
                                <Text style={styles.rewardsLabel}>Rewards:</Text>
                                <View style={styles.rewardsList}>
                                  {quest.rewards.gold > 0 && renderRewardChip('gold', 'gold', quest.rewards.gold)}
                                  {quest.rewards.consumables &&
                                    Object.entries(quest.rewards.consumables).map(([id, qty]) =>
                                      renderRewardChip('consumables', id, qty)
                                    )}
                                  {quest.rewards.materials &&
                                    Object.entries(quest.rewards.materials).map(([id, qty]) =>
                                      renderRewardChip('materials', id, qty)
                                    )}
                                </View>
                              </View>

                              {!quest.claimed && quest.completed && (
                                <TouchableOpacity
                                  style={[styles.claimBtn, { marginTop: 4 }]}
                                  activeOpacity={0.8}
                                  onPress={() => setCelebrationQuest(quest)}
                                >
                                  <Text style={styles.claimBtnText}>CLAIM REWARD</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </View>

              {/* Title sign mounted on top */}
              <View style={styles.drTopWrap} pointerEvents="none">
                <View style={styles.drTopOuter}>
                  <View style={styles.drTopInner}>
                    <Text style={styles.drTopText}>DAILY QUESTS</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Quest Reward Celebration Overlay */}
            {celebrationQuest && (
              <View style={[StyleSheet.absoluteFillObject, styles.drOverlay, { zIndex: 100 }]}>
                <View style={[styles.drFrame, theme.SHADOWS.cardShadow]}>
                  <View style={styles.drParchment}>
                    <View style={styles.drBevel} pointerEvents="none" />
                    
                    {/* Header Banner */}
                    <View style={styles.drTopWrap} pointerEvents="none">
                      <View style={styles.drTopOuter}>
                        <View style={styles.drTopInner}>
                          <Text style={styles.drTopText}>QUEST COMPLETED</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.drSubtitle}>{celebrationQuest.title}</Text>
                    
                    {/* Grid of rewards */}
                    <View style={styles.drRewards}>
                      {celebrationQuest.rewards.gold > 0 && renderCelebrationRewardChip('gold', 'gold', celebrationQuest.rewards.gold)}
                      {celebrationQuest.rewards.consumables && Object.entries(celebrationQuest.rewards.consumables).map(([id, qty]) => 
                        renderCelebrationRewardChip('consumables', id, qty)
                      )}
                      {celebrationQuest.rewards.materials && Object.entries(celebrationQuest.rewards.materials).map(([id, qty]) => 
                        renderCelebrationRewardChip('materials', id, qty)
                      )}
                    </View>

                    {/* AWESOME! button */}
                    <TouchableOpacity
                      style={styles.drButton}
                      activeOpacity={0.8}
                      onPress={() => {
                        dispatch({ type: 'CLAIM_QUEST_REWARD', payload: { questId: celebrationQuest.id } });
                        setCelebrationQuest(null);
                      }}
                    >
                      <View style={styles.drButtonInner}>
                        <Text style={styles.drButtonText}>AWESOME!</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        </Modal>

        {/* ═══════════════════════════════════════════════════════════════════
          SETTINGS MODAL — holds destructive/save actions
          ═══════════════════════════════════════════════════════════════════ */}
        <Modal
          visible={settingsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSettingsModalVisible(false)}
          statusBarTranslucent
        >
          <Pressable style={styles.drOverlay} onPress={() => setSettingsModalVisible(false)}>
            <Pressable style={[styles.drFrame, theme.SHADOWS.cardShadow]} onPress={() => { }}>
              <View style={styles.drParchment}>
                <View style={styles.drBevel} pointerEvents="none" />

                <TouchableOpacity
                  style={styles.drClose}
                  onPress={() => setSettingsModalVisible(false)}
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.drCloseText}>✕</Text>
                </TouchableOpacity>

                <Text style={styles.settingsSectionLabel}>Audio Settings</Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.settingsAudioBtn}
                  onPress={() => {
                    dispatch({ type: 'TOGGLE_MUTE_SOUNDS' });
                  }}
                >
                  <View style={styles.settingsAudioBtnInner}>
                    <Text style={styles.settingsAudioBtnText}>
                      {state?.settings?.muteSounds ? 'UNMUTE SOUNDS' : 'MUTE SOUNDS'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <Text style={[styles.settingsHint, { marginBottom: 20 }]}>
                  {state?.settings?.muteSounds ? 'Sounds are currently muted.' : 'Sounds are currently enabled.'}
                </Text>

                <Text style={styles.settingsSectionLabel}>Character Progression</Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.settingsResetStatsBtn}
                  onPress={() => {
                    Alert.alert(
                      'Reset Stats & Skills',
                      'Are you sure you want to reset all attribute points and skills? You will be fully refunded all spent Skill Points.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Reset Stats & Skills',
                          style: 'destructive',
                          onPress: () => {
                            dispatch({ type: 'RESET_STATS_AND_SKILLS' });
                            setSettingsModalVisible(false);
                          },
                        },
                      ]
                    );
                  }}
                >
                  <View style={styles.settingsResetStatsBtnInner}>
                    <Text style={styles.settingsResetStatsBtnText}>RESET STATS & SKILLS</Text>
                  </View>
                </TouchableOpacity>
                <Text style={[styles.settingsHint, { marginBottom: 20 }]}>Reclaims all Strength, Agility, Vitality points, and crystal skill upgrades.</Text>

                <Text style={styles.settingsSectionLabel}>Save Data</Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.settingsResetBtn}
                  onPress={() => {
                    Alert.alert(
                      'Reset Game Data',
                      'Are you sure you want to nuke your save and start completely fresh?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Reset Data',
                          style: 'destructive',
                          onPress: () => {
                            dispatch({ type: 'RESET_GAME' });
                            setSettingsModalVisible(false);
                          },
                        },
                      ]
                    );
                  }}
                >
                  <View style={styles.settingsResetBtnInner}>
                    <Text style={styles.settingsResetBtnText}>RESET SAVE DATA</Text>
                  </View>
                </TouchableOpacity>
                <Text style={styles.settingsHint}>This permanently deletes all of your progress.</Text>
              </View>

              <View style={styles.drTopWrap} pointerEvents="none">
                <View style={styles.drTopOuter}>
                  <View style={styles.drTopInner}>
                    <Text style={styles.drTopText}>SETTINGS</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

      </SafeAreaView>
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
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 18,
    color: '#07070A',
    letterSpacing: 0.3,
  },
  ctaSub: {
    fontFamily: 'Jersey10-Regular',
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
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
    marginBottom: 12, // 7px visual gap + 5px shadow height offset
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
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 30,
    letterSpacing: 1.5,
    color: '#FFF3DA',
    textTransform: 'uppercase',
  },
  dungeonSub: {
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 13,
    letterSpacing: 0.5,
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
    backgroundColor: '#142C1C',
    borderColor: theme.COLORS.candleGold,
    borderWidth: 2,
    borderRadius: theme.BORDER_RADIUS.card,
    paddingTop: 7,
    paddingBottom: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  subSpriteContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    width: 44,
    height: 44,
    position: 'relative',
  },
  subCardLabel: {
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 14,
    lineHeight: 15,
    letterSpacing: 0.5,
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
    marginBottom: 10,
    borderRadius: theme.BORDER_RADIUS.card,
    borderWidth: 3,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  dailyRewardBtnClaimed: {
    backgroundColor: '#1E1E20',
    borderColor: '#3A3A3C',
    opacity: 0.65,
  },
  dailyRewardSpriteContainer: {
    position: 'relative',
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
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 25,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  dailyRewardTitleActive: {
    color: '#FFF3DA',
  },
  dailyRewardTitleClaimed: {
    color: '#A6AC9E',
  },
  dailyRewardSub: {
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 13,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  dailyRewardSubActive: {
    color: '#FFEED0',
  },
  dailyRewardSubClaimed: {
    color: '#8A9384',
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
    marginBottom: 10,
  },
  /* ═══ Mochi Speech Bubble ══════════════════════════════════════════════════ */
  mochiBubble: {
    position: 'absolute',
    left: 14,
    bottom: '34%',
    maxWidth: '34%',
    alignItems: 'flex-start',
    zIndex: 20,
  },
  mochiBubbleBody: {
    backgroundColor: '#F4E6C0',
    borderColor: '#4A3917',
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  mochiBubbleText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.3,
    color: '#3A2410',
  },
  mochiBubbleTail: {
    width: 14,
    height: 14,
    backgroundColor: '#F4E6C0',
    borderColor: '#4A3917',
    borderRightWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }],
    marginLeft: 50,
    marginTop: -8,
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
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
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
    paddingHorizontal: 5,
    gap: 3,
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
    paddingHorizontal: 5,
    gap: 3,
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

  /* ═══ Daily Reward Modal — Cozy Parchment ════════════════════════════════ */
  drOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 14, 6, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 26,
  },
  qbOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 14, 6, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 20,
  },
  drFrame: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#6E4524',
    borderColor: '#3A2210',
    borderWidth: 3,
    borderRadius: 12,
    padding: 10,
    position: 'relative',
  },
  drParchment: {
    backgroundColor: '#ECD8A6',
    borderRadius: 14,
    borderColor: '#C9A86A',
    borderWidth: 2,
    paddingTop: 26,
    paddingBottom: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    position: 'relative',
  },
  drBevel: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 250, 228, 0.4)',
    zIndex: 1,
  },
  drClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E3CF9C',
    borderColor: '#9A6B34',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  drCloseText: {
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 15,
    color: '#6E4524',
  },
  drTopWrap: {
    position: 'absolute',
    top: -17,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  drTopOuter: {
    borderWidth: 3,
    borderColor: '#4A3917',
    borderRadius: 8,
    padding: 2,
    backgroundColor: '#1E1E20',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 6,
  },
  drTopInner: {
    borderWidth: 2,
    borderColor: '#D4A754',
    borderRadius: 5,
    backgroundColor: '#1E1E20',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  drTopText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 12,
    color: '#FFF3DA',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  drSubtitle: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#4A2E14',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 17,
    marginTop: 10,
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  drCountdown: {
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 18,
  },
  drWatchLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#4A2E14',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  drWatchValue: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 28,
    color: '#3A2210',
    letterSpacing: 1,
    marginTop: 8,
  },
  drRewards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 2,
    marginBottom: 16,
  },
  drChip: {
    alignItems: 'center',
    backgroundColor: '#F4E6C0',
    borderColor: '#C9A86A',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 12,
    minWidth: 84,
  },
  drChipQty: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 13,
    color: '#3A2210',
    marginTop: 6,
  },
  drChipLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    color: '#9A7A4A',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  drButton: {
    alignSelf: 'stretch',
    backgroundColor: '#7A4A24',
    borderColor: '#3A2210',
    borderWidth: 2,
    borderRadius: 12,
    padding: 3,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  drButtonInner: {
    backgroundColor: '#9A632F',
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1.5,
    borderTopColor: '#C58E4E',
    borderBottomWidth: 2,
    borderBottomColor: '#5A3318',
  },
  drButtonText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 12,
    color: '#FFF3DA',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: '#4A2A10',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

  /* ═══ Settings Modal ═══════════════════════════════════════════════════════ */
  settingsSectionLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    color: '#8A6E44',
    letterSpacing: 1,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  settingsAudioBtn: {
    alignSelf: 'stretch',
    backgroundColor: '#7D5A0F',
    borderColor: '#3D2A00',
    borderWidth: 2,
    borderRadius: 12,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  settingsAudioBtnInner: {
    backgroundColor: '#AD8226',
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1.5,
    borderTopColor: '#DEC168',
    borderBottomWidth: 2,
    borderBottomColor: '#6B4C08',
  },
  settingsAudioBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 12,
    color: '#FFF5DB',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: '#4A3300',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  settingsResetStatsBtn: {
    alignSelf: 'stretch',
    backgroundColor: '#7A4A24',
    borderColor: '#3A2210',
    borderWidth: 2,
    borderRadius: 12,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  settingsResetStatsBtnInner: {
    backgroundColor: '#9A632F',
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1.5,
    borderTopColor: '#C58E4E',
    borderBottomWidth: 2,
    borderBottomColor: '#5A3318',
  },
  settingsResetStatsBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 12,
    color: '#FFF3DA',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: '#4A2A10',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  settingsResetBtn: {
    alignSelf: 'stretch',
    backgroundColor: '#6E2A24',
    borderColor: '#3A1410',
    borderWidth: 2,
    borderRadius: 12,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  settingsResetBtnInner: {
    backgroundColor: '#9A332F',
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1.5,
    borderTopColor: '#C5584E',
    borderBottomWidth: 2,
    borderBottomColor: '#5A1818',
  },
  settingsResetBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 12,
    color: '#FFF3DA',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: '#4A1010',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  settingsHint: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 11,
    color: '#8A6E44',
    textAlign: 'center',
    marginTop: 10,
  },
  qbFrame: {
    width: '100%',
    maxWidth: SCREEN_WIDTH - 16,
    maxHeight: '95%',
    backgroundColor: '#6E4524',
    borderColor: '#3A2210',
    borderWidth: 3,
    borderRadius: 12,
    padding: 10,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  qbParchment: {
    backgroundColor: '#ECD8A6',
    borderRadius: 14,
    borderColor: '#C9A86A',
    borderWidth: 2,
    paddingTop: 26,
    paddingBottom: 14,
    paddingHorizontal: 14,
    position: 'relative',
    maxHeight: '100%',
    flexShrink: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  qbScrollView: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.72,
    flexShrink: 1,
    marginTop: 10,
  },
  qbScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  qbSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#C9A86A',
    paddingBottom: 4,
  },
  qbProgressSummaryText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    color: '#3A2210',
    fontWeight: 'bold',
  },
  qbCountdownText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    color: '#9A7A4A',
  },
  qbEmptyText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: '#9A7A4A',
    textAlign: 'center',
    marginVertical: 20,
  },
  questAccordionCard: {
    backgroundColor: '#F4E6C0',
    borderColor: '#C9A86A',
    borderWidth: 1.5,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  questAccordionCardExpanded: {
    borderColor: '#D4A754',
  },
  questAccordionCardClaimed: {
    opacity: 0.65,
  },
  questHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(58, 34, 16, 0.04)',
  },
  questHeaderRowExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 168, 106, 0.4)',
    backgroundColor: 'rgba(58, 34, 16, 0.08)',
  },
  questHeaderRowClaimable: {
    backgroundColor: 'rgba(212, 167, 84, 0.12)',
  },
  questHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  questHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  statusBulletActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9A7A4A',
  },
  questHeaderTitle: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#3A2210',
    fontWeight: 'bold',
    flex: 1,
  },
  questHeaderTitleClaimed: {
    textDecorationLine: 'line-through',
    color: '#6E4524',
  },
  questStatusTextClaimed: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    color: '#8A9384',
  },
  questHeaderProgressText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    color: '#3A2210',
  },
  chevronIcon: {
    fontSize: 10,
    color: '#3A2210',
    width: 12,
    textAlign: 'center',
  },
  headerClaimBtn: {
    backgroundColor: '#142C1C',
    borderColor: '#D4A754',
    borderWidth: 1.5,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerClaimBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    color: '#FFF3DA',
    fontWeight: 'bold',
  },
  questBody: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  questDesc: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 14,
    color: '#6E4524',
    marginTop: 2,
    marginBottom: 6,
  },
  progressBarBg: {
    height: 14,
    backgroundColor: '#3A2210',
    borderRadius: 7,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#C9A86A',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#D4A754',
    borderRadius: 6,
  },
  progressBarTextWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    color: '#FFF3DA',
    textShadowColor: '#3A2210',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  questRewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  rewardsLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    color: '#9A7A4A',
  },
  rewardsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rewardMiniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECD8A6',
    borderColor: '#C9A86A',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  rewardMiniText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    color: '#3A2210',
  },
  claimBtn: {
    backgroundColor: '#142C1C',
    borderColor: '#D4A754',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  claimBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    color: '#FFF3DA',
    textTransform: 'uppercase',
  },
  claimBtnDisabled: {
    backgroundColor: '#1E1E20',
    borderColor: '#3A3A3C',
    opacity: 0.6,
  },
  claimBtnDisabledText: {
    color: '#8A9384',
  },
  questBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D8483F',
    borderColor: '#4A3917',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  questBadgeText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#FFF3DA',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 8,
    marginTop: -1,
  },
});
