import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, User, Phone, Mail, Lock, LogOut, Save } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function DriverProfilScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, signOut, fetchProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone })
        .eq('user_id', user.id);
      if (err) throw err;
      await fetchProfile(user.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try { await signOut(); } catch {}
    router.replace('/(driver)');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Mon profil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        <View style={styles.avatarSection}>
          <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={80} />
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
        {saved && <View style={styles.successBox}><Text style={styles.successText}>Profil mis à jour</Text></View>}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom complet</Text>
            <View style={styles.inputRow}>
              <User size={18} color={Colors.textTertiary} />
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName}
                placeholder="Votre nom" placeholderTextColor={Colors.textTertiary} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone</Text>
            <View style={styles.inputRow}>
              <Phone size={18} color={Colors.textTertiary} />
              <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                placeholder="+229 97 00 00 00" placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad" />
            </View>
          </View>

          <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
            <Save size={18} color={Colors.textInverse} />
            <Text style={styles.saveBtnText}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</Text>
          </Pressable>
        </View>

        <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
          <LogOut size={18} color={Colors.error} />
          <Text style={styles.signOutBtnText}>Se déconnecter</Text>
        </Pressable>
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
  topTitle: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeLg, color: Colors.text },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.xl },
  avatarSection: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.lg },
  email: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.textSecondary },
  errorBox: { backgroundColor: Colors.errorLight, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.error },
  errorText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.error },
  successBox: { backgroundColor: Colors.successLight, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.success },
  successText: { fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeSm, color: Colors.success },
  form: { gap: Spacing.lg },
  inputGroup: { gap: Spacing.sm },
  label: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeSm, color: Colors.text },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border,
  },
  input: { flex: 1, fontFamily: 'Inter-Regular', fontSize: Typography.fontSizeMd, color: Colors.text },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, paddingVertical: Spacing.md + 4, borderRadius: BorderRadius.lg,
  },
  saveBtnDisabled: { backgroundColor: Colors.disabled },
  saveBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.textInverse },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.errorLight, paddingVertical: Spacing.md + 4, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.error,
  },
  signOutBtnText: { fontFamily: 'Inter-Bold', fontSize: Typography.fontSizeMd, color: Colors.error },
});
