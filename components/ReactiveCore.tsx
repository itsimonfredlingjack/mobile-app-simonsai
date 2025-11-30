import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Line, Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';

interface ReactiveCoreProps {
  agent: 'qwen' | 'nerdy';
  state: 'idle' | 'listening' | 'processing';
}

// Animation timing configuration
const ANIMATION_CONFIG = {
  idle: {
    rotationDuration: 18000,      // 18s (up from 8s) - meditative
    rotationXDuration: 25000,
    breathingDuration: 4000,
    scaleMin: 0.98,
    scaleMax: 1.02,
  },
  listening: {
    rotationDuration: 4000,
    rotationXDuration: 6000,
    breathingDuration: 1200,
    scaleMin: 0.95,
    scaleMax: 1.08,
  },
  processing: {
    rotationDuration: 800,        // Fast - brain working
    rotationXDuration: 1200,
    breathingDuration: 300,
    scaleMin: 0.92,
    scaleMax: 1.15,               // Dramatic pulse
  },
};

// Icosahedron vertices (normalized to unit sphere)
const ICOSAHEDRON_VERTICES = [
  [0, 1, 1.618],
  [0, -1, 1.618],
  [0, 1, -1.618],
  [0, -1, -1.618],
  [1, 1.618, 0],
  [-1, 1.618, 0],
  [1, -1.618, 0],
  [-1, -1.618, 0],
  [1.618, 0, 1],
  [-1.618, 0, 1],
  [1.618, 0, -1],
  [-1.618, 0, -1],
].map(([x, y, z]) => {
  const len = Math.sqrt(x * x + y * y + z * z);
  return [x / len, y / len, z / len];
});

// Icosahedron edges (pairs of vertex indices)
const ICOSAHEDRON_EDGES = [
  [0, 1], [0, 4], [0, 5], [0, 8], [0, 9],
  [1, 6], [1, 7], [1, 8], [1, 9],
  [2, 3], [2, 4], [2, 5], [2, 10], [2, 11],
  [3, 6], [3, 7], [3, 10], [3, 11],
  [4, 5], [4, 8], [4, 10],
  [5, 9], [5, 11],
  [6, 7], [6, 8], [6, 10],
  [7, 9], [7, 11],
  [8, 10],
  [9, 11],
];

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

export default function ReactiveCore({ agent, state }: ReactiveCoreProps) {
  const { theme } = useTheme();

  // Animation values
  const rotationY = useSharedValue(0);
  const rotationX = useSharedValue(0);
  const scale = useSharedValue(1);
  const pulse = useSharedValue(0);
  const breathOpacity = useSharedValue(1);

  useEffect(() => {
    // Get animation config for current state
    const config = ANIMATION_CONFIG[state];

    if (agent === 'qwen') {
      // Rotate icosahedron
      rotationY.value = withRepeat(
        withTiming(Math.PI * 2, {
          duration: config.rotationDuration,
          easing: Easing.linear,
        }),
        -1,
        false
      );

      rotationX.value = withRepeat(
        withTiming(Math.PI * 0.5, {
          duration: config.rotationXDuration,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    } else {
      // Breathing orb animation with scale range
      scale.value = withRepeat(
        withTiming(config.scaleMax, {
          duration: config.breathingDuration,
          easing: Easing.inOut(Easing.sine),
        }),
        -1,
        true
      );

      // Breathing opacity animation
      breathOpacity.value = withRepeat(
        withTiming(0.7, {
          duration: config.breathingDuration,
          easing: Easing.inOut(Easing.sine),
        }),
        -1,
        true
      );
    }

    // Pulse animation for listening/processing states
    if (state === 'listening' || state === 'processing') {
      pulse.value = withRepeat(
        withTiming(1, {
          duration: config.breathingDuration / 2,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    } else {
      pulse.value = withTiming(0, { duration: 500 });
    }
  }, [agent, state]);

  // Project 3D point to 2D with rotation
  const project3D = (vertex: number[], rotY: number, rotX: number) => {
    let [x, y, z] = vertex;

    // Rotate around Y axis
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;

    // Rotate around X axis
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const y1 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    // Project to 2D (simple orthographic projection)
    const scale = 40;
    const centerX = 80;
    const centerY = 80;

    return {
      x: centerX + x1 * scale,
      y: centerY + y1 * scale,
      z: z2, // Keep z for depth sorting
    };
  };

  const animatedStyle = useAnimatedStyle(() => {
    const pulseScale = interpolate(pulse.value, [0, 1], [1, 1.15]);

    return {
      transform: [
        { scale: agent === 'nerdy' ? scale.value * pulseScale : pulseScale },
      ],
      opacity: agent === 'nerdy' ? breathOpacity.value : 1,
    };
  });

  const renderQwenIcosahedron = () => {
    // Animate rotation values for live updates
    const rotY = rotationY.value;
    const rotX = rotationX.value;

    // Project all vertices
    const projectedVertices = ICOSAHEDRON_VERTICES.map(v => project3D(v, rotY, rotX));

    // Calculate average z-depth for each edge (for basic depth sorting)
    const edgesWithDepth = ICOSAHEDRON_EDGES.map(([i, j]) => {
      const v1 = projectedVertices[i];
      const v2 = projectedVertices[j];
      const avgZ = (v1.z + v2.z) / 2;
      return { i, j, v1, v2, avgZ };
    }).sort((a, b) => a.avgZ - b.avgZ); // Draw back edges first

    const primaryColor = theme.colors.primary;
    const accentColor = theme.colors.accent;
    const processingColor = '#00ffff';

    return (
      <AnimatedSvg width="160" height="160" style={animatedStyle}>
        {edgesWithDepth.map(({ i, j, v1, v2, avgZ }, idx) => {
          // Vary opacity and color based on depth
          const opacity = interpolate(avgZ, [-1, 1], [0.3, 1]);
          const baseColor = avgZ > 0 ? accentColor : primaryColor;
          const color = state === 'processing' ? processingColor : baseColor;

          return (
            <Line
              key={`edge-${i}-${j}`}
              x1={v1.x}
              y1={v1.y}
              x2={v2.x}
              y2={v2.y}
              stroke={color}
              strokeWidth={state === 'processing' ? 2.5 : 1.5}
              opacity={opacity}
            />
          );
        })}
      </AnimatedSvg>
    );
  };

  const renderNerdyOrb = () => {
    const glowColor = theme.colors.accent;
    const coreColor = '#FFA500'; // Amber

    return (
      <AnimatedSvg width="160" height="160" style={animatedStyle}>
        <Defs>
          <RadialGradient id="orbGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={coreColor} stopOpacity="1" />
            <Stop offset="40%" stopColor={glowColor} stopOpacity="0.8" />
            <Stop offset="70%" stopColor={glowColor} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={glowColor} stopOpacity="0" />
          </RadialGradient>

          <RadialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={glowColor} stopOpacity="0.6" />
            <Stop offset="50%" stopColor={glowColor} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={glowColor} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Outer glow */}
        <Circle
          cx="80"
          cy="80"
          r="60"
          fill="url(#glowGradient)"
        />

        {/* Core orb */}
        <Circle
          cx="80"
          cy="80"
          r="35"
          fill="url(#orbGradient)"
        />

        {/* Inner highlight */}
        <Circle
          cx="70"
          cy="70"
          r="12"
          fill={coreColor}
          opacity="0.6"
        />
      </AnimatedSvg>
    );
  };

  return (
    <View style={styles.container}>
      {agent === 'qwen' ? renderQwenIcosahedron() : renderNerdyOrb()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
});