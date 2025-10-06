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
          
          <View style={styles.listStatusSection}>
            {hasLetters && (
              <View testID="completed-patient-checkmark" style={styles.greenTick}>
                <Ionicons name="checkmark" size={20} color="#10B981" />
              </View>
            )}
          </View>
          
          <View style={styles.listArrowSection}>
            <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
          </View>
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
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  patientListItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 2,
    marginHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  listAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  listInfoSection: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  listPatientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 1,
  },
  listMRNumber: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  listStatusSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    minWidth: 20,
  },
  greenTick: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  listArrowSection: {
    marginLeft: 6,
  },
});
