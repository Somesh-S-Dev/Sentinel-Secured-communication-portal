import crypto from 'crypto';
import { config } from '../config/config';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(config.encryption.key, 'hex');
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

if (KEY.length !== 32) {
  throw new Error(`Encryption Key Error: Expected 32 bytes, but got ${KEY.length}. Check your ENCRYPTION_KEY in .env (should be 64 hex characters).`);
}

export interface EncryptedPayload {
  encrypted: string; // hex
  iv: string;        // hex
  tag: string;       // hex
}

export function encrypt(plaintext: string): EncryptedPayload {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString('hex'),
    iv:        iv.toString('hex'),
    tag:       tag.toString('hex'),
  };
}

export function decrypt(payload: EncryptedPayload): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(payload.iv, 'hex'),
    { authTagLength: TAG_LENGTH }
  );
  decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.encrypted, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function encryptFile(buffer: Buffer): { encryptedBuffer: Buffer; iv: string; tag: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv, { authTagLength: TAG_LENGTH });
  const encryptedBuffer = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return {
    encryptedBuffer,
    iv:  iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
  };
}

export function decryptFile(encryptedBuffer: Buffer, iv: string, tag: string): Buffer {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(iv, 'hex'),
    { authTagLength: TAG_LENGTH }
  );
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
}

export function hashIp(ip: string): string {
  return crypto.createHmac('sha256', config.jwt.secret).update(ip).digest('hex');
}

export function generateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
