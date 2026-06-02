import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import theme from '../../constants/theme';

export default function ResourceBar({
  current,
  max,
  variant = 'heroHp', // 'heroHp' | 'enemyHp' | 'xp'
  label,
  style,
  hideText = false,
}) {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  // Calculate percentage safely
  const percentage = max > 0 ? Math.min(Math.max((current / max) * 100, 0), 100) : 0;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: percentage,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  let barConfig = {
    fillColor: theme.COLORS.healthGreen,
    trackColor: '#0D2618',
    height: 12,
    radius: 4,
    showText: true,
  };

  if (variant === 'enemyHp') {
    barConfig = {
      fillColor: theme.COLORS.damageRed,
      trackColor: '#241016',
      height: 12,
      radius: 4,
      showText: true,
    };
  } else if (variant === 'xp') {
    barConfig = {
      fillColor: theme.COLORS.candleGold,
      trackColor: '#2A2010',
      height: 8,
      radius: 4,
      showText: false,
    };
  }

  const widthStyle = {
    width: animatedWidth.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    }),
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.track,
          {
            backgroundColor: barConfig.trackColor,
            height: barConfig.height,
            borderRadius: barConfig.radius,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            widthStyle,
            {
              backgroundColor: barConfig.fillColor,
              borderRadius: barConfig.radius,
            },
          ]}
        >
          {/* Subtle lighter highlight strip across the top third */}
          <View style={styles.highlightStrip} />
        </Animated.View>

        {barConfig.showText && !hideText && (
          <Text
            numberOfLines={1}
            style={[
              styles.valueTextOverlay,
              variant === 'enemyHp' && styles.valueTextSmallOverlay,
            ]}
          >
            {current}/{max}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.SPACING.tight,
  },
  label: {
    ...theme.FONTS.label,
    color: theme.COLORS.ghostWhite,
    width: 24, // Fixed width for alignment
  },
  track: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  highlightStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '33%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  valueTextOverlay: {
    ...StyleSheet.absoluteFillObject,
    ...theme.FONTS.label,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  valueTextSmallOverlay: {
    fontSize: 8,
    lineHeight: 12,
  },
});
