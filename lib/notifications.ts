import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const PUSH_TOKEN_KEY = 'push_token';

export interface PushNotificationData {
  panneId: string;
  distanceKm: number;
  categorie: string;
}

function isPermissionGranted(status: Notifications.NotificationPermissionsStatus): boolean {
  return (
    (status.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED) ||
    (status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) ||
    (status.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL) ||
    (Platform.OS === 'android' && 'granted' in status && status.granted === true)
  );
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  const permissions = await Notifications.getPermissionsAsync();

  let hasPermission = false;
  if (Platform.OS === 'ios' && permissions.ios) {
    hasPermission = permissions.ios.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      permissions.ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  } else if (Platform.OS === 'android') {
    hasPermission = 'granted' in permissions && permissions.granted === true;
  }

  if (!hasPermission) {
    const requested = await Notifications.requestPermissionsAsync();
    if (Platform.OS === 'ios' && requested.ios) {
      hasPermission = requested.ios.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
        requested.ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    } else if (Platform.OS === 'android') {
      hasPermission = 'granted' in requested && requested.granted === true;
    }
  }

  if (!hasPermission) {
    console.warn('Push notification permission not granted');
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'sos-panne',
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('urgent', {
        name: 'Alertes Urgentes',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });

      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

export async function savePushToken(mechanicId: string, token: string): Promise<void> {
  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

  await supabase
    .from('push_tokens')
    .upsert(
      {
        mechanic_id: mechanicId,
        token,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'mechanic_id,token' }
    );

  await AsyncStorage.setItem(PUSH_TOKEN_KEY, JSON.stringify({ mechanicId, token }));
}

export async function getStoredPushToken(): Promise<{ mechanicId: string; token: string } | null> {
  try {
    const stored = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export async function removePushToken(mechanicId: string, token: string): Promise<void> {
  await supabase
    .from('push_tokens')
    .delete()
    .eq('mechanic_id', mechanicId)
    .eq('token', token);

  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
}

function parseNotificationData(data: unknown): PushNotificationData | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (typeof record.panneId === 'string' && typeof record.distanceKm === 'number' && typeof record.categorie === 'string') {
    return {
      panneId: record.panneId,
      distanceKm: record.distanceKm,
      categorie: record.categorie,
    };
  }
  return null;
}

export function setupNotificationHandlers(
  onNotificationReceived: (data: PushNotificationData) => void,
  onNotificationResponse: (data: PushNotificationData) => void
): () => void {
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    const data = parseNotificationData(notification.request.content.data);
    if (data) {
      onNotificationReceived(data);
    }
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = parseNotificationData(response.notification.request.content.data);
    if (data) {
      onNotificationResponse(data);
    }
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

export async function sendLocalNotification(
  title: string,
  body: string,
  data: PushNotificationData
): Promise<void> {
  const notificationData: Record<string, unknown> = {
    panneId: data.panneId,
    distanceKm: data.distanceKm,
    categorie: data.categorie,
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: notificationData,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: null,
  });
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  data: PushNotificationData,
  seconds: number
): Promise<void> {
  const notificationData: Record<string, unknown> = {
    panneId: data.panneId,
    distanceKm: data.distanceKm,
    categorie: data.categorie,
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: notificationData,
      sound: 'default',
    },
    trigger: {
      seconds,
      channelId: 'urgent',
    },
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
