import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const CASHAPP_URL = "https://cash.app/$normcoc";
const ZELLE_EMAIL = "finance@normcoc.com";
const YOUTUBE_URL = "https://www.youtube.com/@Normandiecoc/streams";
const VOTD_URL =
  "https://www.googleapis.com/storage/v1/b/normandie-church-of-christ.appspot.com/o/votd.json?alt=media";

type Verse = { reference: string; text: string };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [verse, setVerse] = useState<Verse | null>(null);
  const [verseLoading, setVerseLoading] = useState(true);

  useEffect(() => {
    fetch(VOTD_URL)
      .then((r) => r.json())
      .then((data: Verse) => setVerse(data))
      .catch(() =>
        setVerse({
          text: "I can do all things through Christ who strengthens me.",
          reference: "Philippians 4:13",
        })
      )
      .finally(() => setVerseLoading(false));
  }, []);

  const openLink = useCallback(async (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await WebBrowser.openBrowserAsync(url);
  }, []);

  const handleGive = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: "Give",
          message: `Tap below to give via Cash App.\n\nYou can also give via Zelle to ${ZELLE_EMAIL}.`,
          options: ["Cash App ($normcoc)", "Cancel"],
          cancelButtonIndex: 1,
        },
        (index) => {
          if (index === 0) WebBrowser.openBrowserAsync(CASHAPP_URL);
        }
      );
    } else {
      Alert.alert(
        "Give",
        `Tap below to give via Cash App.\n\nYou can also give via Zelle to ${ZELLE_EMAIL}.`,
        [
          { text: "Cash App ($normcoc)", onPress: () => WebBrowser.openBrowserAsync(CASHAPP_URL) },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  }, []);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Header — centered layout */}
      <View style={styles.heroCard}>
        <View style={styles.heroInner}>
          <View style={styles.heroLogoWrapper}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.heroLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.churchName}>Normandie Church of Christ</Text>
          <Text style={styles.tagline}>Seeking. Securing. Showing. Serving.</Text>
        </View>
      </View>

      {/* Service Times Strip */}
      <View style={styles.timesRow}>
        <View style={styles.timeItem}>
          <Feather name="sun" size={14} color={Colors.primary} />
          <View>
            <Text style={styles.timeDay}>Sunday</Text>
            <Text style={styles.timeValue}>Bible Class 9AM · Worship 10AM</Text>
          </View>
        </View>
        <View style={styles.timesDivider} />
        <View style={styles.timeItem}>
          <Feather name="calendar" size={14} color={Colors.primary} />
          <View>
            <Text style={styles.timeDay}>Wednesday</Text>
            <Text style={styles.timeValue}>Bible Class 10AM · 7PM</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitle}>Connect</Text>
      </View>
      <View style={styles.actionsRow}>
        <Pressable
          style={({ pressed }) => [styles.actionCard, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => openLink(YOUTUBE_URL)}
        >
          <View style={[styles.actionIcon, { backgroundColor: "#FF0000" }]}>
            <Feather name="play-circle" size={22} color="#FFF" />
          </View>
          <Text style={styles.actionTitle}>Watch</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.actionCard, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => openLink("https://zoom.us/j/3237503212?pwd=OG5EVW1oVkE5VEVKY05ET1pzY3dvdz09#success")}
        >
          <View style={[styles.actionIcon, { backgroundColor: "#2D8CFF" }]}>
            <Feather name="video" size={22} color="#FFF" />
          </View>
          <Text style={styles.actionTitle}>Zoom</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.actionCard, { opacity: pressed ? 0.8 : 1 }]}
          onPress={handleGive}
        >
          <View style={[styles.actionIcon, { backgroundColor: Colors.primary }]}>
            <Feather name="gift" size={22} color="#FFF" />
          </View>
          <Text style={styles.actionTitle}>Give</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.actionCard, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => router.navigate("/(tabs)/more")}
        >
          <View style={[styles.actionIcon, { backgroundColor: Colors.primary }]}>
            <Feather name="info" size={22} color="#FFF" />
          </View>
          <Text style={styles.actionTitle}>About</Text>
        </Pressable>
      </View>

      {/* Verse of the Day */}
      <View style={styles.verseCard}>
        <View style={styles.verseHeader}>
          <Feather name="book-open" size={16} color={Colors.primary} />
          <Text style={styles.verseLabel}>VERSE OF THE DAY</Text>
        </View>
        {verseLoading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 12 }} />
        ) : (
          <>
            <Text style={styles.verseText}>"{verse?.text}"</Text>
            <Text style={styles.verseRef}>— {verse?.reference}</Text>
          </>
        )}
      </View>

      {/* Auth CTA if not logged in */}
      {!user && (
        <Pressable
          style={({ pressed }) => [styles.signInCTA, { opacity: pressed ? 0.9 : 1 }]}
          onPress={() => router.push("/(auth)/login")}
        >
          <Feather name="log-in" size={18} color={Colors.textInverse} />
          <View style={styles.signInText}>
            <Text style={styles.signInTitle}>Member Login</Text>
            <Text style={styles.signInSub}>Access Prayer & Directory</Text>
          </View>
          <Feather name="chevron-right" size={18} color={Colors.textInverse} />
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundSecondary },
  content: { paddingHorizontal: 16, gap: 16 },

  /* Hero — centered */
  heroCard: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
    overflow: "hidden",
  },
  heroInner: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 10,
  },
  heroLogoWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  heroLogo: {
    width: 78,
    height: 78,
  },
  churchName: {
    fontFamily: "Inter_700Bold",
    fontSize: 19,
    color: Colors.primary,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 0.4,
    textAlign: "center",
  },

  /* Service Times */
  timesRow: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  timeItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  timesDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  timeDay: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.text,
  },
  timeValue: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  /* Section header with accent rule */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: -4,
  },
  sectionAccent: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
  },

  /* Action Cards */
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 8,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.text,
  },

  /* Verse of the Day */
  verseCard: {
    backgroundColor: "rgba(139,26,44,0.04)",
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  verseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  verseLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.primary,
    letterSpacing: 1.2,
  },
  verseText: {
    fontFamily: "Inter_400Regular",
    fontSize: 17,
    color: Colors.text,
    lineHeight: 26,
    fontStyle: "italic",
    marginBottom: 8,
  },
  verseRef: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
  },

  /* Member Login CTA */
  signInCTA: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  signInText: { flex: 1 },
  signInTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.textInverse,
  },
  signInSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
});
