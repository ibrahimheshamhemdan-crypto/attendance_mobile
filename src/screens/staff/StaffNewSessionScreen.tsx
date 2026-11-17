import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "#src/contexts/AuthContext";
import { useLocation } from "#src/hooks/useLocation";
import { academicApi } from "#src/api/academic";
import { attendanceApi } from "#src/api/attendance";
import {
  CourseOffering,
  Group,
  SessionType,
  AttendanceSession,
} from "#src/types";
import { Colors } from "#src/theme/colors";

interface StaffNewSessionScreenProps {
  onSessionStarted?: (session: AttendanceSession) => void;
  onCancel?: () => void;
}

export default function StaffNewSessionScreen({
  onSessionStarted,
  onCancel,
}: StaffNewSessionScreenProps) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { isLocating, getCurrentLocation } = useLocation();

  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState<number | null>(
    null,
  );
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>(
    user?.role === "TEACHING_ASSISTANT" ? "LAB" : "LECTURE",
  );
  const [isLoadingAcademic, setIsLoadingAcademic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const isTA = user?.role === "TEACHING_ASSISTANT";

  useEffect(() => {
    loadAcademicData();
  }, []);

  const loadAcademicData = async () => {
    setIsLoadingAcademic(true);
    setErrorMsg(null);
    try {
      const [offeringRes, groupRes] = await Promise.all([
        academicApi.offerings(),
        academicApi.groups(),
      ]);

      const offList = offeringRes.results || [];
      const grpList = groupRes.results || [];

      setOfferings(offList);
      setGroups(grpList);

      if (offList.length > 0) {
        const firstOfferingId = offList[0].id;
        setSelectedOfferingId(firstOfferingId);

        if (user?.role === "TEACHING_ASSISTANT") {
          const availGroups = grpList.filter(
            (g: Group) => g.course_offering === firstOfferingId,
          );
          if (availGroups.length > 0) {
            setSelectedGroupId(availGroups[0].id);
          }
        }
      }
    } catch (err: any) {
      setErrorMsg("Failed to load course options. Please check network.");
    } finally {
      setIsLoadingAcademic(false);
    }
  };

  const filteredGroups = groups.filter(
    (g) => g.course_offering === selectedOfferingId,
  );

  useEffect(() => {
    if (isTA && selectedOfferingId) {
      const avail = groups.filter((g) => g.course_offering === selectedOfferingId);
      if (avail.length > 0) {
        if (!selectedGroupId || !avail.some((g) => g.id === selectedGroupId)) {
          setSelectedGroupId(avail[0].id);
        }
      } else {
        setSelectedGroupId(null);
      }
    }
  }, [selectedOfferingId, groups, isTA]);

  const handleStartSession = async () => {
    if (!selectedOfferingId) {
      setErrorMsg("Please select a Course Offering.");
      return;
    }

    if (isTA && !selectedGroupId) {
      setErrorMsg("Teaching Assistants must select an assigned Group.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setLocationStatus("Capturing native device location...");

    try {
      const loc = await getCurrentLocation();
      setLocationStatus(
        `✓ Location captured (${Math.round(loc.accuracy)}m accuracy)`,
      );

      const payload = {
        course_offering_id: selectedOfferingId,
        group_id: isTA ? selectedGroupId : null,
        session_type: sessionType,
        latitude: loc.latitude,
        longitude: loc.longitude,
        location_accuracy_meters: loc.accuracy,
        location_captured_at: loc.location_captured_at,
        radius_meters: 200,
      };

      const session = await attendanceApi.startAdHocSession(payload);
      if (onSessionStarted) onSessionStarted(session);
      else navigation.navigate("StaffSession", { session });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to start ad-hoc attendance session.";
      setErrorMsg(msg);
      setLocationStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingAcademic) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.secondary} />
        <Text style={styles.loadingText}>Loading Course Scope...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleBox}>
          <Text style={styles.screenTag}>Academic Event Creation</Text>
          <Text style={styles.screenTitle}>Create New Session</Text>
        </View>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onCancel || (() => navigation.goBack())}
        >
          <MaterialIcons name="close" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>

      {errorMsg ? (
        <View style={styles.errorCard}>
          <MaterialIcons name="error-outline" size={20} color={Colors.error} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Course Offering Selector */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Select Course Offering</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedOfferingId}
            onValueChange={(val) => {
              setSelectedOfferingId(Number(val));
              setSelectedGroupId(null);
            }}
            style={styles.picker}
          >
            {offerings.map((off) => (
              <Picker.Item
                key={off.id}
                label={`${off.course_code} — ${off.course_name}`}
                value={off.id}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Group Selector — Shown for Teaching Assistants */}
      {isTA ? (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Select Assigned Section / Group</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedGroupId}
              onValueChange={(val) =>
                setSelectedGroupId(val ? Number(val) : null)
              }
              style={styles.picker}
            >
              {filteredGroups.length === 0 ? (
                <Picker.Item label="No groups assigned for this course" value={null} />
              ) : (
                filteredGroups.map((g) => (
                  <Picker.Item
                    key={g.id}
                    label={`${g.name} (${g.student_count || 0} students)`}
                    value={g.id}
                  />
                ))
              )}
            </Picker>
          </View>
        </View>
      ) : null}

      {/* Session Type Selector */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Session Type</Text>
        <View style={styles.typeRow}>
          {!isTA ? (
            <TouchableOpacity
              style={[
                styles.typeChip,
                sessionType === "LECTURE" && styles.typeChipActive,
              ]}
              onPress={() => setSessionType("LECTURE")}
            >
              <MaterialIcons
                name="school"
                size={18}
                color={
                  sessionType === "LECTURE"
                    ? Colors.onPrimary
                    : Colors.onSurfaceVariant
                }
              />
              <Text
                style={[
                  styles.typeChipText,
                  sessionType === "LECTURE" && styles.typeChipTextActive,
                ]}
              >
                Lecture
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[
              styles.typeChip,
              sessionType === "LAB" && styles.typeChipActive,
            ]}
            onPress={() => setSessionType("LAB")}
          >
            <MaterialIcons
              name="computer"
              size={18}
              color={
                sessionType === "LAB"
                  ? Colors.onPrimary
                  : Colors.onSurfaceVariant
              }
            />
            <Text
              style={[
                styles.typeChipText,
                sessionType === "LAB" && styles.typeChipTextActive,
              ]}
            >
              Lab
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeChip,
              sessionType === "TUTORIAL" && styles.typeChipActive,
            ]}
            onPress={() => setSessionType("TUTORIAL")}
          >
            <MaterialIcons
              name="groups"
              size={18}
              color={
                sessionType === "TUTORIAL"
                  ? Colors.onPrimary
                  : Colors.onSurfaceVariant
              }
            />
            <Text
              style={[
                styles.typeChipText,
                sessionType === "TUTORIAL" && styles.typeChipTextActive,
              ]}
            >
              Tutorial
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Automatic Location Status Indicator */}
      <View style={styles.locationBox}>
        <View style={styles.locationIconBox}>
          <MaterialIcons
            name="my-location"
            size={20}
            color={Colors.secondary}
          />
        </View>
        <View style={styles.locationContent}>
          <Text style={styles.locationTitle}>Session Location Anchor</Text>
          <Text style={styles.locationSub}>
            {locationStatus ||
              "Opener's native mobile location will be captured automatically."}
          </Text>
        </View>
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={[
          styles.startBtn,
          (isSubmitting || isLocating) && styles.startBtnDisabled,
        ]}
        onPress={handleStartSession}
        disabled={isSubmitting || isLocating}
        activeOpacity={0.85}
      >
        {isSubmitting || isLocating ? (
          <ActivityIndicator color={Colors.onPrimary} />
        ) : (
          <>
            <MaterialIcons name="sensors" size={22} color={Colors.onPrimary} />
            <Text style={styles.startBtnText}>Start & Open Live Session</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginTop: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleBox: {},
  screenTag: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.errorContainer,
    padding: 12,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.onSurface,
  },
  pickerWrapper: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    color: Colors.onSurface,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  typeChipActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.onSurfaceVariant,
  },
  typeChipTextActive: {
    color: Colors.onPrimary,
  },
  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surfaceContainerLow,
    padding: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  locationIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  locationContent: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.onSurface,
  },
  locationSub: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.secondary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    elevation: 2,
  },
  startBtnDisabled: {
    opacity: 0.7,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.onPrimary,
  },
});
