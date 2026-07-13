/**
 * LoreIntroScreen.js
 *
 * Third and final onboarding step, shown after the player has chosen a name
 * (NameInput) and an element (ElementSelection). It drops the world lore before
 * the hero is committed: SELECT_ELEMENT is dispatched here, on "Begin", which
 * flips the navigator over to the Camp hub.
 *
 * Layout:
 *   • Full-screen background art, scaled to fit the screen width and anchored to
 *     the bottom (the top of the tall image is allowed to crop off-screen).
 *   • A black, rounded lore panel covering the top ~2/3 of the screen.
 *   • A pinned "Begin" button at the bottom.
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGame } from '../state/gameState';

const { width: W, height: H } = Dimensions.get('window');

// Background art is 1400×2782. Scale it to the screen width and let the tall
// top portion crop above the screen, keeping the bottom of the art on-screen.
const BG_SOURCE = require('../../assets/sprites/banners/3rd_onboarding_background.png');
const BG_ASPECT = 2782 / 1400;
const BG_HEIGHT = W * BG_ASPECT;
const PLAQUE_WIDTH = Math.min(W - 80, 320);

const LORE_PARAGRAPHS = [
  'A mysterious corruption has been twisting this world for centuries. As a new recruit of The Meow Order — a group created to study this threat — you must go on dangerous expeditions, grow stronger, and uncover lost history to reveal the truth behind this dark force.',
];

export default function LoreIntroScreen({ navigation, route }) {
  const { dispatch } = useGame();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // 1. Fade in screen content
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // 2. Loop soft pulsating button glow
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 950, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 950, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const glowShadowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.95] });
  const glowShadowRadius = pulse.interpolate({ inputRange: [0, 1], outputRange: [5, 16] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] });

  const handleContinue = () => {
    navigation.navigate('HeroDefinition');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Boxed Banner Image with Pretty Outline + Lore Content Overlay */}
          <View style={styles.boxedLoreContainer}>
            {/* Background Image */}
            <ExpoImage
              source={BG_SOURCE}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
            {/* Dark overlay tint for readability */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.58)' }]} />

            {/* Title plaque inside the image box */}
            <View style={[styles.titlePlaqueOuter, { marginTop: 8, marginBottom: 16 }]}>
              <View style={styles.titlePlaqueInner}>
                <Text style={styles.titlePlaqueText}>
                  WELCOME TO THE{"\n"}MEOW EXPEDITIONS
                </Text>
              </View>
              <View style={styles.topTagOverlay}>
                <View style={styles.topTag}>
                  <Text style={styles.topTagText}>★ A NEW ADVENTURE BEGINS ★</Text>
                </View>
              </View>
            </View>

            {/* Scrollable Lore Text */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.loreScrollContent}
            >
              {LORE_PARAGRAPHS.map((p, i) => (
                <View key={i} style={styles.loreRow}>
                  <Text style={styles.loreText}>{p}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Continue button outside the image box */}
          <Animated.View style={{ width: '100%' }}>
            <Animated.View
              style={[
                styles.btnWrapper,
                {
                  transform: [{ scale: glowScale }],
                },
              ]}
            >
              {/* 3D Under-Shadow */}
              <View style={styles.btnShadow} />

              {/* Outer Touchable Button */}
              <TouchableOpacity
                style={styles.btnOuter}
                onPress={handleContinue}
                activeOpacity={0.85}
              >
                {/* Inner Bevel */}
                <View style={styles.btnInner}>
                  <Text style={styles.btnLabel}>CONTINUE</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#133131',
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },

  /* Boxed container wrapping both banner background and lore text overlay */
  boxedLoreContainer: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#4A3917',
    overflow: 'hidden',
    position: 'relative',
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 16,
  },
  loreScrollContent: {
    paddingBottom: 0,
  },
  loreRow: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  loreText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 28,
    lineHeight: 30,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 3,
  },

  /* Top tag (overlaps the title plaque's top border) */
  topTagOverlay: {
    position: 'absolute',
    top: -16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  topTag: {
    backgroundColor: '#F3E2BD',
    borderColor: '#4A3917',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  topTagText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 12,
    letterSpacing: 0,
    color: '#2A1A0C',
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
    marginTop: 18,
    marginBottom: 16,
    position: 'relative',
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
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  titlePlaqueText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 15,
    lineHeight: 24,
    color: '#FFF3DA',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },

  btnWrapper: {
    width: '100%',
    height: 52,
    position: 'relative',
    marginTop: 8,
  },
  btnShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 4,
    height: 52,
    borderRadius: 10,
    zIndex: 1,
    backgroundColor: '#4F3C1E',
  },
  btnOuter: {
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
  btnInner: {
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
  btnLabel: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 28,
    color: '#2A1A0C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
