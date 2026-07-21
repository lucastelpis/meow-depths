/**
 * QuestScreen.js — The Quests Screen
 *
 * Two tabs:
 *   Dailies   — lists the 3 randomly generated daily quests (refreshed at midnight).
 *   Campaign  — lists the persistent campaign milestones.
 *
 * Quest progress and reward claims dispatch state actions (e.g. CLAIM_QUEST_REWARD).
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import ItemSprite from '../components/ItemSprite';
import ParchmentModal from '../components/ui/ParchmentModal';
import { isQuestUnlocked } from '../data/quests';
import { CONSUMABLES } from '../data/gear';
import { getItemInfo } from '../data/itemInfo';

export default function QuestScreen({ navigation }) {
  const { state, dispatch } = useGame();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('dailies');
  const [campaignSubTab, setCampaignSubTab] = useState('active');
  const [nowTs, setNowTs] = useState(Date.now());
  const [celebrationQuest, setCelebrationQuest] = useState(null);
  const [expandedQuestId, setExpandedQuestId] = useState(null);
  const [infoModal, setInfoModal] = useState(null); // { title: string, desc: string }

  // Reset expanded quest state when tab changes
  useEffect(() => {
    setExpandedQuestId(null);
  }, [tab, campaignSubTab]);

  // Tick every second to keep the reset countdown live
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Ensure daily quests are generated on screen focus
  useFocusEffect(
    React.useCallback(() => {
      const dateStr = new Date().toDateString();
      dispatch({ type: 'GENERATE_DAILY_QUESTS', payload: { dateStr } });
    }, [dispatch])
  );

  const questsState = state.progress.questsState || { dailies: [], campaign: [] };
  const dailies = questsState.dailies || [];
  const campaign = questsState.campaign || [];

  const sortedDailies = useMemo(() => {
    return [...dailies].sort((a, b) => {
      const getScore = (q) => {
        if (q.completed && !q.claimed) return 1;
        if (!q.completed) return 2;
        return 3;
      };
      return getScore(a) - getScore(b);
    });
  }, [dailies]);

  const activeCampaign = useMemo(() => {
    const filtered = campaign.filter((quest) => !quest.claimed && isQuestUnlocked(quest, campaign, state.progress));
    return [...filtered].sort((a, b) => {
      const aClaimable = a.completed && !a.claimed;
      const bClaimable = b.completed && !b.claimed;
      if (aClaimable && !bClaimable) return -1;
      if (!aClaimable && bClaimable) return 1;
      return 0;
    });
  }, [campaign, state.progress]);

  const completedCampaign = useMemo(() => {
    return campaign.filter((quest) => quest.claimed);
  }, [campaign]);

  // Time until the daily reward resets (next local midnight), formatted HH:MM
  const resetCountdown = useMemo(() => {
    const next = new Date(nowTs);
    next.setHours(24, 0, 0, 0); // next midnight
    const diffMs = Math.max(0, next.getTime() - nowTs);
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }, [nowTs]);

  const getCrystalFrame = (itemId) => {
    let base = 0;
    if (itemId.includes('green')) base = 4;
    else if (itemId.includes('yellow')) base = 8;

    if (itemId.includes('shard')) return base + 0;
    if (itemId.includes('small')) return base + 1;
    if (itemId.includes('big')) return base + 2;
    if (itemId.includes('core')) return base + 3;
    return base;
  };


  const renderRewardChip = (type, key, qty) => {
    const lowerKey = key.toLowerCase();
    const info = getItemInfo(key);

    const handlePressInfo = () => {
      setInfoModal(info);
    };

    if (lowerKey === 'gold') {
      return (
        <View key={key} style={styles.rewardMiniChip}>
          <TouchableOpacity style={styles.infoTagSmall} onPress={handlePressInfo} activeOpacity={0.7}>
            <Text style={styles.infoTagText}>?</Text>
          </TouchableOpacity>
          <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={36} />
          <Text style={styles.rewardMiniText}>{qty} G</Text>
        </View>
      );
    } else if (type === 'consumables') {
      const def = CONSUMABLES.find(c => c.id === lowerKey);
      const frame = def ? def.frameIndex : 0;
      return (
        <View key={key} style={styles.rewardMiniChip}>
          <TouchableOpacity style={styles.infoTagSmall} onPress={handlePressInfo} activeOpacity={0.7}>
            <Text style={styles.infoTagText}>?</Text>
          </TouchableOpacity>
          <ItemSprite spritesheet="consumables-1" frameIndex={frame} displaySize={36} />
          <Text style={styles.rewardMiniText}><Text style={{ fontSize: 11 }}>x</Text>{qty}</Text>
        </View>
      );
    } else if (type === 'materials') {
      const frame = getCrystalFrame(lowerKey);
      return (
        <View key={key} style={styles.rewardMiniChip}>
          <TouchableOpacity style={styles.infoTagSmall} onPress={handlePressInfo} activeOpacity={0.7}>
            <Text style={styles.infoTagText}>?</Text>
          </TouchableOpacity>
          <ItemSprite spritesheet="crystals-1" frameIndex={frame} displaySize={36} />
          <Text style={styles.rewardMiniText}><Text style={{ fontSize: 11 }}>x</Text>{qty}</Text>
        </View>
      );
    }
    return null;
  };

  const getItemName = (itemId) => {
    const normalized = itemId.toLowerCase();
    if (normalized === 'gold') return 'Gold';
    const def = CONSUMABLES.find(c => c.id === normalized);
    if (def) return def.name;

    return normalized
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderCelebrationRewardChip = (type, key, qty) => {
    const lowerKey = key.toLowerCase();
    let sprite = null;
    const displayName = getItemName(key);

    if (lowerKey === 'gold') {
      sprite = <ItemSprite spritesheet="icons-1" frameIndex={11} displaySize={32} />;
    } else if (type === 'consumables') {
      const def = CONSUMABLES.find(c => c.id === lowerKey);
      const frame = def ? def.frameIndex : 0;
      sprite = <ItemSprite spritesheet="consumables-1" frameIndex={frame} displaySize={32} />;
    } else if (type === 'materials') {
      const frame = getCrystalFrame(lowerKey);
      sprite = <ItemSprite spritesheet="crystals-1" frameIndex={frame} displaySize={32} />;
    }

    return (
      <View key={key} style={styles.drChip}>
        <TouchableOpacity
          style={styles.infoTagSmall}
          onPress={() => setInfoModal(getItemInfo(key))}
          activeOpacity={0.7}
        >
          <Text style={styles.infoTagText}>?</Text>
        </TouchableOpacity>
        {sprite}
        <Text style={styles.drChipQty}>
          {lowerKey === 'gold' ? `${qty} G` : <Text><Text style={{ fontSize: 10 }}>x</Text>{qty}</Text>}
        </Text>
        <Text style={styles.drChipLabel}>{displayName}</Text>
      </View>
    );
  };

  const renderQuestRow = (quest) => {
    const isCompleted = quest.completed;
    const isClaimed = quest.claimed;
    const isExpanded = expandedQuestId === quest.id;

    return (
      <View key={quest.id} style={styles.questRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setExpandedQuestId(isExpanded ? null : quest.id)}
          style={{ width: '100%' }}
        >
          <View style={styles.questTitleRow}>
            <Text style={styles.questTitle}>{quest.title}</Text>
            <View style={styles.chevronShadow}>
              <View style={styles.chevronBadge}>
                <Text style={styles.chevronText}>{isExpanded ? '▲' : '▼'}</Text>
              </View>
            </View>
          </View>

          {/* Visual progress bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, (quest.progress / quest.target) * 100)}%` }
              ]}
            />
            <View style={styles.progressBarTextWrapper}>
              <Text style={styles.progressBarText}>
                Progress: {quest.progress} / {quest.target}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <Text style={styles.questDesc}>{quest.desc}</Text>

            {/* Rewards Preview */}
            <View style={styles.questRewardsRow}>
              <Text style={styles.rewardsLabel}>Rewards:</Text>
              <View style={styles.rewardsList}>
                {quest.rewards.gold > 0 && renderRewardChip('gold', 'gold', quest.rewards.gold)}
                {quest.rewards.consumables && Object.entries(quest.rewards.consumables).map(([id, qty]) =>
                  renderRewardChip('consumables', id, qty)
                )}
                {quest.rewards.materials && Object.entries(quest.rewards.materials).map(([id, qty]) =>
                  renderRewardChip('materials', id, qty)
                )}
              </View>
            </View>

            {/* Claim / Status Button */}
            {isClaimed ? (
              <View style={styles.claimBtn}>
                <Text style={styles.claimBtnText}>CLAIMED</Text>
              </View>
            ) : !isCompleted ? (
              <View style={styles.claimBtn}>
                <Text style={styles.claimBtnText}>IN PROGRESS</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Uncollapsed/Collapsed Claim Reward Button at the bottom */}
        {isCompleted && !isClaimed && (
          <View style={[styles.claimBtnWrapper, { marginTop: isExpanded ? 10 : 8 }]}>
            <View style={styles.claimBtnShadow} />
            <TouchableOpacity
              style={styles.claimBtnOuter}
              activeOpacity={0.8}
              onPress={() => setCelebrationQuest(quest)}
            >
              <View style={styles.claimBtnInner}>
                <Text style={styles.claimBtnTextActive}>CLAIM REWARD</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerBackButtonWrapper}>
          {/* 1. Bevel Shadow Base */}
          <View style={styles.headerBackButtonBevelShadow} />

          {/* 2. Main Outer Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
            style={styles.headerBackButtonOuter}
          >
            {/* 3. Inner Highlight & Fill */}
            <View style={styles.headerBackButtonInner}>
              <ItemSprite
                spritesheet="icons-map"
                frameIndex={43}
                displaySize={26}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.headerTitleOuterBorder}>
          <View style={styles.headerTitleInnerBorder}>
            <Text style={styles.headerTitleText}>Quests</Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Top Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'dailies', label: 'Daily Tasks', frameIndex: 26 },
          { key: 'campaign', label: 'Campaign', frameIndex: 38 },
        ].map((t) => {
          const isActive = tab === t.key;
          return (
            <View key={t.key} style={styles.tabWrapper}>
              <View style={styles.tabShadow} />
              <TouchableOpacity
                style={styles.tabOuter}
                activeOpacity={0.8}
                onPress={() => setTab(t.key)}
              >
                <View style={[styles.tabInner, isActive ? styles.tabInnerActive : styles.tabInnerInactive]}>
                  <ItemSprite
                    spritesheet="icons-map"
                    frameIndex={t.frameIndex}
                    displaySize={16}
                    opacity={isActive ? 1.0 : 0.65}
                  />
                  <Text style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}>{t.label}</Text>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Campaign Sub-Tabs (only when campaign tab is selected) */}
      {tab === 'campaign' && (
        <View style={styles.subTabBar}>
          {[
            { key: 'active', label: 'ACTIVE' },
            { key: 'completed', label: 'COMPLETED' },
          ].map((st) => {
            const active = campaignSubTab === st.key;
            return (
              <TouchableOpacity
                key={st.key}
                style={[styles.subTab, active ? styles.subTabActive : styles.subTabInactive]}
                onPress={() => setCampaignSubTab(st.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.subTabText, active ? styles.subTabTextActive : styles.subTabTextInactive]}>
                  {st.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Content Section */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'dailies' && (
          <View style={{ flex: 1 }}>
            {/* Daily Countdown Panel */}
            <View style={styles.countdownPanel}>
              <Text style={styles.countdownLabel}>DAILY RESET IN</Text>
              <Text style={styles.countdownValue}>{resetCountdown}</Text>
            </View>

            {sortedDailies.length === 0 ? (
              <Text style={styles.emptyText}>No daily tasks active.</Text>
            ) : (
              sortedDailies.map((quest) => renderQuestRow(quest))
            )}
          </View>
        )}

        {tab === 'campaign' && (
          <View style={{ flex: 1 }}>
            {campaignSubTab === 'active' ? (
              activeCampaign.length === 0 ? (
                <Text style={styles.emptyText}>No active campaign milestones.</Text>
              ) : (
                activeCampaign.map((quest) => renderQuestRow(quest))
              )
            ) : (
              completedCampaign.length === 0 ? (
                <Text style={styles.emptyText}>No completed campaign milestones.</Text>
              ) : (
                completedCampaign.map((quest) => renderQuestRow(quest))
              )
            )}
          </View>
        )}
      </ScrollView>

      {/* Quest Reward Celebration Modal */}
      <Modal
        visible={!!celebrationQuest}
        transparent
        animationType="fade"
        onRequestClose={() => setCelebrationQuest(null)}
        statusBarTranslucent
      >
        <View style={styles.drOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setCelebrationQuest(null)}
          />
          <View style={[styles.drFrame, theme.SHADOWS.cardShadow]}>
            <View style={styles.drParchment}>
              <View style={styles.drBevel} pointerEvents="none" />

              {/* Header Banner */}
              <View style={styles.drTopWrap} pointerEvents="none">
                <View style={styles.drTopOuter}>
                  <View style={styles.drTopInner}>
                    <Text style={styles.drTopText}>QUEST COMPLETED</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.drSubtitle}>{celebrationQuest?.title}</Text>

              {/* Grid of rewards */}
              <View style={styles.drRewards}>
                {celebrationQuest?.rewards?.gold > 0 && renderCelebrationRewardChip('gold', 'gold', celebrationQuest.rewards.gold)}
                {celebrationQuest?.rewards?.consumables && Object.entries(celebrationQuest.rewards.consumables).map(([id, qty]) =>
                  renderCelebrationRewardChip('consumables', id, qty)
                )}
                {celebrationQuest?.rewards?.materials && Object.entries(celebrationQuest.rewards.materials).map(([id, qty]) =>
                  renderCelebrationRewardChip('materials', id, qty)
                )}
              </View>

              {/* AWESOME! button */}
              <TouchableOpacity
                style={styles.drButton}
                activeOpacity={0.8}
                onPress={() => {
                  if (celebrationQuest) {
                    dispatch({ type: 'CLAIM_QUEST_REWARD', payload: { questId: celebrationQuest.id } });
                    setCelebrationQuest(null);
                  }
                }}
              >
                <View style={styles.drButtonInner}>
                  <Text style={styles.drButtonText}>AWESOME!</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ITEM INFO MODAL */}
      <ParchmentModal
        visible={!!infoModal}
        onClose={() => setInfoModal(null)}
        title={infoModal?.title || ''}
        maxWidth={320}
      >
        <Text style={styles.pmDesc}>{infoModal?.desc}</Text>
        <View style={styles.pmBtnCol}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setInfoModal(null)}
            style={styles.pmBtnSecondaryOuter}
          >
            <View style={styles.pmBtnSecondaryInner}>
              <Text style={styles.pmBtnSecondaryText}>GOT IT</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ParchmentModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.COLORS.hubBg,
  },
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
  headerBackButtonWrapper: {
    width: 44,
    height: 44,
    position: 'relative',
  },
  headerBackButtonBevelShadow: {
    position: 'absolute',
    left: 0,
    top: 3,
    width: 44,
    height: 44,
    borderRadius: 8,
    zIndex: 1,
    backgroundColor: '#4F3C1E',
  },
  headerBackButtonOuter: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: '#84735B',
    backgroundColor: '#4F3C1E',
    zIndex: 2,
  },
  headerBackButtonInner: {
    flex: 1,
    margin: 2,
    borderRadius: 5,
    borderWidth: 2.5,
    borderTopColor: '#D8483F',
    borderLeftColor: '#D8483F',
    borderRightColor: '#D8483F',
    borderBottomColor: '#590D0E',
    borderBottomWidth: 4,
    backgroundColor: '#A61C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleOuterBorder: {
    borderWidth: 2.5,
    borderColor: '#4A3917',
    borderRadius: 8,
    backgroundColor: 'transparent',
    padding: 2,
  },
  headerTitleInnerBorder: {
    borderWidth: 2,
    borderColor: '#D4A754',
    borderRadius: 5,
    backgroundColor: '#1E1E20',
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  headerTitleText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 28,
    color: '#FFF3DA',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  headerSpacer: {
    width: 44,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
    marginBottom: 6,
  },
  tabWrapper: {
    flex: 1,
    height: 42,
    position: 'relative',
  },
  tabShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    height: 42,
    borderRadius: 8,
    zIndex: 1,
    backgroundColor: '#0D2118',
  },
  tabOuter: {
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
  tabInner: {
    flex: 1,
    margin: 1.5,
    borderRadius: 5,
    borderWidth: 2.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabInnerActive: {
    backgroundColor: '#F3E2BD',
    borderTopColor: '#FFF3DA',
    borderLeftColor: '#FFF3DA',
    borderRightColor: '#FFF3DA',
    borderBottomColor: '#B5A07A',
    borderBottomWidth: 3.5,
  },
  tabInnerInactive: {
    backgroundColor: '#1B4030',
    borderTopColor: '#4F856C',
    borderLeftColor: '#4F856C',
    borderRightColor: '#4F856C',
    borderBottomColor: '#0D2118',
    borderBottomWidth: 3.5,
  },
  tabText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 14,
    letterSpacing: 0,
    fontWeight: 'normal',
    textTransform: 'uppercase',
  },
  tabTextActive: {
    color: '#2A1A0C',
  },
  tabTextInactive: {
    color: '#8CAF9F',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  countdownPanel: {
    backgroundColor: 'rgba(232, 167, 58, 0.08)',
    borderColor: theme.COLORS.panelBorderGoldStrong,
    borderWidth: 1.5,
    borderRadius: theme.BORDER_RADIUS.card,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  countdownLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 14,
    color: 'rgba(207,224,238,0.75)',
  },
  countdownValue: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 12,
    color: theme.COLORS.candleGold,
  },
  emptyText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: 'rgba(207,224,238,0.35)',
    textAlign: 'center',
    marginVertical: 40,
    fontStyle: 'italic',
  },
  questRow: {
    backgroundColor: theme.COLORS.panelGreen,
    borderColor: theme.COLORS.panelBorderGold,
    borderWidth: 1.5,
    borderRadius: theme.BORDER_RADIUS.card,
    padding: 14,
    marginBottom: 12,
  },
  questTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chevronShadow: {
    width: 24,
    height: 24,
    borderRadius: 5,
    backgroundColor: '#0D2118',
    position: 'relative',
  },
  chevronBadge: {
    position: 'absolute',
    left: 0,
    top: -2.5,
    width: 24,
    height: 24,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#4F856C',
    backgroundColor: '#1B4030',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFF3DA',
  },
  expandedContent: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(232, 167, 58, 0.15)',
    paddingTop: 10,
  },
  questTitle: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 16,
    color: theme.COLORS.warmGlow,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  questDesc: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 22,
    lineHeight: 26,
    color: 'rgba(207,224,238,0.7)',
    marginBottom: 8,
  },
  progressBarBg: {
    height: 24,
    backgroundColor: '#3A2210',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: theme.COLORS.panelBorderGoldStrong,
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1c823eff',
    borderRadius: 10,
  },
  progressBarTextWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 14,
    color: '#FFF3DA',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  questRewardsRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  rewardsLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 13,
    color: 'rgba(207,224,238,0.5)',
  },
  rewardsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rewardMiniChip: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D2118',
    borderColor: '#C9A86A',
    borderWidth: 1.5,
    borderRadius: 8,
    gap: 4,
    position: 'relative',
  },
  rewardMiniText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 14,
    color: theme.COLORS.warmGlow,
    textAlign: 'center',
  },
  infoTagSmall: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4F856C',
    backgroundColor: '#1B4030',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  infoTagText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFF3DA',
  },
  // Shared ParchmentModal content styles (item info popup)
  pmDesc: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 19,
    color: '#4A2E14',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 14,
  },
  pmBtnCol: {
    width: '100%',
    gap: 8,
  },
  pmBtnSecondaryOuter: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#84735B',
    padding: 2,
    backgroundColor: '#2C2013',
  },
  pmBtnSecondaryInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    backgroundColor: '#4F3C1E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pmBtnSecondaryText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: '#EAD9BA',
  },
  claimBtnWrapper: {
    width: '100%',
    height: 42,
    position: 'relative',
    marginTop: 12,
  },
  claimBtnShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    height: 42,
    borderRadius: 8,
    zIndex: 1,
    backgroundColor: '#4F3C1E',
  },
  claimBtnOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 42,
    borderRadius: 8,
    borderWidth: 2.2,
    borderColor: '#84735B',
    backgroundColor: '#4F3C1E',
    zIndex: 2,
  },
  claimBtnInner: {
    flex: 1,
    margin: 1.5,
    borderRadius: 5,
    borderWidth: 2.2,
    borderTopColor: '#4F856C',
    borderLeftColor: '#4F856C',
    borderRightColor: '#4F856C',
    borderBottomColor: '#0D2118',
    borderBottomWidth: 3.5,
    backgroundColor: '#1B4030',
    justifyContent: 'center',
    alignItems: 'center',
  },
  claimBtnTextActive: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 14,
    color: '#FFF3DA',
    textTransform: 'uppercase',
  },
  claimBtn: {
    width: '100%',
    height: 42,
    backgroundColor: '#1E1E20',
    borderColor: '#3A3A3C',
    borderWidth: 2,
    borderRadius: 8,
    marginTop: 12,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  claimBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 14,
    color: '#8A9384',
    textTransform: 'uppercase',
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#0D2118',
    borderColor: '#3E2E15',
    borderWidth: 2,
    borderRadius: 8,
    padding: 3,
    marginHorizontal: 32,
    marginTop: 8,
    marginBottom: 16,
  },
  subTab: {
    flex: 1,
    height: 32,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subTabActive: {
    backgroundColor: '#F3E2BD',
    borderWidth: 1.5,
    borderColor: '#B5A07A',
  },
  subTabInactive: {
    backgroundColor: 'transparent',
  },
  subTabText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 14,
    fontWeight: 'normal',
    textTransform: 'uppercase',
  },
  subTabTextActive: {
    color: '#2A1A0C',
  },
  subTabTextInactive: {
    color: '#FFF3DA',
    opacity: 0.6,
  },
  drOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 14, 6, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 26,
  },
  drFrame: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#6E4524',
    borderColor: '#3A2210',
    borderWidth: 3,
    borderRadius: 12,
    padding: 10,
    position: 'relative',
  },
  drParchment: {
    backgroundColor: '#ECD8A6',
    borderRadius: 14,
    borderColor: '#C9A86A',
    borderWidth: 2,
    paddingTop: 26,
    paddingBottom: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    position: 'relative',
  },
  drBevel: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 250, 228, 0.4)',
    zIndex: 1,
  },
  drTopWrap: {
    position: 'absolute',
    top: -17,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  drTopOuter: {
    borderWidth: 3,
    borderColor: '#4A3917',
    borderRadius: 8,
    padding: 2,
    backgroundColor: '#1E1E20',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 6,
  },
  drTopInner: {
    borderWidth: 2,
    borderColor: '#D4A754',
    borderRadius: 5,
    backgroundColor: '#1E1E20',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  drTopText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 12,
    color: '#FFF3DA',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  drSubtitle: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 11,
    color: '#4A2E14',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 17,
    marginTop: 10,
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  drRewards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 2,
    marginBottom: 16,
  },
  drChip: {
    alignItems: 'center',
    backgroundColor: '#F4E6C0',
    borderColor: '#C9A86A',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 12,
    minWidth: 84,
  },
  drChipQty: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 13,
    color: '#3A2210',
    marginTop: 6,
  },
  drChipLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    color: '#9A7A4A',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  drButton: {
    alignSelf: 'stretch',
    backgroundColor: '#7A4A24',
    borderColor: '#3A2210',
    borderWidth: 2,
    borderRadius: 12,
    padding: 3,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  drButtonInner: {
    backgroundColor: '#9A632F',
    borderRadius: 9,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1.5,
    borderTopColor: '#C58E4E',
    borderBottomWidth: 2,
    borderBottomColor: '#5A3318',
  },
  drButtonText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 12,
    color: '#FFF3DA',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: '#4A2A10',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
