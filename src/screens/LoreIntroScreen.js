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

const LORE_PARAGRAPHS = [
  'For centuries, corruption has plagued the world. It twists nature and drives creatures mad and aggressive. No one knows where it came from. No one knows how to deal with it.',
  'The Meow Order was founded to find out. Among their most vital recruits are those from families with a rare gift — a natural resistance to the corruption’s influence. Yours is one of them.',
  'Your mission: explore the echoes of the past, recover the fragments of a history that was never meant to be found, and piece together the truth behind the corruption. Go on expeditions. Grow stronger. Delve deeper. The answers are down there — buried, waiting.',
];

export default function LoreIntroScreen({ route }) {
  const { dispatch } = useGame();

  const heroName = route?.params?.heroName || 'Mochi';
  const element = route?.params?.element || 'fire';

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Typewriter reveal ────────────────────────────────────────────────────
  const TOTAL = useMemo(
    () => LORE_PARAGRAPHS.reduce((sum, p) => sum + p.length, 0),
    [],
  );
  const [revealed, setRevealed] = useState(0);
  const done = revealed >= TOTAL;
  const buttonFade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Advance the reveal a few characters at a time until the lore is complete.
  useEffect(() => {
    if (revealed >= TOTAL) return;
    const id = setTimeout(() => setRevealed((r) => Math.min(TOTAL, r + 1)), 28);
    return () => clearTimeout(id);
  }, [revealed, TOTAL]);

  // Fade the button in once the whole lore has appeared, then loop a soft
  // pulsating glow to draw the eye to it.
  useEffect(() => {
    if (!done) return;
    Animated.timing(buttonFade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 950, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 950, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [done, buttonFade, pulse]);

  const glowShadowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.95] });
  const glowShadowRadius = pulse.interpolate({ inputRange: [0, 1], outputRange: [5, 16] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] });

  // Tap anywhere on the lore to skip the typewriter and reveal everything.
  const skip = useCallback(() => setRevealed(TOTAL), [TOTAL]);

  const handleBegin = () => {
    dispatch({
      type: 'SELECT_ELEMENT',
      payload: {
        element,
        name: (heroName || '').trim() || 'Mochi',
      },
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Full-screen background art — width-fit, bottom-aligned */}
      <ExpoImage
        source={BG_SOURCE}
        style={styles.bgImage}
        contentFit="fill"
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Lore — each paragraph carries its own highlight that grows with the
              typewriter reveal. Tap to skip to the end. */}
          <Pressable style={styles.lorePanel} onPress={done ? undefined : skip}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.loreScrollContent}
            >
              {(() => {
                let budget = revealed;
                return LORE_PARAGRAPHS.map((p, i) => {
                  const show = Math.max(0, Math.min(p.length, budget));
                  budget -= p.length;
                  if (show <= 0) return null;
                  const isLast = i === LORE_PARAGRAPHS.length - 1;
                  return (
                    <View key={i} style={[styles.loreRow, isLast && { marginBottom: 0 }]}>
                      <Text style={styles.loreText}>{p.slice(0, show)}</Text>
                    </View>
                  );
                });
              })()}
            </ScrollView>
          </Pressable>

          {/* Begin button — appears under the text once the lore finishes */}
          {done && (
            <Animated.View style={{ width: '100%', opacity: buttonFade }}>
              <Animated.View
                style={[
                  styles.beginGlow,
                  {
                    shadowOpacity: glowShadowOpacity,
                    shadowRadius: glowShadowRadius,
                    transform: [{ scale: glowScale }],
                  },
                ]}
              >
                <TouchableOpacity style={styles.beginBtn} onPress={handleBegin} activeOpacity={0.85}>
                  <Text style={styles.beginLabel}>BEGIN YOUR JOURNEY</Text>
                  <Text style={styles.beginSub}>{heroName.trim() || 'Mochi'} of the Meow Order</Text>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0A0E',
  },
  bgImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: W,
    height: BG_HEIGHT,
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

  /* Lore panel — top ~2/3 */
  lorePanel: {
    maxHeight: H * 0.66,
    marginTop: 24,
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  loreScrollContent: {
    paddingBottom: 0,
  },
  loreRow: {
    // Rounded highlight that hugs the paragraph and grows with the reveal.
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
  },
  loreText: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 18,
    lineHeight: 26,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  /* Begin button */
  beginGlow: {
    width: '100%',
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#FFD37A',
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  beginBtn: {
    width: '100%',
    backgroundColor: '#F3E2BD',
    borderColor: '#4A3917',
    borderWidth: 2.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 4,
    elevation: 5,
  },
  beginLabel: {
    fontFamily: 'Jersey10-Regular',
    fontSize: 28,
    color: '#2A1A0C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  beginSub: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 9,
    letterSpacing: 0.5,
    color: '#5A431C',
    marginTop: 4,
  },
});
