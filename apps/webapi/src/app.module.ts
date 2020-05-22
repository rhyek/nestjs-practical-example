import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { TodosController } from './todos/todos.controller';
import { TodosRepository } from './todos/todos.repository';
import { IConfig } from './interfaces/config.interface';
import { DbConnectionService } from './services/db-connection.service';
import { UnitOfWork } from './services/unit-of-work.service';

@Module({
  imports: [],
  providers: [
    {
      provide: 'CONFIG',
      useValue: {
        dbUrl: process.env.DB_URL,
      } as IConfig,
    },
    DbConnectionService,
    UnitOfWork,
    TodosRepository,
  ],
  controllers: [AppController, TodosController],
})
export class AppModule {}
