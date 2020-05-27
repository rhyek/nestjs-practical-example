import { IsUUID, IsString, MaxLength } from 'class-validator';

export class AssignToParams {
  @IsUUID()
  id: string;
  @IsString()
  @MaxLength(100)
  assignee: string;
}
