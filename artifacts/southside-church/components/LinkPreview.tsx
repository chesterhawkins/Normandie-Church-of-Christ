import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";

interface OgData {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

interface LinkPreviewProps {
  url: string;
}

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

function extractMetaName(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m?.[1]?.trim() || null;
}

async function fetchOgData(url: string): Promise<OgData> {
  const empty: OgData = { title: null, description: null, image: null, siteName: null };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/html" },
    });
    clearTimeout(timeout);
    const contentType = resp.headers.get("content-type") ?? "";
    if (!resp.ok || !contentType.includes("text/html")) return empty;
    const html = (await resp.text()).slice(0, 1024 * 1024);
    return {
      title: extractMeta(html, "og:title") || extractMetaName(html, "twitter:title") || extractTitle(html),
      description: extractMeta(html, "og:description") || extractMetaName(html, "description") || extractMetaName(html, "twitter:description"),
      image: extractMeta(html, "og:image") || extractMetaName(html, "twitter:image"),
      siteName: extractMeta(html, "og:site_name"),
    };
  } catch {
    clearTimeout(timeout);
    return empty;
  }
}

export default function LinkPreview({ url }: LinkPreviewProps) {
  const [og, setOg] = useState<OgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchOgData(url).then((data) => {
      if (cancelled) return;
      if (!data.title && !data.description && !data.image) {
        setFailed(true);
      } else {
        setOg(data);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [url]);

  if (loading) {
    return (
      <View style={styles.skeleton}>
        <View style={styles.skeletonImage} />
        <View style={styles.skeletonLines}>
          <View style={[styles.skeletonLine, { width: "70%" }]} />
          <View style={[styles.skeletonLine, { width: "90%" }]} />
        </View>
      </View>
    );
  }

  if (failed || !og) return null;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
      onPress={() => Linking.openURL(url)}
    >
      {og.image ? (
        <Image source={{ uri: og.image }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={styles.iconPlaceholder}>
          <Feather name="link" size={24} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.info}>
        {og.siteName ? (
          <Text style={styles.siteName} numberOfLines={1}>{og.siteName}</Text>
        ) : null}
        {og.title ? (
          <Text style={styles.title} numberOfLines={2}>{og.title}</Text>
        ) : null}
        {og.description ? (
          <Text style={styles.description} numberOfLines={2}>{og.description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  image: { width: "100%", height: 140 },
  iconPlaceholder: {
    width: "100%",
    height: 60,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { padding: 12, gap: 3 },
  siteName: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 19,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  skeleton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skeletonImage: { width: "100%", height: 80, backgroundColor: Colors.backgroundSecondary },
  skeletonLines: { padding: 12, gap: 8 },
  skeletonLine: { height: 12, borderRadius: 4, backgroundColor: Colors.backgroundSecondary },
});
