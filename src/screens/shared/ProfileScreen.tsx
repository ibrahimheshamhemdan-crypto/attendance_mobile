import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "#src/contexts/AuthContext";
import { Colors } from "#src/theme/colors";
import AppHeader from "#src/components/common/AppHeader";
import AppBottomNav from "#src/components/common/AppBottomNav";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of UniAttend?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const getRoleTitle = () => {
    if (user?.role === "DOCTOR") return "Doctor (Course Owner)";
    if (user?.role === "TEACHING_ASSISTANT") return "Doctor Assistant (TA)";
    if (user?.role === "STUDENT") return "Student";
    return "User Account";
  };

  const getInitials = () => {
    if (!user) return "U";
    const fn = user.first_name?.[0] || "";
    const ln = user.last_name?.[0] || "";
    return (fn + ln).toUpperCase() || "U";
  };

  const handleTabSelect = (tabKey: string) => {
    if (tabKey === "StudentAttendance" || tabKey === "attendance") {
      navigation.navigate("StudentAttendance");
    } else if (tabKey === "StudentDevice" || tabKey === "device") {
      navigation.navigate("StudentDevice");
    } else if (tabKey === "StudentHistory" || tabKey === "history") {
      navigation.navigate("StudentHistory");
    } else if (tabKey === "StaffSchedule" || tabKey === "schedule") {
      navigation.navigate("StaffSchedule");
    }
  };

  return (
    <View style={styles.screenWrapper}>
      <AppHeader
        roleTitle={getRoleTitle()}
        onProfilePress={() => {}}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Profile Card Header */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>

          <Text style={styles.userName}>
            {user ? `${user.first_name} ${user.last_name}` : "User Profile"}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <View style={styles.roleTag}>
            <MaterialIcons name="verified-user" size={14} color={Colors.secondary} />
            <Text style={styles.roleTagText}>{getRoleTitle()}</Text>
          </View>
        </View>

        {/* Account Details Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account Details</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <MaterialIcons name="business" size={18} color={Colors.secondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Organization</Text>
              <Text style={styles.infoValue}>Faculty of Computer Science</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <MaterialIcons name="badge" size={18} color={Colors.secondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Account Identifier</Text>
              <Text style={styles.infoValue}>
                ID #{user?.id} • {user?.role === "STUDENT" ? "Student Account" : user?.role === "DOCTOR" ? "Instructor Account" : "TA Account"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <MaterialIcons name="security" size={18} color={Colors.secondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Security Status</Text>
              <Text style={styles.infoValue}>Active & Authenticated</Text>
            </View>
          </View>
        </View>

        {/* Logout Action */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <MaterialIcons name="logout" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Log Out Account</Text>
        </TouchableOpacity>
      </ScrollView>

      <AppBottomNav
        currentTab="Profile"
        onSelectTab={handleTabSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 60,
    gap: 18,
  },
  profileHeaderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    elevation: 3,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 3,
    borderColor: Colors.surface,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.onSurface,
    letterSpacing: -0.4,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 3,
    fontWeight: "500",
  },
  roleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  roleTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.secondary,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    elevation: 2,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.secondaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.onSurface,
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.errorContainer,
    borderRadius: 16,
    paddingVertical: 15,
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.errorContainer,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.onErrorContainer,
  },
});

