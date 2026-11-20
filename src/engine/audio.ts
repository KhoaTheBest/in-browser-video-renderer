import type { VisualData } from '../types/visual';
import { collectAudioClips } from './timeline';

const SAMPLE_RATE = 48000;

/** Mixes every audio clip into one stereo AudioBuffer spanning the whole video, or null if silent. */
export async function mixAudio(visual: VisualData): Promise<AudioBuffer | null> {
  const clips = collectAudioClips(visual);
  if (clips.length === 0) return null;

  const totalSec = visual.durationInFrames / visual.fps;
  const decoder = new OfflineAudioContext(2, SAMPLE_RATE, SAMPLE_RATE);
  const decoded = new Map<string, AudioBuffer | null>();
  await Promise.all(
    [...new Set(clips.map((c) => c.url))].map(async (url) => {
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        decoded.set(url, await decoder.decodeAudioData(await res.arrayBuffer()));
      } catch (err) {
        console.warn(`Skipping audio that could not be loaded: ${url}`, err);
        decoded.set(url, null);
      }
    }),
  );

  const ctx = new OfflineAudioContext(2, Math.ceil(totalSec * SAMPLE_RATE), SAMPLE_RATE);
  let any = false;
  for (const clip of clips) {
    const buffer = decoded.get(clip.url);
    if (!buffer) continue;
    any = true;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = clip.volume;
    src.connect(gain).connect(ctx.destination);
    const len = Math.min(clip.durationSec ?? Infinity, buffer.duration);
    src.start(clip.startSec, 0, len);
  }
  return any ? ctx.startRendering() : null;
}
