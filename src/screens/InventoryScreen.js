/**
 * =============================================================================
 * InventoryScreen.js — Equipment, Stats & Shop
 * =============================================================================
 *
 * This screen lets the player manage Mochi's loadout and purchase supplies:
 *
 *   Tab 1: GEAR & STATS
 *     - Equipped gear slots (Weapon, Armor, Trinket)
 *     - Detailed combat stats grid
 *     - Active set bonuses
 *     - Owned gear list (equip crafted items)
 *
 *   Tab 2: BAG & SHOP
 *     - Gold balance card
 *     - Consumable items bag
 *     - Camp Apothecary (buy potions and vials)
 *
 * =============================================================================
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

import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { GEAR, CONSUMABLES } from '../data/gear';
import {
  calculateEffectiveStats,
  getActiveSetBonuses,
} from '../logic/progressionEngine';

// ─── Slot metadata ──────────────────────────────────────────────────────────
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
};

// ============================================================================
// Component
// ============================================================================
export default function InventoryScreen() {
  const navigation = useNavigation();
  const { state, dispatch } = useGame();
  const { hero } = state;

  const [activeTab, setActiveTab] = useState('gear'); // 'gear' | 'shop'

  // -- Derived data ----------------------------------------------------------
  const effectiveStats = calculateEffectiveStats(hero);
  const activeSets     = getActiveSetBonuses(hero.gear);

  // ── Helper: format percentage display ─────────────────────────────────────
  const pct = (value) => `${Math.round((value || 0) * 100)}%`;

  // ── Helper: summarize stats for display ───────────────────────────────────
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

  // ── Consumables inventory counts ──────────────────────────────────────────
  const consumableInventory = useMemo(() => {
    const counts = {};
    (hero.inventory?.consumables || []).forEach(c => {
      counts[c.id] = c.quantity;
    });
    return counts;
  }, [hero.inventory?.consumables]);

  // ── Equip handler ────────────────────────────────────────────────────────
  const handleEquip = (gearItem) => {
    dispatch({
      type: 'EQUIP_GEAR',
      payload: { slot: gearItem.type, gearId: gearItem.id },
    });
  };

  // ── Purchase handler ──────────────────────────────────────────────────────
  const handleBuy = (consumable) => {
    if (hero.gold < consumable.cost) {
      Alert.alert('Insufficent Gold', "You don't have enough gold for this purchase.");
      return;
    }
    dispatch({
      type: 'BUY_CONSUMABLE',
      payload: { consumableId: consumable.id, price: consumable.cost },
    });
  };

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Hub</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🎒 Inventory</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      {/* ── Segmented Tab Switcher ──────────────────────────────────── */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'gear' && styles.tabButtonActive]}
          activeOpacity={0.8}
          onPress={() => setActiveTab('gear')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'gear' && styles.tabButtonTextActive]}>
            ⚔️ Gear & Stats
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'shop' && styles.tabButtonActive]}
          activeOpacity={0.8}
          onPress={() => setActiveTab('shop')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'shop' && styles.tabButtonTextActive]}>
            🧪 Shop & Bag
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            TAB 1: GEAR & STATS
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'gear' && (
          <View style={styles.tabContent}>
            {/* Equipped Slots */}
            <View style={styles.slotsRow}>
              {SLOT_CONFIG.map(({ key, label, emoji }) => {
                const gearId  = hero.gear[key];
                const gearDef = gearId ? GEAR[gearId] : null;
                const isEmpty = !gearDef;

                return (
                  <View
                    key={key}
                    style={[
                      styles.slotCard,
                      !isEmpty && styles.slotCardEquipped,
                    ]}
                  >
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
                );
              })}
            </View>

            {/* Combat Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Combat Stats</Text>
              <View style={styles.statsGrid}>
                <StatBadge label="ATK"    value={effectiveStats.attack} />
                <StatBadge label="DEF"    value={effectiveStats.defence} />
                <StatBadge label="HP"     value={effectiveStats.maxHp} />
                <StatBadge label="CRIT"   value={pct(effectiveStats.critChance)} />
                <StatBadge label="DODGE"  value={pct(effectiveStats.dodge)} />
              </View>
            </View>

            {/* Active Set Bonuses */}
            {activeSets.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>✨ Set Bonuses</Text>
                {activeSets.map((set) => (
                  <View key={set.name} style={styles.setBonusCard}>
                    <Text style={styles.setBonusName}>🔗 {set.name}</Text>
                    <Text style={styles.setBonusDesc}>{set.bonus}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Owned Gear */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚒️ Owned Gear</Text>
              {hero.inventory.craftedGear.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No gear crafted yet. Visit the Forge to craft equipment!
                  </Text>
                </View>
              ) : (
                hero.inventory.craftedGear.map((gearId) => {
                  const gearDef = GEAR[gearId];
                  if (!gearDef) return null;

                  const isEquipped = hero.gear[gearDef.type] === gearId;

                  return (
                    <View key={gearId} style={styles.gearRow}>
                      <View style={styles.gearInfo}>
                        <Text style={styles.gearName}>{gearDef.name}</Text>
                        <Text style={styles.gearType}>
                          {gearDef.type.charAt(0).toUpperCase() + gearDef.type.slice(1)}
                        </Text>
                        <Text style={styles.gearStats}>{statSummary(gearDef)}</Text>
                      </View>

                      {isEquipped ? (
                        <View style={styles.equippedBadge}>
                          <Text style={styles.equippedBadgeText}>Equipped</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.equipBtn}
                          onPress={() => handleEquip(gearDef)}
                        >
                          <Text style={styles.equipBtnText}>Equip</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2: SHOP & BAG
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'shop' && (
          <View style={styles.tabContent}>
            {/* Gold balance banner */}
            <View style={styles.goldBanner}>
              <View style={styles.goldBannerLeft}>
                <Text style={styles.goldBannerTitle}>Apothecary Supplies</Text>
                <Text style={styles.goldBannerSub}>Stock up before diving into dungeons</Text>
              </View>
              <View style={styles.goldBadge}>
                <Text style={styles.goldBadgeIcon}>💰</Text>
                <Text style={styles.goldBadgeText}>{hero.gold}g</Text>
              </View>
            </View>

            {/* Owned consumables */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎒 Pack Bag</Text>
              {hero.inventory.consumables.length === 0 || !hero.inventory.consumables.some(c => c.quantity > 0) ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No consumables in your bag. Purchase some below!
                  </Text>
                </View>
              ) : (
                hero.inventory.consumables
                  .filter(c => c.quantity > 0)
                  .map((entry) => {
                    const def = CONSUMABLES.find((c) => c.id === entry.id);
                    const icon = CONSUMABLE_ICONS[entry.id] || '🧪';
                    return (
                      <View key={entry.id} style={styles.consumableRow}>
                        <Text style={styles.consumableIcon}>{icon}</Text>
                        <View style={styles.consumableInfo}>
                          <Text style={styles.consumableName}>
                            {def?.name || entry.id}
                          </Text>
                          <Text style={styles.consumableDesc} numberOfLines={1}>
                            {def?.description || ''}
                          </Text>
                        </View>
                        <Text style={styles.consumableQty}>×{entry.quantity}</Text>
                      </View>
                    );
                  })
              )}
            </View>

            {/* Shop items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🧪 Camp Shop</Text>
              <View style={styles.shopGrid}>
                {CONSUMABLES.map((item) => {
                  const owned = consumableInventory[item.id] || 0;
                  const canAfford = hero.gold >= item.cost;
                  const icon = CONSUMABLE_ICONS[item.id] || '🧪';

                  return (
                    <View key={item.id} style={styles.shopRow}>
                      <View style={styles.shopRowLeft}>
                        <Text style={styles.shopRowIcon}>{icon}</Text>
                        <View style={styles.shopRowInfo}>
                          <View style={styles.shopNameRow}>
                            <Text style={styles.shopRowName}>{item.name}</Text>
                            {owned > 0 && (
                              <View style={styles.shopOwnedPill}>
                                <Text style={styles.shopOwnedPillText}>×{owned}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.shopRowDesc}>{item.description}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled]}
                        activeOpacity={0.7}
                        disabled={!canAfford}
                        onPress={() => handleBuy(item)}
                      >
                        <Text style={[styles.buyBtnText, !canAfford && styles.buyBtnTextDisabled]}>
                          💰 {item.cost}g
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// Tiny sub-component — a single stat badge in the stats grid
// ============================================================================
function StatBadge({ label, value }) {
  return (
    <View style={styles.statBadge}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

// ============================================================================
// Styles — modern dark glassmorphic aesthetic
// ============================================================================
const styles = StyleSheet.create({
  /* ═══ Root & Layout ════════════════════════════════════════════════════════ */
  root: {
    flex: 1,
    backgroundColor: '#0E0E14',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 60,
  },

  /* ═══ Header ═══════════════════════════════════════════════════════════════ */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backBtn: {
    width: 60,
    paddingVertical: 6,
  },
  backText: {
    color: '#D4A754',
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 15,
  },
  title: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 20,
    color: '#FFF5E6',
    textAlign: 'center',
  },
  backBtnPlaceholder: {
    width: 60,
  },

  /* ═══ Tab Switcher ═════════════════════════════════════════════════════════ */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(212, 167, 84, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.25)',
  },
  tabButtonText: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  tabButtonTextActive: {
    color: '#D4A754',
  },
  tabContent: {
    marginTop: 12,
  },

  /* ═══ Gear slots ═══════════════════════════════════════════════════════════ */
  slotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  slotCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'center',
  },
  slotCardEquipped: {
    borderColor: 'rgba(212, 167, 84, 0.35)',
    borderWidth: 1.5,
    backgroundColor: 'rgba(212, 167, 84, 0.03)',
    shadowColor: '#D4A754',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  slotEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  slotLabel: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.25)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  slotEmpty: {
    fontFamily: 'System',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.2)',
    fontStyle: 'italic',
  },
  slotName: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#FFF5E6',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  slotStats: {
    fontFamily: 'System',
    fontSize: 9,
    color: '#D4A754',
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 12,
  },

  /* ═══ Sections ═════════════════════════════════════════════════════════════ */
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 15,
    color: '#D4A754',
    marginBottom: 10,
    letterSpacing: 0.3,
  },

  /* ═══ Stats Grid ═══════════════════════════════════════════════════════════ */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    width: (Dimensions.get('window').width - 64) / 5,
  },
  statLabel: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.3)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#FFF5E6',
    fontWeight: 'bold',
  },

  /* ═══ Set bonuses ══════════════════════════════════════════════════════════ */
  setBonusCard: {
    backgroundColor: 'rgba(212, 167, 84, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  setBonusName: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#D4A754',
    fontWeight: 'bold',
  },
  setBonusDesc: {
    fontFamily: 'System',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
    lineHeight: 15,
  },

  /* ═══ Owned Gear Row ═══════════════════════════════════════════════════════ */
  gearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  gearInfo: {
    flex: 1,
  },
  gearName: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#FFF5E6',
    fontWeight: 'bold',
  },
  gearType: {
    fontFamily: 'System',
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  gearStats: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#D4A754',
    marginTop: 4,
  },
  equipBtn: {
    backgroundColor: '#D4A754',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  equipBtnText: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#1A1200',
    fontWeight: 'bold',
  },
  equippedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  equippedBadgeText: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: 'bold',
  },

  /* ═══ Tab 2: Gold Banner ═══════════════════════════════════════════════════ */
  goldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  goldBannerLeft: {
    flex: 1,
  },
  goldBannerTitle: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF5E6',
  },
  goldBannerSub: {
    fontFamily: 'System',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 2,
  },
  goldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 12,
  },
  goldBadgeIcon: {
    fontSize: 14,
  },
  goldBadgeText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
  },

  /* ═══ Consumable Rows ══════════════════════════════════════════════════════ */
  consumableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  consumableIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  consumableInfo: {
    flex: 1,
  },
  consumableName: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#FFF5E6',
    fontWeight: 'bold',
  },
  consumableDesc: {
    fontFamily: 'System',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 2,
  },
  consumableQty: {
    fontFamily: 'System',
    fontSize: 18,
    color: '#D4A754',
    fontWeight: 'bold',
    marginLeft: 12,
  },

  /* ═══ Shop Rows ════════════════════════════════════════════════════════════ */
  shopGrid: {
    gap: 8,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 14,
  },
  shopRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  shopRowIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  shopRowInfo: {
    flex: 1,
  },
  shopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shopRowName: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#FFF5E6',
    fontWeight: 'bold',
  },
  shopOwnedPill: {
    backgroundColor: 'rgba(212, 167, 84, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  shopOwnedPillText: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#D4A754',
  },
  shopRowDesc: {
    fontFamily: 'System',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 3,
    lineHeight: 14,
  },
  buyBtn: {
    backgroundColor: 'rgba(212, 167, 84, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.25)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  buyBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  buyBtnText: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D4A754',
  },
  buyBtnTextDisabled: {
    color: 'rgba(255, 255, 255, 0.15)',
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
