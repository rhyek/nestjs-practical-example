import { Get, Post, Body, Controller } from '@nestjs/common';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserFindDTO } from './dtos/user-find.dto';
import { UserCreateDTO } from './dtos/user-create.dto';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  static domainToDTO(user: User): UserFindDTO {
    const { id, email, name, createdAt } = user;
    const dto: UserFindDTO = {
      id,
      email,
      name,
      createdAt: createdAt,
    };
    return dto;
  }

  @Get()
  async findAll(): Promise<UserFindDTO[]> {
    const users = await this.userService.findAll();
    const dtos = users.map(UserController.domainToDTO);
    return dtos;
  }

  @Post()
  async create(@Body() values: UserCreateDTO): Promise<UserFindDTO> {
    const user = await this.userService.create(values);
    const dto = UserController.domainToDTO(user);
    return dto;
  }
}
