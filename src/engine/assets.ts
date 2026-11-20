import { ALL_FORMATS, CanvasSink, Input, UrlSource } from 'mediabunny';
import type { Layer, VisualData } from '../types/visual';
import type { FrameAssets } from './drawFrame';
import { layerKind } from './timeline';

export class AssetLoadError extends Error {
  constructor(public url: string, cause?: unknown) {
    super(
      `Could not load ${url}. The file may be missing or the host blocks cross-origin access (CORS).` +
        (cause instanceof Error ? ` (${cause.message})` : ''),
    );
    this.name = 'AssetLoadError';
  }
}

export type LoadedAssets = FrameAssets & { dispose: () => void };

export async function loadAssets(visual: VisualData): Promise<LoadedAssets> {
  const imageUrls = new Set<string>();
  const videoUrls = new Set<string>();
  for (const scene of visual.scenes) {
    for (const l of scene.layers) {
      if (l.hidden || !l.url) continue;
      const kind = layerKind(l);
      if (kind === 'image') imageUrls.add(l.url);
      if (kind === 'video') videoUrls.add(l.url);
    }
  }

  const images = new Map<string, CanvasImageSource>();
  await Promise.all(
    [...imageUrls].map(async (url) => {
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        images.set(url, await createImageBitmap(await res.blob()));
      } catch (err) {
        throw new AssetLoadError(url, err);
      }
    }),
  );

  const inputs: Input[] = [];
  const sinks = new Map<string, CanvasSink>();
  await Promise.all(
    [...videoUrls].map(async (url) => {
      try {
        const input = new Input({ source: new UrlSource(url), formats: ALL_FORMATS });
        inputs.push(input);
        const track = await input.getPrimaryVideoTrack();
        if (!track) throw new Error('no video track');
        sinks.set(url, new CanvasSink(track));
      } catch (err) {
        throw new AssetLoadError(url, err);
      }
    }),
  );

  return {
    images,
    videoFrame: async (layer: Layer, seconds: number) => {
      const sink = layer.url ? sinks.get(layer.url) : undefined;
      const wrapped = await sink?.getCanvas(Math.max(0, seconds));
      return wrapped?.canvas ?? null;
    },
    dispose: () => {
      for (const bmp of images.values()) (bmp as ImageBitmap).close?.();
      for (const input of inputs) input.dispose();
    },
  };
}
