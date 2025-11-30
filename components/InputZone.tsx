import React, { useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  Keyboard,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface InputZoneProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onMicPress: () => void;
  isRecording: boolean;
  isProcessing: boolean;
  disabled?: boolean;
}

export default function InputZone({
  value,
  onChangeText,
  onSubmit,
  onMicPress,
  isRecording,
  isProcessing,
  disabled = false,
}: InputZoneProps) {
  const { theme, currentAgent } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const recordingPulse = useRef(new Animated.Value(1)).current;

  // Pulsera mic-knappen vid inspelning
  useEffect(() => {
    if (isRecording) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(recordingPulse, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(recordingPulse, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      recordingPulse.setValue(1);
    }
  }, [isRecording]);

  const handleMicPress = async () => {
    // Haptic feedback
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(
          isRecording
            ? Haptics.ImpactFeedbackStyle.Heavy
            : Haptics.ImpactFeedbackStyle.Medium
        );
      } catch (e) {
        // Haptics inte tillgängligt
      }
    }
    onMicPress();
  };

  const handleSubmit = () => {
    if (value.trim() && !isProcessing) {
      Keyboard.dismiss();
      onSubmit();
    }
  };

  // FAB form: hexagonal för QWEN, cirkel för NERDY
  const fabSize = 70;
  const fabBorderRadius = currentAgent === 'qwen' ? 8 : fabSize / 2;

  return (
    <View style={styles.container}>
      {/* Text Input */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius,
            borderColor: theme.colors.accent,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.text,
              fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={currentAgent === 'qwen' ? 'SKRIV KOMMANDO...' : 'Skriv meddelande...'}
          placeholderTextColor={theme.colors.dimmed}
          editable={!disabled && !isProcessing && !isRecording}
          onSubmitEditing={handleSubmit}
          returnKeyType="send"
          multiline={false}
        />

        {/* Send Button */}
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: value.trim() ? theme.colors.accent : theme.colors.dimmed,
              borderRadius: theme.borderRadius || 4,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={handleSubmit}
          disabled={!value.trim() || isProcessing || isRecording}
        >
          <Animated.Text
            style={[
              styles.sendButtonText,
              {
                color: theme.colors.background,
                fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined,
              },
            ]}
          >
            {isProcessing ? '...' : currentAgent === 'qwen' ? 'EXEC' : 'Skicka'}
          </Animated.Text>
        </Pressable>
      </View>

      {/* Floating Mic Button (FAB) */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [{ scale: recordingPulse }],
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            {
              width: fabSize,
              height: fabSize,
              borderRadius: fabBorderRadius,
              backgroundColor: isRecording ? theme.colors.accent : theme.colors.background,
              borderColor: theme.colors.accent,
              borderWidth: 3,
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
          onPress={handleMicPress}
          disabled={isProcessing}
        >
          <Animated.Text
            style={[
              styles.fabIcon,
              {
                color: isRecording ? theme.colors.background : theme.colors.accent,
              },
            ]}
          >
            {isRecording ? '◉' : '◎'}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.fabLabel,
              {
                color: isRecording ? theme.colors.background : theme.colors.accent,
                fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined,
              },
            ]}
          >
            {isRecording ? 'STOP' : 'REC'}
          </Animated.Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 80, // Plats för FAB
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginLeft: 8,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 8,
  },
  fab: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
  },
  fabLabel: {
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 2,
  },
});
