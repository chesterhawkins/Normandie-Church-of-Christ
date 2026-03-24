import { Feather } from "@expo/vector-icons";
import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";

const CHURCH_ADDRESS = "6306 S Normandie Ave, Los Angeles, CA 90044";
const CHURCH_COORDS = { latitude: 33.98186, longitude: -118.29997 };
const GOOGLE_MAPS_WEB_URL = `https://maps.google.com/?q=${encodeURIComponent(CHURCH_ADDRESS)}&ll=${CHURCH_COORDS.latitude},${CHURCH_COORDS.longitude}`;

export default function ChurchMap() {
  return (
    <Pressable
      style={styles.card}
      onPress={() => Linking.openURL(GOOGLE_MAPS_WEB_URL)}
    >
      <Feather name="map-pin" size={22} color={Colors.primary} />
      <Text style={styles.address}>{CHURCH_ADDRESS}</Text>
      <Text style={styles.link}>Open in Maps →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  address: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.text,
    textAlign: "center",
  },
  link: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.primary,
  },
});
