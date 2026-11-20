import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Grid } from '@astryxdesign/core/Grid';
import { Section } from '@astryxdesign/core/Section';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Selector } from '@astryxdesign/core/Selector';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Banner } from '@astryxdesign/core/Banner';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { FileInput } from '@astryxdesign/core/FileInput';
import { templates } from '../data/templates';
import { fetchVisualData, parseVisualJson, type ImportedVisual } from '../lib/fetchVisualData';
import { detectWebCodecsSupport } from '../lib/detectWebCodecs';
import { exportVideo } from '../engine/exportVideo';
import { ExportPanel, type ExportState } from './ExportPanel';
import { ErrorBoundary } from './ErrorBoundary';
import { PreviewPanel } from './PreviewPanel';

const storageKey = (id: string, k: string) => `render-block-${id}-${k}`;
const read = (key: string, fallback: string) => {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
};

export function ProjectBlock({ blockId }: { blockId: string }) {
  const [imported, setImported] = useState<ImportedVisual[]>([]);
  const [selectedId, setSelectedId] = useState(() => read(storageKey(blockId, 'source'), templates[0].id));
  const [importError, setImportError] = useState('');
  const [importUrl, setImportUrl] = useState(() => read(storageKey(blockId, 'url'), ''));
  const [token, setToken] = useState(''); // never persisted
  const [pasted, setPasted] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const [state, setState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [exportError, setExportError] = useState('');
  const [durationMs, setDurationMs] = useState<number>();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(blockId, 'source'), selectedId);
      localStorage.setItem(storageKey(blockId, 'url'), importUrl);
    } catch { /* storage unavailable */ }
  }, [blockId, selectedId, importUrl]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const options = useMemo(
    () => [
      { type: 'section' as const, title: 'Templates', options: templates.map((t) => ({ value: t.id, label: t.name, description: t.description })) },
      ...(imported.length
        ? [{ type: 'section' as const, title: 'Imported', options: imported.map((i) => ({ value: i.id, label: i.label })) }]
        : []),
    ],
    [imported],
  );
  const visual = useMemo(
    () => templates.find((t) => t.id === selectedId)?.visual ?? imported.find((i) => i.id === selectedId)?.visual ?? null,
    [selectedId, imported],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState('idle'); setProgress(0); setBlob(null); setExportError(''); setDurationMs(undefined);
  }, []);
  useEffect(reset, [reset, selectedId]);

  const accept = (items: ImportedVisual[]) => {
    setImported(items);
    setSelectedId(items[0].id);
    setImportError('');
  };
  const run = async (fn: () => Promise<ImportedVisual[]> | ImportedVisual[]) => {
    setBusy(true);
    try { accept(await fn()); } catch (e) { setImportError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };

  const handleExport = async () => {
    if (!visual) return;
    const support = await detectWebCodecsSupport();
    if (!support.supported) { setState('error'); setExportError(support.details); return; }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setState('rendering'); setProgress(0); setExportError('');
    try {
      const res = await exportVideo({ visual, signal: ac.signal, onProgress: (p) => !ac.signal.aborted && setProgress(p.percentage) });
      if (ac.signal.aborted) return;
      setBlob(res.blob); setDurationMs(res.durationMs); setState('done');
    } catch (err) {
      if (ac.signal.aborted) return;
      setState('error'); setExportError(err instanceof Error ? err.message : String(err));
    }
  };

  const download = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `video-${Date.now()}.mp4`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Section variant="section" padding={5}>
      <VStack gap={5}>
        <Selector label="Template" options={options} value={selectedId} onChange={setSelectedId} />

        <Grid columns={{ minWidth: 320 }} gap={6}>
          <VStack gap={2}>
            <Heading level={3}>Preview</Heading>
            <ErrorBoundary>
              <PreviewPanel visual={visual} paused={state === 'rendering'} />
            </ErrorBoundary>
          </VStack>
          <VStack gap={2}>
            <Heading level={3}>Export</Heading>
            <ExportPanel state={state} progress={progress} blob={blob} error={exportError} durationMs={durationMs} />
          </VStack>
        </Grid>

        <HStack gap={3}>
          {state === 'rendering' ? (
            <Button label="Cancel" variant="secondary" onClick={reset} />
          ) : (
            <Button label="Export MP4" variant="primary" isDisabled={!visual} onClick={() => void handleExport()} />
          )}
          <Button label="Reset" variant="ghost" onClick={reset} />
          <Button label="Download" variant="secondary" isDisabled={state !== 'done' || !blob} onClick={download} />
        </HStack>

        <Collapsible trigger={<Text type="body">Import your own visual (advanced)</Text>} defaultIsOpen={false}>
          <VStack gap={4}>
            <Text type="supporting" color="secondary">
              A visual is JSON with fps, durationInFrames, dimensions and scenes. Everything stays in your browser.
            </Text>
            {importError && <Banner status="error" title="Import failed" description={importError} />}
            <FileInput label="Upload a .json file" accept=".json,application/json" value={file}
              onChange={(f) => {
                const next = Array.isArray(f) ? f[0] ?? null : f;
                setFile(next);
                if (next) void run(async () => parseVisualJson(await next.text()));
              }} />
            <TextArea label="Or paste JSON" value={pasted} onChange={setPasted} rows={4} />
            <Button label="Load pasted JSON" variant="secondary" isDisabled={!pasted.trim() || busy}
              onClick={() => void run(() => parseVisualJson(pasted))} />
            <TextInput label="Or fetch from a URL" description="The host must allow cross-origin (CORS) requests." type="url"
              value={importUrl} onChange={setImportUrl} />
            <TextInput label="Bearer token (optional, never stored)" type="password" value={token} onChange={setToken} />
            <Button label={busy ? 'Fetching…' : 'Fetch'} variant="secondary" isDisabled={!importUrl || busy}
              onClick={() => void run(() => fetchVisualData(importUrl, token || undefined))} />
          </VStack>
        </Collapsible>
      </VStack>
    </Section>
  );
}
