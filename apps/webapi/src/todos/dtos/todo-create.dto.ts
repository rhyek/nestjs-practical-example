import { MaxLength } from 'class-validator';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class TodoCreateDTO {
  @Field()
  @MaxLength(50)
  name: string;

  @Field()
  @MaxLength(100)
  description: string;
}
