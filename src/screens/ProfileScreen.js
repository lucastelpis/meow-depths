/**
 * ProfileScreen.js — Mochi's Profile (Character stats and equipment)
 *
 * Displays hero card, attributes, and 8-slot equipment grid.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect } from 'react-native-svg';

import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { calculateEffectiveStats, getXpForLevel, getActiveSetBonuses, STANCES, getStanceBonus } from '../logic/progressionEngine';
import AnimatedSprite from '../components/AnimatedSprite';
import ResourceBar from '../components/ui/ResourceBar';
import { HERO_SPRITE } from '../constants/sprites';
import { GEAR, getGearForSlot } from '../data/gear';
import ItemSprite from '../components/ItemSprite';

const HERO_AVATAR_DISPLAY_SIZE = 80;

// Placeholder item-icon shown for any equipped gear until per-item sprites exist
const GEAR_ICON_PLACEHOLDER = require('../../assets/sprites/Tiny Swords (Free Pack)/UI Elements/UI Elements/Icons/Icon_05.png');

// Faded silhouette icons shown in empty equipment slots
const EQUIPMENT_LEATHER_SHEET = require('../../assets/sprites/items/equipment-leather.png');
const EQUIPMENT_LEATHER_FRAME_SIZE = 32;
const EQUIPMENT_LEATHER_FRAMES = 14;
const SLOT_EMPTY_FRAME = {
  head: 1,
  chest: 3,
  legs: 5,
  gloves: 7,
  boots: 9,
  trinket: 11,
  storage: 13,
};

// Faded weapon silhouette shown in the empty weapon slot
const WEAPONS_SHEET = require('../../assets/sprites/items/weapons-1.png');
const WEAPONS_FRAME_SIZE = 32;
const WEAPONS_FRAMES = 7;

const TABS = [
  { key: 'stats',     frameIndex: 28, label: 'Stats' },
  { key: 'equipment', frameIndex: 10, label: 'Equipment' },
];

// ─── Equipment slot config ────────────────────────────────────────────────────
const SLOT_CONFIG = [
  { key: 'head',     label: 'Head',     emoji: '🪖' },
  { key: 'chest',    label: 'Chest',    emoji: '🛡️' },
  { key: 'gloves',   label: 'Gloves',   emoji: '🧤' },
  { key: 'legs',     label: 'Legs',     emoji: '👖' },
  { key: 'boots',    label: 'Boots',    emoji: '👢' },
  { key: 'weapon',   label: 'Weapon',   emoji: '⚔️' },
  { key: 'trinket',  label: 'Trinket',  emoji: '💎' },
  { key: 'storage',  label: 'Storage',  emoji: '🎒' },
];

// Slot keys laid out per row of the equipment grid (2 cards per row)
const SLOT_ROWS = [
  ['head', 'chest'],
  ['gloves', 'legs'],
  ['weapon', 'boots'],
  ['trinket', 'storage'],
];

export default function ProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { state, dispatch } = useGame();
  const { hero } = state;

  const initialTab = route.params?.initialTab || 'stats';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [modalData, setModalData] = useState({
    slotKey: null,
    slotConfig: null,
    currentGearId: null,
    currentGearDef: null,
    candidates: [],
  });

  // ── Stat Allocation Local State ──
  const [tempStrAlloc, setTempStrAlloc] = useState(0);
  const [tempAgiAlloc, setTempAgiAlloc] = useState(0);
  const [tempVitAlloc, setTempVitAlloc] = useState(0);

  const totalAllocated = tempStrAlloc + tempAgiAlloc + tempVitAlloc;
  const remainingPoints = (hero.statPoints || 0) - totalAllocated;
  const previewStr = (hero.strength || 10) + tempStrAlloc;
  const previewAgi = (hero.agility || 10) + tempAgiAlloc;
  const previewVit = (hero.vitality || 10) + tempVitAlloc;

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
    if (totalAllocated === 0) return;
    dispatch({
      type: 'ALLOCATE_STAT_POINTS',
      payload: {
        strInc: tempStrAlloc,
        agiInc: tempAgiAlloc,
        vitInc: tempVitAlloc,
      },
    });
    setTempStrAlloc(0);
    setTempAgiAlloc(0);
    setTempVitAlloc(0);
  };

  const effectiveStats = useMemo(() => calculateEffectiveStats(hero), [hero]);

  // Preview hero with allocated points
  const previewHero = useMemo(() => {
    return {
      ...hero,
      strength: previewStr,
      agility: previewAgi,
      vitality: previewVit,
    };
  }, [hero, previewStr, previewAgi, previewVit]);

  const previewEffectiveStats = useMemo(() => {
    return calculateEffectiveStats(previewHero);
  }, [previewHero]);

  const activeSets = useMemo(() => getActiveSetBonuses(hero.gear), [hero.gear]);

  const xpForCurrent = getXpForLevel(hero.level);
  const xpForNext    = getXpForLevel(hero.level + 1);
  const xpIntoLevel  = hero.xp - xpForCurrent;
  const xpNeeded     = xpForNext - xpForCurrent;

  // Base stats (no gear) for the "+gear bonus" annotations
  const baseStats = useMemo(() => {
    const strength = hero.strength || 10;
    const agility = hero.agility || 10;
    return {
      attack: strength * 1,
      defence: 0,
      critChance: agility * 0.005,
      dodge: agility * 0.005,
      maxHp: (hero.vitality || 10) * 5,
      bagSlots: 0,
    };
  }, [hero.strength, hero.agility, hero.vitality]);

  // Preview Base stats (no gear) for the "+gear bonus" annotations
  const previewBaseStats = useMemo(() => {
    return {
      attack: previewStr * 1,
      defence: 0,
      critChance: previewAgi * 0.005,
      dodge: previewAgi * 0.005,
      maxHp: previewVit * 5,
      bagSlots: 0,
    };
  }, [previewStr, previewAgi, previewVit]);

  const stance = useMemo(() => {
    return hero.element ? STANCES[hero.element.toLowerCase()] : null;
  }, [hero.element]);

  const stanceBonusText = useMemo(() => {
    if (!hero.element) return '';
    const bonus = getStanceBonus(hero.element.toLowerCase(), hero.level);
    if (hero.element.toLowerCase() === 'fire') {
      return `+${Math.round((bonus.atkPercent || 0) * 100)}% ATK (Burn Damage +${bonus.burnTickBonus || 0})`;
    }
    if (hero.element.toLowerCase() === 'water') {
      return `+${Math.round((bonus.maxHpPercent || 0) * 100)}% Max HP`;
    }
    if (hero.element.toLowerCase() === 'earth') {
      return `+${bonus.defBonus || 0} DEF`;
    }
    if (hero.element.toLowerCase() === 'wind') {
      return `+${bonus.agiBonus || 0} Agility (+${((bonus.agiBonus || 0) * 0.5).toFixed(1)}% Crit/Dodge)`;
    }
    return '';
  }, [hero.element, hero.level]);

  const pct = (v) => `${Math.round((v || 0) * 100)}%`;

  const statSummary = (gearDef) => {
    if (!gearDef?.stats) return '';
    const parts = [];
    if (gearDef.stats.attack)     parts.push(`ATK +${gearDef.stats.attack}`);
    if (gearDef.stats.defence)    parts.push(`DEF +${gearDef.stats.defence}`);
    if (gearDef.stats.maxHp)      parts.push(`HP +${gearDef.stats.maxHp}`);
    if (gearDef.stats.critChance) parts.push(`CRIT +${pct(gearDef.stats.critChance)}`);
    if (gearDef.stats.dodge)      parts.push(`DODGE +${pct(gearDef.stats.dodge)}`);
    if (gearDef.stats.bagSlots)   parts.push(`Bag Slots +${gearDef.stats.bagSlots}`);
    return parts.join('  ');
  };

  // Stat-by-stat delta of `candidate` vs the currently equipped piece
  const statDeltas = (candidateDef, currentDef) => {
    const STAT_FIELDS = [
      { key: 'attack',     label: 'ATK',       percent: false },
      { key: 'defence',    label: 'DEF',       percent: false },
      { key: 'maxHp',      label: 'HP',        percent: false },
      { key: 'critChance', label: 'CRIT',      percent: true },
      { key: 'dodge',      label: 'DODGE',     percent: true },
      { key: 'bagSlots',   label: 'Bag Slots', percent: false },
    ];
    const deltas = [];
    STAT_FIELDS.forEach(({ key, label, percent }) => {
      const a = candidateDef?.stats?.[key] || 0;
      const b = currentDef?.stats?.[key] || 0;
      const diff = a - b;
      if (Math.abs(diff) < 0.0001) return;
      const sign = diff > 0 ? '+' : '';
      const text = percent
        ? `${sign}${Math.round(diff * 100)}%`
        : `${sign}${diff}`;
      deltas.push({ label, text, positive: diff > 0 });
    });
    return deltas;
  };

  // Data for the equipment slot popup
  const handleOpenSlot = (slotKey) => {
    const slotConfig = SLOT_CONFIG.find((s) => s.key === slotKey);
    const gearId = hero.gear?.[slotKey];
    const gearDef = gearId ? GEAR[gearId] : null;
    const ownedIds = hero.inventory?.craftedGear || [];
    const candidates = getGearForSlot(slotKey)
      .filter((item) => ownedIds.includes(item.id))
      .map((item) => ({
        ...item,
        isEquipped: item.id === gearId,
        deltas: statDeltas(item, gearDef),
      }));

    setModalData({
      slotKey,
      slotConfig,
      currentGearId: gearId,
      currentGearDef: gearDef,
      candidates,
    });
    setSelectedSlot(slotKey);
  };

  const handleEquipFromSlot = (gearId) => {
    dispatch({ type: 'EQUIP_GEAR', payload: { slot: modalData.slotKey, gearId } });
    setSelectedSlot(null);
  };

  const handleUnequip = () => {
    dispatch({ type: 'EQUIP_GEAR', payload: { slot: modalData.slotKey, gearId: null } });
    setSelectedSlot(null);
  };

  const handleGoToShop = () => {
    setSelectedSlot(null);
    navigation.navigate('Shop');
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Ambient warm glow */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="profileGlow" cx="50%" cy="0%" rx="80%" ry="40%">
            <Stop offset="0%" stopColor={theme.COLORS.candleGold} stopOpacity="0.10" />
            <Stop offset="100%" stopColor="#133131" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="#133131" />
        <Rect width="100%" height="100%" fill="url(#profileGlow)" />
      </Svg>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Section 1: Hero Card ── */}
        <View style={[styles.heroCard, theme.SHADOWS.cardShadow]}>
          <View style={StyleSheet.absoluteFill}>
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="heroCardGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#102719" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#0A160F" stopOpacity="1" />
                </LinearGradient>
                <RadialGradient id="heroAvatarGlow" cx="22%" cy="50%" rx="35%" ry="60%">
                  <Stop offset="0%" stopColor="#4FB286" stopOpacity="0.15" />
                  <Stop offset="100%" stopColor="#4FB286" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#heroCardGrad)" rx={20} />
              <Rect width="100%" height="100%" fill="url(#heroAvatarGlow)" rx={20} />
            </Svg>
          </View>

          <View style={styles.cardBorderOverlay}>
            <Svg width="100%" height="100%">
              <Rect x="6" y="6" width="96%" height="91%" rx={14} fill="none" stroke="rgba(212, 167, 84, 0.08)" strokeWidth="1" />
            </Svg>
          </View>

          {/* Gold chip */}
          <View style={styles.goldChip}>
            <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={14} />
            <Text style={[styles.goldChipText, { marginLeft: 4 }]}>{hero.gold}</Text>
          </View>

          {/* Avatar & level badge */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Image
                source={require('../../assets/sprites/units/hero/hero_idle1.png')}
                style={{ width: 70, height: 70 }}
                resizeMode="contain"
              />
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{hero.level}</Text>
            </View>
          </View>

          {/* Identity & HP */}
          <View style={styles.heroDetails}>
            <Text style={styles.heroName}>{hero.name}</Text>
            <View style={styles.gaugesStack}>
              <ResourceBar
                variant="heroHp"
                label="HP"
                current={hero.hp}
                max={effectiveStats.maxHp}
              />
              <ResourceBar
                variant="xp"
                label="XP"
                current={xpIntoLevel}
                max={xpNeeded}
              />
            </View>
          </View>
        </View>

        {/* ── Section 2: Tab Bar Switcher ── */}
        <View style={styles.tabContainer}>
          {TABS.map(({ key, frameIndex, label }) => {
            const isActive = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.tabButton, isActive ? styles.tabBtnActive : styles.tabBtnInactive]}
                activeOpacity={0.8}
                onPress={() => {
                  setActiveTab(key);
                  setTempStrAlloc(0);
                  setTempAgiAlloc(0);
                  setTempVitAlloc(0);
                }}
              >
                <ItemSprite
                  spritesheet="icons-1"
                  frameIndex={frameIndex}
                  displaySize={18}
                  opacity={isActive ? 1.0 : 0.6}
                />
                <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : styles.tabLabelInactive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tab Contents ── */}
        {activeTab === 'stats' ? (
          <View style={styles.tabContent}>
            {/* Stat Points Available Banner */}
            {(hero.statPoints || 0) > 0 && (
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsBadgeText}>
                  Stat Points Available: <Text style={styles.pointsBadgeNumber}>{remainingPoints}</Text>
                </Text>
              </View>
            )}

            {/* Core Attributes Grid */}
            <Text style={styles.sectionTitle}>Attributes</Text>
            <View style={styles.attributeGrid}>
              {/* Strength Card */}
              <View style={[styles.attributeCard, { borderColor: 'rgba(212, 167, 84, 0.25)' }]}>
                <View style={styles.attributeHeader}>
                  <ItemSprite spritesheet="icons-1" frameIndex={21} displaySize={16} />
                  <Text style={[styles.attributeLabel, { color: '#F9D99A' }]}>STR</Text>
                </View>
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
                <View style={styles.attributeHeader}>
                  <ItemSprite spritesheet="icons-1" frameIndex={20} displaySize={16} />
                  <Text style={[styles.attributeLabel, { color: '#06B6D4' }]}>AGI</Text>
                </View>
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
                <View style={styles.attributeHeader}>
                  <ItemSprite spritesheet="icons-1" frameIndex={22} displaySize={16} />
                  <Text style={[styles.attributeLabel, { color: '#5CC489' }]}>VIT</Text>
                </View>
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

            {/* Confirm Allocation Button */}
            {totalAllocated > 0 && (
              <TouchableOpacity
                style={styles.confirmBtn}
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
                  <Rect width="100%" height="100%" fill="url(#confirmBtnGrad)" rx={12} />
                </Svg>
                <Text style={styles.confirmBtnText}>Confirm Allocation</Text>
              </TouchableOpacity>
            )}

            {/* Combat Stats Grid */}
            <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Combat Stats</Text>
            <View style={[styles.statsRow, { marginBottom: 16 }]}>
              <StatBox
                flex={0.85}
                label="ATK"
                value={previewEffectiveStats.attack}
                bonus={previewEffectiveStats.attack - previewBaseStats.attack}
                highlighted={previewEffectiveStats.attack !== effectiveStats.attack}
              />
              <StatBox
                flex={0.85}
                label="DEF"
                value={previewEffectiveStats.defence}
                bonus={previewEffectiveStats.defence - previewBaseStats.defence}
                highlighted={previewEffectiveStats.defence !== effectiveStats.defence}
              />
              <StatBox
                flex={0.85}
                label="HP"
                value={previewEffectiveStats.maxHp}
                bonus={previewEffectiveStats.maxHp - previewBaseStats.maxHp}
                highlighted={previewEffectiveStats.maxHp !== effectiveStats.maxHp}
              />
              <StatBox
                flex={1.15}
                label="CRIT RATE"
                value={pct(previewEffectiveStats.critChance)}
                bonus={previewEffectiveStats.critChance - previewBaseStats.critChance}
                isPercent
                highlighted={previewEffectiveStats.critChance !== effectiveStats.critChance}
              />
              <StatBox
                flex={1.15}
                label="DODGE RATE"
                value={pct(previewEffectiveStats.dodge)}
                bonus={previewEffectiveStats.dodge - previewBaseStats.dodge}
                isPercent
                highlighted={previewEffectiveStats.dodge !== effectiveStats.dodge}
              />
              <StatBox
                flex={1.15}
                label="BAG SLOTS"
                value={previewEffectiveStats.bagSlots}
                bonus={previewEffectiveStats.bagSlots - previewBaseStats.bagSlots}
                highlighted={previewEffectiveStats.bagSlots !== effectiveStats.bagSlots}
              />
            </View>

            {/* Stance details */}
            {stance && (
              <View style={styles.stanceSection}>
                <Text style={styles.sectionTitle}>Innate Ability</Text>
                <View style={styles.stanceCard}>
                  <View style={StyleSheet.absoluteFill}>
                    <Svg width="100%" height="100%">
                      <Defs>
                        <LinearGradient id="stanceGrad" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0%" stopColor="#102719" stopOpacity="1" />
                          <Stop offset="100%" stopColor="#0A160F" stopOpacity="1" />
                        </LinearGradient>
                      </Defs>
                      <Rect width="100%" height="100%" fill="url(#stanceGrad)" rx={14} />
                      <Rect x="1" y="1" width="98%" height="98%" rx={13} fill="none" stroke="rgba(212, 167, 84, 0.15)" strokeWidth={1} />
                    </Svg>
                  </View>
                  <View style={styles.stanceCardInner}>
                    <View style={styles.stanceHeaderRow}>
                      <View style={styles.stanceEmojiWrapper}>
                        <ItemSprite
                          spritesheet="icons-1"
                          frameIndex={
                            (hero.element || '').toLowerCase() === 'fire' ? 33 :
                            (hero.element || '').toLowerCase() === 'wind' ? 34 :
                            (hero.element || '').toLowerCase() === 'water' ? 35 :
                            36 // earth fallback
                          }
                          displaySize={24}
                        />
                      </View>
                      <View>
                        <Text style={styles.stanceName}>{stance.name}</Text>
                        <Text style={styles.stanceElement}>Path of {hero.element.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.stanceDesc}>{stance.description}</Text>
                    {stanceBonusText ? (
                      <View style={styles.stanceBonusBox}>
                        <Text style={styles.stanceBonusLabel}>Current Level Bonus:</Text>
                        <Text style={styles.stanceBonusVal}>{stanceBonusText}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.tabContent}>
            {/* Active Set Bonuses */}
            {activeSets.length > 0 && (
              <View style={styles.statsSection}>
                <Text style={styles.subSectionTitle}>✨ Active Set Bonuses</Text>
                {activeSets.map((set) => (
                  <View key={set.name} style={styles.setBonusCard}>
                    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                      <Defs>
                        <LinearGradient id={`setGrad_${set.name}`} x1="0" y1="0" x2="1" y2="0">
                          <Stop offset="0%" stopColor="#102418" />
                          <Stop offset="100%" stopColor="#060F0A" />
                        </LinearGradient>
                      </Defs>
                      <Rect width="100%" height="100%" fill={`url(#setGrad_${set.name})`} rx={12} />
                      <Rect x="1" y="1" width="99%" height="98%" rx={11} fill="none"
                        stroke="rgba(212,167,84,0.25)" strokeWidth={1} />
                    </Svg>
                    <View style={styles.setBonusInner}>
                      <Text style={styles.setBonusName}>🔗 {set.name}</Text>
                      <Text style={styles.setBonusDesc}>{set.bonus}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Equipment Grid */}
            <Text style={styles.sectionTitle}>Equipped Gear</Text>
            <View style={styles.equipmentGrid}>
              {SLOT_ROWS.map((row, rowIdx) => (
                <View key={rowIdx} style={styles.slotRow}>
                  {row.map((slotKey) => {
                    const slotConfig = SLOT_CONFIG.find((s) => s.key === slotKey);
                    const gearId = hero.gear?.[slotKey];
                    const gearDef = gearId ? GEAR[gearId] : null;
                    const isEmpty = !gearDef;
                    const isWeapon = slotKey === 'weapon';

                    return (
                      <TouchableOpacity
                        key={slotKey}
                        style={[
                          styles.slotCard,
                          isEmpty ? styles.slotCardEmpty : styles.slotCardEquipped,
                        ]}
                        onPress={() => handleOpenSlot(slotKey)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.slotCardInfo}>
                          <Text style={styles.slotLabel}>{slotConfig.label}</Text>
                          <Text
                            style={isEmpty ? styles.slotEmptyText : styles.slotItemName}
                            numberOfLines={2}
                          >
                            {isEmpty ? 'Empty' : gearDef.name}
                          </Text>
                          <Text style={styles.slotItemStats} numberOfLines={1}>
                            {isEmpty ? ' ' : (statSummary(gearDef) || ' ')}
                          </Text>
                        </View>
                        <View style={[
                          styles.slotIconBox,
                          isEmpty ? styles.slotIconBoxEmpty : styles.slotIconBoxEquipped,
                        ]}>
                          {isEmpty ? (
                            isWeapon ? (
                              <SpriteFrame
                                source={WEAPONS_SHEET}
                                frameIndex={0}
                                frameSize={WEAPONS_FRAME_SIZE}
                                totalFrames={WEAPONS_FRAMES}
                                displaySize={36}
                                opacity={0.18}
                              />
                            ) : SLOT_EMPTY_FRAME[slotKey] !== undefined && (
                              <SpriteFrame
                                source={EQUIPMENT_LEATHER_SHEET}
                                frameIndex={SLOT_EMPTY_FRAME[slotKey]}
                                frameSize={EQUIPMENT_LEATHER_FRAME_SIZE}
                                totalFrames={EQUIPMENT_LEATHER_FRAMES}
                                displaySize={36}
                                opacity={0.18}
                              />
                            )
                          ) : (
                            gearDef.spritesheet ? (
                              <ItemSprite
                                spritesheet={gearDef.spritesheet}
                                frameIndex={gearDef.frameIndex}
                                displaySize={36}
                              />
                            ) : (
                              <Image
                                source={GEAR_ICON_PLACEHOLDER}
                                style={styles.slotIconImage}
                                resizeMode="contain"
                              />
                            )
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Equipment Slot Popup ── */}
      <Modal
        visible={!!selectedSlot}
        transparent
        animationType="none"
        onRequestClose={() => setSelectedSlot(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedSlot(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {modalData.candidates.length > 0 ? `Choose a ${modalData.slotConfig?.label}` : `No ${modalData.slotConfig?.label} Yet`}
              </Text>
              <TouchableOpacity onPress={() => setSelectedSlot(null)} activeOpacity={0.7}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {modalData.candidates.length > 0 ? (
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {modalData.candidates.map((item) => {
                  const isEquipped = item.isEquipped;
                  const deltas = item.deltas;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.compareRow, isEquipped && styles.compareRowEquipped]}
                      onPress={() => !isEquipped && handleEquipFromSlot(item.id)}
                      activeOpacity={isEquipped ? 1 : 0.8}
                      disabled={isEquipped}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        {item.spritesheet ? (
                          <ItemSprite
                            spritesheet={item.spritesheet}
                            frameIndex={item.frameIndex}
                            displaySize={36}
                          />
                        ) : (
                          <Image
                            source={GEAR_ICON_PLACEHOLDER}
                            style={{ width: 36, height: 36 }}
                            resizeMode="contain"
                          />
                        )}
                        <View style={{ flex: 1 }}>
                          <View style={styles.compareRowHeader}>
                            <Text style={styles.compareItemName}>{item.name}</Text>
                            {isEquipped && (
                              <View style={styles.equippedBadge}>
                                <Text style={styles.equippedBadgeText}>EQUIPPED</Text>
                              </View>
                            )}
                          </View>
                          {!!statSummary(item) && (
                            <Text style={styles.compareItemStats}>{statSummary(item)}</Text>
                          )}
                          {!!item.description && (
                            <Text style={styles.compareItemDesc}>{item.description}</Text>
                          )}
                          {!isEquipped && deltas.length > 0 && (
                            <View style={styles.deltaRow}>
                              {deltas.map((d) => (
                                <Text
                                  key={d.label}
                                  style={[styles.deltaText, { color: d.positive ? '#5CC489' : '#EF4444' }]}
                                >
                                  {d.label} {d.text}
                                </Text>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyStateBody}>
                <Text style={styles.emptyStateEmoji}>🏛️</Text>
                <Text style={styles.emptyStateText}>
                  No {modalData.slotConfig?.label} gear owned yet. Visit the Shop to find gear for this slot!
                </Text>
                <TouchableOpacity style={styles.shopBtn} onPress={handleGoToShop} activeOpacity={0.8}>
                  <Text style={styles.shopBtnText}>Go to Shop →</Text>
                </TouchableOpacity>
              </View>
            )}

            {!!modalData.currentGearId && (
              <TouchableOpacity style={styles.unequipBtn} onPress={handleUnequip} activeOpacity={0.8}>
                <Text style={styles.unequipBtnText}>Unequip {modalData.slotConfig?.label}</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── SpriteFrame ───────────────────────────────────────────────────────────────
function SpriteFrame({ source, frameIndex, frameSize, totalFrames, displaySize = 36, opacity = 1 }) {
  const scale = displaySize / frameSize;
  return (
    <View style={{ width: displaySize, height: displaySize, overflow: 'hidden', opacity }}>
      <Image
        source={source}
        style={{
          width: frameSize * totalFrames * scale,
          height: displaySize,
          position: 'absolute',
          left: -(frameIndex * displaySize),
          top: 0,
        }}
        resizeMode="stretch"
      />
    </View>
  );
}

// ─── StatBox ─────────────────────────────────────────────────────────────────
function StatBox({ label, value, bonus, isPercent, variant, flex = 1, highlighted }) {
  const showBonus = bonus !== undefined && Math.abs(bonus) > 0.0001;
  const bonusText = isPercent ? `+${Math.round(bonus * 100)}%` : `+${bonus}`;
  const isAttribute = variant === 'attribute';
  return (
    <View style={[styles.statBox, { flex }, isAttribute && styles.statBoxAttribute]}>
      <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{label}</Text>
      <Text style={[
        styles.statValue, 
        isAttribute && styles.statValueAttribute,
        highlighted && { color: '#5CC489' }
      ]}>{value}</Text>
      <Text style={styles.statBonus}>{showBonus ? bonusText : ' '}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#133131',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    marginTop: 6,
    marginBottom: 14,
    borderWidth: 0,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 6,
    borderWidth: 2,
  },
  tabBtnActive: {
    backgroundColor: '#F3E2BD',
    borderColor: '#4A3917',
  },
  tabBtnInactive: {
    backgroundColor: '#0D2216',
    borderColor: '#183C25',
  },
  tabLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    fontWeight: 'normal',
    letterSpacing: 0,
  },
  tabLabelActive: {
    color: '#2A1A0C',
  },
  tabLabelInactive: {
    color: '#F3E2BD',
    opacity: 0.6,
  },
  tabContent: {
    marginTop: 4,
  },
  pointsBadge: {
    backgroundColor: 'rgba(212, 167, 84, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
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
    marginBottom: 14,
  },
  attributeCard: {
    flex: 1,
    backgroundColor: 'rgba(16, 44, 28, 0.35)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(92, 196, 137, 0.18)',
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 100,
  },
  attributeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
  confirmBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
    marginBottom: 14,
  },
  confirmBtnText: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 14,
    fontWeight: 'normal',
    color: '#1A1200',
    zIndex: 2,
  },
  stanceSection: {
    marginTop: 6,
    marginBottom: 16,
  },
  stanceCard: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0A160F',
  },
  stanceCardInner: {
    padding: 16,
    zIndex: 2,
  },
  stanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  stanceEmojiWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 167, 84, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stanceEmoji: {
    fontSize: 18,
  },
  stanceName: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 15,
    fontWeight: 'normal',
    color: '#F8FAFC',
  },
  stanceElement: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    color: '#D4A754',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  stanceDesc: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
  },
  stanceBonusBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  stanceBonusLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    color: '#64748B',
  },
  stanceBonusVal: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 13,
    color: '#5CC489',
    marginTop: 2,
  },
  statsSection: {
    marginBottom: 14,
  },
  subSectionTitle: {
    fontFamily: 'PixelifySans-Medium',
    fontWeight: 'normal',
    fontSize: 13,
    color: '#D4A754',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  setBonusCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  setBonusInner: {
    padding: 12,
    zIndex: 2,
  },
  setBonusName: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 13,
    fontWeight: 'normal',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  setBonusDesc: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    color: '#94A3B8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,167,84,0.12)',
  },
  backBtn: { width: 36, paddingVertical: 6 },
  backText: {
    color: theme.COLORS.candleGold,
    fontWeight: 'bold',
    fontSize: 26,
    lineHeight: 26,
  },
  title: {
    ...theme.FONTS.display,
    fontSize: 20,
    color: theme.COLORS.parchment,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
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
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
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
    borderColor: '#133131',
    alignItems: 'center',
    justifyContent: 'center',
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
  heroName: {
    ...theme.FONTS.display,
    fontSize: 18,
    color: theme.COLORS.ghostWhite,
    marginBottom: 8,
  },
  gaugesStack: {
    gap: theme.SPACING.tight,
  },
  sectionTitle: {
    fontFamily: 'PixelifySans-Medium',
    fontWeight: 'normal',
    fontSize: 13,
    color: theme.COLORS.parchment,
    marginBottom: 6,
    marginTop: 0,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 10,
    minHeight: 44,
    paddingVertical: 5,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    backgroundColor: 'rgba(16, 44, 28, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(92, 196, 137, 0.18)',
  },
  statBoxAttribute: {
    backgroundColor: 'rgba(92,196,137,0.08)',
    borderColor: 'rgba(92,196,137,0.3)',
  },
  statLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 7,
    fontWeight: 'normal',
    color: '#707F94',
    letterSpacing: 0.3,
    maxWidth: '100%',
  },
  statValue: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 13,
    fontWeight: 'normal',
    color: theme.COLORS.candleGold,
  },
  statValueAttribute: {
    color: theme.COLORS.buffMint,
  },
  statBonus: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 7,
    fontWeight: 'normal',
    color: '#5CC489',
  },
  equipmentGrid: {
    marginBottom: 16,
    gap: 8,
  },
  slotRow: {
    flexDirection: 'row',
    gap: 8,
  },
  slotCard: {
    flex: 1,
    minHeight: 92,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(212,167,84,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(212,167,84,0.25)',
    gap: 8,
  },
  slotCardEmpty: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  slotCardEquipped: {
    backgroundColor: 'rgba(181, 112, 26, 0.16)',
    borderColor: 'rgba(232, 167, 58, 0.5)',
  },
  slotCardInfo: {
    flex: 1,
    minHeight: 72,
    justifyContent: 'space-between',
  },
  slotLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    fontWeight: 'normal',
    color: '#707F94',
    letterSpacing: 0.5,
    textAlign: 'left',
  },
  slotItemName: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: 'normal',
    color: theme.COLORS.parchment,
    textAlign: 'left',
  },
  slotItemStats: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    fontWeight: 'normal',
    color: '#5CC489',
    textAlign: 'left',
  },
  slotEmptyText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    fontStyle: 'italic',
    color: '#707F94',
    textAlign: 'left',
  },
  slotIconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(212,167,84,0.25)',
  },
  slotIconBoxEmpty: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  slotIconBoxEquipped: {
    backgroundColor: 'rgba(139, 90, 43, 0.25)',
    borderColor: 'rgba(212, 167, 84, 0.45)',
  },
  slotIconImage: {
    width: 36,
    height: 36,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: '#1A1200',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(212,167,84,0.25)',
    padding: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    ...theme.FONTS.display,
    fontSize: 16,
    color: theme.COLORS.parchment,
    flex: 1,
    marginRight: 8,
  },
  modalCloseText: {
    color: theme.COLORS.candleGold,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalList: {
    maxHeight: 400,
  },
  compareRow: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  compareRowEquipped: {
    backgroundColor: 'rgba(212,167,84,0.08)',
    borderColor: 'rgba(212,167,84,0.3)',
  },
  compareRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compareItemName: {
    fontFamily: 'PixelifySans-Medium',
    fontWeight: 'normal',
    fontSize: 14,
    color: theme.COLORS.parchment,
  },
  compareItemStats: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#A8B0BD',
  },
  compareItemDesc: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#707F94',
    marginTop: 2,
  },
  equippedBadge: {
    backgroundColor: 'rgba(212,167,84,0.18)',
    borderColor: 'rgba(212,167,84,0.4)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  equippedBadgeText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    fontWeight: 'normal',
    color: '#D4A754',
    letterSpacing: 0.5,
  },
  deltaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  deltaText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    fontWeight: 'normal',
  },
  emptyStateBody: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  emptyStateEmoji: {
    fontSize: 40,
  },
  emptyStateText: {
    fontFamily: 'PixelifySans-Regular',
    fontSize: 13,
    color: theme.COLORS.parchment,
    textAlign: 'center',
    lineHeight: 18,
  },
  shopBtn: {
    backgroundColor: 'rgba(212,167,84,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(212,167,84,0.4)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  shopBtnText: {
    fontFamily: 'PixelifySans-Medium',
    fontWeight: 'normal',
    fontSize: 13,
    color: theme.COLORS.candleGold,
  },
  unequipBtn: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 12,
    alignItems: 'center',
  },
  unequipBtnText: {
    fontFamily: 'PixelifySans-Medium',
    fontWeight: 'normal',
    fontSize: 13,
    color: '#EF4444',
  },
});
