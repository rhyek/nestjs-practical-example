import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EntityManager } from 'mikro-orm';
import { getRepositoryToken } from 'nestjs-mikro-orm';
import { Todo } from './todo.entity';
import { TodoRepository } from './todo.repository';
import { TodoService } from './todo.service';

describe('TodoService', () => {
  let entityManager: jest.Mocked<EntityManager>;
  let todoRepository: jest.Mocked<TodoRepository>;
  let service: TodoService;

  beforeEach(async () => {
    const todoRepositoryMock = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      persist: jest.fn(),
    };
    const entityManagerMock = {
      flush: jest.fn(),
      getRepository: jest.fn(() => todoRepositoryMock),
      getTransactionContext: jest.fn(),
      getConnection: jest.fn(() => ({
        execute: jest.fn(),
      })),
      transactional: jest.fn(async cb => {
        await cb(entityManagerMock);
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EntityManager,
          useValue: entityManagerMock,
        },
        {
          provide: getRepositoryToken(Todo),
          useValue: todoRepositoryMock,
        },
        TodoService,
      ],
    }).compile();

    entityManager = module.get(EntityManager);
    todoRepository = module.get(getRepositoryToken(Todo));
    service = module.get<TodoService>(TodoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findById should internally call findOneOrFail instead of findOne', async () => {
    todoRepository.findOneOrFail.mockRejectedValue(new NotFoundException());
    await expect(service.findById('1')).rejects.toThrow();
    expect(todoRepository.findOne).not.toBeCalled();
    expect(todoRepository.findOneOrFail).toBeCalledTimes(1);
  });

  it('findById should throw NotFoundException for an unknown id', async () => {
    todoRepository.findOneOrFail.mockRejectedValue(new NotFoundException());
    await expect(service.findById('1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findById should find the todo based on id and return a domain model', async () => {
    const todo: Todo = {
      id: '1',
      name: 'name',
      description: 'description',
      assignee: null,
      created_at: new Date(),
    };
    todoRepository.findOneOrFail.mockResolvedValue(todo);
    await expect(service.findById('1')).resolves.toEqual(todo);
  });

  it('assignTo should internally call findOneOrFail instead of findOne', async () => {
    todoRepository.findOneOrFail.mockRejectedValue(new NotFoundException());
    await expect(service.assignTo('1', 'assignee-a')).rejects.toThrow();
    expect(todoRepository.findOne).not.toBeCalled();
    expect(todoRepository.findOneOrFail).toBeCalledTimes(1);
  });

  it('assignTo should throw NotFoundException for an unknown id', async () => {
    todoRepository.findOneOrFail.mockRejectedValue(new NotFoundException());
    await expect(service.assignTo('1', 'assignee-a')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('assignTo should throw BadRequestException when the todo has a different assignee', async () => {
    todoRepository.findOneOrFail.mockResolvedValue({
      id: '1',
      name: 'name',
      description: 'description',
      assignee: 'assignee-a',
      created_at: new Date(),
    });
    await expect(service.assignTo('1', 'assignee-b')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('assignTo should throw ConflictException when postgres emits a serialization error', async () => {
    todoRepository.findOneOrFail.mockResolvedValue({
      id: '1',
      name: 'name',
      description: 'description',
      assignee: 'assignee-a',
      created_at: new Date(),
    });
    entityManager.flush.mockRejectedValue({ code: '40001' });
    await expect(service.assignTo('1', 'assignee-a')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('assignTo should succeed for a known id and unassigned todo', async () => {
    todoRepository.findOneOrFail.mockResolvedValue({
      id: '1',
      name: 'name',
      description: 'description',
      assignee: null,
      created_at: new Date(),
    });
    await expect(service.assignTo('1', 'assignee-a')).resolves.toBeUndefined();
  });
});
