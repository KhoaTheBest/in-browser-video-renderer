import { lazy, Suspense } from 'react';
import { Text } from '@astryxdesign/core/Text';

const routes: Record<string, React.LazyExoticComponent<() => React.JSX.Element>> = {
  '/': lazy(() => import('./pages/Landing')),
  '/studio': lazy(() => import('./pages/Studio')),
  '/pricing': lazy(() => import('./pages/Pricing')),
  '/terms': lazy(() => import('./pages/Legal').then((m) => ({ default: m.Terms }))),
  '/privacy': lazy(() => import('./pages/Legal').then((m) => ({ default: m.Privacy }))),
};

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const Page = routes[path] ?? routes['/'];
  return (
    <Suspense fallback={<Text type="body" color="secondary">Loading…</Text>}>
      <Page />
    </Suspense>
  );
}
