import {
  firestore,
} from '../config/firebaseModular';
import database from '@react-native-firebase/database';
import type { FirebaseDatabaseTypes } from '@react-native-firebase/database';

// Types
export type ChatSummary = {
  id: string;
  participants: string[];
  participantsMeta?: Record<string, { displayName?: string; profileImage?: string | null; phoneNumber?: string | null }>;
  lastMessage?: string;
  lastMessageBy?: string;
  updatedAt?: number | null; // RTDB timestamp (ms)
  unreadCount?: Record<string, number>;
  // Stronger semantics: last time each participant read this chat (ms). Stored as number in UI; RTDB may hold a placeholder object briefly.
  lastReadAt?: Record<string, number>;
  // Convenience flags derived client-side (optional; not persisted)
  derivedUnread?: boolean;
};

export type MessageDoc = {
  id: string;
  senderId: string;
  text: string;
  createdAt?: number | null; // RTDB timestamp (ms)
};

export const buildChatId = (uidA: string, uidB: string) => {
  return [uidA, uidB].sort().join('_');
};

// Helper to fetch minimal public meta used in chats
const getUserPublicMeta = async (
  uid: string
): Promise<{ displayName?: string; profileImage?: string | null; phoneNumber?: string | null } | null> => {
  const p = await fetchUserProfile(uid);
  if (!p) return null;
  return { displayName: p.displayName, profileImage: p.profileImage || null, phoneNumber: p.phoneNumber || null };
};

export const ensureChatExists = async (
  chatId: string,
  participants: [string, string],
  participantsMeta?: Record<string, { displayName?: string; profileImage?: string | null; phoneNumber?: string | null }>
) => {
  const [uidA, uidB] = participants.sort() as [string, string];
  const chatRef = database().ref(`chats/${chatId}`);
  const snap = await chatRef.once('value');
  if (!snap.exists()) {
    const createdAt = database.ServerValue.TIMESTAMP as any;
    // Fetch both participants' public meta including phoneNumber
    let metaA = participantsMeta?.[uidA];
    let metaB = participantsMeta?.[uidB];
    try { if (!metaA) metaA = await getUserPublicMeta(uidA) || undefined; } catch (_) {}
    try { if (!metaB) metaB = await getUserPublicMeta(uidB) || undefined; } catch (_) {}
    const base = {
      participants: [uidA, uidB],
      participantsMeta: {
        ...(participantsMeta || {}),
        ...(metaA ? { [uidA]: metaA } : {}),
        ...(metaB ? { [uidB]: metaB } : {}),
      },
      lastMessage: '',
      lastMessageBy: '',
      updatedAt: createdAt,
      createdAt: createdAt,
      unreadCount: { [uidA]: 0, [uidB]: 0 },
      lastReadAt: { [uidA]: 0, [uidB]: 0 },
    } as any;
    await chatRef.set(base);
  } else {
    // Ensure participants array is present
    try {
      const partSnap = await chatRef.child('participants').once('value');
      const existing: string[] = Array.isArray(partSnap.val()) ? (partSnap.val() as string[]) : [];
      const merged = Array.from(new Set([...(existing || []), uidA, uidB])).sort();
      await chatRef.child('participants').set(merged);
    } catch (_) {
      await chatRef.child('participants').set([uidA, uidB]);
    }
    // Best-effort: backfill participantsMeta missing fields (displayName/profileImage/phoneNumber)
    try {
      const pmSnap = await chatRef.child('participantsMeta').once('value');
      const pm = (pmSnap.val() || {}) as Record<string, any>;
      const updates: any = {};
      for (const u of [uidA, uidB]) {
        const existing = pm[u] || {};
        const missingName = !existing.displayName;
        const missingAvatar = typeof existing.profileImage === 'undefined';
        const missingPhone = typeof existing.phoneNumber === 'undefined' || existing.phoneNumber === null || existing.phoneNumber === '';
        if (missingName || missingAvatar || missingPhone) {
          try {
            const meta = await getUserPublicMeta(u);
            if (meta) {
              updates[`participantsMeta/${u}`] = { ...existing, ...meta };
            }
          } catch (_) {}
        }
      }
      if (Object.keys(updates).length) await chatRef.update(updates);
    } catch (_) { /* ignore */ }
  }
};

