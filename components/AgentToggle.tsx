import React, { useEffect, useRef } from 'react';
import { View, Pressable, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useTheme, AgentType } from '../contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface AgentToggleProps {
  disabled?: boolean;
}

export default function AgentToggle({ disabled = false }: AgentToggleProps) {
  const { currentAgent, setAgent, theme, animatedColors } = useTheme();
  const slideAnim = useRef(new Animated.Value(currentAgent === 'qwen' ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: currentAgent === 'qwen' ? 0 : 1,
      damping: 15,
      stiffness: 150,
      useNativeDriver: true,
    }).start();
  }, [currentAgent]);

  const handleToggle = async (agent: AgentType) => {
    if (disabled || agent === currentAgent) return;

    // Haptic feedback
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {
        // Haptics inte tillgängligt
      }
    }

    setAgent(agent);
  };

  const toggleWidth = 160;
  const indicatorWidth = toggleWidth / 2 - 4;

  const indicatorTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, toggleWidth / 2 + 2],
  });

  // Dynamisk border-radius för indikatorn
  const indicatorBorderRadius = currentAgent === 'qwen' ? 0 : 16;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.toggleContainer,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius || 4,
            borderColor: theme.colors.dimmed,
          },
        ]}
      >
        {/* Sliding Indicator */}
        <Animated.View
          style={[
            styles.indicator,
            {
              width: indicatorWidth,
              backgroundColor: theme.colors.accent,
              borderRadius: indicatorBorderRadius,
              transform: [{ translateX: indicatorTranslate }],
            },
          ]}
        />

        {/* QWEN Button */}
        <Pressable
          style={styles.toggleButton}
          onPress={() => handleToggle('qwen')}
          disabled={disabled}
        >
          <Text
            style={[
              styles.toggleText,
              {
                color: currentAgent === 'qwen' ? theme.colors.background : theme.colors.dimmed,
                fontFamily: 'monospace',
              },
            ]}
          >
            QWEN
          </Text>
        </Pressable>

        {/* NERDY Button */}
        <Pressable
          style={styles.toggleButton}
          onPress={() => handleToggle('nerdy')}
          disabled={disabled}
        >
          <Text
            style={[
              styles.toggleText,
              {
                color: currentAgent === 'nerdy' ? theme.colors.background : theme.colors.dimmed,
                fontFamily: currentAgent === 'nerdy' ? undefined : 'monospace',
              },
            ]}
          >
            NERDY
          </Text>
        </Pressable>
      </Animated.View>

      {/* Agent Description */}
      <Animated.Text
        style={[
          styles.description,
          {
            color: theme.colors.dimmed,
            fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined,
          },
        ]}
      >
        {currentAgent === 'qwen' ? '// Logic Engine' : '// The Mentor'}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    width: 160,
    height: 44,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    zIndex: 0,
  },
  toggleButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  description: {
    marginTop: 8,
    fontSize: 11,
    letterSpacing: 1,
  },
});
