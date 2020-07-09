import { IsUUID, IsNotEmpty, IsOptional } from 'class-validator';

export class TodoFindOneDTO {
  @IsUUID()
  id: string;

  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  description: string;

  @IsOptional()
  assignee: { id: string; email: string; name: string } | null;

  @IsNotEmpty()
  createdAt: Date;
}
