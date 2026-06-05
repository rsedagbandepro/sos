import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleCheck as CheckCircle, Star } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { StarRating } from '@/components/StarRating';
import { Avatar } from '@/components/Avatar';
import { useIntervention } from '@/hooks/useIntervention';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function EvaluationScreen() {
  const { interventionId } = useLocalSearchParams<{ interventionId: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { intervention, loading } = useIntervention(interventionId ?? null);
  const [score, setScore] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!intervention || !user || score === 0) return;
    setSubmitting(true);
    try {
      await supabase.from('reviews').insert({
        intervention_id: interventionId,
        reviewer_id: user.id,
        mechanic_id: intervention.mechanic_id,
        score,
        commentaire: commentaire || null,
      });
      setDone(true);
    } catch {
      // Non-critical
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  const mec = intervention?.mechanic;

  if (done) {
    return (
      <View style={[styles.container, styles.center]}>
        <CheckCircle size={72} color={Colors.success} />
        <Text style={styles.doneTitle}>Merci pour votre évaluation !</Text>
        <Text style={styles.doneText}>Votre avis aide les autres conducteurs à choisir.</Text>
        <Pressable style={styles.homeBtn} onPress={() => router.replace('/(driver)')}>
          <Text style={styles.homeBtnText}>Retour à l'accueil</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={styles.topTitle}>Évaluation</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {mec && (
          <View style={styles.mechCard}>
            <Avatar uri={mec.avatar_url} name={mec.business_name} size={64} />
            <Text style={styles.mechName}>{mec.business_name || 'Mécanicien'}</Text>
            <Text style={styles.mechSub}>Comment s'est passée l'intervention ?</Text>
          </View>
        )}

        <View style={styles.ratingSection}>
          <Text style={styles.sectionLabel}>Note</Text>
          <View style={styles.starsRow}>
            <StarRating value={score} onChange={setScore} size={40} />
          </View>
          {score > 0 && (
            <Text style={styles.scoreLabel}>
              {['', 'Très insatisfait', 'Insatisfait', 'Correct', 'Satisfait', 'Excellent !'][score]}
            </Text>
          )}
        </View>

        <View style={styles.commentSection}>
          <Text style={styles.sectionLabel}>Commentaire (optionnel)</Text>
          <TextInput
            style={styles.textArea}
            value={commentaire}
            onChangeText={setCommentaire}
            placeholder="Décrivez votre expérience..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <Pressable
          style={[styles.submitBtn, (score === 0 || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={score === 0 || submitting}>
          {submitting ? <ActivityIndicator size="small" color={Colors.textInverse} /> : <Star size={20} color={Colors.textInverse} fill={Colors.textInverse} />}
          <Text style={styles.submitBtnText}>{submitting ? 'Envoi...' : 'Envoyer l\'évaluation'}</Text>
        </Pressable>

        <Pressable style={styles.skipBtn} onPress={() => router.replace('/(driver)')}>
          <Text style={styles.skipBtnText}>Passer</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.lg, paddingHorizontal: Spacing.lg },
  topBar: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  topTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXxl, color: Colors.text },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.xl, alignItems: 'center' },
  mechCard: { alignItems: 'center', gap: Spacing.sm, width: '100%' },
  mechName: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXl, color: Colors.text },
  mechSub: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  ratingSection: { alignItems: 'center', gap: Spacing.md, width: '100%' },
  sectionLabel: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text, alignSelf: 'flex-start' },
  starsRow: { flexDirection: 'row' },
  scoreLabel: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.accent },
  commentSection: { gap: Spacing.sm, width: '100%' },
  textArea: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, padding: Spacing.md, minHeight: 100, width: '100%',
    fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.text,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.accent, paddingVertical: Spacing.md + 4, borderRadius: BorderRadius.lg,
    width: '100%', elevation: 3, shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6,
  },
  submitBtnDisabled: { backgroundColor: Colors.disabled, shadowOpacity: 0, elevation: 0 },
  submitBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.textInverse },
  skipBtn: { paddingVertical: Spacing.md },
  skipBtnText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textTertiary },
  doneTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXl, color: Colors.text, textAlign: 'center' },
  doneText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.textSecondary, textAlign: 'center' },
  homeBtn: { backgroundColor: Colors.primary, paddingVertical: Spacing.md + 4, paddingHorizontal: Spacing.xxl, borderRadius: BorderRadius.lg },
  homeBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.textInverse },
});
