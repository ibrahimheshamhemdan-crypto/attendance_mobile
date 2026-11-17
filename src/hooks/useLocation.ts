import { useState } from "react";
import * as Location from "expo-location";

export function useLocation() {
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const getCurrentLocation = async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        const err = "Permission to access location was denied";
        setLocationError(err);
        throw new Error(err);
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const accuracyVal = location.coords.accuracy || 10.0;
      const isoTimestamp = new Date(location.timestamp).toISOString();

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: accuracyVal,
        accuracy_m: accuracyVal,
        location_accuracy_meters: accuracyVal,
        location_captured_at: isoTimestamp,
        captured_at: isoTimestamp,
        timestamp: location.timestamp / 1000,
        mocked: location.mocked || false,
      };
    } catch (err: any) {
      setLocationError(err.message || "Failed to capture location");
      throw err;
    } finally {
      setIsLocating(false);
    }
  };

  return {
    isLocating,
    locationError,
    getCurrentLocation,
    getLocation: getCurrentLocation,
  };
}
