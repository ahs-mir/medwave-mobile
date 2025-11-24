import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PatientFrontend } from '../types';

interface PatientListItemProps {
  patient: PatientFrontend;
  index: number;
  hasLetters: boolean;
  showSectionHeader: boolean;
  onPress: (patient: PatientFrontend) => void;
}

export const PatientListItem = React.memo<PatientListItemProps>(({ 
  patient, 
  index, 
  hasLetters, 
  showSectionHeader, 
  onPress 
}) => {
  // Generate initials from name
  const initials = patient.name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handlePress = () => {
    onPress(patient);
  };

  return (
    <>
      {showSectionHeader && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>
            {patient.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <TouchableOpacity 
        testID={`patient-item-${index}`}
        style={styles.patientListItem}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.listItemContent}>
          <View style={styles.listAvatar}>
            <Text style={styles.listAvatarText}>{initials}</Text>
          </View>
          
          <View style={styles.listInfoSection}>
            <Text style={styles.listPatientName} numberOfLines={1}>
              {patient.name}
            </Text>
            <Text style={styles.listMRNumber}>MR #{patient.id}</Text>
          </View>
          
          {hasLetters && (
            <View testID="completed-patient-checkmark" style={styles.statusIcon}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
          )}
          
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={styles.chevron} />
        </View>
      </TouchableOpacity>
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memoization
  return (
    prevProps.patient.id === nextProps.patient.id &&
    prevProps.patient.name === nextProps.patient.name &&
    prevProps.hasLetters === nextProps.hasLetters &&
    prevProps.showSectionHeader === nextProps.showSectionHeader &&
    prevProps.index === nextProps.index
  );
});

PatientListItem.displayName = 'PatientListItem';

const styles = StyleSheet.create({
  sectionHeader: {
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  patientListItem: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  listInfoSection: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  listPatientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  listMRNumber: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
  },
  statusIcon: {
    marginRight: 12,
  },
  chevron: {
    marginLeft: 4,
  },
});
