import * as Location from 'expo-location';
import { DEFAULT_LOCATION } from '@/constants/breakdownTypes';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

let lastKnownPosition: Coordinates | null = null;

export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function getCurrentPosition(): Promise<Coordinates> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return DEFAULT_LOCATION;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const coords: Coordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    lastKnownPosition = coords;
    return coords;
  } catch {
    return lastKnownPosition || DEFAULT_LOCATION;
  }
}

export async function watchPosition(
  callback: (coords: Coordinates) => void
): Promise<Location.LocationSubscription | null> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    return await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 50,
      },
      (position) => {
        const coords: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        lastKnownPosition = coords;
        callback(coords);
      }
    );
  } catch {
    return null;
  }
}
