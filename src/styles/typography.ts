// src/styles/typography.ts
export const typography = {
  // Font Sizes
  sizes: {
    xs: 12,    // Small labels
    sm: 14,    // Secondary text
    base: 16,  // Body text
    lg: 18,    // Subheadings
    xl: 20,    // Section headers
    '2xl': 24, // Page titles
    '3xl': 30, // Main headers
    '4xl': 36, // Display text
  },
  
  // Font Weights
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Line Heights
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};