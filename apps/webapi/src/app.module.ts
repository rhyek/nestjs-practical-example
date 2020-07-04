import path from 'path';
import process from 'process';
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
import { DatabaseHelper } from './helpers/database.helper';
import { TodoService } from './todos/todo.service';
import { TodoController } from './todos/todo.controller';
import { Todo } from './todos/todo.entity';
import { Configuration } from './interfaces/configuration.interface';
import { TodoResolver } from './todos/todo.resolver';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? undefined
          : path.join(__dirname, '../../../dev/.env'),
      load: [configuration],
    }),
    MikroOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<Configuration>) => ({
        type: 'postgresql',
        entities: [Todo],
        findOneOrFailHandler: () => new NotFoundException(),

        ...configService.get('database')!,

        // host: 'localhost',
        // port: 9000,
        // user: 'test',
        // password: 'test',
        // dbName: 'test',
      }),
    }),
    MikroOrmModule.forFeature({
      entities: [Todo],
    }),
    GraphQLModule.forRoot({
      autoSchemaFile: path.join(__dirname, '../schema.gql'),
    }),
  ],
  providers: [DatabaseHelper, TodoService, TodoResolver],
  controllers: [AppController, TodoController],
})
export class AppModule implements OnApplicationShutdown {
  constructor(private orm: MikroORM) {}

  async onApplicationShutdown(signal?: string | undefined): Promise<void> {
    await this.orm.close();
  }
}
