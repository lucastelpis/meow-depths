/**
 * App.js — Root component for Meow Depths
 *
 * Sets up:
 *   1. React Navigation (stack navigator)
 *   2. GameProvider (global state context)
 *   3. All screen routes
 *
 * On first launch (hero.element === null) the navigator starts on the
 * onboarding flow (NameInput → ElementSelection) instead of the normal
 * routes. Once an element is chosen, the Camp screen becomes the root and
 * the onboarding flow never appears again.
 */

import React from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import ScreenLoader from './src/components/ScreenLoader';

// Global state provider
import { GameProvider, useGame } from './src/state/gameState';

// Sound Manager
import SoundManager from './src/utils/soundManager';

// Screens
import CampScreen from './src/screens/CampScreen';
import WorldMapScreen from './src/screens/WorldMapScreen';
import CombatScreen from './src/screens/CombatScreen';
import ShopScreen from './src/screens/ShopScreen';
import SkillTreeScreen from './src/screens/SkillTreeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import JournalScreen from './src/screens/JournalScreen';
import QuestScreen from './src/screens/QuestScreen';
import DungeonMapScreen from './src/screens/DungeonMapScreen';
import DungeonFloorScreen from './src/screens/DungeonFloorScreen';
import NameInputScreen from './src/screens/NameInputScreen';
import ElementSelectionScreen from './src/screens/ElementSelectionScreen';
import LoreIntroScreen from './src/screens/LoreIntroScreen';
import { ONBOARDING_ASSETS, HUB_ASSETS } from './src/constants/sprites';

const Stack = createStackNavigator();

// Pixel fonts must be loaded BEFORE any screen renders. If a Text paints
// before its custom font is registered, it locks to the system fallback and
// never re-measures — which made the onboarding title render in the wrong
// font on first launch but the correct pixel font after a Reset Save Data
// remount (fonts cached by then).
const APP_FONTS = {
  'PressStart2P-Regular': require('./assets/fonts/PressStart2P-Regular.ttf'),
  'PixelifySans-Regular': require('./assets/fonts/PixelifySans-Regular.ttf'),
  'PixelifySans-Medium': require('./assets/fonts/PixelifySans-Medium.ttf'),
  'Silkscreen-Regular': require('./assets/fonts/Silkscreen-Regular.ttf'),
  'Jersey10-Regular': require('./assets/fonts/Jersey10-Regular.ttf'),
};

/**
 * Inner navigator — rendered inside GameProvider so it can read game state.
 * Shows the ElementSelectionScreen until the player has chosen an element.
 */
function AppNavigator() {
  const { state, loading } = useGame();
  const hasElement = !!(state?.hero?.element);

  React.useEffect(() => {
    if (loading || !state) return;

    // 1. Sync mute settings
    const isMuted = !!(state.settings?.muteSounds);
    SoundManager.setMuted(isMuted);

    // 2. Play BGM based on active run status
    if (state.currentRun?.active) {
      const zoneId = state.currentRun.zoneId;
      if (zoneId === 'zone1') {
        SoundManager.playMusic('zone1');
      } else if (zoneId === 'zone2') {
        SoundManager.playMusic('zone2');
      } else if (zoneId === 'zone3') {
        SoundManager.playMusic('zone3');
      } else {
        SoundManager.playMusic('hub');
      }
    } else {
      SoundManager.playMusic('hub');
    }
  }, [loading, state?.currentRun?.active, state?.currentRun?.zoneId, state?.settings?.muteSounds]);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: '#0D0D0D' }} />;
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Pre-render heavy combat backgrounds behind the navigation stack so they cache perfectly at screen size */}
      {hasElement && (
        <ExpoImage
          source={require('./assets/sprites/banners/battle_bg_1.png')}
          style={[StyleSheet.absoluteFill, { opacity: 0.01 }]}
          contentFit="fill"
        />
      )}

      <ScreenLoader key={hasElement ? 'hub' : 'onboarding'} assets={hasElement ? HUB_ASSETS : ONBOARDING_ASSETS}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#0D0D0D' },
            gestureEnabled: true,
          }}
        >
          {!hasElement ? (
            <>
              <Stack.Screen name="NameInput" component={NameInputScreen} />
              <Stack.Screen name="ElementSelection" component={ElementSelectionScreen} />
              <Stack.Screen name="LoreIntro" component={LoreIntroScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Camp" component={CampScreen} />
              <Stack.Screen name="WorldMap" component={WorldMapScreen} />
              <Stack.Screen name="DungeonFloor" component={DungeonFloorScreen} />
              <Stack.Screen
                name="Combat"
                component={CombatScreen}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen
                name="DungeonMap"
                component={DungeonMapScreen}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen name="Shop" component={ShopScreen} />
              <Stack.Screen name="SkillTree" component={SkillTreeScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Journal" component={JournalScreen} />
              <Stack.Screen name="Quests" component={QuestScreen} />
            </>
          )}
        </Stack.Navigator>
      </ScreenLoader>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = Font.useFonts(APP_FONTS);

  return (
    <SafeAreaProvider>
      <GameProvider>
        {/* Hold off mounting any screen until pixel fonts are registered,
            so text never paints with the system fallback font. */}
        {fontsLoaded ? <AppNavigator /> : null}
      </GameProvider>
    </SafeAreaProvider>
  );
}
