import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "#src/contexts/AuthContext";
import { Colors } from "#src/theme/colors";

interface AppHeaderProps {
  roleTitle?: string;
  termBadge?: string;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

export default function AppHeader({
  roleTitle,
  termBadge = "Fall 2026",
  onProfilePress,
}: AppHeaderProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const getRoleLabel = () => {
    if (user?.role === "DOCTOR") return "Doctor View";
    if (user?.role === "TEACHING_ASSISTANT") return "TA View";
    if (user?.role === "STUDENT") return "Student View";
    return "Staff View";
  };

  const getInitials = () => {
    if (!user) return "U";
    const fn = user.first_name?.[0] || "";
    const ln = user.last_name?.[0] || "";
    return (fn + ln).toUpperCase() || "U";
  };

  return (
    <View
      style={[
        styles.headerContainer,
        { paddingTop: Math.max(insets.top + 6, 14) },
      ]}
    >
      <View style={styles.leftSection}>
        <View style={styles.logoChip}>
          <MaterialIcons name="school" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.titleColumn}>
          <View style={styles.titleRow}>
            <Text style={styles.appName}>UniAttend</Text>
            <View style={styles.semesterBadge}>
              <Text style={styles.semesterText}>{termBadge}</Text>
            </View>
          </View>
          <View style={styles.roleRow}>
            <View style={styles.activeDot} />
            <Text style={styles.roleText}>{roleTitle || getRoleLabel()}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.avatarButton}
        onPress={onProfilePress}
        activeOpacity={0.8}
        accessibilityLabel="User Profile"
      >
        <Text style={styles.avatarText}>{getInitials()}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    minHeight: 64,
    paddingHorizontal: 18,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
    paddingBottom: 10,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  titleColumn: {
    flexDirection: "column",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  appName: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.onSurface,
    letterSpacing: -0.4,
  },
  semesterBadge: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  semesterText: {
    fontSize: 11,
    color: Colors.secondary,
    fontWeight: "700",
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  roleText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontWeight: "600",
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.surface,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

