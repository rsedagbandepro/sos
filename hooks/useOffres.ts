import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Offre } from '@/lib/types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function useOffresForPanne(panneId: string | null) {
  const [offres, setOffres] = useState<Offre[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!panneId) { setLoading(false); return; }
    const { data } = await supabase
      .from('offres')
      .select('*, mechanic:mechanics(*)')
      .eq('panne_id', panneId)
      .order('created_at', { ascending: false });
    setOffres((data as Offre[]) || []);
    setLoading(false);
  }, [panneId]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!panneId) return;
    const ch = supabase
      .channel(`offres_panne:${panneId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offres', filter: `panne_id=eq.${panneId}` },
        (payload: RealtimePostgresChangesPayload<Offre>) => {
          if (payload.eventType === 'INSERT') fetch();
          else if (payload.eventType === 'UPDATE') setOffres(prev => prev.map(o => o.id === (payload.new as Offre).id ? { ...o, ...(payload.new as Offre) } : o));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [panneId, fetch]);

  return { offres, loading, refetch: fetch };
}

export function useMechanicOffres(mechanicId: string | null) {
  const [offres, setOffres] = useState<Offre[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!mechanicId) { setLoading(false); return; }
    const { data } = await supabase
      .from('offres')
      .select('*, panne:pannes(*)')
      .eq('mechanic_id', mechanicId)
      .order('created_at', { ascending: false });
    setOffres((data as Offre[]) || []);
    setLoading(false);
  }, [mechanicId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { offres, loading, refetch: fetch };
}
