import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { useCallback, useEffect, useRef } from 'react';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';

interface SOSButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export function SOSButton({ onPress, disabled = false }: SOSButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [pulse]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  }, [scale]);

  return (
    <View style={styles.outerRing}>
      <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulse }] }]} />
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel="Signaler une panne"
        accessibilityRole="button"
      >
        <Animated.View
          style={[
            styles.button,
            { transform: [{ scale }] },
            disabled && styles.disabled,
          ]}
        >
          <Text style={styles.icon}>SOS</Text>
          <Text style={styles.label}>PANNE</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const BUTTON_SIZE = 200;

const styles = StyleSheet.create({
  outerRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: BUTTON_SIZE + 24,
    height: BUTTON_SIZE + 24,
    borderRadius: (BUTTON_SIZE + 24) / 2,
    backgroundColor: Colors.primary,
    opacity: 0.15,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  icon: {
    fontFamily: 'Inter-Bold',
    fontSize: 48,
    color: Colors.textInverse,
    lineHeight: 56,
  },
  label: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeLg,
    color: Colors.textInverse,
    letterSpacing: 4,
    marginTop: Spacing.xs,
  },
  disabled: {
    backgroundColor: Colors.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
});
