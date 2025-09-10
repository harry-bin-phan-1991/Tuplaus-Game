import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { graphqlRequest } from '../lib/api';
import { useGameStore } from '../store/gameStore';
import { useEffect } from 'react';
import { Card, Heading, Flex, Text, Button } from '@radix-ui/themes';

const GET_PLAYER_QUERY = `
  query Player($id: String!) {
    player(id: $id) {
      id
      balance
      activeWinnings
    }
  }
`;

const CREATE_PLAYER_MUTATION = `
  mutation CreatePlayer($id: String!) {
    createPlayer(id: $id) {
      id
      balance
      activeWinnings
    }
  }
`;

const PLAY_ROUND_MUTATION = `
  mutation PlayRound($playRoundInput: PlayRoundInput!) {
    playRound(playRoundInput: $playRoundInput) {
      drawnCard
      didWin
      winnings
      newBalance
    }
  }
`;

const CASH_OUT_MUTATION = `
  mutation CashOut($playerId: String!) {
    cashOut(playerId: $playerId) {
      id
      balance
      activeWinnings
    }
  }
`;


export function Game() {
  const queryClient = useQueryClient();
  const { 
    playerId, apiUrl, balance, winnings, lastCard, lastWin, 
    setBalance, setWinnings, setLastResult 
  } = useGameStore();

  const { data: playerData, isLoading: isPlayerLoading } = useQuery({
    queryKey: ['player', playerId],
    queryFn: () => graphqlRequest(apiUrl!, GET_PLAYER_QUERY, { id: playerId }),
    enabled: !!playerId && !!apiUrl,
  });

  const createPlayerMutation = useMutation({
    mutationFn: () => graphqlRequest(apiUrl!, CREATE_PLAYER_MUTATION, { id: playerId }),
    onSuccess: (data) => {
      setBalance(data.createPlayer.balance);
      setWinnings(data.createPlayer.activeWinnings);
      queryClient.invalidateQueries({ queryKey: ['player', playerId] });
    },
  });

  const playRoundMutation = useMutation({
    mutationFn: (variables: { bet: number; choice: string }) =>
      graphqlRequest(apiUrl!, PLAY_ROUND_MUTATION, {
        playRoundInput: { playerId, ...variables },
      }),
    onSuccess: (data) => {
      const { drawnCard, didWin, winnings, newBalance } = data.playRound;
      setLastResult(drawnCard, didWin);
      setWinnings(winnings);
      setBalance(newBalance);
    },
  });

  const cashOutMutation = useMutation({
    mutationFn: () => graphqlRequest(apiUrl!, CASH_OUT_MUTATION, { playerId }),
    onSuccess: (data) => {
      setBalance(data.cashOut.balance);
      setWinnings(data.cashOut.activeWinnings);
      setLastResult(null, null);
    },
  });

  useEffect(() => {
    if (isPlayerLoading) {
      return;
    }
    if (playerData?.player) {
      setBalance(playerData.player.balance);
      setWinnings(playerData.player.activeWinnings);
    } else if (playerId && apiUrl && !createPlayerMutation.isPending) {
      createPlayerMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerData, isPlayerLoading, playerId, apiUrl]);
  
  const handlePlay = (choice: 'small' | 'large') => {
    // Bet 10 for simplicity
    playRoundMutation.mutate({ bet: 10, choice });
  };
  
  const handleCashOut = () => {
    cashOutMutation.mutate();
  }

  if (!playerId || !apiUrl) {
    return <div className="text-red-500">Error: Player ID and API URL are required.</div>;
  }
  
  if (isPlayerLoading && !playerData) return <div className="text-center"><Text>Loading Game...</Text></div>;

  return (
    <Card size="4" className="w-full" id="tuplaus-card">
      <Heading as="h1" size="6" align="center" mb="4">Tuplaus Game</Heading>
      <Flex direction="column" gap="3">
        <div><Text size="4">Player: {playerId}</Text></div>
        <div><Text size="4">Balance: <span className="font-bold">${balance.toFixed(2)}</span></Text></div>
        <div><Text size="4">Current Winnings: <span className="font-bold text-green-500">${winnings.toFixed(2)}</span></Text></div>
        
        <Flex gap="3" justify="center" my="4">
            <Button size="3" onClick={() => handlePlay('small')} disabled={playRoundMutation.isPending}>
                Small (1-6)
            </Button>
            <Button size="3" onClick={() => handlePlay('large')} disabled={playRoundMutation.isPending}>
                Large (8-13)
            </Button>
        </Flex>

        {lastCard !== null && (
            <Card variant='surface'>
                <Flex direction="column" gap="2" align="center">
                    <Text>Last Card Drawn: <span className='font-bold text-xl'>{lastCard}</span></Text>
                    {lastCard === 7 ? (
                        <Text color="ruby" size="4">You lose on a 7!</Text>
                    ): (
                        <Text color={lastWin ? 'green' : 'ruby'} size="4">You {lastWin ? 'Won!' : 'Lost!'}</Text>
                    )}
                </Flex>
            </Card>
        )}
        
        <Button size="3" color="green" onClick={handleCashOut} disabled={winnings === 0 || cashOutMutation.isPending}>
          Cash Out Winnings
        </Button>
      </Flex>
    </Card>
  );
}
