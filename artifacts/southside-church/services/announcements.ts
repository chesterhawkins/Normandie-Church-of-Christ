import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { db, storage } from "@/services/firebase";

export interface Announcement {
  id: string;
  text: string;
  sender: string;
  createdAt: Date;
  imageUrl?: string;
  imageName?: string;
}

async function resolveSenderNames(uids: string[]): Promise<Record<string, string>> {
  if (uids.length === 0) return {};
  const nameMap: Record<string, string> = {};
  const chunks: string[][] = [];
  for (let i = 0; i < uids.length; i += 30) {
    chunks.push(uids.slice(i, i + 30));
  }
  await Promise.all(
    chunks.map(async (chunk) => {
      const snap = await getDocs(
        query(collection(db, "User"), where(documentId(), "in", chunk))
      );
      snap.docs.forEach((d) => {
        const data = d.data();
        const parts = [data.firstName, data.middleName, data.lastName].filter(Boolean);
        nameMap[d.id] = parts.join(" ") || data.email || d.id;
      });
    })
  );
  return nameMap;
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const q = query(collection(db, "Announcement"), orderBy("createdAt", "desc"));
  let snap;
  try {
    snap = await getDocs(q);
  } catch (err) {
    console.error("[Firestore] getAnnouncements error:", err);
    throw err;
  }

  const uniqueUids = [...new Set(snap.docs.map((d) => d.data().sender).filter(Boolean))];
  const nameMap = await resolveSenderNames(uniqueUids);

  return snap.docs.map((d) => {
    const data = d.data();
    const senderUid = data.sender ?? "";
    return {
      id: d.id,
      text: data.text ?? "",
      sender: nameMap[senderUid] || senderUid,
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
      imageUrl: data.imageUrl,
      imageName: data.imageName,
    };
  });
}

export async function createAnnouncement(
  text: string,
  senderUid: string,
  imageUri?: string
): Promise<string> {
  let imageUrl: string | undefined;
  let imageName: string | undefined;

  if (imageUri) {
    imageName = new Date().toISOString().replace(/:/g, "-");
    const announcementRef = ref(storage, `announcements/${imageName}`);
    const response = await fetch(imageUri);
    const blob = await response.blob();
    await uploadBytes(announcementRef, blob);
    imageUrl = await getDownloadURL(announcementRef);
  }

  const docRef = await addDoc(collection(db, "Announcement"), {
    text,
    sender: senderUid,
    createdAt: serverTimestamp(),
    ...(imageUrl ? { imageUrl } : {}),
    ...(imageName ? { imageName } : {}),
  });
  return docRef.id;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await deleteDoc(doc(db, "Announcement", id));
}

export async function updateAnnouncement(id: string, text: string): Promise<void> {
  await updateDoc(doc(db, "Announcement", id), { text });
}
