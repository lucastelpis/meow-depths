/**
 * App.js — Root component for Meow Depths
 *
 * Sets up:
 *   1. React Navigation (stack navigator)
 *   2. GameProvider (global state context)
 *   3. All screen routes
 *
 * On first launch (hero.element === null) the ElementSelectionScreen is shown
 * instead of the normal navigator. Once an element is chosen, the Camp screen
 * becomes the root and the intro never appears again.
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Global state provider
import { GameProvider, useGame } from './src/state/gameState';

// Screens
import CampScreen from './src/screens/CampScreen';
import WorldMapScreen from './src/screens/WorldMapScreen';
import CombatScreen from './src/screens/CombatScreen';
import ShopScreen from './src/screens/ShopScreen';
import SkillTreeScreen from './src/screens/SkillTreeScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import DungeonMapScreen from './src/screens/DungeonMapScreen';
import DungeonFloorScreen from './src/screens/DungeonFloorScreen';
import ElementSelectionScreen from './src/screens/ElementSelectionScreen';

const Stack = createStackNavigator();

/**
 * Inner navigator — rendered inside GameProvider so it can read game state.
 * Shows the ElementSelectionScreen until the player has chosen an element.
 */
function AppNavigator() {
  const { state } = useGame();
  const hasElement = !!(state?.hero?.element);

  if (!hasElement) {
    return <ElementSelectionScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <Stack.Navigator
        initialRouteName="Camp"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#0D0D0D' },
          gestureEnabled: true,
        }}
      >
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
        <Stack.Screen name="Inventory" component={InventoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <AppNavigator />
      </GameProvider>
    </SafeAreaProvider>
  );
}
