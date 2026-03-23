import React from 'react';
import { Provider } from 'jotai';
import { Composition } from '@btg-pencil-ai/editor';
import type {
  AudioData,
  MultiAudioData,
  Scene,
} from '@btg-pencil-ai/editor';

type Props = {
  scenes: Scene[];
  dimensions: {
    id?: string | number;
    width: number;
    height: number;
  };
  visualId: string | number;
  scale: number;
  audio?: AudioData;
  multiAudio?: MultiAudioData;
  activeScene?: Scene;
  isPlayerControlsOpen?: boolean;
  isMainPlayer?: boolean;
  isMainSequence?: boolean;
  isPlaying?: boolean;
  isThumbnailTimeline?: boolean;
  isShowSafezone?: boolean;
  hasInteractive: boolean;
  isAnimationEnabled?: boolean;
  activeLayerIds?: string[];
  isDisableTextBox?: boolean;
  isTransparentBg?: boolean;
};

const EditorComposition = Composition as unknown as React.ComponentType<{
  scenes: Scene[];
  dimensions: {
    id?: string | number;
    width: number;
    height: number;
  };
  visualId: string | number;
  scale: number;
  audio?: AudioData;
  multiAudio?: MultiAudioData;
  activeScene?: Scene;
  isPlayerControlsOpen?: boolean;
  isMainPlayer?: boolean;
  isMainSequence?: boolean;
  isPlaying?: boolean;
  isThumbnailTimeline?: boolean;
  isShowSafezone?: boolean;
  hasInteractive: boolean;
  isAnimationEnabled?: boolean;
  activeLayerIds?: string[];
  isDisableTextBox?: boolean;
  isTransparentBg?: boolean;
}>;

export const CompositionWrapper: React.FC<Props> = (props) => {
  return (
    <Provider>
      <EditorComposition {...props} />
    </Provider>
  );
};
