/**
 * Cloudflare Pages Function: POST /api/license
 * Validates or activates a Lemon Squeezy license key and reports the plan.
 * No secrets are needed for Lemon Squeezy's license endpoints; env only pins
 * which store/product a key must belong to, so keys from other products are rejected.
 */
export interface Env {
  LS_STORE_ID?: string;
  LS_PRODUCT_ID?: string;
}

type Body = { licenseKey?: string; instanceId?: string; action?: 'activate' | 'validate' };

const LS = 'https://api.lemonsqueezy.com/v1/licenses';
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function handleLicense(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  let body: Body;
  try { body = (await request.json()) as Body; } catch { return json({ error: 'Invalid request body.' }, 400); }
  const key = body.licenseKey?.trim();
  if (!key || key.length > 200) return json({ error: 'Enter a license key.' }, 400);
  if (!env.LS_STORE_ID || !env.LS_PRODUCT_ID) return json({ error: 'Licensing is not configured on this deployment.' }, 503);

  const activate = body.action !== 'validate';
  const form = new URLSearchParams({ license_key: key });
  if (activate) form.set('instance_name', 'browser');
  else if (body.instanceId) form.set('instance_id', body.instanceId);

  let res: Response;
  try {
    res = await fetchFn(`${LS}/${activate ? 'activate' : 'validate'}`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
      body: form,
    });
  } catch {
    return json({ error: 'Could not reach the license server. Try again.' }, 502);
  }
  const data = (await res.json().catch(() => null)) as {
    activated?: boolean; valid?: boolean; error?: string | null;
    instance?: { id: string } | null;
    license_key?: { status?: string; expires_at?: string | null };
    meta?: { store_id?: number; product_id?: number };
  } | null;
  if (!data) return json({ error: 'Unexpected response from the license server.' }, 502);

  const ok = activate ? data.activated : data.valid;
  const sameProduct = String(data.meta?.store_id) === env.LS_STORE_ID && String(data.meta?.product_id) === env.LS_PRODUCT_ID;
  if (!ok || !sameProduct || data.license_key?.status === 'expired' || data.license_key?.status === 'disabled') {
    return json({ valid: false, error: sameProduct ? (data.error ?? 'This license key is not active.') : 'This license key is not valid for this product.' }, 200);
  }
  return json({
    valid: true,
    plan: 'pro',
    instanceId: data.instance?.id ?? body.instanceId ?? null,
    expiresAt: data.license_key?.expires_at ?? null,
  });
}

export const onRequestPost = (ctx: { request: Request; env: Env }) => handleLicense(ctx.request, ctx.env);
