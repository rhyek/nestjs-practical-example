import { EntityRepository, Repository } from 'mikro-orm';
import { Todo } from './todo.entity';

@Repository(Todo)
export class TodoRepository extends EntityRepository<Todo> {
  // ready for any custom queries
}
