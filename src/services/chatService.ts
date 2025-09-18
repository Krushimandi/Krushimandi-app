import {
  firestore,
} from '../config/firebaseModular';
import database from '@react-native-firebase/database';
import type { FirebaseDatabaseTypes } from '@react-native-firebase/database';

// Types
export type ChatSummary = {
  id: string;
  participants: string[];
  participantsMeta?: Record<string, { displayName?: string; profileImage?: string | null }>;
  lastMessage?: string;
  lastMessageBy?: string;
  updatedAt?: number | null; // RTDB timestamp (ms)
  unreadCount?: Record<string, number>;
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

export const ensureChatExists = async (
  chatId: string,
  participants: [string, string],
  participantsMeta?: Record<string, { displayName?: string; profileImage?: string | null }>
) => {
  const [uidA, uidB] = participants.sort() as [string, string];
  const chatRef = database().ref(`chats/${chatId}`);
  const snap = await chatRef.once('value');
  if (!snap.exists()) {
    const createdAt = database.ServerValue.TIMESTAMP as any;
    const base = {
      participants: [uidA, uidB],
      participantsMeta: participantsMeta || {},
      lastMessage: '',
      lastMessageBy: '',
      updatedAt: createdAt,
      createdAt: createdAt,
      unreadCount: { [uidA]: 0, [uidB]: 0 },
    } as any;
    await chatRef.set(base);
  } else {
    // Ensure participants array is present
    await chatRef.child('participants').set([uidA, uidB]);
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
      .map((c: any) => ({
        id: c.id,
        participants: c.participants || [],
        participantsMeta: c.participantsMeta || {},
        lastMessage: c.lastMessage || '',
        lastMessageBy: c.lastMessageBy || '',
        updatedAt: typeof c.updatedAt === 'number' ? c.updatedAt : 0,
        unreadCount: c.unreadCount || {},
      }));
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
      .map((id) => ({ id, senderId: val[id].senderId, text: val[id].text, createdAt: val[id].createdAt || null }))
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    onUpdate(msgs);
  };
  const errorHandler = (err: any) => onError?.(err);
  ref.on('value', handler, errorHandler);
  return () => ref.off('value', handler);
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
  await chatUnreadRef.set(0);
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
): Promise<{ displayName: string; profileImage?: string | null } | null> => {
  try {
    // Firestore still used for profiles
    const { doc, getDoc } = await import('@react-native-firebase/firestore');
    const ref = doc(firestore, 'profiles', uid);
    const snap = await getDoc(ref);
    if (!snap.exists) return null;
    const d = snap.data() as any;
    const displayName = d.displayName || d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'User';
    return { displayName, profileImage: d.profileImage || null };
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
    updates[`chats/${chatId}/participantsMeta/${uid}`] = { displayName: my.displayName, profileImage: my.profileImage || null };
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
      await ref.set(true);
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
  const handler = (snap: FirebaseDatabaseTypes.DataSnapshot) => {
    onChange(!!snap.val());
  };
  ref.on('value', handler, () => {});
  return () => ref.off('value', handler);
};
