import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { auth, db } from "@/services/firebase";
import { registerPushToken, subscribeTopics, unsubscribeTopics } from "@/services/notifications";

export interface AppUser {
  uid: string;
  email: string | null;
  firstName: string;
  lastName: string;
  middleName?: string;
  phone?: string;
  profilePicUrl?: string;
  type: string;
}

export function fullName(user: AppUser): string {
  const parts = [user.firstName, user.middleName, user.lastName].filter(Boolean);
  return parts.join(" ") || user.email || "Member";
}

interface AuthContextValue {
  user: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
  isLeader: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        registerPushToken(fbUser.uid).catch(() => {});
        try {
          const userDoc = await getDoc(doc(db, "User", fbUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const userType = data.type || "Member";
            setAppUser({
              uid: fbUser.uid,
              email: fbUser.email,
              firstName: data.firstName || "",
              lastName: data.lastName || "",
              middleName: data.middleName,
              phone: data.phone,
              profilePicUrl: data.profilePicUrl,
              type: userType,
            });
            subscribeTopics(fbUser.uid, userType).catch(() => {});
          } else {
            setAppUser({
              uid: fbUser.uid,
              email: fbUser.email,
              firstName: fbUser.displayName?.split(" ")[0] || "",
              lastName: fbUser.displayName?.split(" ").slice(1).join(" ") || "",
              type: "Member",
            });
            subscribeTopics(fbUser.uid, "Member").catch(() => {});
          }
        } catch {
          setAppUser({
            uid: fbUser.uid,
            email: fbUser.email,
            firstName: fbUser.displayName?.split(" ")[0] || "",
            lastName: fbUser.displayName?.split(" ").slice(1).join(" ") || "",
            type: "Member",
          });
          subscribeTopics(fbUser.uid, "Member").catch(() => {});
        }
      } else {
        setFirebaseUser(null);
        setAppUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "User", cred.user.uid), {
      email,
      firstName,
      lastName,
      type: "Member",
    });
  };

  const logOut = async () => {
    const uid = auth.currentUser?.uid;
    if (uid) await unsubscribeTopics(uid).catch(() => {});
    await signOut(auth);
  };

  const refreshUser = async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    const userDoc = await getDoc(doc(db, "User", fbUser.uid));
    if (!userDoc.exists()) return;
    const data = userDoc.data();
    setAppUser({
      uid: fbUser.uid,
      email: fbUser.email,
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      middleName: data.middleName,
      phone: data.phone,
      profilePicUrl: data.profilePicUrl,
      type: data.type || "Member",
    });
  };

  const typeLC = appUser?.type?.toLowerCase() ?? "";

  const value = useMemo<AuthContextValue>(
    () => ({
      user: appUser,
      firebaseUser,
      loading,
      isLeader: typeLC === "leader" || typeLC === "admin",
      isAdmin: typeLC === "admin",
      signIn,
      signUp,
      logOut,
      refreshUser,
    }),
    [appUser, firebaseUser, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
