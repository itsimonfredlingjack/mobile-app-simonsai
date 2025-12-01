import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

interface HeaderProps {
  title: string;
  isConnected: boolean;
}

export function Header({ title, isConnected }: HeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <View style={[
          styles.statusDot,
          { backgroundColor: isConnected ? COLORS.emerald : COLORS.red }
        ]} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.subtitle}>
        {isConnected ? 'CONNECTED' : 'OFFLINE'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    color: COLORS.cyberpunk_blue,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  subtitle: {
    color: COLORS.textDim,
    fontSize: 10,
    letterSpacing: 1,
  },
});
