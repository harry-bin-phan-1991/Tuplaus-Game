import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';

import '../index.css';

const queryClient = new QueryClient();

class TuplausWidget extends HTMLElement {
  private root: ReactDOM.Root | null = null;

  connectedCallback() {
    this.mount();
  }

  disconnectedCallback() {
    this.unmount();
  }

  private mount() {
    // Ensure host styles so element sizes naturally
    this.style.display = this.style.display || 'block';

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
