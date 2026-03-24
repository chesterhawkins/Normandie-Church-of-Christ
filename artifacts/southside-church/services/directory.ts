import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { db, storage } from "@/services/firebase";

export interface DirectoryMember {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phone?: string;
  profilePicUrl?: string;
  type: string;
}

export function memberFullName(m: DirectoryMember): string {
  const parts = [m.firstName, m.middleName, m.lastName].filter(Boolean);
  return parts.join(" ") || m.email || "Unknown";
}

export async function getMember(id: string): Promise<DirectoryMember | null> {
  const snap = await getDoc(doc(db, "User", id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    middleName: data.middleName,
    email: data.email,
    phone: data.phone,
    profilePicUrl: data.profilePicUrl,
    type: data.type || "Member",
  };
}

export interface MemberUpdate {
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
}

export async function updateMember(id: string, data: MemberUpdate): Promise<void> {
  await updateDoc(doc(db, "User", id), {
    firstName: data.firstName,
    lastName: data.lastName,
    middleName: data.middleName || deleteField(),
    phone: data.phone || deleteField(),
  });
}

export async function updateMemberType(id: string, type: string): Promise<void> {
  await updateDoc(doc(db, "User", id), { type });
}

export async function uploadProfilePicture(uid: string, imageUri: string): Promise<string> {
  const response = await fetch(imageUri);
  const blob = await response.blob();
  const storageRef = ref(storage, `images/profilePictures/${uid}.jpg`);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "User", uid), { profilePicUrl: url });
  return url;
}

export async function getDirectory(): Promise<DirectoryMember[]> {
  const q = query(collection(db, "User"), orderBy("lastName", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      middleName: data.middleName,
      email: data.email,
      phone: data.phone,
      profilePicUrl: data.profilePicUrl,
      type: data.type || "Member",
    } as DirectoryMember;
  });
}
