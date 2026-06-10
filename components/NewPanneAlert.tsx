import { View, Text, Pressable, StyleSheet, Modal, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { MapPin, Clock, Wrench, X, ChevronRight } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import type { PanneCategorie } from '@/lib/types';

const CATEGORIE_LABELS: Record<PanneCategorie, string> = {
  flat_tire: 'Crevaison',
  dead_battery: 'Batterie à plat',
  engine_failure: 'Panne moteur',
  towing: 'Remorquage',
  locked_out: 'Clés perdues',
  other: 'Autre',
};

const CATEGORIE_COLORS: Record<PanneCategorie, string> = {
  flat_tire: Colors.primary,
  dead_battery: Colors.secondaryLight,
  engine_failure: Colors.accentDark,
  towing: Colors.success,
  locked_out: Colors.warning,
  other: Colors.textTertiary,
};

interface NewPanneAlertProps {
  visible: boolean;
  panneId: string;
  distanceKm: number;
  categorie: PanneCategorie;
  onDismiss: () => void;
  onViewDetails: () => void;
}

export function NewPanneAlert({
  visible,
  panneId,
  distanceKm,
  categorie,
  onDismiss,
  onViewDetails,
}: NewPanneAlertProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  if (!visible) return null;

  const label = CATEGORIE_LABELS[categorie] || 'Panne';
  const color = CATEGORIE_COLORS[categorie] || Colors.primary;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}>
          <Pressable style={styles.closeBtn} onPress={onDismiss}>
            <X size={20} color={Colors.textSecondary} />
          </Pressable>

          <View style={[styles.iconContainer, { backgroundColor: color + '18' }]}>
            <Wrench size={32} color={color} />
          </View>

          <Text style={styles.title}>Nouvelle panne!</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Wrench size={18} color={Colors.textSecondary} />
              <Text style={styles.infoLabel}>{label}</Text>
            </View>
            <View style={styles.infoItem}>
              <MapPin size={18} color={Colors.textSecondary} />
              <Text style={styles.infoLabel}>{distanceKm.toFixed(1)} km</Text>
            </View>
          </View>

          <Text style={styles.urgentText}>Intervention urgence requise</Text>

          <Pressable style={[styles.actionBtn, { backgroundColor: color }]} onPress={onViewDetails}>
            <Text style={styles.actionBtnText}>Voir details</Text>
            <ChevronRight size={18} color={Colors.textInverse} />
          </Pressable>

          <Pressable style={styles.laterBtn} onPress={onDismiss}>
            <Text style={styles.laterBtnText}>Plus tard</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.xs,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeXl,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.textSecondary,
  },
  urgentText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeXs,
    color: Colors.error,
    marginBottom: Spacing.lg,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    width: '100%',
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  actionBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeMd,
    color: Colors.textInverse,
  },
  laterBtn: {
    paddingVertical: Spacing.sm,
  },
  laterBtnText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.textTertiary,
  },
});
