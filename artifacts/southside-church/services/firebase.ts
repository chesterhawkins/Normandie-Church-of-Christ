import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

const extra = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? extra.firebaseApiKey ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? extra.firebaseAuthDomain ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? extra.firebaseProjectId ?? "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? extra.firebaseStorageBucket ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? extra.firebaseMessagingSenderId ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? extra.firebaseAppId ?? "",
};

console.log("[Firebase] Initializing, projectId:", firebaseConfig.projectId || "(empty — check secrets)");
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function getFirebaseAuth() {
  if (Platform.OS === "web") return getAuth(app);
  try {
    // Metro resolves firebase/auth to its React Native build which exports
    // getReactNativePersistence; we require() at runtime to avoid TS errors
    // from the web typings which don't include that export.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getReactNativePersistence } = require("firebase/auth") as {
      getReactNativePersistence: (storage: typeof AsyncStorage) => any;
    };
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(app);
  }
}

export const auth = getFirebaseAuth();
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
