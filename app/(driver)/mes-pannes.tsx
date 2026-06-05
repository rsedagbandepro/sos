import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, History } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { PanneCard } from '@/components/PanneCard';
import { useAuth } from '@/hooks/useAuth';
import { useDriverPannes } from '@/hooks/usePannes';
import { supabase } from '@/lib/supabase';
import type { Panne } from '@/lib/types';

export default function MesPannesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { pannes, loading, refetch } = useDriverPannes(user?.id ?? null);

  const handlePress = async (p: Panne) => {
    if (p.statut === 'ouverte' || p.statut === 'offre_acceptee') {
      router.push(`/(driver)/attente/${p.id}`);
    } else if (p.statut === 'en_cours') {
      const { data: intervention } = await supabase
        .from('interventions')
        .select('id')
        .eq('panne_id', p.id)
        .maybeSingle();
      if (intervention) {
        router.push(`/(driver)/suivi/${intervention.id}`);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Mes pannes</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Colors.primary} />}>

        {pannes.length === 0 && !loading ? (
          <View style={styles.empty}>
            <History size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>Aucune panne enregistrée</Text>
          </View>
        ) : (
          pannes.map((p: Panne) => (
            <PanneCard
              key={p.id}
              panne={p}
              onPress={() => handlePress(p)}
            />
          ))
        )}
      </ScrollView>
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
  topTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXxl, color: Colors.text },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  empty: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.textTertiary },
});
