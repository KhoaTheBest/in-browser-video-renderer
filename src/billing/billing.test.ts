import { describe, expect, it, vi } from 'vitest';
import { PLANS, checkExport } from './plans';
import { planFor, needsRevalidation } from './license';
import { handleLicense } from '../../functions/api/license';
import { templates } from '../data/templates';

const sq = templates[0].visual; // 1080x1080, 9s
const long = { ...sq, durationInFrames: sq.fps * 60 };
const big = { ...sq, dimensions: { width: 3840, height: 2160 } };

describe('checkExport', () => {
  it('allows free within limits at full scale', () => {
    expect(checkExport(PLANS.free, sq, 0)).toEqual({ ok: true, scale: 1 });
  });
  it('downscales 4K for free (1280/3840) and for pro (1920/3840)', () => {
    expect(checkExport(PLANS.free, big, 0)).toMatchObject({ ok: true, scale: 1280 / 3840 });
    expect(checkExport(PLANS.pro, big, 0)).toMatchObject({ ok: true, scale: 0.5 });
  });
  it('blocks long videos on free but not pro', () => {
    expect(checkExport(PLANS.free, long, 0)).toMatchObject({ ok: false, reason: 'too-long' });
    expect(checkExport(PLANS.pro, long, 0).ok).toBe(true);
  });
  it('enforces the daily cap on free only', () => {
    expect(checkExport(PLANS.free, sq, 3)).toMatchObject({ ok: false, reason: 'daily-limit' });
    expect(checkExport(PLANS.pro, sq, 999).ok).toBe(true);
  });
});

describe('license plan', () => {
  const lic = { licenseKey: 'k', instanceId: 'i', validatedAt: 1000, expiresAt: null };
  it('is free without a license or once expired, pro otherwise', () => {
    expect(planFor(null).id).toBe('free');
    expect(planFor(lic).id).toBe('pro');
    expect(planFor({ ...lic, expiresAt: '2020-01-01T00:00:00Z' }, Date.now()).id).toBe('free');
  });
  it('revalidates after 24h', () => {
    expect(needsRevalidation(lic, 1000 + 1000)).toBe(false);
    expect(needsRevalidation(lic, 1000 + 25 * 3600 * 1000)).toBe(true);
  });
});

describe('license function', () => {
  const env = { LS_STORE_ID: '1', LS_PRODUCT_ID: '2' };
  const req = (b: unknown) => new Request('https://x/api/license', { method: 'POST', body: JSON.stringify(b) });
  const ls = (payload: unknown) => vi.fn(async () => new Response(JSON.stringify(payload)));

  it('rejects missing key and unconfigured deployments', async () => {
    expect((await handleLicense(req({}), env)).status).toBe(400);
    expect((await handleLicense(req({ licenseKey: 'k' }), {})).status).toBe(503);
  });
  it('accepts an activated key for the right product', async () => {
    const f = ls({ activated: true, instance: { id: 'inst' }, license_key: { status: 'active' }, meta: { store_id: 1, product_id: 2 } });
    const r = await (await handleLicense(req({ licenseKey: 'k' }), env, f as unknown as typeof fetch)).json();
    expect(r).toMatchObject({ valid: true, plan: 'pro', instanceId: 'inst' });
  });
  it('rejects a key from another product', async () => {
    const f = ls({ activated: true, license_key: { status: 'active' }, meta: { store_id: 1, product_id: 99 } });
    const r = await (await handleLicense(req({ licenseKey: 'k' }), env, f as unknown as typeof fetch)).json();
    expect(r.valid).toBe(false);
  });
  it('rejects invalid and disabled keys', async () => {
    const bad = ls({ valid: false, error: 'license_key not found', meta: { store_id: 1, product_id: 2 } });
    expect((await (await handleLicense(req({ licenseKey: 'k', action: 'validate' }), env, bad as unknown as typeof fetch)).json()).valid).toBe(false);
    const off = ls({ valid: true, license_key: { status: 'disabled' }, meta: { store_id: 1, product_id: 2 } });
    expect((await (await handleLicense(req({ licenseKey: 'k', action: 'validate' }), env, off as unknown as typeof fetch)).json()).valid).toBe(false);
  });
});
