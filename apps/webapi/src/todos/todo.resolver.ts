import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Todo } from './todo.entity';
import { TodoService } from './todo.service';
import { TodoCreateDTO } from './dtos/todo-create.dto';

@Resolver(() => Todo)
export class TodoResolver {
  constructor(private todoService: TodoService) {}

  @Query(() => [Todo], { name: 'todos' })
  async getTodos(): Promise<Todo[]> {
    return this.todoService.findAll();
  }

  @Mutation(() => Todo)
  async createTodo(
    @Args({ name: 'values', type: () => TodoCreateDTO }) values: TodoCreateDTO,
  ): Promise<Todo> {
    const todo = await this.todoService.create(values);
    return todo;
  }
}
