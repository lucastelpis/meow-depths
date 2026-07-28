/**
 * =============================================================================
 * TabBar.js — shared chunky bevel tab switcher
 * =============================================================================
 *
 * The single source of truth for the top-level tab switcher used across screens
 * (Profile, Shop, Quest, Workshop). Renders the "cozy pixel pushbutton" look:
 * a drop-shadow base, a double border, and an active tab that lights up to
 * bright parchment. Sub-tab pills (the recessed segmented control) live in the
 * sibling SubTabBar component.
 *
 * Props:
 *   tabs      — [{ key, label, spritesheet?, frameIndex? }]. Icons are optional;
 *               omit spritesheet/frameIndex for a text-only tab.
 *   activeKey — key of the currently selected tab
 *   onSelect  — (key) => void, called when a tab is pressed
 *   iconSize  — sprite size in px (default 22)
 *   uppercase — force-uppercase labels via textTransform (default true)
 *   style     — container override, typically for margins/padding
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import ItemSprite from '../ItemSprite';
import theme from '../../constants/theme';

export default function TabBar({
  tabs,
  activeKey,
  onSelect,
  iconSize = 22,
  uppercase = true,
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      {tabs.map(({ key, label, spritesheet, frameIndex }) => {
        const isActive = activeKey === key;
        return (
          <View key={key} style={styles.wrapper}>
            <View style={styles.shadow} />
            <TouchableOpacity
              style={styles.outer}
              activeOpacity={0.8}
              onPress={() => onSelect(key)}
            >
              <View style={[styles.inner, isActive ? styles.innerActive : styles.innerInactive]}>
                {spritesheet != null && frameIndex != null && (
                  <ItemSprite
                    spritesheet={spritesheet}
                    frameIndex={frameIndex}
                    displaySize={iconSize}
                    opacity={isActive ? 1.0 : 0.65}
                  />
                )}
                <Text
                  style={[
                    styles.label,
                    uppercase && styles.labelUppercase,
                    isActive ? styles.labelActive : styles.labelInactive,
                  ]}
                >
                  {label}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  wrapper: {
    flex: 1,
    height: 42,
    position: 'relative',
  },
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    height: 42,
    borderRadius: 8,
    zIndex: 1,
    backgroundColor: '#0D2118',
  },
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 42,
    borderRadius: 8,
    borderWidth: 2.2,
    borderColor: '#84735B',
    backgroundColor: '#0D2118',
    zIndex: 2,
  },
  inner: {
    flex: 1,
    margin: 1.5,
    borderRadius: 5,
    borderWidth: 2.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  innerActive: {
    backgroundColor: '#F3E2BD',
    borderTopColor: '#FFF3DA',
    borderLeftColor: '#FFF3DA',
    borderRightColor: '#FFF3DA',
    borderBottomColor: '#B5A07A',
    borderBottomWidth: 3.5,
  },
  innerInactive: {
    backgroundColor: '#1B4030',
    borderTopColor: '#4F856C',
    borderLeftColor: '#4F856C',
    borderRightColor: '#4F856C',
    borderBottomColor: '#0D2118',
    borderBottomWidth: 3.5,
  },
  label: {
    ...theme.FONTS.labelLg,
    letterSpacing: 0,
  },
  labelUppercase: { textTransform: 'uppercase' },
  labelActive: { color: '#2A1A0C' },
  labelInactive: { color: '#8CAF9F' },
});
