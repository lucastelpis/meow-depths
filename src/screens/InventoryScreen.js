/**
 * InventoryScreen.js — Tabbed Inventory (Consumables · Crafting · Equipment)
 *
 * Three tabs keep item categories cleanly separated.
 * Combat stats live in the Equipment tab as a gear-comparison reference.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Circle, Path } from 'react-native-svg';

import { useGame } from '../state/gameState';
import { GEAR, CONSUMABLES, MATERIALS } from '../data/gear';
import { getActiveSetBonuses } from '../logic/progressionEngine';
import ItemSprite from '../components/ItemSprite';

// ─── Tabs ────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'consumables', icon: '🧪', label: 'Consumables' },
  { key: 'gear',        icon: '⚒️', label: 'Equipment'  },
  { key: 'crafting',    icon: '💎', label: 'Miscellaneous' },
];

const GEAR_TYPE_ICON = {
  weapon:  '⚔️',
  chest:   '🛡️',
  trinket: '💎',
};

// ─── Consumable icons ─────────────────────────────────────────────────────────
const CONSUMABLE_ICONS = {
  potion:        '🧪',
  super_potion:  '🧪',
  mega_potion:   '🧪',
  ultra_potion:  '🧪',
  antidote:      '🌿',
  smoke_vial:    '💨',
  mystery_chest: '🎁',
};

// ─── Material zone groupings ──────────────────────────────────────────────────
const MATERIAL_ZONES = [
  {
    label: 'Soggy Sewers',
    zoneColor: '#3FB56E',
    emoji: '🖤',
    ids: ['black_shard', 'black_crystal_small', 'black_crystal_big', 'black_crystal_core'],
  },
  {
    label: 'Twisted Garden',
    zoneColor: '#A855F7',
    emoji: '💚',
    ids: ['green_shard', 'green_crystal_small', 'green_crystal_big', 'green_crystal_core'],
  },
  {
    label: 'Sunken Docks',
    zoneColor: '#06B6D4',
    emoji: '💛',
    ids: ['yellow_shard', 'yellow_crystal_small', 'yellow_crystal_big', 'yellow_crystal_core'],
  },
];

const GEAR_ICONS = {
  toy_sword: '🗡️',
  cardboard_armor: '📦',
  leather_bag: '🎒',
  simple_backpack: '🎒',
  fine_backpack: '🎒',
  luxury_backpack: '🎒',
  sewer_shiv: '🔪',
  rat_hide_vest: '🧥',
  slimecrawler_shell: '🐚',
  plague_cloak: '🧣',
  gnarlcrown: '👑',
  cockroach_carapace: '🛡️',
  thorn_dagger: '🗡️',
  beetle_shell_vest: '🥋',
  spore_cloak: '🧥',
  vine_wrap: '🩹',
  rootmother_eye: '👁️',
  glowspore_vial: '🧪',
  ghost_cutlass: '⚔️',
  barnacle_plate: '🛡️',
  ghost_silk_coat: '🧥',
  saltcaptain_coat: '🧥',
  morays_compass: '🧭',
  toxin_vial: '🧪',
};

const MATERIAL_ICONS = {
  black_shard: '🖤',
  black_crystal_small: '🔮',
  black_crystal_big: '💎',
  black_crystal_core: '🌌',
  green_shard: '💚',
  green_crystal_small: '🧪',
  green_crystal_big: '❇️',
  green_crystal_core: '🌀',
  yellow_shard: '💛',
  yellow_crystal_small: '🟡',
  yellow_crystal_big: '🔶',
  yellow_crystal_core: '☀️',
};

const LORE_DESCRIPTIONS = {
  // Consumables
  potion: "A standard brew made from healing herbs. Tastes slightly of peppermint.",
  super_potion: "A stronger concentrate of healing herbs, glowing with a soft blue light.",
  mega_potion: "A potent elixir infused with ancient life essence. Tastes like sweet honey.",
  ultra_potion: "The pinnacle of alchemy. A single drop can stitch deep wounds instantly.",
  antidote: "Made from crushed wild herbs. Neutralizes toxic substances in the veins.",
  smoke_vial: "A fragile glass flask filled with compressed, blinding fog. Great for escape.",
  mystery_chest: "A locked treasure chest salvaged from the deep. Who knows what crystals lie within?",

  // Materials
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

  // Gear
  toy_sword: "A wooden training sword. Mostly harmless, but good for building confidence.",
  cardboard_armor: "A taped-together box. Smells like old wet paper, but offers basic protection.",
  leather_bag: "A small pouch for carrying basic items. Increases bag capacity by +3 slots.",
  simple_backpack: "A simple, reliable backpack. Increases bag capacity by +5 slots.",
  fine_backpack: "A well-crafted, sturdy backpack with extra pockets. Increases bag capacity by +7 slots.",
  luxury_backpack: "An exquisite, high-capacity backpack made of fine leather. Increases bag capacity by +10 slots.",
  sewer_shiv: "A jagged piece of metal wrapped in dirty rags. Crude, but dangerous.",
  rat_hide_vest: "Tough leather made from sewer rats. Surprisingly flexible and waterproof.",
  slimecrawler_shell: "A hardened shell coated in slick mucus. Repels toxic liquids.",
  plague_cloak: "A tattered cowl that has survived the worst of the sewers.",
  gnarlcrown: "A crown woven from thorny roots. Increases precision in combat.",
  cockroach_carapace: "A shield-like plate made of thick insect shell. Highly durable.",
  thorn_dagger: "A weapon crafted from giant garden thorns. Coated in natural toxins.",
  beetle_shell_vest: "A heavy vest reinforced with iridescent beetle plates.",
  spore_cloak: "A lightweight cloak that releases silent spores when moving.",
  vine_wrap: "Woven vines that tighten around the wearer, boosting vitality.",
  rootmother_eye: "A glowing amber bead that increases magic and skill potency.",
  glowspore_vial: "A glass pendant containing bioluminescent spores.",
  ghost_cutlass: "A spectral saber that cuts through the air with an eerie whistle.",
  barnacle_plate: "Heavy plate armor covered in stubborn barnacles. Extremely tough.",
  ghost_silk_coat: "A coat woven from ethereal threads, allowing the wearer to slip past attacks.",
  saltcaptain_coat: "The weathered coat of a lost sea captain, resistant to wind and wave.",
  morays_compass: "An old brass compass whose needle points towards weaknesses.",
  toxin_vial: "A vial filled with concentrated sea viper venom.",
};

// ─── Grid Calculations ────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const minItemWidth = 100;
const gap = 10;
const padding = 16;
const availableWidth = SCREEN_WIDTH - (padding * 2);
const numColumns = Math.max(1, Math.floor((availableWidth + gap) / (minItemWidth + gap)));
const itemWidth = (availableWidth - (gap * (numColumns - 1))) / numColumns;

// ─── Component ────────────────────────────────────────────────────────────────
export default function InventoryScreen() {
  const { state, dispatch } = useGame();
  const { hero } = state;

  const [activeTab, setActiveTab] = useState('consumables');
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemType, setItemType] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleOpenDetails = (item, type) => {
    setSelectedItem(item);
    setItemType(type);
    setModalVisible(true);
  };

  // Derived data (Owned Gear tab)
  const activeSets = useMemo(() => getActiveSetBonuses(hero.gear), [hero.gear]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const pct = (v) => `${Math.round((v || 0) * 100)}%`;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleEquip = (gearItem) => {
    let slot = gearItem.type;
    dispatch({ type: 'EQUIP_GEAR', payload: { slot, gearId: gearItem.id } });
  };

  const handleUnequip = (slot) =>
    dispatch({ type: 'EQUIP_GEAR', payload: { slot, gearId: null } });

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
      const fam  = families[Math.floor(Math.random() * families.length)];
      const tier = rollTier();
      const key  = tier === 'shard' ? `${fam}_shard`
                 : tier === 'core'  ? `${fam}_crystal_core`
                 : `${fam}_${tier}`;
      rolledMaterials[key] = (rolledMaterials[key] || 0) + 1;
    }
    const lines = [`💰 ${rolledGold} gold`];
    Object.entries(rolledMaterials).forEach(([id, qty]) => {
      let e = '💎';
      if (id.startsWith('black'))  e = '🖤';
      if (id.startsWith('green'))  e = '💚';
      if (id.startsWith('yellow')) e = '💛';
      lines.push(`${e} ${MATERIALS[id]?.name || id} ×${qty}`);
    });
    Alert.alert('🎁 Chest Opened!', `You obtained:\n\n${lines.join('\n')}`, [{
      text: 'Awesome!',
      onPress: () => dispatch({ type: 'OPEN_LOOTBOX', payload: { gold: rolledGold, materials: rolledMaterials } }),
    }]);
  };

  // ── Tab content renderers ────────────────────────────────────────────────────

  const renderConsumables = () => {
    const items = hero.inventory.consumables.filter(c => c.quantity > 0);
    if (items.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🧪</Text>
          <Text style={styles.emptyTitle}>Bag Empty</Text>
          <Text style={styles.emptyDesc}>Visit the Shop to stock up on potions and supplies.</Text>
        </View>
      );
    }
    return (
      <View style={styles.gridContainer}>
        {items.map((entry) => {
          const def     = CONSUMABLES.find(c => c.id === entry.id);
          const icon    = CONSUMABLE_ICONS[entry.id] || '🧪';
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
                <Text style={styles.gridName} numberOfLines={2}>{def?.name || entry.id}</Text>
                <View style={styles.gridIconWrap}>
                  <Text style={styles.gridIcon}>{icon}</Text>
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
  };

  const renderCrafting = () => {
    const materials = hero.inventory.materials;
    const allMaterials = [];
    MATERIAL_ZONES.forEach((zone) => {
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
          <Text style={styles.emptyEmoji}>💎</Text>
          <Text style={styles.emptyTitle}>No Materials</Text>
          <Text style={styles.emptyDesc}>Explore dungeons and defeat enemies to collect crystals and shards.</Text>
        </View>
      );
    }

    return (
      <View style={styles.gridContainer}>
        {allMaterials.map((mat) => {
          const icon = MATERIAL_ICONS[mat.id] || mat.zone.emoji;
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
                  stroke={mat.zone.zoneColor + '15'} strokeWidth={1} />
              </Svg>
              <View style={styles.gridCardInner}>
                <Text style={styles.gridName} numberOfLines={2}>{mat.name}</Text>
                <View style={styles.gridIconWrap}>
                  <Text style={styles.gridIcon}>{icon}</Text>
                </View>
                <View style={styles.gridTagSlot}>
                  <View style={[styles.gridTagBadge, styles.gridQtyBadge, { borderColor: mat.zone.zoneColor + '30', backgroundColor: mat.zone.zoneColor + '08' }]}>
                    <Text style={[styles.gridTagText, styles.gridQtyText, { color: mat.zone.zoneColor }]}>×{mat.qty}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderGear = () => (
    <>
      {/* ── Active Set Bonuses ── */}
      {activeSets.length > 0 && (
        <View style={styles.statsSection}>
          <Text style={styles.subSectionTitle}>✨ Active Set Bonuses</Text>
          {activeSets.map((set) => (
            <View key={set.name} style={styles.setBonusCard}>
              <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                <Defs>
                  <LinearGradient id={`setGrad_${set.name}`} x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#1E1911" />
                    <Stop offset="100%" stopColor="#0B0B0E" />
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

      {hero.inventory.craftedGear.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>⚒️</Text>
          <Text style={styles.emptyTitle}>No Gear Crafted</Text>
          <Text style={styles.emptyDesc}>Visit the Shop to forge equipment from your materials.</Text>
        </View>
      ) : (
        <View style={styles.gridContainer}>
          {[...hero.inventory.craftedGear]
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
              const icon = GEAR_ICONS[gearId] || GEAR_TYPE_ICON[gearDef.type] || '🎒';
              return (
                <TouchableOpacity
                  key={gearId}
                  style={[
                    styles.gridCard,
                    { width: itemWidth, height: itemWidth },
                    isEquipped && styles.gridCardGearEquipped,
                  ]}
                  onPress={() => handleOpenDetails(gearDef, 'gear')}
                  activeOpacity={0.8}
                >
                  <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                    <Rect width="100%" height="100%" fill="rgba(255,255,255,0.015)" rx={14} />
                    <Rect x="1" y="1" width="98%" height="98%" rx={13} fill="none"
                      stroke={isEquipped ? 'rgba(212,167,84,0.4)' : 'rgba(255,255,255,0.04)'} strokeWidth={isEquipped ? 1.5 : 1} />
                  </Svg>
                  <View style={styles.gridCardInner}>
                    <Text style={styles.gridName} numberOfLines={2}>{gearDef.name}</Text>
                    <View style={styles.gridIconWrap}>
                      {gearDef.spritesheet ? (
                        <ItemSprite
                          spritesheet={gearDef.spritesheet}
                          frameIndex={gearDef.frameIndex}
                          displaySize={44}
                        />
                      ) : (
                        <Text style={styles.gridIcon}>{icon}</Text>
                      )}
                    </View>
                    <View style={styles.gridTagSlot}>
                      {isEquipped && (
                        <View style={[styles.gridTagBadge, styles.equippedBadge]}>
                          <Text style={[styles.gridTagText, styles.equippedBadgeText]}>EQUIPPED</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
        </View>
      )}
    </>
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Tab bar */}
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          {TABS.map(({ key, icon, label }) => {
            const isActive = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabIcon, !isActive && styles.tabIconDim]}>{icon}</Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tab content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        key={activeTab}
      >
        {activeTab === 'consumables' && renderConsumables()}
        {activeTab === 'crafting'    && renderCrafting()}
        {activeTab === 'gear'        && renderGear()}
      </ScrollView>

      {/* ── Details Popup Modal ──────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {selectedItem && (
              (() => {
                let title = '';
                let icon = '';
                let category = '';
                let categoryColor = '#D4A754';
                let lore = LORE_DESCRIPTIONS[selectedItem.id] || '';
                let statusText = '';
                let statsList = [];
                let showEquipBtn = false;
                let isCurrentlyEquipped = false;
                let showOpenChestBtn = false;

                if (itemType === 'consumable') {
                  const def = CONSUMABLES.find(c => c.id === selectedItem.id);
                  title = def?.name || selectedItem.id;
                  icon = CONSUMABLE_ICONS[selectedItem.id] || '🧪';
                  category = 'Consumable';
                  categoryColor = '#3FB56E';
                  statusText = `Owned: ${selectedItem.quantity}`;
                  if (selectedItem.id === 'mystery_chest') {
                    showOpenChestBtn = true;
                  }
                } else if (itemType === 'material') {
                  title = selectedItem.name;
                  icon = MATERIAL_ICONS[selectedItem.id] || selectedItem.zone.emoji;
                  category = 'Crafting Material';
                  categoryColor = selectedItem.zone.zoneColor;
                  statusText = `Owned: ${selectedItem.qty}`;
                } else if (itemType === 'gear') {
                  title = selectedItem.name;
                  icon = GEAR_ICONS[selectedItem.id] || GEAR_TYPE_ICON[selectedItem.type] || '🎒';
                  category = selectedItem.type;
                  categoryColor = selectedItem.zone === 1 ? '#3FB56E' : selectedItem.zone === 2 ? '#A855F7' : selectedItem.zone === 3 ? '#06B6D4' : '#707F94';
                  isCurrentlyEquipped = Object.values(hero.gear).includes(selectedItem.id);
                  showEquipBtn = true;

                  if (selectedItem.stats) {
                    if (selectedItem.stats.attack)     statsList.push({ label: 'ATK', value: `+${selectedItem.stats.attack}`, emoji: '⚔️' });
                    if (selectedItem.stats.defence)    statsList.push({ label: 'DEF', value: `+${selectedItem.stats.defence}`, emoji: '🛡️' });
                    if (selectedItem.stats.maxHp)      statsList.push({ label: 'HP', value: `+${selectedItem.stats.maxHp}`, emoji: '❤️', color: '#EF4444' });
                    if (selectedItem.stats.critChance) statsList.push({ label: 'CRIT', value: pct(selectedItem.stats.critChance), emoji: '💥', color: '#FBBF24' });
                    if (selectedItem.stats.dodge)      statsList.push({ label: 'DODGE', value: pct(selectedItem.stats.dodge), emoji: '💨', color: '#06B6D4' });
                    if (selectedItem.stats.bleedChance) statsList.push({ label: 'BLEED', value: pct(selectedItem.stats.bleedChance), emoji: '🩸', color: '#EF4444' });
                    if (selectedItem.stats.poisonChance) statsList.push({ label: 'POISON', value: pct(selectedItem.stats.poisonChance), emoji: '🤢', color: '#10B981' });
                    if (selectedItem.stats.stunChance) statsList.push({ label: 'STUN', value: pct(selectedItem.stats.stunChance), emoji: '⚡', color: '#FBBF24' });
                    if (selectedItem.stats.poisonImmune) statsList.push({ label: 'IMMUNITY', value: 'Poison', emoji: '🟢', color: '#10B981' });
                    if (selectedItem.stats.skillDamage) statsList.push({ label: 'SKILL DMG', value: `+${pct(selectedItem.stats.skillDamage)}`, emoji: '✨', color: '#A855F7' });
                    if (selectedItem.stats.bleedExtraDamage) statsList.push({ label: 'BLEED DMG', value: `+${selectedItem.stats.bleedExtraDamage}`, emoji: '🩸', color: '#EF4444' });
                    if (selectedItem.stats.bagSlots)   statsList.push({ label: 'Bag Slots', value: `+${selectedItem.stats.bagSlots}`, emoji: '🎒', color: '#D4A754' });
                  }
                }

                const getRarityDetails = (itemId) => {
                  let label = 'COMMON';
                  let color = '#94A3B8';
                  let bg = 'rgba(148, 163, 184, 0.12)';

                  const rares = [
                    'thorn_dagger', 'beetle_shell_vest', 'spore_cloak', 'vine_wrap', 'rootmother_eye', 'glowspore_vial',
                    'mega_potion', 'mystery_chest',
                    'green_shard', 'green_crystal_small', 'green_crystal_big', 'green_crystal_core'
                  ];
                  const epics = [
                    'ghost_cutlass', 'barnacle_plate', 'ghost_silk_coat', 'saltcaptain_coat', 'morays_compass', 'toxin_vial',
                    'ultra_potion',
                    'yellow_shard', 'yellow_crystal_small', 'yellow_crystal_big', 'yellow_crystal_core'
                  ];
                  const uncommons = [
                    'sewer_shiv', 'rat_hide_vest', 'slimecrawler_shell', 'plague_cloak', 'gnarlcrown', 'cockroach_carapace',
                    'super_potion', 'smoke_vial',
                    'black_shard', 'black_crystal_small', 'black_crystal_big', 'black_crystal_core'
                  ];

                  if (epics.includes(itemId)) {
                    label = 'EPIC';
                    color = '#C084FC';
                    bg = 'rgba(168, 85, 247, 0.14)';
                  } else if (rares.includes(itemId)) {
                    label = 'RARE';
                    color = '#22D3EE';
                    bg = 'rgba(6, 182, 212, 0.14)';
                  } else if (uncommons.includes(itemId)) {
                    label = 'UNCOMMON';
                    color = '#4ADE80';
                    bg = 'rgba(74, 222, 128, 0.14)';
                  }
                  return { label, color, bg };
                };

                const rarity = getRarityDetails(selectedItem.id);

                return (
                  <>
                    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                      <Defs>
                        <RadialGradient id="modalGlow" cx="50%" cy="0%" rx="80%" ry="60%">
                          <Stop offset="0%" stopColor={rarity.color} stopOpacity="0.18" />
                          <Stop offset="100%" stopColor="#0D0D12" stopOpacity="0" />
                        </RadialGradient>
                      </Defs>
                      <Rect width="100%" height="100%" fill="#0D0D12" rx={22} />
                      <Rect width="100%" height="100%" fill="url(#modalGlow)" rx={22} />

                      {/* Sparkles */}
                      <Text x="12%" y="15%" fill="#D4A754" fontSize="12" opacity="0.3">✦</Text>
                      <Text x="88%" y="22%" fill={rarity.color} fontSize="14" opacity="0.25">✦</Text>
                      <Text x="16%" y="78%" fill={rarity.color} fontSize="10" opacity="0.2">✦</Text>
                      <Text x="84%" y="82%" fill="#D4A754" fontSize="12" opacity="0.3">✦</Text>
                    </Svg>

                    <View style={styles.modalInnerFrame}>
                      {/* Corner Brackets */}
                      <View style={[styles.cornerBracket, { top: -1, left: -1 }]}>
                        <Svg width="16" height="16" viewBox="0 0 16 16">
                          <Path d="M16 2 H2 V16" fill="none" stroke="#D4A754" strokeWidth={1.5} />
                        </Svg>
                      </View>
                      <View style={[styles.cornerBracket, { bottom: -1, left: -1 }]}>
                        <Svg width="16" height="16" viewBox="0 0 16 16">
                          <Path d="M16 14 H2 V0" fill="none" stroke="#D4A754" strokeWidth={1.5} />
                        </Svg>
                      </View>
                      <View style={[styles.cornerBracket, { bottom: -1, right: -1 }]}>
                        <Svg width="16" height="16" viewBox="0 0 16 16">
                          <Path d="M0 14 H14 V0" fill="none" stroke="#D4A754" strokeWidth={1.5} />
                        </Svg>
                      </View>

                      {/* Close button acting as top-right ornament */}
                      <TouchableOpacity
                        style={styles.modalCloseCorner}
                        onPress={() => setModalVisible(false)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.modalCloseCircle}>
                          <Text style={styles.modalCloseCornerText}>✕</Text>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.modalContent}>
                        <View style={[styles.rarityBadge, { backgroundColor: rarity.bg, borderColor: rarity.color + '40' }]}>
                          <Text style={[styles.rarityText, { color: rarity.color }]}>
                            ✦ {rarity.label} {category.toUpperCase()} ✦
                          </Text>
                        </View>

                        <View style={styles.modalIconContainer}>
                          <View style={[styles.modalIconFrame, { borderColor: rarity.color + '30', backgroundColor: rarity.color + '05' }]}>
                            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                              <Defs>
                                <RadialGradient id={`pedestalGlow_${selectedItem.id}`} cx="50%" cy="50%" rx="50%" ry="50%">
                                  <Stop offset="0%" stopColor={rarity.color} stopOpacity="0.4" />
                                  <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
                                </RadialGradient>
                              </Defs>
                              <Circle cx="45" cy="45" r="40" fill={`url(#pedestalGlow_${selectedItem.id})`} />
                              <Circle cx="45" cy="45" r="37" fill="none" stroke={rarity.color + '25'} strokeWidth={1} strokeDasharray="3 3" />
                              <Circle cx="45" cy="45" r="31" fill="none" stroke="#D4A754" strokeWidth={1} opacity={0.6} />
                            </Svg>
                            {selectedItem.spritesheet ? (
                              <ItemSprite
                                spritesheet={selectedItem.spritesheet}
                                frameIndex={selectedItem.frameIndex}
                                displaySize={48}
                              />
                            ) : (
                              <Text style={styles.modalIconText}>{icon}</Text>
                            )}
                          </View>
                        </View>

                        <Text style={styles.modalTitleText}>{title}</Text>

                        {statusText ? (
                          <Text style={styles.modalStatusText}>{statusText}</Text>
                        ) : null}

                        {statsList.length > 0 && (
                          <View style={styles.modalStatsGrid}>
                            {statsList.map((stat, idx) => (
                              <View key={idx} style={styles.modalStatCard}>
                                <View style={[styles.statHighlightBar, { backgroundColor: stat.color || rarity.color }]} />
                                <Text style={styles.modalStatLabel}>
                                  {stat.emoji} {stat.label}
                                </Text>
                                <Text style={[styles.modalStatValue, { color: stat.color || '#D4A754' }]}>
                                  {stat.value}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        <View style={styles.ornateDividerContainer}>
                          <View style={styles.dividerLine} />
                          <Text style={styles.dividerDiamond}>◆</Text>
                          <View style={styles.dividerLine} />
                        </View>

                        {lore ? (
                          <View style={styles.modalLoreBox}>
                            <Text style={styles.modalLoreHeader}>ITEM HISTORY</Text>
                            <Text style={styles.modalLoreText}>"{lore}"</Text>
                          </View>
                        ) : null}

                        {itemType === 'material' && (
                          <Text style={styles.modalGuideText}>
                            ⚒️ Visit the Shop forge to craft this into powerful equipment.
                          </Text>
                        )}
                        {itemType === 'consumable' && !showOpenChestBtn && (
                          <Text style={styles.modalGuideText}>
                            🧪 Slot this consumable before entering a floor to use during combat.
                          </Text>
                        )}

                        <View style={styles.modalBtns}>
                          {showOpenChestBtn ? (
                            <TouchableOpacity
                              style={[styles.modalConfirmBtn, { shadowColor: '#D4A754' }]}
                              onPress={() => {
                                setModalVisible(false);
                                handleOpenChest();
                              }}
                              activeOpacity={0.85}
                            >
                              <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                                <Defs>
                                  <LinearGradient id="modalChestGrad" x1="0" y1="0" x2="1" y2="0">
                                    <Stop offset="0%" stopColor="#F9D99A" />
                                    <Stop offset="100%" stopColor="#D4A754" />
                                  </LinearGradient>
                                </Defs>
                                <Rect width="100%" height="100%" fill="url(#modalChestGrad)" rx={12} />
                              </Svg>
                              <Text style={styles.modalConfirmText}>Open Mystery Chest</Text>
                            </TouchableOpacity>
                          ) : showEquipBtn ? (
                            <TouchableOpacity
                              style={
                                isCurrentlyEquipped
                                  ? styles.modalUnequipBtn
                                  : [styles.modalConfirmBtn, { shadowColor: '#D4A754' }]
                              }
                              onPress={() => {
                                setModalVisible(false);
                                if (isCurrentlyEquipped) {
                                  const equippedSlot = Object.entries(hero.gear)
                                    .find(([, gearId]) => gearId === selectedItem.id)?.[0];
                                  if (equippedSlot) handleUnequip(equippedSlot);
                                } else {
                                  handleEquip(selectedItem);
                                }
                              }}
                              activeOpacity={0.85}
                            >
                              {!isCurrentlyEquipped && (
                                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                                  <Defs>
                                    <LinearGradient id="modalEquipGrad" x1="0" y1="0" x2="1" y2="0">
                                      <Stop offset="0%" stopColor="#F9D99A" />
                                      <Stop offset="100%" stopColor="#D4A754" />
                                    </LinearGradient>
                                  </Defs>
                                  <Rect width="100%" height="100%" fill="url(#modalEquipGrad)" rx={12} />
                                </Svg>
                              )}
                              <Text
                                style={
                                  isCurrentlyEquipped
                                    ? styles.modalUnequipText
                                    : styles.modalConfirmText
                                }
                              >
                                {isCurrentlyEquipped ? 'Unequip Gear' : 'Equip Gear'}
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={styles.modalCloseBtn}
                              onPress={() => setModalVisible(false)}
                            >
                              <Text style={styles.modalCloseText}>Done</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  </>
                );
              })()
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1A1200',
  },

  /* ── Tab bar ─────────────────────────────────────────────── */
  tabBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.015)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 8,
    gap: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(212,167,84,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(212,167,84,0.35)',
  },
  tabIcon: {
    fontSize: 16,
  },
  tabIconDim: {
    opacity: 0.45,
  },
  tabLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    fontWeight: 'normal',
    color: '#707F94',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#F8FAFC',
    fontWeight: '800',
  },

  /* ── Scroll ──────────────────────────────────────────────── */
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
    gap: 10,
  },

  /* ── Generic card ────────────────────────────────────────── */
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 64,
  },
  cardEquipped: {},
  cardGearEquipped: {
    backgroundColor: '#161210',
    borderWidth: 1,
    borderColor: 'rgba(212,167,84,0.3)',
  },
  cardGearUnequipped: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    zIndex: 2,
  },
  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    flexShrink: 0,
  },
  cardIcon: { fontSize: 22 },
  cardInfo: { flex: 1, justifyContent: 'center' },
  cardName: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: 'normal',
  },
  cardDesc: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#707F94',
    marginTop: 2,
  },

  /* ── Consumables ─────────────────────────────────────────── */
  qtyBadge: {
    backgroundColor: 'rgba(212,167,84,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(212,167,84,0.2)',
  },
  qtyText: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 14,
    color: '#D4A754',
    fontWeight: 'normal',
  },
  openChestBtn: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  openChestText: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 12,
    fontWeight: 'normal',
    color: '#1A1200',
    zIndex: 2,
  },

  /* ── Crafting materials ──────────────────────────────────── */
  materialGroup: {
    marginBottom: 4,
  },
  materialGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  materialGroupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  materialGroupLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    fontWeight: 'normal',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  materialGroupCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  materialRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  materialEmoji: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  materialName: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 13,
    color: '#CFE0EE',
    flex: 1,
    fontWeight: 'normal',
  },
  materialQtyBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  materialQty: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 12,
    fontWeight: 'normal',
  },

  /* ── Owned Gear tab ──────────────────────────────────────── */
  statsSection: {
    marginBottom: 6,
  },
  subSectionTitle: {
    fontFamily: 'PixelifySans-Medium',
    fontWeight: 'normal',
    fontSize: 13,
    color: '#D4A754',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  setBonusCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  setBonusInner: {
    padding: 14,
    zIndex: 2,
  },
  setBonusName: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 14,
    color: '#D4A754',
    fontWeight: 'normal',
  },
  setBonusDesc: {
    fontFamily: 'PixelifySans-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 5,
    lineHeight: 16,
  },
  gearNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  gearTypeIcon: {
    fontSize: 16,
  },
  gearZoneTag: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    fontWeight: 'normal',
    color: '#D4A754',
    backgroundColor: 'rgba(212,167,84,0.08)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(212,167,84,0.15)',
  },
  gearStats: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 12,
    color: '#D4A754',
    marginTop: 3,
    fontWeight: 'normal',
  },
  equipBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  equipBtnText: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: 'normal',
  },
  unequipBtnGear: {
    backgroundColor: 'rgba(16,185,129,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  unequipBtnGearStatus: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#10B981',
    fontWeight: 'normal',
  },
  unequipBtnGearAction: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    color: '#D8483F',
    fontWeight: 'normal',
    opacity: 0.85,
  },

  /* ── Empty states ────────────────────────────────────────── */
  emptyBox: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 10,
    opacity: 0.4,
  },
  emptyTitle: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 15,
    fontWeight: 'normal',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 6,
  },
  emptyDesc: {
    fontFamily: 'PixelifySans-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 17,
  },

  /* ── Grid Layouts ────────────────────────────────────────── */
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 4,
  },
  gridCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  gridCardGearEquipped: {
    backgroundColor: 'rgba(212,167,84,0.06)',
    borderColor: 'rgba(212,167,84,0.45)',
    borderWidth: 1.5,
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
    fontSize: 28,
  },
  gridName: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#F8FAFC',
    fontWeight: 'normal',
    textAlign: 'center',
    lineHeight: 14,
    height: 28, // height for 2 lines
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
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    fontWeight: 'normal',
    letterSpacing: 0.3,
  },
  gridQtyBadge: {
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  gridQtyText: {
    color: 'rgba(255,255,255,0.6)',
  },
  equippedBadge: {
    borderColor: 'rgba(212,167,84,0.4)',
    backgroundColor: 'rgba(212,167,84,0.12)',
  },
  equippedBadgeText: {
    color: '#D4A754',
  },

  /* ── Modal Popup Styles ─────────────────────────────────── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.90)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0D0D12',
    borderWidth: 1.5,
    padding: 8,
  },
  modalInnerFrame: {
    borderWidth: 1.2,
    borderColor: 'rgba(212, 167, 84, 0.25)',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 12,
    position: 'relative',
  },
  cornerBracket: {
    position: 'absolute',
    width: 16,
    height: 16,
    zIndex: 20,
  },
  modalContent: {
    alignItems: 'center',
    width: '100%',
  },
  modalCloseCorner: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 100,
  },
  modalCloseCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 15, 22, 0.9)',
    borderWidth: 1.2,
    borderColor: '#D4A75460',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseCornerText: {
    fontSize: 11,
    color: '#D4A754',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  rarityBadge: {
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    marginBottom: 16,
  },
  rarityText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    fontWeight: 'normal',
    letterSpacing: 0.8,
  },
  modalIconContainer: {
    marginVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconFrame: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  modalIconText: {
    fontSize: 44,
    zIndex: 15,
  },
  modalTitleText: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 22,
    fontWeight: 'normal',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  modalStatusText: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: 'normal',
    marginBottom: 16,
  },
  modalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
    marginBottom: 14,
  },
  modalStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 6,
    minWidth: '45%',
    flex: 1,
    height: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  statHighlightBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  modalStatLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    fontWeight: 'normal',
    color: 'rgba(255, 255, 255, 0.45)',
  },
  modalStatValue: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    fontWeight: 'normal',
  },
  ornateDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    height: 1,
    flex: 1,
    backgroundColor: 'rgba(212, 167, 84, 0.15)',
  },
  dividerDiamond: {
    fontSize: 8,
    color: '#D4A754',
    opacity: 0.5,
  },
  modalLoreBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    marginBottom: 16,
  },
  modalLoreBoxHeader: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    fontWeight: 'normal',
    color: '#D4A754',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 6,
    opacity: 0.7,
  },
  modalLoreHeader: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    fontWeight: 'normal',
    color: '#D4A754',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 6,
    opacity: 0.7,
  },
  modalLoreText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#E2E8F0',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 16,
  },
  modalGuideText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.3)',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 14,
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  modalBtns: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 6,
  },
  modalCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  modalCloseText: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: 'normal',
  },
  modalConfirmBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
  },
  modalConfirmText: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 13,
    color: '#120C00',
    fontWeight: 'normal',
    zIndex: 2,
    letterSpacing: 0.3,
  },
  modalUnequipBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  modalUnequipText: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 13,
    color: '#EF4444',
    fontWeight: 'normal',
    letterSpacing: 0.3,
  },
});
