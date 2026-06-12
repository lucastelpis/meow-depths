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

  const effectiveStats = calculateEffectiveStats(hero);



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
                  onPress={() => navigation.navigate('Profile', { initialTab: 'stats' })}
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

            {/* Profile */}
            <TouchableOpacity
              style={styles.subCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Profile')}
            >
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
    backgroundColor: '#142C1C',
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


});
