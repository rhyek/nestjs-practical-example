import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'mikro-orm';
import { InjectRepository } from 'nestjs-mikro-orm';
import { Todo } from './todo.entity';
import { TodoRepository } from './todo.repository';
import { TodoCreateDTO } from './dtos/todo-create.dto';

@Injectable()
export class TodoService {
  constructor(
    private em: EntityManager,
    @InjectRepository(Todo) private todoRepository: TodoRepository,
  ) {}

  async findAll(): Promise<Todo[]> {
    const todos = await this.todoRepository.findAll();
    return todos;
  }

  async findById(id: string): Promise<Todo> {
    const todo = await this.todoRepository.findOneOrFail(id);
    return todo;
  }

  async create(values: TodoCreateDTO): Promise<Todo> {
    const { name, description } = values;
    const todo = new Todo(name, description);
    await this.todoRepository.persist(todo);
    await this.em.flush();
    return todo;
  }

  async assignTo(id: string, newAssignee: string): Promise<void> {
    const todo = await this.todoRepository.findOneOrFail(id);
    const { assignee: currentAssignee } = todo;
    if (currentAssignee && currentAssignee !== newAssignee) {
      throw new BadRequestException('Todo is already assigned.');
    }
    todo.assignee = newAssignee;
    await this.todoRepository.persist(todo);
    await this.em.flush();
  }

  async remove(id: string): Promise<void> {
    const todo = await this.todoRepository.findOneOrFail(id);
    await this.todoRepository.remove(todo);
    await this.em.flush();
  }
}
