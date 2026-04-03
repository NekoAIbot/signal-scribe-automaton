import { supabase } from '@/integrations/supabase/client';

interface EdgeInvokeResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

/**
 * Invokes a Supabase edge function via direct fetch to preserve response details
 * even when function returns non-2xx status codes.
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  payload: Record<string, unknown>
): Promise<EdgeInvokeResult<T>> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: { session } } = await supabase.auth.getSession();

  if (!supabaseUrl || !supabasePublishableKey) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'Supabase environment variables are missing in frontend runtime.',
    };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    let data: any = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = { raw };
      }
    }

    const derivedError =
      data?.error ||
      (!response.ok ? data?.raw || `Edge function failed with status ${response.status}` : null);

    return {
      ok: response.ok && !!data?.success,
      status: response.status,
      data,
      error: derivedError,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown network error',
    };
  }
}

