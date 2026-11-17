import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "#src/contexts/AuthContext";
import { Colors } from "#src/theme/colors";

interface AppBottomNavProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  activeTab?: string;
  onNavigate?: (tab: string) => void;
  role?: string;
}

export default function AppBottomNav({
  currentTab,
  onSelectTab,
  activeTab,
  onNavigate,
}: AppBottomNavProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isStudent = user?.role === "STUDENT";
  const selectedTab = currentTab || activeTab || "";
  const selectTab = onSelectTab || onNavigate || (() => undefined);
  const usesLegacyKeys = Boolean(onNavigate && !onSelectTab);

  const staffTabs = [
    {
      key: "StaffSchedule",
      label: "Schedule",
      icon: "calendar-today" as const,
    },
    { key: "Profile", label: "Profile", icon: "person" as const },
  ];

  const studentTabs = [
    {
      key: "StudentAttendance",
      label: "Attend",
      icon: "qr-code-scanner" as const,
    },
    {
      key: "StudentDevice",
      label: "Device",
      icon: "phonelink-setup" as const,
    },
    { key: "StudentHistory", label: "History", icon: "history" as const },
    { key: "Profile", label: "Profile", icon: "person" as const },
  ];

  const tabs = isStudent ? studentTabs : staffTabs;

  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <View style={[styles.navContainer, { paddingBottom: bottomPadding }]}>
      <View style={styles.navInner}>
        {tabs.map((tab) => {
          const isActive =
            selectedTab === tab.key ||
            (tab.key === "StudentAttendance" && selectedTab === "attendance") ||
            (tab.key === "StudentDevice" && selectedTab === "device") ||
            (tab.key === "StudentHistory" && selectedTab === "history") ||
            (tab.key === "Profile" && selectedTab === "profile") ||
            (tab.key === "StaffSchedule" && selectedTab === "schedule");

          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                isActive && styles.activeTabButton,
              ]}
              onPress={() => {
                if (!usesLegacyKeys) {
                  selectTab(tab.key);
                  return;
                }

                const legacyKey =
                  tab.key === "StaffSchedule"
                    ? "schedule"
                    : tab.key === "StaffSession"
                      ? "live"
                      : tab.key === "StudentAttendance"
                        ? "attendance"
                        : tab.key === "StudentDevice"
                          ? "device"
                          : tab.key === "StudentHistory" ||
                              tab.key === "StaffHistory"
                            ? "history"
                            : "profile";
                selectTab(legacyKey);
              }}
              activeOpacity={0.75}
            >
              <MaterialIcons
                name={tab.icon}
                size={22}
                color={isActive ? Colors.secondary : Colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive
                      ? Colors.secondary
                      : Colors.onSurfaceVariant,
                  },
                  isActive && styles.activeTabLabel,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    paddingTop: 8,
    justifyContent: "center",
    elevation: 12,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  navInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 12,
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    minWidth: 60,
  },
  activeTabButton: {
    backgroundColor: Colors.secondaryContainer,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: "500",
  },
  activeTabLabel: {
    fontWeight: "700",
  },
});

