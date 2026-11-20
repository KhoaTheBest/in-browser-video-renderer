import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Section } from '@astryxdesign/core/Section';
import { Collapsible, CollapsibleGroup } from '@astryxdesign/core/Collapsible';
import { SiteShell } from '../layout/SiteShell';

const FEATURES = [
  { title: 'Private by design', body: 'Rendering happens on your device with WebCodecs. Your media and finished videos are never uploaded.' },
  { title: 'No render queue', body: 'No servers to wait on. Export starts the moment you click, and scales with your own hardware.' },
  { title: 'Real MP4 files', body: 'Hardware-accelerated encoding with sound, ready for social, ads or email.' },
];

const FAQ = [
  { q: 'Does my video leave my computer?', a: 'No. Scenes are drawn and encoded in your browser. Only a license key check (if you have one) contacts a server.' },
  { q: 'Which browsers work?', a: 'Recent desktop Chrome, Edge and Safari. Firefox support depends on its WebCodecs encoder. The Studio warns you if your browser cannot export.' },
  { q: 'What does Pro add?', a: 'Up to 1080p and 3-minute exports, no watermark and unlimited exports per day.' },
  { q: 'Can I bring my own template?', a: 'Yes. In Studio, open "Import your own visual" and load JSON from a file, pasted text or a URL.' },
];

export default function Landing() {
  return (
    <SiteShell>
      <VStack gap={10}>
        <VStack gap={5} hAlign="center">
          <Heading level={1} type="display-2" justify="center" textWrap="balance">
            Make videos in your browser. Skip the render farm.
          </Heading>
          <Text type="large" color="secondary" justify="center" textWrap="balance">
            Compose scenes, preview instantly and export MP4 on your own device. Private, fast and free to start.
          </Text>
          <HStack gap={3}>
            <Button label="Open the Studio" variant="primary" size="lg" href="/studio" />
            <Button label="See pricing" variant="secondary" size="lg" href="/pricing" />
          </HStack>
        </VStack>

        <Grid columns={{ minWidth: 260 }} gap={4}>
          {FEATURES.map((f) => (
            <Section key={f.title} variant="section" padding={5}>
              <VStack gap={2}>
                <Heading level={3}>{f.title}</Heading>
                <Text type="body" color="secondary">{f.body}</Text>
              </VStack>
            </Section>
          ))}
        </Grid>

        <VStack gap={3}>
          <Heading level={2}>Questions</Heading>
          <CollapsibleGroup type="multiple" hasDividers>
            {FAQ.map((f) => (
              <Collapsible key={f.q} value={f.q} defaultIsOpen={false} trigger={<Text type="large">{f.q}</Text>}>
                <Text type="body" color="secondary">{f.a}</Text>
              </Collapsible>
            ))}
          </CollapsibleGroup>
        </VStack>
      </VStack>
    </SiteShell>
  );
}
