import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { DirectoryMember, getDirectory, memberFullName, updateMemberType } from "@/services/directory";
import { useQueryClient, useMutation } from "@tanstack/react-query";

function typeColor(type: string): string {
  switch (type.toLowerCase()) {
    case "admin": return Colors.danger;
    case "leader": return Colors.accent;
    default: return Colors.primary;
  }
}

function MemberCard({
  item,
  onTypeChange,
  typeOptions,
}: {
  item: DirectoryMember;
  onTypeChange?: (id: string, type: string) => void;
  typeOptions?: string[];
}) {
  const name = memberFullName(item);
  const initial = (item.firstName || item.lastName || "?").charAt(0).toUpperCase();
  const color = typeColor(item.type);
  const canChange = !!onTypeChange && !!typeOptions?.length;

  const handleTypeBadgePress = () => {
    if (!canChange) return;
    const options = [...typeOptions!, "Cancel"];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1, title: `Change role for ${name}` },
        (idx) => {
          if (idx < typeOptions!.length) onTypeChange!(item.id, typeOptions![idx]);
        }
      );
    } else {
      Alert.alert(`Change role for ${name}`, undefined,
        [
          ...typeOptions!.map((t) => ({ text: t, onPress: () => onTypeChange!(item.id, t) })),
          { text: "Cancel", style: "cancel" as const },
        ]
      );
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
      onPress={() => router.push(`/user/${item.id}`)}
    >
      {item.profilePicUrl ? (
        <Image source={{ uri: item.profilePicUrl }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatarFallback, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        {item.email && (
          <Text style={styles.detail} numberOfLines={1}>{item.email}</Text>
        )}
        {item.phone && (
          <Text style={styles.detail}>{item.phone}</Text>
        )}
      </View>
      <Pressable
        onPress={handleTypeBadgePress}
        style={[styles.badge, { backgroundColor: color + "22" }]}
        hitSlop={8}
        disabled={!canChange}
      >
        <Text style={[styles.badgeText, { color }]}>{item.type}</Text>
        {canChange && <Feather name="chevron-down" size={10} color={color} style={{ marginLeft: 2 }} />}
      </Pressable>
    </Pressable>
  );
}

export default function DirectoryScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLeader, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const TYPE_FILTERS = ["All", "Admin", "Leader", "Member", "Guest"];

  const typeMutation = useMutation({
    mutationFn: ({ id, type }: { id: string; type: string }) => updateMemberType(id, type),
    onMutate: async ({ id, type }) => {
      await qc.cancelQueries({ queryKey: ["directory"] });
      const previous = qc.getQueryData<DirectoryMember[]>(["directory"]);
      qc.setQueryData<DirectoryMember[]>(["directory"], (old) =>
        old?.map((m) => m.id === id ? { ...m, type } : m)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["directory"], ctx.previous);
    },
  });

  if (!user) {
    return (
      <View style={styles.authWall}>
        <Feather name="lock" size={48} color={Colors.textMuted} />
        <Text style={styles.authTitle}>Members Only</Text>
        <Text style={styles.authSub}>Please sign in to view the directory.</Text>
        <Pressable
          style={({ pressed }) => [styles.signInBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.signInBtnText}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  const { data = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["directory"],
    queryFn: getDirectory,
  });

  const filtered = useMemo(() => {
    let result = data;
    if (typeFilter !== "All") {
      result = result.filter((m) => m.type.toLowerCase() === typeFilter.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          memberFullName(m).toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.phone?.includes(q)
      );
    }
    return result;
  }, [data, search, typeFilter]);

  const topPadding = insets.top;

  return (
    <View style={styles.flex}>
      <View style={[styles.screenHeader, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.screenTitle}>Directory</Text>
        <View style={styles.headerRight}>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{data.length}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.profileBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push(`/user/${user.uid}`)}
          >
            {user.profilePicUrl ? (
              <Image source={{ uri: user.profilePicUrl }} style={styles.profileBtnAvatar} contentFit="cover" />
            ) : (
              <Text style={styles.profileBtnInitial}>
                {(user.firstName || user.lastName || "?").charAt(0).toUpperCase()}
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search members..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Feather name="x" size={16} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {TYPE_FILTERS.map((f) => {
          const active = typeFilter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setTypeFilter(f)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="users" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>
                {search || typeFilter !== "All" ? "No results found" : "No members yet"}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const targetType = item.type.toLowerCase();
            const canEdit =
              item.id !== user.uid &&
              (isAdmin || (isLeader && targetType !== "admin"));
            const options = canEdit
              ? ["Guest", "Member", "Leader", "Admin"]
              : undefined;
            return (
              <MemberCard
                item={item}
                onTypeChange={canEdit ? (id, type) => typeMutation.mutate({ id, type }) : undefined}
                typeOptions={options}
              />
            );
          }}
        />
      )}
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
  authSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
  },
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
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  profileBtn: {
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileBtnAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  profileBtnInitial: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.textInverse,
  },
  countBadge: {
    backgroundColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.textInverse,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
    height: "100%",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 8 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 16, color: Colors.textMuted },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textInverse },
  info: { flex: 1, gap: 2 },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  detail: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center" },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
});
