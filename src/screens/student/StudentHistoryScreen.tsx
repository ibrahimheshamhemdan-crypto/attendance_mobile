import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { attendanceApi } from "#src/api/attendance";
import { BackendApiError } from "#src/api/errors";
import { useAuth } from "#src/contexts/AuthContext";
import { AttendanceRecord } from "#src/types";
import { Colors } from "#src/theme/colors";
import AppHeader from "#src/components/common/AppHeader";
import AppBottomNav from "#src/components/common/AppBottomNav";

export default function StudentHistoryScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    else setLoading(true);
    try {
      setError(null);
      const historyPage = await attendanceApi.history();
      setHistory(historyPage.results || []);
    } catch (err: any) {
      setError(
        err instanceof BackendApiError
          ? err.message
          : "Unable to load attendance history records.",
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
      { PRESENT: 0, LATE: 0, EXCUSED: 0, CHEATING: 0 } as Record<
        string,
        number
      >,
    );
  }, [history]);

  const total = history.length;
  const attended = (counts.PRESENT || 0) + (counts.LATE || 0);
  const ratePct = total > 0 ? Math.round((attended / total) * 100) : 0;

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
      >
        <View style={styles.titleSection}>
          <Text style={styles.screenTag}>HISTORICAL ATTENDANCE LOGS</Text>
          <Text style={styles.screenTitle}>Attendance History</Text>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Colors.secondary} />
          </View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : (
          <>
            {/* Performance Summary Card */}
            <View style={styles.rateCard}>
              <View style={styles.rateHeader}>
                <View>
                  <Text style={styles.rateSubtitle}>OVERALL ATTENDANCE RATE</Text>
                  <Text style={styles.rateBigText}>{ratePct}%</Text>
                </View>
                <View style={styles.rateBadge}>
                  <Text style={styles.rateBadgeText}>{attended} / {total} Attended</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${ratePct}%` }]} />
              </View>

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
                  <Text style={styles.rateGridVal}>{counts.CHEATING || 0}</Text>
                  <Text style={styles.rateGridLabel}>Invalid</Text>
                </View>
              </View>
            </View>

            {/* History List */}
            <View style={styles.historySection}>
              <Text style={styles.historyHeader}>Recent Attendance Logs</Text>
              {history.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="calendar-outline" size={32} color={Colors.onSurfaceVariant} />
                  <Text style={styles.emptyText}>No attendance records found yet.</Text>
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
                            {record.course_code || `Session #${record.session_id}`}
                          </Text>
                          <Text style={styles.historyDate}>
                            {new Date(record.verified_at).toLocaleDateString(undefined, {
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
                          {record.distance_from_location_meters !== undefined && record.distance_from_location_meters !== null
                            ? ` • ${Math.round(record.distance_from_location_meters)}m distance`
                            : ""}
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
        activeTab="history"
        role={user?.role}
        onNavigate={(tab) => {
          if (tab === "attendance") navigation.navigate("StudentAttendance");
          else if (tab === "device") navigation.navigate("StudentDevice");
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
  rateCard: {
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
  rateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  rateSubtitle: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.6,
  },
  rateBigText: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.onSurface,
    letterSpacing: -1.2,
  },
  rateBadge: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  rateBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.secondary,
  },
  progressTrack: {
    height: 10,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.secondary,
    borderRadius: 5,
  },
  rateGrid: {
    flexDirection: "row",
    gap: 8,
  },
  rateGridItem: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  rateGridVal: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  rateGridLabel: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    fontWeight: "600",
  },
  historySection: {
    marginTop: 4,
  },
  historyHeader: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  historyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  historyCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historyCourseCode: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  historyDate: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    fontWeight: "500",
  },
  historyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePresent: {
    backgroundColor: Colors.successContainer,
  },
  badgeLate: {
    backgroundColor: Colors.warningContainer,
  },
  badgeExcused: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  badgeCheat: {
    backgroundColor: Colors.errorContainer,
  },
  historyBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  historyMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
  },
  historyMetaText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontWeight: "500",
  },
});

