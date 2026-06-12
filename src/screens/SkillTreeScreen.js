/**
 * SkillTreeScreen.js — Element-based Skill Tree
 *
 * Layout per element:
 *   - Element tabs at top (Fire active, others greyed)
 *   - Stance card (always-on innate, scales with level)
 *   - Two-column skill grid:
 *       Left  — Active skills (T1 active → T2A, T2B side by side)
 *       Right — Passive skills (T1 passive, standalone)
 *   - Skill card states: locked / available / unlocked / maxed / equipped
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Path } from 'react-native-svg';

import { useGame } from '../state/gameState';
import { SKILLS, ELEMENT_SKILLS, canUnlockElementSkill, canStarUpSkill, getSkillUpgradeCost } from '../data/skills';
import { STANCES, getStanceBonus } from '../logic/progressionEngine';
import ItemSprite from '../components/ItemSprite';
import { MATERIALS } from '../data/gear';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Element metadata ─────────────────────────────────────────────────────────

const ELEMENTS = [
  { id: 'fire',  label: 'Fire',  icon: '🔥', color: '#FF6B35', available: true  },
  { id: 'water', label: 'Water', icon: '💧', color: '#3B9EFF', available: true  },
  { id: 'earth', label: 'Earth', icon: '⛰️', color: '#639922', available: true  },
  { id: 'wind',  label: 'Wind',  icon: '🌪️', color: '#7F77DD', available: true  },
];

const ELEMENT_COLORS = {
  fire:  '#FF6B35',
  water: '#3B9EFF',
  earth: '#639922',
  wind:  '#7F77DD',
};

// ─── Crystal currency metadata (Zone 1 — Black Crystals) ──────────────────────

const CRYSTAL_INFO = {
  black_shard:         { name: 'Black Crystal Shard',  short: 'Shards',       icon: '🔹', color: '#8FA3FF' },
  black_crystal_small: { name: 'Small Black Crystal',  short: 'Small Crystals', icon: '🔷', color: '#6E8BFF' },
  black_crystal_big:   { name: 'Big Black Crystal',    short: 'Big Crystals', icon: '💎', color: '#9B7CFF' },
  black_crystal_core:  { name: 'Black Crystal Core',   short: 'Crystal Core', icon: '🌑', color: '#FFD700' },
};

const CRYSTAL_ORDER = ['black_shard', 'black_crystal_small', 'black_crystal_big', 'black_crystal_core'];

// Stars display
function Stars({ count, max = 5, color = '#FFD700' }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2, marginTop: 4 }}>
      {Array.from({ length: max }, (_, i) => (
        <Text key={i} style={{ color: i < count ? color : 'rgba(255,255,255,0.12)', fontSize: 11 }}>
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
  // Water stats
  atkReduce: 'Attack Reduction',
  duration: 'Duration',
  spreadAtkReduceChance: 'Splash ATK Reduce Chance',
  healPerTurn: 'Healing / Turn',
  cooldown: 'Cooldown',
  healingEfficiency: 'Healing Efficiency',
  // Earth stats
  stunChance: 'Stun Chance',
  defBoostPercent: 'DEF Boost',
  reflectPercent: 'Reflect (raw damage)',
  statusResistChance: 'Status Resistance',
  // Wind stats
  dodgeBonus: 'Dodge Bonus',
  bonusCritChance: 'Bonus Crit Chance (per hit)',
  critMultiplier: 'Crit Damage Multiplier',
};

const formatSkillStatValue = (key, value) => {
  if (key === 'damageMultiplier') {
    return `${Math.round(value * 100)}% ATK`;
  }
  if (key === 'spreadPercent' || key === 'spreadBurnChance' || key === 'spreadAtkReduceChance' || key === 'atkReduce') {
    return `${Math.round(value * 100)}%`;
  }
  if (key === 'healingEfficiency') {
    return `+${Math.round(value * 100)}%`;
  }
  if (key === 'healPerTurn') {
    return `${Math.round(value * 100)}% Max HP (${Math.round(value * 300)}% Max HP total)`;
  }
  if (key === 'burnDuration' || key === 'counterBurnDuration' || key === 'guardDuration' || key === 'duration' || key === 'cooldown') {
    return `${value} ${value === 1 ? 'turn' : 'turns'}`;
  }
  // Earth stats
  if (key === 'stunChance' || key === 'defBoostPercent' || key === 'reflectPercent' || key === 'statusResistChance') {
    return `${Math.round(value * 100)}%`;
  }
  // Wind stats
  if (key === 'dodgeBonus' || key === 'bonusCritChance') {
    return `+${Math.round(value * 100)}%`;
  }
  if (key === 'critMultiplier') {
    return `${Math.round(value * 100)}% (replaces base 150%)`;
  }
  return value;
};

// ─── Main component ──────────────────────────────────────────────────────────

export default function SkillTreeScreen() {
  const navigation = useNavigation();
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
  const elementColor = ELEMENT_COLORS[element] || '#D4A754';
  const stanceBonus  = getStanceBonus(element, level);
  const stance       = STANCES[element];

  // The player's element tab is always shown first; others visible but locked
  const activeTabElement = element || 'fire';
  const [viewingElement, setViewingElement] = useState(activeTabElement);

  // Sync viewingElement to player's element when it finishes loading from AsyncStorage
  useEffect(() => {
    if (element) {
      setViewingElement(element);
    }
  }, [element]);

  // Skills for the currently viewed element
  const elementSkillIds = ELEMENT_SKILLS[viewingElement] || [];

  // Group skill IDs by tier dynamically
  const tiers = [];
  const maxTier = Math.max(...elementSkillIds.map(id => SKILLS[id]?.tier || 1), 2);
  for (let t = 1; t <= maxTier; t++) {
    const tierIds = elementSkillIds.filter(id => SKILLS[id]?.tier === t);
    if (tierIds.length > 0) {
      tiers.push(tierIds);
    }
  }

  // Layout calculations
  const TREE_WIDTH = SCREEN_WIDTH - 32; // 16 padding on each side
  const CARD_GAP = 16;
  const CARD_HEIGHT = 120;
  const ROW_GAP = 60;
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

  // Calculate coordinates for SVG lines
  const getSkillCoordinates = useCallback((skillId) => {
    let rIndex = -1;
    let cIndex = -1;
    let numColumns = 0;
    
    for (let r = 0; r < tiers.length; r++) {
      const colIdx = tiers[r].indexOf(skillId);
      if (colIdx !== -1) {
        rIndex = r;
        cIndex = colIdx;
        numColumns = tiers[r].length;
        break;
      }
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

  // ── Render SVG Connector Lines ────────────────────────────────────────────

  const renderSVGConnectors = () => {
    const paths = [];
    
    elementSkillIds.forEach(childId => {
      const childSkill = SKILLS[childId];
      if (childSkill && childSkill.unlockedBy) {
        const parentId = childSkill.unlockedBy;
        const parentCoords = getSkillCoordinates(parentId);
        const childCoords = getSkillCoordinates(childId);
        
        if (parentCoords && childCoords) {
          const x1 = parentCoords.x;
          const y1 = parentCoords.yBottom;
          const x2 = childCoords.x;
          const y2 = childCoords.yTop;
          
          const midY = y1 + (y2 - y1) / 2;
          const pathData = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
          
          const parentStars = getStars(parentId);
          const isPathUnlocked = parentStars >= 5;
          const elColor = ELEMENT_COLORS[viewingElement] || '#D4A754';
          
          const strokeColor = isPathUnlocked ? elColor : 'rgba(255,255,255,0.06)';
          const glowColor = isPathUnlocked ? `${elColor}33` : 'transparent';
          
          paths.push(
            <React.Fragment key={`${parentId}->${childId}`}>
              {isPathUnlocked && (
                <Path
                  d={pathData}
                  fill="none"
                  stroke={glowColor}
                  strokeWidth={6}
                  strokeLinecap="round"
                />
              )}
              <Path
                d={pathData}
                fill="none"
                stroke={strokeColor}
                strokeWidth={2}
                strokeLinecap="round"
              />
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
    const elColor = ELEMENT_COLORS[viewingElement] || '#D4A754';

    let borderColor = 'rgba(255,255,255,0.12)';
    let opacity = 1;
    let cardBg = 'rgba(25, 27, 36, 0.95)'; // Lighter slate grey for better contrast
    let nameColor = 'rgba(255, 255, 255, 0.55)'; // Brighter locked text
    
    if (cardState === 'locked') {
      borderColor = 'rgba(255,255,255,0.06)';
      opacity = 0.65; // Brighter opacity
    } else if (cardState === 'available') {
      borderColor = '#FFC107'; // Bright gold border
      nameColor = '#FFC107';
    } else if (cardState === 'maxed') {
      borderColor = '#FFD700'; // Gold border for maxed
      nameColor = '#FFFFFF';
    } else { // Unlocked / Equipped
      borderColor = equipped ? elColor : `${elColor}90`;
      nameColor = '#FFFFFF';
    }

    const typeBadgeColor = skill.type === 'active' ? '#FF5555' : '#00F0D0';
    const typeBadgeBg = skill.type === 'active' ? 'rgba(255, 85, 85, 0.15)' : 'rgba(0, 240, 208, 0.15)';
    const typeBadgeBorder = skill.type === 'active' ? 'rgba(255, 85, 85, 0.35)' : 'rgba(0, 240, 208, 0.35)';

    const renderCardBackground = () => {
      let gradColor = 'transparent';
      let fillOpacity = 0;
      
      if (equipped) {
        gradColor = elColor;
        fillOpacity = 0.22;
      } else if (cardState === 'maxed') {
        gradColor = '#FFD700';
        fillOpacity = 0.18;
      } else if (cardState === 'available') {
        gradColor = '#FFC107';
        fillOpacity = 0.14;
      } else if (cardState === 'unlocked') {
        gradColor = elColor;
        fillOpacity = 0.10;
      }

      return (
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <RadialGradient id={`rg_${skillId}`} cx="50%" cy="50%" rx="70%" ry="70%">
              <Stop offset="0%" stopColor={gradColor} stopOpacity={fillOpacity} />
              <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#rg_${skillId})`} rx={12} />
        </Svg>
      );
    };

    return (
      <TouchableOpacity
        key={skillId}
        style={[styles.skillCard, cardStyle, { borderColor, opacity, backgroundColor: cardBg }]}
        onPress={() => (viewingElement === element) && handleOpenSkill(skill)}
        activeOpacity={0.8}
        disabled={viewingElement !== element}
      >
        {renderCardBackground()}

        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>{skill.icon || '✨'}</Text>
          <View style={styles.cardBadgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeBadgeBg, borderColor: typeBadgeBorder }]}>
              <Text style={[styles.typeBadgeText, { color: typeBadgeColor }]}>
                {skill.type === 'active' ? 'ACTIVE' : 'PASSIVE'}
              </Text>
            </View>
            {equipped && (
              <View style={[styles.equippedBadge, { backgroundColor: `${elColor}25`, borderColor: elColor }]}>
                <Text style={[styles.equippedBadgeText, { color: elColor }]}>EQUIPPED</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.cardName, { color: nameColor }]} numberOfLines={1}>
          {skill.name}
        </Text>

        {stars > 0 ? (
          <>
            <Stars count={stars} color={cardState === 'maxed' ? '#FFD700' : elColor} />
            {cardState !== 'maxed' && (() => {
              const nextCost = getSkillUpgradeCost(skill, stars + 1);
              if (!nextCost) return null;
              const [matId, matQty] = Object.entries(nextCost.materials)[0];
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                  <Text style={[styles.cardCostText, { marginTop: 0 }]}>★{stars + 1}:</Text>
                  {MATERIALS[matId]?.spritesheet ? (
                    <ItemSprite
                      spritesheet={MATERIALS[matId].spritesheet}
                      frameIndex={MATERIALS[matId].frameIndex}
                      displaySize={10}
                    />
                  ) : (
                    <Text style={{ fontSize: 9 }}>{CRYSTAL_INFO[matId]?.icon}</Text>
                  )}
                  <Text style={[styles.cardCostText, { marginTop: 0 }]} numberOfLines={1}>
                    {matQty}{Object.keys(nextCost.materials).length > 1 ? '+' : ''} · Lv.{nextCost.requiredLevel}
                  </Text>
                </View>
              );
            })()}
          </>
        ) : (
          <>
            {cardState === 'available' ? (() => {
              const cost = getSkillUpgradeCost(skill, 1);
              const [matId, matQty] = Object.entries(cost.materials)[0];
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                  <Text style={[styles.cardLockText, { color: '#FFC107', fontWeight: 'bold', marginTop: 0 }]}>🔓</Text>
                  {MATERIALS[matId]?.spritesheet ? (
                    <ItemSprite
                      spritesheet={MATERIALS[matId].spritesheet}
                      frameIndex={MATERIALS[matId].frameIndex}
                      displaySize={10}
                    />
                  ) : (
                    <Text style={{ fontSize: 9 }}>{CRYSTAL_INFO[matId]?.icon}</Text>
                  )}
                  <Text style={[styles.cardLockText, { color: '#FFC107', fontWeight: 'bold', marginTop: 0 }]} numberOfLines={1}>
                    {matQty} · Lv.{cost.requiredLevel}
                  </Text>
                </View>
              );
            })() : (
              <Text style={styles.cardLockText} numberOfLines={1}>
                {(() => {
                  const check = canUnlockElementSkill(skillId, hero);
                  if (check.cost && hero.level < check.cost.requiredLevel) {
                    return `🔒 Lv.${check.cost.requiredLevel}`;
                  }
                  return '🔒 Locked';
                })()}
              </Text>
            )}
          </>
        )}

        {skill.type === 'active' && skill.cooldown > 0 && (
          <Text style={styles.cardCooldown}>⏳ {skill.cooldown}-Turn CD</Text>
        )}
      </TouchableOpacity>
    );
  };

  // ── Selected skill modal content ──────────────────────────────────────────

  const selectedCardState = targetSkill ? getCardState(targetSkill.id) : null;
  const selectedStars     = targetSkill ? getStars(targetSkill.id) : 0;
  const selectedEquipped  = targetSkill ? isEquipped(targetSkill.id) : false;
  const equippedSlot      = targetSkill ? equippedSkills.indexOf(targetSkill.id) : -1;

  const unlockCheck = targetSkill ? canUnlockElementSkill(targetSkill.id, hero) : null;
  const starUpCheck = targetSkill ? canStarUpSkill(targetSkill.id, hero) : null;

  const currentStarData = targetSkill && selectedStars > 0
    ? targetSkill.stars[selectedStars]
    : null;
  const nextStarData = targetSkill && selectedStars < 5
    ? targetSkill.stars[selectedStars + 1] || targetSkill.stars[5]
    : null;

  // Cost relevant to the action available on the modal (unlock ★1 or star up to next ★)
  const relevantCheck = selectedCardState === 'available' ? unlockCheck
    : selectedCardState === 'unlocked' ? starUpCheck
    : null;
  const relevantCost = relevantCheck?.cost || null;

  return (
    <SafeAreaView style={styles.container}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="bg" cx="50%" cy="0%" rx="80%" ry="65%">
            <Stop offset="0%" stopColor={elementColor} stopOpacity="0.18" />
            <Stop offset="100%" stopColor="#0E0F14" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="#0E0F14" />
        <Rect width="100%" height="100%" fill="url(#bg)" />
      </Svg>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Hub</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Skill Tree</Text>
        <View style={[styles.levelBadge, { borderColor: elementColor, backgroundColor: `${elementColor}1F` }]}>
          <Text style={[styles.levelBadgeText, { color: elementColor }]}>Lv. {level}</Text>
        </View>
      </View>

      {/* ── Crystal stash bar ─────────────────────────────────────────────── */}
      <View style={styles.crystalBar}>
        {CRYSTAL_ORDER.map((itemId) => {
          const info = CRYSTAL_INFO[itemId];
          const owned = materials[itemId] || 0;
          return (
            <View key={itemId} style={styles.crystalChip}>
              {MATERIALS[itemId]?.spritesheet ? (
                <View style={{ marginRight: 4 }}>
                  <ItemSprite
                    spritesheet={MATERIALS[itemId].spritesheet}
                    frameIndex={MATERIALS[itemId].frameIndex}
                    displaySize={14}
                  />
                </View>
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
          
          let tabTextColor = 'rgba(255,255,255,0.35)';
          if (isViewing) {
            tabTextColor = ELEMENT_COLORS[el.id] || '#D4A754';
          } else if (isOwned) {
            tabTextColor = 'rgba(255,255,255,0.85)';
          }

          return (
            <TouchableOpacity
              key={el.id}
              style={styles.tab}
              onPress={() => setViewingElement(el.id)}
            >
              <Text style={[styles.tabIcon, !isOwned && { opacity: 0.35 }]}>{el.icon}</Text>
              <Text style={[styles.tabLabel, { color: tabTextColor }]}>
                {el.label}
              </Text>
              {isViewing ? (
                <View style={[styles.tabIndicator, { backgroundColor: ELEMENT_COLORS[el.id] || '#D4A754' }]} />
              ) : (
                <View style={[styles.tabIndicator, { backgroundColor: 'transparent' }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Stance card ──────────────────────────────────────────────── */}
        {stance && viewingElement === element && (
          <View style={[styles.stanceCard, { borderColor: `${elementColor}60` }]}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <LinearGradient id="stanceGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor={`${elementColor}22`} />
                  <Stop offset="100%" stopColor="transparent" stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#stanceGrad)" rx={12} />
            </Svg>
            <View style={styles.stanceInner}>
              <View style={styles.stanceLeft}>
                <Text style={styles.stanceLabel}>INNATE · ALWAYS ACTIVE</Text>
                <Text style={[styles.stanceName, { color: elementColor }]}>
                  {ELEMENTS.find(e => e.id === element)?.icon} {stance.name}
                </Text>
                <Text style={styles.stanceDesc}>{stance.description}</Text>
              </View>
              <View style={styles.stanceRight}>
                {stanceBonus.atkPercent !== undefined && (
                  <Text style={[styles.stanceStat, { color: elementColor }]}>
                    +{Math.round(stanceBonus.atkPercent * 100)}% ATK
                  </Text>
                )}
                {stanceBonus.burnTickBonus !== undefined && (
                  <Text style={[styles.stanceStat, { color: elementColor }]}>
                    +{stanceBonus.burnTickBonus} burn/tick
                  </Text>
                )}
                {stanceBonus.maxHpPercent !== undefined && (
                  <Text style={[styles.stanceStat, { color: elementColor }]}>
                    +{Math.round(stanceBonus.maxHpPercent * 100)}% max HP
                  </Text>
                )}
                {stanceBonus.maxHpPercent !== undefined && (
                  <Text style={[styles.stanceStat, { color: elementColor, fontSize: 10, opacity: 0.8 }]}>
                    (currently +{Math.floor((hero.maxHp || 50) * stanceBonus.maxHpPercent)} HP)
                  </Text>
                )}
                {stanceBonus.defBonus !== undefined && (
                  <Text style={[styles.stanceStat, { color: elementColor }]}>
                    +{stanceBonus.defBonus} DEF
                  </Text>
                )}
                {stanceBonus.defBonus !== undefined && (
                  <Text style={[styles.stanceStat, { color: elementColor, fontSize: 10, opacity: 0.8 }]}>
                    (+1 DEF / level)
                  </Text>
                )}
                {stanceBonus.agiBonus !== undefined && (
                  <Text style={[styles.stanceStat, { color: elementColor }]}>
                    +{stanceBonus.agiBonus} AGI
                  </Text>
                )}
                {stanceBonus.agiBonus !== undefined && (
                  <Text style={[styles.stanceStat, { color: elementColor, fontSize: 10, opacity: 0.8 }]}>
                    +{(stanceBonus.agiBonus * 0.5).toFixed(1)}% crit · +{(stanceBonus.agiBonus * 0.5).toFixed(1)}% dodge
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Placeholder notice for non-owned elements */}
        {viewingElement !== element && (
          <View style={styles.placeholderBanner}>
            <Text style={styles.placeholderText}>
              You chose {ELEMENTS.find(e => e.id === element)?.label || 'another element'}.
              These skills are not available in your current run.
            </Text>
          </View>
        )}

        {/* ── Dynamic Skill Tree Grid ─────────────────────────────────── */}
        <View style={[styles.treeContainer, { height: TREE_HEIGHT }]}>
          {/* SVG Connectors behind cards */}
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
                style={[
                  styles.treeRow,
                  {
                    top: yTop,
                    position: 'absolute',
                    left: 0,
                    width: TREE_WIDTH,
                    height: CARD_HEIGHT,
                  }
                ]}
              >
                {rowSkillIds.map((skillId) => {
                  return renderSkillCard(skillId, { width: cardWidth, height: CARD_HEIGHT });
                })}
              </View>
            );
          })}
        </View>

        {/* Equipped skills summary */}
        <View style={styles.equippedSummary}>
          <Text style={styles.equippedSummaryLabel}>EQUIPPED SKILLS</Text>
          <View style={styles.equippedRow}>
            {[0, 1].map((slotIdx) => {
              const skillId = equippedSkills[slotIdx];
              const sk = skillId ? SKILLS[skillId] : null;
              return (
                <View key={slotIdx} style={styles.equippedSlotWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.equippedSocketCircle,
                      sk ? { borderColor: elementColor, backgroundColor: 'rgba(25, 27, 36, 0.95)' } : styles.equippedSocketEmpty
                    ]}
                    onPress={() => {
                      if (sk && viewingElement === element) {
                        handleOpenSkill(sk);
                      }
                    }}
                    activeOpacity={0.8}
                    disabled={!sk || viewingElement !== element}
                  >
                    {sk ? (
                      <>
                        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                          <Defs>
                            <RadialGradient id={`esg_${slotIdx}`} cx="50%" cy="50%" rx="50%" ry="50%">
                              <Stop offset="0%" stopColor={elementColor} stopOpacity="0.3" />
                              <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
                            </RadialGradient>
                          </Defs>
                          <Rect width="100%" height="100%" fill={`url(#esg_${slotIdx})`} rx={40} />
                        </Svg>
                        <Text style={styles.equippedSlotIcon}>{sk.icon || '✨'}</Text>
                      </>
                    ) : (
                      <View style={styles.emptyIconContainer}>
                        {slotIdx === 0 ? (
                          // Crossed Swords outline
                          <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1.5}>
                            <Path d="M4 20l16-16M5 15l4 4M20 20L4 4M19 15l-4 4" strokeLinecap="round" />
                          </Svg>
                        ) : (
                          // Shield outline
                          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1.5}>
                            <Path d="M12 3C12 3 5 5 5 11C5 16.5 12 21 12 21C12 21 19 16.5 19 11C19 5 12 3 12 3Z" strokeLinecap="round" strokeLinejoin="round" />
                          </Svg>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.equippedSlotLabel}>Slot {slotIdx + 1}</Text>
                  <Text style={[styles.equippedSlotName, { color: sk ? '#FFFFFF' : 'rgba(255,255,255,0.3)' }]} numberOfLines={1}>
                    {sk ? sk.name : 'Empty'}
                  </Text>
                  {sk && (
                    <Text style={styles.equippedSlotType}>
                      {sk.type === 'passive' ? 'Passive' : 'Active'}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ── Skill detail modal ─────────────────────────────────────────── */}
      <Modal
        visible={selectedSkill !== null}
        transparent
        animationType="none"
        onRequestClose={() => setSelectedSkill(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedSkill(null)}>
          <Pressable style={styles.modalCard}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id="modalGlow" cx="50%" cy="0%" rx="80%" ry="50%">
                  <Stop offset="0%" stopColor={elementColor} stopOpacity="0.15" />
                  <Stop offset="100%" stopColor="#1C1E26" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="#1C1E26" rx={20} />
              <Rect width="100%" height="100%" fill="url(#modalGlow)" rx={20} />
              <Rect x="1" y="1" width="98%" height="98%" rx={19} fill="none"
                stroke={`${elementColor}50`} strokeWidth={1}
              />
            </Svg>

            {targetSkill && (
              <ScrollView
                style={{ maxHeight: SCREEN_HEIGHT * 0.85 }}
                contentContainerStyle={styles.modalInner}
                showsVerticalScrollIndicator={false}
              >
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedSkill(null)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>

                {/* Title row */}
                <View style={styles.modalTitleRow}>
                  <Text style={styles.modalBigIcon}>{targetSkill.icon || '✨'}</Text>
                  <View style={styles.modalTitleRight}>
                    <Text style={[styles.modalSkillName, { color: '#FFFFFF' }]}>
                      {targetSkill.name}
                    </Text>
                    <View style={styles.modalBadges}>
                      <View style={[styles.typeBadge, {
                        backgroundColor: targetSkill.type === 'active' ? 'rgba(255, 85, 85, 0.15)' : 'rgba(0, 240, 208, 0.15)',
                        borderColor: targetSkill.type === 'active' ? 'rgba(255, 85, 85, 0.35)' : 'rgba(0, 240, 208, 0.35)',
                        borderWidth: 1,
                        borderRadius: 6,
                        paddingHorizontal: 6,
                        paddingVertical: 3,
                      }]}>
                        <Text style={[styles.typeBadgeText, { color: targetSkill.type === 'active' ? '#FF5555' : '#00F0D0' }]}>
                          {targetSkill.type === 'active' ? 'Active' : 'Passive'}
                        </Text>
                      </View>
                      <Text style={styles.modalTier}>Tier {targetSkill.tier}</Text>
                      {targetSkill.cooldown > 0 && (
                        <Text style={styles.modalCD}>⏳ {targetSkill.cooldown}-Turn Cooldown</Text>
                      )}
                    </View>
                    {selectedStars > 0 && (
                      <Stars count={selectedStars} color={elementColor} />
                    )}
                  </View>
                </View>

                <Text style={styles.modalDesc}>{targetSkill.description}</Text>

                {/* Current stats */}
                {currentStarData && (
                  <View style={styles.modalStatBox}>
                    <Text style={styles.modalStatLabel}>★{selectedStars} CURRENT STATS</Text>
                    {Object.entries(currentStarData).map(([k, v]) => (
                      <Text key={k} style={styles.modalStatLine}>
                        {SKILL_STAT_LABELS[k] || k}: <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{formatSkillStatValue(k, v)}</Text>
                      </Text>
                    ))}
                  </View>
                )}

                {/* Next star preview */}
                {nextStarData && selectedStars < 5 && (
                  <View style={[styles.modalStatBox, { borderColor: `${elementColor}40` }]}>
                    <Text style={styles.modalStatLabel}>★{selectedStars + 1} NEXT STAR</Text>
                    {Object.entries(nextStarData).map(([k, v]) => (
                      <Text key={k} style={styles.modalStatLine}>
                        {SKILL_STAT_LABELS[k] || k}: <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{formatSkillStatValue(k, v)}</Text>
                      </Text>
                    ))}
                  </View>
                )}

                {/* Cost breakdown — for unlocking ★1 or starring up to the next ★ */}
                {relevantCost && (
                  <View style={[styles.modalCostBox, { borderColor: `${elementColor}40` }]}>
                    <Text style={styles.modalStatLabel}>
                      {selectedCardState === 'available' ? `UNLOCK ★1 COST` : `★${selectedStars + 1} UPGRADE COST`}
                    </Text>
                    <View style={styles.modalCostLevelRow}>
                      <Text style={styles.modalCostLevelText}>Hero Level</Text>
                      <Text style={[
                        styles.modalCostLevelValue,
                        { color: hero.level >= relevantCost.requiredLevel ? '#7CFFB2' : '#FF8A8A' }
                      ]}>
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
                              <ItemSprite
                                spritesheet={MATERIALS[itemId].spritesheet}
                                frameIndex={MATERIALS[itemId].frameIndex}
                                displaySize={14}
                              />
                            ) : (
                              <Text style={{ fontSize: 12 }}>{info.icon}</Text>
                            )}
                            <Text style={styles.modalCostMatName}>{info.name}</Text>
                          </View>
                          <Text style={[styles.modalCostMatValue, { color: enough ? '#7CFFB2' : '#FF8A8A' }]}>
                            {owned} / {qty}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Unlock requirement info (e.g. parent skill not at ★5) */}
                {selectedCardState === 'locked' && unlockCheck && (
                  <View style={styles.modalInfoBox}>
                    <Text style={styles.modalInfoText}>🔒 {unlockCheck.reason}</Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.modalActions}>
                  {/* UNLOCK */}
                  {selectedCardState === 'available' && (
                    <TouchableOpacity style={[styles.primaryBtn, { shadowColor: elementColor }]} onPress={handleUnlock}>
                      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                        <Defs>
                          <LinearGradient id="btnGrad" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0%" stopColor={elementColor} />
                            <Stop offset="100%" stopColor={`${elementColor}99`} />
                          </LinearGradient>
                        </Defs>
                        <Rect width="100%" height="100%" fill="url(#btnGrad)" rx={10} />
                      </Svg>
                      <Text style={styles.primaryBtnText}>
                        Unlock ★1 🌟
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* STAR UP */}
                  {(selectedCardState === 'unlocked') && starUpCheck?.can && (
                    <TouchableOpacity style={[styles.primaryBtn, { shadowColor: elementColor }]} onPress={handleStarUp}>
                      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                        <Defs>
                          <LinearGradient id="starBtnGrad" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0%" stopColor={elementColor} />
                            <Stop offset="100%" stopColor={`${elementColor}80`} />
                          </LinearGradient>
                        </Defs>
                        <Rect width="100%" height="100%" fill="url(#starBtnGrad)" rx={10} />
                      </Svg>
                      <Text style={styles.primaryBtnText}>
                        ★ Star Up → ★{selectedStars + 1}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* STAR UP — not enough SP */}
                  {selectedCardState === 'unlocked' && !starUpCheck?.can && selectedStars < 5 && (
                    <View style={styles.disabledBtn}>
                      <Text style={styles.disabledBtnText}>{starUpCheck?.reason}</Text>
                    </View>
                  )}

                  {/* MAXED */}
                  {selectedCardState === 'maxed' && (
                    <View style={[styles.disabledBtn, { borderColor: '#FFD70080' }]}>
                      <Text style={[styles.disabledBtnText, { color: '#FFD700' }]}>★★★★★ MAX STAR</Text>
                    </View>
                  )}

                  {/* EQUIP (unlocked or maxed) */}
                  {(selectedCardState === 'unlocked' || selectedCardState === 'maxed') && (
                    <View style={styles.equipSection}>
                      {selectedEquipped ? (
                        <>
                          <Text style={[styles.equippedLabel, { color: elementColor }]}>
                            ✓ Equipped in Slot {equippedSlot + 1}
                          </Text>
                          <TouchableOpacity
                            style={styles.unequipBtn}
                            onPress={() => handleUnequip(equippedSlot)}
                          >
                            <Text style={styles.unequipBtnText}>Unequip</Text>
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
                                  <Text style={styles.equipSlotBtnText}>Slot {si + 1}</Text>
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
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0E0F14' },
  scroll:       { flex: 1 },
  scrollContent:{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 80 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  backText: { color: 'rgba(255,255,255,0.85)', fontWeight: 'bold', fontSize: 13 },
  title:    { fontWeight: '900', fontSize: 18, color: '#FFFFFF', letterSpacing: 1, textTransform: 'uppercase' },
  levelBadge: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 3,
  },
  levelBadgeText: { fontWeight: '950', fontSize: 12, letterSpacing: 0.5 },

  /* Crystal stash bar */
  crystalBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  crystalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  crystalChipIcon:  { fontSize: 13 },
  crystalChipCount: { fontSize: 12, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.3 },

  /* Tabs */
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    gap: 2,
  },
  tabIcon:  { fontSize: 18 },
  tabLabel: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.8 },
  tabIndicator: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
    marginTop: 6,
  },

  /* Stance card */
  stanceCard: {
    borderRadius: 12, borderWidth: 1.5, overflow: 'hidden',
    backgroundColor: 'rgba(25, 27, 36, 0.95)',
    marginBottom: 16,
  },
  stanceInner: {
    flexDirection: 'row', padding: 14, gap: 12,
  },
  stanceLeft:  { flex: 1 },
  stanceRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  stanceLabel: {
    fontSize: 8.5, fontWeight: '900', letterSpacing: 2,
    color: 'rgba(255,255,255,0.45)', marginBottom: 4,
  },
  stanceName:  { fontSize: 15, fontWeight: '900', marginBottom: 4 },
  stanceDesc:  { fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 15 },
  stanceStat:  { fontSize: 14, fontWeight: 'bold' },

  placeholderBanner: {
    backgroundColor: 'rgba(25, 27, 36, 0.95)',
    borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  placeholderText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 17 },

  /* Skill Tree Grid */
  treeContainer: {
    width: '100%',
    position: 'relative',
    marginVertical: 10,
  },
  treeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  /* Skill cards */
  skillCard: {
    borderRadius: 12, borderWidth: 1.5,
    padding: 10, overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
  },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardIcon:     { fontSize: 22 },
  cardBadgeRow: { flexDirection: 'row', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' },
  cardName:     { fontSize: 13, fontWeight: '900', marginBottom: 2 },
  cardLockText: { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 4 },
  cardCostText: { fontSize: 9.5, color: 'rgba(255,255,255,0.5)', fontWeight: '700', marginTop: 4 },
  cardCooldown: { fontSize: 9.5, color: '#FFA07A', fontWeight: '800', marginTop: 4 },

  typeBadge:      { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1 },
  typeBadgeText:  { fontSize: 7.5, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  equippedBadge:  { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1 },
  equippedBadgeText: { fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },

  /* Equipped summary */
  equippedSummary: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  equippedSummaryLabel: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 16,
    textAlign: 'center',
  },
  equippedRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  equippedSlotWrapper: {
    alignItems: 'center',
    width: 120,
  },
  equippedSocketCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 8,
  },
  equippedSocketEmpty: {
    borderColor: 'rgba(255,255,255,0.18)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  emptyIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
  equippedSlotIcon:   { fontSize: 28 },
  equippedSlotLabel:  { fontSize: 9, fontWeight: '900', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', marginBottom: 2 },
  equippedSlotName:   { fontSize: 12, fontWeight: '900', textAlign: 'center', maxWidth: 110 },
  equippedSlotType:   { fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 2 },

  /* Modal */
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalCard: { width: '100%', maxWidth: 360, borderRadius: 20, overflow: 'hidden', elevation: 8 },
  modalInner: { padding: 20 },
  modalCloseBtn: { position: 'absolute', top: 12, right: 16, padding: 6, zIndex: 10 },
  modalCloseText: { fontSize: 16, color: '#A0AEC0', fontWeight: 'bold' },

  modalTitleRow:  { flexDirection: 'row', gap: 12, marginBottom: 12, marginTop: 4, alignItems: 'flex-start' },
  modalBigIcon:   { fontSize: 36, marginTop: 2 },
  modalTitleRight:{ flex: 1 },
  modalSkillName: { fontSize: 20, fontWeight: '900', marginBottom: 6 },
  modalBadges:    { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 },
  modalTier:      { fontSize: 9.5, color: 'rgba(255,255,255,0.5)', fontWeight: '800', letterSpacing: 0.5 },
  modalCD:        { fontSize: 9.5, color: '#FFA07A', fontWeight: 'bold' },

  modalDesc: { fontSize: 13.5, color: 'rgba(255,255,255,0.8)', lineHeight: 18, marginBottom: 14 },

  modalStatBox: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10, padding: 10, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalStatLabel: { fontSize: 8.5, fontWeight: '900', color: 'rgba(255,255,255,0.45)', letterSpacing: 1.5, marginBottom: 6 },
  modalStatLine:  { fontSize: 11.5, color: 'rgba(255,255,255,0.75)', marginBottom: 2 },

  /* Cost breakdown box */
  modalCostBox: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10, padding: 10, marginBottom: 12,
    borderWidth: 1,
  },
  modalCostLevelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 4,
  },
  modalCostLevelText:  { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  modalCostLevelValue: { fontSize: 12, fontWeight: '900' },
  modalCostMatRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 3,
  },
  modalCostMatName:  { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  modalCostMatValue: { fontSize: 12, fontWeight: '900' },

  modalInfoBox: {
    backgroundColor: 'rgba(255,100,0,0.08)',
    borderRadius: 8, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,100,0,0.25)',
  },
  modalInfoText: { fontSize: 12, color: '#FFA07A', fontWeight: '500' },

  modalActions: { gap: 10, marginTop: 6 },
  primaryBtn: {
    height: 48, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  primaryBtnText: { fontSize: 13.5, fontWeight: '950', color: '#fff', zIndex: 2, letterSpacing: 0.3 },

  disabledBtn: {
    height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  disabledBtnText: { fontSize: 12, color: '#A0AEC0', fontWeight: 'bold' },

  equipSection:  { gap: 8 },
  equippedLabel: { fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  unequipBtn: {
    height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  unequipBtnText: { fontSize: 12.5, color: 'rgba(255,255,255,0.75)', fontWeight: 'bold' },
  equipPrompt:    { fontSize: 11, color: 'rgba(255,255,255,0.65)', textAlign: 'center' },
  equipRow:       { flexDirection: 'row', gap: 10 },
  equipSlotBtn: {
    flex: 1, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.05)', gap: 2,
  },
  equipSlotBtnText: { fontSize: 12.5, color: '#FFFFFF', fontWeight: 'bold' },
  equipSlotSub:     { fontSize: 9.5, color: '#A0AEC0' },
});
