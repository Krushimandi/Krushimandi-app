// Consolidated Firebase export now handled in firebaseModular.ts.
// This legacy file is retained to avoid wide import churn; it proxies modular exports.
// Remove usages of this file gradually and import from './firebaseModular' directly.

import { auth, firestore, functions, messaging, appCheck, storage } from './firebaseModular';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import BlobUtil from 'react-native-blob-util';
import { AppState } from 'react-native';

console.log('[firebase] Legacy firebase.js loaded. Prefer importing from firebaseModular.ts');

// ----------------------------------------------------
// Firestore Offline Persistence & Cache Configuration
// ----------------------------------------------------
let firestoreReadyPromise;
try {
	// Enable multi-tab for RN Web fallback (ignored native) + persistent cache.
	// In react-native-firebase v22, persistence is enabled by default; we still set cache size & network toggle helpers.
	firestore().settings({ cacheSizeBytes: 50 * 1024 * 1024 }); // 50MB cache cap
	console.log('[firebase] Firestore cache size set to 50MB');
	firestoreReadyPromise = Promise.resolve();
} catch (e) {
	console.warn('[firebase] Firestore settings error (safe to ignore if already initialized):', e?.message);
	firestoreReadyPromise = Promise.resolve();
}

// ------------------------------
// Auth Offline Session Handling
// ------------------------------
// react-native-firebase Auth persists user credentials securely by default (Keychain / Keystore).
// Provide a ready promise to gate app screens if desired.
const authReady = new Promise(resolve => {
	const unsub = auth().onAuthStateChanged(user => {
		console.log('[firebase] Auth state ready. User:', user?.uid || 'none');
		unsub();
		resolve(user);
	});
});

// -----------------------------------
// Network Awareness (Optional Helper)
// -----------------------------------
let isOnline = true;
NetInfo.addEventListener(state => {
	const next = !!state.isConnected;
	if (next !== isOnline) {
		isOnline = next;
		console.log('[firebase] Connectivity changed ->', isOnline ? 'ONLINE' : 'OFFLINE');
		try {
			if (isOnline) firestore().enableNetwork(); else firestore().disableNetwork();
		} catch (err) {
			console.warn('[firebase] Network toggle failed:', err?.message);
		}
	}
});

export const getOnlineStatus = () => isOnline;

// --------------------------------------------------
// Image (Storage) Caching Helper (basic, on-demand)
// --------------------------------------------------
// Pattern: call cacheStorageImage(storagePath) -> returns local file path (cached) or remote download URL fallback.
// NOTE: For production, consider a lib like react-native-fast-image; this is a lightweight fallback.
const IMAGE_CACHE_PREFIX = 'imgcache:';

export async function cacheStorageImage(storagePath, maxAgeMs = 7 * 24 * 60 * 60 * 1000) { // default 7 days
	try {
		if (!storagePath) return null;
		const metaKey = IMAGE_CACHE_PREFIX + storagePath;
		const cacheMetaJson = await AsyncStorage.getItem(metaKey);
		const now = Date.now();
		if (cacheMetaJson) {
			const meta = JSON.parse(cacheMetaJson);
			if (meta?.localPath && (now - meta.savedAt) < maxAgeMs) {
				// Verify file exists
				const exists = await BlobUtil.fs.exists(meta.localPath);
				if (exists) return 'file://' + meta.localPath;
			}
		}
		// Download fresh
		const ref = storage().ref(storagePath);
		const url = await ref.getDownloadURL();
		const tmpPath = BlobUtil.fs.dirs.CacheDir + '/fbimg_' + encodeURIComponent(storagePath).replace(/%/g, '') + '_' + now + '.img';
		const res = await BlobUtil.config({ path: tmpPath, fileCache: true }).fetch('GET', url);
		if (res.info().status === 200) {
			await AsyncStorage.setItem(metaKey, JSON.stringify({ localPath: tmpPath, savedAt: now }));
			return 'file://' + tmpPath;
		}
		return url; // fallback to remote
	} catch (e) {
		console.warn('[firebase] cacheStorageImage failed -> using remote URL:', e?.message);
		try {
			return await storage().ref(storagePath).getDownloadURL();
		} catch {
			return null;
		}
	}
}

export async function purgeStaleImageCache(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
	try {
		const keys = await AsyncStorage.getAllKeys();
		const now = Date.now();
		const cacheKeys = keys.filter(k => k.startsWith(IMAGE_CACHE_PREFIX));
		for (const k of cacheKeys) {
			try {
				const meta = JSON.parse(await AsyncStorage.getItem(k));
				if (!meta?.localPath || (now - meta.savedAt) > maxAgeMs) {
					if (meta?.localPath) {
						const exists = await BlobUtil.fs.exists(meta.localPath);
						if (exists) await BlobUtil.fs.unlink(meta.localPath);
					}
					await AsyncStorage.removeItem(k);
				}
			} catch { /* ignore */ }
		}
	} catch (e) {
		console.warn('[firebase] purgeStaleImageCache error:', e?.message);
	}
}

// Periodic cache clean when app returns to foreground
AppState.addEventListener('change', state => {
	if (state === 'active') {
		purgeStaleImageCache().catch(() => {});
	}
});

// Exports
export { auth, firestore, functions, messaging, appCheck, storage, authReady, firestoreReadyPromise };
export default { auth, firestore, functions, messaging, appCheck, storage, authReady, firestoreReadyPromise, cacheStorageImage };