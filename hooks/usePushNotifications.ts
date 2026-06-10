import { useState, useEffect, useCallback, useRef } from 'react';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  registerForPushNotificationsAsync,
  savePushToken,
  setupNotificationHandlers,
  sendLocalNotification,
  PushNotificationData,
} from '@/lib/notifications';
import { getPendingNotifications, markNotificationSent } from '@/lib/notificationQueue';

interface NewPanneAlert {
  panneId: string;
  distanceKm: number;
  categorie: string;
  timestamp: Date;
}

interface UsePushNotificationsOptions {
  mechanicId: string | null;
  onNewPanne?: (alert: NewPanneAlert) => void;
}

export function usePushNotifications({
  mechanicId,
  onNewPanne,
}: UsePushNotificationsOptions) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [newAlert, setNewAlert] = useState<NewPanneAlert | null>(null);
  const isRegisteredRef = useRef(false);

  const registerToken = useCallback(async () => {
    if (!mechanicId || Platform.OS === 'web' || isRegisteredRef.current) return;

    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await savePushToken(mechanicId, token);
        setExpoPushToken(token);
        isRegisteredRef.current = true;
      }
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  }, [mechanicId]);

  const checkPendingNotifications = useCallback(async () => {
    if (!mechanicId) return;

    try {
      const pending = await getPendingNotifications(mechanicId);

      for (const notification of pending) {
        const alert: NewPanneAlert = {
          panneId: notification.panne_id,
          distanceKm: notification.distance_km,
          categorie: notification.categorie || 'other',
          timestamp: new Date(),
        };

        await sendLocalNotification(
          'Nouvelle panne à proximité!',
          `Une panne est signalée à ${notification.distance_km.toFixed(1)} km de vous.`,
          {
            panneId: alert.panneId,
            distanceKm: alert.distanceKm,
            categorie: alert.categorie,
          }
        );

        await markNotificationSent(notification.id);

        if (onNewPanne) {
          onNewPanne(alert);
        } else {
          setNewAlert(alert);
        }
      }
    } catch (error) {
      console.error('Failed to check pending notifications:', error);
    }
  }, [mechanicId, onNewPanne]);

  const handleNewPanne = useCallback(async (data: PushNotificationData) => {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    const alert: NewPanneAlert = {
      panneId: data.panneId,
      distanceKm: data.distanceKm,
      categorie: data.categorie,
      timestamp: new Date(),
    };

    if (onNewPanne) {
      onNewPanne(alert);
    } else {
      setNewAlert(alert);
    }
  }, [onNewPanne]);

  const handleNotificationResponse = useCallback((data: PushNotificationData) => {
    router.push(`/(mechanic)/panne/${data.panneId}`);
  }, []);

  const dismissAlert = useCallback(() => {
    setNewAlert(null);
  }, []);

  const navigateToPanne = useCallback(() => {
    if (newAlert) {
      router.push(`/(mechanic)/panne/${newAlert.panneId}`);
      setNewAlert(null);
    }
  }, [newAlert]);

  useEffect(() => {
    if (!mechanicId) return;

    registerToken();
    checkPendingNotifications();

    const interval = setInterval(checkPendingNotifications, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [mechanicId, registerToken, checkPendingNotifications]);

  useEffect(() => {
    const cleanup = setupNotificationHandlers(handleNewPanne, handleNotificationResponse);

    return cleanup;
  }, [handleNewPanne, handleNotificationResponse]);

  return {
    expoPushToken,
    newAlert,
    dismissAlert,
    navigateToPanne,
    hasNewAlert: newAlert !== null,
  };
}
