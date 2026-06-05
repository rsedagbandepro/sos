import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Clock, Send, Star, Wrench, Battery, Truck, KeyRound, CircleDot } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useSinglePanne } from '@/hooks/usePannes';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/StatusBadge';
import { useState, useEffect } from 'react';
import type { Mechanic, PanneCategorie } from '@/lib/types';

const CATEGORIE_ICONS: Record<PanneCategorie, typeof Wrench> = {
  flat_tire: CircleDot,
  dead_battery: Battery,
  engine_failure: Wrench,
  towing: Truck,
  locked_out: KeyRound,
  other: Wrench,
};

const CATEGORIE_LABELS: Record<PanneCategorie, string> = {
  flat_tire: 'Crevaison',
  dead_battery: 'Batterie à plat',
  engine_failure: 'Panne moteur',
  towing: 'Remorquage',
  locked_out: 'Clés perdues',
  other: 'Autre',
};

export default function MechanicPanneDetailScreen() {
  const { panneId } = useLocalSearchParams<{ panneId: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { panne, loading } = useSinglePanne(panneId ?? null);
  const [mechanic, setMechanic] = useState<Mechanic | null>(null);
  const [alreadyOffered, setAlreadyOffered] = useState(false);
  const [prix, setPrix] = useState('');
  const [eta, setEta] = useState('20');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('mechanics').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) {
          router.replace('/(mechanic)/onboarding');
          return;
        }
        setMechanic(data as Mechanic);
      });
  }, [user]);

  useEffect(() => {
    if (!mechanic || !panneId) return;
    supabase.from('offres').select('id').eq('panne_id', panneId).eq('mechanic_id', mechanic.id).maybeSingle()
      .then(({ data }) => { if (data) setAlreadyOffered(true); });
  }, [mechanic, panneId]);

  const handleSubmit = async () => {
    if (!mechanic || !panneId) return;
    if (!prix || isNaN(parseFloat(prix))) { setError('Entrez un prix valide'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('offres').insert({
        panne_id: panneId,
        mechanic_id: mechanic.id,
        prix: parseFloat(prix),
        eta_minutes: parseInt(eta) || 20,
        message: message.trim() || null,
        statut: 'pending',
      });
      if (err) throw err;
      setSuccess(true);
      setAlreadyOffered(true);
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!panne) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Panne introuvable</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const Icon = CATEGORIE_ICONS[panne.categorie] ?? Wrench;
  const label = CATEGORIE_LABELS[panne.categorie] ?? panne.categorie;
  const isOpen = panne.statut === 'ouverte';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Détail de la panne</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.iconWrap}>
              <Icon size={28} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.categLabel}>{label}</Text>
              <View style={styles.metaRow}>
                <Clock size={12} color={Colors.textTertiary} />
                <Text style={styles.metaText}>
                  {new Date(panne.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
            <StatusBadge statut={panne.statut} />
          </View>

          {panne.description && (
            <Text style={styles.description}>{panne.description}</Text>
          )}

          <View style={styles.locationRow}>
            <MapPin size={16} color={Colors.primary} />
            <Text style={styles.locationText}>
              {panne.latitude.toFixed(4)}, {panne.longitude.toFixed(4)}
            </Text>
            {panne.distance_km !== undefined && (
              <Text style={styles.distanceBadge}>{panne.distance_km.toFixed(1)} km</Text>
            )}
          </View>
        </View>

        {!isOpen && (
          <View style={styles.closedBanner}>
            <Text style={styles.closedText}>Cette panne n'est plus disponible ({panne.statut}).</Text>
          </View>
        )}

        {isOpen && alreadyOffered && !success && (
          <View style={styles.successBanner}>
            <Star size={18} color={Colors.warning} fill={Colors.warning} />
            <Text style={styles.successText}>Votre offre a été soumise. En attente de réponse du client.</Text>
          </View>
        )}

        {success && (
          <View style={styles.successBanner}>
            <Star size={18} color={Colors.warning} fill={Colors.warning} />
            <Text style={styles.successText}>Offre envoyée avec succès ! En attente de réponse.</Text>
          </View>
        )}

        {isOpen && !alreadyOffered && (
          <View style={styles.offerCard}>
            <Text style={styles.offerTitle}>Proposer une offre</Text>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Prix (FCFA) <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={prix}
                onChangeText={setPrix}
                placeholder="5000"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Délai d'arrivée (minutes)</Text>
              <TextInput
                style={styles.input}
                value={eta}
                onChangeText={setEta}
                placeholder="20"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Message au client (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Ex: Je suis équipé pour ce type de panne..."
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>

            <Pressable
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color={Colors.textInverse} />
                : <Send size={18} color={Colors.textInverse} />
              }
              <Text style={styles.submitBtnText}>{submitting ? 'Envoi...' : 'Envoyer l\'offre'}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.background },
  notFound: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.textSecondary },
  backLink: { padding: Spacing.sm },
  backLinkText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.primary },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  backBtn: { padding: Spacing.sm },
  topTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXl, color: Colors.text },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  infoCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  iconWrap: {
    width: 52, height: 52, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  categLabel: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 2 },
  metaText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary },
  description: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.textSecondary, lineHeight: 22 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  locationText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  distanceBadge: {
    fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXs, color: Colors.primary,
    backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full,
  },
  closedBanner: {
    backgroundColor: Colors.surfaceDark, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  closedText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary, textAlign: 'center' },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.warningLight, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.warning,
  },
  successText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.text },
  offerCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.lg,
  },
  offerTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  errorBox: {
    backgroundColor: Colors.errorLight, padding: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.error,
  },
  errorText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.error },
  fieldGroup: { gap: Spacing.sm },
  fieldLabel: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.text },
  required: { color: Colors.error },
  input: {
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.text,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, paddingVertical: Spacing.md + 4, borderRadius: BorderRadius.lg,
  },
  submitBtnDisabled: { backgroundColor: Colors.disabled },
  submitBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.textInverse },
});
