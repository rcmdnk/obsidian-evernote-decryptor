import { App, Notice } from 'obsidian';
import { openPasswordModal } from '../modals/PasswordModal';

const RESERVED_VALUE = new TextEncoder().encode('ENC0');
const RESERVED_LENGTH = RESERVED_VALUE.length;
const SALT_LENGTH = 16;
const SALT_HMAC_LENGTH = 16;
const IV_LENGTH = 16;
const BODY_HMAC_LENGTH = 32;
const PBKDF2_ITERATIONS = 50000;
const KEY_LENGTH = 128 / 8;
const HASH = 'SHA-256';

function generateRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}

async function deriveBits(password: string, salt: ArrayBuffer, iterations: number, bitsLength: number): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: HASH,
    },
    keyMaterial,
    bitsLength
  );
}

async function pbkdf2Sync(password: string, salt: ArrayBuffer, iterations: number, keylen: number): Promise<CryptoKey> {
  const derivedBits = await deriveBits(password, salt, iterations, keylen * 8);
  return crypto.subtle.importKey(
    'raw',
    derivedBits,
    { name: 'HMAC', hash: HASH },
    true,
    ['sign']
  );
}

async function deriveKey(password: string, salt: ArrayBuffer, keyLength: number, usage: KeyUsage[]): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey', 'deriveBits']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH,
    },
    keyMaterial,
    { name: 'AES-CBC', length: keyLength * 8 },
    true,
    usage
  );
}

async function createHmac(key: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> {
  const importedKey = await crypto.subtle.importKey(
    'raw',
    await crypto.subtle.exportKey('raw', key),
    { name: 'HMAC', hash: HASH },
    true,
    ['sign']
  );

  return crypto.subtle.sign('HMAC', importedKey, data);
}

function concatenateArrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export async function encrypt(text: string, password: string): Promise<string> {
  const reserved = RESERVED_VALUE;
  const salt = generateRandomBytes(SALT_LENGTH);
  const saltHmac = generateRandomBytes(SALT_HMAC_LENGTH);
  const iv = generateRandomBytes(IV_LENGTH);

  const key = await deriveKey(password, salt, KEY_LENGTH, ['encrypt']);
  const keyHmac = await pbkdf2Sync(password, saltHmac, PBKDF2_ITERATIONS, KEY_LENGTH);

  const enc = new TextEncoder();
  const plaintext = enc.encode(text);

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: iv }, key, plaintext);

  const body = concatenateArrays(reserved, salt, saltHmac, iv, new Uint8Array(ciphertext));
  const bodyHmac = new Uint8Array(await createHmac(keyHmac, body));

  const finalData = concatenateArrays(body, bodyHmac);
  return btoa(String.fromCharCode(...finalData));
}

export async function decrypt(text: string, password: string): Promise<string> {
  const binaryText = Uint8Array.from(atob(text), c => c.charCodeAt(0));

  let offset = RESERVED_LENGTH;
  const { data: salt, newOffset: offsetAfterSalt } = extractDataSection(binaryText, offset, SALT_LENGTH);
  offset = offsetAfterSalt;
  const { data: saltHmac, newOffset: offsetAfterSaltHmac } = extractDataSection(binaryText, offset, SALT_HMAC_LENGTH);
  offset = offsetAfterSaltHmac;
  const { data: iv, newOffset: offsetAfterIv } = extractDataSection(binaryText, offset, IV_LENGTH);
  offset = offsetAfterIv;
  const ciphertext = binaryText.slice(offset, -BODY_HMAC_LENGTH);

  const body = binaryText.slice(0, -BODY_HMAC_LENGTH);
  const bodyHmac = binaryText.slice(-BODY_HMAC_LENGTH);

  const keyHmac = await pbkdf2Sync(password, saltHmac, PBKDF2_ITERATIONS, KEY_LENGTH);
  const testHmac = await createHmac(keyHmac, body);

  if (!compareDigests(new Uint8Array(testHmac), new Uint8Array(bodyHmac))) {
    throw new Error('HMAC verification failed');
  }

  const key = await deriveKey(password, salt, KEY_LENGTH, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: iv }, key, ciphertext);

  return new TextDecoder().decode(decrypted).replace(/<div>/g, '').replace(/<\/div>/g, '');
}

function extractDataSection(binaryData: Uint8Array, startOffset: number, length: number): { data: Uint8Array, newOffset: number } {
  return {
    data: binaryData.slice(startOffset, startOffset + length),
    newOffset: startOffset + length
  };
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

function compareDigests(digest1: Uint8Array, digest2: Uint8Array): boolean {
  return digest1.length === digest2.length && timingSafeEqual(digest1, digest2);
}

export async function encryptWrapper(app: App, decryptedText: string): Promise<string | null> {
  const password = await openPasswordModal(app);
  if (password.trim() === '') {
    new Notice('⚠️  Please enter a password.', 10000);
    return null;
  }

  try {
    return await encrypt(decryptedText, password);
  } catch (error) {
    new Notice('❌ Failed to encrypt.', 10000);
    new Notice(error.message, 10000);
    return null;
  }
}

export async function decryptWrapper(app: App, encryptedText: string): Promise<string | null> {
  const password = await openPasswordModal(app);
  if (password.trim() === '') {
    new Notice('⚠️  Please enter a password.', 10000);
    return null;
  }

  try {
    return await decrypt(encryptedText, password);
  } catch (error) {
    new Notice('❌ Failed to decrypt.', 10000);
    new Notice(error.message, 10000);
    return null;
  }
}
