import { useMutation, useQuery } from '@tanstack/react-query';
import { graphqlRequest } from '@/shared/api/graphql';
import { GET_OR_CREATE_PLAYER_MUTATION, GET_PLAYER_QUERY, PLAY_ROUND_MUTATION, CASH_OUT_MUTATION, type PlayerQueryData, type GetOrCreatePlayerData, type PlayRoundData, type CashOutData } from '@/features/game/api/queries';
import { useGameStore } from '@/features/game/model/gameStore';
import { useEffect, useState, useRef } from 'react';
import { Card as RadixCard, Flex } from '@radix-ui/themes';
import '@/features/game/ui/cards.scss';
import { GameHeader } from '@/features/game/ui/GameHeader';
import { GameTable } from '@/features/game/ui/GameTable';
import { GameControls } from '@/features/game/ui/GameControls';
import { ErrorBanner } from '@/shared/ui/ErrorBanner';

type GameState = 'IDLE' | 'REVEALING' | 'COVERING' | 'GATHERING' | 'SHUFFLING' | 'SPREADING' | 'READY' | 'DRAWING' | 'RESULT' | 'CLEANUP';


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

  const { data: playerData, isLoading: isPlayerLoading, refetch: refetchPlayer, error: playerError } = useQuery({
    queryKey: ['player', playerId],
    queryFn: () => graphqlRequest<PlayerQueryData>(apiUrl!, GET_PLAYER_QUERY, { id: playerId! }),
    enabled: !!playerId && !!apiUrl,
  });

  const getOrCreatePlayer = useMutation({
    mutationFn: () => {
      if (!playerId || !apiUrl) throw new Error('Player or API URL not set');
      return graphqlRequest<GetOrCreatePlayerData>(apiUrl, GET_OR_CREATE_PLAYER_MUTATION, { id: playerId });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, apiUrl]);

  useEffect(() => {
    if (playerData?.player) {
      setBalance(playerData.player.balance);
      setWinnings(playerData.player.activeWinnings);
      if (gameState === 'IDLE' && playerData.player.balance > 0) {
        runRoundSequence();
      }
    }
  }, [playerData, gameState]);

  const { mutate: playRound, isPending: isPlaying } = useMutation({
    mutationFn: (choice: 'small' | 'large') => {
      if (!playerId || !apiUrl) throw new Error('Player or API URL not set');
      const currentBet = winnings > 0 ? winnings : bet;
      return graphqlRequest<PlayRoundData>(apiUrl, PLAY_ROUND_MUTATION, {
        playRoundInput: { playerId, bet: currentBet, choice },
      });
    },
    onSuccess: (data) => {
      const result = (data as PlayRoundData).playRound;
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
      return graphqlRequest<CashOutData>(apiUrl!, CASH_OUT_MUTATION, { playerId });
    },
    onSuccess: () => {
      refetchPlayer();
      setGameState('IDLE');
    }
  });

  if (!playerId || !apiUrl) {
    return <ErrorBanner message="Error: Player ID and API URL are required." />;
  }

  if (isPlayerLoading || !playerData) {
    return <div>Loading Game...</div>;
  }

  const canPlay = (bet >= 1 && balance >= bet) || winnings > 0;

  return (
    <RadixCard m="0" className="game-container">
      <Flex direction="column" gap="3" align="center" style={{ height: '100%' }}>
        <GameHeader playerId={playerId} balance={balance} winnings={winnings} />
        <GameTable gameState={gameState} drawnCardIndex={drawnCardIndex} startPosition={startPosition} lastResult={lastResult} deckRef={deckRef} />
        {playerError && <ErrorBanner message={(playerError as Error).message} />}
        <GameControls
          gameState={gameState}
          winnings={winnings}
          bet={bet}
          balance={balance}
          isPlaying={isPlaying}
          canPlay={canPlay}
          setBet={setBet}
          onPlay={(choice) => playRound(choice)}
          onCashOut={() => cashOutMutation.mutate()}
          onPlayAgain={runRoundSequence}
          lastResult={lastResult}
        />
      </Flex>
    </RadixCard>
  );
}
