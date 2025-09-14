import { Card as RadixCard, Text, Flex, Heading } from '@radix-ui/themes';
import { LogoWithCircle } from '@/shared/ui/Logo';

type Props = {
  playerId: string;
  balance: number;
  winnings: number;
};

export function GameHeader({ playerId, balance, winnings }: Props) {
  return (
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
  );
}


