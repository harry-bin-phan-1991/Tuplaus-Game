import { ObjectType, Field, Float, Int } from '@nestjs/graphql';

@ObjectType()
export class GameRound {
  @Field(() => Int)
  drawnCard: number;

  @Field()
  didWin: boolean;

  @Field(() => Float)
  winnings: number;

  @Field(() => Float)
  newBalance: number;
}

@ObjectType()
export class Player {
  @Field()
  id: string;

  @Field(() => Float)
  balance: number;

  @Field(() => Float)
  activeWinnings: number;
}
