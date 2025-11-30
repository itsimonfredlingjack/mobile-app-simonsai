import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useServerHealth, formatUptime } from '../hooks/useServerHealth';
import * as Haptics from 'expo-haptics';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ProgressBarProps {
  value: number;
  label: string;
  suffix?: string;
  color?: string;
}

function AsciiProgressBar({ value, label, suffix, color }: ProgressBarProps) {
  const { theme, currentAgent } = useTheme();
  const barWidth = 10;
  const filled = Math.round((value / 100) * barWidth);
  const empty = barWidth - filled;

  // ASCII bar: filled with blocks, empty with dots
  const filledChar = currentAgent === 'qwen' ? '\u2588' : '\u2589'; // Full block
  const emptyChar = currentAgent === 'qwen' ? '\u2591' : '\u2592';  // Light shade

  const bar = filledChar.repeat(filled) + emptyChar.repeat(empty);

  return (
    <View style={styles.progressRow}>
      <Text
        style={[
          styles.progressLabel,
          {
            color: theme.colors.dimmed,
            fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined,
          },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.progressBar,
          {
            color: color || theme.colors.accent,
            fontFamily: 'monospace',
          },
        ]}
      >
        {bar}
      </Text>
      <Text
        style={[
          styles.progressValue,
          {
            color: theme.colors.text,
            fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined,
          },
        ]}
      >
        {value.toFixed(0)}%{suffix ? ` ${suffix}` : ''}
      </Text>
    </View>
  );
}

interface ServerHealthWidgetProps {
  initialExpanded?: boolean;
}

export default function ServerHealthWidget({ initialExpanded = false }: ServerHealthWidgetProps) {
  const { theme, currentAgent } = useTheme();
  const { stats, isLoading, error, refresh, lastUpdated } = useServerHealth(true);
  const [expanded, setExpanded] = useState(initialExpanded);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation when data updates
  useEffect(() => {
    if (stats) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [stats?.timestamp]);

  const toggleExpand = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  // Get color based on value
  const getColor = (value: number, thresholds = { warn: 70, critical: 90 }) => {
    if (value >= thresholds.critical) return '#ef4444'; // Red
    if (value >= thresholds.warn) return '#f59e0b';     // Orange
    return theme.colors.accent;
  };

  if (error) {
    return (
      <View
        style={[
          styles.container,
          styles.errorContainer,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius,
            borderColor: '#ef4444',
          },
        ]}
      >
        <Text
          style={[
            styles.errorText,
            {
              color: '#ef4444',
              fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined,
            },
          ]}
        >
          {currentAgent === 'qwen' ? '// CONNECTION ERROR' : 'Connection error'}
        </Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius,
          },
        ]}
      >
        <Text
          style={[
            styles.loadingText,
            {
              color: theme.colors.dimmed,
              fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined,
            },
          ]}
        >
          {currentAgent === 'qwen' ? '// LOADING...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius,
          borderColor: theme.colors.accent,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      {/* Header - Always visible */}
      <Pressable onPress={toggleExpand} style={styles.header}>
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.accent,
              fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined,
            },
          ]}
        >
          {currentAgent === 'qwen' ? '// SYSTEM STATUS' : 'System Status'}
        </Text>

        {/* Compact status when collapsed */}
        {!expanded && (
          <View style={styles.compactStats}>
            <Text
              style={[
                styles.compactStat,
                {
                  color: getColor(stats.cpu_percent),
                  fontFamily: 'monospace',
                },
              ]}
            >
              CPU {stats.cpu_percent.toFixed(0)}%
            </Text>
            <Text
              style={[
                styles.compactStat,
                {
                  color: getColor(stats.gpu?.gpu_util_percent || 0),
                  fontFamily: 'monospace',
                },
              ]}
            >
              GPU {stats.gpu?.gpu_util_percent || 0}%
            </Text>
          </View>
        )}

        <Text
          style={[
            styles.expandIcon,
            {
              color: theme.colors.dimmed,
            },
          ]}
        >
          {expanded ? '\u25B2' : '\u25BC'}
        </Text>
      </Pressable>

      {/* Expanded content */}
      {expanded && (
        <View style={styles.content}>
          {/* CPU */}
          <AsciiProgressBar
            label="CPU"
            value={stats.cpu_percent}
            color={getColor(stats.cpu_percent)}
          />

          {/* RAM */}
          <AsciiProgressBar
            label="RAM"
            value={stats.ram_percent}
            suffix={`${stats.ram_used_gb.toFixed(1)}/${stats.ram_total_gb.toFixed(0)} GB`}
            color={getColor(stats.ram_percent)}
          />

          {/* Disk */}
          <AsciiProgressBar
            label="DSK"
            value={stats.disk_percent}
            suffix={`${stats.disk_used_gb.toFixed(0)}/${stats.disk_total_gb.toFixed(0)} GB`}
            color={getColor(stats.disk_percent, { warn: 80, critical: 95 })}
          />

          {/* GPU */}
          {stats.gpu && stats.gpu.is_available && (
            <>
              <AsciiProgressBar
                label="GPU"
                value={stats.gpu.gpu_util_percent}
                suffix={`${stats.gpu.temperature_c}\u00B0C`}
                color={getColor(stats.gpu.gpu_util_percent)}
              />
              <AsciiProgressBar
                label="VRM"
                value={stats.gpu.vram_percent}
                suffix={`${stats.gpu.vram_used_gb.toFixed(1)}/${stats.gpu.vram_total_gb.toFixed(0)} GB`}
                color={getColor(stats.gpu.vram_percent, { warn: 80, critical: 95 })}
              />
            </>
          )}

          {/* Uptime */}
          <View style={styles.uptimeRow}>
            <Text
              style={[
                styles.uptimeLabel,
                {
                  color: theme.colors.dimmed,
                  fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined,
                },
              ]}
            >
              {currentAgent === 'qwen' ? 'UPTIME:' : 'Uptime:'}
            </Text>
            <Text
              style={[
                styles.uptimeValue,
                {
                  color: theme.colors.text,
                  fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined,
                },
              ]}
            >
              {formatUptime(stats.uptime_seconds)}
            </Text>
          </View>

          {/* Refresh button */}
          <Pressable
            onPress={refresh}
            style={({ pressed }) => [
              styles.refreshButton,
              {
                backgroundColor: pressed ? theme.colors.accent : 'transparent',
                borderColor: theme.colors.accent,
                borderRadius: theme.borderRadius,
              },
            ]}
          >
            <Text
              style={[
                styles.refreshText,
                {
                  color: theme.colors.accent,
                  fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined,
                },
              ]}
            >
              {currentAgent === 'qwen' ? '\u21BB REFRESH' : '\u21BB Refresh'}
            </Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  errorContainer: {
    padding: 12,
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 12,
    textAlign: 'center',
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  compactStats: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  compactStat: {
    fontSize: 11,
  },
  expandIcon: {
    fontSize: 10,
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    width: 32,
    fontSize: 11,
    fontWeight: 'bold',
  },
  progressBar: {
    fontSize: 14,
    letterSpacing: 1,
    marginHorizontal: 8,
  },
  progressValue: {
    flex: 1,
    fontSize: 11,
    textAlign: 'right',
  },
  uptimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  uptimeLabel: {
    fontSize: 11,
  },
  uptimeValue: {
    fontSize: 11,
    marginLeft: 8,
  },
  refreshButton: {
    marginTop: 10,
    paddingVertical: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
