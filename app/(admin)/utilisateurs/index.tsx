import {
  View, Text, Pressable, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, User, Wrench, ShieldCheck, Plus, Search, Ban, CircleCheck as CheckCircle } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useState, useMemo } from 'react';

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  is_banned: boolean;
  banned_until: string | null;
  created_at: string;
}

const ROLE_ICON: Record<string, typeof User> = {
  driver: User,
  mechanic: Wrench,
  admin: ShieldCheck,
};

const ROLE_COLORS: Record<string, string> = {
  driver: Colors.primary,
  mechanic: Colors.accent,
  admin: Colors.error,
};

const ROLE_LABELS: Record<string, string> = {
  driver: 'Conducteur',
  mechanic: 'Mecanicien',
  admin: 'Admin',
};

type RoleFilter = 'all' | 'driver' | 'mechanic' | 'admin';
type StatusFilter = 'all' | 'active' | 'inactive';

export default function AdminUtilisateursScreen() {
  const insets = useSafeAreaInsets();
  const { users, loading, refetch } = useAdminUsers();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredUsers = useMemo(() => {
    let result = users as AdminUser[];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        u.email.toLowerCase().includes(q) ||
        (u.full_name?.toLowerCase().includes(q) ?? false) ||
        (u.phone?.includes(q) ?? false)
      );
    }

    if (roleFilter !== 'all') {
      result = result.filter(u => u.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(u => statusFilter === 'active' ? !u.is_banned : u.is_banned);
    }

    return result;
  }, [users, search, roleFilter, statusFilter]);

  const drivers = (users as AdminUser[]).filter(u => u.role === 'driver');
  const mechanics = (users as AdminUser[]).filter(u => u.role === 'mechanic');
  const admins = (users as AdminUser[]).filter(u => u.role === 'admin');

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Utilisateurs</Text>
        <Pressable onPress={() => router.push('/(admin)/utilisateurs/nouveau')} style={styles.addBtn}>
          <Plus size={22} color={Colors.textInverse} />
        </Pressable>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <User size={16} color={Colors.primary} />
          <Text style={styles.summaryNum}>{drivers.length}</Text>
          <Text style={styles.summaryLabel}>Conducteurs</Text>
        </View>
        <View style={styles.summaryItem}>
          <Wrench size={16} color={Colors.accent} />
          <Text style={styles.summaryNum}>{mechanics.length}</Text>
          <Text style={styles.summaryLabel}>Mecaniciens</Text>
        </View>
        <View style={styles.summaryItem}>
          <ShieldCheck size={16} color={Colors.error} />
          <Text style={styles.summaryNum}>{admins.length}</Text>
          <Text style={styles.summaryLabel}>Admins</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Search size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par nom, email, tel..."
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={styles.filtersRow}>
        <View style={styles.filterGroup}>
          <Pressable
            style={[styles.filterChip, roleFilter === 'all' && styles.filterChipActive]}
            onPress={() => setRoleFilter('all')}
          >
            <Text style={[styles.filterText, roleFilter === 'all' && styles.filterTextActive]}>Tous</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, roleFilter === 'driver' && styles.filterChipActive]}
            onPress={() => setRoleFilter('driver')}
          >
            <Text style={[styles.filterText, roleFilter === 'driver' && styles.filterTextActive]}>Conducteurs</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, roleFilter === 'mechanic' && styles.filterChipActive]}
            onPress={() => setRoleFilter('mechanic')}
          >
            <Text style={[styles.filterText, roleFilter === 'mechanic' && styles.filterTextActive]}>Mecaniciens</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, roleFilter === 'admin' && styles.filterChipActive]}
            onPress={() => setRoleFilter('admin')}
          >
            <Text style={[styles.filterText, roleFilter === 'admin' && styles.filterTextActive]}>Admins</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.filtersRow}>
        <View style={styles.filterGroup}>
          <Pressable
            style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[styles.filterText, statusFilter === 'all' && styles.filterTextActive]}>Tous</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, statusFilter === 'active' && styles.filterChipActive]}
            onPress={() => setStatusFilter('active')}
          >
            <CheckCircle size={12} color={statusFilter === 'active' ? Colors.textInverse : Colors.success} />
            <Text style={[styles.filterText, statusFilter === 'active' && styles.filterTextActive]}>Actifs</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, statusFilter === 'inactive' && styles.filterChipActive]}
            onPress={() => setStatusFilter('inactive')}
          >
            <Ban size={12} color={statusFilter === 'inactive' ? Colors.textInverse : Colors.error} />
            <Text style={[styles.filterText, statusFilter === 'inactive' && styles.filterTextActive]}>Inactifs</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        {loading && users.length === 0 && (
          <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
        )}

        {filteredUsers.map((u: AdminUser) => {
          const Icon = ROLE_ICON[u.role] ?? User;
          const color = ROLE_COLORS[u.role] ?? Colors.textTertiary;
          return (
            <Pressable
              key={u.user_id}
              style={[styles.card, u.is_banned && styles.cardInactive]}
              onPress={() => router.push(`/(admin)/utilisateurs/${u.user_id}`)}
            >
              <View style={[styles.avatar, { backgroundColor: color + '15' }]}>
                <Icon size={20} color={color} />
              </View>
              <View style={styles.info}>
                <View style={styles.infoRow}>
                  <Text style={styles.name}>{u.full_name || 'Sans nom'}</Text>
                  {u.is_banned && <Ban size={14} color={Colors.error} />}
                </View>
                <Text style={styles.email}>{u.email}</Text>
                <Text style={styles.phone}>{u.phone || '—'}</Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: color + '15' }]}>
                <Text style={[styles.roleText, { color }]}>{ROLE_LABELS[u.role] ?? u.role}</Text>
              </View>
            </Pressable>
          );
        })}

        {!loading && filteredUsers.length === 0 && (
          <View style={styles.empty}>
            <User size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Aucun utilisateur trouve</Text>
            <Text style={styles.emptyDesc}>Essayez de modifier vos filtres de recherche.</Text>
          </View>
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
  title: { flex: 1, fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXxl, color: Colors.text },
  addBtn: {
    backgroundColor: Colors.primary, padding: Spacing.sm, borderRadius: BorderRadius.md,
  },
  summary: {
    flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md,
  },
  summaryItem: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: Colors.border,
  },
  summaryNum: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  summaryLabel: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary },
  searchRow: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: {
    flex: 1, fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm,
    color: Colors.text, paddingVertical: Spacing.md,
  },
  filtersRow: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  filterGroup: { flexDirection: 'row', gap: Spacing.sm },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textSecondary },
  filterTextActive: { color: Colors.textInverse },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  center: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  empty: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.text },
  emptyDesc: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textTertiary, textAlign: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  cardInactive: { opacity: 0.6, borderColor: Colors.error },
  avatar: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  name: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.text },
  email: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textSecondary },
  phone: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeXs, color: Colors.textTertiary },
  roleBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full,
  },
  roleText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeXs },
});
