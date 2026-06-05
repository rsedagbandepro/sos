import { useEffect } from 'react';
import { useConnectivity } from '@/hooks/useConnectivity';
import { processQueue, getQueue, QueuedAction } from '@/lib/offlineQueue';
import { supabase } from '@/lib/supabase';

async function processOfflineAction(action: QueuedAction): Promise<boolean> {
  try {
    if (action.type === 'create_breakdown_request') {
      const { error } = await supabase
        .from('breakdown_requests')
        .insert(action.payload);
      return !error;
    }
    return false;
  } catch {
    return false;
  }
}

export function useOfflineProcessor() {
  const { isOnline } = useConnectivity();

  useEffect(() => {
    if (!isOnline) return;

    processQueue(processOfflineAction);
  }, [isOnline]);
}
