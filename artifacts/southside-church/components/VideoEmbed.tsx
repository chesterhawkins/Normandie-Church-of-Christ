import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";

interface VideoEmbedProps {
  embedUrl: string;
}

function extractYouTubeId(embedUrl: string): string | null {
  const m = embedUrl.match(/\/embed\/([^?&/]+)/);
  return m?.[1] ?? null;
}

function toWatchUrl(embedUrl: string): string {
  return embedUrl.includes("/embed/")
    ? embedUrl.replace(/\/embed\/([^?]+).*/, "/watch?v=$1")
    : embedUrl;
}

export default function VideoEmbed({ embedUrl }: VideoEmbedProps) {
  const videoId = extractYouTubeId(embedUrl);
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : null;
  const watchUrl = toWatchUrl(embedUrl);

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.thumbnailContainer}
        onPress={() => Linking.openURL(watchUrl)}
      >
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} contentFit="cover" />
        ) : (
          <View style={[styles.thumbnail, { backgroundColor: "#000" }]} />
        )}
        <View style={styles.playOverlay}>
          <View style={styles.playBtn}>
            <Feather name="play" size={28} color="#fff" />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
    marginTop: 8,
  },
  thumbnailContainer: {
    flex: 1,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 4,
  },
});