export const subscribeUserChats = (
  uid: string,
  onUpdate: (chats: ChatSummary[]) => void,
  onError?: (e: any) => void
) => {
  // Keep exact Firestore-like structure: listen to /chats ordered by updatedAt and filter client-side
  const ref = database().ref('chats').orderByChild('updatedAt');
  const handler = (snap: FirebaseDatabaseTypes.DataSnapshot) => {
    const all = snap.val() || {};
    const list: ChatSummary[] = Object.keys(all)
      .map((chatId) => ({ id: chatId, ...(all[chatId] || {}) }))
      .filter((c: any) => Array.isArray(c.participants) && c.participants.includes(uid))
      .map((c: any) => {
        const updatedAt = typeof c.updatedAt === 'number' ? c.updatedAt : (typeof c.createdAt === 'number' ? c.createdAt : 0);
        // Coerce lastReadAt[uid] into a number for client use; if it's a ServerValue placeholder, approximate with updatedAt to avoid flashing unread
        const rawLr = c.lastReadAt && c.lastReadAt[uid];
        let lastReadAt = 0;
        if (typeof rawLr === 'number') lastReadAt = rawLr;
        else if (rawLr) lastReadAt = updatedAt || Date.now();
        const derivedUnread = (updatedAt || 0) > (lastReadAt || 0);
        const res: ChatSummary = {
          id: c.id,
          participants: c.participants || [],
          participantsMeta: c.participantsMeta || {},
          lastMessage: c.lastMessage || '',
          lastMessageBy: c.lastMessageBy || '',
          updatedAt,
          unreadCount: c.unreadCount || {},
          lastReadAt: typeof c.lastReadAt === 'object' ? { ...c.lastReadAt, [uid]: lastReadAt } : { [uid]: lastReadAt },
          derivedUnread,
        };
        return res;
      });
    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    onUpdate(list);
  };
  const errorHandler = (err: any) => onError?.(err);
  (ref as any).on('value', handler, errorHandler);
  return () => (ref as any).off('value', handler);
};

