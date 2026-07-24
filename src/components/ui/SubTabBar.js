/**
 * =============================================================================
 * SubTabBar.js — shared recessed segmented sub-tab control
 * =============================================================================
 *
 * The secondary, "pill inside a recessed track" switcher used beneath a TabBar
 * (e.g. Profile's Equipped/Owned, Quest's Active/Completed). Text-only. The
 * active pill fills bright parchment; inactive pills are transparent.
 *
 * Props:
 *   tabs      — [{ key, label }]
 *   activeKey — key of the currently selected sub-tab
 *   onSelect  — (key) => void
 *   style     — container override, typically for margins
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function SubTabBar({ tabs, activeKey, onSelect, style }) {
  return (
    <View style={[styles.bar, style]}>
      {tabs.map(({ key, label }) => {
        const isActive = activeKey === key;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.tab, isActive ? styles.tabActive : styles.tabInactive]}
            activeOpacity={0.8}
            onPress={() => onSelect(key)}
          >
            <Text style={[styles.text, isActive ? styles.textActive : styles.textInactive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#0D2118',
    borderColor: '#3E2E15',
    borderWidth: 2,
    borderRadius: 8,
    padding: 3,
  },
  tab: {
    flex: 1,
    height: 32,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#F3E2BD',
    borderWidth: 1.5,
    borderColor: '#B5A07A',
  },
  tabInactive: {
    backgroundColor: 'transparent',
  },
  text: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 14,
    fontWeight: 'normal',
    textTransform: 'uppercase',
  },
  textActive: { color: '#2A1A0C' },
  textInactive: { color: '#FFF3DA', opacity: 0.6 },
});
