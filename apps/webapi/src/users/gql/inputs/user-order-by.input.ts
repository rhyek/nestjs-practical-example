import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UserOrderByInput {
  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  name?: string;
}
