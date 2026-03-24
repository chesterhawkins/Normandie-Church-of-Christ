import React from "react";
import { Platform, StyleSheet, View, Text } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

const BIBLE_URL = "https://www.biblewebapp.com/study/";

export default function BibleScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = insets.top;

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <Text style={styles.title}>Bible</Text>
        <View style={styles.webFallback}>
          <Text style={styles.webFallbackText}>
            Please open this page on your mobile device to read the Bible.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <Text style={styles.title}>Bible</Text>
      <WebView
        source={{ uri: BIBLE_URL }}
        style={styles.webview}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
      />
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
  webFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  webFallbackText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
