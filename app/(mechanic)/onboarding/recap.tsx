import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleCheck as CheckCircle, Clock } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';

export default function OnboardingRecapScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
      <View style={styles.iconWrap}>
        <CheckCircle size={64} color={Colors.success} />
      </View>
      <Text style={styles.title}>Dossier soumis !</Text>
      <Text style={styles.desc}>
        Votre dossier est en cours d'examen par notre équipe.{'\n'}
        Vous serez notifié par email dès la validation (généralement sous 24h).
      </Text>

      <View style={styles.stepsCard}>
        <View style={styles.stepRow}>
          <CheckCircle size={20} color={Colors.success} />
          <Text style={styles.stepText}>Identité enregistrée</Text>
        </View>
        <View style={styles.stepRow}>
          <CheckCircle size={20} color={Colors.success} />
          <Text style={styles.stepText}>Documents soumis</Text>
        </View>
        <View style={styles.stepRow}>
          <CheckCircle size={20} color={Colors.success} />
          <Text style={styles.stepText}>Spécialités configurées</Text>
        </View>
        <View style={styles.stepRow}>
          <Clock size={20} color={Colors.warning} />
          <Text style={styles.stepText}>Validation en attente...</Text>
        </View>
      </View>

      <Pressable style={styles.btn} onPress={() => router.replace('/(mechanic)/onboarding')}>
        <Text style={styles.btnText}>Voir le statut de mon dossier</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.lg,
    alignItems: 'center', gap: Spacing.xl,
  },
  iconWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.successLight, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXxl, color: Colors.text, textAlign: 'center' },
  desc: {
    fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 24,
  },
  stepsCard: {
    width: '100%', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.text },
  btn: {
    backgroundColor: Colors.primary, paddingVertical: Spacing.md + 4,
    paddingHorizontal: Spacing.xxl, borderRadius: BorderRadius.lg,
  },
  btnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.textInverse },
});
