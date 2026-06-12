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
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import ScreenLoader from './src/components/ScreenLoader';

// Global state provider
import { GameProvider, useGame } from './src/state/gameState';

// Screens
import CampScreen from './src/screens/CampScreen';
import WorldMapScreen from './src/screens/WorldMapScreen';
import CombatScreen from './src/screens/CombatScreen';
import ShopScreen from './src/screens/ShopScreen';
import SkillTreeScreen from './src/screens/SkillTreeScreen';
import LoadoutScreen from './src/screens/LoadoutScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DungeonMapScreen from './src/screens/DungeonMapScreen';
import DungeonFloorScreen from './src/screens/DungeonFloorScreen';
import NameInputScreen from './src/screens/NameInputScreen';
import ElementSelectionScreen from './src/screens/ElementSelectionScreen';
import { ALL_SPRITESHEET_ASSETS } from './src/constants/sprites';

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
};

/**
 * Inner navigator — rendered inside GameProvider so it can read game state.
 * Shows the ElementSelectionScreen until the player has chosen an element.
 */
function AppNavigator() {
  const { state } = useGame();
  const hasElement = !!(state?.hero?.element);

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

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
            <Stack.Screen name="Loadout" component={LoadoutScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = Font.useFonts(APP_FONTS);

  return (
    <SafeAreaProvider>
      <GameProvider>
        <ScreenLoader assets={ALL_SPRITESHEET_ASSETS}>
          {/* Hold off mounting any screen until pixel fonts are registered,
              so text never paints with the system fallback font. */}
          {fontsLoaded ? <AppNavigator /> : null}
        </ScreenLoader>
      </GameProvider>
    </SafeAreaProvider>
  );
}
