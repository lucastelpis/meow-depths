/**
 * EnemyCard.js — Displays an enemy during combat.
 *
 * Shows: emoji placeholder, name, HP bar, intent (next move),
 * and active status effects. Highlights when selected as target.
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import theme from '../constants/theme';

// Map enemy IDs to emoji placeholders
// TODO: replace with sprite sheet frames
const ENEMY_EMOJIS = {
  sewer_rat: '🐀',
  slimeling: '🟢',
  cockroach_knight: '🪳',
  plague_frog: '🐸',
  king_rat: '👑🐀',
  thorn_sprite: '🌿',
  giant_beetle: '🐛',
  mushroom_puffer: '🍄',
  vine_lurker: '🌱',
  rootmother: '🌳',
  barnacle_crab: '🦀',
  sea_witch_eel: '🐍',
  drowned_sailor: '👻',
  pufferfish_bomb: '🐡',
  captain_moray: '⚓',
};

/**
 * @param {Object} props
 * @param {Object} props.enemy       — enemy data { id, name, hp, maxHp, attack, moves }
 * @param {Object} props.enemyState  — combat state { effects: [], intent: {} }
 * @param {boolean} props.isSelected — whether this enemy is the current target
 * @param {Function} props.onSelect  — callback when tapped to select
 */
export default function EnemyCard({ enemy, enemyState, isSelected, onSelect }) {
  if (!enemy) return null;

  const hpPercent = Math.max(0, (enemy.hp / (enemy.maxHp || enemy.hp)) * 100);
  const emoji = ENEMY_EMOJIS[enemy.id] || '❓';
  const intent = enemyState?.intent;
  const effects = enemyState?.effects || [];

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      {/* Enemy type badge */}
      {enemy.type === 'elite' && <Text style={styles.eliteBadge}>⭐ Elite</Text>}
      {enemy.type === 'boss' && <Text style={styles.bossBadge}>💀 Boss</Text>}

      {/* Enemy sprite placeholder */}
      {/* TODO: replace with sprite sheet frame */}
      <Text style={styles.emoji}>{emoji}</Text>

      {/* Enemy name */}
      <Text style={styles.name} numberOfLines={1}>{enemy.name}</Text>

      {/* HP bar */}
      <View style={styles.hpBarContainer}>
        <View style={[styles.hpBarFill, { width: `${hpPercent}%` }]} />
      </View>
      <Text style={styles.hpText}>{enemy.hp}/{enemy.maxHp || enemy.hp}</Text>

      {/* Intent display — shows the enemy's next move */}
      {intent && (
        <View style={styles.intentContainer}>
          <Text style={styles.intentIcon}>⚠️</Text>
          <Text style={styles.intentText} numberOfLines={1}>
            {intent.name} ({intent.damage})
          </Text>
        </View>
      )}

      {/* Status effects */}
      {effects.length > 0 && (
        <View style={styles.effectsRow}>
          {effects.map((effect, i) => (
            <View key={`${effect.type}_${i}`} style={[styles.effectBadge, getEffectStyle(effect.type)]}>
              <Text style={styles.effectText}>
                {getEffectIcon(effect.type)} {effect.duration || ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

/** Get the emoji icon for a status effect type */
function getEffectIcon(type) {
  switch (type) {
    case 'bleed': return '🩸';
    case 'stun': return '💫';
    case 'deathMark': return '💀';
    case 'guard': return '🛡️';
    default: return '•';
  }
}

/** Get the background style for a status effect badge */
function getEffectStyle(type) {
  switch (type) {
    case 'bleed': return { backgroundColor: 'rgba(255, 51, 51, 0.3)' };
    case 'stun': return { backgroundColor: 'rgba(255, 215, 0, 0.3)' };
    case 'deathMark': return { backgroundColor: 'rgba(255, 0, 102, 0.3)' };
    case 'guard': return { backgroundColor: 'rgba(68, 136, 255, 0.3)' };
    default: return {};
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(30, 20, 40, 0.8)',
    borderRadius: theme.BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(80, 60, 100, 0.4)',
    padding: theme.SPACING.sm,
    alignItems: 'center',
    minWidth: 100,
    maxWidth: 140,
    marginHorizontal: 4,
  },
  selected: {
    borderColor: theme.COLORS.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(40, 30, 50, 0.9)',
    shadowColor: theme.COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  eliteBadge: {
    fontSize: 9,
    color: theme.COLORS.gold,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  bossBadge: {
    fontSize: 9,
    color: theme.COLORS.danger,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  emoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  name: {
    color: theme.COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  hpBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(60, 40, 40, 0.6)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 2,
  },
  hpBarFill: {
    height: '100%',
    backgroundColor: theme.COLORS.hp,
    borderRadius: 3,
  },
  hpText: {
    color: theme.COLORS.textDim,
    fontSize: 9,
    marginBottom: 4,
  },
  intentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 100, 0, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: 2,
  },
  intentIcon: {
    fontSize: 10,
    marginRight: 2,
  },
  intentText: {
    color: theme.COLORS.accent,
    fontSize: 9,
    fontWeight: '500',
  },
  effectsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 2,
  },
  effectBadge: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  effectText: {
    fontSize: 9,
    color: theme.COLORS.text,
  },
});
