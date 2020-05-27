import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'mikro-orm';
import { getRepositoryToken } from 'nestjs-mikro-orm';
import { Todo } from './todo.entity';
import { TodoRepository } from './todo.repository';
import { TodoService } from './todo.service';

describe('TodoService', () => {
  let todoService: TodoService;
  let todoRepositoryMock: jest.Mocked<TodoRepository>;

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
      ],
    }).compile();

    todoRepositoryMock = module.get(getRepositoryToken(Todo));
    todoService = module.get<TodoService>(TodoService);
  });

  it('should be defined', () => {
    expect(todoService).toBeDefined();
  });

  it('findById should internally call findOneOrFail instead of findOne', async () => {
    todoRepositoryMock.findOneOrFail.mockRejectedValue(new NotFoundException());
    await expect(todoService.findById('1')).rejects.toThrow();
    expect(todoRepositoryMock.findOne).not.toBeCalled();
    expect(todoRepositoryMock.findOneOrFail).toBeCalledTimes(1);
  });

  it('findById should throw NotFoundException for an unknown id', async () => {
    todoRepositoryMock.findOneOrFail.mockRejectedValue(new NotFoundException());
    await expect(todoService.findById('1')).rejects.toBeInstanceOf(
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
    todoRepositoryMock.findOneOrFail.mockResolvedValue(todo);
    await expect(todoService.findById('1')).resolves.toEqual(todo);
  });

  it('assignTo should internally call findOneOrFail instead of findOne', async () => {
    todoRepositoryMock.findOneOrFail.mockRejectedValue(new NotFoundException());
    await expect(todoService.assignTo('1', 'assignee-a')).rejects.toThrow();
    expect(todoRepositoryMock.findOne).not.toBeCalled();
    expect(todoRepositoryMock.findOneOrFail).toBeCalledTimes(1);
  });

  it('assignTo should throw NotFoundException for an unknown id', async () => {
    todoRepositoryMock.findOneOrFail.mockRejectedValue(new NotFoundException());
    await expect(
      todoService.assignTo('1', 'assignee-a'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('assignTo should throw BadRequestException when the todo has a different assignee', async () => {
    todoRepositoryMock.findOneOrFail.mockResolvedValue({
      id: '1',
      name: 'name',
      description: 'description',
      assignee: 'assignee-a',
      created_at: new Date(),
    });
    await expect(
      todoService.assignTo('1', 'assignee-b'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('assignTo should succeed for a known id and unassigned todo', async () => {
    todoRepositoryMock.findOneOrFail.mockResolvedValue({
      id: '1',
      name: 'name',
      description: 'description',
      assignee: null,
      created_at: new Date(),
    });
    await expect(
      todoService.assignTo('1', 'assignee-a'),
    ).resolves.toBeUndefined();
  });
});
