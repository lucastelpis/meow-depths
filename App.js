/**
 * App.js — Root component for Meow Depths
 *
 * Sets up:
 *   1. React Navigation (stack navigator)
 *   2. GameProvider (global state context)
 *   3. All screen routes
 *
 * The player starts at the CampScreen and navigates between screens.
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Global state provider
import { GameProvider } from './src/state/gameState';

// Screens
import CampScreen from './src/screens/CampScreen';
import WorldMapScreen from './src/screens/WorldMapScreen';
import CombatScreen from './src/screens/CombatScreen';
import ForgeScreen from './src/screens/ForgeScreen';
import SkillTreeScreen from './src/screens/SkillTreeScreen';
import InventoryScreen from './src/screens/InventoryScreen';

// Create the stack navigator
const Stack = createStackNavigator();

/**
 * Main App component.
 *
 * Wraps everything in:
 *   - SafeAreaProvider (handles notches and safe areas on different phones)
 *   - GameProvider (makes game state available everywhere via useGame())
 *   - NavigationContainer (React Navigation's root container)
 *   - Stack.Navigator (manages screen transitions)
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <NavigationContainer>
          {/* Hide the status bar for full-screen immersion */}
          <StatusBar barStyle="light-content" backgroundColor="#000" />

          <Stack.Navigator
            initialRouteName="Camp"
            screenOptions={{
              // Hide the default header — each screen has its own custom header
              headerShown: false,
              // Use a dark background to prevent white flashes during transitions
              cardStyle: { backgroundColor: '#0D0D0D' },
              // Smooth slide transition
              gestureEnabled: true,
            }}
          >
            {/* Camp — the home base hub */}
            <Stack.Screen name="Camp" component={CampScreen} />

            {/* World Map — zone selection */}
            <Stack.Screen name="WorldMap" component={WorldMapScreen} />

            {/* Combat — the main gameplay screen */}
            <Stack.Screen
              name="Combat"
              component={CombatScreen}
              options={{
                // Prevent going back during combat (use the in-game buttons)
                gestureEnabled: false,
              }}
            />

            {/* Forge — crafting gear */}
            <Stack.Screen name="Forge" component={ForgeScreen} />

            {/* Skill Tree — spending skill points */}
            <Stack.Screen name="SkillTree" component={SkillTreeScreen} />

            {/* Inventory — managing gear and consumables */}
            <Stack.Screen name="Inventory" component={InventoryScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </GameProvider>
    </SafeAreaProvider>
  );
}
