import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type GameState = {
  playerId: string | null;
  apiUrl: string | null;
  balance: number;
  winnings: number;
  lastCard: number | null;
  lastWin: boolean | null;
  initialize: (playerId: string, apiUrl: string) => void;
  setBalance: (balance: number) => void;
  setWinnings: (winnings: number) => void;
  setLastResult: (card: number | null, win: boolean | null) => void;
};

export const useGameStore = create<GameState>()(
  immer((set) => ({
    playerId: null,
    apiUrl: null,
    balance: 0,
    winnings: 0,
    lastCard: null,
    lastWin: null,
    initialize: (playerId, apiUrl) => set((state) => {
      state.playerId = playerId;
      state.apiUrl = apiUrl;
    }),
    setBalance: (balance) => set((state) => {
      state.balance = balance;
    }),
    setWinnings: (winnings) => set((state) => {
      state.winnings = winnings;
    }),
    setLastResult: (card, win) => set((state) => {
      state.lastCard = card;
      state.lastWin = win;
    }),
  })),
);
