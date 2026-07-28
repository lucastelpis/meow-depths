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
  let shadowStyle = {};
  let outerStyle = {};
  let innerStyle = {};
  let labelStyle = {};

  if (disabled || variant === 'disabled') {
    shadowStyle = { backgroundColor: 'transparent' };
    outerStyle = { borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' };
    innerStyle = {
      backgroundColor: 'rgba(255,255,255,0.02)',
      borderColor: 'transparent',
      borderWidth: 0,
    };
    labelStyle = { color: 'rgba(255,255,255,0.2)' };
  } else if (variant === 'secondary') {
    shadowStyle = { backgroundColor: '#131513' };
    outerStyle = { borderColor: '#84735B', backgroundColor: '#131513' };
    innerStyle = {
      backgroundColor: '#262926',
      borderTopColor: '#404540',
      borderLeftColor: '#404540',
      borderRightColor: '#404540',
      borderBottomColor: '#131513',
    };
    labelStyle = { color: '#F0E0BD' };
  } else if (variant === 'danger') {
    shadowStyle = { backgroundColor: '#590D0E' };
    outerStyle = { borderColor: '#84735B', backgroundColor: '#590D0E' };
    innerStyle = {
      backgroundColor: '#A61C1C',
      borderTopColor: '#D8483F',
      borderLeftColor: '#D8483F',
      borderRightColor: '#D8483F',
      borderBottomColor: '#590D0E',
    };
    labelStyle = { color: '#FFF3DA' };
  } else if (variant === 'attack') {
    shadowStyle = { backgroundColor: '#0D2118' };
    outerStyle = { borderColor: '#84735B', backgroundColor: '#0D2118' };
    innerStyle = {
      backgroundColor: '#1B4030',
      borderTopColor: '#4F856C',
      borderLeftColor: '#4F856C',
      borderRightColor: '#4F856C',
      borderBottomColor: '#0D2118',
    };
    labelStyle = { color: '#5CC489' };
  } else if (variant === 'skill') {
    shadowStyle = { backgroundColor: '#1A1230' };
    outerStyle = { borderColor: '#84735B', backgroundColor: '#1A1230' };
    innerStyle = {
      backgroundColor: '#382860',
      borderTopColor: '#56408F',
      borderLeftColor: '#56408F',
      borderRightColor: '#56408F',
      borderBottomColor: '#1D123D',
    };
    labelStyle = { color: '#A98EE0' };
  } else if (variant === 'skillCooldown') {
    shadowStyle = { backgroundColor: '#1A1408' };
    outerStyle = { borderColor: '#4E4256', backgroundColor: '#1A1408', opacity: 0.65 };
    innerStyle = {
      backgroundColor: '#3A2C14',
      borderTopColor: '#564426',
      borderLeftColor: '#564426',
      borderRightColor: '#564426',
      borderBottomColor: '#1F1404',
    };
    labelStyle = { color: '#9C7D44' };
  } else if (variant === 'flee') {
    shadowStyle = { backgroundColor: '#3A1E1E' };
    outerStyle = { borderColor: '#84735B', backgroundColor: '#3A1E1E' };
    innerStyle = {
      backgroundColor: '#7A3F3F',
      borderTopColor: '#A85A5A',
      borderLeftColor: '#A85A5A',
      borderRightColor: '#A85A5A',
      borderBottomColor: '#3A1E1E',
    };
    labelStyle = { color: '#FFF3DA' };
  } else { // primary (torchOrange)
    shadowStyle = { backgroundColor: '#6E5528' };
    outerStyle = { borderColor: '#84735B', backgroundColor: '#6E5528' };
    innerStyle = {
      backgroundColor: '#A84C27',
      borderTopColor: '#D67545',
      borderLeftColor: '#D67545',
      borderRightColor: '#D67545',
      borderBottomColor: '#5C2814',
    };
    labelStyle = { color: '#FFF3DA' };
  }

  return (
    <View style={[styles.buttonWrapper, style]}>
      {/* 1. Bevel Shadow Base */}
      <View style={[styles.buttonBevelShadow, shadowStyle]} />

      {/* 2. Main Outer Button */}
      <TouchableOpacity
        style={[styles.buttonOuter, outerStyle]}
        onPress={onPress}
        disabled={disabled || variant === 'disabled'}
        activeOpacity={0.8}
      >
        {/* 3. Inner Highlight & Fill */}
        <View style={[styles.buttonInner, innerStyle]}>
          <View style={styles.contentRow}>
            {icon && (
              typeof icon === 'string' ? (
                <Text style={[styles.icon, labelStyle]}>{icon}</Text>
              ) : (
                icon
              )
            )}
            {title && <Text style={[styles.title, labelStyle, textStyle]}>{title}</Text>}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonWrapper: {
    height: 46,
    position: 'relative',
  },
  buttonBevelShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    height: 43,
    borderRadius: 8,
    zIndex: 1,
  },
  buttonOuter: {
    flex: 1,
    height: 43,
    borderRadius: 8,
    borderWidth: 2,
    zIndex: 2,
  },
  buttonInner: {
    flex: 1,
    margin: 1.2,
    borderRadius: 5,
    borderWidth: 1.5,
    borderBottomWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.SPACING.tight,
  },
  // typography: deferred — button taxonomy (Jersey cozy vs Silkscreen pixel)
  // decided in final consolidation phase; keep raw Jersey 20 for now.
  title: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 20,
    textAlign: 'center',
    marginTop: -2,
  },
  icon: {
    fontSize: 16,
  },
});
