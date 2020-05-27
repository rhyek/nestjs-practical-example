import { MaxLength } from 'class-validator';

export class TodoCreateDTO {
  @MaxLength(50)
  name: string;
  @MaxLength(100)
  description: string;
}
