import { Injectable, ConflictException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'mikro-orm';
import { Todo } from './todo.entity';
import { TodoCreateDTO } from './dtos/todo-create.dto';
import { TodoRepository } from './todo.repository';

@Injectable()
export class TodoService {
  constructor(
    private em: EntityManager,
    // @InjectRepository(Todo) private todoRepository: TodoRepository,
    private todoRepository: TodoRepository,
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
    await this.em.transactional(async em => {
      try {
        // await em.execute('set transaction isolation level serializable') in v4
        await em
          .getConnection()
          .execute(
            'set transaction isolation level serializable',
            [],
            'run',
            em.getTransactionContext(),
          );
        const todoRepository = em.getRepository(Todo);
        const todo = await todoRepository.findOneOrFail(id);
        const { assignee: currentAssignee } = todo;
        if (currentAssignee && currentAssignee !== newAssignee) {
          throw new BadRequestException('Todo is already assigned.');
        }
        todo.assignee = newAssignee;
        await em.flush();
      } catch (error) {
        if (error.code === '40001') {
          // serialization_failure
          throw new ConflictException('Concurrency error. Please try again.');
        }
        throw error;
      }
    });
  }

  async remove(id: string): Promise<void> {
    const todo = await this.todoRepository.findOneOrFail(id);
    await this.todoRepository.remove(todo);
    await this.em.flush();
  }
}
