import { Feather } from "@expo/vector-icons";
import React, { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ visible, onClose, title, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Feather name="x" size={22} color={Colors.text} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderRadius: 18,
  },
  body: {
    padding: 20,
  },
});
