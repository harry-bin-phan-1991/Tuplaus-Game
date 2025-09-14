export const GET_PLAYER_QUERY = `
  query Player($id: String!) {
    player(id: $id) {
      id
      balance
      activeWinnings
    }
  }
`;

export const PLAY_ROUND_MUTATION = `
  mutation PlayRound($playRoundInput: PlayRoundInput!) {
    playRound(playRoundInput: $playRoundInput) {
      drawnCard
      didWin
      winnings
      newBalance
    }
  }
`;

export const CASH_OUT_MUTATION = `
  mutation CashOut($playerId: String!) {
    cashOut(playerId: $playerId) {
      id
      balance
      activeWinnings
    }
  }
`;

export const GET_OR_CREATE_PLAYER_MUTATION = `
  mutation GetOrCreatePlayer($id: String!) {
    getOrCreatePlayer(id: $id) {
      id
      balance
      activeWinnings
    }
  }
`;

export type Player = {
  id: string;
  balance: number;
  activeWinnings: number;
};

export type PlayerQueryData = {
  player: Player;
};

export type GetOrCreatePlayerData = {
  getOrCreatePlayer: Player;
};

export type PlayRoundData = {
  playRound: {
    drawnCard: number;
    didWin: boolean;
    winnings: number;
    newBalance: number;
  };
};

export type CashOutData = {
  cashOut: Player;
};


