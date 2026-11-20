import {
  BufferTarget,
  CanvasSource,
  AudioBufferSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
} from 'mediabunny';
import type { VisualData } from '../types/visual';
import { loadAssets } from './assets';
import { mixAudio } from './audio';
import { drawFrame } from './drawFrame';

export type ExportProgress = { percentage: number; renderedFrames: number; totalFrames: number };
export type ExportResult = { blob: Blob; durationMs: number; videoCodec: string; audioCodec: string | null };

export type ExportOptions = {
  visual: VisualData;
  onProgress?: (p: ExportProgress) => void;
  signal?: AbortSignal;
  /** Painted over every frame after the scene (e.g. a free-tier watermark). */
  overlay?: (ctx: OffscreenCanvasRenderingContext2D, width: number, height: number) => void;
};

/** Renders the visual to an MP4 entirely in the browser: canvas -> WebCodecs -> mediabunny. */
export async function exportVideo({ visual, onProgress, signal, overlay }: ExportOptions): Promise<ExportResult> {
  const started = performance.now();
  const { width, height } = visual.dimensions;
  const { fps, durationInFrames: total } = visual;
  const abortError = () => new DOMException('Render cancelled', 'AbortError');
  if (signal?.aborted) throw abortError();

  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
  const videoCodec = await getFirstEncodableVideoCodec(output.format.getSupportedVideoCodecs(), { width, height });
  if (!videoCodec) throw new Error('This browser cannot encode video at this size (WebCodecs).');

  const assets = await loadAssets(visual);
  try {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create a 2D canvas.');

    const videoSource = new CanvasSource(canvas, { codec: videoCodec, bitrate: QUALITY_HIGH });
    output.addVideoTrack(videoSource, { frameRate: fps });

    const mixed = await mixAudio(visual);
    let audioCodec: string | null = null;
    let audioSource: AudioBufferSource | null = null;
    if (mixed) {
      const codec = await getFirstEncodableAudioCodec(output.format.getSupportedAudioCodecs(), {
        numberOfChannels: mixed.numberOfChannels,
        sampleRate: mixed.sampleRate,
      });
      if (codec) {
        audioCodec = codec;
        audioSource = new AudioBufferSource({ codec, bitrate: QUALITY_HIGH });
        output.addAudioTrack(audioSource);
      } else {
        console.warn('No audio encoder available in this browser; exporting without sound.');
      }
    }

    await output.start();
    if (audioSource && mixed) await audioSource.add(mixed);

    for (let frame = 0; frame < total; frame++) {
      if (signal?.aborted) {
        await output.cancel();
        throw abortError();
      }
      await drawFrame(ctx, visual, frame, assets);
      overlay?.(ctx, width, height);
      await videoSource.add(frame / fps, 1 / fps);
      onProgress?.({ percentage: (frame + 1) / total, renderedFrames: frame + 1, totalFrames: total });
    }

    videoSource.close();
    audioSource?.close();
    await output.finalize();
    const buffer = (output.target as BufferTarget).buffer;
    if (!buffer) throw new Error('Encoder produced no output.');
    return {
      blob: new Blob([buffer], { type: 'video/mp4' }),
      durationMs: performance.now() - started,
      videoCodec,
      audioCodec,
    };
  } finally {
    assets.dispose();
  }
}
