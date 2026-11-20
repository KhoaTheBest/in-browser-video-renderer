import { useState } from 'react';
import { VStack } from '@astryxdesign/core/Layout';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Section } from '@astryxdesign/core/Section';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Banner } from '@astryxdesign/core/Banner';
import { SiteShell } from '../layout/SiteShell';
import { TIERS } from '../config/pricing';
import { PLANS } from '../billing/plans';
import { activateLicense, clearLicense } from '../billing/license';
import { usePlan } from '../billing/usePlan';


export default function Pricing() {
  const plan = usePlan();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ status: 'error' | 'success'; text: string } | null>(null);

  const activate = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await activateLicense(key);
      setMsg(r.ok ? { status: 'success', text: 'Pro is active on this browser.' } : { status: 'error', text: r.error });
      if (r.ok) setKey('');
    } catch (e) {
      setMsg({ status: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteShell>
      <VStack gap={8}>
        <VStack gap={2} hAlign="center">
          <Heading level={1} type="display-3">Pricing</Heading>
          <Text type="large" color="secondary">Free to start. Pro removes the limits.</Text>
        </VStack>

        <Grid columns={{ minWidth: 260 }} gap={4}>
          <Section variant="section" padding={5}>
            <VStack gap={3}>
              <Heading level={2}>Free</Heading>
              <Text type="display-1">$0</Text>
              <Text type="body" color="secondary">
                Up to {PLANS.free.maxLongSide === 1280 ? '720p' : `${PLANS.free.maxLongSide}px`}, {PLANS.free.maxSeconds} seconds,
                {' '}{PLANS.free.dailyExports} exports per day, small watermark.
              </Text>
              <Button label="Open the Studio" variant="secondary" href="/studio" />
            </VStack>
          </Section>
          {TIERS.map((t) => (
            <Section key={t.id} variant="section" padding={5}>
              <VStack gap={3}>
                <Heading level={2}>{t.name}</Heading>
                <Text type="display-1">{t.price} <Text type="supporting" color="secondary">{t.cadence}</Text></Text>
                <Text type="body" color="secondary">1080p, up to 3 minutes, no watermark, unlimited exports.</Text>
                <Button
                  label={t.checkoutUrl ? 'Get Pro' : 'Coming soon'}
                  variant="primary"
                  href={t.checkoutUrl}
                  isDisabled={!t.checkoutUrl}
                />
              </VStack>
            </Section>
          ))}
        </Grid>

        <Section variant="section" padding={5}>
          <VStack gap={3}>
            <Heading level={2}>Already bought Pro?</Heading>
            <Text type="body" color="secondary">Paste the license key from your purchase email. It unlocks Pro on this browser.</Text>
            {msg && <Banner status={msg.status} title={msg.text} />}
            {plan.id === 'pro' ? (
              <Button label="Remove license from this browser" variant="secondary" onClick={clearLicense} />
            ) : (
              <>
                <TextInput label="License key" value={key} onChange={setKey} />
                <Button label={busy ? 'Checking…' : 'Activate'} variant="primary" isDisabled={!key.trim() || busy} onClick={() => void activate()} />
              </>
            )}
          </VStack>
        </Section>
      </VStack>
    </SiteShell>
  );
}
