export interface AudioData {
  url: string;
  volume: number;
  startFrame: number;
  endFrame: number;
  audioDurationInFrames?: number;
  audioStartFrame?: number; // Added
  audioEndFrame?: number; // Added
}

export interface MultiAudioData {
  id: string;
  url: string;
  volume: number;
  audioStartFrame: number;
  audioEndFrame: number;
  audioDurationInFrames?: number;
  audioStartDelay?: number;
  type?: string;
}

export interface Layer {
  id: string;
  name: string;
  type: string; // 'video' | 'image' | 'text' | 'shape' | 'fineprint'
  layerType?: string;
  url?: string;
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  rotate?: number;
  startFrame: number;
  endFrame: number;
  durationInFrames: number;
  volume?: number;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  text?: string;
  shapeType?: string;
  color?: string;
  hidden?: boolean;
}

export interface Scene {
  id: string;
  durationInFrames: number;
  startFrame?: number;
  endFrame?: number;
  layers: Layer[];
  canvasBgColor?: string;
}

export interface VisualData {
  dimensions: {
    width: number;
    height: number;
    scaledWidth?: number;
    scaledHeight?: number;
  };
  durationInFrames: number;
  fps: number;
  scenes: Scene[];
  audio?: AudioData;
  multiAudio?: MultiAudioData[];
}
