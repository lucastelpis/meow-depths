/**
 * CombatBar.js — The 4-button action bar at the bottom of the combat screen.
 *
 * Shows: Attack, Skill 1, Skill 2, Item
 * Skills show cooldown turns remaining when on cooldown (greyed out).
 * Item button shows count of remaining consumables.
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import theme from '../constants/theme';

/**
 * @param {Object} props
 * @param {Function} props.onAttack      — called when Attack is tapped
 * @param {Function} props.onSkill1      — called when Skill 1 is tapped
 * @param {Function} props.onSkill2      — called when Skill 2 is tapped
 * @param {Function} props.onItem        — called when Item is tapped
 * @param {Object|null} props.skill1     — skill definition for slot 1 (null if empty)
 * @param {Object|null} props.skill2     — skill definition for slot 2 (null if empty)
 * @param {number} props.skill1Cooldown  — turns remaining on skill 1 cooldown (0 = ready)
 * @param {number} props.skill2Cooldown  — turns remaining on skill 2 cooldown (0 = ready)
 * @param {number} props.itemCount       — total consumables remaining
 * @param {boolean} props.disabled       — disable all buttons (e.g. during enemy turn)
 */
export default function CombatBar({
  onAttack,
  onSkill1,
  onSkill2,
  onItem,
  skill1,
  skill2,
  skill1Cooldown = 0,
  skill2Cooldown = 0,
  itemCount = 0,
  disabled = false,
}) {
  return (
    <View style={styles.container}>
      {/* Attack button — always available */}
      <TouchableOpacity
        style={[styles.button, styles.attackButton, disabled && styles.disabledButton]}
        onPress={onAttack}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonIcon}>⚔️</Text>
        <Text style={styles.buttonLabel}>Attack</Text>
      </TouchableOpacity>

      {/* Skill 1 button */}
      <TouchableOpacity
        style={[
          styles.button,
          styles.skillButton,
          (!skill1 || skill1Cooldown > 0 || disabled) && styles.disabledButton,
        ]}
        onPress={onSkill1}
        disabled={!skill1 || skill1Cooldown > 0 || disabled}
        activeOpacity={0.7}
      >
        {skill1Cooldown > 0 && (
          <View style={styles.cooldownOverlay}>
            <Text style={styles.cooldownText}>{skill1Cooldown}</Text>
          </View>
        )}
        <Text style={styles.buttonIcon}>🌟</Text>
        <Text style={styles.buttonLabel} numberOfLines={1}>
          {skill1 ? skill1.name : 'Skill 1'}
        </Text>
      </TouchableOpacity>

      {/* Skill 2 button */}
      <TouchableOpacity
        style={[
          styles.button,
          styles.skillButton,
          (!skill2 || skill2Cooldown > 0 || disabled) && styles.disabledButton,
        ]}
        onPress={onSkill2}
        disabled={!skill2 || skill2Cooldown > 0 || disabled}
        activeOpacity={0.7}
      >
        {skill2Cooldown > 0 && (
          <View style={styles.cooldownOverlay}>
            <Text style={styles.cooldownText}>{skill2Cooldown}</Text>
          </View>
        )}
        <Text style={styles.buttonIcon}>✨</Text>
        <Text style={styles.buttonLabel} numberOfLines={1}>
          {skill2 ? skill2.name : 'Skill 2'}
        </Text>
      </TouchableOpacity>

      {/* Item button */}
      <TouchableOpacity
        style={[
          styles.button,
          styles.itemButton,
          (itemCount <= 0 || disabled) && styles.disabledButton,
        ]}
        onPress={onItem}
        disabled={itemCount <= 0 || disabled}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonIcon}>🧪</Text>
        <Text style={styles.buttonLabel}>Item ({itemCount})</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: theme.SPACING.sm,
    paddingVertical: theme.SPACING.sm,
    backgroundColor: 'rgba(10, 10, 20, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(100, 80, 40, 0.3)',
    gap: 6,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.BORDER_RADIUS.md,
    borderWidth: 1,
    minHeight: 56,
    position: 'relative',
    overflow: 'hidden',
  },
  attackButton: {
    backgroundColor: 'rgba(212, 167, 84, 0.2)',
    borderColor: theme.COLORS.primary,
  },
  skillButton: {
    backgroundColor: 'rgba(100, 60, 200, 0.2)',
    borderColor: '#6B4ED8',
  },
  itemButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: theme.COLORS.success,
  },
  disabledButton: {
    backgroundColor: 'rgba(40, 40, 40, 0.5)',
    borderColor: theme.COLORS.buttonDisabled,
    opacity: 0.5,
  },
  buttonIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  buttonLabel: {
    color: theme.COLORS.text,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  cooldownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.COLORS.cooldownOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.BORDER_RADIUS.md,
    zIndex: 1,
  },
  cooldownText: {
    color: theme.COLORS.textBright,
    fontSize: 24,
    fontWeight: 'bold',
  },
});
