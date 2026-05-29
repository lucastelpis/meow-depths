/**
 * SkillTreeScreen.js — Meow Depths Skill Tree
 *
 * Displays three class paths (Iron Paw, Stonefur, Shadow Claw) via a clean
 * tab bar selector at the top. Selecting a tab displays a single, vertical tree
 * with branch nodes rendered side-by-side. 
 *
 * Tapping a node opens a detailed skill drawer/modal to learn or equip skills.
 */

import React, { useState, useMemo, useCallback } from 'react';
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

import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { SKILLS, getSkillsByPath } from '../data/skills';
import { canUnlockSkill } from '../logic/progressionEngine';

// ─── Path metadata ──────────────────────────────────────────────────────────

const PATHS = [
  { key: 'ironPaw',    label: 'Iron Paw',    icon: '🐾' },
  { key: 'stonefur',   label: 'Stonefur',    icon: '🪨' },
  { key: 'shadowClaw', label: 'Shadow Claw', icon: '🌙' },
];

const PATH_DESCRIPTIONS = {
  ironPaw: 'Offensive powerhouse with high damage output, critical strikes, and self-sustain.',
  stonefur: 'Sturdy defender focused on damage reduction, countering attacks, and stunning enemies.',
  shadowClaw: 'Agile assassin utilizing stealth, guaranteed critical hits, and bleed damage stacks.',
};

