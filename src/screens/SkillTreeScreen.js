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

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
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
  bg:          '#133131',
  panel:       '#142C1C',
  panelDeep:   '#0F2417',
  plaqueDark:  '#4A3917',
  plaqueGold:  '#D4A754',
  plaqueBg:    '#1E1E20',
  parchment:   '#F3E2BD',
  candleGold:  '#E8A73A',
  text:        '#FFF3DA',
  textDim:     'rgba(255, 243, 218, 0.6)',
  textFaint:   'rgba(255, 243, 218, 0.32)',
  inkDark:     '#2A1A0C',
  good:        '#7CFFB2',
  bad:         '#FF8A8A',
};

// ─── Element metadata (colors + icons-1 sprite frames, as in onboarding) ───────

const ELEMENTS = [
  { id: 'fire',  label: 'FIRE',  color: '#FF6B35', frame: 33 },
  { id: 'water', label: 'WATER', color: '#3B9EFF', frame: 35 },
  { id: 'earth', label: 'EARTH', color: '#D4A754', frame: 36 },
  { id: 'wind',  label: 'WIND',  color: '#5CC4B8', frame: 34 },
];

const ELEMENT_COLORS = {
  fire:  '#FF6B35',
  water: '#3B9EFF',
  earth: '#D4A754',
  wind:  '#5CC4B8',
};

// ─── Crystal currency metadata (Zone 1 — Black Crystals) ──────────────────────

