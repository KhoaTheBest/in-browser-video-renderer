import { useEffect, useState } from 'react';
import { VStack } from '@astryxdesign/core/Layout';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Banner } from '@astryxdesign/core/Banner';
import { Text } from '@astryxdesign/core/Text';

export type ExportState = 'idle' | 'rendering' | 'done' | 'error';

export function ExportPanel({
  state, progress, blob, error, durationMs,
}: { state: ExportState; progress: number; blob: Blob | null; error: string; durationMs?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (blob && state === 'done') {
      const u = URL.createObjectURL(blob);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    setUrl(null);
  }, [blob, state]);

  return (
    <VStack gap={3}>
      {state === 'idle' && <Text type="body" color="secondary">Your exported MP4 appears here. Nothing is uploaded.</Text>}
      {state === 'rendering' && (
        <ProgressBar label="Exporting MP4" value={Math.round(progress * 100)} hasValueLabel />
      )}
      {state === 'error' && <Banner status="error" title="Export failed" description={error} />}
      {state === 'done' && url && (
        <VStack gap={2}>
          <video src={url} controls loop style={{ width: '100%', maxHeight: 520 }} />
          <Text type="supporting" color="secondary">
            {blob ? `${(blob.size / 1_048_576).toFixed(1)} MB` : ''}
            {durationMs ? ` · exported in ${(durationMs / 1000).toFixed(1)} s` : ''}
          </Text>
        </VStack>
      )}
    </VStack>
  );
}
