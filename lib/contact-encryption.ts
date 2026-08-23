import "server-only";

const minimumContactEncryptionKeyLength = 20;

export class ContactEncryptionConfigurationError extends Error {
  constructor() {
    super("Contact encryption is not configured.");
    this.name = "ContactEncryptionConfigurationError";
  }
}

export function requireContactEncryptionKey(environment: NodeJS.ProcessEnv = process.env) {
  const secret = environment.CONTACT_ENCRYPTION_KEY;
  if (!secret || secret.length < minimumContactEncryptionKeyLength) {
    throw new ContactEncryptionConfigurationError();
  }
  return secret;
}

async function importContactKey(secret: string, usage: KeyUsage[]) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, usage);
}

export async function encryptContact(value: string, secret: string) {
  if (secret.length < minimumContactEncryptionKeyLength) throw new ContactEncryptionConfigurationError();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await importContactKey(secret, ["encrypt"]),
    new TextEncoder().encode(value),
  ));
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv);
  packed.set(cipher, iv.length);
  return Buffer.from(packed).toString("base64");
}

export async function decryptContact(ciphertext: string, secret: string) {
  if (secret.length < minimumContactEncryptionKeyLength) throw new ContactEncryptionConfigurationError();
  try {
    const packed = Buffer.from(ciphertext, "base64");
    if (packed.byteLength <= 12 + 16) return null;
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: packed.subarray(0, 12) },
      await importContactKey(secret, ["decrypt"]),
      packed.subarray(12),
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
