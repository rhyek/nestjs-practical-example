import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from 'mikro-orm';
import { getRepositoryToken } from 'nestjs-mikro-orm';
import { v4 as uuid } from 'uuid';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { Todo } from './todo.entity';
import { TodoRepository } from './todo.repository';
import { TodoService } from './todo.service';
import { TodoController } from './todo.controller';
import { TodoFindAllDTO } from './dtos/todo-find-all.dto';
import { TodoFindOneDTO } from './dtos/todo-find-one.dto';

describe('TodoController', () => {
  let todoRepositoryMock: jest.Mocked<TodoRepository>;
  let todoController: TodoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EntityManager,
          useValue: {
            flush: () => {},
          },
        },
        {
          provide: getRepositoryToken(Todo),
          useFactory: jest.fn(() => ({
            findAll: jest.fn(),
            findOne: jest.fn(),
            findOneOrFail: jest.fn(),
            persist: jest.fn(),
          })),
        },
        TodoService,
        TodoController,
      ],
    }).compile();

    todoRepositoryMock = module.get(getRepositoryToken(Todo));
    todoController = module.get<TodoController>(TodoController);
  });

  it('should be defined', () => {
    expect(todoController).toBeDefined();
  });

  it('findAll should convert domain objects returned from service to DTOs', async () => {
    const todos: Todo[] = [
      {
        id: uuid(),
        name: 'name',
        description: 'description',
        assignee: null,
        created_at: new Date(),
      },
      {
        id: uuid(),
        name: 'name',
        description: 'description',
        assignee: 'assignee',
        created_at: new Date(),
      },
    ];
    todoRepositoryMock.findAll.mockResolvedValue(todos);
    const dtos = (await todoController.findAll()).map(pojo =>
      plainToClass(TodoFindAllDTO, pojo),
    );
    for (const dto of dtos) {
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      expect(errors).toHaveLength(0);
    }
  });

  it('findOne should convert domain object returned from service to DTO', async () => {
    const todo: Todo = {
      id: uuid(),
      name: 'name',
      description: 'description',
      assignee: null,
      created_at: new Date(),
    };
    todoRepositoryMock.findOneOrFail.mockResolvedValue(todo);
    const dto = plainToClass(TodoFindOneDTO, await todoController.findOne('1'));
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });
});
