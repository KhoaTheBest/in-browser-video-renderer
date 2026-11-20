import { useEffect, useState } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { BrowserSupport } from './components/BrowserSupport';
import { ProjectBlock } from './components/ProjectBlock';

const KEY = 'render-blocks';

export default function App() {
  const [blocks, setBlocks] = useState<number[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch { /* ignore */ }
    return [Date.now()];
  });
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(blocks)); } catch { /* ignore */ }
  }, [blocks]);

  return (
    <AppShell topNav={<TopNav heading={<Heading level={1}>Render in Browser</Heading>} />} contentPadding={6}>
      <VStack gap={6}>
        <Text type="body" color="secondary">Compose a scene, preview it, and export an MP4 without uploading anything.</Text>
        <BrowserSupport />
        {blocks.map((id) => <ProjectBlock key={id} blockId={String(id)} />)}
        <Button label="Add another project" variant="secondary" onClick={() => setBlocks([...blocks, Date.now()])} />
      </VStack>
    </AppShell>
  );
}
