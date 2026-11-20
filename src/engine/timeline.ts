import type { Layer, Scene, VisualData } from '../types/visual';

export type ActiveLayer = { layer: Layer; localFrame: number };
export type ActiveScene = { scene: Scene; localFrame: number; layers: ActiveLayer[] };

export function layerKind(layer: Layer): 'video' | 'image' | 'shape' | 'text' | null {
  const kinds = [layer.type, layer.layerType];
  if (kinds.includes('video')) return 'video';
  if (kinds.includes('image')) return 'image';
  if (kinds.includes('shape')) return 'shape';
  if (kinds.includes('text') || kinds.includes('fineprint')) return 'text';
  return null;
}

/** Scenes play back to back; returns each scene with its absolute start frame. */
export function withTimeline(scenes: Scene[]): Array<Scene & { startFrame: number }> {
  let acc = 0;
  return scenes.map((scene) => {
    const startFrame = acc;
    acc += scene.durationInFrames;
    return { ...scene, startFrame };
  });
}

/** The scene (and visible layers) shown at an absolute frame, or null past the end. */
export function sceneAtFrame(visual: Pick<VisualData, 'scenes'>, frame: number): ActiveScene | null {
  for (const scene of withTimeline(visual.scenes)) {
    if (frame >= scene.startFrame && frame < scene.startFrame + scene.durationInFrames) {
      const localFrame = frame - scene.startFrame;
      const layers = scene.layers
        .filter(
          (l) =>
            !l.hidden && localFrame >= l.startFrame && localFrame < l.startFrame + l.durationInFrames,
        )
        .map((layer) => ({ layer, localFrame: localFrame - layer.startFrame }));
      return { scene, localFrame, layers };
    }
  }
  return null;
}

export type AudioClip = {
  url: string;
  volume: number;
  /** absolute start, in seconds, on the output timeline */
  startSec: number;
  /** clip length in seconds, or undefined to play to the end of the source/timeline */
  durationSec?: number;
};

/** Flattens the global track, multi-audio tracks and audible video layers into clips. */
export function collectAudioClips(visual: VisualData): AudioClip[] {
  const { fps } = visual;
  const clips: AudioClip[] = [];
  if (visual.audio?.url) {
    clips.push({ url: visual.audio.url, volume: visual.audio.volume ?? 1, startSec: 0 });
  }
  for (const t of visual.multiAudio ?? []) {
    if (!t.url) continue;
    clips.push({
      url: t.url,
      volume: t.volume ?? 1,
      startSec: t.audioStartFrame / fps,
      durationSec: Math.max(0, t.audioEndFrame - t.audioStartFrame) / fps,
    });
  }
  for (const scene of withTimeline(visual.scenes)) {
    for (const l of scene.layers) {
      if (l.hidden || layerKind(l) !== 'video' || !l.url || !(l.volume && l.volume > 0)) continue;
      clips.push({
        url: l.url,
        volume: l.volume,
        startSec: (scene.startFrame + l.startFrame) / fps,
        durationSec: l.durationInFrames / fps,
      });
    }
  }
  return clips;
}

export function isRenderable(v: Partial<VisualData> | null | undefined): v is VisualData {
  return Boolean(
    v && v.fps && v.durationInFrames && v.dimensions?.width && v.dimensions?.height && Array.isArray(v.scenes),
  );
}
