import { useCallback, useEffect, useRef, useState } from 'react';
import type { VisualData } from '../types/visual';
import { loadAssets, type LoadedAssets } from './assets';
import { mixAudio } from './audio';
import { drawFrame } from './drawFrame';

/** Headless canvas player: owns assets, the playback clock and preview audio. UI binds to the result. */
export function usePreviewPlayer(visual: VisualData | null, paused = false) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const assetsRef = useRef<LoadedAssets | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const frameRef = useRef(0);
  const drawingRef = useRef(false);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const paint = useCallback(
    async (f: number) => {
      const canvas = canvasRef.current;
      const assets = assetsRef.current;
      const ctx = canvas?.getContext('2d');
      if (!visual || !ctx || !assets || drawingRef.current) return;
      drawingRef.current = true;
      try {
        await drawFrame(ctx, visual, f, assets);
      } finally {
        drawingRef.current = false;
      }
    },
    [visual],
  );

  const stopAudio = useCallback(() => {
    try {
      audioSrcRef.current?.stop();
    } catch {
      /* already stopped */
    }
    audioSrcRef.current = null;
  }, []);

  // Load assets + audio whenever the visual changes.
  useEffect(() => {
    let cancelled = false;
    assetsRef.current?.dispose();
    assetsRef.current = null;
    audioBufferRef.current = null;
    frameRef.current = 0;
    setFrame(0);
    setPlaying(false);
    setError('');
    if (!visual) return;
    setLoading(true);
    (async () => {
      try {
        const [assets, audio] = await Promise.all([loadAssets(visual), mixAudio(visual)]);
        if (cancelled) return assets.dispose();
        assetsRef.current = assets;
        audioBufferRef.current = audio;
        setLoading(false);
        await paint(0);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      stopAudio();
    };
  }, [visual, paint, stopAudio]);

  // Playback clock.
  useEffect(() => {
    if (!playing || !visual) return;
    const { fps, durationInFrames: total } = visual;
    let raf = 0;
    let t0 = performance.now() - (frameRef.current / fps) * 1000;

    const startAudio = () => {
      const buffer = audioBufferRef.current;
      if (!buffer) return;
      stopAudio();
      const ctx = (audioCtxRef.current ??= new AudioContext());
      void ctx.resume();
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0, Math.min(frameRef.current / fps, buffer.duration));
      audioSrcRef.current = src;
    };
    startAudio();

    const tick = (now: number) => {
      let f = Math.floor(((now - t0) / 1000) * fps);
      if (f >= total) {
        t0 = now;
        f = 0;
        startAudio();
      }
      if (f !== frameRef.current) {
        frameRef.current = f;
        setFrame(f);
        void paint(f);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      stopAudio();
    };
  }, [playing, visual, paint, stopAudio]);

  useEffect(() => {
    if (paused) setPlaying(false);
  }, [paused]);

  useEffect(() => () => void audioCtxRef.current?.close(), []);

  const seek = useCallback(
    (f: number) => {
      frameRef.current = f;
      setFrame(f);
      void paint(f);
    },
    [paint],
  );

  return {
    canvasRef,
    frame,
    playing,
    loading,
    error,
    play: () => !paused && setPlaying(true),
    pause: () => setPlaying(false),
    seek,
  };
}