export const subscribeMessages = (
  chatId: string,
  onUpdate: (msgs: MessageDoc[]) => void,
  onError?: (e: any) => void
) => {
  const ref = database().ref(`chats/${chatId}/messages`).orderByChild('createdAt');
  const handler = (snap: FirebaseDatabaseTypes.DataSnapshot) => {
    const val = snap.val() || {};
    const msgs: MessageDoc[] = Object.keys(val)
      .map((id) => ({ id, senderId: val[id].senderId, text: val[id].text, createdAt: typeof val[id].createdAt === 'number' ? val[id].createdAt : null }))
      // Sort by createdAt if present; fallback to push key order (lexicographic) to keep chronological
      .sort((a, b) => {
        const ca = a.createdAt ?? Number.MAX_SAFE_INTEGER;
        const cb = b.createdAt ?? Number.MAX_SAFE_INTEGER;
        if (ca !== cb) return ca - cb;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
    onUpdate(msgs);
  };
  const errorHandler = (err: any) => onError?.(err);
  ref.on('value', handler, errorHandler);
  return () => ref.off('value', handler);
};

// Helper: derive unread count using lastReadAt timestamp on client side
export const computeUnreadCountFromMessages = (
  messages: MessageDoc[],
  lastReadAt: number | undefined | null
): number => {
  const lr = typeof lastReadAt === 'number' ? lastReadAt : 0;
  let count = 0;
  for (const m of messages) {
    const ts = typeof m.createdAt === 'number' ? m.createdAt : 0;
    if (ts > lr) count += 1;
  }
  return count;
};

export const sendMessage = async (
  chatId: string,
  fromUid: string,
  toUid: string,
  text: string
) => {
  const trimmed = text.trim();
  if (!trimmed) return;

  // Ensure chat exists in RTDB (also seeds chats entries)
  await ensureChatExists(chatId, [fromUid, toUid]);

  const now = database.ServerValue.TIMESTAMP as any;

  // Generate a new message key
  const msgRef = database().ref(`chats/${chatId}/messages`).push();
  try {
    await msgRef.set({ senderId: fromUid, text: trimmed, createdAt: now });
  } catch (e: any) {
    console.log('RTDB sendMessage: write message failed', e?.message || e);
    throw e;
  }

  // Update chat summary fields
  const chatRef = database().ref(`chats/${chatId}`);
  try {
    await chatRef.update({ lastMessage: trimmed, lastMessageBy: fromUid, updatedAt: now });
  } catch (e: any) {
    console.log('RTDB sendMessage: update chat summary failed', e?.message || e);
    // do not throw yet; try to continue
  }

  // Increment recipient unread counters using transactions
  try {
    const unreadRef = chatRef.child(`unreadCount/${toUid}`);
    await unreadRef.transaction((current) => (typeof current === 'number' ? current + 1 : 1));
  } catch (e: any) {
    console.log('RTDB sendMessage: increment unread failed', e?.message || e);
  }

  // Reset my own unread count to 0 when I send a message (I must have read the thread)
  try {
    await chatRef.child(`unreadCount/${fromUid}`).set(0);
  } catch (e: any) {
    console.log('RTDB sendMessage: reset sender unread failed', e?.message || e);
  }

  // Best-effort: upsert my public meta so the other participant can display my name/photo
  try { await upsertParticipantMeta(chatId, fromUid); } catch (_) {}

  // Best-effort: clear my typing state after sending
  try { await setTyping(chatId, fromUid, false); } catch (_) {}
};

export const markChatRead = async (chatId: string, uid: string) => {
  const chatUnreadRef = database().ref(`chats/${chatId}/unreadCount/${uid}`);
  try {
    await chatUnreadRef.transaction(() => 0);
  } catch (e) {
    await chatUnreadRef.set(0);
  }
  // Also record definitive read time to eliminate race conditions for derived unread
  try {
    await database().ref(`chats/${chatId}/lastReadAt/${uid}`).set((database.ServerValue.TIMESTAMP as any));
  } catch (_) {
    // ignore best-effort
  }
};

// Lightweight existence check to avoid sending duplicate introductory messages.
// Uses lastMessage (cheap) then falls back to one child read of messages list if needed.
export const chatHasMessages = async (chatId: string): Promise<boolean> => {
  try {
    const chatRef = database().ref(`chats/${chatId}`);
    const snap = await chatRef.child('lastMessage').once('value');
    const last = snap.val();
    if (last && typeof last === 'string' && last.trim().length > 0) return true;
    // Fallback: check if at least one message node exists
    const oneMsg = await chatRef.child('messages').limitToFirst(1).once('value');
    return oneMsg.exists();
  } catch (e) {
    return false; // treat errors as empty to be safe (caller may decide to skip intro if unsure)
  }
};

export const fetchUserProfile = async (
  uid: string
): Promise<{
  displayName: string;
  profileImage?: string | null;
  phoneNumber?: string | null;
  // Optional role fields (for call gating and UI logic)
  userRole?: string; // normalized to lowercase if present
  userType?: string;
  role?: string;
} | null> => {
  try {
    // React Native Firebase API (not Web modular)
    const RNFS: any = (await import('@react-native-firebase/firestore')).default;
    const snap = await RNFS().collection('profiles').doc(uid).get();
    if (!snap.exists) return null;
    const d = snap.data() as any;
    const displayName = d.displayName || d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'User';
    // Normalize phoneNumber to string if present
    let phoneNumber: string | null = null;
    if (typeof d.phoneNumber === 'string') phoneNumber = d.phoneNumber;
    else if (typeof d.phoneNumber === 'number') phoneNumber = String(d.phoneNumber);
    else if (typeof d.phone === 'string') phoneNumber = d.phone; // optional fallback
    // Extract and normalize role fields (support multiple schema variants)
    const normalizedRole = ((d.userRole || d.role || d.userType || '') as string).toLowerCase?.() || undefined;
    return {
      displayName,
      profileImage: d.profileImage || null,
      phoneNumber,
      userRole: normalizedRole,
      // passthrough raw fields when present (optional)
      userType: d.userType,
      role: d.role,
    };
  } catch (e) {
    return null;
  }
};

// Upsert my public meta (displayName, profileImage) into the chat doc so the other user can read without profiles read access
export const upsertParticipantMeta = async (chatId: string, uid: string) => {
  try {
    const my = await fetchUserProfile(uid);
    if (!my) return;
    const updates: any = {};
    updates[`chats/${chatId}/participantsMeta/${uid}`] = { displayName: my.displayName, profileImage: my.profileImage || null, phoneNumber: my.phoneNumber || null };
    await database().ref().update(updates);
  } catch (_) {
    // ignore
  }
};

// One-time repair: backfill missing participants on chat docs by inferring from messages
export const backfillChatParticipants = async (chatId: string) => {
  try {
    const chatRef = database().ref(`chats/${chatId}`);
    const snap = await chatRef.child('participants').once('value');
    if (snap.exists() && Array.isArray(snap.val())) return;

    // Inspect recent messages
    const msgsSnap = await database().ref(`chats/${chatId}/messages`).orderByChild('createdAt').limitToLast(20).once('value');
    const val = msgsSnap.val() || {};
    const senders = new Set<string>();
    Object.keys(val).forEach((k) => { const m = val[k]; if (m?.senderId) senders.add(m.senderId); });
    const inferred = Array.from(senders).slice(0, 2) as string[];
    if (inferred.length >= 1) {
      await chatRef.child('participants').set(inferred.sort());
    }
  } catch (_) {
    // ignore errors; this is best effort
  }
};

// Typing indicator helpers
export const setTyping = async (chatId: string, uid: string, isTyping: boolean) => {
  try {
    const ref = database().ref(`chats/${chatId}/typing/${uid}`);
    if (isTyping) {
      // store timestamp so stale entries can be treated as false
      await ref.set({ ts: database.ServerValue.TIMESTAMP });
      // Ensure cleanup when the app disconnects
      try { await ref.onDisconnect().remove(); } catch (_) {}
    } else {
      await ref.remove();
    }
  } catch (_) {
    // ignore best-effort
  }
};

export const subscribeTyping = (
  chatId: string,
  otherUid: string,
  onChange: (isTyping: boolean) => void
) => {
  const ref = database().ref(`chats/${chatId}/typing/${otherUid}`);
  let staleTimer: any = null;
  const handler = (snap: FirebaseDatabaseTypes.DataSnapshot) => {
    const val = snap.val();
    if (val === true) {
      // Backward-compat: boolean true without timestamp. Treat as typing then auto-clear after 8s.
      if (staleTimer) { try { clearTimeout(staleTimer); } catch (_) {} staleTimer = null; }
      onChange(true);
      staleTimer = setTimeout(() => onChange(false), 8000);
      return;
    }
    if (val && typeof val.ts === 'number') {
      const now = Date.now();
      // consider typing active if updated within last 8 seconds
      onChange(now - val.ts < 8000);
      return;
    }
    onChange(false);
  };
  ref.on('value', handler, () => {});
  return () => { if (staleTimer) { try { clearTimeout(staleTimer); } catch (_) {} } ref.off('value', handler); };
};
