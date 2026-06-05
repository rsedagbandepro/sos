import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Clock, Star, CircleCheck as CheckCircle } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { Avatar } from '@/components/Avatar';
import type { Offre } from '@/lib/types';

interface OffreCardProps {
  offre: Offre;
  onAccept?: () => void;
  onReject?: () => void;
  readonly?: boolean;
}

export function OffreCard({ offre, onAccept, onReject, readonly = false }: OffreCardProps) {
  const mec = offre.mechanic;
  const isAccepted = offre.statut === 'accepted';
  const isRejected = offre.statut === 'rejected';

  return (
    <View style={[styles.card, isAccepted && styles.cardAccepted, isRejected && styles.cardRejected]}>
      <View style={styles.header}>
        <Avatar uri={mec?.avatar_url} name={mec?.business_name} size={44} />
        <View style={styles.info}>
          <Text style={styles.mechName}>{mec?.business_name || 'Mécanicien'}</Text>
          {mec && (
            <View style={styles.rating}>
              <Star size={13} color={Colors.accent} fill={Colors.accent} />
              <Text style={styles.ratingText}>{mec.rating_avg.toFixed(1)} ({mec.rating_count})</Text>
            </View>
          )}
        </View>
        <View style={styles.priceBlock}>
          <Text style={styles.price}>{offre.prix.toLocaleString('fr-FR')} FCFA</Text>
          <View style={styles.etaRow}>
            <Clock size={12} color={Colors.textTertiary} />
            <Text style={styles.eta}>~{offre.eta_minutes} min</Text>
          </View>
        </View>
      </View>

      {offre.message ? <Text style={styles.message}>{offre.message}</Text> : null}

      {!readonly && offre.statut === 'pending' && (
        <View style={styles.actions}>
          <Pressable style={[styles.btn, styles.btnReject]} onPress={onReject}>
            <Text style={styles.btnRejectText}>Refuser</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnAccept]} onPress={onAccept}>
            <CheckCircle size={16} color={Colors.textInverse} />
            <Text style={styles.btnAcceptText}>Accepter</Text>
          </Pressable>
        </View>
      )}

      {isAccepted && (
        <View style={styles.acceptedBadge}>
          <CheckCircle size={14} color={Colors.success} />
          <Text style={styles.acceptedText}>Offre acceptée</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cardAccepted: { borderColor: Colors.success },
  cardRejected: { opacity: 0.5 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  info: { flex: 1, gap: 2 },
  mechName: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textSecondary },
  priceBlock: { alignItems: 'flex-end', gap: 2 },
  price: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.primary },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  eta: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary },
  message: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  btn: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.xs,
  },
  btnReject: { backgroundColor: Colors.surfaceDark, borderWidth: 1, borderColor: Colors.border },
  btnAccept: { backgroundColor: Colors.success },
  btnRejectText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  btnAcceptText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.textInverse },
  acceptedBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, justifyContent: 'center' },
  acceptedText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.success },
});
