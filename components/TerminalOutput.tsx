import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface TerminalOutputProps {
  command: string;
  output: string;
  exitCode?: number;
  error?: string;
  durationMs?: number;
  onClose?: () => void;
}

export default function TerminalOutput({
  command,
  output,
  exitCode,
  error,
  durationMs,
  onClose,
}: TerminalOutputProps) {
  const { theme, currentAgent } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [output]);

  const handleClose = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
    onClose?.();
  };

  const isSuccess = exitCode === 0;
  const statusColor = isSuccess ? '#22c55e' : '#ef4444';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#0a0a0a',
          borderRadius: theme.borderRadius,
          borderColor: currentAgent === 'qwen' ? theme.colors.accent : '#22c55e',
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.prompt, { color: '#22c55e' }]}>
          $ {command}
        </Text>
        {onClose && (
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: theme.colors.dimmed }]}>
              {currentAgent === 'qwen' ? '[X]' : 'Close'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Output */}
      <ScrollView
        ref={scrollRef}
        style={styles.outputScroll}
        showsVerticalScrollIndicator={true}
      >
        {output ? (
          <Text style={styles.output} selectable>
            {output}
          </Text>
        ) : error ? (
          <Text style={[styles.output, styles.errorOutput]}>
            {error}
          </Text>
        ) : (
          <Text style={[styles.output, { color: theme.colors.dimmed }]}>
            (no output)
          </Text>
        )}
      </ScrollView>

      {/* Footer with status */}
      <View style={styles.footer}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: statusColor },
            ]}
          />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {exitCode !== undefined
              ? `exit ${exitCode}`
              : error
              ? 'error'
              : 'running'}
          </Text>
        </View>
        {durationMs !== undefined && (
          <Text style={[styles.durationText, { color: theme.colors.dimmed }]}>
            {durationMs}ms
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 197, 94, 0.3)',
  },
  prompt: {
    fontFamily: 'monospace',
    fontSize: 12,
    flex: 1,
  },
  closeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeText: {
    fontFamily: 'monospace',
    fontSize: 11,
  },
  outputScroll: {
    maxHeight: 200,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  output: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#22c55e',
    lineHeight: 16,
  },
  errorOutput: {
    color: '#ef4444',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontFamily: 'monospace',
    fontSize: 10,
  },
  durationText: {
    fontFamily: 'monospace',
    fontSize: 10,
  },
});
