// FIRST, deliberately: keep the existing no-flash favicon behavior while the
// entry point changes framework.
import './dev-favicon';
import './styles/tokens.css';
import 'katex/dist/katex.min.css';
import { createRoot } from 'react-dom/client';
import { App } from './react/App';

// The prerender is a crawler snapshot, not hydratable application markup.
document.getElementById('prerender')?.remove();

const target = document.getElementById('app');
if (!target) throw new Error('Stabileo root element #app was not found');

// StrictMode intentionally stays off while the Svelte compatibility seam is
// present: development-only effect replay would mount the legacy WebGL tree
// twice and distort lifecycle/performance checks. It can be enabled once all
// route branches are native React.
createRoot(target).render(<App />);

// Preserve the production-safe, build-time-gated browser test contract.
if (import.meta.env.VITE_E2E === '1') {
  void import('./lib/utils/e2e-hooks').then((m) => m.installE2EHooks());
}
