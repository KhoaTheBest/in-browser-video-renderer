import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { VisualData } from '@btg-pencil-ai/editor';
import { fetchVisualData, VisualDataResponse } from '../lib/fetchVisualData';
import { AdPlayerPreview } from './AdPlayerPreview';
import { VideoPlayback } from './VideoPlayback';
import { ErrorBoundary } from './ErrorBoundary';
import { renderVideo } from '../lib/renderVideo';
import { CompositionWrapper } from './CompositionWrapper';
import { detectWebCodecsSupport } from '../lib/detectWebCodecs';

type RenderState = 'idle' | 'rendering' | 'done' | 'error';

export const RenderBlock: React.FC<{ blockId: string }> = ({ blockId }) => {
  const isMountedRef = useRef(true);
  const fetchRequestIdRef = useRef(0);
  const renderAbortControllerRef = useRef<AbortController | null>(null);

  const [workUrl, setWorkUrl] = useState(
    () => localStorage.getItem(`render-poc-workUrl-${blockId}`) || '',
  );
  const [jwt, setJwt] = useState(
    () => localStorage.getItem(`render-poc-jwt-${blockId}`) || '',
  );

  useEffect(() => {
    localStorage.setItem(`render-poc-workUrl-${blockId}`, workUrl);
  }, [workUrl, blockId]);

  useEffect(() => {
    localStorage.setItem(`render-poc-jwt-${blockId}`, jwt);
  }, [jwt, blockId]);

  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [visualItems, setVisualItems] = useState<VisualDataResponse['items']>(
    [],
  );
  const [selectedId, setSelectedId] = useState<string>('');

  const [renderState, setRenderState] = useState<RenderState>('idle');
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderedBlob, setRenderedBlob] = useState<Blob | null>(null);
  const [renderError, setRenderError] = useState('');
  const [debugIsMainPlayer, setDebugIsMainPlayer] = useState(true);
  const [sharedAudioTags, setSharedAudioTags] = useState(20);

  const resetRenderState = useCallback(() => {
    renderAbortControllerRef.current?.abort();
    renderAbortControllerRef.current = null;
    setRenderState('idle');
    setRenderProgress(0);
    setRenderedBlob(null);
    setRenderError('');
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      renderAbortControllerRef.current?.abort();
      renderAbortControllerRef.current = null;
    };
  }, []);

  const handleFetch = async () => {
    if (!workUrl || !jwt) return;

    const requestId = fetchRequestIdRef.current + 1;
    fetchRequestIdRef.current = requestId;

    setIsLoading(true);
    setFetchError('');

    try {
      const data = await fetchVisualData(workUrl, jwt);

      if (!isMountedRef.current || fetchRequestIdRef.current !== requestId) {
        return;
      }

      setVisualItems(data.items || []);

      const nextSelectedId = data.items?.[0]?.visual_data_id ?? '';
      setSelectedId(nextSelectedId);
    } catch (err) {
      if (!isMountedRef.current || fetchRequestIdRef.current !== requestId) {
        return;
      }

      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      if (isMountedRef.current && fetchRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  const selectedItem = visualItems.find(
    (item) => item.visual_data_id === selectedId,
  );
  const visualJson = useMemo(() => {
    return (selectedItem?.visual_json as VisualData | null) ?? null;
  }, [selectedItem]);

  const visualIsRenderable = Boolean(
    visualJson &&
    visualJson.fps &&
    visualJson.durationInFrames &&
    visualJson.dimensions?.width &&
    visualJson.dimensions?.height &&
    Array.isArray(visualJson.scenes),
  );

  useEffect(() => {
    resetRenderState();
  }, [resetRenderState, selectedId]);

  const handleRender = async () => {
    if (!visualJson || !visualIsRenderable) return;

    const support = await detectWebCodecsSupport();
    if (!support.supported) {
      setRenderState('error');
      setRenderError(support.details);
      return;
    }

    renderAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    renderAbortControllerRef.current = abortController;

    setRenderState('rendering');
    setRenderProgress(0);
    setRenderError('');

    try {
      const { blob } = await renderVideo({
        component: CompositionWrapper as React.ComponentType<
          Record<string, unknown>
        >,
        props: {
          scenes: visualJson.scenes,
          dimensions: visualJson.dimensions,
          visualId: `render-visual-${selectedId}`,
          audio: visualJson.audio,
          multiAudio: visualJson.multiAudio,
          scale: 1,
          isMainPlayer: true,
          isMainSequence: true,
          isAnimationEnabled: true,
          hasInteractive: false,
          activeLayerIds: [],
          isDisableTextBox: true,
        },
        durationInFrames: visualJson.durationInFrames,
        fps: visualJson.fps,
        width: visualJson.dimensions.width,
        height: visualJson.dimensions.height,
        onProgress: (progress) => {
          if (!isMountedRef.current || abortController.signal.aborted) {
            return;
          }

          setRenderProgress(progress.percentage);
        },
        signal: abortController.signal,
      });

      if (!isMountedRef.current || abortController.signal.aborted) {
        return;
      }

      setRenderedBlob(blob);
      setRenderState('done');
    } catch (err) {
      if (!isMountedRef.current || abortController.signal.aborted) {
        return;
      }

      setRenderState('error');
      setRenderError(err instanceof Error ? err.message : String(err));
    } finally {
      if (renderAbortControllerRef.current === abortController) {
        renderAbortControllerRef.current = null;
      }
    }
  };

  const handleDownload = () => {
    if (!renderedBlob) return;
    const url = URL.createObjectURL(renderedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `render-${Date.now()}.mp4`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border border-slate-700 rounded-xl p-6 bg-slate-800/30 flex flex-col gap-6">
      {/* URL and JWT Inputs */}
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">
            Work URL
          </label>
          <input
            type="text"
            value={workUrl}
            onChange={(e) => setWorkUrl(e.target.value)}
            className="w-full !bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 !text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            placeholder="https://.../work/creative?workId=..."
            style={{ color: '#ffffff', backgroundColor: '#0f172a' }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">
            JWT Token
          </label>
          <div className="flex gap-4">
            <input
              type="text"
              value={jwt}
              onChange={(e) => setJwt(e.target.value)}
              className="flex-1 !bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 !text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
              style={{ color: '#ffffff', backgroundColor: '#0f172a' }}
            />
            <button
              onClick={handleFetch}
              disabled={isLoading || !workUrl || !jwt}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium px-6 py-2 rounded-lg transition"
            >
              {isLoading ? 'Fetching...' : 'Fetch Visuals'}
            </button>
          </div>
          {fetchError && (
            <p className="text-red-400 text-sm mt-2">{fetchError}</p>
          )}
        </div>
      </div>

      {/* Dropdown Selector */}
      {visualItems.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">
            Select Visual Item
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            {visualItems.map((item) => {
              const dim = (item.visual_json as Partial<VisualData> | null)
                ?.dimensions;
              const dimStr = dim ? `${dim.width}x${dim.height}` : 'Unknown';
              return (
                <option key={item.visual_data_id} value={item.visual_data_id}>
                  {dimStr} (ID: {item.visual_data_id.substring(0, 8)}...)
                </option>
              );
            })}
          </select>
          {!visualIsRenderable && visualJson && (
            <p className="mt-2 text-sm text-red-400">
              Selected visual is missing required composition fields. Preview
              and render are disabled.
            </p>
          )}
        </div>
      )}

      <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
        <p className="mb-3 text-sm font-medium text-slate-300">Preview debug</p>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            Main player path
            <select
              value={debugIsMainPlayer ? 'true' : 'false'}
              onChange={(e) => setDebugIsMainPlayer(e.target.value === 'true')}
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="true">isMainPlayer = true</option>
              <option value="false">isMainPlayer = false</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            Shared audio tags
            <select
              value={String(sharedAudioTags)}
              onChange={(e) => setSharedAudioTags(Number(e.target.value))}
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="20">20 (editor parity)</option>
              <option value="5">5 (Player default)</option>
            </select>
          </label>
        </div>
      </div>

      {/* Main Preview & Render Panels */}
      <div className="grid grid-cols-2 gap-8">
        <div className="flex flex-col h-full">
          <ErrorBoundary>
            <AdPlayerPreview
              visualData={visualIsRenderable ? visualJson : null}
              visualId={selectedId || 'preview-visual'}
              isMainPlayer={debugIsMainPlayer}
              sharedAudioTags={sharedAudioTags}
              forcePause={renderState === 'rendering'}
            />
          </ErrorBoundary>
        </div>
        <div className="flex flex-col h-full">
          <VideoPlayback
            renderState={renderState}
            progress={renderProgress}
            renderedBlob={renderedBlob}
            errorMessage={renderError}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mt-2">
        <button
          onClick={handleRender}
          disabled={!visualIsRenderable || renderState === 'rendering'}
          className="bg-blue-300 hover:bg-blue-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-medium px-12 py-3 rounded border border-slate-900 shadow-sm transition min-w-[140px]"
        >
          {renderState === 'rendering' ? 'Rendering...' : 'Render'}
        </button>
        <button
          onClick={resetRenderState}
          className="bg-yellow-200 hover:bg-yellow-300 text-slate-900 font-medium px-12 py-3 rounded border border-slate-900 shadow-sm transition min-w-[140px]"
        >
          Reset
        </button>
        <button
          onClick={handleDownload}
          disabled={renderState !== 'done' || !renderedBlob}
          className="bg-green-300 hover:bg-green-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-medium px-12 py-3 rounded border border-slate-900 shadow-sm transition min-w-[140px]"
        >
          Download
        </button>
      </div>
    </div>
  );
};
