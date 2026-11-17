import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { attendanceApi } from "#src/api/attendance";
import { deviceApi } from "#src/api/devices";
import { BackendApiError } from "#src/api/errors";
import { useAuth } from "#src/contexts/AuthContext";
import { AttendanceRecord, Device } from "#src/types";
import { Colors } from "#src/theme/colors";
import AppHeader from "#src/components/common/AppHeader";
import AppBottomNav from "#src/components/common/AppBottomNav";

export default function StudentDeviceHistoryScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialSubTab = route.params?.initialTab || "device";
  const [subTab, setSubTab] = useState<"device" | "history">(initialSubTab);

  const [devices, setDevices] = useState<Device[]>([]);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    else setLoading(true);
    try {
      setError(null);
      const [devicePage, historyPage] = await Promise.all([
        deviceApi.listMine().catch(() => ({ results: [] })),
        attendanceApi.history().catch(() => ({ results: [] })),
      ]);
      setDevices(devicePage.results || []);
      setHistory(historyPage.results || []);
    } catch (err: any) {
      setError(
        err instanceof BackendApiError
          ? err.message
          : "Unable to load device & history records.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const counts = useMemo(() => {
    return history.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      { PRESENT: 0, LATE: 0, EXCUSED: 0, CHEATING: 0 } as Record<string, number>,
    );
  }, [history]);

  const attendedCount = (counts.PRESENT || 0) + (counts.LATE || 0);
  const ratePct = history.length
    ? Math.round((attendedCount / history.length) * 100)
    : 100;

  const activeDevice = devices.find((d) => d.status === "ACTIVE");

  return (
    <View style={styles.container}>
      <AppHeader
        roleTitle="Student History"
        onNotificationPress={() => {}}
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
        <Text style={styles.pageCategory}>DEVICE & ATTENDANCE RECORDS</Text>
        <Text style={styles.pageTitle}>Security and history</Text>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Colors.secondary} />
            <Text style={styles.loadingText}>Fetching records...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={28} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            {/* Device Security Card */}
            <View style={styles.deviceCard}>
              <View style={styles.deviceHeader}>
                <View style={styles.deviceHeaderLeft}>
                  <Ionicons name="hardware-chip-outline" size={20} color={Colors.secondary} />
                  <Text style={styles.deviceCardTitle}>Authorized Attendance Device</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    activeDevice ? styles.pillReady : styles.pillNotReg,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      activeDevice ? styles.pillReadyText : styles.pillNotRegText,
                    ]}
                  >
                    {activeDevice ? "DEVICE READY" : "NOT REGISTERED"}
                  </Text>
                </View>
              </View>

              {activeDevice ? (
                <View style={styles.deviceDetails}>
                  <View style={styles.deviceRow}>
                    <Text style={styles.deviceLabel}>Device Model:</Text>
                    <Text style={styles.deviceValue}>
                      {activeDevice.device_name || "Registered Mobile Hardware"}
                    </Text>
                  </View>

                  <View style={styles.deviceRow}>
                    <Text style={styles.deviceLabel}>Platform & OS:</Text>
                    <Text style={styles.deviceValue}>
                      {activeDevice.platform.toUpperCase()} •{" "}
                      {activeDevice.os_version || "Native Runtime"}
                    </Text>
                  </View>

                  <View style={styles.deviceRow}>
                    <Text style={styles.deviceLabel}>Identity Key:</Text>
                    <Text style={styles.deviceValueCode}>
                      {activeDevice.device_fingerprint?.slice(0, 16)}...
                    </Text>
                  </View>

                  <View style={styles.noticeBox}>
                    <Ionicons name="shield-checkmark" size={14} color={Colors.secondary} />
                    <Text style={styles.noticeText}>
                      Cryptographic device identity available • Native RSA 2048 key pair
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noDeviceBox}>
                  <Text style={styles.noDeviceText}>
                    No active device is currently registered for attendance. Go to the Attendance tab to register this device.
                  </Text>
                </View>
              )}
            </View>

            {/* Attendance Rate Summary Card */}
            <View style={styles.rateCard}>
              <View style={styles.rateHeader}>
                <View>
                  <Text style={styles.rateSubtitle}>OVERALL ATTENDANCE RATE</Text>
                  <Text style={styles.rateBigText}>{ratePct}%</Text>
                </View>
                <View style={styles.rateBadge}>
                  <Text style={styles.rateBadgeText}>
                    {attendedCount} / {history.length} Attended
                  </Text>
                </View>
              </View>

              {/* Progress Rail */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, Math.max(0, ratePct))}%` },
                  ]}
                />
              </View>

              {/* Breakdown Grid */}
              <View style={styles.rateGrid}>
                <View style={styles.rateGridItem}>
                  <Text style={styles.rateGridVal}>{counts.PRESENT || 0}</Text>
                  <Text style={styles.rateGridLabel}>Present</Text>
                </View>

                <View style={styles.rateGridItem}>
                  <Text style={styles.rateGridVal}>{counts.LATE || 0}</Text>
                  <Text style={styles.rateGridLabel}>Late</Text>
                </View>

                <View style={styles.rateGridItem}>
                  <Text style={styles.rateGridVal}>{counts.EXCUSED || 0}</Text>
                  <Text style={styles.rateGridLabel}>Excused</Text>
                </View>

                <View style={styles.rateGridItem}>
                  <Text style={[styles.rateGridVal, { color: Colors.error }]}>
                    {counts.CHEATING || 0}
                  </Text>
                  <Text style={[styles.rateGridLabel, { color: Colors.error }]}>
                    Invalid
                  </Text>
                </View>
              </View>
            </View>

            {/* Verified History Stream */}
            <View style={styles.historySection}>
              <Text style={styles.historyHeader}>Verified Attendance History</Text>

              {history.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="documents-outline" size={32} color={Colors.onSurfaceVariant} />
                  <Text style={styles.emptyText}>No attendance records logged yet.</Text>
                </View>
              ) : (
                history.map((record) => {
                  const isPresent = record.status === "PRESENT";
                  const isLate = record.status === "LATE";
                  const isExcused = record.status === "EXCUSED";
                  const isCheat = record.status === "CHEATING";

                  return (
                    <View key={record.id} style={styles.historyCard}>
                      <View style={styles.historyCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.historyCourseCode}>
                            {record.course_code}
                          </Text>
                          <Text style={styles.historyDate}>
                            {new Date(record.verified_at).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            •{" "}
                            {new Date(record.verified_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.historyBadge,
                            isPresent
                              ? styles.badgePresent
                              : isLate
                              ? styles.badgeLate
                              : isExcused
                              ? styles.badgeExcused
                              : styles.badgeCheat,
                          ]}
                        >
                          <Text style={styles.historyBadgeText}>
                            {isCheat ? "INVALID" : record.status}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.historyMetaRow}>
                        <Ionicons
                          name="checkmark-done-circle-outline"
                          size={14}
                          color={Colors.onSurfaceVariant}
                        />
                        <Text style={styles.historyMetaText}>
                          Challenge Verified • Session ID #{record.session_id}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>

      <AppBottomNav
        activeTab={subTab}
        role={user?.role}
        onNavigate={(tab) => {
          if (tab === "attendance") navigation.navigate("StudentAttendance");
          else if (tab === "device") setSubTab("device");
          else if (tab === "history") setSubTab("history");
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
    padding: 16,
    paddingBottom: 90,
  },
  pageCategory: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.secondary,
    letterSpacing: 0.5,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.onSurface,
    marginBottom: 16,
  },
  centerBox: {
    padding: 32,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  errorBox: {
    backgroundColor: Colors.errorContainer,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: Colors.onErrorContainer,
    textAlign: "center",
  },
  deviceCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
  },
  deviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  deviceHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  deviceCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pillReady: {
    backgroundColor: "#dcfce7",
  },
  pillNotReg: {
    backgroundColor: Colors.errorContainer,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  pillReadyText: {
    color: "#15803d",
  },
  pillNotRegText: {
    color: Colors.error,
  },
  deviceDetails: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  deviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  deviceValue: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  deviceValueCode: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Platform.OS === 'ios' ? 'Courier' : 'monospace'",
    color: Colors.secondary,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainer,
  },
  noticeText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  noDeviceBox: {
    padding: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 10,
  },
  noDeviceText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  rateCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
  },
  rateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rateSubtitle: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  rateBigText: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.onSurface,
    letterSpacing: -1,
  },
  rateBadge: {
    backgroundColor: Colors.secondaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rateBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.onSecondaryFixed,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.secondary,
    borderRadius: 4,
  },
  rateGrid: {
    flexDirection: "row",
    gap: 8,
  },
  rateGridItem: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
  },
  rateGridVal: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  rateGridLabel: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  historySection: {
    marginTop: 4,
  },
  historyHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.onSurface,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 8,
  },
  historyCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
  },
  historyCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  historyCourseCode: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  historyDate: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePresent: {
    backgroundColor: "#dcfce7",
  },
  badgeLate: {
    backgroundColor: "#fef3c7",
  },
  badgeExcused: {
    backgroundColor: Colors.surfaceContainer,
  },
  badgeCheat: {
    backgroundColor: Colors.errorContainer,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  historyMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerLow,
  },
  historyMetaText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
});
