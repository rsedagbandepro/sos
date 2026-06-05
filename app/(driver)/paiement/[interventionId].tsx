import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleCheck as CheckCircle, CreditCard, Banknote, Smartphone } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useIntervention } from '@/hooks/useIntervention';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import type { PaiementMethode } from '@/lib/types';

const METHODES: { key: PaiementMethode; label: string; desc: string; icon: typeof CreditCard }[] = [
  { key: 'especes',      label: 'Espèces',       desc: 'Paiement en main propre',    icon: Banknote },
  { key: 'mobile_money', label: 'Mobile Money',  desc: 'MTN, Moov, Wave...',          icon: Smartphone },
  { key: 'carte',        label: 'Carte bancaire', desc: 'Visa, Mastercard',            icon: CreditCard },
];

export default function PaiementScreen() {
  const { interventionId } = useLocalSearchParams<{ interventionId: string }>();
  const insets = useSafeAreaInsets();
  const { intervention, loading } = useIntervention(interventionId ?? null);
  const [methode, setMethode] = useState<PaiementMethode>('especes');
  const [paying, setPaying] = useState(false);

  const handlePay = async () => {
    if (!intervention) return;
    setPaying(true);
    try {
      const { data: paiement, error } = await supabase
        .from('paiements')
        .insert({
          intervention_id: interventionId,
          driver_id: intervention.driver_id,
          montant: intervention.montant,
          methode,
          statut: 'paye',
          paid_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      if (intervention.panne_id) {
        await supabase.from('pannes').update({ statut: 'terminee' }).eq('id', intervention.panne_id);
      }
      router.replace(`/(driver)/evaluation/${interventionId}`);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de confirmer le paiement');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!intervention) {
    return <View style={styles.center}><Text style={styles.errorText}>Intervention introuvable</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={styles.topTitle}>Paiement</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Montant à payer</Text>
          <Text style={styles.amount}>{intervention.montant.toLocaleString('fr-FR')} FCFA</Text>
          <Text style={styles.amountSub}>
            Mécanicien : {intervention.mechanic?.business_name || 'Mécanicien'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mode de paiement</Text>
          {METHODES.map(m => {
            const Icon = m.icon;
            const selected = methode === m.key;
            return (
              <Pressable key={m.key}
                style={[styles.methodeCard, selected && styles.methodeCardSelected]}
                onPress={() => setMethode(m.key)}>
                <View style={[styles.methodeIcon, selected && styles.methodeIconSelected]}>
                  <Icon size={22} color={selected ? Colors.textInverse : Colors.textSecondary} />
                </View>
                <View style={styles.methodeInfo}>
                  <Text style={[styles.methodeLabel, selected && styles.methodeLabelSelected]}>{m.label}</Text>
                  <Text style={styles.methodeDesc}>{m.desc}</Text>
                </View>
                {selected && <CheckCircle size={20} color={Colors.primary} />}
              </Pressable>
            );
          })}
        </View>

        {methode === 'especes' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Remettez l'argent directement au mécanicien, puis confirmez le paiement ici.</Text>
          </View>
        )}

        <Pressable
          style={[styles.payBtn, paying && styles.payBtnDisabled]}
          onPress={handlePay}
          disabled={paying}>
          {paying ? <ActivityIndicator size="small" color={Colors.textInverse} /> : <CheckCircle size={20} color={Colors.textInverse} />}
          <Text style={styles.payBtnText}>{paying ? 'Confirmation...' : 'Confirmer le paiement'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  topTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXxl, color: Colors.text },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.xl },
  amountCard: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm,
  },
  amountLabel: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textInverse + 'cc' },
  amount: { fontFamily: 'Inter-Bold', fontSize: 40, color: Colors.textInverse },
  amountSub: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textInverse + 'cc' },
  section: { gap: Spacing.sm },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  methodeCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.lg,
    borderWidth: 2, borderColor: Colors.border,
  },
  methodeCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '06' },
  methodeIcon: {
    width: 44, height: 44, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceDark, alignItems: 'center', justifyContent: 'center',
  },
  methodeIconSelected: { backgroundColor: Colors.primary },
  methodeInfo: { flex: 1 },
  methodeLabel: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  methodeLabelSelected: { color: Colors.primary },
  methodeDesc: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary },
  infoBox: {
    backgroundColor: Colors.warningLight, padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.warning,
  },
  infoText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.text },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.success, paddingVertical: Spacing.md + 4, borderRadius: BorderRadius.lg,
    elevation: 3, shadowColor: Colors.success, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 6,
  },
  payBtnDisabled: { backgroundColor: Colors.disabled, shadowOpacity: 0, elevation: 0 },
  payBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.textInverse },
  errorText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.error },
});
