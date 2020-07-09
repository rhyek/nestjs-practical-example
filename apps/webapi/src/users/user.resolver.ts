import { UserService } from './user.service';
import { User } from './user.entity';
import { Resolver, Query, Args } from '@nestjs/graphql';
import { UserRepository } from './user.repository';
import { DatabaseHelper } from '../helpers/database.helper';
import { UserWhereInput } from './gql/inputs/user-where.input';

@Resolver(() => User)
export class UserResolver {
  constructor(
    private userService: UserService,
    private userRepository: UserRepository,
    private databaseHelper: DatabaseHelper,
  ) {}

  @Query(() => [User])
  async users(
    @Args('where', { nullable: true })
    where?: UserWhereInput,
  ): Promise<User[]> {
    const qb = this.userRepository.createQueryBuilder().select('*');
    if (where) {
      // this.databaseHelper.applyWhereClause(qb, where);
    }
    return qb.getResult();
    // return this.userService.findAll();
  }
}
