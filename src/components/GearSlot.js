/**
 * GearSlot.js — Displays an individual gear slot (weapon, armor, or trinket).
 *
 * Used in the InventoryScreen to show what's equipped in each slot.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import theme from '../constants/theme';
import { GEAR } from '../data/gear';

// Emoji icons for each slot type
const SLOT_ICONS = {
  weapon: '⚔️',
  armor: '🛡️',
  trinket: '💎',
};

/**
 * @param {Object} props
 * @param {'weapon'|'armor'|'trinket'} props.slotType — which slot this represents
 * @param {string|null} props.gearId — the id of the equipped gear, or null
 * @param {Function} props.onPress — called when the slot is tapped
 */
export default function GearSlot({ slotType, gearId, onPress }) {
  const gearDef = gearId ? GEAR[gearId] : null;
  const icon = SLOT_ICONS[slotType] || '❓';
  const slotLabel = slotType.charAt(0).toUpperCase() + slotType.slice(1);

  return (
    <TouchableOpacity
      style={[styles.container, gearDef && styles.equippedContainer]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Slot type label */}
      <Text style={styles.slotLabel}>{icon} {slotLabel}</Text>

      {gearDef ? (
        /* Equipped gear info */
        <View>
          <Text style={styles.gearName}>{gearDef.name}</Text>
          <Text style={styles.gearStats}>
            {formatStats(gearDef.stats)}
          </Text>
        </View>
      ) : (
        /* Empty slot */
        <Text style={styles.emptyText}>Empty</Text>
      )}
    </TouchableOpacity>
  );
}

/**
 * Format a stats object into a readable string.
 * E.g. { attack: 12, bleedChance: 0.15 } → "+12 ATK, 15% bleed"
 */
function formatStats(stats) {
  if (!stats) return '';
  const parts = [];
  if (stats.attack) parts.push(`+${stats.attack} ATK`);
  if (stats.defence) parts.push(`+${stats.defence} DEF`);
  if (stats.maxHp) parts.push(`+${stats.maxHp} HP`);
  if (stats.critChance) parts.push(`+${Math.round(stats.critChance * 100)}% CRIT`);
  if (stats.dodge) parts.push(`+${Math.round(stats.dodge * 100)}% DODGE`);
  if (stats.bleedChance) parts.push(`${Math.round(stats.bleedChance * 100)}% bleed`);
  if (stats.poisonChance) parts.push(`${Math.round(stats.poisonChance * 100)}% poison`);
  if (stats.stunChance) parts.push(`${Math.round(stats.stunChance * 100)}% stun`);
  if (stats.poisonImmune) parts.push('Bleed immune');
  if (stats.skillDamage) parts.push(`+${Math.round(stats.skillDamage * 100)}% skill dmg`);
  if (stats.bleedExtraDamage) parts.push(`+${stats.bleedExtraDamage} bleed dmg`);
  return parts.join(', ');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(30, 25, 15, 0.7)',
    borderRadius: theme.BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(60, 50, 30, 0.5)',
    padding: theme.SPACING.sm,
    marginHorizontal: 3,
    minHeight: 80,
  },
  equippedContainer: {
    borderColor: theme.COLORS.primary,
    backgroundColor: 'rgba(40, 35, 20, 0.8)',
    shadowColor: theme.COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  slotLabel: {
    color: theme.COLORS.textDim,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  gearName: {
    color: theme.COLORS.primary,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  gearStats: {
    color: theme.COLORS.textDim,
    fontSize: 10,
  },
  emptyText: {
    color: 'rgba(139, 125, 107, 0.5)',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});
