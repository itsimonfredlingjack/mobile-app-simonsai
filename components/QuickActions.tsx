import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface QuickActionsProps {
  onStatusPress: () => void;
  onRestartPress: () => void;
  onDeployPress: () => void;
  onShellPress: () => void;
}

interface ActionButton {
  label: string;
  onPress: () => void;
}

export default function QuickActions({
  onStatusPress,
  onRestartPress,
  onDeployPress,
  onShellPress,
}: QuickActionsProps) {
  const { currentAgent } = useTheme();

  // Only show for QWEN agent
  if (currentAgent !== 'qwen') {
    return null;
  }

  const handlePress = async (onPress: () => void) => {
    // Haptic feedback
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        // Silently fail if haptics not available
      }
    }
    onPress();
  };

  const buttons: ActionButton[] = [
    { label: 'STATUS', onPress: onStatusPress },
    { label: 'RESTART', onPress: onRestartPress },
    { label: 'DEPLOY', onPress: onDeployPress },
    { label: 'SHELL', onPress: onShellPress },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {buttons.map((button, index) => (
          <Pressable
            key={index}
            onPress={() => handlePress(button.onPress)}
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.chipPressed,
            ]}
          >
            {({ pressed }) => (
              <Text
                style={[
                  styles.chipText,
                  pressed && styles.chipTextPressed,
                ]}
              >
                {button.label}
              </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  scrollContent: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 0,

    // iOS glow effect
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,

    // Android
    elevation: 2,
  },
  chipPressed: {
    backgroundColor: 'rgba(0, 212, 255, 0.25)',
    borderColor: '#00d4ff',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  chipText: {
    color: '#00d4ff',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  chipTextPressed: {
    color: '#ffffff',
  },
});
