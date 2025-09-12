/// <reference types="vitest" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Game } from './Game';
import { useGameStore } from '../store/gameStore';
import { graphqlRequest } from '../lib/api';

// Mock the API module
vi.mock('../lib/api');
const mockedGraphqlRequest = vi.mocked(graphqlRequest);

// Mock the Logo component
vi.mock('./Logo', () => ({
  LogoWithCircle: () => <div data-testid="company-logo"></div>,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Prevent retries in tests
    },
  },
});

const AllProviders = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

const setupGame = () => {
  render(<Game />, { wrapper: AllProviders });
  useGameStore.getState().initialize('test-player', 'http://localhost:4000/graphql');
};

describe('Game Component', () => {
  beforeEach(() => {
    // Reset mocks and Zustand store before each test
    mockedGraphqlRequest.mockClear();
    queryClient.clear();
    useGameStore.setState({
      playerId: null,
      apiUrl: null,
      balance: 0,
      winnings: 0,
    });
  });

  it('loads and displays initial player data', async () => {
    mockedGraphqlRequest.mockResolvedValue({
      player: { id: 'test-player', balance: 100, activeWinnings: 0 },
    });
    setupGame();
    expect(await screen.findByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('Player: test-player')).toBeInTheDocument();
  });

  it('allows betting and playing a winning round', async () => {
    const user = userEvent.setup();
    mockedGraphqlRequest.mockResolvedValueOnce({ // Initial player fetch
      player: { id: 'test-player', balance: 100, activeWinnings: 0 },
    });
    setupGame();

    // Wait for the game to be ready after animations
    const smallButton = await screen.findByText('Small (1-6)', {}, { timeout: 10000 });
    const betInput = screen.getByLabelText<HTMLInputElement>(/Bet Amount/i);

    // Change bet amount
    await user.clear(betInput);
    await user.type(betInput, '10');
    expect(betInput.value).toBe('10');

    // Mock playRound response (WIN)
    mockedGraphqlRequest.mockResolvedValueOnce({
      playRound: { drawnCard: 4, didWin: true, winnings: 20, newBalance: 90 },
    });
    // Mock refetch player data
    mockedGraphqlRequest.mockResolvedValueOnce({
      player: { id: 'test-player', balance: 90, activeWinnings: 20 },
    });

    await user.click(smallButton);

    // Check for win result
    const resultControls = await screen.findByText('You Win!', {}, { timeout: 10000 });
    expect(resultControls.parentElement).toHaveClass('win-animation');
    expect(screen.getByText('Double for $40?')).toBeInTheDocument();
    expect(await screen.findByText('$20.00')).toBeInTheDocument(); // Winnings display

    // Bet input should be hidden now
    expect(screen.queryByLabelText(/Bet Amount/i)).not.toBeInTheDocument();
  });

  it('handles a losing round and applies lose animation', async () => {
    const user = userEvent.setup();
    mockedGraphqlRequest.mockResolvedValueOnce({
      player: { id: 'test-player', balance: 100, activeWinnings: 0 },
    });
    setupGame();

    const largeButton = await screen.findByText('Large (8-13)', {}, { timeout: 10000 });

    // Mock playRound response (LOSE)
    mockedGraphqlRequest.mockResolvedValueOnce({
      playRound: { drawnCard: 2, didWin: false, winnings: 0, newBalance: 90 },
    });
    mockedGraphqlRequest.mockResolvedValueOnce({
      player: { id: 'test-player', balance: 90, activeWinnings: 0 },
    });

    await user.click(largeButton);

    const resultControls = await screen.findByText('You Lose!', {}, { timeout: 10000 });
    expect(resultControls.parentElement).toHaveClass('lose-animation');
    expect(screen.getByText('Play Again?')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument(); // Winnings display
  });

  it('disables play buttons when bet exceeds balance', async () => {
    const user = userEvent.setup();
    mockedGraphqlRequest.mockResolvedValueOnce({
      player: { id: 'test-player', balance: 50, activeWinnings: 0 },
    });
    setupGame();

    const smallButton = await screen.findByText('Small (1-6)', {}, { timeout: 10000 });
    const betInput = screen.getByLabelText<HTMLInputElement>(/Bet Amount/i);

    // Bet more than balance
    await user.clear(betInput);
    await user.type(betInput, '51');
    
    // The component logic caps the bet at the balance (50), so the button should be enabled.
    await waitFor(() => {
      expect(betInput.value).toBe('50');
      expect(smallButton).not.toBeDisabled();
    });

    // Now, let's test the disabled state by clearing the input
    await user.clear(betInput);
    await waitFor(() => {
      expect(betInput.value).toBe('');
      expect(smallButton).toBeDisabled();
    });
  });

  it('handles cashing out winnings', async () => {
    const user = userEvent.setup();
    // Setup a game that is already in a winning state
    mockedGraphqlRequest.mockResolvedValueOnce({
      player: { id: 'test-player', balance: 90, activeWinnings: 20 },
    });

    // We need to manually set the game state for this test
    setupGame();
    
    // This is tricky without exposing game state, let's simulate a win first
    const smallButton = await screen.findByText('Small (1-6)', {}, { timeout: 10000 });
    mockedGraphqlRequest.mockResolvedValueOnce({
      playRound: { drawnCard: 4, didWin: true, winnings: 20, newBalance: 90 },
    });
    mockedGraphqlRequest.mockResolvedValueOnce({
      player: { id: 'test-player', balance: 90, activeWinnings: 20 },
    });
    await user.click(smallButton);

    const cashOutButton = await screen.findByText(/Cash Out/, {}, { timeout: 10000 });
    
    // Mock cashOut response
    mockedGraphqlRequest.mockResolvedValueOnce({
      cashOut: { id: 'test-player', balance: 110, activeWinnings: 0 },
    });
    // Refetch player after cash out
    mockedGraphqlRequest.mockResolvedValueOnce({
      player: { id: 'test-player', balance: 110, activeWinnings: 0 },
    });

    await user.click(cashOutButton);

    // After cashing out, balance should be updated, and game resets
    expect(await screen.findByText('$110.00')).toBeInTheDocument();
    // A new game starts, so play buttons should be visible after the animation timeout
    expect(await screen.findByText('Small (1-6)', {}, { timeout: 10000 })).toBeInTheDocument();
  });
}, 10000);
