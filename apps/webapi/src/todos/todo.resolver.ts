import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { Todo } from './todo.entity';
import { TodoService } from './todo.service';
import { TodoCreateDTO } from './dtos/todo-create.dto';
import { DatabaseHelper } from '../helpers/database.helper';
import { TodoWhereInput } from './gql/inputs/todo-where.input';
import { TodoRepository } from './todo.repository';
import { TodoOrderByInput } from './gql/inputs/todo-order-by.input';
import { GqlToQueryBuilderHelper } from '../helpers/gql-to-querybuilder.helper';

@Resolver(() => Todo)
export class TodoResolver {
  constructor(
    private databaseHelper: DatabaseHelper,
    private gqlToQueryBuilderHelper: GqlToQueryBuilderHelper,
    private todoService: TodoService,
    private todoRepository: TodoRepository,
  ) {}

  @Query(() => [Todo])
  async todos(
    @Args('where', { nullable: true })
    where?: TodoWhereInput,
    @Args('orderBy', { nullable: true })
    orderBy?: TodoOrderByInput,
  ): Promise<Todo[]> {
    const qb = this.todoRepository.createQueryBuilder().select('*');
    this.gqlToQueryBuilderHelper.configureQueryBuilder(qb, where, orderBy);
    return qb.getResult();
  }

  @ResolveField()
  async assignee(@Parent() todo: Todo) {
    await this.databaseHelper.load(todo, 'assignee');
    return todo.assignee;
  }

  @Mutation(() => Todo)
  async createTodo(
    @Args({ name: 'values', type: () => TodoCreateDTO }) values: TodoCreateDTO,
  ): Promise<Todo> {
    const todo = await this.todoService.create(values);
    return todo;
  }
}
