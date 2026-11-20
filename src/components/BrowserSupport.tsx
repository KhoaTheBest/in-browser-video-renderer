import { useEffect, useState } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { detectWebCodecsSupport, type WebCodecsSupport } from '../lib/detectWebCodecs';

/** Shows nothing while support is fine; warns when exports cannot work. */
export function BrowserSupport() {
  const [support, setSupport] = useState<WebCodecsSupport | null>(null);
  useEffect(() => {
    void detectWebCodecsSupport().then(setSupport);
  }, []);
  if (!support || support.supported) return null;
  return (
    <Banner
      status="warning"
      title="Exporting is not available in this browser"
      description={`${support.details} Use a recent Chrome, Edge or Safari on desktop. You can still preview.`}
    />
  );
}
