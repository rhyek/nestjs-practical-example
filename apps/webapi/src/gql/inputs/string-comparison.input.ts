import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class StringComparisonInput {
  @Field({ nullable: true })
  _eq?: string;

  @Field({ nullable: true })
  _contains?: string;
}
