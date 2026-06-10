import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, LogOut, RefreshCw } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useState, useCallback, useEffect } from 'react';

export default function EnAttenteScreen() {
  const insets = useSafeAreaInsets();
  const { profile, signOut, fetchProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Redirect to onboarding if approved
  useEffect(() => {
    if (profile?.is_approved === true && profile?.role === 'mechanic') {
      router.replace('/(mechanic)/onboarding');
    }
  }, [profile?.is_approved, profile?.role]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (profile?.user_id) {
      await fetchProfile(profile.user_id);
    }
    setRefreshing(false);
  }, [profile?.user_id, fetchProfile]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/(auth)/login');
  }, [signOut]);

  const wasRejected = profile?.rejection_reason != null;

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.xxl }]}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, wasRejected && styles.iconWrapError]}>
          <Clock size={48} color={wasRejected ? Colors.error : Colors.primary} />
        </View>

        <Text style={styles.title}>
          {wasRejected ? 'Demande refusee' : 'En attente de validation'}
        </Text>

        <Text style={styles.message}>
          {wasRejected
            ? `Votre demande de compte mecanicien a ete refusee. ${profile?.rejection_reason ? '\n\nRaison: ' + profile.rejection_reason : ''}`
            : 'Votre compte est en cours de verification par un administrateur. Vous recevrez un acces une fois votre compte approuve.'
          }
        </Text>

        {!wasRejected && (
          <Pressable
            style={[styles.refreshBtn, refreshing && styles.btnDisabled]}
            onPress={handleRefresh}
            disabled={refreshing}>
            {refreshing ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <RefreshCw size={18} color={Colors.primary} />
                <Text style={styles.refreshBtnText}>Verifier le statut</Text>
              </>
              )}
          </Pressable>
        )}

        <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
          <LogOut size={18} color={Colors.error} />
          <Text style={styles.signOutBtnText}>Se deconnecter</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapError: {
    backgroundColor: Colors.errorLight,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeXl,
    color: Colors.text,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeMd,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  refreshBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: Typography.fontSizeMd,
    color: Colors.primary,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  signOutBtnText: {
    fontFamily: 'Inter-Regular',
    fontSize: Typography.fontSizeMd,
    color: Colors.error,
  },
});
