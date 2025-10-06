import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { MainTabNavigator } from './MainTabNavigator';
import { AddPatientOptionsScreen } from '../screens/patients/AddPatientOptionsScreen';
import AddPatientScreen from '../screens/patients/AddPatientScreen';
import { PatientDetailScreen } from '../screens/patients/PatientDetailScreen';
import { LetterDetailScreen } from '../screens/letters/LetterDetailScreen';

export type AppStackParamList = {
  MainTabs: undefined;
  AddPatientOptions: undefined;
  AddPatient: { scannedData?: any };
  PatientDetail: { 
    patientId: number; 
    patient: any; 
    onLetterCreated?: () => void;
  };
  LetterDetail: { letter: any; patientName: string };
};

const AppStack = createStackNavigator<AppStackParamList>();

export const AppStackNavigator = () => {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="MainTabs" component={MainTabNavigator} />
      <AppStack.Screen name="AddPatientOptions" component={AddPatientOptionsScreen} />
      <AppStack.Screen name="AddPatient" component={AddPatientScreen} />
      <AppStack.Screen name="PatientDetail" component={PatientDetailScreen} />
      <AppStack.Screen name="LetterDetail" component={LetterDetailScreen} />
    </AppStack.Navigator>
  );
};