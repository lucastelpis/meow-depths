/**
 * =============================================================================
 * ShopScreen.js — Meow Depths Town Shop (Supplies & Armory)
 * =============================================================================
 *
 * This screen consolidates the items shop (supplies bought with Gold) and
 * the equipment forge (armory forged with dungeon crystals).
 *
 * It features:
 *   - A crystal balance bar at the top displaying owned crystals/shards/cores.
 *   - A tab switcher: "Supplies" vs. "Armory".
 *   - Supplies tab: Buy potions/vials/lootboxes using gold, showing owned counts.
 *   - Armory tab: Forge weapons, armors, and trinkets using crystal materials,
 *     grouped by zone.
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
import { GEAR, CONSUMABLES, MATERIALS, getGearByZone } from '../data/gear';
import { ZONES } from '../data/zones';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Metadata & Icons ────────────────────────────────────────────────────────
const GEAR_TYPE_ICONS = { weapon: '⚔️', armor: '🛡️', trinket: '💎' };

const ZONE_LABELS = {
  1: '🐀 Zone 1 — Soggy Sewers (Black Crystals)',
  2: '🌿 Zone 2 — Twisted Garden (Green Crystals)',
  3: '⚓ Zone 3 — Sunken Docks (Yellow Crystals)',
};

const CONSUMABLE_ICONS = {
  health_potion: '🧪',
  mega_potion: '💊',
  antidote: '🌿',
  smoke_vial: '💨',
  mystery_chest: '🎁',
};

// Return emoji based on crystal type
function getCrystalEmoji(id) {
  if (id.startsWith('black')) {
    if (id.includes('shard')) return '🖤';
    if (id.includes('small')) return '⚫';
    if (id.includes('big')) return '◼️';
    return '🌀';
  }
  if (id.startsWith('green')) {
    if (id.includes('shard')) return '💚';
    if (id.includes('small')) return '🟢';
    if (id.includes('big')) return '🟩';
    return '🌟';
  }
  if (id.startsWith('yellow')) {
    if (id.includes('shard')) return '💛';
    if (id.includes('small')) return '🟡';
    if (id.includes('big')) return '🟨';
    return '✨';
  }
  return '💎';
}

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
  };

  return Object.entries(stats)
    .filter(([, v]) => v !== null && v !== undefined && v !== false)
    .map(([key, value]) => {
      const label = STAT_LABELS[key] || key;
      if (typeof value === 'boolean') return `✓ ${label}`;
      if (value > 0 && value <= 1) return `${Math.round(value * 100)}% ${label}`;
      return `+${value} ${label}`;
    })
    .join(', ');
}

// =============================================================================
// Component
// =============================================================================
export default function ShopScreen() {
  const navigation = useNavigation();
  const { state, dispatch } = useGame();
  const { hero } = state;

  const [activeTab, setActiveTab] = useState('supplies'); // 'supplies' | 'armory'

  const ownedMaterials = hero.inventory.materials || {};
  const craftedGear    = hero.inventory.craftedGear || [];

  // ── Build zone-grouped gear lists ──────────────────────────────────────────
  const gearByZone = useMemo(
    () => [1, 2, 3].map(zone => ({
      zone,
      label: ZONE_LABELS[zone],
      items: getGearByZone(zone),
    })),
    [],
  );

  // ── Collect materials the player actually owns for the top bar ─────────────
  const ownedMaterialList = useMemo(() => {
    return Object.entries(ownedMaterials)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({
        id,
        name: MATERIALS[id]?.name || id,
        qty,
      }));
  }, [ownedMaterials]);

  // ── Consumables inventory counts ────────────────────────────────────────────
  const consumableCounts = useMemo(() => {
    const counts = {};
    (hero.inventory?.consumables || []).forEach(c => {
      counts[c.id] = c.quantity;
    });
    return counts;
  }, [hero.inventory?.consumables]);

  // ── Can the player craft a specific gear piece? ────────────────────────────
  const canCraft = (gearDef) => {
    return gearDef.materials.every(
      ({ itemId, qty }) => (ownedMaterials[itemId] || 0) >= qty,
    );
  };

  // ── Supplies: purchase handler ─────────────────────────────────────────────
  const handleBuySupplies = (item) => {
    if (hero.gold < item.cost) {
      Alert.alert('Insufficient Gold', "You don't have enough gold for this purchase.");
      return;
    }

    Alert.alert(
      'Purchase Supplies',
      `Buy 1 ${item.name} for 💰 ${item.cost} gold?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: () => {
            dispatch({
              type: 'BUY_CONSUMABLE',
              payload: { consumableId: item.id, price: item.cost },
            });
          },
        },
      ]
    );
  };

  // ── Armory: craft/forge handler ────────────────────────────────────────────
  const handleForgeGear = (gearDef) => {
    // Build materials cost map: { itemId: qty }
    const materialCosts = {};
    gearDef.materials.forEach(({ itemId, qty }) => {
      materialCosts[itemId] = qty;
    });

    Alert.alert(
      'Forge Equipment',
      `Craft "${gearDef.name}" using your crystals?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forge',
          onPress: () => {
            dispatch({
              type: 'CRAFT_GEAR',
              payload: {
                gearId: gearDef.id,
                materials: materialCosts,
                goldCost: 0,
              },
            });
          },
        },
      ]
    );
  };

  // ===========================================================================
  // Render
  // ===========================================================================
  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Hub</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🛒 Town Shop</Text>
        <View style={styles.goldBadge}>
          <Text style={styles.goldBadgeIcon}>💰</Text>
          <Text style={styles.goldBadgeText}>{hero.gold}g</Text>
        </View>
      </View>

      {/* ── Crystals Inventory Bar ────────────────────────────────────────── */}
      <View style={styles.materialsSection}>
        <Text style={styles.materialsLabel}>Crystal Vault</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.materialsScroll}>
          {ownedMaterialList.length === 0 ? (
            <Text style={styles.emptyMaterials}>Vault is empty — conquer dungeons to collect crystals!</Text>
          ) : (
            ownedMaterialList.map(mat => (
              <View key={mat.id} style={styles.materialChip}>
                <Text style={styles.materialEmoji}>{getCrystalEmoji(mat.id)}</Text>
                <Text style={styles.materialName}>{mat.name}</Text>
                <Text style={styles.materialQty}>×{mat.qty}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* ── Segmented Tab Switcher ────────────────────────────────────────── */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'supplies' && styles.tabButtonActive]}
          activeOpacity={0.8}
          onPress={() => setActiveTab('supplies')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'supplies' && styles.tabButtonTextActive]}>
            🧪 Apothecary Supplies
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'armory' && styles.tabButtonActive]}
          activeOpacity={0.8}
          onPress={() => setActiveTab('armory')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'armory' && styles.tabButtonTextActive]}>
            ⚒️ Equipment Armory
          </Text>
        </TouchableOpacity>
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
              <Text style={styles.introTitle}>Camp Apothecary & Loot</Text>
              <Text style={styles.introDesc}>Buy potions for survivability or buy mystery chests for crystal rolls.</Text>
            </View>

            <View style={styles.listContainer}>
              {CONSUMABLES.map((item) => {
                const owned = consumableCounts[item.id] || 0;
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
                              <Text style={styles.shopOwnedPillText}>Owned: {owned}</Text>
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
                      onPress={() => handleBuySupplies(item)}
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
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            TAB 2: ARMORY (Crystal Crafting)
            ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'armory' && (
          <View style={styles.tabContent}>
            {gearByZone.map(({ zone, label, items }) => {
              const zoneKey = `zone${zone}`;
              const zoneDef = ZONES[zoneKey];
              const unlocked = !zoneDef || !zoneDef.unlockCondition || !!state.progress[zoneDef.unlockCondition];

              return (
                <View key={zone} style={styles.zoneSection}>
                  <Text style={[styles.zoneHeader, !unlocked && styles.zoneHeaderLocked]}>
                    {unlocked ? label : `🔒 ${zoneDef?.name || label} (Locked)`}
                  </Text>

                  {unlocked ? (
                    items.map((gear) => {
                      const isCrafted = craftedGear.includes(gear.id);
                      const craftable = canCraft(gear);
                      const typeIcon  = GEAR_TYPE_ICONS[gear.type] || '📦';

                      return (
                        <View key={gear.id} style={styles.gearCard}>
                          <View style={styles.cardHeader}>
                            <View style={styles.cardHeaderTitleRow}>
                              <Text style={styles.gearIcon}>{typeIcon}</Text>
                              <View>
                                <Text style={styles.gearName}>{gear.name}</Text>
                                <Text style={styles.gearType}>
                                  {gear.type.charAt(0).toUpperCase() + gear.type.slice(1)}
                                </Text>
                              </View>
                            </View>
                            {isCrafted && (
                              <View style={styles.craftedBadge}>
                                <Text style={styles.craftedBadgeText}>FORGED</Text>
                              </View>
                            )}
                          </View>

                          {/* Stats Preview */}
                          <Text style={styles.statPreview}>{formatStats(gear.stats)}</Text>

                          {/* Material requirements */}
                          <View style={styles.materialsRow}>
                            {gear.materials.map(({ itemId, qty }) => {
                              const owned = ownedMaterials[itemId] || 0;
                              const enough = owned >= qty;
                              return (
                                <View
                                  key={itemId}
                                  style={[
                                    styles.materialReqChip,
                                    enough ? styles.matEnough : styles.matShort,
                                  ]}
                                >
                                  <Text style={styles.materialReqEmoji}>
                                    {getCrystalEmoji(itemId)}
                                  </Text>
                                  <Text style={[styles.materialReqText, enough ? styles.matTextEnough : styles.matTextShort]}>
                                    {MATERIALS[itemId]?.name || itemId}: {owned}/{qty}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>

                          {/* Forge Action Button */}
                          {!isCrafted && (
                            <TouchableOpacity
                              style={[
                                styles.forgeBtn,
                                craftable ? styles.forgeBtnActive : styles.forgeBtnDisabled,
                              ]}
                              disabled={!craftable}
                              onPress={() => handleForgeGear(gear)}
                            >
                              <Text
                                style={[
                                  styles.forgeBtnText,
                                  !craftable && styles.forgeBtnTextDisabled,
                                ]}
                              >
                                Forge Equipment
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.lockedZoneCard}>
                      <Text style={styles.lockedZoneText}>
                        {zoneDef?.unlockCondition === 'zone1Cleared'
                          ? 'Defeat the Sewer King in Soggy Sewers to unlock.'
                          : 'Defeat the Rootmother in Twisted Garden to unlock.'}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// Styles — modern dark glassmorphic aesthetic
// =============================================================================
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0E0E14',
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
    flex: 1,
    textAlign: 'center',
  },
  goldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    width: 75,
    justifyContent: 'center',
  },
  goldBadgeIcon: {
    fontSize: 12,
  },
  goldBadgeText: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFD700',
  },

  /* ── Materials Bar ───────────────────────────────────────── */
  materialsSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  materialsLabel: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.3)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  materialsScroll: {
    flexDirection: 'row',
  },
  emptyMaterials: {
    fontFamily: 'System',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.25)',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  materialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  materialEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  materialName: {
    fontFamily: 'System',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    marginRight: 6,
  },
  materialQty: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#D4A754',
    fontWeight: 'bold',
  },

  /* ── Tab Switcher ────────────────────────────────────────── */
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
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  tabButtonTextActive: {
    color: '#D4A754',
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
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF5E6',
  },
  introDesc: {
    fontFamily: 'System',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 2,
  },
  listContainer: {
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
    paddingHorizontal: 6,
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

  /* ── Armory Tab Styles ───────────────────────────────────── */
  zoneSection: {
    marginTop: 16,
  },
  zoneHeader: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D4A754',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  gearCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  gearIcon: {
    fontSize: 22,
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
    marginTop: 1,
  },
  craftedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  craftedBadgeText: {
    fontFamily: 'System',
    fontSize: 9,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  statPreview: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 10,
  },
  materialsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  materialReqChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  materialReqEmoji: {
    fontSize: 10,
    marginRight: 4,
  },
  materialReqText: {
    fontFamily: 'System',
    fontSize: 10,
  },
  matEnough: {
    borderColor: 'rgba(76, 175, 80, 0.2)',
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
  },
  matShort: {
    borderColor: 'rgba(255, 68, 68, 0.2)',
    backgroundColor: 'rgba(255, 68, 68, 0.08)',
  },
  matTextEnough: {
    color: '#4CAF50',
  },
  matTextShort: {
    color: '#FF4444',
  },
  forgeBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgeBtnActive: {
    backgroundColor: '#D4A754',
  },
  forgeBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  forgeBtnText: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#1A1200',
    fontWeight: 'bold',
  },
  forgeBtnTextDisabled: {
    color: 'rgba(255, 255, 255, 0.2)',
  },
  zoneHeaderLocked: {
    color: 'rgba(255, 255, 255, 0.25)',
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
    fontFamily: 'System',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.25)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
