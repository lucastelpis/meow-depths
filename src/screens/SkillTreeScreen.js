/**
 * SkillTreeScreen.js — Meow Depths Skill Tree (Redesigned Premium UI)
 *
 * Displays three class paths (Iron Paw, Stonefur, Shadow Claw) via a premium tab bar.
 * Renders the skill tree as a beautiful SVG constellation path with glowing nodes and
 * connections, and a slide-up detail panel for learning and equipping skills.
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Line, Circle } from 'react-native-svg';

import theme from '../constants/theme';
import { useGame } from '../state/gameState';
import { SKILLS, getSkillsByPath } from '../data/skills';
import { canUnlockSkill } from '../logic/progressionEngine';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Path metadata ──────────────────────────────────────────────────────────
const PATHS = [
  { key: 'ironPaw',    label: 'Iron Paw',    icon: '🐾', color: '#EF4444' },
  { key: 'stonefur',   label: 'Stonefur',    icon: '🪨', color: '#06B6D4' },
  { key: 'shadowClaw', label: 'Shadow Claw', icon: '🌙', color: '#A855F7' },
];

const PATH_DESCRIPTIONS = {
  ironPaw: 'Offensive powerhouse with high damage output, critical strikes, and self-sustain.',
  stonefur: 'Sturdy defender focused on damage reduction, countering attacks, and stunning enemies.',
  shadowClaw: 'Agile assassin utilizing stealth, guaranteed critical hits, and bleed damage stacks.',
};

const SKILL_EMOJIS = {
  iron_slash: '⚔️',
  steady_paws: '🐾',
  rally: '❤️',
  power_strike: '💥',
  veteran: '🛡️',
  sharp_mind: '🧠',
  guard_stance: '🛡️',
  iron_hide: '🪵',
  retaliate: '⚡',
  thick_fur: '🧥',
  unbreakable: '🧱',
  titan_slam: '🔨',
  vanish: '💨',
  serrated_claws: '🔪',
  death_mark: '🎯',
  sharp_eyes: '👁️',
  toxic_claws: '🧪',
  phantom_step: '👣',
};

function getSkillStatus(skill, unlockedSkills, skillPoints) {
  if (unlockedSkills.includes(skill.id)) return 'unlocked';

  if (skill.branch) {
    const otherBranch = skill.branch === 'a' ? 'b' : 'a';
    const conflicting = Object.values(SKILLS).find(
      s => s.path === skill.path && s.tier === skill.tier && s.branch === otherBranch,
    );
    if (conflicting && unlockedSkills.includes(conflicting.id)) return 'blocked';
  }

  const result = canUnlockSkill(skill.id, unlockedSkills, skillPoints, SKILLS);
  if (result.canUnlock) return 'available';

  const potentialResult = canUnlockSkill(skill.id, unlockedSkills, 1, SKILLS);
  if (potentialResult.canUnlock) return 'no_points';

  return 'locked';
}

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

  const tabProgress = useMemo(() => {
    const counts = {};
    pathData.forEach(p => {
      const unlockedCount = p.skills.filter(s => unlockedSkills.includes(s.id)).length;
      counts[p.key] = `${unlockedCount}/${p.skills.length}`;
    });
    return counts;
  }, [pathData, unlockedSkills]);

  // Constellation Connectors Logic (solid only if target skill is unlocked/chosen)
  const connectionStatuses = useMemo(() => {
    return {
      t1_t2: t2 ? unlockedSkills.includes(t2.id) : false,
      t2_t3a: t3_a ? unlockedSkills.includes(t3_a.id) : false,
      t2_t3b: t3_b ? unlockedSkills.includes(t3_b.id) : false,
      t3a_t4a: t4_a ? unlockedSkills.includes(t4_a.id) : false,
      t3b_t4b: t4_b ? unlockedSkills.includes(t4_b.id) : false,
    };
  }, [t2, t3_a, t3_b, t4_a, t4_b, unlockedSkills]);

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
  }, [selectedSkill, dispatch]);

  const handleEquipSkill = useCallback((slotIndex) => {
    if (!selectedSkill) return;
    dispatch({
      type: 'EQUIP_SKILL',
      payload: { slotIndex, skillId: selectedSkill.id },
    });
  }, [selectedSkill, dispatch]);

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

  // Absolute coordinate offsets inside our tree container (340 width, 520 height)
  const renderSkillNode = (skill, cx, cy) => {
    if (!skill) return null;
    const status = getSkillStatus(skill, unlockedSkills, skillPoints);
    const isEquipped = equippedSkills.includes(skill.id);
    const emoji = SKILL_EMOJIS[skill.id] || '✨';

    // Status visual styles
    let borderColor = 'rgba(255,255,255,0.06)';
    let glowColor = 'transparent';
    let opacity = 1;
    let badgeText = '';
    let badgeColor = '#707F94';

    if (isEquipped) {
      borderColor = '#D4A754';
      glowColor = 'rgba(212, 167, 84, 0.4)';
    } else if (status === 'unlocked') {
      borderColor = '#10B981';
      glowColor = 'rgba(16, 185, 129, 0.15)';
    } else if (status === 'available') {
      borderColor = '#FFC107';
      glowColor = 'rgba(255, 193, 7, 0.2)';
    } else if (status === 'no_points') {
      borderColor = '#FF6B35';
      glowColor = 'rgba(255, 107, 53, 0.1)';
    } else {
      borderColor = 'rgba(255,255,255,0.03)';
      opacity = 0.4;
    }

    return (
      <View key={skill.id} style={[styles.nodeWrapper, { left: cx - 35, top: cy - 35, opacity }]}>
        <TouchableOpacity
          style={[
            styles.nodeCircle,
            { borderColor, shadowColor: borderColor },
            isEquipped && styles.nodeCircleEquipped,
          ]}
          onPress={() => setSelectedSkill(skill)}
          activeOpacity={0.8}
        >
          {/* Node SVG Glow background */}
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <RadialGradient id={`nodeGlow_${skill.id}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={borderColor} stopOpacity="0.25" />
                <Stop offset="100%" stopColor="#0B0B12" stopOpacity="0" stopColor="transparent" />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#nodeGlow_${skill.id})`} rx={35} />
          </Svg>
          <Text style={styles.nodeEmoji}>{emoji}</Text>
          {isEquipped && (
            <View style={styles.equippedDot} />
          )}
        </TouchableOpacity>

        {/* Node Name underneath */}
        <View style={styles.nodeNameWrapper}>
          <Text style={[styles.nodeNameText, isEquipped && { color: '#D4A754', fontWeight: 'bold' }]} numberOfLines={1}>
            {skill.name}
          </Text>
          <Text style={styles.nodeTypeText}>
            {skill.type === 'active' ? 'ACT' : 'PAS'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top ambient glow background */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="topGlow" cx="50%" cy="0%" rx="80%" ry="45%">
            <Stop offset="0%" stopColor="#A855F7" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#07070A" stopOpacity="0" stopColor="transparent" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="#07070A" />
        <Rect width="100%" height="100%" fill="url(#topGlow)" />
      </Svg>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← Hub</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🌟 Skills</Text>
        <View style={styles.spBadgeContainer}>
          <Text style={styles.skillPointsBadge}>SP: {skillPoints}</Text>
        </View>
      </View>

      {/* ── Path Tab Bar ───────────────────────────────────────────────── */}
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          {PATHS.map(({ key, label, icon, color }) => {
            const isActive = selectedPath === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.tabButton, isActive && { backgroundColor: 'rgba(255,255,255,0.03)' }]}
                activeOpacity={0.8}
                onPress={() => setSelectedPath(key)}
              >
                {isActive && (
                  <View style={StyleSheet.absoluteFill}>
                    <Svg width="100%" height="100%">
                      <Defs>
                        <LinearGradient id={`tabGrad_${key}`} x1="0" y1="0" x2="1" y2="0">
                          <Stop offset="0%" stopColor={`${color}15`} />
                          <Stop offset="100%" stopColor="transparent" />
                        </LinearGradient>
                      </Defs>
                      <Rect width="100%" height="100%" fill={`url(#tabGrad_${key})`} rx={10} />
                      <Rect width="100%" height="100%" fill="none" stroke={`${color}40`} strokeWidth={1} rx={10} />
                    </Svg>
                  </View>
                )}
                <Text style={[styles.tabIcon, isActive && { opacity: 1 }]}>{icon}</Text>
                <Text style={[styles.tabLabel, isActive && { color: '#F8FAFC', fontWeight: '800' }]}>{label}</Text>
                <Text style={[styles.tabProgressText, isActive && { color }]}>
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
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Rect width="100%" height="100%" fill="rgba(255,255,255,0.015)" rx={14} />
            <Rect x="1" y="1" width="98%" height="98%" rx={13} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
          </Svg>
          <View style={styles.introCardInner}>
            <Text style={styles.introTitle}>
              {selectedPathData?.icon} {selectedPathData?.label} Path
            </Text>
            <Text style={styles.introDesc}>
              {PATH_DESCRIPTIONS[selectedPath]}
            </Text>
          </View>
        </View>

        {/* Tree Container (Constellation Canvas) */}
        <View style={styles.treeContainer}>
          {/* SVG Constellation Lines */}
          <Svg width={340} height={520} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="glowingLineGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#F9D99A" />
                <Stop offset="100%" stopColor="#D4A754" />
              </LinearGradient>
            </Defs>

            {/* Line T1 -> T2 */}
            <Line
              x1={170} y1={60}
              x2={170} y2={190}
              stroke={connectionStatuses.t1_t2 ? "url(#glowingLineGrad)" : "rgba(255,255,255,0.08)"}
              strokeWidth={connectionStatuses.t1_t2 ? 2.5 : 1.5}
              strokeDasharray={connectionStatuses.t1_t2 ? undefined : "4 4"}
            />
            
            {/* Line T2 -> T3_A */}
            <Line
              x1={170} y1={190}
              x2={80} y2={320}
              stroke={connectionStatuses.t2_t3a ? "url(#glowingLineGrad)" : "rgba(255,255,255,0.08)"}
              strokeWidth={connectionStatuses.t2_t3a ? 2.5 : 1.5}
              strokeDasharray={connectionStatuses.t2_t3a ? undefined : "4 4"}
            />
            
            {/* Line T2 -> T3_B */}
            <Line
              x1={170} y1={190}
              x2={260} y2={320}
              stroke={connectionStatuses.t2_t3b ? "url(#glowingLineGrad)" : "rgba(255,255,255,0.08)"}
              strokeWidth={connectionStatuses.t2_t3b ? 2.5 : 1.5}
              strokeDasharray={connectionStatuses.t2_t3b ? undefined : "4 4"}
            />

            {/* Line T3_A -> T4_A */}
            <Line
              x1={80} y1={320}
              x2={80} y2={450}
              stroke={connectionStatuses.t3a_t4a ? "url(#glowingLineGrad)" : "rgba(255,255,255,0.08)"}
              strokeWidth={connectionStatuses.t3a_t4a ? 2.5 : 1.5}
              strokeDasharray={connectionStatuses.t3a_t4a ? undefined : "4 4"}
            />

            {/* Line T3_B -> T4_B */}
            <Line
              x1={260} y1={320}
              x2={260} y2={450}
              stroke={connectionStatuses.t3b_t4b ? "url(#glowingLineGrad)" : "rgba(255,255,255,0.08)"}
              strokeWidth={connectionStatuses.t3b_t4b ? 2.5 : 1.5}
              strokeDasharray={connectionStatuses.t3b_t4b ? undefined : "4 4"}
            />
          </Svg>

          {/* Render Nodes Absolute Over SVG Lines */}
          {renderSkillNode(t1, 170, 60)}
          {renderSkillNode(t2, 170, 190)}
          {renderSkillNode(t3_a, 80, 320)}
          {renderSkillNode(t3_b, 260, 320)}
          {renderSkillNode(t4_a, 80, 450)}
          {renderSkillNode(t4_b, 260, 450)}
        </View>
      </ScrollView>

      {/* ─── Detail Drawer Modal ────────────────────────────────────────── */}
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
            {/* Modal Ambient Glow */}
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id="modalCardGlow" cx="50%" cy="0%" rx="80%" ry="50%">
                  <Stop offset="0%" stopColor="#D4A754" stopOpacity="0.08" />
                  <Stop offset="100%" stopColor="#14161C" stopOpacity="0" stopColor="transparent" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="#14161C" rx={20} />
              <Rect width="100%" height="100%" fill="url(#modalCardGlow)" rx={20} />
              <Rect x="1" y="1" width="98%" height="98%" rx={19} fill="none" stroke="rgba(212, 167, 84, 0.15)" strokeWidth={1} />
            </Svg>

            {selectedSkill && (
              <ScrollView
                style={{ maxHeight: SCREEN_HEIGHT * 0.85 }}
                contentContainerStyle={styles.modalInner}
                showsVerticalScrollIndicator={false}
              >
                {/* Close Button */}
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedSkill(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>

                {/* Path Tag */}
                <Text style={styles.modalPathTag}>
                  {selectedPathData?.label.toUpperCase()} PATH • TIER {selectedSkill.tier}
                </Text>

                {/* Skill Title Section */}
                <View style={styles.modalTitleRow}>
                  <View style={styles.modalEmojiWrapper}>
                    <Text style={styles.modalEmoji}>
                      {SKILL_EMOJIS[selectedSkill.id] || '✨'}
                    </Text>
                  </View>
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
                      activeOpacity={0.8}
                      onPress={handleLearnSkill}
                    >
                      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                        <Defs>
                          <LinearGradient id="learnBtnGrad" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0%" stopColor="#F9D99A" />
                            <Stop offset="100%" stopColor="#D4A754" />
                          </LinearGradient>
                        </Defs>
                        <Rect width="100%" height="100%" fill="url(#learnBtnGrad)" rx={10} />
                      </Svg>
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
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07070A',
  },
  treeScroll: {
    flex: 1,
  },
  treeScrollContent: {
    paddingVertical: 16,
    paddingBottom: 80,
  },

  /* ── Header ──────────────────────────────────────────────── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  backBtn: {
    width: 70,
    paddingVertical: 6,
  },
  backText: {
    color: '#D4A754',
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 20,
    color: '#F8FAFC',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  spBadgeContainer: {
    backgroundColor: 'rgba(212, 167, 84, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.3)',
    width: 70,
    alignItems: 'center',
  },
  skillPointsBadge: {
    fontFamily: 'System',
    color: '#D4A754',
    fontWeight: 'bold',
    fontSize: 12,
  },

  /* ── Tab Bar ─────────────────────────────────────────────── */
  tabBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    position: 'relative',
    overflow: 'hidden',
    height: 60,
  },
  tabIcon: {
    fontSize: 16,
    opacity: 0.4,
  },
  tabLabel: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '600',
    color: '#707F94',
    marginTop: 2,
  },
  tabProgressText: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 1,
  },

  /* ── Intro Card ──────────────────────────────────────────── */
  introCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
    minHeight: 70,
  },
  introCardInner: {
    padding: 14,
    zIndex: 2,
  },
  introTitle: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#D4A754',
    marginBottom: 4,
  },
  introDesc: {
    fontFamily: 'System',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 16,
  },

  /* ── Tree Constellation Layout ───────────────────────────── */
  treeContainer: {
    alignSelf: 'center',
    width: 340,
    height: 520,
    position: 'relative',
  },
  nodeWrapper: {
    position: 'absolute',
    width: 70,
    height: 120,
    alignItems: 'center',
    zIndex: 5,
  },
  nodeCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#0A0A0F',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  nodeCircleEquipped: {
    borderWidth: 2,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  nodeEmoji: {
    fontSize: 24,
    zIndex: 2,
  },
  equippedDot: {
    position: 'absolute',
    bottom: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4A754',
    zIndex: 3,
  },
  nodeNameWrapper: {
    marginTop: 6,
    alignItems: 'center',
    width: 90,
  },
  nodeNameText: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '600',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  nodeTypeText: {
    fontFamily: 'System',
    fontSize: 8,
    color: '#707F94',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 1,
    letterSpacing: 0.5,
  },

  /* ─── Detail Drawer Modal ────────────────────────────────────────── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
  },
  modalInner: {
    padding: 20,
    zIndex: 2,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    padding: 6,
    zIndex: 10,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#707F94',
    fontWeight: 'bold',
  },
  modalPathTag: {
    fontFamily: 'System',
    fontSize: 9,
    color: '#707F94',
    letterSpacing: 1.5,
    fontWeight: '900',
    marginBottom: 6,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalEmojiWrapper: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalEmoji: {
    fontSize: 28,
  },
  modalTitleTextContainer: {
    flex: 1,
  },
  modalSkillName: {
    fontFamily: 'System',
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 4,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
  },
  badgePassive: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
  },
  typeBadgeText: {
    fontFamily: 'System',
    fontSize: 8,
    color: '#F8FAFC',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalCooldown: {
    fontFamily: 'System',
    fontSize: 9,
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  modalDesc: {
    fontFamily: 'System',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInfoBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
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
    color: '#10B981',
  },
  bulletRed: {
    color: '#FF4444',
  },
  modalInfoText: {
    fontFamily: 'System',
    fontSize: 11,
    flex: 1,
  },
  textMet: {
    color: '#F8FAFC',
  },
  textUnmet: {
    color: '#707F94',
  },
  textConflict: {
    color: '#FF4444',
    fontWeight: 'bold',
  },
  textNoConflict: {
    color: '#707F94',
  },

  /* Modal Actions Buttons */
  modalActions: {
    width: '100%',
  },
  learnBtn: {
    position: 'relative',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    height: 46,
  },
  learnBtnText: {
    fontFamily: 'System',
    color: '#1A1200',
    fontWeight: 'bold',
    fontSize: 13,
    zIndex: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    height: 46,
  },
  noPointsBtn: {
    borderColor: 'rgba(255, 107, 53, 0.2)',
    backgroundColor: 'rgba(255, 107, 53, 0.02)',
  },
  blockedBtn: {
    borderColor: 'rgba(255, 68, 68, 0.2)',
    backgroundColor: 'rgba(255, 68, 68, 0.02)',
  },
  disabledBtnText: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#707F94',
    fontWeight: 'bold',
  },
  unlockedBox: {
    alignItems: 'center',
    width: '100%',
  },
  unlockedLabel: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#10B981',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  passiveActiveLabel: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#707F94',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  equipRowContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  equipPromptText: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#F8FAFC',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  equipRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  equipBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  equipBtnCurrent: {
    borderColor: '#D4A754',
    backgroundColor: 'rgba(212, 167, 84, 0.08)',
  },
  equipBtnText: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  equipBtnSubtext: {
    fontFamily: 'System',
    fontSize: 8,
    color: '#707F94',
    marginTop: 2,
  },
});
