import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';

const { width, height } = Dimensions.get('window');

interface Particle {
  id: number;
  translateY: Animated.Value;
  translateX: number;
  size: number;
  duration: number;
}

const PARTICLE_COUNT = 18;
const GRADIENT_COLORS = ['#1e3a5f', '#2d1b4e', '#0a0f1e'];

export const AmbientBackground: React.FC = () => {
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    // Generate particles with random properties
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      translateY: new Animated.Value(height),
      translateX: Math.random() * width,
      size: Math.random() * 3 + 2, // 2-5px
      duration: Math.random() * 6000 + 8000, // 8-14 seconds
    }));

    // Animate each particle
    const animations = particlesRef.current.map((particle) => {
      const animate = () => {
        particle.translateY.setValue(height);

        Animated.timing(particle.translateY, {
          toValue: -50,
          duration: particle.duration,
          useNativeDriver: true,
        }).start(() => {
          // Loop animation
          animate();
        });
      };

      // Stagger start times slightly
      const startDelay = Math.random() * 2000;
      setTimeout(animate, startDelay);

      return particle;
    });

    // Cleanup function
    return () => {
      particlesRef.current.forEach((particle) => {
        particle.translateY.stopAnimation();
      });
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Aurora gradient background */}
      <LinearGradient
        colors={GRADIENT_COLORS}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating particles */}
      {particlesRef.current.map((particle) => (
        <Animated.View
          key={particle.id}
          style={[
            styles.particle,
            {
              width: particle.size,
              height: particle.size,
              left: particle.translateX,
              transform: [{ translateY: particle.translateY }],
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 100,
  },
});
