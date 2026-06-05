/**
 * ElementSelectionScreen.js
 *
 * Shown ONCE on first app launch (when hero.element is null).
 * Player sets their name and chooses their element.
 * On confirm → dispatches SELECT_ELEMENT and the Camp screen takes over.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Modal,
  Pressable,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  Path,
  G,
  Polygon,
  Ellipse,
} from 'react-native-svg';

import { useGame } from '../state/gameState';
import theme from '../constants/theme';

const { width: W } = Dimensions.get('window');

// ─── Constants for snap carousel ─────────────────────────────────────────────
const CARD_WIDTH = W * 0.78;
const CARD_GAP = 16;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;
const SIDE_INSET = (W - CARD_WIDTH) / 2;

// ─── Custom Thematic SVG Artwork Components ───────────────────────────────────

function MeowOrderCrest() {
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 300 150" width="100%" height="100%">
      {/* Sword 1 (Diagonal Top-Left to Bottom-Right) */}
      <Path
        d="M60 25 L240 125"
        stroke="rgba(212,167,84,0.06)"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Path
        d="M215 122 L228 102"
        stroke="rgba(212,167,84,0.06)"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <Path
        d="M220 112 L238 125"
        stroke="rgba(212,167,84,0.06)"
        strokeWidth={4.5}
        strokeLinecap="round"
      />
      <Circle cx={238} cy={125} r={3.5} fill="rgba(212,167,84,0.06)" />

      {/* Sword 2 (Diagonal Top-Right to Bottom-Left) */}
      <Path
        d="M240 25 L60 125"
        stroke="rgba(212,167,84,0.06)"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Path
        d="M85 122 L72 102"
        stroke="rgba(212,167,84,0.06)"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <Path
        d="M80 112 L62 125"
        stroke="rgba(212,167,84,0.06)"
        strokeWidth={4.5}
        strokeLinecap="round"
      />
      <Circle cx={62} cy={125} r={3.5} fill="rgba(212,167,84,0.06)" />

      {/* Shield */}
      <Path
        d="M150 45
           C150 45, 110 38, 110 38
           L110 75
           C110 100, 150 118, 150 118
           C150 118, 190 100, 190 75
           L190 38
           C190 38, 150 45, 150 45 Z"
        fill="rgba(212,167,84,0.02)"
        stroke="rgba(212,167,84,0.12)"
        strokeWidth={1.5}
      />

      {/* Paw Emblem */}
      <Ellipse cx={150} cy={82} rx={10} ry={8} fill="rgba(212,167,84,0.08)" />
      <Circle cx={137} cy={70} r={3} fill="rgba(212,167,84,0.08)" />
      <Circle cx={145} cy={66} r={3.5} fill="rgba(212,167,84,0.08)" />
      <Circle cx={155} cy={66} r={3.5} fill="rgba(212,167,84,0.08)" />
      <Circle cx={163} cy={70} r={3} fill="rgba(212,167,84,0.08)" />
    </Svg>
  );
}

