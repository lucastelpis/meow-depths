/**
 * SpotlightTour — a guided "coach-mark" tour that highlights real on-screen UI.
 *
 * For each step it measures a target element (via its ref), dims the rest of the
 * screen, cuts a lit "hole" around the target, and shows a callout card with
 * Back / Next / Skip. Steps with no `ref` render as a centered card (intro/outro).
 *
 * The host screen owns the target refs and (optionally) its ScrollView, so the
 * tour can scroll a target into view before spotlighting it.
 *
 *   <SpotlightTour
 *     visible={open}
 *     steps={[{ ref: staminaRef, title, body }, { title, body }]}
 *     scrollRef={scrollRef}      // optional — ScrollView ref for scroll-into-view
 *     scrollYRef={scrollYRef}    // optional — ref holding the live scroll offset
 *     onFinish={() => ...}       // called on finish OR skip
 *   />
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import theme from '../../constants/theme';

const { COLORS, FONTS, SPACING, BORDER_RADIUS } = theme;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const OVERLAY_COLOR = 'rgba(10, 6, 2, 0.82)';
const HOLE_PAD = 6;
const CALLOUT_GAP = 14;
const CALLOUT_MARGIN = 20;

export default function SpotlightTour({
  visible,
  steps = [],
  onFinish,
  scrollRef,
  scrollYRef,
}) {
  // `pending` is the stop we're navigating to; `view` is what's actually shown.
  // We measure the pending target first and only then commit BOTH its text and
  // its position together — so the callout never updates its text before the
  // spotlight has moved.
  const [pending, setPending] = React.useState(0);
  const [view, setView] = React.useState({ index: 0, rect: null });

  // Restart from the first stop each time the tour is (re)opened.
  React.useEffect(() => {
    if (visible) setPending(0);
  }, [visible]);

  React.useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const i = Math.min(pending, Math.max(0, steps.length - 1));
    const step = steps[i];

    const commit = (rect) => {
      if (!cancelled) setView({ index: i, rect });
    };
    const toRect = (x, y, w, h) => (w && h ? { x, y, w, h } : null);

    const node = step?.ref?.current;
    if (!node || !node.measureInWindow) {
      commit(null); // centered card (intro/outro or unmeasurable target)
      return;
    }

    node.measureInWindow((x, y, w, h) => {
      if (cancelled) return;
      const TOP_SAFE = 110;
      const BOTTOM_SAFE = SCREEN_H - 300; // keep room for the callout
      const needsScroll = y < TOP_SAFE || y + h > BOTTOM_SAFE;

      if (needsScroll && scrollRef?.current?.scrollTo) {
        const targetY = SCREEN_H * 0.32; // where we want the target to land
        const delta = y - targetY;
        const newY = Math.max(0, (scrollYRef?.current || 0) + delta);
        // Instant scroll (nothing to wait on — the screen is dimmed anyway),
        // then measure the final position over the next couple of frames.
        scrollRef.current.scrollTo({ y: newY, animated: false });
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const n = step.ref?.current;
            if (n?.measureInWindow) n.measureInWindow((x2, y2, w2, h2) => commit(toRect(x2, y2, w2, h2)));
            else commit(null);
          })
        );
      } else {
        commit(toRect(x, y, w, h));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [visible, pending, steps, scrollRef, scrollYRef]);

  if (!visible || !steps.length) return null;

  const index = view.index;
  const rect = view.rect;
  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  const handleNext = () => (isLast ? onFinish?.() : setPending(index + 1));
  const handleBack = () => setPending(Math.max(0, index - 1));

  // ── Callout position ──────────────────────────────────────────────────────
  // Below the target when it sits in the top half, above it otherwise. Centered
  // when there is no target.
  let calloutStyle;
  if (rect) {
    const placeBelow = rect.y + rect.h / 2 < SCREEN_H / 2;
    calloutStyle = placeBelow
      ? { top: rect.y + rect.h + HOLE_PAD + CALLOUT_GAP }
      : { bottom: SCREEN_H - (rect.y - HOLE_PAD) + CALLOUT_GAP };
  }

  const renderCallout = () => (
    <View
      style={[
        styles.callout,
        rect ? [styles.calloutAnchored, calloutStyle] : styles.calloutCentered,
      ]}
    >
      <Text style={styles.title}>{step.title}</Text>
      <Text style={styles.body}>{step.body}</Text>

      {steps.length > 1 && (
        <View style={styles.dotsRow}>
          {steps.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {!isLast && (
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
    </View>
  );

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onFinish}>
      {/* Full-screen touch catcher so underlying UI can't be tapped mid-tour. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />

      {rect ? (
        <>
          {/* Four dark panels around the lit target hole. */}
          <View style={[styles.dim, { top: 0, left: 0, right: 0, height: rect.y - HOLE_PAD }]} />
          <View style={[styles.dim, { top: rect.y + rect.h + HOLE_PAD, left: 0, right: 0, bottom: 0 }]} />
          <View style={[styles.dim, { top: rect.y - HOLE_PAD, left: 0, width: rect.x - HOLE_PAD, height: rect.h + HOLE_PAD * 2 }]} />
          <View style={[styles.dim, { top: rect.y - HOLE_PAD, left: rect.x + rect.w + HOLE_PAD, right: 0, height: rect.h + HOLE_PAD * 2 }]} />
          {/* Highlight ring around the target. */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: rect.y - HOLE_PAD,
              left: rect.x - HOLE_PAD,
              width: rect.w + HOLE_PAD * 2,
              height: rect.h + HOLE_PAD * 2,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: COLORS.candleGold || '#E8A73A',
            }}
          />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: OVERLAY_COLOR }]} />
      )}

      {renderCallout()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: {
    position: 'absolute',
    backgroundColor: OVERLAY_COLOR,
  },
  callout: {
    position: 'absolute',
    left: CALLOUT_MARGIN,
    right: CALLOUT_MARGIN,
    backgroundColor: '#ECD8A6',
    borderRadius: BORDER_RADIUS.card || 14,
    borderWidth: 3,
    borderColor: '#6E4524',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    alignItems: 'center',
  },
  calloutAnchored: {},
  calloutCentered: {
    top: SCREEN_H / 2 - 110,
  },
  title: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 13,
    color: '#5A3A17',
    textAlign: 'center',
    marginBottom: SPACING.sm,
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
  footerLeft: { flex: 1, alignItems: 'flex-start' },
  footerRight: { flexDirection: 'row', alignItems: 'center' },
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
  btnPrimaryText: { ...FONTS.label, fontSize: 12, color: '#FFF3DA' },
  btnSecondary: {
    backgroundColor: '#E3CF9C',
    borderColor: '#9A6B34',
  },
  btnSecondaryText: { ...FONTS.label, fontSize: 12, color: '#6E4524' },
});
