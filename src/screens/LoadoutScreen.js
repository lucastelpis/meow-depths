/**
 * LoadoutScreen.js — Mochi's Loadout (Character · Inventory)
 *
 * Replaces the old InventoryScreen as the hub's gear-management screen.
 * Two top-level tabs:
 *   - Character: hero card, attribute boxes, 8-slot equipment grid, tips
 *   - Inventory: consumables / crafting / owned gear (carried over for now)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect } from 'react-native-svg';

import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { calculateEffectiveStats } from '../logic/progressionEngine';
import AnimatedSprite from '../components/AnimatedSprite';
import ResourceBar from '../components/ui/ResourceBar';
import { HERO_SPRITE } from '../constants/sprites';
import { GEAR, getGearForSlot } from '../data/gear';
import InventoryScreen from './InventoryScreen';

const HERO_AVATAR_DISPLAY_SIZE = 80;

// ─── Equipment slot config ────────────────────────────────────────────────────
const SLOT_CONFIG = [
  { key: 'head',     label: 'Head',     emoji: '🪖' },
  { key: 'chest',    label: 'Chest',    emoji: '🛡️' },
  { key: 'gloves',   label: 'Gloves',   emoji: '🧤' },
  { key: 'legs',     label: 'Legs',     emoji: '👖' },
  { key: 'boots',    label: 'Boots',    emoji: '👢' },
  { key: 'weapon',   label: 'Weapon',   emoji: '⚔️' },
  { key: 'trinket1', label: 'Trinket',  emoji: '💎' },
  { key: 'trinket2', label: 'Trinket',  emoji: '💎' },
];

// Slot keys laid out per row of the equipment grid
const SLOT_ROWS = [
  ['head', 'chest'],
  ['gloves', 'legs'],
  ['boots'],
  ['weapon', 'trinket1', 'trinket2'],
];

// ─── Top-level tabs ────────────────────────────────────────────────────────────
const LOADOUT_TABS = [
  { key: 'character', icon: '🐱' },
  { key: 'inventory', icon: '🎒' },
];

export default function LoadoutScreen() {
  const navigation = useNavigation();
  const { state, dispatch } = useGame();
  const { hero } = state;

  const [activeTab, setActiveTab] = useState('character');
  const [selectedSlot, setSelectedSlot] = useState(null);

  const effectiveStats = useMemo(() => calculateEffectiveStats(hero), [hero]);

  const emptySlotCount = useMemo(
    () => SLOT_CONFIG.filter(({ key }) => !hero.gear?.[key]).length,
    [hero.gear],
  );

  // Base stats (no gear) for the "+gear bonus" annotations
  const baseStats = useMemo(() => {
    const strength = hero.strength || 10;
    const agility = hero.agility || 10;
    return {
      attack: strength * 1,
      defence: 0,
      critChance: agility * 0.005,
      dodge: agility * 0.005,
      maxHp: (hero.vitality || 10) * 5,
    };
  }, [hero.strength, hero.agility, hero.vitality]);

  const pct = (v) => `${Math.round((v || 0) * 100)}%`;

  const statSummary = (gearDef) => {
    if (!gearDef?.stats) return '';
    const parts = [];
    if (gearDef.stats.attack)     parts.push(`ATK +${gearDef.stats.attack}`);
    if (gearDef.stats.defence)    parts.push(`DEF +${gearDef.stats.defence}`);
    if (gearDef.stats.maxHp)      parts.push(`HP +${gearDef.stats.maxHp}`);
    if (gearDef.stats.critChance) parts.push(`CRIT +${pct(gearDef.stats.critChance)}`);
    if (gearDef.stats.dodge)      parts.push(`DODGE +${pct(gearDef.stats.dodge)}`);
    return parts.join('  ');
  };

  // Stat-by-stat delta of `candidate` vs the currently equipped piece, for the
  // "compare items" popup. Returns an array of { label, text, positive }.
  const statDeltas = (candidateDef, currentDef) => {
    const STAT_FIELDS = [
      { key: 'attack',     label: 'ATK',   percent: false },
      { key: 'defence',    label: 'DEF',   percent: false },
      { key: 'maxHp',      label: 'HP',    percent: false },
      { key: 'critChance', label: 'CRIT',  percent: true },
      { key: 'dodge',      label: 'DODGE', percent: true },
    ];
    const deltas = [];
    STAT_FIELDS.forEach(({ key, label, percent }) => {
      const a = candidateDef?.stats?.[key] || 0;
      const b = currentDef?.stats?.[key] || 0;
      const diff = a - b;
      if (Math.abs(diff) < 0.0001) return;
      const sign = diff > 0 ? '+' : '';
      const text = percent
        ? `${sign}${Math.round(diff * 100)}%`
        : `${sign}${diff}`;
      deltas.push({ label, text, positive: diff > 0 });
    });
    return deltas;
  };

  // Data for the equipment slot popup (comparison list or empty-state)
  const selectedSlotConfig = SLOT_CONFIG.find(({ key }) => key === selectedSlot);
  const currentGearId = selectedSlot ? hero.gear?.[selectedSlot] : null;
  const currentGearDef = currentGearId ? GEAR[currentGearId] : null;
  const slotCandidates = useMemo(() => {
    if (!selectedSlot) return [];
    const ownedIds = hero.inventory?.craftedGear || [];
    return getGearForSlot(selectedSlot).filter((item) => ownedIds.includes(item.id));
  }, [selectedSlot, hero.inventory?.craftedGear]);

  const handleEquipFromSlot = (gearId) => {
    dispatch({ type: 'EQUIP_GEAR', payload: { slot: selectedSlot, gearId } });
    setSelectedSlot(null);
  };

  const handleGoToShop = () => {
    setSelectedSlot(null);
    navigation.navigate('Shop');
  };

  // ── Render ────────────────────────────────────────────────────────────────────
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
        <View style={styles.headerTabs}>
          {LOADOUT_TABS.map(({ key, icon }) => {
            const isActive = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.headerTabBtn, isActive && styles.headerTabBtnActive]}
                onPress={() => setActiveTab(key)}
                activeOpacity={0.8}
              >
                <Text style={styles.headerTabIcon}>{icon}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tab content */}
      {activeTab === 'character' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ── Section 1: Hero Card ── */}
          <View style={[styles.heroCard, theme.SHADOWS.cardShadow]}>
            <View style={StyleSheet.absoluteFill}>
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient id="heroCardGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#2A1E0A" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#1A1200" stopOpacity="1" />
                  </LinearGradient>
                  <RadialGradient id="heroAvatarGlow" cx="22%" cy="50%" rx="35%" ry="60%">
                    <Stop offset="0%" stopColor="#E8A73A" stopOpacity="0.12" />
                    <Stop offset="100%" stopColor="#E8A73A" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#heroCardGrad)" rx={20} />
                <Rect width="100%" height="100%" fill="url(#heroAvatarGlow)" rx={20} />
              </Svg>
            </View>

            <View style={styles.cardBorderOverlay}>
              <Svg width="100%" height="100%">
                <Rect x="6" y="6" width="96%" height="91%" rx={14} fill="none" stroke="rgba(212, 167, 84, 0.08)" strokeWidth="1" />
              </Svg>
            </View>

            {/* Gold chip */}
            <View style={styles.goldChip}>
              <Text style={styles.goldChipText}>💰 {hero.gold}</Text>
            </View>

            {/* Avatar & level badge */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                <AnimatedSprite
                  {...HERO_SPRITE.idle}
                  fps={8}
                  loop={true}
                  displaySize={HERO_AVATAR_DISPLAY_SIZE}
                />
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{hero.level}</Text>
              </View>
            </View>

            {/* Identity & HP */}
            <View style={styles.heroDetails}>
              <Text style={styles.heroName}>{hero.name}</Text>
              <View style={styles.gaugesStack}>
                <ResourceBar
                  variant="heroHp"
                  label="HP"
                  current={hero.hp}
                  max={effectiveStats.maxHp}
                />
              </View>
            </View>
          </View>

          {/* ── Section 2: Attribute Boxes ── */}
          <Text style={styles.sectionTitle}>💪 Core Attributes</Text>
          <View style={styles.statsGrid}>
            <StatBox label="STR" value={hero.strength || 10} emoji="💪" />
            <StatBox label="AGI" value={hero.agility || 10} emoji="🏃" />
            <StatBox label="VIT" value={hero.vitality || 10} emoji="💚" />
            <View style={{ flex: 1 }} />
            <View style={{ flex: 1 }} />
          </View>

          <Text style={styles.sectionTitle}>📊 Combat Stats</Text>
          <View style={styles.statsGrid}>
            <StatBox
              label="ATK" emoji="⚔️"
              value={effectiveStats.attack}
              bonus={effectiveStats.attack - baseStats.attack}
            />
            <StatBox
              label="DEF" emoji="🛡️"
              value={effectiveStats.defence}
              bonus={effectiveStats.defence - baseStats.defence}
            />
            <StatBox
              label="HP" emoji="❤️" color="#EF4444"
              value={effectiveStats.maxHp}
              bonus={effectiveStats.maxHp - baseStats.maxHp}
            />
            <StatBox
              label="CRIT" emoji="💥" color="#FBBF24"
              value={pct(effectiveStats.critChance)}
              bonus={effectiveStats.critChance - baseStats.critChance}
              isPercent
            />
            <StatBox
              label="DODGE" emoji="💨" color="#06B6D4"
              value={pct(effectiveStats.dodge)}
              bonus={effectiveStats.dodge - baseStats.dodge}
              isPercent
            />
          </View>

          {/* ── Section 3: Equipment Grid ── */}
          <Text style={styles.sectionTitle}>🎽 Equipment</Text>
          <View style={styles.equipmentGrid}>
            {SLOT_ROWS.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.slotRow}>
                {row.map((slotKey) => {
                  const slotConfig = SLOT_CONFIG.find((s) => s.key === slotKey);
                  const gearId = hero.gear?.[slotKey];
                  const gearDef = gearId ? GEAR[gearId] : null;
                  const isEmpty = !gearDef;

                  return (
                    <TouchableOpacity
                      key={slotKey}
                      style={[styles.slotCard, isEmpty && styles.slotCardEmpty]}
                      onPress={() => setSelectedSlot(slotKey)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.slotEmoji}>{slotConfig.emoji}</Text>
                      <Text style={styles.slotLabel}>{slotConfig.label}</Text>
                      {isEmpty ? (
                        <Text style={styles.slotEmptyText}>Nothing here yet!</Text>
                      ) : (
                        <>
                          <Text style={styles.slotItemName} numberOfLines={1}>{gearDef.name}</Text>
                          {!!statSummary(gearDef) && (
                            <Text style={styles.slotItemStats} numberOfLines={1}>{statSummary(gearDef)}</Text>
                          )}
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })}
                {/* Pad row with empty flex spacers so shorter rows don't stretch */}
                {row.length < 3 && row.length > 0 && Array.from({ length: 3 - row.length }).map((_, i) => (
                  <View key={`spacer-${i}`} style={styles.slotSpacer} />
                ))}
              </View>
            ))}
          </View>

          {/* ── Section 4: Message Area ── */}
          <View style={[styles.messageBar, theme.SHADOWS.cardShadow]}>
            <Text style={styles.messageEmoji}>{emptySlotCount > 0 ? '💡' : '✨'}</Text>
            <Text style={styles.messageText}>
              {emptySlotCount > 0
                ? `${emptySlotCount} slot${emptySlotCount === 1 ? '' : 's'} empty — visit the Shop or craft new gear to fill them out!`
                : 'Fully geared up! Check the Inventory tab to manage your gear.'}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <InventoryScreen />
      )}

      {/* ── Equipment Slot Popup ── */}
      <Modal
        visible={!!selectedSlot}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSlot(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedSlot(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {slotCandidates.length > 0 ? `Choose a ${selectedSlotConfig?.label}` : `No ${selectedSlotConfig?.label} Yet`}
              </Text>
              <TouchableOpacity onPress={() => setSelectedSlot(null)} activeOpacity={0.7}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {slotCandidates.length > 0 ? (
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {slotCandidates.map((item) => {
                  const isEquipped = item.id === currentGearId;
                  const deltas = statDeltas(item, currentGearDef);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.compareRow, isEquipped && styles.compareRowEquipped]}
                      onPress={() => !isEquipped && handleEquipFromSlot(item.id)}
                      activeOpacity={isEquipped ? 1 : 0.8}
                      disabled={isEquipped}
                    >
                      <View style={styles.compareRowHeader}>
                        <Text style={styles.compareItemName}>{item.name}</Text>
                        {isEquipped && (
                          <View style={styles.equippedBadge}>
                            <Text style={styles.equippedBadgeText}>WORN NOW</Text>
                          </View>
                        )}
                      </View>
                      {!!statSummary(item) && (
                        <Text style={styles.compareItemStats}>{statSummary(item)}</Text>
                      )}
                      {!isEquipped && deltas.length > 0 && (
                        <View style={styles.deltaRow}>
                          {deltas.map((d) => (
                            <Text
                              key={d.label}
                              style={[styles.deltaText, { color: d.positive ? '#5CC489' : '#EF4444' }]}
                            >
                              {d.label} {d.text}
                            </Text>
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyStateBody}>
                <Text style={styles.emptyStateEmoji}>{selectedSlotConfig?.emoji}</Text>
                <Text style={styles.emptyStateText}>
                  No {selectedSlotConfig?.label} gear owned yet. Visit the Shop to find gear for this slot!
                </Text>
                <TouchableOpacity style={styles.shopBtn} onPress={handleGoToShop} activeOpacity={0.8}>
                  <Text style={styles.shopBtnText}>Go to Shop →</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── StatBox ─────────────────────────────────────────────────────────────────
function StatBox({ label, value, emoji, color = '#D4A754', bonus, isPercent }) {
  const showBonus = bonus !== undefined && Math.abs(bonus) > 0.0001;
  const bonusText = isPercent ? `+${Math.round(bonus * 100)}%` : `+${bonus}`;
  return (
    <View style={styles.statBox}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Rect width="100%" height="100%" fill="rgba(255,255,255,0.02)" rx={12} />
        <Rect x="1" y="1" width="98%" height="98%" rx={11} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      </Svg>
      <View style={styles.statBoxInner}>
        <Text style={styles.statEmoji}>{emoji}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {showBonus && (
          <Text style={styles.statBonus}>{bonusText} gear</Text>
        )}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.COLORS.hearthBlack,
  },

  /* ── Header ──────────────────────────────────────────────── */
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
    marginLeft: 4,
  },
  headerTabs: {
    flexDirection: 'row',
    gap: 6,
  },
  headerTabBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  headerTabBtnActive: {
    backgroundColor: 'rgba(212,167,84,0.12)',
    borderColor: 'rgba(212,167,84,0.4)',
  },
  headerTabIcon: {
    fontSize: 18,
  },

  /* ── Scroll ──────────────────────────────────────────────── */
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  /* ── Hero Card ───────────────────────────────────────────── */
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 20,
  },
  cardBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  goldChip: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  goldChipText: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 11,
    color: '#FBBF24',
  },
  avatarContainer: {
    position: 'relative',
    width: 74,
    height: 74,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1.5,
    borderColor: '#D4A754',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D4A754',
    borderWidth: 1.5,
    borderColor: '#1A1200',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: {
    fontFamily: 'System',
    color: '#1A1200',
    fontWeight: '900',
    fontSize: 9,
    textAlign: 'center',
  },
  heroDetails: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  heroName: {
    ...theme.FONTS.display,
    fontSize: 18,
    color: theme.COLORS.ghostWhite,
    marginBottom: 8,
  },
  gaugesStack: {
    gap: theme.SPACING.tight,
  },

  /* ── Attribute / Stat boxes ──────────────────────────────── */
  sectionTitle: {
    fontFamily: 'System',
    fontWeight: '800',
    fontSize: 13,
    color: theme.COLORS.parchment,
    marginBottom: 8,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    minHeight: 80,
    overflow: 'hidden',
  },
  statBoxInner: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    zIndex: 2,
    gap: 2,
  },
  statEmoji: { fontSize: 14 },
  statLabel: {
    fontFamily: 'System',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#707F94',
    letterSpacing: 0.5,
  },
  statValue: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '900',
  },
  statBonus: {
    fontFamily: 'System',
    fontSize: 8,
    fontWeight: '700',
    color: '#5CC489',
  },

  /* ── Equipment Grid ──────────────────────────────────────── */
  equipmentGrid: {
    marginBottom: 16,
    gap: 8,
  },
  slotRow: {
    flexDirection: 'row',
    gap: 8,
  },
  slotCard: {
    flex: 1,
    minHeight: 76,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,167,84,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(212,167,84,0.25)',
    gap: 2,
  },
  slotCardEmpty: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  slotSpacer: {
    flex: 1,
  },
  slotEmoji: {
    fontSize: 18,
  },
  slotLabel: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#707F94',
    letterSpacing: 0.5,
  },
  slotItemName: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '800',
    color: theme.COLORS.parchment,
    textAlign: 'center',
  },
  slotItemStats: {
    fontFamily: 'System',
    fontSize: 8,
    fontWeight: '700',
    color: '#5CC489',
    textAlign: 'center',
  },
  slotEmptyText: {
    fontFamily: 'System',
    fontSize: 9,
    fontStyle: 'italic',
    color: '#707F94',
    textAlign: 'center',
  },

  /* ── Message Area ────────────────────────────────────────── */
  messageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(212,167,84,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(212,167,84,0.15)',
    marginBottom: 8,
  },
  messageEmoji: {
    fontSize: 18,
  },
  messageText: {
    flex: 1,
    fontFamily: 'System',
    fontSize: 12,
    color: theme.COLORS.parchment,
    lineHeight: 16,
  },

  /* ── Equipment Slot Popup ────────────────────────────────── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: '#1A1200',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(212,167,84,0.25)',
    padding: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    ...theme.FONTS.display,
    fontSize: 16,
    color: theme.COLORS.parchment,
    flex: 1,
    marginRight: 8,
  },
  modalCloseText: {
    color: theme.COLORS.candleGold,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalList: {
    maxHeight: 400,
  },

  /* Comparison rows */
  compareRow: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  compareRowEquipped: {
    backgroundColor: 'rgba(212,167,84,0.08)',
    borderColor: 'rgba(212,167,84,0.3)',
  },
  compareRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compareItemName: {
    fontFamily: 'System',
    fontWeight: '800',
    fontSize: 14,
    color: theme.COLORS.parchment,
  },
  compareItemStats: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#A8B0BD',
  },
  equippedBadge: {
    backgroundColor: 'rgba(212,167,84,0.18)',
    borderColor: 'rgba(212,167,84,0.4)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  equippedBadgeText: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: '900',
    color: '#D4A754',
    letterSpacing: 0.5,
  },
  deltaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  deltaText: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '800',
  },

  /* Empty-state body */
  emptyStateBody: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  emptyStateEmoji: {
    fontSize: 40,
  },
  emptyStateText: {
    fontFamily: 'System',
    fontSize: 13,
    color: theme.COLORS.parchment,
    textAlign: 'center',
    lineHeight: 18,
  },
  shopBtn: {
    backgroundColor: 'rgba(212,167,84,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(212,167,84,0.4)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  shopBtnText: {
    fontFamily: 'System',
    fontWeight: '800',
    fontSize: 13,
    color: theme.COLORS.candleGold,
  },
});
