import { IsUUID } from 'class-validator';

export class AssignToParams {
  @IsUUID()
  todoId: string;
  @IsUUID()
  assigneeUserId: string;
}
