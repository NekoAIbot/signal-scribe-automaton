// Universal Broker SDK — credential normalization + HTTP helpers.

export function cleanCredentialValue(value: unknown): string {
  let cleaned = String(value ?? '').trim();
  if (!cleaned) return '';
  cleaned = cleaned.replace(/^['"`]+|['"`]+$/g, '').trim();
  cleaned = cleaned.replace(/^Bearer\s+/i, '').trim();
  cleaned = cleaned.replace(/^(token|api[_ -]?token|api[_ -]?key|secret|password)\s*[:=]\s*/i, '').trim();
  cleaned = cleaned.replace(/^['"`]+|['"`]+$/g, '').trim();
  return cleaned;
}

const NESTED_KEYS = ['token', 'api_token', 'apiToken', 'api_key', 'apiKey', 'secret', 'password', 'value'];

/**
 * Users paste credentials in many shapes (raw, quoted, JSON blob, base64).
 * Return every plausible candidate so adapters can retry on auth errors.
 */
export function credentialCandidates(stored: unknown): string[] {
  const raw = String(stored ?? '').trim();
  if (!raw) return [];
  const out: string[] = [];
  const push = (value: unknown) => {
    const cleaned = cleanCredentialValue(value);
    if (cleaned && !out.includes(cleaned)) out.push(cleaned);
  };

  push(raw);

  const harvest = (input: string) => {
    try {
      const parsed = JSON.parse(input);
      if (typeof parsed === 'string') push(parsed);
      else if (parsed && typeof parsed === 'object') {
        for (const key of NESTED_KEYS) {
          if (typeof (parsed as Record<string, unknown>)[key] === 'string') {
            push((parsed as Record<string, unknown>)[key]);
          }
        }
      }
    } catch { /* not JSON */ }
  };

  harvest(raw);

  try {
    const decoded = atob(raw);
    if (decoded && /^[\x09\x0A\x0D\x20-\x7E]+$/.test(decoded)) {
      push(decoded);
      harvest(decoded);
    }
  } catch { /* not base64 */ }

  return out;
}

export function firstCredential(stored: unknown): string {
  return credentialCandidates(stored)[0] || '';
}

export function parseJson(raw: string): any {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface HttpResult {
  ok: boolean;
  status: number;
  text: string;
  json: any;
  headers: Headers;
  latencyMs: number;
}

/** fetch with timeout + retry/backoff on 429 and 5xx. */
export async function httpRequest(
  url: string,
  init: RequestInit & { timeoutMs?: number; retries?: number } = {},
): Promise<HttpResult> {
  const { timeoutMs = 15000, retries = 2, ...rest } = init;
  let attempt = 0;
  let last: HttpResult | null = null;

  while (attempt <= retries) {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...rest, signal: controller.signal });
      const text = await res.text();
      last = {
        ok: res.ok,
        status: res.status,
        text,
        json: parseJson(text),
        headers: res.headers,
        latencyMs: Date.now() - started,
      };
      if (res.ok || (res.status !== 429 && res.status < 500)) return last;
    } catch (error) {
      last = {
        ok: false,
        status: 0,
        text: error instanceof Error ? error.message : String(error),
        json: {},
        headers: new Headers(),
        latencyMs: Date.now() - started,
      };
    } finally {
      clearTimeout(timer);
    }
    attempt += 1;
    if (attempt <= retries) await new Promise(r => setTimeout(r, 300 * attempt * attempt));
  }

  return last!;
}
