// Client-side E2E encryption utilities using Web Crypto API

const SALT = 'chatconnect-lovevault-2024'; // Public salt for key derivation
const ITERATIONS = 100000;

/**
 * Derives an encryption key from a PIN using PBKDF2
 */
async function deriveKey(pin: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts text content using AES-GCM
 */
export async function encryptText(text: string, pin: string): Promise<string> {
  try {
    const key = await deriveKey(pin);
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // Generate a random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const encryptedData = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt content');
  }
}

/**
 * Decrypts text content using AES-GCM
 */
export async function decryptText(encryptedText: string, pin: string): Promise<string> {
  try {
    const key = await deriveKey(pin);
    
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // Decrypt the data
    const decryptedData = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt content - wrong PIN?');
  }
}

/**
 * Encrypts a file (returns encrypted blob)
 */
export async function encryptFile(file: File, pin: string): Promise<Blob> {
  try {
    const key = await deriveKey(pin);
    const arrayBuffer = await file.arrayBuffer();
    
    // Generate a random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the file data
    const encryptedData = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      arrayBuffer
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return new Blob([combined], { type: 'application/octet-stream' });
  } catch (error) {
    console.error('File encryption error:', error);
    throw new Error('Failed to encrypt file');
  }
}

/**
 * Decrypts a file (returns decrypted blob with original mime type)
 */
export async function decryptFile(encryptedBlob: Blob, pin: string, originalMimeType: string): Promise<Blob> {
  try {
    const key = await deriveKey(pin);
    const arrayBuffer = await encryptedBlob.arrayBuffer();
    const combined = new Uint8Array(arrayBuffer);
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // Decrypt the data
    const decryptedData = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    return new Blob([decryptedData], { type: originalMimeType });
  } catch (error) {
    console.error('File decryption error:', error);
    throw new Error('Failed to decrypt file - wrong PIN?');
  }
}
