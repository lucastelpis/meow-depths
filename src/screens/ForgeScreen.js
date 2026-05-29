/**
 * ForgeScreen.js — Meow Depths Crafting Screen
 *
 * Lets the player browse all craftable gear grouped by dungeon zone, see
 * material requirements vs. owned quantities, preview stat bonuses, and
 * craft items when they have sufficient resources.
 *
 * State interactions:
 *   READ  – state.hero.inventory.materials     (owned material quantities)
 *   READ  – state.hero.inventory.craftedGear   (already crafted item ids)
 *   WRITE – dispatch CRAFT_GEAR { gearId, materials, goldCost }
 */

import React, { useMemo } from 'react';
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

import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { GEAR, MATERIALS, SET_BONUSES, getGearByZone } from '../data/gear';

// ─── Icon helpers ────────────────────────────────────────────────────────────

/** Return a type emoji for gear cards. */
const GEAR_TYPE_ICONS = { weapon: '⚔️', armor: '🛡️', trinket: '💎' };

/** Zone display names used as section headers. */
const ZONE_LABELS = {
  1: '🐀  Zone 1 — Soggy Sewers',
  2: '🌿  Zone 2 — Twisted Garden',
  3: '⚓  Zone 3 — Sunken Docks',
};

// ─── Stat formatting ────────────────────────────────────────────────────────

