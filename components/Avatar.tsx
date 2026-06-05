import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors, Typography, BorderRadius } from '@/constants/theme';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  backgroundColor?: string;
}

export function Avatar({ uri, name, size = 48, backgroundColor = Colors.primary }: AvatarProps) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontFamily: 'Inter-Bold',
    color: Colors.textInverse,
  },
});
