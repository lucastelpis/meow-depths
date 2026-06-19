/**
 * usePreloadAssets.js
 *
 * Forces React Native to decode a list of image sources into memory before
 * they are first rendered on screen. This eliminates the micro-delay that
 * occurs when an image is used for the first time (e.g. a skill spritesheet
 * that mounts on demand).
 *
 * It uses hidden native <Image> components to force the native OS thread to
 * load and decode the images from disk.
 *
 * @param {Array} sources – array of require() results.
 * @returns {[boolean, ReactNode]} [ready, preloadElements] – ready is true
 *   once all assets have been decoded (or if safety timeout triggers).
 *   preloadElements should be rendered in the host component's tree.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

export default function usePreloadAssets(sources = []) {
  const [ready, setReady] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  const valid = useMemo(() => sources.filter(Boolean), [sources]);
  const serialized = useMemo(() => {
    return valid.map(s => (typeof s === 'number' ? s : s.uri || String(s))).join(',');
  }, [valid]);

  useEffect(() => {
    if (valid.length === 0) {
      setReady(true);
      return;
    }

    setReady(false);
    setLoadedCount(0);

    // Safety timeout: fail-open after 2.5 seconds so the screen never hangs
    const timer = setTimeout(() => {
      setReady(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, [serialized]);

  useEffect(() => {
    if (valid.length > 0 && loadedCount >= valid.length) {
      setReady(true);
    }
  }, [loadedCount, valid.length]);

  const preloadElements = (
    <View style={{ position: 'absolute', left: -1000, top: -1000, width: 10, height: 10, overflow: 'hidden' }} pointerEvents="none">
      {valid.map((src, index) => (
        <ExpoImage
          key={`preload_${index}`}
          source={src}
          style={{ width: 10, height: 10 }}
          onLoad={() => setLoadedCount(c => c + 1)}
          onError={() => setLoadedCount(c => c + 1)}
        />
      ))}
    </View>
  );

  return [ready, preloadElements];
}
