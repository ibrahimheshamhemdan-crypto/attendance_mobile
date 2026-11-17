import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { attendanceApi } from "#src/api/attendance";
import { studentApi } from "#src/api/students";
import { BackendApiError } from "#src/api/errors";
import { createAttendanceSocket, WebSocketStatus } from "#src/api/websocket";
import {
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  Student,
} from "#src/types";
import { Colors } from "#src/theme/colors";
import AppHeader from "#src/components/common/AppHeader";
import AppBottomNav from "#src/components/common/AppBottomNav";
import { useAuth } from "#src/contexts/AuthContext";

type FilterTab =
  | "ALL"
  | "PRESENT"
  | "NOT_PRESENT"
  | "LATE"
  | "EXCUSED"
  | "CHEATING";

export default function StaffSessionScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const sessionId = route.params?.sessionId || route.params?.session?.id;

  const [session, setSession] = useState<AttendanceSession | null>(
    route.params?.session || null,
  );
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [connection, setConnection] = useState<WebSocketStatus>("CONNECTING");
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (isRefresh = false, searchVal = search, filterVal = activeFilter) => {
      if (!sessionId) {
        setError("No attendance session selected.");
        setLoading(false);
        return;
      }
      if (isRefresh) {
        setRefreshing(true);
      }
      try {
        const sessions = await attendanceApi.sessions().catch(() => ({ results: [] }));
        const freshSession =
          sessions.results?.find((item) => item.id === sessionId) || null;
        
        if (freshSession) {
          setSession((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(freshSession)) {
              return freshSession;
            }
            return prev;
          });
        }

        const groupId = freshSession?.group_id ?? session?.group_id;
        const courseOfferingId = freshSession?.course_offering_id ?? session?.course_offering_id;

        const recordParams: { search?: string; status?: string } = {};
        if (searchVal.trim()) recordParams.search = searchVal.trim();
        if (filterVal !== "ALL" && filterVal !== "NOT_PRESENT") {
          recordParams.status = filterVal;
        }

        const [recordPage, studentPage] = await Promise.all([
          attendanceApi.sessionRecords(
            sessionId,
            Object.keys(recordParams).length > 0 ? recordParams : undefined,
          ),
          studentApi
            .list(
              groupId || undefined,
              courseOfferingId,
              searchVal.trim() || undefined,
            )
            .catch(() => ({ results: [] })),
        ]);
        setRecords(recordPage.results || []);
        setStudents(studentPage.results || []);
        setLastUpdate(new Date().toLocaleTimeString());
        setError(null);
      } catch (err: any) {
        setError(
          err instanceof BackendApiError
            ? err.message
            : "Unable to load live session.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [sessionId, search, activeFilter],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(false, search, activeFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, activeFilter, loadData]);

  useEffect(() => {
    if (!sessionId || session?.status !== "ACTIVE") {
      setConnection("DISCONNECTED");
      return;
    }
    let active = true;
    let handle: Awaited<ReturnType<typeof createAttendanceSocket>> | undefined;

    createAttendanceSocket(sessionId)
      .then((h) => {
        if (!active) {
          h.close();
          return;
        }
        handle = h;
        setConnection(h.status);
        const rmStatus = h.onStatusChange(setConnection);
        const rmEvent = h.onEvent((evt) => {
          setLastUpdate(evt.timestamp || new Date().toISOString());
          if (evt.type === "attendance.update" && evt.record) {
            const rec = evt.record as AttendanceRecord;
            setRecords((prev) =>
              prev.some((r) => r.id === rec.id)
                ? prev.map((r) => (r.id === rec.id ? rec : r))
                : [rec, ...prev],
            );
          }
          if (evt.type === "session.state" && evt.status) {
            setSession((prev) =>
              prev ? { ...prev, status: evt.status as any } : prev,
            );
          }
        });
        return () => {
          rmStatus();
          rmEvent();
        };
      })
      .catch(() => setConnection("DISCONNECTED"));

    return () => {
      active = false;
      handle?.close();
    };
  }, [sessionId, session?.status]);

  const counts = useMemo(() => {
    const present = records.filter((r) => r.status === "PRESENT").length;
    const late = records.filter((r) => r.status === "LATE").length;
    const excused = records.filter((r) => r.status === "EXCUSED").length;
    const cheating = records.filter((r) => r.status === "CHEATING").length;

    const recordMap = new Set(records.map((r) => r.student_id));
    const notPresent = students.filter((s) => !recordMap.has(s.student_id)).length;

    return {
      PRESENT: present,
      LATE: late,
      EXCUSED: excused,
      CHEATING: cheating,
      NOT_PRESENT: notPresent,
    };
  }, [records, students]);

  const distanceSummary = useMemo(() => {
    const values = records
      .map((record) => record.distance_from_location_meters)
      .filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value),
      );

    const nearest = values.length ? Math.min(...values) : null;
    const furthest = values.length ? Math.max(...values) : null;
    const withinRadius = values.filter(
      (value) => value <= (session?.radius_meters || 50),
    ).length;
    const outsideRadius = values.filter(
      (value) => value > (session?.radius_meters || 50),
    ).length;

    return { nearest, furthest, withinRadius, outsideRadius };
  }, [records, session?.radius_meters]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const record = records.find(
        (item) => item.student_id === student.student_id,
      );
      const matchSearch =
        `${student.first_name} ${student.last_name} ${student.student_id}`
          .toLowerCase()
          .includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (activeFilter === "ALL") return true;
      if (activeFilter === "NOT_PRESENT") {
        return !record;
      }
      return record?.status === activeFilter;
    });
  }, [students, records, search, activeFilter]);

  const handleCorrection = (student: Student) => {
    Alert.alert(
      "Manual Correction",
      `Override status for ${student.first_name} ${student.last_name} (ID: ${student.student_id})`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Present",
          onPress: () => applyCorrection(student.id, "PRESENT"),
        },
        {
          text: "Excused",
          onPress: () => applyCorrection(student.id, "EXCUSED"),
        },
        { text: "Late", onPress: () => applyCorrection(student.id, "LATE") },
        {
          text: "Cheating / Invalid",
          style: "destructive",
          onPress: () => applyCorrection(student.id, "CHEATING"),
        },
      ],
    );
  };

  const applyCorrection = async (
    studentId: number,
    status: AttendanceStatus,
  ) => {
    try {
      const updated = await attendanceApi.manualCorrection(sessionId, {
        student_id: studentId,
        status,
        reason: "Staff live roster override",
      });
      setRecords((prev) => {
        const hasRecord = prev.some((r) => r.student_id === updated.student_id);
        return hasRecord
          ? prev.map((r) => (r.student_id === updated.student_id ? updated : r))
          : [updated, ...prev];
      });
    } catch (err: any) {
      const msg =
        err instanceof BackendApiError ? err.message : "Correction rejected.";
      Alert.alert("Correction Rejected", msg);
    }
  };

  const handleCloseSession = () => {
    Alert.alert(
      "Close Attendance Session",
      "Reopening closed sessions is disabled by policy. Are you sure you want to close this session permanently?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close Session",
          style: "destructive",
          onPress: async () => {
            setClosing(true);
            try {
              await attendanceApi.closeSession(sessionId);
              setSession((prev) =>
                prev ? { ...prev, status: "CLOSED" } : prev,
              );
              Alert.alert(
                "Session Closed",
                "Attendance session is now CLOSED.",
              );
            } catch (err: any) {
              const msg =
                err instanceof BackendApiError
                  ? err.message
                  : "Could not close session.";
              Alert.alert("Error", msg);
            } finally {
              setClosing(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader roleTitle="Live Session" />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.loadingText}>
            Connecting to session stream...
          </Text>
        </View>
      </View>
    );
  }

  const isActive = session?.status === "ACTIVE";

  return (
    <View style={styles.container}>
      <AppHeader
        roleTitle={
          user?.role === "DOCTOR" ? "Doctor Live View" : "TA Live View"
        }
        onNotificationPress={() =>
          Alert.alert("Notifications", "No new alerts.")
        }
        onProfilePress={() => navigation.navigate("Profile")}
      />

      <FlatList
        data={error ? [] : filteredStudents}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            colors={[Colors.secondary]}
            tintColor={Colors.secondary}
          />
        }
        ListHeaderComponent={
          error ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={32}
                color={Colors.error}
              />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => loadData(true)}>
                <Text style={styles.retryBtnText}>Retry Loading</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Top Session Overview Card */}
              <View style={styles.overviewCard}>
                <View style={styles.overviewHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.codeRow}>
                      <View style={styles.codePill}>
                        <Text style={styles.codePillText}>
                          {session?.course_code || "CS-304"}
                        </Text>
                      </View>
                      <Text style={styles.typeText}>
                        {session?.session_type} •{" "}
                        {session?.group_name || "All Groups"}
                      </Text>
                    </View>
                    <Text style={styles.courseTitle}>
                      {session?.course_name || "Attendance Session"}
                    </Text>
                  </View>
                </View>

                {/* State Badges Row */}
                <View style={styles.stateGrid}>
                  {/* Session State */}
                  <View
                    style={[
                      styles.stateCard,
                      isActive
                        ? styles.stateActiveBorder
                        : styles.stateClosedBorder,
                    ]}
                  >
                    <View style={styles.stateDotRow}>
                      <View
                        style={[
                          styles.stateDot,
                          isActive ? styles.dotGreen : styles.dotGray,
                        ]}
                      />
                      <Text style={styles.stateTitleText}>SESSION STATE:</Text>
                      <Text
                        style={[
                          styles.stateValueText,
                          isActive ? styles.textGreen : styles.textGray,
                        ]}
                      >
                        {session?.status || "UNKNOWN"}
                      </Text>
                    </View>
                  </View>

                  {/* Connection State */}
                  <View style={[styles.stateCard, styles.stateConnBorder]}>
                    <View style={styles.stateDotRow}>
                      <View
                        style={[
                          styles.stateDot,
                          connection === "CONNECTED"
                            ? styles.dotBlue
                            : connection === "RECONNECTING"
                              ? styles.dotAmber
                              : styles.dotGray,
                        ]}
                      />
                      <Text style={styles.stateTitleText}>WS:</Text>
                      <Text style={[styles.stateValueText, styles.textBlue]}>
                        {connection}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Dedicated Top Close Session Action Card */}
              {isActive && (
                <View style={styles.topControlCard}>
                  <View style={styles.topControlInfo}>
                    <View style={styles.topControlBadge}>
                      <Ionicons
                        name="radio-button-on"
                        size={12}
                        color="#059669"
                      />
                      <Text style={styles.topControlBadgeText}>LIVE SESSION ACTIVE</Text>
                    </View>
                    <Text style={styles.topControlTitle}>Session Control</Text>
                    <Text style={styles.topControlSub}>
                      Close session permanently once check-in finishes.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.topCloseCardBtn}
                    onPress={handleCloseSession}
                    disabled={closing}
                    activeOpacity={0.85}
                  >
                    {closing ? (
                      <ActivityIndicator color={Colors.onError} size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name="lock-closed-outline"
                          size={16}
                          color={Colors.onError}
                        />
                        <Text style={styles.topCloseCardBtnText}>Close Session</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Official Attendance Breakdown Bento Grid */}
              <View style={styles.bentoSection}>
                <View style={styles.bentoHeader}>
                  <Text style={styles.bentoTitle}>
                    Official Attendance Breakdown
                  </Text>
                  <Text style={styles.bentoTotal}>
                    {students.length} Total Enrolled ({records.length} Checked-in)
                  </Text>
                </View>

                <View style={styles.bentoGrid}>
                  {/* 1. Present */}
                  <View style={styles.bentoCard}>
                    <View style={styles.bentoCardTop}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={Colors.onTertiaryContainer}
                      />
                      <View style={styles.pctBadgeGreen}>
                        <Text style={styles.pctTextGreen}>
                          {students.length > 0
                            ? `${Math.round((counts.PRESENT / students.length) * 100)}%`
                            : "0%"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.metricVal}>{counts.PRESENT}</Text>
                    <Text style={styles.metricLabel}>Present</Text>
                  </View>

                  {/* 2. Not Present */}
                  <View style={styles.bentoCard}>
                    <View style={styles.bentoCardTop}>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={Colors.onSurfaceVariant}
                      />
                      <View style={styles.pctBadgeGray}>
                        <Text style={styles.pctTextGray}>
                          {students.length > 0
                            ? `${Math.round((counts.NOT_PRESENT / students.length) * 100)}%`
                            : "0%"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.metricVal, { color: Colors.onSurfaceVariant }]}>
                      {counts.NOT_PRESENT}
                    </Text>
                    <Text style={styles.metricLabel}>Not Present</Text>
                  </View>

                  {/* 3. Late */}
                  <View style={styles.bentoCard}>
                    <View style={styles.bentoCardTop}>
                      <Ionicons name="time" size={18} color="#b45309" />
                      <View style={styles.pctBadgeAmber}>
                        <Text style={styles.pctTextAmber}>
                          {students.length > 0
                            ? `${Math.round((counts.LATE / students.length) * 100)}%`
                            : "0%"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.metricVal}>{counts.LATE}</Text>
                    <Text style={styles.metricLabel}>Late</Text>
                  </View>

                  {/* 4. Excused */}
                  <View style={styles.bentoCard}>
                    <View style={styles.bentoCardTop}>
                      <Ionicons
                        name="medical"
                        size={18}
                        color={Colors.secondary}
                      />
                      <View style={styles.pctBadgeBlue}>
                        <Text style={styles.pctTextBlue}>
                          {students.length > 0
                            ? `${Math.round((counts.EXCUSED / students.length) * 100)}%`
                            : "0%"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.metricVal}>{counts.EXCUSED}</Text>
                    <Text style={styles.metricLabel}>Excused</Text>
                  </View>

                  {/* 5. Cheating / Invalid */}
                  <View style={styles.bentoCard}>
                    <View style={styles.bentoCardTop}>
                      <Ionicons name="ban" size={18} color={Colors.error} />
                      <View style={styles.pctBadgeRed}>
                        <Text style={styles.pctTextRed}>
                          {students.length > 0
                            ? `${Math.round((counts.CHEATING / students.length) * 100)}%`
                            : "0%"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.metricVal, { color: Colors.error }]}>
                      {counts.CHEATING}
                    </Text>
                    <Text style={[styles.metricLabel, { color: Colors.error }]}>
                      Invalid
                    </Text>
                  </View>
                </View>
              </View>

              {/* Distance Verification Summary */}
              <View style={styles.distanceCard}>
                <View style={styles.distanceHeader}>
                  <View style={styles.distanceHeaderTitleRow}>
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color={Colors.secondary}
                    />
                    <Text style={styles.distanceTitle}>
                      Distance Verification
                    </Text>
                  </View>
                  <View style={styles.zonePill}>
                    <Text style={styles.zonePillText}>
                      Radius: {session?.radius_meters || 50} m
                    </Text>
                  </View>
                </View>

                <View style={styles.distanceGrid}>
                  <View style={styles.distanceMetric}>
                    <Text style={styles.distanceMetricLabel}>Nearest</Text>
                    <Text style={styles.distanceMetricValue}>
                      {distanceSummary.nearest !== null
                        ? `${Math.round(distanceSummary.nearest)} m`
                        : "—"}
                    </Text>
                  </View>
                  <View style={styles.distanceMetric}>
                    <Text style={styles.distanceMetricLabel}>Furthest</Text>
                    <Text style={styles.distanceMetricValue}>
                      {distanceSummary.furthest !== null
                        ? `${Math.round(distanceSummary.furthest)} m`
                        : "—"}
                    </Text>
                  </View>
                  <View style={styles.distanceMetric}>
                    <Text style={styles.distanceMetricLabel}>Within</Text>
                    <Text style={styles.distanceMetricValue}>
                      {distanceSummary.withinRadius}
                    </Text>
                  </View>
                  <View style={styles.distanceMetric}>
                    <Text style={styles.distanceMetricLabel}>Outside</Text>
                    <Text
                      style={[styles.distanceMetricValue, styles.outsideValue]}
                    >
                      {distanceSummary.outsideRadius}
                    </Text>
                  </View>
                </View>

                <View style={styles.privacyBar}>
                  <Ionicons
                    name="shield-checkmark"
                    size={16}
                    color={Colors.secondary}
                  />
                  <Text style={styles.privacyText}>
                    Server-side distance from the opening anchor is authoritative.
                    Student check-ins are validated against this exact radius.
                  </Text>
                </View>
              </View>

              {/* Live Roster Stream Header */}
              <View style={styles.rosterCardHeader}>
                <View style={styles.rosterHeader}>
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={Colors.secondary}
                  />
                  <Text style={styles.rosterTitle}>Live Roster Stream</Text>
                </View>

                {/* Search Bar */}
                <View style={styles.searchBar}>
                  <Ionicons
                    name="search"
                    size={18}
                    color={Colors.onSurfaceVariant}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search student name or ID..."
                    placeholderTextColor={Colors.onSurfaceVariant}
                    value={search}
                    onChangeText={setSearch}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch("")}>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={Colors.onSurfaceVariant}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Filter Pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterBar}
                >
                  {(
                    [
                      { key: "ALL", label: `All (${students.length})` },
                      { key: "PRESENT", label: `Present (${counts.PRESENT})` },
                      { key: "NOT_PRESENT", label: `Not Present (${counts.NOT_PRESENT})` },
                      { key: "LATE", label: `Late (${counts.LATE})` },
                      { key: "EXCUSED", label: `Excused (${counts.EXCUSED})` },
                      { key: "CHEATING", label: `Invalid (${counts.CHEATING})` },
                    ] as const
                  ).map((tab) => (
                    <TouchableOpacity
                      key={tab.key}
                      style={[
                        styles.filterPill,
                        activeFilter === tab.key && styles.filterPillActive,
                      ]}
                      onPress={() => setActiveFilter(tab.key)}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          activeFilter === tab.key && styles.filterPillTextActive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </>
          )
        }
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyRoster}>
              <Ionicons
                name="search-outline"
                size={24}
                color={Colors.onSurfaceVariant}
              />
              <Text style={styles.emptyRosterText}>
                No students match "{search || activeFilter}".
              </Text>
              {(search.length > 0 || activeFilter !== "ALL") && (
                <TouchableOpacity
                  style={styles.resetRosterBtn}
                  onPress={() => {
                    setSearch("");
                    setActiveFilter("ALL");
                  }}
                >
                  <Text style={styles.resetRosterBtnText}>
                    Clear Filters
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        renderItem={({ item: student }) => {
          const record = records.find(
            (item) => item.student_id === student.student_id,
          );
          const status = record?.status;
          const isLate = status === "LATE";
          const isCheat = status === "CHEATING";
          return (
            <View
              key={student.id}
              style={[
                styles.studentRow,
                isCheat && styles.studentRowCheat,
              ]}
            >
              <View style={styles.studentMain}>
                <View style={styles.studentAvatar}>
                  <Text style={styles.avatarText}>
                    {`${student.first_name}${student.last_name}`
                      .slice(0, 2)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>
                    {student.first_name} {student.last_name}
                  </Text>
                  <Text style={styles.studentMeta}>
                    ID: {student.student_id}
                    {record
                      ? ` • ${new Date(
                          record.verified_at,
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : ""}
                    {typeof record?.distance_from_location_meters ===
                    "number"
                      ? ` • ${Math.round(record.distance_from_location_meters)}m from anchor`
                      : ""}
                  </Text>
                  <View
                    style={[
                      styles.statusTag,
                      status === "PRESENT"
                        ? styles.tagPresent
                        : isLate
                          ? styles.tagLate
                          : status === "EXCUSED"
                            ? styles.tagExcused
                            : status === "CHEATING"
                              ? styles.tagCheat
                              : styles.tagUnmarked,
                    ]}
                  >
                    <Text style={styles.statusTagText}>
                      {status === "CHEATING"
                        ? "INVALID / CHEATING"
                        : status || "NOT PRESENT"}
                    </Text>
                  </View>
                </View>
              </View>

              {session?.status !== "SCHEDULED" && (
                <TouchableOpacity
                  style={styles.correctBtn}
                  onPress={() => handleCorrection(student)}
                >
                  <Ionicons
                    name="create-outline"
                    size={14}
                    color={Colors.secondary}
                  />
                  <Text style={styles.correctBtnText}>Correct</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListFooterComponent={
          !error && isActive ? (
            <View style={styles.actionDock}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleCloseSession}
                disabled={closing}
                activeOpacity={0.85}
              >
                {closing ? (
                  <ActivityIndicator color={Colors.onError} />
                ) : (
                  <>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={Colors.onError}
                    />
                    <Text style={styles.closeBtnText}>
                      Close Attendance Session
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.dockNote}>
                Session lifecycle: Active → Closed. Reopening closed sessions
                is disabled by policy.
              </Text>
            </View>
          ) : null
        }
      />

      <AppBottomNav
        activeTab=""
        role={user?.role}
        onNavigate={(tab) => {
          if (tab === "schedule") navigation.navigate("StaffSchedule");
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
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
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
  retryBtn: {
    backgroundColor: Colors.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: Colors.onError,
    fontSize: 12,
    fontWeight: "700",
  },
  overviewCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
  },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  reloadBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.secondary,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  codePill: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  codePillText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.onSurfaceVariant,
  },
  typeText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontWeight: "500",
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  topControlCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.2)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  topControlInfo: {
    flex: 1,
  },
  topControlBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  topControlBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.5,
  },
  topControlTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  topControlSub: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  topCloseCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.error,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  topCloseCardBtnText: {
    color: Colors.onError,
    fontSize: 13,
    fontWeight: "800",
  },
  sessionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  stateGrid: {
    flexDirection: "row",
    gap: 8,
  },
  stateCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
  },
  stateActiveBorder: {
    borderLeftColor: Colors.tertiaryFixedDim,
  },
  stateClosedBorder: {
    borderLeftColor: Colors.outlineVariant,
  },
  stateConnBorder: {
    borderLeftColor: Colors.secondary,
  },
  stateDotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: "#10b981",
  },
  dotBlue: {
    backgroundColor: Colors.secondary,
  },
  dotAmber: {
    backgroundColor: "#f59e0b",
  },
  dotGray: {
    backgroundColor: Colors.outline,
  },
  stateTitleText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.onSurfaceVariant,
  },
  stateValueText: {
    fontSize: 11,
    fontWeight: "800",
  },
  textGreen: {
    color: "#059669",
  },
  textBlue: {
    color: Colors.secondary,
  },
  textGray: {
    color: Colors.onSurfaceVariant,
  },
  bentoSection: {
    marginBottom: 16,
  },
  bentoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  bentoTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bentoTotal: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bentoCard: {
    width: "48%",
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
  },
  bentoCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  pctBadgeGreen: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pctTextGreen: {
    fontSize: 9,
    fontWeight: "800",
    color: "#15803d",
  },
  pctBadgeGray: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pctTextGray: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.onSurfaceVariant,
  },
  pctBadgeAmber: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pctTextAmber: {
    fontSize: 9,
    fontWeight: "800",
    color: "#b45309",
  },
  pctBadgeBlue: {
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pctTextBlue: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.secondary,
  },
  pctBadgeRed: {
    backgroundColor: Colors.errorContainer,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pctTextRed: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.error,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.onSurfaceVariant,
  },
  distanceCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
  },
  distanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  distanceHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  distanceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  zonePill: {
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  zonePillText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.onSurfaceVariant,
  },
  distanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  distanceMetric: {
    flexBasis: "48%",
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 12,
  },
  distanceMetricLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  distanceMetricValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.onSurface,
    marginTop: 6,
  },
  outsideValue: {
    color: Colors.error,
  },
  privacyBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 10,
    padding: 10,
  },
  privacyText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    flex: 1,
  },
  rosterCardHeader: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
  },
  rosterCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
  },
  rosterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  rosterTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: Colors.onSurface,
  },
  filterBar: {
    gap: 6,
    paddingBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainer,
  },
  filterPillActive: {
    backgroundColor: Colors.secondary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.onSurfaceVariant,
  },
  filterPillTextActive: {
    color: Colors.onSecondary,
  },
  emptyRoster: {
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyRosterText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
  },
  resetRosterBtn: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  resetRosterBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.onSecondary,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  studentRowCheat: {
    backgroundColor: Colors.errorContainer,
  },
  studentMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  studentMeta: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  statusTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  tagPresent: {
    backgroundColor: "#dcfce7",
  },
  tagLate: {
    backgroundColor: "#fef3c7",
  },
  tagExcused: {
    backgroundColor: Colors.surfaceContainer,
  },
  tagCheat: {
    backgroundColor: Colors.error,
  },
  tagUnmarked: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.onSurface,
  },
  correctBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  correctBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.secondary,
  },
  actionDock: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
  },
  closeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.error,
    borderRadius: 12,
    height: 48,
    gap: 8,
  },
  closeBtnText: {
    color: Colors.onError,
    fontSize: 14,
    fontWeight: "800",
  },
  dockNote: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
    marginTop: 8,
  },
});
