import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles.css';

// Dev only: `?preview` shows every phone screen with fake data (see dev/Preview.tsx).
// The import is behind import.meta.env.DEV so it never reaches the production bundle.
const previewId = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('preview')
  : null;
const Preview =
  previewId === null
    ? null
    : lazy(() => import('./dev/Preview').then((m) => ({ default: m.Preview })));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {Preview ? (
      <Suspense fallback={null}>
        <Preview id={previewId ?? ''} />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
