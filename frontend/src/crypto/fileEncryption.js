/**
 * File Encryption — encrypts files client-side with AES-256-GCM before upload.
 * Chunks up to 64MB encrypted individually.
 */

const CHUNK_SIZE = 64 * 1024 * 1024; // 64 MB

export async function generateFileKey() {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const raw = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(raw);
}

export async function encryptFile(fileKeyBytes, file, onProgress) {
  const subtleKey = await crypto.subtle.importKey('raw', fileKeyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const chunks = [];
  const chunkCount = Math.ceil(bytes.length / CHUNK_SIZE);

  for (let i = 0; i < chunkCount; i++) {
    const chunk = bytes.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, subtleKey, chunk);
    // Prefix each chunk with 4-byte length + 12-byte IV
    const ivAndCipher = new Uint8Array(12 + encrypted.byteLength);
    ivAndCipher.set(iv, 0);
    ivAndCipher.set(new Uint8Array(encrypted), 12);
    chunks.push(ivAndCipher);
    onProgress?.((i + 1) / chunkCount);
  }

  const totalLength = chunks.reduce((a, c) => a + c.byteLength + 4, 0);
  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    const view = new DataView(out.buffer, offset, 4);
    view.setUint32(0, chunk.byteLength, false);
    offset += 4;
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new Blob([out], { type: 'application/octet-stream' });
}

export async function decryptFile(fileKeyBytes, encryptedBlob, mimeType, onProgress) {
  const subtleKey = await crypto.subtle.importKey('raw', fileKeyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
  const buffer = await encryptedBlob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const chunks = [];
  let offset = 0;
  let chunkIndex = 0;

  while (offset < bytes.length) {
    const len = new DataView(bytes.buffer, offset, 4).getUint32(0, false);
    offset += 4;
    const chunk = bytes.slice(offset, offset + len);
    offset += len;
    const iv = chunk.slice(0, 12);
    const cipher = chunk.slice(12);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, subtleKey, cipher);
    chunks.push(new Uint8Array(plain));
    chunkIndex++;
    onProgress?.(offset / bytes.length);
  }

  const totalLength = chunks.reduce((a, c) => a + c.byteLength, 0);
  const out = new Uint8Array(totalLength);
  let pos = 0;
  for (const c of chunks) { out.set(c, pos); pos += c.byteLength; }

  return new Blob([out], { type: mimeType || 'application/octet-stream' });
}
