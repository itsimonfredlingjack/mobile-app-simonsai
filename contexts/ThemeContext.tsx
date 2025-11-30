import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { qwenTheme } from '../themes/qwen';
import { nerdyTheme } from '../themes/nerdy';

export type AgentType = 'qwen' | 'nerdy';

export interface ThemeColors {
  background: string;
  surface: string;
  accent: string;
  secondary?: string;
  text: string;
  dimmed: string;
  primary: string;
}

export interface Theme {
  name: 'QWEN' | 'NERDY';
  colors: ThemeColors;
  borderRadius: number;
  typography: string;
}

interface ThemeContextValue {
  currentAgent: AgentType;
  theme: Theme;
  setAgent: (agent: AgentType) => void;
  animatedColors: {
    background: Animated.AnimatedInterpolation<string>;
    surface: Animated.AnimatedInterpolation<string>;
    accent: Animated.AnimatedInterpolation<string>;
    text: Animated.AnimatedInterpolation<string>;
    dimmed: Animated.AnimatedInterpolation<string>;
  };
  animatedBorderRadius: Animated.AnimatedInterpolation<number>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialAgent?: AgentType;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialAgent = 'qwen'
}) => {
  const [currentAgent, setCurrentAgent] = useState<AgentType>(initialAgent);
  const animationValue = useRef(new Animated.Value(initialAgent === 'qwen' ? 0 : 1)).current;

  const theme = currentAgent === 'qwen' ? qwenTheme : nerdyTheme;

  useEffect(() => {
    Animated.timing(animationValue, {
      toValue: currentAgent === 'qwen' ? 0 : 1,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentAgent]);

  const setAgent = (agent: AgentType) => {
    setCurrentAgent(agent);
  };

  const interpolateColor = (qwenColor: string, nerdyColor: string) => {
    return animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [qwenColor, nerdyColor],
    });
  };

  const animatedColors = {
    background: interpolateColor(qwenTheme.colors.background, nerdyTheme.colors.background),
    surface: interpolateColor(qwenTheme.colors.surface, nerdyTheme.colors.surface),
    accent: interpolateColor(qwenTheme.colors.accent, nerdyTheme.colors.accent),
    text: interpolateColor(qwenTheme.colors.text, nerdyTheme.colors.text),
    dimmed: interpolateColor(qwenTheme.colors.dimmed, nerdyTheme.colors.dimmed),
  };

  const animatedBorderRadius = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [qwenTheme.borderRadius, nerdyTheme.borderRadius],
  });

  const value: ThemeContextValue = {
    currentAgent,
    theme,
    setAgent,
    animatedColors,
    animatedBorderRadius,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
