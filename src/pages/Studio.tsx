import { useEffect, useState } from 'react';
import { VStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { SiteShell } from '../layout/SiteShell';
import { BrowserSupport } from '../components/BrowserSupport';
import { ProjectBlock } from '../components/ProjectBlock';
import { usePlan } from '../billing/usePlan';
import { exportsToday } from '../billing/usage';

const KEY = 'render-blocks';

export default function Studio() {
  const plan = usePlan();
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

  const used = exportsToday();
  return (
    <SiteShell>
      <VStack gap={6}>
        <VStack gap={1}>
          <Heading level={2}>Studio</Heading>
          <Text type="body" color="secondary">
            {plan.id === 'pro'
              ? 'Pro: up to 1080p, 3 minutes, no watermark.'
              : `Free: up to 720p, ${plan.maxSeconds} s, watermark. ${Math.max(0, plan.dailyExports - used)} of ${plan.dailyExports} exports left today.`}
          </Text>
        </VStack>
        <BrowserSupport />
        {blocks.map((id) => <ProjectBlock key={id} blockId={String(id)} />)}
        <Button label="Add another project" variant="secondary" onClick={() => setBlocks([...blocks, Date.now()])} />
      </VStack>
    </SiteShell>
  );
}
