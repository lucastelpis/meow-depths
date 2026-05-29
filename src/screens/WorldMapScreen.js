/**
 * WorldMapScreen.js — Zone Selection + Pre-Run Loadout Picker
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { ZONES } from '../data/zones';
import { CONSUMABLES } from '../data/gear';

const MAX_SLOTS = 5;

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
    navigation.navigate('Combat');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🗺️ World Map</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.divider} />

        {/* ── Zone Cards ─────────────────────────────────────────────────── */}
        {zoneList.map((zone) => {
          const unlocked      = isZoneUnlocked(zone);
          const floorsCleared = state.progress.floorsCleared[zone.id] || 0;
          const floorProgress = zone.floors > 0 ? floorsCleared / zone.floors : 0;

          return (
            <View key={zone.id} style={[styles.zoneCard, !unlocked && styles.zoneCardLocked]}>
              {!unlocked && (
                <View style={styles.lockOverlay}>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              )}

              <View style={styles.zoneHeader}>
                <Text style={styles.zoneName}>{unlocked ? '🔓' : '🔒'} {zone.name}</Text>
                <Text style={styles.zoneLevelRange}>Lv. {zone.minLevel}–{zone.maxLevel}</Text>
              </View>

              <Text style={styles.zoneDescription}>{zone.description}</Text>

              <View style={styles.floorSection}>
                <Text style={styles.floorLabel}>Floors: {floorsCleared} / {zone.floors}</Text>
                <View style={styles.floorBarTrack}>
                  <View style={[styles.floorBarFill, { width: `${Math.min(floorProgress * 100, 100)}%` }]} />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.beginButton, !unlocked && styles.beginButtonDisabled]}
                activeOpacity={0.7}
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
          Loadout Picker Modal
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!modalZone}
        transparent
        animationType="slide"
        onRequestClose={() => setModalZone(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>

            {/* Title + slot counter */}
            <Text style={styles.modalTitle}>🎒 Pack Your Items</Text>
            <Text style={styles.modalSubtitle}>
              {modalZone?.name} · {totalPacked}/{MAX_SLOTS} slots filled
            </Text>

            {/* Slot pips */}
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
              {state.hero.inventory.consumables.length === 0 ? (
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

                    return (
                      <View key={entry.id} style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{def?.name || entry.id}</Text>
                          <Text style={styles.itemDesc}>{def?.description || ''}</Text>
                          <Text style={styles.itemOwned}>Owned: {entry.quantity}</Text>
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
                ⚔️  Enter Dungeon{totalPacked === 0 ? ' (no items)' : ` (${totalPacked} items)`}
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
  container:   { flex: 1, backgroundColor: theme.COLORS.mapBackground },
  scroll:      { padding: theme.SPACING.md, paddingBottom: theme.SPACING.xl * 2 },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.SPACING.xs },
  backButton:   { paddingVertical: theme.SPACING.xs, paddingRight: theme.SPACING.sm, minHeight: 48, justifyContent: 'center' },
  backText:     { ...theme.FONTS.body, color: theme.COLORS.primary },
  title:        { ...theme.FONTS.title, fontSize: 28, color: theme.COLORS.textBright, textAlign: 'center' },
  headerSpacer: { width: 60 },
  divider:      { height: 1, backgroundColor: theme.COLORS.success, opacity: 0.3, marginBottom: theme.SPACING.md },

  // Zone cards
  zoneCard:         { backgroundColor: 'rgba(15,30,15,0.85)', borderWidth: 1, borderColor: 'rgba(76,175,80,0.25)', borderRadius: theme.BORDER_RADIUS.lg, padding: theme.SPACING.md, marginBottom: theme.SPACING.md, position: 'relative', overflow: 'hidden' },
  zoneCardLocked:   { opacity: 0.4 },
  lockOverlay:      { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  lockIcon:         { fontSize: 48, opacity: 0.3 },
  zoneHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.SPACING.sm },
  zoneName:         { ...theme.FONTS.heading, color: theme.COLORS.textBright, flexShrink: 1 },
  zoneLevelRange:   { ...theme.FONTS.small, color: theme.COLORS.success, fontWeight: 'bold', marginLeft: theme.SPACING.sm },
  zoneDescription:  { ...theme.FONTS.body, color: theme.COLORS.text, marginBottom: theme.SPACING.md, lineHeight: 22 },
  floorSection:     { marginBottom: theme.SPACING.md },
  floorLabel:       { ...theme.FONTS.small, color: theme.COLORS.textDim, marginBottom: 4 },
  floorBarTrack:    { height: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: theme.BORDER_RADIUS.sm, overflow: 'hidden' },
  floorBarFill:     { height: '100%', backgroundColor: theme.COLORS.success, borderRadius: theme.BORDER_RADIUS.sm },
  beginButton:      { backgroundColor: theme.COLORS.success, borderRadius: theme.BORDER_RADIUS.md, paddingVertical: theme.SPACING.md, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  beginButtonDisabled:     { backgroundColor: theme.COLORS.buttonDisabled },
  beginButtonText:         { ...theme.FONTS.body, color: '#0A120A', fontWeight: 'bold' },
  beginButtonTextDisabled: { color: theme.COLORS.textDim },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: theme.COLORS.campBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 2,
    borderColor: theme.COLORS.primary,
    padding: theme.SPACING.lg,
    maxHeight: '80%',
  },

  modalTitle:    { ...theme.FONTS.title, color: theme.COLORS.textBright, textAlign: 'center', marginBottom: 4 },
  modalSubtitle: { ...theme.FONTS.small, color: theme.COLORS.primary, textAlign: 'center', marginBottom: theme.SPACING.md },

  // Slot pips
  slotPips:  { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: theme.SPACING.md },
  pip:       { width: 28, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: theme.COLORS.cardBorder },
  pipFilled: { backgroundColor: theme.COLORS.primary, borderColor: theme.COLORS.primary },

  // Item rows
  itemList:  { maxHeight: 300, marginBottom: theme.SPACING.md },
  itemRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.COLORS.cardBg, borderWidth: 1, borderColor: theme.COLORS.cardBorder, borderRadius: theme.BORDER_RADIUS.md, padding: theme.SPACING.sm, marginBottom: theme.SPACING.sm },
  itemInfo:  { flex: 1 },
  itemName:  { ...theme.FONTS.body, color: theme.COLORS.textBright, fontWeight: 'bold' },
  itemDesc:  { ...theme.FONTS.tiny, color: theme.COLORS.textDim, marginTop: 2 },
  itemOwned: { ...theme.FONTS.tiny, color: theme.COLORS.primary, marginTop: 2 },

  // +/- controls
  itemControls:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.COLORS.secondary, alignItems: 'center', justifyContent: 'center' },
  counterBtnDisabled: { backgroundColor: theme.COLORS.buttonDisabled },
  counterBtnText:     { ...theme.FONTS.heading, color: theme.COLORS.textBright },
  packedCount:        { ...theme.FONTS.heading, color: theme.COLORS.textBright, width: 24, textAlign: 'center' },

  emptyText: { ...theme.FONTS.body, color: theme.COLORS.textDim, textAlign: 'center', padding: theme.SPACING.lg, fontStyle: 'italic' },

  // Buttons
  enterBtn:      { backgroundColor: theme.COLORS.success, borderRadius: theme.BORDER_RADIUS.lg, paddingVertical: theme.SPACING.md, alignItems: 'center', marginBottom: theme.SPACING.sm },
  enterBtnText:  { ...theme.FONTS.body, color: '#0A120A', fontWeight: 'bold' },
  cancelBtn:     { alignItems: 'center', paddingVertical: theme.SPACING.sm },
  cancelBtnText: { ...theme.FONTS.body, color: theme.COLORS.primary },
});
