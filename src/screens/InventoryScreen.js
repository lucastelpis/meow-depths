/**
 * =============================================================================
 * InventoryScreen.js — Equipment, Stats & Pack Bag (Redesigned Premium UI)
 * =============================================================================
 *
 * This screen lets the player manage Mochi's equipped loadout, view combat stats,
 * open mystery chests from the bag, and equip crafted gear.
 *
 * Designed with a premium "Twilight Obsidian & Gilded Amber" theme.
 */

import React, { useMemo } from 'react';
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
import {
  calculateEffectiveStats,
  getActiveSetBonuses,
} from '../logic/progressionEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Slot metadata
const SLOT_CONFIG = [
  { key: 'weapon',  label: 'Weapon',  emoji: '⚔️' },
  { key: 'armor',   label: 'Armor',   emoji: '🛡️' },
  { key: 'trinket', label: 'Trinket', emoji: '💎' },
];

const CONSUMABLE_ICONS = {
  health_potion: '🧪',
  mega_potion: '💊',
  antidote: '🌿',
  smoke_vial: '💨',
  mystery_chest: '🎁',
};

export default function InventoryScreen() {
  const navigation = useNavigation();
  const { state, dispatch } = useGame();
  const { hero } = state;

  // -- Derived data --
  const effectiveStats = calculateEffectiveStats(hero);
  const activeSets     = getActiveSetBonuses(hero.gear);

  // ── Helper: format percentage display ──
  const pct = (value) => `${Math.round((value || 0) * 100)}%`;

  // ── Helper: summarize stats for display ──
  const statSummary = (gearDef) => {
    if (!gearDef?.stats) return '';
    const parts = [];
    if (gearDef.stats.attack)     parts.push(`ATK +${gearDef.stats.attack}`);
    if (gearDef.stats.defence)    parts.push(`DEF +${gearDef.stats.defence}`);
    if (gearDef.stats.maxHp)      parts.push(`HP +${gearDef.stats.maxHp}`);
    if (gearDef.stats.critChance) parts.push(`CRIT +${pct(gearDef.stats.critChance)}`);
    if (gearDef.stats.dodge)      parts.push(`DODGE +${pct(gearDef.stats.dodge)}`);
    
    // Custom stats
    Object.keys(gearDef.stats).forEach((k) => {
      if (!['attack', 'defence', 'maxHp', 'critChance', 'dodge'].includes(k)) {
        parts.push(`${k}: ${gearDef.stats[k]}`);
      }
    });
    return parts.join('  ');
  };

  // ── Equip handler ──
  const handleEquip = (gearItem) => {
    dispatch({
      type: 'EQUIP_GEAR',
      payload: { slot: gearItem.type, gearId: gearItem.id },
    });
  };

  // ── Open Lootbox (Chest) handler ──
  const handleOpenChest = () => {
    // 1. Roll Gold: 15g to 45g
    const rolledGold = Math.floor(Math.random() * 31) + 15;

    // 2. Roll 3 Crystals: Shard (60%), Small (25%), Big (12%), Core (3%)
    const rolledMaterials = {};
    const crystalFamilies = ['black', 'green', 'yellow'];
    
    const rollTier = () => {
      const roll = Math.random() * 100;
      if (roll < 60) return 'shard';
      if (roll < 85) return 'crystal_small';
      if (roll < 97) return 'crystal_big';
      return 'core';
    };

    for (let i = 0; i < 3; i++) {
      const family = crystalFamilies[Math.floor(Math.random() * crystalFamilies.length)];
      const tier = rollTier();
      
      let key = '';
      if (tier === 'shard') {
        key = `${family}_shard`;
      } else if (tier === 'core') {
        key = `${family}_crystal_core`;
      } else {
        key = `${family}_${tier}`;
      }

      rolledMaterials[key] = (rolledMaterials[key] || 0) + 1;
    }

    // Format display list
    const rewardLines = [];
    rewardLines.push(`💰 ${rolledGold} gold`);
    
    Object.entries(rolledMaterials).forEach(([itemId, qty]) => {
      const name = MATERIALS[itemId]?.name || itemId;
      let emoji = '💎';
      if (itemId.startsWith('black')) emoji = '🖤';
      if (itemId.startsWith('green')) emoji = '💚';
      if (itemId.startsWith('yellow')) emoji = '💛';

      rewardLines.push(`${emoji} ${name} ×${qty}`);
    });

    Alert.alert(
      '🎁 Chest Opened!',
      `You obtained:\n\n${rewardLines.join('\n')}`,
      [
        {
          text: 'Awesome',
          onPress: () => {
            dispatch({
              type: 'OPEN_LOOTBOX',
              payload: {
                gold: rolledGold,
                materials: rolledMaterials,
              },
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Top ambient glow background */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="topGlow" cx="50%" cy="0%" rx="80%" ry="40%">
            <Stop offset="0%" stopColor="#D4A754" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#07070A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="#07070A" />
        <Rect width="100%" height="100%" fill="url(#topGlow)" />
      </Svg>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← Hub</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🎒 Inventory</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Equipped Slots ────────────────────────────────────────── */}
        <View style={styles.slotsRow}>
          {SLOT_CONFIG.map(({ key, label, emoji }) => {
            const gearId  = hero.gear[key];
            const gearDef = gearId ? GEAR[gearId] : null;
            const isEmpty = !gearDef;

            return (
              <View key={key} style={[styles.slotCard, !isEmpty && theme.SHADOWS.glowPrimary]}>
                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                  <Defs>
                    <LinearGradient id={`slotGrad_${key}`} x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#12121A" stopOpacity={0.9} />
                      <Stop offset="100%" stopColor="#0A0A0F" stopOpacity={1} />
                    </LinearGradient>
                    {!isEmpty && (
                      <LinearGradient id={`gildedGrad_${key}`} x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor="#F9D99A" />
                        <Stop offset="50%" stopColor="#D4A754" />
                        <Stop offset="100%" stopColor="#8B6914" />
                      </LinearGradient>
                    )}
                  </Defs>
                  <Rect width="100%" height="100%" fill={`url(#slotGrad_${key})`} rx={16} />
                  <Rect
                    x="1"
                    y="1"
                    width="98%"
                    height="98%"
                    rx={15}
                    fill="none"
                    stroke={!isEmpty ? `url(#gildedGrad_${key})` : 'rgba(255,255,255,0.06)'}
                    strokeWidth={!isEmpty ? 1.5 : 1}
                  />
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
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Combat Stats Grid ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Combat Stats</Text>
          <View style={styles.statsGrid}>
            <StatCard label="ATK"    value={effectiveStats.attack}    emoji="⚔️" />
            <StatCard label="DEF"    value={effectiveStats.defence}   emoji="🛡️" />
            <StatCard label="HP"     value={effectiveStats.maxHp}     emoji="❤️" color="#EF4444" />
            <StatCard label="CRIT"   value={pct(effectiveStats.critChance)}  emoji="💥" color="#FBBF24" />
            <StatCard label="DODGE"  value={pct(effectiveStats.dodge)}       emoji="💨" color="#06B6D4" />
          </View>
        </View>

        {/* ── Active Set Bonuses ────────────────────────────────────── */}
        {activeSets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ Set Bonuses</Text>
            {activeSets.map((set) => (
              <View key={set.name} style={[styles.setBonusCard, theme.SHADOWS.glowPrimary]}>
                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                  <Defs>
                    <LinearGradient id="setGrad" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0%" stopColor="#1E1911" />
                      <Stop offset="100%" stopColor="#0B0B0E" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#setGrad)" rx={12} />
                  <Rect x="1" y="1" width="99%" height="98%" rx={11} fill="none" stroke="rgba(212, 167, 84, 0.25)" strokeWidth={1} />
                </Svg>
                <View style={styles.setBonusInner}>
                  <Text style={styles.setBonusName}>🔗 {set.name}</Text>
                  <Text style={styles.setBonusDesc}>{set.bonus}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Pack Bag (Consumables) ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎒 Pack Bag</Text>
          {hero.inventory.consumables.length === 0 || !hero.inventory.consumables.some(c => c.quantity > 0) ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No consumables in your bag. Visit the Town Shop to buy items!
              </Text>
            </View>
          ) : (
            hero.inventory.consumables
              .filter(c => c.quantity > 0)
              .map((entry) => {
                const def = CONSUMABLES.find((c) => c.id === entry.id);
                const icon = CONSUMABLE_ICONS[entry.id] || '🧪';
                const isChest = entry.id === 'mystery_chest';
                return (
                  <View key={entry.id} style={styles.itemRow}>
                    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                      <Rect width="100%" height="100%" fill="rgba(255,255,255,0.02)" rx={12} />
                      <Rect x="1" y="1" width="99%" height="98%" rx={11} fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth={1} />
                    </Svg>
                    <View style={styles.itemRowInner}>
                      <View style={styles.itemIconWrapper}>
                        <Text style={styles.itemIcon}>{icon}</Text>
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>
                          {def?.name || entry.id}
                        </Text>
                        <Text style={styles.itemDesc} numberOfLines={1}>
                          {def?.description || ''}
                        </Text>
                      </View>
                      {isChest ? (
                        <TouchableOpacity
                          style={[styles.openChestBtn, theme.SHADOWS.glowPrimary]}
                          activeOpacity={0.8}
                          onPress={handleOpenChest}
                        >
                          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                            <Defs>
                              <LinearGradient id="chestBtnGrad" x1="0" y1="0" x2="1" y2="0">
                                <Stop offset="0%" stopColor="#F9D99A" />
                                <Stop offset="100%" stopColor="#D4A754" />
                              </LinearGradient>
                            </Defs>
                            <Rect width="100%" height="100%" fill="url(#chestBtnGrad)" rx={8} />
                          </Svg>
                          <Text style={styles.openChestBtnText}>Open ({entry.quantity})</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.qtyBadge}>
                          <Text style={styles.qtyText}>×{entry.quantity}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
          )}
        </View>

        {/* ── Owned Gear ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚒️ Owned Gear</Text>
          {hero.inventory.craftedGear.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No gear forged yet. Visit the Town Shop to craft equipment!
              </Text>
            </View>
          ) : (
            hero.inventory.craftedGear.map((gearId) => {
              const gearDef = GEAR[gearId];
              if (!gearDef) return null;

              const isEquipped = hero.gear[gearDef.type] === gearId;

              return (
                <View key={gearId} style={[styles.itemRow, isEquipped && styles.itemRowEquipped]}>
                  <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                    <Defs>
                      <LinearGradient id="equippedRowGrad" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0%" stopColor="#1E1911" />
                        <Stop offset="100%" stopColor="#0B0B0E" />
                      </LinearGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill={isEquipped ? "url(#equippedRowGrad)" : "rgba(255,255,255,0.02)"} rx={12} />
                    <Rect
                      x="1"
                      y="1"
                      width="99%"
                      height="98%"
                      rx={11}
                      fill="none"
                      stroke={isEquipped ? 'rgba(212, 167, 84, 0.3)' : 'rgba(255, 255, 255, 0.05)'}
                      strokeWidth={1}
                    />
                  </Svg>

                  <View style={styles.itemRowInner}>
                    <View style={styles.itemInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.itemName}>{gearDef.name}</Text>
                        <Text style={styles.gearTag}>
                          {gearDef.type.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.gearStats}>{statSummary(gearDef)}</Text>
                    </View>

                    {isEquipped ? (
                      <View style={styles.equippedBadge}>
                        <Text style={styles.equippedBadgeText}>Equipped</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.equipBtn}
                        activeOpacity={0.7}
                        onPress={() => handleEquip(gearDef)}
                      >
                        <Text style={styles.equipBtnText}>Equip</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// Sub-component — A single premium stat card
// ============================================================================
function StatCard({ label, value, emoji, color = '#D4A754' }) {
  return (
    <View style={styles.statCard}>
      {/* Card Border & Background */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Rect width="100%" height="100%" fill="rgba(255, 255, 255, 0.02)" rx={12} />
        <Rect x="1" y="1" width="98%" height="98%" rx={11} fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth={1} />
      </Svg>

      <View style={styles.statCardInner}>
        <View style={styles.statEmojiWrapper}>
          <Text style={styles.statEmoji}>{emoji}</Text>
        </View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

// ============================================================================
// Styles — Twilight Obsidian & Gilded Amber Theme
// ============================================================================
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07070A',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
  },

  /* ═══ Header ═══════════════════════════════════════════════════════════════ */
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
    letterSpacing: 0.8,
  },
  backBtnPlaceholder: {
    width: 70,
  },

  /* ═══ Gear Slots ═══════════════════════════════════════════════════════════ */
  slotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  slotCard: {
    flex: 1,
    borderRadius: 16,
    minHeight: 120,
    overflow: 'hidden',
  },
  slotInner: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    zIndex: 2,
  },
  slotEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },
  slotLabel: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.25)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  slotEmpty: {
    fontFamily: 'System',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.2)',
    fontStyle: 'italic',
  },
  slotName: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  slotStats: {
    fontFamily: 'System',
    fontSize: 9,
    color: '#D4A754',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 12,
    fontWeight: '500',
  },

  /* ═══ Sections ═════════════════════════════════════════════════════════════ */
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'System',
    fontWeight: '800',
    fontSize: 15,
    color: '#D4A754',
    marginBottom: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  /* ═══ Stats Grid ═══════════════════════════════════════════════════════════ */
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
  },
  statEmojiWrapper: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statEmoji: {
    fontSize: 14,
  },
  statLabel: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#707F94',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
  },

  /* ═══ Set Bonuses ══════════════════════════════════════════════════════════ */
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
    letterSpacing: 0.5,
  },
  setBonusDesc: {
    fontFamily: 'System',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 6,
    lineHeight: 16,
  },

  /* ═══ Premium Item Rows (Consumables & Gear) ═══════════════════════════════ */
  itemRow: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    minHeight: 64,
  },
  itemRowEquipped: {
    borderColor: 'rgba(212, 167, 84, 0.2)',
  },
  itemRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    zIndex: 2,
  },
  itemIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  itemIcon: {
    fontSize: 22,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gearTag: {
    fontFamily: 'System',
    fontSize: 8,
    fontWeight: '900',
    color: '#707F94',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  itemDesc: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#707F94',
    marginTop: 2,
  },
  gearStats: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#D4A754',
    marginTop: 3,
    fontWeight: '500',
  },
  qtyBadge: {
    backgroundColor: 'rgba(212, 167, 84, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.2)',
  },
  qtyText: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#D4A754',
    fontWeight: 'bold',
  },
  openChestBtn: {
    width: 90,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  openChestBtnText: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1A1200',
    zIndex: 2,
  },
  equipBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  equipBtnText: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  equippedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  equippedBadgeText: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#10B981',
    fontWeight: 'bold',
  },

  /* ═══ Empty / States ═══════════════════════════════════════════════════════ */
  emptyContainer: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'System',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.25)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
