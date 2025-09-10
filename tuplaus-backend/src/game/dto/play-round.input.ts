import { InputType, Field, Float } from '@nestjs/graphql';

@InputType()
export class PlayRoundInput {
  @Field()
  playerId: string;

  @Field(() => Float)
  bet: number;

  @Field()
  choice: string; // 'small' or 'large'
}