const CRYSTAL_INFO = {
  black_shard:         { name: 'Black Crystal Shard',  short: 'Shards',         icon: '🔹', color: '#8FA3FF' },
  black_crystal_small: { name: 'Small Black Crystal',  short: 'Small Crystals', icon: '🔷', color: '#6E8BFF' },
  black_crystal_big:   { name: 'Big Black Crystal',    short: 'Big Crystals',   icon: '💎', color: '#9B7CFF' },
  black_crystal_core:  { name: 'Black Crystal Core',   short: 'Crystal Core',   icon: '🌑', color: '#FFD700' },
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

// ─── Stat Labels & Formatters ──────────────────────────────────────────────────

const SKILL_STAT_LABELS = {
  damageMultiplier: 'Base Damage',
  burnDamage: 'Burn Damage / Turn',
  burnDuration: 'Burn Duration',
  burnTickBonus: 'Burn Damage Bonus',
  spreadPercent: 'Splash Damage',
  spreadBurnChance: 'Splash Burn Chance',
  counterBurnDamage: 'Counter Damage / Turn',
  counterBurnDuration: 'Counter Duration',
  guardDuration: 'Guard Duration',
  atkReduce: 'Attack Reduction',
  duration: 'Duration',
  spreadAtkReduceChance: 'Splash ATK Reduce Chance',
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
};

const formatSkillStatValue = (key, value) => {
  if (key === 'damageMultiplier') return `${Math.round(value * 100)}% ATK`;
  if (key === 'spreadPercent' || key === 'spreadBurnChance' || key === 'spreadAtkReduceChance' || key === 'atkReduce') {
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

  const handleOpenSkill = useCallback((skill) => {
    setSelectedSkill(skill);
    setActiveSkill(skill);
  }, []);

  const targetSkill = selectedSkill || activeSkill;
  const elementColor = ELEMENT_COLORS[element] || C.candleGold;
  const stanceBonus  = getStanceBonus(element, level);
  const stance       = STANCES[element];

  const activeTabElement = element || 'fire';
  const [viewingElement, setViewingElement] = useState(activeTabElement);

  useEffect(() => {
    if (element) setViewingElement(element);
  }, [element]);

  const viewColor = ELEMENT_COLORS[viewingElement] || C.candleGold;
  const elementSkillIds = ELEMENT_SKILLS[viewingElement] || [];

  // Group skill IDs by tier dynamically
  const tiers = [];
  const maxTier = Math.max(...elementSkillIds.map(id => SKILLS[id]?.tier || 1), 2);
  for (let t = 1; t <= maxTier; t++) {
    const tierIds = elementSkillIds.filter(id => SKILLS[id]?.tier === t);
    if (tierIds.length > 0) tiers.push(tierIds);
  }

  // Layout calculations
  const TREE_WIDTH = SCREEN_WIDTH - 40; // 20 padding on each side
  const CARD_GAP = 14;
  const CARD_HEIGHT = 132;
  const ROW_GAP = 58;
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
    dispatch({ type: 'UNLOCK_SKILL', payload: { skillId: targetSkill.id } });
    setSelectedSkill(null);
  }, [targetSkill, dispatch]);

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
          const isPathUnlocked = getStars(childSkill.unlockedBy) >= 5;
          const strokeColor = isPathUnlocked ? viewColor : 'rgba(74, 57, 23, 0.7)';
          paths.push(
            <React.Fragment key={`${childSkill.unlockedBy}->${childId}`}>
              {isPathUnlocked && (
                <Path d={pathData} fill="none" stroke={`${viewColor}40`} strokeWidth={6} strokeLinecap="round" />
              )}
              <Path d={pathData} fill="none" stroke={strokeColor} strokeWidth={2} strokeLinecap="round" />
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
    const isOwnedElement = viewingElement === element;

    let borderColor = 'rgba(74, 57, 23, 0.55)';
    let borderWidth = 2;
    let opacity = 1;
    let bg = C.panel;
    let nameColor = C.textDim;

    if (cardState === 'locked') {
      opacity = 0.62;
    } else if (cardState === 'available') {
      borderColor = C.candleGold;
      nameColor = C.candleGold;
    } else if (cardState === 'maxed') {
      borderColor = '#F5CF4A';
      nameColor = C.text;
      bg = '#1C2E1B';
    } else { // unlocked / equipped
      borderColor = viewColor;
      borderWidth = equipped ? 3 : 2;
      nameColor = C.text;
    }

    const isActive = skill.type === 'active';
    const badgeColor = isActive ? '#F08A4A' : '#5CC489';

    return (
      <TouchableOpacity
        key={skillId}
        style={[styles.skillCard, cardStyle, { borderColor, borderWidth, opacity, backgroundColor: bg }]}
        onPress={() => isOwnedElement && handleOpenSkill(skill)}
        activeOpacity={0.85}
        disabled={!isOwnedElement}
      >
        {/* Top row: sprite + badges */}
        <View style={styles.cardHeader}>
          <SkillSprite
            skillId={skillId}
            size={38}
            glow={cardState === 'unlocked' || cardState === 'maxed' || cardState === 'available'}
            glowColor={cardState === 'available' ? C.candleGold : viewColor}
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
            {cardState !== 'maxed' && (() => {
              const nextCost = getSkillUpgradeCost(skill, stars + 1);
              if (!nextCost) return null;
              const [matId, matQty] = Object.entries(nextCost.materials)[0];
              return (
                <View style={styles.cardCostRow}>
                  <Text style={styles.cardCostLabel}>★{stars + 1}</Text>
                  {MATERIALS[matId]?.spritesheet ? (
                    <ItemSprite spritesheet={MATERIALS[matId].spritesheet} frameIndex={MATERIALS[matId].frameIndex} displaySize={11} />
                  ) : (
                    <Text style={{ fontSize: 9 }}>{CRYSTAL_INFO[matId]?.icon}</Text>
                  )}
                  <Text style={styles.cardCostText} numberOfLines={1}>
                    {matQty}{Object.keys(nextCost.materials).length > 1 ? '+' : ''} · LV{nextCost.requiredLevel}
                  </Text>
                </View>
              );
            })()}
          </View>
        ) : cardState === 'available' ? (() => {
          const cost = getSkillUpgradeCost(skill, 1);
          const [matId, matQty] = Object.entries(cost.materials)[0];
          return (
            <View style={styles.cardCostRow}>
              <Text style={[styles.cardCostLabel, { color: C.candleGold }]}>UNLOCK</Text>
              {MATERIALS[matId]?.spritesheet ? (
                <ItemSprite spritesheet={MATERIALS[matId].spritesheet} frameIndex={MATERIALS[matId].frameIndex} displaySize={11} />
              ) : (
                <Text style={{ fontSize: 9 }}>{CRYSTAL_INFO[matId]?.icon}</Text>
              )}
              <Text style={[styles.cardCostText, { color: C.candleGold }]} numberOfLines={1}>
                {matQty} · LV{cost.requiredLevel}
              </Text>
            </View>
          );
        })() : (
          <Text style={styles.cardLockText} numberOfLines={1}>
            {(() => {
              const check = canUnlockElementSkill(skillId, hero);
              if (check.cost && hero.level < check.cost.requiredLevel) return `🔒 LV ${check.cost.requiredLevel}`;
              return '🔒 LOCKED';
            })()}
          </Text>
        )}

        {isActive && skill.cooldown > 0 && (
          <Text style={styles.cardCooldown}>⏳ {skill.cooldown}-TURN CD</Text>
        )}
      </TouchableOpacity>
    );
  };

  // ── Selected skill modal data ──────────────────────────────────────────────

  const selectedCardState = targetSkill ? getCardState(targetSkill.id) : null;
  const selectedStars     = targetSkill ? getStars(targetSkill.id) : 0;
  const selectedEquipped  = targetSkill ? isEquipped(targetSkill.id) : false;
  const equippedSlot      = targetSkill ? equippedSkills.indexOf(targetSkill.id) : -1;

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← Hub</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <ItemSprite spritesheet="icons-1" frameIndex={4} displaySize={24} />
          <Text style={styles.titleText}>Skill Tree</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Crystal stash bar ─────────────────────────────────────────────── */}
      <View style={styles.crystalBar}>
        {CRYSTAL_ORDER.map((itemId) => {
          const info = CRYSTAL_INFO[itemId];
          const owned = materials[itemId] || 0;
          return (
            <View key={itemId} style={styles.crystalChip}>
              {MATERIALS[itemId]?.spritesheet ? (
                <ItemSprite spritesheet={MATERIALS[itemId].spritesheet} frameIndex={MATERIALS[itemId].frameIndex} displaySize={15} />
              ) : (
                <Text style={styles.crystalChipIcon}>{info.icon}</Text>
              )}
              <Text style={styles.crystalChipCount}>{owned}</Text>
            </View>
          );
        })}
      </View>

      {/* ── Element tabs ───────────────────────────────────────────────── */}
      <View style={styles.tabs}>
        {ELEMENTS.map((el) => {
          const isOwned   = el.id === element;
          const isViewing = el.id === viewingElement;
          return (
            <TouchableOpacity key={el.id} style={styles.tab} onPress={() => setViewingElement(el.id)} activeOpacity={0.8}>
              <View style={{ opacity: isOwned ? 1 : 0.4 }}>
                <ItemSprite spritesheet="icons-1" frameIndex={el.frame} displaySize={22} />
              </View>
              <Text style={[styles.tabLabel, { color: isViewing ? el.color : isOwned ? C.textDim : C.textFaint }]}>
                {el.label}
              </Text>
              <View style={[styles.tabIndicator, { backgroundColor: isViewing ? el.color : 'transparent' }]} />
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Stance card ──────────────────────────────────────────────── */}
        {stance && viewingElement === element && (
          <View style={[styles.stanceCard, { borderColor: `${elementColor}70` }]}>
            <View style={styles.stanceLeft}>
              <Text style={styles.stanceLabel}>INNATE · ALWAYS ACTIVE</Text>
              <Text style={[styles.stanceName, { color: elementColor }]}>{stance.name}</Text>
              <Text style={styles.stanceDesc}>{stance.description}</Text>
            </View>
            <View style={styles.stanceRight}>
              {stanceBonus.atkPercent !== undefined && (
                <Text style={[styles.stanceStat, { color: elementColor }]}>+{Math.round(stanceBonus.atkPercent * 100)}% ATK</Text>
              )}
              {stanceBonus.burnTickBonus !== undefined && (
                <Text style={[styles.stanceStat, { color: elementColor }]}>+{stanceBonus.burnTickBonus} burn/tick</Text>
              )}
              {stanceBonus.maxHpPercent !== undefined && (
                <>
                  <Text style={[styles.stanceStat, { color: elementColor }]}>+{Math.round(stanceBonus.maxHpPercent * 100)}% max HP</Text>
                  <Text style={[styles.stanceSubStat, { color: elementColor }]}>(currently +{Math.floor((hero.maxHp || 50) * stanceBonus.maxHpPercent)} HP)</Text>
                </>
              )}
              {stanceBonus.defBonus !== undefined && (
                <>
                  <Text style={[styles.stanceStat, { color: elementColor }]}>+{stanceBonus.defBonus} DEF</Text>
                  <Text style={[styles.stanceSubStat, { color: elementColor }]}>(+1 DEF / level)</Text>
                </>
              )}
              {stanceBonus.agiBonus !== undefined && (
                <>
                  <Text style={[styles.stanceStat, { color: elementColor }]}>+{stanceBonus.agiBonus} AGI</Text>
                  <Text style={[styles.stanceSubStat, { color: elementColor }]}>+{(stanceBonus.agiBonus * 0.5).toFixed(1)}% crit · dodge</Text>
                </>
              )}
            </View>
          </View>
        )}

        {/* Placeholder notice for non-owned elements */}
        {viewingElement !== element && (
          <View style={styles.placeholderBanner}>
            <Text style={styles.placeholderText}>
              You chose {ELEMENTS.find(e => e.id === element)?.label || 'another element'}. These skills are not available in your current run.
            </Text>
          </View>
        )}

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
      <View style={[styles.dock, { paddingBottom: insets.bottom + 10 }]}>
        <Text style={styles.dockTitle}>★ EQUIPPED LOADOUT ★</Text>
        <View style={styles.dockRow}>
          {[0, 1].map((slotIdx) => {
            const skillId = equippedSkills[slotIdx];
            const sk = skillId ? SKILLS[skillId] : null;
            return (
              <TouchableOpacity
                key={slotIdx}
                style={[styles.dockSlot, sk ? { borderColor: elementColor } : styles.dockSlotEmpty]}
                onPress={() => sk && handleOpenSkill(sk)}
                activeOpacity={0.85}
                disabled={!sk}
              >
                {sk ? (
                  <SkillSprite skillId={sk.id} size={34} glow glowColor={elementColor} />
                ) : (
                  <View style={styles.dockEmptyIcon}>
                    {slotIdx === 0 ? (
                      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="rgba(255,243,218,0.3)" strokeWidth={1.5}>
                        <Path d="M4 20l16-16M5 15l4 4M20 20L4 4M19 15l-4 4" strokeLinecap="round" />
                      </Svg>
                    ) : (
                      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="rgba(255,243,218,0.3)" strokeWidth={1.5}>
                        <Path d="M12 3C12 3 5 5 5 11C5 16.5 12 21 12 21C12 21 19 16.5 19 11C19 5 12 3 12 3Z" strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    )}
                  </View>
                )}
                <View style={styles.dockSlotText}>
                  <Text style={styles.dockSlotLabel}>SLOT {slotIdx + 1}</Text>
                  <Text style={[styles.dockSlotName, { color: sk ? C.text : C.textFaint }]} numberOfLines={1}>
                    {sk ? sk.name : 'Empty'}
                  </Text>
                  <Text style={styles.dockSlotType}>{sk ? (sk.type === 'passive' ? 'Passive' : 'Active') : 'Tap a skill to equip'}</Text>
                </View>
              </TouchableOpacity>
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
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedSkill(null)}>
          <Pressable style={styles.modalCardOuter}>
            <View style={[styles.modalCardInner, { borderColor: `${elementColor}80` }]}>
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
                          <Text style={styles.modalCD}>⏳ {targetSkill.cooldown}-TURN CD</Text>
                        )}
                      </View>
                      {selectedStars > 0 && <Stars count={selectedStars} color={elementColor} size={13} />}
                    </View>
                  </View>

                  <Text style={styles.modalDesc}>{targetSkill.description}</Text>

                  {/* Current stats */}
                  {currentStarData && (
                    <View style={styles.modalStatBox}>
                      <Text style={styles.modalStatLabel}>★{selectedStars} CURRENT STATS</Text>
                      {Object.entries(currentStarData).map(([k, v]) => (
                        <Text key={k} style={styles.modalStatLine}>
                          {SKILL_STAT_LABELS[k] || k}: <Text style={styles.modalStatStrong}>{formatSkillStatValue(k, v)}</Text>
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Next star preview */}
                  {nextStarData && selectedStars < 5 && (
                    <View style={[styles.modalStatBox, { borderColor: `${elementColor}55` }]}>
                      <Text style={[styles.modalStatLabel, { color: elementColor }]}>★{selectedStars + 1} NEXT STAR</Text>
                      {Object.entries(nextStarData).map(([k, v]) => (
                        <Text key={k} style={styles.modalStatLine}>
                          {SKILL_STAT_LABELS[k] || k}: <Text style={styles.modalStatStrong}>{formatSkillStatValue(k, v)}</Text>
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Cost breakdown */}
                  {relevantCost && (
                    <View style={styles.modalCostBox}>
                      <Text style={styles.modalStatLabel}>
                        {selectedCardState === 'available' ? 'UNLOCK ★1 COST' : `★${selectedStars + 1} UPGRADE COST`}
                      </Text>
                      <View style={styles.modalCostLevelRow}>
                        <Text style={styles.modalCostLevelText}>Hero Level</Text>
                        <Text style={[styles.modalCostLevelValue, { color: hero.level >= relevantCost.requiredLevel ? C.good : C.bad }]}>
                          {hero.level} / {relevantCost.requiredLevel}
                        </Text>
                      </View>
                      {Object.entries(relevantCost.materials).map(([itemId, qty]) => {
                        const owned = materials[itemId] || 0;
                        const enough = owned >= qty;
                        const info = CRYSTAL_INFO[itemId] || { icon: '✨', name: itemId };
                        return (
                          <View key={itemId} style={styles.modalCostMatRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              {MATERIALS[itemId]?.spritesheet ? (
                                <ItemSprite spritesheet={MATERIALS[itemId].spritesheet} frameIndex={MATERIALS[itemId].frameIndex} displaySize={14} />
                              ) : (
                                <Text style={{ fontSize: 12 }}>{info.icon}</Text>
                              )}
                              <Text style={styles.modalCostMatName}>{info.name}</Text>
                            </View>
                            <Text style={[styles.modalCostMatValue, { color: enough ? C.good : C.bad }]}>{owned} / {qty}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Unlock requirement info */}
                  {selectedCardState === 'locked' && unlockCheck && (
                    <View style={styles.modalInfoBox}>
                      <Text style={styles.modalInfoText}>🔒 {unlockCheck.reason}</Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.modalActions}>
                    {selectedCardState === 'available' && (
                      <GradientButton color={elementColor} label="UNLOCK ★1" onPress={handleUnlock} />
                    )}

                    {selectedCardState === 'unlocked' && starUpCheck?.can && (
                      <GradientButton color={elementColor} label={`★ STAR UP → ★${selectedStars + 1}`} onPress={handleStarUp} />
                    )}

                    {selectedCardState === 'unlocked' && !starUpCheck?.can && selectedStars < 5 && (
                      <View style={styles.disabledBtn}>
                        <Text style={styles.disabledBtnText}>{starUpCheck?.reason}</Text>
                      </View>
                    )}

                    {selectedCardState === 'maxed' && (
                      <View style={[styles.disabledBtn, { borderColor: '#F5CF4A80' }]}>
                        <Text style={[styles.disabledBtnText, { color: '#F5CF4A' }]}>★★★★★ MAX STAR</Text>
                      </View>
                    )}

                    {(selectedCardState === 'unlocked' || selectedCardState === 'maxed') && (
                      <View style={styles.equipSection}>
                        {selectedEquipped ? (
                          <>
                            <Text style={[styles.equippedLabel, { color: elementColor }]}>✓ EQUIPPED IN SLOT {equippedSlot + 1}</Text>
                            <TouchableOpacity style={styles.unequipBtn} onPress={() => handleUnequip(equippedSlot)}>
                              <Text style={styles.unequipBtnText}>UNEQUIP</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <>
                            <Text style={styles.equipPrompt}>Assign skill to slot:</Text>
                            <View style={styles.equipRow}>
                              {[0, 1].map((si) => {
                                const occupant = equippedSkills[si] ? SKILLS[equippedSkills[si]]?.name : 'Empty';
                                return (
                                  <TouchableOpacity key={si} style={styles.equipSlotBtn} onPress={() => handleEquip(si)}>
                                    <Text style={styles.equipSlotBtnText}>SLOT {si + 1}</Text>
                                    <Text style={styles.equipSlotSub} numberOfLines={1}>({occupant})</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Gradient action button (mirrors onboarding modal confirm) ────────────────

function GradientButton({ color, label, onPress }) {
  return (
    <TouchableOpacity style={[styles.primaryBtn, { shadowColor: color }]} onPress={onPress} activeOpacity={0.85}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id={`btn-${label.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor={`${color}99`} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#btn-${label.replace(/[^a-z0-9]/gi, '')})`} rx={10} />
      </Svg>
      <Text style={styles.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll:    { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  backBtn: { width: 70, paddingVertical: 6 },
  backText: { color: '#D4A754', fontFamily: 'PixelifySans-Medium', fontSize: 16, letterSpacing: 0.5 },
  titleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  titleText: { fontFamily: 'PixelifySans-Medium', fontSize: 20, color: '#F8FAFC', letterSpacing: 0.8 },
  headerSpacer: { width: 70 },

  /* Crystal stash bar */
  crystalBar: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    marginHorizontal: 20, paddingVertical: 8, paddingHorizontal: 8,
    backgroundColor: C.panelDeep, borderRadius: 10,
    borderWidth: 2, borderColor: 'rgba(74,57,23,0.6)',
  },
  crystalChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 6 },
  crystalChipIcon:  { fontSize: 13 },
  crystalChipCount: { fontFamily: 'Silkscreen-Regular', fontSize: 11, color: C.text },

  /* Tabs */
  tabs: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 12,
    borderBottomWidth: 2, borderBottomColor: 'rgba(74,57,23,0.6)',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 3 },
  tabLabel: { fontFamily: 'Silkscreen-Regular', fontSize: 9, letterSpacing: 0.5 },
  tabIndicator: { width: 26, height: 3, borderRadius: 1.5, marginTop: 4 },

  /* Stance card */
  stanceCard: {
    flexDirection: 'row', borderRadius: 12, borderWidth: 2, overflow: 'hidden',
    backgroundColor: C.panel, marginBottom: 16, padding: 14, gap: 12,
  },
  stanceLeft:  { flex: 1 },
  stanceRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 3 },
  stanceLabel: { fontFamily: 'Silkscreen-Regular', fontSize: 8, letterSpacing: 1.2, color: C.textDim, marginBottom: 5 },
  stanceName:  { fontFamily: 'PixelifySans-Medium', fontSize: 17, marginBottom: 5 },
  stanceDesc:  { fontFamily: 'PixelifySans-Regular', fontSize: 12, color: 'rgba(255,243,218,0.78)', lineHeight: 16 },
  stanceStat:  { fontFamily: 'PixelifySans-Medium', fontSize: 14 },
  stanceSubStat: { fontFamily: 'PixelifySans-Regular', fontSize: 10, opacity: 0.8 },

  placeholderBanner: {
    backgroundColor: C.panel, borderRadius: 10, padding: 12,
    borderWidth: 2, borderColor: 'rgba(74,57,23,0.6)', marginBottom: 16,
  },
  placeholderText: { fontFamily: 'PixelifySans-Regular', fontSize: 12, color: C.textDim, textAlign: 'center', lineHeight: 17 },

  /* Skill Tree Grid */
  treeContainer: { width: '100%', position: 'relative', marginVertical: 10 },
  treeRow: { flexDirection: 'row', justifyContent: 'space-between' },

  /* Skill cards */
  skillCard: {
    borderRadius: 12, padding: 10, overflow: 'hidden',
    justifyContent: 'space-between',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardBadgeCol: { alignItems: 'flex-end', gap: 4 },
  cardName: { fontFamily: 'PixelifySans-Medium', fontSize: 14, lineHeight: 16, marginTop: 2 },
  cardLockText: { fontFamily: 'Silkscreen-Regular', fontSize: 9, color: C.textFaint },
  cardCostRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardCostLabel: { fontFamily: 'Silkscreen-Regular', fontSize: 8, color: C.textDim },
  cardCostText: { fontFamily: 'Silkscreen-Regular', fontSize: 8, color: C.textDim },
  cardCooldown: { fontFamily: 'Silkscreen-Regular', fontSize: 8, color: '#FFA07A' },

  typeBadge: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  typeBadgeText: { fontFamily: 'Silkscreen-Regular', fontSize: 7, letterSpacing: 0.3 },
  equippedBadge: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1.5, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  equippedBadgeText: { fontFamily: 'Silkscreen-Regular', fontSize: 6.5, letterSpacing: 0.3 },

  /* Pinned loadout dock */
  dock: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10,
    backgroundColor: C.panelDeep,
    borderTopWidth: 2, borderTopColor: 'rgba(74,57,23,0.7)',
  },
  dockTitle: {
    fontFamily: 'Silkscreen-Regular', fontSize: 11, letterSpacing: 1.5,
    color: C.candleGold, textAlign: 'center', marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  dockRow: { flexDirection: 'row', gap: 10 },
  dockSlot: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 2, borderRadius: 10, backgroundColor: C.panel,
    paddingVertical: 8, paddingHorizontal: 10, minHeight: 58,
  },
  dockSlotEmpty: { borderColor: 'rgba(74,57,23,0.7)', borderStyle: 'dashed', backgroundColor: 'transparent' },
  dockEmptyIcon: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center', opacity: 0.8 },
  dockSlotText: { flex: 1 },
  dockSlotLabel: { fontFamily: 'Silkscreen-Regular', fontSize: 7.5, letterSpacing: 0.8, color: C.textFaint, marginBottom: 1 },
  dockSlotName: { fontFamily: 'PixelifySans-Medium', fontSize: 13 },
  dockSlotType: { fontFamily: 'PixelifySans-Regular', fontSize: 10, color: C.textDim, marginTop: 1 },

  /* Modal */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCardOuter: {
    width: '100%', maxWidth: 360, borderRadius: 16, padding: 3,
    borderWidth: 3, borderColor: C.plaqueDark, backgroundColor: C.plaqueDark,
  },
  modalCardInner: { borderRadius: 12, borderWidth: 2, backgroundColor: C.plaqueBg, overflow: 'hidden' },
  modalInner: { padding: 20 },
  modalCloseBtn: { position: 'absolute', top: 10, right: 14, padding: 6, zIndex: 10 },
  modalCloseText: { fontFamily: 'PixelifySans-Medium', fontSize: 16, color: C.textDim },

  modalTitleRow: { flexDirection: 'row', gap: 12, marginBottom: 12, marginTop: 4, alignItems: 'flex-start' },
  modalTitleRight: { flex: 1 },
  modalSkillName: { fontFamily: 'PixelifySans-Medium', fontSize: 20, color: C.text, marginBottom: 6 },
  modalBadges: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 },
  modalTier: { fontFamily: 'Silkscreen-Regular', fontSize: 9, color: C.textDim },
  modalCD: { fontFamily: 'Silkscreen-Regular', fontSize: 9, color: '#FFA07A' },

  modalDesc: { fontFamily: 'PixelifySans-Regular', fontSize: 13, color: 'rgba(255,243,218,0.82)', lineHeight: 18, marginBottom: 14 },

  modalStatBox: {
    backgroundColor: C.panelDeep, borderRadius: 10, padding: 10, marginBottom: 10,
    borderWidth: 2, borderColor: 'rgba(74,57,23,0.6)',
  },
  modalStatLabel: { fontFamily: 'Silkscreen-Regular', fontSize: 8.5, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
  modalStatLine: { fontFamily: 'PixelifySans-Regular', fontSize: 12, color: 'rgba(255,243,218,0.78)', marginBottom: 2 },
  modalStatStrong: { fontFamily: 'PixelifySans-Medium', color: C.text },

  modalCostBox: {
    backgroundColor: C.panelDeep, borderRadius: 10, padding: 10, marginBottom: 12,
    borderWidth: 2, borderColor: 'rgba(74,57,23,0.6)',
  },
  modalCostLevelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(74,57,23,0.5)', marginBottom: 4,
  },
  modalCostLevelText: { fontFamily: 'PixelifySans-Regular', fontSize: 12, color: 'rgba(255,243,218,0.72)' },
  modalCostLevelValue: { fontFamily: 'PixelifySans-Medium', fontSize: 12 },
  modalCostMatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  modalCostMatName: { fontFamily: 'PixelifySans-Regular', fontSize: 12, color: 'rgba(255,243,218,0.82)' },
  modalCostMatValue: { fontFamily: 'PixelifySans-Medium', fontSize: 12 },

  modalInfoBox: {
    backgroundColor: 'rgba(255,100,0,0.08)', borderRadius: 8, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,100,0,0.25)',
  },
  modalInfoText: { fontFamily: 'PixelifySans-Regular', fontSize: 12, color: '#FFA07A' },

  modalActions: { gap: 10, marginTop: 6 },
  primaryBtn: {
    height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  primaryBtnText: { fontFamily: 'PixelifySans-Medium', fontSize: 15, color: '#1A1200', zIndex: 2, letterSpacing: 0.3 },

  disabledBtn: {
    height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(74,57,23,0.6)', backgroundColor: C.panelDeep,
  },
  disabledBtnText: { fontFamily: 'Silkscreen-Regular', fontSize: 11, color: C.textDim },

  equipSection: { gap: 8 },
  equippedLabel: { fontFamily: 'Silkscreen-Regular', fontSize: 11, textAlign: 'center', letterSpacing: 0.5 },
  unequipBtn: {
    height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(74,57,23,0.6)', backgroundColor: C.panel,
  },
  unequipBtnText: { fontFamily: 'Silkscreen-Regular', fontSize: 11, color: C.textDim },
  equipPrompt: { fontFamily: 'PixelifySans-Regular', fontSize: 12, color: C.textDim, textAlign: 'center' },
  equipRow: { flexDirection: 'row', gap: 10 },
  equipSlotBtn: {
    flex: 1, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(74,57,23,0.7)', backgroundColor: C.panel, gap: 2,
  },
  equipSlotBtnText: { fontFamily: 'Silkscreen-Regular', fontSize: 10, color: C.text },
  equipSlotSub: { fontFamily: 'PixelifySans-Regular', fontSize: 10, color: C.textDim },
});
