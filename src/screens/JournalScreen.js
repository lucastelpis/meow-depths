/**
 * JournalScreen.js — The Journal (Bestiary + Field Notes)
 *
 * Two tabs:
 *   Creatures — bestiary cards for creatures the player has encountered
 *               (hidden until first encounter). Sprite + name + rarity + region
 *               + possible drops + a short lore blurb.
 *   Notes     — per-region sub-tabs (unlocked as regions are opened) listing the
 *               collectible field notes awarded on first-time floor clears.
 *
 * Encounter / collection state lives in state.progress.encounteredCreatures and
 * state.progress.notesCollected (see gameState.js).
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { ZONES, FLOOR_MATERIAL_POOLS } from '../data/zones';
import { ENEMIES } from '../data/enemies';
import { MATERIALS } from '../data/gear';
import { NOTES, NOTE_SPRITE } from '../data/notes';
import { ENEMY_SPRITES, FALLBACK_ENEMY_SPRITE } from '../constants/sprites';
import SpriteFrame from '../components/SpriteFrame';
import ItemSprite from '../components/ItemSprite';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ZONE_IDS = ['zone1', 'zone2', 'zone3'];

// Short region labels for the Notes sub-tabs
const REGION_SHORT = {
  zone1: 'Soggy Ruins',
  zone2: 'Twisted Garden',
  zone3: 'Sunken Docks',
};

// Per-region accent color (cold palette per region tint)
const REGION_ACCENT = {
  zone1: '#3FB56E',
  zone2: '#A855F7',
  zone3: '#06B6D4',
};

// A creature's representative drops = the region's crystal material pool.
// Bosses additionally guarantee the region's core crystal. All resolvable in MATERIALS.
function getCreatureDropIds(enemy, zoneId) {
  const pools = FLOOR_MATERIAL_POOLS[zoneId] || [];
  const ids = [];
  for (const p of pools) {
    for (const m of p.allowed) if (!ids.includes(m)) ids.push(m);
  }
  if (enemy.isBoss) {
    const big = ids.find((id) => id.endsWith('_big'));
    if (big) {
      const core = big.replace('_big', '_core');
      if (MATERIALS[core] && !ids.includes(core)) ids.push(core);
    }
  }
  return ids.filter((id) => MATERIALS[id]);
}

function isZoneUnlocked(zone, progress) {
  if (!zone.unlockCondition) return true;
  return !!progress[zone.unlockCondition];
}

function CreatureCard({ enemy, zoneId }) {
  const sprite = ENEMY_SPRITES[enemy.id] || FALLBACK_ENEMY_SPRITE;
  const accent = REGION_ACCENT[zoneId] || theme.COLORS.coldBlue;
  const dropIds = getCreatureDropIds(enemy, zoneId);

  return (
    <View style={[styles.card, { borderColor: `${accent}55` }]}>
      <View style={styles.cardTop}>
        <View style={[styles.spriteBox, { borderColor: `${accent}40`, backgroundColor: `${accent}10` }]}>
          {/* Rendered larger than the box so the sprite's transparent padding
              is clipped by overflow:hidden — i.e. a zoom-in on the creature. */}
          <SpriteFrame
            source={sprite.idle.source}
            frameSize={sprite.idle.frameSize}
            totalFrames={sprite.idle.frames}
            frameIndex={sprite.idle.startFrame !== undefined ? sprite.idle.startFrame : 0}
            displaySize={120}
          />
        </View>

        <View style={styles.cardHeadInfo}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName} numberOfLines={1}>{enemy.name}</Text>
            {enemy.isBoss && (
              <View style={[styles.bossTag, { borderColor: accent }]}>
                <Text style={[styles.bossTagText, { color: accent }]}>BOSS</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardRegion}>{ZONES[zoneId].name}</Text>

          {dropIds.length > 0 && (
            <View style={styles.dropRow}>
              <Text style={styles.dropLabel}>DROPS</Text>
              {dropIds.map((id) => (
                <ItemSprite
                  key={id}
                  spritesheet={MATERIALS[id].spritesheet}
                  frameIndex={MATERIALS[id].frameIndex}
                  displaySize={20}
                />
              ))}
            </View>
          )}
        </View>
      </View>

      <Text style={styles.cardLore}>{enemy.lore}</Text>
    </View>
  );
}

