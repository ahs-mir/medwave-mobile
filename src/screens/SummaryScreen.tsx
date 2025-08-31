import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const SummaryScreen = ({ navigation }: any) => {
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummaryData();
  }, []);

  const loadSummaryData = async () => {
    try {
      // TODO: Implement API call to fetch summary data
      // For now, using mock data
      const mockData = {
        today: {
          patients: 12,
          pendingLetters: 3,
          completedNotes: 8,
          urgentCases: 2,
        },
        thisWeek: {
          totalPatients: 45,
          lettersGenerated: 15,
          notesTaken: 32,
          followUps: 8,
        },
        pendingItems: [
          {
            id: '1',
            type: 'letter',
            patientName: 'Robert Wilson',
            description: 'Discharge letter pending review',
            priority: 'high',
          },
          {
            id: '2',
            type: 'note',
            patientName: 'Sarah Johnson',
            description: 'Follow-up notes needed',
            priority: 'medium',
          },
          {
            id: '3',
            type: 'letter',
            patientName: 'John Smith',
            description: 'Referral letter to cardiologist',
            priority: 'low',
          },
        ],
      };
      setSummaryData(mockData);
    } catch (error) {
      console.error('Failed to load summary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#FF3B30';
      case 'medium':
        return '#FF9500';
      case 'low':
        return '#34C759';
      default:
        return '#8E8E93';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'letter':
        return 'document-text';
      case 'note':
        return 'create';
      default:
        return 'ellipse';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="bar-chart" size={48} color="#8E8E93" />
          <Text style={styles.loadingText}>Loading summary...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Summary</Text>
        <TouchableOpacity style={styles.refreshButton}>
          <Ionicons name="refresh" size={18} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Today's Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={20} color="#007AFF" />
              <Text style={styles.statNumber}>{summaryData?.today.patients || 0}</Text>
              <Text style={styles.statLabel}>Patients</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="document-text" size={20} color="#FF9500" />
              <Text style={styles.statNumber}>{summaryData?.today.pendingLetters || 0}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="create" size={20} color="#34C759" />
              <Text style={styles.statNumber}>{summaryData?.today.completedNotes || 0}</Text>
              <Text style={styles.statLabel}>Notes</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="warning" size={20} color="#FF3B30" />
              <Text style={styles.statNumber}>{summaryData?.today.urgentCases || 0}</Text>
              <Text style={styles.statLabel}>Urgent</Text>
            </View>
          </View>
        </View>

        {/* This Week */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.weekStats}>
            <View style={styles.weekStat}>
              <Text style={styles.weekStatNumber}>{summaryData?.thisWeek.totalPatients || 0}</Text>
              <Text style={styles.weekStatLabel}>Total Patients</Text>
            </View>
            <View style={styles.weekStat}>
              <Text style={styles.weekStatNumber}>{summaryData?.thisWeek.lettersGenerated || 0}</Text>
              <Text style={styles.weekStatLabel}>Letters Generated</Text>
            </View>
            <View style={styles.weekStat}>
              <Text style={styles.weekStatNumber}>{summaryData?.thisWeek.notesTaken || 0}</Text>
              <Text style={styles.weekStatLabel}>Notes Taken</Text>
            </View>
            <View style={styles.weekStat}>
              <Text style={styles.weekStatNumber}>{summaryData?.thisWeek.followUps || 0}</Text>
              <Text style={styles.weekStatLabel}>Follow-ups</Text>
            </View>
          </View>
        </View>

        {/* Pending Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Items</Text>
          {summaryData?.pendingItems?.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="checkmark-circle" size={48} color="#34C759" />
              </View>
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptySubtitle}>No pending items</Text>
            </View>
          ) : (
            <View style={styles.pendingContainer}>
              {summaryData?.pendingItems?.map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.pendingItem}
                  onPress={() => {
                    // TODO: Navigate to specific item
                    console.log('Navigate to:', item);
                  }}
                >
                  <View style={styles.pendingItemHeader}>
                    <View style={styles.pendingItemInfo}>
                      <Ionicons
                        name={getTypeIcon(item.type)}
                        size={14}
                        color="#8E8E93"
                      />
                      <Text style={styles.pendingItemTitle}>{item.patientName}</Text>
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                      <Text style={styles.priorityText}>{item.priority}</Text>
                    </View>
                  </View>
                  <Text style={styles.pendingItemDescription}>{item.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 17,
    color: '#8E8E93',
    marginTop: 16,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  weekStats: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  weekStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekStatNumber: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  weekStatLabel: {
    fontSize: 15,
    color: '#8E8E93',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 17,
    color: '#8E8E93',
    marginTop: 4,
  },
  pendingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pendingItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  pendingItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pendingItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 8,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  pendingItemDescription: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 22,
  },
}); 