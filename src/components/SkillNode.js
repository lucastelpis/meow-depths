/**
 * SkillNode.js — Individual node in the skill tree.
 *
 * Shows a skill with its name, type, description, and lock/unlock status.
 * Supports different visual states: locked, available, unlocked, blocked.
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import theme from '../constants/theme';

/**
 * @param {Object} props
 * @param {Object} props.skill       — skill definition from data/skills.js
 * @param {'locked'|'available'|'unlocked'|'blocked'} props.status — visual state
 * @param {Function} props.onPress   — called when tapped
 * @param {string} props.reason      — reason why it can't be unlocked (shown on locked nodes)
 */
export default function SkillNode({ skill, status, onPress, reason }) {
  if (!skill) return null;

  const isActive = skill.type === 'active';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        status === 'unlocked' && styles.unlocked,
        status === 'available' && styles.available,
        status === 'blocked' && styles.blocked,
        status === 'locked' && styles.locked,
      ]}
      onPress={onPress}
      disabled={status !== 'available'}
      activeOpacity={0.7}
    >
      {/* Branch indicator for tier 3-4 */}
      {skill.branch && (
        <View style={[styles.branchBadge, skill.branch === 'a' ? styles.branchA : styles.branchB]}>
          <Text style={styles.branchText}>{skill.branch.toUpperCase()}</Text>
        </View>
      )}

      {/* Type badge */}
      <View style={[styles.typeBadge, isActive ? styles.activeBadge : styles.passiveBadge]}>
        <Text style={styles.typeText}>{isActive ? 'Active' : 'Passive'}</Text>
      </View>

      {/* Skill name */}
      <Text style={[
        styles.name,
        status === 'unlocked' && styles.unlockedText,
        (status === 'locked' || status === 'blocked') && styles.lockedText,
      ]}>
        {skill.name}
      </Text>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>
        {skill.description}
      </Text>

      {/* Cooldown for active skills */}
      {isActive && skill.cooldown > 0 && (
        <Text style={styles.cooldown}>CD: {skill.cooldown} turns</Text>
      )}

      {/* Status indicator */}
      {status === 'unlocked' && <Text style={styles.statusIcon}>✅</Text>}
      {status === 'blocked' && <Text style={styles.statusIcon}>❌</Text>}
      {status === 'locked' && <Text style={styles.statusIcon}>🔒</Text>}
      {status === 'available' && <Text style={styles.availableText}>Tap to unlock</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(30, 25, 35, 0.8)',
    borderRadius: theme.BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(60, 50, 70, 0.4)',
    padding: theme.SPACING.sm,
    marginBottom: theme.SPACING.sm,
    minWidth: 140,
    position: 'relative',
  },
  unlocked: {
    borderColor: theme.COLORS.success,
    backgroundColor: 'rgba(20, 40, 20, 0.8)',
  },
  available: {
    borderColor: theme.COLORS.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(40, 35, 20, 0.8)',
    shadowColor: theme.COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  blocked: {
    borderColor: 'rgba(255, 50, 50, 0.4)',
    opacity: 0.5,
  },
  locked: {
    opacity: 0.4,
  },
  branchBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchA: {
    backgroundColor: '#4488FF',
  },
  branchB: {
    backgroundColor: '#FF6644',
  },
  branchText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  activeBadge: {
    backgroundColor: 'rgba(100, 60, 200, 0.3)',
  },
  passiveBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  typeText: {
    color: theme.COLORS.text,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    color: theme.COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  unlockedText: {
    color: theme.COLORS.success,
  },
  lockedText: {
    color: theme.COLORS.textDim,
  },
  description: {
    color: theme.COLORS.textDim,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 4,
  },
  cooldown: {
    color: 'rgba(100, 100, 200, 0.8)',
    fontSize: 10,
    fontWeight: '500',
  },
  statusIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 14,
  },
  availableText: {
    color: theme.COLORS.primary,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
});
