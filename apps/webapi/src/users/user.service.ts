import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'mikro-orm';
import { User } from './user.entity';
import { UserRepository } from './user.repository';
import { UserCreateDTO } from './dtos/user-create.dto';

@Injectable()
export class UserService {
  constructor(
    private em: EntityManager,
    private userRepository: UserRepository,
  ) {}

  async findAll(): Promise<User[]> {
    const users = await this.userRepository.findAll();
    return users;
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOneOrFail(id);
    return user;
  }

  async create(values: UserCreateDTO): Promise<User> {
    const { email, name } = values;
    const user = new User(email, name);
    await this.userRepository.persist(user);
    await this.em.flush();
    return user;
  }
}
