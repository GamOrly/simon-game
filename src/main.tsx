import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/heebo/400.css';
import '@fontsource/heebo/600.css';
import '@fontsource/heebo/700.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/components.css';
import './styles/board.css';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';

// A new version installs in the background and waits until all app windows close,
// so an active game is never reloaded (ADR-6)
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
