import {
  View, Text, Pressable, StyleSheet, FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, User, Check, X, Mail, Phone, Calendar } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getServerRole } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, useCallback } from 'react';

interface PendingMechanic {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string;
  created_at: string;
}

export default function AdminDemandesScreen() {
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [demandes, setDemandes] = useState<PendingMechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadDemandes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_pending_mechanics');
    if (!error && data) {
      setDemandes(data as PendingMechanic[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/(driver)');
      return;
    }
    let cancelled = false;
    (async () => {
      const role = await getServerRole(user.id);
      if (cancelled) return;
      if (role !== 'admin') {
        router.replace('/(driver)');
        return;
      }
      setAuthorized(true);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  useEffect(() => {
    if (authorized) loadDemandes();
  }, [authorized, loadDemandes]);

  const handleApprove = useCallback(async (item: PendingMechanic) => {
    Alert.alert(
      'Approuver la demande',
      `Approuver ${item.full_name || item.email} en tant que mecanicien?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Approuver',
          style: 'default',
          onPress: async () => {
            setProcessing(item.user_id);
            const { data, error } = await supabase.rpc('approve_mechanic', { p_user_id: item.user_id });
            setProcessing(null);
            if (error || (data && !data.success)) {
              Alert.alert('Erreur', (data as any)?.error || 'Impossible d\'approuver');
              return;
            }
            Alert.alert('Succes', 'Le compte mecanicien a ete approuve');
            loadDemandes();
          },
        },
      ]
    );
  }, [loadDemandes]);

  const handleReject = useCallback(async (item: PendingMechanic) => {
    Alert.alert(
      'Refuser la demande',
      `Etes-vous sur de vouloir refuser ${item.full_name || item.email}?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            setProcessing(item.user_id);
            const { data, error } = await supabase.rpc('reject_mechanic', { p_user_id: item.user_id, p_reason: null });
            setProcessing(null);
            if (error || (data && !data.success)) {
              Alert.alert('Erreur', (data as any)?.error || 'Impossible de refuser');
              return;
            }
            Alert.alert('Succes', 'La demande a ete refusee');
            loadDemandes();
          },
        },
      ]
    );
  }, [loadDemandes]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (!authorized) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Demandes mecaniciens</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : demandes.length === 0 ? (
        <View style={styles.empty}>
          <User size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>Aucune demande</Text>
          <Text style={styles.emptyDesc}>Toutes les demandes ont ete traitees</Text>
        </View>
      ) : (
        <FlatList
          data={demandes}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatarWrap}>
                  <User size={24} color={Colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.full_name || 'Sans nom'}</Text>
                  <View style={styles.cardMeta}>
                    <Mail size={12} color={Colors.textTertiary} />
                    <Text style={styles.cardMetaText}>{item.email}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardBody}>
                {item.phone && (
                  <View style={styles.cardMeta}>
                    <Phone size={14} color={Colors.textSecondary} />
                    <Text style={styles.cardMetaText}>{item.phone}</Text>
                  </View>
                )}
                <View style={styles.cardMeta}>
                  <Calendar size={14} color={Colors.textSecondary} />
                  <Text style={styles.cardMetaText}>Inscrit le {formatDate(item.created_at)}</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <Pressable
                  style={[styles.actionBtn, styles.approveBtn, processing === item.user_id && styles.actionBtnDisabled]}
                  onPress={() => handleApprove(item)}
                  disabled={processing === item.user_id}>
                  {processing === item.user_id ? (
                    <ActivityIndicator size="small" color={Colors.success} />
                  ) : (
                    <>
                      <Check size={18} color={Colors.success} />
                      <Text style={styles.approveBtnText}>Approuver</Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.rejectBtn, processing === item.user_id && styles.actionBtnDisabled]}
                  onPress={() => handleReject(item)}
                  disabled={processing === item.user_id}>
                  <X size={18} color={Colors.error} />
                  <Text style={styles.rejectBtnText}>Refuser</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: Spacing.sm },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  list: { padding: Spacing.lg, gap: Spacing.md },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  emptyDesc: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textTertiary },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatarWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardName: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  cardBody: { gap: Spacing.xs },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardMetaText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  cardActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  actionBtnDisabled: { opacity: 0.5 },
  approveBtn: { backgroundColor: Colors.successLight, borderWidth: 1, borderColor: Colors.success },
  approveBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.success },
  rejectBtn: { backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error },
  rejectBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.error },
});
