import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';

import '../index.css';

const queryClient = new QueryClient();

// Default allowlist if no attribute is provided
const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:8080'];

class TuplausWidget extends HTMLElement {
  private root: ReactDOM.Root | null = null;

  connectedCallback() {
    this.mount();
  }

  disconnectedCallback() {
    this.unmount();
  }

  private isOriginAllowed(): boolean {
    const attr = this.getAttribute('allow-origins');
    const list = (attr
      ? attr.split(',').map(s => s.trim())
      : DEFAULT_ALLOWED_ORIGINS
    ).filter(Boolean);

    if (list.length === 0) return true; // if explicitly empty, allow all

    const normalize = (s: string) => s.replace(/\/$/, '');
    const current = normalize(window.location.origin);
    const allowed = list.map(normalize);
    return allowed.includes(current);
  }

  private mount() {
    // Ensure host sizing
    this.style.display = this.style.display || 'block';

    // Guard: origin allowlist
    if (!this.isOriginAllowed()) {
      this.innerHTML = '<div style="padding:12px;border:1px solid #fca5a5;border-radius:10px;background:#fef2f2;color:#7f1d1d;font-family:system-ui">This widget is not allowed on this origin.</div>';
      return;
    }

    // Create (or reuse) a mount container inside light DOM
    let mount = this.querySelector<HTMLDivElement>('#tuplaus-root');
    if (!mount) {
      mount = document.createElement('div');
      mount.id = 'tuplaus-root';
      mount.className = 'tuplaus-mount';
      this.appendChild(mount);
    }

    // Render React app into the mount container
    this.root = ReactDOM.createRoot(mount);
    const playerId = this.getAttribute('player-id') || '';
    const apiUrl = this.getAttribute('api-url') || '';

    this.root.render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <Theme>
            <App playerId={playerId} apiUrl={apiUrl} />
          </Theme>
        </QueryClientProvider>
      </React.StrictMode>
    );
  }

  private unmount() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}

customElements.define('tuplaus-widget', TuplausWidget);
