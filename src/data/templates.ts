import type { Layer, VisualData } from '../types/visual';

const FPS = 30;
const seconds = (s: number) => s * FPS;

function text(id: string, t: string, o: Partial<Layer>): Layer {
  return {
    id, name: id, type: 'text', text: t, left: 0, top: 0, width: 900, height: 200,
    startFrame: 0, endFrame: 0, durationInFrames: seconds(3), textColor: '#ffffff', fontSize: 72,
    fontFamily: 'Inter, system-ui, sans-serif', ...o,
  };
}

function shape(id: string, o: Partial<Layer>): Layer {
  return {
    id, name: id, type: 'shape', left: 0, top: 0, width: 100, height: 100,
    startFrame: 0, endFrame: 0, durationInFrames: seconds(3), color: '#ffffff', ...o,
  };
}

export type Template = { id: string; name: string; description: string; visual: VisualData };

export const templates: Template[] = [
  {
    id: 'launch-square',
    name: 'Product launch (1:1)',
    description: 'Three-beat announcement for feeds. 1080 × 1080, 9 seconds.',
    visual: {
      fps: FPS,
      durationInFrames: seconds(9),
      dimensions: { width: 1080, height: 1080 },
      scenes: [
        {
          id: 's1', durationInFrames: seconds(3), canvasBgColor: '#0f172a',
          layers: [
            shape('s1-orb', { left: 640, top: 80, width: 360, height: 360, shapeType: 'circle', color: '#6366f1', opacity: 0.85 }),
            text('s1-title', 'Something new\nis coming', { left: 90, top: 480, height: 300, fontSize: 112 }),
          ],
        },
        {
          id: 's2', durationInFrames: seconds(3), canvasBgColor: '#312e81',
          layers: [
            shape('s2-bar', { left: 90, top: 300, width: 220, height: 16, color: '#fbbf24' }),
            text('s2-title', 'Faster renders.\nZero servers.', { left: 90, top: 360, height: 360, fontSize: 112 }),
          ],
        },
        {
          id: 's3', durationInFrames: seconds(3), canvasBgColor: '#fbbf24',
          layers: [
            text('s3-title', 'Try it today', { left: 90, top: 420, height: 200, fontSize: 128, textColor: '#0f172a' }),
          ],
        },
      ],
    },
  },
  {
    id: 'story-vertical',
    name: 'Story (9:16)',
    description: 'Short vertical teaser. 1080 × 1920, 6 seconds.',
    visual: {
      fps: FPS,
      durationInFrames: seconds(6),
      dimensions: { width: 1080, height: 1920 },
      scenes: [
        {
          id: 's1', durationInFrames: seconds(6), canvasBgColor: '#064e3b',
          layers: [
            shape('orb', { left: 140, top: 300, width: 800, height: 800, shapeType: 'circle', color: '#34d399', opacity: 0.5 }),
            text('hook', 'Made in your browser', { left: 90, top: 1150, height: 400, fontSize: 120, durationInFrames: seconds(6) }),
            text('sub', 'No upload. No waiting.', { left: 90, top: 1560, height: 120, fontSize: 56, startFrame: seconds(2), durationInFrames: seconds(4), textColor: '#a7f3d0' }),
          ],
        },
      ],
    },
  },
];
