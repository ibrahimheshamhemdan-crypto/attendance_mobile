import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { deviceApi } from "#src/api/devices";
import { BackendApiError } from "#src/api/errors";
import { useAuth } from "#src/contexts/AuthContext";
import { useBiometrics } from "#src/hooks/useBiometrics";
import { Device } from "#src/types";
import { Colors } from "#src/theme/colors";
import AppHeader from "#src/components/common/AppHeader";
import AppBottomNav from "#src/components/common/AppBottomNav";

export default function StudentDeviceScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const biometrics = useBiometrics();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    else setLoading(true);
    try {
      setError(null);
      const devicePage = await deviceApi.listMine();
      setDevices(devicePage.results || []);
    } catch (err: any) {
      setError(
        err instanceof BackendApiError
          ? err.message
          : "Unable to load device records.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeDevice = devices.find((d) => d.status === "ACTIVE");

  const handleRegisterDevice = async () => {
    try {
      setRegistering(true);
      const available = await biometrics.checkAvailability();
      if (!available) {
        Alert.alert(
          "Biometrics Not Available",
          "Native local authentication is required on this device.",
        );
        return;
      }
      const payload = await biometrics.registerDevice();
      await deviceApi.register(payload);
      Alert.alert(
        "Device Registered",
        "Device registered successfully for attendance.",
      );
      await loadData();
    } catch (err: any) {
      const msg = err instanceof BackendApiError ? err.message : err.message;
      Alert.alert("Registration Failed", msg);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        roleTitle="Student View"
        onNotificationPress={() =>
          Alert.alert("Notifications", "No new notifications.")
        }
        onProfilePress={() => navigation.navigate("Profile")}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={Colors.secondary}
          />
        }
      >
        <View style={styles.titleSection}>
          <Text style={styles.screenTag}>
            HARDWARE SECURITY & BOUND IDENTITY
          </Text>
          <Text style={styles.screenTitle}>Registered Device</Text>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Colors.secondary} />
          </View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="alert-circle-outline"
              size={32}
              color={Colors.error}
            />
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : (
          <>
            {/* Active Registered Device Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <Ionicons
                    name="hardware-chip-outline"
                    size={24}
                    color={Colors.secondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {activeDevice?.device_name || "Current Mobile Device"}
                  </Text>
                  <Text style={styles.cardSub}>
                    {activeDevice
                      ? `Registered on ${new Date(activeDevice.registered_at).toLocaleDateString()}`
                      : "No Active Device Bound"}
                  </Text>
                </View>
                {activeDevice && (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>ACTIVE</Text>
                  </View>
                )}
              </View>

              {activeDevice ? (
                <View style={styles.deviceDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Device Name</Text>
                    <Text style={styles.detailVal}>
                      {activeDevice.device_name || "Current Mobile Device"}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>OS & Platform</Text>
                    <Text style={styles.detailVal}>
                      {activeDevice.platform.toUpperCase()}{" "}
                      {activeDevice.os_version || "Unknown OS"}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Key Pair Status</Text>
                    <Text style={styles.detailVal}>
                      Hardware Protected Key Bound
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Device ID</Text>
                    <Text style={styles.detailVal}>#{activeDevice.id}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noDeviceBox}>
                  <Text style={styles.noDeviceText}>
                    You do not have an active registered device. Register this
                    phone to proceed with biometric attendance check-in.
                  </Text>
                  <TouchableOpacity
                    style={styles.registerBtn}
                    onPress={handleRegisterDevice}
                    disabled={registering}
                  >
                    {registering ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons
                          name="finger-print-outline"
                          size={18}
                          color="#fff"
                        />
                        <Text style={styles.registerBtnText}>
                          Register This Device
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Device Policy Summary */}
            <View style={styles.infoBox}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={Colors.secondary}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>1-Device Security Policy</Text>
                <Text style={styles.infoSub}>
                  Each student account is cryptographically bound to one
                  registered mobile phone. Device replacement requires
                  Organization Admin authorization.
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <AppBottomNav
        activeTab="device"
        role={user?.role}
        onNavigate={(tab) => {
          if (tab === "attendance") navigation.navigate("StudentAttendance");
          else if (tab === "history") navigation.navigate("StudentHistory");
          else if (tab === "profile") navigation.navigate("Profile");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 120,
  },
  titleSection: {
    marginBottom: 18,
  },
  screenTag: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.secondary,
    letterSpacing: 0.8,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.onSurface,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  centerBox: {
    padding: 40,
    alignItems: "center",
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 10,
    fontWeight: "500",
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.secondaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  cardSub: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    fontWeight: "500",
  },
  statusBadge: {
    backgroundColor: Colors.successContainer,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.onSuccessContainer,
  },
  deviceDetails: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontWeight: "500",
  },
  detailVal: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  noDeviceBox: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
  },
  noDeviceText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 14,
    fontWeight: "500",
  },
  registerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  registerBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  infoBox: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  infoSub: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 3,
    lineHeight: 16,
    fontWeight: "500",
  },
});

