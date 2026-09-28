import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary, initSentry } from 'q-wash-shared';
import './index.css';
import { App } from './App';

// Production only — never sends from local dev, even if VITE_SENTRY_DSN
// leaks into a dev .env by mistake.
if (import.meta.env.PROD) {
  initSentry({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: 'production' });
}

// This screen runs unattended (see q-wash-shared's authStore restore()
// comment) — nobody is there to click "reload" on Sentry's default
// fallback UI, so a render error reloads the page itself after a short
// delay instead of sitting on a dead screen indefinitely.
function UnattendedReloadFallback() {
  useEffect(() => {
    const timer = setTimeout(() => window.location.reload(), 10_000);
    return () => clearTimeout(timer);
  }, []);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={<UnattendedReloadFallback />}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
