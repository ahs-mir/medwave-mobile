import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox } from './SkeletonBox';

export const PatientListSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {Array.from({ length: 8 }).map((_, index) => (
        <View key={index} style={styles.skeletonItem}>
          {/* Section header skeleton */}
          {index % 4 === 0 && (
            <View style={styles.sectionHeader}>
              <SkeletonBox width={20} height={16} borderRadius={2} />
            </View>
          )}
          
          <View style={styles.patientItem}>
            {/* Avatar skeleton */}
            <SkeletonBox width={36} height={36} borderRadius={18} />
            
            {/* Patient info skeleton */}
            <View style={styles.patientInfo}>
              <SkeletonBox width="70%" height={15} borderRadius={4} />
              <View style={styles.spacing} />
              <SkeletonBox width="40%" height={13} borderRadius={4} />
            </View>
            
            {/* Status skeleton */}
            <View style={styles.statusSection}>
              <SkeletonBox width={20} height={20} borderRadius={10} />
            </View>
            
            {/* Arrow skeleton */}
            <View style={styles.arrowSection}>
              <SkeletonBox width={14} height={14} borderRadius={7} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

export const PatientItemSkeleton: React.FC = () => {
  return (
    <View style={styles.patientItem}>
      {/* Avatar skeleton */}
      <SkeletonBox width={48} height={48} borderRadius={24} />
      
      {/* Patient info skeleton */}
      <View style={styles.patientInfo}>
        <SkeletonBox width="70%" height={18} borderRadius={4} />
        <View style={styles.spacing} />
        <SkeletonBox width="40%" height={14} borderRadius={4} />
      </View>
      
      {/* Status skeleton */}
      <View style={styles.statusSection}>
        <SkeletonBox width={24} height={24} borderRadius={12} />
      </View>
      
      {/* Arrow skeleton */}
      <View style={styles.arrowSection}>
        <SkeletonBox width={14} height={14} borderRadius={7} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 0,
  },
  skeletonItem: {
    marginBottom: 2,
  },
  sectionHeader: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
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
  patientInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  spacing: {
    height: 4,
  },
  statusSection: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
  },
  arrowSection: {
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
