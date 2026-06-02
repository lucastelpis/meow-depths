import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import theme from '../../constants/theme';

export default function Button({
  title,
  icon,
  variant = 'primary',
  onPress,
  disabled = false,
  style,
  textStyle,
}) {
  let buttonStyle = styles.primaryButton;
  let labelStyle = styles.primaryText;

  if (disabled || variant === 'disabled') {
    buttonStyle = styles.disabledButton;
    labelStyle = styles.disabledText;
  } else if (variant === 'secondary') {
    buttonStyle = styles.secondaryButton;
    labelStyle = styles.secondaryText;
  } else if (variant === 'danger') {
    buttonStyle = styles.dangerButton;
    labelStyle = styles.dangerText;
  } else if (variant === 'attack') {
    buttonStyle = styles.attackButton;
    labelStyle = styles.attackText;
  } else if (variant === 'skill') {
    buttonStyle = styles.skillButton;
    labelStyle = styles.skillText;
  } else if (variant === 'skillCooldown') {
    buttonStyle = styles.skillCooldownButton;
    labelStyle = styles.skillCooldownText;
  }

  return (
    <TouchableOpacity
      style={[styles.button, buttonStyle, style]}
      onPress={onPress}
      disabled={disabled || variant === 'disabled'}
      activeOpacity={0.8}
    >
      <View style={styles.contentRow}>
        {icon && <Text style={[styles.icon, labelStyle]}>{icon}</Text>}
        {title && <Text style={[styles.title, labelStyle, textStyle]}>{title}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.BORDER_RADIUS.button,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.SPACING.tight,
  },
  title: {
    ...theme.FONTS.heading,
    textAlign: 'center',
  },
  icon: {
    fontSize: 16,
  },

  // ── Standard variants ───────────────────────────────────────────
  primaryButton: {
    backgroundColor: theme.COLORS.torchOrange,
    borderColor: theme.COLORS.candleGold,
  },
  primaryText: {
    color: '#FFF3DA',
  },
  secondaryButton: {
    backgroundColor: '#241A0C',
    borderColor: '#4A3917',
  },
  secondaryText: {
    color: '#F0E0BD',
  },
  dangerButton: {
    backgroundColor: '#3A1A1A',
    borderColor: '#7A2D2D',
  },
  dangerText: {
    color: '#F0A5A5',
  },
  disabledButton: {
    backgroundColor: '#1A1A1A',
    borderColor: '#2A2A2A',
  },
  disabledText: {
    color: '#8A8A8A',
  },

  // ── Combat action variants ──────────────────────────────────────
  attackButton: {
    backgroundColor: '#10241A',
    borderColor: '#1D4A32',
  },
  attackText: {
    color: '#5CC489',
  },
  skillButton: {
    backgroundColor: '#1A1230',
    borderColor: '#382860',
  },
  skillText: {
    color: '#A98EE0',
  },
  skillCooldownButton: {
    backgroundColor: '#1A1408',
    borderColor: '#3A2C14',
    opacity: 0.65,
  },
  skillCooldownText: {
    color: '#9C7D44',
  },
});
