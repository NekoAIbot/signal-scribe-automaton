import { supabase } from '@/integrations/supabase/client';

export type OAuthLogStep =
  | 'connect_clicked' | 'authorize_url_generated' | 'redirect_started' | 'callback_received'
  | 'state_validated' | 'pkce_verified' | 'code_exchanged' | 'credentials_encrypted'
  | 'session_restored' | 'broker_verified' | 'accounts_synced' | 'success' | 'failure';

const STORAGE_KEY = 'axion.broker_oauth.pending';

export interface PendingOAuth {
  broker: string;
  state: string;
  codeVerifier: string;
  returnTo: string;
  startedAt: number;
}

export function oauthLog(step: OAuthLogStep | string, details: Record<string, unknown> = {}) {
  // Structured client-side lifecycle log — mirrors the server-side event trail.
  console.info('[broker-oauth]', JSON.stringify({ step, at: new Date().toISOString(), ...details }));
}

function b64url(bytes: Uint8Array) {
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function createCodeVerifier(): string {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}

export async function createCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(digest));
}

export function callbackUrl(): string {
  return `${window.location.origin}/brokers/callback`;
}

/**
 * Deriv (and most OAuth providers) send `X-Frame-Options: DENY`, so the broker
 * page can never render inside the Lovable preview iframe. Always hand the URL
 * to a real top-level tab; only navigate in place when we already own the tab.
 */
export function navigateToAuthorizeUrl(url: string): 'tab' | 'top' | 'self' {
  const inIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();

  if (!inIframe) {
    window.location.assign(url);
    return 'self';
  }

  // A brand new tab is its own top-level browsing context, so the broker's
  // frame-blocking headers do not apply.
  const tab = window.open(url, '_blank', 'noopener,noreferrer');
  if (tab) { try { tab.focus(); } catch { /* ignore */ } return 'tab'; }

  // Popup blocked: move the whole outer window instead of the framed preview.
  try {
    if (window.top) {
      window.top.location.href = url;
      return 'top';
    }
  } catch { /* cross-origin parent */ }

  throw new Error('Your browser blocked the broker sign-in window. Allow pop-ups for this site and try again.');
}



export function readPending(): PendingOAuth | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingOAuth) : null;
  } catch { return null; }
}

export function clearPending() {
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
}

function savePending(pending: PendingOAuth) {
  const raw = JSON.stringify(pending);
  sessionStorage.setItem(STORAGE_KEY, raw);
  // localStorage mirror survives providers that reopen the app in a new tab.
  localStorage.setItem(STORAGE_KEY, raw);
}

/** Kick off the OAuth flow: mint state + PKCE, then redirect to the broker. */
export async function startBrokerOAuth(options: {
  broker: string;
  environment?: string | null;
  returnTo?: string;
}): Promise<void> {
  const { broker } = options;
  oauthLog('connect_clicked', { broker });

  const codeVerifier = createCodeVerifier();
  const codeChallenge = await createCodeChallenge(codeVerifier);
  const redirectUri = callbackUrl();

  const { data, error } = await supabase.functions.invoke('broker-oauth-start', {
    body: {
      broker,
      redirectUri,
      environment: options.environment ?? null,
      returnTo: options.returnTo ?? '/settings',
      codeChallenge,
      codeVerifier,
      codeChallengeMethod: 'S256',
    },
  });

  if (error) throw new Error(error.message || 'Could not start the broker connection.');
  if (!data?.ok) {
    const message = data?.hint ? `${data.message} ${data.hint}` : data?.message;
    throw new Error(message || 'Could not start the broker connection.');
  }

  savePending({
    broker,
    state: data.state,
    codeVerifier,
    returnTo: options.returnTo ?? '/settings',
    startedAt: Date.now(),
  });

  oauthLog('authorize_url_generated', { broker, redirectUri });
  const mode = navigateToAuthorizeUrl(data.authorize_url);
  oauthLog('redirect_started', { broker, mode, url: String(data.authorize_url).split('?')[0] });

}

export interface CompleteResult {
  ok: boolean;
  message: string;
  hint?: string | null;
  linked?: Array<Record<string, unknown>>;
  returnTo?: string | null;
}

/** Finish the flow from the callback route. */
export async function completeBrokerOAuth(search: string): Promise<CompleteResult> {
  const params: Record<string, string> = {};
  new URLSearchParams(search).forEach((value, key) => { params[key] = value; });
  oauthLog('callback_received', { keys: Object.keys(params) });

  const pending = readPending();
  const state = params.state || pending?.state || '';

  if (params.error || params.error_description) {
    clearPending();
    return {
      ok: false,
      message: /denied|cancel/i.test(String(params.error || params.error_description))
        ? 'You cancelled the broker authorization.'
        : `The broker rejected the authorization: ${params.error_description || params.error}`,
      returnTo: pending?.returnTo ?? '/settings',
    };
  }

  if (!state) {
    clearPending();
    return { ok: false, message: 'This callback is missing its security state. Start the connection again.', returnTo: '/settings' };
  }
  if (pending?.state && params.state && pending.state !== params.state) {
    clearPending();
    return { ok: false, message: 'The authorization state did not match this browser session.', returnTo: pending.returnTo };
  }

  const { data, error } = await supabase.functions.invoke('broker-oauth-complete', {
    body: { state, codeVerifier: pending?.codeVerifier || '', params },
  });

  clearPending();

  if (error) {
    oauthLog('failure', { message: error.message });
    return { ok: false, message: error.message || 'The connection could not be completed.', returnTo: pending?.returnTo ?? '/settings' };
  }
  if (!data?.ok) {
    oauthLog('failure', { message: data?.message, code: data?.error_code });
    return { ok: false, message: data?.message || 'The connection could not be completed.', hint: data?.hint, returnTo: pending?.returnTo ?? '/settings' };
  }

  oauthLog('accounts_synced', { linked: data.linked?.length });
  oauthLog('success', { broker: data.broker });
  return {
    ok: true,
    message: data.message,
    linked: data.linked,
    returnTo: data.return_to || pending?.returnTo || '/settings',
  };
}

export async function disconnectBroker(input: { credentialId?: string; broker?: string; mode?: 'delete' | 'deactivate' }) {
  const { data, error } = await supabase.functions.invoke('broker-oauth-disconnect', { body: input });
  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data?.message || 'Disconnect failed');
  return data;
}

export async function syncBrokerAccounts(input: { credentialId?: string; broker?: string } = {}) {
  const { data, error } = await supabase.functions.invoke('broker-accounts-sync', { body: input });
  if (error) throw new Error(error.message);
  return data;
}
