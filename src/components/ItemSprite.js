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
export default function ItemSprite({ spritesheet, frameIndex, displaySize = 36, opacity = 1, frameSize = 32 }) {
  const source = ITEM_SPRITESHEETS[spritesheet];
  if (!source) return null;

  // Map spritesheets to their actual total frame counts
  const FRAMES_MAP = {
    'equipment-leather': 14,
    'weapons-1': 10,
    'storages-1': 4,
    'icons-1': 37,
    'crystals-1': 12,
    'skill-icons-1': 16,
    'consumables-1': 12,
    'status-icons-1': 24,
    'reward-icons': 2,
    'icons-map': 137,
  };
  const totalFrames = FRAMES_MAP[spritesheet] || 1;
  const scale = displaySize / frameSize;

  const isMatrix = spritesheet === 'icons-map';
  const cols = 14;
  const totalRows = 10;

  let imageWidth = frameSize * totalFrames * scale;
  let imageHeight = displaySize;
  let left = -(frameIndex * displaySize);
  let top = 0;

  if (isMatrix) {
    const col = frameIndex % cols;
    const row = Math.floor(frameIndex / cols);
    imageWidth = frameSize * cols * scale;
    imageHeight = frameSize * totalRows * scale;
    left = -(col * displaySize);
    top = -(row * displaySize);
  }

  return (
    <View style={{ width: displaySize, height: displaySize, overflow: 'hidden', opacity }}>
      <Image
        source={source}
        style={{
          width: imageWidth,
          height: imageHeight,
          position: 'absolute',
          left: left,
          top: top,
        }}
        resizeMode="stretch"
      />
    </View>
  );
}
