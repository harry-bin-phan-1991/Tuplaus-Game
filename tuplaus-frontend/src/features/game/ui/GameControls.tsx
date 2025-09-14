import { Button, Flex, Text, TextField, Heading } from '@radix-ui/themes';

type Props = {
  gameState: string;
  winnings: number;
  bet: number;
  balance: number;
  isPlaying: boolean;
  canPlay: boolean;
  setBet: (n: number) => void;
  onPlay: (choice: 'small' | 'large') => void;
  onCashOut: () => void;
  onPlayAgain: () => void;
  lastResult?: { drawnCard: number; didWin: boolean } | null;
};

export function GameControls({ gameState, winnings, bet, balance, isPlaying, canPlay, setBet, onPlay, onCashOut, onPlayAgain, lastResult }: Props) {
  return (
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
            <Button size="4" onClick={() => onPlay('small')} disabled={!canPlay || isPlaying} className="game-button" data-testid="btn-small">Small (1-6)</Button>
            <Button size="4" onClick={() => onPlay('large')} disabled={!canPlay || isPlaying} className="game-button" data-testid="btn-large">Large (8-13)</Button>
          </Flex>
        </Flex>
      )}

      {gameState === 'RESULT' && lastResult && (
        <Flex direction="column" gap="3" align="center" className={`result-controls ${lastResult.didWin ? 'win-animation' : 'lose-animation'}`}>
          <Heading size="8" color={lastResult.didWin ? 'green' : 'red'}>
            {lastResult.drawnCard === 7 ? 'You Lose!' : lastResult.didWin ? 'You Win!' : 'You Lose!'}
          </Heading>
          <Flex gap="3">
            {winnings > 0 && <Button size="4" onClick={onPlayAgain} className="game-button game-button-win" data-testid="btn-double">Double for ${winnings * 2}?</Button>}
            {(winnings > 0 || lastResult?.didWin) && <Button size="4" onClick={onCashOut} className="game-button" data-testid="btn-cashout">Cash Out ${winnings.toFixed(2)}</Button>}
            {winnings === 0 && <Button size="4" onClick={onPlayAgain} className="game-button" data-testid="btn-again">Play Again?</Button>}
          </Flex>
        </Flex>
      )}
    </Flex>
  );
}


