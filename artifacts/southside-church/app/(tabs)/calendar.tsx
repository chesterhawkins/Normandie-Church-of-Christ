import React from "react";
import { Platform, StyleSheet, View, Text } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import Colors from "@/constants/colors";

const CALENDAR_URL =
  "https://calendar.google.com/calendar/embed?src=office@normcoc.com&showTitle=0&showTabs=0&showPrint=0&showCalendars=0&showTz=0&showNav=1&color=%238E24AA&color=%230B8043&bgcolor=%23a5082c";

const CALENDAR_CONFIGURED = CALENDAR_URL.trim().length > 0;

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = insets.top;

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <Text style={styles.title}>Calendar</Text>
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>
            Please open this page on your mobile device to view the church calendar.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <Text style={styles.title}>Calendar</Text>
      {CALENDAR_CONFIGURED ? (
        <WebView
          source={{ uri: CALENDAR_URL }}
          style={styles.webview}
          startInLoadingState
          javaScriptEnabled
        />
      ) : (
        <View style={styles.fallback}>
          <Feather name="calendar" size={48} color={Colors.textMuted} />
          <Text style={styles.fallbackTitle}>Calendar Coming Soon</Text>
          <Text style={styles.fallbackText}>
            The church calendar will be available here once it has been set up.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundSecondary },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  webview: { flex: 1, backgroundColor: Colors.background },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  fallbackTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.text,
    textAlign: "center",
  },
  fallbackText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
