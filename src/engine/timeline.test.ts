import { describe, expect, it } from 'vitest';
import { collectAudioClips, isRenderable, layerKind, sceneAtFrame, withTimeline } from './timeline';
import { templates } from '../data/templates';
import type { Layer, VisualData } from '../types/visual';

const layer = (o: Partial<Layer>): Layer => ({
  id: 'l', name: 'l', type: 'shape', left: 0, top: 0, width: 10, height: 10,
  startFrame: 0, endFrame: 0, durationInFrames: 30, ...o,
});

const visual: VisualData = {
  fps: 30, durationInFrames: 90, dimensions: { width: 100, height: 100 },
  scenes: [
    { id: 'a', durationInFrames: 30, layers: [layer({ id: 'a1' }), layer({ id: 'a2', startFrame: 10, durationInFrames: 5 }), layer({ id: 'h', hidden: true })] },
    { id: 'b', durationInFrames: 60, layers: [layer({ id: 'b1', type: 'video', url: 'v.mp4', volume: 0.5 })] },
  ],
  multiAudio: [{ id: 'm', url: 'm.mp3', volume: 1, audioStartFrame: 15, audioEndFrame: 45 }],
};

describe('timeline', () => {
  it('lays scenes back to back', () => {
    expect(withTimeline(visual.scenes).map((s) => s.startFrame)).toEqual([0, 30]);
  });
  it('finds the active scene and skips hidden / not-yet-started layers', () => {
    expect(sceneAtFrame(visual, 5)?.layers.map((l) => l.layer.id)).toEqual(['a1']);
    expect(sceneAtFrame(visual, 12)?.layers.map((l) => l.layer.id)).toEqual(['a1', 'a2']);
    expect(sceneAtFrame(visual, 12)?.layers[1].localFrame).toBe(2);
  });
  it('switches scene at the boundary and returns null past the end', () => {
    expect(sceneAtFrame(visual, 30)?.scene.id).toBe('b');
    expect(sceneAtFrame(visual, 90)).toBeNull();
  });
  it('classifies layer kinds via type or layerType', () => {
    expect(layerKind(layer({ type: 'x', layerType: 'fineprint' }))).toBe('text');
    expect(layerKind(layer({ type: 'x' }))).toBeNull();
  });
  it('collects multi-audio and audible video layers only', () => {
    const clips = collectAudioClips(visual);
    expect(clips).toHaveLength(2);
    expect(clips[0]).toMatchObject({ url: 'm.mp3', startSec: 0.5, durationSec: 1 });
    expect(clips[1]).toMatchObject({ url: 'v.mp4', volume: 0.5, startSec: 1 });
  });
  it('validates renderable visuals', () => {
    expect(isRenderable(visual)).toBe(true);
    expect(isRenderable({ fps: 30 })).toBe(false);
    expect(isRenderable(null)).toBe(false);
  });
  it('ships templates that are renderable and whose scenes sum to the duration', () => {
    for (const t of templates) {
      expect(isRenderable(t.visual)).toBe(true);
      expect(t.visual.scenes.reduce((n, s) => n + s.durationInFrames, 0)).toBe(t.visual.durationInFrames);
    }
  });
});
