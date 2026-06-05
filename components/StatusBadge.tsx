import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '@/constants/theme';
import type { PanneStatut, InterventionStatut, PaiementStatut, OffreStatut } from '@/lib/types';

type AnyStatut = PanneStatut | InterventionStatut | PaiementStatut | OffreStatut | string;

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  // Panne
  ouverte:        { label: 'Ouverte',         bg: Colors.secondaryLight + '20', text: Colors.secondaryLight },
  offre_acceptee: { label: 'Offre acceptée',  bg: Colors.accentLight,           text: Colors.accentDark },
  en_cours:       { label: 'En cours',        bg: Colors.warning + '20',        text: Colors.accentDark },
  terminee:       { label: 'Terminée',        bg: Colors.successLight,          text: Colors.success },
  annulee:        { label: 'Annulée',         bg: Colors.errorLight,            text: Colors.error },
  // Intervention
  acceptee:       { label: 'Acceptée',        bg: Colors.successLight,          text: Colors.success },
  en_route:       { label: 'En route',        bg: Colors.accentLight,           text: Colors.accentDark },
  arrivee:        { label: 'Arrivé',          bg: Colors.warning + '20',        text: Colors.accentDark },
  // Offre
  pending:        { label: 'En attente',      bg: Colors.warningLight,          text: Colors.accentDark },
  accepted:       { label: 'Acceptée',        bg: Colors.successLight,          text: Colors.success },
  rejected:       { label: 'Refusée',         bg: Colors.errorLight,            text: Colors.error },
  expired:        { label: 'Expirée',         bg: Colors.surfaceDark,           text: Colors.textTertiary },
  // Paiement
  en_attente:     { label: 'En attente',      bg: Colors.warningLight,          text: Colors.accentDark },
  paye:           { label: 'Payé',            bg: Colors.successLight,          text: Colors.success },
  echec:          { label: 'Échec',           bg: Colors.errorLight,            text: Colors.error },
  rembourse:      { label: 'Remboursé',       bg: Colors.surfaceDark,           text: Colors.textTertiary },
  // Verification
  incomplete:     { label: 'Incomplet',       bg: Colors.surfaceDark,           text: Colors.textTertiary },
  approved:       { label: 'Approuvé',        bg: Colors.successLight,          text: Colors.success },
};

interface StatusBadgeProps {
  statut: AnyStatut;
  small?: boolean;
}

export function StatusBadge({ statut, small = false }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[statut] ?? {
    label: statut,
    bg: Colors.surfaceDark,
    text: Colors.textTertiary,
  };

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }, small && styles.badgeSmall]}>
      <Text style={[styles.text, { color: cfg.text }, small && styles.textSmall]}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  text: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeSm,
  },
  textSmall: {
    fontSize: Typography.fontSizeXs,
  },
});
