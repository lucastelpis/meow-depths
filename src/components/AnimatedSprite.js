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
import { View, Animated } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

const AnimatedExpoImage = Animated.createAnimatedComponent(ExpoImage);

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
  pointerEvents,
  style,
  tintColor,
  tintOpacity = 0,
  startFrame  = 0,
  endFrame,
  rowIndex    = 0,
  totalRows   = 1,
}) {
  const finalTotalFrames = totalFrames || frames || 1;
  const actualEndFrame = endFrame !== undefined ? endFrame : finalTotalFrames - 1;
  const animationFramesCount = Math.max(1, actualEndFrame - startFrame + 1);

  const [frame, setFrame]   = useState(0);
  const frameRef            = useRef(0);
  const intervalRef         = useRef(null);

  // Synchronously reset frame state to 0 if source, finalTotalFrames, startFrame, actualEndFrame, or active state changes to prevent flashes
  const [prevSource, setPrevSource] = useState(source);
  const [prevTotalFrames, setPrevTotalFrames] = useState(finalTotalFrames);
  const [prevStartFrame, setPrevStartFrame] = useState(startFrame);
  const [prevEndFrame, setPrevEndFrame] = useState(actualEndFrame);
  const [prevRowIndex, setPrevRowIndex] = useState(rowIndex);
  const [prevActive, setPrevActive] = useState(active);

  if (
    source !== prevSource ||
    finalTotalFrames !== prevTotalFrames ||
    startFrame !== prevStartFrame ||
    actualEndFrame !== prevEndFrame ||
    rowIndex !== prevRowIndex ||
    (active && !prevActive) // Only reset to frame 0 when transitioning from inactive to active
  ) {
    setPrevSource(source);
    setPrevTotalFrames(finalTotalFrames);
    setPrevStartFrame(startFrame);
    setPrevEndFrame(actualEndFrame);
    setPrevRowIndex(rowIndex);
    setPrevActive(active);
    setFrame(0);
    frameRef.current = 0;
  }

  if (active !== prevActive) {
    setPrevActive(active);
  }

  // Keep onComplete ref current so effect doesn't need it as a dependency
  const onCompleteRef       = useRef(onComplete);
  onCompleteRef.current     = onComplete;

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Static sprite or inactive — nothing to animate
    if (animationFramesCount <= 1 || !active) return;

    const ms = Math.round(1000 / fps);

    intervalRef.current = setInterval(() => {
      const next = frameRef.current + 1;

      if (next >= animationFramesCount) {
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
  }, [source, frameSize, finalTotalFrames, startFrame, actualEndFrame, rowIndex, animationFramesCount, fps, loop, active]);

  const scale = displaySize / frameSize;
  // Use frameRef.current (synchronously updated) instead of frame state
  // (async setState) to avoid a one-frame flash of a stale frame when
  // transitioning between active/inactive states.
  const currentFrameOffset = animationFramesCount > 0 ? Math.min(frameRef.current, animationFramesCount - 1) : 0;
  const currentFrame = startFrame + currentFrameOffset;

  return (
    <View
      pointerEvents={pointerEvents}
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
      <ExpoImage
        source={source}
        transition={0}
        style={{
          // Stretch the full sheet to scale, then shift left to expose current frame
          width:    frameSize * finalTotalFrames * scale,
          height:   frameSize * totalRows * scale,
          position: 'absolute',
          left:     -(currentFrame * displaySize),
          top:      -(rowIndex * displaySize),
        }}
        contentFit="fill"
      />
      {!!tintColor && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: tintOpacity,
          }}
          pointerEvents="none"
        >
          <ExpoImage
            source={source}
            transition={0}
            style={{
              width:    frameSize * finalTotalFrames * scale,
              height:   frameSize * totalRows * scale,
              position: 'absolute',
              left:     -(currentFrame * displaySize),
              top:      -(rowIndex * displaySize),
              tintColor: tintColor,
            }}
            contentFit="fill"
          />
        </Animated.View>
      )}
    </View>
  );
}