/**
 * Turn a gear's `stats` object into a human-readable string.
 * Percentages (critChance, dodge, bleedChance, …) are shown as "15%".
 * Flat numbers (attack, maxHp, defence) are shown with a "+" prefix.
 *
 * @param {Object} stats – e.g. { attack: 12, bleedChance: 0.15 }
 * @returns {string} – e.g. "+12 ATK, 15% bleed"
 */
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
      // Boolean flags like poisonImmune
      if (typeof value === 'boolean') return `✓ ${label}`;
      // Values ≤ 1 are treated as percentages (0.15 → "15%")
      if (value > 0 && value <= 1) return `${Math.round(value * 100)}% ${label}`;
      return `+${value} ${label}`;
    })
    .join(', ');
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ForgeScreen() {
  const navigation = useNavigation();
  const { state, dispatch } = useGame();

  const ownedMaterials = state.hero.inventory.materials;
  const craftedGear    = state.hero.inventory.craftedGear;

  // ── Build zone-grouped gear lists (memoised for perf) ────────────────────
  const gearByZone = useMemo(
    () => [1, 2, 3].map(zone => ({
      zone,
      label: ZONE_LABELS[zone],
      items: getGearByZone(zone),
    })),
    [],
  );

  // ── Collect materials the player actually owns for the top bar ───────────
  const ownedMaterialList = useMemo(() => {
    return Object.entries(ownedMaterials)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({
        id,
        name: MATERIALS[id]?.name || id,
        qty,
      }));
  }, [ownedMaterials]);

  // ── Can the player craft a specific gear piece? ──────────────────────────
  function canCraft(gearDef) {
    return gearDef.materials.every(
      ({ itemId, qty }) => (ownedMaterials[itemId] || 0) >= qty,
    );
  }

  // ── Perform crafting ─────────────────────────────────────────────────────
  function handleCraft(gearDef) {
    // Build materials cost map: { itemId: qty, … }
    const materialCosts = {};
    gearDef.materials.forEach(({ itemId, qty }) => {
      materialCosts[itemId] = qty;
    });

    Alert.alert(
      'Craft Item',
      `Forge "${gearDef.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Craft',
          onPress: () =>
            dispatch({
              type: 'CRAFT_GEAR',
              payload: {
                gearId: gearDef.id,
                materials: materialCosts,
                goldCost: 0,
              },
            }),
        },
      ],
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>⚒️ Forge</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Materials bar (horizontal scroll) ──────────────────────────── */}
      <View style={styles.materialsSection}>
        <Text style={styles.materialsLabel}>Materials</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.materialsScroll}>
          {ownedMaterialList.length === 0 && (
            <Text style={styles.emptyMaterials}>No materials yet — defeat enemies to collect!</Text>
          )}
          {ownedMaterialList.map(mat => (
            <View key={mat.id} style={styles.materialChip}>
              <Text style={styles.materialName}>{mat.name}</Text>
              <Text style={styles.materialQty}>×{mat.qty}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* ── Gear list (grouped by zone) ────────────────────────────────── */}
      <ScrollView style={styles.gearList} contentContainerStyle={styles.gearListContent}>
        {gearByZone.map(({ zone, label, items }) => (
          <View key={zone} style={styles.zoneSection}>
            {/* Zone header */}
            <Text style={styles.zoneHeader}>{label}</Text>

            {items.map(gear => {
              const isCrafted  = craftedGear.includes(gear.id);
              const craftable   = canCraft(gear);
              const setDef      = gear.setId ? SET_BONUSES[gear.setId] : null;
              const typeIcon    = GEAR_TYPE_ICONS[gear.type] || '📦';

              return (
                <View key={gear.id} style={styles.gearCard}>
                  {/* ── Card header ──────────────────────────────────── */}
                  <View style={styles.cardHeader}>
                    <Text style={styles.gearName}>
                      {typeIcon} {gear.name}
                    </Text>
                    {isCrafted && <Text style={styles.craftedBadge}>✅</Text>}
                  </View>

                  {/* ── Stat preview ─────────────────────────────────── */}
                  <Text style={styles.statPreview}>{formatStats(gear.stats)}</Text>

                  {/* ── Material requirements ────────────────────────── */}
                  <View style={styles.materialsRow}>
                    {gear.materials.map(({ itemId, qty }) => {
                      const owned = ownedMaterials[itemId] || 0;
                      const enough = owned >= qty;
                      return (
                        <Text
                          key={itemId}
                          style={[styles.materialReq, enough ? styles.matEnough : styles.matShort]}
                        >
                          {MATERIALS[itemId]?.name || itemId}: {owned}/{qty}
                        </Text>
                      );
                    })}
                  </View>

                  {/* ── Set bonus label ──────────────────────────────── */}
                  {setDef && (
                    <Text style={styles.setLabel}>
                      🔗 {setDef.name}: {setDef.bonus}
                    </Text>
                  )}

                  {/* ── Craft button / Crafted badge ─────────────────── */}
                  {!isCrafted && (
                    <TouchableOpacity
                      style={[
                        styles.craftBtn,
                        craftable ? styles.craftBtnActive : styles.craftBtnDisabled,
                      ]}
                      disabled={!craftable}
                      onPress={() => handleCraft(gear)}
                    >
                      <Text
                        style={[
                          styles.craftBtnText,
                          !craftable && styles.craftBtnTextDisabled,
                        ]}
                      >
                        {craftable ? 'Craft' : 'Need Materials'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  /* ── Layout ──────────────────────────────────────────────── */
  container: {
    flex: 1,
    backgroundColor: theme.COLORS.campBackground,
  },

  /* ── Header ──────────────────────────────────────────────── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.SPACING.md,
    paddingVertical: theme.SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.COLORS.cardBorder,
  },
  backBtn: {
    paddingVertical: theme.SPACING.xs,
    paddingRight: theme.SPACING.sm,
  },
  backText: {
    ...theme.FONTS.body,
    color: theme.COLORS.primary,
  },
  title: {
    ...theme.FONTS.title,
    color: theme.COLORS.textBright,
  },
  headerSpacer: {
    width: 60, // balance the back button width
  },

  /* ── Materials bar ───────────────────────────────────────── */
  materialsSection: {
    paddingHorizontal: theme.SPACING.md,
    paddingTop: theme.SPACING.sm,
    paddingBottom: theme.SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.COLORS.cardBorder,
  },
  materialsLabel: {
    ...theme.FONTS.small,
    color: theme.COLORS.textDim,
    marginBottom: theme.SPACING.xs,
  },
  materialsScroll: {
    flexDirection: 'row',
  },
  emptyMaterials: {
    ...theme.FONTS.small,
    color: theme.COLORS.textDim,
    fontStyle: 'italic',
  },
  materialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.COLORS.cardBg,
    borderRadius: theme.BORDER_RADIUS.sm,
    paddingHorizontal: theme.SPACING.sm,
    paddingVertical: theme.SPACING.xs,
    marginRight: theme.SPACING.sm,
    borderWidth: 1,
    borderColor: theme.COLORS.cardBorder,
  },
  materialName: {
    ...theme.FONTS.small,
    color: theme.COLORS.text,
    marginRight: theme.SPACING.xs,
  },
  materialQty: {
    ...theme.FONTS.small,
    color: theme.COLORS.primary,
    fontWeight: 'bold',
  },

  /* ── Gear list ───────────────────────────────────────────── */
  gearList: {
    flex: 1,
  },
  gearListContent: {
    paddingHorizontal: theme.SPACING.md,
    paddingBottom: theme.SPACING.xl,
  },

  /* ── Zone sections ───────────────────────────────────────── */
  zoneSection: {
    marginTop: theme.SPACING.lg,
  },
  zoneHeader: {
    ...theme.FONTS.heading,
    color: theme.COLORS.primary,
    marginBottom: theme.SPACING.sm,
  },

  /* ── Gear card ───────────────────────────────────────────── */
  gearCard: {
    backgroundColor: theme.COLORS.cardBg,
    borderRadius: theme.BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: theme.COLORS.cardBorder,
    padding: theme.SPACING.md,
    marginBottom: theme.SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.SPACING.xs,
  },
  gearName: {
    ...theme.FONTS.body,
    color: theme.COLORS.textBright,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  craftedBadge: {
    fontSize: 20,
    marginLeft: theme.SPACING.sm,
  },

  /* ── Stats ───────────────────────────────────────────────── */
  statPreview: {
    ...theme.FONTS.small,
    color: theme.COLORS.success,
    marginBottom: theme.SPACING.sm,
  },

  /* ── Material requirements ───────────────────────────────── */
  materialsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.SPACING.sm,
    marginBottom: theme.SPACING.sm,
  },
  materialReq: {
    ...theme.FONTS.tiny,
    paddingHorizontal: theme.SPACING.xs,
    paddingVertical: 2,
    borderRadius: theme.BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  matEnough: {
    color: theme.COLORS.success,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  matShort: {
    color: theme.COLORS.danger,
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
  },

  /* ── Set bonus label ─────────────────────────────────────── */
  setLabel: {
    ...theme.FONTS.tiny,
    color: theme.COLORS.xp,
    fontStyle: 'italic',
    marginBottom: theme.SPACING.sm,
  },

  /* ── Craft button ────────────────────────────────────────── */
  craftBtn: {
    borderRadius: theme.BORDER_RADIUS.md,
    paddingVertical: theme.SPACING.sm,
    alignItems: 'center',
  },
  craftBtnActive: {
    backgroundColor: theme.COLORS.buttonPrimary,
  },
  craftBtnDisabled: {
    backgroundColor: theme.COLORS.buttonDisabled,
  },
  craftBtnText: {
    ...theme.FONTS.body,
    color: '#1A1200',
    fontWeight: 'bold',
  },
  craftBtnTextDisabled: {
    color: theme.COLORS.textDim,
  },
});
