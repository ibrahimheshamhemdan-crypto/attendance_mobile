import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { attendanceApi } from "#src/api/attendance";
import { deviceApi } from "#src/api/devices";
import { BackendApiError } from "#src/api/errors";
import { useAuth } from "#src/contexts/AuthContext";
import { useBiometrics } from "#src/hooks/useBiometrics";
import { useLocation } from "#src/hooks/useLocation";
import { AttendanceResult, Device, TodayWork } from "#src/types";
import { Colors } from "#src/theme/colors";
import AppHeader from "#src/components/common/AppHeader";
import AppBottomNav from "#src/components/common/AppBottomNav";

export default function StudentAttendanceScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const biometrics = useBiometrics();
  const location = useLocation();

  const [sessions, setSessions] = useState<TodayWork[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    else setLoading(true);
    try {
      setError(null);
      const [today, devicePage] = await Promise.all([
        attendanceApi.today(),
        deviceApi.listMine(),
      ]);
      setSessions(today || []);
      setDevices(devicePage.results || []);
    } catch (err: any) {
      setError(
        err instanceof BackendApiError
          ? err.message
          : "Unable to load student attendance.",
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
      setWorking(true);
      const hasBiometrics = await biometrics.checkAvailability();

      if (hasBiometrics) {
        // On biometric-capable devices, require a successful biometric prompt
        // BEFORE generating the key pair — proves user consent at registration.
        const consented = await biometrics.authenticate(
          "Confirm identity to register this device",
        );
        if (!consented) return;
      }
      // On devices without biometrics, skip the prompt entirely.
      // biometric_enrolled: false is baked into the payload by registerDevice().

      const payload = await biometrics.registerDevice();
      await deviceApi.register(payload);
      Alert.alert(
        "Device Registered",
        hasBiometrics
          ? "Device registered successfully for attendance."
          : "Device registered in fingerprint-only mode. Biometrics are not available on this device.",
      );
      await loadData();
    } catch (err: any) {
      const msg = err instanceof BackendApiError ? err.message : err.message;
      Alert.alert("Registration Failed", msg);
    } finally {
      setWorking(false);
    }
  };

  const handleAttend = async (item: TodayWork) => {
    if (!item.session_id) return;
    if (!activeDevice) {
      Alert.alert(
        "Device Required",
        "You must register this device before recording attendance.",
      );
      return;
    }

    try {
      setWorking(true);

      // Step 1: Biometric Auth (only for devices registered with biometrics)
      // Devices with biometric_enrolled=false skip this step — device fingerprint
      // + RSA challenge-sign is the trust anchor for those devices.
      const requiresBiometric =
        activeDevice.biometric_enrolled && !activeDevice.biometric_invalidated;

      if (requiresBiometric) {
        const authenticated = await biometrics.authenticate(
          "Authenticate for attendance check-in",
        );
        if (!authenticated) {
          setWorking(false);
          return;
        }
      }

      // Step 2: Request Challenge
      const challenge = await attendanceApi.requestChallenge(
        item.session_id,
        activeDevice.id,
      );

      // Step 3: Sign Challenge
      const signature = await biometrics.signChallenge(
        challenge.challenge_token,
      );

      // Step 4: One-time Location Capture
      const loc = await location.getLocation();
      if (!loc) {
        Alert.alert(
          "Location Required",
          "One-time location capture is required for attendance validation.",
        );
        setWorking(false);
        return;
      }

      // Step 5: Django Server Validation
      const res = await attendanceApi.checkIn(item.session_id, {
        device_id: activeDevice.id,
        challenge_token: challenge.challenge_token,
        signature,
        latitude: loc.latitude,
        longitude: loc.longitude,
        location_accuracy: loc.accuracy,
        location_timestamp: loc.timestamp,
        mock_location: loc.mocked,
      });

      setResult(res);
      Alert.alert(
        "Attendance Confirmed",
        `Marked ${res.status} for ${res.course_code}.`,
      );
      await loadData();
    } catch (err: any) {
      const msg =
        err instanceof BackendApiError
          ? `${err.message}${err.code ? ` (${err.code})` : ""}`
          : err.message || "Attendance check-in failed.";
      Alert.alert("Attendance Rejected", msg);
    } finally {
      setWorking(false);
    }
  };

  const activeSession = sessions.find((s) => s.session_id && !s.has_checked_in) || sessions[0];

  return (
    <View style={styles.container}>
      <AppHeader
        roleTitle="Student View"
        onNotificationPress={() => Alert.alert("Notifications", "No new notifications.")}
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
        showsVerticalScrollIndicator={false}
      >
        {/* Student Identification Profile Chip */}
        <View style={styles.profileChip}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.studentName}>
                Welcome, {user?.first_name} {user?.last_name}
              </Text>
              <Ionicons name="checkmark-circle" size={16} color={Colors.secondary} />
            </View>
            <Text style={styles.studentSub}>{user?.email}</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>
              {(user?.first_name?.[0] || "") + (user?.last_name?.[0] || "")}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Colors.secondary} />
            <Text style={styles.loadingText}>Checking active attendance windows...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={28} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Primary Active Attendance Card */}
            {activeSession ? (
              <View style={styles.activeSessionCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.happeningPill}>
                    <View style={styles.pingDot} />
                    <Text style={styles.happeningText}>Happening Right Now</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <TouchableOpacity
                      style={styles.reloadPill}
                      onPress={() => loadData(true)}
                      disabled={refreshing}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="refresh-outline"
                        size={13}
                        color={Colors.onPrimary}
                      />
                      <Text style={styles.timerText}>
                        {refreshing ? "Syncing..." : "Reload"}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.timerPill}>
                      <Ionicons name="timer-outline" size={14} color={Colors.onPrimary} />
                      <Text style={styles.timerText}>Active Window</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.courseBlock}>
                  <View style={styles.windowTag}>
                    <Text style={styles.windowTagText}>ACTIVE ATTENDANCE WINDOW</Text>
                  </View>
                  <Text style={styles.courseTitle}>{activeSession.course_name}</Text>
                  <Text style={styles.courseMeta}>
                    {activeSession.session_type} • {activeSession.course_code}
                  </Text>
                </View>

                <View style={styles.scheduleRail}>
                  <Ionicons name="time-outline" size={16} color={Colors.surfaceVariant} />
                  <Text style={styles.railText}>
                    Starts at{" "}
                    {new Date(activeSession.starts_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.noSessionCard}>
                <Ionicons name="sparkles-outline" size={32} color={Colors.secondary} />
                <Text style={styles.noSessionTitle}>No Active Session Right Now</Text>
                <Text style={styles.noSessionSub}>
                  When your instructor or TA opens an attendance session, it will appear here for verification.
                </Text>
                <TouchableOpacity
                  style={styles.noSessionReloadBtn}
                  onPress={() => loadData(true)}
                  disabled={refreshing}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh-outline" size={16} color={Colors.secondary} />
                  <Text style={styles.noSessionReloadText}>
                    {refreshing ? "Checking..." : "Reload Active Sessions"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Hardware Security & Verification Pipeline */}
            <View style={styles.pipelineCard}>
              <View style={styles.pipelineHeader}>
                <View style={styles.pipelineTitleRow}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={Colors.secondary} />
                  <Text style={styles.pipelineTitle}>Security Pipeline</Text>
                </View>
                <Text style={styles.pipelineBadge}>
                  {activeDevice ? "3 of 4 Ready" : "Setup Required"}
                </Text>
              </View>

              {/* Item 1: Device */}
              <View style={styles.pipelineItem}>
                <Ionicons
                  name={activeDevice ? "checkmark-circle" : "alert-circle"}
                  size={20}
                  color={activeDevice ? "#059669" : Colors.error}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>Authorized Attendance Device</Text>
                  <Text style={styles.itemSub}>
                    {activeDevice
                      ? "Registered device identity confirmed"
                      : "Device registration required before checking in"}
                  </Text>
                </View>
              </View>

              {/* Item 2: Location */}
              <View style={styles.pipelineItem}>
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>Location Verification</Text>
                  <Text style={styles.itemSub}>
                    GPS location verified within session radius during check-in
                  </Text>
                </View>
              </View>

              {/* Item 3: Biometrics / Device Fingerprint mode */}
              <View style={styles.pipelineItem}>
                <Ionicons
                  name={
                    activeDevice?.biometric_enrolled
                      ? "finger-print-outline"
                      : "phone-portrait-outline"
                  }
                  size={20}
                  color={Colors.secondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {activeDevice?.biometric_enrolled
                      ? "Biometric Verification"
                      : "Device Fingerprint Mode"}
                  </Text>
                  <Text style={styles.itemSub}>
                    {activeDevice?.biometric_enrolled
                      ? "Verify identity using Face ID or Fingerprint"
                      : "Verified via hardware device fingerprint (no biometrics enrolled)"}
                  </Text>
                </View>
              </View>

              {/* Item 4: Server */}
              <View style={styles.pipelineItem}>
                <Ionicons name="shield-checkmark-outline" size={20} color={Colors.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>Secure Attendance Check</Text>
                  <Text style={styles.itemSub}>
                    Real-time attendance record & location validation
                  </Text>
                </View>
              </View>

              {!activeDevice && (
                <TouchableOpacity
                  style={styles.registerBtn}
                  onPress={handleRegisterDevice}
                  disabled={working}
                >
                  <Text style={styles.registerBtnText}>
                    {working ? "Registering..." : "Register This Device Now"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Attendance Result Status Banner */}
            {result && (
              <View style={styles.resultBanner}>
                <Ionicons name="checkmark-circle" size={24} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultTitle}>Marked {result.status}</Text>
                  <Text style={styles.resultSub}>
                    Recorded for {result.course_code} at{" "}
                    {new Date(result.verified_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            )}

            {/* Primary Interactive Trigger CTA */}
            {activeSession && !activeSession.has_checked_in && (
              <TouchableOpacity
                style={[
                  styles.ctaButton,
                  (working || !activeDevice) && styles.ctaDisabled,
                ]}
                disabled={working || !activeDevice}
                onPress={() => handleAttend(activeSession)}
                activeOpacity={0.85}
              >
                {working ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <>
                    <Ionicons
                      name={
                        activeDevice?.biometric_enrolled
                          ? "finger-print-outline"
                          : "phone-portrait-outline"
                      }
                      size={24}
                      color={Colors.tertiaryFixed}
                    />
                    <Text style={styles.ctaText}>
                      {activeDevice?.biometric_enrolled
                        ? "Attend Now (Biometric Verification)"
                        : "Attend Now (Device Verified)"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Policy Footer */}
            <View style={styles.policyCard}>
              <Ionicons name="navigate-outline" size={20} color={Colors.secondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.policyTitle}>Session Location Policy</Text>
                <Text style={styles.policyText}>
                  Attendance location is captured once during verification. Ensure location services are enabled on your mobile device.
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <AppBottomNav
        activeTab="attendance"
        role={user?.role}
        onNavigate={(tab) => {
          if (tab === "device") navigation.navigate("StudentDevice");
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
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  studentSub: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    fontWeight: "500",
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.secondaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.secondary,
  },
  centerBox: {
    padding: 36,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontWeight: "500",
  },
  errorBox: {
    backgroundColor: Colors.errorContainer,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: Colors.onErrorContainer,
    textAlign: "center",
    fontWeight: "500",
  },
  retryBtn: {
    backgroundColor: Colors.error,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtnText: {
    color: Colors.onError,
    fontSize: 12,
    fontWeight: "700",
  },
  activeSessionCard: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  happeningPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  happeningText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.tertiaryFixed,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  timerText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  courseBlock: {
    marginBottom: 14,
  },
  windowTag: {
    backgroundColor: Colors.secondary,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  windowTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.6,
  },
  courseTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  courseMeta: {
    fontSize: 13,
    color: Colors.onPrimaryContainer,
    marginTop: 3,
    fontWeight: "500",
  },
  scheduleRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    padding: 10,
    borderRadius: 12,
  },
  railText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  reloadPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noSessionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  noSessionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.onSurface,
    marginTop: 10,
    letterSpacing: -0.3,
  },
  noSessionSub: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
    fontWeight: "500",
  },
  noSessionReloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 14,
  },
  noSessionReloadText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.secondary,
  },
  pipelineCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  pipelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  pipelineTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pipelineTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  pipelineBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.secondary,
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pipelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surfaceContainerLow,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  itemSub: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    fontWeight: "500",
  },
  registerBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 8,
  },
  registerBtnText: {
    color: Colors.onSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  resultBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.successContainer,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.tertiaryFixedDim,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.onSuccessContainer,
  },
  resultSub: {
    fontSize: 12,
    color: Colors.onSuccessContainer,
    marginTop: 2,
    fontWeight: "500",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.secondary,
    borderRadius: 18,
    height: 56,
    gap: 10,
    marginBottom: 18,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: Colors.onSecondary,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  policyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  policyText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 3,
    lineHeight: 16,
    fontWeight: "500",
  },
});

