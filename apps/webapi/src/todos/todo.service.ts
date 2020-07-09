import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'mikro-orm';
import { DatabaseHelper } from '../helpers/database.helper';
import { Todo } from './todo.entity';
import { TodoRepository } from './todo.repository';
import { TodoCreateDTO } from './dtos/todo-create.dto';
import { User } from '../users/user.entity';

@Injectable()
export class TodoService {
  constructor(
    private em: EntityManager,
    private todoRepository: TodoRepository,
    private dbHelper: DatabaseHelper,
  ) {}

  async findAll(): Promise<Todo[]> {
    const todos = await this.todoRepository.findAll({ populate: ['assignee'] });
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

  async assignTo(id: string, newAssigneeUserId: string): Promise<void> {
    await this.dbHelper.tx(async em => {
      const todoRepository = em.getRepository(Todo);
      const userRepository = em.getRepository(User);
      const todo = await todoRepository.findOneOrFail(id, ['assignee']);
      const newAssignee = await userRepository.findOneOrFail(newAssigneeUserId);
      const { assignee: currentAssignee } = todo;
      if (currentAssignee && currentAssignee !== newAssignee) {
        throw new BadRequestException('Todo is already assigned.');
      }
      todo.assignee = newAssignee;
    });
  }

  async remove(id: string): Promise<void> {
    const todo = await this.todoRepository.findOneOrFail(id);
    await this.todoRepository.remove(todo);
    await this.em.flush();
  }
}
