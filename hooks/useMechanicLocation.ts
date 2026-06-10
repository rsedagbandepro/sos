import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  updateTrackingAvailability,
  getTrackingState,
  forceLocationUpdate,
  isBackgroundTrackingActive,
} from '@/lib/backgroundLocation';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  lastUpdate: Date | null;
  isTracking: boolean;
  error: string | null;
}

interface MechanicData {
  id: string;
  is_available: boolean;
  latitude: number;
  longitude: number;
}

export function useMechanicLocation(mechanic: MechanicData | null) {
  const [locationState, setLocationState] = useState<LocationState>({
    latitude: mechanic?.latitude ?? null,
    longitude: mechanic?.longitude ?? null,
    lastUpdate: null,
    isTracking: false,
    error: null,
  });

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const mechanicIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (mechanic?.id) {
      mechanicIdRef.current = mechanic.id;
      setLocationState((prev) => ({
        ...prev,
        latitude: mechanic.latitude,
        longitude: mechanic.longitude,
      }));
    }
  }, [mechanic]);

  const startForegroundTracking = useCallback(async () => {
    if (Platform.OS === 'web' || !mechanicIdRef.current) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationState((prev) => ({
          ...prev,
          error: 'Permission de localisation refusée',
        }));
        return;
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 50,
        },
        async (position) => {
          const { latitude, longitude } = position.coords;

          await supabase
            .from('mechanics')
            .update({
              latitude,
              longitude,
              updated_at: new Date().toISOString(),
            })
            .eq('id', mechanicIdRef.current!);

          setLocationState((prev) => ({
            ...prev,
            latitude,
            longitude,
            lastUpdate: new Date(),
          }));
        }
      );
    } catch (error) {
      console.error('Failed to start foreground tracking:', error);
      setLocationState((prev) => ({
        ...prev,
        error: 'Erreur de suivi GPS',
      }));
    }
  }, []);

  const stopForegroundTracking = useCallback(() => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  }, []);

  const initializeTracking = useCallback(async () => {
    if (!mechanicIdRef.current || Platform.OS === 'web') return;

    const isTracking = await isBackgroundTrackingActive();
    setLocationState((prev) => ({ ...prev, isTracking }));

    if (mechanic?.is_available) {
      const state = await getTrackingState();
      if (state?.mechanicId === mechanicIdRef.current) {
        if (state.lastUpdate) {
          setLocationState((prev) => ({
            ...prev,
            lastUpdate: new Date(state.lastUpdate),
          }));
        }
      }

      await startBackgroundLocationTracking(mechanicIdRef.current, true);
      await startForegroundTracking();
      setLocationState((prev) => ({ ...prev, isTracking: true }));
    }
  }, [mechanic?.is_available, startForegroundTracking]);

  const toggleAvailability = useCallback(
    async (isAvailable: boolean) => {
      if (!mechanicIdRef.current) return;

      try {
        await supabase
          .from('mechanics')
          .update({ is_available: isAvailable })
          .eq('id', mechanicIdRef.current);

        if (isAvailable) {
          await startBackgroundLocationTracking(mechanicIdRef.current, true);
          await startForegroundTracking();
          setLocationState((prev) => ({ ...prev, isTracking: true }));
        } else {
          await stopBackgroundLocationTracking();
          stopForegroundTracking();
          setLocationState((prev) => ({ ...prev, isTracking: false }));
        }
      } catch (error) {
        console.error('Failed to toggle availability:', error);
        setLocationState((prev) => ({
          ...prev,
          error: 'Erreur lors du changement de disponibilité',
        }));
      }
    },
    [startForegroundTracking, stopForegroundTracking]
  );

  const forceUpdate = useCallback(async () => {
    if (!mechanicIdRef.current) return false;

    const success = await forceLocationUpdate(mechanicIdRef.current);
    if (success) {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocationState((prev) => ({
        ...prev,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        lastUpdate: new Date(),
        error: null,
      }));
    }
    return success;
  }, []);

  useEffect(() => {
    initializeTracking();

    return () => {
      stopForegroundTracking();
    };
  }, [initializeTracking, stopForegroundTracking]);

  useEffect(() => {
    if (mechanic?.is_available === undefined) return;

    updateTrackingAvailability(mechanic.is_available);
  }, [mechanic?.is_available]);

  return {
    ...locationState,
    toggleAvailability,
    forceUpdate,
    isAvailable: mechanic?.is_available ?? false,
  };
}
