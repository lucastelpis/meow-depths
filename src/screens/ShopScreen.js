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

  return (
    <SafeAreaView style={styles.root}>
      {/* Background with subtle top radial gradient glow */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="topGlow" cx="50%" cy="0%" rx="80%" ry="45%">
            <Stop offset="0%" stopColor="#10B981" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#07070A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="#07070A" />
        <Rect width="100%" height="100%" fill="url(#topGlow)" />
      </Svg>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← Hub</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🛒 Town Shop</Text>
        <View style={[styles.goldBadge, theme.SHADOWS.glowPrimary]}>
          <Text style={styles.goldBadgeIcon}>💰</Text>
          <Text style={styles.goldBadgeText}>{hero.gold}g</Text>
        </View>
      </View>

      {/* ── Crystals Inventory Bar (Crystal Vault) ────────────────────────── */}
      <View style={styles.materialsSection}>
        <Text style={styles.materialsLabel}>Crystal Vault</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.materialsScroll}>
          {ownedMaterialList.length === 0 ? (
            <Text style={styles.emptyMaterials}>Vault is empty — conquer dungeons to collect crystals!</Text>
          ) : (
            ownedMaterialList.map(mat => (
              <View key={mat.id} style={styles.materialChip}>
                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                  <Rect width="100%" height="100%" fill="rgba(255,255,255,0.02)" rx={8} />
                  <Rect x="1" y="1" width="98%" height="98%" rx={7} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                </Svg>
                <View style={styles.materialChipInner}>
                  <Text style={styles.materialEmoji}>{getCrystalEmoji(mat.id)}</Text>
                  <Text style={styles.materialName}>{mat.name}</Text>
                  <Text style={styles.materialQty}>×{mat.qty}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* ── Segmented Tab Switcher ────────────────────────────────────────── */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={styles.tabButton}
          activeOpacity={0.8}
          onPress={() => setActiveTab('supplies')}
        >
          {activeTab === 'supplies' && (
            <View style={StyleSheet.absoluteFill}>
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient id="activeTabGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#1C2E24" />
                    <Stop offset="100%" stopColor="#0B130E" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#activeTabGrad)" rx={10} />
                <Rect width="100%" height="100%" fill="none" stroke="rgba(16, 185, 129, 0.25)" strokeWidth={1} rx={10} />
              </Svg>
            </View>
          )}
          <Text style={[styles.tabButtonText, activeTab === 'supplies' && styles.tabButtonTextActive, activeTab === 'supplies' && { color: '#10B981' }]}>
            🧪 Apothecary
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          activeOpacity={0.8}
          onPress={() => setActiveTab('armory')}
        >
          {activeTab === 'armory' && (
            <View style={StyleSheet.absoluteFill}>
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient id="activeTabGrad2" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#2D2312" />
                    <Stop offset="100%" stopColor="#140F08" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#activeTabGrad2)" rx={10} />
                <Rect width="100%" height="100%" fill="none" stroke="rgba(212, 167, 84, 0.25)" strokeWidth={1} rx={10} />
              </Svg>
            </View>
          )}
          <Text style={[styles.tabButtonText, activeTab === 'armory' && styles.tabButtonTextActive, activeTab === 'armory' && { color: '#D4A754' }]}>
            ⚒️ Equipment Forge
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
              <Text style={styles.introTitle}>Apothecary & Provisions</Text>
              <Text style={styles.introDesc}>Purchase healing reagents and items to aid your dungeon runs.</Text>
            </View>

            <View style={styles.listContainer}>
              {CONSUMABLES.map((item) => {
                const owned = consumableCounts[item.id] || 0;
                const canAfford = hero.gold >= item.cost;
                const icon = CONSUMABLE_ICONS[item.id] || '🧪';

                return (
                  <View key={item.id} style={styles.shopRow}>
                    <View style={StyleSheet.absoluteFill}>
                      <Svg width="100%" height="100%">
                        <Rect width="100%" height="100%" fill="rgba(255,255,255,0.02)" rx={14} />
                        <Rect x="1" y="1" width="98%" height="98%" rx={13} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                      </Svg>
                    </View>

                    <View style={styles.shopRowInner}>
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

                      <TouchableOpacity
                        style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled]}
                        activeOpacity={0.7}
                        disabled={!canAfford}
                        onPress={() => handleBuySupplies(item)}
                      >
                        {canAfford && (
                          <View style={StyleSheet.absoluteFill}>
                            <Svg width="100%" height="100%">
                              <Defs>
                                <LinearGradient id={`buyBtnGrad_${item.id}`} x1="0" y1="0" x2="1" y2="0">
                                  <Stop offset="0%" stopColor="#10B981" />
                                  <Stop offset="100%" stopColor="#059669" />
                                </LinearGradient>
                              </Defs>
                              <Rect width="100%" height="100%" fill={`url(#buyBtnGrad_${item.id})`} rx={10} />
                            </Svg>
                          </View>
                        )}
                        <Text style={[styles.buyBtnText, !canAfford && styles.buyBtnTextDisabled, canAfford && { color: '#031E12' }]}>
                          💰 {item.cost}g
                        </Text>
                      </TouchableOpacity>
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
                        <View key={gear.id} style={[styles.gearCard, craftable && !isCrafted && theme.SHADOWS.glowPrimary]}>
                          {/* Blueprint Gradient Background */}
                          <View style={StyleSheet.absoluteFill}>
                            <Svg width="100%" height="100%">
                              <Defs>
                                <LinearGradient id={`blueGrad_${gear.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <Stop offset="0%" stopColor="#0E1624" />
                                  <Stop offset="100%" stopColor="#070A0F" />
                                </LinearGradient>
                                {craftable && !isCrafted && (
                                  <LinearGradient id={`goldBorder_${gear.id}`} x1="0" y1="0" x2="1" y2="1">
                                    <Stop offset="0%" stopColor="#F9D99A" />
                                    <Stop offset="100%" stopColor="#D4A754" />
                                  </LinearGradient>
                                )}
                              </Defs>
                              <Rect width="100%" height="100%" fill={`url(#blueGrad_${gear.id})`} rx={14} />
                              <Rect
                                x="1"
                                y="1"
                                width="98%"
                                height="98%"
                                rx={13}
                                fill="none"
                                stroke={isCrafted ? 'rgba(16, 185, 129, 0.2)' : (craftable ? `url(#goldBorder_${gear.id})` : 'rgba(255,255,255,0.05)')}
                                strokeWidth={craftable && !isCrafted ? 1.5 : 1}
                              />
                            </Svg>
                          </View>

                          <View style={styles.gearCardInner}>
                            <View style={styles.cardHeader}>
                              <View style={styles.cardHeaderTitleRow}>
                                <View style={styles.gearIconWrapper}>
                                  <Text style={styles.gearIcon}>{typeIcon}</Text>
                                </View>
                                <View>
                                  <Text style={styles.gearName}>{gear.name}</Text>
                                  <Text style={styles.gearType}>
                                    {gear.type.toUpperCase()}
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
                            <Text style={styles.statPreview}>🛡️ {formatStats(gear.stats)}</Text>

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
                                    <Text style={styles.checkIndicator}>{enough ? ' ✓' : ' ✗'}</Text>
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
                                {craftable && (
                                  <View style={StyleSheet.absoluteFill}>
                                    <Svg width="100%" height="100%">
                                      <Defs>
                                        <LinearGradient id={`forgeBtnGrad_${gear.id}`} x1="0" y1="0" x2="1" y2="0">
                                          <Stop offset="0%" stopColor="#F9D99A" />
                                          <Stop offset="100%" stopColor="#D4A754" />
                                        </LinearGradient>
                                      </Defs>
                                      <Rect width="100%" height="100%" fill={`url(#forgeBtnGrad_${gear.id})`} rx={10} />
                                    </Svg>
                                  </View>
                                )}
                                <Text
                                  style={[
                                    styles.forgeBtnText,
                                    !craftable && styles.forgeBtnTextDisabled,
                                    craftable && { color: '#1A1200' },
                                  ]}
                                >
                                  Forge Equipment
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
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
    flex: 1,
    textAlign: 'center',
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    width: 80,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  materialsLabel: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '900',
    color: '#707F94',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  materialsScroll: {
    flexDirection: 'row',
  },
  emptyMaterials: {
    fontFamily: 'System',
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
    fontFamily: 'System',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginRight: 8,
  },
  materialQty: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#D4A754',
    fontWeight: 'bold',
  },

  /* ── Tab Switcher ────────────────────────────────────────── */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  tabButtonText: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.35)',
    zIndex: 2,
  },
  tabButtonTextActive: {
    fontWeight: '800',
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
    color: '#F8FAFC',
  },
  introDesc: {
    fontFamily: 'System',
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
    fontFamily: 'System',
    fontSize: 15,
    color: '#F8FAFC',
    fontWeight: 'bold',
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
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#10B981',
  },
  shopRowDesc: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#707F94',
    marginTop: 4,
    lineHeight: 15,
  },
  buyBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 84,
    overflow: 'hidden',
  },
  buyBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  buyBtnText: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: 'bold',
    zIndex: 2,
  },
  buyBtnTextDisabled: {
    color: 'rgba(255, 255, 255, 0.15)',
  },

  /* ── Armory Tab Styles ───────────────────────────────────── */
  zoneSection: {
    marginTop: 18,
  },
  zoneHeader: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: '800',
    color: '#D4A754',
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  gearCard: {
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  gearCardInner: {
    padding: 14,
    zIndex: 2,
  },
  gearIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
    fontSize: 15,
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  gearType: {
    fontFamily: 'System',
    fontSize: 9,
    color: '#707F94',
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  craftedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  craftedBadgeText: {
    fontFamily: 'System',
    fontSize: 9,
    color: '#10B981',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statPreview: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#10B981',
    marginBottom: 12,
    fontWeight: '600',
  },
  materialsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  materialReqChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  materialReqEmoji: {
    fontSize: 11,
    marginRight: 4,
  },
  materialReqText: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '600',
  },
  checkIndicator: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: 'bold',
  },
  matEnough: {
    borderColor: 'rgba(16, 185, 129, 0.2)',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
  },
  matShort: {
    borderColor: 'rgba(239, 68, 68, 0.2)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  matTextEnough: {
    color: '#10B981',
  },
  matTextShort: {
    color: '#EF4444',
  },
  forgeBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  forgeBtnActive: {
    backgroundColor: '#D4A754',
  },
  forgeBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  forgeBtnText: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#1A1200',
    fontWeight: 'bold',
    zIndex: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  forgeBtnTextDisabled: {
    color: 'rgba(255, 255, 255, 0.2)',
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
    fontFamily: 'System',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.25)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
