import path from 'path';
import {
  Module,
  NotFoundException,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MikroORM } from 'mikro-orm';
import { MikroOrmModule } from 'nestjs-mikro-orm';
import { GraphQLModule } from '@nestjs/graphql';
import { AppController } from './app.controller';
import { configuration } from './config/configuration';
import { Configuration } from './interfaces/configuration.interface';
import { DatabaseHelper } from './helpers/database.helper';
import { Todo } from './todos/todo.entity';
import { TodoService } from './todos/todo.service';
import { TodoController } from './todos/todo.controller';
import { TodoResolver } from './todos/todo.resolver';
import { User } from './users/user.entity';
import { UserService } from './users/user.service';
import { UserController } from './users/user.controller';
import { UserResolver } from './users/user.resolver';
import { GqlToQueryBuilderHelper } from './helpers/gql-to-querybuilder.helper';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    MikroOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<Configuration>) => ({
        type: 'postgresql',
        entities: [User, Todo],
        findOneOrFailHandler: entityName =>
          new NotFoundException(`${entityName} not found`),
        debug: true,

        ...configService.get('database')!,

        // host: 'localhost',
        // port: 9000,
        // user: 'test',
        // password: 'test',
        // dbName: 'test',
      }),
    }),
    MikroOrmModule.forFeature({
      entities: [User, Todo],
    }),
    GraphQLModule.forRoot({
      autoSchemaFile: path.join(__dirname, '../schema.gql'),
    }),
  ],
  providers: [
    DatabaseHelper,
    GqlToQueryBuilderHelper,
    UserService,
    UserResolver,
    TodoService,
    TodoResolver,
  ],
  controllers: [AppController, UserController, TodoController],
})
export class AppModule implements OnApplicationShutdown {
  constructor(private orm: MikroORM) {}

  async onApplicationShutdown(signal?: string | undefined): Promise<void> {
    await this.orm.close();
  }
}
