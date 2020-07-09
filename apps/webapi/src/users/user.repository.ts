import { EntityRepository, Repository } from 'mikro-orm';
import { User } from './user.entity';

@Repository(User)
export class UserRepository extends EntityRepository<User> {
  // ready for any custom queries
}
