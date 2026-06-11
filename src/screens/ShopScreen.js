/**
 * =============================================================================
 * ShopScreen.js — Meow Depths Town Shop (Supplies & Armory - Redesigned Premium UI)
 * =============================================================================
 *
 * This screen consolidates the items shop (supplies bought with Gold) and
 * the equipment forge (armory forged with dungeon crystals).
 *
 * Designed with a premium "Twilight Obsidian & Gilded Amber" theme.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect } from 'react-native-svg';

import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { GEAR, CONSUMABLES, MATERIALS } from '../data/gear';
import { ZONES } from '../data/zones';
import ItemSprite from '../components/ItemSprite';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Metadata & Icons ────────────────────────────────────────────────────────
const GEAR_TYPE_ICONS = { weapon: '⚔️', armor: '🛡️', trinket: '💎' };

// ─── Tab Configuration ───────────────────────────────────────────────────────
const TABS = [
  { key: 'supplies', frameIndex: 26, label: 'Consumables' },
  { key: 'armory',   frameIndex: 10, label: 'Equipment'  },
  { key: 'forge',    frameIndex: 9,  label: 'Forge'      },
];

// ─── Material Metadata ───────────────────────────────────────────────────────
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

// ─── Forge Fusion Recipes ───────────────────────────────────────────────────
const FORGE_RECIPES = [
  // Zone 1: Soggy Sewers (Black Crystals)
  {
    inputId: 'black_shard',
    outputId: 'black_crystal_small',
    inputName: 'Black Shard',
    outputName: 'Small Black Crystal',
    inputIcon: '🖤',
    outputIcon: '🔮',
    zoneIndex: 0,
  },
  {
    inputId: 'black_crystal_small',
    outputId: 'black_crystal_big',
    inputName: 'Small Black Crystal',
    outputName: 'Big Black Crystal',
    inputIcon: '🔮',
    outputIcon: '💎',
    zoneIndex: 0,
  },
  // Zone 2: Twisted Garden (Green Crystals)
  {
    inputId: 'green_shard',
    outputId: 'green_crystal_small',
    inputName: 'Green Shard',
    outputName: 'Small Green Crystal',
    inputIcon: '💚',
    outputIcon: '🧪',
    zoneIndex: 1,
  },
  {
    inputId: 'green_crystal_small',
    outputId: 'green_crystal_big',
    inputName: 'Small Green Crystal',
    outputName: 'Big Green Crystal',
    inputIcon: '🧪',
    outputIcon: '❇️',
    zoneIndex: 1,
  },
  // Zone 3: Sunken Docks (Yellow Crystals)
  {
    inputId: 'yellow_shard',
    outputId: 'yellow_crystal_small',
    inputName: 'Yellow Shard',
    outputName: 'Small Yellow Crystal',
    inputIcon: '💛',
    outputIcon: '🟡',
    zoneIndex: 2,
  },
  {
    inputId: 'yellow_crystal_small',
    outputId: 'yellow_crystal_big',
    inputName: 'Small Yellow Crystal',
    outputName: 'Big Yellow Crystal',
    inputIcon: '🟡',
    outputIcon: '🔶',
    zoneIndex: 2,
  },
];

const ZONE_LABELS = {
  1: '🐀 Zone 1 — Soggy Sewers (Black Crystals)',
  2: '🌿 Zone 2 — Twisted Garden (Green Crystals)',
  3: '⚓ Zone 3 — Sunken Docks (Yellow Crystals)',
};

const CONSUMABLE_ICONS = {
  potion: '🧪',
  super_potion: '🧪',
  mega_potion: '🧪',
  ultra_potion: '🧪',
  antidote: '🌿',
  smoke_vial: '💨',
  mystery_chest: '🎁',
};



// ─── Stat formatting helper ──────────────────────────────────────────────────
function formatStats(stats) {
  if (!stats) return '';

  const STAT_LABELS = {
    attack:          'ATK',
    defence:         'DEF',
    maxHp:           'HP',
    critChance:      'crit',
    dodge:           'dodge',
    bleedChance:     'bleed',
    poisonChance:    'poison',
    stunChance:      'stun',
    skillDamage:     'skill dmg',
    bleedExtraDamage: 'bleed dmg',
    bagSlots:        'bag slots',
  };

  return Object.entries(stats)
    .filter(([, v]) => v !== null && v !== undefined && v !== false)
    .map(([key, value]) => {
      const label = STAT_LABELS[key] || key;
      if (typeof value === 'boolean') return `✓ ${label}`;
      if (value > 0 && value < 1) return `${Math.round(value * 100)}% ${label}`;
      return `+${value} ${label}`;
    })
    .join(', ');
}

export default function ShopScreen() {
  const navigation = useNavigation();
  const { state, dispatch } = useGame();
  const { hero } = state;

  const [activeTab, setActiveTab] = useState('supplies'); // 'supplies' | 'armory'
  const [quantities, setQuantities] = useState({});       // { [itemId]: number }

  const getQty = (itemId) => quantities[itemId] || 1;

  const incrementQty = (item) => {
    const next = getQty(item.id) + 1;
    const maxAffordable = Math.floor(hero.gold / item.cost);
    if (next > maxAffordable) return;
    setQuantities(prev => ({ ...prev, [item.id]: next }));
  };

  const decrementQty = (itemId) => {
    setQuantities(prev => ({ ...prev, [itemId]: Math.max((prev[itemId] || 1) - 1, 1) }));
  };

  const ownedMaterials = hero.inventory.materials || {};
  const craftedGear    = hero.inventory.craftedGear || [];

  // ── Build shop items list based on progression ─────────────────────────────
  const armoryItems = useMemo(() => {
    const isLvl6Unlocked = (state.progress.floorsCleared?.zone1 || 0) >= 5;
    const isZone2Unlocked = state.progress.zone1Cleared === true;

    const items = [
      { id: 'wooden_sword', price: 100 },
      { id: 'leather_helmet', price: 100 },
      { id: 'leather_chestpiece', price: 100 },
      { id: 'leather_leggings', price: 100 },
      { id: 'leather_gloves', price: 100 },
      { id: 'leather_boots', price: 100 },
      { id: 'leather_belt', price: 100 },
      { id: 'simple_backpack', price: 300 },
    ];

    if (isLvl6Unlocked) {
      items.push(
        { id: 'stone_sword', price: 200 },
        { id: 'superior_leather_helmet', price: 200 },
        { id: 'superior_leather_chestpiece', price: 200 },
        { id: 'superior_leather_leggings', price: 200 },
        { id: 'superior_leather_gloves', price: 200 },
        { id: 'superior_leather_boots', price: 200 },
        { id: 'superior_leather_belt', price: 200 },
        { id: 'fine_backpack', price: 1000 }
      );
    }

    if (isZone2Unlocked) {
      items.push(
        { id: 'luxury_backpack', price: 5000 }
      );
    }

    return items.map(shopItem => {
      const baseGear = GEAR[shopItem.id];
      if (!baseGear) return null;
      return {
        ...baseGear,
        goldCost: shopItem.price,
      };
    }).filter(Boolean);
  }, [state.progress.floorsCleared?.zone1, state.progress.zone1Cleared]);



  // ── Consumables inventory counts ────────────────────────────────────────────
  const consumableCounts = useMemo(() => {
    const counts = {};
    (hero.inventory?.consumables || []).forEach(c => {
      counts[c.id] = c.quantity;
    });
    return counts;
  }, [hero.inventory?.consumables]);



  // ── Supplies: purchase handler ─────────────────────────────────────────────
  const handleBuySupplies = (item) => {
    const qty = getQty(item.id);
    const totalCost = item.cost * qty;
    if (hero.gold < totalCost) return;
    dispatch({
      type: 'BUY_CONSUMABLE_BULK',
      payload: { consumableId: item.id, price: item.cost, quantity: qty },
    });
    setQuantities(prev => ({ ...prev, [item.id]: 1 }));
  };

  // ── Armory: buy handler ────────────────────────────────────────────
  const handleBuyGear = (item) => {
    Alert.alert(
      'Purchase Equipment',
      `Buy "${item.name}" for 💰 ${item.goldCost} gold?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: () => {
            dispatch({
              type: 'BUY_GEAR',
              payload: {
                gearId: item.id,
                price: item.goldCost,
              },
            });
          },
        },
      ]
    );
  };

  const isMaterialZoneOpened = (zoneIndex) => {
    if (zoneIndex === 0) return true;
    if (zoneIndex === 1) return !!state.progress.zone1Cleared;
    if (zoneIndex === 2) return !!state.progress.zone2Cleared;
    return false;
  };

  const renderForge = () => {
    const materials = hero.inventory.materials || {};
    const activeRecipes = FORGE_RECIPES.filter(recipe => isMaterialZoneOpened(recipe.zoneIndex));

    return (
      <View style={styles.tabContent}>
        <View style={styles.suppliesIntro}>
          <Text style={styles.introTitle}>⚒️ Crystal Fusion (Forge)</Text>
          <Text style={styles.introDesc}>Fuse lower-tier crystals to create higher-tier ones. Cores cannot be forged.</Text>
        </View>

        <View style={styles.forgeContainer}>
          {/* 1. Crystal Vault Summary */}
          <View style={styles.vaultSection}>
            <Text style={styles.subSectionTitle}>💎 Material Vault</Text>
            {MATERIAL_ZONES.map((zone, zIdx) => {
              if (!isMaterialZoneOpened(zIdx)) return null;

              return (
                <View key={zone.label} style={styles.vaultZoneCard}>
                  <View style={styles.vaultZoneHeader}>
                    <View style={[styles.vaultZoneDot, { backgroundColor: zone.zoneColor }]} />
                    <Text style={[styles.vaultZoneLabel, { color: zone.zoneColor }]}>{zone.label}</Text>
                  </View>
                  <View style={styles.vaultItemsRow}>
                    {zone.ids.map(id => {
                      const qty = materials[id] || 0;
                      const icon = MATERIAL_ICONS[id] || zone.emoji;
                      // Shorten name to just Shard / Small / Big / Core
                      let shortName = 'Item';
                      if (id.includes('shard')) shortName = 'Shard';
                      else if (id.includes('small')) shortName = 'Small';
                      else if (id.includes('big')) shortName = 'Big';
                      else if (id.includes('core')) shortName = 'Core';

                      return (
                        <View key={id} style={styles.vaultItemBox}>
                          <Text style={styles.vaultItemEmoji}>{icon}</Text>
                          <Text style={styles.vaultItemName}>{shortName}</Text>
                          <View style={[styles.vaultItemQtyBadge, qty > 0 ? { borderColor: zone.zoneColor + '40', backgroundColor: zone.zoneColor + '08' } : styles.vaultItemQtyBadgeEmpty]}>
                            <Text style={[styles.vaultItemQtyText, qty > 0 ? { color: zone.zoneColor } : styles.vaultItemQtyTextEmpty]}>×{qty}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>

          {/* 2. Fusion Recipes */}
          <View style={styles.recipesSection}>
            <Text style={styles.subSectionTitle}>⚒️ Fusion Forge</Text>
            {activeRecipes.map((recipe, idx) => {
              const inputQty = materials[recipe.inputId] || 0;
              const outputQty = materials[recipe.outputId] || 0;
              const canForge = inputQty >= 10;
              const zone = MATERIAL_ZONES[recipe.zoneIndex];

              const handleForge = () => {
                dispatch({
                  type: 'FORGE_CRYSTAL',
                  payload: { inputId: recipe.inputId, outputId: recipe.outputId },
                });
              };

              return (
                <View key={idx} style={[styles.recipeCard, { borderColor: zone.zoneColor + '20' }]}>
                  {/* Visual Flow: Input -> Output */}
                  <View style={styles.recipeFlow}>
                    {/* Input Material */}
                    <View style={styles.recipeMaterialCol}>
                      <Text style={styles.recipeEmoji}>{recipe.inputIcon}</Text>
                      <Text style={styles.recipeMaterialName} numberOfLines={1}>{recipe.inputName}</Text>
                      <Text style={[styles.recipeQtyLabel, inputQty >= 10 ? { color: '#3FB56E' } : { color: '#707F94' }]}>
                        {inputQty} / 10
                      </Text>
                    </View>

                    {/* Arrow Indicator */}
                    <View style={styles.recipeArrowCol}>
                      <Text style={styles.recipeArrow}>➔</Text>
                      <Text style={styles.recipeArrowText}>Fuses 10</Text>
                    </View>

                    {/* Output Material */}
                    <View style={styles.recipeMaterialCol}>
                      <Text style={styles.recipeEmoji}>{recipe.outputIcon}</Text>
                      <Text style={styles.recipeMaterialName} numberOfLines={1}>{recipe.outputName}</Text>
                      <Text style={[styles.recipeQtyLabel, { color: zone.zoneColor }]}>Owned: {outputQty}</Text>
                    </View>
                  </View>

                  {/* Forge Button */}
                  <TouchableOpacity
                    style={[styles.forgeBtn, canForge ? styles.forgeBtnActive : styles.forgeBtnDisabled]}
                    onPress={handleForge}
                    disabled={!canForge}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.forgeBtnText, canForge ? styles.forgeBtnTextActive : styles.forgeBtnTextDisabled]}>
                      {canForge ? 'FORGE CRYSTAL' : 'NEED 10 SHARDS/CRYSTALS'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Background with subtle top radial gradient glow */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="topGlow" cx="50%" cy="0%" rx="80%" ry="45%">
            <Stop offset="0%" stopColor="#10B981" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#133131" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="#133131" />
        <Rect width="100%" height="100%" fill="url(#topGlow)" />
      </Svg>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← Hub</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <ItemSprite spritesheet="icons-1" frameIndex={1} displaySize={24} />
          <Text style={styles.titleText}>Market</Text>
        </View>
        <View style={[styles.goldBadge, theme.SHADOWS.glowPrimary]}>
          <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={16} />
          <Text style={styles.goldBadgeText}>{hero.gold}g</Text>
        </View>
      </View>

      {/* ── Segmented Tab Switcher ────────────────────────────────────────── */}
      <View style={styles.tabContainer}>
        {TABS.map(({ key, frameIndex, label }) => {
          const isActive = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tabButton, isActive ? styles.tabBtnActive : styles.tabBtnInactive]}
              activeOpacity={0.8}
              onPress={() => setActiveTab(key)}
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═════════════════════════════════════════════════════════════════════
            TAB 1: SUPPLIES (Gold Purchase)
            ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'supplies' && (
          <View style={styles.tabContent}>
            <View style={styles.suppliesIntro}>
              <Text style={styles.introTitle}>Consumables & Provisions</Text>
              <Text style={styles.introDesc}>Purchase healing reagents and items to aid your dungeon runs.</Text>
            </View>

            <View style={styles.listContainer}>
              {CONSUMABLES.filter(item => !item.minLevel || hero.level >= item.minLevel).map((item) => {
                const owned = consumableCounts[item.id] || 0;
                const icon = CONSUMABLE_ICONS[item.id] || '🧪';

                const qty = getQty(item.id);
                const totalCost = item.cost * qty;
                const canAffordTotal = hero.gold >= totalCost;
                const canIncrement = hero.gold >= item.cost * (qty + 1);

                return (
                  <View key={item.id} style={styles.shopRow}>
                    <View style={StyleSheet.absoluteFill}>
                      <Svg width="100%" height="100%">
                        <Rect width="100%" height="100%" fill="rgba(255,255,255,0.02)" rx={14} />
                        <Rect x="1" y="1" width="98%" height="98%" rx={13} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                      </Svg>
                    </View>

                    <View style={styles.shopRowInner}>
                      {/* Left: icon + info */}
                      <View style={styles.shopRowLeft}>
                        <View style={styles.shopIconWrapper}>
                          <Text style={styles.shopRowIcon}>{icon}</Text>
                        </View>
                        <View style={styles.shopRowInfo}>
                          <View style={styles.shopNameRow}>
                            <Text style={styles.shopRowName}>{item.name}</Text>
                            {owned > 0 && (
                              <View style={styles.shopOwnedPill}>
                                <Text style={styles.shopOwnedPillText}>Owned: {owned}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.shopRowDesc}>{item.description}</Text>
                        </View>
                      </View>

                      {/* Right: stepper + buy */}
                      <View style={styles.buyArea}>
                        <View style={styles.stepper}>
                          <TouchableOpacity
                            style={[styles.stepBtn, qty <= 1 && styles.stepBtnDisabled]}
                            onPress={() => decrementQty(item.id)}
                            disabled={qty <= 1}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={[styles.stepBtnText, qty <= 1 && styles.stepBtnTextDisabled]}>−</Text>
                          </TouchableOpacity>

                          <Text style={styles.stepQty}>{qty}</Text>

                          <TouchableOpacity
                            style={[styles.stepBtn, !canIncrement && styles.stepBtnDisabled]}
                            onPress={() => incrementQty(item)}
                            disabled={!canIncrement}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={[styles.stepBtnText, !canIncrement && styles.stepBtnTextDisabled]}>+</Text>
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          style={[styles.buyBtn, !canAffordTotal && styles.buyBtnDisabled]}
                          activeOpacity={0.7}
                          disabled={!canAffordTotal}
                          onPress={() => handleBuySupplies(item)}
                        >
                          {canAffordTotal && (
                            <View style={StyleSheet.absoluteFill}>
                              <Svg width="100%" height="100%">
                                <Defs>
                                  <LinearGradient id={`buyBtnGrad_${item.id}`} x1="0" y1="0" x2="1" y2="0">
                                    <Stop offset="0%" stopColor="#3FB56E" />
                                    <Stop offset="100%" stopColor="#2A8A50" />
                                  </LinearGradient>
                                </Defs>
                                <Rect width="100%" height="100%" fill={`url(#buyBtnGrad_${item.id})`} rx={10} />
                              </Svg>
                            </View>
                          )}
                          <View style={styles.buyBtnContent}>
                            <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={16} />
                            <Text style={[styles.buyBtnText, !canAffordTotal && styles.buyBtnTextDisabled, canAffordTotal && styles.buyBtnTextActive]}>
                              {totalCost}g
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            TAB 2: ARMORY (Crystal Crafting)
            ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'armory' && (
          <View style={styles.tabContent}>
            <View style={styles.suppliesIntro}>
              <Text style={styles.introTitle}>⚔️ Equipment</Text>
              <Text style={styles.introDesc}>Purchase equipment and weapons with Gold. Owned gear cannot be bought again.</Text>
            </View>

            <View style={styles.listContainer}>
              {armoryItems.map((item) => {
                const isOwned = craftedGear.includes(item.id);
                const canAfford = hero.gold >= item.goldCost;

                return (
                  <View key={item.id} style={[styles.gearCard, isOwned && { opacity: 0.8 }]}>
                    <View style={StyleSheet.absoluteFill}>
                      <Svg width="100%" height="100%">
                        <Rect width="100%" height="100%" fill="rgba(255,255,255,0.02)" rx={14} />
                        <Rect
                          x="1"
                          y="1"
                          width="98%"
                          height="98%"
                          rx={13}
                          fill="none"
                          stroke={isOwned ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)'}
                          strokeWidth={1}
                        />
                      </Svg>
                    </View>

                    <View style={styles.gearCardInner}>
                      {/* Left: Icon, Name, Type, Stats */}
                      <View style={styles.shopRowLeft}>
                        <View style={styles.gearIconWrapper}>
                          <ItemSprite
                            spritesheet={item.spritesheet}
                            frameIndex={item.frameIndex}
                            displaySize={36}
                          />
                        </View>
                        <View style={styles.shopRowInfo}>
                          <View style={styles.shopNameRow}>
                            <Text style={styles.gearName} numberOfLines={1}>{item.name}</Text>
                            <View style={styles.gearTypeBadge}>
                              <Text style={styles.gearTypeBadgeText}>{item.type.toUpperCase()}</Text>
                            </View>
                          </View>
                          <Text style={styles.statPreview}>🛡️ {formatStats(item.stats)}</Text>
                          {!!item.description && item.type !== 'storage' && (
                            <Text style={styles.shopRowDesc}>{item.description}</Text>
                          )}
                        </View>
                      </View>

                      {/* Right: Buy Button / Owned State */}
                      <View style={styles.buyArea}>
                        {!isOwned ? (
                          <TouchableOpacity
                            style={[
                              styles.armoryBuyBtn,
                              !canAfford && styles.armoryBuyBtnDisabled
                            ]}
                            disabled={!canAfford}
                            onPress={() => handleBuyGear(item)}
                          >
                            {canAfford && (
                              <View style={StyleSheet.absoluteFill}>
                                <Svg width="100%" height="100%">
                                  <Defs>
                                    <LinearGradient id={`armoryBuyGrad_${item.id}`} x1="0" y1="0" x2="1" y2="0">
                                      <Stop offset="0%" stopColor="#F9D99A" />
                                      <Stop offset="100%" stopColor="#D4A754" />
                                    </LinearGradient>
                                  </Defs>
                                  <Rect width="100%" height="100%" fill={`url(#armoryBuyGrad_${item.id})`} rx={10} />
                                </Svg>
                              </View>
                            )}
                            <View style={styles.buyBtnContent}>
                              <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={16} />
                              <Text
                                style={[
                                  styles.armoryBuyBtnText,
                                  !canAfford && styles.armoryBuyBtnTextDisabled
                                ]}
                              >
                                {item.goldCost}g
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.armoryBuyBtnOwned}>
                            <Text style={styles.armoryBuyBtnOwnedText}>
                              Owned
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
        {activeTab === 'forge' && renderForge()}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// Styles — Twilight Obsidian & Gilded Amber Theme
// ============================================================================
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#133131',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 60,
  },

  /* ── Header ──────────────────────────────────────────────── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  backBtn: {
    width: 70,
    paddingVertical: 6,
  },
  backText: {
    color: '#D4A754',
    fontFamily: 'PixelifySans-Medium',
    fontWeight: 'normal',
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
    fontFamily: 'PixelifySans-Medium',
    fontWeight: 'normal',
    fontSize: 20,
    color: '#F8FAFC',
    letterSpacing: 0.8,
  },
  goldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 72,
    justifyContent: 'center',
  },
  goldBadgeText: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 12,
    fontWeight: 'normal',
    color: '#FFD700',
  },

  /* ── Materials Bar ───────────────────────────────────────── */
  materialsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  materialsLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    fontWeight: 'normal',
    color: '#707F94',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  materialsScroll: {
    flexDirection: 'row',
  },
  emptyMaterials: {
    fontFamily: 'PixelifySans-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.25)',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  materialChip: {
    borderRadius: 10,
    marginRight: 8,
    overflow: 'hidden',
  },
  materialChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 2,
  },
  materialEmoji: {
    fontSize: 13,
    marginRight: 6,
  },
  materialName: {
    fontFamily: 'PixelifySans-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginRight: 8,
  },
  materialQty: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 12,
    color: '#D4A754',
    fontWeight: 'normal',
  },

  /* ── Tab Switcher ────────────────────────────────────────── */
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
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
    backgroundColor: '#3C2D1E',
    borderColor: '#4A3917',
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
    marginTop: 12,
  },

  /* ── Supplies Tab Styles ─────────────────────────────────── */
  suppliesIntro: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  introTitle: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 16,
    fontWeight: 'normal',
    color: '#F8FAFC',
  },
  introDesc: {
    fontFamily: 'PixelifySans-Regular',
    fontSize: 12,
    color: '#707F94',
    marginTop: 3,
  },
  listContainer: {
    gap: 10,
  },
  shopRow: {
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 80,
  },
  shopRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    zIndex: 2,
  },
  shopRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  shopIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  shopRowIcon: {
    fontSize: 24,
  },
  shopRowInfo: {
    flex: 1,
  },
  shopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shopRowName: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: 'normal',
  },
  shopOwnedPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  shopOwnedPillText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    letterSpacing: 0,
    fontWeight: 'normal',
    color: '#10B981',
  },
  shopRowDesc: {
    fontFamily: 'PixelifySans-Regular',
    fontSize: 12,
    color: '#707F94',
    marginTop: 4,
    lineHeight: 15,
  },
  /* ── Quantity stepper + buy area ─────────────────────────── */
  buyArea: {
    alignItems: 'flex-end',
    gap: 6,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.04)',
  },
  stepBtnText: {
    color: theme.COLORS.parchment,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  stepBtnTextDisabled: {
    color: 'rgba(255,255,255,0.2)',
  },
  stepQty: {
    ...theme.FONTS.heading,
    color: theme.COLORS.warmGlow,
    minWidth: 22,
    textAlign: 'center',
  },
  buyBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
    overflow: 'hidden',
  },
  buyBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  buyBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    letterSpacing: 0,
    fontWeight: 'normal',
    zIndex: 2,
  },
  buyBtnTextActive: {
    color: '#071A0E',
  },
  buyBtnTextDisabled: {
    color: 'rgba(255, 255, 255, 0.15)',
  },
  buyBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    zIndex: 3,
  },

  /* ── Armory Tab Styles ───────────────────────────────────── */
  zoneSection: {
    marginTop: 18,
  },
  zoneHeader: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 15,
    fontWeight: 'normal',
    color: '#D4A754',
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  gearCard: {
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 80,
  },
  gearCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    zIndex: 2,
  },
  gearIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginRight: 12,
  },
  gearName: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: 'normal',
  },
  gearTypeBadge: {
    backgroundColor: 'rgba(212, 167, 84, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.2)',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  gearTypeBadgeText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 7,
    fontWeight: 'normal',
    color: '#D4A754',
    letterSpacing: 0,
  },
  statPreview: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    letterSpacing: 0,
    color: '#10B981',
    fontWeight: 'normal',
    marginTop: 4,
  },
  armoryBuyBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
    overflow: 'hidden',
  },
  armoryBuyBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  armoryBuyBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    letterSpacing: 0,
    fontWeight: 'normal',
    zIndex: 2,
    color: '#1A1200',
  },
  armoryBuyBtnTextDisabled: {
    color: 'rgba(255, 255, 255, 0.15)',
  },
  armoryBuyBtnOwned: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
    backgroundColor: 'rgba(92, 196, 137, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(92, 196, 137, 0.2)',
  },
  armoryBuyBtnOwnedText: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 12,
    fontWeight: 'normal',
    color: '#5CC489',
  },
  zoneHeaderLocked: {
    color: 'rgba(255, 255, 255, 0.2)',
  },
  lockedZoneCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  lockedZoneText: {
    fontFamily: 'PixelifySans-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.25)',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  /* ── Forge Section ───────────────────────────────────────── */
  subSectionTitle: {
    fontFamily: 'PixelifySans-Medium',
    fontWeight: 'normal',
    fontSize: 13,
    color: '#D4A754',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  forgeContainer: {
    gap: 16,
  },
  vaultSection: {
    gap: 10,
  },
  vaultZoneCard: {
    backgroundColor: 'rgba(255,255,255,0.015)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  vaultZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vaultZoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vaultZoneLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    fontWeight: 'normal',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  vaultItemsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  vaultItemBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  vaultItemEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  vaultItemName: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    color: '#707F94',
    marginBottom: 6,
    textAlign: 'center',
  },
  vaultItemQtyBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  vaultItemQtyBadgeEmpty: {
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  vaultItemQtyText: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 11,
    fontWeight: 'normal',
  },
  vaultItemQtyTextEmpty: {
    color: 'rgba(255,255,255,0.2)',
  },
  recipesSection: {
    gap: 10,
  },
  recipeCard: {
    backgroundColor: 'rgba(255,255,255,0.015)',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  recipeFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recipeMaterialCol: {
    flex: 2,
    alignItems: 'center',
    gap: 4,
  },
  recipeEmoji: {
    fontSize: 26,
  },
  recipeMaterialName: {
    fontFamily: 'PixelifySans-Medium',
    fontSize: 13,
    color: '#F8FAFC',
    textAlign: 'center',
  },
  recipeQtyLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    textAlign: 'center',
  },
  recipeArrowCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeArrow: {
    fontSize: 18,
    color: '#D4A754',
    opacity: 0.5,
  },
  recipeArrowText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 7,
    color: '#707F94',
    marginTop: 2,
  },
  forgeBtn: {
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  forgeBtnActive: {
    backgroundColor: '#F3E2BD',
    borderColor: '#4A3917',
  },
  forgeBtnDisabled: {
    backgroundColor: '#3C2D1E',
    borderColor: '#4A3917',
    opacity: 0.5,
  },
  forgeBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    fontWeight: 'normal',
    letterSpacing: 0.5,
  },
  forgeBtnTextActive: {
    color: '#2A1A0C',
  },
  forgeBtnTextDisabled: {
    color: '#F3E2BD',
  },
});
