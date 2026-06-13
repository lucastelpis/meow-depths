/**
 * NameInputScreen.js
 *
 * Step 1 of the first-launch onboarding flow (when hero.element is null).
 * Player sets their name, then continues to ElementSelectionScreen.
 *
 * Visual language matches the Camp hub: dark teal background, parchment
 * plaque banners, wood-textured input panels, and gold pixel-font tags.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, G } from 'react-native-svg';

import theme from '../constants/theme';

const { width: W } = Dimensions.get('window');
// Deterministic plaque width so the title never depends on async font
// measurement (which can lock it too narrow on a remount, e.g. after a
// "Reset Save Data" → onboarding remount).
const PLAQUE_WIDTH = Math.min(W - 80, 320);

// ─── SVG Rugged Border Background Component (matches CampScreen) ─────────────
function RuggedBorderBackground({ width, height }) {
  if (!width || !height) return null;

  const notch = 6; // corner notch size
  const shadowHeight = 5; // bottom shadow bevel height
  const strokePadding = 3; // padding to prevent stroke clipping

  // Coordinates for the notched rectangle shape (straight sides)
  const path = `M ${notch} 0
                L ${width - notch} 0
                L ${width - notch} ${notch}
                L ${width} ${notch}
                L ${width} ${height - notch}
                L ${width - notch} ${height - notch}
                L ${width - notch} ${height}
                L ${notch} ${height}
                L ${notch} ${height - notch}
                L 0 ${height - notch}
                L 0 ${notch}
                L ${notch} ${notch} Z`;

  // Inner line inset coordinates (shifted inwards by 3 pixels)
  const inset = 3;
  const innerPath = `M ${notch + inset} ${inset}
                     L ${width - notch - inset} ${inset}
                     L ${width - notch - inset} ${notch + inset}
                     L ${width - inset} ${notch + inset}
                     L ${width - inset} ${height - notch - inset}
                     L ${width - notch - inset} ${height - notch - inset}
                     L ${width - notch - inset} ${height - inset}
                     L ${notch + inset} ${height - inset}
                     L ${notch + inset} ${height - notch - inset}
                     L ${inset} ${height - notch - inset}
                     L ${inset} ${notch + inset}
                     L ${notch + inset} ${notch + inset} Z`;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Svg
        width={width + strokePadding * 2}
        height={height + shadowHeight + strokePadding * 2}
        style={{
          position: 'absolute',
          top: -strokePadding,
          left: -strokePadding,
        }}
      >
        <G transform={`translate(${strokePadding}, ${strokePadding})`}>
          {/* 1. 3D Under-Shadow */}
          <Path d={path} fill="#4E1D0C" transform={`translate(0, ${shadowHeight})`} />

          {/* 2. Main Button Face with Dark Outline */}
          <Path
            d={path}
            fill="#A84C27"
            stroke="#4E1D0C"
            strokeWidth={3}
            strokeLinejoin="miter"
          />
          {/* 3. Inner line border highlight */}
          <Path
            d={innerPath}
            fill="none"
            stroke="#D67545"
            strokeWidth={1.5}
            opacity={0.75}
          />
        </G>
      </Svg>
    </View>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NameInputScreen({ navigation }) {
  const [heroName, setHeroName] = useState('Mochi');
  const [continueBtnLayout, setContinueBtnLayout] = useState({ width: 0, height: 0 });

  const handleContinue = () => {
    navigation.navigate('ElementSelection', { heroName: heroName.trim() || 'Mochi' });
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Onboarding banner artwork with title plaque + top tag overlaid */}
          <View style={styles.bannerOuter}>
            <View style={styles.bannerContainer}>
              <Image
                source={require('../../assets/sprites/banners/onboarding-banner.png')}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.bannerTitleOverlay}>
              <View style={styles.titlePlaqueOuter}>
                <View style={styles.titlePlaqueInner}>
                  <Text style={styles.titlePlaqueText}>
                    WELCOME TO THE{'\n'}MEOW DUNGEONS
                  </Text>
                </View>
                <View style={styles.topTagOverlay}>
                  <View style={styles.topTag}>
                    <Text style={styles.topTagText}>★ A NEW JOURNEY BEGINS ★</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Lore text */}
          <Text style={styles.loreText}>
            For generations, the Meow Order has protected the world from evil. As a new recruit following your family's tradition, explore endless dungeons and grow stronger to cleanse the world.
          </Text>

          {/* Name input */}
          <View style={styles.section}>
            <Text style={styles.nameQuestion}>WHAT'S YOUR NAME, RECRUIT?</Text>
            <View style={styles.nameInputWrapper}>
              <TextInput
                style={styles.nameInput}
                value={heroName}
                onChangeText={setHeroName}
                placeholder="Mochi"
                placeholderTextColor="rgba(255, 243, 218, 0.4)"
                maxLength={16}
                selectTextOnFocus
                textAlign="center"
                cursorColor="#E8A73A"
                selectionColor="rgba(232, 167, 58, 0.4)"
              />
            </View>
          </View>
        </ScrollView>

        {/* Pinned Bottom Container for Continue Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleContinue}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setContinueBtnLayout({ width, height });
            }}
            activeOpacity={0.85}
          >
            <RuggedBorderBackground width={continueBtnLayout.width} height={continueBtnLayout.height} />
            <Text style={styles.continueText}>CONTINUE ➔</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#133131',
  },
  content: {
    flex: 1,
  },
  scroll: {
    paddingTop: 16,
    paddingHorizontal: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },

  /* Top tag (overlaps the title plaque's top border) */
  topTagOverlay: {
    position: 'absolute',
    top: -12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  topTag: {
    backgroundColor: '#F3E2BD',
    borderColor: '#4A3917',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  topTagText: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 10,
    letterSpacing: 0,
    color: '#2A1A0C',
  },

  /* Title plaque (overlaid on top of the banner artwork) */
  bannerTitleOverlay: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  titlePlaqueOuter: {
    alignSelf: 'center',
    width: PLAQUE_WIDTH,
    borderWidth: 3,
    borderColor: '#4A3917',
    borderRadius: 8,
    backgroundColor: 'transparent',
    padding: 2,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  titlePlaqueInner: {
    borderWidth: 2,
    borderColor: '#D4A754',
    borderRadius: 5,
    backgroundColor: '#1E1E20',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  titlePlaqueText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 18,
    lineHeight: 28,
    color: '#FFF3DA',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },

  /* Onboarding banner artwork (matches CampScreen's hub banner border) */
  bannerOuter: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    marginBottom: 20,
  },
  bannerContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.BORDER_RADIUS.card,
    borderWidth: 3,
    borderColor: '#4A3917',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },

  /* Lore text */
  loreText: {
    fontFamily: 'PixelifySans-Regular',
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255, 243, 218, 0.7)',
    textAlign: 'center',
    marginBottom: 28,
  },

  /* Name section */
  section: {
    marginBottom: 20,
  },
  nameQuestion: {
    fontFamily: 'Silkscreen-Regular',
    fontSize: 12,
    letterSpacing: 1,
    color: '#FFF3DA',
    textAlign: 'center',
    marginBottom: 10,
  },

  /* Name input — centered name on a fill-in-the-blank gold underline */
  nameInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.BORDER_RADIUS.card,
    borderWidth: 3,
    borderColor: '#E8A73A',
    backgroundColor: 'rgba(20, 44, 28, 0.9)',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  nameInput: {
    minWidth: 140,
    maxWidth: 240,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(232, 167, 58, 0.55)',
    fontFamily: 'PixelifySans-Medium',
    fontSize: 22,
    fontWeight: 'normal',
    color: '#FFF3DA',
  },

  /* Bottom Pinned Button container */
  bottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },

  /* Continue button */
  continueBtn: {
    width: '100%',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    fontFamily: 'PixelifySans-Medium',
    fontWeight: 'normal',
    fontSize: 20,
    color: '#FFF3DA',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
