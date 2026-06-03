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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect } from 'react-native-svg';

import { useGame } from '../state/gameState';
import { GEAR, CONSUMABLES, MATERIALS } from '../data/gear';
import { calculateEffectiveStats, getActiveSetBonuses } from '../logic/progressionEngine';

// ─── Tabs ────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'consumables', icon: '🧪', label: 'Consumables' },
  { key: 'crafting',    icon: '💎', label: 'Crafting'    },
  { key: 'equipment',  icon: '⚔️', label: 'Equipment'   },
];

// ─── Slot config ──────────────────────────────────────────────────────────────
const SLOT_CONFIG = [
  { key: 'weapon',  label: 'Weapon',  emoji: '⚔️' },
  { key: 'armor',   label: 'Armor',   emoji: '🛡️' },
  { key: 'trinket', label: 'Trinket', emoji: '💎' },
];

const GEAR_TYPE_ICON = {
  weapon:  '⚔️',
  armor:   '🛡️',
  trinket: '💎',
};

// ─── Consumable icons ─────────────────────────────────────────────────────────
const CONSUMABLE_ICONS = {
  health_potion: '🧪',
  mega_potion:   '💊',
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function InventoryScreen() {
  const navigation = useNavigation();
  const { state, dispatch } = useGame();
  const { hero } = state;

  const [activeTab, setActiveTab] = useState('consumables');

  // Derived data (Equipment tab)
  const effectiveStats = useMemo(() => calculateEffectiveStats(hero), [hero]);
  const activeSets     = useMemo(() => getActiveSetBonuses(hero.gear), [hero.gear]);

  // Tab badge counts
  const consumableCount = useMemo(
    () => hero.inventory.consumables.filter(c => c.quantity > 0).length,
    [hero.inventory.consumables],
  );
  const craftingCount = useMemo(
    () => Object.values(hero.inventory.materials).filter(q => q > 0).length,
    [hero.inventory.materials],
  );
  const equipmentCount = hero.inventory.craftedGear.length;

  const tabCounts = { consumables: consumableCount, crafting: craftingCount, equipment: equipmentCount };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const pct = (v) => `${Math.round((v || 0) * 100)}%`;

  const statSummary = (gearDef) => {
    if (!gearDef?.stats) return '';
    const parts = [];
    if (gearDef.stats.attack)     parts.push(`ATK +${gearDef.stats.attack}`);
    if (gearDef.stats.defence)    parts.push(`DEF +${gearDef.stats.defence}`);
    if (gearDef.stats.maxHp)      parts.push(`HP +${gearDef.stats.maxHp}`);
    if (gearDef.stats.critChance) parts.push(`CRIT +${pct(gearDef.stats.critChance)}`);
    if (gearDef.stats.dodge)      parts.push(`DODGE +${pct(gearDef.stats.dodge)}`);
    Object.keys(gearDef.stats).forEach((k) => {
      if (!['attack', 'defence', 'maxHp', 'critChance', 'dodge'].includes(k)) {
        parts.push(`${k}: ${gearDef.stats[k]}`);
      }
    });
    return parts.join('  ');
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleEquip = (gearItem) =>
    dispatch({ type: 'EQUIP_GEAR', payload: { slot: gearItem.type, gearId: gearItem.id } });

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
          <Text style={styles.emptyDesc}>Visit the Town Hall to stock up on potions and supplies.</Text>
        </View>
      );
    }
    return items.map((entry) => {
      const def     = CONSUMABLES.find(c => c.id === entry.id);
      const icon    = CONSUMABLE_ICONS[entry.id] || '🧪';
      const isChest = entry.id === 'mystery_chest';
      return (
        <View key={entry.id} style={styles.card}>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Rect width="100%" height="100%" fill="rgba(255,255,255,0.02)" rx={14} />
            <Rect x="1" y="1" width="99%" height="98%" rx={13} fill="none"
              stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          </Svg>
          <View style={styles.cardInner}>
            <View style={styles.cardIconBox}>
              <Text style={styles.cardIcon}>{icon}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{def?.name || entry.id}</Text>
              <Text style={styles.cardDesc} numberOfLines={1}>{def?.description || ''}</Text>
            </View>
            {isChest ? (
              <TouchableOpacity style={styles.openChestBtn} onPress={handleOpenChest} activeOpacity={0.8}>
                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                  <Defs>
                    <LinearGradient id="chestGrad" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0%" stopColor="#F9D99A" />
                      <Stop offset="100%" stopColor="#D4A754" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#chestGrad)" rx={8} />
                </Svg>
                <Text style={styles.openChestText}>Open ({entry.quantity})</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.qtyBadge}>
                <Text style={styles.qtyText}>×{entry.quantity}</Text>
              </View>
            )}
          </View>
        </View>
      );
    });
  };

  const renderCrafting = () => {
    const materials = hero.inventory.materials;
    const hasAny = MATERIAL_ZONES.some(z => z.ids.some(id => (materials[id] || 0) > 0));
    if (!hasAny) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>💎</Text>
          <Text style={styles.emptyTitle}>No Materials</Text>
          <Text style={styles.emptyDesc}>Explore dungeons and defeat enemies to collect crystals and shards.</Text>
        </View>
      );
    }
    return MATERIAL_ZONES.map((zone) => {
      const zoneItems = zone.ids
        .map(id => ({ id, qty: materials[id] || 0, name: MATERIALS[id]?.name || id }))
        .filter(m => m.qty > 0);
      if (zoneItems.length === 0) return null;
      return (
        <View key={zone.label} style={styles.materialGroup}>
          {/* Zone header */}
          <View style={styles.materialGroupHeader}>
            <View style={[styles.materialGroupDot, { backgroundColor: zone.zoneColor }]} />
            <Text style={[styles.materialGroupLabel, { color: zone.zoneColor }]}>{zone.label}</Text>
          </View>
          {/* Zone card */}
          <View style={[styles.materialGroupCard, { borderColor: zone.zoneColor + '25' }]}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id={`matGlow_${zone.label}`} cx="0%" cy="50%" rx="50%" ry="80%">
                  <Stop offset="0%" stopColor={zone.zoneColor} stopOpacity="0.05" />
                  <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="rgba(255,255,255,0.015)" rx={14} />
              <Rect width="100%" height="100%" fill={`url(#matGlow_${zone.label})`} rx={14} />
            </Svg>
            {zoneItems.map((mat, idx) => (
              <View
                key={mat.id}
                style={[
                  styles.materialRow,
                  idx < zoneItems.length - 1 && styles.materialRowBorder,
                ]}
              >
                <Text style={styles.materialEmoji}>{zone.emoji}</Text>
                <Text style={styles.materialName}>{mat.name}</Text>
                <View style={[styles.materialQtyBadge, { borderColor: zone.zoneColor + '50', backgroundColor: zone.zoneColor + '15' }]}>
                  <Text style={[styles.materialQty, { color: zone.zoneColor }]}>×{mat.qty}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      );
    });
  };

  const renderEquipment = () => (
    <>
      {/* ── Combat Stats ── */}
      <View style={styles.statsSection}>
        <Text style={styles.subSectionTitle}>📊 Combat Stats</Text>
        <View style={styles.statsGrid}>
          <StatCard label="ATK"   value={effectiveStats.attack}              emoji="⚔️" />
          <StatCard label="DEF"   value={effectiveStats.defence}             emoji="🛡️" />
          <StatCard label="HP"    value={effectiveStats.maxHp}               emoji="❤️" color="#EF4444" />
          <StatCard label="CRIT"  value={pct(effectiveStats.critChance)}     emoji="💥" color="#FBBF24" />
          <StatCard label="DODGE" value={pct(effectiveStats.dodge)}          emoji="💨" color="#06B6D4" />
        </View>
      </View>

      {/* ── Core Attributes ── */}
      <View style={styles.statsSection}>
        <Text style={styles.subSectionTitle}>💪 Core Attributes</Text>
        <View style={styles.statsGrid}>
          <StatCard label="STR"   value={hero.strength || 10}              emoji="💪" color="#F5CF4A" />
          <StatCard label="AGI"   value={hero.agility || 10}               emoji="🏃" color="#06B6D4" />
          <StatCard label="VIT"   value={hero.vitality || 10}              emoji="💚" color="#5CC489" />
          <View style={{ flex: 1 }} />
          <View style={{ flex: 1 }} />
        </View>
      </View>

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

      {/* Divider */}
      <View style={styles.divider} />

      {/* ── Equipped Slots ── */}
      <Text style={styles.subSectionTitle}>🎯 Equipped Loadout</Text>
      <View style={styles.slotsRow}>
        {SLOT_CONFIG.map(({ key, label, emoji }) => {
          const gearId  = hero.gear[key];
          const gearDef = gearId ? GEAR[gearId] : null;
          const isEmpty = !gearDef;
          return (
            <View key={key} style={styles.slotCard}>
              <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                <Defs>
                  <LinearGradient id={`slotBg_${key}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#12121A" stopOpacity={0.9} />
                    <Stop offset="100%" stopColor="#0A0A0F" stopOpacity={1} />
                  </LinearGradient>
                  {!isEmpty && (
                    <LinearGradient id={`slotGold_${key}`} x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0%" stopColor="#F9D99A" />
                      <Stop offset="50%" stopColor="#D4A754" />
                      <Stop offset="100%" stopColor="#8B6914" />
                    </LinearGradient>
                  )}
                </Defs>
                <Rect width="100%" height="100%" fill={`url(#slotBg_${key})`} rx={16} />
                <Rect x="1" y="1" width="98%" height="98%" rx={15} fill="none"
                  stroke={!isEmpty ? `url(#slotGold_${key})` : 'rgba(255,255,255,0.06)'}
                  strokeWidth={!isEmpty ? 1.5 : 1} />
              </Svg>
              <View style={styles.slotInner}>
                <Text style={styles.slotEmoji}>{emoji}</Text>
                <Text style={styles.slotLabel}>{label}</Text>
                {isEmpty ? (
                  <Text style={styles.slotEmpty}>Empty</Text>
                ) : (
                  <>
                    <Text style={styles.slotName} numberOfLines={1}>{gearDef.name}</Text>
                    <Text style={styles.slotStats} numberOfLines={2}>{statSummary(gearDef)}</Text>
                    <TouchableOpacity
                      style={styles.unequipBtn}
                      onPress={() => handleUnequip(key)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.unequipBtnText}>Unequip</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* ── Owned Gear ── */}
      <Text style={styles.subSectionTitle}>⚒️ Owned Gear</Text>
      {hero.inventory.craftedGear.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>⚒️</Text>
          <Text style={styles.emptyTitle}>No Gear Crafted</Text>
          <Text style={styles.emptyDesc}>Visit the Town Hall to forge equipment from your materials.</Text>
        </View>
      ) : (
        hero.inventory.craftedGear.map((gearId) => {
          const gearDef   = GEAR[gearId];
          if (!gearDef) return null;
          const isEquipped = hero.gear[gearDef.type] === gearId;
          return (
            <View key={gearId} style={[
              styles.card,
              isEquipped ? styles.cardGearEquipped : styles.cardGearUnequipped,
            ]}>
              <View style={styles.cardInner}>
                <View style={styles.cardInfo}>
                  <View style={styles.gearNameRow}>
                    <Text style={styles.gearTypeIcon}>{GEAR_TYPE_ICON[gearDef.type] || '🎒'}</Text>
                    <Text style={styles.cardName}>{gearDef.name}</Text>
                    <Text style={styles.gearZoneTag}>Z{gearDef.zone}</Text>
                  </View>
                  <Text style={styles.gearStats}>{statSummary(gearDef)}</Text>
                </View>
                {isEquipped ? (
                  <TouchableOpacity
                    style={styles.unequipBtnGear}
                    onPress={() => handleUnequip(gearDef.type)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.unequipBtnGearStatus}>✓ Equipped</Text>
                    <Text style={styles.unequipBtnGearAction}>Tap to remove</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.equipBtn} onPress={() => handleEquip(gearDef)} activeOpacity={0.7}>
                    <Text style={styles.equipBtnText}>Equip</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}
    </>
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      {/* Ambient glow */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="bgGlow" cx="50%" cy="0%" rx="80%" ry="40%">
            <Stop offset="0%" stopColor="#D4A754" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#07070A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="#07070A" />
        <Rect width="100%" height="100%" fill="url(#bgGlow)" />
      </Svg>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← Hub</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🎒 Inventory</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          {TABS.map(({ key, icon, label }) => {
            const isActive = activeTab === key;
            const count    = tabCounts[key];
            return (
              <TouchableOpacity
                key={key}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabIcon, !isActive && styles.tabIconDim]}>{icon}</Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
                {count > 0 && (
                  <View style={[styles.tabCount, isActive && styles.tabCountActive]}>
                    <Text style={[styles.tabCountText, isActive && styles.tabCountTextActive]}>{count}</Text>
                  </View>
                )}
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
        {activeTab === 'equipment'   && renderEquipment()}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── StatCard sub-component ───────────────────────────────────────────────────
function StatCard({ label, value, emoji, color = '#D4A754' }) {
  return (
    <View style={styles.statCard}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Rect width="100%" height="100%" fill="rgba(255,255,255,0.02)" rx={12} />
        <Rect x="1" y="1" width="98%" height="98%" rx={11} fill="none"
          stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
      </Svg>
      <View style={styles.statCardInner}>
        <Text style={styles.statEmoji}>{emoji}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07070A',
  },

  /* ── Header ──────────────────────────────────────────────── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  backBtn: { width: 60, paddingVertical: 6 },
  backText: {
    color: '#D4A754',
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 20,
    color: '#F8FAFC',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  headerSpacer: { width: 60 },

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
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '600',
    color: '#707F94',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  tabCount: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  tabCountActive: {
    backgroundColor: 'rgba(212,167,84,0.2)',
  },
  tabCountText: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#707F94',
  },
  tabCountTextActive: {
    color: '#D4A754',
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
    fontFamily: 'System',
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  cardDesc: {
    fontFamily: 'System',
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
    fontFamily: 'System',
    fontSize: 14,
    color: '#D4A754',
    fontWeight: 'bold',
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
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: 'bold',
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
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '900',
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
    fontFamily: 'System',
    fontSize: 13,
    color: '#CFE0EE',
    flex: 1,
    fontWeight: '500',
  },
  materialQtyBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  materialQty: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: 'bold',
  },

  /* ── Equipment tab ───────────────────────────────────────── */
  statsSection: {
    marginBottom: 6,
  },
  subSectionTitle: {
    fontFamily: 'System',
    fontWeight: '800',
    fontSize: 13,
    color: '#D4A754',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    minHeight: 80,
    overflow: 'hidden',
  },
  statCardInner: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    zIndex: 2,
    gap: 2,
  },
  statEmoji: { fontSize: 14 },
  statLabel: {
    fontFamily: 'System',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#707F94',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statValue: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D4A754',
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
    fontFamily: 'System',
    fontSize: 14,
    color: '#D4A754',
    fontWeight: 'bold',
  },
  setBonusDesc: {
    fontFamily: 'System',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 5,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 8,
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  slotCard: {
    flex: 1,
    borderRadius: 16,
    minHeight: 160,
    overflow: 'hidden',
  },
  slotInner: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    zIndex: 2,
    gap: 3,
  },
  slotEmoji: { fontSize: 24 },
  slotLabel: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.25)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  slotEmpty: {
    fontFamily: 'System',
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    fontStyle: 'italic',
  },
  slotName: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#F8FAFC',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  slotStats: {
    fontFamily: 'System',
    fontSize: 9,
    color: '#D4A754',
    textAlign: 'center',
    lineHeight: 12,
    fontWeight: '500',
  },
  unequipBtn: {
    marginTop: 4,
    backgroundColor: 'rgba(255,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  unequipBtnText: {
    fontFamily: 'System',
    fontSize: 9,
    color: '#D8483F',
    fontWeight: 'bold',
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
    fontFamily: 'System',
    fontSize: 8,
    fontWeight: '900',
    color: '#D4A754',
    backgroundColor: 'rgba(212,167,84,0.08)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(212,167,84,0.15)',
  },
  gearStats: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#D4A754',
    marginTop: 3,
    fontWeight: '500',
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
    fontFamily: 'System',
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: 'bold',
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
    fontFamily: 'System',
    fontSize: 11,
    color: '#10B981',
    fontWeight: 'bold',
  },
  unequipBtnGearAction: {
    fontFamily: 'System',
    fontSize: 9,
    color: '#D8483F',
    fontWeight: '600',
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
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 6,
  },
  emptyDesc: {
    fontFamily: 'System',
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 17,
  },
});
