/**
 * =============================================================================
 * ImprovementsScreen.js — Camp Improvements (facility upgrades)
 * =============================================================================
 *
 * Reached from the Camp hub's "Camp" button. Lets the player spend camp
 * resources (Wood / Cloth / Stone) and crystal cores to upgrade four
 * facilities. Each row shows, left → right: the facility icon, its current
 * level, its current stat, the next-level stat, the resource cost, and an
 * upgrade button.
 *
 * All numbers/formulas live in src/data/improvements.js.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import ItemSprite from '../components/ItemSprite';
import { MATERIALS } from '../data/gear';
import {
  IMPROVEMENTS,
  IMPROVEMENT_ORDER,
  getImprovementLevel,
  getUpgradeCost,
  getStatText,
  canAfford,
  isMaxLevel,
} from '../data/improvements';

// Base camp resources shown as chips in the top resource bar.
const CAMP_RESOURCES = ['wood', 'cloth', 'stone'];

// Every crystal material, in drop order, shown in the Crystals inventory modal.
// Derived from MATERIALS so new crystal tiers appear automatically.
const CRYSTAL_IDS = Object.keys(MATERIALS).filter(
  (id) => MATERIALS[id].spritesheet === 'crystals-1'
);

export default function ImprovementsScreen({ navigation }) {
  const { state, dispatch } = useGame();
  const { hero } = state;
  const ownedMaterials = hero.inventory.materials || {};
  const [crystalsOpen, setCrystalsOpen] = useState(false);

  const handleUpgrade = (id, cost) => {
    if (!cost || !canAfford(cost, ownedMaterials)) return;
    dispatch({ type: 'UPGRADE_IMPROVEMENT', payload: { id } });
    Alert.alert('✨ Upgraded!', `${IMPROVEMENTS[id].name} improved.`);
  };

  const renderCostChip = (itemId, qty) => {
    const def = MATERIALS[itemId];
    const have = ownedMaterials[itemId] || 0;
    const enough = have >= qty;
    return (
      <View key={itemId} style={styles.costChip}>
        {def && (
          <ItemSprite spritesheet={def.spritesheet} frameIndex={def.frameIndex} displaySize={22} />
        )}
        <Text style={[styles.costChipText, enough ? styles.costOk : styles.costBad]}>
          {have}/{qty}
        </Text>
      </View>
    );
  };

  const renderRow = (id) => {
    const def = IMPROVEMENTS[id];
    const level = getImprovementLevel(hero, id);
    const maxed = isMaxLevel(id, level);
    const cost = getUpgradeCost(id, level);
    const affordable = !maxed && canAfford(cost, ownedMaterials);

    return (
      <View key={id} style={styles.card}>
        <View style={styles.cardShadow} pointerEvents="none" />

        {/* Top row: icon + name + level + stat progression */}
        <View style={styles.cardTop}>
          <View style={styles.iconWrap}>
            <ItemSprite spritesheet={def.icon.sheet} frameIndex={def.icon.frame} displaySize={40} />
          </View>

          <View style={styles.titleCol}>
            <Text style={styles.cardName}>{def.name}</Text>
            <Text style={styles.cardBlurb}>{def.blurb}</Text>
          </View>

          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>Lv {level}</Text>
            <Text style={styles.levelBadgeMax}>/ {def.maxLevel}</Text>
          </View>
        </View>

        {/* Stat progression: current → next */}
        <View style={styles.statRow}>
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>NOW</Text>
            <Text style={styles.statPillValue}>{getStatText(id, level)}</Text>
          </View>
          {!maxed && (
            <>
              <Text style={styles.statArrow}>▸</Text>
              <View style={[styles.statPill, styles.statPillNext]}>
                <Text style={styles.statPillLabelNext}>NEXT</Text>
                <Text style={styles.statPillValueNext}>{getStatText(id, level + 1)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Bottom row: cost + upgrade button (or MAX) */}
        <View style={styles.cardBottom}>
          {maxed ? (
            <View style={styles.maxBanner}>
              <Text style={styles.maxBannerText}>MAX LEVEL</Text>
            </View>
          ) : (
            <>
              <View style={styles.costRow}>
                {Object.entries(cost).map(([itemId, qty]) => renderCostChip(itemId, qty))}
              </View>
              <TouchableOpacity
                style={[styles.upgradeBtn, !affordable && styles.upgradeBtnDisabled]}
                activeOpacity={0.85}
                disabled={!affordable}
                onPress={() => handleUpgrade(id, cost)}
              >
                <Text style={[styles.upgradeBtnText, !affordable && styles.upgradeBtnTextDisabled]}>
                  UPGRADE
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerBackButtonWrapper}>
          <View style={styles.headerBackButtonBevelShadow} />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
            style={styles.headerBackButtonOuter}
          >
            <View style={styles.headerBackButtonInner}>
              <ItemSprite spritesheet="icons-map" frameIndex={43} displaySize={26} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.headerTitleOuterBorder}>
          <View style={styles.headerTitleInnerBorder}>
            <Text style={styles.headerTitleText}>Camp</Text>
          </View>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {/* ── Resource bar: camp materials + Crystals inventory button ──────── */}
      <View style={styles.resourceBar}>
        {CAMP_RESOURCES.map((itemId) => {
          const def = MATERIALS[itemId];
          if (!def) return null;
          return (
            <View key={itemId} style={styles.resourceChip}>
              <ItemSprite spritesheet={def.spritesheet} frameIndex={def.frameIndex} displaySize={24} />
              <Text style={styles.resourceChipText}>{ownedMaterials[itemId] || 0}</Text>
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.crystalsButton}
          activeOpacity={0.85}
          onPress={() => setCrystalsOpen(true)}
        >
          <ItemSprite spritesheet="crystals-1" frameIndex={2} displaySize={26} />
        </TouchableOpacity>
      </View>

      {/* ── Crystals inventory modal ──────────────────────────────────────── */}
      <Modal
        visible={crystalsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCrystalsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setCrystalsOpen(false)}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Crystals</Text>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalGrid}
              showsVerticalScrollIndicator={false}
            >
              {CRYSTAL_IDS.map((itemId) => {
                const def = MATERIALS[itemId];
                const have = ownedMaterials[itemId] || 0;
                return (
                  <View
                    key={itemId}
                    style={[styles.crystalSlot, have === 0 && styles.crystalSlotEmpty]}
                  >
                    <ItemSprite spritesheet={def.spritesheet} frameIndex={def.frameIndex} displaySize={40} />
                    <Text style={styles.crystalSlotName} numberOfLines={2}>
                      {def.name}
                    </Text>
                    <Text style={styles.crystalSlotQty}>×{have}</Text>
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              activeOpacity={0.85}
              onPress={() => setCrystalsOpen(false)}
            >
              <Text style={styles.modalCloseText}>CLOSE</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.introText}>
          Spend camp resources to upgrade Mochi's home base.
        </Text>
        {IMPROVEMENT_ORDER.map(renderRow)}
      </ScrollView>
    </SafeAreaView>
  );
}

const GOLD = '#D4A754';
const PARCH = '#FFF3DA';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#133131', // teal screen background (standard across redesigned screens)
  },

  /* ── Header ──────────────────────────────────────────────── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#84735B',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  headerBackButtonWrapper: { width: 44, height: 44, position: 'relative' },
  headerBackButtonBevelShadow: {
    position: 'absolute', left: 0, top: 3, width: 44, height: 44,
    borderRadius: 8, zIndex: 1, backgroundColor: '#4F3C1E',
  },
  headerBackButtonOuter: {
    width: 44, height: 44, borderRadius: 8, borderWidth: 2.5,
    borderColor: '#84735B', backgroundColor: '#4F3C1E', zIndex: 2,
  },
  headerBackButtonInner: {
    flex: 1, margin: 2, borderRadius: 5, borderWidth: 2.5,
    borderTopColor: '#D8483F', borderLeftColor: '#D8483F', borderRightColor: '#D8483F',
    borderBottomColor: '#590D0E', borderBottomWidth: 4,
    backgroundColor: '#A61C1C', justifyContent: 'center', alignItems: 'center',
  },
  headerTitleOuterBorder: {
    borderWidth: 2.5, borderColor: '#4A3917', borderRadius: 8, padding: 2,
  },
  headerTitleInnerBorder: {
    borderWidth: 2, borderColor: GOLD, borderRadius: 5,
    backgroundColor: '#1E1E20', paddingVertical: 6, paddingHorizontal: 20,
  },
  headerTitleText: {
    fontFamily: 'Jersey10-Regular', fontSize: 28, color: PARCH, textAlign: 'center',
    textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1,
  },
  headerSpacer: { width: 44, height: 44 },

  /* ── Resource bar ────────────────────────────────────────── */
  resourceBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#4A3917',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  resourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#241A0C',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#5A4A2E',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  resourceChipText: {
    fontFamily: 'Jersey10-Regular', fontSize: 18, color: PARCH,
  },
  crystalsButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4F3C1E',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#A89066',
    borderBottomWidth: 4,
    borderBottomColor: '#3A2C14',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  /* ── Crystals modal ──────────────────────────────────────── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: '#3A2C14',
    borderWidth: 2.5,
    borderColor: GOLD,
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontFamily: 'Jersey10-Regular', fontSize: 24, color: PARCH,
    textAlign: 'center', letterSpacing: 1, marginBottom: 12,
  },
  modalScroll: { flexGrow: 0 },
  modalGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10,
  },
  crystalSlot: {
    width: 88,
    alignItems: 'center',
    backgroundColor: '#241A0C',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#5A4A2E',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  crystalSlotEmpty: { opacity: 0.4 },
  crystalSlotName: {
    fontFamily: 'Jersey10-Regular', fontSize: 13, color: '#C9A867',
    textAlign: 'center', marginTop: 4, minHeight: 30,
  },
  crystalSlotQty: {
    fontFamily: 'Jersey10-Regular', fontSize: 18, color: PARCH, marginTop: 2,
  },
  modalCloseBtn: {
    marginTop: 14,
    alignSelf: 'center',
    backgroundColor: '#4F3C1E',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#84735B',
    borderBottomWidth: 4,
    borderBottomColor: '#241A0C',
    paddingHorizontal: 28,
    paddingVertical: 8,
  },
  modalCloseText: {
    fontFamily: 'Jersey10-Regular', fontSize: 18, color: PARCH, letterSpacing: 1,
  },

  /* ── Scroll body ─────────────────────────────────────────── */
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 60 },
  introText: {
    fontFamily: 'Jersey10-Regular', fontSize: 16, color: '#E8C98A',
    textAlign: 'center', marginBottom: 14, opacity: 0.9,
  },

  /* ── Improvement card ────────────────────────────────────── */
  card: {
    backgroundColor: '#3A2C14',
    borderWidth: 2.5,
    borderColor: '#84735B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    position: 'relative',
  },
  cardShadow: {
    position: 'absolute', left: -1, right: -1, bottom: -5, height: 10,
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    backgroundColor: '#1E1408', zIndex: -1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 52, height: 52, borderRadius: 8,
    borderWidth: 2, borderColor: '#5A4A2E', backgroundColor: '#241A0C',
    justifyContent: 'center', alignItems: 'center',
  },
  titleCol: { flex: 1, marginLeft: 12 },
  cardName: {
    fontFamily: 'Jersey10-Regular', fontSize: 22, color: PARCH, letterSpacing: 0.5,
  },
  cardBlurb: {
    fontFamily: 'Jersey10-Regular', fontSize: 14, color: '#C9A867', marginTop: -2,
  },
  levelBadge: {
    flexDirection: 'row', alignItems: 'baseline',
    backgroundColor: '#241A0C', borderRadius: 6,
    borderWidth: 1.5, borderColor: GOLD,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  levelBadgeText: { fontFamily: 'Jersey10-Regular', fontSize: 18, color: theme.COLORS.warmGlow },
  levelBadgeMax: { fontFamily: 'Jersey10-Regular', fontSize: 13, color: '#8A6E44', marginLeft: 2 },

  /* ── Stat progression ────────────────────────────────────── */
  statRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  statPill: {
    backgroundColor: '#241A0C', borderRadius: 6,
    borderWidth: 1.5, borderColor: '#5A4A2E',
    paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center', minWidth: 92,
  },
  statPillNext: { borderColor: theme.COLORS.healthGreen, backgroundColor: '#16240F' },
  statPillLabel: { fontFamily: 'Silkscreen-Regular', fontSize: 8, color: '#8A6E44', letterSpacing: 0.5 },
  statPillLabelNext: { fontFamily: 'Silkscreen-Regular', fontSize: 8, color: '#6FB37E', letterSpacing: 0.5 },
  statPillValue: { fontFamily: 'Jersey10-Regular', fontSize: 18, color: PARCH, marginTop: 1 },
  statPillValueNext: { fontFamily: 'Jersey10-Regular', fontSize: 18, color: '#9BE6A6', marginTop: 1 },
  statArrow: { fontSize: 16, color: theme.COLORS.candleGold },

  /* ── Cost + upgrade ──────────────────────────────────────── */
  cardBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, gap: 10,
  },
  costRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, flex: 1 },
  costChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#241A0C', borderRadius: 6,
    borderWidth: 1.5, borderColor: '#5A4A2E',
    paddingHorizontal: 6, paddingVertical: 3,
  },
  costChipText: { fontFamily: 'Jersey10-Regular', fontSize: 15 },
  costOk: { color: '#9BE6A6' },
  costBad: { color: '#E08A7A' },

  upgradeBtn: {
    backgroundColor: '#1B4030', borderRadius: 8,
    borderWidth: 2, borderColor: '#4F856C',
    borderBottomWidth: 4, borderBottomColor: '#0D2118',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  upgradeBtnDisabled: {
    backgroundColor: '#2E2214', borderColor: '#4A3917', borderBottomColor: '#241A0C',
  },
  upgradeBtnText: {
    fontFamily: 'Jersey10-Regular', fontSize: 18, color: '#B7F0C4', letterSpacing: 0.5,
  },
  upgradeBtnTextDisabled: { color: '#8A6E44' },

  maxBanner: {
    flex: 1, backgroundColor: '#241A0C', borderRadius: 8,
    borderWidth: 1.5, borderColor: GOLD, paddingVertical: 8, alignItems: 'center',
  },
  maxBannerText: {
    fontFamily: 'Jersey10-Regular', fontSize: 18, color: theme.COLORS.warmGlow, letterSpacing: 1,
  },
});
