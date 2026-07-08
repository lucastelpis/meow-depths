/**
 * ProfileScreen.js — Mochi's Profile (Character stats and equipment)
 *
 * Displays hero card, attributes, and 8-slot equipment grid.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  Dimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect } from 'react-native-svg';

import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { calculateEffectiveStats, getXpForLevel, getActiveSetBonuses, STANCES, getStanceBonus } from '../logic/progressionEngine';
import AnimatedSprite from '../components/AnimatedSprite';
import ResourceBar from '../components/ui/ResourceBar';
import { HERO_SPRITE } from '../constants/sprites';
import { GEAR, CONSUMABLES, MATERIALS, getGearForSlot } from '../data/gear';
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
  { key: 'stats', spritesheet: 'icons-map', frameIndex: 105, label: 'Stats' },
  { key: 'equipment', spritesheet: 'icons-1', frameIndex: 10, label: 'Gear' },
  { key: 'bag', spritesheet: 'icons-1', frameIndex: 26, label: 'Bag' },
];

const MATERIAL_ZONES = [
  {
    label: 'Soggy Ruins',
    zoneColor: '#3FB56E',
    ids: ['black_shard', 'black_crystal_small', 'black_crystal_big', 'black_crystal_core'],
  },
  {
    label: 'Twisted Garden',
    zoneColor: '#A855F7',
    ids: ['green_shard', 'green_crystal_small', 'green_crystal_big', 'green_crystal_core'],
  },
  {
    label: 'Sunken Docks',
    zoneColor: '#06B6D4',
    ids: ['yellow_shard', 'yellow_crystal_small', 'yellow_crystal_big', 'yellow_crystal_core'],
  },
];

const STANCE_SPRITES = {
  fire: { spritesheet: 'icons-1', frameIndex: 33 },
  water: { spritesheet: 'icons-1', frameIndex: 35 },
  earth: { spritesheet: 'icons-1', frameIndex: 36 },
  wind: { spritesheet: 'icons-1', frameIndex: 34 },
};

const LORE_DESCRIPTIONS = {
  potion: "A standard brew made from healing herbs. Tastes slightly of peppermint.",
  super_potion: "A stronger concentrate of healing herbs, glowing with a soft blue light.",
  mega_potion: "A potent elixir infused with ancient life essence. Tastes like sweet honey.",
  ultra_potion: "The pinnacle of alchemy. A single drop can stitch deep wounds instantly.",
  antidote: "Made from crushed wild herbs. Neutralizes toxic substances in the veins.",
  smoke_vial: "A fragile glass flask filled with compressed, blinding fog. Great for escape.",
  mystery_chest: "A locked treasure chest salvaged from the deep. Who knows what crystals lie within?",
  black_shard: "A sharp fragment of obsidian-like crystal, cold to the touch. Found in dark sewer corners.",
  black_crystal_small: "A small crystal pulsing with a faint, dark resonance. Emits a low hum.",
  black_crystal_big: "A large chunk of dark crystal, heavy and dense. Vibrates when close to metal.",
  black_crystal_core: "The pristine, concentrated center of a black crystal. Radiant with dark energy.",
  green_shard: "A glowing emerald shard harvested from overgrown roots. Warm and lively.",
  green_crystal_small: "A minor forest gem that seems to breathe in sync with the garden.",
  green_crystal_big: "A heavy green gemstone, overgrown with tiny moss. Rich in natural magic.",
  green_crystal_core: "A pulsating heart of pure garden energy, warm and humming with growth.",
  yellow_shard: "A bright amber shard washed up from the depths, smelling of sea salt.",
  yellow_crystal_small: "A small luminescent gemstone that glows like a firefly underwater.",
  yellow_crystal_big: "A large, heavy golden crystal. It seems to resist the pressure of the ocean.",
  yellow_crystal_core: "An ancient marine crystal core. It glows with the intense light of the deep sea.",
  toy_sword: "A wooden training sword. Mostly harmless, but good for building confidence.",
  cardboard_armor: "A taped-together box. Smells like old wet paper, but offers basic protection.",
  leather_bag: "A small pouch for carrying basic items. Increases bag capacity by +3 slots.",
  simple_backpack: "A simple, reliable backpack. Increases bag capacity by +5 slots.",
  fine_backpack: "A well-crafted, sturdy backpack with extra pockets. Increases bag capacity by +7 slots.",
  luxury_backpack: "An exquisite, high-capacity backpack made of fine leather. Increases bag capacity by +10 slots.",
  sewer_shiv: "A jagged piece of metal wrapped in dirty rags. Crude, but dangerous.",
  rat_hide_vest: "Tough leather made from sewer rats. Surprisingly flexible and waterproof.",
  slimecrawler_shell: "A hardened shell coated in slick mucus. Repels toxic liquids.",
  plague_cloak: "A tattered cowl that has survived the worst of the soggyness.",
  gnarlcrown: "A crown woven from thorny roots. Increases precision in combat.",
  cockroach_carapace: "A shield-like plate made of thick insect shell. Highly durable.",
  thorn_dagger: "A weapon crafted from giant garden thorns. Coated in natural toxins.",
  beetle_shell_vest: "A heavy vest reinforced with iridescent beetle plates.",
  spore_cloak: "A lightweight cloak that releases silent spores when moving.",
  vine_wrap: "Woven vines that tighten around the wearer, boosting vitality.",
  granite_crawler_eye: "A glowing amber bead that increases magic and skill potency.",
  glowspore_vial: "A glass pendant containing bioluminescent spores.",
  ghost_cutlass: "A spectral saber that cuts through the air with an eerie whistle.",
  barnacle_plate: "Heavy plate armor covered in stubborn barnacles. Extremely tough.",
  ghost_silk_coat: "A coat woven from ethereal threads, allowing the wearer to slip past attacks.",
  saltcaptain_coat: "The weathered coat of a lost sea captain, resistant to wind and wave.",
  abomination_compass: "An old brass compass whose needle points towards weaknesses.",
  toxin_vial: "A vial filled with concentrated sea viper venom.",
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const minItemWidth = 100;
const gap = 10;
const padding = 16;
const availableWidth = SCREEN_WIDTH - (padding * 2);
const numColumns = Math.max(1, Math.floor((availableWidth + gap) / (minItemWidth + gap)));
const itemWidth = (availableWidth - (gap * (numColumns - 1))) / numColumns;

// ─── Stat & attribute explanations (shown in the (i) info popup) ──────────────
const STAT_INFO = {
  // Core attributes
  str: {
    title: 'Strength',
    color: '#F9D99A',
    desc: "Your raw physical might — the muscle behind every swipe.",
    effects: ['+1 Attack per point'],
  },
  agi: {
    title: 'Agility',
    color: '#06B6D4',
    desc: 'Reflexes and footwork. Helps land critical hits and slip past blows.',
    effects: ['+0.5% Crit Rate per point', '+0.5% Dodge Rate per point'],
  },
  vit: {
    title: 'Vitality',
    color: '#5CC489',
    desc: 'Toughness and resilience. Keeps you standing and shrugging off ailments.',
    effects: ['+5 Max HP per point', '+0.5% Status Resistance per point'],
  },
  // Combat stats
  atk: {
    title: 'Attack',
    color: theme.COLORS.candleGold,
    desc: 'The base power of Your hits, before the enemy\'s defence is applied.',
    effects: ['Strength (+1 per point)', 'Gear', 'Fire stance (+ATK%)'],
  },
  def: {
    title: 'Defence',
    color: theme.COLORS.candleGold,
    desc: 'Reduces incoming damage.',
    effects: ['Earth stance (+1 DEF/level)', 'Gear'],
  },
  maxHp: {
    title: 'Max HP',
    color: theme.COLORS.candleGold,
    desc: 'Your total health. If it reaches 0 during an expedition, the run ends and you lose any hoarded items.',
    effects: ['Vitality (+5 per point)', 'Gear', 'Water stance (+HP%)'],
  },
  bagSlots: {
    title: 'Bag Slots',
    color: theme.COLORS.candleGold,
    desc: 'How many consumables you can pack to bring on an expedition.',
    effects: ['Gear'],
  },
  critRate: {
    title: 'Crit Rate',
    color: theme.COLORS.candleGold,
    desc: 'Chance for an attack to land as a critical hit for bonus damage.',
    effects: ['Agility (+0.5% per point)', 'Gear', 'Wind stance'],
  },
  critDmg: {
    title: 'Crit Damage',
    color: theme.COLORS.candleGold,
    desc: 'The damage multiplier of a critical hit.',
    effects: ['Skills', 'Gear'],
  },
  dodge: {
    title: 'Dodge Rate',
    color: theme.COLORS.candleGold,
    desc: 'Chance to avoid an incoming attack entirely, taking no damage.',
    effects: ['Agility (+0.5% per point)', 'Gear', 'Wind stance', 'Skills'],
  },
  statusRes: {
    title: 'Status Resistance',
    color: theme.COLORS.candleGold,
    desc: 'Chance to resist an incoming status effect such as bleed or stun.',
    effects: ['Vitality (+0.5% per point)', 'Skills'],
  },
};

// ─── Equipment slot config ────────────────────────────────────────────────────
const SLOT_CONFIG = [
  { key: 'head', label: 'Head', emoji: '🪖' },
  { key: 'chest', label: 'Chest', emoji: '🛡️' },
  { key: 'gloves', label: 'Gloves', emoji: '🧤' },
  { key: 'legs', label: 'Legs', emoji: '👖' },
  { key: 'boots', label: 'Boots', emoji: '👢' },
  { key: 'weapon', label: 'Weapon', emoji: '⚔️' },
  { key: 'trinket', label: 'Trinket', emoji: '💎' },
  { key: 'storage', label: 'Storage', emoji: '🎒' },
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

  const [selectedItem, setSelectedItem] = useState(null);
  const [itemType, setItemType] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ── Stat Allocation Local State ──
  const [tempStrAlloc, setTempStrAlloc] = useState(0);
  const [tempAgiAlloc, setTempAgiAlloc] = useState(0);
  const [tempVitAlloc, setTempVitAlloc] = useState(0);

  // Which stat's info popup is open (null = closed)
  const [infoStat, setInfoStat] = useState(null);

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

  const handleCancelAlloc = () => {
    setTempStrAlloc(0);
    setTempAgiAlloc(0);
    setTempVitAlloc(0);
  };

  const handleSaveAlloc = () => {
    handleConfirmAllocation();
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
  const xpForNext = getXpForLevel(hero.level + 1);
  const xpIntoLevel = hero.xp - xpForCurrent;
  const xpNeeded = xpForNext - xpForCurrent;

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

  const stanceSprite = useMemo(() => {
    return hero.element ? STANCE_SPRITES[hero.element.toLowerCase()] : null;
  }, [hero.element]);

  const elementDisplayName = useMemo(() => {
    if (!hero.element) return '';
    return hero.element.charAt(0).toUpperCase() + hero.element.slice(1).toLowerCase();
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
    if (gearDef.stats.attack) parts.push(`ATK +${gearDef.stats.attack}`);
    if (gearDef.stats.defence) parts.push(`DEF +${gearDef.stats.defence}`);
    if (gearDef.stats.maxHp) parts.push(`HP +${gearDef.stats.maxHp}`);
    if (gearDef.stats.critChance) parts.push(`CRIT +${pct(gearDef.stats.critChance)}`);
    if (gearDef.stats.dodge) parts.push(`DODGE +${pct(gearDef.stats.dodge)}`);
    if (gearDef.stats.bagSlots) parts.push(`Bag Slots +${gearDef.stats.bagSlots}`);
    return parts.join('  ');
  };

  // Stat-by-stat delta of `candidate` vs the currently equipped piece
  const statDeltas = (candidateDef, currentDef) => {
    const STAT_FIELDS = [
      { key: 'attack', label: 'ATK', percent: false },
      { key: 'defence', label: 'DEF', percent: false },
      { key: 'maxHp', label: 'HP', percent: false },
      { key: 'critChance', label: 'CRIT', percent: true },
      { key: 'dodge', label: 'DODGE', percent: true },
      { key: 'bagSlots', label: 'Bag Slots', percent: false },
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

  const handleOpenDetails = (item, type) => {
    setSelectedItem(item);
    setItemType(type);
    setModalVisible(true);
  };

  const isMaterialZoneOpened = (zoneIndex) => {
    if (zoneIndex === 0) return true;
    if (zoneIndex === 1) return !!state.progress.zone1Cleared;
    if (zoneIndex === 2) return !!state.progress.zone2Cleared;
    return false;
  };

  const handleOpenChest = () => {
    const rolledGold = Math.floor(Math.random() * 31) + 15;
    const rolledMaterials = {};
    const families = ['black', 'green', 'yellow'];
    const rollTier = () => {
      const r = Math.random() * 100;
      if (r < 60) return 'shard';
      if (r < 85) return 'crystal_small';
      if (r < 97) return 'crystal_big';
      return 'core';
    };
    for (let i = 0; i < 3; i++) {
      const fam = families[Math.floor(Math.random() * families.length)];
      const tier = rollTier();
      const key = tier === 'shard' ? `${fam}_shard`
        : tier === 'core' ? `${fam}_crystal_core`
          : `${fam}_${tier}`;
      rolledMaterials[key] = (rolledMaterials[key] || 0) + 1;
    }
    const lines = [`💰 ${rolledGold} gold`];
    Object.entries(rolledMaterials).forEach(([id, qty]) => {
      let e = '💎';
      if (id.startsWith('black')) e = '🖤';
      if (id.startsWith('green')) e = '💚';
      if (id.startsWith('yellow')) e = '💛';
      lines.push(`${e} ${MATERIALS[id]?.name || id} ×${qty}`);
    });
    Alert.alert('🎁 Chest Opened!', `You obtained:\n\n${lines.join('\n')}`, [{
      text: 'Awesome!',
      onPress: () => {
        dispatch({ type: 'OPEN_LOOTBOX', payload: { gold: rolledGold, materials: rolledMaterials } });
        setModalVisible(false);
      },
    }]);
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
          <Text style={styles.backText}>← Hub</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <ExpoImage
            source={require('../../assets/sprites/units/hero/hero_head.png')}
            style={{ width: 24, height: 24 }}
            contentFit="contain"
          />
          <Text style={styles.titleText}>Profile</Text>
        </View>
        <View style={styles.headerSpacer} />
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
            <Text style={[styles.goldChipText, { marginLeft: 4 }]}>{hero.gold} G</Text>
          </View>

          {/* Avatar & level badge */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <ExpoImage
                source={require('../../assets/sprites/units/hero/hero_idle1.png')}
                style={{ width: 110, height: 110 }}
                contentFit="contain"
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
          {TABS.map(({ key, spritesheet, frameIndex, label }) => {
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
                  spritesheet={spritesheet || "icons-1"}
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
        {activeTab === 'stats' && (
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
                <TouchableOpacity
                  style={styles.infoTag}
                  onPress={() => setInfoStat('str')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.infoTagText}>?</Text>
                </TouchableOpacity>
                <View style={styles.attrHeader}>
                  <ItemSprite spritesheet="icons-map" frameIndex={109} displaySize={18} />
                  <Text style={styles.attrLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>STRENGTH</Text>
                </View>
                <Text style={styles.attrValue}>{previewStr}</Text>
                {showControls && (
                  <View style={styles.allocRow}>
                    <TouchableOpacity
                      style={[styles.allocBtn, tempStrAlloc === 0 && styles.allocBtnDisabled]}
                      onPress={() => adjustStat('str', -1)}
                      disabled={tempStrAlloc === 0}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.allocBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.allocNumber}>{tempStrAlloc}</Text>
                    <TouchableOpacity
                      style={[styles.allocBtn, remainingPoints === 0 && styles.allocBtnDisabled]}
                      onPress={() => adjustStat('str', 1)}
                      disabled={remainingPoints === 0}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.allocBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Agility Card */}
              <View style={[styles.attributeCard, { borderColor: 'rgba(6, 182, 212, 0.25)' }]}>
                <TouchableOpacity
                  style={styles.infoTag}
                  onPress={() => setInfoStat('agi')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.infoTagText}>?</Text>
                </TouchableOpacity>
                <View style={styles.attrHeader}>
                  <ItemSprite spritesheet="icons-map" frameIndex={94} displaySize={18} />
                  <Text style={styles.attrLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>AGILITY</Text>
                </View>
                <Text style={styles.attrValue}>{previewAgi}</Text>
                {showControls && (
                  <View style={styles.allocRow}>
                    <TouchableOpacity
                      style={[styles.allocBtn, tempAgiAlloc === 0 && styles.allocBtnDisabled]}
                      onPress={() => adjustStat('agi', -1)}
                      disabled={tempAgiAlloc === 0}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.allocBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.allocNumber}>{tempAgiAlloc}</Text>
                    <TouchableOpacity
                      style={[styles.allocBtn, remainingPoints === 0 && styles.allocBtnDisabled]}
                      onPress={() => adjustStat('agi', 1)}
                      disabled={remainingPoints === 0}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.allocBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Vitality Card */}
              <View style={[styles.attributeCard, { borderColor: 'rgba(92, 196, 137, 0.25)' }]}>
                <TouchableOpacity
                  style={styles.infoTag}
                  onPress={() => setInfoStat('vit')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.infoTagText}>?</Text>
                </TouchableOpacity>
                <View style={styles.attrHeader}>
                  <ItemSprite spritesheet="icons-map" frameIndex={135} displaySize={18} />
                  <Text style={styles.attrLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>VITALITY</Text>
                </View>
                <Text style={styles.attrValue}>{previewVit}</Text>
                {showControls && (
                  <View style={styles.allocRow}>
                    <TouchableOpacity
                      style={[styles.allocBtn, tempVitAlloc === 0 && styles.allocBtnDisabled]}
                      onPress={() => adjustStat('vit', -1)}
                      disabled={tempVitAlloc === 0}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.allocBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.allocNumber}>{tempVitAlloc}</Text>
                    <TouchableOpacity
                      style={[styles.allocBtn, remainingPoints === 0 && styles.allocBtnDisabled]}
                      onPress={() => adjustStat('vit', 1)}
                      disabled={remainingPoints === 0}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.allocBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Allocation Save/Cancel Row */}
            {showControls && totalAllocated > 0 && (
              <View style={styles.saveRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelAlloc} activeOpacity={0.7}>
                  <Text style={styles.cancelBtnText}>Reset Points</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAlloc} activeOpacity={0.7}>
                  <Text style={styles.saveBtnText}>Apply Stats</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Effective Combat Stats */}
            <Text style={styles.sectionTitle}>Combat Statistics</Text>
            <View style={styles.statsRow}>
              <StatBox
                label="ATTACK"
                infoKey="atk"
                onInfo={setInfoStat}
                value={previewEffectiveStats.attack}
                bonus={previewEffectiveStats.attack - previewBaseStats.attack}
                highlighted={previewEffectiveStats.attack !== effectiveStats.attack}
                pendingDelta={previewEffectiveStats.attack - effectiveStats.attack}
              />
              <StatBox
                label="DEFENCE"
                infoKey="def"
                onInfo={setInfoStat}
                value={previewEffectiveStats.defence}
                bonus={previewEffectiveStats.defence - previewBaseStats.defence}
                highlighted={previewEffectiveStats.defence !== effectiveStats.defence}
                pendingDelta={previewEffectiveStats.defence - effectiveStats.defence}
              />
              <StatBox
                label="MAX HP"
                infoKey="maxHp"
                onInfo={setInfoStat}
                value={previewEffectiveStats.maxHp}
                bonus={previewEffectiveStats.maxHp - previewBaseStats.maxHp}
                highlighted={previewEffectiveStats.maxHp !== effectiveStats.maxHp}
                pendingDelta={previewEffectiveStats.maxHp - effectiveStats.maxHp}
              />
              <StatBox
                label="BAG SLOTS"
                infoKey="bagSlots"
                onInfo={setInfoStat}
                value={previewEffectiveStats.bagSlots}
                bonus={previewEffectiveStats.bagSlots - previewBaseStats.bagSlots}
                highlighted={previewEffectiveStats.bagSlots !== effectiveStats.bagSlots}
                pendingDelta={previewEffectiveStats.bagSlots - effectiveStats.bagSlots}
              />
            </View>

            <View style={styles.statsRow}>
              <StatBox
                label="CRIT RATE"
                infoKey="critRate"
                onInfo={setInfoStat}
                value={pct(previewEffectiveStats.critChance)}
                bonus={previewEffectiveStats.critChance - previewBaseStats.critChance}
                isPercent
                highlighted={previewEffectiveStats.critChance !== effectiveStats.critChance}
                pendingDelta={previewEffectiveStats.critChance - effectiveStats.critChance}
              />
              <StatBox
                label="CRIT DMG"
                infoKey="critDmg"
                onInfo={setInfoStat}
                value="150%"
                highlighted={false}
                pendingDelta={0}
              />
              <StatBox
                label="DODGE RATE"
                infoKey="dodge"
                onInfo={setInfoStat}
                value={pct(previewEffectiveStats.dodge)}
                bonus={previewEffectiveStats.dodge - previewBaseStats.dodge}
                isPercent
                highlighted={previewEffectiveStats.dodge !== effectiveStats.dodge}
                pendingDelta={previewEffectiveStats.dodge - effectiveStats.dodge}
              />
              <StatBox
                label="STATUS RES"
                infoKey="statusRes"
                onInfo={setInfoStat}
                value={pct(previewEffectiveStats.passives.statusResistChance)}
                bonus={previewEffectiveStats.passives.statusResistChance - (previewVit * 0.005)}
                isPercent
                highlighted={previewEffectiveStats.passives.statusResistChance !== effectiveStats.passives.statusResistChance}
                pendingDelta={previewEffectiveStats.passives.statusResistChance - effectiveStats.passives.statusResistChance}
              />
            </View>

            {/* Stance Card */}
            {stance && (
              <View style={styles.stanceSection}>
                <View style={styles.stanceCard}>
                  <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                    <Defs>
                      <LinearGradient id="stanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#102719" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#0A160F" stopOpacity="1" />
                      </LinearGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#stanceGrad)" />
                  </Svg>
                  <View style={styles.stanceCardInner}>
                    <View style={styles.stanceRow}>
                      <View style={styles.stanceLeft}>
                        <View style={styles.stanceEmojiWrapper}>
                          {stanceSprite ? (
                            <ItemSprite
                              spritesheet={stanceSprite.spritesheet}
                              frameIndex={stanceSprite.frameIndex}
                              displaySize={22}
                            />
                          ) : (
                            <ItemSprite spritesheet="icons-map" frameIndex={52} displaySize={22} />
                          )}
                        </View>
                        <Text style={styles.stanceName}>{elementDisplayName} Stance</Text>
                      </View>
                      <View style={styles.stanceRight}>
                        <Text style={styles.stanceBonusVal}>{stanceBonusText}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === 'equipment' && (
          <View style={styles.tabContent}>
            {/* Active Set Bonuses */}
            {activeSets.length > 0 && (
              <View style={styles.statsSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <ItemSprite spritesheet="icons-map" frameIndex={140} displaySize={16} />
                  <Text style={[styles.subSectionTitle, { marginBottom: 0 }]}>Active Set Bonuses</Text>
                </View>
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <ItemSprite spritesheet="icons-map" frameIndex={95} displaySize={14} />
                        <Text style={[styles.setBonusName, { marginBottom: 0 }]}>{set.name}</Text>
                      </View>
                      <Text style={styles.setBonusDesc}>{set.bonus}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Equipment Grid */}
            <Text style={styles.sectionTitle}>Equipped</Text>
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
                              <ExpoImage
                                source={GEAR_ICON_PLACEHOLDER}
                                style={styles.slotIconImage}
                                contentFit="contain"
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

            {/* Crafted Gear Section (My Armory) */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Owned</Text>
            {(hero.inventory?.craftedGear || []).length === 0 ? (
              <View style={styles.emptyBox}>
                <View style={{ marginBottom: 8 }}>
                  <ItemSprite spritesheet="icons-map" frameIndex={69} displaySize={36} />
                </View>
                <Text style={styles.emptyTitle}>No Gear Crafted</Text>
                <Text style={styles.emptyDesc}>Visit the Shop to forge equipment from your materials.</Text>
              </View>
            ) : (
              <View style={styles.gridContainer}>
                {[...(hero.inventory?.craftedGear || [])]
                  .map(gearId => ({ id: gearId, ...GEAR[gearId] }))
                  .filter(item => !!item.name)
                  .sort((a, b) => {
                    if (a.zone !== b.zone) {
                      return a.zone - b.zone;
                    }
                    return (a.goldCost || 0) - (b.goldCost || 0);
                  })
                  .map((gearDef) => {
                    const gearId = gearDef.id;
                    const isEquipped = Object.values(hero.gear).includes(gearId);
                    return (
                      <TouchableOpacity
                        key={gearId}
                        style={[
                          styles.gridCard,
                          { width: itemWidth, height: itemWidth },
                          isEquipped && styles.gridCardGearEquipped,
                        ]}
                        onPress={() => handleOpenSlot(gearDef.type)}
                        activeOpacity={0.8}
                      >
                        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                          <Rect width="100%" height="100%" fill="rgba(255,255,255,0.015)" rx={14} />
                          <Rect x="1" y="1" width="98%" height="98%" rx={13} fill="none"
                            stroke={isEquipped ? 'rgba(212,167,84,0.4)' : 'rgba(255,255,255,0.04)'} strokeWidth={isEquipped ? 1.5 : 1} />
                        </Svg>
                        <View style={styles.gridCardInner}>
                          <Text style={styles.gridName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{gearDef.name}</Text>
                          <View style={styles.gridIconWrap}>
                            {gearDef.spritesheet ? (
                              <ItemSprite
                                spritesheet={gearDef.spritesheet}
                                frameIndex={gearDef.frameIndex}
                                displaySize={42}
                              />
                            ) : (
                              <ItemSprite spritesheet="icons-map" frameIndex={17} displaySize={42} />
                            )}
                          </View>
                          <View style={styles.gridTagSlot}>
                            {isEquipped ? (
                              <View style={[styles.gridTagBadge, styles.gridEquippedBadge]}>
                                <Text style={[styles.gridTagText, styles.gridEquippedText]}>EQUIPPED</Text>
                              </View>
                            ) : (
                              <View style={[styles.gridTagBadge, styles.gridSlotBadge]}>
                                <Text style={styles.gridTagText}>{gearDef.type.toUpperCase()}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            )}
          </View>
        )}

        {activeTab === 'bag' && (
          <View style={styles.tabContent}>
            {/* Supplies Section */}
            <Text style={styles.sectionTitle}>Supplies</Text>
            {(() => {
              const items = (hero.inventory?.consumables || []).filter(c => c.quantity > 0);
              if (items.length === 0) {
                return (
                  <View style={styles.emptyBox}>
                    <View style={{ marginBottom: 8 }}>
                      <ItemSprite spritesheet="consumables-1" frameIndex={0} displaySize={36} />
                    </View>
                    <Text style={styles.emptyTitle}>Bag Empty</Text>
                    <Text style={styles.emptyDesc}>Visit the Shop to stock up on potions and supplies.</Text>
                  </View>
                );
              }
              return (
                <View style={styles.gridContainer}>
                  {items.map((entry) => {
                    const def = CONSUMABLES.find(c => c.id === entry.id);
                    const iconSize = def?.spritesheet === 'icons-1' ? 48 : 42;
                    return (
                      <TouchableOpacity
                        key={entry.id}
                        style={[styles.gridCard, { width: itemWidth, height: itemWidth }]}
                        onPress={() => handleOpenDetails(entry, 'consumable')}
                        activeOpacity={0.8}
                      >
                        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                          <Rect width="100%" height="100%" fill="rgba(255,255,255,0.015)" rx={14} />
                          <Rect x="1" y="1" width="98%" height="98%" rx={13} fill="none"
                            stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                        </Svg>
                        <View style={styles.gridCardInner}>
                          <Text style={styles.gridName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{def?.name || entry.id}</Text>
                          <View style={styles.gridIconWrap}>
                            {def?.spritesheet ? (
                              <ItemSprite spritesheet={def.spritesheet} frameIndex={def.frameIndex} displaySize={iconSize} />
                            ) : (
                              <ItemSprite spritesheet="consumables-1" frameIndex={0} displaySize={iconSize} />
                            )}
                          </View>
                          <View style={styles.gridTagSlot}>
                            <View style={[styles.gridTagBadge, styles.gridQtyBadge]}>
                              <Text style={[styles.gridTagText, styles.gridQtyText]}>×{entry.quantity}</Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })()}

            {/* Materials Section */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Materials</Text>
            {(() => {
              const materials = hero.inventory?.materials || {};
              const allMaterials = [];
              MATERIAL_ZONES.forEach((zone, zIdx) => {
                if (!isMaterialZoneOpened(zIdx)) return;

                zone.ids.forEach((id) => {
                  const qty = materials[id] || 0;
                  if (qty > 0) {
                    allMaterials.push({
                      id,
                      qty,
                      name: MATERIALS[id]?.name || id,
                      zone,
                    });
                  }
                });
              });

              if (allMaterials.length === 0) {
                return (
                  <View style={styles.emptyBox}>
                    <View style={{ marginBottom: 8 }}>
                      <ItemSprite spritesheet="crystals-1" frameIndex={2} displaySize={36} />
                    </View>
                    <Text style={styles.emptyTitle}>No Materials</Text>
                    <Text style={styles.emptyDesc}>Explore regions and defeat enemies to collect crystals and shards.</Text>
                  </View>
                );
              }

              return (
                <View style={styles.gridContainer}>
                  {allMaterials.map((mat) => {
                    return (
                      <TouchableOpacity
                        key={mat.id}
                        style={[styles.gridCard, { width: itemWidth, height: itemWidth }]}
                        onPress={() => handleOpenDetails(mat, 'material')}
                        activeOpacity={0.8}
                      >
                        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                          <Defs>
                            <RadialGradient id={`matGlow_${mat.id}`} cx="0%" cy="50%" rx="50%" ry="80%">
                              <Stop offset="0%" stopColor={mat.zone.zoneColor} stopOpacity="0.04" />
                              <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
                            </RadialGradient>
                          </Defs>
                          <Rect width="100%" height="100%" fill="rgba(255,255,255,0.015)" rx={14} />
                          <Rect width="100%" height="100%" fill={`url(#matGlow_${mat.id})`} rx={14} />
                          <Rect x="1" y="1" width="98%" height="98%" rx={13} fill="none"
                            stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                        </Svg>
                        <View style={styles.gridCardInner}>
                          <Text style={styles.gridName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{mat.name}</Text>
                          <View style={styles.gridIconWrap}>
                            {MATERIALS[mat.id]?.spritesheet ? (
                              <ItemSprite
                                spritesheet={MATERIALS[mat.id].spritesheet}
                                frameIndex={MATERIALS[mat.id].frameIndex}
                                displaySize={42}
                              />
                            ) : (
                              <ItemSprite spritesheet="crystals-1" frameIndex={0} displaySize={42} />
                            )}
                          </View>
                          <View style={styles.gridTagSlot}>
                            <View style={[styles.gridTagBadge, styles.gridQtyBadge]}>
                              <Text style={[styles.gridTagText, styles.gridQtyText]}>×{mat.qty}</Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })()}
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
          <Pressable style={styles.modalCardOuter} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalCardInner}>
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
                            <ExpoImage
                              source={GEAR_ICON_PLACEHOLDER}
                              style={{ width: 36, height: 36 }}
                              contentFit="contain"
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
                  <View style={{ marginBottom: 4 }}>
                    <ItemSprite spritesheet="icons-map" frameIndex={49} displaySize={40} />
                  </View>
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
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Details Popup Modal (Consumables/Materials) ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCardOuter} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalCardInner}>
              {selectedItem && (
                (() => {
                  let title = '';
                  let icon = '';
                  let spritesheet = null;
                  let frameIndex = 0;
                  let category = '';
                  let categoryColor = '#D4A754';
                  let lore = LORE_DESCRIPTIONS[selectedItem.id] || '';
                  let statusText = '';
                  let showOpenChestBtn = false;

                  if (itemType === 'consumable') {
                    const def = CONSUMABLES.find(c => c.id === selectedItem.id);
                    title = def?.name || selectedItem.id;
                    spritesheet = def?.spritesheet || null;
                    frameIndex = def?.frameIndex || 0;
                    category = 'Consumable';
                    categoryColor = '#3FB56E';
                    statusText = `Owned: ${selectedItem.quantity}`;
                    if (selectedItem.id === 'mystery_chest') {
                      showOpenChestBtn = true;
                    }
                  } else if (itemType === 'material') {
                    title = selectedItem.name;
                    spritesheet = MATERIALS[selectedItem.id]?.spritesheet || null;
                    frameIndex = MATERIALS[selectedItem.id]?.frameIndex || 0;
                    category = 'Crafting Material';
                    categoryColor = selectedItem.zone.zoneColor;
                    statusText = `Owned: ${selectedItem.qty}`;
                  }

                  const getRarityDetails = (itemId) => {
                    let label = 'COMMON';
                    let color = '#94A3B8';
                    let bg = 'rgba(148, 163, 184, 0.12)';

                    const rares = [
                      'mega_potion', 'mystery_chest',
                      'green_shard', 'green_crystal_small', 'green_crystal_big', 'green_crystal_core'
                    ];
                    const epics = [
                      'ultra_potion',
                      'yellow_shard', 'yellow_crystal_small', 'yellow_crystal_big', 'yellow_crystal_core'
                    ];
                    const uncommons = [
                      'super_potion', 'antidote', 'smoke_vial',
                      'black_shard', 'black_crystal_small', 'black_crystal_big', 'black_crystal_core'
                    ];

                    if (epics.includes(itemId)) {
                      label = 'EPIC';
                      color = '#A855F7';
                      bg = 'rgba(168, 85, 247, 0.12)';
                    } else if (rares.includes(itemId)) {
                      label = 'RARE';
                      color = '#06B6D4';
                      bg = 'rgba(6, 182, 212, 0.12)';
                    } else if (uncommons.includes(itemId)) {
                      label = 'UNCOMMON';
                      color = '#3FB56E';
                      bg = 'rgba(63, 181, 110, 0.12)';
                    }
                    return { label, color, bg };
                  };

                  const rarity = getRarityDetails(selectedItem.id);

                  return (
                    <View style={{ width: '100%' }}>
                      {/* Header */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ fontFamily: 'Jersey10-Regular', fontSize: 24, color: '#FFF3DA' }}>{title}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {itemType !== 'consumable' && (
                              <View style={{ backgroundColor: rarity.bg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: rarity.color + '40' }}>
                                <Text style={{ fontFamily: 'Silkscreen-Regular', fontSize: 8, color: rarity.color }}>{rarity.label}</Text>
                              </View>
                            )}
                            <Text style={{ fontSize: 12, color: categoryColor, fontWeight: 'bold' }}>{category.toUpperCase()}</Text>
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => setModalVisible(false)} activeOpacity={0.7} style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontFamily: 'Jersey10-Regular', fontSize: 20, color: 'rgba(255, 243, 218, 0.6)' }}>✕</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Icon Wrap */}
                      <View style={{ alignItems: 'center', marginVertical: 16 }}>
                        <View style={{
                          width: 80,
                          height: 80,
                          borderRadius: 40,
                          backgroundColor: 'rgba(212, 167, 84, 0.05)',
                          borderWidth: 2,
                          borderColor: 'rgba(212, 167, 84, 0.25)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 8,
                          shadowColor: '#D4A754',
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.3,
                          shadowRadius: 6,
                        }}>
                          {spritesheet ? (
                            <ItemSprite spritesheet={spritesheet} frameIndex={frameIndex} displaySize={48} />
                          ) : (
                            <ItemSprite spritesheet="icons-map" frameIndex={17} displaySize={48} />
                          )}
                        </View>
                        <Text style={{ fontFamily: 'Silkscreen-Regular', fontSize: 9, color: '#94A3B8', marginTop: 4 }}>
                          {statusText.toUpperCase()}
                        </Text>
                      </View>

                      {/* Description / Lore */}
                      {!!lore && (
                        <View style={{
                          backgroundColor: 'rgba(26, 18, 0, 0.35)',
                          borderColor: 'rgba(212, 167, 84, 0.15)',
                          borderWidth: 1.2,
                          borderRadius: 8,
                          padding: 12,
                          marginBottom: 18,
                        }}>
                          <Text style={{ fontSize: 13, color: '#F3E2BD', fontStyle: 'italic', lineHeight: 18, textAlign: 'center' }}>
                            "{lore}"
                          </Text>
                        </View>
                      )}

                      {/* Actions */}
                      <View style={{ gap: 8 }}>
                        {showOpenChestBtn && (
                          <TouchableOpacity style={styles.primaryActionBtn} onPress={handleOpenChest} activeOpacity={0.85}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                              <ItemSprite spritesheet="icons-map" frameIndex={53} displaySize={18} />
                              <Text style={styles.primaryActionText}>Open Mystery Chest</Text>
                            </View>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.secondaryActionBtn} onPress={() => setModalVisible(false)} activeOpacity={0.85}>
                          <Text style={styles.secondaryActionText}>Close</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })()
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Stat / Attribute Info Popup ── */}
      <Modal
        visible={infoStat !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoStat(null)}
      >
        <Pressable style={styles.infoModalOverlay} onPress={() => setInfoStat(null)}>
          <Pressable style={styles.infoModalContent} onPress={(e) => e.stopPropagation()}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <LinearGradient id="statInfoGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#102719" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#0A160F" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#statInfoGrad)" rx={18} />
              <Rect x="1" y="1" width="98%" height="98%" rx={17} fill="none" stroke="rgba(212, 167, 84, 0.18)" strokeWidth={1} />
            </Svg>

            {infoStat && STAT_INFO[infoStat] && (
              <View style={styles.infoModalInner}>
                <Text style={[styles.infoModalTitle, { color: STAT_INFO[infoStat].color }]}>
                  {STAT_INFO[infoStat].title}
                </Text>
                <Text style={styles.infoModalDesc}>{STAT_INFO[infoStat].desc}</Text>
                <View style={styles.infoModalEffects}>
                  {STAT_INFO[infoStat].effects.map((line) => (
                    <View key={line} style={styles.infoEffectRow}>
                      <Text style={styles.infoEffectBullet}>›</Text>
                      <Text style={styles.infoEffectText}>{line}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.infoCloseBtn}
                  onPress={() => setInfoStat(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.infoCloseBtnText}>Got it</Text>
                </TouchableOpacity>
              </View>
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
      <ExpoImage
        source={source}
        style={{
          width: frameSize * totalFrames * scale,
          height: displaySize,
          position: 'absolute',
          left: -(frameIndex * displaySize),
          top: 0,
        }}
        contentFit="fill"
      />
    </View>
  );
}

// ─── StatBox ─────────────────────────────────────────────────────────────────
function StatBox({ label, value, bonus, isPercent, variant, flex = 1, highlighted, infoKey, onInfo, pendingDelta }) {
  const showBonus = bonus !== undefined && Math.abs(bonus) > 0.0001;
  const bonusText = isPercent ? `+${Math.round(bonus * 100)}%` : `+${bonus}`;
  const isAttribute = variant === 'attribute';

  const showPending = pendingDelta !== undefined && Math.abs(pendingDelta) > 0.0001;
  const pendingText = isPercent
    ? `+${(pendingDelta * 100).toFixed(1).replace(/\.0$/, '')}%`
    : `+${pendingDelta}`;

  return (
    <View style={[styles.statBox, { flex }, isAttribute && styles.statBoxAttribute]}>
      {infoKey && onInfo && (
        <TouchableOpacity
          style={styles.infoTagSmall}
          onPress={() => onInfo(infoKey)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.6}
        >
          <Text style={styles.infoTagText}>?</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 2 }}>
        <Text style={[
          styles.statValue,
          isAttribute && styles.statValueAttribute,
          highlighted && { color: '#5CC489' }
        ]}>{value}</Text>
        {showPending && (
          <Text style={{ fontFamily: 'Jersey10-Regular', fontSize: 12, color: '#5CC489' }}>
            ({pendingText})
          </Text>
        )}
      </View>
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
    fontFamily: 'Jersey10-Regular',
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
    backgroundColor: 'rgba(16, 44, 28, 0.45)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(92, 196, 137, 0.25)',
    paddingVertical: 12,
    paddingLeft: 10,
    paddingRight: 4,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 6,
    minHeight: 78,
  },
  attrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
  },
  attrEmoji: {
    fontFamily: 'System',
    fontSize: 16,
  },
  attrLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    fontWeight: 'normal',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    color: '#F3E2BD', // parchment
  },
  attrValue: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 26,
    fontWeight: 'normal',
    color: '#FFF3DA', // bright gold/yellow-white
    marginVertical: 0,
    letterSpacing: 1,
  },
  attrSubtext: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 13,
    fontWeight: 'normal',
    color: '#CFE0EE', // ghostWhite calculations text
    textAlign: 'left',
  },
  allocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    marginVertical: 4,
  },
  allocBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(212, 167, 84, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(212, 167, 84, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allocBtnDisabled: {
    opacity: 0.2,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  allocBtnText: {
    fontFamily: 'Jersey10-Regular',
    color: '#F5CF7A',
    fontSize: 18,
    fontWeight: 'normal',
    marginTop: -2,
  },
  allocNumber: {
    fontFamily: 'Jersey10-Regular',
    color: '#FFF3DA',
    fontSize: 18,
    fontWeight: 'normal',
    minWidth: 16,
    textAlign: 'center',
  },
  saveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
    marginBottom: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 14,
    color: '#EF4444',
  },
  saveBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(92, 196, 137, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(92, 196, 137, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 14,
    color: '#5CC489',
  },
  attributeValueHighlight: {
    color: '#D4A754',
    fontWeight: 'bold',
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
    fontFamily: 'Jersey10-Regular',
    fontSize: 14,
    fontWeight: 'normal',
    color: '#1A1200',
    zIndex: 2,
  },
  stanceSection: {
    marginTop: 12,
    marginBottom: 6,
  },
  stanceCard: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0A160F',
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.25)',
  },
  stanceCardInner: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    zIndex: 2,
  },
  stanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  stanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stanceRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  stanceEmojiWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 167, 84, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stanceName: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
    fontWeight: 'normal',
    color: '#F8FAFC',
  },
  stanceBonusVal: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: '#5CC489',
    textAlign: 'right',
  },
  statsSection: {
    marginBottom: 14,
  },
  subSectionTitle: {
    fontFamily: 'Jersey10-Regular',
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
    fontFamily: 'Jersey10-Regular',
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  backBtn: { width: 70, paddingVertical: 6 },
  backText: {
    color: '#D4A754',
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  titleText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 20,
    color: '#F8FAFC',
    letterSpacing: 0.8,
  },
  headerSpacer: { width: 70 },
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
    fontFamily: 'Jersey10-Regular',
    color: '#1A1200',
    fontWeight: 'normal',
    fontSize: 15,
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
    fontFamily: 'Jersey10-Regular',
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
    minHeight: 46,
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 4,
    alignItems: 'flex-start',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 44, 28, 0.55)', // slightly darker green panel bg
    borderWidth: 1.5,
    borderColor: 'rgba(92, 196, 137, 0.3)', // more visible border
  },
  statBoxAttribute: {
    backgroundColor: 'rgba(92,196,137,0.12)',
    borderColor: 'rgba(92,196,137,0.45)',
  },
  statLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    fontWeight: 'normal',
    color: '#CFE0EE', // ghostWhite for high readability
    letterSpacing: 0.3,
    maxWidth: '100%',
  },
  statValue: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    fontWeight: 'normal',
    color: '#FBBF24', // bright gold value
    letterSpacing: 0.2,
  },
  statValueAttribute: {
    color: '#5CC489', // bright mint green
  },
  statBonus: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 11,
    lineHeight: 11,
    fontWeight: 'normal',
    letterSpacing: 0.5,
    color: '#5CC489',
  },
  // ── (i) info tag — mirrors the battle skill info button ──
  infoTag: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.COLORS.panelBorderGoldStrong,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  infoTagSmall: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: theme.COLORS.panelBorderGoldStrong,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  infoTagText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 12,
    lineHeight: 13,
    color: theme.COLORS.candleGold,
    fontStyle: 'italic',
    fontWeight: 'bold',
    textTransform: 'none',
  },
  // ── Stat / attribute info modal ──
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  infoModalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    overflow: 'hidden',
  },
  infoModalInner: {
    padding: 20,
  },
  infoModalTitle: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 16,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  infoModalDesc: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 14,
    lineHeight: 19,
    color: theme.COLORS.parchment,
    marginBottom: 14,
  },
  infoModalEffects: {
    gap: 6,
    marginBottom: 18,
  },
  infoEffectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  infoEffectBullet: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 14,
    color: theme.COLORS.candleGold,
    lineHeight: 18,
  },
  infoEffectText: {
    flex: 1,
    fontFamily: 'Jersey10-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#C9D6C0',
  },
  infoCloseBtn: {
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 167, 84, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.4)',
  },
  infoCloseBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 12,
    color: theme.COLORS.candleGold,
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
    backgroundColor: 'rgba(232, 167, 58, 0.08)',
    borderColor: '#E8A73A',
    borderWidth: 1.5,
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
    color: '#94A3B8', // brighter slate grey for slot names
    letterSpacing: 0.5,
    textAlign: 'left',
  },
  slotItemName: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: 'bold',
    color: '#FFFFFF', // high-contrast white
    textAlign: 'left',
  },
  slotItemStats: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    fontWeight: 'normal',
    color: '#6EE7B7', // brighter mint for stats readability
    textAlign: 'left',
  },
  slotEmptyText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    fontStyle: 'italic',
    color: '#64748B', // readable slate grey for empty text
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
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCardOuter: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: '#4A3917',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#4A3917',
    padding: 3,
  },
  modalCardInner: {
    backgroundColor: '#1E1E20',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(212,167,84,0.5)',
    padding: 16,
    overflow: 'hidden',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 17,
    color: '#FFF3DA',
    flex: 1,
    marginRight: 8,
  },
  modalCloseText: {
    fontFamily: 'Jersey10-Regular',
    color: 'rgba(255, 243, 218, 0.6)',
    fontSize: 16,
  },
  modalList: {
    maxHeight: 400,
  },
  compareRow: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#142C1C',
    borderWidth: 2,
    borderColor: 'rgba(74,57,23,0.6)',
    gap: 4,
  },
  compareRowEquipped: {
    backgroundColor: '#1C2E1B',
    borderColor: '#E8A73A',
  },
  compareRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compareItemName: {
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 14,
    color: theme.COLORS.parchment,
  },
  compareItemStats: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#E8A73A',
  },
  compareItemDesc: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#94A3B8', // readable blue-grey
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
    fontFamily: 'System',
    fontSize: 40,
  },
  emptyStateText: {
    fontFamily: 'Jersey10-Regular',
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
    fontFamily: 'Jersey10-Regular',
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
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 13,
    color: '#EF4444',
  },

  /* ── Grid Layouts ── */
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 4,
    width: '100%',
  },
  gridCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(212, 167, 84, 0.25)',
    backgroundColor: 'rgba(16, 44, 28, 0.45)',
  },
  gridCardGearEquipped: {
    borderColor: '#D4A754',
    backgroundColor: 'rgba(212, 167, 84, 0.1)',
  },
  gridCardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
  },
  gridIconWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridIcon: {
    fontFamily: 'System',
    fontSize: 28,
  },
  gridName: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 14,
    color: '#F3E2BD',
    textAlign: 'center',
    lineHeight: 14,
    height: 28,
    width: '100%',
  },
  gridTagSlot: {
    minHeight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridTagBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1,
  },
  gridTagText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 11,
    letterSpacing: 0.3,
    color: '#F3E2BD',
  },
  gridQtyBadge: {
    borderColor: 'rgba(212, 167, 84, 0.3)',
    backgroundColor: 'rgba(212, 167, 84, 0.1)',
    borderWidth: 1,
  },
  gridQtyText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 12,
    color: '#D4A754',
    fontWeight: 'bold',
  },
  gridEquippedBadge: {
    borderColor: 'rgba(212,167,84,0.4)',
    backgroundColor: 'rgba(212,167,84,0.12)',
  },
  gridEquippedText: {
    color: '#D4A754',
  },
  gridSlotBadge: {
    borderColor: 'rgba(212, 167, 84, 0.25)',
    backgroundColor: 'rgba(212, 167, 84, 0.06)',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 44, 28, 0.45)',
    borderColor: 'rgba(92, 196, 137, 0.25)',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    marginVertical: 8,
  },
  emptyEmoji: {
    fontFamily: 'System',
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 20,
    color: '#FFF3DA',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#F3E2BD',
    textAlign: 'center',
  },
  primaryActionBtn: {
    backgroundColor: '#B5701A',
    borderColor: '#E8A73A',
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E8A73A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryActionText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: '#FFF3DA',
    fontWeight: 'bold',
  },
  secondaryActionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: '#CFE0EE',
  },
  rarityBadge: {
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderWidth: 1,
  },
  rarityText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    fontWeight: 'normal',
    letterSpacing: 0.8,
  },
});
