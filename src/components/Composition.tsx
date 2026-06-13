import React from 'react';
import { Sequence, Video, Audio, Img, AbsoluteFill } from 'remotion';
import type { Scene, MultiAudioData, AudioData } from '../types/editor';

interface CompositionProps {
  scenes: Scene[];
  dimensions: {
    width: number;
    height: number;
  };
  visualId: string | number;
  scale: number;
  audio?: AudioData;
  multiAudio?: MultiAudioData[];
  activeScene?: Scene;
  isMainPlayer?: boolean;
}

export const Composition: React.FC<CompositionProps> = ({
  scenes,
  audio,
  multiAudio,
}) => {
  // Compute scene timeline starting points
  let accumulatedFrame = 0;
  const scenesWithTimeline = scenes.map((scene) => {
    const startFrame = accumulatedFrame;
    accumulatedFrame += scene.durationInFrames;
    return {
      ...scene,
      startFrame,
    };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000', overflow: 'hidden' }}>
      {/* 1. Render all Scene Sequences */}
      {scenesWithTimeline.map((scene) => (
        <Sequence
          key={scene.id}
          from={scene.startFrame}
          durationInFrames={scene.durationInFrames}
        >
          <AbsoluteFill
            style={{
              backgroundColor: scene.canvasBgColor || 'transparent',
            }}
          >
            {scene.layers
              .filter((l) => !l.hidden)
              .map((layer) => {
                const layerStyle: React.CSSProperties = {
                  position: 'absolute',
                  left: `${layer.left}px`,
                  top: `${layer.top}px`,
                  width: `${layer.width}px`,
                  height: `${layer.height}px`,
                  opacity: layer.opacity !== undefined ? layer.opacity : 1,
                  transform: `rotate(${layer.rotate || 0}deg) scale(${layer.scaleX || 1}, ${layer.scaleY || 1})`,
                  transformOrigin: 'top left',
                };

                return (
                  <Sequence
                    key={layer.id}
                    from={layer.startFrame}
                    durationInFrames={layer.durationInFrames}
                    layout="none"
                  >
                    <div style={layerStyle}>
                      {/* Video Layer */}
                      {(layer.type === 'video' || layer.layerType === 'video') && layer.url && (
                        <Video
                          src={layer.url}
                          volume={layer.volume !== undefined ? layer.volume : 0}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      )}

                      {/* Image Layer */}
                      {(layer.type === 'image' || layer.layerType === 'image') && layer.url && (
                        <Img
                          src={layer.url}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      )}

                      {/* Shape Layer */}
                      {(layer.type === 'shape' || layer.layerType === 'shape') && (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: layer.color || 'transparent',
                            borderRadius:
                              layer.shapeType === 'circle' ? '50%' : '0',
                          }}
                        />
                      )}

                      {/* Text / Fineprint Layer */}
                      {(layer.type === 'text' ||
                        layer.layerType === 'text' ||
                        layer.layerType === 'fineprint') && (
                        <div
                          style={{
                            color: layer.textColor || 'white',
                            fontSize: `${layer.fontSize || 16}px`,
                            fontFamily: layer.fontFamily || 'sans-serif',
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            lineHeight: 1.2,
                            wordBreak: 'break-word',
                          }}
                        >
                          {layer.text}
                        </div>
                      )}
                    </div>
                  </Sequence>
                );
              })}
          </AbsoluteFill>
        </Sequence>
      ))}

      {/* 2. Global Audio Track (fallback or fallback list) */}
      {audio && audio.url && (
        <Audio
          src={audio.url}
          volume={audio.volume}
        />
      )}

      {/* 3. Multi-Audio Tracks */}
      {multiAudio &&
        multiAudio.map((track) => (
          <Sequence
            key={track.id}
            from={track.audioStartFrame}
            durationInFrames={track.audioEndFrame - track.audioStartFrame}
          >
            <Audio
              src={track.url}
              volume={track.volume}
            />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};
