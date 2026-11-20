import { PLANS, type PlanLimits } from './plans';

const KEY = 'render-license';
const REVALIDATE_MS = 24 * 60 * 60 * 1000;

export type StoredLicense = { licenseKey: string; instanceId: string | null; validatedAt: number; expiresAt: string | null };

export function readLicense(): StoredLicense | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredLicense) : null;
  } catch { return null; }
}
export function clearLicense() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  window.dispatchEvent(new Event('license-changed'));
}

export function planFor(license: StoredLicense | null, now = Date.now()): PlanLimits {
  if (!license) return PLANS.free;
  if (license.expiresAt && Date.parse(license.expiresAt) < now) return PLANS.free;
  return PLANS.pro;
}
export const needsRevalidation = (l: StoredLicense, now = Date.now()) => now - l.validatedAt > REVALIDATE_MS;

async function call(body: object): Promise<{ valid: boolean; error?: string; instanceId?: string | null; expiresAt?: string | null }> {
  let res: Response;
  try {
    res = await fetch('/api/license', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new Error('Could not reach the license service. Check your connection.');
  }
  const data = await res.json().catch(() => null);
  if (!data) throw new Error('The license service returned an unexpected response.');
  if (!res.ok) return { valid: false, error: data.error ?? `License service error (${res.status}).` };
  return data;
}

export async function activateLicense(licenseKey: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await call({ licenseKey, action: 'activate' });
  if (!r.valid) return { ok: false, error: r.error ?? 'License key not valid.' };
  const stored: StoredLicense = { licenseKey: licenseKey.trim(), instanceId: r.instanceId ?? null, validatedAt: Date.now(), expiresAt: r.expiresAt ?? null };
  try { localStorage.setItem(KEY, JSON.stringify(stored)); } catch { return { ok: false, error: 'Your browser blocked saving the license.' }; }
  window.dispatchEvent(new Event('license-changed'));
  return { ok: true };
}

/** Re-checks a stored license daily; network failures keep the current plan (fail open for paying users). */
export async function revalidateLicense(): Promise<void> {
  const l = readLicense();
  if (!l || !needsRevalidation(l)) return;
  try {
    const r = await call({ licenseKey: l.licenseKey, instanceId: l.instanceId, action: 'validate' });
    if (!r.valid) return clearLicense();
    localStorage.setItem(KEY, JSON.stringify({ ...l, validatedAt: Date.now(), expiresAt: r.expiresAt ?? l.expiresAt }));
  } catch { /* offline: keep plan */ }
}
