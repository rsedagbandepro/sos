import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, ArrowLeft, Upload, CircleCheck as CheckCircle, FileText, Award, Hop as Home } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import type { DocType } from '@/lib/types';

const DOCS: { key: DocType; label: string; desc: string; icon: typeof FileText }[] = [
  { key: 'identity',      label: "Pièce d'identité",            desc: 'CNI, passeport, permis de conduire', icon: FileText },
  { key: 'certification', label: 'Certification professionnelle', desc: 'Diplôme ou certificat de compétence',  icon: Award },
  { key: 'address_proof', label: "Justificatif d'adresse",      desc: 'Facture, quittance de loyer',         icon: Home },
];

export default function OnboardingDocumentsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [mechanicId, setMechanicId] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<DocType, string>>({ identity: '', certification: '', address_proof: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('mechanics').select('id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setMechanicId(data.id); });
  }, [user]);

  const allFilled = DOCS.every(d => urls[d.key].trim().length > 3);

  const handleNext = async () => {
    if (!mechanicId || !allFilled) return;
    setSaving(true);
    setError(null);
    try {
      for (const doc of DOCS) {
        await supabase.from('mechanic_documents').upsert({
          mechanic_id: mechanicId,
          type_doc: doc.key,
          file_url: urls[doc.key],
          statut: 'pending',
        }, { onConflict: 'mechanic_id,type_doc' });
      }
      await supabase.from('mechanics').update({ onboarding_step: 2 }).eq('id', mechanicId);
      router.push('/(mechanic)/onboarding/metier');
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
          <Text style={styles.step}>Étape 2 / 3</Text>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>3 documents obligatoires</Text>
        </View>
      </View>
      <View style={styles.progress}><View style={[styles.progressBar, { width: '66%' }]} /></View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

        <View style={styles.notice}>
          <Text style={styles.noticeText}>Entrez l'URL publique de chaque document (ex: lien Google Drive, Dropbox...)</Text>
        </View>

        {DOCS.map(doc => {
          const Icon = doc.icon;
          const filled = urls[doc.key].trim().length > 3;
          return (
            <View key={doc.key} style={styles.docCard}>
              <View style={styles.docHeader}>
                <View style={[styles.docIcon, filled && styles.docIconDone]}>
                  {filled ? <CheckCircle size={20} color={Colors.textInverse} /> : <Icon size={20} color={Colors.textSecondary} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docLabel}>{doc.label}</Text>
                  <Text style={styles.docDesc}>{doc.desc}</Text>
                </View>
              </View>
              <TextInput
                style={styles.urlInput}
                value={urls[doc.key]}
                onChangeText={v => setUrls(prev => ({ ...prev, [doc.key]: v }))}
                placeholder="https://drive.google.com/..."
                placeholderTextColor={Colors.textTertiary}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable style={[styles.nextBtn, (!allFilled || saving) && styles.nextBtnDisabled]}
          onPress={handleNext} disabled={!allFilled || saving}>
          {saving ? <ActivityIndicator size="small" color={Colors.textInverse} /> : null}
          <Text style={styles.nextBtnText}>{saving ? 'Sauvegarde...' : 'Suivant'}</Text>
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
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  errorBox: { backgroundColor: Colors.errorLight, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.error },
  errorText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.error },
  notice: { backgroundColor: Colors.warningLight, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.warning },
  noticeText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.text },
  docCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
  docHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  docIcon: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceDark, alignItems: 'center', justifyContent: 'center',
  },
  docIconDone: { backgroundColor: Colors.success },
  docLabel: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.text },
  docDesc: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary },
  urlInput: {
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: Spacing.md,
    fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.text,
  },
  footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, paddingVertical: Spacing.md + 4, borderRadius: BorderRadius.lg,
  },
  nextBtnDisabled: { backgroundColor: Colors.disabled },
  nextBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.textInverse },
});
