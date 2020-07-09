import { InputType, Field } from '@nestjs/graphql';
import { QueryOrder } from 'mikro-orm';
import { UserOrderByInput } from '../../../users/gql/inputs/user-order-by.input';

@InputType()
export class TodoOrderByInput {
  @Field({ nullable: true })
  name?: QueryOrder;

  @Field({ nullable: true })
  description?: QueryOrder;

  @Field({ nullable: true })
  assignee?: UserOrderByInput;
}
