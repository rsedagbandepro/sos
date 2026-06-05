import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, MapPin, CircleDot, Battery, Wrench, Truck, KeyRound,
  Circle as HelpCircle, Send, Phone,
} from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useConnectivity } from '@/hooks/useConnectivity';
import { getCurrentPosition } from '@/lib/location';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import type { PanneCategorie } from '@/lib/types';

const CATEGORIES: { key: PanneCategorie; label: string; desc: string; icon: typeof Wrench; color: string }[] = [
  { key: 'flat_tire',     label: 'Crevaison',       desc: 'Pneu crevé',          icon: CircleDot,  color: Colors.primary },
  { key: 'dead_battery',  label: 'Batterie à plat',  desc: 'Batterie vide',       icon: Battery,    color: Colors.secondaryLight },
  { key: 'engine_failure', label: 'Panne moteur',   desc: 'Problème moteur',      icon: Wrench,     color: Colors.accentDark },
  { key: 'towing',        label: 'Remorquage',      desc: 'Besoin de remorquage', icon: Truck,      color: Colors.success },
  { key: 'locked_out',    label: 'Clés perdues',    desc: 'Lockout',              icon: KeyRound,   color: Colors.warning },
  { key: 'other',         label: 'Autre',           desc: 'Autre problème',       icon: HelpCircle, color: Colors.textTertiary },
];

export default function NouvellePanneScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isOnline } = useConnectivity();
  const [categorie, setCategorie] = useState<PanneCategorie | null>(null);
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [locating, setLocating] = useState(true);
  const [coords, setCoords] = useState({ latitude: 6.3654, longitude: 2.4183 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGuest = !user;

  useEffect(() => {
    getCurrentPosition()
      .then(pos => {
        setCoords(pos);
      })
      .catch(err => {
        console.warn('Failed to get position:', err);
      })
      .finally(() => {
        setLocating(false);
      });
  }, []);

  const canSubmit = !!categorie && !locating && (!isGuest || phone.trim().length >= 8);

  const handleSubmit = async () => {
    if (!categorie) { setError('Sélectionnez un type de panne'); return; }
    if (isGuest && phone.trim().length < 8) { setError('Entrez votre numéro de téléphone'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        categorie,
        description: description.trim() || null,
        statut: 'ouverte',
      };

      if (isGuest) {
        payload.driver_id = null;
        payload.driver_phone = phone.trim();
      } else {
        payload.driver_id = user!.id;
      }

      const { data, error: err } = await supabase
        .from('pannes')
        .insert(payload)
        .select()
        .single();

      if (err) throw err;
      router.replace(`/(driver)/attente/${data.id}`);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'envoi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Signaler une panne</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Type de panne <Text style={styles.required}>*</Text></Text>
          <View style={styles.grid}>
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const selected = categorie === cat.key;
              return (
                <Pressable key={cat.key}
                  style={[styles.catCard, selected && { borderColor: cat.color, backgroundColor: cat.color + '12' }]}
                  onPress={() => setCategorie(cat.key)}>
                  <View style={[styles.catIcon, { backgroundColor: cat.color + '18' }]}>
                    <Icon size={24} color={cat.color} />
                  </View>
                  <Text style={[styles.catLabel, selected && { color: cat.color }]}>{cat.label}</Text>
                  <Text style={styles.catDesc}>{cat.desc}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Position GPS</Text>
          <View style={styles.locationCard}>
            {locating ? (
              <><ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.locatingText}>Localisation...</Text></>
            ) : (
              <><MapPin size={18} color={Colors.success} />
              <Text style={styles.coordsText}>{coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</Text></>
            )}
          </View>
        </View>

        {isGuest && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Téléphone <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputRow}>
              <Phone size={18} color={Colors.textTertiary} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+229 97 00 00 00"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </View>
            <Text style={styles.guestHint}>
              Votre numéro permet au mécanicien de vous contacter. <Text style={styles.loginLink} onPress={() => router.push('/(auth)/login')}>Créer un compte</Text>
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description (optionnel)</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Décrivez votre situation..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}>
          {submitting ? <ActivityIndicator size="small" color={Colors.textInverse} /> : <Send size={20} color={Colors.textInverse} />}
          <Text style={styles.submitBtnText}>{submitting ? 'Envoi...' : 'Envoyer le SOS'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  backBtn: { padding: Spacing.sm },
  topTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.xl },
  errorBox: { backgroundColor: Colors.errorLight, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.error },
  errorText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.error },
  section: { gap: Spacing.sm },
  sectionLabel: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  required: { color: Colors.error },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catCard: {
    width: '47%', padding: Spacing.md, borderRadius: BorderRadius.lg,
    borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.surface, gap: Spacing.xs,
  },
  catIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.text },
  catDesc: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary },
  locationCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  locatingText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  coordsText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.text, flex: 1 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border,
  },
  input: { flex: 1, fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.text },
  guestHint: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary, lineHeight: 18 },
  loginLink: { fontFamily: 'Inter-Bold', color: Colors.primary },
  textArea: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, padding: Spacing.md, minHeight: 100,
    fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.text,
  },
  footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, paddingVertical: Spacing.md + 4, borderRadius: BorderRadius.lg,
    elevation: 3, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 6,
  },
  submitBtnDisabled: { backgroundColor: Colors.disabled, shadowOpacity: 0, elevation: 0 },
  submitBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.textInverse },
});
