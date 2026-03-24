import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

const { width: W, height: H } = Dimensions.get("window");

interface ImageViewerProps {
  uri: string;
  visible: boolean;
  onClose: () => void;
}

export default function ImageViewer({ uri, visible, onClose }: ImageViewerProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          maximumZoomScale={4}
          minimumZoomScale={1}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          centerContent
        >
          <Image source={{ uri }} style={styles.image} contentFit="contain" />
        </ScrollView>
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Feather name="x" size={22} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: W,
    minHeight: H,
  },
  image: {
    width: W,
    height: H,
  },
  closeBtn: {
    position: "absolute",
    top: 52,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
