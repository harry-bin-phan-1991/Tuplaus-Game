import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';

const queryClient = new QueryClient();

// This file is now only for local development
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Theme>
        <App playerId="e2e-create-or-load" apiUrl="http://localhost:4000/graphql" />
      </Theme>
    </QueryClientProvider>
  </React.StrictMode>,
);
