import { App, Notice, Editor } from 'obsidian';
import { openPasswordModal } from './PasswordModal';
import { DecryptedTextModal } from './DecryptedTextModal';

const RESERVED_LENGTH = 4;
const SALT_LENGTH = 16;
const SALT_HMAC_LENGTH = 16;
const IV_LENGTH = 16;
const BODY_HMAC_LENGTH = 32;
const PBKDF2_ITERATIONS = 50000;
const KEY_LENGTH = 128 / 8;
const HASH = 'SHA-256';

function extractDataSection(binaryData: Uint8Array, startOffset: number, length: number): { data: Uint8Array, newOffset: number } {
  return {
    data: binaryData.slice(startOffset, startOffset + length),
    newOffset: startOffset + length
  };
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

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: HASH,
    },
    keyMaterial,
    bitsLength
  );

  return derivedBits;
}

async function pbkdf2Sync(password: string, salt: ArrayBuffer, iterations: number, keylen: number): Promise<CryptoKey> {
  const derivedBits = await deriveBits(password, salt, iterations, keylen * 8);

  const keyHmac = await crypto.subtle.importKey(
    'raw',
    derivedBits,
    { name: 'HMAC', hash: HASH },
    true,
    ['sign']
  );
  return keyHmac;
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

  const derivedKey = await crypto.subtle.deriveKey(
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

  return derivedKey;
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


async function decrypt(text: string, password: string): Promise<string> {
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

async function decryptWrapper(app: App, encryptedText: string): Promise<string | null> {
  const password = await openPasswordModal(app);
  if (password.trim() === '') {
    new Notice('⚠️  Please enter a password.', 10000);
    return null;
  }

  try {
    const decryptedText = await decrypt(encryptedText, password);
    return decryptedText;
  } catch (error) {
    new Notice('❌ Failed to decrypt.', 10000);
    new Notice(error.message, 10000);
    return null;
  }
}

async function showDecryptedText(app: App, encryptedText: string): Promise<void> {
  const decryptedText = await decryptWrapper(app, encryptedText);
  if (decryptedText === null) {
    return;
  }
  const decryptedTextModal = new DecryptedTextModal(app, decryptedText);
  decryptedTextModal.open();
}

function onclickDecrypt(app: App, encryptedText: string, event: MouseEvent) {
  event.preventDefault();
  showDecryptedText(app, encryptedText);
}

export function makeSecretButton(app: App, encryptedText: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = 'Evernote Secret';
  button.classList.add('evernote-secret-button');
  button.onclick = (event: MouseEvent) => onclickDecrypt(app, encryptedText, event);
  return button;
}

export function editorDecrypt(app: App, editor: Editor): void {
  const selectedText = editor.getSelection();
  showDecryptedText(app, selectedText);
}
