import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  size = 'large' 
}) => {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size={size} color="#000000" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
};

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'people-outline',
  title,
  message,
  actionText,
  onAction,
}) => {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name={icon as any} size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionText && onAction && (
        <Text style={styles.actionText} onPress={onAction}>
          {actionText}
        </Text>
      )}
    </View>
  );
};

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      {onRetry && (
        <Text style={styles.retryText} onPress={onRetry}>
          Tap to retry
        </Text>
      )}
    </View>
  );
};

interface SearchEmptyStateProps {
  query: string;
  onClearSearch: () => void;
}

export const SearchEmptyState: React.FC<SearchEmptyStateProps> = ({ 
  query, 
  onClearSearch 
}) => {
  return (
    <View style={styles.searchEmptyContainer}>
      <Ionicons name="search-outline" size={48} color="#9CA3AF" />
      <Text style={styles.searchEmptyTitle}>No patients found</Text>
      <Text style={styles.searchEmptyMessage}>
        No patients match "{query}"
      </Text>
      <Text style={styles.clearSearchText} onPress={onClearSearch}>
        Clear search
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  actionText: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  retryText: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '600',
    textAlign: 'center',
  },
  searchEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  searchEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  searchEmptyMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  clearSearchText: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '600',
    textAlign: 'center',
  },
});
