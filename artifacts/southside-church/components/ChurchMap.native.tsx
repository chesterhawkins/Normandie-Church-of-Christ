import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActionSheetIOS, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

import Colors from "@/constants/colors";

const CHURCH_ADDRESS = "6306 S Normandie Ave, Los Angeles, CA 90044";
const CHURCH_COORDS = { latitude: 33.98186, longitude: -118.29997 };

const APPLE_MAPS_URL = `maps://?q=${encodeURIComponent(CHURCH_ADDRESS)}&ll=${CHURCH_COORDS.latitude},${CHURCH_COORDS.longitude}`;
const GOOGLE_MAPS_URL = `comgooglemaps://?q=${encodeURIComponent(CHURCH_ADDRESS)}&center=${CHURCH_COORDS.latitude},${CHURCH_COORDS.longitude}`;
const GOOGLE_MAPS_WEB_URL = `https://maps.google.com/?q=${encodeURIComponent(CHURCH_ADDRESS)}`;

async function openInGoogleMaps() {
  const canOpen = await Linking.canOpenURL(GOOGLE_MAPS_URL);
  Linking.openURL(canOpen ? GOOGLE_MAPS_URL : GOOGLE_MAPS_WEB_URL);
}

function openMapsOptions() {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: "Open in Maps",
        options: ["Apple Maps", "Google Maps", "Cancel"],
        cancelButtonIndex: 2,
      },
      (index) => {
        if (index === 0) Linking.openURL(APPLE_MAPS_URL);
        if (index === 1) openInGoogleMaps();
      }
    );
  } else {
    Alert.alert("Open in Maps", "Choose your maps app", [
      { text: "Google Maps", onPress: openInGoogleMaps },
      { text: "Default Maps", onPress: () => Linking.openURL(`geo:${CHURCH_COORDS.latitude},${CHURCH_COORDS.longitude}?q=${encodeURIComponent(CHURCH_ADDRESS)}`) },
      { text: "Cancel", style: "cancel" },
    ]);
  }
}

export default function ChurchMap() {
  return (
    <Pressable style={styles.mapCard} onPress={openMapsOptions}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={{ ...CHURCH_COORDS, latitudeDelta: 0.003, longitudeDelta: 0.003 }}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        pointerEvents="none"
      >
        <Marker
          coordinate={CHURCH_COORDS}
          title="Normandie Church of Christ"
          description={CHURCH_ADDRESS}
        />
      </MapView>
      <View style={styles.mapOverlay}>
        <Feather name="map-pin" size={14} color={Colors.primary} />
        <Text style={styles.mapOverlayText}>{CHURCH_ADDRESS}</Text>
        <Feather name="external-link" size={14} color={Colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mapCard: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: Colors.background,
  },
  map: {
    height: 180,
    width: "100%",
  },
  mapOverlay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    backgroundColor: Colors.background,
  },
  mapOverlayText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
