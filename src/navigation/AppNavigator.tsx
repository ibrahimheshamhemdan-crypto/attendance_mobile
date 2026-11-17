import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "#src/contexts/AuthContext";
import LoginScreen from "#src/screens/auth/LoginScreen";
import StaffScheduleScreen from "#src/screens/staff/StaffScheduleScreen";
import StaffSessionScreen from "#src/screens/staff/StaffSessionScreen";
import StaffNewSessionScreen from "#src/screens/staff/StaffNewSessionScreen";
import StudentAttendanceScreen from "#src/screens/student/StudentAttendanceScreen";
import StudentDeviceScreen from "#src/screens/student/StudentDeviceScreen";
import StudentHistoryScreen from "#src/screens/student/StudentHistoryScreen";
import ProfileScreen from "#src/screens/shared/ProfileScreen";
import { Colors } from "#src/theme/colors";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.background,
        }}
      >
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user.role === "STUDENT" ? (
          <>
            <Stack.Screen
              name="StudentAttendance"
              component={StudentAttendanceScreen}
            />
            <Stack.Screen
              name="StudentDevice"
              component={StudentDeviceScreen}
            />
            <Stack.Screen
              name="StudentHistory"
              component={StudentHistoryScreen}
            />
            <Stack.Screen
              name="StudentDeviceHistory"
              component={StudentDeviceScreen}
            />
            <Stack.Screen
              name="History"
              component={StudentHistoryScreen}
            />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        ) : user.role === "DOCTOR" || user.role === "TEACHING_ASSISTANT" ? (
          <>
            <Stack.Screen
              name="StaffSchedule"
              component={StaffScheduleScreen}
            />
            <Stack.Screen name="StaffSession" component={StaffSessionScreen} />
            <Stack.Screen
              name="StaffNewSession"
              component={StaffNewSessionScreen}
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="History"
              component={StaffScheduleScreen}
            />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
