import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { getMember, memberFullName, updateMember, uploadProfilePicture } from "@/services/directory";

function typeColor(type: string): string {
  switch (type.toLowerCase()) {
    case "admin": return Colors.danger;
    case "leader": return Colors.accent;
    default: return Colors.primary;
  }
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();
  const isOwn = user?.uid === id;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { data: member, isLoading } = useQuery({
    queryKey: ["member", id],
    queryFn: () => getMember(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (member) {
      setFirstName(member.firstName);
      setMiddleName(member.middleName ?? "");
      setLastName(member.lastName);
      setPhone(member.phone ?? "");
    }
  }, [member]);

  const handleEdit = () => setEditing(true);

  const handleCancel = () => {
    if (member) {
      setFirstName(member.firstName);
      setMiddleName(member.middleName ?? "");
      setLastName(member.lastName);
      setPhone(member.phone ?? "");
    }
    setPendingImageUri(null);
    setEditing(false);
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPendingImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Required", "First and last name are required.");
      return;
    }
    setSaving(true);
    try {
      if (pendingImageUri) {
        setUploadingPhoto(true);
        await uploadProfilePicture(id, pendingImageUri);
        setUploadingPhoto(false);
        setPendingImageUri(null);
      }
      await updateMember(id, {
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });
      await refreshUser();
      qc.invalidateQueries({ queryKey: ["member", id] });
      qc.invalidateQueries({ queryKey: ["directory"] });
      setEditing(false);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const name = member ? memberFullName(member) : "";
  const color = member ? typeColor(member.type) : Colors.primary;
  const initial = member
    ? (member.firstName || member.lastName || "?").charAt(0).toUpperCase()
    : "?";

  return (
    <>
      <Stack.Screen
        options={{
          title: editing ? "Edit Profile" : name || "Profile",
          headerBackTitle: "Back",
          headerRight: isOwn
            ? () =>
                editing ? (
                  <Pressable onPress={handleCancel} hitSlop={8}>
                    <Text style={styles.headerBtn}>Cancel</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={handleEdit} hitSlop={8}>
                    <Text style={styles.headerBtn}>Edit</Text>
                  </Pressable>
                )
            : undefined,
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : !member ? (
            <View style={styles.center}>
              <Feather name="user-x" size={48} color={Colors.textMuted} />
              <Text style={styles.notFound}>Profile not found</Text>
            </View>
          ) : (
            <>
              <View style={styles.avatarSection}>
                <Pressable onPress={editing ? handlePickPhoto : undefined} style={styles.avatarWrap}>
                  {pendingImageUri || member.profilePicUrl ? (
                    <Image
                      source={{ uri: pendingImageUri ?? member.profilePicUrl! }}
                      style={styles.avatar}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.avatarFallback, { backgroundColor: color }]}>
                      <Text style={styles.avatarInitial}>{initial}</Text>
                    </View>
                  )}
                  {editing && (
                    <View style={styles.cameraOverlay}>
                      <Feather name="camera" size={20} color="#fff" />
                    </View>
                  )}
                </Pressable>
                {!editing && (
                  <>
                    <Text style={styles.name}>{name}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: color + "22" }]}>
                      <Text style={[styles.typeText, { color }]}>{member.type}</Text>
                    </View>
                  </>
                )}
              </View>

              {editing ? (
                <View style={styles.formCard}>
                  <Field label="First Name" value={firstName} onChange={setFirstName} placeholder="First name" />
                  <View style={styles.formDivider} />
                  <Field label="Middle Name" value={middleName} onChange={setMiddleName} placeholder="Middle name (optional)" />
                  <View style={styles.formDivider} />
                  <Field label="Last Name" value={lastName} onChange={setLastName} placeholder="Last name" />
                  <View style={styles.formDivider} />
                  <Field label="Phone" value={phone} onChange={setPhone} placeholder="Phone number (optional)" keyboardType="phone-pad" />

                  <Pressable
                    style={({ pressed }) => [styles.saveBtn, { opacity: pressed || saving ? 0.85 : 1 }]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <View style={styles.savingRow}>
                        <ActivityIndicator color={Colors.textInverse} />
                        <Text style={styles.saveBtnText}>
                          {uploadingPhoto ? "Uploading photo..." : "Saving..."}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <View style={styles.detailsCard}>
                  {member.email ? (
                    <Pressable style={styles.row} onPress={() => Linking.openURL(`mailto:${member.email}`)}>
                      <View style={[styles.rowIcon, { backgroundColor: Colors.primary + "15" }]}>
                        <Feather name="mail" size={18} color={Colors.primary} />
                      </View>
                      <View style={styles.rowContent}>
                        <Text style={styles.rowLabel}>Email</Text>
                        <Text style={styles.rowValue}>{member.email}</Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={Colors.textMuted} />
                    </Pressable>
                  ) : null}

                  {member.email && member.phone ? <View style={styles.divider} /> : null}

                  {member.phone ? (
                    <Pressable style={styles.row} onPress={() => Linking.openURL(`tel:${member.phone}`)}>
                      <View style={[styles.rowIcon, { backgroundColor: Colors.primary + "15" }]}>
                        <Feather name="phone" size={18} color={Colors.primary} />
                      </View>
                      <View style={styles.rowContent}>
                        <Text style={styles.rowLabel}>Phone</Text>
                        <Text style={styles.rowValue}>{member.phone}</Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={Colors.textMuted} />
                    </Pressable>
                  ) : null}

                  {!member.email && !member.phone ? (
                    <View style={styles.row}>
                      <Text style={styles.noContact}>No contact information available</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "phone-pad";
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "phone-pad" ? "none" : "words"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundSecondary },
  container: { flexGrow: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 },
  notFound: { fontFamily: "Inter_400Regular", fontSize: 16, color: Colors.textMuted },
  headerBtn: { fontFamily: "Inter_500Medium", fontSize: 16, color: Colors.primary },
  avatarSection: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 32,
    gap: 12,
  },
  avatarWrap: { width: 100, height: 100, borderRadius: 50, overflow: "hidden" },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontFamily: "Inter_700Bold", fontSize: 40, color: Colors.textInverse },
  name: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.text },
  typeBadge: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5 },
  typeText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  detailsCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.background,
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1 },
  rowLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  rowValue: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.text, marginTop: 1 },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 64 },
  noContact: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
  formCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.background,
    borderRadius: 16,
    overflow: "hidden",
    gap: 0,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  fieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
    width: 100,
  },
  fieldInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 4,
  },
  formDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 128 },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  savingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  saveBtn: {
    margin: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textInverse },
});
