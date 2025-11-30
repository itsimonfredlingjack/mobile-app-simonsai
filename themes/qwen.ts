import { Theme } from '../contexts/ThemeContext';

export const qwenTheme: Theme = {
  name: 'QWEN',
  colors: {
    background: '#0a0f14',  // Midnight Blue
    surface: '#0f1820',
    accent: '#00f3ff',      // Neon Cyan
    primary: '#00f3ff',     // Same as accent for QWEN
    text: '#e0e6ed',
    dimmed: '#4a5568',
  },
  borderRadius: 0,  // Sharp corners - kantigt
  typography: 'monospace',
};