const SKILL_EMOJIS = {
  // Iron Paw
  iron_slash: '⚔️',
  steady_paws: '🐾',
  rally: '❤️',
  power_strike: '💥',
  veteran: '🛡️',
  sharp_mind: '🧠',
  // Stonefur
  guard_stance: '🛡️',
  iron_hide: '🪵',
  retaliate: '⚡',
  thick_fur: '🧥',
  unbreakable: '🧱',
  titan_slam: '🔨',
  // Shadow Claw
  vanish: '💨',
  serrated_claws: '🔪',
  death_mark: '🎯',
  sharp_eyes: '👁️',
  toxic_claws: '🧪',
  phantom_step: '👣',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Determine a skill node's visual status.
 *
 * @param {Object}   skill          – Skill definition.
 * @param {string[]} unlockedSkills – Hero's unlocked skill IDs.
 * @param {number}   skillPoints    – Hero's available skill points.
 * @returns {'unlocked'|'available'|'no_points'|'blocked'|'locked'}
 */
function getSkillStatus(skill, unlockedSkills, skillPoints) {
  if (unlockedSkills.includes(skill.id)) return 'unlocked';

  // Check if the other branch in the same tier was already chosen
  if (skill.branch) {
    const otherBranch = skill.branch === 'a' ? 'b' : 'a';
    const conflicting = Object.values(SKILLS).find(
      s => s.path === skill.path && s.tier === skill.tier && s.branch === otherBranch,
    );
    if (conflicting && unlockedSkills.includes(conflicting.id)) return 'blocked';
  }

  // Check if fully available
  const result = canUnlockSkill(skill.id, unlockedSkills, skillPoints, SKILLS);
  if (result.canUnlock) return 'available';

  // Check if it WOULD be available if we had points (prereq met, not blocked, not unlocked)
  const potentialResult = canUnlockSkill(skill.id, unlockedSkills, 1, SKILLS);
  if (potentialResult.canUnlock) return 'no_points';

  return 'locked';
}

// ─── Connector Components ───────────────────────────────────────────────────

const VerticalLine = ({ active }) => (
  <View style={[styles.lineVertical, active && styles.lineActive]} />
);

const SplitConnector = ({ activeLeft, activeRight }) => (
  <View style={styles.splitConnectorContainer}>
    <View style={[styles.lineVerticalHalf, (activeLeft || activeRight) && styles.lineActive]} />
    <View style={styles.horizontalBarContainer}>
      <View style={[styles.lineHorizontal, activeLeft && styles.lineActive]} />
      <View style={[styles.lineHorizontal, activeRight && styles.lineActive]} />
    </View>
    <View style={styles.splitDownLines}>
      <View style={[styles.lineVerticalHalf, activeLeft && styles.lineActive]} />
      <View style={[styles.lineVerticalHalf, activeRight && styles.lineActive]} />
    </View>
  </View>
);

const DoubleConnector = ({ activeLeft, activeRight }) => (
  <View style={styles.doubleConnectorContainer}>
    <View style={[styles.lineVertical, activeLeft && styles.lineActive]} />
    <View style={[styles.lineVertical, activeRight && styles.lineActive]} />
  </View>
);

// ─── Skill Node Component ───────────────────────────────────────────────────

function SkillNode({ skill, status, onPress }) {
  const isActive = skill.type === 'active';
  const emoji = SKILL_EMOJIS[skill.id] || '✨';

  // Style helper based on status
  const getStatusStyles = () => {
    switch (status) {
      case 'unlocked':
        return { node: styles.nodeUnlocked, badge: styles.badgeUnlocked, text: '✓ Learned' };
      case 'available':
        return { node: styles.nodeAvailable, badge: styles.badgeAvailable, text: 'Ready' };
      case 'no_points':
        return { node: styles.nodeNoPoints, badge: styles.badgeNoPoints, text: 'Need SP' };
      case 'blocked':
        return { node: styles.nodeBlocked, badge: styles.badgeBlocked, text: 'Blocked' };
      case 'locked':
      default:
        return { node: styles.nodeLocked, badge: styles.badgeLocked, text: 'Locked' };
    }
  };

  const statusStyle = getStatusStyles();

  return (
    <TouchableOpacity
      style={[styles.node, statusStyle.node]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Emoji Icon */}
      <Text style={[styles.nodeEmoji, (status === 'locked' || status === 'blocked') && styles.fadedText]}>
        {emoji}
      </Text>

      {/* Skill Name */}
      <Text style={[styles.skillName, (status === 'locked' || status === 'blocked') && styles.fadedText]} numberOfLines={1}>
        {skill.name}
      </Text>

      {/* Badges Box */}
      <View style={styles.badgeRow}>
        {/* Active/Passive badge */}
        <View style={[styles.typeBadge, isActive ? styles.badgeActive : styles.badgePassive]}>
          <Text style={styles.typeBadgeText}>{isActive ? 'Active' : 'Passive'}</Text>
        </View>

        {/* Status badge */}
        <View style={[styles.statusBadge, statusStyle.badge]}>
          <Text style={styles.statusBadgeText}>{statusStyle.text}</Text>
        </View>
      </View>

      {/* Branch Label for T3/T4 */}
      {skill.branch && (
        <Text style={[styles.branchLabel, status === 'blocked' && styles.fadedText]}>
          Branch {skill.branch.toUpperCase()}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SkillTreeScreen() {
  const navigation = useNavigation();
  const { state, dispatch } = useGame();
  const { skillPoints, unlockedSkills, equippedSkills } = state.hero;

  const [selectedPath, setSelectedPath] = useState('ironPaw');
  const [selectedSkill, setSelectedSkill] = useState(null);

  // ── Pre-compute path data ────────────────────────────────────────────────
  const pathData = useMemo(
    () =>
      PATHS.map(p => ({
        ...p,
        skills: getSkillsByPath(p.key),
      })),
    [],
  );

  const selectedPathData = useMemo(() => {
    return pathData.find(p => p.key === selectedPath);
  }, [pathData, selectedPath]);

  // Organise skills into exact structure: [T1, T2, [T3A, T3B], [T4A, T4B]]
  const treeNodes = useMemo(() => {
    if (!selectedPathData) return { t1: null, t2: null, t3_a: null, t3_b: null, t4_a: null, t4_b: null };
    const skills = selectedPathData.skills;
    
    return {
      t1: skills.find(s => s.tier === 1),
      t2: skills.find(s => s.tier === 2),
      t3_a: skills.find(s => s.tier === 3 && s.branch === 'a'),
      t3_b: skills.find(s => s.tier === 3 && s.branch === 'b'),
      t4_a: skills.find(s => s.tier === 4 && s.branch === 'a'),
      t4_b: skills.find(s => s.tier === 4 && s.branch === 'b'),
    };
  }, [selectedPathData]);

  const { t1, t2, t3_a, t3_b, t4_a, t4_b } = treeNodes;

  // Calculate unlock progress for each path tab
  const tabProgress = useMemo(() => {
    const counts = {};
    pathData.forEach(p => {
      const unlockedCount = p.skills.filter(s => unlockedSkills.includes(s.id)).length;
      counts[p.key] = `${unlockedCount}/${p.skills.length}`;
    });
    return counts;
  }, [pathData, unlockedSkills]);

  // Prerequisite description helper for Modal
  const prereqInfo = useMemo(() => {
    if (!selectedSkill) return null;
    if (!selectedSkill.requires) return { met: true, text: 'No Prerequisite' };

    const prereqSkill = SKILLS[selectedSkill.requires];
    const met = unlockedSkills.includes(selectedSkill.requires);
    return {
      met,
      text: `Requires "${prereqSkill?.name || selectedSkill.requires}"`,
    };
  }, [selectedSkill, unlockedSkills]);

  // Conflict description helper for Modal
  const conflictInfo = useMemo(() => {
    if (!selectedSkill || !selectedSkill.branch) return null;
    const otherBranch = selectedSkill.branch === 'a' ? 'b' : 'a';
    const conflicting = Object.values(SKILLS).find(
      s => s.path === selectedSkill.path && s.tier === selectedSkill.tier && s.branch === otherBranch
    );
    if (!conflicting) return null;
    
    const chosen = unlockedSkills.includes(conflicting.id);
    return {
      chosen,
      text: `Mutually exclusive with "${conflicting.name}"`,
    };
  }, [selectedSkill, unlockedSkills]);

  // Handlers
  const handleLearnSkill = useCallback(() => {
    if (!selectedSkill) return;
    dispatch({ type: 'UNLOCK_SKILL', payload: { skillId: selectedSkill.id, cost: 1 } });
    
    // Automatically keep the modal open, letting status update dynamically to 'unlocked'
    // where they can see the equip choices immediately.
  }, [selectedSkill, dispatch]);

  const handleEquipSkill = useCallback((slotIndex) => {
    if (!selectedSkill) return;
    dispatch({
      type: 'EQUIP_SKILL',
      payload: { slotIndex, skillId: selectedSkill.id },
    });
  }, [selectedSkill, dispatch]);

  // Modal active slots names
  const slot1Label = useMemo(() => {
    return equippedSkills[0] ? SKILLS[equippedSkills[0]]?.name || 'Skill 1' : 'Empty';
  }, [equippedSkills]);

  const slot2Label = useMemo(() => {
    return equippedSkills[1] ? SKILLS[equippedSkills[1]]?.name || 'Skill 2' : 'Empty';
  }, [equippedSkills]);

  const selectedSkillStatus = useMemo(() => {
    if (!selectedSkill) return null;
    return getSkillStatus(selectedSkill, unlockedSkills, skillPoints);
  }, [selectedSkill, unlockedSkills, skillPoints]);

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🌟 Skill Tree</Text>
        <View style={styles.spBadgeContainer}>
          <Text style={styles.skillPointsBadge}>SP: {skillPoints}</Text>
        </View>
      </View>

      {/* ── Path Tab Bar ───────────────────────────────────────────────── */}
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          {PATHS.map(({ key, label, icon }) => {
            const isActive = selectedPath === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setSelectedPath(key)}
              >
                <Text style={[styles.tabIcon, isActive && styles.tabTextActive]}>{icon}</Text>
                <Text style={[styles.tabLabel, isActive && styles.tabTextActive]}>{label}</Text>
                <Text style={[styles.tabProgressText, isActive && styles.tabProgressActive]}>
                  {tabProgress[key]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Vertical ScrollView ─────────────────────────────────────────── */}
      <ScrollView
        style={styles.treeScroll}
        contentContainerStyle={styles.treeScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Selected Path Intro Card */}
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>
            {selectedPathData?.icon} {selectedPathData?.label} Path
          </Text>
          <Text style={styles.introDesc}>
            {PATH_DESCRIPTIONS[selectedPath]}
          </Text>
        </View>

        {/* Tree Container */}
        <View style={styles.treeContainer}>
          {/* Tier 1 */}
          {t1 && (
            <View style={styles.singleRow}>
              <SkillNode
                skill={t1}
                status={getSkillStatus(t1, unlockedSkills, skillPoints)}
                onPress={() => setSelectedSkill(t1)}
              />
            </View>
          )}

          {/* Connector T1 -> T2 */}
          {t1 && t2 && (
            <VerticalLine
              active={['unlocked', 'available', 'no_points'].includes(
                getSkillStatus(t2, unlockedSkills, skillPoints)
              )}
            />
          )}

          {/* Tier 2 */}
          {t2 && (
            <View style={styles.singleRow}>
              <SkillNode
                skill={t2}
                status={getSkillStatus(t2, unlockedSkills, skillPoints)}
                onPress={() => setSelectedSkill(t2)}
              />
            </View>
          )}

          {/* Connector T2 -> T3 split */}
          {t2 && (t3_a || t3_b) && (
            <SplitConnector
              activeLeft={t3_a && ['unlocked', 'available', 'no_points'].includes(
                getSkillStatus(t3_a, unlockedSkills, skillPoints)
              )}
              activeRight={t3_b && ['unlocked', 'available', 'no_points'].includes(
                getSkillStatus(t3_b, unlockedSkills, skillPoints)
              )}
            />
          )}

          {/* Tier 3 Branch Row */}
          {(t3_a || t3_b) && (
            <View style={styles.branchRow}>
              {t3_a && (
                <SkillNode
                  skill={t3_a}
                  status={getSkillStatus(t3_a, unlockedSkills, skillPoints)}
                  onPress={() => setSelectedSkill(t3_a)}
                />
              )}
              {t3_b && (
                <SkillNode
                  skill={t3_b}
                  status={getSkillStatus(t3_b, unlockedSkills, skillPoints)}
                  onPress={() => setSelectedSkill(t3_b)}
                />
              )}
            </View>
          )}

          {/* Connector T3 -> T4 double */}
          {((t3_a && t4_a) || (t3_b && t4_b)) && (
            <DoubleConnector
              activeLeft={t4_a && ['unlocked', 'available', 'no_points'].includes(
                getSkillStatus(t4_a, unlockedSkills, skillPoints)
              )}
              activeRight={t4_b && ['unlocked', 'available', 'no_points'].includes(
                getSkillStatus(t4_b, unlockedSkills, skillPoints)
              )}
            />
          )}

          {/* Tier 4 Branch Row */}
          {(t4_a || t4_b) && (
            <View style={styles.branchRow}>
              {t4_a && (
                <SkillNode
                  skill={t4_a}
                  status={getSkillStatus(t4_a, unlockedSkills, skillPoints)}
                  onPress={() => setSelectedSkill(t4_a)}
                />
              )}
              {t4_b && (
                <SkillNode
                  skill={t4_b}
                  status={getSkillStatus(t4_b, unlockedSkills, skillPoints)}
                  onPress={() => setSelectedSkill(t4_b)}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─── Detail Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={selectedSkill !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSkill(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedSkill(null)}
        >
          <Pressable style={styles.modalCard}>
            {selectedSkill && (
              <>
                {/* Close Button */}
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedSkill(null)}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>

                {/* Path Tag */}
                <Text style={styles.modalPathTag}>
                  {selectedPathData?.label.toUpperCase()} PATH • TIER {selectedSkill.tier}
                </Text>

                {/* Skill Title Section */}
                <View style={styles.modalTitleRow}>
                  <Text style={styles.modalEmoji}>
                    {SKILL_EMOJIS[selectedSkill.id] || '✨'}
                  </Text>
                  <View style={styles.modalTitleTextContainer}>
                    <Text style={styles.modalSkillName}>{selectedSkill.name}</Text>
                    <View style={styles.modalBadgeRow}>
                      <View style={[styles.typeBadge, selectedSkill.type === 'active' ? styles.badgeActive : styles.badgePassive]}>
                        <Text style={styles.typeBadgeText}>
                          {selectedSkill.type === 'active' ? 'Active' : 'Passive'}
                        </Text>
                      </View>
                      {selectedSkill.cooldown > 0 && (
                        <Text style={styles.modalCooldown}>
                          ⏳ {selectedSkill.cooldown} turn CD
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.modalDesc}>{selectedSkill.description}</Text>

                {/* Prerequisites & Conflict Box */}
                <View style={styles.modalInfoBox}>
                  {/* Prerequisite status */}
                  {prereqInfo && (
                    <View style={styles.modalInfoLine}>
                      <Text style={[styles.modalInfoBullet, prereqInfo.met ? styles.bulletGreen : styles.bulletRed]}>
                        {prereqInfo.met ? '✓' : '✗'}
                      </Text>
                      <Text style={[styles.modalInfoText, prereqInfo.met ? styles.textMet : styles.textUnmet]}>
                        {prereqInfo.text} {prereqInfo.met ? '(Unlocked)' : '(Locked)'}
                      </Text>
                    </View>
                  )}

                  {/* Conflict status */}
                  {conflictInfo && (
                    <View style={styles.modalInfoLine}>
                      <Text style={[styles.modalInfoBullet, conflictInfo.chosen ? styles.bulletRed : styles.bulletGreen]}>
                        {conflictInfo.chosen ? '⚠️' : '✓'}
                      </Text>
                      <Text style={[styles.modalInfoText, conflictInfo.chosen ? styles.textConflict : styles.textNoConflict]}>
                        {conflictInfo.text} {conflictInfo.chosen ? '(Chose other branch)' : '(Available)'}
                      </Text>
                    </View>
                  )}

                  {/* Cost status */}
                  {selectedSkillStatus !== 'unlocked' && (
                    <View style={styles.modalInfoLine}>
                      <Text style={[styles.modalInfoBullet, skillPoints >= 1 ? styles.bulletGreen : styles.bulletRed]}>
                        {skillPoints >= 1 ? '✓' : '✗'}
                      </Text>
                      <Text style={[styles.modalInfoText, skillPoints >= 1 ? styles.textMet : styles.textUnmet]}>
                        Costs 1 Skill Point (You have {skillPoints})
                      </Text>
                    </View>
                  )}
                </View>

                {/* Actions Section */}
                <View style={styles.modalActions}>
                  {/* LEARN BUTTON */}
                  {selectedSkillStatus === 'available' && (
                    <TouchableOpacity
                      style={styles.learnBtn}
                      onPress={handleLearnSkill}
                    >
                      <Text style={styles.learnBtnText}>Learn Skill 🌟</Text>
                    </TouchableOpacity>
                  )}

                  {/* NO POINTS BUTTON */}
                  {selectedSkillStatus === 'no_points' && (
                    <View style={[styles.actionBtnDisabled, styles.noPointsBtn]}>
                      <Text style={styles.disabledBtnText}>Requires Skill Point</Text>
                    </View>
                  )}

                  {/* LOCKED BUTTON */}
                  {selectedSkillStatus === 'locked' && (
                    <View style={styles.actionBtnDisabled}>
                      <Text style={styles.disabledBtnText}>Locked</Text>
                    </View>
                  )}

                  {/* BLOCKED BUTTON */}
                  {selectedSkillStatus === 'blocked' && (
                    <View style={[styles.actionBtnDisabled, styles.blockedBtn]}>
                      <Text style={styles.disabledBtnText}>Blocked by other branch</Text>
                    </View>
                  )}

                  {/* EQUIPPING ACTIONS FOR UNLOCKED ACTIVE SKILLS */}
                  {selectedSkillStatus === 'unlocked' && (
                    <View style={styles.unlockedBox}>
                      <Text style={styles.unlockedLabel}>✓ Skill Learned</Text>

                      {selectedSkill.type === 'active' ? (
                        <View style={styles.equipRowContainer}>
                          <Text style={styles.equipPromptText}>Assign to Combat Slot:</Text>
                          <View style={styles.equipRow}>
                            <TouchableOpacity
                              style={[
                                styles.equipBtn,
                                state.hero.equippedSkills[0] === selectedSkill.id && styles.equipBtnCurrent,
                              ]}
                              onPress={() => handleEquipSkill(0)}
                            >
                              <Text style={styles.equipBtnText} numberOfLines={1}>
                                Slot 1
                              </Text>
                              <Text style={styles.equipBtnSubtext} numberOfLines={1}>
                                ({slot1Label})
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.equipBtn,
                                state.hero.equippedSkills[1] === selectedSkill.id && styles.equipBtnCurrent,
                              ]}
                              onPress={() => handleEquipSkill(1)}
                            >
                              <Text style={styles.equipBtnText} numberOfLines={1}>
                                Slot 2
                              </Text>
                              <Text style={styles.equipBtnSubtext} numberOfLines={1}>
                                ({slot2Label})
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.passiveActiveLabel}>
                          Passive skills are always active.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  /* ── Layout ──────────────────────────────────────────────── */
  container: {
    flex: 1,
    backgroundColor: theme.COLORS.dungeonBackground,
  },
  treeScroll: {
    flex: 1,
  },
  treeScrollContent: {
    paddingVertical: theme.SPACING.md,
    paddingBottom: theme.SPACING.xl * 3,
  },

  /* ── Header ──────────────────────────────────────────────── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.SPACING.md,
    paddingVertical: theme.SPACING.md,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    paddingVertical: theme.SPACING.xs,
    paddingRight: theme.SPACING.sm,
  },
  backText: {
    ...theme.FONTS.body,
    color: theme.COLORS.primary,
    fontWeight: '600',
  },
  title: {
    ...theme.FONTS.title,
    color: theme.COLORS.textBright,
    fontSize: 20,
  },
  spBadgeContainer: {
    backgroundColor: 'rgba(212, 167, 84, 0.15)',
    borderRadius: theme.BORDER_RADIUS.md,
    paddingHorizontal: theme.SPACING.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.3)',
  },
  skillPointsBadge: {
    ...theme.FONTS.body,
    color: theme.COLORS.primary,
    fontWeight: 'bold',
  },

  /* ── Tab Bar ─────────────────────────────────────────────── */
  tabBarContainer: {
    paddingHorizontal: theme.SPACING.md,
    paddingVertical: theme.SPACING.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: theme.BORDER_RADIUS.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: theme.BORDER_RADIUS.md,
  },
  tabButtonActive: {
    backgroundColor: theme.COLORS.primary,
    shadowColor: theme.COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tabIcon: {
    fontSize: 16,
    color: theme.COLORS.textDim,
  },
  tabLabel: {
    ...theme.FONTS.tiny,
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.COLORS.textDim,
    marginTop: 2,
  },
  tabProgressText: {
    ...theme.FONTS.tiny,
    fontSize: 8,
    color: theme.COLORS.textDim,
    opacity: 0.7,
    marginTop: 1,
  },
  tabTextActive: {
    color: '#0D0D0D', // dark contrast text on active tab
  },
  tabProgressActive: {
    color: '#0D0D0D',
    opacity: 0.8,
  },

  /* ── Intro Card ──────────────────────────────────────────── */
  introCard: {
    marginHorizontal: theme.SPACING.md,
    backgroundColor: 'rgba(20, 25, 35, 0.5)',
    borderRadius: theme.BORDER_RADIUS.lg,
    padding: theme.SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: theme.SPACING.md,
  },
  introTitle: {
    ...theme.FONTS.body,
    fontWeight: 'bold',
    color: theme.COLORS.primary,
    marginBottom: 4,
  },
  introDesc: {
    ...theme.FONTS.small,
    color: theme.COLORS.text,
    lineHeight: 16,
  },

  /* ── Tree Layout ─────────────────────────────────────────── */
  treeContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: theme.SPACING.md,
  },
  singleRow: {
    alignItems: 'center',
    width: '100%',
  },
  branchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 310,
    alignSelf: 'center',
  },

  /* ── Connector Styling ────────────────────────────────────── */
  lineVertical: {
    width: 2,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignSelf: 'center',
  },
  lineVerticalHalf: {
    width: 2,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignSelf: 'center',
  },
  lineActive: {
    backgroundColor: theme.COLORS.primary,
    shadowColor: theme.COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  splitConnectorContainer: {
    width: 310,
    alignSelf: 'center',
  },
  horizontalBarContainer: {
    flexDirection: 'row',
    width: 156, // distance between left and right branch lines
    alignSelf: 'center',
    justifyContent: 'center',
  },
  lineHorizontal: {
    height: 2,
    width: 78,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  splitDownLines: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 156,
    alignSelf: 'center',
  },
  doubleConnectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 156,
    alignSelf: 'center',
    height: 24,
  },

  /* ── Skill Node ──────────────────────────────────────────── */
  node: {
    width: 145,
    backgroundColor: 'rgba(25, 30, 40, 0.85)',
    borderRadius: theme.BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: theme.SPACING.sm + 2,
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'space-between',
  },
  nodeEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  skillName: {
    ...theme.FONTS.tiny,
    fontWeight: 'bold',
    color: theme.COLORS.textBright,
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    width: '100%',
  },
  fadedText: {
    color: theme.COLORS.textDim,
    opacity: 0.5,
  },
  branchLabel: {
    ...theme.FONTS.tiny,
    fontSize: 7,
    color: theme.COLORS.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  /* Node States styling */
  nodeUnlocked: {
    borderColor: theme.COLORS.success,
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    shadowColor: theme.COLORS.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  nodeAvailable: {
    borderColor: theme.COLORS.primary,
    backgroundColor: 'rgba(212, 167, 84, 0.1)',
    shadowColor: theme.COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  nodeNoPoints: {
    borderColor: theme.COLORS.accent,
    backgroundColor: 'rgba(255, 107, 53, 0.04)',
  },
  nodeBlocked: {
    borderColor: 'rgba(255, 68, 68, 0.15)',
    backgroundColor: 'rgba(255, 68, 68, 0.01)',
    opacity: 0.35,
  },
  nodeLocked: {
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    opacity: 0.45,
  },

  /* Node Badges */
  typeBadge: {
    borderRadius: theme.BORDER_RADIUS.sm,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
  },
  badgePassive: {
    backgroundColor: 'rgba(107, 155, 210, 0.15)',
  },
  typeBadgeText: {
    ...theme.FONTS.tiny,
    fontSize: 7,
    color: theme.COLORS.textBright,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statusBadge: {
    borderRadius: theme.BORDER_RADIUS.sm,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderWidth: 0.5,
  },
  statusBadgeText: {
    ...theme.FONTS.tiny,
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  badgeUnlocked: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  badgeAvailable: {
    backgroundColor: 'rgba(212, 167, 84, 0.1)',
    borderColor: 'rgba(212, 167, 84, 0.4)',
  },
  badgeNoPoints: {
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  badgeBlocked: {
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  badgeLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  /* ─── Detail Modal ──────────────────────────────────────────────── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(20, 22, 28, 0.98)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: theme.COLORS.primary,
    padding: theme.SPACING.lg,
    shadowColor: theme.COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    padding: 4,
    zIndex: 10,
  },
  modalCloseText: {
    fontSize: 16,
    color: theme.COLORS.textDim,
    fontWeight: 'bold',
  },
  modalPathTag: {
    ...theme.FONTS.tiny,
    color: theme.COLORS.textDim,
    letterSpacing: 1.5,
    fontWeight: 'bold',
    marginBottom: theme.SPACING.sm,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.SPACING.md,
  },
  modalEmoji: {
    fontSize: 32,
    marginRight: theme.SPACING.md,
  },
  modalTitleTextContainer: {
    flex: 1,
  },
  modalSkillName: {
    ...theme.FONTS.heading,
    color: theme.COLORS.textBright,
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 4,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalCooldown: {
    ...theme.FONTS.tiny,
    color: theme.COLORS.accent,
    fontWeight: '600',
  },
  modalDesc: {
    ...theme.FONTS.body,
    fontSize: 13,
    color: theme.COLORS.text,
    lineHeight: 18,
    marginBottom: theme.SPACING.lg,
  },
  modalInfoBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: theme.BORDER_RADIUS.md,
    padding: theme.SPACING.md,
    marginBottom: theme.SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalInfoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalInfoBullet: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 20,
    textAlign: 'center',
    marginRight: 6,
  },
  bulletGreen: {
    color: theme.COLORS.success,
  },
  bulletRed: {
    color: theme.COLORS.danger,
  },
  modalInfoText: {
    ...theme.FONTS.tiny,
    fontSize: 11,
    flex: 1,
  },
  textMet: {
    color: theme.COLORS.textBright,
  },
  textUnmet: {
    color: theme.COLORS.textDim,
  },
  textConflict: {
    color: theme.COLORS.danger,
    fontWeight: '500',
  },
  textNoConflict: {
    color: theme.COLORS.textDim,
  },

  /* Modal Actions Buttons */
  modalActions: {
    width: '100%',
  },
  learnBtn: {
    backgroundColor: theme.COLORS.primary,
    borderRadius: theme.BORDER_RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: theme.COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  learnBtnText: {
    ...theme.FONTS.body,
    color: '#0D0D0D',
    fontWeight: 'bold',
  },
  actionBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: theme.BORDER_RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  noPointsBtn: {
    borderColor: 'rgba(255, 107, 53, 0.3)',
    backgroundColor: 'rgba(255, 107, 53, 0.02)',
  },
  blockedBtn: {
    borderColor: 'rgba(255, 68, 68, 0.3)',
    backgroundColor: 'rgba(255, 68, 68, 0.02)',
  },
  disabledBtnText: {
    ...theme.FONTS.body,
    color: theme.COLORS.textDim,
    fontWeight: '600',
  },
  unlockedBox: {
    alignItems: 'center',
    width: '100%',
  },
  unlockedLabel: {
    ...theme.FONTS.body,
    color: theme.COLORS.success,
    fontWeight: 'bold',
    marginBottom: theme.SPACING.md,
  },
  passiveActiveLabel: {
    ...theme.FONTS.tiny,
    color: theme.COLORS.textDim,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  equipRowContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: theme.BORDER_RADIUS.md,
    padding: theme.SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  equipPromptText: {
    ...theme.FONTS.tiny,
    color: theme.COLORS.textBright,
    fontWeight: 'bold',
    marginBottom: theme.SPACING.sm,
  },
  equipRow: {
    flexDirection: 'row',
    gap: theme.SPACING.md,
    width: '100%',
  },
  equipBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: theme.BORDER_RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  equipBtnCurrent: {
    borderColor: theme.COLORS.primary,
    backgroundColor: 'rgba(212, 167, 84, 0.1)',
  },
  equipBtnText: {
    ...theme.FONTS.tiny,
    color: theme.COLORS.textBright,
    fontWeight: 'bold',
  },
  equipBtnSubtext: {
    ...theme.FONTS.tiny,
    fontSize: 8,
    color: theme.COLORS.textDim,
    marginTop: 1,
  },
});
