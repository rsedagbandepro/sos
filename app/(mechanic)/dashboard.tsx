import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useConnectivity } from '@/hooks/useConnectivity';
import {
  MapPin,
  Clock,
  Phone,
  Wrench,
  Battery,
  CircleDot,
  Truck,
  KeyRound,
  HelpCircle,
  CheckCircle,
  XCircle,
  Navigation,
  Eye,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { BreakdownRequest, BreakdownType, Mechanic } from '@/lib/types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

const BREAKDOWN_ICONS: Record<BreakdownType, typeof Wrench> = {
  flat_tire: CircleDot,
  dead_battery: Battery,
  engine_failure: Wrench,
  towing: Truck,
  locked_out: KeyRound,
  other: HelpCircle,
};

const BREAKDOWN_COLORS: Record<BreakdownType, string> = {
  flat_tire: Colors.primary,
  dead_battery: Colors.secondaryLight,
  engine_failure: Colors.accentDark,
  towing: Colors.success,
  locked_out: Colors.warning,
  other: Colors.textTertiary,
};

const BREAKDOWN_LABELS: Record<string, string> = {
  flat_tire: 'Crevaison',
  dead_battery: 'Batterie à plat',
  engine_failure: 'Panne moteur',
  towing: 'Remorquage',
  locked_out: 'Clés perdues',
  other: 'Autre',
};

export default function MechanicDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isOnline } = useConnectivity();
  const [mechanic, setMechanic] = useState<Mechanic | null>(null);
  const [pendingRequests, setPendingRequests] = useState<BreakdownRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<BreakdownRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load mechanic profile
  useEffect(() => {
    if (!user) {
      router.replace('/(mechanic)/login');
      return;
    }

    supabase
      .from('mechanics')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          router.replace('/(mechanic)/register');
          return;
        }
        setMechanic(data as Mechanic);
      });
  }, [user]);

  // Fetch pending requests
  const fetchRequests = useCallback(async () => {
    if (!mechanic) return;

    try {
      // Fetch pending requests near mechanic's location
      const { data: pending } = await supabase
        .from('breakdown_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

      setPendingRequests((pending as BreakdownRequest[]) || []);

      // Fetch own active request
      const { data: active } = await supabase
        .from('breakdown_requests')
        .select('*')
        .eq('accepted_by', mechanic.id)
        .in('status', ['accepted', 'in_progress'])
        .order('created_at', { ascending: false })
        .maybeSingle();

      setActiveRequest((active as BreakdownRequest) || null);
    } catch {
      // Silent failure
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mechanic]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Realtime subscription for new requests
  useEffect(() => {
    if (!mechanic) return;

    const channel = supabase
      .channel('mechanic_dashboard')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'breakdown_requests',
          filter: 'status=eq.pending',
        },
        (payload: RealtimePostgresChangesPayload<BreakdownRequest>) => {
          if (payload.new) {
            setPendingRequests((prev) => [
              payload.new as BreakdownRequest,
              ...prev,
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mechanic]);

  const handleAccept = async (requestId: string) => {
    if (!mechanic) return;
    try {
      const { error } = await supabase
        .from('breakdown_requests')
        .update({ status: 'accepted', accepted_by: mechanic.id })
        .eq('id', requestId);

      if (error) throw error;

      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      router.push(`/(mechanic)/active-request?requestId=${requestId}`);
    } catch {
      // Show error inline
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement des demandes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.bannerWrapper}>
          <OfflineBanner visible={!isOnline} />
        </View>
      )}

      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <Text style={styles.title}>Demandes</Text>
        <View style={styles.availabilityRow}>
          <View
            style={[
              styles.availabilityDot,
              mechanic?.is_available
                ? styles.availableDot
                : styles.unavailableDot,
            ]}
          />
          <Text style={styles.availabilityText}>
            {mechanic?.is_available ? 'Disponible' : 'Indisponible'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        {activeRequest && (
          <Pressable
            style={styles.activeCard}
            onPress={() =>
              router.push(`/(mechanic)/active-request?requestId=${activeRequest.id}`)
            }
          >
            <View style={styles.activeCardHeader}>
              <Navigation size={20} color={Colors.accent} />
              <Text style={styles.activeCardTitle}>Demande active</Text>
            </View>
            <Text style={styles.activeCardType}>
              {BREAKDOWN_LABELS[activeRequest.breakdown_type] || activeRequest.breakdown_type}
            </Text>
            <View style={styles.activeCardMeta}>
              <Phone size={14} color={Colors.textSecondary} />
              <Text style={styles.activeCardMetaText}>{activeRequest.driver_phone}</Text>
            </View>
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>
          Nouvelles demandes ({pendingRequests.length})
        </Text>

        {pendingRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>
              Aucune demande en attente pour le moment
            </Text>
          </View>
        ) : (
          pendingRequests.map((req) => {
            const Icon = BREAKDOWN_ICONS[req.breakdown_type] || HelpCircle;
            const color = BREAKDOWN_COLORS[req.breakdown_type] || Colors.textTertiary;

            return (
              <View key={req.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={[styles.typeBadge, { backgroundColor: color + '15' }]}>
                    <Icon size={20} color={color} />
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestType}>
                      {BREAKDOWN_LABELS[req.breakdown_type] || req.breakdown_type}
                    </Text>
                    <View style={styles.requestMeta}>
                      <Clock size={12} color={Colors.textTertiary} />
                      <Text style={styles.requestMetaText}>
                        {new Date(req.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      <MapPin size={12} color={Colors.textTertiary} />
                      <Text style={styles.requestMetaText}>
                        {req.driver_phone}
                      </Text>
                    </View>
                  </View>
                </View>

                {req.description ? (
                  <Text style={styles.requestDescription} numberOfLines={2}>
                    {req.description}
                  </Text>
                ) : null}

                <View style={styles.requestActions}>
                  <Pressable
                    style={styles.acceptButton}
                    onPress={() => handleAccept(req.id)}
                  >
                    <CheckCircle size={18} color={Colors.textInverse} />
                    <Text style={styles.acceptButtonText}>Accepter</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
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
  bannerWrapper: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.textSecondary,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeXxl,
    color: Colors.text,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  availabilityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  availableDot: {
    backgroundColor: Colors.success,
  },
  unavailableDot: {
    backgroundColor: Colors.textTertiary,
  },
  availabilityText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  activeCard: {
    backgroundColor: Colors.accentLight + '40',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.accent,
    gap: Spacing.sm,
  },
  activeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  activeCardTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeSm,
    color: Colors.accentDark,
  },
  activeCardType: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeMd,
    color: Colors.text,
  },
  activeCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  activeCardMetaText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeLg,
    color: Colors.text,
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
  requestCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    elevation: 1,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  typeBadge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestInfo: {
    flex: 1,
    gap: 2,
  },
  requestType: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeMd,
    color: Colors.text,
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  requestMetaText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeXs,
    color: Colors.textTertiary,
  },
  requestDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeSm,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSizeSm * Typography.lineHeightBody,
  },
  requestActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  acceptButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeSm,
    color: Colors.textInverse,
  },
});
