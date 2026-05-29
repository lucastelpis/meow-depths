/**
 * HeroCard.js — Displays the hero (Mochi) during combat.
 *
 * Shows: cat emoji placeholder, name, HP bar, and active status effects.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../constants/theme';

/**
 * @param {Object} props
 * @param {Object} props.heroState — combat state { name, hp, maxHp, attack, effects: [] }
 */
export default function HeroCard({ heroState }) {
  if (!heroState) return null;

  const hpPercent = Math.max(0, (heroState.hp / heroState.maxHp) * 100);
  const effects = heroState.effects || [];

  // Change HP bar color based on health percentage
  const hpColor = hpPercent > 50
    ? theme.COLORS.success
    : hpPercent > 25
      ? '#FFA500'
      : theme.COLORS.danger;

  return (
    <View style={styles.container}>
      {/* Hero sprite placeholder */}
      {/* TODO: replace with sprite sheet frame */}
      <View style={styles.spriteContainer}>
        <Text style={styles.emoji}>🐱</Text>
      </View>

      <View style={styles.infoContainer}>
        {/* Hero name */}
        <Text style={styles.name}>{heroState.name || 'Mochi'}</Text>

        {/* HP bar */}
        <View style={styles.hpBarContainer}>
          <View style={[styles.hpBarFill, { width: `${hpPercent}%`, backgroundColor: hpColor }]} />
        </View>
        <Text style={styles.hpText}>
          ❤️ {heroState.hp}/{heroState.maxHp}
        </Text>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <Text style={styles.statText}>⚔️{heroState.attack}</Text>
          <Text style={styles.statText}>🛡️{heroState.defence}</Text>
          <Text style={styles.statText}>💥{Math.round((heroState.critChance || 0.05) * 100)}%</Text>
        </View>

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
      </View>
    </View>
  );
}

/** Get emoji for status effect */
function getEffectIcon(type) {
  switch (type) {
    case 'bleed': return '🩸';
    case 'stun': return '💫';
    case 'guard': return '🛡️';
    case 'stealth': return '👤';
    case 'counter': return '⚡';
    case 'deathMark': return '💀';
    default: return '•';
  }
}

/** Get background color for status effect badge */
function getEffectStyle(type) {
  switch (type) {
    case 'bleed': return { backgroundColor: `${theme.COLORS.bleed}33` };
    case 'stun': return { backgroundColor: `${theme.COLORS.stun}33` };
    case 'guard': return { backgroundColor: `${theme.COLORS.guard}33` };
    case 'stealth': return { backgroundColor: `${theme.COLORS.stealth}33` };
    case 'counter': return { backgroundColor: 'rgba(255, 165, 0, 0.2)' };
    default: return {};
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20, 30, 15, 0.8)',
    borderRadius: theme.BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(80, 120, 60, 0.4)',
    padding: theme.SPACING.md,
    alignItems: 'center',
    marginHorizontal: theme.SPACING.md,
  },
  spriteContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(40, 50, 30, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.SPACING.md,
    borderWidth: 2,
    borderColor: theme.COLORS.primary,
  },
  emoji: {
    fontSize: 32,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    ...theme.FONTS.heading,
    color: theme.COLORS.textBright,
    marginBottom: 4,
  },
  hpBarContainer: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(60, 40, 40, 0.6)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 3,
  },
  hpBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  hpText: {
    color: theme.COLORS.text,
    fontSize: 12,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statText: {
    color: theme.COLORS.textDim,
    fontSize: 11,
  },
  effectsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 4,
  },
  effectBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  effectText: {
    fontSize: 10,
    color: theme.COLORS.text,
    fontWeight: '500',
  },
});
