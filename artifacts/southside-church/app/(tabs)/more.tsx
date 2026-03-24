import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ChurchMap from "@/components/ChurchMap";
import Colors from "@/constants/colors";
import { useAuth, fullName } from "@/context/AuthContext";

const CHURCH_PHONE = "(323) 750-3212";
const CHURCH_WEBSITE = "https://normandiecoc.org";

const MEETING_TIMES = [
  { day: "Sunday", times: ["9:00 AM – Bible Class", "10:00 AM – Morning Worship"] },
  { day: "Wednesday", times: ["10:00 AM – Bible Class", "7:00 PM – Bible Class"] },
];

interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
}

function InfoRow({ icon, label, value, onPress }: InfoRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.infoRow, onPress && { opacity: pressed ? 0.75 : 1 }]}
      disabled={!onPress}
    >
      <View style={styles.infoIcon}>
        <Feather name={icon as any} size={18} color={Colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, onPress ? styles.infoValueLink : {}]}>{value}</Text>
      </View>
      {onPress && <Feather name="chevron-right" size={16} color={Colors.textMuted} />}
    </Pressable>
  );
}

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { user, logOut } = useAuth();

  const handleCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${CHURCH_PHONE.replace(/\D/g, "")}`);
  };

  const handleWebsite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    WebBrowser.openBrowserAsync(CHURCH_WEBSITE);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logOut();
        },
      },
    ]);
  };

  const topPadding = insets.top;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 16, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>About</Text>

      {/* Map */}
      <Text style={styles.sectionLabel}>Location</Text>
      <ChurchMap />

      {/* Contact */}
      <Text style={styles.sectionLabel}>Contact</Text>
      <View style={styles.section}>
        <InfoRow icon="phone" label="Phone" value={CHURCH_PHONE} onPress={handleCall} />
        <View style={styles.divider} />
        <InfoRow
          icon="globe"
          label="Website"
          value={CHURCH_WEBSITE.replace("https://", "")}
          onPress={handleWebsite}
        />
      </View>

      {/* Meeting Times */}
      <Text style={styles.sectionLabel}>Service Times</Text>
      <View style={styles.section}>
        {MEETING_TIMES.map((day, i) => (
          <React.Fragment key={day.day}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.scheduleRow}>
              <View style={styles.infoIcon}>
                <Feather name="clock" size={18} color={Colors.primary} />
              </View>
              <View style={styles.scheduleContent}>
                <Text style={styles.scheduleDay}>{day.day}</Text>
                {day.times.map((t) => (
                  <Text key={t} style={styles.scheduleTime}>{t}</Text>
                ))}
              </View>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Quick Links */}
      <Text style={styles.sectionLabel}>Resources</Text>
      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [styles.quickRow, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => router.navigate("/(tabs)/calendar" as any)}
        >
          <View style={[styles.quickIcon, { backgroundColor: "#EEF2FF" }]}>
            <Feather name="calendar" size={18} color="#6366F1" />
          </View>
          <Text style={styles.quickLabel}>Calendar</Text>
          <Feather name="chevron-right" size={16} color={Colors.textMuted} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable
          style={({ pressed }) => [styles.quickRow, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => router.navigate("/(tabs)/bible" as any)}
        >
          <View style={[styles.quickIcon, { backgroundColor: "#FEF3C7" }]}>
            <Feather name="book" size={18} color="#D97706" />
          </View>
          <Text style={styles.quickLabel}>Bible</Text>
          <Feather name="chevron-right" size={16} color={Colors.textMuted} />
        </Pressable>
      </View>

      {/* Account */}
      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.section}>
        {user ? (
          <>
            <View style={styles.userRow}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {(user.firstName || user.email || "U").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{fullName(user)}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <Pressable
              style={({ pressed }) => [styles.logoutBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={handleLogout}
            >
              <Feather name="log-out" size={18} color={Colors.danger} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.quickRow, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push("/(auth)/login")}
          >
            <View style={[styles.quickIcon, { backgroundColor: Colors.primary + "20" }]}>
              <Feather name="log-in" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.quickLabel}>Sign In</Text>
            <Feather name="chevron-right" size={16} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundSecondary },
  content: { paddingHorizontal: 16, gap: 8 },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  section: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 54,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
  },
  infoValueLink: { color: Colors.primary },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  scheduleContent: { flex: 1, gap: 3 },
  scheduleDay: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 4,
  },
  scheduleTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.text,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.textInverse,
  },
  userInfo: { flex: 1 },
  userName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  userEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  logoutText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.danger,
  },
});
