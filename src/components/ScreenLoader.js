/**
 * ScreenLoader.js
 *
 * A wrapper that preloads a list of image assets and shows a themed loading
 * overlay until they are all decoded into memory. Once ready it fades out
 * smoothly and reveals the screen content underneath.
 *
 * Usage:
 *   <ScreenLoader assets={[require('./foo.png'), require('./bar.png')]}>
 *     <MyScreen />
 *   </ScreenLoader>
 *
 * Props:
 *   assets   {Array}     – array of require() results to preload
 *   children {ReactNode} – the screen content to reveal once ready
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import usePreloadAssets from '../hooks/usePreloadAssets';

export default function ScreenLoader({ assets = [], children }) {
  const ready = usePreloadAssets(assets);
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const overlayVisible = useRef(true);

  // Pulse animation for the loading indicator
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Start pulsing loop immediately
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    if (ready && overlayVisible.current) {
      overlayVisible.current = false;
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [ready]);

  return (
    <View style={styles.root}>
      {/* Screen content — rendered in background immediately so layout is ready */}
      {children}

      {/* Loading overlay — fades out once assets are decoded */}
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity }]}
        pointerEvents={ready ? 'none' : 'auto'}
      >
        {/* Subtle vignette radial feel */}
        <View style={styles.overlayInner}>
          <Animated.Text style={[styles.logo, { opacity: pulseAnim }]}>
            ⚔ Meow Depths
          </Animated.Text>
          <Animated.View style={[styles.dotRow, { opacity: pulseAnim }]}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotMid]} />
            <View style={styles.dot} />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  overlayInner: {
    alignItems: 'center',
    gap: 20,
  },
  logo: {
    fontFamily: 'System',
    fontSize: 26,
    fontWeight: '700',
    color: '#E8C97A',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8C97A',
    opacity: 0.6,
  },
  dotMid: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 1,
  },
});
