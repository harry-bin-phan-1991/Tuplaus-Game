import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlayRoundInput } from './dto/play-round.input';
import * as crypto from 'crypto';

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) {}

  async getPlayer(id: string) {
    const player = await this.prisma.player.findUnique({ where: { id } });
    if (!player) {
      throw new NotFoundException(`Player with ID "${id}" not found`);
    }
    return player;
  }

  async createPlayerForTesting(id: string) {
    return this.prisma.player.upsert({
      where: { id },
      update: { balance: 1000, activeWinnings: 0 },
      create: { id, balance: 1000, activeWinnings: 0 },
    });
  }

  async getOrCreatePlayer(id: string) {
    return this.prisma.player.upsert({
      where: { id },
      update: {},
      create: { id, balance: 1000, activeWinnings: 0 },
    });
  }

  async playRound(playRoundInput: PlayRoundInput) {
    const { playerId, bet, choice } = playRoundInput;

    const player = await this.getPlayer(playerId);

    const isDoublingDown = player.activeWinnings > 0;
    const currentBet = isDoublingDown ? player.activeWinnings : bet;

    if (!isDoublingDown && player.balance < currentBet) {
      throw new Error('Insufficient balance.');
    }

    const balanceAfterBet = isDoublingDown ? player.balance : player.balance - currentBet;
    
    const drawnCard = crypto.randomInt(1, 14); // 1-13, using CSPRNG

    let didWin = false;
    if (drawnCard !== 7 && ((choice.toLowerCase() === 'small' && drawnCard <= 6) || (choice.toLowerCase() === 'large' && drawnCard >= 8))) {
        didWin = true;
    }

    let updatedPlayer;
    let roundWinnings = 0;

    if (didWin) {
      roundWinnings = currentBet * 2;
      updatedPlayer = await this.prisma.player.update({
        where: { id: playerId },
        data: {
          balance: balanceAfterBet,
          activeWinnings: roundWinnings, // The new winnings are simply the doubled bet
        },
      });
    } else {
      updatedPlayer = await this.prisma.player.update({
        where: { id: playerId },
        data: {
          balance: balanceAfterBet,
          activeWinnings: 0, // Lose all active winnings
        },
      });
    }

    // Log the game round to the database
    await this.prisma.gameRound.create({
      data: {
        playerId,
        bet: currentBet,
        choice,
        drawnCard,
        didWin,
        winnings: roundWinnings, // Log the winnings from this specific round
      },
    });
    
    return {
      drawnCard,
      didWin,
      winnings: updatedPlayer.activeWinnings,
      newBalance: updatedPlayer.balance,
    };
  }

  async cashOut(playerId: string) {
    const player = await this.getPlayer(playerId);
    
    if (player.activeWinnings > 0) {
      const updatedPlayer = await this.prisma.player.update({
        where: { id: playerId },
        data: {
          balance: player.balance + player.activeWinnings,
          activeWinnings: 0, // Reset winnings
        },
      });
      return updatedPlayer;
    }

    return player; // Return player as is if no winnings to cash out
  }
}
