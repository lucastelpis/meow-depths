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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
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
  const [dailyModalVisible, setDailyModalVisible] = React.useState(false);
  const [dailyClaimedView, setDailyClaimedView] = React.useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = React.useState(false);
  const [dailyJustClaimed, setDailyJustClaimed] = React.useState(false);
  const [claimedRows, setClaimedRows] = React.useState(null); // frozen rewards snapshot at claim time
  const [nowTs, setNowTs] = React.useState(Date.now());

  // Mochi's banner thought — re-rolled from the unlocked pool each time the hub
  // gains focus, so the hero "says" something new on every visit.
  const [mochiThought, setMochiThought] = React.useState(() =>
    pickRandomThought(state.progress.notesCollected)
  );
  useFocusEffect(
    React.useCallback(() => {
      setMochiThought(pickRandomThought(state.progress.notesCollected));
    }, [state.progress.notesCollected])
  );

  // Tick every second while the modal is open so the reset countdown stays live
  React.useEffect(() => {
    if (!dailyModalVisible) return;
    setNowTs(Date.now());
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [dailyModalVisible]);

  const effectiveStats = calculateEffectiveStats(hero);

  const notesCollected = state.progress.notesCollected || {};
  const readNotes = state.progress.readNotes || {};
  const hasUnreadNotes = Object.keys(notesCollected).some(
    (noteId) => notesCollected[noteId] && !readNotes[noteId]
  );



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

  // ── Reward calculation (shared by the preview & the dispatch) ──────────────
  const dailyRewards = React.useMemo(() => {
    const isFirstClaim = !state.progress.lastDailyClaim;
    const lvl = hero.level || 1;
    const goldReward = isFirstClaim ? 50 : 100 + lvl * 50;
    // Potions: health potions scaled, super potions starting at lvl 3
    const healthPotionQty = isFirstClaim ? 3 : 1 + Math.floor(lvl / 5);
    const superPotionQty = isFirstClaim ? 0 : (lvl >= 3 ? 1 : 0);
    return { isFirstClaim, lvl, goldReward, healthPotionQty, superPotionQty };
  }, [state.progress.lastDailyClaim, hero.level]);

  const openDailyModal = () => {
    setDailyClaimedView(hasClaimedToday());
    setDailyJustClaimed(false);
    setDailyModalVisible(true);
  };

  const closeDailyModal = () => setDailyModalVisible(false);

  // Reward rows to render in the modal (filters out empty quantities)
  const dailyRewardRows = [
    { key: 'gold', spritesheet: 'icons-1', frameIndex: 11, label: 'Gold', qty: dailyRewards.goldReward },
    { key: 'potion', spritesheet: 'consumables-1', frameIndex: 0, label: 'Potion', qty: dailyRewards.healthPotionQty },
    { key: 'super_potion', spritesheet: 'consumables-1', frameIndex: 1, label: 'Super Potion', qty: dailyRewards.superPotionQty },
  ].filter((r) => r.qty > 0);

  const confirmDailyClaim = () => {
    const { goldReward, healthPotionQty, superPotionQty } = dailyRewards;

    const consumablesReward = {};
    if (healthPotionQty > 0) consumablesReward['potion'] = healthPotionQty;
    if (superPotionQty > 0) consumablesReward['super_potion'] = superPotionQty;

    // Snapshot the rows BEFORE dispatching — claiming sets lastDailyClaim,
    // which recomputes dailyRewards (isFirstClaim flips), so without this the
    // post-claim view would show different items than were actually granted.
    setClaimedRows(dailyRewardRows);

    dispatch({
      type: 'CLAIM_DAILY_REWARD',
      payload: {
        gold: goldReward,
        consumables: consumablesReward,
      },
    });

    setDailyJustClaimed(true);
    setDailyClaimedView(true);
  };

  // Items to display in the modal: the frozen snapshot right after claiming,
  // otherwise the live preview of what's claimable.
  const displayedRewardRows = (dailyJustClaimed && claimedRows) ? claimedRows : dailyRewardRows;

  // Time until the daily reward resets (next local midnight), formatted HH:MM
  const resetCountdown = React.useMemo(() => {
    const next = new Date(nowTs);
    next.setHours(24, 0, 0, 0); // next midnight
    const diffMs = Math.max(0, next.getTime() - nowTs);
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }, [nowTs]);

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
                  <Text style={styles.bannerTagText}>{hero.gold}</Text>
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
                      <ItemSprite spritesheet="icons-1" frameIndex={28} displaySize={18} />
                      <Text style={styles.bannerTagText}>STATS</Text>
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
                      <ItemSprite spritesheet="icons-map" frameIndex={36} displaySize={18} />
                      <Text style={styles.bannerTagText}>NOTES</Text>
                    </TouchableOpacity>

                    <View style={styles.bannerTagBadge}>
                      <Text style={styles.bannerTagBadgeText}>!</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>



          {/* Daily Reward Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openDailyModal}
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
                  {hasClaimedToday() ? "DAILY RATIONS CLAIMED" : "CLAIM DAILY RATIONS"}
                </Text>
                <Text style={[
                  styles.dailyRewardSub,
                  hasClaimedToday() ? styles.dailyRewardSubClaimed : styles.dailyRewardSubActive
                ]}>
                  {hasClaimedToday() ? "COME BACK TOMORROW" : "COLLECT SUPPLIES"}
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
                <View style={styles.subSpriteContainer}>
                  <IconGlowBackground size={44} />
                  <ItemSprite spritesheet="icons-1" frameIndex={12} displaySize={38} />
                </View>
                <Text style={styles.subCardLabel}>LOADOUT</Text>
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
        <Modal
          visible={dailyModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeDailyModal}
          statusBarTranslucent
        >
          {(() => {
            // Three states: already claimed earlier today, just claimed now, or claimable
            const alreadyClaimed = dailyClaimedView && !dailyJustClaimed;
            return (
              <Pressable style={styles.drOverlay} onPress={closeDailyModal}>
                <Pressable style={[styles.drFrame, theme.SHADOWS.cardShadow]} onPress={() => { }}>
                  <View style={styles.drParchment}>
                    {/* Inner paper bevel highlight */}
                    <View style={styles.drBevel} pointerEvents="none" />

                    {/* Close button — inside the panel */}
                    <TouchableOpacity
                      style={styles.drClose}
                      onPress={closeDailyModal}
                      activeOpacity={0.8}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.drCloseText}>✕</Text>
                    </TouchableOpacity>

                    {/* Subtitle */}
                    <Text style={styles.drSubtitle}>
                      {alreadyClaimed
                        ? "You've claimed today's rations."
                        : dailyJustClaimed
                          ? 'Added to your bag!'
                          : 'Claim your rations for today.'}
                    </Text>

                    {/* Ration items — always show which supplies are/were given */}
                    <View style={styles.drRewards}>
                      {displayedRewardRows.map((row) => (
                        <View key={row.key} style={styles.drChip}>
                          <ItemSprite spritesheet={row.spritesheet} frameIndex={row.frameIndex} displaySize={40} />
                          <Text style={styles.drChipQty}>+{row.qty}</Text>
                          <Text style={styles.drChipLabel}>{row.label}</Text>
                        </View>
                      ))}
                    </View>

                    {alreadyClaimed && (
                      /* Countdown — centered, no box, no clock */
                      <View style={styles.drCountdown}>
                        <Text style={styles.drWatchLabel}>NEXT RATIONS IN</Text>
                        <Text style={styles.drWatchValue}>{resetCountdown}</Text>
                      </View>
                    )}

                    {/* Wooden action button */}
                    {dailyClaimedView ? (
                      <TouchableOpacity activeOpacity={0.85} onPress={closeDailyModal} style={styles.drButton}>
                        <View style={styles.drButtonInner}>
                          <Text style={styles.drButtonText}>{dailyJustClaimed ? 'CONTINUE' : 'GREAT, THANKS!'}</Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity activeOpacity={0.85} onPress={confirmDailyClaim} style={styles.drButton}>
                        <View style={styles.drButtonInner}>
                          <Text style={styles.drButtonText}>CLAIM RATIONS</Text>
                        </View>
                      </TouchableOpacity>
                    )}

                  </View>

                  {/* Title sign — mounted on the top border (MEOW DUNGEONS style) */}
                  <View style={styles.drTopWrap} pointerEvents="none">
                    <View style={styles.drTopOuter}>
                      <View style={styles.drTopInner}>
                        <Text style={styles.drTopText}>DAILY RATIONS</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              </Pressable>
            );
          })()}
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
});
