/**
 * TutorialSequence — steps the player through one or more tutorial cards.
 *
 * Reused for BOTH the multi-step first-time welcome sequence AND the one-time
 * contextual tips (a tip is just a single-element `steps` array). Built on the
 * shared ParchmentModal shell, forced-open (no ✕, no backdrop dismiss) so the
 * player must use the footer buttons.
 *
 *   <TutorialSequence
 *     visible={open}
 *     steps={WELCOME_STEPS}   // [{ title, body, icon? }, ...]
 *     showSkip                 // optional — adds a "Skip" button
 *     onFinish={() => ...}     // called on finish OR skip
 *   />
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import ParchmentModal from '../ui/ParchmentModal';
import ItemSprite from '../ItemSprite';
import theme from '../../constants/theme';

const { COLORS, FONTS, SPACING, BORDER_RADIUS } = theme;

/** Renders a step's decorative icon — either a static image or a spritesheet frame. */
function StepIcon({ icon }) {
  if (!icon) return null;
  return (
    <View style={styles.iconFrame}>
      {icon.image ? (
        <ExpoImage source={icon.image} style={styles.iconImage} contentFit="contain" />
      ) : (
        <ItemSprite spritesheet={icon.sheet} frameIndex={icon.frame} displaySize={44} />
      )}
    </View>
  );
}

export default function TutorialSequence({ visible, steps = [], onFinish, showSkip = false }) {
  const [current, setCurrent] = React.useState(0);

  // Restart from the first card each time the sequence is (re)opened.
  React.useEffect(() => {
    if (visible) setCurrent(0);
  }, [visible]);

  if (!steps.length) return null;

  const safeIndex = Math.min(current, steps.length - 1);
  const step = steps[safeIndex];
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onFinish && onFinish();
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const handleBack = () => setCurrent((c) => Math.max(0, c - 1));

  return (
    <ParchmentModal
      visible={visible}
      onClose={onFinish}
      title={step.title}
      showClose={false}
      dismissOnBackdrop={false}
    >
      <StepIcon icon={step.icon} />

      <Text style={styles.body}>{step.body}</Text>

      {steps.length > 1 && (
        <View style={styles.dotsRow}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === safeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {showSkip && !isLast && (
            <TouchableOpacity onPress={onFinish} activeOpacity={0.8} hitSlop={8}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footerRight}>
          {!isFirst && (
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={handleBack}
              activeOpacity={0.85}
            >
              <Text style={styles.btnSecondaryText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>{isLast ? 'Got it!' : 'Next'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ParchmentModal>
  );
}

const styles = StyleSheet.create({
  iconFrame: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#C9A86A',
    backgroundColor: '#E3CF9C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  iconImage: {
    width: 44,
    height: 44,
  },
  body: {
    ...FONTS.body,
    fontSize: 17,
    color: '#4A3210',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginHorizontal: 3,
    backgroundColor: '#C9A86A',
  },
  dotActive: {
    backgroundColor: COLORS.emberBrown || '#3A2C14',
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: SPACING.xs,
  },
  footerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipText: {
    ...FONTS.label,
    fontSize: 12,
    color: '#8A6A38',
    textDecorationLine: 'underline',
  },
  btn: {
    borderRadius: BORDER_RADIUS.button || 12,
    paddingVertical: 9,
    paddingHorizontal: 16,
    marginLeft: SPACING.sm,
    borderWidth: 2,
  },
  btnPrimary: {
    backgroundColor: COLORS.torchOrange || '#B5701A',
    borderColor: '#7A4A12',
  },
  btnPrimaryText: {
    ...FONTS.label,
    fontSize: 12,
    color: '#FFF3DA',
  },
  btnSecondary: {
    backgroundColor: '#E3CF9C',
    borderColor: '#9A6B34',
  },
  btnSecondaryText: {
    ...FONTS.label,
    fontSize: 12,
    color: '#6E4524',
  },
});
