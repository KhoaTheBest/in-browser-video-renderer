import React, { useEffect, useState } from 'react';

type Props = {
  renderState: 'idle' | 'rendering' | 'done' | 'error';
  progress: number; // 0 to 1
  renderedBlob: Blob | null;
  errorMessage?: string;
};

export const VideoPlayback: React.FC<Props> = ({
  renderState,
  progress,
  renderedBlob,
  errorMessage,
}) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (renderedBlob && renderState === 'done') {
      const url = URL.createObjectURL(renderedBlob);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoUrl(null);
    }
  }, [renderedBlob, renderState]);

  return (
    <div className="flex flex-col items-center gap-3 w-full h-full">
      <h2 className="text-lg font-semibold text-slate-200">
        Player to play rendered video
      </h2>
      <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-black flex-1 flex items-center justify-center w-full min-h-[480px]">
        {renderState === 'idle' && (
          <p className="text-slate-500">Not rendered yet</p>
        )}

        {renderState === 'rendering' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 p-8">
            <p className="text-indigo-400 font-semibold mb-4 text-lg">
              Rendering...
            </p>
            <div className="h-4 w-full max-w-sm overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-150"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {Math.round(progress * 100)}%
            </p>
          </div>
        )}

        {renderState === 'error' && (
          <div className="p-6 text-center">
            <p className="text-red-400 font-semibold mb-2">Render Failed</p>
            <p className="text-sm text-slate-400 break-words max-w-md">
              {errorMessage}
            </p>
          </div>
        )}

        {renderState === 'done' && videoUrl && (
          <video
            src={videoUrl}
            controls
            autoPlay
            loop
            className="w-full h-full object-contain max-h-[480px]"
          />
        )}
      </div>
      {/* Spacer to match left column if needed, or status text */}
      <p className="text-xs text-slate-500 opacity-0">&bull;</p>
    </div>
  );
};
