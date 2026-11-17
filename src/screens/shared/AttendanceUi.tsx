import React, { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export const colors = {
  background: "#f8f9ff",
  surface: "#ffffff",
  low: "#eff4ff",
  container: "#e5eeff",
  high: "#dce9ff",
  navy: "#131b2e",
  text: "#0b1c30",
  muted: "#667085",
  blue: "#0051d5",
  blueSoft: "#dbe1ff",
  green: "#087f5b",
  greenSoft: "#d9fbe8",
  amber: "#9a6700",
  amberSoft: "#fff1c2",
  red: "#ba1a1a",
  redSoft: "#ffdad6",
  border: "#c6c6cd",
};

export function AppHeader({
  role,
  name,
  onLogout,
}: {
  role: string;
  name?: string;
  onLogout: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.brandIcon}>
          <Text style={styles.brandIconText}>U</Text>
        </View>
        <View>
          <Text style={styles.brand}>UniAttend</Text>
          <Text style={styles.role}>{role}</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log out"
        onPress={onLogout}
        style={styles.profileButton}
      >
        <Text style={styles.profileText}>{name?.slice(0, 1) || "•"}</Text>
      </Pressable>
    </View>
  );
}

export function BottomNav({
  active,
  items,
  onNavigate,
}: {
  active: string;
  items: { key: string; label: string }[];
  onNavigate: (key: string) => void;
}) {
  return (
    <View style={styles.bottomNav}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => onNavigate(item.key)}
          style={styles.navItem}
          accessibilityRole="button"
          accessibilityLabel={item.label}
        >
          <Text
            style={[
              styles.navGlyph,
              active === item.key && styles.navGlyphActive,
            ]}
          >
            {item.key === "schedule"
              ? "◫"
              : item.key === "live"
                ? "◉"
                : item.key === "attendance"
                  ? "✓"
                  : item.key === "device"
                    ? "▣"
                    : "≡"}
          </Text>
          <Text
            style={[
              styles.navLabel,
              active === item.key && styles.navLabelActive,
            ]}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Surface({
  children,
  style,
}: {
  children: ReactNode;
  style?: object;
}) {
  return <View style={[styles.surface, style]}>{children}</View>;
}
export function StatusChip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "active" | "warning" | "danger";
}) {
  const palette =
    tone === "active"
      ? [colors.greenSoft, colors.green]
      : tone === "warning"
        ? [colors.amberSoft, colors.amber]
        : tone === "danger"
          ? [colors.redSoft, colors.red]
          : [colors.container, colors.muted];
  return (
    <View style={[styles.chip, { backgroundColor: palette[0] }]}>
      <Text style={[styles.chipText, { color: palette[1] }]}>{label}</Text>
    </View>
  );
}
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.primaryButton, disabled && styles.disabled]}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}
export function LoadingState() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.blue} size="large" />
    </View>
  );
}
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Surface style={styles.errorCard}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.muted}>{message}</Text>
      <PrimaryButton label="Try again" onPress={onRetry} />
    </Surface>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, paddingBottom: 104, gap: 14 },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  brandIconText: { color: "#fff", fontSize: 19, fontWeight: "800" },
  brand: { color: colors.text, fontSize: 17, fontWeight: "800" },
  role: { color: colors.blue, fontSize: 11, fontWeight: "700", marginTop: 2 },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  profileText: { color: "#fff", fontWeight: "800" },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  surface: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 16,
    shadowColor: "#0b1c30",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  surfaceLow: { backgroundColor: colors.low, borderRadius: 11, padding: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  courseCode: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  courseName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  body: { color: colors.text, fontSize: 14, lineHeight: 20 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  chip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  primaryButton: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  disabled: { opacity: 0.45 },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    backgroundColor: "rgba(248,249,255,0.98)",
    borderTopWidth: 1,
    borderTopColor: colors.container,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 9,
  },
  navItem: { alignItems: "center", minWidth: 62 },
  navGlyph: { color: colors.muted, fontSize: 22, fontWeight: "700" },
  navGlyphActive: { color: colors.blue },
  navLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
    fontWeight: "600",
  },
  navLabelActive: { color: colors.blue, fontWeight: "800" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  errorCard: { gap: 10 },
  errorTitle: { color: colors.red, fontWeight: "800", fontSize: 16 },
});
