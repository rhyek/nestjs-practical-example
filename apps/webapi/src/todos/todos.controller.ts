import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  NotFoundException,
  BadRequestException,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CreateTodoDto } from './dtos/create-todo.dto';
import { SchemaValidationPipe } from '../pipes/schema-validation.pipe';
import { UnitOfWork } from '../services/unit-of-work.service';
import { createTodoSchema } from './validation-schemas/create-todo.schema';
import { GetTodoDto } from './dtos/get-todo.dto';
import { TodosRepository } from './todos.repository';

@Controller('todos')
export class TodosController {
  constructor(
    private unitOfWork: UnitOfWork,
    private todosRepository: TodosRepository,
  ) {}

  @Get()
  async findAll(): Promise<GetTodoDto[]> {
    const dtos = await this.todosRepository.findAll();
    return dtos;
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<GetTodoDto> {
    const found = await this.todosRepository.findById(id);
    if (!found) {
      throw new NotFoundException();
    }
    return found;
  }

  @Post()
  async create(
    @Body(new SchemaValidationPipe(createTodoSchema)) values: CreateTodoDto,
  ): Promise<GetTodoDto> {
    const created = await this.todosRepository.add(values);
    return created;
  }

  @Patch(':id/assign-to/:assignee')
  async assign(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('assignee') newAssignee: string,
  ): Promise<void> {
    await this.unitOfWork.run(async ({ todosRepository }) => {
      const todo = await todosRepository.findById(id);
      if (!todo) {
        throw new NotFoundException();
      }
      const { assignee: currentAssignee } = todo;
      if (currentAssignee && currentAssignee !== newAssignee) {
        throw new BadRequestException('Todo already has an assignee');
      }
      todo.assignee = newAssignee;
      await todosRepository.update(todo);
    });
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    const todo = await this.todosRepository.remove(id);
    if (!todo) {
      throw new NotFoundException();
    }
  }
}
