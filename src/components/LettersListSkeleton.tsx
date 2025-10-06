import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox } from './SkeletonBox';

export const LettersListSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Header Skeleton */}
      <View style={styles.header}>
        <SkeletonBox width={80} height={24} borderRadius={4} />
        <SkeletonBox width={60} height={16} borderRadius={4} />
      </View>

      {/* Filter Chips Skeleton */}
      <View style={styles.filterContainer}>
        <View style={styles.filterChip}>
          <SkeletonBox width={40} height={20} borderRadius={10} />
        </View>
        <View style={styles.filterChip}>
          <SkeletonBox width={50} height={20} borderRadius={10} />
        </View>
        <View style={styles.filterChip}>
          <SkeletonBox width={60} height={20} borderRadius={10} />
        </View>
        <View style={styles.filterChip}>
          <SkeletonBox width={50} height={20} borderRadius={10} />
        </View>
      </View>

      {/* Letters List Skeleton */}
      <View style={styles.lettersList}>
        {Array.from({ length: 8 }).map((_, index) => (
          <View key={index} style={styles.letterItem}>
            {/* Status Badge */}
            <View style={styles.statusBadge}>
              <SkeletonBox width={60} height={20} borderRadius={10} />
            </View>
            
            {/* Letter Content */}
            <View style={styles.letterContent}>
              <View style={styles.letterHeader}>
                <SkeletonBox width={120} height={18} borderRadius={4} />
                <SkeletonBox width={80} height={14} borderRadius={4} />
              </View>
              
              <View style={styles.letterBody}>
                <SkeletonBox width="100%" height={14} borderRadius={4} />
                <SkeletonBox width="85%" height={14} borderRadius={4} />
                <SkeletonBox width="70%" height={14} borderRadius={4} />
              </View>
              
              <View style={styles.letterFooter}>
                <SkeletonBox width={100} height={12} borderRadius={4} />
                <SkeletonBox width={60} height={12} borderRadius={4} />
              </View>
            </View>
            
            {/* Arrow */}
            <View style={styles.arrowSection}>
              <SkeletonBox width={14} height={14} borderRadius={7} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  lettersList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  letterItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusBadge: {
    marginRight: 12,
    marginTop: 2,
  },
  letterContent: {
    flex: 1,
    marginRight: 8,
  },
  letterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  letterBody: {
    marginBottom: 8,
    gap: 4,
  },
  letterFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  arrowSection: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
});
