/**
 * WorldMapScreen.js — Zone Selection + Pre-Run Loadout Picker (Redesigned Premium UI)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { ZONES } from '../data/zones';
import { CONSUMABLES } from '../data/gear';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_SLOTS = 5;

// Define specific gradient colors for each zone for rich visual aesthetics
const ZONE_GRADIENTS = {
  zone1: {
    start: '#0F1A0F', // Soggy Sewers - Swamp/Venom green tint
    end: '#060B06',
    border: 'rgba(76, 175, 80, 0.25)',
    accent: '#10B981',
  },
  zone2: {
    start: '#150F1A', // Twisted Garden - Mystical Forest/Purple tint
    end: '#09060B',
    border: 'rgba(168, 85, 247, 0.25)',
    accent: '#A855F7',
  },
  zone3: {
    start: '#0F151F', // Sunken Docks - Oceanic blue/cyan tint
    end: '#06090B',
    border: 'rgba(6, 182, 212, 0.25)',
    accent: '#06B6D4',
  },
};

const CONSUMABLE_ICONS = {
  health_potion: '🧪',
  mega_potion: '💊',
  antidote: '🌿',
  smoke_vial: '💨',
  mystery_chest: '🎁',
};

export default function WorldMapScreen({ navigation }) {
  const { state, dispatch } = useGame();
  const zoneList = Object.values(ZONES);

  // ── Loadout modal state ────────────────────────────────────────────────────
  const [modalZone, setModalZone]       = useState(null);   // zone selected for run
  const [loadout, setLoadout]           = useState({});     // { itemId: count }

  const totalPacked = Object.values(loadout).reduce((s, n) => s + n, 0);
  const slotsLeft   = MAX_SLOTS - totalPacked;

  // ── Zone unlock helper ─────────────────────────────────────────────────────
  const isZoneUnlocked = (zone) => {
    if (!zone.unlockCondition) return true;
    return !!state.progress[zone.unlockCondition];
  };

  // ── Open loadout picker ────────────────────────────────────────────────────
  const openLoadout = (zone) => {
    setLoadout({});
    setModalZone(zone);
  };

  // ── Add / remove one item from the loadout ─────────────────────────────────
  const addItem = (itemId) => {
    if (totalPacked >= MAX_SLOTS) return;
    const owned   = state.hero.inventory.consumables.find(c => c.id === itemId)?.quantity || 0;
    const current = loadout[itemId] || 0;
    if (current >= owned) return;
    setLoadout(prev => ({ ...prev, [itemId]: current + 1 }));
  };

  const removeItem = (itemId) => {
    const current = loadout[itemId] || 0;
    if (current <= 0) return;
    setLoadout(prev => {
      const next = { ...prev, [itemId]: current - 1 };
      if (next[itemId] === 0) delete next[itemId];
      return next;
    });
  };

  // ── Confirm loadout and enter the dungeon ──────────────────────────────────
  const handleEnterDungeon = () => {
    const carried = [];
    for (const [id, count] of Object.entries(loadout)) {
      for (let i = 0; i < count; i++) carried.push(id);
    }
    setModalZone(null);
    dispatch({ type: 'START_RUN', payload: { zoneId: modalZone.id, consumables: carried } });
    navigation.navigate('DungeonMap');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Hub</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🗺️ World Map</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Zone Cards ─────────────────────────────────────────────────── */}
        {zoneList.map((zone) => {
          const unlocked      = isZoneUnlocked(zone);
          const floorsCleared = state.progress.floorsCleared[zone.id] || 0;
          const floorProgress = zone.floors > 0 ? floorsCleared / zone.floors : 0;
          const grad = ZONE_GRADIENTS[zone.id] || { start: '#171725', end: '#0B0B12', border: 'rgba(255,255,255,0.05)', accent: theme.COLORS.primary };

          return (
            <View key={zone.id} style={[styles.zoneCard, !unlocked && styles.zoneCardLocked, theme.SHADOWS.cardShadow]}>
              {/* Card SVG Gradient Backdrop */}
              <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                <Defs>
                  <LinearGradient id={`grad_${zone.id}`} x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor={unlocked ? grad.start : '#15151C'} />
                    <Stop offset="100%" stopColor={unlocked ? grad.end : '#0B0B0E'} />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill={`url(#grad_${zone.id})`} rx={16} />
              </Svg>

              {/* Decorative inner border */}
              <View style={StyleSheet.absoluteFill}>
                <Svg width="100%" height="100%">
                  <Rect x="6" y="6" width="96%" height="92%" rx={12} fill="none" stroke={unlocked ? grad.border : 'rgba(255,255,255,0.02)'} strokeWidth="1" />
                </Svg>
              </View>

              {!unlocked && (
                <View style={styles.lockOverlay}>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              )}

              <View style={styles.zoneHeader}>
                <View style={styles.zoneNameBlock}>
                  <Text style={styles.zoneEmoji}>{unlocked ? '🔓' : '🔒'}</Text>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                </View>
                <View style={[styles.levelBadge, unlocked && { borderColor: `${grad.accent}40`, backgroundColor: `${grad.accent}10` }]}>
                  <Text style={[styles.levelBadgeText, unlocked && { color: grad.accent }]}>Lv.{zone.minLevel}-{zone.maxLevel}</Text>
                </View>
              </View>

              <Text style={styles.zoneDescription}>{zone.description}</Text>

              <View style={styles.floorSection}>
                <View style={styles.floorLabelRow}>
                  <Text style={styles.floorLabel}>Dungeon Cleared</Text>
                  <Text style={styles.floorProgressText}>{floorsCleared}/{zone.floors} Floors</Text>
                </View>
                <View style={styles.floorBarTrack}>
                  <View style={[styles.floorBarFill, { width: `${Math.min(floorProgress * 100, 100)}%`, backgroundColor: unlocked ? grad.accent : theme.COLORS.buttonDisabled }]} />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.beginButton, !unlocked && styles.beginButtonDisabled, unlocked && { backgroundColor: grad.accent }]}
                activeOpacity={0.8}
                disabled={!unlocked}
                onPress={() => openLoadout(zone)}
              >
                <Text style={[styles.beginButtonText, !unlocked && styles.beginButtonTextDisabled]}>
                  {unlocked ? '⚔️  Begin Run' : '🔒  Locked'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════════
          Loadout Picker Modal (Slide-up Glass Sheet)
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!modalZone}
        transparent
        animationType="slide"
        onRequestClose={() => setModalZone(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, theme.SHADOWS.cardShadow]}>
            
            {/* Grabber indicator */}
            <View style={styles.modalGrabber} />

            {/* Title + slot counter */}
            <Text style={styles.modalTitle}>🎒 Pack Supplies</Text>
            <Text style={styles.modalSubtitle}>
              {modalZone?.name} · {totalPacked}/{MAX_SLOTS} items carried
            </Text>

            {/* Slot Pips */}
            <View style={styles.slotPips}>
              {Array.from({ length: MAX_SLOTS }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.pip, i < totalPacked && styles.pipFilled]}
                />
              ))}
            </View>

            {/* Item list */}
            <ScrollView style={styles.itemList} showsVerticalScrollIndicator={false}>
              {state.hero.inventory.consumables.length === 0 || !state.hero.inventory.consumables.some(c => c.quantity > 0) ? (
                <Text style={styles.emptyText}>
                  No items in inventory.{'\n'}Buy some from the camp shop!
                </Text>
              ) : (
                state.hero.inventory.consumables
                  .filter(entry => entry.quantity > 0)
                  .map(entry => {
                    const def     = CONSUMABLES.find(c => c.id === entry.id);
                    const packed  = loadout[entry.id] || 0;
                    const canAdd  = totalPacked < MAX_SLOTS && packed < entry.quantity;
                    const canRemove = packed > 0;
                    const icon    = CONSUMABLE_ICONS[entry.id] || '🧪';

                    return (
                      <View key={entry.id} style={styles.itemRow}>
                        <View style={styles.itemIconBox}>
                          <Text style={styles.itemRowIcon}>{icon}</Text>
                        </View>

                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{def?.name || entry.id}</Text>
                          <Text style={styles.itemDesc} numberOfLines={1}>{def?.description || ''}</Text>
                          <Text style={styles.itemOwned}>Inventory: {entry.quantity}</Text>
                        </View>

                        <View style={styles.itemControls}>
                          <TouchableOpacity
                            style={[styles.counterBtn, !canRemove && styles.counterBtnDisabled]}
                            onPress={() => removeItem(entry.id)}
                            disabled={!canRemove}
                          >
                            <Text style={styles.counterBtnText}>−</Text>
                          </TouchableOpacity>

                          <Text style={styles.packedCount}>{packed}</Text>

                          <TouchableOpacity
                            style={[styles.counterBtn, !canAdd && styles.counterBtnDisabled]}
                            onPress={() => addItem(entry.id)}
                            disabled={!canAdd}
                          >
                            <Text style={styles.counterBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
              )}
            </ScrollView>

            {/* Action buttons */}
            <TouchableOpacity style={styles.enterBtn} onPress={handleEnterDungeon}>
              <Text style={styles.enterBtnText}>
                ⚔️  Enter Dungeon{totalPacked === 0 ? ' (No Items)' : ` (${totalPacked}/${MAX_SLOTS} Items)`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalZone(null)}>
              <Text style={styles.cancelBtnText}>← Back to Map</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =============================================================================
// Styles
// =============================================================================
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#07070A' },
  scroll:      { padding: theme.SPACING.md, paddingBottom: theme.SPACING.xl * 2 },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: '#07070A' },
  backButton:   { paddingVertical: theme.SPACING.xs, paddingRight: theme.SPACING.sm, minHeight: 40, justifyContent: 'center' },
  backText:     { ...theme.FONTS.body, color: theme.COLORS.primary, fontWeight: 'bold' },
  title:        { ...theme.FONTS.title, color: theme.COLORS.textBright, textAlign: 'center' },
  headerSpacer: { width: 44 },

  // Zone cards
  zoneCard:         { borderRadius: 16, padding: theme.SPACING.md, marginBottom: 20, position: 'relative', overflow: 'hidden', borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.03)' },
  zoneCardLocked:   { opacity: 0.3 },
  lockOverlay:      { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)' },
  lockIcon:         { fontSize: 44, opacity: 0.4 },
  zoneHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.SPACING.sm, zIndex: 2 },
  zoneNameBlock:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoneEmoji:        { fontSize: 18 },
  zoneName:         { ...theme.FONTS.heading, color: theme.COLORS.textBright, fontWeight: 'bold' },
  levelBadge:       { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  levelBadgeText:   { ...theme.FONTS.tiny, color: theme.COLORS.textDim, fontWeight: 'bold' },
  zoneDescription:  { ...theme.FONTS.body, color: '#94A3B8', marginBottom: theme.SPACING.md, lineHeight: 22, zIndex: 2 },
  floorSection:     { marginBottom: theme.SPACING.md, zIndex: 2 },
  floorLabelRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  floorLabel:       { ...theme.FONTS.small, color: theme.COLORS.textDim },
  floorProgressText:{ ...theme.FONTS.small, color: theme.COLORS.textBright, fontWeight: 'bold' },
  floorBarTrack:    { height: 8, backgroundColor: 'rgba(0, 0, 0, 0.4)', borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' },
  floorBarFill:     { height: '100%', borderRadius: 4 },
  beginButton:      { borderRadius: 12, paddingVertical: 14, alignItems: 'center', minHeight: 50, justifyContent: 'center', zIndex: 2 },
  beginButtonDisabled:     { backgroundColor: theme.COLORS.buttonDisabled },
  beginButtonText:         { ...theme.FONTS.body, color: '#07070A', fontWeight: 'bold', letterSpacing: 0.5 },
  beginButtonTextDisabled: { color: theme.COLORS.textDim },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#0E0E18',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderColor: 'rgba(212, 167, 84, 0.3)',
    paddingHorizontal: theme.SPACING.md,
    paddingTop: theme.SPACING.sm,
    paddingBottom: theme.SPACING.xl,
    maxHeight: '85%',
  },
  modalGrabber: {
    width: 48,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle:    { ...theme.FONTS.title, color: theme.COLORS.textBright, textAlign: 'center', marginBottom: 4 },
  modalSubtitle: { ...theme.FONTS.small, color: theme.COLORS.primary, textAlign: 'center', marginBottom: theme.SPACING.md, fontWeight: 'bold' },

  // Slot pips
  slotPips:  { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: theme.SPACING.md },
  pip:       { width: 32, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  pipFilled: { backgroundColor: theme.COLORS.primary, borderColor: theme.COLORS.primary, shadowColor: theme.COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4 },

  // Item rows
  itemList:  { maxHeight: 320, marginBottom: theme.SPACING.md },
  itemRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.015)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 14, padding: theme.SPACING.sm, marginBottom: theme.SPACING.sm },
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemRowIcon: { fontSize: 20 },
  itemInfo:  { flex: 1 },
  itemName:  { ...theme.FONTS.body, color: theme.COLORS.textBright, fontWeight: 'bold' },
  itemDesc:  { ...theme.FONTS.tiny, color: theme.COLORS.textDim, marginTop: 2, marginRight: 8 },
  itemOwned: { ...theme.FONTS.tiny, color: theme.COLORS.primary, marginTop: 2, fontWeight: 'bold' },

  // +/- controls
  itemControls:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  counterBtn:         { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(212, 167, 84, 0.12)', borderWidth: 1, borderColor: 'rgba(212, 167, 84, 0.25)', alignItems: 'center', justifyContent: 'center' },
  counterBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.04)' },
  counterBtnText:     { ...theme.FONTS.heading, color: theme.COLORS.primary, fontSize: 18 },
  packedCount:        { ...theme.FONTS.body, color: theme.COLORS.textBright, width: 22, textAlign: 'center', fontWeight: 'bold' },

  emptyText: { ...theme.FONTS.body, color: theme.COLORS.textDim, textAlign: 'center', padding: theme.SPACING.lg, fontStyle: 'italic' },

  // Buttons
  enterBtn:      { backgroundColor: theme.COLORS.success, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: theme.SPACING.sm, shadowColor: theme.COLORS.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 },
  enterBtnText:  { ...theme.FONTS.body, color: '#07070A', fontWeight: 'bold', letterSpacing: 0.5 },
  cancelBtn:     { alignItems: 'center', paddingVertical: theme.SPACING.sm },
  cancelBtnText: { ...theme.FONTS.body, color: theme.COLORS.textDim, fontWeight: 'bold' },
});
