import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Clock, Phone, MapPin, CheckCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import type { BreakdownRequest } from '@/lib/types';

const BREAKDOWN_LABELS: Record<string, string> = {
  flat_tire: 'Crevaison',
  dead_battery: 'Batterie a plat',
  engine_failure: 'Panne moteur',
  towing: 'Remorquage',
  locked_out: 'Cles perdues',
  other: 'Autre',
};

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [mechanicId, setMechanicId] = useState<string | null>(null);
  const [history, setHistory] = useState<BreakdownRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('mechanics')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setMechanicId(data.id);
      });
  }, [user]);

  const fetchHistory = useCallback(async () => {
    if (!mechanicId) return;
    try {
      const { data } = await supabase
        .from('breakdown_requests')
        .select('*')
        .eq('accepted_by', mechanicId)
        .eq('status', 'resolved')
        .order('updated_at', { ascending: false })
        .limit(50);

      setHistory((data as BreakdownRequest[]) || []);
    } catch {
      // Silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mechanicId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <Text style={styles.title}>Historique</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} tintColor={Colors.primary} />
        }
      >
        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>
              Aucune intervention terminee
            </Text>
          </View>
        ) : (
          history.map((req) => (
            <View key={req.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <CheckCircle size={20} color={Colors.success} />
                <Text style={styles.historyType}>
                  {BREAKDOWN_LABELS[req.breakdown_type] || req.breakdown_type}
                </Text>
              </View>
              <View style={styles.historyMeta}>
                <Phone size={14} color={Colors.textTertiary} />
                <Text style={styles.historyMetaText}>{req.driver_phone}</Text>
                <MapPin size={14} color={Colors.textTertiary} />
                <Text style={styles.historyMetaText}>
                  {req.latitude.toFixed(3)}, {req.longitude.toFixed(3)}
                </Text>
              </View>
              <Text style={styles.historyDate}>
                {new Date(req.updated_at).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeXxl,
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeMd,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  historyType: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeMd,
    color: Colors.text,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  historyMetaText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeXs,
    color: Colors.textTertiary,
  },
  historyDate: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeXs,
    color: Colors.textTertiary,
  },
});
