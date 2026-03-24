import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import ImageViewer from "@/components/ImageViewer";
import LinkPreview from "@/components/LinkPreview";
import VideoEmbed from "@/components/VideoEmbed";
import Modal from "@/components/Modal";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import {
  Announcement,
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from "@/services/announcements";
import { detectFirstLink, extractAllUrls } from "@/utils/linkDetection";

function formatDate(d: Date) {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface TextSegment {
  text: string;
  isUrl: boolean;
}

function parseTextWithUrls(text: string): TextSegment[] {
  const urls = extractAllUrls(text);
  if (urls.length === 0) return [{ text, isUrl: false }];

  const segments: TextSegment[] = [];
  let remaining = text;

  for (const url of urls) {
    const idx = remaining.indexOf(url);
    if (idx === -1) continue;
    if (idx > 0) {
      segments.push({ text: remaining.slice(0, idx), isUrl: false });
    }
    segments.push({ text: url, isUrl: true });
    remaining = remaining.slice(idx + url.length);
  }
  if (remaining) {
    segments.push({ text: remaining, isUrl: false });
  }
  return segments;
}

function LinkedText({ text }: { text: string }) {
  const segments = useMemo(() => parseTextWithUrls(text), [text]);

  return (
    <Text style={styles.cardText}>
      {segments.map((seg, i) =>
        seg.isUrl ? (
          <Text
            key={i}
            style={styles.linkText}
            onPress={() => Linking.openURL(seg.text)}
          >
            {seg.text}
          </Text>
        ) : (
          <Text key={i}>{seg.text}</Text>
        )
      )}
    </Text>
  );
}

function AnnouncementCard({
  item,
  canDelete,
  canEdit,
  onDelete,
  onEdit,
}: {
  item: Announcement;
  canDelete: boolean;
  canEdit: boolean;
  onDelete: (id: string) => void;
  onEdit: (item: Announcement) => void;
}) {
  const link = useMemo(() => detectFirstLink(item.text), [item.text]);
  const [viewingImage, setViewingImage] = useState(false);

  return (
    <View style={styles.card}>
      {item.imageUrl ? (
        <>
          <Pressable onPress={() => setViewingImage(true)}>
            <Image source={{ uri: item.imageUrl }} style={styles.cardImage} contentFit="contain" />
          </Pressable>
          <ImageViewer uri={item.imageUrl} visible={viewingImage} onClose={() => setViewingImage(false)} />
        </>
      ) : null}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={styles.senderBadge}>
            <Feather name="user" size={12} color={Colors.primary} />
            <Text style={styles.senderText}>{item.sender}</Text>
          </View>
          <View style={styles.cardActions}>
            {canEdit && (
              <Pressable onPress={() => onEdit(item)} style={styles.actionBtn} hitSlop={8}>
                <Feather name="edit-2" size={15} color={Colors.textMuted} />
              </Pressable>
            )}
            {canDelete && (
              <Pressable onPress={() => onDelete(item.id)} style={styles.actionBtn} hitSlop={8}>
                <Feather name="trash-2" size={15} color={Colors.danger} />
              </Pressable>
            )}
          </View>
        </View>
        <LinkedText text={item.text} />

        {link && (link.type === "youtube" || link.type === "vimeo") && link.embedUrl ? (
          <VideoEmbed embedUrl={link.embedUrl} />
        ) : null}

        {link && link.type === "link" ? (
          <LinkPreview url={link.url} />
        ) : null}

        <View style={styles.cardFooter}>
          <Feather name="calendar" size={12} color={Colors.textMuted} />
          <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function AnnouncementsScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLeader, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [text, setText] = useState("");
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [editText, setEditText] = useState("");

  const { data = [], isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["announcements"],
    queryFn: getAnnouncements,
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["announcements"] });
      const previous = qc.getQueryData<Announcement[]>(["announcements"]);
      qc.setQueryData<Announcement[]>(["announcements"], (old) => old?.filter((a) => a.id !== id));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["announcements"], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["announcements"], refetchType: "none" }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => updateAnnouncement(id, text),
    onMutate: async ({ id, text }) => {
      await qc.cancelQueries({ queryKey: ["announcements"] });
      const previous = qc.getQueryData<Announcement[]>(["announcements"]);
      qc.setQueryData<Announcement[]>(["announcements"], (old) =>
        old?.map((a) => (a.id === id ? { ...a, text } : a))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["announcements"], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["announcements"], refetchType: "none" }),
  });

  const handleEdit = useCallback((item: Announcement) => {
    setEditingItem(item);
    setEditText(item.text);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingItem || !editText.trim()) return;
    editMutation.mutate({ id: editingItem.id, text: editText.trim() });
    setEditingItem(null);
    setEditText("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [editingItem, editText]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert("Delete Announcement", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteMutation.mutate(id);
        },
      },
    ]);
  }, []);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access to attach an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPickedImageUri(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!text.trim() || !user) return;
    setCreating(true);
    if (pickedImageUri) setUploadingImage(true);
    try {
      await createAnnouncement(
        text.trim(),
        user.uid,
        pickedImageUri ?? undefined
      );
      qc.invalidateQueries({ queryKey: ["announcements"] });
      setShowCreate(false);
      setText("");
      setPickedImageUri(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setCreating(false);
      setUploadingImage(false);
    }
  };

  const topPadding = insets.top;

  return (
    <View style={styles.flex}>
      <View style={[styles.screenHeader, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.screenTitle}>Announcements</Text>
        {isLeader && (
          <Pressable
            onPress={() => setShowCreate(true)}
            style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="plus" size={20} color={Colors.textInverse} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Feather name="wifi-off" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Failed to load announcements</Text>
          <Text style={styles.errorDetail}>{(error as Error)?.message}</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="bell-off" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No announcements yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <AnnouncementCard
              item={item}
              canDelete={!!(isLeader || isAdmin)}
              canEdit={!!(isLeader || isAdmin)}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          )}
        />
      )}

      <Modal
        visible={!!editingItem}
        onClose={() => { setEditingItem(null); setEditText(""); }}
        title="Edit Announcement"
      >
        <View style={styles.formFields}>
          <TextInput
            style={[styles.formInput, styles.multiline]}
            placeholder="Edit announcement..."
            placeholderTextColor={Colors.textMuted}
            value={editText}
            onChangeText={setEditText}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            autoFocus
          />
          <Pressable
            style={({ pressed }) => [styles.submitBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleSaveEdit}
            disabled={!editText.trim()}
          >
            <Text style={styles.submitText}>Save Changes</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={showCreate} onClose={() => { setShowCreate(false); setText(""); setPickedImageUri(null); }} title="New Announcement">
        <View style={styles.formFields}>
          <TextInput
            style={[styles.formInput, styles.multiline]}
            placeholder="Write your announcement..."
            placeholderTextColor={Colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          {pickedImageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: pickedImageUri }} style={styles.imagePreview} contentFit="cover" />
              <Pressable style={styles.removeImageBtn} onPress={() => setPickedImageUri(null)} hitSlop={8}>
                <Feather name="x" size={14} color={Colors.textInverse} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.pickImageBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={handlePickImage}
            >
              <Feather name="image" size={18} color={Colors.primary} />
              <Text style={styles.pickImageText}>Add Photo (optional)</Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [styles.submitBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleCreate}
            disabled={creating}
          >
            {creating ? (
              <View style={styles.creatingRow}>
                <ActivityIndicator color={Colors.textInverse} />
                <Text style={styles.submitText}>
                  {uploadingImage ? "Uploading image..." : "Posting..."}
                </Text>
              </View>
            ) : (
              <Text style={styles.submitText}>Post Announcement</Text>
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
  screenTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 14 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 16, color: Colors.textMuted, textAlign: "center" },
  errorDetail: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.danger, textAlign: "center", paddingHorizontal: 32, marginTop: 4 },
  retryBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 10 },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textInverse },
  pickImageBtn: {
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
  pickImageText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.primary },
  imagePreviewContainer: { position: "relative", borderRadius: 12, overflow: "hidden" },
  imagePreview: { width: "100%", height: 180, borderRadius: 12 },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  creatingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    overflow: "hidden",
  },
  cardImage: { width: "100%", aspectRatio: 4 / 3, backgroundColor: Colors.backgroundSecondary },
  cardBody: { padding: 16, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  senderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  senderText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
  },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionBtn: { padding: 4 },
  cardText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
    lineHeight: 23,
  },
  linkText: {
    color: Colors.primary,
    textDecorationLine: "underline",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  cardDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  formFields: { gap: 14 },
  formInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
  },
  multiline: { height: 130, paddingTop: 12 },
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
