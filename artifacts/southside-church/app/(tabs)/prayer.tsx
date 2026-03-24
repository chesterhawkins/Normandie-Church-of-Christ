import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Image } from "expo-image";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import {
  PrayerRequest,
  PrayerVisibility,
  getPrayerRequests,
  createPrayerRequest,
  deletePrayerRequest,
  togglePrayed,
  updatePrayerRequest,
} from "@/services/prayer";
import Modal from "@/components/Modal";

function formatDate(d: Date) {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const VISIBILITY_OPTIONS: { value: PrayerVisibility; label: string }[] = [
  { value: "Members", label: "All Members" },
  { value: "Leaders", label: "Leaders Only" },
];

const VISIBILITY_BADGE: Record<string, { label: string; color: string } | null> = {
  Members: null,
  Public: null, // legacy — treat same as Members
  Leaders: { label: "Leaders Only", color: Colors.textSecondary },
};

function PrayerCard({
  item,
  uid,
  canDelete,
  canEdit,
  onDelete,
  onEdit,
  onTogglePray,
}: {
  item: PrayerRequest;
  uid: string;
  canDelete: boolean;
  canEdit: boolean;
  onDelete: (id: string) => void;
  onEdit: (item: PrayerRequest) => void;
  onTogglePray: (id: string, hasPrayed: boolean) => void;
}) {
  const hasPrayed = item.prayersReceived.includes(uid);
  const prayCount = item.prayersReceived.length;
  const badge = VISIBILITY_BADGE[item.visibility];
  const initial = (item.userName || "?").charAt(0).toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Pressable onPress={() => router.push(`/user/${item.user}`)}>
          {item.userProfilePicUrl ? (
            <Image source={{ uri: item.userProfilePicUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatarFallback]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
        </Pressable>
        <Pressable style={styles.cardMeta} onPress={() => router.push(`/user/${item.user}`)}>
          <Text style={styles.cardName}>{item.userName}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
            {badge && (
              <View style={[styles.badge, { borderColor: badge.color + "40", backgroundColor: badge.color + "15" }]}>
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            )}
          </View>
        </Pressable>
        <View style={styles.cardBtns}>
          {canEdit && (
            <Pressable onPress={() => onEdit(item)} hitSlop={8} style={styles.iconBtn}>
              <Feather name="edit-2" size={15} color={Colors.textMuted} />
            </Pressable>
          )}
          {canDelete && (
            <Pressable onPress={() => onDelete(item.id)} hitSlop={8} style={styles.iconBtn}>
              <Feather name="trash-2" size={15} color={Colors.danger} />
            </Pressable>
          )}
        </View>
      </View>
      <Text style={styles.cardText}>{item.request}</Text>
      <View style={styles.cardActions}>
        <Pressable
          style={({ pressed }) => [
            styles.prayBtn,
            hasPrayed ? styles.prayBtnActive : {},
            { opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => onTogglePray(item.id, hasPrayed)}
        >
          <Feather
            name="heart"
            size={16}
            color={hasPrayed ? Colors.background : Colors.textSecondary}
          />
          <Text style={[styles.prayBtnText, hasPrayed ? styles.prayBtnTextActive : {}]}>
            {prayCount > 0 ? `${prayCount} Prayed` : "I Prayed"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function PrayerScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLeader, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [prayerText, setPrayerText] = useState("");
  const [visibility, setVisibility] = useState<PrayerVisibility>("Members");
  const [creating, setCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<PrayerRequest | null>(null);
  const [editText, setEditText] = useState("");
  const [editVisibility, setEditVisibility] = useState<PrayerVisibility>("Members");

  if (!user) {
    return (
      <View style={styles.authWall}>
        <Feather name="lock" size={48} color={Colors.textMuted} />
        <Text style={styles.authTitle}>Members Only</Text>
        <Text style={styles.authSub}>Please sign in to view prayer requests.</Text>
        <Pressable
          style={({ pressed }) => [styles.signInBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.signInBtnText}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  const canSeeAll = !!(isLeader || isAdmin);

  const { data = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["prayers", canSeeAll],
    queryFn: () => getPrayerRequests(canSeeAll),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePrayerRequest,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["prayers"] });
      const previous = qc.getQueryData<PrayerRequest[]>(["prayers", canSeeAll]);
      qc.setQueryData<PrayerRequest[]>(["prayers", canSeeAll], (old) => old?.filter((r) => r.id !== id));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["prayers", canSeeAll], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["prayers"], refetchType: "none" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, hasPrayed }: { id: string; hasPrayed: boolean }) =>
      togglePrayed(id, user.uid, hasPrayed),
    onMutate: async ({ id, hasPrayed }) => {
      await qc.cancelQueries({ queryKey: ["prayers"] });
      const previous = qc.getQueryData<PrayerRequest[]>(["prayers", canSeeAll]);
      qc.setQueryData<PrayerRequest[]>(["prayers", canSeeAll], (old) =>
        old?.map((r) =>
          r.id !== id ? r : {
            ...r,
            prayersReceived: hasPrayed
              ? r.prayersReceived.filter((uid) => uid !== user.uid)
              : [...r.prayersReceived, user.uid],
          }
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["prayers", canSeeAll], context.previous);
      }
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, request, visibility }: { id: string; request: string; visibility: PrayerVisibility }) =>
      updatePrayerRequest(id, request, visibility),
    onMutate: async ({ id, request, visibility }) => {
      await qc.cancelQueries({ queryKey: ["prayers"] });
      const previous = qc.getQueryData<PrayerRequest[]>(["prayers", !!(isLeader || isAdmin)]);
      qc.setQueryData<PrayerRequest[]>(["prayers", !!(isLeader || isAdmin)], (old) =>
        old?.map((r) => (r.id === id ? { ...r, request, visibility } : r))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["prayers", !!(isLeader || isAdmin)], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["prayers"], refetchType: "none" }),
  });

  const handleEdit = useCallback((item: PrayerRequest) => {
    setEditingItem(item);
    setEditText(item.request);
    setEditVisibility(item.visibility);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingItem || !editText.trim()) return;
    editMutation.mutate({ id: editingItem.id, request: editText.trim(), visibility: editVisibility });
    setEditingItem(null);
    setEditText("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [editingItem, editText, editVisibility]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert("Delete Prayer Request", "Are you sure?", [
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

  const handleTogglePray = useCallback((id: string, hasPrayed: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleMutation.mutate({ id, hasPrayed });
  }, []);

  const handleCreate = async () => {
    if (!prayerText.trim()) return;
    setCreating(true);
    try {
      await createPrayerRequest(prayerText.trim(), visibility, user.uid);
      qc.invalidateQueries({ queryKey: ["prayers"] });
      setShowCreate(false);
      setPrayerText("");
      setVisibility("Members");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setCreating(false);
    }
  };

  const canDeleteItem = (item: PrayerRequest) => canSeeAll || item.user === user.uid;
  const canEditItem = (item: PrayerRequest) => canSeeAll || item.user === user.uid;

  return (
    <View style={styles.flex}>
      <View style={[styles.screenHeader, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.screenTitle}>Prayer</Text>
        <Pressable
          onPress={() => setShowCreate(true)}
          style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Feather name="plus" size={20} color={Colors.textInverse} />
        </Pressable>
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
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="heart" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No prayer requests yet</Text>
              <Text style={styles.emptySub}>Be the first to share</Text>
            </View>
          }
          renderItem={({ item }) => (
            <PrayerCard
              item={item}
              uid={user.uid}
              canDelete={canDeleteItem(item)}
              canEdit={canEditItem(item)}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onTogglePray={handleTogglePray}
            />
          )}
        />
      )}

      <Modal
        visible={!!editingItem}
        onClose={() => { setEditingItem(null); setEditText(""); }}
        title="Edit Prayer Request"
      >
        <View style={styles.formFields}>
          <TextInput
            style={[styles.formInput, styles.multiline]}
            placeholder="Edit your prayer request..."
            placeholderTextColor={Colors.textMuted}
            value={editText}
            onChangeText={setEditText}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            autoFocus
          />
          <Text style={styles.visibilityLabel}>Visible to:</Text>
          <View style={styles.visibilityRow}>
            {VISIBILITY_OPTIONS.map(({ value, label }) => (
              <Pressable
                key={value}
                style={[styles.visibilityBtn, editVisibility === value ? styles.visibilityBtnActive : {}]}
                onPress={() => setEditVisibility(value)}
              >
                <Text style={[styles.visibilityBtnText, editVisibility === value ? styles.visibilityBtnTextActive : {}]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={({ pressed }) => [styles.submitBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleSaveEdit}
            disabled={!editText.trim()}
          >
            <Text style={styles.submitText}>Save Changes</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={showCreate} onClose={() => setShowCreate(false)} title="New Prayer Request">
        <View style={styles.formFields}>
          <TextInput
            style={[styles.formInput, styles.multiline]}
            placeholder="Share your prayer request..."
            placeholderTextColor={Colors.textMuted}
            value={prayerText}
            onChangeText={setPrayerText}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={styles.visibilityLabel}>Visible to:</Text>
          <View style={styles.visibilityRow}>
            {VISIBILITY_OPTIONS.map(({ value, label }) => (
              <Pressable
                key={value}
                style={[styles.visibilityBtn, visibility === value ? styles.visibilityBtnActive : {}]}
                onPress={() => setVisibility(value)}
              >
                <Text style={[styles.visibilityBtnText, visibility === value ? styles.visibilityBtnTextActive : {}]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={({ pressed }) => [styles.submitBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleCreate}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <Text style={styles.submitText}>Submit Request</Text>
            )}
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.backgroundSecondary },
  authWall: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: Colors.backgroundSecondary,
    gap: 12,
  },
  authTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text, marginTop: 8 },
  authSub: { fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textSecondary, textAlign: "center" },
  signInBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 8,
  },
  signInBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textInverse },
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 14 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textMuted },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
  card: { backgroundColor: Colors.background, borderRadius: 16, padding: 16, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textInverse },
  cardMeta: { flex: 1 },
  cardName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 },
  cardDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  badge: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontFamily: "Inter_500Medium", fontSize: 10 },
  cardBtns: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: { padding: 4 },
  cardText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  cardActions: { flexDirection: "row" },
  prayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  prayBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  prayBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  prayBtnTextActive: { color: Colors.textInverse },
  formFields: { gap: 16 },
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
  multiline: { height: 120, paddingTop: 12 },
  visibilityLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: -4 },
  visibilityRow: { flexDirection: "row", gap: 10 },
  visibilityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  visibilityBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  visibilityBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  visibilityBtnTextActive: { color: Colors.textInverse },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textInverse },
});
