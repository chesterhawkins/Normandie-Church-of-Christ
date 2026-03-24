import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/services/firebase";

export type PrayerVisibility = "Members" | "Leaders";

export interface PrayerRequest {
  id: string;
  request: string;
  visibility: PrayerVisibility;
  createdAt: Date;
  user: string;
  prayersReceived: string[];
  // enriched from User collection
  userName: string;
  userProfilePicUrl: string | null;
}

async function fetchUserProfiles(uids: string[]): Promise<Map<string, { name: string; profilePicUrl: string | null }>> {
  const unique = [...new Set(uids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const docs = await Promise.all(unique.map((id) => getDoc(doc(db, "User", id))));
  const map = new Map<string, { name: string; profilePicUrl: string | null }>();
  for (const d of docs) {
    if (!d.exists()) continue;
    const data = d.data();
    const parts = [data.firstName, data.middleName, data.lastName].filter(Boolean);
    map.set(d.id, {
      name: parts.join(" ") || data.email || "Unknown",
      profilePicUrl: data.profilePicUrl ?? null,
    });
  }
  return map;
}

export async function getPrayerRequests(isLeader: boolean): Promise<PrayerRequest[]> {
  // "Public" is treated as "Members" — include it for all logged-in users
  const q = isLeader
    ? query(collection(db, "PrayerRequest"), orderBy("createdAt", "desc"))
    : query(
        collection(db, "PrayerRequest"),
        where("visibility", "in", ["Public", "Members"]),
        orderBy("createdAt", "desc")
      );
  const snap = await getDocs(q);
  const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

  const userMap = await fetchUserProfiles(raw.map((r) => r.user));

  return raw.map((data) => {
    const profile = userMap.get(data.user);
    return {
      id: data.id,
      request: data.request,
      visibility: data.visibility,
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
      user: data.user,
      prayersReceived: data.prayersReceived || [],
      userName: profile?.name ?? "Unknown",
      userProfilePicUrl: profile?.profilePicUrl ?? null,
    } as PrayerRequest;
  });
}

export async function createPrayerRequest(
  request: string,
  visibility: PrayerVisibility,
  uid: string
): Promise<string> {
  const ref = await addDoc(collection(db, "PrayerRequest"), {
    request,
    visibility,
    user: uid,
    prayersReceived: [],
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deletePrayerRequest(id: string): Promise<void> {
  await deleteDoc(doc(db, "PrayerRequest", id));
}

export async function updatePrayerRequest(
  id: string,
  request: string,
  visibility: PrayerVisibility
): Promise<void> {
  await updateDoc(doc(db, "PrayerRequest", id), { request, visibility });
}

export async function togglePrayed(
  requestId: string,
  uid: string,
  hasPrayed: boolean
): Promise<void> {
  const ref = doc(db, "PrayerRequest", requestId);
  await updateDoc(ref, {
    prayersReceived: hasPrayed ? arrayRemove(uid) : arrayUnion(uid),
  });
}
