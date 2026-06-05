import {
  View, Text, Pressable, StyleSheet, ScrollView, TextInput,
  ActivityIndicator, Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CircleCheck as CheckCircle, Circle as XCircle, ExternalLink, FileText, Award, Hop as Home, Star } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/Avatar';
import { useState, useEffect } from 'react';
import type { Mechanic, MechanicDocument, DocType } from '@/lib/types';

const DOC_ICONS: Record<DocType, typeof FileText> = {
  identity: FileText,
  certification: Award,
  address_proof: Home,
};

const DOC_LABELS: Record<DocType, string> = {
  identity: "Piece d'identite",
  certification: 'Certification professionnelle',
  address_proof: "Justificatif d'adresse",
};

const SPECIALISATIONS_LABELS: Record<string, string> = {
  battery: 'Batterie', tire: 'Pneus', engine: 'Moteur', towing: 'Remorquage',
  locks: 'Serrurerie', electrical: 'Electricite', bodywork: 'Carrosserie', aircon: 'Climatisation',
};

export default function AdminDossierDetailScreen() {
  const { mechanicId } = useLocalSearchParams<{ mechanicId: string }>();
  const insets = useSafeAreaInsets();
  const [mechanic, setMechanic] = useState<Mechanic | null>(null);
  const [documents, setDocuments] = useState<MechanicDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mechanicId) return;
    Promise.all([
      supabase.from('mechanics').select('*').eq('id', mechanicId).maybeSingle(),
      supabase.from('mechanic_documents').select('*').eq('mechanic_id', mechanicId),
    ]).then(([mechRes, docsRes]) => {
      if (mechRes.data) setMechanic(mechRes.data as Mechanic);
      setDocuments((docsRes.data as MechanicDocument[]) || []);
      setLoading(false);
    });
  }, [mechanicId]);

  const handleApprove = async () => {
    if (!mechanic) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('mechanics').update({
        verification_status: 'approved',
        rejection_reason: null,
      }).eq('id', mechanic.id);
      if (err) throw err;
      setMechanic(prev => prev ? { ...prev, verification_status: 'approved' } : prev);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!mechanic || !rejectionReason.trim()) {
      setError('Veuillez indiquer une raison de rejet');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('mechanics').update({
        verification_status: 'rejected',
        rejection_reason: rejectionReason.trim(),
      }).eq('id', mechanic.id);
      if (err) throw err;
      setMechanic(prev => prev ? { ...prev, verification_status: 'rejected', rejection_reason: rejectionReason.trim() } : prev);
      setShowRejectForm(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!mechanic) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Dossier introuvable</Text>
        <Pressable onPress={() => router.back()}><Text style={styles.backLink}>Retour</Text></Pressable>
      </View>
    );
  }

  const isPending = mechanic.verification_status === 'pending';

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Dossier</Text>
        <StatusBadge statut={mechanic.verification_status} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <Avatar name={mechanic.business_name ?? '?'} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{mechanic.business_name || 'Sans nom'}</Text>
            <Text style={styles.phone}>{mechanic.phone}</Text>
            <View style={styles.metaRow}>
              <Star size={12} color={Colors.warning} fill={Colors.warning} />
              <Text style={styles.metaText}>{mechanic.rating_avg?.toFixed(1) ?? '—'} ({mechanic.rating_count ?? 0})</Text>
              <Text style={styles.metaText}>{mechanic.experience_years ?? 0} ans exp.</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specialites</Text>
          <View style={styles.chips}>
            {(mechanic.specializations ?? []).map(s => (
              <View key={s} style={styles.chip}>
                <Text style={styles.chipText}>{SPECIALISATIONS_LABELS[s] ?? s}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.metaText}>Rayon: {mechanic.intervention_radius_km ?? 30} km</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents ({documents.length}/3)</Text>
          {documents.map(doc => {
            const Icon = DOC_ICONS[doc.type_doc] ?? FileText;
            return (
              <View key={doc.id} style={styles.docRow}>
                <Icon size={20} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.docLabel}>{DOC_LABELS[doc.type_doc] ?? doc.type_doc}</Text>
                  <StatusBadge statut={doc.statut} small />
                </View>
                <Pressable onPress={() => Linking.openURL(doc.file_url)} style={styles.linkBtn}>
                  <ExternalLink size={18} color={Colors.primary} />
                </Pressable>
              </View>
            );
          })}
          {documents.length === 0 && (
            <Text style={styles.noDoc}>Aucun document soumis</Text>
          )}
        </View>

        {mechanic.verification_status === 'rejected' && mechanic.rejection_reason && (
          <View style={styles.rejectedBox}>
            <Text style={styles.rejectedLabel}>Raison du rejet</Text>
            <Text style={styles.rejectedReason}>{mechanic.rejection_reason}</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {isPending && (
          <View style={styles.actions}>
            <Pressable
              style={[styles.approveBtn, submitting && styles.btnDisabled]}
              onPress={handleApprove}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator size="small" color={Colors.textInverse} /> : <CheckCircle size={18} color={Colors.textInverse} />}
              <Text style={styles.approveBtnText}>Approuver</Text>
            </Pressable>
            <Pressable
              style={[styles.rejectToggleBtn, submitting && styles.btnDisabled]}
              onPress={() => setShowRejectForm(!showRejectForm)}
              disabled={submitting}
            >
              <XCircle size={18} color={Colors.error} />
              <Text style={styles.rejectToggleText}>Rejeter</Text>
            </Pressable>
          </View>
        )}

        {mechanic.verification_status !== 'pending' && (
          <View style={styles.actions}>
            <Pressable
              style={[styles.approveBtn, submitting && styles.btnDisabled]}
              onPress={handleApprove}
              disabled={submitting || mechanic.verification_status === 'approved'}
            >
              <CheckCircle size={18} color={Colors.textInverse} />
              <Text style={styles.approveBtnText}>
                {mechanic.verification_status === 'approved' ? 'Deja approuve' : 'Re-approuver'}
              </Text>
            </Pressable>
          </View>
        )}

        {showRejectForm && (
          <View style={styles.rejectForm}>
            <Text style={styles.rejectFormTitle}>Raison du rejet</Text>
            <TextInput
              style={styles.rejectInput}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Ex: Documents illisibles, informations incorrectes..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={3}
            />
            <Pressable
              style={[styles.rejectConfirmBtn, submitting && styles.btnDisabled]}
              onPress={handleReject}
              disabled={submitting || !rejectionReason.trim()}
            >
              {submitting ? <ActivityIndicator size="small" color={Colors.textInverse} /> : null}
              <Text style={styles.rejectConfirmText}>Confirmer le rejet</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.background },
  notFound: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.textSecondary },
  backLink: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.primary },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  backBtn: { padding: Spacing.sm },
  title: { flex: 1, fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXxl, color: Colors.text },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
  },
  name: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  phone: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  metaText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary },
  section: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.full,
  },
  chipText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.primary },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  docLabel: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.text, marginBottom: 2 },
  linkBtn: { padding: Spacing.sm },
  noDoc: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textTertiary },
  rejectedBox: {
    backgroundColor: Colors.errorLight, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.error, gap: Spacing.xs,
  },
  rejectedLabel: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.error },
  rejectedReason: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.text },
  errorBox: {
    backgroundColor: Colors.errorLight, padding: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.error,
  },
  errorText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.error },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.success, paddingVertical: Spacing.md + 4, borderRadius: BorderRadius.lg,
  },
  approveBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.textInverse },
  rejectToggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.errorLight, paddingVertical: Spacing.md + 4, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.error,
  },
  rejectToggleText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.error },
  btnDisabled: { opacity: 0.5 },
  rejectForm: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.error, gap: Spacing.md,
  },
  rejectFormTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  rejectInput: {
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, padding: Spacing.md, minHeight: 80, textAlignVertical: 'top',
    fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.text,
  },
  rejectConfirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.error, paddingVertical: Spacing.md + 4, borderRadius: BorderRadius.lg,
  },
  rejectConfirmText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.textInverse },
});
