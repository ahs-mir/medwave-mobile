import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import screens
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { PatientListScreen } from '../screens/patients/PatientListScreen';
import { LettersScreen } from '../screens/LettersScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Define tab param list
export type MainTabParamList = {
  // Home: undefined; // Hidden for now
  Patients: undefined;
  Letters: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Patients') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Letters') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0.5,
          borderTopColor: '#E5E5EA',
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          paddingTop: Platform.OS === 'ios' ? 8 : 8,
          height: Platform.OS === 'ios' ? 49 + insets.bottom : 60,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: Platform.OS === 'ios' ? 2 : 4,
          marginBottom: Platform.OS === 'ios' ? 0 : 2,
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'ios' ? 4 : 0,
        },
        headerShown: false,
      })}
    >
      {/* Home tab hidden for now */}
      {/* <Tab.Screen 
        name="Home" 
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      /> */}
      <Tab.Screen 
        name="Patients" 
        component={PatientListScreen}
        options={{
          tabBarLabel: 'Patients',
        }}
      />
      <Tab.Screen 
        name="Letters" 
        component={LettersScreen}
        options={{
          tabBarLabel: 'Letters',
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};
