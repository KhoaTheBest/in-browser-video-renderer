import { renderMediaOnWeb } from '@remotion/web-renderer';
import type { ComponentType } from 'react';
import {
  Input,
  ALL_FORMATS,
  BlobSource,
  Output,
  BufferTarget,
  Mp4OutputFormat,
  canEncodeAudio,
  Conversion,
} from 'mediabunny';
import { registerAacEncoder } from '@mediabunny/aac-encoder';

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
        percentage: progress * 0.5, // 50% for WebM rendering
        renderedFrames,
        totalFrames: durationInFrames,
      });
    },
  });

  const webmBlob = await renderResult.getBlob();

  // Now convert WebM to MP4
  if (!(await canEncodeAudio('aac'))) {
    registerAacEncoder();
  }

  const input = new Input({
    source: new BlobSource(webmBlob),
    formats: ALL_FORMATS,
  });

  const output = new Output({
    format: new Mp4OutputFormat(),
    target: new BufferTarget(),
  });

  const conversion = await Conversion.init({
    input,
    output,
  });

  // Track conversion progress for the remaining 50%
  conversion.onProgress = (progress) => {
    onProgress({
      percentage: 0.5 + progress * 0.5,
      renderedFrames: durationInFrames, // Assuming all frames are rendered for conversion
      totalFrames: durationInFrames,
    });
  };

  await conversion.execute();

  if (!output.target.buffer) {
    throw new Error('Failed to generate MP4 buffer');
  }

  const blob = new Blob([output.target.buffer], { type: 'video/mp4' });
  const durationMs = Date.now() - startTime;

  return { blob, durationMs };
}
