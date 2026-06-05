/**
 * AnimatedSprite.js
 *
 * Plays frame-by-frame sprite animations from a horizontal sprite sheet.
 *
 * HOW IT WORKS:
 *   A setInterval advances the visible frame index every (1000 / fps) ms.
 *   The whole effect re-runs whenever `source` or `totalFrames` changes —
 *   so switching from idle to attack just means passing new props; the
 *   component resets to frame 0 and starts playing the new sheet automatically.
 *
 * @param {object}   source       – require() result for the sprite sheet PNG
 * @param {number}   frameSize    – pixel width (= height) of one frame in the sheet
 * @param {number}   totalFrames  – total number of frames in the sheet
 * @param {number}   frames       – fallback for totalFrames (commonly used in sprite constants)
 * @param {number}   [fps=8]      – playback speed in frames per second
 * @param {boolean}  [loop=true]  – true = loop forever; false = play once then hold last frame
 * @param {function} [onComplete] – called once when a non-looping animation finishes
 * @param {number}   [displaySize=80] – rendered size in dp (always square)
 * @param {boolean}  [flipX=false]   – mirror horizontally (face left)
 * @param {object}   [style]         – extra styles on the container View
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Image } from 'react-native';

export default function AnimatedSprite({
  source,
  frameSize,
  totalFrames,
  frames,
  fps         = 8,
  loop        = true,
  onComplete,
  displaySize = 80,
  flipX       = false,
  active      = true,
  style,
}) {
  const finalTotalFrames = totalFrames || frames || 1;

  const [frame, setFrame]   = useState(0);
  const frameRef            = useRef(0);
  const intervalRef         = useRef(null);

  // Synchronously reset frame state to 0 if source or finalTotalFrames changes to prevent out-of-bounds flashes
  const [prevSource, setPrevSource] = useState(source);
  const [prevTotalFrames, setPrevTotalFrames] = useState(finalTotalFrames);

  if (source !== prevSource || finalTotalFrames !== prevTotalFrames) {
    setPrevSource(source);
    setPrevTotalFrames(finalTotalFrames);
    setFrame(0);
    frameRef.current = 0;
  }

  // Keep onComplete ref current so effect doesn't need it as a dependency
  const onCompleteRef       = useRef(onComplete);
  onCompleteRef.current     = onComplete;

  useEffect(() => {
    // Reset to frame 0 whenever the animation sheet changes or becomes active
    frameRef.current = 0;
    setFrame(0);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Static sprite or inactive — nothing to animate
    if (finalTotalFrames <= 1 || !active) return;

    const ms = Math.round(1000 / fps);

    intervalRef.current = setInterval(() => {
      const next = frameRef.current + 1;

      if (next >= finalTotalFrames) {
        if (loop) {
          // Loop back to the beginning
          frameRef.current = 0;
          setFrame(0);
        } else {
          // Hold on last frame and notify caller
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          onCompleteRef.current?.();
        }
      } else {
        frameRef.current = next;
        setFrame(next);
      }
    }, ms);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [source, frameSize, finalTotalFrames, fps, loop, active]);

  const scale = displaySize / frameSize;
  const isSourceChanged = source !== prevSource || finalTotalFrames !== prevTotalFrames;
  const currentFrame = isSourceChanged ? 0 : (finalTotalFrames > 0 ? Math.min(frame, finalTotalFrames - 1) : 0);

  return (
    <View
      style={[
        {
          width:    displaySize,
          height:   displaySize,
          overflow: 'hidden',
          flexShrink: 0,
        },
        // Mirror the sprite so it faces left (used for enemies facing the player)
        flipX && { transform: [{ scaleX: -1 }] },
        style,
      ]}
    >
      <Image
        source={source}
        fadeDuration={0}
        style={{
          // Stretch the full sheet to scale, then shift left to expose current frame
          width:    frameSize * finalTotalFrames * scale,
          height:   displaySize,
          position: 'absolute',
          left:     -(currentFrame * displaySize),
          top:      0,
        }}
        resizeMode="stretch"
      />
    </View>
  );
}
