import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { History, User, LogIn, ChevronRight } from 'lucide-react-native';
import { SOSButton } from '@/components/SOSButton';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PanneCard } from '@/components/PanneCard';
import { useConnectivity } from '@/hooks/useConnectivity';
import { useAuth } from '@/hooks/useAuth';
import { useDriverPannes } from '@/hooks/usePannes';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import type { Panne } from '@/lib/types';

export default function DriverHome() {
  const insets = useSafeAreaInsets();
  const { isOnline } = useConnectivity();
  const { user, profile } = useAuth();
  const { pannes, loading } = useDriverPannes(user?.id ?? null);

  const activePannes = pannes.filter(
    (p: Panne) => p.statut === 'ouverte' || p.statut === 'offre_acceptee' || p.statut === 'en_cours'
  );

  const handlePannePress = (p: Panne) => {
    if (p.statut === 'ouverte' || p.statut === 'offre_acceptee') {
      router.push(`/(driver)/attente/${p.id}`);
    } else if (p.statut === 'en_cours') {
      router.push(`/(driver)/suivi/${p.id}`);
    }
  };

  const isGuest = !user;
  const firstName = profile?.full_name?.split(' ')[0] ?? null;

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.bannerWrapper}>
          <OfflineBanner visible />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
          <View>
            <Text style={styles.greeting}>
              {isGuest ? 'Bonjour !' : `Bonjour${firstName ? ', ' + firstName : ''}`}
            </Text>
            <Text style={styles.subtitle}>Prêt à vous aider en cas de panne</Text>
          </View>
          <View style={styles.headerActions}>
            {!isGuest && (
              <Pressable style={styles.iconBtn} onPress={() => router.push('/(driver)/mes-pannes')}>
                <History size={22} color={Colors.textSecondary} />
              </Pressable>
            )}
            <Pressable
              style={styles.iconBtn}
              onPress={() => router.push(isGuest ? '/(auth)/login' : '/(driver)/profil')}
            >
              {isGuest
                ? <LogIn size={22} color={Colors.primary} />
                : <User size={22} color={Colors.textSecondary} />
              }
            </Pressable>
          </View>
        </View>

        <View style={styles.sosSection}>
          <SOSButton onPress={() => router.push('/(driver)/nouvelle-panne')} />
          <Text style={styles.sosHint}>Appuyez en cas de panne</Text>
        </View>

        {isGuest && (
          <Pressable style={styles.guestBanner} onPress={() => router.push('/(auth)/login')}>
            <View style={styles.guestBannerText}>
              <Text style={styles.guestTitle}>Suivre vos pannes</Text>
              <Text style={styles.guestDesc}>Créez un compte gratuit pour retrouver l'historique de vos pannes.</Text>
            </View>
            <ChevronRight size={20} color={Colors.primary} />
          </Pressable>
        )}

        {!isGuest && activePannes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pannes en cours ({activePannes.length})</Text>
            {activePannes.map((p: Panne) => (
              <PanneCard key={p.id} panne={p} onPress={() => handlePannePress(p)} />
            ))}
          </View>
        )}

        {!isGuest && !loading && activePannes.length === 0 && (
          <View style={styles.emptyHint}>
            <Text style={styles.emptyText}>Aucune panne en cours. Appuyez sur SOS si besoin.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bannerWrapper: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  scroll: { paddingBottom: Spacing.xxl },
  header: {
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  greeting: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXl, color: Colors.text },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: Spacing.xs },
  iconBtn: { padding: Spacing.sm, borderRadius: BorderRadius.md },
  sosSection: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  sosHint: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textTertiary },
  guestBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    marginHorizontal: Spacing.lg, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  guestBannerText: { flex: 1, gap: 4 },
  guestTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  guestDesc: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  section: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text, marginBottom: Spacing.xs },
  emptyHint: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, alignItems: 'center' },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textTertiary, textAlign: 'center' },
});
