/// <reference types="vitest" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Game } from './Game';
import { useGameStore } from '../store/gameStore';
import { graphqlRequest, GET_OR_CREATE_PLAYER_MUTATION } from '../lib/api';

// --- Mocks Setup ---
vi.mock('../lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../lib/api')>()
  return {
    ...mod,
    graphqlRequest: vi.fn(),
  }
});
const mockedGraphqlRequest = vi.mocked(graphqlRequest);

vi.mock('./Logo', () => ({
  LogoWithCircle: () => <div data-testid="company-logo"></div>,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
    mutations: { retry: false },
  },
});

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const renderGame = () => {
  render(<Game />, { wrapper: AllTheProviders });
  useGameStore.getState().initialize('test-player', 'http://localhost:4000/graphql');
};

// --- Test Suite ---
describe('Game Component', () => {
  beforeEach(() => {
    mockedGraphqlRequest.mockReset();
    queryClient.clear();
    useGameStore.setState({ playerId: null, apiUrl: null, balance: 0, winnings: 0 });
  });

  it('calls getOrCreatePlayer on init, then loads player and starts game', async () => {
    mockedGraphqlRequest.mockImplementation(async (_apiUrl, query) => {
      if (query === GET_OR_CREATE_PLAYER_MUTATION) {
        return { getOrCreatePlayer: { id: 'test-player', balance: 100, activeWinnings: 0 } };
      }
      if (query.includes('query Player')) {
        return { player: { id: 'test-player', balance: 100, activeWinnings: 0 } };
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    renderGame();

    expect(await screen.findByText('$100.00', {}, { timeout: 15000 })).toBeInTheDocument();
    expect(await screen.findByText('Small (1-6)', {}, { timeout: 15000 })).toBeInTheDocument();
  }, 20000);

  it('loads initial player data and starts the game', async () => {
    mockedGraphqlRequest.mockImplementation(async (_apiUrl, query) => {
      if (query === GET_OR_CREATE_PLAYER_MUTATION) {
        return { getOrCreatePlayer: { id: 'test-player', balance: 123, activeWinnings: 45 } };
      }
      if (query.includes('query Player')) {
        return { player: { id: 'test-player', balance: 123, activeWinnings: 45 } };
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    renderGame();

    expect(await screen.findByText('$123.00', {}, { timeout: 15000 })).toBeInTheDocument();
    expect(await screen.findByText('$45.00', {}, { timeout: 15000 })).toBeInTheDocument();
    // Buttons appear when game reaches READY after animations
    expect(await screen.findByText('Small (1-6)', {}, { timeout: 15000 })).toBeInTheDocument();
  }, 20000);

  it('plays a winning round and updates the UI', async () => {
    const user = userEvent.setup();

    mockedGraphqlRequest.mockImplementation(async (_apiUrl, query) => {
      if (query === GET_OR_CREATE_PLAYER_MUTATION) {
        return { getOrCreatePlayer: { id: 'test-player', balance: 100, activeWinnings: 0 } };
      }
      if (query.includes('mutation PlayRound')) {
        return { playRound: { drawnCard: 4, didWin: true, winnings: 20, newBalance: 90 } };
      }
      if (query.includes('query Player')) {
        return { player: { id: 'test-player', balance: 90, activeWinnings: 20 } };
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    renderGame();

    const smallButton = await screen.findByText('Small (1-6)', {}, { timeout: 15000 });
    await user.click(smallButton);

    expect(await screen.findByText('You Win!', {}, { timeout: 15000 })).toBeInTheDocument();
    expect(await screen.findByText('$20.00', {}, { timeout: 15000 })).toBeInTheDocument();
    expect(screen.getByText('Double for $40?')).toBeInTheDocument();
  }, 25000);

  it('plays a losing round and updates the UI', async () => {
    const user = userEvent.setup();

    mockedGraphqlRequest.mockImplementation(async (_apiUrl, query) => {
      if (query === GET_OR_CREATE_PLAYER_MUTATION) {
        return { getOrCreatePlayer: { id: 'test-player', balance: 100, activeWinnings: 20 } };
      }
      if (query.includes('mutation PlayRound')) {
        return { playRound: { drawnCard: 9, didWin: false, winnings: 0, newBalance: 100 } };
      }
      if (query.includes('query Player')) {
        return { player: { id: 'test-player', balance: 100, activeWinnings: 0 } };
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    renderGame();

    const largeButton = await screen.findByText('Large (8-13)', {}, { timeout: 15000 });
    await user.click(largeButton);

    expect(await screen.findByText('You Lose!', {}, { timeout: 15000 })).toBeInTheDocument();
    expect(await screen.findByText('$0.00', {}, { timeout: 15000 })).toBeInTheDocument();
    expect(screen.getByText('Play Again?')).toBeInTheDocument();
  }, 20000);

  it('cashes out after a win and restarts', async () => {
    const user = userEvent.setup();

    mockedGraphqlRequest.mockImplementation(async (_apiUrl, query) => {
      if (query === GET_OR_CREATE_PLAYER_MUTATION) {
        return { getOrCreatePlayer: { id: 'test-player', balance: 100, activeWinnings: 0 } };
      }
      if (query.includes('mutation PlayRound')) {
        return { playRound: { drawnCard: 4, didWin: true, winnings: 20, newBalance: 90 } };
      }
      if (query.includes('mutation CashOut')) {
        return { cashOut: { id: 'test-player', balance: 110, activeWinnings: 0 } };
      }
      if (query.includes('query Player')) {
        // Return after playRound first, then after cashOut
        const cashoutCalled = mockedGraphqlRequest.mock.calls.some(call => String(call[1]).includes('mutation CashOut'));
        return cashoutCalled
          ? { player: { id: 'test-player', balance: 110, activeWinnings: 0 } }
          : { player: { id: 'test-player', balance: 90, activeWinnings: 20 } };
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    renderGame();

    const smallButton = await screen.findByText('Small (1-6)', {}, { timeout: 15000 });
    await user.click(smallButton);

    const cashOutButton = await screen.findByText(/Cash Out/, {}, { timeout: 15000 });
    await user.click(cashOutButton);

    expect(await screen.findByText('$110.00', {}, { timeout: 15000 })).toBeInTheDocument();
    // After reset, buttons appear again
    expect(await screen.findByText('Small (1-6)', {}, { timeout: 15000 })).toBeInTheDocument();
  }, 25000);
});
