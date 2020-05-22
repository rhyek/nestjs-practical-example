import { Injectable, NotImplementedException, Inject } from '@nestjs/common';
import { CreateTodoDto } from './dtos/create-todo.dto';
import { TodoEntity } from './todo.entity';
import { IRepository } from '../interfaces/repository.interface';
import { DbConnectionService } from '../services/db-connection.service';
import { IDbConnectionService } from '../interfaces/db-connection-service.interface';

@Injectable()
export class TodosRepository implements IRepository<TodoEntity, CreateTodoDto> {
  constructor(
    @Inject(DbConnectionService)
    private dbConnectionService: IDbConnectionService,
  ) {}

  async add(values: CreateTodoDto): Promise<TodoEntity> {
    const { name, description } = values;
    const todo = await this.dbConnectionService.connection.task(task => {
      return task.one<TodoEntity>(
        'insert into todos (name, description) values ($1, $2) returning *',
        [name, description],
      );
    });
    return todo;
  }

  async findAll(): Promise<TodoEntity[]> {
    const todos = await this.dbConnectionService.connection.task(task => {
      return task.manyOrNone<TodoEntity>('select * from todos');
    });
    return todos;
  }

  async findById(id: string): Promise<TodoEntity | null> {
    const todo = this.dbConnectionService.connection.task(task => {
      return task.oneOrNone<TodoEntity>(
        'select * from todos where id = $1',
        id,
      );
    });
    return todo;
  }

  async update(todo: TodoEntity): Promise<TodoEntity | null> {
    return await this.dbConnectionService.connection.task(task => {
      return task.oneOrNone<TodoEntity>(
        `
        update todos set
          name = $1,
          description = $2,
          assignee = $3
        where id = $4
        returning *
        `,
        [todo.name, todo.description, todo.assignee, todo.id],
      );
    });
  }

  async remove(id: string): Promise<TodoEntity | null> {
    return await this.dbConnectionService.connection.task(async task => {
      return await task.oneOrNone<TodoEntity>(
        'delete from todos where id = $1 returning *',
        id,
      );
    });
  }
}