function FireArtwork({ isSelected }) {
  return (
    <Svg width={110} height={110} viewBox="0 0 140 140">
      <Defs>
        <RadialGradient id="fireAura" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FF6B35" stopOpacity={isSelected ? 0.45 : 0.2} />
          <Stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="outerFlameGrad" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0%" stopColor="#FF3E00" />
          <Stop offset="50%" stopColor="#FF8500" />
          <Stop offset="100%" stopColor="#FFAA00" stopOpacity={0.8} />
        </LinearGradient>
        <LinearGradient id="innerFlameGrad" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0%" stopColor="#FF8500" />
          <Stop offset="70%" stopColor="#FFD000" />
          <Stop offset="100%" stopColor="#FFFFEE" />
        </LinearGradient>
      </Defs>
      <Circle cx={70} cy={75} r={55} fill="url(#fireAura)" />
      <Ellipse cx={70} cy={110} rx={35} ry={10} fill="#FF3E00" opacity={0.6} />

      {/* Outer Flame */}
      <Path
        d="M70 15 
           C60 38, 32 55, 32 85 
           C32 108, 48 122, 70 122 
           C92 122, 108 108, 108 85 
           C108 55, 80 38, 70 15 Z"
        fill="url(#outerFlameGrad)"
      />

      {/* Middle Flame */}
      <Path
        d="M70 35
           C65 52, 45 65, 45 88
           C45 104, 56 114, 70 114
           C84 114, 95 104, 95 88
           C95 65, 75 52, 70 35 Z"
        fill="url(#innerFlameGrad)"
        opacity={0.9}
      />

      {/* Inner Core */}
      <Path
        d="M70 60
           C67 70, 56 80, 56 95
           C56 104, 62 109, 70 109
           C78 109, 84 104, 84 95
           C84 80, 73 70, 70 60 Z"
        fill="#FFFFEE"
        opacity={0.95}
      />

      {/* Embers */}
      <Circle cx={40} cy={45} r={3} fill="#FFAA00" opacity={0.8} />
      <Circle cx={100} cy={50} r={2.5} fill="#FF8500" opacity={0.8} />
      <Circle cx={55} cy={25} r={2} fill="#FFFFEE" opacity={0.9} />
      <Circle cx={85} cy={30} r={3} fill="#FFD000" opacity={0.8} />
    </Svg>
  );
}

function WaterArtwork({ isSelected }) {
  return (
    <Svg width={110} height={110} viewBox="0 0 140 140">
      <Defs>
        <RadialGradient id="waterAura" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#3B9EFF" stopOpacity={isSelected ? 0.45 : 0.2} />
          <Stop offset="100%" stopColor="#3B9EFF" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="dropletGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#E0F2FE" />
          <Stop offset="40%" stopColor="#3B82F6" />
          <Stop offset="100%" stopColor="#1D4ED8" />
        </LinearGradient>
        <LinearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.9" />
          <Stop offset="50%" stopColor="#3B82F6" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#60A5FA" stopOpacity="0.9" />
        </LinearGradient>
      </Defs>
      <Circle cx={70} cy={75} r={55} fill="url(#waterAura)" />

      {/* Ripple Rings */}
      <Circle cx={70} cy={85} r={40} fill="none" stroke="#60A5FA" strokeWidth={1} opacity={0.2} />
      <Circle cx={70} cy={85} r={28} fill="none" stroke="#60A5FA" strokeWidth={1} opacity={0.3} />

      {/* Central Droplet */}
      <Path
        d="M70 25
           C70 25, 46 65, 46 82
           C46 95, 57 106, 70 106
           C83 106, 94 95, 94 82
           C94 65, 70 25, 70 25 Z"
        fill="url(#dropletGrad)"
      />

      {/* Droplet Highlight */}
      <Path
        d="M62 70
           C58 75, 58 85, 62 90
           C60 88, 59 83, 60 76
           C60 73, 61 71, 62 70 Z"
        fill="#FFFFFF"
        opacity={0.65}
      />

      {/* Wave details at bottom */}
      <Path
        d="M30 92 
           C45 82, 55 102, 70 92 
           C85 82, 95 102, 110 92
           L110 115
           L30 115 Z"
        fill="url(#waveGrad)"
      />

      {/* Bubbles */}
      <Circle cx={42} cy={40} r={4} fill="none" stroke="#93C5FD" strokeWidth={1.5} opacity={0.7} />
      <Circle cx={44} cy={42} r={1} fill="#FFFFFF" opacity={0.6} />

      <Circle cx={98} cy={48} r={3} fill="none" stroke="#93C5FD" strokeWidth={1} opacity={0.6} />
      <Circle cx={99} cy={49} r={0.8} fill="#FFFFFF" opacity={0.5} />

      <Circle cx={82} cy={30} r={5} fill="none" stroke="#93C5FD" strokeWidth={1.2} opacity={0.5} />
      <Circle cx={84} cy={32} r={1.2} fill="#FFFFFF" opacity={0.5} />
    </Svg>
  );
}

