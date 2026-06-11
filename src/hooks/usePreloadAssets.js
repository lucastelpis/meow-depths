/**
 * usePreloadAssets.js
 *
 * Forces React Native to decode a list of image sources into memory before
 * they are first rendered on screen. This eliminates the micro-delay that
 * occurs when an image is used for the first time (e.g. a skill spritesheet
 * that mounts on demand).
 *
 * Usage:
 *   const ready = usePreloadAssets([
 *     require('../assets/foo.png'),
 *     require('../assets/bar.png'),
 *   ]);
 *
 * @param {Array} sources – array of require() results (numeric asset IDs or
 *                          objects with a `uri` field). Falsy values are
 *                          filtered out so you can safely spread arrays that
 *                          may contain undefined entries.
 * @returns {boolean} ready – true once all assets have been decoded (or if
 *                            an error occurs — fail-open so the game never hangs).
 */

import { useState, useEffect } from 'react';
import { Image } from 'react-native';
import * as Font from 'expo-font';

export default function usePreloadAssets(sources = []) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Filter out any falsy values (undefined skills, etc.)
    const valid = sources.filter(Boolean);

    let cancelled = false;

    const prefetchAll = async () => {
      try {
        await Promise.all([
          // Load retro pixel fonts
          Font.loadAsync({
            'PressStart2P-Regular': require('../../assets/fonts/PressStart2P-Regular.ttf'),
            'PixelifySans-Regular': require('../../assets/fonts/PixelifySans-Regular.ttf'),
            'PixelifySans-Medium': require('../../assets/fonts/PixelifySans-Medium.ttf'),
            'Silkscreen-Regular': require('../../assets/fonts/Silkscreen-Regular.ttf'),
          }),
          // Prefetch sprite/image assets
          ...valid.map((src) => {
            const resolved = Image.resolveAssetSource(src);
            if (resolved?.uri) {
              return Image.prefetch(resolved.uri);
            }
            return Promise.resolve();
          }),
        ]);
      } catch (err) {
        // Fail-open: if any asset can't be prefetched, unblock anyway
        console.warn('Failed to preload fonts or images:', err);
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    prefetchAll();

    return () => {
      cancelled = true;
    };
    // Only run once on mount — sources list is built at render time from
    // static require() calls so it never actually changes between renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ready;
}
