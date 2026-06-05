import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, Circle as XCircle, CircleCheck as CheckCircle, Wrench } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import type { Mechanic } from '@/lib/types';

export default function OnboardingIndexScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [mechanic, setMechanic] = useState<Mechanic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from('mechanics')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setMechanic(data as Mechanic | null);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  const vs = mechanic?.verification_status;

  if (vs === 'approved') {
    router.replace('/(mechanic)/dashboard');
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
      <View style={styles.iconWrap}>
        <Wrench size={48} color={Colors.primary} />
      </View>
      <Text style={styles.title}>Espace Mécanicien</Text>

      {vs === 'pending' && (
        <View style={styles.statusCard}>
          <Clock size={32} color={Colors.warning} />
          <Text style={styles.statusTitle}>Dossier en cours de validation</Text>
          <Text style={styles.statusDesc}>
            Notre équipe examine votre dossier. Vous serez notifié dès la validation (généralement sous 24h).
          </Text>
        </View>
      )}

      {vs === 'rejected' && mechanic && (
        <View style={[styles.statusCard, styles.statusCardError]}>
          <XCircle size={32} color={Colors.error} />
          <Text style={[styles.statusTitle, { color: Colors.error }]}>Dossier refusé</Text>
          {mechanic.rejection_reason && (
            <Text style={styles.statusDesc}>Motif : {mechanic.rejection_reason}</Text>
          )}
          <Pressable style={styles.restartBtn} onPress={() => router.push('/(mechanic)/onboarding/identite')}>
            <Text style={styles.restartBtnText}>Recommencer l'inscription</Text>
          </Pressable>
        </View>
      )}

      {(!vs || vs === 'incomplete') && (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Complétez votre profil</Text>
          <Text style={styles.statusDesc}>
            Pour recevoir des demandes de pannes, vous devez compléter votre profil et soumettre vos documents.
          </Text>
          <Pressable
            style={styles.startBtn}
            onPress={() => router.push('/(mechanic)/onboarding/identite')}>
            <Text style={styles.startBtnText}>Commencer l'inscription</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.lg, gap: Spacing.xl, alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXxl, color: Colors.text },
  statusCard: {
    width: '100%', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: Spacing.md,
  },
  statusCardError: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  statusTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text, textAlign: 'center' },
  statusDesc: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  startBtn: {
    backgroundColor: Colors.primary, paddingVertical: Spacing.md + 4, paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg, marginTop: Spacing.sm,
  },
  startBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.textInverse },
  restartBtn: {
    backgroundColor: Colors.error, paddingVertical: Spacing.md + 4, paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg, marginTop: Spacing.sm,
  },
  restartBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.textInverse },
});
