import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

// Mock Prisma Service
const db = {
  player: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  gameRound: {
    create: jest.fn(),
  },
};

describe('GameService', () => {
  let service: GameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: PrismaService,
          useValue: db,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    jest.clearAllMocks();
  });

  describe('playRound', () => {
    const mockPlayer = { id: 'test', balance: 100, activeWinnings: 0, createdAt: new Date() };

    it('should handle a win correctly', async () => {
      db.player.findUnique.mockResolvedValue(mockPlayer);
      db.player.update.mockResolvedValue({ ...mockPlayer, balance: 90, activeWinnings: 20 });
      jest.spyOn(Math, 'random').mockReturnValue(0.1); // Card 2 (small)

      const result = await service.playRound({ playerId: 'test', bet: 10, choice: 'small' });

      expect(result.didWin).toBe(true);
      expect(result.winnings).toBe(20);
      expect(result.newBalance).toBe(90);
      expect(db.player.update).toHaveBeenCalledWith({
        where: { id: 'test' },
        data: { balance: 90, activeWinnings: 20 },
      });
      expect(db.gameRound.create).toHaveBeenCalled();
    });

    it('should handle a loss correctly', async () => {
      db.player.findUnique.mockResolvedValue(mockPlayer);
      db.player.update.mockResolvedValue({ ...mockPlayer, balance: 90, activeWinnings: 0 });
      jest.spyOn(Math, 'random').mockReturnValue(0.8); // Card 11 (large)

      const result = await service.playRound({ playerId: 'test', bet: 10, choice: 'small' });

      expect(result.didWin).toBe(false);
      expect(result.winnings).toBe(0);
      expect(db.player.update).toHaveBeenCalledWith({
        where: { id: 'test' },
        data: { balance: 90, activeWinnings: 0 },
      });
    });

    it('should always lose on card 7', async () => {
      db.player.findUnique.mockResolvedValue(mockPlayer);
      db.player.update.mockResolvedValue({ ...mockPlayer, balance: 90, activeWinnings: 0 });
      jest.spyOn(Math, 'random').mockReturnValue(6.5 / 13); // Card 7

      const result = await service.playRound({ playerId: 'test', bet: 10, choice: 'small' });

      expect(result.didWin).toBe(false);
      expect(result.drawnCard).toBe(7);
      expect(result.winnings).toBe(0);
    });

    it('should throw an error for insufficient balance', async () => {
      db.player.findUnique.mockResolvedValue({ ...mockPlayer, balance: 5 });
      await expect(service.playRound({ playerId: 'test', bet: 10, choice: 'small' })).rejects.toThrow('Insufficient balance.');
    });
  });

  describe('cashOut', () => {
    it('should add active winnings to balance and reset winnings', async () => {
      const mockPlayer = { id: 'test', balance: 100, activeWinnings: 50, createdAt: new Date() };
      db.player.findUnique.mockResolvedValue(mockPlayer);
      db.player.update.mockResolvedValue({ ...mockPlayer, balance: 150, activeWinnings: 0 });
      
      const result = await service.cashOut('test');

      expect(result.balance).toBe(150);
      expect(result.activeWinnings).toBe(0);
      expect(db.player.update).toHaveBeenCalledWith({
        where: { id: 'test' },
        data: { balance: 150, activeWinnings: 0 },
      });
    });

    it('should do nothing if there are no active winnings', async () => {
      const mockPlayer = { id: 'test', balance: 100, activeWinnings: 0, createdAt: new Date() };
      db.player.findUnique.mockResolvedValue(mockPlayer);
      
      const result = await service.cashOut('test');

      expect(result.balance).toBe(100);
      expect(db.player.update).not.toHaveBeenCalled();
    });
  });
});
