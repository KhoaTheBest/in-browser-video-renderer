import type { ReactNode } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { usePlan } from '../billing/usePlan';
import { SUPPORT_EMAIL } from '../config/pricing';

export function SiteShell({ children, padding = 6 }: { children: ReactNode; padding?: 4 | 6 | 8 }) {
  const plan = usePlan();
  return (
    <AppShell
      contentPadding={padding}
      topNav={
        <TopNav
          heading={<Link href="/" isStandalone><Heading level={1}>Render in Browser</Heading></Link>}
          startContent={
            <HStack gap={4}>
              <Link href="/studio" isStandalone>Studio</Link>
              <Link href="/pricing" isStandalone>Pricing</Link>
            </HStack>
          }
          endContent={
            plan.id === 'pro'
              ? <Badge label="Pro" variant="green" />
              : <Button label="Get Pro" variant="primary" size="sm" href="/pricing" />
          }
        />
      }>
      <VStack gap={8}>
        {children}
        <VStack gap={2} hAlign="center" as="footer">
          <HStack gap={4}>
            <Link href="/terms" isStandalone>Terms</Link>
            <Link href="/privacy" isStandalone>Privacy</Link>
            {SUPPORT_EMAIL && <Link href={`mailto:${SUPPORT_EMAIL}`} isStandalone>Support</Link>}
          </HStack>
          <Text type="supporting" color="secondary">Videos are rendered on your device. Nothing is uploaded.</Text>
        </VStack>
      </VStack>
    </AppShell>
  );
}
