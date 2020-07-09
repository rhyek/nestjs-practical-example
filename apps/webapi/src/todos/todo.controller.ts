import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TodoService } from './todo.service';
import { TodoCreateDTO } from './dtos/todo-create.dto';
import { TodoFindAllDTO } from './dtos/todo-find-all.dto';
import { TodoFindOneDTO } from './dtos/todo-find-one.dto';
import { AssignToParams } from './params/assign-to.params';

@Controller('todos')
export class TodoController {
  constructor(private todoService: TodoService) {}

  @Get()
  async findAll(): Promise<TodoFindAllDTO[]> {
    const todos = await this.todoService.findAll();
    const dtos = todos.map(todo => {
      const { id, name, description, assignee } = todo;
      return {
        id,
        name,
        description,
        assignee: assignee
          ? { id: assignee.id, email: assignee.email, name: assignee.name }
          : null,
      };
    });
    return dtos;
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<TodoFindOneDTO> {
    const todo = await this.todoService.findById(id);
    const { id: todoId, name, description, assignee, createdAt } = todo;
    const dto: TodoFindOneDTO = {
      id: todoId,
      name,
      description,
      assignee: assignee
        ? { id: assignee.id, email: assignee.email, name: assignee.name }
        : null,
      createdAt: createdAt,
    };
    return dto;
  }

  @Post()
  async create(@Body() values: TodoCreateDTO): Promise<TodoFindOneDTO> {
    const todo = await this.todoService.create(values);
    const { id, name, description, assignee, createdAt } = todo;
    const dto: TodoFindOneDTO = {
      id,
      name,
      description,
      assignee,
      createdAt: createdAt,
    };
    return dto;
  }

  @Patch(':todoId/assign-to/:assigneeUserId')
  async assignTo(
    @Param() { todoId, assigneeUserId }: AssignToParams,
  ): Promise<void> {
    await this.todoService.assignTo(todoId, assigneeUserId);
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.todoService.remove(id);
  }
}
