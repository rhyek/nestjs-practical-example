import { Field, InputType } from '@nestjs/graphql';
import { StringComparisonInput } from '../../../gql/inputs/string-comparison.input';

@InputType()
export class UserWhereInput {
  @Field({ nullable: true })
  _and?: UserWhereInput;

  @Field({ nullable: true })
  _or?: UserWhereInput;

  @Field({ nullable: true })
  email?: StringComparisonInput;

  @Field({ nullable: true })
  name?: StringComparisonInput;
}
