import React, { useEffect, useMemo, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { CompositionWrapper } from './CompositionWrapper';
import type { VisualData } from '../types/editor';

type Props = {
  visualData: VisualData | null;
  visualId: string;
  isMainPlayer: boolean;
  sharedAudioTags: number;
  error?: string | null;
  forcePause?: boolean;
};

const formatTrackLabel = (
  track: NonNullable<VisualData['multiAudio']>[number],
  index: number,
) => {
  return `#${index + 1} delay=${track.audioStartDelay ?? 0} start=${
    track.audioStartFrame
  } end=${track.audioEndFrame} volume=${track.volume}`;
};

export const AdPlayerPreview: React.FC<Props> = ({
  visualData,
  visualId,
  isMainPlayer,
  sharedAudioTags,
  error,
  forcePause,
}) => {
  const [playerRef, setPlayerRef] = useState<PlayerRef | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastPlayerEvent, setLastPlayerEvent] = useState('idle');

  const hasPlayableVisual = Boolean(
    visualData &&
    visualData.fps &&
    visualData.durationInFrames &&
    visualData.dimensions?.width &&
    visualData.dimensions?.height &&
    Array.isArray(visualData.scenes),
  );

  const dimensions = visualData?.dimensions ?? { width: 1080, height: 1080 };

  // Make the preview responsive, max width 480px
  const PREVIEW_WIDTH = 480;
  const SCALE = PREVIEW_WIDTH / dimensions.width;
  const PREVIEW_HEIGHT = Math.round(
    PREVIEW_WIDTH * (dimensions.height / dimensions.width),
  );

  const compositionProps = useMemo(() => {
    if (!visualData) return null;
    return {
      scenes: visualData.scenes,
      dimensions: visualData.dimensions,
      visualId: `preview-${visualId}`,
      audio: visualData.audio,
      multiAudio: visualData.multiAudio,
      scale: SCALE,
      activeScene: visualData.scenes?.[0],
      isMainPlayer,
      isMainSequence: true,
      isShowSafezone: true,
      isPlaying,
      isPlayerControlsOpen: true,
      hasInteractive: false,
      isAnimationEnabled: true,
      activeLayerIds: [],
      isDisableTextBox: true,
    };
  }, [SCALE, isMainPlayer, isPlaying, visualData, visualId]);

  const audioSummary = useMemo(() => {
    if (!visualData) return null;
    const legacyAudio = visualData.audio;
    const multiAudio = visualData.multiAudio ?? [];

    return {
      legacyAudio: legacyAudio
        ? `legacy audio start=${legacyAudio.audioStartFrame} volume=${legacyAudio.volume}`
        : 'legacy audio: none',
      multiAudioCount: multiAudio.length,
      multiAudioLabels: multiAudio.slice(0, 5).map(formatTrackLabel),
    };
  }, [visualData]);

  useEffect(() => {
    if (!visualData) return;
    console.groupCollapsed(
      `[preview-debug] ${visualId} main=${isMainPlayer} sharedAudioTags=${sharedAudioTags}`,
    );
    console.info('dimensions', visualData.dimensions);
    console.info('durationInFrames', visualData.durationInFrames);
    console.info('fps', visualData.fps);
    console.info('audio', visualData.audio ?? null);
    console.info('multiAudioCount', visualData.multiAudio?.length ?? 0);
    console.info(
      'multiAudio',
      (visualData.multiAudio ?? []).map((track, index) => ({
        index,
        id: track.id,
        delay: track.audioStartDelay,
        start: track.audioStartFrame,
        end: track.audioEndFrame,
        duration: track.audioDurationInFrames,
        volume: track.volume,
      })),
    );
    console.groupEnd();
  }, [isMainPlayer, sharedAudioTags, visualData, visualId]);

  useEffect(() => {
    if (forcePause && playerRef && isPlaying) {
      playerRef.pause();
    }
  }, [forcePause, playerRef, isPlaying]);

  useEffect(() => {
    if (!playerRef) {
      return;
    }

    const onPlay = () => {
      setIsPlaying(true);
      setLastPlayerEvent('play');
      console.info('[preview-player] play');
    };
    const onPause = () => {
      setIsPlaying(false);
      setLastPlayerEvent('pause');
      console.info('[preview-player] pause');
    };
    const onWaiting = () => {
      setLastPlayerEvent('waiting');
      console.info('[preview-player] waiting');
    };
    const onResume = () => {
      setLastPlayerEvent('resume');
      console.info('[preview-player] resume');
    };
    const onEnded = () => {
      setIsPlaying(false);
      setLastPlayerEvent('ended');
      console.info('[preview-player] ended');
    };
    const onError = ({ detail }: { detail: { error: Error } }) => {
      setIsPlaying(false);
      setLastPlayerEvent(`error: ${detail.error.message}`);
      console.error('[preview-player] error', detail.error);
    };

    playerRef.addEventListener('play', onPlay);
    playerRef.addEventListener('pause', onPause);
    playerRef.addEventListener('waiting', onWaiting);
    playerRef.addEventListener('resume', onResume);
    playerRef.addEventListener('ended', onEnded);
    playerRef.addEventListener('error', onError);

    return () => {
      playerRef.removeEventListener('play', onPlay);
      playerRef.removeEventListener('pause', onPause);
      playerRef.removeEventListener('waiting', onWaiting);
      playerRef.removeEventListener('resume', onResume);
      playerRef.removeEventListener('ended', onEnded);
      playerRef.removeEventListener('error', onError);
    };
  }, [playerRef]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded bg-slate-800 px-6 text-center text-red-300">
        {error}
      </div>
    );
  }

  if (!visualData) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded bg-slate-800 text-slate-500">
        No visual selected
      </div>
    );
  }

  if (!hasPlayableVisual || !compositionProps || !audioSummary) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded bg-slate-800 px-6 text-center text-red-300">
        Selected visual is missing required composition fields.
      </div>
    );
  }

  const { fps, durationInFrames } = visualData;

  return (
    <div className="flex flex-col items-center gap-3 w-full h-full">
      <h2 className="text-lg font-semibold text-slate-200">
        Ad Player preview
      </h2>
      <div className="overflow-hidden rounded-xl border border-slate-700 bg-black flex-1 flex items-center justify-center w-full min-h-[480px]">
        <Player
          key={`preview-${visualId}-${isMainPlayer}-${sharedAudioTags}`}
          ref={setPlayerRef}
          component={CompositionWrapper}
          inputProps={compositionProps}
          durationInFrames={durationInFrames}
          fps={fps}
          compositionWidth={dimensions.width}
          compositionHeight={dimensions.height}
          style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
          controls={false}
          numberOfSharedAudioTags={sharedAudioTags}
        />
      </div>
      <div className="flex w-full items-center justify-center gap-3">
        <button
          onClick={() => playerRef?.play()}
          className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-400 hover:text-white"
        >
          Play
        </button>
        <button
          onClick={() => playerRef?.pause()}
          className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-400 hover:text-white"
        >
          Pause
        </button>
        <button
          onClick={() => {
            playerRef?.pause();
            playerRef?.seekTo(0);
            setLastPlayerEvent('seeked-to-start');
          }}
          className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-400 hover:text-white"
        >
          Restart
        </button>
      </div>
      <div className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-xs text-slate-400">
        <p>
          mode:{' '}
          <span className="text-slate-200">
            {isMainPlayer ? 'main-player' : 'thumbnail-path'}
          </span>{' '}
          | shared audio tags:{' '}
          <span className="text-slate-200">{sharedAudioTags}</span> | last
          event: <span className="text-slate-200">{lastPlayerEvent}</span>
        </p>
        <p>{audioSummary.legacyAudio}</p>
        <p>multi-audio tracks: {audioSummary.multiAudioCount}</p>
        {audioSummary.multiAudioLabels.map((label) => (
          <p key={label}>{label}</p>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        {dimensions.width}&times;{dimensions.height} &bull; {fps}fps &bull;{' '}
        {(durationInFrames / fps).toFixed(1)}s
      </p>
    </div>
  );
};
