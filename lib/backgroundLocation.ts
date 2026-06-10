import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export const BACKGROUND_LOCATION_TASK = 'background-location-update';
export const MECHANIC_STATE_KEY = 'mechanic_tracking_state';

interface MechanicTrackingState {
  mechanicId: string;
  isAvailable: boolean;
  lastUpdate: string;
}

let isTaskDefined = false;

export function defineBackgroundLocationTask(): void {
  if (isTaskDefined || Platform.OS === 'web') return;

  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error('Background location task error:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    try {
      const stateStr = await AsyncStorage.getItem(MECHANIC_STATE_KEY);
      if (!stateStr) return BackgroundFetch.BackgroundFetchResult.NoData;

      const state: MechanicTrackingState = JSON.parse(stateStr);
      if (!state.isAvailable) return BackgroundFetch.BackgroundFetchResult.NoData;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      await supabase
        .from('mechanics')
        .update({
          latitude,
          longitude,
          updated_at: new Date().toISOString(),
        })
        .eq('id', state.mechanicId);

      await AsyncStorage.setItem(
        MECHANIC_STATE_KEY,
        JSON.stringify({
          ...state,
          lastUpdate: new Date().toISOString(),
        })
      );

      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (err) {
      console.error('Failed to update location in background:', err);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });

  isTaskDefined = true;
}

export async function startBackgroundLocationTracking(
  mechanicId: string,
  isAvailable: boolean
): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  defineBackgroundLocationTask();

  await AsyncStorage.setItem(
    MECHANIC_STATE_KEY,
    JSON.stringify({
      mechanicId,
      isAvailable,
      lastUpdate: new Date().toISOString(),
    } as MechanicTrackingState)
  );

  if (!isAvailable) {
    await stopBackgroundLocationTracking();
    return false;
  }

  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Background location permission not granted');
    return false;
  }

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_LOCATION_TASK, {
        minimumInterval: 10,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
    return true;
  } catch (error) {
    console.error('Failed to register background task:', error);
    return false;
  }
}

export async function stopBackgroundLocationTracking(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch (error) {
    console.error('Failed to stop background tracking:', error);
  }
}

export async function updateTrackingAvailability(isAvailable: boolean): Promise<void> {
  const stateStr = await AsyncStorage.getItem(MECHANIC_STATE_KEY);
  if (!stateStr) return;

  const state: MechanicTrackingState = JSON.parse(stateStr);
  await AsyncStorage.setItem(
    MECHANIC_STATE_KEY,
    JSON.stringify({
      ...state,
      isAvailable,
      lastUpdate: new Date().toISOString(),
    })
  );

  if (isAvailable) {
    await startBackgroundLocationTracking(state.mechanicId, true);
  } else {
    await stopBackgroundLocationTracking();
  }
}

export async function getTrackingState(): Promise<MechanicTrackingState | null> {
  try {
    const stateStr = await AsyncStorage.getItem(MECHANIC_STATE_KEY);
    return stateStr ? JSON.parse(stateStr) : null;
  } catch {
    return null;
  }
}

export async function isBackgroundTrackingActive(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}

export async function forceLocationUpdate(mechanicId: string): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return false;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const { latitude, longitude } = location.coords;

    await supabase
      .from('mechanics')
      .update({
        latitude,
        longitude,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mechanicId);

    const stateStr = await AsyncStorage.getItem(MECHANIC_STATE_KEY);
    if (stateStr) {
      const state: MechanicTrackingState = JSON.parse(stateStr);
      await AsyncStorage.setItem(
        MECHANIC_STATE_KEY,
        JSON.stringify({
          ...state,
          lastUpdate: new Date().toISOString(),
        })
      );
    }

    return true;
  } catch (error) {
    console.error('Failed to force location update:', error);
    return false;
  }
}
