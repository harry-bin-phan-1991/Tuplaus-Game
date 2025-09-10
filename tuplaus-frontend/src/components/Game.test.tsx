/// <reference types="vitest" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Game } from './Game';
import { useGameStore } from '../store/gameStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { graphqlRequest } from '../lib/api';
import React from 'react';

// Mock the API module
vi.mock('../lib/api');
const mockedGraphqlRequest = vi.mocked(graphqlRequest);

// Reset Zustand store before each test
beforeEach(() => {
  mockedGraphqlRequest.mockClear();
  useGameStore.setState({ balance: 0, winnings: 0, lastCard: null, lastWin: null });
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries for tests
    },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('Game Component', () => {
  it('renders loading state then player data', async () => {
    
    mockedGraphqlRequest.mockResolvedValue({ player: { id: 'test-player', balance: 500, activeWinnings: 0 } });
    
    renderWithProviders(<Game />);
    
    expect(screen.getByText('Loading Game...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Balance:/i)).toHaveTextContent('$500.00');
    });
  });

  it('displays winnings from the store', async () => {
    mockedGraphqlRequest.mockResolvedValue({ player: { id: 'test-player', balance: 500, activeWinnings: 0 } });

    useGameStore.setState({
      winnings: 75,
    });
    
    renderWithProviders(<Game />);

    await waitFor(() => {
      expect(screen.getByText(/Current Winnings:/i)).toHaveTextContent('$75.00');
    });
  });
});
