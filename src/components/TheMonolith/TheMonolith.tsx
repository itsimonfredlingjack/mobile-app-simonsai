import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const CUBE_SIZE = width * 0.6;

interface TheMonolithProps {
  state: 'idle' | 'listening' | 'processing' | 'speaking';
}

export const TheMonolith: React.FC<TheMonolithProps> = ({ state }) => {
  const rotateX = useRef(new Animated.Value(0)).current;
  const rotateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];

    // Animation parameters based on state
    const params = {
      idle: { duration: 20000, scaleMin: 0.98, scaleMax: 1.02, glowMax: 0 },
      listening: { duration: 8000, scaleMin: 1.0, scaleMax: 1.05, glowMax: 0.6 },
      processing: { duration: 3000, scaleMin: 1.0, scaleMax: 1.08, glowMax: 0.8 },
      speaking: { duration: 6000, scaleMin: 0.95, scaleMax: 1.08, glowMax: 0.5 },
    }[state];

    // Rotation animation
    const rotationAnim = Animated.loop(
      Animated.parallel([
        Animated.timing(rotateX, {
          toValue: 1,
          duration: params.duration,
          useNativeDriver: true,
        }),
        Animated.timing(rotateY, {
          toValue: 1,
          duration: params.duration,
          useNativeDriver: true,
        }),
      ])
    );

    // Scale animation
    const scaleAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: params.scaleMax,
          duration: params.duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: params.scaleMin,
          duration: params.duration / 2,
          useNativeDriver: true,
        }),
      ])
    );

    // Glow animation
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: params.glowMax,
          duration: params.duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: params.duration / 2,
          useNativeDriver: true,
        }),
      ])
    );

    animations.push(rotationAnim, scaleAnim, glowAnim);

    // Start all animations
    animations.forEach(anim => anim.start());

    // Cleanup
    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, [state, rotateX, rotateY, scale, glowOpacity]);

  // Interpolate rotation values
  const rotateXInterpolate = rotateX.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotateYInterpolate = rotateY.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Face styles with transforms
  const getFaceStyle = (type: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom') => {
    const baseTransform = [
      { rotateX: rotateXInterpolate },
      { rotateY: rotateYInterpolate },
      { scale },
    ];

    const faceTransforms = {
      front: [{ translateZ: CUBE_SIZE / 2 }],
      back: [{ rotateY: '180deg' }, { translateZ: CUBE_SIZE / 2 }],
      left: [{ rotateY: '-90deg' }, { translateZ: CUBE_SIZE / 2 }],
      right: [{ rotateY: '90deg' }, { translateZ: CUBE_SIZE / 2 }],
      top: [{ rotateX: '90deg' }, { translateZ: CUBE_SIZE / 2 }],
      bottom: [{ rotateX: '-90deg' }, { translateZ: CUBE_SIZE / 2 }],
    };

    return {
      ...styles.face,
      transform: [...baseTransform, ...faceTransforms[type]],
    };
  };

  return (
    <View style={styles.container}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowOpacity,
            transform: [{ scale }],
          },
        ]}
      />

      {/* 3D Cube */}
      <View style={styles.cube}>
        {/* Front face */}
        <Animated.View style={getFaceStyle('front')}>
          <View style={styles.faceContent} />
        </Animated.View>

        {/* Back face */}
        <Animated.View style={getFaceStyle('back')}>
          <View style={styles.faceContent} />
        </Animated.View>

        {/* Left face */}
        <Animated.View style={getFaceStyle('left')}>
          <View style={styles.faceContent} />
        </Animated.View>

        {/* Right face */}
        <Animated.View style={getFaceStyle('right')}>
          <View style={styles.faceContent} />
        </Animated.View>

        {/* Top face */}
        <Animated.View style={getFaceStyle('top')}>
          <View style={styles.faceContent} />
        </Animated.View>

        {/* Bottom face */}
        <Animated.View style={getFaceStyle('bottom')}>
          <View style={styles.faceContent} />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cube: {
    width: CUBE_SIZE,
    height: CUBE_SIZE,
    position: 'relative',
  },
  face: {
    position: 'absolute',
    width: CUBE_SIZE,
    height: CUBE_SIZE,
    backfaceVisibility: 'hidden',
  },
  faceContent: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 243, 255, 0.15)',
    borderWidth: 2,
    borderColor: '#00f3ff',
    borderRadius: 4,
  },
  glow: {
    position: 'absolute',
    width: CUBE_SIZE * 1.5,
    height: CUBE_SIZE * 1.5,
    borderRadius: (CUBE_SIZE * 1.5) / 2,
    backgroundColor: '#00f3ff',
    shadowColor: '#00f3ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 20,
  },
});
