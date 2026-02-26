import { promises as fs } from "node:fs";
import path from "node:path";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const DATA_DIR = process.env.APP_DATA_DIR
  ? path.resolve(process.env.APP_DATA_DIR)
  : path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "meta-token.enc.json");
const ALGO = "aes-256-gcm";

interface EncryptedPayload {
  iv: string;
  tag: string;
  ciphertext: string;
  updatedAt: string;
}

export interface MetaTokenStatus {
  configured: boolean;
  source: "env" | "stored" | "none";
  storageReady: boolean;
  error?: string;
}

function getEncryptionKey(): Buffer | null {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) return null;
  try {
    const key = Buffer.from(raw, "base64");
    if (key.length !== 32) return null;
    return key;
  } catch {
    return null;
  }
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function encryptToken(token: string, key: Buffer): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    updatedAt: new Date().toISOString(),
  };
}

function decryptToken(payload: EncryptedPayload, key: Buffer): string {
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

async function readStoredToken(): Promise<string | null> {
  const key = getEncryptionKey();
  if (!key) return null;
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const payload = JSON.parse(raw) as EncryptedPayload;
    return decryptToken(payload, key);
  } catch {
    return null;
  }
}

export async function getMetaToken(): Promise<string | null> {
  const envToken = process.env.META_AD_LIBRARY_TOKEN?.trim();
  if (envToken) return envToken;
  return readStoredToken();
}

export async function getMetaTokenStatus(): Promise<MetaTokenStatus> {
  const envToken = process.env.META_AD_LIBRARY_TOKEN?.trim();
  if (envToken) {
    return { configured: true, source: "env", storageReady: Boolean(getEncryptionKey()) };
  }
  const key = getEncryptionKey();
  if (!key) {
    return {
      configured: false,
      source: "none",
      storageReady: false,
      error: "APP_ENCRYPTION_KEY is missing or invalid (needs base64 32-byte key).",
    };
  }
  const stored = await readStoredToken();
  return {
    configured: Boolean(stored),
    source: stored ? "stored" : "none",
    storageReady: true,
  };
}

export async function setStoredMetaToken(token: string): Promise<void> {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error("APP_ENCRYPTION_KEY is missing or invalid.");
  }
  await ensureDir();
  const payload = encryptToken(token.trim(), key);
  await fs.writeFile(FILE, JSON.stringify(payload, null, 2), "utf8");
}

export async function clearStoredMetaToken(): Promise<void> {
  try {
    await fs.rm(FILE, { force: true });
  } catch {
    // ignore cleanup errors
  }
}

