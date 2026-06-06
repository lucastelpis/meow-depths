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

export default function usePreloadAssets(sources = []) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Filter out any falsy values (undefined skills, etc.)
    const valid = sources.filter(Boolean);

    if (!valid.length) {
      setReady(true);
      return;
    }

    let cancelled = false;

    const prefetchAll = async () => {
      try {
        await Promise.all(
          valid.map((src) => {
            // Local require() assets → resolve to a file:// URI first
            const resolved = Image.resolveAssetSource(src);
            if (resolved?.uri) {
              return Image.prefetch(resolved.uri);
            }
            return Promise.resolve();
          }),
        );
      } catch {
        // Fail-open: if any asset can't be prefetched, unblock anyway
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
