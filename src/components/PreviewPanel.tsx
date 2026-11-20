import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Button } from '@astryxdesign/core/Button';
import { Slider } from '@astryxdesign/core/Slider';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { Section } from '@astryxdesign/core/Section';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import type { VisualData } from '../types/visual';
import { usePreviewPlayer } from '../engine/usePreviewPlayer';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function PreviewPanel({ visual, paused }: { visual: VisualData | null; paused: boolean }) {
  const p = usePreviewPlayer(visual, paused);
  if (!visual) {
    return <Text type="body" color="secondary">Choose a template or import a visual to see a preview.</Text>;
  }
  const { width, height } = visual.dimensions;
  const total = visual.durationInFrames;
  return (
    <VStack gap={3}>
      {p.error && <Banner status="error" title="Preview failed" description={p.error} />}
      <Section variant="transparent" padding={0} maxWidth={Math.round((520 * width) / Math.max(width, height))}>
      <AspectRatio ratio={width / height}>
        <canvas
          ref={p.canvasRef}
          width={width}
          height={height}
          role="img"
          aria-label="Video preview"
          style={{ width: '100%', height: '100%', display: 'block', background: '#000' }}
        />
      </AspectRatio>
      </Section>
      {p.loading && <ProgressBar label="Loading media" isIndeterminate />}
      <HStack gap={3} vAlign="center">
        <Button
          label={p.playing ? 'Pause' : 'Play'}
          variant="secondary"
          isDisabled={p.loading || paused || Boolean(p.error)}
          onClick={p.playing ? p.pause : p.play}
        />
        <Text type="supporting" color="secondary">
          {fmt(p.frame / visual.fps)} / {fmt(total / visual.fps)}
        </Text>
      </HStack>
      <Slider
        label="Seek"
        isLabelHidden
        min={0}
        max={Math.max(0, total - 1)}
        step={1}
        value={p.frame}
        onChange={(v: number) => p.seek(v)}
      />
    </VStack>
  );
}
