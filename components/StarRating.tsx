import { View, Pressable, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readonly?: boolean;
}

export function StarRating({ value, onChange, size = 32, readonly = false }: StarRatingProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map(s => (
        <Pressable key={s} onPress={() => !readonly && onChange?.(s)} disabled={readonly}>
          <Star
            size={size}
            color={s <= value ? Colors.accent : Colors.border}
            fill={s <= value ? Colors.accent : 'none'}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm },
});
