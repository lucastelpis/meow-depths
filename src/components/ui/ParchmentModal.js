/**
 * ParchmentModal — the standard "cozy parchment" popup used across the game.
 *
 * A warm parchment card with an inset bevel, a dark title "sign" mounted on the
 * top edge, and an optional ✕ close button. Tapping the dimmed backdrop closes
 * it. Drop content in as children.
 *
 *   <ParchmentModal visible={open} onClose={close} title="OUT OF STAMINA">
 *     ...content...
 *   </ParchmentModal>
 */

import React from 'react';
import { Modal, View, Text, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import theme from '../../constants/theme';

export default function ParchmentModal({
  visible,
  onClose,
  title,
  children,
  maxWidth = 340,
  showClose = true,
  dismissOnBackdrop = true,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={dismissOnBackdrop ? onClose : undefined}
        />
        <View style={[styles.frame, { maxWidth }, theme.SHADOWS?.cardShadow]}>
          <View style={styles.parchment}>
            <View style={styles.bevel} pointerEvents="none" />

            {showClose && (
              <TouchableOpacity
                style={styles.close}
                onPress={onClose}
                activeOpacity={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            )}

            {children}
          </View>

          {/* Title sign mounted on the top edge */}
          {!!title && (
            <View style={styles.topWrap} pointerEvents="none">
              <View style={styles.topOuter}>
                <View style={styles.topInner}>
                  <Text style={styles.topText}>{title}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 14, 6, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 26,
  },
  frame: {
    width: '100%',
    backgroundColor: '#6E4524',
    borderColor: '#3A2210',
    borderWidth: 3,
    borderRadius: 12,
    padding: 10,
    position: 'relative',
  },
  parchment: {
    backgroundColor: '#ECD8A6',
    borderRadius: 14,
    borderColor: '#C9A86A',
    borderWidth: 2,
    paddingTop: 28,
    paddingBottom: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    position: 'relative',
  },
  bevel: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 250, 228, 0.4)',
    zIndex: 1,
  },
  close: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E3CF9C',
    borderColor: '#9A6B34',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  closeText: {
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 15,
    color: '#6E4524',
  },
  topWrap: {
    position: 'absolute',
    top: -17,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  topOuter: {
    borderWidth: 3,
    borderColor: '#4A3917',
    borderRadius: 8,
    padding: 2,
    backgroundColor: '#1E1E20',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 6,
  },
  topInner: {
    borderWidth: 2,
    borderColor: '#D4A754',
    borderRadius: 5,
    backgroundColor: '#1E1E20',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  topText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 12,
    color: '#FFF3DA',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
});
