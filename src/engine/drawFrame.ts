import type { Layer, VisualData } from '../types/visual';
import { layerKind, sceneAtFrame } from './timeline';

/** Pre-loaded sources a frame needs. Video layers are fetched per-frame by the host. */
export type FrameAssets = {
  images: Map<string, CanvasImageSource>;
  /** Returns a decoded frame for a video layer at `seconds` into the layer. */
  videoFrame: (layer: Layer, seconds: number) => Promise<CanvasImageSource | null>;
};

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function sourceSize(src: CanvasImageSource): { w: number; h: number } {
  const s = src as { width?: number; height?: number; videoWidth?: number; videoHeight?: number };
  return { w: s.videoWidth || s.width || 1, h: s.videoHeight || s.height || 1 };
}

/** CSS `object-fit: cover` */
function drawCover(ctx: Ctx, src: CanvasImageSource, w: number, h: number) {
  const { w: sw, h: sh } = sourceSize(src);
  const scale = Math.max(w / sw, h / sh);
  const cw = w / scale;
  const ch = h / scale;
  ctx.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, w, h);
}

export function wrapText(ctx: Ctx, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function drawFrame(
  ctx: Ctx,
  visual: VisualData,
  frame: number,
  assets: FrameAssets,
  /** Output scale relative to the visual's own dimensions (e.g. 0.667 for a 720p cap). */
  scale = 1,
): Promise<void> {
  const { width, height } = visual.dimensions;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const active = sceneAtFrame(visual, frame);
  if (!active) return;

  if (active.scene.canvasBgColor) {
    ctx.fillStyle = active.scene.canvasBgColor;
    ctx.fillRect(0, 0, width, height);
  }

  for (const { layer, localFrame } of active.layers) {
    const kind = layerKind(layer);
    if (!kind) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 1;
    ctx.translate(layer.left, layer.top);
    ctx.rotate(((layer.rotate ?? 0) * Math.PI) / 180);
    ctx.scale(layer.scaleX ?? 1, layer.scaleY ?? 1);
    const { width: w, height: h } = layer;

    if (kind === 'image' && layer.url) {
      const img = assets.images.get(layer.url);
      if (img) drawCover(ctx, img, w, h);
    } else if (kind === 'video' && layer.url) {
      const frameImg = await assets.videoFrame(layer, localFrame / visual.fps);
      if (frameImg) drawCover(ctx, frameImg, w, h);
    } else if (kind === 'shape') {
      ctx.fillStyle = layer.color || 'transparent';
      if (layer.shapeType === 'circle') {
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(0, 0, w, h);
      }
    } else if (kind === 'text' && layer.text) {
      const size = layer.fontSize || 16;
      ctx.fillStyle = layer.textColor || 'white';
      ctx.font = `${size}px ${layer.fontFamily || 'sans-serif'}`;
      ctx.textBaseline = 'top';
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();
      wrapText(ctx, layer.text, w).forEach((line, i) => ctx.fillText(line, 0, i * size * 1.2));
    }
    ctx.restore();
  }
}
