import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes, deleteObject } from "firebase/storage";

import { db, storage } from "@/services/firebase";

export interface Bulletin {
  id: string;
  url: string;
  shortUrl?: string;
  date: Date;
  storagePath?: string;
}

export async function getBulletins(): Promise<Bulletin[]> {
  const q = query(collection(db, "Bulletin"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      url: data.url ?? data.shortUrl ?? "",
      shortUrl: data.shortUrl,
      date: (data.date as Timestamp)?.toDate() ?? new Date(),
      storagePath: data.storagePath,
    } as Bulletin;
  });
}

function toStorageDateStr(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

export async function uploadBulletin(date: Date, pdfUri: string): Promise<string> {
  const dateStr = toStorageDateStr(date);
  const storagePath = `bulletins/${dateStr}.pdf`;
  const storageRef = ref(storage, storagePath);

  const response = await fetch(pdfUri);
  const blob = await response.blob();
  await uploadBytes(storageRef, blob, { contentType: "application/pdf" });
  const url = await getDownloadURL(storageRef);

  const docRef = await addDoc(collection(db, "Bulletin"), {
    date: Timestamp.fromDate(date),
    url,
  });
  return docRef.id;
}

export async function deleteBulletin(id: string, storagePath?: string): Promise<void> {
  await deleteDoc(doc(db, "Bulletin", id));
  if (storagePath) {
    try {
      await deleteObject(ref(storage, storagePath));
    } catch {}
  }
}