function EarthArtwork({ isSelected }) {
  return (
    <Svg width={110} height={110} viewBox="0 0 140 140">
      <Defs>
        <RadialGradient id="earthAura" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#B45309" stopOpacity={isSelected ? 0.45 : 0.2} />
          <Stop offset="100%" stopColor="#B45309" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="rockGrad1" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#78350F" />
          <Stop offset="100%" stopColor="#451A03" />
        </LinearGradient>
        <LinearGradient id="rockGrad2" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#D97706" />
          <Stop offset="100%" stopColor="#78350F" />
        </LinearGradient>
        <LinearGradient id="crystalGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#F59E0B" />
          <Stop offset="50%" stopColor="#10B981" />
          <Stop offset="100%" stopColor="#047857" />
        </LinearGradient>
      </Defs>
      <Circle cx={70} cy={75} r={55} fill="url(#earthAura)" />

      {/* Base platform */}
      <Polygon
        points="30,110 110,110 100,120 40,120"
        fill="#451A03"
        stroke="#D97706"
        strokeWidth={1}
      />
      <Path d="M50 110 L55 115 L62 115" stroke="#F59E0B" strokeWidth={1} opacity={0.6} />
      <Path d="M85 110 L80 116" stroke="#F59E0B" strokeWidth={1} opacity={0.6} />

      {/* Back Mountain Peaks */}
      <Polygon points="30,110 55,60 80,110" fill="url(#rockGrad1)" opacity={0.8} />
      <Polygon points="60,110 85,55 110,110" fill="url(#rockGrad1)" opacity={0.85} />

      {/* Front Mountain Peak */}
      <Polygon points="40,110 70,45 100,110" fill="url(#rockGrad2)" />
      <Polygon points="70,45 70,110 100,110" fill="#000000" opacity={0.2} />

      {/* Floating Earth Crystal Gem */}
      <Polygon
        points="70,20 80,32 70,44 60,32"
        fill="url(#crystalGrad)"
        stroke="#F59E0B"
        strokeWidth={1}
      />
      <Polygon points="70,20 70,44 80,32" fill="#FFFFFF" opacity={0.25} />

      {/* Floating dust particles */}
      <Rect x={45} y={55} width={3} height={3} rx={1} fill="#D97706" transform="rotate(45,45,55)" opacity={0.7} />
      <Rect x={92} y={65} width={4} height={4} rx={1} fill="#10B981" transform="rotate(15,92,65)" opacity={0.7} />
      <Rect x={76} y={15} width={2.5} height={2.5} rx={0.5} fill="#F59E0B" opacity={0.6} />
    </Svg>
  );
}

function WindArtwork({ isSelected }) {
  return (
    <Svg width={110} height={110} viewBox="0 0 140 140">
      <Defs>
        <RadialGradient id="windAura" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#5CC4B8" stopOpacity={isSelected ? 0.45 : 0.2} />
          <Stop offset="100%" stopColor="#5CC4B8" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#A7F3D0" />
          <Stop offset="100%" stopColor="#047857" />
        </LinearGradient>
      </Defs>
      <Circle cx={70} cy={75} r={55} fill="url(#windAura)" />

      {/* Vortex Currents */}
      <Path
        d="M25 75
           C35 45, 65 35, 85 45
           C105 55, 115 80, 95 95
           C80 105, 60 95, 60 75
           C60 60, 75 55, 85 65"
        fill="none"
        stroke="#A7F3D0"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.8}
      />
      <Path
        d="M35 105
           C55 115, 85 115, 105 100
           C115 92, 120 80, 118 72"
        fill="none"
        stroke="#5CC4B8"
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.6}
      />
      <Path
        d="M50 25
           C65 20, 85 22, 95 32"
        fill="none"
        stroke="#E2E8F0"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.5}
      />

      {/* Floating leaves */}
      <Path
        d="M42 45 
           C32 45, 30 55, 30 55
           C30 55, 40 55, 45 50
           C48 47, 45 45, 42 45 Z"
        fill="url(#leafGrad)"
        transform="rotate(-25, 42, 45)"
      />
      <Path
        d="M102 70
           C96 66, 92 72, 92 72
           C92 72, 98 76, 102 74
           C105 72.5, 104 69.5, 102 70 Z"
        fill="url(#leafGrad)"
        transform="rotate(35, 102, 70)"
      />
      <Path
        d="M75 100
           C71 96, 66 100, 66 100
           C66 100, 70 105, 75 103
           C78 101.5, 77 98.5, 75 100 Z"
        fill="url(#leafGrad)"
        transform="rotate(80, 75, 100)"
      />
    </Svg>
  );
}

