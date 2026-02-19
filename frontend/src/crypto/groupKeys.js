/**
 * Group Key Distribution — encrypts a channel AES key for each recipient
 * using NaCl box (X25519 ECDH + XSalsa20-Poly1305).
 */
import nacl from 'tweetnacl';
import { decodeBase64, encodeBase64 } from 'tweetnacl-util';
import { generateChannelKey } from './messageEncryption.js';
import { getCachedKeys, saveChannelKey } from './keyManager.js';
import { usersApi } from '../utils/api.js';

export async function generateAndDistributeChannelKey(channelId, memberUserIds) {
  const myKeys = getCachedKeys();
  if (!myKeys) throw new Error('Keys not loaded');

  const channelKey = await generateChannelKey();
  const mySecretKey = decodeBase64(myKeys.encSecretKey);

  const distributions = [];
  for (const userId of memberUserIds) {
    const { enc_public_key } = await usersApi.getUserKeys(userId);
    if (!enc_public_key) continue;
    const theirPublicKey = decodeBase64(enc_public_key);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const encrypted = nacl.box(channelKey, nonce, theirPublicKey, mySecretKey);
    distributions.push({
      userId,
      encryptedKey: encodeBase64(encrypted),
      nonce: encodeBase64(nonce),
    });
  }

  // Save for self
  await saveChannelKey(channelId, channelKey);

  return { distributions };
}

export async function receiveChannelKey(channelId, encryptedKeyB64, nonceB64, senderPublicKeyB64) {
  const myKeys = getCachedKeys();
  if (!myKeys) throw new Error('Keys not loaded');

  const mySecretKey = decodeBase64(myKeys.encSecretKey);
  const senderPublicKey = decodeBase64(senderPublicKeyB64);
  const encryptedKey = decodeBase64(encryptedKeyB64);
  const nonce = decodeBase64(nonceB64);

  const channelKey = nacl.box.open(encryptedKey, nonce, senderPublicKey, mySecretKey);
  if (!channelKey) throw new Error('Failed to decrypt channel key');

  await saveChannelKey(channelId, channelKey);
  return channelKey;
}

export async function createDeletionProof(messageId, channelId) {
  const myKeys = getCachedKeys();
  if (!myKeys) throw new Error('Keys not loaded');

  const signSecretKey = decodeBase64(myKeys.signSecretKey);
  const timestamp = Date.now().toString();
  const message = new TextEncoder().encode(`${messageId}:${channelId}:${timestamp}`);
  const signature = nacl.sign.detached(message, signSecretKey);

  return encodeBase64(new Uint8Array([
    ...new TextEncoder().encode(timestamp + ':'),
    ...signature,
  ]));
}
