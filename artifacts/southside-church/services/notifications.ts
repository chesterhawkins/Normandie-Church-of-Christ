import * as Notifications from "expo-notifications";
import { arrayUnion, doc, getDoc, updateDoc } from "firebase/firestore";
import { Platform } from "react-native";

import { db } from "@/services/firebase";

const MEMBER_TOPICS = ["General", "Announcements", "Prayer-Members"];
const LEADER_TOPICS = ["Prayer-Leaders"];
const ALL_TOPICS = [...MEMBER_TOPICS, ...LEADER_TOPICS];

async function callIID(
  action: "batchAdd" | "batchRemove",
  tokens: string[],
  topics: string[],
): Promise<void> {
  const serverKey = process.env.EXPO_PUBLIC_FIREBASE_SERVER_KEY;
  if (!serverKey || tokens.length === 0) return;

  await Promise.all(
    topics.map((topic) =>
      fetch(`https://iid.googleapis.com/iid/v1:${action}`, {
        method: "POST",
        headers: {
          Authorization: `key=${serverKey}`,
          "Content-Type": "application/json",
          "access_token_auth": "true",
        },
        body: JSON.stringify({
          to: `/topics/${topic}`,
          registration_tokens: tokens,
        }),
      }),
    ),
  );
}

export async function registerPushToken(uid: string): Promise<void> {
  if (Platform.OS === "web") return;

  const { status } = await Notifications.getPermissionsAsync();
  const finalStatus =
    status === "granted"
      ? status
      : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== "granted") return;

  const token = (await Notifications.getDevicePushTokenAsync()).data;
  await updateDoc(doc(db, "User", uid), { fcmTokens: arrayUnion(token) });
}

export async function subscribeTopics(
  uid: string,
  userType: string,
): Promise<void> {
  if (Platform.OS === "web") return;

  const userDoc = await getDoc(doc(db, "User", uid));
  const tokens: string[] = userDoc.data()?.fcmTokens ?? [];
  if (tokens.length === 0) return;

  const typeLC = userType.toLowerCase();
  const isLeaderOrAdmin = typeLC === "leader" || typeLC === "admin";
  const topics = isLeaderOrAdmin ? ALL_TOPICS : MEMBER_TOPICS;

  await callIID("batchAdd", tokens, topics);
}

export async function unsubscribeTopics(uid: string): Promise<void> {
  if (Platform.OS === "web") return;

  const userDoc = await getDoc(doc(db, "User", uid));
  const tokens: string[] = userDoc.data()?.fcmTokens ?? [];
  if (tokens.length === 0) return;

  await callIID("batchRemove", tokens, ALL_TOPICS);
}
