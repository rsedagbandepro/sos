import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MapPin, Clock, CircleDot, Battery, Wrench, Truck, KeyRound, Circle as HelpCircle } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { StatusBadge } from '@/components/StatusBadge';
import type { Panne, PanneCategorie } from '@/lib/types';

const CATEGORIE_LABELS: Record<PanneCategorie, string> = {
  flat_tire: 'Crevaison',
  dead_battery: 'Batterie à plat',
  engine_failure: 'Panne moteur',
  towing: 'Remorquage',
  locked_out: 'Clés perdues',
  other: 'Autre',
};

const CATEGORIE_ICONS: Record<PanneCategorie, typeof Wrench> = {
  flat_tire: CircleDot,
  dead_battery: Battery,
  engine_failure: Wrench,
  towing: Truck,
  locked_out: KeyRound,
  other: HelpCircle,
};

const CATEGORIE_COLORS: Record<PanneCategorie, string> = {
  flat_tire: Colors.primary,
  dead_battery: Colors.secondaryLight,
  engine_failure: Colors.accentDark,
  towing: Colors.success,
  locked_out: Colors.warning,
  other: Colors.textTertiary,
};

interface PanneCardProps {
  panne: Panne;
  onPress?: () => void;
  showDistance?: boolean;
}

export function PanneCard({ panne, onPress, showDistance = false }: PanneCardProps) {
  const Icon = CATEGORIE_ICONS[panne.categorie] ?? HelpCircle;
  const color = CATEGORIE_COLORS[panne.categorie] ?? Colors.textTertiary;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: color + '18' }]}>
          <Icon size={22} color={color} />
        </View>
        <View style={styles.info}>
          <Text style={styles.label}>{CATEGORIE_LABELS[panne.categorie]}</Text>
          <View style={styles.meta}>
            <Clock size={12} color={Colors.textTertiary} />
            <Text style={styles.metaText}>
              {new Date(panne.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {showDistance && panne.distance_km !== undefined && (
              <>
                <MapPin size={12} color={Colors.textTertiary} />
                <Text style={styles.metaText}>{panne.distance_km.toFixed(1)} km</Text>
              </>
            )}
          </View>
        </View>
        <StatusBadge statut={panne.statut} small />
      </View>
      {panne.description ? (
        <Text style={styles.description} numberOfLines={2}>{panne.description}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
    elevation: 1,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  label: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeMd,
    color: Colors.text,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeXs,
    color: Colors.textTertiary,
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSizeSm * 1.5,
  },
});
