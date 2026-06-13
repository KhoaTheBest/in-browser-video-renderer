import { renderMediaOnWeb } from '@remotion/web-renderer';
import type { ComponentType } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export type RenderProgress = {
  percentage: number;
  renderedFrames: number;
  totalFrames: number;
};

export type RenderResult = {
  blob: Blob;
  durationMs: number;
};

export async function renderVideo({
  component,
  props,
  durationInFrames,
  fps,
  width,
  height,
  onProgress,
  signal,
}: {
  component: ComponentType<Record<string, unknown>>;
  props: Record<string, unknown>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  onProgress: (progress: RenderProgress) => void;
  signal?: AbortSignal;
}): Promise<RenderResult> {
  const startTime = Date.now();

  // 1. Render raw VP8 WebM frames in-browser using Remotion
  const renderResult = await renderMediaOnWeb({
    composition: {
      id: 'render-composition',
      component,
      durationInFrames,
      fps,
      width,
      height,
    },
    inputProps: props,
    videoCodec: 'vp8',
    signal: signal ?? null,
    onProgress: ({ progress }) => {
      const renderedFrames = Math.round(progress * durationInFrames);
      onProgress({
        percentage: progress * 0.5, // First 50% allocated to Remotion rendering
        renderedFrames,
        totalFrames: durationInFrames,
      });
    },
  });

  const webmBlob = await renderResult.getBlob();

  // 2. Transcode WebM to MP4 using FFmpeg.wasm
  const ffmpeg = new FFmpeg();
  
  // Track conversion progress (mapping remaining 50% to FFmpeg)
  ffmpeg.on('progress', ({ progress }) => {
    onProgress({
      percentage: 0.5 + progress * 0.5,
      renderedFrames: durationInFrames,
      totalFrames: durationInFrames,
    });
  });

  // Load FFmpeg.wasm from public CDN
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  // Write WebM to FFmpeg's virtual file system
  await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));

  // Run FFmpeg command: transcode VP8/WebM to universally-supported H.264/AAC MP4
  // We use -preset ultrafast to maximize in-browser speed
  await ffmpeg.exec([
    '-i', 'input.webm',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-c:a', 'aac',
    'output.mp4'
  ]);

  // Read the output MP4 from the virtual file system
  const data = await ffmpeg.readFile('output.mp4');
  const blob = new Blob([data as any], { type: 'video/mp4' });
  const durationMs = Date.now() - startTime;

  return { blob, durationMs };
}
