/**
 * SkillTreeScreen.js — Element-based Skill Tree
 *
 * Redesigned to match the Camp hub / onboarding art style:
 *   - Dark teal (#133131) background
 *   - Wood plaque title + parchment tag pills (Silkscreen / PressStart2P / Pixelify)
 *   - Rugged notched-border CTA buttons & soft icon glows
 *   - Skill sprites pulled from assets/sprites/items/skill-icons-1.png
 *
 * Layout per element:
 *   - Level + crystal stash header
 *   - Element tabs (player's element active, others locked)
 *   - Stance card (always-on innate, scales with level)
 *   - Dynamic tier grid with SVG connectors
 *   - Equipped skill sockets
 *   - Tap card → detail modal (unlock, star-up, equip)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Circle, Path } from 'react-native-svg';

import { useGame } from '../state/gameState';
import {
  SKILLS,
  ELEMENT_SKILLS,
  SKILL_SPRITE_FRAMES,
  canUnlockElementSkill,
  canStarUpSkill,
  getSkillUpgradeCost,
} from '../data/skills';
import { STANCES, getStanceBonus } from '../logic/progressionEngine';
import ItemSprite from '../components/ItemSprite';
import { MATERIALS } from '../data/gear';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Wood / parchment palette (matches Camp hub + onboarding) ─────────────────

const C = {
  bg: '#133131',
  panel: '#142C1C',
  panelDeep: '#0F2417',
  plaqueDark: '#4A3917',
  plaqueGold: '#D4A754',
  plaqueBg: '#1E1E20',
  parchment: '#F3E2BD',
  candleGold: '#E8A73A',
  text: '#FFF3DA',
  textDim: 'rgba(255, 243, 218, 0.6)',
  textFaint: 'rgba(255, 243, 218, 0.32)',
  inkDark: '#2A1A0C',
  good: '#7CFFB2',
  bad: '#FF8A8A',
};

// ─── Element metadata (colors + icons-1 sprite frames, as in onboarding) ───────

const ELEMENTS = [
  { id: 'fire', label: 'FIRE', color: '#FF6B35', frame: 33 },
  { id: 'water', label: 'WATER', color: '#3B9EFF', frame: 35 },
  { id: 'earth', label: 'EARTH', color: '#D4A754', frame: 36 },
  { id: 'wind', label: 'WIND', color: '#5CC4B8', frame: 34 },
];

const ELEMENT_COLORS = {
  fire: '#FF6B35',
  water: '#3B9EFF',
  earth: '#D4A754',
  wind: '#5CC4B8',
};

// ─── Crystal currency metadata (Zone 1 — Black Crystals) ──────────────────────

const CRYSTAL_INFO = {
  black_shard: { name: 'Black Crystal Shard', short: 'Shards', icon: '🔹', color: '#8FA3FF' },
  black_crystal_small: { name: 'Small Black Crystal', short: 'Small Crystals', icon: '🔷', color: '#6E8BFF' },
  black_crystal_big: { name: 'Big Black Crystal', short: 'Big Crystals', icon: '💎', color: '#9B7CFF' },
  black_crystal_core: { name: 'Black Crystal Core', short: 'Crystal Core', icon: '🌑', color: '#FFD700' },
};

const CRYSTAL_ORDER = ['black_shard', 'black_crystal_small', 'black_crystal_big', 'black_crystal_core'];

// ─── Shared SVG art helpers (matches CampScreen / onboarding) ─────────────────

function IconGlowBackground({ size = 56, color }) {
  const radius = size / 2;
  const id = `glow-${size}-${(color || 'gold').replace('#', '')}`;
  const inner = color || '#FFF3DA';
  const mid = color || '#E8A73A';
  return (
    <View style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={inner} stopOpacity="0.6" />
            <Stop offset="50%" stopColor={mid} stopOpacity="0.22" />
            <Stop offset="100%" stopColor={mid} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={radius} cy={radius} r={radius} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

// Stars display
function Stars({ count, max = 5, color = C.candleGold, size = 12 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: max }, (_, i) => (
        <Text key={i} style={{ color: i < count ? color : 'rgba(255,243,218,0.14)', fontSize: size }}>
          ★
        </Text>
      ))}
    </View>
  );
}

// Render text with star symbols sized smaller
function renderTextWithStars(text, style) {
  if (!text) return null;
  if (!text.includes('★')) {
    return <Text style={style}>{text}</Text>;
  }
  const parts = text.split('★');
  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (index === parts.length - 1) {
          return <React.Fragment key={index}>{part}</React.Fragment>;
        }
        return (
          <React.Fragment key={index}>
            {part}
            <Text style={{ fontSize: 11 }}>★</Text>
          </React.Fragment>
        );
      })}
    </Text>
  );
}

// ─── Stat Labels & Formatters ──────────────────────────────────────────────────

export const SKILL_STAT_LABELS = {
  damageMultiplier: 'Base Damage',
  agiScaling: 'Bonus Attack from Agility',
  burnDamage: 'Burn Damage / Turn',
  burnDuration: 'Burn Duration',
  burnTickBonus: 'Burn Damage Bonus',
  spreadPercent: 'Splash Damage',
  spreadBurnChance: 'Splash Burn Chance',
  counterBurnDamage: 'Counter Damage / Turn',
  counterBurnDuration: 'Counter Duration',
  guardDuration: 'Guard Duration',
  damageReduction: 'Damage Reduction',
  burnAtkPercent: 'Burn Scale (% ATK)',
  atkReduce: 'Attack Reduction',
  defReduce: 'Defense Reduction',
  duration: 'Duration',
  spreadAtkReduceChance: 'Splash ATK Reduce Chance',
  spreadDefReduceChance: 'Splash DEF Reduce Chance',
  healPerTurn: 'Healing / Turn',
  cooldown: 'Cooldown',
  healingEfficiency: 'Healing Efficiency',
  stunChance: 'Stun Chance',
  defBoostPercent: 'DEF Boost',
  reflectPercent: 'Reflect (raw damage)',
  statusResistChance: 'Status Resistance',
  dodgeBonus: 'Dodge Bonus',
  bonusCritChance: 'Bonus Crit Chance (per hit)',
  critMultiplier: 'Crit Damage Multiplier',
  critRateBonus: 'Crit Rate Bonus',
  critDamageBonus: 'Crit Damage Bonus',
  hpPercent: 'Max HP as Bonus ATK',
  damageHpPercent: 'Total AoE Damage',
  backfireHpPercent: 'Self Backfire (% Max HP)',
  healPercent: 'Regeneration per Turn',
  extraStrikes: 'Extra Wind Blades Strikes',
};

export const formatSkillStatValue = (key, value) => {
  if (key === 'damageMultiplier') return `${Math.round(value * 100)}% ATK`;
  if (key === 'agiScaling') return `+${value} Attack per Agility`;
  if (key === 'damageReduction' || key === 'burnAtkPercent') {
    return `${Math.round(value * 100)}%`;
  }
  if (key === 'spreadPercent' || key === 'spreadBurnChance' || key === 'spreadAtkReduceChance' || key === 'atkReduce' || key === 'defReduce' || key === 'spreadDefReduceChance') {
    return `${Math.round(value * 100)}%`;
  }
  if (key === 'healingEfficiency') return `+${Math.round(value * 100)}%`;
  if (key === 'healPerTurn') return `${Math.round(value * 100)}% Max HP (${Math.round(value * 300)}% Max HP total)`;
  if (key === 'burnDuration' || key === 'counterBurnDuration' || key === 'guardDuration' || key === 'duration' || key === 'cooldown') {
    return `${value} ${value === 1 ? 'turn' : 'turns'}`;
  }
  if (key === 'stunChance' || key === 'defBoostPercent' || key === 'reflectPercent' || key === 'statusResistChance') {
    return `${Math.round(value * 100)}%`;
  }
  if (key === 'dodgeBonus' || key === 'bonusCritChance') return `+${Math.round(value * 100)}%`;
  if (key === 'critMultiplier') return `${Math.round(value * 100)}% (replaces base 150%)`;
  if (key === 'critRateBonus') return `+${Math.round(value * 100)}% Crit Rate (for 3 turns)`;
  if (key === 'critDamageBonus') return `+${Math.round(value * 100)}% Crit Damage (additive, for 3 turns)`;
  if (key === 'damageHpPercent') {
    const hpPct = Math.round(value * 100);
    let atkPct = 0;
    if (hpPct === 30) atkPct = 50;
    else if (hpPct === 37) atkPct = 75;
    else if (hpPct === 45) atkPct = 100;
    else if (hpPct === 52) atkPct = 125;
    else if (hpPct === 60) atkPct = 150;
    else atkPct = Math.round(value * 300) - 45; // fallback
    return `${atkPct}% ATK + ${hpPct}% Max HP (Split)`;
  }
  if (key === 'hpPercent' || key === 'healPercent') {
    return `${Math.round(value * 100)}% of Max HP`;
  }
  if (key === 'backfireHpPercent') {
    return `${Math.round(value * 100)}% of Max HP (reduced by DEF)`;
  }
  if (key === 'extraStrikes') return `+${value} strike${value !== 1 ? 's' : ''}`;
  return value;
};

// ─── Skill sprite helper ───────────────────────────────────────────────────────

function SkillSprite({ skillId, size = 38, glow, glowColor }) {
  const frame = SKILL_SPRITE_FRAMES[skillId];
  return (
    <View style={{ width: size + 8, height: size + 8, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
      {glow && <IconGlowBackground size={size + 8} color={glowColor} />}
      {frame !== undefined ? (
        <ItemSprite spritesheet="skill-icons-1" frameIndex={frame} displaySize={size} />
      ) : (
        <Text style={{ fontSize: size * 0.7 }}>{SKILLS[skillId]?.icon || '✨'}</Text>
      )}
    </View>
  );
}

const getSlotTheme = (elId) => {
  switch (elId) {
    case 'fire':
      return {
        innerFill: '#381610',
        topBorder: '#A6432D',
        bottomBorder: '#1A0805',
        shadowColor: '#1A0805',
      };
    case 'water':
      return {
        innerFill: '#112236',
        topBorder: '#2963A3',
        bottomBorder: '#060E18',
        shadowColor: '#060E18',
      };
    case 'earth':
      return {
        innerFill: '#2E2210',
        topBorder: '#8C6C35',
        bottomBorder: '#140F06',
        shadowColor: '#140F06',
      };
    case 'wind':
      return {
        innerFill: '#132A26',
        topBorder: '#3C8578',
        bottomBorder: '#081412',
        shadowColor: '#081412',
      };
    default:
      return {
        innerFill: '#1B4030',
        topBorder: '#4F856C',
        bottomBorder: '#0D2118',
        shadowColor: '#0D2118',
      };
  }
};

const getStanceBgColor = (elId) => {
  switch (elId) {
    case 'fire': return '#20110B';
    case 'water': return '#0A1724';
    case 'earth': return '#1C150A';
    case 'wind': return '#0B1A17';
    default: return C.panel;
  }
};

// ─── Main component ──────────────────────────────────────────────────────────

export default function SkillTreeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useGame();
  const { hero } = state;
  const { unlockedSkills = {}, equippedSkills = [null, null], element, level } = hero;
  const materials = hero.inventory?.materials || {};

  const [selectedSkill, setSelectedSkill] = useState(null);
  const [activeSkill, setActiveSkill] = useState(null);
  const [selectedElement, setSelectedElement] = useState(hero.element || 'fire');

  useEffect(() => {
    if (hero.element) {
      setSelectedElement(hero.element);
    }
  }, [hero.element]);

  // Auto-equip notification toast (shown when unlocking an active skill fills a
  // free combat slot — mirrors the UNLOCK_SKILL reducer's auto-equip rule).
  const [toast, setToast] = useState(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);

  const showToast = useCallback((message) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastAnim.setValue(0);
    Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 260, useNativeDriver: true }).start(
        () => setToast(null),
      );
    }, 2600);
  }, [toastAnim]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const handleOpenSkill = useCallback((skill) => {
    setSelectedSkill(skill);
    setActiveSkill(skill);
  }, []);

  const targetSkill = selectedSkill || activeSkill;

  // Colors and data depending on the selected skill tree view:
  const viewColor = ELEMENT_COLORS[selectedElement] || C.candleGold;
  const elementSkillIds = ELEMENT_SKILLS[selectedElement] || [];
  const slotTheme = getSlotTheme(selectedElement);

  // Stance Card parameters (always tied to hero's starting core affinity element)
  const heroElementColor = ELEMENT_COLORS[element] || C.candleGold;
  const stanceBonus = getStanceBonus(element, level);
  const stance = STANCES[element];

  // Dynamic theme color for the inspected skill's element in detail modal / toast
  const elementColor = targetSkill
    ? (ELEMENT_COLORS[targetSkill.element] || C.candleGold)
    : viewColor;

  // Group skill IDs by tier dynamically
  const tiers = [];
  const maxTier = Math.max(...elementSkillIds.map(id => SKILLS[id]?.tier || 1), 2);
  for (let t = 1; t <= maxTier; t++) {
    const tierIds = elementSkillIds.filter(id => SKILLS[id]?.tier === t);
    if (tierIds.length > 0) tiers.push(tierIds);
  }

  // Layout calculations
  const TREE_WIDTH = SCREEN_WIDTH - 40; // 20 padding on each side
  const CARD_GAP = 12;
  const CARD_HEIGHT = 120;
  const ROW_GAP = 40;
  const numTiers = tiers.length;
  const TREE_HEIGHT = numTiers > 0 ? numTiers * CARD_HEIGHT + (numTiers - 1) * ROW_GAP : 0;

  // ── Skill state helpers ───────────────────────────────────────────────────

  const getEntry = useCallback((skillId) => unlockedSkills[skillId] || null, [unlockedSkills]);
  const getStars = useCallback((skillId) => getEntry(skillId)?.stars || 0, [getEntry]);
  const isEquipped = useCallback((skillId) => equippedSkills.includes(skillId), [equippedSkills]);

  const getCardState = useCallback((skillId) => {
    if (!skillId) return 'hidden';
    const entry = getEntry(skillId);
    if (entry) {
      if (entry.stars >= 5) return 'maxed';
      return 'unlocked';
    }
    const { can } = canUnlockElementSkill(skillId, hero);
    return can ? 'available' : 'locked';
  }, [getEntry, hero]);

  const getSkillCoordinates = useCallback((skillId) => {
    let rIndex = -1, cIndex = -1, numColumns = 0;
    for (let r = 0; r < tiers.length; r++) {
      const colIdx = tiers[r].indexOf(skillId);
      if (colIdx !== -1) { rIndex = r; cIndex = colIdx; numColumns = tiers[r].length; break; }
    }
    if (rIndex === -1) return null;
    const cardWidth = (TREE_WIDTH - (numColumns - 1) * CARD_GAP) / numColumns;
    const x = cIndex * (cardWidth + CARD_GAP) + cardWidth / 2;
    const yTop = rIndex * (CARD_HEIGHT + ROW_GAP);
    const yBottom = yTop + CARD_HEIGHT;
    return { x, yTop, yBottom };
  }, [tiers, TREE_WIDTH]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleUnlock = useCallback(() => {
    if (!targetSkill) return;

    // Detect the reducer's auto-equip BEFORE dispatch: an active skill not yet
    // equipped will drop into the first free slot. Notify the player when it does.
    const freeSlot = equippedSkills.indexOf(null);
    const willAutoEquip =
      targetSkill.type !== 'passive' &&
      !equippedSkills.includes(targetSkill.id) &&
      freeSlot !== -1;

    dispatch({ type: 'UNLOCK_SKILL', payload: { skillId: targetSkill.id } });
    if (willAutoEquip) {
      showToast(`${targetSkill.name} equipped to Slot ${freeSlot + 1}`);
    }
    setSelectedSkill(null);
  }, [targetSkill, dispatch, equippedSkills, showToast]);

  const handleStarUp = useCallback(() => {
    if (!targetSkill) return;
    dispatch({ type: 'STAR_UP_SKILL', payload: { skillId: targetSkill.id } });
    setSelectedSkill(null);
  }, [targetSkill, dispatch]);

  const handleEquip = useCallback((slotIndex) => {
    if (!targetSkill) return;
    dispatch({ type: 'EQUIP_SKILL', payload: { slotIndex, skillId: targetSkill.id } });
    setSelectedSkill(null);
  }, [targetSkill, dispatch]);

  const handleUnequip = useCallback((slotIndex) => {
    dispatch({ type: 'EQUIP_SKILL', payload: { slotIndex, skillId: null } });
  }, [dispatch]);

  // ── SVG connector lines ────────────────────────────────────────────────────

  const renderSVGConnectors = () => {
    const paths = [];
    elementSkillIds.forEach(childId => {
      const childSkill = SKILLS[childId];
      if (childSkill && childSkill.unlockedBy) {
        const parentCoords = getSkillCoordinates(childSkill.unlockedBy);
        const childCoords = getSkillCoordinates(childId);
        if (parentCoords && childCoords) {
          const x1 = parentCoords.x, y1 = parentCoords.yBottom;
          const x2 = childCoords.x, y2 = childCoords.yTop;
          const midY = y1 + (y2 - y1) / 2;
          const pathData = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
          const isPathUnlocked = getStars(childSkill.unlockedBy) >= 1;
          const strokeColor = isPathUnlocked ? viewColor : '#6C5940'; // clean warm metallic bronze thread
          paths.push(
            <React.Fragment key={`${childSkill.unlockedBy}->${childId}`}>
              {/* 1. Glow effect for active paths */}
              {isPathUnlocked && (
                <Path d={pathData} fill="none" stroke={`${viewColor}40`} strokeWidth={8} strokeLinecap="round" />
              )}
              {/* 2. Solid core line */}
              <Path d={pathData} fill="none" stroke={strokeColor} strokeWidth={isPathUnlocked ? 2.5 : 2.0} strokeLinecap="round" />
            </React.Fragment>
          );
        }
      }
    });
    return paths;
  };

  // ── Skill card renderer ───────────────────────────────────────────────────

  const renderSkillCard = (skillId, cardStyle) => {
    if (!skillId) return null;
    const skill = SKILLS[skillId];
    if (!skill) return null;

    const cardState = getCardState(skillId);
    const stars = getStars(skillId);
    const equipped = isEquipped(skillId);

    // 3D double borders colors depending on state:
    let outerOutlineColor = '#84735B'; // default bronze
    let shadowBaseColor = '#4F3C1E'; // default shadow base
    let innerFillColor = '#1B4030'; // default background moss green
    let innerTopBorderColor = '#4F856C'; // default top highlight
    let innerBottomBorderColor = '#0D2118'; // default bottom shadow border
    let nameColor = C.textDim;
    let opacity = 1;

    if (cardState === 'locked') {
      opacity = 0.62;
      outerOutlineColor = 'rgba(74, 57, 23, 0.4)';
      shadowBaseColor = 'rgba(74, 57, 23, 0.2)';
      innerFillColor = '#131A13';
      innerTopBorderColor = 'rgba(74, 57, 23, 0.2)';
      innerBottomBorderColor = '#070A07';
      nameColor = C.textFaint;
    } else if (cardState === 'available') {
      outerOutlineColor = '#84735B';
      shadowBaseColor = slotTheme.shadowColor;
      innerFillColor = slotTheme.innerFill;
      innerTopBorderColor = slotTheme.topBorder;
      innerBottomBorderColor = slotTheme.bottomBorder;
      nameColor = '#FFF3DA';
    } else if (cardState === 'maxed') {
      // max level: shiny gold theme!
      outerOutlineColor = '#84735B';
      shadowBaseColor = '#4F3C1E';
      innerFillColor = '#3E2E15'; // warm gold fill
      innerTopBorderColor = '#F5CF4A'; // gold highlight
      innerBottomBorderColor = '#1F140A';
      nameColor = '#FFF3DA';
    } else { // unlocked (but not maxed) / equipped
      outerOutlineColor = '#84735B';
      shadowBaseColor = slotTheme.shadowColor;
      innerFillColor = slotTheme.innerFill;
      innerTopBorderColor = slotTheme.topBorder;
      innerBottomBorderColor = slotTheme.bottomBorder;
      nameColor = C.text;
    }

    const isActive = skill.type === 'active';
    const badgeColor = isActive ? '#F08A4A' : '#5CC489';

    return (
      <View style={[cardStyle, { position: 'relative', opacity, overflow: 'visible' }]} key={skillId}>
        {/* 1. Bevel Shadow Base */}
        <View style={styles.skillCardShadow} />

        {/* 2. Main Outer Container */}
        <TouchableOpacity
          style={[styles.skillCardOuter, { borderColor: outerOutlineColor, backgroundColor: shadowBaseColor }]}
          onPress={() => handleOpenSkill(skill)}
          activeOpacity={0.85}
        >
          {/* 3. Inner Container */}
          <View style={[
            styles.skillCardInner,
            {
              backgroundColor: innerFillColor,
              borderTopColor: innerTopBorderColor,
              borderLeftColor: innerTopBorderColor,
              borderRightColor: innerTopBorderColor,
              borderBottomColor: innerBottomBorderColor,
            }
          ]}>
            {/* Top row: sprite + badges */}
            <View style={styles.cardHeader}>
              <SkillSprite
                skillId={skillId}
                size={32}
                glow={cardState === 'unlocked' || cardState === 'maxed' || cardState === 'available'}
                glowColor={viewColor}
              />
              <View style={styles.cardBadgeCol}>
                <View style={[styles.typeBadge, { borderColor: `${badgeColor}55` }]}>
                  <Text style={[styles.typeBadgeText, { color: badgeColor }]}>{isActive ? 'ACTIVE' : 'PASSIVE'}</Text>
                </View>
                {equipped && (
                  <View style={[styles.equippedBadge, { borderColor: viewColor }]}>
                    <Text style={[styles.equippedBadgeText, { color: viewColor }]}>EQUIPPED</Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={[styles.cardName, { color: nameColor }]} numberOfLines={2}>{skill.name}</Text>

            {/* Footer: stars or unlock/cost info */}
            {stars > 0 ? (
              <View>
                <Stars count={stars} color={cardState === 'maxed' ? '#F5CF4A' : viewColor} size={11} />
              </View>
            ) : cardState === 'available' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={[styles.cardLockText, { color: '#8CAF9F' }]} numberOfLines={1}>
                  Available
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <ItemSprite spritesheet="icons-map" frameIndex={115} displaySize={9} opacity={0.4} />
                <Text style={styles.cardLockText}>
                  {(() => {
                    const check = canUnlockElementSkill(skillId, hero);
                    if (check.cost && hero.level < check.cost.requiredLevel) return `Unlocks at level ${check.cost.requiredLevel}`;
                    return 'LOCKED';
                  })()}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Selected skill modal data ──────────────────────────────────────────────

  const selectedCardState = targetSkill ? getCardState(targetSkill.id) : null;
  const selectedStars = targetSkill ? getStars(targetSkill.id) : 0;
  const selectedEquipped = targetSkill ? isEquipped(targetSkill.id) : false;
  const equippedSlot = targetSkill ? equippedSkills.indexOf(targetSkill.id) : -1;

  const unlockCheck = targetSkill ? canUnlockElementSkill(targetSkill.id, hero) : null;
  const starUpCheck = targetSkill ? canStarUpSkill(targetSkill.id, hero) : null;

  const currentStarData = targetSkill && selectedStars > 0 ? targetSkill.stars[selectedStars] : null;
  const nextStarData = targetSkill && selectedStars < 5
    ? targetSkill.stars[selectedStars + 1] || targetSkill.stars[5]
    : null;

  const relevantCheck = selectedCardState === 'available' ? unlockCheck
    : selectedCardState === 'unlocked' ? starUpCheck
      : null;
  const relevantCost = relevantCheck?.cost || null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Soft element-tinted glow at the top */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <RadialGradient id="bgGlow" cx="50%" cy="0%" rx="85%" ry="55%">
            <Stop offset="0%" stopColor={viewColor} stopOpacity="0.16" />
            <Stop offset="100%" stopColor={C.bg} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bgGlow)" />
      </Svg>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
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
            <Text style={styles.headerTitleText}>Skills</Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Skill Points Bar ─────────────────────────────────────────────── */}
      <View style={styles.crystalBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <ItemSprite spritesheet="icons-map" frameIndex={89} displaySize={16} />
          <Text style={{ fontFamily: 'Silkscreen-Regular', fontSize: 18, color: C.textDim }}>AVAILABLE SKILL POINTS:</Text>
          <Text style={{ fontFamily: 'Silkscreen-Regular', fontSize: 18, color: '#3FB56E' }}>{hero.skillPoints || 0}</Text>
        </View>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Stance card ──────────────────────────────────────────────── */}
        {stance && (
          <View style={[styles.stanceCard, { borderColor: `${heroElementColor}70`, backgroundColor: getStanceBgColor(element) }]}>
            <View style={styles.stanceLeft}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <ItemSprite spritesheet="icons-1" frameIndex={ELEMENTS.find(e => e.id === element)?.frame} displaySize={18} />
                <Text style={[styles.stanceName, { color: heroElementColor, marginBottom: 0 }]}>{stance.name.replace('Stance', 'Affinity')}</Text>
              </View>
              <Text style={styles.stanceLabel}>INNATE</Text>
              <Text style={styles.stanceDesc}>{stance.description}</Text>
            </View>
            <View style={styles.stanceRight}>
              <Text style={styles.stanceRightLabel}>CURRENT BONUS</Text>
              {stanceBonus.atkPercent !== undefined && (
                <Text style={[styles.stanceStat, { color: heroElementColor }]}>+{Math.round(stanceBonus.atkPercent * 100)}% ATK</Text>
              )}
              {stanceBonus.burnTickBonus !== undefined && (
                <Text style={[styles.stanceStat, { color: heroElementColor }]}>+{stanceBonus.burnTickBonus} burn/tick</Text>
              )}
              {stanceBonus.maxHpPercent !== undefined && (
                <>
                  <Text style={[styles.stanceStat, { color: heroElementColor }]}>+{Math.round(stanceBonus.maxHpPercent * 100)}% max HP</Text>
                  <Text style={[styles.stanceSubStat, { color: heroElementColor }]}>(currently +{Math.floor((hero.maxHp || 50) * stanceBonus.maxHpPercent)} HP)</Text>
                </>
              )}
              {stanceBonus.defBonus !== undefined && (
                <>
                  <Text style={[styles.stanceStat, { color: heroElementColor }]}>+{stanceBonus.defBonus} DEF</Text>
                  <Text style={[styles.stanceSubStat, { color: heroElementColor }]}>(+1 DEF / level)</Text>
                </>
              )}
              {stanceBonus.agiBonus !== undefined && (
                <>
                  <Text style={[styles.stanceStat, { color: heroElementColor }]}>+{stanceBonus.agiBonus} AGI</Text>
                  <Text style={[styles.stanceSubStat, { color: heroElementColor }]}>+{(stanceBonus.agiBonus * 0.5).toFixed(1)}% crit · dodge</Text>
                </>
              )}
            </View>
          </View>
        )}

        {/* ── Element Selector Buttons ─────────────────────────────────────── */}
        <View style={styles.elementSelectorRow}>
          {ELEMENTS.map((el) => {
            const isSelected = selectedElement === el.id;
            const elColor = el.color;

            return (
              <View key={el.id} style={styles.elementTabWrapper}>
                {/* 3D Under Shadow */}
                <View style={[
                  styles.elementTabShadow,
                  isSelected 
                    ? { backgroundColor: '#1E1E20' } // selected shadow
                    : { backgroundColor: '#0D2118' } // unselected shadow
                ]} />

                {/* Outer Outline */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedElement(el.id)}
                  style={[
                    styles.elementTabOuter,
                    isSelected
                      ? { borderColor: elColor, backgroundColor: '#1E1E20' }
                      : { borderColor: '#84735B', backgroundColor: '#142C1C' }
                  ]}
                >
                  {/* Inner Bevel & Highlights */}
                  <View style={[
                    styles.elementTabInner,
                    isSelected
                      ? {
                          backgroundColor: `${elColor}25`,
                          borderTopColor: elColor,
                          borderLeftColor: elColor,
                          borderRightColor: elColor,
                          borderBottomColor: `${elColor}60`,
                          borderBottomWidth: 3,
                        }
                      : {
                          backgroundColor: '#142C1C',
                          borderTopColor: 'rgba(255, 243, 218, 0.15)',
                          borderLeftColor: 'rgba(255, 243, 218, 0.15)',
                          borderRightColor: 'rgba(255, 243, 218, 0.15)',
                          borderBottomColor: 'rgba(0, 0, 0, 0.35)',
                          borderBottomWidth: 3,
                        }
                  ]}>
                    {/* Icon Sprite */}
                    <ItemSprite
                      spritesheet="icons-1"
                      frameIndex={el.frame}
                      displaySize={26}
                    />

                    {/* Label */}
                    <Text style={[
                      styles.elementTabText,
                      isSelected
                        ? { color: elColor }
                        : { color: 'rgba(255, 243, 218, 0.4)' }
                    ]}>
                      {el.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>



        {/* ── Dynamic Skill Tree Grid ─────────────────────────────────── */}
        <View style={[styles.treeContainer, { height: TREE_HEIGHT }]}>
          <Svg style={StyleSheet.absoluteFill} width={TREE_WIDTH} height={TREE_HEIGHT}>
            {renderSVGConnectors()}
          </Svg>

          {tiers.map((rowSkillIds, rIndex) => {
            const M = rowSkillIds.length;
            const cardWidth = (TREE_WIDTH - (M - 1) * CARD_GAP) / M;
            const yTop = rIndex * (CARD_HEIGHT + ROW_GAP);
            return (
              <View
                key={rIndex}
                style={[styles.treeRow, { top: yTop, position: 'absolute', left: 0, width: TREE_WIDTH, height: CARD_HEIGHT }]}
              >
                {rowSkillIds.map((skillId) => renderSkillCard(skillId, { width: cardWidth, height: CARD_HEIGHT }))}
              </View>
            );
          })}
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ── Pinned loadout dock (always visible) ───────────────────────── */}
      <View style={[styles.dock, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.dockTitle}>★ EQUIPPED LOADOUT ★</Text>
        <View style={styles.dockRow}>
          {[0, 1].map((slotIdx) => {
            const skillId = equippedSkills[slotIdx];
            const sk = skillId ? SKILLS[skillId] : null;
            const activeSlotTheme = sk ? getSlotTheme(sk.element) : getSlotTheme(element);
            const activeGlowColor = sk ? (ELEMENT_COLORS[sk.element] || viewColor) : viewColor;

            return (
              <View key={slotIdx} style={styles.dockSlotWrapper}>
                {sk ? (
                  <>
                    <View style={[styles.dockSlotShadow, { backgroundColor: activeSlotTheme.shadowColor }]} />
                    <TouchableOpacity
                      style={styles.dockSlotOuter}
                      onPress={() => handleOpenSkill(sk)}
                      activeOpacity={0.85}
                    >
                      <View style={[
                        styles.dockSlotInner,
                        {
                          backgroundColor: activeSlotTheme.innerFill,
                          borderTopColor: activeSlotTheme.topBorder,
                          borderLeftColor: activeSlotTheme.topBorder,
                          borderRightColor: activeSlotTheme.topBorder,
                          borderBottomColor: activeSlotTheme.bottomBorder,
                        }
                      ]}>
                        <SkillSprite skillId={sk.id} size={38} glow glowColor={activeGlowColor} />
                        <View style={styles.dockSlotText}>
                          <Text style={styles.dockSlotLabel}>SLOT {slotIdx + 1}</Text>
                          <Text style={[styles.dockSlotName, { color: C.text }]} numberOfLines={1}>
                            {sk.name}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.dockSlotEmptyContainer}>
                    <View style={styles.dockEmptyIcon}>
                      <ItemSprite spritesheet="icons-map" frameIndex={76} displaySize={28} opacity={0.4} />
                    </View>
                    <View style={styles.dockSlotText}>
                      <Text style={styles.dockSlotLabel}>SLOT {slotIdx + 1}</Text>
                      <Text style={[styles.dockSlotName, { color: C.textFaint }]} numberOfLines={1}>
                        Empty
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* ── Skill detail modal ─────────────────────────────────────────── */}
      <Modal
        visible={selectedSkill !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSkill(null)}
      >
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedSkill(null)} />
          <View style={styles.modalCardOuter}>
            <View style={[styles.modalCardInner, { borderColor: `${elementColor}80` }]}>
              <View style={styles.modalBevel} pointerEvents="none" />
              {targetSkill && (
                <ScrollView
                  style={{ maxHeight: SCREEN_HEIGHT * 0.82 }}
                  contentContainerStyle={styles.modalInner}
                  showsVerticalScrollIndicator={false}
                >
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedSkill(null)}>
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>

                  {/* Title row */}
                  <View style={styles.modalTitleRow}>
                    <SkillSprite skillId={targetSkill.id} size={52} glow glowColor={elementColor} />
                    <View style={styles.modalTitleRight}>
                      <Text style={styles.modalSkillName}>{targetSkill.name}</Text>
                      <View style={styles.modalBadges}>
                        <View style={[styles.typeBadge, { borderColor: `${targetSkill.type === 'active' ? '#F08A4A' : '#5CC489'}55` }]}>
                          <Text style={[styles.typeBadgeText, { color: targetSkill.type === 'active' ? '#F08A4A' : '#5CC489' }]}>
                            {targetSkill.type === 'active' ? 'ACTIVE' : 'PASSIVE'}
                          </Text>
                        </View>
                        <Text style={styles.modalTier}>TIER {targetSkill.tier}</Text>
                        {targetSkill.cooldown > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <ItemSprite spritesheet="icons-map" frameIndex={86} displaySize={11} />
                            <Text style={styles.modalCD}>{targetSkill.cooldown}-TURN CD</Text>
                          </View>
                        )}
                      </View>
                      {selectedStars > 0 && <Stars count={selectedStars} color={elementColor} size={13} />}
                    </View>
                  </View>

                  <Text style={styles.modalDesc}>{targetSkill.description}</Text>

                  {/* Unified 3-column stats box */}
                  {(currentStarData || nextStarData) && (() => {
                    const activeLevelData = currentStarData || nextStarData;
                    const keys = Object.keys(activeLevelData).filter(k => k !== 'atkMultiplier');
                    if (keys.length === 0) return null;
                    return (
                      <View style={[styles.modalStatBox, { borderColor: `${elementColor}55` }]}>
                        {/* Table Layout wrapping both Headers and Bodies */}
                        <View style={{ position: 'relative' }}>
                          {/* Absolute Continuous Vertical dividers (drawn on top of rows) */}
                          <View style={[styles.verticalDividerAbsolute, { left: '44.44%', top: 41.5 }]} />
                          <View style={[styles.verticalDividerAbsolute, { left: '72.22%' }]} />

                          {/* Table Header Row */}
                          <View style={styles.modalStatHeader}>
                            <Text style={styles.modalStatHeaderLeft}>
                              CURRENT LEVEL <Text style={{ fontSize: 11 }}>★</Text>{selectedStars}
                            </Text>
                            <Text style={[
                              styles.modalStatHeaderRight,
                              { color: selectedStars === 5 ? '#F5CF4A' : elementColor }
                            ]}>
                              {selectedStars === 5 ? 'MAXED' : (
                                <Text>
                                  NEXT <Text style={{ fontSize: 11 }}>★</Text>{selectedStars + 1}
                                </Text>
                              )}
                            </Text>
                          </View>

                          {/* Table Body (Row-based to support auto-wrapping and centering) */}
                          {keys.map(k => {
                            const curVal = currentStarData ? currentStarData[k] : undefined;
                            const nextVal = nextStarData ? nextStarData[k] : undefined;
                            return (
                              <View key={k} style={styles.modalStatRow}>
                                <View style={{ width: '44.44%', paddingRight: 8 }}>
                                  <Text style={styles.modalStatLine} numberOfLines={3}>
                                    {SKILL_STAT_LABELS[k] || k}
                                  </Text>
                                </View>
                                <View style={{ width: '27.78%', alignItems: 'center', paddingHorizontal: 4 }}>
                                  <Text style={styles.modalStatValCur}>
                                    {selectedStars === 0 ? '—' : formatSkillStatValue(k, curVal)}
                                  </Text>
                                </View>
                                <View style={{ width: '27.78%', alignItems: 'center', paddingHorizontal: 4 }}>
                                  <Text style={[
                                    styles.modalStatValNext,
                                    { color: selectedStars === 5 ? 'rgba(255,243,218,0.3)' : '#D4A754' }
                                  ]}>
                                    {selectedStars === 5 ? '—' : formatSkillStatValue(k, nextVal)}
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })()}

                  {/* Cost breakdown */}
                  {relevantCost && (
                    <View style={[styles.modalCostBox, { borderColor: `${elementColor}55` }]}>
                      <Text style={styles.modalStatLabel}>
                        {selectedCardState === 'available' ? (
                          <Text>UNLOCK <Text style={{ fontSize: 11 }}>★</Text>1 COST</Text>
                        ) : (
                          <Text><Text style={{ fontSize: 11 }}>★</Text>{selectedStars + 1} UPGRADE COST</Text>
                        )}
                      </Text>
                      <View style={styles.modalCostLevelRow}>
                        <Text style={styles.modalCostLevelText}>Hero Level</Text>
                        <Text style={[styles.modalCostLevelValue, { color: hero.level >= relevantCost.requiredLevel ? C.good : C.bad }]}>
                          {hero.level} / {relevantCost.requiredLevel}
                        </Text>
                      </View>
                      {relevantCost.skillPoints !== undefined && (() => {
                        const owned = hero.skillPoints || 0;
                        const qty = relevantCost.skillPoints;
                        const enough = owned >= qty;
                        return (
                          <View style={styles.modalCostMatRow}>
                            <Text style={styles.modalCostMatName}>Skill Points (SP)</Text>
                            <Text style={[styles.modalCostMatValue, { color: enough ? C.good : C.bad }]}>{owned} / {qty}</Text>
                          </View>
                        );
                      })()}
                    </View>
                  )}

                  {/* Unlock requirement info */}
                  {selectedCardState === 'locked' && unlockCheck && (
                    <View style={[styles.modalInfoBox, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                      <ItemSprite spritesheet="icons-map" frameIndex={115} displaySize={14} />
                      {renderTextWithStars(unlockCheck.reason, [styles.modalInfoText, { flex: 1 }])}
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.modalActions}>
                    {/* Row 1: Unlock / Level Up / Status */}
                    {selectedCardState === 'available' && (
                      <GradientButton color={elementColor} label="UNLOCK ★1" onPress={handleUnlock} />
                    )}

                    {selectedCardState === 'unlocked' && starUpCheck?.can && (
                      <GradientButton color={elementColor} label={`LEVEL UP → ★${selectedStars + 1}`} onPress={handleStarUp} />
                    )}

                    {selectedCardState === 'unlocked' && !starUpCheck?.can && selectedStars < 5 && (
                      <View style={styles.disabledBtn}>
                        {renderTextWithStars(starUpCheck?.reason, styles.disabledBtnText)}
                      </View>
                    )}

                    {selectedCardState === 'maxed' && (
                      <View style={[styles.disabledBtn, { borderColor: '#F5CF4A80' }]}>
                        <Text style={[styles.disabledBtnText, { color: '#F5CF4A' }]}>★★★★★ MAX STAR</Text>
                      </View>
                    )}

                    {/* Row 2: Equip / Unequip / Status */}
                    {(selectedCardState === 'unlocked' || selectedCardState === 'maxed') && (
                      <View style={styles.equipSection}>
                        {targetSkill.type === 'passive' ? (
                          <View style={styles.passiveBadge}>
                            <Text style={styles.passiveBadgeText}>ALWAYS ACTIVE</Text>
                          </View>
                        ) : (
                          <>
                            {selectedEquipped ? (
                              <View style={styles.unequipBtnWrapper}>
                                <View style={styles.unequipBtnShadow} />
                                <TouchableOpacity
                                  style={styles.unequipBtnOuter}
                                  onPress={() => handleUnequip(equippedSlot)}
                                  activeOpacity={0.8}
                                >
                                  <View style={styles.unequipBtnInner}>
                                    <Text style={styles.unequipBtnText}>UNEQUIP (SLOT {equippedSlot + 1})</Text>
                                  </View>
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <View style={styles.equipRow}>
                                {[0, 1].map((si) => {
                                  const occupantId = equippedSkills[si];
                                  const occupantName = occupantId ? SKILLS[occupantId]?.name : null;
                                  return (
                                    <View key={si} style={styles.equipSlotBtnWrapper}>
                                      <View style={styles.equipSlotBtnShadow} />
                                      <TouchableOpacity
                                        style={styles.equipSlotBtnOuter}
                                        onPress={() => handleEquip(si)}
                                        activeOpacity={0.8}
                                      >
                                        <View style={styles.equipSlotBtnInner}>
                                          <Text style={styles.equipSlotBtnText}>ASSIGN TO</Text>
                                          <Text style={styles.equipSlotBtnText}>SLOT {si + 1}</Text>
                                          {occupantName && (
                                            <Text style={styles.equipSlotSub} numberOfLines={1}>({occupantName})</Text>
                                          )}
                                        </View>
                                      </TouchableOpacity>
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </>
                        )}
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Auto-equip toast ──────────────────────────────────────────────── */}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              borderColor: elementColor,
              opacity: toastAnim,
              transform: [
                { translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
              ],
            },
          ]}
        >
          <Text style={[styles.toastIcon, { color: elementColor }]}>✓</Text>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ─── Gradient action button (mirrors onboarding modal confirm) ────────────────

function GradientButton({ color, label, onPress }) {
  return (
    <View style={styles.primaryBtnWrapper}>
      <View style={styles.primaryBtnShadow} />
      <TouchableOpacity
        style={styles.primaryBtnOuter}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.primaryBtnInner, { backgroundColor: color }]}>
          <Text style={styles.primaryBtnText}>{label}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },

  /* Header */
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
  headerSpacer: { width: 44 },

  /* Crystal stash bar */
  crystalBar: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    marginHorizontal: 20, marginTop: 6, paddingVertical: 6, paddingHorizontal: 8,
    backgroundColor: C.panelDeep, borderRadius: 10,
    borderWidth: 2, borderColor: 'rgba(74,57,23,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  crystalChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 6 },
  crystalChipIcon: { fontSize: 14 },
  crystalChipCount: { fontFamily: 'Silkscreen-Regular', fontSize: 14, color: C.text },



  /* Stance card */
  stanceCard: {
    flexDirection: 'row', borderRadius: 12, borderWidth: 2, overflow: 'visible',
    backgroundColor: C.panel, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 14, gap: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  stanceLeft: { flex: 1 },
  stanceRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 3 },
  stanceRightLabel: { fontFamily: 'Silkscreen-Regular', fontSize: 14, letterSpacing: 0, color: C.candleGold, marginBottom: 2 },
  stanceName: { fontFamily: 'Jersey10-Regular', fontSize: 22, marginBottom: 2 },
  stanceLabel: { fontFamily: 'Silkscreen-Regular', fontSize: 12, letterSpacing: 1.0, color: C.textDim, marginBottom: 5 },
  stanceDesc: { fontFamily: 'Jersey10-Regular', fontSize: 18, color: 'rgba(255,243,218,0.78)', lineHeight: 20 },
  stanceStat: { fontFamily: 'Jersey10-Regular', fontSize: 18 },
  stanceSubStat: { fontFamily: 'Jersey10-Regular', fontSize: 16, opacity: 0.8 },



  /* Skill Tree Grid */
  treeContainer: { width: '100%', position: 'relative', marginVertical: 10 },
  treeRow: { flexDirection: 'row', justifyContent: 'space-between' },

  /* Auto-equip toast */
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.panelDeep,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  toastIcon: { fontFamily: 'Jersey10-Regular', fontSize: 18 },
  toastText: { flex: 1, fontFamily: 'Jersey10-Regular', fontSize: 15, color: C.text },

  skillCardShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    bottom: -3,
    borderRadius: 12,
    zIndex: 1,
    backgroundColor: '#4F3C1E',
  },
  skillCardOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: '#84735B',
    backgroundColor: '#4F3C1E',
    zIndex: 2,
  },
  skillCardInner: {
    flex: 1,
    margin: 2,
    borderRadius: 9,
    borderWidth: 2.5,
    borderBottomWidth: 4,
    padding: 8,
    justifyContent: 'space-between',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardBadgeCol: { alignItems: 'flex-end', gap: 4 },
  cardName: { fontFamily: 'Jersey10-Regular', fontSize: 20, lineHeight: 20, marginTop: 2 },
  cardLockText: { fontFamily: 'Jersey10-Regular', fontSize: 16, color: C.textFaint },
  cardCostRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardCostLabel: { fontFamily: 'Silkscreen-Regular', fontSize: 11, color: C.textDim },
  cardCostText: { fontFamily: 'Silkscreen-Regular', fontSize: 11, color: C.textDim },
  cardCooldownRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardCooldown: { fontFamily: 'Silkscreen-Regular', fontSize: 11, color: '#FFA07A' },

  typeBadge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  typeBadgeText: { fontFamily: 'Jersey10-Regular', fontSize: 12, letterSpacing: 0 },
  equippedBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  equippedBadgeText: { fontFamily: 'Jersey10-Regular', fontSize: 12, letterSpacing: 0 },

  /* Pinned loadout dock */
  dock: {
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
    backgroundColor: C.panelDeep,
    borderTopWidth: 2, borderTopColor: 'rgba(74,57,23,0.7)',
  },
  dockTitle: {
    fontFamily: 'Silkscreen-Regular', fontSize: 14, letterSpacing: 1.5,
    color: C.candleGold, textAlign: 'center', marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  dockRow: { flexDirection: 'row', gap: 10 },
  dockSlotWrapper: {
    flex: 1,
    height: 78,
    position: 'relative',
  },
  dockSlotShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    height: 78,
    borderRadius: 10,
    zIndex: 1,
    backgroundColor: '#4F3C1E',
  },
  dockSlotOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 78,
    borderRadius: 10,
    borderWidth: 2.2,
    borderColor: '#84735B',
    backgroundColor: '#4F3C1E',
    zIndex: 2,
  },
  dockSlotInner: {
    flex: 1,
    margin: 1.5,
    borderRadius: 7,
    borderWidth: 2.2,
    borderTopColor: '#4F856C',
    borderLeftColor: '#4F856C',
    borderRightColor: '#4F856C',
    borderBottomColor: '#0D2118',
    borderBottomWidth: 3.5,
    backgroundColor: '#1B4030',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  dockSlotEmptyContainer: {
    flex: 1,
    height: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'rgba(74,57,23,0.4)',
    borderStyle: 'dashed',
    borderRadius: 10,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
  },
  dockEmptyIcon: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center', opacity: 0.8 },
  dockSlotText: { flex: 1 },
  dockSlotLabel: { fontFamily: 'Silkscreen-Regular', fontSize: 12, letterSpacing: 0.8, color: C.textFaint, marginBottom: 1 },
  dockSlotName: { fontFamily: 'Jersey10-Regular', fontSize: 18 },
  dockSlotType: { fontFamily: 'Jersey10-Regular', fontSize: 16, color: C.textDim, marginTop: 1 },

  /* Modal */
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 20 },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(24, 14, 6, 0.8)' },
  modalCardOuter: {
    width: '100%', borderRadius: 12, padding: 8,
    borderWidth: 3, borderColor: '#3E2E15', backgroundColor: '#4A3917',
  },
  modalCardInner: { borderRadius: 9, borderWidth: 2.5, backgroundColor: C.plaqueBg, overflow: 'hidden', position: 'relative' },
  modalBevel: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 250, 228, 0.08)',
    zIndex: 1,
  },
  modalInner: { paddingHorizontal: 20, paddingVertical: 20 },
  modalCloseBtn: {
    position: 'absolute',
    top: 10,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3E2E15',
    borderColor: '#84735B',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  modalCloseText: { fontFamily: 'Silkscreen-Regular', fontSize: 12, color: '#FFF3DA', fontWeight: 'bold' },

  modalTitleRow: { flexDirection: 'row', gap: 12, marginBottom: 12, marginTop: 4, alignItems: 'flex-start' },
  modalTitleRight: { flex: 1 },
  modalSkillName: { fontFamily: 'Jersey10-Regular', fontSize: 26, color: C.text, marginBottom: 6 },
  modalBadges: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 },
  modalTier: { fontFamily: 'Silkscreen-Regular', fontSize: 12, color: C.textDim },
  modalCD: { fontFamily: 'Silkscreen-Regular', fontSize: 12, color: '#FFA07A' },

  modalDesc: { fontFamily: 'Jersey10-Regular', fontSize: 18, color: 'rgba(255,243,218,0.82)', lineHeight: 22, marginBottom: 14 },

  modalStatBox: {
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 14, marginBottom: 12,
    borderWidth: 2, borderColor: 'rgba(74,57,23,0.6)',
  },
  modalStatLabel: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
    color: C.candleGold,
    letterSpacing: 1,
    marginBottom: 6,
  },
  modalStatHeader: {
    flexDirection: 'row',
    height: 36,
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 243, 218, 0.15)',
    marginBottom: 4,
  },
  modalStatHeaderLeft: {
    width: '72.22%',
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
    color: C.textDim,
  },
  modalStatHeaderRight: {
    width: '27.78%',
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
    textAlign: 'center',
  },
  modalStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 243, 218, 0.05)',
  },
  modalStatLine: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
    color: 'rgba(255,243,218,0.78)',
  },
  modalStatValCur: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
    color: C.text,
  },
  modalStatValNext: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
  },
  verticalDivider: {
    width: 1.5,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255, 243, 218, 0.12)',
    marginHorizontal: 8,
  },
  verticalDividerAbsolute: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: 'rgba(255, 243, 218, 0.12)',
    zIndex: 10,
  },

  modalCostBox: {
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 14, marginBottom: 12,
    borderWidth: 2, borderColor: 'rgba(74,57,23,0.6)',
  },
  modalCostLevelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 243, 218, 0.08)', marginBottom: 4,
  },
  modalCostLevelText: { fontFamily: 'Jersey10-Regular', fontSize: 18, color: 'rgba(255,243,218,0.72)' },
  modalCostLevelValue: { fontFamily: 'Jersey10-Regular', fontSize: 18 },
  modalCostMatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  modalCostMatName: { fontFamily: 'Jersey10-Regular', fontSize: 18, color: 'rgba(255,243,218,0.82)' },
  modalCostMatValue: { fontFamily: 'Jersey10-Regular', fontSize: 18 },

  modalInfoBox: {
    backgroundColor: 'rgba(255,100,0,0.08)', borderRadius: 8, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,100,0,0.25)',
  },
  modalInfoText: { fontFamily: 'Jersey10-Regular', fontSize: 18, color: '#FFA07A' },

  modalActions: { gap: 10, marginTop: 10 },

  primaryBtnWrapper: {
    width: '100%',
    height: 54,
    position: 'relative',
  },
  primaryBtnShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    height: 54,
    borderRadius: 8,
    zIndex: 1,
    backgroundColor: '#0D2118',
  },
  primaryBtnOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 54,
    borderRadius: 8,
    borderWidth: 2.2,
    borderColor: '#84735B',
    backgroundColor: '#4F3C1E',
    zIndex: 2,
  },
  primaryBtnInner: {
    flex: 1,
    margin: 1.5,
    borderRadius: 5,
    borderWidth: 2.2,
    borderTopColor: 'rgba(255, 255, 255, 0.35)',
    borderLeftColor: 'rgba(255, 255, 255, 0.35)',
    borderRightColor: 'rgba(255, 255, 255, 0.35)',
    borderBottomColor: 'rgba(0, 0, 0, 0.45)',
    borderBottomWidth: 3.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 12,
    color: '#FFF3DA',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    textTransform: 'uppercase',
  },

  disabledBtn: {
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3E2E15',
    backgroundColor: '#0F2417',
    opacity: 0.6,
  },
  disabledBtnText: { fontFamily: 'Silkscreen-Regular', fontSize: 12, color: C.textDim, textTransform: 'uppercase' },

  equipSection: {},
  equippedLabel: { fontFamily: 'Silkscreen-Regular', fontSize: 12, textAlign: 'center', letterSpacing: 0.5 },

  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    alignItems: 'flex-end',
  },
  modalActionCol: {
    flex: 1,
  },
  passiveBadge: {
    height: 54,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 243, 218, 0.15)',
    backgroundColor: 'rgba(255, 243, 218, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passiveBadgeText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: C.textDim,
  },
  slotAssignBtn: {
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#84735B',
    backgroundColor: '#2A1A0C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotAssignBtnText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 15,
    color: '#FFF3DA',
  },

  unequipBtnWrapper: {
    width: '100%',
    height: 54,
    position: 'relative',
  },
  unequipBtnShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 2.5,
    height: 54,
    borderRadius: 8,
    zIndex: 1,
    backgroundColor: '#4F3C1E',
  },
  unequipBtnOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 54,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#84735B',
    backgroundColor: '#4F3C1E',
    zIndex: 2,
  },
  unequipBtnInner: {
    flex: 1,
    margin: 1.5,
    borderRadius: 5,
    borderWidth: 2,
    borderTopColor: '#D8483F',
    borderLeftColor: '#D8483F',
    borderRightColor: '#D8483F',
    borderBottomColor: '#590D0E',
    borderBottomWidth: 3,
    backgroundColor: '#A61C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unequipBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 12,
    color: '#FFF3DA',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },

  equipPrompt: { fontFamily: 'Jersey10-Regular', fontSize: 16, color: C.textDim, textAlign: 'center', marginVertical: 4 },
  equipRow: { flexDirection: 'row', gap: 12, marginTop: 6 },

  equipSlotBtnWrapper: {
    flex: 1,
    height: 58,
    position: 'relative',
  },
  equipSlotBtnShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    height: 58,
    borderRadius: 8,
    zIndex: 1,
    backgroundColor: '#4F3C1E',
  },
  equipSlotBtnOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 58,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#84735B',
    backgroundColor: '#4F3C1E',
    zIndex: 2,
  },
  equipSlotBtnInner: {
    flex: 1,
    margin: 1.5,
    borderRadius: 5,
    borderWidth: 2,
    borderTopColor: '#4F856C',
    borderLeftColor: '#4F856C',
    borderRightColor: '#4F856C',
    borderBottomColor: '#0D2118',
    borderBottomWidth: 3,
    backgroundColor: '#1B4030',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  equipSlotBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 12,
    color: '#FFF3DA',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  equipSlotSub: { fontFamily: 'Jersey10-Regular', fontSize: 14, color: '#A8B8A0' },
  
  /* Element Tab Selector Styles */
  elementSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  elementTabWrapper: {
    width: (SCREEN_WIDTH - 40 - 3 * 10) / 4,
    aspectRatio: 1.05,
    position: 'relative',
  },
  elementTabShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    bottom: -3,
    borderRadius: 8,
    zIndex: 1,
  },
  elementTabOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
    borderWidth: 2.0,
    zIndex: 2,
  },
  elementTabInner: {
    flex: 1,
    margin: 1.5,
    borderRadius: 5,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  elementTabText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
});
