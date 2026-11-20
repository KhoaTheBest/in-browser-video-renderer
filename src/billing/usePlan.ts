import { useEffect, useState } from 'react';
import { planFor, readLicense, revalidateLicense } from './license';
import type { PlanLimits } from './plans';

export function usePlan(): PlanLimits {
  const [plan, setPlan] = useState(() => planFor(readLicense()));
  useEffect(() => {
    const sync = () => setPlan(planFor(readLicense()));
    window.addEventListener('license-changed', sync);
    void revalidateLicense().then(sync);
    return () => window.removeEventListener('license-changed', sync);
  }, []);
  return plan;
}
