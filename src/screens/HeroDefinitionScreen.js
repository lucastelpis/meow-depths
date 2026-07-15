/**
 * HeroDefinitionScreen.js
 *
 * Merges Name Input and Element Selection into a single character creation screen.
 * Divided into a 2-step carousel (Step 1: Name, Step 2: Elemental Affinity)
 * while the title plaque, banner, and bottom action buttons remain fixed.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, G, Rect, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import theme from '../constants/theme';
import ItemSprite from '../components/ItemSprite';
import { useGame } from '../state/gameState';
import { SKILLS, SKILL_SPRITE_FRAMES } from '../data/skills';

const { width: W, height: H } = Dimensions.get('window');
const BANNER_ASPECT_RATIO = H < 700 ? 2.6 : (H < 780 ? 1.9 : 1.15);
const PLAQUE_WIDTH = Math.min(W - 80, 320);
const SLIDE_WIDTH = W - 40; // Full screen width minus screen padding (20 on each side)

// Element definitions (matching the state properties of the game)
const ELEMENTS = [
  {
    id: 'fire',
    name: 'FIRE',
    icon: '🔥',
    tagline: 'Relentless power. Patient pressure, high explosive damage.',
    color: '#FF6B35',
    borderColor: 'rgba(255, 107, 53, 0.6)',
    power: '+1% ATK / LV',
    spriteFrame: 33,
  },
  {
    id: 'water',
    name: 'WATER',
    icon: '💧',
    tagline: 'Sustain and endure. Outlast enemies with high defensive recovery.',
    color: '#3B9EFF',
    borderColor: 'rgba(59, 158, 255, 0.6)',
    power: '+1% HP / LV',
    spriteFrame: 35,
  },
  {
    id: 'earth',
    name: 'EARTH',
    icon: '⛰️',
    tagline: 'Immovable. Absorb punishment and resist physical impacts.',
    color: '#D4A754',
    borderColor: 'rgba(212, 167, 84, 0.6)',
    power: '+1 DEF / LV',
    spriteFrame: 36,
  },
  {
    id: 'wind',
    name: 'WIND',
    icon: '🌪️',
    tagline: 'Agile and precise. Dodge deadly attacks and strike swiftly.',
    color: '#5CC4B8',
    borderColor: 'rgba(92, 196, 184, 0.6)',
    power: '+1 AGI / LV',
    spriteFrame: 34,
  },
];

const ELEMENT_TO_STARTING_SKILL = {
  fire: 'fire_slash',
  water: 'tidal_strike',
  earth: 'boulder_slash',
  wind: 'dual_slash',
};

const SKILL_STAT_LABELS = {
  damageMultiplier: 'Base Damage',
  agiScaling: 'Bonus Attack from Agility',
  burnDamage: 'Burn Damage / Turn',
  burnDuration: 'Burn Duration',
  burnTickBonus: 'Burn Damage Bonus',
  spreadPercent: 'Splash Damage',
  spreadBurnChance: 'Splash Burn Chance',
  counterBurnDamage: 'Counter Damage / Turn',
  counterBurnDuration: 'Counter Duration',
  guardDuration: 'Guard Duration',
  damageReduction: 'Damage Reduction',
  healPercent: 'Heal Amount',
  healDuration: 'Heal Duration',
  bonusHealPercent: 'Bonus Healing',
  stunChance: 'Stun Chance',
  stunDuration: 'Stun Duration',
  dodgeChance: 'Dodge Bonus',
  critChance: 'Crit Chance Bonus',
  critDamage: 'Crit Damage Bonus',
  cooldownReduction: 'Cooldown Reduction',
};

function formatSkillStatValue(key, val) {
  if (val === undefined || val === null) return '—';
  if (key === 'damageMultiplier') return `${Math.round(val * 100)}% ATK`;
  if (key === 'damageReduction') return `-${Math.round(val * 100)}%`;
  if (key === 'spreadPercent') return `${Math.round(val * 100)}%`;
  if (key === 'spreadBurnChance') return `${Math.round(val * 100)}%`;
  if (key === 'burnAtkPercent') return `${Math.round(val * 100)}% ATK`;
  if (key === 'healPercent') return `${Math.round(val * 100)}% Max HP`;
  if (key === 'bonusHealPercent') return `+${Math.round(val * 100)}%`;
  if (key === 'stunChance') return `${Math.round(val * 100)}%`;
  if (key === 'dodgeChance') return `+${Math.round(val * 100)}%`;
  if (key === 'critChance') return `+${Math.round(val * 100)}%`;
  if (key === 'critDamage') return `+${Math.round(val * 100)}%`;
  if (key.toLowerCase().includes('percent') || key.toLowerCase().includes('scaling')) {
    if (val < 1.0) return `+${Math.round(val * 100)}%`;
  }
  return val.toString();
}

// Simplified SkillSprite helper for onboarding
function SkillSprite({ skillId, size = 24 }) {
  const frame = SKILL_SPRITE_FRAMES[skillId];
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {frame !== undefined ? (
        <ItemSprite spritesheet="skill-icons-1" frameIndex={frame} displaySize={size} />
      ) : (
        <Text style={{ fontSize: size * 0.7 }}>✨</Text>
      )}
    </View>
  );
}

export default function HeroDefinitionScreen({ navigation }) {
  const { dispatch } = useGame();
  const [heroName, setHeroName] = useState('Mochi');
  const [selectedElement, setSelectedElement] = useState('fire');
  const [activeSlide, setActiveSlide] = useState(0); // 0: Name, 1: Element

  // Modals state
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [infoModal, setInfoModal] = useState(null); // { title: string, desc: string }
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showInnateModal, setShowInnateModal] = useState(false);
  const [cardLayout, setCardLayout] = useState({ width: 0, height: 0 });
  const [confirmModalLayout, setConfirmModalLayout] = useState({ width: 0, height: 0 });
  const [helpModalLayout, setHelpModalLayout] = useState({ width: 0, height: 0 });

  const carouselRef = useRef(null);
  const selectedElDef = ELEMENTS.find((e) => e.id === selectedElement) || ELEMENTS[0];

  const handleNext = () => {
    setActiveSlide(1);
    carouselRef.current?.scrollTo({ x: SLIDE_WIDTH, animated: true });
  };

  const handlePrev = () => {
    setActiveSlide(0);
    carouselRef.current?.scrollTo({ x: 0, animated: true });
  };

  const handleBackPress = () => {
    if (activeSlide === 1) {
      handlePrev();
    } else {
      navigation.goBack();
    }
  };

  const handleContinueClick = () => {
    if (activeSlide === 0) {
      handleNext();
    } else {
      setConfirmModalVisible(true);
    }
  };

  const handleFinalConfirm = () => {
    setConfirmModalVisible(false);
    dispatch({
      type: 'SELECT_ELEMENT',
      payload: {
        element: selectedElement,
        name: heroName.trim() || 'Mochi',
      },
    });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>← BACK</Text>
          </TouchableOpacity>

          {/* Banner Boxed with Border Outline + Plaque Title Overlay */}
          <View style={[styles.bannerOuter, { aspectRatio: BANNER_ASPECT_RATIO }]}>
            <View style={styles.bannerContainer}>
              <ExpoImage
                source={require('../../assets/sprites/banners/onboarding-banner.png')}
                style={styles.bannerImage}
                contentFit="cover"
              />
            </View>
            {/* Dark overlay tint for plaque text readability */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: theme.BORDER_RADIUS.card }]} />

            <View style={styles.bannerTitleOverlay}>
              <View style={styles.titlePlaqueOuter}>
                <View style={styles.titlePlaqueInner}>
                  <Text style={styles.titlePlaqueText}>
                    DEFINE WHO YOU ARE
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* PAGE DOTS INDICATOR */}
          <View style={styles.dotsRow}>
            <View style={[styles.dot, activeSlide === 0 ? styles.dotActive : styles.dotInactive]} />
            <View style={[styles.dot, activeSlide === 1 ? styles.dotActive : styles.dotInactive]} />
          </View>

          {/* CAROUSEL CONTAINER */}
          <View style={styles.carouselContainer}>
            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              style={{ width: SLIDE_WIDTH }}
              contentContainerStyle={{ width: SLIDE_WIDTH * 2 }}
            >
              {/* SLIDE 1: NAME SECTION */}
              <View style={[styles.slide, { width: SLIDE_WIDTH }]}>
                <View style={styles.headingWithInfo}>
                  <Text style={styles.sectionHeading}>WHAT IS YOUR NAME?</Text>
                  <TouchableOpacity
                    style={styles.infoTag}
                    onPress={() => setInfoModal({
                      title: 'RECRUIT NAME',
                      desc: 'This is the name of your recruit. It will be used in dialogue, notes, and records throughout your adventure. Pick something legendary!',
                    })}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.infoTagText}>?</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.nameInputWrapper}>
                  <TextInput
                    style={styles.nameInput}
                    value={heroName}
                    onChangeText={setHeroName}
                    placeholder="Mochi"
                    placeholderTextColor="rgba(255, 243, 218, 0.4)"
                    maxLength={14}
                    selectTextOnFocus
                    textAlign="center"
                    cursorColor="#E8A73A"
                    selectionColor="rgba(232, 167, 58, 0.4)"
                  />
                </View>
              </View>

              {/* SLIDE 2: ELEMENT SECTION */}
              <View style={[styles.slide, { width: SLIDE_WIDTH }]}>
                <View style={styles.headingWithInfo}>
                  <Text style={styles.sectionHeading}>WHAT IS YOUR ELEMENTAL AFFINITY?</Text>
                  <TouchableOpacity
                    style={styles.infoTag}
                    onPress={() => setInfoModal({
                      title: 'ELEMENTAL AFFINITY',
                      desc: 'Every recruit carries an elemental affinity (Fire, Water, Earth or Wind). It determines your innate trait and starting skill. Choose wisely!\nYou will still be able to access and upgrade skills from other elements.',
                    })}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.infoTagText}>?</Text>
                  </TouchableOpacity>
                </View>

                {/* Row of Element selector buttons */}
                <View style={styles.elementRow}>
                  {ELEMENTS.map((el) => {
                    const isSelected = selectedElement === el.id;
                    return (
                      <View key={el.id} style={styles.elementBtnWrapper}>
                        {/* 3D Under-Shadow */}
                        <View
                          style={[
                            styles.elementBtnShadow,
                            isSelected
                              ? { backgroundColor: el.color, opacity: 0.4 }
                              : styles.elementBtnShadowUnselected,
                          ]}
                        />

                        {/* Outer Touchable Button */}
                        <TouchableOpacity
                          style={[
                            styles.elementBtnOuter,
                            isSelected
                              ? { borderColor: el.color, backgroundColor: 'rgba(0, 0, 0, 0.3)' }
                              : styles.elementBtnOuterUnselected,
                          ]}
                          onPress={() => setSelectedElement(el.id)}
                          activeOpacity={0.8}
                        >
                          {/* Inner Bevel */}
                          <View
                            style={[
                              styles.elementBtnInner,
                              isSelected
                                ? {
                                  backgroundColor: `${el.color}25`,
                                  borderTopColor: el.color,
                                  borderLeftColor: el.color,
                                  borderRightColor: el.color,
                                  borderBottomColor: `${el.color}60`,
                                  borderBottomWidth: 3.5,
                                }
                                : styles.elementBtnInnerUnselected,
                            ]}
                          >
                            <ItemSprite
                              spritesheet="icons-1"
                              frameIndex={el.spriteFrame}
                              displaySize={28}
                            />
                            <Text
                              style={[
                                styles.elementBtnText,
                                isSelected
                                  ? { color: el.color }
                                  : { color: 'rgba(255, 243, 218, 0.4)' },
                              ]}
                            >
                              {el.name}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>

                {/* Selected Element Details Card */}
                <View
                  style={[styles.detailCard, { borderColor: selectedElDef.color }]}
                  onLayout={(e) => {
                    const { width, height } = e.nativeEvent.layout;
                    setCardLayout({ width, height });
                  }}
                >
                  {/* Radial gradient background based on selected element */}
                  {cardLayout.width > 0 && cardLayout.height > 0 && (
                    <Svg
                      style={StyleSheet.absoluteFill}
                      width={cardLayout.width}
                      height={cardLayout.height}
                    >
                      <Defs>
                        <RadialGradient id={`cardGlow-${selectedElDef.id}`} cx="50%" cy="50%" rx="60%" ry="60%">
                          <Stop offset="0%" stopColor={selectedElDef.color} stopOpacity={0.16} />
                          <Stop offset="100%" stopColor="#112222" stopOpacity={1} />
                        </RadialGradient>
                      </Defs>
                      <Rect
                        x={0}
                        y={0}
                        width={cardLayout.width}
                        height={cardLayout.height}
                        fill={`url(#cardGlow-${selectedElDef.id})`}
                      />
                    </Svg>
                  )}

                  <Text style={styles.detailTaglineText}>
                    {selectedElDef.tagline}
                  </Text>

                  {/* Two columns: Innate on left, Starting Skill on right */}
                  <View style={styles.twoColRow}>
                    {/* Left Column: Innate */}
                    <View style={[styles.innateBoxHalf, { borderColor: selectedElDef.borderColor, backgroundColor: `${selectedElDef.color}10` }]}>
                      {/* ? button on the top right */}
                      <TouchableOpacity
                        style={styles.infoQuestionBtn}
                        onPress={() => setShowInnateModal(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.infoQuestionText}>?</Text>
                      </TouchableOpacity>

                      <Text style={[styles.columnLabel, { color: selectedElDef.color }]}>INNATE TRAIT</Text>
                      <Text style={styles.innateValueText}>{selectedElDef.power}</Text>
                    </View>

                    {/* Right Column: Starting Skill */}
                    <View style={[styles.skillBoxHalf, { borderColor: selectedElDef.borderColor, backgroundColor: `${selectedElDef.color}10` }]}>
                      {/* ? button on the top right */}
                      <TouchableOpacity
                        style={styles.infoQuestionBtn}
                        onPress={() => setShowSkillModal(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.infoQuestionText}>?</Text>
                      </TouchableOpacity>

                      <Text style={[styles.columnLabel, { color: selectedElDef.color }]}>STARTING SKILL</Text>

                      {/* Skill display inside card: icon + name */}
                      {(() => {
                        const skillId = ELEMENT_TO_STARTING_SKILL[selectedElDef.id];
                        const skill = SKILLS[skillId];
                        return (
                          <View style={styles.skillCardContent}>
                            <SkillSprite skillId={skillId} size={22} />
                            <Text style={styles.skillNameText} numberOfLines={1}>
                              {skill?.name || ''}
                            </Text>
                          </View>
                        );
                      })()}
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>

        </ScrollView>

        {/* Fixed Action Button Footer at the Bottom */}
        <View style={styles.footer}>
          <View style={styles.confirmBtnWrapper}>
            <View style={styles.confirmBtnShadow} />
            <TouchableOpacity
              style={styles.confirmBtnOuter}
              onPress={handleContinueClick}
              activeOpacity={0.85}
            >
              <View style={styles.confirmBtnInner}>
                <Text style={styles.confirmBtnLabel}>
                  {activeSlide === 0 ? 'NEXT STEP ➔' : 'CONFIRM CHARACTER ➔'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.confirmSubtext}>
            {activeSlide === 0 ? 'Step 1 of 2: Character Name' : 'Step 2 of 2: Affinity Path'}
          </Text>
        </View>
      </View>

      {/* CONFIRMATION MODAL */}
      <Modal
        transparent
        visible={confirmModalVisible}
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setConfirmModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={styles.modalContent}
                onLayout={(e) => {
                  const { width, height } = e.nativeEvent.layout;
                  setConfirmModalLayout({ width, height });
                }}
              >
                {/* Background gradient overlay in Modal */}
                {confirmModalLayout.width > 0 && confirmModalLayout.height > 0 && (
                  <Svg
                    style={StyleSheet.absoluteFill}
                    width={confirmModalLayout.width}
                    height={confirmModalLayout.height}
                  >
                    <Defs>
                      <RadialGradient id="modalGlow" cx="50%" cy="50%" rx="70%" ry="70%">
                        <Stop offset="0%" stopColor={selectedElDef.color} stopOpacity={0.22} />
                        <Stop offset="100%" stopColor="#1E1E22" stopOpacity={1} />
                      </RadialGradient>
                    </Defs>
                    <Rect
                      x={0}
                      y={0}
                      width={confirmModalLayout.width}
                      height={confirmModalLayout.height}
                      fill="url(#modalGlow)"
                    />
                  </Svg>
                )}

                <Text style={styles.modalTitle}>ARE YOU READY?</Text>
                <Text style={styles.modalBody}>
                  You are about to begin your journey as{' '}
                  <Text style={{ color: '#FFF3DA', fontFamily: 'PressStart2P-Regular', fontSize: 13 }}>
                    {heroName.trim() || 'Mochi'}
                  </Text>{' '}
                  with{' '}
                  <Text style={{ color: selectedElDef.color, fontFamily: 'PressStart2P-Regular', fontSize: 13 }}>
                    {selectedElDef.name}
                  </Text>{' '}
                  affinity.
                </Text>

                <View style={styles.modalWarningBox}>
                  <ItemSprite spritesheet="icons-map" frameIndex={142} displaySize={18} />
                  <Text style={styles.modalWarningText}>
                    Elemental affinity cannot be changed later.
                  </Text>
                </View>

                <View style={styles.modalButtonRow}>
                  {/* Cancel Button */}
                  <View style={[styles.modalBtnWrapper, { marginRight: 10 }]}>
                    <View style={styles.modalBtnShadow} />
                    <TouchableOpacity
                      style={styles.modalCancelBtnOuter}
                      onPress={() => setConfirmModalVisible(false)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.modalCancelBtnInner}>
                        <Text style={styles.modalCancelText}>CANCEL</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Confirm/Begin Button */}
                  <View style={styles.modalBtnWrapper}>
                    <View style={styles.modalBtnShadow} />
                    <TouchableOpacity
                      style={[
                        styles.modalConfirmBtnOuter,
                        {
                          borderColor: selectedElDef.borderColor,
                          backgroundColor: `${selectedElDef.color}20`,
                        },
                      ]}
                      onPress={handleFinalConfirm}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.modalConfirmBtnInner,
                          {
                            backgroundColor: `${selectedElDef.color}35`,
                            borderTopColor: selectedElDef.color,
                            borderLeftColor: selectedElDef.color,
                            borderRightColor: selectedElDef.color,
                            borderBottomColor: 'rgba(0, 0, 0, 0.35)',
                          },
                        ]}
                      >
                        <Text style={[styles.modalConfirmText, { color: selectedElDef.color }]}>
                          BEGIN
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* HELP INFO MODAL */}
      <Modal
        transparent
        visible={!!infoModal}
        animationType="fade"
        onRequestClose={() => setInfoModal(null)}
      >
        <TouchableWithoutFeedback onPress={() => setInfoModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={styles.modalContent}
                onLayout={(e) => {
                  const { width, height } = e.nativeEvent.layout;
                  setHelpModalLayout({ width, height });
                }}
              >
                {/* Background gradient overlay in Help Modal */}
                {helpModalLayout.width > 0 && helpModalLayout.height > 0 && (
                  <Svg
                    style={StyleSheet.absoluteFill}
                    width={helpModalLayout.width}
                    height={helpModalLayout.height}
                  >
                    <Defs>
                      <RadialGradient id="helpModalGlow" cx="50%" cy="50%" rx="70%" ry="70%">
                        <Stop offset="0%" stopColor="#E8A73A" stopOpacity={0.15} />
                        <Stop offset="100%" stopColor="#1E1E22" stopOpacity={1} />
                      </RadialGradient>
                    </Defs>
                    <Rect
                      x={0}
                      y={0}
                      width={helpModalLayout.width}
                      height={helpModalLayout.height}
                      fill="url(#helpModalGlow)"
                    />
                  </Svg>
                )}

                <Text style={styles.helpModalTitle}>{infoModal?.title}</Text>
                <Text style={styles.helpModalBody}>{infoModal?.desc}</Text>

                <TouchableOpacity
                  style={styles.helpModalCloseBtn}
                  onPress={() => setInfoModal(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.helpModalCloseText}>CLOSE</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* STARTING SKILL INFO MODAL */}
      <Modal
        transparent
        visible={showSkillModal}
        animationType="fade"
        onRequestClose={() => setShowSkillModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSkillModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[styles.modalContent, { borderColor: selectedElDef.borderColor }]}
              >
                {/* Close X button in top right */}
                <TouchableOpacity
                  style={styles.modalSkillCloseIconBtn}
                  onPress={() => setShowSkillModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalSkillCloseIconText}>✕</Text>
                </TouchableOpacity>

                {(() => {
                  const skillId = ELEMENT_TO_STARTING_SKILL[selectedElDef.id];
                  const skill = SKILLS[skillId];
                  if (!skill) return null;

                  return (
                    <>
                      {/* Header: Skill Icon + Name */}
                      <View style={styles.modalSkillHeader}>
                        <SkillSprite skillId={skillId} size={42} />
                        <View style={styles.modalSkillTitleCol}>
                          <Text style={[styles.modalSkillNameText, { color: selectedElDef.color }]}>{skill.name}</Text>
                          <View style={styles.modalSkillBadges}>
                            <View style={[styles.typeBadge, { borderColor: 'rgba(240, 138, 74, 0.4)' }]}>
                              <Text style={styles.typeBadgeText}>ACTIVE</Text>
                            </View>
                            {skill.cooldown > 0 && (
                              <View style={styles.cooldownBadgeRow}>
                                <ItemSprite spritesheet="icons-map" frameIndex={86} displaySize={11} />
                                <Text style={styles.modalSkillCooldown}>{skill.cooldown}-TURN CD</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Description */}
                      <Text style={styles.modalSkillDescText}>{skill.description}</Text>

                      {/* Stats Preview */}
                      {skill.stars?.[1] && (
                        <View style={[styles.modalSkillStatsBox, { borderColor: 'rgba(255, 243, 218, 0.15)' }]}>
                          <Text style={styles.modalSkillStatsTitle}>★1 INITIAL STATS</Text>
                          {Object.entries(skill.stars[1]).map(([k, v]) => (
                            <View key={k} style={styles.modalSkillStatRow}>
                              <Text style={styles.modalSkillStatLabel}>{SKILL_STAT_LABELS[k] || k}:</Text>
                              <Text style={styles.modalSkillStatValue}>{formatSkillStatValue(k, v)}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  );
                })()}

                <TouchableOpacity
                  style={[styles.modalSkillOkBtn, { backgroundColor: selectedElDef.color }]}
                  onPress={() => setShowSkillModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalSkillOkBtnText}>GOT IT</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* INNATE TRAIT INFO MODAL */}
      <Modal
        transparent
        visible={showInnateModal}
        animationType="fade"
        onRequestClose={() => setShowInnateModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowInnateModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[styles.modalContent, { borderColor: selectedElDef.borderColor }]}
              >
                {/* Close X button in top right */}
                <TouchableOpacity
                  style={styles.modalSkillCloseIconBtn}
                  onPress={() => setShowInnateModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalSkillCloseIconText}>✕</Text>
                </TouchableOpacity>

                {/* Header: Innate Sprite + Title */}
                <View style={styles.modalSkillHeader}>
                  <ItemSprite spritesheet="icons-1" frameIndex={selectedElDef.spriteFrame} displaySize={38} />
                  <View style={styles.modalSkillTitleCol}>
                    <Text style={[styles.modalSkillNameText, { color: selectedElDef.color }]}>{selectedElDef.name} INNATE</Text>
                    <View style={styles.modalSkillBadges}>
                      <View style={[styles.typeBadge, { borderColor: 'rgba(92, 196, 184, 0.4)', backgroundColor: 'rgba(0,0,0,0.25)' }]}>
                        <Text style={[styles.typeBadgeText, { color: '#5CC489' }]}>INNATE TRAIT</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.modalSkillDescText}>
                  {selectedElDef.id === 'fire' && "FIRE INNATE: Increases base Attack power by +1% per hero level."}
                  {selectedElDef.id === 'water' && "WATER INNATE: Increases base Maximum HP by +1% per hero level."}
                  {selectedElDef.id === 'earth' && "EARTH INNATE: Grants +1 Defense per hero level."}
                  {selectedElDef.id === 'wind' && "WIND INNATE: Grants +1 Agility per hero level."}
                </Text>

                {/* Core Stats Guide */}
                <View style={[styles.modalSkillStatsBox, { borderColor: 'rgba(255, 243, 218, 0.15)' }]}>
                  <Text style={styles.modalSkillStatsTitle}>CORE STATS GUIDE</Text>

                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontFamily: 'Silkscreen-Regular', fontSize: 10, color: '#F9D99A', marginBottom: 2 }}>STRENGTH (STR)</Text>
                    <Text style={{ fontFamily: 'Jersey10-Regular', fontSize: 15, color: 'rgba(255, 243, 218, 0.8)', lineHeight: 17 }}>
                      +1 Attack per point. Increases raw physical damage.
                    </Text>
                  </View>

                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontFamily: 'Silkscreen-Regular', fontSize: 10, color: '#06B6D4', marginBottom: 2 }}>AGILITY (AGI)</Text>
                    <Text style={{ fontFamily: 'Jersey10-Regular', fontSize: 15, color: 'rgba(255, 243, 218, 0.8)', lineHeight: 17 }}>
                      +0.5% Crit Rate & +0.5% Dodge Rate per point. Helps land critical hits and dodge enemy attacks.
                    </Text>
                  </View>

                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontFamily: 'Silkscreen-Regular', fontSize: 10, color: '#5CC489', marginBottom: 2 }}>VITALITY (VIT)</Text>
                    <Text style={{ fontFamily: 'Jersey10-Regular', fontSize: 15, color: 'rgba(255, 243, 218, 0.8)', lineHeight: 17 }}>
                      +5 Max HP & +0.5% Status Resistance per point. Boosts total health and resilience.
                    </Text>
                  </View>

                  <View>
                    <Text style={{ fontFamily: 'Silkscreen-Regular', fontSize: 10, color: '#D4A754', marginBottom: 2 }}>DEFENSE (DEF)</Text>
                    <Text style={{ fontFamily: 'Jersey10-Regular', fontSize: 15, color: 'rgba(255, 243, 218, 0.8)', lineHeight: 17 }}>
                      Reduces incoming damage from enemy attacks.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.modalSkillOkBtn, { backgroundColor: selectedElDef.color }]}
                  onPress={() => setShowInnateModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalSkillOkBtnText}>GOT IT</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#133131',
  },
  content: {
    flex: 1,
  },
  scroll: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexGrow: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: '#133131',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 243, 218, 0.08)',
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  backBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 12,
    letterSpacing: 1,
    color: 'rgba(255, 243, 218, 0.6)',
  },

  /* Title plaque */
  titlePlaqueOuter: {
    alignSelf: 'center',
    width: PLAQUE_WIDTH,
    borderWidth: 3,
    borderColor: '#4A3917',
    borderRadius: 8,
    backgroundColor: 'transparent',
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  titlePlaqueInner: {
    borderWidth: 2,
    borderColor: '#D4A754',
    borderRadius: 5,
    backgroundColor: '#1E1E20',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  titlePlaqueText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#FFF3DA',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },

  /* Banner frame */
  bannerOuter: {
    width: '100%',
    position: 'relative',
    marginBottom: 16,
  },
  bannerContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.BORDER_RADIUS.card,
    borderWidth: 3,
    borderColor: '#4A3917',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerTitleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 12,
  },

  /* Slide indicator dots */
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  dotActive: {
    backgroundColor: '#E8A73A',
    width: 20, // slightly longer active indicator
  },
  dotInactive: {
    backgroundColor: 'rgba(255, 243, 218, 0.25)',
  },

  /* Carousel content section */
  carouselContainer: {
    height: 250,
    overflow: 'hidden',
    marginBottom: 10,
  },
  slide: {
    height: '100%',
    justifyContent: 'flex-start',
  },

  /* Headings & Subtitles */
  headingWithInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  sectionHeading: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 14,
    letterSpacing: 0.5,
    color: '#FFF3DA',
  },
  infoTag: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#E8A73A',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  infoTagText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 14,
    lineHeight: 14,
    color: '#E8A73A',
    fontStyle: 'italic',
    fontWeight: 'bold',
  },

  /* Name Input */
  nameInputWrapper: {
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#E8A73A',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  nameInput: {
    paddingBottom: 2,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(232, 167, 58, 0.5)',
    fontFamily: 'Jersey10-Regular',
    fontSize: 26,
    color: '#FFF3DA',
  },

  /* Elements Row */
  elementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  elementBtnWrapper: {
    width: (SLIDE_WIDTH - 30) / 4,
    height: 60,
    position: 'relative',
  },
  elementBtnShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    bottom: -3,
    borderRadius: 10,
    zIndex: 1,
  },
  elementBtnShadowUnselected: {
    backgroundColor: '#0A1C1C',
  },
  elementBtnOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 10,
    borderWidth: 2,
    zIndex: 2,
  },
  elementBtnOuterUnselected: {
    borderColor: '#4A3917',
    backgroundColor: '#1E1E22',
  },
  elementBtnInner: {
    flex: 1,
    margin: 1.5,
    borderRadius: 7,
    borderWidth: 2,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  elementBtnInnerUnselected: {
    backgroundColor: '#132A2A',
    borderTopColor: 'rgba(255, 243, 218, 0.15)',
    borderLeftColor: 'rgba(255, 243, 218, 0.15)',
    borderRightColor: 'rgba(255, 243, 218, 0.15)',
    borderBottomColor: 'rgba(0, 0, 0, 0.35)',
    borderBottomWidth: 3.5,
  },
  elementBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 12,
    marginTop: 0,
    textAlign: 'center',
    letterSpacing: 0,
  },

  /* Element Details Card */
  detailCard: {
    borderRadius: 12,
    borderWidth: 3,
    overflow: 'hidden',
    position: 'relative',
    padding: 10,
    minHeight: 80,
    backgroundColor: '#112222',
  },
  innateBox: {
    marginTop: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    alignSelf: 'stretch',
  },
  innateBoxText: {
    fontSize: 16,
    lineHeight: 16,
  },
  innateBoxLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 16,
    letterSpacing: 0,
  },
  innateBoxValue: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 17,
    color: '#FFF3DA',
  },
  detailTaglineText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
    lineHeight: 18,
    letterSpacing: 1,
    paddingHorizontal: 5,
    color: '#FFF3DA',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  /* Confirm Button Section */
  confirmBtnWrapper: {
    width: '100%',
    height: 52,
    position: 'relative',
    marginTop: 6,
    marginBottom: 8,
  },
  confirmBtnShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 4,
    height: 52,
    borderRadius: 10,
    zIndex: 1,
    backgroundColor: '#4F3C1E',
  },
  confirmBtnOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 52,
    borderRadius: 10,
    borderWidth: 2.2,
    borderColor: '#84735B',
    backgroundColor: '#4F3C1E',
    zIndex: 2,
  },
  confirmBtnInner: {
    flex: 1,
    margin: 1.5,
    borderRadius: 7,
    borderWidth: 2.2,
    borderTopColor: '#FFF3DA',
    borderLeftColor: '#FFF3DA',
    borderRightColor: '#FFF3DA',
    borderBottomColor: '#B5A07A',
    borderBottomWidth: 4,
    backgroundColor: '#F3E2BD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnLabel: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 28,
    color: '#2A1A0C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confirmSubtext: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    color: 'rgba(255, 243, 218, 0.45)',
    textAlign: 'center',
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#4A3917',
    backgroundColor: '#1E1E22',
    padding: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 16,
    color: '#FFF3DA',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modalBody: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 20,
    lineHeight: 25,
    color: 'rgba(255, 243, 218, 0.8)',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalWarningBox: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderColor: 'rgba(255, 107, 53, 0.3)',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalWarningText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 17,
    color: '#FF8A65',
    marginLeft: 8,
    flexShrink: 1,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtnWrapper: {
    flex: 1,
    height: 44,
    position: 'relative',
  },
  modalBtnShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    height: 44,
    borderRadius: 8,
    zIndex: 1,
    backgroundColor: '#0A1513',
  },
  modalCancelBtnOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: '#1E2522',
    zIndex: 2,
  },
  modalCancelBtnInner: {
    flex: 1,
    margin: 1,
    borderRadius: 5,
    borderWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomColor: 'rgba(0, 0, 0, 0.35)',
    borderBottomWidth: 3,
    backgroundColor: '#2A3330',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 22,
    color: 'rgba(255, 243, 218, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalConfirmBtnOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    zIndex: 2,
  },
  modalConfirmBtnInner: {
    flex: 1,
    margin: 1,
    borderRadius: 5,
    borderWidth: 2,
    borderBottomWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 22,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Help modal specific styles */
  helpModalTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 14,
    color: '#E8A73A',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  helpModalBody: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 20,
    lineHeight: 25,
    color: '#FFF3DA',
    textAlign: 'center',
    marginBottom: 24,
  },
  helpModalCloseBtn: {
    alignSelf: 'center',
    width: '60%',
    borderWidth: 2.5,
    borderColor: '#E8A73A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(232, 167, 58, 0.1)',
  },
  helpModalCloseText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 12,
    color: '#E8A73A',
  },

  /* Two-column layout in Element Affinity Card */
  twoColRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    alignSelf: 'stretch',
  },
  innateBoxHalf: {
    width: '48.5%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
  },
  skillBoxHalf: {
    width: '48.5%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    position: 'relative',
  },
  columnLabel: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 12,
    letterSpacing: 0,
    marginBottom: 6,
  },
  innateValueText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 20,
    color: '#FFF3DA',
    lineHeight: 22,
  },
  infoQuestionBtn: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#E8A73A',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  infoQuestionText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 14,
    lineHeight: 14,
    color: '#E8A73A',
    fontStyle: 'italic',
    fontWeight: 'bold',
  },
  skillCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  skillNameText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 20,
    color: '#FFF3DA',
    flex: 1,
    lineHeight: 22,
  },

  /* Starting Skill Detail Modal inside Onboarding */
  modalSkillCloseIconBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
    zIndex: 10,
  },
  modalSkillCloseIconText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 14,
    color: 'rgba(255,243,218,0.5)',
  },
  modalSkillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    marginTop: 10,
  },
  modalSkillTitleCol: {
    flex: 1,
  },
  modalSkillNameText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 6,
    lineHeight: 14,
  },
  modalSkillBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(240, 138, 74, 0.4)',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  typeBadgeText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    color: '#F08A4A',
  },
  cooldownBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalSkillCooldown: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 8,
    color: '#FFA07A',
  },
  modalSkillDescText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 17,
    color: 'rgba(255,243,218,0.8)',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalSkillStatsBox: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
    marginBottom: 18,
  },
  modalSkillStatsTitle: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    color: 'rgba(255,243,218,0.45)',
    marginBottom: 8,
  },
  modalSkillStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalSkillStatLabel: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: 'rgba(255,243,218,0.6)',
  },
  modalSkillStatValue: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 16,
    color: '#FFF3DA',
  },
  modalSkillOkBtn: {
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3.5,
    borderBottomColor: 'rgba(0,0,0,0.35)',
    marginTop: 4,
  },
  modalSkillOkBtnText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 12,
    color: '#FFF3DA',
  },
});
