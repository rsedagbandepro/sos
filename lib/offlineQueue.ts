import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'sos_panne_offline_queue';

export interface QueuedAction {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  retries: number;
}

export async function enqueueAction(
  type: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const queue = await getQueue();
    const action: QueuedAction = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      type,
      payload,
      createdAt: new Date().toISOString(),
      retries: 0,
    };
    queue.push(action);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage failure — action is lost, but app continues
  }
}

export async function getQueue(): Promise<QueuedAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function removeAction(id: string): Promise<void> {
  try {
    const queue = await getQueue();
    const filtered = queue.filter((a) => a.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  } catch {
    // Storage failure
  }
}

export async function processQueue(
  processor: (action: QueuedAction) => Promise<boolean>
): Promise<void> {
  const queue = await getQueue();
  for (const action of queue) {
    try {
      const success = await processor(action);
      if (success) {
        await removeAction(action.id);
      } else {
        // Increment retry count
        action.retries += 1;
        if (action.retries > 5) {
          await removeAction(action.id);
        }
      }
    } catch {
      // Will retry next time
    }
  }
}
