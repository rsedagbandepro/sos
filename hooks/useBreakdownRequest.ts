import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { BreakdownRequest, RequestStatus } from '@/lib/types';

interface UseBreakdownRequestResult {
  request: BreakdownRequest | null;
  loading: boolean;
  error: string | null;
}

export function useBreakdownRequest(
  requestId: string | null
): UseBreakdownRequestResult {
  const [request, setRequest] = useState<BreakdownRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequest = useCallback(async () => {
    if (!requestId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('breakdown_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setRequest(data as BreakdownRequest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  useEffect(() => {
    if (!requestId) return;

    const channel = supabase
      .channel(`breakdown_request:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'breakdown_requests',
          filter: `id=eq.${requestId}`,
        },
        (payload: RealtimePostgresChangesPayload<BreakdownRequest>) => {
          if (payload.new) {
            setRequest(payload.new as BreakdownRequest);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId]);

  return { request, loading, error };
}

export function useDriverRequests(driverPhone: string) {
  const [requests, setRequests] = useState<BreakdownRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const { data } = await supabase
          .from('breakdown_requests')
          .select('*')
          .eq('driver_phone', driverPhone)
          .order('created_at', { ascending: false });

        setRequests((data as BreakdownRequest[]) || []);
      } catch {
        // Silently fail, show empty state
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [driverPhone]);

  return { requests, loading };
}

export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus,
  mechanicId?: string
) {
  const update: Record<string, unknown> = { status };
  if (mechanicId) update.accepted_by = mechanicId;

  const { data, error } = await supabase
    .from('breakdown_requests')
    .update(update)
    .eq('id', requestId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as BreakdownRequest;
}
