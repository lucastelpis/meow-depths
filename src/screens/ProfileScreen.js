/**
 * ProfileScreen.js — Mochi's Profile (Character stats and equipment)
 *
 * Displays hero card, attributes, and 8-slot equipment grid.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Animated,
  Easing,
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
import { getReinforceLevel, getReinforceBonus } from '../data/reinforcement';
import ItemSprite from '../components/ItemSprite';
import TabBar from '../components/ui/TabBar';
import SubTabBar from '../components/ui/SubTabBar';
import ParchmentModal from '../components/ui/ParchmentModal';

const HERO_AVATAR_DISPLAY_SIZE = 80;

const ELEMENT_SPRITES = {
  fire: 33,
  wind: 34,
  water: 35,
  earth: 36,
};

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
  trinket: 10, // leather belt silhouette
  trinket2: 10, // second trinket slot — same leather belt silhouette
};

// Faded weapon silhouette shown in the empty weapon slot
const WEAPONS_SHEET = require('../../assets/sprites/items/weapons-1.png');
const WEAPONS_FRAME_SIZE = 32;
const WEAPONS_FRAMES = 10;

const TABS = [
  { key: 'stats', spritesheet: 'icons-map', frameIndex: 29, label: 'Stats' },
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
  yellow_shard: "A bright amber shard washed up from the sea floor, smelling of sea salt.",
  yellow_crystal_small: "A small luminescent gemstone that glows like a firefly underwater.",
  yellow_crystal_big: "A large, heavy golden crystal. It seems to resist the pressure of the ocean.",
  yellow_crystal_core: "An ancient marine crystal core. It glows with the intense light of the deep sea.",
  toy_sword: "A wooden training sword. Mostly harmless, but good for building confidence.",
  cardboard_armor: "A taped-together box. Smells like old wet paper, but offers basic protection.",
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
const gap = 10;
const padding = 16;
const availableWidth = SCREEN_WIDTH - (padding * 2);

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
    desc: 'Reflexes and footwork. Sets your turn order in combat, helps land critical hits, and slips past blows.',
    effects: ['Defines turn order in battle', '+0.5% Crit Rate per point', '+0.5% Dodge Rate per point'],
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
    effects: ['Strength (+1 per point)', 'Gear', 'Fire affinity (+ATK%)'],
  },
  def: {
    title: 'Defence',
    color: theme.COLORS.candleGold,
    desc: 'Reduces incoming damage.',
    effects: ['Earth affinity (+1 DEF/level)', 'Gear'],
  },
  maxHp: {
    title: 'Max HP',
    color: theme.COLORS.candleGold,
    desc: 'Your total health. If it reaches 0 during an expedition, the run ends and you lose any hoarded items.',
    effects: ['Vitality (+5 per point)', 'Gear', 'Water affinity (+HP%)'],
  },
  critRate: {
    title: 'Crit Rate',
    color: theme.COLORS.candleGold,
    desc: 'Chance for an attack to land as a critical hit for bonus damage.',
    effects: ['Agility (+0.5% per point)', 'Gear', 'Wind affinity'],
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
    effects: ['Agility (+0.5% per point)', 'Gear', 'Wind affinity', 'Skills'],
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
  { key: 'trinket2', label: 'Trinket', emoji: '💎' },
];

// Slot keys laid out per row of the equipment grid (2 cards per row)
const SLOT_ROWS = [
  ['head', 'chest'],
  ['gloves', 'legs'],
  ['weapon', 'boots'],
  ['trinket', 'trinket2'],
];

// Owned-tab type filter: icon-only chips (reusing the empty-slot silhouettes);
// 'all' is the only text entry.
const GEAR_TYPE_FILTERS = [
  { key: 'all', label: 'ALL' },
  { key: 'weapon', spritesheet: 'weapons-1', frameIndex: 1 },
  { key: 'head', spritesheet: 'equipment-leather', frameIndex: 1 },
  { key: 'chest', spritesheet: 'equipment-leather', frameIndex: 3 },
  { key: 'gloves', spritesheet: 'equipment-leather', frameIndex: 7 },
  { key: 'legs', spritesheet: 'equipment-leather', frameIndex: 5 },
  { key: 'boots', spritesheet: 'equipment-leather', frameIndex: 9 },
  { key: 'trinket', spritesheet: 'equipment-leather', frameIndex: 10 },
];

// Compact stat line for a gear piece (base + reinforcement), e.g. "ATK +7  CRIT +5%".
const LIST_STAT_FIELDS = [
  { key: 'attack', label: 'ATK', percent: false },
  { key: 'defence', label: 'DEF', percent: false },
  { key: 'maxHp', label: 'HP', percent: false },
  { key: 'critChance', label: 'CRIT', percent: true },
  { key: 'dodge', label: 'DODGE', percent: true },
];
function gearStatText(gearDef, reinfLevel) {
  const bonus = getReinforceBonus(gearDef);
  const add = reinfLevel * bonus.perLevel;
  return LIST_STAT_FIELDS.reduce((parts, { key, label, percent }) => {
    const val = (gearDef.stats?.[key] || 0) + (key === bonus.stat ? add : 0);
    if (val) parts.push(`${label} +${percent ? Math.round(val * 100) + '%' : val}`);
    return parts;
  }, []).join('  ');
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { state, dispatch } = useGame();
  const { hero } = state;

  const initialTab = route.params?.initialTab || 'stats';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [gearSubTab, setGearSubTab] = useState('equipped');
  const [ownedFilter, setOwnedFilter] = useState('all'); // Owned-tab gear-type filter

  // Cozy scrollbar slider values
  const [contentHeight, setContentHeight] = useState(1);
  const [visibleHeight, setVisibleHeight] = useState(1);
  const scrollY = useRef(new Animated.Value(0)).current;

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

  // Rhythmic border shine on the stat-points banner while points are unspent.
  const statGlow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop;
    if (remainingPoints > 0) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(statGlow, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(statGlow, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ])
      );
      loop.start();
    } else {
      statGlow.setValue(0);
    }
    return () => { if (loop) loop.stop(); };
  }, [remainingPoints]);

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
      return `+${Math.round((bonus.atkPercent || 0) * 100)}% ATK`;
    }
    if (hero.element.toLowerCase() === 'water') {
      return `+${Math.round((bonus.maxHpPercent || 0) * 100)}% Max HP`;
    }
    if (hero.element.toLowerCase() === 'earth') {
      return `+${bonus.defBonus || 0} DEF`;
    }
    if (hero.element.toLowerCase() === 'wind') {
      return `+${bonus.agiBonus || 0} Agility`;
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

  const renderItemStats = (item, isEquipped, currentDef) => {
    if (!item?.stats) return null;
    const STAT_FIELDS = [
      { key: 'attack', label: 'ATK', percent: false },
      { key: 'defence', label: 'DEF', percent: false },
      { key: 'maxHp', label: 'HP', percent: false },
      { key: 'critChance', label: 'CRIT', percent: true },
      { key: 'dodge', label: 'DODGE', percent: true },
    ];

    // Reinforcement adds to one stat (ATK for weapons, DEF otherwise). Fold it
    // into the shown value for this item and — for accurate deltas — the equipped one.
    const reinfBonus = getReinforceBonus(item);
    const reinfAdd = getReinforceLevel(hero, item.id) * reinfBonus.perLevel;
    const curBonus = currentDef ? getReinforceBonus(currentDef) : null;
    const curReinfAdd = currentDef
      ? getReinforceLevel(hero, currentDef.id) * (curBonus?.perLevel || 0)
      : 0;

    const elements = [];
    STAT_FIELDS.forEach(({ key, label, percent }) => {
      const addForKey = key === reinfBonus.stat ? reinfAdd : 0;
      const val = (item.stats[key] || 0) + addForKey;
      if (!val) return;

      const formattedVal = percent ? `+${Math.round(val * 100)}%` : `+${val}`;

      let deltaNode = null;
      if (!isEquipped) {
        const curAddForKey = curBonus && key === curBonus.stat ? curReinfAdd : 0;
        const currentVal = (currentDef?.stats?.[key] || 0) + curAddForKey;
        const diff = val - currentVal;
        if (Math.abs(diff) >= 0.0001) {
          const sign = diff > 0 ? '+' : '';
          const formattedDiff = percent ? `${sign}${Math.round(diff * 100)}%` : `${sign}${diff}`;
          const color = diff > 0 ? '#1D7044' : '#B23A3A';
          deltaNode = (
            <Text key={`${key}_delta`} style={{ color }}>
              {` (${formattedDiff})`}
            </Text>
          );
        }
      }

      elements.push(
        <Text key={key}>
          {label} {formattedVal}
          {deltaNode}
        </Text>
      );
    });

    if (elements.length === 0) return null;

    const joinedElements = [];
    elements.forEach((el, index) => {
      joinedElements.push(el);
      if (index < elements.length - 1) {
        joinedElements.push(<Text key={`spacer_${index}`}>  </Text>);
      }
    });

    return (
      <Text style={styles.compareItemStats}>
        {joinedElements}
      </Text>
    );
  };

  // Data for the equipment slot popup
  const handleOpenSlot = (slotKey) => {
    const slotConfig = SLOT_CONFIG.find((s) => s.key === slotKey);
    const gearId = hero.gear?.[slotKey];
    const gearDef = gearId ? GEAR[gearId] : null;
    const ownedIds = hero.inventory?.craftedGear || [];
    // The two trinket slots share a type — exclude whatever is equipped in the
    // sibling trinket slot so the same piece can't be equipped in both.
    const siblingSlot = slotKey === 'trinket' ? 'trinket2' : (slotKey === 'trinket2' ? 'trinket' : null);
    const siblingGearId = siblingSlot ? hero.gear?.[siblingSlot] : null;
    const candidates = getGearForSlot(slotKey)
      .filter((item) => ownedIds.includes(item.id) && item.id !== siblingGearId)
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

  // Equip a piece straight from the Owned list. Slot === type for everything
  // except trinkets, which have two slots — prefer an empty one.
  const handleEquipDirect = (gearDef) => {
    let slot = gearDef.type;
    if (slot === 'trinket') {
      if (!hero.gear?.trinket) slot = 'trinket';
      else if (!hero.gear?.trinket2) slot = 'trinket2';
      else slot = 'trinket';
    }
    dispatch({ type: 'EQUIP_GEAR', payload: { slot, gearId: gearDef.id } });
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
    const rolledGold = Math.floor(Math.random() * 51) + 50; // 50 to 100 gold
    const rolledConsumables = {};
    const potionOptions = ['potion', 'super_potion', 'mega_potion', 'antidote'];
    const potionNames = {
      potion: 'Health Potion',
      super_potion: 'Super Potion',
      mega_potion: 'Mega Potion',
      antidote: 'Antidote',
    };
    const potionEmojis = {
      potion: '🧪',
      super_potion: '🧪✨',
      mega_potion: '🧪🌟',
      antidote: '🧪💚',
    };

    // Roll 2 to 3 potions
    const potionCount = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < potionCount; i++) {
      const pot = potionOptions[Math.floor(Math.random() * potionOptions.length)];
      rolledConsumables[pot] = (rolledConsumables[pot] || 0) + 1;
    }

    const lines = [`💰 ${rolledGold} Gold`];
    Object.entries(rolledConsumables).forEach(([id, qty]) => {
      const name = potionNames[id] || id;
      const emoji = potionEmojis[id] || '🧪';
      lines.push(`${emoji} ${name} ×${qty}`);
    });

    Alert.alert('🎁 Chest Opened!', `You obtained:\n\n${lines.join('\n')}`, [{
      text: 'Awesome!',
      onPress: () => {
        dispatch({ type: 'OPEN_LOOTBOX', payload: { gold: rolledGold, consumables: rolledConsumables } });
        setModalVisible(false);
      },
    }]);
  };

  const handleUseStaminaPotion = () => {
    const currentStamina = state.hero.stamina ?? 3;
    const maxStamina = state.hero.maxStamina ?? 3;
    if (currentStamina >= maxStamina) {
      Alert.alert('Full Stamina', 'Your stamina is already fully charged!');
      return;
    }
    dispatch({ type: 'USE_CONSUMABLE', payload: { consumableId: 'stamina_potion' } });
    setModalVisible(false);
    Alert.alert('⚡ Stamina Restored!', 'You recovered 1 stamina charge.');
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
            <Text style={styles.headerTitleText}>Profile</Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          onContentSizeChange={(w, h) => setContentHeight(h)}
          onLayout={(e) => setVisibleHeight(e.nativeEvent.layout.height)}
        >
          {/* ── Section 1: Hero Card ── */}
          <View style={[styles.heroCard, theme.SHADOWS.cardShadow]}>
            <View style={StyleSheet.absoluteFill}>
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient id="heroCardGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#102719" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#0A160F" stopOpacity="1" />
                  </LinearGradient>
                  <RadialGradient id="heroAvatarGlow" cx="20%" cy="70%" rx="35%" ry="60%">
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

            {/* First Line: Name & tags in top right */}
            <View style={styles.heroHeaderRow}>
              <Text style={styles.heroName} numberOfLines={1} ellipsizeMode="tail">{hero.name}</Text>
              <View style={styles.heroTagsRow}>
                {/* Gold tag */}
                <View style={styles.bannerTag}>
                  <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={20} />
                  <Text style={styles.bannerTagText}>{hero.gold} G</Text>
                </View>

                {/* Level tag */}
                <View style={styles.bannerTag}>
                  <ItemSprite spritesheet="icons-1" frameIndex={ELEMENT_SPRITES[hero.element.toLowerCase()] || 33} displaySize={20} />
                  <Text style={styles.bannerTagText}>LV {hero.level}</Text>
                </View>
              </View>
            </View>

            {/* Second Line: Avatar and bars stack */}
            <View style={styles.heroBodyRow}>
              <View style={styles.avatarCircle}>
                <ExpoImage
                  source={require('../../assets/sprites/units/hero/hero_idle1.png')}
                  style={{ width: 140, height: 140 }}
                  contentFit="contain"
                />
              </View>

              <View style={styles.gaugesContainer}>
                <ResourceBar
                  variant="heroHp"
                  label="HP"
                  current={hero.hp}
                  max={effectiveStats.maxHp}
                  barHeight={24}
                  fontSize={19}
                />
                <ResourceBar
                  variant="xp"
                  label="XP"
                  current={xpIntoLevel}
                  max={xpNeeded}
                  barHeight={24}
                  fontSize={19}
                />
              </View>
            </View>
          </View>

          {/* ── Section 2: Tab Bar Switcher ── */}
          <TabBar
            style={styles.tabContainer}
            activeKey={activeTab}
            onSelect={(key) => {
              setActiveTab(key);
              setTempStrAlloc(0);
              setTempAgiAlloc(0);
              setTempVitAlloc(0);
            }}
            tabs={TABS}
          />

          {/* ── Tab Contents ── */}
          {activeTab === 'stats' && (
            <View style={styles.tabContent}>
              {/* Stat Points Available Banner */}
              {(hero.statPoints || 0) > 0 && (
                <Animated.View
                  style={[
                    styles.pointsBadge,
                    remainingPoints > 0 && {
                      borderColor: statGlow.interpolate({ inputRange: [0, 1], outputRange: ['rgba(63,181,110,0.4)', 'rgba(63,181,110,1)'] }),
                      shadowColor: '#3FB56E',
                      shadowOpacity: statGlow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.65] }),
                      shadowRadius: statGlow.interpolate({ inputRange: [0, 1], outputRange: [4, 12] }),
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ItemSprite spritesheet="icons-map" frameIndex={29} displaySize={18} />
                    <Text style={styles.pointsBadgeText}>AVAILABLE STAT POINTS: </Text>
                    <Text style={styles.pointsBadgeNumber}>{remainingPoints}</Text>
                  </View>
                </Animated.View>
              )}

              {/* Core Attributes List */}
              <Text style={[styles.sectionTitle, { fontSize: 24, marginBottom: 12 }]}>Attributes</Text>
              <View style={styles.attributeList}>
                {/* Strength Row */}
                <View style={[styles.attributeRow, { borderColor: 'rgba(212, 167, 84, 0.35)', position: 'relative' }]}>
                  <TouchableOpacity
                    style={styles.attrInfoBtn}
                    onPress={() => setInfoStat('str')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.attrInfoBtnText}>?</Text>
                  </TouchableOpacity>

                  <View style={styles.attrRowLeft}>
                    <View style={styles.attrIconCircle}>
                      <ItemSprite spritesheet="icons-map" frameIndex={109} displaySize={28} />
                    </View>
                    <Text style={styles.attrLabel}>STRENGTH</Text>
                  </View>
                  <View style={styles.attrRowValueContainer}>
                    <Text style={[styles.attrValue, tempStrAlloc > 0 && { color: '#5CC489' }]}>{previewStr}</Text>
                  </View>
                  <View style={styles.attrRowControlsContainer}>
                    {showControls ? (
                      <View style={styles.allocRow}>
                        <View style={styles.allocBtnWrapper}>
                          <View style={[styles.allocBtnShadow, tempStrAlloc === 0 && styles.allocBtnShadowDisabled]} />
                          <TouchableOpacity
                            style={[styles.allocBtnOuter, tempStrAlloc === 0 && styles.allocBtnOuterDisabled]}
                            onPress={() => adjustStat('str', -1)}
                            disabled={tempStrAlloc === 0}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.allocBtnInner, tempStrAlloc === 0 && styles.allocBtnInnerDisabled]}>
                              <Text style={[styles.allocBtnText, tempStrAlloc === 0 && styles.allocBtnTextDisabled]}>-</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.allocNumber}>{tempStrAlloc}</Text>
                        <View style={styles.allocBtnWrapper}>
                          <View style={[styles.allocBtnShadow, remainingPoints === 0 && styles.allocBtnShadowDisabled]} />
                          <TouchableOpacity
                            style={[styles.allocBtnOuter, remainingPoints === 0 && styles.allocBtnOuterDisabled]}
                            onPress={() => adjustStat('str', 1)}
                            disabled={remainingPoints === 0}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.allocBtnInner, remainingPoints === 0 && styles.allocBtnInnerDisabled]}>
                              <Text style={[styles.allocBtnText, remainingPoints === 0 && styles.allocBtnTextDisabled]}>+</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.allocRowSpacer} />
                    )}
                  </View>
                </View>

                {/* Agility Row */}
                <View style={[styles.attributeRow, { borderColor: 'rgba(6, 182, 212, 0.35)', position: 'relative' }]}>
                  <TouchableOpacity
                    style={styles.attrInfoBtn}
                    onPress={() => setInfoStat('agi')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.attrInfoBtnText}>?</Text>
                  </TouchableOpacity>

                  <View style={styles.attrRowLeft}>
                    <View style={styles.attrIconCircle}>
                      <ItemSprite spritesheet="icons-map" frameIndex={94} displaySize={28} />
                    </View>
                    <Text style={styles.attrLabel}>AGILITY</Text>
                  </View>
                  <View style={styles.attrRowValueContainer}>
                    <Text style={[styles.attrValue, tempAgiAlloc > 0 && { color: '#5CC489' }]}>{previewAgi}</Text>
                  </View>
                  <View style={styles.attrRowControlsContainer}>
                    {showControls ? (
                      <View style={styles.allocRow}>
                        <View style={styles.allocBtnWrapper}>
                          <View style={[styles.allocBtnShadow, tempAgiAlloc === 0 && styles.allocBtnShadowDisabled]} />
                          <TouchableOpacity
                            style={[styles.allocBtnOuter, tempAgiAlloc === 0 && styles.allocBtnOuterDisabled]}
                            onPress={() => adjustStat('agi', -1)}
                            disabled={tempAgiAlloc === 0}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.allocBtnInner, tempAgiAlloc === 0 && styles.allocBtnInnerDisabled]}>
                              <Text style={[styles.allocBtnText, tempAgiAlloc === 0 && styles.allocBtnTextDisabled]}>-</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.allocNumber}>{tempAgiAlloc}</Text>
                        <View style={styles.allocBtnWrapper}>
                          <View style={[styles.allocBtnShadow, remainingPoints === 0 && styles.allocBtnShadowDisabled]} />
                          <TouchableOpacity
                            style={[styles.allocBtnOuter, remainingPoints === 0 && styles.allocBtnOuterDisabled]}
                            onPress={() => adjustStat('agi', 1)}
                            disabled={remainingPoints === 0}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.allocBtnInner, remainingPoints === 0 && styles.allocBtnInnerDisabled]}>
                              <Text style={[styles.allocBtnText, remainingPoints === 0 && styles.allocBtnTextDisabled]}>+</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.allocRowSpacer} />
                    )}
                  </View>
                </View>

                {/* Vitality Row */}
                <View style={[styles.attributeRow, { borderColor: 'rgba(92, 196, 137, 0.35)', position: 'relative' }]}>
                  <TouchableOpacity
                    style={styles.attrInfoBtn}
                    onPress={() => setInfoStat('vit')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.attrInfoBtnText}>?</Text>
                  </TouchableOpacity>

                  <View style={styles.attrRowLeft}>
                    <View style={styles.attrIconCircle}>
                      <ItemSprite spritesheet="icons-map" frameIndex={135} displaySize={28} />
                    </View>
                    <Text style={styles.attrLabel}>VITALITY</Text>
                  </View>
                  <View style={styles.attrRowValueContainer}>
                    <Text style={[styles.attrValue, tempVitAlloc > 0 && { color: '#5CC489' }]}>{previewVit}</Text>
                  </View>
                  <View style={styles.attrRowControlsContainer}>
                    {showControls ? (
                      <View style={styles.allocRow}>
                        <View style={styles.allocBtnWrapper}>
                          <View style={[styles.allocBtnShadow, tempVitAlloc === 0 && styles.allocBtnShadowDisabled]} />
                          <TouchableOpacity
                            style={[styles.allocBtnOuter, tempVitAlloc === 0 && styles.allocBtnOuterDisabled]}
                            onPress={() => adjustStat('vit', -1)}
                            disabled={tempVitAlloc === 0}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.allocBtnInner, tempVitAlloc === 0 && styles.allocBtnInnerDisabled]}>
                              <Text style={[styles.allocBtnText, tempVitAlloc === 0 && styles.allocBtnTextDisabled]}>-</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.allocNumber}>{tempVitAlloc}</Text>
                        <View style={styles.allocBtnWrapper}>
                          <View style={[styles.allocBtnShadow, remainingPoints === 0 && styles.allocBtnShadowDisabled]} />
                          <TouchableOpacity
                            style={[styles.allocBtnOuter, remainingPoints === 0 && styles.allocBtnOuterDisabled]}
                            onPress={() => adjustStat('vit', 1)}
                            disabled={remainingPoints === 0}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.allocBtnInner, remainingPoints === 0 && styles.allocBtnInnerDisabled]}>
                              <Text style={[styles.allocBtnText, remainingPoints === 0 && styles.allocBtnTextDisabled]}>+</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.allocRowSpacer} />
                    )}
                  </View>
                </View>
              </View>

              {/* Allocation Save/Cancel Row */}
              {showControls && totalAllocated > 0 && (
                <View style={styles.saveRow}>
                  {/* Reset Points (Crimson 3D Button) */}
                  <View style={styles.cancelBtnWrapper}>
                    <View style={styles.cancelBtnShadow} />
                    <TouchableOpacity
                      style={styles.cancelBtnOuter}
                      onPress={handleCancelAlloc}
                      activeOpacity={0.8}
                    >
                      <View style={styles.cancelBtnInner}>
                        <Text style={styles.cancelBtnText}>Reset Points</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Apply Stats (Earthy Green 3D Button) */}
                  <View style={styles.saveBtnWrapper}>
                    <View style={styles.saveBtnShadow} />
                    <TouchableOpacity
                      style={styles.saveBtnOuter}
                      onPress={handleSaveAlloc}
                      activeOpacity={0.8}
                    >
                      <View style={styles.saveBtnInner}>
                        <Text style={styles.saveBtnText}>Apply Stats</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Effective Combat Stats */}
              <Text style={[styles.sectionTitle, { fontSize: 24, marginTop: 18, marginBottom: 12 }]}>Combat Statistics</Text>

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
              </View>

              <View style={styles.statsRow}>
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
                  label="CRIT RATE"
                  infoKey="critRate"
                  onInfo={setInfoStat}
                  value={pct(previewEffectiveStats.critChance)}
                  bonus={previewEffectiveStats.critChance - previewBaseStats.critChance}
                  isPercent
                  highlighted={previewEffectiveStats.critChance !== effectiveStats.critChance}
                  pendingDelta={previewEffectiveStats.critChance - effectiveStats.critChance}
                />
              </View>

              <View style={styles.statsRow}>
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
              </View>

              <View style={styles.statsRow}>
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
                          <Text style={styles.stanceName}>{elementDisplayName} Affinity</Text>
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
              {/* Gear Subtabs */}
              <SubTabBar
                style={styles.subTabBar}
                activeKey={gearSubTab}
                onSelect={setGearSubTab}
                tabs={[
                  { key: 'equipped', label: 'Equipped' },
                  { key: 'owned', label: 'Owned' },
                ]}
              />

              {gearSubTab === 'equipped' && (
                <View>
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
                            <View key={slotKey} style={styles.slotCardWrapper}>
                              {/* 1. 3D Under-Shadow */}
                              <View style={[
                                styles.slotCardShadow,
                                isEmpty ? styles.slotCardShadowEmpty : styles.slotCardShadowEquipped,
                              ]} />

                              {/* 2. Main Outer Container */}
                              <TouchableOpacity
                                style={[
                                  styles.slotCardOuter,
                                  isEmpty ? styles.slotCardOuterEmpty : styles.slotCardOuterEquipped,
                                ]}
                                onPress={() => handleOpenSlot(slotKey)}
                                activeOpacity={0.8}
                              >
                                {/* 3. Inner Container (with bevel borders and background) */}
                                <View style={[
                                  styles.slotCardInner,
                                  isEmpty ? styles.slotCardInnerEmpty : styles.slotCardInnerEquipped,
                                ]}>
                                  <View style={styles.slotCardInfo}>
                                    <Text style={[
                                      styles.slotLabel,
                                      isEmpty ? styles.slotLabelEmpty : styles.slotLabelEquipped,
                                    ]}>{slotConfig.label}</Text>
                                    <Text
                                      style={isEmpty ? styles.slotEmptyText : styles.slotItemName}
                                      numberOfLines={2}
                                    >
                                      {isEmpty ? 'Empty' : gearDef.name}
                                      {!isEmpty && getReinforceLevel(hero, gearDef.id) > 0 ? (
                                        <Text style={styles.reinforcePlusModal}> +{getReinforceLevel(hero, gearDef.id)}</Text>
                                      ) : null}
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
                                          frameIndex={1}
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
                                </View>
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {gearSubTab === 'owned' && (
                <View>
                  {(hero.inventory?.craftedGear || []).length === 0 ? (
                    <View style={styles.emptyBox}>
                      <View style={{ marginBottom: 8 }}>
                        <ItemSprite spritesheet="icons-map" frameIndex={69} displaySize={36} />
                      </View>
                      <Text style={styles.emptyTitle}>No Gear Owned</Text>
                      <Text style={styles.emptyDesc}>Visit the Shop to buy equipment with Gold.</Text>
                    </View>
                  ) : (
                    <>
                    {/* Type filter (icon-only; 'all' is text) */}
                    <View style={styles.ownedFilterBar}>
                      {GEAR_TYPE_FILTERS.map((f) => {
                        const active = ownedFilter === f.key;
                        return (
                          <TouchableOpacity
                            key={f.key}
                            style={[styles.ownedFilterChip, active && styles.ownedFilterChipActive]}
                            activeOpacity={0.85}
                            onPress={() => setOwnedFilter(f.key)}
                          >
                            {f.label ? (
                              <Text style={[styles.ownedFilterAllText, active && styles.ownedFilterAllTextActive]}>
                                {f.label}
                              </Text>
                            ) : (
                              <ItemSprite
                                spritesheet={f.spritesheet}
                                frameIndex={f.frameIndex}
                                displaySize={26}
                                opacity={active ? 1 : 0.55}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <View style={styles.ownedList}>
                      {[...(hero.inventory?.craftedGear || [])]
                        .map(gearId => ({ id: gearId, ...GEAR[gearId] }))
                        .filter(item => !!item.name)
                        .filter(item => ownedFilter === 'all' || item.type === ownedFilter)
                        .sort((a, b) => {
                          if (a.zone !== b.zone) {
                            return a.zone - b.zone;
                          }
                          return (a.goldCost || 0) - (b.goldCost || 0);
                        })
                        .map((gearDef) => {
                          const gearId = gearDef.id;
                          const isEquipped = Object.values(hero.gear).includes(gearId);
                          const reinf = getReinforceLevel(hero, gearId);
                          return (
                            <TouchableOpacity
                              key={gearId}
                              style={[
                                styles.listRow,
                                isEquipped && styles.listRowEquipped,
                              ]}
                              onPress={() => handleOpenSlot(gearDef.type)}
                              activeOpacity={0.8}
                            >
                              <View style={styles.listIconBox}>
                                {gearDef.spritesheet ? (
                                  <ItemSprite
                                    spritesheet={gearDef.spritesheet}
                                    frameIndex={gearDef.frameIndex}
                                    displaySize={38}
                                  />
                                ) : (
                                  <ItemSprite spritesheet="icons-map" frameIndex={17} displaySize={38} />
                                )}
                              </View>

                              {/* Middle column: name (top) + stats (bottom) */}
                              <View style={styles.listNameCol}>
                                <Text style={styles.listName} numberOfLines={2}>
                                  {gearDef.name}
                                  {reinf > 0 ? (
                                    <Text style={styles.reinforcePlus}> +{reinf}</Text>
                                  ) : null}
                                </Text>
                                {!!gearStatText(gearDef, reinf) && (
                                  <Text style={styles.listStats} numberOfLines={1}>
                                    {gearStatText(gearDef, reinf)}
                                  </Text>
                                )}
                              </View>

                              {/* Right column: type on top, button on bottom */}
                              <View style={styles.listRightCol}>
                                <Text style={styles.listType}>{gearDef.type.toUpperCase()}</Text>
                                {isEquipped ? (
                                  <View style={[styles.equipBtn, styles.equipBtnEquipped]}>
                                    <Text style={[styles.equipBtnText, styles.equipBtnTextEquipped]}>EQUIPPED</Text>
                                  </View>
                                ) : (
                                  <TouchableOpacity
                                    style={styles.equipBtn}
                                    activeOpacity={0.85}
                                    onPress={() => handleEquipDirect(gearDef)}
                                  >
                                    <Text style={styles.equipBtnText}>EQUIP</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                    </>
                  )}
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
                const bagNumColumns = 4;
                const bagItemWidth = (availableWidth - (gap * (bagNumColumns - 1))) / bagNumColumns;
                return (
                  <View style={styles.gridContainer}>
                    {items.map((entry) => {
                      const def = CONSUMABLES.find(c => c.id === entry.id);
                      const iconSize = def?.spritesheet === 'icons-1' ? 46 : 40;
                      return (
                        <TouchableOpacity
                          key={entry.id}
                          style={[styles.gridCard, { width: bagItemWidth, height: bagItemWidth * 1.25 }]}
                          onPress={() => handleOpenDetails(entry, 'consumable')}
                          activeOpacity={0.8}
                        >
                          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                            <Rect width="100%" height="100%" fill="rgba(255,255,255,0.015)" rx={14} />
                            <Rect x="1" y="1" width="98%" height="98%" rx={13} fill="none"
                              stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                          </Svg>
                          <View style={styles.bagGridCardInner}>
                            <Text style={styles.bagGridName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{def?.name || entry.id}</Text>
                            <View style={styles.bagGridIconWrap}>
                              {def?.spritesheet ? (
                                <ItemSprite spritesheet={def.spritesheet} frameIndex={def.frameIndex} displaySize={iconSize} />
                              ) : (
                                <ItemSprite spritesheet="consumables-1" frameIndex={0} displaySize={iconSize} />
                              )}
                            </View>
                          </View>
                          <View style={styles.bagGridQtyBadge}>
                            <Text style={styles.bagGridQtyText}>×{entry.quantity}</Text>
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

        {/* Dedicated Scrollbar Space Column on the Right */}
        <View style={styles.scrollColumn}>
          <View style={styles.scrollColumnTrack}>
            {contentHeight > visibleHeight && (
              <Animated.View
                style={[
                  styles.scrollColumnThumb,
                  {
                    height: Math.max(35, (visibleHeight / contentHeight) * (visibleHeight - 24)),
                    transform: [
                      {
                        translateY: scrollY.interpolate({
                          inputRange: [0, Math.max(1, contentHeight - visibleHeight)],
                          outputRange: [0, (visibleHeight - 24) - Math.max(35, (visibleHeight / contentHeight) * (visibleHeight - 24))],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.scrollColumnThumbBevel} />
              </Animated.View>
            )}
          </View>
        </View>
      </View>

      {/* ── Equipment Slot Popup ── */}
      <ParchmentModal
        visible={!!selectedSlot}
        onClose={() => setSelectedSlot(null)}
        title={(modalData.slotConfig?.label || '').toUpperCase()}
        maxWidth={420}
      >
        <>
              {modalData.candidates.length > 0 ? (
                <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                  {modalData.candidates.map((item) => {
                    const isEquipped = item.isEquipped;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.compareRow, isEquipped && styles.compareRowEquipped]}
                        onPress={() => !isEquipped && handleEquipFromSlot(item.id)}
                        activeOpacity={isEquipped ? 1 : 0.8}
                        disabled={isEquipped}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={styles.compareItemIconBox}>
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
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.compareItemName} numberOfLines={1}>
                              {item.name}
                              {getReinforceLevel(hero, item.id) > 0 ? (
                                <Text style={styles.reinforcePlusModal}> +{getReinforceLevel(hero, item.id)}</Text>
                              ) : null}
                            </Text>
                            {!!item.description && (
                              <Text style={styles.compareItemDesc}>{item.description}</Text>
                            )}
                            {renderItemStats(item, isEquipped, modalData.currentGearDef)}
                          </View>
                        </View>
                        {isEquipped && (
                          <View style={styles.equippedBadge}>
                            <Text style={styles.equippedBadgeText}>EQUIPPED</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.emptyStateBody}>
                  <View style={styles.emptyStateIconBox}>
                    {modalData.slotKey === 'weapon' ? (
                      <SpriteFrame
                        source={WEAPONS_SHEET}
                        frameIndex={0}
                        frameSize={WEAPONS_FRAME_SIZE}
                        totalFrames={WEAPONS_FRAMES}
                        displaySize={44}
                        opacity={0.32}
                      />
                    ) : (
                      <SpriteFrame
                        source={EQUIPMENT_LEATHER_SHEET}
                        frameIndex={SLOT_EMPTY_FRAME[modalData.slotKey === 'trinket2' ? 'trinket' : modalData.slotKey] ?? 1}
                        frameSize={EQUIPMENT_LEATHER_FRAME_SIZE}
                        totalFrames={EQUIPMENT_LEATHER_FRAMES}
                        displaySize={44}
                        opacity={0.32}
                      />
                    )}
                  </View>
                  <Text style={styles.emptyStateText}>
                    No {modalData.slotConfig?.label} gear owned yet. Visit the Shop to find gear for this slot!
                  </Text>
                  <View style={styles.shopBtnWrapper}>
                    <View style={styles.shopBtnShadow} />
                    <TouchableOpacity
                      style={styles.shopBtnOuter}
                      onPress={handleGoToShop}
                      activeOpacity={0.8}
                    >
                      <View style={styles.shopBtnInner}>
                        <Text style={styles.shopBtnText}>Go to Shop →</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {!!modalData.currentGearId && (
                <View style={styles.unequipBtnWrapper}>
                  <View style={styles.unequipBtnShadow} />
                  <TouchableOpacity
                    style={styles.unequipBtnOuter}
                    onPress={handleUnequip}
                    activeOpacity={0.8}
                  >
                    <View style={styles.unequipBtnInner}>
                      <Text style={styles.unequipBtnText}>
                        Unequip {modalData.slotConfig?.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
        </>
      </ParchmentModal>

      {/* ── Details Popup Modal (Consumables/Materials) ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <View style={[styles.itemModalFrame, theme.SHADOWS.cardShadow]}>
            <View style={styles.itemModalParchment}>
              <View style={styles.itemModalBevel} pointerEvents="none" />

              {selectedItem && (
                (() => {
                  let title = '';
                  let spritesheet = null;
                  let frameIndex = 0;
                  let category = '';
                  let categoryColor = '#D4A754';
                  let lore = LORE_DESCRIPTIONS[selectedItem.id] || '';
                  let effectText = '';
                  let statusText = '';
                  let showOpenChestBtn = false;
                  let showUseStaminaPotionBtn = false;

                  if (itemType === 'consumable') {
                    const def = CONSUMABLES.find(c => c.id === selectedItem.id);
                    title = def?.name || selectedItem.id;
                    spritesheet = def?.spritesheet || null;
                    frameIndex = def?.frameIndex || 0;
                    category = 'Consumable';
                    categoryColor = '#1D7044'; // dark green on parchment
                    effectText = def?.description || '';
                    statusText = `Owned: ${selectedItem.quantity}`;
                    if (selectedItem.id === 'mystery_chest') {
                      showOpenChestBtn = true;
                    } else if (selectedItem.id === 'stamina_potion') {
                      showUseStaminaPotionBtn = true;
                    }
                  } else if (itemType === 'material') {
                    title = selectedItem.name;
                    spritesheet = MATERIALS[selectedItem.id]?.spritesheet || null;
                    frameIndex = MATERIALS[selectedItem.id]?.frameIndex || 0;
                    category = 'Crafting Material';
                    categoryColor = '#7A5C30'; // dark brown
                    statusText = `Owned: ${selectedItem.qty}`;
                  }

                  const getRarityDetails = (itemId) => {
                    let label = 'COMMON';
                    let color = '#5C6B73';
                    let bg = 'rgba(92, 107, 115, 0.12)';

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
                      color = '#8A2BE2';
                      bg = 'rgba(138, 43, 226, 0.1)';
                    } else if (rares.includes(itemId)) {
                      label = 'RARE';
                      color = '#008B8B';
                      bg = 'rgba(0, 139, 139, 0.1)';
                    } else if (uncommons.includes(itemId)) {
                      label = 'UNCOMMON';
                      color = '#2E8B57';
                      bg = 'rgba(46, 139, 87, 0.1)';
                    }
                    return { label, color, bg };
                  };

                  const rarity = getRarityDetails(selectedItem.id);

                  return (
                    <View style={{ width: '100%', alignItems: 'center' }}>
                      {/* Close button */}
                      <TouchableOpacity
                        style={styles.itemModalClose}
                        onPress={() => setModalVisible(false)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.itemModalCloseText}>✕</Text>
                      </TouchableOpacity>

                      {/* Title */}
                      <Text style={styles.itemModalTitle}>{title}</Text>

                      {/* Sub-row: Rarity & Category */}
                      <View style={styles.itemModalSubRow}>
                        {itemType !== 'consumable' && (
                          <View style={[styles.itemRarityBadge, { borderColor: rarity.color, backgroundColor: rarity.bg }]}>
                            <Text style={[styles.itemRarityText, { color: rarity.color }]}>{rarity.label}</Text>
                          </View>
                        )}
                        <Text style={[styles.itemCategoryText, { color: categoryColor }]}>{category.toUpperCase()}</Text>
                      </View>

                      {/* Icon Plaque */}
                      <View style={styles.itemIconSlotOuter}>
                        <View style={styles.itemIconSlotInner}>
                          {spritesheet ? (
                            <ItemSprite spritesheet={spritesheet} frameIndex={frameIndex} displaySize={40} />
                          ) : (
                            <ItemSprite spritesheet="icons-map" frameIndex={17} displaySize={40} />
                          )}
                        </View>
                      </View>

                      {/* Status text */}
                      <Text style={styles.itemModalStatus}>{statusText.toUpperCase()}</Text>

                      {/* Effect (mechanical description) */}
                      {!!effectText && (
                        <View style={styles.itemModalEffectBox}>
                          <Text style={styles.itemModalEffectText}>{effectText}</Text>
                        </View>
                      )}

                      {/* Lore description */}
                      {!!lore && (
                        <View style={styles.itemModalLoreBox}>
                          <Text style={styles.itemModalLoreText}>
                            "{lore}"
                          </Text>
                        </View>
                      )}

                      {/* Actions */}
                      <View style={{ width: '100%' }}>
                        {showOpenChestBtn && (
                          <View style={styles.itemModalBtnWrapper}>
                            <View style={[styles.itemModalBtnShadow, styles.primaryBtnShadow]} />
                            <TouchableOpacity
                              style={[styles.itemModalBtnOuter, styles.primaryBtnOuter]}
                              activeOpacity={0.85}
                              onPress={handleOpenChest}
                            >
                              <View style={styles.primaryBtnInner}>
                                <ItemSprite spritesheet="icons-map" frameIndex={53} displaySize={18} />
                                <Text style={styles.primaryBtnText}>OPEN MYSTERY CHEST</Text>
                              </View>
                            </TouchableOpacity>
                          </View>
                        )}

                        {showUseStaminaPotionBtn && (
                          <View style={styles.itemModalBtnWrapper}>
                            <View style={[styles.itemModalBtnShadow, styles.primaryBtnShadow]} />
                            <TouchableOpacity
                              style={[styles.itemModalBtnOuter, styles.primaryBtnOuter]}
                              activeOpacity={0.85}
                              onPress={handleUseStaminaPotion}
                            >
                              <View style={styles.primaryBtnInner}>
                                <ItemSprite spritesheet="consumables-1" frameIndex={5} displaySize={18} />
                                <Text style={styles.primaryBtnText}>USE STAMINA POTION</Text>
                              </View>
                            </TouchableOpacity>
                          </View>
                        )}

                        <View style={styles.itemModalBtnWrapper}>
                          <View style={[styles.itemModalBtnShadow, styles.secondaryBtnShadow]} />
                          <TouchableOpacity
                            style={[styles.itemModalBtnOuter, styles.secondaryBtnOuter]}
                            activeOpacity={0.85}
                            onPress={() => setModalVisible(false)}
                          >
                            <View style={styles.secondaryBtnInner}>
                              <Text style={styles.secondaryBtnText}>CLOSE</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })()
              )}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── Stat / Attribute Info Popup ── */}
      <ParchmentModal
        visible={infoStat !== null}
        onClose={() => setInfoStat(null)}
        title={infoStat && STAT_INFO[infoStat] ? STAT_INFO[infoStat].title : ''}
        maxWidth={360}
      >
        {infoStat && STAT_INFO[infoStat] && (
          <>
            <Text style={styles.infoModalDesc}>{STAT_INFO[infoStat].desc}</Text>
            <View style={styles.infoModalEffects}>
              {STAT_INFO[infoStat].effects.map((line) => (
                <View key={line} style={styles.infoEffectRow}>
                  <Text style={styles.infoEffectBullet}>›</Text>
                  <Text style={styles.infoEffectText}>{line}</Text>
                </View>
              ))}
            </View>
            <View style={styles.pmBtnCol}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setInfoStat(null)}
                style={styles.pmBtnSecondaryOuter}
              >
                <View style={styles.pmBtnSecondaryInner}>
                  <Text style={styles.pmBtnSecondaryText}>GOT IT</Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ParchmentModal>
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
          <Text style={{ fontFamily: 'Jersey10-Regular', fontSize: 18, color: '#5CC489' }}>
            ({pendingText})
          </Text>
        )}
      </View>
      <Text style={styles.statBonus} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {showBonus ? `${bonusText} from gear` : ' '}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#133131',
  },
  tabContainer: {
    marginTop: 6,
    marginBottom: 16,
  },
  tabContent: {
    marginTop: 4,
  },
  subTabBar: {
    marginTop: 6,
    marginBottom: 16,
  },
  pointsBadge: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    marginTop: 6,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#0A160F',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(74,57,23,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  pointsBadgeText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 16,
    color: '#8CAF9F',
    fontWeight: 'normal',
  },
  pointsBadgeNumber: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 18,
    color: '#3FB56E',
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
    fontSize: 20,
  },
  attrLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 16,
    fontWeight: 'normal',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    color: '#F3E2BD', // parchment
  },
  attrValue: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 32,
    fontWeight: 'normal',
    color: '#FFF3DA', // bright gold/yellow-white
    marginVertical: 0,
    letterSpacing: 1,
  },
  attrSubtext: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
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
  allocBtnWrapper: {
    width: 26,
    height: 26,
    position: 'relative',
  },
  allocBtnShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 2,
    height: 26,
    borderRadius: 6,
    zIndex: 1,
    backgroundColor: '#0D2118',
  },
  allocBtnShadowDisabled: {
    backgroundColor: 'transparent',
  },
  allocBtnOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 26,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#84735B',
    backgroundColor: '#0D2118',
    zIndex: 2,
  },
  allocBtnOuterDisabled: {
    borderColor: 'rgba(212, 167, 84, 0.15)',
    backgroundColor: 'rgba(16, 44, 28, 0.25)',
  },
  allocBtnInner: {
    flex: 1,
    margin: 1,
    borderRadius: 4,
    borderWidth: 1.5,
    borderTopColor: '#FFF3DA',
    borderLeftColor: '#FFF3DA',
    borderRightColor: '#FFF3DA',
    borderBottomColor: '#B5A07A',
    borderBottomWidth: 2.2,
    backgroundColor: '#F3E2BD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  allocBtnInnerDisabled: {
    borderWidth: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  allocBtnText: {
    fontFamily: 'Jersey10-Regular',
    color: '#2A1A0C',
    fontSize: 18,
    fontWeight: 'normal',
    marginTop: -2,
  },
  allocBtnTextDisabled: {
    color: 'rgba(255, 255, 255, 0.15)',
  },
  allocNumber: {
    fontFamily: 'Jersey10-Regular',
    color: '#FFF3DA',
    fontSize: 24,
    fontWeight: 'normal',
    minWidth: 16,
    textAlign: 'center',
  },
  saveRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 16,
  },
  cancelBtnWrapper: {
    flex: 1,
    height: 42,
    position: 'relative',
  },
  cancelBtnShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    height: 42,
    borderRadius: 8,
    zIndex: 1,
    backgroundColor: '#4F3C1E',
  },
  cancelBtnOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 42,
    borderRadius: 8,
    borderWidth: 2.2,
    borderColor: '#84735B',
    backgroundColor: '#4F3C1E',
    zIndex: 2,
  },
  cancelBtnInner: {
    flex: 1,
    margin: 1.5,
    borderRadius: 5,
    borderWidth: 2.2,
    borderTopColor: '#D8483F',
    borderLeftColor: '#D8483F',
    borderRightColor: '#D8483F',
    borderBottomColor: '#590D0E',
    borderBottomWidth: 3.5,
    backgroundColor: '#A61C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: '#FFF3DA',
    textTransform: 'uppercase',
  },
  saveBtnWrapper: {
    flex: 1,
    height: 42,
    position: 'relative',
  },
  saveBtnShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    height: 42,
    borderRadius: 8,
    zIndex: 1,
    backgroundColor: '#0D2118',
  },
  saveBtnOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 42,
    borderRadius: 8,
    borderWidth: 2.2,
    borderColor: '#84735B',
    backgroundColor: '#0D2118',
    zIndex: 2,
  },
  saveBtnInner: {
    flex: 1,
    margin: 1.5,
    borderRadius: 5,
    borderWidth: 2.2,
    borderTopColor: '#4F856C',
    borderLeftColor: '#4F856C',
    borderRightColor: '#4F856C',
    borderBottomColor: '#0D2118',
    borderBottomWidth: 3.5,
    backgroundColor: '#1B4030',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: '#FFF3DA',
    textTransform: 'uppercase',
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
    fontSize: 18,
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
    fontSize: 22,
    fontWeight: 'normal',
    color: '#F8FAFC',
  },
  stanceBonusVal: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 20,
    color: '#5CC489',
    textAlign: 'right',
  },
  statsSection: {
    marginBottom: 14,
  },
  subSectionTitle: {
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 18,
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
    fontSize: 18,
    fontWeight: 'normal',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  setBonusDesc: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 14,
    color: '#94A3B8',
  },
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroCard: {
    flexDirection: 'column',
    paddingVertical: 16,
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
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  heroName: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 28,
    lineHeight: 28,
    color: theme.COLORS.ghostWhite,
    flex: 1,
    marginRight: 8,
  },
  heroTagsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  bannerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E2BD',
    borderColor: '#4A3917',
    borderWidth: 1.5,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    gap: 4,
  },
  bannerTagText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 20,
    letterSpacing: 0.5,
    color: '#2A1A0C',
  },
  heroBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: '#D4A754',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    paddingBottom: 8,
  },
  gaugesContainer: {
    flex: 1,
    marginLeft: 14,
    gap: 8,
  },
  heroGaugesTagsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 24,
    color: theme.COLORS.parchment,
    marginBottom: 6,
    marginTop: 0,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  attributeList: {
    gap: 8,
    marginBottom: 16,
  },
  attributeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 44, 28, 0.45)',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 56,
  },
  attrRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 3.5,
  },
  attrIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#C9A86A',
    backgroundColor: '#0D2118',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attrRowValueContainer: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attrRowControlsContainer: {
    flex: 2.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attrInfoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D4A754',
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  attrInfoBtnText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 12,
    lineHeight: 12,
    color: '#D4A754',
    fontWeight: 'bold',
  },
  scrollColumn: {
    width: 24,
    backgroundColor: '#102B2B',
    borderWidth: 2,
    borderColor: 'rgba(212, 167, 84, 0.4)',
    borderRadius: 8,
    marginRight: 8,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollColumnTrack: {
    flex: 1,
    width: 12,
    marginVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(74, 57, 23, 0.3)',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
  },
  scrollColumnThumb: {
    width: 8,
    borderRadius: 4,
    backgroundColor: '#4A3917',
    padding: 1,
  },
  scrollColumnThumbBevel: {
    flex: 1,
    borderRadius: 3,
    backgroundColor: '#D4A754',
    borderWidth: 1,
    borderTopColor: '#FFE5A3',
    borderLeftColor: '#FFE5A3',
    borderRightColor: '#9B783E',
    borderBottomColor: '#8D6922',
  },
  statBox: {
    flex: 1,
    borderRadius: 10,
    minHeight: 60,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 4,
    alignItems: 'flex-start',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 44, 28, 0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(92, 196, 137, 0.3)',
  },
  statBoxAttribute: {
    backgroundColor: 'rgba(92,196,137,0.12)',
    borderColor: 'rgba(92,196,137,0.45)',
  },
  statLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 16,
    fontWeight: 'normal',
    color: '#CFE0EE',
    letterSpacing: 0.3,
    maxWidth: '100%',
  },
  statValue: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 26,
    fontWeight: 'normal',
    color: '#FBBF24',
    letterSpacing: 0.2,
  },
  statValueAttribute: {
    color: '#5CC489',
  },
  statBonus: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 20,
    lineHeight: 20,
    fontWeight: 'normal',
    letterSpacing: 0.5,
    color: '#5CC489',
  },
  // ── (i) info tag — mirrors the battle skill info button ──
  infoTag: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.COLORS.panelBorderGoldStrong,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  infoTagSmall: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.COLORS.panelBorderGoldStrong,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  infoTagText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
    lineHeight: 18,
    color: theme.COLORS.candleGold,
    fontStyle: 'italic',
    fontWeight: 'bold',
    textTransform: 'none',
  },
  // ── Stat / attribute info modal ──
  infoModalDesc: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 19,
    lineHeight: 23,
    color: '#4A2E14',
    textAlign: 'center',
    marginBottom: 14,
  },
  infoModalEffects: {
    gap: 6,
    marginBottom: 16,
    alignSelf: 'stretch',
  },
  infoEffectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  infoEffectBullet: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
    color: '#9A6B34',
    lineHeight: 22,
  },
  infoEffectText: {
    flex: 1,
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
    lineHeight: 22,
    color: '#5A3D1E',
  },
  // Shared ParchmentModal content styles
  pmBtnCol: {
    width: '100%',
    gap: 8,
  },
  pmBtnSecondaryOuter: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#84735B',
    padding: 2,
    backgroundColor: '#2C2013',
  },
  pmBtnSecondaryInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    backgroundColor: '#4F3C1E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pmBtnSecondaryText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: '#EAD9BA',
  },
  equipmentGrid: {
    marginBottom: 16,
    gap: 8,
  },
  slotRow: {
    flexDirection: 'row',
    gap: 8,
  },
  slotCardWrapper: {
    flex: 1,
    height: 92,
    position: 'relative',
    overflow: 'visible',
  },
  slotCardShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    height: 92,
    borderRadius: 12,
    zIndex: 1,
  },
  slotCardShadowEmpty: {
    backgroundColor: '#0D2118',
  },
  slotCardShadowEquipped: {
    backgroundColor: '#4F3C1E',
  },
  slotCardOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 92,
    borderRadius: 12,
    borderWidth: 2.2,
    borderColor: '#84735B',
    zIndex: 2,
  },
  slotCardOuterEmpty: {
    backgroundColor: '#0D2118',
  },
  slotCardOuterEquipped: {
    backgroundColor: '#4F3C1E',
  },
  slotCardInner: {
    flex: 1,
    margin: 1.5,
    borderRadius: 9,
    borderWidth: 2.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 8,
  },
  slotCardInnerEmpty: {
    backgroundColor: '#1B4030',
    borderTopColor: '#4F856C',
    borderLeftColor: '#4F856C',
    borderRightColor: '#4F856C',
    borderBottomColor: '#0D2118',
    borderBottomWidth: 3.5,
  },
  slotCardInnerEquipped: {
    backgroundColor: '#F3E2BD',
    borderTopColor: '#FFF3DA',
    borderLeftColor: '#FFF3DA',
    borderRightColor: '#FFF3DA',
    borderBottomColor: '#B5A07A',
    borderBottomWidth: 3.5,
  },
  slotCardInfo: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 4,
    height: '100%',
  },
  slotLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 14,
    fontWeight: 'normal',
    letterSpacing: 1,
    textAlign: 'left',
  },
  slotLabelEmpty: {
    color: '#8CAF9F', // Muted sage/moss green
  },
  slotLabelEquipped: {
    color: '#6B5A3E', // Muted dark gold-brown
  },
  slotItemName: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 22,
    lineHeight: 22,
    fontWeight: 'bold',
    color: '#2A1A0C', // Dark text on parchment
    textAlign: 'left',
  },
  slotItemStats: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 13,
    fontWeight: 'normal',
    textAlign: 'left',
  },
  slotItemStatsEmpty: {
    color: '#6EE7B7',
  },
  slotItemStatsEquipped: {
    color: '#1D7044', // Dark green on parchment for readability
  },
  slotEmptyText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 22,
    fontStyle: 'italic',
    color: '#FFF3DA',
    opacity: 0.40,
    textAlign: 'left',
  },
  slotIconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  slotIconBoxEmpty: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderColor: 'rgba(79, 133, 108, 0.35)',
  },
  slotIconBoxEquipped: {
    backgroundColor: 'rgba(79, 60, 30, 0.1)',
    borderColor: 'rgba(181, 160, 122, 0.65)',
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
    fontSize: 28,
    lineHeight: 28,
    color: '#FFF3DA',
    flex: 1,
    marginRight: 8,
  },
  modalCloseText: {
    fontFamily: 'Jersey10-Regular',
    color: 'rgba(255, 243, 218, 0.6)',
    fontSize: 28,
    lineHeight: 28,
  },
  modalList: {
    maxHeight: 400,
    alignSelf: 'stretch',
    width: '100%',
  },
  compareRow: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#F4E6C0',
    borderWidth: 1.5,
    borderColor: '#C9A86A',
    gap: 4,
    position: 'relative',
  },
  compareRowEquipped: {
    backgroundColor: '#EAD199',
    borderColor: '#E8A73A',
  },
  compareItemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: '#E3CF9C',
    borderColor: '#C9A86A',
  },
  compareRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compareItemName: {
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 21,
    color: '#4A2E14',
    flexShrink: 1,
    marginRight: 8,
  },
  compareItemStats: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 12,
    color: '#8E5A1D',
  },
  compareItemDesc: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
    color: '#7A5C30',
    marginTop: 2,
  },
  equippedBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(154,107,52,0.18)',
    borderColor: '#9A6B34',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  equippedBadgeText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    fontWeight: 'normal',
    color: '#8E5A1D',
    letterSpacing: 0.3,
  },
  deltaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  deltaText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 15,
    fontWeight: 'normal',
  },
  emptyStateBody: {
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingVertical: 16,
    gap: 12,
  },
  emptyStateIconBox: {
    width: 60,
    height: 60,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3CF9C',
    borderWidth: 1.5,
    borderColor: '#C9A86A',
    marginBottom: 4,
  },
  emptyStateEmoji: {
    fontFamily: 'System',
    fontSize: 40,
  },
  emptyStateText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 22,
    color: '#4A2E14',
    textAlign: 'center',
    lineHeight: 26,
  },
  shopBtnWrapper: {
    width: '100%',
    height: 42,
    position: 'relative',
    marginTop: 16,
    marginBottom: 8,
  },
  shopBtnShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    height: 42,
    borderRadius: 8,
    zIndex: 1,
    backgroundColor: '#0D2118',
  },
  shopBtnOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 42,
    borderRadius: 8,
    borderWidth: 2.2,
    borderColor: '#84735B',
    backgroundColor: '#0D2118',
    zIndex: 2,
  },
  shopBtnInner: {
    flex: 1,
    margin: 1.5,
    borderRadius: 5,
    borderWidth: 2.2,
    borderTopColor: '#4F856C',
    borderLeftColor: '#4F856C',
    borderRightColor: '#4F856C',
    borderBottomColor: '#0D2118',
    borderBottomWidth: 3.5,
    backgroundColor: '#1B4030',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopBtnText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 20,
    color: '#FFF3DA',
    textTransform: 'uppercase',
  },
  unequipBtnWrapper: {
    width: '100%',
    height: 42,
    position: 'relative',
    marginTop: 12,
  },
  unequipBtnShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    height: 42,
    borderRadius: 8,
    zIndex: 1,
    backgroundColor: '#4F3C1E',
  },
  unequipBtnOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 42,
    borderRadius: 8,
    borderWidth: 2.2,
    borderColor: '#84735B',
    backgroundColor: '#4F3C1E',
    zIndex: 2,
  },
  unequipBtnInner: {
    flex: 1,
    margin: 1.5,
    borderRadius: 5,
    borderWidth: 2.2,
    borderTopColor: '#D8483F',
    borderLeftColor: '#D8483F',
    borderRightColor: '#D8483F',
    borderBottomColor: '#590D0E',
    borderBottomWidth: 3.5,
    backgroundColor: '#A61C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unequipBtnText: {
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 18,
    color: '#FFF3DA',
    textTransform: 'uppercase',
  },

  /* ── Grid Layouts ── */
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    paddingVertical: 4,
    width: '100%',
  },
  gridCard: {
    width: '48%',
    height: 128,
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
    fontSize: 20,
    color: '#F3E2BD',
    textAlign: 'center',
    lineHeight: 20,
    height: 40,
    width: '100%',
  },
  reinforcePlus: { color: '#9BE6A6' },
  reinforcePlusModal: { color: '#2E7D32' },

  /* ── Owned-tab list ──────────────────────────────────────── */
  ownedList: {
    width: '100%',
    gap: 8,
    paddingVertical: 4,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 167, 84, 0.25)',
    backgroundColor: 'rgba(16, 44, 28, 0.45)',
  },
  listRowEquipped: {
    borderColor: 'rgba(212,167,84,0.6)',
    backgroundColor: 'rgba(41, 66, 27, 0.55)',
  },
  listIconBox: {
    width: 46,
    height: 46,
    alignSelf: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listNameCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  listName: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 21,
    color: '#F3E2BD',
  },
  listStats: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
    color: '#B29B66',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  listRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 46,
  },
  listType: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    color: 'rgba(243,226,189,0.5)',
    letterSpacing: 0.5,
  },
  equipBtn: {
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#4F856C',
    borderBottomWidth: 2.5,
    borderBottomColor: '#0D2118',
    backgroundColor: '#1B4030',
  },
  equipBtnEquipped: {
    borderColor: 'rgba(212,167,84,0.5)',
    borderBottomColor: 'rgba(212,167,84,0.3)',
    backgroundColor: 'rgba(212,167,84,0.12)',
  },
  equipBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 13,
    color: '#B7F0C4',
    letterSpacing: 0.5,
  },
  equipBtnTextEquipped: {
    color: '#D4A754',
  },

  /* ── Owned-tab type filter bar ───────────────────────────── */
  ownedFilterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },
  ownedFilterChip: {
    width: 37,
    height: 37,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownedFilterChipActive: {
    borderColor: 'rgba(212,167,84,0.7)',
    backgroundColor: 'rgba(212,167,84,0.15)',
  },
  ownedFilterAllText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 15,
    color: 'rgba(243,226,189,0.5)',
    letterSpacing: 0.5,
  },
  ownedFilterAllTextActive: { color: '#F3E2BD' },
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
    fontSize: 15,
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
    fontSize: 16,
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
    fontSize: 24,
    color: '#FFF3DA',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 16,
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
    fontSize: 20,
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
    fontSize: 20,
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
    fontSize: 12,
    fontWeight: 'normal',
    letterSpacing: 0.8,
  },
  bagGridCardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
    paddingHorizontal: 6,
    paddingBottom: 20,
  },
  bagGridName: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 19,
    color: '#F3E2BD',
    textAlign: 'center',
    lineHeight: 19,
    height: 38,
    width: '100%',
  },
  bagGridIconWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bagGridQtyBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.3)',
    backgroundColor: 'rgba(212, 167, 84, 0.12)',
  },
  bagGridQtyText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 15,
    letterSpacing: 0.3,
    color: '#D4A754',
    fontWeight: 'bold',
  },
  bagGridTagText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 13,
    letterSpacing: 0.2,
    color: '#F3E2BD',
  },
  itemModalFrame: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#6E4524',
    borderColor: '#3A2210',
    borderWidth: 3,
    borderRadius: 12,
    padding: 10,
    position: 'relative',
  },
  itemModalParchment: {
    backgroundColor: '#ECD8A6',
    borderRadius: 12,
    borderColor: '#C9A86A',
    borderWidth: 2,
    paddingTop: 24,
    paddingBottom: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    position: 'relative',
  },
  itemModalBevel: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 250, 228, 0.45)',
    zIndex: 1,
  },
  itemModalClose: {
    position: 'absolute',
    top: 10,
    right: 12,
    zIndex: 10,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemModalCloseText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 26,
    color: '#6E4524',
    fontWeight: 'bold',
  },
  itemModalTitle: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 28,
    color: '#4A2E14',
    textAlign: 'center',
    marginBottom: 4,
    width: '85%',
  },
  itemModalSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  itemRarityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  itemRarityText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemCategoryText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemIconSlotOuter: {
    width: 76,
    height: 76,
    borderRadius: 8,
    backgroundColor: '#1E1E20',
    borderWidth: 2.5,
    borderColor: '#4A3917',
    padding: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  itemIconSlotInner: {
    flex: 1,
    width: '100%',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#D4A754',
    backgroundColor: '#1E1E22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemModalStatus: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#7A5C30',
    marginBottom: 14,
  },
  itemModalEffectBox: {
    backgroundColor: 'rgba(29, 112, 68, 0.10)',
    borderColor: 'rgba(29, 112, 68, 0.35)',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    width: '100%',
  },
  itemModalEffectText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 20,
    lineHeight: 22,
    color: '#1D7044',
    textAlign: 'center',
  },
  itemModalLoreBox: {
    backgroundColor: 'rgba(74, 46, 20, 0.06)',
    borderColor: 'rgba(110, 69, 36, 0.25)',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    width: '100%',
  },
  itemModalLoreText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 20,
    lineHeight: 22,
    color: '#4A2E14',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  itemModalBtnWrapper: {
    width: '100%',
    height: 40,
    position: 'relative',
    marginBottom: 8,
  },
  itemModalBtnShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 2.5,
    height: 40,
    borderRadius: 8,
    zIndex: 1,
  },
  itemModalBtnOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 40,
    borderRadius: 8,
    borderWidth: 2.2,
    zIndex: 2,
  },
  itemModalBtnInner: {
    flex: 1,
    margin: 1.5,
    borderRadius: 5,
    borderWidth: 2.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryBtnShadow: {
    backgroundColor: '#4A3917',
  },
  primaryBtnOuter: {
    borderColor: '#4A3917',
    backgroundColor: '#4A3917',
  },
  primaryBtnInner: {
    flex: 1,
    margin: 1.5,
    borderRadius: 5,
    borderWidth: 2.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E8A73A',
    borderTopColor: '#F5CF7A',
    borderLeftColor: '#F5CF7A',
    borderRightColor: '#F5CF7A',
    borderBottomColor: '#845D18',
    borderBottomWidth: 3.2,
  },
  primaryBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    color: '#1A1200',
    fontWeight: 'normal',
  },
  secondaryBtnShadow: {
    backgroundColor: '#25160A',
  },
  secondaryBtnOuter: {
    borderColor: '#3A2210',
    backgroundColor: '#25160A',
  },
  secondaryBtnInner: {
    flex: 1,
    margin: 1.5,
    borderRadius: 5,
    borderWidth: 2.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#8B5A2B',
    borderTopColor: '#CD853F',
    borderLeftColor: '#CD853F',
    borderRightColor: '#CD853F',
    borderBottomColor: '#5C3E21',
    borderBottomWidth: 3.2,
  },
  secondaryBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    color: '#F3E2BD',
    fontWeight: 'normal',
  },
});