// ─── Element definitions ─────────────────────────────────────────────────────

const ELEMENTS = [
  {
    id: 'fire',
    name: 'Fire',
    icon: '🔥',
    tagline: 'Burn everything. Patient pressure, relentless ticking damage.',
    color: '#FF6B35',
    glowColor: 'rgba(255, 107, 53, 0.25)',
    borderColor: 'rgba(255, 107, 53, 0.6)',
    gradientStart: 'rgba(255, 107, 53, 0.15)',
    stancePreview: 'Stance: +1% ATK per level · Burn ticks scale with level',
    artwork: FireArtwork,
  },
  {
    id: 'water',
    name: 'Water',
    icon: '💧',
    tagline: 'Sustain and endure. Wear enemies down while staying alive.',
    color: '#3B9EFF',
    glowColor: 'rgba(59, 158, 255, 0.25)',
    borderColor: 'rgba(59, 158, 255, 0.6)',
    gradientStart: 'rgba(59, 158, 255, 0.15)',
    stancePreview: 'Stance: +1% max HP per level · Tidal Resilience',
    artwork: WaterArtwork,
  },
  {
    id: 'earth',
    name: 'Earth',
    icon: '⛰️',
    tagline: 'Immovable. Absorb punishment, resist everything.',
    color: '#D4A754',
    glowColor: 'rgba(212, 167, 84, 0.25)',
    borderColor: 'rgba(212, 167, 84, 0.6)',
    gradientStart: 'rgba(212, 167, 84, 0.15)',
    stancePreview: 'Stance: Coming soon',
    artwork: EarthArtwork,
  },
  {
    id: 'wind',
    name: 'Wind',
    icon: '🌪️',
    tagline: 'Fast and precise. Evade attacks, strike with deadly accuracy.',
    color: '#5CC4B8',
    glowColor: 'rgba(92, 196, 184, 0.25)',
    borderColor: 'rgba(92, 196, 184, 0.6)',
    gradientStart: 'rgba(92, 196, 184, 0.15)',
    stancePreview: 'Stance: Coming soon',
    artwork: WindArtwork,
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function ElementSelectionScreen() {
  const { dispatch } = useGame();

  const [heroName, setHeroName] = useState('Mochi');
  const [selectedElement, setSelectedElement] = useState('fire'); // defaults to fire
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const elementDef = ELEMENTS.find(e => e.id === selectedElement);

  const handleScroll = (event) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / SNAP_INTERVAL);
    if (index >= 0 && index < ELEMENTS.length) {
      setSelectedElement(ELEMENTS[index].id);
    }
  };

  const scrollToElement = (index) => {
    scrollViewRef.current?.scrollTo({
      x: index * SNAP_INTERVAL,
      animated: true,
    });
    setSelectedElement(ELEMENTS[index].id);
  };

  const handleConfirm = () => {
    if (!selectedElement) return;
    setConfirmModalVisible(true);
  };

  const handleFinalConfirm = () => {
    if (!selectedElement) return;
    dispatch({
      type: 'SELECT_ELEMENT',
      payload: {
        element: selectedElement,
        name: heroName.trim() || 'Mochi',
      },
    });
    setConfirmModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Background */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="bgGlow" cx="50%" cy="30%" rx="60%" ry="45%">
            <Stop offset="0%" stopColor={elementDef?.color || '#D4A754'} stopOpacity="0.09" />
            <Stop offset="100%" stopColor="#07070A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="#07070A" />
        <Rect width="100%" height="100%" fill="url(#bgGlow)" />
      </Svg>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Lore Banner Header */}
          <View style={styles.loreCard}>
            <MeowOrderCrest />
            <Text style={styles.loreTitle}>WELCOME TO THE MEOW DEPTHS</Text>
            <Text style={styles.loreText}>
              For generations, the Meow Order has protected the world against evil. You are a novice soldier that just joined the ranks following your family traditions. Explore endless dungeons and grow stronger to cleanse the world of all evil.
            </Text>
          </View>

          {/* Name input */}
          <View style={styles.section}>
            <Text style={styles.nameQuestion}>What's your name, kitty?</Text>
            <View style={styles.nameInputWrapper}>
              <TextInput
                style={styles.nameInput}
                value={heroName}
                onChangeText={setHeroName}
                placeholder="Mochi"
                placeholderTextColor="rgba(255,255,255,0.25)"
                maxLength={16}
                selectTextOnFocus
              />
            </View>
          </View>

          {/* Element Selection Carousel */}
          <View style={styles.carouselSection}>
            <Text style={[styles.sectionLabel, { paddingHorizontal: 20 }]}>CHOOSE YOUR PATH</Text>
            <Text style={styles.carouselSubtitle}>
              New Paw Warriors must choose an elemental skill path to follow. Choose your path and start your journey.
            </Text>
            
            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              style={styles.carouselScrollView}
              contentContainerStyle={styles.carouselContainer}
              decelerationRate="fast"
              snapToInterval={SNAP_INTERVAL}
              snapToAlignment="start"
              keyboardShouldPersistTaps="handled"
            >
              {ELEMENTS.map((el) => {
                const isSelected = selectedElement === el.id;
                const Artwork = el.artwork;
                return (
                  <View key={el.id} style={styles.carouselSlide}>
                    <TouchableOpacity
                      style={[
                        styles.elementCard,
                        { backgroundColor: isSelected ? `${el.color}12` : '#0F0F14' },
                        isSelected
                          ? {
                              borderColor: el.color,
                              borderWidth: 1.5,
                              shadowColor: el.color,
                              shadowOpacity: 0.35,
                              shadowRadius: 12,
                              shadowOffset: { width: 0, height: 0 },
                              elevation: 6,
                            }
                          : { borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1 },
                      ]}
                      onPress={() => setSelectedElement(el.id)}
                      activeOpacity={0.9}
                    >
                      {/* Central Thematic SVG */}
                      <View style={styles.artWrapper}>
                        <Artwork isSelected={isSelected} />
                      </View>

                      {/* Element Name */}
                      <Text style={[styles.elementName, { color: isSelected ? el.color : '#F8FAFC' }]}>
                        {el.name}
                      </Text>
                      
                      {/* Description / Tagline */}
                      <Text style={styles.elementTagline}>{el.tagline}</Text>

                      {/* Stance details preview */}
                      <View style={[
                        styles.stancePreviewBox,
                        { borderColor: isSelected ? `${el.color}30` : 'rgba(255,255,255,0.05)' },
                      ]}>
                        <Text style={[
                          styles.stancePreviewText,
                          { color: isSelected ? el.color : 'rgba(255,255,255,0.35)' },
                        ]}>
                          {el.stancePreview}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            {/* Dot page indicators */}
            <View style={styles.dotsRow}>
              {ELEMENTS.map((el, index) => {
                const isSelected = selectedElement === el.id;
                return (
                  <TouchableOpacity
                    key={el.id}
                    style={[
                      styles.dot,
                      isSelected
                        ? { backgroundColor: el.color, width: 22 }
                        : { backgroundColor: 'rgba(255,255,255,0.12)' },
                    ]}
                    onPress={() => scrollToElement(index)}
                    activeOpacity={0.7}
                  />
                );
              })}
            </View>
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Pinned Bottom Container for Start Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.startBtn,
              !selectedElement && styles.startBtnDisabled,
              selectedElement && { shadowColor: elementDef?.color },
            ]}
            onPress={handleConfirm}
            disabled={!selectedElement}
            activeOpacity={0.8}
          >
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <LinearGradient id="startGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor={selectedElement ? elementDef.color : '#333'} />
                  <Stop offset="100%" stopColor={selectedElement ? elementDef.borderColor : '#222'} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#startGrad)" rx={14} />
            </Svg>
            <Text style={[styles.startBtnText, !selectedElement && { color: '#555' }]}>
              {selectedElement
                ? 'Start Playing →'
                : 'Choose an Element to Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Confirm Modal */}
      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setConfirmModalVisible(false)}>
          <Pressable style={styles.modalCard}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id="modalGlow" cx="50%" cy="0%" rx="80%" ry="50%">
                  <Stop offset="0%" stopColor={elementDef?.color || '#D4A754'} stopOpacity="0.1" />
                  <Stop offset="100%" stopColor="#14161C" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="#14161C" rx={20} />
              <Rect width="100%" height="100%" fill="url(#modalGlow)" rx={20} />
              <Rect x="1" y="1" width="98%" height="98%" rx={19} fill="none"
                stroke={elementDef ? elementDef.borderColor : 'rgba(212,167,84,0.2)'}
                strokeWidth={1}
              />
            </Svg>

            <View style={styles.modalInner}>
              <Text style={styles.modalIcon}>{elementDef?.icon}</Text>
              <Text style={[styles.modalTitle, { color: elementDef?.color || '#D4A754' }]}>
                Choose {elementDef?.name}?
              </Text>
              <Text style={styles.modalBody}>
                "{heroName.trim() || 'Mochi'}" will embody the{' '}
                <Text style={{ color: elementDef?.color, fontWeight: 'bold' }}>
                  {elementDef?.name} element
                </Text>{' '}
                for this adventure. This defines your playstyle.
              </Text>
              <Text style={styles.modalWarning}>
                This choice is permanent until you start a new game.
              </Text>

              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setConfirmModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Go Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmBtn, { shadowColor: elementDef?.color }]}
                  onPress={handleFinalConfirm}
                  activeOpacity={0.85}
                >
                  <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                    <Defs>
                      <LinearGradient id="confirmGrad" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0%" stopColor={elementDef?.color || '#D4A754'} />
                        <Stop offset="100%" stopColor={elementDef?.borderColor || '#B5701A'} />
                      </LinearGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#confirmGrad)" rx={10} />
                  </Svg>
                  <Text style={styles.modalConfirmText}>Confirm {elementDef?.name}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07070A',
  },
  content: {
    flex: 1,
  },
  scroll: {
    paddingTop: 20,
  },

  /* Lore Card Banner */
  loreCard: {
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 167, 84, 0.12)',
    backgroundColor: 'rgba(212, 167, 84, 0.02)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#D4A754',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  loreTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#D4A754',
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  loreText: {
    fontSize: 12,
    color: 'rgba(248, 250, 252, 0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Sections */
  section: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  nameQuestion: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 2,
    marginBottom: 6,
  },
  carouselSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    paddingHorizontal: 20,
    lineHeight: 18,
    marginBottom: 12,
  },

  /* Name input */
  nameInputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    overflow: 'hidden',
  },
  nameInput: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },

  /* Carousel Section */
  carouselSection: {
    marginBottom: 10,
  },
  carouselScrollView: {
    flexGrow: 0,
  },
  carouselContainer: {
    paddingLeft: SIDE_INSET,
    paddingRight: SIDE_INSET - CARD_GAP,
    paddingVertical: 4,
  },
  carouselSlide: {
    width: CARD_WIDTH,
    marginRight: CARD_GAP,
  },
  elementCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artWrapper: {
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  elementName: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  elementTagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 10,
    height: 32,
  },
  stancePreviewBox: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  stancePreviewText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* Carousel indicators */
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  dot: {
    height: 7,
    borderRadius: 4,
    width: 7,
  },

  /* Bottom Pinned Button container */
  bottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    backgroundColor: '#07070A',
  },

  /* Start button */
  startBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  startBtnDisabled: {
    opacity: 0.45,
  },
  startBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
    zIndex: 2,
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalInner: {
    padding: 24,
    alignItems: 'center',
  },
  modalIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  modalBody: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 10,
  },
  modalWarning: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.5)',
  },
  modalConfirmBtn: {
    flex: 2,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
    zIndex: 2,
    letterSpacing: 0.3,
  },
});
