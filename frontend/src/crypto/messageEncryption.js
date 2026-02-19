/**
 * Message Encryption — AES-256-GCM via SubtleCrypto using a shared channel key.
 * The channel key is an AES-256 key. Each message gets a random 12-byte IV.
 * Ciphertext format: base64(iv[12] + ciphertext)
 */

export async function importChannelKey(keyBytes) {
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptMessage(channelKeyBytes, plaintext) {
  const key = await importChannelKey(channelKeyBytes);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const result = new Uint8Array(12 + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), 12);
  return { encrypted_payload: btoa(String.fromCharCode(...result)), iv: btoa(String.fromCharCode(...iv)) };
}

export async function decryptMessage(channelKeyBytes, encryptedPayload) {
  try {
    const key = await importChannelKey(channelKeyBytes);
    const data = Uint8Array.from(atob(encryptedPayload), c => c.charCodeAt(0));
    const iv = data.slice(0, 12);
    const ciphertext = data.slice(12);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(plaintext);
  } catch {
    return null; // decryption failed (wrong key, corrupted)
  }
}

export async function generateChannelKey() {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const raw = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(raw);
}
