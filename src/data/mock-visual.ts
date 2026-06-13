import type { VisualData } from '../types/editor';
import mockVisualData from './mock-visual.json';

// We cast it as VisualData. The JSON schema looks to be compatible with what the renderer needs,
// or at least what CompositionPreview/RenderPanel expect (fps, durationInFrames, dimensions, scenes)
export const mockVisual = mockVisualData as unknown as VisualData;
