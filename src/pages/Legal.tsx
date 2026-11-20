import type { ReactNode } from 'react';
import { VStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { SiteShell } from '../layout/SiteShell';
import { SUPPORT_EMAIL } from '../config/pricing';

const NAME = import.meta.env.VITE_LEGAL_NAME || '[Your legal name]';
const reviewed = import.meta.env.VITE_LEGAL_REVIEWED === 'true';

function Doc({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SiteShell>
      <VStack gap={4}>
        {!reviewed && (
          <Banner status="warning" title="Draft legal text" description="Replace the placeholders and have this reviewed by a lawyer, then set VITE_LEGAL_REVIEWED=true to hide this notice." />
        )}
        <Heading level={1}>{title}</Heading>
        {children}
      </VStack>
    </SiteShell>
  );
}
const H = ({ children }: { children: ReactNode }) => <Heading level={2}>{children}</Heading>;
const P = ({ children }: { children: ReactNode }) => <Text type="body" color="secondary">{children}</Text>;
const contact = SUPPORT_EMAIL || '[support email]';

export function Terms() {
  return (
    <Doc title="Terms of Service">
      <P>Last updated: [date]. These terms govern your use of Render in Browser, operated by {NAME} ("we").</P>
      <H>The service</H>
      <P>Render in Browser is a tool that composes and exports video on your own device. You are responsible for the media, text and templates you use and must have the rights to them.</P>
      <H>Plans and payment</H>
      <P>Free use is subject to the limits shown on the pricing page. Paid plans are sold through our payment provider, Lemon Squeezy, which acts as the merchant of record and handles payment, tax and invoicing. Subscriptions renew until cancelled; cancel any time from the provider's customer portal.</P>
      <H>Refunds</H>
      <P>[Describe your refund policy, for example a 14-day money-back guarantee.] Contact {contact}.</P>
      <H>Acceptable use</H>
      <P>Do not use the service to create unlawful, infringing or deceptive content, or to circumvent plan limits.</P>
      <H>Warranty and liability</H>
      <P>The service is provided "as is". Because rendering runs in your browser, results depend on your device and browser. To the extent permitted by law we are not liable for indirect or consequential loss.</P>
      <H>Changes and contact</H>
      <P>We may update these terms and will post the new date here. Questions: {contact}.</P>
    </Doc>
  );
}

export function Privacy() {
  return (
    <Doc title="Privacy Policy">
      <P>Last updated: [date]. Controller: {NAME}. Contact: {contact}.</P>
      <H>What stays on your device</H>
      <P>Your media, projects and exported videos are processed in your browser and are not uploaded to us.</P>
      <H>What we store in your browser</H>
      <P>We use local storage for functional purposes only: your project list, selected template, daily free-export count and (if you have Pro) your license key. We do not use advertising or tracking cookies.</P>
      <H>What we process on our servers</H>
      <P>When you activate or re-validate a license key, the key is sent to our Cloudflare-hosted function and to Lemon Squeezy to check that it is valid. Cloudflare may process standard request data such as IP address for security and delivery.</P>
      <H>Fonts</H>
      <P>The site's typeface is loaded from Google Fonts, which receives your IP address when the page loads. [Replace with self-hosted fonts to avoid this.]</P>
      <H>Analytics</H>
      <P>If enabled, we use Cloudflare Web Analytics, which is cookieless and does not track individuals across sites.</P>
      <H>Payments</H>
      <P>Purchases are handled by Lemon Squeezy as merchant of record; we do not receive your card details. See their privacy policy.</P>
      <H>Your rights</H>
      <P>Depending on where you live you may have rights to access, correct or delete personal data. Contact {contact}.</P>
    </Doc>
  );
}
