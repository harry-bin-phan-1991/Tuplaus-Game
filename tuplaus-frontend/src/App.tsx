import { Game } from '@/features/game/ui/Game';
import { useGameStore } from '@/features/game/model/gameStore';
import { useEffect } from 'react';

interface AppProps {
  playerId?: string;
  apiUrl?: string;
}

function App({ playerId: propPlayerId, apiUrl: propApiUrl }: AppProps) {
  const { initialize } = useGameStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const playerId = propPlayerId || params.get('playerId');
    const apiUrl = propApiUrl || params.get('apiUrl');

    if (playerId && apiUrl) {
      initialize(playerId, apiUrl);
    }
  }, [initialize, propPlayerId, propApiUrl]);

  return <Game />;
}

export default App;
