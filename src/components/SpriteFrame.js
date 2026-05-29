/**
 * SpriteFrame.js
 *
 * Shows a single frame from a horizontal sprite sheet by clipping.
 *
 * All Tiny Swords sprites are 192 × 192 px per frame.
 * We wrap the full-width image in an overflow:hidden View sized to one frame,
 * then shift the image left so the desired frame is visible.
 *
 * Usage:
 *   <SpriteFrame
 *     source={SPRITES.HERO.source}
 *     frameSize={192}
 *     totalFrames={8}
 *     frameIndex={0}
 *     displaySize={80}
 *   />
 */

import React from 'react';
import { View, Image } from 'react-native';

/**
 * @param {object} source       – require() result for the sprite sheet PNG
 * @param {number} frameSize    – Width (= height) of one frame in the source file (pixels)
 * @param {number} totalFrames  – Total number of frames in the sheet
 * @param {number} frameIndex   – 0-based index of the frame to display (default 0)
 * @param {number} displaySize  – Rendered size in dp on screen (default 80)
 * @param {object} [style]      – Extra styles applied to the outer container View
 */
export default function SpriteFrame({
  source,
  frameSize,
  totalFrames,
  frameIndex = 0,
  displaySize = 80,
  style,
}) {
  // Scale factor so the frame occupies exactly displaySize × displaySize dp
  const scale = displaySize / frameSize;

  return (
    <View
      style={[
        {
          width: displaySize,
          height: displaySize,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Image
        source={source}
        style={{
          // Stretch the full sheet to the scaled dimensions
          width: frameSize * totalFrames * scale,
          height: displaySize,
          // Shift left so the chosen frame aligns with the left edge of the clip window
          position: 'absolute',
          left: -(frameIndex * displaySize),
          top: 0,
        }}
        resizeMode="stretch"
      />
    </View>
  );
}
