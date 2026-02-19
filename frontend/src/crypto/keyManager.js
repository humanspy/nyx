/**
 * Key Manager — stores E2E keys in IndexedDB encrypted with PBKDF2-derived AES-GCM key.
 * Identity keypairs: X25519 (encryption) + Ed25519 (signing)
 */
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

const DB_NAME = 'nexus-keys';
const STORE = 'keys';
const PBKDF2_ITERATIONS = 250000;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deriveLockKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptData(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  const result = new Uint8Array(12 + enc.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(enc), 12);
  return result;
}

async function decryptData(key, data) {
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
}

export async function generateKeyPair() {
  const encKeypair = nacl.box.keyPair();
  const signKeypair = nacl.sign.keyPair();
  return {
    encPublicKey: encodeBase64(encKeypair.publicKey),
    encSecretKey: encodeBase64(encKeypair.secretKey),
    signPublicKey: encodeBase64(signKeypair.publicKey),
    signSecretKey: encodeBase64(signKeypair.secretKey),
  };
}

export async function saveKeys(userId, keys, password) {
  const db = await openDB();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const lockKey = await deriveLockKey(password, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(keys));
  const encrypted = await encryptData(lockKey, plaintext);
  const stored = { salt: encodeBase64(salt), data: encodeBase64(encrypted) };
  await dbPut(db, `keys:${userId}`, JSON.stringify(stored));
}

export async function loadKeys(userId, password) {
  const db = await openDB();
  const raw = await dbGet(db, `keys:${userId}`);
  if (!raw) return null;
  const { salt, data } = JSON.parse(raw);
  const lockKey = await deriveLockKey(password, decodeBase64(salt));
  const decrypted = await decryptData(lockKey, decodeBase64(data));
  return JSON.parse(new TextDecoder().decode(decrypted));
}

export async function hasKeys(userId) {
  const db = await openDB();
  const raw = await dbGet(db, `keys:${userId}`);
  return !!raw;
}

// In-memory key cache (cleared on logout)
let _keys = null;
export function cacheKeys(keys) { _keys = keys; }
export function getCachedKeys() { return _keys; }
export function clearKeyCache() { _keys = null; }

// Save a group channel key (AES-256) in IndexedDB
export async function saveChannelKey(channelId, keyBytes) {
  const db = await openDB();
  await dbPut(db, `chkey:${channelId}`, encodeBase64(keyBytes));
}

export async function getChannelKey(channelId) {
  const db = await openDB();
  const raw = await dbGet(db, `chkey:${channelId}`);
  return raw ? decodeBase64(raw) : null;
}

export async function clearChannelKey(channelId) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(`chkey:${channelId}`);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
}
