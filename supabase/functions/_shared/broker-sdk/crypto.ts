// Universal Broker SDK — credential encryption at rest (AES-256-GCM).
// Stored format: `enc:v1:<base64(iv || ciphertext)>`
// Plaintext values are returned untouched so legacy rows keep working.

const PREFIX = 'enc:v1:';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

let cachedKey: CryptoKey | null = null;

function keyMaterial(): string {
  return (
    Deno.env.get('BROKER_ENCRYPTION_KEY') ||
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
    ''
  );
}

export function encryptionAvailable(): boolean {
  return !!keyMaterial();
}

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const material = keyMaterial();
  if (!material) throw new Error('BROKER_ENCRYPTION_KEY is not configured.');
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(material));
  cachedKey = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  return cachedKey;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function isEncrypted(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const value = String(plaintext ?? '');
  if (!value) return value;
  if (isEncrypted(value)) return value;
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(value)),
  );
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv, 0);
  packed.set(cipher, iv.length);
  return PREFIX + toBase64(packed);
}

export async function decryptSecret(stored: unknown): Promise<string> {
  const value = String(stored ?? '');
  if (!value) return '';
  if (!isEncrypted(value)) return value;
  const key = await getKey();
  const packed = fromBase64(value.slice(PREFIX.length));
  const iv = packed.slice(0, 12);
  const cipher = packed.slice(12);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return decoder.decode(plain);
}

const SECRET_FIELDS = ['api_token', 'api_secret', 'encrypted_password', 'oauth_refresh_token'] as const;

/** Decrypt every secret-bearing field on a broker credential row. */
export async function decryptCredentials<T extends Record<string, unknown>>(cred: T): Promise<T> {
  const out: Record<string, unknown> = { ...cred };
  for (const field of SECRET_FIELDS) {
    const value = out[field];
    if (isEncrypted(value)) {
      try {
        out[field] = await decryptSecret(value);
      } catch {
        out[field] = null;
      }
    }
  }
  return out as T;
}
