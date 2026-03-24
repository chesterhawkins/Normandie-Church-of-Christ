import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { Bulletin, getBulletins, uploadBulletin, deleteBulletin } from "@/services/bulletins";
import Modal from "@/components/Modal";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function BulletinCard({
  item,
  canDelete,
  onDelete,
  onOpen,
}: {
  item: Bulletin;
  canDelete: boolean;
  onDelete: (id: string, path?: string) => void;
  onOpen: (bulletin: Bulletin) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}
      onPress={() => onOpen(item)}
    >
      <View style={styles.cardLeft}>
        <View style={styles.pdfIcon}>
          <Feather name="file-text" size={22} color={Colors.accent} />
        </View>
        <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
      </View>
      <View style={styles.cardRight}>
        {canDelete && (
          <Pressable
            onPress={() => onDelete(item.id, item.storagePath)}
            hitSlop={10}
            style={styles.deleteBtn}
          >
            <Feather name="trash-2" size={16} color={Colors.danger} />
          </Pressable>
        )}
        <Feather name="chevron-right" size={18} color={Colors.textMuted} />
      </View>
    </Pressable>
  );
}

export default function BulletinsScreen() {
  const insets = useSafeAreaInsets();
  const { isLeader } = useAuth();
  const qc = useQueryClient();

  const [selected, setSelected] = useState<Bulletin | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [bulletinDate, setBulletinDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [pickedName, setPickedName] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const { data = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["bulletins"],
    queryFn: getBulletins,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, path }: { id: string; path?: string }) =>
      deleteBulletin(id, path),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ["bulletins"] });
      const previous = qc.getQueryData<Bulletin[]>(["bulletins"]);
      qc.setQueryData<Bulletin[]>(["bulletins"], (old) => old?.filter((b) => b.id !== id));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["bulletins"], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["bulletins"], refetchType: "none" }),
  });

  const handleDelete = useCallback((id: string, storagePath?: string) => {
    Alert.alert("Delete Bulletin", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteMutation.mutate({ id, path: storagePath });
        },
      },
    ]);
  }, []);

  const handlePick = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (!result.canceled && result.assets[0]) {
      setPickedUri(result.assets[0].uri);
      setPickedName(result.assets[0].name || "bulletin.pdf");
    }
  };

  const handleUpload = async () => {
    if (!pickedUri) return;
    setUploading(true);
    try {
      await uploadBulletin(bulletinDate, pickedUri);
      qc.invalidateQueries({ queryKey: ["bulletins"] });
      setShowUpload(false);
      setBulletinDate(new Date());
      setPickedUri(null);
      setPickedName("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Upload Failed", e.message);
    } finally {
      setUploading(false);
    }
  };

  const topPadding = insets.top;

  if (selected) {
    const viewerUrl =
      Platform.OS === "ios"
        ? selected.url
        : `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(selected.url)}`;

    return (
      <View style={[styles.flex, { paddingTop: topPadding }]}>
        <View style={styles.viewerHeader}>
          <Pressable
            onPress={() => setSelected(null)}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={22} color={Colors.primary} />
          </Pressable>
          <Text style={styles.viewerTitle} numberOfLines={1}>
            {formatDate(selected.date)}
          </Text>
          <View style={styles.backBtn} />
        </View>
        {Platform.OS === "web" ? (
          <View style={styles.center}>
            <Feather name="file-text" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              Open this bulletin on your mobile device to view it.
            </Text>
          </View>
        ) : (
          <WebView
            source={{ uri: viewerUrl }}
            style={styles.webview}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.center}>
                <ActivityIndicator color={Colors.primary} size="large" />
              </View>
            )}
            javaScriptEnabled
            domStorageEnabled
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.screenHeader, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.screenTitle}>Bulletins</Text>
        {isLeader && (
          <Pressable
            onPress={() => setShowUpload(true)}
            style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="upload" size={18} color={Colors.textInverse} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="file-text" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No bulletins yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <BulletinCard
              item={item}
              canDelete={!!isLeader}
              onDelete={handleDelete}
              onOpen={setSelected}
            />
          )}
        />
      )}

      <Modal visible={showUpload} onClose={() => setShowUpload(false)} title="New Bulletin">
        <View style={styles.formFields}>
          <Text style={styles.fieldLabel}>Bulletin Date</Text>
          <Pressable
            style={({ pressed }) => [styles.dateBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => setShowDatePicker((v) => !v)}
          >
            <Feather name="calendar" size={18} color={Colors.primary} />
            <Text style={styles.dateBtnText}>{formatDate(bulletinDate)}</Text>
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              value={bulletinDate}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={(_, date) => {
                if (Platform.OS === "android") setShowDatePicker(false);
                if (date) setBulletinDate(date);
              }}
              maximumDate={new Date()}
              themeVariant="light"
              accentColor={Colors.primary}
              style={styles.datePicker}
            />
          )}

          <Pressable
            style={({ pressed }) => [styles.pickBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={handlePick}
          >
            <Feather
              name="file"
              size={18}
              color={pickedUri ? Colors.success : Colors.primary}
            />
            <Text style={[styles.pickBtnText, pickedUri ? { color: Colors.success } : {}]}>
              {pickedUri ? pickedName : "Choose PDF"}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              { opacity: pressed || !pickedUri ? 0.6 : 1 },
            ]}
            onPress={handleUpload}
            disabled={uploading || !pickedUri}
          >
            {uploading ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <Text style={styles.submitText}>Upload Bulletin</Text>
            )}
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundSecondary },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.backgroundSecondary,
  },
  screenTitle: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.text },
  addBtn: {
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  viewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: Colors.backgroundSecondary,
    gap: 8,
  },
  backBtn: { width: 36, alignItems: "flex-start" },
  viewerTitle: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: Colors.text,
    textAlign: "center",
  },
  webview: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  list: { padding: 16, gap: 10 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: "center",
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  pdfIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardDate: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 12, marginLeft: 8 },
  deleteBtn: { padding: 4 },
  formFields: { gap: 14 },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dateBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.text,
  },
  datePicker: {
    alignSelf: "stretch",
    marginTop: -8,
  },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.primary,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.textInverse,
  },
});
