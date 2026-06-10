import { supabase } from './supabase';

interface PendingNotification {
  id: string;
  panne_id: string;
  distance_km: number;
  categorie: string | null;
  created_at: string;
}

export async function getPendingNotifications(
  mechanicId: string
): Promise<PendingNotification[]> {
  const { data, error } = await supabase
    .from('notification_queue')
    .select(
      `
      id,
      panne_id,
      distance_km,
      created_at,
      sent_at
    `
    )
    .eq('mechanic_id', mechanicId)
    .is('sent_at', null)
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Failed to fetch pending notifications:', error);
    return [];
  }

  const notificationsWithCategorie = await Promise.all(
    (data || []).map(async (n) => {
      const { data: panne } = await supabase
        .from('pannes')
        .select('categorie')
        .eq('id', n.panne_id)
        .maybeSingle();

      return {
        ...n,
        categorie: panne?.categorie || null,
      };
    })
  );

  return notificationsWithCategorie;
}

export async function markNotificationSent(notificationId: string): Promise<void> {
  await supabase
    .from('notification_queue')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', notificationId);
}

export async function clearOldNotifications(maxAge = 24): Promise<void> {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - maxAge);

  await supabase
    .from('notification_queue')
    .delete()
    .lt('created_at', cutoff.toISOString())
    .not('sent_at', 'is', null);
}
