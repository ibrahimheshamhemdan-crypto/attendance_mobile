import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "#src/contexts/AuthContext";
import { useBiometrics } from "#src/hooks/useBiometrics";
import { authApi } from "#src/api/client";
import { Colors } from "#src/theme/colors";

export default function LoginScreen() {
  const { login, deviceLogin } = useAuth();
  const {
    getDeviceFingerprint,
    authenticate,
    signChallenge,
    checkAvailability,
  } = useBiometrics();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deviceLoading, setDeviceLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password");
      return;
    }
    setLoading(true);
    try {
      const fingerprint = await getDeviceFingerprint();
      await login(email.trim().toLowerCase(), password, fingerprint);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Invalid email or password";
      Alert.alert("Login Failed", detail);
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceLogin = async () => {
    setDeviceLoading(true);
    try {
      const isAvailable = await checkAvailability();
      if (!isAvailable) {
        Alert.alert(
          "Not Available",
          "Biometric login is not set up on this device.",
        );
        return;
      }
      const fingerprint = await getDeviceFingerprint();
      const challengeRes = await authApi.deviceLoginChallenge(fingerprint);
      const { challenge } = challengeRes;

      const authenticated = await authenticate("Login with Face ID / Touch ID");
      if (authenticated) {
        const signature = await signChallenge(challenge);
        await deviceLogin(fingerprint, challenge, signature);
      }
    } catch (err: any) {
      if (
        err?.response?.status === 404 ||
        err.message?.includes("No private key")
      ) {
        Alert.alert(
          "Device Not Recognized",
          "This device is no longer registered (e.g., the app was reinstalled). Please log in with your email and password to register this device again.",
        );
      } else {
        const detail =
          err?.response?.data?.detail || err.message || "Device login failed";
        Alert.alert("Login Failed", detail);
      }
    } finally {
      setDeviceLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Brand Header */}
        <View style={styles.headerBadgeContainer}>
          <View style={styles.brandIconBox}>
            <Ionicons name="school" size={26} color="#FFFFFF" />
          </View>
          <View style={styles.brandMeta}>
            <Text style={styles.brandTitle}>UniAttend</Text>
            <Text style={styles.brandSub}>Academic Attendance Portal</Text>
          </View>
        </View>

        {/* Auth Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Welcome Back</Text>
          <Text style={styles.cardHeaderSubtitle}>
            Sign in with your university credentials
          </Text>

          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={18} color={Colors.onSurfaceVariant} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="user@university.edu"
              placeholderTextColor={Colors.onSurfaceVariant}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              editable={!loading && !deviceLoading}
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.onSurfaceVariant} style={styles.inputIcon} />
            <TextInput
              style={styles.inputFieldFlex}
              placeholder="••••••••"
              placeholderTextColor={Colors.onSurfaceVariant}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!loading && !deviceLoading}
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={Colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading || deviceLoading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.onSecondary} />
            ) : (
              <View style={styles.buttonInner}>
                <Text style={styles.primaryButtonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.onSecondary} />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>BIOMETRIC QUICK ACCESS</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[
              styles.deviceButton,
              deviceLoading && styles.buttonDisabled,
            ]}
            onPress={handleDeviceLogin}
            disabled={loading || deviceLoading}
            activeOpacity={0.85}
          >
            {deviceLoading ? (
              <ActivityIndicator color={Colors.secondary} />
            ) : (
              <View style={styles.buttonInner}>
                <Ionicons name="finger-print-outline" size={20} color={Colors.secondary} />
                <Text style={styles.deviceButtonText}>Login with Registered Device</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.footerNotice}>
            <Ionicons name="shield-checkmark-outline" size={14} color={Colors.onSurfaceVariant} />
            <Text style={styles.footerNoticeText}>
              Server location validation & biometric encryption
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  headerBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 28,
  },
  brandIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  brandMeta: {
    flexDirection: "column",
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.onSurface,
    letterSpacing: -0.6,
  },
  brandSub: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 28,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  cardHeaderTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.onSurface,
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  cardHeaderSubtitle: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginBottom: 24,
    lineHeight: 18,
  },
  label: {
    color: Colors.onSurface,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: 14,
    marginBottom: 18,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.onSurface,
    fontWeight: "500",
  },
  inputFieldFlex: {
    flex: 1,
    fontSize: 14,
    color: Colors.onSurface,
    fontWeight: "500",
  },
  eyeBtn: {
    padding: 6,
  },
  primaryButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: Colors.onSecondary,
    fontSize: 15,
    fontWeight: "700",
  },
  deviceButton: {
    backgroundColor: Colors.secondaryContainer,
    borderWidth: 1,
    borderColor: Colors.surfaceVariant,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceButtonText: {
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: "700",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.outlineVariant,
  },
  dividerText: {
    color: Colors.onSurfaceVariant,
    paddingHorizontal: 12,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  footerNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 22,
  },
  footerNoticeText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    textAlign: "center",
    fontWeight: "500",
  },
});


