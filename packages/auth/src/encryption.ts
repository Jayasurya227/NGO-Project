import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const ALG = "aes-256-gcm";
let _cachedKey: Buffer | null = null;

export function resetCachedKey() { _cachedKey = null; }

async function getEncryptionKey(): Promise<Buffer> {
  if (_cachedKey) return _cachedKey;

  if (process.env.NODE_ENV === "development" && process.env.ENCRYPTION_KEY_HEX) {
    _cachedKey = Buffer.from(process.env.ENCRYPTION_KEY_HEX, "hex");
    if (_cachedKey.length !== 32) {
      throw new Error("ENCRYPTION_KEY_HEX must be exactly 64 hex characters (32 bytes)");
    }
    return _cachedKey;
  }

  const client = new SecretsManagerClient({ region: "ap-south-1" });
  const command = new GetSecretValueCommand({ SecretId: process.env.ENCRYPTION_KEY_SECRET_ID! });
  const result = await client.send(command);
  _cachedKey = Buffer.from(result.SecretString!, "hex");
  return _cachedKey;
}

export async function encrypt(plaintext: string): Promise<Buffer> {
  const key = await getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

export async function decrypt(buf: Buffer): Promise<string> {
  const key = await getEncryptionKey();
  const iv  = buf.slice(0, 12);
  const tag = buf.slice(12, 28);
  const ct  = buf.slice(28);
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ct).toString("utf8") + decipher.final("utf8");
}

export function hashForLookup(value: string): string {
  const salt = process.env.HASH_SALT ?? "ngo-platform-lookup-salt";
  return createHash("sha256").update(salt + value.toLowerCase()).digest("hex");
}