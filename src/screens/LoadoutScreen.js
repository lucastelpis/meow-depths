/**
 * LoadoutScreen.js — Mochi's Loadout (Inventory View)
 *
 * Wraps the tabbed InventoryScreen in the Camp-hub art style:
 * dark teal background, wood plaque title, and a Silkscreen back button.
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

import ItemSprite from '../components/ItemSprite';
import InventoryScreen from './InventoryScreen';

const C = {
  bg:         '#133131',
  plaqueDark: '#4A3917',
  plaqueGold: '#D4A754',
  plaqueBg:   '#1E1E20',
  text:       '#FFF3DA',
  textDim:    'rgba(255, 243, 218, 0.6)',
};

export default function LoadoutScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      {/* Ambient element-tinted glow at the top */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <RadialGradient id="loadoutGlow" cx="50%" cy="0%" rx="85%" ry="50%">
            <Stop offset="0%" stopColor={C.plaqueGold} stopOpacity="0.14" />
            <Stop offset="100%" stopColor={C.bg} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#loadoutGlow)" />
      </Svg>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← Hub</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <ItemSprite spritesheet="icons-1" frameIndex={12} displaySize={24} />
          <Text style={styles.titleText}>Loadout</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Inventory content */}
      <View style={{ flex: 1 }}>
        <InventoryScreen />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  backBtn: { width: 70, paddingVertical: 6 },
  backText: { color: '#D4A754', fontFamily: 'PixelifySans-Medium', fontSize: 16, letterSpacing: 0.5 },
  titleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  titleText: { fontFamily: 'PixelifySans-Medium', fontSize: 20, color: '#F8FAFC', letterSpacing: 0.8 },
  headerSpacer: { width: 70 },
});