export default function JournalScreen({ navigation, route }) {
  const { state, dispatch } = useGame();
  const { progress } = state;
  const insets = useSafeAreaInsets();

  const routeParams = route?.params || {};
  const [tab, setTab] = useState(routeParams.initialTab || 'creatures');

  useEffect(() => {
    if (routeParams.initialTab) {
      setTab(routeParams.initialTab);
    }
  }, [routeParams.initialTab]);

  const unlockedZones = ZONE_IDS.filter((id) => isZoneUnlocked(ZONES[id], progress));
  const [region, setRegion] = useState(unlockedZones[0] || 'zone1');
  const [openNote, setOpenNote] = useState(null);

  const encountered = progress.encounteredCreatures || {};
  const notesCollected = progress.notesCollected || {};
  const readNotes = progress.readNotes || {};

  // Region sub-tabs (only unlocked regions) — shared by both Creatures and Notes
  const regionTabs = (
    <View style={styles.regionTabBar}>
      {unlockedZones.map((zoneId) => {
        const active = region === zoneId;
        const accent = REGION_ACCENT[zoneId];
        return (
          <TouchableOpacity
            key={zoneId}
            style={[styles.regionTab, active && { borderColor: accent, backgroundColor: `${accent}1A` }]}
            onPress={() => setRegion(zoneId)}
            activeOpacity={0.8}
          >
            <Text style={[styles.regionTabText, active && { color: accent }]}>{REGION_SHORT[zoneId]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backText}>← Hub</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <ItemSprite spritesheet="icons-map" frameIndex={121} displaySize={20} />
          <Text style={styles.title}>Journal</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Top tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'creatures', label: 'Creatures' },
          { key: 'notes', label: 'Notes' },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── CREATURES TAB ────────────────────────────────────────── */}
      {tab === 'creatures' && (
        <View style={{ flex: 1 }}>
          {regionTabs}
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {(() => {
              const zone = ZONES[region];
              const ids = [...zone.enemies, zone.bossId];
              const seenIds = ids.filter((id) => encountered[id]);
              if (seenIds.length === 0) {
                return <Text style={styles.emptyText}>No creatures discovered here yet.</Text>;
              }
              return seenIds.map((id) => (
                <CreatureCard key={id} enemy={ENEMIES[id]} zoneId={region} />
              ));
            })()}
          </ScrollView>
        </View>
      )}

      {/* ── NOTES TAB ────────────────────────────────────────────── */}
      {tab === 'notes' && (
        <View style={{ flex: 1 }}>
          {regionTabs}

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {(() => {
              const collectedNotes = (NOTES[region] || []).filter((note) => notesCollected[note.id]);
              if (collectedNotes.length === 0) {
                return <Text style={styles.emptyText}>No field notes recovered here yet.</Text>;
              }
              return collectedNotes.map((note) => {
                const isUnread = !readNotes[note.id];
                return (
                  <TouchableOpacity
                    key={note.id}
                    style={styles.noteRow}
                    activeOpacity={0.8}
                    onPress={() => {
                      setOpenNote(note);
                      dispatch({ type: 'MARK_NOTE_READ', payload: { noteId: note.id } });
                    }}
                  >
                    <ItemSprite spritesheet={NOTE_SPRITE.spritesheet} frameIndex={NOTE_SPRITE.frameIndex} displaySize={26} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.noteTitle}>{note.title}</Text>
                      <Text style={styles.noteSub} numberOfLines={1}>{note.context}</Text>
                    </View>
                    <Text style={styles.noteChevron}>›</Text>

                    {isUnread && (
                      <View style={styles.noteBadge}>
                        <Text style={styles.noteBadgeText}>!</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              });
            })()}
          </ScrollView>
        </View>
      )}

      {/* ── NOTE READER MODAL (parchment) ────────────────────────── */}
      <Modal visible={!!openNote} transparent animationType="fade" onRequestClose={() => setOpenNote(null)} statusBarTranslucent>
        <Pressable style={styles.readerOverlay} onPress={() => setOpenNote(null)}>
          <Pressable style={[styles.readerFrame, theme.SHADOWS.cardShadow]} onPress={() => {}}>
            <View style={styles.readerParchment}>
              <TouchableOpacity style={styles.readerClose} onPress={() => setOpenNote(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.readerCloseText}>✕</Text>
              </TouchableOpacity>

              {openNote && (
                <>
                  <Text style={styles.readerTitle}>{openNote.title}</Text>
                  <Text style={styles.readerContext}>{openNote.context}</Text>
                  <View style={styles.readerDivider} />
                  <ScrollView style={styles.readerScroll} showsVerticalScrollIndicator={false}>
                    <Text style={styles.readerBody}>{openNote.body}</Text>
                  </ScrollView>
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.COLORS.hubBg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  backButton: { width: 70, paddingVertical: 6, justifyContent: 'center' },
  backText: { fontFamily: 'Jersey10-Regular', fontSize: 16, color: theme.COLORS.candleGold, letterSpacing: 0.5 },
  titleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: {
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 20,
    color: '#F8FAFC',
    letterSpacing: 0.8,
  },
  headerSpacer: { width: 70 },

  // Top tabs
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.BORDER_RADIUS.button,
    borderWidth: 2,
    borderColor: theme.COLORS.panelBorderGold,
    backgroundColor: theme.COLORS.panelGreen,
    alignItems: 'center',
  },
  tabActive: {
    borderColor: theme.COLORS.candleGold,
    backgroundColor: 'rgba(232,167,58,0.12)',
  },
  tabText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    fontWeight: 'normal',
    color: 'rgba(207,224,238,0.55)',
    textTransform: 'uppercase',
  },
  tabTextActive: { color: theme.COLORS.warmGlow },

  scroll: { padding: 16, paddingBottom: 40 },

  emptyText: { ...theme.FONTS.body, fontSize: 12, color: 'rgba(207,224,238,0.35)', fontStyle: 'italic' },

  // Creature card
  card: {
    backgroundColor: theme.COLORS.panelGreen,
    borderRadius: theme.BORDER_RADIUS.card,
    borderWidth: 2,
    padding: 12,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row' },
  spriteBox: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardHeadInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  cardName: { fontFamily: 'Jersey10-Regular', fontSize: 16, color: theme.COLORS.ghostWhite, flexShrink: 1 },
  bossTag: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  bossTagText: { ...theme.FONTS.label, fontSize: 8 },
  cardRegion: { ...theme.FONTS.label, fontSize: 8, color: 'rgba(207,224,238,0.4)', marginTop: 3 },
  dropRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  dropLabel: { ...theme.FONTS.label, fontSize: 8, color: 'rgba(207,224,238,0.4)', marginRight: 2 },
  cardLore: {
    ...theme.FONTS.body,
    fontSize: 12,
    color: 'rgba(207,224,238,0.7)',
    marginTop: 10,
    fontStyle: 'italic',
  },

  // Notes region sub-tabs
  regionTabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  regionTab: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: theme.BORDER_RADIUS.pill,
    borderWidth: 1.5,
    borderColor: theme.COLORS.panelBorderGold,
    backgroundColor: theme.COLORS.panelGreen,
  },
  regionTabText: { fontFamily: 'Jersey10-Regular', fontSize: 12, color: 'rgba(207,224,238,0.55)' },

  // Note rows
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.COLORS.panelGreen,
    borderRadius: theme.BORDER_RADIUS.card,
    borderWidth: 1.5,
    borderColor: theme.COLORS.panelBorderGold,
    padding: 12,
    marginBottom: 10,
  },
  noteTitle: { fontFamily: 'Jersey10-Regular', fontSize: 14, color: theme.COLORS.warmGlow },
  noteSub: { ...theme.FONTS.small, fontSize: 9, color: 'rgba(207,224,238,0.4)', marginTop: 2 },
  noteChevron: { fontSize: 22, color: theme.COLORS.candleGold, marginLeft: 6 },
  noteBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.COLORS.damageRed || '#D8483F',
    borderColor: '#4A3917',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  noteBadgeText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: '#FFF3DA',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 8,
    marginTop: -1,
  },

  // Note reader modal (parchment)
  readerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24,14,6,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 20,
  },
  readerFrame: {
    width: '100%',
    maxWidth: SCREEN_WIDTH - 16,
    maxHeight: '90%',
    backgroundColor: '#6E4524',
    borderColor: '#3A2210',
    borderWidth: 3,
    borderRadius: 12,
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  readerParchment: {
    backgroundColor: '#ECD8A6',
    borderRadius: 12,
    borderColor: '#C9A86A',
    borderWidth: 2,
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 18,
    maxHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 1,
  },
  readerClose: { position: 'absolute', top: 8, right: 10, zIndex: 5 },
  readerCloseText: { fontSize: 18, color: '#6E4524', fontWeight: 'bold' },
  readerTitle: { fontFamily: 'Jersey10-Regular', fontSize: 18, color: '#4A3417', marginBottom: 6, paddingRight: 20 },
  readerContext: { ...theme.FONTS.body, fontSize: 11, color: '#7A5C30', fontStyle: 'italic' },
  readerDivider: { height: 1, backgroundColor: '#C9A86A', marginVertical: 12 },
  readerScroll: { maxHeight: SCREEN_HEIGHT * 0.65, flexShrink: 1 },
  readerBody: { ...theme.FONTS.body, fontSize: 13, lineHeight: 21, color: '#3A2C16' },
});
