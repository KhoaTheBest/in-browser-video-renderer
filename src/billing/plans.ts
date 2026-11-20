import type { VisualData } from '../types/visual';

export type PlanId = 'free' | 'pro';

export type PlanLimits = {
  id: PlanId;
  name: string;
  /** Longest side of the exported video, in pixels. */
  maxLongSide: number;
  maxSeconds: number;
  watermark: boolean;
  /** Exports per local calendar day; Infinity = unlimited. */
  dailyExports: number;
};

export const PLANS: Record<PlanId, PlanLimits> = {
  free: { id: 'free', name: 'Free', maxLongSide: 1280, maxSeconds: 15, watermark: true, dailyExports: 3 },
  pro: { id: 'pro', name: 'Pro', maxLongSide: 1920, maxSeconds: 180, watermark: false, dailyExports: Infinity },
};

export type ExportCheck =
  | { ok: true; scale: number }
  | { ok: false; reason: 'too-long' | 'daily-limit'; message: string };

/** Pure policy check: can this plan export this visual now, and at what scale? */
export function checkExport(plan: PlanLimits, visual: VisualData, exportsToday: number): ExportCheck {
  const seconds = visual.durationInFrames / visual.fps;
  if (seconds > plan.maxSeconds) {
    return { ok: false, reason: 'too-long', message: `${plan.name} exports are limited to ${plan.maxSeconds} seconds. This video is ${Math.ceil(seconds)} seconds.` };
  }
  if (exportsToday >= plan.dailyExports) {
    return { ok: false, reason: 'daily-limit', message: `You have used all ${plan.dailyExports} ${plan.name} exports for today.` };
  }
  const longSide = Math.max(visual.dimensions.width, visual.dimensions.height);
  return { ok: true, scale: Math.min(1, plan.maxLongSide / longSide) };
}

export function drawWatermark(ctx: OffscreenCanvasRenderingContext2D, width: number, height: number) {
  const size = Math.max(12, Math.round(Math.min(width, height) * 0.03));
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 0.7;
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#000000';
  ctx.fillText('Made with Render in Browser', width - size + 1, height - size + 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Made with Render in Browser', width - size, height - size);
  ctx.restore();
}
