import { Field, InputType } from '@nestjs/graphql';
import { StringComparisonInput } from '../../../gql/inputs/string-comparison.input';
import { UserWhereInput } from '../../../users/gql/inputs/user-where.input';

@InputType()
export class TodoWhereInput {
  @Field({ nullable: true })
  _and?: TodoWhereInput;

  @Field({ nullable: true })
  _or?: TodoWhereInput;

  @Field({ nullable: true })
  name?: StringComparisonInput;

  @Field({ nullable: true })
  assignee?: UserWhereInput;
}
