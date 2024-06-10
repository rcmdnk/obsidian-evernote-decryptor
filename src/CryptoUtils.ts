import { App, Notice } from 'obsidian';
import { pbkdf2Sync, createHmac, timingSafeEqual, createDecipheriv } from 'crypto';
import { PasswordModal } from './PasswordModal';
import { DecryptedTextModal } from './DecryptedTextModal';

const RESERVED_LENGTH = 4;
const SALT_LENGTH = 16;
const SALT_HMAC_LENGTH = 16;
const IV_LENGTH = 16;
const BODY_HMAC_LENGTH = 32;
const PBKDF2_ITERATIONS = 50000;
const KEY_LENGTH = 128 / 8;  // AES-128

function extractDataSection(binaryData: Uint8Array, startOffset: number, length: number) {
  return {
    data: binaryData.slice(startOffset, startOffset + length),
    newOffset: startOffset + length
  };
}

function compareDigests(digest1: Buffer, digest2: Buffer): boolean {
  return digest1.length === digest2.length && timingSafeEqual(digest1, digest2);
}

export function decryptText(text: string, password: string): string {
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

  const keyHmac = pbkdf2Sync(password, saltHmac, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  const testHmac = createHmac('sha256', keyHmac).update(body).digest();

  if (!compareDigests(testHmac, Buffer.from(bodyHmac))) {
    throw new Error('HMAC verification failed');
  }

  const key = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  const decipher = createDecipheriv('aes-128-cbc', key, iv);
  let plaintext = decipher.update(ciphertext, undefined, 'utf8');
  plaintext += decipher.final('utf8');
  return plaintext.replace(/<div>/g, '').replace(/<\/div>/g, '');
}

export function decrypt(app: App, event: MouseEvent, encryptedText: string) {
  event.preventDefault();
  const passwordModal = new PasswordModal(app, password => {
    if (password.trim() === '') {
      new Notice('⚠️  Please enter a password.', 10000);
      return;
    }

    try {
      const decryptedText = decryptText(encryptedText.replace('evernote_secret ', ''), password);
      const decryptedTextModal = new DecryptedTextModal(app, decryptedText);
      decryptedTextModal.open();
    } catch (error) {
      new Notice('❌ Failed to decrypt.', 10000);
      new Notice(error.message, 10000);
    }
  });
  passwordModal.open();
}

export function makeSecretButton(app: App, encryptedText: string) {
  const button = document.createElement('button');
  button.textContent = 'Evernote Secret';
  button.classList.add('evernote-secret-button');
  button.onclick = (event: MouseEvent) => decrypt(app, event, encryptedText);
  return button;
}
