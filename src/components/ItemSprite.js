import React from 'react';
import { View, Image } from 'react-native';
import { ITEM_SPRITESHEETS } from '../constants/sprites';

/**
 * ItemSprite — Renders a single static frame from a horizontal spritesheet.
 * 
 * @param {string} spritesheet — 'equipment-leather' or 'weapons-1'
 * @param {number} frameIndex — 0-based frame index
 * @param {number} displaySize — width/height to display
 * @param {number} opacity — component opacity
 */
export default function ItemSprite({ spritesheet, frameIndex, displaySize = 36, opacity = 1 }) {
  const source = ITEM_SPRITESHEETS[spritesheet];
  if (!source) return null;

  // Map spritesheets to their actual total frame counts
  const FRAMES_MAP = {
    'equipment-leather': 14,
    'weapons-1': 10,
    'storages-1': 4,
    'icons-1': 37,
    'crystals-1': 12,
  };
  const totalFrames = FRAMES_MAP[spritesheet] || 1;
  const frameSize = 32;
  const scale = displaySize / frameSize;

  return (
    <View style={{ width: displaySize, height: displaySize, overflow: 'hidden', opacity }}>
      <Image
        source={source}
        style={{
          width: frameSize * totalFrames * scale,
          height: displaySize,
          position: 'absolute',
          left: -(frameIndex * displaySize),
          top: 0,
        }}
        resizeMode="stretch"
      />
    </View>
  );
}
