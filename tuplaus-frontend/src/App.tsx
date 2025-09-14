import { Game } from '@/components/Game';
import { useGameStore } from '@/features/game/model/gameStore';
import { useEffect } from 'react';

type AppProps = {
  playerId: string;
  apiUrl: string;
}

function App({ playerId, apiUrl }: AppProps) {
  const initialize = useGameStore((state) => state.initialize);

  useEffect(() => {
    initialize(playerId, apiUrl);
  }, [playerId, apiUrl, initialize]);

  return (
    <Game />
  );
}

export default App;
