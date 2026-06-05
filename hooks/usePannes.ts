import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Panne, PanneStatut } from '@/lib/types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function useDriverPannes(driverId: string | null) {
  const [pannes, setPannes] = useState<Panne[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!driverId) { setLoading(false); return; }
    const { data } = await supabase
      .from('pannes')
      .select('*, photos:panne_photos(*)')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });
    setPannes((data as Panne[]) || []);
    setLoading(false);
  }, [driverId]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!driverId) return;
    const ch = supabase
      .channel(`driver_pannes:${driverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pannes', filter: `driver_id=eq.${driverId}` },
        (payload: RealtimePostgresChangesPayload<Panne>) => {
          if (payload.eventType === 'INSERT') setPannes(prev => [payload.new as Panne, ...prev]);
          else if (payload.eventType === 'UPDATE') setPannes(prev => prev.map(p => p.id === (payload.new as Panne).id ? (payload.new as Panne) : p));
          else if (payload.eventType === 'DELETE') setPannes(prev => prev.filter(p => p.id !== (payload.old as Panne).id));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [driverId]);

  return { pannes, loading, refetch: fetch };
}

export function useSinglePanne(panneId: string | null) {
  const [panne, setPanne] = useState<Panne | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!panneId) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from('pannes')
      .select('*, photos:panne_photos(*)')
      .eq('id', panneId)
      .maybeSingle()
      .then(({ data, error: e }) => {
        if (e) setError(e.message);
        else setPanne(data as Panne | null);
        setLoading(false);
      });

    const ch = supabase
      .channel(`panne:${panneId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pannes', filter: `id=eq.${panneId}` },
        (payload: RealtimePostgresChangesPayload<Panne>) => {
          if (payload.new) setPanne(payload.new as Panne);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [panneId]);

  return { panne, loading, error };
}

export function useNearbyOpenPannes(latitude: number | null, longitude: number | null, radiusKm: number = 30) {
  const [pannes, setPannes] = useState<Panne[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (latitude === null || longitude === null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.rpc('nearby_open_pannes', {
      p_latitude: latitude,
      p_longitude: longitude,
      p_radius_km: radiusKm,
    });
    setPannes((data as Panne[]) || []);
    setLoading(false);
  }, [latitude, longitude, radiusKm]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    const ch = supabase
      .channel('open_pannes_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pannes', filter: "statut=eq.ouverte" },
        () => { fetch(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pannes' },
        (payload: RealtimePostgresChangesPayload<Panne>) => {
          const updated = payload.new as Panne;
          if (updated.statut !== 'ouverte') {
            setPannes(prev => prev.filter(p => p.id !== updated.id));
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

  return { pannes, loading, refetch: fetch };
}
