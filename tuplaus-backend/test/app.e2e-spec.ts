import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import * as crypto from 'crypto';

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomInt: jest.fn(),
}));

describe('Game (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const playerId = 'e2e-test-player';

  const graphql = (query: string) => request(app.getHttpServer()).post('/graphql').send({ query });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();

    // Clean up before tests
    await prisma.gameRound.deleteMany({ where: { playerId } });
    await prisma.player.deleteMany({ where: { id: playerId } });
  });

  afterAll(async () => {
    // Clean up after tests
    await prisma.gameRound.deleteMany({ where: { playerId } });
    await prisma.player.deleteMany({ where: { id: playerId } });
    await app.close();
  });
  
  beforeEach(async () => {
    // Reset player state before each test to ensure independence
    await prisma.player.upsert({
      where: { id: playerId },
      update: { balance: 1000, activeWinnings: 0 },
      create: { id: playerId, balance: 1000, activeWinnings: 0 },
    });
    // Ensure no rounds from previous tests interfere
    await prisma.gameRound.deleteMany({ where: { playerId } });
  });

  it('should create a player with 1000 balance and 0 winnings', async () => {
    // This test now just verifies the beforeEach hook works
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    expect(player.balance).toBe(1000);
    expect(player.activeWinnings).toBe(0);
  });

  it('getOrCreatePlayer should create when missing and then be idempotent', async () => {
    const id = 'e2e-create-or-load';
    await prisma.player.deleteMany({ where: { id } });

    const createQuery = `
      mutation { getOrCreatePlayer(id: "${id}") { id balance activeWinnings } }
    `;
    await graphql(createQuery)
      .expect(200)
      .expect((res) => {
        expect(res.body.data.getOrCreatePlayer).toEqual({ id, balance: 1000, activeWinnings: 0 });
      });

    // Call again, should return same values (not overwrite if changed)
    await prisma.player.update({ where: { id }, data: { balance: 700, activeWinnings: 30 } });
    await graphql(createQuery)
      .expect(200)
      .expect((res) => {
        expect(res.body.data.getOrCreatePlayer).toEqual({ id, balance: 700, activeWinnings: 30 });
      });
  });

  it('should allow a player to play a round and lose, resetting winnings', async () => {
    // First, give the player some winnings to lose
    await prisma.player.update({ where: { id: playerId }, data: { balance: 1000, activeWinnings: 50 } });

    (crypto.randomInt as jest.Mock).mockReturnValue(7); // Card 7
    
    const query = `
        mutation {
            playRound(playRoundInput: {playerId: "${playerId}", bet: 50, choice: "small"}) {
                drawnCard
                didWin
                winnings
                newBalance
            }
        }
    `;

    await graphql(query)
        .expect(200)
        .expect((res) => {
            expect(res.body.data.playRound).toEqual({
                drawnCard: 7,
                didWin: false,
                winnings: 0,
                newBalance: 1000,
            });
        });
    
    const player = await prisma.player.findUnique({ where: { id: playerId }});
    expect(player.balance).toBe(1000);
    expect(player.activeWinnings).toBe(0);

    // Verify that the game round was logged
    const round = await prisma.gameRound.findFirst({ where: { playerId } });
    expect(round).toBeDefined();
    expect(round.didWin).toBe(false);
    expect(round.drawnCard).toBe(7);
  });
  
  it('should allow a player to play a round and win, accumulating winnings', async () => {
    (crypto.randomInt as jest.Mock).mockReturnValue(3); // Card 3
    
    const query = `
        mutation {
            playRound(playRoundInput: {playerId: "${playerId}", bet: 10, choice: "small"}) {
                drawnCard
                didWin
                winnings
                newBalance
            }
        }
    `;

    await graphql(query)
        .expect(200)
        .expect((res) => {
            expect(res.body.data.playRound).toEqual({
                drawnCard: 3,
                didWin: true,
                winnings: 20,
                newBalance: 990,
            });
        });

    const player = await prisma.player.findUnique({ where: { id: playerId }});
    expect(player.balance).toBe(990);
    expect(player.activeWinnings).toBe(20);
  });

  it('should allow a player to win twice, doubling their winnings', async () => {
    // First win to get some active winnings
    await prisma.player.update({ where: { id: playerId }, data: { balance: 1000, activeWinnings: 20 } });
    
    (crypto.randomInt as jest.Mock).mockReturnValue(12); // Card 12 (large)
    const secondRoundQuery = `
        mutation {
            playRound(playRoundInput: {playerId: "${playerId}", bet: 20, choice: "large"}) {
                drawnCard
                didWin
                winnings
                newBalance
            }
        }
    `;
    await graphql(secondRoundQuery)
      .expect(200)
      .expect((res) => {
        expect(res.body.data.playRound).toEqual({
            drawnCard: 12,
            didWin: true,
            winnings: 40, // 20 (the bet) * 2
            newBalance: 1000, // Balance is untouched
        });
      });
  });

  it('should allow a player to cash out winnings, updating balance', async () => {
    // Give the player winnings to cash out
    await prisma.player.update({ where: { id: playerId }, data: { balance: 1000, activeWinnings: 50 } });

    const query = `
        mutation {
            cashOut(playerId: "${playerId}") {
                id
                balance
                activeWinnings
            }
        }
    `;

    await graphql(query)
        .expect(200)
        .expect((res) => {
            expect(res.body.data.cashOut).toEqual({
                id: playerId,
                balance: 1050, // 1000 (current) + 50 (winnings)
                activeWinnings: 0,
            });
        });

    const player = await prisma.player.findUnique({ where: { id: playerId }});
    expect(player.balance).toBe(1050);
    expect(player.activeWinnings).toBe(0);
  });
});
