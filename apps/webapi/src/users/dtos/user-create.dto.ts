import { MaxLength } from 'class-validator';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UserCreateDTO {
  @Field()
  @MaxLength(100)
  email: string;

  @Field()
  @MaxLength(50)
  name: string;
}
