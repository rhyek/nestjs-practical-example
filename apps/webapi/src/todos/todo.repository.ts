import { Todo } from './todo.entity';
import { EntityRepository, Repository } from 'mikro-orm';

@Repository(Todo)
export class TodoRepository extends EntityRepository<Todo> {
  // ready for any custom queries
}
