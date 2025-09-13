import { useMutation, useQuery } from '@tanstack/react-query';
import { graphqlRequest, GET_OR_CREATE_PLAYER_MUTATION } from '../lib/api';
import { useGameStore } from '../store/gameStore';
import { useEffect, useState, useRef } from 'react';
import { Card as RadixCard, Text, Button, Flex, Heading, Box, TextField } from '@radix-ui/themes';
import './cards.scss';
import { CssCard } from './CssCard';
import { LogoWithCircle } from './Logo';

type GameState = 'IDLE' | 'REVEALING' | 'COVERING' | 'GATHERING' | 'SHUFFLING' | 'SPREADING' | 'READY' | 'DRAWING' | 'RESULT' | 'CLEANUP';

const GET_PLAYER_QUERY = `
  query Player($id: String!) {
    player(id: $id) {
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
  const { playerId, apiUrl } = useGameStore();
  const [balance, setBalance] = useState(0);
  const [winnings, setWinnings] = useState(0);
  const [lastResult, setLastResult] = useState<{ drawnCard: number; didWin: boolean } | null>(null);
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [bet, setBet] = useState(1);
  const [drawnCardIndex, setDrawnCardIndex] = useState<number | null>(null);
  const [startPosition, setStartPosition] = useState<{ x: number; y: number } | null>(null);
  const deckRef = useRef<HTMLDivElement>(null);

  const { data: playerData, isLoading: isPlayerLoading, refetch: refetchPlayer } = useQuery({
    queryKey: ['player', playerId],
    queryFn: () => graphqlRequest(apiUrl!, GET_PLAYER_QUERY, { id: playerId }),
    enabled: !!playerId && !!apiUrl,
  });

  const getOrCreatePlayer = useMutation({
    mutationFn: () => {
      if (!playerId || !apiUrl) throw new Error('Player or API URL not set');
      return graphqlRequest(apiUrl, GET_OR_CREATE_PLAYER_MUTATION, { id: playerId });
    },
    onSuccess: () => {
      refetchPlayer();
    },
  });

  const runRoundSequence = () => {
    setGameState('CLEANUP');
    setTimeout(() => {
      setLastResult(null);
      setDrawnCardIndex(null);
      setStartPosition(null);
      setGameState('REVEALING');
      setTimeout(() => setGameState('COVERING'), 1500);
      setTimeout(() => setGameState('GATHERING'), 2000);
      setTimeout(() => setGameState('SHUFFLING'), 2500);
      setTimeout(() => setGameState('SPREADING'), 3000);
      setTimeout(() => setGameState('READY'), 3500);
    }, 400); // Wait for cleanup animation
  };

  useEffect(() => {
    if (playerId && apiUrl) {
      getOrCreatePlayer.mutate();
    }
    if (playerData?.player) {
      setBalance(playerData.player.balance);
      setWinnings(playerData.player.activeWinnings);
      if (gameState === 'IDLE' && playerData.player.balance > 0) {
        runRoundSequence();
      }
    }
  }, [playerId, apiUrl, playerData, gameState]);

  const { mutate: playRound, isPending: isPlaying } = useMutation({
    mutationFn: (choice: 'small' | 'large') => {
      if (!playerId || !apiUrl) throw new Error('Player or API URL not set');
      const currentBet = winnings > 0 ? winnings : bet;
      return graphqlRequest(apiUrl, PLAY_ROUND_MUTATION, {
        playRoundInput: { playerId, bet: currentBet, choice },
      });
    },
    onSuccess: (data) => {
      const result = data.playRound;
      const randomCardIndex = Math.floor(Math.random() * 13);
      const cardElement = deckRef.current?.children[randomCardIndex] as HTMLElement;
      if (cardElement) {
        const rect = cardElement.getBoundingClientRect();
        const containerRect = deckRef.current!.parentElement!.getBoundingClientRect();
        setStartPosition({
          x: rect.left - containerRect.left + (rect.width / 2) - (containerRect.width / 2),
          y: rect.top - containerRect.top + (rect.height / 2) - (containerRect.height / 2),
        });
      }
      setLastResult({ drawnCard: result.drawnCard, didWin: result.didWin });
      setDrawnCardIndex(randomCardIndex);
      setGameState('DRAWING');

      setTimeout(() => {
        setGameState('RESULT');
        refetchPlayer();
      }, 1800); // Duration of the new combined animation
    },
    onError: () => setGameState('IDLE'),
  });

  const cashOutMutation = useMutation({
    mutationFn: () => {
      if (!playerId || !apiUrl) throw new Error('Player or API URL not set');
      return graphqlRequest(apiUrl!, CASH_OUT_MUTATION, { playerId });
    },
    onSuccess: () => {
      refetchPlayer();
      setGameState('IDLE');
    }
  });

  if (!playerId || !apiUrl) {
    return <div className="text-red-500">Error: Player ID and API URL are required.</div>;
  }

  if (isPlayerLoading || !playerData) {
    return <div>Loading Game...</div>;
  }

  const canPlay = (bet >= 1 && balance >= bet) || winnings > 0;

  return (
    <RadixCard m="0" className="game-container">
      <Flex direction="column" gap="3" align="center" style={{ height: '100%' }}>
        {/* Header */}
        <Flex justify="between" align="center" width="100%" p="3" className="game-header">
          <Flex align="center" gap="3">
            <LogoWithCircle />
            <Heading size="4">Player: {playerId}</Heading>
          </Flex>
          <Flex gap="3" align="center">
            <RadixCard className="info-card">
              <Text size="2" color="gray">Balance</Text>
              <Heading size="5">${balance.toFixed(2)}</Heading>
            </RadixCard>
            <RadixCard className="info-card">
              <Text size="2" color="gray">Winnings</Text>
              <Heading size="5" color="gold">${winnings.toFixed(2)}</Heading>
            </RadixCard>
          </Flex>
        </Flex>

        {/* Game Table */}
        <Box className="game-table" style={{ flexGrow: 1 }}>
          <div className={`deck-container ${gameState.toLowerCase()}`} ref={deckRef}>
            {Array.from({ length: 13 }).map((_, i) => (
              <div key={i} className={`card-in-deck ${drawnCardIndex === i ? 'is-drawn-from-spread' : ''}`}>
                <CssCard rank={i + 1} covered={gameState !== 'REVEALING'} />
              </div>
            ))}
          </div>

          {(gameState === 'DRAWING' || gameState === 'RESULT' || gameState === 'CLEANUP') && startPosition && lastResult && (
            <div 
                className={`result-card-container ${gameState.toLowerCase()}`}
                style={{ '--start-x': `${startPosition.x}px`, '--start-y': `${startPosition.y}px` } as React.CSSProperties}
            >
              <div className="card-face-front">
                <CssCard rank={lastResult.drawnCard} />
              </div>
              <div className="card-face-back">
                <CssCard rank={1} covered={true} />
              </div>
            </div>
          )}
        </Box>

        {/* Footer Controls */}
        <Flex direction="column" gap="3" align="center" p="3" className="controls-footer">
          {!canPlay && gameState === 'READY' && <Text color="red">You cannot bet more than your balance or 0$</Text>}

          {gameState === 'READY' && (
            <Flex direction="column" align="center" gap="3">
              {winnings === 0 && (
                <label className="bet-input-label">
                  <Text size="2" weight="bold">Bet Amount ($) </Text>
                  <TextField.Root 
                    type="number"
                    size="3"
                    value={bet === 0 ? '' : String(bet)}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setBet(0);
                      } else {
                        const num = Number(value);
                        // Prevent non-numeric or negative values
                        if (!isNaN(num) && num >= 0) {
                          setBet(Math.min(num, balance));
                        }
                      }
                    }}
                    className="bet-input"
                  />
                </label>
              )}
              <Flex gap="3" className="play-buttons">
                <Button size="4" onClick={() => playRound('small')} disabled={!canPlay || isPlaying} className="game-button">Small (1-6)</Button>
                <Button size="4" onClick={() => playRound('large')} disabled={!canPlay || isPlaying} className="game-button">Large (8-13)</Button>
              </Flex>
            </Flex>
          )}

          {gameState === 'RESULT' && lastResult && (
            <Flex direction="column" gap="3" align="center" className={`result-controls ${lastResult.didWin ? 'win-animation' : 'lose-animation'}`}>
              <Heading size="8" color={lastResult.didWin ? 'green' : 'red'}>
                {lastResult.drawnCard === 7 ? 'You Lose!' : lastResult.didWin ? 'You Win!' : 'You Lose!'}
              </Heading>
              <Flex gap="3">
                {lastResult.didWin && winnings > 0 && <Button size="4" onClick={runRoundSequence} className="game-button game-button-win">Double for ${winnings * 2}?</Button>}
                {winnings > 0 && <Button size="4" onClick={() => cashOutMutation.mutate()} disabled={cashOutMutation.isPending} className="game-button">Cash Out ${winnings.toFixed(2)}</Button>}
                {!lastResult.didWin && <Button size="4" onClick={runRoundSequence} className="game-button">Play Again?</Button>}
              </Flex>
            </Flex>
          )}
        </Flex>
      </Flex>
    </RadixCard>
  );
}
