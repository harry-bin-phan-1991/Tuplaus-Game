import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

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
    // Ensure no rounds from previous tests interfere
    await prisma.gameRound.deleteMany({ where: { playerId } });
  });

  it('should create a player with 1000 balance and 0 winnings', async () => {
    const query = `
      mutation {
        createPlayer(id: "${playerId}") {
          id
          balance
          activeWinnings
        }
      }
    `;
    return graphql(query)
      .expect(200)
      .expect((res) => {
        expect(res.body.data.createPlayer).toEqual({
          id: playerId,
          balance: 1000,
          activeWinnings: 0,
        });
      });
  });

  it('should allow a player to play a round and lose, resetting winnings', async () => {
    // First, give the player some winnings to lose
    await prisma.player.update({ where: { id: playerId }, data: { activeWinnings: 50 } });

    jest.spyOn(Math, 'random').mockReturnValue(6.5 / 13); // Card 7
    
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
                drawnCard: 7,
                didWin: false,
                winnings: 0,
                newBalance: 990,
            });
        });
    
    const player = await prisma.player.findUnique({ where: { id: playerId }});
    expect(player.balance).toBe(990);
    expect(player.activeWinnings).toBe(0);

    // Verify that the game round was logged
    const round = await prisma.gameRound.findFirst({ where: { playerId } });
    expect(round).toBeDefined();
    expect(round.didWin).toBe(false);
    expect(round.drawnCard).toBe(7);

    jest.spyOn(Math, 'random').mockRestore();
  });
  
  it('should allow a player to play a round and win, accumulating winnings', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(2.5 / 13); // Card 3
    
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
                winnings: 20, // 0 initial + 20 from this round
                newBalance: 980,
            });
        });

    const player = await prisma.player.findUnique({ where: { id: playerId }});
    expect(player.balance).toBe(980);
    expect(player.activeWinnings).toBe(20);

    // Verify that the game round was logged
    const round = await prisma.gameRound.findFirst({ where: { playerId } });
    expect(round).toBeDefined();
    expect(round.didWin).toBe(true);
    expect(round.winnings).toBe(20);

    jest.spyOn(Math, 'random').mockRestore();
  });

  it('should allow a player to cash out winnings, updating balance', async () => {
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
                balance: 1000, // 980 (current) + 20 (winnings)
                activeWinnings: 0,
            });
        });

    const player = await prisma.player.findUnique({ where: { id: playerId }});
    expect(player.balance).toBe(1000);
    expect(player.activeWinnings).toBe(0);
  });
});
