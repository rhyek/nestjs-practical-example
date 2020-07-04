import {
  Module,
  DynamicModule,
  NotFoundException,
  OnApplicationShutdown,
} from '@nestjs/common';
import { MikroORM } from 'mikro-orm';
import { MikroOrmModule, MikroOrmModuleOptions } from 'nestjs-mikro-orm';
import { AppController } from './app.controller';
import { DatabaseHelper } from './helpers/database.helper';
import { TodoService } from './todos/todo.service';
import { TodoController } from './todos/todo.controller';
import { Todo } from './todos/todo.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [Todo],
    }),
  ],
  providers: [DatabaseHelper, TodoService],
  controllers: [AppController, TodoController],
})
export class AppModule implements OnApplicationShutdown {
  constructor(private orm: MikroORM) {}

  static register(options?: {
    mikroOrmOptions?: MikroOrmModuleOptions;
  }): DynamicModule {
    return {
      module: AppModule,
      imports: [
        MikroOrmModule.forRoot({
          entities: [Todo],

          type: 'postgresql',
          host: process.env.DB_HOST,
          port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
          user: process.env.DB_USER,
          password: process.env.DB_PASS,
          dbName: process.env.DB_DB,

          findOneOrFailHandler: () => new NotFoundException(),

          ...options?.mikroOrmOptions,
        }),
      ],
    };
  }

  async onApplicationShutdown(signal?: string | undefined): Promise<void> {
    await this.orm.close();
  }
}
