import { Box } from '@radix-ui/themes';
import { CssCard } from '@/features/game/ui/CssCard';
import { RefObject } from 'react';

type Props = {
  gameState: string;
  drawnCardIndex: number | null;
  startPosition: { x: number; y: number } | null;
  lastResult: { drawnCard: number; didWin: boolean } | null;
  deckRef: RefObject<HTMLDivElement>;
};

export function GameTable({ gameState, drawnCardIndex, startPosition, lastResult, deckRef }: Props) {
  return (
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
  );
}


