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
        assignee,
      };
    });
    return dtos;
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<TodoFindOneDTO> {
    const todo = await this.todoService.findById(id);
    const { id: todoId, name, description, assignee, created_at } = todo;
    const dto: TodoFindOneDTO = {
      id: todoId,
      name,
      description,
      assignee,
      createdAt: created_at,
    };
    return dto;
  }

  @Post()
  async create(@Body() values: TodoCreateDTO): Promise<TodoFindOneDTO> {
    const created = await this.todoService.create(values);
    const { id: todoId, name, description, assignee, created_at } = created;
    const dto: TodoFindOneDTO = {
      id: todoId,
      name,
      description,
      assignee,
      createdAt: created_at,
    };
    return dto;
  }

  @Patch(':id/assign-to/:assignee')
  async assignTo(
    @Param() { id, assignee: newAssignee }: AssignToParams,
  ): Promise<void> {
    await this.todoService.assignTo(id, newAssignee);
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.todoService.remove(id);
  }
}
