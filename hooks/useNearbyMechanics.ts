import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Mechanic } from '@/lib/types';
import { SEARCH_RADIUS_KM } from '@/constants/breakdownTypes';

interface NearbyMechanicsResult {
  mechanics: Mechanic[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useNearbyMechanics(
  latitude: number,
  longitude: number,
  radiusKm: number = SEARCH_RADIUS_KM
): NearbyMechanicsResult {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMechanics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        'nearby_mechanics',
        {
          p_latitude: latitude,
          p_longitude: longitude,
          p_radius_km: radiusKm,
        }
      );

      if (rpcError) throw rpcError;
      setMechanics((data as Mechanic[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, radiusKm]);

  useEffect(() => {
    fetchMechanics();
  }, [fetchMechanics]);

  return { mechanics, loading, error, refetch: fetchMechanics };
}
