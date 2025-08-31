// src/styles/colors.ts
export const medicalColors = {
  // Primary Medical Colors
  primary: '#2E86AB',        // Medical blue
  primaryLight: '#48A3C7',   // Light medical blue
  primaryDark: '#1B5A7A',    // Dark medical blue
  
  // Secondary Colors
  secondary: '#00B894',      // Medical green
  accent: '#6C5CE7',         // Purple for highlights
  warning: '#FDCB6E',        // Yellow for warnings
  danger: '#E17055',         // Red for urgent/critical
  
  // Neutral Colors
  white: '#FFFFFF',
  background: '#F8FAFB',     // Very light blue-gray
  surface: '#FFFFFF',
  
  // Text Colors
  textPrimary: '#2C3E50',    // Dark blue-gray
  textSecondary: '#7F8C8D',  // Medium gray
  textMuted: '#BDC3C7',      // Light gray
  
  // Status Colors
  success: '#00B894',
  info: '#74B9FF',
  error: '#E17055',
  
  // Border and Shadow
  border: '#E1E8ED',
  divider: '#F1F3F4',
  shadow: '#000000',
};

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  card: 12,
  button: 8,
};

export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
};