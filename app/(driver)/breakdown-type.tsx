import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { BREAKDOWN_TYPES } from '@/constants/breakdownTypes';
import type { BreakdownType } from '@/lib/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CircleDot,
  Battery,
  Wrench,
  Truck,
  KeyRound,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ICON_MAP: Record<BreakdownType, typeof CircleDot> = {
  flat_tire: CircleDot,
  dead_battery: Battery,
  engine_failure: Wrench,
  towing: Truck,
  locked_out: KeyRound,
  other: HelpCircle,
};

const ICON_COLORS: Record<BreakdownType, string> = {
  flat_tire: Colors.primary,
  dead_battery: Colors.secondaryLight,
  engine_failure: Colors.accentDark,
  towing: Colors.success,
  locked_out: Colors.warning,
  other: Colors.textTertiary,
};

export default function BreakdownTypeScreen() {
  const insets = useSafeAreaInsets();

  const handleSelect = (type: BreakdownType) => {
    router.push(`/(driver)/phone-input?type=${type}`);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Type de panne</Text>
          <Text style={styles.subtitle}>
            Sélectionnez le type de problème rencontré
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {BREAKDOWN_TYPES.map((bt) => {
          const Icon = ICON_MAP[bt.key];
          const iconColor = ICON_COLORS[bt.key];
          return (
            <Pressable
              key={bt.key}
              style={styles.typeCard}
              onPress={() => handleSelect(bt.key)}
              accessibilityLabel={bt.label}
              accessibilityRole="button"
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: iconColor + '15' },
                ]}
              >
                <Icon size={32} color={iconColor} />
              </View>
              <Text style={styles.typeLabel}>{bt.label}</Text>
              <Text style={styles.typeDescription}>{bt.description}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeXl,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  grid: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 1,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeMd,
    color: Colors.text,
  },
  typeDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
