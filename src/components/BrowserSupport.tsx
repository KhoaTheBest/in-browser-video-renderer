import React, { useEffect, useState } from 'react';
import { detectWebCodecsSupport, type WebCodecsSupport } from '../lib/detectWebCodecs';

export const BrowserSupport: React.FC = () => {
  const [support, setSupport] = useState<WebCodecsSupport | null>(null);

  useEffect(() => {
    detectWebCodecsSupport().then(setSupport);
  }, []);

  if (!support) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-slate-400">
        Checking WebCodecs support...
      </div>
    );
  }

  if (support.supported) {
    return (
      <div className="rounded-lg border border-emerald-700/50 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-400">
        WebCodecs ready — {support.details}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-700/50 bg-amber-950/50 px-4 py-3 text-sm text-amber-400">
      WebCodecs not available — {support.details}. Use Chrome 94+ for rendering.
    </div>
  );
};
