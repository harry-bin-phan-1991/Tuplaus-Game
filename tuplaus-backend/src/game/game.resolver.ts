import { Resolver, Query, Mutation, Args, Float } from '@nestjs/graphql';
import { GameService } from './game.service';
import { GameRound, Player } from './entities/game.entity';
import { PlayRoundInput } from './dto/play-round.input';

@Resolver(() => GameRound)
export class GameResolver {
  constructor(private readonly gameService: GameService) {}

  @Mutation(() => GameRound)
  playRound(@Args('playRoundInput') playRoundInput: PlayRoundInput) {
    return this.gameService.playRound(playRoundInput);
  }

  @Mutation(() => Player)
  cashOut(@Args('playerId', { type: () => String }) playerId: string) {
    return this.gameService.cashOut(playerId);
  }

  @Query(() => Player, { name: 'player' })
  findOne(@Args('id', { type: () => String }) id: string) {
    return this.gameService.getPlayer(id);
  }

  // A mutation to create a player for testing, starting with 1000 balance
  @Mutation(() => Player)
  createPlayer(@Args('id', { type: () => String }) id: string) {
    return this.gameService.createPlayerForTesting(id);
  }
}
