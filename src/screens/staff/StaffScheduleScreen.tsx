import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { attendanceApi } from "#src/api/attendance";
import { BackendApiError } from "#src/api/errors";
import { useAuth } from "#src/contexts/AuthContext";
import { useLocation } from "#src/hooks/useLocation";
import { TodayWork } from "#src/types";
import { Colors } from "#src/theme/colors";
import AppHeader from "#src/components/common/AppHeader";
import AppBottomNav from "#src/components/common/AppBottomNav";

type SessionTypeFilter = "ALL" | "LECTURE" | "LAB" | "TUTORIAL";
type SessionStatusFilter = "ALL" | "ACTIVE" | "OPEN" | "CLOSED";

export default function StaffScheduleScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const { getLocation } = useLocation();
  const [work, setWork] = useState<TodayWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<SessionTypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<SessionStatusFilter>("ALL");

  const load = useCallback(
    async (
      pull = false,
      searchVal = searchQuery,
      typeVal = typeFilter,
      statusVal = statusFilter,
    ) => {
      if (pull) setRefreshing(true);
      else setLoading(true);
      try {
        setError(null);
        const params: { search?: string; session_type?: string; status?: string } = {};
        if (searchVal.trim()) params.search = searchVal.trim();
        if (typeVal !== "ALL") params.session_type = typeVal;
        if (statusVal !== "ALL") params.status = statusVal;

        const data = await attendanceApi.today(
          Object.keys(params).length > 0 ? params : undefined,
        );
        setWork(data);
      } catch (err) {
        setError(
          err instanceof BackendApiError
            ? err.message
            : "Unable to load today's schedule.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchQuery, typeFilter, statusFilter],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      load(false, searchQuery, typeFilter, statusFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, typeFilter, statusFilter, load]);

  const [selectedRadius, setSelectedRadius] = useState<number>(200);

  const handleOpenOccurrence = async (item: TodayWork) => {
    if (!item.occurrence_id || !item.can_open) return;
    setOpeningId(item.occurrence_id);
    try {
      // 1. Native location capture
      const loc = await getLocation();
      if (!loc) {
        Alert.alert(
          "Location Required",
          "Your current mobile location is required to open an attendance session.",
        );
        setOpeningId(null);
        return;
      }

      // 2. POST /attendance/occurrences/{id}/open/
      const session = await attendanceApi.openOccurrence(item.occurrence_id, {
        latitude: loc.latitude,
        longitude: loc.longitude,
        location_accuracy_meters: loc.accuracy,
        location_captured_at: loc.captured_at,
        radius_meters: selectedRadius,
      });

      // 3. Navigate to Live Session
      navigation.navigate("StaffSession", { session });
    } catch (err: any) {
      const msg =
        err instanceof BackendApiError
          ? err.message
          : err.message || "Failed to open session.";
      Alert.alert("Unable to Open Session", msg);
      load();
    } finally {
      setOpeningId(null);
    }
  };

  const counts = useMemo(() => {
    return {
      all: work.length,
      lectures: work.filter((w) => w.session_type === "LECTURE").length,
      labs: work.filter((w) => w.session_type === "LAB").length,
      tutorials: work.filter((w) => w.session_type === "TUTORIAL").length,
      active: work.filter((w) => w.session_status === "ACTIVE").length,
      open: work.filter((w) => w.can_open && w.session_status !== "ACTIVE").length,
      closed: work.filter(
        (w) => w.session_status === "CLOSED" || w.session_status === "EXPIRED",
      ).length,
    };
  }, [work]);

  const filteredWork = work;

  const primaryItem =
    filteredWork.find((w) => w.can_open || w.session_status === "ACTIVE") ||
    filteredWork[0];
  const roleLabel =
    user?.role === "DOCTOR"
      ? "Doctor (Course Owner)"
      : "Teaching Assistant (Lab / Tutorial)";

  return (
    <View style={styles.container}>
      <AppHeader
        roleTitle={user?.role === "DOCTOR" ? "Doctor View" : "TA View"}
        termBadge="Fall 2026"
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
            onRefresh={() => load(true)}
            tintColor={Colors.secondary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome & Staff Summary Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeTopRow}>
            <View style={styles.staffMeta}>
              <Text style={styles.portalTag}>Academic Staff Portal</Text>
              <Text style={styles.staffName}>
                {user?.first_name} {user?.last_name}
              </Text>
              <View style={styles.badgeRow}>
                <View style={styles.chipHigh}>
                  <Text style={styles.chipHighText}>
                    {user?.role === "DOCTOR"
                      ? "Course Owner"
                      : "Teaching Assistant"}
                  </Text>
                </View>
                <View style={styles.chipSec}>
                  <Text style={styles.chipSecText}>
                    Fall 2026 • Active Term
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.avatarBox}>
              <Ionicons
                name="person"
                size={26}
                color={Colors.onPrimaryContainer}
              />
            </View>
          </View>

          {/* Role pill */}
          <View style={styles.roleBar}>
            <View style={styles.roleBarLeft}>
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={Colors.secondary}
              />
              <Text style={styles.roleBarLabel}>Authenticated Role</Text>
            </View>
            <Text style={styles.roleBarBadge}>{roleLabel}</Text>
          </View>

          {/* Date Ribbon */}
          <View style={styles.dateRibbon}>
            <View style={styles.dateRibbonLeft}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={Colors.secondary}
              />
              <Text style={styles.dateRibbonText}>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </View>
            <View style={styles.todayPill}>
              <Text style={styles.todayPillText}>TODAY</Text>
            </View>
          </View>

          {/* Action Row for Ad-hoc session creation */}
          <TouchableOpacity
            style={styles.newSessionBtn}
            onPress={() => navigation.navigate("StaffNewSession")}
            activeOpacity={0.85}
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={Colors.onSecondary}
            />
            <Text style={styles.newSessionBtnText}>
              + Create New Session (Ad-Hoc)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dashboard Search & Filter Bar */}
        {work.length > 0 && (
          <View style={styles.dashboardFilterCard}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={Colors.onSurfaceVariant} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search course, code, or cohort..."
                placeholderTextColor={Colors.onSurfaceVariant}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={18} color={Colors.onSurfaceVariant} />
                </TouchableOpacity>
              )}
            </View>

            {/* Type Filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
            >
              {[
                { key: "ALL", label: `All (${counts.all})` },
                { key: "LECTURE", label: `Lectures (${counts.lectures})` },
                { key: "LAB", label: `Labs (${counts.labs})` },
                { key: "TUTORIAL", label: `Tutorials (${counts.tutorials})` },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.dashFilterPill,
                    typeFilter === tab.key && styles.dashFilterPillActive,
                  ]}
                  onPress={() => setTypeFilter(tab.key as SessionTypeFilter)}
                >
                  <Text
                    style={[
                      styles.dashFilterText,
                      typeFilter === tab.key && styles.dashFilterTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Status Filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
            >
              {[
                { key: "ALL", label: "All Statuses" },
                { key: "ACTIVE", label: `Active Live (${counts.active})` },
                { key: "OPEN", label: `Ready (${counts.open})` },
                { key: "CLOSED", label: `Closed (${counts.closed})` },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.dashStatusPill,
                    statusFilter === tab.key && styles.dashStatusPillActive,
                  ]}
                  onPress={() => setStatusFilter(tab.key as SessionStatusFilter)}
                >
                  <Text
                    style={[
                      styles.dashStatusText,
                      statusFilter === tab.key && styles.dashStatusTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Colors.secondary} />
            <Text style={styles.loadingText}>
              Loading assigned occurrences...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons
              name="alert-circle-outline"
              size={28}
              color={Colors.error}
            />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : work.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="calendar-clear-outline"
              size={36}
              color={Colors.onSurfaceVariant}
            />
            <Text style={styles.emptyTitle}>
              No Occurrences Scheduled Today
            </Text>
            <Text style={styles.emptySub}>
              There are no scheduled lectures or labs for your scope today. You
              can launch an ad-hoc session if needed.
            </Text>
          </View>
        ) : filteredWork.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="search-outline"
              size={36}
              color={Colors.onSurfaceVariant}
            />
            <Text style={styles.emptyTitle}>No Matching Sessions Found</Text>
            <Text style={styles.emptySub}>
              No session occurrences match your current search query "{searchQuery}" or active filters.
            </Text>
            <TouchableOpacity
              style={styles.resetFilterBtn}
              onPress={() => {
                setSearchQuery("");
                setTypeFilter("ALL");
                setStatusFilter("ALL");
              }}
            >
              <Text style={styles.resetFilterBtnText}>Reset All Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sectionGap}>
            {/* Primary Hero Card: Current Scheduled Occurrence */}
            {primaryItem && (
              <View style={styles.heroCard}>
                <View style={styles.heroTopRail} />

                <View style={styles.heroHeader}>
                  <View style={styles.heroTag}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.heroTagText}>
                      {primaryItem.session_status === "ACTIVE"
                        ? "Active Live Session"
                        : "Today's Scheduled Occurrence"}
                    </Text>
                  </View>
                  <View style={styles.heroTiming}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={Colors.secondary}
                    />
                    <Text style={styles.heroTimingText}>
                      {new Date(primaryItem.starts_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>

                <View style={styles.heroCourseInfo}>
                  <View style={styles.heroMetaBadges}>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {primaryItem.session_type}
                      </Text>
                    </View>
                    <Text style={styles.heroMetaSub}>
                      {primaryItem.group_name
                        ? primaryItem.group_name
                        : "All Cohorts"}
                    </Text>
                  </View>
                  <Text style={styles.heroCourseTitle}>
                    {primaryItem.course_name}
                  </Text>
                  <Text style={styles.heroCourseCode}>
                    {primaryItem.course_code}
                  </Text>
                </View>

                {/* Cohort Details */}
                <View style={styles.cohortBox}>
                  <View style={styles.cohortLeft}>
                    <View style={styles.cohortIconBox}>
                      <Ionicons
                        name="people-outline"
                        size={20}
                        color={Colors.secondary}
                      />
                    </View>
                    <View style={styles.cohortTextMeta}>
                      <Text style={styles.cohortLabel}>
                        Target Enrolled Cohort
                      </Text>
                      <Text style={styles.cohortValue}>
                        {primaryItem.group_name || "All Registered Groups"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Dynamic Configured Policies */}
                <View style={styles.policyContainer}>
                  <Text style={styles.policyHeader}>
                    Server-Enforced Attendance Policies
                  </Text>
                  <View style={styles.policyWrap}>
                    <View style={styles.policyPill}>
                      <Ionicons
                        name="navigate-outline"
                        size={14}
                        color={Colors.secondary}
                      />
                      <Text style={styles.policyText}>
                        Radius: {primaryItem.radius_meters || 50} m
                      </Text>
                    </View>
                    <View style={styles.policyPill}>
                      <Ionicons
                        name="timer-outline"
                        size={14}
                        color={Colors.secondary}
                      />
                      <Text style={styles.policyText}>Location Age: ≤300s</Text>
                    </View>
                    <View style={styles.policyPill}>
                      <Ionicons
                        name="finger-print-outline"
                        size={14}
                        color={Colors.secondary}
                      />
                      <Text style={styles.policyText}>Biometric RSA Proof</Text>
                    </View>
                  </View>
                </View>

                {/* Launch / Open Button */}
                {primaryItem.session_id &&
                ["ACTIVE", "CLOSED", "EXPIRED"].includes(
                  primaryItem.session_status || "",
                ) ? (
                  <TouchableOpacity
                    style={styles.heroLaunchBtn}
                    onPress={() =>
                      navigation.navigate("StaffSession", {
                        sessionId: primaryItem.session_id,
                      })
                    }
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={
                        primaryItem.session_status === "ACTIVE"
                          ? "radio-outline"
                          : "create-outline"
                      }
                      size={22}
                      color={Colors.onSecondary}
                    />
                    <Text style={styles.heroLaunchBtnText}>
                      {primaryItem.session_status === "ACTIVE"
                        ? "Open Live Session View"
                        : "Open Attendance Records"}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={Colors.onSecondary}
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.heroLaunchBtn,
                      (!primaryItem.can_open ||
                        openingId === primaryItem.occurrence_id) &&
                        styles.btnDisabled,
                    ]}
                    disabled={
                      !primaryItem.can_open ||
                      openingId === primaryItem.occurrence_id
                    }
                    onPress={() => handleOpenOccurrence(primaryItem)}
                    activeOpacity={0.85}
                  >
                    {openingId === primaryItem.occurrence_id ? (
                      <ActivityIndicator color={Colors.onSecondary} />
                    ) : (
                      <>
                        <Ionicons
                          name="location-outline"
                          size={22}
                          color={Colors.onSecondary}
                        />
                        <Text style={styles.heroLaunchBtnText}>
                          Open Attendance Session
                        </Text>
                        <Ionicons
                          name="arrow-forward"
                          size={18}
                          color={Colors.onSecondary}
                        />
                      </>
                    )}
                  </TouchableOpacity>
                )}
                <Text style={styles.heroHelpNote}>
                  Opener's mobile location is captured automatically as the
                  session anchor.
                </Text>
              </View>
            )}

            {/* List of remaining filtered work items */}
            {filteredWork.length > 1 && (
              <View style={styles.remainingSection}>
                <Text style={styles.sectionHeading}>
                  Other Scheduled Sessions ({filteredWork.length - 1})
                </Text>
                {filteredWork
                  .filter((w) => w !== primaryItem)
                  .map((item, idx) => {
                    const isActive = item.session_status === "ACTIVE";
                    const isClosed =
                      item.session_status === "CLOSED" ||
                      item.session_status === "EXPIRED";
                    const canManageRecords =
                      Boolean(item.session_id) && (isActive || isClosed);
                    return (
                      <View key={idx} style={styles.subCard}>
                        <View style={styles.subCardRow}>
                          <View style={styles.subCardLeft}>
                            <Text style={styles.subCourseCode}>
                              {item.course_code}
                            </Text>
                            <Text style={styles.subCourseName}>
                              {item.course_name}
                            </Text>
                            <Text style={styles.subMeta}>
                              {item.session_type} •{" "}
                              {item.group_name || "All Groups"}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.statusBadge,
                              isActive
                                ? styles.statusActive
                                : isClosed
                                  ? styles.statusClosed
                                  : styles.statusScheduled,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                isActive
                                  ? styles.textActive
                                  : isClosed
                                    ? styles.textClosed
                                    : styles.textScheduled,
                              ]}
                            >
                              {item.session_status || "SCHEDULED"}
                            </Text>
                          </View>
                        </View>

                        {canManageRecords ? (
                          <TouchableOpacity
                            style={styles.subOpenBtn}
                            onPress={() =>
                              navigation.navigate("StaffSession", {
                                sessionId: item.session_id,
                              })
                            }
                          >
                            <Text style={styles.subOpenBtnText}>
                              {isActive
                                ? "View Live Session"
                                : "Open Attendance Records"}
                            </Text>
                          </TouchableOpacity>
                        ) : item.can_open ? (
                          <TouchableOpacity
                            style={styles.subOpenBtn}
                            disabled={openingId === item.occurrence_id}
                            onPress={() => handleOpenOccurrence(item)}
                          >
                            {openingId === item.occurrence_id ? (
                              <ActivityIndicator color={Colors.secondary} />
                            ) : (
                              <Text style={styles.subOpenBtnText}>
                                Open Session
                              </Text>
                            )}
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    );
                  })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <AppBottomNav
        activeTab="schedule"
        role={user?.role}
        onNavigate={(tab) => {
          if (tab === "profile") navigation.navigate("Profile");
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
  welcomeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  welcomeTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  staffMeta: {
    flex: 1,
  },
  portalTag: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  staffName: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.onSurface,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chipHigh: {
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chipHighText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.onSurfaceVariant,
  },
  chipSec: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chipSecText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.secondary,
  },
  avatarBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.secondaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  roleBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  roleBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roleBarLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.onSurface,
  },
  roleBarBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.secondary,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dateRibbon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  dateRibbonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateRibbonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.onSurface,
  },
  todayPill: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  todayPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.onSecondary,
    letterSpacing: 0.6,
  },
  newSessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.secondary,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  newSessionBtnText: {
    color: Colors.onSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  centerBox: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 10,
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
    marginTop: 4,
  },
  retryBtnText: {
    color: Colors.onError,
    fontSize: 12,
    fontWeight: "700",
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
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.onSurface,
    marginTop: 10,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "500",
  },
  resetFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.secondary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 14,
  },
  resetFilterBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.onSecondary,
  },
  dashboardFilterCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.onSurface,
    paddingVertical: 0,
    fontWeight: "500",
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  dashFilterPill: {
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  dashFilterPillActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  dashFilterText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.onSurfaceVariant,
  },
  dashFilterTextActive: {
    color: Colors.onSecondary,
  },
  dashStatusPill: {
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  dashStatusPillActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  dashStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.onSurfaceVariant,
  },
  dashStatusTextActive: {
    color: "#FFFFFF",
  },
  sectionGap: {
    gap: 18,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
    position: "relative",
    overflow: "hidden",
  },
  heroTopRail: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.secondary,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingTop: 4,
  },
  heroTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.secondary,
  },
  heroTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroTiming: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroTimingText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  heroCourseInfo: {
    marginBottom: 14,
  },
  heroMetaBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  typeBadge: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: Colors.onPrimary,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  heroMetaSub: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontWeight: "500",
  },
  heroCourseTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  heroCourseCode: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.secondary,
    marginTop: 2,
  },
  cohortBox: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  cohortLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cohortIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  cohortTextMeta: {
    flex: 1,
  },
  cohortLabel: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontWeight: "500",
  },
  cohortValue: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  policyContainer: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  policyHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  policyWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  policyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  policyText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.onSurface,
  },
  heroLaunchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.secondary,
    borderRadius: 16,
    height: 54,
    gap: 8,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  heroLaunchBtnText: {
    color: Colors.onSecondary,
    fontSize: 15,
    fontWeight: "800",
  },
  heroHelpNote: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
    marginTop: 10,
    fontWeight: "500",
  },
  remainingSection: {
    marginTop: 8,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  subCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  subCardLeft: {
    flex: 1,
  },
  subCourseCode: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.secondary,
  },
  subCourseName: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.onSurface,
    marginVertical: 3,
  },
  subMeta: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: Colors.successContainer,
  },
  statusClosed: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  statusScheduled: {
    backgroundColor: Colors.secondaryContainer,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  textActive: {
    color: Colors.onSuccessContainer,
  },
  textClosed: {
    color: Colors.onSurfaceVariant,
  },
  textScheduled: {
    color: Colors.secondary,
  },
  subOpenBtn: {
    marginTop: 12,
    backgroundColor: Colors.secondaryContainer,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  subOpenBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.secondary,
  },
});

