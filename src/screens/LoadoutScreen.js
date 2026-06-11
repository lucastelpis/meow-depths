/**
 * LoadoutScreen.js — Mochi's Loadout (Inventory View)
 *
 * Shows Mochi's inventory (Consumables, Equipment, Crafting Materials).
 * Tapping gear will allow equipping it directly.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

import theme from '../constants/theme';
import InventoryScreen from './InventoryScreen';

export default function LoadoutScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.root}>
      {/* Ambient warm glow */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="loadoutGlow" cx="50%" cy="0%" rx="80%" ry="40%">
            <Stop offset="0%" stopColor={theme.COLORS.candleGold} stopOpacity="0.10" />
            <Stop offset="100%" stopColor={theme.COLORS.hearthBlack} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={theme.COLORS.hearthBlack} />
        <Rect width="100%" height="100%" fill="url(#loadoutGlow)" />
      </Svg>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Loadout</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Inventory content */}
      <View style={{ flex: 1 }}>
        <InventoryScreen />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.COLORS.hearthBlack,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,167,84,0.12)',
  },
  backBtn: { width: 36, paddingVertical: 6 },
  backText: {
    color: theme.COLORS.candleGold,
    fontWeight: 'bold',
    fontSize: 26,
    lineHeight: 26,
  },
  title: {
    ...theme.FONTS.display,
    fontSize: 20,
    color: theme.COLORS.parchment,
    flex: 1,
    textAlign: 'center',
  },
});
