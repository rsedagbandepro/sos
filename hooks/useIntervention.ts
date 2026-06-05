import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Intervention, InterventionStatut } from '@/lib/types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function useIntervention(interventionId: string | null) {
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!interventionId) { setLoading(false); return; }

    const loadIntervention = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('interventions')
          .select('*, mechanic:mechanics(*), panne:pannes(*), paiement:paiements(*)')
          .eq('id', interventionId)
          .maybeSingle();

        if (fetchError) {
          console.error('Failed to fetch intervention:', fetchError);
        } else {
          setIntervention((data || null) as Intervention | null);
        }
      } catch (err) {
        console.error('Unexpected error fetching intervention:', err);
      } finally {
        setLoading(false);
      }
    };

    loadIntervention();

    const ch = supabase
      .channel(`intervention:${interventionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'interventions', filter: `id=eq.${interventionId}` },
        (payload: RealtimePostgresChangesPayload<Intervention>) => {
          if (payload.new) setIntervention(prev => prev ? { ...prev, ...(payload.new as Intervention) } : (payload.new as Intervention));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [interventionId]);

  return { intervention, loading };
}

export function useDriverInterventions(driverId: string | null) {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!driverId) { setLoading(false); return; }
    const { data } = await supabase
      .from('interventions')
      .select('*, mechanic:mechanics(*), panne:pannes(*), paiement:paiements(*)')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });
    setInterventions((data as Intervention[]) || []);
    setLoading(false);
  }, [driverId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { interventions, loading, refetch: fetch };
}

export function useMechanicInterventions(mechanicId: string | null) {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!mechanicId) { setLoading(false); return; }
    const { data } = await supabase
      .from('interventions')
      .select('*, panne:pannes(*), paiement:paiements(*)')
      .eq('mechanic_id', mechanicId)
      .order('created_at', { ascending: false });
    setInterventions((data as Intervention[]) || []);
    setLoading(false);
  }, [mechanicId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { interventions, loading, refetch: fetch };
}

export async function updateInterventionStatut(id: string, statut: InterventionStatut): Promise<void> {
  const update: Record<string, unknown> = { statut };
  if (statut === 'en_route') update.started_at = new Date().toISOString();
  if (statut === 'arrivee') update.arrived_at = new Date().toISOString();
  if (statut === 'terminee') update.completed_at = new Date().toISOString();

  const { error } = await supabase.from('interventions').update(update).eq('id', id);
  if (error) {
    console.error('Failed to update intervention status:', error);
    throw error;
  }
}
