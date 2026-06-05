import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

const SPECIALISATIONS = [
  { key: 'battery',    label: 'Batterie' },
  { key: 'tire',       label: 'Pneus' },
  { key: 'engine',     label: 'Moteur' },
  { key: 'towing',     label: 'Remorquage' },
  { key: 'locks',      label: 'Serrurerie' },
  { key: 'electrical', label: 'Électricité' },
  { key: 'bodywork',   label: 'Carrosserie' },
  { key: 'aircon',     label: 'Climatisation' },
];

export default function OnboardingMetierScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [mechanicId, setMechanicId] = useState<string | null>(null);
  const [specs, setSpecs] = useState<string[]>([]);
  const [radius, setRadius] = useState('30');
  const [experience, setExperience] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('mechanics').select('id,specializations,intervention_radius_km,experience_years').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setMechanicId(data.id);
          setSpecs(data.specializations ?? []);
          setRadius(String(data.intervention_radius_km ?? 30));
          setExperience(String(data.experience_years ?? ''));
        }
      });
  }, [user]);

  const toggleSpec = (key: string) => {
    setSpecs(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);
  };

  const handleSubmit = async () => {
    if (specs.length === 0) { setError('Sélectionnez au moins une spécialité'); return; }
    if (!mechanicId) return;
    setSaving(true);
    setError(null);
    try {
      await supabase.from('mechanics').update({
        specializations: specs,
        intervention_radius_km: parseInt(radius) || 30,
        experience_years: parseInt(experience) || 0,
        onboarding_step: 3,
        verification_status: 'pending',
      }).eq('id', mechanicId);
      router.push('/(mechanic)/onboarding/recap');
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.step}>Étape 3 / 3</Text>
          <Text style={styles.title}>Votre métier</Text>
          <Text style={styles.subtitle}>Spécialités et zone d'intervention</Text>
        </View>
      </View>
      <View style={styles.progress}><View style={[styles.progressBar, { width: '100%' }]} /></View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Spécialités <Text style={styles.required}>*</Text></Text>
          <View style={styles.chipsGrid}>
            {SPECIALISATIONS.map(s => {
              const selected = specs.includes(s.key);
              return (
                <Pressable key={s.key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggleSpec(s.key)}>
                  {selected && <Check size={14} color={Colors.textInverse} />}
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Rayon d'intervention (km)</Text>
          <View style={styles.inputRow}>
            <TextInput style={styles.input} value={radius} onChangeText={setRadius}
              keyboardType="number-pad" placeholder="30" placeholderTextColor={Colors.textTertiary} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Années d'expérience</Text>
          <View style={styles.inputRow}>
            <TextInput style={styles.input} value={experience} onChangeText={setExperience}
              keyboardType="number-pad" placeholder="5" placeholderTextColor={Colors.textTertiary} />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable style={[styles.nextBtn, (specs.length === 0 || saving) && styles.nextBtnDisabled]}
          onPress={handleSubmit} disabled={specs.length === 0 || saving}>
          {saving && <ActivityIndicator size="small" color={Colors.textInverse} />}
          <Text style={styles.nextBtnText}>{saving ? 'Envoi...' : 'Soumettre le dossier'}</Text>
          <ArrowRight size={20} color={Colors.textInverse} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  backBtn: { padding: Spacing.sm, marginTop: Spacing.xs },
  step: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary },
  title: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXxl, color: Colors.text },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.textSecondary },
  progress: { height: 4, backgroundColor: Colors.border, marginHorizontal: Spacing.lg, borderRadius: 2 },
  progressBar: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl, gap: Spacing.xl },
  errorBox: { backgroundColor: Colors.errorLight, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.error },
  errorText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.error },
  section: { gap: Spacing.sm },
  sectionLabel: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  required: { color: Colors.error },
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.text },
  chipTextSelected: { fontFamily: 'Inter-Bold', color: Colors.textInverse },
  inputRow: {
    backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border,
  },
  input: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.text },
  footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, paddingVertical: Spacing.md + 4, borderRadius: BorderRadius.lg,
  },
  nextBtnDisabled: { backgroundColor: Colors.disabled },
  nextBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.textInverse },
});
