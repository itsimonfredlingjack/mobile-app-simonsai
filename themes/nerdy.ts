import { Theme } from '../contexts/ThemeContext';

export const nerdyTheme: Theme = {
  name: 'NERDY',
  colors: {
    background: '#1a1a1a',  // Soft Charcoal
    surface: '#252525',
    accent: '#ffae00',      // Warm Amber
    secondary: '#7cb342',   // Sage Green
    primary: '#ffae00',     // Same as accent for NERDY
    text: '#f5f5f5',
    dimmed: '#888888',
  },
  borderRadius: 20,  // Rounded corners - mjukt
  typography: 'system',  // Default sans-serif
};
