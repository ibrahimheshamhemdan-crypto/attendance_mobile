import { useState } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import {
  generateAndStoreKeyPair,
  signChallenge,
  getPublicKey,
  clearKeys,
} from "#src/utils/crypto";
import * as Device from "expo-device";
import * as Application from "expo-application";
import * as SecureStore from "expo-secure-store";
import { DeviceRegistration } from "#src/types";

export function useBiometrics() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const getDeviceFingerprint = async (): Promise<string> => {
    let fingerprint = "";
    if (Device.osName === "Android") {
      fingerprint = Application.getAndroidId() || "";
    } else if (Device.osName === "iOS") {
      fingerprint = (await Application.getIosIdForVendorAsync()) || "";
    }

    // Fallback or caching logic
    let storedFingerprint = await SecureStore.getItemAsync(
      "bio_device_fingerprint",
    );
    if (!storedFingerprint) {
      storedFingerprint =
        fingerprint ||
        `${Device.osBuildId || "dev"}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      await SecureStore.setItemAsync(
        "bio_device_fingerprint",
        storedFingerprint,
      );
    }

    // Always prefer OS ID if available, otherwise fallback
    return fingerprint || storedFingerprint;
  };

  const checkAvailability = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  };

  const authenticate = async (
    promptMessage: string = "Authenticate for Attendance",
  ) => {
    setIsAuthenticating(true);
    try {
      const isAvailable = await checkAvailability();
      if (!isAvailable) {
        throw new Error(
          "Biometric authentication is not set up on this device.",
        );
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: "Use Passcode",
        disableDeviceFallback: false,
      });

      if (!result.success) {
        throw new Error(result.error || "Authentication failed");
      }

      return true;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const registerDevice = async (): Promise<DeviceRegistration> => {
    try {
      const publicKey = await generateAndStoreKeyPair();
      const deviceName =
        Device.deviceName ||
        `${Device.brand || ""} ${Device.modelName || "Device"}`.trim();
      const platform: DeviceRegistration["platform"] =
        Device.osName === "iOS"
          ? "ios"
          : Device.osName === "Android"
            ? "android"
            : "unknown";
      const osVersion = Device.osVersion || "Unknown";

      const fingerprint = await getDeviceFingerprint();

      // Capture biometric availability at registration time so the server
      // knows whether to expect biometric-gated check-ins from this device.
      const biometricEnrolled = await checkAvailability();

      return {
        device_fingerprint: fingerprint,
        public_key: publicKey,
        platform,
        device_name: deviceName,
        os_version: osVersion,
        biometric_enrolled: biometricEnrolled,
      };
    } catch (e: any) {
      throw new Error(e.message || "Failed to generate device key pair");
    }
  };

  return {
    isAuthenticating,
    checkAvailability,
    authenticate,
    getDeviceFingerprint,
    registerDevice,
    signChallenge,
    getPublicKey,
    clearKeys,
  };
}
